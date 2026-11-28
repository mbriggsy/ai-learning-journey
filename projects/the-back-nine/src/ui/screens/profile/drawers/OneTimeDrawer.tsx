/**
 * src/ui/screens/profile/drawers/OneTimeDrawer.tsx: one inheritance or gift's drawer (gap 5's U4; R1 to R3, R11, R14,
 * R15, R17; KTD11, KTD12), opened from its Income card, its Blueprint tile, or Add income's "Inheritance or gift". The
 * fields in the decision tree's order (`buildOneTimeInflow`): a name, the year, R17's question for a year that is the
 * balances' save year, the amount in today's dollars, and for a couple whose it is and, for one person's, whether it
 * still comes to the other. Each refusal shows under the field it names. Under the fields: R15's flag where it stands,
 * the read-back in the household's own numbers, and the estimate line. Delete removes the item.
 */
import { useState } from 'react'
import type { InheritedLeftTo } from '@shared/model'
import { freshStableId, idsInUse } from '@shared/stableIds'
import { oneTimeInflowFormFrom, asksArrivedBySave, type OneTimeInflowForm } from '@intake/oneTimeInflow'
import { ChoiceGroup, DrawerFields, MoneyInput, TextInput, WholeInput } from '../../../kit'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import { ProfileIcon } from '../profileIcons'
import { buildOneTime, deleteOneTime, oneTimeContext, oneTimeFlagWords, oneTimeLeftToWords, oneTimeReadBack, type OneTimeField } from './oneTimeFields'
import { commitEdit, saveEdit } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { Fact } from './Fact'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'

/** No rule in `validateDraft` reads an item's fields (the plan's U3: the year's range is a missing fact), so no rule
 *  field maps here. */
const NO_RULE_FIELD = () => null

