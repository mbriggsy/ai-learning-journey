// @vitest-environment jsdom
import { StrictMode, useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { intakeSteps } from '../questions'
import { IntakeFlow } from '../flow'
import { createMemoryModel, type MemoryModel } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy } from '@ui/copy'

/**
 * WHERE FOCUS LANDS ON THE TWO LIST STEPS (accounts · other income) — the three mutations of the
 * same view that no other gate watches.
 *
 * 1. ARRIVAL, UNDER <StrictMode>. src/main.tsx:42 wraps the app in StrictMode, so React's dev build
 *    double-invokes a NEWLY-PLACED fiber's effects (setup → cleanup → setup). The step body is
 *    exactly that on every advance (flow.tsx keys its `<section>` by step id) while IntakeFlow
 *    itself is NOT — so the parent's own heading effect runs once, before the double-invoke, and
 *    the step body's runs twice, after. A `useRef(true)` first-render latch is spent by pass 1 and
 *    pass 2 then focused the LIST heading on arrival, taking the focus the flow had just put on the
 *    step h2 with nothing to put it back. The latch is the previous `editing` value now, which is
 *    idempotent under the pair (src/intake/questions.tsx:957 · :1097).
 *
 *    WHY THE WALK IS TRIMMED TO TWO STEPS. The bug needs an ADVANCE onto the list step (a fresh
 *    mount under an already-mounted parent) — at the flow's FIRST mount the whole tree is newly
 *    placed, so the parent's effect re-runs last inside the double-invoke and the h2 wins either
 *    way (probed 2026-09-08 with the boolean latch back in: first mount lands on `step-heading`). The intervening questions are other tests' business; this harness keeps the real
 *    `StepDef`s and the real flow, and just walks the two it needs.
 *
 * 2. THE RETURN from the editor: cancelling must hand focus to the list heading (the step h2 never
 *    changed across the swap, so nothing else names the screen the reader is back on).
 *
 * 3. THE CONFIRMED REMOVE — the third mutation, and the one the return-leg commit left out. Rows
 *    are index-keyed, so removing the LAST row unmounts the focused button (focus falls to
 *    `<body>`) and removing a MIDDLE row leaves it on a node that now belongs to a DIFFERENT
 *    household account's destructive Remove. Both land on the list heading now.
 */

