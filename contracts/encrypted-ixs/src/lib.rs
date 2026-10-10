//! Bisik encrypted instructions (Arcis).
//!
//! Written for Bisik. The `arcium-hq/examples` sealed-bid auction was used only as
//! a reference for the Arcis API (that repository has no license, see R21).
//!
//! Circuits:
//! - `init_market_agg` / `allocate`: per-option weighted support, kept encrypted.
//! - `preview`: reveals only a strength histogram (no option identities).
//! - `init_auction` / `place_bid` / `resolve_auction`: sealed bids, top-3 tracking,
//!   generalized second price for b = 2 slots with a reserve price; bids above the
//!   bidder's public ceiling deposit are treated as invalid (D-23).
//! - `winning_weights` / `position_hits`: inputs for settlement (payout math is done
//!   in plaintext on-chain from these revealed values).
//! - `reveal_signals` (D4): per-option weighted support for the options a buyer may see,
//!   re-encrypted to the buyer's own x25519 key.
//! - `init_rep` / `credit_reputation` / `epoch_tiers` (D6, living doc 8.2 step 5): a bounded
//!   reputation table keyed by the scout's identity commitment, kept encrypted for the MXE.
//!   Only a sorted list of (commitment tag, tier level) leaves MPC, once per epoch.

use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    /// Maximum options per market (task-tracker 6.1).
    const N: usize = 16;
    /// Maximum buyers considered at settlement (2 auction winners + flat buyers).
    const B: usize = 4;
    /// Reputation table capacity (distinct scouts that can hold internal reputation).
    const R: usize = 32;

    /// Weighted support per option (stake x early bonus x tier multiplier).
    /// 16 ciphertexts; the position count is already public, so scout counts are not tracked.
    pub struct MarketAgg {
        pub weighted: [u64; 16],
    }

    pub struct AuctionState {
        pub amount: [u64; 3],
        pub bidder_lo: [u128; 3],
        pub bidder_hi: [u128; 3],
        pub count: u16,
    }

    pub struct Preview {
        pub backed: u8,
        pub weak: u8,
        pub medium: u8,
        pub strong: u8,
    }

    pub struct AuctionResult {
        pub w1_lo: u128,
        pub w1_hi: u128,
        pub p1: u64,
        pub w2_lo: u128,
        pub w2_hi: u128,
        pub p2: u64,
    }

    pub struct WinningWeights {
        pub denom: [u64; 4],
    }

    pub struct Hits {
        pub hit: [bool; 4],
    }

    /// Internal reputation per scout. `keys[s]` is the low 64 bits of the scout's identity
    /// commitment C (0 = empty slot). Counters saturate at 255.
    pub struct RepTable {
        pub keys: [u64; 32],
        pub hits: [u8; 32],
        pub misses: [u8; 32],
        pub hoaxes: [u8; 32],
    }

    /// Sorted `(tag << 8) | level` entries, see `epoch_tiers`.
    pub struct EpochTierList {
        pub entries: [u64; 32],
    }

    #[instruction]
    pub fn init_market_agg() -> Enc<Mxe, MarketAgg> {
        Mxe::get().from_arcis(MarketAgg { weighted: [0u64; N] })
    }

    /// Adds one position's weight to the option it supports. The option index stays secret.
    /// Indexes at or above `n_options` are ignored, so a malformed ciphertext cannot corrupt
    /// another market's options.
    #[instruction]
    pub fn allocate(
        option_ctxt: Enc<Shared, u8>,
        weight: u64,
        n_options: u8,
        agg_ctxt: Enc<Mxe, MarketAgg>,
    ) -> Enc<Mxe, MarketAgg> {
        let option = option_ctxt.to_arcis();
        let mut agg = agg_ctxt.to_arcis();
        for i in 0..N {
            let hit = (i as u8) == option && option < n_options;
            if hit {
                agg.weighted[i] = agg.weighted[i] + weight;
            }
        }
        agg_ctxt.owner.from_arcis(agg)
    }

    /// Reveals a strength histogram for buyers: strong >= 1/2 of the top option,
    /// weak < 1/5 of the top option, medium otherwise. No option index is revealed.
    #[instruction]
    pub fn preview(agg_ctxt: Enc<Mxe, MarketAgg>) -> Preview {
        let agg = agg_ctxt.to_arcis();
        let mut max: u64 = 0;
        for i in 0..N {
            if agg.weighted[i] > max {
                max = agg.weighted[i];
            }
        }
        let mut backed: u8 = 0;
        let mut weak: u8 = 0;
        let mut medium: u8 = 0;
        let mut strong: u8 = 0;
        for i in 0..N {
            let w = agg.weighted[i];
            if w > 0 {
                backed = backed + 1;
                if w * 2 >= max {
                    strong = strong + 1;
                } else if w * 5 < max {
                    weak = weak + 1;
                } else {
                    medium = medium + 1;
                }
            }
        }
        Preview { backed, weak, medium, strong }.reveal()
    }

    #[instruction]
    pub fn init_auction() -> Enc<Mxe, AuctionState> {
        Mxe::get().from_arcis(AuctionState {
            amount: [0u64; 3],
            bidder_lo: [0u128; 3],
            bidder_hi: [0u128; 3],
            count: 0,
        })
    }

    /// Folds one sealed bid into the top-3 list. The bidder identity is supplied in
    /// plaintext by the program (the transaction signer), so it cannot be spoofed.
    /// A bid above the bidder's public ceiling deposit counts as zero.
    #[instruction]
    pub fn place_bid(
        bid_ctxt: Enc<Shared, u64>,
        bidder_lo: u128,
        bidder_hi: u128,
        ceiling: u64,
        state_ctxt: Enc<Mxe, AuctionState>,
    ) -> Enc<Mxe, AuctionState> {
        let raw = bid_ctxt.to_arcis();
        let amount = if raw > ceiling { 0 } else { raw };
        let mut s = state_ctxt.to_arcis();

        if amount > s.amount[0] {
            s.amount[2] = s.amount[1];
            s.bidder_lo[2] = s.bidder_lo[1];
            s.bidder_hi[2] = s.bidder_hi[1];
            s.amount[1] = s.amount[0];
            s.bidder_lo[1] = s.bidder_lo[0];
            s.bidder_hi[1] = s.bidder_hi[0];
            s.amount[0] = amount;
            s.bidder_lo[0] = bidder_lo;
            s.bidder_hi[0] = bidder_hi;
        } else if amount > s.amount[1] {
            s.amount[2] = s.amount[1];
            s.bidder_lo[2] = s.bidder_lo[1];
            s.bidder_hi[2] = s.bidder_hi[1];
            s.amount[1] = amount;
            s.bidder_lo[1] = bidder_lo;
            s.bidder_hi[1] = bidder_hi;
        } else if amount > s.amount[2] {
            s.amount[2] = amount;
            s.bidder_lo[2] = bidder_lo;
            s.bidder_hi[2] = bidder_hi;
        }
        s.count = s.count + 1;
        state_ctxt.owner.from_arcis(s)
    }

    /// Generalized second price for two slots: winner k pays max(bid_{k+1}, reserve).
    /// A bid below the reserve does not win; its slot is reported as an all-zero key.
    #[instruction]
    pub fn resolve_auction(reserve: u64, state_ctxt: Enc<Mxe, AuctionState>) -> AuctionResult {
        let s = state_ctxt.to_arcis();
        let ok1 = s.amount[0] > 0 && s.amount[0] >= reserve;
        let ok2 = s.amount[1] > 0 && s.amount[1] >= reserve;
        let p1 = if s.amount[1] > reserve { s.amount[1] } else { reserve };
        let p2 = if s.amount[2] > reserve { s.amount[2] } else { reserve };
        AuctionResult {
            w1_lo: if ok1 { s.bidder_lo[0] } else { 0 },
            w1_hi: if ok1 { s.bidder_hi[0] } else { 0 },
            p1: if ok1 { p1 } else { 0 },
            w2_lo: if ok2 { s.bidder_lo[1] } else { 0 },
            w2_hi: if ok2 { s.bidder_hi[1] } else { 0 },
            p2: if ok2 { p2 } else { 0 },
        }
        .reveal()
    }

    /// For each buyer b, reveals the total weight of the options that buyer marked as
    /// successful (bitmask). Used as the payout denominator.
    #[instruction]
    pub fn winning_weights(
        mask0: u16,
        mask1: u16,
        mask2: u16,
        mask3: u16,
        agg_ctxt: Enc<Mxe, MarketAgg>,
    ) -> WinningWeights {
        let agg = agg_ctxt.to_arcis();
        let masks = [mask0, mask1, mask2, mask3];
        let mut denom = [0u64; B];
        for b in 0..B {
            for i in 0..N {
                if (masks[b] >> i) & 1 == 1 {
                    denom[b] = denom[b] + agg.weighted[i];
                }
            }
        }
        WinningWeights { denom }.reveal()
    }

    /// For one position, reveals whether its (secret) option is in each buyer's
    /// success mask. The option index itself is not revealed.
    #[instruction]
    pub fn position_hits(
        option_ctxt: Enc<Shared, u8>,
        mask0: u16,
        mask1: u16,
        mask2: u16,
        mask3: u16,
    ) -> Hits {
        let option = option_ctxt.to_arcis();
        let masks = [mask0, mask1, mask2, mask3];
        let mut hit = [false; B];
        for b in 0..B {
            for i in 0..N {
                if (i as u8) == option && (masks[b] >> i) & 1 == 1 {
                    hit[b] = true;
                }
            }
        }
        Hits { hit }.reveal()
    }

    /// D4: re-encrypts the weighted support of the options in `mask` (computed onchain from
    /// the buyer's allocation) to the buyer's x25519 key. Hidden options come back as 0.
    #[instruction]
    pub fn reveal_signals(buyer: ArcisX25519Pubkey, mask: u16, agg_ctxt: Enc<Mxe, MarketAgg>) -> Enc<Shared, [u64; 16]> {
        let agg = agg_ctxt.to_arcis();
        let mut out = [0u64; N];
        for i in 0..N {
            if (mask >> i) & 1 == 1 {
                out[i] = agg.weighted[i];
            }
        }
        Shared::new(buyer).from_arcis(out)
    }

    /// D6: empty encrypted reputation table.
    #[instruction]
    pub fn init_rep() -> Enc<Mxe, Pack<RepTable>> {
        Mxe::get().from_arcis(Pack::new(RepTable {
            keys: [0u64; R],
            hits: [0u8; R],
            misses: [0u8; R],
            hoaxes: [0u8; R],
        }))
    }

    /// D6: credits one settled position to its scout. The credit ciphertext (the scout's
    /// identity commitment C, encrypted with the same x25519 key as the option) is opened only
    /// inside MPC. Hit = the position's option is in any buyer's success mask; a slashed
    /// position counts as a hoax. Nothing is revealed; the whole table is re-encrypted.
    /// When the table is full, a new scout is not recorded (bounded store, documented).
    #[instruction]
    pub fn credit_reputation(
        option_ctxt: Enc<Shared, u8>,
        credit_ctxt: Enc<Shared, BaseField25519>,
        mask0: u16,
        mask1: u16,
        mask2: u16,
        mask3: u16,
        slashed: bool,
        rep_ctxt: Enc<Mxe, Pack<RepTable>>,
    ) -> Enc<Mxe, Pack<RepTable>> {
        let option = option_ctxt.to_arcis();
        let c = credit_ctxt.to_arcis();
        let bytes = c.to_le_bytes();
        let mut key: u64 = 0;
        let mut factor: u64 = 1;
        for j in 0..8 {
            key = key + (bytes[j] as u64) * factor;
            if j < 7 {
                factor = factor * 256;
            }
        }

        let masks = [mask0, mask1, mask2, mask3];
        let mut hit = false;
        for b in 0..B {
            for i in 0..N {
                if (i as u8) == option && (masks[b] >> i) & 1 == 1 {
                    hit = true;
                }
            }
        }

        let mut t = rep_ctxt.to_arcis().unpack();
        let valid = key != 0;
        let mut found = false;
        for s in 0..R {
            if valid && t.keys[s] == key {
                found = true;
            }
        }
        let mut placed = found;
        for s in 0..R {
            let take = valid && !placed && t.keys[s] == 0;
            if take {
                t.keys[s] = key;
            }
            placed = placed || take;
        }
        for s in 0..R {
            let mine = valid && t.keys[s] == key;
            if mine {
                if slashed {
                    if t.hoaxes[s] < 255 {
                        t.hoaxes[s] = t.hoaxes[s] + 1;
                    }
                } else if hit {
                    if t.hits[s] < 255 {
                        t.hits[s] = t.hits[s] + 1;
                    }
                } else if t.misses[s] < 255 {
                    t.misses[s] = t.misses[s] + 1;
                }
            }
        }
        rep_ctxt.owner.from_arcis(Pack::new(t))
    }

    /// D6: tier membership for the next epoch. Per credited scout: level 0 = one tier down
    /// (any upheld hoax, or >= 2 misses with no hit), 1 = unchanged, 2 = one tier up
    /// (>= 1 hit and hits >= misses), 3 = two tiers up (>= 3 hits and hits >= 2 x misses).
    /// Each entry is `(C_lo64 with its low byte cleared) | level`; the list is sorted inside
    /// MPC so the table's insertion order (which follows settlement order) is not revealed.
    /// Counters and market history stay encrypted.
    #[instruction]
    pub fn epoch_tiers(rep_ctxt: Enc<Mxe, Pack<RepTable>>) -> EpochTierList {
        let t = rep_ctxt.to_arcis().unpack();
        let mut entries = [0u64; R];
        for s in 0..R {
            let h = t.hits[s] as u16;
            let m = t.misses[s] as u16;
            let x = t.hoaxes[s];
            let level: u64 = if x > 0 {
                0
            } else if h >= 3 && h >= 2 * m {
                3
            } else if h >= 1 && h >= m {
                2
            } else if h == 0 && m >= 2 {
                0
            } else {
                1
            };
            let tag = (t.keys[s] >> 8) * 256;
            entries[s] = if t.keys[s] == 0 { 0 } else { tag + level };
        }
        entries.sort();
        EpochTierList { entries }.reveal()
    }
}
