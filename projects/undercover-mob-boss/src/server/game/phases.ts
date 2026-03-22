import type {
  GameState,
  GameAction,
  Phase,
  SubPhase,
  Player,
  PolicyType,
} from '../../shared/types';
import { distributeRoles, populateKnownAllies } from './roles';
import { createDeck, drawCards, checkReshuffle, pickReshuffleThreshold } from './policies';
import { getExecutivePower, resolveInvestigation, resolvePolicyPeek, resolveExecution, resolveSpecialNomination } from './powers';
import { mulberry32 } from './rng';

// ── Error types ────────────────────────────────────────────────────

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

/** Exhaustive helper — TypeScript errors if a case is unhandled. */
function assertNever(x: never): never {
  throw new Error(`Unhandled action type: ${(x as GameAction).type}`);
}

// ── Display sub-phases ────────────────────────────────────────────────
// These sub-phases are "display-only" — no player action is required.
// The server auto-dispatches `advance-display` after a brief delay so
// clients can show results (vote reveal, policy flip, etc.).

/** SubPhases that are display-only (auto-advanced by server timer). */
export const DISPLAY_SUB_PHASES: ReadonlySet<SubPhase> = new Set([
  'election-result',
  'policy-enact',
  'auto-enact',
  'policy-veto-propose',
]);

// ── Game creation ──────────────────────────────────────────────────

/**
 * Initialize a full game: assign roles, create deck, set first mayor.
 * Returns a GameState in `role-reveal` phase.
 */
export function createGame(
  playerNames: string[],
  rng: () => number = Math.random,
): GameState {
  const playerCount = playerNames.length;
  if (playerCount < 5 || playerCount > 10) {
    throw new Error(`Invalid player count: ${playerCount}. Must be 5-10.`);
  }

  const roles = distributeRoles(playerCount, rng);
  const seed = Math.floor(rng() * 0xffffffff);

  const firstMayor = Math.floor(rng() * playerCount);

  let players: Player[] = playerNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    role: roles[i],
    isAlive: true,
    isMayor: i === firstMayor,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
  }));

  players = populateKnownAllies(players);
  const deck = createDeck(rng);
  const threshold = pickReshuffleThreshold(rng);

  return {
    phase: 'role-reveal',
    subPhase: 'role-reveal-waiting',
    round: 1,
    players,
    mayorIndex: firstMayor,
    nominatedChiefId: null,
    electionTracker: 0,
    goodPoliciesEnacted: 0,
    badPoliciesEnacted: 0,
    policyDeck: deck,
    policyDiscard: [],
    votes: {},
    mayorCards: null,
    chiefCards: null,
    executivePower: null,
    winner: null,
    winReason: null,
    reshuffleThreshold: threshold,
    vetoProposed: false,
    events: [],
    acknowledgedPlayerIds: [],
    investigationHistory: [],
    peekCards: null,
    specialNominatedMayorId: null,
    resumeMayorIndex: null,
    rngSeed: seed,
    lastEnactedPolicy: null,
  };
}

// ── Validation ─────────────────────────────────────────────────────

