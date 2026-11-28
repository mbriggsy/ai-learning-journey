// @vitest-environment jsdom
/**
 * P3·U13 — the re-entry gate's composition + surface battery.
 *
 * `composeReentry` (the pure seam, insight 048): per-bucket read-back grouped EXACTLY the
 * way the engine buckets (KIND_TO_BUCKET — a drifted grouping would front the answer with
 * figures the plan doesn't stand on), the SS fold-in in the monthly frame the intake asked
 * in, the per-clock note lines, and the suppressed-never-fabricated wall-time line.
 *
 * `ReEntry` (the surface): heading-as-focus-target on mount, the affirm/update pair, the
 * read-only Continue-only arm, and the prompt-not-attestation shape (no checkbox, no
 * "confirmed" language anywhere).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { composeReentry as composeReentryParts, type ReentryAnswerSentences, type ReentryTypedBelow, type ReentryView } from '../reentryChrome'
import { notePartsText, type NoteParts } from '../noteParts'

/** `composeReentry` with each note line read as its text (U11 walk 5's (bi): W's stale line is a parts entry, its
 *  React key and drawn text the parts joined). Every arm here reads the lines' words; the W line's parts are pinned
 *  on `composeReentryParts` itself, below, and on the real draw (`IntakeApp.test.tsx`). */
const composeReentry = (...args: Parameters<typeof composeReentryParts>): Omit<ReentryView, 'noteLines'> & { readonly noteLines: readonly string[] } => {
  const view = composeReentryParts(...args)
  return { ...view, noteLines: view.noteLines.map((l) => (typeof l === 'string' ? l : l.text)) }
}
import { ReEntry } from '../ReEntry'
import { scenarioFromDraft, currentEpochDay } from '../scenarioFromDraft'
import { ENGINE_PRICING_LEDGER, FIRST_UNAMBIGUOUS_SAVE_DAY, type PricingFamily } from '@engine/pricingVersion'
import { DEV_SEEDS } from '../devSeeds'
import { deriveStaleness, PRICING_FAMILY_ORDER, type StalenessExposure, type StalenessReport } from '@store/staleness'
import { exposureForDraft } from '../stalenessExposure'
import { isWorkingYearCostStale } from '@intake/workingYearQuote'
import {
  workingYearCostStaleDoor,
  workingYearCostStaleLine,
  workingYearCostStaleLineText,
  workingYearCostStaleNote,
  workingYearCostTypedBelowComposed,
  workingYearCostTypedBelowDoor,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
} from '@intake/workingYearLeftOver'
import { copy, slots } from '../copy'
import type { PricedState } from '@engine/constants/stateTax'
import type { CurrentScenario } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'

afterEach(cleanup)

/** Never earlier than the ledger's first unambiguous save day — a fixture saved ON an engine-pricing
 *  ship day is deliberately ambiguous (the nameless line), so a wall-clock TODAY reds this file on
 *  exactly the day a row ships (`FIRST_UNAMBIGUOUS_SAVE_DAY`'s docblock). */
const TODAY = Math.max(currentEpochDay(), FIRST_UNAMBIGUOUS_SAVE_DAY)
/** A save by THIS build: `scenarioFromDraft` stamps `savedAt` off the wall clock; re-stamp it at TODAY. */
const readySave = (key: keyof typeof DEV_SEEDS) => {
  const r = scenarioFromDraft(DEV_SEEDS[key])
  return r.ready ? { ...r, scenario: { ...r.scenario, savedAt: TODAY } } : r
}
const freshSave = (): CurrentScenario => {
  const r = readySave('retired')
  if (!r.ready) throw new Error('retired seed must be save-ready')
  return r.scenario
}
const scenarioFor = (key: keyof typeof DEV_SEEDS): CurrentScenario => {
  const r = readySave(key)
  if (!r.ready) throw new Error(`${key} seed must be save-ready`)
  return r.scenario
}
// U17 §S4 — the REAL exposure records, derived from the same seeds these scenarios come from.
// Never hand-written literals here: this file's job is the end-to-end read (seed → built params
// → exposure → report → rendered sentence), and a literal would cut the chain at its middle.
// `retired` is the all-65+ Medicare-only household — Medicare priced, ACA structurally unpriced.
const RETIRED_EXPOSURE = exposureForDraft(DEV_SEEDS.retired)
/** The pre-65 marketplace-quoted household — the naming half of the witness pair. */
const ACA_PRICED_EXPOSURE = exposureForDraft(DEV_SEEDS.health)
const DATE_EXPOSURE = exposureForDraft(DEV_SEEDS.date)
/** THE ONE non-seed exposure in this file: `exposureForDraft`'s missing-facts arm — the
 *  cross-build vault whose draft a newer build can no longer build. No seed can express it (a
 *  seed is buildable by construction), and it is the only production state that puts more than
 *  one clock in the nameless bucket, so the "pushed at most once" arm needs it. */
const UNBUILDABLE_RESIDUAL: StalenessExposure = exposureForDraft({
  ...DEV_SEEDS.retired,
  annualSpendingReal: undefined,
} as unknown as typeof DEV_SEEDS.retired)
const pricing = (e: StalenessExposure, s: PricedState | undefined): StalenessExposure => ({
  ...e,
  pricedState: s,
})
const reportFor = (s: CurrentScenario, exposure: StalenessExposure = RETIRED_EXPOSURE) =>
  deriveStaleness(s, TODAY, exposure, { costStale: false, leftOverStale: false })
/** No answer sentence handed over — the arms that test a clock line, not an answer's line. */
const NO_SENTENCES: ReentryAnswerSentences = { costStale: null, leftOverStale: null, typedBelow: null }

// The pay check's W. `date` without W (whatever W the seed registry later gives it), and the same
// household with W confirmed — typed by hand from the seed's own facts: no budget ⇒ the quote is its
// $84,000 spending; no retirement state ⇒ the 'unpriced' reading (KTD5, KTD18). The exposure and the
// stale flag are the REAL producers' answers, never literals (this file's end-to-end law).
const { workingYearCost: _seedW, ...DATE_NO_W } = DEV_SEEDS.date
const DATE_WITH_W: ScenarioDraft = {
  ...DATE_NO_W,
  workingYearCost: { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'unpriced' },
}
/** The W-present household after it raised its spending to $90,000 — the quote moved, the answer
 *  did not (KTD21's quoteMoved). */
const DATE_STALE_W: ScenarioDraft = { ...DATE_WITH_W, annualSpendingReal: 90_000 }
/** A save by THIS build of a hand-built draft (the `readySave` twin for a non-seed draft). */
const savedDraft = (d: ScenarioDraft): CurrentScenario => {
  const r = scenarioFromDraft(d)
  if (!r.ready) throw new Error('the fixture draft must be save-ready')
  return { ...r.scenario, savedAt: TODAY }
}
/** A save carrying the working-years stamp of the PREVIOUS table (any value but the current one). */
const withOlderWorkingYearsStamp = (s: CurrentScenario): CurrentScenario => ({
  ...s,
  dateVintage: { ...s.dateVintage!, workingYearsVintage: 'working-years-2025a' },
})

