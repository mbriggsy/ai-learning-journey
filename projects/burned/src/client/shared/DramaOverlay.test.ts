/**
 * Regression test for the drama-beat clipping bug closed 2026-05-01.
 *
 * Bug history: from 2026-04-22 (when card variant was introduced) until
 * 2026-05-01, the exit tweens (blur + opacity) used GSAP position `'<'`
 * which anchors them to the START of the previous tween — the hold. That
 * made the entire fade-out run IN PARALLEL with the hold, collapsing
 * every drama moment's visible duration to enter+fade (~800ms) regardless
 * of holdMs. Years of holdMs tuning was silently invalidated.
 *
 * Surfaced by Briggsy's eye-in-loop "camera flash" report + instrumented
 * timing: card opacity went 1 → 0 by t=861ms even with holdMs=2400.
 *
 * This test pins the contract: enter + hold + exit run sequentially, so
 * total timeline duration = holdSec + exitDurationSec. If anyone
 * re-introduces `'<'` on the blur tween, totalDuration collapses to
 * max(hold, exit) and this test fails noisily.
 */

import { describe, expect, it } from 'vitest'
import gsap from 'gsap'
import { appendHoldAndExit } from './DramaOverlay'

// @vitest-environment jsdom

describe('DramaOverlay timeline structure', () => {
  it('hold + exit run sequentially — exits do not parallel-clip the hold', () => {
    const tl = gsap.timeline({ paused: true })
    const target = document.createElement('div')
    const overlay = document.createElement('div')
    const holdSec = 2.4
    const exitDurationSec = 0.4

    appendHoldAndExit(tl, target, overlay, holdSec, exitDurationSec)

    // Expected: hold (2.4s) → blur exit (0.4s, sequential) || opacity exit (0.4s, '<' parallel with blur)
    // Total = 2.4 + 0.4 = 2.8s
    //
    // Bug shape: if the blur tween used `'<'` (parallel with the hold's start),
    // total would collapse to max(holdSec, exitDurationSec) = 2.4s. The test
    // tolerance (±0.05s) catches the 0.4s difference cleanly.
    expect(tl.totalDuration()).toBeCloseTo(holdSec + exitDurationSec, 1)
  })

  it('honors short holds proportionally — INTERCEPTED-style transient beats', () => {
    const tl = gsap.timeline({ paused: true })
    const target = document.createElement('div')
    const overlay = document.createElement('div')
    // INTERCEPTED uses 1400ms; GONE DARK / FILES BURNED use 1200ms
    const holdSec = 1.2
    const exitDurationSec = 0.4

    appendHoldAndExit(tl, target, overlay, holdSec, exitDurationSec)

    expect(tl.totalDuration()).toBeCloseTo(holdSec + exitDurationSec, 1)
  })

  it('honors long holds proportionally — burned-drawn drawer card variant', () => {
    const tl = gsap.timeline({ paused: true })
    const target = document.createElement('div')
    const overlay = document.createElement('div')
    // burned-drawn drawer card variant uses 2400ms — the longest dramatic hold
    // so the drawer can absorb the full Burned card art before placement.
    const holdSec = 2.4
    const exitDurationSec = 0.4

    appendHoldAndExit(tl, target, overlay, holdSec, exitDurationSec)

    expect(tl.totalDuration()).toBeCloseTo(holdSec + exitDurationSec, 1)
  })
})
