---
name: Bisik
description: Private, stake-backed insider signals on Solana. Insiders whisper, buyers pay to listen.
colors:
  bone: "#F3F2EC"
  sheet: "#FBFAF6"
  frame: "#E8E7DF"
  rule: "#DCDBD2"
  rule-soft: "#E6E5DD"
  grid-line: "#E6E5DC"
  ink: "#111318"
  ink-soft: "#2B2E36"
  hatch-light: "#C9C8BF"
  ultramarine: "#2A2FD0"
  ultramarine-deep: "#1B1F96"
  ultramarine-mid: "#6E72E6"
  ultramarine-pale: "#B9BCF3"
  on-ultramarine: "#E9EAFB"
  amber: "#FFB547"
  dark-row: "#1E2129"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', sans-serif"
    fontSize: "80px"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', sans-serif"
    fontSize: "52px"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
  numeral:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', sans-serif"
    fontSize: "76px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.045em"
    fontFeature: "'tnum' 1"
rounded:
  pill: "999px"
  frame: "18px"
  panel: "12px"
  control: "12px"
  row: "9px"
  bar: "6px"
spacing:
  frame-inset: "8px"
  panel: "18px"
  card: "24px"
  section: "120px"
  gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.bone}"
    rounded: "{rounded.control}"
    height: "52px"
    padding: "0 24px"
  button-on-blue:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "52px"
    padding: "0 24px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  card-frame:
    backgroundColor: "{colors.frame}"
    rounded: "{rounded.frame}"
    padding: "{spacing.frame-inset}"
  card-panel:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  pill-sealed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  pill-yours:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
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
    rounded: "{rounded.control}"
    height: "52px"
    padding: "0 16px"
---

# Design System: Bisik

This file is the single source of truth for Bisik's frontend look, written so that an AI agent with no prior context can build new screens that match. Read it fully before touching `apps/web`.

- **Approved visual reference (live, interactive):** https://claude.ai/artifact/9vRNtrmSEyg12kQ674y6DG (public link). It is a canvas with three artboards: Landing, App · Buyer market, App · Scout stake. Use Play on the market screen to try "Decrypt my view".
- **Reference source in this repo:** `docs/design-reference/Main.dc.html` (landing), `Market.dc.html` (buyer market screen), `Stake.dc.html` (scout stake screen). These are mockups in a canvas format (`.dc.html`: plain HTML with inline styles, plus a small `renderVals()` class that generates the sonogram columns). Treat their inline styles as the exact values to reproduce in React + Tailwind.
- **Product context:** `PRODUCT.md` (who the users are, what the mechanism is, what claims are allowed). Trust assumptions are listed in `README.md`.
- **Owner of taste decisions:** Dien (the founder). Every rule below was either stated by Dien or approved by Dien after review, unless marked *(agent default)*.

## Overview

**Creative North Star: "The Whisper Sonogram"**

Bisik sells secrets without revealing who told them. The visual world is a printed sound sonogram: a quiet signal that only resolves into readable bands for the buyer who paid. Encrypted data is shown as faint or hatched bands, data revealed to the current user turns amber, and public data stays plain ink. The page is calm, light, and precise, but alive: signals stream across the screen and sections "decrypt" into view as you scroll.

The core message is the **mechanism**, not the use case. Builder sourcing between rival ecosystems is only the first use case. Every surface should help a hackathon judge understand within seconds that insider calls stay sealed while they are staked, aggregated, auctioned and paid.

