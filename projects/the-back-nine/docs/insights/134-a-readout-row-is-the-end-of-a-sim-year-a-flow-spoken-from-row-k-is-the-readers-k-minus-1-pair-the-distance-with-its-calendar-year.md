---
title: "A readout row is the END of a sim-year: a STOCK at row k is 'k years out' but a FLOW at row k (a year's premiums) was paid during sim-year k−1 — speak the flow's distance as k−1 and pair it with the calendar year start + k − 1, or the card contradicts its own step card"
date: 2026-09-24
phase: Act 4 hardening (Briggsy's eye on the Medicare premium card — "seven years out — from what?")
modules: [src/ui/copy.ts, src/ui/healthSheetChrome.ts, src/intake/HealthcareSheet.tsx, src/shared/model.ts, src/ui/__tests__/healthSheetChrome.test.ts, src/ui/__tests__/healthSheetSeedGate.test.ts]
tags: [readout-clock, off-by-one, calendar-year, plan-clock, medicare, era-lines, copy-law, stock-vs-flow, single-producer]
---

## Problem

Briggsy read the 61/59 household's premium card cold: *"From about seven years out, while you're both on Medicare
… "* — "seven years out from WHAT?" The line had been DATED on 2026-09-14 from the wire's own `yearsFromNow`
(reviewed by 62 agents) and still floated: nothing on the card said what the years counted from, and a reader
adding 2026 + 7 got 2033, a year the household is not both on Medicare (the younger turns 65 in 2032).

## Root Cause

`HealthReadoutYear.yearsFromNow` is the fan's clock: row k = the END of sim-year k−1 (`model.ts`). That is exactly
right for a STOCK — the band's "Looking about 42 years out, your savings land between…" reads the balance AT row
42, which is 42 years from today. It is one too many for a FLOW: the premiums the medicare row carries were paid
DURING sim-year k−1, so row 7's ~$5,800 is 2032's bill, six years from now. The step card on the same sheet
already dated its anchor by the flow rule (`anchorCalendarYear = startCalendarYear + yearsIn`, `yearsIn =
anchor.yearsFromNow − 1` — council 2026-07-09 C4, the single-producer clock), while the era line two paragraphs
up spoke the raw row. Two conventions on one card; the fuck-off date route uses a third (a sim-year offset,
`startCalendarYear + offset`). Nobody noticed because no line printed a CALENDAR year beside its distance — the
only thing that makes an off-by-one visible to a reader.

## Fix

The era slots take a distance AND a calendar year (`irmaaStepEraStart(total, yearsFromNow, calendarYear)`,
`irmaaStepOnRampSpan(span, total, anchorYearsFromNow, anchorCalendarYear)`) in Briggsy's ruled form — *"About six
years from now, around 2032, while you're both on Medicare, …"* / *"Before that, starting about four years from now,
around 2030, and for about two years, …"*. The composer feeds both from ONE rule: calendar = start + k − 1,
distance = k − 1 − `yearsSincePlanBuilt` (the plan clock now reaches `composeHealthSheet` through the sheet's
`savedAnchor`, so an aged vault counts from today; a distance ≤ 0 keeps the year alone). Pins: the DATED arm
re-cut, an aged-vault arm, both seeds through the real engine, the plan clock through the component; six mutants red.

## Key Insight

**Before speaking a readout row's distance, ask whether the figure is a STOCK (a balance at the row's instant — k
years out) or a FLOW (something paid during the year that ENDS at the row — sim-year k−1, calendar start + k − 1).
Then print the calendar year beside the distance: a bare "N years out" can be off by one forever and no reader
can tell; "N years from now, around YYYY" is checkable against the household's own ages.** Corollary: when a
sheet already dates one figure by a ratified clock, every other dated figure on it must derive from that same
clock — a second convention on the same surface is a contradiction waiting for an eye.

## Also Applies To

Every flow spoken from a readout row: the ACA card's "the first N years" / "for about N years" spans, the
extras lines, any future "in year N the surcharge is …" sentence, the health sheet's discount fact. The band's
stock lines (`bandReadout*`, `bandAtRangeGone`'s "about N years out") are correct as rows. The fuck-off date's
`offsetYears` is a sim-year index already — do not "correct" it. The tape/Caddie corpus: a prediction about a
dated line should name the calendar it expects, so the tape can score the off-by-one class at all.
