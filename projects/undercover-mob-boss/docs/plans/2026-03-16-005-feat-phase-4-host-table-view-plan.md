---
title: "Phase 4: Host/Table View — Shared Screen, Animations, Board Layout"
type: feat
status: active
date: 2026-03-16
phase: 4
---

# Phase 4: Host/Table View

## Overview

Build the shared-screen display that the entire room watches — landscape tablet, laptop, or TV. The Host View receives `HostState` projections from the PartyKit server and renders 8 screens with dramatic animations for vote reveals, policy enactments, and executive powers. This is the public game board — it shows NO private information until game-over. Animations expose timing hooks for Phase 5 audio synchronization.

## Problem Statement / Motivation

The host screen IS the game table. It's what everyone looks at during debate, voting, and policy reveals. The SPEC goal is "indistinguishable from a polished commercial party game" — this phase carries that burden. The vote reveal animation, policy card flip, and executive power overlays are the dramatic beats that make the game feel real.

## Proposed Solution

### Noir Color Palette — CSS Custom Properties

All colors derive from a single set of CSS custom properties. The palette is 1940s noir: deep blacks, warm ambers, muted golds, cold steel blues, and blood reds. Every component references these variables — no hard-coded colors anywhere.

```css
/* src/client/host/styles/host-base.css */

:root {
  /* -- Surface & Background -- */
  --noir-black:        #0a0a0c;
  --noir-charcoal:     #1a1a1e;
  --noir-slate:        #2a2a30;
  --noir-smoke:        #3a3a42;
  --noir-ash:          #5a5a64;

  /* -- Text -- */
  --noir-cream:        #e8e0d0;
  --noir-parchment:    #d4c8b0;
  --noir-muted:        #8a8478;

  /* -- Accent: Warm (Citizens, Good Policies) -- */
  --noir-gold:         #c9a84c;
  --noir-amber:        #d4a944;
  --noir-warm-glow:    rgba(201, 168, 76, 0.15);

  /* -- Accent: Cold (Mob, Bad Policies) -- */
  --noir-crimson:      #8b1a1a;
  --noir-blood:        #a82020;
  --noir-red-glow:     rgba(168, 32, 32, 0.15);

  /* -- Accent: Steel (UI, Neutral) -- */
  --noir-steel:        #6e7b8b;
  --noir-silver:       #9aa5b4;

  /* -- Status -- */
  --noir-connected:    #4a7c59;
  --noir-disconnected: #7c4a4a;
  --noir-dead:         #4a4a4a;

  /* -- Transparency Layers -- */
  --overlay-dark:      rgba(10, 10, 12, 0.85);
  --overlay-medium:    rgba(10, 10, 12, 0.60);
  --glass-surface:     rgba(26, 26, 30, 0.90);

  /* -- Responsive Spacing (scales between 1024px and 1920px) -- */
  --space-xs:  clamp(0.25rem, 0.15rem + 0.25vw, 0.5rem);
  --space-sm:  clamp(0.5rem,  0.3rem + 0.5vw,  1rem);
  --space-md:  clamp(0.75rem, 0.45rem + 0.75vw, 1.5rem);
  --space-lg:  clamp(1rem,    0.6rem + 1vw,     2rem);
  --space-xl:  clamp(1.5rem,  0.9rem + 1.5vw,   3rem);

  /* -- Responsive Typography -- */
  --font-xs:   clamp(0.75rem,  0.65rem + 0.25vw, 0.875rem);
  --font-sm:   clamp(0.875rem, 0.75rem + 0.35vw, 1rem);
  --font-base: clamp(1rem,     0.85rem + 0.4vw,  1.25rem);
  --font-lg:   clamp(1.25rem,  1rem + 0.6vw,     1.75rem);
  --font-xl:   clamp(1.75rem,  1.35rem + 1vw,    2.5rem);
  --font-2xl:  clamp(2.25rem,  1.6rem + 1.6vw,   3.5rem);
  --font-hero: clamp(3rem,     2rem + 2.5vw,     5rem);

  /* -- Animation Timing -- */
  --ease-dramatic:     cubic-bezier(0.68, -0.55, 0.265, 1.55);  /* overshoot (ease-out-back) */
  --ease-smooth:       cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-snap:         cubic-bezier(0.5, 0, 0, 1);

  /* -- Shadows -- */
  --shadow-card:   0 4px 12px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-glow:   0 0 20px rgba(201, 168, 76, 0.3);
  --shadow-danger: 0 0 20px rgba(168, 32, 32, 0.4);

  /* -- Card Dimensions -- */
  --card-width:  clamp(60px, 4vw + 20px, 120px);
  --card-height: calc(var(--card-width) * 1.4);
  --card-radius: clamp(4px, 0.3vw, 8px);
}
```

**clamp() formula rationale:** Each clamp uses the pattern `clamp(min, preferred, max)` where the preferred value is computed as `min + slope * vw`. The slope is `(max - min) / (1920px - 1024px) * 100` -- this produces linear scaling between the two breakpoints. For example, `--font-base` scales from 1rem at 1024px to 1.25rem at 1920px: slope = 0.25rem / 896px * 100 = ~0.028rem/vw, approximated as `0.85rem + 0.4vw`.

### Screen Inventory (8 screens + overlays)

| # | Screen ID | Trigger | Content |
|---|---|---|---|
| 1 | `lobby` | Room created | QR code (maximized), room code, player list, Start button (enabled at 5+) |
| 2 | `game-board` | Base screen during play | Policy tracks, election tracker, player strip, round number |
| 3 | `nomination` | Mayor nominates | Mayor name, nominee name, timer |
| 4 | `election-results` | Votes revealed | Vote flip animation per player, final tally, outcome |
| 5 | `policy-enacted` | Policy placed on track | Card flip animation (good/bad), track update |
| 6 | `auto-enact` | Election tracker = 3 | Variant of policy-enacted with "Auto-Enacted" label, no attribution |
| 7 | `executive-power` | Bad policy unlocks power | Power card overlay, Chief name, target selection in progress |
| 8 | `game-over` | Win condition met | Winner, reason, ALL roles revealed, stats, Play Again button |

**Overlays (on game-board):**
- `veto-proposed` -- "Veto Proposed -- Awaiting Mayor's Decision"
- `veto-result` -- "Veto Accepted -- Policies Discarded" or "Veto Rejected"
- `deck-reshuffled` -- Brief deck refill animation + indicator
- `policy-session-active` -- "Policy Session in Progress" status bar

### Host Screen Router

State determines which screen; events trigger how transitions animate.

