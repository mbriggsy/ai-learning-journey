---
title: A rendered defect is green on every check until someone looks — ten defects across Act 6's first seven units passed every gate and were caught only by an eye on the screenshots; open the builder's screenshots yourself, and make the arm that should have caught each one fail on it
date: 2026-11-25
phase: Act 6, the RightCapital clone (RC1 to RC7, b9-4 to b9-6, 2026-11-24)
modules: [e2e/held/rc-look.spec.ts, e2e/rc-screens.spec.ts, e2e/hcTextAudit.ts, src/viz/charts/]
tags: [look-audit, screenshots, eye-in-the-loop, orchestrator, builder-agent, green-checks, visual-defect, calm-but-wrong, ellipsis-exemption, planted-red, highcharts, fit, phone, clone]
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
