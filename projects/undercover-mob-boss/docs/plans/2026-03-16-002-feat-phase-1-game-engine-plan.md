---
title: "Phase 1: Game Engine — State Machine, Rules, Win Conditions"
type: feat
status: active
date: 2026-03-16
phase: 1
---

# Phase 1: Game Engine

## Overview

Build the pure game rules engine with zero UI or networking dependencies. The engine is a state machine that takes a `GameState` + `GameAction` and returns the next `GameState`. All game logic lives in `src/server/game/` across 4 files: `roles.ts`, `policies.ts`, `phases.ts`, `powers.ts`. Tested with Vitest at 80%+ coverage.

## Problem Statement / Motivation

Every subsequent phase depends on correct game logic. The multiplayer layer (Phase 2) wraps this engine; the views (Phase 3/4) render its state; audio (Phase 5) reacts to its events. Getting the rules wrong here cascades everywhere. By building and testing the engine in isolation first, we can verify correctness before adding complexity.

## Proposed Solution

### Architecture: Pure Reducer Pattern

```typescript
function dispatch(state: GameState, action: GameAction): GameState
```

Every state change flows through `dispatch()`. This is maximally testable — set up state, dispatch action, assert new state. PartyKit (Phase 2) will call `dispatch()` on the server when it receives player actions.

**Concrete `dispatch()` structure with validation-first pattern:**

```typescript
// src/server/game/phases.ts

/** Exhaustive helper — TypeScript will error if a case is unhandled. */
function assertNever(x: never): never {
  throw new Error(`Unhandled action type: ${(x as GameAction).type}`);
}

export function dispatch(state: GameState, action: GameAction): GameState {
  // 1. Clear events from previous dispatch (caller already consumed them)
  const base = { ...state, events: [] as GameEvent[] };

  // 2. Validate action is legal for current phase/subPhase
  const error = validateAction(base, action);
  if (error) {
    throw new InvalidActionError(error, base.phase, base.subPhase, action.type);
  }

  // 3. Route to handler by action type (discriminated union switch)
  switch (action.type) {
    case 'start-game':
      return handleStartGame(base);
    case 'acknowledge-role':
      return handleAcknowledgeRole(base, action);
    case 'nominate':
      return handleNominate(base, action);
    case 'vote':
      return handleVote(base, action);
    case 'mayor-discard':
      return handleMayorDiscard(base, action);
    case 'chief-discard':
      return handleChiefDiscard(base, action);
    case 'propose-veto':
      return handleProposeVeto(base);
    case 'veto-response':
      return handleVetoResponse(base, action);
    case 'investigate':
      return handleInvestigate(base, action);
    case 'special-nominate':
      return handleSpecialNominate(base, action);
    case 'execute':
      return handleExecute(base, action);
    default:
      return assertNever(action);
  }
}

/** Returns an error message if the action is invalid, or null if valid. */
function validateAction(state: GameState, action: GameAction): string | null {
  const { phase, subPhase } = state;

  // Check against the validation rules table (see below)
  const rule = VALIDATION_RULES[action.type];
  if (!rule) return `Unknown action type: ${action.type}`;

  if (!rule.validPhases.includes(phase)) {
    return `Action '${action.type}' not valid in phase '${phase}'`;
  }

  if (rule.validSubPhases && subPhase && !rule.validSubPhases.includes(subPhase)) {
    return `Action '${action.type}' not valid in subPhase '${subPhase}'`;
  }

  // Action-specific validation (target alive, player exists, etc.)
  return rule.validate?.(state, action) ?? null;
}

export class InvalidActionError extends Error {
  constructor(
    message: string,
    public readonly phase: Phase,
    public readonly subPhase: SubPhase | null,
    public readonly actionType: string,
  ) {
    super(`[${phase}/${subPhase ?? 'none'}] ${message}`);
    this.name = 'InvalidActionError';
  }
}
```

### GameAction Union

```typescript
type GameAction =
  | { type: 'start-game' }
  | { type: 'acknowledge-role'; playerId: string }
  | { type: 'nominate'; targetId: string }
  | { type: 'vote'; playerId: string; vote: 'approve' | 'block' }
  | { type: 'mayor-discard'; cardIndex: number }
  | { type: 'chief-discard'; cardIndex: number }
  | { type: 'propose-veto' }
  | { type: 'veto-response'; approved: boolean }
  | { type: 'investigate'; targetId: string }
  | { type: 'special-nominate'; targetId: string }
  | { type: 'execute'; targetId: string }
```

### Complete Validation Rules Table

Every action type maps to exactly which phase/subPhase combinations allow it, plus any action-specific checks:

| Action Type | Valid Phase | Valid SubPhase(s) | Additional Validation |
|---|---|---|---|
| `start-game` | `lobby` | `null` | Player count 5-10 |
| `acknowledge-role` | `role-reveal` | `role-reveal-waiting` | Player exists, not already acknowledged |
| `nominate` | `nomination` | `nomination-pending` | Target alive, not self, not term-limited, target exists |
| `vote` | `election` | `election-voting` | Player alive, not already voted |
| `mayor-discard` | `policy-session` | `policy-mayor-discard` | `cardIndex` in range 0-2 |
| `chief-discard` | `policy-session` | `policy-chief-discard` | `cardIndex` in range 0-1 |
| `propose-veto` | `policy-session` | `policy-chief-discard` | `badPoliciesEnacted >= 5` |
| `veto-response` | `policy-session` | `policy-veto-response` | (none — boolean is always valid) |
| `investigate` | `executive-power` | `executive-power-pending` | Target alive, not self, not previously investigated |
| `special-nominate` | `executive-power` | `executive-power-pending` | Target alive, not current mayor, not current chief |
| `execute` | `executive-power` | `executive-power-pending` | Target alive (self-execution permitted) |

