import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseVitestList,
  extractClaim,
  checkDocStats,
  TRACKED_SURFACES,
} from '../verify-doc-stats'

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
      // ...and that divergence check is only worth the ROSTER it runs on. `[].every()` is
      // TRUE, so an EMPTIED TRACKED_SURFACES makes main() print "OK — every tracked surface
      // matches the live suite" having read ZERO files. A SINGLE-ENTRY roster is the quieter
      // version: one real check still runs while docs/roadmap.md silently stops being covered
      // at all. Either way the gate reports green because it cannot see, and nothing imported
      // this const before, so both mutants survived the entire suite. The two gated surfaces
      // have stayed in lockstep precisely BECAUSE the gate reads both — that is the property
      // this arm protects. Bind the roster to DISK, not to a copied literal: every tracked
      // surface must EXIST and still carry a claim the extractor can read, there must be at
      // least TWO DISTINCT ones (a duplicated entry would pass a .length check), and they must
      // agree with EACH OTHER right now. Deliberately NOT compared to the live vitest count —
      // that would red `pnpm test` on every test-adding commit until the docs were re-stamped.
      // ⚠️ ORDER IS LOAD-BEARING: the size check must stay FIRST. The final agreement check
      // passes vacuously on a one-element roster, so it only discriminates behind that floor.
      expect(new Set<string>(TRACKED_SURFACES).size).toBeGreaterThanOrEqual(2)
      const onDisk = TRACKED_SURFACES.map((surface) => ({
        surface,
        claim: extractClaim(readFileSync(join(process.cwd(), surface), 'utf-8')),
      }))
      for (const { surface, claim } of onDisk) {
        expect(claim, `${surface} carries no readable "NNN tests across NN files" claim`).not.toBeNull()
      }
      expect(new Set(onDisk.map((s) => JSON.stringify(s.claim))).size).toBe(1)
    })
  })
})
