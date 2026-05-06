---
title: "Phase 5 §2.4 follow-up — CVD palette amendments"
type: follow-up
phase: 5
parent: docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md
status: pending
date: 2026-05-06
---

# Phase 5 §2.4 follow-up — CVD palette amendments

## Why this exists

Phase 5 §2.4 expanded `palette-cvd.test.ts` from 3 critical pairs to 36
across six gameplay-context groups. Running the §2.4.3 tuning protocol
against the committed Phase 1 palette surfaced **9 failing (pair, simulator)
combos** below the strict 0.10 floor — all in the strict tier (color is the
sole indicator).

Per plan §7.1 the fix lands in Phase 1 (palette amendment), not in the
test. The 9 cases were captured as `test.fails` entries in
`DESIGN_ATTENTION_CASES` so:

- The suite passes today (no false-red CI).
- A future palette change that improves any pair trips its `test.fails`
  ("Expect test to fail") — the signal to graduate the pair to
  `STRICT_PAIRS`.
- The bad state is documented in code, not lost in a one-off audit log.

This doc captures **what's failing, why, and the candidate fixes** so the
amendment session has a starting point.

## Failing cases

| # | Pair | Simulator | Distance | Surface |
|---|---|---|---|---|
| B4 | `color-accent-intercept` × `color-accent-drama` | deuteranopia | 0.0771 | DiscardFan side-by-side, badges |
| B5 | `color-accent-operative` × `color-accent-drama` | protanopia | 0.0887 | DiscardFan side-by-side, badges |
| E1 | `color-cordovan-9` × `color-teal-8` | deuteranopia | 0.0787 | DramaOverlay BURNED vs EXTRACTED |
| E2 | `color-cordovan-9` × `color-charcoal-6` | protanopia | 0.0544 | DramaOverlay BURNED vs ELIMINATED |
| E3 | `color-cordovan-9` × `color-emerald-8` | deuteranopia | 0.0480 | DramaOverlay BURNED vs INTERCEPTED |
| E6 | `color-teal-8` × `color-emerald-8` | tritanopia | **0.0098** | DramaOverlay EXTRACTED vs INTERCEPTED |
| E6 | `color-teal-8` × `color-emerald-8` | deuteranopia | 0.0374 | (same surface) |
| E6 | `color-teal-8` × `color-emerald-8` | protanopia | 0.0409 | (same surface) |
| E10 | `color-emerald-8` × `color-ochre-9` | protanopia | 0.0820 | DramaOverlay INTERCEPTED vs VICTORY |

## Failure-mode analysis

Three collision axes account for all 9 cases:

1. **Tritan teal/emerald axis (E6 tritan, 0.0098).** `teal-8 #406972` and
   `emerald-8 #396d5a` collapse to nearly identical color under
   tritanopia. This is the worst case in the catalog by an order of
   magnitude.

2. **Red-green axis under deuter/protan (B4, B5, E1, E2, E3, E6 deuter/protan,
   E10).** `cordovan-9 #ad4f5e` (wine red), `emerald-8 #396d5a`,
   `teal-8 #406972`, `ochre-9 #b58a3e`, `charcoal-6 #4a4d52` lose
   separation in pairs across the red-green deficiencies.

3. **Drama accent (`ochre-9`) collisions.** `ochre-9` is a warm yellow-amber
   that under deuter/protan reads similar to mid-luminance teal/emerald
   (B4, B5, E10).

## Candidate amendments

These are starting points, not decisions — visual review needed before
landing.

### Option A — bump emerald-8 cooler (most impact, smallest visual cost)

`emerald-8` shifts toward more blue-green (closer to teal-7 territory in
hue, lower in chroma). Pulls E6 (teal-8 vs emerald-8) apart while leaving
emerald-9 (`color-accent-intercept`, the card-color identity) alone.

- **Affected surfaces**: DramaOverlay INTERCEPTED background only
  (`emerald-8` is referenced in `DramaOverlay.module.css` for the
  intercepted variant). Other surfaces use `emerald-9` (intercept accent)
  or `emerald-3/11` (success bg/fg).
- **Risk**: small. Emerald-8 only appears as a DramaOverlay variant bg;
  changing it doesn't ripple through cards, badges, or status.
- **Likely fixes**: E6 all 3 sims, E3 deuter, E8 (currently passing —
  monitor), E10 protan.

### Option B — bump teal-8 cooler/darker (medium impact)

`teal-8 #406972` shifts toward `#3a5e7a` (less green). Pulls E1 (cordovan
vs teal) and E6 (teal vs emerald) apart.

- **Affected surfaces**: DramaOverlay EXTRACTED background; arena felt
  decoration if `--color-bg-app` is `teal-2` (a step-2 shift would NOT
  ripple, but step-8 might be referenced elsewhere — needs grep).
- **Risk**: medium. Teal is the BURNED brand color; step-8 is the dark
  variant.

### Option C — bump ochre-9 warmer (medium impact)

`ochre-9 #b58a3e` shifts toward `#c97a2e` (more orange, less yellow).
Pulls B4, B5, E10 apart from emerald/teal accents.

- **Affected surfaces**: `--color-accent-drama` (DramaOverlay VICTORY +
  IntelBriefing); `--color-border-focus` (focus ring) is `ochre-8` so
  unaffected.
- **Risk**: medium. VICTORY is a peak-ceremony moment; the warm-amber
  carries the celebratory tone.

### Option D — re-tune cordovan-9 darker (high impact, big visual)

`cordovan-9 #ad4f5e` shifts darker (`#8e3a48`). Pulls E1, E2, E3 apart by
adding luminance separation against teal-8/charcoal-6/emerald-8.

- **Affected surfaces**: `--color-accent-burned` is `--color-burned-fire`
  (NOT cordovan-9), but cordovan-9 is the DramaOverlay BURNED background
  and the danger semantic family root. Significant ripple.
- **Risk**: high. Touches the entire danger family (cordovan-3/7/9/11).

## Recommended sequence

1. **Option A first** (smallest blast radius, biggest impact on E6).
2. **Option C second** if B4/B5/E10 still fail after A.
3. **Option B/D last** — only if A+C don't clear all 9 cases.

Each amendment is one commit:
- Edit `primitives.css` + `palette.generated.ts` (regenerated via
  `pnpm generate:palette`).
- Re-run `pnpm test palette-cvd` — `test.fails` cases that now pass
  flip to "unexpected pass" and graduate to `STRICT_PAIRS`.
- Visual review on DramaOverlay variants in dev (eyeball the new
  emerald-8/teal-8/ochre-9 against the Dreamland reference frames).
- Re-run downstream tests (`palette-contrast`, any visual regressions).

## When this is done

`DESIGN_ATTENTION_CASES` is empty. All 36 pairs are in `STRICT_PAIRS` or
`INFORMATIONAL_PAIRS`, and all 108 strict cases pass at
`MIN_DISTANCE = 0.10`.

## What this is NOT

- **Not a one-line MIN_DISTANCE tweak.** Lowering the floor to "make it
  pass" inverts the test's purpose.
- **Not a re-tier.** Group E pairs are full-screen DramaOverlay
  backgrounds — color carries the moment. They belong in STRICT.
- **Not a "ship now and fix later forever."** The `test.fails` ratchets
  ensure we trip on improvement; left untouched indefinitely they just
  document a failure mode without correcting it.
