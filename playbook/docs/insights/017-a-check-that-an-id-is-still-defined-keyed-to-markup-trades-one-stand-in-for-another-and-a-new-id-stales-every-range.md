---
title: A check that an ID is still defined, keyed to markup, trades one stand-in for another; model which line defines the ID, test it on real plans, and grep for the old highest ID after a fold adds one
date: 2026-11-12
phase: the plan step's own skill (ultramode-plan U2's fold check; the Back Nine workbench plan's check)
modules: [projects/skills/ultramode-plan/lib/fold.mjs]
tags: [fold-check, id-check, definition, markup, stand-in, index-row, mermaid, headings, tiers, real-plans, ranges, drift-grep, plans]
---

## Problem

- **The ID opens a line.** U2's first fold check passed a whole dropped unit because the units table's `| U5 |` row still opened a line, and a Mermaid `R1 -->` kept a deleted requirement "defined" (5 of 9 lenses found it).
- **Every kind of line it had.** The next version required each kind of line an ID had before the fold. A twin of the same kind stood in for a lost definition, and three legitimate edits failed.
- **As many lines of its strongest tier.** The third version ranked kinds of line. A topical heading, `### R13 splits`, outranked R13's own list item. Rounds 2 and 3 found these seams on Back Nine and Burned plans, not on the fixtures.
- **A range ending at the old last ID.** The Back Nine workbench check's round-1 fold added U24. "Listing U1 to U23" in U1's approach and three dependency rows stayed wrong until round 2's seats named them in their overflow.

## Root Cause

- Every markup rule is a guess at which line defines an ID, and each guess has a stand-in: an index row, a diagram edge, a twin of the same kind, a heading that only mentions the ID. Each round's fix opened the next round's seam.
- A range like "U1 to U23" holds the last ID without naming any retired phrase, so a drift grep that searches each retired phrase cannot see it.

## Fix

- The check keys each ID by the kinds of line that define it (heading, list item, table row), skips fenced blocks, and fails when a kind is lost; the tier rule was then tested on the repo's real plans (`lib/fold.mjs`).
- For ranges, no tool change: after a fold adds an ID, grep for the old highest one.

## Key Insight

A definition check's rule is a claim about which line is the definition. Test it on real documents, not only fixtures: the stand-ins live in real plans. And every ID a fold adds makes each range that ends at the old last ID wrong, where no grep of retired text will find it.

## Also Applies To

- Link checkers and "is this symbol still defined" lints that match on syntax.
- Renumbering requirements, steps or units in any spec.
- Docs that say "steps 1 to N" or "all N endpoints".
