/**
 * Phase 5 Unit 6 — `triage-pipeline.ts`.
 *
 * Single entry point for the post-session triage work, called after
 * Phase 4's isolation audit during session teardown. Bundles:
 *
 *   1. cluster suspicions -> IssueSeed[] (Unit 2),
 *   2. emit triage launch specs (Unit 3) — the actual subagent dispatch
 *      lives in the Claude Code conversation that owns the harness;
 *      Phase 6 wires the dispatch step,
 *   3. build issues/INDEX.md from any issue files present (Unit 4).
 *
 * The orchestrator hook injection (`runPostSessionTriage`) calls
 * `runTriagePipeline` with the run-directory paths + isolation status,
 * and surfaces the result so `session.md`'s end block can record
 * triage counts (or skip reason).
 *
 * INSIGHT 022 quarantine: zero imports from `src/server` / `src/shared`.
 */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import {
  buildIssueIndex,
  type BuildIssueIndexResult,
} from './build-issue-index'
import {
  clusterSuspicions,
  type SeatEntries,
} from './cluster-suspicions'
import {
  buildTriageLaunchSpecs,
  emitTriageLaunchSpecs,
  loadDefaultTriageTemplate,
  type TriageLaunchSpec,
} from './triage-launcher'
import { parseSeatLog } from './log-parser'
import {
  detectFires,
  parseCatalog,
  type FireRecord,
  type ParsedScenario,
} from './scenario-detector'
import type {
  ConnectionEvent,
  CoverageReport,
  GodEvent,
  IssueSeed,
} from './types'

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export type TriageSkipReason = 'isolation-breach' | 'no-seeds' | 'audit-error'

export interface TriagePipelineInput {
  /** Absolute path to the run directory. */
  readonly runDir: string
  /** Path to the scenario catalog markdown. */
  readonly catalogPath: string
  /** Path to events.jsonl (god-event stream). */
  readonly eventsJsonlPath: string
  /** Path to connections.jsonl. */
  readonly connectionsJsonlPath: string
  /** Path to coverage.md (optional — when absent, an empty CoverageReport is used). */
  readonly coveragePath?: string
  /**
   * Phase 4 isolation-audit status. `'ISOLATION_BREACH'` -> skip triage;
   * `'OK'` -> run.
   */
  readonly isolationStatus: 'OK' | 'ISOLATION_BREACH'
  /** When true (default), emit triage launch specs to disk. */
  readonly emitSpecs?: boolean
}

export interface TriagePipelineResult {
  readonly skipped?: TriageSkipReason
  readonly seedCount: number
  readonly specCount: number
  readonly indexPath?: string
  readonly issueCount?: number
  readonly indexCounts?: BuildIssueIndexResult['counts']
  readonly seeds?: readonly IssueSeed[]
  readonly specs?: readonly TriageLaunchSpec[]
}

const SEATS_DIR = 'seats'
const SUSPICIONS_DIR = 'suspicions'
const ISSUES_DIR = 'issues'

export async function runTriagePipeline(
  input: TriagePipelineInput,
): Promise<TriagePipelineResult> {
  if (input.isolationStatus === 'ISOLATION_BREACH') {
    return { skipped: 'isolation-breach', seedCount: 0, specCount: 0 }
  }

  // Load catalog FIRST so we can pass valid scenarioIds into the seat-log
  // parser. The parser uses them to reject `scenario-fire` entries with
  // invented scenarioIds (lifecycle observations like SESSION-START,
  // GAME-START-OBSERVATION, etc.) at parse time — they never reach the
  // clusterer and never consume a triage agent spawn. Triage seeds
  // #001/#002/#003/#011/#018 caught five separate occurrences in one
  // session before this gate landed.
  const catalog = await loadCatalog(input.catalogPath)
  const validScenarioIds = new Set(catalog.map(s => s.id))

  const seats = await loadSeatEntries(input.runDir, validScenarioIds)
  if (seats.length === 0) {
    // No seats means no seat-driven signals; coverage divergences could
    // still produce seeds, but for v1 a zero-seat session is treated as
    // skip-triage. Phase 6 calibration may revisit if a coverage-only
    // run becomes useful.
    return { skipped: 'no-seeds', seedCount: 0, specCount: 0 }
  }
  const godEvents = await loadGodEvents(input.eventsJsonlPath)
  const connections = await loadConnections(input.connectionsJsonlPath)
  const coverage = await loadCoverageReport(input.coveragePath, catalog)
  const fires = await detectFiresSafe(
    input.catalogPath,
    input.eventsJsonlPath,
    input.connectionsJsonlPath,
  )

  const seeds = clusterSuspicions({
    seats,
    fires,
    coverage,
    godEvents,
    connections,
    catalog,
  })

  const issuesDir = path.join(input.runDir, ISSUES_DIR)
  const indexResult = await buildIssueIndex({ issuesDir })

  if (input.emitSpecs === false) {
    return {
      seedCount: seeds.length,
      specCount: 0,
      indexPath: indexResult.indexPath,
      issueCount: indexResult.counts.total,
      indexCounts: indexResult.counts,
      seeds,
    }
  }

  const template = await loadDefaultTriageTemplate(process.cwd())
  const specs = buildTriageLaunchSpecs({ seeds, runDir: input.runDir, template })
  await emitTriageLaunchSpecs({ seeds, runDir: input.runDir, template })

  return {
    seedCount: seeds.length,
    specCount: specs.length,
    indexPath: indexResult.indexPath,
    issueCount: indexResult.counts.total,
    indexCounts: indexResult.counts,
    seeds,
    specs,
  }
}

