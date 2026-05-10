---
title: Client patterns
type: conventions
date: 2026-05-09
---

# Client patterns

Rules for React client code in `src/client/`. State management, store subscriptions, interaction patterns, layout invariants. Read before touching components, hooks, or store logic.

## Store & state

- **`useSyncExternalStore` + notify rule.** When a single message updates multiple store slices that components read together, write ALL slices before triggering `notify()`. See `docs/insights/017-react-re-renders-read-stale-store-slice-if-update-order-wrong.md`.
- **`gameStore` is a singleton export.** HMR may not hot-replace reliably after editing — hard-refresh required.

## Interaction

- **`useCardPlay` has `maxStaged` param.** Favor mode passes `1` (auto-swap on second tap). Normal play passes `3`. Don't change to "reject second tap" without reviewing favor UX.
- **Favor-target keeps interaction LIVE.** Carve-out in `deriveInteractionPermission`: `pendingPrompt.type === 'favor-response' && playerId === myPlayerId` returns `{ allowed: true }`. Don't remove — lets the target double-tap their hand instead of opening a sheet.
- **`useDramaActive()` is the modal gate.** Any sheet / overlay that could cover a BURNED → EXTRACTED sequence must gate on it.
- **FuturePeek has NO countdown.** Old auto-close was bugged AND violated "game waits for you." User-triggered `Got it` only.
- **Intercept button bypasses outer `disabled` prop** in `SmartActionBox.tsx`.

## Drama overlay

- **DramaOverlay burned is 2 beats for non-drawer, 1 beat for drawer.** `getDramaBeats` returns an array; queue processor handles multi-beat. Drawer distinction: `myPlayerId === event.playerId`. Board always sees both beats.
- **DramaOverlay cqi factors pair with min tokens.** Hero 9cqi/32px, subdued 6cqi/24px, victory 8cqi/40px.

## Steal report

- **StealReport queue is local React state.** Multiple combo-steals while a player is away queue with `+N more` chip.
- **`combo-steal.cardType` is PRIVATE to stealer + target.** `stripPrivateEventFields` in `src/server/projection.ts` strips from public board + non-party players.

## Hand & cards

- **Hand sort lives in `useSortedHand`.** `TYPE_PIN_PRIORITY` pins Extraction rightmost, Intercepted second-rightmost.
- **`MinimalCard :active` scope.** Selector `.card:not([aria-disabled='true']):not([data-selected]):active` — both exclusions load-bearing. `[data-selected]` has `transition: none` for layoutId reflash dodge; `[aria-disabled='true']` is DiscardFan cards.
- **Card illustration uses `object-fit: contain`, not `cover`.**
- **DiscardFan tilt pattern.** Top card centered; behind1 tilts left (-7°), behind2 tilts right (+7°). Preserve alternating tilt if adding fan layers.

## Piles & layout

- **Draw pile is decorative, discard is the hero.** `--size-draw-pile-width` ≈ 60% of `--size-discard-card-width`. Don't "unify."
- **Discard sizing media query.** `(min-height: 1000px) and (min-width: 1300px)` gates `flex-direction: column` on `.piles` + larger discard clamp (300→480px stacked vs 160→300px side-by-side).
- **`.table` box-sizing load-bearing.** `height: 100vh; box-sizing: border-box` so fixed-position status bar anchors to visible viewport edge.
