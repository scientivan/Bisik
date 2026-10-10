import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Alias the workspace packages to their TS sources so this harness proves the *source* is browser-safe
// (no Node-only imports), independent of each package's dist build.
export default defineConfig({
  resolve: {
    alias: {
      "@bisik/zk": src("../../packages/zk/src/index.ts"),
      "@bisik/shared": src("../../packages/shared/src/index.ts"),
    },
  },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
  preview: { port: 4317, strictPort: true },
  server: { port: 4317, strictPort: true },
});
