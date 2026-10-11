# Implemented frontend design system

Recorded 11 October 2026 after the Sonogram finish review. This is an implementation companion to [DESIGN.md](../DESIGN.md), the authoritative approved visual system, and [PRODUCT.md](../PRODUCT.md), the authoritative product constraints. It does not replace their tokens, motion, preferences or decisions. Operational setup and testing remain in [frontend-implementation.md](frontend-implementation.md).

## Overview

The implemented world is **Sonogram Bisikan / The Whisper Sonogram**, approved seed `a44053e7`. The direction contract in `apps/web/index.html` leads with private signals becoming readable for their buyer. Landing tells the mechanism first; app routes extend the same framed-panel language to scout, buyer, identity, positions, market creation, team and operator flows.

The artifact uses procedural sonogram columns and original inline SVG mark/icons. No raster asset ships as an illustration. Review PNGs are evidence captures, not product assets. The final review verdict ships the two scored corrections: the actual public strength histogram and amber “Operator reads” pills. That verdict covers those corrections, not completion or independent verification of every product flow.

## Colors

Use the canonical palette in DESIGN.md. The stylesheet exposes `--bone`, `--sheet`, `--frame`, `--ink`, `--blue` (canonical ultramarine) and `--amber`; remaining approved colors are literal CSS values. These aliases describe implementation, not a replacement token taxonomy.

| Meaning | Implemented presentation | Data boundary |
|---|---|---|
| Sealed | Ink pill with bone text; hatched value or grey sonogram strip | Team, supported option and reason remain unreadable in the pre-purchase view. Dark-card sealed pills invert for contrast. |
| Yours | Amber pill and revealed sonogram | Buyer-visible allocated content. The label accompanies color. |
| Operator reads | Amber `yours` variant with explicit visibility text | Raw scout reason is readable by the operator service. This is not a public-value label or a promise of browser-only secrecy. |
| Public | Sheet pill with ink outline | Public record fields and counts. On dark cards, the pill is transparent with light text and border. |
| Active/action | Ultramarine field or `blue` pill | Primary controls, lifecycle stage, verification/tier labels and numeric weight badge; color alone does not establish disclosure. |

**Visibility remains explicit.** A blue weight badge in a revealed row is paired with the amber Yours state and revealed strip. Do not infer confidentiality from badge color alone. Amber also retains the approved landing stake-return and payout uses; this companion does not narrow DESIGN.md’s established exceptions.

## Typography

The implemented stack is Apple system / SF Pro, Inter fallback, Helvetica Neue and sans-serif. `index.html` requests Inter weights 500, 600, 700 and 800. Body is 17px/1.5 at 500; labels and controls use 600–700; headings use 700 and payout numerals use 800. Amounts and addresses remain in this stack, with tabular figures globally enabled.

Desktop hierarchy: landing display 80px/0.98, section title 52px/1.02, app title 42px/1.05, card title 24px/1.2. Payout numerals range from 76px to the principal 128px. Headings balance; paragraphs cap at 70ch. The phone hierarchy reduces display to 52px, section title to 38px and app title to 34px. These are observations of `styles.css`; DESIGN.md remains the source for future typography choices.

## Layout

A 1280px maximum container has 32px side padding, reduced to 16px at 600px. The bone page grid uses 32px cells. App pages begin with a title, supporting notes/status, then wrapping main and side columns: main flex basis 600px and side basis 340px. Both have `min-width: 0`; long details wrap inside panels.

| Width | Implemented reflow |
|---|---|
| Above 900px | Landing mechanism is two columns; parts are two columns; flow/source/market cards are three columns; payout bento has four columns. App columns wrap when available width requires it. |
| At or below 900px | Hero display becomes 64px; reveal line moves from 74% to 80%; three-column card grids become two columns. |
| At or below 600px | Landing mechanism, parts and flow/source/market grids become single columns. Team picker stacks. App navigation wraps; landing section navigation is hidden. Hero reveal moves to 84%, its pill hides, and the lifecycle rail wraps. Payout grid remains two columns, with principal and stake-return cards spanning both. |

