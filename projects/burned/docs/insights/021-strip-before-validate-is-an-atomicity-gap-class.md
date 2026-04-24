---
title: Strip-before-validate is an atomicity-gap bug class, not a single bug
date: 2026-04-24
phase: playtest-harness-phase-1
modules: [src/server/game/engine.ts]
tags: [atomicity, validation-order, engine, zero-trust, audit-pattern, bug-class]
---

## Problem

A-01 (proactive single-Intercept) was patched overnight 2026-04-23 with a
dispatch-time guard at `engine.ts:314-316` — reject the play BEFORE the
card is stripped from hand. The fix was reasoned about as a one-off: "the
engine shouldn't accept Intercepted alone."

Drafting the playtest-harness scenarios catalog Phase 1 surfaced four
more scenarios in the same bug class — all from code that was not
touched by the A-01 fix:

- Extraction played proactively (no handler; hits `applyCardEffect` default at engine.ts:356)
- Direct Order targeting an eliminated player (target-alive check post-strip)
- Back-Channel against a 0-card deck (empty check at engine.ts:662-663 fires post-strip-upstream)
- Favor self-targeting (target-validity check post-strip)

Each produces the same outcome: player dispatches a card, card is stripped
from hand, Nope window opens, window resolves without nope, effect
resolution errors, card is permanently lost in discard with no effect.

## Root Cause

`handleSingleCard` at `engine.ts:294-337` performs side effects in this
order:

1. Remove card from hand (`engine.ts:319`)
2. Add to discard (`engine.ts:320`)
3. Open Nope window (`engine.ts:327-334`)
4. On resolution — call `applyCardEffect` which runs effect-specific
   validation and CAN return `err(...)`

Any validation inside `applyCardEffect` that can fail is a latent
strip-before-validate gap. The A-01 patch moved ONE validation
(reactive-only check for Intercepted) to dispatch-time. The pattern
itself — side-effects-before-effect-validation — is unchanged.

This is an **atomicity gap**: the compound operation
(strip → open window → resolve effect) is not atomic with respect to
validation failures. When the tail step fails, the head steps don't
roll back.

## Fix

Two options per gap:

1. **Move validation to dispatch-time.** Add a guard in `handleSingleCard`
   BEFORE the strip, mirroring the A-01 pattern at `engine.ts:314-316`.
   Right for validations that are context-free at dispatch (card type is
   known, target is in the action, deck state is readable). Example shape:

   ```ts
   if (card.type === 'extraction') return err(state, '...', 'INVALID_ACTION')
   if (card.type === 'direct-order' && !isAlive(state, action.targetPlayerId)) return err(...)
   ```

2. **Make the strip reversible.** Stage the card in a pending slot and
   only commit to discard after effect resolution succeeds. More complex,
   but the right call if the validation *requires* state produced after
   the Nope window (rare in BURNED; none of the four candidates do).

For Phase 1, candidates 1-4 are all dispatch-time resolvable. Not fixed
in this session — logged as Column divergences in
`docs/testing/playtest/SCENARIOS.md` §Column divergences for Briggsy
review.

## Key Insight

**When a handler does side effects before invoking a validator, every
failing path of that validator is a latent atomicity bug.** Finding one
instance isn't finding "the bug" — it's finding one member of a class.
The audit lens:

1. Grep for all `err(...)` returns reachable after any `removeCardsFromHand`,
   `addToDiscard`, event emission, or state mutation.
2. Each one is a strip-before-validate gap until proven otherwise.
3. A-01's dispatch-time guard pattern is the repair template for all of them.

Corollary for spec work: when a guard lands for one card, the question
"which OTHER cards hit the same reachable-`err` paths?" should be a
reflexive follow-up, not a separate audit.

## Also Applies To

- Any server-side handler that mutates state (queue, cache, DB row, file)
  before calling a validator. The mutation is the bug surface; the error
  return is the trigger.
- Database transactions that INSERT before a constraint check in a later
  statement — equivalent pattern.
- UI optimistic updates that commit to store before the server confirms
  — the rollback path has to exist AND be tested, or the optimistic
  commit is the same atomicity gap.
- Checkout / payment flows where a line item is reserved before inventory
  is validated. Classic e-commerce instance.
