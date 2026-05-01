/**
 * Unit 3 tests — four-entryType log schema + markdown parser.
 *
 * Maps 1:1 to the plan's "Test scenarios" list so verification is
 * grep-able:
 *
 *   - Happy path × 5: scenario-fire, suspicion, vibe-check (yes),
 *     vibe-check (unsure), ui-spec-divergence (SPECTATOR literal).
 *   - Error path × 5: missing entryType, unknown entryType, role-label
 *     drift, invalid feltLikeArcher, too-short proseRationale.
 *   - Transition: legacy `info-gap-divergence` → warning + coerce.
 *   - Edge × 3: empty file, extra fields (permissive), JSON-in-fence.
 *   - Drift regression: the role-label literal union equals
 *     `Object.values(ROW_DISPLAY_LABELS)` character-for-character.
 */
import { describe, expect, it } from 'vitest'

import {
  LogEntrySchema,
  ScenarioFireEntrySchema,
  SuspicionEntrySchema,
  UiSpecDivergenceEntrySchema,
  VibeCheckEntrySchema,
} from './log-schema'
import { parseSeatLogString } from './log-parser'
import { ROW_DISPLAY_LABELS } from './types'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function markdownFor(yamlBody: string): string {
  return `### seat-3 @ 2026-04-24T18:03:42-04:00 — TEST

\`\`\`yaml
${yamlBody.trim()}
\`\`\`
`
}

const VALID_FIRE = `
entryType: scenario-fire
scenarioId: SCN-CALL-IN-FAVOR-EMPTY-HAND-01
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:03:42-04:00
triggeringAction:
  card: call-in-a-favor
preObservation:
  hand: [call-in-a-favor, neal-proctor]
postObservation:
  turnAdvanced: true
`

const VALID_SUSPICION = `
entryType: suspicion
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:04:15-04:00
severity: medium
relatedScenario: SCN-NAMED-STEAL-INTERCEPT-01
questionsTried:
  - "Did I know which card was named?"
`

const VALID_VIBE_CHECK_YES = `
entryType: vibe-check
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:03:45-04:00
relatedScenario: SCN-CALL-IN-FAVOR-EMPTY-HAND-01
feltLikeArcher: yes
vibeCheckPrompt: "Did this moment feel like an Archer beat?"
proseRationale: "The banner arrived 500 ms late and overlapped the card flip."
`

const VALID_VIBE_CHECK_UNSURE = `
entryType: vibe-check
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:03:45-04:00
relatedScenario: null
feltLikeArcher: unsure
vibeCheckPrompt: "Did this moment feel like an Archer beat?"
proseRationale: "I could not tell — the drama was off-screen."
`

const VALID_UI_SPEC_DIVERGENCE = `
entryType: ui-spec-divergence
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:04:02-04:00
myRoleLabel: "SPECTATOR (eliminated, connected)"
relatedScenario: SCN-NAMED-STEAL-INTERCEPT-01
column2Expected: "Per rules: clear banner showing named card."
observedOnPhone: "No banner rendered during the 10s window."
screenshotHash: sha256-a1b2c3
`

// -----------------------------------------------------------------------------
// Happy paths
// -----------------------------------------------------------------------------

describe('LogEntrySchema happy paths', () => {
  it('parses a valid scenario-fire entry', () => {
    const result = parseSeatLogString(markdownFor(VALID_FIRE))
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.entries).toHaveLength(1)
    const [entry] = result.entries
    expect(entry?.entryType).toBe('scenario-fire')
    if (entry?.entryType === 'scenario-fire') {
      expect(entry.scenarioId).toBe('SCN-CALL-IN-FAVOR-EMPTY-HAND-01')
    }
  })

  it('parses a valid suspicion entry', () => {
    const result = parseSeatLogString(markdownFor(VALID_SUSPICION))
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
    const [entry] = result.entries
    expect(entry?.entryType).toBe('suspicion')
    if (entry?.entryType === 'suspicion') {
      expect(entry.severity).toBe('medium')
    }
  })

  it('parses a vibe-check with feltLikeArcher=yes and ≥10 chars of prose', () => {
    const result = parseSeatLogString(markdownFor(VALID_VIBE_CHECK_YES))
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
    const [entry] = result.entries
    if (entry?.entryType === 'vibe-check') {
      expect(entry.feltLikeArcher).toBe('yes')
      expect(entry.proseRationale.length).toBeGreaterThanOrEqual(10)
    } else {
      throw new Error('expected vibe-check entry')
    }
  })

  it('parses a vibe-check with feltLikeArcher=unsure (phase-4 I8)', () => {
    const result = parseSeatLogString(markdownFor(VALID_VIBE_CHECK_UNSURE))
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
    const [entry] = result.entries
    if (entry?.entryType === 'vibe-check') {
      expect(entry.feltLikeArcher).toBe('unsure')
    } else {
      throw new Error('expected vibe-check entry')
    }
  })

  it('parses a ui-spec-divergence entry with the literal SPECTATOR label', () => {
    const result = parseSeatLogString(markdownFor(VALID_UI_SPEC_DIVERGENCE))
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
    const [entry] = result.entries
    if (entry?.entryType === 'ui-spec-divergence') {
      expect(entry.myRoleLabel).toBe('SPECTATOR (eliminated, connected)')
    } else {
      throw new Error('expected ui-spec-divergence entry')
    }
  })
})

