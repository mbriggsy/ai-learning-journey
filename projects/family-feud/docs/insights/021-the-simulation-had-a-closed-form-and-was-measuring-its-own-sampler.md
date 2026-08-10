---
title: 495 engine runs computed comb(); the simulation had a closed form all along
date: 2026-08-09
phase: mock-draft-harness
modules: [scripts/precompute_ladder.py, tests/test_precompute_ladder.py]
tags: [tautology, simulation, closed-form, sampler-artifact, insight-018, insight-019, adversarial-review]
---

## Problem

The branch precomputer was built to answer the draft-day question offline: *what will still be on
the board when my turn comes?* Its method was simulation. Sample `gap` players out of a pool of
plausible next-picks, run the **real engine** on each resulting future, and aggregate:

- `board_rank_answers` — how often each name tops BEST AVAILABLE across the futures
- `cliff_empty_rate` — the share of futures in which each tier empties

495 engine subprocesses per invocation. The design was careful in every way this project has
learned to be careful. It refused to re-implement the ranking. It refused to build an opponent
model. It had already caught and documented **three** near-tautologies during construction, and it
carried tests asserting each stayed dead. 24 tests, all green.

Every one of those numbers was arithmetic about the sampler.

## What it actually was

The aggregates were compared against their closed forms. They matched **to the digit**:

| output | measured | closed form |
|---|---|---|
| the *i*-th board-ranked pool member tops BEST AVAILABLE | 330 / 120 / 36 / 8 / 1 | `C(k-i-1, gap-i)` → 330 / 120 / 36 / 8 / 1 |
| RB T3 (1 left) empties | 0.333 | `C(k-L, gap-L)/C(k,gap)` → 0.333 |
| WR T4 (2 left) empties | 0.091 | same → 0.091 |

Both are functions of three numbers: the pool size `k`, the gap, and `L` — and `L` is printed by
the engine **on the same output line** as the percentage derived from it. Neither quantity knows
anything about football. The simulation was an expensive way to evaluate `math.comb`.

The reason is structural, not incidental. BEST AVAILABLE is *defined* as lowest-board-rank-available
(`draft_engine.py:447`), so "who tops it" is decided the moment you know which pool members were
removed — and under **uniform** enumeration, every subset of a given size is equally likely by
construction. A tier empties exactly when all `L` of its survivors are in the drawn subset. No
football enters anywhere.

**Widening the pool does not rescue it.** The closed form holds for any `k`. The only thing that
would make enumeration informative is a *non-uniform* removal probability — an opponent model. The
file had already, correctly, refused to fabricate one.

## The tell that was there the whole time

This file had deleted a `survives 67%` figure before it ever shipped, with a comment explaining
that uniform sampling gives every pool member the identical survival rate `C(k-1,gap)/C(k,gap)`,
so the number was "arithmetic about the sampler, not football."

That is the *same sentence* that condemns the two headline blocks. The lesson was written down,
tested against (`test_the_output_carries_no_survival_probability`), and then **not applied one
level up** — because the deletion was framed as being about a *percentage*, and the survivors were
counts and rates that looked like measurements. Insight 005's meta-lesson again: an insight nobody
propagates to the neighbouring surface is a note, not a fix.

## The dead sampler underneath

The enumeration also hid a defect that could not fire where it was:

```python
k = int.from_bytes(h[b * 4:(b + 1) * 4], "big") % len(pool)
```

`h` is a 32-byte SHA-256 digest, so for `b >= 8` the slice is `b""` and `int.from_bytes(b"", "big")`
is `0`. Every draw past the eighth slammed to index 0 and walked forward. Measured: **60 of 60**
sampled futures contained both `pool[0]` and `pool[1]`, against a uniform expectation of 3.5.

It never bit, because it needs `gap >= 9`, and with a 12-name pool `C(12, gap)` is always under the
default 1000 — so the code took the exhaustive branch every time and the sampler was unreachable.
**Fixing the pool cap would have made it live.** A dead code path is not a safe one; it is an
untested one waiting for a parameter change.

## Rule

**Before building a simulation, compute what it would produce in closed form. If you can, you do
not have a simulation — you have an expensive calculator, and its output will read as evidence.**

Concretely, for any Monte-Carlo or enumeration over futures:

1. **Write down the closed form for one aggregate and compare.** If they match, the sampler is not
   measuring your system, it is measuring itself. This costs ten minutes and it is decisive.
2. **Ask what varies between draws.** If every draw is equally likely by construction, the output
   is a function of the shape of the draw, not of the domain. Non-uniformity — a validated model of
   *who actually picks what* — is the only thing that puts information in.
3. **Check whether the aggregate is a restatement of an input printed beside it.** `cliff_empty_rate`
   was a monotone function of the `N left` count on the same line.
4. **A sampler that never runs is not verified.** Enumerate the parameter range that reaches it
   before trusting a green suite.

This is [insight 018](018-the-bias-was-the-only-thing-producing-findings.md) one level out. There,
two sides of a comparison shared an ancestor. Here, the two sides of the *simulation* — the thing
sampled and the thing measured — shared one: the sampler's own uniformity.

## Cost and correction

- Enumeration removed entirely, along with `branches_for` and its broken digest sampler.
- What survives is what one engine run can say (the queue, the tier-cliff **condition**) plus one
  concrete scenario (the market projection) — and the scenario now ships with its own backtest:
  **market 35% · null model 33% · floor control 1%**, over 18 stops of the committed 120-pick feed.
  The floor is what proves the metric can discriminate at all; the null is what proves ADP buys
  ~1 player in 84 over our own board order.
- `test_the_enumeration_stays_dead` fails if `itertools`, `branches_for`, `of futures`,
  `cliff_empty_rate`, `board_rank_answers` or `EXHAUSTIVE` reappear in the module.
- 52 tests, 10 mutants planted, 10 killed — two of which survived the first pass
  ([insight 019](019-the-mutants-only-probe-the-axis-you-already-suspect.md) yet again: one test
  asserted the right answer for the wrong reason, and one guard's **call site** had no test at all).
