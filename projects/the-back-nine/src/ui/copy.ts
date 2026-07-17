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
    'Handy to have nearby: recent account statements, and a health-insurance quote for everyone under 65 in the household, at your ages and ZIP — the benchmark Silver figure and the premium of a plan you’d pick.',
  coldStartBegin: 'Begin',
  // The quiet returning-user door on the brand-new user's first screen: a WIPED/evicted device
  // probes no-vault → ColdStart, so a saved backup is the only way back. Subordinate to Begin
  // (R11 — invited, never a nag); the button label matches the restore surface's own heading.
  coldStartRestorePrompt: 'Set this up before?',
  coldStartRestoreAction: 'Restore from your backup',
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
  // --- the retirement-state question (the state-tax unit, S3). A HOUSEHOLD-level single step
  //     placed BEFORE spend (so S5's spendHelp can branch on the answered state). Framed as a
  //     changeable best guess — non-blocking, never a hard wall, never a silent default. The lead
  //     names WHY it matters (state income tax on withdrawals) in plain words; the help line is
  //     honest that only a few states are priced so far and that nothing is assumed for an unpriced
  //     one. This is the ONLY state-tax disclosure copy S3 owns (S5 owns verdict/omission/spendHelp). ---
  qStateHeading: 'Where will you live in retirement?',
  /** The route-true sibling (the state-tax Caddie chair fix, 2026-07-15): an ALREADY-retired
   *  household reads the future tense as "not applicable to us" — the reentryIntroRetired
   *  precedent. intakeSteps picks by the derived route. */
  qStateHeadingRetired: 'Where do you live in retirement?',
  stateResidenceLead:
    'Where you settle sets the state income tax on the money you take from savings each year — some states tax it, some don’t. A best guess is fine; you can change it whenever your plans firm up.',
  // Tense-neutral (council F3, 2026-07-17): the old "Where you’ll retire" stayed future-tense for
  // an ALREADY-retired household while the heading above route-swaps — and the legend IS the
  // fieldset's accessible name. Preserved dissent (⚑ digest): route-swap it like the heading if
  // Briggsy's eye reads neutral as flat.
  stateResidenceLegend: 'Your retirement state',
  stateOptionNC: 'North Carolina',
  stateOptionPA: 'Pennsylvania',
  stateOptionFL: 'Florida',
  stateOptionElsewhere: 'Somewhere else — not priced yet',
  stateResidenceHelp:
    'So far the tool prices a few states in full. If yours isn’t here yet, pick “Somewhere else” — its state tax stays out of these numbers for now, and nothing is assumed in its place.',
  qSpendHeading: 'What does your life cost?',
  spendLabel: 'Household spending, all in',
  // The ask-for-Medicare-extras BOUNDARY FLIP (F4, fund-first — this wording ships in the same
  // commit as the engine funding, never ahead of it): Part D / Medigap / MA premiums moved OUT
  // of the spending figure — the tool now asks for them (or funds a typical) and adds them on
  // top, alongside Part B. Mechanism-named, never a memory referent (corpus rule 37).
  spendHelp:
    // The tax boundary (the extras pre-walk's two-lens survivor, 2026-07-12): the old "leave
    // out income taxes too … state income tax isn't counted" instructed the reader to strip
    // BOTH taxes while pricing only the federal one — a taxed-state household's state bill
    // landed NOWHERE (the optimistic direction). Federal leaves (the tool prices it); state
    // STAYS INSIDE the figure until the filed state-tax engine unit prices it for real.
    'Everything — housing, food, fun, and the medical costs you pay out of pocket. Leave Medicare premiums out entirely: Part B, its income surcharge, and any Part D, Medigap, or Medicare Advantage premium — the tool handles those separately and adds them on top itself. Leave out federal income tax: the tool works that out from your withdrawals itself. State income tax isn’t priced yet — if your state taxes retirement income, keep that bill inside this figure so it still counts. The whole household, not just the bills that feel like retirement.',
  // S5.1 — the state-aware spendHelp twin (the state-tax unit). The state step precedes spend,
  // so a household that named a PRICED state is told the OPPOSITE of the verbatim line above:
  // leave the state bill OUT (the tool now prices it), exactly like the federal one — keeping it
  // inside would DOUBLE-COUNT the moment pricing ships (the federal double-count class). Shares
  // its prefix + suffix with `spendHelp` verbatim; ONLY the state sentence flips (the S5.1
  // drift-pin in copyGuard.test.ts holds the shared endpoints — the 2026-07-17 council found the
  // prior version of this comment claimed a pin that did NOT exist, and mandated the real one
  // land before any twin reword). Selected in the spend step on the DRAFT answer (intake domain —
  // never the built-params predicate the verdict/lever/sheet read). The state sentence is
  // deliberately presupposition-free (council F5, same ruling): "State income tax" the category,
  // never "your state's income tax"/"that bill" — Florida households have NO such tax or bill,
  // and the old wording told them to leave out a bill that doesn't exist.
  spendHelpStatePriced:
    'Everything — housing, food, fun, and the medical costs you pay out of pocket. Leave Medicare premiums out entirely: Part B, its income surcharge, and any Part D, Medigap, or Medicare Advantage premium — the tool handles those separately and adds them on top itself. Leave out federal income tax: the tool works that out from your withdrawals itself. State income tax is priced by the tool too — leave it out of this figure, the same as the federal one. The whole household, not just the bills that feel like retirement.',
  periodMonth: 'Each month',
  periodYear: 'Each year',
  periodLegend: 'That figure is…',
  // (U12: the spatial "below" was dropped — the same prompt now also renders in the
  //  AssumptionPanel, where the period control sits ABOVE the spend field.)
  periodConfirmPrompt:
    'That number could be dollars each month or dollars each year — tap “Each month” or “Each year” so it’s read the way you meant it.',
  // --- U9b: the spend question under a GOVERNING budget (council 2026-07-02 Q4). The raw field
  //     is replaced by labeled read-only text + a steer — the budget's atomic patch is the ONLY
  //     writer of the spending scalar (a raw edit here was the budget-blind second writer). ---
  spendBudgetGovernedNote: 'This figure comes from your budget now — edit the lines, and it follows.',
  spendEditBudgetCta: 'Edit the budget',
  // --- U9b: the budget builder (the deepening of the single-total answer — R8: reached from the
  //     answer, never an intake gate). Calm plain language; quantities ride slots.
  //     Council 2026-07-03 (wf_67fa22e5-fbb): the invite/title/intro carry the AXIS (what must
  //     hold vs what could give) and are DIRECTION-NEUTRAL by veto — never promise the split
  //     lands sooner/safer/sharper (the R27 100%-FPL/PTC inversion can make the essentials-only
  //     date land LATER; dateFloorInversionNote ships the opposite claim post-split). Reward
  //     copy lives ONLY in these static strings, never the role=status readout slots. ---
  //     (Full-axis label measured single-line in the Result quiet row at 1280×800, 2026-07-03 —
  //     the row wraps to the same two lines with or without it.)
  budgetCta: 'Split what must hold from what could give',
  budgetEditCta: 'Edit your budget',
  budgetSheetTitle: 'What must hold — and what could give',
  budgetSheetIntro:
    'Essentials are the part that has to hold; extras are what could give if it ever came to that. Mark which is which, and the answer takes each on its own terms.',
  budgetApply: 'Use this budget',
  // 'Cancel' is Briggsy's own 2026-07-03 pick (was 'Not now' — he renamed it for honesty; the
  // council's later 'neutral leave' note does not outrank the recorded N=1 word).
  budgetCancel: 'Cancel',
  budgetAddLine: 'Add a line',
  budgetBackToSingle: 'Back to a single number',
  budgetBackToSingleHint:
    'Puts the plan back on one overall spending figure — these lines are let go.',
  budgetCatLabel: 'Category',
  budgetCatHousing: 'Housing',
  budgetCatUtilities: 'Utilities',
  budgetCatFood: 'Food',
  budgetCatTransportation: 'Getting around',
  budgetCatTravel: 'Travel',
  budgetCatGifts: 'Gifts & giving',
  budgetCatOther: 'Other',
  budgetLineLabelLabel: 'Name, if you like',
  budgetLineLabelPlaceholder: 'e.g. Groceries',
  budgetAmountLabel: 'Dollars a year',
  budgetTierLegend: 'Which kind is it?',
  budgetTierEssentials: 'Essential',
  budgetTierDiscretionary: 'Extra',
  budgetWindowFromLabel: 'From year',
  budgetWindowThroughLabel: 'Through year',
  budgetWindowHelp:
    'Counted from the first retirement year — year 0. Leave “through” blank for always.',
  // The ramped-budget anchor disclosure (shared: the sheet readout + the governed spend step).
  budgetAnchorRampNote:
    'With lines that start later or end, the first-year figure is an anchor for the math — not every year’s spending.',
  // R19 line errors — calm advisor voice, blocking (validate-before-mutate), one per defect kind.
  errBudgetAmountNonFinite: 'That amount didn’t read as a number — mind checking it?',
  errBudgetAmountNegative: 'An amount below zero can’t work here.',
  errBudgetWindowNonInteger: 'Years here are whole numbers — 0, 1, 2…',
  errBudgetWindowNegativeStart: 'The start year can’t sit before year 0.',
  errBudgetWindowReversed: 'The end year sits before the start — mind swapping them?',
  // R19 whole-budget cautions — calm, never blocking.
  budgetWarnZeroEssentials: 'Nothing here is marked essential yet, so the safety floor reads as empty.',
  budgetWarnNoYearZero:
    'No line covers the first retirement year yet, so the starting figure reads as zero.',
  budgetApplyBlocked: 'A line needs attention before this budget can be used.',
  qHealthHeading: 'Health coverage before Medicare',
  enrolledPremiumLabel: 'Your household’s combined monthly premium',
  slcspLabel: 'Benchmark Silver plan, monthly (whole household)',
  healthQuoteHelp:
    'A quote for everyone under 65 in the household — combined monthly, not one person’s. The tool splits it by age for each of you.',
  // The benchmark field's own help (Sonnet-5 audit 2026-07-03, P1: two premium-shaped fields in
  // a row with nothing distinguishing them invites a silent duplicate entry — the calm-but-wrong
  // class — and 'the discount' can't be forward-referenced here; it isn't taught until U11).
  slcspHelp:
    'A different figure from the same quote — a standard reference plan, not necessarily the one you’d pick.',
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
  // --- The ask-for-Medicare-extras step (wf_efc6ece2-675 F1 — the payment fork). Asked of any
  // household with a member near 65 or older; a younger household is never asked and simply
  // funds the conservative typical at each 65-crossing (never a silent $0 — forbidden shape
  // (b)). The MA arm's wording is LOAD-BEARING copy: it is how the Medicare-Advantage
  // plurality lands honestly on an AFFIRMED $0. The fork starts with NOTHING selected —
  // never pre-filled with the high anchor. ---
  qMedicareExtrasHeading: 'Medicare, beyond Part B',
  medicareExtrasIntro:
    'The tool adds the Part B premium and its income surcharge by itself. Most people also pay something for extra coverage — a Part D drug plan, a Medigap supplement plan, or a Medicare Advantage plan. Tell it what each of you pays a month for those and it adds that on top too — so keep it out of your spending figure.',
  medicareExtrasForkLegend: 'Beyond Part B, this is…',
  medicareExtrasForkNone: 'About nothing beyond Part B (common on Medicare Advantage)',
  medicareExtrasForkEntered: 'A monthly premium — entered below',
  medicareExtrasAmountLabel: 'Monthly premium, all in',
  medicareExtrasAmountHelp:
    'Everything this person pays each month for coverage beyond Part B — drug plan, supplement plan, or Medicare Advantage premium, added together.',
  medicareExtrasTypicalPicked:
    'A typical figure, not a bill — it assumes the pricier supplement-plus-drug-plan path. Real costs sit higher or lower, including next to nothing on many Medicare Advantage plans. Swap in your own number any time.',
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
    'Leave blank to treat it as fully taxable (the safe default). Lower it only if part of it is a tax-free return of what was paid in — a conservative simplification the tool holds steady.',
  // The session-only "nothing saved yet" affordance — reserved slot, neutral
  // text + icon, never a red badge (color is never the only signal — insight 035).
  notSavedYet: 'Nothing’s saved to this device yet — that happens when you save your plan.',
  errIncomeSurvivorRange: 'The survivor share is a number from 0 to 100 percent.',
  errIncomeTaxableRange: 'The taxable part is a number from 0 to 100 percent.',
  errIncomeExclusionRange: 'The tax-free part is a number from 0 to 100 percent.',
  errIncomeColaPct: 'A yearly raise needs a number when “rises a set percent” is chosen.',
  errIncomeColaRange:
    'Most cost-of-living raises run 2–3% a year, and even the most generous pensions and annuities top out around 5%. A yearly increase this high is almost always a typo — please re-check that number.',
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
    'An earlier year or two can look like it clears, then fall behind again before this date finally holds — health costs before Medicare are the usual reason.',
  // --- U9b date-route floor/lifestyle split (the budget's two-date reading — council 2026-07-02).
  //     "date"-prefixed → verdict-scoped (free-numeral + superlative): year counts + odds ride
  //     slots.dateFloorCovered / dateOddsText, never a bare numeral. The essentials line NEVER says
  //     "work-optional" — that claim belongs to the full-lifestyle track alone (presenting the easier
  //     essentials date as the fuck-off date is the calm-but-wrong sin U9b closes). FIRST-DRAFT
  //     wording — the N=1 cold-read's call. ---
  // (The floor's two no-date arms moved to SLOTS — dateFloorNotWithin / dateFloorNotWithinEither —
  //  so "this window" names its own years, the noDateInWindow precedent; Sonnet-5 audit 2026-07-03.)
  // The R27 floor>lifestyle inversion disclosure (100%-FPL/PTC — correct, surprising engine output
  // that MUST be explained, never hidden to look tidy). Plain-language subsidy cause, no jargon.
  dateFloorInversionNote:
    'Here the essentials-only version lands later than the full plan. Spending less can mean a lower income on paper. That lower income on paper can shrink the health-insurance help you’d get before Medicare — which is what raises your cost here.',
  answerError: 'The math hit a snag.',
  answerRetry: 'Try again',
  // --- D2 result screen chrome (the landed magic moment's frame). (`resultReview` retired at
  //     U12: the Assumptions door took the Review door's quiet-row seat — F4, council
  //     2026-07-08 — and the guided re-walk lives inside the panel as `assumptionRewalkCta`.) ---
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
  // --- U9b floor readout (the two-tier essentials-relief statement — council 2026-07-02). The
  //     full-lifestyle verdict stays the HERO; this is the SUBORDINATE relief line, word + count
  //     ONLY (floorReading carries no dollar — borrowing the full-track magnitude would be the
  //     insight-056 mixed-pairing sin). "Readout" → verdict-scoped (free-numeral + superlative:
  //     the count rides slots.xOfTen). FIRST-DRAFT wording — the N=1 cold-read's call (a formal
  //     Act-3 exit condition: relief-with-honesty, never two competing verdicts). ---
  floorReadoutEyebrow: 'Just the essentials',
  // The "X of 10" tail (composed with slots.xOfTen) — parallels confidenceCoverageCaption.
  floorReadoutCoverage: 'futures your essentials are covered',
  // The Kitces action-first rider — GATED (twoTier.ts) on the floor's own state holding: a claim
  // that trimming suffices is only honest when the essentials actually clear.
  floorReadoutTrimNote: 'If trimming were ever needed, it would start with the extras — not the basics.',
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
  // U9b: in a SPLIT date reading the single band is FLOOR-crowned (council 2026-07-02) while the
  // hero claim reads the lifestyle track — this one-line note names the band's own track so the
  // range and the headline can never silently disagree about what they follow.
  bandFollowsFloorNote: 'This range follows the essentials-covered date.',
  // --- D2c odds-ladder drawer (the date route's secondary "how your odds shift by WHEN you stop").
  //     LADDER-scoped: chart chrome, not a verdict claim, so the universal gates apply (no certainty,
  //     no imperative). Odds counts ride slots.xOfTen (never a bare numeral / "10 of 10"). The
  //     disclosure keeps the ladder one pull DOWN (never the first frame). FIRST-DRAFT wording — the
  //     N=1 cold-read's call. ---
  ladderDisclosure: 'How your odds shift by when you stop',
  ladderCaption:
    'How your chances of staying work-optional shift by the year you stop — each year read against the on-track line.',
  ladderBarLabel: 'on track',
  ladderCrownLabel: 'Your date',
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
  // The AGED-vault year-0 endpoint (U13 follow-up — caught live on the first `?vault=datestale`
  // walk, 2026-07-10): a re-opened old save's fan starts at the SAVE moment, not today, and
  // calling that column "Today" put two time bases on one screen (the exact class the U13
  // ultramode fixed for the hero + floor lines). On an aged vault the year-0 endpoint renames
  // to this label (saved ages beneath it) and the REAL "Today" marker moves to
  // x = years-since-save, wearing the household's CURRENT ages.
  bandClockSavedLabel: 'Your save',
  // --- R19 calm error grammar (icon + adjacent text; color never alone) ---
  // The two CEILING errors are NOT here (F10): they quote the actual statutory limit dollar,
  // so they are slot templates — slots.errContributionCeiling / slots.errAdditionsCeiling,
  // addressed through the SlottedErrorKey channel below.
  errStopAgeInFuture:
    'This stop age is later than their current age — for someone already retired, it’s the age work actually stopped. Did you mean still working?',
  errSsClaimWindow:
    'Social Security can start between ages 62 and 70 — that’s outside the window.',
  errPiaCeiling:
    'That’s higher than any Social Security benefit can be — this asks for the monthly figure from your statement, not the yearly total.',
  errSurvivorRatio: 'Survivor spending can’t be more than 100% of household spending.',
  // U12 ultramode: the floor mirror of the ceiling above. A 0% survivor share zeroes the
  // widowed years' spending and inflates survival — the optimistic (cardinal-sin) direction
  // the fan is structurally blind to. `≤ 0` only (an impossibility, never a guessed band —
  // burned/062); the plausible-but-low band stays the user's call, disclosed by the help text.
  errSurvivorRatioFloor:
    'Survivor spending needs to be above zero — the surviving spouse still spends something every year.',
  errBirthYearFuture: 'That birth year hasn’t happened yet.',
  errAgeBeyondModel: 'Ages past 119 are beyond what the projection can model.',
  // U12 (the hawk's widened F9 gate): an EXPLICIT $0 spend is an entry to question, never a
  // household to simulate — a $0-spend run would read confidently over-funded on a plan that
  // spends nothing (the rosiest possible calm-but-wrong). Companion structural gate:
  // missingRequiredFacts treats a non-positive spend as not-validly-present.
  errSpendZero:
    'Spending of $0 can’t anchor a plan — enter what the two of you actually spend in a year.',
  // The extras half-answer (insight 059's family): "a monthly premium" with no dollar is a
  // self-contradictory state — named at the field, blocking advance. The engine-side
  // resolution would fund the TYPICAL for it (conservative, never a silent $0), but the
  // honest surface makes the user finish the answer or unsay it.
  errMedicareExtrasBlank: 'Enter the monthly amount — or pick one of the other choices.',

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

  // --- the re-offer backup DOOR (U8-tail): a returning, writable session with no backup-note on
  //     record gets a QUIET, subordinate line + CTA on the result (never a badge, never alarm; the
  //     plan itself is already saved — this is only the off-device second copy). "backup"-prefixed →
  //     outside every verdict/control scope, so only the universal ban-gates apply. ---
  backupDoorLead: 'No backup file has been saved from this device.',
  backupDoorCta: 'Save a backup file',
  backupNotNow: 'Not now',

  // --- the edit-and-re-save beat (a saved plan whose answer has since been edited; the update
  //     write path — no ceremony, the keys are resident) ---
  resaveCta: 'Save your changes',
  resaveHint: 'Your saved plan doesn’t include these changes yet.',
  resavePending: 'Saving your changes…',
  // The re-save refusal in a READ-ONLY tab. Steers to RELOAD, never "close the other tab" —
  // this tab's writer probe ran once at unlock, so closing the other tab cannot grant an edit
  // here (the same law as unlockReadOnly; saveErrorBusy's close-tab steer would be a retry
  // that can never succeed).
  saveErrorReadOnly: 'This tab can’t save changes — your plan is open in another tab. Reload this page to save here.',

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
  // Renders as the ViewOnlyBanner's icon+WORD+text (color-blind law): the lead carries the
  // state word, so the body no longer repeats "view-only" mid-sentence.
  unlockReadOnlyLead: 'View-only',
  unlockReadOnly:
    'Your plan is open in another tab, so changes here won’t be saved. Reload this page to make changes here.',
  unlockGeneric: 'That didn’t work. Try again.',
  // The (unreachable-by-construction) reload affordance if a just-unlocked model can't be re-opened
  // onto the result — the vault is safe on disk; a reload re-runs the probe → unlock.
  restoreRetry: 'Reload the page',

  // --- the recovery path (forgot passphrase → recovery word → new passphrase) ---
  recoverHeading: 'Use your recovery word',
  recoverIntro: 'Enter your recovery word to open your plan. You’ll set a new passphrase next.',
  recoverPassphraseLabel: 'Recovery word',
  recoverButton: 'Open with my recovery word',
  recoverNewPassHeading: 'Set a new passphrase',
  recoverNewPassIntro:
    'Your recovery word opened your plan. Set a new passphrase to use on this device from now on.',
  recoverNewPassButton: 'Save my new passphrase',
  // The UI-layer negative-pairing bounce (the inverse of recoveryEqualsError): on the recovery
  // path the SESSION cannot check this (it holds only the recovery KEY, not the plaintext —
  // insight 049's documented residual), so this flow's own check is the sole gate.
  recoverEqualsError:
    'Your new passphrase needs to be different from your recovery word — if they match, one guess opens both.',
  // Fork C(i) — the standing both-credentials-lost line on the recovery surface (council
  // 2026-06-30: no-backdoor truth + steer to the export file, never "it's gone"; there is no
  // attempt counter, so the no-lockout reassurance is honest). Wording ⚑ Briggsy's cold-read.
  recoverBothLostNote:
    'Take your time — there’s no limit on tries. This same word also opens your backup file on any device. If the word itself is lost, no one can open your plan — not even us.',

  // --- restore from backup (Fork A — the damaged-vault door; the survivor's re-entry) ---
  // R17 grade holds: consume-side of "the file + the word you kept", never "you're covered".
  // The failure copy is GCM-ambiguous where the crypto is (backup.ts:47-51): a wrong word and a
  // rotted recoveryWrap opened with the RIGHT word are indistinguishable, so the hedge steers to
  // ANOTHER copy of the export — never "it's gone", never a bare "corrupt".
  restoreHeading: 'Restore from your backup',
  restoreIntro:
    'The saved plan on this device couldn’t be read — it looks damaged. Your backup file and recovery word can bring it back: pick the file, enter your word, and set a new passphrase.',
  // The cold-entry intro variant: opened from ColdStart, the restore door serves a wiped/evicted
  // NO-vault device — there is no damaged plan on disk, so the damaged-framed restoreIntro above
  // would misread ("the saved plan on this device… looks damaged" when there is none). Same steps,
  // an honest opener for a device that starts empty. (RestoreFlow picks by whether onBack is set.)
  restoreColdIntro:
    'If you saved a plan before and kept the backup file and your recovery word, you can bring it back. Pick the file, enter your word, and set a new passphrase for this device.',
  restoreFileLabel: 'Backup file',
  restoreFileReadError: 'That file couldn’t be opened. Pick the backup file you saved.',
  restoreFileDamaged:
    'This doesn’t look like a backup made by this app — or the file is damaged. If you kept another copy of your backup, that one may open.',
  restoreWrongCredential:
    'That word didn’t open this backup. Check for typos and look-alike letters — a one and an l, a zero and an O. If you’re sure it’s right, this copy of the file may be damaged — another copy of your backup may open.',
  restoreVaultExists: 'This device already has a saved plan. Reload the page to open it with your passphrase.',
  restoreWordIntro: 'Enter your recovery word — the one that opens your backup file. You’ll set a new passphrase next.',
  restoreNewPassIntro: 'Your recovery word opened your backup. Set a new passphrase to use on this device from now on.',
  // The restore surface's standing C(i) line (⚑ wording = Briggsy's cold-read, like recoverBothLostNote).
  restoreBothLostNote:
    'Take your time — there’s no limit on tries. If the word is lost, no one can open this backup — not even us.',

  // --- P3·U10 — the manual controls (sequencing + the Roth lever). PREFIX LAW: keys prefixed
  // roth*/sequencing*/twoFutures*/control* are SWEPT by the require-hedge gate (isControlKey) —
  // reserve those prefixes for genuine plan-moving READOUTS, which must wear a hedge token.
  // Chrome (titles, CTAs, field labels, closed-state notes) rides the lever*/tfChart* prefixes,
  // exactly as ladder chrome rides ladder* — an axis label must never be reworded into mush to
  // satisfy a modal-verb gate. All FIRST-DRAFT craftsman's-lead wording (the cold-read's call). ---

  // The sequencing door + sheet chrome.
  leverSequencingCta: 'Change your withdrawal order',
  leverSequencingEditCta: 'Revisit your withdrawal order',
  leverSequencingTitle: 'Which account pays first?',
  leverSequencingIntro:
    'Each year’s spending has to come out of your accounts in some order — and the order changes what you pay in tax along the way. Pick one and compare it against the neutral default.',
  leverPolicyProportional: 'A little from each',
  leverPolicyProportionalHelp: 'Draws from every account in proportion to its balance — the neutral default.',
  leverPolicyTaxableFirst: 'Brokerage first',
  leverPolicyTaxableFirstHelp: 'Spends the brokerage account down before touching pre-tax or Roth.',
  leverPolicyPreTaxFirst: 'Pre-tax first',
  leverPolicyPreTaxFirstHelp: 'Spends the pre-tax account down first, saving Roth for last.',
  // U11 — bracket-fill joined the picker WITH the engine-derived cliff-aware ceiling (the U10
  // withheld-policy law is retired; the label names what binds, never the jargon — council 2026-07-03).
  leverPolicyBracketFill: 'Low-tax room first',
  leverPolicyBracketFillHelp:
    'Pulls from pre-tax only while that money is cheap to take — up to the next tax bracket, stopping before a jump in your health-insurance costs or in Medicare’s premiums — then draws tax-free for the rest of the year.',
  leverPolicyCustom: 'My own order',
  leverPolicyCustomHelp: 'Put the three accounts in exactly the order you want them spent.',
  leverPolicyCurrentTag: '— your current order',
  leverOrderMoveUp: 'Move up',
  leverOrderMoveDown: 'Move down',
  leverOrderUpGlyph: '↑',
  leverOrderDownGlyph: '↓',
  leverOrderBucketTaxable: 'Brokerage',
  leverOrderBucketPretax: 'Pre-tax',
  leverOrderBucketRoth: 'Roth',
  leverSequencingApply: 'Use this order',
  // The Roth teaser + lever chrome. The DOOR is categorical (gated on filing status + a resolved
  // answer only — never a personalized computation; test-pinned) and quiet (R11 — invited, never
  // a nagging badge); the general-fact teaser line opens the sheet itself.
  leverRothDoorCta: 'Try a Roth conversion',
  leverRothDoorEditCta: 'Revisit your Roth conversion',
  leverRothTitle: 'Try a Roth conversion',
  leverRothIntro:
    'A conversion moves money from your pre-tax account into your Roth on purpose — you pay the tax now, and what’s inside grows tax-free afterward. Set an amount and a window; both futures update.',
  leverRothAmountLabel: 'Amount, dollars a year',
  leverRothStartLabel: 'Starting how many years from now',
  leverRothStartHelp: '0 means starting this year.',
  leverRothYearsLabel: 'For how many years',
  leverRothApply: 'Add this to my plan',
  leverRothRemove: 'Take the conversion back out',
  leverRothClosedNothing:
    'There’s nothing in a pre-tax account to convert, so this what-if doesn’t apply to you.',
  leverPreviewPending: 'Working out both futures…',
  leverPreviewError:
    'That comparison didn’t come together. Adjust a field — or close and reopen — to try again.',
  leverPreviewNoDate:
    'This comparison anchors to your work-optional date, so it needs one on the board first. Applying a change still updates the answer above.',
  leverNoWorkerNote:
    'On this device the comparison computes when you finish a field — it can take a moment.',
  leverCancel: 'Close',
  // Two-futures CHART CHROME (tfChart* — deliberately OUTSIDE the require-hedge sweep, like
  // ladder chrome: an end-of-line series label is identity, not a plan-moving claim).
  tfChartRothWith: 'With the conversion',
  tfChartRothWithout: 'Today’s plan',
  // When a conversion is ALREADY applied, "Today's plan" would mislabel the stripped baseline
  // (today's plan HAS the conversion) — the honest name for the without-arm is the negation.
  tfChartRothWithoutApplied: 'Without the conversion',
  // Plan-moving READOUTS (require-hedge-swept; the numbers arrive via slots below).
  rothTeaserLead:
    'Couples who file jointly often have a lower-tax window before required withdrawals begin. Some fill it with small Roth conversions, a little at a time.',
  rothFundingNote:
    'We assume the conversion’s tax comes out of your withdrawals in the same order as everything else. Paying it from taxable savings instead could make converting look a little better than shown.',
  rothOmissionsNote:
    'Not counted here: state income tax, the net-investment-income tax, and pre-65 health-plan side effects — each could move this picture.',
  // S5.2 — the state-priced twin (the state-tax unit): the state-tax item DROPS from the list for
  // a household whose run prices its state (the composeRothOmissionsNote seam gates it on the
  // producer's-output predicate). 'roth' prefix ⇒ require-hedge-swept: keeps "could move this picture".
  rothOmissionsNoteStatePriced:
    'Not counted here: the net-investment-income tax and pre-65 health-plan side effects — each could move this picture.',
  // O9 CLOSED (2026-07-17, rode the O14 sweep — the sweep touched these exact strings): the
  // "pre-65 health-plan side effects" clause is age-gated OFF for an all-65+ household — no
  // pre-65 years exist, so the clause was inapplicable noise for exactly the population that
  // reads this note most (the Medicare-priced hero's own households). The composer's SECOND
  // axis (`householdAll65` — `medicareOnlyPriced`, draft ages; an unknown age conservatively
  // KEEPS the clause) picks these variants. The single-item variant says "it", never "each" —
  // grammar honesty; "could" carries require-hedge on all four.
  rothOmissionsNoteAll65:
    'Not counted here: state income tax and the net-investment-income tax — each could move this picture.',
  rothOmissionsNoteStatePricedAll65:
    'Not counted here: the net-investment-income tax — it could move this picture.',
  twoFuturesCaption:
    'How the middle-of-the-road path could run with and without the change, in today’s dollars.',
  sequencingBaselineNote:
    'The comparison holds everything else still — same markets, same spending — so the gap you see is the order itself, not luck. It can read small; small and real beats big and imagined.',

  // --- P3·U11 — the Healthcare sheet. Chrome rides lever*/tfChart* (hedge-exempt, the prefix
  // law above); plan-moving READOUTS ride the four U11 control prefixes (shadowRate* /
  // irmaaStep* / acaCost* / subsidyRegime*) or control* — each swept by require-hedge.
  // All FIRST-DRAFT craftsman's-lead wording (the cold-read's call; contract #8 exit condition). ---
  leverHealthDoorCta: 'See your health-cost picture',
  leverHealthDoorEditCta: 'Revisit your health-cost picture',
  leverHealthTitle: 'Your health-cost picture',
  // Cold-read 2026-07-03 round 2 ("still not clicking… especially around marketplace help"):
  // ONE concrete word — DISCOUNT — carries the whole pre-65 story across every sheet line.
  // The intro was briefly retired for scroll-free fit, then RESTORED same night on Briggsy's
  // law: content is never removed to satisfy aesthetics — the layout adapts instead.
  leverHealthIntro:
    'Before Medicare, your household’s health coverage comes with an income-based discount — the lower a year’s income, the bigger the discount. After 65, Medicare’s own premiums also step with income. Here’s where those pieces stand in your plan.',
  // The fact-readout eyebrows (cold-read 2026-07-03: "why isn't the content a first class
  // citizen?" — each empirical fact renders as eyebrow + tabular-nums dollar anchor + the
  // honed sentence, the stepped readout the U11 ratification named). Sentence-case calm labels
  // (the survivor-eyebrow precedent — uppercase reads as alarm).
  healthFactCoverage: 'Coverage before Medicare',
  healthFactDiscount: 'The income-based discount',
  healthFactConversion: 'Roth conversions in those years',
  healthFactMedicare: 'Medicare premiums',
  healthFactStep: 'The next premium step',
  leverHealthRegimeLegend: 'Which subsidy rules should the plan figure under?',
  leverHealthRegimeReverted: 'Current law',
  leverHealthRegimeRevertedHelp:
    'The enhanced discount expired — help fades as income rises and disappears entirely above a set income level.',
  leverHealthRegimeEnhanced: 'If the bigger discount returns',
  leverHealthRegimeEnhancedHelp:
    'The 2021–2025 rules Congress may restore — more help at every income, with no point where it disappears entirely.',
  leverHealthRegimeApply: 'Figure my plan this way',
  leverHealthRegimeRemove: 'Back to current law',
  leverHealthRegimeCurrentTag: '— how it’s figured now',
  // Two-futures CHART CHROME for the regime compare (identity labels, hedge-exempt).
  tfChartRegimeReverted: 'Under current law',
  tfChartRegimeEnhanced: 'If the discount returns',
  tfChartRegimeCurrent: 'As figured now',
  // Plan-moving READOUTS (require-hedge-swept by prefix).
  // Vocabulary law (Sonnet-5 audit 2026-07-03): 'line'/'cliff' belong to the ACA discount;
  // 'step' belongs to Medicare — one word per mechanism, everywhere on the sheet.
  irmaaStepStory:
    'Medicare premiums look back two years at your income — money converted at 63 can show up in the premium bill at 65. Each step is sharp: one dollar over it and the higher charge applies for that whole year.',
  controlHealthOmissionsNote:
    'Not counted here: state income tax, the net-investment-income tax, differences in plan cost-sharing, the benchmark premium itself, state-level subsidy top-ups, and a surviving spouse’s chance to have the Medicare surcharge rechecked sooner — each could move this picture.',
  // S5.2 — the state-priced twin (the state-tax unit), gated INDEPENDENTLY of the other homes
  // (insight 078 — different population, own chrome): the state-tax item DROPS for a priced
  // household. Everything else (NIIT, cost-sharing, benchmark, top-ups, the survivor recheck)
  // stays. 'control' prefix ⇒ require-hedge-swept: keeps "could move this picture".
  controlHealthOmissionsNoteStatePriced:
    'Not counted here: the net-investment-income tax, differences in plan cost-sharing, the benchmark premium itself, state-level subsidy top-ups, and a surviving spouse’s chance to have the Medicare surcharge rechecked sooner — each could move this picture.',
  // The extras block's lead (the ask-for-Medicare-extras unit, F5's door home). Deliberately
  // NOT a control* key (the require-hedge sweep is for plan-moving readouts; this is a
  // mechanism disclosure — the universal gates still apply). Mechanism-named (rule 37):
  // WHO adds WHAT, the reader's entries as supporting context in the per-person lines.
  medicareExtrasSheetLead:
    'Coverage beyond Part B — the tool adds each person’s premium on top of your spending:',
  controlHealthSurvivorNote:
    'If one of you is on your own later, the same income can trip these lines sooner — the discount disappears right away, and the Medicare step follows about two years behind.',
  controlHealthHsaNote:
    'Your HSA can pay medical bills tax-free at any age, and Medicare premiums once its owner is 65 — but usually not your coverage costs before then. Once Medicare starts, new contributions stop counting.',
  // The post-65 PRICED-Medicare disclosure (the Medicare-pricing unit, 2026-07-10 — supersedes the
  // retired age-keyed "unpriced" note). An all-65+ household reaches no ACA door, so these two lines
  // are its ONLY Medicare honesty surface: the AFFIRMATION that base Part B + the income surcharge
  // ARE in the numbers (so a steeper figure has its cause named) SHIPS WITH the narrowed residual
  // (what still isn't) — the affirmative alone would imply ALL of Medicare is priced, a fresh
  // optimistic lie. A household that reaches the Healthcare door is NOT shown these: its sheet
  // already carries the residual (controlHealthOmissionsNote) — one honest home per fact.
  // The extras unit widened the affirmation (extra coverage now priced — entered, affirmed-$0,
  // or the typical) and moved the residual pair AS A SET (F4): the Part D/Medigap "inside your
  // spending" clause DIED (now added on top), the state-tax clause STAYS (its own filed engine
  // unit), and the real-flat clause BROADENED from "the base premium" to every premium the tool
  // adds. The on-typical household additionally gets a per-person bi-directional sentence
  // (slots.medicareExtrasTypical*) appended INSIDE the residual paragraph — same block, no new
  // frame row (the one-frame fit law's tallest composite).
  verdictMedicarePriced:
    'Medicare’s costs for the two of you are already in these numbers — the Part B premium, its income surcharge, and extra coverage: a drug plan, a supplement plan, or a Medicare Advantage premium.',
  // Reworded 2026-07-17 (council wf_d3666133-c34, O14 sweep): (1) the old "isn’t counted" was the
  // family's lone outlier — one lexeme, two referents against intake's "keep that bill inside this
  // figure so it still counts" (a compliant taxed-state household read its kept-inside bill as
  // VANISHED — the calm-but-wrong direction); the clause now speaks the family's own "priced"
  // frame. (2) The double-em-dash three-fact chain reshaped into one-fact sentences (the O12
  // density ruling — zero facts dropped, the hawk's veto). (3) The hedge "could sit tighter than
  // shown" was twice refuter-confirmed ambiguous in the ROSIER direction (more precise vs less
  // margin) — replaced with an explicit not-rosier direction. S1 magnitude law holds: the state
  // bill stays "a real yearly bill", never a rounding hedge.
  verdictMedicareResidual:
    'Those are the pieces this tool adds by itself. The rare Part A premium stays inside the spending you gave us. State income tax isn’t priced yet. In a taxing state, that’s a real yearly bill. Premiums are held flat in today’s dollars, so their true cost could run higher than shown.',
  // S5.2/S5.3 — the verdict residual SPLIT into clause-parts (the monolith above stays as the
  // UNPRICED render, verbatim). For a state-PRICED household the embedded "state income tax isn’t
  // counted" clause DIES and is REPLACED by the outcome-scoped affirmation naming the state,
  // composed in `stateTaxDisclosure.composeVerdictMedicareResidual` as `lead + affirm + tail`.
  // The affirmation ALWAYS ships WITH the narrowed residual (the `…Tail` "premiums held flat"
  // clause) — never affirm-alone (that would imply ALL of state tax is optimized; the rails stay
  // FEDERAL in v1, provably state-neutral for a flat roster — §V/S2.8, so this is outcome
  // language, never an optimization claim). A copyGuard drift-pin asserts `verdictMedicareResidual`
  // starts with `…Lead` and ends with `…Tail`, so the split can't silently diverge from the
  // shipped monolith. `verdict` prefix ⇒ free-numeral-gated: NAME the state, never a rate.
  verdictResidualLead:
    'Those are the pieces this tool adds by itself. The rare Part A premium stays inside the spending you gave us.',
  // The Tail now opens with a period graft (was an em-dash): every priced affirmation ends
  // mid-clause ("…reflected in these numbers" / "…no state bill on your withdrawals"), so the
  // Tail closes that sentence and starts its own — one fact per sentence on both compositions.
  verdictResidualTail:
    '. Premiums are held flat in today’s dollars, so their true cost could run higher than shown.',
  verdictResidualStateNC: 'Your North Carolina state income tax is reflected in these numbers',
  verdictResidualStatePA:
    'Your Pennsylvania state income tax is reflected in these numbers, usually a small piece since Pennsylvania leaves most retirement income untaxed',
  verdictResidualStateFL: 'Florida has no state income tax, so there’s no state bill on your withdrawals',
  rothMedicareResidualNote:
    'The income surcharge a conversion can trip two years later is now part of these numbers. One modeling choice remains: premiums are held level in today’s dollars, so a conversion that crosses a surcharge step could look a shade easier here than in real life.',

  // --- P3·U12 — the AssumptionPanel (the R7 escape hatch; council wf_dff75c2f-9e3). PREFIX
  // LAW: `assumption*` is the panel's CHROME prefix — labels, values, provenance lines,
  // section headings, the door CTA. Deliberately hedge-EXEMPT (never a 'roth'/'sequencing'/
  // 'control' prefix, which require-hedge sweeps) and verdict-EXEMPT (never an 'answer'/
  // 'date' prefix or a 'readout'/'headline' substring, which free-numeral sweeps) —
  // provenance lines carry factual numerals (a table year, a section number) exactly like
  // intake copy. The scope-seam pins in copyGuard.test.ts document the exemption (the U11
  // precedent); the universal gates (false-certainty / advice-verb) still cover every string.
  // Keys containing 'survivor' stay survivor-scoped (catastrophe-gated) by the substring net,
  // and `assumptionTruerPicture` joins isMortalityKey BY NAME (it renders at the worst
  // moment). FIRST-DRAFT craftsman's-lead wording throughout — the door CTA, the market-floor
  // line, and the truer-picture line are N=1 cold-read subjects (the Act-3 exit condition). ---
  assumptionDoorCta: 'The assumptions behind this',
  assumptionTitle: 'The assumptions behind this answer',
  assumptionIntro:
    'Everything the answer leans on, in one place — yours to check, most of it yours to change. Edits land as you leave each field.',
  assumptionSectionMethodology: 'On your behalf',
  assumptionSectionFacts: 'Your facts',
  // The echo's quiet arm (date route / no standing spine verdict): a plain statement of
  // where edits land — never a fabricated verdict echo.
  assumptionEchoQuiet: 'Edits here flow straight into your answer.',
  // The truer-picture line (R8's honest-worsening arm; F8/council 2026-07-08): renders ONLY
  // when an edit lands the displayed verdict BELOW the panel-open baseline. The moved
  // numbers live in the echo above it (word + count + dollars — the non-color signal
  // grammar); this line only frames the move. Catastrophe-gated by name (copyGuard.ts).
  assumptionTruerPicture:
    'The odds above stepped down — that’s the picture getting truer to what you entered, not the plan itself changing.',
  // The guided re-walk, moved INSIDE the panel (F4 — the Review door left the quiet row).
  assumptionRewalkCta: 'Walk through everything again',
  assumptionViaIntakeCta: 'Edit in the walk-through',
  assumptionCollectionsName: 'Accounts & other income',
  assumptionCollectionsValue:
    'Balances, account kinds, tickers, and any pension or other income — edited where they were entered, so nothing gets out of step.',
  // The Medicare-extras refine seat (the ask-for-Medicare-extras unit) — the standing
  // DETAILS HOME for the funded figure (corpus rule 38: general terms need a place to see
  // the dollars) and the refine path for the conservative typical.
  assumptionMedicareExtrasName: 'Medicare extra coverage — Part D, Medigap, or Advantage',
  assumptionNoneApplied: 'None applied.',
  assumptionDrawdownName: 'Withdrawal order',
  assumptionRothName: 'Roth conversions',
  assumptionRegimeName: 'Health-subsidy rules',
  // The retirement-state row (the state-tax unit, S3): the editable "where you’ll retire" pick —
  // a changeable best guess, edit → re-run (the SC-vs-GA what-if lever). The picker's own legend
  // (stateResidenceLegend) labels the row; this note names the disclosed-out posture HONESTLY when
  // the household has not answered — never a fabricated default state.
  /** The unanswered face is a TOOL fact with the direction rider (the state-tax Caddie chair
   *  fix, 2026-07-15 — four lenses converged, refuters held: the old "no state income tax is
   *  in these numbers" skimmed as a HOUSEHOLD fact ("we owe none") and was the one state
   *  disclosure that dropped the real-bill rider its verdict/spendHelp siblings carry —
   *  corpus rule 37, the 2026-07-11 residual family's exact crack). */
  assumptionStateUnsetNote:
    'Not set yet — the plan counts no state income tax until you pick one. If your state taxes retirement income, that’s a real yearly bill these numbers leave out.',
  // The ONE real R7-editable methodology knob (the F1/F3 ruling). Its UNSAFE direction is
  // disclosed in the help — too LOW understates the survivor's need (methodology.ts).
  assumptionSurvivorRatioLabel: 'Spending if one of you is on your own, as a share of today’s',
  assumptionSurvivorRatioHelp:
    'Research on surviving spouses lands around three-quarters of a couple’s spending. Set it lower and the later years can read easier than they may prove.',
  errSurvivorRatioBlank:
    'Survivor spending needs a share to run on — three-quarters is the researched default.',
  assumptionPeriodLegend: 'Your spending figure reads as…',
  // The panel's period toggle RE-LABELS the committed figure; it never re-bases it (the
  // intake segment re-bases mid-entry, where the typed digits are the truth — here the
  // canonical annual is the truth, and a silent 12× re-base would be the cardinal sin).
  assumptionPeriodHelp:
    'Only how that figure is entered and shown — the plan is figured in yearly terms underneath, and switching this never changes the amount.',
  assumptionMarketName: 'Market returns',
  assumptionMarketProvenance:
    'A deliberately conservative default — the high-valuation planning assumptions (Pfau/Kitces), figured in today’s dollars.',
  // The STANDING market-floor line (F8's ratified fallback): a pure statement that the range
  // includes market randomness that cannot be removed — NEVER a "sharper inputs won't help /
  // stop refining" directive (council-killed; the insight-025 defect class).
  assumptionMarketFloorNote:
    'Part of the range around your answer is the market itself — randomness an honest projection carries rather than removes.',
  assumptionLongevityName: 'How long the plan runs',
  assumptionLongevityValue:
    'Survival odds from the Social Security Administration’s cohort life tables (2024 Trustees Report), taken per person by sex — the plan runs on odds, never one fixed end age.',
  assumptionSurvivorSsName: 'Social Security if one of you is on your own',
  assumptionSurvivorSsValue:
    'Figured by federal law’s own survivor-benefit rule (Section 202 of the Social Security Act) — law the plan applies, not a setting it exposes.',
  assumptionOutliveName: 'Who outlives whom',
  assumptionOutliveValue:
    'Never one fixed guess: every simulated future draws each person’s span from the same survival tables, so both orderings are weighed at their real odds.',
  assumptionConversionTaxName: 'How a conversion’s tax is paid',
  // The v1 per-policy funding rule + its CONSERVATIVE direction, disclosed (roth.ts:33-41;
  // the taxable-first slice is the filed R7-editable upgrade).
  assumptionConversionTaxValue:
    'Tax on a Roth conversion comes out of the year’s withdrawals in the same order as everything else. That choice errs against converting, so the lever’s benefit reads understated, never oversold.',
  assumptionSsClaimAgeLabel: 'The age Social Security starts',
  errBirthYearBlank: 'The plan needs a birth year to run — mind putting one back?',
  // --- P3·U13 — the re-entry gate + the staleness notes ---------------------------------
  // LAW: `reentry*` / `staleness*` are chrome/note prefixes (the `assumption*` precedent) —
  // factual read-back labels + calm drift disclosures, hedge-EXEMPT and verdict-EXEMPT
  // (they carry no odds and recommend nothing). The confirm is a PROMPT, never an
  // attestation (council 2026-07-09 constraint (c)); nothing here claims "confirmed".
  // FIRST-DRAFT craftsman's-lead wording throughout — the re-entry copy is an Act-3
  // exit-condition cold-read subject.
  reentryHeading: 'Are these still your numbers?',
  reentryIntro:
    'Your answer is figured from the balances below, exactly as you last entered them. Markets and paychecks move — a quick look keeps the reading honest.',
  // The ROUTE-TRUE intro for an all-retired household (Caddie card #1, pilot-cleared with a
  // fix 2026-07-10): "paychecks" at a household with none was the spouse walker's primary
  // stumble ("does this thing even know we stopped working?"). Same sentence, honest register.
  reentryIntroRetired:
    'Your answer is figured from the balances below, exactly as you last entered them. Markets and benefit checks move — a quick look keeps the reading honest.',
  reentryBalancesLegend: 'Account balances, as saved',
  // The FRAME GLOSS (Caddie card #1, pilot-cleared with a fix 2026-07-10): a couple already
  // claiming receives a different check than the at-FRA figure, and the gate's own question
  // invites comparing against the real deposit — the clause names WHICH figure this is, so
  // they neither "correct" a right number nor okay one they can't verify.
  reentryBenefitsLegend:
    'Social Security, monthly at full retirement age — the statement figure your plan models from',
  reentryBucketPretax: 'Pre-tax accounts — 401(k), 403(b), traditional IRA',
  reentryBucketRoth: 'Roth accounts',
  reentryBucketTaxable: 'Brokerage',
  reentryBucketHsa: 'HSA',
  reentryAffirmCta: 'Still about right — show my answer',
  reentryUpdateCta: 'Something’s changed — update them',
  reentryContinueCta: 'Continue to your answer',
  // The calm per-clock drift lines (Q1 — the disclosure that rides WITH the recompute; each
  // names its own rulebook, none names a direction — the answer itself carries the verdict).
  stalenessAppDefault:
    'We’ve updated our default planning assumptions since your save — this reading uses the new ones.',
  stalenessTax: 'Tax rules have been updated since your save — this reading uses today’s.',
  // S4/S5.4 — the state-tax staleness clock's own line (the `controls.stateTaxMoved` predicate):
  // a priced household's state rules moved since its save. Its OWN line, never aliased onto
  // stalenessTax — the two clocks fire independently (an NC rate step must not read as a federal
  // change, and vice versa).
  stalenessStateTax: 'State tax rules have been updated since your save — this reading uses today’s.',
  // (stalenessSeniorBonus was REMOVED by the U13 ultramode review 2026-07-09: the crossing
  // changes nothing about a saved answer — see the supersession note in staleness.ts.)
  stalenessHealthcare:
    'Health-coverage rules have been updated since your save — this reading uses today’s.',
  // "fund snapshots" PURGED (Caddie card #2's top flag, pilot-cleared with a fix 2026-07-10:
  // three lenses stumbled independently — "is that MY money?"). The honest referent is the
  // fund-classification data (the blend table), spoken plainly as "the fund data we read
  // your accounts against" (the card's own candidate) — never "market data" (it is not
  // prices) and never the jargon word.
  stalenessDate:
    'The contribution limits or the fund data behind your date have been updated since your save — this reading uses today’s.',
  // The all-retired (spine) household's blend line: no date to reference, and contribution
  // limits never touch a decumulation-only answer — only the blend clock speaks.
  stalenessBlendSpine:
    'The fund data we read your accounts against has been updated since your save — this reading uses today’s.',
  // The standing hero note (renders WITH the first verdict when any clock fired — never
  // after it; the answer is already recomputed under today's rules, this line says so).
  // DELIBERATELY ONE LINE at the reading measure: the full per-clock disclosure lives at
  // the re-entry gate the user just read; a two-line echo here pushed the PROTECTED R13
  // disclaimer below the one-frame fold at 1536×791 (measured live, 2026-07-09).
  // REWORDED 2026-07-10 (the Caddie False-PASS Hunter, chair-verified against fold.json):
  // the old tail ("this answer uses today's") was the reassuring HALF alone — in-frame it
  // read as whole-answer currency while the balances-are-your-save-vintage truth sat below
  // the fold (date route) or nowhere (spine route). One line cannot carry all three claims,
  // so the echo keeps the two STANDING epistemic facts — rules currency + input vintage —
  // and the "what changed" alarm stays at the gate (just affirmed through, per-clock).
  stalenessHeroNote: 'Figured under today’s rules, from the numbers you saved.',
} as const satisfies Record<string, string>

