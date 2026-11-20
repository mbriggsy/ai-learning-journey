/**
 * P3·U13 — the re-entry gate's pure composition (insight 048: the honesty-critical
 * decisions live in a testable seam, never inline in the component).
 *
 * Composes the balance-confirm read-back + the staleness note lines from the RAW-decoded
 * persisted scenario and the unlock-time staleness report. The read-back is the VAULT's
 * OWN figures read back per engine bucket (the KIND_TO_BUCKET map — the same grouping the
 * plan computes on, so the confirm can never disagree with the answer it fronts) plus the
 * Social Security fold-in ("are these still your benefit amounts?" — user-entered, so a
 * confirm, never a vintage clock).
 *
 * THE CONFIRM IS A PROMPT, NEVER AN ATTESTATION (council constraint (c)): nothing composed
 * here is stored, stamped, or later displayed as "confirmed on DATE" — a reflexive tap must
 * not be laundered into a freshness claim (R19).
 */
import type { CurrentScenario } from '@shared/model'
import { KIND_TO_BUCKET } from '@intake/intakeMap'
import type { StalenessReport } from '@store/staleness'
import type { PricingFamily } from '@engine/pricingVersion'
import { copy, slots, type CopyKey } from './copy'
import { notePartsText, type GateDoor, type NoteParts } from './noteParts'

/** Each engine-pricing family's phrase in the ONE method line — exhaustive by type, so a family the
 *  ledger can declare can never be named with no words. */
const PRICING_FAMILY_PHRASE: Readonly<Record<PricingFamily, CopyKey>> = {
  tax: 'stalenessPricingTax',
  stateTax: 'stalenessPricingStateTax',
  contributions: 'stalenessPricingContributions',
  aca: 'stalenessPricingAca',
  spending: 'stalenessPricingSpending',
  medicare: 'stalenessPricingMedicare',
}

