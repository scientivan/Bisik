import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "../lib/wallet";
import { read, type PositionRecord, type Scout } from "../lib/storage";
import { fetchBuyerRecord, type BuyerRecord } from "../lib/buyer-record";
import { recall, remember, useDataVersion } from "../lib/live";
import { loadScoutReputation, type ScoutReputation } from "../lib/reputation";
import { short, remaining } from "../lib/amounts";
import { Cipher, Icon, WalletActionButton } from "../components/ui";
import { InfoTip } from "../components/info-tip";

const TIERS = ["Bronze", "Silver", "Gold"];
const TIER_RANGE = ["50 to 299", "300 to 999", "1,000 or more"];

/** A 5×5 mirrored block mark drawn from the pseudonym hash, so a name has a face scouts can recognise. */
function PseudonymMark({ hash, size = 64 }: { hash: number[] | null; size?: number }) {
  if (!hash) return <span className="pmark pmark-empty" style={{ width: size, height: size }} aria-hidden="true" />;
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells[i] = (hash[i % hash.length] & 1) === 1;
  const accent = hash[31] % 15;
  return (
    <svg className="pmark" width={size} height={size} viewBox="-0.5 -0.5 6 6" aria-hidden="true" shapeRendering="crispEdges">
      {Array.from({ length: 25 }, (_, i) => {
        const r = Math.floor(i / 5), c = i % 5, src = r * 3 + (c < 3 ? c : 4 - c);
        return cells[src] ? <rect key={i} x={c} y={r} width="1" height="1" className={src === accent ? "on accent" : "on"} /> : null;
      })}
    </svg>
  );
}

/** Three rising bars; the filled count is the tier, read like signal strength. */
function TierMark({ tier }: { tier: number | null }) {
  return (
    <svg className="tmark" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={10 + i * 16} y={38 - i * 12} width="12" height={16 + i * 12} rx="3" className={tier !== null && i <= tier ? "on" : ""} />
      ))}
    </svg>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="chip-button" onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1600); })}>
      <Icon name={done ? "check" : "external"} />
      {done ? "Copied" : label}
    </button>
  );
}

function Status({ record }: { record: BuyerRecord }) {
  const [text, cls, tip] = record.verified
    ? ["Verified buyer", "yours", "The Bisik operator checked privately that this wallet belongs to a real ecosystem or grant team. The organisation's name is not published."]
    : record.registered
      ? ["Waiting for verification", "public", "Registered, but the operator has not confirmed it yet. Unverified wallets cannot bid or buy."]
      : ["Not registered", "public", "This wallet has no buyer profile. Ask the operator to register it before bidding."];
  return (
    <span className="status-line">
      <span className={`pill ${cls}`}>{text}</span>
      <InfoTip title={text} align="end">{tip}</InfoTip>
    </span>
  );
}

/** A bento number card: big value, a mini visual that matches the number, and one plain sentence. */
function Stat({ value, label, sentence, children, to }: { value: ReactNode; label: string; sentence: string; children?: ReactNode; to?: string }) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {children}
      <p>{sentence}</p>
      {to && <span className="stat-more">See the markets <Icon name="arrow" /></span>}
    </>
  );
  return to ? <Link className="stat-card linked" to={to}>{body}</Link> : <div className="stat-card">{body}</div>;
}

function Segments({ parts }: { parts: { n: number; cls: string; label: string }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0);
  return (
    <div className="seg-wrap">
      <div className="seg-bar" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
        {total === 0 ? <span className="seg none" /> : parts.filter((p) => p.n > 0).map((p) => <span key={p.label} className={`seg ${p.cls}`} style={{ flex: p.n }} />)}
      </div>
      <div className="seg-legend" aria-hidden="true">
        {parts.map((p) => <span key={p.label}><i className={`dot ${p.cls}`} />{p.n} {p.label}</span>)}
      </div>
    </div>
  );
}

function NoteCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="note-card">
      <Icon name="info" />
      <p><strong>{title}</strong> {children}</p>
    </div>
  );
}

