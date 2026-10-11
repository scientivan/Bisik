export function parseUsdc(value: string): bigint {
  const s = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(s))
    throw Error("Enter a positive USDC amount with up to six decimal places.");
  const [whole, fraction = ""] = s.split(".");
  const n = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (n <= 0n || n > 18_446_744_073_709_551_615n)
    throw Error("USDC amount is outside the supported range.");
  return n;
}
export function amount(
  value: bigint | number | string | { toString(): string },
): string {
  const n = BigInt(value.toString()),
    whole = n / 1_000_000n,
    f = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${f ? "." + f : ""}`;
}
export const short = (s: string) =>
  s.length > 16 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s;
export const category = (id: number) =>
  [
    "Builder sourcing",
    "Payments",
    "Consumer",
    "Infrastructure",
    "DeFi tooling",
  ][id] ?? `Category ${id}`;
export function remaining(end: number, now = Date.now() / 1000): string {
  const s = Math.max(0, Math.ceil(end - now));
  if (s >= 86400) return `${Math.floor(s / 86400)} days`;
  if (s >= 3600)
    return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}
