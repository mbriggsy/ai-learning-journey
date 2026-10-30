/**
 * The Hawk's narrowed ban (the pay check's KTD19; council `wf_2247c0df-73b`): no string the pay check
 * ships says "conservative", "worst case" or "only later". ONE home for the lexicon and its planted
 * corpus, imported by both of its sweeps — the methodology row's (`workingYearTaxDisclosure.test.ts`)
 * and every new W-step / money-picture / panel-row / staleness string (`copyGuard.test.ts`) — so the
 * two can never drift apart. A non-test module inside `__tests__/` (the `solveIdentityFixtures.ts`
 * precedent): lint-exempt, never collected as a suite.
 *
 * Deliberately NOT catalog-wide: `assumptionMarketProvenance` ("A deliberately conservative default …")
 * predates the ruling and is out of its scope, so each sweep names the strings it owns.
 */
export interface HawkBanPattern {
  readonly word: string
  readonly re: RegExp
  /** Samples the pattern MUST catch — the non-vacuity corpus (burned/070). */
  readonly mustCatch: readonly string[]
}

export const HAWK_BAN: readonly HawkBanPattern[] = [
  {
    word: 'conservative',
    re: /\bconservativ/i,
    mustCatch: ['A conservative reading of your investment income.', 'Priced conservatively, on purpose.', 'The Conservative choice.'],
  },
  {
    word: 'worst case',
    re: /\bworst[\s-]+case\b/i,
    mustCatch: ['The tool takes the worst case.', 'A worst-case reading.', 'Worst  case, it costs more.'],
  },
  {
    word: 'only later',
    re: /\bonly\s+later\b/i,
    mustCatch: ['It applies only later, once you stop.', 'Only later years count.'],
  },
]
