---
title: "Phase 3: Player View — Phone UI, Screens, Interactions"
type: feat
status: active
date: 2026-03-16
phase: 3
deepened: true
---

# Phase 3: Player View

## Overview

Build the player-facing phone UI — 15 distinct screens driven by server state, rendered in vanilla TypeScript + CSS with zero framework dependencies. Each player's phone is a private information terminal: it shows role reveals, voting UI, policy cards, executive power prompts, and a Board View toggle. Must work on iOS Safari and Android Chrome in portrait orientation.

## Problem Statement / Motivation

The phone is the core innovation of UMB — it replaces the "close your eyes" trust system with actual private information channels. Every social deduction moment (role reveal, secret vote, private policy session) depends on this view working correctly and securely on mobile browsers.

## Proposed Solution

### Screen Inventory (15 screens)

The SPEC lists 12 screens. SpecFlow analysis revealed 3 missing screens needed for complete gameplay:

| # | Screen ID | Trigger | Interactive? | Notes |
|---|---|---|---|---|
| 1 | `lobby` | On join | Yes (Ready toggle) | Room code, player list |
| 2 | `role-reveal` | Game start | Yes (Acknowledge) | Card flip animation, haptic |
| 3 | `waiting` | Between phases | No | Contextual messaging per (phase, subPhase) |
| 4 | `vote` | Election phase | Yes (Approve/Block) | Timer countdown |
| 5 | `mayor-nomination` | Nomination (Mayor only) | Yes (Pick target) | **NEW** — interactive player list |
| 6 | `mayor-hand` | Policy session (Mayor) | Yes (Discard 1 of 3) | Timer countdown |
| 7 | `chief-hand` | Policy session (Chief) | Yes (Discard 1 of 2, optional veto) | Timer, veto button if unlocked |
| 8 | `veto-response` | Veto proposed (Mayor) | Yes (Accept/Reject) | **NEW** — 15s timer |
| 9 | `power-investigate` | Investigate power (Chief) | Yes (Pick target) | Player list |
| 10 | `power-nominate` | Special nomination (Chief) | Yes (Pick target) | Player list |
| 11 | `power-execute` | Execution power (Chief) | Yes (Pick target) | Player list |
| 12 | `investigation-result` | After investigation | No (auto-dismiss) | Chief sees allegiance; target sees notification |
| 13 | `eliminated` | Target of execution | No (auto-dismiss 5s) | Full screen skull, haptic |
| 14 | `spectator` | After elimination | No | Read-only board view with spectator label |
| 15 | `game-over` | Game ends | No (play-again if host resets) | Winner, all roles revealed |

Board View is an overlay toggle, not a distinct screen — it can be activated from any non-action screen.

### Screen Router

Deterministic function that maps server state to exactly one screen:

```typescript
function getActiveScreen(
  state: PlayerState,
  playerId: string
): ScreenId {
  if (state.phase === 'game-over') return 'game-over';
  if (!state.isAlive && state.phase !== 'lobby') return 'spectator';
  if (state.phase === 'lobby') return 'lobby';
  if (state.phase === 'role-reveal') return 'role-reveal';

  // Active player screens
  if (state.isMayor && state.subPhase === 'nomination-pending') return 'mayor-nomination';
  if (state.isMayor && state.subPhase === 'policy-mayor-discard') return 'mayor-hand';
  if (state.isMayor && state.subPhase === 'policy-veto-response') return 'veto-response';
  if (state.isChief && state.subPhase === 'policy-chief-discard') return 'chief-hand';
  if (state.isChief && state.subPhase === 'executive-power-pending') {
    switch (state.executivePower) {
      case 'investigate': return 'power-investigate';
      case 'special-nomination': return 'power-nominate';
      case 'execution': return 'power-execute';
    }
  }
  if (state.subPhase === 'election-voting' && !state.hasVoted) return 'vote';

  // Investigation results (private)
  if (state.pendingInvestigationResult) return 'investigation-result';
  if (state.justEliminated) return 'eliminated';

  return 'waiting';
}
```

