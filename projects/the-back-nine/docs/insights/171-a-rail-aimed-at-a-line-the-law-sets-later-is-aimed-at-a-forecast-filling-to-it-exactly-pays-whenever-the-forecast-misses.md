---
title: A rail aimed at a line the law sets later is aimed at a forecast — the IRMAA rails fill each year's income to the projected Medicare surcharge line to the dollar, though the real line is published only after the conversion is done; the frame was right, the exactness was the defect
date: 2026-11-25
phase: Act 6 (RC8 Details, b9-9)
modules: [engine, solver, ui]
tags: [irmaa, forecast, projected-line, rail, bracket-fill, cliff, aca, fpl, exactness, cushion, either-way, rosy, cpi-path, solver]
---

## Problem

On `?seed=surplus` the recommended strategy's steady run shows income of about $232,000 a year in 2027–2034 and a $0
Medicare surcharge, beside 2026's $218,000 joint line. Checked through `irmaaScheduleAsCompared`: MAGI 2024 → bill
2026 gives $218,000 (the published line), and the compared joint line for MAGI 2027–2034 is $231,621–$232,917 in today's
dollars. The run's income sits ON each year's line to the dollar, and tiers surcharge only "more than" the line, so the
$0 is right inside the model.

## Root Cause

The engine projects each future line forward on the Trustees' CPI-W path, and the solver's rails fill a year's income
up to it exactly. But the real line for a bill year is published the fall before that bill, after the household has
already converted. The projected line is a forecast. At 2.5 % inflation the real line is about $229,000, and every year
the plan put on the projected line pays about $2,297 at 2026 prices. The frame (two years back, in that year's dollars)
was right. Treating a forecast as an exact edge was the defect: the rail lands on the rosy side of an either-way.

## Fix

Details → Medicare prints each year's line beside its income, with a note that later lines are forecasts and a year at
its line can still draw a surcharge if prices rise more slowly (`48dbb7c1`; D7's "can't be known" line, a stopgap). The
build is filed Tier 0 (*The solver fills Roth conversions to the exact forecast Medicare surcharge line…*): measure the
reach first, then a council on a cushion.

## Key Insight

When a rail, step or cliff edge is set by law in the future, the engine's version of it is a forecast. Optimizing to
the dollar against a forecast puts the plan on the edge in the futures where the forecast misses toward the edge, and
the miss lands only one way, as a surprise bill. Ask of every forward-projected edge: who publishes it, and when,
relative to the decision that has to clear it? If it is published after the decision, the rail needs a cushion, or
words saying the edge is a forecast.

## Also Applies To

- The ACA cliff's federal poverty line, re-set each year and applied to the coverage year's income.
- Bracket edges and the standard deduction in later years (indexed by a published CPI figure, not the engine's path).
- Any "room under the line" readout (the step card's headroom, the conversion tile): a figure quoted to the dollar
  against a projected edge reads more exact than it is.
