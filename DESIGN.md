---
name: Bisik
description: Private, stake-backed insider signals in the Butter visual world.
colors:
  bone: "#F7F7F7"
  sheet: "#FFFFFF"
  frame: "#EDEDED"
  ink: "#0F0F0F"
  ink-soft: "#555555"
  charcoal: "#1E1E1E"
  rule: "#D9D9D9"
  rule-soft: "#E5E5E5"
  hatch-light: "#A9A9A9"
  amber: "#FFB547"
  lavender: "#BBA9F5"
  lavender-panel: "#E4DDFF"
  dark-bone: "#141414"
  dark-sheet: "#1E1E1E"
  dark-frame: "#282828"
  dark-ink: "#F7F7F7"
  dark-ink-soft: "#B8B8B8"
  dark-rule: "#444444"
  dark-rule-soft: "#343434"
  dark-hatch-light: "#6B6B6B"
typography:
  display:
    fontFamily: "DieGrotesk, Arial, sans-serif"
    fontSize: "clamp(54px, 7.47vw, 116px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "DieGrotesk, Arial, sans-serif"
    fontSize: "clamp(38px, 4.4vw, 64px)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "DieGrotesk, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DieGrotesk, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DieGrotesk, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.3
  data:
    fontFamily: "ABCDiatype, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  app-title:
    fontFamily: "DieGrotesk, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.03em"
rounded:
  pill: "8px"
  control: "16px"
  control-small: "11px"
  field: "11px"
  navigation: "18px"
  panel: "28px"
  app-panel: "20px"
  sheet: "25px"
  bar: "6px"
spacing:
  panel: "32px"
  card: "30px"
  app-panel: "22px"
  grid: "24px"
  stack: "18px"
  gutter: "clamp(20px, 4.55vw, 72px)"
  section: "clamp(90px, 10vw, 160px)"
components:
  button-primary:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.bone}"
    rounded: "{rounded.control}"
    height: "50px"
    padding: "0 28px"
  button-light:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.control}"
    height: "50px"
    padding: "0 28px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "50px"
    padding: "0 28px"
  panel:
    backgroundColor: "{colors.frame}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  panel-dark:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.bone}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  pill-sealed:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.bone}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  pill-yours:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.charcoal}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  pill-public:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  input:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "42px"
    padding: "10px 13px"
---

# Design System: Bisik

## Overview

**Creative North Star: "Butter, carrying Bisik's whispers"**

Dien's direction of 11 October 2026 replaces the Sonogram/Halyard visual identity with [Butter](https://www.butter.video/) and its [Awwwards reference](https://www.awwwards.com/sites/butter#typography). The world is neutral, spacious and sculptural: a gray-to-white opening, large centered regular grotesk type, two floating navigation islands and smooth black illustration panels. Bisik's own signal streams, encrypted values, support bars, members and explanations remain its content and imagery. Matching this direction does not imply pixel identity with Butter: Bisik has different content, assets and operational screens.

The mechanism is the product; builder sourcing is its first example. Visual states make privacy legible without implying that illustration effects enforce encryption. The landing gives explanations room, while the app uses smaller type and denser controls for wallets, proofs, bidding, decryption and claims.

**Key Characteristics:**

- Neutral surfaces, regular display type and generous whitespace.
- Independent floating navigation islands that compact after scrolling.
- Bisik signal art on overlapping hero sheets and smooth illustration panels with captions below.
- Amber marks revealed access and returned value; lavender supports the artwork.
- Explicit sealed, yours and public states, with synthetic examples labelled.
- The same visual identity in light and dark themes, with practical app density.

This document describes the implemented `apps/web`. Read [PRODUCT.md](PRODUCT.md) for durable product truth and [README.md](README.md) for trust assumptions. The implementation record and reference inspection are in [frontend-butter-redesign.md](docs/frontend-butter-redesign.md). The complete previous design remains intact in [the backup](apps/web-backup/DESIGN.md); old mockups under `docs/design-reference/` are historical, not the current visual authority. Sources are [styles.css](apps/web/src/styles.css), [Landing.tsx](apps/web/src/pages/Landing.tsx), [landing-header.tsx](apps/web/src/components/landing-header.tsx), [ui.tsx](apps/web/src/components/ui.tsx) and [tailwind.config.js](apps/web/tailwind.config.js). CSS overrides determine rendered sizes when they differ from Tailwind's convenience scale. Extension tokens and component previews live in [.impeccable/design.json](.impeccable/design.json).