### Client State Management

No framework — minimal reactive pattern:

```typescript
// Single global state + render loop
interface AppState {
  serverState: PlayerState | null;
  privateData: PrivateData | null;
  boardViewActive: boolean;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting';
  audioUnlocked: boolean;
}

function render(appState: AppState): void {
  const screenId = getActiveScreen(appState.serverState, playerId);
  if (screenId !== currentScreenId) {
    transitionToScreen(screenId, appState);
  } else {
    updateCurrentScreen(appState);
  }
}
```

- `state-update` → update `serverState`, call `render()`
- `private-update` → update `privateData`, call `render()`
- Messages from same dispatch arrive in sequence (PartyKit is single-threaded) — `private-update` always arrives within the same batch as its `state-update`
- Client buffers briefly (16ms / one frame) if private data is expected but not yet received

### File Structure

```
src/client/
  ├── app.ts              # Entry point, WebSocket setup, state container
  ├── router.ts           # getActiveScreen() function
  ├── connection.ts       # WebSocket management, reconnection, heartbeat
  ├── state/
  │   └── store.ts        # AppState container, render trigger
  ├── views/
  │   ├── lobby.ts
  │   ├── role-reveal.ts
  │   ├── waiting.ts
  │   ├── vote.ts
  │   ├── mayor-nomination.ts
  │   ├── mayor-hand.ts
  │   ├── chief-hand.ts
  │   ├── veto-response.ts
  │   ├── power-investigate.ts
  │   ├── power-nominate.ts
  │   ├── power-execute.ts
  │   ├── investigation-result.ts
  │   ├── eliminated.ts
  │   ├── spectator.ts
  │   ├── game-over.ts
  │   └── board-view.ts   # Overlay component
  └── styles/
      ├── base.css         # Reset, variables, typography
      ├── screens.css      # Per-screen styles
      └── animations.css   # Card flip, transitions, shake
```

Each view module exports `mount(container, state)` and `update(state)` functions. Screen transitions swap the active view in a single container div.

**Concrete view module pattern (example: `vote.ts`):**

```typescript
// src/client/views/vote.ts

import type { PlayerState } from '../../shared/protocol';
import type { AppState } from '../state/store';

interface VoteViewState {
  mounted: boolean;
  voteCast: boolean;
}

const viewState: VoteViewState = { mounted: false, voteCast: false };

export function mount(container: HTMLElement, state: AppState): void {
  viewState.mounted = true;
  viewState.voteCast = false;

  const wrapper = document.createElement('div');
  wrapper.className = 'vote-screen';

  // Nominee info
  const nominee = document.createElement('div');
  nominee.className = 'vote-screen__nominee';
  nominee.textContent = `Proposed Chief: ${getPlayerName(state, state.serverState?.nominatedChiefId)}`;
  wrapper.appendChild(nominee);

  // Timer
  const timer = document.createElement('div');
  timer.className = 'vote-screen__timer';
  timer.id = 'vote-timer';
  wrapper.appendChild(timer);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'vote-screen__buttons';

  const approveBtn = document.createElement('button');
  approveBtn.className = 'vote-btn vote-btn--approve';
  approveBtn.textContent = 'Approve';
  approveBtn.addEventListener('click', () => {
    if (viewState.voteCast) return;
    viewState.voteCast = true;
    sendAction({ type: 'vote', vote: 'approve' });
    showVoteConfirmation(wrapper, 'approve');
  });

  const blockBtn = document.createElement('button');
  blockBtn.className = 'vote-btn vote-btn--block';
  blockBtn.textContent = 'Block';
  blockBtn.addEventListener('click', () => {
    if (viewState.voteCast) return;
    viewState.voteCast = true;
    sendAction({ type: 'vote', vote: 'block' });
    showVoteConfirmation(wrapper, 'block');
  });

  btnRow.appendChild(approveBtn);
  btnRow.appendChild(blockBtn);
  wrapper.appendChild(btnRow);

  container.appendChild(wrapper);
}

export function update(state: AppState): void {
  // Update timer display if still mounted
  if (!viewState.mounted) return;
  // Timer managed by server — update countdown from state
}

export function unmount(): void {
  viewState.mounted = false;
  viewState.voteCast = false;
}

function showVoteConfirmation(container: HTMLElement, vote: string): void {
  const confirmation = document.createElement('div');
  confirmation.className = `vote-confirmation vote-confirmation--${vote}`;
  confirmation.textContent = `Vote cast: ${vote.toUpperCase()}`;
  container.appendChild(confirmation);
  // Hide buttons
  const btns = container.querySelector('.vote-screen__buttons');
  if (btns) (btns as HTMLElement).style.display = 'none';
}

function getPlayerName(state: AppState, id: string | null | undefined): string {
  return state.serverState?.players.find((p) => p.id === id)?.name ?? 'Unknown';
}

// Imported from connection module
declare function sendAction(action: Record<string, unknown>): void;
```