function validateAction(state: GameState, action: GameAction): string | null {
  switch (action.type) {
    case 'start-game':
      if (state.phase !== 'lobby') return 'start-game only valid in lobby';
      if (state.players.length < 5 || state.players.length > 10)
        return 'Need 5-10 players to start';
      return null;

    case 'acknowledge-role':
      if (state.phase !== 'role-reveal' || state.subPhase !== 'role-reveal-waiting')
        return 'acknowledge-role only valid during role-reveal-waiting';
      if (!state.players.find((p) => p.id === action.playerId))
        return `Player ${action.playerId} not found`;
      return null;

    case 'nominate':
      if (state.phase !== 'nomination' || state.subPhase !== 'nomination-pending')
        return 'nominate only valid during nomination-pending';
      {
        const eligible = getEligibleNominees(state);
        if (!eligible.includes(action.targetId))
          return `Player ${action.targetId} is not valid for nomination`;
      }
      return null;

    case 'vote':
      if (state.phase !== 'election' || state.subPhase !== 'election-voting')
        return 'vote only valid during election-voting';
      if (action.vote !== 'approve' && action.vote !== 'block')
        return 'Invalid vote value';
      {
        const voter = state.players.find((p) => p.id === action.playerId);
        if (!voter) return `Player ${action.playerId} not found`;
        if (!voter.isAlive) return 'Dead players cannot vote';
        if (state.votes[action.playerId]) return `Player ${action.playerId} already voted`;
      }
      return null;

    case 'mayor-discard':
      if (state.phase !== 'policy-session' || state.subPhase !== 'policy-mayor-discard')
        return 'mayor-discard only valid during policy-mayor-discard';
      if (!state.mayorCards || !Number.isInteger(action.cardIndex) || action.cardIndex < 0 || action.cardIndex >= state.mayorCards.length)
        return 'Invalid card index';
      return null;

    case 'chief-discard':
      if (state.phase !== 'policy-session' || state.subPhase !== 'policy-chief-discard')
        return 'chief-discard only valid during policy-chief-discard';
      if (!state.chiefCards || !Number.isInteger(action.cardIndex) || action.cardIndex < 0 || action.cardIndex >= state.chiefCards.length)
        return 'Invalid card index';
      return null;

    case 'propose-veto':
      if (state.phase !== 'policy-session' || state.subPhase !== 'policy-chief-discard')
        return 'propose-veto only valid during policy-chief-discard';
      if (state.badPoliciesEnacted < 5) return 'Veto only available after 5 bad policies';
      if (state.vetoProposed) return 'Veto already proposed this session';
      return null;

    case 'veto-response':
      if (state.phase !== 'policy-session' || state.subPhase !== 'policy-veto-response')
        return 'veto-response only valid during policy-veto-response';
      return null;

    case 'investigate':
      if (state.phase !== 'executive-power' || state.subPhase !== 'executive-power-pending')
        return 'investigate only valid during executive-power-pending';
      if (state.executivePower !== 'investigate') return 'Current power is not investigate';
      {
        const mayor = state.players[state.mayorIndex];
        if (action.targetId === mayor.id) return 'Cannot investigate yourself';
        const target = state.players.find((p) => p.id === action.targetId);
        if (!target || !target.isAlive) return `Player ${action.targetId} is not valid target`;
        if (state.investigationHistory.some((r) => r.targetId === action.targetId))
          return `Player ${action.targetId} already investigated`;
      }
      return null;

    case 'acknowledge-peek':
      if (state.phase !== 'executive-power' || state.subPhase !== 'policy-peek-viewing')
        return 'acknowledge-peek only valid during policy-peek-viewing';
      if (state.executivePower !== 'policy-peek') return 'Current power is not policy-peek';
      return null;

    case 'special-nominate':
      if (state.phase !== 'executive-power' || state.subPhase !== 'executive-power-pending')
        return 'special-nominate only valid during executive-power-pending';
      if (state.executivePower !== 'special-nomination')
        return 'Current power is not special-nomination';
      {
        const mayor = state.players[state.mayorIndex];
        if (action.targetId === mayor.id) return 'Cannot special-nominate yourself';
        const target = state.players.find((p) => p.id === action.targetId);
        if (!target || !target.isAlive) return `Player ${action.targetId} is not valid target`;
      }
      return null;

    case 'execute':
      if (state.phase !== 'executive-power' || state.subPhase !== 'executive-power-pending')
        return 'execute only valid during executive-power-pending';
      if (state.executivePower !== 'execution') return 'Current power is not execution';
      {
        const mayor = state.players[state.mayorIndex];
        if (action.targetId === mayor.id) return 'Cannot execute yourself';
        const target = state.players.find((p) => p.id === action.targetId);
        if (!target || !target.isAlive) return `Player ${action.targetId} is not valid target`;
      }
      return null;

    case 'advance-display':
      if (!state.subPhase || !DISPLAY_SUB_PHASES.has(state.subPhase))
        return `advance-display only valid during display subPhases, current: ${state.subPhase}`;
      return null;

    default:
      return assertNever(action);
  }
}

