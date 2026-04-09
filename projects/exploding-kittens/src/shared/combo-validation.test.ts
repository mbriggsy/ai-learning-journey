import { describe, it, expect } from 'vitest'
import { validateCombo } from './combo-validation'
import type { CardInstance } from './types'

function card(id: string, type: string): CardInstance {
  return { id, type: type as CardInstance['type'] }
}

describe('validateCombo', () => {
  const hand: CardInstance[] = [
    card('1', 'go-dark'), card('2', 'go-dark'), card('3', 'go-dark'),
    card('4', 'reassign'), card('5', 'dash-barlowe'), card('6', 'dash-barlowe'),
    card('7', 'agent-x'), card('8', 'agent-x'),
    card('9', 'extraction'), card('10', 'burned'),
    card('11', 'intercepted'), card('12', 'call-in-a-favor'),
  ]

  // --- Singles ---
  it('validates single action card', () => {
    const result = validateCombo([card('1', 'go-dark')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.playType.kind).toBe('single')
    }
  })

  it('rejects single operative card', () => {
    const result = validateCombo([card('5', 'dash-barlowe')], hand)
    expect(result).toEqual({ valid: false, reason: 'single-operative' })
  })

  it('rejects single agent-x', () => {
    const result = validateCombo([card('7', 'agent-x')], hand)
    expect(result).toEqual({ valid: false, reason: 'single-operative' })
  })

  it('rejects extraction in combo', () => {
    const result = validateCombo([card('9', 'extraction')], hand)
    expect(result).toEqual({ valid: false, reason: 'contains-extraction' })
  })

  it('rejects burned card', () => {
    const result = validateCombo([card('10', 'burned')], hand)
    expect(result).toEqual({ valid: false, reason: 'contains-burned' })
  })

  it('identifies direct order as requiring target', () => {
    const h = [card('a', 'direct-order')]
    const result = validateCombo([card('a', 'direct-order')], h)
    expect(result.valid).toBe(true)
    if (result.valid && result.playType.kind === 'single') {
      expect(result.playType.requiresTarget).toBe(true)
    }
  })

  it('identifies call-in-a-favor as requiring target', () => {
    const result = validateCombo([card('12', 'call-in-a-favor')], hand)
    expect(result.valid).toBe(true)
    if (result.valid && result.playType.kind === 'single') {
      expect(result.playType.requiresTarget).toBe(true)
    }
  })

  // --- Pairs ---
  it('validates matching pair', () => {
    const result = validateCombo([card('1', 'go-dark'), card('2', 'go-dark')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('validates operative pair', () => {
    const result = validateCombo([card('5', 'dash-barlowe'), card('6', 'dash-barlowe')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('validates agent-x + operative pair', () => {
    const result = validateCombo([card('7', 'agent-x'), card('5', 'dash-barlowe')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('validates two agent-x as pair', () => {
    const result = validateCombo([card('7', 'agent-x'), card('8', 'agent-x')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('rejects agent-x + non-operative pair', () => {
    const result = validateCombo([card('7', 'agent-x'), card('1', 'go-dark')], hand)
    expect(result).toEqual({ valid: false, reason: 'mismatched-types' })
  })

  it('rejects mismatched pair', () => {
    const result = validateCombo([card('1', 'go-dark'), card('4', 'reassign')], hand)
    expect(result).toEqual({ valid: false, reason: 'mismatched-types' })
  })

  // --- Triples ---
  it('validates matching triple', () => {
    const result = validateCombo([card('1', 'go-dark'), card('2', 'go-dark'), card('3', 'go-dark')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('triple')
  })

  // --- Edge cases ---
  it('rejects empty selection', () => {
    const result = validateCombo([], hand)
    expect(result).toEqual({ valid: false, reason: 'invalid-count' })
  })

  it('rejects card not in hand', () => {
    const result = validateCombo([card('99', 'go-dark')], hand)
    expect(result).toEqual({ valid: false, reason: 'invalid-count' })
  })
})
