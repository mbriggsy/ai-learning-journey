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
  // C3 → Option B, simplified (2026-06-30, Briggsy's call): the working-year IRMAA-MAGI is the
  // already-entered salary (`earnedIncomeReal`, derived at `intakeMap.buildDateInput`) PLUS the
  // ONE genuinely-new fact — working-year investment income. We do NOT re-ask pay (redundant +
  // confusing, and the engine can't model a time-varying salary anyway). The investment add is a
  // first-class REQUIRED input — its explicit 0 can't be a silent skip (the cardinal sin the C3
  // fix exists to prevent). KTD-9 engine-sense "wages-only" = exclude separately-MODELED streams
  // (pension/rental/annuity/alimony — they ride `ongoingTaxableIrmaaOnly`), NEVER exclude
  // investment income. FORWARD-phrased: answered BEFORE the other-income loop, so a modeled stream
  // is "counted separately later," never "below"/"entered." The disclosure satisfies conservative-
  // or-disclose for the steady-pay simplification (a bonus/RSU spike right before Medicare).
  workIncomeIntro:
    'While you’re still working, Medicare looks at your pay plus any investment income. We’ll use the pay you entered earlier — just add any investment income on top.',
  workInvestmentLabel: 'Investment income on top',
  workInvestmentHelp:
    'Interest, dividends, or other investment income, on top of your pay. Enter 0 if you have none. A pension, rental, annuity, or alimony is counted separately later, so leave those out.',
  workIncomeDisclosure:
    'We use the steady pay you entered; if your income runs unusually high in the years right before Medicare, your real costs could be a little higher than shown.',
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
  dateFreeToday: 'Your fuck-off date is today, by this math',
  dateWindowEdge: 'at the edge of what this window can confirm',
  // --- D2 elevated fuck-off-date surface (the landed magic moment — the date-first lead for a
  //     not-yet-retired household). VERDICT-SCOPED ("date" prefix → free-numeral + superlative): no
  //     bare numeral (the year count rides slots.dateInYears / noDateInWindow), no superlative, no
  //     false-certainty. FIRST-DRAFT disclosure wording — the cold-read's call. ---
  dateRegionLabel: 'Your fuck-off date',
  // The window-edge note, elevated to a full sentence (the inline dateWindowEdge fragment is for the
  // provisional strip). The crowned date IS the window top — no later evidence — so it's reported
  // honestly as the edge of the window, never silently presented as confirmed.
  dateWindowEdgeNote:
    'This is as far out as the window reaches — it sits at the edge of what the math can confirm.',
  // The non-monotone-region disclosure (the ACA-cliff signature: an earlier window clears, then dips
  // below the line before the date holds). D2 owns the string; the C3 result carries the flags.
  dateNonMonotoneNote:
    'An earlier year or two can clear, then dip back below the line before it holds — health costs before Medicare are the usual reason.',
  answerError: 'The math hit a snag.',
  answerRetry: 'Try again',
  // --- D2 result screen chrome (the landed magic moment's frame). The quiet return to intake; the
  //     draft is preserved (every answer kept), so this is "look again", never "start over". 'review'
  //     is not a directive verb and carries no numeral/superlative — copyGuard-clean. ---
  resultReview: 'Review my answers',
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
  // --- U7 survivor readout (the parallel "as the survivor" statement — e2). The survivor phase is
  //     the fragile one, where a calm joint number can hide elevated risk (the exact calm-but-wrong
  //     sin this readout exists to prevent). These keys are BOTH survivor-scoped (isSurvivorKey →
  //     the catastrophe-lexicon gate: no "widow"/"death"/"penalty") AND verdict-scoped ("Readout" →
  //     free-numeral + superlative: no bare numeral — the count rides slots.xOfTen — and no
  //     superlative). Calm framing only: "on your own", never alarm. FIRST-DRAFT WORDING — the
  //     eyebrow + the income-cliff clause are the N=1 cold-read's call. ---
  survivorReadoutEyebrow: 'And if you’re on your own',
  // The "X of 10" tail (composed with slots.xOfTen, e.g. "4 of 10" + this). Parallels the joint
  // confidenceCoverageCaption ("futures your plan covers"); "still covers you" scopes it to the one
  // who's left without restating the condition (the eyebrow + the income-cliff clause carry that).
  survivorReadoutCoverage: 'futures your plan still covers you',
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
  // --- D2c odds-ladder drawer (the date route's secondary "how your odds shift by WHEN you stop").
  //     LADDER-scoped: chart chrome, not a verdict claim, so the universal gates apply (no certainty,
  //     no imperative). Odds counts ride slots.xOfTen (never a bare numeral / "10 of 10"). The
  //     disclosure keeps the ladder one pull DOWN (never the first frame). FIRST-DRAFT wording — the
  //     N=1 cold-read's call. ---
  ladderDisclosure: 'How your odds shift by when you stop',
  ladderCaption:
    'How your chances of staying work-optional shift by the year you stop — each year read against the on-track line.',
  ladderBarLabel: 'On track',
  ladderCrownLabel: 'Your date',
  ladderDipLabel: 'Doesn’t hold',
  ladderXAxis: 'Years from now you stop',
  ladderPlanCaveat:
    'These odds assume today’s draw-down plan; a different withdrawal order or conversion approach can move them.',
  // Hover/scrub readout labels (the on-demand "what's the spread at this year" tooltip). The
  // renderer composes these WORDS around the pre-formatted figures (ages + dollars) it is handed —
  // it never types a numeral (string-free viz). "readout"-keyed ⇒ VERDICT-scoped (copyGuard runs
  // free-numeral + superlative here): percentile counts are SPELLED OUT (never digits), the median
  // is "most likely" not "expected"/"projected" (no-prediction law), and the range leads so the
  // spread — not the point — is the message. The thin-cohort note WITHDRAWS the crisp dollars where
  // the surviving-couple cohort has thinned past the fade onset (readout honesty tracks the visual
  // fade); kept gentle + factual. WORDING resolved 2026-06-28 (council + N=1 cold-read): names the honest WHY (sample too thin to quote a range, NOT "you're broke"), catastrophe-gated via isMortalityKey, width-verified to fit READOUT_W (164px of ~200 usable, real Source Sans 3).
  bandReadoutAgesLabel: 'Ages',
  bandReadoutRangeLabel: 'Eight in ten land between',
  bandReadoutRangeJoiner: ' – ',
  bandReadoutMedianLabel: 'Most likely',
  bandReadoutThinNote: 'Too few couples to show a range.',
  // Household-clock x-axis MARKER labels (the moment's name; the ages + a11y sentence ride through
  // slots — numerals never inline). Band-scoped chrome, not a verdict claim. The plan-horizon marker
  // sits at the fan's ACTUAL last year, never a nominal max. "Work stops" rides the DATE route only —
  // the household isn't retired yet, so it points into the FUTURE (the crowned fuck-off date); on the
  // already-retired SPINE route it would point into the past, so the spine band omits it (honest-axis law).
  bandClockTodayLabel: 'Today',
  bandClockHorizonLabel: 'Plan horizon',
  bandClockWorkStopsLabel: 'Work stops',
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

  // ==========================================================================
  // U8 — the first-Save ceremony + decrypt-on-return (the trust handoff).
  // First-draft strings; the TONE of the blocks + the copy is Briggsy's N=1
  // render cold-read (council 2026-06-30, yours-to-close). copyGuard-clean:
  // clauses lead with field-op verbs, no certainty constructions, no advice mood.
  // ==========================================================================

  // --- the Save beat (Result.tsx .result-actions — the dominant calm completion) ---
  saveCta: 'Keep this answer',
  saveCtaHint: 'Save it to this device, encrypted — openable only by you.',
  savedBadge: 'Saved to this device',

  // --- step 1: set the daily passphrase (the LOCK — typed every time you open this here) ---
  saveHeading: 'Set a passphrase',
  saveIntro:
    'This passphrase encrypts your plan on this device — you’ll type it each time you open it here. Next you’ll set a recovery word as your way back in.',
  passphraseLabel: 'Passphrase',
  passphraseConfirmLabel: 'Type it again',
  passphraseShow: 'Show',
  passphraseHide: 'Hide',
  // The meter-less floor feedback — names WHICH floor is unmet, as plain text (no red gauge).
  passphraseTooShort: 'A short word is quick to crack — a full phrase of a few words holds up far better.',
  passphraseTooWeak: 'This follows a common pattern — a few less-expected words make it much harder to guess.',
  passphraseMismatch: 'The two don’t match yet.',
  passphraseBlocked: 'This can’t be saved until the passphrase is a little stronger.',

  // --- step 2: set the recovery credential (the KEY — the way back in, and the survivor's door) ---
  // The 2026-06-30 council replaced the BIP-39 phrase with a second user-chosen passphrase.
  // The survivor guarantee is the FINDABLE export file + this word kept where it can be found,
  // NOT verified memory — so the framing is durability + estate handoff, never "you're covered".
  recoveryHeading: 'Set a recovery word',
  recoveryIntro:
    'If your passphrase is ever lost — or someone needs to open this after you’re gone — your recovery word is the way back in, and it’s what unlocks your backup file. Pick something you and your spouse will both remember.',
  recoveryIntroSolo:
    'If your passphrase is ever lost — or someone needs to open this after you’re gone — your recovery word is the way back in, and it’s what unlocks your backup file. Pick something memorable, and keep a record of it where the person who settles your affairs could find it.',
  recoverySteer:
    'Make it different from your passphrase, and steer clear of anything someone could look up — a birthday, an anniversary, a hometown. A few unexpected words you share holds up best, because anyone with your backup file and a good guess at your word could open your plan.',
  recoveryLabel: 'Recovery word',
  recoveryConfirmLabel: 'Type it again',
  recoveryEqualsError:
    'Your recovery word needs to be different from your passphrase — if they match, one guess opens both.',

  // --- step 3: securing (firstSave: KDF + atomic commit, ~0.5–1.5 s) ---
  securingStatus: 'Encrypting and saving…',

  // --- step 4: the backup export (mandatory; any one channel satisfies it) ---
  // The two disclosures below are council-MANDATED substance (2026-06-30), not polish:
  // the entropy downgrade (the file is now recovery-word strength, not 128-bit) and the
  // estate handoff (the survivor recovers from the FOUND file + word, not from memory).
  exportHeading: 'Save a backup',
  exportIntro:
    'A backup is your second copy for a second place — another device, a USB drive, cloud storage. It opens with your recovery word.',
  exportEntropyNote:
    'This file is only as protected as your recovery word — it isn’t unbreakable. Keep it somewhere private, and don’t store it alongside a note that says what the word is.',
  exportEstateNote:
    'For someone to open this after you’re gone, they’ll need this file and your recovery word — kept where they can find them, with your important papers or somewhere you’ve told them. Without both, no one can open it, not even us.',
  exportDownload: 'Download backup',
  exportCopy: 'Copy to clipboard',
  exportShowText: 'Show the text',
  exportDownloaded: 'Backup downloaded.',
  exportCopied: 'Copied to the clipboard.',
  exportTextHint: 'Select all of it and save it wherever you keep important files.',
  exportTextSaved: 'I’ve saved the text',
  exportBlocked: 'Save a backup to finish — by download, copy, or the text above.',
  exportFinish: 'Finish',
  // The rare case where reading the just-committed vault back into a file fails (a storage
  // read hiccup). The plan itself is already on disk — only the backup copy didn't build — so
  // the message reassures and offers a retry, never a silent dead-end on this mandatory gate.
  exportUnavailable:
    'Couldn’t prepare your backup just now. Your plan is already saved on this device — try again to make your backup copy.',
  exportRetry: 'Try again',

  // --- step 5: complete ---
  savedHeading: 'Your plan is saved',
  savedBody:
    'It’s encrypted on this device. Open it any time with your passphrase, or restore it on another device with your backup file and recovery word.',
  savedDone: 'Back to my answer',

  // --- ceremony operational errors (firstSave / setNewPassphrase) ---
  saveErrorQuota: 'This device is out of storage. Free up some space, then try again.',
  saveErrorBusy: 'Your plan is open in another tab. Close it there, then try again.',
  saveErrorFailed: 'Saving didn’t finish. Try again.',

  // --- decrypt-on-return: the unlock screen ---
  unlockHeading: 'Welcome back',
  unlockIntro: 'Your saved plan is encrypted on this device. Enter your passphrase to open it.',
  unlockLabel: 'Passphrase',
  unlockButton: 'Open my plan',
  unlockForgot: 'I forgot my passphrase',
  restoringStatus: 'Opening your plan…',
  // The honesty-critical error copy (keys match unlockCopy.ts UnlockCopyKey).
  unlockWrongCredential:
    'That didn’t open it. Check for typos and look-alike letters — a one and an l, a zero and an O. If you’re sure it’s right, the saved data may be damaged, and your backup is the way in.',
  unlockDataDamaged:
    'The saved plan on this device couldn’t be read — it looks damaged. Your backup file and recovery word are the way to restore it.',
  unlockNewerVersion: 'This plan was saved by a newer version of the app. Update to the latest version, then open it.',
  unlockNoVault: 'There’s no saved plan on this device yet.',
  unlockOpenElsewhere: 'Your plan is already open in another tab. Close it there, then try again.',
  // Read-only OPEN (the plan DID open; a second tab holds the writer). A calm standing
  // status, never an alarm — and it steers to RELOAD, not "close the other tab" (this tab
  // won't re-check until reloaded, so "close it there" would promise an edit it can't grant).
  unlockReadOnly:
    'Your plan is open in another tab, so this copy is view-only — changes here won’t be saved. Reload this page to make changes here.',
  unlockGeneric: 'That didn’t work. Try again.',

  // --- the recovery path (forgot passphrase → recovery word → new passphrase) ---
  recoverHeading: 'Use your recovery word',
  recoverIntro: 'Enter your recovery word to open your plan. You’ll set a new passphrase next.',
  recoverPassphraseLabel: 'Recovery word',
  recoverButton: 'Open with my recovery word',
  recoverNewPassHeading: 'Set a new passphrase',
  recoverNewPassIntro:
    'Your recovery word opened your plan. Set a new passphrase to use on this device from now on.',
} as const satisfies Record<string, string>

