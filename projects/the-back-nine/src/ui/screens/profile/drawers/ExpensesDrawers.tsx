/**
 * src/ui/screens/profile/drawers/ExpensesDrawers.tsx: Expenses' Living expenses and Out-of-pocket medical drawers (Act 6 ·
 * RC13b; ref 2.4; `rc-shell/form-retexp-02.png`, RightCapital's Retirement Expense drawer with its "Expense approach"). The
 * fields, words and writes are the walk's (the spend step's two faces and budget builder, the out-of-pocket step;
 * `expensesFields.ts`); the frame is `ProfileDrawer.tsx`. Every field the engine reads, and no other (D7).
 *
 * LIVING EXPENSES: "How you give your spending" picks one figure (with its unit: a monthly figure read as yearly is the
 * 12x misentry) or a budget line by line (the worksheet: category, name, dollars a year, essential or extra, from and
 * through which year; add and remove rows). The reconciliation readout sits BELOW the lines and the Add button, so a
 * figure committed on blur never moves a control above the one being pressed (insight 035); its box is the walk's.
 * The survivor's share closes the drawer. Removing a line a kept what-if names leaves that what-if refusing by name
 * (`applyBundle`'s `line-gone`, never re-aimed at another line, R21).
 *
 * OUT-OF-POCKET MEDICAL: the walk's own help, which carries the copy law (these costs already sit inside the spending
 * figure, and the figure's two jobs: the HSA's tax-free draw, and kept whole if one of you is on your own later).
 */
import { useMemo, useState } from 'react'
import { BUDGET_CATEGORIES, type BudgetCategory, type BudgetLineItem, type SpendEntryPeriod } from '@shared/model'
import { freshStableId, idsInUse } from '@shared/stableIds'
import { validateBudgetItems, budgetGoverns, type BudgetItemError } from '@budget/budgetModel'
import { BUDGET_ERROR_COPY, budgetReadout, freshLine, isAmountError } from '@intake/budgetForm'
import { CATEGORY_LABEL_KEYS, lineDisplayName } from '@intake/budgetLines'
import { isDateRoute, oopHelpKeyFor, spendHelpKeyFor } from '@intake/intakeMap'
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

/** One worksheet row: its own errors once touched (or after a refused Save), the walk's line words. */
function LineRow({
  item,
  n,
  errors,
  readOnly,
  windowHelp,
  onChange,
  onRemove,
}: {
  readonly item: BudgetLineItem
  readonly n: number
  readonly errors: readonly BudgetItemError[]
  readonly readOnly: boolean
  readonly windowHelp: string
  readonly onChange: (next: BudgetLineItem) => void
  readonly onRemove: () => void
}) {
  const amountError = errors.find(isAmountError)
  const windowError = errors.find((e) => !isAmountError(e))
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
          label={copy.budgetAmountLabel}
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
          invalidMessage={copy.profileInvalidAge}
          readOnly={readOnly}
          {...(windowError !== undefined ? { error: copy[BUDGET_ERROR_COPY[windowError.kind]] } : {})}
          onCommit={(start) => onChange({ ...item, startYear: start ?? Number.NaN })}
        />
        <WholeInput
          label={copy.budgetWindowThroughLabel}
          value={item.endYear}
          invalidMessage={copy.profileInvalidAge}
          readOnly={readOnly}
          onCommit={(end) => {
            // ABSENT (never an undefined-valued key) is the lifelong encoding (DND 009).
            const { endYear: _dropped, ...rest } = item
            onChange(end === undefined ? rest : { ...rest, endYear: end })
          }}
        />
      </DrawerFields>
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
  const periodNow = (approach: LivingApproach): SpendPeriodSetup | undefined =>
    setup === null
      ? undefined
      : { periodConfirmed: setup.periodConfirmed, spendPeriodAnswered: setup.spendPeriodAnswered || unitTapped || approach === 'budget' }
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
  const windowHelp = isDateRoute(draft) ? copy.budgetWindowHelp : slots.budgetWindowHelpRetired(draft.startCalendarYear)
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
        onValueChange={(approach) => set('lines', { approach })}
        {...(seed.approach === 'budget' && form.approach === 'one' ? { description: copy.budgetBackToSingleHint } : {})}
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
                      readOnly={readOnly}
                      windowHelp={windowHelp}
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
            {check.fields.lines !== undefined ? (
              <p role="alert" className="text-label text-stone-900" data-budget-refused="">
                {check.fields.lines}
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
