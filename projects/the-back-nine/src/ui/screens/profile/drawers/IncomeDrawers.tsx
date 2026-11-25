/**
 * src/ui/screens/profile/drawers/IncomeDrawers.tsx: Income's person drawers (Act 6 · RC13a): a working person's Salary
 * (pay, with the one-steady-figure stopgap, map gap 12), each person's Social Security (the statement's monthly figure at
 * full retirement age and the year it starts, with the walk's own help: full retirement age echoed, the claim window, the
 * spousal note), and a working person's investment income while working. Fields, words and writes are the walk's
 * (`incomeFields.ts`).
 */
import { useState } from 'react'
import { fraMonthsForBirthYear } from '@engine/constants/socialSecurity'
import { SS_CLAIM_MAX, SS_CLAIM_MIN } from '@intake/sanity'
import { DrawerFields, MoneyInput, WholeInput } from '../../../kit'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import { ProfileIcon } from '../profileIcons'
import {
  buildSalary,
  buildSocialSecurity,
  buildWorkInvest,
  ownSocialSecurityField,
  salaryFormFrom,
  socialSecurityFormFrom,
  workInvestFormFrom,
  type SalaryField,
  type SalaryForm,
  type SocialSecurityField,
  type SocialSecurityForm,
  type WorkInvestField,
  type WorkInvestForm,
} from './incomeFields'
import { saveEdit } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { Fact } from './Fact'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'

const ownNothing = (): null => null

export function SalaryDrawer({ index, model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus }: DrawerBodyProps & { readonly index: 0 | 1 }) {
  const [seed] = useState<SalaryForm>(() => salaryFormFrom(model.getSnapshot().draft, index))
  const edit = useDrawerEdit<SalaryForm, SalaryField>(seed, open)
  return (
    <ProfileDrawer
      open={open}
      title={slots.profileSalaryOf(tablePerson(model.getSnapshot().draft, index, 0, 0).possessive)}
      icon={<ProfileIcon icon="salary" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildSalary(d, index, seed, edit.read()), ownNothing)
        if (!res.saved) edit.setCheck(res.check)
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={edit.check.elsewhere}
    >
      <DrawerFields>
        <Fact stamp="person.earnedIncomeReal">
        <MoneyInput
          label={copy.salaryLabel}
          description={copy.salaryHelp}
          value={edit.form.pay}
          invalidMessage={copy.profileInvalidMoney}
          readOnly={readOnly}
          onCommit={(pay) => edit.set('pay', { pay })}
        />
        </Fact>
      </DrawerFields>
      <p className="text-label text-stone-600" data-profile-stopgap="">
        {copy.profileSalaryStopgap}
      </p>
    </ProfileDrawer>
  )
}

export function SocialSecurityDrawer({ index, model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus }: DrawerBodyProps & { readonly index: 0 | 1 }) {
  const [seed] = useState<SocialSecurityForm>(() => socialSecurityFormFrom(model.getSnapshot().draft, index))
  const edit = useDrawerEdit<SocialSecurityForm, SocialSecurityField>(seed, open)
  const { form, check } = edit
  const draft = model.getSnapshot().draft
  const birthYear = draft.people[index].birthYear
  // Full retirement age is a fact of the birth year (the SSA table), echoed so the figure copied is the at-FRA one; the
  // engine's function throws out of its domain, so a bad birth year shows no echo (the walk's own guard).
  const fraMonths = birthYear !== undefined && Number.isInteger(birthYear) && birthYear >= 1900 && birthYear <= 2200 ? fraMonthsForBirthYear(birthYear, 'retirement') : undefined
  const claimAge = form.claimYear !== undefined && birthYear !== undefined ? form.claimYear - birthYear : undefined
  return (
    <ProfileDrawer
      open={open}
      title={slots.profileSocialSecurityOf(tablePerson(draft, index, 0, 0).possessive)}
      icon={<ProfileIcon icon="social-security" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildSocialSecurity(d, index, seed, edit.read()), ownSocialSecurityField(index))
        if (!res.saved) edit.setCheck(res.check)
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={check.elsewhere}
    >
      <DrawerFields>
        <Fact stamp="person.pia">
        <MoneyInput
          label={copy.ssAmountLabel}
          description={fraMonths === undefined ? copy.ssAmountHelp : `${copy.ssAmountHelp} ${slots.fraEcho(fraMonths)}`}
          value={form.monthly}
          invalidMessage={copy.profileInvalidMoney}
          readOnly={readOnly}
          {...(check.fields.monthly !== undefined ? { error: check.fields.monthly } : {})}
          onCommit={(monthly) => edit.set('monthly', { monthly })}
        />
        </Fact>
        <Fact stamp="person.socialSecurityClaimAge">
        <WholeInput
          label={copy.ssClaimLabel}
          {...(birthYear !== undefined
            ? { description: claimAge === undefined ? slots.ssClaimWindow(birthYear + SS_CLAIM_MIN, birthYear + SS_CLAIM_MAX) : slots.ssClaimAge(claimAge) }
            : {})}
          value={form.claimYear}
          invalidMessage={copy.profileInvalidYear}
          readOnly={readOnly}
          {...(check.fields.claimYear !== undefined ? { error: check.fields.claimYear } : {})}
          onCommit={(claimYear) => edit.set('claimYear', { claimYear })}
        />
        </Fact>
      </DrawerFields>
      <p className="text-label text-stone-600">{copy.ssSpousalNote}</p>
    </ProfileDrawer>
  )
}

export function WorkInvestDrawer({ index, model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus }: DrawerBodyProps & { readonly index: 0 | 1 }) {
  const [seed] = useState<WorkInvestForm>(() => workInvestFormFrom(model.getSnapshot().draft, index))
  const edit = useDrawerEdit<WorkInvestForm, WorkInvestField>(seed, open)
  return (
    <ProfileDrawer
      open={open}
      title={slots.profileWorkInvestOf(tablePerson(model.getSnapshot().draft, index, 0, 0).possessive)}
      icon={<ProfileIcon icon="work-invest" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildWorkInvest(d, index, seed, edit.read()), ownNothing)
        if (!res.saved) edit.setCheck(res.check)
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={edit.check.elsewhere}
    >
      <p className="text-body text-stone-900">{copy.workIncomeIntro}</p>
      <DrawerFields>
        <Fact stamp="health.workingYearInvestmentByPerson">
        <MoneyInput
          label={copy.workInvestmentLabel}
          description={copy.workInvestmentHelp}
          value={edit.form.amount}
          invalidMessage={copy.profileInvalidMoney}
          readOnly={readOnly}
          onCommit={(amount) => edit.set('amount', { amount })}
        />
        </Fact>
      </DrawerFields>
      <p className="text-label text-stone-600">{copy.workIncomeDisclosure}</p>
    </ProfileDrawer>
  )
}