## Colors

The dominant identity is pale neutral ground and charcoal, with restrained semantic amber and supporting lavender. Frontmatter values are normative; dark tokens replace the corresponding light CSS variables.

### Primary

- **Charcoal:** primary actions, sealed pills, dark illustration panels and operational bid cards. The historical CSS variable `--blue` and Tailwind `ultramarine` names now map to charcoal; they do not prescribe blue.
- **Amber:** yours/revealed pills, the revealed stream, unlocked hero sheet, the allocation underline, payout split and stake-return panel. Selection and small lock accents also use amber in the current implementation.

### Secondary

- **Lavender:** the supporting signal stream and pale members/tier details inside black protocol panels. It is supporting art, not an access permission.

### Neutral

- **Bone / Sheet / Frame:** page ground, white app cards and gentle gray landing containers.
- **Ink / Soft Ink:** primary text and secondary explanations.
- **Rule / Soft Rule / Hatch Light:** field boundaries, row separators and muted sealed graphics.
- **Dark counterparts:** charcoal ground, deeper panels, pale text and quieter gray separators. Black illustration fields and semantic amber remain recognizable in both themes.

**The Access State Rule.** State is communicated in words as well as color. Sealed means lock/ciphertext or a sealed label, Yours means authorized readable content, and Public means a plain outlined label. An operator-readable reason must say who reads it; amber alone must never imply only the buyer can read it.

## Typography

**Display and Body Font:** DieGrotesk (Arial, sans-serif fallback). **Data Font:** ABCDiatype (Arial, sans-serif fallback), currently used for ciphertext rather than every number or address. Both loaded faces have regular weight (400), with `font-synthesis: none`. Headings, body, labels and even `strong` use regular weight; hierarchy comes from scale, spacing and placement.

The exact faces are referenced by `@font-face` from Butter's public CDN, with `font-display: swap`:

- DieGrotesk: `https://marketing.butter.video/_next/static/media/5fb8d156cdd6d753-s.p.woff2`
- ABCDiatype: `https://marketing.butter.video/_next/static/media/da60608f2183158e-s.p.woff2`

Font binaries are not copied into the repository. Exact typography depends on CDN availability. Self-hosting would require licensed font files; preserve the Arial fallback. Old SF Pro, bold-only and pastel/gradient prohibitions are superseded by this direction.

### Hierarchy

- **Display:** centered hero headline using the frontmatter display role; mobile overrides are described below.
- **Headline / Title:** regular section and card headings, balanced wrapping and tight tracking. Section explanation text is larger than app copy (21px desktop; 18px mobile).
- **Body:** readable prose with a general maximum measure of 70ch; the hero lead scales from 18px to 24px, with line-height 1.3 on desktop.
- **Label / Data:** compact state text and encrypted value text; navigation uses 17px on desktop. Numbers retain tabular figures.
- **App:** page title is 30px, section heading 22px, body/fields/actions commonly 14px and metadata 12px. At mobile the page title becomes 27px. Large payout numerals are regular and scale independently; the principal percentage reaches 160px on desktop.

## Layout

The shared container caps at 1440px with fluid gutters. Landing sections use the fluid section spacing token, centered heading blocks and broad gaps; paired text/illustration sections use a two-column ratio of 1 to 1.15. Protocol parts form two columns. Why, flow and source cards form three columns. Payouts form a four-column composition with a large two-column/two-row main panel.

The opening has a minimum height of 100svh, a light gradient from `#d7d7d7` through `#ebebeb` to the page ground, and centered overlapping signal sheets above the copy. Dark mode uses `#303030` through the dark sheet to the dark ground. The lifecycle rail is normal flow and wraps. Content may extend beyond a short viewport; do not reintroduce absolute bottom positioning or assume the previous fullscreen fitting behavior still applies.

