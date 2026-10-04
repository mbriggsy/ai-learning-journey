/**
 * THE ENGINE-PRICING LEDGER'S SHAPE (the engine-domain council, 2026-09-27 — `src/engine/pricingVersion.ts`).
 *
 * The ledger is the verdict-side record of the engine's OWN pricing changes; its one reader
 * (`deriveStaleness`'s `pricing` block) compares each row's SHIP day with a vault's `savedAt`. Every law
 * below is a property that reader leans on without re-checking it, so a malformed row would mis-speak a
 * saved household's re-entry note with no other test noticing:
 *   · versions 1..n with no gap, and `ENGINE_PRICING_VERSION` = the newest (append-only, never edited);
 *   · each `sinceEpochDay` IS its `shippedOn` (one date basis) and ship days never go backward;
 *   · the first row ships on or after 2026-07-09 — the day `savedAt` was introduced (77ed4fa7). The
 *     reader treats an ABSENT `savedAt` as "saved before every row"; that is a PROOF only while no row
 *     predates the stamp's own introduction;
 *   · families non-empty and unique per row; `states` present iff `stateTax` is declared;
 *   · a `reconfirm-input` row reaches Medicare ONLY (the reader keys the re-confirm on the Medicare
 *     exposure read and never on the row's families — a reconfirm row for any other family would be
 *     spoken as a Medicare sentence);
 *   · `solverCodeVersion` null only before the solver existed, then non-decreasing, never past the live
 *     `SOLVER_CODE_VERSION`;
 *   · `FIRST_UNAMBIGUOUS_SAVE_DAY` = the newest ship day + 1; the ledger array is frozen;
 *   · `PRICING_FAMILY_ORDER` (the ONE order the named method line speaks) covers every family once,
 *     Medicare LAST (its phrase carries its own trailing clause).
 *
 * The DRIFT half — "a pricer moved and nobody appended a row" — is `pricingWitness.test.ts`.
 */
import { describe, expect, it } from 'vitest'
import {
  ENGINE_PRICING_LEDGER,
  ENGINE_PRICING_VERSION,
  FIRST_UNAMBIGUOUS_SAVE_DAY,
  type PricingFamily,
} from '@engine/pricingVersion'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import { PRICING_FAMILY_ORDER } from '@store/staleness'

/** Every family, as a `Record` literal: a new `PricingFamily` member is a COMPILE error here until it is
 *  listed, so the order/coverage arms below can never be silently narrower than the type. */
const FAMILY_SET: Readonly<Record<PricingFamily, true>> = {
  tax: true,
  stateTax: true,
  medicare: true,
  aca: true,
  contributions: true,
}
const ALL_FAMILIES = Object.keys(FAMILY_SET) as readonly PricingFamily[]

/** An independent civil-date → epoch-day path (the `Date` global is test-legal here) — the ledger's own
 *  helper is Hinnant's days_from_civil, so agreeing with the UTC calendar is a second opinion. */
const utcEpochDay = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** The day `savedAt` began to be persisted (77ed4fa7) — the absent-`savedAt` proof's premise. */
const SAVED_AT_INTRODUCED = '2026-07-09'

