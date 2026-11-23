// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RoomSlot } from '../RoomSlot'
import { copy } from '../../copy'

/**
 * The workbench room's loader (Act 5, U6; KTD31, insights 053 and 054): a failed chunk load shows the
 * room's own retry inside the front room, the retry loads the room with no page reload, and only a
 * failure after a retry offers the reload. "Back to your answer" stands on every failure.
 */

afterEach(cleanup)

const room = (onBack = vi.fn()) => ({ save: { kind: 'none' } as const, onBack })
const realRoom = () => import('../WorkbenchRoom')
const chunkMiss = () => Promise.reject(new TypeError('Failed to fetch dynamically imported module'))

// React logs every error a boundary catches; the boundary is the thing under test.
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('RoomSlot — the room loads on demand behind its own boundary', () => {
  it('a failed load shows the retry and the way back; the retry loads the room with no reload', async () => {
    const load = vi.fn().mockImplementationOnce(chunkMiss).mockImplementation(realRoom)
    render(<RoomSlot room={room()} load={load} />)
    expect(await screen.findByText(copy.workbenchLoadFailed)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.workbenchBack })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.restoreRetry })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.exportRetry }))
    // The room itself, in the same mounted tree: a fresh import, never a page reload.
    expect(await screen.findByRole('heading', { name: copy.workbenchHeading })).toBeInTheDocument()
    expect(screen.queryByText(copy.workbenchLoadFailed)).toBeNull()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('a failure after a retry offers the reload (some browsers keep a failed load for the visit); Back still works', async () => {
    const onBack = vi.fn()
    const load = vi.fn().mockImplementation(chunkMiss)
    render(<RoomSlot room={room(onBack)} load={load} />)
    fireEvent.click(await screen.findByRole('button', { name: copy.exportRetry }))
    expect(await screen.findByText(copy.workbenchLoadFailedAgain)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.restoreRetry })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.exportRetry })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.workbenchBack }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
