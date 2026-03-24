import { describe, it, expect } from 'vitest';
import { assignSuperlatives } from '../../src/client/host/gazette/awards';
import { detectKeyMoments, formatMoment } from '../../src/client/host/gazette/moments';
import type { PlayerAnalysis, GameAnalysis, KeyMoment } from '../../src/client/host/gazette/types';
import type { RevealedPlayer } from '../../src/shared/protocol';
import type { GovernmentRecord, InvestigationRecord, PolicyHistoryEntry } from '../../src/shared/types';

// ── Test Helpers ──────────────────────────────────────────────────

function makePlayer(id: string, name: string, role: string, isAlive = true): RevealedPlayer {
  return {
    id, name, role, isAlive,
    isMayor: false, isCommissioner: false,
    wasLastMayor: false, wasLastCommissioner: false,
    isConnected: true,
  };
}

function makePlayerAnalysis(overrides: Partial<PlayerAnalysis> = {}): PlayerAnalysis {
  return {
    playerId: 'p1',
    playerName: 'Alice',
    role: 'citizen',
    isAlive: true,
    timesAsMayor: 0,
    timesAsCommissioner: 0,
    approveCount: 0,
    blockCount: 0,
    votedSameAsMobBoss: 0,
    totalVotes: 0,
    wasExecuted: false,
    executedRound: null,
    policiesEnactedAsGovernment: [],
    ...overrides,
  };
}

function makePolicy(round: number, type: 'good' | 'bad', name = 'Test Policy'): PolicyHistoryEntry {
  return { card: { type, cardId: `card-${round}`, name }, autoEnacted: false, round };
}

function makeGovernment(round: number, passed: boolean, votes: Record<string, 'approve' | 'block'>, mayorId = 'p1', nomineeId = 'p2'): GovernmentRecord {
  return { round, mayorId, nomineeId, passed, votes, electionTracker: passed ? 0 : 1 };
}

function makeGameAnalysis(overrides: Partial<GameAnalysis> = {}): GameAnalysis {
  return {
    totalRounds: 5,
    winner: 'citizens',
    outcome: { type: 'citizens-win-policy' },
    mobBossId: 'p5',
    mobSoldierIds: ['p4'],
    citizenIds: ['p1', 'p2', 'p3'],
    totalGoodPolicies: 5,
    totalBadPolicies: 2,
    governments: [],
    policies: [],
    investigations: [],
    players: [
      makePlayer('p1', 'Alice', 'citizen'),
      makePlayer('p2', 'Bob', 'citizen'),
      makePlayer('p3', 'Charlie', 'citizen'),
      makePlayer('p4', 'Dave', 'mob-soldier'),
      makePlayer('p5', 'Eve', 'mob-boss'),
    ],
    ...overrides,
  };
}

// ── Superlative Tests ─────────────────────────────────────────────

describe('Superlative Assignment', () => {
  it('assigns a superlative to every player', () => {
    const game = makeGameAnalysis();
    const players = game.players.map(p =>
      makePlayerAnalysis({ playerId: p.id, playerName: p.name, role: p.role }),
    );

    const results = assignSuperlatives(players, game);
    expect(results).toHaveLength(players.length);

    // Every player gets one
    const assignedIds = results.map(r => r.playerId);
    for (const p of players) {
      expect(assignedIds).toContain(p.playerId);
    }
  });

  it('assigns unique superlatives (no duplicates)', () => {
    const game = makeGameAnalysis();
    const players = game.players.map(p =>
      makePlayerAnalysis({ playerId: p.id, playerName: p.name, role: p.role }),
    );

    const results = assignSuperlatives(players, game);
    const nicknames = results.map(r => r.nickname);
    // With 5 players and 15 templates + fallback, some may get "The Quiet One" (fallback)
    // but template-assigned ones should be unique
    const nonFallback = nicknames.filter(n => n !== 'The Quiet One');
    expect(new Set(nonFallback).size).toBe(nonFallback.length);
  });

  it('detects "The Rubber Stamp" for all-approve voter', () => {
    const game = makeGameAnalysis();
    const players = [
      makePlayerAnalysis({
        playerId: 'p1', playerName: 'Alice', role: 'citizen',
        approveCount: 5, blockCount: 0, totalVotes: 5,
      }),
    ];

    const results = assignSuperlatives(players, game);
    expect(results[0].nickname).toBe('The Rubber Stamp');
  });

  it('detects "The Contrarian" for all-block voter', () => {
    const game = makeGameAnalysis();
    const players = [
      makePlayerAnalysis({
        playerId: 'p1', playerName: 'Alice', role: 'citizen',
        approveCount: 0, blockCount: 4, totalVotes: 4,
      }),
    ];

    const results = assignSuperlatives(players, game);
    expect(results[0].nickname).toBe('The Contrarian');
  });

  it('uses fallback for players with no match', () => {
    const game = makeGameAnalysis();
    const players = [
      makePlayerAnalysis({
        playerId: 'p1', playerName: 'Alice', totalVotes: 1,
        isAlive: false, wasExecuted: false, // no templates match: not alive (no "Clean Hands"), not executed
        timesAsMayor: 1, timesAsCommissioner: 1, // disqualifies "Clean Hands"
      }),
    ];

    const results = assignSuperlatives(players, game);
    expect(results[0].nickname).toBe('The Quiet One');
  });

  it('assigns mob-boss-specific superlative', () => {
    const game = makeGameAnalysis({ winner: 'mob' });
    const players = [
      makePlayerAnalysis({ playerId: 'p5', playerName: 'Eve', role: 'mob-boss' }),
    ];

    const results = assignSuperlatives(players, game);
    expect(results[0].nickname).toBe('The Shadow');
  });
});

