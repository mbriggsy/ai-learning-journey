---
title: Imagen 4 renders decorative borders that survive chroma-key
date: 2026-04-02
phase: Phase 7
modules: [scripts/image-processing.ts, scripts/process-assets.ts]
tags: [imagen-4, chroma-key, sprite-artifacts, edge-border, character-flash]
---

## Problem

3 of 52 character animation frames had a visible 1px opaque border around the entire 32x32 canvas. During animation playback, these frames caused a periodic "flash" — the border appeared and disappeared as the animation cycled through clean and contaminated frames.

## Root Cause

Imagen 4 occasionally renders decorative borders or frames around generated characters. These borders use dark palette colors (brown `74,55,40`, dark red `139,26,26`, black `0,0,0`) — not magenta. Since chroma-key removal only targets magenta-like colors, the borders survive the entire processing pipeline.

The contaminated frames were:
- `char-hider-walk-e-02.png` — bottom row + right column (63 border pixels)
- `char-hider-walk-e-04.png` — all 4 edges (124 border pixels)
- `char-hider-walk-s-04.png` — bottom row + right column (63 border pixels)

## Fix

Added `stripEdgeBorder()` to `image-processing.ts` — clears alpha on the outermost 1px border of the canvas. Runs after `cleanAlpha` for all sprites that had chroma-key processing. Clean frames have no pixels on the edge (verified: character bodies never touch canvas boundary), so this is a no-op for them.

## Key Insight

AI image generators can produce non-background decorative elements (borders, frames, shadows) that use the subject's own color palette. Chroma-key only removes the *background color* — palette-colored artifacts survive. For pixel-art sprites where the character should never touch the canvas edge, stripping the outermost pixel row/column is a safe, universal cleanup step.

## Also Applies To

Any future AI-generated sprites. Consider making edge-strip the default for all chroma-keyed assets.
