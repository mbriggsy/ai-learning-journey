---
title: Exactly one candidate was treated as proof of identity, and it was the teammate
date: 2026-08-08
phase: machinery-rebuild
modules: [scripts/resolve_sleeper_ids.py, draft-kit/draft_engine.py, draft-kit/normalize.py, scripts/merge_picks.py, scripts/watch_draft_state.py]
tags: [identity, join-key, candidate-pool, false-confidence, adversarial-review, mutation-testing]
---

## Problem

U14 resolves each of the 174 board rows to a Sleeper `player_id` and freezes it. Resolution runs
in tiers: tier 1 is an exact match on the normalised name; tier 2 falls back to sharing a name
token inside the same `(team, position)` bucket. The code accepted **any tier that returned
exactly one candidate**, on the reasoning that one candidate means no ambiguity.

That reasoning is false, and this board is built to prove it. Measured against the pinned dump —
removing each man from his own bucket, which is what a trade does — **six rows leave tier 2
returning exactly one candidate, and in all six it is a different, real, active NFL player**:

```
Bijan Robinson      ATL RB   ->  Brian Robinson     8154   shared: robinson
Josh Allen          BUF QB   ->  Kyle Allen         5127   shared: allen
Joe Burrow          CIN QB   ->  Joe Flacco           19   shared: joe
Marvin Harrison Jr. ARI WR   ->  Harrison Wallace  13670   shared: harrison
Matthew Stafford    LAR QB   ->  Matthew Caldwell  13597   shared: matthew
Xavier Worthy       KC  WR   ->  Xavier Loyd       13916   shared: xavier
```

**Zero rows return two or more.** The guard that already existed — hard-stop on ≥2 candidates —
would have caught **none** of these. The dangerous case was the one that looked cleanest.

Every downstream check then passed, because Harrison Wallace really is a WR on ARI. Position
agreed. Team agreed. The count was one. The wrong man would have been frozen permanently as our
join key, and the ledger entry would have testified to a clean match.

## Root Cause

**Uniqueness is a property of the candidate pool, not evidence about the match.**

The pool was narrowed by `team`, `position`, and a shared token. Every one of those is an
attribute the *wrong* answer also satisfies — a teammate has the same team, the same position,
and, six times over on this board, a shared first or last name. Narrow a pool by attributes the
wrong answer shares, and the lone survivor is not identified. It is merely alone.

The same shape was live in three other places, all found in one sweep:

| Where | The pool | Why the wrong answer survived it |
|---|---|---|
| `draft_engine.py` — the seat | `1..8` | Every wrong seat is a real seat with a real roster and a real clock. `1 <= my_slot <= teams` passes them all. |
| `draft_engine.py` — pick matching | rendered names | The rendered name is the one field that drifts, so the *right* answer can leave the pool entirely. |
| `slot_names.json` | an integer key | A stale mock's file returns exactly one name per seat, and it is a different human. |

The seat case is the sharpest. `my_slot` is typed at a keyboard on draft morning, `draft_order`
is null until near go time, and `roster_id 3` sits one line from it in `docs/league.md` — so "3"
is the most attractive wrong value in the project and is 7/8 likely to be wrong. It produced a
complete, plausible advisory for another manager's team at exit 0, down to which roster carried
`<== YOU`.

## Fix

Four gates, one rule: **corroborate against something the wrong answer does NOT satisfy.**

- **The seat** is checked against `draft_order["1390750540631150592"]`, and failing that against
  the `draft_slot` of any pick carrying our own `picked_by` — evidence that was already in the
  engine's own input and was being parsed and discarded.
- **Team and round counts** are checked against the draft's `settings`, and against `picks.json`
  alone, which disproves a count too small (a seat above it cannot exist) *or* too large (once a
  full round has passed, the highest seat seen **is** the team count).
- **Picks join on the frozen id**, not the name. `sleeper_ids.json` is consulted first and the
  name is the fallback.
- **A lone shared-token match is proposed, never frozen.** The engine may use `(team, pos)` plus a
  token to raise a warning a human reads; a permanent freeze is a different act.

Three rules the gates obey, each learned by getting it wrong first:

1. **A missing oracle never blocks the run.** On draft morning a dead mule must not also cost the
   advisory. It prints `[unverified]` and says exactly what it could not check.
2. **"I could not check" must never print like "I checked."** They are different claims and the
   difference is the whole point.
3. **An oracle for another draft is not evidence about this one.** Trusting stale cargo would
   refuse a *correct* seat, and a false red teaches the operator to skip the gate
   ([`009`](009-the-test-suite-was-red-against-source-that-no-longer-existed.md)).

