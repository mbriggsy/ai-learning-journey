---
title: A chart's options are not its picture — two balance bars of about $1.1mm and $675k drew the same height, and one shared scale handed to the live Highcharts chart as an update still drew them equal; pin a comparison by its drawn heights, and rebuild the chart when its scale changes
date: 2026-11-25
phase: Act 6, the RightCapital clone (RC4b, b9-5, 2026-11-24)
modules: [src/viz/charts/BalanceBar.tsx, src/viz/charts/balanceBarOptions.ts, src/viz/charts/Chart.tsx, e2e/rc-screens.spec.ts]
tags: [highcharts, chart-update, yaxis, shared-scale, lattice, react-key, rebuild, drawn-heights, options-vs-picture, calm-but-wrong, side-by-side, comparison, pinned-clock, redraw-animation, instrument, deferred-label, data-labels, defer, setFixedTime, unpinned-probe]
---

## Problem

Probability's retired route draws two balance bars side by side, the what-if's and the plan's. In RC4b's screenshots
they stood the same height while printing about $1.1mm and about $675k: the plan looked as good as the what-if. Every
check was green. The first fix gave both bars one shared lattice (axis top and ticks), and the bars still drew equal in
the look instrument's refreshed frame: each bar drawn to its own maximum, and every tick gone except "$0".

## Root Cause

Two causes, one under the other. First, each bar's chart scaled to its own top, so any two figures filled the same
height; a comparison needs one scale. Second, the shared scale reached a chart that was already drawn, as an update
through the `@highcharts/react` wrapper (`Chart.tsx`), and the new `yAxis` maximum and tick positions were seen not to
hold. From the shared lattice on, the options object said the right thing; only the drawn marks were wrong, so a test
reading the options would pass.

Not separated: RC7 (b9-6) later found that the harnesses' pinned page clock (`setFixedTime`, insight 166) freezes
Highcharts' redraw animation at its first frame (`docs/landmines.md`, *The fit gate and e2e*), where it measured "a
stale plot edge and half-drawn ticks". An update frozen at its first frame would still show the old heights, so that
alone could draw this picture; RC4a's columns whose entrance growth "froze at 0.1 px" (put down then to a host
re-render) fit it too. The only evidence `BalanceBar.tsx`'s header names is the look instrument's frame, so whether a
live browser, with its clock running, also drops the update is open. The fix below holds either way.

## Fix

`BalanceBar` keys its chart on the lattice (`key={JSON.stringify(props.lattice)}`), so a new scale builds a new chart
whose axis is the one its options state. `balanceBarOptions.test.ts` pins the shared scale in the options, and
`e2e/rc-screens.spec.ts` pins the picture: the two bars' DRAWN heights must stand in the ratio of their printed
figures, within 5 px.

## Key Insight

For any chart that compares, the claim is the drawn picture, not the options handed to the library. Pin the
comparison where the reader sees it (drawn heights against printed figures), because a correct options object can sit
under a wrong picture. When a chart's scale itself changes, building a fresh chart is the plain way to get the axis the
options state. And when a picture looks wrong only under a test harness, check what the harness changes (a pinned
clock, emulated fonts) before blaming the library.

## Also Applies To

- Any later side-by-side charts (RC6 onward, per the landmine in `docs/landmines.md`, *UI and product*): one scale,
  built not updated, and a drawn-geometry arm.
- [[127]]: an instrument that silently changes the page (a full-page screenshot dropping font emulation) can produce
  a convincing wrong picture.
- [[130]]: a chart's axis ceiling and ticks must come from one derivation, or the picture lies about the numbers.

## Extended (2026-11-25): the pinned clock also holds a DEFERRED data label at opacity 0 for good

Looking at `?seed=healthgap` with motion on, Health Care's cliff counts ("1 of 10", "2 of 10") were missing from every
capture: the bracket drew, the words did not. The DOM had them, dark, opacity 1; their parent group,
`g.highcharts-data-labels`, carried `opacity="0"`. A Highcharts label is deferred by default: its group starts at 0 and
fades in on the series' `afterAnimate`, and the harnesses' pinned clock (`setFixedTime`, `e2e/reviewSurface.ts`) never
lets that timer run. A plain `@playwright/test` page with a real clock read the same old code at 0 just after drawing
and at 1 by 1.5 s: his browser showed the counts after about half a second, never not at all. The near-miss was
calling it a product blank. The fix kept anyway is the fan chart's own rule for printed values, never deferred
(`b3123f8a`), set on the SERIES' `dataLabels`: a point-level `defer` is ignored (tried, still red).

What it adds: when a harness shows a chart word missing, run it once on an unpinned page before naming a product bug;
and with reduced motion on (as most arms run) a deferred label shows at once, so only a motion-on arm can see the fade.
