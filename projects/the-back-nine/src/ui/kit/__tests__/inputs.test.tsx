// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { NAME_CEILING } from '@shared/nameBounds'
import { Button, BUTTON_VARIANTS } from '../Button'
import { Checkbox } from '../Checkbox'
import { ChoiceGroup } from '../ChoiceGroup'
import { Switch } from '../Switch'
import { MoneyInput, PercentInput, WholeInput } from '../NumberInputs'
import { TextInput } from '../TextInput'

/**
 * The kit's button variants, its figure boxes, its words box and its choice group. The figure boxes parse and format
 * through `src/intake/moneyFormat.ts` (the intake's own currency discipline), so a figure the walk refused is refused
 * here the same way: nothing is committed, what was typed stays, and the caller's words say why, tied to the field.
 * Since Act 6 · RC14 deleted the walk's own fields (`src/intake/fields.tsx`) these are their only home: a figure box is
 * a text field with the number keypad and no autofill (never `type="number"`), silent and unformatted while typing, the
 * raw figure committed on blur, a blank committed as "no figure" (never 0), a refusal forgiven the instant the box is
 * edited again; a name stops at the name ceiling as it is typed and a stored longer one is never rewritten; a press on
 * a choice already checked still counts as an answer.
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

describe('every figure box', () => {
  it('is a text field with the number keypad and no autofill, never type="number"', () => {
    render(
      <>
        <MoneyInput label="Money" value={undefined} invalidMessage="x" />
        <PercentInput label="Percent" value={undefined} invalidMessage="x" />
        <WholeInput label="Whole" value={undefined} invalidMessage="x" />
      </>,
    )
    for (const [label, keypad] of [['Money', 'decimal'], ['Percent', 'decimal'], ['Whole', 'numeric']] as const) {
      const box = screen.getByLabelText(label)
      expect(box, label).toHaveAttribute('type', 'text')
      expect(box, label).toHaveAttribute('inputmode', keypad)
      expect(box, label).toHaveAttribute('autocomplete', 'off')
    }
  })

  // back-nine-design: "errors clear the instant the field is re-edited (on input), not on the next blur". The walk's
  // fields did it through `onEdit`; the kit shows a caller's refusal until the caller drops it, and the caller hears
  // nothing before the blur commits.
  it('a caller’s refusal clears the instant the box is edited again, not on its blur', () => {
    render(<MoneyInput label="Balance" value={undefined} error="Still need the balance today." invalidMessage="x" />)
    const box = screen.getByLabelText('Balance')
    expect(screen.getByRole('alert')).toHaveTextContent('Still need the balance today.')
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: '1' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(box).not.toHaveAttribute('aria-invalid')
  })
})

describe('MoneyInput', () => {
  it('what is typed stays exactly as typed until the blur (no reformat mid-typing: the caret never jumps); the blur commits the raw figure and shows it formatted', () => {
    const onCommit = vi.fn()
    render(<MoneyHost onCommit={onCommit} />)
    const box = screen.getByLabelText('Yearly pay')
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: '8500' } })
    expect(box).toHaveValue('8500')
    fireEvent.blur(box)
    expect(onCommit).toHaveBeenCalledWith(8500)
    expect(box).toHaveValue('8,500')
  })

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

  it('a tab through the box with no typing commits nothing: the rounded figure it shows never replaces the exact one', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    // A monthly 7,083.33 typed in the walk is stored as 84,999.96 a year; the box shows it to the dollar.
    render(<MoneyHost onCommit={onCommit} start={84_999.96} />)
    const box = screen.getByLabelText('Yearly pay')
    expect(box).toHaveValue('85,000')
    await user.click(box)
    await user.tab()
    await user.click(box)
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onCommit).not.toHaveBeenCalled()
    expect(box).toHaveValue('85,000')
    // Typing the shown figure again after a real change does commit it.
    await user.clear(box)
    await user.type(box, '90,000{Enter}')
    await user.clear(box)
    await user.type(box, '85,000{Enter}')
    expect(onCommit.mock.calls).toEqual([[90_000], [85_000]])
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

  it('a box focused while locked keeps no draft: unlocked with a new figure, it shows that figure, and a tab through commits nothing', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    const view = render(<MoneyInput label="Line" value={9_600} onCommit={onCommit} readOnly invalidMessage="x" />)
    await user.click(screen.getByLabelText('Line'))
    await user.tab()
    view.rerender(<MoneyInput label="Line" value={12_000} onCommit={onCommit} invalidMessage="x" />)
    expect(screen.getByLabelText('Line')).toHaveValue('12,000')
    await user.click(screen.getByLabelText('Line'))
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

  it('a tab through the box with no typing commits nothing (the shown percent is rounded to two places)', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(<PercentInput label="Yearly raise" value={0.123456} onCommit={onCommit} invalidMessage="Type a percent." />)
    const box = screen.getByLabelText('Yearly raise')
    expect(box).toHaveValue('12.35')
    await user.click(box)
    await user.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('WholeInput (the tray’s year and age boxes, RC4b)', () => {
  it('a whole number commits; a decimal, a sign or words commit nothing and keep what was typed, with the words tied to the box', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(<WholeInput label="Year work stops" value={2031} onCommit={onCommit} invalidMessage="A whole number." />)
    const box = screen.getByLabelText('Year work stops')
    expect(box).toHaveAttribute('inputmode', 'numeric')
    for (const bad of ['2031.5', '-3', 'soon']) {
      await user.clear(box)
      await user.type(box, bad)
      await user.tab()
      expect(onCommit, bad).not.toHaveBeenCalled()
      expect(box).toHaveValue(bad)
      expect(box).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('alert')).toHaveTextContent('A whole number.')
    }
    await user.clear(box)
    await user.type(box, '2033')
    await user.tab()
    expect(onCommit).toHaveBeenCalledWith(2033)
  })
})

// The name ceiling (Briggsy's design-ceiling ruling, 2026-11-21; the frames-outside plan's KTD12), as the person drawer
// and the new-plan drawer pass it to the words box. The 20 is typed here once on purpose, never read from NAME_CEILING:
// a test that derives its number from the constant moves with the constant and can never catch a wrong edit to it
// (insight 151).
describe('TextInput with the name ceiling: typing stops at it; a stored name is never rewritten', () => {
  const name25 = 'Abcdefghijklmnopqrstuvwxy'
  const nameBox = (value: string | undefined, onCommit: (v: string | undefined) => void) => (
    <>
      <TextInput label="First name" value={value} maxLength={NAME_CEILING} autoComplete="given-name" onCommit={onCommit} />
      <button type="button">elsewhere</button>
    </>
  )

  it('typing a 25-character name keeps the first 20, and commits those 20', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(nameBox(undefined, onCommit))
    const box = screen.getByLabelText('First name')
    await user.type(box, name25)
    expect(box).toHaveValue(name25.slice(0, 20))
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onCommit).toHaveBeenCalledWith(name25.slice(0, 20))
  })

  it('a 20-character name is kept whole', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(nameBox(undefined, onCommit))
    await user.type(screen.getByLabelText('First name'), 'Abcdefghij Klmnopqrs')
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onCommit).toHaveBeenCalledWith('Abcdefghij Klmnopqrs')
  })

  it('a restored name already longer than the ceiling shows whole and commits whole (the cap limits typing only)', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(nameBox(name25, onCommit))
    const box = screen.getByLabelText('First name')
    expect(box).toHaveValue(name25)
    await user.click(box)
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onCommit.mock.calls).toEqual([[name25]])
    expect(box).toHaveValue(name25)
  })
})

describe('ChoiceGroup: native radios in their labels, the checked one marked by more than colour', () => {
  function Host({ onValueChange, start }: { readonly onValueChange: (v: 'month' | 'year') => void; readonly start?: 'month' | 'year' }) {
    const [value, setValue] = useState<'month' | 'year' | undefined>(start)
    return (
      <ChoiceGroup<'month' | 'year'>
        legend="How often?"
        name="period"
        items={[
          { value: 'month', label: 'A month' },
          { value: 'year', label: 'A year' },
        ]}
        value={value}
        onValueChange={(v) => {
          setValue(v)
          onValueChange(v)
        }}
      />
    )
  }

  it('real radios, named by their words; nothing checked unless the caller says so', () => {
    render(<Host onValueChange={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios.every((r) => !(r as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByRole('group', { name: 'How often?' })).toBeInTheDocument()
  })

  it('a press on an unchecked choice reports it once; a press on the ALREADY-checked choice reports it once too (an explicit answer)', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Host onValueChange={onValueChange} start="month" />)
    await user.click(screen.getByText('A year'))
    expect(onValueChange.mock.calls).toEqual([['year']])
    expect(screen.getByRole('radio', { name: 'A year' })).toBeChecked()
    onValueChange.mockClear()
    await user.click(screen.getByText('A year'))
    expect(onValueChange.mock.calls).toEqual([['year']])
    onValueChange.mockClear()
    await user.click(screen.getByRole('radio', { name: 'A year' }))
    expect(onValueChange.mock.calls).toEqual([['year']])
  })

  it('the checked choice carries a filled dot and medium weight, the other neither (weight and fill, never hue alone)', () => {
    render(<Host onValueChange={() => {}} start="year" />)
    const year = screen.getByRole('radio', { name: 'A year' }).closest('label')!
    const month = screen.getByRole('radio', { name: 'A month' }).closest('label')!
    expect(year).toHaveAttribute('data-checked', 'true')
    expect(year).toHaveClass('font-medium')
    expect(year.querySelector('[aria-hidden="true"] > span')).not.toBeNull()
    expect(month).not.toHaveAttribute('data-checked')
    expect(month).not.toHaveClass('font-medium')
    expect(month.querySelector('[aria-hidden="true"] > span')).toBeNull()
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
