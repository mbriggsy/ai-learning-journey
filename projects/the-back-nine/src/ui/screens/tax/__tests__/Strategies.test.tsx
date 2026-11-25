// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy } from '../../../copy'
import { StrategiesPanel } from '../Strategies'
import { DEFAULT_HEIR_BRACKET, strategiesView, type StrategiesInput, type StrategiesView } from '../strategiesView'
import { committed, headlineAnswer, leaveMoreRec, record, snap } from './fixtures'

/**
 * The Strategies panel's render laws (Act 6 · RC8), ported from the deleted `RecommendationSurface.test.tsx`,
 * `GoalPicker.test.tsx` and `recommendInvite.test.tsx`: a held Find is pressable and says why (never a native disabled,
 * never a dead tap), a pick is a real radio, only the saved state claims a save, a refused write is an alert, Keep and
 * Try call their handlers and are absent where the view offers none, and the solve's start and a refusal are spoken.
 */

afterEach(cleanup)

const RETIRED = DEV_SEEDS.retired
const input = (o: Partial<StrategiesInput> = {}): StrategiesInput => ({
  snapshot: snap(RETIRED, headlineAnswer(RETIRED)),
  picked: { goal: 'leave-more', heirBracket: DEFAULT_HEIR_BRACKET },
  save: { kind: 'none' },
  readOnly: false,
  todayEpochDay: 20_400,
  wallCalendarYear: RETIRED.startCalendarYear,
  repick: false,
  ...o,
})
const solve = (v: StrategiesView) => {
  if (v.kind !== 'solve') throw new Error(v.kind)
  return v
}

function handlers() {
  return {
    onPickGoal: vi.fn<(goal: 'leave-more' | 'pay-less-tax') => void>(),
    onBracket: vi.fn<(rate: number) => void>(),
    onFind: vi.fn<() => void>(),
    onRepick: vi.fn<() => void>(),
    onKeep: vi.fn<() => void>(),
    onTry: vi.fn<() => void>(),
    announce: vi.fn<(words: string) => void>(),
  }
}

function mount(view: StrategiesView) {
  const h = handlers()
  const utils = render(<StrategiesPanel view={solve(view)} caveat={<footer data-caveat="" />} {...h} />)
  return { ...utils, h }
}

describe('the empty state', () => {
  it('a held Find is aria-disabled, never natively disabled, its reason rendered at rest and spoken on a press; it starts nothing', () => {
    const { h } = mount(strategiesView(input({ picked: { goal: undefined, heirBracket: DEFAULT_HEIR_BRACKET } })))
    const find = screen.getByRole('button', { name: copy.taxStratFind })
    expect(find).toHaveAttribute('aria-disabled', 'true')
    expect(find).not.toBeDisabled()
    const reason = screen.getByText(copy.goalPickerConfirmBlocked)
    expect(find).toHaveAttribute('aria-describedby', reason.id)
    fireEvent.click(find)
    expect(h.onFind).not.toHaveBeenCalled()
    expect(h.announce).toHaveBeenCalledWith(copy.goalPickerConfirmBlocked)
  })

  it('a pick is a real labelled radio (one per goal); with a goal picked Find runs', () => {
    const { h } = mount(strategiesView(input()))
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('radio', { name: new RegExp(copy.goalLeaveMoreLabel) })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(copy.goalPayLessTaxLabel) }))
    expect(h.onPickGoal).toHaveBeenCalledWith('pay-less-tax')
    const find = screen.getByRole('button', { name: copy.taxStratFind })
    expect(find).not.toHaveAttribute('aria-disabled')
    fireEvent.click(find)
    expect(h.onFind).toHaveBeenCalledTimes(1)
    expect(screen.getByText(copy.recommendRecordReopenCost)).toBeInTheDocument()
  })

  it('the steer note renders for a household with no pre-tax money, and its landing is spoken once', () => {
    const idle = mount(strategiesView(input()))
    const blocked = strategiesView(input({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), { kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' }) }))
    idle.rerender(<StrategiesPanel view={solve(blocked)} caveat={null} {...idle.h} />)
    expect(screen.getByText(copy.recommendNoPretaxNote)).toBeInTheDocument()
    expect(idle.h.announce).toHaveBeenCalledWith(copy.recommendNoPretaxNote)
  })

  it('the solve starting is spoken once, on the change', () => {
    const first = mount(strategiesView(input()))
    expect(first.h.announce).not.toHaveBeenCalled()
    const pending = strategiesView(input({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), { kind: 'pending', label: 'solving', fingerprint: 'fp' as never }) }))
    first.rerender(<StrategiesPanel view={solve(pending)} caveat={null} {...first.h} />)
    expect(first.h.announce).toHaveBeenCalledWith(copy.recommendPendingLabel)
    expect(screen.getByText(copy.taxStratCalculating)).toBeInTheDocument()
    expect(document.querySelector('[data-calculating]')).toHaveAttribute('aria-busy', 'true')
    first.rerender(<StrategiesPanel view={solve(pending)} caveat={null} {...first.h} />)
    expect(first.h.announce).toHaveBeenCalledTimes(1)
  })
})

describe('the Winner card', () => {
  const solved = (o: Partial<StrategiesInput> = {}) => strategiesView(input({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), committed(leaveMoreRec())), ...o }))

  it('Keep calls its handler; an unsaved solve shows no Try; a read-only view has no Keep', () => {
    const offer = mount(solved({ save: { kind: 'offer', route: 'update' } }))
    fireEvent.click(screen.getByRole('button', { name: copy.snapshotRecKeep }))
    expect(offer.h.onKeep).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: copy.snapshotRecTry })).toBeNull()
    cleanup()
    mount(solved({ save: { kind: 'offer', route: 'update' }, readOnly: true }))
    expect(screen.queryByRole('button', { name: copy.snapshotRecKeep })).toBeNull()
    expect(screen.getByRole('button', { name: copy.recommendRepickCta })).toBeInTheDocument()
  })

  it('kept and current: the badge as text, and Try it in the plan calls its handler', () => {
    const { h } = mount(solved({ save: { kind: 'saved' }, record: record(true) }))
    expect(screen.getByText(copy.recommendSaveSavedBadge)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.snapshotRecTry }))
    expect(h.onTry).toHaveBeenCalledTimes(1)
  })

  it('THE CARDINAL SIN: no state but saved puts the saved sentence on screen', () => {
    for (const save of [{ kind: 'none' }, { kind: 'offer', route: 'ceremony' }, { kind: 'saving' }, { kind: 'refused', reason: 'write' }] as const) {
      mount(solved({ save }))
      expect(document.body.textContent, save.kind).not.toContain(copy.recommendSaveSavedBadge)
      cleanup()
    }
  })

  it('a refused write is an alert naming its reason', () => {
    mount(solved({ save: { kind: 'refused', reason: 'recovery-locked' } }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.recommendSaveRefusalRecoveryLockedHeading)
  })

  it('the ranked list is a table of three rows and a closing line; the winner wears its word', () => {
    mount(solved())
    expect(screen.getByText(copy.taxStratWinner)).toBeInTheDocument()
    expect(document.querySelectorAll('[data-ranked-list] tbody tr')).toHaveLength(3)
    expect(document.querySelector('[data-ranked-others]')).not.toBeNull()
  })

  it('the record card under the list names its standing in words', () => {
    mount(solved({ record: record(false) }))
    const standing = document.querySelector('[data-standing]')!
    expect(standing).toHaveAttribute('data-standing', 'superseded')
    expect(standing).toHaveTextContent(copy.recommendRecordSuperseded)
  })
})
