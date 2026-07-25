/**
 * src/ui/healthSheetChrome.ts — the Healthcare sheet's PURE composition seam (P3·U11).
 *
 * Every honesty decision the sheet renders is decided HERE, in exported pure functions
 * (insight 048 — an honesty gate inline in an undrivable render path is untested despite a
 * green suite): the empirical anchors picked off the wire's {@link HealthReadout} series, the
 * thin-cohort withdrawal, the shadow-rate decomposition, the IRMAA step readout, the dated
 * legislative note, and the regime compare's cost-headline view. The component is dumb
 * wiring over this view-model.
 *
 * THE ANCHOR CONTRACT (council 2026-07-03, the unbiased-skeleton dissolution): every figure
 * anchors to the simulation's OWN per-year medians (`acaMagiP50` / `irmaaMagiP50` — an
 * unbiased best estimate by construction), never a modeled skeleton; the landscape geometry
 * around that anchor (cliff distance, next step, marginal rate, subsidy drag) is read through
 * the SAME canonical modules the engine prices with (`magiLandscape` → `taxCore` /
 * `healthOverlay` / the constants) — single producer, so the readout can never disagree with
 * the engine about where a cliff sits. The one disclosed approximation: the subsidy-drag
 * probe uses TODAY'S benchmark quote (the per-year escalated stream lives engine-side); the
 * `~`/`about` hedge carries that honestly.
 *
 * REGIME AWARENESS: the cliff lines exist only under the reverted/cliff table; an APPLIED
 * enhanced regime removes them (no cliff exists to warn about) and swaps the dated status
 * note to the what-if variant (an applied hypothesis must never read as current law —
 * council condition Q1).
 */
import type { HealthReadout, HealthReadoutYear, ScenarioV3, TwoArmOutcome } from '@shared/model'
import {
  cliffMagiFor,
  marginalOrdinaryRate,
  nextIrmaaStep,
  subsidyLossPerDollar,
} from '@engine/magiLandscape'
import { deductionStack } from '@engine/taxCore'
import { fplForHousehold } from '@engine/healthOverlay'
import {
  acaApplicablePercentage,
  acaApplicablePercentageEnhanced,
  acaEnhancedSubsidyStatus,
  irmaa,
} from '@engine/constants/health'
import { COHORT_FADE } from '@viz/bandGeometry'
import { copy, slots } from './copy'
import { composeTwoFutures, type TwoFuturesView } from './twoFuturesChrome'
import type { BandPlanClockAnchor } from './bandAnnotations'

/** Humane rounding for a readout dollar (the `~$X` grammar owns the imprecision). */
const roundDollar = (v: number): number => Math.round(v / 100) * 100
const formatDollar = (v: number): string => roundDollar(v).toLocaleString('en-US')
/** A MONTHLY premium formats at whole-dollar grain — the $100 grain above is the ANNUAL
 *  readout's humane rounding and would flatten a $203/mo figure to $200 (a false precision
 *  loss in the other direction: the "about" hedge owns the fuzz, the digits stay real). */
const formatMonthlyDollar = (v: number): string => Math.round(v).toLocaleString('en-US')

/** The dated legislative check, formatted for prose (Intl-owned, never hand-assembled). */
function verifiedOnFormatted(): string {
  // The ISO date is a calendar DATE (no timezone) — parse the parts, never `new Date(iso)`
  // (UTC-midnight shifts a day west of Greenwich).
  const [y, m, d] = acaEnhancedSubsidyStatus.value.verifiedOn.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(y!, m! - 1, d!))
}

/** A year is QUOTABLE only while the living cohort is thick enough to speak for (the band's
 *  own COHORT_FADE.full discipline — a median over few living paths is noise in a line's
 *  clothing). Exported planted-fail style: the tests drive it directly. */
export function quotableYears(readout: HealthReadout): readonly HealthReadoutYear[] {
  return readout.byYear.filter((y) => y.cohortFraction >= COHORT_FADE.full)
}

/** The ACA anchor: the first quotable year where the overlay actually priced a marketplace
 *  year for most futures. Null when the household has no priced window (post-65, or the
 *  series is absent — the date route). */
