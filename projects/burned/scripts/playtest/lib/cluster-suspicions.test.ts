/**
 * Phase 5 Unit 2 — `cluster-suspicions` tests.
 *
 * Mirrors phase-5-triage-agents.md Unit 2 "Test scenarios".
 *
 * Insight 027 discipline: every "absence" assertion (no role-drift seed,
 * no candidateDuplicate, no free-play seed for unrelated entries) is
 * paired with a "presence" companion (a different bucket DID emit) so a
 * silent bug zeroing all output can't pass vacuously.
 */
import { describe, expect, it } from 'vitest'

import {
  type ClusterSuspicionsInput,
  type SeatEntries,
  clusterSuspicions,
} from './cluster-suspicions'
import {
  ROW_DISPLAY_LABELS,
  type CoverageReport,
  type ConnectionEvent,
  type FreePlayBudget,
  type GodEvent,
  type ViewerRole,
} from './types'
import type {
  FireRecord,
  ParsedScenario,
} from './scenario-detector'
import type {
  LogEntry,
  ScenarioFireEntry,
  SuspicionEntry,
  UiSpecDivergenceEntry,
  VibeCheckEntry,
} from './log-schema'

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const T0 = '2026-04-24T18:00:00.000Z'
const T0_MS = Date.parse(T0)

function ts(offsetMs: number): string {
  return new Date(T0_MS + offsetMs).toISOString()
}

function fire(
  id: string,
  matched: FireRecord['matched'] = 'with-divergence',
  extras: Partial<FireRecord> = {},
): FireRecord {
  return {
    scenarioId: id,
    firstEventIdx: 0,
    lastEventIdx: 0,
    nowMsRange: [T0_MS + 1000, T0_MS + 2000],
    tier1: 'pass',
    tier2: matched === 'with-divergence' ? 'fail' : 'n/a',
    tier3: 'n/a',
    matched,
    ...extras,
  }
}

function scenario(
  id: string,
  knownProductCall?: string,
): ParsedScenario {
  return {
    id,
    description: id,
    title: id,
    tier: 'other',
    events: [],
    shape: 'strict',
    ...(knownProductCall ? { knownProductCall } : {}),
  }
}

const EMPTY_FREE_PLAY: FreePlayBudget = {
  totalMs: 1_000_000,
  scriptedMs: 800_000,
  freePlayMs: 200_000,
  fraction: 0.2,
}

const EMPTY_GRID: CoverageReport['gridCells'] = {
  SERVER:       { column1: 0, column2: 0, scenarioIds: [] },
  ACTOR:        { column1: 0, column2: 0, scenarioIds: [] },
  TARGET:       { column1: 0, column2: 0, scenarioIds: [] },
  OTHER_ALIVE:  { column1: 0, column2: 0, scenarioIds: [] },
  SPECTATOR:    { column1: 0, column2: 0, scenarioIds: [] },
  DISCONNECTED: { column1: 0, column2: 0, scenarioIds: [] },
  BOARD:        { column1: 0, column2: 0, scenarioIds: [] },
}

function emptyCoverage(
  divergences: CoverageReport['divergences'] = [],
): CoverageReport {
  return {
    firedCount: 0,
    threshold: 50,
    gridCells: EMPTY_GRID,
    zeroCellCount: 14,
    passed: false,
    firedByViewport: {},
    freePlayAccounting: EMPTY_FREE_PLAY,
    divergences,
    knownProductCalls: [],
  }
}

function seat(
  seatId: string,
  entries: readonly LogEntry[],
): SeatEntries {
  return {
    seatId,
    logPath: `seats/${seatId}.log.md`,
    suspicionPath: `suspicions/${seatId}.suspicions.md`,
    entries,
  }
}

function fireEntry(scenarioId: string, atMs: number): ScenarioFireEntry {
  return {
    entryType: 'scenario-fire',
    scenarioId,
    seat: 'seat-x',
    seatName: 'Seat X',
    timestamp: ts(atMs),
    triggeringAction: { type: 'play-card' },
    preObservation: {},
    postObservation: {},
  }
}

function suspicionEntry(
  related: string | null,
  atMs: number,
  severity: SuspicionEntry['severity'] = 'medium',
): SuspicionEntry {
  return {
    entryType: 'suspicion',
    seat: 'seat-x',
    seatName: 'Seat X',
    timestamp: ts(atMs),
    severity,
    relatedScenario: related,
    questionsTried: [],
  }
}