**Concrete WebSocket connection manager:**

```typescript
// src/client/connection.ts

import PartySocket from 'partysocket';
import type { ClientMessage, ServerMessage } from '../shared/protocol';

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';
const HEARTBEAT_MS = 15_000;

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

let socket: PartySocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let onMessage: MessageHandler = () => {};
let onStatusChange: StatusHandler = () => {};

export function connect(
  roomCode: string,
  handlers: { onMessage: MessageHandler; onStatusChange: StatusHandler },
): void {
  onMessage = handlers.onMessage;
  onStatusChange = handlers.onStatusChange;

  onStatusChange('connecting');

  socket = new PartySocket({
    host: PARTYKIT_HOST,
    room: roomCode,
  });

  socket.addEventListener('open', () => {
    onStatusChange('connected');
    startHeartbeat();
  });

  socket.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data) as ServerMessage;
      onMessage(msg);
    } catch {
      console.warn('[ws] Unparseable message:', event.data);
    }
  });

  socket.addEventListener('close', () => {
    onStatusChange('reconnecting');
    stopHeartbeat();
    // PartySocket auto-reconnects with exponential backoff
  });

  // iOS Safari: reconnect on tab foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && socket) {
      socket.reconnect();
    }
  });
}

export function send(msg: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

export function sendAction(action: Record<string, unknown>): void {
  send({ type: 'action', payload: action as any });
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    send({ type: 'ping', payload: {} });
  }, HEARTBEAT_MS);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function disconnect(): void {
  stopHeartbeat();
  socket?.close();
  socket = null;
}
```

**Concrete AppState store:**

