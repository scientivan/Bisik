//! Bisik: private, stake-backed insider signals for ecosystems sourcing builder teams.
//!
//! Flow (living doc F0–F10): onboarding (group roots + source nullifiers, set by the
//! operator after offchain zkTLS verification, D-16) → market → anonymous stake
//! (Semaphore proof, D-17) → Arcium allocation → preview → sealed-bid auction
//! (generalized second price, b = 2, ceiling deposit, D-23) → sequential hidden
//! selection → flat purchases → outcome window → hoax disputes → settlement → claim.
//!
//! Written for Bisik. `arcium-hq/examples` was used only as an API reference (R21).

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CallbackAccount, CircuitSource, OffChainCircuitSource};

mod vk;
mod zk;

declare_id!("aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD");

pub const CONFIG_SEED: &[u8] = b"config";
pub const GROUP_SEED: &[u8] = b"group";
pub const SOURCE_SEED: &[u8] = b"src";
pub const BUYER_SEED: &[u8] = b"buyer";
pub const MARKET_SEED: &[u8] = b"market";
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const AGG_SEED: &[u8] = b"agg";
pub const AUCTION_SEED: &[u8] = b"auction";
pub const OPTION_SEED: &[u8] = b"option";
pub const POSITION_SEED: &[u8] = b"pos";
pub const BID_SEED: &[u8] = b"bid";
pub const ALLOC_SEED: &[u8] = b"alloc";
pub const OUTCOME_SEED: &[u8] = b"outcome";
pub const DISPUTE_SEED: &[u8] = b"dispute";

pub const MAX_OPTIONS: u16 = 16;
pub const MAX_BUYERS: usize = 4;
pub const BPS: u64 = 10_000;
pub const TIER_BPS: [u64; 3] = [10_000, 11_500, 13_000];

/// Byte offset of the ciphertexts inside `AggState` / `AuctionEnc`:
/// 8 (discriminator) + 32 (market) + 16 (nonce).
pub const ENC_OFFSET: u32 = 56;
pub const AGG_CTS: usize = 16;
pub const AUCTION_CTS: usize = 10;

pub mod status {
    pub const OPEN: u8 = 0;
    pub const CLOSED: u8 = 1;
    pub const AUCTION: u8 = 2;
    pub const ALLOCATED: u8 = 3;
    pub const OUTCOME: u8 = 4;
    pub const SETTLING: u8 = 5;
    pub const SETTLED: u8 = 6;
}

pub mod kind {
    pub const EXCLUSIVE: u8 = 0;
    pub const AUCTION: u8 = 1;
}

#[arcium_program]
pub mod bisik {
    use super::*;

    // ───────────────────────────── config & identity ─────────────────────────────

    pub fn init_config(ctx: Context<InitConfig>, args: ConfigArgs) -> Result<()> {
        require!(args.fee_bps as u64 + args.team_bps as u64 <= BPS, BisikError::InvalidParams);
        let c = &mut ctx.accounts.config;
        c.admin = ctx.accounts.admin.key();
        c.operator = args.operator;
        c.usdc_mint = ctx.accounts.usdc_mint.key();
        c.treasury = args.treasury;
        c.charity = args.charity;
        c.fee_bps = args.fee_bps;
        c.team_bps = args.team_bps;
        c.market_count = 0;
        c.current_epoch = 1;
        c.epoch_start = Clock::get()?.unix_timestamp;
        c.epoch_len = args.epoch_len;
        c.k_min = args.k_min;
        c.demo_mode = args.demo_mode;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn rotate_epoch(ctx: Context<OperatorOnly>) -> Result<()> {
        let c = &mut ctx.accounts.config;
        let now = Clock::get()?.unix_timestamp;
        require!(c.demo_mode || now >= c.epoch_start + c.epoch_len, BisikError::TooEarly);
        c.current_epoch += 1;
        c.epoch_start = now;
        emit!(EpochRotated { epoch: c.current_epoch });
        Ok(())
    }

    /// Operator publishes the Merkle root of an anonymous tier group (D-17).
    /// The tree is built offchain from public leaves (identity commitments).
    pub fn publish_group_root(ctx: Context<PublishGroupRoot>, tier: u8, epoch: u32, root: [u8; 32], size: u32) -> Result<()> {
        require!(tier < 3, BisikError::InvalidParams);
        let c = &ctx.accounts.config;
        require!(c.demo_mode || size >= c.k_min as u32, BisikError::GroupTooSmall);
        let g = &mut ctx.accounts.group;
        if g.root != [0u8; 32] && g.root != root {
            g.history.rotate_right(1);
            g.history[0] = g.root;
        }
        g.tier = tier;
        g.epoch = epoch;
        g.root = root;
        g.size = size;
        g.updated_at = Clock::get()?.unix_timestamp;
        g.bump = ctx.bumps.group;
        emit!(GroupRootPublished { tier, epoch, root, size });
        Ok(())
    }

    /// One source account (e.g. one GitHub account) = one scout (D-16). Only the hash is stored.
    pub fn register_source_nullifier(ctx: Context<RegisterSourceNullifier>, nullifier: [u8; 32]) -> Result<()> {
        let s = &mut ctx.accounts.source;
        s.nullifier = nullifier;
        s.created_at = Clock::get()?.unix_timestamp;
        s.bump = ctx.bumps.source;
        Ok(())
    }

    pub fn register_buyer(ctx: Context<RegisterBuyer>, authority: Pubkey, pseudonym_hash: [u8; 32]) -> Result<()> {
        let b = &mut ctx.accounts.buyer;
        b.authority = authority;
        b.pseudonym_hash = pseudonym_hash;
        b.verified = true;
        b.bump = ctx.bumps.buyer;
        Ok(())
    }

    // ───────────────────────────── computation definitions ─────────────────────────────

    pub fn init_init_market_agg_comp_def(ctx: Context<InitInitMarketAggCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("init_market_agg", arcium_macros::circuit_hash!("init_market_agg")))?;
        Ok(())
    }