// ── Main dispatch ──────────────────────────────────────────────────

export function dispatch(state: GameState, action: GameAction): GameState {
  // 1. Clear events from previous dispatch
  const base: GameState = { ...state, events: [] };

  // 2. Validate
  const error = validateAction(base, action);
  if (error) {
    throw new InvalidActionError(error, base.phase, base.subPhase, action.type);
  }

  // 3. Route to handler
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
    case 'acknowledge-peek':
      return handleAcknowledgePeek(base);
    case 'special-nominate':
      return handleSpecialNominate(base, action);
    case 'execute':
      return handleExecute(base, action);
    case 'advance-display':
      return handleAdvanceDisplay(base);
    default:
      return assertNever(action);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Returns list of player IDs eligible to be nominated as chief.
 * Enforces term limits with deadlock fallback.
 */
export function getEligibleNominees(state: GameState): string[] {
  const mayor = state.players[state.mayorIndex];
  const alivePlayers = state.players.filter((p) => p.isAlive);
  const aliveCount = alivePlayers.length;

  // Base eligibility: alive and not the current mayor
  const candidates = alivePlayers.filter((p) => p.id !== mayor.id);

  // Apply term limits
  const withTermLimits = candidates.filter((p) => {
    // Previous chief is ALWAYS term-limited
    if (p.wasLastChief) return false;
    // Previous mayor is term-limited only at 6+ alive players
    if (p.wasLastMayor && aliveCount > 5) return false;
    return true;
  });

  // Deadlock fallback: if term limits eliminate ALL candidates, waive them
  if (withTermLimits.length === 0) {
    return candidates.map((p) => p.id);
  }

  return withTermLimits.map((p) => p.id);
}

/**
 * Advance mayor to the next alive player in clockwise order.
 *
 * Special election handling (SH rule):
 *   1. specialNominatedMayorId set -> jump to that player, save caller's
 *      index in resumeMayorIndex so rotation can resume correctly.
 *   2. resumeMayorIndex set (round AFTER special election) -> next alive
 *      player after the original caller. This ensures no players are
 *      skipped, and the next-in-line can even serve twice in a row.
 *   3. Otherwise -> normal clockwise rotation.
 */
export function advanceMayor(state: GameState): GameState {
  let nextIndex: number;
  let newResumeMayorIndex: number | null = null;

  if (state.specialNominatedMayorId) {
    // Step 1: Jump to the special-nominated player
    nextIndex = state.players.findIndex(
      (p) => p.id === state.specialNominatedMayorId,
    );
    // Defensive: if the nominated player died between nomination and transition,
    // fall through to normal clockwise rotation from their position
    if (nextIndex === -1 || !state.players[nextIndex].isAlive) {
      const fallback = nextIndex === -1 ? state.mayorIndex : nextIndex;
      nextIndex = (fallback + 1) % state.players.length;
      while (!state.players[nextIndex].isAlive) {
        nextIndex = (nextIndex + 1) % state.players.length;
      }
    }
    // Remember the caller's position so we can resume from there
    newResumeMayorIndex = state.mayorIndex;
  } else if (state.resumeMayorIndex !== null) {
    // Step 2: Round after special election -- resume from the caller's position
    nextIndex = (state.resumeMayorIndex + 1) % state.players.length;
    while (!state.players[nextIndex].isAlive) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }
    // Clear -- we've resumed
    newResumeMayorIndex = null;
  } else {
    // Step 3: Normal rotation
    nextIndex = (state.mayorIndex + 1) % state.players.length;
    while (!state.players[nextIndex].isAlive) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }
  }

  return {
    ...state,
    mayorIndex: nextIndex,
    specialNominatedMayorId: null,
    resumeMayorIndex: newResumeMayorIndex,
    players: state.players.map((p, i) => ({
      ...p,
      isMayor: i === nextIndex,
      isChief: false,
      // NOTE: wasLastMayor/wasLastChief are NOT updated here.
      // They are only updated in handleElectionPassed (last ELECTED pair).
    })),
  };
}

