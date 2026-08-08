---
title: One exception class made the safe fallback indistinguishable from the dangerous one
date: 2026-08-08
phase: machinery-rebuild
modules: [scripts/shape.py, scripts/build_board.py, scripts/run_engine.py]
tags: [error-handling, exceptions, degrade, refusal, api-design, draft-day]
---

## Problem

`read_shape()` raised a single `Refuse` for every condition that stopped it. Five of them:

| Condition | What it means | What a caller should do |
|---|---|---|
| no cargo file on disk | we cannot tell | **degrade** to what was typed |
| cargo is truncated / malformed | we cannot tell | **degrade** |
| no `teams`/`rounds` in the object | we cannot tell | **degrade** |
| `type` is `auction` | we CAN tell, and the answer is no | **stop** |
| `reversal_round` is 3 | we CAN tell, and the answer is no | **stop** |

The first three and the last two demand **opposite** responses, and the function reported them
identically. That was invisible while `build_board.py` was the only caller, because a generator has
no fallback — every one of those is fatal to a build, so collapsing them cost nothing.

U15 added a second caller with a completely different disposition. The engine wrapper *does* have a
fallback: argv, plus the engine's own built-in defaults. Its whole specification says a missing
cargo must never block the run, because on draft morning a dead mule must not also cost the
advisory.

So the obvious wrapper is one line, and it is wrong:

```python
try:
    shape = read_shape(cargo, league_cargo)
except Refuse as e:                 # "no cargo today, fall back to argv"
    shape, note = None, str(e)
```

Written that way, a **third-round-reversal draft is caught by the handler whose comment says
"no cargo today"** and degrades to typed defaults. The engine then computes `slot_of()` and
`my_picks()` with plain-snake arithmetic against a draft whose pick order is not plain snake, and
prints a complete, confident advisory — right down to which roster carries `<== YOU`. Nothing
raises. Exit 0.

That is the integrity-gate landmine reached by a polite route. `read_shape` had *already detected*
the exact condition that makes the advisory wrong, and the caller threw the detection away because
the type system offered no way to tell it apart from "the mule is late."

## Root cause

**The exception type encoded where the failure happened, not what the caller should do about it.**
`Refuse` means "this function stopped." That is information about the callee. The caller needs
something else entirely: *is it safe for me to continue without you?*

One class could answer that as long as the answer was always no. The moment a caller existed for
whom the answer was sometimes yes, the single class became a coin flip performed by whoever wrote
the `except`.

## Fix

Two subclasses, named for the caller's decision rather than the callee's situation:

```python
class Refuse(Exception): ...
class CargoUnreadable(Refuse):   # we cannot tell -- a caller with a fallback MAY use it
class UnsupportedShape(Refuse):  # we can tell, and the answer is no -- NEVER degrade past this
```

Both still subclass `Refuse`, so `build_board.py`'s dozen `except Refuse` sites and its tests
(`assertRaises(B.Refuse)`) were untouched — the split is invisible to every caller that does not
want it. The wrapper now catches only `CargoUnreadable` and lets `UnsupportedShape` propagate to a
hard exit.

The test that matters asserts the *handler a caller actually writes* cannot see it:

```python
with self.assertRaises(S.UnsupportedShape):
    try:
        S.read_shape(self.draft(type="auction"), "/nonexistent")
    except S.CargoUnreadable:                       # the degrade path -- must NOT fire
        self.fail("an auction draft was caught by the 'we cannot tell' handler")
```

Mutation-verified: collapsing the two classes back into one turns it red.

## Lesson

**Name exceptions for the recovery they permit, not for the place they were raised.**

When a caller has a fallback, every `except` is a decision about whether continuing is safe. If two
conditions with opposite answers share a class, that decision gets made by whichever handler is
written first — and the dangerous one is *easier* to write, because "catch the refusal and fall
back" reads as defensive programming.

The tell: a function that can say both **"I don't know"** and **"I know, and no."** Those are not
the same failure and must not be the same type. Look for it wherever a validator gained a second
caller — the collapse is free until it isn't, and it stops being free silently.

Related: [`009`](009-the-test-suite-was-red-against-source-that-no-longer-existed.md) on false reds
teaching an operator to skip a gate — the mirror image, and the reason `run_engine.py` also declines
to arm the contamination gate from stale cargo.
