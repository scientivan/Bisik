import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./theme";

// Pitch video. Rules and reasoning: PITCH-VIDEO-GUIDE.md. Scene list: PITCH-TRACKER.md.

/** Bisik product palette (apps/web/src/styles.css, light theme). */
const P = {
  bone: "#F7F7F7", // page
  sheet: "#FFFFFF", // cards
  frame: "#EDEDED", // card frames, grid lines
  rule: "#D9D9D9",
  ink: "#0F0F0F",
  accent: "#1E1E1E", // solid dark panels and buttons
  inkSoft: "#555555",
  amber: "#FFB547", // money, and things that need you now
  lavender: "#BBA9F5", // explanations, highlights
  lavenderPanel: "#E4DDFF",
};

/** Bottom-right slot kept free for Dien's face video. */
const FACE = { size: 320, margin: 40 };

const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const pop = (f: number, at: number) => spring({ frame: f - at, fps: 30, config: { damping: 200 } });

const Bg: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: P.bone,
      backgroundImage: `linear-gradient(${P.frame} 1px, transparent 1px), linear-gradient(90deg, ${P.frame} 1px, transparent 1px)`,
      backgroundSize: "32px 32px",
    }}
  />
);

/** Subtitle: Dien's spoken line, one full sentence at a time (to the full stop), bottom-left, clear of the face frame.
 * Each sentence stays on screen for a share of the scene equal to its share of the words. */
const Sub: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const sentences = text.match(/[^.?!]+[.?!]+/g)?.map((x) => x.trim()) ?? [text];
  const counts = sentences.map((x) => x.split(" ").length);
  const total = counts.reduce((a, b) => a + b, 0);
  const span = d - 10;
  let i = 0;
  for (let acc = 0; i < sentences.length - 1; i++) {
    acc += (counts[i] / total) * span;
    if (f - 4 < acc) break;
  }
  return (
    <div style={{ position: "absolute", left: 200, right: 440, bottom: 56, display: "flex", alignItems: "flex-end", opacity: ease(f, 4, 10) }}>
      <div style={{ background: P.accent, color: P.sheet, fontFamily: FONT, fontWeight: 600, fontSize: 34, lineHeight: 1.3, borderRadius: 14, padding: "12px 22px" }}>{sentences[i]}</div>
    </div>
  );
};

/** Scene in/out: short fade, no blur gimmick. Every scene carries its subtitle. */
const Scene: React.FC<{ sub: string; children: React.ReactNode }> = ({ sub, children }) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: Math.min(ease(f, 0, 8), 1 - ease(f, d - 8, d)) }}>
      {children}
      <Sub text={sub} />
    </AbsoluteFill>
  );
};

const Line: React.FC<{ at: number; children: React.ReactNode; size?: number; color?: string }> = ({ at, children, size = 56, color = P.ink }) => {
  const f = useCurrentFrame();
  const t = ease(f, at, at + 16);
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 700, color, letterSpacing: -size * 0.02, lineHeight: 1.15, opacity: t, transform: `translateY(${(1 - t) * 14}px)` }}>
      {children}
    </div>
  );
};

const Source: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  return <div style={{ position: "absolute", left: 64, top: 48, fontFamily: FONT, fontWeight: 500, fontSize: 20, color: P.inkSoft, opacity: ease(f, 20, 34) }}>{text}</div>;
};

/** Chain logo on a white tile (logos: public/logos, from @web3icons/core). */
const Logo: React.FC<{ name: string; size?: number; style?: React.CSSProperties }> = ({ name, size = 112, style }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 6px 18px rgba(15,15,15,0.08)", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
    <Img src={staticFile(`logos/${name}.svg`)} style={{ width: size * 0.6, height: size * 0.6 }} />
  </div>
);