### Complete Phase Transition Diagram

State machine table — every row is one valid transition:

| From Phase | From SubPhase | Trigger | To Phase | To SubPhase | Side Effects |
|---|---|---|---|---|---|
| `lobby` | `null` | `start-game` | `role-reveal` | `role-reveal-waiting` | Distribute roles, create deck, set reshuffle threshold |
| `role-reveal` | `role-reveal-waiting` | Last `acknowledge-role` | `nomination` | `nomination-pending` | — |
| `nomination` | `nomination-pending` | `nominate` | `election` | `election-voting` | Set `nominatedChiefId`, clear votes |
| `election` | `election-voting` | Last `vote` (approved) | `policy-session` | `policy-mayor-discard` | Check mob boss election win first; reset tracker; draw 3 cards |
| `election` | `election-voting` | Last `vote` (blocked, tracker < 2) | `nomination` | `nomination-pending` | Increment tracker, advance mayor |
| `election` | `election-voting` | Last `vote` (blocked, tracker = 2) | `nomination` | `auto-enact` | Tracker hits 3 — auto-enact top card, clear term limits, reset tracker, advance mayor |
| `nomination` | `auto-enact` | (automatic) | `nomination` | `nomination-pending` | Check policy win conditions |
| `policy-session` | `policy-mayor-discard` | `mayor-discard` | `policy-session` | `policy-chief-discard` | Remove card from hand, pass 2 to chief |
| `policy-session` | `policy-chief-discard` | `chief-discard` | (varies) | (varies) | Enact policy; check win; check executive power |
| `policy-session` | `policy-chief-discard` | `propose-veto` | `policy-session` | `policy-veto-response` | Only if `badPoliciesEnacted >= 5` |
| `policy-session` | `policy-veto-response` | `veto-response` (accepted) | `nomination` | `nomination-pending` or `auto-enact` | Discard both cards, advance tracker; auto-enact if tracker = 3 |
| `policy-session` | `policy-veto-response` | `veto-response` (rejected) | `policy-session` | `policy-chief-discard` | Chief must now enact one card |
| `policy-session` | `policy-enact` | (automatic) | `executive-power` | `executive-power-pending` | Only if bad policy + power exists for player count |
| `policy-session` | `policy-enact` | (automatic) | `nomination` | `nomination-pending` | No power — advance mayor, next round |
| `executive-power` | `executive-power-pending` | `investigate` | `nomination` | `nomination-pending` | Record investigation result |
| `executive-power` | `executive-power-pending` | `special-nominate` | `nomination` | `nomination-pending` | Override next mayor, shift rotation |
| `executive-power` | `executive-power-pending` | `execute` | `nomination` or `game-over` | `nomination-pending` or `null` | Mark dead; if mob boss, citizens win |
| (any) | (any) | Policy win condition | `game-over` | `null` | Set winner + reason |
| (any) | (any) | Mob boss election win | `game-over` | `null` | Set winner + reason |

### Expanded GameState

The SPEC.md `GameState` needs these additional fields:

```typescript
interface GameState {
  // ... existing fields from spec ...

  // Sub-phase tracking
  subPhase: SubPhase | null;

  // Deck reshuffle (server-only, never sent to clients)
  reshuffleThreshold: number; // 3-7, random

  // Veto state (only active during policy-session when badPoliciesEnacted >= 5)
  vetoProposed: boolean;

  // Event log for UI/narrator triggers
  events: GameEvent[];

  // Investigation history (for UI display)
  investigationHistory: Array<{ investigatorId: string; targetId: string; result: 'citizen' | 'mob' }>;

  // Track special nomination override
  specialNominatedMayorId: string | null;

  // Injectable RNG seed for deterministic testing
  rngSeed?: number;
}

type SubPhase =
  | 'role-reveal-waiting'      // Waiting for all players to acknowledge role
  | 'nomination-pending'       // Mayor must nominate
  | 'election-voting'          // Votes being collected
  | 'election-result'          // Votes revealed, processing result
  | 'policy-mayor-discard'     // Mayor has 3 cards, must discard 1
  | 'policy-chief-discard'     // Chief has 2 cards, must discard 1
  | 'policy-veto-propose'      // Chief may propose veto (if unlocked)
  | 'policy-veto-response'     // Mayor must accept/reject veto
  | 'policy-enact'             // Policy being enacted
  | 'executive-power-pending'  // Chief must use executive power
  | 'auto-enact'               // Election tracker hit 3, auto-enacting

type GameEvent =
  | { type: 'deck-reshuffled' }
  | { type: 'policy-enacted'; policy: PolicyType; autoEnacted: boolean }
  | { type: 'election-passed'; mayorId: string; chiefId: string }
  | { type: 'election-failed'; electionTracker: number }
  | { type: 'auto-enact-triggered' }
  | { type: 'executive-power-activated'; power: ExecutivePower }
  | { type: 'investigation-result'; targetId: string; result: 'citizen' | 'mob' }
  | { type: 'player-executed'; playerId: string; wasMobBoss: boolean }
  | { type: 'special-mayor-chosen'; playerId: string }
  | { type: 'veto-enacted' }
  | { type: 'veto-rejected' }
  | { type: 'game-over'; winner: 'citizens' | 'mob'; reason: string }
  | { type: 'term-limits-cleared' }
```

