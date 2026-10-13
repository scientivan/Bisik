import React from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "./theme";
import { GridBg } from "./components";

/** Recorded viewport (scripts/record-demo.ts VIEW). */
export const RW = 1280;
export const RH = 800;

export type Ev = { t: number; kind: string; label: string; x?: number; y?: number; w?: number; h?: number };
type Key = { t: number; s: number; x: number; y: number };

const clampCam = (k: Key): Key => ({
  ...k,
  x: Math.min(Math.max(k.x, RW / 2 / k.s), RW - RW / 2 / k.s),
  y: Math.min(Math.max(k.y, RH / 2 / k.s), RH - RH / 2 / k.s),
});

/**
 * Camera from the recorder's event log: before each click or typed field the camera eases to the
 * clicked box, sized so the box and the cursor on it stay well inside the frame.
 */
export function cameraKeys(events: Ev[], from: number, to: number, maxZoom: number): Key[] {
  const keys: Key[] = [{ t: from, s: 1, x: RW / 2, y: RH / 2 }];
  for (const e of events) {
    if (e.t < from - 0.3 || e.t > to || e.x === undefined || e.w === undefined) continue;
    if (!["click", "typed", "point", "result"].includes(e.kind)) continue;
    const s = Math.max(1, Math.min(maxZoom, (0.5 * RW) / Math.max(e.w, 1), (0.45 * RH) / Math.max(e.h!, 1)));
    const t = Math.max(e.t - 0.45, keys[keys.length - 1].t + 0.25);
    keys.push(clampCam({ t, s, x: e.x + e.w / 2, y: e.y! + e.h! / 2 }));
  }
  return keys;
}

function camAt(keys: Key[], t: number) {
  if (keys.length === 1) return keys[0];
  const ts = keys.map((k) => k.t);
  const o = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: Easing.inOut(Easing.cubic),
  };
  // Piecewise: ease within each segment.
  let i = ts.findIndex((x) => x > t);
  if (i === -1) return keys[keys.length - 1];
  if (i === 0) return keys[0];
  const a = keys[i - 1],
    b = keys[i];
  const p = interpolate(t, [a.t, b.t], [0, 1], o);
  void ts;
  return { s: a.s + (b.s - a.s) * p, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

/** One cut of a take: source seconds [from, to] at `rate`, in a rounded frame with the auto camera. */
export const TakeClip: React.FC<{
  take: string;
  events: Ev[];
  from: number;
  to: number;
  rate?: number;
  maxZoom?: number;
  enter?: boolean;
  /** hold the frame at `from` instead of playing */
  freeze?: boolean;
}> = ({ take, events, from, to, rate = 1, maxZoom = 1, enter = false, freeze = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = from + (frame / fps) * rate;
  const keys = React.useMemo(() => cameraKeys(events, from, to, maxZoom), [events, from, to, maxZoom]);
  const cam = camAt(keys, t);
  const k = 1600 / RW;
  const inS = enter ? spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 }) : 1;
  return (
    <AbsoluteFill>
      <GridBg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: RW * k + 16,
            height: RH * k + 16,
            padding: 8,
            borderRadius: 18,
            background: C.inkLine,
            border: "1px solid #2A2E39",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            transform: `translateY(${(1 - inS) * 30}px) scale(${0.97 + inS * 0.03})`,
            opacity: inS,
          }}
        >
          <div style={{ width: RW * k, height: RH * k, borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                width: RW,
                height: RH,
                transformOrigin: "0 0",
                transform: `scale(${k * cam.s}) translate(${-(cam.x - RW / 2 / cam.s)}px, ${-(cam.y - RH / 2 / cam.s)}px)`,
              }}
            >
              {freeze ? (
                <Freeze frame={0}>
                  <OffthreadVideo
                    src={staticFile(`rec/${take}.mp4`)}
                    trimBefore={Math.round(from * fps)}
                    muted
                    style={{ width: RW, height: RH }}
                  />
                </Freeze>
              ) : (
                <OffthreadVideo
                  src={staticFile(`rec/${take}.mp4`)}
                  trimBefore={Math.round(from * fps)}
                  playbackRate={rate}
                  muted
                  style={{ width: RW, height: RH }}
                />
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const clipFrames = (from: number, to: number, rate = 1, fps = 30) => Math.round(((to - from) / rate) * fps);
