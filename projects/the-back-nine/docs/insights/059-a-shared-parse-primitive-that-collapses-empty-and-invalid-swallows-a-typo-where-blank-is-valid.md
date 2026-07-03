---
title: A shared parse primitive that collapses "empty" and "invalid" into one sentinel swallows a typo on the one field where blank is VALID
date: 2026-07-02
phase: P3·U9b (the budget UI ultramode review)
modules: [src/intake/fields.tsx, src/intake/BudgetLineItem.tsx]
tags: [parse-primitive, sentinel-collapse, empty-vs-invalid, honesty-affordance, insight-054, R19, ultramode-review]
---

## Problem

Every invalid entry in the budget-builder sheet surfaces an error and blocks Apply — EXCEPT the
line's "through year". Typing `2.5` or `-3` into it produced no error, no `aria-invalid`, no blocked
Apply: the intended window bound was silently dropped and the line became LIFELONG. The one field in
the sheet where a typo has no honesty affordance (insight 054), and — because a lifelong line runs to
the horizon — it silently overstated later-year spend versus what the user typed.

## Root Cause

`IntegerField.onBlur` maps EVERY non-integer/negative/empty entry to a single `undefined`:
`cleaned !== '' && Number.isInteger(n) && n >= 0 ? n : undefined`. That collapse is CORRECT for a
required field — the from-year and amount fields route `undefined → NaN` downstream, and NaN fails
`validateBudgetItems`, so empty AND invalid both error (which is right: on a required field, blank is
itself an error). But the through-year is the one field where **empty is a VALID state** (absent =
lifelong, the DND/009 encoding). It routes `undefined → drop the endYear key = lifelong`. So the
primitive's lossy collapse means "the user cleared it" and "the user fat-fingered 2.5" arrive as the
same value, and the consumer picks the valid interpretation for both. The information needed to
distinguish them (was the raw text empty or garbage?) existed ONLY inside `IntegerField` and was
already discarded by the time `BudgetLineItem` saw the result.

## Fix

An opt-in `blankAllowed` prop on `IntegerField`: empty ⇒ `undefined` (a legitimate clear),
non-empty-invalid ⇒ `Number.NaN` (a distinct value the caller's validator flags as
`non-integer-window`). Only the through-year opts in; every other consumer's default behavior is
byte-identical (a required field still collapses both to `undefined → NaN → error`). Live-verified:
`2.5` now errors and blocks Apply; a genuine clear still commits the line as lifelong.

## Key Insight

When a shared input primitive folds several distinct outcomes into ONE sentinel, that fold is safe
only for consumers where those outcomes mean the same thing. The moment ONE consumer needs to
distinguish them (here: blank = valid, garbage = error, on a field where blank isn't an error), the
distinction MUST be preserved AT the primitive — a downstream consumer cannot recover information the
primitive already threw away. Look for it wherever a "cleared" state and an "invalid" state are both
possible and one of them is legitimate: a required-vs-optional numeric field, a nullable-vs-malformed
date, an empty-vs-unparseable list. The fix always lives at the parse boundary, never at the consumer.

## Also Applies To

- `parseMoney`/`parsePercent` and any other `→ number | undefined` parser reused across required and
  optional fields — an optional money field that treats "blank" as absent has the same latent gap.
- The same-session announcer fix (a callback-ref binding, insight
  [[047-a-tiered-consumer-re-fires-identity-keyed-contracts-a-static-one-never-stressed]]): both are
  "the fix must live at the binding/parse layer, because the consumer sees only the already-lossy
  result." A feature-authored test masked this one — the through-year error test drove the FROM
  field; no test drove an invalid non-empty value into THROUGH (insight
  [[054-a-remedy-affordance-is-part-of-the-error-honesty-contract-and-a-feature-authored-test-pins-its-bugs]]).