/** Transition to nomination phase with a new round. */
function transitionToNomination(state: GameState): GameState {
  const advanced = advanceMayor(state);
  return {
    ...advanced,
    phase: 'nomination',
    subPhase: 'nomination-pending',
    round: state.round + 1,
    nominatedChiefId: null,
    votes: {},
    mayorCards: null,
    chiefCards: null,
    executivePower: null,
    vetoProposed: false,
    peekCards: null,
  };
}

/** Start the first nomination round (no mayor advance -- first mayor already set). */
function transitionToFirstNomination(state: GameState): GameState {
  return {
    ...state,
    phase: 'nomination',
    subPhase: 'nomination-pending',
    nominatedChiefId: null,
    votes: {},
    mayorCards: null,
    chiefCards: null,
    executivePower: null,
    vetoProposed: false,
    peekCards: null,
  };
}

/** Check win conditions after policy enactment. Returns state (possibly game-over). */
function checkPolicyWin(state: GameState): GameState {
  if (state.goodPoliciesEnacted >= 5) {
    return {
      ...state,
      phase: 'game-over',
      subPhase: null,
      winner: 'citizens',
      winReason: '5 good policies enacted',
      events: [
        ...state.events,
        { type: 'game-over', winner: 'citizens', reason: '5 good policies enacted' },
      ],
    };
  }
  if (state.badPoliciesEnacted >= 6) {
    return {
      ...state,
      phase: 'game-over',
      subPhase: null,
      winner: 'mob',
      winReason: '6 bad policies enacted',
      events: [
        ...state.events,
        { type: 'game-over', winner: 'mob', reason: '6 bad policies enacted' },
      ],
    };
  }
  return state;
}

/**
 * Enact a policy: update counts, emit event, check for win.
 * Does NOT navigate to the next phase -- pauses at a display subPhase
 * so the host can show the result. The server auto-dispatches
 * `advance-display` after a timer to continue.
 *
 * If the enactment triggers a win condition, goes directly to game-over
 * (no display pause needed -- game-over has its own overlay).
 */
function enactPolicy(
  state: GameState,
  policy: PolicyType,
  autoEnacted: boolean,
): GameState {
  const updated = {
    ...state,
    goodPoliciesEnacted: state.goodPoliciesEnacted + (policy === 'good' ? 1 : 0),
    badPoliciesEnacted: state.badPoliciesEnacted + (policy === 'bad' ? 1 : 0),
    mayorCards: null,
    chiefCards: null,
    events: [...state.events, { type: 'policy-enacted' as const, policy, autoEnacted }],
  };

  // Check win conditions -- game-over takes priority over display
  const afterWinCheck = checkPolicyWin(updated);
  if (afterWinCheck.winner) return afterWinCheck;

  // Pause at display subPhase. advance-display will handle
  // executive power check and transition to next nomination.
  // Store enacted policy so continueAfterPolicyEnact knows what was enacted
  // (events are cleared between dispatches).
  if (autoEnacted) {
    return {
      ...afterWinCheck,
      subPhase: 'auto-enact',
      lastEnactedPolicy: policy,
    };
  }

  return {
    ...afterWinCheck,
    subPhase: 'policy-enact',
    lastEnactedPolicy: policy,
  };
}

/**
 * Continuation after `policy-enact` display: check executive power or
 * transition to next nomination.
 */
