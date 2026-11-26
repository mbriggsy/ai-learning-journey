// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRef, useSyncExternalStore } from 'react'
import { unsavedBuffersHeld } from '@intake/unsavedBuffer'
import type { MemoryModel } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { ProfilePages } from '../ProfilePages'
import type { ProfileScreenId } from '../profileView'
import type { DrawerLeaveAsk } from '../drawers/ProfileDrawer'
import { profileStore } from './profileStore'

/**
 * The Profile drawer frame (Act 6 · RC13a; `ProfileDrawer.tsx`), in its real host, mounted closed and opened by a card
 * (the app's own shape, insight 060). A refused Save shows its words under the field and keeps the drawer open with the
 * store untouched; a dismiss over unsaved changes never drops them silently (it asks, inside the drawer); the buffer
 * holds the leave-page guard only while it holds changes (insight 112); a passed Save writes once and hands focus back
 * to the card; a read-only tab offers no write; Delete asks for a second press; the shell's Back ask is asked inside
 * the drawer, in the drawer's words.
 */
afterEach(cleanup)

function Host({ model, screen: s, readOnly = false, leaveAsk }: { readonly model: MemoryModel; readonly screen: ProfileScreenId; readonly readOnly?: boolean; readonly leaveAsk?: DrawerLeaveAsk }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const headingRef = createRef<HTMLHeadingElement>()
  return (
    <ProfilePages
      screen={s}
      draft={snap.draft}
      model={model}
      readOnly={readOnly}
      headingRef={headingRef}
      agedBalancesYear={undefined}
      caveat={['Caveat.']}
      answer={snap.answer}
      refiguring={snap.refiguring}
      anchor={{ startCalendarYear: snap.draft.startCalendarYear, yearsSincePlanBuilt: 0 }}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      onDrawerOpen={() => {}}
    />
  )
}

const card = (id: string) => document.querySelector<HTMLElement>(`[data-profile-card="${id}"]`)!

function openSs(model: MemoryModel) {
  render(<Host model={model} screen="profile-income" />)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(card('ss-0'))
  return screen.getByRole('dialog', { name: 'Alex’s Social Security' })
}

/** Type as a person does: focus, the text, and (unless `keepFocus`) the blur that commits it. */
function type(field: HTMLElement, text: string, keepFocus = false) {
  act(() => field.focus())
  fireEvent.change(field, { target: { value: text } })
  if (!keepFocus) act(() => field.blur())
}

describe('Save', () => {
  it('a refused figure: its words under its field, the drawer open, the store untouched, nothing recomputed', () => {
    const { model, recompute } = profileStore(DEV_SEEDS.retired)
    const before = model.getSnapshot().draft
    const dialog = openSs(model)
    const field = within(dialog).getByLabelText(copy.ssAmountLabel)
    type(field, '30,000')
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave }))
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByRole('alert')).toHaveTextContent(copy.errPiaCeiling)
    expect(field.getAttribute('aria-describedby') ?? '').toContain(within(dialog).getByRole('alert').id)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
    // Edited again, the refusal is forgiven at once.
    type(field, '2,600')
    expect(within(dialog).queryByRole('alert')).toBeNull()
  })

  it('a figure typed and never blurred is part of the Save; one commit, one recompute, focus back on the card', async () => {
    const { model, recompute } = profileStore(DEV_SEEDS.retired)
    const dialog = openSs(model)
    type(within(dialog).getByLabelText(copy.ssAmountLabel), '2,600', true)
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave }))
    expect(model.getSnapshot().draft.people[0].pia).toBe(31_200)
    expect(recompute).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(card('ss-0')).toHaveFocus())
    expect(card('ss-0')).toHaveTextContent('$2,600')
  })
})

