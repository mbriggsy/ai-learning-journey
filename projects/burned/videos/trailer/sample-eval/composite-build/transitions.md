# Transition Implementation Inventory

**Unit:** 4.8 — Transition Implementation
**Date:** 2026-05-24
**Plan:** [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](../../../../docs/plans/origin-trailer/phase-4-remotion-composite.md) §Unit 4.8
**ADR lineage:** ADR #11 revised (bare `<Series>` + scene-internal overlays, NOT `<TransitionSeries>`); ADR #4 revised (`@remotion/transitions` package not installed); amendment SA-5 (IrisWipe SSoT in `transitions/`, S06 imports — no inline duplicate); amendment MA-1 (S04TailFadeToBlack lives in `components/`, not `transitions/`); Unit 4.0a UMB v3 triage (UMB FadeTransition SUPERSEDED-BY-EXISTING `SceneFadeToBlack.tsx`).

---

## Scene boundary inventory

| Boundary | Abs frame | Mechanism | Owner file | Window (abs frames) | Notes |
|----------|-----------|-----------|------------|---------------------|-------|
| S01 → S02 | 210 | Stamp slap bridges (R15 #1 OPERATION PENDLETON) | `components/R15Stamp.tsx` (S01-internal at land frame 150 + persists through scene tail) | 150-210 | S01's stamp slap IS the transition — no separate transition component. Bridge approach inherited from Phase 0 spike grammar. |
| S02 → S03 | 570 | Hard cut | (none) | — | Bare `<Series.Sequence>` adjacency. Optional `SceneFadeToBlack` tail polish if Unit 4.9 perceptual review flags the cut as jarring — NOT applied preemptively. |
| S03 → S04 | 1380 | Dossier-page wipe | `transitions/DossierPageWipe.tsx` | scene-rel 802-810 (= abs ~1372-1380) | 8-frame horizontal clip-path wipe from right edge inward. Reads as turning a dossier page to reveal what's beneath. EASE_IN_OUT_FN curve. |
| S04 → S05 | 2370 | Hard cut + tail-fade overlay | `components/S04TailFadeToBlack.tsx` (S04 owns its tail) | abs 2355-2370 (15-frame overlay) | Per amendment MA-1 — overlay lives in `components/`, NOT `transitions/`, because it's scene-internal not boundary-spanning. Pairs with S05 head fade for 30-frame fade-through-black chapter-break grammar. |
| S05 → S06 | 2910 | Hard cut + head-fade overlay + iris-wipe-IN | `components/S05HeadFadeFromBlack.tsx` (S05 owns its head) + `transitions/IrisWipe.tsx` (S06 imports, scene-rel 0-45) | S05 head: abs 2910-2925 (15f) · S06 iris: abs 2910-2955 (45f) | The head-fade-from-black grammar OPENS into the iris-wipe pinhole reveal. SA-5: IrisWipe is single-source in `transitions/`, S06 imports — NO inline duplicate. |
| S06 → end | 3180 | Hard cut to black | (composition end) | — | Composition `durationInFrames = TOTAL_FRAMES = 3180`. No fade-out at end — Archer hard-cuts to credits. |

**Note on `S04TailFadeToBlack` vs `S05HeadFadeFromBlack` symmetry:** the two are paired components that together produce the 30-frame fade-through-black at the S04→S05 boundary. S04 owns the OUT half (opacity 0→1 over 15f), S05 owns the IN half (opacity 1→0 over 15f). Combined window: abs 2355-2925 (30f). Both files live in `components/` (not `transitions/`) because each is a scene-internal overlay scoped to its owning scene.

---

## Component file inventory

| File | Role | Consumers | Phase introduced |
|------|------|-----------|------------------|
| `transitions/DossierPageWipe.tsx` | Right-to-left clip-path wipe (8f). EASE_IN_OUT_FN. | S03 tail | Phase 4 (Unit 4.4 era; lives here as the canonical S03→S04 boundary) |
| `transitions/IrisWipe.tsx` | SVG-mask radius interp pinhole. `'opening'` / `'closing'` direction. EASE_IN_OUT_FN. `useId()` for SVG mask collision safety. `useVideoConfig()` for resolution-agnostic diagonal-reach. | S06 head (`'opening'`) | Phase 4 Unit 4.7 ship 2026-05-23 (per SA-5 SSoT lock) |
| `components/S04TailFadeToBlack.tsx` | Opacity 0→1 over scene-rel 975-990 (= abs 2355-2370). EASE_IN_OUT_FN. | S04 tail | Phase 4 Unit 4.5 ship (per amendment MA-1) |
| `components/S05HeadFadeFromBlack.tsx` | Opacity 1→0 over scene-rel 0-15 (= abs 2910-2925). EASE_OUT_QUAD. `pnpm verify:s05-head-fade` grep gate. | S05 head | Phase 4 Unit 4.6 ship |
| `components/SceneFadeToBlack.tsx` | Caller-anchored opacity 0→1 fade. Explicit `startFrame` + `durationFrames` props. | (none currently — Phase 0 spike artifact, retained for Unit 4.9 optional polish per Unit 4.0a triage) | Phase 0 Unit 0.5 spike |

**NOT installed:** `@remotion/transitions`. Per Phase 0 ADR #4 revised — bare `<Series>` + scene-internal overlay components cover every boundary need. The package was de-scoped at deepening; reintroducing it would silently regress the locked grammar (see `pnpm verify:no-transition-series` grep gate).

---

## Anti-regression gates

| Gate | Script | What it catches |
|------|--------|-----------------|
| `pnpm verify:no-transition-series` | `scripts/verify-no-transition-series.ts` | Any `<TransitionSeries>` JSX OR `from '@remotion/transitions'` import anywhere under `videos/trailer/src/`. Comment mentions tolerated (design notes reference the name when explaining what NOT to do). |
| `pnpm verify:s05-head-fade` | `scripts/verify-s05-head-fade.ts` | S05HeadFadeFromBlack import + JSX usage missing from `S05_GameplayDissolve.tsx`. |
| `pnpm verify:gameplay-clip` | `scripts/verify-gameplay-clip.ts` | gameplay.mp4 dimension / framecount / no-audio drift. |
| `pnpm test` (vitest) | `src/lib/visual-manifest.test.ts` + `audio-manifest.test.ts` | Forward + reverse drift between manifests and on-disk asset trees. |

All gates wired into Unit 4.10's pre-master-render check set. Adding a new scene-internal overlay or transition component should propagate three things in the same change: the file itself, an inventory row above, and (if removal would silently undo design) a grep gate following the `verify-s05-head-fade.ts` pattern.

---

## Optional polish — `SceneFadeToBlack` tail fades

Per Unit 4.0a UMB v3 triage: `components/SceneFadeToBlack.tsx` (Phase 0 spike artifact, 35 lines) already implements caller-anchored scene-end fade-to-black. UMB v3's `FadeTransition.tsx` was SUPERSEDED-BY-EXISTING — same behavior, cleaner API (no `useVideoConfig().durationInFrames` dependency).

If Unit 4.9 Briggsy-eye review flags S02→S03 or S06→end hard cuts as jarring, drop `SceneFadeToBlack` into the affected scene's tail:

```tsx
import { SceneFadeToBlack } from '../components/SceneFadeToBlack'

// inside scene component (last 10 frames fade to black)
<SceneFadeToBlack startFrame={SCENE_FRAMES - 10} durationFrames={10} />
```

DON'T apply preemptively — let Briggsy-eye drive. Pre-emptive polish here is the same anti-pattern as the UMB FadeTransition import (Unit 4.0a deepening miss family).
