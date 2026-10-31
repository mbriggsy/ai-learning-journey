/*
 * src/intake/AssumptionPanel.tsx — the U12 assumption panel (R7 every-assumption-visible +
 * R6 escape hatch; council wf_dff75c2f-9e3, supersession #6: EscapeHatch.tsx merged in — the
 * grouped jump-direct rows ARE the hatch).
 *
 * ONE portal sheet on the family scaffold (ControlSheet: focus trap, Escape, scroll lock,
 * callback-ref announcer, h2 focus-to-heading; shell geometry in sheetShell.css — content
 * styles ONLY in assumptions.css). Two grouped sections, the Healthcare sheet's ratified calm
 * format: "On your behalf" (methodology — the two editable knobs, the via-sheet levers, the
 * provenance-named disclosure rows) and "Your facts" (the required user-facts).
 *
 * PRESENTATIONAL over props (the BudgetBuilder/ControlSheet discipline): the live snapshot
 * arrives from Result; every committed edit calls OUT through the ONE `onCommitEdit` seam —
 * the caller owns the atomic `appModel.update` (mutate reads the store's CURRENT draft,
 * insight 036) and the route-aware recompute (spine → final-only; date → provisional-then-
 * final). Commit-on-blur via the intake field primitives, never per keystroke.
 *
 * VALIDATE-BEFORE-MUTATE (burned/021) on the true impossibilities: a person-fact or
 * survivor-ratio edit is checked against the intake sanity rules on the PATCHED draft and
 * REFUSED (FieldError, draft untouched) when a rule fires — `validateParams` alone would
 * accept a 1e12 survivor ratio. The spend row instead COMMITS and lets the honest machinery
 * answer: a cleared/zeroed spend is `missingRequiredFacts`' not-validly-present arm → the
 * store's `inputs-incomplete` demotion → the echo swaps to the calm incomplete line (the F9
 * doctrine; holding a confident verdict over a draft that no longer supports one is the sin).
 *
 * ONE EDITOR HOME PER FACT (insight 058): the sheet-owned facts (budget lines, sequencing,
 * the Roth plan, the subsidy regime) get VIA-SHEET rows — current value + a quiet edit that
 * closes this panel and opens THAT sheet; this panel never grows a duplicate editor, and the
 * governed spend row routes to the BudgetBuilder rather than becoming reconciliation writer
 * #9 beside `commitBudgetPatch`. OOP medical re-reconciles atomically under a governing
 * budget — the oopStep's exact pattern.
 *
 * ESCAPE CONTRACT (insight 067): an INVITED surface — Escape and the quiet Close both leave,
 * focus returns per the scaffold. Edits are already committed per-field (commit-on-blur), so
 * Close ≠ Cancel: there is NO discard semantics, and we do not fake an un-commit (the
 * BudgetBuilder inline variant's edits-survive precedent).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import type { MemoryModelSnapshot, ScenarioDraft, StickyDisplay } from '@store/memoryModel'
import { copy, slots, type CopyKey } from '@ui/copy'
import { rothPlanStartFor, type BandPlanClockAnchor } from '@ui/bandAnnotations'
import { composeVerdictReading, spendClauseFor } from '@ui/verdictSentence'
import {
  METHODOLOGY_DISCLOSURES,
  methodologyLines,
  type AssumptionSeat,
  type MethodologyArm,
  type MethodologyDisclosure,
} from '@ui/assumptionRegistry'
import { productionMarket } from '@engine/reference/methodology'
import { ordinaryBracketsMFJ } from '@engine/constants/tax'
import { solverAssumedHeirBracket } from '@engine/constants'
import { formatBracketPercent } from '@ui/money'
import { budgetGoverns } from '@budget/budgetModel'
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import { focusHeading, type Announcer } from './a11y'
import { ControlSheet } from './controlSheet'
import { CurrencyField, IntegerField, PercentField, SegmentedControl, formatMoney, formatPercent } from './fields'
import { blockedLeadFor, missingFactLines } from './AnswerStrip'
import { FieldError } from './FieldError'
import {
  validateField,
  personField,
  WORKING_COST_FIELD,
  WORKING_COST_PERIOD_FIELD,
  type SanityViolation,
} from './sanity'
import {
  anyPre65OrUnknown,
  carriesWorkingYearCost,
  healthcarePriced,
  isDateRoute,
  oopHelpKeyFor,
  spendHelpKeyFor,
  workingYearCostFigure,
  workingYearCostForRun,
  workingYearLedgerForRun,
  type MissingFact,
} from './intakeMap'
import { MedicareExtrasFork, OopExceedsSpendNote, StateResidencePicker, writeWorkingYearInvestment } from './questions'
import { WorkingCostQuestion, type WorkingCostWriteKind } from './WorkingCostQuestion'
import { useGestureHold } from './gestureHold'
import { WorkingYearLedgerPicture, WorkingYearLedgerUnknown } from './WorkingYearLedger'
import { workingYearCostStaleness, workingYearQuote, workingYearStateTaxReading } from './workingYearQuote'
import './assumptions.css'

/** The heir-bracket rungs — DERIVED from the shipped federal ordinary-bracket schedule, never
 *  re-typed (the one-canonical-table rule: a dated figure has exactly one home, and a hand-copied
 *  ladder would silently keep the old rates the day that table moves).
 *
 *  The RATES are what this vocabulary needs; the thresholds are irrelevant here, because the
 *  question is "which bracket will your heirs be in", not "what income puts them there". MFJ and
 *  Single carry the identical rate ladder — pinned in `assumptionPanel.test.tsx`, so if a future
 *  schedule ever splits them this fails loudly instead of quietly imposing one filing status's
 *  ladder on every household's heirs.
 *
 *  Module-level and computed ONCE: the array identity is stable across renders, so the radio group
 *  never re-mounts mid-edit. */
const HEIR_BRACKET_OPTIONS: readonly { readonly value: string; readonly label: string }[] =
  ordinaryBracketsMFJ.value.map((b) => ({
    value: String(b.rate),
    label: slots.assumptionHeirBracketOption(formatBracketPercent(b.rate)),
  }))

