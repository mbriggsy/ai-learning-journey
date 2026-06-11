// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { CurrencyField, IntegerField, SegmentedControl, parseMoney, formatMoney } from '../fields'
import { copy } from '@ui/copy'

afterEach(cleanup)

describe('parseMoney / formatMoney', () => {
  it('strips $/commas/spaces and parses the raw number', () => {
    expect(parseMoney('$1,250,000')).toBe(1_250_000)
    expect(parseMoney(' 40 000 ')).toBe(40_000)
    expect(parseMoney('1234.56')).toBe(1234.56)
  })
  it('empty/garbage/negative → undefined (an absent fact, never 0 — burned/062)', () => {
    expect(parseMoney('')).toBeUndefined()
    expect(parseMoney('abc')).toBeUndefined()
    expect(parseMoney('-500')).toBeUndefined()
  })
  it('formats with grouping, no decimals', () => {
    expect(formatMoney(1_250_000)).toBe('1,250,000')
    expect(formatMoney(undefined)).toBe('')
  })
})

describe('CurrencyField — the currency entry discipline', () => {
  it('never reformats mid-typing (caret safety); commits the RAW number on blur; displays formatted', () => {
    const onCommit = vi.fn()
    render(
      <CurrencyField labelKey="spendLabel" field="annualSpendingReal" value={undefined} onCommit={onCommit} />,
    )
    const input = screen.getByLabelText(copy.spendLabel) as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '8500' } })
    expect(input.value).toBe('8500') // untouched while typing — no caret jump

    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith(8500) // the model stores the raw number
  })

  it('renders the formatted string for a committed value and raw digits on focus', () => {
    render(
      <CurrencyField labelKey="spendLabel" field="annualSpendingReal" value={8500} onCommit={() => {}} />,
    )
    const input = screen.getByLabelText(copy.spendLabel) as HTMLInputElement
    expect(input.value).toBe('8,500') // display = formatted string
    fireEvent.focus(input)
    expect(input.value).toBe('8500') // editing = raw, caret-stable
  })

  it('is a text field with the decimal keypad + no autofill (never type=number)', () => {
    render(
      <CurrencyField labelKey="spendLabel" field="annualSpendingReal" value={undefined} onCommit={() => {}} />,
    )
    const input = screen.getByLabelText(copy.spendLabel)
    expect(input.getAttribute('type')).toBe('text')
    expect(input.getAttribute('inputmode')).toBe('decimal')
    expect(input.getAttribute('autocomplete')).toBe('off')
  })

  it('an emptied field commits undefined — absent, never zero', () => {
    const onCommit = vi.fn()
    render(
      <CurrencyField labelKey="spendLabel" field="annualSpendingReal" value={8500} onCommit={onCommit} />,
    )
    const input = screen.getByLabelText(copy.spendLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith(undefined)
  })
})

describe('IntegerField', () => {
  it('commits whole numbers; junk and fractions → undefined', () => {
    const onCommit = vi.fn()
    render(
      <IntegerField labelKey="birthYearLabel" field="people.0.birthYear" value={undefined} onCommit={onCommit} />,
    )
    const input = screen.getByLabelText(copy.birthYearLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1961' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenLastCalledWith(1961)

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '19.5' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenLastCalledWith(undefined)
  })
})

describe('SegmentedControl — form-native radios, state by weight/fill', () => {
  it('renders real radios inside segment labels and fires onChange', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        legendKey="periodLegend"
        name="period"
        options={[
          { value: 'month', labelKey: 'periodMonth' },
          { value: 'year', labelKey: 'periodYear' },
        ]}
        value="month"
        onChange={onChange}
      />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect((radios[0] as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByLabelText(copy.periodYear))
    expect(onChange).toHaveBeenCalledWith('year')
  })

  it('marks the active segment with the state class (weight/fill carry it, not hue)', () => {
    render(
      <SegmentedControl
        legendKey="periodLegend"
        name="period"
        options={[
          { value: 'month', labelKey: 'periodMonth' },
          { value: 'year', labelKey: 'periodYear' },
        ]}
        value="year"
        onChange={() => {}}
      />,
    )
    expect(screen.getByLabelText(copy.periodYear).closest('label')!.className).toContain('segment-active')
    expect(screen.getByLabelText(copy.periodMonth).closest('label')!.className).not.toContain('segment-active')
  })
})
