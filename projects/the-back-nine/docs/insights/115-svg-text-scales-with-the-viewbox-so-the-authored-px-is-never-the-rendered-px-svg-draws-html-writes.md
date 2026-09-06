---
title: SVG text scales with the viewBox, so the authored px is never the rendered px — measure what the reader sees, and let the svg DRAW while HTML WRITES
date: 2026-09-05
phase: Post-Act-4 — the 2026-09-04 ranked plan (item 12, the result charts' text layer)
modules: [src/viz/chartText.tsx, src/viz/chartText.css, src/viz/ConfidenceBand.tsx, src/viz/bandGeometry.ts, src/viz/OddsLadder.tsx, src/viz/RecommendationViz.tsx, src/viz/TwoFutures.tsx, e2e/chart-text.spec.ts, e2e/design-tokens.spec.ts, src/ui/__tests__/twoPaneHonestyFloor.test.ts]
tags: [svg, viewBox, text, legibility, html-overlay, chart-text-layer, measured-layout, glyph-constant, self-referential-oracle, clipping, csp, cssom, first-match-regex, fit-law]
---

## Problem

Every one of the four result charts (the confidence band, the odds ladder, the recommendation
comparison, the two-futures lever chart) authored its words as SVG `<text>` at 11–13 px inside a fixed
560-unit viewBox rendered at `width:100%`. On the phone the band's dollar ticks measured **6.9 CSS px**
against 17 px body copy; at the 1088 two-pane floor **8.0**; on Briggsy's 1536 window **10.0**. The
ladder's whole odds axis sat at 7.0–9.7. Three months of green suites never saw it: the two label gates
asserted the labels were PRESENT, and the de-collision suite derived its expected extents from the same
`LABEL_CHAR_PX = 6.6` the placer used. Worse, the phone's only channel to the band's dollar figures —
the touch-scrub readout — was svg text at 6–7 CSS px and vanished 600 ms after the finger lifted, while
the code comment beside it said the pin held. And the band's named moments (`Today`, `Work stops`) had
rendered at weight 400 in the muted tick fill since the U6 commit: the CSS rule was the compound
`.band-frame-text.is-strong` while the class pairing in the DOM was parent/child.

## Root Cause

1. **The authored size is not the rendered size when text lives in a scaled coordinate system.** A
   `font-size: 12.5px` on svg text in a 560-wide viewBox renders at `12.5 × figureWidth / 560`. Nothing
   in the repo ever asked what that product was; the only "floor" was a CSS comment reading `~6px`, and
   the plan-level contract (`docs/plans/2-first-answer.md`) named "a hard minimum text px" and never
   valued it.
2. **A glyph-width constant is a text metric hard-wired into geometry.** `LABEL_CHAR_PX`, `TF_AXIS_CHAR_W`,
   `TF_READOUT_CHAR_W` estimated advances per glyph so the placer could stack colliding labels — and the
   tests computed their expectations through the same constants (DND 012's shape), so raising any font
   size would have shipped real overlap with a green suite.
3. **Lifting svg text cannot be the fix.** The red team's decisive attack: an end-anchored `$2.25M` in a
   fixed 70-unit gutter, lifted to any legible size, clips LEFT and reads `25M` — a plausible WRONG dollar
   on the household's only position→dollar decoder (O3 permits no screen-reader tick ladder), while a
   `font-size × CTM ≥ floor` gate stays green. Legible-but-false is worse than illegible-but-true.

## Fix

**SVG draws, HTML writes** (council wf_ecbe0ab2-7bb, 8/10). The svg keeps geometry only — fan, median,
gridlines, rules, dots, bars, markers. Every word and numeral is HTML in a shared text layer
(`src/viz/chartText.tsx`): positioned by viewBox FRACTIONS (`--fx = x/560`, `--fy = y/H`) written as React
style-prop custom properties (CSSOM writes, which `style-src 'self'` does not govern — proven under the
served headers by `e2e/design-tokens.spec.ts`, with the style-ATTRIBUTE control blocked), anchored like
svg text, and sized on THREE borrowed registers (`--text-xs` 13 px ticks / annotations, `--text-sm`
emphasized labels + readouts, `--text-lg` the one display-face hero — insight 082: borrow a register an
equal-rank subordinate already wears, never a novel size). Collisions are resolved from MEASURED boxes
(`useCollisionLayout`: stagger named moments into rows, hide unnamed ticks that would overprint, push a
lower series label down) before paint, re-run on resize — no glyph constant anywhere, so no text metric
reaches an svg coordinate and the emitted `d` strings stay byte-stable at every width. The band's
annotation block moved in flow under a viewBox that gave up its 128-unit label gutter (500 → 380), so the
fit-law arms got SHORTER: 398 → 344 px on the 1536 window, 320 → 285 at the 1088 floor. The touch pin
gained the ladder's `pointerType` gate; the dead compound selector became the descendant it always meant;
the ≤260/280 px label-DROP guards were retired (a content loss with no permitted substitute, and nothing
scales any more). A real-Chromium gate (`e2e/chart-text.spec.ts`, on the fit harness so CI runs it)
asserts rendered px ≥ the token, containment in the card, pairwise non-overlap, nothing named hidden, the
text FOLLOWING the reader's browser font (the svg era shrank phone chart text from 6.88 to 5.99 as the
reader turned their font UP), reduced-motion identity — each with a planted CLIP and a planted shrink as
its control.

## Key Insight

- **Measure the RENDERED size of any text that lives in a scaled coordinate system, in the real browser,
  at every shipping arm.** `getComputedStyle(el).fontSize × hypot(getScreenCTM().a, .b)` is the number
  the reader sees; the authored px is a fiction. A gate that asserts presence is not a gate on
  legibility.
- **A per-glyph width constant in geometry is a text metric leaking into drawing.** It desynchronizes
  the moment any face, weight or size moves, and a test that derives its expectation through it is
  self-referential. Measure boxes; never estimate advances.
- **Text fails SAFE in HTML and DANGEROUS in svg.** HTML wraps, reflows and follows the reader's font;
  end-anchored svg text clips into a plausible wrong numeral. When a chart's words need to be legible at
  every width, move the words, not the floor.
- **The vertical dividend of moving text out of an svg is measured, not assumed.** Precondition the
  build on the HTML block's height against the gutter it replaces, at every arm, with the real strings —
  the council's blocking measurement found ONE row on every fit-law household and two on the scrolling
  date route, never three.
- **Value the floor where the law lives.** A "hard minimum text px" that is never valued is filled by
  whatever comment is nearest; the floor is now `--text-xs`, read from the stylesheet by the gate.