function vibeEntry(
  related: string | null,
  atMs: number,
  felt: VibeCheckEntry['feltLikeArcher'],
): VibeCheckEntry {
  return {
    entryType: 'vibe-check',
    seat: 'seat-x',
    seatName: 'Seat X',
    timestamp: ts(atMs),
    relatedScenario: related,
    feltLikeArcher: felt,
    vibeCheckPrompt: 'Did this feel like an Archer beat?',
    proseRationale: 'banner arrived 500ms after the card flip',
  }
}

function uiSpecEntry(
  related: string | null,
  atMs: number,
  myRole: ViewerRole,
): UiSpecDivergenceEntry {
  return {
    entryType: 'ui-spec-divergence',
    seat: 'seat-x',
    seatName: 'Seat X',
    timestamp: ts(atMs),
    myRoleLabel: ROW_DISPLAY_LABELS[myRole],
    relatedScenario: related,
    column2Expected: 'banner shows the named card',
    observedOnPhone: 'banner is empty',
    screenshotHash: 'sha256:abc123',
  }
}

function godEvent(
  atMs: number,
  opts: {
    actorId?: string
    targetIdInEvent?: string
    projections?: GodEvent['projections']
    stateVersion?: number
  } = {},
): GodEvent {
  return {
    type: 'god-event',
    action: { type: 'play-card', playerId: opts.actorId ?? 'seat-z' },
    events: opts.targetIdInEvent
      ? [{ type: 'card-played', targetId: opts.targetIdInEvent }]
      : [{ type: 'card-played', cardType: 'attack' }],
    stateVersion: opts.stateVersion ?? 1,
    nowMs: T0_MS + atMs,
    projections: opts.projections ?? {},
    boardView: { phase: 'playing', stateVersion: opts.stateVersion ?? 1 },
  }
}