    pub fn init_allocate_comp_def(ctx: Context<InitAllocateCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("allocate", arcium_macros::circuit_hash!("allocate")))?;
        Ok(())
    }

    pub fn init_preview_comp_def(ctx: Context<InitPreviewCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("preview", arcium_macros::circuit_hash!("preview")))?;
        Ok(())
    }

    pub fn init_init_auction_comp_def(ctx: Context<InitInitAuctionCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("init_auction", arcium_macros::circuit_hash!("init_auction")))?;
        Ok(())
    }

    pub fn init_place_bid_comp_def(ctx: Context<InitPlaceBidCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("place_bid", arcium_macros::circuit_hash!("place_bid")))?;
        Ok(())
    }

    pub fn init_resolve_auction_comp_def(ctx: Context<InitResolveAuctionCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("resolve_auction", arcium_macros::circuit_hash!("resolve_auction")))?;
        Ok(())
    }

    pub fn init_winning_weights_comp_def(ctx: Context<InitWinningWeightsCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("winning_weights", arcium_macros::circuit_hash!("winning_weights")))?;
        Ok(())
    }

    pub fn init_position_hits_comp_def(ctx: Context<InitPositionHitsCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, circuit_source("position_hits", arcium_macros::circuit_hash!("position_hits")))?;
        Ok(())
    }


    // ───────────────────────────── market lifecycle ─────────────────────────────

    pub fn create_market(ctx: Context<CreateMarket>, args: MarketArgs) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let c = &mut ctx.accounts.config;
        require!(args.kind <= kind::AUCTION, BisikError::InvalidParams);
        require!(args.min_stake > 0 && args.min_stake <= args.max_stake, BisikError::InvalidParams);
        require!(args.b == 2 && args.x >= 1 && args.x <= 3, BisikError::InvalidParams);
        require!(args.early_bonus_bps >= BPS as u32 && args.early_bonus_bps <= 20_000, BisikError::InvalidParams);
        require!(args.submit_len > 0 && args.outcome_len > 0, BisikError::InvalidParams);
        if !c.demo_mode {
            require!(args.submit_len >= 86_400 && args.outcome_len >= 86_400, BisikError::InvalidParams);
        }
        if args.kind == kind::AUCTION {
            require!(ctx.accounts.creator.key() == c.operator, BisikError::Unauthorized);
        } else {
            require!(args.initial_pool > 0, BisikError::InvalidParams);
        }

        let m = &mut ctx.accounts.market;
        m.id = c.market_count;
        c.market_count += 1;
        m.creator = ctx.accounts.creator.key();
        m.kind = args.kind;
        m.status = status::OPEN;
        m.category = args.category;
        m.question_hash = args.question_hash;
        m.submit_start = now;
        m.submit_end = now + args.submit_len;
        m.auction_len = args.auction_len;
        m.selection_len = args.selection_len;
        m.outcome_len = args.outcome_len;
        m.dispute_len = args.dispute_len;
        m.min_stake = args.min_stake;
        m.max_stake = args.max_stake;
        m.min_reason_len = args.min_reason_len;
        m.b = args.b;
        m.x = args.x;
        m.reserve_price = args.reserve_price;
        m.flat_price = args.flat_price;
        m.early_bonus_bps = args.early_bonus_bps;
        m.bump = ctx.bumps.market;
        m.escrow_bump = ctx.bumps.escrow;

        ctx.accounts.agg.market = m.key();
        ctx.accounts.auction.market = m.key();

        if args.kind == kind::EXCLUSIVE {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from: ctx.accounts.creator_token.to_account_info(),
                        to: ctx.accounts.escrow.to_account_info(),
                        authority: ctx.accounts.creator.to_account_info(),
                    },
                ),
                args.initial_pool,
            )?;
            m.buyers[0] = m.creator;
            m.pools[0] = args.initial_pool;
            m.buyer_count = 1;
            m.winners[0] = m.creator;
            m.prices[0] = args.initial_pool;
        }
        emit!(MarketCreated { market: m.key(), id: m.id, kind: m.kind, submit_end: m.submit_end });
        Ok(())
    }

    /// Queue the zeroed encrypted aggregate for a market (must run before stakes are allocated).
    pub fn init_market_state(ctx: Context<InitMarketState>, computation_offset: u64) -> Result<()> {
        require!(!ctx.accounts.market.agg_ready && !ctx.accounts.market.agg_busy, BisikError::Busy);
        ctx.accounts.market.agg_busy = true;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new().build();
        let cb = vec![InitMarketAggCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true },
                CallbackAccount { pubkey: ctx.accounts.agg.key(), is_writable: true },
            ],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "init_market_agg")]
    pub fn init_market_agg_callback(ctx: Context<InitMarketAggCallback>, output: SignedComputationOutputs<InitMarketAggOutput>) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(InitMarketAggOutput { field_0 }) => field_0,
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        ctx.accounts.agg.ct = o.ciphertexts;
        ctx.accounts.agg.nonce = o.nonce;
        ctx.accounts.market.agg_ready = true;
        ctx.accounts.market.agg_busy = false;
        Ok(())
    }

    /// Queue the zeroed encrypted auction state (auction markets only).
    pub fn init_auction_state(ctx: Context<InitAuctionState>, computation_offset: u64) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.kind == kind::AUCTION, BisikError::InvalidParams);
        require!(!m.auction_ready && !m.auction_busy, BisikError::Busy);
        m.auction_busy = true;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new().build();
        let cb = vec![InitAuctionCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true },
                CallbackAccount { pubkey: ctx.accounts.auction.key(), is_writable: true },
            ],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "init_auction")]
    pub fn init_auction_callback(ctx: Context<InitAuctionCallback>, output: SignedComputationOutputs<InitAuctionOutput>) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(InitAuctionOutput { field_0 }) => field_0,
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        ctx.accounts.auction.ct = o.ciphertexts;
        ctx.accounts.auction.nonce = o.nonce;
        ctx.accounts.market.auction_ready = true;
        ctx.accounts.market.auction_busy = false;
        Ok(())
    }

    /// Scouts add teams as options. Only a commitment to the team reference is stored;
    /// the plaintext reference stays encrypted at the server (privacy matrix, living doc 7).
    pub fn add_option(ctx: Context<AddOption>, team_commitment: [u8; 32], category: u8) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::OPEN && Clock::get()?.unix_timestamp < m.submit_end, BisikError::MarketNotOpen);
        require!(m.option_count < MAX_OPTIONS, BisikError::TooManyOptions);
        let o = &mut ctx.accounts.option;
        o.market = m.key();
        o.index = m.option_count;
        o.team_commitment = team_commitment;
        o.category = category;
        o.bump = ctx.bumps.option;
        m.option_count += 1;
        emit!(OptionAdded { market: m.key(), index: o.index, category });
        Ok(())
    }

    /// Anonymous stake (F2). Verifies a Semaphore membership proof for the tier group,
    /// binds it to the stake payload, enforces one nullifier per (market, slot ≤ 3),
    /// and escrows the refundable USDC stake. The supported option stays encrypted.
    pub fn stake(ctx: Context<Stake>, args: StakeArgs) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let m = &mut ctx.accounts.market;
        require!(m.status == status::OPEN && now < m.submit_end, BisikError::MarketNotOpen);
        require!(m.agg_ready, BisikError::NotReady);
        require!(args.slot >= 1 && args.slot <= 3, BisikError::SlotOutOfRange);
        require!(args.amount >= m.min_stake && args.amount <= m.max_stake, BisikError::StakeOutOfBounds);
        let g = &ctx.accounts.group;
        require!(g.tier == args.tier && g.epoch == args.epoch, BisikError::UnknownRoot);
        require!(args.root != [0u8; 32] && (g.root == args.root || g.history.contains(&args.root)), BisikError::UnknownRoot);

        let scope = zk::scope_bytes(m.id, args.slot);
        let message = zk::stake_message(
            m.id,
            args.slot,
            args.amount,
            &zk::enc_option_hash(&args.enc_pubkey, args.enc_nonce, &args.enc_option),
            &args.reason_hash,
            &zk::credit_hash(&args.credit_ct, args.credit_nonce),
        );
        require!(zk::verify(&args.proof, &args.root, &args.nullifier, &message, &scope), BisikError::InvalidProof);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.payer_token.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            args.amount,
        )?;

        // Early bonus: linear from early_bonus_bps down to 1.0x across the submit window.
        let span = (m.submit_end - m.submit_start).max(1) as u64;
        let elapsed = (now - m.submit_start).max(0) as u64;
        let bonus = m.early_bonus_bps as u64 - (m.early_bonus_bps as u64 - BPS) * elapsed.min(span) / span;
        let weight = (args.amount as u128 * bonus as u128 * TIER_BPS[args.tier as usize] as u128 / (BPS as u128 * BPS as u128)) as u64;

        let p = &mut ctx.accounts.position;
        p.market = m.key();
        p.nullifier = args.nullifier;
        p.root = args.root;
        p.slot = args.slot;
        p.tier = args.tier;
        p.epoch = args.epoch;
        p.amount = args.amount;
        p.weight = weight;
        p.enc_pubkey = args.enc_pubkey;
        p.enc_nonce = args.enc_nonce;
        p.enc_option = args.enc_option;
        p.reason_hash = args.reason_hash;
        p.credit_ct = args.credit_ct;
        p.credit_nonce = args.credit_nonce;
        p.staked_at = now;
        p.bump = ctx.bumps.position;
        m.position_count += 1;
        m.total_staked += args.amount;
        emit!(Staked { market: m.key(), nullifier: args.nullifier, slot: args.slot, amount: args.amount, tier: args.tier });
        Ok(())
    }

    /// Fold one position's encrypted option into the encrypted aggregate (sequential, one at a time).
    pub fn allocate_position(ctx: Context<AllocatePosition>, computation_offset: u64) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.agg_ready && !m.agg_busy, BisikError::Busy);
        require!(!ctx.accounts.position.allocated, BisikError::AlreadyDone);
        m.agg_busy = true;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let p = &ctx.accounts.position;
        let args = ArgBuilder::new()
            .x25519_pubkey(p.enc_pubkey)
            .plaintext_u128(p.enc_nonce)
            .encrypted_u8(p.enc_option)
            .plaintext_u64(p.weight)
            .plaintext_u8(m.option_count as u8)
            .plaintext_u128(ctx.accounts.agg.nonce)
            .account(ctx.accounts.agg.key(), ENC_OFFSET, (AGG_CTS * 32) as u32)
            .build();
        let cb = vec![AllocateCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true },
                CallbackAccount { pubkey: ctx.accounts.agg.key(), is_writable: true },
                CallbackAccount { pubkey: ctx.accounts.position.key(), is_writable: true },
            ],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "allocate")]
    pub fn allocate_callback(ctx: Context<AllocateCallback>, output: SignedComputationOutputs<AllocateOutput>) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(AllocateOutput { field_0 }) => field_0,
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        ctx.accounts.agg.ct = o.ciphertexts;
        ctx.accounts.agg.nonce = o.nonce;
        ctx.accounts.position.allocated = true;
        ctx.accounts.market.allocated_count += 1;
        ctx.accounts.market.agg_busy = false;
        Ok(())
    }

    /// Close the submit window (F3). All positions must already be allocated.
    pub fn close_submit(ctx: Context<MarketMut>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::OPEN, BisikError::MarketNotOpen);
        require!(Clock::get()?.unix_timestamp >= m.submit_end, BisikError::TooEarly);
        require!(m.allocated_count == m.position_count && !m.agg_busy, BisikError::NotReady);
        m.status = status::CLOSED;
        Ok(())
    }

    /// Reveal only the strength histogram (F4 preview), never option identities.
    pub fn request_preview(ctx: Context<RequestPreview>, computation_offset: u64) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::CLOSED && !m.agg_busy, BisikError::NotReady);
        m.agg_busy = true;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .plaintext_u128(ctx.accounts.agg.nonce)
            .account(ctx.accounts.agg.key(), ENC_OFFSET, (AGG_CTS * 32) as u32)
            .build();
        let cb = vec![PreviewCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true }],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "preview")]
    pub fn preview_callback(ctx: Context<PreviewCallback>, output: SignedComputationOutputs<PreviewOutput>) -> Result<()> {
        let (backed, weak, medium, strong) = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(PreviewOutput { field_0: PreviewOutputStruct0 { field_0, field_1, field_2, field_3 } }) => (field_0, field_1, field_2, field_3),
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        let now = Clock::get()?.unix_timestamp;
        let m = &mut ctx.accounts.market;
        m.preview = [backed, weak, medium, strong];
        m.agg_busy = false;
        if m.kind == kind::AUCTION {
            m.status = status::AUCTION;
            m.auction_end = now + m.auction_len;
        } else {
            // Exclusive market: the creator is the only buyer and sees every signal.
            m.status = status::ALLOCATED;
            m.next_rank = 2;
            m.selection_deadline = now;
        }
        emit!(MarketClosed { market: m.key(), backed, weak, medium, strong, positions: m.position_count });
        Ok(())
    }

    /// Sealed bid, step 1 (F4): deposit the public ceiling (D-23) and open a bid record.
    pub fn open_bid(ctx: Context<OpenBid>, ceiling: u64) -> Result<()> {
        let m = &ctx.accounts.market;
        require!(m.status == status::AUCTION && Clock::get()?.unix_timestamp < m.auction_end, BisikError::AuctionNotOpen);
        require!(ceiling >= m.reserve_price && ceiling > 0, BisikError::InvalidParams);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.payer_token.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            ceiling,
        )?;
        let b = &mut ctx.accounts.bid;
        b.market = m.key();
        b.buyer = ctx.accounts.payer.key();
        b.ceiling = ceiling;
        b.bump = ctx.bumps.bid;
        Ok(())
    }

    /// Sealed bid, step 2: the encrypted amount is folded into the top-3 inside MPC and
    /// capped at the deposited ceiling. The bidder identity is the signer (not user-supplied).
    pub fn place_bid(ctx: Context<PlaceBid>, computation_offset: u64, enc_pubkey: [u8; 32], enc_nonce: u128, enc_bid: [u8; 32]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        {
            let m = &ctx.accounts.market;
            require!(m.status == status::AUCTION && now < m.auction_end, BisikError::AuctionNotOpen);
            require!(m.auction_ready && !m.auction_busy, BisikError::Busy);
        }
        require!(!ctx.accounts.bid.placed, BisikError::AlreadyDone);
        ctx.accounts.bid.placed = true;
        let ceiling = ctx.accounts.bid.ceiling;
        let bidder = ctx.accounts.payer.key().to_bytes();
        let lo = u128::from_le_bytes(bidder[..16].try_into().unwrap());
        let hi = u128::from_le_bytes(bidder[16..].try_into().unwrap());
        let m = &mut ctx.accounts.market;
        m.auction_busy = true;
        m.bid_count += 1;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(enc_pubkey)
            .plaintext_u128(enc_nonce)
            .encrypted_u64(enc_bid)
            .plaintext_u128(lo)
            .plaintext_u128(hi)
            .plaintext_u64(ceiling)
            .plaintext_u128(ctx.accounts.auction.nonce)
            .account(ctx.accounts.auction.key(), ENC_OFFSET, (AUCTION_CTS * 32) as u32)
            .build();
        let cb = vec![PlaceBidCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true },
                CallbackAccount { pubkey: ctx.accounts.auction.key(), is_writable: true },
            ],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        emit!(BidPlaced { market: ctx.accounts.market.key(), buyer: ctx.accounts.payer.key() });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "place_bid")]
    pub fn place_bid_callback(ctx: Context<PlaceBidCallback>, output: SignedComputationOutputs<PlaceBidOutput>) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(PlaceBidOutput { field_0 }) => field_0,
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        ctx.accounts.auction.ct = o.ciphertexts;
        ctx.accounts.auction.nonce = o.nonce;
        ctx.accounts.market.auction_busy = false;
        Ok(())
    }

    pub fn resolve_auction(ctx: Context<ResolveAuction>, computation_offset: u64) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::AUCTION, BisikError::AuctionNotOpen);
        require!(Clock::get()?.unix_timestamp >= m.auction_end, BisikError::TooEarly);
        require!(!m.auction_busy, BisikError::Busy);
        m.auction_busy = true;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .plaintext_u64(m.reserve_price)
            .plaintext_u128(ctx.accounts.auction.nonce)
            .account(ctx.accounts.auction.key(), ENC_OFFSET, (AUCTION_CTS * 32) as u32)
            .build();
        let cb = vec![ResolveAuctionCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true }],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "resolve_auction")]
    pub fn resolve_auction_callback(ctx: Context<ResolveAuctionCallback>, output: SignedComputationOutputs<ResolveAuctionOutput>) -> Result<()> {
        let r = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(ResolveAuctionOutput { field_0 }) => field_0,
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        let key = |lo: u128, hi: u128| {
            let mut k = [0u8; 32];
            k[..16].copy_from_slice(&lo.to_le_bytes());
            k[16..].copy_from_slice(&hi.to_le_bytes());
            Pubkey::new_from_array(k)
        };
        let now = Clock::get()?.unix_timestamp;
        let m = &mut ctx.accounts.market;
        m.winners = [key(r.field_0, r.field_1), key(r.field_3, r.field_4)];
        m.prices = [r.field_2, r.field_5];
        m.auction_busy = false;
        m.status = status::ALLOCATED;
        m.next_rank = if m.winners[0] == Pubkey::default() { 2 } else { 0 };
        m.selection_deadline = now + m.selection_len;
        emit!(AuctionResolved { market: m.key(), winners: m.winners, prices: m.prices });
        Ok(())
    }

    /// After resolution: losers get their full ceiling back; winners get ceiling − price,
    /// and their price joins the scouts' pool as a buyer pool entry.
    pub fn settle_bid(ctx: Context<SettleBid>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status >= status::ALLOCATED, BisikError::NotReady);
        let b = &mut ctx.accounts.bid;
        require!(!b.refunded, BisikError::AlreadyDone);
        let buyer = b.buyer;
        let mut refund = b.ceiling;
        for rank in 0..2 {
            if m.winners[rank] == buyer && buyer != Pubkey::default() {
                let price = m.prices[rank].min(b.ceiling);
                refund = b.ceiling - price;
                require!((m.buyer_count as usize) < MAX_BUYERS, BisikError::TooManyBuyers);
                let i = m.buyer_count as usize;
                m.buyers[i] = buyer;
                m.pools[i] = price;
                m.buyer_count += 1;
            }
        }
        b.refunded = true;
        if refund > 0 {
            let id = m.id.to_le_bytes();
            let seeds: &[&[u8]] = &[MARKET_SEED, &id, &[m.bump]];
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.buyer_token.to_account_info(),
                        authority: m.to_account_info(),
                    },
                    &[seeds],
                ),
                refund,
            )?;
        }
        Ok(())
    }

    /// F5: winners hide up to x signals each, strictly in rank order (#1 then #2).
    pub fn select_hidden(ctx: Context<SelectHidden>, options: Vec<u16>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::ALLOCATED, BisikError::NotReady);
        let rank = m.next_rank as usize;
        require!(rank < 2, BisikError::WrongSelectionOrder);
        require!(m.winners[rank] == ctx.accounts.buyer.key(), BisikError::WrongSelectionOrder);
        require!(options.len() <= m.x as usize, BisikError::TooManyOptions);
        let taken = if rank == 1 { m.hidden[0] } else { 0 };
        let mut mask = 0u16;
        for o in options {
            require!(o < m.option_count, BisikError::InvalidParams);
            let bit = 1u16 << o;
            require!(taken & bit == 0 && mask & bit == 0, BisikError::OptionAlreadyHidden);
            mask |= bit;
        }
        m.hidden[rank] = mask;
        m.next_rank = if rank == 0 && m.winners[1] != Pubkey::default() { 1 } else { 2 };
        emit!(HiddenSelected { market: m.key(), buyer: ctx.accounts.buyer.key(), rank: rank as u8 + 1, count: mask.count_ones() as u8 });
        Ok(())
    }

    /// Anyone may skip a winner who did not select before the deadline.
    pub fn skip_selection(ctx: Context<MarketMut>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::ALLOCATED && m.next_rank < 2, BisikError::NotReady);
        require!(Clock::get()?.unix_timestamp >= m.selection_deadline, BisikError::TooEarly);
        m.next_rank = 2;
        Ok(())
    }

    /// Non-winning verified buyers buy the remaining signals at the flat price.
    pub fn buy_flat(ctx: Context<BuyFlat>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.kind == kind::AUCTION && m.status == status::ALLOCATED && m.next_rank == 2, BisikError::NotReady);
        require!(m.flat_price > 0, BisikError::InvalidParams);
        let buyer = ctx.accounts.payer.key();
        for i in 0..m.buyer_count as usize {
            require!(m.buyers[i] != buyer, BisikError::AlreadyDone);
        }
        require!((m.buyer_count as usize) < MAX_BUYERS, BisikError::TooManyBuyers);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.payer_token.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            m.flat_price,
        )?;
        let i = m.buyer_count as usize;
        m.buyers[i] = buyer;
        m.pools[i] = m.flat_price;
        m.buyer_count += 1;
        emit!(FlatBought { market: m.key(), buyer });
        Ok(())
    }

    pub fn open_outcome_window(ctx: Context<MarketMut>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let m = &mut ctx.accounts.market;
        require!(m.status == status::ALLOCATED, BisikError::NotReady);
        require!(m.next_rank == 2 && now >= m.selection_deadline, BisikError::TooEarly);
        m.status = status::OUTCOME;
        m.outcome_end = now + m.outcome_len;
        Ok(())
    }

    /// Team opt-in (D-09): the operator registers the team's deploy wallet after the team claims it.
    pub fn register_deploy_wallet(ctx: Context<RegisterDeployWallet>, wallet: Pubkey) -> Result<()> {
        let o = &mut ctx.accounts.option;
        o.deploy_wallet = wallet;
        o.opted_in = true;
        ctx.accounts.market.opted_mask |= 1u16 << o.index;
        Ok(())
    }

    /// F7: a successful outcome for (buyer, option). Grants are attested by the buyer;
    /// deploys on Solana are attested by the operator's oracle (trust assumption, disclosed).
    pub fn record_outcome(ctx: Context<RecordOutcome>, buyer_index: u8, option: u16, outcome_kind: u8, evidence_hash: [u8; 32]) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::OUTCOME && Clock::get()?.unix_timestamp < m.outcome_end, BisikError::NotReady);
        let i = buyer_index as usize;
        require!(i < m.buyer_count as usize && option < m.option_count, BisikError::InvalidParams);
        let signer = ctx.accounts.signer.key();
        require!(signer == m.buyers[i] || signer == ctx.accounts.config.operator, BisikError::Unauthorized);
        require!(visible_mask(m, i) & (1u16 << option) != 0, BisikError::NotVisible);
        m.masks[i] |= 1u16 << option;
        let r = &mut ctx.accounts.outcome;
        r.market = m.key();
        r.buyer = m.buyers[i];
        r.option = option;
        r.kind = outcome_kind;
        r.evidence_hash = evidence_hash;
        r.recorded_by = signer;
        r.at = Clock::get()?.unix_timestamp;
        r.bump = ctx.bumps.outcome;
        emit!(OutcomeRecorded { market: m.key(), buyer: r.buyer, option, kind: outcome_kind });
        Ok(())
    }

    /// D-05 default rule: a buyer who marked nothing gets the option with the strongest
    /// signal they bought. The operator computes it from the decrypted signal view (disclosed).
    pub fn set_default_outcome(ctx: Context<OperatorMarket>, buyer_index: u8, option: u16) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::OUTCOME && Clock::get()?.unix_timestamp >= m.outcome_end, BisikError::TooEarly);
        let i = buyer_index as usize;
        require!(i < m.buyer_count as usize && m.masks[i] == 0, BisikError::InvalidParams);
        require!(visible_mask(m, i) & (1u16 << option) != 0, BisikError::NotVisible);
        m.masks[i] = 1u16 << option;
        Ok(())
    }

    /// F8: a buyer flags a verifiable claim in a position's reason as false, with evidence.
    pub fn open_dispute(ctx: Context<OpenDispute>, claim_hash: [u8; 32], evidence_hash: [u8; 32]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let m = &mut ctx.accounts.market;
        require!(m.status == status::OUTCOME && now < m.outcome_end, BisikError::DisputeWindowClosed);
        let buyer = ctx.accounts.buyer.key();
        require!((0..m.buyer_count as usize).any(|i| m.buyers[i] == buyer), BisikError::NotEligibleBuyer);
        let d = &mut ctx.accounts.dispute;
        d.market = m.key();
        d.nullifier = ctx.accounts.position.nullifier;
        d.buyer = buyer;
        d.claim_hash = claim_hash;
        d.evidence_hash = evidence_hash;
        d.opened_at = now;
        d.deadline = now + m.dispute_len;
        d.status = 0;
        d.bump = ctx.bumps.dispute;
        m.open_disputes += 1;
        emit!(DisputeOpened { market: m.key(), nullifier: d.nullifier });
        Ok(())
    }

    /// Operator decides in v1. Upheld = proven hoax: the stake goes to charity (D-07);
    /// losing opinions are never slashed.
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, upheld: bool) -> Result<()> {
        let d = &mut ctx.accounts.dispute;
        require!(d.status == 0, BisikError::AlreadyDone);
        require!(Clock::get()?.unix_timestamp >= d.deadline || ctx.accounts.config.demo_mode, BisikError::TooEarly);
        d.status = if upheld { 1 } else { 2 };
        let m = &mut ctx.accounts.market;
        m.open_disputes -= 1;
        if upheld && !ctx.accounts.position.slashed {
            let amount = ctx.accounts.position.amount;
            ctx.accounts.position.slashed = true;
            let id = m.id.to_le_bytes();
            let seeds: &[&[u8]] = &[MARKET_SEED, &id, &[m.bump]];
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.charity_token.to_account_info(),
                        authority: m.to_account_info(),
                    },
                    &[seeds],
                ),
                amount,
            )?;
        }
        emit!(DisputeResolved { market: m.key(), nullifier: d.nullifier, upheld });
        Ok(())
    }

    /// F9 step 1: reveal, per buyer, the total weight of that buyer's successful options.
    pub fn compute_weights(ctx: Context<ComputeWeights>, computation_offset: u64) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::OUTCOME && Clock::get()?.unix_timestamp >= m.outcome_end, BisikError::TooEarly);
        require!(m.open_disputes == 0 && !m.agg_busy, BisikError::NotReady);
        for i in 0..m.buyer_count as usize {
            require!(m.masks[i] != 0, BisikError::MissingOutcome);
        }
        m.agg_busy = true;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .plaintext_u16(m.masks[0])
            .plaintext_u16(m.masks[1])
            .plaintext_u16(m.masks[2])
            .plaintext_u16(m.masks[3])
            .plaintext_u128(ctx.accounts.agg.nonce)
            .account(ctx.accounts.agg.key(), ENC_OFFSET, (AGG_CTS * 32) as u32)
            .build();
        let cb = vec![WinningWeightsCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true }],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "winning_weights")]
    pub fn winning_weights_callback(ctx: Context<WinningWeightsCallback>, output: SignedComputationOutputs<WinningWeightsOutput>) -> Result<()> {
        let denom = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(WinningWeightsOutput { field_0: WinningWeightsOutputStruct0 { field_0 } }) => field_0,
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        let m = &mut ctx.accounts.market;
        m.denoms = denom;
        m.agg_busy = false;
        m.status = status::SETTLING;
        Ok(())
    }

    /// F9 step 2: per position, reveal only whether its option is in each buyer's
    /// success set, then compute the payout in plaintext.
    pub fn settle_position(ctx: Context<SettlePosition>, computation_offset: u64) -> Result<()> {
        let m = &ctx.accounts.market;
        require!(m.status == status::SETTLING, BisikError::NotReady);
        let p = &mut ctx.accounts.position;
        require!(!p.settled && !p.settle_busy, BisikError::AlreadyDone);
        if p.slashed {
            p.settled = true;
            p.payout = 0;
            let m = &mut ctx.accounts.market;
            m.settled_count += 1;
            if m.settled_count == m.position_count {
                m.status = status::SETTLED;
            }
            return Ok(());
        }
        p.settle_busy = true;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(p.enc_pubkey)
            .plaintext_u128(p.enc_nonce)
            .encrypted_u8(p.enc_option)
            .plaintext_u16(m.masks[0])
            .plaintext_u16(m.masks[1])
            .plaintext_u16(m.masks[2])
            .plaintext_u16(m.masks[3])
            .build();
        let cb = vec![PositionHitsCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount { pubkey: ctx.accounts.market.key(), is_writable: true },
                CallbackAccount { pubkey: ctx.accounts.position.key(), is_writable: true },
            ],
        )?];
        queue_computation(ctx.accounts, computation_offset, args, cb, 1, 0, 0)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "position_hits")]
    pub fn position_hits_callback(ctx: Context<PositionHitsCallback>, output: SignedComputationOutputs<PositionHitsOutput>) -> Result<()> {
        let hits = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(PositionHitsOutput { field_0: PositionHitsOutputStruct0 { field_0 } }) => field_0,
            Err(_) => return Err(BisikError::AbortedComputation.into()),
        };
        let m = &mut ctx.accounts.market;
        let p = &mut ctx.accounts.position;
        p.payout = payout_for(m, &hits, p.weight);
        p.settled = true;
        p.settle_busy = false;
        m.settled_count += 1;
        if m.settled_count == m.position_count {
            m.status = status::SETTLED;
        }
        emit!(PositionSettled { market: m.key(), nullifier: p.nullifier, payout: p.payout });
        Ok(())
    }

    /// Scout claims refundable stake + payout to any recipient, proving ownership of the
    /// position's nullifier with a fresh Semaphore proof (same scope, message = recipient).
    pub fn claim(ctx: Context<Claim>, proof: [u8; 256], root: [u8; 32]) -> Result<()> {
        let m = &ctx.accounts.market;
        let p = &mut ctx.accounts.position;
        require!(p.settled, BisikError::NotReady);
        require!(!p.claimed, BisikError::AlreadyClaimed);
        require!(!p.slashed, BisikError::PositionSlashed);
        require!(root == p.root, BisikError::UnknownRoot);
        let recipient = ctx.accounts.recipient_token.owner;
        let scope = zk::scope_bytes(m.id, p.slot);
        let message = zk::claim_message(&recipient);
        require!(zk::verify(&proof, &root, &p.nullifier, &message, &scope), BisikError::InvalidProof);
        p.claimed = true;
        let total = p.amount + p.payout;
        let id = m.id.to_le_bytes();
        let seeds: &[&[u8]] = &[MARKET_SEED, &id, &[m.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                &[seeds],
            ),
            total,
        )?;
        emit!(Claimed { market: ctx.accounts.market.key(), nullifier: p.nullifier, amount: total });
        Ok(())
    }

    /// Platform fee (D-08, 15%) to the treasury after settlement.
    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == status::SETTLED && !m.fees_withdrawn, BisikError::NotReady);
        let fee_bps = ctx.accounts.config.fee_bps as u64;
        let fee: u64 = (0..m.buyer_count as usize).map(|i| m.pools[i] * fee_bps / BPS).sum();
        m.fees_withdrawn = true;
        let id = m.id.to_le_bytes();
        let seeds: &[&[u8]] = &[MARKET_SEED, &id, &[m.bump]];
        if fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.treasury_token.to_account_info(),
                        authority: m.to_account_info(),
                    },
                    &[seeds],
                ),
                fee,
            )?;
        }
        Ok(())
    }

    /// Team share (D-08, 5%) for buyer i, paid to the deploy wallet of an opted-in successful option.
    pub fn pay_team_share(ctx: Context<PayTeamShare>, buyer_index: u8) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status >= status::SETTLING, BisikError::NotReady);
        let i = buyer_index as usize;
        require!(i < m.buyer_count as usize && !m.team_paid[i], BisikError::AlreadyDone);
        let o = &ctx.accounts.option;
        require!(o.opted_in && m.masks[i] & (1u16 << o.index) != 0, BisikError::NotVisible);
        require!(ctx.accounts.team_token.owner == o.deploy_wallet, BisikError::Unauthorized);
        let amount = m.pools[i] * ctx.accounts.config.team_bps as u64 / BPS;
        m.team_paid[i] = true;
        let id = m.id.to_le_bytes();
        let seeds: &[&[u8]] = &[MARKET_SEED, &id, &[m.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.team_token.to_account_info(),
                    authority: m.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        Ok(())
    }
}