```typescript
// src/client/state/store.ts

import type { PlayerState, PrivateData, ServerMessage } from '../../shared/protocol';
import { getActiveScreen, type ScreenId } from '../router';

export interface AppState {
  serverState: PlayerState | null;
  privateData: PrivateData | null;
  boardViewActive: boolean;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  audioUnlocked: boolean;
  playerId: string | null;
  sessionToken: string | null;
}

let state: AppState = {
  serverState: null,
  privateData: null,
  boardViewActive: false,
  connectionStatus: 'connecting',
  audioUnlocked: false,
  playerId: null,
  sessionToken: null,
};

let currentScreenId: ScreenId | null = null;
let screenContainer: HTMLElement | null = null;

// View registry — populated by app.ts
const views = new Map<ScreenId, {
  mount: (container: HTMLElement, state: AppState) => void;
  update: (state: AppState) => void;
  unmount: () => void;
}>();

export function registerView(id: ScreenId, view: typeof views extends Map<any, infer V> ? V : never): void {
  views.set(id, view);
}

export function setContainer(el: HTMLElement): void {
  screenContainer = el;
}

export function getState(): AppState {
  return state;
}

export function updateState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  render();
}

function render(): void {
  if (!screenContainer || !state.serverState) return;

  const targetScreen = state.boardViewActive
    ? 'spectator' as ScreenId  // Board View uses spectator view (read-only)
    : getActiveScreen(state.serverState, state.playerId!);

  if (targetScreen !== currentScreenId) {
    // Unmount current
    if (currentScreenId) {
      views.get(currentScreenId)?.unmount();
    }

    // Transition: crossfade
    screenContainer.style.opacity = '0';
    setTimeout(() => {
      // Clear container
      while (screenContainer!.firstChild) {
        screenContainer!.removeChild(screenContainer!.firstChild);
      }

      // Mount new
      currentScreenId = targetScreen;
      views.get(targetScreen)?.mount(screenContainer!, state);
      screenContainer!.style.opacity = '1';
    }, 150); // Half of 300ms crossfade
  } else {
    // Same screen — just update
    views.get(currentScreenId)?.update(state);
  }
}

// ---- Message handler (called from connection.ts) ----

export function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'joined':
      state.playerId = msg.payload.playerId;
      state.sessionToken = msg.payload.sessionToken;
      sessionStorage.setItem('umb-session', msg.payload.sessionToken);
      break;
    case 'state-update':
      updateState({ serverState: msg.payload as PlayerState });
      break;
    case 'private-update':
      updateState({ privateData: msg.payload });
      break;
    case 'error':
      console.warn(`[server error] ${msg.payload.code}: ${msg.payload.message}`);
      break;
    case 'player-timeout':
      // Show brief toast notification
      break;
    case 'room-closed':
      updateState({ connectionStatus: 'disconnected' });
      break;
  }
}
```

### Animations

**Concrete CSS for card flip animation:**

```css
/* src/client/styles/animations.css */

/* ---- Role Card Flip ---- */
.role-reveal-card {
  width: 70vw;
  max-width: 300px;
  aspect-ratio: 3 / 4;
  perspective: 1000px;
  margin: 0 auto;
}

.role-reveal-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 800ms ease-in-out;
}

.role-reveal-card__inner--flipped {
  transform: rotateY(180deg);
}

.role-reveal-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.role-reveal-card__back {
  background: var(--noir-slate);
  display: grid;
  place-items: center;
}

.role-reveal-card__back img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.role-reveal-card__front {
  transform: rotateY(180deg);
}

.role-reveal-card__front img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ---- iOS Shake Fallback (replaces haptic) ---- */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.shake {
  animation: shake 500ms ease-in-out;
}

/* ---- Screen Transition ---- */
.screen-container {
  transition: opacity 300ms ease-out;
}

/* ---- Vote Button Press ---- */
.vote-btn {
  min-width: 120px;
  min-height: 56px; /* 44px + padding = >44px touch target */
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: transform 150ms ease-out, opacity 150ms ease-out;
  -webkit-tap-highlight-color: transparent;
}

.vote-btn:active {
  transform: scale(0.95);
}

.vote-btn--approve {
  background: var(--noir-gold);
  color: var(--noir-black);
}

.vote-btn--block {
  background: var(--noir-blood);
  color: var(--noir-cream);
}

/* ---- Policy Card Select ---- */
.policy-card {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
  cursor: pointer;
}

.policy-card--selected {
  transform: translateY(-12px) scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

.policy-card--dimmed {
  opacity: 0.4;
  pointer-events: none;
}

/* ---- Eliminated Screen ---- */
@keyframes eliminated-fade {
  0% { opacity: 0; background: transparent; }
  100% { opacity: 1; background: rgba(139, 26, 26, 0.3); }
}

.eliminated-screen {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  animation: eliminated-fade 1000ms ease-in forwards;
  z-index: 999;
}

.eliminated-screen__skull {
  width: 50vw;
  max-width: 200px;
}

/* ---- Timer Urgency ---- */
@keyframes timer-pulse {
  0%, 100% { color: var(--noir-cream); }
  50% { color: var(--noir-blood); transform: scale(1.1); }
}

.timer--urgent {
  animation: timer-pulse 1s ease-in-out infinite;
}
```