function emptyInput(over: Partial<ClusterSuspicionsInput> = {}): ClusterSuspicionsInput {
  return {
    seats: [],
    fires: [],
    coverage: emptyCoverage(),
    godEvents: [],
    connections: [],
    catalog: [],
    ...over,
  }
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('clusterSuspicions — scripted-scenario clustering (rule 1)', () => {
  it('emits one seed per distinct (scenario, time-window) pair', () => {
    // 5 suspicions: A at t=0, A at t=10s, B at t=120s, B at t=125s, A at t=200s.
    // → 3 buckets: (A, [0,10s]), (B, [120s,125s]), (A, [200s]).
    const seats = [
      seat('seat-1', [
        suspicionEntry('SCN-A', 0),
        suspicionEntry('SCN-A', 10_000),
        suspicionEntry('SCN-B', 120_000),
        suspicionEntry('SCN-B', 125_000),
        suspicionEntry('SCN-A', 200_000),
      ]),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(3)
    expect(new Set(scripted.flatMap(s => s.scenarioIds))).toEqual(
      new Set(['SCN-A', 'SCN-B']),
    )
    // Presence companion (insight 027): every seed has at least one source signal.
    for (const s of scripted) {
      expect(s.sourceSignals.length).toBeGreaterThan(0)
    }
  })

  it('groups 3 same-scenario suspicions within 30s into one seed with 3 source signals', () => {
    const seats = [
      seat('seat-1', [
        suspicionEntry('SCN-A', 0),
        suspicionEntry('SCN-A', 5_000),
        suspicionEntry('SCN-A', 25_000),
      ]),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(1)
    expect(scripted[0]!.sourceSignals).toHaveLength(3)
    expect(scripted[0]!.scenarioIds).toEqual(['SCN-A'])
    expect(scripted[0]!.timeWindow.fromMs).toBe(T0_MS)
    expect(scripted[0]!.timeWindow.toMs).toBe(T0_MS + 25_000)
  })

  it('escalates suspicionSeverityHint to highest member of the cluster', () => {
    const seats = [
      seat('seat-1', [
        suspicionEntry('SCN-A', 0, 'low'),
        suspicionEntry('SCN-A', 1_000, 'high'),
        suspicionEntry('SCN-A', 2_000, 'medium'),
      ]),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(1)
    expect(scripted[0]!.suspicionSeverityHint).toBe('high')
  })

  it('aggregates seatsInvolved across multi-seat clusters', () => {
    const seats = [
      seat('seat-1', [suspicionEntry('SCN-A', 0)]),
      seat('seat-2', [suspicionEntry('SCN-A', 5_000)]),
      seat('seat-3', [suspicionEntry('SCN-A', 10_000)]),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(1)
    expect(scripted[0]!.seatsInvolved).toEqual(['seat-1', 'seat-2', 'seat-3'])
  })
})

describe('clusterSuspicions — vibe-check clustering (rule 3 / D11)', () => {
  it('emits seeds for `no` and `unsure`, ignores `yes`', () => {
    const seats = [
      seat('seat-1', [
        vibeEntry('SCN-A', 0, 'no'),
        vibeEntry('SCN-B', 1_000, 'no'),
        vibeEntry('SCN-C', 2_000, 'unsure'),
        vibeEntry('SCN-D', 3_000, 'yes'),
      ]),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const vibe = seeds.filter(s => s.kind === 'vibe-check')
    expect(vibe).toHaveLength(3)
    const ids = new Set(vibe.flatMap(s => s.scenarioIds))
    expect(ids).toEqual(new Set(['SCN-A', 'SCN-B', 'SCN-C']))
    // Presence companion: no seed for SCN-D.
    expect(seeds.find(s => s.scenarioIds.includes('SCN-D'))).toBeUndefined()
  })

  it('merges same-scenario vibe-checks across seats within 60s', () => {
    const seats = [
      seat('seat-1', [vibeEntry('SCN-A', 0, 'no')]),
      seat('seat-2', [vibeEntry('SCN-A', 30_000, 'no')]),
      seat('seat-3', [vibeEntry('SCN-A', 90_000, 'no')]), // outside 60s
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const vibe = seeds.filter(s => s.kind === 'vibe-check')
    expect(vibe).toHaveLength(2)
    const merged = vibe.find(s => s.seatsInvolved.length === 2)
    expect(merged).toBeDefined()
    expect(merged!.seatsInvolved).toEqual(['seat-1', 'seat-2'])
  })

  it('escalates severity hint when cluster has any `no` answer', () => {
    const seats = [
      seat('seat-1', [vibeEntry('SCN-A', 0, 'unsure')]),
      seat('seat-2', [vibeEntry('SCN-A', 1_000, 'no')]),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const vibe = seeds.filter(s => s.kind === 'vibe-check')
    expect(vibe).toHaveLength(1)
    expect(vibe[0]!.suspicionSeverityHint).toBe('medium')
  })
})

describe('clusterSuspicions — ui-spec-divergence clustering (rule 4 / D13 / Ruling A)', () => {
  it('emits one seed per UiSpecDivergenceEntry with pointer-only columnContext', () => {
    const seats = [
      seat('seat-1', [uiSpecEntry('SCN-A', 1_000, 'TARGET')]),
    ]
    const godEvents = [
      godEvent(500),                     // line 1
      godEvent(900, { stateVersion: 2 }), // line 2 — closest preceding
      godEvent(2_000, { stateVersion: 3 }),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats, godEvents }))
    const ui = seeds.filter(s => s.kind === 'ui-spec-divergence')
    expect(ui).toHaveLength(1)
    expect(ui[0]!.columnContext).toBeDefined()
    expect(ui[0]!.columnContext!.scenarioId).toBe('SCN-A')
    expect(ui[0]!.columnContext!.rowLabel).toBe('TARGET')
    expect(ui[0]!.columnContext!.agentObservation).toBe(
      'banner shows the named card',
    )
    // Pointer-only — line 2 (godEvent index 1, 1-indexed = 2).
    expect(ui[0]!.columnContext!.projectionSnapshotRef).toBe('events.jsonl#L2')
    // Presence companion (Ruling A): no pre-extracted Column 1 value field.
    expect(Object.keys(ui[0]!.columnContext!).sort()).toEqual([
      'agentObservation',
      'projectionSnapshotRef',
      'rowLabel',
      'scenarioId',
    ])
  })
})

describe('clusterSuspicions — role-drift clustering (rule 5 / D15 / Ruling B)', () => {
  it('emits drift seed when self=TARGET but action.playerId === seatId infers ACTOR', () => {
    const seats = [
      seat('seat-1', [uiSpecEntry('SCN-A', 1_000, 'TARGET')]),
    ]
    const godEvents = [
      godEvent(900, { actorId: 'seat-1', stateVersion: 5 }),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats, godEvents }))
    const drift = seeds.filter(s => s.kind === 'role-drift')
    expect(drift).toHaveLength(1)
    expect(drift[0]!.roleDrift).toEqual({
      selfLabel: 'TARGET',
      detectorLabel: 'ACTOR',
      atStateVersion: 5,
    })
    // Presence companion: ui-spec-divergence seed also emitted (multi-kind, D18 / I6).
    expect(seeds.filter(s => s.kind === 'ui-spec-divergence')).toHaveLength(1)
  })

  it('emits drift seed with detectorLabel=UNKNOWN when no god-event in window (M1)', () => {
    const seats = [
      seat('seat-1', [uiSpecEntry('SCN-A', 60_000, 'TARGET')]),
    ]
    // god-event at t=0, ms 60s → outside ROLE_DRIFT_WINDOW_MS (5s).
    const godEvents = [godEvent(0, { actorId: 'seat-1' })]
    const seeds = clusterSuspicions(emptyInput({ seats, godEvents }))
    const drift = seeds.filter(s => s.kind === 'role-drift')
    expect(drift).toHaveLength(1)
    expect(drift[0]!.roleDrift!.detectorLabel).toBe('UNKNOWN')
    expect(drift[0]!.roleDrift!.atStateVersion).toBe(-1)
  })

  it('does NOT emit drift seed when detector is ambiguous in-window (OTHER_ALIVE / SPECTATOR)', () => {
    const seats = [
      seat('seat-1', [uiSpecEntry('SCN-A', 1_000, 'OTHER_ALIVE')]),
    ]
    // god-event in window, but actor is seat-99 and no targetId, no isConnected
    // hint → detector returns UNKNOWN by ambiguity. Per Ruling B, skip.
    const godEvents = [godEvent(900, { actorId: 'seat-99', stateVersion: 1 })]
    const seeds = clusterSuspicions(emptyInput({ seats, godEvents }))
    expect(seeds.filter(s => s.kind === 'role-drift')).toHaveLength(0)
    // Presence companion: ui-spec-divergence still emitted.
    expect(seeds.filter(s => s.kind === 'ui-spec-divergence')).toHaveLength(1)
  })

  it('does NOT emit drift seed when self matches detector (no drift)', () => {
    const seats = [
      seat('seat-1', [uiSpecEntry('SCN-A', 1_000, 'ACTOR')]),
    ]
    const godEvents = [
      godEvent(900, { actorId: 'seat-1', stateVersion: 1 }),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats, godEvents }))
    expect(seeds.filter(s => s.kind === 'role-drift')).toHaveLength(0)
    expect(seeds.filter(s => s.kind === 'ui-spec-divergence')).toHaveLength(1)
  })
})

describe('clusterSuspicions — with-divergence-fire (rule 6 / D17)', () => {
  it('emits one seed per FireRecord matched=with-divergence with failedTier resolved', () => {
    const fires: FireRecord[] = [
      fire('SCN-A', 'with-divergence', { tier2: 'fail' }),
      fire('SCN-B', 'with-divergence', { tier2: 'pass', tier3: 'fail' }),
      fire('SCN-C', 'clean'), // not with-divergence — must NOT emit
    ]
    const seeds = clusterSuspicions(emptyInput({ fires }))
    const wd = seeds.filter(s => s.kind === 'with-divergence-fire')
    expect(wd).toHaveLength(2)
    const a = wd.find(s => s.scenarioIds[0] === 'SCN-A')
    const b = wd.find(s => s.scenarioIds[0] === 'SCN-B')
    expect(a!.fireDivergence!.failedTier).toBe('projectionAsserts')
    expect(b!.fireDivergence!.failedTier).toBe('connectionEvents')
    // Presence companion: no with-divergence seed for SCN-C (clean).
    expect(wd.find(s => s.scenarioIds.includes('SCN-C'))).toBeUndefined()
  })

  it('attaches adjacent seat entries (same scenario, same seat, within 30s) as sourceSignals', () => {
    const seats = [
      seat('seat-1', [
        fireEntry('SCN-A', 1_500),
        suspicionEntry('SCN-A', 2_500),
      ]),
    ]
    const fires: FireRecord[] = [
      fire('SCN-A', 'with-divergence', { seatId: 'seat-1' }),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats, fires }))
    const wd = seeds.filter(s => s.kind === 'with-divergence-fire')
    expect(wd).toHaveLength(1)
    const sources = wd[0]!.sourceSignals
    // 1 fire-record + 2 adjacent (seat-log + suspicion).
    expect(sources).toHaveLength(3)
    expect(sources[0]!.source).toBe('fire-record')
    expect(sources.some(s => s.source === 'seat-log')).toBe(true)
    expect(sources.some(s => s.source === 'suspicion')).toBe(true)
  })
})