/// Circuits are uploaded onchain for localnet. For devnet, set `BISIK_CIRCUIT_BASE_URL`
/// at build time to a public URL hosting `build/*.arcis`; the hash pins each file.
pub fn circuit_source(name: &str, hash: [u8; 32]) -> Option<CircuitSource> {
    option_env!("BISIK_CIRCUIT_BASE_URL").map(|base| {
        CircuitSource::OffChain(OffChainCircuitSource { source: format!("{}/{}.arcis", base.trim_end_matches('/'), name), hash })
    })
}

/// Options buyer `i` may see: rank #1 sees all, rank #2 all except #1's hidden set,
/// flat buyers everything not hidden by either winner (F5).
pub fn visible_mask(m: &Market, i: usize) -> u16 {
    let all: u16 = if m.option_count >= 16 { u16::MAX } else { (1u16 << m.option_count) - 1 };
    let b = m.buyers[i];
    if m.kind == kind::EXCLUSIVE || (b == m.winners[0] && b != Pubkey::default()) {
        all
    } else if b == m.winners[1] && b != Pubkey::default() {
        all & !m.hidden[0]
    } else {
        all & !(m.hidden[0] | m.hidden[1])
    }
}

/// Scout share per buyer is 80%, or 85% when no opted-in team is among that buyer's
/// successful options (the 5% team share then returns to scouts, D-08).
pub fn payout_for(m: &Market, hits: &[bool; 4], weight: u64) -> u64 {
    let mut total: u128 = 0;
    for b in 0..m.buyer_count as usize {
        if !hits[b] || m.denoms[b] == 0 {
            continue;
        }
        let scout_bps: u128 = if m.masks[b] & m.opted_mask != 0 { 8_000 } else { 8_500 };
        total += m.pools[b] as u128 * scout_bps * weight as u128 / (BPS as u128 * m.denoms[b] as u128);
    }
    total as u64
}

