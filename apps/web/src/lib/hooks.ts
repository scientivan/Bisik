import { useCallback, useEffect, useState } from "react";
import { type Market } from "./api";
import { cachedApi, cachedValue, useDataVersion } from "./live";
export function useMarket(id: string | undefined) {
  const path = `/markets/${id}`;
  const version = useDataVersion();
  const [market, setMarket] = useState<Market | null>(() => (id ? cachedValue<Market>(path) ?? null : null)),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(() => !(id && cachedValue(path)));
  const refresh = useCallback(async () => {
    try {
      const m = await cachedApi<Market>(path);
      setMarket(m);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  // Show the remembered copy at once when the market changes, then refresh.
  useEffect(() => {
    const hit = id ? cachedValue<Market>(path) ?? null : null;
    setMarket(hit);
    setLoading(!!id && !hit);
  }, [id, path]);
  // Refetch on mount and whenever onchain data changes; no timer polling.
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh, id, version]);
  return { market, error, loading, refresh };
}
export function useAction() {
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState("");
  async function run(label: string, fn: () => Promise<string | void>) {
    setBusy(label);
    setError("");
    setResult("");
    try {
      setResult((await fn()) || "Done.");
    } catch (e) {
      setError((e as Error).message || "The action failed. Try again.");
    } finally {
      setBusy("");
    }
  }
  return {
    busy,
    error,
    result,
    run,
    clear: () => {
      setResult("");
      setError("");
    },
  };
}
