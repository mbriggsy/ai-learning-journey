import { describe, it, expect } from 'vitest';
import { getActiveScreen } from '../../src/client/router';
import type { PlayerState } from '../../src/shared/protocol';

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    phase: 'nomination',
    subPhase: 'nomination-pending',
    round: 1,
    players: [
      { id: 'me', name: 'Me', isAlive: true, isMayor: true, isChief: false, wasLastMayor: false, wasLastChief: false, isConnected: true },
      { id: 'p2', name: 'P2', isAlive: true, isMayor: false, isChief: false, wasLastMayor: false, wasLastChief: false, isConnected: true },
      { id: 'p3', name: 'P3', isAlive: true, isMayor: false, isChief: true, wasLastMayor: false, wasLastChief: false, isConnected: true },
    ],
    nominatedChiefId: 'p3',
    goodPoliciesEnacted: 0,
    badPoliciesEnacted: 0,
    electionTracker: 0,
    votes: null,
    executivePower: null,
    winner: null,
    winReason: null,
    events: [],
    myRole: 'citizen',
    myKnownAllies: [],
    isMyTurn: false,
    hasVoted: false,
    ...overrides,
  };
}

describe('getActiveScreen', () => {
  it('game-over → game-over (always)', () => {
    expect(getActiveScreen(
      makePlayerState({ phase: 'game-over', subPhase: null, winner: 'citizens' }),
      'me',
    )).toBe('game-over');
  });

  it('dead player → spectator', () => {
    const state = makePlayerState({
      phase: 'election',
      subPhase: 'election-voting',
      players: [
        { id: 'me', name: 'Me', isAlive: false, isMayor: false, isChief: false, wasLastMayor: false, wasLastChief: false, isConnected: true },
      ],
    });
    expect(getActiveScreen(state, 'me')).toBe('spectator');
  });

  it('lobby → lobby', () => {
    expect(getActiveScreen(makePlayerState({ phase: 'lobby', subPhase: null }), 'me')).toBe('lobby');
  });

  it('role-reveal → role-reveal', () => {
    expect(getActiveScreen(
      makePlayerState({ phase: 'role-reveal', subPhase: 'role-reveal-waiting' }),
      'me',
    )).toBe('role-reveal');
  });

  it('mayor during nomination-pending → mayor-nomination', () => {
    const state = makePlayerState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });
    expect(getActiveScreen(state, 'me')).toBe('mayor-nomination');
  });

  it('non-mayor during nomination-pending → waiting', () => {
    const state = makePlayerState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });
    expect(getActiveScreen(state, 'p2')).toBe('waiting');
  });

  it('election-voting, not voted → vote', () => {
    const state = makePlayerState({
      phase: 'election',
      subPhase: 'election-voting',
      hasVoted: false,
    });
    expect(getActiveScreen(state, 'me')).toBe('vote');
  });

  it('election-voting, already voted → waiting', () => {
    const state = makePlayerState({
      phase: 'election',
      subPhase: 'election-voting',
      hasVoted: true,
    });
    expect(getActiveScreen(state, 'me')).toBe('waiting');
  });

  it('mayor during policy-mayor-discard → mayor-hand', () => {
    const state = makePlayerState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
    });
    expect(getActiveScreen(state, 'me')).toBe('mayor-hand');
  });

  it('chief during policy-chief-discard → chief-hand', () => {
    const state = makePlayerState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
    });
    expect(getActiveScreen(state, 'p3')).toBe('chief-hand');
  });

  it('mayor during policy-veto-response → veto-response', () => {
    const state = makePlayerState({
      phase: 'policy-session',
      subPhase: 'policy-veto-response',
    });
    expect(getActiveScreen(state, 'me')).toBe('veto-response');
  });

  it('mayor during executive-power investigate → power-investigate', () => {
    const state = makePlayerState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });
    expect(getActiveScreen(state, 'me')).toBe('power-investigate');
  });

  it('mayor during executive-power special-nomination → power-nominate', () => {
    const state = makePlayerState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
    });
    expect(getActiveScreen(state, 'me')).toBe('power-nominate');
  });

  it('mayor during executive-power execution → power-execute', () => {
    const state = makePlayerState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
    });
    expect(getActiveScreen(state, 'me')).toBe('power-execute');
  });

  it('non-active player during policy session → waiting', () => {
    const state = makePlayerState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
    });
    expect(getActiveScreen(state, 'p2')).toBe('waiting');
  });

  it('non-mayor during executive power → waiting', () => {
    const state = makePlayerState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });
    expect(getActiveScreen(state, 'p2')).toBe('waiting');
  });

  it('mayor during policy-peek-viewing → power-peek', () => {
    const state = makePlayerState({
      phase: 'executive-power',
      subPhase: 'policy-peek-viewing',
      executivePower: 'policy-peek',
    });
    expect(getActiveScreen(state, 'me')).toBe('power-peek');
  });

  it('non-mayor during policy-peek-viewing → waiting', () => {
    const state = makePlayerState({
      phase: 'executive-power',
      subPhase: 'policy-peek-viewing',
      executivePower: 'policy-peek',
    });
    expect(getActiveScreen(state, 'p2')).toBe('waiting');
  });
});
