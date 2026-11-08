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

/**
 * BUILD 2's lean ban (`docs/plans/features/working-year-surplus-build-spec.md` R16): no string about the
 * working-year left over says which way the credit moves the answer — its reach can run either way
 * (insight 143), and it is unmeasured until U11. Swept over the left-over strings ONLY (`copyGuard.test.ts`),
 * never over a composed line (W's stale line rightly says "can look better" beside the left-over clause).
 * "later" alone is NOT banned: R6's own lines must say "a later year above" and "no later year's left over".
 */
export const LEFT_OVER_LEAN_BAN: readonly HawkBanPattern[] = [
  {
    word: 'earlier',
    re: /\bearlier\b/i,
    mustCatch: ['Your date comes earlier.', 'It moves the date earlier by a year.', 'Earlier than before.'],
  },
  {
    word: 'better',
    re: /\bbetter\b/i,
    mustCatch: ['The answer looks a little better.', 'Better than it was.'],
  },
  {
    word: 'worse',
    re: /\bworse\b/i,
    mustCatch: ['It can look a little worse.', 'Worse than before.'],
  },
  {
    word: 'conservative',
    re: /\bconservativ/i,
    mustCatch: ['A conservative choice.', 'Priced conservatively.'],
  },
  {
    word: 'a later date',
    re: /\b(comes|moves|lands|pushes)\b[^.]*\blater\b/i,
    mustCatch: ['Your date comes later.', 'It moves your date a year later.', 'It pushes the date later.'],
  },
]
