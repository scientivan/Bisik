/**
 * D6 / F10: what a scout may see about their own reputation, computed in the browser.
 *
 * The server endpoint (`GET /v1/reputation/epoch`) returns only public data: epoch timing
 * and the MPC-revealed sorted `(tag | level)` list. This module matches that list to the
 * scout's own commitment locally, so no request carries the commitment. Hit/miss/hoax
 * counters are never available to anyone; only the coarse level (down / unchanged / up / up2).
 */
import { applyRepLevel, decodeEpochTiers, REP_LEVEL_NAMES } from "@bisik/sdk";
import { TIER_NAMES } from "@bisik/shared";
import type { Scout } from "./storage";

export interface ReputationEpochView {
  currentEpoch: number;
  epochStart: number;
  epochLen: number;
  epochEnd: number;
  secondsLeft: number;
  rotationAllowed: boolean;
  demoMode: boolean;
  reputation: {
    enabled: boolean;
    tiersEpoch: number | null;
    nextStatus: "none" | "computing" | "ready";
    entries: string[];
  };
}

export type RepLevelName = (typeof REP_LEVEL_NAMES)[number];

export interface RevealedLevel {
  /** Epoch the level applies to. */
  epoch: number;
  level: number;
  levelName: RepLevelName;
  /** False when the table has no record for this scout yet (level stays "unchanged"). */
  credited: boolean;
  /** Imported (onboarding) tier shifted by the level, or null if the imported tier is unknown. */
  tier: number | null;
  tierName: string | null;
}

export interface ScoutReputation {
  epoch: { current: number; start: number; end: number; secondsLeft: number; rotationAllowed: boolean; demoMode: boolean };
  current: {
    tier: number | null;
    tierName: string | null;
    /** "group": found in a published tier group of the current epoch; "onboarding": the
     *  tier saved at onboarding (may be from an earlier epoch); "none": unknown. */
    source: "group" | "onboarding" | "none";
    epoch: number | null;
    /** A reveal that applies to the current epoch, if one was made before the rotation. */
    revealed: RevealedLevel | null;
  };
  next: {
    epoch: number;
    /** "disabled": no reputation table on this deployment. */
    status: "disabled" | "none" | "computing" | "ready";
    revealed: RevealedLevel | null;
  };
}

const tierName = (t: number | null) => (t === null ? null : (TIER_NAMES[t] ?? null));

function levelFor(view: ReputationEpochView, scout: Pick<Scout, "commitment" | "tier">): RevealedLevel | null {
  const r = view.reputation;
  if (r.tiersEpoch === null) return null;
  const [mine] = decodeEpochTiers(r.entries.map(BigInt), [BigInt(scout.commitment)]);
  const tier = scout.tier === undefined ? null : applyRepLevel(scout.tier, mine.level);
  return { epoch: r.tiersEpoch, level: mine.level, levelName: REP_LEVEL_NAMES[mine.level] ?? "unchanged", credited: mine.credited, tier, tierName: tierName(tier) };
}

/**
 * Pure: combine the public epoch view, the scout's local identity, and (optionally) the
 * public group leaves of the current epoch keyed by tier.
 */
export function scoutReputation(
  view: ReputationEpochView,
  scout: Pick<Scout, "commitment" | "tier" | "epoch">,
  currentGroups: Partial<Record<number, string[]>> = {},
): ScoutReputation {
  const cur = view.currentEpoch;
  const inGroup = Object.entries(currentGroups).find(([, leaves]) => leaves?.includes(scout.commitment));
  const current: ScoutReputation["current"] = inGroup
    ? { tier: Number(inGroup[0]), tierName: tierName(Number(inGroup[0])), source: "group", epoch: cur, revealed: null }
    : scout.tier !== undefined
      ? { tier: scout.tier, tierName: tierName(scout.tier), source: "onboarding", epoch: scout.epoch ?? null, revealed: null }
      : { tier: null, tierName: null, source: "none", epoch: null, revealed: null };
  const level = levelFor(view, scout);
  if (level?.epoch === cur) current.revealed = level;
  const status = !view.reputation.enabled ? "disabled" : view.reputation.nextStatus;
  return {
    epoch: { current: cur, start: view.epochStart, end: view.epochEnd, secondsLeft: view.secondsLeft, rotationAllowed: view.rotationAllowed, demoMode: view.demoMode },
    current,
    next: { epoch: cur + 1, status, revealed: status === "ready" && level?.epoch === cur + 1 ? level : null },
  };
}

/**
 * Fetch the public epoch view and the current epoch's group leaves (all three tiers, so the
 * requests do not reveal which group the scout is in), then compute locally.
 */
export async function loadScoutReputation(scout: Pick<Scout, "commitment" | "tier" | "epoch">, signal?: AbortSignal): Promise<ScoutReputation> {
  const { api } = await import("./api");
  const view = await api<ReputationEpochView>("/reputation/epoch", undefined, undefined, signal);
  const groups: Partial<Record<number, string[]>> = {};
  await Promise.all(
    TIER_NAMES.map(async (_, t) => {
      try {
        groups[t] = (await api<{ leaves: string[] }>(`/groups/${t}/${view.currentEpoch}`, undefined, undefined, signal)).leaves;
      } catch {
        // a missing group only means the scout's current tier falls back to onboarding data
      }
    }),
  );
  return scoutReputation(view, scout, groups);
}
