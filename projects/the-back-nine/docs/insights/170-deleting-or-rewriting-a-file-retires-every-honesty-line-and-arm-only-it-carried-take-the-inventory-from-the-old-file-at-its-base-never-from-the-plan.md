---
title: Deleting or rewriting a file retires every honesty line and test arm only it carried — five shipped lines lost their only reader when Act 6 deleted the old answer page, and a builder trimming a 7,004-line spec dropped arms the port list named; take the inventory from the old file at its base commit, never from the plan
date: 2026-11-25
phase: Act 6, the RightCapital clone (RC4a, b9-5; milestone 1's whole-file review, b9-7, 2026-11-24)
modules: [docs/plans/6-rightcapital-ui-plan.md, src/ui/copy.ts, e2e/vertical-fit.spec.ts, e2e/rc-screens.spec.ts]
tags: [deletion, rewrite, port, lost-line, honesty-line, disclosure-map, copy-keys, no-reader, dead-code, test-retirement, describe-titles, port-list, inventory-from-base, calm-but-wrong, datemixed, clone]
---

## Problem

Two kinds of loss in the same act, both green on every check.

**Lost lines.** RC4a to RC7 deleted `FuckOffDate.tsx`, `ConfidenceStatement.tsx`, `SurvivorReadout.tsx` and
`WhatIfPage.tsx`. Milestone 1's whole-file review (`wf_cc34572c-165`) found five shipped honesty lines left with no
reader: the fan's track note, the aged premise's fresh arm, `floorUnread`, the survivor income step-down, and the floor
ring's essentials-only words. Two were calm-but-wrong P1s on `?seed=datemixed`: essentials-only odds printed as "your
plan". The five came back in `fd1602be` and `e65d659f`. The plan's disclosure map (section 4.0 of
`docs/plans/6-rightcapital-ui-plan.md`: "every honesty line already shipped gets a slot on the new screens") listed
none of the five.

**Lost arms.** RC4a's builder rewrote `e2e/vertical-fit.spec.ts` (7,004 lines at the base) for the new screens. Its
first cut dropped the vault-return gates, the date order contract, the spend lane and more, all on the port list in
the plan's section 5.2. Porting them caught four real defects: the split household (`budget`) over one frame, the ring's worded centre
spilling at the ceiling, and two lines (the spend figure and the re-figuring line) shoving the page as they landed
(`7f56682e`).

## Root Cause

A file's obligations are what it does, and the plan is someone's account of what it does. The disclosure map was
written from the plan, so it held the lines the plan knew about; the lost five lived only in the deleted components,
where no one writing from the plan would look. The spec's arms likewise each guarded something a past unit had paid
for. When the file goes, those obligations go with it, and nothing reds: an unread copy key still typechecks, and
a deleted arm cannot fail.

## Fix

The lost lines were restored to the new screens and the map gained six rows (`fd1602be`); the dropped arms were
ported to `e2e/rc-screens.spec.ts`. The checks that would have caught both:

- **Before deleting a component:** list every copy key it read at its base (`git show <base>:<file>`, grep `copy.`
  and `slots.`), then grep each key for a reader after the deletion. A key whose reader is gone is a lost line until
  its text is proven to say nothing the household needs.
- **Before accepting a spec rewrite:** diff the base's `test.describe` titles against the new arms and against the
  plan's port list, and account for each one dropped by name (ported, re-pointed, or retired with its surface and
  said so).

## Key Insight

Take a deletion's inventory from the deleted thing itself, at its base commit, never from the plan that describes it.
A copy key with no reader looks exactly like dead code, and a cleanup will remove it as such (RC4b deleted 41 copy keys
with no reader): grep first, and treat an honesty key with no reader as a lost line, never dead code. A trimmed test
file reads as tidier, and every arm it drops is a guard that will never fail again.

## Also Applies To

- Every remaining clone unit that deletes an old surface (plan section 5.1's list), and RC21's clean-up.
- [[086]]: a removed or split copy key orphans renderers and e2e reads; this is the same sweep run from the deleted
  file outward.
- [[018]]: an amendment's blast radius is the consumers of the old premise; a deletion's is the readers of the old file.
- [[158]]: a part lifted out of its flow loses the flow's later checks; a part deleted from it loses the lines only it
  printed.