describe('clusterSuspicions — free-play clustering (rule 2 / D12 / C4)', () => {
  it('emits free-play seed for relatedScenario=null suspicion with fingerprint from nearest card-played', () => {
    const seats = [
      seat('seat-1', [suspicionEntry(null, 5_000)]),
    ]
    const godEvents = [
      godEvent(2_000), // card-played, cardType: 'attack'
    ]
    const seeds = clusterSuspicions(emptyInput({ seats, godEvents }))
    const fp = seeds.filter(s => s.kind === 'free-play')
    expect(fp).toHaveLength(1)
    expect(fp[0]!.scenarioIds).toEqual([])
    expect(fp[0]!.freePlayFingerprint).toEqual({
      cardType: 'attack',
      eventType: 'card-played',
      seatRole: 'ACTOR',
    })
  })
})

describe('clusterSuspicions — coverage divergences (rule 7)', () => {
  it('emits coverage-divergence seeds for self/detector mismatch only (column-1-vs-2 maps to ui-spec)', () => {
    const coverage = emptyCoverage([
      { kind: 'self-without-detector', scenarioId: 'SCN-A', notes: 'no fire' },
      { kind: 'detector-without-self', scenarioId: 'SCN-B', notes: 'silent fire' },
      { kind: 'column-1-vs-2', scenarioId: 'SCN-C', notes: 'col mismatch' },
    ])
    const seeds = clusterSuspicions(emptyInput({ coverage }))
    const cd = seeds.filter(s => s.kind === 'coverage-divergence')
    expect(cd).toHaveLength(2)
    expect(new Set(cd.flatMap(s => s.scenarioIds))).toEqual(
      new Set(['SCN-A', 'SCN-B']),
    )
    // Presence companion: SCN-C did NOT become a coverage-divergence seed.
    expect(cd.find(s => s.scenarioIds.includes('SCN-C'))).toBeUndefined()
  })
})

