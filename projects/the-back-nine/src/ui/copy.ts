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
  // The refused tap's reason (2026-09-03): the apply gate holds while a save is landing, the
  // ceremony is between commit and backup, or typed work is unsaved (the leave-page guard). One
  // line true on all three arms — "save first" is the remedy for each.
  updateHeld: 'Not just yet — save what you’re working on first. The update can wait.',
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
    'Everything — housing, food, fun, and the medical costs you pay out of pocket. Leave out the Medicare premiums the tool prices itself: Part B, its income surcharge, and any Part D, Medigap, or Medicare Advantage premium — the tool handles those separately and adds them on top itself. Part A is the exception: almost nobody pays a premium for it, but if you do, keep that premium inside this figure — the tool doesn’t price it. Leave out federal income tax: the tool works that out from your withdrawals itself. State income tax isn’t priced yet — if your state taxes retirement income, keep that bill inside this figure so it still counts. The whole household, not just the bills that feel like retirement.',
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
    'Everything — housing, food, fun, and the medical costs you pay out of pocket. Leave out the Medicare premiums the tool prices itself: Part B, its income surcharge, and any Part D, Medigap, or Medicare Advantage premium — the tool handles those separately and adds them on top itself. Part A is the exception: almost nobody pays a premium for it, but if you do, keep that premium inside this figure — the tool doesn’t price it. Leave out federal income tax: the tool works that out from your withdrawals itself. State income tax is priced by the tool too — leave it out of this figure, the same as the federal one. The whole household, not just the bills that feel like retirement.',
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
  // The EMPTY-sheet block (Card 9, cold-read panel 2026-08-01 — 7/7 lenses): with no line typed
  // and no budget governing there is nothing to commit, so the primary SPEAKS instead of falling
  // through to a silent close. Deliberately NOT budgetApplyBlocked — "a line needs attention"
  // names a line that does not exist, which is the calm-but-wrong sin one level down.
  budgetApplyEmpty:
    'There are no lines yet, so there is nothing to use — add a line, or Cancel to keep the single figure.',
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
  // --- the employer-coverage premise (the mixed-household pre-65 gap) ---
  // Asked ONLY when someone is still working and someone else has already stopped before 65
  // (`anyRetiredPre65WhileAnotherWorks`). Until this question existed the tool ASSUMED the
  // "covers you both" answer for every such household — pricing $0 premiums and $0 out-of-pocket
  // for the retired one across the whole working window, which pulls the date EARLIER.
  // No names: `copy.ts` holds static strings, and "the one who has stopped working" is already
  // the household's own frame. NOT "marketplace"/"ACA"/"exchange" on the question face — the
  // reader is a spouse with no finance background, and the plain contrast (a plan at work vs
  // buying your own) is the whole distinction the engine turns on.
  qEmployerCoverageHeading: 'Coverage while one of you keeps working',
  employerCoverageLegend: 'Coverage for the one who has stopped working',
  employerCoverageCovered: 'Covered by the other one’s plan at work',
  employerCoverageOwn: 'Buying their own coverage',
  employerCoverageHelp:
    'While one of you is still working, the tool counts no health costs for the one who has already stopped — which only holds if a plan at work covers them both.',
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
  // A leg that is not a plain 0–100 number (a typed "1e2", a minus, 150) — named as ITS
  // OWN fault, never as the sum's (the sibling range lines above it are the voice).
  errClassifierNumber: 'Each of these is a number from 0 to 100.',
  // The specific "still needed to add" lines — the account editor's twin of the
  // errIncome*Required family below: a blocked Add always names what's missing in plain
  // text (WCAG 3.3.1, never a silent dead button). Until 2026-09-03 this editor's Add was
  // a silent no-op on a missing kind or balance.
  errAccountKindRequired: 'Still need the kind of account.',
  errAccountValueRequired: 'Still need the balance today.',
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
  // The UNREPRESENTABLE arm. Written from the PREDICATE, not from either poster-child household
  // (insight 101): its whole extension is "you answered, and this version of the tool has no way
  // to carry that answer" — true of the two-HSA household and of the household buying its own
  // pre-65 coverage alongside a working spouse alike. It must NOT borrow `answerStillNeeded`'s
  // frame: telling a reader who already answered that the answer is "still needed", under a line
  // promising the tool prices what you enter, invites a retry that cannot succeed. The closing
  // sentence exists to STOP that retry — it says the ceiling is ours, not their entry's.
  // THE LEAD, when everything blocking the answer is unrepresentable. `answerIncomplete`
  // ("Your answer takes shape as you go") is a KEEP-GOING promise, and over a permanent refusal
  // it is the calm-but-wrong sin in one line: a reader who skims the bold lead keeps entering
  // data waiting for an answer that will never arrive. Caught on the rendered frame at
  // 1536×791 with the whole suite green — no assertion could have caught it, because every
  // string was individually true.
  // Route-NEUTRAL by necessity (insight 101): this lead's extension covers the two-HSA SPINE
  // household as well as the date-route one, so it can never say "your date".
  answerWithheldLead: 'We can’t answer this one honestly, so we won’t guess at it.',
  answerCannotPrice: 'Outside what this version can price:',
  answerCannotPriceTail:
    'This is a limit of the tool, not something missing from your answers — there is nothing here for you to add.',
  // The two unrepresentable fact names. Each has to read as the object of `answerCannotPrice`.
  employerCoverageUnpriced: 'Coverage bought on your own while the other one still works',
  kindHsaBothSpouses: 'Two HSAs, one for each of you',
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
  //
  // ⚑ U17 §S6 / council 2026-07-30 — Q3 OVERTURNED, AND THIS STRING IS WHY. Q3 justified the single
  // FLOOR-crowned band on the grounds that this note would ensure "the range and the hero claim can
  // never silently disagree." It could not: it named a DATE and never a SPENDING LEVEL, so a reader
  // on `?seed=datesplit` bound a rising median and an $8M plume to their FULL life while the picture
  // priced the ESSENTIALS one (S6 Cards 1+2, chair-verified BLOCKERS — the note's own promise,
  // undischarged; insight 100). The date half was never the load-bearing fact anyway: the x-axis
  // already carries a labelled "Essentials date" marker (`bandClockWorkStopsSplitLabel`), so the
  // spending level is the ONE thing no other channel states.
  //
  // THIS IS LAYER 1 OF 3 AND DELIBERATELY THE WORDS-ONLY HALF. The council's full ruling moves this
  // to a TITLE above the figure carrying the first-year DOLLARS, re-keys the fan to the LIFESTYLE
  // crown, and overlays the essentials median at that one offset. The dollars are NOT shipped here
  // on purpose: the naive line-sum is a known trap (OOP medical is netted — the 2026-07-02 council's
  // build-gate 1: `target = max(0, S−M)`, and compileBudget re-injects M), so a figure typed here in
  // haste is the calm-but-wrong sin in the surface built to cure it. Words fix the falsehood today;
  // the sizable gap rides the full unit with its planted-fail.
  bandPricesEssentialsNote: 'This range prices your essentials only, not your full budget.',
  /** THE LIFESTYLE-KEYED TWIN (council 2026-07-30 — the FLIP). When the band rides the full-lifestyle
   *  crown the picture and the headline finally price the SAME world, so this sentence AFFIRMS the
   *  agreement instead of warning about a gap. It exists because silence would be worse than either:
   *  a reader who met the essentials warning on one household and NOTHING on the next cannot tell
   *  whether the second picture is the full budget or just an unlabelled one. Every band says whose
   *  world it draws — that universality IS the council's naming layer.
   *  Deliberately does NOT re-state the date; the x-axis marker already names it, and one fact per
   *  sentence is the copy law on a load-bearing figure. */
  bandPricesFullBudgetNote: 'This range prices your full budget — the same life the date above is measured against.',
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
  // fade); kept gentle + factual. WORDING resolved 2026-06-28 (council + N=1 cold-read): names the honest WHY (sample too thin to quote a range, NOT "you're broke"), catastrophe-gated via isMortalityKey. LENGTH-FREE since 2026-09-05 (the chart text layer): the readout is HTML — `.ct-readout` hugs its content (`width: max-content`) under a `max-width` ceiling and `.ct-readout__note` wraps (`white-space: normal`), all in src/viz/chartText.css, so a longer clause RE-FLOWS instead of clipping. The svg-era READOUT_W fit gate retired with it; the real-browser chart-text gate (e2e/chart-text.spec.ts) now measures every readout LINE inside the plot at every lattice column instead.
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
  // U17 §S2.5 — on a SPLIT reading the band follows the essentials-covered track while the hero
  // speaks the lifestyle date; the marker itself names WHICH date it marks, so the fan can never
  // silently borrow the headline's date (the corroborated "fan carries only the essentials date
  // while the hero speaks 2032" facet — five readers).
  bandClockWorkStopsSplitLabel: 'Essentials date',
  // U17 §S2 — the aged band's re-confirm control (the RENDERED half of the premise's promise —
  // insight 100: a copy string that promises an affordance is a UI contract). Routes to the
  // guided re-walk (values pre-filled).
  bandPremiseReconfirmCta: 'Re-confirm your numbers',
  // The AGED-vault year-0 endpoint (U13 follow-up — caught live on the first `?vault=datestale`
  // walk, 2026-07-10): a re-opened old plan's fan starts where the PLAN does, not today, and
  // calling that column "Today" put two time bases on one screen (the exact class the U13
  // ultramode fixed for the hero + floor lines). On an aged plan the year-0 endpoint renames
  // to this label (the BUILD-era ages beneath it) and the REAL "Today" marker moves to
  // x = years-since-built, wearing the household's CURRENT ages.
  //
  // IT NAMES THE BUILD, NOT THE SAVE (U17 §S0.2, council wf_f4ced3c8-2f6). The old wording —
  // 'Your save' / "When you saved this" — attributed that column to `savedAt`, but the column is
  // the plan's own `startCalendarYear`: the BUILD year, written once and untouched by every
  // re-save. On a RE-SAVER (built last year, saved five minutes ago) the old label was flatly
  // false, and it contradicted the fresh "Saved to this device" badge on the same screen. The
  // year itself rides `slots.bandClockBuiltDesc` (the a11y sentence) — the short axis word stays
  // short so it can never crowd the wall-Today marker beside it.
  bandClockBuiltLabel: 'Plan built',
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
  // U17 §S1: the start field asks for the CALENDAR YEAR — the old "how many years from now"
  // wore wall-time words over a plan-time value, so a returning user's "start in 2 years" could
  // write a plan year already gone. The commit converts year → offset against the plan's build
  // year (rothConversion stays sim-year-0-indexed on disk — no persisted re-base, hawk veto).
  leverRothStartLabel: 'Starting in which year',
  leverRothStartHelp: 'The calendar year the conversions begin — this year or later.',
  leverRothYearsLabel: 'For how many years',
  leverRothApply: 'Add this to my plan',
  leverRothRemove: 'Take the conversion back out',
  leverRothClosedNothing:
    'There’s nothing in a pre-tax account to convert, so this what-if doesn’t apply to you.',
  leverPreviewPending: 'Working out both futures…',
  leverPreviewError:
    'That comparison didn’t come together. Adjust a field — or close and reopen — to try again.',
  /* U17 §S6 — THE REFUSAL USED TO DENY A DATE THE SAME SCREEN PLOTS, IN A TERM THE PRODUCT NEVER
   * USES. It read: "This comparison anchors to your work-optional date, so it needs one on the
   * board first." Cold-read live on `?seed=datemixed` (S6 Card 5, re-driven 2026-07-30 before this
   * reword — a source read had cleared this string once already and was wrong):
   *   - the landing headline states, in the product's OWN words, "No fuck-off date within the next
   *     10 years — with what you've entered so far"; the refusal then re-asks the answered question
   *     under a NEW NAME. `grep -c "work-optional date"` over the rendered landing copy = 0 — the
   *     reader has never met the term. The product says FUCK-OFF DATE (`dateRegionLabel`).
   *   - "it needs one on the board first" is FALSE ON ITS FACE here: the board carries a plotted,
   *     labelled "Essentials date" (aria: "…ages 65 and 66") and the prose dates it — "The
   *     essentials alone are covered about 7 years out — around 2033". A date IS on the board; the
   *     one this comparison wants is a different date, and the old sentence never said which.
   * The replacement names the product's own date, and states the true absence rather than an empty
   * board. It is also SHORTER than what it replaces (131 vs 137 chars) — deliberate: the same
   * batch's panel-raw list flagged this string clipping mid-sentence at the phone sheet edge.
   * THE KEY NAME MUST NOT CHANGE. `leverPreviewNoDate` leads with `lever`, so it rides the two
   * universal gates only. The instinctive rename once the fix is "say fuck-off date" — anything
   * carrying `fuckoff`/`workoptional` — trips isVerdictKey's SUBSTRING net (copyGuard.ts:72) and
   * silently promotes this line into free-numeral/superlative scope. */
  leverPreviewNoDate:
    'This comparison anchors to your fuck-off date, and this plan doesn’t have one yet. Applying a change still updates the answer above.',
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
  // reads this note most (the Medicare-priced hero's own households). The composer's pre-65
  // axis is now THREE-state (O16 council 2026-07-17, wf_fd7f75cb-916 — hawk veto honored):
  // all-65+ (`medicareOnlyPriced`, draft ages; an unknown age conservatively KEEPS the clause)
  // drops it; an ACA-priced run (`acaPricedForRun` — the producer's-output read, insight 081)
  // swaps it for the NARROWED residual below, because the engine prices the conversion→MAGI→
  // discount coupling in both preview arms, making the blanket "not counted" claim FALSE for
  // exactly the convert-in-the-gap-years household; only a pre-65 run that prices NO ACA keeps
  // the original clause, where it is true. The single-item variant says "it", never "each" —
  // grammar honesty; "could" carries require-hedge on all six.
  rothOmissionsNoteAll65:
    'Not counted here: state income tax and the net-investment-income tax — each could move this picture.',
  rothOmissionsNoteStatePricedAll65:
    'Not counted here: the net-investment-income tax — it could move this picture.',
  // O16 (2026-07-17) — the ACA-priced pre-65 variants: the discount coupling is IN the numbers,
  // so the residual narrows to what genuinely is not: plan cost-sharing (the health sheet's own
  // words, rule 36 — converting past an income line can also cost cost-sharing help the tool
  // never models, the one-way-optimistic omission the hawk's veto protected). The trailing
  // affirmation names the mechanism (E13: mechanism-naming lands) so the reader who was told
  // "not counted" for a year is actively corrected — affirm-with-residual, the house pattern.
  rothOmissionsNoteAcaPriced:
    'Not counted here: state income tax, the net-investment-income tax, and differences in plan cost-sharing — each could move this picture. The income-based discount itself is already in these numbers, including what a conversion does to it.',
  rothOmissionsNoteStatePricedAcaPriced:
    'Not counted here: the net-investment-income tax and differences in plan cost-sharing — each could move this picture. The income-based discount itself is already in these numbers, including what a conversion does to it.',
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
  // ⚠️ "the benchmark premium itself" WAS IN BOTH LISTS AND WAS FALSE — struck 2026-08-03.
  // The benchmark (SLCSP) is not merely counted, it is the ANCHOR of the whole credit:
  // `intakeMap.ts:582` builds `slcsp` into the overlay params, `taxOverlay.ts:264` calls it "the
  // §36B PTC basis", and `slidingScalePtc` (healthOverlay.ts:213-223) computes
  // `max(0, slcsp − applicable% × MAGI)` FROM it. Telling the reader the tool ignores the one
  // figure the discount is calculated from is the same false-negation shape O16 fixed on the Roth
  // strings (`rothOmissionsNoteAcaPriced` above) — a "not counted" claim about something that is.
  //
  // STRUCK, NOT REPLACED WITH AN AFFIRMATION, and that is deliberate. The O16 house pattern is
  // affirm-with-residual, but these two strings are gated on `statePriced` ALONE
  // (`stateTaxDisclosure.ts:100`) — they carry no ACA-priced axis, so the identical sentence also
  // ships to a Medicare-only household (`intakeMap.ts:587-590`) that has no benchmark at all.
  // "The benchmark is already in these numbers" would be a NEW false claim for that population.
  // Affirming here needs the three-state gate the Roth strings have; until then, silence is true.
  //
  // What is genuinely unmodelled about the benchmark is the COST TREND (`escalateQuote` climbs with
  // the age-rating curve and nothing else) — a separate, cliff-scoped disclosure that belongs on the
  // Roth strings, NOT smuggled in here as a vaguer version of a claim that was already wrong.
  controlHealthOmissionsNote:
    'Not counted here: state income tax, the net-investment-income tax, differences in plan cost-sharing, state-level subsidy top-ups, and a surviving spouse’s chance to have the Medicare surcharge rechecked sooner — each could move this picture.',
  // S5.2 — the state-priced twin (the state-tax unit), gated INDEPENDENTLY of the other homes
  // (insight 078 — different population, own chrome): the state-tax item DROPS for a priced
  // household. Everything else (NIIT, cost-sharing, top-ups, the survivor recheck) stays.
  // 'control' prefix ⇒ require-hedge-swept: keeps "could move this picture".
  controlHealthOmissionsNoteStatePriced:
    'Not counted here: the net-investment-income tax, differences in plan cost-sharing, state-level subsidy top-ups, and a surviving spouse’s chance to have the Medicare surcharge rechecked sooner — each could move this picture.',
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
  // unit). The trend sourcing unit (2026-07-19, council wf_c673339e-257; the Part D pass same
  // day) NARROWED the still-flat clause TWICE: Part B + its surcharge piece trend off V.E2,
  // then the drug-plan surcharge piece trends off V.E4 per tier — so the residual's referent
  // shrank to the genuinely-still-flat set (the extra-coverage premiums alone; the >2035
  // Part D real-hold lives in the constant note + the detail-door era), a SWAP never an ADD.
  // The on-typical household additionally gets a per-person
  // bi-directional sentence (slots.medicareExtrasTypical*) appended INSIDE the residual
  // paragraph — same block, no new frame row (the one-frame fit law's tallest composite).
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
  // bill stays "a real yearly bill", never a rounding hedge. Final sentence swapped 2026-07-19
  // (the trend unit — see the Tail's note; the drift-pin keeps monolith ≡ Lead…Tail).
  verdictMedicareResidual:
    'Those are the pieces this tool adds by itself. The rare Part A premium belongs in the spending you gave us. State income tax isn’t priced yet. In a taxing state, that’s a real yearly bill. The extra-coverage premiums are held flat in today’s dollars, so their true cost could run higher than shown.',
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
    'Those are the pieces this tool adds by itself. The rare Part A premium belongs in the spending you gave us.',
  // The Tail now opens with a period graft (was an em-dash): every priced affirmation ends
  // mid-clause ("…reflected in these numbers" / "…no state bill on your withdrawals"), so the
  // Tail closes that sentence and starts its own — one fact per sentence on both compositions.
  // Swapped 2026-07-19, TWICE (the trend unit, then its Part D sourcing pass): the old
  // "Premiums are held flat" covered EVERY tool-added premium — false once Part B + its
  // surcharge piece trended; the interim "…and the drug-plan piece of the income surcharge"
  // died the same day when Table V.E4 sourced the Part D path (both surcharge pieces now
  // priced through 2035; the >2035 Part D real-hold is the constant note's + detail-door
  // era's residual). The referent is now ONLY the extra-coverage premiums — the genuinely
  // still-flat set; the not-rosier direction clause is unchanged. The interim sentence also
  // wrapped an extra Linux-metrics line on the budget composite and pushed the R13 disclaimer
  // 1px past the fold on CI ALONE (the burned/055 class) — this shorter truth restores the
  // one-line class the fold law measured.
  verdictResidualTail:
    '. The extra-coverage premiums are held flat in today’s dollars, so their true cost could run higher than shown.',
  verdictResidualStateNC: 'Your North Carolina state income tax is reflected in these numbers',
  verdictResidualStatePA:
    'Your Pennsylvania state income tax is reflected in these numbers, usually a small piece since Pennsylvania leaves most retirement income untaxed',
  verdictResidualStateFL: 'Florida has no state income tax, so there’s no state bill on your withdrawals',
  rothMedicareResidualNote:
    // Swapped 2026-07-19, twice (the trend unit, then its Part D sourcing pass): the original
    // blamed "premiums held flat" for a crossing looking "a shade easier" — true pre-flip,
    // false after (the Part B surcharge trends); the interim narrowed the flat claim to the
    // drug-plan piece — false the same day once Table V.E4 sourced the Part D path per tier
    // (the 2030 §11201 jump now PRICED). What remains a modeling choice in the conversion
    // channel: the projections end at 2035, and the drug-plan piece HOLDS its last level
    // beyond that edge — a far-out crossing is the one direction still flattered. "a shade
    // easier" + the hedge ("could") keep their vocabulary (rule 36); "A modeling choice:"
    // keeps the count-free article (O16 D-1). CHAIR FIX (the 2026-07-19 pre-walk, wf_afe262c4-ca2):
    // the pair used TWO metaphors for one event — "trip" then "a crossing" — and nine lenses
    // independently stumbled on the second (the refuters killed the "no referent" claim on the
    // opening clause, but the two-metaphor texture survived as the one standing nit); "its/the
    // surcharge's drug-plan piece" now binds the decomposition possessively, killing the
    // cross-surface polysemy with the landing's "a drug plan" (an extra-coverage PREMIUM —
    // the O14 one-lexeme-two-referents class). ONE verb, one owner, same hedges.
    'The income surcharge a conversion can trip two years later is now part of these numbers, priced to climb the way Medicare’s own projections read — its drug-plan piece included. A modeling choice: past those projections’ 2035 edge the surcharge’s drug-plan piece holds at its last level, so a conversion that trips it far in the future could look a shade easier here than in real life.',

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
   *  corpus rule 37, the 2026-07-11 residual family's exact crack).
   *  Reworded O16 Fork A (council 2026-07-17, wf_fd7f75cb-916): the old tail "…these numbers
   *  leave out" was engine-proven FALSE for a COMPLIANT household — spendHelp (rendered on this
   *  SAME sheet) says "keep that bill inside this figure so it still counts", and a kept-inside
   *  bill flows through annualSpendingReal into every simulated year's outflow. Three unobservable
   *  populations read this note (kept-inside / legacy-stripped / no-bill), so the honest clause
   *  conditions inclusion on the reader's OWN action and asserts neither "in" nor "out" flatly;
   *  "prices" joins the family's frame (the O14 counts/counted polysemy stays dead). The rule-37
   *  real-bill rider survives. */
  assumptionStateUnsetNote:
    'Not set yet — the plan prices no state income tax until you pick one. If your state taxes retirement income, that’s a real yearly bill: it’s in these numbers only if you kept it inside your spending figure.',
  /** The BUDGET-GOVERNED twin (the O16 pre-walk's one surviving finding, chair fix 2026-07-17):
   *  on the governed face the spend row reads "all in — set by your budget" (a completeness
   *  claim) and the OOP row's same construction is legitimately auto-satisfied — together they
   *  primed a budget reader to self-grade the base note's conditional as "covered" (the rosier
   *  direction) when the budget flow offers NO tax category and never guided the bill inside.
   *  This twin names the BUDGET mechanism (rule 37 — who-adds-what, never the reader's memory)
   *  and its tail contradicts the "all in" assumption in the conservative direction. Shares the
   *  base note's prefix verbatim (the spendHelp-twins pin idiom — copyGuard holds it). */
  assumptionStateUnsetNoteBudget:
    'Not set yet — the plan prices no state income tax until you pick one. If your state taxes retirement income, that’s a real yearly bill: it’s in these numbers only if you gave it a budget line yourself — most budgets don’t.',
  // The ONE real R7-editable methodology knob (the F1/F3 ruling). Its UNSAFE direction is
  // disclosed in the help — too LOW understates the survivor's need (methodology.ts).
  assumptionSurvivorRatioLabel: 'Spending if one of you is on your own, as a share of today’s',
  assumptionSurvivorRatioHelp:
    'Research on surviving spouses lands around three-quarters of a couple’s spending. Set it lower and the later years can read easier than they may prove.',
  errSurvivorRatioBlank:
    'Survivor spending needs a share to run on — three-quarters is the researched default.',
  // The assumed heir bracket — leave-more ONLY (it ranks nothing under pay-less-tax). The help
  // discloses the UNSAFE DIRECTION the way survivor-ratio's does, because this knob can INVERT the
  // recommendation rather than merely shade it: the bequest is scored
  // `pretax * (1 - heirBracket)` while a Roth passes whole, so the value of converting scales
  // DIRECTLY with this number — set it too low and the tool under-rates the very move it exists to
  // rank. No jargon on the face: not "IRD", not "§1014", not "marginal rate".
  assumptionHeirBracketLabel: 'The tax bracket your heirs are likely in when they inherit',
  assumptionHeirBracketHelp:
    'Money left in a pre-tax account is taxed at your heirs’ rate when they inherit it; a Roth is not. Set this lower and converting reads as less worthwhile than it may prove.',
  assumptionPeriodLegend: 'Your spending figure reads as…',
  // The panel's period toggle RE-LABELS the committed figure; it never re-bases it (the
  // intake segment re-bases mid-entry, where the typed digits are the truth — here the
  // canonical annual is the truth, and a silent 12× re-base would be the cardinal sin).
  //
  // ⚠️ THE TOGGLE SETS THE ENTRY UNIT TOO, AND THE OLD SENTENCE HID IT (fixed 2026-08-03).
  // It read "switching this never changes the amount" — but the SHOWN figure jumps exactly 12×
  // (`spendDisplayed`, AssumptionPanel.tsx:295-300), so the reader watches the number move while
  // being told nothing moved. The natural repair is to retype the old digits, and the panel's own
  // commit (AssumptionPanel.tsx:500-510, the `entered * 12` arm at :507) then multiplies by 12
  // under 'month' — so a household "correcting" 78,000 back to 6,500 under 'Each year' commits a
  // $6,500/yr plan. Nothing catches it: PANEL_PROVENANCE (AssumptionPanel.tsx:230) hard-disarms
  // `spend-period-unconfirmed` (sanity.ts:329-352, the disarm read at :340) on this surface, and
  // 6,500 is under SPEND_AMBIGUOUS_MIN (sanity.ts:74) regardless — so the rule could not have
  // caught it even armed. The replacement must therefore say BOTH halves — the money is
  // unchanged AND the next figure you enter is read in the unit you just picked. A draft that said
  // only "the same money either way" was REJECTED for exactly that omission.
  //
  // THE THIRD SENTENCE IS LOAD-BEARING; DO NOT COMPRESS IT BACK. A second draft ended "…and
  // anything you enter next is read the same way" — correct, but "the same way" is an ANAPHOR the
  // reader must resolve against the previous clause, and Briggsy's cold read stopped to ask what it
  // pointed at (2026-08-03). That stumble IS the defect class this whole entry exists to close, so
  // the unit is now named OUTRIGHT and quotes the toggle's own visible label (`periodMonth`) rather
  // than gesturing at it. Three sentences under a control is chattier than house style on purpose:
  // terseness is what produced the original trap.
  // No spatial referent ("the figure below") — U12 dropped it because this control sits ABOVE the
  // spend field in the panel and BELOW it in intake (see `periodConfirmPrompt`).
  assumptionPeriodHelp:
    'This sets the unit, not the money. Your plan keeps running on the same yearly spending — the figure here just shows as one month’s worth or a full year’s. With “Each month” showing, a number you type is read as dollars a month.',
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
  //
  // U17 §S4 — `stalenessHealthcare` (ONE line off the OR-collapse of all seven healthcare
  // clocks) is SPLIT into the two families, each behind its own exposure read. The collapsed
  // line told an all-65+ household "Health-coverage rules have been updated" on a moved
  // acaStatus stamp — they price ZERO ACA (the Medicare-only overlay branch ships no quote
  // pair), so the sentence was false for them: insight 101 inverted. Insight 086 binds the
  // rename — both renderers (`reentryChrome.ts`, and its assertion in `reentry.test.tsx`) are
  // re-pointed in this same commit.
  //
  // The ACA family (`aca-status`, `fpl-guideline`, and the ACA half of `coverage-year`): the
  // marketplace rulebook. Named ONLY where the run priced a marketplace year.
  stalenessAca:
    'Marketplace health-plan rules have been updated since your save — this reading uses today’s.',
  // The Medicare family (`part-b`, `part-b-trend`, `extras-typical`, `irmaa-freeze`, and the
  // Medicare half of `coverage-year`). These are COST FIGURES, not rules — the premium dollar,
  // the cost-growth table, the typical Part D/Medigap figure, the IRMAA surcharge ladder — so
  // the line says "cost figures", never "rules". No direction is claimed: the answer itself
  // carries the verdict.
  stalenessMedicare:
    'Medicare cost figures have been updated since your save — this reading uses today’s.',
  // U17 §S4 — narrowed to the CONTRIBUTION clock alone. The fund-data (blend) clause moved out
  // to the nameless aggregate below: `BLEND_SNAPSHOT_AS_OF` is one MAX date over the whole
  // ticker table, so it fires for a household holding none of the re-dated funds, and naming
  // "the fund data we read your accounts against" to a household reading manual blends is the
  // same falsehood the healthcare split kills. (The Caddie card #2 fix that purged "fund
  // snapshots" stands — the jargon word never returns.) `stalenessBlendSpine`, the all-retired
  // sibling of that clause, is REMOVED with it: the blend clock no longer names itself on
  // either route, so a household with no date is now covered by the aggregate line.
  stalenessDate:
    'The retirement-account contribution limits behind your date have been updated since your save — this reading uses today’s.',
  // THE AGGREGATE (U17 §S4, bucket 3) — the ONE nameless sentence for every clock that fired
  // where no producer read can attribute it to THIS household. Its members after the F-pass
  // correction: the BLEND snapshot for a household that DOES read the ticker table (the stamp is
  // one MAX `asOf` across all rows, so even there it cannot say WHICH fund moved), plus the
  // unbuildable-draft residual. NOT the vintage markers: `coverage-year` and `irmaa-freeze` date
  // tables the run genuinely consumes, so they name their family — see staleness.ts's header.
  //
  // IT MUST BE TRUE OF EVERY MEMBER OF THAT SET, so it may say ONLY that a reference table the
  // app reads has a newer version than the save was figured under. It names no rulebook; it
  // never claims the household's answer moved; and it deliberately does NOT carry the
  // "this reading uses today's" clause the named lines carry — that clause invites the
  // inference this line exists to refuse. It stays OUT of the "rules changed" register
  // (`unattributed` feeds `anyStale` only), which is why the second sentence says plainly what
  // we cannot tell. Silencing this set instead would open a silent-stale hole — the opposite sin.
  // NUMBER-NEUTRAL ON PURPOSE (a reviewer's catch, 2026-07-25): after the exposure split pulled
  // `coverage-year`/`irmaa-freeze` out to their families and the inert-household gate silenced the
  // manual-blend case, the only production-reachable member of this bucket is the blend snapshot
  // ALONE. "Some of the reference tables … any of them" is a BREADTH claim, and it was false for
  // every household that could actually hear it — a plural about a singleton, which no copyGuard
  // arm can see. The wording below is true whether the bucket holds one member or several, so it
  // stays honest as the set changes rather than needing a re-count each time.
  stalenessReferenceTables:
    'Reference data this tool reads has been updated since your save. We can’t tell from here whether it touches your own numbers.',
  // Act-4 · U16 §S1 — the SOLVE channel's invalidation card (the `SolveAnswer` stale/re-solve arm,
  // machine label 'inputs-changed'). A draft edit changed a ranking-affecting input since the last
  // strategy read (source-bound to solverRunFingerprint), so that read no longer describes the current
  // household — the store demotes it, never rendering a stale rec as current and never auto-re-solving.
  // Re-solving is INVITED (R11), like the beat itself; this is a calm status card, not a nag.
  //
  // F-B (U16 chair fix, cold-read panel): the stale note becomes ONE coherent card — a calm HEADING,
  // a BODY carrying the honest truths, and the re-open CONTROL rendered INSIDE the card (recommendation.tsx;
  // its label pulled at the render). THREE truths the wording holds: (1) the ANSWER above is current —
  // only the strategy read went stale (the edit recomputes the headline; the solve channel does NOT
  // auto-re-solve); (2) TRUE whether the predecessor was a recommendation OR the HELD card — so NEVER
  // "since we found this" (nothing is "found" on a hold); (3) NO blame register ("your numbers have
  // changed" is neutral, never a fault). DISTINCT from the save-vintage staleness clocks above — those
  // name a rulebook that moved under a SAVED answer; this names the user's OWN in-session edits moving
  // out from under an unsaved strategy read. `recommend*` = verdict-scoped (superlative/free-numeral
  // gated), no figure to hedge — the recommendNoPretaxNote precedent.
  recommendStaleHeading: 'This strategy read is out of date',
  recommendStaleBody:
    'Some of your numbers have changed. Your answer above already reflects them — this strategy read doesn’t yet.',
  // The in-card re-open control (F-B): the promise and its action share ONE home. Names the outcome the
  // button leads to (the goal choice precedes the solve, the invite/re-pick precedent), never an
  // imperative — "see" is not a directive verb, so no copyGuard trip.
  recommendStaleReopenCta: 'See the current strategy',

  // --- Act-4 · U17 §S5 — the save GESTURE (`recommendSave*`) + the saved-record CARD
  //     (`recommendRecord*`) ---
  // SCOPE: both families inherit VERDICT scope from `VERDICT_KEY_PREFIXES`' existing 'recommend'
  // entry (copyGuard.ts:63-65) — no gate-source edit — and correctly stay OUTSIDE control scope
  // (the record carries enums, never a figure). Every line here is DIGIT-FREE: the free-numeral
  // gate is /\d/, so "two passphrases" is spelled out and the mint year rides
  // `slots.recommendRecordSavedIn`.
  //
  // `recommendSaveSavedBadge` IS THE ONLY KEY IN EITHER FAMILY PERMITTED TO CLAIM A COMPLETED SAVE.
  // Every refusal below claims NOTHING about a save, and that is a CORRECTION, not a style call:
  // the gesture returns before `appModel.update` and before the write, so on BOTH routes nothing
  // reached the device. The obligation as originally filed — "we saved your plan, we could not save
  // the recommendation" — was drafted for a save-proceeds-then-drops-the-atom flow that
  // scenarioCodec.ts:660-664 instructs S5 to make UNREACHABLE. Shipping that sentence would have
  // been the cardinal sin pointed the other way: a save reported that never happened.
  recommendSaveCta: 'Keep this strategy read',
  // R1 AND R2, both named BEFORE the tap. The no-vault route escalates a "keep this" tap into vault
  // setup, and the write is whole-plan either way (`session.save()` commits the entire scenario) —
  // so the CONTROL says both, rather than letting a confirmation explain what already happened.
  // Two sentences by design; step 14 measures the fold, and content is never trimmed to fit layout.
  recommendSaveHintCeremony:
    'This keeps everything you’ve entered, along with this strategy read. It also sets up your vault on this device — you’ll pick two passphrases and download a backup copy.',
  // R2 alone — the vault already exists, but the write is still the whole plan, not a note.
  recommendSaveHintUpdate: 'This keeps everything you’ve entered, along with this strategy read.',
  recommendSavePending: 'Keeping your plan and this strategy read…',
  recommendSaveSavedBadge: 'Saved to this device — your plan and this strategy read',
  // THE REFUSALS. None carries a retry control: the mint is deterministic, so a retry re-fails
  // identically, and an affordance that cannot succeed is the lying-remedy shape
  // (Result.tsx:364-372). Each says what did NOT happen, in the reader's frame.
  recommendSaveRefusalRecordInvalidHeading: 'This strategy read couldn’t be kept',
  recommendSaveRefusalRecordInvalidBody:
    'We couldn’t build a record of it, so nothing reached this device — your plan here is exactly as you left it. The answer above is still current.',
  recommendSaveRefusalWriteHeading: 'Nothing reached this device',
  recommendSaveRefusalWriteBody:
    'The write didn’t go through, so your plan here is exactly as you left it. The answer above is still current.',
  // The recovery-unlocked state: the passphrase wrap is not current, so no write can land at all.
  // Names the state and the way out — never a dead control with no explanation.
  recommendSaveRefusalRecoveryLockedHeading: 'This device is open with your recovery passphrase',
  recommendSaveRefusalRecoveryLockedBody:
    'Nothing new can be written here until you pick a new everyday passphrase. Once you have, this strategy read can go with your plan.',

  // THE CARD (R3 — minimal by ruling): that a saved read exists, how old it is, whether it still
  // holds, and the way back. The remembered grade/verdict enums stay PERSISTED BUT UNQUOTED — a
  // card that quotes a remembered figure as if it were current is precisely what the preserved
  // council dissent aims at, and leaving them out means the card can grow later with no schema
  // change.
  recommendRecordHeading: 'Your saved strategy read',
  // ⚠️ THE HOLDS LINE — REWORDED 2026-08-03, and nothing defended it before that. It read
  // "It still matches your plan as it stands today." Cold-read Card 8 graded that HARD-FLAG.
  //
  // WHAT IT IS ALLOWED TO CLAIM: conjunct 1 ONLY — fingerprint identity. The household's
  // ranking-affecting inputs hash the same as when the record was minted (`intakeMap.ts` builds the
  // params, `solveAnchor.ts` the candidate roster, `solverRunFingerprint.ts` serializes both).
  // That is the sole COMPUTED guarantee behind this face, so it is the only thing the sentence says.
  //
  // WHAT IT MUST NOT CLAIM, AND WHY THE OBVIOUS REWRITE IS BANNED: "Nothing has moved since then
  // that would change it" — and every universal-negative of that shape — is broader than the three
  // conjuncts can support, i.e. ROSIER than the sentence it would be replacing. The fingerprint
  // EXCLUDES constant vintages BY DESIGN (`savedRecommendation.ts` header), and `blendMoved` is
  // DELIBERATELY absent from `rulesMoved` (`staleness.ts` — a nameless re-base may not demote a
  // record). So a rulebook can move, params stay byte-identical, and this card would assert
  // "nothing has moved" in the same session that the re-entry gate says we cannot tell whether it
  // touched their numbers. Never write the universal negative here.
  //
  // NOR DOES IT CLAIM ANYONE EXECUTED ANYTHING. `drawdownPolicy` IS inside the fingerprint, so a
  // household that ACTS on a sequencing recommendation trips 'inputs-changed' and gets the
  // SUPERSEDED card. This face is therefore reachable only for a household whose sequencing has NOT
  // moved: taking the advice demotes the memory, ignoring it earns the reassurance. "Matches your
  // plan" invited exactly the inference that reassurance was about their PLAN OF ACTION. "The
  // numbers you've entered" cannot be read that way — it names the data, which is what was checked.
  //
  // ⚠️ NEVER DEFEND THIS LINE WITH `noChange`. `select.ts` keys `noChange` on the CONVENTIONAL
  // baseline's provenance, never on the entered `drawdownPolicy` — citing it here would attach a
  // true-sounding proof that is about a different comparison entirely.
  //
  // WIDTH IS GATE-ARBITRATED, NEVER GUESSED (the sibling's own law at `recommendRecordSuperseded`
  // below): 50 chars, one line, verified under `pnpm verify:fit` on the `rec` plant.
  recommendRecordHolds: 'It still lines up with the numbers you’ve entered.',
  // THE SUPERSEDED LEAD — the negative mirror of `recommendRecordHolds`, and it exists because the
  // superseded arm's cause clauses MAY BE EMPTY (`SavedRecordStanding`, recommendationSaveView.ts:237-242:
  // the fail-closed output of the broken-contract split, where the store demoted the record without
  // reporting a cause). Without a lead the card would draw a heading over nothing — a blank exactly
  // where the disclosure belongs — so this line is what the non-colour marker stands on with zero
  // clauses beneath it.
  //
  // ⚠️ THE VERB IS ABOUT THE ADVICE, NEVER ABOUT THE DISPLAY — and it must never become a showing-verb
  // again. This line shipped for a while as "We can no longer show this as current", which reads as a
  // claim about OUR RENDERING: the household infers the display is stale and the strategy still
  // stands. On `?vault=recold` every cause clause sits BELOW the 791px fold, so that sentence was the
  // only thing in frame — a reader still executing the saved conversions was told, in effect, to carry
  // on. That is the cardinal calm-but-wrong sin wearing a calm face (cold-read-log.md card 7,
  // HARD-FLAG/BLOCKER). Naming the STATE was the right instinct; naming the state of the SCREEN was
  // not.
  //
  // WHY "may … fit" AND NOT THE TIDY MIRROR. "It no longer matches your plan" is FALSE on the
  // 'inputs-unavailable' cause, which says the opposite — that we cannot line it up at all. The hedge
  // is therefore load-bearing rather than soft: this sentence must be true across FIVE arms, not four
  // — the four named causes plus the fail-CLOSED broken-contract arm (recommendationSaveView.ts:305-308),
  // where the card renders this line ALONE over an empty list. "May no longer fit" is honest on all
  // five, including the one where the honest content is our own uncertainty, and it claims no
  // knowledge the trichotomy does not have. It speaks the household's frame ("the two of you"), never
  // the mechanism's.
  //
  // LENGTH IS A CONSTRAINT HERE, and the constraint is ONE LINE — never a character count. MEASURED at
  // the real 1536×791 frame (`verify:fit`, both plants): this line's bottom sits at 774px with 17px of
  // frame left, and a second line costs ~27px. So ANY wrap puts the card's whole meaning below the
  // fold and re-creates the defect this wording fixes. `vertical-fit.spec.ts` asserts this line's own
  // bottom against the frame on BOTH plants — mutation-proven RED at 801px with a two-line variant.
  //
  // ⚠️ DO NOT RE-REJECT A CANDIDATE ON A GUESSED WIDTH. "It may no longer be the right read for the two
  // of you." (54 chars) was filed as being "one wrap from eating the fold slack"; measured, it wraps
  // not at all and lands on the SAME 774px. It lost on tone, not on pixels — the shipped line names the
  // consequence to the household rather than to the reading, which is the whole point of the fix. The
  // gate is the arbiter of width; prose estimates of it have been wrong here before.
  recommendRecordSuperseded: 'It may no longer fit the two of you.',
  // ONE clause per `SavedRecommendationSupersededCause`. Each names WHAT moved, in the reader's
  // frame, with no blame register — "your numbers have changed" is neutral, never a fault.
  recommendRecordSupersededInputs: 'Your numbers have changed since then.',
  recommendRecordSupersededUnavailable:
    'There isn’t enough in your plan right now to line it up against.',
  recommendRecordSupersededSolver: 'The way strategies are worked out has changed since then.',
  recommendRecordSupersededRules: 'The tax and health-cost rules have moved since then.',
  recommendRecordReopenCta: 'Work out the current strategy',
  // The cost, worded the way `recommendPendingLabel` does — a real duration in plain words, never a
  // spinner, a percentage, or a fabricated progress clock.
  recommendRecordReopenCost: 'This can take a few minutes.',
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
  // Act-4 · U16 §S2 — the ENTRY surfaces (the recommend-second's invited affordance, the GoalPicker,
  // the pending tell). All calm, plain-language, hedge-free-where-a-hedge-would-mush (a door label and
  // a status line carry no figure to hedge — the require-hedge scope must stay on the GRADE/figure keys
  // S3 adds, never a bare `recommend` sweep that would demand a modal on THESE two). No count-up, no ETA.
  //
  // The invited affordance — the recommend-second door in the doors region (R11: invited, never a nag;
  // R12: no imperative). A DOOR, calm-styled like its siblings; the goal choice precedes the solve.
  recommendInviteCta: 'See the recommended strategy',
  // Act-4 · U16 §S1/§Q5 (F3, REWORDED by the steer-seed increment 2026-07-23) — the pre-dispatch
  // `blocked{no-pretax}` calm steer. THE OLD LINE WAS FALSE ON EVERY REACHABLE HOUSEHOLD (insight
  // 100's class): it claimed "your savings are entered as one lump sum", but the intake's account
  // kinds are MANDATORY — a lump-sum entry cannot exist. The TRUE precondition both reachable arms
  // share (a split household with no pre-tax dollars; the degenerate no-accounts household) is that
  // there are no pre-tax (IRA/401k) dollars for a withdrawal-order/conversion strategy to work
  // with — so the note names THAT, in the household's own frame. A DECLARATIVE steer in the calm
  // stale-note voice — no imperative, no figure to hedge; rides `recommend*` = verdict-scoped
  // (superlative/free-numeral gated) but NOT control-swept (no forced modal on a terse steer),
  // exactly like recommendUnavailable.
  // ("401(k)" is deliberately absent — the verdict scope's free-numeral gate; "a pre-tax workplace
  // plan" is the numeral-free equivalent, and the re-entry read-back teaches the full roster.)
  // REWORDED same-day (review wf_6f89fe6f-35a P1, refuters 2-0): the first draft claimed "this plan
  // has none entered" — FALSE on the small-IRA arm (candidates.ts:323 rejects every rail-anchored
  // conversion amount above the post-RMD headroom, so a household with a $25k IRA below every rail
  // ALSO lands no-pretax). "needs more … than this plan has entered" is true on BOTH sub-arms (zero
  // entered, and entered-but-under-every-rail — extension-monotone, insight 101), and the steer's
  // promise ("with more…") is the one the self-heal genuinely fulfills.
  // TIGHTENED by the A/B walk's chair (wf_91a3fa9a-b2e): the three-line draft pushed the protected
  // R13 disclaimer 38px past the 1536×791 fold on the steer-note frame (the Sonnet copy-law seat's
  // survivor, confirmed against fold.json) — the shorter TRUE sentence is the layout fix (insight
  // 097's law), and naming "a withdrawal strategy" outright also cures the panel's unglossed-"order"
  // stumble (two spouse lenses).
  recommendNoPretaxNote:
    'A withdrawal strategy needs more pre-tax savings — a traditional IRA or a pre-tax workplace plan — than this plan has entered. With more in the picture, we can work one out.',
  // The `blocked{spine-unready}` sibling (the steer-seed increment): the strategy read FOLLOWS the
  // main answer, and on a facts-broken re-dispatch (a committed rec goes stale, a fact is cleared,
  // the stale card's re-open control survives) the old note blamed the ACCOUNTS — a false diagnosis.
  // This arm names the true dependency without re-diagnosing the missing fact (the answer's own
  // incomplete strip above already names it). Same calm declarative register.
  recommendSpineUnreadyNote:
    'This strategy read builds on the answer above. Once that answer is complete again, this can run.',
  // Act-4 · U16 §S4 — the goal RE-PICK door (the committed beat's "aim at something else"): the
  // un-saved hypothetical is freely re-aimable, and a re-pick VISIBLY re-solves (both futures
  // update). A calm door label, NOT an imperative advice verb ("aim" is not a directive verb, so it
  // never trips copyGuard) — `recommend*` = verdict-scoped, so no forced hedge mushes it.
  recommendRepickCta: 'Aim at a different goal',
  // The solve's pending tell — the shipped thinking-breathe family's plain-language label (burned/045
  // clear-after-announce owns the a11y side). Carries an HONEST duration phrase ("a few minutes" — TRUE
  // for the measured 90s–6min full-precision wait), so the calm sets the expectation rather than leave
  // the reader wondering if it stalled. Ends with the ellipsis glyph (loading-state convention); NO
  // spinner / % / count / ETA / countdown (a real duration in plain words reassures; a fabricated
  // progress clock would lie).
  recommendPendingLabel: 'Working out your strategy — this can take a few minutes…',
  // The GoalPicker (the Tier-2 goal that precedes the solve — RECOMMENDATION_GOALS, model.ts). A real
  // labelled-radio dialog; three-goals-each-a-gloss per the spec, live vocabulary = {leave-more,
  // pay-less-tax} today (live-bigger-now is deferred). Unset sentinel — no goal is pre-selected.
  goalPickerTitle: 'What should your plan aim for?',
  goalPickerIntro: 'With the basics covered, pick the one thing your plan should lean toward.',
  goalPickerConfirmCta: 'See the strategy',
  // The goal options — a plain label + a one-line noun-phrase gloss each (no imperative verb, no jargon).
  // `leave-more` = the after-tax-to-heirs bequest (first-order §1014/IRD at the disclosed heir bracket —
  // never the gross figure); the gloss names the after-tax frame honestly.
  goalLeaveMoreLabel: 'Leave more behind',
  goalLeaveMoreGloss: 'More left for your heirs, after taxes.',
  // `pay-less-tax` = minimize lifetime tax paid.
  goalPayLessTaxLabel: 'Pay less tax',
  goalPayLessTaxGloss: 'Less total tax over your lifetime.',

  // --- Act-4 · U16 §S3 — the COMMITTED beat (the honesty arc). PREFIX LAW (copyGuard):
  //   · GRADE WORDS + nameplate + the calm-unavailable + the withheld HEADINGS ride the `recommend*`
  //     prefix = isVerdictKey (superlative/free-numeral gated) but NOT control-swept — terse verdicts
  //     wear no forced modal (the "On track" precedent), so a grade word never mushes into a hedge.
  //   · PLAN-MOVING CLAIMS ride the new control prefixes (recDelta / recSkew / recGradeNote /
  //     recCompose / recHold / recRunnerUp) = require-hedge-swept: a figure/direction/confidence claim
  //     that moves a plan must WEAR its modal. The enum ids 'just-do-it'/'coin-flip' stay INTERNAL —
  //     never authored here (the render maps them to these humane words). All FIRST-DRAFT wording — the
  //     exact reframe TONE is the N=1 cold-read's call (spec ⚑ #2). ---

  // The grade WORDS (the calibrated-confidence lockup headline; hedged-confident, never an absolute).
  // just-do-it → a confident lean; coin-flip → a close call. Terse verdicts (recommend* = verdict-scoped).
  recommendGradeConfident: 'A confident lean',
  recommendGradeCoinFlip: 'A close call',
  // The no-action baseline nameplate (Q7) — a STATIC label, NO number, the A↔B residual never rendered.
  //
  // ⚠️ THIS SENTENCE WAS FALSE UNTIL 2026-08-03, AND THE FIX WAS IN THE ENGINE, NOT HERE. `solve.ts`
  // built the displayed baseline from `search.conventionalBaseline` — the FIXED
  // `taxable-first`/conversion-0 candidate, never the household's entered order — so for anyone whose
  // order was not `taxable-first` (including the DEFAULT `proportional` draft) the dollar hero was
  // measured against a plan they never chose, under a label saying it was theirs. It now builds from
  // `search.userBaseline` (unconditionally injected by `enumerateSolveCandidates`).
  //
  // ⚠️ AND IT TOOK TWO FIXES, BECAUSE THE PLAN HAS TWO CONTROLS. The first pass re-anchored the
  // WITHDRAWAL ORDER and left the other coupled control behind: `enumerateCandidates` had no field in
  // which a conversion could be expressed, so the baseline was minted `conversion: null` and
  // `applyCandidate` stripped the base's schedule — for a household running the shipped Roth lever,
  // "your plan today" was their order with their conversion DELETED, a different "today" from the one
  // the spine band directly above it draws. Closed the same day: the household's own
  // `draft.rothConversion` is threaded through `solveDispatch` → `enumerateSolveCandidates` →
  // the baseline arm, and `solveAnchor.test.ts` pins the identity as a REDUCE-TO-SPINE assertion
  // (`applyCandidate(base, userBaseline)` deep-equals the household's own params).
  //
  // FOUR STRINGS RIDE THAT ONE SEAM: this nameplate, `recVizWithoutLabel` ("Your plan today"), and
  // BOTH hero slots (`recDeltaLeaveMore` / `recDeltaPayLessTax`, "than today's plan"). They are worded
  // as claims about the READER'S OWN plan and are only true while the displayed baseline is the user
  // baseline AND that baseline carries BOTH of the household's controls. ⛔ IF YOU EVER RE-ANCHOR
  // `solve.ts`'s displayed baseline back to the conventional arm — OR DROP EITHER CONTROL FROM THE
  // INJECTED BASELINE — ALL FOUR BECOME LIES IN THE SAME COMMIT: rename them in that commit or do not
  // make the change. `solve.test.ts` pins the display seam and `solveAnchor.test.ts` pins the
  // baseline's contents, so neither half can drift silently.
  recommendBaselineNameplate: 'Compared with your plan today',

  // ── THE WINNING-PLAN CARD (2026-08-05) — the answer to "…by doing what?" ───────────────────────
  // The hero states a dollar and, until this card, nothing on the surface said what earns it:
  // `winnerStrategyKey` was computed and had ZERO render consumers, the winner's conversion figures
  // rendered nowhere, and `RecommendationSurface` contained no strategy name at all.
  // BRIGGSY RULED 2026-08-03: NAME IT, NO DOOR. No control back into the sequencing/Roth sheets —
  // following one fires `invalidateStaleSolve` and demotes the very card that pointed there.
  //
  // A SETTINGS LIST, NOT AN INSTRUCTION LIST, AND THAT FRAMING IS LOAD-BEARING. `applyCandidate`
  // STRIPS the base's conversions before installing the candidate's, so the winner's conversion
  // REPLACES the household's rather than adding to it — every "also"/"alongside"/"on top of" phrasing
  // is a false implicature. A row that NAMES a control and STATES its setting cannot carry that
  // implicature, and it needs no imperative (which the universal advice-verb gate bans outright, and
  // which is why every shipped `leverPolicy*Help` gloss is third-person).
  //
  // ⚠️ ACTIVE REGISTER ONLY — and that is what makes the figures safe. See `winnerActionView`
  // (recommendationView.ts) for the three-part proof; the short version is that in ACTIVE mode the
  // crowned plan is provably NOT the household's own, so the winner is always a grid arm: its amount
  // is rail-floored, its window horizon-clamped, and its policy can never be `custom`.
  //
  // These three are `recommend*` ⇒ VERDICT-scoped, so free-numeral reds any digit written into them
  // and the superlative gate reds a crowned "best". Every figure rides a `roth*` SLOT instead.
  // DELIBERATE: a `recAction*` spelling would have matched NEITHER prefix list (`isVerdictKey` needs
  // the full `recommend`; `isControlKey` needs one of the enumerated `recDelta`/`recSkew`/… stems),
  // so a plan-moving dollar would have shipped past free-numeral AND require-hedge both.
  // ⚠️ NOT "How this plan gets there" (the first draft, killed on its own real-browser frame
  // 2026-08-05): "there" has NO REFERENT on this surface. The undefined-referent ban is copy LAW here
  // — the reader is never wrong — and the anaphora a heading like that leans on is broken by the
  // nameplate, which sits between the hero's dollar and this card. Worse on a close call, where "gets
  // there" implies arrival at a destination nothing ever named. This states what the list IS and makes
  // the rows do the work. Equally NOT "…does differently": the crowned plan differs from theirs in at
  // least one control (that is what ACTIVE mode proves), but not necessarily in EVERY row — a
  // household whose order already matches and whose conversion is the whole recommendation would read
  // a false claim over the order row.
  recommendActionHeading: 'What this plan does',
  recommendActionOrderLabel: 'Which accounts you spend first',
  recommendActionConversionLabel: 'Roth conversions',
  // The calm couldn't-work-it-out state (a solve refusal / mint-failure / demotion-withhold — each a
  // structured bin, surfaced as ONE honest retry line, never a raw reason code or a blank).
  recommendUnavailable:
    'We couldn’t work out a recommendation just now — adjust a number, or re-open this, to try again.',
  // The withheld-render HEADINGS (calm-competent, never an alarm / red badge). The whole-solve hold
  // (a household waiting on a certification) and the conversion-only hold (the sequencing rec ships).
  recommendHeldHeading: 'Holding this recommendation for now',
  recommendWithheldConversionsHeading: 'Roth conversions — held for now',

  // The DELTA-as-hero comparative is a SLOT (recDelta*, below). These are the non-figure claim lines.

  // The compose state (surplus + no-change): NO-dollar reassurance, the word "already" carrying the
  // relief, the inherited confidence carrying the honesty. Never a fabricated dollar hero, never "safe
  // either way" (DEAD COPY). recCompose* ⇒ require-hedge-swept ("likely" carries it).
  // ⚠️ GATED ON `noChange`, WHICH CHANGED MEANING 2026-08-03. It used to mean "the winner is the
  // CONVENTIONAL default", so this line told a `proportional` household they were "already on one of
  // the strongest paths" while the actual recommendation was to switch off their order. `noChange` now
  // means "the crowned plan IS the one you already run" (compared by PLAN, not index — see
  // `select.ts`'s `isNoChange`), which is the only reading under which the word "already" is true.
  recComposeAlready:
    'You’re already on one of the strongest paths we tested — nothing else we tried looks likely to pull clearly ahead.',

  // The ShapeDisclosure note (composeShapeDisclosure → HUMANE): the grade's LEVEL rides methodology
  // substrate that isn't final, so treat the exact edge as a lean, not a lock. recGradeNote* ⇒ swept
  // ("could" carries it). ⚠️ LIVE ON ESSENTIALLY EVERY REAL RUN (corrected 2026-08-20 — this line
  // said "dormant" while the note rendered): `methodology.productionMarket` and
  // `methodology.survivorSpendingRatio` are both directional methodology-substrate, and the pinning
  // walk consumes them whenever the run carries the default bytes — i.e. any household that has not
  // overridden those assumptions. Witnessed rendering on the ?seed=buckets leave-more commit.
  recGradeNoteShape:
    'A couple of the figures behind this are still being finalized, so the exact gap could shift — it’s a lean here, not a lock.',
  // The coin-flip HINGE — names WHAT IT HINGES ON from the payload's named driver (never a fabricated
  // cause). The ACA-regime probe, the sampling-noise sentinel, and a fail-closed generic for any future
  // probe name. recGradeNote* ⇒ swept ("can" carries each).
  recGradeNoteHingeAca:
    'Which one comes out ahead can hinge on whether the enhanced ACA discount returns — and we can’t call that yet.',
  recGradeNoteHingeSampling:
    'These two run so close that which one edges ahead can come down to chance across the futures we tested.',
  recGradeNoteHingeGeneric:
    'Which one comes out ahead can hinge on an assumption we can’t pin down yet, so it’s a lean here, not a lock.',
  // The calm caveat when the confidence GRADE couldn't be computed (a one-arm set, or the paths were
  // too few) — the delta still shows, but the "how close is this call" read is withheld honestly.
  recGradeNoteUngraded:
    'We couldn’t grade how close this call is here, so the exact edge could be rough — lean on the numbers, not a confidence read.',

  // The runner-up, one tap down as TEXT (R23 — retained + reachable; stripping it fails the suite).
  // recRunnerUp* ⇒ swept ("often" carries it).
  recRunnerUpWhy:
    'The runner-up ran close; this one came out a little ahead more often across the futures we tested.',

  // The WITHHELD reasons — one humane string per WithheldReason arm (Q5: the TRUE reason, the DIRECTION
  // honestly, framed as REFUSING TO GUESS; an unclassified reason fails CLOSED with the generic). The
  // state-cert arm is a SLOT (recHoldStateCert, below — it names the state). recHold* ⇒ swept.
  recHoldTrend:
    'We’re holding off on ranking Roth conversions here — the numbers hinge on how Medicare’s costs climb over the years, and we won’t lean on an estimate we can’t yet stand behind. Converting could help or hurt, so we’d rather wait than guess.',
  recHoldAcaUnverified:
    'Our health-insurance figures are past their re-check date, so we’re holding the recommendation until we re-verify the marketplace rules — a stale read there could tip which strategy comes out ahead.',
  recHoldPrimaryDirectional:
    'A figure this recommendation leans on hasn’t been finalized yet, so we’re holding off rather than rank on a number that could still move.',
  recHoldEpsilon:
    'One of the tool’s own calibration numbers isn’t set, so we’re holding the recommendation rather than risk a ranking that could be off.',
  recHoldGeneric:
    'We’re holding this recommendation back for now — leaning on a number we can’t yet stand behind could mislead, and we’d rather wait than guess.',
  // The DEMOTION-AXIS hold (the Tier-0 crash fix, 2026-08-03). Before this key existed, a well-funded
  // household whose winning strategy converts hit `gradeCalibration`'s plain throw, which `solve.ts`
  // rethrows — landing them on the GENERIC compute-error card, indistinguishable from "the worker
  // died". Both goals now route to a structured withhold, and this is its humane face.
  // ⚠️ It is NOT about the two strategies being CLOSE. The guard fires on the shape alone (a
  // converting winner over a non-converting runner-up on a dollar axis) BEFORE any margin is read —
  // the honest claim is that we cannot tell how close the call is, never that it IS close. Wording
  // that says "these two are neck and neck" would be a fabricated finding.
  // Names the direction honestly (it may well be the right move) — a hold is not a warning against it.
  recHoldDemotionAxis:
    'We’re holding this recommendation back — the strategy that came out ahead uses a Roth conversion, and on this goal we can’t yet tell how close that call really is. It could well be the better path; we’d rather wait than hand you a confidence we haven’t earned.',
  // The COUPLING caveat (Q5, from the red team's Attack 4): withdrawal order and conversions rank
  // JOINTLY, so a sequencing-only winner is a coupled sub-solution — the read for now, not the last word.
  recHoldCoupling:
    'Withdrawal order and conversions are weighed together, so this could still shift once those rates are certified — it’s the read for now, not the last word.',

  // --- Act-4 · U16 §S3b — the disclosures adjacent to the delta (R7 nets) + the viz arm labels + the
  //     grade-signal standalone aria name. recDisc* ⇒ require-hedge-swept (each wears its modal — a
  //     methodology caveat that qualifies a plan-moving figure); the viz arm labels are plain nouns
  //     (not plan-moving), and the viz aria SLOT below wears the hedge. ---
  // The SS claim-age held-fixed note (a disclosure seat — NOT optimized in the comparison). "assume" hedges.
  recDiscSsClaimFixed:
    'We assume you each claim Social Security at the ages you entered, and hold those steady while we compare.',
  // The NIIT scope note — the federal surtax on higher investment income the delta doesn’t split out.
  // "could" hedges; no bare numeral (the surtax rate is named in plain language, never a free figure).
  recDiscNiit:
    'This weighs your federal income tax; a federal surtax on higher investment income could also apply and isn’t broken out here.',
  // The state-tax scope note — priced only for the roster states; elsewhere the delta is federal-only.
  recDiscStateTax:
    'Where we can’t yet price a state’s income tax, this compares federal tax only — the state piece could move it either way.',
  // The ACA SLCSP/CSR caveat, by reference — shown only when the delta LEANS ON ACA. "could" hedges.
  recDiscAcaSlcsp:
    'This leans on your marketplace benchmark and cost-sharing figures; if those shift, the edge here could move.',
  // The viz arm labels (string-free viz; DIRECT end-of-line labels, never a color legend). Plain nouns.
  recVizWithLabel: 'The recommended strategy',
  // Names the household's OWN plan — true only while `solve.ts` displays `search.userBaseline`.
  // See the coupling warning on `recommendBaselineNameplate`; all four strings move together.
  recVizWithoutLabel: 'Your plan today',
  // Act-4 · U16 §S4 — the RUNNER-UP comparison viz arm label (winner vs runner-up, one tap down). A
  // plain noun (not a plan-moving claim — the hedged claim is `recRunnerUpWhy`); the recommended arm
  // keeps its `recVizWithLabel` identity so the hatch/triangle means "recommended" across both vizzes.
  recVizRunnerUpLabel: 'The runner-up strategy',
  // The grade signal's standalone aria name (the ungraded glyph, drawn with no adjacent verdict word).
  recGradeAriaUngraded: 'Confidence rating unavailable',
  // The runner-up's one-tap-down toggle label (R23: retained + reachable). NOT control-scoped (a
  // disclosure TOGGLE, never a plan-moving claim — the claim itself is `recRunnerUpWhy`, hedged).
  recSeeRunnerUp: 'How the runner-up compared',
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
export type SlottedErrorKey = 'errContributionCeiling' | 'errAdditionsCeiling' | 'errRothStartPast'
export interface SlottedErrorParams {
  /** The quoted bound, PRE-formatted at fire time — for the two ceiling errors the statutory
   *  limit dollar (intake money formatter: digits + grouping, no `$` — the slot template
   *  supplies the glyph), computed from the canonical year-keyed constants (age-dependent;
   *  catch-up bands exist), never a re-typed dollar. For `errRothStartPast` (U17 §S1) it is the
   *  earliest startable CALENDAR YEAR (the wall year, from Result's one anchor — never a second
   *  clock read), plain digits. */
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

/** The ceiling for an ADVERSE-event frequency (the ACA over-cliff odds) — valence-neutral
 *  "more than", NEVER {@link XOFTEN_CEILING}'s good-news "better than": on a bad-news count
 *  ("the discount disappears") the good-news frame reads as reassurance — the calm-but-wrong
 *  shape (council 2026-07-18, the hawk's veto). Same proportion form, same never-"10 of 10". */
const XOFTEN_CEILING_ADVERSE = 'more than 9 in 10'

/** The adverse-frequency phrase: the hedged count below the ceiling, the valence-neutral
 *  proportion AT it. Branches on the unclamped count — never on sniffing a rendered string
 *  (a string sniff would silently orphan the adverse constant when a wording moves). The
 *  "about" hedge applies only below the ceiling; "more than" IS the bound at it (the Q2
 *  de-stack law: a bound never wears a second hedge). Below the ceiling the count rides
 *  {@link slots.xOfTen} — ONE home for the count format (call-time reference; safe). */
const adverseOddsPhrase = (worstOfTen: number): string =>
  worstOfTen >= 10 ? XOFTEN_CEILING_ADVERSE : `about ${slots.xOfTen(worstOfTen)}`

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
  /** The aged-plan "Plan built" year-0 endpoint's accessible sentence (the U13 one-time-base
   *  law applied to the chart — see `bandClockBuiltLabel`). Names the BUILD YEAR and the ages
   *  the household entered then — NEVER the save (U17 §S0.2: the save is `savedAt` and a
   *  re-saver's is minutes old, while this column is `startCalendarYear`, untouched by every
   *  re-save). The year is quoted in-sentence so the reader never derives it from the ages. */
  bandClockBuiltDesc: (builtCalendarYear: number, ageA: number, ageB: number): string =>
    `When you built this plan, in ${builtCalendarYear} — ages ${ageA} and ${ageB}`,
  /** The plan-horizon marker's accessible sentence — anchored at the fan's actual last year. */
  bandClockHorizonDesc: (ageA: number, ageB: number): string =>
    `The plan horizon — ages ${ageA} and ${ageB}`,
  /** The DATE-route "work stops" marker's accessible sentence — the future fuck-off moment (the
   *  household's last earner stops). Color-blind law: the marker's meaning reaches the a11y tree as text. */
  bandClockWorkStopsDesc: (ageA: number, ageB: number): string =>
    `Work stops — ages ${ageA} and ${ageB}`,
  /** The SPLIT variant (U17 §S2.5): the marker names the essentials-covered date the band follows,
   *  never a generic "work stops" a reader would bind to the headline's lifestyle date. */
  bandClockWorkStopsSplitDesc: (ageA: number, ageB: number): string =>
    `The essentials-covered date this range follows — ages ${ageA} and ${ageB}`,
  // --- U17 §S2 — the aged band's premise line (the fan ships ONLY beside one of these + the
  // rendered re-confirm control; no fold-legal premise ⇒ the fan withdraws entirely). The
  // residual is spoken as UNDETERMINED — never "conservative": only the fan's WIDTH is
  // conservative, its LOCATION is unknown for a household that overspent or ate a drawdown
  // (the dead-copy law's U17 clause). Craftsman's-lead wording; his eye reads it at the
  // arrived-vault walk (the council's ⚑ #2). ---
  /** ⚑ THE TWO SPENDING LEVELS, NAMED TOGETHER (council 2026-07-30's naming layer; the gap Briggsy
   *  found on the real surface 2026-07-30: "I need to see what my essential spend looks like along
   *  with what my desired spend looks like").
   *
   *  A two-date household has two dates BECAUSE it has two spending levels — and the landing showed
   *  two dates, two sets of odds and a balance picture while naming NEITHER figure. Every dollar on
   *  that screen was a portfolio balance, so the quantity that explains the whole split was the one
   *  quantity absent. These two slots put both levels beside the picture that prices one of them.
   *
   *  WHOSE WORLD IS DRAWN LEADS; the other rides as the contrast, so the sentence always answers
   *  "what am I looking at?" before "what is the alternative?".
   *
   *  "to start" IS LOAD-BEARING, not filler: both figures are retirement-year-0 totals, and a ramped
   *  budget's later years genuinely differ. A bare "$X a year" would be a quiet over-claim on every
   *  ramped plan — the same class of unqualified figure the copy law forbids elsewhere. Saying it
   *  unconditionally beats branching on `isRampedBudget`, because the qualification is TRUE either
   *  way and a reader never has to know which kind of budget they built.
   *
   *  ⚑ "MEDICAL INCLUDED" IS NOT FILLER — IT PREVENTS A CROSS-SURFACE COLLISION, caught live on
   *  ?seed=datesplit 2026-07-30. The budget door states "Essentials about $46,000" (the reader's
   *  TYPED lines) while separately naming "$8,000 a year of out-of-pocket medical carried
   *  automatically". The floor the ENGINE spends is the sum of both — $54,000 — because compileBudget
   *  injects OOP medical into the STICKY floor. So the honest figure here is $54,000 and it does NOT
   *  match the door's "essentials" number by construction. Quoting the door's $46,000 instead would
   *  understate what the essentials world actually costs — calm-but-wrong in the optimistic
   *  direction, on the survival track. Quoting $54,000 bare would give a reader who opens both
   *  screens two different "essentials" totals with no way to reconcile them. The three-word
   *  qualifier is what makes the two surfaces legible together (Briggsy's copy law: a same-named
   *  quantity quoted twice with different values wears its definition on EACH mention).
   *
   *  Figures arrive PRE-FORMATTED from the compiled-budget producers (never re-typed, never summed
   *  at the call site — `budgetYearZeroEssentialsTotal` omits neither the injected OOP medical nor
   *  the scalable-essentials tier; both failure modes are mutation-pinned). */
  bandPricesFullBudgetWithLevels: (fullFormatted: string, essentialsFormatted: string): string =>
    `This range prices your full budget — about $${fullFormatted} a year to start. Your essentials alone, medical included, would be about $${essentialsFormatted}.`,
  bandPricesEssentialsWithLevels: (essentialsFormatted: string, fullFormatted: string): string =>
    `This range prices your essentials only — about $${essentialsFormatted} a year to start, medical included. Your full budget would be about $${fullFormatted}.`,
  /** The OLD-SAVE arm: the balances behind the fan were saved in a named past year. (Tightened
   *  at the measured 1536×791 frame — all three facts kept: the vintage, not-today's-accounts,
   *  and the undetermined residual; the re-confirm CTA rides INLINE after this sentence.) */
  bandAgedPremiseSaved: (savedYear: number): string =>
    `Drawn from the balances you saved in ${savedYear} — not today’s accounts. What you actually hold now is undetermined until you re-confirm.`,
  /** The FRESH-SAVE arm (a re-saver: plan years old, save minutes old): the balances are the
   *  latest saved, but the picture still runs from the plan's own build year — its elapsed
   *  years are modeled, not records.
   *
   *  ⚑ U17 §S6 — THE SUBJECT OF "UNDETERMINED" IS THE BALANCE, NEVER THE DATE. Both arms used to
   *  end "Where today sits on it / Where you sit now is undetermined", which names a HORIZONTAL
   *  position — and the same frame draws that position, labels it "Today" (`bandClockTodayLabel`),
   *  prints the ages under it, and gives it the accessible name "Today — ages 63 and 63". Cold-read
   *  live on `?vault=datearrived` (S6 Card 4): three channels contradicting one sentence, and the
   *  error runs the ROSY way — readers took the sentence for a bug, trusted the tick, and then read
   *  the six modeled elapsed years as LIVED HISTORY, which is the exact misreading the premise
   *  exists to prevent.
   *
   *  The intent was never in doubt — the section comment above already says only the fan's WIDTH is
   *  conservative while "its LOCATION is unknown". Location means the VERTICAL axis: the balance a
   *  household that overspent or ate a drawdown is actually standing on. "What you actually hold"
   *  names that and nothing the chart draws.
   *
   *  ⚠️ DO NOT "FIX" THIS BY DROPPING THE TODAY TICK. That inverts the contradiction into the
   *  defect U13/§S0 already fixed — `bandAnnotations.ts:51-56` records it live from the first
   *  `?vault=datestale` walk, and `e2e/vertical-fit.spec.ts:1565-1566` forbids a band that loses
   *  its wall clock BY NAME. The tick is right; the sentence was wrong. */
  bandAgedPremiseFresh: (buildYear: number): string =>
    `This range runs from ${buildYear}, when the plan was built — the years since are modeled, not records. What you actually hold today is undetermined until you re-confirm.`,
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
  /** Odds rider for the date line — the below-ceiling arm ("about 8 of 10 odds"). */
  withOdds: (xOfTenText: string): string => `about ${xOfTenText} odds`,
  /** The odds rider AT the ceiling — the bound stands alone, no "about": "better than" IS the
   *  hedge, and stacking them rendered the "about better than 9 in 10 odds" double hedge the
   *  rule-36 sweep killed (council 2026-07-18 Q2; the caller branches on the count, never on
   *  sniffing the rendered string). */
  withOddsAtCeiling: (): string => `${XOFTEN_CEILING} odds`,
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
   *  "10 of 10"); `state` names the non-color reading. `atCeiling` (the mark's own state-derived
   *  flag, curveMarks) drops the "about" — the ceiling text is already a bound, and stacking
   *  rendered the "about better than 9 in 10" double hedge (council 2026-07-18 Q2). */
  ladderMarkAria: (
    offsetYears: number,
    oddsText: string,
    state: 'crown' | 'dip' | 'clears' | 'below',
    atCeiling: boolean,
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
    return `${when}: ${atCeiling ? oddsText : `about ${oddsText}`}${tail}.`
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
  /** U17 §S1 — the Roth start field's past-year refusal (the write side of the calendar-year
   *  ruling). The earliest startable year is QUOTED in-sentence (the dont-make-users-think law);
   *  it arrives as a param from the ONE plan-clock anchor, never a template-typed year (which
   *  would go stale every January). The refusal predicate is `offsetHasPassed` — the same strict
   *  arrived test the ladder and band consume (§S0.1). */
  errRothStartPast: (yearFormatted: string): string =>
    `That year has already passed — this plan can start the conversions in ${yearFormatted} or later.`,
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
  // phrases arrive pre-rendered through slots.xOfTen and DELIBERATELY speak the conservative
  // count — the engine clamps each arm's emitted count to ≤ 9, so the ceiling proportion never
  // renders in a delta line (an over-funded arm reads "9 of 10"; the STATE rider carries the
  // move — council 2026-07-18 Q4b ratified the count). FIRST-DRAFT — the cold-read's call. ---
  /** The primary delta line, SURVIVOR basis (the plan's emotional headline number). Reads honestly
   *  in BOTH directions — a loss renders as "…in 5 of 10 futures instead of 7", never suppressed. */
  rothDeltaSurvivor: (withOdds: string, withoutOdds: string): string =>
    `For whichever of you outlives the other, the money could last in about ${withOdds} futures instead of ${withoutOdds}.`,
  /** The JOINT-basis fallback (no survivor phase observed in the runs — rare; same grammar). */
  rothDeltaJoint: (withOdds: string, withoutOdds: string): string =>
    `Together, the plan could hold in about ${withOdds} futures instead of ${withoutOdds}.`,
  /** The EVEN case — the quantized readings agree AND the verdict states agree; the difference
   *  is inside the noise the quantize deliberately absorbs. Calm, in-frame, never a suppressed
   *  delta. Fires ONLY on same-state arms: equal clamped counts across a state move (over-funded
   *  vs on-track both read "9 of 10") were rendering this line's "doesn’t look to change much"
   *  over a real improvement — the recommend-second suppression (council 2026-07-18 Q4d). */
  rothDeltaEven: (odds: string): string =>
    `In these runs it doesn’t look to change much — about ${odds} either way.`,
  /** The equal-counts-DIFFERENT-states arm (the ≤9 clamp compresses the top, so a real move can
   *  hold the count still): states only the count fact, claims nothing about magnitude — the
   *  state rider directly below carries the move (council 2026-07-18 Q4d). */
  rothDeltaCountEven: (odds: string): string =>
    `The odds read about ${odds} either way in these runs.`,
  /** The verdict-state transition rider — fires when the arms' verdict WORDS differ (which is
   *  how an over-funded arm surfaces past the ≤9 count clamp: the count holds "9 of 10", the
   *  STATE move is the headline shift). */
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
   *  THE START SPEAKS THE CALENDAR YEAR (U17 §S1, council wf_f4ced3c8-2f6): `startYearOffset` is
   *  sim-year-0-indexed, so the old "starting in about N years" misstated the start by exactly
   *  the plan clock on any aged vault. The calendar year is wall-time-stable — the sentence stays
   *  true no matter what day it is read. `startPassed` picks the tense: a start already behind
   *  the wall clock reads "started in", never a future-tense claim about a passed date (the U17
   *  dead-copy law). Both args arrive from `rothPlanStartFor` — the ONE derivation
   *  (bandAnnotations.ts); render sites never re-type the year arithmetic. */
  /*  SECOND SPEECH ACT SINCE 2026-08-05 — it now also states the RECOMMENDED schedule on the
   *  winning-plan card (`recommendActionConversionLabel`). The sentence is speech-act-NEUTRAL (it
   *  describes a schedule; it neither claims the reader chose it nor tells them to), so one
   *  vocabulary serves both — which is the point: a second phrasing for the same fact would be the
   *  second-vocabulary breach the one-honest-home law forbids. WHAT DIFFERS IS THE DIALECT OF THE
   *  AMOUNT, and it must: the echo sites pass the household's own figure through the intake layer's
   *  exact `formatMoney`, while the card passes the solver's through `formatActionableDollar`, which
   *  ROUNDS DOWN so a re-typed figure can never cross the rail its candidate was anchored under.
   *  Never swap them (money.ts states the provenance split in full). */
  rothPlanEcho: (amountFormatted: string, startYear: number, startPassed: boolean, years: number): string => {
    const start = startPassed ? `started in ${startYear}` : `starting in ${startYear}`
    return `Converting ~$${amountFormatted} a year for ${years} year${years === 1 ? '' : 's'}, ${start}.`
  },

  /** The winning-plan card's conversion row when the crowned plan converts NOTHING and the household
   *  DOES — i.e. the recommendation is to take their standing lever back out. Silence here would be
   *  the calm-but-wrong reading: on `?seed=health`'s leave-more solve the winner and the baseline run
   *  the SAME withdrawal order, so the conversion is the entire recommendation, and a card that showed
   *  only the order row would say nothing at all while looking complete.
   *  THE FIGURE IS THEIRS, SO IT RENDERS EXACTLY (`formatEnteredDollar`) — flooring the reader's own
   *  typed number on a surface that calls it their plan is a misquote (money.ts, the provenance split).
   *  Names the live vocabulary the Roth sheet already uses for this move (`leverRothRemove`, "Take the
   *  conversion back out") rather than minting a second way to say it — but in the THIRD person, since
   *  this card carries no control and must promise only what exists (insight 100).
   *  ⚑ TENSELESS ABOUT THEIR SCHEDULE (corrected 2026-08-05, ultramode P2): it used to say their plan
   *  "converts ~$X a year TODAY", which is false in both directions — their standing lever may start in
   *  a FUTURE year, or may have ELAPSED entirely (`years` past the horizon is inert). This states what
   *  their PLAN CONTAINS, which is true whenever the arm can render at all. The sibling
   *  `leverRothAlreadyApplied` below records the same trap on the same field. */
  rothPlanTakenOut: (theirAmountFormatted: string): string =>
    `None. Your plan has a ~$${theirAmountFormatted} a year conversion in it, and this one takes that back out.`,

  /** The winning-plan card's second conversion line when BOTH plans convert and the schedules differ.
   *  `applyCandidate` strips the base's conversions before installing the candidate's, so the crowned
   *  amount REPLACES theirs — without this line the row reads as an addition, which is the design
   *  panel's problem 2 exactly. Their figure again renders EXACTLY (`formatEnteredDollar`).
   *  Quotes only the AMOUNT, never their window: `years` carries no upper bound in the codec or the
   *  lever and the engine truncates past the horizon, so a household's nominal 40-year plan against a
   *  25-year horizon would quote a length nothing was priced over.
   *  ⚑ TENSELESS, same correction as the sibling above: "your plan converts … today" was false for a
   *  future-start or already-elapsed schedule. And it renders ONLY when the two amounts DISPLAY
   *  differently — see `winnerActionView`, where the floored crowned figure and this exact one can land
   *  on the same string and would otherwise announce a change the reader cannot see. */
  rothPlanReplaces: (theirAmountFormatted: string): string =>
    `That replaces the ~$${theirAmountFormatted} a year already in your plan.`,

  /**
   * THE CROWNED conversion schedule — the winning-plan card's own sentence, and NOT `rothPlanEcho`.
   *
   * ⚠️ THE REUSE WAS THE BUG (ultramode 2026-08-05, seven lenses converged; P1). `rothPlanEcho` echoes
   * a schedule the household OWNS, so its passed arm — "started in 2026" — is TRUE there. The card
   * describes a plan they have NEVER ADOPTED, and every grid conversion anchors at `startYearOffset: 0`
   * (the plan's BUILD year), so `offsetHasPassed(0, yearsSincePlanBuilt)` is true on ANY vault more than
   * a year old — i.e. every ordinary returning household was told a recommendation was already under
   * way. Worse, `RothLever` REFUSES a passed start (`complete()` returns null), so the one control that
   * could enact it rejects the very year the card named. Same words, different speech act, opposite
   * truth value: that is why one honest home splits in two here rather than one vocabulary stretching.
   *
   * BOTH ARMS ARE TRUE. The un-passed arm is the echo's wording verbatim (nothing was wrong with it).
   * The passed arm makes NO commencement claim: it states the window's LENGTH and says what the window
   * is counted from (or, for a ONE-year window, which year it is), which holds whatever the wall clock
   * reads. Two sentences, one fact each — the em-dash apposition that would have fitted it on one line
   * is banned on load-bearing figures.
   *
   * NUMBER AGREEMENT (2026-09-04): the passed arm's second sentence used to hardcode the plural "Those
   * years are counted from…" after a correctly-singular "for 1 year" — live for every at/past-RMD
   * household on an aged vault (`conversionWindowFor` clamps the window to ≥ 1 year), and no test
   * covered `years: 1, passed: true`. The singular keeps the SAME vocabulary ("the first year of this
   * plan") so no second phrasing is minted for one fact.
   */
  rothPlanRanked: (
    amountFormatted: string,
    years: number,
    firstYear: number,
    firstYearPassed: boolean,
  ): string => {
    const window = `Converting ~$${amountFormatted} a year for ${years} year${years === 1 ? '' : 's'}`
    if (!firstYearPassed) return `${window}, starting in ${firstYear}.`
    return years === 1
      ? `${window}. That year is ${firstYear}, the first year of this plan.`
      : `${window}. Those years are counted from ${firstYear}, the first year of this plan.`
  },

  /** U17 §S6 — THE APPLIED CONVERSION'S OWN PASSED START, STATED RATHER THAN REFUSED.
   *  §S1 shipped a past-start refusal that is right for a year the reader TYPED and wrong for the
   *  household's own executed history: re-opening the door on an applied mid-flight plan fired the
   *  R19 alert at them about their own conversion while the Assumption panel stated the same plan
   *  as live fact one door over (the S6 cold read, Card 3 — "calls the household's own executed
   *  conversion a typo"). This slot is what renders in the refusal's place.
   *
   *  WHY IT CANNOT SAY "under way": `startYearPassed` proves only that the START is behind the wall
   *  clock — a 4-year schedule begun in 2024 is FINISHED by 2029, and "already under way" would be
   *  false there. Every clause here is true whether the schedule is running or complete; deciding
   *  what a mid-flight start MEANS to the engine is the re-anchoring fork FILED at RothLever.tsx:48-49,
   *  and this copy deliberately does not pre-empt it.
   *
   *  IT PROMISES ONLY WHAT EXISTS (insight 100). Apply is genuinely unreachable here — `complete()`
   *  returns null on a passed start — so the sentence names the ONE live control, `leverRothRemove`
   *  ("Take the conversion back out"), which is structurally guaranteed to be on screen beside it
   *  (its render gate `applied !== undefined` is implied by this slot's own gate). It does NOT
   *  invite editing the amount or the window: both fields stay editable in the DOM but cannot
   *  commit while the start is past, and inviting an edit that can't land is the promise/affordance
   *  breach this whole fix exists to close.
   *
   *  NAMING IS DELIBERATE, AND THE GATE SET TURNS ON IT (verified 2026-07-30): `isControlKey` is a
   *  LEAD-prefix `startsWith` over CONTROL_KEY_PREFIXES, which carries `'roth'` — so a `roth*` name
   *  would be control-scoped and require-hedge would FIRE. That would be actively wrong here: the
   *  start year is a known fact read from the reader's own saved plan, and hedging it ("about 2025")
   *  would manufacture uncertainty the tool does not have. `leverRoth*` keeps it on the two
   *  universal gates (no false certainty, no advice verb), which is the correct scope for a
   *  statement of the reader's own history. `copyGuard.test.ts:711` pins this same prefix trap for
   *  `assumptionRothName` — the escape is known, and taken on purpose rather than by accident. */
  leverRothAlreadyApplied: (startYear: number): string =>
    `This conversion is already part of your plan and started in ${startYear}. That’s why it can’t be added again from here — taking it back out is still available below.`,

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
  /** The OVERDUE variants of the two status notes. Past the re-verify window the recommendation
   *  beside this sheet already refuses to rank ("past their re-check date" — `recHoldAcaUnverified`);
   *  before these keys existed this line went on speaking as though the check were current, so the
   *  sheet that EXPLAINS the healthcare model was the one surface that didn't repeat the warning.
   *  The overdue-ness is attributed to US, never to the reader — there is nothing they can do about
   *  it, and an alarm they cannot act on is just noise. The figures themselves are not disowned:
   *  they remain the last CONFIRMED reading of the rules, which is exactly what they are. */
  acaCostStatusOverdue: (checkedOn: string): string =>
    `Figured under this year’s rules: the enhanced subsidies expired, so help fades as income rises and stops at the cliff. Congress could still restore them — and our check is overdue, last done ${checkedOn}, so these figures are our last confirmed reading of the rules rather than a fresh one.`,
  acaCostStatusEnhancedOverdue: (checkedOn: string): string =>
    `Figured under the ENHANCED subsidy rules — a what-if, not current law. Congress may yet restore them; as of ${checkedOn} it hadn’t, and that check is now overdue, so this what-if rests on our last confirmed reading rather than a fresh one.`,
  /** The middle-of-the-road pre-65 net coverage cost (the empirical median, humane-rounded).
   *  Round 7 (cold-read 2026-07-03: "Household? Where is the number coming from?"): the figure's
   *  SOURCE is named — it is the user's own entered marketplace plan (the household-premium
   *  intake question), net of the computed discount — never a national average. */
  acaCostNet: (amountFormatted: string): string =>
    `Before Medicare, the health plan you entered could run your household around ~$${amountFormatted} a year after the income-based discount.`,
  /** The over-cliff frequency (a per-year FRACTION of futures, never a mean — insight 062).
   *  Takes the UNCLAMPED count: at ≥ 10 the frequency renders the valence-neutral
   *  {@link XOFTEN_CEILING_ADVERSE} via {@link adverseOddsPhrase} — the good-news "better than"
   *  is BANNED on this bad-news fact (a deep-over-cliff household must never read its vanishing
   *  discount as reassurance; council 2026-07-18, the hawk's veto discharged by this template
   *  edit + the ceiling fixture). */
  acaCostCliff: (worstOfTen: number): string =>
    `In ${adverseOddsPhrase(worstOfTen)} futures, a year’s income tips past that line and the year’s discount disappears entirely.`,
  /** The over-cliff odds when the anchor has ALREADY crossed the cliff — no headroom sentence
   *  precedes this fact in that branch, so the cutoff dollar rides inline instead of being
   *  borrowed from a sentence that never renders (Sonnet-5 audit 2026-07-03). Same unclamped
   *  count + adverse ceiling as {@link slots.acaCostCliff}. */
  acaCostCliffOverCliff: (worstOfTen: number, cliffFormatted: string): string =>
    `In ${adverseOddsPhrase(worstOfTen)} futures, a year’s income passes about ~$${cliffFormatted} and that year’s discount disappears entirely.`,
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
   *  years" is always from TODAY (a re-opened old plan must not replay the count it carried on
   *  the day it was BUILT — U17 §S0.2; the anchor's clock measures the build, not the save). */
  dateInYearsAnchored: (n: number, calendarYear: number): string =>
    n === 1
      ? `Your fuck-off date is about a year out — around ${calendarYear}`
      : `Your fuck-off date is about ${n} years out — around ${calendarYear}`,
  /** The ARRIVED-THIS-YEAR arm (U17 §S2.5 — the strict three-way split): wall time has caught
   *  up to the saved date EXACTLY (offset == plan clock). "That's about now" is true here and
   *  agrees with the ladder's "stopping today" crown — one idiom, each surface naming its date. */
  dateInYearsNow: (calendarYear: number): string =>
    `Your plan penciled the fuck-off date around ${calendarYear} — by the calendar, that’s about now`,
  /** The STRICTLY-PAST arm (U17 §S2.5): the penciled year is genuinely behind the wall clock —
   *  "about now" would be false (the old non-strict arm collapsed "this year" and "three years
   *  gone" into one sentence). A statement of the plan's own calendar, never a fresh "stop now"
   *  verdict, and never a future-tense claim about a passed date (the dead-copy law); the aged
   *  band's premise line + re-confirm control carry the "what now". */
  dateInYearsPast: (calendarYear: number): string =>
    `Your plan penciled the fuck-off date around ${calendarYear} — that year has already come and gone`,
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
  /** The floor's ARRIVED-THIS-YEAR arm (mirrors dateInYearsNow — U17 §S2.5): the essentials
   *  date is exactly this year by the calendar — state the plan's own year, never a fresh verdict. */
  dateFloorCoveredNow: (calendarYear: number, oddsText: string, unconfirmed: boolean): string => {
    const edge = unconfirmed ? ' That sits at the edge of what this window can confirm.' : ''
    return `The essentials alone were penciled as covered around ${calendarYear} — by the calendar, that’s about now — ${oddsText}.${edge}`
  },
  /** The floor's STRICTLY-PAST arm (mirrors dateInYearsPast — U17 §S2.5): the essentials year
   *  is genuinely behind the wall clock; the odds quoted are the plan's own read, never a fresh
   *  verdict about today. */
  dateFloorCoveredPast: (calendarYear: number, oddsText: string, unconfirmed: boolean): string => {
    const edge = unconfirmed ? ' That sits at the edge of what this window can confirm.' : ''
    return `The essentials alone were penciled as covered around ${calendarYear} — a year already behind you — ${oddsText}.${edge}`
  },

  // --- Act-4 · U16 §S3 — the delta-as-hero + skew + state-cert SLOTS (the numeric channel; every
  //     figure arrives PRE-FORMATTED by money.ts, so the template carries no hardcoded numeral). All
  //     control-scoped by their recDelta*/recSkew*/recHold* prefixes ⇒ require-hedge-swept (the sample
  //     renders in copyGuard.test.ts's SLOT_RENDER must WEAR a modal — each does). ---
  /** The delta-as-hero for `leave-more`: the goal-dollar DELTA as a comparative, the WORD ("more")
   *  carrying direction so the magnitude reads sign-free. "about" is the require-hedge modal.
   *  ⚠️ "today's plan" names the READER'S OWN order — true only while `solve.ts` displays
   *  `search.userBaseline`. See the coupling warning on `recommendBaselineNameplate`. */
  recDeltaLeaveMore: (deltaFormatted: string): string =>
    `Leaves about $${deltaFormatted} more to your heirs than today’s plan, after taxes.`,
  /** The delta-as-hero for `pay-less-tax` (the surviving pivot: "keeps ~$X more" — the DEAD "safe
   *  either way" absolute stripped). "about" is the require-hedge modal. */
  recDeltaPayLessTax: (deltaFormatted: string): string =>
    `Keeps about $${deltaFormatted} more out of your lifetime tax than today’s plan.`,
  /** The §S2 skew disclosure (leave-more): the MEAN ranks + displays, but a few lucky futures pull it
   *  up, so the disclosure QUOTES THE MEDIAN as the typical bequest. "about" is the require-hedge modal;
   *  the median arrives pre-formatted (single-sourced against the band's percentile convention).
   *  REWORDED by the A/B walk's chair (wf_91a3fa9a-b2e survivor, Sonnet calm seat + four convergent
   *  formulations): the old "the more typical outcome" named no referent — and the average it corrected
   *  never renders as a visible figure, so the sentence qualified a number the reader never saw. "What
   *  you'd more typically leave behind" names the outcome (this slot renders for leave-more only), and
   *  the average clause becomes the explanation rather than the subject. */
  recSkewMedian: (medianFormatted: string): string =>
    `What you’d more typically leave behind is closer to about $${medianFormatted} — a few very good futures pull the average above it.`,
  /** The DELTA hero's median qualification (the median-advantage increment, 2026-07-23): the hero's
   *  "$X more" is a MEAN of the per-future advantage, and when its skew is upside the TYPICAL future
   *  gains less — say so, quoting BOTH endpoints in-sentence (the don't-make-users-think law: the
   *  referent by its own verbatim figure, the typical by its own dollar). TWO sentences, one fact
   *  each (no em-dash apposition on a load-bearing figure). Deliberately a DIFFERENT construction
   *  from `recSkewMedian` (the level's line) so the two stacked disclosures never read as one
   *  repeated sentence (the anaphora-density class). "about" is the require-hedge modal. Both figures
   *  arrive pre-formatted in the DELTA dialect (formatDeltaDollar — the hero's own ruler). */
  recDeltaTypical: (deltaFormatted: string, medianFormatted: string): string =>
    `The “$${deltaFormatted} more” above is an average across the futures we tested. In the typical future the edge is closer to about $${medianFormatted}.`,
  /** The qualification's NO-DOLLAR arm: the typical per-future advantage sits at zero (or under
   *  the display step in EITHER direction), so quoting a median dollar would fabricate a figure —
   *  the honest sentence is that at least half the tested futures gain little or nothing from the
   *  change. "likely" is the require-hedge modal (a 16k-path median is an estimate). The average
   *  still displays as the hero; this names what carries it. A MATERIALLY negative typical takes
   *  {@link slots.recDeltaTypicalBehind} instead (review wf_6f89fe6f-35a P2 — "little or nothing"
   *  floors a real loss at zero, the optimistic direction). */
  recDeltaTypicalNone: (deltaFormatted: string): string =>
    `The “$${deltaFormatted} more” above is an average across the futures we tested. In at least half of them, this change likely gains little or nothing.`,
  /** The qualification's BEHIND arm (review wf_6f89fe6f-35a P2, refuters 4-0 across two lenses):
   *  when the typical per-future advantage is MATERIALLY negative — the median future actively
   *  loses vs doing nothing while a few strong futures prop the average up — "gains little or
   *  nothing" would floor the loss at zero, the calm-but-wrong-OPTIMISTIC direction inside the very
   *  channel built to prevent it. Quote the typical setback in the delta's own dialect (half the
   *  futures sit at-or-beyond the median, so "about $Y or more behind" is exact). "likely" + "about"
   *  carry require-hedge. */
  recDeltaTypicalBehind: (deltaFormatted: string, behindFormatted: string): string =>
    `The “$${deltaFormatted} more” above is an average across the futures we tested. In about half of them, this change likely comes out about $${behindFormatted} or more behind.`,
  /** The withheld reason for `state-certification-pending` (Q5): the STATE by name, the TRUE reason
   *  (rates not officially set), the DIRECTION honestly, framed as REFUSING to guess. "could" carries
   *  require-hedge on its own. `stateName` arrives from the existing stateOption* copy (no re-typed
   *  state name).
   *
   *  ⚠️ NO LONGER LIVE FOR NC (2026-08-02) — S.L. 2026-41 § 44.1(a) enacted NC's rate schedule, so
   *  that household mints. The reason kind stays because the machinery is generic and any future
   *  directional state re-arms it; the mint leg is seam-proven (oracleToken `_pinningOverride`).
   *  THE "around August" CLAUSE WAS DROPPED WITH THE PIN: it promised a specific month tied to NC's
   *  FY2025-26 certification, which no longer gates anything — and a withhold that names a date it
   *  cannot keep is exactly the promise this product must not make. A future state's pin event may
   *  have any timing, so this sentence commits to none. */
  recHoldStateCert: (stateName: string): string =>
    `${stateName} hasn’t officially set its upcoming income-tax rates yet, so we’re holding off rather than guess — converting could help or hurt depending on the final rate, and we won’t call it until those rates are settled.`,

  // --- Act-4 · U16 §S3b — the heir-bracket disclosure (leave-more) + the viz aria sentence (AT parity:
  //     every disclosed figure reachable inside the role="img" name). Figures PRE-FORMATTED (money.ts). ---
  /** One rung of the statutory ordinary-bracket ladder, as a radio label. The ladder itself is
   *  DERIVED from `ordinaryBracketsMFJ` — never re-typed — so this slot only dresses the figure. */
  assumptionHeirBracketOption: (percentFormatted: string): string => `${percentFormatted}%`,
  /** The leave-more heir-bracket note — the assumed IRD bracket the after-tax bequest is computed at
   *  (recDisc* ⇒ require-hedge-swept; "Assumes" + "roughly" carry it). The percent arrives pre-formatted.
   *
   *  ✅ THE "adjust it in your assumptions if that's off" CLAUSE IS RESTORED (2026-08-14), in the same
   *  change that shipped the seat — which is the ONLY condition under which it may exist. It was
   *  dropped 2026-08-02 because it was a DEAD END: no heir-bracket seat existed in
   *  `assumptionRegistry.ts` or `AssumptionPanel.tsx`, so the sentence sent the reader hunting for a
   *  control we had never built, and someone looking for something that isn't there concludes they
   *  missed it. The seat now exists (`heir-bracket`, `AssumptionPanel.tsx`, gated on
   *  `chosenGoal === 'leave-more'` — the only goal whose objective reads the bracket).
   *  ⚠️ THE COUPLING IS PERMANENT AND RUNS BOTH WAYS: if the seat is ever removed or its gate is
   *  narrowed so this note can render without a reachable row, DROP THIS CLAUSE IN THE SAME CHANGE.
   *  The note and the row ship together or not at all. */
  recDiscHeirBracket: (percentFormatted: string): string =>
    `Assumes your heirs are in roughly the ${percentFormatted}% tax bracket when they inherit — adjust it in your assumptions if that’s off.`,
  /** The RecommendationViz accessible sentence (the role="img" name): both arms' magnitudes AND the
   *  delta, so the whole comparison is reachable in the a11y tree (A2 AT-parity). "about" carries the
   *  hedge; every figure arrives pre-formatted (the axis dialect), so the sentence carries no bare numeral. */
  recVizAria: (withoutLabel: string, withoutFig: string, withLabel: string, withFig: string, deltaFig: string): string =>
    `${withoutLabel} lands near about $${withoutFig}; ${withLabel} about $${withFig} — a difference of about $${deltaFig}.`,
  // --- Act-4 · U17 §S5 — the saved record's AGE on the card. ---
  /** The mint year, spoken as a calendar year rather than a day count. It rides a SLOT because the
   *  free-numeral gate (/\d/) reds any digit written into a static `recommend*` line — and because
   *  the year is derived from `record.mintedAt` through the one local-calendar chain, never from a
   *  second clock read. R3 keeps the card to existence + age + standing, so this is the only figure
   *  it ever speaks. */
  recommendRecordSavedIn: (year: number): string => `Saved in ${year}.`,
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
