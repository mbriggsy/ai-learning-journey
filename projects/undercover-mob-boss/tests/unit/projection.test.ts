import { describe, it, expect } from 'vitest';
import {
  projectStateForHost,
  projectStateForPlayer,
  getPrivateData,
  isPlayersTurn,
} from '../../src/server/projection';
import { createTestGameState } from '../helpers/game-state-factory';
import type { GameState } from '../../src/shared/types';

const allConnected = (state: GameState) =>
  new Map(state.players.map((p) => [p.id, true]));

// ── Security: No private data leaks ───────────────────────────────

describe('projectStateForHost — security', () => {
  it('NEVER includes any player role', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));

    for (const p of projected.players) {
      expect(p).not.toHaveProperty('role');
      expect((p as any).role).toBeUndefined();
    }
  });

  it('NEVER includes knownAllies', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));

    for (const p of projected.players) {
      expect(p).not.toHaveProperty('knownAllies');
    }
  });

  it('NEVER includes policyDeck', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected).not.toHaveProperty('policyDeck');
  });

  it('NEVER includes policyDiscard', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected).not.toHaveProperty('policyDiscard');
  });

  it('NEVER includes reshuffleThreshold', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected).not.toHaveProperty('reshuffleThreshold');
  });

  it('NEVER includes mayorCards', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected).not.toHaveProperty('mayorCards');
  });

  it('NEVER includes chiefCards', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected).not.toHaveProperty('chiefCards');
  });

  it('NEVER includes rngSeed', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected).not.toHaveProperty('rngSeed');
  });

  it('NEVER includes investigationHistory', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected).not.toHaveProperty('investigationHistory');
  });

  it('hides votes until election result', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      votes: { 'player-0': 'approve' },
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.votes).toBeNull();
  });

  it('reveals roles at game-over', () => {
    const state = createTestGameState({
      phase: 'game-over',
      subPhase: null,
      winner: 'citizens',
      winReason: 'test',
    });
    const projected = projectStateForHost(state, allConnected(state));
    for (const p of projected.players) {
      expect(p).toHaveProperty('role');
    }
  });
});

describe('projectStateForPlayer — security', () => {
  it('includes own role but NOT other players roles', () => {
    const state = createTestGameState();
    const projected = projectStateForPlayer(state, 'player-0', allConnected(state));

    expect(projected.myRole).toBe('mob-boss'); // player-0 is mob-boss in factory
    // Other players in the players array should not have roles
    for (const p of projected.players) {
      expect((p as any).role).toBeUndefined();
    }
  });

  it('includes own knownAllies', () => {
    const state = createTestGameState();
    const projected = projectStateForPlayer(state, 'player-0', allConnected(state));
    expect(projected.myKnownAllies).toBeDefined();
  });

  it('NEVER includes other players cards or deck', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });

    // Non-mayor player should not see cards
    const projected = projectStateForPlayer(state, 'player-3', allConnected(state));
    expect(projected).not.toHaveProperty('mayorCards');
    expect(projected).not.toHaveProperty('chiefCards');
    expect(projected).not.toHaveProperty('policyDeck');
  });
});

// ── projectStateForHost — correctness ──────────────────────────────

describe('projectStateForHost — correctness', () => {
  it('includes phase, subPhase, round', () => {
    const state = createTestGameState();
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.phase).toBe(state.phase);
    expect(projected.subPhase).toBe(state.subPhase);
    expect(projected.round).toBe(state.round);
  });

  it('includes policy counts and election tracker', () => {
    const state = createTestGameState({
      goodPoliciesEnacted: 3,
      badPoliciesEnacted: 2,
      electionTracker: 1,
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.goodPoliciesEnacted).toBe(3);
    expect(projected.badPoliciesEnacted).toBe(2);
    expect(projected.electionTracker).toBe(1);
  });

  it('includes connection status', () => {
    const state = createTestGameState();
    const status = new Map([
      ['player-0', true],
      ['player-1', false],
      ['player-2', true],
      ['player-3', true],
      ['player-4', false],
    ]);
    const projected = projectStateForHost(state, status);
    expect(projected.players[0].isConnected).toBe(true);
    expect(projected.players[1].isConnected).toBe(false);
  });
});

// ── waitingOnPlayerIds ────────────────────────────────────────────

