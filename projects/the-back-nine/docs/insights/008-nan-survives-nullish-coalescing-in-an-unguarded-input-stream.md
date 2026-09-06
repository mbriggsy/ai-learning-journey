---
title: "a NaN survives `?? default`, so an unguarded sibling input stream becomes a calm-but-wrong crash"
date: 2026-06-06
phase: Act 1 (the engine)
modules: []
tags: []  # backfilled 2026-09-06 (doc audit) — tag by hand when next touched
---

# 008 — a NaN survives `?? default`, so an unguarded sibling input stream becomes a calm-but-wrong crash

## Problem

M6a added `bracketFillCeilings` — an optional per-year `number[]` on `OverlayParams`, a sibling of
the already-validated `conversions` and `ssBenefits` streams. A 3-lens adversarial review found
that a `NaN` entry (`bracketFillCeilings: [NaN]`) sails through `validateParams` and detonates
mid-path: with tax ON it makes the gross-up fixed point run all 128 passes and **throw out of
`simulate` uncaught**; with tax OFF it produces NaN buckets that the depletion branch silently
zeroes — desyncing the auxiliary ledger from the authoritative total. Either way it violates the
engine's R19 contract (*a bad input returns the defined indeterminate output, never a crash*).

## Root Cause

Two independent gaps lined up:

1. **`x ?? default` does NOT catch `NaN`.** Nullish coalescing only substitutes on `null`/`undefined`.
   `NaN ?? Number.POSITIVE_INFINITY === NaN`. So the per-year read `bracketFillCeilings[t] ?? +Infinity`
   passed the NaN straight through, and `Math.min(remaining, pretax, Math.max(0, NaN)) === NaN`
   poisoned the whole allocation → `nextGross = NaN` → `Math.abs(NaN - gross) < ε` is always `false`
   → the contraction never exits → the fail-loud cap throws.
2. **A new sibling stream skipped the siblings' R19 guard.** `validateParams` finiteness-checked
   `conversions` (`o.conversions.every(finiteNonNeg)`) but the structurally-identical
   `bracketFillCeilings`, added in the *same* milestone, had no matching check. The gate that exists
   precisely to convert incomputable input into `indeterminate` had a hole shaped like the new field.

## Fix

Guard the new stream at the R19 gate, mirroring its siblings — and fail loud there, do NOT silently
coerce the NaN inside the allocator (burned/062: a masked bad input is worse than an honest reject):

```ts
if (
  o.bracketFillCeilings !== undefined &&
  !o.bracketFillCeilings.every((c) => (Number.isFinite(c) && c >= 0) || c === Number.POSITIVE_INFINITY)
)
  return 'overlay bracketFillCeilings invalid'
```

(`+Infinity` stays legal — it is the intentional no-ceiling sentinel; `NaN` / `−Infinity` / negative
are rejected.) Plus a regression test asserting `simulate(... bracketFillCeilings:[NaN], policy:'bracket-fill')`
returns `indeterminate` and never throws.

## Key Insight

When you add an optional numeric input stream alongside existing ones, two reflexes are mandatory:
**(a) mirror the siblings' validation** — a new field is exactly where a validation gate silently
develops a hole, so diff the new field's guards against its peers, not against your memory; and
**(b) remember `?? default` is null/undefined-only.** For a numeric field that must be finite, a
`?? fallback` is a false sense of safety — a `NaN` (the canonical "computed from bad arithmetic"
value, e.g. a `0/0` MAGI-room calculation a future caller does) flows past it and propagates as a
plausible-looking number until it detonates far from the input. Validate finiteness at the boundary
or use `Number.isFinite(x) ? x : fallback`, never `x ?? fallback`, for a numeric that can be NaN.

## Also Applies To

Any optional per-year/per-item numeric stream threaded into a pure engine (the SS / conversion /
ceiling family here; any future MAGI / cliff / rate stream); any `value ?? default` over a field
whose upstream is arithmetic (division, `Math` ops) that can yield `NaN`; any validation gate that
must stay exhaustive as the input shape grows — the guard set is only as complete as its newest field.
