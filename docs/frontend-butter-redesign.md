# Butter reference redesign · 11 October 2026

Dien requested a new frontend following Butter's visual design, typefaces and art direction, while keeping Bisik's existing illustration assets, explanation content, section order and app flows.

## Locations

- Current application: `apps/web`.
- Original frontend: `apps/web-backup`, a directory rename preserving the original sources, assets, `.env` symlink, build outputs and local review evidence.
- Original design guidance: `apps/web-backup/DESIGN.md`.
- The pnpm workspace explicitly excludes `apps/web-backup` so there is only one `@bisik/web` package.
- Local development dependencies are shared through `apps/web/node_modules → ../web-backup/node_modules`. The app's source and assets are independent of the backup. A clean pnpm install uses the existing `apps/web` lockfile importer and recreates ordinary dependencies.

## Reference evidence

- https://www.butter.video/ inspected live in Chrome at 1440 × 1000.
- https://www.awwwards.com/sites/butter#typography inspected live in Chrome. The current award page lists palette `#1E1E1E` / `#F7F7F7`; the hash does not expose a separate typography section.
- Computed Butter typography: DieGrotesk 400 for navigation and display, ABCDiatype 400 as its secondary typeface. Heading size at 1440px: approximately 108px; section headings approximately 60px.
- Exact fonts load from Butter's public CDN, with Arial fallback. Font binaries are not copied into this repository. Rendering the exact font requires that CDN to remain accessible; replacing it with self-hosting requires licensed font files.

## Implementation

`src/styles.css` replaces the old grid, ultramarine fields, bold system typography and frame/inset-card treatment. The new world has a gray-to-white opening, centered regular grotesk display type, floating navigation islands, black CTA buttons, soft large corners and neutral surfaces. Dark mode adapts this world with the existing saved preference.

`src/components/landing-header.tsx` owns the floating navigation, compact scroll state, expanded section menu, Escape dismissal, theme control and app entry.

`src/pages/Landing.tsx` preserves the original section order: mechanism, why private insider information matters, four protocol parts, not a prediction market, payouts, flow, source and footer. The existing signal streams, encrypted values, group members and support bars remain the illustrations. The hero presents these streams on overlapping signal sheets and has a labelled synthetic reveal toggle. No Butter illustrations, logos, testimonials or customer claims are imported.

The wallet, routes, RPC/API access, proof generation, staking, auction, decryption and payout implementations are retained. This redesign does not change the protocol.

## Preview and rollback

From `Bisik`, run `pnpm --filter @bisik/web dev --port 5174`. The review preview uses http://127.0.0.1:5174/.

To restore the original frontend without deleting the redesign, stop the frontend server, rename `apps/web` to `apps/web-butter`, rename `apps/web-backup` to `apps/web`, and update the workspace exclusion to `!apps/web-butter`. The original `.env` symlink remains valid at its original directory depth.

## Validation

Production build and TypeScript checking pass. The three existing amount/encryption tests pass via `node --import tsx --test src/lib/*.test.ts` (the tsx CLI's IPC socket is blocked by the local sandbox).

Browser review covers desktop 1440 × 1000 and mobile 390 × 844, light/dark theme, loaded fonts, synthetic hero reveal, navigation menu and Escape dismissal, buyer demo decryption and create form. Layout checks at widths 320, 390, 768, 1024, 1440 and 1920 show no horizontal overflow; no browser runtime errors were observed. The independent finish reviewer scored the mobile-tooltip and navigation-transition fixes resolved, with final disposition Ship at the scope of those fixes. Evidence is stored locally under `apps/web/.review/butter/` and is ignored by git. A layout review is not a new end-to-end devnet transaction run.

No commit, push or deployment was performed.