describe('composeReentry — the read-back', () => {
  it('sums balances per ENGINE bucket and omits empty buckets (retired: pretax only; date: pretax + roth — never a noise "$0 Roth" row)', () => {
    // The retired seed carries ONE traditional IRA — exactly one row, the pre-tax sum.
    const s = freshSave()
    const view = composeReentry(s, reportFor(s), NO_SENTENCES)
    expect(view.balanceRows.map((r) => r.label)).toEqual([copy.reentryBucketPretax])
    const pretaxTotal = s.enteredAccounts
      .filter((a) => ['401k', '403b', 'traditional-ira'].includes(a.kind))
      .reduce((t, a) => t + a.valueToday, 0)
    expect(view.balanceRows[0]!.value).toBe(`$${Math.round(pretaxTotal).toLocaleString('en-US')}`)
    // The date seed carries a 401k + a roth-ira — two rows, grouped by the engine's own map.
    const d = readySave('date')
    if (!d.ready) throw new Error('date seed must be save-ready')
    const dView = composeReentry(d.scenario, reportFor(d.scenario, DATE_EXPOSURE), NO_SENTENCES)
    expect(dView.balanceRows.map((r) => r.label)).toEqual([
      copy.reentryBucketPretax,
      copy.reentryBucketRoth,
    ])
  })

  it('reads the SS fold-in back MONTHLY (pia is persisted annual ×12 — the read-back must speak the frame the statement asked in)', () => {
    const s = freshSave()
    const view = composeReentry(s, reportFor(s), NO_SENTENCES)
    expect(view.benefitRows).toHaveLength(2)
    const [p0, p1] = s.people
    expect(view.benefitRows[0]).toEqual({
      label: p0!.name,
      value: slots.reentryBenefitMonthly(Math.round(p0!.pia / 12).toLocaleString('en-US')),
    })
    expect(view.benefitRows[1]!.label).toBe(p1!.name)
  })

  it('a fresh save composes NO note lines and NO elapsed line (nothing moved, saved today)', () => {
    const s = freshSave()
    const view = composeReentry(s, reportFor(s), NO_SENTENCES)
    expect(view.noteLines).toEqual([])
    expect(view.elapsedLine).toBeNull()
  })

  it('fired clocks are NAMED, one line each; an expired budget window quotes its calendar boundary', () => {
    const s = freshSave()
    const doctored: CurrentScenario = {
      ...s,
      taxVintageDetail: { taxYear: 2019, legalBasis: 'TCJA (pre-OBBBA)' },
      healthcareVintage: { ...s.healthcareVintage!, coverageYear: 2019 },
      budget: [
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 0 },
      ] as CurrentScenario['budget'],
      // An AGED vault: the plan started 2 calendar years back (the budget window anchors on
      // startCalendarYear — a spine household's year 0 is the plan's own start) and the save
      // is ~2 years old (the elapsed line reads off savedAt).
      startCalendarYear: s.startCalendarYear - 2,
      savedAt: TODAY - 730,
    } as CurrentScenario
    const view = composeReentry(doctored, reportFor(doctored), NO_SENTENCES)
    expect(view.noteLines).toContain(copy.stalenessTax)
    // U17 §S4 — `coverageYear` dates the ACA/IRMAA tables (model.ts:3385), so for THIS all-65+
    // household it names the Medicare half and only that: they price the IRMAA ladder every
    // year and zero marketplace years. Not the old collapsed "Health-coverage rules" line, and
    // not the nameless aggregate the first cut mis-bucketed it to.
    expect(view.noteLines).toContain(copy.stalenessMedicare)
    expect(view.noteLines).not.toContain(copy.stalenessAca)
    expect(view.noteLines).not.toContain(copy.stalenessReferenceTables)
    expect(
      view.noteLines.some((l) => l === slots.stalenessBudgetLine(doctored.startCalendarYear)),
    ).toBe(true)
    expect(view.elapsedLine).toBe(slots.reentryElapsedYears(2))
  })

  // ── THE WITNESS PAIR, END TO END (U17 §S4) ────────────────────────────────────────────────
  // The same moved `acaStatus` stamp, the same code path, two households. Both arms or the gate
  // proves nothing: a gate that silenced everything would satisfy the first alone.
  it('THE WITNESS (silence): an all-65+ Medicare-only household whose acaStatus moved gets NO healthcare line and NO hero echo — they price zero ACA', () => {
    const s = freshSave() // ages 66 + 65, no marketplace quote pair
    const moved: CurrentScenario = {
      ...s,
      healthcareVintage: { ...s.healthcareVintage!, acaStatus: 'enhanced subsidies restored (no cliff)' },
    }
    const report = reportFor(moved)
    const view = composeReentry(moved, report, NO_SENTENCES)
    expect(view.noteLines, 'not one line — the gate is total for this household').toEqual([])
    expect(view.noteLines).not.toContain(copy.stalenessAca)
    expect(view.noteLines).not.toContain(copy.stalenessMedicare)
    expect(view.noteLines).not.toContain(copy.stalenessReferenceTables)
    expect(report.rulesMoved, 'the standing hero echo must stay dark').toBe(false)
    // Non-vacuity: the clock genuinely FIRED and was silenced by the exposure gate.
    expect(report.healthcare.silencedClocks).toEqual(['aca-status'])
  })

  it('THE WITNESS (naming): the SAME moved acaStatus on a pre-65 marketplace-quoted household DOES get the named ACA line and the hero echo', () => {
    const s = scenarioFor('health') // both retired at 61 + 59, quote pair entered
    const moved: CurrentScenario = {
      ...s,
      healthcareVintage: { ...s.healthcareVintage!, acaStatus: 'enhanced subsidies restored (no cliff)' },
    }
    const report = reportFor(moved, ACA_PRICED_EXPOSURE)
    const view = composeReentry(moved, report, NO_SENTENCES)
    expect(view.noteLines).toContain(copy.stalenessAca)
    expect(view.noteLines).not.toContain(copy.stalenessMedicare)
    expect(report.rulesMoved).toBe(true)
  })

  it('the Medicare family gets its OWN line, distinct from the ACA family’s (the split is real, not an alias)', () => {
    const s = freshSave()
    const moved: CurrentScenario = {
      ...s,
      healthcareVintage: { ...s.healthcareVintage!, partBStandardMonthly: s.healthcareVintage!.partBStandardMonthly + 10 },
    }
    const view = composeReentry(moved, reportFor(moved), NO_SENTENCES)
    expect(view.noteLines).toEqual([copy.stalenessMedicare])
    expect(copy.stalenessMedicare).not.toBe(copy.stalenessAca)
  })

  it('a new price-path edition speaks the rated-spending line where the run carries a line at its own rate, through the real producers (gap 4’s leftover (c))', () => {
    const trendMoved = (s: CurrentScenario): CurrentScenario => ({
      ...s,
      healthcareVintage: { ...s.healthcareVintage!, partBTrendVintage: 'part-b-trend-2025x' },
    })
    const r = readySave('datefixed')
    if (!r.ready) throw new Error('datefixed should be save-ready')
    const fixed = trendMoved(r.scenario)
    const view = composeReentry(fixed, reportFor(fixed, exposureForDraft(DEV_SEEDS.datefixed)), NO_SENTENCES)
    expect(view.noteLines).toContain(copy.stalenessRatedSpending)
    expect(view.noteLines, 'its Medicare is priced too, so both lines').toContain(copy.stalenessMedicare)
    const plain = trendMoved(freshSave())
    expect(composeReentry(plain, reportFor(plain), NO_SENTENCES).noteLines, 'no line at its own rate: Medicare’s alone').toEqual([copy.stalenessMedicare])
  })

  it('the AGGREGATE is pushed AT MOST ONCE even when several unattributable clocks fire together (ReEntry keys each note <p> by its own TEXT — a second push collides on the React key)', () => {
    // THE ONE PLACE THIS FILE OVERRIDES A REAL EXPOSURE, and why: after the F-pass the aggregate's
    // only reachable-from-a-seed member is the BLEND clock, so no dev seed can put three clocks in
    // bucket 3 at once. The multi-member state IS reachable in production — a cross-build vault
    // whose draft is no longer buildable reads `'unknown'` on every axis (`exposureForDraft`'s
    // missing-facts arm), which is exactly what is injected here. The override is that residual,
    // spelled out, not a convenience.
    const s = scenarioFor('date')
    const hv = s.healthcareVintage!
    const dv = s.dateVintage!
    const moved: CurrentScenario = {
      ...s,
      taxVintageDetail: { ...s.taxVintageDetail!, taxYear: s.taxVintageDetail!.taxYear - 1 },
      healthcareVintage: { ...hv, acaStatus: 'enhanced subsidies restored (no cliff)' },
      dateVintage: {
        ...dv,
        contributionYear: dv.contributionYear - 1,
        blendSnapshotAsOf: '2019-01-01',
      },
    }
    const report = reportFor(moved, UNBUILDABLE_RESIDUAL)
    expect(report.unattributed.clocks, 'four separate clocks fired, none attributable').toEqual([
      'tax',
      'aca-status',
      'contribution',
      'blend',
    ])
    const view = composeReentry(moved, report, NO_SENTENCES)
    expect(view.noteLines.filter((l) => l === copy.stalenessReferenceTables)).toHaveLength(1)
    expect(view.noteLines, 'the nameless line is the WHOLE disclosure — no clock is named').toEqual([
      copy.stalenessReferenceTables,
    ])
    expect(new Set(view.noteLines).size, 'every rendered line is unique — no React key collision').toBe(
      view.noteLines.length,
    )
    // And it never enters the "rules changed" register.
    expect(report.rulesMoved).toBe(false)
    expect(report.anyStale).toBe(true)
  })

  // ── F7b — THE STRUCTURAL INVARIANT (the general kill for the whole self-contradiction class) ──
  // `rulesMoved` is read by the hero's standing echo AND `savedRecommendation`'s conjunct 3. If it
  // can be true while `composeReentry` renders nothing, the household gets an alarm no sentence is
  // allowed to explain — strictly worse than either arm of the three-way. Before this arm the
  // mapping was under-pinned: deleting one clock from the family derivation left the suite green.
  it('INVARIANT: rulesMoved === true ⟹ composeReentry produces at least one line — swept over EVERY clock, both routes', () => {
    const spine = freshSave()
    const date = scenarioFor('date')
    const hvS = spine.healthcareVintage!
    const hvD = date.healthcareVintage!
    /** Every clock the reader can fire, each as a minimal scenario mutation + the household it
     *  fires for. Adding a clock without adding a row here leaves the sweep incomplete — the
     *  per-clock family table in `staleness.test.ts` is the compile-time half of that guard. */
    const cases: ReadonlyArray<readonly [string, CurrentScenario, StalenessExposure]> = [
      ['tax', { ...spine, taxVintageDetail: { ...spine.taxVintageDetail!, taxYear: 2019 } }, RETIRED_EXPOSURE],
      [
        'state-tax',
        {
          ...spine,
          retirementState: 'NC',
          stateTaxVintage: { ...spine.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
        },
        pricing(RETIRED_EXPOSURE, 'NC'),
      ],
      ['coverage-year (medicare half)', { ...spine, healthcareVintage: { ...hvS, coverageYear: hvS.coverageYear - 1 } }, RETIRED_EXPOSURE],
      ['coverage-year (both halves)', { ...date, healthcareVintage: { ...hvD, coverageYear: hvD.coverageYear - 1 } }, DATE_EXPOSURE],
      ['aca-status', { ...date, healthcareVintage: { ...hvD, acaStatus: 'enhanced subsidies restored (no cliff)' } }, DATE_EXPOSURE],
      ['fpl-guideline', { ...date, healthcareVintage: { ...hvD, fplGuidelineYear: hvD.fplGuidelineYear + 1 } }, DATE_EXPOSURE],
      ['irmaa-freeze', { ...spine, healthcareVintage: { ...hvS, irmaaTopTierFrozenThrough: hvS.irmaaTopTierFrozenThrough + 1 } }, RETIRED_EXPOSURE],
      ['part-b', { ...spine, healthcareVintage: { ...hvS, partBStandardMonthly: hvS.partBStandardMonthly + 10 } }, RETIRED_EXPOSURE],
      ['part-b-trend', { ...spine, healthcareVintage: { ...hvS, partBTrendVintage: 'part-b-trend-2025x' } }, RETIRED_EXPOSURE],
      [
        'extras-typical',
        (() => {
          const b = { ...spine, healthcareVintage: { ...hvS, medicareExtrasTypicalVintage: 'extras-2024x' } } as Record<string, unknown>
          delete b.medicareExtrasByPerson
          return b as unknown as CurrentScenario
        })(),
        RETIRED_EXPOSURE,
      ],
      [
        'contribution',
        { ...date, dateVintage: { ...date.dateVintage!, contributionYear: date.dateVintage!.contributionYear - 1 } },
        DATE_EXPOSURE,
      ],
      // The pay check's U13 clock: a W-present plan saved under the previous working-years table.
      ['working-years', withOlderWorkingYearsStamp(savedDraft(DATE_WITH_W)), exposureForDraft(DATE_WITH_W)],
    ]
    let fired = 0
    for (const [label, scenario, exposure] of cases) {
      const report = deriveStaleness(scenario, TODAY, exposure, { costStale: false, leftOverStale: false })
      const view = composeReentry(scenario, report, NO_SENTENCES)
      if (report.rulesMoved) {
        fired += 1
        expect(view.noteLines.length, `${label}: rulesMoved with NO line — an alarm nothing may explain`).toBeGreaterThan(0)
      }
      // The converse half, same sweep: a line at the gate is never rendered off nothing.
      if (view.noteLines.length > 0) expect(report.anyStale, `${label}: a line with no staleness`).toBe(true)
    }
    // NON-VACUITY: the sweep must actually exercise the true branch for every row, or the
    // implication holds trivially (burned/070).
    expect(fired, 'every case must raise rulesMoved — otherwise the invariant is vacuous').toBe(cases.length)
  })

  // The pay check's two re-entry lines — U13's clock (a NAMED rules line) and KTD21's stale answer
  // (worth a look, never a rules line) — end to end: real draft → real exposure + real stale
  // predicate → report → rendered sentence.
  it('the pay check: the working-years clock renders its own named line, once, and only for a run that carries W', () => {
    const s = withOlderWorkingYearsStamp(savedDraft(DATE_WITH_W))
    const report = deriveStaleness(s, TODAY, exposureForDraft(DATE_WITH_W), {
      costStale: isWorkingYearCostStale(DATE_WITH_W),
      leftOverStale: false,
    })
    expect(report.rulesMoved).toBe(true)
    expect(composeReentry(s, report, NO_SENTENCES).noteLines).toEqual([copy.stalenessWorkingYears])
    // The same stamp on the same household WITHOUT W: its run reads the table nowhere — no line.
    const noW = withOlderWorkingYearsStamp(savedDraft(DATE_NO_W))
    const silent = deriveStaleness(noW, TODAY, exposureForDraft(DATE_NO_W), {
      costStale: isWorkingYearCostStale(DATE_NO_W),
      leftOverStale: false,
    })
    expect(composeReentry(noW, silent, NO_SENTENCES).noteLines).toEqual([])
    expect(silent.anyStale).toBe(false)
  })

  it('the pay check: a plan saved stale on its W answer renders its stale line ONCE, with rulesMoved false (never the rules register)', () => {
    expect(isWorkingYearCostStale(DATE_STALE_W), 'the fixture is stale').toBe(true)
    const s = savedDraft(DATE_STALE_W)
    const report = deriveStaleness(s, TODAY, exposureForDraft(DATE_STALE_W), {
      costStale: isWorkingYearCostStale(DATE_STALE_W),
      leftOverStale: false,
    })
    expect(report.rulesMoved, 'the hero echo must stay dark').toBe(false)
    expect(report.anyStale).toBe(true)
    // b9-7: the gate speaks the W step's OWN stale sentence (both figures, the cause, the lean), framed
    // by the gate's lead, and points at the answer's door only where the tab can save.
    const text = workingYearCostStaleNote(DATE_STALE_W)!
    expect(text, 'the fixture quotes a figure').toMatch(/\$\d/)
    // The door sentence is the act's own (council `wf_7fa86902-35c`; the act is the caller's, read off the draft):
    // this fixture's spending rose past its yes, so "update"; the definition, where one is handed over, rides just
    // before the door, and both only where the tab can save.
    // The gate's door is the caller's, read off the draft (`workingYearCostStaleDoor`'s `gate`): never a part of the line
    // in the story column, but the view's own field, drawn under the buttons, and only where the tab can save (council
    // `wf_22858e04-f7a` (2)).
    const DOOR = { heading: 'A fixture heading', scope: 'A fixture scope sentence.', route: 'A fixture route.' }
    const line = { opening: text, segments: [{ label: 'A label', sentences: ['One.'] }] }
    const view = composeReentryParts(s, report, { costStale: { line, door: DOOR, canChange: true }, leftOverStale: null, typedBelow: null })
    const opening = `${copy.stalenessPayCheckGateLead} ${text}`
    expect(view.noteLines).toEqual([{ text: `${opening} A label One.`, parts: { opening, segments: line.segments, door: null } }])
    expect(notePartsText((view.noteLines[0] as { parts: Parameters<typeof notePartsText>[0] }).parts)).toBe(`${opening} A label One.`)
    expect(view.door, 'the door rides the view, under the buttons').toEqual(DOOR)
    const readOnly = composeReentryParts(s, report, { costStale: { line, door: DOOR, canChange: false }, leftOverStale: null, typedBelow: null })
    expect(readOnly.door, 'a read-only tab gets no door it cannot open, and no buttons named to press').toBeNull()
    expect(readOnly.noteLines).toEqual(view.noteLines)
    // The figure-less fallback only where no sentence is handed over.
    expect(composeReentry(s, report, NO_SENTENCES).noteLines).toEqual([copy.stalenessWorkingYearCost])
    expect(copy.stalenessWorkingYearCost, 'distinct text — ReEntry keys each note by it').not.toBe(copy.stalenessWorkingYears)
  })

  it('the pay check: a W that still matches carries no stale line, even handed a sentence (the report decides, never the caller)', () => {
    const fresh = savedDraft(DATE_STALE_W)
    const report = deriveStaleness(fresh, TODAY, exposureForDraft(DATE_STALE_W), { costStale: false, leftOverStale: false })
    expect(composeReentry(fresh, report, { costStale: { line: { opening: 'never rendered', segments: [] }, door: { heading: 'h', scope: 's', route: 'r' }, canChange: true }, leftOverStale: null, typedBelow: null })).toMatchObject({ noteLines: [], door: null })
  })

  it('the pay check: push order — the contribution clock, then the working-years clock, then the stale-answer line', () => {
    const base = withOlderWorkingYearsStamp(savedDraft(DATE_STALE_W))
    const s: CurrentScenario = {
      ...base,
      dateVintage: { ...base.dateVintage!, contributionYear: base.dateVintage!.contributionYear - 1 },
    }
    const report = deriveStaleness(s, TODAY, exposureForDraft(DATE_STALE_W), {
      costStale: isWorkingYearCostStale(DATE_STALE_W),
      leftOverStale: false,
    })
    expect(composeReentry(s, report, NO_SENTENCES).noteLines).toEqual([
      copy.stalenessDate,
      copy.stalenessWorkingYears,
      copy.stalenessWorkingYearCost,
    ])
  })

  // Build 2's KTD9 / U14: the moved left over's line. The fact is injected here and the sentences are
  // fixtures standing in for the caller's (the real ones are pinned on `datesavedmoved` below). The
  // household is real: `date` with W confirmed, the run that carries W (and so the only run that could
  // carry a left-over figure, R7). The line is the lead, the caller's sentence, then the door sentence
  // where the tab can save (the W line's door law).
  const LEFT_OVER_TEXT = 'A fixture sentence naming the stored and the live left over.'
  const LEFT_OVER_CLAUSE = 'A fixture clause naming the two figures.'
  const LEFT_OVER_SENTENCE: ReentryAnswerSentences = {
    costStale: null,
    leftOverStale: { text: LEFT_OVER_TEXT, clause: LEFT_OVER_CLAUSE, canChange: true },
    typedBelow: null,
  }
  const LEFT_OVER_LINE = `${copy.stalenessLeftOverNote} ${LEFT_OVER_TEXT} ${copy.stalenessLeftOverGateDoor}`
  const leftOverReport = (s: CurrentScenario, d: ScenarioDraft, leftOverStale: boolean) =>
    deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: isWorkingYearCostStale(d), leftOverStale })

  it('build 2: a moved left over renders the caller\'s sentence, once, and only that; anyStale, never rulesMoved', () => {
    const s = savedDraft(DATE_WITH_W)
    const report = leftOverReport(s, DATE_WITH_W, true)
    expect(report.rulesMoved, 'the hero echo must stay dark').toBe(false)
    expect(report.anyStale).toBe(true)
    expect(composeReentry(s, report, LEFT_OVER_SENTENCE).noteLines).toEqual([LEFT_OVER_LINE])
    // A read-only tab: the same line with no door sentence (the W line's door law).
    const readOnlySentence: ReentryAnswerSentences = {
      costStale: null,
      leftOverStale: { text: LEFT_OVER_TEXT, clause: LEFT_OVER_CLAUSE, canChange: false },
      typedBelow: null,
    }
    expect(composeReentry(s, report, readOnlySentence).noteLines).toEqual([`${copy.stalenessLeftOverNote} ${LEFT_OVER_TEXT}`])
  })

  it('build 2: the report decides, never the caller — a sentence with the fact unset, or silenced, renders nothing', () => {
    const s = savedDraft(DATE_WITH_W)
    const fresh = leftOverReport(s, DATE_WITH_W, false)
    expect(composeReentry(s, fresh, LEFT_OVER_SENTENCE).noteLines).toEqual([])
    // The spine household: its run reads no W, so it carries no left-over figure (R7) — the exposure
    // conjunct silences the fact upstream, and the handed sentence never renders.
    const retired = freshSave()
    const silenced = deriveStaleness(retired, TODAY, RETIRED_EXPOSURE, { costStale: false, leftOverStale: true })
    expect(RETIRED_EXPOSURE.workingYearCost, 'the real spine read').toBe('unpriced')
    expect(composeReentry(retired, silenced, LEFT_OVER_SENTENCE).noteLines).toEqual([])
    // The same silence beside a line that DOES speak (insight 103's silencing direction): a federal
    // tax re-key names the tax clock for this household, and the silenced left over must ride
    // nothing — neither its own line nor, at the go-live, a clause on the tax line (KTD9's host).
    const taxed: CurrentScenario = { ...retired, taxVintageDetail: { ...retired.taxVintageDetail!, taxYear: 2019 } }
    const taxedSilenced = deriveStaleness(taxed, TODAY, RETIRED_EXPOSURE, { costStale: false, leftOverStale: true })
    expect(taxedSilenced.controls.taxMoved, 'the host clock fired').toBe(true)
    expect(taxedSilenced.workingYear.leftOverStale).toBe(false)
    expect(composeReentry(taxed, taxedSilenced, LEFT_OVER_SENTENCE).noteLines).toEqual([copy.stalenessTax])
  })

  it('build 2: the fact set with no sentence is a wiring fault — it throws, never a silent drop', () => {
    const s = savedDraft(DATE_WITH_W)
    const report = leftOverReport(s, DATE_WITH_W, true)
    expect(() => composeReentry(s, report, NO_SENTENCES)).toThrow(/left over moved/)
  })

  // Neither the contribution clock nor the nameless aggregate is one of the three clocks (tax, state
  // tax, working years) whose line the go-live (U14) hands the left over's clause to, so both orders
  // outlive U13. (A stale W beside a moved left over is unreachable: R12's "moved" needs a fresh W.)
  it('build 2: push order — the rules lines and the nameless aggregate first, the moved left over after them', () => {
    const base = savedDraft(DATE_WITH_W)
    const s: CurrentScenario = {
      ...base,
      dateVintage: { ...base.dateVintage!, contributionYear: base.dateVintage!.contributionYear - 1 },
    }
    const report = leftOverReport(s, DATE_WITH_W, true)
    expect(report.date.contributionMoved, 'the fixture fires the contribution clock').toBe(true)
    expect(composeReentry(s, report, LEFT_OVER_SENTENCE).noteLines).toEqual([copy.stalenessDate, LEFT_OVER_LINE])
    const blended: CurrentScenario = { ...s, dateVintage: { ...s.dateVintage!, blendSnapshotAsOf: '2019-01-01' } }
    const withAggregate = leftOverReport(blended, DATE_WITH_W, true)
    expect(withAggregate.unattributed.clocks, 'the fixture fires the aggregate').toEqual(['blend'])
    expect(composeReentry(blended, withAggregate, LEFT_OVER_SENTENCE).noteLines).toEqual([
      copy.stalenessDate,
      copy.stalenessReferenceTables,
      LEFT_OVER_LINE,
    ])
    // Neither the contribution clock nor the aggregate hosts the clause.
    expect(composeReentry(blended, withAggregate, LEFT_OVER_SENTENCE).leftOverClauseHost).toBe(false)
  })

  // U14 (R12, KTD9): one cause, one line — a fired tax, state-tax or working-years line carries the moved left
  // over as a CLAUSE (the FIRST of them in push order), and no second line speaks; the host is decided once,
  // here, and recorded on the view for the Result's hero note.
  it('build 2 (U14): a fired working-years line carries the clause, no moved line of its own, and the view records the host', () => {
    const s = withOlderWorkingYearsStamp(savedDraft(DATE_WITH_W))
    const report = leftOverReport(s, DATE_WITH_W, true)
    expect(report.workingYear.vintageMoved, 'the fixture fires the working-years clock').toBe(true)
    const view = composeReentry(s, report, LEFT_OVER_SENTENCE)
    expect(view.noteLines).toEqual([`${copy.stalenessWorkingYears} ${LEFT_OVER_CLAUSE}`])
    expect(view.leftOverClauseHost).toBe(true)
    // The host is the CLOCK's fact, not the left over's: with nothing moved, the host still reads true.
    expect(composeReentry(s, leftOverReport(s, DATE_WITH_W, false), LEFT_OVER_SENTENCE).leftOverClauseHost).toBe(true)
    // And the throw still fires when the host fires but no sentence was passed.
    expect(() => composeReentry(s, report, NO_SENTENCES)).toThrow(/left over moved/)
  })

  it('build 2 (U14): the clause rides the FIRST fired of tax, state tax and working years — never two of them', () => {
    const base = withOlderWorkingYearsStamp(savedDraft(DATE_WITH_W))
    const s: CurrentScenario = { ...base, taxVintageDetail: { ...base.taxVintageDetail!, taxYear: 2019 } }
    const report = leftOverReport(s, DATE_WITH_W, true)
    expect(report.controls.taxMoved && report.workingYear.vintageMoved, 'both host clocks fired').toBe(true)
    const lines = composeReentry(s, report, LEFT_OVER_SENTENCE).noteLines
    expect(lines).toContain(`${copy.stalenessTax} ${LEFT_OVER_CLAUSE}`)
    expect(lines).toContain(copy.stalenessWorkingYears)
    expect(lines.filter((l) => l.includes(LEFT_OVER_CLAUSE))).toHaveLength(1)
    expect(lines.some((l) => l.startsWith(copy.stalenessLeftOverNote)), 'no moved line of its own').toBe(false)
  })

  // The go-live review (KTD7) found every host arm above putting the host at noteLines[0]: a state-tax line
  // pushed plainly (two lines, host false), or a host index that always pointed at line 0, stayed green.
  it('build 2 (U14): a fired STATE-TAX line hosts the clause too — one line, no moved line of its own, the host recorded', () => {
    const base = savedDraft(DATE_WITH_W)
    const s: CurrentScenario = {
      ...base,
      retirementState: 'NC',
      stateTaxVintage: { ...base.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
    }
    // The run that carries W (so its exposure prices the working years), priced in NC by the producer's read.
    const report = deriveStaleness(s, TODAY, pricing(exposureForDraft(DATE_WITH_W), 'NC'), { costStale: false, leftOverStale: true })
    expect(report.controls.stateTaxMoved, 'the state clock fired').toBe(true)
    expect(report.workingYear.leftOverStale, 'the left over is not silenced on this run').toBe(true)
    const view = composeReentry(s, report, LEFT_OVER_SENTENCE)
    expect(view.noteLines).toEqual([`${copy.stalenessStateTax} ${LEFT_OVER_CLAUSE}`])
    expect(view.leftOverClauseHost).toBe(true)
  })

  it('build 2 (U14): a NON-host line fired first leaves the clause on the first HOST line, never on line 0 — the contribution line plain, the working-years line carrying it', () => {
    const base = withOlderWorkingYearsStamp(savedDraft(DATE_WITH_W))
    const s: CurrentScenario = {
      ...base,
      dateVintage: { ...base.dateVintage!, contributionYear: base.dateVintage!.contributionYear - 1 },
    }
    const report = leftOverReport(s, DATE_WITH_W, true)
    expect(report.date.contributionMoved && report.workingYear.vintageMoved, 'both clocks fired').toBe(true)
    const view = composeReentry(s, report, LEFT_OVER_SENTENCE)
    expect(view.noteLines).toEqual([copy.stalenessDate, `${copy.stalenessWorkingYears} ${LEFT_OVER_CLAUSE}`])
    expect(view.leftOverClauseHost).toBe(true)
  })

  it('build 2 (U14): an ACA-only or contribution-only clock hosts nothing — the separate moved line speaks, and the host reads false', () => {
    const base = savedDraft(DATE_WITH_W)
    const s: CurrentScenario = {
      ...base,
      dateVintage: { ...base.dateVintage!, contributionYear: base.dateVintage!.contributionYear - 1 },
    }
    const view = composeReentry(s, leftOverReport(s, DATE_WITH_W, true), LEFT_OVER_SENTENCE)
    expect(view.noteLines).toEqual([copy.stalenessDate, LEFT_OVER_LINE])
    expect(view.leftOverClauseHost).toBe(false)
  })

  it('build 2 (U14): `datesavedmoved` as a vault — the real core names both figures, $16,985 stored and $27,537 live, the fact and the sentence from one value', () => {
    const d = DEV_SEEDS.datesavedmoved
    const s = savedDraft(d)
    const moved = workingYearLeftOverMoved(d)
    expect(moved).toEqual({ stored: 16_985, live: 27_537, typedBelow: null })
    if (moved === null) return
    const report = deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: isWorkingYearCostStale(d), leftOverStale: moved !== null })
    expect(report.workingYear.leftOverStale).toBe(true)
    const view = composeReentry(s, report, {
      costStale: null,
      leftOverStale: { text: workingYearLeftOverMovedText(moved), clause: workingYearLeftOverMovedClause(moved), canChange: true },
      typedBelow: null,
    })
    expect(view.noteLines).toEqual([
      `${copy.stalenessLeftOverNote} ${slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')} ${copy.stalenessLeftOverGateDoor}`,
    ])
  })

  it('build 2 (U14): `datesavedstale` as a vault — W’s one line carries the clause naming the $16,985 not added, and no moved line speaks', () => {
    const d = DEV_SEEDS.datesavedstale
    const s = savedDraft(d)
    expect(workingYearLeftOverMoved(d), 'waiting on W is never moved').toBeNull()
    const report = deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: isWorkingYearCostStale(d), leftOverStale: false })
    const line = workingYearCostStaleLine(d)
    expect(line?.opening).toBe(`${workingYearCostStaleNote(d)} ${copy.workingCostStaleEitherWayConfirm}`)
    expect(line?.segments[0]?.label).toBe(copy.workingCostStaleLabelNow)
    expect(line?.segments[0]?.sentences).toContain(slots.workingCostStaleLeftOverAnswered('16,985'))
    // The door: "confirm or change" (the spending fell, so the Keep door is real) — on the gate its heading, the scope
    // sentence and the route, and never the W row's choices (council `wf_22858e04-f7a` (2), (3)).
    const door = workingYearCostStaleDoor(d)
    const gate = {
      heading: slots.workingCostStaleDoorHeadingConfirm('84,000'),
      scope: slots.workingCostStaleGateScopeConfirm('84,000'),
      route: slots.workingCostStaleGateRoute(copy.stalenessPayCheckCta),
    }
    expect(door?.act).toBe('confirmOrChange')
    expect(door?.gate).toEqual(gate)
    const view = composeReentry(s, report, {
      costStale: line === null || door === null ? null : { line, door: door.gate, canChange: true },
      leftOverStale: null,
      typedBelow: null,
    })
    expect(view.noteLines).toEqual([[copy.stalenessPayCheckGateLead, workingYearCostStaleLineText(line!)].join(' ')])
    expect(view.door).toEqual(gate)
    // Under any other answer W's line gains no clause.
    expect(workingYearCostStaleLine(DEV_SEEDS.datecoststale)).toEqual({ opening: workingYearCostStaleNote(DEV_SEEDS.datecoststale), segments: [] })
  })

  // S5.4 — the state-tax staleness clock's own named line: a PRICED household (NC) whose own
  // state profile drifted since save gets `stalenessStateTax` at the re-entry gate (never aliased
  // onto stalenessTax — the two clocks fire independently).
  it('S5: a priced household whose state rules moved gets the state-tax staleness line, named', () => {
    const s = freshSave()
    const drifted: CurrentScenario = {
      ...s,
      retirementState: 'NC',
      stateTaxVintage: { ...s.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
    }
    const report = reportFor(drifted, pricing(RETIRED_EXPOSURE, 'NC'))
    expect(report.controls.stateTaxMoved, 'the state clock fired').toBe(true)
    const view = composeReentry(drifted, report, NO_SENTENCES)
    expect(view.noteLines).toContain(copy.stalenessStateTax)
  })

  it("S5: an 'elsewhere' vault whose stamp drifted fires NO state-tax line (nothing state-priced to stale)", () => {
    const s = freshSave()
    const drifted: CurrentScenario = {
      ...s,
      retirementState: 'elsewhere',
      stateTaxVintage: { ...s.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
    }
    // U17 §S4: the gate now reads the RUN's priced state, and an 'elsewhere' household's run
    // prices none — `pricedStateForRun` roster-filters it to undefined.
    const view = composeReentry(drifted, reportFor(drifted, pricing(RETIRED_EXPOSURE, undefined)), NO_SENTENCES)
    expect(view.noteLines).not.toContain(copy.stalenessStateTax)
  })

  it('two expired windows sharing an end year collapse to ONE line (the copy quotes only the year — twins would render byte-identical sentences and collide on the render key)', () => {
    const s = freshSave()
    const doctored: CurrentScenario = {
      ...s,
      budget: [
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 0 },
        { category: 'gifts', label: 'Gifts', tier: 'discretionary', annualAmountReal: 2_000, startYear: 0, endYear: 0 },
        { category: 'other', label: 'Boat', tier: 'discretionary', annualAmountReal: 4_000, startYear: 0, endYear: 1 },
      ] as CurrentScenario['budget'],
      startCalendarYear: s.startCalendarYear - 3,
    } as CurrentScenario
    const view = composeReentry(doctored, reportFor(doctored), NO_SENTENCES)
    const budgetLines = view.noteLines.filter((l) => l.includes('budget'))
    expect(budgetLines).toEqual([
      slots.stalenessBudgetLine(doctored.startCalendarYear), // travel + gifts, ONE line
      slots.stalenessBudgetLine(doctored.startCalendarYear + 1), // the boat's own year
    ])
  })

  it('the BLEND clock: SILENT for the manual-blend household, NAMELESS for the table-reading one — two households, one moved stamp, both sentences true (U17 §S4 F5)', () => {
    // The predecessor named the blend table on both routes (`stalenessBlendSpine` / the fund
    // clause inside `stalenessDate`) — false for a household holding none of the re-dated funds,
    // since `BLEND_SNAPSHOT_AS_OF` is the MAX asOf across ALL ticker rows. Both keys are gone.
    // The F-pass then closed the second half: the nameless line says "we can't tell whether any
    // of them touches your own numbers", and for the `retired` seed WE CAN — its one account
    // carries a manual blend, so `resolveBlend` never reaches the table. It goes silent.
    const s = freshSave() // all-retired, manual blends only
    const blendMoved = { ...s, dateVintage: { ...s.dateVintage!, blendSnapshotAsOf: '2019-01-01' } }
    const view = composeReentry(blendMoved, reportFor(blendMoved), NO_SENTENCES)
    expect(view.noteLines, 'provably inert ⇒ not one line').toEqual([])
    expect(RETIRED_EXPOSURE.blend, 'and the silence is the REAL seed’s own read').toBe('unpriced')
    // The date household holds VTI + VFIFX — its stockWeight DOES read the dated table, so the
    // stamp genuinely could have moved its answer and no per-row compare can say. Nameless.
    const d = readySave('date')
    if (!d.ready) throw new Error('date seed must be save-ready')
    const dMoved = { ...d.scenario, dateVintage: { ...d.scenario.dateVintage!, blendSnapshotAsOf: '2019-01-01' } }
    const dView = composeReentry(dMoved, reportFor(dMoved, DATE_EXPOSURE), NO_SENTENCES)
    expect(DATE_EXPOSURE.blend).toBe('priced')
    expect(dView.noteLines).toEqual([copy.stalenessReferenceTables])
    expect(dView.noteLines).not.toContain(copy.stalenessDate)
  })

  it('the CONTRIBUTION clock keeps its own named line, route-gated to a household that actually has a date', () => {
    const d = scenarioFor('date')
    const bumped: CurrentScenario = {
      ...d,
      dateVintage: { ...d.dateVintage!, contributionYear: d.dateVintage!.contributionYear - 1 },
    }
    const view = composeReentry(bumped, reportFor(bumped, DATE_EXPOSURE), NO_SENTENCES)
    expect(view.noteLines).toEqual([copy.stalenessDate])
    // The all-retired household is quiet on the same move (its answer reads no limit).
    const s = freshSave()
    const retiredBumped: CurrentScenario = {
      ...s,
      dateVintage: { ...s.dateVintage!, contributionYear: s.dateVintage!.contributionYear - 1 },
    }
    expect(composeReentry(retiredBumped, reportFor(retiredBumped), NO_SENTENCES).noteLines).toEqual([])
  })

  it('the wall-time line is SUPPRESSED without savedAt and under a year — never fabricated', () => {
    const s = freshSave()
    const anchorless = { ...s } as Record<string, unknown>
    delete anchorless.savedAt
    expect(composeReentry(anchorless as unknown as CurrentScenario, reportFor(anchorless as unknown as CurrentScenario), NO_SENTENCES).elapsedLine).toBeNull()
    const recent = { ...s, savedAt: TODAY - 120 }
    expect(composeReentry(recent, reportFor(recent), NO_SENTENCES).elapsedLine).toBeNull()
  })

  it('the intro speaks ROUTE-TRUE (Caddie card #1): "benefit checks" for an all-retired household, "paychecks" only where paychecks exist', () => {
    // The retired spine household: no paychecks — the spouse walker's primary stumble was
    // the route-blind intro ("does this thing even know we stopped working?").
    const s = freshSave()
    expect(composeReentry(s, reportFor(s), NO_SENTENCES).introKey).toBe('reentryIntroRetired')
    // The still-working date household keeps the original register.
    const d = readySave('date')
    if (!d.ready) throw new Error('date seed must be save-ready')
    expect(composeReentry(d.scenario, reportFor(d.scenario, DATE_EXPOSURE), NO_SENTENCES).introKey).toBe('reentryIntro')
  })

  it('the wall-time line rounds HALF, never floors (Caddie O6): a 700-day save reads "about 2 years", not the rosier "about a year"', () => {
    const s = freshSave()
    const at = (days: number) => {
      const aged = { ...s, savedAt: TODAY - days }
      return composeReentry(aged, reportFor(aged), NO_SENTENCES).elapsedLine
    }
    // The filed witness: 700 days = 1.92y — the old floor read "about a year ago" (rosier
    // direction on the one line whose job is "your save is older than you think").
    expect(at(700)).toBe(slots.reentryElapsedYears(2))
    // The suppression gate is day-based and unchanged: 364d silent, 365d speaks.
    expect(at(364)).toBeNull()
    expect(at(365)).toBe(slots.reentryElapsedYears(1))
    // Round-half boundary, hand-derived: 547d = 1.499y → 1; 548d = 1.501y → 2. "About" is
    // honest within ±half a year in BOTH directions — the floor's error was one-sided.
    expect(at(547)).toBe(slots.reentryElapsedYears(1))
    expect(at(548)).toBe(slots.reentryElapsedYears(2))
    // The ?vault=stale plant's own witness (savedAt −760d): reads "about 2 years ago"
    // under BOTH roundings — the fit gate's pinned gate text does not move.
    expect(at(760)).toBe(slots.reentryElapsedYears(2))
  })
})