/** A builder team drawn as a card of three people, no words needed. */
const TeamCard: React.FC<{ badge?: React.ReactNode; scale?: number }> = ({ badge, scale = 1 }) => (
  <div style={{ position: "relative", padding: 8, borderRadius: 24, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 10px 30px rgba(15,15,15,0.10)", transform: `scale(${scale})` }}>
    <div style={{ width: 220, height: 150, borderRadius: 16, background: P.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={52} height={64} viewBox="0 0 52 64">
          <circle cx={26} cy={18} r={14} fill={i === 1 ? P.lavender : P.bone} />
          <path d="M2 64c0-15 11-26 24-26s24 11 24 26z" fill={i === 1 ? P.lavender : P.bone} />
        </svg>
      ))}
    </div>
    {badge}
  </div>
);

/** P1: Base pays $100,000 into one team, and the team gets Base as its only chain. */
const P1: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.round(100000 * ease(f, 30, 62));
  const flow = ease(f, 18, 50);
  const lock = pop(f, 64);
  return (
    <Scene sub="Base invests a hundred thousand dollars in a team, if that team builds on Base.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 300, display: "flex", alignItems: "center" }}>
        <div style={{ opacity: pop(f, 2) }}>
          <Logo name="base" size={180} />
        </div>
        {/* money path: an amber line fills left to right, the amount rides on it */}
        <div style={{ position: "relative", width: 560, height: 180, margin: "0 28px" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 88, height: 6, borderRadius: 3, background: P.frame }} />
          <div style={{ position: "absolute", left: 0, top: 88, height: 6, borderRadius: 3, width: `${flow * 100}%`, background: P.amber }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 76, letterSpacing: -2, color: P.ink, fontVariantNumeric: "tabular-nums", opacity: ease(f, 28, 36) }}>
            ${n.toLocaleString("en-US")}
          </div>
        </div>
        <div style={{ opacity: pop(f, 10) }}>
          <TeamCard
            badge={
              <div style={{ position: "absolute", right: -26, top: -26, transform: `scale(${lock})`, opacity: lock }}>
                <Logo name="base" size={72} style={{ borderRadius: 999, border: `3px solid ${P.amber}` }} />
              </div>
            }
          />
        </div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 600 }}>
        <Line at={70} size={52}>Base Batches backs a team only if it builds on Base.</Line>
      </div>
      <Source text="Source: docs.base.org, Base Batches" />
    </Scene>
  );
};

const NODES = [
  { t: "solana", a: -150 },
  { t: "base", a: -30 },
  { t: "arbitrum", a: 150 },
  { t: "tempo", a: 30 },
];

