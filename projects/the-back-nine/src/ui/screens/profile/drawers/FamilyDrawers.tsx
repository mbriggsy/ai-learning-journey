/**
 * src/ui/screens/profile/drawers/FamilyDrawers.tsx: Family's drawers (Act 6 · RC13a): a person (first name, birth year,
 * sex, still working or retired, and the age they stopped if retired) and the home state. The fields are the walk's
 * names, work and state steps' own, in their order and words; the writes are `familyFields.ts`'s, the frame's
 * `ProfileDrawer.tsx`. Every field the engine reads, and no other (D7).
 */
import { useState } from 'react'
import { NAME_CEILING } from '@shared/nameBounds'
import type { RetirementState, Sex, WorkStatus } from '@shared/model'
import { DrawerFields, Select, TextInput, WholeInput } from '../../../kit'
import { copy } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import { ProfileIcon } from '../profileIcons'
import { stateLabel } from '../profileView'
import { buildPerson, buildState, ownNothing, ownPersonField, personFormFrom, stateFormFrom, type PersonField, type PersonForm, type StateForm } from './familyFields'
import { saveEdit } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'

const SEX_ITEMS = [
  { value: 'male', label: copy.sexMale },
  { value: 'female', label: copy.sexFemale },
] as const satisfies readonly { value: Sex; label: string }[]

const WORK_ITEMS = [
  { value: 'working', label: copy.workStatusWorking },
  { value: 'retired', label: copy.workStatusRetired },
] as const satisfies readonly { value: WorkStatus; label: string }[]

/** The priced roster and the honest "somewhere else" (the walk's picker's own arms, `questions.tsx`). */
const STATE_ITEMS: readonly { value: RetirementState; label: string }[] = (['NC', 'PA', 'FL', 'elsewhere'] as const).map((s) => ({ value: s, label: stateLabel(s) }))

export function PersonDrawer({ index, model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus }: DrawerBodyProps & { readonly index: 0 | 1 }) {
  const [seed] = useState<PersonForm>(() => personFormFrom(model.getSnapshot().draft, index))
  const edit = useDrawerEdit<PersonForm, PersonField>(seed, open)
  const { form, check, set } = edit
  const title = tablePerson(model.getSnapshot().draft, index, 0, 0).label
  return (
    <ProfileDrawer
      open={open}
      title={title}
      icon={<ProfileIcon icon="person" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildPerson(d, index, seed, edit.read()), ownPersonField(index))
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
        <TextInput
          label={copy.nameLabel}
          value={form.name}
          maxLength={NAME_CEILING}
          autoComplete={index === 0 ? 'given-name' : 'off'}
          readOnly={readOnly}
          onCommit={(name) => set('name', { name })}
        />
        <WholeInput
          label={copy.birthYearLabel}
          value={form.birthYear}
          invalidMessage={copy.profileInvalidYear}
          readOnly={readOnly}
          {...(check.fields.birthYear !== undefined ? { error: check.fields.birthYear } : {})}
          onCommit={(birthYear) => set('birthYear', { birthYear })}
        />
        <div className="flex flex-col gap-1">
          <Select<Sex>
            label={copy.sexLegend}
            items={SEX_ITEMS}
            value={form.sex ?? null}
            placeholder={copy.profileChoose}
            disabled={readOnly}
            onValueChange={(sex) => set('sex', { sex })}
          />
          <p className="text-label text-stone-600">{copy.sexHelp}</p>
        </div>
        <Select<WorkStatus>
          label={copy.workStatusLegend}
          items={WORK_ITEMS}
          value={form.workStatus ?? null}
          placeholder={copy.profileChoose}
          disabled={readOnly}
          onValueChange={(workStatus) => set('workStatus', { workStatus })}
        />
        {form.workStatus === 'retired' ? (
          <WholeInput
            label={copy.stopAgeLabel}
            description={copy.stopAgeHelp}
            value={form.retirementAge}
            invalidMessage={copy.profileInvalidAge}
            readOnly={readOnly}
            {...(check.fields.retirementAge !== undefined ? { error: check.fields.retirementAge } : {})}
            onCommit={(retirementAge) => set('retirementAge', { retirementAge })}
          />
        ) : null}
      </DrawerFields>
    </ProfileDrawer>
  )
}

export function StateDrawer({ model, open, readOnly, leaveAsk, onClose, onClosed, finalFocus }: DrawerBodyProps) {
  const [seed] = useState<StateForm>(() => stateFormFrom(model.getSnapshot().draft))
  const edit = useDrawerEdit<StateForm, 'state'>(seed, open)
  return (
    <ProfileDrawer
      open={open}
      title={copy.profileHomeStateName}
      icon={<ProfileIcon icon="state" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildState(d, seed, edit.read()), ownNothing)
        if (!res.saved) edit.setCheck(res.check)
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={edit.check.elsewhere}
    >
      <p className="text-body text-stone-900">{copy.stateResidenceLead}</p>
      <Select<RetirementState>
        label={copy.profileStateLabel}
        items={STATE_ITEMS}
        // A recognised-but-unpriced state rides "somewhere else" until built, as the picker shows it (`stateLabel`).
        value={edit.form.state === undefined ? null : STATE_ITEMS.some((s) => s.value === edit.form.state) ? edit.form.state : 'elsewhere'}
        placeholder={copy.profileNotAnswered}
        disabled={readOnly}
        onValueChange={(state) => edit.set('state', { state })}
      />
      <p className="text-label text-stone-600">{copy.stateResidenceHelp}</p>
    </ProfileDrawer>
  )
}
