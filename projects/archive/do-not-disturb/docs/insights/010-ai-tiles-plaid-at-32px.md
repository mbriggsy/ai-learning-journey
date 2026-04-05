---
title: AI image generation produces plaid/artifacts for seamless tiles at 32x32
date: 2026-04-02
phase: Phase 7
modules: [scripts/generate-assets.ts, scripts/generate-floor-tiles.ts]
tags: [imagen-4, tile-generation, pixel-art, sharp, seamless-tiling, floor-tiles]
---

## Problem

All 7 AI-generated floor tiles (Imagen 4, 1024x1024 downscaled to 32x32) were unusable: horizontal wood planks became plaid/tartan, carpets had random blobs or figures in the center, kitchen tile was an octagonal ring instead of checkerboard, bathroom was confetti dots. Every tile looked "like something" at generation size but broke completely at 32x32.

## Root Cause

AI image models optimize for visual plausibility at generation resolution, not for mathematical tileability. The two-stage downscale (LANCZOS 1024->128, NEAREST 128->32) merges fine details into chaotic patterns at the target size. Floor textures need sub-pixel precision in their repeat structure — a 1px seam line at 32px must land at exactly the right position across the entire tile. AI can't guarantee this, and the downscale amplifies any misalignment into visible artifacts.

Characters, furniture, and walls worked fine because they're single distinct objects — no seamless tiling requirement.

## Fix

Created `scripts/generate-floor-tiles.ts` — draws all 7 floor tiles pixel-by-pixel using Sharp raw buffers and master palette colors. Zero API calls, zero cost, deterministic output. Runs as `pnpm assets:floors`, slotted into `assets:pipeline` after `assets:process` so programmatic tiles overwrite AI tiles.

## Key Insight

AI image generation works for **distinct objects** (characters, furniture, props) but fails for **seamless tileable textures** at pixel-art scale. The smaller the tile, the worse it gets — there's no room for the AI's approximation errors. Any texture that must repeat exactly (floors, terrain, patterns) should be generated programmatically. Reserve AI for assets where "close enough" is fine and exact pixel placement doesn't matter.

## Also Applies To

Any future tileable texture: terrain variants, water tiles, wall patterns. If it tiles, draw it with code. If it stands alone, use AI.