export type CopyKey = keyof typeof copy

/**
 * The slotted-ERROR message channel (F10). The two ceiling errors are the only R19 messages
 * that carry a figure — the statutory limit the message quotes — so a violation may ride a
 * slot key + PRE-formatted params instead of a static catalog key. ONE typed contract shared
 * by the violation channel (src/intake/sanity.ts) and the renderer (FieldError):
 * `params` present ⇔ `messageKey` names a slot template — the renderer routes it through
 * `slots[messageKey](params.limitFormatted)`, and every param-less violation renders
 * `copy[messageKey]` byte-identically to before.
 */
export type SlottedErrorKey = 'errContributionCeiling' | 'errAdditionsCeiling'
export interface SlottedErrorParams {
  /** The statutory limit, PRE-formatted by the intake money formatter (digits + grouping,
   *  no `$` — the slot template supplies the glyph), computed AT FIRE TIME from the canonical
   *  year-keyed constants (the ceiling is age-dependent; catch-up bands exist). Never a
   *  re-typed dollar. */
  readonly limitFormatted: string
}
export type CatalogMessage =
  | { readonly messageKey: CopyKey; readonly params?: undefined }
  | { readonly messageKey: SlottedErrorKey; readonly params: SlottedErrorParams }

/**
 * The hedge vocabulary — the words a probabilistic reading is authored FROM (U10's
 * `require-hedge` copyGuard gate reads THIS same set, never a hand-copied list —
 * burned/063 single-source-the-gate). Where SLOT DISCIPLINE governs how a NUMBER
 * enters copy, this governs how CERTAINTY does: a control readout or a recommendation
 * headline must WEAR one of these — "could / about / N of 10 / looks to be" — so the
 * plan-moving claim is never a bald deterministic "buys you 3 years" (R12; calm-but-
 * wrong is the sin). Reach for one when you write a control/recommendation line:
 *
 *   - modal possibility — could · can · may · might · would
 *   - approximation ("humane precision") — about · around · roughly · the "~" glyph
 *   - non-committal direction (a nudge, never an asserted arrival) — toward · towards
 *   - the natural-frequency frame (the spine's honest odds) — "of 10" · "in 10"
 *   - typical-not-always — often · usually · tends · tend
 *   - stated likelihood ("most likely" carries it) — likely
 *   - a reading, not a verdict — "looks to be" · "appears to"
 *   - named as an estimate / a disclosed assumption — estimate(d/s) · assume(s) · "we assume"
 *
 * Matching semantics (word-boundary where the edge is a letter/digit, literal for the
 * "~" glyph; case-insensitive) live in copyGuard.ts, mirroring the ban lexicons. The
 * gate needs only ONE token present — the honesty is in the modal, not the exact word.
 */
