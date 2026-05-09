/**
 * Scenario-detector — catalog parser + three-tier fire matcher.
 *
 * Phase 3 Unit 9 of the playtest harness. Consumes:
 *   - SCENARIOS.md (Markdown catalog; three-tier fire-signature grammar
 *     per phase-1 D3 / phase-3 D9).
 *   - events.jsonl (god-event stream from Unit 4 / 4b).
 *   - connections.jsonl (WS-lifecycle log from Unit 4 / 6; optional).
 *
 * Produces tri-state FireRecord[] consumed by Unit 10's coverage-reporter.
 *
 * QUARANTINE (insight 022): this module MUST NOT import from `src/server`.
 * All engine / projection / protocol shapes are mirrored locally in
 * `./types`. The parser is hand-rolled — phase-1 D3's `$`-prefixed sigils
 * (`$ACTOR`, `$TARGET`, `$PRESENT`, `$ABSENT`) are structural, and a
 * strict YAML loader would tokenize them identically but won't enforce
 * the contract. See `docs/plans/playtest-harness/phase-1-scenarios.md:176-210`
 * for the authoritative grammar.
 *
 * INSIGHT 027: tri-state output (`clean` / `with-divergence` / `no-fire`)
 * distinguishes "matcher ran, found nothing" from "matcher never had
 * input." A `no-fire` is a real signal, not vacuous truth.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { ConnectionEvent, GodEvent, ViewerRole } from './types'

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/** One entry under `events:` in a scenario's fire signature. */
export interface EventPattern {
  readonly type: string
  readonly where: Readonly<Record<string, unknown>>
}

/** One entry under `projection-assertions:` (axis-11 tier-2). */
export interface ProjectionAssertion {
  readonly viewer: string
  readonly field: string
  readonly expect: unknown
  /**
   * Optional snapshot anchor. When set, the oracle samples the projection
   * snapshot at the first flat-event of the named type within
   * [firstIdx..lastIdx] of the matched fire sequence, instead of defaulting
   * to the terminal (last-matched) event. Required for assertions that
   * check transient state — e.g. SCN-CALL-IN-FAVOR's pendingPrompt is set
   * after `favor-requested` and cleared by the time `favor-given` lands,
   * so sampling at terminal sees null. Triage 015 + 002 (run
   * 2026-05-08-2022-5p) traced both false-positives to this gap.
   */
  readonly afterEvent?: string
}

/** One entry under `connection-events:` (axis-13 tier-3). */
export interface ConnectionPattern {
  readonly seat: string
  readonly transition: 'disconnect' | 'reconnect'
  readonly at: number | string
}

/**
 * Per-vantage info-gap presence (phase-1 D5).
 *
 * A cell is "present" iff the scenario's info-gap table contains non-N/A
 * content at that (vantage, column) pair. Column 1 = "Projection returns
 * today"; Column 2 = "Viewer should see". N/A cells mean the vantage
 * doesn't exist for this scenario (e.g. TARGET on a draw-only scenario)
 * and are not credited toward coverage.
 */
export interface InfoGapPresence {
  readonly column1Present: boolean
  readonly column2Present: boolean
  /**
   * Raw Column 1 prose ("Projection returns today") for this vantage.
   * Populated by Phase 4 Unit 2a — Coverage-reporter (Unit 10) reads
   * only the booleans; the agent-launcher (Phase 4 Unit 2) reads the
   * prose to inject per-role Column 2 content into seat-agent prompts.
   * Concatenated with `\n\n` when multiple markdown rows map to the
   * same `ViewerRole` (e.g. `TARGET1` / `TARGET2` → TARGET).
   */
  readonly column1Prose?: string
  /** Raw Column 2 prose ("Viewer should see") for this vantage. See above. */
  readonly column2Prose?: string
}

export type InfoGap = Record<ViewerRole, InfoGapPresence>

/** Parsed representation of a single `### SCN-<ID>` section. */
export interface ParsedScenario {
  readonly id: string
  /**
   * The full `### SCN-<ID> — <title>` header line's title text (everything
   * after the ` — `). Historical name retained for source compatibility
   * with Unit 9; new callers should prefer `title`.
   */
  readonly description: string
  /** Alias of `description` (phase-4 Unit 2a — explicit name for launcher). */
  readonly title: string
  /** Body of the `**Trigger conditions:**` section (phase-4 Unit 2a). */
  readonly triggerConditions?: string
  /** Body of the `**Agent recognition criteria:**` section. */
  readonly recognitionCriteria?: string
  /** Body of the `**Suspicion prompts:**` section. */
  readonly suspicionPrompts?: string
  /** Body of the `**Vibe check:**` section. */
  readonly vibeCheck?: string
  /** Body of the `**Why this matters:**` section. */
  readonly whyThisMatters?: string
  readonly tier: 'axis-11' | 'axis-13' | 'other'
  readonly events: readonly EventPattern[]
  readonly shape: 'strict' | 'contains' | 'negative'
  readonly projectionAssertions?: readonly ProjectionAssertion[]
  readonly connectionEvents?: readonly ConnectionPattern[]
  readonly uiAssertions?: string
  readonly inference?: string
  readonly knownProductCall?: string
  /**
   * Per-vantage touched-cells map. Coverage-reporter (Unit 10) credits
   * `gridCells[role].column{1,2}` iff the fired scenario's `infoGap[role]`
   * has `column{1,2}Present === true`. Absent when the scenario section
   * has no `**Info gap at decision point:**` table (fixture scenarios,
   * free-play stubs).
   */
  readonly infoGap?: InfoGap
}