function BuyerView({ address, own }: { address: string | null; own: boolean }) {
  const version = useDataVersion();
  const [record, setRecord] = useState<BuyerRecord | null>(() => (address ? recall<BuyerRecord>(`buyer:${address}`) ?? null : null));
  const [error, setError] = useState("");
  useEffect(() => {
    setRecord(address ? recall<BuyerRecord>(`buyer:${address}`) ?? null : null);
    setError("");
    if (!address) return;
    let key: PublicKey;
    try { key = new PublicKey(address); } catch { setError("This is not a valid Solana address."); return; }
    fetchBuyerRecord(key).then((r) => setRecord(remember(`buyer:${address}`, r))).catch((e) => setError(e.message));
  }, [address, version]);

  if (!address) {
    return (
      <section className="identity-card">
        <PseudonymMark hash={null} />
        <div className="identity-copy">
          <h2>Connect the wallet you buy with</h2>
          <p className="identity-meta">Your buyer name and track record are read from its public records.</p>
        </div>
        <div className="identity-side"><WalletActionButton className="button">Connect Wallet</WalletActionButton></div>
      </section>
    );
  }
  if (error) return <NoteCard title="Could not load this buyer.">{error}</NoteCard>;
  if (!record) {
    return (
      <section className="identity-card" aria-busy="true">
        <span className="pmark pmark-empty loading" style={{ width: 64, height: 64 }} aria-hidden="true" />
        <div className="identity-copy">
          <h2>Reading onchain records</h2>
          <p className="identity-meta">Looking up bids, outcome reports and disputes on Solana devnet.</p>
        </div>
      </section>
    );
  }
  const late = record.outcomesRecorded - record.outcomesOnTime;
  const publicLink = `${location.origin}/profile/buyer/${address}`;
  return (
    <>
      <section className="identity-card">
        <PseudonymMark hash={record.pseudonymHash} />
        <div className="identity-copy">
          <h2>{record.pseudonym ?? "Unnamed buyer"}</h2>
          <p className="identity-meta">
            <span className="wallet-chip">{short(address)}</span>
            <InfoTip title="Why a made-up name?" align="start">
              Scouts see this name, never the organisation behind it. It comes from a hash the operator stored onchain, so it stays the same every time.
            </InfoTip>
          </p>
        </div>
        <div className="identity-side">
          <Status record={record} />
          <CopyButton text={publicLink} label={own ? "Copy my public link" : "Copy link"} />
        </div>
      </section>

      <section className="record">
        <div className="record-head">
          <h2>Track record</h2>
          <InfoTip title="Where these numbers come from" align="start">
            {record.source === "onchain"
              ? "The program keeps these counters onchain in this buyer's record since the 13 Oct upgrade. Activity from before it is counted from older public Bisik accounts on Solana devnet, so anyone can check every number."
              : "Your browser counts them from public Bisik accounts on Solana devnet, so anyone can check them. This buyer has no onchain record yet because it has not acted since the 13 Oct upgrade."}
          </InfoTip>
        </div>
        <div className="stat-grid">
          {record.marketsJoined != null ? (
            <Stat to={own ? "/buyer/bids" : undefined} value={record.marketsJoined} label="Markets joined" sentence={record.marketsJoined ? "Joined by sealed bid, flat price or an exclusive market. Bid amounts stay hidden from everyone." : "No markets joined yet."}>
              <div className="bid-dots" aria-hidden="true">{Array.from({ length: Math.min(12, Math.max(record.marketsJoined, 0)) }, (_, i) => <Icon key={i} name="lock" />)}</div>
            </Stat>
          ) : (
          <Stat to={own ? "/buyer/bids" : undefined} value={record.marketsBid} label="Markets bid in" sentence={record.marketsBid ? "Sealed bids placed. The amounts stay hidden from everyone." : "No sealed bids yet."}>
            <div className="bid-dots" aria-hidden="true">{Array.from({ length: Math.min(12, Math.max(record.marketsBid, 0)) }, (_, i) => <Icon key={i} name="lock" />)}</div>
          </Stat>
          )}
          <Stat
            value={record.outcomesRecorded ? <>{record.outcomesOnTime}<small> of {record.outcomesRecorded}</small></> : 0}
            label="Outcomes reported on time"
            to={own ? "/buyer/bids?show=won" : undefined}
            sentence={
              record.defaultsApplied
                ? `${record.defaultsApplied} missed ${record.defaultsApplied === 1 ? "report" : "reports"}. Each time, the default rule chose the outcome instead.`
                : record.outcomesRecorded ? "Late or missing reports fall back to the default rule." : "Nothing reported yet. Scouts are paid once a buyer reports what happened."
            }
          >
            <Segments
              parts={[
                { n: record.outcomesOnTime, cls: "good", label: "on time" },
                { n: late, cls: "muted", label: "late" },
                ...(record.defaultsApplied != null ? [{ n: record.defaultsApplied, cls: "muted", label: "missed reports" }] : []),
              ]}
            />
          </Stat>
          <Stat value={record.disputesOpened} label="Hoax disputes opened" sentence={record.disputesOpened ? "Rejected disputes mean the flagged claim held up." : "This buyer has not challenged any scout's claim."}>
            <Segments parts={[{ n: record.disputesUpheld, cls: "good", label: "upheld" }, { n: record.disputesRejected, cls: "muted", label: "rejected" }, { n: record.disputesOpen, cls: "open", label: "open" }]} />
          </Stat>
        </div>
      </section>
      {own && !record.registered && <NoteCard title="Register this wallet to start bidding.">The operator verifies buyers privately before their first sealed bid.</NoteCard>}
    </>
  );
}