describe('dismiss', () => {
  it('with nothing changed, Escape closes', async () => {
    const { model } = profileStore(DEV_SEEDS.retired)
    openSs(model)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('over a figure still being typed, Escape asks first, inside the drawer; Keep editing keeps it; Drop the changes closes with the store untouched', async () => {
    const { model, recompute } = profileStore(DEV_SEEDS.retired)
    const before = model.getSnapshot().draft
    const dialog = openSs(model)
    const field = within(dialog).getByLabelText(copy.ssAmountLabel)
    type(field, '2,600', true)
    // Typed text not yet committed holds the leave guard (RC13b): a browser Back blurs nothing, so it must ask first.
    expect(unsavedBuffersHeld(), 'typed text holds the leave guard while it is being typed').toBe(1)
    fireEvent.keyDown(field, { key: 'Escape' })
    // The focused field committed first, so the figure being typed counts as an unsaved change.
    const ask = await screen.findByText(copy.profileUnsavedAsk)
    expect(ask.closest('[role="alert"]')).not.toBeNull()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(unsavedBuffersHeld(), 'the open buffer holds the leave-page guard').toBe(1)
    expect(screen.getByRole('button', { name: copy.profileUnsavedKeep })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: copy.profileUnsavedKeep }))
    expect(screen.queryByText(copy.profileUnsavedAsk)).toBeNull()
    expect(within(dialog).getByLabelText(copy.ssAmountLabel)).toHaveValue('2,600')
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerCancel }))
    await screen.findByText(copy.profileUnsavedAsk)
    fireEvent.click(screen.getByRole('button', { name: copy.profileUnsavedDrop }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
    expect(unsavedBuffersHeld(), 'a closed drawer holds nothing').toBe(0)
  })

  it('the shell’s Back ask is asked inside the drawer, in the drawer’s words', () => {
    const { model } = profileStore(DEV_SEEDS.retired)
    const onGo = vi.fn()
    const onStay = vi.fn()
    const leaveAsk = { lines: [copy.workbenchLeaveAsk], onGo, onStay }
    const view = render(<Host model={model} screen="profile-income" />)
    fireEvent.click(card('ss-0'))
    view.rerender(<Host model={model} screen="profile-income" leaveAsk={leaveAsk} />)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(copy.profileLeaveAskUnsaved)).toBeInTheDocument()
    expect(within(dialog).queryByText(copy.workbenchLeaveAsk)).toBeNull()
    expect(within(dialog).getByRole('button', { name: copy.workbenchLeaveStay })).toHaveFocus()
    fireEvent.click(within(dialog).getByRole('button', { name: copy.workbenchLeaveGo }))
    expect(onGo).toHaveBeenCalledTimes(1)
  })
})

describe('read-only and Delete', () => {
  it('read-only: no Add menu, and a drawer with no Save or Delete whose fields take no edit', () => {
    const { model } = profileStore(DEV_SEEDS.date)
    render(<Host model={model} screen="profile-net-worth" readOnly />)
    expect(screen.queryByRole('button', { name: copy.profileAddAccount })).toBeNull()
    fireEvent.click(card('account-0'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: copy.profileDrawerSave })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: copy.profileDrawerDelete })).toBeNull()
    expect(within(dialog).getByLabelText(copy.accountValueLabel)).toHaveAttribute('readonly')
  })

  it('Delete asks for a second press, then removes the account and closes', async () => {
    const { model, recompute } = profileStore(DEV_SEEDS.date)
    render(<Host model={model} screen="profile-net-worth" />)
    fireEvent.click(card('account-1'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerDelete }))
    expect(model.getSnapshot().draft.enteredAccounts).toHaveLength(2)
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerDeleteConfirm }))
    expect(model.getSnapshot().draft.enteredAccounts.map((a) => a.id)).toEqual(['acct-0-401k'])
    expect(recompute).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  // Milestone 3's review, X11: the cards key by index, so the deleted card's node stays as the next record's card; focus
  // goes to the page's heading, never there.
  it('Delete of the first of two accounts sends focus to the page’s heading, never the next record’s card', async () => {
    const { model } = profileStore(DEV_SEEDS.date)
    render(<Host model={model} screen="profile-net-worth" />)
    const opener = card('account-0')
    act(() => opener.focus())
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerDelete }))
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerDeleteConfirm }))
    expect(model.getSnapshot().draft.enteredAccounts).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(card('account-0'), '[test setup] the next record now holds the first card').not.toBeNull()
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^H[1-6]$/))
    expect(document.activeElement?.closest('[data-profile-card]')).toBeNull()
  })
})

describe('a birth year moved (milestone 3’s review, round 2): the drawer names what it would shift, and never blocks Save', () => {
  it('Sam born 1960, not 1961: the claim year’s move named in the notice; Save writes the birth year and keeps the claim age', () => {
    const { model, recompute } = profileStore(DEV_SEEDS.retired)
    render(<Host model={model} screen="profile-family" />)
    fireEvent.click(card('person-1'))
    const dialog = screen.getByRole('dialog', { name: 'Sam' })
    expect(within(dialog).queryByRole('status')).toBeNull()
    type(within(dialog).getByLabelText(copy.birthYearLabel), '1960')
    expect(within(dialog).getByRole('status')).toHaveTextContent(slots.profileMoveClaimYear('Sam’s Social Security', 2027, 2028, 67))
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave }))
    expect(model.getSnapshot().draft.people[1]).toMatchObject({ birthYear: 1960, currentAge: 66, socialSecurityClaimAge: 67 })
    expect(recompute).toHaveBeenCalledTimes(1)
  })

  // Milestone 3's review, round 3: the box commits on blur, and a pointer's press on Save blurs it in that same press, so
  // a notice drawn from the committed year alone showed under the pressed button and closed with the drawer. It stands
  // from the typed text, before any blur; the blur then commits the year and the notice holds.
  it('the notice stands while the year is still being typed, before the box commits', () => {
    const { model } = profileStore(DEV_SEEDS.retired)
    render(<Host model={model} screen="profile-family" />)
    fireEvent.click(card('person-1'))
    const dialog = screen.getByRole('dialog', { name: 'Sam' })
    const box = within(dialog).getByLabelText(copy.birthYearLabel)
    type(box, '196', true)
    expect(within(dialog).queryByRole('status'), 'three digits are no year yet').toBeNull()
    type(box, '1960', true)
    expect(within(dialog).getByRole('status')).toHaveTextContent(slots.profileMoveClaimYear('Sam’s Social Security', 2027, 2028, 67))
    expect(model.getSnapshot().draft.people[1].birthYear, 'nothing written while typing').toBe(DEV_SEEDS.retired.people[1].birthYear)
    act(() => box.blur())
    expect(within(dialog).getByRole('status')).toHaveTextContent(slots.profileMoveClaimYear('Sam’s Social Security', 2027, 2028, 67))
  })
})

