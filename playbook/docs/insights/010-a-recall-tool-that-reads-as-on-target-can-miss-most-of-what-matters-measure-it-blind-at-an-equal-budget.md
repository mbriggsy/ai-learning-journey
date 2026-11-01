---
title: A recall tool that reads as on target can miss most of what matters, and a gain bought by naming more is not a better search; measure it with blind judges at an equal budget
date: 2026-10-31
phase: the brief recall fix (the benchmark, then the U6 re-score)
modules: [projects/skills/distill-and-brief/brief/SKILL.md, projects/skills/distill-and-brief/brief/bench/score.mjs, projects/skills/distill-and-brief/brief/results/recall-rescore-2026-10-31.json]
tags: [measurement, recall, precision, blind-judges, benchmark, equal-budget, top-k, brief, applies-when, index-line, pre-set-bar, in-sample]
---

## Problem

- Brief's picks read as on target in every session that used them. A blind benchmark of its 17 briefs from 10-19 to 10-31 found that it named 87 of the 222 Back Nine lessons the judges held relevant, and 73 of the 140 misses across all projects were traps the work then hit (`projects/skills/distill-and-brief/brief/results/recall-benchmark-2026-10-31.json`).
- The fix scored every match, read 10 lessons for a big job instead of 5, and added a one-line `applies_when` header to each lesson, read by meaning. Re-scored on frozen copies (90 blind runs, 17 blind judges), its recall rose 18.4 points: 52.0% and 56.6%, against 32.4% and 33.6%.
- It did not land. Its precision fell 16.8 points (57.7% and 62.7%, against 71.8% and 74.5%), past the 10 the bar allowed. The `applies_when` lines added -2.0 points. On a 5-lesson folder it dropped a relevant lesson that the old recipe found in both runs.

## Root Cause

- Reading the picks checks precision, never recall. Each pick looks plausible, and nobody sees what was not named.
- The candidate named 20 lessons where the old recipe named 10. At an equal 10 names, all three arms found 32.4% to 36.1%. The extra 10 names were 40.9% to 47.3% on target, against 71.8% to 80.0% for the first 10 in every arm. The whole recall gain came from output length, not from better ranking.
- The 197 `applies_when` lines, written blind from each lesson's own git blob, added nothing over the titles. The model's meaning pass over a title already reached what a model-written summary line said; the -2.0 sits inside the 4.5-point spread between two runs of the same recipe.

## Fix

- Recall measured by blind judges: each reads every lesson as it stood at the brief's commit and lists the ones that bear on the work, and a name outside their sets is judged blind the same way (the plan's KTD9).
- The bar was written into the plan before any run: a recall gain, a precision condition, and a small-corpus no-loss guard, each comparing the candidate's worse run against the other arm's better run. Recall alone would have landed it.
- Verdict: land nothing (`e27d6d35`). The live brief stays the measured old recipe, and `brief/README.md` states what it finds.

## Key Insight

1. Measure a recall tool by what blind judges say it missed, never by how its picks read.
2. Compare at an equal budget before crediting a recall gain. A tool that names twice as many finds more, and that is a length decision with a precision price the reader pays.
3. Before building an index layer (summaries, tags, header lines), measure the reader on the bare titles first. Here a meaning pass over titles matched a written summary line.
4. Put precision and a no-loss guard into the pre-set bar beside recall, so a gain bought by noise cannot land on recall alone.

## Also Applies To

- Search, retrieval or RAG changes judged by "the results look relevant".
- Any top-k change: raising k raises recall, so compare at the old k.
- Review lenses or test selectors scored by what they found, with no count of what they missed.
