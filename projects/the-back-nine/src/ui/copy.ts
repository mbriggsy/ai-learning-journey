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
  // --- PWA update toast (prompt mode — the user chooses when) ---
  updateReady: 'A new version is ready — refresh whenever you’re done.',
  updateReload: 'Refresh now',
  updateLater: 'Later',
  // --- the cold-start frame (R1 as the product's face; one calm entry) ---
  coldStartQuestion: 'Can we retire — and how do we do it best?',
  coldStartOrientation:
    'A quiet co-pilot for a married couple’s next chapter. About five minutes of questions, answered as honestly as the math.',
  coldStartPreflight:
    'Handy to have nearby: recent account statements, and a marketplace health-insurance quote for everyone under 65 in the household, at your ages and ZIP (healthcare.gov or the KFF calculator — the benchmark Silver figure and the premium of a plan you’d pick).',
  coldStartBegin: 'Begin',
  // --- flow chrome ---
  flowBack: 'Back',
  flowNext: 'Continue',
  flowProgressLabel: 'Progress',
  // --- the preamble questions (D1 — paired two-person screens) ---
  personYou: 'You',
  personSpouse: 'Your spouse',
  qNamesHeading: 'First — who are the two of you?',
  nameLabel: 'First name',
  birthYearLabel: 'Birth year',
  birthYearPlaceholder: 'e.g. 1962',
  sexLegend: 'Sex',
  sexMale: 'Male',
  sexFemale: 'Female',
  sexHelp: 'Survival odds come from the Social Security life tables, which are split this way.',
  qWorkHeading: 'Where does work stand today?',
  workStatusLegend: 'Work status',
  workStatusWorking: 'Still working',
  workStatusRetired: 'Already retired',
  stopAgeLabel: 'The age work stopped',
  stopAgeHelp: 'The age this person actually stopped working — even if Social Security came later.',
  qIncomeHeading: 'What does work pay?',
  salaryLabel: 'Yearly pay, before tax',
  salaryHelp: 'A steady figure in today’s dollars is enough.',
  qSsHeading: 'Social Security',
  ssAmountLabel: 'Estimated yearly benefit',
  ssAmountHelp: 'From the ssa.gov statement, in today’s dollars.',
  ssClaimLabel: 'Planned claim age (62–70)',
  qSpendHeading: 'What does your life cost?',
  spendLabel: 'Household spending, all in',
  spendHelp:
    'Everything — housing, food, insurance, fun. The whole household, not just the bills that feel like retirement.',
  periodMonth: 'Each month',
  periodYear: 'Each year',
  periodLegend: 'That figure is…',
  periodConfirmPrompt:
    'Quick check — that figure reads either way. Each month, or each year?',
  qHealthHeading: 'Health coverage before Medicare',
  enrolledPremiumLabel: 'Your household’s combined monthly premium',
  slcspLabel: 'Benchmark Silver plan, monthly (whole household)',
  healthQuoteHelp:
    'From a marketplace quote covering everyone under 65 in the household, at your ages and ZIP — healthcare.gov or the KFF calculator. Enter the whole household’s combined monthly figures, not one person’s. The tool never guesses a premium; it prices only what you enter. Fine to continue without it — the answer simply waits on it.',
  qOopHeading: 'Out-of-pocket health costs',
  oopLabel: 'A typical year, out of pocket',
  oopHelp:
    'Premiums are added on top by the tool; out-of-pocket costs should already be inside your spending figure — this only sizes your HSA’s tax-free draw.',
  qWorkIncomeHeading: 'Income while still working',
  workIncomeLabel: 'Taxable income on a recent return',
  workIncomeHelp:
    'Used to price the first Medicare years, which look back two years. The income figure from a recent tax return — investment and other income counts, not just salary.',
  qIrmaaSeedHeading: 'Your last two tax returns',
  irmaaSeedTwoBackLabel: 'Income, two years back',
  irmaaSeedOneBackLabel: 'Income, last year',
  irmaaSeedHelp:
    'Medicare premiums key off income from two years before — these two figures anchor the first projected years.',
  // --- the account loop (D1 — variable-length, single entry pass) ---
  qAccountsHeading: 'Now, the accounts themselves',
  accountsIntro:
    'One at a time, from your statements — type, balance, what it holds, and what still goes in each year.',
  accountsEmpty: 'No accounts yet.',
  addAccount: 'Add an account',
  accountSave: 'Add this account',
  accountCancel: 'Never mind',
  accountEdit: 'Edit',
  accountRemove: 'Remove',
  accountRemoveConfirm: 'Tap again to remove',
  accountOwnerLegend: 'Whose account is this?',
  accountKindLegend: 'What kind of account?',
  kind401k: '401(k)',
  kind403b: '403(b)',
  kindTraditionalIra: 'Traditional IRA',
  kindRoth401k: 'Roth 401(k)',
  kindRothIra: 'Roth IRA',
  kindBrokerage: 'Brokerage / taxable',
  kindHsa: 'HSA',
  accountValueLabel: 'Balance today',
  accountBasisLabel: 'Cost basis',
  accountBasisHelp:
    'From the statement’s cost-basis line — what was paid in, before growth. The rest is treated as unrealized gain.',
  accountTickerLabel: 'Main holding’s ticker',
  accountTickerHelp:
    'The fund or ETF symbol — VTSAX, FXAIX, a target-date fund. Leave it blank if there isn’t one and classify the mix instead.',
  tdfDisclosure:
    'A target-date fund — the projection holds today’s allocation constant rather than following the fund’s future glide.',
  accountContributionLabel: 'Going in each year',
  accountMatchLabel: 'Employer match each year',
  // --- the manual classifier (R37 fallback — never a silent default blend) ---
  classifierLegend: 'What does it mostly hold?',
  classifyStocks: 'Mostly stocks',
  classifyBonds: 'Mostly bonds',
  classifyCash: 'Cash',
  classifierAdvanced: 'Set exact percentages',
  classifierStockPct: 'Stocks %',
  classifierBondPct: 'Bonds %',
  classifierCashPct: 'Cash %',
  errClassifierSum: 'Those percentages need to add up to 100.',
  // --- the provisional answer strip (D1 — surfaces and sharpens during entry;
  //     D2 builds the full state-adaptive surface over U6/U7) ---
  // A STABLE, state-agnostic region name: the strip's accessible label must not
  // contradict its content once a real reading lands (D1 review — it was the
  // incomplete-only string, wrong when the strip shows "On track — 7 of 10").
  answerRegionLabel: 'Your provisional answer',
  answerIncomplete: 'Your answer takes shape as you go.',
  answerStillNeeded: 'Still needed:',
  answerNoSynthesis: 'The tool never guesses these — it prices only what you enter.',
  answerPending: 'Working it out…',
  answerProvisionalTag: 'Provisional — with what you’ve entered so far',
  answerNotYet:
    'Not there yet — with what’s entered so far. Accounts usually move this; the picture isn’t complete.',
  dateFreeToday: 'Work-optional today, by this math',
  dateWindowEdge: 'at the edge of what this window can confirm',
  answerError: 'The math hit a snag.',
  answerRetry: 'Try again',
  outcomeOnTrack: 'On track',
  outcomeBorderline: 'On the line',
  outcomeOffTrack: 'Off track',
  outcomeOverFunded: 'More than covered',
  outcomeAlreadyFailing: 'Already short',
  // --- R19 calm error grammar (icon + adjacent text; color never alone) ---
  errContributionCeiling:
    'That’s more than this year’s legal contribution limit for this account type at this age — combined across accounts of the same kind.',
  errAdditionsCeiling:
    'Together, the contribution and employer match are above what one plan can legally receive in a year.',
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
  /** The resolved-blend feedback line under a recognized ticker (R37). The
   *  percentage is the issuer's own figure via C1 — a fact echo, not a claim. */
  blendResolved: (name: string, stockPct: number): string =>
    `${name} — about ${Math.round(stockPct)}% stocks`,
  /** One committed account in the loop's quiet list. */
  accountSummary: (kindLabel: string, owner: string, valueFormatted: string): string =>
    `${kindLabel} · ${owner} · $${valueFormatted}`,
  /** The pinned natural-frequency frame. Top-of-scale renders "more than 9 of
   *  10" — "10 of 10" can NEVER appear (the over-funded near-ceiling clamp). */
  xOfTen: (n: number): string => (n >= 10 ? 'more than 9 of 10' : `${n} of 10`),
  /** The provisional date line (~N years — humane precision, R12 hedge). */
  dateInYears: (n: number): string =>
    n === 1 ? 'Work-optional in about a year' : `Work-optional in about ${n} years`,
  /** The first-class no-date answer names its own window (§3c). */
  noDateInWindow: (windowYears: number): string =>
    `No work-optional date within the next ${windowYears} years — with what you’ve entered so far.`,
  /** Odds rider for the date line. */
  withOdds: (xOfTenText: string): string => `about ${xOfTenText} odds`,
  /** The catch-up step-down disclosure names its year (D1). */
  stepDownNote: (calendarYear: number): string =>
    `From ${calendarYear}, contribution room narrows as a catch-up window closes — the plan assumes the lower limit from then on.`,
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
