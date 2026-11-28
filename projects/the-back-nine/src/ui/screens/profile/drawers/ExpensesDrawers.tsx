/**
 * src/ui/screens/profile/drawers/ExpensesDrawers.tsx: Expenses' Living expenses and Out-of-pocket medical drawers (Act 6 ·
 * RC13b; ref 2.4; `rc-shell/form-retexp-02.png`, RightCapital's Retirement Expense drawer with its "Expense approach"). The
 * fields, words and writes are the walk's (the spend step's two faces and budget builder, the out-of-pocket step;
 * `expensesFields.ts`); the frame is `ProfileDrawer.tsx`. Every field the engine reads, and no other (D7).
 *
 * LIVING EXPENSES: "How you give your spending" picks one figure (with its unit: a monthly figure read as yearly is the
 * 12x misentry) or a budget line by line (the worksheet: category, name, dollars a year, essential or extra, from and
 * through which year; add and remove rows). Gap 4's U8 gives each line how often it repeats (its years read back) and how
 * its cost changes: with prices, the same dollar amount, or up by a percent the household types (a blank or out-of-range
 * box holds the Save with words, never saved as "with prices"), with a later year's cost read back in today's dollars and,
 * on the date route, a note under a fixed line whose last year moves with each stop tested. The switch back to one figure
 * says the first year's figure becomes every year's. The reconciliation readout sits BELOW the lines and the Add button, so a
 * figure committed on blur never moves a control above the one being pressed (insight 035); its box is the walk's.
 * The survivor's share closes the drawer. Removing a line a kept what-if names leaves that what-if refusing by name
 * (`applyBundle`'s `line-gone`, never re-aimed at another line, R21).
 *
 * OUT-OF-POCKET MEDICAL: the walk's own help, which carries the copy law (these costs already sit inside the spending
 * figure, and the figure's two jobs: the HSA's tax-free draw, and kept whole if one of you is on your own later).
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BUDGET_CATEGORIES, type BudgetCategory, type BudgetLineItem, type SpendEntryPeriod } from '@shared/model'
import { freshStableId, idsInUse } from '@shared/stableIds'
import { validateBudgetItems, budgetGoverns, type BudgetItemError } from '@budget/budgetModel'
import {
  BUDGET_ERROR_COPY,
  budgetReadout,
  freshLine,
  lineChangeOf,
  lineErrorSlot,
  rateReadBack,
  repeatReadBack,
  withLineChange,
  type LineChange,
  type LineErrorSlot,
} from '@intake/budgetForm'
import { CATEGORY_LABEL_KEYS, lineDisplayName } from '@intake/budgetLines'
import { isDateRoute, oopHelpKeyFor, spendHelpKeyFor } from '@intake/intakeMap'
import { periodGateTrips } from '@intake/sanity'
import { formatMoney } from '@intake/moneyFormat'
import { oopExceedsBudgetlessSpend } from '@intake/steps'
import { OOP_MEDICAL_TYPICAL_HOUSEHOLD } from '@intake/referenceData'
import { Button, ChoiceGroup, DrawerFields, MoneyInput, PercentInput, Select, TextInput, WholeInput } from '../../../kit'
import { copy, slots } from '../../../copy'
import { ProfileIcon } from '../profileIcons'
import { buildLiving, buildMedical, livingFormFrom, medicalFormFrom, ownLivingField, ownMedicalField, type LivingApproach, type LivingField, type LivingForm, type MedicalField, type MedicalForm } from './expensesFields'
import { openCheck, saveEdit, type SpendPeriodSetup } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { useSetupPeriod } from './setupPeriod'
import { Fact } from './Fact'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'

const APPROACH_ITEMS = [
  { value: 'one', label: copy.profileLivingApproachOne },
  { value: 'budget', label: copy.profileLivingApproachBudget },
] as const satisfies readonly { value: LivingApproach; label: string }[]

const PERIOD_ITEMS = [
  { value: 'month', label: copy.periodMonth },
  { value: 'year', label: copy.periodYear },
] as const satisfies readonly { value: SpendEntryPeriod; label: string }[]

const TIER_ITEMS = [
  { value: 'essentials', label: copy.budgetTierEssentials },
  { value: 'discretionary', label: copy.budgetTierDiscretionary },
] as const satisfies readonly { value: BudgetLineItem['tier']; label: string }[]

const CATEGORY_ITEMS: readonly { value: BudgetCategory; label: string }[] = BUDGET_CATEGORIES.map((c) => ({ value: c, label: copy[CATEGORY_LABEL_KEYS[c]] }))

/** How a line's cost changes (gap 4's U8, KTD4): every choice on screen at once, never hidden in a menu, because the
 *  wrong one is a costly misreading (a rate read as "on top of prices" is the rosy side). */
