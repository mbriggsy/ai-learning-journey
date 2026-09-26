---
title: "A frozen NOMINAL figure in a REAL-dollar engine is INDEXED until it is deflated — 'frozen' and 'flat-real' are opposites; and a `min(cap, tier)` only binds on the cap when the cap is the smaller arm, so measure before predicting 'no change'"
date: 2026-09-24
phase: Act 4 hardening (the Social Security-thresholds Tier 0 — filed by a scout, built the same day)
modules: [src/engine/priceIndex.ts, src/engine/taxCore.ts, src/engine/taxOverlay.ts, src/engine/magiLandscape.ts, src/engine/constants/tax.ts, src/engine/__tests__/ssThresholdDeflation.test.ts, src/ui/devSeeds.ts]
tags: [real-vs-nominal, frozen-thresholds, social-security, section-86, price-index, cpi, calm-but-wrong, rosy-direction, measure-first, min-cap, dev-seeds, re-tune-precedent]
---

## Problem

The §86 Social Security taxation thresholds ($32k / $44k MFJ) are frozen by statute — never indexed — and the
engine's constant said so ("Thresholds firm-frozen"), the architecture doc said so ("which is *why* more retirees are
caught each year — modeled honestly, not a bug"), and the research strand said so. Everyone agreed the law was
frozen. The engine compared those NOMINAL constants to provisional income it carries in REAL (today's) dollars, in
every sim year, with no deflation anywhere. A real-dollar engine holding a threshold flat is INDEXING it: the real
line never fell, so every later year taxed fewer benefit dollars than the law taxes — the rosy direction, growing
with the horizon. Three documents described the law correctly while the code did the opposite, and the word
"frozen" in all three is what hid it: to a reader, frozen means "does not move", and flat-real does not move.

## Root Cause

Two ideas wearing one word. "Frozen" is a statement about NOMINAL dollars. The engine's whole world is REAL
dollars (real returns, real spending, real benefits). A nominal figure that does not move is a real figure that
FALLS at the price level, so the honest real-dollar implementation of "frozen" is "deflate every year" — the
opposite of leaving it alone. Nothing in the tree had a name for the price level (the Part B schedule accumulated
its own deflator inside one function), so there was no object a reviewer could point at and ask "and which figures
divide by this?". The second miss was the pilot's own pre-build prediction: "above ~$44k of provisional income the
85 % cap binds in both worlds, so the spine seeds will barely move." The inclusion is `min(0.85 × benefit,
tier arm)`; with a $54k benefit the cap is ~$46k while the tier arm on a ~$50k provisional is ~$12k — the TIER binds
by a factor of four, and the deflated lines move it every year. The prediction compared the provisional to the
threshold and never to the cap's own size.

## Fix

`src/engine/priceIndex.ts` — `cumulativePriceIndex(calendarYear)`, the ONE cumulative price level by calendar year
(the Trustees' near-term CPI-W average through the printed Part B table's edge, the ultimate rate beyond; identity
at and before the 2026 table anchor; the same running product the Part B schedule accumulates, pinned equal at every
table year). `taxableSocialSecurity(other, ss, filing, calendarYear)` — a REQUIRED fourth argument; both nominal
thresholds divide by the index inside the function, so its two live callers (the gross-up fixed point and the MAGI
landscape's rails) cannot diverge. Red-first: the year-20 hand worksheet on the deflated lines (4,000 → 15,781
taxable on a fixed $40k provisional) against a `Math.pow` oracle, monotone-in-year, continuity at the deflated kinks,
the above-the-cap invariance, both fail-loud guards. Measured at the shipped inputs before touching a seed:
`retired` 0.8585 → 0.8425 (9/10 on-track → 8/10 borderline), `borderline` 7 → 6 off-track with a $1,310/mo trim,
`datesplit`'s floor crown 2 → 3. Then the band-named seeds were re-tuned to their named states by the file's own
2026-07-19 precedent (record first, re-tune second): the retired IRA 1.055M → 1.120M, borderline 760k → 800k,
budget's override 720k → 760k, datesplit's trad 900k → 925k — each docblock carries the before, the probe grid and
the chosen margin. The three docs were made true by saying HOW it is modeled, never by softening the law.

## Key Insight

**When a real-dollar engine consumes a figure the law FREEZES in nominal terms, "frozen" means "divide by the price
level every year" — leaving it flat is indexing it, the rosy way. Name the price level ONCE as an object, then ask
of every nominal-anchored constant in the tree: does it divide by this, or should it?** And before predicting that
a change "won't move the headline", find the binding arm of every `min` / `max` on the path and compare like with
like — a cap that scales with the benefit is far from a threshold that scales with nothing. The measurement is the
prediction's judge; write the prediction down so the measurement can refute it in the record.

## Also Applies To

Filed as ONE Tier 0 register entry after this build's 17-agent review found the sweep short (the build's own
insight named one sibling; the review found three more — the sweep is the deliverable, again): the NC standard
deduction (fixed, not indexed — subtracted flat every year, ~$320/yr of NC tax rosy by year 20, the largest),
the OBBBA senior bonus ($6k / $75k / $150k, nominal for 2025–28), the IRMAA top tier (frozen through 2027 and
re-indexed from that base — the real line holds ~3 % under $750k from 2027 on, EVERY year, not the "one year"
first written), the HSA catch-up ceiling. NOT the ordinary brackets, the standard deduction or IRMAA tiers 1–4 —
those index by law, so flat-real is right; the test is "does the statute index it?", not "is it a dollar figure?".
The review also caught the pilot's own refuted prediction left standing in architecture §7.1 and a test title
after the measurement had disproved it — a wrong sentence written BEFORE the data must be hunted down AFTER. Any future
frozen-nominal figure (a net-investment-income-tax threshold — $250k MFJ, frozen since 2013 — if NIIT ever lands;
the Medicare surtax lines) must be born dividing by `cumulativePriceIndex`. The seed-retune law generalises: a
dev seed named for a band is a fixture with a purpose; when the engine's truth moves it out of that band, RECORD
the move at the old inputs in the seed's docblock, then re-tune the smallest knob that does not disturb the
figures other pins quote (the IRA moves the verdict; spending would move the health-sheet MAGI too).
- **Refinement, 2026-09-25 (the frozen-nominal siblings, register CLOSED):** "deflate by the index" means the
  index of the year whose income the figure is COMPARED with — not the year the figure is published for. The
  NC deduction, the senior bonus and the HSA catch-up meet same-year income, so the sim year's index is right
  (built). The IRMAA top tier meets MAGI two years older, so its frozen $750k was already exact through 2027;
  deflating it by the bill year was built, then refuted by the review before commit.
