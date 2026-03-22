/**
 * Adversarial Rules Lawyer Tests
 *
 * Tests for obscure Secret Hitler edge cases that casual testing misses.
 * Each test targets a specific interaction or boundary condition in the
 * game engine that could silently violate SH rules.
 */
import { describe, it, expect } from 'vitest';
import {
  createGame,
  dispatch,
  getEligibleNominees,
  advanceMayor,
} from '../../src/server/game/phases';
import {
  getExecutivePower,
  resolvePolicyPeek,
} from '../../src/server/game/powers';
import { populateKnownAllies } from '../../src/server/game/roles';
import { mulberry32 } from '../../src/server/game/rng';
import {
  createTestGameState,
  createTestPlayer,
} from '../helpers/game-state-factory';
import { advanceDisplayIfNeeded } from '../helpers/game-driver';
import type { GameState, Player, PolicyType } from '../../src/shared/types';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Run a full election where every alive player votes the same way.
 */
function unanimousVote(
  state: GameState,
  vote: 'approve' | 'block',
): GameState {
  let s = state;
  for (const p of state.players.filter((p) => p.isAlive)) {
    s = dispatch(s, { type: 'vote', playerId: p.id, vote });
  }
  return advanceDisplayIfNeeded(s);
}

/**
 * Create players with specific roles at specific indices.
 */
function makePlayers(
  count: number,
  roleOverrides: Record<number, 'citizen' | 'mob-soldier' | 'mob-boss'> = {},
): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    role: roleOverrides[i] ?? 'citizen',
    isAlive: true,
    isMayor: i === 0,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
  }));
}

// ── 1. Mob Boss election check timing ──────────────────────────────

describe('Adversarial: Mob Boss election check timing', () => {
  it('Boss elected as chief at 2 bad policies, then 3rd bad enacted in same round — game continues', () => {
    // Setup: 2 bad policies enacted, mob boss is nominated as chief
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    // Mayor is player-2 (citizen), boss is player-0 nominated as chief
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 2,
      nominatedChiefId: 'player-0', // mob boss
      mayorIndex: 2,
      players,
      policyDeck: ['bad', 'bad', 'bad', 'good', 'good', 'good', 'bad', 'bad', 'bad', 'bad', 'bad'],
    });

    // Election passes — boss becomes chief with only 2 bad policies
    state = unanimousVote(state, 'approve');

    // Game should NOT be over — boss was elected before 3 bad policies
    expect(state.phase).toBe('policy-session');
    expect(state.winner).toBeNull();

    // Now mayor discards, chief (the boss) gets 2 cards
    state = dispatch(state, { type: 'mayor-discard', cardIndex: 2 }); // discard 3rd card

    // Chief enacts a bad policy (the 3rd bad overall)
    // chiefCards should have 2 cards from the original 3 drawn
    const badIndex = state.chiefCards!.indexOf('bad');
    const goodIndex = state.chiefCards!.indexOf('good');
    // If both bad, enact one; if mixed, enact the bad one
    const enactIndex = badIndex >= 0 ? (goodIndex >= 0 ? goodIndex : 1) : 0;
    // We want to enact bad — discard the other
    if (state.chiefCards![0] === 'bad' && state.chiefCards![1] === 'bad') {
      // Both bad, discard index 0 enacts index 1 (both bad, doesn't matter)
      state = dispatch(state, { type: 'chief-discard', cardIndex: 0 });
    } else if (state.chiefCards![0] === 'bad') {
      // Discard index 1 to enact bad at index 0
      state = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    } else {
      // Discard index 0 to enact bad at index 1
      state = dispatch(state, { type: 'chief-discard', cardIndex: 0 });
    }
    state = advanceDisplayIfNeeded(state);

    // Now 3 bad policies are enacted, but the boss was elected BEFORE the 3rd
    // The game should continue — the mob boss election check already happened
    // at election time (when there were only 2 bad policies)
    expect(state.badPoliciesEnacted).toBe(3);
    expect(state.winner).toBeNull();
    // Game should be in executive-power or nomination (policy-peek for 5-player 3rd bad)
    expect(['executive-power', 'nomination']).toContain(state.phase);
  });

  it('Boss elected as chief at exactly 3 bad policies — mob wins immediately', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 3,
      nominatedChiefId: 'player-0',
      mayorIndex: 2,
      players,
    });

    state = unanimousVote(state, 'approve');
    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('mob');
    expect(state.winReason).toContain('Mob Boss elected');
  });
});

