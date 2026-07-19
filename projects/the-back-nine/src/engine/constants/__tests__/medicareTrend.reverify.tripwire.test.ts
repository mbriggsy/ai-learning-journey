/**
 * THE ANNUAL TRUSTEES-REPORT RE-VERIFY TRIPWIRE (the Medicare-cost-trend sourcing unit,
 * council-ratified 2026-07-19, wf_c673339e-257) — the `irmaaTopTierReindex.tripwire` idiom
 * applied to an ANNUALLY-refreshed primary. A dated wall-clock re-verify gate, NOT
 * `reVerifyEveryBuild`: a new Medicare Trustees Report is a KNOWN annual calendar event
 * (~June each year), not per-build legislative volatility (the class `verify:aca` guards).
 *
 * THE GAP IT GUARDS: `medicareCostTrend` prices every Medicare-bearing year off ONE report
 * edition (2026 — Table V.E2 verbatim + the II.D1/III.B12/§III.D macro assumptions, no
 * edition mixing). Each new Trustees Report REVISES the projected premium path (the 2026
 * edition itself revised 2027 DOWN $218.60 → $209.50 from the 2025 edition — the research
 * packet's confirmed fallback cell), so a build still shipping the prior edition a season
 * after the new one lands is pricing a stale projection in the exact conversion-payoff
 * channel this unit exists to make honest. The revision direction is not one-signed, so the
 * honest move is a re-verify gate, never a silent hold.
 *
 * THE TRIPWIRE: this arm goes red on 2027-09-01 (the ~June release + a verification season)
 * so a late-2027 build cannot go green on the 2026 edition — RE-VERIFY against the 2027
 * Trustees Report (Table V.E2 + II.D1 + III.B12 + §III.D, primary PDF, byte-for-byte per the
 * research packet's discipline), re-pin the table, mint a NEW `vintage` (the staleness clock
 * fires on saved vaults BY DESIGN — the extras-2026b precedent), update `reportEdition`, the
 * constants.shape full-vector pin, and the DND-012 fixture derivations, then move this
 * tripwire's edition forward. A deliberate wall-clock read: tests are exempt from the
 * engine-purity clock ban (CLAUDE.md); this is a build-time re-verify gate, not engine code.
 */
import { describe, expect, it } from 'vitest'
import { medicareCostTrend } from '@engine/constants'

describe('the Medicare-trend annual re-verify tripwire (a re-verify gate, not a unit test)', () => {
  it('the trend table MUST be re-pinned to each new Trustees Report — this arm goes red on 2027-09-01', () => {
    const edition = medicareCostTrend.value.reportEdition
    expect(edition).toBe(2026) // the edition this tripwire is calibrated to — move it forward at each re-pin
    const dueBy = new Date(edition + 1, 8, 1) // Sep 1 of the following year (~June release + a season)
    expect(
      Date.now(),
      'TRIPWIRE: the Medicare-cost-trend table is pinned to the ' +
        `${edition} Trustees Report, and the ${edition + 1} report (released ~June) is now a ` +
        'season old. Re-verify Table V.E2 + II.D1 + III.B12 + §III.D against the new primary PDF ' +
        '(byte-for-byte, the docs/research/medicare-cost-trend.md discipline), re-pin the ' +
        '`medicareCostTrend` table with a NEW vintage (the U13 staleness clock fires on saved ' +
        'vaults by design), bump `reportEdition` + the constants.shape full-vector pin + the ' +
        'DND-012 fixture derivations, then move this tripwire forward.',
    ).toBeLessThan(dueBy.getTime())
  })
})
