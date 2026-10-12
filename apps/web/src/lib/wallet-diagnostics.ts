// Solflare's public inpage adapter replaces connect errors with a boolean.
// Read only a matching, non-silent connect response from its page bridge.
// Account responses, signatures and unrelated wallet traffic are never retained.
export function captureSolflareConnectError() {
  let requestId: string | number | undefined;
  let failure: { code?: number; message: string } | null = null;
  const listen = (event: MessageEvent) => {
    if (!event.isTrusted || event.source !== window || event.origin !== window.location.origin) return;
    const { target, payload } = event.data ?? {};
    if (!payload || typeof payload !== "object") return;
    if (target === "solflare_inpage->contentscript" && payload.method === "connect" && !payload.params?.silent) {
      if (typeof payload.id === "string" || typeof payload.id === "number") requestId = payload.id;
    } else if (target === "solflare_contentscript->inpage" && requestId !== undefined && payload.id === requestId && payload.error) {
      const { code, message } = payload.error;
      if (typeof message === "string") failure = { code: typeof code === "number" ? code : undefined, message };
    }
  };
  window.addEventListener("message", listen);
  return {
    error: () => failure,
    stop: () => window.removeEventListener("message", listen),
  };
}