/** P2: four ecosystems reach for the same team at the same time. */
const P2: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 770, cy = 420, r = 430;
  const at = (a: number) => ({ x: cx + r * Math.cos((a * Math.PI) / 180), y: cy + r * 0.6 * Math.sin((a * Math.PI) / 180) });
  return (
    <Scene sub="Every ecosystem is chasing the same builders.">
      <Bg />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {NODES.map((n, i) => {
          const { x, y } = at(n.a);
          const p = ease(f, 18 + i * 3, 50 + i * 3);
          return <line key={n.t} x1={x} y1={y} x2={x + (cx - x) * p} y2={y + (cy - y) * p} stroke={P.ink} strokeWidth={3} strokeDasharray="10 8" />;
        })}
      </svg>
      {NODES.map((n, i) => {
        const { x, y } = at(n.a);
        const s = pop(f, 6 + i * 3);
        return (
          <div key={n.t} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.85 + 0.15 * s})`, opacity: s }}>
            <Logo name={n.t} size={120} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)", opacity: pop(f, 2) }}>
        <TeamCard scale={1 + 0.04 * ease(f, 50, 62) - 0.04 * ease(f, 62, 74)} />
      </div>
      <div style={{ position: "absolute", left: 200, top: 760 }}>
        <Line at={58} size={64}>Every ecosystem is chasing the same teams.</Line>
      </div>
    </Scene>
  );
};

/** One person (scout, mentor, referrer) on a small tile. */
const Person: React.FC<{ size?: number; color?: string }> = ({ size = 120, color = P.lavender }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: P.accent, display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
    <svg width={size * 0.62} height={size * 0.8} viewBox="0 0 52 64">
      <circle cx={26} cy={20} r={14} fill={color} />
      <path d="M0 66c0-16 12-28 26-28s26 12 26 28z" fill={color} />
    </svg>
  </div>
);

/** P3: a team trained by MegaETH leaves for another chain. */
const P3: React.FC = () => {
  const f = useCurrentFrame();
  const move = ease(f, 40, 80);
  const swap = ease(f, 70, 82);
  return (
    <Scene sub="MegaETH even closed its accelerator, because the teams it trained shipped somewhere else.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 250, display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ opacity: pop(f, 2) }}>
          <Logo name="megaeth" size={160} />
        </div>
        <div style={{ position: "relative", width: 700, height: 220, marginLeft: 40 }}>
          <div style={{ position: "absolute", left: 0, right: 140, top: 108, borderTop: `3px dashed ${P.rule}`, opacity: ease(f, 30, 40) }} />
          <div style={{ position: "absolute", top: 18, left: 20 + move * 400, opacity: pop(f, 8) }}>
            <TeamCard
              badge={
                <div style={{ position: "absolute", right: -24, top: -24 }}>
                  <div style={{ position: "absolute", opacity: 1 - swap }}><Logo name="megaeth" size={64} style={{ borderRadius: 999 }} /></div>
                  <div style={{ opacity: swap, transform: `scale(${0.6 + 0.4 * swap})` }}><div style={{ width: 64, height: 64, borderRadius: 999, background: P.sheet, border: `3px dashed ${P.inkSoft}` }} /></div>
                </div>
              }
            />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 560, width: 1200 }}>
        <Line at={86} size={52}>MegaETH closed its accelerator.</Line>
        <Line at={96} size={36} color={P.inkSoft}>"Very little of that value has trickled to Mega."</Line>
      </div>
      <Source text="Source: Crypto Briefing, July 2026" />
    </Scene>
  );
};

/** P4: ecosystems already pay outsiders for intros that land. Two payout rows. */
const PAYERS = [
  { logo: "avalanche", amount: "$100 to $10,000", per: "per project" },
  { logo: "metis", amount: "$200 to $4,000", per: "per integration" },
];
const P4: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Scene sub="So ecosystems already pay outsiders for intros. Avalanche pays up to ten thousand dollars per project, Metis up to four thousand.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 170, display: "flex", flexDirection: "column", gap: 70 }}>
        {PAYERS.map((r, i) => {
          const d = i * 30;
          const fill = ease(f, 14 + d, 44 + d);
          return (
            <div key={r.logo} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ opacity: pop(f, 2 + d) }}><Logo name={r.logo} size={140} /></div>
              <div style={{ position: "relative", width: 560, height: 140, margin: "0 28px" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 67, height: 6, borderRadius: 3, background: P.frame }} />
                <div style={{ position: "absolute", left: 0, top: 67, height: 6, borderRadius: 3, width: `${fill * 100}%`, background: P.amber }} />
                <div style={{ position: "absolute", left: 0, right: 0, top: -6, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 52, letterSpacing: -1, color: P.ink, opacity: ease(f, 30 + d, 40 + d) }}>{r.amount}</div>
                <div style={{ position: "absolute", left: 0, right: 0, top: 88, textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: 26, color: P.inkSoft, opacity: ease(f, 34 + d, 44 + d) }}>{r.per}</div>
              </div>
              <div style={{ opacity: pop(f, 10 + d) }}><Person size={140} /></div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 200, top: 720 }}>
        <Line at={100} size={56}>Ecosystems already pay outsiders for intros that land.</Line>
      </div>
      <Source text="Sources: Avalanche Retro9000 blog, Metis BD bounty blog" />
    </Scene>
  );
};

/** P5: the valuable signal is spoken in the room; a web search finds nothing. */
const P5: React.FC = () => {
  const f = useCurrentFrame();
  const room = pop(f, 2);
  const bubble = pop(f, 22);
  const search = pop(f, 60);
  const typed = "team lumen chain decision".slice(0, Math.floor(ease(f, 66, 96) * 25));
  const scramble = "x7#q k2!m 9@pz r4$w".split("").map((c, i) => (c === " " ? " " : "▮▯"[(i + Math.floor(f / 4)) % 2])).join("");
  return (
    <Scene sub="But the signal that wins a team is said in a room, not posted online. Search for it, and you find nothing.">
      <Bg />
      {/* the room: two people, one whispering a sealed message */}
      <div style={{ position: "absolute", left: 200, top: 170, width: 640, height: 420, borderRadius: 24, border: `2px solid ${P.ink}`, background: P.sheet, opacity: room }}>
        <div style={{ position: "absolute", left: 70, bottom: 60 }}><Person size={150} /></div>
        <div style={{ position: "absolute", right: 70, bottom: 60 }}><Person size={150} color={P.bone} /></div>
        <div style={{ position: "absolute", left: 150, top: 50, transform: `scale(${bubble})`, transformOrigin: "20% 100%", opacity: bubble, background: P.lavenderPanel, border: `1px solid ${P.lavender}`, borderRadius: 18, padding: "16px 22px", display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, fontWeight: 700, fontSize: 30, color: P.ink }}>
          <svg width={28} height={32} viewBox="0 0 28 32"><rect x={3} y={14} width={22} height={16} rx={4} fill={P.ink} /><path d="M8 14V9a6 6 0 0 1 12 0v5" stroke={P.ink} strokeWidth={3} fill="none" /></svg>
          {scramble}
        </div>
      </div>
      {/* outside: a search box that returns nothing */}
      <div style={{ position: "absolute", left: 920, top: 250, width: 520, opacity: search, transform: `translateY(${(1 - search) * 20}px)` }}>
        <div style={{ padding: 8, borderRadius: 18, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 10px 30px rgba(15,15,15,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, height: 70, borderRadius: 12, background: P.bone, padding: "0 20px", fontFamily: FONT, fontWeight: 600, fontSize: 28, color: P.ink }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={2.4}><circle cx={10} cy={10} r={7} /><path d="m15 15 6 6" /></svg>
            {typed}
          </div>
          <div style={{ padding: "26px 20px 18px", fontFamily: FONT, fontWeight: 700, fontSize: 30, color: P.inkSoft, opacity: ease(f, 100, 112) }}>0 results</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 680 }}>
        <Line at={118} size={56}>The signal that matters is said in the room.</Line>
      </div>
    </Scene>
  );
};

const LockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 28, color = P.ink }) => (
  <svg width={size} height={size * 1.15} viewBox="0 0 28 32"><rect x={3} y={14} width={22} height={16} rx={4} fill={color} /><path d="M8 14V9a6 6 0 0 1 12 0v5" stroke={color} strokeWidth={3} fill="none" /></svg>
);

/** Sealed value: lock + scrambled blocks that keep changing. */
const Sealed: React.FC<{ len?: number; size?: number }> = ({ len = 6, size = 30 }) => {
  const f = useCurrentFrame();
  const t = Array.from({ length: len }, (_, i) => "▮▯"[(i + Math.floor(f / 4)) % 2]).join("");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, background: P.lavenderPanel, border: `1px solid ${P.lavender}`, borderRadius: 12, padding: "8px 14px", fontFamily: FONT, fontWeight: 700, fontSize: size, color: P.ink }}>
      <LockIcon size={size * 0.8} />
      {t}
    </span>
  );
};

/** A buyer ecosystem drawn generically (never a real ecosystem as a customer). */
const Buyer: React.FC<{ size?: number }> = ({ size = 130 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 6px 18px rgba(15,15,15,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 40 40">
      {[[8, 8], [32, 8], [20, 20], [8, 32], [32, 32]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill={i === 2 ? P.amber : P.ink} />)}
      <path d="M8 8 20 20 32 8M8 32 20 20 32 32" stroke={P.ink} strokeWidth={2} />
    </svg>
  </div>
);

/** P6: name and meaning. */
const P6: React.FC = () => {
  const f = useCurrentFrame();
  const m = pop(f, 4);
  return (
    <Scene sub="So I built Bisik. In Indonesian, bisik means whisper.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 300, display: "flex", alignItems: "center", gap: 48 }}>
        <div style={{ width: 220, height: 220, borderRadius: 56, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 10px 30px rgba(15,15,15,0.10)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.85 + 0.15 * m})`, opacity: m }}>
          <Img src={staticFile("logos/bisik.svg")} style={{ width: 140, height: 140 }} />
        </div>
        <div>
          <Line at={18} size={150}>Bisik</Line>
          <div style={{ marginTop: 18, opacity: ease(f, 50, 64) }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: P.ink, background: P.lavenderPanel, borderRadius: 12, padding: "6px 16px" }}>whisper</span>
          </div>
        </div>
      </div>
    </Scene>
  );
};

