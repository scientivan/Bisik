# How to build the Bisik pitch video

This guide is for an agent with no context about the pitch video. Read it fully before you touch `src/Pitch.tsx`. It records what Dien asked for, what Dien rejected, and the reasoning behind every design choice in the approved first 10 seconds.

## 1. Read these first

1. `../important_for_demo.md`. It has the judging rules and the product facts. Section 0 covers the rules: the pitch explains **why**, the demo explains **how**, the pitch runs 2–3 minutes, and "a clear and well-structured narrative is more valuable than professional video editing". Sections 2, 3, 4, 8, 9, 10 and 11 hold the facts you may say. Section 12 lists what you must never say or show.
2. `PITCH-TRACKER.md`. It holds the scene list, the script lines, each scene's status and the log. Update it after every change.
3. `~/.claude/DESIGN-PREFERENCES.md`. It holds Dien's taste and the "do not look AI-made" rules.
4. `screen-record-reference.mov`. Use it only as a **quality bar** (see section 3).

## 1b. Official pitch video requirements (checked 13 Oct 2026)

- [Fact, https://colosseum.com/hackathon] "A two-to-three-minute presentation video." "This is one of the first resources judges review, so it should be clear, concise, and high quality." No format, language, hosting or on-camera rule is given.
- [Fact, https://blog.colosseum.com/perfecting-your-hackathon-submission/] "The video should be no more than three minutes long." Treat it "like a brief startup pitch, not a product demo." A voiceover over a slide deck is the given example of a good format.
- Must include: the team's background, the problem and who it is for, the market and the problem's scale, why the solution matters, feedback or validation from users "even if informal", early traction, and the broader vision.
- Avoid: going over 3 minutes, "overly flashy visuals with little substance", buzzwords, vague or overly technical descriptions, leaving out team background, not explaining the core idea and its impact, and unpolished videos.
- Practical target: 2:30 to 2:50. Hard limit 3:00. Minimum 2:00.
- Full submission list from the official page (the pitch must agree with it): product name and brief description; blockchains and tools integrated; all teammates with background and previous experience; team location; product logo or graphic; GitHub repo (open source encouraged, private allowed with review access); the 2–3 minute presentation video; a product demo video of no more than three minutes; go-to-market strategy, demand validation and plans for distribution.
- Judging criteria (rules §8): Functionality, Potential Impact, Novelty, UX, Open-source, Business Plan. FAQ factors: Founder + Market Fit, Insight, Product + Execution, Potential Market Size, Founder Communication, Viability, Traction.

### What this means for the pitch (recommendations applied)

- Open with the users and the problem, then the insight, then Bisik. The product demo belongs in the other video.
- Say who Dien is (solo founder, student, won two UHI9 tracks solo with Veritas) in its own scene.
- Show demand validation honestly, including "none yet" if that is the truth. Informal feedback counts.
- Every visual must carry substance. A motion that does not explain something is cut.
- Plain words. No buzzwords. Explain the core idea in one sentence a non-crypto person understands.

## 2. What Dien wants (decisions, 13 Oct 2026)

- The video is a designed motion presentation. It is not app footage and it is not a talking head.
- Dien appears as solo founder in a **framed face cam in the bottom-right corner** for the whole video. Dien records their own voice (no TTS) and inserts the face video in their own edit after the presentation is done. Your job is the presentation layer only, with an empty face frame.
- **Palette = the Bisik product palette** from `apps/web/src/styles.css` (light theme). Do not use the older `src/theme.ts` palette (ink #111318, blue #2A2FD0) for the pitch.
- **Show information as visuals, not text, wherever a visual is clear.** Example given by Dien: chain names (Solana, Base, Arbitrum, Tempo) must be **logos**, never text pills.
- **No zoom** of any kind. Dien gets motion sickness. Small entrance scale (0.85 to 1) is fine.
- Dien reviews in small chunks (for example "first 10 seconds"). Build a chunk, render it, check frames yourself, then hand it over for QA.

### What Dien rejected, and why

| Version | What it did | Dien's verdict |
|---|---|---|
| v1 (first 15 s) | Copied the reference: dark blue radial gradient, Title Case headlines, word-by-word blur reveal, floating chips | Rejected. Dien did not want the reference's scene order, layout or palette copied |
| v2 (first 10 s) | Light grid, solid colours, one focal element per scene, sentence case, chains as text pills, old theme palette | "Bagus". Two fixes asked: use the product palette, replace text with visuals (logos) |
| v3 (current) | v2 plus product palette, chain logos, team drawn as a card of three people, money drawn as an amber line | Waiting for QA |

### Subtitles (Dien's preference, 13 Oct 2026)

- Every scene shows Dien's spoken line as a subtitle. The subtitle text is the script, so Dien must read the line as written (or tell the agent to update it).
- Component `<Sub>` (inside `<Scene sub="...">`): a dark `accent` box, white text, 34 px, weight 600. It sits bottom-left at x = 200, 56 px from the bottom, and ends 440 px from the right edge so it never touches the face frame.
- **One full sentence at a time** (Dien, 13 Oct 2026): the subtitle shows a whole sentence, from its start to its full stop, then switches to the next. Each sentence gets a share of the scene equal to its share of the words. Long sentences wrap to two lines; keep every sentence short enough for two lines (about 22 words). Avoid abbreviations with full stops (for example "U.S."), because the splitter cuts at every ".", "?" or "!".
- Because the subtitle owns the bottom, sources sit at the **top-left** and scene headlines must end above y ≈ 900.
- The headline is the takeaway and the subtitle is the speech. They may differ. Keep the headline shorter.
- Speaking pace about 2.5 words per second, so a 5 s scene holds about 12 words. Lengthen the scene or cut words, never cram.

## 3. What to take from the reference video, and what to leave

Take these **qualities**:

- Very clean frames with few elements on screen.
- Each scene has one focal point, so the viewer knows where to look.
- Each scene is understood in about 2 seconds.
- Nothing looks AI-generated.

Do **not** copy these: scene order, layout, the blue gradient, Title Case headlines, the blur-in-per-word text, or chips that float without meaning.

## 4. Design rules used in the approved scenes

### Palette (product, light theme)

| Token | Hex | Use |
|---|---|---|
| bone | `#F7F7F7` | page background |
| frame | `#EDEDED` | 32 px grid lines, empty slots |
| sheet | `#FFFFFF` | cards, logo tiles |
| rule | `#D9D9D9` | 1 px borders |
| ink | `#0F0F0F` | text, connector lines |
| accent | `#1E1E1E` | solid dark panels (team card) |
| inkSoft | `#555555` | secondary text (still readable, never pale grey) |
| amber | `#FFB547` | **money only**, and things that need the user now |
| lavender | `#BBA9F5` | highlights and explanations |
| lavenderPanel | `#E4DDFF` | light highlight panels |

The meaning of each colour comes from the app itself (`styles.css` comment "Amber marks money and things that need you now; lavender marks explanations"). Keep that meaning in the video, so the colours teach the viewer something.

### Background and layout

- Background: solid bone with a 32 px grid in `frame`. Use it in every scene. No gradients, no tint washes, no section with a different background.
- Content lives in the area left of the face frame. The face frame is 320 px with an 8 px frame, a name bar, and a 40 px margin. Nothing may sit under it.
- Left-align text at x = 200. Large headlines sit at the bottom-left or under the visual. Never place a paragraph floating on its own.

### Typography

- SF Pro system stack (`FONT` in `src/theme.ts`). Headlines weight 700, numbers 800, body 500–600. Never 300 or 400.
- **Sentence case**, one short sentence per scene, 52–64 px. Title Case on every word looks AI-made.
- No colon used to explain, no em dash, no arrow characters in on-screen copy.
- No label or pill above a headline (Dien calls this an "eyebrow").

### Visual vocabulary (reuse these, keep them consistent)

- **Chain** = official logo on a white rounded tile (`<Logo name>`). Logos are SVGs in `public/logos/` taken from the MIT-licensed `@web3icons/core` package (branded variants). The Bisik mark is `public/logos/bisik.svg` from `apps/web/public/mark.svg`.
- **Builder team** = dark card with three person icons; the middle person is lavender (`<TeamCard>`). No words needed.
- **Money** = amber. A payment is an amber line filling from payer to receiver, with the amount riding on it.
- **Commitment to a chain** = that chain's logo as a round badge on the team card, with an amber ring.
- **Attention or competition** = dashed ink connector lines drawn toward the target.

### Motion

- Every animation shows a cause or a relation. Examples: the money line fills from Base to the team; the four logo lines reach the team at the same time; the team card pulses once when all lines arrive.
- Use eased fades and small rises (14 px) for text, and springs (damping 200) for objects. Stagger items by 3 frames.
- Scene transitions are an 8-frame fade. No blur, no zoom, no camera moves.
- Numbers count up once, then hold.

### Honesty rules for content

- Never invent a detail to make a visual work. Example: MegaETH graduates "moved to other chains", but the source names no chain, so P3 shows an empty dashed badge, not a real logo.

- Every number shows its source in small text at the bottom-left (`<Source>`).
- Real ecosystems may appear as **the market** (competitors for teams). They must never appear as Bisik customers (`important_for_demo.md` §12).
- Never say "prediction market", "betting", "fully trustless" or "decentralized oracle".

## 5. Scene recipe (what made the first 10 seconds work)

For each scene:

1. Write the one sentence Dien will say.
2. Find the single idea in it, and draw that idea with the visual vocabulary above. Text only carries what a picture cannot.
3. Animate in story order. Actor first, then the action, then the result, then the short sentence.
4. Leave the bottom-right free. Check that nothing collides.
5. Render, extract frames, and look at them yourself before handing over.

Approved example:

- **P1 (0–5 s)**. Base logo, then an amber line filling toward a team card while `$100,000` counts up, then a Base badge with an amber ring snaps onto the team, then the sentence "Base Batches backs a team only if it builds on Base."
- **P2 (5–10 s)**. The team card is in the centre. The Solana, Base, Arbitrum and Tempo logos appear around it, and dashed lines reach it at the same moment. The card pulses once. Then the sentence "Every ecosystem is chasing the same teams."

Spoken lines (subtitles) for 0–30 s:

| Scene | Frames | Line |
|---|---|---|
| P1 | 150 | Base invests a hundred thousand dollars in a team, if that team builds on Base. |
| P2 | 150 | Every ecosystem is chasing the same builders. |
| P3 | 150 | MegaETH even closed its accelerator, because the teams it trained shipped somewhere else. |
| P4 | 225 | So ecosystems already pay outsiders for intros. Avalanche pays up to ten thousand dollars per project, Metis up to four thousand. |
| P5 | 225 | But the signal that wins a team is said in a room, not posted online. Search for it, and you find nothing. |

Scenes 10–30 s:

- **P3 (10–15 s)**. MegaETH logo, then a team card with a MegaETH badge slides away along a dashed path. The badge turns into an empty dashed circle (another chain, source does not name it). Text: "MegaETH closed its accelerator." plus the short quote.
- **P4 (15–23 s)**. Two payout rows. Avalanche logo to a person tile with an amber line, "$100 to $10,000 per project". Metis logo to a person tile, "$200 to $4,000 per integration". Then: "Ecosystems already pay outsiders for intros that land."
- **P5 (23–30 s)**. A room with two people and a lavender whisper bubble with a lock and scrambled text. Outside it, a search box types "team lumen chain decision" and shows "0 results". Then: "The signal that matters is said in the room."

Spoken lines and scenes for 30–60 s:

| Scene | Frames | Visual | Line |
|---|---|---|---|
| P6 | 180 | Bisik mark on a tile, big "Bisik", lavender chip "whisper" | So I built Bisik. In Indonesian, bisik means whisper. |
| P7 | 240 | Scout tile, then a card with a sealed signal (lock + scrambled blocks) and an amber "10 USDC stake, refundable" row; the card moves toward the market | Insiders, like mentors and judges, sell what they saw as a sealed signal, with a refundable stake behind it. |
| P8 | 240 | Two generic buyer tiles (network icon, never a real ecosystem as customer), each with a sealed bid; the winner gets a key and an amber "exclusive" chip, the loser dims | Ecosystems bid in a sealed auction. The winner can keep the best signals to itself, before any rival hears them. |
| P9 | 240 | Team card gets a check (shipped), amber line "reward + stake back" fills to the scout tile, which gets a small sealed tag (still anonymous) | When the team ships, the buyer marks the signal that helped. The scout gets paid, the stake comes back, and nobody learns who they are. |

New vocabulary: `<Sealed>` = anything encrypted (lock + changing blocks on lavender); `<Buyer>` = a generic ecosystem buyer; amber chip = something of value the user gets.

Wording rule for P9: do not say "paid only if the team ships". In Bisik the buyer's payment is not refunded; if the buyer marks nothing, default rule D-05 sends it to the strongest signal (`important_for_demo.md` §6). "Rewards follow outcomes" is the safe phrasing until Dien decides the framing.

Scenes 60 s to the end (full v1, 169 s):

| Scene | Frames | Purpose (organiser item) | Visual |
|---|---|---|---|
| P10 | 600 | Why blockchain and crypto | Four framed rows that land as Dien names them: Solana escrow, encrypted choices and bids (Arcium), reputation without a name (zkTLS + Semaphore), USDC payouts |
| P11 | 240 | Why the solution is safe and not gambling | Three check rows: stakes refunded, rewards only from buyers, only proven hoax slashed (to charity) |
| P12 | 480 | Difference from existing products | Comparison table "Earlier markets" vs "Bisik". **Never name Bench** (Dien's rule); say "private, stake-backed signal markets already exist" |
| P13 | 300 | Problem owners / users and business model | Buyer and scout groups, then an 85% amber / 15% dark split bar |
| P14 | 480 | Validation and traction, honestly | Checks for devnet live and full lifecycle; empty dashed circles for "No paying users yet" and "Next: a pilot round" |
| P15 | 540 | Team background | "Dien, solo founder", UGM Information Engineering, three award cards |
| P16 | 480 | Roadmap and vision | Timeline: open oracle network (next, amber), outcomes on any chain, reasons inside a TEE; then lavender panel "A private market for anything insiders know." |
| P17 | 150 | Close | Bisik mark, "Settled on" Solana logo |

Changes in full v2 (177.5 s, Dien's requests):

- **P0 (225 frames) opens the video.** Bisik is broad (hiring, investing, research tiles dim), and this pitch uses one use case, hackathons (tile turns dark). Buyers = ecosystems, scouts = judges and mentors. Dien's reason: the product is general, but hackathons make it easy to explain in this submission.
- **Founder (P15, 600 frames)** has a fourth card, "Top 150 of 9,000, EDU Chain Hackathon Semester 3, Edugram, May 2025" (scientivan.dev/projects/edugram-education-with-ai-generated-short-videos).
- **Roadmap (P16, 660 frames)** is split into two lanes. Product: open oracle network of staked verifiers, outcomes checked on any chain, scout reasons inside a TEE. Business: pilot round with judges and grant teams, a sourcing round every hackathon season, hiring and investment research markets. Vision panel follows.
- To stay under 3:00, P10 is 510, P12 420, P14 450, P17 120 frames.

Every spoken line is the `sub` prop of the scene in `src/Pitch.tsx`. Read it there; do not keep a second copy that can drift.

Founder facts (source: scientivan.dev, read 13 Oct 2026): Dien Muhammad Scientivan Kurniapramono, Information Engineering student at Universitas Gadjah Mada (2024 to now), 19, Yogyakarta. Awards: Two-track winner, 9th Uniswap Hook Incubator (Impermanent Loss & Yield Systems, Reactive Network), project Veritas, Jun 2026; 2nd place Monad Blitz Hackathon Jogja, project VISTA (later ported to Solana as four Anchor programs), Apr 2026; Top 10 of 139, KeeperHub Agent Economy Hackathon, project Resi, Sep 2026; Top 120 of 576, Mantle Turing Test Hackathon 2026. The site is a client-rendered Next.js app; plain fetch shows empty sections, use a headless browser to read it.

Validation status (13 Oct 2026): `Ideation-Colosseum/living-doc/d12-evidence-log.csv` has only a header, so there are **no** interviews or users to report. P14 says so. If Dien gets real replies before submission, replace the "No paying users yet" row with the exact numbers, including refusals.

Accuracy fixes made while building:

- Stake amounts are public (D-22). Only the backed option is encrypted. So P10 says "hides which team each stake backs", never "every stake is hidden".
- Real ecosystems appear only as the market being competed for (P1 to P4), never as Bisik buyers.

## 6. How to build and check

```bash
cd Bisik/my-video
npx remotion render Pitch out/pitch-qa-10s.mp4        # composition id "Pitch" in src/Root.tsx
ffmpeg -ss 4 -i out/pitch-qa-10s.mp4 -frames:v 1 -vf scale=960:-1 /tmp/f4.png   # inspect frames
open out/pitch-qa-10s.mp4
```

- Scenes are `[Component, frames]` pairs in `SCENES` in `src/Pitch.tsx` (30 fps).
- `out/` is gitignored.
- Before handing a chunk to Dien, check these:
  - Is there one focal point per scene?
  - Does anything overlap the face frame?
  - Is any visible text below weight 500?
  - Is there any Title Case, em dash or colon explanation?
  - Does every number have a source?
  - Is there any zoom?

## 7. Open items

- Demand validation numbers for the business scene: ask Dien (`d12-evidence-log.csv`). Do not invent traction.
- Face-frame label is "Dien, Solo founder" until Dien says otherwise.
- The script for P3 onward is in `PITCH-TRACKER.md`. It was drafted before the redesign. Redesign each scene with the recipe in section 5.
