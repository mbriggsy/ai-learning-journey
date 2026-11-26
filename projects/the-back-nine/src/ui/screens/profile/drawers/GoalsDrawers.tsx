/**
 * src/ui/screens/profile/drawers/GoalsDrawers.tsx: Goals' Health care before Medicare and Medicare drawers (Act 6 ·
 * RC13b; ref 2.4, `rc-shell/profile-03.png`). The fields, words and writes are the walk's (the quote step, the
 * employer-coverage step, the Medicare-extras fork and the look-back income step; `goalsFields.ts`), each shown where the
 * walk asks it (`intakeStepIds`' own gates, read off the draft at open); the frame is `ProfileDrawer.tsx`. The Retirement
 * cards open the Family person drawer (one home per fact).
 */
import { useState } from 'react'
import { medicareExtrasTypicalMonthly } from '@engine/constants/health'
import { anyRetiredPre65WhileAnotherWorks } from '@intake/intakeMap'
import { EXTERNAL_LINKS } from '@intake/links'
import { formatMoney } from '@intake/moneyFormat'
import { intakeStepIds } from '@intake/steps'
import { ChoiceGroup, DrawerFields, MoneyInput } from '../../../kit'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import { ProfileIcon } from '../profileIcons'
import {
  buildHealth,
  buildMedicare,
  healthFormFrom,
  medicareFormFrom,
  ownHealthField,
  ownMedicareField,
  type ExtrasPick,
  type HealthField,
  type HealthForm,
  type MedicareField,
  type MedicareForm,
} from './goalsFields'
import { openCheck, saveEdit } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { Fact } from './Fact'
import { OutLink } from './OutLink'
import { useSetupPeriod } from './setupPeriod'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'

const COVERAGE_ITEMS = [
  { value: 'covered', label: copy.employerCoverageCovered },
  { value: 'own', label: copy.employerCoverageOwn },
] as const satisfies readonly { value: 'covered' | 'own'; label: string }[]

/** A link out (the walk's resource links): a new tab, no referrer. */
export function HealthDrawer({ model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus }: DrawerBodyProps) {
  const draft = model.getSnapshot().draft
  const [seed] = useState<HealthForm>(() => healthFormFrom(draft))
  const edit = useDrawerEdit<HealthForm, HealthField>(seed, open)
  const { form, check, set } = edit
  // The coverage question is asked where the walk asks it: a member retired before 65 while the other still works.
  const asksCoverage = anyRetiredPre65WhileAnotherWorks(draft)
  return (
    <ProfileDrawer
      open={open}
      title={copy.profileHealthName}
      icon={<ProfileIcon icon="health" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildHealth(d, seed, edit.read()), ownHealthField)
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
        <Fact stamp="health.enrolledPremiumMonthlyToday">
          <MoneyInput
            label={copy.enrolledPremiumLabel}
            description={copy.healthQuoteHelp}
            value={form.enrolled}
            invalidMessage={copy.profileInvalidMoney}
            readOnly={readOnly}
            {...(check.fields.enrolled !== undefined ? { error: check.fields.enrolled } : {})}
            onCommit={(enrolled) => set('enrolled', { enrolled })}
          />
        </Fact>
        <Fact stamp="health.slcspMonthlyToday">
          <MoneyInput
            label={copy.slcspLabel}
            description={copy.slcspHelp}
            value={form.slcsp}
            invalidMessage={copy.profileInvalidMoney}
            readOnly={readOnly}
            {...(check.fields.slcsp !== undefined ? { error: check.fields.slcsp } : {})}
            onCommit={(slcsp) => set('slcsp', { slcsp })}
          />
        </Fact>
      </DrawerFields>
      <p className="text-label text-stone-600">
        {copy.linkGetQuote} <OutLink href={EXTERNAL_LINKS.healthcareGov}>{copy.linkHealthcareGov}</OutLink>
        {' · '}
        <OutLink href={EXTERNAL_LINKS.kffCalculator}>{copy.linkKffCalculator}</OutLink>
      </p>
      {asksCoverage ? (
        <Fact stamp="health.employerPlanCoversRetiredMember">
          <section className="flex flex-col gap-3 border-t border-stone-300 pt-6">
            <h3 className="text-body font-medium text-stone-900">{copy.profileHealthCoverageHeading}</h3>
            <ChoiceGroup<'covered' | 'own'>
              legend={copy.employerCoverageLegend}
              description={copy.employerCoverageHelp}
              name="employer-coverage"
              vertical
              items={COVERAGE_ITEMS}
              value={form.covered === undefined ? null : form.covered ? 'covered' : 'own'}
              disabled={readOnly}
              {...(check.fields.covered !== undefined ? { error: check.fields.covered } : {})}
              onValueChange={(v) => set('covered', { covered: v === 'covered' })}
            />
          </section>
        </Fact>
      ) : null}
    </ProfileDrawer>
  )
}

