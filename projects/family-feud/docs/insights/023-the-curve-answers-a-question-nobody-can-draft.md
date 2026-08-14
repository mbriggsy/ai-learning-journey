---
title: You cannot draft a finish — the curve overstates the top of every position by ~2x
date: 2026-08-14
phase: board-accuracy
modules: [scripts/realized_value.py, scripts/build_curves.py, draft-kit/players_data.json]
tags: [order-statistic, selection-effect, vorp, baseline, qb, insight-022, board-accuracy]
---

## Problem

The board's `vorp` is `curve[pos][rank] - baseline`, and `curve[pos][k]` is built by
`build_curves.py` as *"what did the player who **finished** kth score, averaged over four
seasons."*

That is an **order statistic**. `curve[WR][1] = 387.5` is the score of whoever turned out to be
the best receiver — a player selected, after the fact, for having beaten expectations. Somebody
finishes first every year, but **nobody is projected to be the outlier.**

And a draft board is consumed the other way round. **You cannot draft a finish. You draft a
rank.** The board says Bijan Robinson is worth 268.4 because he is ranked RB1 and the player who
*finishes* RB1 has averaged 268.4 above replacement. Those are different quantities and nobody
had ever measured the gap.

## What was measured

`scripts/realized_value.py`. Historical preseason ADP (Fantasy Football Calculator, which
publishes back to 2010) joined to what those exact players then scored under this league's own
scoring, against that same season's own replacement level. **Join coverage 98-99% every year**,
with a hard refusal below 90% — a name join that quietly drops half the pool returns a confident
number over whoever matched.

**Realised value of drafting the preseason #1, 2015-2025 (11 seasons), against what the board
ships:**

| slot | realised | sd | SEM | board | ratio |
|---|---|---|---|---|---|
| **QB1** | **10.2** | 88.3 | 26.6 | **129.7** | **12.7x** |
| RB1 | 105.2 | 140.0 | 42.2 | 268.4 | 2.55x |
| WR1 | 133.9 | 89.2 | 26.9 | 242.7 | 1.81x |
| TE1 | 76.0 | 66.8 | 20.1 | 134.8 | 1.77x |

**The board overstates the top of every position, four for four — and it does not overstate them
equally.** A uniform error would leave the ordering intact. This one does not: QB1 is the most
overstated of the four in every window, so the board's *cross-position* ordering is distorted, not
merely its scale.

> ⚠️ **CORRECTED 2026-08-14 — "worst at QB by a factor of five" IS A 2015-2017 ARTIFACT, and the
> line above it claiming this is "stable across windows" was false for that ratio.** Re-measured
> on all three windows:
>
> | window | QB1 overstated | next worst | QB's lead |
> |---|---|---|---|
> | 2015-2025 | 12.7× | RB1 2.55× | **4.98×** |
> | 2018-2025 | 2.59× | RB1 2.56× | **1.01×** |
> | 2022-2025 | 2.88× | RB1 2.21× | **1.30×** |
>
> **What IS stable is the direction, not the magnitude** — QB1 is the most overstated slot in all
> three windows, and realised QB1 comes to at most about HALF realised RB1/WR1 in each
> (10.2 vs 105.2/133.9 · 50.1 vs 104.7/113.5 · 45.0 vs 121.6/130.9). That halving is the fact the
> draft doctrine actually rests on, and it survives. The factor of five does not, and it was the
> sentence licensing "cross-position ordering is distorted" in its strong form.

## The headline: an elite QB has been worth nothing here

Realised vorp of the preseason QB1 through QB12, 2015-2025:

```
10.2 · 63.4 · -14.6 · 18.6 · 9.0 · 4.7 · 2.6 · -38.8 · -26.7 · -31.0 · -10.3 · -15.3
```

> 🚨 **CORRECTED 2026-08-14. This paragraph used to read "Twelve cells, all at or below zero, over
> eleven seasons" — and the row printed directly above it has SIX POSITIVE CELLS** (10.2, 63.4,
> 18.6, 9.0, 4.7, 2.6). The claim was contradicted by its own data, one line away, in the file's
> headline paragraph. What follows replaces it.

**Eleven of the twelve are indistinguishable from replacement, and the window matters more than
the sign.** QB1 is **10.2 ± 26.6** over 2015-2025 — genuinely indistinguishable — but that headline
is carried by 2015-2017: on **2018-2025 QB1 realises 50.1 ± 20.5, which is 2.4σ ABOVE replacement**,
and on 2022-2025 it is 45.0 ± 36.9. **"An elite QB has been worth nothing here" is true of the
widest window and NOT true of the recent one.** The board prices that slot at **129.7** either way.

**One cell does separate, and it is not QB1: QB2, at 63.4 ± 13.8** over 2015-2025 (66.5 ± 16.4 on
2018-2025). ⚠️ Do not promote that to a finding — it is one of **83** cells measured here, and the
comparison a draft actually faces is the *paired* QB2 − QB1, which is **+53.2 ± 30.7, t = 1.73**
and fails the same 2σ bar this file applies to everything else.