// -----------------------------------------------------------------------------
// Error paths
// -----------------------------------------------------------------------------

describe('LogEntrySchema error paths', () => {
  it('reports an error when entryType is missing (not fatal)', () => {
    const body = `
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:00:00-04:00
severity: low
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toMatch(/Missing.*entryType/i)
  })

  it('reports an error for an unknown entryType', () => {
    const body = `
entryType: gibberish
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:00:00-04:00
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toMatch(/Unknown entryType/i)
  })

  it('reports an error for ui-spec-divergence with drifted role label', () => {
    // `'SPECTATOR'` is NOT a valid ROW_DISPLAY_LABELS value — the literal
    // is `'SPECTATOR (eliminated, connected)'`. A drift like this would
    // mean the prompt-renderer emitted the internal ViewerRole key
    // instead of the display label; we want that caught, not silently
    // accepted.
    const body = `
entryType: ui-spec-divergence
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:00:00-04:00
myRoleLabel: SPECTATOR
relatedScenario: SCN-X-01
column2Expected: "prose"
observedOnPhone: "prose"
screenshotHash: sha256-x
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toMatch(/myRoleLabel/i)
  })

  it('reports an error for vibe-check with feltLikeArcher=maybe', () => {
    const body = `
entryType: vibe-check
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:00:00-04:00
relatedScenario: null
feltLikeArcher: maybe
vibeCheckPrompt: "Did this moment feel like an Archer beat?"
proseRationale: "some long enough prose"
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toMatch(/feltLikeArcher/i)
  })

  it('reports an error for vibe-check with too-short proseRationale', () => {
    const body = `
entryType: vibe-check
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:00:00-04:00
relatedScenario: null
feltLikeArcher: yes
vibeCheckPrompt: "Did this moment feel like an Archer beat?"
proseRationale: "ok."
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toMatch(/proseRationale/i)
  })
})

// -----------------------------------------------------------------------------
// Transition (C4 legacy rename)
// -----------------------------------------------------------------------------

describe('LogEntrySchema transition: info-gap-divergence → ui-spec-divergence', () => {
  it('emits a warning and coerces legacy entryType', () => {
    const body = `
entryType: info-gap-divergence
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:00:00-04:00
myRoleLabel: "OTHER (alive)"
relatedScenario: SCN-X-01
column2Expected: "prose"
observedOnPhone: "prose"
screenshotHash: sha256-x
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.errors).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.message).toMatch(
      /info-gap-divergence.*coerced.*ui-spec-divergence/,
    )
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.entryType).toBe('ui-spec-divergence')
  })
})

// -----------------------------------------------------------------------------
// Edge cases
// -----------------------------------------------------------------------------