### File Breakdown

Build in dependency order:

#### 1. `src/server/game/roles.ts`
No dependencies. Pure logic.

- `distributeRoles(playerCount: number, rng?)` — returns role array per distribution table
- `populateKnownAllies(players: Player[])` — sets `knownAllies` per player count rules:
  - 5–6 players: mob soldiers know each other + mob boss; mob boss knows all soldiers
  - 7–10 players: mob soldiers know each other + mob boss; mob boss does NOT know soldiers
- `getMembership(role: Role): 'citizen' | 'mob'` — investigation helper (both mob-soldier and mob-boss → 'mob')
- Role distribution table (from SPEC.md):

| Players | Citizens | Mob Soldiers | Mob Boss |
|---|---|---|---|
| 5 | 3 | 1 | 1 |
| 6 | 4 | 1 | 1 |
| 7 | 4 | 2 | 1 |
| 8 | 5 | 2 | 1 |
| 9 | 5 | 3 | 1 |
| 10 | 6 | 3 | 1 |

**Concrete `distributeRoles()` implementation:**

```typescript
// src/server/game/roles.ts

import type { Role } from '../../shared/types';
import { shuffle } from './policies';

/**
 * Distribution table — index by (playerCount - 5).
 * Each entry: [citizens, mobSoldiers, mobBoss] (mob boss always 1).
 */
const ROLE_DISTRIBUTION: Record<number, { citizens: number; soldiers: number }> = {
  5:  { citizens: 3, soldiers: 1 },
  6:  { citizens: 4, soldiers: 1 },
  7:  { citizens: 4, soldiers: 2 },
  8:  { citizens: 5, soldiers: 2 },
  9:  { citizens: 5, soldiers: 3 },
  10: { citizens: 6, soldiers: 3 },
};

/**
 * Returns a shuffled array of roles for the given player count.
 * Always exactly 1 mob-boss. Remaining split per distribution table.
 */
export function distributeRoles(
  playerCount: number,
  rng: () => number = Math.random,
): Role[] {
  const dist = ROLE_DISTRIBUTION[playerCount];
  if (!dist) {
    throw new Error(`Invalid player count: ${playerCount}. Must be 5-10.`);
  }

  const roles: Role[] = [
    ...Array<Role>(dist.citizens).fill('citizen'),
    ...Array<Role>(dist.soldiers).fill('mob-soldier'),
    'mob-boss',
  ];

  return shuffle(roles, rng);
}

/**
 * Returns party membership for investigation purposes.
 * Both mob-soldier and mob-boss return 'mob'.
 */
export function getMembership(role: Role): 'citizen' | 'mob' {
  return role === 'citizen' ? 'citizen' : 'mob';
}
```

#### 2. `src/server/game/policies.ts`
No dependencies. Deck management.

- `createDeck(rng?)` — 6 good + 11 bad, shuffled
- `drawCards(deck, count)` — draw N cards from top
- `checkReshuffle(state)` — if `deck.length < reshuffleThreshold`, reshuffle discard into deck, pick new threshold 3–7
- `pickReshuffleThreshold(rng?)` — random integer 3–7
- `shuffle(array, rng?)` — Fisher-Yates shuffle with injectable RNG

Key rules:
- Enacted policies leave the game permanently (do NOT go to discard)
- Discarded policies go to the discard pile
- Reshuffle check happens before ANY draw (policy session or auto-enact)
- After reshuffle, deck always has >= 3 cards (invariant assertion)

**Concrete Fisher-Yates shuffle with injectable RNG:**

```typescript
// src/server/game/policies.ts

import type { PolicyType, GameState, GameEvent } from '../../shared/types';

/**
 * Fisher-Yates (Durstenfeld) shuffle — O(n), in-place on a copy.
 * Accepts injectable RNG for deterministic testing.
 * Returns a new array — never mutates the input.
 */
export function shuffle<T>(array: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Random integer in range [min, max] inclusive.
 */
function randomInt(min: number, max: number, rng: () => number = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Pick a random reshuffle threshold between 3 and 7 inclusive.
 */
export function pickReshuffleThreshold(rng: () => number = Math.random): number {
  return randomInt(3, 7, rng);
}

/**
 * Create the initial policy deck: 6 good + 11 bad, shuffled.
 */
export function createDeck(rng: () => number = Math.random): PolicyType[] {
  const deck: PolicyType[] = [
    ...Array<PolicyType>(6).fill('good'),
    ...Array<PolicyType>(11).fill('bad'),
  ];
  return shuffle(deck, rng);
}

/**
 * Draw N cards from the top of the deck.
 * Returns [drawnCards, remainingDeck] — never mutates input.
 */
export function drawCards(
  deck: readonly PolicyType[],
  count: number,
): [PolicyType[], PolicyType[]] {
  if (deck.length < count) {
    throw new Error(`Cannot draw ${count} cards from deck of ${deck.length}`);
  }
  return [deck.slice(0, count), deck.slice(count)];
}

/**
 * Check if deck needs reshuffling before a draw.
 * If deck.length < reshuffleThreshold, combine discard into deck,
 * shuffle, and pick a new threshold.
 *
 * Returns a new state — never mutates input.
 * Pushes a 'deck-reshuffled' event if reshuffle occurred.
 */
export function checkReshuffle(
  state: GameState,
  rng: () => number = Math.random,
): GameState {
  if (state.policyDeck.length >= state.reshuffleThreshold) {
    return state; // No reshuffle needed
  }

  const combined = [...state.policyDeck, ...state.policyDiscard];
  const newDeck = shuffle(combined, rng);
  const newThreshold = pickReshuffleThreshold(rng);

  // Invariant: after reshuffle, deck must have >= 3 cards
  // (17 total minus enacted policies, which leave the game permanently)
  if (newDeck.length < 3) {
    throw new Error(
      `Post-reshuffle deck has ${newDeck.length} cards — invariant violated. ` +
      `This should be impossible with standard policy counts.`,
    );
  }

  return {
    ...state,
    policyDeck: newDeck,
    policyDiscard: [],
    reshuffleThreshold: newThreshold,
    events: [...state.events, { type: 'deck-reshuffled' }],
  };
}
```

