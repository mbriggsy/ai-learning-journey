/**
 * Agent-launcher (phase-4 Unit 2).
 *
 * Pure rendering + light driver glue. Turns `SeatHandle[] + ParsedScenario[]
 * + FreePlayBudget` into N `SeatLaunchSpec` records containing the fully
 * rendered scripted-or-free-play system prompt for each seat.
 *
 * What this module deliberately does NOT do:
 *
 *   - Call the `Agent` tool. The orchestrator runs as a Node process;
 *     the `Agent` tool only exists inside a Claude Code conversation.
 *     Unit 2 emits the prompt specs; the calling conversation dispatches
 *     the subagents. Phase 6 first-real-session wires the dispatch step.
 *   - Import from `src/server` or `src/shared` (insight 022 quarantine).
 *   - Restrict tool surface — that lives in `.claude/agents/playtest-seat.md`
 *     (insight 020, phase-4 Unit 1b). The launcher only cares about
 *     prompt + spawn metadata.
 *
 * Execution-note from plan: "Test-first on the renderer; integration-
 * tested via Phase 6 calibration." Pure functions below have full unit
 * coverage in `agent-launcher.test.ts`; the emit-to-disk driver has
 * narrower coverage (it is a filesystem wrapper).
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { ROW_DISPLAY_LABELS, type SeatHandle, type ViewerRole } from './types'
import type { ParsedScenario } from './scenario-detector'

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type Mode = 'scripted' | 'free-play'

export interface SeatLaunchSpec {
  readonly seatId: string
  readonly seatName: string
  /** `Playtest seat <id> (<mode>)` — used as the spawning `Agent` tool's `description` field. */
  readonly description: string
  /** Enforced by `.claude/agents/playtest-seat.md` frontmatter (phase-4 D2). Never `'general-purpose'`. */
  readonly subagentType: 'playtest-seat'
  /** Fully rendered system prompt, ready to hand to `Agent({ prompt })`. */
  readonly prompt: string
  readonly mode: Mode
  /** Seat's role at spawn time per phase-4 D16 rubric (agent re-evaluates per turn). */
  readonly role: ViewerRole
  readonly logPath: string
  readonly suspicionPath: string
}

export interface OtherSeatPublic {
  readonly seatId: string
  readonly seatName: string
}

export interface BuildLaunchSpecsInput {
  readonly seats: readonly SeatHandle[]
  readonly catalog: readonly ParsedScenario[]
  readonly modeSignal: Mode
  readonly sessionTimeoutMs: number
  readonly startingSeatIndex?: number
  readonly scriptedTemplate: string
  readonly freePlayTemplate: string
}

// -----------------------------------------------------------------------------
// Role inference (D16 rubric — pre-turn defaulting)
// -----------------------------------------------------------------------------

/**
 * Best-effort initial role at spawn time. The agent re-reads its role
 * per-turn via the D16 rubric injected in the prompt; this value is only
 * used to decide which scenarios to inject with full detail vs a
 * one-line pointer (phase-4 D18 / I6).
 *
 *   - `turnIndex === seatIndex` → `ACTOR` (this seat will start the turn).
 *   - Otherwise → `OTHER_ALIVE` (public viewer; no pending prompt yet).
 *
 * `turnIndex < 0` (pre-lobby-start) degrades to `OTHER_ALIVE` for every
 * seat — pre-game nobody is acting.
 */
export function inferInitialRole(
  seatIndex: number,
  turnIndex: number,
): ViewerRole {
  if (turnIndex < 0) return 'OTHER_ALIVE'
  return turnIndex === seatIndex ? 'ACTOR' : 'OTHER_ALIVE'
}

// -----------------------------------------------------------------------------
// Catalog rendering
// -----------------------------------------------------------------------------

/**
 * Per-role catalog injection with phase-4 D18 / I6 pre-filter.
 *
 * Scenarios fall into three buckets per-seat:
 *   1. Primary fire-signature role (ACTOR or TARGET) → full detail:
 *      id + title + trigger conditions + recognition criteria +
 *      suspicion prompts + Column 2 prose for THIS role + vibe-check.
 *   2. Non-primary but present (`infoGap[role]` has any column present) →
 *      one-line awareness pointer.
 *   3. Role is not present in `infoGap` (N/A on both columns) → skipped.
 *
 * Column 1 prose is NEVER injected — it is server-internal and
 * unobservable from a seat (phase-4 C4 / D11). Phase 5 triage handles
 * Column-1-vs-Column-2 analytics.
 */
