/**
 * Minimal Gemini REST client (no SDK, to keep the dependency tree small).
 * Model choice (D-30): GEMINI_FAST_MODEL for interactive calls, GEMINI_MODEL for
 * background work, GEMINI_EMBED_MODEL for embeddings. The API key never leaves the server.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiConfig {
  apiKey: string;
  fastModel: string;
  qualityModel: string;
  embedModel: string;
  /** ms */
  fastTimeout: number;
  qualityTimeout: number;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): GeminiConfig | null {
  if (!env.GEMINI_API_KEY) return null;
  return {
    apiKey: env.GEMINI_API_KEY,
    fastModel: env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite",
    qualityModel: env.GEMINI_MODEL || "gemini-3.8-flash",
    embedModel: env.GEMINI_EMBED_MODEL || "gemini-embedding-2",
    fastTimeout: 15_000,
    qualityTimeout: 150_000,
  };
}

async function post(cfg: GeminiConfig, url: string, body: unknown, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": cfg.apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`gemini ${res.status}: ${json?.error?.status ?? ""} ${json?.error?.message ?? ""}`.trim());
    return json;
  } finally {
    clearTimeout(t);
  }
}

/** Generate JSON matching `schema`. Retries once; throws on failure (callers fall back). */
export async function generateJson<T>(
  cfg: GeminiConfig,
  opts: { model: "fast" | "quality"; system: string; prompt: string; schema: object },
): Promise<T> {
  const model = opts.model === "fast" ? cfg.fastModel : cfg.qualityModel;
  const timeout = opts.model === "fast" ? cfg.fastTimeout : cfg.qualityTimeout;
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: opts.schema, temperature: 0.2, maxOutputTokens: 2048 },
  };
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = await post(cfg, `${BASE}/${model}:generateContent`, body, timeout);
      const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
      return JSON.parse(text) as T;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export async function embed(cfg: GeminiConfig, texts: string[], dims = 768): Promise<number[][]> {
  const body = {
    requests: texts.map((t) => ({ model: `models/${cfg.embedModel}`, content: { parts: [{ text: t }] }, outputDimensionality: dims })),
  };
  const json = await post(cfg, `${BASE}/${cfg.embedModel}:batchEmbedContents`, body, cfg.fastTimeout);
  return (json.embeddings ?? []).map((e: any) => e.values as number[]);
}
