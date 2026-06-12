---
title: A live-updating region above interactive content shifts tap targets mid-gesture — reserve its box
date: 2026-06-11
phase: P2 (D1 — the account-level intake)
modules: [intake]
tags: [layout-shift, tap-target, race, answer-strip, e2e, playwright, mobile, calm-ui]
---

## Problem

The retargeted CSP e2e walked the real intake and a segment tap silently
no-opped: the spouse's "Already retired" radio never checked, so the stop-age
field never appeared and the walk timed out. The component was correct — the
same tap worked in isolation and in jsdom tests.

## Root Cause

The provisional answer strip sits ABOVE the questions and re-renders on every
question commit (its "still needed" list shrinks as facts land). Each content
change changed the strip's height, reflowing everything below. The failing tap
was aimed while a just-fired blur-commit was resizing the strip: Playwright
resolved the label's coordinates pre-shift and the mouseup landed on whatever
moved into that spot. A human thumb hits the identical race — blur fires on
touch-start of the new target, the strip resizes, and the finger lands one
control off.

## Fix

`.answer-strip { min-block-size: 7.5rem }` — the strip's tallest common state
is reserved up front, so content swaps happen inside a fixed frame and nothing
below ever moves on a commit. (The e2e additionally activates sr-only radios
via `check({ force: true })`, which is coordinate-free — belt and braces for
the spec, but the component fix is the real one.)

## Key Insight

A surface that updates on every commit and sits ABOVE the controls being
committed is a layout-shift generator aimed exactly where the user is about to
tap. "Calm" is not just a tone property — it is a hit-target property: any
live region (answer strips, validation summaries, progress detail) needs a
reserved box, or every update becomes a mid-gesture target shuffle. Visual
diffing and jsdom tests cannot see this class; only a real-browser walk with
coordinate-based input does.

## Also Applies To

- The D2 date surface and the U6 band reveal (both live above the controls
  that refire them).
- Any toast/banner that pushes content rather than overlaying it.
- The N=1 phone cold-read: watch for content "pulsing" above the keyboard.