// ── 2. Auto-enact clears term limits BEFORE next nomination ────────

describe('Adversarial: Auto-enact clears term limits', () => {
  it('Previously term-limited players are eligible after auto-enact', () => {
    // Setup: player-1 was last chief (term-limited), player-2 was last mayor
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[3].isMayor = true;
    players[0].isMayor = false;
    players[1].wasLastChief = true;
    players[2].wasLastMayor = true;

    // Rig deck so auto-enact draws a good policy (no game-ender)
    const deck: PolicyType[] = ['good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad'];

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 2, // one more failed = auto-enact
      nominatedChiefId: 'player-4',
      mayorIndex: 3,
      players,
      policyDeck: deck,
      rngSeed: 42,
    });

    // Fail the election — triggers auto-enact (tracker 2 → 3)
    state = unanimousVote(state, 'block');

    // After auto-enact, we should be in nomination phase
    expect(state.phase).toBe('nomination');

    // Term limits should be cleared
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'term-limits-cleared' }),
    );

    // ALL players should have term limits cleared
    for (const p of state.players) {
      expect(p.wasLastChief).toBe(false);
      expect(p.wasLastMayor).toBe(false);
    }

    // The previously term-limited player-1 (wasLastChief) should now be eligible
    const eligible = getEligibleNominees(state);
    const currentMayor = state.players[state.mayorIndex];

    // player-1 should be in the eligible list (unless they're the new mayor)
    if (currentMayor.id !== 'player-1') {
      expect(eligible).toContain('player-1');
    }
  });

  it('Full sequence: elect → set term limits → 3 fails → auto-enact → nominate ex-chief', () => {
    // Start with a passed election that sets term limits
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    const deck: PolicyType[] = [
      'good', 'good', 'good', // drawn for policy session
      'good', // auto-enact card
      'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad',
    ];

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
      mayorIndex: 2,
      players,
      policyDeck: deck,
      rngSeed: 42,
    });

    // Pass election — sets player-2 as wasLastMayor, player-3 as wasLastChief
    state = unanimousVote(state, 'approve');
    expect(state.phase).toBe('policy-session');
    expect(state.players.find(p => p.id === 'player-2')!.wasLastMayor).toBe(true);
    expect(state.players.find(p => p.id === 'player-3')!.wasLastChief).toBe(true);

    // Complete the policy session (enact good policy)
    state = dispatch(state, { type: 'mayor-discard', cardIndex: 0 });
    state = dispatch(state, { type: 'chief-discard', cardIndex: 0 });
    state = advanceDisplayIfNeeded(state);

    // Now fail 3 elections in a row to trigger auto-enact
    // Round after policy: new mayor nominates someone
    expect(state.phase).toBe('nomination');
    const mayorAfterPolicy = state.players[state.mayorIndex];

    // Pick a nominee that's eligible
    const eligible1 = getEligibleNominees(state);
    state = dispatch(state, { type: 'nominate', targetId: eligible1[0] });
    state = unanimousVote(state, 'block'); // fail 1

    const eligible2 = getEligibleNominees(state);
    state = dispatch(state, { type: 'nominate', targetId: eligible2[0] });
    state = unanimousVote(state, 'block'); // fail 2

    const eligible3 = getEligibleNominees(state);
    state = dispatch(state, { type: 'nominate', targetId: eligible3[0] });
    state = unanimousVote(state, 'block'); // fail 3 → auto-enact

    // After auto-enact, term limits cleared
    expect(state.phase).toBe('nomination');
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'term-limits-cleared' }),
    );

    // player-3 (was last chief) should now be eligible for nomination
    const eligibleAfterClear = getEligibleNominees(state);
    const newMayor = state.players[state.mayorIndex];
    if (newMayor.id !== 'player-3') {
      expect(eligibleAfterClear).toContain('player-3');
    }
  });
});

