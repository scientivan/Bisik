/**
 * Thin HTTP client for the Bisik API (task-tracker 6.5) plus Sign-In With Solana for one buyer.
 * The buyer secret key stays in this process: it is only used to sign the login message and is
 * never returned, logged, or sent anywhere. Only the public key and the session token leave it.
 */
import { readFileSync } from "node:fs";
import { ed25519 } from "@noble/curves/ed25519";
import { PublicKey } from "@solana/web3.js";

export interface Config {
  serverUrl: string;
  buyerKeypairPath?: string;
  timeoutMs: number;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
  const serverUrl = (env.BISIK_SERVER_URL ?? "http://localhost:8787").replace(/\/+$/, "");
  return {
    serverUrl,
    buyerKeypairPath: env.BISIK_BUYER_KEYPAIR_PATH || undefined,
    timeoutMs: Number(env.BISIK_HTTP_TIMEOUT_MS ?? 20_000),
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Buyer {
  pubkey: string;
  seed: Uint8Array; // first 32 bytes of the Solana secret key; private to this module
}

/** Loads a Solana CLI keypair file (JSON array of 64 numbers). */
function loadBuyer(path: string): Buyer {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error("BISIK_BUYER_KEYPAIR_PATH is not a readable JSON keypair file");
  }
  if (!Array.isArray(raw) || raw.length !== 64 || !raw.every((n) => Number.isInteger(n) && n >= 0 && n < 256)) {
    throw new Error("BISIK_BUYER_KEYPAIR_PATH must contain a 64-byte Solana keypair (JSON array)");
  }
  const bytes = Uint8Array.from(raw as number[]);
  const seed = bytes.slice(0, 32);
  const pub = ed25519.getPublicKey(seed);
  if (!pub.every((b, i) => b === bytes[32 + i])) throw new Error("keypair file is inconsistent (public half does not match secret)");
  bytes.fill(0);
  return { pubkey: new PublicKey(pub).toBase58(), seed };
}

export class BisikClient {
  private buyer: Buyer | null = null;
  private buyerError: string | null = null;
  private token: { value: string; exp: number } | null = null;

  constructor(public cfg: Config) {
    if (cfg.buyerKeypairPath) {
      try {
        this.buyer = loadBuyer(cfg.buyerKeypairPath);
      } catch (e) {
        this.buyerError = (e as Error).message;
      }
    }
  }

  buyerStatus() {
    return { configured: !!this.buyer, pubkey: this.buyer?.pubkey ?? null, error: this.buyerError, loggedIn: this.tokenValid(), tokenExpiresAt: this.token ? new Date(this.token.exp * 1000).toISOString() : null };
  }

  private tokenValid() {
    return !!this.token && this.token.exp - 60 > Date.now() / 1000;
  }

  async request<T = any>(method: "GET" | "POST", path: string, body?: unknown, auth = false): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (auth) headers.authorization = `Bearer ${await this.ensureLogin()}`;
    let res: Response;
    try {
      res = await fetch(`${this.cfg.serverUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(this.cfg.timeoutMs) });
    } catch (e) {
      throw new ApiError(0, `Bisik API unreachable at ${this.cfg.serverUrl} (${(e as Error).name})`);
    }
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      if (res.status === 401 && auth) this.token = null;
      throw new ApiError(res.status, `HTTP ${res.status}: ${data?.error ?? text.slice(0, 200)}`);
    }
    return data as T;
  }

  /** SIWS: POST /v1/auth/nonce, sign the returned message, POST /v1/auth/verify. */
  async login(force = false): Promise<{ pubkey: string; expiresAt: string }> {
    if (!this.buyer) throw new Error(this.buyerError ?? "no buyer configured: set BISIK_BUYER_KEYPAIR_PATH to a Solana keypair file");
    if (force || !this.tokenValid()) {
      const n = await this.request<{ nonce: string; issued: number; message: string }>("POST", "/v1/auth/nonce", { pubkey: this.buyer.pubkey });
      const expected = `Bisik login\nnonce: ${n.nonce}\nissued: ${n.issued}`;
      // only sign the exact login format, never an arbitrary server-supplied message
      if (n.message !== expected) throw new Error("server returned an unexpected login message; refusing to sign");
      const signature = Buffer.from(ed25519.sign(new TextEncoder().encode(expected), this.buyer.seed)).toString("base64");
      const { token } = await this.request<{ token: string }>("POST", "/v1/auth/verify", { pubkey: this.buyer.pubkey, nonce: n.nonce, signature });
      let exp = Math.floor(Date.now() / 1000) + 11 * 3600;
      try {
        exp = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()).exp ?? exp;
      } catch {}
      this.token = { value: token, exp };
    }
    return { pubkey: this.buyer.pubkey, expiresAt: new Date(this.token!.exp * 1000).toISOString() };
  }

  private async ensureLogin(): Promise<string> {
    await this.login();
    return this.token!.value;
  }
}
