// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'
import { Drawer, type DrawerProps } from '../Drawer'
import { WholeInput } from '../NumberInputs'

/**
 * The drawer's contract (plan 3.1): it opens from its trigger (closed first, then open: the shape a real page has,
 * insight 060), reads its title from props, closes on Escape and on its X with focus back on the opener, steps
 * previous/next through its handlers, and shows no Delete or Save when no handler is passed (a read-only view, plan
 * 4.0). Focus return is pinned here against jsdom's teardown order; `e2e/csp.spec.ts`'s kit arm checks it in a real
 * browser (insight 071).
 */
afterEach(cleanup)

const base: Omit<DrawerProps, 'children'> = {
  trigger: <Button>Open salary</Button>,
  title: 'Salary',
  closeLabel: 'Close',
  cancelLabel: 'Cancel',
}

function renderDrawer(extra: Partial<DrawerProps> = {}) {
  return render(
    <Drawer {...base} {...extra}>
      <p>Body words</p>
    </Drawer>,
  )
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  expect(screen.queryByRole('dialog')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Open salary' }))
  return screen.findByRole('dialog', { name: 'Salary' })
}

describe('Drawer', () => {
  it('opens from closed, named by its title prop, inside an .rc-root portal', async () => {
    const user = userEvent.setup()
    renderDrawer()
    const dialog = await open(user)
    expect(dialog).toHaveTextContent('Body words')
    expect(dialog.closest('.rc-root')).not.toBeNull()
  })

  it('Escape closes it and focus returns to the opener', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await open(user)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open salary' })).toHaveFocus())
  })

  it('the X closes it and focus returns to the opener', async () => {
    const user = userEvent.setup()
    renderDrawer()
    const dialog = await open(user)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open salary' })).toHaveFocus())
  })

  it('previous and next call their handlers and keep it open', async () => {
    const user = userEvent.setup()
    const previous = vi.fn()
    const next = vi.fn()
    renderDrawer({ previous: { label: 'Previous record', onSelect: previous }, next: { label: 'Next record', onSelect: next } })
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Previous record' }))
    await user.click(screen.getByRole('button', { name: 'Next record' }))
    expect(previous).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Salary' })).toBeInTheDocument()
  })

  it('read-only: no Delete and no Save without their handlers; Cancel still closes', async () => {
    const user = userEvent.setup()
    renderDrawer({ deleteLabel: 'Delete', saveLabel: 'Save' })
    await open(user)
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('Delete and Save show with their handlers; Save closes unless it returns false', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    let accept = false
    const onSave = vi.fn(() => accept)
    renderDrawer({ deleteLabel: 'Delete', onDelete, saveLabel: 'Save', onSave })
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Salary' })).toBeInTheDocument() // refused: stays open
    accept = true
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('onCancel runs on every close that is not Save or Delete: Cancel, the X and Escape, once each', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderDrawer({ onCancel, saveLabel: 'Save', onSave: () => {} })
    for (const close of [
      () => user.click(screen.getByRole('button', { name: 'Cancel' })),
      () => user.click(screen.getByRole('button', { name: 'Close' })),
      () => user.keyboard('{Escape}'),
    ]) {
      await open(user)
      await close()
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    }
    expect(onCancel).toHaveBeenCalledTimes(3)
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onCancel, 'Save is not a cancel').toHaveBeenCalledTimes(3)
  })

  // Milestone 3's review, X1: Save blurs the focused box first (its commit lands), and never calls onSave while a box
  // holds text it refused; the drawer stays open with the box's words under it.
  it('Save commits the focused box, then calls no onSave past a box holding text it refused', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(() => true)
    const onCommit = vi.fn()
    render(
      <Drawer {...base} saveLabel="Save" onSave={onSave}>
        <WholeInput label="Through year" value={undefined} invalidMessage="Not a whole number." onCommit={onCommit} />
      </Drawer>,
    )
    const dialog = await open(user)
    const box = within(dialog).getByLabelText('Through year')
    act(() => box.focus())
    fireEvent.change(box, { target: { value: '2.5' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(box).toHaveAttribute('data-typed-refused')
    expect(within(dialog).getByText('Not a whole number.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Salary' })).toBeInTheDocument()
    // Fixed and still focused: the press commits it, then saves.
    act(() => box.focus())
    fireEvent.change(box, { target: { value: '3' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(onCommit).toHaveBeenLastCalledWith(3)
    expect(onSave).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  // Milestone 3's review, round 2: a press focuses Save, so Save never blurs itself; a refusal sends focus to the box.
  it('a real press on Save past a refused box: focus lands on the box, which keeps its mark and its words', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(() => true)
    render(
      <Drawer {...base} saveLabel="Save" onSave={onSave}>
        <WholeInput label="Through year" value={undefined} invalidMessage="Not a whole number." onCommit={() => {}} />
      </Drawer>,
    )
    const dialog = await open(user)
    const box = within(dialog).getByLabelText('Through year')
    await user.click(box)
    await user.keyboard('2.5')
    await user.click(within(dialog).getByRole('button', { name: 'Save' })) // the press blurs the box, then focuses Save
    expect(onSave).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(box)
    expect(box).toHaveAttribute('data-typed-refused')
    expect(within(dialog).getByText('Not a whole number.')).toBeInTheDocument()
  })

  it('a valid press on Save never blurs Save itself (focus stays on it while onSave runs)', async () => {
    const user = userEvent.setup()
    let focusedDuringSave: Element | null = null
    const onSave = vi.fn(() => {
      focusedDuringSave = document.activeElement
      return false
    })
    render(
      <Drawer {...base} saveLabel="Save" onSave={onSave}>
        <p>Body words</p>
      </Drawer>,
    )
    const dialog = await open(user)
    const save = within(dialog).getByRole('button', { name: 'Save' })
    await user.click(save)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(focusedDuringSave).toBe(save)
    expect(document.activeElement).toBe(save)
  })
})