Landing sections use 120px top spacing, reduced to 76px on phones. Frames have an 8px inset, panels use 24px padding (18px on phones), and common app stacks/columns use 20px gaps. Disclosure rows wrap so labels fit narrow operating panels. This is responsive reflow of the approved structure, not a separate mobile identity.

## Elevation & Depth

Depth is the frame-plus-inset-panel construction and 1px borders. Implemented shared frames have no box shadow; DESIGN.md permits an optional soft offset shadow, so its absence is not a revised prohibition. Ink and blue cards sit within the same light page field. No blur or glass layer is used.

## Shapes

Shared frames use 18px corners, panels/controls 12px, selected team toggles 14px and pills fully round. Histogram bars have 6px top corners; signal strips clip at 10px. The original four-bar SVG mark changes its accent between blue and amber according to its ground. `Icon` provides consistent decorative stroke SVGs and hides them from assistive technology.

Sonogram columns are generated deterministically in `Sonogram`, using solid cell bands assembled into CSS gradients and a duplicated track. These are procedural geometry, not fetched image assets or a chart of confidential weights. Sealed rows use the same seed and muted noise; the strip must not reveal which option is strong. Revealed strips use amber and differing seeds for the illustrative signal material.

## Components

The reusable implementation lives in `apps/web/src/components/ui.tsx`, with styles in `apps/web/src/styles.css`.

| Component/pattern | Implemented behavior and states |
|---|---|
| `Frame` | Outer shell contains a sheet `panel`; optional title/body caption below. Used for real records, form fragments and signal lists. |
| `Note` | Framed caveat, status or feedback block; optional strong title and dark variant. Long errors wrap. |
| `Pill` | Public default; sealed, yours and blue variants. Labels describe visibility or state in words. |
| Buttons | Primary blue, bone-on-blue, ink, outline and blue-outline variants. Standard minimum height 52px, compact 44px. Hover and focus are CSS states; disabled buttons have muted text, bone fill, rule border and a not-allowed cursor. Unlock labels include “After purchase” and “After allocation”. |
| Fields/team picker | Visible labels, full-width bone inputs, vertical-resize textarea, deep-blue inputs in bid cards. Selected team buttons use blue and `aria-pressed`. Counter and analysis result remain near the reason field. |
| `Header` | Home wordmark, section navigation on landing, six app navigation links elsewhere. Active app link has a frame fill. Skip link becomes visible on focus. Wallet controls show shortened connected address or open selection. |
| Wallet selection | Inline Note lists available Wallet Standard wallets, with Cancel. If none are discovered, it gives Phantom/Wallet Standard instructions. Busy/error feedback follows the header; connected control disconnects. |
| `StatusStrip` | Framed clock tile, status/countdown and keeper explanation; seven-step wrapping lifecycle, with current stage blue and `aria-current="step"`. Demo omits the countdown. |
| Public histogram | Weak/Medium/Strong bins, literal counts and text summary; heights scale to the largest count with denominator at least one. Colors use pale/mid/full blue, not win/loss colors. Bins describe the entire market and are never paired with a sealed option. With no preview, an availability message replaces the figure. |
| Signal row | Before reveal: numbered option/category, Team sealed pill, uniform grey strip and hatch. After reveal: accessible allocated team, weight, filtered reasons and claims, amber Yours pill and strip. “Seal again” hides the local presentation; it does not revoke knowledge already obtained. |
| `Feedback` | Polite atomic live region: busy Note with spinner and keep-open instruction, error Note, or completed-action Note. No green/red result system. |

The stream translates right to left over its configured duration (48s default). Hatches move over 1.6s, revealed content uses a 0.7s clip reveal, member dots pulse over 4.2s, and spinner rotates over 1s. Supported browsers also apply a view-timeline reveal to landing sections. Reduced-motion disables animation and transitions and removes section/revealed-content clipping. Focus is a 2px blue outline with 3px offset; selection is amber with ink text and input caret is blue.

### Real routes and the synthetic walkthrough

