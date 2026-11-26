/**
 * src/ui/screens/profile/drawers/OtherIncomeDrawer.tsx: one Other income record's drawer (Act 6 · RC13a): a pension,
 * rental, annuity, alimony or other income, every field its arm of the `IncomeStream` union carries, in the walk's words
 * (`OtherIncomeEntry.tsx`'s labels and help). Built by the walk's one decision tree (`otherIncomeFields.ts`), its refusals
 * under the field each names. The walk folds the end age and the taxable part under "Fine-tuning"; the drawer shows them
 * plainly (it has the room, and a hidden field's refusal would point at nothing). Delete removes the record.
 */
import { useState } from 'react'
import type { ColaMode, IncomeType } from '@shared/model'
import { INCOME_TYPES } from '@shared/model'
import { incomeTypeLabel } from '@intake/otherIncome'
import { isContinuingType, type IncomeFormState } from '@intake/incomeForm'
import { DrawerFields, MoneyInput, PercentInput, Select, WholeInput } from '../../../kit'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import { ProfileIcon } from '../profileIcons'
import { incomeCardName } from '../profileView'
import { buildOtherIncome, deleteOtherIncome, otherIncomeFormFrom, ownOtherIncomeField, type OtherIncomeField } from './otherIncomeFields'
import { commitEdit, saveEdit } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { Fact } from './Fact'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'

const TYPE_ITEMS = INCOME_TYPES.map((t) => ({ value: t, label: incomeTypeLabel(t) }))
const TIMING_ITEMS = [
  { value: 'now', label: copy.incomeTimingNow },
  { value: 'later', label: copy.incomeTimingLater },
] as const
const COLA_ITEMS: readonly { value: ColaMode; label: string }[] = [
  { value: 'real-flat', label: copy.incomeColaReal },
  { value: 'nominal-flat', label: copy.incomeColaNominal },
  { value: 'fixed-pct', label: copy.incomeColaFixed },
]
const ALIMONY_ITEMS = [
  { value: 'pre', label: copy.incomeAlimonyPre2019 },
  { value: 'post', label: copy.incomeAlimonyPost2018 },
] as const
const MODIFIED_ITEMS = [
  { value: 'no', label: copy.incomeAlimonyModifiedNo },
  { value: 'yes', label: copy.incomeAlimonyModifiedYes },
] as const
const ANNUITY_ITEMS = [
  { value: 'qualified', label: copy.incomeAnnuityQualified },
  { value: 'nonqual', label: copy.incomeAnnuityNonQualified },
] as const

