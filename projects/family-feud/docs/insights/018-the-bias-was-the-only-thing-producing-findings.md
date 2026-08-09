---
title: Correcting the bias took the findings to zero, because the bias was the findings
date: 2026-08-08
phase: machinery-rebuild
modules: [scripts/consensus.py, scripts/rerank.py, tests/test_consensus.py]
tags: [circularity, measurement-error, instruments, depth-artifact, doctrine, insight-005]
---

## Problem

`scripts/consensus.py` prices the board's disagreements with the FantasyPros expert consensus in
points over replacement. On 2026-08-08 it reported **six** disagreements surviving the experts'
own spread, headed by Nicholas Singleton at **−25.0 points**.

All six read *"they like him LESS."* Six for six, one direction.

A real disagreement set scatters. A one-directional one is an instrument reading, not a finding.

## Root Cause

Two defects, stacked, and the second was invisible until the first was fixed.

### 1. The depth artifact

FantasyPros ranks **523** players; this board carries **174**. Position rank was counted inside
each list separately and the two were then subtracted:

```python
mine   = vorp(curve, baselines, p["pos"], p["pr"])            # counted within 174
theirs = vorp(curve, baselines, row["pos"], row["pos_rank"])  # counted within 523
```

A board RB43 is their RB63. The gap between those two rungs was looked up on the value curve and
printed as a cost in fantasy points. **The instrument was pricing the difference in list length.**

It biased every row the same way, which is why the six pointed one direction — and the false
positives were the smaller half of the harm. Because the bias is one-directional, a player the
experts genuinely ranked *higher* than the board was dragged toward neutral and swallowed by the
"their spread covers your placement" bucket, which held **141 rows**. The instrument's blind spot
was its single most valuable finding: *the experts like this guy more than you do.*

It also cost three players any comparison at all. Their inflated consensus ranks ran past the
curve's last measured point and they were counted `off-curve` — **3 of 150, now 0.**

`market.py` had removed the identical artifact from ADP months of code earlier (`market_ranks`,
docstring: *"the ~100 the board does not carry occupy ADP slots and inflate every number"*). The
same correction had simply never been carried across.

### 2. What the artifact was hiding

With the ranks restricted to the players the board actually carries, the residual disagreement is:

```
compared: 150
raw delta EXACTLY 0.0 : 150  (100%)
board pr MINUS restricted consensus rank: {0: 150}
```

**Zero variance. Not approximately — identically, at rank level, on all 150 rows.**

The cause is not a bug in the correction. It is `scripts/rerank.py`, which on 2026-08-08 re-derived
the board's `r`/`pr` from *this exact FantasyPros ECR list* after Briggsy's call that the old
Cowork-era ranks "carry no weight." From that moment, `consensus.py` section [1] has been asking
whether the consensus disagrees with itself. `rerank.position_ranks()` counts board rows within a
position after sorting by `ecr`; `consensus.depth_rank()` counts carried rows with a lower `ecr`.
**They are the same function of the same input.**

So the instrument had been circular for its entire life since the re-rank — and the depth artifact
had been manufacturing six confident findings on top of the silence, which is exactly why nobody
noticed.

## Fix

One function answers all three questions the old code answered three different ways:

```python
def depth_rank(ecrs_by_pos, pos, ecr):
    """Where `ecr` slots among the players the board carries at `pos`. 1-based, or None."""
    e = ecrs_by_pos.get(pos)
    if not e or ecr is None:
        return None
    return bisect.bisect_left(e, ecr) + 1
```

- a board player's rank restated in the board's units
- an omitted player's **insertion** rank ("where would he land if I added him")
- the rank implied by either edge of the experts' published spread

Restricting the point estimate and **not** the spread would have been worse than not fixing it:
`surviving_delta()` subtracts the bounds from the estimate, so a restricted estimate against
unrestricted bounds is a subtraction of two different quantities that still returns a
plausible-looking number. Measured on the fixture: the naive port invents a **−65 point**
disagreement out of a board that agrees perfectly.

And section [1] now **declares the circularity on every run** rather than printing a zero:

```
[1] NOTHING TO COMPARE -- this section is CIRCULAR right now
    All 150 compared rows sit at EXACTLY their consensus rank, because rerank.py
    built this board's ordering out of this very list. The zero is an identity, not
    a verdict -- it is NOT ~100 experts ratifying the board.
```

