// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'
import { Drawer, type DrawerProps } from '../Drawer'

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
})
