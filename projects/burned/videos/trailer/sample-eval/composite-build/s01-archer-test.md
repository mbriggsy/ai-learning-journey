# S01 Cold Open — Archer Test

**Unit:** 4.2 — S01 Cold Open Scene
**Date:** 2026-05-22
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.2
**Composition:** `PreviewS01ColdOpen` (camelCase per Remotion 4.0.438 `isCompositionIdValid`)
**Duration:** 210 frames / 7.0 s @ 30 fps
**Render output:** `videos/trailer/out/s01-cold-open.mp4` (1.9 MB, H264 CRF 18)
**Stills evidence:** `videos/trailer/out/s01-frame-{30,90,150,156,162,180,210}.png`

---

## Sample-frame inspection (re-rendered after R15 paperBg fix)

- [x] **Frame 30** (1.0 s in) — Janet card full opacity. SVG chrome reads
  (target reticle upper-right, `// OPERATIVE FILE` kicker upper-left,
  `PEN · 62 · 02` file code, chevron flanks on name plate). Name overlay
  "JANET BROADSIDE" in Clash Display 700 56px on ochre-9 plate. Chevron-
  motif background at 0.6 opacity, behind the card.
- [x] **Frame 90** (3.0 s in) — Dash card at full opacity. Janet has
  faded out (asymmetric envelope, 10-frame exit).
- [x] **Frame 150** (5.0 s in) — Neal card at full opacity. R15 #1 stamp
  starts landing (opacity ramping 0→1 over 3 frames; scale envelope
  building from 0.95).
- [x] **Frame 156** (5.2 s in) — R15 #1 stamp visibly approaching
  overshoot (scale ~1.04). Cream-12 paper plate provides high contrast
  against Neal's ochre-9 name plate. Tilted -12° per Phase 3 lock.
  "OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS" all readable.
- [x] **Frame 162** (5.4 s in) — R15 #1 fully settled at scale 1.0. Neal
  card still at full opacity. Stamp + card co-exist as "classified
  stamp on briefing file" composition.
- [x] **Frame 180** (6.0 s in) — Neal faded; BURNED card-art reveal
  (burned.webp — two operatives at a 70s sedan, twilight noir scene)
  lands via LOGO_SPRING_COLD spring (0.95 → ~1.04 overshoot → 1.0).
  R15 #1 stamp persists at bottom-left, now overprinting the BURNED
  card. The card-art's noir blue + warm rim light reads cleanly with
  the cream-paper stamp.
- [x] **Frame 210** (7.0 s — scene end) — BURNED card + R15 stamp
  holding. Ready for hard cut to S02 BriefingSetup at composition frame
  S01_END = 210.

## §2 Quality Bar (per BURNED CLAUDE.md + insight #050)

- [ ] **Could this be a frame from an Archer episode?** (BRIGGSY EYE —
  fluency read, not property checklist). Stills + MP4 ready for review.
- [x] **Composition discipline.** Each frame has a clear hero element
  (operative card / BURNED card) and a single supporting chrome layer
  (background pattern + classification stamp at frames 150+).
- [x] **Palette discipline.** Cream-1 #0e0c08 canvas, ochre-9 #947226
  ink, cream-12 #f6ebce paper, burned-fire #be2e27 reticle accent — all
  from `tokens.css`. No off-palette colors.
- [x] **Typographic discipline.** Clash Display 700 (operative names),
  JetBrains Mono 700/800 (R15 stamp text). Both faces visibly
  exercised. Variable-axis weights resolved (carry-forward gate from
  Unit 4.0 closed by Unit 4.1 font panel; this scene exercises the
  weights in production typography).

## Motion polish (per emil + Phase 1 lock)

- [x] **R15Stamp scale shape is 0.95 → 1.04 → 1.0.** `archerStampSlap`
  helper enforces via STAMP_SLAP envelope keyframes (6f scale-in to
  1.04 peak, 4f settle to 1.0, 2f hold). Verified by inspecting
  frame 156 (mid-overshoot) and frame 162 (settled). NOT 1.4 → 0.95 → 1.0
  (the AI-slop anti-pattern Phase 1 deepening guarded against).
