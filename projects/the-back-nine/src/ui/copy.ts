/**
 * The typed copy catalog (phase-2 cross-cutting #4) — every user-facing string
 * in src/ui + src/intake lives HERE, created at D1 (the first copy-authoring
 * unit) and extended by U7 (which adds the copyGuard test that ENUMERATES this
 * catalog and asserts every entry passes the ban-list + certainty-hygiene +
 * catastrophe-lexicon gates — R12 honesty true BY CONSTRUCTION).
 *
 * The companion ESLint `no-restricted-syntax` rule (eslint.config.js) bans
 * inline JSXText AND user-facing attribute literals (aria-label / placeholder /
 * alt / title) in src/ui + src/intake, so a string cannot route around this
 * file. burned/063 single-source-the-gate, applied to copy.
 *
 * SLOT DISCIPLINE (decidable certainty-hygiene): quantitative content enters
 * copy ONLY through typed template slots (`~$X`, `~N years`, the "X of 10"
 * natural-frequency frame) — the slot helpers land with their first consumer
 * (the answer surface). Free numerals in catalog strings are what the copyGuard
 * scans against.
 */

/** The product voice catalog — copyGuard's enumeration surface (U7). */
export const copy = {
  appTitle: 'The Back Nine',
  // --- U0 scaffold strings (replaced by the real first-answer surface at U7) ---
  scaffoldSubtitle: 'Foundation scaffold — Phase 1.',
  scaffoldEngineLabel: 'Engine (worker round-trip):',
  // --- PWA update toast (prompt mode — the user chooses when) ---
  updateReady: 'A new version is ready — refresh whenever you’re done.',
  updateReload: 'Refresh now',
  updateLater: 'Later',
  // --- the cold-start frame (R1 as the product's face; one calm entry) ---
  coldStartQuestion: 'Can we retire — and how do we do it best?',
  coldStartOrientation:
    'A quiet co-pilot for a married couple’s next chapter. About five minutes of questions, answered as honestly as the math.',
  coldStartPreflight:
    'Handy to have nearby: recent account statements, and a marketplace health-insurance quote for your age and ZIP (healthcare.gov or the KFF calculator — the benchmark Silver figure and the premium of a plan you’d pick).',
  coldStartBegin: 'Begin',
  // --- flow chrome ---
  flowBack: 'Back',
  flowNext: 'Continue',
  flowProgressLabel: 'Progress',
  // SR-announced position (the quiet thread carries no visible counter — the
  // flow is variable-length, so a visible "Step N of M" would be inaccurate).
  flowSrPosition: 'New question',
  // --- R19 calm error grammar (icon + adjacent text; color never alone) ---
  errStopAgeInFuture:
    'This stop age is later than their current age — for someone already retired, it’s the age work actually stopped. Did you mean still working?',
  errSsClaimWindow:
    'Social Security can be claimed between 62 and 70 — this age falls outside that window.',
  errSurvivorRatio: 'Survivor spending can’t be more than 100% of household spending.',
  errBirthYearFuture: 'That birth year hasn’t happened yet.',
  errAgeBeyondModel: 'Ages past 119 are beyond what the projection can model.',
} as const satisfies Record<string, string>

export type CopyKey = keyof typeof copy

/**
 * Typed quantitative slots — the ONLY way a number enters user-facing copy
 * (the certainty-hygiene slot discipline). Question counts are an allowlisted
 * non-claim numeric; the `~$X` / `~N years` / "X of 10" slots land with the
 * answer surface (their first consumer).
 */
export const slots = {
  /** SR-announced flow position (the visible thread carries no counter — the
   *  flow is variable-length). */
  questionPosition: (n: number): string => `Question ${n}`,
} as const

/**
 * Static disclosures — OUTSIDE the copyGuard's input by design (phase-2
 * cross-cutting #4 "surface-scoped"): the R13 honest-limits note is a mandatory
 * directive-shaped line ("validate … with a professional") that must stay legal
 * while imperative mood stays banned in verdict/recommendation copy. The U7
 * copyGuard enumerates `copy`, never this object.
 */
export const staticDisclosures = {
  honestLimits:
    'Informational and educational — not legal, tax, or investment advice. Validate big, irreversible moves with a professional.',
} as const satisfies Record<string, string>