⚠️ **THE DOCTRINE IS UNCHANGED, AND IT NEVER RESTED ON THE ZERO.** It rests on the halving above:
realised QB1 is at most about half realised RB1/WR1 in every window, so a top-3-round quarterback
passes a back or receiver worth roughly twice as much. That holds at 50.1 exactly as it held at
10.2. The correction is to the *evidence*, not the *conclusion* — and the QB-in-rounds-6-9 window
already covers the ADP QB2 this section flags.

This is now the **third independent line** pointing the same way, and the other two were built
from entirely different data:
1. The board's own arithmetic — `QB1` 129.6 against `RB1` 268.4 (elite QB worth half an elite back).
2. The room's results — the two members who spent a first-rounder on a QB in the 2023 8-team
   redraft finished 5th and 6th of 8; the two who waited finished 1st and 2nd
   ([`opponents.md`](../opponents.md)).
3. This — eleven seasons of realised value.
4. **And the decision itself, put on trial**
   ([`insight 024`](024-four-broken-simulators-four-confident-answers.md)). The first backtest
   could not test this at all, because ORDER and REALISED *both already decline* an early
   quarterback — comparing them says nothing about QB timing. A fourth arm was added that forces
   a round-2 quarterback, the measured behaviour of this room's two reachers. Over 12 held-out
   seasons its margin over the room is **−49.8 ± 25.6 (1.9σ below zero), negative in 9 of 12
   seasons, and it loses to all three other arms** (`ORDER −QB-EARLY +23.7`, `ADP floor +41.9`,
   `REALISED +49.1`). ⚠️ **No single comparison clears 2σ at n=12** — but every one points the
   same way, and QB-EARLY is the only arm meaningfully below zero.

## Why term (b) was always going to dominate

The same probe measured how far a preseason rank misses:

| | median rank miss | (a) sd of the *finish* | (b) sd of the *ranked player* |
|---|---|---|---|
| QB | 6 | 23.5 | 74.7 |
| RB | **9** | 20.5 | **146.4** |
| WR | **12** | 15.8 | 68.5 |
| TE | 4 | 33.6 | 53.9 |

**Term (b) is 1.4x to 25x term (a).** The error bar the board implicitly carries is the small one.
The preseason RB1 finished **RB30 (2022, Jonathan Taylor), RB1, RB49 (2024, McCaffrey), RB2** —
two of four years it cratered, both injuries. That is why RB1 carries the widest spread on the
board and why a 25.7-point edge over WR1 does not mean what it looks like.

⚠️ **This also inverts an earlier reading.** Term (a) alone said `TE1` was the board's
highest-variance slot (sd 30.5). With the dominant term included, **TE1 has the LOWEST total
spread of the four positional #1s** (60.6 against RB1's 145.1). Measuring the small term and
ranking risk by it produced exactly the wrong answer.

## Lesson

**A statistic computed over "who turned out best" cannot be consumed as "who should I pick."**
The selection is the whole difference, and it is invisible in the number — `curve[WR][1] = 387.5`
looks like a fact about receivers and is really a fact about hindsight.

The tell was available for free and went unnoticed for months: Sleeper's projections put the best
WR at **311.1** against the curve's 387.5. A ~75-point disagreement between two instruments that
both claim to describe the same player is a finding, and it was read as "projections are
conservative" rather than "these measure different things."

**Corollary — the right quantity can be the wrong estimator.** The realised curve is the quantity
the board actually wants, and it is **non-monotonic**: RB3 (176.4) outscores RB1 (105.2), RB7
beats RB5. With per-cell SEM of 20-42 that is noise, not structure. **Swapping the curve for it
wholesale would ship a board asserting RB7 > RB1.** A better question measured worse is still
measured worse; the fix is more seasons or a monotone fit, and either is its own unit with its
own validation.

## What was done

- `scripts/realized_value.py` ships as a **second instrument**, beside `market.py`'s
  value-vs-price and `consensus.py`'s value-vs-experts. 10 tests, 5 mutants planted and killed.
  It does **not** modify the board.
- `--window-compare` prints the recency/precision trade rather than defaulting it, and
  `--compare-board` prints the disagreement per slot with the board's own player at that rank.
- **The board is UNCHANGED — and that is now DECIDED BY MEASUREMENT, not pending.**
  [`insight 024`](024-four-broken-simulators-four-confident-answers.md) held out 12 seasons and
  ran real drafts: the realised curve's margin over the room is **+1.5 ± 47.2** against the
  shipped board's **−18.9 ± 36.7**. Indistinguishable. **A better question, measured worse, is
  still not a better board.** The measurement in THIS file stands as a description of what the
  curve means; it is not a licence to swap it.
