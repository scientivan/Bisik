import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { C, FONT, VH, VW } from "./theme";

/** Clean 32px cell grid on a solid base (no gradient wash). */
export const GridBg: React.FC<{ dark?: boolean }> = ({ dark = true }) => {
  const line = dark ? C.inkLine : C.boneLine;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: dark ? C.ink : C.bone,
        backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    />
  );
};

/** Reference style: each word rises in from a blur, one after another. */
export const BlurWords: React.FC<{
  text: string;
  accent?: string[];
  size: number;
  color: string;
  accentColor: string;
  delay?: number;
  weight?: number;
}> = ({ text, accent = [], size, color, accentColor, delay = 0, weight = 700 }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: -size * 0.03,
        lineHeight: 1.08,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${size * 0.26}px`,
      }}
    >
      {words.map((w, i) => {
        const t = interpolate(frame - delay - i * 4, [0, 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        return (
          <span
            key={i}
            style={{
              color: accent.includes(w) ? accentColor : color,
              opacity: t,
              filter: `blur(${(1 - t) * 14}px)`,
              transform: `translateY(${(1 - t) * 18}px)`,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Chapter card between recordings: step number chip + blur-in title + plain sentence below. */
export const Chapter: React.FC<{ step: string; title: string; accent: string[]; sub: string }> = ({
  step,
  title,
  accent,
  sub,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const subIn = interpolate(frame, [22, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const chip = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <GridBg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 26,
            color: C.white,
            background: C.blue,
            borderRadius: 999,
            padding: "10px 22px",
            transform: `scale(${chip})`,
          }}
        >
          {step}
        </div>
        <BlurWords text={title} accent={accent} size={104} color={C.white} accentColor={C.blueSoft} delay={4} />
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: 34,
            color: C.mute,
            opacity: subIn,
            filter: `blur(${(1 - subIn) * 8}px)`,
            maxWidth: 1200,
            textAlign: "center",
          }}
        >
          {sub}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export type Zoom = { at: number; s: number; x: number; y: number };

/** Interpolates a camera over keyframes (frame-relative, viewport coordinates). */
const camera = (frame: number, keys: Zoom[]) => {
  if (keys.length === 1) return keys[0];
  const at = keys.map((k) => k.at);
  const o = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: Easing.inOut(Easing.cubic) };
  return {
    s: interpolate(frame, at, keys.map((k) => k.s), o),
    x: interpolate(frame, at, keys.map((k) => k.x), o),
    y: interpolate(frame, at, keys.map((k) => k.y), o),
  };
};

/** Recorded app footage in a rounded frame, with a slow camera that pushes in on proof. */
export const AppClip: React.FC<{
  from: number; // source seconds
  to: number;
  rate?: number;
  zoom: Zoom[];
}> = ({ from, to, rate = 1, zoom }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const cam = camera(frame, zoom);
  // Frame box: viewport scaled to 1600 wide.
  const k = 1600 / VW;
  const boxW = VW * k,
    boxH = VH * k;
  return (
    <AbsoluteFill>
      <GridBg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit }}>
        <div
          style={{
            width: boxW + 16,
            height: boxH + 16,
            padding: 8,
            borderRadius: 18,
            background: C.inkLine,
            border: `1px solid #2A2E39`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            transform: `translateY(${(1 - enter) * 40}px) scale(${0.96 + enter * 0.04})`,
            opacity: enter,
          }}
        >
          <div style={{ width: boxW, height: boxH, borderRadius: 12, overflow: "hidden", position: "relative" }}>
            <div
              style={{
                width: VW,
                height: VH,
                transformOrigin: "0 0",
                transform: `scale(${k * cam.s}) translate(${-(cam.x - VW / 2 / cam.s)}px, ${-(cam.y - VH / 2 / cam.s)}px)`,
              }}
            >
              <OffthreadVideo
                src={staticFile("rec/session-r1-r3.mp4")}
                trimBefore={Math.round(from * fps)}
                trimAfter={Math.round(to * fps)}
                playbackRate={rate}
                muted
                style={{ width: VW, height: 900 }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Clamp camera so it never shows outside the footage. */
export const z = (at: number, s: number, x: number, y: number): Zoom => ({
  at,
  s,
  x: Math.min(Math.max(x, VW / 2 / s), VW - VW / 2 / s),
  y: Math.min(Math.max(y, VH / 2 / s), VH - VH / 2 / s),
});

/** Reference "stack" callout: icon circle on a blue rail + small label + bold sentence. */
export const Callout: React.FC<{ label: string; text: string; delay?: number }> = ({ label, text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        right: 70,
        top: 64,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: t,
        transform: `translateX(${(1 - t) * 30}px)`,
        background: C.white,
        borderRadius: 18,
        padding: "18px 30px 18px 18px",
        border: `1px solid ${C.boneLine}`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        maxWidth: 900,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: C.ink,
          border: `4px solid ${C.blue}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 999, background: C.blueSoft }} />
      </div>
      <div style={{ fontFamily: FONT }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.blue }}>{label}</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>{text}</div>
      </div>
    </div>
  );
};

/** Voice-over line shown as a subtitle until the voice track exists. */
export const Caption: React.FC<{ text: string; bottom?: boolean }> = ({ text, bottom }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        ...(bottom ? { bottom: 18 } : { top: 18 }),
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: t,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 600,
          color: C.white,
          background: C.ink,
          border: `1px solid #2A2E39`,
          borderRadius: 12,
          padding: "8px 18px",
          maxWidth: 1500,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};