export interface AssumptionPanelProps {
  readonly open: boolean
  /** The LIVE model snapshot (Result re-renders this panel on every store notify) — the echo
   *  reads `snapshot.displayed` (the sticky triple), NEVER the raw result. */
  readonly snapshot: MemoryModelSnapshot
  /** The still-missing required facts (Result's memo) — the echo's incomplete arm names them. */
  readonly missing: readonly MissingFact[]
  /** U17 §S1 — Result's ONE plan-clock anchor (never a second clock read): the Roth row's echo
   *  names the conversion's CALENDAR year through `rothPlanStartFor`, so an aged vault's row
   *  can never misstate the start by the plan clock the way "in about N years" did. */
  readonly savedAnchor: BandPlanClockAnchor
  /** THE one commit seam: the caller applies `mutate` atomically (reading the store's CURRENT
   *  draft inside the update — insight 036) and runs the route-aware recompute. */
  readonly onCommitEdit: (mutate: (d: ScenarioDraft) => ScenarioDraft) => void
  // Via-sheet routing — each closes this panel and opens the fact's ONE editor home.
  readonly onOpenBudget: () => void
  readonly onOpenSequencing: () => void
  readonly onOpenRoth: () => void
  readonly onOpenHealth: () => void
  /** The guided re-walk (F4 — moved inside the panel) + the via-intake collection rows. */
  readonly onReview: () => void
  readonly onClose: () => void
  /** Where focus lands on close when the door that OPENED the panel has unmounted mid-open — the
   *  completed-intake dead-end repair (2026-09-03): supplying the missing fact from a panel row
   *  flips Result's `computing` for one beat, the actions row remounts, and the captured door
   *  is a disconnected element at close; without this, focus strands on <body>. */
  readonly restoreFallback?: () => HTMLElement | null
  /** The row to land on when the panel OPENS (the pay check's KTD21 door: the result's stale-W line
   *  opens the panel at the W row). After the sheet's own h2 focus, the row's name takes focus —
   *  which scrolls it into view. Typed to the one seat that has a door into it; a seat with no
   *  landing would be a prop that silently does nothing. */
  readonly initialSeat?: 'working-year-cost'
}

/** One panel row, stamped with its registry seat — the R7 completeness walk reads these. `rowRef` is for
 *  a row that must see presses inside it (the W row's gesture hold); the row's own box, never a wrapper,
 *  so the row's column rhythm is untouched. */
function Row({
  seat,
  rowRef,
  children,
}: {
  readonly seat: AssumptionSeat
  readonly rowRef?: Ref<HTMLLIElement>
  readonly children: ReactNode
}) {
  return (
    <li className="ap-row" data-assumption-seat={seat} ref={rowRef}>
      {children}
    </li>
  )
}

/** A methodology row's disclosure sentences. */
function MethodologyLines({ keys }: { readonly keys: readonly CopyKey[] }) {
  return (
    <>
      {keys.map((k) => (
        <p key={k} className="ap-row__prov">
          {copy[k]}
        </p>
      ))}
    </>
  )
}

/** Which arm the working-year row renders for a draft (the pay check's U9). The BUILT run decides
 *  (insight 132): `'priced'` — the run carries W — reads the pay check's arm, `'unpriced'` today's
 *  row (KTD22). Where no run can be built (`'unknown'`) there is no run to read, so it falls back to
 *  what the build WOULD carry: `buildDateInput` lands W exactly when a date-route draft holds an
 *  answer above $0 (`carriesWorkingYearCost`, the one carriage rule), so such a draft reads the pay
 *  check's arm and any other reads today's. */
export function methodologyArmFor(d: ScenarioDraft): MethodologyArm {
  const read = workingYearCostForRun(d)
  if (read === 'priced') return 'workingCost'
  if (read === 'unpriced') return 'default'
  return isDateRoute(d) && carriesWorkingYearCost(d) ? 'workingCost' : 'default'
}

/** A methodology row with a pay-check arm. Its own component so the engine read behind the arm
 *  (a candidate build) runs only while the panel is OPEN and is memoized on the draft — the panel's
 *  own body is evaluated on every store notify, open or closed. */
function ArmedMethodologyLines({ m, draft }: { readonly m: MethodologyDisclosure; readonly draft: ScenarioDraft }) {
  const arm = useMemo(() => methodologyArmFor(draft), [draft])
  return <MethodologyLines keys={methodologyLines(m, arm, workingYearStateTaxReading(draft))} />
}

/** The pay check's W row (`docs/plans/features/working-year-pay-check-build-spec.md` U8; KTD17,
 *  KTD21) — date route only, seated after the working-year investment rows: BELOW every row whose
 *  edit can stale W (spend, state, out-of-pocket medical), so a face swap here never shifts a field
 *  being edited above it. Its own component so the engine reads behind it (the stale predicate, the
 *  money picture's candidate build) run only while the panel is OPEN, memoized on the draft.
 *
 *  Four faces, chosen from the STORED answer before any producer call, each under a one-line value
 *  (Phase B ruling 12): ABSENT — the question alone; STALE — the question opening on its stale note
 *  (KTD21's face); ANSWERED — the money picture (h4 legends, under the panel's h3 sections), then
 *  the question to correct or re-confirm it; UNKNOWN — answered, but no picture can be drawn: the
 *  calm line, then the question. The question is the walk's own face (`WorkingCostQuestion`), so
 *  the two surfaces never disagree; here it never clears and never shows the walk's gate. During a
 *  gesture (a press in the row, or anywhere while focus is in it, until its click) the face and its
 *  value line are chosen from the draft the press found, not the stored one (`gestureHold.ts`). */
