/**
 * Server Bug Fixes — H2, H3, H4, M4
 *
 * H2: Spam-click Start Game guard
 * H3: Dev features gated behind localhost origin
 * H4: Sanitize events broadcast (no investigation/execution leaks)
 * M4: Validate vote values at runtime
 */
import { describe, it, expect } from 'vitest';
import { dispatch, InvalidActionError } from '../../src/server/game/phases';
import { projectStateForHost, projectStateForPlayer } from '../../src/server/projection';
import { createTestGameState } from '../helpers/game-state-factory';
import type { GameState, GameEvent } from '../../src/shared/types';

// ── H2: Spam-click Start Game guard ────────────────────────────────

describe('H2 — double start-game guard', () => {
  it('handleStartGame is a no-op when gameState already exists', async () => {
    const { default: UMBRoom } = await import('../../src/server/room');

    const sentMessages: string[] = [];
    const mockConn = {
      id: 'conn-host',
      state: { playerId: 'host-id', sessionToken: 'tok-host', isHost: true },
      setState: () => {},
      send: (msg: string) => sentMessages.push(msg),
      close: () => {},
    };

    const connections = [mockConn];
    const mockRoom = {
      id: 'TEST',
      getConnections: function* () { yield* connections; },
      storage: { setAlarm: () => {} },
    } as any;

    const room = new UMBRoom(mockRoom);

    // Simulate joining: host + 5 players
    const playerNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
    const playerConns: any[] = [];
    // First, register the host via onConnect + join message
    room.onConnect(mockConn as any, {
      request: { headers: new Headers({ origin: 'http://localhost:5173' }) },
    } as any);
    room.onMessage(JSON.stringify({ type: 'join', payload: { name: 'Host' } }), mockConn as any);

    // Add 5 test players
    for (let i = 0; i < 5; i++) {
      const pc = {
        id: `conn-p${i}`,
        state: null as any,
        setState: function (s: any) { this.state = s; },
        send: () => {},
        close: () => {},
      };
      playerConns.push(pc);
      connections.push(pc);
      room.onConnect(pc as any, {
        request: { headers: new Headers({ origin: 'http://localhost:5173' }) },
      } as any);
      room.onMessage(
        JSON.stringify({ type: 'join', payload: { name: playerNames[i] } }),
        pc as any,
      );
    }

    // First start-game — should succeed
    sentMessages.length = 0;
    room.onMessage(JSON.stringify({ type: 'start-game', payload: {} }), mockConn as any);

    // Capture state updates after first start
    const firstStartMessages = [...sentMessages];
    const hasRoleReveal = firstStartMessages.some((m) => {
      const parsed = JSON.parse(m);
      return parsed.type === 'state-update' && parsed.payload?.phase === 'role-reveal';
    });
    expect(hasRoleReveal).toBe(true);

    // Second start-game — should be silently ignored (guard)
    sentMessages.length = 0;
    room.onMessage(JSON.stringify({ type: 'start-game', payload: {} }), mockConn as any);

    // No state-update with role-reveal should be sent (game already exists)
    const secondStartHasRoleReveal = sentMessages.some((m) => {
      const parsed = JSON.parse(m);
      return parsed.type === 'state-update' && parsed.payload?.phase === 'role-reveal';
    });
    expect(secondStartHasRoleReveal).toBe(false);
  });
});

// ── H3: Dev features gated behind isProduction env flag ─────────────