const CHANGE_ITEMS = [
  { value: 'prices', label: copy.budgetChangePrices },
  { value: 'same', label: copy.budgetChangeSame },
  { value: 'rate', label: copy.budgetChangeRate },
] as const satisfies readonly { value: LineChange; label: string }[]

/** One worksheet row: its own errors once touched (or after a refused Save), the walk's line words. Gap 4's U8 adds the
 *  line's repeat and how its cost changes, each read back in the household's own numbers. */
function LineRow({
  item,
  n,
  errors,
  attempted,
  readOnly,
  windowHelp,
  yearOf,
  startCalendarYear,
  dateRoute,
  onChange,
  onRemove,
}: {
  readonly item: BudgetLineItem
  readonly n: number
  readonly errors: readonly BudgetItemError[]
  /** A Save the worksheet refused: every line error shows, the rate box's blank one included. */
  readonly attempted: boolean
  readonly readOnly: boolean
  readonly windowHelp: string
  /** The calendar year a count of years lands on, where year 0 has one (the all-retired route: the plan's first year);
   *  null on the date route, whose year 0 is the first retirement year the answer finds. */
  readonly yearOf: ((offset: number) => number) | null
  /** The plan's first year: a rate grows from it on both routes (KTD4), so the rate's read-back names a year after it. */
  readonly startCalendarYear: number
  readonly dateRoute: boolean
  readonly onChange: (next: BudgetLineItem) => void
  readonly onRemove: () => void
}) {
  const errorFor = (slot: LineErrorSlot) => errors.find((e) => lineErrorSlot(e) === slot)
  const amountError = errorFor('amount')
  const windowError = errorFor('window')
  const repeatError = errorFor('repeat')
  const change = lineChangeOf(item)
  const rateId = useId()
  const readBackId = useId()
  // The box's own blank refusal waits for the household to leave the box (or a refused Save): picking "Goes up by" moves
  // focus into the empty box, and words under it before a keystroke would scold a choice just made (silent while typing,
  // checked on leave).
  const [rateLeft, setRateLeft] = useState(false)
  const rateError = errorFor('rate') !== undefined && (rateLeft || attempted) ? errorFor('rate') : undefined
  // The percent this row last held, so "Stays the same" and back keeps what was typed (a figure is never re-asked).
  const lastRate = useRef(change === 'rate' && Number.isFinite(item.growthRate) ? item.growthRate : undefined)
  const [focusRate, setFocusRate] = useState(false)
  useEffect(() => {
    if (!focusRate) return
    setFocusRate(false)
    document.getElementById(rateId)?.focus()
  }, [focusRate, rateId])
  /** "That's 2028." under a From or Through box holding a count (never under a blank one). */
  const yearLine = (offset: number | undefined) =>
    yearOf !== null && offset !== undefined && Number.isFinite(offset) ? { description: slots.budgetWindowYearIs(yearOf(offset)) } : {}
  const repeatWords = repeatReadBack(item, yearOf) ?? (item.everyYears === undefined ? copy.budgetRepeatBlankHelp : undefined)
  const rateWords = rateReadBack(item, startCalendarYear)
  // A fixed or rated line with a last year, on the date route: its years count from each stop tested (KTD1's stopgap).
  const endNote = dateRoute && change !== 'prices' && item.endYear !== undefined
  return (
    <li className="flex flex-col gap-4 rounded-card border border-stone-300 p-4" data-budget-line={item.id ?? n}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-body font-medium text-stone-900">{slots.profileBudgetLineOf(n)}</p>
        {readOnly ? null : (
          <Button variant="neutral" size="sm" aria-label={slots.budgetRemoveLine(lineDisplayName(item))} onClick={onRemove}>
            {copy.profileBudgetRemove}
          </Button>
        )}
      </div>
      <DrawerFields>
        <Select<BudgetCategory>
          label={copy.budgetCatLabel}
          items={CATEGORY_ITEMS}
          value={item.category}
          disabled={readOnly}
          onValueChange={(category) => onChange({ ...item, category })}
        />
        <TextInput label={copy.budgetLineLabelLabel} value={item.label} readOnly={readOnly} onCommit={(label) => onChange({ ...item, label: label ?? '' })} />
        <MoneyInput
          label={item.everyYears === undefined ? copy.budgetAmountLabel : copy.budgetAmountLabelEach}
          value={Number.isFinite(item.annualAmountReal) ? item.annualAmountReal : undefined}
          invalidMessage={copy.profileInvalidMoney}
          readOnly={readOnly}
          {...(amountError !== undefined ? { error: copy[BUDGET_ERROR_COPY[amountError.kind]] } : {})}
          // A cleared amount is NaN, never a silent 0 (burned/062): the line's own rule names it.
          onCommit={(v) => onChange({ ...item, annualAmountReal: v ?? Number.NaN })}
        />
        <ChoiceGroup<BudgetLineItem['tier']>
          legend={copy.budgetTierLegend}
          name={`budget-tier-${item.id ?? n}`}
          items={TIER_ITEMS}
          value={item.tier}
          disabled={readOnly}
          onValueChange={(tier) => onChange({ ...item, tier })}
        />
        <WholeInput
          label={copy.budgetWindowFromLabel}
          value={Number.isFinite(item.startYear) ? item.startYear : undefined}
          invalidMessage={copy.profileInvalidYearOffset}
          readOnly={readOnly}
          {...yearLine(item.startYear)}
          {...(windowError !== undefined ? { error: copy[BUDGET_ERROR_COPY[windowError.kind]] } : {})}
          onCommit={(start) => onChange({ ...item, startYear: start ?? Number.NaN })}
        />
        <WholeInput
          label={copy.budgetWindowThroughLabel}
          value={item.endYear}
          invalidMessage={copy.profileInvalidYearOffset}
          readOnly={readOnly}
          {...yearLine(item.endYear)}
          onCommit={(end) => {
            // ABSENT (never an undefined-valued key) is the lifelong encoding (DND 009).
            const { endYear: _dropped, ...rest } = item
            onChange(end === undefined ? rest : { ...rest, endYear: end })
          }}
        />
        <WholeInput
          label={copy.budgetRepeatLabel}
          suffix={copy.budgetRepeatUnit}
          value={item.everyYears}
          invalidMessage={copy.profileInvalidYearOffset}
          readOnly={readOnly}
          {...(repeatWords !== undefined ? { description: repeatWords } : {})}
          {...(repeatError !== undefined ? { error: copy[BUDGET_ERROR_COPY[repeatError.kind]] } : {})}
          onCommit={(every) => {
            // Blank is every year: the key ABSENT, never an undefined-valued one (DND 009).
            const { everyYears: _dropped, ...rest } = item
            onChange(every === undefined ? rest : { ...rest, everyYears: every })
          }}
        />
        <div className="flex min-w-0 flex-col gap-3">
          <ChoiceGroup<LineChange>
            legend={copy.budgetChangeLegend}
            name={`budget-change-${item.id ?? n}`}
            items={CHANGE_ITEMS}
            value={change}
            vertical
            disabled={readOnly}
            {...(rateWords !== null ? { describedByIds: readBackId } : {})}
            onValueChange={(next) => {
              if (next === change) return
              if (change === 'rate' && Number.isFinite(item.growthRate)) lastRate.current = item.growthRate
              onChange(withLineChange(item, next, lastRate.current))
              if (next === 'rate') setFocusRate(true)
            }}
          />
          {change === 'rate' ? (
            <div onBlur={() => setRateLeft(true)}>
              <PercentInput
                id={rateId}
                label={copy.budgetRateLabel}
                value={item.growthRate !== undefined && Number.isFinite(item.growthRate) ? item.growthRate : undefined}
                invalidMessage={copy.profileInvalidPercent}
                readOnly={readOnly}
                {...(rateError !== undefined ? { error: copy[BUDGET_ERROR_COPY[rateError.kind]] } : {})}
                // A cleared box is NaN, never "with prices" (insight 059): the line's own rule holds the Save with words.
                onCommit={(rate) => onChange({ ...item, growthRate: rate ?? Number.NaN })}
              />
            </div>
          ) : null}
        </div>
      </DrawerFields>
      {/* The two long sentences run the row's full width, under the grid (two lines, never a narrow column of five). */}
      {rateWords !== null ? (
        <p id={readBackId} className="text-label text-stone-600 tabular-nums" data-budget-rate-readback="">
          {rateWords}
        </p>
      ) : null}
      {endNote ? (
        <p className="text-label text-stone-600" data-budget-end-note="">
          {copy.budgetDateRouteEndNote}
        </p>
      ) : null}
      <p className="text-label text-stone-600">{windowHelp}</p>
    </li>
  )
}

