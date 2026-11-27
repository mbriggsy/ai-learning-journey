---
title: "A mark that vouches for a fact must live in the component that sees the fact END — the W period's \"unit answered\" disarm lived in the host while the unit lived in the question's own state, and three exits left it vouching for a figure it never saw (84,000 ran as $1,008,000, unasked); a gated step's ungated Back is the same hole"
date: 2026-10-31
phase: the pay check's whole-file review (Phase C, b9-9) — ruling 38; Phase B's review (b9-3) — `discardOnBack`
modules: [src/intake/WorkingCostQuestion.tsx, src/intake/questions.tsx, src/intake/flow.tsx, src/intake/sanity.ts, src/intake/AssumptionPanel.tsx]
tags: [state-ownership, lifecycle, provenance, disarm, touched, period-rule, gated-step, back-exit, mount, single-home, unit-tap, convert-vs-reread, keep-stamp, round-trip, reversible-control, receipt, writer-census, periodGateTrips, floor, budget-escape, tray-total, seeded-answer, saved-record, question-key, edit-walk, inherited-ira, refusal-answer]
---

## Problem

The W question takes a yearly working cost typed per month or per year, and the period rule refuses a big figure
until its unit is tapped (a monthly figure read as yearly runs 12× low). The rule's disarm — "this unit was answered" —
was written by the HOSTS: the flow's `SanityProvenance` W flag, read once at mount, and the panel's Keep door. The
review found it outliving the unit it vouched for three ways: Keep marked the period but left the face at month, so
Keep → yes or clear → a new figure ran 84,000 as $1,008,000, unasked; the mount flag stayed true after the entered W
was cleared (clear → Back → Continue → the same); and a mount over a yearly entered W, replaced by a yes, opened the
next figure under an UNTAPPED year. Three lenses, three paths, one defect.

Phase B's review (b9-3) had found its sibling: four lenses saw that Back is the one ungated way out of a gated step,
so a value the step's Continue refuses ($0, an unconfirmed period) left through Back and met a route change or a
remount's provenance downstream.

## Root Cause

One fact had two homes. The unit lived in the face's own state; the mark that vouched for it lived in components that
could see the moments it became TRUE (a mount, a Keep tap) but not the moments it stopped being true (the figure
cleared, a yes replacing it, the unit falling back to month on remount). A mark written by a component that cannot
see the fact's death outlives it. Back is the same shape at the step level: the step's validity was owned by its
Continue gate, and the exit nobody gated carried the step's leavings past it.

## Fix