// ───────────────────────────── state ─────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury: Pubkey,
    pub charity: Pubkey,
    pub fee_bps: u16,
    pub team_bps: u16,
    pub market_count: u64,
    pub current_epoch: u32,
    pub epoch_start: i64,
    pub epoch_len: i64,
    pub k_min: u8,
    pub demo_mode: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct GroupRoot {
    pub tier: u8,
    pub epoch: u32,
    pub root: [u8; 32],
    pub size: u32,
    pub history: [[u8; 32]; 4],
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SourceNullifier {
    pub nullifier: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BuyerProfile {
    pub authority: Pubkey,
    pub pseudonym_hash: [u8; 32],
    pub verified: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub id: u64,
    pub creator: Pubkey,
    pub kind: u8,
    pub status: u8,
    pub category: u8,
    pub question_hash: [u8; 32],
    pub submit_start: i64,
    pub submit_end: i64,
    pub auction_len: i64,
    pub auction_end: i64,
    pub selection_len: i64,
    pub selection_deadline: i64,
    pub outcome_len: i64,
    pub outcome_end: i64,
    pub dispute_len: i64,
    pub min_stake: u64,
    pub max_stake: u64,
    pub min_reason_len: u16,
    pub b: u8,
    pub x: u8,
    pub reserve_price: u64,
    pub flat_price: u64,
    pub early_bonus_bps: u32,
    pub option_count: u16,
    pub position_count: u32,
    pub allocated_count: u32,
    pub settled_count: u32,
    pub total_staked: u64,
    pub agg_ready: bool,
    pub agg_busy: bool,
    pub auction_ready: bool,
    pub auction_busy: bool,
    pub bid_count: u16,
    pub preview: [u8; 4],
    pub winners: [Pubkey; 2],
    pub prices: [u64; 2],
    pub next_rank: u8,
    pub hidden: [u16; 2],
    pub buyers: [Pubkey; 4],
    pub pools: [u64; 4],
    pub masks: [u16; 4],
    pub buyer_count: u8,
    pub opted_mask: u16,
    pub team_paid: [bool; 4],
    pub denoms: [u64; 4],
    pub open_disputes: u16,
    pub fees_withdrawn: bool,
    pub bump: u8,
    pub escrow_bump: u8,
}

/// Encrypted per-option weighted support. Layout is fixed: see `ENC_OFFSET`.
#[account]
#[derive(InitSpace)]
pub struct AggState {
    pub market: Pubkey,
    pub nonce: u128,
    pub ct: [[u8; 32]; 16],
}

/// Encrypted top-3 bids. Layout is fixed: see `ENC_OFFSET`.
#[account]
#[derive(InitSpace)]
pub struct AuctionEnc {
    pub market: Pubkey,
    pub nonce: u128,
    pub ct: [[u8; 32]; 10],
}

#[account]
#[derive(InitSpace)]
pub struct OptionEntry {
    pub market: Pubkey,
    pub index: u16,
    pub team_commitment: [u8; 32],
    pub category: u8,
    pub opted_in: bool,
    pub deploy_wallet: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub nullifier: [u8; 32],
    pub root: [u8; 32],
    pub slot: u8,
    pub tier: u8,
    pub epoch: u32,
    pub amount: u64,
    pub weight: u64,
    pub enc_pubkey: [u8; 32],
    pub enc_nonce: u128,
    pub enc_option: [u8; 32],
    pub reason_hash: [u8; 32],
    pub credit_ct: [u8; 32],
    pub credit_nonce: u128,
    pub staked_at: i64,
    pub allocated: bool,
    pub settle_busy: bool,
    pub settled: bool,
    pub payout: u64,
    pub claimed: bool,
    pub slashed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bid {
    pub market: Pubkey,
    pub buyer: Pubkey,
    pub ceiling: u64,
    pub placed: bool,
    pub refunded: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct OutcomeRecord {
    pub market: Pubkey,
    pub buyer: Pubkey,
    pub option: u16,
    pub kind: u8,
    pub evidence_hash: [u8; 32],
    pub recorded_by: Pubkey,
    pub at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Dispute {
    pub market: Pubkey,
    pub nullifier: [u8; 32],
    pub buyer: Pubkey,
    pub claim_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub opened_at: i64,
    pub deadline: i64,
    pub status: u8,
    pub bump: u8,
}

// ───────────────────────────── args ─────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigArgs {
    pub operator: Pubkey,
    pub treasury: Pubkey,
    pub charity: Pubkey,
    pub fee_bps: u16,
    pub team_bps: u16,
    pub epoch_len: i64,
    pub k_min: u8,
    pub demo_mode: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MarketArgs {
    pub kind: u8,
    pub category: u8,
    pub question_hash: [u8; 32],
    pub submit_len: i64,
    pub auction_len: i64,
    pub selection_len: i64,
    pub outcome_len: i64,
    pub dispute_len: i64,
    pub min_stake: u64,
    pub max_stake: u64,
    pub min_reason_len: u16,
    pub b: u8,
    pub x: u8,
    pub reserve_price: u64,
    pub flat_price: u64,
    pub early_bonus_bps: u32,
    pub initial_pool: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StakeArgs {
    pub slot: u8,
    pub amount: u64,
    pub tier: u8,
    pub epoch: u32,
    pub proof: [u8; 256],
    pub root: [u8; 32],
    pub nullifier: [u8; 32],
    pub enc_pubkey: [u8; 32],
    pub enc_nonce: u128,
    pub enc_option: [u8; 32],
    pub reason_hash: [u8; 32],
    pub credit_ct: [u8; 32],
    pub credit_nonce: u128,
}

// ───────────────────────────── accounts ─────────────────────────────

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Box<Account<'info, Config>>,
    pub usdc_mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OperatorOnly<'info> {
    pub operator: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
}

#[derive(Accounts)]
#[instruction(tier: u8, epoch: u32)]
pub struct PublishGroupRoot<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
    #[account(init_if_needed, payer = operator, space = 8 + GroupRoot::INIT_SPACE, seeds = [GROUP_SEED, &[tier], &epoch.to_le_bytes()], bump)]
    pub group: Box<Account<'info, GroupRoot>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nullifier: [u8; 32])]
pub struct RegisterSourceNullifier<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
    #[account(init, payer = operator, space = 8 + SourceNullifier::INIT_SPACE, seeds = [SOURCE_SEED, &nullifier], bump)]
    pub source: Box<Account<'info, SourceNullifier>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(authority: Pubkey)]
pub struct RegisterBuyer<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
    #[account(init_if_needed, payer = operator, space = 8 + BuyerProfile::INIT_SPACE, seeds = [BUYER_SEED, authority.as_ref()], bump)]
    pub buyer: Box<Account<'info, BuyerProfile>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(init, payer = creator, space = 8 + Market::INIT_SPACE, seeds = [MARKET_SEED, &config.market_count.to_le_bytes()], bump)]
    pub market: Box<Account<'info, Market>>,
    #[account(init, payer = creator, space = 8 + AggState::INIT_SPACE, seeds = [AGG_SEED, market.key().as_ref()], bump)]
    pub agg: Box<Account<'info, AggState>>,
    #[account(init, payer = creator, space = 8 + AuctionEnc::INIT_SPACE, seeds = [AUCTION_SEED, market.key().as_ref()], bump)]
    pub auction: Box<Account<'info, AuctionEnc>>,
    #[account(init, payer = creator, seeds = [ESCROW_SEED, market.key().as_ref()], bump, token::mint = usdc_mint, token::authority = market)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<Account<'info, Mint>>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = creator)]
    pub creator_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddOption<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(init, payer = payer, space = 8 + OptionEntry::INIT_SPACE, seeds = [OPTION_SEED, market.key().as_ref(), &market.option_count.to_le_bytes()], bump)]
    pub option: Box<Account<'info, OptionEntry>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: StakeArgs)]
pub struct Stake<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(seeds = [GROUP_SEED, &[args.tier], &args.epoch.to_le_bytes()], bump = group.bump)]
    pub group: Box<Account<'info, GroupRoot>>,
    #[account(init, payer = payer, space = 8 + Position::INIT_SPACE, seeds = [POSITION_SEED, market.key().as_ref(), &args.nullifier], bump)]
    pub position: Box<Account<'info, Position>>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub payer_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarketMut<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
}

#[derive(Accounts)]
pub struct OperatorMarket<'info> {
    pub operator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
}

#[derive(Accounts)]
pub struct OpenBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(seeds = [BUYER_SEED, payer.key().as_ref()], bump = buyer_profile.bump, constraint = buyer_profile.verified @ BisikError::NotEligibleBuyer)]
    pub buyer_profile: Box<Account<'info, BuyerProfile>>,
    pub market: Box<Account<'info, Market>>,
    #[account(init, payer = payer, space = 8 + Bid::INIT_SPACE, seeds = [BID_SEED, market.key().as_ref(), payer.key().as_ref()], bump)]
    pub bid: Box<Account<'info, Bid>>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub payer_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleBid<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub bid: Box<Account<'info, Bid>>,
    #[account(mut, constraint = buyer_token.owner == bid.buyer @ BisikError::Unauthorized)]
    pub buyer_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SelectHidden<'info> {
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
}