- [x] **Card opacity entries use EASE_OUT_EMIL.** `cubic-bezier(0.16, 1, 0.3, 1)`
  applied to all 3 card flash envelopes. Snap-into-place, NOT linear.
- [x] **LOGO_SPRING_COLD feels distinct from the stamp slap.** Spring-
  driven scale (mass 0.5, damping 11, stiffness 200,
  overshootClamping false) lands faster and bouncier than the
  interpolated stamp envelope. S06's LOGO_SPRING_CLOSING (Unit 4.7) will
  use a higher damping for the calmer wordmark settle.

## R14 acceptance (cold-open hook)

- [x] **Compressed-Archer shape lands within 8 s.** S01 = 7.0 s end-to-end.
- [x] **3 operative cards flash.** Janet (30–90), Dash (90–150), Neal
  (150–180) — Phase 1 Unit 1.10 display-order lock pinned by
  `COLD_OPEN_CARDS_DISPLAY_ORDER` (test invariant in `card-roster.test.ts`).
- [x] **BURNED reveal lands.** `burned.webp` card-art reveal at frame
  180 per Phase 3 Unit 3.6 deepening lock (S01 uses card art; S06 uses
  wordmark SVG — the two-treatments-per-scene split is by design).
- [x] **R15 #1 stamp reads at frame 150+.** Visible from frame ~153
  (opacity ramp completes at landFrame+3) through scene end, with the
  cream-12 paper plate per BEAT-SHEET line 144.

## Mid-flight findings + fixes (logged for Phase 3 / Phase 4 carry-back)

- **R15 #1 SVG missing cream-12 paper plate.** BEAT-SHEET §R15 catalog
  (line 144) specifies "ochre-9 ink on cream-12 stamp paper." The
  Phase 3 split-layer SVGs (`stamp-1-…-frame.svg` + `-text.svg`) are
  transparent. Fix shipped at the COMPONENT level: `R15Stamp` accepts
  an optional `paperBg` prop; S01 passes `paperBg="#f6ebce"`. Phase 3
  may want to bake the plate into the SVG itself (deferred to a future
  Phase 3 maintenance pass — not blocking Unit 4.2).
- **R15 #1 visibility check at frame 150 (intended slap land).** Card
  flashes are 800×1000 centered, covering most of the canvas. The R15
  stamp at bottom-left overlaps with the operative card's lower
  region. Without the cream-12 paper plate the ochre-9 ink on ochre-9
  name plate produced near-zero contrast. The plate fix resolves the
  visibility issue; the stamp now reads as the intentional "classified
  stamp on briefing file" composition per BEAT-SHEET intent.
- **Plan body `burned-logo-cold-open.svg` filename was stale.** Phase 3
  Unit 3.6 deepening merged the cold-open + closing logos into a
  single `burned-logo.svg` for S06 only; S01 uses `burned.webp` (card
  art) per the lock-comment in the SVG header. Plan body line 1296
  was a snapshot pre-deepening. Source wins (insight #057).
- **Plan body R15 stamp filenames lacked descriptors.** Plan body refers
  to `stamp-1-frame.svg` etc. but Phase 3 Unit 3.4 SVG export uses
  descriptor-bearing filenames (`stamp-1-operation-pendleton-frame.svg`
  etc.). Same enumeration-decay class as insight #061. Used the actual
  filenames.

## Briggsy-eye sentinel

- [ ] **`briggsy-review-4.2.signoff` sentinel pending.** Briggsy reviews
  the rendered MP4 (`out/s01-cold-open.mp4`) and writes the sentinel
  file in this directory after Archer-test sign-off. Unit 4.10 master-
  render entry gated on all 6 sentinels present.

## Verdict

**Pending Briggsy-eye review.** Stills + MP4 ready. Engineering
confidence: high. Choreography lands the Phase 1 R14 cold-open arc
(operative briefing → classification → payoff card). Motion shapes
match Phase 0 spike + Phase 1 lock. Cream-paper R15 fix resolves the
only mid-flight visibility issue; net component inventory (R15Stamp +
OperativeCardFrame + LOGO_SPRING_COLD + archerStampSlap +
COLD_OPEN_CARDS_DISPLAY_ORDER) carries forward into Units 4.3–4.7.