export function acaAnchor(readout: HealthReadout): HealthReadoutYear | null {
  return quotableYears(readout).find((y) => y.acaPricedFraction >= 0.5) ?? null
}

/** The Medicare anchor: the first quotable year where a base Part B bill actually landed. */
export function medicareAnchor(readout: HealthReadout): HealthReadoutYear | null {
  return quotableYears(readout).find((y) => y.medicareBaseP50 > 0) ?? null
}

/** One FACT of the stepped readout (cold-read 2026-07-03: the content is the first-class
 *  citizen — each empirical fact renders as a calm eyebrow + a tabular-nums dollar anchor +
 *  the honed sentence(s), the "calm stepped readout, tabular-nums anchor" the U11 pre-build
 *  ratification named). The figure is a VISUAL anchor only (aria-hidden in render): every
 *  quantity also lives inside a hedged body sentence, so the a11y tree hears it exactly once. */
export interface HealthFact {
  readonly id: 'coverage' | 'discount' | 'conversion' | 'medicare' | 'step'
  readonly eyebrow: string
  readonly figure?: string
  readonly lines: readonly string[]
}

/** The sheet's composed view: the dated status note + the fact readout, in reading order. */
export interface HealthSheetView {
  /** The dated legislative-status note (always present — read from LIVE constants). */
  readonly statusLine: string
  /** The stepped fact readout — empty when no wire series exists (the date route / pre-resolve).
   *  Presence rules per fact are unchanged from the flat-line era: coverage/discount/conversion
   *  need the ACA anchor (discount folds the headroom context + the over-cliff odds); medicare/
   *  step need the Medicare anchor (step also needs a remaining tier). */
  readonly facts: readonly HealthFact[]
}

/**
 * Compose the sheet's readout lines from the wire series + the draft's categorical facts.
 * `readout` undefined (the date route / a pre-resolve open) composes the status line alone —
 * the sheet still teaches, it just quotes no empirical figures.
 */
