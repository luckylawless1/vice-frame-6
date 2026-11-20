# VICE FRAME 6 — GTA-Style Cover Art Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/luckylawless1/vice-frame-6/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/luckylawless1/vice-frame-6/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

VICE FRAME 6 is an offline web app that turns any photo plus a caption into
GTA-style multi-panel cover art, exported as a PNG in three sizes:
**1080×1080**, **1080×1350** and **1920×1080**. It is plain static files —
no build step, no network, no dependencies — and runs in a desktop browser
straight from disk. Your photos never leave your machine.

## Run it

- Open `app/index.html` in Chrome, or
- serve the repo root with `node serve.ts` and open the printed local
  address (http://localhost:8080 by default).

## What it does

- **Photos** — 9 bundled sample photos (generated fresh for this entry:
  neon marina, ocean-drive sunset, casino strip, rooftop crew, retro
  diner, golden-hour yacht, beach duo, pier fisher, boardwalk portrait),
  plus your own: upload multiple files or drag & drop them onto the
  cover. Click a panel on the canvas to select it, then click a
  thumbnail to put that photo into the selected panel.
- **Framing** — drag on the canvas to pan the selected panel's photo,
  zoom with the mouse wheel or the 1–3 zoom slider, double-click a panel
  to reset its framing, and nudge with the arrow keys (Shift for bigger
  steps).
- **Layouts (8)** — Cover Star (big left + two stacked right), Collage
  Four (2×2), Panel Grid (3×2), Crew Wide (wide top + two below), Cover
  Closeup (one huge hero panel at ~75% width + two insets), Angled Grid
  (diagonal-cut parallelogram panels), Masthead Hero (one full-bleed
  photo with the title over the art and two insets along the bottom) and
  the **Storyboard Strip** (below).
- **Storyboard Strip — the differentiator.** A 4-panel sequential strip
  where every panel carries its own numbered, individually editable
  scene caption along its bottom inside the panel (“SCENE 1 — THE MEET”,
  “SCENE 2 — THE CHASE”, “SCENE 3 — THE DOUBLE-CROSS”, “SCENE 4 — THE
  GETAWAY”). A set of photos becomes a story cover, not just a collage.
- **Grades (9)** — Clean, Vice Sunset, Neon Night, Ink Poster (posterize
  + Sobel ink edges + halftone dots), Duotone Heat (luminance mapped
  through a teal → hot-pink → cream duotone ramp), Split Tone, Golden
  Hour, Newsprint (black-and-white halftone newspaper duotone) and
  Chrome '84 (lifted blacks, cyan/magenta split sheen, subtle
  scanlines). Grades are per-panel, with an apply-to-all button.
- **Role tags** — every panel carries an editable role tag (defaults:
  THE DRIVER, THE FIXER, THE SIREN, THE LOOKOUT…) rendered as a small
  angled label chip on the panel's corner, like a cast callout.
- **Words** — editable Title, Tagline and Caption. The masthead is set in
  Anton (shipped under `app/fonts/` with its OFL license), wrapped and
  measured to fit, with a pink→violet→teal gradient fill and a dark
  outline. A row of 5 gold wanted-stars is always laid out from the
  measured bottom edge of the wrapped title, so it can never overlap the
  masthead. The tagline sits under the stars with a neon pink glow and a
  slight shear; the caption sits in a dark rounded bar near the bottom,
  set in Archivo Black (also shipped, OFL), with a pink→teal accent
  strip on top.
- **Billing block** — an editable movie-poster billing line: tiny
  condensed all-caps credits text across the bottom of the cover, above
  the barcode area.
- **Dressing** — toggleable canvas-drawn stickers (neon palm, “NEW!”
  starburst — always inset from the canvas edges so it is never clipped
  — and a sun badge), a toggleable circular **seal** (ring text
  “LAS LUMEN · COVER OF THE MONTH ·” around a gold star, placed at a
  bottom corner, never clipped), film grain from a seeded noise tile, a
  deterministic canvas-drawn magazine barcode block (seeded PRNG) and
  the editorial line “ISSUE 06 · LAS LUMEN · $6.99” bottom-right above
  the caption bar.
- **Export** — one click exports the current size as a PNG, or use
  “Export all 3 sizes” to download 1080×1080, 1080×1350 and 1920×1080 in
  one go.
- **Screenshot scenes** — `?shot=cover` hides the editor and shows only
  the cover; `?shot=editor` shows the normal editor. Both accept
  `photo=`, `photos=`, `caption=`, `title=`, `tagline=`, `billing=`,
  `layout=`, `size=` and `grade=` query params (see `shots.json` for the
  four scenes shipped in `screenshots/`).

Everything is original: no Rockstar logos, wordmarks, artwork, characters
or fonts. The two display fonts are open-licensed (SIL Open Font License,
texts in `app/fonts/`).

## Layout of this repo

- `app/` — the web app (static HTML/CSS/JS, ES modules, canvas rendering).
- `screenshots/` — four JPEG captures of the running app.
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to
  the output directory and writes `dossier.json` with the vendored
  library.
- `serve.ts` — a small local static server for previewing `app/`.
- `vendor/` — the kit's vendored library (untouched).
