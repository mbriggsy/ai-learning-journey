/**
 * Phase 6 Unit 4 — ConfigSchema tests.
 *
 * Mechanically validates that the 5 series configs + calibration.json
 * parse cleanly against the single-source-of-truth schema, AND that
 * `.strict()` is catching the two drift modes we care about:
 *
 *   1. Unknown field (typo: `nopeWindowMS` instead of `nopeWindowMs`).
 *   2. Missing required field (`sessionTimeoutMs` absent).
 *
 * Every error-path test is paired with a happy-path companion (insight
 * 027) — otherwise the gate could pass vacuously when the schema is
 * accidentally permissive.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { describe, it, expect } from 'vitest'

import { ConfigSchema, ViewportSchema, parseConfig } from './config-schema'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')

/** Absolute paths to every real config file shipped with the harness. */
const CONFIG_FILES: readonly { name: string; relPath: string }[] = [
  { name: 'calibration.json', relPath: 'scripts/playtest/config/calibration.json' },
  { name: 'series-2p.json', relPath: 'scripts/playtest/config/series-2p.json' },
  { name: 'series-3p.json', relPath: 'scripts/playtest/config/series-3p.json' },
  { name: 'series-5p.json', relPath: 'scripts/playtest/config/series-5p.json' },
  { name: 'series-8p.json', relPath: 'scripts/playtest/config/series-8p.json' },
  { name: 'series-10p.json', relPath: 'scripts/playtest/config/series-10p.json' },
]

/** Baseline valid config body, used for error-path mutations. */
function validBody(): Record<string, unknown> {
  return {
    seats: 3,
    seed: 1,
    nopeWindowMs: 300000,
    sessionTimeoutMs: 900000,
    catalogPath: 'docs/testing/playtest/SCENARIOS.md',
    outputRoot: 'docs/testing/playtest/runs',
    viewports: [
      { width: 390, height: 844, label: '390x844' },
    ],
    freePlayWallclockFraction: 0.2,
    sessionDirRetention: 10,
    scrubMode: 'on',
    godReassemblyTimeoutMs: 5000,
  }
}

// ---------------------------------------------------------------------------
// Real config file round-trip — every shipped JSON must parse clean
// ---------------------------------------------------------------------------