export function LivingDrawer({ model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus, checkAtOpen }: DrawerBodyProps) {
  const draft = model.getSnapshot().draft
  const [seed] = useState<LivingForm>(() => livingFormFrom(draft))
  // Act 6 · RC14: inside the first-run stepper the spending period's provenance is the stepper's, and its unit counts as
  // answered only once tapped (`drawerSave.ts`'s header); after setup there is none (null) and the constant stands.
  const setup = useSetupPeriod()
  // A tap on the unit, already-checked month included (the kit's ChoiceGroup reports it): the walk's explicit answer.
  const [unitTapped, setUnitTapped] = useState(false)
  // THE RECEIPT IS THE PLAN AT OPEN (milestone 3's review, X2 and round 2; `drawerSave.ts`'s header): a one-figure amount
  // with no budget governing it whose draft TRIPS the period gate under the bare probe (`periodGateTrips`) can only have
  // passed that gate, so its unit counts as answered. A figure under the floor in its shown unit was never asked (6,500
  // under the untapped month saved unasked), a plan with no figure, or one a budget governs, holds no receipt, whatever
  // setup's Complete said: its next figure past the floor asks for the unit until it is tapped (96,000 under the
  // pre-checked month was $1,152,000 a year, unasked).
  const [figureCleared] = useState(() => seed.approach === 'one' && periodGateTrips(draft))
  const periodNow = (approach: LivingApproach): SpendPeriodSetup =>
    setup === null
      ? { periodConfirmed: figureCleared, spendPeriodAnswered: unitTapped || approach === 'budget' }
      : { periodConfirmed: setup.periodConfirmed && figureCleared, spendPeriodAnswered: setup.spendPeriodAnswered || unitTapped || approach === 'budget' }
  const [initial] = useState(() => (checkAtOpen === true ? openCheck(draft, ownLivingField, undefined, periodNow(seed.approach)) : undefined))
  const edit = useDrawerEdit<LivingForm, LivingField>(seed, open, initial)
  const { form, check, set } = edit
  // A line's errors show once it was edited, or after a Save the worksheet refused (silent while typing, checked on leave).
  const [touchedLines, setTouchedLines] = useState<ReadonlySet<string>>(() => new Set())
  const [attempted, setAttempted] = useState(false)
  const validation = useMemo(() => validateBudgetItems(form.lines), [form.lines])
  // The readout reads the spending and medical figures as they stand, with the staged lines (the walk's builder's own).
  const readout = useMemo(() => budgetReadout(draft, form.lines, validation), [draft, form.lines, validation])
  const lineKey = (it: BudgetLineItem, i: number): string => it.id ?? `row-${i}`
  const setLines = (lines: readonly BudgetLineItem[]) => set('lines', { lines })
  const dateRoute = isDateRoute(draft)
  const windowHelp = dateRoute ? copy.budgetWindowHelp : slots.budgetWindowHelpRetired(draft.startCalendarYear)
  // The all-retired route's year 0 is the plan's first year (`blueprintView.ts`'s `stopAnchor` places its lines the same
  // way), so each box can name its calendar year; the date route's year 0 is the retirement year the answer finds.
  const yearOf = dateRoute ? null : (offset: number) => draft.startCalendarYear + offset
  // Back to one figure from lines that repeat or change at their own rate: the figure it keeps, charged every year (the
  // plan's readers' minor finding: harsh, and said on screen).
  const seedDeparts = seed.lines.some((l) => l.everyYears !== undefined || l.growthRate !== undefined)
  const backToSingleHint =
    seedDeparts && draft.annualSpendingReal !== undefined
      ? `${copy.budgetBackToSingleHint} ${slots.budgetBackToSingleKeeps(formatMoney(Math.round(draft.annualSpendingReal)))}`
      : copy.budgetBackToSingleHint
  return (
    <ProfileDrawer
      open={open}
      title={copy.profileKindLiving}
      icon={<ProfileIcon icon="living" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildLiving(d, seed, edit.read()), ownLivingField, undefined, periodNow(edit.read().approach))
        if (!res.saved) {
          edit.setCheck(res.check)
          setAttempted(true)
        } else if (unitTapped) setup?.markSpendPeriodAnswered()
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={check.elsewhere}
    >
      <ChoiceGroup<LivingApproach>
        legend={copy.profileLivingApproachLegend}
        name="living-approach"
        items={APPROACH_ITEMS}
        value={form.approach}
        disabled={readOnly}
        onValueChange={(approach) => {
          set('lines', { approach })
          // The amount's refusal belongs to the face that drew it: the worksheet never shows "tap Each month…" (milestone
          // 3's review, round 2). The next Save checks again.
          set('amount', {})
        }}
        {...(seed.approach === 'budget' && form.approach === 'one' ? { description: backToSingleHint } : {})}
      />
      {form.approach === 'one' ? (
        <Fact stamp="annualSpendingReal spendEntryPeriod">
          <DrawerFields>
            <MoneyInput
              label={copy.spendLabel}
              description={copy[spendHelpKeyFor(draft)]}
              value={form.entered}
              invalidMessage={copy.profileInvalidMoney}
              readOnly={readOnly}
              {...(check.fields.amount !== undefined ? { error: check.fields.amount } : {})}
              onCommit={(entered) => set('amount', { entered })}
            />
            <ChoiceGroup<SpendEntryPeriod>
              legend={copy.periodLegend}
              name="living-period"
              items={PERIOD_ITEMS}
              value={form.period ?? null}
              disabled={readOnly}
              onValueChange={(period) => {
                setUnitTapped(true)
                set('amount', { period })
              }}
            />
          </DrawerFields>
        </Fact>
      ) : (
        <Fact stamp="budget annualSpendingReal">
          <section className="flex flex-col gap-4" aria-label={copy.profileLivingBudgetHeading} data-budget-worksheet="">
            <h3 className="text-body font-medium text-stone-900">{copy.profileLivingBudgetHeading}</h3>
            <p className="text-label text-stone-600">{copy.budgetSheetIntro}</p>
            {form.lines.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {form.lines.map((item, i) => {
                  const key = lineKey(item, i)
                  const shown = attempted || touchedLines.has(key) ? validation.errors.filter((e) => e.index === i) : []
                  return (
                    <LineRow
                      key={key}
                      item={item}
                      n={i + 1}
                      errors={shown}
                      attempted={attempted}
                      readOnly={readOnly}
                      windowHelp={windowHelp}
                      yearOf={yearOf}
                      startCalendarYear={draft.startCalendarYear}
                      dateRoute={dateRoute}
                      onChange={(next) => {
                        setTouchedLines((t) => new Set([...t, key]))
                        setLines(form.lines.map((it, j) => (j === i ? next : it)))
                      }}
                      onRemove={() => setLines(form.lines.filter((_, j) => j !== i))}
                    />
                  )
                })}
              </ul>
            ) : null}
            {readOnly ? null : (
              <div>
                <Button
                  variant={form.lines.length === 0 ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    // THE ADD'S STABLE ID (schema version 6): never one the plan or a staged line already holds.
                    const taken = idsInUse(draft)
                    for (const it of form.lines) if (it.id !== undefined) taken.add(it.id)
                    setLines([...form.lines, freshLine(freshStableId(taken))])
                  }}
                >
                  {copy.budgetAddLine}
                </Button>
              </div>
            )}
            {/* The amount box is not drawn on this face, so a refusal on the spending figure (a $0 year-0 total) shows here,
                beside the worksheet's own (milestone 3's review, X10): never a refused Save with nothing on screen. */}
            {(check.fields.lines ?? check.fields.amount) !== undefined ? (
              <p role="alert" className="text-label text-stone-900" data-budget-refused="">
                {check.fields.lines ?? check.fields.amount}
              </p>
            ) : null}
            <div role="status" className="flex flex-col gap-1 rounded-card bg-stone-100 p-4" data-budget-readout="">
              {readout.map((line, i) => (
                <p key={i} className={line.muted ? 'text-label text-stone-600' : 'text-body text-stone-900 tabular-nums'}>
                  {line.text}
                </p>
              ))}
            </div>
          </section>
        </Fact>
      )}
      <Fact stamp="survivorSpendingRatio">
        <section className="flex flex-col gap-2 border-t border-stone-300 pt-6">
          <h3 className="text-body font-medium text-stone-900">{copy.profileLivingSurvivorHeading}</h3>
          <PercentInput
            label={copy.assumptionSurvivorRatioLabel}
            description={copy.assumptionSurvivorRatioHelp}
            value={form.survivor}
            invalidMessage={copy.profileInvalidPercent}
            readOnly={readOnly}
            {...(check.fields.survivor !== undefined ? { error: check.fields.survivor } : {})}
            onCommit={(survivor) => set('survivor', { survivor })}
          />
        </section>
      </Fact>
    </ProfileDrawer>
  )
}