export function composeHealthSheet(
  readout: HealthReadout | undefined,
  draft: Pick<ScenarioV3, 'filing' | 'enhancedSubsidies' | 'startCalendarYear'> & {
    readonly people: ReadonlyArray<{ readonly currentAge?: number }>
    readonly health: { readonly slcspMonthlyToday?: number }
  },
): HealthSheetView {
  const enhancedApplied = draft.enhancedSubsidies === true
  const checkedOn = verifiedOnFormatted()
  const statusLine = enhancedApplied
    ? slots.acaCostStatusEnhanced(checkedOn)
    : slots.acaCostStatus(checkedOn)
  if (readout === undefined) return { statusLine, facts: [] }

  const facts: HealthFact[] = []

  const table = enhancedApplied ? acaApplicablePercentageEnhanced.value : acaApplicablePercentage.value
  const fplDollar = fplForHousehold(2) // the modal both-alive household (the survivor flip is its own note)
  const cliff = cliffMagiFor(table, fplDollar)

  const anchor = acaAnchor(readout)
  if (anchor !== null) {
    facts.push({
      id: 'coverage',
      eyebrow: copy.healthFactCoverage,
      figure: slots.healthFigPerYear(formatDollar(anchor.acaNetPremiumP50)),
      lines: [slots.acaCostNet(formatDollar(anchor.acaNetPremiumP50))],
    })

    // The over-cliff frequency: the WORST quotable priced year (a cliff smeared into an
    // average stops being visible — insight 062; the fraction is the honest channel).
    const worst = quotableYears(readout)
      .filter((y) => y.acaPricedFraction >= 0.5)
      .reduce((max, y) => Math.max(max, y.overCliffFraction), 0)
    // UNCLAMPED by design (insight 062's no-silent-clamp cousin): at ≥ 10 the slot renders the
    // valence-neutral adverse ceiling ("more than 9 in 10"), never the good-news "better than"
    // and never a snapped "10 of 10" (council 2026-07-18 Q3, the hawk's veto).
    const worstOfTen = Math.round(worst * 10)
    const cliffLine = cliff !== null && worstOfTen >= 1 ? slots.acaCostCliff(worstOfTen) : undefined

    // The shadow rate at the empirical anchor: ordinary marginal rate (through the same
    // deduction stack the tax math uses) + the subsidy drag (through the same sliding scale
    // the overlay prices with). count65 at the anchor from the household's own ages, and the
    // anchor's CALENDAR year from the SAME yearsIn clock (council 2026-07-09 C4 — the senior
    // bonus windows out of the stack past 2028, and the readout must age exactly with the
    // engine's own year, single-producer contract).
    const yearsIn = anchor.yearsFromNow - 1 // the series clock: k = END of sim-year k−1
    const count65 = draft.people.filter(
      (p) => p.currentAge !== undefined && p.currentAge + yearsIn >= 65,
    ).length
    const anchorCalendarYear = draft.startCalendarYear + yearsIn
    const agi = anchor.irmaaMagiP50
    const taxable = Math.max(0, agi - deductionStack(draft.filing, count65, agi, anchorCalendarYear))
    const marginal = marginalOrdinaryRate(taxable, draft.filing)
    const slcspAnnual = (draft.health.slcspMonthlyToday ?? 0) * 12
    // The drag term exists only while the credit is genuinely alive at the anchor: past the
    // cliff the PTC is already 0, but `slidingScalePtc` is deliberately CLIFF-REMOVED (the
    // solver owns the branch), so an over-cliff anchor would otherwise report a phantom
    // smooth drag (~10¢) the household cannot actually lose twice (ultramode 2026-07-03 —
    // conservative-direction, but an overstated teaching figure is still an overstatement).
    const creditAlive = cliff === null || anchor.acaMagiP50 <= cliff
    const drag =
      slcspAnnual > 0 && creditAlive
        ? subsidyLossPerDollar(anchor.acaMagiP50, slcspAnnual, fplDollar, table)
        : 0
    const cents = Math.round((marginal + drag) * 100)

    // The discount fact: the income-vs-cutoff context first (it defines the line the odds
    // sentence leans on), the over-cliff odds folded in as its second sentence when quotable.
    const headroom = cliff !== null ? cliff - anchor.acaMagiP50 : 0
    if (cliff !== null && headroom > 0) {
      facts.push({
        id: 'discount',
        eyebrow: copy.healthFactDiscount,
        figure: slots.healthFigRoom(formatDollar(headroom)),
        lines: [
          slots.shadowRateHeadroom(
            formatDollar(anchor.acaMagiP50),
            formatDollar(cliff),
            formatDollar(headroom),
          ),
          ...(cliffLine !== undefined ? [cliffLine] : []),
        ],
      })
    } else if (cliff !== null && worstOfTen >= 1) {
      // An over-cliff anchor still owes the odds truth — and no headroom sentence precedes it
      // in this branch, so the cutoff dollar rides INLINE (audit 2026-07-03: the shared odds
      // line borrowed a referent from a sentence that never renders here).
      facts.push({
        id: 'discount',
        eyebrow: copy.healthFactDiscount,
        lines: [slots.acaCostCliffOverCliff(worstOfTen, formatDollar(cliff))],
      })
    }

    facts.push({
      id: 'conversion',
      eyebrow: copy.healthFactConversion,
      figure: slots.healthFigCents(cents),
      lines: [slots.shadowRateLine(cents)],
    })
  }

  const medicare = medicareAnchor(readout)
  if (medicare !== null) {
    // The "before the next step" anchor (cold-read 2026-07-03): base + any surcharge the
    // middle path already pays — the wire's split (council Q3) rendered at last.
    const totalNow = medicare.medicareBaseP50 + medicare.irmaaSurchargeP50
    facts.push({
      id: 'medicare',
      eyebrow: copy.healthFactMedicare,
      figure: slots.healthFigPerYear(formatDollar(totalNow)),
      lines: [
        copy.irmaaStepStory,
        roundDollar(medicare.irmaaSurchargeP50) > 0
          ? slots.irmaaStepNowSurcharged(formatDollar(totalNow), formatDollar(medicare.irmaaSurchargeP50))
          : slots.irmaaStepNowBase(formatDollar(totalNow)),
      ],
    })
    const step = nextIrmaaStep(medicare.irmaaMagiP50, draft.filing, irmaa.value)
    if (step !== null) {
      // The household's OWN number for the step ("just tell them"): the enrolled count at the
      // anchor from the household's ages (the modal both-alive frame the sheet already speaks),
      // never a flat ×2 — one enrolled quotes the per-person figure on the each-of-you arm.
      const yearsInAtAnchor = medicare.yearsFromNow - 1
      const enrolled = draft.people.filter(
        (p) => p.currentAge !== undefined && p.currentAge + yearsInAtAnchor >= 65,
      ).length
      const bothEnrolled = enrolled >= 2
      const add = formatDollar(step.surchargeDeltaMonthlyPerPerson * 12 * (bothEnrolled ? 2 : 1))
      facts.push({
        id: 'step',
        eyebrow: copy.healthFactStep,
        figure: slots.healthFigStepAdd(add),
        lines: [
          slots.irmaaStepNext(
            formatDollar(step.threshold),
            formatDollar(medicare.irmaaMagiP50),
            formatDollar(step.threshold - medicare.irmaaMagiP50),
            add,
            bothEnrolled,
          ),
        ],
      })
    }
  }

  return { statusLine, facts }
}

