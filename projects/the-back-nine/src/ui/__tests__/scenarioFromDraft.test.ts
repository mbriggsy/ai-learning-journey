import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { draftFromScenario } from '../draftFromScenario'
import { DEV_SEEDS } from '../devSeeds'
import { CURRENT_SCHEMA_VERSION } from '@shared/model'
import { decodeScenario, encodeScenario } from '@shared/scenarioCodec'
import { buildDateInput, buildSpineParams } from '@intake/intakeMap'
import type { ScenarioDraft } from '@store/memoryModel'

// DEV_SEEDS are complete, engine-valid drafts (the `?seed=` fixtures) — the canonical
// "ready to save" inputs. We mutate copies to plant the incompleteness the gate must catch.

describe('scenarioFromDraft — Save completeness + field-fidelity gate', () => {
  it('EVERY dev seed’s save carries the current version — in the returned plan AND in the bytes a save writes', () => {
    // The bytes are read raw because decoding them would relabel an old label. What this pins is the
    // encode: the bytes `session.save` writes carry the returned plan's label. It cannot see a mint
    // that stamps a stale literal — the mint's own round trip relabels it, so both reads say current;
    // only the candidate's `as CurrentScenario` cast, under `pnpm typecheck`, catches that (KTD2).
    for (const [key, draft] of Object.entries(DEV_SEEDS)) {
      const r = scenarioFromDraft(draft)
      expect(r.ready, `${key} must be saveable`).toBe(true)
      if (!r.ready) continue
      expect(r.scenario.schemaVersion, key).toBe(CURRENT_SCHEMA_VERSION)
      const onDisk = JSON.parse(new TextDecoder().decode(encodeScenario(r.scenario))) as { schemaVersion: unknown }
      expect(onDisk.schemaVersion, key).toBe(CURRENT_SCHEMA_VERSION)
    }
  })

  it('THE MINT AT 5: the bytes a save writes read the typed literal 5 (the schema-v5 bump’s literal; it guards the constant, never a stale-stamping mint — insight 151)', () => {
    const r = scenarioFromDraft(DEV_SEEDS.date)
    if (!r.ready) throw new Error(r.detail)
    const onDisk = JSON.parse(new TextDecoder().decode(encodeScenario(r.scenario))) as { schemaVersion: unknown }
    expect(onDisk.schemaVersion).toBe(5)
  })

  it.each([
    ['scenario-v4-date.json', 'date'],
    ['scenario-v4-datecoststale-kept.json', 'datecoststale'],
    ['scenario-v4-rec.json', 'retired'],
  ] as const)('the frozen version-4 plan %s hydrates to its seed’s own engine input — the engine runs it byte-identically to HEAD (U6: its output equals U1’s digest for %s)', (file, seed) => {
    // The engine is a pure function of its input (and the seed rides the input), so equal inputs are
    // equal outputs. The kept fixture's W is an entered $84,000 where `datecoststale` holds a confirmed
    // $84,000: the engine carries the figure only (a stale W still rides), so the inputs agree.
    const decoded = decodeScenario(new Uint8Array(readFileSync(join(process.cwd(), 'src', 'shared', '__tests__', 'fixtures', file))))
    if (!decoded.ok || decoded.scenario.schemaVersion !== CURRENT_SCHEMA_VERSION) throw new Error(`${file} did not decode as current`)
    const hydrated = draftFromScenario(decoded.scenario)
    if (!hydrated.ok) throw new Error(hydrated.detail)
    const route = buildDateInput(DEV_SEEDS[seed]) === null ? 'spine' : 'date'
    if (route === 'date') {
      expect(buildDateInput(hydrated.draft)).toEqual(buildDateInput(DEV_SEEDS[seed]))
    } else {
      expect(buildDateInput(hydrated.draft)).toBeNull()
      expect(buildSpineParams(hydrated.draft)).toEqual(buildSpineParams(DEV_SEEDS[seed]))
    }
  })

  it('a complete draft is ready, and the returned scenario is the field-identical current form', () => {
    const draft = DEV_SEEDS.retired
    const r = scenarioFromDraft(draft)
    expect(r.ready).toBe(true)
    if (!r.ready) return
    expect(r.scenario.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    // Field-fidelity: the answer-producing facts survive the round-trip unchanged.
    expect(r.scenario.seed).toBe(draft.seed)
    expect(r.scenario.annualSpendingReal).toBe(draft.annualSpendingReal)
    expect(r.scenario.people).toHaveLength(2)
    expect(r.scenario.incomeStreams).toEqual(draft.incomeStreams)
    expect(r.scenario.filing).toBe(draft.filing)
    expect(r.scenario.startCalendarYear).toBe(draft.startCalendarYear)
  })

  it('a still-working draft IS saveable — a working person honestly carries no retirementAge (council Option B)', () => {
    // The headline fuck-off-date household: a working person's `retirementAge` is deliberately
    // undefined in the draft (the swept date is the answer, not an input). Under Option B the
    // persisted schema makes it ABSENT-for-working, so the draft round-trips WITHOUT any synthetic
    // placeholder injection — the honest model, validated by the codec biconditional.
    const r = scenarioFromDraft(DEV_SEEDS.date)
    expect(r.ready).toBe(true)
    if (r.ready) {
      expect(r.scenario.people[0]?.workStatus).toBe('working')
      // Honestly absent — never a stored placeholder that flip-to-retired could surface as "entered".
      expect(r.scenario.people[0]?.retirementAge).toBeUndefined()
    }
  })

  it('PLANTED FAIL — a working person carrying a retirementAge (the Option-A masquerade) is REJECTED', () => {
    // The artifact bare-Option-A would have stored: a synthetic age on a still-working person. The
    // codec's SOLE restore gate must refuse to decode it, so it can never masquerade as entered.
    const masquerade: ScenarioDraft = {
      ...DEV_SEEDS.date,
      people: [{ ...DEV_SEEDS.date.people[0], retirementAge: 67 }, DEV_SEEDS.date.people[1]],
    }
    expect(scenarioFromDraft(masquerade).ready).toBe(false)
  })

  it('PLANTED FAIL — a missing seed is not saveable (never minted = never persisted)', () => {
    const noSeed: ScenarioDraft = { ...DEV_SEEDS.retired, seed: undefined }
    expect(scenarioFromDraft(noSeed).ready).toBe(false)
  })

  it('PLANTED FAIL — a missing spend figure is not saveable', () => {
    const noSpend: ScenarioDraft = { ...DEV_SEEDS.retired, annualSpendingReal: undefined }
    expect(scenarioFromDraft(noSpend).ready).toBe(false)
  })

  it('PLANTED FAIL — a DND/009 health-array hole (undefined → JSON null) is caught, never persisted', () => {
    const withHole: ScenarioDraft = {
      ...DEV_SEEDS.date,
      health: { ...DEV_SEEDS.date.health, workingYearInvestmentByPerson: [30_000, undefined] },
    }
    expect(scenarioFromDraft(withHole).ready).toBe(false)
  })

  it('PLANTED FAIL — an incomplete person (no birth year) is not saveable', () => {
    const noBirthYear: ScenarioDraft = {
      ...DEV_SEEDS.retired,
      people: [{ ...DEV_SEEDS.retired.people[0], birthYear: undefined }, DEV_SEEDS.retired.people[1]],
    }
    expect(scenarioFromDraft(noBirthYear).ready).toBe(false)
  })
})
