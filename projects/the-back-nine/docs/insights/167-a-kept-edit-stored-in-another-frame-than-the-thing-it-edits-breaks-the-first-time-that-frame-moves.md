---
title: A kept edit stored in another frame than the thing it edits breaks the first time that frame moves — kept spending lines in calendar years beside plan lines counted from the stop were refused every time the date answer moved a year; store an edit in the edited thing's own frame
date: 2026-11-25
phase: The RightCapital mandate, gap 2's re-check (b9-3, 2026-11-23; the workbench plan's KTD18)
modules: [docs/plans/5-workbench-plan.md, src/shared/model.ts]
tags: [frame-of-reference, kept-what-if, calendar-year, years-from-stop, stop-year, budget-line, translator, anchor, date-answer, schema-design, adversary, plan-check, precompiled-array, compiled-budget, sim-year, date-search, price-factor, rated-line, to-start, quoted-figure, first-year, fan-note, sibling-host, phrase-sweep, review-round, ktd-mechanism-change, plan-sweep, blind-readers]
---

## Problem

The workbench plan's KTD18, as written on 2026-11-11, stored a kept what-if's spending lines in calendar years. The
plan's own budget lines (`BudgetLineItem` in `src/shared/model.ts`) count their years from the household's work stop:
year 0 is the first year nobody works. Gap 2's re-check (b9-3, 2026-11-23) found that a kept spending what-if on a
working household would be refused every time the date answer moved a year later, and that under a stop-year lever its
calendar line stayed put while every plan line moved. The adversary (`wf_0c6f84b6-a57`) caught it before any code was
written.

## Root Cause

An edit is a change to something, and that something has its own frame. A plan line's "start in year 2" means two
years after the stop, so when the stop moves the line moves with it. The kept line said "start in 2031" and nothing
moved it. Each time the frames shifted against each other the kept line no longer matched any plan line, so the
what-if was refused. Keeping the two in step needed a line translator and an anchor helper: extra code whose only job
was to undo the choice of frame.

## Fix