export function OneTimeDrawer({
  at,
  model,
  open,
  readOnly,
  leaveAsk,
  onClose,
  onClosed,
  finalFocus,
  balancesYear,
}: DrawerBodyProps & { readonly at: { readonly index: number } | 'new' }) {
  const [opened] = useState(() => model.getSnapshot().draft)
  const index = at === 'new' ? ('new' as const) : at.index
  const stored = index === 'new' ? undefined : opened.oneTimeInflows?.[index]
  const ctx = oneTimeContext(opened, balancesYear)
  const [seed] = useState<OneTimeInflowForm>(() => oneTimeInflowFormFrom(stored, ctx.couple))
  // A new item's id, minted once per open (never shared with any id the plan holds).
  const [id] = useState(() => stored?.id ?? freshStableId(new Set([...idsInUse(opened), ...(opened.oneTimeInflows ?? []).map((i) => i.id)])))
  const edit = useDrawerEdit<OneTimeInflowForm, OneTimeField>(seed, open)
  const { form, check, set } = edit
  const err = (k: OneTimeField) => (check.fields[k] !== undefined ? { error: check.fields[k] } : {})
  const title = stored !== undefined ? stored.name : copy.oneTimeNewTitle
  // R15 over the year as it stands (a new item, or a year moved before the save year, is flagged before Save). A year IN
  // the save year draws R17's question instead, which asks exactly what that flag says, and refuses a yes.
  const flag = form.year !== undefined && form.year < ctx.saveYear ? oneTimeFlagWords(form.year, ctx.saveYear, ctx.balancesNow) : null
  const readBack = oneTimeReadBack(opened, form, ctx)
  const people = ([0, 1] as const).map((i) => tablePerson(opened, i, 0, 0))
  const heir = form.whose === 0 || form.whose === 1 ? form.whose : null
  const leftTo = heir === null ? null : oneTimeLeftToWords(opened, heir)
  return (
    <ProfileDrawer
      open={open}
      title={title}
      icon={<ProfileIcon icon="one-time" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        // A new item lands at the list's end: its card takes focus when the drawer closes.
        const landing = index === 'new' ? (model.getSnapshot().draft.oneTimeInflows?.length ?? 0) : index
        const res = saveEdit(model, (d) => buildOneTime(d, index, seed, edit.read(), oneTimeContext(d, balancesYear), id), NO_RULE_FIELD)
        if (!res.saved) {
          edit.setCheck(res.check)
          return false
        }
        onClose(`one-time-${landing}`)
        return false
      }}
      {...(index === 'new' || readOnly
        ? {}
        : {
            onDelete: () => {
              const before = model.getSnapshot().draft
              commitEdit(model, before, deleteOneTime(before, index))
              onClose(null, { deleted: true })
            },
          })}
      onClose={() => onClose(index === 'new' ? null : undefined)}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={check.elsewhere}
    >
      <DrawerFields>
        <Fact stamp="inflow.name">
          <TextInput
            label={copy.oneTimeNameLabel}
            description={copy.oneTimeNameHelp}
            value={form.name}
            maxLength={80}
            readOnly={readOnly}
            {...err('name')}
            onCommit={(name) => set('name', { name })}
          />
        </Fact>
        <Fact stamp="inflow.year">
          <WholeInput
            label={copy.oneTimeYearFieldLabel}
            description={slots.oneTimeYearHelp(ctx.range.first, ctx.range.last)}
            value={form.year}
            invalidMessage={copy.profileInvalidYear}
            readOnly={readOnly}
            {...err('year')}
            onCommit={(year) => set('year', { year })}
          />
        </Fact>
        {asksArrivedBySave(form.year, ctx.saveYear) ? (
          <ChoiceGroup<'yes' | 'no'>
            // Balances entered now (a plan never saved, or balances changed since its save): asked in the present tense.
            legend={ctx.balancesNow ? copy.oneTimeArrivedLegendNow : slots.oneTimeArrivedLegend(ctx.saveYear)}
            name="one-time-arrived"
            items={[
              { value: 'yes', label: ctx.balancesNow ? copy.oneTimeArrivedYesNow : copy.oneTimeArrivedYes },
              { value: 'no', label: copy.oneTimeArrivedNo },
            ]}
            value={form.arrivedBySave === undefined ? null : form.arrivedBySave ? 'yes' : 'no'}
            disabled={readOnly}
            required
            {...err('arrivedBySave')}
            onValueChange={(v) => set('arrivedBySave', { arrivedBySave: v === 'yes' })}
          />
        ) : null}
        <Fact stamp="inflow.amountReal">
          <MoneyInput
            label={copy.oneTimeAmountLabel}
            description={copy.oneTimeAmountHelp}
            value={form.amountReal}
            invalidMessage={copy.profileInvalidMoney}
            readOnly={readOnly}
            {...err('amountReal')}
            onCommit={(amountReal) => set('amountReal', { amountReal })}
          />
        </Fact>
        {ctx.couple ? (
          <Fact stamp="inflow.heirIndex">
            <ChoiceGroup<'0' | '1' | 'both'>
              legend={copy.oneTimeWhoseLegend}
              name="one-time-whose"
              items={[
                { value: '0', label: people[0]!.label },
                { value: '1', label: people[1]!.label },
                { value: 'both', label: copy.blueprintBothOfYou },
              ]}
              value={form.whose === undefined ? null : form.whose === 'both' ? 'both' : (String(form.whose) as '0' | '1')}
              disabled={readOnly}
              required
              {...err('whose')}
              onValueChange={(v) => set('whose', { whose: v === 'both' ? 'both' : (Number(v) as 0 | 1) })}
            />
          </Fact>
        ) : null}
        {leftTo !== null ? (
          <Fact stamp="inflow.leftTo">
            <ChoiceGroup<InheritedLeftTo>
              legend={leftTo.legend}
              description={leftTo.help}
              name="one-time-leftTo"
              items={[
                { value: 'other-member', label: leftTo.yes },
                { value: 'someone-else', label: copy.oneTimeLeftToNo },
              ]}
              value={form.leftTo ?? null}
              // The full row past the phone tier: in one column its legend wrapped beside an empty one (the U4 look).
              className="wide:col-span-2"
              disabled={readOnly}
              required
              {...err('leftTo')}
              onValueChange={(v) => set('leftTo', { leftTo: v })}
            />
          </Fact>
        ) : null}
      </DrawerFields>
      {flag !== null ? (
        <p className="border-l-2 border-stone-900 pl-3 text-body text-stone-900" data-one-time-flag="">
          {flag}
        </p>
      ) : null}
      {readBack !== null ? (
        <p className="text-body text-stone-900 tabular-nums" data-one-time-readback="">
          {readBack}
        </p>
      ) : null}
      <p className="text-label text-stone-600" data-one-time-estimate="">
        {copy.oneTimeEstimateNote}
      </p>
    </ProfileDrawer>
  )
}
