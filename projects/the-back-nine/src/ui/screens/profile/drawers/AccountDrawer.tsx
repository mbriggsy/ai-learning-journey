/**
 * src/ui/screens/profile/drawers/AccountDrawer.tsx: one account's drawer (Act 6 · RC13a). One account is one record on
 * two cards: Savings opens it on its deposits (each year while its owner still works: the deposit, an employer plan's
 * match, an HSA's employer money, and this year's legal limits, computed from the one ceiling table); Net Worth opens it
 * on what it holds (owner, kind, balance, a brokerage account's cost basis, and its mix, typed in or by the fund it holds).
 * A new account (either page's Add menu) shows both. An inherited IRA (U13) shows who inherited it, its balance and mix,
 * and its questions (`InheritedIraFields.tsx`), with its kind locked and no deposits. Built by the walk's one decision
 * tree (`accountFields.ts`); a
 * refusal on a field this facet doesn't show (a kind changed on Net Worth that puts the deposits over the new kind's
 * limit) is named in the drawer's line at the top. Delete (Net Worth only) removes the account.
 */
import { useId, useState } from 'react'
import type { AccountKind } from '@shared/model'
import { ACCOUNT_KINDS } from '@shared/model'
import { kindLabel } from '@intake/accountKinds'
import { isEmployerPlanKind, takesDeposits } from '@intake/sanity'
import { INHERITED_QUESTION_IDS, type InheritedQuestionId } from '@intake/inheritedIraQuestions'
import type { Legs } from '@intake/allocation'
import { DrawerFields, MoneyInput, Select, TextInput } from '../../../kit'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import { ProfileIcon } from '../profileIcons'
import { accountCardName, limitLines } from '../profileView'
import {
  accountFormFromDraft,
  buildAccountEdit,
  deleteAccount,
  FACET_FIELDS,
  inheritedFieldErrors,
  inheritedWalkOf,
  knownFund,
  ownAccountField,
  tickerLegsFor,
  tickerMoved,
  type AccountDrawerForm,
  type AccountFacet,
  type AccountField,
} from './accountFields'
import { commitEdit, openCheck, saveEdit } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { Fact } from './Fact'
import { InheritedIraFields } from './InheritedIraFields'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'

// An inherited IRA is never one an ordinary account can become, or the other way (U13: its kind is locked, and it is added
// from its own Add entry), so the kind select offers it to no account.
const KIND_ITEMS = ACCOUNT_KINDS.filter((k) => k !== 'inherited-ira').map((k) => ({ value: k, label: kindLabel(k) }))
/** An inherited IRA's kind, shown locked. */
const INHERITED_KIND_ITEMS = [{ value: 'inherited-ira' as const, label: kindLabel('inherited-ira') }]
const MIX_ITEMS = [
  { value: 'hand', label: copy.profileMixByHand },
  { value: 'fund', label: copy.profileMixByTicker },
] as const

/** The field each refusal names, in the field's own label (for a refusal on a field this facet doesn't show). */
const FIELD_LABEL: Readonly<Record<AccountField, string>> = {
  owner: copy.profileOwnerLabel,
  kind: copy.profileKindLabel,
  value: copy.accountValueLabel,
  basis: copy.accountBasisLabel,
  mixHow: copy.profileMixHow,
  mix: copy.classifierLegend,
  ticker: copy.profileTickerLabel,
  tickerMix: copy.profileTickerUnknownLegend,
  deposit: copy.accountContributionLabel,
  match: copy.accountMatchLabel,
  hsaEmployer: copy.accountHsaEmployerLabel,
  // An inherited IRA's questions show on both facets that open it, so a refusal on one is never named from the top.
  ...(Object.fromEntries(INHERITED_QUESTION_IDS.map((id) => [id, copy.inheritedSectionHeading])) as Record<InheritedQuestionId, string>),
}

/** Three legs (stocks, bonds, cash) as typed, the walk's allocation entry's three boxes; a typed split is checked on Save.
 *  A refused split is one line under the three, and each box carries it (`aria-invalid`, `aria-describedby`: the walk's
 *  allocation entry tied its sum error to every leg); the first keystroke in any leg forgives it (`onEdit`, Act 6 · RC14). */
