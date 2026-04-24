/**
 * Phase 5 Unit 2 — `cluster-suspicions.ts`.
 *
 * Pure deterministic clustering of raw playtest signals into typed
 * `IssueSeed[]`. The signal-to-noise gate between a session's raw output
 * and the per-seed triage agent spawn (Unit 3).
 *
 * Inputs:
 *   - parsed seat-log entries (all four `entryType` values per phase-4 D5);
 *   - parsed suspicion-file entries (same schema, different file);
 *   - FireRecord[] from phase-3 Unit 9 (incl. `with-divergence` records);
 *   - CoverageReport from phase-3 Unit 10 (divergences + knownProductCalls);
 *   - parsed god-event stream (cumulative — see insight 028; flattened
 *     before consumption);
 *   - ConnectionEvent[] (filtered by `reason: 'natural'` per phase-3 C8);
 *   - ParsedScenario[] (catalog with `knownProductCall` tags per phase-1 D4);
 *   - optional minimal E2E-ISSUE-LIST entries (CONTEXT-ONLY per Ruling C / I3).
 *
 * Output: `IssueSeed[]` — every seed carries a `kind: SeedKind` and the
 * minimum context the triage agent needs to start diagnosing.
 *
 * QUARANTINE (insight 022): no imports from `src/server` or `src/shared`.
 *
 * INSIGHT 028 — events.jsonl is cumulative (each line carries the FULL
 * event history through that broadcast, not a delta). Callers must
 * `flattenEvents(godEvents)` before passing the flat array in. The
 * clusterer assumes `flatEvents` is already delta-flattened.
 *
 * INSIGHT 029 — types in this module reference fields the upstream
 * Phase 3/4 modules export. Adding fields here demands an audit of
 * producer scope; no field is consumed that isn't on a public type.
 */
import type {
  ConnectionEvent,
  GodEvent,
  IssueSeed,
  SeedKind,
  SignalRef,
} from './types'
import type {
  FireRecord,
  GodEventForMatch,
  ParsedScenario,
} from './scenario-detector'
import type {
  LogEntry,
  UiSpecDivergenceEntry,
  VibeCheckEntry,
} from './log-schema'
import type { CoverageReport } from './types'

// -----------------------------------------------------------------------------
// Public input contract
// -----------------------------------------------------------------------------

/**
 * Per-seat entry bundle. The orchestrator collects these by walking the
 * run dir's `seats/` and `suspicions/` subdirectories.
 *
 * `entries` is the union of seat-log entries (`scenario-fire`) and
 * suspicion entries (`suspicion`, `vibe-check`, `ui-spec-divergence`).
 * The clusterer disambiguates per-rule by `entryType`.
 */
export interface SeatEntries {
  readonly seatId: string
  /** Path relative to runDir for `seat-log` SignalRef construction. */
  readonly logPath: string
  /** Path relative to runDir for `suspicion` SignalRef construction. */
  readonly suspicionPath: string
  /** Combined entries from both files in chronological order (parser-ordered). */
  readonly entries: readonly LogEntry[]
}

/**
 * Minimal E2E-ISSUE-LIST projection — title + id + severity surfaced for
 * HUMAN-CONTEXT prose citation only (Ruling C / I3). The clusterer NEVER
 * keys matching decisions off this — keyword overlap is untrusted data
 * per phase-5 I1.
 */
export interface E2eIssueListEntry {
  readonly id: string                // e.g. 'E-01'
  readonly title: string
  readonly severity: 'P0' | 'P1' | 'P2'
}

export interface ClusterSuspicionsInput {
  readonly seats: readonly SeatEntries[]
  readonly fires: readonly FireRecord[]
  readonly coverage: CoverageReport
  /**
   * Cumulative god-event stream as parsed from `events.jsonl`. The
   * clusterer flattens internally per insight 028 — pass it raw.
   */
  readonly godEvents: readonly GodEvent[]
  /**
   * 1-indexed line number for each god-event in `events.jsonl`. When
   * absent, the clusterer assumes well-formed jsonl (line N = godEvent
   * index N-1) and emits `events.jsonl#L<godEventIdx+1>`. Provide
   * explicitly if blank/malformed lines were tolerated by the loader.
   */
  readonly godEventLineByIdx?: readonly number[]
  readonly connections: readonly ConnectionEvent[]
  readonly catalog: readonly ParsedScenario[]
  /** Repo-relative path used as the `path` field in coverage-divergence
   *  SignalRefs. Defaults to `'coverage.md'`. */
  readonly coveragePath?: string
  /** Optional minimal projection for prose citation only (Ruling C). */
  readonly e2eIssueList?: readonly E2eIssueListEntry[]
}

