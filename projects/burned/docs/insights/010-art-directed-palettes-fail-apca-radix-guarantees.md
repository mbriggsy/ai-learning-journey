---
title: Art-directed palettes fail Radix APCA guarantees without significant lightness adjustments
date: 2026-04-12
phase: css-foundation-rebuild/phase-1
modules: [src/client/shared/tokens/primitives.css]
tags: [apca, wcag, radix, cvd, color, accessibility, palette]
---

## Problem

Phase 1 plan budgeted "± 5-10 perceptual units on at most 1-3 values" for CVD/contrast tuning of the Dreamland-extracted palette. Actual result: ~15 values needed adjustment across all 6 scales, with step 11/12 values needing 20-40% lightness bumps to hit Radix's APCA Lc 60/90 guarantees.

## Root Cause

Radix's 12-step scale convention guarantees step 11 text has Lc 60 against step 2 bg, and step 12 has Lc 90. These are _designed_ guarantees — Radix tunes their scales to hit them. Art-directed palettes extracted from film frames have no such tuning. Dreamland's muted, warm aesthetic produces step 11/12 values that look correct as scene colors but are too dark for APCA text-on-background thresholds.

Additionally, medium-lightness step 9 values (solid backgrounds for buttons/accents) create a "donut hole" where neither dark nor light foreground text can satisfy both WCAG ratio AND APCA Lc simultaneously. APCA and WCAG disagree on dark-on-medium pairings — WCAG passes at 5:1 while APCA fails at Lc 38.

## Fix

1. Pushed all step 11/12 values lighter (computed via oklch lightness boost preserving hue/chroma)
2. For step 9 fg-on-* pairs where APCA and WCAG disagreed, chose the fg color that passes both at the correct text tier (reclassified drama/neon/warning as "large" tier since actual usage is display text)
3. Emerald-9 lightened to separate from cordovan-9 under CVD simulation (luminance-based, since hue collapses under deuteranopia)

## Key Insight

**If your palette is art-directed (extracted from reference art, not algorithmically generated), budget 3-5× the tuning you expect for accessibility compliance.** Radix guarantees are engineering constraints that conflict with aesthetic extraction. Plan for step 11/12 to need significant lightening, and for step 9 fg-on-* pairs to need per-pair tier classification based on actual component usage.

## Also Applies To

- Any project extracting colors from film/photography/illustration references
- Dark theme palettes where step 2 backgrounds are very dark (< L 0.15 oklab)
- CVD-critical pairs where red and green accents must separate by luminance, not hue
