---
title: A stress that can only help is not a stress — the RC11 plan offered "the ACA subsidy rules switch" wherever someone has years before 65, but every shipped seed is already on current law's smaller discount, so the only switch left was to the bigger one, and its bar would have risen under "stress" and lifted Combined; a scenario whose direction depends on the plan's own setting is offered only where it points down
date: 2026-11-25
phase: Act 6 (RC11 Stress Test, b9-11)
modules: [src/intake/stress.ts, src/intake/whatIf.ts, src/ui/copy.ts, src/intake/__tests__/stress.test.ts]
tags: [stress-test, scenario-direction, sign, downside, false-comfort, rosy, aca, subsidy, enhanced-subsidies, current-law, combined, refusal-by-name, stressOffer, already-current-law, lever, toggle, calm-but-wrong]
---

## Problem

The RC11 plan (`docs/plans/6-rightcapital-ui-plan.md`, RC11) listed three stresses, one of them "The ACA subsidy rules
switch" (the `aca-subsidy` lever, "offered only when someone has years before 65"). Its only gate was reach. No shipped
dev seed sets `enhancedSubsidies` (a grep of `src/ui/devSeeds.ts` finds none), and an absent flag means the statutory
cliff regime, current law (`src/shared/model.ts`, `enhancedSubsidies`). So on every seed that passes that gate,
`?seed=health` among them, a "switch" could only go to the bigger discount. Its bar would rise above Baseline under the title "Stress test", and
Combined, built from every stress at once, would be lifted by it. That is false comfort on a page whose whole job is
the downside.

## Root Cause

The plan named the scenario as a switch of a setting, not as a move in one direction. A switch is worse or better
depending on where the plan already sits: for a plan counting on the bigger discount it is a real stress, and for a plan
already on current law it is the hopeful case. The reach gate ("someone has years before 65") checks that the
scenario touches the plan. It says nothing about which way it pushes.

## Fix

The RC11 builder (`912caf66`) made the stress one-way and gated it on direction:

- `applyStress` writes `{ kind: 'aca-subsidy', enhanced: false }` through `applyBundle` (the plan's own lever write), so
  the stress can only move a plan to current law.
- `stressOffer` returns `{ kind: 'already-current-law' }` unless `draft.enhancedSubsidies === true`. The bar is not drawn,
  and the page and the tray say why in `copy.stressRefusedCurrentLaw`: "your plan already uses current law's smaller
  discount, the cautious case, so switching the rules could only help. It isn't a stress for your plan."
- Combined never carries it. Its choices skip every stress the plan does not offer (`useStress.ts`), and
  `applyStresses` stops at the first refusal anyway (`stress.test.ts` pins `health` with the subsidy stress chosen
  refusing as `already-current-law`).

Still open (the register's milestone 2 leftovers, *The subsidy-rules stress is offered on today's ages, not on
marketplace years at the plan's stop*): the reach half of the gate, `healthcarePriced`, reads today's ages. So a working
plan whose years before 65 all sit on an employer plan can draw a subsidy bar equal to Baseline. That bar is true and
never rosy, and the module header says so.

## Key Insight

Before drawing a scenario as a downside, work out its direction on THIS plan. An edit that sets a field to a value is
worse or better depending on the value the plan already holds. If the plan can already sit at the cautious value, the
"stress" is either nothing or an upside. Offer it only where it points down, refuse it by name everywhere else, and
keep it out of any combined bar. Watch for a scenario named as a "switch", "toggle" or "change" instead of as a one-way
move ("to current law", "20% less"). A reach check (does this touch the plan?) is not a direction check (which way does
it push?).

## Also Applies To

- Map gap 8's coming engine stresses (market drops, higher inflation, higher taxes, lower returns, longer lives): write
  each as a one-way move from whatever the plan already assumes for that input, the way RC11's Social Security
  stress (every `pia` scaled down) and out-of-pocket stress (the figure scaled up) already are.
- Any toggle lever reused as a stress. The Action Items tray's subsidy-rules item (`trayView.ts`, `aca-subsidy`) is a
  what-if, and Probability compares it (`triesSubsidyRules`), so it may honestly go either way. A bar under a "stress"
  title cannot.
- Combined bars and other sums of scenarios: a sum takes the direction of each part, so one upside part hides inside a
  total that still reads as "worse".
