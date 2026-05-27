import { describe, it, expect } from 'vitest'
import type { MultiProjectReport } from '@/types'
import { deriveCloseModel } from './close-model'

type CloseInputs = Pick<MultiProjectReport['combined'], 'tokenWindowDays' | 'totalAuthoredLines'>

const combined = (tokenWindowDays: number | null, totalAuthoredLines: number): CloseInputs => ({
  tokenWindowDays,
  totalAuthoredLines,
})

describe('deriveCloseModel', () => {
  describe('hasTokens predicate (tokenWindowDays !== null, NOT > 0)', () => {
    it('null window → tokens suppressed, windowLine null', () => {
      const m = deriveCloseModel(combined(null, 5000), 9)
      expect(m.hasTokens).toBe(false)
      expect(m.windowLine).toBeNull()
    })

    it('measured-zero window (0) is DISTINCT from unmeasured → tokens shown', () => {
      // The bug the hero's predicate fixes: `> 0` would wrongly suppress a genuine measured-zero.
      const m = deriveCloseModel(combined(0, 5000), 9)
      expect(m.hasTokens).toBe(true)
    })

    it('positive window → tokens shown', () => {
      expect(deriveCloseModel(combined(30, 5000), 9).hasTokens).toBe(true)
    })
  })

  describe('windowLine wording', () => {
    it('null → null (no clause)', () => {
      expect(deriveCloseModel(combined(null, 1), 9).windowLine).toBeNull()
    })

    it('0 → "under a day" phrasing (avoids the "<" char in static HTML)', () => {
      expect(deriveCloseModel(combined(0, 1), 9).windowLine).toBe(
        'measured over under a day of session retention',
      )
    })

    it('positive N → "measured over a N-day window"', () => {
      expect(deriveCloseModel(combined(30, 1), 9).windowLine).toBe('measured over a 30-day window')
    })

    it('window of 1 still renders the N-day form', () => {
      expect(deriveCloseModel(combined(1, 1), 9).windowLine).toBe('measured over a 1-day window')
    })
  })

  describe('hasAuthored predicate (totalAuthoredLines > 0)', () => {
    it('0 lines → authored beat suppressed (never a "0 lines" figure)', () => {
      expect(deriveCloseModel(combined(30, 0), 9).hasAuthored).toBe(false)
    })

    it('positive lines → authored beat shown', () => {
      expect(deriveCloseModel(combined(30, 1), 9).hasAuthored).toBe(true)
    })
  })

  describe('projectLabel pluralization', () => {
    it('exactly 1 → singular', () => {
      expect(deriveCloseModel(combined(30, 1), 1).projectLabel).toBe('project')
    })

    it('0 → plural', () => {
      expect(deriveCloseModel(combined(30, 1), 0).projectLabel).toBe('projects')
    })

    it('many → plural', () => {
      expect(deriveCloseModel(combined(30, 1), 15).projectLabel).toBe('projects')
    })
  })

  describe('worst-case degrade (no JSONLs, no git)', () => {
    it('projects-only: both gates false, count preserved — never empty, never NaN', () => {
      const m = deriveCloseModel(combined(null, 0), 15)
      expect(m.hasTokens).toBe(false)
      expect(m.hasAuthored).toBe(false)
      expect(m.windowLine).toBeNull()
      expect(m.projectCount).toBe(15)
      expect(Number.isNaN(m.projectCount)).toBe(false)
    })
  })
})
