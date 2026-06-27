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
    'Handy to have nearby: recent account statements, and a marketplace health-insurance quote for everyone under 65 in the household, at your ages and ZIP — the benchmark Silver figure and the premium of a plan you’d pick.',
  coldStartBegin: 'Begin',
  // --- external resource links (R36: we never fetch these — the user reads the number off the
  //     site and types it in; each opens in a NEW TAB so the unsaved in-progress intake survives) ---
  linkGetQuote: 'Get a quote:',
  linkHealthcareGov: 'healthcare.gov',
  linkKffCalculator: 'KFF calculator',
  linkFindSsStatement: 'Find your statement at ssa.gov',
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
  sexHelp: 'The Social Security survival tables are split this way.',
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
  ssAmountLabel: 'Monthly benefit at full retirement age',
  ssAmountHelp:
    'The figure your statement shows at full retirement age — not the one for age 62 or 70. If you start earlier or later, the tool adjusts from there.',
  ssClaimLabel: 'The year you’ll start Social Security',
  ssClaimYearPlaceholder: 'e.g. 2032',
  ssSpousalNote:
    'Spousal and survivor benefits are worked out from both of these — there’s nothing extra to enter.',
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
    'A marketplace quote for everyone under 65 in the household — combined monthly, not one person’s. The tool splits it by age for each of you.',
  qOopHeading: 'Out-of-pocket health costs',
  oopLabel: 'A typical year, out of pocket',
  oopHelp:
    'A rough yearly figure is plenty. Premiums are added on top by the tool, and out-of-pocket costs should already be inside your spending figure — this only sizes your HSA’s tax-free draw.',
  qWorkIncomeHeading: 'Income Medicare looks at',
  // KTD-9 copy half (R40 U4): wages-only / non-modeled-MAGI. The override carries
  // ONLY working-year income the tool isn't already modeling as a retirement income
  // stream — the engine adds each entered stream's own IRMAA-MAGI in every year
  // (ongoingTaxableIrmaaOnly), so a stream counted here too would be double-counted.
  // Inverting this copy is the user-facing half of the KTD-9 structural decouple.
  // FORWARD-phrased (KTD-9 copy-guard fix): this question is answered BEFORE the
  // other-income loop, so the copy must NOT reference streams as already entered —
  // a pension/rental/annuity is added "separately, later," not "below" or "entered."
  workIncomeLabel: 'Income from working — just what work pays',
  workIncomeHelp:
    'Just what work pays — salary and bonuses. If you also receive a pension, rental, annuity, or alimony, you’ll add those separately, later — the tool counts each on its own, so don’t include them here. If you’re still working when Medicare begins, this is what can add a surcharge on top of the usual premium.',
  qIrmaaSeedHeading: 'Your last two tax returns',
  irmaaSeedTwoBackLabel: 'Income, two years back',
  irmaaSeedOneBackLabel: 'Income, last year',
  irmaaSeedHelp:
    'Medicare premiums look back two years — these anchor the early years.',
  // A quiet, color-free requiredness cue for a segmented group with no native
  // "unanswered" signal (the reader is color blind — text, never a red asterisk).
  fieldRequiredMarker: '(required)',
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
    'From the statement’s cost-basis line — what was paid in, before growth. When this account is drawn down later, only the growth above what you paid is taxed — the rest was already taxed going in, so the tool needs the paid-in figure to avoid taxing the same dollars twice. Only a brokerage account needs this.',
  accountContributionLabel: 'Going in each year',
  accountMatchLabel: 'Employer match each year',
  accountHsaEmployerLabel: 'Employer contribution each year',
  // --- the allocation entry (exact stock/bond/cash %; never a silent default blend) ---
  classifierLegend: 'How is it invested?',
  classifierStockPct: 'Stocks %',
  classifierBondPct: 'Bonds %',
  classifierCashPct: 'Cash %',
  errClassifierSum: 'Those percentages need to add up to 100.',
  // --- other income in retirement (R40 — pension/rental/alimony/annuity/other;
  //     opt-in off the 5-minute path; session-only until the vault is saved) ---
  qOtherIncomeHeading: 'Other income (in retirement)',
  otherIncomeIntro:
    'Money that keeps coming in after work stops — a pension, a rental, an annuity, alimony. Skip this if none applies.',
  otherIncomeEmpty: 'No other income added.',
  addOtherIncome: 'Add other income',
  otherIncomeSave: 'Add this income',
  otherIncomeCancel: 'Never mind',
  otherIncomeEdit: 'Edit',
  otherIncomeRemove: 'Remove',
  otherIncomeRemoveConfirm: 'Tap again to remove',
  incomeOwnerLegend: 'Whose income is this?',
  incomeTypeLegend: 'What kind of income?',
  incomeTypePension: 'Pension',
  incomeTypeRental: 'Rental',
  incomeTypeAlimony: 'Alimony',
  incomeTypeAnnuity: 'Annuity',
  incomeTypeOther: 'Other',
  incomeAmountLabel: 'Amount each year, in today’s dollars',
  incomeAmountHelp:
    'Before tax, in today’s money — a steady yearly figure is enough.',
  incomeTimingLegend: 'When does it pay?',
  incomeTimingNow: 'Receiving it now',
  incomeTimingLater: 'Starts later',
  incomeStartAgeLabel: 'The age it starts',
  incomeStartAgeHelp:
    'The age this person starts receiving it — the tool grows today’s figure forward to then.',
  incomeColaLegend: 'Does it keep up with inflation?',
  incomeColaReal: 'Holds its value',
  incomeColaNominal: 'Stays flat (loses ground to inflation)',
  incomeColaFixed: 'Rises a set percent each year',
  incomeColaPctLabel: 'How much it rises each year',
  incomeColaPctHelp:
    'The yearly raise written into the plan — a teacher’s pension often lands near 2 to 3 percent, below inflation.',
  incomeSurvivorLabel: 'How much continues to the survivor',
  incomeSurvivorHelp:
    'If the person receiving it passes first, how much of it keeps paying their spouse. A pension’s survivor share is set by the election made at retirement — there’s no safe guess, so the tool asks.',
  incomeAlimonyDateLegend: 'When was the agreement signed?',
  incomeAlimonyPre2019: 'On or before Dec 31, 2018',
  incomeAlimonyPost2018: 'In 2019 or later',
  incomeAlimonyDateHelp:
    'The date matters for tax: an agreement from 2019 on isn’t taxed to the person receiving it, and an older one is. There’s no safe guess, so the tool asks.',
  incomeAlimonyModifiedLegend: 'Was it changed to follow the newer tax rules?',
  incomeAlimonyModifiedYes: 'Yes, expressly',
  incomeAlimonyModifiedNo: 'No',
  incomeAlimonyModifiedHelp:
    'A pre-2019 agreement changed after 2018 follows the newer rules only if the change expressly says so.',
  incomeAnnuityKindLegend: 'What kind of annuity?',
  incomeAnnuityQualified: 'Qualified (from a retirement account)',
  incomeAnnuityNonQualified: 'Non-qualified (bought with after-tax money)',
  incomeAnnuityKindHelp:
    'A qualified annuity is fully taxed; a non-qualified one returns part of what was paid in tax-free.',
  incomeExclusionLabel: 'The tax-free part each year',
  incomeExclusionHelp:
    'For a non-qualified annuity, the share that’s a tax-free return of what was paid in. From the issuer’s exclusion-ratio figure.',
  incomeAdvancedToggle: 'Fine-tuning (optional)',
  incomeEndAgeLabel: 'The age it stops (leave blank if for life)',
  incomeEndAgeHelp:
    'Blank means it pays for life. Set an age only if it ends earlier — a term-certain annuity, say.',
  incomeTaxableLabel: 'The taxable part each year',
  incomeTaxableHelp:
    'Leave blank to treat it as fully taxable (the safe default). Lower it only if part is a tax-free return of basis — a conservative simplification the tool holds steady.',
  // The session-only "nothing saved yet" affordance — reserved slot, neutral
  // text + icon, never a red badge (color is never the only signal — insight 035).
  notSavedYet: 'Nothing’s saved to this device yet — that happens when you save your plan.',
  errIncomeSurvivorRange: 'The survivor share is a number from 0 to 100 percent.',
  errIncomeTaxableRange: 'The taxable part is a number from 0 to 100 percent.',
  errIncomeExclusionRange: 'The tax-free part is a number from 0 to 100 percent.',
  errIncomeColaPct: 'A yearly raise needs a number when “rises a set percent” is chosen.',
  // The specific "still needed to save" lines — one per no-safe-default fact, so a
  // blocked Save always names what's missing in plain text (WCAG 3.3.1, never a
  // silent dead button). Declarative, calm — the form asks, it never scolds.
  errIncomeTypeRequired: 'Still need the kind of income.',
  errIncomeAmountRequired: 'Still need the yearly amount.',
  errIncomeTimingRequired: 'Still need whether it’s paying now or starts later.',
  errIncomeStartAgeRequired: 'Still need the age it starts.',
  errIncomeColaModeRequired: 'Still need how it keeps up with inflation.',
  errIncomeSurvivorRequired: 'Still need the survivor share.',
  errIncomeAlimonyDateRequired: 'Still need when the agreement was signed.',
  errIncomeAnnuityKindRequired: 'Still need the kind of annuity.',
  errIncomeExclusionRequired: 'Still need the tax-free part of the annuity.',
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
  // --- U7 confidence statement surface (the verdict-first face — spine-lead; D2 adds the
  //     date-first lead). VERDICT-SCOPED keys (start "confidence") run the strict copyGuard
  //     gates (free-numeral + superlative). The "X of 10" count enters via slots.xOfTen, so the
  //     caption itself carries no numeral. ---
  confidenceRegionLabel: 'Where you stand',
  // The natural-frequency frame's tail — composed with slots.xOfTen ("7 of 10" + this), e.g.
  // "7 of 10 futures your plan covers". Kitces survival/coverage framing, never "failure".
  confidenceCoverageCaption: 'futures your plan covers',
  // --- U7 confidence band chrome (the on-demand "show me the range" drawer — BandLabels +
  //     BandPanelChrome for ConfidenceBandPanel). BAND-SCOPED keys: chart chrome describing the
  //     fan's geometry, not a verdict claim, so the universal gates apply (as for factual intake
  //     copy). Percentile counts are spelled out, never digits. ---
  bandCaption:
    'How your savings could grow or thin across the years ahead — the spread of futures, not a single line.',
  bandYAxis: 'Savings, in today’s dollars',
  bandXAxis: 'Years from now',
  bandLegendMedian: 'The most likely path',
  bandLegendInner: 'The middle half of futures',
  bandLegendOuter: 'Eight in ten futures fall inside the band',
  bandPull: 'The range',
  bandStudyRange: 'Study the range',
  bandModalTitle: 'The range of futures',
  bandClose: 'Close',
  // The indeterminate-band placeholder note — shown on the wide low-emphasis envelope when there
  // is no resolved range yet (the answer is incomplete, not bad).
  bandPlaceholderNote: 'The range fills in as you answer.',
  // --- R19 calm error grammar (icon + adjacent text; color never alone) ---
  errContributionCeiling:
    'That’s more than this year’s legal contribution limit for this account type at this age — combined across accounts of the same kind.',
  errAdditionsCeiling:
    'Together, the contribution and employer match are above what one plan can legally receive in a year.',
  errStopAgeInFuture:
    'This stop age is later than their current age — for someone already retired, it’s the age work actually stopped. Did you mean still working?',
  errSsClaimWindow:
    'Social Security can start between ages 62 and 70 — that’s outside the window.',
  errPiaCeiling:
    'That’s higher than any Social Security benefit can be — this asks for the monthly figure from your statement, not the yearly total.',
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
  /** The derived-age echo under the SS claim-YEAR field — the year the user
   *  enters maps to this whole-year age (a fact echo, so they can sanity-check
   *  the year against the 62–70 window). */
  ssClaimAge: (age: number): string => `That’s starting at age ${age}.`,
  /** The valid claim-YEAR window hint — shown before a year is entered, so the
   *  user is guided into the 62–70 window instead of being told they’re wrong
   *  after. Years are birthYear + the canonical SS_CLAIM_MIN/MAX (sourced in the
   *  render); the 62/70 ages mirror those bounds, as errSsClaimWindow already does. */
  ssClaimWindow: (earliestYear: number, latestYear: number): string =>
    `Anytime from ${earliestYear} (age 62) to ${latestYear} (age 70).`,
  /** The derived full-retirement-age echo under the benefit field — FRA is a
   *  fact of the user's birthYear (the SSA table), so they can confirm the
   *  monthly figure they're copying is the at-FRA one. Months show only when
   *  nonzero (most cohorts are a clean year; 1955–59 land on NNy, Mm). */
  fraEcho: (fraMonths: number): string => {
    const years = Math.floor(fraMonths / 12)
    const months = fraMonths % 12
    return months === 0
      ? `Your full retirement age is ${years}.`
      : `Your full retirement age is ${years} years, ${months} months.`
  },
  /** One committed account in the loop's quiet list. */
  accountSummary: (kindLabel: string, owner: string, valueFormatted: string): string =>
    `${kindLabel} · ${owner} · $${valueFormatted}`,
  /** One committed other-income stream's quiet row (R40 — type · owner · ~$X/yr).
   *  The `~` is the humane-precision hedge; the amount is pre-formatted by the
   *  caller (the ui layer can't import the intake money formatter). */
  incomeSummary: (typeLabel: string, owner: string, amountFormatted: string): string =>
    `${typeLabel} · ${owner} · ~$${amountFormatted}/yr`,
  /** The widow's-number row note (R40 — surfaces what the SURVIVOR keeps in plain
   *  language, NEVER a raw survivorPct). `survivorPct ∈ [0,1]`; `keeper` is the
   *  OTHER spouse's name/pronoun, `owner` is the stream owner's. "would keep"
   *  reads for both "You would keep" and "Your spouse would keep" (no agreement
   *  trap). 0 ⇒ it ends; 1 ⇒ all of it; else the rounded percent. */
  incomeSurvivorNote: (keeper: string, owner: string, survivorPct: number): string => {
    if (survivorPct <= 0) return `This ends if ${owner} passes.`
    const pct = Math.round(survivorPct * 100)
    if (pct >= 100) return `${keeper} would keep all of this if ${owner} passes.`
    return `${keeper} would keep ${pct}% of this if ${owner} passes.`
  },
  /** The pinned natural-frequency frame. Top-of-scale renders "better than 9 in
   *  10" — a PROPORTION ("9 in 10"), not a count ("9 of 10"), to dodge the
   *  integer snap-to-10 a near-ceiling count provokes; "10 of 10" can NEVER
   *  appear (the over-funded near-ceiling clamp). */
  xOfTen: (n: number): string => (n >= 10 ? 'better than 9 in 10' : `${n} of 10`),
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
  /** The optional OOP-medical reference hint (shown only while the field is
   *  empty). The amount is pre-formatted by the caller (the ui layer can't import
   *  the intake money formatter); the figure + its BLS provenance live in
   *  `src/intake/referenceData.ts`. */
  oopHint: (amountFormatted: string): string =>
    `Around $${amountFormatted} a year is a reasonable figure for a couple — a bit under the federal average (Bureau of Labor Statistics, 2023). Not sure? Leaving it blank is fine, too.`,
  /** The "still needed" strip's overflow counter — a self-describing list item
   *  (its own span), never a bare "(+N)" glyph fused onto the prior fact name. */
  factsMore: (n: number): string => `${n} more`,
  // --- U7 verdict grammar (the confidence statement's magnitude clause) -----------------
  // The second line of the verdict, keyed off the engine's dollar DIRECTION
  // (DollarAdjustment.direction — NEVER re-derived UI-side) + the humane-rounded $/month figure
  // (pre-formatted by the caller; the ui layer can't import the money formatter). Voice is
  // permissive/probabilistic (R12) — a possibility, never an imperative ("there looks to be
  // room" / "would …", never "trim" / "you should"). The amount enters through the slot, so the
  // copyGuard's free-numeral scan never sees a hardcoded quantitative claim. First-draft strings
  // — exact wording is the N=1 cold-read's call (the surface that consumes these is U7 item d).
  /** direction 'room' — even the conservative future leaves a surplus (over-funded / on-track). */
  verdictRoomClause: (perMonthFormatted: string): string =>
    `There looks to be room for about $${perMonthFormatted} more a month.`,
  /** direction 'trim' — a shortfall the magnitude sizes (off-track / already-failing). */
  verdictTrimClause: (perMonthFormatted: string): string =>
    `About $${perMonthFormatted} a month less would bring it onto steadier ground.`,
  /** direction 'on-the-line' — borderline (or on-track with a rough downside); no figure. */
  verdictHoldClause: (): string => `It sits close to the line — small changes tip it either way.`,
  /** The survivor step-down, told as a plain $ drop (R17/R40). Consumed by SurvivorReadout, which
   *  is ENGINE-BLOCKED: no survivor-specific distribution emits yet — that additive presence-keyed
   *  output is U7 item (e), not built. NO "widow's penalty" jargon (copyGuard catastrophe-lexicon,
   *  survivor-scoped): the calm framing is "on your own", one Social Security benefit ends, and the
   *  brackets become a single filer's. */
  verdictSurvivorStepDown: (perMonthDropFormatted: string): string =>
    `If one of you is on your own later, the household’s monthly income steps down about $${perMonthDropFormatted} — one Social Security benefit ends, and taxes move to a single filer’s brackets.`,
} as const

/**
 * Static disclosures — OUTSIDE the copyGuard's input by design (phase-2
 * cross-cutting #4 "surface-scoped"): the R13 honest-limits note is a mandatory
 * directive-shaped line ("validate … with a professional") that must stay legal
 * while imperative mood stays banned in verdict/recommendation copy. The U7
 * copyGuard enumerates `copy`, never this object.
 */
export const staticDisclosures = {
  honestLimitsScope:
    'Informational and educational — not legal, tax, or investment advice.',
  honestLimitsValidate:
    'Validate big, irreversible moves with a professional.',
} as const satisfies Record<string, string>
