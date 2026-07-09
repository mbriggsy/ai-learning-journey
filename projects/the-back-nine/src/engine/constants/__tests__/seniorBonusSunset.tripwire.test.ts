/**
 * THE SENIOR-BONUS SUNSET TRIPWIRE (U13 ultramode review, 2026-07-09, wf_44cdf86d-b71) —
 * the `reVerifyEveryBuild` pattern (verify:aca's class) applied to a dated tax provision.
 *
 * THE GAP IT GUARDS: the engine does NOT model the OBBBA senior bonus's 2028 sunset —
 * `seniorBonusFor` (taxCore.ts) takes only (filing, count65, magi), and
 * `seniorBonus.sunsetAfter` is read by NOTHING in the tax math — so every projection
 * credits the 2025–2028-only deduction ($6k/person 65+, MAGI-phased) in EVERY sim year.
 * For sim years whose calendar is 2029+ that is an OPTIMISTIC mispricing (~$12k/yr of
 * phantom MFJ deduction), the exact error direction the cardinal rule swears off. The
 * ratified U13 spec assumed the sunset was "already deterministic inside the engine"
 * (u13-build-spec.md L41-43) — the review refuted that against source, and the staleness
 * note that asserted a re-pricing was removed as calm-but-wrong (staleness.ts header).
 *
 * THE FILED REQUIRED FIX (TODO — the engine sunset unit, council-grade): thread the sim
 * year's calendar (startCalendarYear + t) through `deductionStack`/`seniorBonusFor` so the
 * bonus prices ONLY in calendar years [2025 .. sunsetAfter], with DND-012 externally-derived
 * fixtures (never the engine validating itself) and the magiLandscape rails made
 * year-aware in the same change. It must NOT ride a review fold or an unrelated commit
 * (insight 051) — it moves headline numbers for most 65+ households.
 *
 * THE TRIPWIRE: today (2026) the mispricing lives only in the projection's later years —
 * bounded, disclosed here, and shrinking the sooner the unit ships. From TAX YEAR 2028 the
 * horizon's mispriced share starts at next year, and from 2029 every CURRENT-year answer is
 * wrong on its face. This test starts failing on 2028-01-01 so a build in the sunset's
 * final priced year cannot go green with the gap still open — ship the engine unit, then
 * retire this file in the same commit. (A deliberate wall-clock read: tests are exempt
 * from the engine purity lint; this is a build-time re-verify gate, not engine code.)
 */
import { describe, expect, it } from 'vitest'
import { seniorBonus } from '@engine/constants'

describe('the senior-bonus sunset tripwire (a re-verify gate, not a unit test)', () => {
  it('the engine sunset unit MUST ship before the sunset’s final priced year — this arm goes red on 2028-01-01', () => {
    const sunsetAfter = seniorBonus.sunsetAfter
    expect(sunsetAfter).toBe(2028) // the constant this tripwire is calibrated to — re-calibrate if the law moves
    const wallYear = new Date().getFullYear()
    expect(
      wallYear,
      'TRIPWIRE: the OBBBA senior bonus sunsets after 2028 and the engine still prices it in every sim year ' +
        '(seniorBonusFor has no year parameter — taxCore.ts). Ship the filed engine sunset unit (TODO: ' +
        'thread startCalendarYear+t through deductionStack/seniorBonusFor + magiLandscape, DND-012 external ' +
        'fixtures, council-ratified), then delete this tripwire in the same commit.',
    ).toBeLessThan(sunsetAfter!)
  })
})