function continueAfterPolicyEnact(state: GameState): GameState {
  const policy = state.lastEnactedPolicy ?? 'good';

  // Clear the stored policy — it's been consumed
  const cleanState: GameState = { ...state, lastEnactedPolicy: null };

  // policy-enact is only used for NON-auto-enacted policies (auto-enacted use auto-enact subPhase)
  // so we always check executive power here
  if (policy === 'bad') {
    const playerCount = cleanState.players.length;
    const power = getExecutivePower(playerCount, cleanState.badPoliciesEnacted);
    if (power) {
      let powerState: GameState = {
        ...cleanState,
        phase: 'executive-power',
        subPhase: power === 'policy-peek' ? 'policy-peek-viewing' : 'executive-power-pending',
        executivePower: power,
        events: [
          ...cleanState.events,
          { type: 'executive-power-activated', power },
        ],
      };
      // Policy peek: immediately resolve (show cards to Mayor)
      if (power === 'policy-peek') {
        powerState = resolvePolicyPeek(powerState);
      }
      return powerState;
    }
  }

  // No power -- go to next nomination
  return transitionToNomination(cleanState);
}

/**
 * Continuation after `auto-enact` display: clear term limits and
 * transition to next nomination.
 */
function continueAfterAutoEnact(state: GameState): GameState {
  // Clear ALL term limits (SH rule: auto-enact resets term limits)
  const result: GameState = {
    ...state,
    lastEnactedPolicy: null,
    players: state.players.map((p) => ({
      ...p,
      wasLastMayor: false,
      wasLastChief: false,
    })),
    events: [...state.events, { type: 'term-limits-cleared' }],
  };

  return transitionToNomination(result);
}

// ── Action handlers ────────────────────────────────────────────────

function handleStartGame(state: GameState): GameState {
  const rng = mulberry32(Date.now());
  return createGame(
    state.players.map((p) => p.name),
    rng,
  );
}

function handleAcknowledgeRole(
  state: GameState,
  action: { type: 'acknowledge-role'; playerId: string },
): GameState {
  if (state.acknowledgedPlayerIds.includes(action.playerId)) {
    return state; // Already acknowledged, idempotent
  }

  const acknowledged = [...state.acknowledgedPlayerIds, action.playerId];

  // Check if all players have acknowledged
  if (acknowledged.length >= state.players.length) {
    return transitionToFirstNomination({ ...state, acknowledgedPlayerIds: acknowledged });
  }

  return { ...state, acknowledgedPlayerIds: acknowledged };
}

function handleNominate(
  state: GameState,
  action: { type: 'nominate'; targetId: string },
): GameState {
  return {
    ...state,
    phase: 'election',
    subPhase: 'election-voting',
    nominatedChiefId: action.targetId,
    votes: {},
  };
}

function handleVote(
  state: GameState,
  action: { type: 'vote'; playerId: string; vote: 'approve' | 'block' },
): GameState {
  const newVotes = { ...state.votes, [action.playerId]: action.vote };
  const alivePlayers = state.players.filter((p) => p.isAlive);
  const totalAlive = alivePlayers.length;
  const voteCount = Object.keys(newVotes).length;

  // Not all votes in yet
  if (voteCount < totalAlive) {
    return { ...state, votes: newVotes };
  }

  // All votes in -- pause at election-result display.
  // advance-display will call handleElectionPassed or handleElectionFailed.
  return {
    ...state,
    subPhase: 'election-result',
    votes: newVotes,
  };
}