```typescript
// src/client/host/host-router.ts

import type { HostState } from '../../shared/types';

/** Every screen the host view can display. */
type HostScreenId =
  | 'lobby'
  | 'game-board'
  | 'nomination'
  | 'election-results'
  | 'policy-enacted'
  | 'auto-enact'
  | 'executive-power'
  | 'game-over';

/** Overlay IDs that render on top of the current screen. */
type HostOverlayId =
  | 'veto-proposed'
  | 'veto-result'
  | 'deck-reshuffled'
  | 'policy-session-active';

interface HostViewState {
  screen: HostScreenId;
  overlays: HostOverlayId[];
}

/**
 * Pure function: derives which screen and overlays to show from HostState.
 * Called on every state update. The transition queue (below) decides
 * whether to animate or cut.
 */
function getHostView(state: HostState): HostViewState {
  const overlays: HostOverlayId[] = [];

  // -- Terminal states --
  if (state.phase === 'lobby') return { screen: 'lobby', overlays };
  if (state.phase === 'game-over') return { screen: 'game-over', overlays };

  // -- Transient screens (event-driven, with minimum display time) --
  if (state.subPhase === 'election-result')
    return { screen: 'election-results', overlays };
  if (state.subPhase === 'policy-enact')
    return { screen: 'policy-enacted', overlays };
  if (state.subPhase === 'auto-enact')
    return { screen: 'auto-enact', overlays };
  if (state.subPhase === 'executive-power-pending')
    return { screen: 'executive-power', overlays };

  // -- Nomination / voting screen --
  if (
    state.subPhase === 'nomination-pending' ||
    state.subPhase === 'election-voting'
  )
    return { screen: 'nomination', overlays };

  // -- Game board is the default: compute overlays --
  if (state.subPhase === 'policy-veto-propose' || state.subPhase === 'policy-veto-response')
    overlays.push('veto-proposed');
  if (state.subPhase === 'policy-mayor-discard' || state.subPhase === 'policy-chief-discard')
    overlays.push('policy-session-active');

  // Event-driven overlays (populated by transition queue, not router):
  // 'veto-result' and 'deck-reshuffled' are ephemeral -- added by the
  // transition queue when corresponding GameEvents arrive, removed after
  // their minimum display durations.

  return { screen: 'game-board', overlays };
}

/**
 * Compares previous and next HostViewState to decide transition type.
 * - Same screen: no transition (overlays may change).
 * - Different screen: crossfade (400ms).
 * - On reconnect (isReconnect flag): instant cut, no animation.
 */
function getTransitionType(
  prev: HostViewState,
  next: HostViewState,
  isReconnect: boolean,
): 'none' | 'crossfade' | 'instant' {
  if (isReconnect) return 'instant';
  if (prev.screen === next.screen) return 'none';
  return 'crossfade';
}

export { getHostView, getTransitionType };
export type { HostScreenId, HostOverlayId, HostViewState };
```

**Rendering architecture:** State determines current screen. Events trigger entry animations. On host reconnect, state renders instantly with no animation replay.

### Minimum Display Durations

Transient screens must persist long enough for the room to read and process:

| Screen | Minimum Duration | Notes |
|---|---|---|
| `election-results` | 3s + animation time | Vote flip takes ~4s total for 10 players |
| `policy-enacted` | 3s | Card flip + track update |
| `auto-enact` | 4s | Extra time since it's unexpected |
| `executive-power` | 5s | Gravity of the moment |
| `veto-proposed` overlay | Until resolved | Stays until Mayor responds |
| `veto-result` overlay | 2s | Brief confirmation |
| `deck-reshuffled` overlay | 2s | Brief animation |

After minimum duration, screen transitions to the next state-driven screen.

**Transition queue -- minimum display duration enforcement:**

```typescript
// src/client/host/transition-queue.ts

interface QueuedTransition {
  viewState: HostViewState;
  receivedAt: number;            // performance.now()
  minDisplayUntil: number | null; // null = no minimum (immediate)
  animationPromise?: Promise<void>; // resolved when entry animation completes
}

/** Minimum display durations in milliseconds. */
const MIN_DISPLAY_MS: Partial<Record<HostScreenId, number>> = {
  'election-results': 7000,  // 3s read + ~4s animation
  'policy-enacted':   3000,
  'auto-enact':       4000,
  'executive-power':  5000,
};

const OVERLAY_MIN_DISPLAY_MS: Partial<Record<HostOverlayId, number>> = {
  'veto-result':     2000,
  'deck-reshuffled': 2000,
};

/**
 * TransitionQueue buffers state updates and enforces minimum display times.
 * When the server sends rapid state changes (e.g., vote reveal -> policy
 * enact -> executive power), each screen is shown for at least its minimum
 * duration before the next one appears.
 *
 * Usage:
 *   const queue = new TransitionQueue(renderFn);
 *   // On every state update from WebSocket:
 *   queue.enqueue(getHostView(newState));
 */
class TransitionQueue {
  private queue: QueuedTransition[] = [];
  private current: QueuedTransition | null = null;
  private drainTimer: number | null = null;

  constructor(
    private render: (viewState: HostViewState, animate: boolean) => Promise<void>,
  ) {}

  /** Push a new target view state. May display immediately or queue. */
  enqueue(viewState: HostViewState, isReconnect = false): void {
    if (isReconnect) {
      // Reconnect: flush everything, render instantly
      this.queue = [];
      this.cancelDrain();
      this.current = {
        viewState,
        receivedAt: performance.now(),
        minDisplayUntil: null,
      };
      this.render(viewState, false);
      return;
    }

    const entry: QueuedTransition = {
      viewState,
      receivedAt: performance.now(),
      minDisplayUntil: null,
    };

    if (!this.current) {
      // Nothing showing -- display immediately
      this.display(entry, true);
    } else {
      // Something showing -- queue it
      this.queue.push(entry);
      this.scheduleDrain();
    }
  }

  private display(entry: QueuedTransition, animate: boolean): void {
    const minMs = MIN_DISPLAY_MS[entry.viewState.screen] ?? 0;
    entry.minDisplayUntil = minMs > 0 ? performance.now() + minMs : null;
    this.current = entry;
    entry.animationPromise = this.render(entry.viewState, animate);
    this.scheduleDrain();
  }

  /** Check if current screen's minimum time has elapsed, advance if so. */
  private scheduleDrain(): void {
    if (this.drainTimer !== null) return;
    if (this.queue.length === 0) return;

    const remaining = this.remainingMinDisplay();
    this.drainTimer = window.setTimeout(() => {
      this.drainTimer = null;
      this.drain();
    }, Math.max(remaining, 16)); // at least one frame
  }

  private drain(): void {
    if (this.queue.length === 0) return;
    if (this.remainingMinDisplay() > 0) {
      this.scheduleDrain();
      return;
    }
    // Coalesce: skip intermediate states, show the latest
    const latest = this.queue[this.queue.length - 1];
    this.queue = [];
    this.display(latest, true);
  }

  private remainingMinDisplay(): number {
    if (!this.current?.minDisplayUntil) return 0;
    return Math.max(0, this.current.minDisplayUntil - performance.now());
  }

  private cancelDrain(): void {
    if (this.drainTimer !== null) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
  }
}

export { TransitionQueue, MIN_DISPLAY_MS, OVERLAY_MIN_DISPLAY_MS };
```

### Game Board Layout

The persistent base layer. Must render correctly at two breakpoints:

**Breakpoint 1: Tablet landscape** (1024x768 minimum)
**Breakpoint 2: Laptop/TV landscape** (1366x768 minimum, scales to 1920x1080)

```
+------------------------------------------------------------+
|  Round N                                   UMB              |
+------------------------------------------------------------+
|                                                             |
|   GOOD POLICIES  [X][X][ ][ ][ ]    (5 slots)             |
|                                                             |
|   BAD POLICIES   [X][X][ ][ ][ ][ ] (6 slots + powers)    |
|                          ^ power tiles below each slot      |
|                                                             |
|   ELECTION TRACKER  [o][o][o]  (3 steps -> auto-enact)     |
|                                                             |
+------------------------------------------------------------+
|  [Player1 crown] [Player2 star] [Player3] [~P4~] [Player5]|
|   Mayor            Chief          Alive     Dead    Alive   |
+------------------------------------------------------------+
```

**Concrete CSS Grid layout:**