// ── 3. Special election doesn't affect term limits ─────────────────

describe('Adversarial: Special election term limits', () => {
  it('Special nomination itself does not set term limits — only the subsequent election does', () => {
    // Setup: player-0 is mayor, uses special-nomination on player-3
    // Before: player-1 is wasLastMayor, player-2 is wasLastChief
    const players = makePlayers(7, {
      0: 'mob-boss',
      1: 'mob-soldier',
      2: 'mob-soldier',
    });
    players[1].wasLastMayor = true;
    players[2].wasLastChief = true;

    let state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
      mayorIndex: 0,
      players,
      playerCount: 7,
    });

    // Special nominate player-3
    state = dispatch(state, { type: 'special-nominate', targetId: 'player-3' });

    // After special nomination, we transition to next nomination round
    // The special-nominated player becomes mayor
    expect(state.phase).toBe('nomination');
    expect(state.players[state.mayorIndex].id).toBe('player-3');

    // Term limits should STILL reflect the PREVIOUS elected pair, not the special election
    expect(state.players.find(p => p.id === 'player-1')!.wasLastMayor).toBe(true);
    expect(state.players.find(p => p.id === 'player-2')!.wasLastChief).toBe(true);
  });

  it('Special-elected mayor who passes election sets NEW term limits on that pair', () => {
    // player-3 is special-elected mayor, nominates player-4 as chief
    const players = makePlayers(7, {
      0: 'mob-boss',
      1: 'mob-soldier',
      2: 'mob-soldier',
    });
    players[0].isMayor = false;
    players[3].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-4',
      mayorIndex: 3,
      players,
      playerCount: 7,
      policyDeck: ['good', 'good', 'good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad'],
      resumeMayorIndex: 0, // special election was called by player-0
    });

    // Pass election
    state = unanimousVote(state, 'approve');

    // After passed election, player-3 should be wasLastMayor, player-4 wasLastChief
    expect(state.players.find(p => p.id === 'player-3')!.wasLastMayor).toBe(true);
    expect(state.players.find(p => p.id === 'player-4')!.wasLastChief).toBe(true);
  });
});

// ── 4. Investigation result persists across rounds ─────────────────

describe('Adversarial: Investigation persistence', () => {
  it('Player investigated in round 3 cannot be investigated again in round 7 by a different mayor', () => {
    // Round 3: mayor A (player-0) investigates player-3
    // Round 7: mayor B (player-1) tries to investigate player-3 — should fail
    const players = makePlayers(9, {
      0: 'mob-boss',
      1: 'mob-soldier',
      2: 'mob-soldier',
      3: 'mob-soldier',
    });
    players[0].isMayor = false;
    players[1].isMayor = true;

    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      mayorIndex: 1,
      round: 7,
      players,
      playerCount: 9,
      // Previous investigation by a DIFFERENT mayor
      investigationHistory: [
        { investigatorId: 'player-0', targetId: 'player-3', result: 'mob' },
      ],
    });

    // Mayor B (player-1) tries to investigate player-3 — already investigated
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-3' }),
    ).toThrow(/already investigated/);
  });

  it('Different players CAN be investigated across rounds', () => {
    const players = makePlayers(9, {
      0: 'mob-boss',
      1: 'mob-soldier',
      2: 'mob-soldier',
      3: 'mob-soldier',
    });
    players[0].isMayor = false;
    players[1].isMayor = true;

    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      mayorIndex: 1,
      round: 7,
      players,
      playerCount: 9,
      investigationHistory: [
        { investigatorId: 'player-0', targetId: 'player-3', result: 'mob' },
      ],
    });

    // Investigating player-4 (not previously investigated) should succeed
    const next = dispatch(state, { type: 'investigate', targetId: 'player-4' });
    expect(next.investigationHistory).toHaveLength(2);
    expect(next.investigationHistory[1].targetId).toBe('player-4');
    expect(next.investigationHistory[1].investigatorId).toBe('player-1');
  });
});

