/**
 * Playtest session config — Zod schema (Phase 6 Unit 4).
 *
 * This is the SINGLE SOURCE OF TRUTH for config validation. Callers
 * (`pnpm playtest:run`, `pnpm playtest:pre-flight`, series configs,
 * calibration.json) parse raw JSON through `ConfigSchema.parse` or
 * `parseConfig` below — never hand-roll their own shape check.
 *
 * Mirrors `Config` in `./types.ts:157-184` character-for-character.
 * Uses `.strict()` so unknown fields are rejected at parse time —
 * guards against silent drift where a typo'd field name (e.g.
 * `nopeWindowMS` vs `nopeWindowMs`) would otherwise land as a no-op.
 *
 * Phase 6 extensions on the underlying Config shape:
 *   - `scenarioFilter?: string[]` — per-series D8 filter. Omitted =
 *     run full catalog. Series #1 runs full catalog; series #2+ may
 *     filter down per TUNING-LOG.md follow-ups.
 *   - `sessionTimeoutMs` — required; formerly optional. Scales with
 *     seat count in series configs (60 min + 10 min per seat beyond 3).
 *
 * QUARANTINE (insight 022): no imports from `src/server` or `src/shared`.
 */
import { z } from 'zod'

import type { Config } from './types'

// -----------------------------------------------------------------------------
// Viewport — mirrors `Viewport` in types.ts:115-119
// -----------------------------------------------------------------------------

export const ViewportSchema = z
  .object({
    width: z.union([z.literal(360), z.literal(390), z.literal(768)]),
    height: z.union([z.literal(640), z.literal(844), z.literal(1024)]),
    label: z.string().min(1),
  })
  .strict()

// -----------------------------------------------------------------------------
// Config — mirrors `Config` in types.ts:157-184
// -----------------------------------------------------------------------------

export const ConfigSchema = z
  .object({
    seats: z.number().int().min(2).max(10),
    seatNames: z.array(z.string().min(1)).optional(),
    seed: z.number().int().optional(),
    nopeWindowMs: z.number().int().nonnegative().optional(),
    sessionTimeoutMs: z.number().int().positive(),
    roomCode: z.string().min(1).optional(),
    catalogPath: z.string().min(1),
    outputRoot: z.string().min(1),
    viewports: z.array(ViewportSchema).min(1),
    freePlayWallclockFraction: z.number().min(0).max(1),
    sessionDirRetention: z.number().int().nonnegative(),
    scrubMode: z.union([z.literal('on'), z.literal('off')]),
    godReassemblyTimeoutMs: z.number().int().positive(),
    godOriginAllowlist: z.array(z.string().min(1)).optional(),

    // Phase 6 extension (D8). Per-series scenario filter. Omitted = run
    // full catalog (series #1 default). series #2+ may opt into filtering
    // via TUNING-LOG.md follow-ups.
    scenarioFilter: z.array(z.string().min(1)).optional(),

    // Coverage primary-gate override. PRD §8.2 default is 50 (applied
    // inside `buildCoverageReport` when omitted). Calibration / mini-catalog
    // configs lower this so a 6-scenario fixture can ever pass the gate.
    coverageThreshold: z.number().int().positive().optional(),
  })
  .strict()

/**
 * Parse raw JSON (from `fs.readFile` of a config file, typically) into
 * a validated `Config`. Throws `ZodError` with the exact failing path
 * if the shape is wrong — callers should let it propagate so the
 * operator sees which field tripped.
 */
export function parseConfig(raw: unknown): Config {
  // The TS `Config` type is structurally compatible with the parsed
  // output: `readonly` modifiers don't exist at runtime, and the Zod
  // `optional` fields produce `T | undefined` which matches the
  // `field?: T` shape exactly.
  return ConfigSchema.parse(raw) as Config
}