/**
 * FireRecord — tri-state output for one scenario × one match window.
 *
 * Tri-state rule (phase-3-harness-infra.md Unit 9 "Approach"):
 *   - clean           — tier1 passed AND all present tier2/tier3 passed
 *   - with-divergence — tier1 passed but at least one present tier2/tier3 failed
 *   - no-fire         — tier1 did not match
 *
 * Coverage counts `clean` + `with-divergence` both as "fired" toward the
 * ≥50 threshold (phase-3 B4 / D9.1); tier-2/3 divergences are bug reports,
 * not missed scenarios.
 */
export interface FireRecord {
  readonly scenarioId: string
  readonly seatId?: string
  readonly firstEventIdx: number
  readonly lastEventIdx: number
  readonly nowMsRange: readonly [number, number]
  readonly tier1: 'pass' | 'fail'
  readonly tier2: 'pass' | 'fail' | 'n/a'
  readonly tier3: 'pass' | 'fail' | 'n/a'
  readonly matched: 'clean' | 'with-divergence' | 'no-fire'
  readonly divergenceNotes?: readonly string[]
}

/** Legacy alias — coverage-reporter still imports this name (pre-rename). */
export type ScenarioFire = FireRecord

/** One flat event paired with its parent god-event metadata. */
export interface GodEventForMatch {
  readonly godEventIdx: number
  readonly event: Readonly<Record<string, unknown>>
  readonly action: GodEvent['action']
  readonly nowMs: number
  readonly projections: GodEvent['projections']
  readonly stateVersion: number
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

// Match scenario headers at H3 OR H4 depth. The production catalog mixes
// both: standalone scenarios under no parent card live at H3 (`### SCN-...`),
// while scenarios grouped under an `### <Card name>` card-section live at
// H4 (`#### SCN-...`). The previous H3-only regex silently dropped the 55
// H4 scenarios. Card-section H3 lines like `### Reassign` still won't match
// because the captured ID requires the `SCN-` prefix.
const SCN_HEADER_RE = /^#{3,4}\s+(SCN-[A-Z0-9-]+)\s*(?:—\s*(.*))?$/

/** Parse a SCENARIOS.md markdown string into ParsedScenarios. */
export function parseCatalog(markdown: string): ParsedScenario[] {
  const lines = markdown.split(/\r?\n/)
  const scenarios: ParsedScenario[] = []

  let i = 0
  while (i < lines.length) {
    const m = SCN_HEADER_RE.exec(lines[i] ?? '')
    if (!m) {
      i++
      continue
    }
    const id = m[1]!
    const description = (m[2] ?? '').trim()
    const sectionStart = i + 1

    let sectionEnd = lines.length
    for (let j = sectionStart; j < lines.length; j++) {
      if (SCN_HEADER_RE.test(lines[j] ?? '')) {
        sectionEnd = j
        break
      }
    }

    const section = lines.slice(sectionStart, sectionEnd)
    const parsed = parseScenarioSection(id, description, section)
    if (parsed) scenarios.push(parsed)
    i = sectionEnd
  }

  return scenarios
}

function parseScenarioSection(
  id: string,
  description: string,
  sectionLines: readonly string[],
): ParsedScenario | null {
  let fenceStart = -1
  let sawFireSigMarker = false
  for (let i = 0; i < sectionLines.length; i++) {
    const l = sectionLines[i] ?? ''
    if (/^\*\*Fire signature:\*\*/.test(l)) {
      sawFireSigMarker = true
      continue
    }
    if (sawFireSigMarker && /^```/.test(l)) {
      fenceStart = i
      break
    }
  }
  if (fenceStart < 0) {
    for (let i = 0; i < sectionLines.length; i++) {
      if (/^```/.test(sectionLines[i] ?? '')) {
        fenceStart = i
        break
      }
    }
  }
  if (fenceStart < 0) return null

