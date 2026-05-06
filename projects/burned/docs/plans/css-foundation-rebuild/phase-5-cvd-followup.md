---
title: "Phase 5 §2.4 + §2.5 follow-up — CVD + contrast palette amendments"
type: follow-up
phase: 5
parent: docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md
status: in-progress — Option A landed 2026-05-06; Option C + §2.5 #2/#3/#1 pending
date: 2026-05-06
---

# Phase 5 §2.4 + §2.5 follow-up — palette amendments

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

### Option A — bump emerald-8 cooler (most impact, smallest visual cost) ✅ LANDED 2026-05-06

**Shipped value**: `#396d5a` → `#3f8d7e` (mint-saturated mid-green-cyan).

The original spec ("closer to teal-7 in hue, lower in chroma") couldn't
clear E6 tritan within the constraints. Empirical probing of 30+
candidates surfaced `#3f8d7e` as the optimum: **higher saturation +
moderate L lift** (still under emerald-9's L ceiling) gives the headline
tritan separation AND preserves E10 deuter's STRICT pass.

**Graduated to STRICT**: E3 deuter (cordovan-9 vs emerald-8), E6 protan,
E6 tritan. E3 was added to `STRICT_PAIRS` (it wasn't there before — only
existed as a deuter design-attention case). E6 was added formally.

**Residual**: E6 deuter improved ~9× (the headline 0.0098 tritan
collision is gone) but at 0.0862 still under the 0.10 STRICT floor.
Awaits Option C — bumping ochre-9 won't help E6 directly, but the
residual emerald-8 vs teal-8 deuter gap may close as we re-tier
neighboring tokens in the next pass.

**Affected surfaces**: DramaOverlay INTERCEPTED background only (radial
gradient in `DramaOverlay.module.css:189-195`). Eyeballed at
`temp/arena-states/board/01-drama-intercepted.png` — the new mint-green
center reads brighter and more agency-Archer than the old forest tone;
APCA Lc 59.8 LARGE-tier confirmed via `palette-contrast.test.ts`.

**Test count delta**: +2 (gained 5 STRICT passes, lost 3 design-attention
ratchets; no STRICT regressions).

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

## §2.5 contrast follow-up (added by Step 9)

Phase 5 §2.5 expanded `palette-contrast.test.ts` from 13 pairs to 31.
Five (pair, metric) combos failed tier minimums and ratchet via
`test.fails` in `DESIGN_ATTENTION`. All overlap heavily with §2.4 — the
same ochre-9 / emerald-9 / teal-9 / cream-12 collisions that hurt CVD
distinguishability also fail body-text contrast against `cream-12`.

| # | Pair | Metric | Value | Min | Surface |
|---|---|---|---|---|---|
| 1 | `color-fg-muted` × `color-bg-surface` | APCA | Lc 43.0 | 45 | Muted text on card (large-text floor, just under) |
| 2 | `color-fg-on-intercept` × `color-accent-intercept` | APCA | Lc 46.1 | 60 | Intercept card face (charcoal-1 on emerald-9) |
| 3 | `color-fg-on-operative` × `color-accent-operative` | WCAG | 4.12:1 | 4.5 | Operative card face (cream-12 on teal-9) |
| 4 | `color-fg-on-drama` × `color-accent-drama` | WCAG | 3.22:1 | 4.5 | Drama-accent card face (cream-12 on ochre-9) |
| 5 | `color-fg-on-drama` × `color-accent-drama` | APCA | Lc 58.3 | 60 | Drama-accent card face (cream-12 on ochre-9) |

### How contrast fixes interact with CVD fixes

- **Option A (bump emerald-8 cooler)** — addresses §2.4 E6 tritan but
  doesn't directly help any §2.5 contrast pair (those touch emerald-9
  not -8). No conflict.
- **Option C (bump ochre-9 warmer/darker)** — addresses §2.4 B4/B5/E10
  AND §2.5 #4 + #5 (drama-accent card face cream-on-ochre). Same fix,
  two improvements. Highest-leverage amendment.
- **#2 Intercept card face APCA** — fixable by bumping `--color-fg-on-intercept`
  from `charcoal-1` to `charcoal-2` (slightly lighter) OR bumping
  `--color-accent-intercept` (`emerald-9`) deeper. Either preserves the
  dark-on-light intent.
- **#3 Operative card face WCAG** — cream-12 on teal-9 at 4.12:1 just
  misses 4.5. Bump teal-9 darker by half a step, or accept LARGE tier
  here (text-card-name-large clamp hits 24px so large-tier 3.0 passes
  comfortably). Re-classify decision is cheaper than palette amendment.
- **#1 muted on card APCA** — Lc 43 vs 45 is sub-JND distance. Could
  defend at LARGE-floor 45 by bumping `--color-fg-muted` from `cream-9`
  to `cream-10`, or accept as a known 2-Lc shortfall.

### Recommended sequence (revised, including §2.5)

1. **Option A first** (emerald-8 cooler) — clears §2.4 E6 (the worst
   case). Smallest blast radius.
2. **Option C second** (ochre-9 warmer/darker) — clears §2.4 B4/B5/E10
   AND §2.5 drama-accent card face #4 + #5. Two birds.
3. **§2.5 #2** — bump `--color-fg-on-intercept` lighter or
   `--color-accent-intercept` deeper. Local fix.
4. **§2.5 #3** — re-classify operative card face to LARGE tier OR bump
   teal-9 darker. Smaller footprint than amendment.
5. **§2.5 #1** — accept-as-known OR bump `--color-fg-muted` to cream-10.
6. **Option B/D last** — only if 1+2+3+4+5 don't clear all of §2.4 + §2.5.

## When this is done

`DESIGN_ATTENTION_CASES` (in `palette-cvd.test.ts`) is empty. All 36
CVD pairs are in `STRICT_PAIRS` or `INFORMATIONAL_PAIRS`, and all 108
strict cases pass at `MIN_DISTANCE = 0.10`.

`DESIGN_ATTENTION` (in `palette-contrast.test.ts`) is empty. All 31
contrast pairs pass their declared (WCAG, APCA) tier minimums.

## What this is NOT

- **Not a one-line MIN_DISTANCE tweak.** Lowering the floor to "make it
  pass" inverts the test's purpose.
- **Not a re-tier.** Group E pairs are full-screen DramaOverlay
  backgrounds — color carries the moment. They belong in STRICT.
- **Not a "ship now and fix later forever."** The `test.fails` ratchets
  ensure we trip on improvement; left untouched indefinitely they just
  document a failure mode without correcting it.