function handleElectionPassed(state: GameState): GameState {
  const chiefId = state.nominatedChiefId!;
  const mayor = state.players[state.mayorIndex];

  // Set the chief AND record term limits for this elected government.
  // Term limits reflect the last ELECTED pair (SH rule), not the last nominated pair.
  const players = state.players.map((p) => ({
    ...p,
    isChief: p.id === chiefId,
    wasLastMayor: p.id === mayor.id,
    wasLastChief: p.id === chiefId,
  }));

  let result: GameState = {
    ...state,
    players,
    electionTracker: 0,
    events: [
      ...state.events,
      { type: 'election-passed', mayorId: mayor.id, chiefId },
    ],
  };

  // Check mob boss election win: 3+ bad policies AND nominee is mob boss
  if (result.badPoliciesEnacted >= 3) {
    const chief = result.players.find((p) => p.id === chiefId)!;
    if (chief.role === 'mob-boss') {
      return {
        ...result,
        phase: 'game-over',
        subPhase: null,
        winner: 'mob',
        winReason: 'Mob Boss elected Chief after 3+ bad policies',
        events: [
          ...result.events,
          {
            type: 'game-over',
            winner: 'mob',
            reason: 'Mob Boss elected Chief after 3+ bad policies',
          },
        ],
      };
    }
    // Chief survived the check -- everyone now knows they are NOT the Mob Boss
    result = {
      ...result,
      events: [...result.events, { type: 'chief-cleared', chiefId }],
    };
  }

  // Enter policy session -- draw 3 cards for mayor
  const rng = mulberry32(result.rngSeed + result.round);
  result = checkReshuffle(result, rng);
  const [drawn, remaining] = drawCards(result.policyDeck, 3);

  return {
    ...result,
    phase: 'policy-session',
    subPhase: 'policy-mayor-discard',
    policyDeck: remaining,
    mayorCards: drawn,
  };
}

function handleElectionFailed(state: GameState): GameState {
  const newTracker = state.electionTracker + 1;

  let result: GameState = {
    ...state,
    electionTracker: newTracker,
    events: [
      ...state.events,
      { type: 'election-failed', electionTracker: newTracker },
    ],
  };

  // Auto-enact at tracker = 3
  if (newTracker >= 3) {
    return handleAutoEnact(result);
  }

  // Normal failed election -- next nomination
  return transitionToNomination(result);
}

function handleAutoEnact(state: GameState): GameState {
  const rng = mulberry32(state.rngSeed + state.round + 100);

  let result: GameState = {
    ...state,
    events: [...state.events, { type: 'auto-enact-triggered' }],
  };

  // Reshuffle check before draw
  result = checkReshuffle(result, rng);

  // Draw top card
  const [drawn, remaining] = drawCards(result.policyDeck, 1);
  const policy = drawn[0];

  result = {
    ...result,
    policyDeck: remaining,
    electionTracker: 0,
  };

  // Enact the policy (autoEnacted = true, so no executive power).
  // enactPolicy will pause at 'auto-enact' display subPhase (or game-over).
  result = enactPolicy(result, policy, true);

  // If game over, term limits don't matter.
  // If paused at auto-enact, term limits will be cleared when advance-display fires.
  return result;
}

function handleMayorDiscard(
  state: GameState,
  action: { type: 'mayor-discard'; cardIndex: number },
): GameState {
  const cards = state.mayorCards!;
  const discarded = cards[action.cardIndex];
  const remaining = cards.filter((_, i) => i !== action.cardIndex);

  return {
    ...state,
    subPhase: 'policy-chief-discard',
    mayorCards: null,
    chiefCards: remaining,
    policyDiscard: [...state.policyDiscard, discarded],
  };
}

function handleChiefDiscard(
  state: GameState,
  action: { type: 'chief-discard'; cardIndex: number },
): GameState {
  const cards = state.chiefCards!;
  const discarded = cards[action.cardIndex];
  const enacted = cards.filter((_, i) => i !== action.cardIndex)[0];

  const result: GameState = {
    ...state,
    chiefCards: null,
    policyDiscard: [...state.policyDiscard, discarded],
  };

  // enactPolicy now pauses at 'policy-enact' display (or game-over)
  return enactPolicy(result, enacted, false);
}

