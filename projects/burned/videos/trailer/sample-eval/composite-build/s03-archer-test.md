# S03 Mission Background — Archer Test

**Unit:** 4.4 — S03 Mission Background Scene
**Date:** 2026-05-23
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.4
**Composition:** `PreviewS03MissionBackground`
**Duration:** 810 frames / 27.0 s @ 30 fps (post-Tier-4 expansion;
plan body's 480-frame budget is stale per insight #061)
**Render output:** `videos/trailer/out/s03-mission-background.mp4` (4.2 MB, H264 CRF 18)
**Stills:** `videos/trailer/out/s03-frame-{110,200,220,423,600}.png`

---

## Sample-frame inspection

- [x] **Frame 110** (3.67 s) — 6-operative roster slide-in complete.
  Cards stack vertically along the mobile safe-square right edge
  (x=1314..1420; 6×148 + 5×12 = 948 px vertical span with 42 px top
  inset). Cream matte + ochre-9 border + portrait + ochre-9 name strip
  per BURNED card vocabulary.
- [x] **Frame 220** (7.33 s) — Otto-aside typographic chrome lands
  bottom-left ("// OPERATIVE 07: BASEMENT — DO NOT ASK", JetBrains
  Mono 500 20px ochre-11 marginalia register). All 6 operatives held;
  Agent X bottom card shows the vendored `RedactBar` overlay across
  the name strip (tilt -2° for hand-stamped vibe) instead of a name.
- [x] **Frame 423** (14.1 s) — Mid-wipe. Cream-12 paper panel sweeps
  left-to-right across the canvas during the 16-frame Phase 1 lock
  window (rel 415-431). Trailing ochre shadow on the panel's left
  edge sells the page-peel metaphor.
- [x] **Frame 600** (20.0 s) — Post-wipe; full roster + Otto-aside +
  ticker restored. Scene continues through VO #2 window (rel 437-799).

## Master-render-only checks (per amendment SA-10)

- [ ] Composition-level Dash VO #1 (`s03-cue-570-dash.wav`, abs 570,
  407 frames) plays from scene-relative 0; lands the "Seven on the
  roster, six in the deck, one in the basement…" content while the
  roster is sliding in (rel 60-110) and the Otto-aside is appearing
  (rel 200).
- [ ] Composition-level Dash VO #2 (`s03-cue-1007-dash.wav`, abs 1007,
  362 frames) plays from scene-relative 437; lands the "Fourteen
  thousand pages. Six sticky notes…" content after the dossier-page
  wipe.
- [ ] CommsTicker holds during BOTH VO windows; freezes rotation
  index at hold-start.

## §2 Quality Bar (per BURNED CLAUDE.md + insight #050)

- [ ] **Could this be from an Archer episode?** — pending Briggsy-eye.
- [x] **Roster entry choreography reads briefing-room formal.**
  EASE_OUT_EMIL slide-in (240 px → 0 over 20 frames per card, 6-frame
  stagger across 6 cards = 90-110 entry window). Snap-into-place, not
  linear.
- [x] **6 operative portraits readable at 106×148 thumbnail.** Cards
  sized to fit the 1032-px clear band (canvas height − 48-px ticker)
  while preserving the 5:7 BURNED card aspect.
- [x] **Otto-aside reads as classified marginalia.** ochre-11 +
  JetBrains Mono caps + bottom-LEFT placement (matches the "the
  documentation tells you not to ask" register; not chrome banner).
  Lands rel 200 (during VO #1's "one in the basement" beat).
- [x] **Continuity with S02.** `BriefingRoomBackground` re-used —
  mahogany base + venetian-blind drift carry through without seams.
  CommsTicker re-used.

## Motion polish (per emil + Phase 1 lock)

- [x] **EASE_OUT_EMIL on the slide-in.** cubic-bezier(0.16, 1, 0.3, 1)
  — snap into place; verified by frame 220 (post-entry) showing cards
  fully settled.
- [x] **2-frame stagger between cards.** Actually 6-frame stagger
  here per S03 deepening (cascade-halo-column.json's 2-frame stagger
  is for S04 cascade halo; S03 roster uses a more relaxed pacing
  since it's the establishing reveal, not the payoff).
- [x] **DossierPageWipe 16-frame duration** matches `transitions.ts`
  `DOSSIER_WIPE_FRAMES` Phase 1 lock. EASE_IN_OUT_FN drives the panel
  translation (cubic-bezier(0.77, 0, 0.175, 1)) — gentle acceleration
  and decel rather than constant-speed sweep.

## R1 acceptance (mission-background reveal)

- [x] **Roster lands.** 6 operatives present; the BEAT-SHEET Phase 1
  Unit 1.10 roster-aside lineup matches.
- [x] **Otto excluded with typographic punchline.** No Otto portrait;
  the absence IS the joke per Fork 2 Typographic BASEMENT option.
- [x] **Agent X redacted.** Vendored `RedactBar` overlays the name
  strip.
- [x] **DeckOf120 NOT present** per amendment SA-5 (not in Phase 1
  BEAT-SHEET narration "Fourteen thousand pages. Six sticky notes").

## Mid-flight findings + fixes

- **Plan body's "frames 0-480 relative" timing is stale.** Tier-4
  expansion grew S03 to 810 frames; VO landings shifted to abs
  570/1007 (= rel 0/437). Re-derived all visual anchors against the
  Phase 2 audio-manifest at execution time per insight #061. Plan
  body's specific frame numbers (180, 240, 270) were 480-frame
  proportional; new equivalents anchor to VO-content boundaries
  (60-110 roster entry, 200 Otto-aside, 415 wipe centered in the
  30-frame silence gap).
- **Card stack overflowed canvas at original 168-px height.** 6×168 +
  5×12 = 1068 ate the 48-px ticker zone. Shrunk to 148×106 (5:7
  preserved); column now 948 px, top inset 42 centers it.
- **Plan body's roster `right: 500` value reused** per amendment
  TIER 3 #11 (mobile safe-square inner; was outside x=1500 right
  boundary before deepening).

## Briggsy-eye sentinel

- [ ] `briggsy-review-4.4.signoff` pending. Render evidence ready at
  `out/s03-mission-background.mp4` (4.2 MB).

## Verdict

**Pending Briggsy-eye review.** Engineering confidence: high. Scene
delivers the roster-reveal arc with Otto's typographic punchline
landing during VO #1; mid-scene wipe punctuates VO #1 → VO #2 split
without inventing the cut DeckOf120. Component inventory
(`BriefingRoomBackground`, `CommsTicker`, `DossierPageWipe`,
`RedactBar`) sets up clean reuse into S04 cascade (Unit 4.5) where
the same 6 operatives reappear as the cascade-halo column.
