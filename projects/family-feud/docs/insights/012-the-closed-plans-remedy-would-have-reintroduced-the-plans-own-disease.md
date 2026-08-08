---
title: The closed plan's remedy would have reintroduced the disease the plan exists to cure
date: 2026-08-08
phase: Phase 1 — the generator (U6)
modules: [scripts/build_board.py, draft-kit/players_data.json, draft-kit/cache/sleeper_players.json.gz]
tags: [planning, staleness, duplication, ktd-1, single-source, identity-check]
---

## Problem

U6's plan is explicit about how to derive `dst` (the top-8 defenses) from the DEF rows:

> *"This needs a committed 32-entry team-code→name table, because the DEF rows carry codes
> (`"HOU"`) while `dst` carries full names (`"Houston Texans"`) and **that mapping exists nowhere
> in the repo** — it lives only in whoever typed the array."*

The plan was deepened, reviewed, and closed. Following it means hand-typing 32 entries.

That instruction is the plan violating its own KTD-1 — *"`players_data.json` is the single source,
and no field inside it may duplicate another"* — in the act of enforcing it. A hand-typed table is a
new hand-maintained copy of data that has to stay true to the world, which is the exact failure
class the whole rebuild exists to eliminate.

## Root Cause

**The plan's factual claim was true when written and falsified by the unit that shipped after it.**

U14 (`c6379d78`, two days later) committed `draft-kit/cache/sleeper_players.json.gz` — the pinned
Sleeper dump, 12,213 players — as provenance for the frozen ids. That dump contains **exactly 32
DEF entries**, keyed by team code, each carrying the mapping the plan said existed nowhere:

```
'HOU' -> first_name 'Houston'  last_name 'Texans'
'ARI' -> first_name 'Arizona'  last_name 'Cardinals'
```

And a second look showed the table is not needed for this job *at all*: the DEF rows already carry
the full name in their own `name` field —

```
pr=1  r=151  team='HOU'  name='Houston Texans'
```

so `dst` is a pure projection of `players`, with no lookup involved:

```python
dst = [{"rank": p["pr"], "team": p["name"]} for p in DEF_rows if p["pr"] <= 8]
```

The plan reached for a table because it framed the problem as *translation* (codes → names) when
the actual relationship was *projection* (a subset of rows already holding the answer).

## Fix

Derive `dst` from the DEF rows directly; type nothing. Use the dump for the thing it is genuinely
good for and that the plan did not ask for — an **identity check**: assert each DEF row's `name`
equals the dump's official name for its `team` code. That is
[`010`](010-exactly-one-candidate-was-treated-as-proof-of-identity.md) applied — the row's own name
is an attribute a wrong row would also have, so it is not self-verifying.

Verified against current data: **14 DEF rows, 0 mismatches**, so it ships green as an invariant
rather than as a known-red finding.

## Key Insight

**A closed plan's *decisions* stay binding; its *facts* expire — and the ones most likely to expire
are the ones a later unit was built to change.** "X exists nowhere in the repo" is not a decision,
it is a measurement with a timestamp, and this plan's own sequencing guaranteed that U14 would
invalidate it before U6 read it.

The tell is structural: when a plan prescribes *creating* an artifact to supply a missing fact,
check whether anything shipped since has supplied it. Hand-authored data is the most expensive
possible answer, so a plan that reaches for it is exactly where to spend the thirty seconds
confirming the gap is still real.

Closing a plan protects it from re-litigation, not from reality. Execute the decision, re-measure
the premise.

## Also Applies To

- Any "we'll need to build/maintain a mapping table" instruction — grep for the data first;
  vendored dumps, fixtures, and caches committed for one purpose routinely carry it.
- Long-lived plans generally: dependency-absence claims ("`jinja2` is not installed" — also false
  by the time U6 ran), file-absence claims, and line-number anchors all decay between deepening and
  execution.
- Any remedy that *adds* a source of truth in service of a single-source-of-truth goal. If the fix
  creates a second place a fact can be wrong, it is not the fix.
