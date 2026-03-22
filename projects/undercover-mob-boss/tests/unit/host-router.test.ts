import { describe, it, expect } from 'vitest';
import { getHostView, getTransitionType } from '../../src/client/host/host-router';
import type { HostState } from '../../src/shared/protocol';

function makeHostState(overrides: Partial<HostState> = {}): HostState {
  return {
    phase: 'nomination',
    subPhase: 'nomination-pending',
    round: 1,
    players: [],
    nominatedChiefId: null,
    goodPoliciesEnacted: 0,
    badPoliciesEnacted: 0,
    electionTracker: 0,
    votes: null,
    executivePower: null,
    winner: null,
    winReason: null,
    events: [],
    waitingOnPlayerIds: [],
    ...overrides,
  };
}

describe('getHostView', () => {
  it('lobby → lobby screen', () => {
    expect(getHostView(makeHostState({ phase: 'lobby', subPhase: null })).screen).toBe('lobby');
  });

  it('game-over → game-board with game-over overlay', () => {
    const view = getHostView(makeHostState({ phase: 'game-over', subPhase: null }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('game-over');
  });

  it('election-result → game-board with election-results overlay', () => {
    const view = getHostView(makeHostState({ subPhase: 'election-result' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('election-results');
  });

  it('policy-enact → game-board with policy-enacted overlay', () => {
    const view = getHostView(makeHostState({ subPhase: 'policy-enact' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('policy-enacted');
  });

  it('auto-enact → game-board with auto-enact overlay', () => {
    const view = getHostView(makeHostState({ subPhase: 'auto-enact' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('auto-enact');
  });

  it('executive-power-pending → game-board with executive-power overlay', () => {
    const view = getHostView(makeHostState({ subPhase: 'executive-power-pending' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('executive-power');
  });

  it('nomination-pending → game-board with nomination overlay', () => {
    const view = getHostView(makeHostState({ subPhase: 'nomination-pending' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('nomination');
  });

  it('election-voting → game-board with nomination overlay', () => {
    const view = getHostView(makeHostState({ subPhase: 'election-voting' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('nomination');
  });

  it('policy-mayor-discard → game-board with policy-session-active overlay', () => {
    const view = getHostView(makeHostState({ phase: 'policy-session', subPhase: 'policy-mayor-discard' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('policy-session-active');
  });

  it('policy-veto-response → game-board with veto-proposed overlay', () => {
    const view = getHostView(makeHostState({ phase: 'policy-session', subPhase: 'policy-veto-response' }));
    expect(view.screen).toBe('game-board');
    expect(view.overlays).toContain('veto-proposed');
  });

  it('board is always base screen during gameplay', () => {
    const phases = [
      'nomination-pending', 'election-voting', 'election-result',
      'policy-enact', 'auto-enact', 'executive-power-pending',
      'policy-mayor-discard', 'policy-chief-discard',
    ];
    for (const subPhase of phases) {
      const view = getHostView(makeHostState({ subPhase: subPhase as any }));
      expect(view.screen).toBe('game-board');
    }
  });
});

describe('getTransitionType', () => {
  it('reconnect → instant', () => {
    const prev = { screen: 'lobby' as const, overlays: [] };
    const next = { screen: 'game-board' as const, overlays: [] };
    expect(getTransitionType(prev, next, true)).toBe('instant');
  });

  it('same screen → none', () => {
    const prev = { screen: 'game-board' as const, overlays: [] };
    const next = { screen: 'game-board' as const, overlays: ['policy-session-active' as const] };
    expect(getTransitionType(prev, next, false)).toBe('none');
  });

  it('lobby to game-board → crossfade', () => {
    const prev = { screen: 'lobby' as const, overlays: [] };
    const next = { screen: 'game-board' as const, overlays: [] };
    expect(getTransitionType(prev, next, false)).toBe('crossfade');
  });
});
