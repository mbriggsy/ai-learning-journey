---
title: A frame recorder sees only what crosses a frame — two changes in one task paint as one, and a fast run can land before the first recorded frame; hold the run to widen the window, and pin same-task order at the subscriber
date: 2026-11-23
phase: The RightCapital mandate, gap 1 (the workbench's U7) and W9-R7's U5
modules: [e2e/vertical-fit.spec.ts, src/ui/preview/RefiguringPreview.tsx, src/store/memoryModel.ts, src/ui/workbench/WorkbenchRoom.tsx]
tags: [frame-recorder, requestAnimationFrame, same-task, react-batching, held-run, preview, vacuous-walk, worker-postmessage, coordinate-walk, store-order]
---

## Problem

Three cases, one blind spot. W9-R7's U5 planted a store-order fault (the re-figuring flag dropped one notify ahead of
the spine commit): every fit arm stayed green, and so did the store suite. The spine's re-figuring window is one run
long (about 3 s), and screenshots caught it at some widths and missed it at others. And U7's switch walk (the "Rough
market" switch must not move while the table's rows land) passed with one frame before the rows on two runs, then
recorded the rows already present on the switch's first frame: zero frames before, a walk that compared nothing.

## Root Cause

A page arm reads painted frames, and a frame shows only the state at its end. React painted both notifies of the
planted task as one frame, so the misordering never existed on screen (the same plant with a 60 ms task gap redded the
live arm alone). And a window is only as wide as the work that holds it open: the table's one-path runs came back
from the worker within a frame of the room mounting, so whether the loading state ever painted was a race.

## Fix

- Pin ordering that never crosses a task at its subscriber, once per commit branch (`e95c17db`): a page arm owns only
  what crosses a frame.
- Hold the run that bounds the window, without touching the app: the re-figuring preview
  (`?preview=refiguring&seed=<key>`, `src/ui/preview/RefiguringPreview.tsx`) wraps the one engine handle and holds every
  run after the first final, so the real page stands in the window as long as an arm needs; the switch walk wraps
  `Worker.prototype.postMessage` in-page after the answer settles and holds each message 400 ms, so about 50 frames
  paint before the rows, every run.
- Keep a non-vacuity guard in every walk (at least one frame before the change), and read its count in the log.

## Key Insight

An instrument that samples frames can only see a state that lasts a frame. Before trusting a green walk, ask how many
frames the "before" state really painted; when the answer is "zero or one, depending", widen the window by holding the
work that ends it (at the engine handle or the worker boundary), and pin orderings that live inside one task where they
happen, never on the page.

## Also Applies To

- U8's pinned-answer-landing walk: an edit in the room must hold its run, or the pinned box's reserve is never tested.
- Any "nothing moves when X lands" arm whose X is a fast worker or cached result.
- Store tests that drive one route only: a commit branch they never take keeps its ordering unpinned.