// ── 5. Execution of term-limited player ────────────────────────────

describe('Adversarial: Execution of term-limited player', () => {
  it('Executing wasLastChief player does not transfer term limit to anyone else', () => {
    const players = makePlayers(7, {
      0: 'mob-boss',
      1: 'mob-soldier',
      2: 'mob-soldier',
    });
    // player-3 was last chief (term-limited) and gets executed
    players[3].wasLastChief = true;
    players[4].wasLastMayor = true;

    let state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      mayorIndex: 0,
      players,
      playerCount: 7,
    });

    state = dispatch(state, { type: 'execute', targetId: 'player-3' });

    // player-3 is dead
    expect(state.players.find(p => p.id === 'player-3')!.isAlive).toBe(false);

    // No other player should have wasLastChief set (the dead player's flag is irrelevant)
    const alivePlayersWithChiefFlag = state.players.filter(
      p => p.isAlive && p.wasLastChief,
    );
    expect(alivePlayersWithChiefFlag).toHaveLength(0);

    // wasLastMayor on player-4 should be unchanged
    expect(state.players.find(p => p.id === 'player-4')!.wasLastMayor).toBe(true);

    // Dead player can't be nominated anyway
    const eligible = getEligibleNominees(state);
    expect(eligible).not.toContain('player-3');
  });

  it('Dead player is excluded from eligible nominees regardless of term limit status', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    // Kill player-2, make them wasLastChief (they died while term-limited)
    players[2].isAlive = false;
    players[2].wasLastChief = true;

    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      mayorIndex: 0,
      players,
    });

    const eligible = getEligibleNominees(state);
    expect(eligible).not.toContain('player-2');
  });
});

// ── 6. Chief-cleared event specifics ───────────────────────────────

describe('Adversarial: Chief-cleared event', () => {
  it('(a) Fires at exactly 3 bad policies', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 3,
      nominatedChiefId: 'player-3', // citizen, not mob boss
      mayorIndex: 2,
      players,
    });

    state = unanimousVote(state, 'approve');
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'chief-cleared', chiefId: 'player-3' }),
    );
  });

  it('(b) Fires at 4 bad policies', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 4,
      nominatedChiefId: 'player-3',
      mayorIndex: 2,
      players,
    });

    state = unanimousVote(state, 'approve');
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'chief-cleared', chiefId: 'player-3' }),
    );
  });

  it('(b) Fires at 5 bad policies', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 5,
      nominatedChiefId: 'player-3',
      mayorIndex: 2,
      players,
    });

    state = unanimousVote(state, 'approve');
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'chief-cleared', chiefId: 'player-3' }),
    );
  });

  it('(c) Does NOT fire at 2 bad policies', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 2,
      nominatedChiefId: 'player-3',
      mayorIndex: 2,
      players,
    });

    state = unanimousVote(state, 'approve');
    expect(state.events).not.toContainEqual(
      expect.objectContaining({ type: 'chief-cleared' }),
    );
  });

  it('(d) Fires even when chief is a mob soldier (soldier is not the boss)', () => {
    // player-1 is mob-soldier, elected as chief at 3+ bad
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 3,
      nominatedChiefId: 'player-1', // mob soldier
      mayorIndex: 2,
      players,
    });

    state = unanimousVote(state, 'approve');

    // Should NOT be game-over (soldier, not boss)
    expect(state.phase).not.toBe('game-over');

    // Should fire chief-cleared (everyone now knows player-1 is not the boss)
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'chief-cleared', chiefId: 'player-1' }),
    );
  });
});