/**
 * Compose the regime compare's two-futures view: the chart + odds line from the shared
 * composer, HEADLINED by the lifetime health-cost delta (the regime's real effect
 * concentrates in the pre-65 ACA years and may barely move the portfolio median —
 * council 2026-07-03). Null mirrors composeTwoFutures's own null (an unusable outcome).
 */
export function composeRegimeFutures(
  outcome: TwoArmOutcome,
  pickedEnhanced: boolean,
  ages?: readonly [number, number],
  savedAnchor?: BandPlanClockAnchor,
): TwoFuturesView | null {
  const base = composeTwoFutures(
    outcome,
    pickedEnhanced ? copy.tfChartRegimeEnhanced : copy.tfChartRegimeReverted,
    copy.tfChartRegimeCurrent,
    slots.rothDeltaSurvivor,
    ages,
    savedAnchor,
  )
  if (base === null || outcome.kind !== 'two-arm') return base
  const withCost = outcome.with.lifetimeHealthCostMedianReal
  const withoutCost = outcome.without.lifetimeHealthCostMedianReal
  if (withCost === undefined || withoutCost === undefined) return base
  // The cost delta LEADS; the odds line (the shared composer's deltaLine) demotes to the
  // second row. Its state/years secondaries stay in their usual seats when present.
  // The gate reads the FORMATTED strings (Caddie 2026-07-10): two medians within the $100
  // rounding grain render one figure, and "~$99,800 versus ~$99,800" is a twin-number
  // against itself — the even arm says "about the same" and quotes the figure once.
  const withFormatted = formatDollar(withCost)
  const withoutFormatted = formatDollar(withoutCost)
  return {
    ...base,
    deltaLine:
      withFormatted === withoutFormatted
        ? slots.subsidyRegimeCostEven(withFormatted)
        : slots.subsidyRegimeCostDelta(withFormatted, withoutFormatted),
    stateLine: base.deltaLine,
  }
}

