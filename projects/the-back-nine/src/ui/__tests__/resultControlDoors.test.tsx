// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { DEV_SEEDS } from '../devSeeds'
import { copy } from '@ui/copy'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { EnteredAccount } from '@shared/model'

/**
 * The Result screen's two U10 control doors (P3·U10, R9/R11 — quiet, invited, never a badge).
 *
 * The GATING LAW under test (the door predicates read the DRAFT, never re-derive the answer):
 *  - sequencing: a resolved reading + ≥1 entered account (an order over zero accounts is inert).
 *  - Roth: a resolved reading + a CATEGORICAL fact only — filing status. It reads NO financial
 *    field: an mfj household with zero pre-tax money STILL gets the door (the lever's own closed
 *    face handles $0-pre-tax), and a single filer never does. Both doors re-word when already tuned.
 *
 * resolvedFocusKey is module-mocked (the resultBudgetDoor.test precedent) so the presence arms can
 * plant a resolved reading without standing up the engine worker.
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey) }
})

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

const renderResult = () => render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
const plantResolved = () => mockFocusKey.mockReturnValue('planted-focus-key')

const pretaxAccount: EnteredAccount = { ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000 }
const brokerageAccount: EnteredAccount = { ownerIndex: 0, kind: 'brokerage', valueToday: 200_000 }

const seqDoor = () => screen.queryByRole('button', { name: copy.leverSequencingCta })
const seqEditDoor = () => screen.queryByRole('button', { name: copy.leverSequencingEditCta })
const rothDoor = () => screen.queryByRole('button', { name: copy.leverRothDoorCta })
const rothEditDoor = () => screen.queryByRole('button', { name: copy.leverRothDoorEditCta })

describe('the sequencing door — a resolved reading AND at least one entered account', () => {
  it('present with ≥1 account', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, enteredAccounts: [pretaxAccount] }))
    renderResult()
    expect(seqDoor()).toBeInTheDocument()
  })

  it('GONE when there are no entered accounts (an order over zero buckets is inert)', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, enteredAccounts: [] }))
    renderResult()
    expect(seqDoor()).toBeNull()
    expect(seqEditDoor()).toBeNull()
  })

  it('re-words to "revisit" when a non-proportional policy already governs', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, enteredAccounts: [pretaxAccount], drawdownPolicy: 'taxable-first' }))
    renderResult()
    expect(seqEditDoor()).toBeInTheDocument()
    expect(seqDoor()).toBeNull()
  })

  it('absent with no resolved reading, even with accounts (the real gate over the empty model)', () => {
    appModel.update((d) => ({ ...d, enteredAccounts: [pretaxAccount] }))
    renderResult()
    expect(seqDoor()).toBeNull()
  })
})

describe('the Roth door — categorical on filing status alone', () => {
  it('present for an mfj household + a resolved reading', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, filing: 'mfj' }))
    renderResult()
    expect(rothDoor()).toBeInTheDocument()
  })

  it('ABSENT for a single filer', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, filing: 'single' }))
    renderResult()
    expect(rothDoor()).toBeNull()
    expect(rothEditDoor()).toBeNull()
  })

  it('STILL present for an mfj household with money but ZERO pre-tax (the door reads no financial field)', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, filing: 'mfj', enteredAccounts: [brokerageAccount] }))
    renderResult()
    expect(rothDoor()).toBeInTheDocument()
  })

  it('re-words to "revisit" when a conversion is already applied', () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      filing: 'mfj',
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 2, years: 5 },
    }))
    renderResult()
    expect(rothEditDoor()).toBeInTheDocument()
    expect(rothDoor()).toBeNull()
  })

  it('absent with no resolved reading, even for an mfj household', () => {
    appModel.update((d) => ({ ...d, filing: 'mfj' }))
    renderResult()
    expect(rothDoor()).toBeNull()
  })
})

describe('the healthcare door — the engine PRICED domain only, categorical (council 2026-07-03)', () => {
  const healthDoor = () => screen.queryByRole('button', { name: copy.leverHealthDoorCta })
  const healthEditDoor = () => screen.queryByRole('button', { name: copy.leverHealthDoorEditCta })
  const priced = () =>
    appModel.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], currentAge: 60 },
        { ...d.people[1], currentAge: 58 },
      ],
      health: { ...d.health, enrolledPremiumMonthlyToday: 1_200, slcspMonthlyToday: 1_100 },
    }))

  it('present for a priced household (quote pair entered + a pre-65 member) on a resolved reading', () => {
    plantResolved()
    priced()
    renderResult()
    expect(healthDoor()).toBeInTheDocument()
  })

  it('ABSENT for the post-65-only household even when resolved — no hollow door over a domain the engine does not price', () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], currentAge: 68 },
        { ...d.people[1], currentAge: 66 },
      ],
    }))
    renderResult()
    expect(healthDoor()).toBeNull()
    expect(healthEditDoor()).toBeNull()
  })

  it('ABSENT when the marketplace quote pair is missing (the engine prices nothing to see)', () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], currentAge: 60 },
        { ...d.people[1], currentAge: 58 },
      ],
    }))
    renderResult()
    expect(healthDoor()).toBeNull()
  })

  it('re-words once the enhanced regime is applied', () => {
    plantResolved()
    priced()
    appModel.update((d) => ({ ...d, enhancedSubsidies: true }))
    renderResult()
    expect(healthDoor()).toBeNull()
    expect(healthEditDoor()).toBeInTheDocument()
  })

  it('the Apply commits EXACTLY the enhancedSubsidies key, and the escape STRIPS it — the insight-058 single-key fence, end to end through Result', () => {
    plantResolved()
    priced()
    const before = appModel.getSnapshot().draft
    renderResult()
    fireEvent.click(screen.getByRole('button', { name: copy.leverHealthDoorCta }))
    fireEvent.click(document.querySelector('input[name="subsidy-regime"][value="enhanced"]')!)
    fireEvent.click(screen.getByRole('button', { name: copy.leverHealthRegimeApply }))
    // EXACTLY one key moved — no health scalar, no sibling field (the fence's whole point).
    expect(appModel.getSnapshot().draft).toEqual({ ...before, enhancedSubsidies: true })
    // The door re-worded; the escape strips the KEY (absence — never enhancedSubsidies: false).
    fireEvent.click(screen.getByRole('button', { name: copy.leverHealthDoorEditCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.leverHealthRegimeRemove }))
    expect(appModel.getSnapshot().draft).toEqual(before)
    expect('enhancedSubsidies' in appModel.getSnapshot().draft).toBe(false)
  })

  it('the ROTH sheet wears the priced-Medicare residual note for a post-65-only household (the Result-level threading proof through a REAL child — insight 066)', () => {
    plantResolved()
    // The disclosure seam reads the BUILT params (spineMedicarePriced — the ultramode fold,
    // 2026-07-10), which honestly refuses to claim anything for a draft that cannot build. So the
    // note arms ride a COMPLETE, engine-proven all-65+ draft (the `retired` dev seed) instead of
    // this file's deliberately-skeletal door-gating draft (U12's demotion law: a resolved verdict
    // never coexists with missing facts in production, so the skeleton+note pairing was never a
    // real shape).
    appModel.update(() => ({ ...DEV_SEEDS.retired }))
    renderResult()
    fireEvent.click(rothDoor()!)
    expect(screen.getByText(copy.rothMedicareResidualNote)).toBeInTheDocument()
  })

  it('a STILL-WORKING all-65+ household (date route) also wears the residual note — Medicare is priced structurally, never a false "unpriced" claim (insight 080 regression)', () => {
    // dateSearch.ts:222 forces healthcareEnabled true on every candidate, so a 66/65 still-working
    // household prices Medicare on the date route even though it reaches no ACA door. The retired
    // age-predicate falsely called this "Medicare not priced"; the route-aware seam prices it.
    plantResolved()
    appModel.update((d) => ({
      ...d,
      filing: 'mfj',
      people: [
        { ...d.people[0], currentAge: 66, workStatus: 'working' },
        { ...d.people[1], currentAge: 65, workStatus: 'retired' },
      ],
      enteredAccounts: [pretaxAccount],
    }))
    renderResult()
    fireEvent.click(rothDoor()!)
    expect(screen.getByText(copy.rothMedicareResidualNote)).toBeInTheDocument()
  })

  it('the roth sheet carries NO priced-Medicare note for an ACA-priced (door) household (the predicate discriminates)', () => {
    plantResolved()
    priced()
    appModel.update((d) => ({ ...d, enteredAccounts: [pretaxAccount] }))
    renderResult()
    fireEvent.click(rothDoor()!)
    expect(screen.queryByText(copy.rothMedicareResidualNote)).toBeNull()
  })

  it('Result derives the priced-Medicare disclosure from the BUILT params (spineMedicarePriced), never the age predicate — the source-bind pin (insight 032)', () => {
    // The ultramode fold's divergence household (the SS-only $0-account all-65+ couple:
    // buildOverlay's degenerate early-return fires UPSTREAM of the medicareOnly branch — NO
    // overlay, Medicare priced $0, while the AGE predicate still reads "priceable") is
    // STRUCTURALLY unreachable through any render channel this harness can drive without
    // vacuousness (insight 029): the hero notes need a real planted answer these door tests
    // don't stand up, and every sheet channel needs an account — which would destroy the
    // divergence (an account defeats the early return). The behavioral chain is pinned at both
    // ends — spineMedicarePriced's divergence witness (intakeMap.test) and the components'
    // note-iff-prop pins — so THIS pin closes the one remaining link: Result's derivation line.
    // A revert to the age predicate (the exact shipped defect) goes red here (proven 2026-07-10).
    const src = readFileSync(resolve(__dirname, '../Result.tsx'), 'utf8')
    expect(src, 'the disclosure derivation reads the built params').toMatch(/spineMedicarePriced\(/)
    expect(src, 'the age predicate must never re-enter Result (insight 080)').not.toMatch(
      /medicareOnlyPriced/,
    )
  })

  it('Result derives the STATE-tax disclosure from the route-aware BUILT params (pricedStateForRun), never draft.retirementState and never a bare isDateRoute disjunct — the S5 source-bind (insight 080/081)', () => {
    // The degenerate-overlay divergence household (insight 081 — $0 accounts + no income + no
    // premium builds NO overlay ⇒ prices NO state tax, even when the draft says NC) is
    // STRUCTURALLY unreachable through this harness (an account defeats the early return). The
    // behavioral chain is pinned at both ends — pricedStateForRun's divergence witness
    // (intakeMap.test) + the components' note-iff-prop pins — so THIS pin closes Result's
    // derivation line. A revert to draft.retirementState OR an `|| isDateRoute` widening goes red.
    const src = readFileSync(resolve(__dirname, '../Result.tsx'), 'utf8')
    expect(src, 'the state derivation reads the producer output').toMatch(
      /const statePricedNote = useMemo\(\(\) => pricedStateForRun\(snapshot\.draft\)/,
    )
    // The derivation line must never re-derive geography or force the date route (insights 080/081).
    const stateLine = src.split('\n').find((l) => l.includes('const statePricedNote =')) ?? ''
    expect(stateLine, 'never re-derives from draft.retirementState').not.toMatch(/draft\.retirementState/)
    expect(stateLine, 'never a bare isDateRoute disjunct for state (insight 080)').not.toMatch(/isDateRoute/)
  })

  it('Result derives the ACA-priced disclosure from the route-aware BUILT params (acaPricedForRun) AND threads it to the Roth lever — the O16 source-bind (insight 080/081)', () => {
    // Same closure idiom as its two siblings above: the predicate's divergence witnesses
    // (Medicare-only, degenerate-overlay, unknown-age) live in intakeMap.test, the component's
    // note-iff-prop arms in rothLever.test — THIS pin closes Result's derivation + threading
    // links. A revert to an age/draft re-derivation, a bare isDateRoute widening, or a dropped
    // prop (the ACA household silently reading the stale blanket clause) goes red here.
    const src = readFileSync(resolve(__dirname, '../Result.tsx'), 'utf8')
    expect(src, 'the ACA derivation reads the producer output').toMatch(
      /const acaPricedNote = useMemo\(\(\) => acaPricedForRun\(snapshot\.draft\)/,
    )
    const acaLine = src.split('\n').find((l) => l.includes('const acaPricedNote =')) ?? ''
    expect(acaLine, 'never re-derives from draft health fields or ages').not.toMatch(/draft\.health|currentAge/)
    expect(acaLine, 'never a bare isDateRoute disjunct (insight 080)').not.toMatch(/isDateRoute/)
    expect(src, 'the flag is THREADED to the lever (a dropped prop is the silent stale-clause mutant)').toMatch(
      /acaPricedNote=\{acaPricedNote\}/,
    )
  })
})
