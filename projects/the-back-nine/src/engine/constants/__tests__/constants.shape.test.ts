import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { ALL_CONSTANTS, taxConstants, healthConstants } from '../index'
import { isUnsourced } from '../types'

const SRC = join(process.cwd(), 'src')

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full))
    } else if (/\.tsx?$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

describe('canonical constants — shape & provenance (contract #6)', () => {
  it('every entry carries a citation and a directional marker', () => {
    for (const [key, entry] of Object.entries(ALL_CONSTANTS)) {
      expect(typeof entry.citation, `${key}.citation`).toBe('string')
      expect(entry.citation.length, `${key}.citation non-empty`).toBeGreaterThan(0)
      expect(typeof entry.directionalUntilPinned, `${key}.directionalUntilPinned`).toBe('boolean')
    }
  })

  it('sourced figures read; unsourced gap sentinels THROW on read (burned/062)', () => {
    for (const [key, entry] of Object.entries(ALL_CONSTANTS)) {
      if (isUnsourced(entry)) {
        expect(() => entry.value, `${key} (gap) must throw on read`).toThrow(/not yet sourced/)
        expect(entry.pinTo.length, `${key}.pinTo`).toBeGreaterThan(0)
      } else {
        expect(() => entry.value, `${key} must not throw`).not.toThrow()
        expect(entry.value, `${key}.value defined`).toBeDefined()
      }
    }
  })

  it('the 4 named tax gaps are now SOURCED + still directional (U2 prerequisite closed; pin gate still pending)', () => {
    for (const key of [
      'ordinaryBracketsSingle',
      'age65AdditionSingle',
      'capitalGainsBreakpoints',
      'uniformLifetimeTableDivisors',
    ] as const) {
      const entry = taxConstants[key]
      expect(isUnsourced(entry), `${key} is sourced (not a throw-on-read gap)`).toBe(false)
      expect(() => entry.value, `${key} reads without throwing`).not.toThrow()
      expect(entry.directionalUntilPinned, `${key} stays directional until the IRS-primary pin gate`).toBe(true)
    }
  })

  it('the Joint Life & Last Survivor grid (Table II) remains the one tracked tax gap (mechanics verified, ~3k-cell grid pending)', () => {
    expect(isUnsourced(taxConstants.jointLifeLastSurvivorTable)).toBe(true)
    expect(() => taxConstants.jointLifeLastSurvivorTable.value).toThrow(/not yet sourced/)
  })

  it('the sourced tax gaps carry their landmine-guarding shapes (a "half of MFJ" regression fails loud)', () => {
    const single = taxConstants.ordinaryBracketsSingle.value
    expect(single).toHaveLength(7)
    expect(single[6]?.upTo, 'top bracket never capped (no Infinity/NaN)').toBeNull()
    // 35% single edge is $640,600 — NOT ½ of MFJ's $768,700 (the documented landmine).
    expect(single[5]?.upTo).toBe(640_600)
    // single age-65 addition is $2,050 — not the MFJ $1,650, not the $6k senior bonus.
    expect(taxConstants.age65AdditionSingle.value).toBe(2_050)

    const cg = taxConstants.capitalGainsBreakpoints.value
    expect(cg.single.fifteenRateUpTo, 'single 15%-top is NOT ½ of MFJ 613,700').toBe(545_500)
    expect(cg.mfj.zeroRateUpTo).toBe(98_900)

    const ult = taxConstants.uniformLifetimeTableDivisors.value
    expect(ult).toHaveLength(49)
    expect(ult.find((r) => r.age === 75)?.divisor, 'Pub 590-B worked-example anchor').toBe(24.6)
    expect(ult.find((r) => r.age === 72)?.divisor, 'post-2022 table (pre-2022 was 25.6)').toBe(27.4)
    expect(ult[ult.length - 1], 'terminal "120 and over" clamp bucket').toEqual({ age: 120, divisor: 2.0 })
  })

  it('the ACA legislative entry carries reVerifyEveryBuild (the CI gate hooks this)', () => {
    expect(healthConstants.acaEnhancedSubsidyStatus.reVerifyEveryBuild).toBe(true)
  })

  it('the senior-bonus phase-out encodes the both-65 ceiling, not just the one-spouse $250k landmine', () => {
    const sb = taxConstants.seniorBonus.value
    expect(sb.fullyGoneAbove.mfjOneSpouse65).toBe(250_000)
    expect(sb.fullyGoneAbove.mfjBothSpouses65).toBe(350_000)
    expect(taxConstants.seniorBonus.sunsetAfter).toBe(2028)
  })

  it('ALL_CONSTANTS is DERIVED from the tables, never hand-listed (burned/061)', () => {
    const expected = Object.keys(taxConstants).length + Object.keys(healthConstants).length
    expect(Object.keys(ALL_CONSTANTS).length).toBe(expected)
  })

  // burned/063 single-source gate + burned/027 presence companion: distinctive
  // figures must live in the constants module and NOWHERE else in src/.
  describe('single-source: no overlay number is inlined outside the constants module', () => {
    const DISTINCTIVE = [
      '768700', '512450', '218000', '84600', '202.9', '689.9',
      // the newly-sourced single-bracket + cap-gains edges (distinctive 6-digit figures)
      '640600', '545500', '613700',
    ]
    // Underscore-insensitive so 768_700 and 768700 both match.
    const norm = (s: string) => s.replace(/_/g, '')

    const allTs = walkTs(SRC)
    const rel = (f: string) => relative(SRC, f).split(sep).join('/')
    const inConstants = (f: string) => rel(f).startsWith('engine/constants/')
    // Presence reads only the constants SOURCE — excluding tests, so this file's own
    // DISTINCTIVE array can't make the companion pass vacuously (burned/027).
    const inConstantsSrc = (f: string) => inConstants(f) && !rel(f).includes('__tests__')

    it('presence companion — every distinctive value exists in the constants module', () => {
      const constantsBlob = norm(
        allTs.filter(inConstantsSrc).map((f) => readFileSync(f, 'utf-8')).join('\n'),
      )
      for (const v of DISTINCTIVE) {
        expect(constantsBlob.includes(v), `${v} present in constants module`).toBe(true)
      }
    })

    it('the gate — no distinctive value appears in any src file outside the constants module', () => {
      const offenders: string[] = []
      for (const f of allTs) {
        if (inConstants(f)) continue
        const blob = norm(readFileSync(f, 'utf-8'))
        for (const v of DISTINCTIVE) {
          if (blob.includes(v)) offenders.push(`${relative(SRC, f)} inlines ${v}`)
        }
      }
      expect(offenders, 'inlined constants found (read them from @engine/constants instead)').toEqual([])
    })
  })
})