export function renderScriptedCatalogForRole(
  catalog: readonly ParsedScenario[],
  role: ViewerRole,
): string {
  const blocks: string[] = []
  for (const scn of catalog) {
    const role_ig = scn.infoGap?.[role]
    const hasPresence =
      role_ig !== undefined &&
      (role_ig.column1Present || role_ig.column2Present)
    if (!hasPresence) continue

    if (isRolePrimaryInFireSignature(scn, role)) {
      blocks.push(renderFullScenarioBlock(scn, role))
    } else {
      blocks.push(renderScenarioPointer(scn, role))
    }
  }

  if (blocks.length === 0) {
    return '_No scenarios scoped to your role in this segment. Play naturally and log anything strange._'
  }

  return blocks.join('\n\n---\n\n')
}

export function renderFreePlayPointer(catalog: readonly ParsedScenario[]): string {
  // Catalog reference is intentional — the agent knows the full set EXISTS
  // elsewhere in the session even though this segment ignores it.
  return [
    '_The full scenario catalog exists in other segments of this session._',
    `_This free-play segment intentionally ignores it (${catalog.length} scenarios available elsewhere)._`,
    '',
    'Log suspicions + vibe-checks + ui-spec divergences freely. Explore',
    'edge cases; the goal is variety, not victory.',
  ].join('\n')
}

function isRolePrimaryInFireSignature(
  scn: ParsedScenario,
  role: ViewerRole,
): boolean {
  if (role === 'ACTOR') {
    return scn.events.some(
      (e) =>
        typeof e.where?.playerId === 'string' && e.where.playerId === '$ACTOR',
    )
  }
  if (role === 'TARGET') {
    return scn.events.some(
      (e) =>
        typeof e.where?.playerId === 'string' && e.where.playerId === '$TARGET',
    )
  }
  return false
}

function renderFullScenarioBlock(
  scn: ParsedScenario,
  role: ViewerRole,
): string {
  const roleLabel = ROW_DISPLAY_LABELS[role]
  const column2 = scn.infoGap?.[role]?.column2Prose
  const trigger = scn.triggerConditions ?? '_(unspecified in catalog)_'
  const recognize = scn.recognitionCriteria ?? '_(unspecified in catalog)_'
  const ask = scn.suspicionPrompts ?? '_(unspecified in catalog)_'
  const vibe = scn.vibeCheck ?? 'Did this moment feel like an Archer beat?'
  const c2 = column2 && column2.trim().length > 0
    ? column2
    : '_(no Column 2 prose captured — flag if your phone feels off)_'

  return [
    `### ${scn.id} — ${scn.title}`,
    '',
    `_You are ${roleLabel} on this scenario._`,
    '',
    '**Trigger conditions:**',
    trigger,
    '',
    '**Recognize when:**',
    recognize,
    '',
    '**Ask yourself:**',
    ask,
    '',
    `**What you (${roleLabel}) SHOULD see (Column 2):**`,
    c2,
    '',
    '**Vibe check:**',
    vibe,
  ].join('\n')
}

function renderScenarioPointer(scn: ParsedScenario, role: ViewerRole): string {
  const roleLabel = ROW_DISPLAY_LABELS[role]
  return `- **${scn.id}** — ${scn.title} _(you are ${roleLabel}; flag anything strange)_`
}

// -----------------------------------------------------------------------------
// Prompt substitution
// -----------------------------------------------------------------------------

const PLACEHOLDER_NAMES = [
  'SEAT_ID',
  'SEAT_NAME',
  'ROOM_CODE',
  'VIEWPORT_LABEL',
  'VIEWPORT_WIDTH',
  'VIEWPORT_HEIGHT',
  'OTHER_SEATS_JSON',
  'CATALOG_TEXT',
  'LOG_PATH',
  'SUSPICION_PATH',
  'SESSION_TIMEOUT_MS',
] as const

type PlaceholderName = (typeof PLACEHOLDER_NAMES)[number]

export interface BuildSeatPromptInput {
  readonly seat: SeatHandle
  readonly otherSeats: readonly OtherSeatPublic[]
  readonly catalogText: string
  readonly sessionTimeoutMs: number
  readonly template: string
}