#[derive(Accounts)]
pub struct BuyFlat<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(seeds = [BUYER_SEED, payer.key().as_ref()], bump = buyer_profile.bump, constraint = buyer_profile.verified @ BisikError::NotEligibleBuyer)]
    pub buyer_profile: Box<Account<'info, BuyerProfile>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub payer_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterDeployWallet<'info> {
    pub operator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub option: Box<Account<'info, OptionEntry>>,
}

#[derive(Accounts)]
#[instruction(buyer_index: u8, option: u16)]
pub struct RecordOutcome<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(init, payer = signer, space = 8 + OutcomeRecord::INIT_SPACE, seeds = [OUTCOME_SEED, market.key().as_ref(), &[buyer_index], &option.to_le_bytes()], bump)]
    pub outcome: Box<Account<'info, OutcomeRecord>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(has_one = market)]
    pub position: Box<Account<'info, Position>>,
    #[account(init, payer = buyer, space = 8 + Dispute::INIT_SPACE, seeds = [DISPUTE_SEED, market.key().as_ref(), &position.nullifier], bump)]
    pub dispute: Box<Account<'info, Dispute>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    pub operator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub position: Box<Account<'info, Position>>,
    #[account(mut, has_one = market, constraint = dispute.nullifier == position.nullifier @ BisikError::InvalidParams)]
    pub dispute: Box<Account<'info, Dispute>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = config.charity)]
    pub charity_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    pub payer: Signer<'info>,
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub position: Box<Account<'info, Position>>,
    #[account(mut)]
    pub recipient_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    pub signer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = config.treasury)]
    pub treasury_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PayTeamShare<'info> {
    pub operator: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, constraint = config.operator == operator.key() @ BisikError::Unauthorized)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(has_one = market)]
    pub option: Box<Account<'info, OptionEntry>>,
    #[account(mut)]
    pub team_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

