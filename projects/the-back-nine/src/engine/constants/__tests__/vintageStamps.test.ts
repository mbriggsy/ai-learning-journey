/**
 * P3·U13 — the vintage-stamp producers (source-bind: every stamp field reads its OWN
 * canonical constant, never a re-typed literal — the healthcareVintageStamp discipline,
 * insight 022). A drifted producer here is a staleness clock that can never fire.
 */
import { describe, expect, it } from 'vitest'
import { taxVintageStamp, TAX_YEAR, legalBasis } from '../tax'
import { dateVintageStamp, CONTRIBUTION_YEAR } from '../index'
import { BLEND_SNAPSHOT_AS_OF, TICKER_BLEND_ROWS } from '../../reference/tickerBlend'

describe('taxVintageStamp — the controls-surface clock producer', () => {
  it('source-binds both fields to the canonical entries (taxYear = TAX_YEAR; legalBasis = the display sentence VERBATIM)', () => {
    expect(taxVintageStamp()).toEqual({ taxYear: TAX_YEAR, legalBasis: legalBasis.value })
  })

  it('is deterministic within a build (two calls, one stamp — the dirty-compare depends on it)', () => {
    expect(taxVintageStamp()).toEqual(taxVintageStamp())
  })
})

describe('dateVintageStamp — the fuck-off-date clock producer', () => {
  it('source-binds contributionYear to CONTRIBUTION_YEAR and blendSnapshotAsOf to the table aggregate', () => {
    expect(dateVintageStamp()).toEqual({
      contributionYear: CONTRIBUTION_YEAR,
      blendSnapshotAsOf: BLEND_SNAPSHOT_AS_OF,
    })
  })
})

describe('BLEND_SNAPSHOT_AS_OF — the derived table aggregate', () => {
  it('equals the MAX per-row asOf (derived, never hand-typed — a refresh pass that re-dates any row moves it with zero re-typing)', () => {
    const dates = TICKER_BLEND_ROWS.flatMap((r) => (r.asOf !== undefined ? [r.asOf] : []))
    expect(dates.length).toBeGreaterThan(0) // the fail-loud module guard is not vacuous
    expect(BLEND_SNAPSHOT_AS_OF).toBe([...dates].sort().at(-1))
  })

  it('is a plausible ISO date (the lexicographic max is only meaningful on ISO strings)', () => {
    expect(BLEND_SNAPSHOT_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