function WorkingCostRow({
  draft,
  aged,
  nameRef,
  announce,
  onWrite,
  onPeriodTap,
  onPeriodReset,
  onEditFigure,
  figureInvalid,
  figureErrors,
}: {
  readonly draft: ScenarioDraft
  readonly aged: boolean
  readonly nameRef: Ref<HTMLParagraphElement>
  readonly announce: (text: string) => void
  readonly onWrite: (write: (d: ScenarioDraft) => ScenarioDraft, kind: WorkingCostWriteKind) => boolean
  readonly onPeriodTap: () => void
  readonly onPeriodReset: () => void
  readonly onEditFigure: () => void
  readonly figureInvalid: boolean
  readonly figureErrors: ReactNode
}) {
  // ANNOUNCED ONCE, on the edge (KTD21): an edit in the open panel that stales W is named through
  // the sheet's own announcer — never `.ap-echo`, which re-speaks on every recompute. The previous
  // value starts at mount's, so opening onto an already-stale row, and the provisional and final
  // re-renders of one edit, stay silent. Focus and scroll never move. Read off the LIVE draft: it
  // names a change to the answer, which a held face (below) only draws later.
  const liveStale = useMemo(() => workingYearCostStaleness(draft) !== null, [draft])
  const wasStale = useRef(liveStale)
  useEffect(() => {
    if (!wasStale.current && liveStale) announce(copy.assumptionWorkingCostStaleAnnounce)
    wasStale.current = liveStale
  }, [liveStale, announce])
  // THE ROW ABOVE THE QUESTION IS DRAWN FROM THE DRAFT THE PRESS SAW (the h2 cure, `gestureHold.ts`):
  // the value line and the money picture sit above the question, and a press on its period control
  // blurs a typed figure whose commit mounts or re-sizes the picture — on a tall screen that moved the
  // control 842 px before the release, and the tap was lost. They stay as the press found them until the
  // click has landed. The WHOLE draft is held here (any field's commit under the press would re-size the
  // picture), which is safe only because nothing in it can be acted on: no control lives above the
  // question. The question itself gets the live draft (its note holds only W, for its door's sake).
  const rowRef = useRef<HTMLLIElement | null>(null)
  const shown = useGestureHold(rowRef, draft)
  const w = shown.workingYearCost
  const stale = useMemo(() => workingYearCostStaleness(shown) !== null, [shown])
  const ledger = useMemo(
    () => (w !== undefined && !stale ? workingYearLedgerForRun(shown) : null),
    [shown, w, stale],
  )
  const figure = w === undefined ? undefined : formatMoney(workingYearCostFigure(w))
  const value =
    w === undefined || figure === undefined
      ? copy.assumptionWorkingCostUnanswered
      : stale
        ? slots.assumptionWorkingCostStale(figure)
        : w.kind === 'confirmed'
          ? // Fresh, so the current quote IS the one confirmed: its source names where the figure came from.
            workingYearQuote(shown).source === 'budget'
            ? slots.assumptionWorkingCostConfirmedBudget(figure)
            : slots.assumptionWorkingCostConfirmed(figure)
          : slots.assumptionWorkingCostEntered(figure)
  return (
    <Row seat="working-year-cost" rowRef={rowRef}>
      <p className="ap-row__name" tabIndex={-1} ref={nameRef}>
        {copy.assumptionWorkingCostName}
      </p>
      <p className="ap-row__value">{value}</p>
      {ledger === 'unknown' && <WorkingYearLedgerUnknown draft={shown} echoStrip />}
      {ledger !== null && ledger !== 'unknown' && (
        <WorkingYearLedgerPicture ledger={ledger} draft={shown} headingLevel={4} aged={aged} />
      )}
      <WorkingCostQuestion
        draft={draft}
        host="panel"
        onWrite={onWrite}
        onPeriodTap={onPeriodTap}
        onPeriodReset={onPeriodReset}
        onEditFigure={onEditFigure}
        figureInvalid={figureInvalid}
        figureErrors={figureErrors}
      />
    </Row>
  )
}

/** A via-sheet row: name + current value (+ optional note) + the quiet edit affordance.
 *  `onEdit` undefined ⇒ the row is visible but not editable from here (the door's own
 *  categorical predicate fails — no hollow door in the panel either, council 2026-07-03). */
function ViaSheetRow({
  seat,
  nameKey,
  value,
  ctaKey,
  onEdit,
}: {
  readonly seat: AssumptionSeat
  readonly nameKey: CopyKey
  readonly value: string
  readonly ctaKey: CopyKey
  readonly onEdit: (() => void) | undefined
}) {
  return (
    <Row seat={seat}>
      <p className="ap-row__name">{copy[nameKey]}</p>
      <p className="ap-row__value">{value}</p>
      {onEdit !== undefined && (
        <button type="button" className="btn-quiet ap-row__edit" onClick={onEdit}>
          {copy[ctaKey]}
        </button>
      )}
    </Row>
  )
}

/** Format a fraction as a humane percent string WITH its glyph ("5%", "4.1%") for the market
 *  slots. Values read straight off `productionMarket.value` — never re-typed. */
const pct = (fraction: number): string => `${formatPercent(fraction)}%`

const POLICY_LABEL: Record<ScenarioDraft['drawdownPolicy'], CopyKey> = {
  proportional: 'leverPolicyProportional',
  'taxable-first': 'leverPolicyTaxableFirst',
  'pre-tax-first': 'leverPolicyPreTaxFirst',
  'bracket-fill': 'leverPolicyBracketFill',
  custom: 'leverPolicyCustom',
}