describe('the widow’s number (R40), on the Income card that shows the stream', () => {
  it('a pension with a survivor share reads as what the other one keeps, in words, never a raw share (Act 6 · RC14 gave it this home)', () => {
    const start = {
      ...DEV_SEEDS.retired,
      people: [{ ...DEV_SEEDS.retired.people[0], name: 'Alex' }, { ...DEV_SEEDS.retired.people[1], name: 'Sam' }] as typeof DEV_SEEDS.retired.people,
      incomeStreams: [{ ownerIndex: 1 as const, type: 'pension' as const, annualRealToday: 18_000, startAge: 60, colaMode: 'real-flat' as const, survivorPct: 0.5 }],
    }
    const { model } = profileStore(start)
    render(<Host model={model} screen="profile-income" />)
    const pension = card('income-0')
    // Typed by hand from the slot's own words (`slots.incomeSurvivorNote`): Alex keeps half of Sam's pension.
    expect(pension).toHaveTextContent('Alex would keep')
    expect(pension).toHaveTextContent('50%')
    expect(pension.textContent).not.toContain('0.5')
  })
})

describe('Blueprint (Act 6 · RC15): a tile opens its Profile card’s own drawer', () => {
  it('Net Worth: an account tile opens the account drawer on what it holds; Escape hands focus back to the tile', async () => {
    const { model } = profileStore(DEV_SEEDS.date)
    render(<Host model={model} screen="profile-blueprint" />)
    const tile = card('account-0')
    expect(tile).toHaveTextContent(copy.investBucketPretax)
    act(() => tile.focus())
    fireEvent.click(tile)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(copy.accountValueLabel)).toBeInTheDocument()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(card('account-0')).toHaveFocus())
  })

  it('Goals: a Medicare tile opens the Medicare drawer, each person’s tile its own focus home; Income, Savings, Expenses: the Social Security tile opens the person’s Social Security drawer', () => {
    const { model } = profileStore(DEV_SEEDS.retired)
    render(<Host model={model} screen="profile-blueprint" />)
    fireEvent.click(screen.getByRole('tab', { name: copy.shellPageGoals }))
    expect(card('medicare-0')).toBeInTheDocument()
    expect(card('medicare-1')).toBeInTheDocument()
    fireEvent.click(card('medicare-1'))
    expect(screen.getByRole('dialog', { name: copy.profileMedicareName })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    cleanup()
    render(<Host model={model} screen="profile-blueprint" />)
    fireEvent.click(screen.getByRole('tab', { name: copy.blueprintTabIse }))
    fireEvent.click(card('ss-0'))
    expect(screen.getByRole('dialog', { name: 'Alex’s Social Security' })).toBeInTheDocument()
  })

  it('read-only: no Add menu on any tab; Edit (which writes nothing) stays', () => {
    const { model } = profileStore(DEV_SEEDS.date)
    render(<Host model={model} screen="profile-blueprint" readOnly />)
    for (const tab of [copy.shellPageNetWorth, copy.shellPageGoals, copy.blueprintTabIse]) {
      fireEvent.click(screen.getByRole('tab', { name: tab }))
      expect(screen.queryByRole('button', { name: copy.profileAddAccount })).toBeNull()
      expect(screen.queryByRole('button', { name: copy.blueprintAdd })).toBeNull()
      expect(screen.getByRole('button', { name: copy.blueprintEdit })).toBeInTheDocument()
    }
  })

  it('Edit hides a category’s tiles and says so; showing it again brings them back', () => {
    const { model } = profileStore(DEV_SEEDS.date)
    render(<Host model={model} screen="profile-blueprint" />)
    expect(card('account-1')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.blueprintEdit }))
    fireEvent.click(screen.getByRole('checkbox', { name: copy.investBucketRoth }))
    expect(document.querySelector('[data-profile-card="account-1"]')).toBeNull()
    expect(screen.getByText(slots.bpHidden([copy.investBucketRoth]))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: copy.investBucketRoth }))
    expect(card('account-1')).not.toBeNull()
  })
})
