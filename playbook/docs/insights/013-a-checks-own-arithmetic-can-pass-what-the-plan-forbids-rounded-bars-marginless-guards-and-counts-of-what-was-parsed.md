---
title: A check's own arithmetic can pass what the plan forbids; a bar on rounded percents, a no-loss guard with no margin for noise, and a count of what was parsed instead of what was asked
date: 2026-10-31
phase: the brief recall fix (the plan check, U2, the whole-file review)
modules: [projects/skills/distill-and-brief/brief/bench/score.mjs, projects/skills/distill-and-brief/brief/bench/rescore.test.mjs]
tags: [scoring, rounding, threshold, gate, guard, noise, margin, counting, silent-loss, bar-edge, mutation-testing, measurement, digest, summary, truncation, fail-open, missing-field, pending, free-text, vote-law]
---

## Problem

- The scorer rounded each run's recall to 0.1 and then subtracted. A 12-of-244 gain, 4.92 points, read as 57.0 minus 52.0, which is 5.0, and cleared the 5-point bar. This run sat far from that edge; the whole-file review found and fixed it (`ee67c08a`).
- The plan's first no-loss guard checked each lesson against the union of both old runs and required both new runs to name it. On a lesson each run names half the time, a byte-identical recipe fails that guard about 56% of the time (caught by the plan check's second round, `a77d32f6`).
- The new header print kept only the last number it was given: `007, 019, 142` printed lesson 142 under "1 of the 1 lessons asked for" (fixed in `b670ed8c`).

## Root Cause

Each check computed a number next to the one the plan named: a rounded figure instead of the share, a guard that read run noise as a loss, a count of what the parser kept instead of what the caller asked for. Each passed or failed on its own number, and its report read like the plan's.

## Fix

- The bars compare exact shares in integers (`100 * (ha*db - hb*da) >= pts * da*db`) and round only for display.
- The guard counts a loss only when both old runs named a lesson and both new runs missed it, the same two-run margin the bar uses.
- The header print counts the numbers it found against the numbers it was asked for.
- Tests at each edge: exactly 10 points of recall and of precision, one unit under, 4.92 against 5.33 points, a guard where one run of each arm differs, and a re-score of the committed results. All 12 planted scorer mutants fail them (an `&&` turned `||`, worse and better runs swapped, a guard's `every` turned `some`, a bar moved by one point).

## Key Insight

Test every gate at its edge, in the plan's own words: exactly on the bar, one unit under, a byte-identical candidate under run-to-run noise, and an input the parser drops part of. A gate only ever exercised far from its edge has never been tested. Round for the reader, never for the comparison, and count against what was asked, not against what survived parsing.

## Also Applies To

- CI thresholds on coverage or speed computed from rounded summaries.
- Flaky-test guards that fail on any single miss.
- Any "N of N processed" line from a parser that can drop input.

## Extended (2026-11-12): a summary or a count that an action is made from fails open when it works the answer out again, cuts it short, or reads what it could not see as clean

Six cases from the plan step's own skill (`projects/skills/ultramode-plan`):
- **Working the verdict out again.** The first run digest called a fix "rework" whenever one real voter dissented, while the vote law (`lib/vote-law.mjs`'s `fixVerdict`) applies a fix on a majority. 12 of 76 real entries read rework where the law said apply, and one dissenter's fix was shown as the fold (5 of 8 review lenses). The digest now prints the law's own call and shows the dissent beside it (`6a5ab0fe`).
- **Cutting the text an action is made from.** The digest cut every field at 300 characters, and all 29 confirmed deepen amendments ran past it, so a fold made from the digest would have dropped their tails. It now prints the fold text whole (the schema already caps it) and cuts only what is only read.
- **Skipping an input without saying so.** `grepList` moved any old value under 3 characters to a refused list that `apply` never printed, so a retired `U7` or a changed `5%`, the very examples `SKILL.md` gave, read as "no drift" (6 of 8 lenses). It now searches such a value as a whole word and prints what it searched (`lib/fold.mjs`, `olds.wholeWord`).
- **A missing field read as the clean value.** The receipt read an omitted open count as 0 and wrote "checked"; `nextStep` read an omitted send-back count as 0 and disarmed the loop guard. Every field a reader acts on is now required.
- **Counting only the settled bucket.** U5's check counted `p0p1` and each class from confirmed findings alone, so a P0 whose three verifiers all died read 0 open and its class "nothing found" (3 of 5 lenses, in 5 findings, all 14 of their votes calling it real). The pending ids now come back beside the count, in a form the consumer refuses until a trace settles them.
- **A failure carried in free text.** Research read the outside researchers' failure from an exact prefix of a summary line, so bold, a dash or a lead-in all read clean (shown in the stub). It is now a typed field read fail-closed, as the deepen's `outside_ran` already was; the text stays only as the reason.

What it adds: the same root cause as above, one step further. A tool that someone acts on must print the system's own answer, not one it worked out again; cut text only for the reader, never the text an action is made from (the same rule as rounding only for the reader); and treat anything it could not see, skipped, or was not told as unknown, never as the clean answer.
