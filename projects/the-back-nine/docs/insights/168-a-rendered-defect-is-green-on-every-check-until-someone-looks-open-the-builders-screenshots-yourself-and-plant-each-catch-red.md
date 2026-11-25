---
title: A rendered defect is green on every check until someone looks — ten defects across Act 6's first seven units passed every gate and were caught only by an eye on the screenshots; open the builder's screenshots yourself, and make the arm that should have caught each one fail on it
date: 2026-11-25
phase: Act 6, the RightCapital clone (RC1 to RC7, b9-4 to b9-6, 2026-11-24)
modules: [e2e/held/rc-look.spec.ts, e2e/rc-screens.spec.ts, e2e/hcTextAudit.ts, src/viz/charts/]
tags: [look-audit, screenshots, eye-in-the-loop, orchestrator, builder-agent, green-checks, visual-defect, calm-but-wrong, ellipsis-exemption, planted-red, highcharts, fit, phone, clone, vacuous-audit, zero-labels, presence-count, html-overlay, donut, hole, geometric-check, assertCentreInHole, hcAudit, held-instrument, rc-look, RC_ONLY, env-filter, index-lookup, by-id, screenById, wrong-screen, rename]
---

## Problem

Each Act 6 unit came back from its builder with every check green: typecheck, lint, the unit tests it reached, its e2e
arms, and the builder's own look audit where it ran one. An eye on the builder's screenshots then found a defect in
each of the first three units:

- RC1 (`6ded3110`): hovering one chart series faded the other series' printed values to near-invisible.
- RC2a (`06e19238`): the tray's row label was cut to "Monthly spending in retireme…". The builder's look audit had
  exempted ellipsis.
- RC2b (`65021841`): the phone menu's headings rendered in the old serif. Figtree had never been loaded in the main
  app, and the old heading rules leaked inside the new shell.

RC4 (b9-5) added four more, each green on every check: odds labels printed over the neighbouring bars, a phone chart
showing 2 of 11 years, two balance bars of about $1.1mm and $675k drawn the same height, and a worded ring centre
spilling out of its ring at the ceiling. RC5 to RC7 (b9-6) added three: "It sits close to the line" printed beside two
kept what-ifs when neither half was the plan; the fan's right edge labelled "Plan horizon" where the fan really stops at
the thin-cohort cut, 20 years short of the horizon on `retired`, so the run-out chart's "about 8 in 100" sat beside the
whole plan's 12 as two answers to one question (on Snapshot since RC3; found by the orchestrator in RC7's screenshots
and fixed in `a7add642`); and phone rows squeezed to one letter per line, the RC5 builder's own catch.

## Root Cause

A check tests what someone thought to test. Every one of these was a way the screen could be wrong that no assertion
named: a fade nobody measured, an ellipsis the audit was told to forgive, a font nobody checked was loaded, a label true
on one chart and false on the next. Two of them (the equal bars and "Plan horizon") were calm-but-wrong: the page looked
finished and told the household something false. A builder reviewing its own screenshots looks for what it built, and
its audit carries its own exemptions, so the defect passes both.

## Fix

The orchestrator opens the builder's screenshots itself at both sizes on every unit, never the builder's summary of
them (the held look instrument `e2e/held/rc-look.spec.ts` writes them to `temp/rc-shots/<unit>/`). After each catch,
the builder made the arm that should have caught it fail on it, planted once and seen red: `e2e/hcTextAudit.ts`'s
`hcMarks` / `hcMarkFailures` (every bar and label inside the frame, no label over a mark or another label), planted in
source and kept as a permanent arm; the drawn-height ratio check for the balance bars in `e2e/rc-screens.spec.ts`; a
look audit that counts an ellipsis as clipped.

## Key Insight

Green checks prove the screen does what the checks name. A new screen's defects are mostly the ones nobody named yet,
and only an eye finds those. So the look is a gate the orchestrator runs with its own eyes on every unit, and each
thing the eye catches becomes a check, planted red once, so the next unit cannot ship it again. An audit with an
exemption ("ellipsis is fine") cannot see the class it exempts.

