/**
 * Phase 5 Unit 3 — `triage-launcher.ts`.
 *
 * Pure rendering + light driver glue. Turns `IssueSeed[]` into N
 * `TriageLaunchSpec` records carrying the fully rendered triage system
 * prompt for each seed. Mirrors phase-4 Unit 2's `agent-launcher.ts`
 * structure for `playtest-seat`.
 *
 * What this module deliberately does NOT do:
 *
 *   - Call the `Agent` tool. The harness runs as a Node process; the
 *     `Agent` tool only exists inside a Claude Code conversation. Unit 3
 *     emits the launch specs; Phase 6 wires the dispatch step.
 *   - Import from `src/server` or `src/shared` (insight 022 quarantine).
 *   - Restrict tool surface — that lives in
 *     `.claude/agents/playtest-triage.md` (insight 020, phase-5 Unit 1b).
 *     The launcher only cares about prompt + spawn metadata.
 *
 * Subagent-type enforcement (phase-5 D16 / R14 / insight 020):
 * `subagentType` is a literal `'playtest-triage'` — TypeScript narrows it
 * at the type system; tests assert `'general-purpose'` is never written
 * (regression mirrors phase-4 Unit 2's spawn-type assertion).
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { IssueSeed, SeedKind } from './types'

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface TriageLaunchSpec {
  readonly seedId: string
  readonly seedKind: SeedKind
  /** `Playtest triage <seedId> (<seedKind>)` — used as the spawning
   *  `Agent` tool's `description` field. */
  readonly description: string
  /** Enforced by `.claude/agents/playtest-triage.md` frontmatter
   *  (phase-5 D16). Never `'general-purpose'`. */
  readonly subagentType: 'playtest-triage'
  /** Fully rendered system prompt, ready to hand to `Agent({ prompt })`. */
  readonly prompt: string
  /** Path the triage agent must Write to (and only that path).
   *  Relative to repo root; orchestrator pre-creates `runs/<id>/issues/`. */
  readonly issuePath: string
}

export interface BuildTriagePromptInput {
  readonly seed: IssueSeed
  readonly runDir: string
  readonly template: string
  /**
   * Path used in the `{{ISSUE_PATH}}` placeholder. Defaults to
   * `<runDir>/issues/<seedId>.md` so the file stays under the run-dir
   * write-scope; callers may override (e.g. tests).
   */
  readonly issuePathOverride?: string
}

export interface BuildTriageLaunchSpecsInput {
  readonly seeds: readonly IssueSeed[]
  readonly runDir: string
  readonly template: string
}

// -----------------------------------------------------------------------------
// Placeholder set (D14 — every placeholder named in phase-5 Unit 1
// "Approach: Placeholders" is rendered here).
// -----------------------------------------------------------------------------

const PLACEHOLDER_NAMES = [
  'SEED_ID',
  'SEED_KIND',
  'SEED_SIGNALS',
  'SEATS_INVOLVED',
  'SCENARIO_IDS',
  'RUN_DIR',
  'CANDIDATE_DUPLICATE',
  'ISSUE_PATH',
  'COLUMN_CONTEXT',
  'ROLE_DRIFT_CONTEXT',
  'FIRE_DIVERGENCE_CONTEXT',
] as const

type PlaceholderName = (typeof PLACEHOLDER_NAMES)[number]

// -----------------------------------------------------------------------------
// Per-seed-kind context renderers
// -----------------------------------------------------------------------------

function renderSeedSignals(seed: IssueSeed): string {
  if (seed.sourceSignals.length === 0) {
    return '- *(no source signals)*'
  }
  return seed.sourceSignals
    .map((s) => {
      const seatPart = s.seatId ? ` (${s.seatId})` : ''
      const linePart = s.line ? `:${s.line}` : ''
      const idPart = s.id ? ` [${s.id}]` : ''
      return `- ${s.source}${seatPart} → ${s.path}${linePart}${idPart}`
    })
    .join('\n')
}

function renderCandidateDuplicate(seed: IssueSeed): string {
  if (!seed.candidateDuplicate) return '(n/a)'
  const linked = seed.candidateDuplicate.linkedE2EIssueId
    ? ` (linked: ${seed.candidateDuplicate.linkedE2EIssueId})`
    : ''
  return `KNOWN-PRODUCT-CALL → ${seed.candidateDuplicate.id}${linked}`
}

