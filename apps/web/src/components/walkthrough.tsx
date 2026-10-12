import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Cipher, Pill, StrengthBars } from "./ui";
import type { Role } from "./roles";

/**
 * A guided, game-style walkthrough. Each quest asks the visitor to do one thing inside a small
 * sandbox copy of the app, then explains what Bisik did underneath. Everything is local and
 * synthetic: no wallet, no transaction, no server call.
 */
interface Quest {
  title: string;
  ask: string;
  done: ReactNode;
  stage: (complete: () => void, finished: boolean) => ReactNode;
}

const TEAMS = [
  { name: "Team Lumen", call: "Picks its chain within 14 days", scouts: 4, tiers: [1, 2, 1], copied: 3, ai: 9 },
  { name: "Team Nadi", call: "Holds an unsigned $150k grant offer from a rival ecosystem", scouts: 3, tiers: [0, 2, 1], copied: 6, ai: 14 },
  { name: "Team Arka", call: "Private beta reached 3,000 weekly users", scouts: 2, tiers: [1, 1, 0], copied: 21, ai: 38 },
];

function Target({ children, active }: { children: ReactNode; active: boolean }) {
  return <span className={active ? "wt-target" : "wt-plain"}>{children}</span>;
}

function TierLine({ tiers }: { tiers: number[] }) {
  return (
    <span className="wt-tiers">
      {["Bronze", "Silver", "Gold"].map((t, i) => tiers[i] > 0 && <span key={t}>{tiers[i]} {t}</span>)}
    </span>
  );
}