// ───────────────────────────── events & errors ─────────────────────────────

#[event]
pub struct EpochRotated { pub epoch: u32 }
#[event]
pub struct GroupRootPublished { pub tier: u8, pub epoch: u32, pub root: [u8; 32], pub size: u32 }
#[event]
pub struct MarketCreated { pub market: Pubkey, pub id: u64, pub kind: u8, pub submit_end: i64 }
#[event]
pub struct OptionAdded { pub market: Pubkey, pub index: u16, pub category: u8 }
#[event]
pub struct Staked { pub market: Pubkey, pub nullifier: [u8; 32], pub slot: u8, pub amount: u64, pub tier: u8 }
#[event]
pub struct MarketClosed { pub market: Pubkey, pub backed: u8, pub weak: u8, pub medium: u8, pub strong: u8, pub positions: u32 }
#[event]
pub struct BidPlaced { pub market: Pubkey, pub buyer: Pubkey }
#[event]
pub struct AuctionResolved { pub market: Pubkey, pub winners: [Pubkey; 2], pub prices: [u64; 2] }
#[event]
pub struct HiddenSelected { pub market: Pubkey, pub buyer: Pubkey, pub rank: u8, pub count: u8 }
#[event]
pub struct FlatBought { pub market: Pubkey, pub buyer: Pubkey }
#[event]
pub struct OutcomeRecorded { pub market: Pubkey, pub buyer: Pubkey, pub option: u16, pub kind: u8 }
#[event]
pub struct DisputeOpened { pub market: Pubkey, pub nullifier: [u8; 32] }
#[event]
pub struct DisputeResolved { pub market: Pubkey, pub nullifier: [u8; 32], pub upheld: bool }
#[event]
pub struct PositionSettled { pub market: Pubkey, pub nullifier: [u8; 32], pub payout: u64 }
#[event]
pub struct Claimed { pub market: Pubkey, pub nullifier: [u8; 32], pub amount: u64 }

