---
title: "A state change made in a capture-phase click listener on window re-renders before React delivers the click, in a real browser only, because the browser runs microtasks between listeners: a gesture hold released there (the register's prescription, planted as mutant M3) deleted the held Keep door under its own click in real Chromium while every jsdom test that clicks a held control stayed green; and a scripted PointerEvent defaults isPrimary to false, so the first draft's isPrimary guard dropped every press fireEvent sent"
date: 2026-10-31
phase: the pay check's h2 cure (b9-1). The register's CLOSED Tier 0 on the W period tap, and the Keep door found while building it
modules: [src/intake/gestureHold.ts, src/intake/__tests__/gestureHold.test.tsx, e2e/vertical-fit.spec.ts]
tags: [react, event-order, capture-phase, bubble-phase, microtask, trusted-event, jsdom-vs-browser, pointer-events, isPrimary, label-forwarded-click, gesture-hold, blur-commit, testing-library, playwright]
---

## Problem

`src/intake/gestureHold.ts` (the h2 cure) holds what the W face drew from a press until that press's click. The working-year figure commits on blur, and the press on the next control is what blurs it. Without the hold, that commit moved the tapped control before the release. For the stale note's own "Keep $84,000 a year" door, it deleted the door. The hook ends the hold from a `window` click listener.

An event travels down to its target first (the CAPTURE phase), then back up (the BUBBLE phase). The register's prescription put the release on the way down. The build put it on the way up from its first draft, and the mutant pass measured what the difference costs. With the release moved to capture (mutant M3), real Chromium lost the Keep door on both of its coordinate-tap arms in `e2e/vertical-fit.spec.ts` (the panel at 1536×791 with a mouse, the walk on a 390×844 phone by touch). The door's click never ran, and the field kept the typed 7,000. The note was gone, exactly as a keep would leave it, and $7,000 a year stood where the household had asked to keep $84,000. In jsdom, 20 of the 22 unit tests stayed green under M3, every test that clicks a held control among them. Only the two that read a listener's capture flag went red.

A second jsdom gap showed up first. The hook's first draft skipped any press with `isPrimary === false`. Its comment allowed for an environment with no `PointerEvent`, where the field would be absent and the press would pass. The first run of the unit file went red on 12 of 15 tests.

## Root Cause

- **A browser-dispatched event runs queued microtasks (small queued jobs) between listeners; a script-dispatched one does not.** For a real click, the browser calls each listener with no script on the stack, so the queue drains as each listener returns. React 19 renders a click-time `setState` in a microtask (`scheduleImmediateRootScheduleTask` → `scheduleMicrotask`, react-dom 19.2.7). A `window` capture listener is the first stop on the click's path, so `setHold(null)` there re-renders before the click reaches React's root listener. The live state no longer draws the door, so React deletes it and lets go of the node (`detachDeletedInstance`). The click then arrives at a node React no longer owns, and its onClick never runs. A `window` bubble listener runs only after React's root listener has delivered the click.
- **jsdom cannot show this.** Testing Library's `fireEvent` is a `dispatchEvent` call from the test's own script, so no microtask runs mid-dispatch. It also wraps each event in `act()`, which holds React's render until the event returns. Either way, the door's click ran under both phases.
- **"After the app's handlers" holds per dispatch, not per gesture.** The event-order review lens measured this in Chromium and WebKit. A label's own click reaches the window bubble listener, and its microtask re-renders, BEFORE the label forwards a second click to its radio. That is harmless here: the forwarded click finds the radio directly, never by position, and no held region holds a label. A label-wrapped control inside held content would be deleted before its forwarded click.
- **A scripted `PointerEvent` defaults `isPrimary` to false.** That is the spec's `PointerEventInit` default, alongside `pointerType` "" and `pressure` 0. jsdom 29.1.1 builds `PointerEvent` and applies the default. Testing Library's `fireEvent.pointerDown` (`@testing-library/dom` 10.4.1) sets only `bubbles`, `cancelable` and `composed`. A real browser marks the mouse and the first finger primary. So the guard would have worked on his devices and dropped every press in the tests.

## Fix

- The release is `window.addEventListener('click', release)`: the bubble phase, never `true`. `pointerup` never releases, because on touch the blur has not happened yet. It only arms a 500 ms fallback for a press that never clicks.
- The unit file pins the phase structurally. H2d spies on `window.addEventListener` and asserts the click listener is not a capture listener. H9 checks that each listener is removed with its own capture flag. The behavior is gated in a real browser: the two Keep-door arms tap by coordinate through `page.mouse` / `page.touchscreen`, which send trusted input, and M3 turns exactly those two red. (Separately, `b9-h2-cure\tapProbe3.mts` measured the hold itself: the door lost 4 of 4 taps with no hold and keeps 4 of 4 with it, on his 1536×791 window and his 448×891 phone.)
- No `isPrimary` filter. The press filter is `e.button !== 0` (the left button, a finger or a pen tip), and a scripted event's default of 0 passes it. A second press during a hold keeps the first press's value anyway. With the guard gone, 2 of 15 tests stayed red. Both came from the test's own focus set-up, which fired fake focus events instead of moving focus, and were fixed in the test.

## Key Insight

When a listener's state change must land AFTER the app has handled an event, the phase is the contract. A capture listener on `window` runs first. In a real browser its re-render lands before the target's own handler, because the browser drains microtasks between listeners. So anything that deletes or swaps DOM on a click belongs in the bubble phase. Bubble is per dispatch, though: a label's forwarded click comes after it. If held content can ever hold a label-wrapped control, release in a later task instead. jsdom cannot judge any of this. Its dispatch is a script call with no microtask checkpoint, and its event fields carry the spec's defaults, not a device's values. Pin the phase structurally in the unit file, and gate the behavior with trusted coordinate input in a real browser. Before trusting a jsdom result on event TIMING or on an event FIELD, ask whether a scripted event can even express what a device sends.

## Also Applies To

- Any "close on the next click" menu or popover, and any hold or freeze hook, whose listener sits on `window` or `document`: in the capture phase it unmounts the region before the clicked item's own handler runs.
- An e2e step that clicks through `locator.evaluate(el => el.click())` or `dispatchEvent` is script-dispatched too, and as blind to this race as jsdom. Coordinate input (`page.mouse`, `page.touchscreen`, `locator.click()`) reproduces it.
- Any guard on a `PointerEvent` field (`isPrimary`, `pointerType`, `pressure`) in code that is unit-tested through `fireEvent`: a scripted event takes the spec default, so the tests run a path no device takes.
- Insight 071's family (jsdom's teardown order is not the browser's), here at the event-dispatch layer. Insight 035's layout race is what the hold cures.
