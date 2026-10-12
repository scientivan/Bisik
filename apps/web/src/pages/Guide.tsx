import { Link, useSearchParams } from "react-router-dom";
import { Note, PageTitle, Pill } from "../components/ui";
import { Walkthrough } from "../components/walkthrough";
import type { Role } from "../components/roles";

/** What each party sees at a step: the same three access states used across the app. */
type Seen = [state: "sealed" | "yours" | "public", label: string, text: string];
interface GuideStep { title: string; body: string; seen: Seen[]; link: { to: string; label: string } }

const BUYER: GuideStep[] = [
  {
    title: "Read the market-wide preview",
    body: "Each market asks one question, for example which DeFi teams are still choosing a chain. Before you pay, you see how many teams were proposed, how strong the backing is and which tiers of scouts staked. You do not see which team has which backing.",
    seen: [
      ["public", "Public", "Question, number of teams and staked calls, strength groups, supporter tiers"],
      ["sealed", "Sealed", "Team names, reasons and which team each scout backed"],
    ],
    link: { to: "/markets", label: "Browse signals" },
  },
  {
    title: "Bid for exclusivity or buy at a flat price",
    body: "Rival ecosystems place sealed bids for the two exclusive slots. Bids are compared inside Arcium's MPC network, so nobody reads an amount. Winners pay the next-highest bid. Anyone outside the top two can still buy the remaining signals at the flat price.",
    seen: [
      ["sealed", "Sealed", "Every bid amount, including yours, until the auction settles"],
      ["public", "Public", "Reserve price and flat price"],
    ],
    link: { to: "/markets", label: "Pick a market to bid on" },
  },
  {
    title: "Decrypt your own view",
    body: "Your view is encrypted to a key that lives in your browser. Winner #1 reads every signal and may hide some from later buyers; winner #2 reads what is left. Each signal shows the team, how many scouts backed it, their tiers, Veritas checks on the reasons, and the claims you can verify. You may ask a backing scout for an introduction; they can decline.",
    seen: [
      ["yours", "Yours", "The signals you bought, readable only with your key"],
      ["sealed", "Sealed", "Signals another winner hid, and every scout's identity"],
    ],
    link: { to: "/guide?role=buyer#walkthrough", label: "Play this step in the walkthrough" },
  },
  {
    title: "Report what happened",
    body: "During the outcome window you mark the most valuable signal, for example a team that deployed on your chain. 85% of your payment goes to the scouts behind it and 15% to the platform. Your payment is not refunded. If you mark nothing, it goes to the strongest signal you bought. If a verifiable claim turns out false, open a hoax dispute with evidence.",
    seen: [
      ["public", "Public", "Your outcome record and any dispute you open"],
      ["yours", "Yours", "The evidence you attach, stored as a hash onchain"],
    ],
    link: { to: "/markets", label: "Find your markets" },
  },
];

const SCOUT: GuideStep[] = [
  {
    title: "Prove your GitHub record",
    body: "Use a fresh wallet for scouting. Your browser creates a private identity, then a Reclaim zkTLS proof shows your GitHub contribution count. The verifier sees your username for a moment and does not store it. You join a Bronze, Silver or Gold group of at least five scouts.",
    seen: [
      ["public", "Public", "Your tier group and a one-way hash that stops the same account joining twice"],
      ["sealed", "Private", "Your GitHub username and your identity secret, kept on this device"],
    ],
    link: { to: "/scout/onboard", label: "Get verified" },
  },
  {
    title: "Back a team with a reason and a stake",
    body: "Pick up to three teams in a market or propose a new one with a link anyone can check. Write why. Veritas scores how copied or AI-written the reason looks, and a privacy filter removes details that could identify you. Then stake 10 to 500 USDC with a zero-knowledge proof that you belong to your tier group.",
    seen: [
      ["public", "Public", "The stake amount and your tier group"],
      ["sealed", "Sealed", "Which team you backed, and your reason until a buyer pays"],
    ],
    link: { to: "/scout", label: "Browse markets" },
  },
  {
    title: "Claim stake and reward to a fresh address",
    body: "After settlement your stake comes back in full. If a buyer marked a team you backed as most valuable, you share in their payment by stake, early bonus and tier. You claim with a proof, to any new address, so the claim does not point back to the wallet that staked. A wrong call is never punished. Only a proven hoax loses its stake, and that money goes to charity.",
    seen: [
      ["yours", "Yours", "Your positions and payouts, stored on this device"],
      ["public", "Public", "That a position was claimed, not who claimed it"],
    ],
    link: { to: "/scout/positions", label: "Stakes and rewards" },
  },
];

export default function Guide() {
  const [params, setParams] = useSearchParams();
  const role: Role = params.get("role") === "scout" ? "scout" : "buyer";
  const steps = role === "scout" ? SCOUT : BUYER;
  return (
    <>
      <PageTitle title="How to use Bisik">
        Buyers pay for private, stake-backed calls about teams. Scouts sell what they saw without revealing who they are. Pick a side to read the steps, then play them in the walkthrough.
      </PageTitle>
      <div className="guide-switch" role="group" aria-label="Choose a guide">
        {(["buyer", "scout"] as Role[]).map((r) => (
          <button key={r} aria-pressed={role === r} onClick={() => setParams({ role: r }, { replace: true })}>
            {r === "buyer" ? "I want to buy signals" : "I want to sell insights"}
            <small>{r === "buyer" ? "Ecosystems and grant teams" : "Judges, mentors and senior developers"}</small>
          </button>
        ))}
      </div>
      <Walkthrough role={role} />
      <div className="columns">
        <section className="main-column frame" aria-labelledby="guide-steps-title">
          <div className="panel">
            <h2 id="guide-steps-title">{role === "scout" ? "A scout's steps" : "A buyer's steps"}</h2>
            <ol className="guide-steps">
              {steps.map((s, i) => (
                <li className="guide-step" id={`step-${i + 1}`} key={s.title}>
                  <span className="guide-step-num" aria-hidden="true">{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                    <ul aria-label="Who sees what">
                      {s.seen.map(([state, label, text]) => (
                        <li key={text}><Pill state={state}>{label}</Pill><span>{text}</span></li>
                      ))}
                    </ul>
                    <Link className="guide-link" to={s.link.to}>{s.link.label}</Link>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <aside className="side-column">
          <Note title="One wallet, two roles">
            The same wallet can buy and scout, and your profile keeps the two apart. We still recommend a separate wallet for scouting, because a buyer wallet is known to the operator.
            <Link to="/profile">Open your profile</Link>
          </Note>
          <Note title="What the operator can see">
            The operator verifies buyers, reads reasons to score them and decides hoax disputes. It never sees your team pick or bid amount in plaintext.
          </Note>
        </aside>
      </div>
    </>
  );
}