function ScoutView() {
  const scout = read<Scout | null>("scout", null);
  const positions = read<PositionRecord[]>("positions", []);
  const [rep, setRep] = useState<ScoutReputation | null>(null);
  useEffect(() => {
    if (!scout?.commitment) return;
    const c = new AbortController();
    loadScoutReputation(scout, c.signal).then(setRep).catch(() => setRep(null));
    return () => c.abort();
  }, [scout?.commitment]);

  if (!scout) {
    return (
      <section className="identity-card">
        <TierMark tier={null} />
        <div className="identity-copy">
          <h2>No scout identity on this device</h2>
          <p className="identity-meta">Prove your GitHub record once to sell insights anonymously.</p>
        </div>
        <div className="identity-side"><Link className="button" to="/scout/onboard">Get verified</Link></div>
      </section>
    );
  }
  const tier = scout.tier ?? null;
  const markets = new Set(positions.map((p) => p.marketId)).size;
  const ep = rep?.epoch;
  const progress = ep ? Math.min(1, Math.max(0, (Date.now() / 1000 - ep.start) / Math.max(1, ep.end - ep.start))) : null;
  const next = rep?.next;
  const nextText = !rep || !ep
    ? "Epoch timing is unavailable right now."
    : next?.status === "ready" && next.revealed
      ? `Your epoch ${next.epoch} result is ${next.revealed.levelName}.`
      : next?.status === "computing"
        ? `Your epoch ${next.epoch} result is being computed inside MPC.`
        : `Your result for epoch ${ep.current + 1} is revealed near the end of this one.`;
  return (
    <>
      <section className="identity-card">
        <TierMark tier={tier} />
        <div className="identity-copy">
          <h2>{tier === null ? "Verification pending" : `${TIERS[tier]} scout`}</h2>
          <p className="identity-meta">
            {tier === null ? "Finish the GitHub proof to join a group" : `${TIER_RANGE[tier]} GitHub contributions`}
            <InfoTip title="What buyers see" align="start">
              Buyers see only that a {tier === null ? "verified" : TIERS[tier]} scout backed a team. Your GitHub name, wallet and identity never reach them.
            </InfoTip>
          </p>
        </div>
        <div className="identity-side">
          <span className="status-line">
            <span className="pill sealed">Only on this device</span>
            <InfoTip title="Why only here?" align="end">
              Your scout identity lives in this browser. Back it up from the verification page, or you lose access to your positions.
            </InfoTip>
          </span>
        </div>
      </section>

      <section className="record">
        <div className="record-head"><h2>Your scouting</h2></div>
        <div className="stat-grid">
          <Stat value={positions.length} label="Staked calls" sentence={positions.length ? "Each one has a refundable stake behind it." : "No calls yet. Pick a market and back a team."} />
          <Stat value={markets} label="Markets" sentence="You can back up to three teams in each market." />
          <div className="stat-card">
            <span className="stat-label">Track record</span>
            <span className="stat-cipher"><Cipher reason="Your hit rate is credited inside Arcium MPC after each settled market. Nobody reads the raw count, not even you." /></span>
            <p>Kept encrypted. Only a coarse result is revealed once per epoch.</p>
          </div>
        </div>
      </section>

      <section className="epoch-card">
        <div className="record-head">
          <h2>Epoch {ep?.current ?? scout.epoch ?? 1}</h2>
          <InfoTip title="What an epoch is" align="start">
            Tiers change only between epochs, for everyone at once, so a change cannot be traced to one market. Groups are not yet rebuilt from the revealed results.
          </InfoTip>
          {ep && <span className="epoch-left">{remaining(ep.end)} left</span>}
        </div>
        {progress !== null && (
          <div className="epoch-track" role="img" aria-label={`${Math.round(progress * 100)}% of this epoch has passed`}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <p>{nextText}</p>
      </section>

      <div className="actions-row">
        <Link className="button" to="/scout/positions">Stakes and rewards</Link>
        <Link className="button outline" to="/scout/onboard">Back up identity</Link>
      </div>
      <NoteCard title="Scout from a separate wallet.">Your buyer wallet is known to the operator, and staking from it would let anyone link your stake amounts to your organisation.</NoteCard>
    </>
  );
}

export default function Profile() {
  const wallet = useWallet();
  const { address: viewed } = useParams();
  const [params, setParams] = useSearchParams();
  const own = wallet.publicKey?.toBase58() ?? null;
  if (viewed) {
    return (
      <div className="profile">
        <div className="profile-head">
          <div>
            <h1>Buyer profile</h1>
            <p>Check a buyer's record before you accept an introduction.</p>
          </div>
        </div>
        <BuyerView address={viewed} own={viewed === own} />
      </div>
    );
  }
  const side = params.get("as") === "scout" ? "scout" : "buyer";
  return (
    <div className="profile">
      <div className="profile-head">
        <h1>Your profile</h1>
        <div className="profile-switch">
          <div className="guide-switch" role="group" aria-label="Choose a profile side">
            <button aria-pressed={side === "buyer"} onClick={() => setParams({ as: "buyer" }, { replace: true })}>As a buyer<small>Public to scouts</small></button>
            <button aria-pressed={side === "scout"} onClick={() => setParams({ as: "scout" }, { replace: true })}>As a scout<small>Private, this device only</small></button>
          </div>
          <InfoTip title="One wallet, two sides" align="end">
            You can buy and scout with the same wallet. The two sides never appear together, so nobody can link your calls to your buyer name.
          </InfoTip>
        </div>
      </div>
      {side === "buyer" ? <BuyerView address={own} own /> : <ScoutView />}
    </div>
  );
}