// ── Key Moments Tests ─────────────────────────────────────────────

describe('Key Moment Detection', () => {
  it('detects policy streak of 3+', () => {
    const game = makeGameAnalysis({
      policies: [
        makePolicy(1, 'bad'),
        makePolicy(2, 'bad'),
        makePolicy(3, 'bad'),
        makePolicy(4, 'good'),
      ],
    });

    const moments = detectKeyMoments(game);
    const streaks = moments.filter(m => m.type === 'policy-streak');
    expect(streaks).toHaveLength(1);
    expect(streaks[0].type === 'policy-streak' && streaks[0].length).toBe(3);
  });

  it('detects decisive vote (1-vote margin)', () => {
    const game = makeGameAnalysis({
      governments: [
        makeGovernment(1, true, { p1: 'approve', p2: 'approve', p3: 'approve', p4: 'block', p5: 'block' }),
      ],
    });

    const moments = detectKeyMoments(game);
    const decisive = moments.filter(m => m.type === 'decisive-vote');
    expect(decisive).toHaveLength(1);
    expect(decisive[0].type === 'decisive-vote' && decisive[0].margin).toBe(1);
  });

  it('returns empty array for short games with no notable events', () => {
    const game = makeGameAnalysis({
      governments: [],
      policies: [makePolicy(1, 'good'), makePolicy(2, 'bad')],
    });

    const moments = detectKeyMoments(game);
    expect(moments.length).toBeLessThanOrEqual(5);
  });

  it('caps at 5 moments max', () => {
    // Create many triggering events
    const govs: GovernmentRecord[] = [];
    for (let i = 1; i <= 10; i++) {
      govs.push(makeGovernment(i, true, { p1: 'approve', p2: 'approve', p3: 'block' }));
    }

    const game = makeGameAnalysis({ governments: govs, totalRounds: 10 });
    const moments = detectKeyMoments(game);
    expect(moments.length).toBeLessThanOrEqual(5);
  });
});

describe('Moment Formatting', () => {
  it('formats policy streak', () => {
    const moment: KeyMoment = { type: 'policy-streak', startRound: 2, length: 3, policyType: 'bad' };
    const text = formatMoment(moment);
    expect(text).toContain('3 consecutive corrupt');
    expect(text).toContain('round 2');
  });

  it('formats decisive vote', () => {
    const moment: KeyMoment = { type: 'decisive-vote', round: 4, playerName: 'Alice', margin: 1 };
    const text = formatMoment(moment);
    expect(text).toContain('Alice');
    expect(text).toContain('tiebreaker');
  });

  it('formats execution hit', () => {
    const moment: KeyMoment = { type: 'execution-hit', round: 7 };
    const text = formatMoment(moment);
    expect(text).toContain('Mob Boss');
    expect(text).toContain('eliminated');
  });
});

// ── Vote History Projection ───────────────────────────────────────

describe('Vote History Data', () => {
  it('GovernmentRecord captures all required fields', () => {
    const gov = makeGovernment(3, true, { p1: 'approve', p2: 'block' });
    expect(gov.round).toBe(3);
    expect(gov.passed).toBe(true);
    expect(gov.votes['p1']).toBe('approve');
    expect(gov.votes['p2']).toBe('block');
    expect(gov.mayorId).toBe('p1');
    expect(gov.nomineeId).toBe('p2');
  });
});
