// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { caveatSeat, resolvedFocusKey, selectElevatedAnswer } from '../answerView'
import { staticDisclosures } from '../copy'
import { Disclaimer, IN_FRAME_DISCLAIMER_ID, verdictDescribedBy } from '../Disclaimer'
import { DEV_SEEDS } from '../devSeeds'
import { READING_FIXTURES } from '../preview/fixtures'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { BandFan, DateBand, DateTrackOutcome, OutcomeState } from '@shared/model'
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
    // The line break keeps a space before it, or the two sentences run together in textContent.
    expect(disclaimer.textContent).toContain(
      `${staticDisclosures.honestLimitsScope} ${staticDisclosures.honestLimitsValidate}`,
    )
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
    // greps pin that BOTH verdict surfaces name it through the ONE list builder beside the exported
    // constant (W9-R7 put the re-figuring line ahead of it), never a re-typed string.
    for (const verdict of ['../ConfidenceStatement.tsx', '../FuckOffDate.tsx']) {
      expect(
        readFileSync(resolve(__dirname, verdict), 'utf8'),
        `${verdict} must name the caveat via aria-describedby={verdictDescribedBy(…)} — a verdict ` +
          `whose description is unlinked reads as unqualified certainty to a screen reader.`,
      ).toContain('aria-describedby={verdictDescribedBy(')
    }
  })

  it('the verdict description list always names the caveat, LAST — alone, or after a lead line', () => {
    // W9-R7 (KTD6): the re-figuring line is heard first, then the caveat, which is never dropped.
    expect(verdictDescribedBy()).toBe(IN_FRAME_DISCLAIMER_ID)
    expect(verdictDescribedBy('line-1')).toBe(`line-1 ${IN_FRAME_DISCLAIMER_ID}`)
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

  it('data-answer-refiguring mirrors the store’s flag PRESENCE-keyed (W9-R7, KTD9): absent on a settled page, present only while a run on newer inputs is in flight', () => {
    // The harnesses' settle signal is `data-answer-tier="final"` with THIS attribute absent: a final-tier
    // wait alone passes inside the window, where the old answer still says final.
    plantResolved()
    const settled = renderResult()
    expect(settled.container.querySelector('main.result')!).not.toHaveAttribute('data-answer-refiguring')
    settled.unmount()
    vi.spyOn(appModel, 'getSnapshot').mockReturnValue({ ...appModel.getSnapshot(), refiguring: true })
    const { container } = renderResult()
    expect(container.querySelector('main.result')!).toHaveAttribute('data-answer-refiguring')
  })
})

/**
 * U1's MATRIX (the record card's seat plan, `docs/plans/features/record-card-seat-build-spec.md`, KTD1, R1, R6):
 * exactly one in-frame caveat on every reachable Result state, through the real `selectElevatedAnswer`, the real
 * `caveatSeat` and the real heroes. The store's answers resolve only through the worker, so each is planted by
 * replacing `getSnapshot` (the `resultPayCheckLine.test.tsx` precedent); `computing` is IntakeApp's prop, passed
 * as IntakeApp derives it. jsdom loads no CSS, so which copy is VISIBLE and where it lands on screen stay the fit
 * gate's. This pins the DOM: one mount, the attribute beside it, inside the actions node, and the verdict's
 * description resolving to it. Every arm also pins KTD1's band premise: the seat's band fact equals the band the
 * hero actually drew.
 */