export type CopyKey = keyof typeof copy

/** The over-funded near-ceiling reading, SINGLE-SOURCED (the verdict surface calls it by name via
 *  {@link slots.xOfTenAtCeiling}, and {@link slots.xOfTen}'s defensive clamp falls back to it). A
 *  PROPORTION ("9 in 10") — never a count ("9 of 10", which snaps to "10 of 10"), never a bald
 *  "10 of 10" (the honesty clamp). */
const XOFTEN_CEILING = 'better than 9 in 10'

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
  /** The running total under the account list (cold-read: the user wants to see what they've
   *  entered add up). Amount pre-formatted by the caller. */
  accountsTotal: (valueFormatted: string): string => `Everything entered so far — $${valueFormatted}`,
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
  /** The band household-clock ages at a marker — both spouses, " / " separated (rendered
   *  tabular-nums). A factual age echo, not a claim. */
  bandClockAges: (ageA: number, ageB: number): string => `${ageA} / ${ageB}`,
  /** The "Today" marker's accessible sentence (the reader is color-blind — the marker's meaning
   *  must reach the a11y tree as text, not as a vertical rule alone). */
  bandClockTodayDesc: (ageA: number, ageB: number): string => `Today — ages ${ageA} and ${ageB}`,
  /** The plan-horizon marker's accessible sentence — anchored at the fan's actual last year. */
  bandClockHorizonDesc: (ageA: number, ageB: number): string =>
    `The plan horizon — ages ${ageA} and ${ageB}`,
  /** The DATE-route "work stops" marker's accessible sentence — the future fuck-off moment (the
   *  household's last earner stops). Color-blind law: the marker's meaning reaches the a11y tree as text. */
  bandClockWorkStopsDesc: (ageA: number, ageB: number): string =>
    `Work stops — ages ${ageA} and ${ageB}`,
  /** An intermediate decade-age tick's accessible sentence (the reference marks between Today and
   *  the horizon — just the ages, no named moment). */
  bandClockAgesDesc: (ageA: number, ageB: number): string => `Ages ${ageA} and ${ageB}`,
  /** The screen-reader-only band range sentence (AT portfolio-range parity, Council 2026-06-29). The
   *  sighted reader gets the fan + the hover/scrub readout; this is the SR reader's ONE honest dollar
   *  range. Names the quantity (savings, today's dollars — distinct from the verdict's $/mo), a SURVIVOR-
   *  NEUTRAL time anchor (years-from-now, never ages / "couples"), range-FIRST + median subordinate ("most
   *  likely"). `low`/`high`/`median` arrive pre-formatted from the SAME resampled tooltipRows the sighted
   *  scrub shows — single-sourced, byte-identical. FIRST-DRAFT — the word-pick is the N=1 cold-read's call. */
  bandAtRange: (years: number, low: string, high: string, median: string): string =>
    `Looking about ${years} years out, your savings land between ${low} and ${high} across eight in ten futures — most likely about ${median}, in today’s dollars.`,
  /** The $0-RUIN variant: when the low edge reads $0 (a depleted low-futures path), speak the depletion
   *  AS depletion — "can run out" — never a soft "between $0 and …" (Council 2026-06-29; the cardinal rule
   *  in the one channel with no $0 picture). Median-led, the depletion as the honest caveat. */
  bandAtRangeRuin: (years: number, median: string): string =>
    `Looking about ${years} years out, your savings most likely sit around ${median} in today’s dollars, but in the hardest futures they can run out.`,
  /** The TOTAL-depletion variant: when even the MEDIAN reads $0 (an already-failing plan — the savings
   *  are most likely gone by here), the "$0 but the hardest futures run out" framing is self-contradictory
   *  (a median of $0 IS the floor). Speak the depletion plainly — most-likely-gone, not a soft range
   *  around $0. (Council 2026-06-29 + the ?seed=failing live cold-read.) */
  bandAtRangeGone: (years: number): string =>
    `Looking about ${years} years out, the savings have most likely run out.`,
  /** The pinned natural-frequency frame. A count below the ceiling renders "N of 10"; the over-funded
   *  near-ceiling is the PROPORTION {@link slots.xOfTenAtCeiling} ("better than 9 in 10"). The `n >= 10`
   *  branch keeps the honesty clamp as a DEFENSIVE backstop so a stray xOfTen(10) anywhere can never
   *  print "10 of 10" — but the verdict surface routes the ceiling through xOfTenAtCeiling BY NAME, never
   *  this magic sentinel (the engine separately clamps its emitted count to ≤ 9). */
  xOfTen: (n: number): string => (n >= 10 ? XOFTEN_CEILING : `${n} of 10`),
  /** The over-funded near-ceiling reading — a PROPORTION, not a count, so it dodges the integer
   *  snap-to-10. The single named source the verdict surface calls (not the magic xOfTen(10)). */
  xOfTenAtCeiling: (): string => XOFTEN_CEILING,
  /** The provisional date line (~N years — humane precision, R12 hedge). */
  dateInYears: (n: number): string =>
    n === 1 ? 'Your fuck-off date is about a year out' : `Your fuck-off date is about ${n} years out`,
  /** The first-class no-date answer names its own window (§3c). */
  noDateInWindow: (windowYears: number): string =>
    `No fuck-off date within the next ${windowYears} years — with what you’ve entered so far.`,
  /** Odds rider for the date line. */
  withOdds: (xOfTenText: string): string => `about ${xOfTenText} odds`,
  /** The date↔confidence tradeoff (R28) — an EARLIER, lower-odds point than the crowned date, so
   *  the date is never a single deterministic line. `yearsSooner` is whole sim-years before the
   *  crowned offset; `oddsText` is the earlier point's "X of 10" reading (the SAME register as the
   *  headline odds — Briggsy's call). Informational, never an imperative ("you could", never "go
   *  sooner"). FIRST-DRAFT wording — the cold-read's call. */
  dateTradeoff: (yearsSooner: number, oddsText: string): string =>
    yearsSooner === 1
      ? `Or about a year sooner, the odds are nearer ${oddsText}.`
      : `Or about ${yearsSooner} years sooner, the odds are nearer ${oddsText}.`,
  /** A D2c ladder x-axis tick — the household clock (0 = today). Compact so ≤ 11 ticks don't crowd;
   *  the "in N years" framing lives in the headline + the crown tell, not every tick. */
  ladderOffsetTick: (offsetYears: number): string => (offsetYears === 0 ? 'today' : `${offsetYears}`),
  /** A ladder mark's a11y sentence — the reader is color-blind, so every dot reaches the tree as
   *  TEXT (the height/shape signal alone isn't enough). The odds ride the CLAMPED oddsText (never
   *  "10 of 10"); `state` names the non-color reading. */
  ladderMarkAria: (
    offsetYears: number,
    oddsText: string,
    state: 'crown' | 'dip' | 'clears' | 'below',
  ): string => {
    const when = offsetYears === 0 ? 'Stopping today' : `Stopping in ${offsetYears} years`
    const tail =
      state === 'crown'
        ? ' — your date, where the odds hold'
        : state === 'dip'
          ? ' — clears, but doesn’t hold'
          : state === 'clears'
            ? ' — clears the line'
            : ' — below the line'
    return `${when}: about ${oddsText}${tail}.`
  },
  /** The no-date "how close" supplement (the Honesty Hawk's v1 alternative to a plotted no-date
   *  curve): the nearest any year came, short of holding — so a reader knows close-vs-far without a
   *  pickable above-the-line dot. The odds ride slots.xOfTen. Cold-read's call. */
  noDateHowClose: (oddsText: string): string =>
    `The nearest any year came was about ${oddsText} — short of holding all the way through.`,
  /** The catch-up step-down disclosure names its year (D1). */
  stepDownNote: (calendarYear: number): string =>
    `From ${calendarYear}, contribution room narrows as a catch-up window closes — the plan assumes the lower limit from then on.`,
  /** The optional OOP-medical reference hint (shown only while the field is
   *  empty). The amount is pre-formatted by the caller (the ui layer can't import
   *  the intake money formatter); the figure + its BLS provenance live in
   *  `src/intake/referenceData.ts`. */
  oopHint: (amountFormatted: string, averageFormatted: string): string =>
    `Around $${amountFormatted} a year is a reasonable figure for a couple — a bit under the federal average of about $${averageFormatted} (Bureau of Labor Statistics, 2023). Not sure? Leaving it blank is fine, too.`,
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
  /** direction 'trim' — an off-track shortfall the magnitude sizes. DIRECTIONAL, never a destination
   *  claim: "would move it TOWARD steadier ground" — even a low off-track plan's trim is a large
   *  fraction of spend, not an asserted arrival (the old "onto steadier ground" read as a single $X
   *  solving it: calm-but-wrong, R25). The unfundable-from-the-start case forks to
   *  `verdictRethinkClause` (Council 2026-06-29). */
  verdictTrimClause: (perMonthFormatted: string): string =>
    `About $${perMonthFormatted} a month less would move it toward steadier ground.`,
  /** direction 'rethink' — already-failing (0 of 10, unfundable from the start). FIGURE-LESS and
   *  LEVER-AGNOSTIC (it also renders for an already-RETIRED household, so it names no accumulation
   *  lever): the shortfall is structural, not a trim away — a single sufficient-sounding figure here
   *  is the calm-but-wrong sin (R25). First-draft string — exact word-pick is the N=1 cold-read's call
   *  (`?seed=failing`). catastrophe-gated via copyGuard `isMortalityKey`. */
  verdictRethinkClause: (): string =>
    `As it stands, this plan runs short from the start — closing that gap takes more than trimming the budget.`,
  /** direction 'on-the-line' — borderline (or on-track with a rough downside); no figure. */
  verdictHoldClause: (): string => `It sits close to the line — small changes tip it either way.`,
  /** The survivor income step-down, told as a plain $ drop (R17/R40) — the PRE-TAX monthly
   *  non-portfolio income that ends at the first death (one Social Security benefit + any of the
   *  deceased's ongoing/earned income). The MFJ→single bracket shift is flagged SEPARATELY (its
   *  after-tax sign is household-dependent, so it is never an ambiguous tax delta folded into $X —
   *  see model.ts §SurvivorConditioned). Consumed by SurvivorReadout (U7 e2); the engine surface
   *  (e1/e1b/e1c) is BUILT + adversarially verified (2026-06-27) and $X enters pre-formatted. NO
   *  "widow's penalty" jargon (copyGuard catastrophe-lexicon, survivor-scoped): the calm framing is
   *  "on your own", one Social Security benefit ends, and the brackets become a single filer's.
   *  COLD-READ RESOLVED (2026-06-27): the tax shift is its OWN sentence (not appositive to $X), so $X
   *  reads cleanly as the pre-tax income drop — the em-dash now binds only to the SS income cause, not
   *  the (excluded) tax effect. The "one Social Security benefit ends" attribution is kept
   *  median-scoped for v1 (the representative retired household; $X also covers any lost
   *  pension/earned income, the minority case) — revisit when D2 wires real households. */
  verdictSurvivorStepDown: (perMonthDropFormatted: string): string =>
    `If one of you is on your own later, the household’s monthly income steps down about $${perMonthDropFormatted} — one Social Security benefit ends. Taxes also move to a single filer’s brackets.`,

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
