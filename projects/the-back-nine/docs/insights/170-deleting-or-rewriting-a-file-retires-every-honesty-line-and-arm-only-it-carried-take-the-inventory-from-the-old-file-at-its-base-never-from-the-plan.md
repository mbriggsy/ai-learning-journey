---
title: Deleting or rewriting a file retires every honesty line and test arm only it carried — five shipped lines lost their only reader when Act 6 deleted the old answer page, and a builder trimming a 7,004-line spec dropped arms the port list named; take the inventory from the old file at its base commit, never from the plan
date: 2026-11-25
phase: Act 6, the RightCapital clone (RC4a, b9-5; milestone 1's whole-file review, b9-7, 2026-11-24)
modules: [docs/plans/6-rightcapital-ui-plan.md, src/ui/copy.ts, e2e/vertical-fit.spec.ts, e2e/rc-screens.spec.ts]
tags: [deletion, rewrite, port, lost-line, honesty-line, disclosure-map, copy-keys, no-reader, dead-code, test-retirement, describe-titles, port-list, inventory-from-base, calm-but-wrong, datemixed, clone, gate, honesty-gate, conditions, early-return, suppression, inversion, runner-up, runnerUpVizFor, ranked-list, no-dollar, taxRunsGate, port-before-delete, ported-tests, stale-W-picture, second-reader]
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

## Extended (2026-11-25): a rewrite retires an honesty gate as easily as a line, and an inventory of lines cannot see it

**The case (RC8, `f0a89a604`; found by milestone 2's whole-file review, fixed in `a883c5e40`).** At RC8's base
(`b69c28483`), `runnerUpVizFor` in `src/ui/recommendationView.ts` built the runner-up's two-bar chart. Its docstring
called it "THE HONESTY GATE": it returned `undefined` when the winner did not display ahead of the runner-up at seed B
(the winner is crowned on seed A, so a near-tie can print the runner-up ahead), when the gap formatted to `'0'`, in
no-change mode, and off leave-more. Never a picture contradicting the ranking. A test pinned it ("the A-decides /
B-displays INVERSION drops the picture (never a chart contradicting the ranking); the hedged TEXT is kept").

RC8 deleted `RecommendationViz.tsx`, the chart's renderer, and the function, the `viz` field on
`RecommendedView.runnerUp` and that test went with it. RC8 took its inventory at the base, as this insight says, and
ported every honesty line, the runner-up's why (`recRunnerUpWhy`) among them. The words survived; the condition did
not. The plan's RC8 section then asked the ranked list for each row's seed-B figure, shaded by value, best darkest. So
the list printed a runner-up figure better than "Recommended", shaded darker, with no reason: the one thing the gate
existed to refuse. It is reachable on ordinary runs, because the ranking reads the odds first and then the goal's figure
on seed A, shrunk (`select.ts`), while the rows print seed-B means. `recRunnerUpAheadHere`'s docstring in `src/ui/copy.ts` records one on
the `borderline` dev seed: the winner leads by 9 futures in 16,000 while the runner-up leaves about $10,000 more.

A second gate in the same commit came through narrower instead of gone. The base withheld the winner-vs-baseline
picture across the whole no-dollar register (`noDollar` in `recommendedView`: no change, a sub-tenth collapse, a seed-B
inversion, or a delta that formats to $0). The plan carried that rule to Summary's bars by name. RC8's Comparison and
Details, two new pictures of the same pair, ran on `!taxPayload.noChange` alone (`src/ui/shell/Shell.tsx`), so on the
other three cases they charted "the recommended strategy" where the Strategies tab says nothing beats your plan.

**Fix.** `rankedList` in `src/ui/screens/tax/strategiesView.ts` gives a runner-up row whose figure beats the winner's,
in the goal's direction, a `note` (`slots.recRunnerUpAheadHere`) saying why it still ranks second, in a reason true on
every crown; `strategiesView.test.ts` pins both goals and the usual order with no note. A list prints every row's
figure, so the old answer (draw nothing) was not open to it, and the gate's rule had to be kept in words.
`taxRunsGate` in `src/ui/screens/tax/taxRunsView.ts` runs Comparison and Details only beside an active Winner card and
otherwise shows the Strategies tab's own words.

**What it adds.** Both checks above inventory text: copy keys and test titles. A gate is neither. It is a condition,
often a bare `return undefined`, and this one lived in a file that stayed (`recommendationView.ts`), removed only
because its consumer went. Its test arm was retired with its surface, which was right for the chart, while the rule it
pinned still applied to the new list. A third check:

- **Before deleting a picture or the code that feeds it:** list its conditions at the base beside its words: every
  branch that draws nothing, drops a figure or narrows a claim, and when (the docstrings name most of them: "never",
  "only when", "suppressed"). Follow the deleted component's producers into the files that stay. For each condition,
  find every place the new screens show the same pair or the same figure, in any form, and carry the condition there,
  or say in words what the old surface hid. A test arm about to be retired with its surface is the cue to ask this.

A gate belongs to the claim it protects (this pair, this figure), not to the picture it was first written on. Carry it
by name to one new picture, as the plan did for Summary, and every other new picture of the same pair goes ungated.

## Extended (2026-11-26): port the old surface's tests onto its replacement before deleting them; the gate case, seen again

**Port first, delete second** (RC14, `c43d7a50`). RC14 deleted the walk; before the deletion its unit tests were ported
onto RC13's drawers, which had replaced the walk's steps a unit earlier. The port found five regressions RC13 had shipped
green, one calm-but-wrong: a through-year typed "2.5" saved as a lifelong budget line under its own error, because a
drawer's Save ran past a box holding text it had refused. The old tests held laws the new host never re-implemented, and
nothing else would have read them again. A ported test left red is a finding about the replacement, never a test to
adjust.

**The gate case above, seen again** (milestone 3's review round 1, `4be1d777`). The facts page's "no money picture over a
stale W" gate went to one of the two new pictures of the same ledger (the W drawer withholds its picture) and not the
other: Goals' money picture card printed "Left over in 2026: $16,985" where year 0 at today's spending ran $4,015 short.
Every copy key survived. Inventory every condition on a deleted surface, then grep every new reader of the data it
guarded, not only the reader the plan named.
