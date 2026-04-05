# Insight: useOptimistic Does Not Fit WebSocket + useSyncExternalStore

**Date:** 2026-04-05
**Affects:** Phase 3 (gameStore), Phase 4 (CardPlay.tsx)
**Status:** PROVEN via React 19 docs + architectural analysis

## The Problem

Phase 4 planned to use React 19's `useOptimistic` for instant card-play feedback. But `useOptimistic` was designed for request-response patterns (form actions, fetch calls), not WebSocket-driven external stores.

## Why useOptimistic Doesn't Work Here

### The Timing Mismatch

`useOptimistic` requires `addOptimistic` to be called inside `startTransition` or an Action. The optimistic overlay persists **only while the transition is pending**. When the transition's async function resolves, the overlay is dropped and the UI falls back to the base state.

With WebSocket state (`useSyncExternalStore` + `gameStore`):
1. `WebSocket.send()` is synchronous (fire-and-forget)
2. `startTransition(async () => { addOptimistic(card); ws.send(...); })` completes **immediately**
3. Optimistic overlay drops **before** the server state arrives via WebSocket
4. **Result:** Card briefly disappears, then reappears until server confirms

### The Hacky Fix (and Why It's Wrong)

You could create a Promise that subscribes to the store and resolves when the expected state arrives:

```typescript
startTransition(async () => {
  removeCard(cardId);
  await new Promise(resolve => {
    const unsub = gameStore.subscribe(() => {
      if (!gameStore.getSnapshot().hand.find(c => c.id === cardId)) {
        unsub(); resolve();
      }
    });
    connection.send({ type: 'play-card', cardId });
  });
});
```

Problems: Server rejection = Promise never resolves. Nope reversal = Promise never resolves. Multiple rapid plays = race conditions. It's fighting the hook's design.

### Official React Docs Confirm

From react.dev/reference/react/useOptimistic:
> "An optimistic state update occurred outside a Transition or Action" — the optimistic state will **briefly appear and then immediately revert**.

The hook is explicitly designed around the transition lifecycle, not external store reconciliation.

## The Correct Pattern: Store-Level Optimistic Overlay

Build optimistic update support directly into `gameStore`. The store maintains a `Map` of optimistic transforms. `getSnapshot()` applies transforms on top of the base state. `useSyncExternalStore` picks up the change immediately.

### gameStore Addition

```typescript
class GameStore {
  private snapshot: GameState = initialState;
  private optimisticOverlays = new Map<string, (state: GameState) => GameState>();
  private listeners = new Set<() => void>();

  getSnapshot = (): GameState => {
    let state = this.snapshot;
    for (const transform of this.optimisticOverlays.values()) {
      state = transform(state);
    }
    return state;
  };

  applyOptimistic(id: string, transform: (state: GameState) => GameState): () => void {
    this.optimisticOverlays.set(id, transform);
    this.emitChange();
    return () => { this.optimisticOverlays.delete(id); this.emitChange(); };
  }

  handleMessage(msg: ServerMessage): void {
    if (msg.type === 'state-update') {
      this.snapshot = msg.payload;
      this.optimisticOverlays.clear(); // Server state is authoritative
    }
    if (msg.type === 'action-rejected') {
      this.optimisticOverlays.delete(msg.actionId);
    }
    this.emitChange();
  }

  private emitChange(): void {
    this.listeners.forEach(cb => cb());
  }
}
```

### Card Play Usage

```typescript
function usePlayCard() {
  const hand = useGameSelector(s => s.hand);

  const playCard = (cardId: string) => {
    const actionId = crypto.randomUUID();

    // 1. Card leaves hand INSTANTLY (optimistic)
    const removeOverlay = gameStore.applyOptimistic(actionId, (state) => ({
      ...state,
      hand: state.hand.filter(c => c.id !== cardId),
    }));

    // 2. Send to server
    connection.send({ type: 'play-card', cardId, actionId });

    // 3. Safety timeout — remove stale overlay after 5s
    setTimeout(() => removeOverlay(), 5000);
  };

  return { hand, playCard };
}
```

### Reconciliation Lifecycle

| Scenario | What Happens |
|----------|-------------|
| Server accepts | `state-update` arrives, card removed from base state, all overlays cleared. No flash. |
| Server rejects | `action-rejected` arrives, overlay removed, card reappears in hand. Animate back in. |
| Noped by another player | Nope chain resolves, server sends `state-update` with card back in hand, overlays cleared. Card reappears. |
| Timeout (server unreachable) | 5s safety removes overlay, card reappears. Connection error handling kicks in. |

## Why This Is Better

1. **No timing dependency** between React transitions and WebSocket messages
2. **Single source of truth** — the store handles both real and optimistic state
3. **Compatible with useSyncExternalStore** — `getSnapshot()` returns the merged view
4. **Explicit rejection** via `action-rejected` message, no Promise gymnastics
5. **Phase 5 animation** — Framer Motion layout animations smooth over any reconciliation flicker

## Plan Updates Required

- **Phase 3 gameStore:** Add `optimisticOverlays` Map, `applyOptimistic()` method, overlay clearing in `handleMessage()`
- **Phase 4 CardPlay.tsx:** Use `gameStore.applyOptimistic()` instead of `useOptimistic`
- **Phase 3 protocol:** Add `action-rejected` server message type with `actionId` field

## Alternatives Considered and Rejected

| Alternative | Why Rejected |
|------------|-------------|
| `useOptimistic` + Promise bridge | Fragile timing, no natural await boundary, Nope/rejection = Promise hangs |
| `useTransition` wrapping ws.send | Same timing problem — transition completes before server responds |
| React 19 `use()` | For reading Promises/Context during render, not for optimistic updates |
| TanStack Query mutations | Overkill dependency for ~30 lines of store code |
| Component-local state | Fragments state management — hand in TWO places = sync bugs |
