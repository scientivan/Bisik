/** Deterministic text utilities used by Veritas (no model needed). */

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/** Word 5-shingles. */
export function shingles(text: string, k = 5): Set<string> {
  const w = normalize(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  if (w.length < k) {
    if (w.length) out.add(w.join(" "));
    return out;
  }
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Cheap stylometric signal for machine-written text (used only as a weak flag and as the
 * fallback when the model is unavailable). Looks at sentence-length uniformity and stock phrases.
 */
export function styleSignal(text: string): number {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (sentences.length < 3) return 0.2;
  const lens = sentences.map((s) => s.split(/\s+/).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  const uniformity = Math.max(0, 1 - sd / Math.max(mean, 1)); // 1 = very uniform
  const stock = /(delve|furthermore|in conclusion|it is worth noting|plays a pivotal role|in today's|landscape|tapestry|robust and scalable|game[- ]changer)/gi;
  const hits = (text.match(stock) ?? []).length;
  return Math.min(1, 0.6 * uniformity + Math.min(0.4, hits * 0.1));
}

/** Noisy-OR combination from Veritas UHI9: DRS = 1 − (1 − D)(1 − A). */
export function drs(D: number, A: number | null): number {
  const a = A ?? 0;
  return 1 - (1 - clamp01(D)) * (1 - clamp01(a));
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
