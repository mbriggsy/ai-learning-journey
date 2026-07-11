/**
 * THE 2028 IRMAA TOP-TIER RE-INDEX TRIPWIRE (the post-65 Medicare pricing unit, council-ratified
 * 2026-07-10, wf_4c8cd836-b22) — the `seniorBonusSunset.tripwire` idiom (retired in its own unit's
 * commit) applied to a dated Medicare provision. A dated wall-clock re-verify gate, NOT
 * `reVerifyEveryBuild`: this is a KNOWN deterministic calendar event (a scheduled re-index), not
 * per-build legislative volatility (the class `verify:aca` guards).
 *
 * THE GAP IT GUARDS: the IRMAA schedule's first four MFJ/single thresholds inflation-index every
 * year, but the TOP tier (≥ the highest single / MFJ thresholds) is statutorily FROZEN through
 * `irmaa.topTierFrozenThrough` (= 2027) and then RE-INDEXES for 2028 (health.ts:164; CMS 2026 IRMAA
 * fact sheet). The engine prices IRMAA off the constant table verbatim — so once wall-clock 2028
 * arrives, a build still carrying the 2027-frozen top-tier thresholds is pricing a stale top tier
 * (the interior tiers also re-index annually, but the frozen top tier is the one with a HARD dated
 * re-index the constant explicitly promises). The direction is not one-signed here, so the honest
 * move is a re-verify gate, not a silent constant.
 *
 * THE TRIPWIRE: this arm goes red on 2028-01-01 so a build in the re-index year cannot go green with
 * a stale top tier still shipping — RE-VERIFY the top-tier (and the annually-indexed interior)
 * thresholds against the CMS 2028 IRMAA release / Federal Register notice, bump the `irmaa` constant
 * + its shape pins, then move `topTierFrozenThrough` forward (or delete this tripwire if the whole
 * table has been re-pinned to a live-verify regime). A deliberate wall-clock read: tests are exempt
 * from the engine-purity clock ban (CLAUDE.md); this is a build-time re-verify gate, not engine code.
 */
import { describe, expect, it } from 'vitest'
import { irmaa } from '@engine/constants'

describe('the IRMAA top-tier re-index tripwire (a re-verify gate, not a unit test)', () => {
  it('the IRMAA top tier MUST be re-verified before its 2028 re-index — this arm goes red on 2028-01-01', () => {
    const frozenThrough = irmaa.value.topTierFrozenThrough
    expect(frozenThrough).toBe(2027) // the constant this tripwire is calibrated to — re-calibrate if the law moves
    const reindexYear = frozenThrough + 1 // the top tier re-indexes the year AFTER the freeze horizon
    const wallYear = new Date().getFullYear()
    expect(
      wallYear,
      'TRIPWIRE: the IRMAA top tier is frozen through ' +
        `${frozenThrough} and re-indexes in ${reindexYear}; the engine prices IRMAA off the ` +
        'constant table verbatim, so a build in the re-index year ships stale top-tier thresholds. ' +
        'Re-verify the top-tier (and interior) MAGI thresholds against the CMS 2028 IRMAA fact sheet / ' +
        'Federal Register notice, bump the `irmaa` constant + its constants.shape pins, then move ' +
        '`topTierFrozenThrough` forward (or retire this tripwire in that commit).',
    ).toBeLessThan(reindexYear)
  })
})