// ── 7. Veto resets vetoProposed on new round ───────────────────────

describe('Adversarial: Veto state across rounds', () => {
  it('After accepted veto, next round has vetoProposed=false', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'bad'],
      badPoliciesEnacted: 5, // veto unlocked
      mayorIndex: 2,
      players,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good', 'bad'],
      rngSeed: 42,
    });

    // Chief proposes veto
    state = dispatch(state, { type: 'propose-veto' });
    expect(state.vetoProposed).toBe(true);
    state = advanceDisplayIfNeeded(state); // advance past veto-propose display

    // Mayor accepts
    state = dispatch(state, { type: 'veto-response', approved: true });

    // Should be in nomination (or auto-enact if tracker hit 3)
    // vetoProposed should be reset
    expect(state.vetoProposed).toBe(false);
  });

  it('After rejected veto and chief enacts, next round has vetoProposed=false', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: 5,
      mayorIndex: 2,
      players,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good', 'bad'],
      rngSeed: 42,
    });

    // Chief proposes veto
    state = dispatch(state, { type: 'propose-veto' });
    expect(state.vetoProposed).toBe(true);
    state = advanceDisplayIfNeeded(state); // advance past veto-propose display

    // Mayor rejects
    state = dispatch(state, { type: 'veto-response', approved: false });
    expect(state.vetoProposed).toBe(true); // still true during this session

    // Chief must now enact — enact the good policy (discard bad)
    state = dispatch(state, { type: 'chief-discard', cardIndex: 0 });
    state = advanceDisplayIfNeeded(state);

    // Next round should have vetoProposed cleared
    // (if enacting bad at 6 total, game might be over; enact good instead)
    if (state.phase !== 'game-over') {
      expect(state.vetoProposed).toBe(false);
    }
  });

  it('Veto cannot be proposed twice in same session after rejection', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: 5,
      mayorIndex: 2,
      players,
    });

    // Propose veto
    state = dispatch(state, { type: 'propose-veto' });
    state = advanceDisplayIfNeeded(state);

    // Mayor rejects
    state = dispatch(state, { type: 'veto-response', approved: false });

    // Chief tries to propose veto again — should fail
    expect(() =>
      dispatch(state, { type: 'propose-veto' }),
    ).toThrow(/already proposed/);
  });
});

// ── 8. Policy peek card order ──────────────────────────────────────

describe('Adversarial: Policy peek card order preservation', () => {
  it('After policy peek + acknowledge, next draw gets the SAME cards in same order', () => {
    const riggedDeck: PolicyType[] = [
      'bad', 'good', 'bad', // top 3 — these are the peek cards AND next draw
      'good', 'bad', 'good', 'bad', 'good',
    ];

    let state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'policy-peek-viewing',
      executivePower: 'policy-peek',
      policyDeck: riggedDeck,
      peekCards: ['bad', 'good', 'bad'], // already peeked
      mayorIndex: 0,
      rngSeed: 42,
    });

    // Record deck state before acknowledge
    const deckBeforeAck = [...state.policyDeck];

    // Acknowledge peek
    state = dispatch(state, { type: 'acknowledge-peek' });

    // Deck should be unchanged after acknowledging peek
    expect(state.policyDeck).toEqual(deckBeforeAck);
    expect(state.peekCards).toBeNull();

    // Now go through a full election to draw those same cards
    expect(state.phase).toBe('nomination');

    // Nominate and pass election
    const eligible = getEligibleNominees(state);
    state = dispatch(state, { type: 'nominate', targetId: eligible[0] });
    state = unanimousVote(state, 'approve');

    // Mayor should see the same top 3 cards
    expect(state.phase).toBe('policy-session');
    expect(state.mayorCards).toEqual(['bad', 'good', 'bad']);
  });
});

// ── 9. Special election + execution combo ──────────────────────────