// -----------------------------------------------------------------------------
// Tunable cluster windows (rule 11 / I5).
// Phase 6 calibration may move these; centralized here for testability.
// -----------------------------------------------------------------------------

const SCRIPTED_WINDOW_MS = 30_000
const FREE_PLAY_WINDOW_MS = 60_000
const VIBE_CHECK_MERGE_WINDOW_MS = 60_000
const ROLE_DRIFT_WINDOW_MS = 5_000

// -----------------------------------------------------------------------------
// Role-label literals (mirror of ROW_DISPLAY_LABELS values for the role-drift
// detector heuristics; D15).
// -----------------------------------------------------------------------------

const ROLE_LABEL = {
  SERVER:       'SERVER',
  ACTOR:        'ACTOR',
  TARGET:       'TARGET',
  OTHER_ALIVE:  'OTHER (alive)',
  SPECTATOR:    'SPECTATOR (eliminated, connected)',
  DISCONNECTED: 'DISCONNECTED (alive, not connected)',
  BOARD:        'BOARD',
  UNKNOWN:      'UNKNOWN',
} as const

// -----------------------------------------------------------------------------
// Internal flattening helper (insight 028 — duplicated locally so callers
// don't need scenario-detector's helper visible).
// -----------------------------------------------------------------------------

function flattenInternal(godEvents: readonly GodEvent[]): GodEventForMatch[] {
  const flat: GodEventForMatch[] = []
  let priorLen = 0
  for (let g = 0; g < godEvents.length; g++) {
    const ge = godEvents[g]!
    const all = ge.events ?? []
    const newOnes = all.slice(priorLen)
    for (const ev of newOnes) {
      flat.push({
        godEventIdx: g,
        event: ev as Readonly<Record<string, unknown>>,
        action: ge.action,
        nowMs: ge.nowMs,
        projections: ge.projections,
        stateVersion: ge.stateVersion,
      })
    }
    priorLen = all.length
  }
  return flat
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function timestampToMs(iso: string): number {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) {
    throw new Error(`cluster-suspicions: invalid ISO-8601 timestamp: ${iso}`)
  }
  return ms
}

function eventsLineRef(godEventIdx: number, lineMap?: readonly number[]): string {
  const line = lineMap?.[godEventIdx] ?? godEventIdx + 1
  return `events.jsonl#L${line}`
}

/** Find the god-event whose `nowMs` is the largest value <= `entryMs`. */
function findPrecedingGodEventIdx(
  godEvents: readonly GodEvent[],
  entryMs: number,
): number | null {
  let bestIdx: number | null = null
  for (let i = 0; i < godEvents.length; i++) {
    const ge = godEvents[i]!
    if (ge.nowMs <= entryMs) bestIdx = i
    else break
  }
  return bestIdx
}

/**
 * Detector role inference per D15 / Ruling B. Best-effort, no
 * `src/server/projection.ts` import. Returns the literal
 * ROW_DISPLAY_LABELS value, or `'UNKNOWN'` when the rubric can't decide.
 */
