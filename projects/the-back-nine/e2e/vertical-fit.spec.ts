import { expect, type Locator, type Page } from '@playwright/test'
import { test, REAL, REAL_DPR, PHONE, PHONE_DPR, FINAL_TIER_MS, SETTLED_RESULT, gotoSeedFinal, settleLayout } from './reviewSurface'
// THE SHIPPED CATALOG, never re-typed here (the `e2e/caddie-walk.spec.ts:25` precedent). Every
// string this spec injects or reads back is the one the app ships: a spec-local literal would pin a
// reservation, a clause list or a heading against a fiction, and a re-word that overflowed the real
// box would escape the gate silently (U17 §S5 step 14).
import { copy, slots, workingCostExtras, type TypedBelowAmount } from '../src/ui/copy'

/**
 * THE VERTICAL-FIT GATE'S SURVIVING ARMS (verify:fit; `playwright.fit.config.ts`). Act 6 · RC4 made the shell the home
 * and deleted the old answer page, so this file's answer-page arms left with it (plan docs/plans/6-rightcapital-ui-plan.md,
 * section 5.2): its honesty laws were PORTED to `e2e/rc-screens.spec.ts` on Probability and the home (the state clauses,
 * the date route's words, the re-figuring line over the old answer, the R13 caveat's one visible mount in frame at REAL
 * and its order and reach at the phone and at a 20 px default, the computing frame, the spend lane's landing that moves
 * nothing, the vault returns' gate and their echoed answer, the Odds by stop year chart's aged plant) or are held by the
 * unit suite (the standing line's words and its door's seat: `src/ui/shell/__tests__/staleBanner.test.tsx`; the survivor
 * row and its basis: `probabilityView.test.ts`, `survivorSpendingBasisSeedGate.test.tsx`); its layout arms (the old
 * two-pane's one-frame fit, the recommend-second posture and its seats, the record card's rows, the survivor fold, the
 * band's honesty floor and legend, the widest plants' printed frames) RETIRED with the surface (5.2: an old-layout arm
 * retires; RC7 rebuilds the band's honesty floor and legend on Confidence, RC8 the recommendation's arms on Tax
 * Strategies).
 *
 * What stays binds surfaces that still live: the pay check's standing line on the StaleBanner (its words, its place, the
 * typed-below runs) and its unlock gate. The walk's W step and money picture arms, with their coordinate taps, LEFT with
 * the walk at Act 6 · RC14: their laws live on the Pre-retirement living expenses drawer in `e2e/rc-screens.spec.ts`
 * (RC13b's drawer arms: the stale face, the answered picture, the left-over question, the W period tap and the Keep door
 * tapped right after typing, at the same sizes; RC14's: the gate's refusal at the fork when the stepper's Next refuses,
 * the picture at its fullest on `dateshort`, the refusal witness's one calm line on `datesolo`, and the risen family's
 * note with no figure at the quote).
 */

// ── U12: the AssumptionPanel's own vertical extent — RETIRED at Act 6 · RC18 with the panel (an old-layout arm, plan 5.2):
// Settings is a scrolling page (its first frame and phone order are `e2e/rc-screens.spec.ts`'s "RC18 · Settings" arms),
// and every drawer it opens is the kit's, held inside the window by the RC13 drawer arms. ──────────────────────────────

/** The typed-below line's runs (the whole-window rebuild, `docs/plans/features/typed-below-whole-window-rebuild-spec.md`
 *  KTD6/KTD7, in the walk-9 form council's form, `docs/plans/features/typed-below-walk9-form-build-spec.md`): each working
 *  year this answer's credit beside the credit the answer at today's quote would give, the years grouped into runs, every
 *  figure the engine's own on the seed (U3's witness table, the research record's `witnesses.md`). The line opens on the
 *  counts sentence (no lean in it now), then the moved clause where the host carries it, then the lean as its own
 *  sentence naming the quote in dollars, then the cap sentence (no dollars of the quote, no floor aside). Inside a list a
 *  credit run is TWO paragraphs (its two beats share the first, then the close) and a short run three (the walk-9 form
 *  council's call (1b)); every run's label is its years and ", while you’re still working" (the old "If you’re still
 *  working in …" label is retired on this line); a run's figure follows the one amount rule (one value "$X a year", two
 *  groups each beside its own years, never the old "$X to $Y" range). Every word TYPED BY HAND from the composer's
 *  output (the U2 probe, `probe.out.txt`), never composed from a slot, so a plant in the copy reds the gate too. A run's
 *  words in the order a block draws them, as `innerText` reads them: its label (the run's first `<p>`), then its
 *  paragraphs (one `<p>` each). Every seed and vault this spec walks is `date`'s couple (Alex 58, working; Sam 60,
 *  retired), so the engine can draw a working year with Sam dead and Alex still working (2032–2035, Sam's 66 on), and
 *  the survivor-path build's gate is on (`docs/plans/features/typed-below-survivor-path-build-spec.md`, KTD3/KTD7): the
 *  one-run close, the scoped lead and the short kinds' year subject carry "you’re both alive", and the survivor part
 *  closes every line. `noun` — "This" on the Result, "Your" on the gate (KD9). */
type TypedBelowNoun = 'This' | 'Your'
/** The rider (the walk-9 form council's words: "except for any difference …"), and the gloss its first use on a line
 *  carries inside its period, after a comma, no brackets (KD3, reworded). */
const TB_RIDER = ', except for any difference between the two answers in income tax and Medicare’s income surcharge'
const TB_GLOSS = ', the extra Medicare premium you pay when your income two years before was high'

// ── the pay check's standing line (U8), at his window and the phone ──────────────────────────────────────────────────
const PAY_CHECK_VIEWPORTS = [
  { name: `${REAL.width}×${REAL.height}`, use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
  { name: `phone ${PHONE.width}×${PHONE.height}`, use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true } },
] as const

for (const vp of PAY_CHECK_VIEWPORTS) {
  // ── the U11 walk's (ae): the risen family's longest words. The standing line carries the five-sentence later-short
  //    line here; the W note's year-level lean with no figure at the quote (the red team's attack 4) is the W drawer's
  //    (rc-screens.spec.ts, RC13b and RC14: the walk's W step arm left with the walk). Fix the layout, never cut the
  //    content. ──
  test.describe(`the risen family’s stale words on ?seed=datesavedrisenlater (${vp.name})`, () => {
    test.use(vp.use)

    test('the standing line carries the whole later-short line in place (its door, the W drawer, is rc-screens.spec.ts’s RC13b arm)', async ({ page }) => {
      await gotoSeedFinal(page, 'datesavedrisenlater')
      await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached()
      // A "saved" answer waiting on W: the slot is W's block (`div.note-parts`, council `wf_22858e04-f7a`), still the
      // lead's direct child in the same `.fod-note` register; its words read across the dt/dd as `innerText`.
      const line = page.locator('[data-stale-banner] div.note-parts.cs-paycheck-note')
      await expect(line, 'the standing line renders in the lead').toHaveCount(1)
      await assertStandingBlock(line, 'datesavedrisenlater', `${copy.stalenessPayCheckNote} ${RISEN_LATER_LINE}`, risenResultDoor('105,000'))
      await assertStandingInBanner(page, line, vp.use.viewport.width === PHONE.width)
    })
  })

  // ── the whole-window rebuild's five-span line in the Result's standing slot (walk 8's first added target;
  //    `datesavedtypedpension`): no typed-below seed had a placement arm. An ordered list of five labelled runs under the
  //    cap sentence and the scoped lead, then the survivor part's paragraph (the walk-8 form council's KD7 and KD8), with
  //    no door of its own, its button its last child; the lead's last note and before the graphs (the no-date reading
  //    draws no band, so at PHONE no first graph to sit above), doors last. The date route scrolls, so no one-frame
  //    claim: whether five runs read as a wall is walk 9's read. ──
  test.describe(`the typed-below line’s five spans on ?seed=datesavedtypedpension (${vp.name})`, () => {
    test.use(vp.use)

    test('the block sits in the lead after the other notes, above the graphs, doors last; five labelled spans, its button last', async ({ page }) => {
      await gotoSeedFinal(page, 'datesavedtypedpension')
      await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached()
      const line = page.locator('[data-stale-banner] div.note-parts.cs-paycheck-note')
      await expect(line, 'the typed-below block renders in the lead').toHaveCount(1)
      await assertDoorlessStandingBlock(
        line,
        'datesavedtypedpension',
        typedPensionLine('This', TYPED_MOVED_CLAUSE),
        TYPED_PENSION_RUNS,
        copy.stalenessPayCheckCtaUpdate,
      )
      // ONE CAUSE, ONE LINE: the moved line's own lead never shares the slot this line holds.
      await expect(line).not.toContainText(copy.stalenessLeftOverNote)
      await assertStandingInBanner(page, line, vp.use.viewport.width === PHONE.width)
    })
  })

  // Build 2's left-over seat in the panel, both arms (the seat's face below the W row; "All of it" tapped by coordinate
  // right after typing W) — RETIRED at Act 6 · RC18 with the panel. The same seat lives in the Pre-retirement living
  // expenses drawer, and rc-screens.spec.ts's RC13b arms hold both laws there at both sizes: "?seed=datesaved: the
  // left-over question below the whole picture" and "?seed=date: "All of it" tapped by coordinate right after typing W".
}

