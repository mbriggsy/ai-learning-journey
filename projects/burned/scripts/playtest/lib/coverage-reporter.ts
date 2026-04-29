/**
 * Coverage reporter — renders `coverage.md` as the phase-1 D5 /
 * phase-3 D13 7×2 info-gap grid with PRD §8.2 absolute ≥50 gate AND
 * phase-3 B5 / D13.1 secondary no-zero-cell gate.
 *
 * Phase 3 Unit 10. Pure consumer of Unit 9's `FireRecord[]` + catalog's
 * per-scenario `infoGap` (phase-1 D5).
 *
 * QUARANTINE (insight 022): no imports from `src/server`. Types are local.
 *
 * INSIGHT 027: absence assertions (zero-cell, unfired-scenarios) pair with
 * presence companions in the test file.
 */
import type { CoverageReport, FreePlayBudget, ViewerRole } from './types'
import { ROW_DISPLAY_LABELS } from './types'
import type { FireRecord, InfoGap, ParsedScenario } from './scenario-detector'

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/**
 * Seat self-report — "I believe I hit scenario X." Phase 4 populates this
 * from seat agents' suspicion logs. Unit 10 compares self-reports vs
 * FireRecords to surface D5 divergences (oracle-is-SUT mitigation).
 */
export interface SelfReport {
  readonly scenarioId: string
  readonly seatId: string
  /** Unix ms when the seat claimed it fired. */
  readonly atNowMs: number
}

export interface CoverageReportInput {
  readonly catalog: readonly ParsedScenario[]
  readonly fires: readonly FireRecord[]
  readonly freePlay: FreePlayBudget
  /** Phase 4 populates. Empty in Phase 3. */
  readonly selfReports?: readonly SelfReport[]
  /** Phase 5 orchestrator populates from viewport rotation. Empty in Phase 3. */
  readonly firedByViewport?: Readonly<Record<string, readonly string[]>>
  /** Authored at lock time (SCENARIOS.md §Column divergences). Empty in Phase 3. */
  readonly columnDivergences?: ReadonlyArray<{
    readonly scenarioId: string
    readonly notes: string
  }>
  /**
   * Distinct-fired threshold for the primary gate. Default 50 (PRD §8.2,
   * revised 2026-04-23). Calibration / mini-catalog runs override via
   * `Config.coverageThreshold` so the gate is reachable on a 6-scenario
   * fixture. Must be a positive integer when provided.
   */
  readonly coverageThreshold?: number
}

/**
 * PRD §8.2 default. Exported so callers (and tests) can reference the same
 * literal without re-declaring it.
 */
export const DEFAULT_COVERAGE_THRESHOLD = 50

const ALL_ROLES: readonly ViewerRole[] = [
  'SERVER',
  'ACTOR',
  'TARGET',
  'OTHER_ALIVE',
  'SPECTATOR',
  'DISCONNECTED',
  'BOARD',
]

// -----------------------------------------------------------------------------
// buildCoverageReport — pure; no I/O
// -----------------------------------------------------------------------------

