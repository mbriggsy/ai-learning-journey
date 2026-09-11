// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { staticDisclosures } from '../copy'
import { Disclaimer, IN_FRAME_DISCLAIMER_ID } from '../Disclaimer'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The IN-FRAME R13 disclaimer contract ("buttons drop below" — Briggsy's fork call, council
 * 2026-07-08, wf_a2d93977-960 — the Honesty-Hawk's veto made structural):
 *
 *  1. ORDER — the in-frame disclaimer precedes the quiet-door row in DOM order, so the doors
 *     (never the honesty caveat) are what any overflow pushes past the fold. The page-trailing
 *     App mount is the structural FIRST casualty of overflow; this mount is why it never comes
 *     to that on the result screen. THE DEGRADABLE TAIL BELOW IT HAS THREE MEMBERS, not one: the
 *     quiet-door row (here), the backup door, and — since Briggsy's 2026-07-26 placement ruling —
 *     the remembered-record card, which needs a `recordCard` fixture this file does not carry, so
 *     its order arm lives beside that fixture in `recommendInvite.test.tsx` ("THE RULING").
 *  2. MIRROR — `data-inframe-disclaimer` on main.result is present exactly when the in-frame
 *     mount is rendered (both ride the withheld-while-computing actions row). app.css hides the
 *     trailing mount behind that attribute — keyed to the VERDICT, at EVERY width (council
 *     2026-09-10, wf_d2b1d05a-001; until then the swap lived inside the ≥68rem query, which left
 *     the phone's caveat AFTER the doors). So the attribute-without-mount (a ZERO-visible-disclaimer
 *     frame) and mount-without-attribute (a doubled disclaimer) are both unrepresentable — but only
 *     if this mirror holds.
 *  3. ONE SOURCE — the in-frame mount renders the same staticDisclosures strings as the App
 *     mount (the words can never fork).
 *  4. ONE ID — `IN_FRAME_DISCLAIMER_ID` is the in-frame mount's alone (the trailing mount carries
 *     no id at all), and the verdict elements name it in `aria-describedby`.
 *
 * The VISIBILITY swap (the trailing mount hidden behind the attribute — at EVERY width since the
 * 2026-09-10 council, wf_d2b1d05a-001; until then only at ≥68rem, which left the phone's caveat
 * AFTER the doors) is CSS behavior jsdom cannot compute — that half of the contract, plus the
 * scrolling tiers' ORDER + REACHABILITY law and the verdict→caveat `aria-describedby` link,
 * belongs to the real-browser vertical-fit gate (council-mandated Playwright project), not this
 * file. What this file CAN pin of the link: the in-frame mount carries the exported id the verdict
 * names (item 4) — a renamed id would sever the description silently.
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

  it('the in-frame mount carries the exported id the verdict names in aria-describedby (one id, never re-typed)', () => {
    plantResolved()
    const { container } = renderResult()
    expect(inFrameDisclaimer(container)!.id).toBe(IN_FRAME_DISCLAIMER_ID)
    // The hero verdict (ConfidenceStatement's h2.cs-word) and the date verdict (FuckOffDate) each name
    // this id; a jsdom Result on the pristine draft carries no committed headline, so the LINK itself is
    // asserted in the real browser (e2e/vertical-fit.spec.ts, the scrolling-tier ORDER arms). These
    // greps pin that BOTH verdict surfaces reference the exported constant, never a re-typed string.
    for (const verdict of ['../ConfidenceStatement.tsx', '../FuckOffDate.tsx']) {
      expect(
        readFileSync(resolve(__dirname, verdict), 'utf8'),
        `${verdict} must name the caveat via aria-describedby={IN_FRAME_DISCLAIMER_ID} — a verdict ` +
          `whose description is unlinked reads as unqualified certainty to a screen reader.`,
      ).toContain('aria-describedby={IN_FRAME_DISCLAIMER_ID}')
    }
  })

  it('the id belongs to the in-frame mount ALONE — a bare <Disclaimer /> carries none', () => {
    // The trailing App mount is rendered by App.tsx, NOT by Result, so asserting its id off a Result
    // container is structurally vacuous (insight 029: an equality over a surface that cannot exist
    // discriminates nothing). Render the component itself, both ways, so dropping Disclaimer.tsx's
    // ternary to a bare `id={IN_FRAME_DISCLAIMER_ID}` — two elements with the same id in the shipped
    // DOM whenever both mounts stand — reds HERE.
    const bare = render(<Disclaimer />).container.querySelector('footer.disclaimer')
    expect(bare, 'a bare <Disclaimer /> must render its footer').not.toBeNull()
    expect(
      bare!.hasAttribute('id'),
      `the trailing App mount must carry NO id: it renders beside the in-frame mount on every ` +
        `computing→committed frame, and a duplicated ${IN_FRAME_DISCLAIMER_ID} makes the document ` +
        `invalid and resolves aria-describedby by document order instead of by intent.`,
    ).toBe(false)
    cleanup()
    const framed = render(<Disclaimer inFrame />).container.querySelector('footer.disclaimer')
    expect(framed, 'an in-frame <Disclaimer /> must render its footer').not.toBeNull()
    expect(framed!.id).toBe(IN_FRAME_DISCLAIMER_ID)
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