// -----------------------------------------------------------------------------
// Loaders
// -----------------------------------------------------------------------------

async function loadSeatEntries(
  runDir: string,
  validScenarioIds: ReadonlySet<string>,
): Promise<SeatEntries[]> {
  const seatsDir = path.join(runDir, SEATS_DIR)
  const suspicionsDir = path.join(runDir, SUSPICIONS_DIR)
  const seatLogFiles = await safeReaddir(seatsDir)
  const suspicionFiles = await safeReaddir(suspicionsDir)
  const seatIds = new Set<string>()
  for (const f of seatLogFiles) {
    const m = /^(seat-\d+)\.log\.md$/.exec(f)
    if (m) seatIds.add(m[1]!)
  }
  for (const f of suspicionFiles) {
    const m = /^(seat-\d+)\.suspicions\.md$/.exec(f)
    if (m) seatIds.add(m[1]!)
  }

  const parseOpts = { validScenarioIds }
  const out: SeatEntries[] = []
  for (const seatId of [...seatIds].sort()) {
    const logFile = `${seatId}.log.md`
    const suspicionFile = `${seatId}.suspicions.md`
    const logRel = path.posix.join(SEATS_DIR, logFile)
    const susRel = path.posix.join(SUSPICIONS_DIR, suspicionFile)
    const [logRes, susRes] = await Promise.all([
      seatLogFiles.includes(logFile)
        ? parseSeatLog(path.join(seatsDir, logFile), parseOpts)
        : Promise.resolve({ entries: [], errors: [], warnings: [] }),
      suspicionFiles.includes(suspicionFile)
        ? parseSeatLog(path.join(suspicionsDir, suspicionFile), parseOpts)
        : Promise.resolve({ entries: [], errors: [], warnings: [] }),
    ])
    out.push({
      seatId,
      logPath: logRel,
      suspicionPath: susRel,
      entries: [...logRes.entries, ...susRes.entries],
    })
  }
  return out
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

async function loadCatalog(catalogPath: string): Promise<readonly ParsedScenario[]> {
  try {
    const md = await readFile(catalogPath, 'utf8')
    return parseCatalog(md)
  } catch {
    return []
  }
}

async function loadGodEvents(eventsJsonlPath: string): Promise<readonly GodEvent[]> {
  try {
    const raw = await readFile(eventsJsonlPath, 'utf8')
    const out: GodEvent[] = []
    for (const line of raw.split(/\r?\n/)) {
      if (line.trim() === '') continue
      try {
        out.push(JSON.parse(line) as GodEvent)
      } catch {
        // Tolerate malformed line; cluster still runs on partial data.
      }
    }
    return out
  } catch {
    return []
  }
}

async function loadConnections(
  connectionsJsonlPath: string,
): Promise<readonly ConnectionEvent[]> {
  try {
    const raw = await readFile(connectionsJsonlPath, 'utf8')
    const out: ConnectionEvent[] = []
    for (const line of raw.split(/\r?\n/)) {
      if (line.trim() === '') continue
      try {
        out.push(JSON.parse(line) as ConnectionEvent)
      } catch {
        // Tolerate malformed line.
      }
    }
    return out
  } catch {
    return []
  }
}

async function loadCoverageReport(
  coveragePath: string | undefined,
  _catalog: readonly ParsedScenario[],
): Promise<CoverageReport> {
  // Phase 5 v1 doesn't parse coverage.md back to CoverageReport — Phase 3
  // emits the markdown but the upstream report shape is what callers
  // populated buildCoverageReport with. For pipeline integration we
  // accept an empty report; Phase 6 wires the orchestrator-side
  // CoverageReport pass-through directly into runTriagePipeline.
  void coveragePath
  return emptyCoverageReport()
}

function emptyCoverageReport(): CoverageReport {
  const cell = { column1: 0, column2: 0, scenarioIds: [] as string[] }
  return {
    firedCount: 0,
    threshold: 15,
    seriesTarget: 50,
    gridCells: {
      SERVER: { ...cell, scenarioIds: [] },
      ACTOR: { ...cell, scenarioIds: [] },
      TARGET: { ...cell, scenarioIds: [] },
      OTHER_ALIVE: { ...cell, scenarioIds: [] },
      SPECTATOR: { ...cell, scenarioIds: [] },
      DISCONNECTED: { ...cell, scenarioIds: [] },
      BOARD: { ...cell, scenarioIds: [] },
    },
    zeroCellCount: 14,
    passed: false,
    firedByViewport: {},
    freePlayAccounting: { totalMs: 0, freePlayMs: 0, scriptedMs: 0, fraction: 0 },
    divergences: [],
    knownProductCalls: [],
  }
}

async function detectFiresSafe(
  catalogPath: string,
  eventsJsonlPath: string,
  connectionsJsonlPath: string,
): Promise<readonly FireRecord[]> {
  try {
    return await detectFires(catalogPath, eventsJsonlPath, connectionsJsonlPath, [])
  } catch {
    return []
  }
}
