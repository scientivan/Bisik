// @arcium-hq/client does `import anchor from "@anchor-lang/core"`, but Anchor's browser build
// has no default export. In the web bundle, alias the exact specifier "@anchor-lang/core" to this
// file so both named and default imports resolve. See docs/web-sdk-bundling.md.
import * as anchor from "@anchor-lang/core/dist/browser/index.js";
export * from "@anchor-lang/core/dist/browser/index.js";
export default anchor;
