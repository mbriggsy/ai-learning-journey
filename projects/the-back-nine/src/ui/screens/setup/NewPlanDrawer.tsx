/**
 * src/ui/screens/setup/NewPlanDrawer.tsx: "Start a new plan" (Act 6 · RC14; ref 1.3 step 1; `rc-shell/dataentry-02.png`,
 * RightCapital's "New financial plan"): the two first names, then the stepper. B9 holds a first name per person and
 * nothing else of RightCapital's form (no last name, no email: D7, every field the engine or the screens read, no other).
 *
 * In the frame every Profile drawer opens in (`ProfileDrawer.tsx`): buffered (the store's draft moves only on Start), the
 * title takes focus on open, a dismiss over typed names asks first, and its buffer holds the leave guard. The names are
 * written the way the Family drawer writes them (`buildPerson`: the field's own trimmed commit), so a name entered here
 * reads exactly as one entered there. Both are optional, as the walk's were: Start with none still opens the stepper,
 * and each person reads "You" or "Your spouse" until named.
 */
import { useState } from 'react'
import { NAME_CEILING } from '@shared/nameBounds'
import type { MemoryModel } from '@store/memoryModel'
import { DrawerFields, TextInput } from '../../kit'
import { copy } from '../../copy'
import { buildPerson, personFormFrom } from '../profile/drawers/familyFields'
import { commitEdit } from '../profile/drawers/drawerSave'
import { ProfileDrawer } from '../profile/drawers/ProfileDrawer'
import { useDrawerBuffer } from '../profile/drawers/useDrawerBuffer'
import { ProfileIcon } from '../profile/profileIcons'

interface NamesForm {
  readonly you: string | undefined
  readonly spouse: string | undefined
}

export interface NewPlanDrawerProps {
  readonly model: MemoryModel
  readonly open: boolean
  /** Start pressed: the names are in the plan. */
  readonly onStart: () => void
  /** Cancel, the X, Escape or the scrim, with nothing typed or the typing dropped: back where the new plan began. */
  readonly onCancel: () => void
  readonly onClosed: () => void
  readonly finalFocus: () => HTMLElement | null
}

export function NewPlanDrawer({ model, open, onStart, onCancel, onClosed, finalFocus }: NewPlanDrawerProps) {
  const [seed] = useState<NamesForm>(() => {
    const d = model.getSnapshot().draft
    return { you: d.people[0].name, spouse: d.people[1].name }
  })
  const buffer = useDrawerBuffer(seed, open)
  const { form, patch } = buffer
  return (
    <ProfileDrawer
      open={open}
      title={copy.setupNewPlanTitle}
      icon={<ProfileIcon icon="person" />}
      readOnly={false}
      isDirty={buffer.isDirty}
      saveLabel={copy.setupNewPlanStart}
      onSave={() => {
        const before = model.getSnapshot().draft
        const names = buffer.read()
        let after = before
        for (const [i, name] of [
          [0, names.you],
          [1, names.spouse],
        ] as const) {
          const s = personFormFrom(after, i)
          const built = buildPerson(after, i, s, { ...s, name })
          if (built.ok) after = built.draft
        }
        commitEdit(model, before, after)
        // The stepper closes this drawer (false: the frame must not run its own close, which is Cancel's way back).
        onStart()
        return false
      }}
      onClose={onCancel}
      onClosed={onClosed}
      finalFocus={finalFocus}
    >
      <p className="text-body text-stone-900">{copy.setupNewPlanNote}</p>
      <DrawerFields>
        <TextInput
          label={copy.setupNameYou}
          value={form.you}
          maxLength={NAME_CEILING}
          autoComplete="given-name"
          onCommit={(you) => patch({ you })}
        />
        <TextInput label={copy.setupNameSpouse} value={form.spouse} maxLength={NAME_CEILING} autoComplete="off" onCommit={(spouse) => patch({ spouse })} />
      </DrawerFields>
    </ProfileDrawer>
  )
}
