import { describe, it, expect } from 'vitest'
import { validateCombo } from './combo-validation'
import type { CardInstance } from './types'

function card(id: string, type: string): CardInstance {
  return { id, type: type as CardInstance['type'] }
}

describe('validateCombo', () => {
  const hand: CardInstance[] = [
    card('1', 'skip'), card('2', 'skip'), card('3', 'skip'),
    card('4', 'attack'), card('5', 'taco-cat'), card('6', 'taco-cat'),
    card('7', 'feral-cat'), card('8', 'feral-cat'),
    card('9', 'defuse'), card('10', 'exploding-kitten'),
    card('11', 'nope'), card('12', 'favor'),
  ]

  // --- Singles ---
  it('validates single action card', () => {
    const result = validateCombo([card('1', 'skip')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.playType.kind).toBe('single')
    }
  })

  it('rejects single cat card', () => {
    const result = validateCombo([card('5', 'taco-cat')], hand)
    expect(result).toEqual({ valid: false, reason: 'single-cat' })
  })

  it('rejects single feral cat', () => {
    const result = validateCombo([card('7', 'feral-cat')], hand)
    expect(result).toEqual({ valid: false, reason: 'single-cat' })
  })

  it('rejects defuse in combo', () => {
    const result = validateCombo([card('9', 'defuse')], hand)
    expect(result).toEqual({ valid: false, reason: 'contains-defuse' })
  })

  it('rejects exploding kitten', () => {
    const result = validateCombo([card('10', 'exploding-kitten')], hand)
    expect(result).toEqual({ valid: false, reason: 'contains-ek' })
  })

  it('identifies targeted attack as requiring target', () => {
    const h = [card('a', 'targeted-attack')]
    const result = validateCombo([card('a', 'targeted-attack')], h)
    expect(result.valid).toBe(true)
    if (result.valid && result.playType.kind === 'single') {
      expect(result.playType.requiresTarget).toBe(true)
    }
  })

  it('identifies favor as requiring target', () => {
    const result = validateCombo([card('12', 'favor')], hand)
    expect(result.valid).toBe(true)
    if (result.valid && result.playType.kind === 'single') {
      expect(result.playType.requiresTarget).toBe(true)
    }
  })

  // --- Pairs ---
  it('validates matching pair', () => {
    const result = validateCombo([card('1', 'skip'), card('2', 'skip')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('validates cat pair', () => {
    const result = validateCombo([card('5', 'taco-cat'), card('6', 'taco-cat')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('validates feral + cat pair', () => {
    const result = validateCombo([card('7', 'feral-cat'), card('5', 'taco-cat')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('validates two ferals as pair', () => {
    const result = validateCombo([card('7', 'feral-cat'), card('8', 'feral-cat')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('pair')
  })

  it('rejects feral + non-cat pair', () => {
    const result = validateCombo([card('7', 'feral-cat'), card('1', 'skip')], hand)
    expect(result).toEqual({ valid: false, reason: 'mismatched-types' })
  })

  it('rejects mismatched pair', () => {
    const result = validateCombo([card('1', 'skip'), card('4', 'attack')], hand)
    expect(result).toEqual({ valid: false, reason: 'mismatched-types' })
  })

  // --- Triples ---
  it('validates matching triple', () => {
    const result = validateCombo([card('1', 'skip'), card('2', 'skip'), card('3', 'skip')], hand)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.playType.kind).toBe('triple')
  })

  // --- Edge cases ---
  it('rejects empty selection', () => {
    const result = validateCombo([], hand)
    expect(result).toEqual({ valid: false, reason: 'invalid-count' })
  })

  it('rejects card not in hand', () => {
    const result = validateCombo([card('99', 'skip')], hand)
    expect(result).toEqual({ valid: false, reason: 'invalid-count' })
  })
})