```css
/* src/client/host/styles/board.css */

.game-board {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header"
    "tracks"
    "players";
  height: 100vh;
  height: 100dvh; /* dynamic viewport height -- avoids iOS toolbar issues */
  width: 100vw;
  overflow: hidden;
  background-color: var(--noir-black);
  background-image: url('/assets/background.jpg');
  background-size: cover;
  background-position: center;
  color: var(--noir-cream);
  font-family: 'Source Serif 4', Georgia, serif;
}

/* -- Header Bar -- */
.board-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-lg);
  background: var(--glass-surface);
  border-bottom: 1px solid var(--noir-smoke);
  font-size: var(--font-lg);
}

.board-header__round {
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--noir-gold);
}

.board-header__title {
  font-size: var(--font-sm);
  color: var(--noir-muted);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* -- Tracks Area (main content) -- */
.board-tracks {
  grid-area: tracks;
  display: grid;
  grid-template-rows: 1fr 1fr auto;
  grid-template-areas:
    "good-track"
    "bad-track"
    "election";
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  place-items: center;
  overflow: hidden;
}

/* -- Good Policy Track -- */
.policy-track {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  max-width: 800px;
}

.policy-track--good {
  grid-area: good-track;
}

.policy-track--bad {
  grid-area: bad-track;
}

.policy-track__label {
  font-size: var(--font-base);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  min-width: clamp(100px, 10vw, 160px);
  text-align: right;
  color: var(--noir-parchment);
}

.policy-track__slots {
  display: flex;
  gap: var(--space-xs);
}

.policy-slot {
  width: var(--card-width);
  height: var(--card-height);
  border-radius: var(--card-radius);
  border: 2px solid var(--noir-smoke);
  display: grid;
  place-items: center;
  position: relative;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.policy-slot--good.policy-slot--filled {
  background: var(--noir-warm-glow);
  border-color: var(--noir-gold);
  box-shadow: var(--shadow-glow);
}

.policy-slot--bad.policy-slot--filled {
  background: var(--noir-red-glow);
  border-color: var(--noir-crimson);
  box-shadow: var(--shadow-danger);
}

.policy-slot--empty {
  background: var(--noir-charcoal);
  opacity: 0.5;
}

/* -- Power Tiles (below bad policy slots) -- */
.policy-slot__power {
  position: absolute;
  bottom: calc(-1 * var(--space-md) - 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--noir-muted);
  white-space: nowrap;
  transition: color 0.3s, text-shadow 0.3s;
}

.policy-slot__power--active {
  color: var(--noir-blood);
  text-shadow: 0 0 8px var(--noir-red-glow);
}

/* -- Election Tracker -- */
.election-tracker {
  grid-area: election;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.election-tracker__label {
  font-size: var(--font-sm);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--noir-muted);
}

.election-tracker__dots {
  display: flex;
  gap: var(--space-sm);
}

.election-dot {
  width: clamp(16px, 1.5vw, 28px);
  height: clamp(16px, 1.5vw, 28px);
  border-radius: 50%;
  border: 2px solid var(--noir-smoke);
  background: var(--noir-charcoal);
  transition: all 0.3s var(--ease-smooth);
}

.election-dot--filled {
  background: var(--noir-blood);
  border-color: var(--noir-crimson);
  box-shadow: 0 0 8px var(--noir-red-glow);
}

/* Pulse animation on advance */
.election-dot--pulse {
  animation: election-pulse 0.6s var(--ease-dramatic);
}

@keyframes election-pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.5); box-shadow: 0 0 20px var(--noir-red-glow); }
  100% { transform: scale(1); }
}

/* Red glow at 2/3 (tension building) */
.election-tracker--danger .election-dot--filled {
  animation: danger-glow 1.5s ease-in-out infinite alternate;
}

@keyframes danger-glow {
  from { box-shadow: 0 0 8px var(--noir-red-glow); }
  to   { box-shadow: 0 0 24px rgba(168, 32, 32, 0.6); }
}

/* -- Player Strip -- */
.player-strip {
  grid-area: players;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--glass-surface);
  border-top: 1px solid var(--noir-smoke);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.player-strip::-webkit-scrollbar {
  display: none;
}

/* -- Responsive Breakpoints -- */

/* Tablet landscape: tighter spacing, smaller cards */
@media (max-width: 1365px) {
  .board-tracks {
    padding: var(--space-sm) var(--space-md);
    gap: var(--space-sm);
  }

  .policy-track__label {
    min-width: 80px;
    font-size: var(--font-sm);
  }

  /* Allow horizontal scroll on player strip at 8+ players */
  .player-strip {
    justify-content: flex-start;
    padding-left: var(--space-lg);
    padding-right: var(--space-lg);
  }
}

/* Large screens: more breathing room */
@media (min-width: 1920px) {
  .board-tracks {
    padding: var(--space-xl) calc(var(--space-xl) * 2);
  }

  .policy-track {
    max-width: 1000px;
  }
}
```

**Policy tracks:** Rendered dynamically per player count. Bad policy slots show power tiles below them (greyed out until unlocked, lit when activated). Power tile content varies by player-count bracket (5-6, 7-8, 9-10) per SPEC board layout table.

**Player strip:** Horizontal strip along bottom. Each player: name, alive/dead state (dead = greyed + strikethrough, skull icon), Mayor badge (crown), Chief badge (star), connected status (dim opacity when disconnected). No term-limit indicators on host view.

**Player strip component:**

```typescript
// src/client/host/components/player-strip.ts

import type { HostState } from '../../../shared/types';

interface HostPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isMayor: boolean;
  isChief: boolean;
  isConnected: boolean;
}

/**
 * Renders the horizontal player strip at the bottom of the game board.
 * Badges: crown (Mayor), star (Chief). States: alive, dead, disconnected.
 * Dead players show strikethrough + skull. Disconnected players dim to 40%.
 *
 * Uses DOM APIs (createElement, textContent, appendChild) for safe rendering.
 * No innerHTML -- player names are user-supplied and must not be trusted as HTML.
 */
function renderPlayerStrip(
  container: HTMLElement,
  players: HostPlayer[],
): void {
  // Clear previous children
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.className = 'player-strip';

  for (const player of players) {
    const el = document.createElement('div');

    const classes = ['player-badge'];
    if (!player.isAlive) classes.push('player-badge--dead');
    if (!player.isConnected) classes.push('player-badge--disconnected');
    if (player.isMayor) classes.push('player-badge--mayor');
    if (player.isChief) classes.push('player-badge--chief');
    el.className = classes.join(' ');

    // Name (with skull prefix and strikethrough for dead players)
    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-badge__name';

    if (!player.isAlive) {
      const skull = document.createElement('span');
      skull.className = 'player-badge__skull';
      skull.textContent = '\u{1F480}'; // skull emoji
      nameSpan.appendChild(skull);
      nameSpan.appendChild(document.createTextNode(' '));
      const strikethrough = document.createElement('s');
      strikethrough.textContent = player.name;
      nameSpan.appendChild(strikethrough);
    } else {
      nameSpan.textContent = player.name;
    }

    el.appendChild(nameSpan);

    // Badge icon (Mayor crown or Chief star)
    if (player.isMayor) {
      const icon = document.createElement('span');
      icon.className = 'player-badge__icon player-badge__icon--mayor';
      icon.title = 'Mayor';
      icon.textContent = '\u265B'; // chess queen (crown)
      el.appendChild(icon);
    } else if (player.isChief) {
      const icon = document.createElement('span');
      icon.className = 'player-badge__icon player-badge__icon--chief';
      icon.title = 'Police Chief';
      icon.textContent = '\u2605'; // black star
      el.appendChild(icon);
    }

    container.appendChild(el);
  }
}

/**
 * Extract HostPlayer[] from HostState for the strip.
 * Maps the server's player projection to the display format.
 */
function getPlayerStripData(state: HostState): HostPlayer[] {
  return state.players.map(p => ({
    id: p.id,
    name: p.name,
    isAlive: p.isAlive,
    isMayor: p.isMayor,
    isChief: p.isChief,
    isConnected: p.isConnected,
  }));
}

export { renderPlayerStrip, getPlayerStripData };
export type { HostPlayer };
```

