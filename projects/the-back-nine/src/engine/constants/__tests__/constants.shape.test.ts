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

  it('the formerly-unsourced tax gaps are now ALL SOURCED + still directional (U2 closed; pin gate still pending)', () => {
    for (const key of [
      'ordinaryBracketsSingle',
      'age65AdditionSingle',
      'capitalGainsBreakpoints',
      'uniformLifetimeTableDivisors',
      'jointLifeLastSurvivorTable', // the last gap — closed in M6b
    ] as const) {
      const entry = taxConstants[key]
      expect(isUnsourced(entry), `${key} is sourced (not a throw-on-read gap)`).toBe(false)
      expect(() => entry.value, `${key} reads without throwing`).not.toThrow()
      expect(entry.directionalUntilPinned, `${key} stays directional until the IRS-primary pin gate`).toBe(true)
    }
  })

  it('the Joint Life & Last Survivor grid (Table II) matches its independent oracle + the reg structure (M6b, DND/012)', () => {
    const entry = taxConstants.jointLifeLastSurvivorTable
    expect(isUnsourced(entry), 'JLLS is sourced (the last tax gap, closed in M6b)').toBe(false)
    if (isUnsourced(entry)) return // narrow the type
    const t = entry.value
    // Domain: owner 72..120, spouse 1..(owner-11); 49 owner rows, each the right width.
    expect([t.minOwnerAge, t.maxAge, t.minSpouseAge]).toEqual([72, 120, 1])
    expect(Object.keys(t.byOwnerThenSpouse)).toHaveLength(49)
    const cell = (owner: number, spouse: number) => t.byOwnerThenSpouse[owner]?.[spouse - t.minSpouseAge]
    // Independently-documented anchor cells (known BEFORE transcription — DND/012).
    expect(cell(75, 64), 'anchor owner75/spouse64').toBe(25.3)
    expect(cell(76, 60), 'anchor owner76/spouse60').toBe(28.2)
    // The eCFR-vs-Pub-590-B discrepancy resolution, pinned as a regression guard: the
    // authoritative reg prints (90,76) twice as 14.7; Pub 590-B's lone 14.8 was rejected.
    expect(cell(90, 76), 'eCFR (90,76) resolved over Pub 590-B 14.8').toBe(14.7)
    const ult = new Map(taxConstants.uniformLifetimeTableDivisors.value.map((r) => [r.age, r.divisor]))
    for (let owner = t.minOwnerAge; owner <= t.maxAge; owner++) {
      const row = t.byOwnerThenSpouse[owner]
      expect(row, `owner ${owner} row present`).toBeDefined()
      if (!row) continue
      expect(row.length, `owner ${owner} covers spouse 1..${owner - 11}`).toBe(owner - 11)
      // Relief-vs-ULT: the smallest stored gap (spouse = owner-11) yields a divisor ≥ ULT
      // (which bakes in a 10-yr-younger beneficiary), strictly larger below the terminal
      // convergence — so a >10yr-younger sole spouse is forced to distribute LESS, never more.
      const gap11 = row[row.length - 1] ?? 0
      const u = ult.get(owner) ?? 0
      expect(gap11 >= u, `JLLS(${owner},${owner - 11}) ≥ ULT(${owner})`).toBe(true)
      if (owner <= 110) expect(gap11 > u, `JLLS(${owner},${owner - 11}) > ULT(${owner})`).toBe(true)
      // Monotone non-increasing as the spouse ages; finite 1-decimals > 0 (DND/009).
      for (let i = 0; i < row.length; i++) {
        const v = row[i] ?? NaN
        expect(Number.isFinite(v) && v > 0 && Math.abs(v * 10 - Math.round(v * 10)) < 1e-9).toBe(true)
        if (i > 0) expect((row[i] ?? 0) <= (row[i - 1] ?? 0), `owner ${owner} monotone at spouse ${i + 1}`).toBe(true)
      }
    }
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
