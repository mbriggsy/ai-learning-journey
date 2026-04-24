/**
 * Coverage-reporter tests — Phase 3 Unit 10.
 *
 * Test scenarios mirror phase-3-harness-infra.md Unit 10 "Test scenarios".
 *
 * Insight 027 discipline: every absence assertion (zero-cell, empty
 * divergences, empty unfired list) is paired with a presence companion
 * (non-empty grid, non-empty fires, populated cells) so a silent bug
 * zeroing everything can't pass vacuously.
 */
import { describe, expect, it } from 'vitest'
import { ROW_DISPLAY_LABELS, type CoverageReport, type FreePlayBudget } from './types'
import type { FireRecord, InfoGap, ParsedScenario } from './scenario-detector'
import {
  type CoverageReportInput,
  type SelfReport,
  buildCoverageReport,
  renderCoverageMd,
} from './coverage-reporter'

// --- Helpers ---------------------------------------------------------------

const FULL_GAP: InfoGap = {
  SERVER:       { column1Present: true, column2Present: true },
  ACTOR:        { column1Present: true, column2Present: true },
  TARGET:       { column1Present: true, column2Present: true },
  OTHER_ALIVE:  { column1Present: true, column2Present: true },
  SPECTATOR:    { column1Present: true, column2Present: true },
  DISCONNECTED: { column1Present: true, column2Present: true },
  BOARD:        { column1Present: true, column2Present: true },
}

const DRAW_ONLY_GAP: InfoGap = {
  ...FULL_GAP,
  TARGET: { column1Present: false, column2Present: false },
}

const SERVER_ONLY_GAP: InfoGap = {
  SERVER:       { column1Present: true, column2Present: true },
  ACTOR:        { column1Present: false, column2Present: false },
  TARGET:       { column1Present: false, column2Present: false },
  OTHER_ALIVE:  { column1Present: false, column2Present: false },
  SPECTATOR:    { column1Present: false, column2Present: false },
  DISCONNECTED: { column1Present: false, column2Present: false },
  BOARD:        { column1Present: false, column2Present: false },
}

function scenario(
  id: string,
  opts: {
    readonly tier?: ParsedScenario['tier']
    readonly infoGap?: InfoGap
    readonly knownProductCall?: string
  } = {},
): ParsedScenario {
  return {
    id,
    description: '',
    tier: opts.tier ?? 'other',
    events: [],
    shape: 'strict',
    ...(opts.infoGap ? { infoGap: opts.infoGap } : {}),
    ...(opts.knownProductCall ? { knownProductCall: opts.knownProductCall } : {}),
  }
}

function fire(
  id: string,
  matched: FireRecord['matched'] = 'clean',
  extras: Partial<FireRecord> = {},
): FireRecord {
  return {
    scenarioId: id,
    firstEventIdx: 0,
    lastEventIdx: 0,
    nowMsRange: [0, 0],
    tier1: matched === 'no-fire' ? 'fail' : 'pass',
    tier2: matched === 'with-divergence' ? 'fail' : 'n/a',
    tier3: 'n/a',
    matched,
    ...extras,
  }
}

const FREE_PLAY: FreePlayBudget = {
  totalMs: 100_000,
  scriptedMs: 80_000,
  freePlayMs: 20_000,
  fraction: 0.2,
}

function makeInput(overrides: Partial<CoverageReportInput> = {}): CoverageReportInput {
  return {
    catalog: [],
    fires: [],
    freePlay: FREE_PLAY,
    ...overrides,
  }
}

// --- buildCoverageReport ---------------------------------------------------

describe('buildCoverageReport — primary ≥50 gate (PRD §8.2)', () => {
  it('50 fires, every scenario has full info-gap → passes primary AND secondary', () => {
    const catalog: ParsedScenario[] = []
    const fires: FireRecord[] = []
    for (let i = 0; i < 50; i++) {
      const id = `SCN-X-${String(i).padStart(3, '0')}`
      catalog.push(scenario(id, { infoGap: FULL_GAP }))
      fires.push(fire(id))
    }

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(50)
    expect(report.zeroCellCount).toBe(0)
    expect(report.passed).toBe(true)
    // Presence companion: grid actually populated.
    expect(report.gridCells.SERVER.column1).toBe(50)
    expect(report.gridCells.BOARD.column2).toBe(50)
  })

  it('48 fires with full info-gap → primary fails even though zeroCellCount === 0', () => {
    const catalog: ParsedScenario[] = []
    const fires: FireRecord[] = []
    for (let i = 0; i < 48; i++) {
      const id = `SCN-X-${i}`
      catalog.push(scenario(id, { infoGap: FULL_GAP }))
      fires.push(fire(id))
    }

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(48)
    expect(report.zeroCellCount).toBe(0)
    expect(report.passed).toBe(false)
  })
})

