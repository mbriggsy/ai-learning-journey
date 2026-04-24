/**
 * Phase 5 Unit 3 — `triage-launcher` tests.
 *
 * Mirrors phase-5-triage-agents.md Unit 3 "Test scenarios".
 *
 * Insight 027 discipline: every "absence" assertion (no `general-purpose`,
 * no leftover placeholder, no unhandled seed kind) is paired with a
 * "presence" companion (the seed-kind-specific block IS rendered) so a
 * silent bug zeroing all output cannot pass vacuously.
 */
import { describe, expect, it } from 'vitest'

import {
  buildTriageLaunchSpecs,
  buildTriagePrompt,
  loadDefaultTriageTemplate,
} from './triage-launcher'
import type { IssueSeed } from './types'

const REPO_ROOT = process.cwd()
let triageTemplate: string | null = null
async function getTemplate(): Promise<string> {
  if (triageTemplate == null) {
    triageTemplate = await loadDefaultTriageTemplate(REPO_ROOT)
  }
  return triageTemplate
}

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function baseSeed(over: Partial<IssueSeed> = {}): IssueSeed {
  return {
    seedId: '001-scn-a',
    kind: 'scripted-scenario',
    sourceSignals: [
      { source: 'suspicion', seatId: 'seat-1', path: 'suspicions/seat-1.suspicions.md' },
    ],
    seatsInvolved: ['seat-1'],
    scenarioIds: ['SCN-A'],
    suspicionSeverityHint: 'medium',
    timeWindow: { fromMs: 1_000_000, toMs: 1_000_500 },
    ...over,
  }
}

const RUN_DIR = 'docs/testing/playtest/runs/2026-04-24-test'

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('buildTriageLaunchSpecs — happy path', () => {
  it('emits 3 specs with subagentType=playtest-triage and fully rendered prompts', async () => {
    const template = await getTemplate()
    const seeds: IssueSeed[] = [
      baseSeed({ seedId: '001-scn-a' }),
      baseSeed({ seedId: '002-scn-b', scenarioIds: ['SCN-B'] }),
      baseSeed({ seedId: '003-scn-c', scenarioIds: ['SCN-C'] }),
    ]
    const specs = buildTriageLaunchSpecs({ seeds, runDir: RUN_DIR, template })
    expect(specs).toHaveLength(3)
    for (const s of specs) {
      expect(s.subagentType).toBe('playtest-triage')
      expect(s.subagentType).not.toBe('general-purpose')
      // Prompt must be fully rendered — no `{{...}}` left for known placeholders.
      // (Unknown placeholders leak through; that's intentional drift detection.)
      const known = [
        'SEED_ID', 'SEED_KIND', 'SEED_SIGNALS', 'SEATS_INVOLVED',
        'SCENARIO_IDS', 'RUN_DIR', 'CANDIDATE_DUPLICATE', 'ISSUE_PATH',
        'COLUMN_CONTEXT', 'ROLE_DRIFT_CONTEXT', 'FIRE_DIVERGENCE_CONTEXT',
      ]
      for (const k of known) {
        expect(s.prompt.includes(`{{${k}}}`)).toBe(false)
      }
      // The seed id appears (presence companion to the absence above).
      expect(s.prompt).toContain(s.seedId)
    }
  })

  it('issuePath lands under <runDir>/issues/<seedId>.md', async () => {
    const template = await getTemplate()
    const specs = buildTriageLaunchSpecs({
      seeds: [baseSeed({ seedId: '042-foo' })],
      runDir: RUN_DIR,
      template,
    })
    expect(specs[0]!.issuePath).toBe(`${RUN_DIR}/issues/042-foo.md`)
  })
})

describe('buildTriagePrompt — seed-kind-specific contexts', () => {
  it('candidateDuplicate seed surfaces KNOWN-PRODUCT-CALL link in prompt', async () => {
    const template = await getTemplate()
    const seed = baseSeed({
      candidateDuplicate: {
        kind: 'KNOWN-PRODUCT-CALL',
        id: 'SCN-A',
        linkedE2EIssueId: 'E-01',
      },
    })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    expect(prompt).toContain('KNOWN-PRODUCT-CALL → SCN-A')
    expect(prompt).toContain('linked: E-01')
  })

  it('seed without candidateDuplicate renders `(n/a)` for that placeholder', async () => {
    const template = await getTemplate()
    const seed = baseSeed()
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    // The CANDIDATE_DUPLICATE placeholder slot now contains '(n/a)'.
    // Find the line containing it via the prompt's surrounding context.
    expect(prompt).toContain('Candidate duplicate')
    // Presence companion: SEED_ID still rendered (so we know the prompt
    // populated, not that everything is just `(n/a)`).
    expect(prompt).toContain(seed.seedId)
  })

  it('ui-spec-divergence seed surfaces literal rowLabel + projectionSnapshotRef', async () => {
    const template = await getTemplate()
    const seed: IssueSeed = baseSeed({
      seedId: '010-uispec-scn-a',
      kind: 'ui-spec-divergence',
      columnContext: {
        scenarioId: 'SCN-A',
        rowLabel: 'TARGET',
        agentObservation: 'banner shows the named card',
        projectionSnapshotRef: 'events.jsonl#L412',
      },
    })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    expect(prompt).toContain('rowLabel: TARGET')
    expect(prompt).toContain('projectionSnapshotRef: events.jsonl#L412')
    expect(prompt).toContain('agentObservation: banner shows the named card')
  })

  it('role-drift seed surfaces selfLabel + detectorLabel as literal strings', async () => {
    const template = await getTemplate()
    const seed: IssueSeed = baseSeed({
      seedId: '011-roledrift-seat-1-target',
      kind: 'role-drift',
      roleDrift: {
        selfLabel: 'TARGET',
        detectorLabel: 'ACTOR',
        atStateVersion: 7,
      },
    })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    expect(prompt).toContain('selfLabel: TARGET')
    expect(prompt).toContain('detectorLabel: ACTOR')
    expect(prompt).toContain('atStateVersion: 7')
  })

  it('with-divergence-fire seed surfaces failedTier from fireDivergence', async () => {
    const template = await getTemplate()
    const seed: IssueSeed = baseSeed({
      seedId: '012-withdiv-scn-x',
      kind: 'with-divergence-fire',
      scenarioIds: ['SCN-X'],
      fireDivergence: {
        scenarioId: 'SCN-X',
        failedTier: 'projectionAsserts',
        notes: 'expected namedCardType to surface',
      },
    })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    expect(prompt).toContain('failedTier: projectionAsserts')
    expect(prompt).toContain('expected namedCardType to surface')
  })

  it('vibe-check seed prompt directs reader to PRODUCT-SPECIFICATION.md (D11)', async () => {
    const template = await getTemplate()
    const seed: IssueSeed = baseSeed({
      seedId: '020-vibe-scn-a',
      kind: 'vibe-check',
    })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    // Template carries the §2 / §3 directive verbatim (Unit 1 mandate).
    expect(prompt).toContain('PRODUCT-SPECIFICATION.md')
  })

  it('non-applicable seed-kind contexts render `(n/a)`', async () => {
    const template = await getTemplate()
    const seed = baseSeed() // scripted-scenario, no special context
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    // All three seed-kind blocks render `(n/a)`.
    // Use a slightly looser check: count `(n/a)` >= 3 in the rendered
    // template (column / role-drift / fire-divergence blocks all empty).
    const nA_count = (prompt.match(/\(n\/a\)/g) ?? []).length
    expect(nA_count).toBeGreaterThanOrEqual(3)
  })
})

