---
title: Dual computation of derived timing + tautological test masked a real bug
date: 2026-04-04
phase: 9
modules: [src/game/night-manager.ts, src/game/night-transition.ts]
tags: [timing, state-machine, testing, single-source-of-truth, code-review]
---

## Problem

Night manager's transition timer was 2 seconds too short for nights 2-3. Gameplay would resume while the transition animation was still playing. No test caught it — all 21 night-manager tests passed.

## Root Cause

Two modules independently computed "how long does the night transition take?"

`night-manager.ts` calculated: `FADE_OUT + TEXT_HOLD + FADE_IN` = 2.5s.

`night-transition.ts` has a `MONSTER_INTRO_NIGHTS` map that adds `MONSTER_INTRO_S` (2.0s) for nights 2-3, making the actual visual duration 4.5s.

The night manager didn't know about monster intros. Both modules were written in the same session by the same author.

The test mirrored the source formula exactly:
```typescript
const totalTransition = NIGHT_TRANSITION.FADE_OUT_S + NIGHT_TRANSITION.TEXT_HOLD_S + NIGHT_TRANSITION.FADE_IN_S;
mgr.update(totalTransition + 0.1);
expect(mgr.state.phase).toBe('starting'); // passes — but wrong
```

The test proved the formula was typed correctly, not that the formula was RIGHT.

## Fix

Made night-manager compute the intro time inline:
```typescript
const hasMonsterIntro = nextNight === 2 || nextNight === 3;
const totalTransition = NIGHT_TRANSITION.FADE_OUT_S
  + NIGHT_TRANSITION.TEXT_HOLD_S
  + (hasMonsterIntro ? NIGHT_TRANSITION.MONSTER_INTRO_S : 0)
  + NIGHT_TRANSITION.FADE_IN_S;
```

Tests updated with night-aware expected values, plus a dedicated test proving night 3→4 (no intro) uses the shorter duration.

## Key Insight

**Dual computation:** When two modules must agree on a derived value, one module should own the computation and the other should read from it. Independent computation guarantees divergence as features are added — the module that gains the new feature updates its formula, the other doesn't.

**Tautological test:** When a test computes its expected value using the same formula as the source, it's a tautology — it only verifies the formula was typed correctly. Use hardcoded expected values or derive them from a DIFFERENT path. If both source and test share a blind spot, the bug is invisible.

## Also Applies To

Any system where a logic module needs to know how long a visual/animation module takes. `catch-sequence.ts` and `night-manager.ts` share duration knowledge via `MONSTER.*_CATCH_DURATION_S` constants — safe today because both read the SAME constant. If catch animations ever gain per-monster flourishes (extra beats), the same pattern would emerge.