describe('buildCoverageReport — secondary no-zero-cell gate (phase-3 B5)', () => {
  it('80 fires all SERVER-only → primary passes but secondary fails', () => {
    const catalog: ParsedScenario[] = []
    const fires: FireRecord[] = []
    for (let i = 0; i < 80; i++) {
      const id = `SCN-X-${i}`
      catalog.push(scenario(id, { infoGap: SERVER_ONLY_GAP }))
      fires.push(fire(id))
    }

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(80)
    // SERVER col1 + SERVER col2 populated; 6 other rows × 2 cols = 12 zero.
    expect(report.zeroCellCount).toBe(12)
    expect(report.passed).toBe(false)
    // Presence companion: the populated cell actually has every fire.
    expect(report.gridCells.SERVER.column1).toBe(80)
    expect(report.gridCells.SERVER.column2).toBe(80)
  })

  it('fires without info-gap do NOT credit any cell (only firedCount)', () => {
    const catalog = [
      scenario('SCN-A'),
      scenario('SCN-B'),
    ]
    const fires = [fire('SCN-A'), fire('SCN-B')]

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(2)
    // All 14 cells zero — no info-gap means no credit.
    expect(report.zeroCellCount).toBe(14)
    expect(report.passed).toBe(false)
    expect(report.gridCells.SERVER.scenarioIds).toEqual([])
  })
})

describe('buildCoverageReport — tri-state matched + uniqueness', () => {
  it('dedups fires by scenarioId (one scenario fires multiple times → counted once)', () => {
    const catalog = [scenario('SCN-A', { infoGap: FULL_GAP })]
    const fires = [
      fire('SCN-A', 'clean'),
      fire('SCN-A', 'clean', { firstEventIdx: 5, lastEventIdx: 7 }),
      fire('SCN-A', 'clean', { firstEventIdx: 12, lastEventIdx: 14 }),
    ]

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(1)
    expect(report.gridCells.SERVER.column1).toBe(1)
    expect(report.gridCells.SERVER.scenarioIds).toEqual(['SCN-A'])
  })

  it('counts clean + with-divergence toward firedCount; excludes no-fire (phase-3 B4 / D9.1)', () => {
    const catalog = [
      scenario('SCN-CLEAN', { infoGap: FULL_GAP }),
      scenario('SCN-DIV',   { infoGap: FULL_GAP }),
      scenario('SCN-MISS',  { infoGap: FULL_GAP }),
    ]
    const fires = [
      fire('SCN-CLEAN', 'clean'),
      fire('SCN-DIV', 'with-divergence', { tier2: 'fail', divergenceNotes: ['oracle drift'] }),
      fire('SCN-MISS', 'no-fire'),
    ]

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(2) // clean + with-divergence
    // Presence companion: no-fire is NOT silently counted.
    const firedSet = new Set(report.gridCells.SERVER.scenarioIds)
    expect(firedSet.has('SCN-CLEAN')).toBe(true)
    expect(firedSet.has('SCN-DIV')).toBe(true)
    expect(firedSet.has('SCN-MISS')).toBe(false)
  })

  it('with-divergence fire still credits info-gap cells (grid does not drop it)', () => {
    const catalog = [scenario('SCN-DIV', { infoGap: FULL_GAP })]
    const fires = [
      fire('SCN-DIV', 'with-divergence', {
        tier2: 'fail',
        divergenceNotes: ['spectator.myHand projection drift'],
      }),
    ]

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(1)
    expect(report.gridCells.SPECTATOR.column1).toBe(1)
    expect(report.gridCells.SPECTATOR.column2).toBe(1)
  })
})

describe('buildCoverageReport — known product calls (phase-1 D4 suppression)', () => {
  it('known-product-call fires appear in knownProductCalls, NOT in firedCount', () => {
    const catalog = [
      scenario('SCN-A', { infoGap: FULL_GAP }),
      scenario('SCN-KPC', { infoGap: FULL_GAP, knownProductCall: 'E2E-ISSUE-123' }),
    ]
    const fires = [fire('SCN-A'), fire('SCN-KPC')]

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(1)
    expect(report.knownProductCalls).toEqual(['SCN-KPC'])
    // Presence companion: SCN-A IS counted.
    expect(report.gridCells.SERVER.scenarioIds).toContain('SCN-A')
    // Absence companion: SCN-KPC is NOT credited in the grid.
    expect(report.gridCells.SERVER.scenarioIds).not.toContain('SCN-KPC')
  })
})

