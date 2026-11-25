---
title: An editor lifted out of its flow loses the flow's later checks — a sheet's dismiss modeled on the walk's Back let a refused value into the answer
date: 2026-11-23
phase: The RightCapital mandate, gap 1 (the workbench's U8, the facts page)
modules: [src/ui/workbench/StepSheet.tsx, src/intake/flow.tsx, src/intake/questions.tsx]
tags: [hosted-editor, walk-step, continue-check, discardOnBack, dismiss, refused-value, validate-before-mutate, sanity-rules, calm-but-wrong, rosy-direction, flow-invariant, rollback, multi-edit-step, finished-work, leave-ask, ending-changed, reroute, putsBack, promise-sentence, step-sheet]
---

## Problem

U8's facts page opens a guided-walk step's own body in a sheet, so every edit goes through the walk's write path.
The spec mapped the sheet's Done to the walk's Continue and its dismiss (Escape, the backdrop) to the walk's Back,
which keeps whatever the household typed. U8's review reproduced it: type 30,000 into the monthly Social Security
benefit (the 12× misentry `pia-over-ceiling` exists to catch), see the error, see Done refuse, press Escape. The
stored benefit went from 24,000 to 360,000 a year and the recompute fired. Nothing downstream refused it
(`validateParams` checks only that the figure is finite and not negative), so the answer came back confident and
rosy. The same leak covered most sanity rules (claim window, birth year, stop age, contribution ceilings, income
ranges).

## Root Cause

The walk's Back is safe only because of something that is not in Back: the household must pass that step's Continue
again before the walk ends, so a refused value can sit in the draft but never reach the reveal. `discardOnBack` exists
on the W step alone because only W can leave the walk without passing its own Continue. Lifting the step body into a
sheet kept the step and its Back, and dropped the later Continue that made Back safe.

## Fix

`StepSheet.tsx`'s dismiss runs the step's Continue check on the store's current draft; when it would refuse, the
draft returns to the copy taken when the sheet opened (never a plain cancel, which would also drop valid,
already-committed edits on a mis-tapped backdrop). Done keeps the Continue check. Every ending then recomputes.

> **Out of date (corrected 2026-11-25):** RC13b (`87e3c807`) deleted `StepSheet.tsx` with the facts page. Its successor,
> RC13's Profile drawers, edits a buffered copy and writes the store only on Save, so a dismiss has nothing to put
> back. The current re-check (every rule's field touched, since a drawer has no later Continue) lives in
> `src/ui/screens/profile/drawers/drawerSave.ts` (`checkEdit`, `saveEdit`).

## Key Insight

**A behavior that is safe inside a flow is often safe because of a later step in that flow.** When an editor, a form
or a step is hosted somewhere new, list the flow's guarantees ("nothing refused reaches the answer", "every fact is
checked once more before the reveal") and find which step enforces each. Any guarantee enforced AFTER the lifted part
is gone in the new host unless the host re-enforces it. The tell is a mapping table in a spec ("Done = Continue,
dismiss = Back") that maps each control to its namesake and never asks what came next.

## Also Applies To

- U15's rail: Apply copies a bundle into the draft "through the same writers the facts page uses"; a writer whose
  safety came from a later check in its original surface needs that check on the rail too.
- Any second door into a fact the assumptions panel already edits (its `commitRefusing` never lets a refused value land).
- Re-hosting the money picture, the W step or the budget builder anywhere outside the walk.

## Extended (2026-11-25, Act 6's milestone 1 review round 3, b9-8): the rollback above was right for one field, and rerouting an ending made a true sentence false

The Fix above (a refused dismiss puts the draft back to its copy at open) was built and tested on U8's one-field case.
Round 2 of milestone 1's review (`e5078802`) then sent the leave ask's Go, from Back or a page change, through the same
refusal check. On a step with several edits that rollback drops finished work: add an account, then trip a combined-ceiling
refusal, and Go put the whole draft back, the new account with it. The leave ask had been written for the
old ending and still said "changes you finished stay in your plan"; Escape dropped the work with no word at all. Two
of round 3's four lenses found it.

Fixed in `31bf6d9e`: a dismiss over a refused edit stays open and shows why, as Done does, so a refused value still
reaches no answer and no finished edit is lost; and where a step's Go would put the draft back, the leave ask says so,
reading the ending's own `putsBack` (`StepSheet.tsx` exposes it to the shell; `workbenchLeaveAskPutsBack`,
`shellCeremonyPutsBack` in `copy.ts`).

> **Out of date (corrected 2026-11-25):** `StepSheet.tsx`, its `putsBack` and both copy keys went with the facts page
> at RC13b (`87e3c807`). The drawers that replaced it buffer edits until Save, and a dismiss over unsaved work asks;
> that ending lives in `src/ui/screens/profile/drawers/drawerSave.ts` and the drawer frame that calls it.

Two lessons. A fix proven on the one-field case is a hypothesis for the many-edit case ([[026]]). And when an ending
changes, grep every sentence that promises what that ending does, then read each one's words off the ending itself, so
the next reroute cannot leave a sentence behind ([[100]]: copy that names an outcome is a contract with the code that
delivers it).
