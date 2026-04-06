---
title: Stale server timers silently fire on superseded state
date: 2026-04-05
phase: Phase 3
modules: [src/server/game/engine.ts, src/server/room.ts]
tags: [timer, race-condition, nope-window, generation-counter, async, stale-callback]
---

## Problem

The Nope window timer fires after a fixed delay and dispatches `nope-window-expired`. But when a second Nope is played, the engine resets the window with a new deadline — while the *old* `setTimeout` is still pending. The old timer fires, matches the (now-reset) window, and incorrectly resolves the chain early.

Symptoms: Nope chain resolves before the new deadline. Looks like a "timing glitch" — passes all tests (which control time explicitly) but breaks under real async.

## Root Cause

The timer callback captures no identity of *which* window it was scheduled for. It only checks "is there an active window?" and "has the deadline passed?" — both true, because the new window exists and real time has advanced. The callback can't distinguish "I was scheduled for this window" from "I was scheduled for the one before."

## Fix

Added a monotonic `generation` counter to `NopeWindow`. Each new window (and each Nope that resets the timer) increments the generation. The `nope-window-expired` action carries the generation it was scheduled for. The engine rejects the action if `action.windowGeneration !== state.nopeWindow.generation`.

Room-side: `updateNopeTimer()` compares the new generation against its last-seen generation. Only schedules a new `setTimeout` when the generation advances. Old timers fire harmlessly — the engine rejects them.

## Key Insight

**Any server-driven timer that acts on mutable state needs a generation tag.** The timer callback runs in a future where the state it was targeting may have been replaced. Without an identity link between "the timer" and "the state it was meant for," the callback can't know it's stale.

The pattern: state carries a monotonic counter, the timer carries the counter value at scheduling time, the handler rejects mismatches. This is the async equivalent of optimistic locking — same concept, different axis (time instead of concurrent writers).

This is invisible in tests that control time, because the test never schedules two timers for the same logical slot.

## Also Applies To

- **Prompt timeouts** (`defuse-pending`, `favor-pending`, etc.) — same pattern. A player could trigger a state change that resets the sub-phase right before the timeout fires.
- **Any debounced/delayed server action** — rate-limit cooldowns, inactivity nudges, reconnection grace periods.
- **Client-side optimistic rollback timers** — if the server confirms before the rollback timer fires, the timer must be invalidated or tagged.
- **Animation completion callbacks** — Framer Motion `onAnimationComplete` can fire after the component's logical state has changed (e.g., a card returns to hand mid-animation).
