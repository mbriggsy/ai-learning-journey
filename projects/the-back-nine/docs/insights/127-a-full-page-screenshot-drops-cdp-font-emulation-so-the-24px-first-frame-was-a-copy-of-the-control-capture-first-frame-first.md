---
title: A Playwright fullPage screenshot drops CDP Page.setFontSizes emulation, so a "24 px first frame" captured after it was a byte-identical copy of the 16 px control — capture the first frame FIRST and re-assert the root px before every capture
date: 2026-09-10
phase: Post-Act-4 (the gap to a friend betting real money) — the eye's evidence for the 24 px ruling
modules: [e2e/held/council-24px-shots.spec.ts, e2e/vertical-fit.spec.ts]
tags: [screenshot-evidence, CDP-setFontSizes, fullPage, emulation-reset, md5, his-eye, instrument, claim-vs-tree, routed-around-artifact, crop, caddie]
---

## Problem

The eye's evidence bundle for the 24 px ruling was shot as `fullPage: true` first, then the
viewport-only "first frame". The claim-vs-tree lens of the adversarial review reported that the 24 px
first frame handed to Briggsy's eye was byte-identical to the 16 px control's first frame. An md5
confirmed it (`5c62e09e…` on both), while the two full-page captures differed.

## Root Cause

Chromium's full-page capture temporarily overrides device metrics to the document's full height
and restores them afterwards; that round trip discards the per-target `Page.setFontSizes`
emulation (the same reason the fit arms send it on a cheap bare `/` navigation and pin the root px
AFTER navigating). The second capture therefore rendered at 16 px in a 24 px-labelled file. The
measured FACTS printed beside it were correct — they were read before the full-page capture — so
the log looked right while the picture lied.

## Fix

The throwaway harness was replaced by a tracked instrument, `e2e/held/council-24px-shots.spec.ts`
(never a gate — vitest excludes `e2e/`, `verify:fit` allowlists its specs, and since 2026-09-11 the CSP
harness's denylist names `held/` under the partition gate of insight 128; this first cut lacked that
entry, so `verify:csp` collected it against `dist/` and CI ran red for three commits): the
first-frame shot is taken BEFORE the
full-page shot, and the root px is re-asserted immediately before EVERY capture, so a dropped
emulation reds the instrument instead of producing a plausible file. The 24 px first frame now
hashes differently from the control and shows enlarged type in the stacked single column.

## Key Insight

Emulation is state the browser may silently reset; any capture or measurement taken under it must
re-verify the emulated quantity at the moment of capture, not once at setup. An artifact for a human
eye needs the same falsifiability as a gate — a screenshot whose caption says "24 px" is a claim,
and md5 against the control is the cheapest refutation. Order the captures so the fragile one comes
first, then prove each one anyway.

## Also Applies To

- `page.emulateMedia`, `setViewportSize`, `deviceScaleFactor` and `prefers-reduced-motion` under
  full-page captures or PDF export — re-check after any capture that touches device metrics.
- Caddie walk bundles: any two frames that should differ but hash equal are a harness bug before
  they are a product observation.
- Any "before/after" pair for his eye — hash both; identical means the instrument, not the product.

## Extended (2026-10-30, the U10 Caddie card) — a capture artifact readers route around is still a hole

`crop-w-row.png` had painted the landing over its top third since U8 — the crop was taller than its sheet's scroller,
a limit the harness's own docblock named. Four seats quietly read `copy.txt` instead, and the color lane had never
screened that row (b9-7; fixed in `e9fd7636`: the walk crops tall sheet rows in segments). A reader who routes around
an artifact is reporting a broken instrument. **When a seat says "I read it from the text instead", the capture is
the finding** — fix it before trusting any verdict the capture was meant to carry.