export function AssumptionPanel({
  open,
  snapshot,
  missing,
  savedAnchor,
  onCommitEdit,
  onOpenBudget,
  onOpenSequencing,
  onOpenRoth,
  onOpenHealth,
  onReview,
  onClose,
  restoreFallback,
  initialSeat,
}: AssumptionPanelProps) {
  const announcerRef = useRef<Announcer | null>(null)
  // The W row's name — the landing for `initialSeat` (reached by ref: the panel is portaled).
  const workingCostNameRef = useRef<HTMLParagraphElement | null>(null)
  // Stable, so the W row's announce effect never re-runs on a mere re-render.
  const announce = useCallback((text: string) => announcerRef.current?.announce(text), [])
  const { draft, answer, displayed, spend } = snapshot
  const governs = budgetGoverns(draft.budget)
  const dateRoute = isDateRoute(draft)
  // U17 §S1 — the Roth row's start in CALENDAR terms, derived ONCE through the shared producer
  // (never inline year arithmetic — the §S0 source-bind discipline).
  const rothStart =
    draft.rothConversion === undefined ? undefined : rothPlanStartFor(savedAnchor, draft.rothConversion.startYearOffset)

  // ── panel-session state ────────────────────────────────────────────────────────────────
  // Per-editor touched set (the BudgetBuilder pattern): errors show only for fields committed
  // in THIS panel session, forgiven on re-edit. `refused` holds the violations that BLOCKED a
  // commit (validate-before-mutate — the draft never held the impossible value, so the error
  // must render from here, not from the draft).
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const [refused, setRefused] = useState<ReadonlyMap<string, readonly SanityViolation[]>>(new Map())

  // The PANEL-OPEN BASELINE for the two-class transition line (R8): captured as derived
  // state on the open EDGE — render-phase adjustment, so the first open frame can never
  // compare against a stale prior-open baseline. Held for the whole open (an edit is judged
  // against what the user saw when they came in, not against the previous edit).
  // (The W figure's period is not captured here: the W question's face marks an entered W's unit
  // answered when it mounts, and drops the mark when that figure is gone — Phase B ruling 38.)
  const [openState, setOpenState] = useState<{ open: boolean; baseline: StickyDisplay | null }>({
    open: false,
    baseline: null,
  })
  if (open !== openState.open) {
    setOpenState({ open, baseline: open ? displayed : null })
    if (open) {
      setTouched(new Set())
      setRefused(new Map())
    }
  }
  const baseline = openState.baseline

  // ── the commit helpers ─────────────────────────────────────────────────────────────────
  const touch = (field: string) =>
    setTouched((prev) => {
      const next = new Set(prev)
      next.add(field)
      return next
    })
  const forgive = (field: string) => {
    setTouched((prev) => {
      const next = new Set(prev)
      next.delete(field)
      return next
    })
    setRefused((prev) => {
      if (!prev.has(field)) return prev
      const next = new Map(prev)
      next.delete(field)
      return next
    })
  }
  const refuse = (field: string, violations: readonly SanityViolation[]) => {
    setRefused((prev) => new Map(prev).set(field, violations))
    touch(field)
  }
  const clearRefusal = (field: string) =>
    setRefused((prev) => {
      if (!prev.has(field)) return prev
      const next = new Map(prev)
      next.delete(field)
      return next
    })

  // The panel's sanity provenance (U12 ultramode, the IntakeApp asymmetry): this surface only
  // ever renders POST-completion (Result mounts it), and completing intake IS the receipt that
  // the spend period was explicitly answered — the same downstream proof IntakeApp's
  // periodAnswerProven rests on. Without it, editing the spend AMOUNT here re-fired the
  // '$/month or $/year?' force-confirm on a household that already answered it (the panel's
  // `touched` starts empty every open).
  //
  // ⚠️ CORRECTED 2026-08-03 — this used to end "…the panel's own period toggle RE-LABELS, never
  // re-bases, so the 12× misentry the rule guards is structurally impossible on this surface."
  // THAT WAS FALSE, and it was the load-bearing half of the justification. The toggle does only
  // re-label (it writes `spendEntryPeriod` alone), but the spend commit below (:607-617, the
  // `entered * 12` arm at :614) multiplies by 12 under 'month' — so a 12× misentry is entirely
  // possible here, and the re-label is what INVITES it: `spendDisplayed` (:344-349) jumps 12× on a
  // flip, and the reader's natural repair is to retype the digits they remember under the new
  // unit. `assumptionPeriodHelp` was rewritten the same day to name both halves, and pinned.
  //
  // The disarm still HOLDS, but on the first clause alone (completing intake IS the receipt that
  // the period was answered). Re-arming would not have caught the case above anyway: the rule
  // needs `entered >= SPEND_AMBIGUOUS_MIN` (sanity.ts:89, 8,000), and the misentry that matters is
  // a household typing a MONTHLY figure under 'year' — below that floor by construction. The
  // defense here is the copy, not the rule.
  const PANEL_PROVENANCE = { periodConfirmed: true } as const

  // THE W ROW'S LANDING (KTD21's door). The sheet's own open effect focuses its h2 first — a child's
  // effects run before its parent's in one commit — so this lands after it, on the W row's name, and
  // the browser scrolls the name into view (`focusHeading` never prevents the scroll).
  useEffect(() => {
    if (open && initialSeat === 'working-year-cost') focusHeading(workingCostNameRef.current)
  }, [open, initialSeat])

  /** Validate the PATCHED draft for `field`; a firing rule REFUSES the commit (true
   *  impossibilities never reach the draft — burned/021); clean commits through the seam. `true`
   *  when it landed. `alsoTouched` counts a path the SAME gesture just touched, which this render's
   *  `touched` cannot hold yet (the W period tap that answers the prompt it refused on). */
  const commitRefusing = (
    field: string,
    mutate: (d: ScenarioDraft) => ScenarioDraft,
    alsoTouched: readonly string[] = [],
  ): boolean => {
    const asTouched = alsoTouched.length === 0 ? touched : new Set([...touched, ...alsoTouched])
    const violations = validateField(mutate(draft), field, asTouched, PANEL_PROVENANCE)
    if (violations.length > 0) {
      refuse(field, violations)
      return false
    }
    clearRefusal(field)
    touch(field)
    onCommitEdit(mutate)
    return true
  }

  /** Commit WITHOUT refusing (the spend row's channel-checked path): the committed draft's
   *  own machinery answers — the spend-zero/period rules render from `validateField` on the
   *  new draft, and a not-validly-present spend demotes to `inputs-incomplete` (F9). */
  const commitOpen = (field: string, mutate: (d: ScenarioDraft) => ScenarioDraft) => {
    clearRefusal(field)
    touch(field)
    onCommitEdit(mutate)
  }

  const errorsFor = (field: string): readonly SanityViolation[] => {
    const blocked = refused.get(field)
    if (blocked !== undefined) return blocked
    if (!touched.has(field)) return []
    return validateField(draft, field, touched, PANEL_PROVENANCE)
  }
  const renderErrors = (field: string): ReactNode =>
    errorsFor(field).map((v) => <FieldError key={v.rule} {...v} />)

  const writePerson = (
    d: ScenarioDraft,
    i: 0 | 1,
    patch: Partial<ScenarioDraft['people'][number]>,
  ): ScenarioDraft => {
    const people: [ScenarioDraft['people'][number], ScenarioDraft['people'][number]] = [
      { ...d.people[0] },
      { ...d.people[1] },
    ]
    people[i] = { ...people[i], ...patch }
    return { ...d, people }
  }

  // ── the echo (the live answer readout + the two-class transition line) ────────────────
  // Reads `displayed` — the STICKY triple — never the raw result (the sentence the user saw
  // is the sentence the echo continues; the band and drill-downs read raw elsewhere). The
  // word/count/clause come from the ONE shared composer (verdictSentence.ts) — the hero
  // renders the same seam, so echo and hero can never diverge (U12 ultramode: the hand-rolled
  // copy here had already diverged on the over-funded ceiling reading).
  // Worse = xOfTen strictly below the panel-open baseline, compared NUMERICALLY (lower =
  // worse; band ORDER is never re-derived UI-side). Improved or unchanged ⇒ nothing (calm).
  // The spend lane rides through the SAME gate as the hero (shown ≡ raw state), so echo and hero
  // quote the same figure or none — never one sized and the other not.
  const rawState = answer.kind === 'headline' ? answer.result.headline.outcomeState : null
  const echoVerdict =
    displayed !== null
      ? composeVerdictReading(displayed, rawState === null ? undefined : spendClauseFor(spend, displayed, rawState))
      : null
  const worsened = displayed !== null && baseline !== null && displayed.xOfTen < baseline.xOfTen
  // THE INCOMPLETE ECHO READS THE KIND OF EACH FACT, exactly as the strip does (2026-09-03, the
  // dead-end fix's review): `missingRequiredFacts` emits ABSENT facts (the reader's to enter) and
  // UNREPRESENTABLE ones (answered, and v1 cannot carry the answer — nothing typed will ever clear
  // them). This panel used to file both under "Still needed" — the exact calm-but-wrong frame
  // copy.ts legislates against by name — and the frame was unreachable here until the dead-end
  // door landed; `?seed=datesolo` and the two-HSA household now open onto it. The lead is the
  // strip's own (`blockedLeadFor`: keep-going only while something is left to enter), each kind
  // gets its own line only when its bucket is non-empty, and both lines come through the ONE shared
  // composer (`missingFactLines`, which the money picture's unknown face reads too) so no surface can
  // disagree on a lead, a separator or what "N more" hides.
  const missingEcho = { lead: blockedLeadFor(missing), ...missingFactLines(missing) }

  const total = draft.enteredAccounts.reduce((s, a) => s + (a.valueToday || 0), 0)
  const showHealthQuote = anyPre65OrUnknown(draft)
  const spendDisplayed =
    draft.annualSpendingReal === undefined
      ? undefined
      : draft.spendEntryPeriod === 'month'
        ? draft.annualSpendingReal / 12
        : draft.annualSpendingReal

  return (
    <ControlSheet
      open={open}
      title={copy.assumptionTitle}
      onClose={onClose}
      announcerRef={announcerRef}
      restoreFallback={restoreFallback}
    >
      <p className="control-sheet__intro">{copy.assumptionIntro}</p>

      {/* The live answer echo — a RESERVED box (insight 035: meant to fit its tallest arm, but
          the spend lane's sized clause still outgrows it — OPEN, see assumptions.css). The panel
          is aria-modal (the hero behind it is out of the AT tree), so this region is the AT
          user's answer feedback: role=status announces the moved reading, atomically. */}
      <div className="ap-echo" role="status" aria-atomic="true">
        {displayed !== null && echoVerdict !== null ? (
          <>
            <p className="ap-echo__lead">{`${echoVerdict.word} — ${echoVerdict.reading}`}</p>
            <p className="ap-echo__dollar">{echoVerdict.clause}</p>
            {/* The truer-picture line: WORDS beside the already-moved numbers (never a
                hue-only change — the reader is color blind); catastrophe-gated by name. */}
            {worsened && <p className="ap-echo__shift">{copy.assumptionTruerPicture}</p>}
          </>
        ) : answer.kind === 'pending' ? (
          // The crunch, seen from inside the modal (reachable since the dead-end repair — the panel
          // stays open while the first compute runs): the strip's own working line, never the quiet
          // "edits flow into your answer" over an answer that is not there yet.
          <p className="ap-echo__lead ap-echo__lead--muted">{copy.answerPending}</p>
        ) : answer.kind === 'inputs-incomplete' || (answer.kind === 'idle' && missing.length > 0) ? (
          // The incomplete arm covers BOTH incomplete homes: the post-first-resolve demotion and the
          // pre-first-resolve idle dead end (2026-09-03) — the panel is the AT user's only readout here.
          <>
            <p className="ap-echo__lead ap-echo__lead--muted">{missingEcho.lead}</p>
            {missingEcho.stillNeeded !== null && <p className="ap-echo__dollar">{missingEcho.stillNeeded}</p>}
            {missingEcho.cannotPrice !== null && (
              <>
                <p className="ap-echo__dollar">{missingEcho.cannotPrice}</p>
                <p className="ap-echo__lead ap-echo__lead--muted">{copy.answerCannotPriceTail}</p>
              </>
            )}
          </>
        ) : (
          <p className="ap-echo__lead ap-echo__lead--muted">{copy.assumptionEchoQuiet}</p>
        )}
      </div>

      {/* ── section a: ON YOUR BEHALF (methodology) — editable knobs first, then the levers'
          via-sheet rows, then the provenance-named disclosure rows (descending agency). ── */}
      <section className="ap-section" aria-labelledby="ap-methodology">
        <h3 className="ap-section__title" id="ap-methodology">
          {copy.assumptionSectionMethodology}
        </h3>
        <ul className="ap-rows">
          <Row seat="survivor-ratio">
            <PercentField
              labelKey="assumptionSurvivorRatioLabel"
              helpKey="assumptionSurvivorRatioHelp"
              field="survivorSpendingRatio"
              value={draft.survivorSpendingRatio}
              invalid={errorsFor('survivorSpendingRatio').length > 0}
              onEdit={() => forgive('survivorSpendingRatio')}
              onCommit={(v) => {
                // The knob is REQUIRED methodology (never absent in the draft): a cleared
                // field refuses with its own calm line; >1 refuses via the intake sanity rule
                // (validateParams alone allows 1e12 — the council's exact condition).
                if (v === undefined) {
                  refuse('survivorSpendingRatio', [
                    {
                      rule: 'survivor-ratio-blank',
                      field: 'survivorSpendingRatio',
                      messageKey: 'errSurvivorRatioBlank',
                    },
                  ])
                  return
                }
                commitRefusing('survivorSpendingRatio', (d) => ({ ...d, survivorSpendingRatio: v }))
              }}
            />
            {renderErrors('survivorSpendingRatio')}
          </Row>

          {/* The assumed heir bracket — leave-more ONLY. Under pay-less-tax the objective never reads
              it, so a row there would be a hollow door: a knob whose every setting changes nothing.
              (`chosenGoal` is set at the GoalPicker on the second beat, so this row is simply absent
              during first-pass intake — correct, not a gap.)

              A CLOSED VOCABULARY, NOT A PercentField, and that is a correctness choice rather than a
              style one: `afterTaxBequestPerPath` THROWS outside [0, 1), and survivor-ratio needs a
              whole intake sanity rule + a blank-refusal path precisely because a free field can
              express 24 (the percent) or 1 (the throw). A radio over the statutory ladder cannot
              reach either, so `sanity.ts` stays untouched and there is no blank state to refuse.

              THE LADDER IS DERIVED, NEVER RE-TYPED (the one-canonical-table rule): it is the shipped
              federal ordinary-bracket schedule. MFJ and Single carry the SAME rate ladder and differ
              only in thresholds, so the rate vocabulary is filing-agnostic — pinned in the panel
              test so a future divergence fails loudly instead of silently picking one household's
              schedule for everyone's heirs. */}
          {draft.chosenGoal === 'leave-more' && (
            <Row seat="heir-bracket">
              {/* HORIZONTAL, deliberately — `vertical` is for long labels that cram in equal-width
                  segments (the state picker's "Somewhere else — not priced yet"). These rungs are
                  three characters, so stacking them burned ~340px of a scrolling panel for no gain,
                  and a left-to-right track also reads as the ORDERED scale it is. */}
              <SegmentedControl<string>
                legendKey="assumptionHeirBracketLabel"
                name="assumption-heir-bracket"
                value={String(draft.heirBracket ?? solverAssumedHeirBracket.value)}
                options={HEIR_BRACKET_OPTIONS}
                onChange={(v) => {
                  // The value is one of OUR OWN rungs, re-parsed from the radio's string — never a
                  // typed figure, so it cannot arrive out of range. Committed through the same
                  // refusing seam as every other row so the panel's touched/forgive bookkeeping and
                  // the staleness demotion (the fingerprint carries heirBracket) both fire normally.
                  commitRefusing('heirBracket', (d) => ({ ...d, heirBracket: Number(v) }))
                }}
              />
              <p className="field-help">{copy.assumptionHeirBracketHelp}</p>
            </Row>
          )}

          {/* The entry period — RE-LABELS the committed figure, never re-bases it (the intake
              segment re-bases mid-entry where the typed digits are the truth; here the
              canonical annual is the truth and a silent 12× re-base would be the cardinal
              sin). Hidden while a budget governs: the period is inert there. */}
          {!governs && (
            <Row seat="spend-period">
              <SegmentedControl<'month' | 'year'>
                legendKey="assumptionPeriodLegend"
                name="assumption-spend-period"
                options={[
                  { value: 'month', labelKey: 'periodMonth' },
                  { value: 'year', labelKey: 'periodYear' },
                ]}
                value={draft.spendEntryPeriod}
                onChange={(next) =>
                  commitOpen('spendEntryPeriod', (d) => ({ ...d, spendEntryPeriod: next }))
                }
              />
              <p className="field-help">{copy.assumptionPeriodHelp}</p>
            </Row>
          )}

          {/* Via-sheet rows — one editor home per fact (insight 058). Edit affordances gate
              on the SAME categorical predicates as the Result doors (no hollow door). */}
          <ViaSheetRow
            seat="drawdown"
            nameKey="assumptionDrawdownName"
            value={copy[POLICY_LABEL[draft.drawdownPolicy]]}
            ctaKey={draft.drawdownPolicy === 'proportional' ? 'leverSequencingCta' : 'leverSequencingEditCta'}
            onEdit={draft.enteredAccounts.length > 0 ? onOpenSequencing : undefined}
          />
          <ViaSheetRow
            seat="roth-conversion"
            nameKey="assumptionRothName"
            value={
              draft.rothConversion === undefined || rothStart === undefined
                ? copy.assumptionNoneApplied
                : slots.rothPlanEcho(
                    formatMoney(draft.rothConversion.annualAmountReal),
                    // The calendar year is wall-time-stable; `passed` picks the "started in"
                    // tense for an applied conversion already under way on an aged vault.
                    rothStart.year,
                    rothStart.passed,
                    draft.rothConversion.years,
                  )
            }
            ctaKey={draft.rothConversion === undefined ? 'leverRothDoorCta' : 'leverRothDoorEditCta'}
            onEdit={draft.filing === 'mfj' ? onOpenRoth : undefined}
          />
          <ViaSheetRow
            seat="subsidy-regime"
            nameKey="assumptionRegimeName"
            value={
              draft.enhancedSubsidies === true ? copy.leverHealthRegimeEnhanced : copy.leverHealthRegimeReverted
            }
            ctaKey={draft.enhancedSubsidies === true ? 'leverHealthDoorEditCta' : 'leverHealthDoorCta'}
            onEdit={healthcarePriced(draft) ? onOpenHealth : undefined}
          />

          {/* The non-parameter methodology DISCLOSURE rows (council supersession #1: visible,
              provenance-named, honestly non-editable — fabricated knobs were rejected).
              Rendered FROM the registry so the row set and the R7 pin share one source. */}
          {METHODOLOGY_DISCLOSURES.map((m) => (
            <Row key={m.id} seat={m.seat}>
              <p className="ap-row__name">{copy[m.nameKey]}</p>
              {m.id === 'market' && (
                <>
                  {/* Live figures read from productionMarket.value — NEVER re-typed. */}
                  <p className="ap-row__value">
                    {slots.assumptionMarketStocks(
                      pct(productionMarket.value.stock.mean),
                      pct(productionMarket.value.stock.stdDev),
                    )}
                  </p>
                  <p className="ap-row__value">
                    {slots.assumptionMarketBonds(
                      pct(productionMarket.value.bond.mean),
                      pct(productionMarket.value.bond.stdDev),
                    )}
                  </p>
                  <p className="ap-row__value">
                    {slots.assumptionMarketInflation(pct(productionMarket.value.inflation.mean))}
                  </p>
                </>
              )}
              {m.workingCostLineKeys === undefined ? (
                <MethodologyLines keys={m.lineKeys} />
              ) : (
                <ArmedMethodologyLines m={m} draft={draft} />
              )}
              {/* The STANDING market-floor line (F8) — static, always present under the
                  market block; a pure statement, never a stop-refining directive. */}
              {m.id === 'market' && <p className="ap-row__prov">{copy.assumptionMarketFloorNote}</p>}
            </Row>
          ))}
        </ul>
      </section>

      {/* ── section b: YOUR FACTS ───────────────────────────────────────────────────────── */}
      <section className="ap-section" aria-labelledby="ap-facts">
        <h3 className="ap-section__title" id="ap-facts">
          {copy.assumptionSectionFacts}
        </h3>
        <ul className="ap-rows">
          {/* The spend row. GOVERNED: read-only reconciled total + the route to the budget
              sheet — this panel must NEVER become reconciliation writer #9 bypassing
              commitBudgetPatch (insight 058). UNGOVERNED: the inline field, committing the
              canonical ANNUAL; the spend-zero + period rules render from the committed draft,
              and a cleared/zeroed value rides the F9 inputs-incomplete demotion (honest,
              never blocked — the echo above swaps to the incomplete line). */}
          <Row seat="spend">
            {governs ? (
              <>
                <p className="ap-row__name">{copy.spendLabel}</p>
                {draft.annualSpendingReal !== undefined && (
                  <p className="ap-row__value">{slots.spendBudgetTotal(formatMoney(draft.annualSpendingReal))}</p>
                )}
                <p className="ap-row__prov">{copy.spendBudgetGovernedNote}</p>
                <button type="button" className="btn-quiet ap-row__edit" onClick={onOpenBudget}>
                  {copy.budgetEditCta}
                </button>
              </>
            ) : (
              <>
                <CurrencyField
                  labelKey="spendLabel"
                  // S5.1 — state-aware on the DRAFT answer via the ONE shared home with the intake's
                  // SpendRawFace (spendHelpKeyFor, intakeMap): the panel edits the SAME draft the
                  // intake wrote, so the two input surfaces agree BY CONSTRUCTION — the duplicated
                  // ternary here had already drifted once (the false "isn't priced yet" on a priced
                  // household, the federal double-count class; the review's fold made it structural).
                  helpKey={spendHelpKeyFor(draft)}
                  field="annualSpendingReal"
                  value={spendDisplayed}
                  invalid={errorsFor('annualSpendingReal').length > 0}
                  onEdit={() => forgive('annualSpendingReal')}
                  onCommit={(entered) =>
                    commitOpen('annualSpendingReal', (d) => ({
                      ...d,
                      annualSpendingReal:
                        entered === undefined
                          ? undefined
                          : d.spendEntryPeriod === 'month'
                            ? entered * 12
                            : entered,
                    }))
                  }
                />
                {renderErrors('annualSpendingReal')}
              </>
            )}
          </Row>

          {/* Your retirement state (the state-tax unit S3) — a household fact like spend. The shared
              StateResidencePicker IS the edit affordance: the active segment shows the current
              answer (a state name, or the honest 'not priced yet'), and re-picking re-runs (the
              SC-vs-GA what-if lever). commitOpen never refuses — any roster value is legal. An
              UNANSWERED household shows no active segment + the honest not-set note, never a
              fabricated default. */}
          <Row seat="retirement-state">
            <StateResidencePicker
              value={draft.retirementState}
              onChange={(v) => commitOpen('retirementState', (d) => ({ ...d, retirementState: v }))}
            />
            {draft.retirementState === undefined && (
              /* The governed face reads the BUDGET twin (the O16 pre-walk chair fix): the base
                 note's "kept it inside your spending figure" conditional sat under the spend
                 row's "all in — set by your budget" completeness claim, priming the rosier
                 self-grade; the twin names the budget-line mechanism instead. */
              <p className="ap-row__prov">
                {governs ? copy.assumptionStateUnsetNoteBudget : copy.assumptionStateUnsetNote}
              </p>
            )}
          </Row>

          {/* Per-person facts. A WORKING member has no stop-age row (the date IS the answer —
              never asked); birth years REFUSE a blank commit (clearing one would rip
              currentAge out from under every derived gate — R19 inline error instead). */}
          {([0, 1] as const).map((i) => {
            const p = draft.people[i]
            const birthField = personField(i, 'birthYear')
            const stopField = personField(i, 'retirementAge')
            const piaField = personField(i, 'pia')
            const claimField = personField(i, 'socialSecurityClaimAge')
            return (
              <li className="ap-person" key={i}>
                <p className="ap-person__name">{p.name ?? (i === 0 ? copy.personYou : copy.personSpouse)}</p>
                <ul className="ap-rows">
                  <Row seat="person-birth">
                    <IntegerField
                      labelKey="birthYearLabel"
                      placeholderKey="birthYearPlaceholder"
                      field={birthField}
                      value={p.birthYear}
                      invalid={errorsFor(birthField).length > 0}
                      onEdit={() => forgive(birthField)}
                      onCommit={(birthYear) => {
                        if (birthYear === undefined || Number.isNaN(birthYear)) {
                          refuse(birthField, [
                            { rule: 'birth-year-blank', field: birthField, messageKey: 'errBirthYearBlank' },
                          ])
                          return
                        }
                        // currentAge re-derives WITH the birth year (the intake's one
                        // derivation site, mirrored — a birthYear moving without its
                        // currentAge would silently skew every age-keyed gate).
                        commitRefusing(birthField, (d) =>
                          writePerson(d, i, {
                            birthYear,
                            currentAge: d.startCalendarYear - birthYear,
                          }),
                        )
                      }}
                    />
                    {renderErrors(birthField)}
                  </Row>
                  {p.workStatus === 'retired' && (
                    <Row seat="person-stop">
                      <IntegerField
                        labelKey="stopAgeLabel"
                        helpKey="stopAgeHelp"
                        field={stopField}
                        value={p.retirementAge}
                        invalid={errorsFor(stopField).length > 0}
                        onEdit={() => forgive(stopField)}
                        onCommit={(age) =>
                          commitRefusing(stopField, (d) => writePerson(d, i, { retirementAge: age }))
                        }
                      />
                      {renderErrors(stopField)}
                    </Row>
                  )}
                  <Row seat="person-ss-amount">
                    <CurrencyField
                      labelKey="ssAmountLabel"
                      helpKey="ssAmountHelp"
                      field={piaField}
                      value={p.pia === undefined ? undefined : p.pia / 12}
                      invalid={errorsFor(piaField).length > 0}
                      onEdit={() => forgive(piaField)}
                      onCommit={(monthly) =>
                        // The statement figure is MONTHLY; the model stores ANNUAL (×12 —
                        // the intake convention; the PIA ceiling rule reads the annual).
                        commitRefusing(piaField, (d) =>
                          writePerson(d, i, { pia: monthly === undefined ? undefined : monthly * 12 }),
                        )
                      }
                    />
                    {renderErrors(piaField)}
                  </Row>
                  <Row seat="person-ss-claim">
                    <IntegerField
                      labelKey="assumptionSsClaimAgeLabel"
                      field={claimField}
                      value={p.socialSecurityClaimAge}
                      invalid={errorsFor(claimField).length > 0}
                      onEdit={() => forgive(claimField)}
                      onCommit={(age) =>
                        commitRefusing(claimField, (d) => writePerson(d, i, { socialSecurityClaimAge: age }))
                      }
                    />
                    {renderErrors(claimField)}
                  </Row>
                </ul>
              </li>
            )
          })}

          {/* OOP medical — the oopStep's EXACT atomic pattern: under a governing budget the
              reconciled scalar re-derives INSIDE the same mutate (insight 058 — the invariant
              annualSpendingReal == Σactive@0 + M never observably breaks); with no budget, a
              plain health write. */}
          <Row seat="health-oop">
            <CurrencyField
              labelKey="oopLabel"
              helpKey={oopHelpKeyFor(draft)}
              field="health.oopMedicalAnnual"
              value={draft.health.oopMedicalAnnual}
              invalid={false}
              onCommit={(v) =>
                commitOpen('health.oopMedicalAnnual', (d) => {
                  const health = { ...d.health, oopMedicalAnnual: v }
                  return budgetGoverns(d.budget)
                    ? { ...d, health, annualSpendingReal: budgetYearZeroFullTotal(d.budget, v) }
                    : { ...d, health }
                })
              }
            />
            {/* The budgetless M > S note — the oopStep's same face (council 2026-10-08, B2). */}
            <OopExceedsSpendNote draft={draft} />
          </Row>

          {/* The ACA quote pair — pre-65 AND not-yet-known-age households: the SAME predicate
              missingRequiredFacts gates on (intakeMap.anyPre65OrUnknown), so the panel can never
              name this pair as missing while hiding its editor. This is the HOMING domain, NOT
              the priced one — healthcarePriced is known-ages-only and must not be used here. */}
          {showHealthQuote && (
            <Row seat="health-quote">
              <CurrencyField
                labelKey="enrolledPremiumLabel"
                helpKey="healthQuoteHelp"
                field="health.enrolledPremiumMonthlyToday"
                value={draft.health.enrolledPremiumMonthlyToday}
                onCommit={(v) =>
                  commitOpen('health.enrolledPremiumMonthlyToday', (d) => ({
                    ...d,
                    health: { ...d.health, enrolledPremiumMonthlyToday: v },
                  }))
                }
              />
              <CurrencyField
                labelKey="slcspLabel"
                helpKey="slcspHelp"
                field="health.slcspMonthlyToday"
                value={draft.health.slcspMonthlyToday}
                onCommit={(v) =>
                  commitOpen('health.slcspMonthlyToday', (d) => ({
                    ...d,
                    health: { ...d.health, slcspMonthlyToday: v },
                  }))
                }
              />
            </Row>
          )}

          {/* Working-year investment income — date route, per working member; the ONE write
              shape (writeWorkingYearInvestment) keeps retired slots force-zeroed. */}
          {dateRoute &&
            ([0, 1] as const)
              .filter((i) => draft.people[i].workStatus === 'working')
              .map((i) => (
                <Row seat="work-investment" key={`wi-${i}`}>
                  <CurrencyField
                    labelKey="workInvestmentLabel"
                    helpKey="workInvestmentHelp"
                    field={`health.workingYearInvestmentByPerson.${i}`}
                    value={draft.health.workingYearInvestmentByPerson?.[i]}
                    onCommit={(v) =>
                      commitOpen(`health.workingYearInvestmentByPerson.${i}`, (d) =>
                        writeWorkingYearInvestment(d, i, v),
                      )
                    }
                  />
                </Row>
              ))}

          {/* The pay check's W — what a year costs while either of you still works (U8). Date route
              only, BELOW every row whose edit can stale it. Commits on the figure's own path through
              `commitRefusing` (the zero and period rules refuse before the draft holds it); a unit
              re-base after an explicit tap commits open. Never on `.answer`: the walk's gate never
              reaches the panel (KTD3). */}
          {dateRoute && (
            <WorkingCostRow
              draft={draft}
              aged={savedAnchor.yearsSincePlanBuilt > 0}
              nameRef={workingCostNameRef}
              announce={announce}
              onWrite={(write, kind) => {
                if (kind === 'period') {
                  commitOpen(WORKING_COST_FIELD, write)
                  return true
                }
                return commitRefusing(WORKING_COST_FIELD, write, kind === 'tapped-answer' ? [WORKING_COST_PERIOD_FIELD] : [])
              }}
              onPeriodTap={() => touch(WORKING_COST_PERIOD_FIELD)}
              onPeriodReset={() => forgive(WORKING_COST_PERIOD_FIELD)}
              onEditFigure={() => forgive(WORKING_COST_FIELD)}
              figureInvalid={errorsFor(WORKING_COST_FIELD).length > 0}
              figureErrors={renderErrors(WORKING_COST_FIELD)}
            />
          )}

          {/* The Medicare-extras payment fork (the ask-for-Medicare-extras unit) — the
              standing refine seat AND the details home for the funded typical (corpus rule
              38): per person, the ONE fork face over the ONE write shape. UNCONDITIONAL:
              every route prices Medicare's 65+ years, and the unanswered fork IS the
              on-typical state this row exists to let the household refine. */}
          <Row seat="medicare-extras">
            <p className="ap-row__name">{copy.assumptionMedicareExtrasName}</p>
            {([0, 1] as const).map((i) => (
              <div key={`mx-${i}`}>
                <p className="ap-row__prov">
                  {draft.people[i].name ?? (i === 0 ? copy.personYou : copy.personSpouse)}
                </p>
                <MedicareExtrasFork
                  draft={draft}
                  i={i}
                  onWrite={(field, write) => commitOpen(field, write)}
                  errors={renderErrors(`medicareExtrasByPerson.${i}.monthly`)}
                  standingNote
                />
              </div>
            ))}
          </Row>

          {/* The complex collections — via-intake (accounts carry per-account facts a flat
              row can't honestly edit; the walk-through is their one editor home). */}
          <Row seat="collections">
            <p className="ap-row__name">{copy.assumptionCollectionsName}</p>
            {total > 0 && <p className="ap-row__value">{slots.accountsTotal(formatMoney(total))}</p>}
            <p className="ap-row__prov">{copy.assumptionCollectionsValue}</p>
            <button type="button" className="btn-quiet ap-row__edit" onClick={onReview}>
              {copy.assumptionViaIntakeCta}
            </button>
          </Row>
        </ul>
      </section>

      {/* The guided re-walk (F4) + the quiet Close. Close ≠ Cancel: every edit is already
          committed per-field, so there is NO discard semantics here — leaving keeps exactly
          what the fields already committed (insight 067; the BudgetBuilder inline variant's
          edits-survive precedent — we never fake an un-commit). */}
      <div className="ap-footer">
        <button type="button" className="btn-quiet" onClick={onReview}>
          {copy.assumptionRewalkCta}
        </button>
        <button type="button" className="btn-quiet" onClick={onClose}>
          {copy.leverCancel}
        </button>
      </div>
    </ControlSheet>
  )
}