// =============================================================================================
// THE ENGINE'S OWN METHOD — `report.pricing` rendered (the engine-domain council, 2026-09-27). Three
// lines at most: ONE named method line over every named family (Medicare last), ONE nameless hedge,
// ONE conditional spending re-confirm. The pricing lines ride `anyStale` only — never `rulesMoved`,
// so the hero's standing "rules changed" echo stays dark on a pricing-only re-entry.
// =============================================================================================
describe('composeReentry — the engine-pricing lines', () => {
  /** Each family's phrase, restated by hand (the renderer's own table is module-private). */
  const PHRASE: Readonly<Record<PricingFamily, string>> = {
    tax: copy.stalenessPricingTax,
    stateTax: copy.stalenessPricingStateTax,
    contributions: copy.stalenessPricingContributions,
    aca: copy.stalenessPricingAca,
    spending: copy.stalenessPricingSpending,
    medicare: copy.stalenessPricingMedicare,
  }
  const PRICING_LINES = new Set<string>([copy.stalenessPricingHedged, copy.stalenessReconfirmMedicareSpending])
  /** The method line's fixed lead-in, read off the shipped slot (render it around a sentinel, keep the
   *  text before it) — never a re-typed literal. */
  const METHOD_LEAD = slots.stalenessPricing('\u0000').split('\u0000')[0]!
  const isMethodLine = (l: string) => l.startsWith(METHOD_LEAD)
  /** A real, fully-quiet report (a fresh save by this build) with `pricing` overridden — every other clock
   *  is silent, so every rendered line is a pricing line. */
  const quietScenario = () => freshSave()
  const withPricing = (
    pricing: Omit<StalenessReport['pricing'], 'moved'>,
  ): { scenario: CurrentScenario; report: StalenessReport } => {
    const scenario = quietScenario()
    const base = reportFor(scenario)
    const moved = pricing.namedFamilies.length > 0 || pricing.hedged || pricing.reconfirmMedicareSpending
    return { scenario, report: { ...base, pricing: { ...pricing, moved }, anyStale: base.anyStale || moved } }
  }
  const savedOn = (s: CurrentScenario, savedAt: number | undefined): CurrentScenario => {
    const out = { ...s } as Record<string, unknown>
    if (savedAt === undefined) delete out.savedAt
    else out.savedAt = savedAt
    return out as unknown as CurrentScenario
  }
  const SHIP_DAYS = [...new Set(ENGINE_PRICING_LEDGER.map((r) => r.sinceEpochDay))]

  it('INVARIANT: pricing.moved ⟹ at least one line, and every line unique — swept over REAL reports (seeds × save days × exposures)', () => {
    const noMarker = (s: CurrentScenario): CurrentScenario => {
      const hv = { ...s.healthcareVintage! } as Record<string, unknown>
      delete hv.medicareExtrasTypicalVintage
      return { ...s, healthcareVintage: hv as unknown as CurrentScenario['healthcareVintage'] }
    }
    const households: ReadonlyArray<readonly [string, CurrentScenario, StalenessExposure]> = [
      ['retired', freshSave(), RETIRED_EXPOSURE],
      ['retired+NC', { ...freshSave(), retirementState: 'NC' }, pricing(RETIRED_EXPOSURE, 'NC')],
      ['retired, no extras marker', noMarker(freshSave()), RETIRED_EXPOSURE],
      ['health (pre-65 marketplace)', scenarioFor('health'), ACA_PRICED_EXPOSURE],
      ['date', scenarioFor('date'), DATE_EXPOSURE],
      ['unbuildable residual', freshSave(), UNBUILDABLE_RESIDUAL],
    ]
    const days = [undefined, ...SHIP_DAYS.flatMap((d) => [d - 1, d, d + 1])]
    let moved = 0
    let named = 0
    let hedged = 0
    let reconfirm = 0
    for (const [name, scenario, exposure] of households) {
      for (const day of days) {
        const s = savedOn(scenario, day)
        const report = deriveStaleness(s, TODAY, exposure, { costStale: false, leftOverStale: false })
        const view = composeReentry(s, report, NO_SENTENCES)
        const at = `${name} saved ${String(day)}`
        if (report.pricing.moved) {
          moved += 1
          expect(view.noteLines.length, `${at}: pricing moved with NO line`).toBeGreaterThan(0)
          // Exactly the pricing lines the flags call for, no more, no fewer (every other clock is fresh).
          const expectedCount =
            (report.pricing.namedFamilies.length > 0 ? 1 : 0) + (report.pricing.hedged ? 1 : 0) + (report.pricing.reconfirmMedicareSpending ? 1 : 0)
          expect(view.noteLines.filter((l) => isMethodLine(l) || PRICING_LINES.has(l)).length, at).toBe(expectedCount)
        }
        expect(new Set(view.noteLines).size, `${at}: a duplicated line collides on the React key`).toBe(view.noteLines.length)
        if (view.noteLines.length > 0) expect(report.anyStale, `${at}: a line with no staleness`).toBe(true)
        if (report.pricing.namedFamilies.length > 0) named += 1
        if (report.pricing.hedged) hedged += 1
        if (report.pricing.reconfirmMedicareSpending) reconfirm += 1
      }
    }
    // NON-VACUITY: the sweep reaches every one of the three lines, many times.
    expect(moved).toBeGreaterThan(10)
    expect(named, 'the named line is exercised').toBeGreaterThan(0)
    expect(hedged, 'the hedge is exercised').toBeGreaterThan(0)
    expect(reconfirm, 'the re-confirm is exercised').toBeGreaterThan(0)
  })

  it('ONE family ⇒ the bare phrase; TWO ⇒ "a and b"; THREE ⇒ "a, b and c" — Medicare last', () => {
    const lineFor = (namedFamilies: readonly PricingFamily[]) => {
      const { scenario, report } = withPricing({ namedFamilies, hedged: false, reconfirmMedicareSpending: false })
      return composeReentry(scenario, report, NO_SENTENCES).noteLines
    }
    expect(lineFor(['tax'])).toEqual([slots.stalenessPricing(copy.stalenessPricingTax)])
    expect(lineFor(['medicare'])).toEqual([slots.stalenessPricing(copy.stalenessPricingMedicare)])
    expect(lineFor(['tax', 'medicare'])).toEqual([
      slots.stalenessPricing(`${copy.stalenessPricingTax} and ${copy.stalenessPricingMedicare}`),
    ])
    expect(lineFor(['tax', 'contributions', 'medicare'])).toEqual([
      slots.stalenessPricing(`${copy.stalenessPricingTax}, ${copy.stalenessPricingContributions} and ${copy.stalenessPricingMedicare}`),
    ])
    expect(lineFor(['tax', 'stateTax', 'contributions', 'aca', 'spending', 'medicare'])).toEqual([
      slots.stalenessPricing(
        `${copy.stalenessPricingTax}, ${copy.stalenessPricingStateTax}, ${copy.stalenessPricingContributions}, ${copy.stalenessPricingAca}, ${copy.stalenessPricingSpending} and ${copy.stalenessPricingMedicare}`,
      ),
    ])
  })

  it('the method line names ONLY the named families — every non-empty subset, each phrase once, no stranger’s phrase, Medicare’s clause at the end', () => {
    const families = PRICING_FAMILY_ORDER
    for (let mask = 1; mask < 1 << families.length; mask++) {
      const namedFamilies = families.filter((_, i) => (mask & (1 << i)) !== 0)
      const { scenario, report } = withPricing({ namedFamilies, hedged: false, reconfirmMedicareSpending: false })
      const lines = composeReentry(scenario, report, NO_SENTENCES).noteLines
      expect(lines, `${namedFamilies.join('+')}: one line`).toHaveLength(1)
      const line = lines[0]!
      for (const f of families) {
        const count = line.split(PHRASE[f]).length - 1
        expect(count, `${namedFamilies.join('+')}: "${PHRASE[f]}"`).toBe(namedFamilies.includes(f) ? 1 : 0)
      }
      if (namedFamilies.includes('medicare')) {
        const at = line.indexOf(PHRASE.medicare)
        for (const f of namedFamilies) expect(line.indexOf(PHRASE[f]), `${f} before Medicare`).toBeLessThanOrEqual(at)
      }
      // The joiner: "and" exactly once before the last phrase, commas only between earlier ones.
      const joined = line.slice(line.indexOf(PHRASE[namedFamilies[0]!]), line.indexOf(PHRASE[namedFamilies[namedFamilies.length - 1]!]))
      expect((joined.match(/ and $/g) ?? []).length, `${namedFamilies.join('+')}: the final "and"`).toBe(namedFamilies.length > 1 ? 1 : 0)
    }
  })

  it('the HEDGE and the RE-CONFIRM render exactly when their flags are set — in order: method line, hedge, re-confirm', () => {
    const method = slots.stalenessPricing(copy.stalenessPricingTax)
    for (const named of [false, true]) {
      for (const hedged of [false, true]) {
        for (const reconfirmMedicareSpending of [false, true]) {
          const { scenario, report } = withPricing({ namedFamilies: named ? ['tax'] : [], hedged, reconfirmMedicareSpending })
          const expected = [
            ...(named ? [method] : []),
            ...(hedged ? [copy.stalenessPricingHedged] : []),
            ...(reconfirmMedicareSpending ? [copy.stalenessReconfirmMedicareSpending] : []),
          ]
          expect(composeReentry(scenario, report, NO_SENTENCES).noteLines, `named=${named} hedged=${hedged} reconfirm=${reconfirmMedicareSpending}`).toEqual(expected)
        }
      }
    }
  })

  it('a PRICING-ONLY re-entry leaves the hero echo register dark: rulesMoved false, no rules-register line — yet the gate still speaks', () => {
    // A real report: a save before the ledger began (every row crossed) by this build's stamps. The hero's
    // standing "Some rules changed since your save" echo rides `rulesMoved` alone (IntakeApp's
    // `stalenessNote={reentry?.rulesMoved === true}`).
    const s = savedOn(freshSave(), ENGINE_PRICING_LEDGER[0]!.sinceEpochDay - 1)
    const report = reportFor(s)
    expect(report.pricing.moved, 'premise: the ledger speaks').toBe(true)
    expect(report.rulesMoved, 'the hero echo stays dark — no law moved').toBe(false)
    expect(report.anyStale, 'the gate still has something to say').toBe(true)
    const lines = composeReentry(s, report, NO_SENTENCES).noteLines
    expect(lines.length).toBeGreaterThan(0)
    for (const rulesLine of [
      copy.stalenessAppDefault,
      copy.stalenessTax,
      copy.stalenessStateTax,
      copy.stalenessAca,
      copy.stalenessMedicare,
      copy.stalenessDate,
      copy.stalenessReferenceTables,
      copy.stalenessHeroNote,
    ]) {
      expect(lines, 'no rules-register (or reference-data) sentence rides a method change').not.toContain(rulesLine)
    }
    expect(lines.every((l) => isMethodLine(l) || PRICING_LINES.has(l)), 'every line is a pricing line').toBe(true)
    // …and the same holds on every ship day (the ambiguous day's nameless hedge included).
    for (const day of SHIP_DAYS) {
      const onDay = savedOn(freshSave(), day)
      const onDayReport = reportFor(onDay)
      expect(onDayReport.rulesMoved, `saved ${day}`).toBe(false)
      expect(composeReentry(onDay, onDayReport, NO_SENTENCES).noteLines.every((l) => isMethodLine(l) || PRICING_LINES.has(l)), `saved ${day}`).toBe(true)
    }
  })
})

