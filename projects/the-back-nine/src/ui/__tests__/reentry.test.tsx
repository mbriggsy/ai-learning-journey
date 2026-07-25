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
import { composeReentry } from '../reentryChrome'
import { ReEntry } from '../ReEntry'
import { heroLead, floorLineText } from '../FuckOffDate'
import { dateOddsText } from '../dateOdds'
import type { DateSplitView } from '../dateSplit'
import { scenarioFromDraft, currentEpochDay } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'
import { deriveStaleness, type StalenessExposure } from '@store/staleness'
import { exposureForDraft } from '../stalenessExposure'
import { copy, slots } from '../copy'
import type { PricedState } from '@engine/constants/stateTax'
import type { ScenarioV3 } from '@shared/model'
import type { DateTrackOutcome } from '@shared/model'

afterEach(cleanup)

const freshSave = (): ScenarioV3 => {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('retired seed must be save-ready')
  return r.scenario
}
const scenarioFor = (key: keyof typeof DEV_SEEDS): ScenarioV3 => {
  const r = scenarioFromDraft(DEV_SEEDS[key])
  if (!r.ready) throw new Error(`${key} seed must be save-ready`)
  return r.scenario
}
const TODAY = currentEpochDay()
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
const reportFor = (s: ScenarioV3, exposure: StalenessExposure = RETIRED_EXPOSURE) =>
  deriveStaleness(s, TODAY, exposure)