const nullClient: EngineClient = {
  runningInWorker: true,
  reset: () => {},
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

/** Two named, already-retired people with birth years — the names step's own gate fields
 *  (`personField(i, 'birthYear')`, questions.tsx:107) are answered, so Continue is never refused
 *  for a reason this file is not about. */
function retiredCouple(): MemoryModel {
  const m = createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
  m.update((d) => ({
    ...d,
    people: [
      { name: 'Jim', workStatus: 'retired', currentAge: 66, birthYear: 1960, retirementAge: 64 },
      { name: 'Jane', workStatus: 'retired', currentAge: 65, birthYear: 1961, retirementAge: 63 },
    ],
  }))
  return m
}

const account = (ownerIndex: 0 | 1, valueToday: number) => ({
  ownerIndex,
  kind: 'traditional-ira' as const,
  valueToday,
  manualBlend: { kind: 'exact' as const, stockPct: 60, bondPct: 30, cashPct: 10 },
})

const stream = (ownerIndex: 0 | 1, annualRealToday: number) => ({
  ownerIndex,
  type: 'pension' as const,
  annualRealToday,
  startAge: 62, // ≤ the owner's current age ⇒ already-receiving (KTD-8b)
  colaMode: 'real-flat' as const,
  survivorPct: 0.5,
})

/** The app's own shape (steps derived from the live draft), narrowed to the two steps a walk needs
 *  — see the docblock: the arrival mechanism only exists on an advance under a mounted parent. */
function Harness({ model, only }: { model: MemoryModel; only: readonly string[] }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const steps = useMemo(
    () => intakeSteps(snap.draft).filter((s) => only.includes(s.id)),
    [snap.draft, only],
  )
  return <IntakeFlow steps={steps} model={model} />
}

afterEach(cleanup)

/** Module-level so the `only` prop keeps one identity across renders. */
const ACCOUNTS_WALK = ['names', 'accounts'] as const
const OTHER_INCOME_WALK = ['names', 'other-income'] as const

const stepHeading = () => screen.getByRole('heading', { level: 2 })
const listHeading = () => screen.getByRole('heading', { level: 3 })
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

/** A real tap or Enter FOCUSES the control before it activates it; `fireEvent.click` alone does
 *  not, and the whole point of these arms is where focus is left afterwards — so a click that
 *  starts from `<body>` would prove nothing about a button that is about to unmount. */
const tap = (btn: HTMLElement) => {
  btn.focus()
  expect(document.activeElement).toBe(btn) // the premise of every assertion below
  fireEvent.click(btn)
}

/** Advance until the step h2 reads `target`. */
function advanceTo(target: string): void {
  for (let i = 0; i < 10; i += 1) {
    if (stepHeading().textContent === target) return
    press(copy.flowNext)
  }
  throw new Error(`never reached the step headed "${target}" (stuck on "${stepHeading().textContent}")`)
}

describe('the list steps — arrival focus under <StrictMode>', () => {
  it('the accounts step arrives on its OWN heading, not the list heading; the editor return claims it', () => {
    const m = retiredCouple()
    m.update((d) => ({ ...d, enteredAccounts: [account(0, 500_000)] }))
    render(
      <StrictMode>
        <Harness model={m} only={ACCOUNTS_WALK} />
      </StrictMode>,
    )
    advanceTo(copy.qAccountsHeading)

    // ARRIVAL: the flow's own effect focused the step h2 and nothing may take it back. With a spent
    // boolean latch the double-invoke's second pass lands on the list h3 instead.
    expect(document.activeElement).toBe(stepHeading())
    expect(document.activeElement).not.toBe(listHeading())

    // THE RETURN LEG still works — the latch narrowed the trigger, it did not delete it.
    press(copy.addAccount)
    press(copy.accountCancel)
    expect(document.activeElement).toBe(listHeading())
    expect(listHeading().textContent).toBe(copy.accountsListHeading)
  })

  it('the other-income step arrives on its OWN heading; the editor return claims the list', () => {
    const m = retiredCouple()
    m.update((d) => ({ ...d, incomeStreams: [stream(0, 30_000)] }))
    render(
      <StrictMode>
        <Harness model={m} only={OTHER_INCOME_WALK} />
      </StrictMode>,
    )
    advanceTo(copy.qOtherIncomeHeading)

    expect(document.activeElement).toBe(stepHeading())
    expect(document.activeElement).not.toBe(listHeading())

    press(copy.addOtherIncome)
    press(copy.otherIncomeCancel)
    expect(document.activeElement).toBe(listHeading())
    expect(listHeading().textContent).toBe(copy.otherIncomeListHeading)
  })
})

describe('the list steps — a confirmed Remove lands the focus', () => {
  it('accounts: a MIDDLE row and then the LAST row both hand focus to the list heading', () => {
    const m = retiredCouple()
    m.update((d) => ({
      ...d,
      enteredAccounts: [account(0, 500_000), account(1, 400_000), account(0, 300_000)],
    }))
    render(<Harness model={m} only={ACCOUNTS_WALK} />)
    advanceTo(copy.qAccountsHeading)

    // MIDDLE row (index 1): two taps — arm, then confirm. Rows are index-keyed, so this button
    // node SURVIVES the removal and would otherwise keep the focus while now belonging to the
    // account that shifted up into its slot — a different household account's destructive control,
    // silently re-aimed under a finger that never moved.
    const arm = () => screen.getAllByRole('button', { name: copy.accountRemove })
    const middle = arm()[1]!
    tap(middle)
    tap(screen.getByRole('button', { name: copy.accountRemoveConfirm }))
    expect(m.getSnapshot().draft.enteredAccounts).toHaveLength(2) // the tap really removed one
    expect(document.activeElement).toBe(listHeading())
    expect(document.activeElement).not.toBe(middle) // never left aimed at the account that shifted up

    // LAST row: the focused button is the one that UNMOUNTS, so with no deliberate landing focus
    // falls all the way to <body> and the reader is nowhere.
    const rest = arm()
    tap(rest[rest.length - 1]!)
    tap(screen.getByRole('button', { name: copy.accountRemoveConfirm }))
    expect(m.getSnapshot().draft.enteredAccounts).toHaveLength(1)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(listHeading())
  })

  it('other income: the same landing on the twin loop', () => {
    const m = retiredCouple()
    m.update((d) => ({ ...d, incomeStreams: [stream(0, 30_000), stream(1, 20_000)] }))
    render(<Harness model={m} only={OTHER_INCOME_WALK} />)
    advanceTo(copy.qOtherIncomeHeading)

    const arm = () => screen.getAllByRole('button', { name: copy.otherIncomeRemove })
    tap(arm()[arm().length - 1]!) // the last row — the unmounting one
    tap(screen.getByRole('button', { name: copy.otherIncomeRemoveConfirm }))
    expect(m.getSnapshot().draft.incomeStreams).toHaveLength(1)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(listHeading())
  })
})
