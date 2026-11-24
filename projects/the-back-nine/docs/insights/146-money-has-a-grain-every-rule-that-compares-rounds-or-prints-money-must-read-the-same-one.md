---
title: "Money has a grain, and every rule that compares, rounds or prints a money figure must read the SAME one — six defects across the pay check and the Social Security engine were a rule whose edge, rounding or tie read a different grain from the screen or from its sibling: 40¢ a month ran as W behind \"$0\", float dust floored $3,060 to −$3,061, Math.round read a true −$12.005 as \"Short $12\", and a dime floor in one function left its sibling cap a dime above the law"
date: 2026-10-31
phase: the pay check (A7 and its review, Phase B, the whole-file review — rulings 39 and 40); the RIB-LIM reorder (b9-11); the earnings test (b9-12)
modules: [src/intake/sanity.ts, src/intake/fields.tsx, src/engine/workingYearLedger.ts, src/engine/moneyGrain.ts, src/engine/earningsTest.ts, src/engine/socialSecurityBenefit.ts]
tags: [money, grain, rounding, cents, float-dust, tie-rule, gloomy-side, edge, display, mixed-basis, dime, round-fixtures, stored-precision, roundCents, difference-of-rounded, snap-operands, silent-comparison, same]
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

> **Out of date (corrected 2026-11-01):** build 2's U3 moved the cent snap, its dust tolerance and the bottom line
> out of the ledger into a leaf, so the tax overlay can read the same grain. The current cent snap lives in
> `src/engine/moneyGrain.ts` (`toCents`, `workingYearBottomLine`); the largest-remainder rounding stays in
> `src/engine/workingYearLedger.ts` (`roundLinesToBottomLine`).

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

## Extended (2026-11-23): round fixtures hide a grain, a stored figure sets the other side's grain, and differences and silent comparisons read one too

Five cases from build 2, each the same law at a new site:
- **A fixture family of round figures cannot see a grain or an order.** Every multi-year credit arm had a whole-dollar
  year 0, and no credited year drew. So two wrong readings passed green: year 0's cap read off the raw cash, and a
  gross-up reading the credit's basis. They were rosy by under $1 a year, and by $460 on a taxed $60,000 draw. When a
  rule names a grain or an order, give it one fixture where the alternatives differ: a fractional cent, or a credited
  year that draws at a taxed gain.
- **Compare at the precision the other side is stored at.** A monthly figure written as `entered × 12`, unrounded, sat
  a float hair under a quote snapped to the cent and printed "$84,999.96 is below $84,999.96". A predicate over a
  rounded figure rounds its other side the same way (`roundCents` in `workingYearQuote.ts`), as its siblings already
  did (b9-1, `ec3514a7`).
- **A difference of two figures rounded the gloomy way can sit under the raw difference.** Shortfalls round up, so
  "$4,015 − $16" printed "at most $3,999" for C at $8,416.67 a month, where the engine draws $3,999.96 less: false on
  the rosy side by up to $0.99 (the rebuild review's round 1, #1). Compute a bound on the raw grain and round it up,
  and accept being up to $1 over the reader's own subtraction as the lesser fault.
- **Snap each operand to the cent before subtracting, never the difference.** Round 1's fix rounded the raw draws'
  difference to the cent, so a figure typed to a tenth of a cent printed "at most $3,999" under both the cent grain
  ($3,999.01) and the reader's subtraction. And the R5 invariant compared the printed figure with the raw float, so a
  cash ending in a fraction of a cent redded a figure that was right to the cent (round 2, #2 and #7, `6b63c697`).
  `stillShortDifferenceDollars` now snaps each cash to the cent exactly as its printed shortfall is (`centDrawOf`), then
  rounds the difference up to the dollar.
- **A comparison that prints no figure still reads a grain.** `same`'s equality kept comparing the two printed
  (rounded-up) shortfalls, so "adds the same" stood over draws up to 99¢ a year apart (C at $104,999.01; round 3, two
  seats). It now reads the two draws on the cent grain too, and a twin invariant reads the claim itself (`same` means
  equal in cents), seen red first (b9-5, `d5fb99ba`).

**Rule:** sweep every comparison of two money figures for its grain, the silent ones included. Snap operands before
any arithmetic between them. Put one fixture where the grains or the orders disagree, or the suite cannot tell them apart.
