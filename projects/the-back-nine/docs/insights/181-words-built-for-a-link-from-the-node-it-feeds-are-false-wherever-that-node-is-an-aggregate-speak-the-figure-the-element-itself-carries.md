---
title: Words built for a link from "the node it feeds" are false wherever that node is an aggregate — every Sankey link into Total inflows spoke the total, so hovering "Pay, Sam" said $110,000 for a $35,000 flow and the screen reader heard 7,833 wrong descriptions across the seeds, under an options test whose words were all stubbed; speak the figure the element itself carries, and sweep a reused line for its own nouns
date: 2026-11-26
phase: Act 6 RC20's whole-unit review (b9-7, Cash Flows → Maps)
modules: [src/ui/screens/retirement/mapsView.ts, src/viz/charts/sankeyOptions.ts, src/ui/screens/retirement/__tests__/mapsView.test.ts, src/viz/charts/__tests__/sankeyOptions.test.ts]
tags: [sankey, highcharts, accessibility, screen-reader, descriptionFormatter, link-words, aggregate-node, to-text, hover, aria-hidden, stubbed-words, options-test, deixis, reused-copy, sibling-view, calm-but-wrong, per-element-pin, every-seed]
---

## Problem

RC20's Maps tab draws one year as a Sankey: each inflow (Pay, Sam; Social Security; withdrawals) runs into a Total
inflows node, which splits into groups and then their parts. Each link carried a `spoken` sentence: the hover text and,
through the accessibility module's `point.descriptionFormatter`, what a screen reader hears for that flow. Hovering
"Pay, Sam" said about $110,000. The flow was $35,000; $110,000 was the year's total inflow. The node labels drew the
right figures, every label check passed, and the options test was green.

## Root Cause

Every link spoke its target node's words (`to.text`). For a link into a part (Expenses → Housing) the target's figure
IS the flow, so the shortcut held on most of the chart. For the links into Total inflows the target is an aggregate:
its figure is the sum of every link into it, so each of those links spoke the total. And in Highcharts' Sankey the
links are the described points while the data labels are `aria-hidden`, so for a screen-reader user the link sentences
were the whole chart. Across the dev seeds that came to 7,833 wrong descriptions. Nothing read the words: the options
test stubbed every one as 'a' or 'b', so it proved the wiring and never the content.

## Fix

`e992e9d6`: each link speaks the node whose figure the flow carries: its source for a link into Total inflows, else
the node it feeds (`mapsView.ts`, `slots.mapsLinkWords(from, to, carried.text)`). `mapsView.test.ts` pins every link
over every seed: its words name the carried node's figure, and that node's dollars equal the link's drawn width.

## Key Insight

An element's words must come from the figure that element carries. "Name it after the node it feeds" is a shortcut
that holds only while the target's figure equals the flow; it goes false at every many-to-one join (a total, a merge,
a group), and those are exactly the joins a flow chart exists to show. Test the words per element against that
element's own amount; a test that stubs the words checks wiring, never meaning. Where the drawn labels are hidden from
assistive tech, the per-element descriptions are the chart for that reader, so they carry the whole honesty contract.

The same review found the copy form of it: a sentence reused from a sibling view keeps that view's pointing words.
Lines lifted from the Cash Flows table said "In this table", "this year's pay" and "the Income tax column" on a map that
has no table, no single pay figure and no column. When a line moves to a new view, read every "this", "here",
"column" and "below" against the new screen ([[160]]: a line's meaning is set by what renders beside it).

## Also Applies To

- Any flow or tree chart whose links or edges get words (a Sankey, a waterfall's connectors, an org or account tree):
  check the words at each join where several flows meet.
- Tooltips and point descriptions built from a shared formatter: the formatter's "the point" may be the series total
  for some series kinds.
- Any per-element `aria-label` composed from a parent or neighbour (a table cell from its column total, a list item
  from its group): pin it per element over real data.