function inferDetectorRole(
  godEvent: GodEvent | null,
  seatId: string,
): string {
  if (!godEvent) return ROLE_LABEL.UNKNOWN

  // ACTOR: action emitted from this seat.
  if (godEvent.action.playerId === seatId) return ROLE_LABEL.ACTOR

  // TARGET: any event in this broadcast directly targeting this seat.
  for (const ev of godEvent.events) {
    const targetId = (ev as { targetId?: unknown }).targetId
    if (typeof targetId === 'string' && targetId === seatId) {
      return ROLE_LABEL.TARGET
    }
  }

  // DISCONNECTED: this seat's projection reports `isConnected: false`.
  // Field survives scrubber per scrubbed-field contract.
  const proj = godEvent.projections[seatId]
  if (proj && proj['isConnected'] === false) return ROLE_LABEL.DISCONNECTED

  // SPECTATOR vs OTHER_ALIVE distinction requires viewer-gating logic
  // we can't import (boundary rule). Default to UNKNOWN; v1 treats this
  // as low-signal upstream (D15 / Ruling B).
  return ROLE_LABEL.UNKNOWN
}

/**
 * Slug-ify a string for SeedId construction. Lowercase ASCII, dashes for
 * non-alphanumeric runs, trimmed.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown'
}

// -----------------------------------------------------------------------------
// Per-entry SignalRef helpers
// -----------------------------------------------------------------------------

function refSeatLog(seat: SeatEntries): SignalRef {
  return { source: 'seat-log', seatId: seat.seatId, path: seat.logPath }
}

function refSuspicion(seat: SeatEntries): SignalRef {
  return { source: 'suspicion', seatId: seat.seatId, path: seat.suspicionPath }
}

function refForEntry(seat: SeatEntries, entry: LogEntry): SignalRef {
  return entry.entryType === 'scenario-fire'
    ? refSeatLog(seat)
    : refSuspicion(seat)
}

// -----------------------------------------------------------------------------
// Scripted-scenario clustering (rule 1)
// -----------------------------------------------------------------------------

interface ScenarioBucket {
  readonly scenarioId: string
  readonly seats: Set<string>
  readonly entries: { seat: SeatEntries; entry: LogEntry; ms: number }[]
  earliestMs: number
  latestMs: number
  highestSeverity: 'low' | 'medium' | 'high'
}

function severityRank(s: 'low' | 'medium' | 'high'): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1
}

function maxSeverity(
  a: 'low' | 'medium' | 'high',
  b: 'low' | 'medium' | 'high',
): 'low' | 'medium' | 'high' {
  return severityRank(a) >= severityRank(b) ? a : b
}

function clusterScripted(
  seats: readonly SeatEntries[],
): ScenarioBucket[] {
  // Collect (scenarioId, seat, entry, ms) for every fire + scenario-tagged
  // suspicion. Then bucket by scenarioId + 30s sliding window.
  type Tagged = {
    scenarioId: string
    seat: SeatEntries
    entry: LogEntry
    ms: number
    severity: 'low' | 'medium' | 'high'
  }
  const tagged: Tagged[] = []
  for (const seat of seats) {
    for (const e of seat.entries) {
      const ms = timestampToMs(e.timestamp)
      if (e.entryType === 'scenario-fire') {
        tagged.push({
          scenarioId: e.scenarioId,
          seat,
          entry: e,
          ms,
          severity: 'medium',
        })
      } else if (
        e.entryType === 'suspicion' &&
        e.relatedScenario != null
      ) {
        tagged.push({
          scenarioId: e.relatedScenario,
          seat,
          entry: e,
          ms,
          severity: e.severity,
        })
      }
    }
  }

  tagged.sort((a, b) => a.ms - b.ms)

  const byScenario = new Map<string, Tagged[]>()
  for (const t of tagged) {
    const arr = byScenario.get(t.scenarioId) ?? []
    arr.push(t)
    byScenario.set(t.scenarioId, arr)
  }

  const buckets: ScenarioBucket[] = []
  for (const [scenarioId, arr] of byScenario) {
    let i = 0
    while (i < arr.length) {
      const head = arr[i]!
      const bucket: ScenarioBucket = {
        scenarioId,
        seats: new Set([head.seat.seatId]),
        entries: [{ seat: head.seat, entry: head.entry, ms: head.ms }],
        earliestMs: head.ms,
        latestMs: head.ms,
        highestSeverity: head.severity,
      }
      let j = i + 1
      while (j < arr.length && arr[j]!.ms - bucket.earliestMs <= SCRIPTED_WINDOW_MS) {
        const next = arr[j]!
        bucket.seats.add(next.seat.seatId)
        bucket.entries.push({ seat: next.seat, entry: next.entry, ms: next.ms })
        bucket.latestMs = Math.max(bucket.latestMs, next.ms)
        bucket.highestSeverity = maxSeverity(bucket.highestSeverity, next.severity)
        j++
      }
      buckets.push(bucket)
      i = j
    }
  }

  return buckets
}

// -----------------------------------------------------------------------------
// Free-play clustering (rule 2 / D12 / C4)
// -----------------------------------------------------------------------------

interface FreePlayBucket {
  readonly cardType: string
  readonly eventType: string
  readonly seatRole: string
  readonly seats: Set<string>
  readonly entries: { seat: SeatEntries; entry: LogEntry; ms: number }[]
  earliestMs: number
  latestMs: number
}

/** Find the nearest preceding `card-played` event for a given timestamp. */
function findNearestCardPlayed(
  flatEvents: readonly GodEventForMatch[],
  entryMs: number,
): { cardType: string; eventType: string; seatRole: string; ms: number } | null {
  let nearest: { cardType: string; eventType: string; seatRole: string; ms: number } | null = null
  for (const fe of flatEvents) {
    if (fe.nowMs > entryMs) break
    const evType = fe.event['type']
    if (evType !== 'card-played') continue
    const cardType = (fe.event['cardType'] as string | undefined) ?? 'unknown'
    nearest = {
      cardType,
      eventType: 'card-played',
      seatRole: ROLE_LABEL.ACTOR,
      ms: fe.nowMs,
    }
  }
  return nearest
}

