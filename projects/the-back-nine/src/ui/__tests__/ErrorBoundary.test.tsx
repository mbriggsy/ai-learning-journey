// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppErrorBoundary } from '../ErrorBoundary'
import { copy } from '../copy'

/**
 * The calm last-resort boundary (ultramode review 2026-07-02). A rejected React.lazy chunk import
 * re-throws through Suspense and — without this boundary — unmounts the whole tree to a blank
 * screen (and lazy CACHES the rejection, so it is sticky). The boundary must degrade that to a
 * calm reload affordance, never a blank page, never "damaged".
 */

function Thrower(): never {
  throw new Error('chunk load failed')
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AppErrorBoundary — the blank-screen backstop', () => {
  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>healthy tree</p>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('healthy tree')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a render throw degrades to the calm reload surface — never a blank unmount', () => {
    // React logs the caught error to console.error by design — silence it for a clean run.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AppErrorBoundary>
        <Thrower />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: copy.appTitle, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toBe(copy.unlockGeneric)
    expect(screen.getByRole('button', { name: copy.restoreRetry })).toBeInTheDocument()
    // The calm law: the last-resort surface never asserts damage.
    expect(screen.getByRole('alert').textContent).not.toBe(copy.unlockDataDamaged)
  })
})
