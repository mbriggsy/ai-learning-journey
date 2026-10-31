---
title: "Money has a grain, and every rule that compares, rounds or prints a money figure must read the SAME one — six defects across the pay check and the Social Security engine were a rule whose edge, rounding or tie read a different grain from the screen or from its sibling: 40¢ a month ran as W behind \"$0\", float dust floored $3,060 to −$3,061, Math.round read a true −$12.005 as \"Short $12\", and a dime floor in one function left its sibling cap a dime above the law"
date: 2026-10-31
phase: the pay check (A7 and its review, Phase B, the whole-file review — rulings 39 and 40); the RIB-LIM reorder (b9-11); the earnings test (b9-12)
modules: [src/intake/sanity.ts, src/intake/fields.tsx, src/engine/workingYearLedger.ts, src/engine/earningsTest.ts, src/engine/socialSecurityBenefit.ts]
tags: [money, grain, rounding, cents, float-dust, tie-rule, gloomy-side, edge, display, mixed-basis, dime]
---

## Problem

Six separate findings in five days (2026-10-27 → 10-31), across the pay check and the Social Security engine:
- The zero rules refused `≤ 0` while the field printed whole dollars: 40¢ a month read "$0" on screen and ran as W.
- A stale sentence compared at the cent and printed whole dollars: "$84,000 … now $84,000".
- A floor-based dollar rule turned float dust into a dollar: $3,060.0000000000005 of payroll, as a money-out line,
  floored to −$3,061 on a round-number household.
- `Math.round` let the float's dust pick a true tie's side: payroll on $72,570 is a half cent, and a true −$12.005
  read "Short $12".
- Owed − withheld in floating point left a crumb: a year withheld in full read −3.6e-12.
- Flooring the PIA to the dime for the survivor's full rate while the RIB-LIM cap read the raw figure paid a cap a
  dime above the law (the b9-11 law lens).

## Root Cause

Money is discrete — the cent in the ledger, the dollar on screen, the dime in an SSA benefit — and it is computed in
binary floats. Each rule picked its grain implicitly and alone: the zero rule took the float's, the field the
dollar's; a floor saw dust as a real remainder; a round left the tie to the dust's sign; a normalization inside one
function gave its sibling a different basis. None of these is an arithmetic error. Each is two places that must agree
reading the same quantity at different grains.

## Fix

One grain per quantity, one home each: `showsAsZero` (`sanity.ts`, under 50¢ in the unit typed — spend and W share
it); the ledger's `toCents` (nearest cent, a half-cent tie within `HALF_CENT_DUST` toward −∞, never −0) and its
largest-remainder rounding, so a true −$12.005 reads "Short $13" whichever way the float lands; the earnings test sums
a withheld year's remaining months in exact cents (and keeps the composed float where nothing is withheld, for
bit-identity); `formatMoneyPair` prints both figures to the cent when they differ but round to one dollar; and all
three RIB-LIM amounts read ONE PIA floored to the dime (`piaDime`).

## Key Insight

**For every rule that touches a money figure, name its grain, snap to it BEFORE comparing, flooring or printing, give
it a tie rule (the gloomy side, within a dust tolerance), and make every sibling that reads the same quantity read the
same snapped value.** At each edge ask what the SCREEN shows there: a rule that refuses what the screen does not show,
or allows what it shows as zero, lies at its own boundary. The tells: `<= 0`, `Math.floor`, `Math.round` or `===` on
a raw float dollar; a normalization applied inside one function of a family.

## Also Applies To

- Every gate the money picture reads (they all compare at the cent), every "Short $N" / "Left over $N", every stale
  check that compares two money figures, and any future field with a zero or a floor rule.
- [[012]] — a ceil quantized against an integer cliff is a no-op; the same grain question at a cliff.
- [[129]] — read the integer grid at the producer seam; the grain of a spoken year.
- `confidence.ts`'s headline quantization (`CLAUDE.md`) — a grain chosen before a band edge, for statistics.
