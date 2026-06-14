/*
 * External resources the intake POINTS the user to. We never fetch these (R36 + CSP
 * `connect-src 'self'`): the user is the secure courier — they read the number off the site and
 * type it in, and nothing about their household ever leaves the device. URLs live here as
 * constants (the canonical-source rule — never re-typed at a call site).
 *
 * Verified live 2026-06-14 (curl): healthcare.gov → 200, the KFF subsidy calculator → 200.
 * ssa.gov/myaccount returns 403 to automated requests (SSA bot-blocks curl — see insight 033),
 * but it is the correct "my Social Security" portal a real browser reaches.
 *
 * Every consumer opens these in a NEW TAB (see ExternalLink) so a half-finished, not-yet-saved
 * intake is never discarded by a same-tab navigation.
 */
export const EXTERNAL_LINKS = {
  /** The federal ACA marketplace — get a quote (benchmark Silver + a chosen plan's premium). */
  healthcareGov: 'https://www.healthcare.gov/',
  /** Kaiser Family Foundation subsidy/premium calculator — the quote source for the ~dozen
   *  state-based exchanges not on healthcare.gov, and a quick cross-check anywhere. */
  kffCalculator: 'https://www.kff.org/interactive/subsidy-calculator/',
  /** "my Social Security" — where the benefit statement lives. */
  ssaMyAccount: 'https://www.ssa.gov/myaccount/',
} as const
