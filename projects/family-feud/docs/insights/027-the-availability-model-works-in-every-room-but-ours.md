# 027 — The availability model works in every room but ours

**Measured 2026-08-17** by `scripts/availability.py` against **7 distinct real human drafts**
(2023-2025, pulled full from Sleeper), historical FFC ADP joined at **76-88%**.
**Decision: DO NOT SHIP the availability indicator.** The reasoning is worth more than the verdict.

## Why it was allowed to be asked at all

[Insight 021](021-the-simulation-had-a-closed-form-and-was-measuring-its-own-sampler.md) deleted an
enumeration that looked very like this, because under **uniform** sampling survival collapses to
`C(k-i-1, gap-i)/C(k, gap)` — a fact about the draw with no football in it. Its own write-up left
the door open: *"Only a non-uniform opponent model would make enumeration informative."*

**We have one, and it is measured.** `precompute_ladder.py --backtest`, re-run 2026-08-15:
market ADP names **30 of 84** of the players who actually go, our own board order **26 of 84**, and
the deliberately-poor floor **1 of 84**. A **31× separation** between consensus order and
anti-consensus order is direct evidence the other seats are nothing like uniform. So this is a
different object from the one that was deleted, and it earned a hearing.

⚠️ It also corrected the record: `precompute_ladder.py`'s docstring claimed the floor scored **23%**.
It scores **1%**. Fixed the same day.

## The model, in one line

At my pick, a player survives to my next pick iff fewer than `G` of the players ranked above him
get taken. So the whole model is a signed distance:

    slack = D − G      D = still-available players the market ranks ABOVE him (minus whoever I take)
                       G = opposing picks between this pick and my next one

Threshold fitted on other drafts, tested on a held-out one. Never fitted and reported on the same
data — `TestNoLeakage` builds two folds wanting opposite thresholds and fails if that ever changes.

## Pooled, it looks shippable. It is not.

| subset | model | base rate | edge |
|---|---|---|---|
| all available on-list players | 0.903 | 0.874 | +0.029 |
| **top-24 available** (where a decision actually lives) | **0.741** | **0.646** | **+0.095** |

🚨 **Raw accuracy here is a trap and the file is shaped around it.** Most available players are
deep and obviously survive, so *"everybody survives"* scores ~90% and reads like a working
instrument. Every number is printed beside its base rate for that reason.

## The decomposition that killed it

The edge is a clean monotone function of the gap — and an 8-team room's gap is **fixed by the seat
you draw** (`2(s−1)` and `2(8−s)`, always even):

| gap | pooled edge | **8-team edge** | our seats at that gap |
|---|---|---|---|
| 1-3 | +0.000 | +0.000 | 2 / 7 |
| 4-5 | +0.000 | +0.000 | 3 / 6 |
| 6-7 | −0.001 | **−0.034** | **4 / 5** |
| 8-9 | +0.009 | **−0.044** | **4 / 5** |
| 10-11 | +0.029 | **−0.023** | 3 / 6 |
| 12-13 | +0.063 | **−0.046** | 2 / 7 |
| 14+ | +0.122 | **−0.006** | 1 / 8 |

**Six of the seven drafts are 10- or 12-team. Every 8-team measurement we hold is negative, at
every gap.** Judging ourselves by the pooled column is precisely
[insight 022](022-the-opponent-prior-lost-to-always-guess-wr.md)'s error — a prior that looked
healthy in aggregate and lost to a constant for the one seat that mattered.

## The mechanism, which is why this is not just noise

Survival by depth at gap ≥ 10:

| players ranked above him | 8-team | 10/12-team |
|---|---|---|
| 0-2 | **0.473** | **0.208** |
| 3-5 | 0.568 | 0.312 |
| 6-9 | 0.621 | 0.395 |
| 15-23 | 0.786 | 0.721 |

**Depth discriminates in both.** The difference is the level. A 12-team room spends `12×16 = 192`
picks on a ~206-deep list — it consumes the board almost exhaustively, so consensus order predicts
well and the very best available man is *gone* 79% of the time. **An 8-team room spends 128 picks
on the same list and leaves ~50 of the top 180 undrafted**, so it churns far less predictably and
**the best available player comes back to you 47% of the time.**

That is why no threshold helps: at depth 0-2 the answer is a coin flip, and everywhere else
"survives" is already the right guess. The **best-possible in-sample** threshold for 8-team scores
**0.648 against a 0.656 base rate** — a ceiling *below* guessing, with the fit handed to it.

## What this does and does not establish

- ✅ It establishes that **nothing we hold shows the model working in our format.**
- ❌ It does **not** establish that the model fails here. **The 8-team column rests on ONE draft**
  (2023 Fantasy Fuccbois), and its rows are heavily correlated — `n = 486` at gap 14 is one draft,
  not 486 independent samples. Never quote the n as a sample size.

## The finding worth keeping, which is not the model

🚨 **In an 8-team room the best available player comes back to you roughly half the time.**
Standard draft advice — *"take him now, he'll never last"* — is written for 12-team rooms where
that man is gone 79% of the time. **Our room is far more forgiving of waiting than the advice
assumes.** That compounds with the thesis this board already rests on: it is priced for 8-team
replacement while the rest of the league drafts off a generic 12-team list.
⚠️ Direction only — one draft. Do not put a percentage on the board.

## Re-open condition

More **8-team** full feeds. The room plays every year, so 2026's own draft adds one. Re-open with
`python scripts/availability.py --fetch` once `draft-kit/cache/opponents/` holds more 8-team
drafts — never by loosening `MIN_EDGE`, and never by quoting the pooled column.

`draft-kit/availability_calibration.json` records the verdict per gap and currently reads
**SILENT at every gap for all 8 seats**. A gap marked SILENT must render nothing: printing a call
the measurement says is no better than *"assume he is there"* is how a fabricated number gets a
label. 23 tests, 5 mutants planted and killed, including a dedicated leakage control.