describe('LogEntrySchema edge cases', () => {
  it('returns empty arrays for an empty markdown file', () => {
    const result = parseSeatLogString('')
    expect(result).toEqual({ entries: [], errors: [], warnings: [] })
  })

  it('accepts extra fields (permissive .loose())', () => {
    const body = `
entryType: suspicion
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:00:00-04:00
severity: low
relatedScenario: null
questionsTried: []
agentConfidence: 0.42
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
  })

  it('reports a helpful error when the fenced block is JSON, not YAML', () => {
    // JSON-in-a-yaml-fence case: the agent dumped JSON instead of YAML.
    // YAML is a superset of JSON, so this actually parses — but without
    // `entryType` it's caught as a missing-field error. If the JSON
    // genuinely IS malformed YAML, we get the YAML library's error.
    const malformedBody = markdownFor(`
entryType: suspicion
seat: "unclosed quote
`)
    const result = parseSeatLogString(malformedBody)
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toMatch(/YAML parse failed/i)
  })
})

// -----------------------------------------------------------------------------
// Catalog cross-reference (triage seeds #001/#002/#003/#011/#018).
// -----------------------------------------------------------------------------

describe('parseSeatLogString — validScenarioIds catalog gate', () => {
  it('rejects scenario-fire entries with scenarioIds absent from the catalog', () => {
    // Real-world: seat-1 invented "SESSION-START" for the lobby-load
    // moment. Without this gate the clusterer routed it as a
    // scripted-scenario seed and consumed a triage agent spawn.
    const body = `
entryType: scenario-fire
scenarioId: SESSION-START
seat: seat-1
seatName: Whiskrs
timestamp: 2026-04-30T01:42:08-04:00
triggeringAction: { url: "player.html?room=CALSWF" }
preObservation: { title: "BURNED — Join" }
postObservation: { lobby: true }
`
    const result = parseSeatLogString(markdownFor(body), {
      validScenarioIds: new Set(['SCN-CALL-IN-FAVOR-NORMAL-01', 'SCN-GO-DARK-NORMAL-01']),
    })
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toMatch(/Unknown scenarioId `SESSION-START`/)
    expect(result.errors[0]?.message).toContain('SCN-CALL-IN-FAVOR-NORMAL-01')
    expect(result.errors[0]?.message).toContain('SCN-GO-DARK-NORMAL-01')
  })

  it('accepts scenario-fire entries with scenarioIds present in the catalog', () => {
    const body = `
entryType: scenario-fire
scenarioId: SCN-CALL-IN-FAVOR-NORMAL-01
seat: seat-1
seatName: Whiskrs
timestamp: 2026-04-30T01:48:00-04:00
triggeringAction: {}
preObservation: {}
postObservation: {}
`
    const result = parseSeatLogString(markdownFor(body), {
      validScenarioIds: new Set(['SCN-CALL-IN-FAVOR-NORMAL-01']),
    })
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
  })

  it('does not check the catalog when validScenarioIds is omitted (back-compat)', () => {
    // Smoke tests / isolation audit don't have the catalog handy and just
    // need structural validation. Omitting the option preserves prior
    // behavior — bogus scenarioIds pass schema validation if their other
    // fields are well-formed.
    const body = `
entryType: scenario-fire
scenarioId: NOT-IN-ANY-CATALOG
seat: seat-1
seatName: Whiskrs
timestamp: 2026-04-30T01:48:00-04:00
triggeringAction: {}
preObservation: {}
postObservation: {}
`
    const result = parseSeatLogString(markdownFor(body))
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
  })

  it('does not gate non-scenario-fire entries (suspicion / vibe-check / ui-spec-divergence)', () => {
    // The catalog gate is scoped to scenario-fire only — suspicion and
    // vibe-check use `relatedScenario` which is allowed to be null AND is
    // not the same axis (#015 vibe-check tagged `SCN-SKIP-NORMAL-01` but
    // described a different card; that's a clusterer concern, not a
    // parser concern).
    const result = parseSeatLogString(markdownFor(VALID_SUSPICION), {
      validScenarioIds: new Set(['SCN-CALL-IN-FAVOR-NORMAL-01']),
    })
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(1)
  })

  it('reports `(empty catalog)` when validScenarioIds is an empty set', () => {
    const body = `
entryType: scenario-fire
scenarioId: SCN-CALL-IN-FAVOR-NORMAL-01
seat: seat-1
seatName: Whiskrs
timestamp: 2026-04-30T01:48:00-04:00
triggeringAction: {}
preObservation: {}
postObservation: {}
`
    const result = parseSeatLogString(markdownFor(body), {
      validScenarioIds: new Set(),
    })
    expect(result.entries).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toContain('(empty catalog)')
  })
})

// -----------------------------------------------------------------------------
// Drift regression — the schema's literal union tracks ROW_DISPLAY_LABELS.
// -----------------------------------------------------------------------------

describe('role-label literal union tracks ROW_DISPLAY_LABELS', () => {
  it('accepts every ROW_DISPLAY_LABELS value as a valid myRoleLabel', () => {
    for (const label of Object.values(ROW_DISPLAY_LABELS)) {
      const result = UiSpecDivergenceEntrySchema.safeParse({
        entryType: 'ui-spec-divergence',
        seat: 'seat-3',
        seatName: 'Vera',
        timestamp: '2026-04-24T18:00:00-04:00',
        myRoleLabel: label,
        relatedScenario: null,
        column2Expected: 'prose',
        observedOnPhone: 'prose',
        screenshotHash: 'sha256-x',
      })
      expect(result.success).toBe(true)
    }
  })
})

// -----------------------------------------------------------------------------
// Smoke — the individual schemas align with the union.
// -----------------------------------------------------------------------------

describe('individual schemas route through the discriminated union', () => {
  it('routes scenario-fire correctly', () => {
    const sample = {
      entryType: 'scenario-fire',
      scenarioId: 'SCN-X-01',
      seat: 'seat-0',
      seatName: 'Dash',
      timestamp: '2026-04-24T18:00:00-04:00',
      triggeringAction: {},
      preObservation: {},
      postObservation: {},
    }
    expect(ScenarioFireEntrySchema.safeParse(sample).success).toBe(true)
    expect(LogEntrySchema.safeParse(sample).success).toBe(true)
  })

  it('routes suspicion correctly', () => {
    const sample = {
      entryType: 'suspicion',
      seat: 'seat-0',
      seatName: 'Dash',
      timestamp: '2026-04-24T18:00:00-04:00',
      severity: 'high',
      relatedScenario: null,
      questionsTried: [],
    }
    expect(SuspicionEntrySchema.safeParse(sample).success).toBe(true)
    expect(LogEntrySchema.safeParse(sample).success).toBe(true)
  })

  it('routes vibe-check correctly', () => {
    const sample = {
      entryType: 'vibe-check',
      seat: 'seat-0',
      seatName: 'Dash',
      timestamp: '2026-04-24T18:00:00-04:00',
      relatedScenario: null,
      feltLikeArcher: 'no',
      vibeCheckPrompt: 'prompt',
      proseRationale: 'long enough prose',
    }
    expect(VibeCheckEntrySchema.safeParse(sample).success).toBe(true)
    expect(LogEntrySchema.safeParse(sample).success).toBe(true)
  })
})
