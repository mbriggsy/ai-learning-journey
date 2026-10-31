/**
 * Act-4 · U17 §S4 — the staleness EXPOSURE seam.
 *
 * `staleness.test.ts` proves the BUCKETING law on injected exposures. This file proves the
 * other half: that the injected value is derived from the run's OWN BUILT PARAMS and from
 * nothing else, and that the SHIPPED consumer actually routes through it. Insight 095 — probe
 * the SHIPPED decision path, not a reference path: every arm below runs `exposureForDraft` over
 * a REAL dev seed (the same drafts the app builds), never a hand-shaped params object.
 *
 * THE ARM THAT MATTERS MOST is the AGE/OVERLAY DIVERGENCE: a household whose AGES say "all 65+,
 * Medicare priced" while its BUILT OVERLAY says "no healthcare at all". Insight 080's scar
 * (`healthSheetChrome.ts:661-675`) is that an age-keyed predicate equalled the pricing
 * complement right up until a second producer of `healthcareEnabled` shipped, then silently
 * lied. A fixture where the two answers COINCIDE cannot tell an age gate from an overlay gate —
 * so this one is built to make them disagree.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exposureForDraft } from '../stalenessExposure'
import { DEV_SEEDS } from '../devSeeds'
import {
  blendTableReadForRun,
  contributionsPricedForRun,
  dateBaseAcaPriced,
  isDateRoute,
  medicareOnlyPriced,
  missingRequiredFacts,
  overlayBuiltForRun,
  pricedStateForRun,
  spineAcaPriced,
  spineMedicarePriced,
  survivorMedicalLeanForRun,
  workingYearCostForRun,
  workingYearTaxForRun,
} from '@intake/intakeMap'
import type { ScenarioDraft } from '@store/memoryModel'
import type { WorkingYearCostV3 } from '@shared/model'

describe('exposureForDraft — the SPINE route (both healthcare reads exact: one builder, the headline run’s own)', () => {
  it('the all-65+ Medicare-only household prices Medicare and NO ACA — the shipped defect’s witness', () => {
    // `retired`: ages 66 + 65, no marketplace quote pair. `buildOverlay` takes the Medicare-only
    // branch (healthcareEnabled with NO enrolledPremium), so the engine's per-year ACA gate
    // (`acaTable && enrolledThisYear > 0 && pre65 > 0`) can never open. One manual-blend account
    // ⇒ the dated ticker table is never read; both retired ⇒ no contribution stream.
    const d = DEV_SEEDS.retired
    expect(isDateRoute(d), 'the witness is spine-route').toBe(false)
    expect(exposureForDraft(d)).toEqual({
      overlayBuilt: 'priced',
      medicare: 'priced',
      aca: 'unpriced',
      contributions: 'unpriced',
      blend: 'unpriced',
      spending: 'unpriced',
      workingYearTax: 'unpriced',
      workingYearCost: 'unpriced',
      pricedState: undefined,
    })
  })

  it('the pre-65 marketplace-quoted household prices BOTH families — the naming arm of the witness pair', () => {
    // `health`: both retired at 61 + 59 with an entered quote pair ⇒ `healthcareOn`, a positive
    // escalated `enrolledPremium` stream, and a genuinely moved answer on an ACA rule change.
    const d = DEV_SEEDS.health
    expect(isDateRoute(d)).toBe(false)
    const e = exposureForDraft(d)
    expect(e.medicare).toBe('priced')
    expect(e.aca).toBe('priced')
    expect(e.overlayBuilt).toBe('priced')
  })

  it('reads the PRODUCERS, not a re-derivation: every field agrees with its OWN exported predicate across every spine seed', () => {
    // Source-bind (insights 032/081): the seam's answer is the producer's answer. A copy of the
    // builders' logic under a comment claiming it matches is not a pin.
    const spineSeeds = (Object.keys(DEV_SEEDS) as (keyof typeof DEV_SEEDS)[]).filter(
      (k) => !isDateRoute(DEV_SEEDS[k]) && missingRequiredFacts(DEV_SEEDS[k]).length === 0,
    )
    expect(spineSeeds.length, 'there ARE spine seeds to sweep').toBeGreaterThan(3)
    for (const k of spineSeeds) {
      const d = DEV_SEEDS[k]
      const e = exposureForDraft(d)
      expect(e.medicare === 'priced', `${k}: medicare`).toBe(spineMedicarePriced(d))
      expect(e.aca === 'priced', `${k}: aca`).toBe(spineAcaPriced(d))
      expect(e.overlayBuilt === 'priced', `${k}: overlayBuilt`).toBe(overlayBuiltForRun(d))
      expect(e.contributions === 'priced', `${k}: contributions`).toBe(contributionsPricedForRun(d))
      expect(e.blend === 'priced', `${k}: blend`).toBe(blendTableReadForRun(d))
      expect(e.spending === 'priced', `${k}: spending`).toBe(survivorMedicalLeanForRun(d))
      expect(e.workingYearTax, `${k}: workingYearTax`).toBe(workingYearTaxForRun(d))
      // A spine run has no living worker and no accumulation construct — it never clamps.
      expect(e.workingYearTax, `${k}: the spine never reaches the working-year floor`).toBe('unpriced')
      expect(e.workingYearCost, `${k}: workingYearCost`).toBe(workingYearCostForRun(d))
      // `buildSpineParams` has no route for the pay check's W — the working-years table goes unread.
      expect(e.workingYearCost, `${k}: the spine never carries W`).toBe('unpriced')
      expect(e.pricedState, `${k}: state`).toBe(pricedStateForRun(d))
      // The structural pair: ACA pricing implies healthcare is on, so 'priced' ACA with an
      // unpriced Medicare read is impossible.
      expect(e.aca === 'priced' && e.medicare !== 'priced', `${k}: impossible pair`).toBe(false)
    }
  })
})

describe('exposureForDraft — THE AGE/OVERLAY DIVERGENCE (insight 080’s scar, made falsifiable)', () => {
  // All-65+ ages, positive spend, IRMAA seed present, and NO accounts / NO income / NO premium —
  // so `missingRequiredFacts` is empty (the spine route needs no account) while `buildOverlay`
  // hits its degenerate early return and builds NO overlay at all. Medicare is priced $0, and —
  // the F2 correction — NO TAX CONSTANT IS CONSUMED EITHER.
  const degenerate: ScenarioDraft = { ...DEV_SEEDS.retired, enteredAccounts: [] }

  it('the fixture genuinely disagrees with itself — ages say Medicare-priced, the built overlay says nothing was priced', () => {
    // Non-vacuity (burned/070): if these two ever agreed, the arm below would prove nothing.
    expect(missingRequiredFacts(degenerate), 'the draft is buildable — the divergence is not a missing-facts artifact').toEqual([])
    expect(medicareOnlyPriced(degenerate), 'the AGE predicate says priced').toBe(true)
    expect(spineMedicarePriced(degenerate), 'the BUILT OVERLAY says unpriced').toBe(false)
  })

  it('the exposure follows the BUILT OVERLAY — a run that priced nothing reads `unpriced` on EVERY axis, tax included', () => {
    // This is the F2 witness: `overlayBuilt` is what silences the FEDERAL tax clock for a
    // household whose recompute is byte-identical under any tax vintage.
    expect(exposureForDraft(degenerate)).toEqual({
      overlayBuilt: 'unpriced',
      medicare: 'unpriced',
      aca: 'unpriced',
      contributions: 'unpriced',
      blend: 'unpriced',
      spending: 'unpriced',
      workingYearTax: 'unpriced',
      workingYearCost: 'unpriced',
      pricedState: undefined,
    })
  })

  it('and the state read follows it too — a draft that SAYS NC but builds no overlay prices no state tax (the closed quiet limitation)', () => {
    const ncDegenerate: ScenarioDraft = { ...degenerate, retirementState: 'NC' }
    expect(ncDegenerate.retirementState, 'the DRAFT field says NC').toBe('NC')
    expect(exposureForDraft(ncDegenerate).pricedState, 'the RUN prices no state').toBeUndefined()
    // …and a household whose run DOES build the overlay reads the code, so the arm is not
    // vacuously "always undefined".
    expect(exposureForDraft(DEV_SEEDS.nc).pricedState).toBe('NC')
  })
})

describe('exposureForDraft — the DATE route', () => {
  it('Medicare is PRICED by construction — `dateSearch` forces `healthcareEnabled` on every candidate, ages notwithstanding', () => {
    // `date65`: a still-working 66-year-old + a retired 65-year-old, NO quote pair. This is the
    // exact population insight 080 names — an age-keyed predicate would have to decide it from
    // ages that say "all 65+", while the sweep prices Medicare on every candidate.
    const d = DEV_SEEDS.date65
    expect(isDateRoute(d)).toBe(true)
    const e = exposureForDraft(d)
    expect(e.medicare).toBe('priced')
    expect(e.aca).toBe('unpriced')
  })

  it('ACA reads UNPRICED (proven) when the base overlay carries no quote stream — window-gating can only shrink, never synthesize', () => {
    // `buildHealthcareStreams` only WINDOW-GATES an entered stream (healthcareStreams.ts:199-202),
    // so with no base stream NO candidate offset can price ACA. FALSE here is exact.
    const d = DEV_SEEDS.date65
    expect(dateBaseAcaPriced(d), 'no candidate could price ACA').toBe(false)
    expect(exposureForDraft(d).aca).toBe('unpriced')
  })

  it('ACA NAMES ITSELF off the base overlay (pilot ruling 2026-07-25): the re-entry gate runs BEFORE any date search, so the base run IS the run this surface describes', () => {
    // `date`: a working 58-year-old with an entered quote pair. Insight 088's trap — a crowned
    // work-to-65+ candidate windowing ACA to zero years — belongs to a surface sitting beside a
    // CROWNED preview. There is no crown at unlock, so the base overlay is this surface's own
    // producer, and reading it as 'unknown' would have delivered the enhanced-subsidy flip (the
    // one event `verify:aca` gates every build on) to pre-65 marketplace planners as a nameless
    // "we can't tell" line where HEAD named it — a silent stale on the most consequential clock.
    const d = DEV_SEEDS.date
    expect(dateBaseAcaPriced(d), 'the base stream is positive').toBe(true)
    const e = exposureForDraft(d)
    expect(e.aca).toBe('priced')
    expect(e.medicare).toBe('priced')
    // The seam emits NO 'unknown' for a buildable draft on either route — that value is now
    // reserved for the unbuildable residual alone (the arm below).
    expect(Object.values(e)).not.toContain('unknown')
  })

  it('the date route’s state read comes from `buildDateInput`’s own overlay, not an `isDateRoute` shortcut', () => {
    expect(exposureForDraft(DEV_SEEDS.datenc).pricedState).toBe(pricedStateForRun(DEV_SEEDS.datenc))
    expect(exposureForDraft(DEV_SEEDS.datenc).pricedState).toBe('NC')
    // The 'elsewhere' arm proves the roster filter is live on this route too (insight 080's
    // exact recurrence: `isDateRoute || …` would falsely price every date-route household).
    expect(exposureForDraft(DEV_SEEDS.elsewhere).pricedState).toBeUndefined()
  })

  it('CONTRIBUTIONS read the BASE overlay, not the forced candidate construct (F3): a date-route household whose accounts all belong to the RETIRED spouse prices no limit', () => {
    // `dateSearch.ts:254` sets `accumulation` on EVERY candidate — so a candidate-level read is a
    // constant `true` and discriminates nothing. What it carries is the BASE overlay's streams,
    // and `buildOverlay` spreads `accumulation` only when some WORKING owner actually
    // contributes. Strip the working owner's contribution dollars and the construct disappears
    // while the route does not: `anyContributions` is the discriminator.
    const contributing = DEV_SEEDS.date
    expect(isDateRoute(contributing)).toBe(true)
    expect(exposureForDraft(contributing).contributions, 'the contributing household is exposed').toBe('priced')
    const idle: ScenarioDraft = {
      ...contributing,
      enteredAccounts: contributing.enteredAccounts.map((a) => {
        const { annualContribution: _c, employerMatchAnnual: _m, hsaEmployerAnnual: _h, ...rest } = a
        return rest
      }),
    }
    expect(isDateRoute(idle), 'still the date route — only the streams are gone').toBe(true)
    expect(missingRequiredFacts(idle), 'and still buildable').toEqual([])
    expect(contributionsPricedForRun(idle), 'no accumulation on the base overlay').toBe(false)
    expect(exposureForDraft(idle).contributions).toBe('unpriced')
  })
})

describe('exposureForDraft — the BLEND read (F5: we CAN tell, so we must)', () => {
  it('a household of MANUAL blends never touches the dated table; one holding a classified ticker does', () => {
    // `retired` holds one no-ticker account with an exact manual blend — `resolveBlend` never
    // reaches `findBlendRow`, so `BLEND_SNAPSHOT_AS_OF` cannot move their answer. `date` holds
    // VTI + VFIFX, which do resolve through the table.
    expect(DEV_SEEDS.retired.enteredAccounts.every((a) => a.ticker === undefined)).toBe(true)
    expect(exposureForDraft(DEV_SEEDS.retired).blend).toBe('unpriced')
    expect(DEV_SEEDS.date.enteredAccounts.some((a) => a.ticker !== undefined)).toBe(true)
    expect(exposureForDraft(DEV_SEEDS.date).blend).toBe('priced')
  })

  it('a $0 portfolio is inert whatever it holds — `householdStockWeight` returns null and the run takes the documented `?? 0`', () => {
    // Same tickers, no dollars: every row is weighted by zero, so no re-date can move the
    // answer. (Spine route — the date route requires a positive portfolio to build at all.)
    const broke: ScenarioDraft = {
      ...DEV_SEEDS.health,
      enteredAccounts: DEV_SEEDS.health.enteredAccounts.map((a) => ({ ...a, ticker: 'VTI', valueToday: 0 })),
    }
    expect(missingRequiredFacts(broke)).toEqual([])
    expect(blendTableReadForRun(broke)).toBe(false)
    expect(exposureForDraft(broke).blend).toBe('unpriced')
  })
})

describe('exposureForDraft — no run at all', () => {
  it('an UNBUILDABLE draft reads `unknown` on every axis, never `unpriced` — silence must be EARNED by a proof that the run priced nothing', () => {
    // Strip the spend figure: `missingRequiredFacts` non-empty ⇒ every builder returns null.
    // Reading that as 'unpriced' would silence real drift on the strength of no evidence.
    const broken = { ...DEV_SEEDS.retired, annualSpendingReal: undefined } as unknown as ScenarioDraft
    expect(missingRequiredFacts(broken).length).toBeGreaterThan(0)
    expect(exposureForDraft(broken)).toEqual({
      overlayBuilt: 'unknown',
      medicare: 'unknown',
      aca: 'unknown',
      contributions: 'unknown',
      blend: 'unknown',
      spending: 'unknown',
      workingYearTax: 'unknown',
      workingYearCost: 'unknown',
      pricedState: undefined,
    })
    // …and the working-year read's own producer says the same off the missing-facts arm (it is not
    // only the seam's early return that makes it `unknown`).
    expect(workingYearTaxForRun(broken)).toBe('unknown')
  })
})

// ── THE WORKING-YEAR TAX FLOOR'S REACH (ledger v12, 2026-10-20 — the plan's U5) ──────────────────
// The row-level `reach: 'working-years'` read. U4 MEASURED every date seed at DEV_CRN_SEED on the
// pre-change tree and after, both tiers: ALL EIGHT moved (dip by its conversion + SS; date / atceiling by
// the Medicare draw + SS; date65 / datenc by the Medicare draw, SS and an RMD; dateborder / datesplit /
// datemixed by SS alone — no tax draw (T(0, ss) is $0 there), but its taxable share, now read on the
// pay-inclusive provisional, lifts IRMAA-MAGI). So all eight must read `priced` — a seed reading
// `unpriced` here would be a vault told nothing about a recompute that moved (the silent stale).
describe('exposureForDraft — the working-year tax floor’s reach (ledger v12)', () => {
  const MEASURED_MOVED = ['date', 'dateborder', 'datesplit', 'datemixed', 'dip', 'date65', 'datenc', 'atceiling'] as const
  // The pay check's two W-carrying witnesses (Phase B) read `priced` through the reach walk's W branch
  // (KTD15: a construct carrying W reads `priced` whenever anyone still works — the safe-side over-read),
  // never through a U4 measurement: a W-present run has no pre-floor twin to measure against. Kept
  // apart so the measured list stays a measurement. Since U10 the eight measured seeds carry W too —
  // and a W-carrying run never reaches the floor's per-year walk: `workingYearTaxReachOfRun` reads W
  // FIRST (KTD15) and answers `priced` for any run with a worker. So the seed as shipped proves only the
  // W branch, and this arm went vacuous for what it was written to prove (the whole-file review
  // 2026-10-31, H-D25: a mutant dropping the walk's Social Security channel survived the file — it reds
  // the twin of every SS-alone seed now). U4's measurement is read
  // on its OWN subject instead — each seed with its W stripped (U4 ran before W existed) — and the
  // shipped seed beside it.
  const W_KEYED = ['dateshort', 'datecoststale'] as const
  const withoutW = (d: ScenarioDraft): ScenarioDraft => {
    const { workingYearCost: _w, ...rest } = d
    return rest
  }

  it('every date seed U4 measured as MOVED reads `priced` — and those eight, with the W-keyed witnesses, ARE the buildable date-route seeds (a new one must be measured before it can join)', () => {
    for (const k of MEASURED_MOVED) {
      // The W check would answer before the walk on the shipped seed, so the twin is U4's own subject.
      expect(DEV_SEEDS[k].workingYearCost, `${k} carries W (U10) — the twin is what strips it`).toBeDefined()
      const u4Subject = withoutW(DEV_SEEDS[k])
      expect(missingRequiredFacts(u4Subject), `${k} without W is buildable`).toEqual([])
      expect(exposureForDraft(u4Subject).workingYearTax, `${k} without W — U4 measured it MOVED`).toBe('priced')
    }
    for (const k of [...MEASURED_MOVED, ...W_KEYED]) {
      expect(isDateRoute(DEV_SEEDS[k]), `${k} is a date-route seed`).toBe(true)
      expect(exposureForDraft(DEV_SEEDS[k]).workingYearTax, k).toBe('priced')
    }
    for (const k of W_KEYED) expect(DEV_SEEDS[k].workingYearCost, `${k} carries W`).toBeDefined()
    const buildableDateSeeds = (Object.keys(DEV_SEEDS) as (keyof typeof DEV_SEEDS)[]).filter(
      (k) => isDateRoute(DEV_SEEDS[k]) && missingRequiredFacts(DEV_SEEDS[k]).length === 0,
    )
    expect([...buildableDateSeeds].sort()).toEqual([...MEASURED_MOVED, ...W_KEYED].sort())
  })

  it('the unbuildable date seed (`datesolo`, the employer-coverage refusal) reads `unknown` — never a silent `unpriced`', () => {
    expect(isDateRoute(DEV_SEEDS.datesolo)).toBe(true)
    expect(missingRequiredFacts(DEV_SEEDS.datesolo).length).toBeGreaterThan(0)
    expect(exposureForDraft(DEV_SEEDS.datesolo).workingYearTax).toBe('unknown')
  })

  it('a draft the ENGINE refuses inside the walk (a claim age outside 62–70, which no missing-fact names) reads `unknown` — and the seam does not crash the unlock', () => {
    // `runDateSearch` turns this same throw into its calm input-failure; the exposure is undecidable, so
    // it must aggregate, never fall silent and never throw out of `exposureForDraft`.
    const refused: ScenarioDraft = {
      ...DEV_SEEDS.date,
      people: [{ ...DEV_SEEDS.date.people[0]!, socialSecurityClaimAge: 55 }, DEV_SEEDS.date.people[1]!],
    }
    expect(missingRequiredFacts(refused), 'no missing fact names it').toEqual([])
    expect(workingYearTaxForRun(refused)).toBe('unknown')
    expect(exposureForDraft(refused).workingYearTax).toBe('unknown')
  })

  it('the seam reads the PRODUCER: every seed’s field equals `workingYearTaxForRun`, route by route', () => {
    for (const k of Object.keys(DEV_SEEDS) as (keyof typeof DEV_SEEDS)[]) {
      const d = DEV_SEEDS[k]
      if (missingRequiredFacts(d).length > 0) continue
      expect(exposureForDraft(d).workingYearTax, k).toBe(workingYearTaxForRun(d))
    }
  })

  it('an UNREACHED date-route household reads `unpriced` (both still working, 45 + 47, nothing in a clamped year for the floor to price), and the same household with a working-year conversion reads `priced`', () => {
    // `date` made young and two-earner: no Social Security for 20 years (a survivor's needs 60), no RMD
    // age, Medicare onset 18+ years out, no conversion — B > 0 in every clamped year, P = 0 in all of them.
    // W stripped: `date` carries W since U10, and a construct carrying W reads `priced` through KTD15's
    // branch whenever anyone still works — this arm measures the FLOOR's own reach, so it runs W-free.
    const { workingYearCost: _w, ...base } = DEV_SEEDS.date
    // A still-working person carries no retirement age (the save gate refuses one) — Sam's is dropped.
    const { retirementAge: _samRetired, ...sam } = base.people[1]!
    const young: ScenarioDraft = {
      ...base,
      people: [
        { ...base.people[0]!, birthYear: 1981, currentAge: 45 },
        { ...sam, birthYear: 1979, currentAge: 47, workStatus: 'working', earnedIncomeReal: 60_000 },
      ],
    }
    expect(isDateRoute(young)).toBe(true)
    expect(missingRequiredFacts(young), 'buildable').toEqual([])
    expect(exposureForDraft(young).workingYearTax).toBe('unpriced')
    // The moved control: a conversion starting in the build year sits inside every Y ≥ 1 working window.
    const converting: ScenarioDraft = { ...young, rothConversion: { annualAmountReal: 20_000, startYearOffset: 0, years: 2 } }
    expect(missingRequiredFacts(converting), 'buildable').toEqual([])
    expect(exposureForDraft(converting).workingYearTax).toBe('priced')
  })
})

// ── THE PAY CHECK'S W (U13's clock read, `workingYearCostForRun`) ─────────────────────────────────
// Does THIS run carry W? The working-years table's only reader is the W-keyed check (KTD1), so this is
// the working-years clock's exposure. The fixtures are built here, not taken from a seed's own W, so
// each arm holds whatever W the seed registry gives a seed (U10 gave `date` its own — the same $84,000).
describe('exposureForDraft — the pay check’s W (the working-years clock’s read)', () => {
  const { workingYearCost: _seedW, ...dateNoW } = DEV_SEEDS.date
  /** `date`'s own W, typed by hand: no budget ⇒ the quote is its $84,000 spending; no retirement
   *  state ⇒ the 'unpriced' reading (KTD5, KTD18). */
  const W: WorkingYearCostV3 = { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'unpriced' }

  it('a date-route draft that answered W reads `priced`; the same draft without W reads `unpriced` (a proof, not a default)', () => {
    expect(isDateRoute(dateNoW)).toBe(true)
    expect(missingRequiredFacts(dateNoW), 'buildable').toEqual([])
    expect(exposureForDraft({ ...dateNoW, workingYearCost: W }).workingYearCost).toBe('priced')
    expect(exposureForDraft(dateNoW).workingYearCost).toBe('unpriced')
    // An entered answer is W too — the read keys on presence, never on the kind.
    const entered: WorkingYearCostV3 = { kind: 'entered', amountReal: 90_000, entryPeriod: 'year', stateTaxReading: 'unpriced' }
    expect(exposureForDraft({ ...dateNoW, workingYearCost: entered }).workingYearCost).toBe('priced')
  })

  it('a spine-route draft reads `unpriced` — even one still carrying a W from its working years (the spine never reads W)', () => {
    const retired = DEV_SEEDS.retired
    expect(isDateRoute(retired)).toBe(false)
    expect(exposureForDraft(retired).workingYearCost).toBe('unpriced')
    expect(exposureForDraft({ ...retired, workingYearCost: W }).workingYearCost).toBe('unpriced')
  })

  it('the unbuildable date seed (`datesolo`) reads `unknown`, whatever W it carries — never a silent `unpriced`', () => {
    expect(isDateRoute(DEV_SEEDS.datesolo)).toBe(true)
    expect(missingRequiredFacts(DEV_SEEDS.datesolo).length).toBeGreaterThan(0)
    expect(exposureForDraft(DEV_SEEDS.datesolo).workingYearCost).toBe('unknown')
    expect(exposureForDraft({ ...DEV_SEEDS.datesolo, workingYearCost: W }).workingYearCost).toBe('unknown')
  })

  it('the seam reads the PRODUCER: every buildable seed’s field equals `workingYearCostForRun`, with and without W', () => {
    for (const k of Object.keys(DEV_SEEDS) as (keyof typeof DEV_SEEDS)[]) {
      const d = DEV_SEEDS[k]
      if (missingRequiredFacts(d).length > 0) continue
      expect(exposureForDraft(d).workingYearCost, k).toBe(workingYearCostForRun(d))
      const withW: ScenarioDraft = { ...d, workingYearCost: W }
      expect(exposureForDraft(withW).workingYearCost, `${k} + W`).toBe(workingYearCostForRun(withW))
    }
  })
})