function clusterFreePlay(
  seats: readonly SeatEntries[],
  flatEvents: readonly GodEventForMatch[],
): FreePlayBucket[] {
  type Tagged = {
    seat: SeatEntries
    entry: LogEntry
    ms: number
    fingerprint: { cardType: string; eventType: string; seatRole: string } | null
  }
  const tagged: Tagged[] = []
  for (const seat of seats) {
    for (const e of seat.entries) {
      // Free-play marker per C4: relatedScenario === null on a suspicion.
      // Vibe-check + ui-spec-divergence with null relatedScenario don't
      // count here — they have their own clustering rules.
      if (e.entryType !== 'suspicion') continue
      if (e.relatedScenario != null) continue
      const ms = timestampToMs(e.timestamp)
      const fp = findNearestCardPlayed(flatEvents, ms)
      tagged.push({ seat, entry: e, ms, fingerprint: fp })
    }
  }

  tagged.sort((a, b) => a.ms - b.ms)

  const buckets: FreePlayBucket[] = []
  const byKey = new Map<string, Tagged[]>()
  for (const t of tagged) {
    const fp = t.fingerprint
    const key = fp ? `${fp.cardType}|${fp.eventType}|${fp.seatRole}` : 'no-fingerprint'
    const arr = byKey.get(key) ?? []
    arr.push(t)
    byKey.set(key, arr)
  }
  for (const [, arr] of byKey) {
    let i = 0
    while (i < arr.length) {
      const head = arr[i]!
      const fp = head.fingerprint ?? {
        cardType: 'unknown',
        eventType: 'unknown',
        seatRole: ROLE_LABEL.UNKNOWN,
      }
      const bucket: FreePlayBucket = {
        cardType: fp.cardType,
        eventType: fp.eventType,
        seatRole: fp.seatRole,
        seats: new Set([head.seat.seatId]),
        entries: [{ seat: head.seat, entry: head.entry, ms: head.ms }],
        earliestMs: head.ms,
        latestMs: head.ms,
      }
      let j = i + 1
      while (j < arr.length && arr[j]!.ms - bucket.earliestMs <= FREE_PLAY_WINDOW_MS) {
        const next = arr[j]!
        bucket.seats.add(next.seat.seatId)
        bucket.entries.push({ seat: next.seat, entry: next.entry, ms: next.ms })
        bucket.latestMs = Math.max(bucket.latestMs, next.ms)
        j++
      }
      buckets.push(bucket)
      i = j
    }
  }
  return buckets
}