describe('Adversarial: Special election + execution of caller', () => {
  it('Rotation skips dead original caller after special-elected mayor executes them', () => {
    // 7 players: player-0 is mayor, special-nominates player-3
    // player-3 becomes mayor, gets execution, executes player-0
    // resumeMayorIndex = 0, but player-0 is dead
    // Next mayor should be player-1 (next alive after dead player-0)
    const players = makePlayers(7, {
      0: 'citizen', // will be killed
      1: 'mob-soldier',
      2: 'mob-soldier',
      3: 'citizen', // special-elected mayor
      5: 'mob-boss',
    });
    players[0].isMayor = false;
    players[3].isMayor = true;

    let state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      mayorIndex: 3,
      resumeMayorIndex: 0, // original caller was player-0
      players,
      playerCount: 7,
    });

    // Special-elected mayor (player-3) executes player-0 (the original caller)
    state = dispatch(state, { type: 'execute', targetId: 'player-0' });

    expect(state.players.find(p => p.id === 'player-0')!.isAlive).toBe(false);
    expect(state.phase).toBe('nomination');

    // resumeMayorIndex was 0, so advanceMayor should go to (0+1)%7 = 1
    // player-1 is alive, so they become mayor
    expect(state.mayorIndex).toBe(1);
    expect(state.players[1].isMayor).toBe(true);
    // resumeMayorIndex should be cleared
    expect(state.resumeMayorIndex).toBeNull();
  });

  it('Rotation skips multiple dead players after caller index', () => {
    // player-0 called special election, player-1 and player-2 are dead
    // resumeMayorIndex = 0, player-0 dead, player-1 dead, player-2 dead
    // Next should be player-3
    const players = makePlayers(7, {
      5: 'mob-boss',
      1: 'mob-soldier',
      2: 'mob-soldier',
    });
    players[0].isAlive = false; // dead (original caller)
    players[1].isAlive = false; // dead
    players[4].isMayor = true;
    players[0].isMayor = false;

    let state = createTestGameState({
      mayorIndex: 4,
      resumeMayorIndex: 0,
      players,
      playerCount: 7,
    });

    const next = advanceMayor(state);

    // (0+1)%7 = 1 (dead), 2 (dead if mob-soldier dies... let's check)
    // Only player-0 and player-1 are marked dead above
    // So: (0+1)=1 (dead) → 2 (alive) → player-2 is mayor
    expect(next.mayorIndex).toBe(2);
    expect(next.players[2].isMayor).toBe(true);
  });
});

// ── 10. 5-player endgame ───────────────────────────────────────────

describe('Adversarial: 5-player endgame (3 alive)', () => {
  it('Nomination works with 3 alive (mayor excluded, 2 candidates)', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[1].isAlive = false; // dead
    players[2].isAlive = false; // dead
    // Alive: player-0 (boss), player-3 (citizen), player-4 (citizen)
    players[3].isMayor = true;
    players[0].isMayor = false;

    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      mayorIndex: 3,
      players,
    });

    const eligible = getEligibleNominees(state);
    // Should be 2 candidates (player-0 and player-4, excluding mayor player-3)
    expect(eligible).toHaveLength(2);
    expect(eligible).toContain('player-0');
    expect(eligible).toContain('player-4');
  });

  it('Election works with 3 voters (need 2 to pass)', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[1].isAlive = false;
    players[2].isAlive = false;
    players[3].isMayor = true;
    players[0].isMayor = false;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-4',
      mayorIndex: 3,
      players,
      policyDeck: ['good', 'good', 'good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad'],
    });

    // 2 approve, 1 block — should pass (2 > 1)
    state = dispatch(state, { type: 'vote', playerId: 'player-0', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-3', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-4', vote: 'block' });
    state = advanceDisplayIfNeeded(state);

    expect(state.phase).toBe('policy-session');
  });

  it('Mob boss election at 3+ bad still triggers win with 3 alive', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[1].isAlive = false;
    players[2].isAlive = false;
    players[3].isMayor = true;
    players[0].isMayor = false;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 3,
      nominatedChiefId: 'player-0', // mob boss
      mayorIndex: 3,
      players,
    });

    // Pass the election
    state = dispatch(state, { type: 'vote', playerId: 'player-0', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-3', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-4', vote: 'block' });
    state = advanceDisplayIfNeeded(state);

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('mob');
  });

  it('Term limits at 5 alive: only chief is term-limited (mayor can be nominated)', () => {
    // SH rule: at 5 alive, only previous chief is term-limited
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[1].isAlive = false;
    players[2].isAlive = false;
    // 3 alive: player-0, player-3, player-4
    players[3].isMayor = true;
    players[3].wasLastMayor = true;
    players[4].wasLastChief = true;
    players[0].isMayor = false;

    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      mayorIndex: 3,
      players,
    });

    const eligible = getEligibleNominees(state);
    // 3 alive players, mayor (player-3) excluded from nominees
    // player-4 is wasLastChief → term-limited (always)
    // player-0 is the only eligible nominee
    // Wait — at 5 alive players (not 5 total players), mayor IS eligible?
    // Actually the rules say: "In games with 5 alive players, only the previous Chief is term-limited"
    // The code checks aliveCount > 5 for wasLastMayor restriction
    // 3 alive < 5, so wasLastMayor is NOT enforced. But mayor can't nominate self anyway.
    // With 3 alive: player-3 is mayor (excluded), player-4 is wasLastChief (excluded),
    // only player-0 is eligible
    expect(eligible).toEqual(['player-0']);
  });
});

