/**
 * Veritas for Bisik (D-21): an internal module, not an external service.
 *
 * - D: duplication / copy-paste against earlier reasons (embedding cosine + 5-shingle Jaccard).
 * - A: likelihood the reason was machine-written (model rubric + style signal).
 * - DRS = 1 − (1 − D)(1 − A), the noisy-OR from Veritas UHI9.
 *
 * Scores are flags and display weights only. They are never a basis for slashing
 * (living doc section 9): AI detectors are not reliable enough to punish people.
 */
import type { Claim, VeritasScores } from "@bisik/shared";
import { configFromEnv, generateJson, embed, type GeminiConfig } from "./gemini.js";
import { shingles, jaccard, cosine, styleSignal, drs, clamp01 } from "./text.js";

export { drs, jaccard, shingles, cosine, styleSignal } from "./text.js";
export { configFromEnv } from "./gemini.js";
export type { GeminiConfig } from "./gemini.js";

export interface CorpusItem {
  id: string;
  text: string;
  embedding?: number[];
}

export interface Analysis extends VeritasScores {
  claims: Claim[];
  filtered: string;
  removed: string[];
  embedding?: number[];
}

const FLAG_DUPLICATE = 0.8;
const FLAG_AI = 0.75;

export class Veritas {
  constructor(private cfg: GeminiConfig | null = configFromEnv()) {}

  get modelAvailable(): boolean {
    return this.cfg !== null;
  }

  async embed(text: string): Promise<number[] | undefined> {
    if (!this.cfg) return undefined;
    try {
      return (await embed(this.cfg, [text]))[0];
    } catch {
      return undefined;
    }
  }

  /** D in [0,1]: the closest earlier reason, by meaning (embedding) or wording (shingles). */
  async scoreDuplicate(text: string, corpus: CorpusItem[], embedding?: number[]): Promise<{ D: number; nearest?: string }> {
    const sh = shingles(text);
    let best = 0;
    let nearest: string | undefined;
    for (const c of corpus) {
      let s = jaccard(sh, shingles(c.text));
      if (embedding && c.embedding) s = Math.max(s, rescaleCosine(cosine(embedding, c.embedding)));
      if (s > best) {
        best = s;
        nearest = c.id;
      }
    }
    return { D: clamp01(best), nearest };
  }

  /** A in [0,1], or null when the model is unavailable (flag `ai_unavailable`). */
  async scoreAiLikelihood(text: string): Promise<number | null> {
    const style = styleSignal(text);
    if (!this.cfg) return null;
    try {
      const r = await generateJson<{ probability: number }>(this.cfg, {
        model: "fast",
        system:
          "You estimate how likely a short text was written mostly by an AI model rather than a person. " +
          "Judge style only (generic phrasing, uniform rhythm, filler), not quality or truth. " +
          "Return a probability between 0 and 1. Be conservative: short informal notes are usually human.",
        prompt: text,
        schema: { type: "object", properties: { probability: { type: "number" } }, required: ["probability"] },
      });
      return clamp01(0.75 * clamp01(r.probability) + 0.25 * style);
    } catch {
      return null;
    }
  }

  /** Split a reason into verifiable claims (can go to a hoax dispute) and opinions (never slashed). */
  async extractClaims(text: string): Promise<Claim[]> {
    if (!this.cfg) return [{ text: text.slice(0, 280), kind: "opinion" }];
    try {
      const r = await generateJson<{ claims: Claim[] }>(this.cfg, {
        model: "fast",
        system:
          "Split the scout's reasoning about a builder team into atomic statements. " +
          "Mark a statement 'verifiable' only if a buyer could check it against public evidence " +
          "(e.g. 'shipped X on mainnet', 'won Y hackathon', 'led the migration of Z'). " +
          "Everything else (quality judgements, predictions, feelings) is 'opinion'. Keep wording close to the original.",
        prompt: text,
        schema: {
          type: "object",
          properties: {
            claims: {
              type: "array",
              items: {
                type: "object",
                properties: { text: { type: "string" }, kind: { type: "string", enum: ["verifiable", "opinion"] } },
                required: ["text", "kind"],
              },
            },
          },
          required: ["claims"],
        },
      });
      return r.claims.filter((c) => c.text?.trim());
    } catch {
      return [{ text: text.slice(0, 280), kind: "opinion" }];
    }
  }