#[error_code]
pub enum BisikError {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Invalid parameters")]
    InvalidParams,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Too early")]
    TooEarly,
    #[msg("Anonymous group smaller than k")]
    GroupTooSmall,
    #[msg("Market is not open")]
    MarketNotOpen,
    #[msg("Market state not ready")]
    NotReady,
    #[msg("Encrypted state busy; wait for the pending computation")]
    Busy,
    #[msg("Already done")]
    AlreadyDone,
    #[msg("Too many options")]
    TooManyOptions,
    #[msg("Too many buyers")]
    TooManyBuyers,
    #[msg("Slot must be 1..3")]
    SlotOutOfRange,
    #[msg("Stake out of bounds")]
    StakeOutOfBounds,
    #[msg("Unknown group root")]
    UnknownRoot,
    #[msg("Invalid zero-knowledge proof")]
    InvalidProof,
    #[msg("Auction not open")]
    AuctionNotOpen,
    #[msg("Wrong selection order")]
    WrongSelectionOrder,
    #[msg("Option already hidden")]
    OptionAlreadyHidden,
    #[msg("Buyer not eligible")]
    NotEligibleBuyer,
    #[msg("Option not visible to this buyer")]
    NotVisible,
    #[msg("Every buyer needs at least one outcome (or a default)")]
    MissingOutcome,
    #[msg("Dispute window closed")]
    DisputeWindowClosed,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Position slashed")]
    PositionSlashed,
}