## Key Insight

**A search returning exactly one result is not proof that the result is correct.**

The operational test is one question per narrowing attribute: *what else in the universe
satisfies this?* If the answer is "a teammate", "another seat", "last year's file" — the pool did
not identify anything, it only got small.

The reusable distinction is between two kinds of field:

- **Describing attributes** — a team, a position, a name token, an integer inside a legal range.
  Shared by design. They shrink a pool; they never identify a member of it.
- **Immutable keys** — `player_id`, `picked_by`, a user_id, a team code that *is* the id.
  Identify by construction.

Narrowing on describing attributes and then accepting the survivor is the error. Corroborating
against an immutable key is the fix, and in every instance here the key was **already on disk and
being thrown away**.

The mirror is worth as much as the rule: **zero survivors after narrowing means "I could not
evaluate this", never "all clear."** The engine used to print `not on our board` followed by the
explicit all-clear `no unclaimed board row shares a team and position` for a player it had just
watched get drafted — because he had been traded and his name re-rendered, so he was not in the
bucket to be found. Reproduced on the real board: Jahmyr Gibbs, board #1, taken at pick 1,
cleared and left at #1 on BEST AVAILABLE. The pick carried `player_id 9221` — his frozen id, in
our own ledger.

### How this differs from 005 and 006

Neighbouring, and genuinely distinct:

- [`005`](005-the-tie-breaker-agreed-with-the-board-by-construction.md) — a check that **cannot
  disagree** with its own input. `vbdRank` is a function of `pr`, so it restates it.
- [`006`](006-four-verification-steps-that-could-silently-do-nothing.md) — a check that **never
  runs, or cannot fail loudly.** The empty `git show` baseline, `str.replace` on no match, a skip.
- **010** — a check that **runs, is capable of failing, returns exactly one answer, and the answer
  is a different entity.** The mechanism is a narrowed pool, not a broken check.

The boundary matters because the remedies differ. 005 retires the check. 006 makes it able to
fail. 010 keeps the check and adds a corroborating key.

### The most instructive instance was the fix itself

While hardening the resolver, the new shared-token proposal was placed **above** the FROZEN
guard, fifteen lines away. For a row that already carried a frozen id the proposal fired first
and `continue`d, so the FROZEN guard was unreachable — and the message told the operator to
*paste the teammate's id into the ledger by hand.* The frozen id was never mentioned. Obeying the
tool's own remediation would have overwritten the right man with his teammate.

That is the same defect the commit was fixing, re-entered inside the fix, in new code, in the
same function, within the hour. **The pattern is not a bug you remove; it is a shape you keep
re-drawing.** Guard order is load-bearing, and a remediation message is part of the guard.

## Also Applies To

- **U4 (schema gate)** — validate the JOIN, not only the shapes. A gate asserting "every row has a
  `sleeperId`" while never checking that the id resolves to *that player* is this insight with a
  schema on top. Board rows carry no `sleeperId` field today; the ids live in the ledger.
- **U5 (VORP)** — a replacement baseline is an order statistic on realised outcomes, so "RB41"
  describes no identifiable player ([`005`](005-the-tie-breaker-agreed-with-the-board-by-construction.md)).
  Attaching it to a named man is the same category error.
- **U6 (generator)** — when it stamps ids onto the board, "174 ids, 0 unresolved" is a **survivor
  count, not an identification**. It says every row got an answer, not that any answer is right.
- **The live board** ([`live-board-plan.md`](../live-board-plan.md)) — it is next to gain
  draft_id and live pick-joining, and `normalize.py`'s `js_source()` exists to ship the token rule
  there. It will join on names unless it is built to join on ids. Decide that before it is written.
- **Any "exactly one match" in this project, forever.** Ask what else satisfies the narrowing.

### And a note on proving it

Four of these were found by an adversarial sweep rather than by a failure — which is the point,
because none of them had a failure mode that looks like a failure. Every one exited 0.

When the engine's advisory body was finally pinned, the tests were verified by planting **eight
deliberate mutations** — `STARTERS` altered, `slot_of` losing the snake, `my_picks` ignoring even
rounds, `picks_until_me` off by one, `needs` dropping FLEX, `between` reversed, BEST AVAILABLE
sorted by the wrong key. All eight were caught, with the unmutated baseline confirmed green
first. A test that has never failed is a claim, not a check — which is
[`006`](006-four-verification-steps-that-could-silently-do-nothing.md) applied to the thing doing
the verifying.