/** P7: an insider turns what they saw into a sealed signal, backed by a stake. */
const P7: React.FC = () => {
  const f = useCurrentFrame();
  const sig = pop(f, 24), stake = pop(f, 54), go = ease(f, 90, 130);
  return (
    <Scene sub="Insiders, like mentors and judges, sell what they saw as a sealed signal, with a refundable stake behind it.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 220, display: "flex", alignItems: "center", gap: 60 }}>
        <div style={{ opacity: pop(f, 2) }}><Person size={170} /></div>
        <div style={{ opacity: sig, transform: `translateX(${(1 - sig) * -40 + go * 120}px)` }}>
          <div style={{ padding: 8, borderRadius: 22, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 10px 30px rgba(15,15,15,0.10)" }}>
            <div style={{ borderRadius: 14, background: P.bone, padding: "26px 30px", display: "flex", flexDirection: "column", gap: 18, width: 520 }}>
              <Sealed len={9} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: stake, transform: `scale(${0.8 + 0.2 * stake})`, transformOrigin: "left" }}>
                <span style={{ width: 44, height: 44, borderRadius: 99, background: P.amber, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: 24, color: P.accent }}>$</span>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, color: P.ink, whiteSpace: "nowrap" }}>10 USDC stake</span>
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 24, color: P.inkSoft }}>refundable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 640 }}>
        <Line at={120} size={60}>Insiders sell sealed, stake-backed signals.</Line>
      </div>
    </Scene>
  );
};

/** P8: two ecosystems bid sealed; the winner keeps the best signals for itself. */
const P8: React.FC = () => {
  const f = useCurrentFrame();
  const win = ease(f, 100, 120);
  return (
    <Scene sub="Ecosystems bid in a sealed auction. The winner can keep the best signals to itself, before any rival hears them.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 150, display: "flex", flexDirection: "column", gap: 44 }}>
        {[0, 1].map((i) => {
          const isWin = i === 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 36, opacity: (isWin ? 1 : 1 - 0.55 * win) * pop(f, 4 + i * 8) }}>
              <Buyer />
              <div style={{ opacity: pop(f, 24 + i * 10) }}><Sealed len={5} size={34} /></div>
              {isWin && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: win, transform: `translateX(${(1 - win) * -30}px)` }}>
                  <svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={2.2} strokeLinecap="round"><circle cx={8} cy={12} r={4} /><path d="M12 12h9m-3 0v3m-3-3v2" /></svg>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: P.ink, background: P.amber, borderRadius: 12, padding: "6px 16px" }}>exclusive</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 200, top: 600 }}>
        <Line at={130} size={60}>Buyers bid for exclusivity.</Line>
        <Line at={140} size={34} color={P.inkSoft}>No bid is ever revealed. Arcium compares them encrypted.</Line>
      </div>
    </Scene>
  );
};

