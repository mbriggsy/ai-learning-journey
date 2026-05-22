# Phase 3 — Visual Asset Inventory

Consolidated inventory of every visual asset Phase 4 consumes from the
trailer composite. Per Phase 3 deepening (scope-guardian Q6): single
inventory doc replaces the 4 per-unit eval markdowns
(`htp-capture.md`, `briefing-room-assets.md`, `r15-chrome.md`,
`title-sequence.md`). Standalone docs preserved:
[`card-curation.md`](./card-curation.md),
`music-audition-log.md` (Unit 3.5), `music-license.pdf` (Unit 3.5).

Source-of-truth pointers:
- Phase 0 ADR #8: `Config.setPublicDir('../../public')` — all `staticFile`
  paths resolve relative to BURNED's `public/` (not
  `videos/trailer/public/` which is unreachable during render).
- Phase 3 ADR #15: NEW SVGs land at `public/trailer/<unit-prefix>/`
  inside BURNED's existing public/.

---

## Unit 3.1 — HOW-TO-PLAY fullpage capture (HERO)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `trailer/htp-fullpage.png` | Playwright capture of production `https://burned-cxa.pages.dev/howtoplay` (positive-completion gate per insight #064 — opacity-only, transform excluded) | 1920 × ~21000 (full scrolling page) | HERO | S05 deep-scroll reveal of operations manual chrome |

Capture script: `videos/trailer/scripts/capture-htp-scroll-burned.ts`.
Re-run: `pnpm capture:htp` (production default) or
`HTP_URL=http://localhost:5173/howtoplay.html pnpm capture:htp`.

---

## Unit 3.2 — Card-art curation

See [`card-curation.md`](./card-curation.md) for the 17-entry roster
breakdown + per-card selection rationale. Phase 4 imports via
`staticFile('assets/cards/<filename>')`.

Cascade halo column geometry: `videos/trailer/src/lib/cascade-halo-column.json`.
Typed roster: `videos/trailer/src/lib/card-roster.ts`.

---

## Unit 3.3 — Briefing-Room Set-Dressing

### Existing assets (Path A via staticFile through ADR #8)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `assets/arena/mahogany-horizontal.png` | Imagen-gen (`scripts/generate-briefing-assets.ts`) | 1.8 MB raster | HERO | S02 / S06 desk backdrop |
| `assets/arena/mahogany-vertical.png` | Same | 1.6 MB raster | TEXTURE | Vertical frame elements |
| `assets/arena/blotter.png` | Same | 1.4 MB raster | TEXTURE | Paper-pad backdrop |
| `assets/arena/stamp-classified.png` | Same | 599 KB raster | CHROME | Classification stamp primitive |
| `assets/arena/operative-silhouette.png` | Same | 759 KB raster | CHROME | Agent X REDACTED treatment |
| `assets/arena/portrait-{dash,vera,otto,janet,neal,agent-x}.png` | Same | 700KB–1.3MB ea | HERO | S03 dossier portraits |
| `assets/roster/{operative}.png` | Same | 1.1–1.3MB ea | HERO | Higher-res alternative (Sable available HERE only — not in arena/) |
| `assets/howtoplay/pendleton-crest.png` | Imagen-gen (`scripts/generate-htp-assets.ts`) | 1.5 MB raster | CHROME | Poster crest watermark (S02 corner + S06 closing-folder dressing) |
| `assets/howtoplay/operations-manual-plate.png` | Same | 1.4 MB raster | HERO | Cold-open title plate (Unit 3.6 consumes) |

### NEW assets (Path B vector SVGs at `public/trailer/briefing-room/`)