KTD18 was amended (b9-3, the pilot's call): kept spending lines keep `BudgetLineItem`'s own shape, years counted from
the stop exactly as the plan's lines are, so a kept line moves with the date answer as every plan line does, and Apply
writes it unchanged. The translator and the anchor helper were dropped. The one calendar value left is the stop-year
lever's, because a stop year is itself a calendar answer ("stop in 2031"); it is turned into an offset at use, as the
calendar year less `startCalendarYear`.

## Key Insight

Store an edit in the frame of the thing it edits. When a stored value and its target sit in different frames (calendar
years against years from an event, today's dollars against nominal, an index against an id), the pair holds only while
the two frames stay still, and it breaks the first time one moves. The tell is a translator in the design: if the plan
needs code to convert the edit before it can apply, ask whether the edit should simply be stored the way its target is.
A value whose own meaning is calendar-fixed (a stop year) stays in the calendar frame.

## Also Applies To

- Any saved override of a plan field (a kept lever, the saved recommendation's Roth plan): ask which frame each stored
  year or amount is in, and whether that frame moves when the plan does.
- The reverse case, done right: an inherited IRA's asked minimum belongs to a calendar year, so the plan stores it with
  that year and translates it once, in its producer (KTD25).
- [[166]]: a fixture's typed calendar year against the wall clock is the same mismatch, with the clock as the frame that
  moves.
- [[134]] and [[139]]: a readout or a cross-year claim read in the wrong year's frame.

## Extended (2026-11-27, b9-13's gap 4 research): the rule bites a precompiled array, not only a stored edit

Gap 4 gives a spending line its own yearly rate (and, in its deferred loan half, a loan's fixed payment). The compiled
budget is an array indexed by `k`, years since the work stop, and it is built once per run: the date search tests each
candidate stop year against that one compile and never rebuilds it per tested stop (`buildCandidateParams` in
`src/engine/dateSearch.ts`). A repeat ("every 5 years") depends only on `k`, so it belongs in the compile. A rate's
growth from the plan's first year, or a fixed payment shrinking in today's dollars, depends on the calendar year: the
sim year `t`, which is `Y + k` on the date route, Y the tested stop. Baked into the `k` array, that price would be right
on one tested stop and wrong on every other one: harsh for a fixed payment, rosy for a line rising faster than prices.
So the plan's KTD1 (`docs/plans/features/spending-line-repeat-and-rate-build-spec.md`) keeps each part in its own
frame: the typed amount by `k`, the price factor by `t`, joined year by year in the engine (`cashTermsForYear` in
`src/engine/simulate.ts` charges `factorByT[t] × amountByK[k]`). Rebuilding the array per tested stop was rejected: the
engine would have to import the budget layer, which the layer rules ban.

What it adds: an array that several candidates share is a frame too. Before putting a figure into a precompiled array,
ask which frame the array is indexed in and whether that frame moves between the candidates that share it. If the
figure belongs to a different frame, give it its own array and join the two where both indexes are known.

## Extended (2026-11-27, b9-17's line-half review, rounds 1 and 2): a sentence that names a year prices its figure in that year, at every host of the phrase and beside every figure next to it

The date-route fan note said "about $X a year to start", with $X the budget's typed first-year total. On the
all-retired route that is right, since the first retired year is sim year 0. On the date route the first retired year
is the tested stop, `t = Y`, where the engine charges a line with its own rate its typed amount times its price factor.
The sentence named one year and priced another (three of round 1's seven lenses). Round 1 (`4cd23dc8`) added each such
line's extra cost at the band's offset, through the run's own factor (`ratedLevelShiftAt` in `src/intake/budgetForm.ts`);
the year-0 reconcilers stay on typed amounts (KTD6). That re-priced the three fan-note captions in `src/ui/copy.ts`
that read those levels. Round 2 (`3598bae0`, five lenses, each with its own verifier) found what the fix left behind:

- The fourth "a year to start" host. W's stale after-work sentence (`afterWorkSentence` in
  `src/intake/workingYearLeftOver.ts`) still quoted the typed first-year total as the budget "about $X a year to
  start" (P1). It shows before any run, so it has no stop year to price at; with a rated line on in year 0 it now names
  the budget and no figure (`hasRatedLineAtYearZero`, `copy.workingCostStaleAfterWorkRated`).
- The figure printed beside the fixed one. The repeat sentence right after the re-priced full figure still named a rated
  repeat at its typed price, while the figure before it held the same line at its price at the stop (four lenses; P1,
  rosy for a line rising faster than prices). `firstYearRepeatOf` takes an optional price point, and the fan note
  passes the band's offset: a $40,000 car rising 5% a year reads $44,373 at offset 6 (40,000 × 1.05⁶ ÷ 1.032⁶).
- The same claim under another phrase. The W question's lead said "Your budget's first year after work stops comes to
  $36,000", a quote that counts a rated line at its plan-first-year price; on `daterising` the engine charges that first
  year $37,445 at a 2031 stop (P0 by its verifier). The lead now says "counts here as" whenever the quote is no year's
  own total (`quoteIsAveraged` in `src/intake/workingYearQuote.ts`).

What it adds: words that name a year ("to start", "first year after work stops") make the figure a claim about that
year, so the figure has to be priced in that year's frame, the same rule as a stored edit. And changing what a phrase's
figure means is a sweep, never a one-site fix: grep every host of the phrase (here four "a year to start" slots, three
fed by the levels the fix re-priced and the fourth by its own figure), and re-read every figure printed beside the
re-priced one, since a neighbour left at the old price now contradicts it in the same paragraph. A host with no year to price at names no
figure rather than one from the wrong year. [[180]] is the same miss for a guard: fixed in one host, absent from its
siblings.

## Extended (2026-11-27, b9-1, gap 5's plan deepen): changing a decision's mechanism is the same sweep, through a plan

A deepen edit changed gap 5's KTD7 from one state field to two channels (the federal slice through `realizedGain`, the
state through its own presence-keyed channel). U2, U4 and the plan's chart kept the one-field version. Two of the three
blind readers hit it first: the rules reader graded it as misleading, and the builder could not proceed past it.

What it adds: the phrase sweep above holds for a plan too. Changing a KTD's mechanism is a sweep of every unit, test
list and chart that restates it, exactly as changing what a phrase's figure means is a sweep of every host of the
phrase. Grep the plan body for the old mechanism's words after the edit, not only the KTD itself.