// =============================================================================================
// THE WORKING-YEAR TAX FLOOR AT THE GATE (ledger v12, 2026-10-20 — the plan's U5). End to end, seed →
// built params → exposure (the engine's own `workingYearTaxReach` walk) → report → rendered sentence: a
// date-route vault the floor can reach hears the shipped "your taxes" line (and "your state tax" in NC);
// a retired vault, an NC one included, and an unreachable date-route vault hear nothing new.
// =============================================================================================
describe('composeReentry — the working-year tax floor (ledger v12)', () => {
  const V12 = ENGINE_PRICING_LEDGER.find((r) => r.version === 12)!
  /** The day before v12 shipped — after v11 (2026-10-09), so v12 is the only row this save crosses. */
  const DAY_BEFORE = V12.sinceEpochDay - 1
  const savedOnDay = (s: CurrentScenario, savedAt: number): CurrentScenario => ({ ...s, savedAt })
  const linesFor = (key: keyof typeof DEV_SEEDS | CurrentScenario, exposure: StalenessExposure, savedAt: number) => {
    const s = savedOnDay(typeof key === 'string' ? scenarioFor(key) : key, savedAt)
    return composeReentry(s, deriveStaleness(s, TODAY, exposure, { costStale: false, leftOverStale: false }), NO_SENTENCES).noteLines
  }
  /** `date` made young and two-earner (45 + 47) — nothing in any clamped year for the floor to price. A
   *  still-working person carries no retirement age (the save gate refuses one), so Sam's is dropped. W is
   *  stripped: `date` carries W since U10, and a W-carrying construct reads reached through KTD15's branch
   *  whenever anyone works — these arms measure the FLOOR's own reach. */
  const { retirementAge: _samRetired, ...sam } = DEV_SEEDS.date.people[1]!
  const { workingYearCost: _w, ...dateNoW } = DEV_SEEDS.date
  const youngDraft: ScenarioDraft = {
    ...dateNoW,
    people: [
      { ...DEV_SEEDS.date.people[0]!, birthYear: 1981, currentAge: 45 },
      { ...sam, birthYear: 1979, currentAge: 47, workStatus: 'working' as const, earnedIncomeReal: 60_000 },
    ],
  }
  const youngScenario = (): CurrentScenario => {
    const r = scenarioFromDraft(youngDraft)
    if (!r.ready) throw new Error('the unreached date-route draft must be save-ready')
    return r.scenario
  }

  it('premise: v12 is the working-year floor row (tax + NC state tax, gated on the working-years reach), and the day before it crosses no other row', () => {
    expect({ families: V12.families, states: V12.states, reach: V12.reach }).toEqual({
      families: ['tax', 'stateTax'],
      states: ['NC'],
      reach: 'working-years',
    })
    expect(ENGINE_PRICING_LEDGER.filter((r) => r.sinceEpochDay >= DAY_BEFORE).map((r) => r.version)).toEqual([12])
  })

  it('a `dip` vault saved before the ship day renders the shipped tax line — exactly that sentence, nothing else', () => {
    const exposure = exposureForDraft(DEV_SEEDS.dip)
    expect(exposure.workingYearTax, 'premise: the floor reaches dip (its year-4 conversion on top of its pay)').toBe('priced')
    const lines = linesFor('dip', exposure, DAY_BEFORE)
    expect(lines).toEqual([slots.stalenessPricing(copy.stalenessPricingTax)])
    // The rendered words, typed out (the slot is the producer; this pins what the household reads).
    expect(lines[0]).toBe('Since your save, we’ve changed how this tool works out your taxes. This reading uses the current method.')
  })

  it('a `datenc` vault adds "your state tax" — NC’s AGI-derived base takes the pay too', () => {
    const exposure = exposureForDraft(DEV_SEEDS.datenc)
    expect(exposure.workingYearTax).toBe('priced')
    expect(exposure.pricedState).toBe('NC')
    expect(linesFor('datenc', exposure, DAY_BEFORE)).toEqual([
      slots.stalenessPricing(`${copy.stalenessPricingTax} and ${copy.stalenessPricingStateTax}`),
    ])
  })

  it('RETIRED vaults crossing v12 — `retired`, and `nc` (an NC-priced retired household) — get NO v12 line: their taxes did not move', () => {
    expect(linesFor('retired', RETIRED_EXPOSURE, DAY_BEFORE)).toEqual([])
    const ncExposure = exposureForDraft(DEV_SEEDS.nc)
    expect(ncExposure.pricedState, 'premise: the run prices NC').toBe('NC')
    expect(ncExposure.workingYearTax, 'premise: and reaches no working year').toBe('unpriced')
    expect(linesFor('nc', ncExposure, DAY_BEFORE)).toEqual([])
  })

  it('an UNREACHABLE date-route vault crossing v12 gets no line', () => {
    const exposure = exposureForDraft(youngDraft)
    expect(exposure.workingYearTax, 'premise: unreached').toBe('unpriced')
    expect(linesFor(youngScenario(), exposure, DAY_BEFORE)).toEqual([])
  })

  it('THE SHIP DAY: an unreached vault saved ON v12’s day is silent; a reached one is spoken namelessly', () => {
    expect(linesFor(youngScenario(), exposureForDraft(youngDraft), V12.sinceEpochDay)).toEqual([])
    expect(linesFor('dip', exposureForDraft(DEV_SEEDS.dip), V12.sinceEpochDay)).toEqual([copy.stalenessPricingHedged])
  })

  it('GUARD: a retired vault saved before the ledger began STILL names "your taxes" — the reach gates v12 alone, never the rows before it', () => {
    const lines = linesFor('retired', RETIRED_EXPOSURE, ENGINE_PRICING_LEDGER[0]!.sinceEpochDay - 1)
    const method = lines.filter((l) => l.startsWith(slots.stalenessPricing('\u0000').split('\u0000')[0]!))
    expect(method).toHaveLength(1)
    expect(method[0]).toContain(copy.stalenessPricingTax)
  })
})