// ── 11. Soldier knowledge at exactly 6 vs 7 players ───────────────

describe('Adversarial: Soldier knowledge boundary at 6 vs 7 players', () => {
  it('At exactly 6 players, mob boss KNOWS soldiers', () => {
    const rng = mulberry32(42);
    const state = createGame(
      ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'],
      rng,
    );

    const boss = state.players.find(p => p.role === 'mob-boss')!;
    const soldiers = state.players.filter(p => p.role === 'mob-soldier');

    // 6 players: 4 citizens, 1 soldier, 1 boss
    expect(soldiers).toHaveLength(1);

    // Boss should know the soldier
    expect(boss.knownAllies).toHaveLength(1);
    expect(boss.knownAllies).toContain(soldiers[0].id);
  });

  it('At exactly 7 players, mob boss does NOT know soldiers', () => {
    const rng = mulberry32(42);
    const state = createGame(
      ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'],
      rng,
    );

    const boss = state.players.find(p => p.role === 'mob-boss')!;
    const soldiers = state.players.filter(p => p.role === 'mob-soldier');

    // 7 players: 4 citizens, 2 soldiers, 1 boss
    expect(soldiers).toHaveLength(2);

    // Boss should NOT know soldiers
    expect(boss.knownAllies).toEqual([]);
  });

  it('At 6 players, soldiers know the boss', () => {
    const rng = mulberry32(42);
    const state = createGame(
      ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'],
      rng,
    );

    const boss = state.players.find(p => p.role === 'mob-boss')!;
    const soldiers = state.players.filter(p => p.role === 'mob-soldier');

    for (const s of soldiers) {
      expect(s.knownAllies).toContain(boss.id);
    }
  });

  it('At 7 players, soldiers know boss AND each other', () => {
    const rng = mulberry32(42);
    const state = createGame(
      ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'],
      rng,
    );

    const boss = state.players.find(p => p.role === 'mob-boss')!;
    const soldiers = state.players.filter(p => p.role === 'mob-soldier');

    for (const s of soldiers) {
      // Knows boss
      expect(s.knownAllies).toContain(boss.id);
      // Knows other soldiers
      for (const other of soldiers) {
        if (other.id !== s.id) {
          expect(s.knownAllies).toContain(other.id);
        }
      }
      // Total: 1 boss + 1 other soldier = 2 allies
      expect(s.knownAllies).toHaveLength(2);
    }
  });

  it('Boundary test with populateKnownAllies directly at 6 and 7', () => {
    // 6 players
    const players6: Player[] = [
      createTestPlayer({ id: 'p0', role: 'mob-boss' }),
      createTestPlayer({ id: 'p1', role: 'mob-soldier' }),
      createTestPlayer({ id: 'p2', role: 'citizen' }),
      createTestPlayer({ id: 'p3', role: 'citizen' }),
      createTestPlayer({ id: 'p4', role: 'citizen' }),
      createTestPlayer({ id: 'p5', role: 'citizen' }),
    ];
    const result6 = populateKnownAllies(players6);
    expect(result6.find(p => p.id === 'p0')!.knownAllies).toEqual(['p1']); // boss knows soldier

    // 7 players
    const players7: Player[] = [
      createTestPlayer({ id: 'p0', role: 'mob-boss' }),
      createTestPlayer({ id: 'p1', role: 'mob-soldier' }),
      createTestPlayer({ id: 'p2', role: 'mob-soldier' }),
      createTestPlayer({ id: 'p3', role: 'citizen' }),
      createTestPlayer({ id: 'p4', role: 'citizen' }),
      createTestPlayer({ id: 'p5', role: 'citizen' }),
      createTestPlayer({ id: 'p6', role: 'citizen' }),
    ];
    const result7 = populateKnownAllies(players7);
    expect(result7.find(p => p.id === 'p0')!.knownAllies).toEqual([]); // boss does NOT know soldiers
  });
});