describe('composeReentry — the read-back', () => {
  it('sums balances per ENGINE bucket and omits empty buckets (retired: pretax only; date: pretax + roth — never a noise "$0 Roth" row)', () => {
    // The retired seed carries ONE traditional IRA — exactly one row, the pre-tax sum.
    const s = freshSave()
    const view = composeReentry(s, reportFor(s))
    expect(view.balanceRows.map((r) => r.label)).toEqual([copy.reentryBucketPretax])
    const pretaxTotal = s.enteredAccounts
      .filter((a) => ['401k', '403b', 'traditional-ira'].includes(a.kind))
      .reduce((t, a) => t + a.valueToday, 0)
    expect(view.balanceRows[0]!.value).toBe(`$${Math.round(pretaxTotal).toLocaleString('en-US')}`)
    // The date seed carries a 401k + a roth-ira — two rows, grouped by the engine's own map.
    const d = scenarioFromDraft(DEV_SEEDS.date)
    if (!d.ready) throw new Error('date seed must be save-ready')
    const dView = composeReentry(d.scenario, reportFor(d.scenario, DATE_EXPOSURE))
    expect(dView.balanceRows.map((r) => r.label)).toEqual([
      copy.reentryBucketPretax,
      copy.reentryBucketRoth,
    ])
  })

  it('reads the SS fold-in back MONTHLY (pia is persisted annual ×12 — the read-back must speak the frame the statement asked in)', () => {
    const s = freshSave()
    const view = composeReentry(s, reportFor(s))
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
    const view = composeReentry(s, reportFor(s))
    expect(view.noteLines).toEqual([])
    expect(view.elapsedLine).toBeNull()
  })

  it('fired clocks are NAMED, one line each; an expired budget window quotes its calendar boundary', () => {
    const s = freshSave()
    const doctored: ScenarioV3 = {
      ...s,
      taxVintageDetail: { taxYear: 2019, legalBasis: 'TCJA (pre-OBBBA)' },
      healthcareVintage: { ...s.healthcareVintage!, coverageYear: 2019 },
      budget: [
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 0 },
      ] as ScenarioV3['budget'],
      // An AGED vault: the plan started 2 calendar years back (the budget window anchors on
      // startCalendarYear — a spine household's year 0 is the plan's own start) and the save
      // is ~2 years old (the elapsed line reads off savedAt).
      startCalendarYear: s.startCalendarYear - 2,
      savedAt: TODAY - 730,
    } as ScenarioV3
    const view = composeReentry(doctored, reportFor(doctored))
    expect(view.noteLines).toContain(copy.stalenessTax)
    // U17 §S4 — `coverageYear` dates the ACA/IRMAA tables (model.ts:2140), so for THIS all-65+
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
    const moved: ScenarioV3 = {
      ...s,
      healthcareVintage: { ...s.healthcareVintage!, acaStatus: 'enhanced subsidies restored (no cliff)' },
    }
    const report = reportFor(moved)
    const view = composeReentry(moved, report)
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
    const moved: ScenarioV3 = {
      ...s,
      healthcareVintage: { ...s.healthcareVintage!, acaStatus: 'enhanced subsidies restored (no cliff)' },
    }
    const report = reportFor(moved, ACA_PRICED_EXPOSURE)
    const view = composeReentry(moved, report)
    expect(view.noteLines).toContain(copy.stalenessAca)
    expect(view.noteLines).not.toContain(copy.stalenessMedicare)
    expect(report.rulesMoved).toBe(true)
  })

  it('the Medicare family gets its OWN line, distinct from the ACA family’s (the split is real, not an alias)', () => {
    const s = freshSave()
    const moved: ScenarioV3 = {
      ...s,
      healthcareVintage: { ...s.healthcareVintage!, partBStandardMonthly: s.healthcareVintage!.partBStandardMonthly + 10 },
    }
    const view = composeReentry(moved, reportFor(moved))
    expect(view.noteLines).toEqual([copy.stalenessMedicare])
    expect(copy.stalenessMedicare).not.toBe(copy.stalenessAca)
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
    const moved: ScenarioV3 = {
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
    const view = composeReentry(moved, report)
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
    const cases: ReadonlyArray<readonly [string, ScenarioV3, StalenessExposure]> = [
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
          return b as unknown as ScenarioV3
        })(),
        RETIRED_EXPOSURE,
      ],
      [
        'contribution',
        { ...date, dateVintage: { ...date.dateVintage!, contributionYear: date.dateVintage!.contributionYear - 1 } },
        DATE_EXPOSURE,
      ],
    ]
    let fired = 0
    for (const [label, scenario, exposure] of cases) {
      const report = deriveStaleness(scenario, TODAY, exposure)
      const view = composeReentry(scenario, report)
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

  // S5.4 — the state-tax staleness clock's own named line: a PRICED household (NC) whose own
  // state profile drifted since save gets `stalenessStateTax` at the re-entry gate (never aliased
  // onto stalenessTax — the two clocks fire independently).
  it('S5: a priced household whose state rules moved gets the state-tax staleness line, named', () => {
    const s = freshSave()
    const drifted: ScenarioV3 = {
      ...s,
      retirementState: 'NC',
      stateTaxVintage: { ...s.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
    }
    const report = reportFor(drifted, pricing(RETIRED_EXPOSURE, 'NC'))
    expect(report.controls.stateTaxMoved, 'the state clock fired').toBe(true)
    const view = composeReentry(drifted, report)
    expect(view.noteLines).toContain(copy.stalenessStateTax)
  })

  it("S5: an 'elsewhere' vault whose stamp drifted fires NO state-tax line (nothing state-priced to stale)", () => {
    const s = freshSave()
    const drifted: ScenarioV3 = {
      ...s,
      retirementState: 'elsewhere',
      stateTaxVintage: { ...s.stateTaxVintage!, ncProfile: '{"drifted":"nc"}' },
    }
    // U17 §S4: the gate now reads the RUN's priced state, and an 'elsewhere' household's run
    // prices none — `pricedStateForRun` roster-filters it to undefined.
    const view = composeReentry(drifted, reportFor(drifted, pricing(RETIRED_EXPOSURE, undefined)))
    expect(view.noteLines).not.toContain(copy.stalenessStateTax)
  })

  it('two expired windows sharing an end year collapse to ONE line (the copy quotes only the year — twins would render byte-identical sentences and collide on the render key)', () => {
    const s = freshSave()
    const doctored: ScenarioV3 = {
      ...s,
      budget: [
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 0 },
        { category: 'gifts', label: 'Gifts', tier: 'discretionary', annualAmountReal: 2_000, startYear: 0, endYear: 0 },
        { category: 'other', label: 'Boat', tier: 'discretionary', annualAmountReal: 4_000, startYear: 0, endYear: 1 },
      ] as ScenarioV3['budget'],
      startCalendarYear: s.startCalendarYear - 3,
    } as ScenarioV3
    const view = composeReentry(doctored, reportFor(doctored))
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
    const view = composeReentry(blendMoved, reportFor(blendMoved))
    expect(view.noteLines, 'provably inert ⇒ not one line').toEqual([])
    expect(RETIRED_EXPOSURE.blend, 'and the silence is the REAL seed’s own read').toBe('unpriced')
    // The date household holds VTI + VFIFX — its stockWeight DOES read the dated table, so the
    // stamp genuinely could have moved its answer and no per-row compare can say. Nameless.
    const d = scenarioFromDraft(DEV_SEEDS.date)
    if (!d.ready) throw new Error('date seed must be save-ready')
    const dMoved = { ...d.scenario, dateVintage: { ...d.scenario.dateVintage!, blendSnapshotAsOf: '2019-01-01' } }
    const dView = composeReentry(dMoved, reportFor(dMoved, DATE_EXPOSURE))
    expect(DATE_EXPOSURE.blend).toBe('priced')
    expect(dView.noteLines).toEqual([copy.stalenessReferenceTables])
    expect(dView.noteLines).not.toContain(copy.stalenessDate)
  })

  it('the CONTRIBUTION clock keeps its own named line, route-gated to a household that actually has a date', () => {
    const d = scenarioFor('date')
    const bumped: ScenarioV3 = {
      ...d,
      dateVintage: { ...d.dateVintage!, contributionYear: d.dateVintage!.contributionYear - 1 },
    }
    const view = composeReentry(bumped, reportFor(bumped, DATE_EXPOSURE))
    expect(view.noteLines).toEqual([copy.stalenessDate])
    // The all-retired household is quiet on the same move (its answer reads no limit).
    const s = freshSave()
    const retiredBumped: ScenarioV3 = {
      ...s,
      dateVintage: { ...s.dateVintage!, contributionYear: s.dateVintage!.contributionYear - 1 },
    }
    expect(composeReentry(retiredBumped, reportFor(retiredBumped)).noteLines).toEqual([])
  })

  it('the wall-time line is SUPPRESSED without savedAt and under a year — never fabricated', () => {
    const s = freshSave()
    const anchorless = { ...s } as Record<string, unknown>
    delete anchorless.savedAt
    expect(composeReentry(anchorless as unknown as ScenarioV3, reportFor(anchorless as unknown as ScenarioV3)).elapsedLine).toBeNull()
    const recent = { ...s, savedAt: TODAY - 120 }
    expect(composeReentry(recent, reportFor(recent)).elapsedLine).toBeNull()
  })

  it('the intro speaks ROUTE-TRUE (Caddie card #1): "benefit checks" for an all-retired household, "paychecks" only where paychecks exist', () => {
    // The retired spine household: no paychecks — the spouse walker's primary stumble was
    // the route-blind intro ("does this thing even know we stopped working?").
    const s = freshSave()
    expect(composeReentry(s, reportFor(s)).introKey).toBe('reentryIntroRetired')
    // The still-working date household keeps the original register.
    const d = scenarioFromDraft(DEV_SEEDS.date)
    if (!d.ready) throw new Error('date seed must be save-ready')
    expect(composeReentry(d.scenario, reportFor(d.scenario, DATE_EXPOSURE)).introKey).toBe('reentryIntro')
  })

  it('the wall-time line rounds HALF, never floors (Caddie O6): a 700-day save reads "about 2 years", not the rosier "about a year"', () => {
    const s = freshSave()
    const at = (days: number) => {
      const aged = { ...s, savedAt: TODAY - days }
      return composeReentry(aged, reportFor(aged)).elapsedLine
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

describe('ReEntry — the surface', () => {
  const baseView = () => {
    const s = freshSave()
    return composeReentry(s, reportFor(s))
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

  it('a PROMPT, never an attestation: no checkbox, and no "confirm" wording anywhere on the surface (R19 — a reflexive tap must not read as a freshness claim)', () => {
    const { container } = render(
      <ReEntry view={baseView()} readOnly={false} onAffirm={() => {}} onUpdate={() => {}} />,
    )
    expect(container.querySelector('input[type="checkbox"]')).toBeNull()
    expect(container.textContent!.toLowerCase()).not.toContain('confirm')
  })
})

describe('heroLead — the U13 wall-time anchor (the date answer must not decay silently)', () => {
  const dated: DateTrackOutcome = {
    kind: 'date',
    offsetYears: 7,
    grade: { quantizedLowerBound: 0.9 },
    unconfirmed: false,
  } as unknown as DateTrackOutcome

  it('un-anchored (the preview harness): the legacy relative framing, unchanged', () => {
    expect(heroLead(dated, 30)).toBe(slots.dateInYears(7))
  })

  it('anchored at elapsed 0 (every fresh session): the relative count is UNCHANGED and the calendar label rides along', () => {
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 0 })).toBe(
      slots.dateInYearsAnchored(7, 2033),
    )
  })

  it('anchored on an AGED plan: the count re-derives from TODAY while the calendar label holds (never a replayed build-day count)', () => {
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 3 })).toBe(
      slots.dateInYearsAnchored(4, 2033),
    )
  })

  it('the arrived arms are STRICT (U17 §S2.5 rewrote this pin): AT the clock speaks "about now"; PAST it speaks "come and gone"', () => {
    // The predecessor expected dateInYearsPast for BOTH — the non-strict collapse §S2.5 killed:
    // a date exactly this year and a date two years gone are different facts, and only the first
    // may read "about now" (agreeing with the ladder's "stopping today" crown at the boundary).
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 7 })).toBe(
      slots.dateInYearsNow(2033),
    )
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 9 })).toBe(
      slots.dateInYearsPast(2033),
    )
  })

  it('offset 0 stays the free-today claim regardless of anchor (the engine crowned NOW — no arithmetic to do)', () => {
    const now = { ...dated, offsetYears: 0 } as DateTrackOutcome
    expect(heroLead(now, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 2 })).toBe(copy.dateFreeToday)
  })
})