  /**
   * Rewrite a reason so it keeps its substance but drops what could identify the scout
   * (names, handles, employer, personal anecdotes, distinctive style). The team itself may be named.
   * Fallback without a model: regex removal of handles, emails, URLs to personal profiles.
   */
  async privacyFilter(text: string): Promise<{ filtered: string; removed: string[] }> {
    const base = regexScrub(text);
    if (!this.cfg) return base;
    try {
      const r = await generateJson<{ filtered: string; removed: string[] }>(this.cfg, {
        model: "fast",
        system:
          "You protect the anonymity of a scout who wrote private reasoning about a builder team for a buyer. " +
          "Rewrite the text in neutral, plain English. Keep every factual point about the TEAM. " +
          "Remove anything that could identify the WRITER: their name, handle, employer, role, location, " +
          "personal relationships, first-person anecdotes that reveal who they are, and distinctive phrasing. " +
          "List what you removed in short phrases.",
        prompt: base.filtered,
        schema: {
          type: "object",
          properties: { filtered: { type: "string" }, removed: { type: "array", items: { type: "string" } } },
          required: ["filtered", "removed"],
        },
      });
      return { filtered: r.filtered, removed: [...base.removed, ...r.removed] };
    } catch {
      return base;
    }
  }

  /** Pros and cons per option for buyers (background job; uses the quality model, falls back to fast). */
  async summarize(reasons: string[]): Promise<{ pros: string[]; cons: string[] }> {
    if (!this.cfg || reasons.length === 0) return { pros: [], cons: [] };
    const schema = {
      type: "object",
      properties: { pros: { type: "array", items: { type: "string" } }, cons: { type: "array", items: { type: "string" } } },
      required: ["pros", "cons"],
    };
    const req = {
      system:
        "Summarize anonymous scouts' reasoning about one builder team for an ecosystem buyer. " +
        "Return at most 3 pros and 3 cons, each one short sentence, no names of scouts.",
      prompt: reasons.map((r, i) => `Reason ${i + 1}: ${r}`).join("\n\n"),
      schema,
    };
    for (const model of ["quality", "fast"] as const) {
      try {
        const r = await generateJson<{ pros: string[]; cons: string[] }>(this.cfg, { model, ...req });
        return { pros: r.pros.slice(0, 3), cons: r.cons.slice(0, 3) };
      } catch {}
    }
    return { pros: [], cons: [] };
  }

  /** Full pipeline for one new reason (interactive; target < 8 s with the fast model). */
  async analyze(text: string, corpus: CorpusItem[]): Promise<Analysis> {
    const embedding = await this.embed(text);
    const [{ D }, A, claims, priv] = await Promise.all([
      this.scoreDuplicate(text, corpus, embedding),
      this.scoreAiLikelihood(text),
      this.extractClaims(text),
      this.privacyFilter(text),
    ]);
    const flags: string[] = [];
    if (D >= FLAG_DUPLICATE) flags.push("likely_duplicate");
    if (A !== null && A >= FLAG_AI) flags.push("likely_ai_written");
    if (A === null) flags.push("ai_unavailable");
    if (!claims.some((c) => c.kind === "verifiable")) flags.push("no_verifiable_claims");
    return { D, A, drs: drs(D, A), flags, claims, filtered: priv.filtered, removed: priv.removed, embedding };
  }
}

/** Groups of near-identical reasons across positions (sybil hint, P2). */
export function sybilHints(items: { id: string; text: string }[], threshold = 0.7): string[][] {
  const sh = items.map((i) => shingles(i.text));
  const seen = new Set<number>();
  const groups: string[][] = [];
  for (let i = 0; i < items.length; i++) {
    if (seen.has(i)) continue;
    const g = [items[i].id];
    for (let j = i + 1; j < items.length; j++) {
      if (!seen.has(j) && jaccard(sh[i], sh[j]) >= threshold) {
        g.push(items[j].id);
        seen.add(j);
      }
    }
    if (g.length > 1) groups.push(g);
  }
  return groups;
}

function regexScrub(text: string): { filtered: string; removed: string[] } {
  const removed: string[] = [];
  let out = text;
  const rules: [RegExp, string][] = [
    [/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]"],
    [/(^|\s)@[A-Za-z0-9_]{2,}/g, " [handle]"],
    [/https?:\/\/(www\.)?(x|twitter|linkedin|t\.me|telegram|instagram)\.[^\s)]+/gi, "[profile link]"],
  ];
  for (const [re, rep] of rules) {
    out = out.replace(re, (m) => {
      removed.push(m.trim());
      return rep;
    });
  }
  return { filtered: out, removed };
}

/** Embedding cosine for paraphrases sits around 0.85–0.95; map [0.6, 0.95] to [0, 1]. */
function rescaleCosine(c: number): number {
  return clamp01((c - 0.6) / 0.35);
}