// -----------------------------------------------------------------------------
// Vibe-check clustering (rule 3 / D11)
// -----------------------------------------------------------------------------

interface VibeBucket {
  readonly seats: Set<string>
  readonly entries: { seat: SeatEntries; entry: VibeCheckEntry; ms: number }[]
  readonly relatedScenario: string | null
  earliestMs: number
  latestMs: number
  hasNo: boolean
}

function clusterVibeChecks(seats: readonly SeatEntries[]): VibeBucket[] {
  type Tagged = { seat: SeatEntries; entry: VibeCheckEntry; ms: number }
  const tagged: Tagged[] = []
  for (const seat of seats) {
    for (const e of seat.entries) {
      if (e.entryType !== 'vibe-check') continue
      // `yes` answers don't enter the seed pipeline (D11 rule).
      if (e.feltLikeArcher === 'yes') continue
      tagged.push({ seat, entry: e, ms: timestampToMs(e.timestamp) })
    }
  }
  tagged.sort((a, b) => a.ms - b.ms)

  const buckets: VibeBucket[] = []
  for (const t of tagged) {
    let merged = false
    for (const b of buckets) {
      if (b.relatedScenario !== t.entry.relatedScenario) continue
      if (t.ms - b.earliestMs > VIBE_CHECK_MERGE_WINDOW_MS) continue
      b.seats.add(t.seat.seatId)
      b.entries.push(t)
      b.latestMs = Math.max(b.latestMs, t.ms)
      if (t.entry.feltLikeArcher === 'no') {
        ;(b as { hasNo: boolean }).hasNo = true
      }
      merged = true
      break
    }
    if (!merged) {
      buckets.push({
        relatedScenario: t.entry.relatedScenario,
        seats: new Set([t.seat.seatId]),
        entries: [t],
        earliestMs: t.ms,
        latestMs: t.ms,
        hasNo: t.entry.feltLikeArcher === 'no',
      })
    }
  }
  return buckets
}

// -----------------------------------------------------------------------------
// UI-spec-divergence clustering (rule 4 / D13 / Ruling A)
// -----------------------------------------------------------------------------

interface UiSpecBucket {
  readonly seat: SeatEntries
  readonly entry: UiSpecDivergenceEntry
  readonly ms: number
  readonly precedingGodEventIdx: number | null
}

function clusterUiSpec(
  seats: readonly SeatEntries[],
  godEvents: readonly GodEvent[],
): UiSpecBucket[] {
  const out: UiSpecBucket[] = []
  for (const seat of seats) {
    for (const e of seat.entries) {
      if (e.entryType !== 'ui-spec-divergence') continue
      const ms = timestampToMs(e.timestamp)
      out.push({
        seat,
        entry: e,
        ms,
        precedingGodEventIdx: findPrecedingGodEventIdx(godEvents, ms),
      })
    }
  }
  return out.sort((a, b) => a.ms - b.ms)
}

// -----------------------------------------------------------------------------
// Role-drift detection (rule 5 / D15 / Ruling B)
// -----------------------------------------------------------------------------

interface RoleDriftBucket {
  readonly seat: SeatEntries
  readonly entry: UiSpecDivergenceEntry
  readonly ms: number
  readonly selfLabel: string
  readonly detectorLabel: string
  readonly atStateVersion: number
}

function clusterRoleDrift(
  seats: readonly SeatEntries[],
  godEvents: readonly GodEvent[],
): RoleDriftBucket[] {
  const out: RoleDriftBucket[] = []
  for (const seat of seats) {
    for (const e of seat.entries) {
      if (e.entryType !== 'ui-spec-divergence') continue
      const ms = timestampToMs(e.timestamp)
      const idx = findPrecedingGodEventIdx(godEvents, ms)
      const ge = idx == null ? null : godEvents[idx] ?? null
      const inWindow = ge != null && ms - ge.nowMs <= ROLE_DRIFT_WINDOW_MS

      if (!inWindow) {
        // No god-event in window — emit drift seed with UNKNOWN per M1.
        // Signals "we tried to verify this self-label and couldn't."
        out.push({
          seat,
          entry: e,
          ms,
          selfLabel: e.myRoleLabel,
          detectorLabel: ROLE_LABEL.UNKNOWN,
          atStateVersion: -1,
        })
        continue
      }

      const detector = inferDetectorRole(ge, seat.seatId)
      // Ambiguous detector (god-event present, rubric returned UNKNOWN due
      // to OTHER_ALIVE / SPECTATOR viewer-gate ambiguity) → skip. Different
      // from the "no god-event in window" case above.
      if (detector === ROLE_LABEL.UNKNOWN) continue
      // Self-label matches detector → no drift.
      if (e.myRoleLabel === detector) continue

      out.push({
        seat,
        entry: e,
        ms,
        selfLabel: e.myRoleLabel,
        detectorLabel: detector,
        atStateVersion: ge.stateVersion,
      })
    }
  }
  return out
}