## Also Applies To

- [[069]]: comprehension holes in copy are the same class for words; only a cold reader finds them.
- [[157]]: a builder's "all green" is a report until the orchestrator re-runs it; its screenshots are part of that
  report.
- [[123]]: a screenshot proves one frame; the look finds the defect, the measured catalog proves it is gone everywhere.
- Every remaining clone unit (RC8 onward), and any chart re-hosted in a new box.

## Extended (2026-11-25): a clean audit can be blind, because it saw none of what it checks or checked the wrong page

Two more audits in Act 6's second milestone came back clean and proved nothing.

**An audit that reads one layer passes words drawn on another** (RC12, `c2ff8488`, b9-11). Investment's donuts are
Highcharts pies with the centre words in HTML over the hole (`Donut` in `src/viz/charts/InvestmentCharts.tsx`, its
`[data-donut-centre]` layer). `hcAudit` (`e2e/hcTextAudit.ts`) reads only the SVG text Highcharts draws: data labels,
axis labels and titles, plot-line labels, legend items. The rings print none of those, so the text audit in
`auditRings` (`e2e/rc-screens.spec.ts`), run with nothing required (`{ texts: [], counts: {} }`), reads zero labels and
passes whatever the centre does: too big, faded, outside the hole, or missing. The builder added `assertCentreInHole`
beside it: each centre line at the floor size or more and unfaded, every corner of its text inside the hole's circle,
and "no centre words" as a failure when there are none. Its plant (the centre text made too big) went red once. One
watch-out on the fix: the hole's size in the check, `DONUT_HOLE = 0.64`, is a copy of `DONUT_INNER = '64%'` in
`src/viz/charts/donutOptions.ts`, so a hole shrunk in source alone leaves the check measuring against the old, larger
circle. The kit `Ring` (`src/ui/kit/Ring.tsx`) lays its centre and caption over its SVG the same way; RC4's spill there
(in the Problem above) was found by eye, and no e2e arm yet measures those words against the circle.

**A held instrument that indexes into a filtered list shoots the wrong screen** (milestone 2's review, `a883c5e40`,
b9-12). In `e2e/held/rc-look.spec.ts`, RC11 (`912caf66a`) renamed the screen list `ALL_SCREENS` and gave the old name,
`SCREENS`, to a copy filtered by the `RC_ONLY` environment variable. RC11's and RC12's new code looked screens up by id,
but nine older lookups kept their positions on the old name, which now meant the filtered list: `HEALTH = SCREENS[2]`,
`CLAIMS = SCREENS[6]`, `TAX = SCREENS[4]`, `CASH_FLOWS = SCREENS[3]` and five more. With no filter they were still right.
Under a filter they were not (with `RC_ONLY=probability,health-care,social-security`, for one, `SCREENS[2]` is Social
Security). In a capture run during the review, the shots named "health-care" showed Social Security, and the audit on
them was clean, because it audited the page in front of it; the Health Care tray capture, which runs only when
`[data-health-charts]` is on the page, skipped without a word. Only opening the picture found it. The fix is
`screenById`, a lookup by id in the unfiltered `ALL_SCREENS`, now used by every capture block (its landmine is in
`docs/landmines.md`, "The fit gate and e2e").

What both add: a clean audit means nothing until it shows it looked at the right thing. Give an audit a presence count,
so "found none" fails where something must be there (insight 029's presence companion, for an audit). Measure words in
the layer they are drawn in, or with a geometric check of your own. Pick what a capture shows by its name, never by its
position in a list that a filter, an environment variable or a reorder can change, and when a rename hands an old name
to a new meaning, check every reader that already used the name. The eye on the shot stays the last check: it is the
only one that reads the page itself, so it is the only one that catches an instrument aimed at the wrong page.