/** P9: the team ships; rewards flow to the signal, stakes come back, the scout stays anonymous. */
const P9: React.FC = () => {
  const f = useCurrentFrame();
  const ship = pop(f, 20), pay = ease(f, 50, 90);
  return (
    <Scene sub="When the team ships, the buyer marks the signal that helped. The scout gets paid, the stake comes back, and nobody learns who they are.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 210, display: "flex", alignItems: "center" }}>
        <div style={{ opacity: pop(f, 2) }}>
          <TeamCard
            badge={
              <div style={{ position: "absolute", right: -22, top: -22, width: 60, height: 60, borderRadius: 99, background: P.accent, border: `3px solid ${P.sheet}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ship})` }}>
                <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={P.sheet} strokeWidth={3} strokeLinecap="round"><path d="m5 12 5 5 9-10" /></svg>
              </div>
            }
          />
        </div>
        <div style={{ position: "relative", width: 480, height: 160, margin: "0 28px" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 77, height: 6, borderRadius: 3, background: P.frame }} />
          <div style={{ position: "absolute", left: 0, top: 77, height: 6, borderRadius: 3, width: `${pay * 100}%`, background: P.amber }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 34, color: P.ink, opacity: ease(f, 60, 72) }}>reward + stake back</div>
        </div>
        <div style={{ opacity: pop(f, 30), position: "relative" }}>
          <Person size={160} />
          <div style={{ position: "absolute", right: -18, top: -18, opacity: ease(f, 96, 108) }}><Sealed len={3} size={22} /></div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 620 }}>
        <Line at={130} size={60}>Rewards follow outcomes. Stakes come back.</Line>
      </div>
    </Scene>
  );
};

