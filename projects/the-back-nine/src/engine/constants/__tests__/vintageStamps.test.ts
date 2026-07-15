/**
 * P3·U13 — the vintage-stamp producers (source-bind: every stamp field reads its OWN
 * canonical constant, never a re-typed literal — the healthcareVintageStamp discipline,
 * insight 022). A drifted producer here is a staleness clock that can never fire.
 */
import { describe, expect, it } from 'vitest'
import { taxVintageStamp, TAX_YEAR, legalBasis, taxConstants } from '../tax'
import { dateVintageStamp, CONTRIBUTION_YEAR } from '../index'
import { stateTaxVintageStamp, STATE_TAX_PROFILES, ncRateSchedule } from '../stateTax'
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
      // Re-pinned 2026-07-15 (state-tax unit S0): the `stateIncomeTax` SCOPE SENTINEL's status
      // value was reclassified OUT-but-disclosed → priced-for-roster {NC,PA,FL}. NO federal
      // vintage bump — the state's DATED figures live in the separate `stateTaxConstants` table
      // (its own StateTaxVintageV3 clock), so no saved vault recomputes a federal figure from
      // this edit; the sentinel is documentation. A conscious re-pin, not a silent value drift.
      contentDigest: 947_260_549,
    })
  })
})

describe('stateTaxVintageStamp — the state-tax clock producer', () => {
  it('source-binds each field to the serialized per-state profile (STATE_TAX_PROFILES[state])', () => {
    expect(stateTaxVintageStamp()).toEqual({
      ncProfile: JSON.stringify(STATE_TAX_PROFILES.NC),
      paProfile: JSON.stringify(STATE_TAX_PROFILES.PA),
      flProfile: JSON.stringify(STATE_TAX_PROFILES.FL),
    })
  })

  it('is deterministic within a build (two calls, one stamp — the dirty-compare / round-trip guard depend on it)', () => {
    expect(stateTaxVintageStamp()).toEqual(stateTaxVintageStamp())
  })

  /**
   * THE WHOLE-SCHEDULE BINDING (074's law: a stamp nothing reads prices nothing): the NC rate is
   * HELD FORWARD (the hawk veto), so a FUTURE pinned step (the expected 3.49% self-correction)
   * changes an out-year the household prices while leaving the current-year rate untouched. The
   * profile is the WHOLE schedule, so such a step MOVES the fingerprint — a current-year scalar
   * would miss it and the saved vault would silently recompute with the new out-year rate.
   */
  it('a future rate step added to a held-forward schedule MOVES the NC fingerprint (the out-year step a scalar would miss)', () => {
    const before = stateTaxVintageStamp().ncProfile
    // Simulate a pinned 2030 step-down landing (the S6 self-correction path) WITHOUT mutating the
    // shipped constant: the fingerprint is over STATE_TAX_PROFILES.NC, whose rateSchedule IS
    // ncRateSchedule.value — a new step there changes the serialized profile.
    const withFutureStep = JSON.stringify({
      ...STATE_TAX_PROFILES.NC,
      rateSchedule: { steps: [...ncRateSchedule.value.steps, { fromYear: 2030, rate: 0.0349 }] },
    })
    expect(withFutureStep).not.toBe(before) // the clock WOULD fire on the real edit
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