**Concrete `checkReshuffle()` with the random threshold** is shown above — the key insight is that the threshold is randomly chosen (3-7) at deck creation AND after each reshuffle, so players cannot predict exactly when the next reshuffle will occur. The narrator announces reshuffles, but the threshold itself is server-only state never sent to clients.

#### 3. `src/server/game/powers.ts`
Depends on roles.ts types.

- `getExecutivePower(playerCount, badPoliciesEnacted): ExecutivePower | null` — board layout lookup
- `resolveInvestigation(targetPlayer): 'citizen' | 'mob'` — uses `getMembership()`
- `resolveExecution(state, targetId): GameState` — marks player dead, checks mob boss win
- `resolveSpecialNomination(state, targetId): GameState` — sets next mayor, shifts rotation

Executive power board (from SPEC.md):

| Bad Policies | 5–6 Players | 7–8 Players | 9–10 Players |
|---|---|---|---|
| 1 | — | — | Investigate |
| 2 | — | Investigate | Investigate |
| 3 | Investigate | Special Nomination | Special Nomination |
| 4 | Special Nomination | Execution | Execution |
| 5 | Execution | Execution | Execution |

Key rules:
- Executive powers do NOT trigger on auto-enacted policies (SH rule)
- Investigation reveals party membership ('citizen' or 'mob'), not exact role
- Self-execution is permitted (follows SH)
- Only alive players are valid targets for all powers

**Concrete `getExecutivePower()` lookup table:**

```typescript
// src/server/game/powers.ts

import type { ExecutivePower, Player, GameState } from '../../shared/types';
import { getMembership } from './roles';

/**
 * Player-count bracket for executive power lookup.
 */
type PlayerBracket = 'small' | 'medium' | 'large';

function getPlayerBracket(playerCount: number): PlayerBracket {
  if (playerCount <= 6) return 'small';
  if (playerCount <= 8) return 'medium';
  return 'large';
}

/**
 * Executive power board — keyed by [bracket][badPoliciesEnacted].
 * null = no power at that slot.
 */
const EXECUTIVE_POWER_BOARD: Record<PlayerBracket, Record<number, ExecutivePower | null>> = {
  small: {
    1: null,
    2: null,
    3: 'investigate',
    4: 'special-nomination',
    5: 'execution',
  },
  medium: {
    1: null,
    2: 'investigate',
    3: 'special-nomination',
    4: 'execution',
    5: 'execution',
  },
  large: {
    1: 'investigate',
    2: 'investigate',
    3: 'special-nomination',
    4: 'execution',
    5: 'execution',
  },
};

/**
 * Returns the executive power unlocked at this bad policy count
 * for the given player count, or null if no power.
 */
export function getExecutivePower(
  playerCount: number,
  badPoliciesEnacted: number,
): ExecutivePower | null {
  const bracket = getPlayerBracket(playerCount);
  return EXECUTIVE_POWER_BOARD[bracket][badPoliciesEnacted] ?? null;
}

/**
 * Resolve an investigation — returns party membership, not exact role.
 */
export function resolveInvestigation(targetPlayer: Player): 'citizen' | 'mob' {
  return getMembership(targetPlayer.role);
}
```

#### 4. `src/server/game/phases.ts`
Depends on all three above. Orchestrates the state machine.

- `createGame(playerNames, rng?)` — initialize full GameState
- `dispatch(state, action)` — main reducer, validates action against current phase/subPhase
- Phase transition logic:
  - `lobby` → `role-reveal` (on start-game)
  - `role-reveal` → `nomination` (all players acknowledged)
  - `nomination` → `election` (mayor nominates)
  - `election` → `policy-session` (approved) OR `nomination` (blocked, tracker < 3) OR auto-enact flow (tracker = 3)
  - `policy-session` → `executive-power` (bad policy with power) OR `nomination` (no power)
  - `executive-power` → `nomination` (power resolved)
  - Any → `game-over` (win condition met)

**Concrete `getEligibleNominees()` with term limit logic:**

