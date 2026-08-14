---
title: Four modelling errors, four confident answers, four different conclusions
date: 2026-08-14
phase: board-accuracy
modules: [scripts/backtest_board.py, scripts/realized_value.py]
tags: [backtest, strawman, floor-control, leakage, self-audit, insight-021, insight-022, insight-023]
---

## Problem

`realized_value.py` (insight 023) measured that the board overstates the top of every position by
~2x, and that an elite QB has realised almost nothing above replacement over eleven seasons. The
obvious next step was to reprice the board.

**But hours earlier the same session had killed the opponent model** for exactly one reason: it
could not beat a dumb constant out of sample (insight 022). The realised curve was about to be
shipped on the strength of an **in-sample** measurement. Same session, two standards, and the
weaker one was being applied to my own idea.

So: build the harsher test. Hold out seasons, build every valuation only from seasons before the
held-out one, run a real 8-team snake draft, score the actual starting lineup — and include a
floor arm that **ignores both curves and drafts straight down ADP**.

The stated rule was that *the floor must be able to embarrass the board we already ship, not only
the challenger.*

## What happened

Four separate modelling errors. **Each one produced a confident, coherent, publishable-looking
result, and each fix changed the conclusion.**

| # | defect | what the arms did | what it "proved" |
|---|---|---|---|
| 1 | no baseline subtracted | drafted **quarterbacks first** — raw points are not comparable across positions | ADP floor beats both curves, 2.8σ and 6.9σ |
| 2 | starters not forced | an arm saying QB is worthless never drafted one and **took a 0 in the QB slot** | REALISED is terrible — *by punishing it for its own conclusion* |
| 3 | greedy value + position caps | **six running backs in the first six rounds**, then scrambling for a QB | REALISED loses to the floor at 2.2σ |
| 4 | marginal value over an **empty** lineup | degenerates to raw points at 1.1 → **quarterback first overall again** | — |

Defect 1 is the ordinary version. Defect 4 is the interesting one: the fix for 3 was "value a
player by what he adds to a startable lineup", which is correct — but over an *empty* roster every
slot is unfilled, so the marginal value of any player is simply his projected points, and the
quarterback wins again. **The correct counterfactual is not an empty slot. It is the player you
could get at that slot later** — replacement level. With the lineup notionally pre-filled at
replacement, the elite back is worth ~272 and the elite quarterback ~130, and positional
saturation still falls out for free.

## The answer, once the simulator was fair

12 held-out seasons (2014-2025), all 8 draft slots, scored as margin over the seven opponents
**inside the same draft** so the season effect cancels:

| arm | margin over the room | SEM | |
|---|---|---|---|
| ORDER (what the board ships) | **-18.9** | 36.7 | 0.5σ |
| REALISED (insight 023's curve) | **+1.5** | 47.2 | 0.0σ |
| ORDER − REALISED | -25.4 | 55.6 | 0.5σ |

**Nothing is distinguishable from anything.** The realised curve is not better. It is also not
worse — the 2.2σ loss reported at defect stage 3 was an artifact of my own strawman, and it
evaporated when the drafting logic became competent.

⚠️ **And the board's own VBD layer is not measurably better than drafting straight down ADP**
(-18.9 ± 36.7). That is **not** a finding that the board is useless; it is a finding that twelve
seasons cannot resolve a difference this small. **A null result here means UNRESOLVED, not EQUAL**,
and the file prints that sentence on every run.

## Two things that were mislabelled

**The "positive control" was an arithmetic identity.** The ADP arm plays the same strategy as all
seven of its opponents, so across the 8 slots the margins sum to zero *by construction* —
`Σ[xₛ − (S−xₛ)/7] = S − S = 0`. It can only ever print 0.000. It is a useful bug detector and it
is **evidence of nothing** about seat bias. It was written down as a control before that was
noticed.

**The significance was inflated 2.4x by counting the wrong unit.** 12 seasons × 8 slots is not 96
independent observations: within a season every slot shares the same player outcomes, so when the
consensus RB1 tears an ACL, every slot that drafted him is wrong together. The per-slot SEM was
33.0 where the per-season SEM was 79.9. **This is insight 022's own "count the unit you are
quoting" corollary — written that afternoon, and repeated in the very next script.** Both numbers
are now printed side by side so the inflation is visible rather than trusted.

## Lesson

**A simulator is a model, and a wrong model does not fail loudly — it produces a clean number.**
Every one of the four broken versions ran to completion, printed a tidy table, and supported a
confident conclusion. Three of those conclusions were opposite to the final one. Nothing crashed.
No test went red. The only reason any of it was caught was **printing what the arms actually
drafted** — six running backs in a row is obvious to a human eye and invisible in a mean.

> When a simulation produces a result, look at what it *did*, not only at what it *scored*.

**Corollary — apply your harshest standard to your own idea first.** The realised curve was
genuinely a better *question* than the shipped curve, which made it feel like a better *answer*.
It is not, on the evidence. Insight 022 killed someone else's idea with a floor control; this one
had to kill mine.

**Corollary — a strawman opponent flatters whatever you are testing.** Defects 2 and 3 both made
the challenger look bad and would have "confirmed" that the incumbent board was fine. A test that
can only produce the answer you already believe is not a test, and the direction of the bias is
not something you can detect by reading the result.

## What was done

- **The board is UNCHANGED.** No evidence the realised curve improves it; changing a shipped
  instrument on no evidence is worse than leaving it. Insight 023's measurement stands as a
  description of the curve's meaning, not as a licence to swap it.
- `scripts/backtest_board.py` ships with 14 tests and 5 mutants killed, including a leakage
  mutant (`y <= target`) that would silently let a curve see the season it is scored on.
- The four defects are pinned by name in `tests/test_backtest_board.py` so none can return
  quietly.

## A fifth thing, found 2026-08-14: the numbers above had no recorded invocation

Every figure in this file comes from `--years 2010-2025 --first-test 2014`. **That was written
down nowhere**, and the script's defaults were `--years 2015-2025 --first-test 2019`, which give
11 usable seasons and **`ORDER margin +35.7 ± 50.1` — positive, the opposite sign to the `−18.9`
this file reports.**

So `python scripts/backtest_board.py`, the command any future session would obviously run, printed
a sign-flipped answer to the headline question and looked exactly as authoritative as the document
it contradicted. Nothing was wrong with the analysis; the *tool disagreed with its own write-up by
default*, which is a fifth way to get a confident wrong answer out of this harness and belongs
beside the other four.

**Fixed by making the defaults the published invocation**, so the bare command reproduces this file
bit-for-bit — verified: `−18.9 ± 36.7`, `+1.5 ± 47.2`, `−49.8 ± 25.6`.
`TestTheDefaultsAreThePublishedInvocation` pins it and a mutant reverting the range turns it red.

**The general rule this is an instance of:** a published number needs its invocation recorded, or
the default has to be the invocation. Prefer the second — a recorded flag is a thing someone
forgets, and a default is a thing they cannot.