// The W period tap and the Keep door tapped right after typing (the h2 cure, `src/intake/gestureHold.ts`) LEFT with the
// walk at Act 6 · RC14: the same coordinate taps on the W face in its drawer are `e2e/rc-screens.spec.ts`'s "RC13b · the
// W period tap right after typing (drawer, …)" and "RC13b · the W note's Keep door tapped right after typing (drawer, …)".

// ── The pay check's unlock lines and its standing line (HEAD :3094-:3999 at 95c715e19, restored in RC4a and
// re-pointed: the gate is `ReEntry.tsx`, kept; the standing line rides the StaleBanner above the home since RC4; its
// door opens the Pre-retirement living expenses drawer since RC13b). ───────────────────────────────────────────────────────────────────────────
const STALE_W_QUOTE = slots.workingCostStaleQuote('84,000', '78,000')
/** The Result door's cost list: the W help's own items. No seed here carries a budget or a priced state, so the
 *  state-tax item rides after the local-tax one. */
const STALE_W_EXTRAS = workingCostExtras(true)
/** The gate's door words (`section.reentry-door`), on EVERY stale arm where the tab can save: the heading, the scope
 *  sentence (neither gate button changes the figure; the affirm button's description), and the route (where each
 *  leads, naming the Result door's own label) — "confirm or change" where the spending fell (the W row's Keep door is
 *  real), "update" where it rose past the yes. */
interface GateDoorWords {
  readonly heading: string
  readonly scope: string
  readonly route: string
}
const CONFIRM_GATE_DOOR: GateDoorWords = {
  heading: slots.workingCostStaleDoorHeadingConfirm('84,000'),
  scope: slots.workingCostStaleGateScopeConfirm('84,000'),
  route: slots.workingCostStaleGateRoute(copy.stalenessPayCheckCta),
}
const UPDATE_GATE_DOOR: GateDoorWords = {
  heading: slots.workingCostStaleDoorHeadingUpdate('84,000'),
  scope: slots.workingCostStaleGateScopeUpdate('84,000'),
  route: slots.workingCostStaleGateRoute(copy.stalenessPayCheckCtaUpdate),
}
/** The Result's door (its last dt/dd), for a "saved" answer waiting on W: the heading (the gate's, word for word), the
 *  sentences before the list, the list, the sentences after it, and the button's label (the dd's last child). */
