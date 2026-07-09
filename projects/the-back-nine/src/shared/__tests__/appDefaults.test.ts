/**
 * P3·U13 — the app methodology-default era map (council 2026-07-09, Q7 REBUILT).
 * The DIRECTION is the tested law: immunity keys on the SAVED era's default, and an
 * unknown era is not-comparable — never "not overridden".
 */
import { describe, expect, it } from 'vitest'
import { appDefaultEraFor, CURRENT_APP_DEFAULT_VERSION } from '../appDefaults'

describe('appDefaults — the saved-era map', () => {
  it('the CURRENT version always has an era entry (a stamp with no comparator is staleness-undetectable by construction)', () => {
    expect(appDefaultEraFor(CURRENT_APP_DEFAULT_VERSION)).toBeDefined()
  })

  it('an UNKNOWN era (a future build’s stamp read by this build) is undefined — not-comparable, never coerced to "not overridden"', () => {
    expect(appDefaultEraFor('p9-from-the-future')).toBeUndefined()
    expect(appDefaultEraFor('')).toBeUndefined()
  })

  it('the p2-d1 era pins the shipped survivor-ratio default (0.75 — the value memoryModel single-sources from here)', () => {
    expect(appDefaultEraFor('p2-d1')).toEqual({ survivorSpendingRatio: 0.75 })
  })
})