| staticFile arg | Source | Dimensions | Tier | Trailer role |
|---|---|---|---|---|
| `trailer/briefing-room/venetian-blinds.svg` | Hand-authored | 1920×1080 viewBox | TEXTURE | S02 sun-through-blinds shadow mask; Phase 4 animates translateX 1.5–2px/frame per Phase 1 lock. Sun-from-right bias (peak shadow ~62% from left edge); 7 irregular slats + back-layer parallax slats so slow translate doesn't read as repeating gradient |
| `trailer/briefing-room/dossier-folder-closed.svg` | Hand-authored | 1000×1300 viewBox | HERO | S02 cold-open pre-reveal state. Manila body + diagonal TOP SECRET stamp (burned-fire ink-bleed via feMorphology+blur) + // OPERATION / PENDLETON / CASE FILE 02 · MAYFAIR wordmark + Pendleton crest watermark (0.30 opacity) + hand-tab "PEN · 62 · 02" + paperclip (top-left, 7° tilt) + filing stamp "FILED 1962 · NOV · 14" |
| `trailer/briefing-room/dossier-folder-open.svg` | Hand-authored | 1000×1300 viewBox | HERO | S02 reveal post-state. Inner cream case-sheet with "// CASE FILE / 02 · MAYFAIR" header + left-margin classification ribbon (burned-fire) + OPERATIVE [redacted bar] + STATUS "ACTIVE · BURNED" callout + BRIEF (3 redaction bars) + LAST CONTACT date + small TOP SECRET stamp + CLEARANCE / FORM PEN-22-CF footer + Pendleton crest watermark (0.18 opacity). Designed as "what's revealed when cover lifts" — Phase 4 layers closed.svg on top + animates cover away |
| `trailer/briefing-room/depth-plane.svg` | Hand-authored (Step 7 pick: **Option A — brass nameplate**) | 600×160 viewBox | HERO | S02 foreground depth-plane element per Phase 1 Unit 1.10 deepening. Diagonal-specular brass gradient + 4 corner phillips-slot screws + serif "M. PENDLETON" + mono-caps "BUREAU CHIEF" engraved-into-brass via filter (dark-down + light-up offsets simulate depression) + plate-drop cast shadow |

### Reference renders (Phase 4 visual-diff only — NOT shipped to public/)

| Path | Source | Status | Purpose |
|---|---|---|---|
| `sample-eval/visual-asset-prep/case-banner-reference.png` | Playwright crop of BURNED live `<aside[class*="caseBanner"]>` (partial-class selector survives Vite CSS-module hashing per insight #064) | **Deferred to Phase 4 invocation** — capture requires BURNED in playing-state game (see script header) | Phase 4 visual-diff against the vendored-component render of `GameTable.tsx:67-88` JSX |
| `sample-eval/visual-asset-prep/comms-ticker-reference.png` | Playwright crop of BURNED live DossierFeed (`div[class*="folder"]`) | **Deferred to Phase 4 invocation** — same prereqs | Same — Phase 4 visual-diff against vendored DossierFeed-equivalent render |

Capture script: `videos/trailer/scripts/capture-banner-references.ts`.
Re-run (after dev servers + room in playing state): `pnpm capture:banner-refs`.

### Depth-plane option lock

Phase 1 Unit 1.10 deepening offered three options for the foreground
depth-plane element:

- **Option A — brass nameplate** "M. PENDLETON / BUREAU CHIEF" ✅ **shipped**
- Option B — manila folders stack (3-4 folders, slight rotations, paperclip affordances, edge classification stamps)
- Option C — doorframe vignette (large architectural frame at viewport edge, gradient-shadow into desk plane)

**Reasoning for Option A:** strongest single narrative element. Anchors
the agency naming ("M. Pendleton" = Bureau Chief = the M. in
"Briefed by **M.**" on the live CASE BANNER). Reads cleanly in-frame
at small dimensions (Phase 4 may treat as 1/3-canvas accent OR full-
nameplate hero across S02 → S06). Typographic family matches the
existing `pendleton-crest.png` serif anchor.

If Phase 4 review during Unit 3.7 consolidated-gate finds Option A
underweight in collision with HTP hero + R15 chrome, Option B (folders
stack) is the recommended fallback per insight #018 stop-and-re-architect:
remove the brass element, recontextualize as additional dossiers.

---

## Unit 3.4 — R15 Chrome Stamps (SPLIT-LAYER)

*Pending Unit 3.4 execution.*

---

## Unit 3.5 — Music bed procurement

See `music-audition-log.md` (when Unit 3.5 produces it) +
`music-license.pdf` (licensing artifact).

---

## Unit 3.6 — Cold-open title sequence

*Pending Unit 3.6 execution.*

---

## Spend tracker pointer

Running Imagen spend tracker:
`videos/trailer/sample-eval/visual-asset-prep/imagen-spend.md` (when
Unit 3.x produces it). Hard abort at $6 per plan §"Imagen Spend
Tracker." **Unit 3.3 consumed $0** (all assets hand-authored OR
pre-existing).