`/demo` is a fixed synthetic buyer fixture with a local interactive reveal. Its note appears before market UI and says team names, reasons and weights are synthetic and wallet transactions are disabled. It uses market 3, three options, strength counts 1 weak / 0 medium / 2 strong, reserve 100 and flat 90 mock USDC. Reveal constructs fixture content locally and reports that no transaction was sent. It demonstrates visual states, not live MPC, allocation ownership, real demand or a verified GitHub record. Header wallet selection is shared, but demo purchase/transaction controls are disabled.

`/markets`, `/markets/:id`, `/buyer/markets/:id`, `/scout/onboard`, `/scout/positions`, `/create`, `/team` and `/admin` retain actual server/wallet/program dependencies. Live buyer reveal is gated on allocation and selection progression; it authenticates, obtains reasons for the allocation, and decrypts weights using a saved local view key. The UI explicitly distinguishes weights decrypted with the buyer key from reasons served to the allocation.

### Empty, loading and error states

The market list presents loading, retryable load error and a framed “No markets in this stage” state. Buyer/scout routes show their market loading or missing/error notes. Route modules have an “Opening page” Suspense note; an application boundary offers Reload page on render error; unknown paths offer Open markets. Actions use shared Feedback rather than silently replacing content. Disabled controls preserve their gating conditions in surrounding copy and, where implemented, their labels.

### Identity, group and ownership continuity

Onboarding first creates a local private identity; its public commitment, verified tier/epoch and Reclaim verification status appear in framed records. The browser supports export and restore of a private backup containing scout identity and position records. Restore verifies the secret’s commitment and refuses replacing a different existing identity until its backup is exported and storage cleared. The keep-safe note states that anyone with the backup can claim the positions. This is an ownership requirement, not a decorative profile state.

Normal staking requires a sufficiently populated tier group (five by default) and membership; configured demo mode can bypass the normal population gate. A position record stores the root and leaf snapshot used when staking. Positions rebuild that original snapshot for later proofs; legacy records without leaves search historical prefixes of current group leaves for a matching root. Failure asks for the backup made when staked. Ownership answers bind action, request ID, accept decision and content to the position proof. Preserve these distinctions when presenting restore, introduction, dispute and claim states; a current group root cannot simply replace the original root.

## Do's and Don'ts

- Do read DESIGN.md and PRODUCT.md before extending a screen; this companion records implementation only.
- Do keep every private field’s visibility label beside its presentation, including the operator’s access to reasons.
- Do retain synthetic disclosures and mock-USDC language where the code uses fixtures or devnet tokens.
- Do keep public histogram bins separate from sealed option rows and retain unavailable/empty states.
- Do preserve original position snapshots and ownership backup instructions in their real flows.
- Don’t turn review screenshots, fixed demo scores, fixture team names, incidental styles or route-specific copy into new product claims or normative design tokens.
- Don’t replace the approved system stack or motion with detector preferences; the owner’s recorded decisions remain authoritative.

Evidence: `apps/web/index.html`, `src/styles.css`, `src/components/ui.tsx`, `src/App.tsx` and the corresponding page modules; `.impeccable/review/finish-review.md` and `finish-verdict.md`. Captures include landing desktop/mobile, demo sealed desktop/mobile, revealed desktop/mobile, scout desktop/mobile, onboard desktop/mobile and analysis desktop/mobile. Analysis-result captures are synthetic visual QA evidence. No new visual decision is introduced by this document.

Confirmed bid refunds disable the refund action and display “Bid refund completed”. Dispute decisions display the actual onchain state; unconfirmed or resolved disputes cannot be resolved from the console.

### Theme and fullscreen extension, 11 October 2026

The user requested dark mode, viewport-complete hero and interaction animation. The canonical extension is now recorded in DESIGN.md. Shared neutral surfaces and text use semantic CSS tokens; `lib/theme.tsx` supplies a persisted theme to both headers and procedural sonograms. The inline head initializer prevents a theme flash. Ultramarine and amber fields keep their original roles. The hero fits header, copy and rail to the dynamic viewport, with proportional fitting limited to the opening at extreme zoom. `lib/motion.ts` handles viewport fitting and intersection-triggered motion. Viewport sizing equivalent to desktop browser zoom 25–500% was checked in Chrome, alongside mobile, theme persistence, demo decryption and reduced motion. This is viewport simulation, not a claim of exhaustive native browser zoom testing.