describe('ConfigSchema — real config files', () => {
  for (const cfg of CONFIG_FILES) {
    it(`parses ${cfg.name} without Zod error`, async () => {
      const raw = await fs.readFile(path.join(REPO_ROOT, cfg.relPath), 'utf8')
      const parsed = JSON.parse(raw) as unknown
      expect(() => ConfigSchema.parse(parsed)).not.toThrow()
    })
  }

  it('parseConfig helper returns the parsed Config for calibration.json', async () => {
    const raw = await fs.readFile(
      path.join(REPO_ROOT, 'scripts/playtest/config/calibration.json'),
      'utf8',
    )
    const parsed = parseConfig(JSON.parse(raw) as unknown)
    expect(parsed.seats).toBe(3)
    expect(parsed.scrubMode).toBe('on')
    expect(parsed.viewports.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Series-1 seeds lock (per plan §Series 1: "Seeds: 1002, 1003, 1005, 1008, 1010")
// ---------------------------------------------------------------------------

describe('Series-1 seeds lock', () => {
  it('series-Np.json seeds are 1000 + N (distinct per config)', async () => {
    const expected: readonly [string, number][] = [
      ['series-2p.json', 1002],
      ['series-3p.json', 1003],
      ['series-5p.json', 1005],
      ['series-8p.json', 1008],
      ['series-10p.json', 1010],
    ]
    for (const [file, seed] of expected) {
      const raw = await fs.readFile(
        path.join(REPO_ROOT, 'scripts/playtest/config', file),
        'utf8',
      )
      const cfg = parseConfig(JSON.parse(raw) as unknown)
      expect(cfg.seed).toBe(seed)
    }
  })

  it('sessionTimeoutMs scales as 3_600_000 + 600_000 × max(0, N-3)', async () => {
    const expected: readonly [string, number, number][] = [
      // [file, seats, expected sessionTimeoutMs]
      ['series-2p.json', 2, 3_600_000],
      ['series-3p.json', 3, 3_600_000],
      ['series-5p.json', 5, 4_800_000],
      ['series-8p.json', 8, 6_600_000],
      ['series-10p.json', 10, 7_800_000],
    ]
    for (const [file, seats, ms] of expected) {
      const raw = await fs.readFile(
        path.join(REPO_ROOT, 'scripts/playtest/config', file),
        'utf8',
      )
      const cfg = parseConfig(JSON.parse(raw) as unknown)
      expect(cfg.seats).toBe(seats)
      expect(cfg.sessionTimeoutMs).toBe(ms)
    }
  })

  it('series configs all point at the real SCENARIOS.md catalog (not mini)', async () => {
    for (const file of ['series-2p.json', 'series-3p.json', 'series-5p.json', 'series-8p.json', 'series-10p.json']) {
      const raw = await fs.readFile(
        path.join(REPO_ROOT, 'scripts/playtest/config', file),
        'utf8',
      )
      const cfg = parseConfig(JSON.parse(raw) as unknown)
      expect(cfg.catalogPath).toBe('docs/testing/playtest/SCENARIOS.md')
    }
  })
})

// ---------------------------------------------------------------------------
// .strict() — happy path + error path companions
// ---------------------------------------------------------------------------

describe('ConfigSchema — .strict() guards', () => {
  it('happy path — clean body parses', () => {
    expect(() => ConfigSchema.parse(validBody())).not.toThrow()
  })

  it('rejects unknown top-level field (typo detection)', () => {
    const mutated = { ...validBody(), nonExistentField: 'x' }
    expect(() => ConfigSchema.parse(mutated)).toThrow()
  })

  it('rejects typo like `nopeWindowMS` (case-sensitivity drift)', () => {
    const body = validBody()
    // Drop the real key, add the misspelled one.
    delete (body as { nopeWindowMs?: unknown }).nopeWindowMs
    const mutated = { ...body, nopeWindowMS: 300000 }
    expect(() => ConfigSchema.parse(mutated)).toThrow()
  })

  it('rejects unknown field inside viewport entries', () => {
    const mutated = {
      ...validBody(),
      viewports: [{ width: 390, height: 844, label: '390x844', rotation: 'portrait' }],
    }
    expect(() => ConfigSchema.parse(mutated)).toThrow()
  })

  it('accepts the Phase 6 scenarioFilter extension', () => {
    const mutated = { ...validBody(), scenarioFilter: ['SCN-A', 'SCN-B'] }
    expect(() => ConfigSchema.parse(mutated)).not.toThrow()
  })

  it('accepts coverageThreshold as a positive integer override', () => {
    const mutated = { ...validBody(), coverageThreshold: 6 }
    const parsed = ConfigSchema.parse(mutated)
    expect(parsed.coverageThreshold).toBe(6)
  })

  it('coverageThreshold is optional (omitted is the default-50 case)', () => {
    const parsed = ConfigSchema.parse(validBody())
    expect(parsed.coverageThreshold).toBeUndefined()
  })

  it('rejects coverageThreshold === 0 (must be positive)', () => {
    expect(() =>
      ConfigSchema.parse({ ...validBody(), coverageThreshold: 0 }),
    ).toThrow()
  })

  it('rejects negative coverageThreshold', () => {
    expect(() =>
      ConfigSchema.parse({ ...validBody(), coverageThreshold: -1 }),
    ).toThrow()
  })

  it('rejects non-integer coverageThreshold (e.g. 6.5)', () => {
    expect(() =>
      ConfigSchema.parse({ ...validBody(), coverageThreshold: 6.5 }),
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Required-field enforcement
// ---------------------------------------------------------------------------

describe('ConfigSchema — required fields', () => {
  it('happy path — all required fields present', () => {
    expect(() => ConfigSchema.parse(validBody())).not.toThrow()
  })

  it('rejects missing sessionTimeoutMs', () => {
    const body = validBody()
    delete (body as { sessionTimeoutMs?: unknown }).sessionTimeoutMs
    expect(() => ConfigSchema.parse(body)).toThrow(/sessionTimeoutMs/)
  })

  it('rejects missing seats', () => {
    const body = validBody()
    delete (body as { seats?: unknown }).seats
    expect(() => ConfigSchema.parse(body)).toThrow(/seats/)
  })

  it('rejects missing catalogPath', () => {
    const body = validBody()
    delete (body as { catalogPath?: unknown }).catalogPath
    expect(() => ConfigSchema.parse(body)).toThrow(/catalogPath/)
  })

  it('rejects missing scrubMode', () => {
    const body = validBody()
    delete (body as { scrubMode?: unknown }).scrubMode
    expect(() => ConfigSchema.parse(body)).toThrow(/scrubMode/)
  })
})

// ---------------------------------------------------------------------------
// Field-value enforcement
// ---------------------------------------------------------------------------

describe('ConfigSchema — field-value constraints', () => {
  it('rejects seats < 2', () => {
    const body = { ...validBody(), seats: 1 }
    expect(() => ConfigSchema.parse(body)).toThrow()
  })

  it('rejects seats > 10', () => {
    const body = { ...validBody(), seats: 11 }
    expect(() => ConfigSchema.parse(body)).toThrow()
  })

  it('rejects scrubMode values outside the on/off union', () => {
    const body = { ...validBody(), scrubMode: 'maybe' }
    expect(() => ConfigSchema.parse(body)).toThrow()
  })

  it('rejects freePlayWallclockFraction outside [0, 1]', () => {
    expect(() => ConfigSchema.parse({ ...validBody(), freePlayWallclockFraction: -0.1 })).toThrow()
    expect(() => ConfigSchema.parse({ ...validBody(), freePlayWallclockFraction: 1.5 })).toThrow()
  })

  it('rejects sessionTimeoutMs <= 0', () => {
    expect(() => ConfigSchema.parse({ ...validBody(), sessionTimeoutMs: 0 })).toThrow()
    expect(() => ConfigSchema.parse({ ...validBody(), sessionTimeoutMs: -1 })).toThrow()
  })

  it('rejects empty viewports array', () => {
    expect(() => ConfigSchema.parse({ ...validBody(), viewports: [] })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// ViewportSchema
// ---------------------------------------------------------------------------

describe('ViewportSchema', () => {
  it('accepts each of the 3 canonical widths × heights', () => {
    const widths: readonly (360 | 390 | 768)[] = [360, 390, 768]
    const heights: readonly (640 | 844 | 1024)[] = [640, 844, 1024]
    for (const w of widths) {
      for (const h of heights) {
        expect(() =>
          ViewportSchema.parse({ width: w, height: h, label: `${w}x${h}` }),
        ).not.toThrow()
      }
    }
  })

  it('rejects non-canonical width', () => {
    expect(() => ViewportSchema.parse({ width: 400, height: 844, label: '400x844' })).toThrow()
  })

  it('rejects non-canonical height', () => {
    expect(() => ViewportSchema.parse({ width: 390, height: 800, label: '390x800' })).toThrow()
  })

  it('rejects empty label', () => {
    expect(() => ViewportSchema.parse({ width: 390, height: 844, label: '' })).toThrow()
  })
})