describe('ENGINE_PRICING_LEDGER — the append-only shape the staleness reader leans on', () => {
  const rows = ENGINE_PRICING_LEDGER
  const newest = rows[rows.length - 1]!

  it('is non-empty, and its versions run 1..n with no gap; ENGINE_PRICING_VERSION is the newest row’s', () => {
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((r) => r.version)).toEqual(rows.map((_, i) => i + 1))
    expect(ENGINE_PRICING_VERSION).toBe(newest.version)
    expect(ENGINE_PRICING_VERSION).toBe(rows.length)
  })

  it('each sinceEpochDay IS its shippedOn (both calendar paths agree), and ship days never go backward', () => {
    for (const r of rows) {
      expect(r.shippedOn, `v${r.version}`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.sinceEpochDay, `v${r.version}: the ledger's own date helper`).toBe(epochDayFromIsoDate(r.shippedOn))
      expect(r.sinceEpochDay, `v${r.version}: the UTC calendar`).toBe(utcEpochDay(r.shippedOn))
    }
    for (let i = 1; i < rows.length; i++) {
      expect(
        rows[i]!.sinceEpochDay,
        `v${rows[i]!.version} ships before v${rows[i - 1]!.version} — an appended row cannot predate the one before it`,
      ).toBeGreaterThanOrEqual(rows[i - 1]!.sinceEpochDay)
    }
  })

  it('the first row ships on or after 2026-07-09 — the day `savedAt` was introduced, so an ABSENT savedAt provably predates every row', () => {
    // If a row R shipped BEFORE the stamp existed, a vault saved after R but before 2026-07-09 carries no
    // `savedAt`, and the reader would tell it R's method changed "since your save" — code that already
    // figured that save. "Absent ⇒ crossed every row" is a proof only while no row predates the stamp.
    expect(rows[0]!.sinceEpochDay).toBeGreaterThanOrEqual(epochDayFromIsoDate(SAVED_AT_INTRODUCED))
  })

  it('every row names at least one family, never the same family twice, and only real families', () => {
    for (const r of rows) {
      expect(r.families.length, `v${r.version}`).toBeGreaterThan(0)
      expect(new Set(r.families).size, `v${r.version}: a duplicated family`).toBe(r.families.length)
      for (const f of r.families) expect(ALL_FAMILIES, `v${r.version}: ${f}`).toContain(f)
    }
  })

  it('`states` is present iff the row declares stateTax — and then non-empty (a PA household is never told NC’s profile moved)', () => {
    for (const r of rows) {
      const declaresState = r.families.includes('stateTax')
      expect(r.states !== undefined, `v${r.version}: states present ⇔ stateTax declared`).toBe(declaresState)
      if (declaresState) expect(r.states!.length, `v${r.version}: an empty states list names no household`).toBeGreaterThan(0)
    }
    // Non-vacuity: the biconditional is exercised on BOTH sides by the shipped ledger.
    expect(rows.some((r) => r.families.includes('stateTax'))).toBe(true)
    expect(rows.some((r) => !r.families.includes('stateTax'))).toBe(true)
  })

  it('a reconfirm-input row declares Medicare ONLY — the reader asks the Medicare spending re-confirm off the Medicare exposure, never off the row’s families', () => {
    const reconfirm = rows.filter((r) => r.kind === 'reconfirm-input')
    expect(reconfirm.length, 'the shipped ledger carries the 2026-07-10 / -11 Medicare flips').toBeGreaterThan(0)
    for (const r of reconfirm) expect(r.families, `v${r.version}`).toEqual(['medicare'])
    for (const r of rows) expect(['reprice', 'reconfirm-input'], `v${r.version}`).toContain(r.kind)
  })

  it('every row carries its audit trail (commits + what) — never rendered, but the next reader needs it', () => {
    for (const r of rows) {
      expect(r.commits.length, `v${r.version}`).toBeGreaterThan(0)
      expect(r.what.trim().length, `v${r.version}`).toBeGreaterThan(0)
    }
  })

  it('solverCodeVersion: null only BEFORE the first non-null (pre-solver rows), non-decreasing after, never past SOLVER_CODE_VERSION', () => {
    const firstNonNull = rows.findIndex((r) => r.solverCodeVersion !== null)
    expect(firstNonNull, 'the solver era has begun in the ledger').toBeGreaterThanOrEqual(0)
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i]!.solverCodeVersion
      if (i < firstNonNull) expect(v, `v${rows[i]!.version} predates the solver`).toBeNull()
      else {
        expect(v, `v${rows[i]!.version}: a null after the solver existed`).not.toBeNull()
        expect(Number.isInteger(v), `v${rows[i]!.version}`).toBe(true)
        expect(v!, `v${rows[i]!.version} exceeds the live solver`).toBeLessThanOrEqual(SOLVER_CODE_VERSION)
        if (i > firstNonNull) {
          expect(v!, `v${rows[i]!.version} steps the solver version backward`).toBeGreaterThanOrEqual(
            rows[i - 1]!.solverCodeVersion!,
          )
        }
      }
    }
  })

  it('PIN (moves with the next solver bump): the solver is at 9, the newest reprice row shipped with 7 — v8 and v9 were ranking logic only, so no row', () => {
    const newestReprice = [...rows].reverse().find((r) => r.kind === 'reprice')!
    expect(
      { solverCodeVersion: SOLVER_CODE_VERSION, newestRepriceRow: newestReprice.solverCodeVersion },
      'The IRMAA growth base (the newest reprice row) shipped with SOLVER_CODE_VERSION 7; v8 (2026-09-28) and v9 (2026-10-03) ' +
        'moved only the candidate enumerator (the IRMAA, then the ACA-cliff and bracket-edge window anchors) — a recommendation’s ranking, never a figure a saved ' +
        'household’s recompute shows — so it appended no row. This pin MOVES with the next solver bump: a SCORED ' +
        'pricing change bumps the solver AND appends a ledger row recording that same version (re-pin both numbers ' +
        'together); a solver bump that is not a pricing change (ranking logic only) appends no row — re-pin only ' +
        '`solverCodeVersion` and say why in the commit.',
    ).toEqual({ solverCodeVersion: 9, newestRepriceRow: 7 })
  })

  it('FIRST_UNAMBIGUOUS_SAVE_DAY is the day AFTER the newest ship day (a save ON a ship day is the ambiguous day)', () => {
    expect(FIRST_UNAMBIGUOUS_SAVE_DAY).toBe(newest.sinceEpochDay + 1)
    expect(FIRST_UNAMBIGUOUS_SAVE_DAY).toBe(Math.max(...rows.map((r) => r.sinceEpochDay)) + 1)
  })

  it('the ledger array is frozen — a runtime push/splice cannot rewrite a saved vault’s disclosure', () => {
    expect(Object.isFrozen(ENGINE_PRICING_LEDGER)).toBe(true)
  })
})

describe('PRICING_FAMILY_ORDER — the one order the named method line speaks', () => {
  it('lists every PricingFamily exactly once', () => {
    expect(PRICING_FAMILY_ORDER).toHaveLength(ALL_FAMILIES.length)
    expect(new Set(PRICING_FAMILY_ORDER).size).toBe(PRICING_FAMILY_ORDER.length)
    expect([...PRICING_FAMILY_ORDER].sort()).toEqual([...ALL_FAMILIES].sort())
  })

  it('speaks Medicare LAST — its phrase ends in its own clause ("including the income levels…"), so any family after it would read as part of that clause', () => {
    expect(PRICING_FAMILY_ORDER[PRICING_FAMILY_ORDER.length - 1]).toBe('medicare')
  })
})
