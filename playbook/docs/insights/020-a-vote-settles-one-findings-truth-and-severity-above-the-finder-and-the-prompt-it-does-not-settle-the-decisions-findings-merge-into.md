---
title: A vote settles one finding's truth and severity, above the finder and the prompt; it does not settle the decisions many confirmed findings merge into
date: 2026-11-12
phase: the plan step's own skill (U4; the remaining-units update, 2026-11-11; the Back Nine workbench plan's check)
modules: [projects/archive/skills/ultramode-plan/lib/vote-law.mjs, projects/archive/skills/ultramode-plan/lib/prompts.mjs]
tags: [vote, severity, refuters, verifiers, finder, prompt-scope, gate, premise-seat, decisions, critic, review, plans]
---

*The `ultramode-plan` code this lesson came from is archived at `projects/archive/skills/ultramode-plan/` (2026-11-12); the lesson stands on its own.*

## Problem

- **The finder's severity.** In the Back Nine workbench check, the test-vacuity seat rated 4 findings P0 and 16 P1. Two refuters confirmed 24 of its 30 as real and put every one at P2, since a later review would catch each before a costly run.
- **The prompt's scope.** U4's deepen premise seat kept the check's whole severity ladder, while KTD5 ends the deepen on any confirmed premise finding. One vote confirming a P3 would have rewritten the plan (R4-26, the round's highest, voted P1/P1/P2).
- **Past the findings.** In the remaining-units update (2026-11-11), two refuters per finding confirmed 119 of 123 and rejected none. A critic set on the merged decisions then found 7 rulings that would have built the wrong thing: a copy check that failed every honest run, a resume rule keyed to the wrong case, and a judging panel whose own caps came to three times its priced size.

## Root Cause

- A finder sees one failure alone and does not ask what else would catch it, so its severity runs high.
- A prompt's scope is a request; the seat may not honor it. A gate that acts on the seat's output has to read what the voters said, not what the prompt asked for.
- A refuter judges one finding against the source. Nobody had judged the decisions the merge produced, and a set of true findings can merge into a wrong ruling.

## Fix

- Each verdict carries the voters' corrected severities (`votedSeverity` in `lib/vote-law.mjs`).
- The deepen's premise seat is asked for a P0 or P1 only, puts lesser gaps in its residual risks, and is never told what its finding sets off. Since "the prompt is only a request", U5 gates on the voted severity too (`lib/prompts.mjs`, KTD5's as-built note).
- After the remaining-units update's findings were merged, a critic pass attacked the decisions as a set.

## Key Insight

Treat a finder's severity and a prompt's scope as claims. Set severity by asking "what else would catch it before it costs us?", and gate every action on the voters' answer. Once verified findings are merged into decisions, attack the decisions too: verified parts do not make a verified whole.

## Also Applies To

- Bug triage where the reporter's priority drives the response.
- Automated checks that trust a model's self-rated confidence.
- Design reviews that accept every comment one by one and never re-read the resulting design.