describe('H3 — dev features gated behind UMB_PRODUCTION env flag', () => {
  async function createRoomWithHost(isProductionMode = false) {
    const { default: UMBRoom } = await import('../../src/server/room');

    const sentMessages: string[] = [];
    const mockConn = {
      id: 'conn-host',
      state: null as any,
      setState: function (s: any) { this.state = s; },
      send: (msg: string) => sentMessages.push(msg),
      close: () => {},
    };

    const mockRoom = {
      id: 'TEST',
      env: isProductionMode ? { UMB_PRODUCTION: 'true' } : {},
      getConnections: function* () { yield mockConn; },
      storage: { setAlarm: () => {} },
    } as any;

    const room = new UMBRoom(mockRoom);

    room.onConnect(mockConn as any, {
      request: { headers: new Headers({ origin: 'http://localhost:5173' }) },
    } as any);

    room.onMessage(
      JSON.stringify({ type: 'join', payload: { name: 'Host' } }),
      mockConn as any,
    );

    return { room, mockConn, sentMessages };
  }

  it('spawn-test-players rejected in production mode', async () => {
    const { room, mockConn, sentMessages } = await createRoomWithHost(true);

    sentMessages.length = 0;
    room.onMessage(
      JSON.stringify({ type: 'spawn-test-players', payload: { count: 5 } }),
      mockConn as any,
    );

    const errorMsg = sentMessages.find((m) => {
      const parsed = JSON.parse(m);
      return parsed.type === 'error' && parsed.payload?.message === 'Dev features not available';
    });
    expect(errorMsg).toBeDefined();
  });

  it('load-scenario rejected in production mode', async () => {
    const { room, mockConn, sentMessages } = await createRoomWithHost(true);

    sentMessages.length = 0;
    room.onMessage(
      JSON.stringify({ type: 'load-scenario', payload: { scenario: 'investigation' } }),
      mockConn as any,
    );

    const errorMsg = sentMessages.find((m) => {
      const parsed = JSON.parse(m);
      return parsed.type === 'error' && parsed.payload?.message === 'Dev features not available';
    });
    expect(errorMsg).toBeDefined();
  });

  it('spawn-test-players allowed in dev mode', async () => {
    const { room, mockConn, sentMessages } = await createRoomWithHost(false);

    sentMessages.length = 0;
    room.onMessage(
      JSON.stringify({ type: 'spawn-test-players', payload: { count: 5 } }),
      mockConn as any,
    );

    // Should NOT get "Dev features not available" error
    const devError = sentMessages.find((m) => {
      const parsed = JSON.parse(m);
      return parsed.type === 'error' && parsed.payload?.message === 'Dev features not available';
    });
    expect(devError).toBeUndefined();
  });

  it('load-scenario allowed in dev mode', async () => {
    const { room, mockConn, sentMessages } = await createRoomWithHost(false);

    sentMessages.length = 0;
    room.onMessage(
      JSON.stringify({ type: 'load-scenario', payload: { scenario: 'investigation' } }),
      mockConn as any,
    );

    const devError = sentMessages.find((m) => {
      const parsed = JSON.parse(m);
      return parsed.type === 'error' && parsed.payload?.message === 'Dev features not available';
    });
    expect(devError).toBeUndefined();
  });
});

// ── H4: Sanitize events broadcast ───────────────────────────────────