const Coin: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <span style={{ width: size, height: size, borderRadius: 99, background: P.amber, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: size * 0.5, color: P.accent }}>$</span>
);
const Check: React.FC<{ on?: boolean; size?: number }> = ({ on = true, size = 44 }) => (
  <span style={{ width: size, height: size, borderRadius: 99, background: on ? P.accent : P.sheet, border: on ? "none" : `3px dashed ${P.inkSoft}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    {on && <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke={P.sheet} strokeWidth={3.2} strokeLinecap="round"><path d="m5 12 5 5 9-10" /></svg>}
  </span>
);
const Cross: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <span style={{ width: size, height: size, borderRadius: 99, background: P.frame, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke={P.inkSoft} strokeWidth={3.2} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
  </span>
);

/** A stack of framed rows (icon + bold line + short line) that appear one by one. */
type Row = { icon: React.ReactNode; title: string; sub?: string; at: number };
const Rows: React.FC<{ rows: Row[]; top?: number; width?: number }> = ({ rows, top = 120, width = 1180 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 200, top, width, display: "flex", flexDirection: "column", gap: 18 }}>
      {rows.map((r) => {
        const t = pop(f, r.at);
        return (
          <div key={r.title} style={{ opacity: t, transform: `translateY(${(1 - t) * 18}px)`, padding: 6, borderRadius: 20, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 6px 18px rgba(15,15,15,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 26, borderRadius: 14, background: P.bone, padding: "16px 24px" }}>
              <div style={{ width: 88, display: "flex", justifyContent: "center" }}>{r.icon}</div>
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: P.ink }}>{r.title}</div>
                {r.sub && <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 24, color: P.inkSoft, marginTop: 4 }}>{r.sub}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** P10: why crypto. Each row lands when Dien says it. */
const P10: React.FC = () => (
  <Scene sub="Why crypto? Payments sit in Solana escrow, so scouts never trust the buyer. Arcium's encrypted computation hides which team each stake backs, and every bid, even from us. Zero-knowledge proofs give scouts a reputation without a name. And USDC pays anyone, anywhere.">
    <Bg />
    <Rows
      rows={[
        { icon: <Logo name="solana" size={76} />, title: "Payment locked in onchain escrow", sub: "Scouts do not have to trust the buyer", at: 20 },
        { icon: <Sealed len={3} size={26} />, title: "Choices and bids stay encrypted", sub: "Arcium MPC computes on them without revealing them", at: 150 },
        { icon: <div style={{ position: "relative" }}><Person size={76} /><div style={{ position: "absolute", right: -10, bottom: -8 }}><LockIcon size={24} /></div></div>, title: "Reputation without a name", sub: "GitHub record proved with zkTLS, membership with Semaphore", at: 290 },
        { icon: <Coin size={70} />, title: "Global payouts in USDC", sub: "Claimed to a fresh address", at: 420 },
      ]}
    />
  </Scene>
);

/** P11: not betting. */
const P11: React.FC = () => (
  <Scene sub="And it is not betting. Stakes come back, rewards come only from buyers, and only a proven hoax loses its stake.">
    <Bg />
    <Rows
      top={170}
      width={1100}
      rows={[
        { icon: <Check />, title: "Every honest stake is refunded", at: 30 },
        { icon: <Check />, title: "Rewards come only from buyers", sub: "No money moves from losers to winners", at: 80 },
        { icon: <Check />, title: "Only a proven hoax is slashed", sub: "The slashed stake goes to charity", at: 140 },
      ]}
    />
  </Scene>
);

/** P12: difference from earlier private signal markets (no names). */
const P12: React.FC = () => {
  const f = useCurrentFrame();
  const items: [string, boolean, boolean][] = [
    ["Stakes stay private", true, true],
    ["Rival buyers bid for exclusivity", false, true],
    ["Reasons a buyer can audit", false, true],
    ["Reputation without doxxing", false, true],
    ["Winner set by real outcomes", false, true],
  ];
  const col = (title: string, i: number, dark: boolean) => (
    <div style={{ padding: 8, borderRadius: 22, background: P.sheet, border: `1px solid ${P.rule}`, opacity: pop(f, 10 + i * 20) }}>
      <div style={{ width: 300, borderRadius: 14, background: dark ? P.accent : P.bone, padding: "18px 0", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 30, color: dark ? P.sheet : P.ink }}>
        {title}
      </div>
    </div>
  );
  return (
    <Scene sub="Private, stake-backed signal markets already exist. But there one buyer sees everything and the market creator picks the winner. Bisik adds an auction between rival buyers, reasons you can audit, reputation without doxxing, and winners set by real outcomes.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 110 }}>
        <div style={{ display: "flex", gap: 24, marginLeft: 560, marginBottom: 16 }}>
          {col("Earlier markets", 0, false)}
          {col("Bisik", 1, true)}
        </div>
        {items.map(([t, a, b], i) => {
          const o = pop(f, 50 + i * 40);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", height: 92, borderTop: `1px solid ${P.rule}`, opacity: o }}>
              <div style={{ width: 560, fontFamily: FONT, fontWeight: 700, fontSize: 32, color: P.ink }}>{t}</div>
              <div style={{ width: 316, display: "flex", justifyContent: "center" }}>{a ? <Check /> : <Cross />}</div>
              <div style={{ width: 316, display: "flex", justifyContent: "center" }}>{b && <Check />}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

/** P13: who uses it, and how Bisik earns. */
const P13: React.FC = () => {
  const f = useCurrentFrame();
  const bar = ease(f, 120, 170);
  const group = (title: string, sub: string, icon: React.ReactNode, at: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: pop(f, at) }}>
      {icon}
      <div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, color: P.ink }}>{title}</div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: P.inkSoft }}>{sub}</div>
      </div>
    </div>
  );
  return (
    <Scene sub="Buyers are ecosystem BD and grant teams. Scouts are judges, mentors and devrels. Every sale pays scouts 85 percent, and Bisik keeps 15.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 150, display: "flex", flexDirection: "column", gap: 40 }}>
        {group("Buyers", "Ecosystem BD and grant teams", <Buyer size={120} />, 6)}
        {group("Scouts", "Hackathon judges, mentors, devrels", <Person size={120} />, 50)}
      </div>
      <div style={{ position: "absolute", left: 200, top: 520, width: 1100, opacity: ease(f, 110, 124) }}>
        <div style={{ display: "flex", height: 84, borderRadius: 16, overflow: "hidden", border: `1px solid ${P.rule}` }}>
          <div style={{ width: `${85 * bar}%`, background: P.amber, display: "flex", alignItems: "center", paddingLeft: 24, fontFamily: FONT, fontWeight: 800, fontSize: 36, color: P.accent, whiteSpace: "nowrap" }}>85% to scouts</div>
          <div style={{ flex: 1, background: P.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: 32, color: P.sheet, whiteSpace: "nowrap" }}>15% Bisik</div>
        </div>
        <div style={{ marginTop: 14, fontFamily: FONT, fontWeight: 600, fontSize: 26, color: P.inkSoft }}>of every buyer payment</div>
      </div>
    </Scene>
  );
};

/** P14: honest status. What works today and what is next. */
const P14: React.FC = () => (
  <Scene sub="Where we are today. Bisik runs end to end on Solana devnet, from a private stake to an anonymous payout. We have no paying users yet. Our next step is a pilot round with hackathon judges as scouts and ecosystem grant teams as buyers.">
    <Bg />
    <Rows
      top={150}
      width={1150}
      rows={[
        { icon: <Check />, title: "Live on Solana devnet", sub: "Program, encrypted MPC, keeper and web app", at: 40 },
        { icon: <Check />, title: "Full lifecycle works end to end", sub: "Private stake, sealed auction, outcome, anonymous claim", at: 120 },
        { icon: <Check on={false} />, title: "No paying users yet", at: 220 },
        { icon: <Check on={false} />, title: "Next: a pilot round", sub: "Hackathon judges as scouts, ecosystem grant teams as buyers", at: 290 },
      ]}
    />
  </Scene>
);

/** P15: founder. Facts from scientivan.dev. */
const AWARDS = [
  { what: "Two-track winner", where: "9th Uniswap Hook Incubator", proj: "Veritas, the engine that now scores scout reasons" },
  { what: "2nd place", where: "Monad Blitz Hackathon Jogja", proj: "VISTA, later ported to Solana with Anchor" },
  { what: "Top 10 of 139", where: "KeeperHub Agent Economy Hackathon", proj: "Resi, retry-safe agent payments" },
  { what: "Top 150 of 9,000", where: "EDU Chain Hackathon Semester 3", proj: "Edugram, education with AI short videos" },
];
const P15: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Scene sub="I'm Dien, an information engineering student at Universitas Gadjah Mada, building Bisik solo. I won two tracks at the Uniswap Hook Incubator with Veritas, the engine that now scores scout reasons, took second at Monad Blitz with VISTA, made the top ten at KeeperHub, and the top 150 of nine thousand builders at EDU Chain.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 110 }}>
        <Line at={4} size={64}>Dien, solo founder</Line>
        <Line at={14} size={32} color={P.inkSoft}>Information Engineering, Universitas Gadjah Mada</Line>
      </div>
      <div style={{ position: "absolute", left: 200, top: 320, display: "flex", gap: 22 }}>
        {AWARDS.map((a, i) => {
          const t = pop(f, 120 + i * 80);
          return (
            <div key={a.where} style={{ opacity: t, transform: `translateY(${(1 - t) * 20}px)`, padding: 8, borderRadius: 22, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 6px 18px rgba(15,15,15,0.06)" }}>
              <div style={{ width: 262, height: 340, borderRadius: 14, background: i === 0 ? P.accent : P.bone, padding: 26, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: i === 0 ? P.amber : P.ink, lineHeight: 1.1 }}>{a.what}</div>
                <div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: i === 0 ? P.sheet : P.ink }}>{a.where}</div>
                  <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: i === 0 ? "#B8B8B8" : P.inkSoft, marginTop: 8 }}>{a.proj}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Source text="Source: scientivan.dev" />
    </Scene>
  );
};

/** P16: roadmap in two lanes (product and business), then the vision. */
const LANES = [
  { lane: "Product", steps: ["Open oracle network of staked verifiers", "Outcomes checked on any chain", "Scout reasons processed inside a TEE"] },
  { lane: "Business", steps: ["Pilot round with judges and grant teams", "A sourcing round every hackathon season", "Hiring and investment research markets"] },
];
const P16: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Scene sub="The roadmap has two tracks. In product, staked verifiers replace us as the outcome oracle, then outcomes on any chain, and reasons inside a TEE. In business, a pilot with judges and grant teams, a round every hackathon season, then hiring and investment research. The vision is a private market for anything insiders know.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 110, display: "flex", flexDirection: "column", gap: 34 }}>
        {LANES.map((L, li) => {
          const base = li === 0 ? 20 : 300;
          const line = ease(f, base, base + 200);
          return (
            <div key={L.lane} style={{ opacity: pop(f, base - 10) }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, color: P.inkSoft, marginBottom: 14 }}>{L.lane}</div>
              <div style={{ position: "relative", width: 1150 }}>
                <div style={{ position: "absolute", left: 18, right: 60, top: 17, height: 4, background: P.frame }} />
                <div style={{ position: "absolute", left: 18, top: 17, height: 4, width: line * 1070, background: P.ink }} />
                <div style={{ display: "flex", gap: 24 }}>
                  {L.steps.map((st, i) => {
                    const t = pop(f, base + i * 70);
                    return (
                      <div key={st} style={{ width: 366, opacity: t }}>
                        <div style={{ width: 38, height: 38, borderRadius: 99, background: i === 0 ? P.amber : P.sheet, border: `3px solid ${P.ink}` }} />
                        <div style={{ marginTop: 14, fontFamily: FONT, fontWeight: 700, fontSize: 30, color: P.ink, lineHeight: 1.2 }}>{st}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 200, top: 700, opacity: ease(f, 560, 580) }}>
        <div style={{ display: "inline-block", background: P.lavenderPanel, border: `1px solid ${P.lavender}`, borderRadius: 18, padding: "18px 28px", fontFamily: FONT, fontWeight: 700, fontSize: 40, color: P.ink }}>
          A private market for anything insiders know.
        </div>
      </div>
    </Scene>
  );
};

/** P17: end card. */
const P17: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Scene sub="Bisik. Private signals, sealed bids, anonymous payouts, settled on Solana.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 300, display: "flex", alignItems: "center", gap: 40 }}>
        <div style={{ opacity: pop(f, 2) }}>
          <div style={{ width: 170, height: 170, borderRadius: 44, background: P.sheet, border: `1px solid ${P.rule}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Img src={staticFile("logos/bisik.svg")} style={{ width: 110, height: 110 }} />
          </div>
        </div>
        <div>
          <Line at={8} size={120}>Bisik</Line>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, opacity: ease(f, 24, 36) }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: P.inkSoft }}>Settled on</span>
            <Logo name="solana" size={60} />
          </div>
        </div>
      </div>
    </Scene>
  );
};

