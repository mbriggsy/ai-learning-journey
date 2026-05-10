---
title: useOptimistic is incompatible with WebSocket + useSyncExternalStore
date: 2026-04-05
modules: [src/client, src/shared]
tags: [react-19, useOptimistic, useSyncExternalStore, websocket, optimistic-updates, partykit]
---

## Problem

Phase 4 planned to use React 19's `useOptimistic` for instant card-play feedback. Card would visually leave hand immediately, then reconcile when server confirms.

## Root Cause

`useOptimistic` is designed for request-response patterns (form actions, fetch). The optimistic overlay persists **only while a transition is pending**. With WebSocket:

1. `ws.send()` is fire-and-forget — `startTransition` completes immediately
2. Optimistic overlay drops before the server state arrives via WebSocket
3. Card briefly disappears, then reappears — the exact flicker we're trying to prevent

The React docs confirm: "An optimistic state update occurred outside a Transition or Action" causes the state to **immediately revert**.

You could hack around it with a Promise that subscribes to the store and resolves when the expected state arrives — but server rejection or Nope reversal means that Promise never resolves.

## Fix

Build optimistic update support directly into `gameStore`:
- Store maintains a `Map<string, (state) => state>` of optimistic transforms
- `getSnapshot()` applies transforms on top of base state
- `useSyncExternalStore` picks up changes immediately
- Server `state-update` clears all overlays (authoritative)
- Server `action-rejected` removes specific overlay (card reappears)
- Safety timeout removes stale overlays after 5s

## Key Insight

Any React hook tied to the transition lifecycle (`useOptimistic`, `useTransition`) is fundamentally incompatible with external stores driven by push-based protocols (WebSocket, SSE). The store itself must own optimistic state.

## Also Applies To

- Any `useSyncExternalStore`-backed state with optimistic updates
- SSE-driven state management
- Any architecture where state updates arrive asynchronously from an external source, not as a response to a request
