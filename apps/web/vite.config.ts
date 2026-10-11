import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const shim = (name: string) =>
  fileURLToPath(new URL(`../../packages/sdk/browser/${name}`, import.meta.url));
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: [
        "buffer",
        "process",
        "crypto",
        "stream",
        "util",
        "events",
        "vm",
      ],
      globals: { Buffer: "build", process: "build", global: "build" },
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^@anchor-lang\/core$/,
        replacement: shim("anchor-default-shim.js"),
      },
      { find: /^fs$/, replacement: shim("empty-fs.js") },
      ...["buffer", "process", "global"].map((name) => ({
        find: new RegExp(`^vite-plugin-node-polyfills/shims/${name}$`),
        replacement: require.resolve(
          `vite-plugin-node-polyfills/shims/${name}`,
        ),
      })),
    ],
  },
  optimizeDeps: { include: ["@bisik/sdk"] },
  build: { target: "es2022", chunkSizeWarningLimit: 1800 },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