export function MedicalDrawer({ model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus }: DrawerBodyProps) {
  const draft = model.getSnapshot().draft
  const [seed] = useState<MedicalForm>(() => medicalFormFrom(draft))
  const edit = useDrawerEdit<MedicalForm, MedicalField>(seed, open)
  const { form, check } = edit
  // The budgetless M > S note, on the figure as it stands in the drawer (calm, never a block).
  const shown = { ...draft, health: { ...draft.health, oopMedicalAnnual: form.oop } }
  const exceeds = oopExceedsBudgetlessSpend(shown) && !budgetGoverns(draft.budget)
  return (
    <ProfileDrawer
      open={open}
      title={copy.profileKindMedical}
      icon={<ProfileIcon icon="medical" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildMedical(d, seed, edit.read()), ownMedicalField)
        if (!res.saved) edit.setCheck(res.check)
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={check.elsewhere}
    >
      <Fact stamp="health.oopMedicalAnnual">
        <MoneyInput
          label={copy.oopLabel}
          description={copy[oopHelpKeyFor(draft)]}
          value={form.oop}
          invalidMessage={copy.profileInvalidMoney}
          readOnly={readOnly}
          {...(check.fields.oop !== undefined ? { error: check.fields.oop } : {})}
          onCommit={(oop) => edit.set('oop', { oop })}
        />
      </Fact>
      {/* The reference hint only while the field is empty: a grounded, below-average anchor (`referenceData.ts`). */}
      {form.oop === undefined ? (
        <p className="text-label text-stone-600">
          {slots.oopHint(formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.annual), formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.federalAverageApproxAnnual))}
        </p>
      ) : null}
      {exceeds && form.oop !== undefined && draft.annualSpendingReal !== undefined ? (
        <p className="text-label text-stone-600">{slots.oopExceedsSpend(formatMoney(form.oop), formatMoney(draft.annualSpendingReal))}</p>
      ) : null}
    </ProfileDrawer>
  )
}