/**
 * Should the verdict surfaces wear the priced-Medicare disclosure — the AFFIRMATION that base Part
 * B + the income surcharge ARE in these numbers, TOGETHER with the narrowed residual of what still
 * isn't (copy `verdictMedicarePriced` + `verdictMedicareResidual`; the Roth lever's own
 * `rothMedicareResidualNote`)? True exactly when the run PRICED Medicare and the household reaches
 * no Healthcare door.
 *
 * THE INPUTS ARE PRICING FACTS, NEVER AGES — this is the insight-080 fix, and it is STRUCTURAL. The
 * predecessor (`medicareUnpriced`) keyed the disclosure off ages: every member a known 65+. At write
 * time that equalled the pricing-complement because the intake gate (which needs a pre-65 member) was
 * the ONLY producer of `healthcareEnabled`. Then `dateSearch.ts:222` became a SECOND producer — it
 * forces `healthcareEnabled: true` on every date candidate — and the age predicate silently lied: a
 * still-working all-65+ household read "Medicare not priced" over numbers Medicare had already moved.
 * Keying the disclosure off the RUN's own pricing decision closes that by construction, and this
 * signature has no `people[]` parameter, so no age can reach it to re-open the equivalence (the
 * age-mutation witness is type-level: there is no age to mutate). The caller supplies the decision
 * READ OFF THE BUILT PARAMS, never re-derived from the builder's inputs:
 * `medicarePriced = isDateRoute || spineMedicarePriced` — where `spineMedicarePriced` returns
 * `buildSpineParams(d)?.overlay?.healthcareEnabled === true`. (The first shipped caller re-derived
 * via the age predicate `medicareOnlyPriced` and diverged from the run at buildOverlay's degenerate
 * early-return — the SS-only $0-portfolio household built NO overlay yet read "priced"; the
 * ultramode fold 2026-07-10 closed it. A producer's output is the only non-drifting source.)
 *
 * The residual is WITHHELD when the household reaches the Healthcare door: that sheet already carries
 * its own residual (`controlHealthOmissionsNote`), so one honest home per fact. The two lines SHIP
 * TOGETHER — the affirmative alone would imply ALL of Medicare is priced, a fresh optimistic lie.
 */
export function showMedicarePricedNote(run: {
  readonly medicarePriced: boolean
  readonly reachesHealthDoor: boolean
}): boolean {
  return run.medicarePriced && !run.reachesHealthDoor
}

/** One person's extras disclosure input (the ask-for-Medicare-extras unit): the BUILT funded
 *  monthly dollar (the params builder's output — insight 081) + the draft-side provenance.
 *  Mirrors `intakeMap.MedicareExtrasPersonView` structurally (kept structural here so this
 *  pure chrome module needs no intake import). */
export interface MedicareExtrasDisclosurePerson {
  readonly monthly: number
  readonly provenance: 'entered' | 'affirmed-zero' | 'typical'
  /** The person's display label — their name, or the You/Your-spouse fallback. */
  readonly who: string
}

/** The HERO's on-typical appendix (F5, population A — the non-door household): the
 *  bi-directional per-person disclosure, appended INSIDE the residual paragraph (same
 *  block — the tallest composite frame gains no new row). `undefined` when nobody is
 *  on-typical: an entered/affirmed household needs no typical caveat. BOTH-on-typical
 *  collapses to one sentence (the triple-note anaphora lesson, U13). */
export function composeMedicareExtrasTypicalNote(
  view: readonly MedicareExtrasDisclosurePerson[] | null,
): string | undefined {
  if (view === null) return undefined
  const typicals = view.filter((p) => p.provenance === 'typical')
  if (typicals.length === 0) return undefined
  const fig = formatMonthlyDollar(typicals[0]!.monthly)
  if (typicals.length >= 2) return slots.medicareExtrasTypicalBoth(fig)
  return slots.medicareExtrasTypicalOne(typicals[0]!.who, fig)
}

/** The DOOR SHEET's extras block (F5, population B — the household whose verdict residual is
 *  structurally withheld by {@link showMedicarePricedNote}; also the spine door household):
 *  per-person provenance lines, deliberately INDEPENDENT of the wire readout (the date route's
 *  sheet composes with `readout === undefined`, so a wire-fact home would silently vanish for
 *  exactly the population the F5 floor protects). NULL when the run prices no Medicare-bearing
 *  overlay — no claim is made. Its own legible lines — never folded into the six-item
 *  omissions run-on. */
export function composeMedicareExtrasLines(
  view: readonly MedicareExtrasDisclosurePerson[] | null,
): readonly string[] | null {
  if (view === null) return null
  return view.map((p) =>
    p.provenance === 'entered'
      ? slots.medicareExtrasFactEntered(p.who, formatMonthlyDollar(p.monthly))
      : p.provenance === 'affirmed-zero'
        ? slots.medicareExtrasFactNone(p.who)
        : slots.medicareExtrasFactTypical(p.who, formatMonthlyDollar(p.monthly)),
  )
}