describe('buildCoverageReport — partial-vantage info-gap (draw scenarios)', () => {
  it('draw-only scenarios with TARGET=N/A produce zero TARGET fires', () => {
    const catalog: ParsedScenario[] = []
    const fires: FireRecord[] = []
    for (let i = 0; i < 10; i++) {
      const id = `SCN-DRAW-${i}`
      catalog.push(scenario(id, { infoGap: DRAW_ONLY_GAP }))
      fires.push(fire(id))
    }

    const report = buildCoverageReport(makeInput({ catalog, fires }))

    expect(report.firedCount).toBe(10)
    // TARGET column both columns zero (N/A for a draw).
    expect(report.gridCells.TARGET.column1).toBe(0)
    expect(report.gridCells.TARGET.column2).toBe(0)
    // Presence companion: other rows ARE populated (so draw fires aren't invisible).
    expect(report.gridCells.SERVER.column1).toBe(10)
    expect(report.gridCells.ACTOR.column1).toBe(10)
    // zeroCellCount picks up TARGET × 2 columns.
    expect(report.zeroCellCount).toBe(2)
  })
})

describe('buildCoverageReport — divergences (self vs detector)', () => {
  it('self-report without detector match → self-without-detector divergence', () => {
    const catalog = [scenario('SCN-A', { infoGap: FULL_GAP })]
    const fires: FireRecord[] = []
    const selfReports: SelfReport[] = [
      { scenarioId: 'SCN-GHOST', seatId: 'seat0', atNowMs: 1234 },
    ]

    const report = buildCoverageReport(makeInput({ catalog, fires, selfReports }))

    const selfWithout = report.divergences.filter((d) => d.kind === 'self-without-detector')
    expect(selfWithout).toHaveLength(1)
    expect(selfWithout[0]!.scenarioId).toBe('SCN-GHOST')
    // Presence companion: divergences array is not silently empty.
    expect(report.divergences.length).toBeGreaterThan(0)
  })

  it('detector match without self-report → detector-without-self divergence', () => {
    const catalog = [scenario('SCN-A', { infoGap: FULL_GAP })]
    const fires = [fire('SCN-A', 'clean')]
    const selfReports: SelfReport[] = [] // seat forgot to self-report

    const report = buildCoverageReport(makeInput({ catalog, fires, selfReports }))

    const detectorWithout = report.divergences.filter((d) => d.kind === 'detector-without-self')
    expect(detectorWithout).toHaveLength(1)
    expect(detectorWithout[0]!.scenarioId).toBe('SCN-A')
  })

  it('matched self-report + fire → no cross-divergence (presence companion: div array can be non-zero elsewhere)', () => {
    const catalog = [scenario('SCN-A', { infoGap: FULL_GAP })]
    const fires = [fire('SCN-A', 'clean')]
    const selfReports: SelfReport[] = [{ scenarioId: 'SCN-A', seatId: 'seat0', atNowMs: 1 }]

    const report = buildCoverageReport(makeInput({ catalog, fires, selfReports }))

    const cross = report.divergences.filter(
      (d) => d.kind === 'self-without-detector' || d.kind === 'detector-without-self',
    )
    expect(cross).toHaveLength(0)
    // Presence companion (insight 027): report was actually built on non-empty input.
    expect(report.firedCount).toBe(1)
  })

  it('authored column-1-vs-2 divergences pass through', () => {
    const report = buildCoverageReport(
      makeInput({
        columnDivergences: [
          { scenarioId: 'SCN-X', notes: 'Column 1 cites projection.ts:42; Column 2 says otherwise.' },
        ],
      }),
    )
    const cd = report.divergences.filter((d) => d.kind === 'column-1-vs-2')
    expect(cd).toHaveLength(1)
    expect(cd[0]!.scenarioId).toBe('SCN-X')
  })
})

describe('buildCoverageReport — viewports + free-play accounting', () => {
  it('passes through firedByViewport from input', () => {
    const report = buildCoverageReport(
      makeInput({
        firedByViewport: {
          '390x844': ['SCN-A', 'SCN-B'],
          '768x1024': ['SCN-C'],
        },
      }),
    )
    expect(report.firedByViewport['390x844']).toEqual(['SCN-A', 'SCN-B'])
    expect(report.firedByViewport['768x1024']).toEqual(['SCN-C'])
  })

  it('passes through freePlayAccounting verbatim', () => {
    const report = buildCoverageReport(makeInput())
    expect(report.freePlayAccounting).toEqual(FREE_PLAY)
  })
})

