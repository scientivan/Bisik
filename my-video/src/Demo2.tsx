import React from "react";
import { AbsoluteFill, Audio, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import vo from "../public/vo/vo.json";
import whites from "../public/rec/whites.json";
import { BlurWords, Callout, Caption, GridBg } from "./components";
import { TakeClip, clipFrames, type Ev } from "./take";
import { C, FONT, FPS } from "./theme";

import b1 from "../public/rec/b1-buyer.events.json";
import b2 from "../public/rec/b2-operator.events.json";
import s1 from "../public/rec/s1-scout.events.json";
import b6 from "../public/rec/b6-preview-bid.events.json";
import b7 from "../public/rec/b7-rival-bid.events.json";
import b8 from "../public/rec/b8-winner.events.json";
import s4 from "../public/rec/s4-intro.events.json";
import s5 from "../public/rec/s5-claim.events.json";
import b9 from "../public/rec/b9-second.events.json";
import b10 from "../public/rec/b10-flat.events.json";
import o1 from "../public/rec/o1-outcome.events.json";
import o2 from "../public/rec/o2-oracle.events.json";

const LOGS: Record<string, Ev[]> = {
  "b1-buyer": b1.events as Ev[],
  "b2-operator": b2.events as Ev[],
  "s1-scout": s1.events as Ev[],
  "b6-preview-bid": b6.events as Ev[],
  "b7-rival-bid": b7.events as Ev[],
  "b8-winner": b8.events as Ev[],
  "s4-intro": s4.events as Ev[],
  "s5-claim": s5.events as Ev[],
  "b9-second": b9.events as Ev[],
  "b10-flat": b10.events as Ev[],
  "o1-outcome": o1.events as Ev[],
  "o2-oracle": o2.events as Ev[],
};

type Role = "Buyer" | "Operator" | "Scout";
type Shot = {
  id: string;
  role: Role;
  take: string;
  from: number;
  to: number;
  caption: string;
  callout?: { label: string; text: string };
  /** extra seconds kept after the last event of the shot */
  hold?: number;
  rate?: number;
};

export const SHOTS: Shot[] = [
  { id: "B1", role: "Buyer", take: "b1-buyer", from: 2.0, to: 4.8, caption: "A buyer, say an ecosystem team, connects a wallet." },
  { id: "B1b", role: "Buyer", take: "b1-buyer", from: 30.0, to: 31.0, hold: 1.2, caption: "Auction rounds stay locked until the buyer is verified." },
  { id: "B2", role: "Operator", take: "b2-operator", from: 2.8, to: 13.0, hold: 1.0, caption: "Today the operator verifies buyers. One transaction writes a buyer profile onchain.", callout: { label: "Solana program", text: "BuyerProfile account, verified flag" } },
  { id: "B4", role: "Buyer", take: "b1-buyer", from: 49.0, to: 64.6, caption: "Exclusive: one buyer funds the pool now. Auction round: rival buyers bid for exclusivity. The buyer picks auction, sets a reserve and a flat price." },
  { id: "B4b", role: "Buyer", take: "b1-buyer", from: 85.0, to: 86.8, caption: "Creating the round also initialises its encrypted state on Arcium.", callout: { label: "Arcium MPC", text: "Encrypted market state, created with the round" } },
  { id: "B5", role: "Buyer", take: "b1-buyer", from: 88.3, to: 95.0, hold: 0.5, caption: "The round is live. Windows and prices are public. Who backs which team is not." },
  { id: "S1", role: "Scout", take: "s1-scout", from: 3.4, to: 15.5, caption: "A scout creates a private identity in the browser. Only its commitment is public. Reclaim zkTLS proves the GitHub record.", callout: { label: "Semaphore + Reclaim", text: "Only a tier and a nullifier go onchain" } },
  { id: "S1b", role: "Scout", take: "s1-scout", from: 20.2, to: 21.0, hold: 1.0, caption: "Gold tier, assigned through the operator demo path for this recording." },
  { id: "S2", role: "Scout", take: "s1-scout", from: 26.5, to: 38.9, caption: "The scout adds a team as a sealed option and explains why." },
  { id: "S2b", role: "Scout", take: "s1-scout", from: 55.0, to: 55.6, hold: 2.0, caption: "Veritas scores the reason before any money moves. Flags only, never grounds for slashing.", callout: { label: "Veritas", text: "Duplicate risk and verifiable claims" } },
  { id: "S3", role: "Scout", take: "s1-scout", from: 59.4, to: 62.8, hold: 1.0, caption: "Seal and stake. A Semaphore proof made in the browser, the team choice encrypted for Arcium.", callout: { label: "Groth16 on Solana", text: "Proof verified by the Bisik program" } },
  { id: "S3x", role: "Scout", take: "s1-scout", from: 68.6, to: 69.2, hold: 2.0, caption: "Final on devnet. About 130 thousand compute units, proof check included." },
  { id: "B6", role: "Buyer", take: "b6-preview-bid", from: 9.0, to: 9.8, hold: 2.2, caption: "Skip to the end of scouting. Arcium aggregates the sealed calls. Buyers see only signal strength, no team names.", callout: { label: "Arcium callback", text: "Preview computed over encrypted stakes" } },
  { id: "B7", role: "Buyer", take: "b6-preview-bid", from: 12.6, to: 17.4, caption: "The buyer bids. The ceiling deposit is public, the bid itself is encrypted." },
  { id: "B7b", role: "Buyer", take: "b6-preview-bid", from: 22.5, to: 22.8, hold: 1.0, caption: "Deposit locked, bid sealed." },
  { id: "B7c", role: "Buyer", take: "b7-rival-bid", from: 9.5, to: 14.3, caption: "A rival buyer bids too. Arcium compares the bids without anyone seeing them." },
  { id: "B8", role: "Buyer", take: "b8-winner", from: 11.8, to: 12.9, hold: 1.2, caption: "Second price. The winner pays the runner-up's bid, and the unused deposit comes back." },
  { id: "B8b", role: "Buyer", take: "b8-winner", from: 72.6, to: 73.4, caption: "The winner decrypts its view locally, with its own key." },
  { id: "B8c", role: "Buyer", take: "b8-winner", from: 81.8, to: 92.4, hold: 0.6, caption: "It hides one signal from every later buyer.", callout: { label: "Solana program", text: "select_hidden, enforced onchain" } },
  { id: "B9", role: "Buyer", take: "b9-second", from: 19.6, to: 23.2, hold: 0.8, caption: "The runner-up picks from what is left. The signal the winner hid is already gone from its view." },
  { id: "B10", role: "Buyer", take: "b10-flat", from: 11.0, to: 12.6, caption: "A third buyer skips the auction and pays the flat price." },
  { id: "B10b", role: "Buyer", take: "b10-flat", from: 22.4, to: 25.0, hold: 1.5, caption: "It gets only the remainder. Both hidden signals stay hidden.", callout: { label: "Arcium + Solana", text: "Allocation decided over encrypted state" } },
  { id: "B11", role: "Buyer", take: "b8-winner", from: 96.2, to: 97.0, hold: 2.2, caption: "Reasons arrive filtered for privacy, with verifiable claims separated from opinion." },
  { id: "B12", role: "Buyer", take: "b8-winner", from: 102.4, to: 104.0, hold: 0.8, caption: "The buyer asks the scout for an introduction." },
  { id: "S4", role: "Scout", take: "s4-intro", from: 10.2, to: 16.6, hold: 1.0, caption: "The scout accepts. The contact is encrypted to that buyer only, bound to the position by a fresh proof." },
  { id: "O1", role: "Buyer", take: "o1-outcome", from: 22.2, to: 27.2, hold: 1.0, caption: "When the team delivers, the buyer marks the most valuable signal. Only a hash of the evidence goes onchain." },
  { id: "O2", role: "Operator", take: "o2-oracle", from: 10.6, to: 11.4, hold: 3.0, caption: "Every outcome is public: who signed and the evidence hash. Next, an open network of staked verifiers with secret votes.", callout: { label: "Outcome oracle", text: "v1 operator and buyers sign; v2 open verifiers" } },
  { id: "S5", role: "Scout", take: "s5-claim", from: 10.2, to: 13.8, hold: 2.2, caption: "After settlement the scout claims stake and reward to a fresh address. A nullifier proof, no link to the staking wallet.", callout: { label: "Nullifier claim", text: "10 USDC stake + 77.68 USDC reward" } },
];

const RATE = 1.25;

/** Last clean second of a take: before its first white page-load frame and its final end mark. */
function safeEnd(take: string, after: number) {
  const w = (whites as Record<string, { white: number[][]; dur: number }>)[take];
  const ends = LOGS[take].filter((e) => e.kind === "mark" && / end$/.test(e.label)).map((e) => e.t);
  // The recorder leaves the page right after its last action, so stop shortly after that action too.
  const acts = LOGS[take].filter((e) => e.kind !== "mark" && e.kind !== "cut").map((e) => e.t);
  let lim = Math.min(w.dur - 0.2, ends.length ? Math.max(...ends) : w.dur, Math.max(...acts) + 1.2);
  for (const [a] of w.white) if (a > after && a < lim) lim = a;
  return lim;
}
const PAD_BEFORE = 0.6;
const PAD_AFTER = 0.8;

/** Keeps the seconds around each interaction and drops the waits between them. */
function segments(s: Shot): number[][] {
  const evs = LOGS[s.take].filter(
    (e) => e.t >= s.from && e.t <= s.to && ["point", "click", "typed", "result"].includes(e.kind),
  );
  const raw: number[][] = evs.map((e) => [Math.max(s.from, e.t - PAD_BEFORE), e.t + PAD_AFTER]);
  if (!raw.length) raw.push([s.from, s.to]);
  raw[raw.length - 1][1] += s.hold ?? 0;
  const out: number[][] = [];
  for (const r of raw) {
    const last = out[out.length - 1];
    if (last && r[0] - last[1] < 0.9) last[1] = Math.max(last[1], r[1]);
    else out.push([...r]);
  }
  // Never play into a white page load: clip at the take's last clean second.
  const lim = safeEnd(s.take, s.from);
  for (const seg of out) seg[1] = Math.min(seg[1], lim);
  // The shot lasts at least as long as its voice-over line plus a short breath.
  const need = ((vo.durations as Record<string, number>)[s.id] ?? s.caption.split(" ").length / 2.5) + 0.35;
  const have = out.reduce((a, [f, t]) => a + (t - f), 0) / (s.rate ?? RATE);
  if (need > have) {
    const last = out[out.length - 1];
    const room = Math.max(0, lim - last[1]);
    const play = Math.min(room, (need - have) * (s.rate ?? RATE));
    last[1] += play;
    const rest = need - have - play / (s.rate ?? RATE);
    if (rest > 0.05) out.push([last[1] - 0.1, last[1] - 0.1 + rest * (s.rate ?? RATE), 1]);
  }
  return out;
}

const shotFrames = (s: Shot) => segments(s).reduce((a, [f, t]) => a + clipFrames(f, t, s.rate ?? RATE), 0);

const RolePill: React.FC<{ role: Role }> = ({ role }) => (
  <div
    style={{
      position: "absolute",
      left: 60,
      top: 22,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 24,
      color: C.white,
      background: role === "Scout" ? C.ink : C.blue,
      border: `2px solid ${C.blue}`,
      borderRadius: 999,
      padding: "6px 18px",
    }}
  >
    {role}
  </div>
);

const ShotView: React.FC<{ s: Shot }> = ({ s }) => {
  const segs = segments(s);
  const rate = s.rate ?? RATE;
  return (
    <AbsoluteFill>
      <Series>
        {segs.map(([f, t, fr], i) => (
          <Series.Sequence key={i} durationInFrames={clipFrames(f, t, rate)}>
            <TakeClip take={s.take} events={LOGS[s.take]} from={f} to={t} rate={rate} freeze={!!fr} />
          </Series.Sequence>
        ))}
      </Series>
      <Audio src={staticFile(`vo/${s.id}.mp3`)} />
      <RolePill role={s.role} />
      <Caption text={s.caption} bottom />
      {s.callout && <Callout {...s.callout} delay={8} />}
    </AbsoluteFill>
  );
};

const Title: React.FC<{ text: string; accent: string[]; sub?: string }> = ({ text, accent, sub }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <GridBg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 24 }}>
        <BlurWords text={text} accent={accent} size={96} color={C.white} accentColor={C.blueSoft} />
        {sub && (
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 32, color: C.mute }}>{sub}</div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const INTRO = Math.round(1.6 * FPS);
const OUTRO = Math.round(Math.max(3.5, ((vo.durations as Record<string, number>).END ?? 3) + 0.5) * FPS);
export const DEMO2_FRAMES = INTRO + SHOTS.reduce((a, s) => a + shotFrames(s), 0) + OUTRO;
export const SHOT_TIMES = SHOTS.map((s) => [s.id, shotFrames(s) / FPS] as const);

export const Demo2: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={INTRO}>
      <Title text="Bisik product demo" accent={["demo"]} sub="Solana devnet · mock USDC · synthetic teams" />
    </Series.Sequence>
    {SHOTS.map((s) => (
      <Series.Sequence key={s.id} durationInFrames={shotFrames(s)}>
        <ShotView s={s} />
      </Series.Sequence>
    ))}
    <Series.Sequence durationInFrames={OUTRO}>
      <Title text="Private calls. Sealed bids. Anonymous payouts." accent={["Sealed", "Anonymous"]} sub="Bisik, settled on Solana" />
      <Audio src={staticFile("vo/END.mp3")} />
    </Series.Sequence>
  </Series>
);
