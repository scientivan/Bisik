# Bisik submission videos (Remotion)

Two compositions in `src/Root.tsx`:

- `Demo`: the product demo (`src/Demo2.tsx`). It plays screen recordings of the real app on Solana devnet. The recordings (`public/rec/`) are not committed because they are large. Re-create them with `../scripts/record-demo.ts` (see `RECORDING-TRACKER.md`). Voice-over files are in `public/vo/`.
- `Pitch`: the pitch presentation (`src/Pitch.tsx`), a designed motion deck with subtitles and an empty face-cam frame. How it was designed and why: `PITCH-VIDEO-GUIDE.md`. Scene log: `PITCH-TRACKER.md`.

Read `../important_for_demo.md` before changing either video.

```bash
npm i
npx remotion render Pitch out/pitch.mp4
npx remotion render Demo out/demo.mp4   # needs public/rec/
```

Chain logos in `public/logos/` come from `@web3icons/core` (MIT). The background music in the final demo was synthesized for this project (no third-party track).