The layout structure follows the Halyard landing and app (https://halyard-bnb.vercel.app/, source https://github.com/wngstnr-code/halyard), which Dien chose as the structural reference. Only the section structure is borrowed. Halyard's content, colors (silver and navy), font (Satoshi), concentric ripple motifs and neumorphic shadows must **not** be copied.

**Key characteristics**

- Light bone ground with a clean 32px cell-grid texture.
- One committed color field (ultramarine) for the hero and key cards; amber only for "revealed to you".
- Pixel-block sonogram fields (vertical columns of solid color cells) as the signature texture, always moving right to left.
- Heavy, clean system typography (SF Pro). Nothing thin, nothing monospace.
- Cards in a frame-plus-inset-panel construction, and each card carries a small piece of real UI.
- Honest copy: claims match the code, demo data is labelled synthetic.

## Colors

The palette is restrained: two neutrals, one committed field color, one signal accent. All fills are **solid**. Never use translucent or pastel tint fills (see Do's and Don'ts).

| Token | Hex | Role |
|---|---|---|
| `bone` | `#F3F2EC` | Page ground. Also text on ultramarine and ink fields. |
| `sheet` | `#FBFAF6` | Card inner panels, inputs on frames, light cards. |
| `frame` | `#E8E7DF` | Outer frame of framed cards, note cards. |
| `rule` | `#DCDBD2` | 1px borders of cards and panels. |
| `rule-soft` | `#E6E5DD` | Row dividers inside panels. |
| `grid-line` | `#E6E5DC` | Lines of the page grid texture. |
| `ink` | `#111318` | Primary text, "sealed" state, dark cards. |
| `ink-soft` | `#2B2E36` | Secondary text. Never lighter than this on light backgrounds. |
| `hatch-light` | `#C9C8BF` | Light stripe of the hatched "sealed" bar. |
| `ultramarine` | `#2A2FD0` | Committed field color: header, hero, 80% card, primary buttons, active nav state. |
| `ultramarine-deep` | `#1B1F96` | Hero lifecycle rail, inputs on ultramarine, deep sonogram cells. |
| `ultramarine-mid` | `#6E72E6` | Secondary chart bars, borders on ultramarine, "Team" pill. |
| `ultramarine-pale` | `#B9BCF3` | Third chart bar. |
| `on-ultramarine` | `#E9EAFB` | Nav links and faint sonogram cells on ultramarine. |
| `amber` | `#FFB547` | **Only** for data revealed to the current user ("Yours"), the reveal line, the revealed sonogram stream, and the "100% stake returns" card. |

State colors are semantic and must stay consistent everywhere:

- **Sealed:** ink pill (`ink` background, `bone` text) or the hatched bar.
- **Yours:** amber pill (`amber` background, `ink` text).
- **Public:** outlined pill (`sheet` background, 1px `ink` border, `ink` text).
- An operator-visible value (for example the scout's reason, which the operator's Veritas service reads) uses the amber pill labelled "Operator reads", because honesty about who can see what is part of the product.

Never use green and red for win/loss or price movement. Bisik must not look like gambling or trading.

## Typography

**Font: SF Pro (Apple system font), chosen by Dien.** SF Pro cannot be self-hosted as a web font, so use the system stack and load Inter from Google Fonts as the fallback for non-Apple devices:

```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Helvetica Neue', sans-serif;
```

Rejected fonts (do not use): Schibsted Grotesk, Martian Mono or any monospace, Newsreader, IBM Plex Sans/Mono, Satoshi (Halyard's font).

Weights: body text is **500**, labels and small headings are 600 to 700, headings are 700, big numbers are 800. Do not use 300 or 400 anywhere visible; Dien reads thin text as AI-generated.

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Hero display | 80px | 700 | 0.98 | -0.04em |
| Section heading (h2) | 52px | 700 | 1.02 | -0.035em |
| App page title (h1) | 42px | 700 | 1.05 | -0.035em |
| Big numeral (payout cards) | 76px to 128px | 800 | 0.85 to 0.9 | -0.045em to -0.05em |
| Card title (h3) | 22px to 24px | 700 | 1.2 | -0.02em |
| Lead paragraph | 19px to 21px | 500 | 1.45 | 0 |
| Body / card text | 17px | 500 | 1.5 | 0 |
| Secondary text | 15px to 16px | 500 to 600 | 1.5 | 0 |
| Pill / label | 13px to 15px | 700 | 1.3 | 0 |

Rules:

- Numbers use tabular figures (`font-variant-numeric: tabular-nums`).
- Text inside a card must be large enough to fill it: card titles at least 22px and card body at least 17px. If a card looks empty, enlarge the type or shrink the card; never leave small text floating in a big box.
- Headings use `text-wrap: balance`.
- Body measure stays under about 70 characters (`max-width: 70ch` or a px cap).
- No monospace, even for addresses, hashes or amounts. Use the system font at weight 600 to 700.

## Layout

**Page structure (landing), in order, modelled on Halyard's section structure:**

1. **Header bar** on ultramarine: wordmark on the left, section links (Mechanism, Parts, Payouts, Flow, Source), and an "Open the app" button (bone on ultramarine) on the right.
2. **Hero**, full-bleed ultramarine with a streaming sonogram behind the copy. The headline, lead paragraph, two buttons and one context sentence sit top-left. A fixed amber reveal line sits at 74% of the width; to its right the sonogram is amber ("decrypted"), with an amber pill "Decrypted for Ecosystem A". A 64px lifecycle rail (`ultramarine-deep`) runs along the bottom with five stages: Open, Closed, Auction, Allocated (amber, "yours to read"), Settled.
3. **Mechanism** ("Three secrets, kept apart"): text on the left, a framed "Position in market 3" record card on the right, listing each field with its Sealed / Yours / Public state.
4. **Parts** ("Four parts, one market"): the heading and its paragraph stacked on the left, then a 2x2 grid of framed cards (Reclaim zkTLS, Semaphore groups, Arcium MPC, Veritas). Each card shows a UI fragment of what that part does.
5. **Not a prediction market**: heading and paragraph on the left, a framed list of five rule rows with colored check icons on the right. Same bone background as the rest of the page.
6. **Payouts** ("Who gets paid, and when"): centered heading, then a 4-column bento: the 80% scouts card (2x2, ultramarine, with a split bar and a streaming pixel field), the 15% Platform and 5% Team cards, the amber 100% stake-returns card, a full-width ink card "Buyer payments are not refunded…", and a full-width "Built on" row of chips.
7. **Flow** ("One market, start to finish"): a wide ink card "Stake in the dark" over a streaming pixel-block field, with a "Try the stake flow" button, then three framed cards (Fold and bid, Pick and decrypt, Report and claim), each with a UI fragment.
8. **Source** ("Check it yourself"): three link cards (Solana Explorer, bisik-circuits, GitHub) and a "Not audited" note card.
9. **Footer**: wordmark, one line noting the demo data is synthetic, and a back-to-top link.

**App screens** follow Halyard's app structure: the same header pattern on a bone background (nav items are 10px-radius tabs, and the active tab has a `frame` fill), a page title, a framed status strip, then a two-column body. The main column (`flex: 999 1 600px`) sits next to a side column (`flex: 1 1 340px`), and the side column wraps under the main one on narrow screens.

- **Buyer market:** a status strip with a clock icon, "Auction closes in 4 min 12 s", and a segmented lifecycle control (the current stage is ultramarine). Before the buyer decrypts, the signals panel shows a market-wide histogram ("Three options backed. Two strong, none medium, one weak.") and one row per option titled only "Option N, <category>". Each row has a "Team sealed" pill, a sonogram strip of uniform grey noise, and a sealed reason. After "Decrypt my view", the rows show team names, weights, the full reason (200 or more characters) and its pills. The side column has the sealed-bid card (ultramarine) and an "Or skip the auction" flat-price card. Prices use the real devnet market values (reserve 100 USDC, flat 90 USDC).
- **Scout stake:** team picker (three toggle buttons), reason textarea with a character counter ("215 / 200", because the API rejects reasons under the market's `minReasonLen`, 200 on devnet) and Veritas result pills, stake input plus "Seal and stake on <team>" button. The side column is an ink card "What leaves your device", listing each field with its state pill.

**Grid and spacing**

- Container `max-width: 1280px`, side padding 32px (16px on phones).
- Section vertical padding is 100px to 120px. Spacing above a heading is larger than below it.
- Card gaps are 14px to 16px. Frame inset is 8px. Inner panel padding is 18px to 24px.
- Pages are fluid. Rows `flex-wrap: wrap`. At phone width, columns stack, nav wraps, and wide tables scroll inside their own box.

**Page texture.** The page background is bone with a 32px cell grid in `grid-line`:

```css
.bisik-grid {
  background-color: #F3F2EC;
  background-image: linear-gradient(#E6E5DC 1px, transparent 1px),
                    linear-gradient(90deg, #E6E5DC 1px, transparent 1px);
  background-size: 32px 32px;
  background-position: -1px -1px;
}
```

Every section sits on this same texture. Do not create a lone section with a different full-width background (Dien rejected a black full-width section because it "stood out alone"). Dark or ultramarine color belongs inside cards and the hero, not as random full-bleed bands.

## Elevation & Depth

Mostly flat, with layering instead of heavy shadows:

- Depth comes from the **frame plus inset panel** construction (a `frame` outer shell 8px around a `sheet` panel), plus 1px `rule` borders.
- Framed cards may carry one soft offset shadow: `0 1px 2px rgba(17,19,24,0.06), 0 18px 40px -24px rgba(17,19,24,0.35)`. Shadows always have an offset and blur. No colored glows, no hard offset (neobrutalist) shadows, no neumorphic rings.
- No glassmorphism, no backdrop blur.

## Shapes

- Outer card frames: 18px radius. Inner panels and controls: 12px. List rows inside panels: 9px to 12px. Bars: 6px. Pills: fully round (999px).
- Borders are 1px. No thick colored left or right border stripes on cards.
- **The sonogram cell** is the signature shape: tall columns split into stacked solid color cells (a "pixel-block" field), with 2px gaps between columns. It is used in the hero, the 80% payout card, the "Stake in the dark" card and the market signal strips.
- **The hatched bar** (`repeating-linear-gradient(90deg, #111318 0 3px, #C9C8BF 3px 6px)`, rounded ends) means "sealed value". On dark backgrounds use bone and `#3A3D46` stripes.
- Icons are inline stroke SVGs (stroke width 2.2 to 2.6, round caps), drawn consistently. Never emoji. Never Unicode arrows in copy.
- Wordmark: lowercase "bisik" in weight 800, tracking -0.03em, next to a four-bar mark (bars of height 6, 16, 10 and 4 units, with the third bar in amber on blue or ultramarine on light).

## Components

**Framed card (the default card).** Build it from an outer `frame` shell (18px radius, 8px padding, 1px `rule` border) holding an inner `sheet` panel (12px radius, 1px `rule` border, 18px padding). The inner panel holds a **real UI fragment** (a verified-record row, a group of member dots, encrypted bars merging into a weight, a reason with an identifying detail struck out, a mini histogram, a list row marked Yours or Hidden, a claimed amount). Below the panel come the title (22px to 24px, 700) and one or two lines of body (17px, 500). This pattern comes from 21st.dev card components (https://21st.dev/community/components/s/card and /s/bento), which Dien gave as the reference for clean, non-generic cards. A card made only of an icon, a title and a paragraph is not acceptable.

**Stat card (payout bento).** A big numeral (76px to 128px, 800) top-left, a pill label top-right, and a 20px weight-600 sentence at the bottom. The card's content must fill it. The 80% card is ultramarine, with an 80/15/5 split bar (amber, bone, ultramarine-mid) and a slowly streaming pixel field in its lower half.

**Note card.** For a caveat or disclaimer, never a floating paragraph. Use a full-width card (ink or `frame`) with an icon tile or a pill, a bold first line, and the explanation underneath.

**Pills.** Fully round, 13px to 15px, weight 700. Sealed is ink, Yours is amber, Public is outlined, Platform is ink, Team is ultramarine-mid.

**Buttons.** 44px to 52px tall, 12px radius, weight 700. The primary is ultramarine; on ultramarine backgrounds it becomes bone with ink text. The secondary is outlined ink or a `#3B40DA` fill with a `#6E72E6` border on ultramarine. A disabled button has a bone fill, a `rule` border, `#6B6E78` text and a not-allowed cursor, and its label says when it unlocks ("After allocation").

**Inputs.** 48px to 52px tall, 12px radius, bone fill, 1px `rule` border, 17px to 19px text at weight 600 to 700. On ultramarine, use a `ultramarine-deep` fill with a `#6E72E6` border. Every input has a visible `<label>`.

**Toggle buttons (team picker).** 14px radius. When selected: ultramarine fill, bone text, 2px ultramarine border, `aria-pressed="true"`.

**Status strip (app).** A framed card holding a 52px ultramarine icon tile (clock), a 24px status line, a supporting line, and a segmented lifecycle control (a bone track with 9px-radius segments, where the current stage is ultramarine).

**Focus and selection.** Focus ring: `outline: 2px solid #2A2FD0; outline-offset: 2px to 3px; border-radius: 8px`. Text selection: amber background with ink text.

### Motion

Motion is part of the identity. Dien explicitly asked for it. Every animation must be disabled under `prefers-reduced-motion: reduce`.

| Animation | Where | Spec |
|---|---|---|
| **Signal stream** (focal) | Hero sonogram, payout 80% card, "Stake in the dark" card, market signal strips | Render the columns twice in a track that is 200% wide, then `translateX(0 → -50%)`, linear, infinite. Speeds: hero 48s, revealed amber stream 22s, background fields 90s, market strips 14s to 31s (each team a different speed). Direction is always right to left: signals arrive and get captured. |
| **Decrypt reveal** | Each landing section on scroll, the revealed reasons in the market screen, the hero's amber region on load | `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)`, ease `cubic-bezier(.16,1,.3,1)`. Scroll-linked with `animation-timeline: view(); animation-range: entry 0% cover 28%` inside `@supports (animation-timeline: view())`, so browsers without support (Safari) simply show the content. |
| **Marching hatch** | Every sealed bar | Animate `background-position` from 0 to 24px, 1.2s to 2.2s, linear, infinite. |
| **Member pulse** | Semaphore card dots | Scale 1 → 1.12 and ultramarine → ink, 4.2s cycle, staggered 0.6s per dot, so no single member stands out for long. |
| **Grow / fill** | Histogram bars, the 80/15/5 split bar | Scroll-linked `scaleY` / `scaleX` from near zero. |

Never animate everything identically. No generic fade-and-rise on every section, no hover lift, no parallax.

## Do's and Don'ts

These rules come from Dien's review rounds on 11 Oct 2026. Breaking them is the fastest way to get the work rejected.

### Do

- Make the mechanism the hero of every surface; the builder-sourcing use case is just an example.
- Fill every card with a real UI fragment, sized so the card has no large empty area.
- Use solid colors and pixel-block sonogram fields for color surfaces.
- Keep the whole page on the bone cell-grid texture.
- Put context for a heading **below** the heading, as a normal sentence.
- Put caveats, disclaimers and footnotes **inside a card** (note card), or directly under the heading they belong to.
- Use heavy, readable type (500 and up) at generous sizes.
- Write honest copy: say who pays whom, say what the operator can see, label demo data as synthetic, and say "Not audited".
- Add motion with meaning (signals streaming right to left, sections decrypting into view), and respect reduced motion.

### Don't

- **No thin or light fonts, and no monospace** (the small monospace labels were the clearest "AI-generated" signal for Dien).
- **No eyebrow labels**: never place a pill, kicker or small label directly above a heading (for example a "Market 3, builder sourcing" pill above the page title, or an "Allocated" pill above a card title).
- **No colon used to explain the previous phrase** in UI copy ("First use case: ecosystems…" must become "The first use case is ecosystems…"). **No em dash** anywhere in copy. No Unicode arrows ("→") in copy either.
- **No floating paragraphs**: a lone paragraph sitting to the right of a heading, or under a grid with nothing around it, looks abstract and unplaced.
- **No small text in a big card.**
- **No generic grid cards** (bordered boxes with a small label, a title and a paragraph). They look AI-made.
- **No translucent or pastel tint fills** (for example a pale amber row background, or a transparent gradient wash). Use the solid color instead.
- **No full-width section with its own different background** that breaks the page rhythm.
- No green/red, no price charts, no betting language. Bisik is not a prediction market.
- No cream "confidential dossier" look (serif type, red stamp, redaction bars on cream). That direction was tried first and rejected as unclean and AI-looking.
- No Halyard clothes: no silver/navy palette, no Satoshi, no concentric ripples, no neumorphic shadows.
- No invented features or claims. If a capability does not exist in the code, do not show it as a working control. Use a disabled state that says when it unlocks.

## Revision 11 Oct 2026 (implemented in `apps/web`): signal visuals and compact app sizing

This revision overrides any earlier text in this file that conflicts with it.

- **Signal stream replaces the sonogram.** Dien said the old pixel-column sonogram looked like music notation. Signals are now drawn as **encrypted packets**: small rounded chips (7px radius, 12px weight-700 text) in lanes that move right to left at slightly different speeds. Sealed packets show short random hex. Packets past the amber reveal line are amber with readable labels such as "Team Lumen 0.44" or "Tier 2". Variants are hero (quiet, so the headline stays readable), revealed, sealed (grey, used in market strips), dark and pay. The component is `SignalStream` in `apps/web/src/components/ui.tsx`, also exported as `Sonogram`.
- **Cipher replaces the hatched bar.** Dien did not understand what the striped bar meant. A sealed value is now a small ink chip with an amber lock and ciphertext that keeps re-scrambling (`Cipher`, exported as `Hatch`). It stops moving under reduced motion.
- **Labelled histogram replaces the unlabelled bars.** Strength is shown as `StrengthBars`: rows for Strong, Medium and Weak with a bar and a count. It is used in the landing "Fold and bid" card and in the buyer pre-purchase preview. The Arcium card now shows "Stakes in" as a cipher and "Your weight out" as an amber pill.
- **App pages are compact.** The landing keeps its large scale. Pages inside the app (`.page`) follow https://veritasprotocol.vercel.app/pools/init:
  - page title 24px;
  - card titles 15–17px;
  - body and labels 13–14px;
  - inputs and buttons 38px tall with 14px text and a 10px radius;
  - panel padding 16px;
  - gaps 12–14px.
  The rules are at the end of `apps/web/src/styles.css`. The earlier rule "card text at least 17px" now applies to the landing only.
- **One viewport.** `/scout/onboard` and `/scout/positions` must fit in one viewport at 100% zoom (checked at 1440×900). Positions uses three columns: tools on the left, records in the middle (scrolling inside its own column), help on the right.

### Follow-up, same day

- **Revealed packets are sentences.** They read like "Team Arka reused another team’s idea at a past hackathon", not "Team Arka 0.18" or "DRS 0.12". A first-time visitor must understand each label without context. The hero pill says "(demo)" because these are synthetic.
- **Sealed packets name what they carry.** They read "Sealed call", "Sealed reason", "Sealed stake" or "Buyer payment", each with a lock icon. Raw hex is no longer shown in packets.
- **Every sealed value explains itself.** Hover or keyboard focus on a `Cipher` opens a "Why is this locked?" pop-up with a reason specific to that attribute (`reason` prop).
- **One viewport.** `/create` (fields share rows in 2, 3 and 5 column grids) and `/admin` (three columns) now fit one 1440×900 viewport, alongside `/scout/onboard` and `/scout/positions`.

### Role-based app shell (11 Oct, after an impeccable critique)

- **Pages are grouped by role.** The header holds a role switcher: Buyer, Scout, Team, Operator. Under it, a role bar states who the role is, what it does, and lists that role's pages. Buyer: Markets to buy, Walkthrough with demo data, Open a market. Scout: Get verified, Markets to back (`/scout`), My positions and claims. The definitions live in `apps/web/src/components/roles.tsx`.
- **Every app page opens with an ultramarine banner** (one sentence of purpose plus up to three real stats, following app.reckonz.xyz/receipts). A numbered step strip shows where the page sits in its role's flow.
- **Markets is a compact table, not a card wall.** Columns are the buyer's question, stage, backing so far (calls, USDC staked, measured spread) and price. One action per row matches the stage. Stage filters are chips.
- **Market questions are shown.** Only the hash is onchain, so the server stores question text and accepts it only when keccak(text) matches `question_hash` (`POST /v1/markets/:id/question`; Create publishes it automatically).
- **The spread is measured, never vague.** "Near the top" means at least 50% of the leading option's weighted stake, "middle" 20–50%, "trailing" under 20% (from the `preview` circuit). Do not use strong/medium/weak without these definitions.
- **Pitfall:** Tailwind's `outline` utility collides with the `.button.outline` class and adds a 3px ring. `.button.outline:not(:focus-visible) { outline: none }` fixes it; do not rename back.

## Working with Dien on design

- Reply to Dien in Indonesian. Keep explanations short and concrete.
- Dien reviews by screenshot and comments on specific elements. Apply every point, then report what changed per point.
- Use the `/impeccable` skill for design work (Dien asked for it). Its decision page and structured questions are welcome when a real choice is open.
- Before inventing something new (a new section style, a new color use), check it against the Don'ts list above. When in doubt, ask Dien rather than guess.
- Iteration history, for context: (1) cream dossier mockup, rejected; (2) Halyard structure with the "Whisper Sonogram" direction chosen on the impeccable decision page (seed `a44053e7`); (3) removed monospace and thin type, switched to framed cards with UI fragments; (4) switched the font to SF Pro and fixed floating text and small card text; (5) removed eyebrows and tint fills, added the grid texture, streaming sonograms and scroll decrypt transitions. Version (5) is approved as "cukup bagus" (good enough) and is the baseline for `apps/web`.

## Data truth constraints (what the UI may show)

These rules come from the API and the program, not from taste. A mockup that breaks them promises something the product cannot do. Two earlier mockups did, and were corrected on 11 Oct 2026.

- **Before purchase, strength is market-wide only.** `GET /v1/markets/:id` returns `preview: { backed, weak, medium, strong }`. These are counts of options per strength bucket for the whole market, and are `null` before the Auction stage. Never attach a strength, weight, team name or reason to a specific option before the buyer has an allocation and decrypts.
- **Public option data is index, category and opt-in flag only.** The team behind an option (`teamRef`) is private until the buyer's signals are allowed by the onchain allocation (`GET /v1/markets/:id/signals`, login required).
- **Reasons have a minimum length.** The market's `minReasonLen` is 200 characters on devnet, and `POST /v1/reasons` rejects shorter text. Example reasons must be at least that long, and the stake form shows a counter.
- **Stake range, reserve and flat price come from the market account.** Read `minStake`, `maxStake`, `reservePrice` and `flatPrice` from `GET /v1/markets` instead of hard-coding them. Amounts are USDC with 6 decimals.
- **The market list exists.** `GET /v1/markets` (optional `?status=`) returns `{ markets: [...] }`, sorted newest first.

## Implementation notes for `apps/web` (Vite + React + TypeScript + Tailwind)

- The SDK runs in the browser with a few polyfills and two shims. Follow `docs/web-sdk-bundling.md` for the Vite config.
- Map the frontmatter tokens into `tailwind.config` `theme.extend` (colors, borderRadius, fontFamily). Keep token names identical.
- Put the grid texture, sonogram stream, hatch, pulse and decrypt keyframes in one global CSS file. The reference CSS is in `docs/design-reference/Main.dc.html` inside `<helmet><style>`.
- Generate sonogram columns deterministically. Use a seeded PRNG (Park–Miller, `s = s * 16807 % 2147483647`), three formant bands following slow sine curves, and a burst envelope. Each column is a `linear-gradient(to top, …)` with hard stops per cell; colors come from solid mixes between two palette colors, never alpha. See `columns()`, `value()` and `mix()` in `Main.dc.html`. Prefer a `<canvas>` in production if DOM column count hurts performance.
- Demo data in the mockups (Team Lumen, Team Nadi, Team Arka, weights 0.44 / 0.38 / 0.18, reasons) is synthetic. Replace it with data from the SDK and server, and keep the "Demo data" label wherever synthetic data remains. The 213.58 USDC claim by scout "ayu" is a real devnet test result (market 3).

## Fullscreen hero and dark mode · Dien, 11 October 2026

Dien requested a complete fullscreen opening at every browser zoom, more interaction using the existing motion language, and dark mode. The opening includes header, hero copy and lifecycle rail in a flex column with a 100dvh minimum. The rail participates in normal flow. Typography and vertical rhythm adapt to viewport width and height. If extreme browser zoom leaves less space than the intrinsic content, `useFullscreenHero` proportionally fits the entire opening using CSS zoom; this affects only the opening, not app screens or the rest of the landing. Resizing and font loading recalculate it. No hero content is hidden or cropped.

Dark mode uses semantic surface tokens: canvas #111318, panel #1E2129, frame #292D37, border #494E5D, soft border #373C48, grid #1C2029, text #F3F2EC, secondary text #C9CBD3, link/focus accent #A0A4FF. Primary button fields remain ultramarine; the hero uses ultramarine-deep #1B1F96 with ink header/rail. Amber retains its visibility meaning and dark ink text. Neutral surfaces, forms, public pills, navigation and browser controls adapt together. A labelled sun/moon control is available in both headers. The saved `bisik:theme` preference takes priority over the initial system preference and is applied before React renders.

Motion retains the approved signal stream and decrypt masks. Hero amber reveal lasts 800ms; control colors and directional SVG feedback last 180ms. Histogram bars and split bars fill from the baseline; non-scroll-timeline browsers use an intersection-triggered fallback. Sonograms pause offscreen or while the tab is hidden; hatches/member pulses pause offscreen. Reduced motion disables movement while keeping content and state feedback visible.