describe('floorLineText — the SAME anchor as the hero (ultramode 2026-07-09: one screen, one time base)', () => {
  // The floor and hero share a screen; an anchored hero beside an un-anchored floor could
  // even invert the true floor<lifestyle ordering on an aged vault.
  const split = (floorOffset: number): Extract<DateSplitView, { kind: 'split' }> =>
    ({
      kind: 'split',
      lifestyle: { kind: 'confirmed-date', offsetYears: 7 } as unknown as DateSplitView & object,
      floor: { kind: 'covered', offsetYears: floorOffset, quantizedLowerBound: 0.8, unconfirmed: false },
      inverted: false,
    }) as unknown as Extract<DateSplitView, { kind: 'split' }>
  // The same conservative register the render composes — the render's own producer,
  // never a re-typed odds string.
  const odds = () => dateOddsText(0.8)

  it('un-anchored (the preview harness): the legacy relative framing, unchanged', () => {
    expect(floorLineText(split(5), 30)).toBe(slots.dateFloorCovered(5, odds(), false))
  })

  it('anchored at elapsed 0 (every fresh session): count unchanged, calendar label rides along', () => {
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 0 })).toBe(
      slots.dateFloorCoveredAnchored(5, 2031, odds(), false),
    )
  })

  it('anchored on an AGED vault: the count re-derives from TODAY while the calendar label holds', () => {
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 3 })).toBe(
      slots.dateFloorCoveredAnchored(2, 2031, odds(), false),
    )
  })

  it('the arrived arms are STRICT (U17 §S2.5 rewrote this pin): AT the clock "about now"; PAST it "already behind you"', () => {
    // Mirrors heroLead's rewritten pin — one idiom per screen, each line naming its own date.
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 5 })).toBe(
      slots.dateFloorCoveredNow(2031, odds(), false),
    )
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 8 })).toBe(
      slots.dateFloorCoveredPast(2031, odds(), false),
    )
  })

  it('offset 0 keeps the covered-from-today claim under any anchor (covered from the plan start ⇒ still covered now)', () => {
    expect(floorLineText(split(0), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 4 })).toBe(
      slots.dateFloorCovered(0, odds(), false),
    )
  })

  it('the no-date arms are anchor-independent (they name the window, not a count)', () => {
    const noFloor = {
      ...split(5),
      floor: { kind: 'not-within-window' },
    } as unknown as Extract<DateSplitView, { kind: 'split' }>
    expect(floorLineText(noFloor, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 3 })).toBe(
      slots.dateFloorNotWithin(30),
    )
  })
})