// --- renderCoverageMd ------------------------------------------------------

describe('renderCoverageMd — summary banner', () => {
  it('PASS verdict when passed=true', () => {
    const report: CoverageReport = {
      firedCount: 55,
      threshold: 50,
      gridCells: fullGridOfOnes(),
      zeroCellCount: 0,
      passed: true,
      firedByViewport: {},
      freePlayAccounting: FREE_PLAY,
      divergences: [],
      knownProductCalls: [],
    }

    const md = renderCoverageMd(report)
    expect(md).toContain('Fired: 55 / target: 50')
    expect(md).toContain('PASS')
    // Presence companion: no leakage of fail-only text.
    expect(md).not.toContain('UNDER-COVERED')
  })

  it('UNDER-COVERED verdict enumerates failing gate(s)', () => {
    const report: CoverageReport = {
      firedCount: 30,
      threshold: 50,
      gridCells: emptyGrid(),
      zeroCellCount: 14,
      passed: false,
      firedByViewport: {},
      freePlayAccounting: FREE_PLAY,
      divergences: [],
      knownProductCalls: [],
    }

    const md = renderCoverageMd(report)
    expect(md).toContain('UNDER-COVERED')
    expect(md).toContain('primary (≥50) failed: 30')
    expect(md).toContain('secondary (no-zero-cell) failed: 14/14 zero')
  })
})

describe('renderCoverageMd — 7×2 grid + D5 column labels (regression test)', () => {
  it('emits display labels character-for-character equal to phase-1 D5', () => {
    const report: CoverageReport = {
      firedCount: 0,
      threshold: 50,
      gridCells: emptyGrid(),
      zeroCellCount: 14,
      passed: false,
      firedByViewport: {},
      freePlayAccounting: FREE_PLAY,
      divergences: [],
      knownProductCalls: [],
    }
    const md = renderCoverageMd(report)

    // Column labels exact (phase-1 D5).
    expect(md).toContain('| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see | Scenarios |')
    // Every ViewerRole's display label appears verbatim.
    expect(md).toContain(`| ${ROW_DISPLAY_LABELS.SERVER} |`)
    expect(md).toContain(`| ${ROW_DISPLAY_LABELS.ACTOR} |`)
    expect(md).toContain(`| ${ROW_DISPLAY_LABELS.TARGET} |`)
    expect(md).toContain(`| ${ROW_DISPLAY_LABELS.OTHER_ALIVE} |`)
    expect(md).toContain(`| ${ROW_DISPLAY_LABELS.SPECTATOR} |`)
    expect(md).toContain(`| ${ROW_DISPLAY_LABELS.DISCONNECTED} |`)
    expect(md).toContain(`| ${ROW_DISPLAY_LABELS.BOARD} |`)
  })

  it('highlights zero cells in bold', () => {
    const report: CoverageReport = {
      firedCount: 10,
      threshold: 50,
      gridCells: {
        ...emptyGrid(),
        SERVER: { column1: 10, column2: 10, scenarioIds: ['SCN-X'] },
      },
      zeroCellCount: 12,
      passed: false,
      firedByViewport: {},
      freePlayAccounting: FREE_PLAY,
      divergences: [],
      knownProductCalls: [],
    }
    const md = renderCoverageMd(report)
    // Zero cells rendered as **0**, non-zero as plain numeric.
    expect(md).toContain('**0**')
    // Presence companion: the non-zero cell IS plain, not bolded.
    expect(md).toMatch(/\|\s*10\s*\|\s*10\s*\|\s*SCN-X/)
  })
})

