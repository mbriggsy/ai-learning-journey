// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ColdStart } from '../coldStart'
import { copy } from '@ui/copy'

afterEach(cleanup)

describe('ColdStart — the one calm entry frame', () => {
  it("renders R1's question as the face, the orientation line, and the pre-flight note", () => {
    render(<ColdStart onBegin={() => {}} onRestore={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(copy.coldStartQuestion)
    expect(screen.getByText(copy.coldStartOrientation)).toBeTruthy()
    // The ACA sourcing-stall PRIMARY affordance (D1 affordance (a)): arrive prepared.
    expect(screen.getByText(copy.coldStartPreflight)).toBeTruthy()
  })

  it('Begin is the ONE primary action; the restore door is a quiet, subordinate whisper (not a peer)', () => {
    render(<ColdStart onBegin={() => {}} onRestore={() => {}} />)
    const begin = screen.getByRole('button', { name: copy.coldStartBegin })
    const restore = screen.getByRole('button', { name: copy.coldStartRestoreAction })
    // Visual hierarchy is load-bearing (back-nine-design: the subordinate affordance must never
    // compete with the primary action). Begin is the sole btn-primary; restore is btn-quiet.
    expect(begin).toHaveClass('btn-primary')
    expect(restore).toHaveClass('btn-quiet')
    expect(restore).not.toHaveClass('btn-primary')
    expect(screen.queryAllByRole('button').filter((b) => b.classList.contains('btn-primary'))).toHaveLength(1)
    // The whisper's prompt line sits with it (the rare returning-user cue).
    expect(screen.getByText(copy.coldStartRestorePrompt, { exact: false })).toBeTruthy()
  })

  it('Begin fires the single entry action — and never the restore door', () => {
    const onBegin = vi.fn()
    const onRestore = vi.fn()
    render(<ColdStart onBegin={onBegin} onRestore={onRestore} />)
    fireEvent.click(screen.getByRole('button', { name: copy.coldStartBegin }))
    expect(onBegin).toHaveBeenCalledTimes(1)
    expect(onRestore).not.toHaveBeenCalled()
  })

  it('the restore door fires onRestore (the wiped/evicted-device backup path) — and never Begin', () => {
    const onBegin = vi.fn()
    const onRestore = vi.fn()
    render(<ColdStart onBegin={onBegin} onRestore={onRestore} />)
    fireEvent.click(screen.getByRole('button', { name: copy.coldStartRestoreAction }))
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(onBegin).not.toHaveBeenCalled()
  })
})
