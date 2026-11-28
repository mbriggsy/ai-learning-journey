---
title: A frame law borrowed onto a seed outside the law's own list may never have held there — `surpluswidestrelief`'s ACTION ITEMS handle sat at 766.0 px of 731 before any repeat was entered, so an outright assert would have blamed the change for a fault it did not make; measure the frame before the change, on the same seed and page in the same test, and hold each bound only where it held
date: 2026-11-27
phase: The RightCapital mandate, gap 4 (a line's repeat and rate): U15's fit arm (b9-16, `a7b97513`)
modules: [e2e/rc-screens.spec.ts]
tags: [fit-arm, frame-law, one-frame-law, borrowed-law, seed-list, RC4_FRAME_SEEDS, before-and-after, before-measure, baseline, pre-existing, action-items-handle, surpluswidestrelief, widest-names, print-both-readings, wrong-contract, register-filing, conditional-bound]
---

## Problem

Gap 4's U15 made Probability's spending clause longer, so its fit arm (`e2e/rc-screens.spec.ts`, "Gap 4 · U15") ran
on the longest clause a repeat can make: `?seed=surpluswidestrelief` (retired, a budget, room to spend more, the widest
names) with its Travel line set to repeat every 5 years. At his 1440×731 window the arm checks RC4's one-frame law: the
key-metric column, the halves, the one caveat and the ACTION ITEMS handle all inside the first frame. But RC4 holds that
law on eleven seeds (`RC4_FRAME_SEEDS`), and `surpluswidestrelief` is not one of them. Measured before any repeat was
entered, its handle sat at 766.0 px, 35 px below the frame.

## Root Cause

A law is asserted on the seeds where someone measured it holding. Carrying it onto a new seed assumes it holds there
too, and nobody had checked. Asserted outright, the handle bound reds at 766 px whatever U15's words do, so the change
takes the blame for a fault it did not make, and each easy way out loses something: loosen the bound, trim the words
(a content cut), or drop the seed (the widest case). A check that is red both before and after a change says nothing
about the change.

## Fix

The arm measures the frame on the same seed and the same Probability page before the edit, then opens the Living
drawer, sets the repeat, saves, and measures the same page again, all in one test, so the font, the size and the data
match. The column, the halves and the caveat are held outright. The handle bound is held only if the handle was in the
frame before; otherwise the arm logs both readings. Every failure message carries the
before numbers. The 766.0 px handle is filed as found in the register, under *The classes the fit gate asserts were
never read at their widest closed-axis members or at six-character spending* (`docs/backlog.md`), not fixed inside the
arm and not left unsaid.

## Key Insight

A frame law is evidence only where it was measured to hold. Before asserting a borrowed law on a new seed, page or size,
measure it there before your change, in the same test, so the test can tell "my change broke it" from "it never held
here". Hold the bounds that held, print the rest, and file what did not hold as its own find. The conditional bound is
weaker than the law: a seed already out of frame cannot fail it. So the printed reading and the register entry are
what stop it going quiet.

## Also Applies To

- Any new arm that reuses a law outside the list where it is asserted: a fit bound, a chart-text audit's counts, a
  reachability check, on a new seed, a new size or a new page.
- [[125]]: a red against the wrong contract is not a finding; assert the regime the page rendered before its law.
- [[070]]: the mirror case. A wait that is green both before and after an event cannot time the event; a law that is
  red both before and after a change cannot judge the change.
- [[123]]: a per-width seat is governed by its widest member; this seed is one more household nobody had read at its
  widest.