**Concrete CSS for mobile-safe viewport:**

```css
/* src/client/styles/base.css */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* Noir palette (shared with host view) */
  --noir-black:    #0a0a0c;
  --noir-charcoal: #1a1a1e;
  --noir-slate:    #2a2a30;
  --noir-smoke:    #3a3a42;
  --noir-cream:    #e8e0d0;
  --noir-gold:     #c9a84c;
  --noir-blood:    #a82020;
  --noir-muted:    #8a8478;
}

html, body {
  height: 100%;
  height: 100dvh; /* Dynamic viewport height — avoids iOS address bar */
  overflow: hidden;
  background: var(--noir-black);
  color: var(--noir-cream);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none; /* Prevent pull-to-refresh on both iOS/Android */
  touch-action: manipulation; /* Disable double-tap zoom */
  user-select: none; /* Prevent text selection during gameplay */
}

/* Safe area padding for notched devices */
.screen {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

/* Touch targets: minimum 44x44 per WCAG 2.2 */
button, [role="button"], a {
  min-height: 44px;
  min-width: 44px;
}
```

**Concrete Android back button trap:**

```typescript
// src/client/app.ts (during init)

// Trap Android back button — prevent accidental exit
window.history.pushState({ game: true }, '');
window.addEventListener('popstate', (e) => {
  if (e.state?.game) return; // Already on game state
  // Push state again to prevent navigation
  window.history.pushState({ game: true }, '');
  // Optionally show "Leave game?" confirmation
  // For now, just stay in the game
});
```

**Concrete audio unlock on first gesture:**

```typescript
// src/client/app.ts (during init)
// Audio unlock is handled by AudioEngine.initUnlock() from Phase 5
// We just need to ensure it's called at app startup:

import { audioEngine } from './audio/audio-engine';

// Called once when the app mounts
audioEngine.initUnlock();
audioEngine.initVisibilityResume();
```

**Complete screen routing table:**

| Phase | SubPhase | isMayor | isChief | isAlive | hasVoted | Screen |
|---|---|---|---|---|---|---|
| `lobby` | * | * | * | * | * | `lobby` |
| `role-reveal` | * | * | * | * | * | `role-reveal` |
| `nomination` | `nomination-pending` | Yes | * | Yes | * | `mayor-nomination` |
| `nomination` | `nomination-pending` | No | * | Yes | * | `waiting` |
| `election` | `election-voting` | * | * | Yes | No | `vote` |
| `election` | `election-voting` | * | * | Yes | Yes | `waiting` |
| `policy-session` | `policy-mayor-discard` | Yes | * | Yes | * | `mayor-hand` |
| `policy-session` | `policy-chief-discard` | * | Yes | Yes | * | `chief-hand` |
| `policy-session` | `policy-veto-response` | Yes | * | Yes | * | `veto-response` |
| `policy-session` | * | No | No | Yes | * | `waiting` |
| `executive-power` | `executive-power-pending` | * | Yes | Yes | * | `power-*` (by type) |
| `executive-power` | `executive-power-pending` | * | No | Yes | * | `waiting` |
| `game-over` | * | * | * | * | * | `game-over` |
| * | * | * | * | No | * | `spectator` |

### Animations

| Animation | Duration | Easing | Details |
|---|---|---|---|
| Role card flip | 800ms | ease-in-out | Y-axis rotation, generic card back → role art (Phase 0 asset) |
| Screen transition | 300ms | ease-out | Fade crossfade between screens |
| Vote button press | 150ms | ease-out | Scale down + color confirmation |
| Policy card select | 200ms | ease-out | Selected card lifts, others dim |
| Eliminated screen | 1000ms | ease-in | Fade in skull, full-screen red tint |
| Timer urgency | — | pulse | Last 10s: countdown pulses red |