function buyerQuests(): Quest[] {
  return [
    {
      title: "Read the market-wide preview",
      ask: "Before paying, you only see how strong the backing is. Click the row for teams near the top.",
      done: "You now know two teams have strong backing and that most of it comes from Silver and Gold scouts. You still do not know which teams. Names stay sealed until you pay.",
      stage: (complete, finished) => (
        <div className="wt-panel">
          <div className="wt-row"><strong>Which DeFi teams are still choosing a chain?</strong><Pill>Demo question</Pill></div>
          <p className="wt-meta">6 teams proposed · 14 staked calls · Supporters 3 Bronze, 7 Silver, 4 Gold</p>
          <Target active={!finished}>
            <button className="wt-click" onClick={complete} aria-label="Inspect teams near the top">
              <StrengthBars strong={2} medium={3} weak={1} />
            </button>
          </Target>
        </div>
      ),
    },
    {
      title: "Place a sealed bid",
      ask: "Rival ecosystems bid for exclusive access. The reserve price is 300 USDC. Enter a bid of at least 300 and seal it.",
      done: "Your bid was encrypted on your device and compared inside Arcium's MPC network. Nobody reads the amount, not the operator and not other buyers. Winners pay the next-highest bid, not their own.",
      stage: (complete, finished) => <BidStage complete={complete} finished={finished} />,
    },
    {
      title: "Decrypt your own view",
      ask: "You won slot #1 and pay 380 USDC, the next-highest bid. Decrypt the signals with your key.",
      done: "Only your key can open this view. Each signal shows the team, how many scouts backed it, their tiers, and Veritas checks on the reasons. A high copy or AI score is a warning, not proof.",
      stage: (complete, finished) => (
        <div className="wt-panel">
          {!finished ? (
            <>
              <div className="wt-list">
                {TEAMS.map((t) => (
                  <div className="wt-row" key={t.name}><Cipher reason="Encrypted to your buyer key. It opens only on this device." /><Pill state="sealed">Sealed</Pill></div>
                ))}
              </div>
              <Target active><button className="button" onClick={complete}>Decrypt with my key</button></Target>
            </>
          ) : (
            <div className="wt-list wt-reveal">
              {TEAMS.map((t) => (
                <div className="wt-signal" key={t.name}>
                  <div className="wt-row"><strong>{t.name}</strong><Pill state="yours">Yours</Pill></div>
                  <p>{t.call}</p>
                  <p className="wt-meta">{t.scouts} scouts · <TierLine tiers={t.tiers} /> · Looks copied {t.copied}% · Likely AI-written {t.ai}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Keep one signal for yourself",
      ask: "As winner #1 you may hide signals from the buyers after you. Click Hide on the signal you want to keep exclusive.",
      done: "Buyer #2 and flat-price buyers will not see this team. That exclusivity is what you paid for at auction.",
      stage: (complete, finished) => <HideStage complete={complete} finished={finished} />,
    },
    {
      title: "Ask for an introduction",
      ask: "A name is not enough. Ask the scouts behind Team Lumen to introduce you.",
      done: "The request reaches the scouts anonymously. They can accept or decline without penalty. If one accepts, their contact is encrypted to your key, and the team is asked for consent before any introduction.",
      stage: (complete, finished) => (
        <div className="wt-panel">
          <div className="wt-row"><strong>Team Lumen</strong><Pill state="yours">Hidden for you</Pill></div>
          <p className="wt-meta">4 scouts backed this team. Their identities stay private unless one chooses to reveal it to you.</p>
          {finished ? <Pill state="public">Request sent, waiting for a scout</Pill> : <Target active><button className="button" onClick={complete}>Request introduction</button></Target>}
        </div>
      ),
    },
    {
      title: "Report what happened",
      ask: "Ninety days later, Team Lumen deployed on your chain. Mark it as the most valuable signal.",
      done: "Your 380 USDC is split between the scouts who backed Team Lumen (85%) and the platform (15%). Every scout gets their stake back. Your payment is not refunded, and if you mark nothing it goes to the strongest signal you bought.",
      stage: (complete, finished) => (
        <div className="wt-panel">
          {TEAMS.map((t) => (
            <div className="wt-row" key={t.name}>
              <span>{t.name}</span>
              {t.name === "Team Lumen" && !finished ? (
                <Target active><button className="button small" onClick={complete}>Mark most valuable</button></Target>
              ) : t.name === "Team Lumen" ? <Pill state="yours">Most valuable</Pill> : <span className="wt-meta">Not marked</span>}
            </div>
          ))}
          {finished && (
            <div className="wt-split" aria-label="Payment split">
              <div style={{ flex: 85 }}><strong>323 USDC</strong><span>Scouts behind Team Lumen</span></div>
              <div style={{ flex: 15 }}><strong>57</strong><span>Platform</span></div>
            </div>
          )}
        </div>
      ),
    },
  ];
}

function scoutQuests(): Quest[] {
  return [
    {
      title: "Prove your record without your name",
      ask: "Scouts prove their GitHub record with a zkTLS proof. Click to run the simulated proof.",
      done: "The verifier sees your username for a moment and does not store it. Only your tier and a one-way hash go onchain, so the same GitHub account cannot join twice. You join a group of at least five Silver scouts.",
      stage: (complete, finished) => <ProofStage complete={complete} finished={finished} />,
    },
    {
      title: "Pick the team you believe in",
      ask: "Choose a team that is still deciding where to build. Click one of the proposed teams.",
      done: "You can back up to three teams in a market, or propose a new one with a public repo or hackathon page. Other scouts never see which team you chose.",
      stage: (complete, finished) => (
        <div className="wt-panel">
          {TEAMS.map((t, i) => (
            <div className="wt-row" key={t.name}>
              <span>{t.name}<small className="wt-meta"> · public repo</small></span>
              {i === 0 && !finished ? <Target active><button className="button small" onClick={complete}>Back this team</button></Target> : i === 0 ? <Pill state="yours">Your pick</Pill> : <span className="wt-meta">Proposed</span>}
            </div>
          ))}
          <p className="wt-meta">Or propose a new team with a link anyone can check.</p>
        </div>
      ),
    },
    {
      title: "Explain why, then check it",
      ask: "Buyers pay for reasons, not guesses. Read the draft reason and click Check my reason.",
      done: "Veritas scores how much the reason looks copied from earlier ones and how likely it is AI-written. A privacy filter removes details that could identify you. Buyers read only the filtered version.",
      stage: (complete, finished) => <ReasonStage complete={complete} finished={finished} />,
    },
    {
      title: "Stake behind your call",
      ask: "Put a refundable stake between 10 and 500 USDC behind the call, then stake anonymously.",
      done: "Your browser built a zero-knowledge proof that you belong to the Silver group, without saying which member you are. The stake amount is visible onchain; your team pick is encrypted.",
      stage: (complete, finished) => <StakeStage complete={complete} finished={finished} />,
    },
    {
      title: "Let buyers compete",
      ask: "The market closes, buyers bid and the outcome window runs. Skip ahead to settlement.",
      done: "Two ecosystems bid, the winner bought Team Lumen and later marked it most valuable. Your opinion was never exposed to other scouts.",
      stage: (complete, finished) => (
        <div className="wt-panel">
          <ol className="wt-timeline">
            {["Open", "Closed", "Auction", "Allocated", "Outcome window", "Settled"].map((s, i) => (
              <li key={s} className={finished || i === 0 ? "on" : ""}>{s}</li>
            ))}
          </ol>
          {!finished && <Target active><button className="button" onClick={complete}>Skip ahead to settlement</button></Target>}
        </div>
      ),
    },
    {
      title: "Claim to a fresh address",
      ask: "Claim your stake and reward to a new wallet address that has never touched Bisik.",
      done: "The claim proves you own a position without revealing which wallet staked. A wrong call is never punished. Only a proven hoax loses its stake, and that money goes to charity.",
      stage: (complete, finished) => <ClaimStage complete={complete} finished={finished} />,
    },
  ];
}

function BidStage({ complete, finished }: { complete: () => void; finished: boolean }) {
  const [bid, setBid] = useState("");
  const value = Number(bid);
  const tooLow = bid !== "" && value < 300;
  return (
    <div className="wt-panel">
      <label className="field">
        <span>Your bid for exclusive slot #1 (USDC)</span>
        <input inputMode="decimal" value={bid} onChange={(e) => setBid(e.target.value.replace(/[^\d.]/g, ""))} placeholder="At least 300" disabled={finished} aria-invalid={tooLow} />
        <small>{tooLow ? "Below the 300 USDC reserve. Bids under the reserve cannot win." : "Your deposit is a ceiling. You pay the next-highest bid."}</small>
      </label>
      {finished ? (
        <div className="wt-row"><Cipher reason="Your bid amount, encrypted. Only the MPC network compares it." /><Pill state="sealed">Sealed bid</Pill></div>
      ) : (
        <Target active={value >= 300}><button className="button" disabled={!(value >= 300)} onClick={complete}>Seal my bid</button></Target>
      )}
    </div>
  );
}

function HideStage({ complete, finished }: { complete: () => void; finished: boolean }) {
  const [hidden, setHidden] = useState<string | null>(null);
  return (
    <div className="wt-panel">
      {TEAMS.map((t) => (
        <div className="wt-row" key={t.name}>
          <span>{t.name}</span>
          {hidden === t.name ? <Pill state="yours">Hidden for you</Pill> : finished ? <Pill>Shared with later buyers</Pill> : (
            <Target active><button className="button small outline" onClick={() => { setHidden(t.name); complete(); }}>Hide</button></Target>
          )}
        </div>
      ))}
    </div>
  );
}

function ProofStage({ complete, finished }: { complete: () => void; finished: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="wt-panel">
      {finished ? (
        <>
          <div className="wt-row"><span>GitHub contributions</span><strong>1,394</strong></div>
          <div className="wt-row"><span>Your tier</span><Pill state="yours">Silver</Pill></div>
          <div className="wt-row"><span>Stored onchain</span><span className="wt-meta">Tier and a hash, no username</span></div>
        </>
      ) : (
        <Target active={!busy}>
          <button className="button" disabled={busy} onClick={() => { setBusy(true); setTimeout(complete, 900); }}>
            {busy ? "Proving with Reclaim" : "Prove my GitHub record"}
          </button>
        </Target>
      )}
    </div>
  );
}

const DRAFT = "Team Lumen's lead told me after judging that they will pick a chain within two weeks. My colleague at Jump also saw their testnet numbers.";
const FILTERED = "Team Lumen's lead said they will pick a chain within two weeks. [Detail removed: names a person or employer.] Their testnet numbers were also seen.";

function ReasonStage({ complete, finished }: { complete: () => void; finished: boolean }) {
  return (
    <div className="wt-panel">
      <label className="field">
        <span>Your reason (buyers read a filtered version)</span>
        <textarea rows={3} readOnly value={finished ? FILTERED : DRAFT} />
      </label>
      {finished ? (
        <div className="wt-list">
          <div className="wt-row"><span>Looks copied from earlier reasons</span><strong>4%</strong></div>
          <div className="wt-row"><span>Likely AI-written</span><strong>12%</strong></div>
          <div className="wt-row"><span>Verifiable claims found</span><strong>1</strong></div>
          <div className="wt-row"><span>Identifying details removed</span><strong>1</strong></div>
        </div>
      ) : <Target active><button className="button" onClick={complete}>Check my reason</button></Target>}
    </div>
  );
}

function StakeStage({ complete, finished }: { complete: () => void; finished: boolean }) {
  const [stake, setStake] = useState(50);
  const [busy, setBusy] = useState(false);
  return (
    <div className="wt-panel">
      <label className="field">
        <span>Stake on Team Lumen <strong className="wt-amount">{stake} USDC</strong></span>
        <input type="range" min={10} max={500} step={10} value={stake} onChange={(e) => setStake(Number(e.target.value))} disabled={finished || busy} />
        <small>Refunded after settlement unless a hoax is proven.</small>
      </label>
      {finished ? (
        <div className="wt-row"><Cipher reason="Your team pick, encrypted for the MPC network." /><Pill state="sealed">Pick sealed</Pill></div>
      ) : (
        <Target active={!busy}><button className="button" disabled={busy} onClick={() => { setBusy(true); setTimeout(complete, 900); }}>{busy ? "Building your proof" : "Stake anonymously"}</button></Target>
      )}
    </div>
  );
}

function ClaimStage({ complete, finished }: { complete: () => void; finished: boolean }) {
  const [address, setAddress] = useState("");
  return (
    <div className="wt-panel">
      <div className="wt-row">
        <span>Destination</span>
        {address ? <code className="wt-meta">{address}</code> : (
          <Target active><button className="button small outline" onClick={() => setAddress("7Qe4…n9Wd (new)")}>Create a fresh address</button></Target>
        )}
      </div>
      {finished ? (
        <>
          <div className="wt-row"><span>Stake returned</span><strong>50.00 USDC</strong></div>
          <div className="wt-row"><span>Your reward</span><Pill state="yours">41.20 USDC</Pill></div>
        </>
      ) : <Target active={!!address}><button className="button" disabled={!address} onClick={complete}>Claim</button></Target>}
    </div>
  );
}

export function Walkthrough({ role }: { role: Role }) {
  const quests = role === "scout" ? scoutQuests() : buyerQuests();
  const [at, setAt] = useState(0);
  const [done, setDone] = useState<boolean[]>([]);
  const coach = useRef<HTMLDivElement>(null);
  useEffect(() => { setAt(0); setDone([]); }, [role]);
  const finishedAll = at >= quests.length;
  const quest = quests[Math.min(at, quests.length - 1)];
  const finished = !!done[at];
  const complete = () => setDone((d) => { const n = [...d]; n[at] = true; return n; });
  useEffect(() => { if (finished) coach.current?.focus(); }, [finished]);
  return (
    <section className="walkthrough" id="walkthrough" aria-label={`${role === "scout" ? "Scout" : "Buyer"} walkthrough`}>
      <div className="wt-head">
        <div>
          <h2>{role === "scout" ? "Play a scout's first market" : "Play a buyer's first market"}</h2>
          <p>Everything here is a local demo with synthetic teams. Nothing is signed or sent.</p>
        </div>
        <ol className="wt-progress" aria-label="Quests">
          {quests.map((q, i) => (
            <li key={q.title} className={i < at || done[i] ? "done" : i === at ? "current" : ""} aria-current={i === at ? "step" : undefined}>
              <span className="visually-hidden">{q.title}</span>
            </li>
          ))}
        </ol>
      </div>
      {finishedAll ? (
        <div className="wt-finish">
          <h3>{role === "scout" ? "You ran a full scout cycle." : "You ran a full buyer cycle."}</h3>
          <p>{role === "scout" ? "On devnet the same steps use your wallet, a real zkTLS proof and real MPC." : "On devnet the same steps use your wallet, real sealed bids and decryption with your own key."}</p>
          <div className="wt-actions">
            <Link className="button" to={role === "scout" ? "/scout/onboard" : "/markets"}>{role === "scout" ? "Get verified for real" : "Browse live markets"}</Link>
            <button className="button outline" onClick={() => { setAt(0); setDone([]); }}>Play again</button>
          </div>
        </div>
      ) : (
        <div className="wt-body">
          <div className="wt-stage" key={at}>{quest.stage(complete, finished)}</div>
          <div className={`wt-coach ${finished ? "is-done" : ""}`} ref={coach} tabIndex={-1} aria-live="polite">
            <span className="wt-count">Quest {at + 1} of {quests.length}</span>
            <h3>{quest.title}</h3>
            {finished ? (
              <>
                <p className="wt-done-label">What just happened</p>
                <p>{quest.done}</p>
                <button className="button" onClick={() => setAt(at + 1)}>{at + 1 === quests.length ? "Finish" : "Next quest"}</button>
              </>
            ) : <p>{quest.ask}</p>}
            {at > 0 && <button className="wt-back" onClick={() => setAt(at - 1)}>Back</button>}
          </div>
        </div>
      )}
    </section>
  );
}
