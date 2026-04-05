---
title: "Phase 4: Core Game UI"
type: feat
status: not-deepened
date: 2026-04-05
phase: 4
parent: roadmap.md
---

# Phase 4: Core Game UI

**Goal:** Fully playable game — all card types work, all interactions functional. Ugly but correct.

## Tasks

### Board — Game Table
- `GameTable.tsx` — draw pile (count), discard pile (top card), turn indicator
- `PlayerRing.tsx` — 2-10 player circular layout. Name, color, card count, alive/dead, active highlight.
- `NopeWindow.tsx` — countdown bar (renders from `remainingMs`)
- Card play announcement: "[Player] played [Card]"
- "Waiting on [Player]..." nudge after 30s inactivity

### Phone — Hand & Interactions
- `Hand.tsx` — **horizontal scroll with snap-to-card**, `layout="position"`. **48dp minimum touch targets**. Card count badge. Partial edges as overflow indicators.
- `CardPlay.tsx` — two-tap (select + confirm). Combo validation. **`useOptimistic`** for instant feedback.
- Draw button
- `TargetSelect.tsx` — **bottom-sheet modal** (thumb-reachable). Player name list.
- `DefusePlacement.tsx` — **bottom-sheet**, numbered button row (1=top, N=bottom).
- `FutureView.tsx` — **bottom-sheet**, top 3 cards. Alter the Future: draggable reorder. **Listens for `prompt-cancelled`**.
- Favor response — **bottom-sheet**, choose card. **Listens for `prompt-cancelled`**.
- Three of a Kind naming — card type list
- Nope button — **floats persistently** outside all modals. Always one tap.
- **Disable interactions immediately on turn change**, before animating.
- **Haptics:** light (select), medium (play), sharp (Nope), heavy+error (EK drawn), success (Defuse). Toggle in settings.

### Game Flow States
- Turn indicators on both screens
- `GameOver.tsx` — elimination rank
- Victory — board shows winner, phones show result

### Wire-Up
- Every card type → server action → state update → UI update on all screens

## Tests

- E2E: full game (lobby → winner) with 3-4 players, every card type
- Favor cancellation flow
- Stale-action rejection with user feedback

## Done When

Complete, rules-correct Exploding Kittens Party Pack game. Phones + TV. Functional, not pretty.
