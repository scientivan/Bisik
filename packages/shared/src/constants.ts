/** Tiers (task-tracker 6.1). */
export const Tier = { Bronze: 0, Silver: 1, Gold: 2 } as const;
export type TierId = (typeof Tier)[keyof typeof Tier];
export const TIER_NAMES = ["Bronze", "Silver", "Gold"] as const;
/** Reputation multiplier per tier, basis points. */
export const TIER_MULTIPLIER_BPS = [10_000, 11_500, 13_000] as const;

/** D-28: contributions in the last 12 months to tier. Returns null when below threshold. */
export function tierFromContributions(n: number): TierId | null {
  if (n >= 1000) return Tier.Gold;
  if (n >= 300) return Tier.Silver;
  if (n >= 50) return Tier.Bronze;
  return null;
}

export const USDC_DECIMALS = 6;
export const usdc = (x: number): bigint => BigInt(Math.round(x * 10 ** USDC_DECIMALS));

export const MAX_OPTIONS = 16;
export const MAX_SLOTS = 3;
export const SEMAPHORE_DEPTH = 20;

/** D-03/D-06/D-08 defaults. */
export const DEFAULT_PARAMS = {
  minStake: usdc(10),
  maxStake: usdc(500),
  maxSlots: MAX_SLOTS,
  minReasonLen: 200,
  b: 2,
  x: 3,
  earlyBonusStartBps: 15_000,
  feeBps: 1_500,
  teamBps: 500,
  kMin: 5,
  epochLenSecs: 30 * 24 * 60 * 60,
} as const;