Ruling 38 (`b9-phaseb\DECISIONS.md`): `SanityProvenance` lost its W flag; the face sets AND drops the disarm through
`onPeriodTap` / `onPeriodReset` (`WorkingCostQuestion.tsx`'s "ONE HOME, THIS FACE" block) — marked at mount over an
entered W (that figure cleared the gate before it could commit), dropped at mount over none, dropped with the unit
back to month when the draft's W stops being `entered` and no period was tapped on this face; a tap stands until the
face unmounts. Eight new arms; 9 of 9 planted mutants killed. For Back: `discardOnBack` (`flow.tsx`) — if the step's
own field rules fire on the current draft, the step's discard clears the field before leaving.

## Key Insight

**Before adding a second channel for one fact, ask which component knows the moment it stops being true — and put
the whole lifecycle, set AND drop, there.** Other components may read the mark; only its owner writes it. The tells:
a flag "read once at mount", a handler that marks state another component holds, a mark with a setter and no
dropper. And a gated step owns what it leaves behind on EVERY exit: list them (Continue, Back, route change, remount,
the panel's doors) before trusting the one with the gate.

## Also Applies To

- Every "confirmed" / "touched" / "kept" mark beside a value it vouches for: the spend period, the quote's yes, a
  stale note's dismissal.
- [[112]] — a leave-page guard reading one store; the same enumerate-every-buffer move for exits.
- [[058]] — an invariant with many writers is not closed by fencing one; here the writers were hosts.
- [[022]] — provenance is per figure; a figure's provenance dies with the figure.

## Extended (2026-11-23): who gave the digits decides what a unit tap does, and a mark must survive the control's round trip

Two more ways to the same wrong figure, both on the W row's period control.

**A unit tap on a figure the household never typed must convert, not re-read.** The period control repairs a 12× typo
by re-reading the digits on screen in the new unit: right when the household typed them. On a KEPT $84,000 (digits the
tool put there) the same re-read made it $1,008,000, and the result read as fresh, so the stale gate let it through
(the pay check's fix round, b9-1). The source of the digits on screen decides which part a unit tap keeps: typed digits
keep their digits, a kept or quoted figure keeps its dollars.

**A mark's fate rule must survive the control's round trip, not one tap.** U5's KTD10 dropped the Keep stamp on a period
change ("taken over a different figure"), and every test tapped once. "Each month" then "each year" restored the same
$84,000 unstamped, so a stale kept figure came back as typed, fresh forever, with no digit typed. Four of five U5 review
lenses found it (b9-2). For a reversible control beside a provenance mark, test the round trip: the mark comes back with
the figure. [[058]]'s 2026-11-23 extension has the sibling: every writer that rebuilds the object a stamp rides on can
drop the stamp.

## Extended (2026-11-26): a receipt is only as true as the census of every road to the state it reads

Act 6 moved the spending figure's 12× check into the Living expenses drawer and gave it a receipt: "this plan's unit was
already answered, so don't ask again". Three rounds of milestone 3's review each found the receipt vouching for a unit
nobody answered, and each fix narrowed what the receipt reads.

1. **A flag from the flow's end** (RC14, `drawerSave.ts`'s header): "setup's Complete answered the period". Complete
   passes with no spending figure while a budget governs, so a household that set up on a budget, then typed 96,000
   under the pre-checked month, saved $1,152,000 a year. Round 1 keyed it on the plan at open instead: a one-figure
   amount.
2. **A figure being present** (round 2, `4bad8f72`): a figure under the gate's $8,000 floor in its shown unit was never
   asked, so 6,500 a month at open, then 96,000, still saved $1,152,000. Round 2 keyed the receipt on the gate itself
   tripping on the plan at open (`periodGateTrips` in `src/intake/sanity.ts`, the rule's own predicate, one probe shared
   with IntakeApp's Complete).
3. **"Every road here passed the gate"** (round 3, `c82ae5cd`, found by two seats independently): two writers put a
   yearly figure in the field with no gate at all, the worksheet's escape to one figure (`withoutBudget` keeps the
   total) and the tray's "Spending, dollars a year" Apply. Both left the stored unit at the untapped default month, so
   the next open read $120,000 as 10,000 a month, the gate tripped, and the receipt vouched for it. The fix: each writer
   stores the unit its figure came in ("Each year"), which makes the receipt's premise true.

**What it adds.** A receipt that reads state ("this draft could only exist if the gate passed") is a claim about every
writer of that state, not about the gate. Before trusting one, grep every writer of the guarded field
(`annualSpendingReal` here: the walk, the drawer, the budget's reconcile and escape, the tray's arms, the codec, the dev
seeds) and check that each one either passes the gate or writes the field in a form the gate's premise covers. A new
writer added later breaks the receipt silently, so write the census into the receipt's docblock, where the next writer's
author will read it (`periodGateTrips` names its two gateless roads).

## Extended (2026-11-27, b9-8's U13 drawer `3ee355a1`): a pre-filled answer vouches only for the question as it was asked when it was given

Editing a saved inherited IRA seeds the drawer's refusal-only answers from the stored record, so the household is not
asked again what it already answered. An unkeyed "yes, every required withdrawal was taken" would have stayed checked
after an edit to the death year moved the question onto years the answer never covered, and the account would have run
as served on an answer nobody gave: rosy. The answer is a mark vouching for a fact, and the fact was the question's
words at the time.

Fix: each answer carries its question's key (the heir, the years its words name, the owner's four date answers). The
walk counts an answer only under the same key, and a seed is written only for a question the stored facts' own walk
asks. The witnesses are the last `describe` in `src/intake/__tests__/inheritedIraQuestions.test.ts`.

What it adds: a seeded answer is a mark written by a past walk. Key it to everything that set the question's words,
so a later edit that changes the question drops the answer instead of carrying it.