export function buildSeatPrompt(input: BuildSeatPromptInput): string {
  const { seat, otherSeats, catalogText, sessionTimeoutMs, template } = input

  if (seat.roomCode === '' || seat.roomCode === undefined) {
    throw new Error(
      `buildSeatPrompt: seat ${seat.seatId} is missing required \`roomCode\` (phase-3 I2).`,
    )
  }

  const values: Record<PlaceholderName, string> = {
    SEAT_ID: seat.seatId,
    SEAT_NAME: seat.seatName,
    ROOM_CODE: seat.roomCode,
    VIEWPORT_LABEL: seat.viewport.label,
    VIEWPORT_WIDTH: String(seat.viewport.width),
    VIEWPORT_HEIGHT: String(seat.viewport.height),
    OTHER_SEATS_JSON: JSON.stringify(otherSeats, null, 2),
    CATALOG_TEXT: catalogText,
    LOG_PATH: seat.logPath,
    SUSPICION_PATH: seat.suspicionPath,
    SESSION_TIMEOUT_MS: String(sessionTimeoutMs),
  }

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (full, name: string) => {
    if (!(PLACEHOLDER_NAMES as readonly string[]).includes(name)) {
      // Unknown placeholder — leave as-is to surface the drift loudly in
      // the rendered prompt rather than silently dropping content.
      return full
    }
    return values[name as PlaceholderName]
  })
}

// -----------------------------------------------------------------------------
// Spec assembly
// -----------------------------------------------------------------------------

export function buildLaunchSpecs(input: BuildLaunchSpecsInput): SeatLaunchSpec[] {
  const {
    seats,
    catalog,
    modeSignal,
    sessionTimeoutMs,
    startingSeatIndex = 0,
    scriptedTemplate,
    freePlayTemplate,
  } = input

  return seats.map((seat, seatIndex) => {
    const role = inferInitialRole(seatIndex, startingSeatIndex)
    const catalogText =
      modeSignal === 'free-play'
        ? renderFreePlayPointer(catalog)
        : renderScriptedCatalogForRole(catalog, role)

    const template = modeSignal === 'free-play' ? freePlayTemplate : scriptedTemplate

    const otherSeats: OtherSeatPublic[] = seats
      .filter((s) => s.seatId !== seat.seatId)
      .map((s) => ({ seatId: s.seatId, seatName: s.seatName }))

    const prompt = buildSeatPrompt({
      seat,
      otherSeats,
      catalogText,
      sessionTimeoutMs,
      template,
    })

    return {
      seatId: seat.seatId,
      seatName: seat.seatName,
      description: `Playtest seat ${seat.seatId} (${modeSignal})`,
      subagentType: 'playtest-seat',
      prompt,
      mode: modeSignal,
      role,
      logPath: seat.logPath,
      suspicionPath: seat.suspicionPath,
    }
  })
}

// -----------------------------------------------------------------------------
// Template loading
// -----------------------------------------------------------------------------

/**
 * Default template paths relative to the repo root. Agents-dir is under
 * `scripts/playtest/agents/` (phase-4 Unit 1 location).
 */
export const DEFAULT_SCRIPTED_TEMPLATE_PATH =
  'scripts/playtest/agents/seat-scripted.md'
export const DEFAULT_FREEPLAY_TEMPLATE_PATH =
  'scripts/playtest/agents/seat-free-play.md'

export async function loadDefaultTemplates(
  repoRoot: string,
): Promise<{ scriptedTemplate: string; freePlayTemplate: string }> {
  const [scriptedTemplate, freePlayTemplate] = await Promise.all([
    readFile(path.join(repoRoot, DEFAULT_SCRIPTED_TEMPLATE_PATH), 'utf8'),
    readFile(path.join(repoRoot, DEFAULT_FREEPLAY_TEMPLATE_PATH), 'utf8'),
  ])
  return { scriptedTemplate, freePlayTemplate }
}

// -----------------------------------------------------------------------------
// Spec-emitter driver (production wrapper for phase-4 Unit 2 + phase-3 Unit 6)
// -----------------------------------------------------------------------------