describe('ReEntry — the surface', () => {
  const baseView = () => {
    const s = freshSave()
    return composeReentry(s, reportFor(s), NO_SENTENCES)
  }

  it('moves focus to the heading on mount (the intake focus law — the heading IS the announcement)', () => {
    render(<ReEntry view={baseView()} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('heading', { name: copy.reentryHeading })).toHaveFocus()
  })

  it('writable: affirm-first pair, each wired to its own callback', () => {
    const onAffirm = vi.fn()
    const onUpdate = vi.fn()
    render(<ReEntry view={baseView()} readOnly={false} onAffirm={onAffirm} onUpdate={onUpdate} />)
    const buttons = screen.getAllByRole('button')
    // Affirm renders FIRST (the primary path leads; the change route is the quiet second).
    expect(buttons[0]).toHaveTextContent(copy.reentryAffirmCta)
    fireEvent.click(screen.getByRole('button', { name: copy.reentryAffirmCta }))
    expect(onAffirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: copy.reentryUpdateCta }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('read-only: Continue only — no update affordance, and the read-back still discloses', () => {
    render(<ReEntry view={baseView()} readOnly onAffirm={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('button', { name: copy.reentryContinueCta })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.reentryUpdateCta })).toBeNull()
    expect(screen.getByText(copy.reentryBalancesLegend)).toBeInTheDocument()
  })

  // THE FORM ON THE GATE (council `wf_22858e04-f7a`; U11 walk 6): W's line is a block in the story column — the opening,
  // then a <dl> of labelled parts, never a heading — and its door sits under the buttons it names, the scope sentence
  // describing the affirm button; a note with no parts keeps its old <p>, byte for byte. Read off the real draft.
  const wStaleView = (d: ScenarioDraft, canChange = true) => {
    const s = savedDraft(d)
    const report = deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: isWorkingYearCostStale(d), leftOverStale: false })
    const line = workingYearCostStaleLine(d)
    const door = workingYearCostStaleDoor(d)
    if (line === null || door === null) throw new Error('[test setup] W is stale')
    return composeReentryParts(s, report, { costStale: { line, door: door.gate, canChange }, leftOverStale: null, typedBelow: null })
  }

  it('W’s stale line is a block: div.note-parts → p.note-parts__opening → dl of div>dt+dd, labels with no colon in the ruled order, no heading inside the notes, no door words in them', () => {
    const { container } = render(<ReEntry view={wStaleView(DEV_SEEDS.datesavedrisenlater)} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    const notes = container.querySelector('.reentry-notes')!
    const block = notes.querySelector(':scope > div.note-parts')!
    expect(block, 'one block in the story column').not.toBeNull()
    expect(block.firstElementChild?.matches('p.note-parts__opening')).toBe(true)
    expect(block.firstElementChild?.textContent).toBe(
      `${copy.stalenessPayCheckGateLead} ${workingYearCostStaleLine(DEV_SEEDS.datesavedrisenlater)!.opening}`,
    )
    const groups = Array.from(block.querySelectorAll(':scope > dl > div'))
    expect(groups.map((g) => Array.from(g.children).map((c) => c.tagName))).toEqual([
      ['DT', 'DD'],
      ['DT', 'DD'],
    ])
    expect(groups.map((g) => g.querySelector('dt.note-parts__label')?.textContent)).toEqual(['This answer now', 'If a working year costs $105,000'])
    expect(notes.querySelector('h1, h2, h3, h4, strong, br'), 'no heading, no run-in label, no line break inside the notes').toBeNull()
    expect(notes.textContent).not.toContain('Neither button on this page')
    expect(notes.textContent).not.toContain('Yes, that’s about right')
  })

  it('a note with no parts keeps its old <p>, byte for byte (the reduce-to-plain): `datecoststale` (no answer stored)', () => {
    const d = DEV_SEEDS.datecoststale
    const { container } = render(<ReEntry view={wStaleView(d)} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    const text = `${copy.stalenessPayCheckGateLead} ${workingYearCostStaleNote(d)}`
    const notes = container.querySelector('.reentry-notes')!
    expect(notes.querySelector('.note-parts')).toBeNull()
    expect(Array.from(notes.children).map((c) => c.outerHTML)).toContain(`<p class="reentry-note">${text}</p>`)
  })

  it('W’s door sits right after the buttons it names: section.reentry-door, its h3 the heading, the scope sentence the affirm button’s description; it names no W-row button and points neither above nor below', () => {
    const d = DEV_SEEDS.datesavedstale
    const { container } = render(<ReEntry view={wStaleView(d)} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    const door = container.querySelector('section.reentry-door')!
    expect(door, 'drawn where the tab can save').not.toBeNull()
    expect(container.querySelector('.reentry-actions')?.nextElementSibling).toBe(door)
    expect(door.querySelector('h3')?.textContent).toBe('To confirm or change your $84,000 figure')
    const affirm = screen.getByRole('button', { name: copy.reentryAffirmCta })
    expect(affirm).toHaveAccessibleDescription('Neither button on this page confirms or changes your $84,000 figure; both lead to where you can.')
    expect(door.textContent).toBe(
      'To confirm or change your $84,000 figure' +
        'Neither button on this page confirms or changes your $84,000 figure; both lead to where you can. ' +
        'After “Balances still about right — show my answer”, press “Confirm or change your figure” on your answer; ' +
        '“Something’s changed — update them” asks about it among its questions.',
    )
    expect(door.textContent).not.toContain('Yes, that’s about right')
    expect(door.textContent).not.toContain('No — I’ll enter a different figure')
    expect(door.textContent).not.toMatch(/\bKeep\b/)
    expect(door.textContent).not.toMatch(/\b(above|below)\b/i)
    expect(screen.getByRole('button', { name: copy.reentryUpdateCta })).not.toHaveAttribute('aria-describedby')
  })

  it('…and nowhere else: no door read-only (and no description on Continue), none where the view hands no door (a fresh W)', () => {
    const d = DEV_SEEDS.datesavedstale
    const ro = render(<ReEntry view={wStaleView(d, false)} readOnly onAffirm={() => {}} onUpdate={() => {}} />)
    expect(ro.container.querySelector('.reentry-door')).toBeNull()
    expect(screen.getByRole('button', { name: copy.reentryContinueCta })).not.toHaveAttribute('aria-describedby')
    cleanup()
    // A view that carries a door, drawn read-only, still draws none (the second guard).
    render(<ReEntry view={wStaleView(d)} readOnly onAffirm={() => {}} onUpdate={() => {}} />)
    expect(document.querySelector('.reentry-door')).toBeNull()
    cleanup()
    const { container } = render(<ReEntry view={baseView()} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    expect(container.querySelector('.reentry-door')).toBeNull()
    expect(screen.getByRole('button', { name: copy.reentryAffirmCta })).not.toHaveAttribute('aria-describedby')
  })

  // U11 walk 6's R1, rebuilt over the whole working window (the rebuild's KTD6, host 2): a FRESH typed W below today's
  // quote has no report fact (a typed figure is never staled on a quote, KTD10), so the caller hands the gate its line, as
  // parts, and its door from the hydrated draft — the real producers here, as `IntakeApp`'s hydrate calls them: both forms
  // of the line (with and without the moved clause) behind `compose`, and both doors; `composeReentry` decides which (the
  // walk-9 form council's call (1a)). The gate pushes `{ text, parts }`, the way W's stale line is pushed: one run a plain
  // note, drawn as its old paragraph; two or more a block (the walk-8 form council's KD7 and KD8: an ordered list of runs,
  // then the survivor part's paragraph). Words typed by hand from the seeds' documented figures (the U2 line probe).
  const typedBelowSentence = (d: ScenarioDraft, canChange = true): ReentryTypedBelow | null => {
    const plain = workingYearCostTypedBelowComposed(d, { kind: 'gate', carriesMoved: false })
    const carrying = workingYearCostTypedBelowComposed(d, { kind: 'gate', carriesMoved: true })
    const door = workingYearCostTypedBelowDoor(d, false)
    const doorMoved = workingYearCostTypedBelowDoor(d, true)
    return plain === null || carrying === null || door === null || doorMoved === null
      ? null
      : { compose: (carriesMoved) => (carriesMoved ? carrying : plain), door: { plain: door, carryingMoved: doorMoved }, canChange }
  }
  /** The moved left over's sentences off the one moved core, as `IntakeApp` builds them, or `null` where nothing moved. */
  const movedSentences = (d: ScenarioDraft, canChange = true): ReentryAnswerSentences['leftOverStale'] => {
    const moved = workingYearLeftOverMoved(d)
    return moved === null ? null : { text: workingYearLeftOverMovedText(moved), clause: workingYearLeftOverMovedClause(moved), canChange }
  }
  const typedBelowView = (d: ScenarioDraft, canChange = true, s: CurrentScenario = savedDraft(d)) => {
    const report = deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: isWorkingYearCostStale(d), leftOverStale: workingYearLeftOverMoved(d) !== null })
    return composeReentryParts(s, report, { costStale: null, leftOverStale: movedSentences(d, canChange), typedBelow: typedBelowSentence(d, canChange) })
  }
  // Both seeds open the survivor gate (Sam, 60 and retired, can die from 66, in 2032, while Alex works through 2035). A's one
  // run is T's twin (the walk-9 form council's call (2)): the counts sentence, the lean naming the $90,000 in the gate's noun
  // "Your" (KD9), the cap sentence without it (year 0 at the spending leaves $10,985), then no first beat, the typed side,
  // and the close carrying the both-alive scope and the line's one gloss; the survivor part's two sentences close the one
  // paragraph (0.75 of each figure, $63,000 and $67,500, X $4,500) — the paragraph keeps its shape, a <p>.
  const TYPED_GATE_LINE =
    'Your answer counts a working year at your own figure of $84,000 a year, below your spending of $90,000 a year. ' +
    'A working year almost always costs at least your spending of $90,000 a year, so your answer can look better than it really is. ' +
    'At your spending, your first working year would have $10,985 left over, so the answer at that spending would add at most $10,985 in any working year. ' +
    'Your answer adds at most $16,985 a year to your savings. ' +
    'At your spending, that’s $6,000 less in your savings in each working year you’re both alive, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high. ' +
    'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $67,500 at your spending of $90,000 a year. ' +
    'At your spending, that’s at most $4,500 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.'
  const TYPED_GATE_NOTE = { text: TYPED_GATE_LINE, parts: { opening: TYPED_GATE_LINE, segments: [], door: null } }
  const UPDATE_DOOR = {
    heading: 'To update your $84,000 figure',
    scope: 'Neither button on this page updates your $84,000 figure; both lead to where you can.',
    route: `After “${copy.reentryAffirmCta}”, press “Update your figure for a working year” on your answer; “${copy.reentryUpdateCta}” asks about it among its questions.`,
  }
  /** …where the line carries the moved clause (call (1a)): the moved note's door fact in the scope sentence, its noun named. */
  const UPDATE_DOOR_MOVED = {
    ...UPDATE_DOOR,
    scope: 'Neither button on this page updates your $84,000 figure or what you said about the money left over; both lead to where you can.',
  }

  it('R1: `datesavedtyped` as a vault — the typed-below line (one run, its survivor part closing it) in W’s place, drawn as its plain paragraph, and the update act’s door under the buttons naming $84,000; nothing moved, so the door’s plain scope; no anyStale, no rules echo', () => {
    const d = DEV_SEEDS.datesavedtyped
    const report = deriveStaleness(savedDraft(d), TODAY, exposureForDraft(d), { costStale: isWorkingYearCostStale(d), leftOverStale: false })
    expect(report.anyStale, 'the premise: nothing on this vault is stale').toBe(false)
    const view = typedBelowView(d)
    expect(view.noteLines).toEqual([TYPED_GATE_NOTE])
    expect(view.door).toEqual(UPDATE_DOOR)
    expect(typedBelowView(d, false).door, 'a read-only tab gets no door').toBeNull()
    expect(typedBelowView(d, false).noteLines).toEqual([TYPED_GATE_NOTE])
    const { container } = render(<ReEntry view={view} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    expect(Array.from(container.querySelector('.reentry-notes')!.children).map((c) => c.outerHTML)).toEqual([
      `<p class="reentry-note">${TYPED_GATE_LINE}</p>`,
    ])
    expect(container.querySelector('.reentry-actions')?.nextElementSibling).toBe(container.querySelector('section.reentry-door'))
    expect(screen.getByRole('button', { name: copy.reentryAffirmCta })).toHaveAccessibleDescription(
      'Neither button on this page updates your $84,000 figure; both lead to where you can.',
    )
  })

  // TM (`datesavedtypedmoved`): three runs, the left over ALSO moved, typed by hand once for the arms below. The gate's runs
  // inside the list (call (1b)): a credit run's pair one paragraph, then the close; the short run three paragraphs, its
  // figures each beside its own years (flip (iii)); every label "…, while you’re still working" (call (3)).
  const TM_LEAD = 'What each answer adds to your savings in each working year you’re both alive:'
  const TM_CLAUSE =
    'You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over. ' +
    'At your figure of $84,000 a year, it has $26,985 left over now. ' +
    'So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.'
  const TM_COUNTS = 'Your answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year.'
  const TM_AFTER_CLAUSE =
    'A working year almost always costs at least your spending of $105,000 a year, so your answer can look better than it really is. ' +
    'At your spending, your first working year would have $5,985 left over, so the answer at that spending would add at most $5,985 in any working year. ' +
    TM_LEAD
  const TM_RUNS: NonNullable<NoteParts['runs']> = {
    items: [
      {
        label: '2026 through 2028, while you’re still working',
        sentences: [
          'The answer at your spending would add at most $5,985 a year. Your answer adds at most $16,985 a year.',
          'At your spending, that’s $11,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.',
        ],
      },
      {
        label: '2029 through 2032, while you’re still working',
        sentences: [
          'At your spending, each working year you’re both alive comes up $4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032, which would be taken from your savings, and the answer at that spending would add nothing.',
          'Your figure leaves those shortfalls out of your answer, which adds at most $16,985 a year.',
          'At your spending, that’s at most $21,000 less in your savings in 2029 through 2030 and $20,637 less in 2031 through 2032, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
        ],
      },
      {
        label: '2033 through 2035, while you’re still working',
        sentences: [
          'The answer at your spending would add at most $5,985 a year. Your answer adds at most $16,985 a year.',
          'At your spending, that’s $11,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
        ],
      },
    ],
    closing: [
      'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year.',
      'At your spending, that’s at most $15,750 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
    ],
  }
  /** TM's line, with the moved clause after its counts sentence where it carries it, else without. */
  const tmLine = (carried: boolean): NoteParts => ({
    opening: [TM_COUNTS, ...(carried ? [TM_CLAUSE] : []), TM_AFTER_CLAUSE].join(' '),
    segments: [],
    door: null,
    runs: TM_RUNS,
  })
  /** The moved left over's own note on TM, the figure it rests on named (the walk-6 round review's L3-3). */
  const TM_MOVED_NOTE = `${copy.stalenessLeftOverNote} You said all of it goes into your savings when it was $16,985. At your figure of $84,000 a year, it’s $26,985 now, so each working year adds at most $16,985 of its left over to your savings, the smaller of the two. ${copy.stalenessLeftOverGateDoor}`

  // THE MOVED FACT'S HOST (the walk-9 form council `wf_9f28e691-1dc`, call (1a)), decided once in `composeReentry` as an
  // exhaustive Record over `rulesLine | typedBelowLine | ownNote`, pinned on all three arms with real drafts — TM, the moved
  // typed-below witness, on the first two; `datesavedmoved` (a yes, no typed-below line) on the third — and the fallback.
  it('call (1a), `typedBelowLine`: TM as a vault with no rules line fired — ONE note, the typed-below line carrying the moved clause after its counts sentence (before the lean), no moved note of its own, and the door’s scope naming the moved fact; read-only, the same line and no door', () => {
    const d = DEV_SEEDS.datesavedtypedmoved
    expect(workingYearLeftOverMoved(d), 'the premise: moved').toEqual({ stored: 16_985, live: 26_985, typedBelow: '84,000' })
    const view = typedBelowView(d)
    expect(view.leftOverClauseHost, 'no rules line hosts it').toBe(false)
    expect(view.noteLines).toEqual([{ text: notePartsText(tmLine(true)), parts: tmLine(true) }])
    expect(view.door).toEqual(UPDATE_DOOR_MOVED)
    const readOnly = typedBelowView(d, false)
    expect(readOnly.noteLines, 'a read-only tab: the same line, the fact still said').toEqual([{ text: notePartsText(tmLine(true)), parts: tmLine(true) }])
    expect(readOnly.door).toBeNull()
    const { container } = render(<ReEntry view={view} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />)
    const notes = Array.from(container.querySelector('.reentry-notes')!.children)
    expect(notes.map((c) => c.tagName), 'the block alone: no moved note').toEqual(['DIV'])
    expect(notes[0]!.classList.contains('note-parts')).toBe(true)
    // Reading order (the council's a11y check, R3; KD7, KD8): the opening (the clause before the lean), then the runs'
    // ordered list, then the survivor part's paragraph, outside the list.
    expect(Array.from(notes[0]!.children).map((c) => `${c.tagName} ${c.className}`)).toEqual([
      'P note-parts__opening',
      'OL note-parts__runs',
      'P note-parts__closing',
    ])
    expect(notes[0]!.children[0]!.textContent).toBe(`${TM_COUNTS} ${TM_CLAUSE} ${TM_AFTER_CLAUSE}`)
    const list = notes[0]!.children[1]!
    expect(list.getAttribute('role'), 'a list in the accessibility tree').toBe('list')
    // A credit run inside the list is its pair as one paragraph, then the close; the short run keeps three (call (1b)).
    expect(Array.from(list.children).map((li) => [li.tagName, Array.from(li.children).map((p) => p.className)])).toEqual([
      ['LI', ['note-parts__label', 'note-parts__para', 'note-parts__para']],
      ['LI', ['note-parts__label', 'note-parts__para', 'note-parts__para', 'note-parts__para']],
      ['LI', ['note-parts__label', 'note-parts__para', 'note-parts__para']],
    ])
    expect(Array.from(list.querySelectorAll('li > p.note-parts__label')).map((p) => p.textContent)).toEqual([
      '2026 through 2028, while you’re still working',
      '2029 through 2032, while you’re still working',
      '2033 through 2035, while you’re still working',
    ])
    expect(notes[0]!.children[2]!.textContent, 'the survivor part, never one more run').toBe(TM_RUNS.closing!.join(' '))
    expect(notes[0]!.querySelector('dl'), 'no description list').toBeNull()
    expect(container.textContent, 'no moved note’s lead anywhere on the gate').not.toContain(copy.stalenessLeftOverNote)
    expect(screen.getByRole('button', { name: copy.reentryAffirmCta })).toHaveAccessibleDescription(UPDATE_DOOR_MOVED.scope)
  })

  it('call (1a), `rulesLine`: TM with the working-years clock fired — the clause rides that rules line, the typed-below line draws without it, no moved note, and the door’s plain scope', () => {
    const d = DEV_SEEDS.datesavedtypedmoved
    const view = typedBelowView(d, true, withOlderWorkingYearsStamp(savedDraft(d)))
    expect(view.leftOverClauseHost, 'the working-years line hosts it').toBe(true)
    expect(view.noteLines).toEqual([`${copy.stalenessWorkingYears} ${TM_CLAUSE}`, { text: notePartsText(tmLine(false)), parts: tmLine(false) }])
    expect(view.door).toEqual(UPDATE_DOOR)
  })

  it('call (1a), `ownNote`: a moved left over with no typed-below line and no rules line (`datesavedmoved`, a yes) — its own note, its lead, its sentence and its door sentence, unchanged', () => {
    const d = DEV_SEEDS.datesavedmoved
    expect(typedBelowSentence(d), 'the premise: no typed-below line').toBeNull()
    const view = typedBelowView(d)
    expect(view.leftOverClauseHost).toBe(false)
    expect(view.noteLines).toEqual([
      `${copy.stalenessLeftOverNote} You said all of it goes into your savings when it was $16,985. It’s $27,537 now, so each working year adds at most $16,985 of its left over to your savings, the smaller of the two. ${copy.stalenessLeftOverGateDoor}`,
    ])
    expect(view.door, 'no W door: a yes that is fresh').toBeNull()
  })

  it('call (1a), the fallback: where the typed-below line was assigned the clause and did not carry it, the moved fact falls back to its own note — never silence — and the door keeps its plain scope (the structure reports carriage; a forced `carriedMoved: false`)', () => {
    const d = DEV_SEEDS.datesavedtypedmoved
    const s = savedDraft(d)
    const report = deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: false, leftOverStale: true })
    const real = typedBelowSentence(d)!
    const notCarried: ReentryTypedBelow = { ...real, compose: () => real.compose(false) }
    expect(notCarried.compose(true).carriedMoved, 'the plant: assigned, not carried').toBe(false)
    const view = composeReentryParts(s, report, { costStale: null, leftOverStale: movedSentences(d), typedBelow: notCarried })
    expect(view.noteLines).toEqual([{ text: notePartsText(tmLine(false)), parts: tmLine(false) }, TM_MOVED_NOTE])
    expect(view.door).toEqual(UPDATE_DOOR)
    // …and the fact with no sentence still throws, whichever host would have said it.
    expect(() => composeReentryParts(s, report, { costStale: null, leftOverStale: null, typedBelow: real })).toThrow(/left over moved/)
  })

  it('R1: W’s stale line wins where both are handed over (the order the Result’s one slot reads them in) — the typed-below line never rides beside it, and a moved fact offered to that undrawn line falls back to its own note (call (1a))', () => {
    const d = DEV_SEEDS.datesavedrisen
    const s = savedDraft(d)
    const report = deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: true, leftOverStale: false })
    const line = workingYearCostStaleLine(d)!
    const door = workingYearCostStaleDoor(d)!
    const never = { parts: { opening: 'never rendered', segments: [], door: null }, carriedMoved: false } as const
    const view = composeReentryParts(s, report, {
      costStale: { line, door: door.gate, canChange: true },
      leftOverStale: null,
      typedBelow: { compose: () => never, door: { plain: { heading: 'h', scope: 's', route: 'r' }, carryingMoved: { heading: 'h', scope: 's', route: 'r' } }, canChange: true },
    })
    expect(view.noteLines.map((l) => (typeof l === 'string' ? l : l.text))).not.toContain('never rendered')
    expect(view.door).toEqual(door.gate)
    // …and the moved fact offered to the typed-below line that was never drawn (call (1a), read off what was drawn): its
    // own note, never silence. Unreachable with a real draft (a moved left over needs a fresh W), so the report's two facts
    // are set by hand here, with a line that WOULD carry the clause had it been drawn.
    const both = deriveStaleness(s, TODAY, exposureForDraft(d), { costStale: true, leftOverStale: true })
    expect(both.workingYear.leftOverStale && both.workingYear.costStale, 'the premise: both facts set').toBe(true)
    const wouldCarry = { parts: { opening: 'never rendered either', segments: [], door: null }, carriedMoved: true } as const
    const neverDrawn = composeReentryParts(s, both, {
      costStale: { line, door: door.gate, canChange: true },
      leftOverStale: { text: 'A fixture moved sentence.', clause: 'A fixture clause.', canChange: true },
      typedBelow: { compose: () => wouldCarry, door: { plain: { heading: 'h', scope: 's', route: 'r' }, carryingMoved: { heading: 'h', scope: 's', route: 'r' } }, canChange: true },
    })
    const texts = neverDrawn.noteLines.map((l) => (typeof l === 'string' ? l : l.text))
    expect(texts).not.toContain('never rendered either')
    expect(texts.at(-1), 'the moved fact in its own note').toBe(`${copy.stalenessLeftOverNote} A fixture moved sentence. ${copy.stalenessLeftOverGateDoor}`)
    expect(neverDrawn.door).toEqual(door.gate)
  })

  it('the affirm button names what it affirms: "Balances still about right — show my answer" (hunter F7 at U11 walk 6)', () => {
    expect(copy.reentryAffirmCta).toBe('Balances still about right — show my answer')
  })

  it('a PROMPT, never an attestation: no checkbox, and no "confirm" wording anywhere on the surface (R19 — a reflexive tap must not read as a freshness claim)', () => {
    const { container } = render(
      <ReEntry view={baseView()} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />,
    )
    expect(container.querySelector('input[type="checkbox"]')).toBeNull()
    expect(container.textContent!.toLowerCase()).not.toContain('confirm')
  })
})