export function buildCoverageReport(input: CoverageReportInput): CoverageReport {
  const { catalog, fires, freePlay } = input
  const selfReports = input.selfReports ?? []
  const firedByViewportIn = input.firedByViewport ?? {}
  const columnDivergences = input.columnDivergences ?? []
  const threshold = input.coverageThreshold ?? DEFAULT_COVERAGE_THRESHOLD

  const byId = new Map<string, ParsedScenario>()
  for (const s of catalog) byId.set(s.id, s)

  const knownProductCallIds = new Set<string>()
  for (const s of catalog) {
    if (s.knownProductCall) knownProductCallIds.add(s.id)
  }

  // Dedup fires by scenarioId, exclude `no-fire`, exclude known-product-calls
  // (phase-1 D4: known-product-call fires surfaced separately, not counted
  // toward ≥50).
  const firedIds = new Set<string>()
  const firedKnownProductCalls = new Set<string>()
  for (const fr of fires) {
    if (fr.matched === 'no-fire') continue
    if (knownProductCallIds.has(fr.scenarioId)) {
      firedKnownProductCalls.add(fr.scenarioId)
      continue
    }
    firedIds.add(fr.scenarioId)
  }

  const firedCount = firedIds.size

  // Build the 7×2 grid. Each fired scenario credits row R × col C iff
  // its infoGap[R].column{1,2}Present === true. Scenarios without an
  // info-gap table contribute nothing to the grid (but still count
  // toward firedCount — the grid gate is secondary).
  const gridCells: Record<
    ViewerRole,
    { column1: number; column2: number; scenarioIds: string[] }
  > = {
    SERVER:       { column1: 0, column2: 0, scenarioIds: [] },
    ACTOR:        { column1: 0, column2: 0, scenarioIds: [] },
    TARGET:       { column1: 0, column2: 0, scenarioIds: [] },
    OTHER_ALIVE:  { column1: 0, column2: 0, scenarioIds: [] },
    SPECTATOR:    { column1: 0, column2: 0, scenarioIds: [] },
    DISCONNECTED: { column1: 0, column2: 0, scenarioIds: [] },
    BOARD:        { column1: 0, column2: 0, scenarioIds: [] },
  }

  const firedIdsSorted = [...firedIds].sort()
  for (const id of firedIdsSorted) {
    const scenario = byId.get(id)
    const ig: InfoGap | undefined = scenario?.infoGap
    if (!ig) continue
    for (const role of ALL_ROLES) {
      const cell = ig[role]
      let touched = false
      if (cell.column1Present) {
        gridCells[role].column1 += 1
        touched = true
      }
      if (cell.column2Present) {
        gridCells[role].column2 += 1
        touched = true
      }
      if (touched) gridCells[role].scenarioIds.push(id)
    }
  }

  let zeroCellCount = 0
  for (const role of ALL_ROLES) {
    if (gridCells[role].column1 === 0) zeroCellCount += 1
    if (gridCells[role].column2 === 0) zeroCellCount += 1
  }

  const passed = firedCount >= threshold && zeroCellCount === 0

  // Self-vs-detector divergences (phase-1 D5 "break the oracle-is-SUT
  // tautology" — D9.1 / B4).
  const divergences: Array<{
    kind: 'self-without-detector' | 'detector-without-self' | 'column-1-vs-2'
    scenarioId: string
    notes: string
  }> = []
  const detectorIds = firedIds
  const selfIds = new Set(selfReports.map((r) => r.scenarioId))
  for (const r of selfReports) {
    if (!detectorIds.has(r.scenarioId)) {
      divergences.push({
        kind: 'self-without-detector',
        scenarioId: r.scenarioId,
        notes: `Seat ${r.seatId} self-reported at nowMs=${r.atNowMs} but no FireRecord matched.`,
      })
    }
  }
  for (const id of [...detectorIds].sort()) {
    if (!selfIds.has(id)) {
      divergences.push({
        kind: 'detector-without-self',
        scenarioId: id,
        notes: `FireRecord matched but no seat self-reported.`,
      })
    }
  }
  for (const cd of columnDivergences) {
    divergences.push({ kind: 'column-1-vs-2', scenarioId: cd.scenarioId, notes: cd.notes })
  }

  // firedByViewport — clone each viewport's list (CoverageReport type wants
  // mutable string[] per-viewport value).
  const firedByViewport: Record<string, string[]> = {}
  for (const [vp, ids] of Object.entries(firedByViewportIn)) {
    firedByViewport[vp] = [...ids]
  }

  return {
    firedCount,
    threshold,
    gridCells,
    zeroCellCount,
    passed,
    firedByViewport,
    freePlayAccounting: freePlay,
    divergences,
    knownProductCalls: [...firedKnownProductCalls].sort(),
  }
}

// -----------------------------------------------------------------------------
// renderCoverageMd — pure; returns the coverage.md text
// -----------------------------------------------------------------------------