```typescript
// src/server/game/phases.ts (nomination helpers)

/**
 * Returns list of player IDs eligible to be nominated as chief.
 * Enforces term limits with deadlock fallback.
 */
export function getEligibleNominees(state: GameState): string[] {
  const mayor = state.players[state.mayorIndex];
  const alivePlayers = state.players.filter((p) => p.isAlive);
  const playerCount = state.players.filter((p) => p.isAlive).length;

  // Base eligibility: alive and not the current mayor
  let candidates = alivePlayers.filter((p) => p.id !== mayor.id);

  // Apply term limits
  const withTermLimits = candidates.filter((p) => {
    // Previous chief is ALWAYS term-limited (all player counts)
    if (p.wasLastChief) return false;

    // Previous mayor is term-limited only at 6+ alive players
    // At 5 players, only the chief is term-limited — otherwise
    // too few candidates remain
    if (p.wasLastMayor && playerCount > 5) return false;

    return true;
  });

  // Deadlock fallback: if term limits eliminate ALL candidates,
  // waive term limits entirely for this round
  if (withTermLimits.length === 0) {
    return candidates.map((p) => p.id);
  }

  return withTermLimits.map((p) => p.id);
}

/**
 * Advance mayor to the next alive player in clockwise order.
 * If specialNominatedMayorId is set, jump to that player instead
 * and clear the override (rotation continues from there permanently).
 */
export function advanceMayor(state: GameState): GameState {
  if (state.specialNominatedMayorId) {
    const specialIndex = state.players.findIndex(
      (p) => p.id === state.specialNominatedMayorId,
    );
    return {
      ...state,
      mayorIndex: specialIndex,
      specialNominatedMayorId: null,
      players: state.players.map((p, i) => ({
        ...p,
        isMayor: i === specialIndex,
        isChief: false,
        wasLastMayor: p.isMayor,
        wasLastChief: p.isChief,
      })),
    };
  }

  // Normal rotation: next alive player after current mayor
  let nextIndex = (state.mayorIndex + 1) % state.players.length;
  while (!state.players[nextIndex].isAlive) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  return {
    ...state,
    mayorIndex: nextIndex,
    players: state.players.map((p, i) => ({
      ...p,
      isMayor: i === nextIndex,
      isChief: false,
      wasLastMayor: p.isMayor,
      wasLastChief: p.isChief,
    })),
  };
}
```

Key rules — nomination eligibility:
- Must be alive
- Cannot be current mayor (no self-nomination)
- Cannot be previous chief (always term-limited)
- Cannot be previous mayor (6+ players only)
- If term limits leave no valid candidates, waive term limits for that round

Key rules — elections:
- Strict majority required: `approveCount > blockCount` (ties = blocked)
- Only alive players vote
- Election tracker resets to 0 on successful election
- Mob Boss election win check: only if `badPoliciesEnacted >= 3` AND nominee is mob-boss

Key rules — auto-enact:
- Triggers when election tracker reaches 3
- Draw top card from deck (reshuffle check first)
- Enact without policy session
- Reset election tracker to 0
- Clear ALL term limits (`wasLastMayor` and `wasLastChief` → false for all)
- Executive powers do NOT trigger
- Check win conditions (5 good or 6 bad)

Key rules — veto:
- Available only when `badPoliciesEnacted >= 5`
- Chief proposes → Mayor accepts or rejects
- If accepted: both cards discarded, election tracker advances, check for auto-enact at 3
- If rejected: chief must enact one of the two cards
- Veto is optional — chief can choose not to propose

Key rules — mayor rotation:
- Advances to next alive player by index order (clockwise)
- Skips dead players
- After special nomination, rotation continues from the specially nominated player permanently

#### 5. `src/shared/types.ts`
Shared type definitions used by both server and client.

- All types from SPEC.md (`Role`, `PolicyType`, `Phase`, `GameState`, `Player`, `ExecutivePower`)
- Extended types (`SubPhase`, `GameEvent`, `GameAction`)
- Server-only fields marked with comments (e.g., `reshuffleThreshold` never sent to clients)

### Injectable RNG

Every function involving randomness accepts an optional `rng: () => number` parameter defaulting to `Math.random`. This enables:
- Deterministic tests with seeded RNG
- Reproducible game states for debugging
- Snapshot testing of complex flows

**Concrete seeded PRNG implementation (mulberry32):**

```typescript
// src/server/game/rng.ts (also usable from tests)

/**
 * Mulberry32 — a fast, high-quality 32-bit seeded PRNG.
 *
 * Returns a closure that produces numbers in [0, 1) — same interface
 * as Math.random, so it can be passed anywhere an `rng` parameter
 * is accepted.
 *
 * Given the same seed, the sequence is fully deterministic.
 *
 * Usage:
 *   const rng = mulberry32(42);
 *   rng(); // 0.6011037519201636
 *   rng(); // 0.4433193784113973
 *   // Same seed → same sequence every time.
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0; // Coerce to 32-bit integer

  return function next(): number {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Properties of mulberry32 that make it ideal for this use case:
- **Tiny** — 8 lines, zero dependencies, no npm package needed
- **Deterministic** — same seed always produces the same sequence
- **Compatible** — returns `() => number` in [0, 1), drop-in replacement for `Math.random`
- **Fast** — pure integer math, no floating-point accumulation errors
- **Sufficient period** — 2^32 before repeating, far more than any single game needs

### Win Conditions (complete list)

| # | Condition | Winner | Check Timing |
|---|---|---|---|
| 1 | 5 good policies enacted | Citizens | After any policy enactment (normal or auto-enact) |
| 2 | Mob Boss executed | Citizens | After execution power resolves |
| 3 | 6 bad policies enacted | Mob | After any policy enactment (normal or auto-enact) |
| 4 | Mob Boss elected Chief after 3+ bad policies | Mob | After successful election, before policy session |

NOT a win condition: blocking Mob Boss election (just prevents loss, game continues).

## Technical Considerations

- **Pure functions** — all game logic is pure (no side effects, no I/O). Given the same state + action, always returns the same result.
- **Immutable state updates** — `dispatch()` returns a new state object, never mutates the input. Use spread operators.
- **Validation first** — every `dispatch()` call validates the action is legal for the current phase/subPhase before applying it. Invalid actions throw descriptive errors.
- **Events array** — cleared at the start of each `dispatch()` call, populated during processing. The caller (PartyKit in Phase 2) reads events to trigger narrator lines, animations, etc.
- **No setTimeout/setInterval** — the engine is synchronous. Timers are a Phase 2/3 concern.
- **Exhaustive switch** — use `assertNever` in the default case of every discriminated union switch. TypeScript will error at compile time if a new action type is added but not handled.
- **Readonly inputs** — mark function parameters as `readonly` where possible (e.g., `shuffle(array: readonly T[])`) to catch accidental mutation at compile time.

## Testing Strategy

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/server/game/**/*.ts'],
      exclude: ['src/shared/types.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
```

