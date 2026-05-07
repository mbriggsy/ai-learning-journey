---
title: "Prose CVD recommendations in followup docs are wrong-direction more often than not — probe before editing primitives"
date: 2026-05-06
phase: 5
modules: [src/client/shared/tokens]
tags: [cvd, palette, oklab, design-system, color, accessibility, deuteranopia, protanopia, tritanopia, culori]
---

## Problem

`docs/plans/css-foundation-rebuild/phase-5-cvd-followup.md` prescribed
two palette amendments with directional language. **Both directions were
wrong.**

- **Option A** (emerald-8): doc said "shifts toward more blue-green
  (closer to teal-7 territory in hue, lower in chroma)." Probed ~30
  candidates in that family — none cleared the E6 tritan ratchet
  (teal-8 vs emerald-8). Best was 0.0707 vs 0.10 floor.
- **Option C** (ochre-9): doc said "shifts toward `#c97a2e` (more
  orange, less yellow)." Probed ~25 candidates in that family — every
  one collapsed E4 tritan (cordovan-9 vs ochre-9), creating a NEW
  STRICT regression that wasn't there before.

Each amendment ate hours of "tweak hex, run test, look at distance,
tweak again" because the prose set the search space wrong from the
start.

## Root Cause

Hue-space intuition ("emerald and teal are too similar — push emerald
toward teal-7 in hue") does not survive contact with the
**deuter/protan/tritan oklab transforms**. The simulators don't act
linearly on hue. Specifically:

- **Tritanopia compresses the cool-cyan-blue-green plane** to nearly
  the same projection. Pushing emerald-8 BLUER toward teal makes the
  problem WORSE on the tritan axis. The fix that worked was
  HIGHER-saturation + L-lift + keeping the blue channel high — a
  multi-axis shift the doc never anticipated.
- **Deuter/protan compress the red-green axis.** Pushing ochre redder
  (toward cordovan-9 #ad4f5e) puts both warm tones onto the same
  perceptual gray under deuter, AND collapses them under tritan
  (warm-vs-warm has no luminance separator). The fix was the OPPOSITE
  direction: yellow-mustard, away from cordovan's red.

The doc's prose was an honest first-pass intuition. But CVD distance
isn't intuitive — it requires running the actual culori
`filterDeficiencyDeuter/Prot/Trit` + `differenceEuclidean('oklab')`
math against candidate values to know what works.

## Fix

Wrote a 60-line probe script per amendment (`scripts/probe-emerald-8.ts`,
`scripts/probe-ochre-9.ts`). Each script:

1. Imported the same `culori` CVD pipeline `palette-cvd.test.ts` uses.
2. Defined a candidate-hex matrix (~10 candidates per direction, 3-4
   directions tried).
3. Computed oklab distance for each candidate against every pair that
   touches the token, under all 3 sims.
4. Flagged ✓/✗ at the 0.10 STRICT floor.
5. Also computed APCA/WCAG against any contrast-pair the token sits in.

Picked the optimum by reading the table — the candidate where every
currently-passing pair stayed ✓ AND the ratchets graduated.

Both probe scripts deleted post-amendment (one-shot tools, not
permanent infra).

## Key Insight

**Always run a probe script before editing `primitives.css`. Never edit
based on prose direction alone.** The probe is 60 lines and finds the
optimum in 5 minutes; the no-probe trial-and-error path is hours and
ships wrong directions to first-pass.

The reusable pattern:

```typescript
// scripts/probe-<token>.ts (delete after use)
import { parse, filterDeficiencyDeuter, filterDeficiencyProt,
         filterDeficiencyTrit, differenceEuclidean } from 'culori'
import { PALETTE } from '../src/client/shared/tokens/palette.generated.js'

// 1. List every pair the token participates in (STRICT + DESIGN_ATTENTION)
// 2. List candidate hex values across multiple directional bands
// 3. For each candidate × pair × sim, compute oklab distance
// 4. Render a ✓/✗ table at MIN_DISTANCE = 0.10
// 5. Pick the candidate where currently-passing stays ✓ AND ratchets graduate
```

Doc-prose recommendations are useful for CONSTRAINING which tokens to
touch (Option A says "only DramaOverlay INTERCEPTED bg uses emerald-8 —
small blast radius"). They are NOT reliable for picking the new value.

## Also Applies To

- **Any future palette amendment** touching emerald, ochre, teal,
  cordovan, charcoal scales. The probe script template is reusable
  with a token-name swap.
- **Adding a new color token** — run the probe against existing pairs
  to see what tier it falls into before committing the hex.
- **Re-tiering decisions** — when deciding whether to graduate a
  DESIGN_ATTENTION case to STRICT, verify that no neighbor regression
  hides in another sim before flipping.
- **Beyond palettes**: any time a doc prescribes a directional shift on
  a multi-dimensional perceptual metric (motion timings, audio
  loudness curves, blur kernels), probe the actual metric before
  shipping. Prose-direction is a compass, not a GPS.

Companion lessons: insight 010 (art-directed palettes fail Radix APCA
guarantees) and insight 050 (agent-eye verification misses perceptual
continuities) — both point to the same meta-rule: **trust measurements,
not vibes, on perceptual systems.**