// -----------------------------------------------------------------------------
// Catalog lookup helpers
// -----------------------------------------------------------------------------

/** Build the duplicate-tag map from catalog `known-product-call:` fields. */
function buildKnownProductCallMap(
  catalog: readonly ParsedScenario[],
): Map<string, { id: string; linkedE2EIssueId?: string }> {
  const out = new Map<string, { id: string; linkedE2EIssueId?: string }>()
  for (const s of catalog) {
    if (!s.knownProductCall) continue
    // Tag value is free-form prose; scan for an `E-NN` / `C-NN` / `B-NN`
    // / `D-NN` / `A-NN` style ID. If absent, leave unlinked.
    const m = /\b([A-Z]-\d+)\b/.exec(s.knownProductCall)
    out.set(s.id, { id: s.id, linkedE2EIssueId: m?.[1] })
  }
  return out
}

// -----------------------------------------------------------------------------
// Deterministic seed-id assignment (rule 9)
// -----------------------------------------------------------------------------

function nextSeedIdFactory(): (slug: string) => string {
  let n = 0
  return (slug: string) => {
    n++
    return `${String(n).padStart(3, '0')}-${slug}`
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

export function clusterSuspicions(input: ClusterSuspicionsInput): IssueSeed[] {
  // Filter connections to natural transitions only (phase-3 C8 / R3).
  // Captured for future axis-13 disconnect-driven seeds beyond the
  // FireRecord pathway; v1 doesn't yet emit a dedicated disconnect kind.
  const naturalConnections = input.connections.filter(c => c.reason === 'natural')
  void naturalConnections

  const flatEvents = flattenInternal(input.godEvents)
  const knownProductCalls = buildKnownProductCallMap(input.catalog)

  const scriptedBuckets = clusterScripted(input.seats)
  const freePlayBuckets = clusterFreePlay(input.seats, flatEvents)
  const vibeBuckets = clusterVibeChecks(input.seats)
  const uiSpecBuckets = clusterUiSpec(input.seats, input.godEvents)
  const roleDriftBuckets = clusterRoleDrift(input.seats, input.godEvents)

  const fireDivergences = input.fires.filter(f => f.matched === 'with-divergence')
  const coverageDivergences = input.coverage.divergences.filter(
    d => d.kind === 'self-without-detector' || d.kind === 'detector-without-self',
  )

  // -----------------------------------------------------------------------
  // Emit seeds. Order: collect typed seed records, sort by earliest signal
  // timestamp, then assign deterministic NNN-<slug> IDs (rule 9).
  // -----------------------------------------------------------------------

  type Pending = {
    kind: SeedKind
    sortKey: number
    slug: string
    build: (seedId: string) => IssueSeed
  }
  const pending: Pending[] = []

  // 1. scripted-scenario
  for (const b of scriptedBuckets) {
    const dup = knownProductCalls.get(b.scenarioId)
    pending.push({
      kind: 'scripted-scenario',
      sortKey: b.earliestMs,
      slug: slugify(b.scenarioId),
      build: seedId => ({
        seedId,
        kind: 'scripted-scenario',
        sourceSignals: b.entries.map(e => refForEntry(e.seat, e.entry)),
        ...(dup
          ? {
              candidateDuplicate: {
                kind: 'KNOWN-PRODUCT-CALL' as const,
                id: dup.id,
                ...(dup.linkedE2EIssueId
                  ? { linkedE2EIssueId: dup.linkedE2EIssueId }
                  : {}),
              },
            }
          : {}),
        seatsInvolved: [...b.seats].sort(),
        scenarioIds: [b.scenarioId],
        suspicionSeverityHint: b.highestSeverity,
        timeWindow: { fromMs: b.earliestMs, toMs: b.latestMs },
      }),
    })
  }

  // 2. free-play
  for (const b of freePlayBuckets) {
    pending.push({
      kind: 'free-play',
      sortKey: b.earliestMs,
      slug: `${slugify(b.cardType)}-${slugify(b.eventType)}-freeplay`,
      build: seedId => ({
        seedId,
        kind: 'free-play',
        sourceSignals: b.entries.map(e => refForEntry(e.seat, e.entry)),
        seatsInvolved: [...b.seats].sort(),
        scenarioIds: [],
        suspicionSeverityHint: 'low',
        timeWindow: { fromMs: b.earliestMs, toMs: b.latestMs },
        freePlayFingerprint: {
          cardType: b.cardType,
          eventType: b.eventType,
          seatRole: b.seatRole,
        },
      }),
    })
  }

  // 3. vibe-check
  for (const b of vibeBuckets) {
    pending.push({
      kind: 'vibe-check',
      sortKey: b.earliestMs,
      slug: `vibe-${slugify(b.relatedScenario ?? 'unscripted')}`,
      build: seedId => ({
        seedId,
        kind: 'vibe-check',
        sourceSignals: b.entries.map(e => refSuspicion(e.seat)),
        seatsInvolved: [...b.seats].sort(),
        scenarioIds: b.relatedScenario ? [b.relatedScenario] : [],
        suspicionSeverityHint: b.hasNo ? 'medium' : 'low',
        timeWindow: { fromMs: b.earliestMs, toMs: b.latestMs },
      }),
    })
  }

  // 4. ui-spec-divergence
  for (const b of uiSpecBuckets) {
    const e = b.entry
    const dup = e.relatedScenario
      ? knownProductCalls.get(e.relatedScenario)
      : undefined
    pending.push({
      kind: 'ui-spec-divergence',
      sortKey: b.ms,
      slug: `uispec-${slugify(e.relatedScenario ?? b.seat.seatId)}`,
      build: seedId => ({
        seedId,
        kind: 'ui-spec-divergence',
        sourceSignals: [refSuspicion(b.seat)],
        ...(dup
          ? {
              candidateDuplicate: {
                kind: 'KNOWN-PRODUCT-CALL' as const,
                id: dup.id,
                ...(dup.linkedE2EIssueId
                  ? { linkedE2EIssueId: dup.linkedE2EIssueId }
                  : {}),
              },
            }
          : {}),
        seatsInvolved: [b.seat.seatId],
        scenarioIds: e.relatedScenario ? [e.relatedScenario] : [],
        suspicionSeverityHint: 'medium',
        timeWindow: { fromMs: b.ms, toMs: b.ms },
        columnContext: {
          scenarioId: e.relatedScenario ?? '(none)',
          rowLabel: e.myRoleLabel,
          agentObservation: e.column2Expected,
          projectionSnapshotRef:
            b.precedingGodEventIdx == null
              ? 'events.jsonl#L0'
              : eventsLineRef(b.precedingGodEventIdx, input.godEventLineByIdx),
        },
      }),
    })
  }

  // 5. role-drift
  for (const b of roleDriftBuckets) {
    pending.push({
      kind: 'role-drift',
      sortKey: b.ms,
      slug: `roledrift-${slugify(b.seat.seatId)}-${slugify(b.selfLabel)}`,
      build: seedId => ({
        seedId,
        kind: 'role-drift',
        sourceSignals: [refSuspicion(b.seat)],
        seatsInvolved: [b.seat.seatId],
        scenarioIds: b.entry.relatedScenario ? [b.entry.relatedScenario] : [],
        suspicionSeverityHint: 'low',
        timeWindow: { fromMs: b.ms, toMs: b.ms },
        roleDrift: {
          selfLabel: b.selfLabel,
          detectorLabel: b.detectorLabel,
          atStateVersion: b.atStateVersion,
        },
      }),
    })
  }

  // 6. with-divergence-fire (rule 6 / D17)
  for (const fr of fireDivergences) {
    const dup = knownProductCalls.get(fr.scenarioId)
    const adjacent: SignalRef[] = []
    if (fr.seatId) {
      const seat = input.seats.find(s => s.seatId === fr.seatId)
      if (seat) {
        for (const ent of seat.entries) {
          const ms = timestampToMs(ent.timestamp)
          const within =
            ms >= fr.nowMsRange[0] - SCRIPTED_WINDOW_MS &&
            ms <= fr.nowMsRange[1] + SCRIPTED_WINDOW_MS
          if (!within) continue
          if (
            ent.entryType === 'scenario-fire' && ent.scenarioId === fr.scenarioId
          ) {
            adjacent.push(refSeatLog(seat))
          } else if (
            ent.entryType === 'suspicion' && ent.relatedScenario === fr.scenarioId
          ) {
            adjacent.push(refSuspicion(seat))
          }
        }
      }
    }
    const failedTier: 'projectionAsserts' | 'connectionEvents' | 'ui' =
      fr.tier2 === 'fail'
        ? 'projectionAsserts'
        : fr.tier3 === 'fail'
          ? 'connectionEvents'
          : 'ui'
    pending.push({
      kind: 'with-divergence-fire',
      sortKey: fr.nowMsRange[0],
      slug: `withdiv-${slugify(fr.scenarioId)}`,
      build: seedId => ({
        seedId,
        kind: 'with-divergence-fire',
        sourceSignals: [
          { source: 'fire-record', path: 'coverage.md', id: fr.scenarioId },
          ...adjacent,
        ],
        ...(dup
          ? {
              candidateDuplicate: {
                kind: 'KNOWN-PRODUCT-CALL' as const,
                id: dup.id,
                ...(dup.linkedE2EIssueId
                  ? { linkedE2EIssueId: dup.linkedE2EIssueId }
                  : {}),
              },
            }
          : {}),
        seatsInvolved: fr.seatId ? [fr.seatId] : [],
        scenarioIds: [fr.scenarioId],
        suspicionSeverityHint: 'high',
        timeWindow: { fromMs: fr.nowMsRange[0], toMs: fr.nowMsRange[1] },
        fireDivergence: {
          scenarioId: fr.scenarioId,
          failedTier,
          notes: (fr.divergenceNotes ?? []).join(' | ') || '(no notes)',
        },
      }),
    })
  }

  // 7. coverage-divergence (rule 7)
  const coveragePath = input.coveragePath ?? 'coverage.md'
  for (const cd of coverageDivergences) {
    const dup = knownProductCalls.get(cd.scenarioId)
    pending.push({
      kind: 'coverage-divergence',
      sortKey: 0,
      slug: `covdiv-${slugify(cd.scenarioId)}`,
      build: seedId => ({
        seedId,
        kind: 'coverage-divergence',
        sourceSignals: [{ source: 'coverage', path: coveragePath, id: cd.scenarioId }],
        ...(dup
          ? {
              candidateDuplicate: {
                kind: 'KNOWN-PRODUCT-CALL' as const,
                id: dup.id,
                ...(dup.linkedE2EIssueId
                  ? { linkedE2EIssueId: dup.linkedE2EIssueId }
                  : {}),
              },
            }
          : {}),
        seatsInvolved: [],
        scenarioIds: [cd.scenarioId],
        suspicionSeverityHint: 'medium',
        timeWindow: { fromMs: 0, toMs: 0 },
      }),
    })
  }

  // Order: temporal (rule 9). Coverage-divergence with sortKey 0 lands at
  // the front; intentional for v1 — they have no nowMs basis. Phase 6 may
  // revisit if visual ordering matters.
  pending.sort((a, b) => a.sortKey - b.sortKey)

  const nextId = nextSeedIdFactory()
  return pending.map(p => p.build(nextId(p.slug)))
}
