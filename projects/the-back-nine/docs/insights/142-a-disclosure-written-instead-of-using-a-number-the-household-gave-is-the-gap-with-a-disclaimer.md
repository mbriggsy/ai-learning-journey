---
title: "A disclosure written INSTEAD of using a number the household already gave is the gap with a disclaimer stapled on — the assumptions panel grew \"the tool doesn't X\" rows while the intake held the inputs, and the honest remedy is use it / ask for it / a plain can't-be-known note (D7)"
date: 2026-10-21
phase: D7 — the off-course discussion and the audit
modules: [src/ui/copy.ts, src/intake/AssumptionPanel.tsx, src/engine/simulate.ts, src/intake/intakeMap.ts, docs/product.md]
tags: [D7, disclosure, calm-but-wrong, omissions, product-direction, plain-words, audit, intake, cardinal-rule]
---

## Problem

The working-year tax row shipped "It doesn't check that your pay really covers all of that, so if it falls short, this
answer looks better than it really is" — while the intake held both the pay and the spending. The next proposal was a
row explaining that the tool never taxes dividends yearly — while it held the brokerage balance. Briggsy: "why does the
tool 'assume' anything??? Doesn't the tool have all the user inputs?" and "I feel like I need a PHD or lawyer with me to
read our own verbiage." The D7 audit (`wf_f54446ec-1a9`) then found ~155 gaps between what the household gives and what
the engine uses; 48 were on no register entry, and many were SILENT (no 10% charge before 59½, no fees, no deaths
before 65, income above spending discarded).

## Root Cause

"Calm-but-wrong is the sin" had been operationalized as "disclose every way we might be wrong" instead of "stop being
wrong." Per gap, a sentence is always cheaper than an engine change, so the sentence won every local decision; each one
then cost Caddie walks, councils and a word call on him, so the overhead compounded and the copy turned into a tax brief.
Nobody audited the inputs against their consumers as a class, so the silent shortcuts — the ones with no sentence at
all — were invisible to a process that only reviewed sentences.

## Fix

Locked decision D7 (`docs/product.md §4`, ruled 2026-10-21): a number the household gave is USED; a number the engine
needs and lacks is ASKED for in intake; only the truly unknowable (markets, lifespans, future law) gets a plain
can't-be-known line. A gap is a build item, never a sentence. A note survives only as a stopgap while its build is open:
pulling it first would leave the answer quietly rosy. The audit's 48 new gaps were filed measure-first, and the queue was
re-ranked under D7.

## Key Insight

**When a disclosure says "the tool doesn't X", first ask whether the tool HAS what X needs — if it does, the disclosure is
the defect.** Honesty is the answer being right, not a list of the ways it isn't. Audit by inputs, not by sentences:
trace every field the household enters to its consumer, and every number the engine assumes to a question that could
have asked it. A growing omissions list is a symptom to measure, never a feature to polish.

## Also Applies To

- Every `Not counted here:` list and every methodology row — each item is use / ask / unknowable, never "disclosed".
- Code comments that call a shortcut "disclosed" — check the copy actually says it (two such comments were false).
- D6's OUT-but-disclosed members (NIIT, unpriced states) — re-opened under D7, never grandfathered.
- [[074]] — a disclosure built on metadata must grep its consumer; this is the same check aimed at the household's own inputs.