Preserve the implemented landing order: hero → mechanism → why insider signals matter → four parts → not a prediction market → payouts → flow → source → footer invitation and metadata. Preserve the original Bisik explanations and illustration assets. Butter's visual direction does not authorize replacing them with Butter's customer content or artwork.

App screens keep role tabs, a compact page title/status strip and wrapping main/side columns with bases of 600px and 280px. They use white bordered containers instead of applying landing display scale to forms. Market tables become stacked records on narrow screens; create forms and wallet controls wrap to remain usable.

### Responsive boundaries

- **1600px and above:** more top breathing room and a taller hero art area.
- **1100px and below:** navigation tightens; position/admin columns stack; five-field forms reduce to three columns.
- **800px and below:** inline section links disappear; the menu remains. Paired sections, why/flow/source/market grids, market records and form grids stack. Hero display uses `clamp(50px, 8vw, 64px)`.
- **560px and below:** 20px content gutters, tighter floating header with 16px outer margins, resized signal sheets, single-column protocol parts and a two-column payout grid. Hero display uses `clamp(38px, 10.8vw, 59px)` with line-height 1.04. App panels tighten to 18px padding and team choices stack.
- **360px and below:** hero sheet positioning and navigation spacing tighten further.

Browser evidence is local at `apps/web/.review/butter/`, including desktop/mobile, dark, demo and create views. This evidence documents visual review at the recorded viewports; it is not evidence of every native browser zoom level or a rerun of live transactions.

## Elevation & Depth

Most depth comes from tonal surfaces and overlapping artwork. Broad rounded panels are flat; app boundaries use light strokes. There is no page grid or old frame-with-inset-panel construction. Shadows are localized: the tilted hero sheets use `0 22px 35px -20px #0009`, the expanded menu uses `0 20px 40px -20px #0004`, and the encrypted explanation tooltip uses `0 12px 28px -12px #0008`.

## Shapes

Smooth, large corners frame illustration panels; smaller rounded rectangles hold controls, fields and status labels. The landing panel radius is the frontmatter panel token; mobile reduces it to 23px. App panels use the app-panel token, buttons reduce to 12px, and state pills are small rounded rectangles rather than capsules. Hero sheets use the sheet token on desktop and 20px on mobile. Captions sit beneath the illustration panel, without an extra enclosing frame.

## Components

### Buttons and fields

Primary buttons are charcoal with pale text; dark mode reverses ordinary primary buttons to pale with charcoal text. Light buttons sit on black panels; outline buttons retain a neutral stroke. Hover changes the fill, active buttons scale to 0.97, and disabled buttons use muted frame/soft-ink colors. Landing controls use the frontmatter dimensions; app buttons are 42px minimum height with 18px horizontal padding and smaller type. Fields have a neutral stroke, page-ground fill and their own visible labels; textarea remains vertically resizable.

Global keyboard focus uses a two-pixel theme accent outline with a five-pixel offset. Keep the skip link, meaningful field labels, wallet feedback and busy/disabled states. Action feedback is an atomic polite live region.

### Navigation

The landing has two independent floating islands: the wordmark/section menu on the left and theme/app controls on the right. They sit 24px from the top on desktop and compact once scroll exceeds 100px. Hidden compact links are also hidden from keyboard navigation. The expanded menu keeps section links and a buyer demo entry; Escape closes it and returns focus to the toggle. Follow native button keyboard activation and preserve `aria-expanded`/`aria-controls`. The operational app uses its existing role navigation and wallet header.

### Panels, pills and sealed values

Landing illustration panels carry captions underneath; protocol parts use black backgrounds with lavender support details. App cards are bordered neutral surfaces with compact inner padding. Notes carry explanatory copy and trust assumptions. Public pills are outlined, sealed pills are charcoal, and yours pills are amber; inside dark cards, inverted sealed pills and darker public pills preserve readability.