function LegsFields({
  legs,
  onLegs,
  onEdit,
  readOnly,
  error,
  legend,
  help,
}: {
  readonly legs: Legs
  readonly onLegs: (l: Legs) => void
  readonly onEdit: () => void
  readonly readOnly: boolean
  readonly error?: string
  readonly legend: string
  readonly help?: string
}) {
  const errorId = useId()
  const leg = (k: keyof Legs, label: string) => (
    <TextInput
      label={label}
      value={legs[k] === '' ? undefined : legs[k]}
      readOnly={readOnly}
      invalid={error !== undefined}
      {...(error !== undefined ? { describedByIds: errorId } : {})}
      onEdit={onEdit}
      onCommit={(v) => onLegs({ ...legs, [k]: v ?? '' })}
      className="min-w-0"
    />
  )
  return (
    <fieldset className="flex flex-col gap-2 wide:col-span-2" data-profile-legs="">
      <legend className="mb-2 text-body text-stone-900">{legend}</legend>
      {help !== undefined ? <p className="text-label text-stone-600">{help}</p> : null}
      <div className="grid grid-cols-3 gap-3">
        {leg('stock', copy.classifierStockPct)}
        {leg('bond', copy.classifierBondPct)}
        {leg('cash', copy.classifierCashPct)}
      </div>
      {error !== undefined ? (
        <p id={errorId} role="alert" className="text-label text-stone-900">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

export function AccountDrawer({
  at,
  model,
  open,
  readOnly,
  leaveAsk,
  onClose,
  onClosed,
  finalFocus,
  checkAtOpen,
}: DrawerBodyProps & { readonly at: { readonly index: number; readonly facet: Exclude<AccountFacet, 'all'> } | { readonly kind: AccountKind; readonly ownerIndex?: 0 | 1 } }) {
  const [opened] = useState(() => model.getSnapshot().draft)
  // A new inherited IRA's figures are asked for the year it is entered (KTD25): today's, from the wall clock.
  const [seed] = useState<AccountDrawerForm>(() =>
    accountFormFromDraft(
      opened,
      'index' in at ? { index: at.index } : { kind: at.kind, ownerIndex: at.ownerIndex ?? firstWorking(opened) },
      new Date().getFullYear(),
    ),
  )
  const index = 'index' in at ? at.index : ('new' as const)
  const facet: AccountFacet = 'index' in at ? at.facet : 'all'
  const [initial] = useState(() => (checkAtOpen === true && index !== 'new' ? openCheck(opened, ownAccountField(index)) : undefined))
  const edit = useDrawerEdit<AccountDrawerForm, AccountField>(seed, open, initial)
  const { form, check, set } = edit
  const shows = (k: AccountField) => FACET_FIELDS[facet].includes(k)
  const err = (k: AccountField) => (check.fields[k] !== undefined ? { error: check.fields[k] } : {})
  const account = index === 'new' ? undefined : opened.enteredAccounts[index]
  // A new account's title names the kind picked in the drawer (milestone 3's review, A7), never only the one it opened on.
  const title = account !== undefined ? accountCardName(opened, account) : slots.profileNewAccountTitle(kindLabel(form.kind ?? seed.kind ?? 'brokerage'))
  const ownerStatus = opened.people[form.ownerIndex]?.workStatus
  const ownerWorking = ownerStatus === 'working'
  const people = ([0, 1] as const).map((i) => ({ value: String(i) as '0' | '1', label: tablePerson(opened, i, 0, 0).label }))
  const fund = form.mixHow === 'fund' ? knownFund(form.ticker) : undefined
  // A refusal on a field this facet doesn't draw, named with the field's label at the top (never pointing at nothing).
  const hidden = (Object.keys(check.fields) as AccountField[]).filter((k) => !shows(k) || (k === 'deposit' || k === 'match' || k === 'hsaEmployer' ? !ownerWorking : false))
  const errors = [...hidden.map((k) => slots.profileRefusedHidden(FIELD_LABEL[k], check.fields[k]!)), ...check.elsewhere]
  const kind = form.kind
  const inherited = kind === 'inherited-ira'
  // The inherited IRA's questions, walked on every render: a refusal or an impossible figure shows on its question as
  // soon as it is answered, in the words Save refuses with; Save's own refusals (a blank answer) stand under the rest.
  const walk = inherited ? inheritedWalkOf(opened, form) : null
  const live = walk === null ? {} : inheritedFieldErrors(opened, form, walk)
  return (
    <ProfileDrawer
      open={open}
      title={title}
      icon={<ProfileIcon icon={kind === 'hsa' ? 'hsa' : facet === 'holdings' ? 'investment' : 'savings'} />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const landing = index === 'new' ? model.getSnapshot().draft.enteredAccounts.length : index
        const res = saveEdit(model, (d) => buildAccountEdit(d, index, seed, edit.read()), ownAccountField(landing))
        if (!res.saved) {
          edit.setCheck(res.check)
          return false
        }
        onClose(`account-${landing}`)
        return false
      }}
      {...(index === 'new' || readOnly || facet !== 'holdings'
        ? {}
        : {
            onDelete: () => {
              const before = model.getSnapshot().draft
              commitEdit(model, before, deleteAccount(before, index))
              onClose(null, { deleted: true })
            },
          })}
      onClose={() => onClose(index === 'new' ? null : undefined)}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={errors}
    >
      {shows('value') ? (
        <section className="flex flex-col gap-4" data-profile-section="holdings">
          {facet === 'all' ? <h3 className="text-body font-semibold text-stone-900">{copy.profileHoldingsHeading}</h3> : null}
          <DrawerFields>
            <Fact stamp="account.ownerIndex">
            <Select<'0' | '1'>
              label={inherited ? copy.inheritedHeirLabel : copy.profileOwnerLabel}
              items={people}
              value={String(form.ownerIndex) as '0' | '1'}
              disabled={readOnly}
              {...err('owner')}
              onValueChange={(v) => set('owner', { ownerIndex: Number(v) as 0 | 1 })}
            />
            </Fact>
            <Fact stamp="account.kind">
            <Select<AccountKind>
              label={copy.profileKindLabel}
              items={inherited ? INHERITED_KIND_ITEMS : KIND_ITEMS}
              value={kind ?? null}
              placeholder={copy.profileChoose}
              disabled={readOnly || inherited}
              required
              {...err('kind')}
              onValueChange={(k) => set('kind', { kind: k })}
            />
            </Fact>
            <Fact stamp="account.valueToday">
            <MoneyInput
              label={copy.accountValueLabel}
              value={form.valueToday}
              invalidMessage={copy.profileInvalidMoney}
              readOnly={readOnly}
              {...err('value')}
              onCommit={(valueToday) => set('value', { valueToday })}
            />
            </Fact>
            {kind === 'brokerage' ? (
              <Fact stamp="account.basis">
              <MoneyInput
                label={copy.accountBasisLabel}
                description={copy.accountBasisHelp}
                value={form.basis}
                invalidMessage={copy.profileInvalidMoney}
                readOnly={readOnly}
                onCommit={(basis) => set('basis', { basis })}
              />
              </Fact>
            ) : null}
            <Select<'hand' | 'fund'>
              label={copy.profileMixHow}
              items={MIX_ITEMS}
              value={form.mixHow}
              disabled={readOnly}
              onValueChange={(mixHow) => set('mixHow', { mixHow })}
            />
            {form.mixHow === 'fund' ? (
              <Fact stamp="account.ticker">
              <TextInput
                label={copy.profileTickerLabel}
                description={fund === undefined ? copy.profileTickerHelp : slots.profileFundKnown(fund.name, fund.stock, fund.bond, fund.cash)}
                value={form.ticker === '' ? undefined : form.ticker}
                readOnly={readOnly}
                {...err('ticker')}
                onCommit={(t) => {
                  const ticker = (t ?? '').toUpperCase()
                  // A different fund brings its own mix boxes: the plan's mix for it, or blank (`tickerLegsFor`).
                  set('ticker', tickerMoved(edit.read().ticker, ticker) ? { ticker, tickerLegs: tickerLegsFor(model.getSnapshot().draft, ticker) } : { ticker })
                }}
              />
              </Fact>
            ) : null}
            {form.mixHow === 'hand' ? (
              <Fact stamp="account.manualBlend">
              <LegsFields legs={form.legs} onLegs={(legs) => set('mix', { legs })} onEdit={() => set('mix', {})} readOnly={readOnly} legend={copy.classifierLegend} {...err('mix')} />
              </Fact>
            ) : form.ticker.trim() !== '' && fund === undefined ? (
              <Fact stamp="tickerClassifications">
              <LegsFields
                legs={form.tickerLegs}
                onLegs={(tickerLegs) => set('tickerMix', { tickerLegs })}
                onEdit={() => set('tickerMix', {})}
                readOnly={readOnly}
                legend={copy.profileTickerUnknownLegend}
                help={copy.profileTickerUnknownHelp}
                {...err('tickerMix')}
              />
              </Fact>
            ) : null}
          </DrawerFields>
        </section>
      ) : null}
      {walk !== null && shows('treatment') ? (
        <InheritedIraFields
          draft={opened}
          heirIndex={form.ownerIndex}
          answers={form.inherited}
          walk={walk}
          readOnly={readOnly}
          errorOf={(id) => live[id] ?? check.fields[id]}
          onAnswers={(id, next) => set(id, { inherited: next })}
        />
      ) : null}
      {shows('deposit') && (kind === undefined || takesDeposits(kind)) ? (
        <section className="flex flex-col gap-4 border-t border-stone-300 pt-6 first:border-t-0 first:pt-0" data-profile-section="deposits">
          <h3 className="text-body font-semibold text-stone-900">{copy.profileDepositsHeading}</h3>
          {!ownerWorking ? (
            // "Stopped working" only for a person marked retired (milestone 3's review, X9); a blank work status says it is
            // still needed, on Family, and opens no deposit box.
            <p className="text-body text-stone-600" data-profile-deposits-closed={ownerStatus === 'retired' ? 'retired' : 'unanswered'}>
              {ownerStatus === 'retired' ? copy.profileDepositsRetired : copy.profileDepositsWorkUnanswered}
            </p>
          ) : (
            <>
              <DrawerFields>
                <Fact stamp="account.annualContribution">
                <MoneyInput
                  label={copy.accountContributionLabel}
                  value={form.annualContribution}
                  invalidMessage={copy.profileInvalidMoney}
                  readOnly={readOnly}
                  {...err('deposit')}
                  onCommit={(annualContribution) => set('deposit', { annualContribution })}
                />
                </Fact>
                {kind !== undefined && isEmployerPlanKind(kind) ? (
                  <Fact stamp="account.employerMatchAnnual">
                  <MoneyInput
                    label={copy.accountMatchLabel}
                    value={form.employerMatchAnnual}
                    invalidMessage={copy.profileInvalidMoney}
                    readOnly={readOnly}
                    {...err('match')}
                    onCommit={(employerMatchAnnual) => set('match', { employerMatchAnnual })}
                  />
                  </Fact>
                ) : null}
                {kind === 'hsa' ? (
                  <Fact stamp="account.hsaEmployerAnnual">
                  <MoneyInput
                    label={copy.accountHsaEmployerLabel}
                    value={form.hsaEmployerAnnual}
                    invalidMessage={copy.profileInvalidMoney}
                    readOnly={readOnly}
                    {...err('hsaEmployer')}
                    onCommit={(hsaEmployerAnnual) => set('hsaEmployer', { hsaEmployerAnnual })}
                  />
                  </Fact>
                ) : null}
              </DrawerFields>
              {kind !== undefined
                ? limitLines(opened, { kind, ownerIndex: form.ownerIndex }).map((l) => (
                    <p key={l} className="text-label text-stone-600" data-profile-limit="">
                      {l}
                    </p>
                  ))
                : null}
            </>
          )}
        </section>
      ) : null}
    </ProfileDrawer>
  )
}

/** A new account's first owner: the first person still working (deposits can go in), else the first person. */
function firstWorking(d: { readonly people: readonly { readonly workStatus?: string }[] }): 0 | 1 {
  return d.people[0]?.workStatus !== 'working' && d.people[1]?.workStatus === 'working' ? 1 : 0
}
