---
title: The opponent prior beat the room average and lost to "always guess WR"
date: 2026-08-14
phase: opponent-model
modules: [scripts/scout_opponents.py, docs/opponents.md]
tags: [floor-control, negative-result, cross-validation, wrong-metric, insight-008, insight-021, opponent-model]
---

## Problem

`TODO.md`'s harness leg (d) wanted a validated opponent model. Sleeper serves every pick every
Family Feud opponent has ever made, so `scout_opponents.py` read it — **37 leagues, 18 comparable
redrafts** — and the profiles came out looking strong and legible:

> `briggsy007` takes a QB in the first wave, **7 of 7**, median round 3.
> Nobody in the room takes a TE early — median first TE R7-R9.
> `RMonk9` waits on QB and has finished 1st in points-for twice.

The obvious next step was to feed those tendencies into `precompute_ladder.py` as per-seat priors
so the projection of *"who will be gone when my turn comes"* stops being pure market ADP.

**Every one of those statements is true.** None of them survived being asked to predict anything.

## What was measured

Leave-one-draft-out over the four drafters with ≥3 comparable drafts. Fit `P(position | round
bucket)` on a drafter's **other** drafts, predict the held-out one. The room baseline was fitted
with the held-out drafter **entirely excluded**, so the null could not see the answer either.

| model | accuracy |
|---|---|
| personal (his other drafts) | **42.2%** |
| null (room average by round) | 34.9% |
| blend, half each | 40.6% |
| **floor — always guess WR** | **40.6%** |

The personal model beat the room average by +23 picks of 315 and looked like a finding. Against a
**one-line constant that ignores the drafter, the round and the sport**, it gained 5 picks of 315,
and the blend tied the floor exactly. Nearly the whole apparent gain was the model discovering
that WR is the most common position.

**And for the one seat the project exists to beat, it was worse than the constant:** `briggsy007`
scored **35.2%** personal against the always-WR floor's 40.6%.

## Then the specific claims failed too, and for a different reason

"Predict the position of pick N" failing does not settle "does this drafter take a QB early", so
each behavioural claim was cross-validated on its own — personal majority rule against the room
base rate, held-out drafter excluded from both:

| claim | personal | room base rate |
|---|---|---|
| takes a QB by round 4 | 47% | **65%** |
| takes a QB by round 3 | 35% | **41%** |
| waits on TE past R5 | 76% | **82%** |
| no K before round 10 | 100% | **100%** |

**The room beat the personal rule on three and tied the fourth.** `no K before round 10` is
**18 of 18 across every drafter** — a fact about fantasy football wearing an opponent profile's
clothes. And `takes a QB by round 3` is true in **9 of 18 drafts room-wide**: half the room does
it, so "Hunter takes a QB early" barely separates him from the median.

## The cause: the metric was wrong, not the idea

`round` conflates the trait with the room. Round 3 in a 12-team league and round 3 in an 8-team
league are different picks, and the sample spans 8-, 10- and 12-team leagues. Re-asking the same
question with a **league-size-invariant** metric — *which* QB off the board, not which round —
separated the drafters cleanly:

```
briggsy007     nth-QB [1, 1, 2, 2, 3, 4, 6]   median 2
Kaeperni       nth-QB [1, 3, 12]              median 3
BuschLight420  nth-QB [5]                     median 5
RMonk9         nth-QB [4, 6, 10]              median 6
MattiICE23     nth-QB [2, 7, 7, 10]           median 7
```

Cross-validated on "takes a top-3 QB off the board": **personal 76.5% (13/17) against the best
constant floor's 52.9% (9/17)**.

⚠️ **That is +4 of 17, roughly 2 standard deviations. Suggestive, not established, and it must be
quoted that way.** One trait survived out of everything tested.

⚠️ **The first version of that result was reported against the leave-one-out ROOM model at 24%,**
which made the edge look like 76 vs 24. A baseline scoring *below* chance is a broken baseline,
not a good result — with a bimodal trait and four drafters, leave-one-out makes the room predict
the opposite of whoever is held out. The honest comparison is against the best constant.

## Lesson

**A floor control is not a formality, and it must be dumber than the dumbest thing that could
work.** Insight 008 says a broken instrument returns zero and zero reads like a finding. This is
the mirror: a *working* instrument returned a real improvement over a *respectable* baseline, and
the improvement was almost entirely a fact about which position is most common. `precompute_ladder`
already had this discipline — its `--backtest` prints a floor arm on every run, and the floor is
what proved the ADP edge claim was false. The prior was nearly built without one.

**Corollary — when a per-subject model fails, check the metric before discarding the idea.** Three
of four claims here failed because `round` is not comparable across league sizes. The same data,
asked with a league-size-invariant metric, produced the one trait that survived. A failed
measurement is evidence about the measurement first and the world second.

**Corollary — descriptive and predictive are different words.** Every profile statement in
`docs/opponents.md` is a true description of what happened. Almost none of them predict. A profile
that cannot beat a constant is a summary of the past, and feeding it to the precomputer would have
put a fabricated number under a label saying it was measured — the exact failure leg (d) was
killed for.

## What was done

- **The general positional prior was not built.** `TODO.md` records the negative result so it is
  not proposed again.
- `docs/opponents.md` leads with the cross-validated metric and marks the round-based figures as
  descriptive only.
- The one surviving trait is recorded with its error bar attached and is **not** wired into
  `precompute_ladder.py`; +4 of 17 does not earn a place in the draft-day decision path yet.