function renderColumnContext(seed: IssueSeed): string {
  if (seed.kind !== 'ui-spec-divergence' || !seed.columnContext) return '(n/a)'
  const c = seed.columnContext
  return [
    `scenarioId: ${c.scenarioId}`,
    `rowLabel: ${c.rowLabel}`,
    `agentObservation: ${c.agentObservation}`,
    `projectionSnapshotRef: ${c.projectionSnapshotRef}`,
  ].join('\n')
}

function renderRoleDriftContext(seed: IssueSeed): string {
  if (seed.kind !== 'role-drift' || !seed.roleDrift) return '(n/a)'
  const r = seed.roleDrift
  return [
    `selfLabel: ${r.selfLabel}`,
    `detectorLabel: ${r.detectorLabel}`,
    `atStateVersion: ${r.atStateVersion}`,
  ].join('\n')
}

function renderFireDivergenceContext(seed: IssueSeed): string {
  if (seed.kind !== 'with-divergence-fire' || !seed.fireDivergence) return '(n/a)'
  const f = seed.fireDivergence
  return [
    `scenarioId: ${f.scenarioId}`,
    `failedTier: ${f.failedTier}`,
    `notes: ${f.notes}`,
  ].join('\n')
}

// -----------------------------------------------------------------------------
// Prompt rendering
// -----------------------------------------------------------------------------

export function buildTriagePrompt(input: BuildTriagePromptInput): string {
  const { seed, runDir, template } = input

  // Pre-flight: required-field invariants. Throws BEFORE spawn so an
  // ill-formed seed never reaches a subagent (plan: "Error path: seed
  // missing required fields → throws before spawn").
  if (!seed.seedId || seed.seedId.length === 0) {
    throw new Error('triage-launcher: seed.seedId is required')
  }
  if (!seed.kind) {
    throw new Error('triage-launcher: seed.kind is required')
  }
  if (seed.kind === 'ui-spec-divergence' && !seed.columnContext) {
    throw new Error(
      `triage-launcher: ui-spec-divergence seed ${seed.seedId} missing columnContext`,
    )
  }
  if (seed.kind === 'role-drift' && !seed.roleDrift) {
    throw new Error(
      `triage-launcher: role-drift seed ${seed.seedId} missing roleDrift`,
    )
  }
  if (seed.kind === 'with-divergence-fire' && !seed.fireDivergence) {
    throw new Error(
      `triage-launcher: with-divergence-fire seed ${seed.seedId} missing fireDivergence`,
    )
  }

  const issuePath =
    input.issuePathOverride ?? path.posix.join(runDir, 'issues', `${seed.seedId}.md`)

  const values: Record<PlaceholderName, string> = {
    SEED_ID: seed.seedId,
    SEED_KIND: seed.kind,
    SEED_SIGNALS: renderSeedSignals(seed),
    SEATS_INVOLVED:
      seed.seatsInvolved.length > 0 ? seed.seatsInvolved.join(', ') : '(none)',
    SCENARIO_IDS:
      seed.scenarioIds.length > 0 ? seed.scenarioIds.join(', ') : '(none)',
    RUN_DIR: runDir,
    CANDIDATE_DUPLICATE: renderCandidateDuplicate(seed),
    ISSUE_PATH: issuePath,
    COLUMN_CONTEXT: renderColumnContext(seed),
    ROLE_DRIFT_CONTEXT: renderRoleDriftContext(seed),
    FIRE_DIVERGENCE_CONTEXT: renderFireDivergenceContext(seed),
  }

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (full, name: string) => {
    if (!(PLACEHOLDER_NAMES as readonly string[]).includes(name)) {
      // Unknown placeholder — surface drift loudly rather than dropping
      // content. Mirrors phase-4 Unit 2 behavior.
      return full
    }
    return values[name as PlaceholderName]
  })
}

// -----------------------------------------------------------------------------
// Spec assembly
// -----------------------------------------------------------------------------

export function buildTriageLaunchSpecs(
  input: BuildTriageLaunchSpecsInput,
): TriageLaunchSpec[] {
  const { seeds, runDir, template } = input

  return seeds.map((seed) => {
    const issuePath = path.posix.join(runDir, 'issues', `${seed.seedId}.md`)
    const prompt = buildTriagePrompt({
      seed,
      runDir,
      template,
      issuePathOverride: issuePath,
    })

    return {
      seedId: seed.seedId,
      seedKind: seed.kind,
      description: `Playtest triage ${seed.seedId} (${seed.kind})`,
      subagentType: 'playtest-triage',
      prompt,
      issuePath,
    }
  })
}

