// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { IntakeFlow, type StepDef } from '../flow'
import { personField } from '../sanity'
import { createMemoryModel, type MemoryModel } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy } from '@ui/copy'

/**
 * Flow-shell mechanics (phase-2 U5 contracts): focus-to-heading on every step
 * change (never the input), exactly one current question in the a11y tree,
 * back-nav preserves answers, attempt-to-advance validation with the calm
 * error grammar (fires → blocks → clears on correction), the progress thread's
 * SR semantics, and the clear-after-announce live region (burned/045).
 */

const nullClient: EngineClient = {
  runningInWorker: true,
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
  },
}

function freshModel(): MemoryModel {
  return createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
  })
}

/** Three stub steps; step 1 binds an input to people.0.birthYear, step 2 owns
 *  the retired stop-age field so the status-conditional rule can gate it. */
const STEPS: readonly StepDef[] = [
  {
    id: 's1',
    headingKey: 'appTitle',
    fields: [personField(0, 'birthYear')],
    render: (api) => (
      <input
        aria-label={copy.appTitle}
        value={api.draft.people[0].birthYear ?? ''}
        onChange={(e) =>
          api.update((d) => ({
            ...d,
            people: [{ ...d.people[0], birthYear: Number(e.target.value) || undefined }, d.people[1]],
          }))
        }
        onBlur={() => api.commitField(personField(0, 'birthYear'))}
      />
    ),
  },
  {
    id: 's2',
    headingKey: 'flowNext',
    fields: [personField(0, 'retirementAge')],
    render: (api) =>
      api.violationsFor(personField(0, 'retirementAge')).map((v) => (
        <p role="alert" key={v.rule}>
          {copy[v.messageKey]}
        </p>
      )),
  },
  { id: 's3', headingKey: 'flowBack', fields: [], render: () => null },
]

afterEach(cleanup)

describe('IntakeFlow — focus + a11y tree', () => {
  it('focuses the step HEADING on mount and on every advance (never the input)', () => {
    render(<IntakeFlow steps={STEPS} model={freshModel()} />)
    const h1st = screen.getByRole('heading', { level: 2 })
    expect(document.activeElement).toBe(h1st)

    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    const h2nd = screen.getByRole('heading', { level: 2 })
    expect(h2nd.textContent).toBe(copy.flowNext)
    expect(document.activeElement).toBe(h2nd)
  })

  it('holds exactly ONE step heading in the tree (outgoing step unmounted, not hidden)', () => {
    render(<IntakeFlow steps={STEPS} model={freshModel()} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
  })

  it('exposes progressbar semantics and advances aria-valuenow (no visible counter text)', () => {
    const { container } = render(<IntakeFlow steps={STEPS} model={freshModel()} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '1')
    expect(bar).toHaveAttribute('aria-valuemax', '3')
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(container.textContent).not.toMatch(/step \d+ of \d+/i)
  })
})

describe('IntakeFlow — back-nav preserves answers', () => {
  it('Back re-renders the prior step pre-filled; advancing again keeps the edit', () => {
    render(<IntakeFlow steps={STEPS} model={freshModel()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '1961' } })
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))

    fireEvent.click(screen.getByRole('button', { name: copy.flowBack }))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('1961')

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1959' } })
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    fireEvent.click(screen.getByRole('button', { name: copy.flowBack }))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('1959')
  })
})

describe('IntakeFlow — attempt-to-advance validation (the calm grammar)', () => {
  function modelWithContradiction(): MemoryModel {
    const m = freshModel()
    m.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], workStatus: 'retired', retirementAge: 66, currentAge: 65 },
        d.people[1],
      ],
    }))
    return m
  }

  it('a violation on the step BLOCKS advance and renders role=alert; correcting clears it', () => {
    const model = modelWithContradiction()
    render(<IntakeFlow steps={STEPS} model={model} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // s1 → s2 (no rule on s1)

    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // s2: rule fires
    expect(screen.getByRole('alert').textContent).toBe(copy.errStopAgeInFuture)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(copy.flowNext) // still s2

    act(() => {
      model.update((d) => ({
        ...d,
        people: [{ ...d.people[0], retirementAge: 64 }, d.people[1]],
      }))
    })
    expect(screen.queryByRole('alert')).toBeNull() // clears the instant the value is fixed

    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(copy.flowBack) // s3 reached
  })

  it('advance() validates the LIVE model draft, not the render closure (insight 036 guard)', () => {
    const model = freshModel()
    render(<IntakeFlow steps={STEPS} model={model} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // s1 → s2 (owns retirementAge)
    // Set a blocking contradiction AND click Continue in the SAME act tick — React
    // has not re-rendered between, so the render closure's draft is one commit
    // stale. If advance reads model.getSnapshot() (the fix) it BLOCKS; if it read
    // the closure it would sail past (the calm-but-wrong insight-036 regression).
    act(() => {
      model.update((d) => ({
        ...d,
        people: [
          { ...d.people[0], workStatus: 'retired', retirementAge: 66, currentAge: 65 },
          d.people[1],
        ],
      }))
      fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(copy.flowNext) // still s2 — blocked
  })
})

describe('IntakeFlow — the one polite live region (burned/045)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces the SR position on advance, then CLEARS so no stale text lingers', () => {
    const { container } = render(<IntakeFlow steps={STEPS} model={freshModel()} />)
    const region = container.querySelector('[aria-live="polite"]')!
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(region.textContent).toBe('Question 2')
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(region.textContent).toBe('') // clear-after-announce
  })
})

describe('IntakeFlow — completion + commit-triggered recompute', () => {
  it('fires onComplete past the last step and recompute on each clean advance', () => {
    const model = freshModel()
    const recompute = vi.spyOn(model, 'recompute')
    const onComplete = vi.fn()
    render(<IntakeFlow steps={STEPS} model={model} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // s1→s2
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // s2→s3
    expect(onComplete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // s3 → complete
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(recompute).toHaveBeenCalledTimes(2) // 2 non-final advances refire; the final delegates solely to onComplete
  })
})