Ciphertext is a focusable lock/value treatment with an accessible explanation. Its tooltip appears on hover or keyboard focus, is right-aligned and caps width at the smaller of 260px and 75vw. Explain why each particular value is locked rather than showing meaningless decorative secrecy. Use market-wide strength bars/counts before allocation; never map a preview strength to a sealed option.

### Signal artwork and motion

The hero adapts existing Bisik signal streams into three tilted overlapping sheets. Its front sheet is a native button labelled as a synthetic demo; click, Enter or Space toggles sealed/revealed state, updates `aria-pressed` and announces its caption politely. This local demonstration does not submit a transaction or grant access to live signals. The actual buyer decryption flow remains separate.

Streams move right to left and pause when offscreen or the document is hidden. Ciphertext changes every 160ms when reduced motion is off. Section headings move into place once on entry; percentage/histogram fills use the existing entry animation. Authorized content reveals with the existing 0.7s clipped animation. Sheet hover uses the existing 0.6s easing, and control/menu/tooltip state changes use short transitions. Keep layout dimensions stable through interactions. Under reduced motion, animations/transitions are disabled, smooth scrolling becomes immediate and ciphertext remains static; content and interaction remain available.

## Do's and Don'ts

### Do:

- **Do** follow Butter's neutral palette, regular type, generous spacing, floating islands and smooth illustration panels.
- **Do** preserve Bisik's assets, explanation content, section order, saved theme preference and app routes/flows.
- **Do** distinguish sealed, yours and public states with explicit labels and accessible explanations.
- **Do** label synthetic/demo content and show operator visibility and funding traceability honestly.
- **Do** keep app typography compact and controls usable at narrow widths and keyboard focus.
- **Do** retain exact payment truth: buyer payments are not refunded; wrong calls alone are not slashed; proven hoax stakes go to charity.

### Don't:

- **Don't** revive the previous Sonogram/Halyard typography, ultramarine page fields, grid texture or inset-frame identity as current requirements.
- **Don't** import Butter logos, illustrations, testimonials or invented customer/partner claims.
- **Don't** imply a decorative reveal is live decryption, or show a sealed team, per-option support or unallocated reason before authorization.
- **Don't** call buyer rewards payment only when a team ships; the default pool can go to the strongest purchased signal when no option succeeds.
- **Don't** present the private-document prohibition or team self-registration as enforced features; the former is policy and the latter remains unsupported.
- **Don't** use gambling/trading language, price charts or red/green win-loss coloring.
- **Don't** claim the verifier never sees identity or reasons: it sees the GitHub username briefly, reads reasons for scoring and decides hoax disputes.


## Market list clarity · 11 October 2026

Dien removed the role-description/page-link bar below the app header. Buyer and scout listings use plain explanations: round ID and category are reference metadata; proposed teams are possible answers to the question; staked calls are submissions, not a count of unique scouts. Total deposits and market-wide support buckets are separate. Synthetic demo rounds have distinct illustrative questions labelled Demo question; the server metadata and onchain questions are unchanged. The scout column is Stake per call, with a prominent min–max USDC range and a separate refundable-after-settlement note that explains the proven-hoax exception. Buyer pricing separates the minimum exclusive bid from shared access.

## Wallet actions · 11 October 2026

Disconnected wallet-required actions use the label **Connect Wallet** and open one shared modal picker. Connected actions retain their original labels and validation. Connection never automatically signs or submits. Show wallet-specific retry guidance after rejection, devnet context, waiting state and separate-approval explanation. The modal supports Escape, trapped keyboard focus, focus restoration and mobile scrolling. Local actions and synthetic walkthrough actions do not require connection. Details: `docs/wallet-connection.md`.

## Team participation · 12 October 2026

Dien deferred the Team page and removed its automatic payment share. App navigation has Buyer, Scout and Operator. Payout artwork shows 85% scouts and 15% platform. Teams need no account to be proposed; consent and deploy-wallet ownership are requested when introductions or deployment evidence are needed. The revised onchain rule is active after the devnet upgrade on 12 October (slot 510110372).

## Role workspaces · 12 October 2026