describe('projectStateForHost — waitingOnPlayerIds', () => {
  it('identifies mayor during nomination', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.waitingOnPlayerIds).toEqual(['player-0']); // mayor
  });

  it('identifies all unvoted alive players during voting', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      votes: { 'player-0': 'approve' },
    });
    const projected = projectStateForHost(state, allConnected(state));
    // player-0 already voted, remaining 4 alive players should be waiting
    expect(projected.waitingOnPlayerIds).toContain('player-1');
    expect(projected.waitingOnPlayerIds).toContain('player-2');
    expect(projected.waitingOnPlayerIds).toContain('player-3');
    expect(projected.waitingOnPlayerIds).toContain('player-4');
    expect(projected.waitingOnPlayerIds).not.toContain('player-0');
  });

  it('identifies chief during chief-discard', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      nominatedChiefId: 'player-3',
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.waitingOnPlayerIds).toEqual(['player-3']);
  });

  it('is empty when no one needs to act', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-enact',
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.waitingOnPlayerIds).toEqual([]);
  });

  it('is empty at game-over', () => {
    const state = createTestGameState({
      phase: 'game-over',
      subPhase: null,
      winner: 'citizens',
      winReason: 'test',
    });
    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.waitingOnPlayerIds).toEqual([]);
  });
});

// ── isPlayersTurn ──────────────────────────────────────────────────

describe('isPlayersTurn', () => {
  it('mayor during nomination', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });
    expect(isPlayersTurn(state, 'player-0')).toBe(true); // mayor
    expect(isPlayersTurn(state, 'player-3')).toBe(false);
  });

  it('all alive players during voting', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      votes: {},
    });
    expect(isPlayersTurn(state, 'player-0')).toBe(true);
    expect(isPlayersTurn(state, 'player-3')).toBe(true);
  });

  it('already-voted player is not their turn', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      votes: { 'player-0': 'approve' },
    });
    expect(isPlayersTurn(state, 'player-0')).toBe(false);
  });

  it('mayor during mayor-discard', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
    });
    expect(isPlayersTurn(state, 'player-0')).toBe(true);
    expect(isPlayersTurn(state, 'player-3')).toBe(false);
  });

  it('chief during chief-discard', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      nominatedChiefId: 'player-3',
    });
    expect(isPlayersTurn(state, 'player-3')).toBe(true);
    expect(isPlayersTurn(state, 'player-0')).toBe(false);
  });

  it('dead player is never their turn', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });
    expect(isPlayersTurn(state, 'player-3')).toBe(false);
  });
});

// ── getPrivateData ─────────────────────────────────────────────────

describe('getPrivateData', () => {
  it('returns role and allies after lobby', () => {
    const state = createTestGameState();
    const priv = getPrivateData(state, 'player-0');
    expect(priv?.role).toBe('mob-boss');
    expect(priv?.knownAllies).toBeDefined();
  });

  it('returns null in lobby phase', () => {
    const state = createTestGameState({ phase: 'lobby', subPhase: null });
    const priv = getPrivateData(state, 'player-0');
    expect(priv).toBeNull();
  });

  it('returns mayorCards only for mayor during mayor-discard', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    const mayorPriv = getPrivateData(state, 'player-0'); // mayor
    expect(mayorPriv?.mayorCards).toEqual(['good', 'bad', 'bad']);

    const otherPriv = getPrivateData(state, 'player-3');
    expect(otherPriv?.mayorCards).toBeUndefined();
  });

  it('returns chiefCards only for chief during chief-discard', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      nominatedChiefId: 'player-3',
    });
    const chiefPriv = getPrivateData(state, 'player-3');
    expect(chiefPriv?.chiefCards).toEqual(['bad', 'good']);

    const otherPriv = getPrivateData(state, 'player-0');
    expect(otherPriv?.chiefCards).toBeUndefined();
  });

  it('returns investigation result only for investigator', () => {
    const state = createTestGameState({
      investigationHistory: [
        { investigatorId: 'player-2', targetId: 'player-3', result: 'citizen' },
      ],
    });
    const investigatorPriv = getPrivateData(state, 'player-2');
    expect(investigatorPriv?.investigationResult).toEqual({
      targetId: 'player-3',
      result: 'citizen',
    });

    const otherPriv = getPrivateData(state, 'player-0');
    expect(otherPriv?.investigationResult).toBeUndefined();
  });

  it('returns null for nonexistent player', () => {
    const state = createTestGameState();
    expect(getPrivateData(state, 'nonexistent')).toBeNull();
  });

  it('returns mobBossId for mob soldiers', () => {
    const state = createTestGameState();
    // player-1 is mob-soldier, player-0 is mob-boss
    const soldierPriv = getPrivateData(state, 'player-1');
    expect(soldierPriv?.mobBossId).toBe('player-0');
  });

  it('does not return mobBossId for mob boss', () => {
    const state = createTestGameState();
    const bossPriv = getPrivateData(state, 'player-0');
    expect(bossPriv?.mobBossId).toBeUndefined();
  });

  it('does not return mobBossId for citizens', () => {
    const state = createTestGameState();
    // player-2 is citizen in 5-player factory
    const citizenPriv = getPrivateData(state, 'player-2');
    expect(citizenPriv?.mobBossId).toBeUndefined();
  });
});