Card back design: dark noir pattern with "UMB" monogram — generated as Phase 0 asset (brings total to **12 visual assets**).

### iOS Safari Handling

| Issue | Solution |
|---|---|
| No `navigator.vibrate()` | CSS shake animation as haptic fallback (role reveal, elimination) |
| `100vh` includes address bar | Use `100dvh` (dynamic viewport height) everywhere |
| Safe area (notch/Dynamic Island) | `env(safe-area-inset-*)` padding on all edge elements |
| Audio autoplay blocked | Unlock audio context on first user tap (lobby "Ready" or name submit) |
| Background tab kills WebSocket | Reconnect on `visibilitychange` event; full state re-sent on reconnect |
| Pull-to-refresh | `overscroll-behavior: none` on body |

### Android Chrome Handling

| Issue | Solution |
|---|---|
| Pull-to-refresh | `overscroll-behavior: none` on body |
| Back button exits game | `history.pushState()` to trap back button; show "Leave game?" confirm |
| `navigator.vibrate()` | Works natively — use 200ms pulse for role reveal, 500ms for elimination |

### Board View Toggle

- Available on non-action screens only (waiting, spectator, game-over)
- Disabled during: mayor-nomination, mayor-hand, chief-hand, veto-response, vote, all power screens
- Renders same data as host view (public state only)
- Timer continues running if active player has Board View disabled
- Toggle via persistent icon in screen header

### Timer Display

- Active player sees countdown timer on their action screen (nomination, vote, discard, power)
- Timer pulses red in last 10 seconds
- On timeout: screen shows brief "Time's up" message, then transitions to next state
- Non-active players see "Waiting for [Mayor/Chief/votes]..." — no countdown

### Waiting Screen Contextual Messages

| Phase/SubPhase | Message |
|---|---|
| `nomination-pending` | "Round N. The Mayor is choosing a Police Chief." |
| `election-voting` (already voted) | "Waiting for all votes..." |
| `policy-mayor-discard` | "The Mayor is reviewing the policies..." |
| `policy-chief-discard` | "The Police Chief is making a decision..." |
| `policy-veto-propose` | "A veto has been proposed. Awaiting the Mayor's decision..." |
| `executive-power-pending` | "The Police Chief is using their power..." |
| `auto-enact` | "The deadlock forces action. A policy is enacted." |

### Phase 0 Asset Addition

SpecFlow identified a missing asset — the eliminated/skull screen and the card back need art:

| # | ID | Description | Dimensions | Transparency |
|---|---|---|---|---|
| 12 | `card-back` | Dark noir pattern with "UMB" monogram | 768x1024 | Yes |
| 13 | `eliminated-skull` | Skull and crossbones, noir style, dramatic | 512x512 | Yes |

**This updates Phase 0 total from 11 to 13 visual assets.**

## Technical Considerations

- **No framework** — vanilla TypeScript + CSS per SPEC ADR. DOM manipulation via `document.createElement()` and `innerHTML` for templates. Keep it simple.
- **State-driven rendering** — screens are pure functions of state. No screen holds local mutable state beyond animation timers.
- **Private data security** — the client never has access to other players' roles or cards. All enforcement is server-side (Phase 2). The client simply renders what it receives.
- **Touch targets** — minimum 44x44 CSS pixels per WCAG 2.2 for all interactive elements.
- **Portrait lock** — request portrait orientation via manifest and `screen.orientation.lock('portrait')` where supported.

## Acceptance Criteria

### Screens
- [ ] All 15 screens implemented and rendering correctly
- [ ] Screen router deterministically maps state → screen
- [ ] Waiting screen shows contextual messages per phase/subPhase
- [ ] Board View toggle works as overlay from non-action screens
- [ ] Board View disabled during action screens (mayor-hand, vote, etc.)