describe('clusterSuspicions — known-product-call duplicate detection (rule 8 / Ruling C / I3)', () => {
  it('populates candidateDuplicate from catalog known-product-call tag and extracts E-NN id', () => {
    const seats = [
      seat('seat-1', [suspicionEntry('SCN-A', 0)]),
    ]
    const catalog = [
      scenario('SCN-A', '⏸ BLOCKED — see E-01 in E2E-ISSUE-LIST.md for context'),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats, catalog }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(1)
    expect(scripted[0]!.candidateDuplicate).toEqual({
      kind: 'KNOWN-PRODUCT-CALL',
      id: 'SCN-A',
      linkedE2EIssueId: 'E-01',
    })
  })

  it('does NOT populate candidateDuplicate from E2E-ISSUE-LIST keyword overlap on seat-log content', () => {
    // I1 / Ruling C: untrusted data must not drive matching decisions.
    // The seat says "this looks like E-01" but the catalog has no tag, so
    // the seed remains undisambiguated.
    const seats = [
      seat('seat-1', [
        // questionsTried carries arbitrary prose; even if it mentions E-01,
        // matching MUST NOT key off it.
        {
          ...suspicionEntry('SCN-A', 0),
          questionsTried: ['feels like E-01 from the issue list'],
        } as SuspicionEntry,
      ]),
    ]
    const catalog = [scenario('SCN-A')] // no knownProductCall tag
    const seeds = clusterSuspicions(emptyInput({ seats, catalog }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(1)
    expect(scripted[0]!.candidateDuplicate).toBeUndefined()
  })

  it('leaves linkedE2EIssueId unset when the tag has no recognized ID format', () => {
    const seats = [
      seat('seat-1', [suspicionEntry('SCN-A', 0)]),
    ]
    const catalog = [scenario('SCN-A', 'deliberate by-design behaviour, no tracker entry')]
    const seeds = clusterSuspicions(emptyInput({ seats, catalog }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(1)
    expect(scripted[0]!.candidateDuplicate?.id).toBe('SCN-A')
    expect(scripted[0]!.candidateDuplicate?.linkedE2EIssueId).toBeUndefined()
  })
})

describe('clusterSuspicions — connections filter (rule 11 / phase-3 C8)', () => {
  it('ignores orchestrator-driven connection events for cluster decisions', () => {
    // v1 doesn't emit dedicated disconnect seeds, but the filter is exercised:
    // including an orchestrator-driven event must not change output.
    const connectionsNatural: ConnectionEvent[] = [
      {
        seatId: 'seat-1',
        transition: 'disconnect',
        atStateVersion: 1,
        atNowMs: T0_MS,
        reason: 'natural',
      },
    ]
    const connectionsOrchestrator: ConnectionEvent[] = [
      ...connectionsNatural,
      {
        seatId: 'seat-1',
        transition: 'reconnect',
        atStateVersion: 2,
        atNowMs: T0_MS + 1_000,
        reason: 'orchestrator-driven',
      },
    ]
    const seedsA = clusterSuspicions(
      emptyInput({ connections: connectionsNatural }),
    )
    const seedsB = clusterSuspicions(
      emptyInput({ connections: connectionsOrchestrator }),
    )
    expect(seedsA).toEqual(seedsB)
  })
})

describe('clusterSuspicions — seedId determinism (rule 9)', () => {
  it('assigns NNN-<slug> ids in temporal order', () => {
    const seats = [
      seat('seat-1', [
        suspicionEntry('SCN-B', 100),
        suspicionEntry('SCN-A', 50),
        suspicionEntry('SCN-C', 200),
      ]),
    ]
    const seeds = clusterSuspicions(emptyInput({ seats }))
    const scripted = seeds.filter(s => s.kind === 'scripted-scenario')
    expect(scripted).toHaveLength(3)
    expect(scripted[0]!.seedId).toBe('001-scn-a')
    expect(scripted[1]!.seedId).toBe('002-scn-b')
    expect(scripted[2]!.seedId).toBe('003-scn-c')
  })

  it('every SeedKind has a happy-path emission across the test suite', () => {
    // Compose a single input that exercises all 7 seed kinds at once.
    const projWithDisconnect: GodEvent['projections'] = {
      'seat-2': { myPlayerId: 'seat-2', myHand: [], isConnected: false } as never,
    }
    const seats = [
      seat('seat-1', [
        // scripted-scenario
        suspicionEntry('SCN-A', 0),
        // free-play (relatedScenario null, with preceding card-played at t=2s)
        suspicionEntry(null, 3_000),
        // vibe-check `no`
        vibeEntry('SCN-A', 1_000, 'no'),
        // ui-spec-divergence + role-drift (self=TARGET, detector=ACTOR)
        uiSpecEntry('SCN-A', 5_000, 'TARGET'),
      ]),
      seat('seat-2', [
        // role-drift via DISCONNECTED inference
        uiSpecEntry('SCN-A', 6_000, 'OTHER_ALIVE'),
      ]),
    ]
    const godEvents = [
      godEvent(2_000),                                        // card-played → free-play fp
      godEvent(4_500, { actorId: 'seat-1', stateVersion: 2 }), // ACTOR detector for seat-1
      godEvent(5_900, {
        actorId: 'seat-3',
        stateVersion: 3,
        projections: projWithDisconnect,
      }),
    ]
    const fires: FireRecord[] = [
      fire('SCN-A', 'with-divergence', {
        seatId: 'seat-1',
        nowMsRange: [T0_MS + 4_000, T0_MS + 5_000],
      }),
    ]
    const coverage = emptyCoverage([
      { kind: 'detector-without-self', scenarioId: 'SCN-Z', notes: 'silent' },
    ])
    const catalog = [
      scenario('SCN-A'),
      scenario('SCN-Z', '⏸ BLOCKED — see C-05'),
    ]
    const seeds = clusterSuspicions(
      emptyInput({ seats, godEvents, fires, coverage, catalog }),
    )

    const kinds = new Set(seeds.map(s => s.kind))
    expect(kinds).toContain('scripted-scenario')
    expect(kinds).toContain('free-play')
    expect(kinds).toContain('vibe-check')
    expect(kinds).toContain('ui-spec-divergence')
    expect(kinds).toContain('role-drift')
    expect(kinds).toContain('with-divergence-fire')
    expect(kinds).toContain('coverage-divergence')
    // Coverage-divergence on SCN-Z should carry the catalog tag duplicate.
    const cd = seeds.find(s => s.kind === 'coverage-divergence')
    expect(cd!.candidateDuplicate?.id).toBe('SCN-Z')
    expect(cd!.candidateDuplicate?.linkedE2EIssueId).toBe('C-05')
  })
})
