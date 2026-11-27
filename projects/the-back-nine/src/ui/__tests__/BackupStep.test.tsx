// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { copy } from '../copy'

/**
 * The backup drawer's closes (milestone 4's review, V2). Before a channel is confirmed every close (the X, Escape, the
 * scrim, "Not now") declines the invited offer: `onCancel`, nothing recorded, the lock menu's door stays. Once a channel
 * is confirmed ExportConfirm has already recorded the note, so the same closes FINISH the step: `onFinish`, which
 * IntakeApp turns into `needsBackup` false (IntakeApp.test's "finishing the backup step DISSOLVES the door" pins that
 * leg), so the lock menu loses "No backup file has been saved from this device.".
 */
const { recordSpy } = vi.hoisted(() => ({ recordSpy: vi.fn(() => Promise.resolve()) }))
vi.mock('../vaultSession', () => ({
  exportVaultFile: () => Promise.resolve({ ok: true, file: '{"stub":"backup"}' }),
  recordBackupMade: recordSpy,
}))

import { BackupStep } from '../BackupStep'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:stub')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  recordSpy.mockClear()
})

async function renderStep() {
  const onFinish = vi.fn()
  const onCancel = vi.fn()
  render(<BackupStep onFinish={onFinish} onCancel={onCancel} />)
  await screen.findByRole('link', { name: copy.exportDownload })
  return { onFinish, onCancel }
}

/** Confirm a channel the jsdom-safe way: show the text, then say it is saved. */
async function confirmByText(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: copy.exportShowText }))
  await user.click(screen.getByRole('button', { name: copy.exportTextSaved }))
  expect(recordSpy).toHaveBeenCalledTimes(1)
}

describe('BackupStep: a close after a confirmed export finishes the step', () => {
  it('Escape after the export calls onFinish, never onCancel', async () => {
    const user = userEvent.setup()
    const { onFinish, onCancel } = await renderStep()
    await confirmByText(user)
    await user.keyboard('{Escape}')
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('"Not now" after the export calls onFinish, never onCancel', async () => {
    const user = userEvent.setup()
    const { onFinish, onCancel } = await renderStep()
    await confirmByText(user)
    await user.click(screen.getByRole('button', { name: copy.backupNotNow }))
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('the control: Escape and "Not now" with nothing exported still decline (onCancel, nothing recorded)', async () => {
    const user = userEvent.setup()
    const { onFinish, onCancel } = await renderStep()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: copy.backupNotNow }))
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onFinish).not.toHaveBeenCalled()
    expect(recordSpy).not.toHaveBeenCalled()
  })
})