```css
/* Player badge styles (in board.css) */

.player-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--noir-slate);
  border-radius: 6px;
  border: 1px solid var(--noir-smoke);
  font-size: var(--font-sm);
  color: var(--noir-cream);
  white-space: nowrap;
  transition: opacity 0.3s, background-color 0.3s;
}

.player-badge--dead {
  opacity: 0.4;
  background: var(--noir-dead);
}

.player-badge--dead .player-badge__name s {
  color: var(--noir-muted);
}

.player-badge--disconnected {
  opacity: 0.4;
  border-style: dashed;
}

.player-badge--mayor {
  border-color: var(--noir-gold);
  box-shadow: 0 0 8px var(--noir-warm-glow);
}

.player-badge--chief {
  border-color: var(--noir-silver);
}

.player-badge__icon {
  font-size: var(--font-lg);
  line-height: 1;
}

.player-badge__icon--mayor {
  color: var(--noir-gold);
}

.player-badge__icon--chief {
  color: var(--noir-silver);
}

.player-badge__skull {
  font-size: var(--font-sm);
}
```

**Election tracker:** 3 circles/dots. Pulse animation on advance. Red glow at 2/3 to build tension. Reset to empty on successful election or auto-enact.

### Animation Specifications

All animations expose named timing hooks for Phase 5 audio sync.

**Animation timing hook system:**

```typescript
// src/client/host/animations/timing-hooks.ts

/**
 * Animation timing hook system.
 *
 * Every host animation dispatches CustomEvents at named moments.
 * Phase 5 listens to these events to trigger narrator lines and SFX.
 *
 * Events are dispatched on a dedicated EventTarget (not the DOM document)
 * to avoid collisions and allow targeted cleanup.
 */

/** All timing hook event names. */
type AnimationHook =
  // Vote reveal
  | 'vote-reveal-start'
  | 'vote-flip'
  | 'deciding-vote'
  | 'vote-reveal-complete'
  // Policy enactment
  | 'policy-flip-start'
  | 'policy-revealed'
  | 'policy-tracked'
  // Auto-enact
  | 'auto-enact-start'
  | 'auto-enact-revealed'
  // Executive power
  | 'power-overlay-enter'
  | 'power-target-revealed'
  | 'power-overlay-exit'
  // Screen transitions
  | 'screen-enter'
  | 'screen-exit'
  // Mob Boss election win
  | 'mob-boss-win-pause'
  | 'mob-boss-win-reveal';

/** Detail payloads for each hook. */
interface AnimationHookDetail {
  'vote-reveal-start':     { playerCount: number };
  'vote-flip':             { index: number; playerId: string; vote: 'approve' | 'block' };
  'deciding-vote':         { index: number; playerId: string; vote: 'approve' | 'block' };
  'vote-reveal-complete':  { approved: boolean; tally: { approve: number; block: number } };
  'policy-flip-start':     {};
  'policy-revealed':       { type: 'good' | 'bad' };
  'policy-tracked':        { type: 'good' | 'bad'; slot: number };
  'auto-enact-start':      {};
  'auto-enact-revealed':   { type: 'good' | 'bad' };
  'power-overlay-enter':   { power: 'investigate' | 'special-nomination' | 'execution' };
  'power-target-revealed': { targetName: string; power: 'investigate' | 'special-nomination' | 'execution' };
  'power-overlay-exit':    {};
  'screen-enter':          { screen: string };
  'screen-exit':           { screen: string };
  'mob-boss-win-pause':    {};
  'mob-boss-win-reveal':   {};
}

/** Dedicated event bus for animation timing hooks. */
const animationBus = new EventTarget();

/** Dispatch a typed timing hook event. */
function emitHook<K extends AnimationHook>(
  hook: K,
  detail: AnimationHookDetail[K],
): void {
  animationBus.dispatchEvent(
    new CustomEvent(hook, { detail }),
  );
}

/** Listen for a typed timing hook event. Returns cleanup function. */
function onHook<K extends AnimationHook>(
  hook: K,
  callback: (detail: AnimationHookDetail[K]) => void,
): () => void {
  const handler = (e: Event) => {
    callback((e as CustomEvent<AnimationHookDetail[K]>).detail);
  };
  animationBus.addEventListener(hook, handler);
  return () => animationBus.removeEventListener(hook, handler);
}

/** Remove all listeners (call on screen teardown). */
function clearAllHooks(): void {
  // EventTarget has no removeAllListeners -- components must track their
  // own cleanup functions from onHook() and call them on unmount.
  // This function is a future extension point if we wrap with a Set.
}

export { animationBus, emitHook, onHook, clearAllHooks };
export type { AnimationHook, AnimationHookDetail };
```

#### Vote Reveal Animation
- **Trigger:** `election-result` event
- **Duration:** ~400ms per vote + 200ms gap = ~6s total for 10 players
- **Ordering:** Random order, with a ~500ms dramatic pause before the deciding vote
- **Mechanic:** Each vote card flips from face-down (generic card back) to face-up (approve/block art from Phase 0 assets)
- **Running tally:** Updates incrementally as each vote reveals
- **Outcome:** Final tally displayed, "Approved" or "Blocked" text with color treatment
- **Timing hooks:** `onVoteRevealStart`, `onVoteFlip(index)`, `onDecidingVote`, `onVoteRevealComplete`

**Vote card flip CSS:**

```css
/* src/client/host/styles/animations.css */

/* -- Vote Card Flip -- */

.vote-card {
  width: var(--card-width);
  height: var(--card-height);
  perspective: 800px;
  cursor: default;
}

.vote-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: none; /* animation is programmatic, not CSS transition */
}

.vote-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--card-radius);
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-card);
}

.vote-card__back {
  background: var(--noir-slate);
  border: 2px solid var(--noir-smoke);
}

.vote-card__back::after {
  content: '?';
  font-size: var(--font-xl);
  color: var(--noir-muted);
}

.vote-card__front {
  transform: rotateY(180deg);
}

.vote-card__front--approve {
  background: var(--noir-warm-glow);
  border: 2px solid var(--noir-gold);
}

.vote-card__front--block {
  background: var(--noir-red-glow);
  border: 2px solid var(--noir-crimson);
}

.vote-card__front img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

/* Player name below card */
.vote-card__name {
  text-align: center;
  font-size: var(--font-xs);
  color: var(--noir-muted);
  margin-top: var(--space-xs);
  white-space: nowrap;
}

/* -- Vote Reveal Layout -- */

.vote-reveal {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-lg);
}

.vote-reveal__tally {
  width: 100%;
  text-align: center;
  font-size: var(--font-xl);
  color: var(--noir-cream);
  margin-top: var(--space-md);
}

.vote-reveal__outcome {
  font-size: var(--font-2xl);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: var(--space-sm);
}

.vote-reveal__outcome--approved {
  color: var(--noir-gold);
  text-shadow: 0 0 20px var(--noir-warm-glow);
}

.vote-reveal__outcome--blocked {
  color: var(--noir-blood);
  text-shadow: 0 0 20px var(--noir-red-glow);
}
```

