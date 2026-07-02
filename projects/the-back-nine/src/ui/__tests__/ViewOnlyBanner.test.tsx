// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ViewOnlyBanner } from '../ViewOnlyBanner'
import { copy } from '../copy'

/**
 * Fork C(ii) — the standing view-only notice. The DECISION (readOnly → key) is the seam's
 * (unlockCopy.test.ts); this covers the rendering contract: the region exists EMPTY on every
 * writable path (burned/045 — it must be mounted before it populates or the announce may not
 * fire), and populated it is a status (never an alert) carrying icon+WORD+text with the mark
 * decorative (color-blind law: the lead word, not the mark or a color, carries the state).
 */
afterEach(cleanup)

describe('ViewOnlyBanner — the standing read-only notice', () => {
  it('renders the live region EMPTY (zero content) on a writable open — mounted, never populated', () => {
    render(<ViewOnlyBanner notice={null} />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
  })

  it('populated: a status (never alert) with the lead WORD, the reload-steering text, and a decorative mark', () => {
    render(<ViewOnlyBanner notice="unlockReadOnly" />)
    const region = screen.getByRole('status')
    expect(region.textContent).toContain(copy.unlockReadOnlyLead)
    expect(region.textContent).toContain(copy.unlockReadOnly)
    // The mark is decorative — the WORD carries the state (color-blind law).
    const mark = region.querySelector('.view-only-banner__mark')
    expect(mark).not.toBeNull()
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    // A caveat on a success is never an alarm.
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
