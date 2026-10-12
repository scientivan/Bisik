import { PROGRAM_ID } from "@bisik/sdk";
export const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
const prefix = `bisik:${network}:${PROGRAM_ID.toBase58()}:`;
export function read<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(prefix + key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  localStorage.setItem(prefix + key, JSON.stringify(value));
}
export interface Scout {
  secret: string;
  commitment: string;
  tier?: number;
  epoch?: number;
  sessionId?: string;
  requestUrl?: string;
}
export interface PositionRecord {
  marketId: number;
  slot: number;
  tier: number;
  epoch: number;
  nullifier: string;
  root: string;
  optionIndex: number;
  signature?: string;
  leaves?: string[];
}
export function rememberPosition(record: PositionRecord) {
  const all = read<PositionRecord[]>("positions", []);
  const old = all.findIndex(
    (p) =>
      p.marketId === record.marketId &&
      p.slot === record.slot &&
      p.nullifier === record.nullifier,
  );
  if (old >= 0) all[old] = record;
  else all.push(record);
  write("positions", all);
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