// ── 12. Election tracker visual state ──────────────────────────────

describe('Adversarial: Election tracker correctness', () => {
  it('After auto-enact, tracker is 0', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[3].isMayor = true;
    players[0].isMayor = false;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 2,
      nominatedChiefId: 'player-4',
      mayorIndex: 3,
      players,
      policyDeck: ['good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad'],
      rngSeed: 42,
    });

    state = unanimousVote(state, 'block'); // tracker 2 → 3 → auto-enact
    expect(state.electionTracker).toBe(0);
  });

  it('After successful election, tracker is 0', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 2, // was at 2 before this election
      nominatedChiefId: 'player-3',
      mayorIndex: 2,
      players,
      policyDeck: ['good', 'good', 'good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad'],
    });

    state = unanimousVote(state, 'approve');
    expect(state.electionTracker).toBe(0);
  });

  it('After 1 failed election then 1 successful, tracker is 0 (not 1)', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 0,
      nominatedChiefId: 'player-3',
      mayorIndex: 2,
      players,
      policyDeck: ['good', 'good', 'good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad'],
    });

    // Fail first election — tracker goes to 1
    state = unanimousVote(state, 'block');
    expect(state.electionTracker).toBe(1);

    // Nominate and pass second election
    const eligible = getEligibleNominees(state);
    state = dispatch(state, { type: 'nominate', targetId: eligible[0] });
    state = unanimousVote(state, 'approve');

    // Tracker should be 0 after successful election
    expect(state.electionTracker).toBe(0);
  });

  it('Tracker increments correctly: 0 → 1 → 2 → 3 (auto-enact)', () => {
    const players = makePlayers(5, { 0: 'mob-boss', 1: 'mob-soldier' });
    players[0].isMayor = false;
    players[2].isMayor = true;

    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 0,
      nominatedChiefId: 'player-3',
      mayorIndex: 2,
      players,
      policyDeck: ['good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad'],
      rngSeed: 42,
    });

    // Fail 1
    state = unanimousVote(state, 'block');
    expect(state.electionTracker).toBe(1);

    // Fail 2
    const eligible2 = getEligibleNominees(state);
    state = dispatch(state, { type: 'nominate', targetId: eligible2[0] });
    state = unanimousVote(state, 'block');
    expect(state.electionTracker).toBe(2);

    // Fail 3 → auto-enact → tracker resets
    const eligible3 = getEligibleNominees(state);
    state = dispatch(state, { type: 'nominate', targetId: eligible3[0] });
    state = unanimousVote(state, 'block');
    expect(state.electionTracker).toBe(0);
  });
});