describe('H4 — events sanitization in projection', () => {
  const allConnected = (state: GameState) =>
    new Map(state.players.map((p) => [p.id, true]));

  it('strips result from investigation-result events for host', () => {
    const state = createTestGameState({
      events: [
        { type: 'investigation-result', targetId: 'player-2', result: 'mob' },
      ],
    });

    const projected = projectStateForHost(state, allConnected(state));
    const investigationEvent = projected.events.find(
      (e) => e.type === 'investigation-result',
    ) as any;

    expect(investigationEvent).toBeDefined();
    expect(investigationEvent.targetId).toBe('player-2');
    expect(investigationEvent).not.toHaveProperty('result');
  });

  it('strips result from investigation-result events for player', () => {
    const state = createTestGameState({
      events: [
        { type: 'investigation-result', targetId: 'player-2', result: 'citizen' },
      ],
    });

    const projected = projectStateForPlayer(state, 'player-3', allConnected(state));
    const investigationEvent = projected.events.find(
      (e) => e.type === 'investigation-result',
    ) as any;

    expect(investigationEvent).toBeDefined();
    expect(investigationEvent.targetId).toBe('player-2');
    expect(investigationEvent).not.toHaveProperty('result');
  });

  it('strips wasMobBoss from player-executed events for host', () => {
    const state = createTestGameState({
      events: [
        { type: 'player-executed', playerId: 'player-1', wasMobBoss: true },
      ],
    });

    const projected = projectStateForHost(state, allConnected(state));
    const executedEvent = projected.events.find(
      (e) => e.type === 'player-executed',
    ) as any;

    expect(executedEvent).toBeDefined();
    expect(executedEvent.playerId).toBe('player-1');
    expect(executedEvent).not.toHaveProperty('wasMobBoss');
  });

  it('strips wasMobBoss from player-executed events for player', () => {
    const state = createTestGameState({
      events: [
        { type: 'player-executed', playerId: 'player-1', wasMobBoss: false },
      ],
    });

    const projected = projectStateForPlayer(state, 'player-2', allConnected(state));
    const executedEvent = projected.events.find(
      (e) => e.type === 'player-executed',
    ) as any;

    expect(executedEvent).toBeDefined();
    expect(executedEvent.playerId).toBe('player-1');
    expect(executedEvent).not.toHaveProperty('wasMobBoss');
  });

  it('preserves non-sensitive events unchanged', () => {
    const state = createTestGameState({
      events: [
        { type: 'policy-enacted', policy: 'bad', autoEnacted: false },
        { type: 'election-passed', mayorId: 'player-0', chiefId: 'player-2' },
        { type: 'election-failed', electionTracker: 2 },
      ],
    });

    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.events).toHaveLength(3);
    expect(projected.events[0]).toEqual({ type: 'policy-enacted', policy: 'bad', autoEnacted: false });
    expect(projected.events[1]).toEqual({ type: 'election-passed', mayorId: 'player-0', chiefId: 'player-2' });
    expect(projected.events[2]).toEqual({ type: 'election-failed', electionTracker: 2 });
  });

  it('handles mixed sensitive and non-sensitive events', () => {
    const state = createTestGameState({
      events: [
        { type: 'policy-enacted', policy: 'bad', autoEnacted: false },
        { type: 'investigation-result', targetId: 'player-3', result: 'mob' },
        { type: 'player-executed', playerId: 'player-1', wasMobBoss: false },
      ],
    });

    const projected = projectStateForHost(state, allConnected(state));
    expect(projected.events).toHaveLength(3);

    // First event untouched
    expect(projected.events[0]).toEqual({ type: 'policy-enacted', policy: 'bad', autoEnacted: false });

    // Investigation: result stripped
    const inv = projected.events[1] as any;
    expect(inv.type).toBe('investigation-result');
    expect(inv.targetId).toBe('player-3');
    expect(inv).not.toHaveProperty('result');

    // Execution: wasMobBoss stripped
    const exec = projected.events[2] as any;
    expect(exec.type).toBe('player-executed');
    expect(exec.playerId).toBe('player-1');
    expect(exec).not.toHaveProperty('wasMobBoss');
  });
});

// ── M4: Validate vote values at runtime ─────────────────────────────

describe('M4 — vote value validation', () => {
  function electionState(): GameState {
    return createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-2',
      votes: {},
    });
  }

  it('accepts approve vote', () => {
    const state = electionState();
    const result = dispatch(state, {
      type: 'vote',
      playerId: 'player-0',
      vote: 'approve',
    });
    expect(result.votes['player-0']).toBe('approve');
  });

  it('accepts block vote', () => {
    const state = electionState();
    const result = dispatch(state, {
      type: 'vote',
      playerId: 'player-0',
      vote: 'block',
    });
    expect(result.votes['player-0']).toBe('block');
  });

  it('rejects empty string vote', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, {
        type: 'vote',
        playerId: 'player-0',
        vote: '' as any,
      }),
    ).toThrow('Invalid vote value');
  });

  it('rejects null vote', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, {
        type: 'vote',
        playerId: 'player-0',
        vote: null as any,
      }),
    ).toThrow('Invalid vote value');
  });

  it('rejects undefined vote', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, {
        type: 'vote',
        playerId: 'player-0',
        vote: undefined as any,
      }),
    ).toThrow('Invalid vote value');
  });

  it('rejects numeric vote', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, {
        type: 'vote',
        playerId: 'player-0',
        vote: 1 as any,
      }),
    ).toThrow('Invalid vote value');
  });

  it('rejects typo vote value', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, {
        type: 'vote',
        playerId: 'player-0',
        vote: 'approv' as any,
      }),
    ).toThrow('Invalid vote value');
  });

  it('rejects object vote value', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, {
        type: 'vote',
        playerId: 'player-0',
        vote: { value: 'approve' } as any,
      }),
    ).toThrow('Invalid vote value');
  });
});
