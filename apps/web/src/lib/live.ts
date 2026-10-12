import { useEffect, useState } from "react";
import { api } from "./api";

/**
 * One shared live channel to the server. The server bumps a data version only when a confirmed
 * transaction changes Bisik's onchain state, and pushes it over server-sent events. Pages refetch
 * when the version changes instead of polling on a timer. If the event stream is unavailable, a
 * slow version poll takes over.
 */
const base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || "/api").replace(/\/$/, "");
let version = 0;
const subscribers = new Set<(v: number) => void>();
let started = false;

function publish(v: number) {
  if (!Number.isFinite(v) || v === version) return;
  version = v;
  for (const s of subscribers) s(v);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  let poll: ReturnType<typeof setInterval> | null = null;
  const startPolling = () => {
    if (poll) return;
    poll = setInterval(() => void api<{ version: number }>("/version").then((r) => publish(r.version)).catch(() => {}), 30_000);
  };
  if (typeof EventSource === "undefined") return startPolling();
  const source = new EventSource(`${base}/v1/events`);
  source.addEventListener("version", (e) => {
    if (poll) { clearInterval(poll); poll = null; }
    publish(Number((e as MessageEvent).data));
  });
  // EventSource reconnects by itself; poll meanwhile so a dropped stream never freezes the page.
  source.onerror = () => startPolling();
}

/** Returns the current data version; the component rerenders when it changes. */
export function useDataVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    start();
    subscribers.add(setV);
    return () => void subscribers.delete(setV);
  }, []);
  return v;
}

/** Runs `effect` once on mount and again whenever onchain data changes. */
export function useOnDataChange(effect: () => void, deps: unknown[] = []) {
  const v = useDataVersion();
  useEffect(() => {
    effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, ...deps]);
}

const memory = new Map<string, unknown>();
const storeKey = (path: string) => `bisik:cache:${path}`;

/** Last known response for a GET path, from memory or this tab's session storage. */
export function cachedValue<T>(path: string): T | undefined {
  if (memory.has(path)) return memory.get(path) as T;
  try {
    const raw = sessionStorage.getItem(storeKey(path));
    if (raw) {
      const value = JSON.parse(raw) as T;
      memory.set(path, value);
      return value;
    }
  } catch {}
  return undefined;
}

/** GET with a remembered copy, so the next visit renders immediately while it refreshes. */
export async function cachedApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const value = await api<T>(path, undefined, undefined, signal);
  memory.set(path, value);
  try { sessionStorage.setItem(storeKey(path), JSON.stringify(value)); } catch {}
  return value;
}

/** Same idea for browser-side chain reads: keep the last decoded account per key. */
export function remember<T>(key: string, value: T) {
  memory.set(key, value);
  return value;
}
export function recall<T>(key: string): T | undefined {
  return memory.get(key) as T | undefined;
}