/**
 * Emit one JSON file per seat under `<runDir>/agent-specs/` plus a
 * manifest the calling Claude Code conversation uses to dispatch
 * subagents in parallel via the `Agent` tool.
 *
 * This is the current Phase 4 hand-off: the Node process renders the
 * prompts; the Claude Code conversation owns the `Agent(...)` calls.
 * Phase 6 wires the two sides.
 */
export interface EmitSpecsInput extends BuildLaunchSpecsInput {
  readonly runDir: string
}

export interface EmitSpecsResult {
  readonly specsDir: string
  readonly manifestPath: string
  readonly specs: readonly SeatLaunchSpec[]
}

/**
 * Marker file the Phase 4 driver polls for to know agents have finished.
 * The calling Claude Code conversation (or the Phase 5 triage step,
 * depending on where dispatch lands) touches this file after all seat
 * subagents exit. Kept under the run dir so it tears down with the rest.
 */
export const AGENTS_DONE_MARKER = 'agents-done.marker'

export interface CreateAgentLauncherDriverInput {
  readonly catalog: readonly ParsedScenario[]
  readonly modeSignal: Mode
  readonly sessionTimeoutMs: number
  readonly scriptedTemplate: string
  readonly freePlayTemplate: string
  readonly runDir: string
  readonly startingSeatIndex?: number
  /**
   * Poll interval for the `agents-done.marker` file. Default 1000 ms.
   * Overridable for tests.
   */
  readonly pollIntervalMs?: number
  /**
   * Optional hard wallclock limit on the wait phase, independent of the
   * session timeout. Used by tests to bound the marker-file wait. If
   * unset, defaults to `sessionTimeoutMs`.
   */
  readonly waitTimeoutMs?: number
}

/**
 * Build a `seatDriver` compatible with `orchestrator.runSession`'s
 * injection point.
 *
 * Lifecycle:
 *   1. Emit per-seat launch specs + manifest under `<runDir>/agent-specs/`.
 *   2. Wait for the `agents-done.marker` file under `<runDir>` to appear,
 *      or for `waitTimeoutMs` to elapse (whichever comes first).
 *   3. Resolve.
 *
 * The actual `Agent(...)` dispatch is performed by the Claude Code
 * conversation that invokes the harness — reading
 * `<runDir>/agent-specs.manifest.json`, spawning one subagent per entry,
 * then touching the marker. Phase 6 wires the two sides.
 */
export function createAgentLauncherDriver(
  input: CreateAgentLauncherDriverInput,
): (seats: readonly SeatHandle[]) => Promise<void> {
  return async (seats) => {
    await emitLaunchSpecs({
      seats,
      catalog: input.catalog,
      modeSignal: input.modeSignal,
      sessionTimeoutMs: input.sessionTimeoutMs,
      startingSeatIndex: input.startingSeatIndex,
      scriptedTemplate: input.scriptedTemplate,
      freePlayTemplate: input.freePlayTemplate,
      runDir: input.runDir,
    })

    const markerPath = path.join(input.runDir, AGENTS_DONE_MARKER)
    const pollMs = input.pollIntervalMs ?? 1000
    const waitMs = input.waitTimeoutMs ?? input.sessionTimeoutMs
    const deadline = Date.now() + waitMs

    // Poll for the marker. Avoid busy-looping — a 1s cadence is plenty
    // for a session that expects agents to run for minutes.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (await fileExists(markerPath)) return
      if (Date.now() >= deadline) return
      await new Promise<void>((resolve) => setTimeout(resolve, pollMs))
    }
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

export async function emitLaunchSpecs(
  input: EmitSpecsInput,
): Promise<EmitSpecsResult> {
  const specs = buildLaunchSpecs(input)
  const specsDir = path.join(input.runDir, 'agent-specs')
  await mkdir(specsDir, { recursive: true })

  for (const spec of specs) {
    const filePath = path.join(specsDir, `${spec.seatId}.json`)
    await writeFile(filePath, JSON.stringify(spec, null, 2), 'utf8')
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    modeSignal: input.modeSignal,
    seats: specs.map((s) => ({
      seatId: s.seatId,
      seatName: s.seatName,
      subagentType: s.subagentType,
      description: s.description,
      mode: s.mode,
      role: s.role,
      specPath: path.join('agent-specs', `${s.seatId}.json`),
    })),
  }
  const manifestPath = path.join(input.runDir, 'agent-specs.manifest.json')
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  return { specsDir, manifestPath, specs }
}