**Vote reveal orchestrator:**

```typescript
// src/client/host/animations/vote-reveal.ts

import { emitHook } from './timing-hooks';

interface VoteData {
  playerId: string;
  playerName: string;
  vote: 'approve' | 'block';
}

interface VoteRevealConfig {
  flipDurationMs: number;   // duration of each card flip (400ms)
  gapMs: number;            // pause between flips (200ms)
  decidingPauseMs: number;  // dramatic pause before deciding vote (500ms)
  outcomePauseMs: number;   // pause after all votes before showing outcome (800ms)
}

const DEFAULT_CONFIG: VoteRevealConfig = {
  flipDurationMs: 400,
  gapMs: 200,
  decidingPauseMs: 500,
  outcomePauseMs: 800,
};

/**
 * Determines the reveal order for votes:
 * 1. Shuffle all votes randomly.
 * 2. Find the "deciding vote" -- the vote that tips the majority.
 * 3. Place the deciding vote last.
 *
 * The deciding vote is the Nth approve or block that crosses the
 * majority threshold (> half of alive voters). If no single vote
 * is decisive (e.g., unanimous), the last vote in shuffle order is
 * treated as the dramatic closer.
 */
function computeRevealOrder(votes: VoteData[]): {
  order: VoteData[];
  decidingIndex: number;
} {
  // Fisher-Yates shuffle
  const shuffled = [...votes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Find the deciding vote: simulate the running tally
  const majority = Math.floor(votes.length / 2) + 1;
  let approveCount = 0;
  let blockCount = 0;
  let decidingIdx = shuffled.length - 1; // default: last card

  for (let i = 0; i < shuffled.length; i++) {
    if (shuffled[i].vote === 'approve') approveCount++;
    else blockCount++;

    if (approveCount >= majority || blockCount >= majority) {
      decidingIdx = i;
      break;
    }
  }

  // Move deciding vote to end
  if (decidingIdx < shuffled.length - 1) {
    const deciding = shuffled.splice(decidingIdx, 1)[0];
    shuffled.push(deciding);
    decidingIdx = shuffled.length - 1;
  }

  return { order: shuffled, decidingIndex: decidingIdx };
}

/**
 * Orchestrate the full vote reveal animation sequence.
 *
 * Uses the Web Animations API (Element.animate()) for GPU-accelerated
 * card flips. Each card is flipped programmatically with
 * animation.finished promises for sequencing.
 *
 * @returns Promise that resolves after the entire sequence completes.
 */
async function playVoteReveal(
  container: HTMLElement,
  votes: VoteData[],
  config: VoteRevealConfig = DEFAULT_CONFIG,
): Promise<{ approved: boolean; tally: { approve: number; block: number } }> {
  const { order, decidingIndex } = computeRevealOrder(votes);

  emitHook('vote-reveal-start', { playerCount: votes.length });

  let approveCount = 0;
  let blockCount = 0;

  for (let i = 0; i < order.length; i++) {
    const vote = order[i];
    const isDeciding = i === decidingIndex;

    // Dramatic pause before deciding vote
    if (isDeciding) {
      emitHook('deciding-vote', {
        index: i,
        playerId: vote.playerId,
        vote: vote.vote,
      });
      await delay(config.decidingPauseMs);
    }

    // Find the card element and flip it using Web Animations API
    const cardInner = container.querySelector(
      `[data-vote-id="${vote.playerId}"] .vote-card__inner`,
    ) as HTMLElement | null;

    if (cardInner) {
      const flipAnimation = cardInner.animate(
        [
          { transform: 'rotateY(0deg)' },
          { transform: 'rotateY(180deg)' },
        ],
        {
          duration: config.flipDurationMs,
          easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // ease-out-back
          fill: 'forwards',
        },
      );

      await flipAnimation.finished;
    }

    // Update running tally
    if (vote.vote === 'approve') approveCount++;
    else blockCount++;

    emitHook('vote-flip', { index: i, playerId: vote.playerId, vote: vote.vote });

    // Update the tally display in the DOM
    updateTallyDisplay(container, approveCount, blockCount);

    // Gap between flips (skip after last)
    if (i < order.length - 1) {
      await delay(config.gapMs);
    }
  }

  // Pause before outcome
  await delay(config.outcomePauseMs);

  const approved = approveCount > blockCount;
  const tally = { approve: approveCount, block: blockCount };

  emitHook('vote-reveal-complete', { approved, tally });

  return { approved, tally };
}

function updateTallyDisplay(
  container: HTMLElement,
  approve: number,
  block: number,
): void {
  const tallyEl = container.querySelector('.vote-reveal__tally');
  if (tallyEl) {
    tallyEl.textContent = `Approve: ${approve}  /  Block: ${block}`;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { playVoteReveal, computeRevealOrder, DEFAULT_CONFIG };
export type { VoteData, VoteRevealConfig };
```

#### Policy Card Reveal Animation
- **Trigger:** `policy-enacted` event
- **Duration:** 800ms flip + 500ms pause + 500ms slide-to-track
- **Mechanic:** Card appears center screen face-down, flips to reveal good/bad, pauses for impact, slides into the correct track slot
- **Track update:** Slot fills in with the policy color/art, power tile below lights up if applicable
- **Timing hooks:** `onPolicyFlipStart`, `onPolicyRevealed(type)`, `onPolicyTracked`

**Policy card reveal CSS:**

```css
/* src/client/host/styles/animations.css (continued) */

/* -- Policy Card Reveal -- */

.policy-reveal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 100;
  pointer-events: none;
}

.policy-reveal__card {
  width: calc(var(--card-width) * 2.5);
  height: calc(var(--card-height) * 2.5);
  perspective: 1200px;
}

.policy-reveal__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.policy-reveal__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: calc(var(--card-radius) * 2);
  box-shadow: var(--shadow-card), 0 0 40px rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.policy-reveal__back {
  background: var(--noir-slate);
  border: 3px solid var(--noir-smoke);
}

.policy-reveal__front {
  transform: rotateY(180deg);
}

.policy-reveal__front--good {
  background: linear-gradient(135deg, var(--noir-charcoal), #1a2a1a);
  border: 3px solid var(--noir-gold);
}

.policy-reveal__front--bad {
  background: linear-gradient(135deg, var(--noir-charcoal), #2a1a1a);
  border: 3px solid var(--noir-crimson);
}

.policy-reveal__front img {
  width: 85%;
  height: 85%;
  object-fit: contain;
}

/* "Auto-Enacted" label variant */
.policy-reveal__label {
  position: absolute;
  top: calc(-1 * var(--space-xl));
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--font-lg);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--noir-blood);
  white-space: nowrap;
}

.policy-reveal--auto-enact .policy-reveal__face {
  border-style: dashed;
}
```

**Policy card reveal TypeScript (Web Animations API):**