describe('U1 — exactly one in-frame caveat on every reachable state (KTD1)', () => {
  const plant = (d: ScenarioDraft, answer: ModelAnswer): MemoryModelSnapshot => {
    const snapshot: MemoryModelSnapshot = { ...appModel.getSnapshot(), draft: d, answer, displayed: null, refiguring: false }
    vi.spyOn(appModel, 'getSnapshot').mockReturnValue(snapshot)
    return snapshot
  }
  const headline = (d: ScenarioDraft, state: OutcomeState, bandFan: BandFan | undefined = READING_FIXTURES[state].band): ModelAnswer => ({
    kind: 'headline',
    result: {
      headline: READING_FIXTURES[state].headline,
      dollar: READING_FIXTURES[state].dollar,
      distribution: { terminalValuesReal: [], depletionYears: [], survivalFraction: 0, ...(bandFan ? { bandFan } : {}) },
      seed: 1,
    },
    tier: 'final',
    draft: d,
    inputKey: 'planted',
  })
  const crownedOffset = (track: DateTrackOutcome): number => {
    if (track.kind === 'no-date-in-window') throw new Error('expected a crowned track')
    return track.offsetYears
  }
  // A crowned band at the confirmed fixture's own offset: a positive-p90 fan, so the producer's $0 screen keeps it.
  const BAND: DateBand = {
    fan: {
      byYear: Array.from({ length: 41 }, (_, t) => ({
        yearsFromNow: t,
        p10: 0,
        p25: 0,
        p50: 500_000,
        p75: 700_000,
        p90: 1_000_000,
        cohortFraction: 1,
      })),
    },
    outcomeState: 'on-track',
    offsetYears: crownedOffset(DATE_FIXTURES.confirmed),
    track: 'lifestyle',
  }
  const dates = (d: ScenarioDraft, track: DateTrackOutcome, band?: DateBand): ModelAnswer => ({
    kind: 'date',
    outcome: { kind: 'dates', floor: track, lifestyle: track, tier: 'final', windowTopYears: DATE_WINDOW_TOP, seed: 1, ...(band ? { band } : {}) },
    tier: 'final',
    draft: d,
    inputKey: 'planted',
  })
  // A $0 portfolio's fan: every year at $0, so `spineBand` hands no band on (insight 044's valid household).
  const ZERO_FAN: BandFan = {
    byYear: Array.from({ length: 31 }, (_, t) => ({ yearsFromNow: t, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, cohortFraction: 1 })),
  }
  const spine = DEV_SEEDS.retired
  const date = DEV_SEEDS.date

  const renderAt = (computing = false) =>
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={computing} />).container

  /** The one in-frame copy: exactly one `#r13-caveat`, the attribute beside it, inside the actions node. */
  const oneCaveatInActions = (container: HTMLElement): HTMLElement => {
    const mounts = container.querySelectorAll(`#${IN_FRAME_DISCLAIMER_ID}`)
    expect(mounts, 'exactly one in-frame caveat').toHaveLength(1)
    expect(container.querySelectorAll('.disclaimer--in-frame')).toHaveLength(1)
    expect(container.querySelector('main.result')).toHaveAttribute('data-inframe-disclaimer')
    const caveat = mounts[0] as HTMLElement
    expect(caveat.closest('.result-actions'), 'inside the actions node').not.toBeNull()
    return caveat
  }
  /** A hero-seated frame: the actions node in the hero's reading column, the caveat outside every band and graph,
   *  and the verdict's description list ending on the caveat (`verdictDescribedBy`). */
  const seatedInHero = (container: HTMLElement, caveat: HTMLElement) => {
    expect(caveat.closest('.result-hero .reveal__actions'), 'the actions node seats in the hero').not.toBeNull()
    expect(caveat.closest('.cs-band, .fod-band, .fod-graphs'), 'the hero is handed no caveat of its own').toBeNull()
    const verdict = container.querySelector('.result-hero h2[aria-describedby]')
    expect(verdict, 'the verdict heading').not.toBeNull()
    const ids = verdict!.getAttribute('aria-describedby')!.split(' ')
    expect(document.getElementById(ids[ids.length - 1]!), 'the verdict’s description resolves to the one caveat').toBe(caveat)
  }
  /** A frame the hero does not seat: the actions node renders straight after the hero, where it always has (C2). */
  const afterTheHero = (container: HTMLElement, caveat: HTMLElement) => {
    const actions = caveat.closest('.result-actions')!
    expect(actions.parentElement).toBe(container.querySelector('main.result'))
    expect(actions.previousElementSibling).toBe(container.querySelector('main.result > .result-hero'))
  }
  /** KTD1's band premise: the seat's band fact is exactly whether the hero drew a band. */
  const bandPremise = (container: HTMLElement, snapshot: MemoryModelSnapshot) => {
    const seat = caveatSeat(selectElevatedAnswer(snapshot, () => undefined), false)
    expect(container.querySelector('.cs-band, .fod-band') !== null, 'the seat’s band fact equals the drawn band').toBe(seat.band)
    return seat
  }

  it('a spine reading with a band: one caveat in the actions node, seated in the hero, named by the verdict', () => {
    const s = plant(spine, headline(spine, 'on-track'))
    const container = renderAt()
    seatedInHero(container, oneCaveatInActions(container))
    expect(bandPremise(container, s).band).toBe(true)
  })

  it('a spine reading on a $0 portfolio (no band): one caveat in the actions node, the hero handed none (R6)', () => {
    const s = plant(spine, headline(spine, 'on-track', ZERO_FAN))
    const container = renderAt()
    seatedInHero(container, oneCaveatInActions(container))
    expect(bandPremise(container, s).band).toBe(false)
  })

  it('a date answer with a crowned band: one caveat in the actions node, seated in the hero, named by the verdict', () => {
    const s = plant(date, dates(date, DATE_FIXTURES.confirmed, BAND))
    const container = renderAt()
    seatedInHero(container, oneCaveatInActions(container))
    expect(bandPremise(container, s).band).toBe(true)
  })

  it('the date no-date answer (no band): one caveat in the actions node, seated in the hero, named by the verdict (R6)', () => {
    const s = plant(date, dates(date, DATE_FIXTURES.noDate))
    const container = renderAt()
    seatedInHero(container, oneCaveatInActions(container))
    expect(bandPremise(container, s).band).toBe(false)
  })

  for (const [route, d] of [['spine', spine], ['date', date]] as const) {
    it(`a compute-error on the ${route} route: one caveat in the actions node, after the hero's retry, where it always sat (C2)`, () => {
      const s = plant(d, { kind: 'compute-error', reason: 'x' })
      const container = renderAt()
      expect(container.querySelector('.result-hero .cs-error, .result-hero .fod-error'), 'the hero shows the retry').not.toBeNull()
      afterTheHero(container, oneCaveatInActions(container))
      expect(bandPremise(container, s).band).toBe(false)
    })
  }

  it('inputs-incomplete (the fallback strip): one caveat in the actions node, after the strip', () => {
    const s = plant(spine, { kind: 'inputs-incomplete' })
    const container = renderAt()
    expect(container.querySelector('.result-hero .answer-strip')).not.toBeNull()
    afterTheHero(container, oneCaveatInActions(container))
    expect(bandPremise(container, s).band).toBe(false)
  })

  it('an indeterminate headline routes to the fallback, never a hero: one caveat after the strip, and no placeholder band (KTD1’s second premise)', () => {
    const s = plant(spine, headline(spine, 'indeterminate'))
    const container = renderAt()
    expect(container.querySelector('.result-hero .answer-strip')).not.toBeNull()
    expect(container.querySelector('.confidence'), 'no spine hero, so no placeholder band').toBeNull()
    afterTheHero(container, oneCaveatInActions(container))
    expect(bandPremise(container, s).band).toBe(false)
  })

  it('a date input-failure (the fallback strip): one caveat in the actions node, after the strip', () => {
    const s = plant(date, { kind: 'date', outcome: { kind: 'input-failure', reason: 'x' }, tier: 'final', draft: date, inputKey: 'planted' })
    const container = renderAt()
    expect(container.querySelector('.result-hero .answer-strip')).not.toBeNull()
    afterTheHero(container, oneCaveatInActions(container))
    expect(bandPremise(container, s).band).toBe(false)
  })

  for (const [name, d, answer] of [
    ['pending on the spine route', spine, { kind: 'pending' }],
    ['pending on the date route', date, { kind: 'pending' }],
    ['idle with nothing missing (the one-frame crunch)', spine, { kind: 'idle' }],
  ] as const) {
    it(`computing, ${name}: no in-frame caveat and no attribute, so the page-trailing copy stands`, () => {
      plant(d, answer)
      const container = renderAt(true)
      expect(container.querySelector(`#${IN_FRAME_DISCLAIMER_ID}`)).toBeNull()
      expect(container.querySelector('main.result')).not.toHaveAttribute('data-inframe-disclaimer')
    })
  }

  it('an aged spine plan (the plan clock past zero): one caveat, and the hero DRAWS its band — Result always passes onReconfirm, so agedFanBlocked never withdraws it (KTD1’s first premise)', () => {
    // The aged doctor's own shift (`devSeeds.ts`: the plan built two calendar years before the stored one).
    const aged: ScenarioDraft = { ...spine, startCalendarYear: spine.startCalendarYear - 2 }
    const s = plant(aged, headline(aged, 'on-track'))
    const container = renderAt()
    seatedInHero(container, oneCaveatInActions(container))
    expect(container.querySelector('.cs-band'), 'the aged band renders').not.toBeNull()
    expect(container.querySelector('.cs-band .band-premise'), 'beside its premise line, so the plan clock is past zero').not.toBeNull()
    expect(bandPremise(container, s).band).toBe(true)
  })
})
