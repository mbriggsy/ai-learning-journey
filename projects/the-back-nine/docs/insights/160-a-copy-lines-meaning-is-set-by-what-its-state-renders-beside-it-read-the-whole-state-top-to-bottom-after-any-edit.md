---
title: A copy line's meaning is set by what its state renders beside it — a fix to one line can contradict its neighbor, a true figure reads as a bug beside one it should resemble, a joiner attaches to whichever figure it follows, and a label keeps the contrast it was written for after the page drops it
date: 2026-11-23
phase: Build 2 (the surplus question) — U11's Caddie walks 4 to 9, and b9-10's 2026-09-27 price re-pin
modules: [src/ui/copy.ts, src/ui/FuckOffDate.tsx, src/intake/workingYearLeftOver.ts, src/intake/WorkingYearLeftOverQuestion.tsx]
tags: [copy-contract, co-rendered, same-state, sibling-line, label, contrast, joiner, rider, read-top-to-bottom, caddie, cold-read, calm-but-wrong, part-d, working-years, full-budget]
---

## Problem

Four copy defects, each in a sentence that was true and had passed its own tests, each misread because of a line
rendered beside it:

- **Two instructions to one household (b9-1, walk 4, 2026-11-08).** Walk 3's fix round reworded the check sentence's
  partial-saver line ("choose Some of it"). The moved line on the other side of the radios still offered its way out
  ("leave this as it is"). Each line was right alone; together they told one household two different things, and walk
  4 filed it as a blocker.
- **A true price read as a bug (b9-10, 2026-09-27).** After the 2030 reset the Part D surcharge prints at about 3×
  the figure beside it. Two seats called it "too big". The number was right.
- **A joiner that attaches to the wrong figure (the typed-below rider, walks 7 to 9).** The rider "plus any income tax
  on it" sat after "$11,000 less". After "less", a "plus" can fold the rider into the quote's side and read as
  shrinking the lean (the rider council's red team, conceded by six seats). Its replacement, "not including any
  difference…", is the price-tag idiom ("$X, not including tax"), and walk 8's readers still heard "ignores tax".
  Walk 9's ruled flip made it ", except for any difference between the two answers in income tax and Medicare's income
  surcharge" (`2f03a6caa`).
- **A label that kept a contrast the page dropped (walk 8's W8-R7, 2026-11-16).** `copy.bandPricesFullBudgetNote`
  ("This range prices your full budget — the same life the date above is measured against.") was written as the
  lifestyle side of a lifestyle-versus-essentials pair. No page that shows it shows the pair. On a date-route page
  whose note names a lower working-year figure, it was the page's only "budget", so it read as "every year at the full
  spending", which is false for the working years. The refuter confirmed it.

## Root Cause

Each line was written and checked against its own predicate and its own test. The reader meets the whole state at
once, and resolves each phrase against whatever sits beside it: an instruction against the other instruction, a
figure against the figure they expect it to resemble, a joiner against the figure it follows, a label against the
other figures on the page. No string test sees a neighbor, and a reword of one line never re-runs the reading of the
lines it shares a state with.

## Fix

- Walk 4's pair went to its fix round as a blocker, and b9-1 wrote the rule: after any copy edit to one line, read
  every line that state renders together, top to bottom.
- The Part D surcharge: the fix is the LABEL that explains why it differs (the reset), never the number.
- The rider: one rider on every comparison, read against every sentence form it ends ("less", "the same", "at
  most"). `RIDER` in `src/intake/__tests__/workingYearLeftOver.test.ts` pins its words by hand, and the same file reds
  if the old "not including any difference" comes back.
- The full-budget label: `FuckOffDate.tsx` now picks `slots.bandCountsWorkingYearsNote(...)` whenever the page carries
  a working-year figure, and keeps the old note only where the pair it was written for is the page's real contrast.

## Key Insight

**A line's meaning belongs to the state it renders in, not to the line alone.** Three checks follow:

- **After editing one line, read the whole state top to bottom**, every line that state shows, on every route that
  shows it. Two true lines can give one household two instructions.
- **When a page gains (or loses) a figure, re-read every label written for the old contrast.** A label means what its
  siblings make it mean; "full budget" means "as opposed to essentials" only where essentials are on the page.
- **Read a joiner against every sentence form it ends and every figure it can follow.** "Plus" after "less", "not
  including" read as "ignores": the joiner's meaning is set by the figure before it.

And when a figure is true but surprising beside its neighbor, explain the difference in the label. Changing the
number to look like the neighbor would be the calm-but-wrong fix.

## Also Applies To

- Insight 109's corollary (a refusal's wrapper is copy too, and only reading the assembled frame catches a mismatch)
  is this law for refusal frames; insight 140 is its scope-claim form (a later line cannot narrow a claim the reader
  finished).
- Insight 069's refuter point runs the other way: a referent supplied by the adjacent line is NOT a violation. The
  neighbor can rescue a line as well as break it, so judge either way off the rendered state, never the string.
- The workbench's facts page and year-by-year table: a label written for the walk ("your spending") reads differently
  beside the table's own columns.
- Any caption that reads the draft beside a headline that reads the answer (walk 9's W9-R7): the two lines describe
  different moments, and the pair is the defect.