Dien requested contextual navigation using three reference screenshots. The app header now has a left-side menu of actions and a right-side grouped selector labelled “Use Bisik as”. Each role shows an icon, role name and purpose: Buyer / Buy signals, Scout / Sell insights, Operator / Manage Bisik. Role choice uses a filled state; the current action uses an underline. On screens under 1000px the role selector precedes the purpose and action menu. Keep 44px minimum targets, wrap menus at narrow widths, and use native link semantics with separate active role/page announcements. Role selection changes the workspace route, never wallet permissions. This replaces the earlier bare role tabs while keeping the removed standalone role bar absent.

## Guide, walkthrough and profile · 12 October 2026

Dien found the numbered role-flow chips on working pages overstimulating. Pages now show one quiet line, "Step N of M for buyers/scouts", with the current step and a "How this works" link to `/guide?role=…#step-N`. The full explanation lives on `/guide` (Read mode): a Buyer/Scout switch, a game-style walkthrough, then the numbered steps with a sealed/yours/public "who sees what" list and a link to the real page.

The walkthrough (`components/walkthrough.tsx`) runs six quests per role inside a dashed sandbox copy of app UI. The target control carries an amber pulsing ring. A dark coach panel gives the instruction and, after the action, "What just happened" in amber with the mechanism explained. Progress dashes turn amber when done. Everything is local and synthetic, labelled as such; nothing is signed or sent. Reduced motion removes the pulse and entry animations.

`/profile` shows one side at a time: As a buyer (public to scouts; pseudonym derived from the onchain pseudonym hash, operator verification and a track record recomputed in the browser from Bid, OutcomeRecord and Dispute accounts) or As a scout (tier, epoch and positions from this device only, encrypted track record). The two sides are never rendered together, and the scout side recommends a separate wallet. Scouts can open a buyer's public record at `/profile/buyer/<address>`. The header carries "How it works" and "Profile" links.

## Single-row app header · 12 October 2026

Dien asked for a shorter header. The app header is one row: wordmark and the current role's tools on the left (active tool underlined); on the right a compact role switch (icon and role name, the purpose kept as title and screen-reader text), a divider, How it works, Profile, theme and wallet. The "Use Bisik as" label and the role purpose sentence are removed; the guide carries that explanation. It is 60px tall at 1440px. At 1180px and below the role tools drop to a second row; at 760px and below the order is wordmark, theme and wallet, then the full-width role switch, then the help links, then the tools. This supersedes the two-part layout described under "Role workspaces".

## Profile packaging and info tips · 12 October 2026

Dien found the first profile read like raw information. Secondary explanations now sit behind an info icon (`components/info-tip.tsx`): a dark tooltip with an amber title, opened on hover or keyboard focus, and pinned to the bottom of the screen below 560px so it never overflows. The profile has a compact title row with the buyer/scout switch on the right. An identity card leads each side: a 5×5 mirrored block mark drawn from the buyer pseudonym hash (amber accent cell) or a three-bar tier mark for scouts, the name, a wallet chip, a status pill and a copy-link action. Below it sit bento number cards (pill label, 52px regular number, a mini visual such as lock icons or a segmented bar with legend, and one plain sentence), then for scouts an epoch card with a progress track and next-result status. Notes use a gray note card with an icon and a dark first sentence. The buyer "Try demo" tool was removed; the walkthrough on `/guide` replaces it, while `/demo` stays reachable by URL.

## Dark default, verification gate and live data · 12 October 2026

Dark is the default theme for every visitor. Light applies only after the visitor presses the theme toggle, saved as `bisik:theme-choice` (the old `bisik:theme` key was written on every load and is ignored). In dark mode the walkthrough coach and info tooltips use a near-black fill with a 1px border so they separate from dark cards.

The scout "Get verified" tab is gone. Unverified scouts can read any market; pressing stake or add team sends them to `/scout/onboard?next=…`, which offers a Continue button back once they are verified. The profile keeps its own Get verified entry.

Market data no longer polls on timers. The server keeps markets in memory, rebuilds them when a confirmed program transaction appears (log subscription on the scan RPC, with a two-minute safety refresh), and pushes a data version over `/v1/events`. Pages remember the last response for instant rendering and refetch only when the version changes.