### Test Factory Helper

```typescript
// tests/helpers/game-state-factory.ts

import type { GameState, Player, PolicyType, Phase, SubPhase } from '../../src/shared/types';
import { mulberry32 } from '../../src/server/game/rng';

const DEFAULT_SEED = 42;

/**
 * Creates a fully valid GameState for testing.
 * Override any fields via the `overrides` parameter.
 * Uses deterministic RNG by default so every test is reproducible.
 *
 * Usage:
 *   // Minimal — 5-player game in nomination phase
 *   const state = createTestGameState();
 *
 *   // Override specific fields
 *   const state = createTestGameState({
 *     phase: 'election',
 *     subPhase: 'election-voting',
 *     badPoliciesEnacted: 3,
 *   });
 *
 *   // Custom player count
 *   const state = createTestGameState({ playerCount: 8 });
 */
export function createTestGameState(
  overrides: Partial<GameState> & { playerCount?: number } = {},
): GameState {
  const { playerCount = 5, ...stateOverrides } = overrides;
  const rng = mulberry32(DEFAULT_SEED);

  const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    role: i === 0 ? 'mob-boss' : i < Math.floor(playerCount / 2) ? 'mob-soldier' : 'citizen',
    isAlive: true,
    isMayor: i === 0,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
  }));

  const baseDeck: PolicyType[] = [
    ...Array<PolicyType>(6).fill('good'),
    ...Array<PolicyType>(11).fill('bad'),
  ];

  const baseState: GameState = {
    phase: 'nomination' as Phase,
    subPhase: 'nomination-pending' as SubPhase,
    round: 1,
    players,
    mayorIndex: 0,
    nominatedChiefId: null,
    electionTracker: 0,
    goodPoliciesEnacted: 0,
    badPoliciesEnacted: 0,
    policyDeck: baseDeck,
    policyDiscard: [],
    votes: {},
    mayorCards: null,
    chiefCards: null,
    executivePower: null,
    winner: null,
    winReason: null,
    reshuffleThreshold: 5,
    vetoProposed: false,
    events: [],
    investigationHistory: [],
    specialNominatedMayorId: null,
    rngSeed: DEFAULT_SEED,
  };

  return { ...baseState, ...stateOverrides };
}

/**
 * Create a specific player for targeted test scenarios.
 */
export function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player',
    name: 'Test Player',
    role: 'citizen',
    isAlive: true,
    isMayor: false,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
    ...overrides,
  };
}
```

### Example Vitest Test Cases

**Parameterized tests for role distribution (all player counts):**

```typescript
// tests/unit/roles.test.ts

import { describe, it, expect } from 'vitest';
import { distributeRoles, getMembership } from '../../src/server/game/roles';
import { mulberry32 } from '../../src/server/game/rng';

describe('distributeRoles', () => {
  // Parameterized: verify correct counts for every valid player count
  it.each([
    { playerCount: 5,  expectedCitizens: 3, expectedSoldiers: 1 },
    { playerCount: 6,  expectedCitizens: 4, expectedSoldiers: 1 },
    { playerCount: 7,  expectedCitizens: 4, expectedSoldiers: 2 },
    { playerCount: 8,  expectedCitizens: 5, expectedSoldiers: 2 },
    { playerCount: 9,  expectedCitizens: 5, expectedSoldiers: 3 },
    { playerCount: 10, expectedCitizens: 6, expectedSoldiers: 3 },
  ])(
    '$playerCount players → $expectedCitizens citizens, $expectedSoldiers soldiers, 1 boss',
    ({ playerCount, expectedCitizens, expectedSoldiers }) => {
      const rng = mulberry32(123);
      const roles = distributeRoles(playerCount, rng);

      expect(roles).toHaveLength(playerCount);
      expect(roles.filter((r) => r === 'citizen')).toHaveLength(expectedCitizens);
      expect(roles.filter((r) => r === 'mob-soldier')).toHaveLength(expectedSoldiers);
      expect(roles.filter((r) => r === 'mob-boss')).toHaveLength(1);
    },
  );

  it('throws for invalid player count', () => {
    expect(() => distributeRoles(4)).toThrow('Invalid player count');
    expect(() => distributeRoles(11)).toThrow('Invalid player count');
  });

  it('produces deterministic output with seeded RNG', () => {
    const run1 = distributeRoles(7, mulberry32(999));
    const run2 = distributeRoles(7, mulberry32(999));
    expect(run1).toEqual(run2);
  });
});

describe('getMembership', () => {
  it.each([
    { role: 'citizen' as const,     expected: 'citizen' },
    { role: 'mob-soldier' as const, expected: 'mob' },
    { role: 'mob-boss' as const,    expected: 'mob' },
  ])('$role → $expected', ({ role, expected }) => {
    expect(getMembership(role)).toBe(expected);
  });
});
```