## The lesson

**When correcting a bias takes your findings to zero, the bias may have been the only thing
producing findings. That is a result, not a regression — do not tune it back.**

The tempting reading of "six findings became none" is that the fix broke the tool, and the
tempting repair is to loosen the spread filter until results come back. That would rebuild the
noise machine on purpose. The correct response is to establish what the instrument is now
*capable* of saying, and to make it say that instead:

- **Section [1] is now a drift detector, not a discovery tool.** It can only fire when a rank is
  overruled by hand, or when FantasyPros publishes a scrape newer than the board's synthesis date.
  Both are real and both matter as news moves through August — but neither is "find me value."
- **Section [2] is the half that still discovers anything**, because players with no board row were
  never inputs to the re-rank. It got materially better: valued at where they would *land on this
  board*, players worth more than replacement went **2 → 3** and Jayden Reed moved 0.0 → +4.0.

This is [insight 005](005-the-tie-breaker-agreed-with-the-board-by-construction.md)'s shape a
second time — a check that agrees with its own input — but with a new and nastier wrinkle. In 005
the circularity was visible the moment anyone measured it (0 order violations). Here a measurement
error was **masking** it: the instrument produced confident, specific, plausible output, so there
was nothing to prompt the measurement. **A tautology that prints six results is far more dangerous
than one that prints none.**

The generalisation, for any comparison this project adds next: before trusting a disagreement
metric, check whether the two sides share an ancestor. If they do, the metric's zero is an
identity and the instrument must say so itself — a comment in the source is not a defence, because
the person misreading the zero is reading the *output*.

## ⚠️ The first version of this fix carried a one-rung copy of the same bug

Written down because it is the more useful half of the story. The correction shipped, green,
mutation-tested — and **`depth_rank` counted the player as one of the players ahead of himself**
at the upper edge of the spread. `bisect_left` is left-of-equal, so at his own ECR he is excluded
for free; but `worst` probes at `ecr + sd`, his own rung sorts strictly below that, and he gets
counted. Measured on the live board: `best` correct on 150 of 150, **`worst` one rung too deep on
150 of 150, error `{+1: 150}`** — 897.5 VORP points of spurious band-widening, mean 6.0, max
**59.3** on Ja'Marr Chase.

Only `low` was corrupted, never `high`, so the acceptance band stretched **downward only** and
`surviving_delta` returned 0 — *"their spread covers your placement"* — on findings that should
have read *"they like him MORE."* **That is the exact one-directional blind spot this whole
insight is about, surviving one rung deep inside the fix for it.** Hand-demote Chase from WR1 to
WR2 — the precise action the circularity banner names as what re-arms section [1] — and a **+59.3
point** finding reads as nothing to answer for.

The fix is an `own=` argument: a player is never his own competition. It must stay conditional,
because a player the board **omits** has no rung of his own and `len+1` is a real answer for him —
over-correcting breaks section [2] instead (mutant M6).

Full lesson in [insight 019](019-the-mutants-only-probe-the-axis-you-already-suspect.md), including
the test that asserted the bug.

## Evidence

- **643 tests**, 0 failures (was 628; **15 added**), `python -m unittest discover -s tests`.
- **7 mutants planted and all 7 killed**, source restored byte-identical:
  M1 no restriction at all · M2 point estimate reverts to the published rank · M3 omitted players
  revert to the published rank · **M4 the naive port** (estimate restricted, spread left on the
  full list) · **M5 the self-counting bug restored** · **M6 over-correction** (exclude self
  unconditionally, which breaks the omitted-player insertion rank) · **M7 the fix present but not
  passed at the call site**. M4 and M7 are both caught only by **call-site** tests through
  `compare()`, because the direct unit tests of `spread_pos_ranks` pass a ladder in and so cannot
  see how the caller wires it (insight 013).
- The circularity banner ships with a **positive control**: overruling one row by hand retires the
  banner and restores the normal section. A banner that printed unconditionally would go on
  claiming circularity through the exact refresh that ends it (insight 008).
- Restricted ladder lengths — **QB 23, RB 48, TE 20, WR 59** — reproduce insight 005's independently
  measured per-position counts exactly, which is the coverage check: 0 unmatched, 0 off-curve.
