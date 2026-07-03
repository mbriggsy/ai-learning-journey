// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { copy } from '../copy'

/**
 * ExportConfirm records the off-device backup SENTINEL on EVERY confirmed channel — the download
 * click, a copy success, and the show-the-text confirmation — fire-and-forget. The vaultSession seam
 * is mocked: exportVaultFile returns a ready file so the channels enable, and recordBackupMade is a
 * spy we assert against (insight 066 — the seam is echoed as a real call, not a swallowing marker).
 * The mandatory-gate mechanics (Finish stays aria-disabled until a channel clears) live in the
 * SaveFlow seam + the live Playwright pass; this file owns only the new sentinel wiring.
 */
const { recordSpy } = vi.hoisted(() => ({ recordSpy: vi.fn(() => Promise.resolve()) }))
vi.mock('../vaultSession', () => ({
  exportVaultFile: () => Promise.resolve({ ok: true, file: '{"stub":"backup"}' }),
  recordBackupMade: recordSpy,
}))

import { ExportConfirm } from '../ExportConfirm'

const announcer = { announce: vi.fn() }

beforeEach(() => {
  // jsdom implements neither — the download channel builds a Blob object URL, and copy uses the
  // Async Clipboard API. Provide both so the confirmed channels can actually fire.
  URL.createObjectURL = vi.fn(() => 'blob:stub')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  recordSpy.mockClear()
  announcer.announce.mockClear()
})

/** Render and wait for the file to load in (the channels enable once exportVaultFile resolves). */
async function renderReady() {
  render(<ExportConfirm announcer={announcer} onFinish={vi.fn()} />)
  await screen.findByRole('link', { name: copy.exportDownload })
}

describe('ExportConfirm — every confirmed channel records the backup sentinel (fire-and-forget)', () => {
  it('the DOWNLOAD click records once', async () => {
    await renderReady()
    fireEvent.click(screen.getByRole('link', { name: copy.exportDownload }))
    await waitFor(() => expect(recordSpy).toHaveBeenCalledTimes(1))
  })

  it('a COPY success records once', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    })
    await renderReady()
    fireEvent.click(screen.getByRole('button', { name: copy.exportCopy }))
    await waitFor(() => expect(recordSpy).toHaveBeenCalledTimes(1))
  })

  it('the SHOW-THE-TEXT confirmation records once', async () => {
    await renderReady()
    fireEvent.click(screen.getByRole('button', { name: copy.exportShowText }))
    fireEvent.click(screen.getByRole('button', { name: copy.exportTextSaved }))
    await waitFor(() => expect(recordSpy).toHaveBeenCalledTimes(1))
  })

  it('a COPY FAILURE steers to the text fallback and records NOTHING (no channel was confirmed)', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('blocked')) },
    })
    await renderReady()
    fireEvent.click(screen.getByRole('button', { name: copy.exportCopy }))
    // The fallback text area appears; the sentinel is only written by a CONFIRMED channel.
    await screen.findByRole('textbox')
    expect(recordSpy).not.toHaveBeenCalled()
  })
})

describe('ExportConfirm — the quiet escape is INVITED-mount-only (ultramode 2026-07-03)', () => {
  it('WITHOUT onCancel (the mandatory first-save ceremony) there is NO "Not now" — the gate stays un-skippable', async () => {
    await renderReady()
    expect(screen.queryByRole('button', { name: copy.backupNotNow })).toBeNull()
  })

  it('WITH onCancel (the re-offer door) "Not now" renders, fires the escape, and records NOTHING', async () => {
    const onCancel = vi.fn()
    render(<ExportConfirm announcer={announcer} onFinish={vi.fn()} onCancel={onCancel} />)
    await screen.findByRole('link', { name: copy.exportDownload })
    fireEvent.click(screen.getByRole('button', { name: copy.backupNotNow }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    // Declining is not a confirmed channel: the sentinel must not be written.
    expect(recordSpy).not.toHaveBeenCalled()
  })
})
