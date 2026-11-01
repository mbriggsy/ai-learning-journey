---
title: A live-updating region above interactive content shifts tap targets mid-gesture — reserve its box
date: 2026-06-11
phase: P2 (D1 — the account-level intake)
modules: [intake]
tags: [layout-shift, tap-target, race, answer-strip, e2e, playwright, mobile, calm-ui, scroll-anchoring, overflow-anchor, chromium, coordinate-tap, probe-geometry, tall-screen, blur-commit, gesture-hold, control-inside-the-change, keep-door, pay-check]
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

## Extended (2026-10-31, the pay check's tap race, b9-10 and b9-1) — the browser hid the shift on his screens, so test where it can't; and a control inside the change is lost on every screen

The working-year figure saves when its box loses focus, and a press or tap on the next control is what takes focus off the box. On a stale face that save changes content above the control in the middle of the tap: the walk's stale note goes away (139–158 px), or the panel's money picture appears (842–909 px). A real-Chromium probe that taps by screen position (`tapProbe2.mts`, b9-10) landed all 19 taps on his 1536×791 window, his 1536×960 full screen, his 448×891 phone and a 390×844 phone, with the target mid-screen and pinned to the bottom. Chromium's scroll anchoring did that. When content changes height, the browser picks something on screen and shifts the scroll so that thing stays put, so the control moved 0–1 px. On a 1536×1300 window (mouse) and a 1024×1366 touch screen, 4 of 5 taps missed, and 7,000 meant as a month stood as $7,000 a year, unasked. In every miss, something ABOVE the change shared the screen with the target, so that is what stayed put: the panel row's value line (28 px showing), or the walk's whole note with the page above it (scrolled 33 px and 0, against a 139 px shift). On his full screen neither was on screen, and both taps landed.

The note's own "Keep $84,000 a year" button lives INSIDE the note, so the same press removed it before the click. It was lost 4 of 4 times on his 1536×791 window and 448×891 phone, the screens where every period tap had landed. Anchoring can keep a control that moved, but never one that is gone.

A reserved box could not cure this, because the content has to change. So the cure holds it in time instead: `useGestureHold` (`src/intake/gestureHold.ts`) keeps the face drawing what it showed at the press until that press's click. A held button must act on what it shows. The door writes the $84,000 it names, because the live figure was already the blur's $7,000. That one value is an exception to insight 036's rule that a click handler reads the live state; everything else, including whether the door is offered, still reads live. After the cure, the four missed taps land 4 of 4 and the door keeps 4 of 4. Anchoring kept every tap on his screens before the hold existed, so never switch it off (`overflow-anchor: none`) above such a face.

The lesson: when the platform already corrects a failure on most screens, a clean probe shows only that the correction worked where you looked. Pinning the target low was not enough: all 11 low taps on the shorter screens landed. Work out from how the correction works where it cannot reach (here, something above the change on screen with the target, which took a tall screen) and measure there. Write the geometry beside each verdict, and make it the test's floor, checked before the tap. The four tall `verify:fit` arms do this, and the panel arms run 100 px taller because the probe's screens left only 28 px of slack. And ask first whether the target can sit inside what changes: a correction that moves things cannot save a thing that is removed.
