/**
 * Offchain zkTLS verification (D-16). Only a tier and a salted source nullifier leave this module;
 * the GitHub username is used transiently and never stored or logged.
 */
import { ReclaimProofRequest, verifyProof, recoverSignersOfSignedClaim, fetchStatusUrl } from "@reclaimprotocol/js-sdk";
import { keccak, utf8, tierFromContributions, type TierId } from "@bisik/shared";

export interface VerifiedScout {
  tier: TierId;
  sourceNullifier: Uint8Array;
}

/** R23: the username must come from a page that requires login, otherwise ownership is not proven. */
export const LOGIN_ONLY_URL = /^https:\/\/github\.com\/(settings\/|$|\?|dashboard)/;

export class VerifyError extends Error {
  constructor(public code: string, msg: string, public detail?: string) {
    super(msg);
  }
}

let attestorCache: { at: number; list: string[] } | null = null;
async function attestors(): Promise<string[]> {
  if (attestorCache && Date.now() - attestorCache.at < 10 * 60_000) return attestorCache.list;
  const r = await fetch("https://api.reclaimprotocol.org/api/attestors");
  const list = ((await r.json()).data as any[]).map((a) => String(a.address).toLowerCase());
  attestorCache = { at: Date.now(), list };
  return list;
}

function pick(obj: Record<string, string>, re: RegExp): string | undefined {
  const k = Object.keys(obj).find((x) => re.test(x));
  return k ? obj[k] : undefined;
}

/** Verify one or more proofs from a session; returns tier + nullifier. Throws VerifyError. */
export async function verifyScoutProofs(proofs: any[], opts: { salt: string; providerId: string; enforceLoginOnly: boolean }): Promise<VerifiedScout> {
  if (!proofs.length) throw new VerifyError("NO_PROOF", "no proof");
  const r = await verifyProof(proofs, { dangerouslyDisableContentValidation: true });
  if (!r.isVerified) throw new VerifyError("INVALID_PROOF", "signature verification failed");
  const known = await attestors();
  let username: string | undefined;
  let contributions: number | undefined;
  let ownership = false;
  const urls: string[] = [];
  for (const p of proofs) {
    const signers = recoverSignersOfSignedClaim({ claim: p.claimData, signatures: p.signatures.map((s: string) => Buffer.from(s.replace(/^0x/, ""), "hex")) });
    if (!signers.some((s: string) => known.includes(s))) throw new VerifyError("UNKNOWN_ATTESTOR", "signer is not a current Reclaim attestor");
    const params = JSON.parse(p.claimData.parameters || "{}");
    const ctx = JSON.parse(p.claimData.context || "{}");
    const ex: Record<string, string> = { ...(ctx.extractedParameters ?? {}), ...(params.paramValues ?? {}) };
    const u = pick(ex, /user(name)?|login|handle/i);
    const c = pick(ex, /contrib/i);
    if (u) {
      if (username && username.toLowerCase() !== u.toLowerCase()) throw new VerifyError("USERNAME_MISMATCH", "proofs disagree on the account");
      username = u;
      if (LOGIN_ONLY_URL.test(String(params.url ?? ""))) ownership = true;
    }
    if (c) contributions = Number(String(c).replace(/[^0-9]/g, ""));
    if (params.url) urls.push(String(params.url));
  }
  // Diagnostics for R23: which pages the proofs came from, with the username redacted.
  const sources = () => urls.map((x) => (username ? x.split(username).join("{user}") : x)).join(" | ");
  if (!username) throw new VerifyError("NO_USERNAME", "proof does not reveal the account");
  if (opts.enforceLoginOnly && !ownership) throw new VerifyError("UNOWNED_SOURCE", "username not taken from a login-only page (R23)", sources());
  if (contributions === undefined || Number.isNaN(contributions)) throw new VerifyError("NO_CONTRIBUTIONS", "proof does not reveal a contribution count", sources());
  const tier = tierFromContributions(contributions);
  if (tier === null) throw new VerifyError("BELOW_THRESHOLD", "fewer than 50 contributions in 12 months");
  const sourceNullifier = keccak(utf8(`${opts.salt}|github|${username.toLowerCase()}`));
  username = undefined; // drop it
  return { tier, sourceNullifier };
}

export async function createSession(cfg: { appId: string; appSecret: string; providerId: string }, callbackUrl: string | null, context: string) {
  const req = await ReclaimProofRequest.init(cfg.appId, cfg.appSecret, cfg.providerId, { acceptAiProviders: true } as any);
  req.setContext("0x0", context);
  if (callbackUrl) req.setAppCallbackUrl(callbackUrl, true);
  const requestUrl = await req.getRequestUrl();
  const sessionId = JSON.parse(decodeURIComponent(new URL(requestUrl).searchParams.get("template") ?? "{}")).sessionId ?? req.getSessionId?.();
  return { requestUrl, sessionId: String(sessionId) };
}

/** Pull proofs for a session from Reclaim (used when no public callback URL is reachable). */
export async function pollSession(sessionId: string): Promise<{ status: string; proofs: any[] }> {
  const r: any = await fetchStatusUrl(sessionId);
  const s = r.session ?? r;
  return { status: s.statusV2 ?? s.status, proofs: s.proofs ?? [] };
}
