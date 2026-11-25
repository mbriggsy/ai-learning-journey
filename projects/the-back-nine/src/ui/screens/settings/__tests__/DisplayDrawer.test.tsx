// @vitest-environment jsdom
/**
 * The Display drawer (Act 6 · RC18): two switches whose lines follow their position, Save hands the copy over and
 * Cancel drops it, and no future-dollars control anywhere (today's dollars is stated, never offered as a switch, until
 * `src/engine/priceIndex.ts` backs a future-dollars view: critique 12).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { copy } from '../../../copy'
import { DEFAULT_DISPLAY } from '../../../displaySettings'
import { DisplayDoor, DisplayDrawer } from '../DisplayDrawer'

afterEach(cleanup)

const openDrawer = (onSave = vi.fn(), onClose = vi.fn()) => {
  render(<DisplayDrawer open settings={DEFAULT_DISPLAY} onSave={onSave} onClose={onClose} />)
  return { dialog: screen.getByRole('dialog', { name: copy.displayTitle }), onSave, onClose }
}

describe('the Display drawer', () => {
  it('states today’s dollars and offers exactly two switches: one scale for both halves (on) and years instead of ages (off)', () => {
    const { dialog } = openDrawer()
    expect(within(dialog).getByText(copy.displayTodaysDollarsLine)).toBeInTheDocument()
    const switches = within(dialog).getAllByRole('switch')
    expect(switches).toHaveLength(2)
    expect(within(dialog).getByRole('switch', { name: copy.displaySameScale })).toBeChecked()
    expect(within(dialog).getByRole('switch', { name: copy.displayYears })).not.toBeChecked()
  })

  it('no future-dollars control exists: no control names future or nominal dollars, and today’s dollars is no switch', () => {
    const { dialog } = openDrawer()
    for (const control of within(dialog).queryAllByRole('switch').concat(within(dialog).queryAllByRole('checkbox'), within(dialog).queryAllByRole('radio'))) {
      expect(control.getAttribute('aria-labelledby') === null ? control.textContent : document.getElementById(control.getAttribute('aria-labelledby')!)?.textContent).not.toMatch(/future|nominal|today/i)
    }
    expect(within(dialog).queryByRole('switch', { name: /dollars/i })).toBeNull()
  })

  it('each line follows its switch, and Save hands over the new choices', () => {
    const { dialog, onSave } = openDrawer()
    expect(within(dialog).getByText(copy.displayYearsOff)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('switch', { name: copy.displayYears }))
    expect(within(dialog).getByText(copy.displayYearsOn)).toBeInTheDocument()
    expect(within(dialog).getByText(copy.displaySameScaleOn)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('switch', { name: copy.displaySameScale }))
    expect(within(dialog).getByText(copy.displaySameScaleOff)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave }))
    expect(onSave).toHaveBeenCalledWith({ timeAxis: 'years', sameScale: false })
  })

  it('Cancel drops the moved switches: nothing is handed over', () => {
    const { dialog, onSave, onClose } = openDrawer()
    fireEvent.click(within(dialog).getByRole('switch', { name: copy.displayYears }))
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerCancel }))
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('the door beside the folder tabs', () => {
  it('names itself with its visible words, and opens the drawer; with no drawer, the plain words', () => {
    const onOpen = vi.fn()
    render(<DisplayDoor onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: copy.displayDoorLabel }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(copy.displayDoorLabel.toLowerCase()).toContain(copy.probabilityTodaysDollars.toLowerCase())
    cleanup()
    render(<DisplayDoor />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(copy.probabilityTodaysDollars)).toBeInTheDocument()
  })
})