// ---- generated Arcium account structs (do not hand-edit the shape; regenerate) ----
pub const COMP_DEF_OFFSET_INIT_MARKET_AGG: u32 = comp_def_offset("init_market_agg");
pub const COMP_DEF_OFFSET_ALLOCATE: u32 = comp_def_offset("allocate");
pub const COMP_DEF_OFFSET_PREVIEW: u32 = comp_def_offset("preview");
pub const COMP_DEF_OFFSET_INIT_AUCTION: u32 = comp_def_offset("init_auction");
pub const COMP_DEF_OFFSET_PLACE_BID: u32 = comp_def_offset("place_bid");
pub const COMP_DEF_OFFSET_RESOLVE_AUCTION: u32 = comp_def_offset("resolve_auction");
pub const COMP_DEF_OFFSET_WINNING_WEIGHTS: u32 = comp_def_offset("winning_weights");
pub const COMP_DEF_OFFSET_POSITION_HITS: u32 = comp_def_offset("position_hits");

#[queue_computation_accounts("init_market_agg", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct InitMarketState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_MARKET_AGG))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub agg: Box<Account<'info, AggState>>,
}

#[callback_accounts("init_market_agg")]
#[derive(Accounts)]
pub struct InitMarketAggCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_MARKET_AGG))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub agg: Box<Account<'info, AggState>>,
}

#[init_computation_definition_accounts("init_market_agg", payer)]
#[derive(Accounts)]
pub struct InitInitMarketAggCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("allocate", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AllocatePosition<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_ALLOCATE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub agg: Box<Account<'info, AggState>>,
    #[account(mut, has_one = market)]
    pub position: Box<Account<'info, Position>>,
}

#[callback_accounts("allocate")]
#[derive(Accounts)]
pub struct AllocateCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_ALLOCATE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub agg: Box<Account<'info, AggState>>,
    #[account(mut)]
    pub position: Box<Account<'info, Position>>,
}

#[init_computation_definition_accounts("allocate", payer)]
#[derive(Accounts)]
pub struct InitAllocateCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("preview", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RequestPreview<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PREVIEW))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(has_one = market)]
    pub agg: Box<Account<'info, AggState>>,
}

#[callback_accounts("preview")]
#[derive(Accounts)]
pub struct PreviewCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PREVIEW))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
}

#[init_computation_definition_accounts("preview", payer)]
#[derive(Accounts)]
pub struct InitPreviewCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("init_auction", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct InitAuctionState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_AUCTION))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub auction: Box<Account<'info, AuctionEnc>>,
}

#[callback_accounts("init_auction")]
#[derive(Accounts)]
pub struct InitAuctionCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_AUCTION))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub auction: Box<Account<'info, AuctionEnc>>,
}

#[init_computation_definition_accounts("init_auction", payer)]
#[derive(Accounts)]
pub struct InitInitAuctionCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("place_bid", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PLACE_BID))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub auction: Box<Account<'info, AuctionEnc>>,
    #[account(mut, has_one = market, constraint = bid.buyer == payer.key() @ BisikError::Unauthorized)]
    pub bid: Box<Account<'info, Bid>>,
}

#[callback_accounts("place_bid")]
#[derive(Accounts)]
pub struct PlaceBidCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PLACE_BID))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub auction: Box<Account<'info, AuctionEnc>>,
}

#[init_computation_definition_accounts("place_bid", payer)]
#[derive(Accounts)]
pub struct InitPlaceBidCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("resolve_auction", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ResolveAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_RESOLVE_AUCTION))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(has_one = market)]
    pub auction: Box<Account<'info, AuctionEnc>>,
}

#[callback_accounts("resolve_auction")]
#[derive(Accounts)]
pub struct ResolveAuctionCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_RESOLVE_AUCTION))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
}

#[init_computation_definition_accounts("resolve_auction", payer)]
#[derive(Accounts)]
pub struct InitResolveAuctionCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("winning_weights", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ComputeWeights<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_WINNING_WEIGHTS))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(has_one = market)]
    pub agg: Box<Account<'info, AggState>>,
}

#[callback_accounts("winning_weights")]
#[derive(Accounts)]
pub struct WinningWeightsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_WINNING_WEIGHTS))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
}

#[init_computation_definition_accounts("winning_weights", payer)]
#[derive(Accounts)]
pub struct InitWinningWeightsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("position_hits", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SettlePosition<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account))]
    /// CHECK: checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account))]
    /// CHECK: checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_POSITION_HITS))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, has_one = market)]
    pub position: Box<Account<'info, Position>>,
}

#[callback_accounts("position_hits")]
#[derive(Accounts)]
pub struct PositionHitsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_POSITION_HITS))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: validated by the Arcium program; verify_output reads from it.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub position: Box<Account<'info, Position>>,
}

#[init_computation_definition_accounts("position_hits", payer)]
#[derive(Accounts)]
pub struct InitPositionHitsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: not initialized yet; checked by the arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: address lookup table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}
