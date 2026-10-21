---
title: "A headline figure must be computed on the SAME population its own caveat names — the pay-check MEASURED bullet led with survivor shortfalls of ~$33,197 / ~$15,372 a year taken over every death row, then said only the deaths the engine draws count; 379 of those rows were deaths the engine never draws"
date: 2026-10-21
phase: D7 queue 1(a) — the working-year pay check, measurement → council
modules: [src/engine/longevity.ts, src/engine/simulate.ts, docs/backlog.md]
tags: [measurement, population, reachability, caveat, headline, calm-but-wrong, red-team, council, survivor, dev-seeds]
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