```typescript
// src/client/host/animations/policy-flip.ts

import { emitHook } from './timing-hooks';

interface PolicyFlipConfig {
  flipDurationMs: number;     // 800ms
  revealPauseMs: number;      // 500ms -- hold after reveal for impact
  slideToTrackMs: number;     // 500ms -- slide card into track slot
}

const DEFAULT_POLICY_CONFIG: PolicyFlipConfig = {
  flipDurationMs: 800,
  revealPauseMs: 500,
  slideToTrackMs: 500,
};

/**
 * Play the policy card reveal animation.
 *
 * 1. Card appears center-screen face-down (scale 0 -> 1, 300ms).
 * 2. Card flips to reveal good/bad (rotateY 0 -> 180deg, 800ms).
 * 3. Pause for impact (500ms).
 * 4. Card slides to the target track slot and shrinks (500ms).
 * 5. Track slot fills in.
 *
 * All transforms are GPU-accelerated (transform + opacity only).
 */
async function playPolicyReveal(
  cardEl: HTMLElement,
  innerEl: HTMLElement,
  targetSlot: HTMLElement,
  policyType: 'good' | 'bad',
  config: PolicyFlipConfig = DEFAULT_POLICY_CONFIG,
): Promise<void> {
  emitHook('policy-flip-start', {});

  // Step 1: Card entrance (scale in from nothing)
  const entrance = cardEl.animate(
    [
      { transform: 'scale(0)', opacity: '0' },
      { transform: 'scale(1)', opacity: '1' },
    ],
    { duration: 300, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', fill: 'forwards' },
  );
  await entrance.finished;

  // Step 2: Card flip
  const flip = innerEl.animate(
    [
      { transform: 'rotateY(0deg)' },
      { transform: 'rotateY(180deg)' },
    ],
    { duration: config.flipDurationMs, easing: 'ease-in-out', fill: 'forwards' },
  );
  await flip.finished;

  emitHook('policy-revealed', { type: policyType });

  // Step 3: Dramatic pause
  await delay(config.revealPauseMs);

  // Step 4: Slide to track slot
  // Compute the translation from card's current position to the target slot
  const cardRect = cardEl.getBoundingClientRect();
  const slotRect = targetSlot.getBoundingClientRect();
  const dx = slotRect.left + slotRect.width / 2 - (cardRect.left + cardRect.width / 2);
  const dy = slotRect.top + slotRect.height / 2 - (cardRect.top + cardRect.height / 2);
  const scaleX = slotRect.width / cardRect.width;
  const scaleY = slotRect.height / cardRect.height;

  const slideToTrack = cardEl.animate(
    [
      { transform: 'scale(1) translate(0, 0)', opacity: '1' },
      { transform: `scale(${scaleX}, ${scaleY}) translate(${dx}px, ${dy}px)`, opacity: '0.8' },
    ],
    { duration: config.slideToTrackMs, easing: 'ease-in', fill: 'forwards' },
  );
  await slideToTrack.finished;

  // Step 5: Light up the track slot
  targetSlot.classList.add('policy-slot--filled');

  emitHook('policy-tracked', {
    type: policyType,
    slot: parseInt(targetSlot.dataset.slotIndex ?? '0', 10),
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { playPolicyReveal, DEFAULT_POLICY_CONFIG };
export type { PolicyFlipConfig };
```

#### Auto-Enact Animation
- Same as policy card reveal but with:
- "Auto-Enacted" label above the card
- No Mayor/Chief attribution
- Different card border treatment (dashed/warning style)
- **Timing hooks:** `onAutoEnactStart`, `onAutoEnactRevealed(type)`

#### Executive Power Overlay
- **Trigger:** `executive-power-activated` event
- **Duration:** Minimum 5s, stays until power resolves
- **Mechanic:** Screen darkens (backdrop-filter: brightness(0.3)), power card asset from Phase 0 animates in from center (scale 0 -> 1 with ease-out-back), Chief name displayed, "Selecting target..." text
- **For execution:** When target is revealed, name appears with dramatic emphasis. If Mob Boss -> pause 2s -> transition to game-over
- **Timing hooks:** `onPowerOverlayEnter`, `onPowerTargetRevealed(targetName)`, `onPowerOverlayExit`

**Executive power overlay CSS:**

```css
/* src/client/host/styles/overlays.css */

/* -- Executive Power Overlay -- */

.power-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  /* Semi-transparent background required for backdrop-filter */
  background-color: rgba(10, 10, 12, 0.3);
  backdrop-filter: brightness(0.3) blur(4px);
  -webkit-backdrop-filter: brightness(0.3) blur(4px);
  opacity: 0;
  pointer-events: all;
}

/* Entry animation: fade in overlay */
.power-overlay--entering {
  animation: overlay-fade-in 300ms var(--ease-smooth) forwards;
}

/* Exit animation: fade out overlay */
.power-overlay--exiting {
  animation: overlay-fade-out 200ms var(--ease-smooth) forwards;
}

@keyframes overlay-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes overlay-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

.power-overlay__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  text-align: center;
}

/* Power card scales in with overshoot */
.power-overlay__card {
  width: calc(var(--card-width) * 3);
  height: calc(var(--card-height) * 3);
  border-radius: calc(var(--card-radius) * 2);
  box-shadow: 0 0 60px rgba(168, 32, 32, 0.4), var(--shadow-card);
  overflow: hidden;
  /* Initial state for scale-in animation */
  transform: scale(0);
}

.power-overlay__card--animate-in {
  animation: power-card-scale-in 600ms var(--ease-dramatic) forwards;
}

@keyframes power-card-scale-in {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.power-overlay__card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.power-overlay__chief {
  font-size: var(--font-xl);
  color: var(--noir-cream);
  font-weight: 600;
}

.power-overlay__status {
  font-size: var(--font-lg);
  color: var(--noir-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Pulsing ellipsis while selecting */
.power-overlay__status--selecting::after {
  content: '...';
  animation: ellipsis-pulse 1.5s ease-in-out infinite;
}

@keyframes ellipsis-pulse {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 1; }
}

/* Target reveal: name fades in with emphasis */
.power-overlay__target {
  font-size: var(--font-2xl);
  font-weight: 700;
  color: var(--noir-blood);
  text-shadow: 0 0 30px var(--noir-red-glow);
  opacity: 0;
}

.power-overlay__target--revealed {
  animation: target-reveal 800ms var(--ease-smooth) forwards;
}

@keyframes target-reveal {
  0%   { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}

/* -- Generic Overlay (Veto, Reshuffle, Session Status) -- */

.board-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  place-items: center;
  background: var(--overlay-medium);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.board-overlay--enter {
  animation: overlay-fade-in 300ms var(--ease-smooth) forwards;
}

.board-overlay--exit {
  animation: overlay-fade-out 200ms var(--ease-smooth) forwards;
}

.board-overlay__text {
  font-size: var(--font-xl);
  color: var(--noir-cream);
  text-align: center;
  padding: var(--space-xl);
  background: var(--glass-surface);
  border-radius: 12px;
  border: 1px solid var(--noir-smoke);
  box-shadow: var(--shadow-card);
  max-width: 80vw;
}

/* -- Status Bar Overlay (bottom strip, non-blocking) -- */

.status-bar-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 120;
  padding: var(--space-sm) var(--space-lg);
  background: var(--glass-surface);
  border-top: 1px solid var(--noir-smoke);
  text-align: center;
  font-size: var(--font-base);
  color: var(--noir-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  animation: slide-up 300ms var(--ease-smooth) forwards;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

#### Screen Transitions
- **Between screens:** 400ms crossfade
- **Overlay enter:** 300ms fade-in with slight scale
- **Overlay exit:** 200ms fade-out

**Screen transition CSS:**

```css
/* src/client/host/styles/animations.css (continued) */

/* -- Screen Transitions -- */

.host-screen {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 400ms var(--ease-smooth);
}

.host-screen--active {
  opacity: 1;
  z-index: 1;
}

