import { describe, it, expect } from 'vitest'
import { parseVitestList, extractClaim, checkDocStats } from '../verify-doc-stats'

describe('doc test-count drift sentinel', () => {
  describe('parseVitestList', () => {
    it('counts cases as lines and files as unique path prefixes', () => {
      const stdout = [
        'src/a.test.ts > group > does X',
        'src/a.test.ts > group > does Y',
        'src/b.test.ts > does Z',
        'scripts/__tests__/c.test.ts > nested > deep > does W',
      ].join('\n')
      expect(parseVitestList(stdout)).toEqual({ cases: 4, files: 3 })
    })

    it('ignores banner/noise lines without the " > " delimiter', () => {
      const stdout = ['RUN v4.1.8', '', 'src/a.test.ts > does X', 'collected in 1.2s'].join('\n')
      expect(parseVitestList(stdout)).toEqual({ cases: 1, files: 1 })
    })

    it('normalizes CRLF (the Windows path)', () => {
      const stdout = 'src/a.test.ts > does X\r\nsrc/b.test.ts > does Y\r\n'
      expect(parseVitestList(stdout)).toEqual({ cases: 2, files: 2 })
    })

    it('takes the file as the text before the FIRST " > " even when a test name contains " > "', () => {
      const stdout = 'src/a.test.ts > renders a > b comparison correctly'
      expect(parseVitestList(stdout)).toEqual({ cases: 1, files: 1 })
    })
  })

  describe('extractClaim', () => {
    it('reads the README phrasing ("NNN tests across NN files")', () => {
      expect(extractClaim('carry **962 tests across 45 files**, all green')).toEqual({
        cases: 962,
        files: 45,
      })
    })

    it('reads the roadmap phrasing ("NNN vitest across NN files")', () => {
      expect(extractClaim('| 962 vitest across 45 files (Vitest 4) |')).toEqual({
        cases: 962,
        files: 45,
      })
    })

    it('returns null when no claim is present (the vacuous-guard trap)', () => {
      expect(extractClaim('the engine carries a comprehensive test suite')).toBeNull()
    })
  })

  describe('checkDocStats', () => {
    const actual = { cases: 962, files: 45 }

    it('passes when every surface matches the live suite', () => {
      const { ok } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 962, files: 45 } },
        { surface: 'docs/roadmap.md', claim: { cases: 962, files: 45 } },
      ])
      expect(ok).toBe(true)
    })

    it('FAILS a stale case count', () => {
      const { ok, results } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 942, files: 45 } },
      ])
      expect(ok).toBe(false)
      expect(results[0]!.reason).toContain('942 tests')
    })

    it('FAILS a stale file count', () => {
      const { ok } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 962, files: 44 } },
      ])
      expect(ok).toBe(false)
    })

    it('FAILS a surface whose claim went missing (reworded away)', () => {
      const { ok, results } = checkDocStats(actual, [{ surface: 'README.md', claim: null }])
      expect(ok).toBe(false)
      expect(results[0]!.reason).toContain('no')
    })

    it('catches cross-surface divergence (one updated, one not)', () => {
      const { ok } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 962, files: 45 } },
        { surface: 'docs/roadmap.md', claim: { cases: 942, files: 44 } },
      ])
      expect(ok).toBe(false)
    })
  })
})