**Parameterized tests for executive power lookup:**

```typescript
// tests/unit/powers.test.ts

import { describe, it, expect } from 'vitest';
import { getExecutivePower } from '../../src/server/game/powers';

describe('getExecutivePower', () => {
  // Full board coverage — every cell in the executive power table
  it.each([
    // 5-6 players (small bracket)
    { players: 5, bad: 1, expected: null },
    { players: 5, bad: 2, expected: null },
    { players: 5, bad: 3, expected: 'investigate' },
    { players: 5, bad: 4, expected: 'special-nomination' },
    { players: 5, bad: 5, expected: 'execution' },
    { players: 6, bad: 1, expected: null },
    { players: 6, bad: 3, expected: 'investigate' },
    // 7-8 players (medium bracket)
    { players: 7, bad: 1, expected: null },
    { players: 7, bad: 2, expected: 'investigate' },
    { players: 7, bad: 3, expected: 'special-nomination' },
    { players: 7, bad: 4, expected: 'execution' },
    { players: 7, bad: 5, expected: 'execution' },
    { players: 8, bad: 2, expected: 'investigate' },
    // 9-10 players (large bracket)
    { players: 9, bad: 1, expected: 'investigate' },
    { players: 9, bad: 2, expected: 'investigate' },
    { players: 9, bad: 3, expected: 'special-nomination' },
    { players: 9, bad: 4, expected: 'execution' },
    { players: 9, bad: 5, expected: 'execution' },
    { players: 10, bad: 1, expected: 'investigate' },
  ])(
    '$players players, $bad bad policies → $expected',
    ({ players, bad, expected }) => {
      expect(getExecutivePower(players, bad)).toBe(expected);
    },
  );
});
```

**Snapshot testing for full game state transitions:**

```typescript
// tests/unit/phases.test.ts

import { describe, it, expect } from 'vitest';
import { createGame, dispatch } from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';
import { createTestGameState } from '../helpers/game-state-factory';

describe('createGame', () => {
  it('snapshot: initial 5-player game state', () => {
    const rng = mulberry32(42);
    const state = createGame(['Alice', 'Bob', 'Carol', 'Dave', 'Eve'], rng);

    // Snapshot captures the entire initial state shape.
    // If the state structure changes, the snapshot diff shows exactly what.
    expect(state).toMatchSnapshot();
  });
});

describe('dispatch — nomination flow', () => {
  it('mayor nominates an eligible player', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });

    const next = dispatch(state, { type: 'nominate', targetId: 'player-3' });

    expect(next.phase).toBe('election');
    expect(next.subPhase).toBe('election-voting');
    expect(next.nominatedChiefId).toBe('player-3');
    // Original state is unchanged (immutability)
    expect(state.nominatedChiefId).toBeNull();
  });

  it('rejects nomination of dead player', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });

    expect(() =>
      dispatch(state, { type: 'nominate', targetId: 'player-3' }),
    ).toThrow(/not valid/);
  });
});

describe('dispatch — election tracker → auto-enact', () => {
  it('auto-enacts top card when tracker reaches 3', () => {
    const rng = mulberry32(42);
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 2,
      nominatedChiefId: 'player-3',
      policyDeck: ['bad', 'good', 'bad', 'good', 'bad'],
      rngSeed: 42,
    });

    // All alive players vote to block
    let next = state;
    for (const p of state.players.filter((p) => p.isAlive)) {
      next = dispatch(next, { type: 'vote', playerId: p.id, vote: 'block' });
    }

    // After 3rd failed election: auto-enact fires
    expect(next.electionTracker).toBe(0); // Reset after auto-enact
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'auto-enact-triggered' }),
    );
    // Term limits cleared
    expect(next.players.every((p) => !p.wasLastMayor && !p.wasLastChief)).toBe(true);
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'term-limits-cleared' }),
    );
  });
});

describe('dispatch — veto flow', () => {
  it('snapshot: full veto-accept flow', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      electionTracker: 0,
    });

    // Chief proposes veto
    const afterPropose = dispatch(state, { type: 'propose-veto' });
    expect(afterPropose.subPhase).toBe('policy-veto-response');

    // Mayor accepts veto
    const afterAccept = dispatch(afterPropose, {
      type: 'veto-response',
      approved: true,
    });
    expect(afterAccept.events).toContainEqual({ type: 'veto-enacted' });
    expect(afterAccept.electionTracker).toBe(1);
    // Both cards should be in discard
    expect(afterAccept.chiefCards).toBeNull();
  });
});
```

**Integration test: full 5-player game simulation:**

```typescript
// tests/integration/full-game.test.ts

import { describe, it, expect } from 'vitest';
import { createGame, dispatch } from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';

describe('full game simulation', () => {
  it('5-player game reaches a win condition within 50 dispatches', () => {
    const rng = mulberry32(12345);
    let state = createGame(
      ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],
      rng,
    );

    // Acknowledge all roles
    for (const p of state.players) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
    }

    let dispatchCount = state.players.length; // Role acknowledges counted
    const maxDispatches = 50;

    while (state.phase !== 'game-over' && dispatchCount < maxDispatches) {
      // Simple bot strategy: deterministic choices based on state
      const action = pickNextAction(state, rng);
      state = dispatch(state, action);
      dispatchCount++;
    }

    expect(state.phase).toBe('game-over');
    expect(state.winner).not.toBeNull();
    expect(dispatchCount).toBeLessThanOrEqual(maxDispatches);
  });
});

// Helper: picks a valid action for the current state (simple deterministic bot)
function pickNextAction(state: GameState, rng: () => number): GameAction {
  // Implementation drives a game to completion with simple heuristics:
  // - Nominate first eligible player
  // - Vote approve/block based on RNG
  // - Discard first card
  // - Use powers on first valid target
  // ... (full implementation in test helper)
}
```