  let fenceEnd = -1
  for (let i = fenceStart + 1; i < sectionLines.length; i++) {
    if (/^```\s*$/.test(sectionLines[i] ?? '')) {
      fenceEnd = i
      break
    }
  }
  if (fenceEnd < 0) return null

  const block = sectionLines.slice(fenceStart + 1, fenceEnd)
  const parsed = parseFireSignatureBlock(block)

  let knownProductCall: string | undefined
  for (const raw of sectionLines) {
    const mm = /^\*\*Known product call:\*\*\s*(.+?)\s*$/.exec(raw)
    if (mm && mm[1] && mm[1].toLowerCase() !== 'none') {
      knownProductCall = mm[1]
      break
    }
  }

  const tier: ParsedScenario['tier'] = parsed.projectionAssertions
    ? 'axis-11'
    : parsed.connectionEvents
      ? 'axis-13'
      : 'other'

  const infoGap = parseInfoGapTable(sectionLines)

  const triggerConditions = extractProseSection(sectionLines, 'Trigger conditions')
  const recognitionCriteria = extractProseSection(sectionLines, 'Agent recognition criteria')
  const suspicionPrompts = extractProseSection(sectionLines, 'Suspicion prompts')
  const vibeCheck = extractProseSection(sectionLines, 'Vibe check')
  const whyThisMatters = extractProseSection(sectionLines, 'Why this matters')

  return {
    id,
    description,
    title: description,
    tier,
    events: parsed.events,
    shape: parsed.shape,
    ...(parsed.projectionAssertions
      ? { projectionAssertions: parsed.projectionAssertions }
      : {}),
    ...(parsed.connectionEvents ? { connectionEvents: parsed.connectionEvents } : {}),
    ...(parsed.uiAssertions ? { uiAssertions: parsed.uiAssertions } : {}),
    ...(parsed.inference ? { inference: parsed.inference } : {}),
    ...(knownProductCall ? { knownProductCall } : {}),
    ...(infoGap ? { infoGap } : {}),
    ...(triggerConditions ? { triggerConditions } : {}),
    ...(recognitionCriteria ? { recognitionCriteria } : {}),
    ...(suspicionPrompts ? { suspicionPrompts } : {}),
    ...(vibeCheck ? { vibeCheck } : {}),
    ...(whyThisMatters ? { whyThisMatters } : {}),
  }
}

/**
 * Extract the body of a `**<header>:**` markdown section within a scenario
 * section. Body runs from the line AFTER the header marker up to (but not
 * including) the next `**<Something>:**` marker at column 0 of a line, or
 * the end of the section. Returns `undefined` when the header is not
 * present or the body is empty-after-trim (phase-4 Unit 2a).
 *
 * This is a PROSE extractor — it preserves line breaks and indentation so
 * bulleted lists and multi-paragraph narrative survive intact for the
 * agent-launcher to inject verbatim into seat-agent prompts.
 */
function extractProseSection(
  sectionLines: readonly string[],
  headerName: string,
): string | undefined {
  const headerRe = new RegExp(`^\\*\\*${escapeRegex(headerName)}:\\*\\*\\s*$`)
  const anyHeaderRe = /^\*\*[^*]+:\*\*\s*$/

  let startIdx = -1
  for (let i = 0; i < sectionLines.length; i++) {
    if (headerRe.test((sectionLines[i] ?? '').trim())) {
      startIdx = i + 1
      break
    }
  }
  if (startIdx < 0) return undefined

  let endIdx = sectionLines.length
  for (let i = startIdx; i < sectionLines.length; i++) {
    if (anyHeaderRe.test((sectionLines[i] ?? '').trim())) {
      endIdx = i
      break
    }
  }

  const body = sectionLines.slice(startIdx, endIdx).join('\n').trim()
  return body === '' ? undefined : body
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse the `**Info gap at decision point:**` markdown table into a
 * per-vantage presence map (phase-1 D5).
 *
 * Returns `null` when no info-gap table is present (fixture scenarios).
 * Otherwise returns a complete map with every `ViewerRole` populated —
 * rows absent from the markdown default to `{ column1Present: false,
 * column2Present: false }` (treated the same as an N/A row).
 *
 * A cell is "present" when its trimmed content does NOT start with
 * `N/A` (case-insensitive), and is non-empty. Multiple markdown rows
 * can map to the same `ViewerRole` (e.g. `TARGET1` / `TARGET2` both
 * credit TARGET, `OTHER / SPECTATOR` credits both) — presence is
 * OR-combined.
 */
function parseInfoGapTable(sectionLines: readonly string[]): InfoGap | null {
  let headerIdx = -1
  for (let i = 0; i < sectionLines.length; i++) {
    if (/^\*\*Info gap at decision point:\*\*/.test(sectionLines[i] ?? '')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) return null

  let tableHeaderIdx = -1
  for (let i = headerIdx + 1; i < Math.min(headerIdx + 10, sectionLines.length); i++) {
    const l = (sectionLines[i] ?? '').trim()
    if (l.startsWith('| Vantage')) {
      tableHeaderIdx = i
      break
    }
  }
  if (tableHeaderIdx < 0) return null

  const bodyStart = tableHeaderIdx + 2

  const gap: Record<ViewerRole, InfoGapPresence> = {
    SERVER:       { column1Present: false, column2Present: false },
    ACTOR:        { column1Present: false, column2Present: false },
    TARGET:       { column1Present: false, column2Present: false },
    OTHER_ALIVE:  { column1Present: false, column2Present: false },
    SPECTATOR:    { column1Present: false, column2Present: false },
    DISCONNECTED: { column1Present: false, column2Present: false },
    BOARD:        { column1Present: false, column2Present: false },
  }

  for (let i = bodyStart; i < sectionLines.length; i++) {
    const raw = sectionLines[i] ?? ''
    const line = raw.trimEnd()
    if (!line.startsWith('|')) break
    const cells = splitMarkdownRow(line)
    if (cells.length < 3) continue

    const label = cells[0]!.trim()
    const col1 = cells[1]!.trim()
    const col2 = cells[2]!.trim()
    const roles = vantageLabelToRoles(label)
    if (roles.length === 0) continue

    const c1 = isCellPresent(col1)
    const c2 = isCellPresent(col2)
    for (const role of roles) {
      const existing = gap[role]
      const next: InfoGapPresence = {
        column1Present: existing.column1Present || c1,
        column2Present: existing.column2Present || c2,
        ...(c1
          ? {
              column1Prose: existing.column1Prose
                ? `${existing.column1Prose}\n\n${col1}`
                : col1,
            }
          : existing.column1Prose
            ? { column1Prose: existing.column1Prose }
            : {}),
        ...(c2
          ? {
              column2Prose: existing.column2Prose
                ? `${existing.column2Prose}\n\n${col2}`
                : col2,
            }
          : existing.column2Prose
            ? { column2Prose: existing.column2Prose }
            : {}),
      }
      gap[role] = next
    }
  }

  return gap
}

/**
 * Split a markdown table row on `|` honoring leading/trailing pipes.
 * Input: `| SERVER | desc | prescr |` → `[' SERVER ', ' desc ', ' prescr ']`.
 * We don't need to handle escaped pipes — none appear in the catalog.
 */
function splitMarkdownRow(line: string): string[] {
  const trimmed = line.replace(/^\|/, '').replace(/\|\s*$/, '')
  return trimmed.split('|')
}

/**
 * Map the first-column label to the ViewerRole(s) it describes.
 * Handles parenthetical qualifiers (`ACTOR (STEALER)` → ACTOR) and
 * combined labels (`OTHER / SPECTATOR` → [OTHER_ALIVE, SPECTATOR]).
 * `TARGET1`, `TARGET2`, `TARGET (= ACTOR)` all map to TARGET.
 */
function vantageLabelToRoles(rawLabel: string): ViewerRole[] {
  const label = rawLabel.replace(/\*\*/g, '').trim().toUpperCase()
  const roles = new Set<ViewerRole>()
  const tokens = label.split(/\s*\/\s*/)
  for (const tok of tokens) {
    const head = tok.replace(/\s*\(.*$/, '').trim()
    if (/^SERVER\b/.test(head)) roles.add('SERVER')
    else if (/^ACTOR\b/.test(head)) roles.add('ACTOR')
    else if (/^TARGET[12]?\b/.test(head) || head === 'TARGET') roles.add('TARGET')
    else if (/^OTHER\b/.test(head)) roles.add('OTHER_ALIVE')
    else if (/^SPECTATOR\b/.test(head)) roles.add('SPECTATOR')
    else if (/^DISCONNECTED\b/.test(head)) roles.add('DISCONNECTED')
    else if (/^BOARD\b/.test(head)) roles.add('BOARD')
  }
  return [...roles]
}

/** A cell is "present" iff it has content and does not begin with `N/A`. */
function isCellPresent(cellRaw: string): boolean {
  const cell = cellRaw.trim()
  if (cell === '') return false
  return !/^n\/?a\b/i.test(cell)
}

interface ParsedFireSignature {
  events: EventPattern[]
  shape: 'strict' | 'contains' | 'negative'
  projectionAssertions?: ProjectionAssertion[]
  connectionEvents?: ConnectionPattern[]
  uiAssertions?: string
  inference?: string
}

/**
 * Parse the fenced fire-signature block.
 *
 * Supported grammar (phase-1 D3 subset):
 *   key: scalar
 *   key: [] | { }        (empty inline)
 *   key: { k: v, ... }   (flow mapping — used heavily in `where:`)
 *   key: |               (block scalar — gathered until dedent)
 *     prose line 1
 *     prose line 2
 *   key:
 *     - item
 *     - item
 */
function parseFireSignatureBlock(lines: readonly string[]): ParsedFireSignature {
  const events: EventPattern[] = []
  let shape: ParsedFireSignature['shape'] = 'strict'
  let projectionAssertions: ProjectionAssertion[] | undefined
  let connectionEvents: ConnectionPattern[] | undefined
  let uiAssertions: string | undefined
  let inference: string | undefined

  let i = 0
  while (i < lines.length) {
    const raw = lines[i] ?? ''
    const line = raw.replace(/\s+$/, '')
    if (line.trim() === '' || /^\s*#/.test(line)) {
      i++
      continue
    }
    if (/^\s/.test(line)) {
      i++
      continue
    }
    const keyMatch = /^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/.exec(line)
    if (!keyMatch) {
      i++
      continue
    }
    const key = keyMatch[1]!
    const rest = keyMatch[2] ?? ''

    if (key === 'events') {
      if (rest === '[]') {
        i++
        continue
      }
      const { items, nextIdx } = collectIndentedList(lines, i + 1)
      for (const block of items) {
        const ep = parseEventPatternBlock(block)
        if (ep) events.push(ep)
      }
      i = nextIdx
      continue
    }

    if (key === 'shape') {
      const val = unquote(rest.trim())
      if (val === 'strict' || val === 'contains' || val === 'negative') {
        shape = val
      }
      i++
      continue
    }

    if (key === 'projection-assertions') {
      if (rest === '[]') {
        projectionAssertions = []
        i++
        continue
      }
      const { items, nextIdx } = collectIndentedList(lines, i + 1)
      projectionAssertions = []
      for (const block of items) {
        const pa = parseProjectionAssertionBlock(block)
        if (pa) projectionAssertions.push(pa)
      }
      i = nextIdx
      continue
    }

    if (key === 'connection-events') {
      if (rest === '[]') {
        connectionEvents = []
        i++
        continue
      }
      const { items, nextIdx } = collectIndentedList(lines, i + 1)
      connectionEvents = []
      for (const block of items) {
        const ce = parseConnectionPatternBlock(block)
        if (ce) connectionEvents.push(ce)
      }
      i = nextIdx
      continue
    }

    if (key === 'ui-assertions') {
      if (rest.trim() === '|') {
        const { text, nextIdx } = collectBlockScalar(lines, i + 1)
        uiAssertions = text
        i = nextIdx
      } else {
        uiAssertions = rest.trim()
        i++
      }
      continue
    }

    if (key === 'inference') {
      if (rest.trim() === '|') {
        const { text, nextIdx } = collectBlockScalar(lines, i + 1)
        inference = text
        i = nextIdx
      } else {
        inference = rest.trim()
        i++
      }
      continue
    }

    i++
  }

  const result: ParsedFireSignature = { events, shape }
  if (projectionAssertions !== undefined) result.projectionAssertions = projectionAssertions
  if (connectionEvents !== undefined) result.connectionEvents = connectionEvents
  if (uiAssertions !== undefined) result.uiAssertions = uiAssertions
  if (inference !== undefined) result.inference = inference
  return result
}

function collectIndentedList(
  lines: readonly string[],
  startIdx: number,
): { items: string[][]; nextIdx: number } {
  const items: string[][] = []
  let current: string[] | null = null
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.trim() === '') {
      if (current) current.push('')
      i++
      continue
    }
    if (!/^\s/.test(line) && /^[A-Za-z][A-Za-z0-9-]*:/.test(line)) {
      break
    }
    const dashMatch = /^(\s*)-\s*(.*)$/.exec(line)
    if (dashMatch) {
      if (current) items.push(current)
      current = [dashMatch[2] ?? '']
      i++
      continue
    }
    if (current && /^\s/.test(line)) {
      current.push(line.replace(/^\s{2,4}/, ''))
      i++
      continue
    }
    break
  }
  if (current) items.push(current)
  return { items, nextIdx: i }
}

function collectBlockScalar(
  lines: readonly string[],
  startIdx: number,
): { text: string; nextIdx: number } {
  const out: string[] = []
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.trim() === '') {
      out.push('')
      i++
      continue
    }
    if (!/^\s/.test(line) && /^[A-Za-z][A-Za-z0-9-]*:/.test(line)) {
      break
    }
    out.push(line.replace(/^\s{1,4}/, ''))
    i++
  }
  return { text: out.join('\n').trimEnd(), nextIdx: i }
}

function parseEventPatternBlock(block: readonly string[]): EventPattern | null {
  let typeVal: string | undefined
  let whereObj: Record<string, unknown> | undefined
  for (const raw of block) {
    const line = raw.replace(/\s+$/, '')
    const mKv = /^(\s*)([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/.exec(line)
    if (!mKv) continue
    const key = mKv[2]!
    const rest = (mKv[3] ?? '').trim()
    if (key === 'type') typeVal = unquote(rest)
    else if (key === 'where') whereObj = parseFlowMapping(rest) ?? {}
  }
  if (!typeVal) return null
  return { type: typeVal, where: whereObj ?? {} }
}

function parseProjectionAssertionBlock(block: readonly string[]): ProjectionAssertion | null {
  let viewer: string | undefined
  let field: string | undefined
  let expect: unknown = undefined
  let afterEvent: string | undefined
  for (const raw of block) {
    const line = raw.replace(/\s+$/, '')
    const mKv = /^(\s*)([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/.exec(line)
    if (!mKv) continue
    const key = mKv[2]!
    const rest = (mKv[3] ?? '').trim()
    if (key === 'viewer') viewer = unquote(rest)
    else if (key === 'field') field = unquote(rest)
    else if (key === 'expect') expect = parseScalarOrInline(rest)
    else if (key === 'after-event') afterEvent = unquote(rest)
  }
  if (!viewer || !field) return null
  return afterEvent !== undefined
    ? { viewer, field, expect, afterEvent }
    : { viewer, field, expect }
}

function parseConnectionPatternBlock(block: readonly string[]): ConnectionPattern | null {
  let seat: string | undefined
  let transition: 'disconnect' | 'reconnect' | undefined
  let at: number | string | undefined
  for (const raw of block) {
    const line = raw.replace(/\s+$/, '')
    const mKv = /^(\s*)([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/.exec(line)
    if (!mKv) continue
    const key = mKv[2]!
    const rest = (mKv[3] ?? '').trim()
    if (key === 'seat') seat = unquote(rest)
    else if (key === 'transition') {
      const v = unquote(rest)
      if (v === 'disconnect' || v === 'reconnect') transition = v
    } else if (key === 'at') {
      const v = unquote(rest)
      const n = Number(v)
      at = Number.isFinite(n) && /^[-+]?\d+(?:\.\d+)?$/.test(v) ? n : v
    }
  }
  if (!seat || !transition || at === undefined) return null
  return { seat, transition, at }
}

function parseFlowMapping(src: string): Record<string, unknown> | null {
  const s = src.trim()
  if (!s.startsWith('{') || !s.endsWith('}')) return null
  const body = s.slice(1, -1).trim()
  if (body === '') return {}
  const out: Record<string, unknown> = {}
  const parts = splitFlowFields(body)
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx < 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (!k) continue
    out[k] = parseScalarOrInline(v)
  }
  return out
}

function splitFlowFields(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let inQ: '"' | "'" | null = null
  let buf = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (inQ) {
      buf += c
      if (c === inQ) inQ = null
      continue
    }
    if (c === '"' || c === "'") {
      inQ = c
      buf += c
      continue
    }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') depth--
    if (c === ',' && depth === 0) {
      out.push(buf)
      buf = ''
      continue
    }
    buf += c
  }
  if (buf.trim() !== '') out.push(buf)
  return out
}

function parseScalarOrInline(v: string): unknown {
  const s = v.trim()
  if (s === '') return ''
  if (s.startsWith('{') && s.endsWith('}')) return parseFlowMapping(s)
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^[-+]?\d+(?:\.\d+)?$/.test(s)) return Number(s)
  return unquote(s)
}

function unquote(s: string): string {
  const t = s.trim()
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1)
  }
  return t
}

// -----------------------------------------------------------------------------
// Flatten god-events (delta expansion of cumulative events[])
// -----------------------------------------------------------------------------

/**
 * God-events carry the FULL cumulative events array per broadcast. Flatten
 * by taking the delta at each broadcast and tagging each new event with
 * its parent god-event metadata.
 */
export function flattenEvents(godEvents: readonly GodEvent[]): GodEventForMatch[] {
  const flat: GodEventForMatch[] = []
  let priorLen = 0
  for (let g = 0; g < godEvents.length; g++) {
    const ge = godEvents[g]!
    const all = ge.events ?? []
    const newOnes = all.slice(priorLen)
    for (const ev of newOnes) {
      flat.push({
        godEventIdx: g,
        event: ev as Record<string, unknown>,
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
// Matcher
// -----------------------------------------------------------------------------

type Bindings = Record<string, string>

const SIGILS = new Set(['$ACTOR', '$TARGET'])

/** Match the flat event stream against every scenario. One FireRecord per scenario. */
export function matchFires(
  scenarios: readonly ParsedScenario[],
  godEvents: readonly GodEvent[],
  connections: readonly ConnectionEvent[],
): FireRecord[] {
  const flat = flattenEvents(godEvents)
  const naturalConnections = connections.filter((c) => c.reason === 'natural')

  const fires: FireRecord[] = []
  for (const scenario of scenarios) {
    fires.push(matchOne(scenario, flat, naturalConnections))
  }
  return fires
}

function matchOne(
  scenario: ParsedScenario,
  flat: readonly GodEventForMatch[],
  naturalConnections: readonly ConnectionEvent[],
): FireRecord {
  const t1 = tier1Match(scenario, flat)

  if (!t1.passed) {
    return {
      scenarioId: scenario.id,
      firstEventIdx: -1,
      lastEventIdx: -1,
      nowMsRange: [0, 0],
      tier1: 'fail',
      tier2: 'n/a',
      tier3: 'n/a',
      matched: 'no-fire',
    }
  }

  const { bindings, firstIdx, lastIdx } = t1
  const actor = bindings['$ACTOR']
  const divergenceNotes: string[] = []

  let tier2: FireRecord['tier2'] = 'n/a'
  if (scenario.projectionAssertions && scenario.projectionAssertions.length > 0) {
    const t2 = tier2Match(scenario.projectionAssertions, flat, firstIdx, lastIdx, bindings)
    tier2 = t2.passed ? 'pass' : 'fail'
    if (!t2.passed) {
      for (const note of t2.divergences) divergenceNotes.push(note)
    }
  }

  let tier3: FireRecord['tier3'] = 'n/a'
  if (scenario.connectionEvents && scenario.connectionEvents.length > 0) {
    const t3 = tier3Match(scenario.connectionEvents, flat, firstIdx, lastIdx, bindings, naturalConnections)
    tier3 = t3.passed ? 'pass' : 'fail'
    if (!t3.passed) {
      for (const note of t3.divergences) divergenceNotes.push(note)
    }
  }

  const matched: FireRecord['matched'] =
    (tier2 === 'fail' || tier3 === 'fail') ? 'with-divergence' : 'clean'

  const nowMsRange: readonly [number, number] = [
    flat[firstIdx]!.nowMs,
    flat[lastIdx]!.nowMs,
  ]

  return {
    scenarioId: scenario.id,
    ...(actor ? { seatId: actor } : {}),
    firstEventIdx: firstIdx,
    lastEventIdx: lastIdx,
    nowMsRange,
    tier1: 'pass',
    tier2,
    tier3,
    matched,
    ...(divergenceNotes.length > 0 ? { divergenceNotes } : {}),
  }
}

// --- Tier 1 ----------------------------------------------------------------

interface Tier1Match {
  readonly passed: boolean
  readonly bindings: Bindings
  readonly firstIdx: number
  readonly lastIdx: number
}

function tier1Match(
  scenario: ParsedScenario,
  flat: readonly GodEventForMatch[],
): Tier1Match {
  // Negative-shape scenarios (plan Unit 9): a fire requires POSITIVE
  // evidence of a dispatch rejection (error code present). Phase 3 does
  // not yet log action-rejected signals in `events.jsonl` — dispatch
  // errors produce no state mutation and no god-event. Without the
  // rejection stream, we can't distinguish "bad dispatch was attempted
  // and correctly rejected" from "bad dispatch was never attempted."
  //
  // Conservative default: `no-fire`. Avoids inflating coverage with
  // unverifiable positives. Phase 4+ should surface rejection logging
  // (seat-agent submission logs OR a rejection-event stream); at that
  // point this branch upgrades to real evidence matching.
  if (scenario.shape === 'negative') {
    return { passed: false, bindings: {}, firstIdx: -1, lastIdx: -1 }
  }

  if (scenario.events.length === 0) {
    return { passed: false, bindings: {}, firstIdx: -1, lastIdx: -1 }
  }

  for (let start = 0; start < flat.length; start++) {
    const attempt =
      scenario.shape === 'strict'
        ? tryStrictMatch(scenario.events, flat, start)
        : tryContainsMatch(scenario.events, flat, start)
    if (attempt.passed) return attempt
  }
  return { passed: false, bindings: {}, firstIdx: -1, lastIdx: -1 }
}

function tryStrictMatch(
  patterns: readonly EventPattern[],
  flat: readonly GodEventForMatch[],
  start: number,
): Tier1Match {
  if (start + patterns.length > flat.length) {
    return { passed: false, bindings: {}, firstIdx: -1, lastIdx: -1 }
  }
  const bindings: Bindings = {}
  for (let k = 0; k < patterns.length; k++) {
    if (!matchEventPattern(patterns[k]!, flat[start + k]!.event, bindings)) {
      return { passed: false, bindings: {}, firstIdx: -1, lastIdx: -1 }
    }
  }
  return {
    passed: true,
    bindings,
    firstIdx: start,
    lastIdx: start + patterns.length - 1,
  }
}

function tryContainsMatch(
  patterns: readonly EventPattern[],
  flat: readonly GodEventForMatch[],
  start: number,
): Tier1Match {
  const bindings: Bindings = {}
  let j = start
  let lastIdx = start
  let matched = 0
  for (let k = 0; k < patterns.length; k++) {
    let found = false
    while (j < flat.length) {
      if (matchEventPattern(patterns[k]!, flat[j]!.event, bindings)) {
        lastIdx = j
        j++
        found = true
        matched++
        break
      }
      j++
    }
    if (!found) {
      return { passed: false, bindings: {}, firstIdx: -1, lastIdx: -1 }
    }
  }
  if (matched !== patterns.length) {
    return { passed: false, bindings: {}, firstIdx: -1, lastIdx: -1 }
  }
  return { passed: true, bindings, firstIdx: start, lastIdx }
}

function matchEventPattern(
  pattern: EventPattern,
  event: Readonly<Record<string, unknown>>,
  bindings: Bindings,
): boolean {
  if (event['type'] !== pattern.type) return false
  for (const [k, expected] of Object.entries(pattern.where)) {
    const actual = event[k]
    if (typeof expected === 'string' && SIGILS.has(expected)) {
      if (typeof actual !== 'string') return false
      const current = bindings[expected]
      if (current === undefined) {
        bindings[expected] = actual
      } else if (current !== actual) {
        return false
      }
      continue
    }
    if (expected === '$PRESENT') {
      if (actual === undefined || actual === null) return false
      continue
    }
    if (expected === '$ABSENT') {
      if (actual !== undefined && actual !== null) return false
      continue
    }
    if (actual !== expected) return false
  }
  return true
}

// --- Tier 2 ----------------------------------------------------------------

/**
 * Recursively replace `$ACTOR` / `$TARGET` placeholders in an expect value
 * with the resolved seat IDs from tier-1 bindings. Required because
 * `parseScalarOrInline` parses placeholders as literal strings, so
 * `expect: { playerId: $TARGET }` arrives at tier-2 as
 * `{ playerId: '$TARGET' }` — a literal string that never matches the
 * observed seat ID. Triage issue #019 (Phase 6 calibration).
 */
function substituteBindings(value: unknown, bindings: Bindings): unknown {
  if (typeof value === 'string') {
    if (value === '$ACTOR' || value === 'ACTOR') return bindings['$ACTOR'] ?? value
    if (value === '$TARGET' || value === 'TARGET') return bindings['$TARGET'] ?? value
    return value
  }
  if (Array.isArray(value)) return value.map(v => substituteBindings(v, bindings))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = substituteBindings(v, bindings)
    return out
  }
  return value
}

/**
 * Detect free-form English expect values (e.g. "gains exactly one card after
 * favor-given"). These document intent for catalog readers but are not
 * machine-checkable; tier-2 surfaces them as informational notes rather
 * than failing the match. Heuristic: a string that contains whitespace and
 * does not start with `$` (sentinels like `$PRESENT` / `$ABSENT` / `$ACTOR`
 * pass through). Engine values (UUIDs, kebab-case card types) never contain
 * spaces, so the heuristic is safe.
 */
function isProseExpect(value: unknown): boolean {
  return typeof value === 'string' && !value.startsWith('$') && /\s/.test(value)
}

function tier2Match(
  assertions: readonly ProjectionAssertion[],
  flat: readonly GodEventForMatch[],
  firstIdx: number,
  lastIdx: number,
  bindings: Bindings,
): { passed: boolean; divergences: string[] } {
  const divergences: string[] = []
  let realFailures = 0
  const terminal = flat[lastIdx]!

  for (const assertion of assertions) {
    // Resolve which flat-event's projections to sample. Default = terminal
    // (last-matched event in the fire sequence). Override = first event of
    // the named type within [firstIdx..lastIdx]. The override exists for
    // assertions checking transient state — e.g. SCN-CALL-IN-FAVOR's
    // pendingPrompt is set after `favor-requested` and cleared by the time
    // `favor-given` lands; sampling at terminal sees null. Triage 015 + 002.
    let sample = terminal
    if (assertion.afterEvent !== undefined) {
      let foundIdx = -1
      for (let i = firstIdx; i <= lastIdx; i++) {
        const e = flat[i]?.event as { type?: unknown } | undefined
        if (e !== undefined && e.type === assertion.afterEvent) {
          foundIdx = i
          break
        }
      }
      if (foundIdx === -1) {
        divergences.push(
          `tier-2: after-event "${assertion.afterEvent}" not present in fire sequence — cannot sample projection for field ${assertion.field}`,
        )
        realFailures++
        continue
      }
      sample = flat[foundIdx]!
    }

    const viewerId = resolveViewer(assertion.viewer, bindings, sample)
    if (!viewerId) {
      divergences.push(
        `tier-2: viewer ${assertion.viewer} unresolved for field ${assertion.field}`,
      )
      realFailures++
      continue
    }
    if (isProseExpect(assertion.expect)) {
      // Prose expect — documentation only, not machine-checkable. Logged so
      // catalog authors can spot the unstructured assertion, but does NOT
      // fail tier-2 (issue #019).
      divergences.push(
        `tier-2 SKIPPED (prose expect, not machine-checked): viewer=${assertion.viewer} path=${assertion.field} expect=${formatExpect(assertion.expect)}`,
      )
      continue
    }
    const expectResolved = substituteBindings(assertion.expect, bindings)
    const projection = sample.projections[viewerId]
    const observed = walkPath(projection, assertion.field)
    if (!expectMatches(observed, expectResolved)) {
      divergences.push(
        `tier-2: viewer=${assertion.viewer} path=${assertion.field} expected=${formatExpect(expectResolved)} observed=${formatObserved(observed)}`,
      )
      realFailures++
    }
  }
  return { passed: realFailures === 0, divergences }
}

function resolveViewer(
  viewer: string,
  bindings: Bindings,
  terminal: GodEventForMatch,
): string | null {
  if (viewer === '$ACTOR' || viewer === 'ACTOR') return bindings['$ACTOR'] ?? null
  if (viewer === '$TARGET' || viewer === 'TARGET') return bindings['$TARGET'] ?? null
  if (viewer === 'BOARD' || viewer === 'SERVER') return null
  const actor = bindings['$ACTOR']
  const target = bindings['$TARGET']
  for (const pid of Object.keys(terminal.projections)) {
    if (pid !== actor && pid !== target) return pid
  }
  return null
}

function walkPath(obj: unknown, dottedPath: string): unknown {
  const parts = dottedPath.split('.').filter((p) => p.length > 0)
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined
    if (typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function expectMatches(observed: unknown, expected: unknown): boolean {
  if (expected === '$PRESENT') return observed !== undefined && observed !== null
  if (expected === '$ABSENT') return observed === undefined || observed === null
  if (typeof expected === 'string') return observed === expected
  if (expected && typeof expected === 'object') {
    if (observed === null || typeof observed !== 'object') return false
    for (const [k, v] of Object.entries(expected)) {
      if (!expectMatches((observed as Record<string, unknown>)[k], v)) return false
    }
    return true
  }
  return observed === expected
}

function formatExpect(e: unknown): string {
  if (e === null) return 'null'
  if (typeof e === 'object') return JSON.stringify(e)
  return String(e)
}
function formatObserved(o: unknown): string {
  if (o === null) return 'null'
  if (o === undefined) return 'undefined'
  if (typeof o === 'object') return JSON.stringify(o)
  return String(o)
}

// --- Tier 3 ----------------------------------------------------------------

function tier3Match(
  patterns: readonly ConnectionPattern[],
  flat: readonly GodEventForMatch[],
  firstIdx: number,
  lastIdx: number,
  bindings: Bindings,
  naturalConnections: readonly ConnectionEvent[],
): { passed: boolean; divergences: string[] } {
  const divergences: string[] = []
  const startMs = flat[firstIdx]!.nowMs
  const endMs = flat[lastIdx]!.nowMs
  const trailingSlackMs = 10_000
  const windowEnd = endMs + trailingSlackMs

  for (const pat of patterns) {
    const seatId = resolveSeat(pat.seat, bindings)
    if (!seatId) {
      divergences.push(`tier-3: seat ${pat.seat} unresolved for ${pat.transition}`)
      continue
    }
    const found = naturalConnections.some(
      (c) =>
        c.seatId === seatId &&
        c.transition === pat.transition &&
        c.atNowMs >= startMs &&
        c.atNowMs <= windowEnd,
    )
    if (!found) {
      divergences.push(
        `tier-3: expected ${pat.transition} for seat ${pat.seat} (resolved=${seatId}) within window [${startMs}, ${windowEnd}]; not observed in natural connections log`,
      )
    }
  }
  return { passed: divergences.length === 0, divergences }
}

function resolveSeat(seat: string, bindings: Bindings): string | null {
  if (seat === '$ACTOR' || seat === 'ACTOR') return bindings['$ACTOR'] ?? null
  if (seat === '$TARGET' || seat === 'TARGET') return bindings['$TARGET'] ?? null
  return seat
}

// -----------------------------------------------------------------------------
// detectFires — the async disk-reading entry point
// -----------------------------------------------------------------------------

/**
 * Read catalog + events.jsonl + connections.jsonl from disk and return
 * FireRecords. Missing connections.jsonl is tolerated (treated as empty).
 * Malformed JSONL lines are skipped with a single console.warn per file.
 */
export async function detectFires(
  catalogPath: string,
  eventsJsonlPath: string,
  connectionsJsonlPath: string,
  _seatLogPaths: readonly string[],
): Promise<readonly FireRecord[]> {
  const markdown = await readFile(catalogPath, 'utf8')
  const scenarios = parseCatalog(markdown)

  const events = existsSync(eventsJsonlPath)
    ? await readJsonlSafe<GodEvent>(eventsJsonlPath)
    : []
  const connections = existsSync(connectionsJsonlPath)
    ? await readJsonlSafe<ConnectionEvent>(connectionsJsonlPath)
    : []

  return matchFires(scenarios, events, connections)
}

async function readJsonlSafe<T>(p: string): Promise<T[]> {
  const raw = await readFile(p, 'utf8')
  const out: T[] = []
  let skipped = 0
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim() === '') continue
    try {
      out.push(JSON.parse(line) as T)
    } catch {
      skipped++
    }
  }
  if (skipped > 0) {
    console.warn(`[scenario-detector] skipped ${skipped} malformed line(s) in ${p}`)
  }
  return out
}