/** P0: Bisik is broad; this pitch uses one use case, hackathons. */
const USES = [
  { t: "Hiring", x: 0, y: 0 }, { t: "Investing", x: 1, y: 0 }, { t: "Research", x: 2, y: 0 },
  { t: "Hackathons", x: 1, y: 1 },
];
const P0: React.FC = () => {
  const f = useCurrentFrame();
  const focus = ease(f, 90, 110);
  return (
    <Scene sub="Bisik is a private market for what insiders know. It works for many markets, but today I'll use one: hackathons, where ecosystems buy what judges and mentors saw.">
      <Bg />
      <div style={{ position: "absolute", left: 200, top: 120 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: pop(f, 2) }}>
          <Img src={staticFile("logos/bisik.svg")} style={{ width: 64, height: 64 }} />
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 64, color: P.ink, letterSpacing: -2 }}>Bisik</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 280, display: "grid", gridTemplateColumns: "repeat(3, 330px)", gap: 22 }}>
        {USES.map((u, i) => {
          const hack = u.t === "Hackathons";
          const t = pop(f, 20 + i * 10);
          return (
            <div key={u.t} style={{ gridColumn: u.x + 1, gridRow: u.y + 1, opacity: t * (hack ? 1 : 1 - 0.6 * focus), padding: 6, borderRadius: 20, background: P.sheet, border: `1px solid ${P.rule}` }}>
              <div style={{ borderRadius: 14, background: hack ? (focus > 0.5 ? P.accent : P.bone) : P.bone, padding: "24px 26px", fontFamily: FONT, fontWeight: 700, fontSize: 36, color: hack && focus > 0.5 ? P.sheet : P.ink }}>{u.t}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 200, top: 600, display: "flex", gap: 60, opacity: ease(f, 120, 136) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Buyer size={96} />
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: P.ink }}>Buyers<div style={{ fontWeight: 600, fontSize: 24, color: P.inkSoft }}>Ecosystems</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Person size={96} />
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: P.ink }}>Scouts<div style={{ fontWeight: 600, fontSize: 24, color: P.inkSoft }}>Judges and mentors</div></div>
        </div>
      </div>
    </Scene>
  );
};

