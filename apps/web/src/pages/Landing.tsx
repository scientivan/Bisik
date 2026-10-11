import { useFullscreenHero } from "../lib/motion";
import { Link } from "react-router-dom";
import {
  Frame,
  Hatch,
  Header,
  Icon,
  Mark,
  Note,
  Pill,
  Sonogram,
  StrengthBars,
} from "../components/ui";
export default function Landing() {
  useFullscreenHero();
  return (
    <>
      <div className="landing-opening">
        <Header landing />
        <section className="hero" id="top">
          <Sonogram />
          <div className="hero-reveal">
            <Sonogram variant="revealed" seed={31} speed={80} />
            <Pill state="yours">
              <Icon name="lock" />
              Decrypted for Ecosystem A (demo)
            </Pill>
          </div>
          <div className="hero-copy">
            <h1>
              Insiders whisper.
              <br />
              Buyers pay to listen.
            </h1>
            <p className="lead">
              Bisik is a private signal market on Solana. Insiders stake behind
              a call and say why. Buyers bid to read the aggregate. Who said
              what stays sealed onchain.
            </p>
            <div className="row">
              <Link className="button bone" to="/markets">
                Open the app <Icon />
              </Link>
              <a className="button on-blue-outline" href="#mechanism">
                See the mechanism
              </a>
            </div>
            <p className="context">
              Live on Solana devnet with Arcium MPC. The first use case is
              ecosystems sourcing builder teams before they pick a chain.
            </p>
          </div>
          <div className="hero-rail">
            {[
              ["Open", "scouts stake"],
              ["Closed", "folded in MPC"],
              ["Auction", "sealed bids"],
              ["Allocated", "yours to read"],
              ["Settled", "claim anywhere"],
            ].map(([stage, what]) => (
              <span
                className={stage === "Allocated" ? "allocated" : ""}
                key={stage}
              >
                <strong>{stage}</strong>
                {what}
              </span>
            ))}
          </div>
        </section>
      </div>
      <main id="main">
        <div className="container">
          <section className="landing-section mechanism-layout" id="mechanism">
            <div className="section-heading">
              <h2>
                Three secrets,
                <br />
                kept apart.
              </h2>
              <p>
                Who you are, what you picked and what you bid never sit in the
                same place onchain. Identity is a zero-knowledge proof. Picks
                and bids are ciphertext that only MPC can add up.
              </p>
              <div className="row">
                <Pill state="sealed">Sealed</Pill>
                <Pill state="yours">Yours</Pill>
                <Pill>Public</Pill>
              </div>
            </div>
            <Frame>
              <div className="row between">
                <strong>Position in market 3</strong>
                <span className="fine">Synthetic example</span>
              </div>
              {[
                ["Scout", "", "sealed"],
                ["Tier group", "Tier 2, seven members", "public"],
                ["Team backed", "", "sealed"],
                ["Stake", "100 USDC", "public"],
                ["Reason", "Picks a chain within 14 days. Two rivals already pitched them.", "yours"],
                ["Nullifier", "0x2c91…e07a", "public"],
              ].map(([field, value, state]) => (
                <div className="list-row" key={field}>
                  <strong>{field}</strong>
                  {value ? (
                    <span>{value}</span>
                  ) : (
                    <Hatch reason={field === "Scout" ? "Nobody learns who placed this stake. The scout proves they belong to a tier group with a zero-knowledge proof, so the chain never sees a name or wallet tied to them." : "The team this scout backs is encrypted for the Arcium MPC network. Not even the operator can read it, so other scouts and buyers cannot copy the call."} />
                  )}
                  <Pill state={state}>
                    {state === "sealed"
                      ? "Sealed"
                      : state === "yours"
                        ? "Yours"
                        : "Public"}
                  </Pill>
                </div>
              ))}
            </Frame>
          </section>
          <section className="landing-section" id="why">
            <div className="section-heading">
              <h2>Why not just search for it?</h2>
              <p>
                Anything you can find online is already priced in. Bisik sells
                what insiders saw in the room, before it reaches the internet,
                with money behind each call.
              </p>
            </div>
            <div className="why-grid">
              <Frame
                title="Facts that never get posted"
                body="Decision deadlines, unsigned offers, private user numbers and what a team needs to commit. Mentors and judges hear these in person."
              >
                <div className="list-row">
                  <span>GitHub stars, funding news</span>
                  <Pill>Public</Pill>
                </div>
                <div className="list-row">
                  <span>“Picks a chain within 14 days”</span>
                  <Pill state="yours">Insider</Pill>
                </div>
              </Frame>
              <Frame
                title="You hear it first"
                body="A signal is worth most before rivals know it. The winning buyer can hide up to three signals from every other buyer."
              >
                <div className="list-row">
                  <span>Rival ecosystems</span>
                  <Hatch seed={9} reason="The exclusive buyer hid this signal. Other ecosystems cannot open it, so they cannot race you for the team." />
                </div>
                <div className="list-row">
                  <span>You, the winning buyer</span>
                  <Pill state="yours">Readable</Pill>
                </div>
              </Frame>
              <Frame
                title="Judgement with money on it"
                body="Each call carries a refundable stake. Gossip is free to post. A staked call costs the scout if it turns out to be a hoax."
              >
                <div className="list-row">
                  <span>Behind Team Lumen</span>
                  <strong>3 scouts, 450 USDC</strong>
                </div>
                <div className="list-row">
                  <span>Proven hoax</span>
                  <strong>Stake goes to charity</strong>
                </div>
              </Frame>
            </div>
            <Note dark title="Scouts sell what they saw and what they think, never a team’s private documents.">
              A scout reports their own observation, such as what a founder
              said in a mentoring session, and their judgement of it. Sharing a
              team’s files, contracts or data rooms breaks Bisik’s rules, and teams can
              opt in to take a 5% share of what buyers pay.
            </Note>
          </section>
          <section className="landing-section" id="parts">
            <div className="section-heading">
              <h2>Four parts, one market.</h2>
              <p>
                Each part removes one thing you would otherwise have to trust.
                None of them sees the whole picture alone.
              </p>
            </div>
            <div className="parts-grid">
              <Frame
                title="Reclaim zkTLS"
                body="Proves a GitHub record. The server checks it offchain, and only a tier and a nullifier go onchain."
              >
                <div className="list-row">
                  <strong>GitHub record verified</strong>
                  <Pill state="blue">Tier 2</Pill>
                </div>
                <div className="list-row">
                  <span>Username onchain</span>
                  <strong>Never</strong>
                </div>
              </Frame>
              <Frame
                title="Semaphore groups"
                body="You stake as one member of a tier group. The proof says you belong, without naming you."
              >
                <div className="members">
                  {Array.from({ length: 7 }, (_, i) => (
                    <span
                      className="member"
                      key={i}
                      style={{ animationDelay: `${i * 0.6}s` }}
                    >
                      ?
                    </span>
                  ))}
                </div>
                <p>One of these seven staked. The proof does not say which.</p>
              </Frame>
              <Frame
                title="Arcium MPC"
                body="Adds encrypted stakes, resolves sealed bids and encrypts each buyer’s weights to their own key."
              >
                <div className="list-row">
                  <span>Stakes in</span>
                  <Hatch seed={3} reason="Each stake reaches MPC encrypted. The nodes add the stakes together without ever seeing which team a single scout picked." />
                </div>
                <div className="list-row">
                  <span>Your weight out</span>
                  <Pill state="yours">Team Lumen 0.44</Pill>
                </div>
              </Frame>
              <Frame
                title="Veritas"
                body="Scores reasons, separates claims from opinions and removes details that could identify the scout."
              >
                <div className="stack">
                  <p>
                    They pick a chain within 14 days.{" "}
                    <del>I mentored them at Superteam Jakarta.</del>
                  </p>
                  <div className="row">
                    <Pill state="blue">Identifying detail removed</Pill>
                    <Pill>2 verifiable claims</Pill>
                  </div>
                </div>
              </Frame>
            </div>
          </section>
          <section className="landing-section mechanism-layout">
            <div className="section-heading">
              <h2>Not a prediction market.</h2>
              <p>
                You are buying judgement, not betting against another scout.
                Stakes come back. Rewards come from buyers.
              </p>
            </div>
            <Frame>
              {[
                [
                  "Wrong calls are never slashed",
                  "Only a proven hoax loses its stake, and that stake goes to charity.",
                ],
                [
                  "Exclusivity has a price floor",
                  "The auction keeps the top three bids and reveals two winners at second price.",
                ],
                [
                  "Each buyer has their own view",
                  "Only allocated options can be read. Weights are encrypted to the buyer’s key.",
                ],
                [
                  "Reputation stays encrypted",
                  "Track records are credited inside MPC. Coarse levels are revealed for epoch tiers.",
                ],
                [
                  "Three slots per market",
                  "Each proof is scoped to one market and slot. A used slot cannot be staked again.",
                ],
              ].map(([title, body]) => (
                <div className="list-row" key={title}>
                  <span className="icon-tile">
                    <Icon name="check" />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p className="fine">{body}</p>
                  </div>
                </div>
              ))}
            </Frame>
          </section>
          <section className="landing-section" id="payouts">
            <div
              className="section-heading"
              style={{ textAlign: "center", marginInline: "auto" }}
            >
              <h2>Who gets paid, and when.</h2>
              <p>Buyer payments fund the rewards. The stake is separate.</p>
            </div>
            <div className="pay-grid">
              <div className="pay-card pay-main">
                <div className="row between">
                  <span className="big">80%</span>
                  <Pill state="yours">Scouts</Pill>
                </div>
                <div className="split-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <p>
                  Of each buyer payment goes to the scouts behind the successful
                  options. It is 85% when no team takes a share.
                </p>
                <Sonogram variant="pay" seed={43} speed={90} />
              </div>
              <div className="pay-card">
                <div className="row between">
                  <span className="big">15%</span>
                  <Pill state="sealed">Platform</Pill>
                </div>
                <p>Keeps the market running.</p>
              </div>
              <div className="pay-card">
                <div className="row between">
                  <span className="big">5%</span>
                  <Pill state="blue">Team</Pill>
                </div>
                <p>For a successful team that opted in.</p>
              </div>
              <div className="pay-card pay-stake">
                <span className="big">100%</span>
                <p>Stake returns after settlement, unless a hoax is proven.</p>
              </div>
              <Note dark title="Buyer payments are not refunded.">
                If a buyer reports no successful option, their reward pool goes
                to the strongest signal they bought. A wrong call alone is never
                grounds for slashing.
              </Note>
            </div>
            <div className="stack-chips" style={{ marginTop: 16 }}>
              {[
                ["Solana", "program and escrow"],
                ["Arcium", "MPC cluster 456"],
                ["Reclaim", "zkTLS proofs"],
                ["Semaphore", "anonymous groups"],
              ].map(([name, role]) => (
                <span key={name}>
                  <strong>{name}</strong>
                  <small>{role}</small>
                </span>
              ))}
            </div>
          </section>
          <section className="landing-section" id="flow">
            <div className="section-heading">
              <h2>
                One market,
                <br />
                start to finish.
              </h2>
              <p>The secrets stay sealed while the market does its work.</p>
            </div>
            <div className="stack">
              <div className="flow-hero">
                <Sonogram variant="dark" seed={71} speed={90} />
                <div>
                  <h3>Stake in the dark.</h3>
                  <p>
                    Pick an option, explain your call and prove group membership
                    on your device.
                  </p>
                </div>
                <div>
                  <Link className="button bone" to="/scout/onboard">
                    Try the stake flow <Icon />
                  </Link>
                </div>
              </div>
              <div className="flow-grid">
                <Frame
                  title="Fold and bid"
                  body="MPC folds the stakes. Buyers see a market-wide preview, then seal their bids."
                >
                  <StrengthBars strong={2} medium={0} weak={1} />
                  <div className="list-row">
                    <span>Bid amount</span>
                    <Hatch seed={5} reason="Bids are sealed so rival buyers cannot see or outbid each other’s number. MPC compares them and reveals only the winners and the second price." />
                  </div>
                </Frame>
                <Frame
                  title="Pick and decrypt"
                  body="Winners choose in order. Each buyer reads only their allocated signals."
                >
                  <div className="list-row">
                    <span>Option 1</span>
                    <Pill state="yours">Yours</Pill>
                  </div>
                  <div className="list-row">
                    <span>Option 2</span>
                    <Pill state="sealed">Hidden</Pill>
                  </div>
                </Frame>
                <Frame
                  title="Report and claim"
                  body="Buyers report outcomes. Scouts claim stake and rewards to a fresh address."
                >
                  <div className="list-row">
                    <strong>Claimed on devnet</strong>
                    <Pill state="public">Market 3</Pill>
                  </div>
                  <h3 style={{ fontSize: 40, marginTop: 20 }}>213.58 USDC</h3>
                </Frame>
              </div>
            </div>
          </section>
          <section className="landing-section" id="source">
            <div className="section-heading">
              <h2>Check it yourself.</h2>
              <p>
                The program, compiled circuits and implementation are available
                to inspect.
              </p>
            </div>
            <div className="source-grid">
              {[
                [
                  "Solana Explorer",
                  "The program running on devnet.",
                  "https://explorer.solana.com/address/aFNfbxfgBuQ6tr5qXDpTmTWrQ8hjLGYNEtdp2L7HjvD?cluster=devnet",
                  "aFNfbxfg…tdp2L7HjvD",
                ],
                [
                  "bisik-circuits",
                  "Compiled circuits, hash-checked by the Arx nodes.",
                  "https://github.com/scientivan/bisik-circuits",
                  "scientivan/bisik-circuits",
                ],
                [
                  "GitHub",
                  "Program, server and tests. Public at submission.",
                  "https://github.com/scientivan/Bisik",
                  "scientivan/Bisik",
                ],
              ].map(([name, what, url, ref]) => (
                <a
                  className="source-card"
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <h3>
                    {name}
                    <Icon name="external" />
                  </h3>
                  <p>{what}</p>
                  <small>{ref}</small>
                </a>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Note title="Not audited">
                This is a hackathon build. The operator sees a GitHub username
                briefly while verifying it, reads reasons to score them, and
                decides hoax disputes. Stake-wallet funding is traceable. All
                trust assumptions are in the README.
              </Note>
            </div>
          </section>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <Link className="wordmark" to="/">
            <Mark />
            bisik
          </Link>
          <span>
            Built for the Colosseum Crypto World’s Fair. Illustrative data on
            this page is synthetic.
          </span>
          <a href="#top">Back to top</a>
        </div>
      </footer>
    </>
  );
}