### Role Reveal
- [ ] Card flip animation plays (800ms, Y-axis rotation)
- [ ] Haptic feedback on Android via `navigator.vibrate()`
- [ ] CSS shake animation on iOS as fallback
- [ ] Correct ally info shown per role and player count
- [ ] Mob Boss at 7–10 players sees NO ally names

### Voting
- [ ] Approve/Block buttons with clear touch targets (44x44+)
- [ ] Vote confirmed state shown after tap
- [ ] Timer countdown visible to voter
- [ ] Vote result summary shown after reveal (Passed/Blocked + count)

### Policy Session
- [ ] Mayor Hand: 3 cards shown, tap to discard 1
- [ ] Chief Hand: 2 cards shown, tap to enact 1
- [ ] Veto button appears only after 5+ bad policies
- [ ] Veto Response screen for Mayor with Accept/Reject

### Executive Powers
- [ ] All 3 power screens show eligible player list
- [ ] Investigation result shown privately to Chief only
- [ ] Investigation notification shown to target
- [ ] Eliminated screen: full-screen skull, haptic, auto-dismiss 5s

### Mobile Compatibility
- [ ] Works on iOS Safari 16+ (iPhone)
- [ ] Works on Android Chrome 100+
- [ ] `100dvh` viewport handling
- [ ] Safe area insets for notched devices
- [ ] Pull-to-refresh disabled (`overscroll-behavior: none`)
- [ ] Audio unlock on first user gesture
- [ ] WebSocket reconnect on `visibilitychange`
- [ ] Android back button trapped with confirmation

### State Management
- [ ] Single AppState container drives all rendering
- [ ] `state-update` and `private-update` handled correctly
- [ ] Reconnection restores correct screen for current phase
- [ ] No private data leakage in client code (only renders what server sends)

## Success Metrics

- All 15 screens render correctly on iPhone SE (smallest target) and Pixel 7
- Screen transitions feel smooth (< 300ms)
- Role reveal is a dramatic, satisfying moment on both iOS and Android
- A player can disconnect, reconnect, and continue from the correct screen
- Zero client-side state bugs across a full 5-player game

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vanilla DOM management gets complex with 15 screens | Medium | Medium | Keep views as pure functions; strict screen router |
| iOS Safari audio autoplay breaks narrator | High | Medium | Unlock audio on first tap; test on real device |
| iOS Safari viewport quirks | Medium | Medium | Use `100dvh`, test safe-area-inset on notched devices |
| Card flip animation performance on low-end phones | Low | Low | Use CSS transforms (GPU-accelerated), not JS animation |
| State/private-update ordering edge case | Low | High | 16ms buffer; test with simulated latency |

## Sources & References

- SPEC.md player view screens: `docs/spec/SPEC.md:179-196`
- SPEC.md ADR-06 mobile-first: `docs/spec/SPEC.md:105-107`
- SPEC.md ADR-07 haptic: `docs/spec/SPEC.md:109-111`
- Phase 1 SubPhase types: `docs/plans/2026-03-16-002-feat-phase-1-game-engine-plan.md`
- Phase 2 protocol + projection: `docs/plans/2026-03-16-003-feat-phase-2-multiplayer-plan.md`
- Phase 4 noir color palette: `docs/plans/2026-03-16-005-feat-phase-4-host-table-view-plan.md`
- Phase 5 audio engine: `docs/plans/2026-03-16-006-feat-phase-5-audio-polish-plan.md`
- [PartySocket API](https://docs.partykit.io/reference/partysocket-api/) — auto-reconnect client
- [MDN: navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) — haptic feedback
- [MDN: CSS dvh unit](https://developer.mozilla.org/en-US/docs/Web/CSS/length#dvh) — dynamic viewport height
- [MDN: env() safe-area-inset](https://developer.mozilla.org/en-US/docs/Web/CSS/env) — notch handling
- [MDN: overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) — pull-to-refresh prevention
- [MDN: backface-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility) — card flip
- [MDN: History.pushState()](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState) — back button trap
