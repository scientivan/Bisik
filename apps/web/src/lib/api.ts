export interface Market {
  id: number;
  kind: number;
  status: string;
  category: number;
  submitEnd: number;
  auctionEnd: number;
  outcomeEnd: number;
  optionCount: number;
  positions: number;
  minStake: number;
  maxStake: number;
  minReasonLen: number;
  reservePrice: number;
  flatPrice: number;
  totalStaked?: number;
  question?: string | null;
  preview: null | {
    backed: number;
    weak: number;
    medium: number;
    strong: number;
  };
  options?: { index: number; category: number; optedIn: boolean }[];
}
export interface Signals {
  buyerIndex: number;
  visibleMask: number;
  encryptedSignals: any;
  options: {
    index: number;
    teamRef: string;
    score: number;
    nScouts: number;
    tierDist: number[];
    summary?: { pros: string[]; cons: string[] };
    claims: { id: string; text: string; kind: string; nullifier?: string }[];
    reasons: {
      filteredText: string;
      D: number;
      A: number | null;
      flags: string[];
    }[];
  }[];
}
const base = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "/api"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  body?: unknown,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch(`${base}/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok)
    throw new ApiError(
      data?.error || `The server returned ${r.status}. Try again.`,
      r.status,
    );
  if (data === null)
    throw Error(
      "The API returned an unreadable response. Check the server address.",
    );
  return data;
}
