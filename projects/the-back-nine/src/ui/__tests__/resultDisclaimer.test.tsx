// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { staticDisclosures } from '../copy'

/**
 * The IN-FRAME R13 disclaimer contract ("buttons drop below" — Briggsy's fork call, council
 * 2026-07-08, wf_a2d93977-960 — the Honesty-Hawk's veto made structural):
 *
 *  1. ORDER — the in-frame disclaimer precedes the quiet-door row in DOM order, so the doors
 *     (never the honesty caveat) are what any overflow pushes past the fold. The page-trailing
 *     App mount is the structural FIRST casualty of overflow; this mount is why it never comes
 *     to that on the result screen.
 *  2. MIRROR — `data-inframe-disclaimer` on main.result is present exactly when the in-frame
 *     mount is rendered (both ride the withheld-while-computing actions row). app.css hides the
 *     trailing mount behind that attribute at the laptop tier, so the attribute-without-mount
 *     (a ZERO-visible-disclaimer frame) and mount-without-attribute (a doubled disclaimer) are
 *     both unrepresentable — but only if this mirror holds.
 *  3. ONE SOURCE — the in-frame mount renders the same staticDisclosures strings as the App
 *     mount (the words can never fork).
 *
 * The per-viewport VISIBILITY swap (in-frame hidden on the phone, trailing hidden at the laptop
 * tier) is CSS @media behavior jsdom cannot compute — that half of the contract belongs to the
 * real-browser vertical-fit gate (council-mandated Playwright project), not this file.
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey) }
})

// jsdom has no matchMedia (the sheets' useReducedMotion reads it) — benign stub.
vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

const mockFocusKey = vi.mocked(resolvedFocusKey)
const pristineDraft = appModel.getSnapshot().draft

afterEach(() => {
  cleanup()
  appModel.update(() => pristineDraft) // the module singleton must not leak between tests
  mockFocusKey.mockReset()
  vi.restoreAllMocks()
})

const renderResult = (computing = false) =>
  render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={computing} />)

const plantResolved = () => mockFocusKey.mockReturnValue('planted-focus-key')

const inFrameDisclaimer = (container: HTMLElement) =>
  container.querySelector('main.result .disclaimer--in-frame')

describe('the in-frame R13 disclaimer (the Hawk order contract)', () => {
  it('renders INSIDE the result, DOM-ordered BEFORE the quiet-door row', () => {
    plantResolved()
    const { container } = renderResult()
    const disclaimer = inFrameDisclaimer(container)
    const doors = container.querySelector('.result-quiet-row')
    expect(disclaimer).not.toBeNull()
    expect(doors).not.toBeNull()
    // compareDocumentPosition: FOLLOWING = the argument comes AFTER the receiver.
    expect(disclaimer!.compareDocumentPosition(doors!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('carries the SAME staticDisclosures strings as the App mount (one source, words never fork)', () => {
    plantResolved()
    const { container } = renderResult()
    const disclaimer = inFrameDisclaimer(container)!
    expect(disclaimer.textContent).toContain(staticDisclosures.honestLimitsScope)
    expect(disclaimer.textContent).toContain(staticDisclosures.honestLimitsValidate)
  })

  it('data-inframe-disclaimer mirrors the mount EXACTLY — both present on a resolved answer', () => {
    plantResolved()
    const { container } = renderResult()
    expect(container.querySelector('main.result')!).toHaveAttribute('data-inframe-disclaimer')
    expect(inFrameDisclaimer(container)).not.toBeNull()
  })

  it('data-inframe-disclaimer mirrors the mount EXACTLY — both ABSENT while computing (the trailing mount must stand)', () => {
    plantResolved()
    const { container } = renderResult(true)
    expect(container.querySelector('main.result')!).not.toHaveAttribute('data-inframe-disclaimer')
    expect(inFrameDisclaimer(container)).toBeNull()
  })

  it('data-answer-tier is ABSENT until a verdict commits — independent of the actions-row attribute', () => {
    // The vertical-fit gate synchronizes on `data-answer-tier="final"` (memoryModel stamps the
    // committing tier; Result mirrors it). With the actions row present but the answer unresolved
    // (idle here), the tier attribute must NOT exist — a phantom stamp would let the e2e measure
    // a frame no final answer produced. The present-arm values are pinned in memoryModel.test.ts
    // (both routes, both tiers); the e2e itself cannot pass without the mirroring.
    plantResolved()
    const { container } = renderResult()
    expect(container.querySelector('main.result')!).toHaveAttribute('data-inframe-disclaimer')
    expect(container.querySelector('main.result')!).not.toHaveAttribute('data-answer-tier')
  })
})