/** "a" · "a and b" · "a, b and c" — the families arrive in `PRICING_FAMILY_ORDER` (Medicare last). */
function joinFamilies(families: readonly PricingFamily[]): string {
  const phrases = families.map((f) => copy[PRICING_FAMILY_PHRASE[f]])
  return phrases.length <= 1 ? (phrases[0] ?? '') : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`
}

const formatDollar = (v: number): string => Math.round(v).toLocaleString('en-US')

export interface ReentryRow {
  /** The row's label (already-resolved copy — bucket name or the person's own name). */
  readonly label: string
  /** The formatted figure ("$412,000" / "$2,000 a month"). */
  readonly value: string
}

export interface ReentryView {
  /** The intro's copy key — ROUTE-TRUE (Caddie card #1, pilot-cleared 2026-07-10): an
   *  all-retired household has no paychecks, so "Markets and paychecks move" was the spouse
   *  walker's primary stumble; the retired arm speaks "benefit checks" instead. Decided HERE
   *  (the pure seam, insight 048) off the SAME all-retired predicate the note lines use. */
  readonly introKey: 'reentryIntro' | 'reentryIntroRetired'
  /** Per-bucket balances, PRESENT buckets only (an empty bucket is noise, not a row). */
  readonly balanceRows: readonly ReentryRow[]
  /** The Social Security fold-in rows (one per person with a benefit entered). */
  readonly benefitRows: readonly ReentryRow[]
  /** The calm note lines, in push order — the named fired clocks (app default, tax, state tax,
   *  ACA, Medicare), then the engine-pricing ledger (`report.pricing`: the ONE named method line,
   *  its nameless twin, the Medicare-spending re-confirm), then the contribution clock
   *  (`stalenessDate`), the working-years clock (`stalenessWorkingYears`), the ONE nameless
   *  reference-tables line, the stale-W line (the caller's W-step sentence framed by
   *  `stalenessPayCheckGateLead`, or the `stalenessWorkingYearCost` fallback when none is handed
   *  over) — or, in its place, the typed-below line (U11 walk 6's R1: a fresh typed W below today's
   *  quote, {@link ReentryTypedBelow}), the moved left-over line (build 2's R12: `stalenessLeftOverNote` and the caller's
   *  sentence — or, where a tax, state-tax or working-years line fired, the caller's clause on the
   *  FIRST of them instead, and no line of its own; or, where none fired and the typed-below line is drawn, that line's
   *  own clause: {@link LeftOverHost}), and one budget line per boundary year (empty = nothing to flag). */
  readonly noteLines: readonly ReentryNoteLine[]
  /** Build 2's clause host, decided ONCE, here (obligation (f)): did a tax, state-tax or working-years
   *  line fire — the three lines that carry a moved left over as a clause? The Result reads THIS for its
   *  hero's rules note, never `rulesMoved` (which also fires on the ACA, Medicare, contribution and
   *  app-default clocks, none of which carries it). Independent of whether the left over moved at unlock:
   *  the Result re-reads the live draft, so a left over that moves in the session rides the same host. */
  readonly leftOverClauseHost: boolean
  /** W's door (council `wf_22858e04-f7a` (2)): `section.reentry-door`, the next sibling after the gate's buttons — its
   *  heading, the scope sentence the affirm button is described by, and the route — or `null`: W is neither stale nor
   *  typed below today's quote (U11 walk 6's R1, the update act's door), no sentence was handed over, or the tab cannot
   *  save (a read-only tab has no buttons to route through). */
  readonly door: GateDoor | null
  /** The "~N years since your save" line, or null (absent savedAt / under a year —
   *  SUPPRESSED, never fabricated). */
  readonly elapsedLine: string | null
}

const BUCKET_LABEL_KEY: Readonly<Record<'pretax' | 'roth' | 'taxable' | 'hsa', CopyKey>> = {
  pretax: 'reentryBucketPretax',
  roth: 'reentryBucketRoth',
  taxable: 'reentryBucketTaxable',
  hsa: 'reentryBucketHsa',
}

/** The gate's KTD21 sentence, composed by the caller from the HYDRATED draft this report describes
 *  (`workingYearCostStaleLine`: the W step's own note, `workingYearCostStaleNote`, plus build 2's R12
 *  dollars clause and, where the spending rose, what a check at the quote adds, for a "saved" answer waiting
 *  on W — this seam never re-derives the quote): `line` is that line's parts; `door` is the gate's door under its
 *  buttons (`workingYearCostStaleDoor`'s `gate`: the heading, the scope sentence, the route; council
 *  `wf_22858e04-f7a`); and `canChange` is whether the answer will offer the door to change it (a tab that can save)
 *  — the door rides only then. `null` where W is not stale. REQUIRED, never
 *  optional-with-a-default: a caller that forgets it must fail to compile, never fall back to the figure-less line
 *  in silence. */
export interface ReentryPayCheckStale {
  readonly line: Omit<NoteParts, 'door'>
  readonly door: GateDoor
  readonly canChange: boolean
}

/** A gate note line: plain text, or W's stale line as parts (`NotePartsBlock` draws it as a block). `text` is
 *  the parts joined — the block's words in reading order, and its React key (`ReEntry.tsx` keys each note by its
 *  text). */
export type ReentryNoteLine = string | { readonly text: string; readonly parts: NoteParts }

/** The gate's moved left-over sentences (build 2's R12 and KTD9), composed by the caller from the
 *  HYDRATED draft this report describes, both off ONE value of the moved core
 *  (`workingYearLeftOverMoved`): `text` — the line's sentence after `stalenessLeftOverNote`, naming the
 *  stored and the live year-0 figure; `clause` — the same two figures as the clause a fired tax,
 *  state-tax or working-years line carries instead; `canChange` — whether the answer will offer the door
 *  to change it (a tab that can save: the `ReentryPayCheckStale` door law), which adds the door sentence
 *  to the line (never to a hosted clause, whose host line names no door). This seam never reads the
 *  answer and never re-derives either figure. `null` where the left over has not moved.
 *
 *  UNLIKE the W line it has NO figure-less fallback: the report calling the left over moved while
 *  the caller hands no sentence is a wiring fault, and it THROWS. A silent drop would be the silent
 *  stale the house refuses, and a figure-less line would hide the fault behind words written for no
 *  household. WHERE THE THROW LANDS: the one product caller is `IntakeApp`'s hydrate effect, whose
 *  bare catch turns it into the restore-failed face ("That didn’t work. Try again.", the error text
 *  discarded), and every reload re-derives the same report and throws again: the household cannot
 *  open its plan. So the throw must be unreachable BY CONSTRUCTION, never by the caller's care: the
 *  go-live's moved predicate and this sentence both read ONE core over the draft, the way
 *  `isWorkingYearCostStale` and `workingYearCostStaleSentence` both read `workingYearCostStaleness`
 *  (`src/intake/workingYearQuote.ts`); `IntakeApp` computes the core once and builds the fact and these
 *  sentences from that one value. */
export interface ReentryLeftOverStale {
  readonly text: string
  readonly clause: string
  readonly canChange: boolean
}

/** The gate's typed-below line (U11 walk 6's R1), composed by the caller from the HYDRATED draft
 *  (`workingYearCostTypedBelowComposed` on the gate: a fresh TYPED W below today's quote, which the report never
 *  calls stale — a typed figure is never staled on a quote, KTD10 — so this is the only way the gate hears it):
 *  `compose` — the line as parts (the whole-window rebuild's KTD6: one span folds into its opening, a plain note drawn as
 *  its old paragraph; two or more draw one labelled part per run), for whether THIS seam assigned it the moved left
 *  over's clause, and whether it carried it — a closure over the caller's one hydrated draft, so the caller never decides
 *  the host (the walk-9 form council's call (1a), insight 081); `door` — the update act's door under the buttons
 *  (`workingYearCostTypedBelowDoor`), in both forms: `plain`, and `carryingMoved`, whose scope sentence names the moved
 *  fact's noun too; `canChange` — the tab can save (the door rides only then, the {@link ReentryPayCheckStale} door
 *  law). `null` where no fresh typed figure sits below the quote, or the run reads no W. No report fact goes with it: it
 *  is an answer read against today's quote, never a clock, so it feeds neither `anyStale` nor `rulesMoved`. */
export interface ReentryTypedBelow {
  readonly compose: (carriesMoved: boolean) => { readonly parts: NoteParts; readonly carriedMoved: boolean }
  readonly door: { readonly plain: GateDoor; readonly carryingMoved: GateDoor }
  readonly canChange: boolean
}

/** Where the moved left over's fact is said on the gate (the walk-9 form council `wf_9f28e691-1dc`, call (1a);
 *  `docs/plans/features/typed-below-walk9-form-build-spec.md`), decided ONCE, here, from the report and the lines drawn —
 *  an exhaustive Record keys every choice made by it (insight 147):
 *  · `rulesLine` — a tax, state-tax or working-years line fired: the clause rides the first of them (the Result reads
 *    the same decision as `leftOverClauseHost`);
 *  · `typedBelowLine` — no rules line fired, and the typed-below line DRAWN carried the clause (read off the line itself,
 *    never off a branch test): the clause after its counts sentence, no moved note, and its door's scope sentence naming
 *    the fact's noun;
 *  · `ownNote` — neither: the moved note of its own, its lead, its sentence and its door sentence, unchanged (register (r)
 *    stays U12's). Also wherever the typed-below line was offered the clause and was never drawn (W's stale line outranks
 *    it) or was drawn without it: never silence. */
type LeftOverHost = 'rulesLine' | 'typedBelowLine' | 'ownNote'

/** The gate's answer sentences, ONE required named object (build 2's KTD9 one seam down): `costStale` and
 *  `leftOverStale` are read only where the report's fact of the same name is set
 *  (`report.workingYear.costStale`, `report.workingYear.leftOverStale`); `typedBelow` has no fact (see
 *  {@link ReentryTypedBelow}) and is read where W's line is not. Never adjacent positional parameters: a
 *  {@link ReentryPayCheckStale} is assignable to a {@link ReentryLeftOverStale}, so a swapped pair
 *  would compile clean and drop the W sentence for its fallback. Every field REQUIRED, never
 *  optional-with-a-default: a caller that forgets one must fail to compile. */
export interface ReentryAnswerSentences {
  readonly costStale: ReentryPayCheckStale | null
  readonly leftOverStale: ReentryLeftOverStale | null
  readonly typedBelow: ReentryTypedBelow | null
}

export function composeReentry(
  scenario: CurrentScenario,
  report: StalenessReport,
  sentences: ReentryAnswerSentences,
): ReentryView {
  const { costStale: payCheckStale, leftOverStale, typedBelow } = sentences
  // The intro's register (Caddie card #1). It USED to double as the blend note's route-true
  // wording selector; U17 §S4 made the blend clock nameless on both routes, so this predicate
  // now has exactly one consumer (insight 087 — the comment is swept with the code it described).
  const allRetired = scenario.people.every((p) => p.workStatus === 'retired')

  // ── the per-bucket read-back ─────────────────────────────────────────────────────────
  const sums: Record<'pretax' | 'roth' | 'taxable' | 'hsa', number> = {
    pretax: 0,
    roth: 0,
    taxable: 0,
    hsa: 0,
  }
  for (const a of scenario.enteredAccounts) sums[KIND_TO_BUCKET[a.kind]] += a.valueToday
  const balanceRows = (['pretax', 'roth', 'taxable', 'hsa'] as const).flatMap((bucket) =>
    scenario.enteredAccounts.some((a) => KIND_TO_BUCKET[a.kind] === bucket)
      ? [{ label: copy[BUCKET_LABEL_KEY[bucket]], value: `$${formatDollar(sums[bucket])}` }]
      : [],
  )

  // ── the Social Security fold-in ──────────────────────────────────────────────────────
  // `pia` is the persisted ANNUAL real benefit (stored ×12 from the monthly entry) — read
  // back monthly, the frame the statement and the intake asked in.
  const benefitRows = scenario.people.flatMap((p) =>
    p.pia > 0 ? [{ label: p.name, value: slots.reentryBenefitMonthly(formatDollar(p.pia / 12)) }] : [],
  )

  // ── the staleness note lines (U17 §S4 — the three-way, rendered) ────────────────────
  // EVERY named line below rides a predicate `deriveStaleness` has already EXPOSURE-GATED: the
  // clock fired AND the run this report describes actually priced the thing that moved. The
  // silenced bucket reaches no line at all, and the unattributed bucket speaks exactly once,
  // namelessly, at the end. Nothing here re-derives a gate — a second copy of the decision is
  // precisely the drift the split was written to kill.
  const noteLines: ReentryNoteLine[] = []
  // Build 2's clause host (R12, KTD9): the index of the FIRST fired tax, state-tax or working-years line, in
  // push order — the one line a moved left over rides as a clause. No other rules line may host it.
  let clauseHost: number | undefined
  const pushHost = (line: string): void => {
    clauseHost ??= noteLines.length
    noteLines.push(line)
  }
  if (report.spine.appDefaultMoved) noteLines.push(copy.stalenessAppDefault)
  if (report.controls.taxMoved) pushHost(copy.stalenessTax)
  // S4/S5.4 — the state-tax clock's own line (fires only for a household whose RUN priced a
  // state whose own profile drifted; `deriveStaleness` gates on the injected producer's-output
  // priced state, so a non-priced/'elsewhere'/degenerate-overlay vault never reaches this).
  // Its OWN line, never aliased onto stalenessTax.
  if (report.controls.stateTaxMoved) pushHost(copy.stalenessStateTax)
  // The two healthcare families, each on its own exposure read (insight 086: this is the
  // re-point of the former single `stalenessHealthcare` push, landed in the same commit as the
  // key split). A household exposed to both gets both lines — each is true on its own terms,
  // and a clock that dates BOTH tables (`coverage-year`) raises only the families the run
  // actually priced. THE STRUCTURAL PROMISE these two lines carry: `deriveStaleness` derives
  // both booleans from the same clock→family mapping that bucketed the clock, so a named clock
  // ALWAYS has a line here — `rulesMoved` can never fire an alarm nothing is allowed to explain.
  if (report.healthcare.acaMoved) noteLines.push(copy.stalenessAca)
  if (report.healthcare.medicareMoved) noteLines.push(copy.stalenessMedicare)
  // THE ENGINE'S OWN METHOD (the ledger — `report.pricing`, already exposure-gated upstream): ONE
  // named line over every exposed family (the calm-not-dashboard fold: a line per family would stack
  // up to five sentences on the gate), then at most one nameless twin, then the conditional spending
  // re-confirm. Each is pushed at most once and each text is distinct, so the text-keyed notes
  // (`ReEntry.tsx`) never collide. None of them rides `rulesMoved`.
  if (report.pricing.namedFamilies.length > 0) {
    noteLines.push(slots.stalenessPricing(joinFamilies(report.pricing.namedFamilies)))
  }
  if (report.pricing.hedged) noteLines.push(copy.stalenessPricingHedged)
  if (report.pricing.reconfirmMedicareSpending) noteLines.push(copy.stalenessReconfirmMedicareSpending)
  // The contribution clock only, twice-gated upstream: route (this household HAS a date, so the
  // "behind your date" wording is true) and exposure (their run actually prices a contribution
  // stream). (The blend clause left this line — it aggregates or goes silent now.)
  if (report.date.contributionMoved) noteLines.push(copy.stalenessDate)
  // The pay check's U13 clock — the working-years table (payroll tax, the earnings test) — the last
  // NAMED rules line, beside its date-surface sibling. Exposure-gated upstream: the run carries W,
  // the table's one reader, so "the rules for your working years" is true of every household that hears it.
  if (report.workingYear.vintageMoved) pushHost(copy.stalenessWorkingYears)
  // THE AGGREGATE, pushed AT MOST ONCE — `ReEntry.tsx:86-90` keys each note <p> by its own TEXT,
  // so a second push of the same sentence would collide on the React key. One `if` over the
  // whole bucket is the structural guarantee (never a per-clock loop over `.clocks`).
  if (report.unattributed.moved) noteLines.push(copy.stalenessReferenceTables)
  // The pay check's KTD21 — the household's own W answer no longer matches the spending or state it
  // was given against. Not a rules line (it rides `anyStale` only), so it sits with the input
  // re-confirms, before the budget lines. This seam takes no draft and never re-derives the quote:
  // the caller hands it W's one stale line (the W step's own sentence: both figures, the cause, which way
  // it leans — b9-7's U10 Caddie card; plus build 2's dollars clause for a "saved" answer waiting on W,
  // `workingYearCostStaleLine`), and the static figure-less line is only the fallback for a report that
  // calls W stale with no sentence beside it.
  // As parts (council `wf_22858e04-f7a`): the gate's lead and the line's opening, then its labelled segments, drawn as a
  // block in the story column; its door is the view's own field, drawn under the buttons, and only where the tab can save.
  let door: GateDoor | null = null
  // The moved left over's host (call (1a)). The fact without its sentence is the wiring fault `ReentryLeftOverStale`
  // names, whichever host would have said it. A fired rules line hosts it; otherwise the typed-below line is OFFERED it,
  // and whether that line hosts it is read off what was actually drawn (`typedBelowCarried`, below) — never off a second
  // copy of the branch test, which could drift from the branch and leave the fact assigned to a line never drawn (the
  // insight-081 fork). Wherever the line did not carry it, its own note says it: never silence.
  if (report.workingYear.leftOverStale && leftOverStale === null) {
    throw new Error(
      'composeReentry: the report says the left over moved, but no left-over sentence was passed; the caller reads both off one draft',
    )
  }
  let leftOverHost: LeftOverHost | null = !report.workingYear.leftOverStale ? null : clauseHost !== undefined ? 'rulesLine' : 'typedBelowLine'
  let typedBelowCarried = false
  if (report.workingYear.costStale) {
    if (payCheckStale === null) {
      noteLines.push(copy.stalenessWorkingYearCost)
    } else {
      // The survivor part (the walk-8 form spec's U4) rides as the block's closing paragraph; the gate's door is its own
      // section under the buttons, so nothing follows it here.
      const parts: NoteParts = {
        opening: `${copy.stalenessPayCheckGateLead} ${payCheckStale.line.opening}`,
        segments: payCheckStale.line.segments,
        door: null,
        ...(payCheckStale.line.closing === undefined ? {} : { closing: payCheckStale.line.closing }),
      }
      noteLines.push({ text: notePartsText(parts), parts })
      if (payCheckStale.canChange) door = payCheckStale.door
    }
  } else if (typedBelow !== null) {
    // U11 walk 6's R1: a fresh TYPED W below today's quote, in W's place, with the update act's door. The caller builds
    // it only on a fresh W, so it never meets W's stale line; were both handed over, W's line would win, as it does on
    // the Result — the one standing slot there reads them in this order. As parts, the way W's line is pushed (the
    // whole-window rebuild's KTD6): a one-span line is a plain note, drawn as its old paragraph; two or more spans, a block.
    // It is offered the moved clause where no rules line hosts it (call (1a)), and its door names the fact exactly where
    // the line drawn carried it.
    const line = typedBelow.compose(leftOverHost === 'typedBelowLine')
    typedBelowCarried = leftOverHost === 'typedBelowLine' && line.carriedMoved
    noteLines.push({ text: notePartsText(line.parts), parts: line.parts })
    if (typedBelow.canChange) door = typedBelowCarried ? typedBelow.door.carryingMoved : typedBelow.door.plain
  }
  // The fallback (call (1a)): the fact was offered to the typed-below line, and that line was never drawn (W's stale line
  // drawn in its place, or none handed over) or was drawn without the clause, so the fact takes its own note.
  if (leftOverHost === 'typedBelowLine' && !typedBelowCarried) leftOverHost = 'ownNote'
  // Build 2's moved left over (R12): the household's own "saved" answer no longer matches today's
  // year-0 figure. An answer fact like the W line above, never a rules line (it rides `anyStale`
  // only). The report decides, never the caller: a sentence handed over with the fact unset renders
  // nothing (the exposure conjunct may have silenced it), and the fact set with no sentence threw
  // above. ONE CAUSE, ONE LINE (insight 101), its host decided once above: where a tax, state-tax or
  // working-years line fired, the two figures ride the first of them as a clause; where the
  // typed-below line carried them, they are said there; otherwise its own line. A hosted clause adds
  // no door sentence, because its host line names no door (the typed-below line's door names the
  // fact in its scope sentence instead).
  if (leftOverHost !== null && leftOverStale !== null) {
    const sentences = leftOverStale
    const place: Readonly<Record<LeftOverHost, () => void>> = {
      rulesLine: () => {
        // Unreachable without an index: `rulesLine` is chosen exactly where `pushHost` set one.
        if (clauseHost === undefined) throw new Error('composeReentry: the clause host is a fired rules line')
        const host = noteLines[clauseHost]
        // Unreachable: only `pushHost` sets the index, and it pushes the plain rules lines.
        if (typeof host !== 'string') throw new Error('composeReentry: the clause host is a plain rules line')
        noteLines[clauseHost] = `${host} ${sentences.clause}`
      },
      typedBelowLine: () => {},
      ownNote: () => {
        noteLines.push([copy.stalenessLeftOverNote, sentences.text, ...(sentences.canChange ? [copy.stalenessLeftOverGateDoor] : [])].join(' '))
      },
    }
    place[leftOverHost]()
  }
  // One line per boundary YEAR: the copy quotes only the calendar year, so two lines
  // sharing an endYear would render byte-identical sentences (and collide on the render
  // key) — the year carries the whole message once.
  const seenBoundaryYears = new Set<number>()
  for (const line of report.budget.expiredLines) {
    if (seenBoundaryYears.has(line.endCalendarYear)) continue
    seenBoundaryYears.add(line.endCalendarYear)
    noteLines.push(slots.stalenessBudgetLine(line.endCalendarYear))
  }

  // ── the wall-time line (suppressed, never fabricated) ────────────────────────────────
  // Round-half, floor-GATED (Caddie O6, 2026-07-10): a bare floor read a 700-day save as
  // "about a year ago" — systematic ROSIER-direction rounding on a staleness disclosure
  // (the one line whose whole job is "your save is older than you think"). Round-half keeps
  // "about" honest within ±half a year in BOTH directions; the <365-day gate is unchanged
  // (under a year stays suppressed — never fabricated up to "a year ago" by the rounding).
  const years =
    report.elapsed === null || report.elapsed.days < 365
      ? 0
      : Math.round(report.elapsed.days / 365)
  const elapsedLine = years >= 1 ? slots.reentryElapsedYears(years) : null

  return {
    introKey: allRetired ? 'reentryIntroRetired' : 'reentryIntro',
    balanceRows,
    benefitRows,
    noteLines,
    elapsedLine,
    leftOverClauseHost: clauseHost !== undefined,
    door,
  }
}