export function renderCoverageMd(
  report: CoverageReport,
  fires: readonly FireRecord[] = [],
  catalog: readonly ParsedScenario[] = [],
): string {
  const out: string[] = []

  // Section 1 — summary banner.
  const withDivergenceCount = fires.filter((f) => f.matched === 'with-divergence').length
  const verdict = renderVerdict(report)
  out.push('# Coverage report')
  out.push('')
  out.push(`**Fired: ${report.firedCount} / target: ${report.threshold}** — ${verdict}`)
  out.push(`Zero cells: ${report.zeroCellCount} / 14`)
  out.push(`With-divergence fires: ${withDivergenceCount}`)
  out.push('')

  // Section 2 — 7×2 info-gap grid.
  out.push('## 7×2 info-gap grid')
  out.push('')
  out.push(
    '| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see | Scenarios |',
  )
  out.push('|---|---|---|---|')
  for (const role of ALL_ROLES) {
    const cell = report.gridCells[role]
    const c1 = cell.column1 === 0 ? '**0**' : String(cell.column1)
    const c2 = cell.column2 === 0 ? '**0**' : String(cell.column2)
    const ids = cell.scenarioIds.length === 0 ? '—' : cell.scenarioIds.join(', ')
    out.push(`| ${ROW_DISPLAY_LABELS[role]} | ${c1} | ${c2} | ${ids} |`)
  }
  out.push('')

  // Section 3 — fired by viewport.
  out.push('## Fired by viewport')
  out.push('')
  const viewports = Object.keys(report.firedByViewport).sort()
  if (viewports.length === 0) {
    out.push('_No viewport rotation recorded for this session._')
  } else {
    for (const vp of viewports) {
      const list = report.firedByViewport[vp] ?? []
      out.push(`- **${vp}** (${list.length}): ${list.length === 0 ? '—' : list.join(', ')}`)
    }
  }
  out.push('')

  // Section 4 — free-play accounting.
  out.push('## Free-play accounting')
  out.push('')
  out.push(
    `- Total wallclock: ${report.freePlayAccounting.totalMs} ms (${
      report.freePlayAccounting.scriptedMs
    } scripted + ${report.freePlayAccounting.freePlayMs} free-play)`,
  )
  out.push(
    `- Free-play fraction: ${(report.freePlayAccounting.fraction * 100).toFixed(1)}%`,
  )
  out.push('')

  // Section 5 — fired scenarios (clean + with-divergence).
  out.push('## Fired scenarios')
  out.push('')
  const firedPositive = fires.filter(
    (f) => f.matched === 'clean' || f.matched === 'with-divergence',
  )
  if (firedPositive.length === 0) {
    out.push('_No fires this run._')
  } else {
    out.push('| Scenario | Matched | Tier 1 | Tier 2 | Tier 3 |')
    out.push('|---|---|---|---|---|')
    for (const f of firedPositive) {
      out.push(
        `| ${f.scenarioId} | ${f.matched} | ${f.tier1} | ${f.tier2} | ${f.tier3} |`,
      )
    }
  }
  out.push('')

  // Section 6 — unfired scenarios grouped by tier.
  out.push('## Unfired scenarios')
  out.push('')
  const noFireIds = new Set(
    fires.filter((f) => f.matched === 'no-fire').map((f) => f.scenarioId),
  )
  if (noFireIds.size === 0) {
    out.push('_Every catalog scenario fired (or was absent from the detector run)._')
  } else {
    const byTier: Record<ParsedScenario['tier'], string[]> = {
      'axis-11': [],
      'axis-13': [],
      other: [],
    }
    for (const id of [...noFireIds].sort()) {
      const scenario = catalog.find((s) => s.id === id)
      byTier[scenario?.tier ?? 'other'].push(id)
    }
    for (const tier of ['axis-11', 'axis-13', 'other'] as const) {
      const ids = byTier[tier]
      if (ids.length === 0) continue
      out.push(`### ${tier} (${ids.length})`)
      for (const id of ids) out.push(`- ${id}`)
      out.push('')
    }
  }

  // Section 7 — divergence list.
  out.push('## Divergences')
  out.push('')
  out.push('### Tier-2/3 oracle divergences')
  const oracleDivergences = fires.filter((f) => f.matched === 'with-divergence')
  if (oracleDivergences.length === 0) {
    out.push('_None this run._')
  } else {
    for (const f of oracleDivergences) {
      out.push(`- **${f.scenarioId}** (tier2=${f.tier2}, tier3=${f.tier3})`)
      for (const note of f.divergenceNotes ?? []) {
        out.push(`  - ${note}`)
      }
    }
  }
  out.push('')
  out.push('### Self-vs-detector divergences')
  const crossDivergences = report.divergences.filter(
    (d) => d.kind === 'self-without-detector' || d.kind === 'detector-without-self',
  )
  if (crossDivergences.length === 0) {
    out.push('_None this run._')
  } else {
    for (const d of crossDivergences) {
      out.push(`- **${d.scenarioId}** (${d.kind}): ${d.notes}`)
    }
  }
  out.push('')
  out.push('### Column-1-vs-Column-2 (lock-time findings)')
  const columnDivs = report.divergences.filter((d) => d.kind === 'column-1-vs-2')
  if (columnDivs.length === 0) {
    out.push('_None._')
  } else {
    for (const d of columnDivs) {
      out.push(`- **${d.scenarioId}**: ${d.notes}`)
    }
  }
  out.push('')

  // Section 8 — known product calls.
  out.push('## Known product calls')
  out.push('')
  if (report.knownProductCalls.length === 0) {
    out.push('_None fired this run._')
  } else {
    out.push(
      '_These scenarios fired but are tagged as known product calls; suppressed from the ≥50 gate per phase-1 D4._',
    )
    for (const id of report.knownProductCalls) out.push(`- ${id}`)
  }
  out.push('')

  return out.join('\n')
}

function renderVerdict(report: CoverageReport): string {
  if (report.passed) return 'PASS'
  const fails: string[] = []
  if (report.firedCount < report.threshold) {
    fails.push(`primary (≥${report.threshold}) failed: ${report.firedCount}`)
  }
  if (report.zeroCellCount > 0) {
    fails.push(`secondary (no-zero-cell) failed: ${report.zeroCellCount}/14 zero`)
  }
  return `UNDER-COVERED — ${fails.join('; ')}`
}
