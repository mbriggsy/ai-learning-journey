---
title: "A headline figure must be computed on the SAME population its own caveat names — the pay-check MEASURED bullet led with survivor shortfalls of ~$33,197 / ~$15,372 a year taken over every death row, then said only the deaths the engine draws count; 379 of those rows were deaths the engine never draws"
date: 2026-10-21
phase: D7 queue 1(a) — the working-year pay check, measurement → council
modules: [src/engine/longevity.ts, src/engine/simulate.ts, docs/backlog.md]
tags: [measurement, population, reachability, caveat, headline, calm-but-wrong, red-team, council, survivor, dev-seeds, directional-caveat, unit, claim-years, path-years, re-derive, intake-gates, carried, window, time-axis]
---

## Problem

The pay-check measurement's skeptic walked every single-death timeline on the eight date seeds and wrote 3,080 rows, each
marked `reachable` or not. The pilot condensed it into the register's MEASURED bullet: "`dip` comes up short by as much as
~$33,197 a year and `datemixed` by as much as ~$15,372 … Only the deaths the engine actually draws count: none before 65.
Within those, it is about 0.8–1.5 % of paths." The same figures went to Briggsy in chat as "go short by up to $33,000 a
year". Every sentence was individually defensible; the bullet as a whole was false. The council's red team re-read the
rows file: on reachable rows `datemixed` is never short and `dip` has ONE short path-year (~0.8 %, −$14,474), all of it a
retirement-only budget line charged in a working year. The $33,197 and $15,372 exist only on deaths the engine cannot
draw (271 + 108 rows). Every opening seat of the council had reasoned from the false headline.

## Root Cause

The magnitude and the caveat were computed over DIFFERENT populations: the max was taken over all rows, the qualifier
("only reachable deaths count") was applied in prose afterwards, and the one sentence that did both ("within those, about
0.8–1.5 %") quoted a probability without re-computing the magnitude beside it. A reader binds the number to the caveat
that follows it, so the caveat silently promotes an unreachable maximum to a reachable one. The skeptic's own write-up had
the split right; the pilot's summary collapsed it while compressing.

## Fix

The bullet was rewritten from the rows file (`survivor-rows.json`, filtered on `reachable`): reachable counts and
magnitudes first, the unreachable counts named as such, the earnings-test lower bound as its own labelled case. The chair
and the pilot each re-counted independently before the correction landed (council `wf_2247c0df-73b`; `docs/council-log.md`
2026-10-21). The memory note carrying the same figure was corrected in the same pass.

## Key Insight

**Every figure in a sentence must be computed on the population that sentence's caveat names — filter FIRST, then take
the max, the mean or the count.** When a summary pairs a magnitude with a scope qualifier ("only X counts", "within the
draws the engine makes", "on the seeds we ship"), recompute the magnitude under the qualifier; never let prose do the
filtering. The tell: a sentence whose number came from one query and whose qualifier came from reading the column next
to it.

## Also Applies To

- Every measurement bullet the register carries (MEASURED / Seen blocks): reach counts, worst-case dollars, "N of 10".
- Probability-plus-magnitude pairs anywhere ("~2 of 10 futures, up to $X") — both halves on the same filter.
- Council and Caddie briefs: an elder reasons from the brief's headline, so a mis-filtered brief poisons every seat.
- [[135]] — write the prediction down before measuring; this is the same discipline one step later, at the summary.

## Extended (2026-11-23): the population includes the caveat's direction, the count's unit, every gate before the engine, and the window

Four later cases, each a figure whose population was named wrong or not at all:
- **A directional caveat is a claim about the population too.** "Low path counts under-count this, read it as a
  floor" sat beside the demotion-frequency probe's 15 % at 400 paths. It was backwards: 11 % at 1,600. One run at 4×
  the paths took five minutes and inverted the conclusion. A caveat worth writing beside a number is worth one more run.
- **A count needs its unit, and a verifier who re-derives it.** The pilot's U11 write-up said K5 reached "13 more
  households"; the truth was 25 claim years. Three more figures had no key set or the wrong unit (360,000 readings of
  36,000 path-years). Every tool was green. Only a verifier re-deriving each count from the raw output caught them.
- **Every gate between the household and the engine filters the population, not just the engine's own.** U1's first
  draft gave `datecoststale` a credit stream and a crown prediction from the engine's carry rule (asked = S ≥ $1). But
  that seed's W is stale, and R7 carries nothing on a stale W, so the intake never hands the engine that credit. The
  verifier caught it, and the stream tool then recorded `carried` per seed.
- **A range quoted beside a window must be read on that window.** The register said `date`'s left over runs
  "$16,985 → $59,986 across 2026–2034". The $59,986 is 2035's; across 2026–2034 the left over peaks at $37,223. U1
  measured every year and corrected both lines.

**Rule:** name a figure's population on every axis it has (which households, through which gates, in which unit,
over which years), and have someone re-derive the count from raw output before it leaves the record. A direction
written beside a number ("read it as a floor") is a claim, so measure it or drop it.