export function MedicareDrawer({ model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus, checkAtOpen }: DrawerBodyProps) {
  const draft = model.getSnapshot().draft
  const [seed] = useState<MedicareForm>(() => medicareFormFrom(draft))
  const [initial] = useState(() => (checkAtOpen === true ? openCheck(draft, ownMedicareField) : undefined))
  const edit = useDrawerEdit<MedicareForm, MedicareField>(seed, open, initial)
  const { form, check, set } = edit
  // The look-back income is asked where the walk asks it (anyone 64 or older); the extras of every household.
  const asksSeed = intakeStepIds(draft).includes('irmaa-seed')
  const inSetup = useSetupPeriod() !== null
  const typical = formatMoney(Math.round(medicareExtrasTypicalMonthly()))
  const extrasItems = [
    { value: 'none', label: copy.medicareExtrasForkNone },
    { value: 'entered', label: copy.medicareExtrasForkEntered },
    { value: 'typical', label: slots.medicareExtrasForkTypical(typical) },
  ] as const satisfies readonly { value: ExtrasPick; label: string }[]
  const pair = <T,>(xs: readonly [T, T], i: 0 | 1, v: T): readonly [T, T] => (i === 0 ? [v, xs[1]] : [xs[0], v])
  return (
    <ProfileDrawer
      open={open}
      title={copy.profileMedicareName}
      icon={<ProfileIcon icon="medicare" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildMedicare(d, seed, edit.read()), ownMedicareField)
        if (!res.saved) edit.setCheck(res.check)
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={check.elsewhere}
    >
      <p className="text-body text-stone-900">{copy.medicareExtrasIntro}</p>
      <Fact stamp="medicareExtrasByPerson">
        {([0, 1] as const).map((i) => {
          const field = i === 0 ? 'extras0' : 'extras1'
          const pick = form.picks[i]
          return (
            <section key={i} className="flex flex-col gap-3" data-extras-person={i}>
              <h3 className="text-body font-medium text-stone-900">{tablePerson(draft, i, 0, 0).label}</h3>
              <ChoiceGroup<ExtrasPick>
                legend={copy.medicareExtrasForkLegend}
                name={`medicare-extras-${i}`}
                vertical
                items={extrasItems}
                value={pick ?? null}
                disabled={readOnly}
                {...(check.fields[field] !== undefined && pick !== 'entered' ? { error: check.fields[field] } : {})}
                onValueChange={(v) => set(field, { picks: pair(form.picks, i, v) })}
              />
              {pick === 'entered' ? (
                <MoneyInput
                  label={copy.medicareExtrasAmountLabel}
                  description={copy.medicareExtrasAmountHelp}
                  value={form.amounts[i]}
                  invalidMessage={copy.profileInvalidMoney}
                  readOnly={readOnly}
                  {...(check.fields[field] !== undefined ? { error: check.fields[field] } : {})}
                  onCommit={(v) => set(field, { amounts: pair(form.amounts, i, v) })}
                />
              ) : null}
              {pick === 'typical' ? <p className="text-label text-stone-600">{copy.medicareExtrasTypicalPicked}</p> : null}
              {/* An unanswered fork after setup says what the plan prices meanwhile (the panel's standing line, re-homed by
                  RC14: its last host was the walk's fork). Never in setup: mid-answer, "it's already handled" steers toward
                  inertia, and nothing is checked on the reader's behalf. */}
              {pick === undefined && !inSetup ? (
                <p className="text-label text-stone-600" data-extras-standing="">
                  {slots.medicareExtrasPanelStanding(typical)}
                </p>
              ) : null}
            </section>
          )
        })}
      </Fact>
      {asksSeed ? (
        <Fact stamp="health.irmaaMagiSeed">
          <section className="flex flex-col gap-3 border-t border-stone-300 pt-6">
            <h3 className="text-body font-medium text-stone-900">{copy.profileMedicareIncomeHeading}</h3>
            <DrawerFields>
              <MoneyInput
                label={copy.irmaaSeedTwoBackLabel}
                description={copy.irmaaSeedHelp}
                value={form.seed[0]}
                invalidMessage={copy.profileInvalidMoney}
                readOnly={readOnly}
                {...(check.fields.seed0 !== undefined ? { error: check.fields.seed0 } : {})}
                onCommit={(v) => set('seed0', { seed: pair(form.seed, 0, v) })}
              />
              <MoneyInput
                label={copy.irmaaSeedOneBackLabel}
                value={form.seed[1]}
                invalidMessage={copy.profileInvalidMoney}
                readOnly={readOnly}
                {...(check.fields.seed1 !== undefined ? { error: check.fields.seed1 } : {})}
                onCommit={(v) => set('seed1', { seed: pair(form.seed, 1, v) })}
              />
            </DrawerFields>
          </section>
        </Fact>
      ) : null}
    </ProfileDrawer>
  )
}
