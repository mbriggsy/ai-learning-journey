---
title: A screenshot proves ONE column — a per-width seat is governed by the WIDEST column, so a frame that looked great at the mid column hid the column-0 overflow; measure the catalog before reading a frame as proof, and re-derive any "impossible" before writing it down
date: 2026-09-06
phase: Post-Act-4 (the gap to a friend betting real money) — the council-held 320 shape, ruled by his eye and built the same day
modules: [src/viz/chartText.tsx, src/viz/ConfidenceBand.tsx, src/viz/OddsLadder.tsx, e2e/chart-text.spec.ts, docs/caddie/cold-read-log.md]
tags: [cold-read, screenshot-evidence, per-width-seat, measured-catalog, chart-text, oracle-vs-eye, arithmetic-check, the-room-is-not-the-ink, css-outlives-string, nowrap, inline-block, width-gate, overflow-wrap-anywhere, mid-word-break, caption-clipped, squeezed-table, coupled-axes, whole-combinations, text-swap, unreachable-member, plant-set, worst-product, single-axis-scaling, plant-first, household-acts, disclosure-state, wrong-axis, dpr, centering]
---

## Problem

His cold read of the eight held-320 captures ruled picture 08 — the 390 phone at the normal font, the scrub
readout pinned at the MID column, sitting inside the plot — "looks great", while 01/02/03 (the 320 arm, and
both phones at the reader's font) were crowded. The build then moved the phone's readout out of the plot too,
and the ink oracle was right to: at column 0 the readout's widest line is the degenerate today-range
`$1.055M – $1.055M`, which needs a box 31 px wider than the 38 % cap allows and paints ~18 px past its own
border. The frame he read never showed that column. Same day, the crown owner wrote into three docs that a
ceiling crown "would need a ~990 px figure" and so could never seat above its dot — the skeptic re-derived it:
~503 px against the 496 px the widest render gives, a SEVEN-pixel near-miss, not an impossibility.

## Root Cause

The seat has to be decided per WIDTH, never per column — a readout that flips in-plot ↔ flow while the finger
scrubs is jarring, and the flow row's reserve must be constant — so the widest column governs every column.
A screenshot samples ONE column of a 49-column catalog; "fits at the mid column" is not "fits". The eye sees
a frame; the mechanism is a catalog property. The ~990 px number was the same failure in arithmetic form: a
derived figure that licenses "structurally impossible" was written down without re-deriving it from the
geometry it claimed to summarize (headroom = 42/560 of the figure width, so the callout's 37.7 px needs
37.7 / 0.075 ≈ 503 px).

## Fix

Decide the seat from the MEASURED catalog: every column's lines are rendered stacked and hidden in the flow
row, `measureReadoutInk` reads the widest nowrap line and the widest column off that surface, `readoutSeat`
compares the box (ink + measured chrome) to the cap and to half the plot (`src/viz/chartText.tsx`), and the
gate re-derives the same predicate from live geometry on every arm and asserts BOTH seats were observed
across the arm catalog (`e2e/chart-text.spec.ts`). When the eye and the oracle disagree, go back to his eye
WITH the catalog in hand — the fork is recorded (accept the row on the phone, or narrow the widest
composition: a degenerate today-range collapsing to one figure in `composeReadoutLines`, then re-measure).
The honest lever back is the composition, never the room (architecture §12). For the arithmetic: the skeptic
re-derived every arm's headroom from `0.075 × figureWidth` before trusting the run, and the three surfaces now
carry the derivation and the near-miss framing.

## Key Insight

A frame is evidence about one sample; a per-width decision needs the whole catalog. Before reading a cold-read
capture as proof that a shape fits, ask what the WIDEST instance of that shape is and whether it was in the
frame — and write the capture's column/state into its caption so the next reader knows what it proves. And a
derived number that licenses "impossible" or "never" must be re-derived from the geometry before it is written
into a doc: an inverted factor of two turns a watch item into a false law.

## Also Applies To

Any per-width layout decision (the band's annotation rows, TwoFutures' end labels, the crown's headroom);
every cold-read capture set — the caption names the column, the seed and the root font; every "cannot fit /
never reaches / structurally impossible" sentence in a report or a doc comment.

## Extended (2026-10-30, Phase B's review) — a CSS rule written for one string outlives the string

`.strip-fact { white-space: nowrap }` was written for a "(62–70)" label no longer in the catalog, and it ran a
60-character fact off a 390 px phone (b9-3). A per-width rule is governed by the catalog's widest instance TODAY, not
by the string it was written for: when copy changes, re-measure every CSS rule keyed to its old shape. An
atomic-when-it-fits unit is `display: inline-block; max-inline-size: 100%` (`intake.css`), never `nowrap`.

## Extended (2026-11-23, the workbench's U7 slice 3) — the converse: a width gate on the widest member proves widths, never words

The year-by-year table's fit arms were built the way this insight says: plant the widest household
(`?seed=tablewidest`, every column, two 20-character names), measure the page and the frame at 1280 and 1440, both
views. The first run caught a real overflow (the year column's two names on one `nowrap` line, 261 px: 1280 scrolled
sideways by 47 px). After the fix every width law passed, and a screenshot at 1280 then showed what no width can
see: headers broken mid-word ("Christop / her", "Spendin / g", "Securit / y"), because `overflow-wrap: anywhere` lets
an auto-layout table shrink a column below its longest word, and the phone's caption cut off at the frame's edge,
because a `<caption>` is as wide as the scrolling table. Both read as broken; both were green.

**The lesson, both halves together:** a frame proves one column (this insight), and a width proves no word. Judge
a squeezed layout by measuring its widest member AND looking at it at the squeeze, and measure the real margin as the
table's narrowest width (a frame squeezed in-page) against the room, not "it fit": the honest whole-word fix needed
a 12 px gutter in place of 16 px to keep 81 px of room (9 px without it, and less beside a classic scrollbar). The same
look later caught U7's review's phone finding: row sentences in a cell as wide as the table, cut the same way.

## Extended (2026-11-21, the frames-outside build): read the catalog whole, combinations included, and cheaply

Two refinements of "measure the catalog". **Axes can be coupled:** the frames-outside check's adversary found the
essentials-relief face missing from the widest-member table, and the rules reader found it coupled to the room clause
(a budget stops the spend lane, `memoryModel.ts`'s `dispatchSpend` guard, so a room frame with the relief face shows
the figure-less clause, never the pending reserve, and the relief face folds the survivor card shut). Taking each
axis's widest member alone would have planted a household no one can reach: read whole combinations through the
rules that join them. **A member assumed unreachable is tried through the engine before it is skipped:** the plan said
the room class could never show the essentials card; one engine twin showed an essentials budget turns the full
reading On track and earns it. **A closed axis can be read without a seed per member:** swap the node's text for the
shipped composer's string in the real frame (`composeVerdictMedicareResidual`, `slots.verdictRoom*` written into
`.cs-medicare-residual` / `.cs-magnitude`), 13 members in two page loads, and prove the swap once against a real
render (736.05 px swapped and rendered on one plant, 763.94 and 763.94 on the other).

## Extended (2026-11-23, the one-frame composites and frames-outside builds): the catalog has more axes than the seed set, and a gap needs its axis derived

The fit law's catalog kept turning out larger than the plants that were supposed to represent it.

- **The plant set held one base seed's answers, not the tallest frames real households reach (b9-3, 2026-11-20).**
  Every priced and record plant spread `retired`'s ENTERED Medicare extras, so the "not sure" residual (two lines
  longer, +41.6 px), the yearly return's echo, Pennsylvania's longer clause and the record card were never planted
  together. The re-point's U3 read "no rung needed" off that set and passed; real composites breach 731 by 6 to 68 px
  (the register's Tier 0 *The tallest real composites…*). Before calling a law's arms complete, list the content
  dimensions that lengthen the frame and plant their worst product.
- **Scaling one input holds every other axis at its base's member (b9-8, the frames-outside review).** U1's 24
  six-character twins scaled dollars only, kept each base's state clause and residual form, and read "all inside"; by
  U1's own member table (20.8 px a residual line) an off-track Pennsylvania household no seed carried reads about
  736. Round 1's fix repeated it, filing that household with both members on "not sure" (757 with one named alone) and
  leaving class C's widest out (802). Vary every closed axis, or say the reading is width only.
- **Read the plants before restoring an assertion (b9-8, rung 3's build).** The rung-3 council ruled its key on the
  frames it knew. Its red team's "plant first" order, run on real engine seeds, found two frames no dossier had: the
  off-track return (`yearofftrack`, 732.9 px, the `trim` direction, which needed its own selector entry to reach 722.5)
  and a fresh Pennsylvania already-failing frame (`pafailingtypical`, 736.0, with no echo and no class to key on, so a
  new stop). Restoring `yearfailing`'s assertion first would have turned the gate green over both. A council's key is
  only as good as the catalog it was read against (verdict state × extras form × state × clock).
- **The household's own acts are frame states (b9-9, round 3).** A survivor fold the household opens (one click, in the
  left column's flow, unkeyed, so it stays open through later answers) put "this can be wrong" 132 px further down on
  `budget` (706.2 to 838.3 px), and the one arm that opened it did so after its fit, to read a line's text. List every
  state a household can put a frame in (a fold, a panel, a second tab, a failed save), not only the states a seed lands
  on; an arm that opens a disclosure re-reads the fit or names why the opened frame is outside the law.
- **A gap read off two sizes that differ in more than one axis gets named by the wrong axis (b9-8, the review's F5).**
  The frames-outside U4 called SHOWCASE's lower doors (1871×917 @1 against LENOVO_FULL's 1440×900 @2) a DPR effect.
  The two sizes also differ in width and height, and `.result` centers a frame shorter than the window: every probe pair
  matched (H − 80 − C) / 2 to 0.1 px. The wrong cause reached a landmine, the plan's As built note and two register
  entries in a day. Derive a gap from the layout before naming the axis that caused it.

**What the five add:** the catalog is the product of every axis that changes the frame, including the household's own
acts and the window's every dimension, and a reading taken by moving one axis speaks for that axis alone.
