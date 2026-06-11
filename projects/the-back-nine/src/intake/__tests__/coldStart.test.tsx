// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ColdStart } from '../coldStart'
import { copy } from '@ui/copy'

afterEach(cleanup)

describe('ColdStart — the one calm entry frame', () => {
  it("renders R1's question as the face, the orientation line, the pre-flight note, and ONE action", () => {
    render(<ColdStart onBegin={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(copy.coldStartQuestion)
    expect(screen.getByText(copy.coldStartOrientation)).toBeTruthy()
    // The ACA sourcing-stall PRIMARY affordance (D1 affordance (a)): arrive prepared.
    expect(screen.getByText(copy.coldStartPreflight)).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('Begin fires the single entry action', () => {
    const onBegin = vi.fn()
    render(<ColdStart onBegin={onBegin} />)
    fireEvent.click(screen.getByRole('button', { name: copy.coldStartBegin }))
    expect(onBegin).toHaveBeenCalledTimes(1)
  })
})
