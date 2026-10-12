import { useCallback, useEffect, useState } from "react";
import { api, type Market } from "./api";
export function useMarket(id: string | undefined) {
  const [market, setMarket] = useState<Market | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const m = await api<Market>(`/markets/${id}`);
      setMarket(m);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    setMarket(null);
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh();
    const t = setInterval(() => void refresh(), 15000);
    return () => clearInterval(t);
  }, [refresh, id]);
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