function handleProposeVeto(state: GameState): GameState {
  // Pause at veto-propose display so host can show the proposal.
  // advance-display will transition to veto-response (where mayor acts).
  return {
    ...state,
    subPhase: 'policy-veto-propose',
    vetoProposed: true,
  };
}

function handleVetoResponse(
  state: GameState,
  action: { type: 'veto-response'; approved: boolean },
): GameState {
  if (action.approved) {
    // Both cards discarded, election tracker advances
    const newTracker = state.electionTracker + 1;

    let result: GameState = {
      ...state,
      policyDiscard: [...state.policyDiscard, ...state.chiefCards!],
      chiefCards: null,
      electionTracker: newTracker,
      events: [...state.events, { type: 'veto-enacted' }],
    };

    // Auto-enact if tracker hits 3
    if (newTracker >= 3) {
      return handleAutoEnact(result);
    }

    return transitionToNomination(result);
  } else {
    // Rejected -- chief must enact one of the two cards
    return {
      ...state,
      subPhase: 'policy-chief-discard',
      vetoProposed: true, // keep true so they can't propose again
      events: [...state.events, { type: 'veto-rejected' }],
    };
  }
}

function handleInvestigate(
  state: GameState,
  action: { type: 'investigate'; targetId: string },
): GameState {
  const target = state.players.find((p) => p.id === action.targetId)!;
  const mayor = state.players[state.mayorIndex];
  const investigatorId = mayor.id;
  const result = resolveInvestigation(target);

  const newState: GameState = {
    ...state,
    investigationHistory: [
      ...state.investigationHistory,
      { investigatorId, targetId: action.targetId, result },
    ],
    events: [
      ...state.events,
      { type: 'investigation-result', targetId: action.targetId, result },
    ],
  };

  return transitionToNomination(newState);
}

function handleAcknowledgePeek(state: GameState): GameState {
  const newState: GameState = {
    ...state,
    peekCards: null,
    events: [...state.events, { type: 'policy-peek-completed' }],
  };
  return transitionToNomination(newState);
}

function handleSpecialNominate(
  state: GameState,
  action: { type: 'special-nominate'; targetId: string },
): GameState {
  const result = resolveSpecialNomination(state, action.targetId);
  return transitionToNomination(result);
}

function handleExecute(
  state: GameState,
  action: { type: 'execute'; targetId: string },
): GameState {
  const result = resolveExecution(state, action.targetId);

  // If game over (mob boss executed), return immediately
  if (result.winner) return result;

  return transitionToNomination(result);
}

// ── Display advance handler ─────────────────────────────────────────

/**
 * Handle the server-dispatched `advance-display` action.
 * Routes to the appropriate continuation based on the current display subPhase.
 */
function handleAdvanceDisplay(state: GameState): GameState {
  switch (state.subPhase) {
    case 'election-result':
      return advanceFromElectionResult(state);
    case 'policy-enact':
      return continueAfterPolicyEnact(state);
    case 'auto-enact':
      return continueAfterAutoEnact(state);
    case 'policy-veto-propose':
      return advanceFromVetoPropose(state);
    default:
      // Should never happen -- validation prevents this
      throw new Error(`Cannot advance from subPhase: ${state.subPhase}`);
  }
}

/** Continue from election-result display: derive pass/fail from votes. */
function advanceFromElectionResult(state: GameState): GameState {
  const approveCount = Object.values(state.votes).filter((v) => v === 'approve').length;
  const blockCount = Object.values(state.votes).filter((v) => v === 'block').length;
  const passed = approveCount > blockCount;

  if (passed) {
    return handleElectionPassed(state);
  } else {
    return handleElectionFailed(state);
  }
}

/** Continue from veto-propose display: transition to veto-response. */
function advanceFromVetoPropose(state: GameState): GameState {
  return {
    ...state,
    subPhase: 'policy-veto-response',
  };
}
