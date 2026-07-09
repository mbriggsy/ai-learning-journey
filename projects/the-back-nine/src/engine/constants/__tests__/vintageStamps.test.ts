/**
 * P3·U13 — the vintage-stamp producers (source-bind: every stamp field reads its OWN
 * canonical constant, never a re-typed literal — the healthcareVintageStamp discipline,
 * insight 022). A drifted producer here is a staleness clock that can never fire.
 */
import { describe, expect, it } from 'vitest'
import { taxVintageStamp, TAX_YEAR, legalBasis, taxConstants } from '../tax'
import { dateVintageStamp, CONTRIBUTION_YEAR } from '../index'
import { BLEND_SNAPSHOT_AS_OF, TICKER_BLEND_ROWS } from '../../reference/tickerBlend'

describe('taxVintageStamp — the controls-surface clock producer', () => {
  it('source-binds both fields to the canonical entries (taxYear = TAX_YEAR; legalBasis = the display sentence VERBATIM)', () => {
    expect(taxVintageStamp()).toEqual({ taxYear: TAX_YEAR, legalBasis: legalBasis.value })
  })

  it('is deterministic within a build (two calls, one stamp — the dirty-compare depends on it)', () => {
    expect(taxVintageStamp()).toEqual(taxVintageStamp())
  })

  /**
   * THE STAMP↔CONTENT BINDING (U13 ultramode, the review's weakest-clock finding): the tax
   * clock keys ONLY on (taxYear, legalBasis) — a within-year value correction (a bracket
   * threshold transcription fix, a mid-year re-adjustment) leaves the stamp unchanged, so
   * every saved vault recomputes with the new number and NO "assumptions updated" note
   * (a Q1 silent change; tax has no verify:aca-class compensating gate). This pin makes
   * that edit IMPOSSIBLE TO MAKE SILENTLY: any change to the table CONTENT under an
   * unchanged (taxYear, legalBasis) pair fails here, and the failure message carries the
   * maintenance contract at the exact moment of the edit.
   */
  it('the table CONTENT is bound to the stamp pair — a value edit must move TAX_YEAR or legalBasis (or consciously re-pin here)', () => {
    const fingerprint = JSON.stringify(
      Object.fromEntries(
        Object.entries(taxConstants).map(([k, entry]) => [k, (entry as { value?: unknown }).value ?? null]),
      ),
    )
    // A cheap stable digest (djb2) — the pin is the pair↔digest BINDING, not the bytes.
    let h = 5381
    for (let i = 0; i < fingerprint.length; i++) h = ((h * 33) ^ fingerprint.charCodeAt(i)) >>> 0
    expect(
      { taxYear: TAX_YEAR, legalBasis: legalBasis.value, contentDigest: h },
      'The tax-table CONTENT changed under an unchanged vintage stamp. If a real figure moved ' +
        '(statute, table correction, inflation adjustment), bump TAX_YEAR or the legalBasis sentence so ' +
        'every saved vault’s staleness clock fires (Q1: never silently changed) — THEN update this pin. ' +
        'Only re-pin without a vintage bump for a non-value refactor (comment/citation-only edits).',
    ).toEqual({
      taxYear: 2026,
      legalBasis: 'OBBBA — One Big Beautiful Bill Act, signed 2025-07-04',
      contentDigest: 1_538_881_492, // the 2026/OBBBA table content — re-pin ONLY per the message above
    })
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