describe('renderCoverageMd — fired / unfired / divergence sections', () => {
  it('lists fired scenarios with matched state; groups unfired by tier', () => {
    const catalog = [
      scenario('SCN-CLEAN', { tier: 'axis-11', infoGap: FULL_GAP }),
      scenario('SCN-MISS-A', { tier: 'axis-13' }),
      scenario('SCN-MISS-B', { tier: 'other' }),
    ]
    const fires = [
      fire('SCN-CLEAN', 'clean'),
      fire('SCN-MISS-A', 'no-fire'),
      fire('SCN-MISS-B', 'no-fire'),
    ]
    const report = buildCoverageReport(makeInput({ catalog, fires }))

    const md = renderCoverageMd(report, fires, catalog)

    expect(md).toContain('## Fired scenarios')
    expect(md).toContain('| SCN-CLEAN | clean |')
    expect(md).toContain('## Unfired scenarios')
    expect(md).toContain('### axis-13 (1)')
    expect(md).toContain('### other (1)')
    expect(md).toContain('- SCN-MISS-A')
    expect(md).toContain('- SCN-MISS-B')
  })

  it('renders with-divergence fires under oracle-divergences section with notes', () => {
    const catalog = [scenario('SCN-DIV', { tier: 'axis-11', infoGap: FULL_GAP })]
    const fires = [
      fire('SCN-DIV', 'with-divergence', {
        tier2: 'fail',
        divergenceNotes: ['spectator.myHand mismatch at stateVersion 17'],
      }),
    ]
    const report = buildCoverageReport(makeInput({ catalog, fires }))
    const md = renderCoverageMd(report, fires, catalog)

    expect(md).toContain('### Tier-2/3 oracle divergences')
    expect(md).toContain('- **SCN-DIV**')
    expect(md).toContain('spectator.myHand mismatch at stateVersion 17')
  })

  it('empty runs show explicit placeholder text (absence assertions are explicit)', () => {
    const report = buildCoverageReport(makeInput())
    const md = renderCoverageMd(report, [], [])
    // Presence of explicit placeholders — not silent empty sections.
    expect(md).toContain('_No fires this run._')
    expect(md).toContain('_None this run._')
  })
})

describe('renderCoverageMd — known product calls section', () => {
  it('surfaces knownProductCalls with D4-suppression note', () => {
    const catalog = [
      scenario('SCN-A', { infoGap: FULL_GAP }),
      scenario('SCN-KPC', { infoGap: FULL_GAP, knownProductCall: 'E2E-ISSUE-123' }),
    ]
    const fires = [fire('SCN-A'), fire('SCN-KPC')]
    const report = buildCoverageReport(makeInput({ catalog, fires }))

    const md = renderCoverageMd(report, fires, catalog)
    expect(md).toContain('## Known product calls')
    expect(md).toContain('- SCN-KPC')
    expect(md).toContain('phase-1 D4')
  })
})

// --- ROW_DISPLAY_LABELS regression (phase-3-harness-infra Unit 10 verification) ---

describe('ROW_DISPLAY_LABELS — phase-1 D5 literal prose regression', () => {
  it('every ViewerRole maps to its D5 literal display label', () => {
    // Character-for-character regression per phase-1 D5. Catches drift in
    // either direction (if the D5 label changes, update both here and D5).
    expect(ROW_DISPLAY_LABELS.SERVER).toBe('SERVER')
    expect(ROW_DISPLAY_LABELS.ACTOR).toBe('ACTOR')
    expect(ROW_DISPLAY_LABELS.TARGET).toBe('TARGET')
    expect(ROW_DISPLAY_LABELS.OTHER_ALIVE).toBe('OTHER (alive)')
    expect(ROW_DISPLAY_LABELS.SPECTATOR).toBe('SPECTATOR (eliminated, connected)')
    expect(ROW_DISPLAY_LABELS.DISCONNECTED).toBe('DISCONNECTED (alive, not connected)')
    expect(ROW_DISPLAY_LABELS.BOARD).toBe('BOARD')
  })
})

// --- helpers for render tests ----------------------------------------------

function emptyGrid(): CoverageReport['gridCells'] {
  return {
    SERVER:       { column1: 0, column2: 0, scenarioIds: [] },
    ACTOR:        { column1: 0, column2: 0, scenarioIds: [] },
    TARGET:       { column1: 0, column2: 0, scenarioIds: [] },
    OTHER_ALIVE:  { column1: 0, column2: 0, scenarioIds: [] },
    SPECTATOR:    { column1: 0, column2: 0, scenarioIds: [] },
    DISCONNECTED: { column1: 0, column2: 0, scenarioIds: [] },
    BOARD:        { column1: 0, column2: 0, scenarioIds: [] },
  }
}

function fullGridOfOnes(): CoverageReport['gridCells'] {
  return {
    SERVER:       { column1: 1, column2: 1, scenarioIds: ['SCN-X'] },
    ACTOR:        { column1: 1, column2: 1, scenarioIds: ['SCN-X'] },
    TARGET:       { column1: 1, column2: 1, scenarioIds: ['SCN-X'] },
    OTHER_ALIVE:  { column1: 1, column2: 1, scenarioIds: ['SCN-X'] },
    SPECTATOR:    { column1: 1, column2: 1, scenarioIds: ['SCN-X'] },
    DISCONNECTED: { column1: 1, column2: 1, scenarioIds: ['SCN-X'] },
    BOARD:        { column1: 1, column2: 1, scenarioIds: ['SCN-X'] },
  }
}
