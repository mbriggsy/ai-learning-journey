---
title: Engine invariants (quick reference)
type: conventions
date: 2026-05-09
---

# Engine invariants (quick reference)

Canonical rules in `docs/RULES-REFERENCE.md`. This file is the **non-obvious behaviors** worth knowing by heart before touching `src/server/game/`. If something here disagrees with `RULES-REFERENCE.md`, fix this file — RULES-REFERENCE wins.

## Core math & sequencing

- **Attack / TargetedAttack formula:** `(turnsRemaining - 1) + 2`, NOT `turnsRemaining + 2`. No cap — `turnsRemaining` grows unboundedly with stacking. Elimination mid-attack collapses remaining to 1 for next player. *(Counts the consumed turn; equals RULES-REFERENCE §10.2's `victim_remaining + 2` framing minus the about-to-be-consumed turn. See the comment block above `applyAttack` in `engine.ts` for worked examples.)*
- **Triple-steal cards DO NOT leave hand until name commits.** `handleCombo` for `comboSize === 3` only stages; `handleNameCard` does the discard + nope-window. Moving discard into `handleCombo` silently destroys 3 cards on cancel.
- **`handleNopeWindowExpired` checks the named-steal branch FIRST**, before legacy `pendingSteal`. Flip the order → 3-of-a-kind never resolves.
- **`applyShuffle` clears `pendingFuture`.** Any future card mutating draw-pile order must do the same (Intel Briefing peek + shuffle left stale IDs otherwise).
- **`MAX_NOPE_CHAIN = 10`**, chain-burn IS legal via `state.nopeWindow.generation` advancement. A-01 fix only rejected PROACTIVE single-Intercept plays, not chain-burn.

## Events & projection

- **`nope-window-opened` is declared in `src/shared/types.ts` but NEVER emitted.** Engine emits `card-played`, `nope-played`, `nope-window-resolved`. Clients derive "window open" from `state.nopeWindow !== null`.
- **Combo `card-played.cardType` uses `cards[0]!.type`** (both pair and triple branches in `handleCombo`), NOT `matchType`. Client submission order `[AgX, op]` vs `[op, AgX]` produces different emitted cardType. Diverges from `getMatchType` in `combo-validation.ts` which derives matchType from first non-wild.
- **Eliminated players still receive full `PlayerView` broadcasts.** `projectForPlayer` returns `player?.hand ?? []`. Action dispatches from eliminated seats rejected by the dispatch entry guard in `engine.ts`.
- **`pendingNameCard.cardIds` is projection-private.** Server-only; clients see `pendingPrompt = { type: 'name-card', ... }`.

## Favor edge cases

- **Favor empty-hand auto-resolves.** `applyFavor` emits `favor-requested` + `favor-given {giverId === targetId}` with NO card transfer. Same for targets holding only Burned (filter excludes `c.type === 'burned'`). Locked by tests in `rules-gaps-exhaustive.test.ts` (favor empty-hand suite).

## Policy

- **All prompt-timeouts are gone.** Party-game policy: "game waits for you." Only Nope window has a server timer. Adding auto-resolve-by-timer to any pending prompt REVERSES the policy — product decision, not regression fix.