.host-screen--exiting {
  opacity: 0;
  z-index: 0;
}
```

#### Mob Boss Election Win Sequence
Special choreography for the most dramatic game ending:
1. Vote reveal animation plays normally (election approved)
2. 2-second dramatic pause
3. Screen darkens
4. "The Mob Boss has taken office" text fades in
5. Transition to game-over with mob win

### Game Over Screen

- **Winner announcement:** Large text, "Citizens Win" (warm) or "Mob Wins" (dark red)
- **Win reason:** e.g., "The Mob Boss was executed" / "6 bad policies enacted"
- **Role reveal:** All players shown with their actual roles (citizen/mob-soldier/mob-boss) -- roles included in HostState projection ONLY when `phase === 'game-over'`
- **Stats:** Total rounds, final policy counts (X good / Y bad), win condition
- **Play Again button:** Host-only interaction, triggers `reset-to-lobby`
- No deck count or per-round history (out of scope for v1)

### Veto Flow on Host View

After 5 bad policies, veto becomes possible during policy sessions:

1. **Policy session starts** -> Game Board shows "Policy Session in Progress" status bar
2. **Chief proposes veto** -> `veto-proposed` overlay appears: "Veto Proposed -- Awaiting Mayor's Decision"
3. **Mayor accepts** -> `veto-result` overlay: "Veto Accepted -- Policies Discarded" (2s) -> election tracker animates +1 -> back to Game Board
4. **Mayor rejects** -> `veto-result` overlay: "Veto Rejected" (2s) -> Policy Enacted screen plays normally

### Deck Reshuffle Visual

- Brief overlay on Game Board: deck icon fills up with cards animation
- Duration: 2s, does not interrupt gameplay flow
- Triggered by `deck-reshuffled` event
- No deck counter visible (random threshold is designed to prevent card counting)

### Lobby Screen -- QR Code Display

The lobby screen maximizes the QR code for scanning from across the room. The QR is rendered as SVG (crisp at any size) using the `qrcode` npm package (already a Phase 2 dependency).

```typescript
// QR code rendering in src/client/host/screens/lobby.ts (excerpt)

import QRCode from 'qrcode';

/**
 * Render the QR code as inline SVG for the lobby screen.
 *
 * SVG rendering ensures crispness at any display size -- no pixelation
 * on large TV screens. Error correction level M (15%) provides good
 * scanning reliability while keeping module count reasonable.
 *
 * Scanning distance considerations:
 * - QR module size must be >= 2mm at scanning distance
 * - 10" tablet at 2m: QR should be >= 200px (covers ~5cm, 2.5mm modules)
 * - 55" TV at 4m: QR should be >= 300px (covers ~15cm, 3.5mm modules)
 * - We use min 200px, scale up to 40vh, which satisfies both scenarios
 */
async function renderQRCode(
  container: HTMLElement,
  joinUrl: string,
): Promise<void> {
  const svgString = await QRCode.toString(joinUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,                    // 2-module quiet zone (minimum for reliable scanning)
    color: {
      dark: '#e8e0d0',           // --noir-cream (light modules on dark background)
      light: '#0a0a0c',         // --noir-black (transparent/dark background)
    },
  });

  // Parse the SVG string safely and insert into the DOM
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = svgDoc.documentElement;

  // SVG fills its container -- size is controlled by CSS
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
  // Preserve the viewBox for proper scaling
  if (!svgEl.hasAttribute('viewBox')) {
    svgEl.setAttribute('viewBox', '0 0 100 100');
  }
  svgEl.style.width = '100%';
  svgEl.style.height = '100%';

  // Clear container and append parsed SVG
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(document.adoptNode(svgEl));
}
```

```css
/* Lobby screen layout */

.lobby {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "title   title"
    "qr      players"
    "code    start";
  height: 100vh;
  height: 100dvh;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background-color: var(--noir-black);
  color: var(--noir-cream);
}

.lobby__title {
  grid-area: title;
  text-align: center;
  font-size: var(--font-hero);
  font-weight: 700;
  color: var(--noir-gold);
  letter-spacing: 0.1em;
}

.lobby__qr {
  grid-area: qr;
  display: grid;
  place-items: center;
  /* QR fills maximum available space: min 200px, up to 40vh */
  min-width: 200px;
  min-height: 200px;
  max-width: 40vh;
  max-height: 40vh;
  justify-self: center;
  align-self: center;
}

.lobby__players {
  grid-area: players;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  overflow-y: auto;
}

.lobby__room-code {
  grid-area: code;
  font-size: var(--font-2xl);
  font-weight: 700;
  letter-spacing: 0.3em;
  text-align: center;
  color: var(--noir-gold);
  font-family: 'JetBrains Mono', monospace;
}