// ── THE SOURCE-BIND on the CONSUMER (insights 032/081; the idiom is draftFromScenario.test.ts:409)
//
// F6, verbatim: mutating `IntakeApp.tsx`'s third argument to `{ ...exposureForDraft(draft), aca:
// 'priced' }` left EVERY test green. No vitest arm renders the gate's notes through the
// component, and no dev vault moves the ACA stamps (`acaStatus`/`fplGuidelineYear` appear in
// neither `devSeeds.ts`'s doctors nor `vertical-fit.spec.ts`), so the whole ACA half of §S4 had
// no end-to-end proof — and the shipped defect would return silently the day the
// `reVerifyEveryBuild` ACA constant flips. Testing `exposureForDraft` proves the FUNCTION is
// right; it proves nothing about whether the component still routes through it unaltered.
describe('the SHIPPED consumer binds to this seam (source-bind, not replication)', () => {
  const src = readFileSync(resolve(__dirname, '../IntakeApp.tsx'), 'utf8')

  it('IntakeApp imports the producer and hands `deriveStaleness` its UNMODIFIED result', () => {
    expect(src, 'the producer is imported, not re-declared').toMatch(
      /import \{[^}]*exposureForDraft[^}]*\} from '\.\/stalenessExposure'/,
    )
    // The exact shipped call, third argument included. A spread-and-override
    // (`{ ...exposureForDraft(…), aca: 'priced' }`) does not match this pattern. The fourth is the
    // pay check's KTD21 flag (edited in with it — R18 names this call site): the intake's ONE stale
    // predicate over the SAME hydrated draft, never a literal `false` and never folded into the
    // exposure record.
    expect(src, 'the report is derived with the seam’s own record').toMatch(
      /deriveStaleness\(\s*model,\s*currentEpochDay\(\),\s*exposureForDraft\(hydrated\.draft\),\s*isWorkingYearCostStale\(hydrated\.draft\),?\s*\)/,
    )
    expect(src, 'the stale predicate is the intake’s own, imported — not re-declared').toMatch(
      /import \{[^}]*isWorkingYearCostStale[^}]*\} from '@intake\/workingYearQuote'/,
    )
  })

  it('and no literal exposure read is hand-written at the call site — the mutant F6 named', () => {
    // Any of these appearing in the component means someone re-typed a decision that belongs to
    // the seam (the class that made the S0 verifier's `+ 3` survive 1096 green tests).
    expect(src, 'never a hand-written exposure literal in the component').not.toMatch(
      /(aca|medicare|overlayBuilt|contributions|blend|spending|workingYearTax|workingYearCost)\s*:\s*'(priced|unpriced|unknown)'/,
    )
  })
})