/** Face-cam slot: the frame is drawn here, Dien drops the face video inside it in the edit. */
const FaceFrame: React.FC = () => {
  const f = useCurrentFrame();
  const s = pop(f, 6);
  return (
    <div style={{ position: "absolute", right: FACE.margin, bottom: FACE.margin, width: FACE.size + 16, opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
      <div style={{ padding: 8, borderRadius: 26, background: P.sheet, border: `1px solid ${P.rule}`, boxShadow: "0 12px 32px rgba(15,15,15,0.12)" }}>
        <div style={{ width: FACE.size, height: FACE.size, borderRadius: 18, background: P.frame, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 600, fontSize: 22, color: P.inkSoft }}>
          Face video goes here
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 6px 4px" }}>
          <Img src={staticFile("logos/bisik.svg")} style={{ width: 22, height: 22 }} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: P.ink }}>Dien</span>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, color: P.inkSoft }}>Solo founder</span>
        </div>
      </div>
    </div>
  );
};

const SCENES: [React.FC, number][] = [[P0, 225], [P1, 150], [P2, 150], [P3, 150], [P4, 225], [P5, 225], [P6, 180], [P7, 240], [P8, 240], [P9, 240], [P10, 510], [P11, 240], [P12, 420], [P13, 300], [P14, 450], [P15, 600], [P16, 660], [P17, 120]];
export const PITCH_FRAMES = SCENES.reduce((a, [, d]) => a + d, 0);

export const Pitch: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: P.bone }}>
      {SCENES.map(([S, d], i) => {
        const from = at;
        at += d;
        return (
          <Sequence key={i} from={from} durationInFrames={d}>
            <S />
          </Sequence>
        );
      })}
      <FaceFrame />
    </AbsoluteFill>
  );
};