export const HEDGE_TOKENS = [
  'could', 'can', 'may', 'might', 'would',
  'about', 'around', 'roughly', '~',
  'toward', 'towards',
  'of 10', 'in 10',
  'often', 'usually', 'tends', 'tend',
  'likely',
  'looks to be', 'appears to',
  'estimate', 'estimated', 'estimates', 'we assume', 'assume', 'assumes',
] as const

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
  /** The aged-vault "Your save" year-0 endpoint's accessible sentence (the U13 one-time-base
   *  law applied to the chart — see `bandClockSavedLabel`). Saved ages, the save moment named. */
  bandClockSavedDesc: (ageA: number, ageB: number): string =>
    `When you saved this — ages ${ageA} and ${ageB}`,
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
   *  scrub shows — single-sourced, byte-identical. FIRST-DRAFT — the word-pick is the N=1 cold-read's call.
   *  O3 RATIFIED AS-DESIGNED (council 2026-07-10 + the low-edge probe, PASS on all three fixtures):
   *  this ONE sentence deliberately carries NO IQR figure, NO tick ladder, NO legend echo — the sighted
   *  scrub itself quotes only p10/p50/p90, so this is parity, not a gap; and the anchor column is the
   *  couple-clean region's WORST low edge (probed: anchorIsCleanMin on date/datesplit/retired — the
   *  docs/council-log.md O3 row has the numbers). Do not extend without a new council. */
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
  /** The floor's no-date arm while the FULL plan is dated (the extreme R27 inversion arm — the
   *  inversion note carries the why; this line only states the fact). Names its own window
   *  (the noDateInWindow precedent — Sonnet-5 audit 2026-07-03). */
  dateFloorNotWithin: (windowYears: number): string =>
    `Covering just the essentials doesn’t clear within the next ${windowYears} years — with what you’ve entered so far.`,
  /** The quiet severity disclosure when the lifestyle has no date either — the hero line above
   *  already names the window + carries the entered-so-far tail, so this one leans on it. */
  dateFloorNotWithinEither: (windowYears: number): string =>
    `Covering just the essentials doesn’t clear within the next ${windowYears} years either.`,
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
    const when =
      offsetYears === 0
        ? 'Stopping today'
        : offsetYears === 1
          ? 'Stopping in a year'
          : `Stopping in ${offsetYears} years`
    // The dip clause tells the whole story in one breath (cold-read 2026-07-03: "clears, but
    // doesn't hold" read as a riddle) — it clears NOW and slips below the line BEFORE the date.
    // The crown clause names the ladder's SHAPE, never a certainty (Caddie card #3, pilot-
    // cleared with a fix 2026-07-10: "where the odds hold from here on" invited the lay read
    // "once we reach our date we're locked in at 90%" — rule 7's certainty shape. The claim is
    // that every later stop-year's odds also clear the line, and now it says exactly that).
    const tail =
      state === 'crown'
        ? ' — your date, the first year the odds clear the line and stay above it for every later start'
        : state === 'dip'
          ? ' at first — but the odds slip below the line in the years after, so it doesn’t last'
          : state === 'clears'
            ? ' — clears the line'
            : ' — below the line'
    return `${when}: about ${oddsText}${tail}.`
  },
  /** The ladder caveat's aged-balances clause (council 2026-07-10 — the red team's second-order
   *  catch: dropping the hero/ladder contradiction makes a stale reading MORE believed, so the
   *  balances vintage rides the ladder itself on an aged vault, even when no rules-clock
   *  fired). Names the SAVE YEAR — the persist machine's own `savedAt` year, re-stamped on
   *  every save (review 2026-07-10: NEVER `startCalendarYear`, the BUILD year, which survives
   *  a re-save and would tell a household that just updated its numbers they are stale). A
   *  named year over a re-derived "about N years ago" span: it never drifts across a New Year. */
  ladderCaveatAgedBalances: (savedCalendarYear: number): string =>
    `They also read from your account balances as you entered them in ${savedCalendarYear} — updating your numbers refreshes these odds.`,
  /** The no-date "how close" supplement (the Honesty Hawk's v1 alternative to a plotted no-date
   *  curve): the nearest any year came, short of holding — so a reader knows close-vs-far without a
   *  pickable above-the-line dot. The odds ride slots.xOfTen. Cold-read's call. */
  noDateHowClose: (oddsText: string): string =>
    `The nearest any year came was about ${oddsText} — short of holding all the way through.`,
  /** U9b — the split reading's subordinate essentials line ("essentials covered by ~X", NEVER
   *  "work-optional by ~X" — the claim assignment, council 2026-07-02). `oddsText` arrives
   *  pre-composed (dateOddsText — the same conservative lower-bound register as the hero);
   *  `unconfirmed` folds the floor's own window-edge hedge into the sentence. */
  dateFloorCovered: (years: number, oddsText: string, unconfirmed: boolean): string => {
    const when =
      years === 0
        ? 'The essentials alone are covered from today'
        : years === 1
          ? 'The essentials alone are covered about a year out'
          : `The essentials alone are covered about ${years} years out`
    const edge = unconfirmed ? ' That sits at the edge of what this window can confirm.' : ''
    return `${when} — ${oddsText}.${edge}`
  },
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
  // --- U9b budget-builder reconciliation slots (all figures pre-formatted by the caller) --------
  /** The anchor — the figure the current answer reads against. */
  budgetAnchorLead: (totalFormatted: string): string =>
    `Your answer uses about $${totalFormatted} a year.`,
  /** The lines-target NETS the injected OOP medical (build-gate 1): typed lines should sum to
   *  S − M, because the medical floor is carried automatically on top. Council 2026-07-03:
   *  purely functional grammar — this is the role=status live readout (re-announces on every
   *  commit), so it carries no reward copy and no reconcile-to-target audit voice. */
  budgetLinesTarget: (targetFormatted: string): string =>
    `About $${targetFormatted} a year goes into the lines below.`,
  budgetMedicalCarried: (medicalFormatted: string): string =>
    `About $${medicalFormatted} a year of out-of-pocket medical is carried automatically — it needs no line here.`,
  /** The M>S honesty branch (F10): the OOP-medical figure ALONE exceeds the total the answer
   *  uses, so the lines-target would read "about $0 into the lines below" beside "about $M
   *  carried automatically" — internally contradictory. This line REPLACES the lines-target in
   *  that state and names the contradiction plainly, BOTH dollars quoted in-sentence
   *  (dont-make-users-think). FIRST-DRAFT craftsman's-lead wording — a cold-read subject. */
  budgetMedicalExceedsTotal: (medicalFormatted: string, totalFormatted: string): string =>
    `The out-of-pocket medical alone — about $${medicalFormatted} a year — is already more than the total your answer uses, about $${totalFormatted} a year. One of the two may be worth a second look.`,
  /** The running first-year total of the typed lines (year-0 actives, both tiers). */
  budgetRunningTotal: (totalFormatted: string): string =>
    `Your lines add up to about $${totalFormatted} a year.`,
  /** The essentials/extras split readback (the cold-read 2026-07-03 ask: the tier answer must be
   *  SEEN used, not just collected) — rendered in the sheet readout AND the governed spend step. */
  budgetTierSplit: (essentialsFormatted: string, extrasFormatted: string): string =>
    `Essentials about $${essentialsFormatted} · extras about $${extrasFormatted} a year.`,
  /** The governed spend step's read-only value line (Q4 — the budget is the only writer). */
  spendBudgetTotal: (totalFormatted: string): string =>
    `About $${totalFormatted} a year — set by your budget.`,
  /** The remove-line control's accessible name (icon-only button). */
  budgetRemoveLine: (label: string): string => `Remove ${label}`,
  // --- R19 ceiling errors (F10) — the calm error grammar, QUOTING the statutory limit ----------
  // Rendered by FieldError through the SlottedErrorKey channel (params ⇔ slot). The limit is
  // computed AT FIRE TIME from the canonical constants (contributionCeilingFor /
  // annualAdditionsCeilingFor — age-dependent, catch-up bands included) and arrives
  // PRE-formatted by the intake money formatter; the templates stay digit-free (the '§§§'
  // sentinel test). Grammar preserves the pre-slot calm R19 strings.
  /** The C1 contribution ceiling, with the actual age-dependent limit named in-sentence (the
   *  dont-make-users-think law — a reader who knows the limit dollar can ACT on it). */
  errContributionCeiling: (limitFormatted: string): string =>
    `That’s more than this year’s legal contribution limit for this account type at this age — $${limitFormatted}, combined across accounts of the same kind.`,
  /** The §415(c) annual-additions ceiling, limit named (the catch-up band sits ON TOP of the
   *  bare cap — annualAdditionsCeilingFor owns that composition, never this template). */
  errAdditionsCeiling: (limitFormatted: string): string =>
    `Together, the contribution and employer match are above what one plan can legally receive in a year — $${limitFormatted} at this age.`,
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
    `If one of you is on your own later, the household’s monthly income steps down about $${perMonthDropFormatted} — as one Social Security benefit ends. Taxes also move to a single filer’s brackets.`,

  // --- P3·U10 — the two-futures delta readouts (R10/R12: the survivor's number, natural-frequency
  // FIRST, the "~N years" a hedged secondary, N ≤ 0 a calm in-frame state — never suppressed and
  // never a bald deterministic claim). Every template wears its hedge by construction; the odds
  // phrases arrive pre-rendered through slots.xOfTen (the ceiling clamp composes naturally:
  // "…in better than 9 in 10 futures instead of 7 of 10"). FIRST-DRAFT — the cold-read's call. ---
  /** The primary delta line, SURVIVOR basis (the plan's emotional headline number). Reads honestly
   *  in BOTH directions — a loss renders as "…in 5 of 10 futures instead of 7", never suppressed. */
  rothDeltaSurvivor: (withOdds: string, withoutOdds: string): string =>
    `For whichever of you outlives the other, the money could last in about ${withOdds} futures instead of ${withoutOdds}.`,
  /** The JOINT-basis fallback (no survivor phase observed in the runs — rare; same grammar). */
  rothDeltaJoint: (withOdds: string, withoutOdds: string): string =>
    `Together, the plan could hold in about ${withOdds} futures instead of ${withoutOdds}.`,
  /** The EVEN case — the quantized readings agree; the difference is inside the noise the
   *  quantize deliberately absorbs. Calm, in-frame, never a suppressed delta. */
  rothDeltaEven: (odds: string): string =>
    `In these runs it doesn’t look to change much — about ${odds} either way.`,
  /** The verdict-state transition rider (the 10/10-clamp pivot: when the with-arm reaches the
   *  ceiling — or the arms land in different states — the headline shift is the STATE move). */
  rothStateShift: (fromWord: string, toWord: string): string =>
    `That would read as moving from “${fromWord}” to “${toWord}.”`,
  /** The hedged "~N years" SECONDARY, tied to its stated percentile (never the headline). Present
   *  only when BOTH arms have a real median depletion year — never fabricated. */
  rothYearsSecondary: (n: number, direction: 'more' | 'fewer'): string =>
    `Around the middle of the road, that’s roughly ${n} ${direction} year${n === 1 ? '' : 's'} of runway.`,
  /** The sequencing delta line — same grammar, the order as the subject. */
  sequencingDelta: (withOdds: string, withoutOdds: string): string =>
    `With this order, the money could last in about ${withOdds} futures instead of ${withoutOdds}.`,
  /** The user-echoed conversion plan (their own figures back at them — an echo, not a claim).
   *  Start pluralizes like the duration ("in about a year", never "1 years" — Caddie panel
   *  2026-07-10, caught on a driven lever preview). */
  rothPlanEcho: (amountFormatted: string, startYearsFromNow: number, years: number): string => {
    const start =
      startYearsFromNow === 0
        ? 'starting this year'
        : startYearsFromNow === 1
          ? 'starting in about a year'
          : `starting in about ${startYearsFromNow} years`
    return `Converting ~$${amountFormatted} a year for ${years} year${years === 1 ? '' : 's'}, ${start}.`
  },

  // --- P3·U11 — the Healthcare sheet's readout slots (every figure pre-formatted by the chrome;
  // each template wears its hedge by construction — the four U11 prefixes are require-hedge-swept).
  // FIRST-DRAFT craftsman's-lead wording (the cold-read's call). ---
  /** The DATED legislative-status note — read from the LIVE constants at render time, never a
   *  persisted stamp (reVerifyEveryBuild); the date names why the note can go stale. */
  acaCostStatus: (checkedOn: string): string =>
    `Figured under this year’s rules: the enhanced subsidies expired, so help fades as income rises and stops at the cliff. Congress could still restore them — last checked ${checkedOn}.`,
  /** The enhanced-regime variant of the status note (an APPLIED what-if is a hypothesis, never
   *  current law — the ColdStart-restore marker rides this same slot). */
  acaCostStatusEnhanced: (checkedOn: string): string =>
    `Figured under the ENHANCED subsidy rules — a what-if, not current law. Congress may yet restore them; as of the last check, ${checkedOn}, it hadn’t.`,
  /** The middle-of-the-road pre-65 net coverage cost (the empirical median, humane-rounded).
   *  Round 7 (cold-read 2026-07-03: "Household? Where is the number coming from?"): the figure's
   *  SOURCE is named — it is the user's own entered marketplace plan (the household-premium
   *  intake question), net of the computed discount — never a national average. */
  acaCostNet: (amountFormatted: string): string =>
    `Before Medicare, the health plan you entered could run your household around ~$${amountFormatted} a year after the income-based discount.`,
  /** The over-cliff frequency (a per-year FRACTION of futures, never a mean — insight 062). */
  acaCostCliff: (odds: string): string =>
    `In about ${odds} futures, a year’s income tips past that line and the year’s discount disappears entirely.`,
  /** The over-cliff odds when the anchor has ALREADY crossed the cliff — no headroom sentence
   *  precedes this fact in that branch, so the cutoff dollar rides inline instead of being
   *  borrowed from a sentence that never renders (Sonnet-5 audit 2026-07-03). */
  acaCostCliffOverCliff: (odds: string, cliffFormatted: string): string =>
    `In about ${odds} futures, a year’s income passes about ~$${cliffFormatted} and that year’s discount disappears entirely.`,
  /** The shadow marginal rate on the next converted dollar (tax + the subsidy it burns).
   *  Cold-read 2026-07-03 rounds 1+2: state the POINT and the DIRECTION plainly — conversions
   *  work AGAINST the discount (his round-2 read had inverted it into "conversions help with
   *  premiums"), and the causal chain is spelled out: converted dollar = income → smaller
   *  discount. Vocabulary rides the intro's "income-based discount", never "marketplace". */
  shadowRateLine: (cents: number): string =>
    `Roth conversions work against that discount: every converted dollar counts as income, and more income means a smaller discount. Around those years, a converted dollar could cost about ${cents}¢ all told — the tax on it, plus the discount lost.`,
  /** The cliff headroom at the empirical anchor — carries its OWN context (cold-read
   *  2026-07-03: "What is my income, and what is the cliff?"): the income figure IS the plan's
   *  middle-of-the-road counted income at the anchor, and the cutoff IS the all-at-once end of
   *  the discount, both quoted in dollars. Renders BEFORE the odds line (its antecedent). */
  //  Round 5 (cold-read 2026-07-03): the em-dash apposition read ambiguous (is $X the income or
  //  the discount?) and "your household's yearly income" presumed a figure the user never
  //  entered — the plan DERIVES it, so the plan is named as its source. One fact per sentence.
  //  Round 6: the era is NAMED on the figure ("the years before Medicare") — the sheet quotes a
  //  different, honestly-lower income for the later Medicare years, and two same-named figures
  //  with no era on them read as a data bug (cold-read: "test data issue?").
  shadowRateHeadroom: (magiFormatted: string, cliffFormatted: string, headroomFormatted: string): string =>
    `In the years before Medicare, the plan expects about ~$${magiFormatted} a year of income for your household. That is the number the discount is judged on. Above about ~$${cliffFormatted} the discount disappears entirely, so there’s roughly ~$${headroomFormatted} of room.`,
  /** What Medicare costs BEFORE any next step — the anchor the step line is measured from
   *  (cold-read 2026-07-03: "What are they before the next step?"). The wire's base/surcharge
   *  split (council Q3) earns its render seat here. Base arm: the middle path pays no
   *  surcharge at the anchor. */
  irmaaStepNowBase: (totalFormatted: string): string =>
    `In your plan’s Medicare years, premiums could run about ~$${totalFormatted} a year for your household — the base rate, with no income surcharge on the middle-of-the-road path.`,
  /** The surcharged arm — the middle-of-the-road path already sits above at least one line. */
  irmaaStepNowSurcharged: (totalFormatted: string, surchargeFormatted: string): string =>
    `In your plan’s Medicare years, premiums could run about ~$${totalFormatted} a year for your household — about ~$${surchargeFormatted} of that is already income surcharge on the middle-of-the-road path.`,
  /** The next IRMAA line NAMED in dollars (cold-read 2026-07-03: "What is the line?") with the
   *  anchor income QUOTED in the same breath and the step cost spoken as the household's own
   *  number ("don't force the user to think — just tell them", Briggsy's law, same day):
   *  `bothEnrolled` picks the two-of-you total vs the each-of-you per-person figure (the
   *  engine's real enrolled count at the anchor — never a flat ×2). */
  irmaaStepNext: (
    thresholdFormatted: string,
    magiFormatted: string,
    headroomFormatted: string,
    addFormatted: string,
    bothEnrolled: boolean,
  ): string =>
    `The next step sits at about ~$${thresholdFormatted} of yearly income. By those Medicare years the plan expects about ~$${magiFormatted} a year of income, roughly ~$${headroomFormatted} under it. ` +
    (bothEnrolled
      ? `Crossing it could add about ~$${addFormatted} a year for the two of you.`
      : `Crossing it could add about ~$${addFormatted} a year for each of you once on Medicare.`),
  /** The regime compare's HEADLINE — the lifetime health-cost delta (the regime's effect
   *  concentrates pre-65 and may barely move the portfolio median; council 2026-07-03). */
  subsidyRegimeCostDelta: (withFormatted: string, withoutFormatted: string): string =>
    `Lifetime health costs could run around ~$${withFormatted} this way, versus ~$${withoutFormatted} as figured now.`,
  /** The even arm (Caddie 2026-07-10): both medians can ROUND to one figure, and "~$99,800 …
   *  versus ~$99,800" reads as a twin-number glitch — say "about the same" and quote the
   *  shared figure once. The compose gates on the FORMATTED strings being equal. */
  subsidyRegimeCostEven: (costFormatted: string): string =>
    `Lifetime health costs could run about the same either way — around ~$${costFormatted}.`,
  // --- The fact-readout figure ANCHORS (aria-hidden in render — every figure also lives in a
  //     hedged body sentence, so AT hears it once; the ~ carries the humane-precision hedge). ---
  healthFigPerYear: (amountFormatted: string): string => `~$${amountFormatted} a year`,
  healthFigRoom: (amountFormatted: string): string => `~$${amountFormatted} of room`,
  // --- The ask-for-Medicare-extras figures (templates carry NO digit — the slot law; the
  //     dollar is the single-sourced constant, medicareExtrasTypicalMonthly(), pre-formatted). ---
  /** The intake fork's typical-arm label. */
  medicareExtrasForkTypical: (monthlyFormatted: string): string =>
    `Not sure — use a typical figure (about $${monthlyFormatted} a month)`,
  /** The assumptions panel's UNANSWERED-fork standing line (the extras pre-walk's confirmed
   *  finding, 2026-07-12): the details home must let the reader CONFIRM the dollar the
   *  verdict quotes (rule 38) without pre-checking an arm the user never chose (rule 14).
   *  One fact + the refine invitation — the bi-directional caveat lives in the residual. */
  medicareExtrasPanelStanding: (monthlyFormatted: string): string =>
    `No answer yet — the plan prices a typical figure meanwhile, about $${monthlyFormatted} a month. Pick a choice to make it your own.`,
  /** The hero's on-typical disclosure, ONE person (bi-directional + mechanism-named, corpus
   *  rule 37; `who` = the person's name or the You/Your-spouse fallback). Appended inside the
   *  residual paragraph — no new block on the tallest frame. */
  medicareExtrasTypicalOne: (who: string, monthlyFormatted: string): string =>
    `${who} — extra coverage here is a typical figure, about $${monthlyFormatted} a month, not an actual bill; real costs run higher or lower, including next to nothing on many Medicare Advantage plans.`,
  /** BOTH on-typical, collapsed to one sentence (the triple-note anaphora lesson). */
  medicareExtrasTypicalBoth: (monthlyFormatted: string): string =>
    `Extra coverage here is a typical figure — about $${monthlyFormatted} a month each, not your bills; real costs run higher or lower, including next to nothing on many Medicare Advantage plans.`,
  // --- The door sheet's extras fact lines (per person — the F5 door home; provenance is the
  //     load-bearing content: whose number, entered vs affirmed vs typical). ---
  medicareExtrasFactEntered: (who: string, monthlyFormatted: string): string =>
    `${who} — about $${monthlyFormatted} a month, the figure you entered.`,
  medicareExtrasFactNone: (who: string): string =>
    `${who} — about nothing beyond Part B, as you answered.`,
  medicareExtrasFactTypical: (who: string, monthlyFormatted: string): string =>
    `${who} — a typical figure of about $${monthlyFormatted} a month, not an actual bill; real costs sit higher or lower, including next to nothing on Medicare Advantage.`,
  healthFigCents: (cents: number): string => `${cents}¢ on each dollar converted`,
  healthFigStepAdd: (amountFormatted: string): string => `+~$${amountFormatted} a year`,
  // --- P3·U12 — the AssumptionPanel's market disclosure figures. The values are READ from
  //     `productionMarket.value` at render (never re-typed — the constants-discipline rule)
  //     and arrive pre-formatted WITH their % glyph; the templates carry no numeral. ---
  assumptionMarketStocks: (meanPct: string, swingPct: string): string =>
    `Stocks — about ${meanPct} a year after inflation, with swings around ${swingPct} in a typical year.`,
  assumptionMarketBonds: (meanPct: string, swingPct: string): string =>
    `Bonds — about ${meanPct} a year after inflation, with swings around ${swingPct}.`,
  assumptionMarketInflation: (meanPct: string): string => `Inflation — about ${meanPct} a year.`,
  // --- P3·U13 — the re-entry gate + the date answer's wall-time framing ------------------
  /** The SS fold-in row's figure ("are these still your benefit amounts?" — read back in the
   *  monthly frame the statement and the intake asked in; amount pre-formatted). */
  reentryBenefitMonthly: (amountFormatted: string): string => `$${amountFormatted} a month`,
  /** The "~N years since your save" line — renders ONLY off a real `savedAt` anchor
   *  (absent = suppressed, never fabricated from the plan's start year). */
  reentryElapsedYears: (n: number): string =>
    n === 1 ? 'You saved this about a year ago.' : `You saved this about ${n} years ago.`,
  /** One expired budget window's calm re-confirm (quotes the line's own calendar boundary —
   *  the user's frame, never a bare offset). */
  stalenessBudgetLine: (endCalendarYear: number): string =>
    `Part of your budget was set to end in ${endCalendarYear} — worth a look if that’s changed.`,
  /** The date hero's ANCHORED framing (U13): the relative years re-derived against wall
   *  time + the wall-time-stable calendar label — the calendar year never decays, the "~N
   *  years" is always from TODAY (a re-opened old save must not replay its save-day count). */
  dateInYearsAnchored: (n: number, calendarYear: number): string =>
    n === 1
      ? `Your fuck-off date is about a year out — around ${calendarYear}`
      : `Your fuck-off date is about ${n} years out — around ${calendarYear}`,
  /** The arrived arm (wall time has caught up to a saved date): a statement of the plan's
   *  own calendar, never a fresh "stop now" verdict — the recompute's word carries that.
   *  Unreachable live today (every vault is same-day); pinned for the day it isn't. */
  dateInYearsPast: (calendarYear: number): string =>
    `Your plan penciled the fuck-off date around ${calendarYear} — by the calendar, that’s about now`,
  /** The floor line's ANCHORED arm (ultramode 2026-07-09 — the hero and the floor share one
   *  screen, so they must share one time base): count re-derived from TODAY, calendar label
   *  wall-time-stable, the same odds + window-edge hedge as the un-anchored line. */
  dateFloorCoveredAnchored: (n: number, calendarYear: number, oddsText: string, unconfirmed: boolean): string => {
    const when =
      n === 1
        ? `The essentials alone are covered about a year out — around ${calendarYear}`
        : `The essentials alone are covered about ${n} years out — around ${calendarYear}`
    const edge = unconfirmed ? ' That sits at the edge of what this window can confirm.' : ''
    return `${when} — ${oddsText}.${edge}`
  },
  /** The floor's arrived arm (mirrors dateInYearsPast): the essentials date has come around
   *  by the calendar — state the plan's own year, never a fresh verdict. */
  dateFloorCoveredPast: (calendarYear: number, oddsText: string, unconfirmed: boolean): string => {
    const edge = unconfirmed ? ' That sits at the edge of what this window can confirm.' : ''
    return `The essentials alone were penciled as covered around ${calendarYear} — by the calendar, that’s about now — ${oddsText}.${edge}`
  },
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
