/**
 * THE SS SPOUSAL-RATE ANNUAL RE-VERIFY TRIPWIRE — the `medicareTrend.reverify` /
 * `irmaaTopTierReindex` idiom applied to a figure that, uniquely, had NO enforcement of any kind.
 *
 * THE GAP IT GUARDS. `spousalRate` (socialSecurity.ts) carries `reVerifyEveryBuild: true`, and a
 * 2026-08-01 census of every `reVerifyEveryBuild` entry in `src/engine/constants/` found it was the
 * ONLY one with no last-verified record, no CI script, and no runtime clause — the flag was inert
 * prose. Compare its siblings: `acaEnhancedSubsidyStatus` has `verify:aca` + a runtime withhold +
 * a record↔constant bind; `ncRateSchedule` has `verify:state-tax` + the certification-pinned oracle
 * token; the ACA percentage tables gained a record attestation + bind arms in the same census.
 *
 * ⚠️ WHY THIS IS A DATED TRIPWIRE AND **NOT** A `verify:ss` SCRIPT OR A RUNTIME WITHHOLD — a
 * deliberate ruling, recorded so nobody "upgrades" it by reflex:
 *
 *  1. THE FIGURE IS STATUTE, NOT AN INDEXED TABLE. `socialSecurity.ts`'s own module header says so:
 *     unlike the tax/health/contribution tables these are not year-keyed COLA figures, they are
 *     stable until Congress acts. Annual-indexation drift risk is ZERO. The only live risk is the
 *     scored-but-UNENACTED proposal to phase 50% → 33% by 2042 — unenacted, requiring an Act of
 *     Congress, and phased over ~16 years. There is no fast flip window like ACA's, so the 30-day
 *     `verify:aca` cadence would be absurd here and annual is the defensible ceiling.
 *  2. A RUNTIME WITHHOLD WOULD SILENCE ESSENTIALLY EVERY HOUSEHOLD. `consumedConstants.ts` pulls the
 *     whole `socialSecurity.*` family whenever any person has `pia > 0`. ACA's clause fires only for
 *     runs carrying `overlay.enrolledPremium` (pre-65 Marketplace); NC's fires for one state. A
 *     stale-STAMP withhold here would refuse the recommendation to EVERYONE while the law sat
 *     unchanged — alarm-when-fine at maximum scale (insight 101). The cardinal rule cuts both ways:
 *     a tool that goes quiet because a calendar lapsed, over a statute nobody touched, is its own
 *     kind of dishonesty. Adding a runtime clause later stays fully additive, so this forecloses
 *     nothing.
 *  3. A SCRIPT WOULD BUY NOTHING A TEST DOES NOT. `verify:ss` would need a JSON record, a
 *     `package.json` row, a CI step, and a third gate-list doc surface — for the same annual human
 *     nudge this arm delivers off `pnpm test`, which already runs in CI.
 *
 * ⚠️ WHAT THIS ARM DOES AND DOES NOT DO. It forces a HUMAN RE-VERIFY at least annually. It does
 * NOT — and nothing available to us can — detect an enactment at build time. Two places in the tree
 * used to claim otherwise and were corrected on 2026-08-01; do not reintroduce that wording here or
 * anywhere, in a comment, a test title, or a doc line.
 *
 * A deliberate wall-clock read: tests are exempt from the engine-purity clock ban (CLAUDE.md); this
 * is a build-time re-verify gate, not engine code.
 */
import { describe, expect, it } from 'vitest'
import { socialSecurityConstants } from '@engine/constants'

/**
 * When the spousal rate was last re-verified against a primary source.
 *
 * ⚠️ READ THIS BEFORE BUMPING IT. `2026-08-01` is the date this TRIPWIRE WAS INSTALLED — it is NOT
 * a date on which anyone re-read the statute. The figure had no verification record at all, which
 * is precisely the gap being closed, and inventing a verification that did not happen is the
 * failure this repo has already been bitten by once (`aca-last-verified.json`'s stricken citation).
 * The FIRST real re-verify replaces this with the date the source was actually opened.
 *
 * TO CLEAR A RED: re-read the primary — POMS RS 00202.020 (spouse) / RS 00615.201 A.1 (the
 * unreduced-PIA base), against 42 U.S.C. §402(b)/(c) — confirm the 50% rate is still enacted law,
 * then set this to the date you opened it. Do NOT just bump the date.
 */
const LAST_REVERIFIED = '2026-08-01'

/** Statute, not a COLA figure — an annual human pass is the defensible ceiling (see the header). */
const REVERIFY_WINDOW_MONTHS = 12

describe('the SS spousal-rate annual re-verify tripwire (a re-verify gate, not a unit test)', () => {
  it('the spousal rate MUST be re-verified at least annually — this arm goes red one year on', () => {
    // The tripwire's PREMISE is the flag. If someone ever decides this figure no longer needs
    // re-verifying, they must flip the flag AND retire this arm consciously, in the same commit —
    // rather than leaving a tripwire guarding a watch that no longer exists.
    expect(
      socialSecurityConstants.spousalRate.reVerifyEveryBuild,
      'this tripwire exists to enforce that flag; if the flag is being removed, retire the ' +
        'tripwire in the SAME commit rather than leaving it guarding nothing',
    ).toBe(true)

    const due = new Date(LAST_REVERIFIED)
    due.setMonth(due.getMonth() + REVERIFY_WINDOW_MONTHS)
    expect(
      Date.now(),
      `TRIPWIRE: the SS spousal rate (${socialSecurityConstants.spousalRate.value} of the higher ` +
        `earner's unreduced PIA) has not been re-verified since ${LAST_REVERIFIED}. It is STATUTE, ` +
        'so it does not drift on its own — but a scored proposal to phase it 50% → 33% is live and ' +
        'unenacted, and this figure prices the benefit income of essentially every household we ' +
        'model. Re-read POMS RS 00202.020 / RS 00615.201 A.1 against 42 U.S.C. §402(b)/(c), confirm ' +
        'the rate is still enacted law, then set LAST_REVERIFIED to the date you opened the source. ' +
        'This arm forces a human re-verify; it does NOT detect an enactment — never reword it as if ' +
        'it does.',
    ).toBeLessThan(due.getTime())
  })
})