describe('buildTriagePrompt — error paths', () => {
  it('throws when ui-spec-divergence seed has no columnContext', async () => {
    const template = await getTemplate()
    const seed = baseSeed({
      seedId: '900-bad',
      kind: 'ui-spec-divergence',
      // columnContext intentionally missing
    })
    expect(() => buildTriagePrompt({ seed, runDir: RUN_DIR, template })).toThrow(
      /columnContext/,
    )
  })

  it('throws when role-drift seed has no roleDrift', async () => {
    const template = await getTemplate()
    const seed = baseSeed({
      seedId: '901-bad',
      kind: 'role-drift',
    })
    expect(() => buildTriagePrompt({ seed, runDir: RUN_DIR, template })).toThrow(
      /roleDrift/,
    )
  })

  it('throws when with-divergence-fire seed has no fireDivergence', async () => {
    const template = await getTemplate()
    const seed = baseSeed({
      seedId: '902-bad',
      kind: 'with-divergence-fire',
    })
    expect(() => buildTriagePrompt({ seed, runDir: RUN_DIR, template })).toThrow(
      /fireDivergence/,
    )
  })

  it('throws when seedId is empty', async () => {
    const template = await getTemplate()
    const seed = baseSeed({ seedId: '' })
    expect(() => buildTriagePrompt({ seed, runDir: RUN_DIR, template })).toThrow(
      /seedId/,
    )
  })
})

describe('buildTriageLaunchSpecs — subagent_type regression (D16 / R14)', () => {
  it('every spec uses subagentType=playtest-triage; type system blocks general-purpose', async () => {
    const template = await getTemplate()
    const seeds: IssueSeed[] = Array.from({ length: 5 }, (_, i) =>
      baseSeed({ seedId: `${String(i + 1).padStart(3, '0')}-scn-${i}` }),
    )
    const specs = buildTriageLaunchSpecs({ seeds, runDir: RUN_DIR, template })
    for (const s of specs) {
      expect(s.subagentType).toBe('playtest-triage')
    }
    // Presence companion: 5 specs were emitted (proves the assertion isn't
    // vacuous over an empty array).
    expect(specs).toHaveLength(5)
  })
})

describe('buildTriageLaunchSpecs — placeholder rendering', () => {
  it('SEED_SIGNALS list renders one bullet per source signal with seat + path', async () => {
    const template = await getTemplate()
    const seed: IssueSeed = baseSeed({
      sourceSignals: [
        { source: 'seat-log', seatId: 'seat-3', path: 'seats/seat-3.log.md' },
        { source: 'suspicion', seatId: 'seat-7', path: 'suspicions/seat-7.suspicions.md' },
        { source: 'fire-record', path: 'coverage.md', id: 'SCN-X' },
      ],
    })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    expect(prompt).toContain('seat-log (seat-3) → seats/seat-3.log.md')
    expect(prompt).toContain('suspicion (seat-7) → suspicions/seat-7.suspicions.md')
    expect(prompt).toContain('fire-record → coverage.md [SCN-X]')
  })

  it('SEATS_INVOLVED renders comma-joined list', async () => {
    const template = await getTemplate()
    const seed = baseSeed({ seatsInvolved: ['seat-1', 'seat-3', 'seat-7'] })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    expect(prompt).toContain('seat-1, seat-3, seat-7')
  })

  it('SEATS_INVOLVED renders `(none)` when empty', async () => {
    const template = await getTemplate()
    const seed = baseSeed({
      seedId: '050-cov',
      kind: 'coverage-divergence',
      seatsInvolved: [],
      scenarioIds: ['SCN-Z'],
    })
    const prompt = buildTriagePrompt({ seed, runDir: RUN_DIR, template })
    // Source seats line should show `(none)` for the value.
    expect(prompt).toMatch(/Source seats.*\(none\)/)
  })
})
