# S02 Briefing Setup — Archer Test

**Unit:** 4.3 — S02 Briefing Setup Scene
**Date:** 2026-05-23
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.3
**Composition:** `PreviewS02BriefingSetup` (camelCase per Remotion validator)
**Duration:** 360 frames / 12.0 s @ 30 fps
**Render output:** `videos/trailer/out/s02-briefing-setup.mp4` (2.3 MB, H264 CRF 18)
**Stills evidence:** `videos/trailer/out/s02-frame-{0,60,120,240,359}.png`

---

## Sample-frame inspection

- [x] **Frame 0** (scene start) — Closed dossier cover visible centered:
  "TOP SECRET / NO FOREIGN DISSEMINATION" red stamp + "// OPERATION /
  PENDLETON / CASE FILE 02 · MAYFAIR" header + "P" Pendleton crest.
  Mahogany base + Pendleton-crest watermark top-left + brass nameplate
  bottom-right. Comms ticker reads "// CHANNEL OPEN".
- [x] **Frame 60** (2.0 s) — Dossier ~97% open (EASE_DRAWER cubic-bezier
  front-loads the opening — drawer feel = fast initial then settle).
  Open-folder interior visible: "// CASE FILE / 02 · MAYFAIR" + redaction
  bars + status "ACTIVE · BURNED" (BURNED in red) + last-contact
  timestamp + "P" crest + "TOP SECRET" stamp. Brass nameplate persisting
  bottom-right.
- [x] **Frame 120** (4.0 s) — Folder fully open, settled state. Briggsy
  can read the dossier dense vocabulary.
- [x] **Frame 240** (8.0 s) — Mid-scene hold. Ticker FROZEN at "//
  CHANNEL OPEN" (rotation index pinned at hold-start = scene-relative
  frame 30 per holdDuringFrames=[[30, 330]]) — design-lens behavior
  verified.
- [x] **Frame 359** (11.97 s — scene end) — Same composition as 240/120;
  scene-end posture ready for S03 hard cut at composition frame 570.

## Master-render-only checks (per amendment SA-10)

- [ ] Composition-level Dash VO from AUDIO_ASSETS plays from absolute
  frame 219 (s02-cue-219-dash.wav). Verified in master render only —
  S02 standalone is silent.
- [ ] Dossier-open animation at scene-relative 30 lands ~9 frames before
  Dash starts speaking (Dash starts at absolute 219 = scene-relative
  9; folder begins opening at scene-relative 30). The 21-frame gap
  between VO start and dossier opening is intentional per Phase 1
  BEAT-SHEET — Dash speaks the briefing overture as the folder reveals.

## §2 Quality Bar (per BURNED CLAUDE.md + insight #050)

- [ ] **Could this be from an Archer episode?** Pure mahogany briefing-
  room vocabulary — pending Briggsy-eye signoff.
- [x] **Mahogany desk reads warm + Archer-coded.** Horizontal wood-grain
  PNG covers the canvas; ochre/warm-amber dominates.
- [x] **Venetian-blind shadow subtle.** Drifts 0→60px over the scene via
  EASE_OUT_EMIL; opacity 0.6 with 105% scale to prevent edge-reveal
  mid-drift. Reads more as ambient temperature than as overt stripe
  motion — emil "screensaver-pan" tell avoided.
- [x] **Folder opening choreography natural.** EASE_DRAWER cubic-bezier
  (0.32, 0.72, 0, 1) front-loads the opening — feels like a drawer
  pulled open, not a linear fade. Single function-form export
  (`EASE_DRAWER_FN` in animations.ts) shares coefficients with timing.ts
  CSS-string `EASE_DRAWER` per insight #057 SSoT discipline.
- [x] **Comms-ticker chrome reads as set-dressing, not UI.** Bottom 48px
  strip, dark charcoal-3 band, ochre-9 ink mono-caps with `// `
  prefix matching project-wide non-interactive vocabulary (per CLAUDE.md
  landmine entry). Holds one line during scene-relative 30-330 per
  design-lens.

## Motion polish (per emil + Phase 1 lock)

- [x] **EASE_DRAWER curve visible on folder opening.** Verified by
  comparing closed-opacity progression from frame 30 (full closed) →
  frame 60 (~3% closed remaining, ~97% open) → frame 90 (settled).
  Drawer feel: fast pull → quick settle, NOT linear.
- [x] **Blind shadow translateX is 60px over scene** — re-derived as
  60/(360-1) ≈ 0.17 px/frame perceived (the SVG layer is 105% scaled
  so the 60px translate is a smaller perceptual shift relative to the
  underlying mahogany). Subtle ambient motion, NOT theatrical pan.
- [x] **Brass nameplate sits in foreground bottom-edge.** depth-plane.svg
  rendered at 540×144 (Phase 3 native viewBox 600×160, 10% downscale)
  above the comms-ticker strip (ticker height 48 + 52px breathing).

## R1 acceptance (briefing-room establishing)

- [x] **Mahogany establishes briefing-room.** Warm wood-grain
  unambiguously reads Pendleton Bureau.
- [x] **Pendleton crest watermark visible.** Top-left at 0.3 opacity,
  140×140 px — institutional chrome.
- [x] **Dossier opens.** Crossfade from `dossier-folder-closed.svg` to
  `dossier-folder-open.svg` via EASE_DRAWER.
- [x] **Comms ticker present.** Bottom strip, idle vocabulary matches
  in-game DossierFeed.

## Mid-flight findings + fixes

- **Plan body's `brass-nameplate.svg` filename is stale.** Phase 3 Unit
  3.3 Option A actually ships as `depth-plane.svg`. Used the on-disk
  name (insight #057 source-wins).
- **Plan body's `--color-ink-12` token is stale.** BURNED palette has
  `--color-charcoal-12` (no "ink" scale exists). CommsTicker uses
  charcoal-3 `#1a1812` directly for the band background.
- **`EASE_DRAWER` is a CSS string in timing.ts; needed a function form
  for `interpolate()` consumers.** Added `EASE_DRAWER_FN` to
  animations.ts with same coefficients (cubic-bezier(0.32, 0.72, 0, 1)).
  Same SSoT pattern as `EASE_OUT` (CSS string) ↔ `EASE_OUT_EMIL`
  (function form). Also added `EASE_IN_OUT_FN` for upcoming page-wipe /
  iris consumers.

## Briggsy-eye sentinel

- [ ] `briggsy-review-4.3.signoff` pending. Briggsy reviews
  `out/s02-briefing-setup.mp4` and writes the sentinel after sign-off.
  Unit 4.10 master-render entry gated on all 6 sentinels.

## Verdict

**Pending Briggsy-eye review.** Engineering confidence: high. Scene
reads as Pendleton briefing-room set establishing. Folder-opens-as-
briefer-begins choreography lands at the BEAT-SHEET cue. Comms-ticker
hold-during-VO design-lens behavior verified by inspection. Component
inventory carries forward to Units 4.4 (S03 — same BriefingRoomBackground
+ CommsTicker), 4.6 (S05 likely same nameplate), 4.7 (S06 — same
mahogany + crest vocabulary).