## Acceptance Criteria

### Game State Machine
- [ ] `dispatch()` reducer implemented with all phase transitions
- [ ] All sub-phases tracked and validated
- [ ] Invalid actions for current phase rejected with descriptive errors
- [ ] State is immutable — dispatch returns new object

### Role Distribution
- [ ] Correct counts for all player counts (5–10)
- [ ] Always exactly 1 Mob Boss
- [ ] `knownAllies` correct for 5–6 players (boss knows soldiers)
- [ ] `knownAllies` correct for 7–10 players (boss does NOT know soldiers)
- [ ] `getMembership()` returns correct party for all roles

### Policy Deck
- [ ] Initial deck: 6 good + 11 bad = 17
- [ ] Deck shuffled on creation
- [ ] Reshuffle at random threshold 3–7 (not fixed 3)
- [ ] New random threshold chosen after each reshuffle
- [ ] Reshuffle check before policy session draw AND auto-enact draw
- [ ] Enacted policies removed permanently (not returned to discard)
- [ ] Discarded policies go to discard pile
- [ ] Post-reshuffle deck always has >= 3 cards (assertion)

### Elections & Nominations
- [ ] Strict majority required (ties = blocked)
- [ ] Only alive players vote
- [ ] Election tracker increments on block, resets on success
- [ ] Auto-enact at tracker = 3
- [ ] Term limits enforced: previous chief always ineligible
- [ ] Term limits: previous mayor ineligible at 6+ players only
- [ ] Term limits: previous mayor eligible at 5 players
- [ ] Term limits cleared after auto-enact
- [ ] Term limits waived if no valid candidates remain
- [ ] Mayor cannot nominate self
- [ ] Mayor cannot nominate dead players
- [ ] Mayor rotation skips dead players
- [ ] Special nomination shifts rotation permanently

### Executive Powers
- [ ] Correct power for all 3 player-count brackets at each bad policy count
- [ ] Powers do NOT trigger on auto-enacted policies
- [ ] Investigation reveals 'mob' for mob-boss and mob-soldier, 'citizen' for citizen
- [ ] Execution marks player dead
- [ ] Execution of Mob Boss triggers citizen win
- [ ] Self-execution permitted
- [ ] Only alive players are valid targets

### Veto
- [ ] Available only after 5 bad policies enacted
- [ ] Chief proposes, Mayor accepts/rejects
- [ ] Accepted: both cards discarded, election tracker advances
- [ ] Rejected: chief must enact one card
- [ ] Veto-triggered tracker advance can cause auto-enact at 3

### Win Conditions
- [ ] 5 good policies → citizens win
- [ ] 6 bad policies → mob wins
- [ ] Mob Boss executed → citizens win
- [ ] Mob Boss elected chief after 3+ bad policies → mob wins
- [ ] Mob Boss elected chief before 3 bad policies → game continues
- [ ] Blocking Mob Boss is NOT a win condition
- [ ] Auto-enact can trigger policy win conditions
- [ ] Win checked at correct timing (election check before policy session)

### Testing
- [ ] 80%+ line coverage on `src/server/game/`
- [ ] All test cases from roles, policies, powers, phases modules
- [ ] Injectable RNG used throughout — all tests deterministic
- [ ] Factory helpers for test state setup (`createTestGameState()`)
- [ ] Full 5-player and 10-player game simulations pass
- [ ] Edge case tests: term limit deadlock, deck reshuffle mid-game, veto chain

## Success Metrics

- `pnpm test` passes with 80%+ coverage on game logic
- All 4 win conditions trigger correctly in integration tests
- Full game simulation (5-player) completes in < 50 dispatch calls
- Zero flaky tests (deterministic RNG everywhere)

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sub-phase complexity explodes | Medium | Medium | Keep sub-phases flat (no nesting), test each transition |
| Edge case in term limits causes deadlock | Low | High | Waive-on-deadlock fallback + explicit test |
| Veto + election tracker interaction bugs | Medium | Medium | Dedicated test suite for veto flows |
| 80% coverage hard to reach | Low | Medium | Write tests alongside implementation, not after |

## Sources & References

- SPEC.md game state model: `docs/spec/SPEC.md:133-173`
- SPEC.md board layout table: `docs/spec/SPEC.md:118-128`
- RULES.md game mechanics: `docs/user/RULES.md`
- Deck reshuffle brainstorm: `docs/brainstorms/2026-03-16-deck-reshuffle-brainstorm.md`
- SH rules PDF (fallback): `docs/user/Secret_Hitler_Rules.pdf`
- [Vitest parameterized testing](https://vitest.dev/api/test) — `test.each` API
- [Vitest snapshot testing](https://vitest.dev/guide/snapshot) — `toMatchSnapshot()` guide
- [Vitest coverage configuration](https://vitest.dev/guide/coverage) — v8 provider, thresholds
- [Mulberry32 PRNG](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c) — reference implementation
- [Fisher-Yates shuffle (Wikipedia)](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle) — Durstenfeld modern variant
- [TypeScript discriminated unions](https://basarat.gitbook.io/typescript/type-system/discriminated-unions) — exhaustive switch pattern
- [Redux immutable update patterns](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns) — spread operator patterns
