---
title: Four measurement instruments that answer a different question than the one asked — `document.fonts.check`, `getBBox` on svg text, a first-match regex over CSS text, and a `:not(:checked)` locator asserted after the click
date: 2026-09-05
phase: Post-Act-4 — the 2026-09-04 ranked plan (item 12, the result charts' text layer)
modules: [e2e/chart-text.spec.ts, e2e/design-tokens.spec.ts, src/ui/__tests__/twoPaneHonestyFloor.test.ts, src/viz/__tests__/ConfidenceBand.test.tsx, temp/chart-text (kept)]
tags: [instrument, vacuous-check, fonts-check, getBBox, em-box, canvas-measureText, getComputedTextLength, first-match-regex, css-comment, playwright-locator, re-resolve, oracle]
---

## Problem

Four different checks in one day's work reported a confident answer to a question they had not been
asked, and each would have been believed without a control arm:

1. `document.fonts.check('400 12.5px "Source Sans 3"')` returned `true` — and so did the same call on
   `"Definitely Not A Real Face"`. The API answers "can this be rendered, fallback included", not "is
   this face loaded". A measurement of glyph advances taken on that assurance could have been a
   fallback face's.
2. `getBBox()` on an svg `<text>` reported the ladder crown's two lines OVERLAPPING by 3–5 units. They do
   not: `getBBox` returns the font's em box (ascent + descent), not the ink. Canvas `TextMetrics` on the
   same strings gave a 4-unit visible gap.
3. `src/ui/__tests__/twoPaneHonestyFloor.test.ts` read the band's label-drop threshold with
   `/@container\s*\(max-width:\s*([0-9.]+)px\)/` — a FIRST-MATCH regex over the stylesheet text. When
   the rule was retired and a comment recorded its history, the regex matched the COMMENT and the gate
   went green on a rule that no longer existed.
4. `e2e/chart-text.spec.ts` clicked `.control-policies input:not(:checked)` natively and asserted the
   same locator `toBeChecked()`. Playwright re-resolves a locator at assertion time; once the radio
   committed it no longer matched `:not(:checked)`, so the locator pointed at the NEXT unchecked radio
   and the assertion failed on a click that had worked.

## Root Cause

Each instrument's contract is narrower than the sentence the caller wrote over it: `fonts.check` is about
renderability; `getBBox` is about layout boxes; a regex over source text does not know rule from comment;
a locator is a query, not a handle. The failure is invisible because the instrument returns a
well-formed value — a boolean, a rectangle, a number, an element — that LOOKS like the answer.

## Fix

- Prove a face is loaded through `document.fonts` entries with `status === 'loaded'` and
  `getComputedStyle(node).fontFamily` on the node itself; run the negative control (a fake face) to show
  the check can fail.
- Measure ink with canvas `measureText` (`actualBoundingBoxAscent/Descent`) and advances with
  `getComputedTextLength()` (user units, scale-invariant — proven by the same string measuring 31.72
  units at three different CTM scales); treat `getBBox` as the layout box it is.
- A source-text pin must match RULE position (`selector\s*\{`) and strip comments before it tests for
  absence; the retirement test in `twoPaneHonestyFloor.test.ts` now does both.
- Pin a Playwright radio by an attribute that survives the click (`[value="…"]`), never by the state the
  click changes.

## Key Insight

- **Run the negative control on any instrument before trusting its positive.** If a check cannot return
  false for a known-false input, it is not checking what its name says.
- **Ask what a measurement API measures, in its own words**, before reading its number as the quantity
  you named: em box ≠ ink; renderable ≠ loaded; matched text ≠ live rule; resolved element ≠ the element
  you clicked.
- **A first-match regex over a stylesheet is a landmine every time a block is inserted above its
  target** — this is the third such gate in this repo (the two-pane floor, the band's non-scaling-stroke
  pin, and the drawer-chrome shape); anchor on the rule and comment-strip first.