interface ResultDoorWords {
  readonly heading: string
  readonly lead: readonly string[]
  readonly items: readonly string[]
  readonly tail: readonly string[]
  readonly cta: string
}
const resultDoorText = (d: ResultDoorWords): string => [d.heading, ...d.lead, ...d.items, ...d.tail].join(' ')
// Council `wf_7fa86902-35c` (U11 walk 4), drawn as a block since `wf_22858e04-f7a`: a "saved" answer waiting on W
// reads, after its note, a lead, "This answer now" (after work it already uses the spending, the stored $16,985
// dated, why none of it is added, in the act's verb, and — where `none` does not already say it — why no smaller
// amount either), and on the risen arms "If a working year costs $X". No budget on these seeds, so the after-work
// figure is exact (no "about").
const savedNow = (spending: string, none: string, why?: string): readonly string[] => [
  copy.workingCostStaleLabelNow,
  slots.workingCostStaleAfterWork(spending, true),
  slots.workingCostStaleLeftOverAnswered('16,985'),
  none,
  ...(why === undefined ? [] : [why]),
]
const STALE_W_SAVED_LINE = [
  STALE_W_QUOTE,
  copy.workingCostStaleEitherWayConfirm,
  ...savedNow('78,000', slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'), copy.workingCostStaleNoGuess),
].join(' ')
/** The fallen arm's Result door ("confirm or change"): the hold sentence ends on the list; after it, the $6,000 the
 *  held figure leaves above the $78,000 quote, the press sentence, then each choice with its condition first. */
const STALE_W_SAVED_RESULT_DOOR: ResultDoorWords = {
  heading: CONFIRM_GATE_DOOR.heading,
  lead: [copy.workingCostStaleDoorHold],
  items: STALE_W_EXTRAS,
  tail: [
    slots.workingCostStaleDoorMore('84,000', '6,000', '78,000'),
    slots.workingCostStaleResultDoorConfirm(copy.stalenessPayCheckCta),
    // U11 walk 8's W8-R12 (c): the none choice first, then Keep for some costs within the room.
    slots.workingCostStaleDoorYesFirst('78,000'),
    slots.workingCostStaleDoorKeepUpTo(slots.workingCostKeepYearly('84,000'), '6,000'),
    slots.workingCostStaleDoorNoPlus('78,000', false),
  ],
  cta: copy.stalenessPayCheckCta,
}
const LEFT_OVER_MOVED_SENTENCE = slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')
const LEFT_OVER_MOVED_GATE_LINE = `${copy.stalenessLeftOverNote} ${LEFT_OVER_MOVED_SENTENCE} ${copy.stalenessLeftOverGateDoor}`
// The U11 walk's (ae): the risen family's W line — W's sentence, the lean, then the tail by what a check at the quote
// does. Year 0 at the quote, by hand from `date`'s sum above with W at the quote: $10,985 at $90,000 (capped, no later
// short year: the lean is the left over reading $6,000 high, U11 walk 6's R2); −$4,015 at $105,000 (first short);
// $5,985 there with `datesavedrisenlater`'s $10,000 of untaxed alimony, whose end at Sam's 62 makes 2029 the short
// arm's −$4,015 again (later short). The later-short line is the LONGEST stale line any seed draws (with its gain years
// and its short run), so its arm is the gate's wrap-risk arm. After work the answer uses the risen spending figure,
// which on these seeds IS the quote (no budget).
/** The survivor part closing each risen line (U11 walk 8's W8-R12 (a)): the survivor rule counts 75 % of each figure on
 *  these seeds (Sam can die from 2032 while Alex works; no budget, no medical held whole), its close glossed (the line's
 *  first rider). Before the Result's door; the gate's door is its own section. W's out-of-date line names the two answers
 *  beside their figures (the walk-9 form council's call (4): `names: 'answers'` — "$63,000 in this answer at your figure
 *  …, and $67,500 in the answer at your spending …"), since it compares them in dollars nowhere else. */
const staleSurvivorWords = (quote: string, chargeAtQuote: string, most: string): readonly string[] => [
  slots.workingCostTypedBelowSurvivorCharges({ typed: '84,000', quote, source: 'spending', names: 'answers' }, ['63,000', chargeAtQuote]),
  slots.workingCostTypedBelowSurvivorLess({ typed: '84,000', quote, source: 'spending', names: 'answers' }, most, 2),
]
/** The short run at $105,000 on B and C, in the one amount rule (the walk-9 form council's call (1), flip (iii)): two
 *  groups, each figure beside its own years — $4,015 until Sam's Medicare starts, then $3,652 from 2031 (the U11 walk 2
 *  probe's money picture at the quote) — never the old "$3,652 to $4,015" range. B's run starts in 2026, C's in 2029. */
const risenShortRun = (firstYear: number): TypedBelowAmount => ({
  kind: 'two',
  groups: [
    { figure: '4,015', firstYear, lastYear: 2030 },
    { figure: '3,652', firstYear: 2031, lastYear: 2032 },
  ],
})
const risenNow = (quoteNow: string): readonly string[] =>
  savedNow(quoteNow, slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000'), slots.workingCostStaleNoSmallerAmount(quoteNow))
const RISEN_LINE = [
  slots.workingCostStaleQuote('84,000', '90,000'),
  slots.workingCostStaleLeftOverInflated('84,000', '6,000', '90,000', true),
  copy.workingCostStaleEitherWayUpdate,
  ...risenNow('90,000'),
  slots.workingCostStaleLabelIf('90,000'),
  slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false),
  slots.workingCostStaleEachDollar('90,000', '10,985'),
  // The extra a lower figure counts: the stored $16,985 less year 0's $10,985 at the quote (U11 walk 7's R6 (a)).
  slots.workingCostStaleLowerAddsMore('90,000', '10,985', '6,000', '16,985'),
  ...staleSurvivorWords('90,000', '67,500', '4,500'),
].join(' ')
const RISEN_SHORT_LINE = [
  slots.workingCostStaleQuote('84,000', '105,000'),
  slots.workingCostStaleLeftOverYearsCheaper('84,000'),
  slots.workingCostStaleShortUntilUpdated('84,000'),
  ...savedNow('105,000', slots.workingCostStaleLeftOverNoneNow('16,985', '84,000')),
  slots.workingCostStaleLabelIf('105,000'),
  slots.workingCostStaleLeftOverIfFirstShortRun(2026, 2032, risenShortRun(2026), '105,000', '84,000', '16,985', true),
  copy.workingCostStaleLowerCounts,
  ...staleSurvivorWords('105,000', '78,750', '15,750'),
].join(' ')
const RISEN_LATER_LINE = [
  slots.workingCostStaleQuote('84,000', '105,000'),
  slots.workingCostStaleLeftOverYearsCheaper('84,000'),
  copy.workingCostStaleEitherWayUpdate,
  ...risenNow('105,000'),
  slots.workingCostStaleLabelIf('105,000'),
  slots.workingCostStaleLeftOverIfCapped('5,985', 2026, '105,000', true),
  slots.workingCostStaleLeftOverGainYears(2026, 2028, 2033),
  slots.workingCostStaleEachDollar('105,000', '5,985'),
  slots.workingCostStaleShortLaterYears(2029, 2032, risenShortRun(2029), '84,000', true),
  slots.workingCostStaleLowerCountsMore('16,985'),
  ...staleSurvivorWords('105,000', '78,750', '15,750'),
].join(' ')
/** The risen arms' Result door ("update": no Keep door below the quote): the press sentence and the condition, ending
 *  on the list; after it, that the tool counts them only if added, then "Yes" at today's quote. */
const risenResultDoor = (quoteNow: string): ResultDoorWords => ({
  heading: UPDATE_GATE_DOOR.heading,
  lead: [slots.workingCostStaleResultDoorUpdate(copy.stalenessPayCheckCtaUpdate), slots.workingCostStaleDoorIfUpdate(quoteNow, false)],
  items: STALE_W_EXTRAS,
  tail: [copy.workingCostStaleDoorCounted, slots.workingCostStaleDoorYes(quoteNow)],
  cta: copy.stalenessPayCheckCtaUpdate,
})
/** The sheet the Result's W door opens, on an arm whose held figure sits BELOW today's quote: "Yes" offered, no Keep
 *  door (ruling 34). Above the quote (the fallen arms) Keep is drawn too, its condition above it. */
const UPDATE_SHEET = { cta: copy.stalenessPayCheckCtaUpdate, keep: null } as const
const CONFIRM_SHEET = { cta: copy.stalenessPayCheckCta, keep: slots.workingCostKeepYearly('84,000') } as const
const risenUnlock = (key: string, line: string, quoteNow: string) =>
  ({
    key,
    note: `${copy.stalenessPayCheckGateLead} ${line}`,
    gateDoor: UPDATE_GATE_DOOR,
    sibling: copy.stalenessLeftOverNote,
    standing: `${copy.stalenessPayCheckNote} ${line}`,
    resultDoor: risenResultDoor(quoteNow),
    dated: false,
    sheet: UPDATE_SHEET,
    readback: null,
  }) as const
/** Council `wf_22858e04-f7a` (6)'s read-back: `datesavedfourbuckets`' four bucket rows in bucket order, then both
 *  people's benefit rows — the tallest read-back a gate draws, by name. */
const FOUR_BUCKET_READBACK = [
  copy.reentryBucketPretax,
  copy.reentryBucketRoth,
  copy.reentryBucketTaxable,
  copy.reentryBucketHsa,
  'Alex',
  'Sam',
] as const
/** The typed-below line's runs (the whole-window rebuild, `docs/plans/features/typed-below-whole-window-rebuild-spec.md`
 *  KTD6/KTD7, in the walk-9 form council's form, `docs/plans/features/typed-below-walk9-form-build-spec.md`): each working
 *  year this answer's credit beside the credit the answer at today's quote would give, the years grouped into runs, every
 *  figure the engine's own on the seed (U3's witness table, the research record's `witnesses.md`). The line opens on the
 *  counts sentence (no lean in it now), then the moved clause where the host carries it, then the lean as its own
 *  sentence naming the quote in dollars, then the cap sentence (no dollars of the quote, no floor aside). Inside a list a
 *  credit run is TWO paragraphs (its two beats share the first, then the close) and a short run three (the walk-9 form
 *  council's call (1b)); every run's label is its years and ", while you’re still working" (the old "If you’re still
 *  working in …" label is retired on this line); a run's figure follows the one amount rule (one value "$X a year", two
 *  groups each beside its own years, never the old "$X to $Y" range). Every word TYPED BY HAND from the composer's
 *  output (the U2 probe, `probe.out.txt`), never composed from a slot, so a plant in the copy reds the gate too. A run's
 *  words in the order a block draws them, as `innerText` reads them: its label (the run's first `<p>`), then its
 *  paragraphs (one `<p>` each). Every seed and vault this spec walks is `date`'s couple (Alex 58, working; Sam 60,
 *  retired), so the engine can draw a working year with Sam dead and Alex still working (2032–2035, Sam's 66 on), and
 *  the survivor-path build's gate is on (`docs/plans/features/typed-below-survivor-path-build-spec.md`, KTD3/KTD7): the
 *  one-run close, the scoped lead and the short kinds' year subject carry "you’re both alive", and the survivor part
 *  closes every line. `noun` — "This" on the Result, "Your" on the gate (KD9). */
/** The counts sentence, naming the host's answer (KD9), at the typed $84,000 — no lean in it now (call (2)). */
const tbCounts = (noun: TypedBelowNoun, quote: string): string =>
  `${noun} answer counts a working year at your own figure of $84,000 a year, below your spending of $${quote} a year.`
/** The lean, its own sentence after the counts sentence (and after the moved clause where the host carries it), naming
 *  the quote in dollars and the host's answer: the one home for the quote's dollars on the line. */
const tbLean = (noun: TypedBelowNoun, quote: string): string =>
  `A working year almost always costs at least your spending of $${quote} a year, so ${noun === 'This' ? 'this' : 'your'} answer can look better than it really is.`
/** The cap sentence (KD5): year 0 at the spending leaves less over than the stored $16,985, so that is the answer there's
 *  cap. The lean above names the quote's dollars, so the cap says "At your spending" alone, with no floor aside (W8-R8's
 *  aside retired by the walk-9 form council's call (2)). */
const tbCap = (leftOver: string): string =>
  `At your spending, your first working year would have $${leftOver} left over, so the answer at that spending would add at most $${leftOver} in any working year.`
/** The scoped lead over two or more runs, on every host under the survivor gate ("each answer": every run states both). */
const TB_LEAD = 'What each answer adds to your savings in each working year you’re both alive:'
/** A run's label: its years, then ", while you’re still working", on EVERY run (the walk-9 form council's call (3)). */
const tbLabel = (years: string): string => `${years}, while you’re still working`
/** A run as `innerText` reads it: its label, then its paragraphs. */
const tbRun = (years: string, paras: readonly string[]): string => [tbLabel(years), ...paras].join(' ')
/** A `bothCredit` run at the typed $84,000 under the $105,000 spending, inside a list: TWO paragraphs (call (1b)) — its
 *  two beats share the first (the answer there adds at most `atQuote`, this answer $16,985, neither restating the
 *  spending's dollars nor "to your savings", which the lead says), then the close "At your spending, that’s `less`",
 *  glossed on the line's first rider only. `atQuote` and `less` in the one amount rule, as the probe prints them. */
const tmCreditRun = (noun: TypedBelowNoun, years: string, atQuote: string, less: string, glossed: boolean): string =>
  tbRun(years, [
    `The answer at your spending would add at most ${atQuote}. ${noun} answer adds at most $16,985 a year.`,
    `At your spending, that’s ${less}${TB_RIDER}${glossed ? TB_GLOSS : ''}.`,
  ])
/** A `shortLeftOverAtTyped` run at the typed $84,000 under the $105,000 spending, several years: three paragraphs — the
 *  shortfall the spending takes from savings and its nothing, the ruled clause ("Your figure", its dollars said once
 *  above in the counts sentence) and this answer's $16,985, then "at most" the difference. `short` and `less` in the
 *  one amount rule. */
const tmShortRun = (noun: TypedBelowNoun, years: string, short: string, less: string): string =>
  tbRun(years, [
    `At your spending, each working year you’re both alive comes up ${short}, which would be taken from your savings, and the answer at that spending would add nothing.`,
    `Your figure leaves those shortfalls out of ${noun === 'This' ? 'this' : 'your'} answer, which adds at most $16,985 a year.`,
    `At your spending, that’s at most ${less}${TB_RIDER}.`,
  ])
/** …and one year: "that working year, if you’re both alive,", "that shortfall", no "a year" on its credit or difference
 *  (W8-R5 (c)). */
const tmShortYear = (noun: TypedBelowNoun, year: number, short: string, less: string): string =>
  tbRun(`${year}`, [
    `At your spending, that working year, if you’re both alive, comes up $${short} short, which would be taken from your savings, and the answer at that spending would add nothing.`,
    `Your figure leaves that shortfall out of ${noun === 'This' ? 'this' : 'your'} answer, which adds at most $16,985.`,
    `At your spending, that’s at most $${less} less in your savings${TB_RIDER}.`,
  ])
/** The survivor part (the survivor-path build's KTD5; its form the walk-8 council's KD7): after the runs' list (or
 *  closing the one paragraph of a one-run line), the two survivor charges, then the close with X, "at most". Each seed's
 *  figures by hand (DND 012), never through the engine's `workingYearCostForYear`: no seed here carries a budget, so the
 *  survivor rule charges the app's default survivor ratio (0.75, `src/shared/appDefaults.ts`) of each W — $84,000 × 0.75
 *  = $63,000 at the typed figure; $90,000 × 0.75 = $67,500 and $105,000 × 0.75 = $78,750 at the spending — and X is
 *  their difference: $4,500 on `datesavedtyped`, $15,750 on TM and the pension household (`survivorCharges` form: a ratio
 *  below 1 never spans the whole gap). It opens "In a working year with only one of you alive," (the walk-9 form
 *  council's call (4); the old "If only one of you is alive in a working year" opener is retired) and, on this line,
 *  names no answer beside its figures (`names: 'none'`: the runs above already named each). */
const SURVIVOR_A =
  'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $67,500 at your spending of $90,000 a year. ' +
  `At your spending, that’s at most $4,500 a year less in your savings${TB_RIDER}.`
const SURVIVOR_TM =
  'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year. ' +
  `At your spending, that’s at most $15,750 a year less in your savings${TB_RIDER}.`
/** U11 walk 6's R1 on `datesavedtyped` (`datesavedrisen` with its old $84,000 TYPED back in, fresh): the typed-below
 *  line, "Your" on the gate and "This" on the Result — the counts sentence, the lean ($90,000), the cap sentence (year 0
 *  at $90,000 leaves $10,985), then its ONE run over the whole window (A: $16,985 against $10,985 in every year,
 *  2026–2035), folded into the opening as a plain paragraph with no label. A's at-spending figure IS the cap, so the run
 *  drops its first beat (T's twin, the walk-9 form council's call (2)) and its close carries the survivor scope ("$6,000
 *  less in your savings in each working year you’re both alive"); the survivor part's two sentences close the same
 *  paragraph ($63,000 and $67,500; $4,500). Its door is the update act's, naming the same $84,000. */
const typedBelowLine = (noun: TypedBelowNoun): string =>
  [
    tbCounts(noun, '90,000'),
    tbLean(noun, '90,000'),
    tbCap('10,985'),
    `${noun} answer adds at most $16,985 a year to your savings.`,
    `At your spending, that’s $6,000 less in your savings in each working year you’re both alive${TB_RIDER}${TB_GLOSS}.`,
    SURVIVOR_A,
  ].join(' ')
/** A run's shape in the runs' ordered list: its label, and how many paragraphs follow it — two for a credit run (its
 *  beats share the first), three for a short run (the walk-9 form council's call (1b)). */
interface TypedBelowRunShape {
  readonly label: string
  readonly paras: 2 | 3
}
/** The walk-6 round review's pair on `datesavedtypedmoved` (`datesavedrisenlater` with its old $84,000 TYPED back in, the
 *  left over moved to $26,985 at it): R1's line as a block of three runs (TM: 2026 through 2028, $16,985 against $5,985;
 *  the 2029–2032 run short at $105,000, $4,015 in 2029 through 2030 and $3,652 in 2031 through 2032; 2033 through 2035,
 *  $16,985 against $5,985 — the years the old year-0 line called $762), every run's label its years "while you’re still
 *  working". The moved clause after the counts sentence (`middle`) on BOTH hosts here: on the Result, and on the gate,
 *  where no rules line fires on this vault, so since the walk-9 form council's call (1a) the typed-below line carries it
 *  and no moved note of its own is drawn. Then the lean, the cap sentence ($5,985) and the scoped lead; the survivor part
 *  ($63,000 and $78,750; $15,750) follows the runs' list as its own paragraph (KD7). */
const TYPED_MOVED_RUNS: readonly TypedBelowRunShape[] = [
  { label: tbLabel('2026 through 2028'), paras: 2 },
  { label: tbLabel('2029 through 2032'), paras: 3 },
  { label: tbLabel('2033 through 2035'), paras: 2 },
]
const typedMovedLine = (noun: TypedBelowNoun, middle: string | null): string =>
  [
    tbCounts(noun, '105,000'),
    ...(middle === null ? [] : [middle]),
    tbLean(noun, '105,000'),
    tbCap('5,985'),
    TB_LEAD,
    tmCreditRun(noun, '2026 through 2028', '$5,985 a year', '$11,000 a year less in your savings', true),
    tmShortRun(
      noun,
      '2029 through 2032',
      '$4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032',
      '$21,000 less in your savings in 2029 through 2030 and $20,637 less in 2031 through 2032',
    ),
    tmCreditRun(noun, '2033 through 2035', '$5,985 a year', '$11,000 a year less in your savings', false),
    SURVIVOR_TM,
  ].join(' ')
/** The rebuild's five-run household on `datesavedtypedpension` (`datesavedrisenlater` plus Sam's $9,000 pension at 64
 *  and 65, the old $84,000 typed back in): the pension lifts 2030 and 2031 above $0 at $105,000, so its short years at
 *  the quote split into two one-year runs, 2029 and 2032 ("that working year", "that shortfall"), around a 2030–2031
 *  credit run whose figures differ by year, so each is said beside its own year (the one amount rule's two groups: "$3,005
 *  in 2030 and $3,368 in 2031", then "$13,980 less in your savings in 2030 and $13,617 less in 2031"). Saved-moved as TM
 *  is (year 0 $26,985 at the typed figure), so the same `middle` on both hosts and no moved note on the gate; the
 *  survivor scope and the survivor part as on TM (the same W pair). */
const TYPED_PENSION_RUNS: readonly TypedBelowRunShape[] = [
  { label: tbLabel('2026 through 2028'), paras: 2 },
  { label: tbLabel('2029'), paras: 3 },
  { label: tbLabel('2030 through 2031'), paras: 2 },
  { label: tbLabel('2032'), paras: 3 },
  { label: tbLabel('2033 through 2035'), paras: 2 },
]
const typedPensionLine = (noun: TypedBelowNoun, middle: string | null): string =>
  [
    tbCounts(noun, '105,000'),
    ...(middle === null ? [] : [middle]),
    tbLean(noun, '105,000'),
    tbCap('5,985'),
    TB_LEAD,
    tmCreditRun(noun, '2026 through 2028', '$5,985 a year', '$11,000 a year less in your savings', true),
    tmShortYear(noun, 2029, '4,015', '21,000'),
    tmCreditRun(noun, '2030 through 2031', '$3,005 in 2030 and $3,368 in 2031', '$13,980 less in your savings in 2030 and $13,617 less in 2031', false),
    tmShortYear(noun, 2032, '3,652', '20,637'),
    tmCreditRun(noun, '2033 through 2035', '$5,985 a year', '$11,000 a year less in your savings', false),
    SURVIVOR_TM,
  ].join(' ')
/** The moved clause the typed-below line carries on TM and the pension household, on the Result and on the gate (no rules
 *  line hosts it on either vault), in W8-R5 (b)'s words: "all the money left over in a working year", never the
 *  referent-less "all of it". */
const TYPED_MOVED_CLAUSE =
  'You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.'
/** The moved note's own three parts as the gate WOULD draw them were the clause not carried (its lead, its sentence, its
 *  door sentence), read off the live copy so the negative aims at live words (insight 086): on TM and the pension
 *  vault none of them may be drawn — the line carries the fact, one cause, one line. */
const TYPED_MOVED_OWN_NOTE_PARTS = [
  copy.stalenessLeftOverNote,
  slots.stalenessLeftOverMovedAt('84,000', '16,985', '26,985', '16,985'),
  copy.stalenessLeftOverGateDoor,
] as const
/** The gate's door where the typed-below line carries the moved clause: the update act's heading and route, and the
 *  scope sentence naming the moved fact's noun too (the walk-9 form council's call (1a): the moved note's door sentence
 *  moves into it). The scope typed by hand from the probe (`workingYearCostTypedBelowDoor(d, true)`). */
const TYPED_MOVED_GATE_DOOR: GateDoorWords = {
  ...UPDATE_GATE_DOOR,
  scope: 'Neither button on this page updates your $84,000 figure or what you said about the money left over; both lead to where you can.',
}
/** `note` — the gate's one note (its text, read as `innerText`; every arm draws exactly one since the walk-9 form
 *  council's call (1a): the typed-and-moved arms' line carries the moved clause, and the second note they once drew, the
 *  moved line of its own, is gone). `carriesMoved` — the moved clause the gate's ONE note carries after its counts
 *  sentence, where the typed-below line hosts the moved fact: the arm then proves the clause is in that note and that
 *  none of the moved note's own parts is drawn anywhere on the gate. `gateDoor` — the gate's door section, or `null`
 *  where none is drawn (W not stale). `standing` — the Result's standing-slot lead and line (before its door), or `null`
 *  where the answer carries none (the fresh-vintage `wyclock`). `resultDoor` — the standing slot's door as its last
 *  dt/dd (the block), or `null` where the slot is its old `<p>` with the button inline — or, with `standingRuns`, a
 *  block with NO door (the typed-below line at two or more runs: its runs' labels in order in the ordered list, each
 *  with its paragraph count, the survivor part's paragraph after it, its button the block's last child). `dated` — whether the affirm
 *  lands a crowned date (`assertResolvedDate`) or the no-date reading (`assertNoDateReading`). `sheet` — the Result
 *  door that opens the panel at the W row, and the Keep door's label there (`null` where none is drawn), or `null`
 *  where the slot opens no W row. `readback` — the gate's read-back labels in order, where the arm pins them. */
const PAY_CHECK_UNLOCKS: readonly {
  readonly key: string
  readonly note: string
  readonly carriesMoved?: string
  readonly gateDoor: GateDoorWords | null
  readonly sibling: string
  readonly standing: string | null
  readonly resultDoor: ResultDoorWords | null
  readonly standingRuns?: readonly TypedBelowRunShape[]
  readonly dated: boolean
  readonly sheet: { readonly cta: string; readonly keep: string | null } | null
  readonly readback: readonly string[] | null
}[] = [
  {
    key: 'wyclock',
    note: copy.stalenessWorkingYears,
    gateDoor: null,
    sibling: copy.stalenessPayCheckGateLead,
    standing: null,
    resultDoor: null,
    dated: true,
    sheet: null,
    readback: null,
  },
  {
    key: 'datecoststale',
    note: `${copy.stalenessPayCheckGateLead} ${STALE_W_QUOTE}`,
    gateDoor: CONFIRM_GATE_DOOR,
    sibling: copy.stalenessWorkingYears,
    standing: `${copy.stalenessPayCheckNote} ${STALE_W_QUOTE}`,
    resultDoor: null,
    dated: true,
    sheet: CONFIRM_SHEET,
    readback: null,
  },
  {
    key: 'datesavedstale',
    note: `${copy.stalenessPayCheckGateLead} ${STALE_W_SAVED_LINE}`,
    gateDoor: CONFIRM_GATE_DOOR,
    sibling: copy.stalenessLeftOverNote,
    standing: `${copy.stalenessPayCheckNote} ${STALE_W_SAVED_LINE}`,
    resultDoor: STALE_W_SAVED_RESULT_DOOR,
    dated: true,
    sheet: CONFIRM_SHEET,
    readback: null,
  },
  {
    key: 'datesavedmoved',
    note: LEFT_OVER_MOVED_GATE_LINE,
    gateDoor: null,
    sibling: copy.stalenessPayCheckGateLead,
    standing: `${copy.stalenessLeftOverNote} ${LEFT_OVER_MOVED_SENTENCE}`,
    resultDoor: null,
    dated: true,
    // Its door opens the left-over seat, never the W row (its own arm above pins where it lands).
    sheet: null,
    readback: null,
  },
  risenUnlock('datesavedrisen', RISEN_LINE, '90,000'),
  risenUnlock('datesavedrisenshort', RISEN_SHORT_LINE, '105,000'),
  risenUnlock('datesavedrisenlater', RISEN_LATER_LINE, '105,000'),
  // Council (6)'s four-bucket arm: `datesavedrisenlater` plus a brokerage and an HSA that take no deposit, so its words
  // are that seed's (devSeeds.test.ts pins the identity) — the longest stale line under the tallest read-back, and it
  // still crowns no date (measured at the final tier, b9-4: the top rung's lower bound 0.77, against 0.74 without the
  // two accounts).
  { ...risenUnlock('datesavedfourbuckets', RISEN_LATER_LINE, '105,000'), readback: FOUR_BUCKET_READBACK },
  // R1: a fresh typed W has no stale line, so W's gate lead stays dark; its own line and door speak instead, and the
  // Result's slot keeps it in W's plain form (the update button inline). It crowns about 9 years out (U11 walk 6's
  // R1 measurement, draft b).
  {
    key: 'datesavedtyped',
    note: typedBelowLine('Your'),
    gateDoor: UPDATE_GATE_DOOR,
    sibling: copy.stalenessPayCheckGateLead,
    standing: typedBelowLine('This'),
    resultDoor: null,
    dated: true,
    sheet: UPDATE_SHEET,
    readback: null,
  },
  // The pair (b9-5): R1's line and the moved fact on one gate — the tallest R1 gate — each figure naming what it rests on.
  // Since the walk-9 form council's call (1a), with no rules line fired on this vault, the typed-below line CARRIES the
  // moved clause after its counts sentence on the gate as on the Result, the moved note of its own is not drawn (one
  // note), and the gate door's scope sentence names the moved fact's noun. No date within the window (the final tier's top
  // rung 0.80, b9-5's probe, against `datesavedrisenlater`'s 0.74). Since the whole-window rebuild R1's line is a block of
  // three labelled runs on both hosts, the Result's with no door of its own (its button the block's last child); since the
  // walk-8 form council, an ordered list under the cap sentence and the scoped lead, the survivor part its paragraph after.
  {
    key: 'datesavedtypedmoved',
    note: typedMovedLine('Your', TYPED_MOVED_CLAUSE),
    carriesMoved: TYPED_MOVED_CLAUSE,
    gateDoor: TYPED_MOVED_GATE_DOOR,
    sibling: copy.stalenessPayCheckGateLead,
    standing: typedMovedLine('This', TYPED_MOVED_CLAUSE),
    resultDoor: null,
    standingRuns: TYPED_MOVED_RUNS,
    dated: false,
    sheet: UPDATE_SHEET,
    readback: null,
  },
  // The rebuild's five-run household (walk 8's first added target): the longest R1 line, five labelled runs on the
  // gate above the decision pair, carrying the moved clause as TM's does (call (1a): no moved note of its own). No date
  // within the window on either tier (probed node-side through the app's own date search, b9-1: `no-date-in-window` on
  // the floor and lifestyle tracks, provisional and final).
  {
    key: 'datesavedtypedpension',
    note: typedPensionLine('Your', TYPED_MOVED_CLAUSE),
    carriesMoved: TYPED_MOVED_CLAUSE,
    gateDoor: TYPED_MOVED_GATE_DOOR,
    sibling: copy.stalenessPayCheckGateLead,
    standing: typedPensionLine('This', TYPED_MOVED_CLAUSE),
    resultDoor: null,
    standingRuns: TYPED_PENSION_RUNS,
    dated: false,
    sheet: UPDATE_SHEET,
    readback: null,
  },
]

/** The standing slot drawn as a block (W's stale line for a "saved" answer): still one `.cs-paycheck-note`, now
 *  `div.note-parts`; its lead and line, then the door's heading, every list item, the tail, in order (`innerText`); the
 *  door's dt is the gate's heading word for word; and the door's button is the dd's LAST child, by its label. */
async function assertStandingBlock(standing: Locator, who: string, lineText: string, door: ResultDoorWords): Promise<void> {
  await expect(standing, `${who}: the standing slot is drawn as a block`).toHaveClass(/(^|\s)note-parts(\s|$)/)
  await expect(standing, `${who}: the standing slot speaks its line, then its door, in order`).toContainText(
    `${lineText} ${resultDoorText(door)}`,
    { useInnerText: true },
  )
  const doorPart = standing.locator('.note-parts__door')
  await expect(doorPart, `${who}: exactly one door, the block's last dt/dd`).toHaveCount(1)
  await expect(doorPart.locator('dt')).toHaveText(door.heading)
  await expect(doorPart.locator('li'), `${who}: the door's cost list, every item in order`).toHaveText([...door.items])
  const last = await doorPart.locator('dd').evaluate((dd) => {
    const el = dd.lastElementChild
    return el === null ? null : { tag: el.tagName, text: el.textContent ?? '' }
  })
  expect(last, `${who}: the door's button is the dd's last child`).toEqual({ tag: 'BUTTON', text: door.cta })
  await assertLabelType(standing, who)
  // Council (4): the door's button is a block button at least 44 px tall — jsdom loads no stylesheet, so only a real
  // browser can hold it (the walk-6 round review's L4-4: without `min-height` it fell to 24 px at his window).
  const button = await doorPart.locator('dd > button').boundingBox()
  expect(button, `${who}: the door's button has no box`).not.toBeNull()
  expect(button!.height, `${who}: the door's button is at least 44 px tall`).toBeGreaterThanOrEqual(44)
}

/** The typed-below block's parts, on any host (the walk-8 form council's KD7 and KD8,
 *  `docs/plans/features/typed-below-walk8-form-build-spec.md`, in the walk-9 form council's form): the opening `<p>`, then
 *  the runs as ONE ordered list (`ol.note-parts__runs`, `role="list"`, one `li.note-parts__run` per run, its years its
 *  label in time order, then its paragraphs, one `<p>` each — two on a credit run, whose beats share the first, three on
 *  a short run: call (1b)), then the survivor part as its own paragraph after the list (`p.note-parts__closing`: a
 *  condition over the runs, never one more of them), and last, where the host passes one, its button. No description
 *  list (the coda's `dl` is gone), no door part, no heading, no table. Then the form's CSS, read in the browser against
 *  its tokens (below). Every block here carries the survivor part: every typed-below seed and vault this spec walks opens
 *  the survivor gate (the runs' docblock). */
async function assertTypedBelowParts(block: Locator, who: string, runShapes: readonly TypedBelowRunShape[], withButton: boolean): Promise<void> {
  const runs = block.locator(':scope > ol.note-parts__runs')
  await expect(runs, `${who}: the runs are one ordered list`).toHaveCount(1)
  await expect(runs, `${who}: the list stays a list in the accessibility tree`).toHaveAttribute('role', 'list')
  await expect(runs.locator(':scope > li.note-parts__run'), `${who}: one item per run`).toHaveCount(runShapes.length)
  await expect(runs.locator(':scope > li > p.note-parts__label'), `${who}: each run's years are its label, in time order`).toHaveText(
    runShapes.map((r) => r.label),
  )
  const shapes = await runs.evaluate((ol) => [...ol.children].map((li) => [...li.children].map((c) => `${c.tagName.toLowerCase()}.${c.className}`).join(' ')))
  expect(shapes, `${who}: a run is its label, then its paragraphs, one <p> each — two on a credit run, three on a short run (call (1b))`).toEqual(
    runShapes.map((r) => ['p.note-parts__label', ...Array.from({ length: r.paras }, () => 'p.note-parts__para')].join(' ')),
  )
  const closing = block.locator(':scope > p.note-parts__closing')
  await expect(closing, `${who}: the survivor part is its own paragraph after the list`).toHaveCount(1)
  await expect(closing, `${who}: the survivor part opens on its condition`).toHaveText(/^In a working year with only one of you alive, /)
  await expect(runs, `${who}: the survivor part is never one more run`).not.toContainText('only one of you alive')
  await expect(block.locator('dl, h1, h2, h3, h4, h5, h6, table'), `${who}: no description list, heading or table in the block`).toHaveCount(0)
  await expect(block.locator('.note-parts__door'), `${who}: the typed-below block carries no door part`).toHaveCount(0)
  const order = await block.evaluate((el) =>
    [...el.children].map((c) =>
      c.matches('p.note-parts__opening')
        ? 'opening'
        : c.matches('ol.note-parts__runs')
          ? 'runs'
          : c.matches('p.note-parts__closing')
            ? 'closing'
            : c.tagName.toLowerCase(),
    ),
  )
  expect(order, `${who}: the opening, the runs, the survivor part after them${withButton ? ', the button last' : ''}`).toEqual([
    'opening',
    'runs',
    'closing',
    ...(withButton ? ['button'] : []),
  ])
  // THE FORM'S CSS, in a real browser (jsdom loads no stylesheet, so no unit test can see it; `noteParts.css`, KD8): the
  // list draws no marker and no indent or margin of its own; a run's paragraphs stand --space-2 apart, its first flush
  // under the label; the survivor part stands --space-5 off the list (the walk-9 form council's call (4), was --space-4);
  // the label keeps base.css's figure law, tabular LINING numerals (KD8 deleted a restatement that set tabular-nums alone
  // and so dropped lining-nums). Each spacing is read against its token as this document resolves it, never a pixel
  // number typed here; a bare `ol` drawn for the moment of the read proves the list's none and zeros are the
  // stylesheet's, not the browser's defaults.
  const css = await block.evaluate((el) => {
    const root = getComputedStyle(document.documentElement)
    const rem = parseFloat(root.fontSize)
    const [space2, space5] = [root.getPropertyValue('--space-2').trim(), root.getPropertyValue('--space-5').trim()].map((t) =>
      t.endsWith('rem') ? parseFloat(t) * rem : t.endsWith('px') ? parseFloat(t) : Number.NaN,
    )
    const ol = el.querySelector(':scope > ol.note-parts__runs')!
    const o = getComputedStyle(ol)
    const control = document.createElement('ol')
    document.body.appendChild(control)
    const c = getComputedStyle(control)
    const bare = { listStyleType: c.listStyleType, paddingInlineStart: parseFloat(c.paddingInlineStart) }
    document.body.removeChild(control)
    const label = ol.querySelector(':scope > li > p.note-parts__label')!
    return {
      space2: space2!,
      space5: space5!,
      listStyleType: o.listStyleType,
      listBox: [o.paddingTop, o.paddingRight, o.paddingBottom, o.paddingLeft, o.marginTop, o.marginRight, o.marginBottom, o.marginLeft].map((v) => parseFloat(v)),
      bare,
      paraTops: [...ol.querySelectorAll(':scope > li')].map((li) => [...li.querySelectorAll(':scope > p.note-parts__para')].map((p) => parseFloat(getComputedStyle(p).marginTop))),
      closingTop: parseFloat(getComputedStyle(el.querySelector(':scope > p.note-parts__closing')!).marginTop),
      labelNumeric: getComputedStyle(label).fontVariantNumeric,
    }
  })
  // Non-vacuous: both tokens resolve to a real length, the survivor part's step is the larger, and a bare list here would
  // draw its marker and its indent. Never its margin: `base.css`'s `* { margin: 0 }` zeroes every element's, so a margin
  // control reds on every arm (seen on the first run, b9-3).
  expect(css.space2, `${who}: --space-2 resolves to a length`).toBeGreaterThan(0)
  expect(css.space5, `${who}: --space-5 resolves to a larger length than --space-2`).toBeGreaterThan(css.space2)
  expect(css.bare.listStyleType, `${who}: a bare ol draws a marker (the control)`).not.toBe('none')
  expect(css.bare.paddingInlineStart, `${who}: a bare ol is indented (the control)`).toBeGreaterThan(0)
  expect(css.listStyleType, `${who}: the runs' list draws no marker (each label is its marker)`).toBe('none')
  expect(css.listBox, `${who}: the runs' list has no padding and no margin of its own`).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  expect(css.paraTops.length, `${who}: one set of paragraphs per run`).toBe(runShapes.length)
  css.paraTops.forEach((tops, i) => {
    expect(tops.length, `${who}: run ${i + 1} draws ${runShapes[i]!.paras} paragraphs`).toBe(runShapes[i]!.paras)
    expect(tops[0], `${who}: a run's first paragraph sits flush under its label`).toBe(0)
    for (const t of tops.slice(1)) expect(t, `${who}: a run's paragraphs stand --space-2 apart`).toBeCloseTo(css.space2, 2)
  })
  expect(css.closingTop, `${who}: the survivor part stands --space-5 off the runs' list`).toBeCloseTo(css.space5, 2)
  // The figure law of the label's own surface: inside the clone's `.rc-root` (the StaleBanner, and since Act 6 · RC19 the
  // gate too: `ReEntry.tsx` moved off the old face, which kept lining numerals) Act 6's law is Figtree with
  // `tabular-nums` on every number, lining by design.
  expect(css.labelNumeric, `${who}: the label keeps its surface's figure law`).toMatch(/tabular-nums/)
  expect(css.labelNumeric, `${who}: …and its tabular ones`).toMatch(/\btabular-nums\b/)
}

/** The standing slot drawn as a block with NO door (the typed-below line at two or more runs, the whole-window
 *  rebuild's KTD6 host 1): still one `.cs-paycheck-note`, now `div.note-parts`; its words — the opening ending on the
 *  scoped lead, then each run's label and paragraphs, then the survivor part — in order, read as `innerText` (a block's
 *  `textContent` runs its parts together); its parts (`assertTypedBelowParts`: exactly the runs given, each label with
 *  its paragraph count, in the runs' ordered list, the survivor part's paragraph after it); the label type; and the
 *  Result's button ("Update your figure for a working year") still drawn wherever the tab can act, as the block's LAST
 *  child and a block at least 44 px tall (`FuckOffDate` passes it whenever `onOpen` is set; before the rebuild a doorless
 *  block dropped it). */
async function assertDoorlessStandingBlock(
  standing: Locator,
  who: string,
  lineText: string,
  runShapes: readonly TypedBelowRunShape[],
  cta: string,
): Promise<void> {
  await expect(standing, `${who}: the standing slot is drawn as a block`).toHaveClass(/(^|\s)note-parts(\s|$)/)
  await expect(standing, `${who}: the standing slot speaks its opening, every run, then the survivor part, in order`).toContainText(lineText, {
    useInnerText: true,
  })
  await assertTypedBelowParts(standing, who, runShapes, true)
  await assertLabelType(standing, who)
  const last = await standing.evaluate((el) => {
    const c = el.lastElementChild
    return c === null ? null : { tag: c.tagName, text: c.textContent ?? '' }
  })
  expect(last, `${who}: the block's button is its last child`).toEqual({ tag: 'BUTTON', text: cta })
  const button = await standing.locator(':scope > button').boundingBox()
  expect(button, `${who}: the block's button has no box`).not.toBeNull()
  expect(button!.height, `${who}: the block's button is at least 44 px tall`).toBeGreaterThanOrEqual(44)
}

/** Council `wf_22858e04-f7a` (1)'s label type, in a real browser (jsdom loads no stylesheet; the walk-6 round review's
 *  L4-5): every label in the block — a segment's dt (W's stale line), a run's first `<p>` (the typed-below line's runs,
 *  the walk-8 form council's KD8) — is the body face (never the display face), semibold or heavier, and one step LARGER
 *  than the text it labels (its dd, or its run's first sentence). */
async function assertLabelType(block: Locator, who: string): Promise<void> {
  const type = await block.evaluate((el) =>
    [
      ...[...el.querySelectorAll('dl > div')].map((row) => [row.querySelector('dt'), row.querySelector('dd')] as const),
      ...[...el.querySelectorAll('ol.note-parts__runs > li')].map(
        (li) => [li.querySelector(':scope > p.note-parts__label'), li.querySelector(':scope > p.note-parts__para')] as const,
      ),
    ].map(([label, text]) => {
      if (label === null || text === null) return null
      const t = getComputedStyle(label)
      const d = getComputedStyle(text)
      return { label: label.textContent ?? '', dtFace: t.fontFamily, ddFace: d.fontFamily, dtSize: parseFloat(t.fontSize), ddSize: parseFloat(d.fontSize), weight: Number(t.fontWeight) }
    }),
  )
  expect(type.length, `${who}: the block draws no labelled parts`).toBeGreaterThan(0)
  for (const r of type) {
    expect(r, `${who}: a labelled part is malformed`).not.toBeNull()
    expect(r!.dtFace, `${who}: "${r!.label}" is in the body face`).toBe(r!.ddFace)
    expect(r!.weight, `${who}: "${r!.label}" is semibold`).toBeGreaterThanOrEqual(600)
    expect(r!.dtSize, `${who}: "${r!.label}" is one step larger than its text`).toBeGreaterThan(r!.ddSize)
  }
}

/** Council `wf_22858e04-f7a` (6)'s hit-test, a control in the open sheet where a reader can tap it. Only what a reader
 *  can scroll is scrolled — the nearest `auto`/`scroll` scroller above the control (the sheet's own body), never a
 *  clipped box and never `scrollIntoView`, which reaches through clips no reader can (insight 124) — until the control's
 *  centre sits mid-way in that scroller's visible box; then the browser is asked what is AT that point. The control or
 *  a descendant, or it is covered or clipped. */
async function assertTappableInSheet(target: Locator, who: string): Promise<void> {
  await expect(target, `${who}: drawn exactly once`).toHaveCount(1)
  const hit = await target.evaluate((el) => {
    let sc: Element | null = el.parentElement
    while (sc !== null && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
    const scroller = sc ?? document.scrollingElement!
    const box = sc === null ? { top: 0, bottom: window.innerHeight } : sc.getBoundingClientRect()
    const before = el.getBoundingClientRect()
    scroller.scrollTop += before.top + before.height / 2 - (box.top + box.bottom) / 2
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const at = document.elementFromPoint(x, y)
    return {
      onTarget: at !== null && el.contains(at),
      inWindow: x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight,
      at: at === null ? null : `${at.tagName.toLowerCase()}.${String(at.className)}`,
      y: Math.round(y),
      sheetScrolled: sc !== null,
    }
  })
  console.log(`[sheet hit] ${who}: ${JSON.stringify(hit)}`)
  expect(hit.inWindow, `${who}: its centre lies outside the window (${JSON.stringify(hit)})`).toBe(true)
  expect(hit.onTarget, `${who}: covered or clipped, the point hits ${hit.at} (${JSON.stringify(hit)})`).toBe(true)
}

/* The re-entry gate's short-tier density pins (`assertGateDensity`: save.css's W6 rung, exact paddings and gaps) retired
   with save.css at Act 6 · RC19 (plan 5.2: an arm that guards the old layout retires with its surface). The gate's
   honesty laws stay below: one note by name, the door the buttons' next sibling, the route and the affirm in the first
   frame at his window. */
/** The standing line's seat since RC4: the StaleBanner above the home (it left the old answer page's lead). It sits in
 *  the banner stack after the other stale lines (the old "the lead's last note"), the stack above the page's heading,
 *  and the home's one R13 caveat is reachable below it. While the StaleBanner holds lines, any shell page may scroll:
 *  order, one visible caveat and reach, never the one-frame law (plan 6, RC4's fit decision: the pilot's call,
 *  2026-11-24, b9-5; measured: `?vault=datesavedrisen`'s caveat at 1302 px, the door's cost list in the banner). */
async function assertStandingInBanner(page: Page, line: Locator, phone: boolean): Promise<void> {
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the standing line rides the home').toBeAttached()
  await expect(line).toBeVisible()
  const order = await page.evaluate(() => {
    const banners = Array.from(document.querySelectorAll('[data-stale-banner]'))
    const pay = document.querySelector('[data-stale-banner] .cs-paycheck-note')
    const own = pay?.closest('[data-stale-banner]') ?? null
    const heading = document.querySelector('main.result h1')
    return {
      last: own !== null && banners[banners.length - 1] === own,
      aboveHeading: own !== null && heading !== null && own.getBoundingClientRect().bottom <= heading.getBoundingClientRect().top + 0.5,
    }
  })
  expect(order.last, 'the standing line is the banner stack’s last line').toBe(true)
  expect(order.aboveHeading, 'the banner stack sits above the page’s heading').toBe(true)
  const caveat = page.locator('main.result [data-caveat]')
  await expect(caveat, 'the home’s one R13 caveat').toHaveCount(1)
  expect(phone ? 'phone' : 'laptop').toBeTruthy()
  await caveat.scrollIntoViewIfNeeded()
  await expect(caveat, 'the R13 caveat is reachable').toBeInViewport()
}

for (const u of PAY_CHECK_UNLOCKS) {
  test.describe(`the pay check’s unlock line (?vault=${u.key}) — one note, the decision pair in frame (${REAL.width}×${REAL.height})`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    test('exactly one gate note, by name; the door under the buttons in frame; the affirm lands the resolved date reading, doors last', async ({ page }) => {
      await page.goto(`/?vault=${u.key}`)
      const unlock = page.getByRole('button', { name: 'Open my plan' })
      await expect(unlock, `the ${u.key} plant did not land on the unlock screen`).toBeVisible({ timeout: 30_000 })
      await unlock.click()

      const affirm = page.getByRole('button', { name: /still about right/i })
      await expect(affirm).toBeVisible({ timeout: 30_000 })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.scrollTo(0, 0))
      const affirmBox = await affirm.boundingBox()
      expect(affirmBox, 'the affirm CTA reported no box').not.toBeNull()
      expect(affirmBox!.y + affirmBox!.height, 'the affirm CTA sits below the first frame at the real window').toBeLessThanOrEqual(
        REAL.height,
      )
      // THE ISOLATION: one note, this plant's own — and the pay check's other line is dark (a negative
      // aimed at a live key, never a deleted one: insight 086). Each note is a direct child (a `<p>`, or W's
      // block), so the count reads the children; the text reads `innerText` across the block's dt/dd.
      await expect(page.locator('.reentry-notes > *'), `${u.key}: exactly one gate note`).toHaveCount(1)
      await expect(page.locator('.reentry-notes')).toContainText(u.note, { useInnerText: true })
      // THE MOVED FACT ON THE GATE (the walk-9 form council's call (1a)): where no rules line fired and the typed-below
      // line is the line drawn, that ONE note carries the moved clause (its words in `note`, after the counts sentence and
      // before the lean, so the ordered compare above pins its place), and the moved note of its own is drawn nowhere —
      // not its lead, not its sentence, not its door sentence (each checked alone: a joined negative passes when any one
      // part is absent). The single note's count above is the other half: no second note of any cause.
      if (u.carriesMoved !== undefined) {
        await expect(page.locator('.reentry-notes > *').nth(0), `${u.key}: the gate's one note carries the moved clause`).toContainText(
          u.carriesMoved,
          { useInnerText: true },
        )
        // Non-vacuous: the negatives below read a gate that is drawn (its notes and its door inside it).
        await expect(page.locator('section.reentry'), `${u.key}: the gate is one section`).toHaveCount(1)
        await expect(page.locator('section.reentry .reentry-notes'), `${u.key}: the notes sit inside the gate section`).toHaveCount(1)
        for (const part of TYPED_MOVED_OWN_NOTE_PARTS) {
          // The whole gate (`section.reentry`: the story column with its notes AND the confirm column with its door).
          await expect(page.locator('section.reentry'), `${u.key}: no moved note of its own on the gate ("${part}")`).not.toContainText(part)
        }
        await expect(page.getByText(copy.stalenessLeftOverNote), `${u.key}: the moved note's lead is drawn nowhere`).toHaveCount(0)
      }
      // A block on the gate (W's, or the typed-below line's runs) carries the same label type as the Result's (council (1)).
      const gateBlock = page.locator('.reentry-notes > .note-parts')
      if ((await gateBlock.count()) > 0) await assertLabelType(gateBlock, `${u.key} (gate)`)
      // The typed-below line at two or more runs is the gate's block: the runs' ordered list, then the survivor part's
      // paragraph (the walk-8 form council's KD7 and KD8, host 2); the gate passes no button.
      if (u.standingRuns !== undefined) await assertTypedBelowParts(gateBlock, `${u.key} (gate)`, u.standingRuns, false)
      // The read-back the frame must hold, where the arm pins it (council (6): the four-bucket arm is its tallest).
      if (u.readback !== null) {
        await expect(page.locator('.reentry-confirm .reentry-row__label'), `${u.key}: the gate's read-back, every row`).toHaveText([
          ...u.readback,
        ])
      }
      await expect(page.getByText(u.sibling), 'the pay check’s other unlock line stays dark').toHaveCount(0)
      await expect(page.getByText(copy.stalenessWorkingYearCost), 'never the figure-less fallback').toHaveCount(0)

      // THE GATE'S DOOR (council `wf_22858e04-f7a` (2)): on every stale-W arm (each tab here can save), its own section
      // right after the buttons — never in the notes — naming no W-row button and pointing neither up nor down.
      const door = page.locator('section.reentry-door')
      if (u.gateDoor === null) {
        await expect(door, `${u.key}: W is not stale, so no door under the buttons`).toHaveCount(0)
      } else {
        await expect(door, `${u.key}: exactly one door under the buttons`).toHaveCount(1)
        const placed = await page.evaluate(() => {
          const actions = document.querySelector('.reentry-confirm > .reentry-actions')
          const d = document.querySelector('section.reentry-door')
          return actions !== null && d !== null && actions.nextElementSibling === d
        })
        expect(placed, `${u.key}: the door is the next element sibling of the gate's buttons`).toBe(true)
        await expect(door.locator('h3.reentry-door__heading')).toHaveText(u.gateDoor.heading)
        await expect(door.locator('p')).toHaveText(`${u.gateDoor.scope} ${u.gateDoor.route}`)
        await expect(affirm, `${u.key}: the affirm button is described by the scope sentence`).toHaveAccessibleDescription(
          u.gateDoor.scope,
        )
        await expect(door, `${u.key}: the gate names no W-row button`).not.toContainText(
          /Yes, that’s about right|I’ll enter a different figure|Keep \$/,
        )
        await expect(door, `${u.key}: the gate points neither above nor below`).not.toContainText(/\b(above|below)\b/)
        // Council (2): the route's heading is in the body face (the walk-6 round review's L4-5: nothing read it).
        const faces = await door.evaluate((d) => ({
          heading: getComputedStyle(d.querySelector('h3.reentry-door__heading')!).fontFamily,
          body: getComputedStyle(d.querySelector('p')!).fontFamily,
        }))
        expect(faces.heading, `${u.key}: the route's heading is in the body face`).toBe(faces.body)
        // THE COUNCIL'S FIT GATE: the route sits in the first frame at his window, with the buttons it names.
        await settleLayout(page)
        await page.evaluate(() => window.scrollTo(0, 0))
        const doorBox = await door.boundingBox()
        expect(doorBox, 'the door reported no box').not.toBeNull()
        console.log(`[route fit] ?vault=${u.key}: the route's bottom at ${(doorBox!.y + doorBox!.height).toFixed(1)} of ${REAL.height} px`)
        expect(doorBox!.y + doorBox!.height, `${u.key}: route in frame`).toBeLessThanOrEqual(REAL.height)
      }

      await affirm.click()
      await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
      await settleLayout(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      await expect(page.locator('main.result[data-shell-screen="snapshot"]'), `${u.key}: the affirm lands on the home`).toBeAttached()
      await expect(page.locator('section.reentry-door')).toHaveCount(0)
      const standing = page.locator('[data-stale-banner] .cs-paycheck-note')
      await expect(standing).toHaveCount(u.standing === null ? 0 : 1)
      if (u.standing !== null) {
        if (u.resultDoor !== null) {
          await assertStandingBlock(standing, u.key, u.standing, u.resultDoor)
        } else if (u.standingRuns !== undefined) {
          await assertDoorlessStandingBlock(standing, u.key, u.standing, u.standingRuns, copy.stalenessPayCheckCtaUpdate)
        } else {
          await expect(standing, `${u.key}: the standing slot speaks the gate’s cause`).toContainText(u.standing)
        }
      }
      const caveat = page.locator('main.result [data-caveat]')
      await expect(caveat, `${u.key}: the home’s one R13 caveat`).toHaveCount(1)
      if (u.standing === null) {
        const caveatBox = (await caveat.boundingBox())!
        expect(caveatBox.y + caveatBox.height, `${u.key}: the home’s R13 caveat stays in the first frame`).toBeLessThanOrEqual(REAL.height)
      } else {
        // A standing line in the StaleBanner: order and reach (the pilot's call, 2026-11-24, b9-5; `assertStandingInBanner`).
        await caveat.scrollIntoViewIfNeeded()
        await expect(caveat, `${u.key}: the home’s R13 caveat is reachable`).toBeInViewport()
        await page.evaluate(() => window.scrollTo(0, 0))
      }

      if (u.sheet !== null) {
        await expect(standing.getByRole('button', { name: u.sheet.cta, exact: true }), `${u.key}: the standing line's W door`).toHaveCount(1)
        await standing.getByRole('button', { name: u.sheet.cta, exact: true }).click()
        const dialog = page.getByRole('dialog', { name: copy.profileWorkingCostName })
        await expect(dialog, `${u.key}: the door opens the Pre-retirement living expenses drawer (RC13b)`).toBeVisible()
        await settleLayout(page)
        const row = dialog
        await assertTappableInSheet(row.locator('[data-choice-group="working-cost"] label').filter({ hasText: copy.workingCostYes }), `${u.key}: "${copy.workingCostYes}"`)
        if (u.sheet.keep === null) {
          await expect(row.getByRole('button', { name: /^Keep / }), `${u.key}: no Keep door below today's quote (ruling 34)`).toHaveCount(0)
        } else {
          await assertTappableInSheet(row.getByRole('button', { name: u.sheet.keep, exact: true }), `${u.key}: "${u.sheet.keep}"`)
        }
        // The rebuild's host 3 in a real browser (round 2, finding #9: jsdom loads no stylesheet): where the line speaks
        // two or more runs, the left-over seat below draws them as one block whose labels are a step above their text in
        // the body face, at this laptop width (the drawer's own type; no `.field-help` rule is left); and the block ends the
        // seat (it is the seat's last child; intake.css's old trailing-margin rule keyed on a class the drawer no longer
        // draws, and left with that sheet at Act 6 · RC19). The
        // survivor part rides the seat too, its paragraph after the runs' list (KD7); the seat passes no button, so the
        // survivor part is the block's last part.
        if (u.standingRuns !== undefined) {
          const seatBlock = dialog.locator('[data-left-over-seat] > div.note-parts')
          await expect(seatBlock, `${u.key}: the left-over seat draws its runs as one block`).toHaveCount(1)
          await assertTypedBelowParts(seatBlock, `${u.key}: the seat`, u.standingRuns, false)
          const foot = await seatBlock.evaluate((el) => el.parentElement?.lastElementChild === el)
          expect(foot, `${u.key}: the runs end the seat`).toBe(true)
        }
      }
    })
  })
}

// ── U13 follow-up: the AGED date route (?vault=datestale — the re-based odds ladder) ──────────
// The two-time-bases fix (council 2026-07-10): the hero re-derives "years out" from TODAY, and
// the ladder below it must speak the SAME clock — the Caddie panel's hard-flagged blocker was
// the rosier re-derived hero over a save-relative ladder ("about 6 years out" vs "Stopping in
// 8 years … your date"). The DATE route scrolls by design, so this arm pins the ORDER contract
// plus the aged surface's own honesty composition, never a full one-frame fit.