// -----------------------------------------------------------------------------
// Template loading
// -----------------------------------------------------------------------------

export const DEFAULT_TRIAGE_TEMPLATE_PATH = 'scripts/playtest/agents/triage.md'

export async function loadDefaultTriageTemplate(repoRoot: string): Promise<string> {
  return readFile(path.join(repoRoot, DEFAULT_TRIAGE_TEMPLATE_PATH), 'utf8')
}

// -----------------------------------------------------------------------------
// Spec-emitter driver (mirrors phase-4 Unit 2 emitLaunchSpecs)
// -----------------------------------------------------------------------------

/**
 * Marker file the Phase 5 driver polls for to know triage agents have
 * finished. The calling Claude Code conversation (or Phase 6 calibration
 * harness) touches this file after all triage subagents exit.
 */
export const TRIAGE_DONE_MARKER = 'triage-done.marker'

export interface EmitTriageSpecsInput extends BuildTriageLaunchSpecsInput {
  readonly outDir?: string
}

export interface EmitTriageSpecsResult {
  readonly specsDir: string
  readonly manifestPath: string
  readonly specs: readonly TriageLaunchSpec[]
}

export async function emitTriageLaunchSpecs(
  input: EmitTriageSpecsInput,
): Promise<EmitTriageSpecsResult> {
  const specs = buildTriageLaunchSpecs(input)
  const specsDir = input.outDir ?? path.join(input.runDir, 'triage-specs')
  await mkdir(specsDir, { recursive: true })
  // Pre-create the issues directory so the spawned agent's Write can
  // succeed without it racing to create the parent.
  await mkdir(path.join(input.runDir, 'issues'), { recursive: true })

  for (const s of specs) {
    const file = path.join(specsDir, `${s.seedId}.json`)
    await writeFile(file, JSON.stringify(s, null, 2), 'utf8')
  }

  const manifestPath = path.join(input.runDir, 'triage-specs.manifest.json')
  const manifest = {
    runDir: input.runDir,
    specsDir,
    seedCount: specs.length,
    seeds: specs.map((s) => ({
      seedId: s.seedId,
      seedKind: s.seedKind,
      issuePath: s.issuePath,
      specPath: path.join(specsDir, `${s.seedId}.json`),
    })),
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  return { specsDir, manifestPath, specs }
}

// -----------------------------------------------------------------------------
// Driver wrapper for orchestrator (Unit 6 wiring)
// -----------------------------------------------------------------------------

export interface CreateTriageLauncherDriverInput {
  readonly seeds: readonly IssueSeed[]
  readonly template: string
  readonly runDir: string
  /** Default 1000ms. */
  readonly pollIntervalMs?: number
  /** Hard wall-clock cap on the wait phase. Default 30 min. */
  readonly waitTimeoutMs?: number
}

/**
 * Build a triage driver compatible with orchestrator's post-session hook.
 *
 * Lifecycle (mirrors phase-4 Unit 2 driver):
 *   1. Emit per-seed launch specs + manifest under `<runDir>/triage-specs/`.
 *   2. Wait for `<runDir>/triage-done.marker` to appear, or the
 *      `waitTimeoutMs` to elapse.
 *   3. Resolve.
 *
 * The actual `Agent(...)` dispatch is performed by the Claude Code
 * conversation that invokes the harness — reading
 * `<runDir>/triage-specs.manifest.json`, spawning one subagent per
 * entry, then touching the marker. Phase 6 wires the two sides.
 */
export function createTriageLauncherDriver(
  input: CreateTriageLauncherDriverInput,
): () => Promise<EmitTriageSpecsResult> {
  return async () => {
    const result = await emitTriageLaunchSpecs({
      seeds: input.seeds,
      runDir: input.runDir,
      template: input.template,
    })

    const markerPath = path.join(input.runDir, TRIAGE_DONE_MARKER)
    const pollMs = input.pollIntervalMs ?? 1000
    const waitMs = input.waitTimeoutMs ?? 30 * 60 * 1000
    const deadline = Date.now() + waitMs

    while (true) {
      if (await fileExists(markerPath)) return result
      if (Date.now() >= deadline) return result
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
