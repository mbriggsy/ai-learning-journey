---
title: Initial state never fires a transition event
date: 2026-04-01
phase: 6a
modules: [src/renderer/systems/AmbientSound.ts, src/game/engine.ts]
tags: [events, state-machine, initialization, ambient, audio]
---

## Problem

Ambient drone never started during gameplay. No errors — just silence where atmosphere should have been. The drone was supposed to be "active from COUNTDOWN start" per the plan.

## Root Cause

`AmbientSound` subscribed to the `PHASE_CHANGED` event and listened for `'countdown'` to call `start()`. But `PHASE_CHANGED` only fires on **transitions** — when `evaluateRules()` produces a new state. Countdown is the **initial** state, set in `createGameState()`. No transition event ever fires for it because there's nothing to transition *from*.

The event flow: game starts in countdown → countdown ticks down → `evaluateRules` returns `{ kind: 'hunt' }` → `PHASE_CHANGED` fires with `'hunt'`. The `'countdown'` event never appears.

## Fix

Removed the event subscription. Called `this.start()` directly in the constructor — the ambient drone begins the moment the scene creates the AudioManager, which is during countdown. No event needed.

## Key Insight

In any event-driven system, the initial state is NOT a transition. If you need to react to "we are in state X," you can't rely on a "transitioned to X" event — because that event only fires when you *enter* X from somewhere else. The first state has no predecessor, so no transition event fires.

**Pattern to watch for:** Any time a subsystem subscribes to a state-change event for initialization behavior. Ask: "Does this state get entered via a transition, or is it the starting state?" If it's the starting state, you need explicit initialization — not an event handler.

## Also Applies To

Any future system that needs to activate at game start (countdown phase). The HUD, FogRenderer, and MinimapManager all handle this correctly by initializing in `create()` rather than waiting for events. This is the same pattern — just easy to forget when adding new subsystems.