export function OtherIncomeDrawer({
  at,
  model,
  open,
  readOnly,
  leaveAsk,
  onClose,
  onClosed,
  finalFocus,
}: DrawerBodyProps & { readonly at: { readonly index: number } | { readonly type: IncomeType } }) {
  const [opened] = useState(() => model.getSnapshot().draft)
  const [seed] = useState<IncomeFormState>(() => otherIncomeFormFrom(opened, at))
  const index = 'index' in at ? at.index : ('new' as const)
  const edit = useDrawerEdit<IncomeFormState, OtherIncomeField>(seed, open)
  const { form, check, set } = edit
  const err = (k: OtherIncomeField) => (check.fields[k] !== undefined ? { error: check.fields[k] } : {})
  const people = ([0, 1] as const).map((i) => ({ value: String(i) as '0' | '1', label: tablePerson(opened, i, 0, 0).label }))
  const stream = index === 'new' ? undefined : opened.incomeStreams[index]
  const title = stream !== undefined ? incomeCardName(opened, stream) : slots.profileNewIncomeTitle(incomeTypeLabel(seed.type ?? 'other'))
  const directTaxable = form.type === 'pension' || form.type === 'rental' || form.type === 'other'
  return (
    <ProfileDrawer
      open={open}
      title={title}
      icon={<ProfileIcon icon={form.type ?? 'other'} />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        // A new record lands at the list's end: its card takes focus when the drawer closes.
        const landing = index === 'new' ? model.getSnapshot().draft.incomeStreams.length : index
        const res = saveEdit(model, (d) => buildOtherIncome(d, index, seed, edit.read()), ownOtherIncomeField(landing))
        if (!res.saved) {
          edit.setCheck(res.check)
          return false
        }
        onClose(`income-${landing}`)
        return false
      }}
      {...(index === 'new' || readOnly
        ? {}
        : {
            onDelete: () => {
              const before = model.getSnapshot().draft
              commitEdit(model, before, deleteOtherIncome(before, index))
              onClose(null)
            },
          })}
      onClose={() => onClose(index === 'new' ? null : undefined)}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={check.elsewhere}
    >
      <DrawerFields>
        <Fact stamp="income.ownerIndex">
        <Select<'0' | '1'>
          label={copy.incomeOwnerLegend}
          items={people}
          value={String(form.ownerIndex) as '0' | '1'}
          disabled={readOnly}
          onValueChange={(v) => set('owner', { ownerIndex: Number(v) as 0 | 1 })}
        />
        </Fact>
        <Fact stamp="income.type">
        <Select<IncomeType>
          label={copy.profileIncomeTypeLabel}
          items={TYPE_ITEMS}
          value={form.type ?? null}
          placeholder={copy.profileChoose}
          disabled={readOnly}
          {...err('type')}
          onValueChange={(type) => set('type', { type })}
        />
        </Fact>
        <Fact stamp="income.annualRealToday">
        <MoneyInput
          label={copy.incomeAmountLabel}
          description={copy.incomeAmountHelp}
          value={form.annualRealToday}
          invalidMessage={copy.profileInvalidMoney}
          readOnly={readOnly}
          {...err('amount')}
          onCommit={(annualRealToday) => set('amount', { annualRealToday })}
        />
        </Fact>
        <Select<'now' | 'later'>
          label={copy.incomeTimingLegend}
          items={TIMING_ITEMS}
          value={form.receivingNow === undefined ? null : form.receivingNow ? 'now' : 'later'}
          placeholder={copy.profileChoose}
          disabled={readOnly}
          {...err('timing')}
          onValueChange={(v) => set('timing', { receivingNow: v === 'now' })}
        />
        {form.receivingNow === false ? (
          <Fact stamp="income.startAge">
          <WholeInput
            label={copy.incomeStartAgeLabel}
            description={copy.incomeStartAgeHelp}
            value={form.startAge}
            invalidMessage={copy.profileInvalidAge}
            readOnly={readOnly}
            {...err('startAge')}
            onCommit={(startAge) => set('startAge', { startAge })}
          />
          </Fact>
        ) : null}
        <Fact stamp="income.endAge">
        <WholeInput
          label={copy.incomeEndAgeLabel}
          description={copy.incomeEndAgeHelp}
          value={form.endAge}
          invalidMessage={copy.profileInvalidAge}
          readOnly={readOnly}
          {...err('endAge')}
          onCommit={(endAge) => set('endAge', { endAge })}
        />
        </Fact>
        <Fact stamp="income.colaMode">
        <Select<ColaMode>
          label={copy.incomeColaLegend}
          items={COLA_ITEMS}
          value={form.colaMode ?? null}
          placeholder={copy.profileChoose}
          disabled={readOnly}
          {...err('colaMode')}
          onValueChange={(colaMode) => set('colaMode', { colaMode })}
        />
        </Fact>
        {form.colaMode === 'fixed-pct' ? (
          <Fact stamp="income.colaPct">
          <PercentInput
            label={copy.incomeColaPctLabel}
            description={copy.incomeColaPctHelp}
            value={form.colaPct}
            invalidMessage={copy.profileInvalidPercent}
            readOnly={readOnly}
            {...err('colaPct')}
            onCommit={(colaPct) => set('colaPct', { colaPct })}
          />
          </Fact>
        ) : null}
        {isContinuingType(form.type) ? (
          <Fact stamp="income.survivorPct">
          <PercentInput
            label={copy.incomeSurvivorLabel}
            description={copy.incomeSurvivorHelp}
            value={form.survivorPct}
            invalidMessage={copy.profileInvalidPercent}
            readOnly={readOnly}
            {...err('survivorPct')}
            onCommit={(survivorPct) => set('survivorPct', { survivorPct })}
          />
          </Fact>
        ) : null}
        {directTaxable ? (
          <Fact stamp="income.taxableFraction">
          <PercentInput
            label={copy.incomeTaxableLabel}
            description={copy.incomeTaxableHelp}
            value={form.taxableFraction}
            invalidMessage={copy.profileInvalidPercent}
            readOnly={readOnly}
            {...err('taxableFraction')}
            onCommit={(taxableFraction) => set('taxableFraction', { taxableFraction })}
          />
          </Fact>
        ) : null}
        {form.type === 'alimony' ? (
          <>
            <div className="flex flex-col gap-1">
              <Fact stamp="income.executedAfter2018">
              <Select<'pre' | 'post'>
                label={copy.incomeAlimonyDateLegend}
                items={ALIMONY_ITEMS}
                value={form.executedAfter2018 === undefined ? null : form.executedAfter2018 ? 'post' : 'pre'}
                placeholder={copy.profileChoose}
                disabled={readOnly}
                required
                {...err('alimonyDate')}
                onValueChange={(v) => set('alimonyDate', { executedAfter2018: v === 'post' })}
              />
              </Fact>
              <p className="text-label text-stone-600">{copy.incomeAlimonyDateHelp}</p>
            </div>
            {form.executedAfter2018 === false ? (
              <div className="flex flex-col gap-1">
                <Fact stamp="income.modifiedAdoptsPost2018Rules">
                <Select<'no' | 'yes'>
                  label={copy.incomeAlimonyModifiedLegend}
                  items={MODIFIED_ITEMS}
                  value={form.modifiedAdoptsPost2018Rules ? 'yes' : 'no'}
                  disabled={readOnly}
                  onValueChange={(v) => set('alimonyDate', { modifiedAdoptsPost2018Rules: v === 'yes' })}
                />
                </Fact>
                <p className="text-label text-stone-600">{copy.incomeAlimonyModifiedHelp}</p>
              </div>
            ) : null}
          </>
        ) : null}
        {form.type === 'annuity' ? (
          <>
            <div className="flex flex-col gap-1">
              <Fact stamp="income.qualified">
              <Select<'qualified' | 'nonqual'>
                label={copy.incomeAnnuityKindLegend}
                items={ANNUITY_ITEMS}
                value={form.annuityQualified === undefined ? null : form.annuityQualified ? 'qualified' : 'nonqual'}
                placeholder={copy.profileChoose}
                disabled={readOnly}
                required
                {...err('annuityKind')}
                onValueChange={(v) => set('annuityKind', { annuityQualified: v === 'qualified' })}
              />
              </Fact>
              <p className="text-label text-stone-600">{copy.incomeAnnuityKindHelp}</p>
            </div>
            {form.annuityQualified === false ? (
              <Fact stamp="income.exclusionFraction">
              <PercentInput
                label={copy.incomeExclusionLabel}
                description={copy.incomeExclusionHelp}
                value={form.exclusionFraction}
                invalidMessage={copy.profileInvalidPercent}
                readOnly={readOnly}
                {...err('exclusionFraction')}
                onCommit={(exclusionFraction) => set('exclusionFraction', { exclusionFraction })}
              />
              </Fact>
            ) : null}
          </>
        ) : null}
      </DrawerFields>
    </ProfileDrawer>
  )
}
