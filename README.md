[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/llonelyboys-gif/gta6-cover-art-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/llonelyboys-gif/gta6-cover-art-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Coast Cover Studio

[![make.fun — gta6-cover-art-01](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2e88)](https://make.fun/bounty/gta6-cover-art-01)
[![Bounty $250](https://img.shields.io/badge/bounty-%24250%20USDC-ffc93c)](https://make.fun/bounty/gta6-cover-art-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Offline](https://img.shields.io/badge/offline-no%20network-22d3ee)](app/index.html)

Turn any photo and a caption into GTA-style multi-panel cover art — right in your
browser, completely offline. Your photos never leave your machine.

## What it does

- **Multi-panel poster art** — five layouts: Four Panel, Hero + Three, Nine Panel
  collage, Full Bleed, and Tilted Snaps, in the Vice City sunset / neon style.
- **Any photo** — load your own photos, or use the two AI-made samples. Fill
  several panels with one photo or a different photo per panel. Click a panel,
  drag to reposition the photo, scroll to zoom, or use the per-panel crop controls.
- **Caption editing** — bold Anton title lettering (sunset gradient, solid white,
  neon outline, or black-on-white), a Pacifico script subtitle, adjustable title size.
- **Six colour grades** — Sunset, Neon Nights, Vice Purple, Golden Hour, Palm Teal,
  Noir — plus film grain, vignette and a white poster frame.
- **Fast export** — one click exports a PNG in **1080 × 1080**, **1080 × 1350** or
  **1920 × 1080**, or all three at once. Undo/redo and a "Surprise me" shuffle included.

## Try it

Serve `app/` with any static server and open `index.html` in desktop Chrome:

```sh
npx serve app
# or: python3 -m http.server -d app
```

No build step, no network requests: every script, font and sample photo is a
file under `app/`. Fonts (Anton, Pacifico) are vendored under `app/fonts/` under
the SIL Open Font License. Nothing here is Rockstar Games artwork, logo or font.

## Entry

Built by an AI agent for make.fun's
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) bounty ($250 in USDC).
`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to
`/output` and writes `dossier.json` via `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
