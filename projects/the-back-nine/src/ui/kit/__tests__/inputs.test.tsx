// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button, BUTTON_VARIANTS } from '../Button'
import { Checkbox } from '../Checkbox'
import { Switch } from '../Switch'
import { MoneyInput, PercentInput } from '../NumberInputs'

/**
 * The kit's button variants and its two figure boxes. The boxes parse and format through `src/intake/moneyFormat.ts`
 * (the intake's own currency discipline), so a figure the walk refuses is refused here the same way: nothing is
 * committed, what was typed stays, and the caller's words say why, tied to the field.
 */
afterEach(cleanup)

describe('Button', () => {
  it('every variant renders, each with its own look, and the neutral one is outlined (never white on grey)', () => {
    render(
      <>
        {BUTTON_VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
      </>,
    )
    const looks = BUTTON_VARIANTS.map((v) => screen.getByRole('button', { name: v }))
    looks.forEach((b, i) => expect(b).toHaveAttribute('data-variant', BUTTON_VARIANTS[i]))
    expect(new Set(looks.map((b) => b.className)).size).toBe(BUTTON_VARIANTS.length)
    expect(screen.getByRole('button', { name: 'primary' })).toHaveClass('bg-blue-ink', 'text-bg')
    expect(screen.getByRole('button', { name: 'destructive' })).toHaveClass('bg-coral-ink', 'text-bg')
    expect(screen.getByRole('button', { name: 'neutral' })).toHaveClass('border-stone-300', 'bg-bg', 'text-stone-900')
  })

  it('a button that opens a menu carries its chevron; a plain one does not', () => {
    render(
      <>
        <Button opensMenu>Add</Button>
        <Button>Save</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Add' }).querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Save' }).querySelector('svg')).toBeNull()
  })
})

/** A parent that holds the committed figure, as a screen does. */
function MoneyHost({ onCommit, start }: { readonly onCommit: (v: number | undefined) => void; readonly start?: number }) {
  const [value, setValue] = useState<number | undefined>(start)
  return (
    <>
      <MoneyInput
        label="Yearly pay"
        value={value}
        onCommit={(v) => {
          setValue(v)
          onCommit(v)
        }}
        invalidMessage="Type a dollar figure."
      />
      <button type="button">elsewhere</button>
    </>
  )
}

describe('MoneyInput', () => {
  it('"$1,234" commits 1234 on blur and shows "1,234" with the $ outside the text', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(<MoneyHost onCommit={onCommit} />)
    const box = screen.getByLabelText('Yearly pay')
    expect(box).toHaveAttribute('inputmode', 'decimal')
    expect(box).toHaveAttribute('autocomplete', 'off')
    await user.type(box, '$1,234')
    expect(onCommit).not.toHaveBeenCalled() // silent while typing
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onCommit).toHaveBeenCalledWith(1234)
    expect(box).toHaveValue('1,234')
    expect(box).not.toHaveAttribute('aria-invalid')
  })

  it('Enter commits too', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(<MoneyHost onCommit={onCommit} />)
    await user.type(screen.getByLabelText('Yearly pay'), '80000{Enter}')
    expect(onCommit).toHaveBeenCalledWith(80000)
  })

  it.each(['1,23', '1e6', '0x186a0', 'lots'])('refuses %s the way moneyFormat.ts does: no commit, the text kept, the words tied', async (typed) => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(<MoneyHost onCommit={onCommit} start={5000} />)
    const box = screen.getByLabelText('Yearly pay')
    await user.clear(box)
    await user.type(box, typed)
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onCommit).not.toHaveBeenCalled()
    expect(box).toHaveValue(typed)
    expect(box).toHaveAttribute('aria-invalid', 'true')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Type a dollar figure.')
    expect(box.getAttribute('aria-describedby')).toContain(alert.id)
    // Editing again clears the mark at once (calm: forgiven on return).
    await user.type(box, '0')
    expect(box).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a cleared box commits "no figure" (undefined), never 0', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(<MoneyHost onCommit={onCommit} start={5000} />)
    const box = screen.getByLabelText('Yearly pay')
    expect(box).toHaveValue('5,000')
    await user.clear(box)
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onCommit).toHaveBeenCalledWith(undefined)
  })

  it('read-only takes no commit', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(<MoneyInput label="Locked" value={10} onCommit={onCommit} readOnly invalidMessage="x" />)
    const box = screen.getByLabelText('Locked')
    expect(box).toHaveAttribute('readonly')
    await user.type(box, '5')
    await user.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('PercentInput', () => {
  it('"2.5%" commits the fraction 0.025 and shows "2.5"', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    function Host() {
      const [v, setV] = useState<number | undefined>(undefined)
      return (
        <PercentInput
          label="Yearly raise"
          value={v}
          onCommit={(n) => {
            setV(n)
            onCommit(n)
          }}
          invalidMessage="Type a percent."
        />
      )
    }
    render(<Host />)
    const box = screen.getByLabelText('Yearly raise')
    await user.type(box, '2.5%')
    await user.tab()
    expect(onCommit).toHaveBeenCalledWith(0.025)
    expect(box).toHaveValue('2.5')
  })
})

describe('Switch and Checkbox: named by their words, one toggle per click (on the control or on the words)', () => {
  function Host() {
    const [on, setOn] = useState(false)
    const [held, setHeld] = useState(false)
    return (
      <>
        <Switch label="Future dollars" checked={on} onCheckedChange={setOn} />
        <Checkbox label="Held jointly" checked={held} onCheckedChange={setHeld} />
      </>
    )
  }

  it('toggles once per click', async () => {
    const user = userEvent.setup()
    render(<Host />)
    const sw = screen.getByRole('switch', { name: 'Future dollars' })
    const box = screen.getByRole('checkbox', { name: 'Held jointly' })
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByText('Future dollars'))
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByText('Held jointly'))
    expect(box).toHaveAttribute('aria-checked', 'false')
  })
})
