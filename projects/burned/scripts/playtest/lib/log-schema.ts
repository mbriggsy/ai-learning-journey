/**
 * Seat-agent log / suspicion entry schemas (phase-4 Unit 3, D5).
 *
 * Four `entryType` values — `scenario-fire` (log file), `suspicion` /
 * `vibe-check` / `ui-spec-divergence` (suspicion file) — validated by a
 * Zod discriminated union. Consumers: Phase 3's coverage-reporter
 * (self-reports), Phase 5 triage agents (everything).
 *
 * QUARANTINE (insight 022): this module MUST NOT import from `src/server`
 * or `src/shared`. It imports `ROW_DISPLAY_LABELS` from the local mirror
 * at `./types` so the `myRoleLabel` literal union cannot drift silently
 * from phase-1 D5's prose.
 *
 * C4 rename note: `ui-spec-divergence` is the current entryType. A legacy
 * `info-gap-divergence` entryType is accepted by the PARSER with a
 * warning (and coerced to the new name) so Phase 6 calibration runs
 * written before the rename don't disappear — the transition coercion
 * is removed after Phase 6 locks.
 */
import { z } from 'zod'

import { ROW_DISPLAY_LABELS } from './types'

// -----------------------------------------------------------------------------
// Shared fragments.
// -----------------------------------------------------------------------------

/**
 * ISO-8601 timestamp as written by seat agents. Zod's `z.iso.datetime()`
 * accepts common offset forms (`Z`, `+00:00`, etc.) which agents produce
 * via `new Date().toISOString()` or equivalent Playwright snapshots.
 */
const TimestampSchema = z.iso.datetime({ offset: true })

/**
 * Role-label literal union sourced from `ROW_DISPLAY_LABELS` (phase-1 D5).
 * Drift between this schema and the constant is caught at runtime by
 * schema failure AND at typecheck by the `keyof` narrowing below — both
 * directions are watched per Unit 3 verification.
 */
export type RoleLabel = (typeof ROW_DISPLAY_LABELS)[keyof typeof ROW_DISPLAY_LABELS]

const ROLE_LABEL_VALUES = Object.values(ROW_DISPLAY_LABELS) as [
  RoleLabel,
  ...RoleLabel[],
]

const RoleLabelSchema = z.enum(ROLE_LABEL_VALUES)

// -----------------------------------------------------------------------------
// Per-entryType schemas. All use `.loose()` (permissive) so extra fields
// a future prompt revision adds don't break historical runs.
// -----------------------------------------------------------------------------

/** D6: structured catalog-fire self-report (written to the LOG file). */
export const ScenarioFireEntrySchema = z
  .object({
    entryType: z.literal('scenario-fire'),
    scenarioId: z.string().min(1),
    seat: z.string().min(1),
    seatName: z.string().min(1),
    timestamp: TimestampSchema,
    triggeringAction: z.unknown(),
    preObservation: z.unknown(),
    postObservation: z.unknown(),
  })
  .loose()

/** D7: low-friction "this felt off" (written to the SUSPICION file). */
export const SuspicionEntrySchema = z
  .object({
    entryType: z.literal('suspicion'),
    seat: z.string().min(1),
    seatName: z.string().min(1),
    timestamp: TimestampSchema,
    severity: z.enum(['low', 'medium', 'high']),
    relatedScenario: z.union([z.string().min(1), z.null()]),
    questionsTried: z.array(z.string()).default([]),
  })
  .loose()

/**
 * R9 / D12 / I8: Archer-beat self-report with concrete rubric. `'unsure'`
 * is a valid and valuable answer; `proseRationale` must be ≥10 chars to
 * catch boilerplate one-word answers without over-constraining
 * legitimate short prose.
 */
export const VibeCheckEntrySchema = z
  .object({
    entryType: z.literal('vibe-check'),
    seat: z.string().min(1),
    seatName: z.string().min(1),
    timestamp: TimestampSchema,
    relatedScenario: z.union([z.string().min(1), z.null()]),
    feltLikeArcher: z.enum(['yes', 'no', 'unsure']),
    vibeCheckPrompt: z.string().min(1),
    proseRationale: z.string().min(10),
  })
  .loose()

/**
 * R8 / R14 / C4: "my phone contradicts the Column 2 prose for my role."
 * `myRoleLabel` must be a LITERAL ROW_DISPLAY_LABELS value — any
 * prompt-renderer drift (e.g. `'SPECTATOR'` instead of
 * `'SPECTATOR (eliminated, connected)'`) is a parse error, not silent
 * acceptance.
 */
export const UiSpecDivergenceEntrySchema = z
  .object({
    entryType: z.literal('ui-spec-divergence'),
    seat: z.string().min(1),
    seatName: z.string().min(1),
    timestamp: TimestampSchema,
    myRoleLabel: RoleLabelSchema,
    relatedScenario: z.union([z.string().min(1), z.null()]),
    column2Expected: z.string().min(1),
    observedOnPhone: z.string().min(1),
    screenshotHash: z.string().min(1),
  })
  .loose()

// -----------------------------------------------------------------------------
// Discriminated union over `entryType`.
// -----------------------------------------------------------------------------

export const LogEntrySchema = z.discriminatedUnion('entryType', [
  ScenarioFireEntrySchema,
  SuspicionEntrySchema,
  VibeCheckEntrySchema,
  UiSpecDivergenceEntrySchema,
])

export type ScenarioFireEntry = z.infer<typeof ScenarioFireEntrySchema>
export type SuspicionEntry = z.infer<typeof SuspicionEntrySchema>
export type VibeCheckEntry = z.infer<typeof VibeCheckEntrySchema>
export type UiSpecDivergenceEntry = z.infer<typeof UiSpecDivergenceEntrySchema>
export type LogEntry = z.infer<typeof LogEntrySchema>

/**
 * Current entryType literals — exported so the parser can list them in
 * helpful error messages without re-declaring.
 */
export const KNOWN_ENTRY_TYPES = [
  'scenario-fire',
  'suspicion',
  'vibe-check',
  'ui-spec-divergence',
] as const

/**
 * Legacy entryType → current entryType. Removed after Phase 6 locks per
 * the C4 rename deprecation plan. Emits a parse WARNING, not an error;
 * entries are coerced and still added to the result set.
 */
export const LEGACY_ENTRY_TYPE_RENAMES: Readonly<Record<string, (typeof KNOWN_ENTRY_TYPES)[number]>> =
  {
    'info-gap-divergence': 'ui-spec-divergence',
  }