.lobby__start-btn {
  grid-area: start;
  justify-self: center;
  align-self: center;
  padding: var(--space-sm) var(--space-xl);
  font-size: var(--font-lg);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  background: var(--noir-gold);
  color: var(--noir-black);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.lobby__start-btn:hover {
  background: var(--noir-amber);
  transform: scale(1.02);
}

.lobby__start-btn:disabled {
  background: var(--noir-smoke);
  color: var(--noir-muted);
  cursor: not-allowed;
  transform: none;
}

/* Tablet: stack QR above player list */
@media (max-width: 1365px) {
  .lobby {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto auto;
    grid-template-areas:
      "title"
      "qr"
      "players"
      "code"
      "start";
  }

  .lobby__qr {
    max-width: 35vh;
    max-height: 35vh;
  }
}
```

### File Structure

```
src/client/
  +-- host/
  |   +-- host-app.ts         # Entry point, WebSocket, state container
  |   +-- host-router.ts      # getHostScreen() function
  |   +-- transition-queue.ts  # Minimum display duration enforcement
  |   +-- screens/
  |   |   +-- lobby.ts
  |   |   +-- game-board.ts   # Persistent base with policy tracks, player strip
  |   |   +-- nomination.ts
  |   |   +-- election-results.ts
  |   |   +-- policy-enacted.ts
  |   |   +-- auto-enact.ts
  |   |   +-- executive-power.ts
  |   |   +-- game-over.ts
  |   +-- components/
  |   |   +-- policy-track.ts  # Good/bad tracks with power tiles
  |   |   +-- election-tracker.ts
  |   |   +-- player-strip.ts  # Horizontal player list
  |   |   +-- vote-card.ts     # Individual vote flip animation
  |   |   +-- overlays.ts      # Veto, reshuffle, status overlays
  |   +-- animations/
  |   |   +-- timing-hooks.ts  # Custom event bus for Phase 5 audio sync
  |   |   +-- vote-reveal.ts   # Orchestrates sequential vote flips
  |   |   +-- policy-flip.ts   # Card reveal animation
  |   |   +-- power-overlay.ts # Executive power entrance
  |   +-- styles/
  |       +-- host-base.css    # Landscape layout, CSS variables, resets
  |       +-- board.css        # Policy tracks, election tracker, player strip
  |       +-- animations.css   # Keyframes, card flip, transitions
  |       +-- overlays.css     # Overlay styles (power, veto, status)
```

Host View and Player View share `src/shared/` types and `src/client/connection.ts` WebSocket logic, but have separate entry points and screen trees.

### Responsive Layout Strategy

- CSS Grid for main board layout (`grid-template-areas` with named regions)
- `clamp()` for all font sizes and spacing -- zero media queries for sizing, only layout restructuring
- Policy track slots: fixed aspect ratio via `calc(var(--card-width) * 1.4)`, flexible size via clamp
- Player strip: `flex` with `overflow-x: auto` for 8+ players on smaller viewports; `justify-content: center` on wider screens
- QR code on lobby: SVG fills container, container sized `min(200px)` up to `max(40vh)` -- crisp at any resolution
- All text: minimum 0.75rem (12px) via clamp minimums; body text floor of 1rem (16px)

**Responsive breakpoints:**

```css
/* src/client/host/styles/host-base.css (continued) */

/* -- Base Reset & Landscape Lock -- */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
  background: var(--noir-black);
  color: var(--noir-cream);
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* -- Breakpoint: Tablet Landscape (1024x768) -- */
@media (min-width: 1024px) and (max-width: 1365px) {
  :root {
    /* Tighten card dimensions for tablet */
    --card-width: clamp(50px, 4vw + 10px, 80px);
  }

  .board-tracks {
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
  }

  /* Policy track labels shrink */
  .policy-track__label {
    font-size: var(--font-sm);
    min-width: 80px;
  }

  /* Player strip scrolls horizontally if needed */
  .player-strip {
    justify-content: flex-start;
  }
}

/* -- Breakpoint: Laptop/TV (1366x768 to 1920x1080) -- */
@media (min-width: 1366px) {
  :root {
    --card-width: clamp(70px, 4vw + 20px, 120px);
  }

  .board-tracks {
    gap: var(--space-md);
    padding: var(--space-lg) var(--space-xl);
  }

  /* Player strip centers on wide screens */
  .player-strip {
    justify-content: center;
  }
}

/* -- Breakpoint: Large TV / 4K (1920px+) -- */
@media (min-width: 1920px) {
  :root {
    --card-width: clamp(90px, 5vw + 20px, 140px);
  }

  .board-tracks {
    padding: var(--space-xl) calc(var(--space-xl) * 2);
  }

  .policy-track {
    max-width: 1100px;
  }
}

/* -- Height-constrained viewports (768px height) -- */
@media (max-height: 800px) {
  .board-tracks {
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
  }

  .board-header {
    padding: var(--space-xs) var(--space-md);
  }

  .player-strip {
    padding: var(--space-xs) var(--space-sm);
  }
}
```

## Technical Considerations

- **Landscape lock** -- request landscape orientation via manifest and `screen.orientation.lock('landscape')` where supported. This requires fullscreen on most browsers. Graceful degradation: if lock fails (desktop, iOS without fullscreen), the layout still works -- it just will not force rotation. Call inside a user gesture handler (e.g., "Start Game" button click) wrapped in try/catch.
- **No private data** -- Host View NEVER receives roles, cards, deck contents, or reshuffle threshold. Projection is allowlist-based (Phase 2). Exception: game-over includes all roles.
- **Animation timing hooks** -- every animation exposes named callbacks/custom events via the `animationBus` EventTarget. Phase 5 hooks into these for narrator line playback. This is not optional -- retrofitting sync later is painful. The `emitHook` / `onHook` API is the contract between Phase 4 and Phase 5.
- **Minimum display durations** -- enforced client-side via `TransitionQueue`. Even if server sends rapid state updates, transient screens persist for their minimum duration. The queue coalesces intermediate states: if 3 updates arrive while a screen is displaying, only the latest is shown when the minimum expires.
- **CSS transforms for animations** -- GPU-accelerated, no layout thrashing. Vote card flips (`rotateY`), policy reveals (`rotateY` + `translate`), overlay entrances (`scale` + `opacity`) all use `transform` and `opacity` only. No `width`, `height`, `top`, `left` animations.
- **Web Animations API over CSS animations** -- programmatic card flips use `Element.animate()` for precise sequencing via `animation.finished` promises. CSS `@keyframes` are used for looping/persistent effects (glow, pulse, ellipsis) that do not need programmatic control.

## Acceptance Criteria

### Screens
- [ ] All 8 screens implemented and rendering correctly
- [ ] Host screen router deterministically maps state to screen
- [ ] Game Board shows correct power tiles for each player count bracket
- [ ] Overlays (veto, reshuffle, session-active) render on Game Board
- [ ] Game Over shows all roles revealed + Play Again button

### Animations
- [ ] Vote reveal: sequential flip, random order, dramatic pause before deciding vote
- [ ] Policy enacted: card flip + slide to track
- [ ] Executive power: darkened backdrop, power card scales in
- [ ] Election tracker: pulse on advance, red glow at 2/3
- [ ] Mob Boss election win: special dramatic sequence (pause, darken, reveal)
- [ ] All animations expose timing hooks for Phase 5 audio sync
- [ ] Minimum display durations enforced on transient screens

### Layout
- [ ] Responsive at 1024x768 (tablet) through 1920x1080 (laptop/TV)
- [ ] Policy tracks readable at minimum viewport
- [ ] Player strip handles 5-10 players without overflow issues
- [ ] QR code scannable from across room on lobby screen

### Information Display
- [ ] Policy tracks show enacted count with correct visual
- [ ] Bad policy power tiles vary by player count and light up when activated
- [ ] Player strip shows: name, alive/dead, Mayor badge, Chief badge, connected status
- [ ] Election tracker visually builds tension approaching 3
- [ ] No private information visible at any point before game-over

### Testing
- [ ] Layout tests at both breakpoints (1024x768, 1920x1080)
- [ ] Animation timing hook tests (callbacks fire at correct moments)
- [ ] All 3 player-count board configurations render correctly
- [ ] Game-over role reveal shows correct roles for all players
- [ ] Veto flow overlays display at correct sub-phases
- [ ] Host reconnect renders current state instantly, no animation replay

## Success Metrics

- Vote reveal animation feels dramatic and well-paced at 5 and 10 players
- Policy enactment moment is visually satisfying (the room reacts)
- Game board is readable from 2 meters away on a 10-inch tablet
- Animations run at 60fps on mid-range tablet hardware
- The room never sees private information before game-over

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Animation performance on low-end tablets | Medium | Medium | CSS transforms only (GPU-accelerated), test on real hardware |
| Vote reveal timing feels wrong (too fast/slow) | Medium | Medium | Tunable timing constants; playtest and iterate |
| Board layout doesn't scale well at extremes | Medium | Medium | Test at both breakpoints early; use CSS clamp() |
| Phase 5 audio sync difficult to retrofit | Low | High | Build timing hooks from day one (this plan requires them) |
| QR code too small to scan on tablet | Low | Medium | Maximize QR size on lobby screen; test at distance |
| backdrop-filter performance on older tablets | Medium | Low | Fallback: solid dark background if backdrop-filter unsupported |
| Web Animations API missing on older browsers | Low | Low | Baseline since 2020; polyfill available if needed |

## Sources & References

- SPEC.md host/table screens: `docs/spec/SPEC.md:198-208`
- SPEC.md board layout by player count: `docs/spec/SPEC.md:114-128`
- Phase 0 asset list: `docs/plans/2026-03-16-001-feat-phase-0-asset-generation-plan.md`
- Phase 2 HostState projection: `docs/plans/2026-03-16-003-feat-phase-2-multiplayer-plan.md`
- Phase 3 Board View (mirrors Host View): `docs/plans/2026-03-16-004-feat-phase-3-player-view-plan.md`
- Deck reshuffle brainstorm: `docs/brainstorms/2026-03-16-deck-reshuffle-brainstorm.md`
- MDN CSS Grid Layout: `https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout`
- MDN CSS clamp(): `https://developer.mozilla.org/en-US/docs/Web/CSS/clamp`
- MDN Web Animations API: `https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API`
- MDN CustomEvent: `https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent`
- MDN backdrop-filter: `https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter`
- MDN screen.orientation.lock(): `https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock`
