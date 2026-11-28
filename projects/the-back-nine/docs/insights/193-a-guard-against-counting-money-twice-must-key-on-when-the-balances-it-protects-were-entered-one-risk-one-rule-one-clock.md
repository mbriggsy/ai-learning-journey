---
title: A guard against counting money twice must key on when the balances it protects were entered — gap 5's R15 and R17 were keyed in turn on today's year, a "saved after the item's year" test, the draft's copy of the save stamp and the disk's stamp, and each went silent or contradicted the other somewhere; one risk, one rule, one clock, read off the balances on screen
date: 2026-11-28
phase: The RightCapital mandate, gap 5 (one-time money in): the plan's check (b9-1, b9-2, 2026-11-27), U4 (b9-5) and the gift half's whole-file review, round 1 (b9-7, `11fa931f`)
modules: [src/ui/resultSave.ts, src/ui/scenarioFromDraft.ts, src/ui/IntakeApp.tsx, src/ui/shell/Shell.tsx, src/ui/screens/setup/Stepper.tsx, src/ui/screens/profile/drawers/oneTimeFields.ts, docs/plans/features/one-time-money-in-build-spec.md]
tags: [clock, frame, save-stamp, savedAt, re-minted-stamp, boundary, strictly-after, counts-twice, double-count, inheritance, gift, R15, R17, balancesYearFor, balancesSaveYear, agedBalancesYearFor, persisted-vs-draft, load-time-stamp, live-state, dirty, yearly-update, rosy-direction, calm-but-wrong, one-risk-one-rule, plan-check, review-round]
---

## Problem

Gap 5 lets a household enter an inheritance or gift with its year. If the money has already come in, it may sit in the
account balances too, and the plan counts it twice: rosy. Two guards cover that: R15 flags an item whose year has
passed on an aged plan, and R17 asks in the drawer whether the money has already come in and refuses a yes. Four times
the guard was keyed on the wrong clock.

1. **Two clocks for one risk** (b9-1, the plan's check). R17 keyed on today's year and R15 on the year the balances were
   saved. On a plan saved in 2026 and viewed in 2028, R17 would have refused money not yet in the balances. The owner
   and builder readers caught it.
2. **The boundary** (b9-2, the plan's check). The flag fired when the plan was "saved strictly after the item's year".
   Every save re-stamps `savedAt` (`src/ui/scenarioFromDraft.ts`), so a re-save in the inheritance's own year, after
   the money landed in the balances, set the save year equal to the item's and no flag fired. Three of six reviewers
   found it (feasibility, adversary, design); the three blind readers had not.
3. **The copy of the stamp** (b9-5, U4). A save writes the stamp to disk but never to the in-memory draft, whose
   `savedAt` stays its load-time value. Read off the draft, the flag a re-save in the item's own year turns on stayed
   hidden until a reload.
4. **The disk against the screen** (b9-7, round 1). The yearly update re-enters balances that may already hold the
   money. R15 and R17 read the last save's year, so between the update and the next Save the answer counted the money
   twice with no flag (3 lenses).

## Root Cause

The risk is "the balances on screen already include this money", and the only clock that answers it is when those
balances were entered. Today's year, the save stamp, the draft's copy of it and the disk's copy each agree with that
clock only in the plain case: one save, no re-save in the item's year, no edit since. Every fixture held the plain case.
`agedBalancesYearFor` in the same file already followed the right rule (a dirty view drops its claim), but the new guards
were written fresh instead of from it.

## Fix

`balancesYearFor` in `src/ui/resultSave.ts` is the one clock both R15 and R17 read:

- never saved: undefined, and the drawers treat the balances as entered now (or, on the stepper's Income step, not
  entered yet);
- saved, with `enteredAccounts` unchanged since the last commit: `balancesSaveYear` over `persist.scenario`, the last
  committed model, never the draft's load-time stamp;
- saved, with `enteredAccounts` changed this session: today's year, `enteredNow: true`.

An item dated in or before that year is flagged, so a save year that lands on the item's year flags. The value is
handed down as a prop (IntakeApp, Shell, Profile, the drawers, and since round 1 the stepper's re-walk too: [[180]]'s
2026-11-28 extension).

## Key Insight

One risk gets one rule on one clock, and the clock is the one the risk is about. Name the thing the guard protects
(here, the balances on screen) and key the guard on that thing's live state: not today's date, not a copy of a stamp
that a save does not refresh, not a disk stamp the screen has moved past. Then test the boundary: when a stamp is
re-minted on every save, a "stamp after X" guard goes silent when the stamp lands on X, and that is usually the very
event the guard exists for. Before reusing a save-time stamp, check which copy each reader reads.

## Also Applies To

- The home-sale half (gap 5's U7 to U12): a sale already in the balances is the same double count, and it reads the
  same clock.
- Every staleness reading: the aged-balances caveat, the re-entry gate's "still about right", R15's flag on the card.
- [[167]]: store an edit in the frame of the thing it edits. This is the same frame trap for a guard's clock.
- [[073]]: the save stamp is wall time, and it breaks byte identity the same day.
- [[144]]: a mark that vouches for a fact must live where the fact is seen.
