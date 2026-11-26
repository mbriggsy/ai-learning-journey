import { describe, it, expect } from 'vitest'
import { WORKING_COST_ACT_COPY, copy, slots, staticDisclosures, HEDGE_TOKENS, type CopyKey, type TypedBelowAmount, type TypedBelowSpanFrame, type TypedBelowSurvivorFrame } from '../copy'
import {
  lintCopy,
  isVerdictKey,
  isMortalityKey,
  isControlKey,
  DIRECTIVE_VERBS,
  SURVIVAL_CLAIMS,
  ONE_FUTURE_BANNED,
  type CopyGate,
} from '../copyGuard'
import { HAWK_BAN, LEFT_OVER_LEAN_BAN } from './hawkBan'
import { DEV_SEEDS } from '../devSeeds'
import type { ScenarioDraft } from '@store/memoryModel'
import {
  workingYearCostKeepCondition,
  workingYearCostStaleDoor,
  workingYearCostStaleLine,
  workingYearCostStaleLineText,
  workingYearCostTypedBelowComposed,
  workingYearCostTypedBelowDoor,
  workingYearCostTypedBelowLine,
  workingYearLeftOverAtQuoteLine,
  workingYearLeftOverWaitingSeat,
} from '@intake/workingYearLeftOver'
import { heldYesBelowQuote } from '@intake/workingYearQuote'
import {
  PENSION_ALL_STICKY_BUDGET,
  SURVIVOR_GATE_WITNESSES,
  TM_ALL_STICKY_BUDGET,
  TYPED_BELOW_WITNESSES,
  councilBudgetHousehold,
} from '@intake/__tests__/typedBelowWitnesses'
import { notePartsText } from '../noteParts'

/** The survival-claim corpus (council wf_6e72eca9-c20) — every phrasing a card could use to sell the
 *  crown as a survival win or a survival tie. Each SURVIVAL_CLAIMS pattern owns at least one sample
 *  here that no other pattern catches (the ownership arm below pins it). */
const SURVIVAL_MUST_CATCH: readonly string[] = [
  'This plan is safer than the one you have.',
  'The safest of the paths we tried.',
  'It’s just as safe.',
  'It is at least as safe as your current order.',
  'It’s as safe, and cheaper.',
  'Both orders are equally safe.',
  'It is no less safe than your plan.',
  'The two plans are survival-equivalent.',
  'The two are survival equivalent in these runs.',
  'Same odds, less tax.',
  'It keeps the same odds as your plan, for less tax.',
  'Equal chances to your current plan.',
  'Your odds stay the same, and you pay less tax.',
  'Equally likely to last, for less tax.',
  'No less likely to last than your plan.',
  'You keep the savings without giving up any of your odds.',
  'Lower tax with no loss in safety.',
  'It doesn’t cost you any odds.',
  'This plan wins on survival.',
  // Milestone 2's review, round 3: "on THE odds" slipped the gate.
  'There the recommended one came out ahead on the odds the money lasts.',
  'A less risky way to draw the accounts down.',
  'Your current order is riskier.',
]

/** The essentials-claim lexicon (council wf_cfa961da-13c, 2026-10-12 — the itemized Tier-1 quantity
 *  ruling, 8/10). On the retired route the solver's Tier 1 ranks FULL-plan survival, the headline's own
 *  statistic; the essentials-only reading (`FloorTrack`) is reported (the relief line, the floor date)
 *  and NEVER ranked — and the full-plan count is no lower bound on it (R27's 100%-FPL PTC inversion can
 *  put the floor below the full track). No tier guarantees coverage. So no string may claim the
 *  essentials are always / guaranteed covered, covered in every future, protected or ranked first by
 *  the pick, never short / out / at risk, covered "either way" or "for life", or "10 of 10" (the
 *  display caps at 9). TEST-LOCAL by design: the ruling carried NO copy change and NO behavior
 *  change, so this is a tripwire over today's catalog, slots and disclosures, not a new `copyGuard.ts`
 *  gate — promote it beside `SURVIVAL_CLAIMS` if a surface ever lints live copy against it. It reads
 *  the same ’/‘-normalized text `lintCopy` reads. Each pattern owns a sample in ESSENTIALS_MUST_CATCH
 *  that no other pattern catches (the ownership arm), so deleting any one reds the suite. */
const ESSENTIALS_CLAIMS: readonly RegExp[] = [
  /\b(essentials|basics|necessities)\b[^.?!;]{0,40}?\b(always|guaranteed|assured|certain)\b/i,
  /\b(guarantees?|ensures?|promises?|secures?|locks? in)\s+(that\s+)?(all\s+(of\s+)?)?(your|the)\s+(essentials|basics|necessities)\b/i,
  /\b(protects?|protected|protecting|shields?|safeguards?)\s+(all\s+(of\s+)?)?(your|the)\s+(essentials|basics|necessities)\b/i,
  /\bkeeps?\s+(all\s+(of\s+)?)?(your|the)\s+(essentials|basics|necessities)\s+(safe|covered|funded|paid|protected|secure)\b/i,
  /\b(essentials|basics|necessities)\b[^.?!;]{0,40}?\b(in|across|through)\s+(every|all|each)\s+(single\s+)?(futures?|scenarios?|outcomes?|paths?|markets?)\b/i,
  /\b(in|across)\s+(every|all|each)\s+(single\s+)?(futures?|scenarios?|outcomes?|paths?|markets?)\b[^.?!;]{0,40}?\b(essentials|basics|necessities)\b/i,
  /\b(never|won't|will not|can't|cannot)\s+(ever\s+)?(run|go|fall|come up|be)\s+short\s+(on|of)\s+(your\s+|the\s+)?(essentials|basics|necessities)\b/i,
  /\bnever\s+(drops?|falls?|dips?|goes|go|fall|drop|dip)\s+below\s+(the\s+|your\s+)?(survival\s+|essentials\s+|safety\s+)?floor\b/i,
  /\b(essentials|basics|necessities)\b[^.?!;]{0,40}?\b(no matter what|whatever happens|come what may)\b/i,
  /\b(essentials|basics|necessities)-first\b/i,
  /\b(puts?|ranks?|ranked|prioriti[sz]e[sd]?|picked|chose|chosen)\b[^.?!;]{0,30}?\b(essentials|basics|necessities)\s+(first|ahead)\b/i,
  /\b(essentials|basics|necessities)\b[^.?!;]{0,40}?\b(10|ten) (of|out of) (10|ten)\b|\b(10|ten) (of|out of) (10|ten)\b[^.?!;]{0,40}?\b(essentials|basics|necessities)\b/i,
  /\b(essentials|basics|necessities)\s+(are|is|stay|stays|remain|remains|will be|will stay)\s+(safe|secure|protected|untouchable)\b/i,
  /\b(essentials|basics|necessities)\b[^.?!;]{0,30}?\b(never|won't|will not|can't|cannot)\s+(ever\s+)?(run\s+(out|short|dry)|(be\s+)?at\s+risk|go\s+unfunded)\b/i,
  /\b(essentials|basics|necessities)\b[^.?!;]{0,40}?\b(either way|for life|whatever the markets?\s+(do|does))\b/i,
]

/** The essentials-claim corpus — every phrasing a card could use to sell the pick as essentials-first or
 *  the essentials as certain. Each ESSENTIALS_CLAIMS pattern owns at least one sample no other catches. */
const ESSENTIALS_MUST_CATCH: readonly string[] = [
  'Your essentials are always covered.',
  'The basics are guaranteed, whatever the market does.',
  'This plan ensures your essentials are paid.',
  'The order we picked locks in the basics.',
  'The recommended order protects your essentials.',
  'It keeps your basics covered while you pay less tax.',
  'Your essentials are covered in every future.',
  'In every future we ran, your basics hold.',
  'You won’t run short on the essentials.',
  'The plan never drops below the survival floor.',
  'Your essentials are covered no matter what.',
  'An essentials-first plan.',
  'We picked this order to put your essentials first.',
  'Essentials safe in 10 of 10 futures.',
  'Your basics are safe.',
  'Your essentials will never run out.',
  'The essentials never run dry.',
  'Your essentials are never at risk.',
  'Your essentials are covered either way.',
  'Your essentials are covered for life.',
  'Your basics are taken care of, whatever the markets do.',
]

/** Every ESSENTIALS_CLAIMS match in one string (empty = clean) — `lintCopy`'s ’/‘ normalization, mirrored. */
function essentialsClaims(text: string): string[] {
  const t = text.replace(/[’‘]/g, "'")
  return ESSENTIALS_CLAIMS.flatMap((re) => {
    const m = re.exec(t)
    return m ? [m[0]] : []
  })
}

/*
 * copyGuard enumerates the catalog and asserts every entry passes its applicable gates. THREE
 * gates are UNIVERSAL (a sure outcome / an advice imperative / a survival claim — sins in EVERY voice): they are the only
 * three the unfiltered `entries` loops below sweep. `superlative` AND `free-numeral` are both scoped to
 * the verdict surface (isVerdictKey — "best" is the product's own framing question, and intake carries
 * factual numerals); `catastrophe` is survivor-scoped. That split is copyGuard.ts's law (its SCOPE
 * docblock, copyGuard.ts:19-23), and it is WHY the rec* canary at the foot of this file has to pin the
 * unscoped keys BY NAME — an unscoped flat key rides those three gates and nothing else. The ADVERSARIAL CORPUS below tests the threat CLASS,
 * not the lexicon tokens — it is the regression net that fails loud when the lexicon rots (the gate
 * is a tripwire + net, NOT a proof; the N=1 cold-read is the human oracle). staticDisclosures is
 * OUT by design (proven meaningful below). See copyGuard.ts for the full rationale.
 */

describe('copyGuard — R12 honesty by construction (U7)', () => {
  const entries = Object.entries(copy) as [CopyKey, string][]

  // --- the three UNIVERSAL gates over the whole catalog ---
  it('no catalog string asserts a sure outcome (false-certainty — UNIVERSAL)', () => {
    for (const [k, v] of entries) {
      expect(lintCopy(v, ['false-certainty']), `${k}: "${v}"`).toEqual([])
    }
  })

  it('no catalog string carries an advice imperative (advice-verb — UNIVERSAL)', () => {
    for (const [k, v] of entries) {
      expect(lintCopy(v, ['advice-verb']), `${k}: "${v}"`).toEqual([])
    }
  })

  it('no catalog string claims a plan is safer, just as safe, or won on survival (survival-claim — UNIVERSAL)', () => {
    for (const [k, v] of entries) {
      expect(lintCopy(v, ['survival-claim']), `${k}: "${v}"`).toEqual([])
    }
  })

  // --- superlative + free-numeral: verdict surface only. "best" appears legitimately in the
  //     product's framing question ("how do we do it best?") and numerals are factual in intake;
  //     the CROWNING sin and the false-precision sin only bite on the verdict/recommendation copy. ---
  it('verdict/answer copy crowns no superlative and carries no free-numeral claim', () => {
    const verdict = entries.filter(([k]) => isVerdictKey(k))
    expect(verdict.length, 'the verdict subset is non-empty (isVerdictKey works)').toBeGreaterThan(0)
    for (const [k, v] of verdict) {
      expect(lintCopy(v, ['superlative', 'free-numeral']), `${k}: "${v}"`).toEqual([])
    }
  })

  it('survivor + dead-cohort copy carries no catastrophe/alarm lexicon (no "widow’s penalty"; the thin-note stays gentle)', () => {
    const mortality = entries.filter(([k]) => isMortalityKey(k))
    expect(mortality.length, 'there IS mortality-facing copy to guard').toBeGreaterThan(0)
    // control arm: prove the scope extension is live — the dead-cohort note IS now in the gated set.
    expect(
      mortality.some(([k]) => k === 'bandReadoutThinNote'),
      'the dead-cohort thin-note is catastrophe-gated (council 2026-06-28)',
    ).toBe(true)
    for (const [k, v] of mortality) {
      expect(lintCopy(v, ['catastrophe']), `${k}: "${v}"`).toEqual([])
    }
  })

  // --- the spendHelp twins (S5.1): ONE state sentence swaps inside an otherwise-verbatim string.
  //     The copy.ts comment CLAIMED this pin existed; the 2026-07-17 council (wf_d3666133-c34)
  //     found the claim false against source and mandated the real guard land BEFORE any twin
  //     reword (a comment claiming an absent guardrail bites the very next edit). Anchors are
  //     deliberate literals — the pin's job is friction on exactly these shared sentences. ---
  it('the spendHelp twins share prefix + suffix verbatim; Part A is carved OUT of the leave-out set and the verdict points it at the spending figure (S5.1 drift-pin + Card 10(b))', () => {
    const unpriced = copy.spendHelp
    const priced = copy.spendHelpStatePriced
    // The shared SUFFIX (the closing household sentence) — identical, verbatim.
    const suffix = 'The whole household, not just the bills that feel like retirement.'
    expect(unpriced.endsWith(suffix), 'spendHelp keeps the shared closing sentence').toBe(true)
    expect(priced.endsWith(suffix), 'spendHelpStatePriced keeps the shared closing sentence').toBe(true)
    // The shared PREFIX runs through the federal sentence; the state sentence is the next clause.
    const prefixEnd = 'the tool works that out from your withdrawals itself. '
    const cut = unpriced.indexOf(prefixEnd)
    expect(cut, 'the federal sentence anchors the shared prefix').toBeGreaterThan(0)
    const sharedPrefix = unpriced.slice(0, cut + prefixEnd.length)
    expect(priced.startsWith(sharedPrefix), 'the twins share the whole prefix verbatim').toBe(true)
    // The state sentences (between prefix and suffix) DIFFER, each carrying its own honest frame.
    const stateUnpriced = unpriced.slice(sharedPrefix.length, unpriced.length - suffix.length)
    const statePriced = priced.slice(sharedPrefix.length, priced.length - suffix.length)
    expect(stateUnpriced, 'the unpriced arm keeps the family frame').toContain('isn’t priced yet')
    expect(statePriced, 'the priced arm names the tool as the payer').toContain('priced by the tool')
    expect(stateUnpriced).not.toBe(statePriced)
    // --- Card 10(b), the Part A carve-out (lane `correctness`). The verdict page states a RULE —
    //     "The rare Part A premium belongs in the spending you gave us" — that is only reachable if
    //     the ASK carved Part A out of the leave-out set. It did not: the shipped line read "Leave
    //     Medicare premiums out ENTIRELY: Part B, …", and the engine prices NO Part A premium for
    //     anyone (healthOverlay's medicareAnnualCost scope note: "purchased Part A premiums
    //     (partA2026) are out of scope"; `health.partA2026` sits in consumedConstants'
    //     NOT_RUN_CONSUMED). So a 40-quarter-short household that obeyed "entirely" dropped
    //     $311–$565/month out of BOTH the figure and the engine (2026 tiers,
    //     `health.partA2026.purchasedPremiumsMonthly`) — the optimistic direction, the cardinal
    //     sin. The drift-pin above only forces the twins to AGREE; it cannot see whether what they
    //     agree on is TRUE, so a symmetric reword sails straight through it. Both halves are bound
    //     here — the ask must carve it out AND the verdict must keep pointing at the spending
    //     figure — so neither can drift alone. ---
    const EXHAUSTIVE_MEDICARE =
      /(Medicare premiums? out entirely|out entirely: Part B|leave (out )?(all|every) Medicare premiums?)/i
    const PART_A_KEPT_INSIDE = /Part A[^.]*\bkeep\b[^.]*\bthis figure\b/i
    for (const [name, twin] of [['spendHelp', unpriced], ['spendHelpStatePriced', priced]] as const) {
      expect(twin, `${name}: the exhaustiveness signal is dead — Part A is NOT in the leave-out set`).not.toMatch(
        EXHAUSTIVE_MEDICARE,
      )
      expect(twin, `${name}: the ask names Part A and sends it INSIDE the spending figure`).toMatch(
        PART_A_KEPT_INSIDE,
      )
      expect(twin, `${name}: and says outright the tool does not price it`).toMatch(/tool doesn’t price it/)
      // DELETION GUARDS. Without these the negative above is REWARDED by deleting the whole
      // tool-priced sentence: EXHAUSTIVE_MEDICARE stops matching, every other arm here stays
      // green, and the F4 premium boundary silently vanishes from the ask.
      expect(twin, `${name}: the tool-priced set is still NAMED — killing the sentence must not satisfy the negative above`).toMatch(
        /Part B[^.]*income surcharge[^.]*Medicare Advantage premium/,
      )
      expect(twin, `${name}: …and is still told to be added on top`).toContain('adds them on top itself')
    }
    // NON-VACUITY, with the SAME predicates the assertions use (never a weaker one — the receipt
    // law the `EXACTLY ONE key may claim a completed save` arm in this file enforces): the sentence
    // that SHIPPED before this fix must trip the negative AND fail the positive, so both arms are
    // proven live rather than merely satisfied.
    const SHIPPED_BEFORE =
      'Leave Medicare premiums out entirely: Part B, its income surcharge, and any Part D, Medigap, or Medicare Advantage premium — the tool handles those separately and adds them on top itself.'
    expect(SHIPPED_BEFORE, 'the killed exhaustive instruction trips the negative').toMatch(EXHAUSTIVE_MEDICARE)
    expect(PART_A_KEPT_INSIDE.test(SHIPPED_BEFORE), 'and it carries no Part A carve-out').toBe(false)
    // THE OTHER HALF. If the verdict clause is deleted or reworded off the spending figure, the ask
    // above becomes orphaned instruction — so pin the pair where both are visible. (The lead is a
    // verbatim prefix of the shipped monolith; stateTaxDisclosure.test holds that.)
    const FLAT_INCLUSION_CLAIM =
      /Part A premium\b[^.]*\b(is|are|was|were|stays?|sits?|remains?|lives?)\s+(in|inside|within|included|counted|part)\b/i
    expect(copy.verdictResidualLead, 'the verdict still names the Part A premium').toContain('Part A premium')
    expect(copy.verdictResidualLead, 'and still points at the figure the ask now instructs').toContain(
      'the spending you gave us',
    )
    // …and it may never claim as FACT that the household actually put it there — the O16 ruling in
    // the `assumptionStateUnsetNote twins condition inclusion on the reader's action` arm below:
    // inclusion is never flatly asserted for a population the tool cannot observe.
    expect(copy.verdictResidualLead, 'no flat inclusion claim about an unobservable action').not.toMatch(
      FLAT_INCLUSION_CLAIM,
    )
    expect(
      'The rare Part A premium stays inside the spending you gave us.',
      'the killed flat-inclusion claim trips the same net',
    ).toMatch(FLAT_INCLUSION_CLAIM)
    expect(
      'The rare Part A premium is included in the spending you gave us.',
      'the one-word synonym evasion trips the same net — the narrow (stays|sits|is)+(inside|in) form did not',
    ).toMatch(FLAT_INCLUSION_CLAIM)
  })

  // --- the panel-note ↔ spendHelp reconciliation (O16 Fork A, council 2026-07-17,
  //     wf_fd7f75cb-916): the two render on ONE AssumptionPanel sheet for a state-unset
  //     household, and the old note's flat "these numbers leave out" was engine-proven FALSE for
  //     a household that obeyed spendHelp's keep-it-inside instruction (the kept-inside bill
  //     flows through annualSpendingReal into every simulated year). The tool cannot observe
  //     which population reads it, so the note must condition inclusion on the reader's OWN
  //     action and may never flatly assert the bill is out — while keeping the rule-37
  //     real-bill direction rider. ---
  it('the assumptionStateUnsetNote twins condition inclusion on the reader’s action — never a flat exclusion claim (O16 drift-pin, both faces)', () => {
    const base = copy.assumptionStateUnsetNote
    const budget = copy.assumptionStateUnsetNoteBudget
    for (const [name, note] of [['base', base], ['budget', budget]] as const) {
      // The negative guards the exclusion MEANING, not one lexeme (the fold broadened it — a
      // synonym reword resurrecting the falsehood must trip it, per insight 087's spirit): a
      // note may say the tool doesn't PRICE the tax, but never that the bill is OUT of the numbers.
      expect(note, `${name}: the flat exclusion claim is dead (false for a compliant household)`).not.toMatch(
        /(leave[s]?|left) out|excluded|do(es)?n[’']t (include|count)|not (in|counted in) these numbers|sits outside/,
      )
      expect(note, `${name}: inclusion is conditional on the reader’s own action`).toContain('only if you')
      expect(note, `${name}: the rule-37 real-bill direction rider survives`).toContain('a real yearly bill')
      expect(note, `${name}: the family frame (the O14 counts/counted polysemy stays dead)`).toContain('prices no state income tax')
    }
    // The twins share their prefix VERBATIM through the real-bill colon — only the conditional
    // tail differs (the spendHelp-twins idiom): the base face conditions on the kept-inside
    // spending figure; the governed face names the BUDGET-LINE mechanism (rule 37) and its tail
    // contradicts the spend row's "all in" completeness prime in the conservative direction.
    const prefixEnd = 'that’s a real yearly bill: '
    const cut = base.indexOf(prefixEnd)
    expect(cut, 'the real-bill clause anchors the shared prefix').toBeGreaterThan(0)
    expect(budget.startsWith(base.slice(0, cut + prefixEnd.length)), 'the twins share the whole prefix verbatim').toBe(true)
    expect(base).toContain('only if you kept it inside your spending figure')
    expect(budget).toContain('only if you gave it a budget line yourself')
    expect(budget, 'the conservative tail contradicts the “all in” prime').toContain('most budgets don’t')
  })

  // --- U9b: the budget AXIS copy is DIRECTION-NEUTRAL BY VETO, and until this arm the ONLY
  //     thing enforcing it was a prose comment in copy.ts keyed "DIRECTION-NEUTRAL by veto".
  //     The ruling is the council row dated 2026-07-03, "The budget side-quest cold-read"
  //     (docs/council-log.md — cited by DATE + TITLE on purpose: that log is reverse-
  //     chronological, so every new row pushes the line number down, and TODO.md has already
  //     rotted this pointer to `:31` twice). Its HONESTY-HAWK HARD VETO (conf 9) fired on
  //     directional-D "as EVERY elder first drafted it" — the vetoed drafts being "the
  //     essentials date comes forward / the two dates split apart".
  //
  //     WHY IT IS A HONESTY DEFECT AND NOT A STYLE ONE: the R27 100%-FPL/PTC inversion is
  //     REACHABLE post-U10-conversions, and the engine already ships the OPPOSITE claim —
  //     `dateFloorInversionNote`: "Here the essentials-only version lands later than the full
  //     plan." A directional promise at the ASK manufactures the exact sin the module exists
  //     to prevent, on precisely the pre-65 cliff households U11 protects.
  //
  //     ⚠️ "split" IS NOT BANNED AND MUST NOT BE. The vetoed phrase is the two DATES splitting
  //     apart; `budgetCta`'s "Split what must hold from what could give" is the AXIS sense —
  //     splitting the budget LINES. Same verb, opposite object. Banning the lexeme would kill
  //     the veto-cleared, measured single-line CTA the council itself shipped.
  //
  //     ⚠️ KEY-SCOPED BY NAME, deliberately. A `budget`-PREFIX sweep would red
  //     `dateFloorInversionNote`'s honest inversion; a CONTROL_KEY_PREFIXES entry arms
  //     require-hedge (a modal), which is a different gate and would mush the CTA. ---
  it('U9b: the budget AXIS copy promises no DIRECTION — the 2026-07-03 hawk veto, enforced (drift-pin)', () => {
    const DIRECTIONAL = /sooner|earlier|later|faster|safer|sharper|comes? forward/i
    // Act 6 · RC14: the walk's invite (`budgetCta`) and sheet title (`budgetSheetTitle`) left with the walk; the axis is
    // asked in the Living expenses drawer, by its approach choice, its worksheet heading and the worksheet's intro.
    for (const k of ['profileLivingApproachBudget', 'profileLivingBudgetHeading', 'budgetSheetIntro'] as const) {
      expect(copy[k], `${k}: "${copy[k]}" promises a direction the engine can invert`).not.toMatch(DIRECTIONAL)
    }
    // NON-VACUITY, two ways. (1) The axis must still be NAMED — silencing the copy is not a
    // pass, or the gate would reward deleting the strings it guards.
    expect(copy.budgetSheetIntro, 'the axis survives: what could give').toContain('what could give')
    expect(copy.budgetSheetIntro, 'the axis survives: has to hold').toContain('has to hold')
    expect(copy.budgetSheetIntro, 'the axis survives: each on its own terms').toContain('on its own terms')
    // (2) The regex must be able to BITE. `dateFloorInversionNote` is the engine's own
    // opposite-direction disclosure — it MUST match, proving this is a live net and not a
    // pattern that happens to find nothing. It is also why the sweep is key-scoped: directional
    // truth is sanctioned in the gated POST-split disclosure, never in the pre-split ask.
    expect(copy.dateFloorInversionNote, 'the control: a real directional claim trips the regex').toMatch(DIRECTIONAL)
  })

  // --- The budgetless survivor-medical lean (council 2026-10-08, wf_7eb3303c-7f3). Its honesty
  //     condition is in the WORDS: it is a DISCLOSED CONSERVATIVE LEAN (insight 055), so no string
  //     may sell it as a correction, place it inside the research, or claim medical costs do not
  //     fall; the Hawk's narrowed veto rides on the hint never again saying a blank is fine; and the
  //     help line's old "only sizes your HSA" became false the day the figure took a second job. ---
  it('the survivor-medical strings disclose the lean and never sell it (the 2026-10-08 council’s honesty condition, drift-pin)', () => {
    const LEAN_STRINGS = [
      copy.oopHelp,
      copy.oopHelpWorking,
      slots.oopHint('3,000', '3,400'),
      copy.assumptionSurvivorRatioHelp,
      slots.oopExceedsSpend('6,500', '5,000'),
      copy.stalenessPricingSpending,
    ] as const
    const OVERSELL = /\bcorrect(ion|ed|s)?\b|\bwithin blanchett\b|\b(medical|health( ?care)?|out-of-pocket)( health( ?care)?| medical)?( costs?| spending| bills?| expenses?)? (do|does|don['’]?t|doesn['’]?t|won['’]?t|will not|never) (not )?(fall|drop|shrink|go down|decrease|decline)\b|\bfix(ed|es)?\b/i
    for (const s of LEAN_STRINGS) expect(s, `"${s}" oversells the lean`).not.toMatch(OVERSELL)
    // NON-VACUITY: each banned framing trips the net — incl. the shipped strings' OWN vocabulary (out-of-pocket, spending, won't).
    for (const bad of [
      'This is a correction to the survivor ratio.', 'The share stays within Blanchett’s range.',
      'Medical costs do not fall when one of you is on your own.', 'Health costs don’t shrink later.',
      'Out-of-pocket costs don’t go down when one of you is on your own.', 'Your medical spending will not fall.',
      'Out-of-pocket health costs won’t drop.', 'Healthcare costs do not decrease.',
    ]) expect(bad, `"${bad}" must trip the net`).toMatch(OVERSELL)
    // B3 — the hint says what a blank DOES (both of the figure's jobs), and the killed line stays dead.
    const hint = slots.oopHint('3,000', '3,400')
    expect(hint, 'the Hawk’s narrowed veto: no "blank is fine"').not.toMatch(/blank is fine|fine to leave|leaving it blank/i)
    expect(hint).toMatch(/If you leave it blank/)
    expect(hint, 'job 1: the HSA draw').toMatch(/HSA tax-free draw/)
    expect(hint, 'job 2: the survivor years').toMatch(/whole if one of you is on your own/)
    // …and it names NO direction (for an HSA household a blank is the most pessimistic reading; for a
    // budgetless couple without one, the less cautious — measured, ship gate 1).
    expect(hint, 'a blank is not one-directional').not.toMatch(/safer|more cautious|less cautious|pessimis|optimis|rosier|conservative|lower|higher/i)
    // oopHelp: the containment contrast survives VERBATIM; "only sizes" is gone; the second job is named.
    expect(copy.oopHelp).toContain('out-of-pocket costs should already be inside your spending figure')
    expect(copy.oopHelp, 'the figure no longer has one job').not.toMatch(/\bonly\b/i)
    expect(copy.oopHelp).toMatch(/keeps this amount whole/)
    // The 2026-10-09 Caddie read: a household with no HSA must not be handed a phantom account, and
    // the hold is the TOOL's choice, never a research finding (the council's honesty condition — the
    // first draft's passive "are held whole", right after "Research on surviving spouses…", read as one).
    expect(copy.oopHelp, 'the HSA job is conditional').toMatch(/If you have an HSA/)
    expect(copy.oopHelp, 'the hold is named as the tool’s choice').toMatch(/the tool keeps this amount whole[^.]*deliberately cautious/)
    // The date route's twin (b9-7): every pin above holds for it too, and it never says the tool adds
    // premiums in a working year — the run adds none until the last worker stops (`windowGate`).
    const working = copy.oopHelpWorking
    expect(working).toMatch(/out-of-pocket costs should already be inside your spending figure/i)
    expect(working, 'the figure no longer has one job').not.toMatch(/\bonly\b/i)
    expect(working, 'the HSA job is conditional').toMatch(/If you have an HSA/)
    expect(working, 'the hold is named as the tool’s choice').toMatch(/the tool keeps this amount whole[^.]*deliberately cautious/)
    expect(working, 'no unconditional "added on top"').not.toMatch(/Premiums are added on top by the tool/)
    expect(working, 'working-year premiums have a home').toMatch(/Premiums paid while either of you still works belong in what a working year costs/)
    expect(working, 'the stopped member’s Medicare is the tool’s').toMatch(/Medicare premiums for anyone on Medicare who has already stopped/)
    // The survivor-ratio help names the held-whole medical and claims nothing about "the rest" (a
    // budget's sticky lines do not take the share either).
    expect(copy.assumptionSurvivorRatioHelp).toMatch(/The tool deliberately keeps any out-of-pocket health costs you entered whole/)
    expect(copy.assumptionSurvivorRatioHelp, 'never the passive research-voiced draft').not.toMatch(/are held whole/)
    expect(copy.assumptionSurvivorRatioHelp).not.toMatch(/\bthe rest\b/i)
    // The M > S note is a NOTE: no directive, no figure in the template, both quoted figures annual.
    const note = slots.oopExceedsSpend('§§§', '¤¤¤')
    expect(lintCopy(note, ['advice-verb', 'false-certainty', 'free-numeral']), note).toEqual([])
    expect(note.match(/a year/g)?.length, 'both dollars wear their period').toBe(2)
  })

  // --- U17 §S4 — the `staleness*` WARNING REGISTER. The prefix's hedge/verdict EXEMPTION is
  //     documented law (copy.ts: chrome/note prefixes carry no odds and recommend nothing), which
  //     makes it the WEAKEST net in the catalog — and these are the strings that tell a household
  //     their saved answer may have moved. This arm sweeps every one of them through the two
  //     SCOPED gates the prefix exempts them from (superlative + free-numeral) on top of the three
  //     universal gates the catalog enumeration already applies, and then pins the aggregate
  //     line's specific promises. ---
  it('U17 §S4: every staleness* warning string clears the SCOPED gates too, not just the universal gates', () => {
    const staleness = entries.filter(([k]) => k.startsWith('staleness'))
    expect(staleness.length, 'there IS staleness copy to guard').toBeGreaterThan(4)
    // Control arm (burned/070 — the exemption must be REAL, or this sweep is theatre): these keys
    // are genuinely outside the verdict + control scopes, so nothing else reaches them.
    expect(isVerdictKey('stalenessDate'), 'the prefix is verdict-EXEMPT (the documented law)').toBe(false)
    expect(isControlKey('stalenessAca'), 'the prefix is control-EXEMPT').toBe(false)
    for (const [k, v] of staleness) {
      expect(
        lintCopy(v, ['false-certainty', 'advice-verb', 'superlative', 'free-numeral']),
        `${k}: "${v}"`,
      ).toEqual([])
    }
    // The one SLOTTED staleness string rides the sanctioned numeric channel (a calendar year), so
    // it is swept without free-numeral — the same split the SLOT_RENDER loop below applies.
    expect(lintCopy(SLOT_RENDER.stalenessBudgetLine, ['false-certainty', 'advice-verb', 'superlative'])).toEqual([])
  })

  it('U17 §S4: the AGGREGATE line claims nothing it cannot support — no rulebook named, no "rules changed" register, no answer-moved claim', () => {
    // Bucket 3's sentence must be TRUE OF EVERY MEMBER of a heterogeneous set (the ticker-blend
    // snapshot for a table-reading household, plus every clock of an unbuildable cross-build
    // draft). It may say ONLY that a reference table has a newer version than the save was
    // figured under. Insight 101 in its positive form.
    const line = copy.stalenessReferenceTables
    expect(line, 'never enters the "rules changed" register').not.toMatch(/rules? (have |has )?(been )?(changed|updated)/i)
    // THE NEGATIVE IS WIDER THAN THE WORDS WE HAPPENED TO AVOID (the F-pass nit): the first cut
    // enumerated eight nouns, so a rewrite reaching for "Part B", "premium", "subsidy" or
    // "fund-blend" would have passed every assertion while naming a rulebook. Every term below is
    // a thing a re-written aggregate could plausibly claim and MUST NOT — checked against the
    // shipped sentence, which contains none of them.
    expect(line, 'names no rulebook').not.toMatch(
      /\b(tax|medicare|medigap|marketplace|health|coverage|contribution|IRMAA|state|part\s*[a-d]|premiums?|subsidy|subsidies|bracket|deduction|limits?|funds?|ticker|blend|stocks?|bonds?|roth|social security)\b/i,
    )
    expect(line, 'never claims THEIR answer moved').not.toMatch(
      /your (answer|numbers|reading|plan) (has|have|is|are)? ?(changed|moved|updated)/i,
    )
    // …and the positive anchor (non-vacuity): it DOES disclose the re-base and DOES say plainly
    // that attribution is unavailable — silencing this set would be the opposite sin.
    expect(line).toMatch(/updated since your save/i)
    expect(line).toMatch(/can’t tell/i)
    // NUMBER-NEUTRAL (the re-verify nit): the bucket's only production-reachable member today is
    // the blend snapshot ALONE, so a plural breadth claim ("some of the tables … any of them")
    // was false for every household that could hear it. Pin the neutrality, since no other arm
    // can see a plural-about-a-singleton.
    expect(line, 'claims no breadth the bucket cannot support').not.toMatch(/\b(some of|several|any of them|a number of)\b/i)
    // The named family lines, by contrast, DO name their rulebook — so the negatives above are
    // measuring the aggregate's own discipline, not a property every staleness string has.
    expect(copy.stalenessAca).toMatch(/marketplace/i)
    expect(copy.stalenessMedicare).toMatch(/medicare/i)
    expect(copy.stalenessAca).not.toBe(copy.stalenessMedicare)
  })

  it('U17 §S4: the split killed the collapsed healthcare sentence and the two blend-naming clauses (insight 086 — no orphaned key, no resurrected falsehood)', () => {
    const all = Object.values(copy)
    // The old collapsed line told an all-65+ household "Health-coverage rules have been updated"
    // on an ACA-only move. It must not come back under any key.
    expect(all.some((v) => /health-coverage rules/i.test(v)), 'the collapsed healthcare line is dead').toBe(false)
    // The blend clock is unattributable now, so no string may claim the fund table is read
    // against THIS household's accounts (`BLEND_SNAPSHOT_AS_OF` is one MAX date over all rows).
    expect(
      all.some((v) => /fund data we read your accounts against/i.test(v)),
      'the blend-naming clause is dead on both routes',
    ).toBe(false)
    // …and the Caddie card #2 purge still holds: the jargon word never returns.
    expect(all.some((v) => /fund snapshots?/i.test(v)), 'the purged jargon stays purged').toBe(false)
  })

  // --- THE ENGINE'S OWN METHOD (the engine-domain council, 2026-09-27 — `report.pricing`, off
  //     `src/engine/pricingVersion.ts`). A change to how the ENGINE CODE works a figure out, with no law
  //     moved and no reference table re-dated. So its three lines never speak the rules register (the
  //     hero's "Figured under today’s rules" echo is for law — insight 074 inverted), never "reference
  //     data" (that is the aggregate's sentence, and nothing was re-dated), never "improved / refined /
  //     corrected" (each reads as "your number got better"), and never a DIRECTION: a rosier and a
  //     harsher move read the same; the recompute itself carries the verdict. Checked against the shipped
  //     strings: none carries "more" or "less", so the direction net needs no narrowing. ---
  const PRICING_PHRASES = [
    copy.stalenessPricingTax,
    copy.stalenessPricingStateTax,
    copy.stalenessPricingContributions,
    copy.stalenessPricingAca,
    copy.stalenessPricingSpending,
    copy.stalenessPricingMedicare,
  ] as const
  /** The named method line as it can render: each family alone, and all six joined ("a, b … and f"). */
  const METHOD_LINES = [
    ...PRICING_PHRASES.map((p) => slots.stalenessPricing(p)),
    slots.stalenessPricing(`${PRICING_PHRASES.slice(0, -1).join(', ')} and ${PRICING_PHRASES[PRICING_PHRASES.length - 1]}`),
  ]
  const ENGINE_METHOD_LINES = [...METHOD_LINES, copy.stalenessPricingHedged, copy.stalenessReconfirmMedicareSpending]
  const RULES_REGISTER = /\brules?\b/i
  const REFERENCE_DATA = /reference data/i
  const IMPROVEMENT = /\b(improv|refin|correct)/i
  const DIRECTION = /\b(better|worse|rosier|harsher|higher|lower|more|less)\b/i

  it('the engine-method lines never speak the rules register, "reference data", an improvement, or a direction', () => {
    for (const line of ENGINE_METHOD_LINES) {
      expect(line, 'no law moved — never the rules register').not.toMatch(RULES_REGISTER)
      expect(line, 'nothing was re-dated — never the aggregate’s sentence').not.toMatch(REFERENCE_DATA)
      expect(line, 'never "your number got better"').not.toMatch(IMPROVEMENT)
      expect(line, 'never a direction — the recompute carries the verdict').not.toMatch(DIRECTION)
      expect(lintCopy(line, ['false-certainty', 'advice-verb', 'superlative', 'free-numeral']), line).toEqual([])
    }
    // CONTROLS (burned/070): every net bites a real sentence, or the sweep above is theatre.
    expect(copy.stalenessHeroNote, 'the rules register is real and this regex finds it').toMatch(RULES_REGISTER)
    expect(copy.stalenessReferenceTables, 'the aggregate’s sentence trips the reference-data net').toMatch(REFERENCE_DATA)
    expect('We refined how this tool works out your taxes.').toMatch(IMPROVEMENT)
    expect('We corrected how this tool works out your taxes.').toMatch(IMPROVEMENT)
    expect(Object.values(copy).some((v) => DIRECTION.test(v)), 'the direction net bites somewhere in the catalog').toBe(true)
  })

  it('the HEDGE says plainly it cannot tell; the RE-CONFIRM is conditional and names every premium the plan now prices itself', () => {
    expect(copy.stalenessPricingHedged).toMatch(/can’t tell/)
    const reconfirm = copy.stalenessReconfirmMedicareSpending
    expect(reconfirm, 'conditional, never a directive').toMatch(/^If /)
    for (const premium of ['Part B', 'Part D', 'Medigap', 'Medicare Advantage']) expect(reconfirm, premium).toContain(premium)
  })

  it('the Medicare phrase names the surcharge’s income LEVELS (the lines themselves moved, not only a cost) — and each engine-method line is distinct from every other staleness line', () => {
    expect(copy.stalenessPricingMedicare).toMatch(/income levels where the Medicare surcharge starts/)
    // Text-keyed notes (ReEntry.tsx keys each <p> by its text): no engine-method line may equal any other
    // staleness line, or two would collide on the React key.
    const others = entries
      .filter(([k]) => k.startsWith('staleness') && !k.startsWith('stalenessPricing') && k !== 'stalenessReconfirmMedicareSpending')
      .map(([, v]) => v)
    expect(others.length, 'there ARE other staleness lines to collide with').toBeGreaterThan(4)
    const own = [copy.stalenessPricingHedged, copy.stalenessReconfirmMedicareSpending, ...METHOD_LINES]
    expect(new Set(own).size, 'the engine-method lines are mutually distinct').toBe(own.length)
    for (const line of own) expect(others.filter((o) => o === line), line).toEqual([])
  })

  // --- F-B (U16 chair fix, cold-read panel): the STALE card's body drift-pin. Two falsehoods the
  //     cold read killed must stay dead: (1) "since we found this" — FALSE when the predecessor was the
  //     HELD card (nothing is "found" on a hold), so the body must never claim a find; (2) the body must
  //     positively affirm the ANSWER above is current (only the strategy read went stale) — the honest
  //     truth the coherent card carries. Planted mutant (b): restoring the old wording reds this pin. ---
  it('the stale card body kills "since we found this" and affirms the plan’s answer is current (F-B drift-pin)', () => {
    const body = copy.recommendStaleBody
    // (1) the false "found" claim is dead (untrue whenever the predecessor was the HELD card).
    expect(body, 'the "since we found this" falsehood must stay dead').not.toMatch(/found this/i)
    // Broadened past the one lexeme (insight 087 spirit): no "found"/"we made"/"we worked out" claim
    // that a HOLD predecessor would falsify — a synonym reword resurrecting the falsehood trips this.
    expect(body, 'no find/produce claim a hold predecessor would falsify').not.toMatch(/\b(found|we made|worked out|we built)\b/i)
    // (2) the positive anchor (non-vacuity — burned/070): the body affirms the plan's answer is current (Act 6 · RC8: no
    // answer sits ABOVE it on Tax Strategies, so "your answer above" named nothing there).
    expect(body, 'the body affirms the plan’s answer already reflects the change').toContain('Your plan’s answer already reflects them')
    // The heading names the state calmly (the strategy READ is out of date — true for held OR recommended).
    expect(copy.recommendStaleHeading, 'the heading names the strategy read out of date').toContain('out of date')
  })

  // --- U17 §S5: the save GESTURE + the saved-record CARD. Unlike staleness*, these prefixes are
  //     verdict-SCOPED (the 'recommend' entry in VERDICT_KEY_PREFIXES), so the scoped gates already
  //     reach them — this sweep proves that rather than assuming it, then pins the two things a
  //     presence-only assertion cannot see: that no line CLAIMS a save that did not happen, and
  //     that the CTA hints actually carry their rulings' content. ---
  const s5Keys = entries.filter(([k]) => k.startsWith('recommendSave') || k.startsWith('recommendRecord'))

  it('U17 §S5: every recommendSave*/recommendRecord* string clears the SCOPED gates too', () => {
    expect(s5Keys.length, 'there IS S5 gesture + card copy to guard').toBeGreaterThan(10)
    // Control arms (burned/070 — the scope must be REAL, or the sweep is theatre). These inherit
    // VERDICT scope from the existing 'recommend' prefix and must NOT be swept as controls (the
    // record carries enums, never a figure). The mortality arm is the substring landmine: the
    // matcher is /survivor/i, and "RecoveryLocked" must not be mistaken for it.
    expect(isVerdictKey('recommendSaveCta'), 'inherits verdict scope from the recommend prefix').toBe(true)
    expect(isControlKey('recommendSaveCta'), 'correctly OUTSIDE control scope').toBe(false)
    expect(
      isMortalityKey('recommendSaveRefusalRecoveryLockedHeading'),
      'recovery is not survivorship — the catastrophe net must not claim this key',
    ).toBe(false)
    // --- THE DISPLAY-REGISTER BAN (cold-read Card 7's BLOCKER, until now comment-only). The
    //     killed line was "We can no longer show this as current." — a claim about SHOWING that a
    //     household reads as "the advice still stands, we just can't display it". The fix shipped
    //     in `532cad82` ("It may no longer fit the two of you.") was defended by a comment beside
    //     the string and by NOTHING ELSE: no lexicon entry, no drift-pin, no rendered-text arm.
    //     Swept across ALL s5Keys rather than the one key, so the sin cannot migrate to a
    //     neighbour — measured, all 20 shipped values are already clean. ---
    const DISPLAY_REGISTER =
      /\b(show|shows|showing|shown|display|displays|displayed|displaying|render|renders|rendered|rendering|present|presents|presented)\b/i
    for (const [k, v] of s5Keys) {
      expect(lintCopy(v, ['false-certainty', 'advice-verb', 'superlative', 'free-numeral']), `${k}: "${v}"`).toEqual([])
      expect(v, `${k}: the verb is about the ADVICE, never the DISPLAY (Card 7 BLOCKER): "${v}"`).not.toMatch(
        DISPLAY_REGISTER,
      )
    }
    // NON-VACUITY: the killed sentence — and the SHORTER evasion of it — must both trip the net.
    // The shorter one matters: at 6 characters under the shipped line it clears any width gate,
    // so a pixel budget provably cannot catch it and only the register can.
    expect('We can no longer show this as current.', 'the killed BLOCKER must trip the register').toMatch(DISPLAY_REGISTER)
    expect('We can’t show this as current.', 'the shorter evasion trips it too — width gates cannot').toMatch(DISPLAY_REGISTER)
    // POSITIVE ANCHOR: silencing the line is not a pass — it must still name the ADVICE fitting
    // the household, in the reader's own frame.
    expect(copy.recommendRecordSuperseded, 'the lead still names the advice FITTING them').toMatch(/\bfit\b/)
    expect(copy.recommendRecordSuperseded, "the reader's frame survives").toContain('the two of you')
    // The one SLOTTED line rides the sanctioned numeric channel (a calendar year), so it is swept
    // without free-numeral — the same split the staleness arm and SLOT_RENDER apply.
    expect(lintCopy(SLOT_RENDER.recommendRecordSavedIn, ['false-certainty', 'advice-verb', 'superlative'])).toEqual([])
  })

  it('U17 §S5: EXACTLY ONE key may claim a completed save, and every refusal says nothing reached the device', () => {
    // The cardinal rule, made a test. The gesture RETURNS before the store is touched, so on both
    // routes a refusal means nothing was written — a refusal that says "we saved your plan" would
    // be a save reported that never happened. Purely NEGATIVE by design: an earlier draft pinned
    // the positive sentence "we saved your plan", which pinned a FALSEHOOD.
    // ⚠️ THIS REGEX USED TO MISS THE ONLY STRING IN THE CATALOG THAT ACTUALLY CLAIMS A SAVE.
    // It was `/\b(is|was|we|we’ve|we've)\s+\S*\s*(saved|kept|stored)\b/i` — auxiliary-led only —
    // and the permitted key reads "Saved to this device — …", a PARTICIPIAL lead with no
    // auxiliary. So it matched 0 of 20 keys: the loop below was a filter over an empty set, and
    // the `continue` exclusion protected a string that would have passed anyway. Widened to
    // cover the participial lead (at the start or after terminal punctuation) plus the perfect
    // and passive auxiliaries. Measured after widening: EXACTLY ONE key matches — the badge —
    // so the loop stays green and the exclusion is load-bearing for the first time.
    const claimsASave =
      /(^|[—.!?]\s*)(saved|kept|stored)\b|\b(is|was|are|were|we|we’ve|we've|has been|have been|had been)\s+\S*\s*(saved|kept|stored)\b/i
    for (const [k, v] of s5Keys) {
      if (k === 'recommendSaveSavedBadge') continue
      expect(claimsASave.test(v), `${k} must not assert a completed save: "${v}"`).toBe(false)
    }
    // Non-vacuity (burned/070): the permitted key really does make the claim the others may not,
    // so the exclusion above is load-bearing rather than a filter over an empty set.
    // ⚠️ THIS MUST TEST `claimsASave` ITSELF. It used to assert `/saved/i` — a DIFFERENT and much
    // weaker regex — which is why the gap above stayed invisible: the control passed on a word
    // match while the regex under test matched nothing at all. A non-vacuity receipt that
    // exercises a different predicate than the one it certifies is not a receipt.
    expect(
      claimsASave.test(copy.recommendSaveSavedBadge),
      'the badge is the one key that DOES claim the save — proven with the SAME regex the loop uses',
    ).toBe(true)
    // And the record-invalid refusal positively carries the nothing-was-written clause.
    expect(
      copy.recommendSaveRefusalRecordInvalidBody,
      'the refusal states outright that nothing reached the device',
    ).toMatch(/nothing reached this device/i)
  })

  it('U17 §S5: the CTA hints carry R1 and R2 by CONTENT — the whole-plan truth, and the vault escalation', () => {
    // A presence-only assertion ("a hint renders") cannot see a hint trimmed to
    // "Keep this strategy read on this device". These pin the RULINGS: the write is whole-plan and
    // the reader is told BEFORE the tap, and the no-vault route names the ceremony it escalates
    // into. Each pinned across a SYNONYM set so a reword cannot quietly drop the disclosure.
    const wholePlan = /everything you(’|')ve entered|your whole plan|all of your|everything you entered/i
    const vaultSetup = /passphrase/i
    const backupCopy = /backup/i

    expect(copy.recommendSaveHintCeremony, 'R2: names the whole-plan write').toMatch(wholePlan)
    expect(copy.recommendSaveHintCeremony, 'R1: names the passphrase escalation').toMatch(vaultSetup)
    expect(copy.recommendSaveHintCeremony, 'R1: names the backup copy').toMatch(backupCopy)
    expect(copy.recommendSaveHintUpdate, 'R2: the update route still names the whole-plan write').toMatch(wholePlan)
    // The update route must NOT promise a ceremony it will not open.
    expect(copy.recommendSaveHintUpdate, 'no vault ceremony on the already-saved route').not.toMatch(vaultSetup)
  })

  it('U17 §S5: no line is a verbatim lift of a staleness* string', () => {
    // The staleness lines end "— this reading uses today's", which is TRUE about a live recompute
    // and FALSE about a remembered one. Reuse would import that falsehood wholesale.
    const stalenessValues = new Set(entries.filter(([k]) => k.startsWith('staleness')).map(([, v]) => v))
    expect(stalenessValues.size, 'there ARE staleness strings to collide with').toBeGreaterThan(4)
    for (const [k, v] of s5Keys) {
      expect(stalenessValues.has(v), `${k} must not reuse a staleness line verbatim`).toBe(false)
    }
  })

  // The typed-below runs' frames (the whole-window rebuild's KTD7, `TypedBelowSpanFrame`): a one-run line on the Result
  // (A: "Each working year, the answer at…"), a several-year run on the gate or seat (TM's), and a one-year run on a
  // budget's quote — so the samples below render each branch of the frame at least once between them. The restatement
  // predicates (the walk-9 form council's call (1b)) are off on the one-run sample, so the full forms ("your spending of
  // $Q a year", "your figure of $T a year", "to your savings") are rendered too, and on elsewhere. Since the survivor-path
  // build every witness opens the gate, so the samples carry `bothAlive: true` but for the run's, which keeps the gate-off
  // words in the sample set too (the sweep below renders both ways).
  const SPAN_ONE: TypedBelowSpanFrame = {
    answer: 'This',
    opener: true,
    oneYear: false,
    typed: '84,000',
    quote: '90,000',
    source: 'spending',
    bothAlive: true,
    quoteNamed: false,
    typedNamed: false,
    savingsNamed: false,
  }
  const SPAN_RUN: TypedBelowSpanFrame = {
    answer: 'Your',
    opener: false,
    oneYear: false,
    typed: '84,000',
    quote: '105,000',
    source: 'spending',
    bothAlive: false,
    quoteNamed: true,
    typedNamed: true,
    savingsNamed: true,
  }
  const SPAN_YEAR: TypedBelowSpanFrame = {
    answer: 'This',
    opener: false,
    oneYear: true,
    typed: '100,985',
    quote: '105,000',
    source: 'budget',
    bothAlive: true,
    quoteNamed: true,
    typedNamed: false,
    savingsNamed: true,
  }
  // The survivor part's frames (the survivor-path build's KTD5; its opening and named answers the walk-9 form council's
  // call (4)): over the spending as the typed-below line says it, and over a budget as the out-of-date family does.
  const SURVIVOR_SPENDING: TypedBelowSurvivorFrame = { typed: '84,000', quote: '90,000', source: 'spending', names: 'none' }
  const SURVIVOR_BUDGET: TypedBelowSurvivorFrame = { typed: '90,000', quote: '105,000', source: 'budget', names: 'answers' }
  /** Amounts in the one amount rule (flip (iii)): two groups, B's and C's 2029–2032 run; and the pension household's
   *  2030–2031 credits. */
  const TWO_SHORT: TypedBelowAmount = { kind: 'two', groups: [{ figure: '4,015', firstYear: 2029, lastYear: 2030 }, { figure: '3,652', firstYear: 2031, lastYear: 2032 }] }
  const TWO_CREDIT: TypedBelowAmount = { kind: 'two', groups: [{ figure: '3,005', firstYear: 2030, lastYear: 2030 }, { figure: '3,368', firstYear: 2031, lastYear: 2031 }] }

  // --- slots: render with representative args, then scan. Slots are the SANCTIONED numeric channel,
  //     so they are NOT free-numeral scanned; the verdict voice still must hold. Record<keyof typeof
  //     slots, …> makes a new slot without a sample a COMPILE error (no silent no-op — burned/070). ---
  const SLOT_RENDER: Record<keyof typeof slots, string> = {
    ssClaimAge: slots.ssClaimAge(64),
    ssClaimWindow: slots.ssClaimWindow(2030, 2038),
    fraEcho: slots.fraEcho(803),
    incomeSurvivorNote: slots.incomeSurvivorNote('Your spouse', 'you', 0.5, true),
    bandClockAges: slots.bandClockAges(63, 61),
    bandClockTodayDesc: slots.bandClockTodayDesc(63, 61),
    bandClockHorizonDesc: slots.bandClockHorizonDesc(93, 91),
    bandClockWorkStopsDesc: slots.bandClockWorkStopsDesc(64, 62),
    // U17 §S2.5 — the split marker names the essentials date; §S2 — the aged premise pair.
    bandClockWorkStopsSplitDesc: slots.bandClockWorkStopsSplitDesc(64, 62),
    bandAgedPremiseSaved: slots.bandAgedPremiseSaved(2024),
    bandAgedPremiseFresh: slots.bandAgedPremiseFresh(2024),
    bandClockAgesDesc: slots.bandClockAgesDesc(80, 78),
    // The aged-plan year-0 endpoint (U13 one-time-base law on the chart, 2026-07-10; re-aimed
    // at the BUILD year by U17 §S0.2 — it never described the save).
    bandClockBuiltDesc: slots.bandClockBuiltDesc(2024, 58, 59),
    bandAtRange: slots.bandAtRange(23, '$420k', '$1.2M', '$780k'),
    bandAtRangeRuin: slots.bandAtRangeRuin(23, '$120k'),
    bandAtRangeGone: slots.bandAtRangeGone(23),
    xOfTen: slots.xOfTen(7),
    xOfTenAtCeiling: slots.xOfTenAtCeiling(),
    dateInYears: slots.dateInYears(8),
    noDateInWindow: slots.noDateInWindow(30),
    noDateInWindowRefiguring: slots.noDateInWindowRefiguring(30),
    withOdds: slots.withOdds('7 of 10'),
    withOddsAtCeiling: slots.withOddsAtCeiling(),
    dateTradeoff: slots.dateTradeoff(2, slots.xOfTen(8)),
    ladderMarkAria: slots.ladderMarkAria(6, slots.xOfTen(9), 'crown', false),
    ladderCaveatAgedBalances: slots.ladderCaveatAgedBalances(2024),
    noDateHowClose: slots.noDateHowClose(slots.xOfTen(7)),
    dateFloorCovered: slots.dateFloorCovered(4, slots.withOdds(slots.xOfTen(9)), true),
    budgetAnchorLead: slots.budgetAnchorLead('78,000'),
    budgetLinesTarget: slots.budgetLinesTarget('71,500'),
    budgetMedicalCarried: slots.budgetMedicalCarried('6,500'),
    budgetMedicalExceedsTotal: slots.budgetMedicalExceedsTotal('6,500', '5,000'),
    budgetRunningTotal: slots.budgetRunningTotal('70,000'),
    budgetTierSplit: slots.budgetTierSplit('36,000', '42,000'),
    budgetRemoveLine: slots.budgetRemoveLine('Groceries'),
    stepDownNote: slots.stepDownNote(2030),
    oopHint: slots.oopHint('3,000', '3,400'),
    oopExceedsSpend: slots.oopExceedsSpend('6,500', '5,000'),
    factsMore: slots.factsMore(3),
    missingFactOf: slots.missingFactOf('Birth year', 'your spouse'),
    verdictRoomClause: slots.verdictRoomClause('6,500'),
    verdictTrimClause: slots.verdictTrimClause('2,500'),
    verdictRoomLead: slots.verdictRoomLead('6,500'),
    verdictRoomSized: slots.verdictRoomSized('6,500', '7,100'),
    verdictRoomWithinStep: slots.verdictRoomWithinStep('6,500'),
    verdictRoomSurvivorShort: slots.verdictRoomSurvivorShort('6,500'),
    verdictTrimLead: slots.verdictTrimLead('10,000'),
    verdictTrimSized: slots.verdictTrimSized('10,000', '6,400'),
    verdictRethinkClause: slots.verdictRethinkClause(),
    verdictHoldClause: slots.verdictHoldClause(),
    verdictSurvivorStepDown: slots.verdictSurvivorStepDown('1,200'),
    // The survivor card's spending-basis line (ruled 2026-10-14, b9-toronto1) — sampled at the health seeds'
    // figures ($4,958.33 → "4,960" on your own, $6,500 together).
    verdictSurvivorSpendBasis: slots.verdictSurvivorSpendBasis('4,960', '6,500'),
    // The ask-for-Medicare-extras unit — the fork label + the bi-directional disclosures.
    medicareExtrasForkTypical: slots.medicareExtrasForkTypical('203'),
    medicareExtrasPanelStanding: slots.medicareExtrasPanelStanding('203'),
    medicareExtrasTypicalOne: slots.medicareExtrasTypicalOne('Craig', '203'),
    medicareExtrasTypicalBoth: slots.medicareExtrasTypicalBoth('203'),
    medicareExtrasFactEntered: slots.medicareExtrasFactEntered('You', '220'),
    medicareExtrasFactNone: slots.medicareExtrasFactNone('Your spouse'),
    medicareExtrasFactTypical: slots.medicareExtrasFactTypical('Craig', '203'),
    // P3·U10 — the two-futures delta readouts (frequency-first, hedge-bearing by construction;
    // the samples double as the require-hedge control corpus below).
    sequencingDelta: slots.sequencingDelta(slots.xOfTen(8), slots.xOfTen(7)),
    // U17 §S1 — the start names the CALENDAR year (wall-time-stable), tense picked by `passed`.
    rothPlanEcho: slots.rothPlanEcho('40,000', 2028, false, 5),
    // The winning-plan card's other two conversion arms (2026-08-05). Both quote the HOUSEHOLD'S own
    // figure, so both are sampled with a deliberately UN-round amount — the exact shape the actionable
    // dialect would have misquoted, kept here so the provenance split stays visible in the guard.
    rothPlanTakenOut: slots.rothPlanTakenOut('43,617'),
    rothPlanReplaces: slots.rothPlanReplaces('43,617'),
    // The CROWNED schedule (not the echo — different speech act). Sampled on its PASSED arm, which is
    // the one every aged vault renders and the one that used to claim the plan had "started".
    rothPlanRanked: slots.rothPlanRanked('43,000', 9, 2026, true),
    // Council 2026-07-30 — the band note naming BOTH spending levels. Sampled with a REAL gap
    // (74,000 vs 46,000, the datesplit shape) rather than equal figures, so the guard reads the
    // sentence a household actually meets. `band*` leads neither prefix list, so these ride the three
    // universal gates — correct: they state two arithmetic facts and must wear no hedge.
    bandPricesFullBudgetWithLevels: slots.bandPricesFullBudgetWithLevels('74,000', '46,000'),
    bandPricesEssentialsWithLevels: slots.bandPricesEssentialsWithLevels('46,000', '74,000'),
    // W8-R7: the full-budget caption where the run counts a working year at another figure. Sampled on each word
    // ("own" for a fresh figure, "last" for an out-of-date one) at walk 8's own figures (T's, and ST's budget twin).
    bandCountsWorkingYearsNote: `${slots.bandCountsWorkingYearsNote('84,000', '90,000', false)} ${slots.bandCountsWorkingYearsNote('84,000', '105,000', true)}`,
    bandCountsWorkingYearsWithLevels: slots.bandCountsWorkingYearsWithLevels('90,000', false, '105,000', '105,000'),
    // U17 §S6 — the applied conversion's own passed start, STATED where §S1's refusal used to fire.
    // Named `leverRoth*` on purpose: a `roth*` spelling would be control-scoped and require-hedge
    // would demand a modal on a year read straight from the reader's saved plan (see the slot's
    // own note). It rides the three universal gates, which is the right scope for a plain fact.
    leverRothAlreadyApplied: slots.leverRothAlreadyApplied(2025),
    // P3·U11 — the Healthcare sheet's readout slots (require-hedge-swept by their prefixes).
    acaCostStatus: slots.acaCostStatus('July 3, 2026'),
    acaCostStatusEnhanced: slots.acaCostStatusEnhanced('July 3, 2026'),
    // The OVERDUE twins. They ride the same `acaCost*` prefix, so require-hedge (the STRONGEST
    // net in the catalog) already bites them — unlike a `staleness*`/`reentry*` warning key,
    // which is hedge- AND verdict-exempt and would need its own arm.
    acaCostStatusOverdue: slots.acaCostStatusOverdue('July 3, 2026'),
    acaCostStatusEnhancedOverdue: slots.acaCostStatusEnhancedOverdue('July 3, 2026'),
    acaCostNet: slots.acaCostNet('11,200'),
    acaCostCliff: slots.acaCostCliff(3),
    acaCostCliffOverCliff: slots.acaCostCliffOverCliff(3, '84,600'),
    dateFloorNotWithin: slots.dateFloorNotWithin(11),
    dateFloorNotWithinRefiguring: slots.dateFloorNotWithinRefiguring(11),
    dateFloorNotWithinEither: slots.dateFloorNotWithinEither(11),
    shadowRateLine: slots.shadowRateLine(34),
    shadowRateHeadroom: slots.shadowRateHeadroom('66,600', '84,600', '18,000'),
    irmaaStepNowBase: slots.irmaaStepNowBase('4,900'),
    irmaaStepNowSurcharged: slots.irmaaStepNowSurcharged('7,300', '2,400'),
    // Sampled on the EACH-OF-YOU arm (2026-09-14): two figures, both under "about ~$" — the two-of-you
    // arm is the older, shorter sentence and shares every hedge word.
    irmaaStepNext: slots.irmaaStepNext('218,000', '150,000', '68,000', '1,100', '2,300', false),
    // The two-figure premium card (council 2026-09-13) — every figure-carrying arm rendered, so the
    // require-hedge sweep reaches each surcharge state, the on-ramp span, and the extras carve-out.
    irmaaStepEraStart: slots.irmaaStepEraStart('5,800', 6, 2032),
    irmaaStepOnRampSpan: slots.irmaaStepOnRampSpan(2, '2,700', 4, 2030),
    irmaaStepOnRampOpen: slots.irmaaStepOnRampOpen('2,700'),
    irmaaStepSurchargeOnRampOnly: slots.irmaaStepSurchargeOnRampOnly('3,500', '800', '5,800'),
    irmaaStepSurchargeEraOnly: slots.irmaaStepSurchargeEraOnly('7,400', '1,600', '2,700'),
    irmaaStepSurchargeBoth: slots.irmaaStepSurchargeBoth('3,500', '800', '7,400', '1,600'),
    irmaaStepSurchargeOf: slots.irmaaStepSurchargeOf('3,500', '800'),
    irmaaStepExtrasAdd: slots.irmaaStepExtrasAdd('5,900'),
    irmaaStepExtrasAddBoth: slots.irmaaStepExtrasAddBoth('5,900', '2,900'),
    irmaaStepExtrasAddEraOnly: slots.irmaaStepExtrasAddEraOnly('5,900'),
    irmaaStepExtrasAddOne: slots.irmaaStepExtrasAddOne('2,900'),
    healthFigPerYear: slots.healthFigPerYear('8,900'),
    healthFigRoom: slots.healthFigRoom('19,500'),
    healthFigCents: slots.healthFigCents(22),
    healthFigStepAdd: slots.healthFigStepAdd('1,100'),
    healthFigStepAddEach: slots.healthFigStepAddEach('1,100'),
    // F10 — the R19 ceiling errors quote the statutory limit (pre-formatted by intake).
    errContributionCeiling: slots.errContributionCeiling('32,250'),
    errAdditionsCeiling: slots.errAdditionsCeiling('83,250'),
    // U17 §S1 — the Roth start's past-year refusal quotes the earliest startable year.
    errRothStartPast: slots.errRothStartPast('2026'),
    // P3·U12 — the AssumptionPanel's market disclosure figures (read from productionMarket
    // at render; the % strings arrive pre-formatted — the templates stay numeral-free).
    assumptionMarketStocks: slots.assumptionMarketStocks('5%', '18%'),
    assumptionMarketBonds: slots.assumptionMarketBonds('1%', '6%'),
    assumptionMarketInflation: slots.assumptionMarketInflation('3%'),
    // P3·U13 — the re-entry read-back + the date answer's wall-time framing.
    reentryBenefitMonthly: slots.reentryBenefitMonthly('2,000'),
    reentryElapsedYears: slots.reentryElapsedYears(3),
    stalenessBudgetLine: slots.stalenessBudgetLine(2028),
    stalenessPricing: slots.stalenessPricing(`${copy.stalenessPricingTax} and ${copy.stalenessPricingMedicare}`),
    dateInYearsAnchored: slots.dateInYearsAnchored(7, 2033),
    dateInYearsPast: slots.dateInYearsPast(2031),
    dateInYearsNow: slots.dateInYearsNow(2026),
    // The floor line's anchored/arrived arms (ultramode 2026-07-09 — one screen, one time base).
    dateFloorCoveredAnchored: slots.dateFloorCoveredAnchored(4, 2031, 'about 8 of 10 odds', true),
    dateFloorCoveredPast: slots.dateFloorCoveredPast(2031, 'about 8 of 10 odds', false),
    dateFloorCoveredNow: slots.dateFloorCoveredNow(2026, 'about 8 of 10 odds', false),
    // Act-4 · U16 §S3 — the delta-as-hero + skew + state-cert slots (control-swept by their prefixes;
    // the require-hedge control sweep below reaches these rendered samples). Figures pre-formatted.
    recDeltaLeaveMore: slots.recDeltaLeaveMore('48,000'),
    // The pay-less-tax hero's TWO arms (build spec D7, HIS words 2026-10-05): the PRICED arm (all-in —
    // tax + health-insurance premiums) and the UNPRICED arm (today's tax-only words, defence-in-depth).
    recDeltaPayLessTax: slots.recDeltaPayLessTax('12,000'),
    recDeltaPayLessTaxUnpriced: slots.recDeltaPayLessTaxUnpriced('12,000'),
    recSkewMedian: slots.recSkewMedian('230,000'),
    // The median-advantage increment (2026-07-23): the hero's typical-future qualification arms.
    recDeltaTypical: slots.recDeltaTypical('48,000', '9,000'),
    recDeltaTypicalNone: slots.recDeltaTypicalNone('48,000'),
    recDeltaTypicalBehind: slots.recDeltaTypicalBehind('48,000', '9,000'),
    recHoldStateCert: slots.recHoldStateCert('North Carolina'),
    // Act-4 · U16 §S3b — the heir-bracket disclosure, control-scoped (recDisc* ⇒ require-hedge-swept). The viz aria
    // sentence (`recDeltaVizAria`) retired with RecommendationViz (Act 6 · RC8).
    recDiscHeirBracket: slots.recDiscHeirBracket('24'),
    assumptionHeirBracketOption: slots.assumptionHeirBracketOption('24'),
    recommendRecordSavedIn: slots.recommendRecordSavedIn(2026),
    // The pay check's W step, money picture and panel row (U8) — one representative render each.
    workingCostQuoteMonthly: slots.workingCostQuoteMonthly('7,000', '84,000'),
    workingCostQuoteYearly: slots.workingCostQuoteYearly('84,000'),
    workingCostQuoteBudget: slots.workingCostQuoteBudget('36,000'),
    workingCostQuoteBudgetMedical: slots.workingCostQuoteBudgetMedical('44,000', '8,000'),
    workingCostLeftOut: slots.workingCostLeftOut('Go-go years'),
    workingCostLeftOutMore: slots.workingCostLeftOutMore('Travel, Boat, Golf', 2),
    workingCostStaleQuote: slots.workingCostStaleQuote('84,000', '90,000'),
    workingCostStaleQuoteGone: slots.workingCostStaleQuoteGone('84,000'),
    workingCostStaleLeansBetter: slots.workingCostStaleLeansBetter('84,000'),
    workingCostStaleStateConfirmed: slots.workingCostStaleStateConfirmed('84,000'),
    workingCostStaleStateEntered: slots.workingCostStaleStateEntered('90,000'),
    workingCostStaleBoth: slots.workingCostStaleBoth('84,000', '90,000'),
    workingCostStaleBothGone: slots.workingCostStaleBothGone('84,000'),
    workingCostStaleKeptQuote: slots.workingCostStaleKeptQuote('84,000', '90,000'),
    workingCostStaleStateKept: slots.workingCostStaleStateKept('84,000'),
    workingCostStaleKeptBoth: slots.workingCostStaleKeptBoth('84,000', '90,000'),
    workingCostKeepMonthly: slots.workingCostKeepMonthly('7,500'),
    workingCostKeepYearly: slots.workingCostKeepYearly('90,000'),
    errWorkingCostStaleBelowQuote: slots.errWorkingCostStaleBelowQuote('84,000', '90,000'),
    errWorkingCostStaleKeep: slots.errWorkingCostStaleKeep(slots.workingCostKeepYearly('84,000')),
    workingCostBelowMedical: slots.workingCostBelowMedical('6,000', '8,000'),
    workingLedgerLead: slots.workingLedgerLead(2026),
    workingLedgerLeadAged: slots.workingLedgerLeadAged(2026),
    workingLedgerAmount: slots.workingLedgerAmount('150,000'),
    workingLedgerOutflow: slots.workingLedgerOutflow('11,475'),
    workingLedgerSsHeldBack: slots.workingLedgerSsHeldBack('9,763'),
    workingLedgerSsHeldBackAtMost: slots.workingLedgerSsHeldBackAtMost('5,780'),
    workingLedgerIncomeTaxInvestment: slots.workingLedgerIncomeTaxInvestment('30,000'),
    workingLedgerMedicareSurcharge: slots.workingLedgerMedicareSurcharge('1,036'),
    workingLedgerMonthlyEcho: slots.workingLedgerMonthlyEcho('7,000'),
    workingLedgerMonthlyPlain: slots.workingLedgerMonthlyPlain('7,000'),
    workingLedgerLaterYear: slots.workingLedgerLaterYear(2029),
    workingLedgerLaterRun: slots.workingLedgerLaterRun(2030, 2033),
    workingLedgerLaterLeftOver: slots.workingLedgerLaterLeftOver('1,200'),
    workingLedgerLaterShort: slots.workingLedgerLaterShort('3,200'),
    workingLedgerLaterShortEach: slots.workingLedgerLaterShortEach('3,200'),
    workingLedgerLaterShortRange: slots.workingLedgerLaterShortRange('3,100', '3,400'),
    workingLedgerStillShortSince: slots.workingLedgerStillShortSince(2026),
    workingLedgerLeftOverFigure: slots.workingLedgerLeftOverFigure('16,985'),
    workingLedgerLeftOverFigureAt: slots.workingLedgerLeftOverFigureAt('84,000', '26,985'),
    workingLedgerLeftOverWaitingShort: slots.workingLedgerLeftOverWaitingShort('105,000', 2026, 2032, TWO_SHORT, true),
    workingLedgerLeftOverWaitingShortUpdate: slots.workingLedgerLeftOverWaitingShortUpdate('105,000', 2026, false),
    workingCostStaleSeatShortLean: slots.workingCostStaleSeatShortLean('84,000', false),
    workingCostStaleSeatLaterShort: slots.workingCostStaleSeatLaterShort('105,000', 2029, 2032, TWO_SHORT, '84,000', true),
    workingLedgerLeftOverCheck: slots.workingLedgerLeftOverCheck('16,985', '20,000', '36,985'),
    workingLedgerLeftOverCheckNoDeposits: slots.workingLedgerLeftOverCheckNoDeposits('16,985'),
    workingLedgerLeftOverSavedLine: slots.workingLedgerLeftOverSavedLine('16,985'),
    workingLedgerLeftOverRoseLine: slots.workingLedgerLeftOverRoseLine('16,985', '19,240'),
    workingLedgerLeftOverFellLine: slots.workingLedgerLeftOverFellLine('16,985', '15,985'),
    workingLedgerLeftOverRoseLineAt: slots.workingLedgerLeftOverRoseLineAt('84,000', '16,985', '26,985'),
    workingLedgerLeftOverFellLineAt: slots.workingLedgerLeftOverFellLineAt('86,000', '16,985', '14,985'),
    workingLedgerLeftOverAbsentLine: slots.workingLedgerLeftOverAbsentLine('16,985'),
    workingLedgerLeftOverSpentLine: slots.workingLedgerLeftOverSpentLine('16,985'),
    workingLedgerLeftOverNotSureLine: slots.workingLedgerLeftOverNotSureLine('16,985'),
    workingCostStaleLeftOverYearsCheaper: slots.workingCostStaleLeftOverYearsCheaper('84,000'),
    workingCostStaleLeftOverAnswered: slots.workingCostStaleLeftOverAnswered('16,985'),
    workingCostStaleAfterWork: slots.workingCostStaleAfterWork('78,000', true),
    workingCostStaleLeftOverNoneUpdate: slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000'),
    workingCostStaleLeftOverNoneConfirm: slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'),
    workingCostStaleLabelIf: slots.workingCostStaleLabelIf('90,000'),
    workingCostStaleLeftOverIfCapped: slots.workingCostStaleLeftOverIfCapped('5,985', 2026, '105,000', true),
    workingCostStaleLeftOverIfWhole: slots.workingCostStaleLeftOverIfWhole('21,537', 2026, '90,000', '16,985', true),
    workingCostStaleLeftOverGainYears: slots.workingCostStaleLeftOverGainYears(2026, 2028, 2033),
    workingCostStaleLeftOverIfFirstShort: slots.workingCostStaleLeftOverIfFirstShort(2026, '4,015', '105,000', '84,000', '16,985'),
    workingCostStaleLeftOverIfFirstShortRun: slots.workingCostStaleLeftOverIfFirstShortRun(2026, 2032, TWO_SHORT, '105,000', '84,000', '16,985', true),
    workingCostStaleLeftOverIfFirstNone: slots.workingCostStaleLeftOverIfFirstNone(2026, '100,985', '16,985'),
    workingCostStaleShortUntilUpdated: slots.workingCostStaleShortUntilUpdated('84,000'),
    workingCostStaleShortLaterYear: slots.workingCostStaleShortLaterYear(2029, '4,015', '84,000', true),
    workingCostStaleShortLaterYears: slots.workingCostStaleShortLaterYears(2029, 2032, TWO_SHORT, '84,000', true),
    // U11 walk 6's words (council `wf_22858e04-f7a`'s form): R2's gap lean, R3's "This answer now" for B, F6's why, F7's
    // what lowers the cap, R4's lower figure; the doors (the gate's heading, scope and route; the Result's last dt/dd);
    // the Keep condition above Keep.
    workingCostStaleLeftOverInflated: slots.workingCostStaleLeftOverInflated('84,000', '6,000', '90,000', true),
    workingCostStaleLeftOverNoneNow: slots.workingCostStaleLeftOverNoneNow('16,985', '84,000'),
    workingCostStaleNoSmallerAmount: slots.workingCostStaleNoSmallerAmount('90,000'),
    workingCostStaleEachDollar: slots.workingCostStaleEachDollar('90,000', '10,985'),
    workingCostStaleLowerAddsMore: slots.workingCostStaleLowerAddsMore('90,000', '10,985', '6,000', '16,985'),
    workingCostStaleLowerCountsMore: slots.workingCostStaleLowerCountsMore('16,985'),
    workingCostStaleDoorHeadingUpdate: slots.workingCostStaleDoorHeadingUpdate('84,000'),
    workingCostStaleDoorHeadingConfirm: slots.workingCostStaleDoorHeadingConfirm('84,000'),
    workingCostStaleGateScopeUpdate: slots.workingCostStaleGateScopeUpdate('84,000'),
    workingCostStaleGateScopeConfirm: slots.workingCostStaleGateScopeConfirm('84,000'),
    workingCostTypedBelowGateScopeMoved: slots.workingCostTypedBelowGateScopeMoved('84,000'),
    workingCostStaleGateRoute: slots.workingCostStaleGateRoute('Update your figure for a working year'),
    workingCostStaleResultDoorUpdate: slots.workingCostStaleResultDoorUpdate('Update your figure for a working year'),
    workingCostStaleResultDoorConfirm: slots.workingCostStaleResultDoorConfirm('Confirm or change your figure'),
    workingCostStaleDoorIfUpdate: slots.workingCostStaleDoorIfUpdate('90,000', false),
    workingCostStaleDoorYes: slots.workingCostStaleDoorYes('90,000'),
    workingCostStaleDoorMore: slots.workingCostStaleDoorMore('84,000', '6,000', '78,000'),
    workingCostStaleDoorKeepUpTo: slots.workingCostStaleDoorKeepUpTo('Keep $84,000 a year', '6,000'),
    workingCostStaleDoorYesFirst: slots.workingCostStaleDoorYesFirst('78,000'),
    workingCostStaleDoorKeepCovers: slots.workingCostStaleDoorKeepCovers('Keep $7,000 a month', '7,000', true),
    workingCostStaleDoorNoPlus: slots.workingCostStaleDoorNoPlus('78,000', false),
    workingCostStaleDoorKeepNoQuote: slots.workingCostStaleDoorKeepNoQuote('Keep $84,000 a year', '84,000', false),
    workingCostKeepConditionUpTo: slots.workingCostKeepConditionUpTo('Keep $84,000 a year', '6,000', '78,000'),
    workingCostKeepConditionCovers: slots.workingCostKeepConditionCovers('Keep $7,000 a month', '7,000', true),
    workingCostBelowSpending: slots.workingCostBelowSpending('84,000', '90,000', true),
    workingCostBelowBudget: slots.workingCostBelowBudget('84,000', '90,000', true),
    workingCostTypedBelowCounts: slots.workingCostTypedBelowCounts('This', '84,000', '90,000'),
    workingCostTypedBelowCountsBudget: slots.workingCostTypedBelowCountsBudget('Your', '84,000', '90,000'),
    workingCostTypedBelowAdds: slots.workingCostTypedBelowAdds('16,985'),
    workingCostTypedBelowLean: slots.workingCostTypedBelowLean('spending', '105,000', 'your'),
    workingCostTypedBelowSpanLabel: slots.workingCostTypedBelowSpanLabel(2026, 2028),
    workingCostTypedBelowSpanAtQuoteAdds: slots.workingCostTypedBelowSpanAtQuoteAdds(SPAN_RUN, TWO_CREDIT),
    workingCostTypedBelowSpanAtQuoteNothing: slots.workingCostTypedBelowSpanAtQuoteNothing(SPAN_RUN),
    workingCostTypedBelowSpanAdds: slots.workingCostTypedBelowSpanAdds(SPAN_ONE, { kind: 'one', figure: '16,985' }, false),
    workingCostTypedBelowSpanAddsNothing: slots.workingCostTypedBelowSpanAddsNothing(SPAN_YEAR),
    workingCostTypedBelowSpanBothAdd: slots.workingCostTypedBelowSpanBothAdd(SPAN_RUN, { kind: 'one', figure: '5,985' }),
    workingCostTypedBelowSpanBothNothing: slots.workingCostTypedBelowSpanBothNothing(SPAN_ONE),
    workingCostTypedBelowSpanShortNothing: slots.workingCostTypedBelowSpanShortNothing(SPAN_RUN, TWO_SHORT),
    workingCostTypedBelowSpanShortOut: slots.workingCostTypedBelowSpanShortOut(SPAN_RUN, { kind: 'one', figure: '8,185' }, true),
    workingCostTypedBelowSpanShort: slots.workingCostTypedBelowSpanShort(SPAN_YEAR, { kind: 'one', figure: '4,015' }),
    workingCostTypedBelowSpanStillShort: slots.workingCostTypedBelowSpanStillShort(SPAN_YEAR, { kind: 'one', figure: '15' }),
    workingCostTypedBelowSpanEven: slots.workingCostTypedBelowSpanEven(SPAN_YEAR),
    workingCostTypedBelowSpanLess: slots.workingCostTypedBelowSpanLess(SPAN_RUN, { kind: 'band', least: '19,722', most: '20,985' }, false, 2),
    workingCostTypedBelowSpanLessTwin: slots.workingCostTypedBelowSpanLessTwin(SPAN_ONE, { kind: 'one', figure: '6,000' }, 2),
    workingCostTypedBelowSpanSame: slots.workingCostTypedBelowSpanSame(SPAN_ONE, null),
    workingCostTypedBelowCapLeftOver: slots.workingCostTypedBelowCapLeftOver('spending', '5,985'),
    workingCostTypedBelowCapShort: slots.workingCostTypedBelowCapShort('budget', '4,015'),
    workingCostTypedBelowCapNone: slots.workingCostTypedBelowCapNone('spending'),
    workingCostTypedBelowSurvivorCharges: slots.workingCostTypedBelowSurvivorCharges(SURVIVOR_SPENDING, ['63,000', '67,500']),
    workingCostTypedBelowSurvivorWholeGap: slots.workingCostTypedBelowSurvivorWholeGap(SURVIVOR_BUDGET),
    workingCostTypedBelowSurvivorLess: slots.workingCostTypedBelowSurvivorLess(SURVIVOR_BUDGET, '15,000', null),
    workingCostLegendFigure: slots.workingCostLegendFigure('90,000'),
    stalenessLeftOverMoved: slots.stalenessLeftOverMoved('16,985', '27,537', '16,985'),
    stalenessLeftOverClause: slots.stalenessLeftOverClause('16,985', '27,537', '16,985'),
    stalenessLeftOverMovedAt: slots.stalenessLeftOverMovedAt('84,000', '16,985', '26,985', '16,985'),
    stalenessLeftOverClauseAt: slots.stalenessLeftOverClauseAt('84,000', '16,985', '26,985', '16,985'),
    workingLedgerEventClaim: slots.workingLedgerEventClaim('Sam'),
    workingLedgerEventSpousalStart: slots.workingLedgerEventSpousalStart('your spouse'),
    workingLedgerEventMedicareStarts: slots.workingLedgerEventMedicareStarts('Sam'),
    workingLedgerEventTurns65: slots.workingLedgerEventTurns65('you'),
    workingLedgerEventCatchUpStepDown: slots.workingLedgerEventCatchUpStepDown('Alex'),
    workingLedgerEventIncomeStarts: slots.workingLedgerEventIncomeStarts('Sam'),
    workingLedgerEventIncomeEnds: slots.workingLedgerEventIncomeEnds('Sam'),
    assumptionWorkingCostConfirmed: slots.assumptionWorkingCostConfirmed('84,000'),
    assumptionWorkingCostConfirmedBudget: slots.assumptionWorkingCostConfirmedBudget('36,000'),
    assumptionWorkingCostEntered: slots.assumptionWorkingCostEntered('90,000'),
    assumptionWorkingCostKept: slots.assumptionWorkingCostKept('84,000'),
    assumptionWorkingCostStale: slots.assumptionWorkingCostStale('84,000'),
    // The year-by-year table (Act 5, U7).
    workbenchRoughWhat: slots.workbenchRoughWhat(1966, 1995, 30),
    workbenchLivesOne: slots.workbenchLivesOne('you', true, 'your', 88),
    workbenchLivesTwo: slots.workbenchLivesTwo('Sam', false, 'Sam’s', 84, 'Alex', 92),
    workbenchStopsIn: slots.workbenchStopsIn(2031),
    workbenchFloorTrack: slots.workbenchFloorTrack(),
    workbenchNoDate: slots.workbenchNoDate(2041),
    workbenchAged: slots.workbenchAged(2026),
    workbenchSourcePretaxOf: slots.workbenchSourcePretaxOf('your spouse'),
    workbenchAccountOf: slots.workbenchAccountOf('Sam’s', '401(k)'),
    workbenchRolledIn: slots.workbenchRolledIn(2049, 'Sam’s Traditional IRA'),
    workbenchRowRmdMoved: slots.workbenchRowRmdMoved('4,210'),
    workbenchRowNotKeptRetired: slots.workbenchRowNotKeptRetired('12,000'),
    workbenchRowNotKeptNoCredit: slots.workbenchRowNotKeptNoCredit('16,985'),
    workbenchRowNotKeptUnsaid: slots.workbenchRowNotKeptUnsaid('16,985'),
    workbenchRowNotKeptWaiting: slots.workbenchRowNotKeptWaiting('16,985'),
    workbenchRowNotKeptAboveCap: slots.workbenchRowNotKeptAboveCap('3,000'),
    workbenchRowNotKeptAboveFirstYear: slots.workbenchRowNotKeptAboveFirstYear('2,000'),
    workbenchRowNotKeptAfterDeath: slots.workbenchRowNotKeptAfterDeath('9,400'),
    workbenchRowSurvivor: slots.workbenchRowSurvivor('Alex', false),
    workbenchRowRolledOver: slots.workbenchRowRolledOver('Sam’s', 'yours'),
    workbenchRoughSteadyFrom: slots.workbenchRoughSteadyFrom(1995),
    workbenchNoteThrough: slots.workbenchNoteThrough(slots.workbenchRowNotKeptNoCredit('16,985'), 2034),
    cashFlowsOther: slots.cashFlowsOther('Sam'),
    cashFlowsPayTaxed: slots.cashFlowsPayTaxed('Sam'),
    cashFlowsOtherTaxed: slots.cashFlowsOtherTaxed('Your spouse'),
    cashFlowsAgesKey: slots.cashFlowsAgesKey(['Sam', 'Alex']),
    cashFlowsYearNote: slots.cashFlowsYearNote(2031, copy.workbenchRowRanOut),
    cashFlowsRunStopsDated: slots.cashFlowsRunStopsDated('Your plan', 2031),
    cashFlowsRunStopsNoDate: slots.cashFlowsRunStopsNoDate('Your plan', 2041),
    cashFlowsRunStopsLever: slots.cashFlowsRunStopsLever('Work to 63', 2033),
    // The facts page (Act 5, U8).
    workbenchFactsEditName: slots.workbenchFactsEditName('Social Security'),
    workbenchFactDollars: slots.workbenchFactDollars('88,000'),
    workbenchFactPerYear: slots.workbenchFactPerYear('150,000'),
    workbenchFactPerMonth: slots.workbenchFactPerMonth('2,450'),
    workbenchFactPerMonthAndYear: slots.workbenchFactPerMonthAndYear('12,500', '150,000'),
    workbenchFactSpendBudget: slots.workbenchFactSpendBudget('148,000'),
    workbenchFactPercent: slots.workbenchFactPercent('70'),
    workbenchFactOwned: slots.workbenchFactOwned('your spouse’s', 'pension'),
    workbenchFactLeftOverSaved: slots.workbenchFactLeftOverSaved('16,985'),
    workbenchFactOrder: slots.workbenchFactOrder(['Brokerage', 'Pre-tax', 'Roth']),
    workbenchFactRoth: slots.workbenchFactRoth('40,000', 2027, false, 5),
    workbenchFactExtrasToolFigure: slots.workbenchFactExtrasToolFigure('244'),
    budgetWindowHelpRetired: slots.budgetWindowHelpRetired(2026),
    budgetWindowYearIs: slots.budgetWindowYearIs(2029),
    taxStratHeirDefault: slots.taxStratHeirDefault('24'),
    // The lever rail (Act 5, U15).
    workbenchRailEven: slots.workbenchRailEven('about 7 of 10 odds'),
    workbenchRailStopsPlan: slots.workbenchRailStopsPlan(2031),
    workbenchRailStopsPlanNoDate: slots.workbenchRailStopsPlanNoDate(2036),
    workbenchRailStopsWhatIf: slots.workbenchRailStopsWhatIf(2033),
    workbenchRailStopBoth: slots.workbenchRailStopBoth(2033),
    workbenchRailStopOne: slots.workbenchRailStopOne('Sam', false, 2033),
    workbenchRailStopOption: slots.workbenchRailStopOption(2031, true),
    workbenchRailPlanValue: slots.workbenchRailPlanValue('$84,000 a year'),
    workbenchRailPerYear: slots.workbenchRailPerYear('84,000'),
    workbenchRailBackName: slots.workbenchRailBackName('Spending'),
    workbenchRailLineAmount: slots.workbenchRailLineAmount('Groceries'),
    workbenchRailLineTier: slots.workbenchRailLineTier('Groceries'),
    workbenchRailDepositLabel: slots.workbenchRailDepositLabel('Sam’s 401(k)'),
    workbenchRailEmployerPlan: slots.workbenchRailEmployerPlan('4,000'),
    workbenchRailMixPlan: slots.workbenchRailMixPlan('62'),
    workbenchRailMixSum: slots.workbenchRailMixSum('90'),
    workbenchRailRothStartPast: slots.workbenchRailRothStartPast(2026),
    workbenchRailClaimLabel: slots.workbenchRailClaimLabel('your spouse’s'),
    workbenchRailClaimRange: slots.workbenchRailClaimRange(62),
    workbenchRailRecAction: slots.workbenchRailRecAction('Brokerage first', '$40,000 a year for 5 years, starting in 2027'),
    workbenchRailRefusedStopWindow: slots.workbenchRailRefusedStopWindow(2026, 2036),
    workbenchPairPay: slots.workbenchPairPay('Sam'),
    workbenchPairPutIn: slots.workbenchPairPutIn('Roth'),
    workbenchPairTakenFrom: slots.workbenchPairTakenFrom('Taxable'),
    workbenchPairRanOut: slots.workbenchPairRanOut('This what-if', 2049),
    workbenchPairYield: slots.workbenchPairYield('Your plan', 'The tool leaves yearly interest and dividends out.'),
    snapshotRingStopIn: slots.snapshotRingStopIn(2031),
    snapshotStatRateNoDateLabel: slots.snapshotStatRateNoDateLabel(2036),
    snapshotStatTaxNoDateLabel: slots.snapshotStatTaxNoDateLabel(2036),
    snapshotRingStoppedIn: slots.snapshotRingStoppedIn(2025),
    snapshotInvestedAsEnteredIn: slots.snapshotInvestedAsEnteredIn(2025),
    balanceSheetTotal: slots.balanceSheetTotal('$1,240,000'),
    snapshotApprox: slots.snapshotApprox('$312k'),
    snapshotRate: slots.snapshotRate(4.12),
    snapshotFanAgeAxis: slots.snapshotFanAgeAxis('Alex'),
    snapshotFanTipRange: slots.snapshotFanTipRange('$400k', '$2.1mm'),
    snapshotFanTipInner: slots.snapshotFanTipInner('$800k', '$1.6mm'),
    snapshotFanTipMedian: slots.snapshotFanTipMedian('$1.2mm'),
    snapshotFanPoint: slots.snapshotFanPoint('Ages 70 and 68', '$400k', '$1.2mm', '$2.1mm'),
    probabilitySurvivorRow: slots.probabilitySurvivorRow('7 of 10'),
    probabilityEssentialsRow: slots.probabilityEssentialsRow('better than 9 in 10'),
    probabilityDifference: slots.probabilityDifference('7 of 10', '8 of 10', 'new what-if'),
    probabilityBarFigure: slots.probabilityBarFigure('$2.1mm'),
    probabilityBarPoint: slots.probabilityBarPoint('Your plan', '~$2.1mm'),
    oddsYearTick: slots.oddsYearTick(2031),
    oddsCeilingLines: slots.oddsCeilingLines().join(' '),
    staleAgedBalances: slots.staleAgedBalances(2025),
    probabilityDateOdds: slots.probabilityDateOdds('about 9 of 10 odds'),
    oddsInline: slots.oddsInline(['Your date', '9 of 10']),
    trayDollars: slots.trayDollars('12,000'),
    trayAge: slots.trayAge(67),
    trayMixPlan: slots.trayMixPlan('60'),
    probabilityDifferenceBetween: slots.probabilityDifferenceBetween('Move to Florida', '7 of 10', 'new what-if', '8 of 10'),
    subsidyRegimeCostDelta: slots.subsidyRegimeCostDelta('320,000', '330,000'),
    subsidyRegimeCostEven: slots.subsidyRegimeCostEven('270,000'),
    subsidyRegimeCostDeltaWith: slots.subsidyRegimeCostDeltaWith('Old rules', '320,000', '330,000'),
    probabilityKeptChanged: slots.probabilityKeptChanged('Move to Florida'),
    planListCopyName: slots.planListCopyName('Move to Florida', 2),
    planListNameLong: slots.planListNameLong(60),
    planListKeepAlready: slots.planListKeepAlready('Move to Florida'),
    planListKept: slots.planListKept('Move to Florida'),
    planListDeleteAsk: slots.planListDeleteAsk('Move to Florida'),
    planListMove: slots.planListMove('Move to Florida'),
    planListMoved: slots.planListMoved('Move to Florida', 2),
    planListOpenRow: slots.planListOpenRow('Move to Florida'),
    planListRowActions: slots.planListRowActions('Move to Florida'),
    oddsPoint: [
      slots.oddsPoint(2031, 'Your odds', '9 of 10', 'crown', false),
      slots.oddsPoint(2029, 'Odds on just the essentials', '9 of 10', 'dip', false),
      slots.oddsPoint(2033, 'Your odds', 'better than 9 in 10', 'clears', true),
      slots.oddsPoint(2027, 'Your odds', '6 of 10', 'below', false),
    ].join(' '),
    confidenceShareAbout: slots.confidenceShareAbout(6),
    confidenceShareFewer: slots.confidenceShareFewer(),
    confidenceShareMore: slots.confidenceShareMore(),
    confidenceRunOutTitle: slots.confidenceRunOutTitle(),
    confidenceRunOutDescription: slots.confidenceRunOutDescription(),
    confidenceRunOutTip: slots.confidenceRunOutTip('about 6 in 100 futures'),
    confidenceRunOutPoint: slots.confidenceRunOutPoint('Ages 80 and 78', 'about 6 in 100 futures'),
    confidenceRunOutBy: slots.confidenceRunOutBy(92, 90, 'about 6 in 100 futures', true),
    confidenceRunOutWhole: slots.confidenceRunOutWhole('every future', false),
    confidenceRunOutWholePast: slots.confidenceRunOutWholePast(93, 92, 'about 12 in 100 futures', true),
    // Act 6 · RC13a, the Profile pages and drawers.
    profileBornIn: slots.profileBornIn(1960, 66),
    setupStepTitle: slots.setupStepTitle(2, 'Pay and other income'),
    profileStoppedAt: slots.profileStoppedAt(65),
    profileStartsAt: slots.profileStartsAt(67, 2027),
    profilePaysSpan: [slots.profilePaysSpan(null, undefined), slots.profilePaysSpan(null, 70), slots.profilePaysSpan(66, undefined), slots.profilePaysSpan(66, 70)].join(' '),
    profileEndedAt: slots.profileEndedAt(70),
    profileRises: slots.profileRises('2'),
    profileBirthYearFirst: [slots.profileBirthYearFirst('Alex’s', false), slots.profileBirthYearFirst('your', true)].join(' '),
    profileMoveClaimYear: slots.profileMoveClaimYear('Sam’s Social Security', 2031, 2030, 67),
    profileMoveStartsLater: slots.profileMoveStartsLater('Sam’s pension', 2027),
    profileMovePaysNow: slots.profileMovePaysNow('Sam’s pension', 2027),
    profileMoveEnded: slots.profileMoveEnded('Sam’s pension', 70),
    profileMovePaysAgain: slots.profileMovePaysAgain('Sam’s pension', 70),
    profileWorkUnanswered: [slots.profileWorkUnanswered('Sam’s'), slots.profileWorkUnanswered('your')].join(' '),
    profileSalaryOf: slots.profileSalaryOf('Alex’s'),
    profileSocialSecurityOf: slots.profileSocialSecurityOf('your'),
    profileWorkInvestOf: slots.profileWorkInvestOf('Alex’s'),
    profileNewAccountTitle: slots.profileNewAccountTitle('Roth IRA'),
    profileNewIncomeTitle: slots.profileNewIncomeTitle('Pension'),
    profileMixLine: slots.profileMixLine(60, 30, 10),
    profileMixFund: slots.profileMixFund('VTI', 'Vanguard Total Stock Market'),
    profileMixFundYours: slots.profileMixFundYours('ABCDX'),
    profileFundKnown: slots.profileFundKnown('Vanguard Total Stock Market', 99, 0, 1),
    profileAccountMeta: slots.profileAccountMeta('Pre-tax', 'Alex'),
    profileInvestmentTotal: slots.profileInvestmentTotal('Investment', '$1,120,000'),
    profileLimitShared: slots.profileLimitShared('Alex', '$31,000', slots.profileLimitFamilyPlan()),
    profileLimitAdditions: slots.profileLimitAdditions('$80,000'),
    profileLimitFamilyPlan: slots.profileLimitFamilyPlan(),
    profileLimitFamilyIra: slots.profileLimitFamilyIra(),
    profileLimitFamilyHsa: slots.profileLimitFamilyHsa(),
    profileLimitNone: slots.profileLimitNone(),
    profileRefusedElsewhere: slots.profileRefusedElsewhere('Alex’s 401(k)', 'That’s more than this year’s legal contribution limit.'),
    profileRefusedHidden: slots.profileRefusedHidden('Going in each year', 'That’s more than this year’s legal contribution limit.'),
    // Act 6 · RC13b, Expenses and Goals.
    profileRetirementOf: slots.profileRetirementOf('Alex’s'),
    profileExtrasOf: slots.profileExtrasOf('your'),
    profileLeftOverIn: slots.profileLeftOverIn(2026),
    profileShortIn: slots.profileShortIn(2026),
    profileBudgetLineOf: slots.profileBudgetLineOf(2),
    // Act 6 · RC15, Profile → Blueprint.
    bpAge: slots.bpAge(66),
    bpAgeOf: slots.bpAgeOf('Alex', 63),
    bpAges: slots.bpAges(['Alex 63', 'Sam 65']),
    bpRowValue: slots.bpRowValue('Yearly pay', '$150,000'),
    bpNoAccounts: [slots.bpNoAccounts('your'), slots.bpNoAccounts('Sam’s')].join(' '),
    bpNoDepositAccount: [slots.bpNoDepositAccount('Sam’s', { menu: 'Add', item: 'Account' }), slots.bpNoDepositAccount('your', null)].join(' '),
    bpMedicareOf: slots.bpMedicareOf('your spouse’s'),
    bpClaimAt: slots.bpClaimAt(67),
    bpLineFrom: slots.bpLineFrom('12,000', 2026),
    bpLineSpan: [slots.bpLineSpan('12,000', 5, 2030), slots.bpLineSpan('12,000', 1, 2026)].join(' '),
    bpLineOnward: slots.bpLineOnward('12,000'),
    bpLineFor: [slots.bpLineFor('12,000', 5), slots.bpLineFor('12,000', 1)].join(' '),
    bpAfterStop: [slots.bpAfterStop(0), slots.bpAfterStop(1), slots.bpAfterStop(3)].join(' '),
    bpHidden: slots.bpHidden(['Roth', 'HSA']),
    // Act 6 · RC17, Analysis's Comparisons, Savings and Retirement Details tabs.
    analysisAges: [slots.analysisAges([66]), slots.analysisAges([66, 64])].join(' '),
    analysisPercent: slots.analysisPercent('4.2'),
    analysisPercentPoint: slots.analysisPercentPoint('Alex’s age', 70, 'Withdrawal rate', '4.2'),
    analysisEndWord: slots.analysisEndWord(2049),
    analysisRanOut: [
      slots.analysisRanOut([{ name: 'new what-if', year: 2049 }], true, 2049),
      slots.analysisRanOut([{ name: 'new what-if', year: 2049 }, { name: 'your plan', year: 2052 }], false, 2049),
      slots.analysisRanOut([{ name: 'your plan', year: 2049 }], true, null),
    ].join(' '),
    cmpMoreAt: [slots.cmpMoreAt('New what-if', '120,000', 'more', 'ages 90 and 88', 2056, 'your plan', true), slots.cmpMoreAt('New what-if', '0', 'same', 'age 90', 2056, 'your plan', false)].join(' '),
    cmpOneAt: slots.cmpOneAt('Your plan', '1,200,000', 'ages 90 and 88', 2056, true),
    analysisEndWordLines: slots.analysisEndWordLines(2049).join(' '),
    cmpTaxMore: [slots.cmpTaxMore('new what-if', '24,000', 'less', 2033, 2056, 'your plan', true), slots.cmpTaxMore('new what-if', '0', 'same', 2033, 2056, 'your plan', true)].join(' '),
    cmpTaxOne: slots.cmpTaxOne('your plan', '240,000', 2031, 2056, false),
    cmpTaxNoShared: slots.cmpTaxNoShared(true),
    cmpOneRanOut: slots.cmpOneRanOut('Your plan', 'age 90', 2051, false),
    cmpBothRanOut: slots.cmpBothRanOut('New what-if', 'your plan', 'ages 84 and 83', 2044, true),
    cmpAtRetirement: slots.cmpAtRetirement('New what-if', '80,000', 'more', 'your plan', true),
    cmpAtRetirementSame: slots.cmpAtRetirementSame('1,200,000', true),
    cmpAtRetirementOne: slots.cmpAtRetirementOne('Your plan', '1,200,000', true),
    cmpAtRetirementGone: slots.cmpAtRetirementGone('New what-if', 2029, true),
    cmpBarName: slots.cmpBarName('New what-if', 2031, 'ages 63 and 66'),
    rdIncomeSourcesOf: slots.rdIncomeSourcesOf('your plan'),
    rdRateOf: slots.rdRateOf('new what-if'),
    rdSpendingOf: slots.rdSpendingOf('your plan'),
    rdShare: slots.rdShare('44', 2031, 2058, true),
    rdShareNone: slots.rdShareNone(false),
    rdShortNone: slots.rdShortNone(true),
    rdShortRanOut: slots.rdShortRanOut(2049, 'ages 89 and 87', true),
    rdRate: [slots.rdRate('4.1', 2031, '6.3', 2050, true), slots.rdRate('8.0', 2026, '8.0', 2026, false)].join(' '),
    rdSpending: slots.rdSpending('2,400,000', 2031, 2058, true),
    rdIncomeComparison: slots.rdIncomeComparison('new what-if', '44', 'your plan', '30', 2031, 2058, true),
    rdSpendingComparison: [slots.rdSpendingComparison('New what-if', '60,000', 'less', 'your plan', 2031, 2058, true), slots.rdSpendingComparison('New what-if', '0', 'same', 'your plan', 2031, 2058, false)].join(' '),
    rdWindowNote: slots.rdWindowNote(2033, 2058),
    rdSlicePoint: slots.rdSlicePoint('Social Security', '30'),
    savThisYearOf: slots.savThisYearOf('Your plan'),
    savPerYearOf: slots.savPerYearOf('Your plan'),
    savShareOf: slots.savShareOf('New what-if'),
    savLeftOverOf: slots.savLeftOverOf('Your plan'),
    savThisYear: slots.savThisYear('31,000', 2026),
    savOwnShare: slots.savOwnShare('24,000', '12', '$200,000'),
    savPerYear: slots.savPerYear('150,000', 2026, 2030, true),
    savShare: slots.savShare('12', 2026, 2030, true),
    savLeftOver: [slots.savLeftOver('40,000', 2026, 2030, true), slots.savLeftOver('9,000', 2026, 2030, false)].join(' '),
    savShortDrawn: slots.savShortDrawn('9,000', 2026, 2030, true),
    savEven: slots.savEven(2026, 2030, false),
    savLeftOverKept: slots.savLeftOverKept('12,000'),
    savNoWorkingYears: slots.savNoWorkingYears(true),
    // Act 6 · RC8, Tax → Tax Strategies.
    taxStratHeroLeaveMore: slots.taxStratHeroLeaveMore('128,000'),
    taxStratHeroPayLessTax: slots.taxStratHeroPayLessTax('48,000'),
    taxStratHeroPayLessTaxUnpriced: slots.taxStratHeroPayLessTaxUnpriced('48,000'),
    taxStratCompared: slots.taxStratCompared(62),
    taxStratOthers: slots.taxStratOthers(59),
    taxStratOthersAbove: [slots.taxStratOthersAbove(1, 0), slots.taxStratOthersAbove(3, 56)].join(' '),
    recRunnerUpAheadHere: [slots.recRunnerUpAheadHere(true), slots.recRunnerUpAheadHere(false)].join(' '),
    taxStratRothRowOwn: slots.taxStratRothRowOwn('12,000'),
    taxStratRanOut: [slots.taxStratRanOut(2051, null, false, true), slots.taxStratRanOut(null, 2049, true, false), slots.taxStratRanOut(2050, 2050, false, true), slots.taxStratRanOut(2046, 2041, false, true)].join(' '),
    taxStratDetailsRanOut: slots.taxStratDetailsRanOut(2051, false),
    taxStratValue: slots.taxStratValue('4,240,000'),
    taxStratRothRow: slots.taxStratRothRow('21,000', 5),
    taxStratInMarket: slots.taxStratInMarket('Income tax', true),
    taxStratCompareAssets: slots.taxStratCompareAssets('120,000', 'more', 2061, true),
    taxStratCompareTax: slots.taxStratCompareTax('48,000', 'less', false),
    taxStratCompareRmd: slots.taxStratCompareRmd('210,000', 'less', true),
    taxStratCompareConversions: [slots.taxStratCompareConversions('105,000', '0', true), slots.taxStratCompareConversions('105,000', '0', false, 2051)].join(' '),
    taxStratBarPoint: slots.taxStratBarPoint('The recommended strategy', '4,240,000'),
    taxStratChartPoint: slots.taxStratChartPoint(2034, 'Your plan today', '12,000'),
    taxStratDetailsOf: slots.taxStratDetailsOf('The recommended strategy', true),
    taxStratIrmaaLineNote: slots.taxStratIrmaaLineNote(2026, '218,000', '109,000'),
    // Act 6 · RC9, Retirement → Social Security.
    claimsCoincideOne: slots.claimsCoincideOne('Alex', 'your plan’s own ages and claiming at full retirement age', 67, 2),
    claimsCoincideMany: slots.claimsCoincideMany('Your plan’s own ages and claiming at full retirement age', 'Alex at 67 and Sam at 67'),
    claimsPersonAt: slots.claimsPersonAt('Sam', 67),
    claimsFixed: slots.claimsFixed('Sam', false, 'Sam’s', '17,500'),
    claimsFixedSpousalPending: slots.claimsFixedSpousalPending('Sam', false, 'Sam’s', 'you', true),
    claimsNoBenefit: slots.claimsNoBenefit('You', true),
    claimsReceives: slots.claimsReceives('Alex', false, '17,500'),
    claimsLifetimeTotal: slots.claimsLifetimeTotal('1,050,000'),
    claimsInSteady: slots.claimsInSteady('Social Security each year'),
    claimsAgeAxis: slots.claimsAgeAxis('Alex’s'),
    claimsWorkStops: slots.claimsWorkStops(2031),
    claimsWorkStopsNoDate: slots.claimsWorkStopsNoDate(2040),
    claimsMoreHero: slots.claimsMoreHero('390,000', 'more'),
    claimsMoreLine: slots.claimsMoreLine('claiming at 70', 'your plan’s own ages'),
    claimsSameLine: slots.claimsSameLine('claiming at 70', 'your plan’s own ages'),
    claimsSamePaid: slots.claimsSamePaid('claiming at 70', 'your plan’s own ages'),
    claimsBreakEvenAge: slots.claimsBreakEvenAge(81),
    claimsBreakEvenLine: slots.claimsBreakEvenLine('Alex’s', 2041, 'claiming at 70', 'your plan’s own ages'),
    claimsNoBreakEvenLine: slots.claimsNoBreakEvenLine(2059, 'Alex’s', 95, 'claiming as early as possible', 'claiming at 70'),
    claimsLevelByLine: slots.claimsLevelByLine(2059, 'Alex’s', 95, 'claiming at 70', 'your plan’s own ages'),
    claimsRanOut: slots.claimsRanOut('Age 70', 2049),
    claimsFigure: slots.claimsFigure('1,230,000'),
    claimsBarPoint: slots.claimsBarPoint('Age 70', '~$1,230,000', '7 of 10'),
    claimsYearPoint: slots.claimsYearPoint('Alex’s age', 72, 'Age 70', '45,000'),
    claimsSummaryLine: [slots.claimsSummaryLine('claiming at 70', 1), slots.claimsSummaryLine('claiming at 70', 1, true), slots.claimsSummaryLine('claiming at 70 and claiming at full retirement age', 2, true)].join(' '),
    claimsSummaryOdds: slots.claimsSummaryOdds('7 of 10', '8 of 10'),
    claimsSummaryOddsPlan: slots.claimsSummaryOddsPlan('8 of 10'),
    claimsStepsHeading: slots.claimsStepsHeading('Age 70'),
    claimsStepFiles: slots.claimsStepFiles('Alex', false, 70, 2030),
    claimsStepClaimed: slots.claimsStepClaimed('You', true),
    claimsStepSpousalPending: slots.claimsStepSpousalPending('Sam', false, 'Sam’s', 'you', true),
    claimsAsOfBuild: slots.claimsAsOfBuild(2025),
    healthInSteady: slots.healthInSteady('Health premiums each year, for the two of you together'),
    healthAxisNote: slots.healthAxisNote('Alex’s age'),
    healthFigure: slots.healthFigure('330,000'),
    healthYearPoint: slots.healthYearPoint('Alex’s age', 72, 2037, 'Medicare Part B, before any surcharge', '6,500', false),
    healthLifetimeAca: slots.healthLifetimeAca('41,000'),
    healthLifetimeMedicare: slots.healthLifetimeMedicare('290,000'),
    healthCliffLabel: slots.healthCliffLabel(2),
    healthCliffPoint: slots.healthCliffPoint(75, 80, 'Alex’s age', 2),
    healthRanOut: slots.healthRanOut(2052),
    healthChartsStop: slots.healthChartsStop('Alex’s age', 85),
    healthStopsIn: slots.healthStopsIn(2030),
    healthNoDate: slots.healthNoDate(2040),
    stressPctLess: slots.stressPctLess(20),
    stressPctHigher: slots.stressPctHigher(50),
    stressBarPoint: slots.stressBarPoint('Social Security', '20% less', '7 of 10'),
    stressReadsAt: slots.stressReadsAt('if you stop in 2031'),
    stressReadsAtNoDate: slots.stressReadsAtNoDate('if you stop in 2036'),
    stressBarError: slots.stressBarError('Social Security'),
    stressBarWithheld: slots.stressBarWithheld('Combined'),
    stressBarNoCount: slots.stressBarNoCount('Social Security'),
    assetPct: slots.assetPct(62),
    assetCentre: slots.assetCentre(62, 38),
    assetSlicePoint: slots.assetSlicePoint('Stocks', 62),
    assetShift: slots.assetShift(-12),
    assetShiftPoint: slots.assetShiftPoint('Bonds', '−12%'),
    assetScopeOwner: slots.assetScopeOwner('your spouse’s'),
    assetScopeBucket: slots.assetScopeBucket('Pre-tax'),
    assetWhatIfFrom: slots.assetWhatIfFrom('New what-if'),
    assetUnresolved: slots.assetUnresolved(['your Roth IRA', 'Sam’s 401(k)'], true),
    assetOneMixLine: slots.assetOneMixLine(62),
    taxAllocPoint: slots.taxAllocPoint('Pre-tax', '$700,000'),
    taxAllocListTitle: slots.taxAllocListTitle('Roth', 2),
    confidenceCutNote: slots.confidenceCutNote(93, 92),
    bandClockCutDesc: slots.bandClockCutDesc(93, 92),
  }

  it('the year-by-year table never calls its one future typical, average, expected or median (U7; the one-future record §5.1)', () => {
    const workbench = [
      ...entries.filter(([key]) => key.startsWith('workbench')).map(([key, text]) => [key, text] as const),
      ...Object.entries(SLOT_RENDER).filter(([key]) => key.startsWith('workbench')),
    ]
    expect(workbench.length).toBeGreaterThan(40)
    for (const [key, text] of workbench) {
      for (const re of ONE_FUTURE_BANNED) expect(re.test(text), `${key}: "${text}"`).toBe(false)
    }
    // The rule bites: a planted heading that calls the steady future typical fails it.
    expect(ONE_FUTURE_BANNED.some((re) => re.test('One future, in a typical market'))).toBe(true)
    expect(ONE_FUTURE_BANNED.some((re) => re.test('the middle of the range'))).toBe(true)
  })

  it('every U10 delta-readout slot WEARS a hedge (the control readouts are slot-composed, so the require-hedge sweep must reach the rendered samples here)', () => {
    const deltaSlots = [
      'sequencingDelta',
    ] as const
    for (const name of deltaSlots) {
      expect(lintCopy(SLOT_RENDER[name], ['require-hedge']), `${name}: "${SLOT_RENDER[name]}"`).toEqual([])
    }
  })

  it('every slot has a render sample — no silent no-op (burned/070)', () => {
    expect(Object.keys(SLOT_RENDER).sort()).toEqual(Object.keys(slots).sort())
  })

  it('slot outputs hold the verdict voice (no advice / superlative / false-certainty; catastrophe on survivor)', () => {
    for (const [name, rendered] of Object.entries(SLOT_RENDER)) {
      const gates: CopyGate[] = ['false-certainty', 'advice-verb', 'superlative', 'survival-claim']
      // mortality net (not just survivor): the already-failing rethink clause is catastrophe-gated too.
      if (isMortalityKey(name)) gates.push('catastrophe')
      expect(lintCopy(rendered, gates), `${name}: "${rendered}"`).toEqual([])
    }
  })

  it('the crowned schedule\'s SINGULAR passed arm holds the same voice — the catalog samples only the plural (one sample per key)', () => {
    // The at/past-RMD one-year clamp renders this arm on every aged vault; a catalog keyed one-sample-per-slot
    // never reaches it, so it is swept here under the slot gates (no free-numeral — a calendar year is the
    // sanctioned numeric channel, the same split the SLOT_RENDER loop applies).
    const rendered = slots.rothPlanRanked('43,000', 1, 2026, true)
    expect(rendered, 'number agreement').not.toContain('years')
    expect(lintCopy(rendered, ['false-certainty', 'advice-verb', 'superlative']), rendered).toEqual([])
  })

  it('verdict money-clauses hardcode no numeral in the template (slot-discipline)', () => {
    const S = '§§§' // a non-numeric sentinel — any digit left is a hardcoded one in the template
    for (const rendered of [
      slots.verdictRoomClause(S),
      slots.verdictTrimClause(S),
      slots.verdictRoomLead(S),
      slots.verdictRoomSized(S, S),
      slots.verdictRoomWithinStep(S),
      slots.verdictRoomSurvivorShort(S),
      slots.verdictTrimLead(S),
      slots.verdictTrimSized(S, S),
      slots.verdictSurvivorStepDown(S),
      slots.verdictSurvivorSpendBasis(S, S),
    ]) {
      expect(lintCopy(rendered, ['free-numeral']), rendered).toEqual([])
    }
    expect(lintCopy(slots.verdictHoldClause(), ['free-numeral'])).toEqual([])
    expect(lintCopy(slots.verdictRethinkClause(), ['free-numeral'])).toEqual([]) // figure-less by construction
  })

  it('the survivor card’s spending-basis line is HIS sentence, survivor-scoped, and never implies premiums are inside it or names a share (ruled 2026-10-14)', () => {
    // The register's Tier 1 *The survivor card's "still covers you" never says what spending it assumes…*,
    // RULED by Briggsy 2026-10-14 (b9-toronto1, "All three recs"): exactly these words, both figures slotted.
    expect(slots.verdictSurvivorSpendBasis('4,960', '6,500')).toBe(
      'This assumes about $4,960 a month of spending on your own (today: $6,500 together).',
    )
    // Scope: the survivor family (catastrophe lexicon) AND the verdict surface (free-numeral + superlative).
    expect(isMortalityKey('verdictSurvivorSpendBasis')).toBe(true)
    expect(isVerdictKey('verdictSurvivorSpendBasis')).toBe(true)
    const rendered = slots.verdictSurvivorSpendBasis('§§§', '§§§')
    expect(lintCopy(rendered, ['catastrophe', 'free-numeral', 'superlative', 'false-certainty', 'advice-verb', 'survival-claim'])).toEqual([])
    // The ⚑ NEGATIVES on the entry: premiums (ACA / Medicare / IRMAA) are charged ON TOP of both figures,
    // so the line never reads as all-in; and the share is never named (75 % is false on `budget`: 87.7 %).
    expect(rendered).not.toMatch(/premium|insurance|medicare|all[- ]in|everything|includ|covers? (all|every)/i)
    expect(rendered).not.toMatch(/three[- ]quarters|quarter|percent|%|ratio|share/i)
    // Never a claim that the survivor verdict covers TODAY's spend (the entry's second NEGATIVE): "today"
    // scopes the couple's figure, and the survivor figure is the one the verdict assumes.
    expect(rendered.indexOf('on your own')).toBeLessThan(rendered.indexOf('today'))
  })

  it('the F10 slotted messages hardcode no numeral in the template (digit-free — the limit/figures ride the slot args)', () => {
    const S = '§§§' // a non-numeric sentinel — any digit left is a hardcoded one in the template
    for (const rendered of [
      slots.errContributionCeiling(S),
      slots.errAdditionsCeiling(S),
      slots.errRothStartPast(S),
      slots.budgetMedicalExceedsTotal(S, S),
      slots.oopExceedsSpend(S, S),
    ]) {
      expect(lintCopy(rendered, ['free-numeral']), rendered).toEqual([])
    }
  })

  // --- C3 (council 2026-06-29): the work-income field means FULL working-year income (pay +
  //     working-year investment income), NEVER salary-only. Source-bound regression — the killed
  //     Option-A nudge must stay dead and the additive meaning must stay present. This guards the
  //     MEANING; the universal gates above guard the voice. ---
  it('workIncome copy carries Option B (simplified): investment-only ask, no salary echo, disclosed (C3)', () => {
    const investHelp = copy.workInvestmentHelp
    const intro = copy.workIncomeIntro
    const disclosure = copy.workIncomeDisclosure
    // (a) no Option-A salary echo / "just what work pays" anywhere in the work-income copy
    for (const v of [intro, copy.workInvestmentLabel, investHelp, disclosure]) {
      expect(v, 'no salary-echo / "just what work pays" Option-A framing').not.toMatch(
        /usually the same|same as the pay|just what work pays|only what work pays/i,
      )
    }
    // (b) investment income is its OWN named, additive field
    expect(investHelp, 'investment field names interest/dividends/investment').toMatch(/interest|dividends|investment/i)
    // (c) the explicit-none affordance (a blank can never become a silent $0)
    expect(investHelp, 'enter 0 if none — explicit, never a silent skip').toMatch(/\b0\b|none/i)
    // (d) no completeness assertion / no double-count-inviting "everything"
    expect(investHelp, 'asserts no completeness / invites no double-count').not.toMatch(
      /the figure medicare looks at|all of it|everything you/i,
    )
    // (e) the modeled streams stay excluded (KTD-9 no-double-count)
    expect(investHelp, 'still excludes the modeled streams').toMatch(/pension|rental|annuity|alimony/i)
    // (f) the steady-pay simplification is DISCLOSED (conservative-or-disclose)
    expect(disclosure, 'discloses the steady-pay simplification').toMatch(/higher|steady pay/i)
  })

  // --- the ADVERSARIAL COVERAGE CORPUS: the threat CLASS, not the lexicon tokens (burned/070) ---
  // Real-world calm-but-wrong phrasings the gate MUST catch (sourced from the foundation's
  // adversarial review — every one of these bypassed the first draft).
  it('the false-certainty gate catches the assured-outcome + plain-language families (coverage)', () => {
    const mustCatch = [
      // assured-outcome family (review round 1)
      'Set for life.',
      'Your money will outlast you.',
      'There is no chance of running out.',
      'Your money won’t run out.',
      'This money lasts forever.',
      'This plan is bulletproof.',
      'An ironclad retirement.',
      'You can be assured this plan lasts.',
      'You will have more than enough every year.',
      'Your savings never deplete.',
      'There will always be enough.',
      'This plan can’t fail.',
      'You are covered no matter what.',
      'There is no way to outlive this money.',
      // plain-language certainty family (review round 2)
      'Your retirement is secure.',
      'Your money is safe.',
      'This is a safe bet.',
      'Your money will last a lifetime.',
      'You can count on this lasting.',
      'Your nest egg is rock-solid.',
      'You can sleep easy.',
      'A foolproof plan.',
      'This is a slam dunk.',
      'Worry-free retirement.',
      'Never have to worry about money.',
      'You have plenty to spare.',
      'Your income is locked.',
      'The plan holds no matter the market.',
      'You won’t ever run short.',
      // preamble evasions — the negation guard turned against itself (round 2)
      'There is no doubt your money will last forever.',
      'There is no doubt this is bulletproof.',
      'Without a doubt this is set for life.',
      'Make no mistake this plan is bulletproof.',
      'There is no question your money will never run out.',
      'There is no doubt your savings never deplete.',
      'You have nothing to fear and your money lasts forever.',
      'No fee plan and it is guaranteed.',
      'Nothing can stop your guaranteed income from never running out.',
      // round-3: uncontracted internal negation (the corpus blind spot — only the contraction was tested)
      'Your money will not run out.',
      'It will not fail.',
      'Your savings will not deplete.',
      // round-3: more plain-language certainty + quantifier/assertion frames
      'You are comfortably covered for life.',
      'You are covered for life.',
      'Set up for life.',
      'You will be comfortable for the rest of your life.',
      'You will never go broke.',
      'You will never be broke.',
      'You can breathe easy.',
      'You can stop worrying.',
      'No more money worries.',
      'There is zero chance of running out.',
      'There is no possibility of running out.',
      'There is no scenario where you run out.',
      // Act 6 · RC7's run-out share: a sample's zero worded as a certainty (the share of none reads as a bound).
      'Over the whole plan, no future runs out of money while one of you is still living.',
      'Money in the bank.',
      'You are home free.',
      // round-4: the surplus-pivot absolute (council 2026-07-18 HAWK VETO, docs/council-log.md).
      // The UNCONTRACTED arm was already caught by the '(is|are) safe' clause; the CONTRACTED arm
      // walked straight past it. Both are pinned so a lexicon reword cannot re-open the hole.
      'You are safe either way.',
      'You’re safe either way.',
    ]
    for (const s of mustCatch) {
      expect(lintCopy(s, ['false-certainty']).length, `MUST catch: "${s}"`).toBeGreaterThan(0)
    }
  })

  // --- the survival-claim corpus (council wf_6e72eca9-c20, 2026-10-06): the live crown is a max over
  //     noisy A-side survival counts at tolerance 0, so it can hold LOWER true survival than a rival —
  //     no wording may sell it as a survival win or a survival tie. The honest arms are the shipped
  //     strings that sit nearest the lexicon (the displayed-count readouts, the survival TABLES). ---
  it('the survival-claim gate catches the survival-win and survival-tie families, and passes the honest neighbours', () => {
    for (const s of SURVIVAL_MUST_CATCH) {
      expect(lintCopy(s, ['survival-claim']).length, `MUST catch: "${s}"`).toBeGreaterThan(0)
    }
    const MUST_PASS = [
      copy.assumptionOutliveValue, // "…from the same survival tables…" — a model fact, not a plan claim
      slots.workbenchRailEven('about 7 of 10'), // the live displayed-count readout (the U10 delta lines left with RC10)
      slots.subsidyRegimeCostEven('270,000'), // 'about the same either way', of premiums, not survival
      'The tool treats this as a safe guess, so it asks.',
    ]
    for (const s of MUST_PASS) {
      expect(lintCopy(s, ['survival-claim']), `MUST pass: "${s}"`).toEqual([])
    }
  })

  it('every survival-claim pattern owns a corpus sample no other pattern catches (deleting any one reds the corpus)', () => {
    const norm = (s: string) => s.replace(/[’‘]/g, "'")
    SURVIVAL_CLAIMS.forEach((re, i) => {
      const owned = SURVIVAL_MUST_CATCH.filter((s) =>
        SURVIVAL_CLAIMS.every((other, j) => (j === i) === other.test(norm(s))),
      )
      expect(owned.length, `SURVIVAL_CLAIMS[${i}] ${re} has no sample only it catches`).toBeGreaterThan(0)
    })
  })

  it('the static disclosures make no survival claim either (they render on the recommendation card; only the advice gate excludes them)', () => {
    const disclosures = Object.entries(staticDisclosures)
    expect(disclosures.length, 'there are static disclosures to sweep').toBeGreaterThan(0)
    for (const [k, v] of disclosures) {
      expect(lintCopy(v, ['survival-claim']), `${k}: "${v}"`).toEqual([])
    }
  })

  // --- the essentials-claim tripwire (council wf_cfa961da-13c, 2026-10-12): Tier 1 ranks FULL-plan
  //     survival and the essentials floor is reported, never ranked — so no string may sell the pick as
  //     essentials-first or the essentials as certain. The council's copy audit found NO shipped string
  //     claiming either; this sweep holds that, over the catalog, every slot render and the disclosures. ---
  it('no catalog string, slot render or static disclosure claims the essentials are certain or ranked first (essentials-claim — UNIVERSAL)', () => {
    const surfaces: [string, string][] = [
      ...entries,
      ...Object.entries(SLOT_RENDER),
      ...Object.entries(staticDisclosures),
    ]
    expect(surfaces.length, 'the sweep reaches the catalog').toBeGreaterThan(entries.length)
    for (const [k, v] of surfaces) {
      expect(essentialsClaims(v), `${k}: "${v}"`).toEqual([])
    }
  })

  it('the essentials-claim lexicon catches its corpus and passes the shipped floor readouts (the honest neighbours)', () => {
    for (const s of ESSENTIALS_MUST_CATCH) {
      expect(essentialsClaims(s).length, `MUST catch: "${s}"`).toBeGreaterThan(0)
    }
    const MUST_PASS = [
      copy.floorReadoutEyebrow, // "Just the essentials" — the subordinate relief line
      `${slots.xOfTen(9)} ${copy.floorReadoutCoverage}`, // "9 of 10 futures your essentials are covered"
      copy.floorReadoutTrimNote, // "That’s if you live on just the essentials starting now…" (the count's own assumption)
      copy.goalPickerIntro, // "With the basics covered…" — gated on the FULL displayed state
      copy.budgetSheetIntro, // "Essentials are the part that has to hold…"
      copy.bandPricesEssentialsNote,
      copy.dateFloorInversionNote, // R27's inversion disclosure — the floor can land LATER
      slots.dateFloorCovered(0, slots.withOdds(slots.xOfTen(9)), false),
      slots.dateFloorNotWithin(11),
      slots.dateFloorNotWithinRefiguring(11),
    ]
    for (const s of MUST_PASS) {
      expect(essentialsClaims(s), `MUST pass: "${s}"`).toEqual([])
    }
  })

  // --- THE PAY CHECK'S NEW STRINGS (U8, U9, U13, KTD21; KTD19's law). Every key and slot the pay check
  //     adds passes the Hawk's narrowed ban (the ONE lexicon, `hawkBan.ts`), writes the curly apostrophe,
  //     and sits outside the verdict and control scopes — so no new string inherits a verdict's
  //     free-numeral sweep or a control's forced hedge by its name. Enumerated by PREFIX (a key added
  //     later is swept with no edit), plus the named strays outside the prefixes; the counts below are
  //     floors, so the enumeration can never silently empty. ---
  const PAY_CHECK_KEYS: readonly CopyKey[] = (Object.keys(copy) as CopyKey[]).filter(
    (k) =>
      /^(q?[wW]orkingCost|q?[wW]orkingLedger|assumptionWorkingCost|assumptionWorkingYearCheck)/.test(k) ||
      [
        'errWorkingCostUnanswered',
        'errWorkingCostZero',
        'stalenessWorkingYears',
        'stalenessWorkingYearCost',
        'stalenessPayCheckNote',
        'stalenessPayCheckCta',
        'stalenessPayCheckGateLead',
        // The act's other door label (council `wf_7fa86902-35c`, `WORKING_COST_ACT_COPY`).
        'stalenessPayCheckCtaUpdate',
        // Build 2's moved left over (R12): the lead and the door label of its standing line, and its gate door.
        'stalenessLeftOverNote',
        'stalenessLeftOverCta',
        'stalenessLeftOverGateDoor',
        'employerCoverageHelp',
        'oopHelpWorking',
        // The pay check's home since the walk left (Act 6 · RC13b, RC14): the drawer's and its Goals card's names.
        'profileWorkingCostName',
        'profileMoneyPictureName',
      ].includes(k),
  )
  const PAY_CHECK_SLOTS = (Object.keys(slots) as (keyof typeof slots)[]).filter(
    (k) =>
      /^(workingCost|workingLedger|assumptionWorkingCost|stalenessLeftOver)/.test(k) ||
      // The W step gate's two stale-figure messages (the U11 walk's (ad)): named strays, as the gate's own
      // `errWorkingCostUnanswered` is among the keys.
      ['errWorkingCostStaleBelowQuote', 'errWorkingCostStaleKeep'].includes(k),
  )
  const payCheckStrings = (): readonly (readonly [string, string])[] => [
    ...PAY_CHECK_KEYS.map((k) => [k, copy[k]] as const),
    ...PAY_CHECK_SLOTS.map((k) => [k, SLOT_RENDER[k]] as const),
  ]

  it('the pay check’s enumeration is non-vacuous — its prefixes reach every new string', () => {
    expect(PAY_CHECK_KEYS.length, PAY_CHECK_KEYS.join(', ')).toBeGreaterThanOrEqual(60)
    expect(PAY_CHECK_SLOTS.length, PAY_CHECK_SLOTS.join(', ')).toBeGreaterThanOrEqual(40)
    // The walk's two step headings left with the walk (Act 6 · RC14); the drawer's own names stand in for them.
    for (const named of ['profileWorkingCostName', 'profileMoneyPictureName', 'errWorkingCostUnanswered', 'stalenessPayCheckNote'] as const) {
      expect(PAY_CHECK_KEYS).toContain(named)
    }
    for (const named of ['errWorkingCostStaleBelowQuote', 'errWorkingCostStaleKeep'] as const) {
      expect(PAY_CHECK_SLOTS).toContain(named)
    }
  })

  it('no pay-check string says "conservative", "worst case" or "only later" (the Hawk’s narrowed ban)', () => {
    for (const [name, text] of payCheckStrings()) {
      for (const b of HAWK_BAN) expect(text, `${name} says "${b.word}": "${text}"`).not.toMatch(b.re)
    }
  })

  // --- BUILD 2's LEFT-OVER STRINGS (R16): no string about the left over says which way the credit moves the
  //     answer — its reach can run either way (insight 143) and is unmeasured until U11. Enumerated by name
  //     prefix (the question's keys and slots, the seat's name, the methodology family; U14's lines join by
  //     the same prefixes), so a string added later is swept with no edit. Scoped to these strings ALONE:
  //     W's stale line legitimately says "can look better" right beside U14's clause. ---
  // The whole-window rebuild (KTD9): the typed-below runs are left-over strings too (each states what each answer adds),
  // so they join BY NAME. Never the bare `workingCostTypedBelow` prefix: its counts slots end on "can look better than
  // it really is" (the W lean, not a left-over lean), which this ban reds.
  const TYPED_BELOW_SPAN_SLOTS = [
    'workingCostTypedBelowSpanLabel',
    'workingCostTypedBelowSpanAtQuoteAdds',
    'workingCostTypedBelowSpanAtQuoteNothing',
    'workingCostTypedBelowSpanAdds',
    'workingCostTypedBelowSpanAddsNothing',
    // The walk-9 form council's call (1b): `same`'s merged sentence inside a list.
    'workingCostTypedBelowSpanBothAdd',
    'workingCostTypedBelowSpanBothNothing',
    'workingCostTypedBelowSpanShortNothing',
    'workingCostTypedBelowSpanShortOut',
    'workingCostTypedBelowSpanShort',
    'workingCostTypedBelowSpanStillShort',
    'workingCostTypedBelowSpanEven',
    'workingCostTypedBelowSpanLess',
    // …and call (2): T's twin's close.
    'workingCostTypedBelowSpanLessTwin',
    'workingCostTypedBelowSpanSame',
    // The walk-8 form council's cap sentence (KD5): what the answer at the spending adds at most, a left-over string too.
    'workingCostTypedBelowCapLeftOver',
    'workingCostTypedBelowCapShort',
    'workingCostTypedBelowCapNone',
    // The survivor part (the survivor-path build's KTD5, its form the walk-8 council's KD7): its costs and its survivor
    // ceiling are left-over strings too.
    'workingCostTypedBelowSurvivorCharges',
    'workingCostTypedBelowSurvivorWholeGap',
    'workingCostTypedBelowSurvivorLess',
  ] as const satisfies readonly (keyof typeof slots)[]
  const LEFT_OVER_STRINGS = (): readonly (readonly [string, string])[] =>
    payCheckStrings().filter(
      ([name]) =>
        /^(workingLedgerLeftOver|assumptionWorkingCostLeftOver|assumptionWorkingYearCheckLeftOver|stalenessLeftOver|workingCostStaleLeftOver)/.test(name) ||
        (TYPED_BELOW_SPAN_SLOTS as readonly string[]).includes(name),
    )
  /** The gloss's look-back as the composer can pass it: none (every rider after a line's first), one year, and two. */
  const GLOSSES = [null, 1, 2] as const
  /** Every run slot rendered over every frame the composer can pass (answer × opener × one year × the quote's source ×
   *  the survivor scope × the three restatement predicates, the walk-9 form council's call (1b)), with one figure, two
   *  groups and a band (the amount rule, flip (iii)), NL's third limit on and off, and the close at most or not over every
   *  {@link GLOSSES}, so a branch the one sample above never takes is swept too. `Y` is the first group's year. */
  const spanRenders = (S: string, T: string, Y: number): readonly string[] =>
    (['This', 'Your'] as const).flatMap((answer) =>
      [true, false].flatMap((opener) =>
        [true, false].flatMap((oneYear) =>
          ([true, false] as const).flatMap((bothAlive) =>
            [true, false].flatMap((quoteNamed) =>
              [true, false].flatMap((typedNamed) =>
                [true, false].flatMap((savingsNamed) =>
                  (['spending', 'budget'] as const).flatMap((source) => {
                    const f: TypedBelowSpanFrame = { answer, opener, oneYear, typed: S, quote: S, source, bothAlive, quoteNamed, typedNamed, savingsNamed }
                    const amounts: readonly TypedBelowAmount[] = [
                      { kind: 'one', figure: S },
                      { kind: 'two', groups: [{ figure: S, firstYear: Y, lastYear: Y + 1 }, { figure: T, firstYear: Y + 2, lastYear: Y + 2 }] },
                      { kind: 'band', least: S, most: T },
                    ]
                    return [
                      ...amounts.map((a) => slots.workingCostTypedBelowSpanAtQuoteAdds(f, a)),
                      slots.workingCostTypedBelowSpanAtQuoteNothing(f),
                      ...amounts.flatMap((a) => [true, false].map((all) => slots.workingCostTypedBelowSpanAdds(f, a, all))),
                      slots.workingCostTypedBelowSpanAddsNothing(f),
                      ...amounts.map((a) => slots.workingCostTypedBelowSpanBothAdd(f, a)),
                      slots.workingCostTypedBelowSpanBothNothing(f),
                      ...amounts.map((a) => slots.workingCostTypedBelowSpanShortNothing(f, a)),
                      ...amounts.map((a) => slots.workingCostTypedBelowSpanShort(f, a)),
                      ...amounts.flatMap((a) => [true, false].map((all) => slots.workingCostTypedBelowSpanShortOut(f, a, all))),
                      ...amounts.map((a) => slots.workingCostTypedBelowSpanStillShort(f, a)),
                      slots.workingCostTypedBelowSpanEven(f),
                      ...amounts.flatMap((a) =>
                        [true, false].flatMap((atMost) => GLOSSES.map((g) => slots.workingCostTypedBelowSpanLess(f, a, atMost, g))),
                      ),
                      ...amounts.flatMap((a) => GLOSSES.map((g) => slots.workingCostTypedBelowSpanLessTwin(f, a, g))),
                      ...GLOSSES.map((g) => slots.workingCostTypedBelowSpanSame(f, g)),
                    ]
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    )
  /** 256 frames; a frame renders 3 + 1 + 3 × 2 + 1 + 3 + 1 + 3 + 3 + 3 × 2 + 3 + 1 + 3 × 2 × 3 + 3 × 3 + 3 = 61. */
  const SPAN_RENDERS_COUNT = 256 * 61
  /** Every cap sentence over the quote's source (the walk-8 form council's KD5), and the lean over every host form (the
   *  walk-9 form council's call (2)). */
  const capRenders = (S: string): readonly string[] =>
    (['spending', 'budget'] as const).flatMap((source) => [
      slots.workingCostTypedBelowCapLeftOver(source, S),
      slots.workingCostTypedBelowCapShort(source, S),
      slots.workingCostTypedBelowCapNone(source),
    ])
  /** Every survivor-part slot over every survivor frame (the quote's source × whether the answers are named, the walk-9
   *  form council's call (4)), both forms and the close. */
  const survivorRenders = (S: string, T: string): readonly string[] =>
    (['spending', 'budget'] as const).flatMap((source) =>
      (['none', 'answers'] as const).flatMap((names) => {
        const f: TypedBelowSurvivorFrame = { typed: T, quote: S, source, names }
        return [
          slots.workingCostTypedBelowSurvivorCharges(f, [T, S]),
          slots.workingCostTypedBelowSurvivorWholeGap(f),
          ...GLOSSES.map((g) => slots.workingCostTypedBelowSurvivorLess(f, S, g)),
        ]
      }),
    )

  it('no left-over string names a lean — never earlier, better, worse or conservative (R16), and the sweep is non-vacuous', () => {
    const strings = LEFT_OVER_STRINGS()
    // 73 at the walk-9 form build: 52 by prefix (the seat's runs leads among them) and its 21 run, cap and survivor slots
    // by name (the later label retired; `same`'s merged pair and T's twin's close joined).
    expect(strings.length, strings.map(([n]) => n).join(', ')).toBeGreaterThanOrEqual(73)
    for (const [name, text] of strings) {
      for (const b of LEFT_OVER_LEAN_BAN) expect(text, `${name} says "${b.word}": "${text}"`).not.toMatch(b.re)
    }
    // …and every branch of every run slot, beyond the one sample each above, every cap sentence (2 sources, 3 a source)
    // and every survivor-part slot (4 frames, 5 renders a frame: the two costs forms and the close over every gloss).
    const branches = [...spanRenders('16,985', '21,000', 2030), ...capRenders('16,985'), ...survivorRenders('16,985', '21,000')]
    expect(branches.length).toBe(SPAN_RENDERS_COUNT + 2 * 3 + 4 * 5)
    for (const text of branches) for (const b of LEFT_OVER_LEAN_BAN) expect(text, `a run says "${b.word}": "${text}"`).not.toMatch(b.re)
  })

  it('the survivor words (the survivor-path build’s U3): never "on your own" (the catalog’s living one-earner word), every one past the catastrophe and Hawk bans, and with the scope off every run slot renders the gate-off words', () => {
    const survivor = [...survivorRenders('4,500', '84,000'), copy.workingLedgerLeftOverSpansLeadSurvivor]
    for (const text of survivor) {
      expect(text, text).not.toMatch(/on your own/i)
      for (const b of HAWK_BAN) expect(text, `says "${b.word}": "${text}"`).not.toMatch(b.re)
    }
    // The keys carry "Survivor", so the catastrophe gate sweeps them by name (`isSurvivorKey`).
    const survivorKeys = [...TYPED_BELOW_SPAN_SLOTS.filter((n) => n.includes('Survivor')), 'workingLedgerLeftOverSpansLeadSurvivor']
    expect(survivorKeys.length, 'the survivor part’s three slots and the scoped lead').toBe(4)
    for (const k of survivorKeys) expect(k, k).toMatch(/survivor/i)
    // The gate-off words, typed by hand, where the scope is off (a household the engine draws no such year for), the
    // quote's dollars in full where the line has not said them, and once it has (call (1b)).
    const off = (opener: boolean, oneYear: boolean, quoteNamed: boolean): TypedBelowSpanFrame => ({
      answer: 'This',
      opener,
      oneYear,
      typed: '84,000',
      quote: '105,000',
      source: 'spending',
      bothAlive: false,
      quoteNamed,
      typedNamed: true,
      savingsNamed: true,
    })
    const twoShort: TypedBelowAmount = { kind: 'two', groups: [{ figure: '4,015', firstYear: 2029, lastYear: 2030 }, { figure: '3,652', firstYear: 2031, lastYear: 2032 }] }
    expect(slots.workingCostTypedBelowSpanAtQuoteAdds(off(true, false, false), { kind: 'one', figure: '5,985' })).toBe('Each working year, the answer at your spending of $105,000 a year would add at most $5,985 a year.')
    expect(slots.workingCostTypedBelowSpanAtQuoteAdds(off(true, false, true), { kind: 'one', figure: '5,985' })).toBe('Each working year, the answer at your spending would add at most $5,985 a year.')
    expect(slots.workingCostTypedBelowSpanShort(off(false, false, true), twoShort)).toBe(
      'At your spending, each working year comes up $4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032, which would be taken from your savings.',
    )
    expect(slots.workingCostTypedBelowSpanShort(off(false, true, true), { kind: 'one', figure: '4,015' })).toBe('At your spending, that working year comes up $4,015 short, which would be taken from your savings.')
    expect(slots.workingCostTypedBelowSpanLessTwin(off(true, false, true), { kind: 'one', figure: '6,000' }, null)).toBe(
      'At your spending, that’s $6,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
    )
    // …and the scope, typed by hand, where it is on.
    const on = (opener: boolean, oneYear: boolean, quoteNamed: boolean): TypedBelowSpanFrame => ({ ...off(opener, oneYear, quoteNamed), bothAlive: true })
    expect(slots.workingCostTypedBelowSpanAtQuoteAdds(on(true, false, true), { kind: 'one', figure: '5,985' })).toBe('Each working year you’re both alive, the answer at your spending would add at most $5,985 a year.')
    expect(slots.workingCostTypedBelowSpanShort(on(false, false, true), twoShort)).toBe(
      'At your spending, each working year you’re both alive comes up $4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032, which would be taken from your savings.',
    )
    expect(slots.workingCostTypedBelowSpanShort(on(false, true, true), { kind: 'one', figure: '4,015' })).toBe('At your spending, that working year, if you’re both alive, comes up $4,015 short, which would be taken from your savings.')
    expect(slots.workingCostTypedBelowSpanAtQuoteAdds(on(false, false, true), { kind: 'one', figure: '5,985' }), 'a run’s credit sentence takes its scope from the lead').toBe('The answer at your spending would add at most $5,985 a year.')
    expect(slots.workingCostTypedBelowSpanLessTwin(on(true, false, true), { kind: 'one', figure: '6,000' }, 2), 'T’s twin: the scope on the close’s own claim').toBe(
      'At your spending, that’s $6,000 less in your savings in each working year you’re both alive, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.',
    )
  })

  it('the R16 list counts every typed-below run slot by name and never the counts slots; its ban still reds "better" planted in a run', () => {
    const names = LEFT_OVER_STRINGS().map(([n]) => n)
    for (const k of TYPED_BELOW_SPAN_SLOTS) expect(names, `${k} joins the R16 list`).toContain(k)
    expect(names, 'the seat’s runs lead joins by prefix').toContain('workingLedgerLeftOverSpansLead')
    for (const k of ['workingCostTypedBelowCounts', 'workingCostTypedBelowCountsBudget', 'workingCostTypedBelowAdds', 'workingCostTypedBelowLean'] as const) {
      expect(names, `${k} stays out (the W lean, not a left-over lean)`).not.toContain(k)
    }
    // Non-vacuous: a run with a lean planted in it is caught.
    const planted = `${SLOT_RENDER.workingCostTypedBelowSpanAdds} So this answer looks better.`
    expect(LEFT_OVER_LEAN_BAN.some((b) => b.re.test(planted)), planted).toBe(true)
  })

  it('the left-over lean ban catches its planted samples, and passes R6’s own required words ("later year")', () => {
    for (const b of LEFT_OVER_LEAN_BAN) {
      expect(b.mustCatch.length, `${b.word} owns at least one sample`).toBeGreaterThan(0)
      for (const sample of b.mustCatch) expect(sample, `${b.word} must catch: "${sample}"`).toMatch(b.re)
    }
    for (const required of [slots.workingLedgerLeftOverSavedLine('1'), slots.workingLedgerLeftOverSpentLine('1')]) {
      for (const b of LEFT_OVER_LEAN_BAN) expect(required, `R6's words trip "${b.word}"`).not.toMatch(b.re)
    }
  })

  // --- THE RETIRED WORDINGS (council `wf_7fa86902-35c`, U11 walk 4). Below today's spending the W row offers no Keep
  //     door (ruling 34), so no line there may name the act "confirm or change" or "checking" (walk 4's (ba), (az):
  //     three names for one act, and a door that is not there); and the connectives the council struck must never
  //     come back anywhere in the catalog's words. Swept over what a reader can see: every catalog string, every
  //     slot rendered, and every composed line, gate line and door over the stale-W witnesses — never copy.ts's
  //     comments, which record why the words were retired. ---
  const RETIRED_EVERYWHERE: readonly RegExp[] = [
    /\bSo checking\b/,
    /\binstead of none\b/,
    /\btakes none of those shortfalls\b/,
    /\bdoesn[’']t move this answer\b/,
    // U11 walk 5: (bh) the bare "adds none of it" with no reason, (bp) "still adds none of that", (bj) the door that named
    // buttons the gate doesn't draw, (bk) the definition read as "the tool doesn't work", (bn) "is checked".
    /\bThis answer adds none of it to your savings\./,
    /\bstill adds none of that\b/,
    /\bEither button on this page\b/,
    /\ba tax on pay the tool doesn[’']t work out\b/,
    /\bfor a working year(, above,)? is checked\b/,
    // U11 walk 6 (council `wf_22858e04-f7a`): the run-in label's colon (each label is a <dt> now), and the one sentence
    // that held all three of S's choices (F11).
    /\bThis answer now:/,
    /, or “No — I’ll enter a different figure” to enter\b/,
    // U11 walk 8 (the walk-8 form council `wf_98d8bc0e-e0a`): the rider without "between the two answers" (KD2), "plus"
    // (KD1: it would claim the spending side pays more tax, false in survivor RMD years), the survivor coda's opener and
    // its whole-gap echo (KD7: the survivor part names both whole costs before its close).
    /\bnot including any difference in income tax\b/,
    /\bplus any difference\b/,
    /\bIn such a working year\b/,
    /\bThat \$[\d,]+(?:\.\d\d)? a year is the whole gap\b/,
    // U11 walk 9 (the walk-9 form council `wf_9f28e691-1dc`; `docs/plans/features/typed-below-walk9-form-build-spec.md`):
    // the survivor part's old opening (call (4): it read as one more run's condition), the floor aside (call (2): the lean
    // names the floor in dollars now), the rider before walk 9's flip (i), and the bracketed gloss (call (5): brackets
    // are not voiced).
    /\bIf only one of you is alive in a working year\b/,
    /, the least a working year almost always costs,/,
    /\bnot including any difference between the two answers\b/,
    /\(the extra premium Medicare charges once you[’']re on it\b/,
    // U11 walk 9's lows (the walk-9 form spec's U3): B's seat's two pronouns, each reaching back past a sentence (R9 (3a)),
    // and the out-of-date methodology lines' "Updating it", whose "it" sat after "your savings" (R9 (1)–(2)).
    /\bputs (?:them|it) in\. It adds no money left over\b/,
    /\bUpdating it (?:to your spending figures|also puts)\b/,
  ]
  /** Retired on the typed-below line ONLY (the walk-9 form council's call (3)): W8-R6's run label. The money picture's
   *  ledger keeps its own "If you’re still working in …" rows on purpose — its year 0 is its own row, so every later row it
   *  conditions is truly a later year, and it marks no false stop — so this is never a RETIRED_EVERYWHERE pattern, and
   *  neither surface is "fixed" to match the other (`docs/landmines.md`). */
  const RETIRED_ON_THE_TYPED_BELOW_LINE: readonly RegExp[] = [/\bIf you[’']re still working in\b/]
  const RETIRED_BELOW_QUOTE: readonly RegExp[] = [/\bconfirm or change your\b/i, /\bchecking your figure\b/i]
  const RISEN = DEV_SEEDS.datesavedrisen
  const { workingYearLeftOver: _risenAnswer, ...risenNoAnswer } = RISEN
  const yesOf = RISEN.workingYearCost
  const STALE_W_WITNESSES: ReadonlyArray<readonly [string, ScenarioDraft]> = [
    ['datecoststale', DEV_SEEDS.datecoststale],
    ['datesavedstale', DEV_SEEDS.datesavedstale],
    ['datesavedrisen', RISEN],
    ['datesavedrisenshort', DEV_SEEDS.datesavedrisenshort],
    ['datesavedrisenlater', DEV_SEEDS.datesavedrisenlater],
    ['risen, whole', { ...RISEN, people: [{ ...RISEN.people[0]!, earnedIncomeReal: 165_000 }, RISEN.people[1]!] }],
    ['risen, first none', { ...RISEN, annualSpendingReal: 100_985 }],
    ['risen, no answer', risenNoAnswer],
    [
      'risen, kept',
      yesOf?.kind === 'confirmed'
        ? { ...RISEN, workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: yesOf.stateTaxReading, keptOverQuoteReal: 84_000 } }
        : RISEN,
    ],
  ]
  /** What each witness puts in front of a reader: the line, the line with the gate's door on a tab that can save (its
   *  heading, scope and route), the line with the Result's door (its label, sentences and list), the Result's door
   *  label, and — wherever the W row draws Keep (never below the quote) — the condition above it. */
  const seen = (d: ScenarioDraft): readonly string[] => {
    const parts = workingYearCostStaleLine(d)
    const door = workingYearCostStaleDoor(d)
    if (parts === null || door === null) throw new Error('[test setup] every witness holds a stale W')
    const line = workingYearCostStaleLineText(parts)
    const a = WORKING_COST_ACT_COPY[door.act]
    const result = door.result === null ? [] : [door.result.label, ...door.result.lead, ...door.result.items, ...door.result.tail]
    const keep = heldYesBelowQuote(d) ? null : workingYearCostKeepCondition(d)
    return [
      line,
      [line, door.gate.heading, door.gate.scope, door.gate.route].join(' '),
      [line, ...result].join(' '),
      copy[a.resultDoor],
      ...(keep === null ? [] : [keep]),
    ]
  }

  /** The households the composed sweep reads: every whole-window witness (the rebuild's KTD9; `TYPED_BELOW_WITNESSES`, each
   *  of which opens the survivor gate), and the survivor-path build's — the council's C on a $105,000 budget at 100, 90
   *  and 80 % sticky and at $101,000 typed, TM and the pension household as all-sticky budgets (the survivor part's
   *  whole-gap form, on a budget quote), the gate's witnesses on (Sam 57, both working) and off (Sam 56, the younger
   *  non-worker: the gate-off words, no survivor part). */
  const TYPED_BELOW_GATE_OFF = ['sam56', 'youngerNonWorker'] as const
  const TYPED_BELOW_SWEPT: Readonly<Record<string, ScenarioDraft>> = {
    ...TYPED_BELOW_WITNESSES,
    c100: councilBudgetHousehold(1),
    c90: councilBudgetHousehold(0.9),
    c80: councilBudgetHousehold(0.8),
    c100at101000: councilBudgetHousehold(1, 101_000),
    tmBudget: TM_ALL_STICKY_BUDGET,
    pensionBudget: PENSION_ALL_STICKY_BUDGET,
    ...SURVIVOR_GATE_WITNESSES,
  }
  /** The survivor part's condition, in every reading that carries it: the opening of its costs sentence, in both forms
   *  ("In a working year with only one of you alive, that year’s costs …", the walk-9 form council's call (4)), the
   *  closing paragraph after the runs' list on two or more runs and the paragraph's last sentences on one. */
  const SURVIVOR_PART = 'In a working year with only one of you alive, that year’s costs '
  /** How many readings {@link TYPED_BELOW_COMPOSED} takes of each household. */
  const READINGS = 7
  /** Every composed typed-below line over {@link TYPED_BELOW_SWEPT}, as a reader sees it (`notePartsText`, the survivor
   *  part included): the Result and the gate each holding the moved clause and with it hosted elsewhere (one order on both,
   *  the walk-9 form council's call (1a)), the seat in the details sheet and on the walk's money-picture step, and the gate's
   *  line with its door as `composeReentry` draws it (the door's scope naming the moved fact exactly where the line carried
   *  it). Every household draws every host (a "saved" answer the run carries, on a fresh typed figure below the quote), so a
   *  null throws. */
  const TYPED_BELOW_COMPOSED = (): readonly (readonly [string, string])[] =>
    Object.entries(TYPED_BELOW_SWEPT).flatMap(([name, d]) => {
      const carrying = workingYearCostTypedBelowComposed(d, { kind: 'gate', carriesMoved: true })
      const hosts = [
        ['Result', workingYearCostTypedBelowLine(d, { kind: 'result', carriesMoved: true })],
        ['Result, clause hosted', workingYearCostTypedBelowLine(d, { kind: 'result', carriesMoved: false })],
        ['gate', carrying?.parts ?? null],
        ['gate, clause hosted', workingYearCostTypedBelowLine(d, { kind: 'gate', carriesMoved: false })],
        ['seat, sheet', workingYearLeftOverAtQuoteLine(d, 'sheet')],
        ['seat, step', workingYearLeftOverAtQuoteLine(d, 'step')],
      ] as const
      const texts = hosts.map(([host, parts]) => {
        if (parts === null) throw new Error(`[test setup] ${name} draws no typed-below line on the ${host}`)
        return [`${name} (${host})`, notePartsText(parts)] as const
      })
      const door = workingYearCostTypedBelowDoor(d, carrying?.carriedMoved === true)
      if (door === null) throw new Error(`[test setup] ${name} draws no typed-below door`)
      return [...texts, [`${name} (gate, door)`, [texts[2]![1], door.heading, door.scope, door.route].join(' ')] as const]
    })

  it('every composed typed-below line, on every witness and host, keeps the retired wordings — "If you’re still working in" among them, on this line only — the below-quote acts and the Hawk’s ban out (KTD9); the survivor part counted in every gate-on reading, in both its forms, never naming the answers here (call (4)), and never "on your own" (the survivor-path build’s R8)', () => {
    const composed = TYPED_BELOW_COMPOSED()
    const households = Object.keys(TYPED_BELOW_SWEPT).length
    // Non-vacuous: seven readings a household (six hosts and the gate with its door), every household.
    expect(composed.length).toBe(households * READINGS)
    expect(composed.length, 'the witness set never silently empties').toBeGreaterThanOrEqual(150)
    for (const [name, text] of composed) {
      for (const re of RETIRED_EVERYWHERE) expect(text, `${name}: ${re}`).not.toMatch(re)
      for (const re of RETIRED_ON_THE_TYPED_BELOW_LINE) expect(text, `${name}: ${re}`).not.toMatch(re)
      // A typed figure sits below the quote on every witness, so no Keep door is drawn there (ruling 34).
      for (const re of RETIRED_BELOW_QUOTE) expect(text, `${name}: ${re}`).not.toMatch(re)
      for (const b of HAWK_BAN) expect(text, `${name} says "${b.word}": "${text}"`).not.toMatch(b.re)
      // The survivor part's words never borrow the living one-earner year's "on your own" (R8).
      expect(text, `${name}: "on your own"`).not.toMatch(/\bon your own\b/i)
      // The runs above named each answer, so this line's survivor part names none (the out-of-date family's does).
      expect(text, `${name}: the answers named in the survivor part`).not.toMatch(/\bin this answer at your figure\b/)
    }
    // The line's retired label is the ledger's live one, on purpose (call (3)): the ledger keeps it, so the pattern is
    // this line's alone — and it catches the form it retires.
    expect(slots.workingLedgerLaterYear(2029), 'the ledger keeps its condition').toMatch(RETIRED_ON_THE_TYPED_BELOW_LINE[0]!)
    expect('If you’re still working in 2029 through 2032', 'the plant').toMatch(RETIRED_ON_THE_TYPED_BELOW_LINE[0]!)
    // The sweep reads the survivor part: every reading of every gate-on household carries its condition (seven a
    // household), and no reading of a gate-off household does; both forms' costs sentences are among them.
    const gateOff = (name: string): boolean => TYPED_BELOW_GATE_OFF.some((k) => name.startsWith(`${k} (`))
    const withSurvivor = composed.filter(([, text]) => text.includes(SURVIVOR_PART))
    expect(withSurvivor.length, 'the survivor part in every gate-on reading').toBe((households - TYPED_BELOW_GATE_OFF.length) * READINGS)
    expect(withSurvivor.some(([name]) => gateOff(name)), 'and in no gate-off reading').toBe(false)
    expect(composed.filter(([, text]) => text.includes(`${SURVIVOR_PART}still count in full: your figure of $`)).length, 'the whole-gap form, both whole costs named (the walk-8 form council’s KD7): C at 100 % twice, TM and the pension as budgets').toBe(4 * READINGS)
    expect(composed.filter(([, text]) => /\bwhole gap\b/.test(text)).length, 'the whole-gap echo retired, bare or with X').toBe(0)
    expect(composed.filter(([, text]) => text.includes(`${SURVIVOR_PART}count as $`)).length, 'the charges form: every other gate-on household').toBe((households - TYPED_BELOW_GATE_OFF.length - 4) * READINGS)
    // The gate's door names the moved fact exactly where the line carried the moved clause (call (1a)).
    for (const [name, text] of composed.filter(([n]) => n.endsWith('(gate, door)'))) {
      expect(text.includes('or what you said about the money left over'), name).toBe(text.includes('You said all the money left over in a working year goes into your savings'))
    }
  })

  it('the out-of-date family’s survivor part names the two answers beside their figures (the walk-9 form council’s call (4)), on the line and on every waiting seat that speaks a run, and opens "In a working year with only one of you alive"', () => {
    let named = 0
    for (const [label, d] of STALE_W_WITNESSES) {
      const parts = workingYearCostStaleLine(d)
      for (const text of [...(parts?.closing ?? []), workingYearLeftOverWaitingSeat(d)]) {
        if (!text.includes(SURVIVOR_PART)) continue
        named += 1
        expect(text, label).toMatch(/\bthat year’s costs (?:count as \$[\d,]+ in this answer at your figure of \$[\d,]+ a year, and \$[\d,]+ in the answer at your (?:spending of|budget’s) \$|still count in full: your figure of \$[\d,]+ a year in this answer, and your)/)
      }
    }
    // A, B and C rose past the held figure with the gate open (the line); B's and C's seats speak their runs.
    expect(named, 'the family’s survivor parts are read').toBeGreaterThanOrEqual(5)
  })

  it('the retired wordings never return: "So checking", "instead of none", "takes none of those shortfalls" and "doesn’t move this answer" in no catalog string, rendered slot or composed line', () => {
    const strings: (readonly [string, string])[] = [
      ...(Object.keys(copy) as CopyKey[]).map((k) => [k, copy[k]] as const),
      ...(Object.keys(SLOT_RENDER) as (keyof typeof slots)[]).map((k) => [k, SLOT_RENDER[k]] as const),
      ...STALE_W_WITNESSES.flatMap(([label, d]) => [...seen(d), workingYearLeftOverWaitingSeat(d)].map((t) => [label, t] as const)),
      ...TYPED_BELOW_COMPOSED(),
    ]
    expect(strings.length, "the sweep is non-vacuous").toBeGreaterThan(990)
    // …and it reads the survivor part: every gate-on household's seven composed readings carry it.
    // Keyed on the survivor part's OWN close, right after its costs sentence and never glossed on this line ("…a year. At
    // your …, that’s at most $X a year less in your savings, except for…"): every run's close carries the same rider, so
    // the rider alone would count a reading whose survivor part lost it (the tax rider build's mutant pass, R3).
    const SURVIVOR_RIDER =
      /\bIn a working year with only one of you alive, that year’s costs (?:count as|still count in full:) .*? a year\. At your (?:spending|budget), that’s at most \$[\d,]+ a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge\./
    expect(strings.filter(([, text]) => SURVIVOR_RIDER.test(text)).length, 'the survivor part is swept').toBeGreaterThanOrEqual(
      (Object.keys(TYPED_BELOW_SWEPT).length - TYPED_BELOW_GATE_OFF.length) * READINGS,
    )
    for (const [name, text] of strings) for (const re of RETIRED_EVERYWHERE) expect(text, `${name}: ${re}`).not.toMatch(re)
    // Non-vacuous: each pattern catches the wording it retires.
    const planted = [
      'So checking your figure at $90,000 or more adds…',
      '…adds $10,985 instead of none today.',
      'This answer takes none of those shortfalls from your savings.',
      'That change alone doesn’t move this answer.',
      'This answer adds none of it to your savings.',
      'Updating your figure to $105,000 or more still adds none of that $16,985 to your savings.',
      'Either button on this page leads to where you can update your figure.',
      '…if a working year also costs you health premiums or a tax on pay the tool doesn’t work out.',
      'This question waits until your figure for a working year, above, is checked.',
      'This answer now: Once you’ve both stopped working…',
      'There, choose “Keep $84,000 a year” only if…, “Yes, that’s about right” to use $78,000 a year only if…, or “No — I’ll enter a different figure” to enter $78,000 a year plus them.',
      '…$11,000 a year less, not including any difference in income tax and Medicare’s income surcharge.',
      '…$11,000 a year less in your savings, plus any difference between the two answers in income tax.',
      'In such a working year, this answer takes at most $15,750 a year less from your savings than it would at your spending of $105,000 a year.',
      'That $15,000 a year is the whole gap to your figure of $90,000 a year.',
      'If only one of you is alive in a working year, that year’s costs count as $63,000 at your figure of $84,000 a year.',
      'At your spending of $105,000 a year, the least a working year almost always costs, your first working year would have $5,985 left over.',
      '…$11,000 a year less in your savings, not including any difference between the two answers in income tax and Medicare’s income surcharge.',
      '…Medicare’s income surcharge (the extra premium Medicare charges once you’re on it, when your income two years before was high).',
      'Updating to $105,000 or more puts them in. It adds no money left over, because your first working year, 2026, comes up short at that cost.',
      'Updating it to your spending figures or more won’t change that, because at your spending figures your first working year comes up short.',
    ]
    expect(planted.length, 'one plant per pattern').toBe(RETIRED_EVERYWHERE.length)
    planted.forEach((p, i) => expect(p).toMatch(RETIRED_EVERYWHERE[i]!))
  })

  it('U11 walk 9’s R9 (5): no moved line names an answer — the moved note sits under the reply buttons, where "answer" reads as the reply just chosen (council `wf_9bd3c243-4e7`)', () => {
    const NAMES_AN_ANSWER = /\banswers?\b/i
    const moved = ['workingLedgerLeftOverRoseLine', 'workingLedgerLeftOverFellLine', 'workingLedgerLeftOverRoseLineAt', 'workingLedgerLeftOverFellLineAt'] as const
    for (const k of moved) expect(SLOT_RENDER[k], k).not.toMatch(NAMES_AN_ANSWER)
    // Non-vacuous: the clause it retires reds, beside the clause that replaced it, which passes.
    expect('…but not all of it, leave this as it is: your answer still counts the $16,985 you said goes in.', 'the plant').toMatch(NAMES_AN_ANSWER)
    expect(SLOT_RENDER.workingLedgerLeftOverRoseLineAt, 'the control').toContain('leave this as it is: each working year still adds at most the $16,985 you said goes in.')
  })

  it('below today’s spending (no Keep door, ruling 34) no line, gate line or door says “confirm or change your” or “checking your figure”; where the Keep door is real, “confirm or change” is the act', () => {
    let below = 0
    for (const [label, d] of STALE_W_WITNESSES) {
      const texts = seen(d)
      if (heldYesBelowQuote(d)) {
        below += 1
        for (const t of texts) for (const re of RETIRED_BELOW_QUOTE) expect(t, `${label}: ${re}`).not.toMatch(re)
      } else {
        expect(texts.join(' '), `${label}: the Keep door is real, so its act is named`).toMatch(/confirm or change your figure/i)
      }
    }
    expect(below, 'the below-quote arm is non-vacuous').toBeGreaterThanOrEqual(7)
  })

  it('the Hawk’s ban is non-vacuous here too — every pattern catches its planted corpus', () => {
    for (const b of HAWK_BAN) {
      expect(b.mustCatch.length, `${b.word} owns at least one sample`).toBeGreaterThan(0)
      for (const sample of b.mustCatch) expect(sample, `${b.word} must catch: "${sample}"`).toMatch(b.re)
    }
  })

  it('every pay-check string writes the curly apostrophe (the catalog writes ’)', () => {
    for (const [name, text] of payCheckStrings()) {
      expect(text, `${name}: a straight apostrophe in "${text}"`).not.toMatch(/'/)
    }
  })

  it('no pay-check key or slot is a verdict or control key (KTD19) — chrome and notes, never the verdict’s sweep', () => {
    for (const [name] of payCheckStrings()) {
      expect(isVerdictKey(name), `${name} is verdict-scoped`).toBe(false)
      expect(isControlKey(name), `${name} is control-scoped`).toBe(false)
    }
  })

  it('the pay check’s string-taking slots hardcode no numeral in the template (the figures ride the args)', () => {
    const S = '§§§' // a non-numeric sentinel — any digit left is a hardcoded one in the template
    // The amount rule's three forms (flip (iii)), every figure the sentinel and every year NaN (it prints no digit).
    const AMOUNTS: readonly TypedBelowAmount[] = [
      { kind: 'one', figure: S },
      { kind: 'two', groups: [{ figure: S, firstYear: Number.NaN, lastYear: Number.NaN }, { figure: S, firstYear: Number.NaN, lastYear: Number.NaN }] },
      { kind: 'band', least: S, most: S },
    ]
    for (const rendered of [
      slots.workingCostQuoteMonthly(S, S),
      slots.workingCostQuoteYearly(S),
      slots.workingCostQuoteBudget(S),
      slots.workingCostQuoteBudgetMedical(S, S),
      slots.workingCostLeftOut(S),
      slots.workingCostStaleQuote(S, S),
      slots.workingCostStaleQuoteGone(S),
      slots.workingCostStaleStateConfirmed(S),
      slots.workingCostStaleStateEntered(S),
      slots.workingCostStaleBoth(S, S),
      slots.workingCostStaleBothGone(S),
      slots.workingCostStaleKeptQuote(S, S),
      slots.workingCostStaleStateKept(S),
      slots.workingCostStaleKeptBoth(S, S),
      slots.workingCostKeepMonthly(S),
      slots.workingCostKeepYearly(S),
      slots.errWorkingCostStaleBelowQuote(S, S),
      slots.errWorkingCostStaleKeep(S),
      slots.workingCostBelowMedical(S, S),
      slots.workingLedgerAmount(S),
      slots.workingLedgerOutflow(S),
      slots.workingLedgerSsHeldBack(S),
      slots.workingLedgerSsHeldBackAtMost(S),
      slots.workingLedgerIncomeTaxInvestment(S),
      slots.workingLedgerMedicareSurcharge(S),
      slots.workingLedgerMonthlyEcho(S),
      slots.workingLedgerMonthlyPlain(S),
      slots.workingLedgerLaterLeftOver(S),
      slots.workingLedgerLaterShort(S),
      slots.workingLedgerLaterShortEach(S),
      slots.workingLedgerLaterShortRange(S, S),
      slots.workingLedgerLeftOverFigure(S),
      slots.workingLedgerLeftOverFigureAt(S, S),
      ...AMOUNTS.map((a) => slots.workingLedgerLeftOverWaitingShort(S, Number.NaN, Number.NaN, a, true)),
      slots.workingLedgerLeftOverWaitingShortUpdate(S, Number.NaN, false),
      ...AMOUNTS.map((a) => slots.workingCostStaleSeatLaterShort(S, Number.NaN, Number.NaN, a, S, true)),
      slots.workingCostStaleSeatLaterShort(S, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, AMOUNTS[0]!, S, false),
      slots.workingLedgerLeftOverWaitingShort(S, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, AMOUNTS[0]!, false),
      slots.workingLedgerLeftOverCheck(S, S, S),
      slots.workingLedgerLeftOverCheckNoDeposits(S),
      slots.workingLedgerLeftOverSavedLine(S),
      slots.workingLedgerLeftOverRoseLine(S, S),
      slots.workingLedgerLeftOverFellLine(S, S),
      slots.workingLedgerLeftOverRoseLineAt(S, S, S),
      slots.workingLedgerLeftOverFellLineAt(S, S, S),
      slots.workingLedgerLeftOverAbsentLine(S),
      slots.workingLedgerLeftOverSpentLine(S),
      slots.workingLedgerLeftOverNotSureLine(S),
      slots.workingCostStaleLeftOverAnswered(S),
      slots.workingCostStaleAfterWork(S, true),
      slots.workingCostStaleAfterWork(S, false),
      slots.workingCostStaleLeftOverNoneUpdate(S, S),
      slots.workingCostStaleLeftOverNoneConfirm(S, S),
      slots.workingCostStaleLabelIf(S),
      slots.workingCostStaleLeansBetter(S),
      slots.workingCostStaleLeftOverYearsCheaper(S),
      // A year arg renders through `${}` like the figures: NaN prints no digit, so any digit left is the template's.
      slots.workingCostStaleLeftOverIfCapped(S, Number.NaN, S, true),
      slots.workingCostStaleLeftOverIfWhole(S, Number.NaN, S, S, true),
      slots.workingCostStaleLeftOverGainYears(Number.NaN, Number.NaN, Number.NaN),
      slots.workingCostStaleLeftOverIfFirstShort(Number.NaN, S, S, S, S),
      ...AMOUNTS.map((a) => slots.workingCostStaleLeftOverIfFirstShortRun(Number.NaN, Number.NaN, a, S, S, S, true)),
      slots.workingCostStaleLeftOverIfFirstNone(Number.NaN, S, S),
      slots.workingCostStaleShortUntilUpdated(S),
      slots.workingCostStaleShortLaterYear(Number.NaN, S, S, true),
      ...AMOUNTS.map((a) => slots.workingCostStaleShortLaterYears(Number.NaN, Number.NaN, a, S, true)),
      slots.workingCostStaleLeftOverInflated(S, S, S, true),
      slots.workingCostStaleLeftOverNoneNow(S, S),
      slots.workingCostStaleNoSmallerAmount(S),
      slots.workingCostStaleEachDollar(S, S),
      slots.workingCostStaleLowerAddsMore(S, S, S, S),
      slots.workingCostStaleLowerCountsMore(S),
      slots.workingCostStaleDoorHeadingUpdate(S),
      slots.workingCostStaleDoorHeadingConfirm(S),
      slots.workingCostStaleGateScopeUpdate(S),
      slots.workingCostStaleGateScopeConfirm(S),
      slots.workingCostTypedBelowGateScopeMoved(S),
      slots.workingCostStaleGateRoute(S),
      slots.workingCostStaleResultDoorUpdate(S),
      slots.workingCostStaleResultDoorConfirm(S),
      slots.workingCostStaleDoorIfUpdate(S, false),
      slots.workingCostStaleDoorIfUpdate(S, true),
      slots.workingCostStaleDoorYes(S),
      slots.workingCostStaleDoorMore(S, S, S),
      slots.workingCostStaleDoorKeepUpTo(S, S),
      slots.workingCostStaleDoorKeepCovers(S, S, true),
      slots.workingCostStaleDoorKeepCovers(S, S, false),
      slots.workingCostStaleDoorNoPlus(S, true),
      slots.workingCostStaleDoorNoPlus(S, false),
      slots.workingCostStaleDoorKeepNoQuote(S, S, false),
      slots.workingCostKeepConditionUpTo(S, S, S),
      slots.workingCostKeepConditionCovers(S, S, true),
      slots.workingCostKeepConditionCovers(S, S, false),
      slots.workingCostBelowSpending(S, S, true),
      slots.workingCostBelowSpending(S, S, false),
      slots.workingCostBelowBudget(S, S, true),
      slots.workingCostBelowBudget(S, S, false),
      slots.workingCostTypedBelowCounts('This', S, S),
      slots.workingCostTypedBelowCounts('Your', S, S),
      slots.workingCostTypedBelowCountsBudget('This', S, S),
      slots.workingCostTypedBelowAdds(S),
      // The lean, its own slot since the walk-9 form council's call (2), in every host form on both sources.
      ...(['spending', 'budget'] as const).flatMap((source) => (['your', 'this', 'bare'] as const).map((form) => slots.workingCostTypedBelowLean(source, S, form))),
      // The typed-below runs (the whole-window rebuild, in the walk-9 form): every slot over every frame, one figure, two
      // groups beside their years (a NaN year prints no digit) and a band, and the gloss's look-back spelled, never typed.
      ...spanRenders(S, `${S}x`, Number.NaN),
      ...capRenders(S),
      ...survivorRenders(S, `${S}x`),
      // NaN never equals itself, so it renders the run arm; Infinity does, and prints no digit either: the one-year arm.
      slots.workingCostTypedBelowSpanLabel(Number.NaN, Number.NaN),
      slots.workingCostTypedBelowSpanLabel(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
      slots.workingCostLegendFigure(S),
      slots.stalenessLeftOverMoved(S, S, S),
      slots.stalenessLeftOverClause(S, S, S),
      slots.stalenessLeftOverMovedAt(S, S, S, S),
      slots.stalenessLeftOverClauseAt(S, S, S, S),
      slots.assumptionWorkingCostConfirmed(S),
      slots.assumptionWorkingCostConfirmedBudget(S),
      slots.assumptionWorkingCostEntered(S),
      slots.assumptionWorkingCostKept(S),
      slots.assumptionWorkingCostStale(S),
    ]) {
      expect(lintCopy(rendered, ['free-numeral']), rendered).toEqual([])
    }
  })

  it('every pay-check outflow and shortfall carries a MINUS SIGN as well as its words (never color alone, R16)', () => {
    for (const rendered of [
      slots.workingLedgerOutflow('1'),
      slots.workingLedgerLaterShort('1'),
      slots.workingLedgerLaterShortEach('1'),
      slots.workingLedgerLaterShortRange('1', '2'),
    ]) {
      expect(rendered, rendered).toMatch(/−\$/)
    }
    expect(slots.workingLedgerLaterShort('1')).toMatch(/^Short/)
    expect(copy.workingLedgerShort).toBe('Short')
  })

  it('every essentials-claim pattern owns a corpus sample no other pattern catches (deleting any one reds the corpus)', () => {
    const norm = (s: string) => s.replace(/[’‘]/g, "'")
    ESSENTIALS_CLAIMS.forEach((re, i) => {
      const owned = ESSENTIALS_MUST_CATCH.filter((s) =>
        ESSENTIALS_CLAIMS.every((other, j) => (j === i) === other.test(norm(s))),
      )
      expect(owned.length, `ESSENTIALS_CLAIMS[${i}] ${re} has no sample only it catches`).toBeGreaterThan(0)
    })
  })

  it('the advice gate catches off-list money verbs, assertive recommendations, and hidden clause breaks', () => {
    const mustCatch = [
      // imperative money verbs (round 1 + 2)
      'Park the surplus in a Roth.',
      'Stash it in a taxable account.',
      'Ladder your conversions.',
      'Harvest losses before December.',
      'Roll the old plan into an IRA.',
      'Draw from the taxable account first.',
      'Spend down the pre-tax bucket first.',
      'Defer claiming Social Security as long as you can.',
      'Front-load conversions in the gap years.',
      'Tap the brokerage first.',
      'Earmark the surplus for a Roth.',
      'Sock away the extra in a taxable account.',
      'Sweep the extra into a Roth.',
      'Shovel the surplus into a Roth.',
      // mid-sentence advice + hidden clause breaks (round 1)
      'Given the brackets, you’ll want to convert to Roth.',
      'There looks to be room, so convert to Roth this year.',
      'Our suggestion: convert to Roth.',
      // assertive recommendations with NO imperative verb (round 2)
      'A Roth conversion makes the most sense here.',
      'The recommendation is to delay Social Security.',
      'Converting to Roth now is wise.',
      'Delaying Social Security is the smart call.',
      'A Roth conversion is the way to go.',
      'Conversions to Roth are advisable here.',
      'Doing Roth conversions in the gap years pays off.',
      // round-3: no-adjective crown + "pays to" / "better off" / "the obvious move" / first-person
      'The play here is to convert.',
      'The move is to convert.',
      'It pays to convert now.',
      'You are better off converting.',
      'The obvious move is to convert.',
      'The clear choice is to convert.',
      'My advice is to convert.',
      'My recommendation is to convert.',
    ]
    for (const s of mustCatch) {
      expect(lintCopy(s, ['advice-verb']).length, `MUST catch: "${s}"`).toBeGreaterThan(0)
    }
  })

  // The most honest hedges a retirement tool can say — the gate MUST NOT flag them (guards the
  // negation logic from regressing into pushing authors toward weaker phrasings).
  it('the negation guard lets honest hedges pass (no false positives on real disclaimers)', () => {
    const mustNotCatch = [
      'Nothing here is certain — the future could go either way.',
      'It is not certain to last.',
      'There are no guarantees in any projection.',
      'Your money might not outlast you.',
      'There won’t always be enough.',
      'We can’t promise the market cooperates.',
      'No projection is ever guaranteed.',
      'This is not a sure thing.',
      'Nothing is risk-free.',
      'There are never any guarantees.',
      'We would never claim this is certain.',
      // round-3 regression guards: dropping 'scenario' from the affirming-strip must NOT re-flag the
      // honest hedge, and the new "covered for life" pattern must stay negation-guarded.
      'There is no scenario where this is certain.',
      'You may not be covered for life.',
      'There is no doubt this could fall short.',
    ]
    for (const s of mustNotCatch) {
      expect(lintCopy(s, ['false-certainty']), `MUST NOT catch: "${s}"`).toEqual([])
    }
  })

  // --- non-vacuous firing controls (each gate provably fires — burned/070) ---
  it('the gate is non-vacuous — planted violations are caught on every gate', () => {
    expect(lintCopy('You should max out your Roth this year.', ['advice-verb']).length).toBeGreaterThan(0)
    expect(lintCopy('Convert to a Roth now.', ['advice-verb']).length).toBeGreaterThan(0)
    expect(lintCopy('We recommend delaying Social Security.', ['advice-verb']).length).toBeGreaterThan(0)
    expect(lintCopy('This is the optimal strategy.', ['superlative']).length).toBeGreaterThan(0)
    expect(lintCopy('Your retirement is guaranteed.', ['false-certainty']).length).toBeGreaterThan(0)
    expect(lintCopy('You have 8 of 10 odds.', ['free-numeral']).length).toBeGreaterThan(0)
    expect(lintCopy('This is the widow’s penalty.', ['catastrophe']).length).toBeGreaterThan(0)
  })

  it('false-certainty flags the CLAIM but not the benign adjective ("term-certain")', () => {
    expect(lintCopy('This outcome is certain.', ['false-certainty']).length, 'is certain → claim').toBeGreaterThan(0)
    expect(lintCopy('It is certain to last.', ['false-certainty']).length, 'certain to → claim').toBeGreaterThan(0)
    expect(lintCopy('a term-certain annuity, say.', ['false-certainty']), 'term-certain is a benign term').toEqual([])
    expect(lintCopy('Only certain accounts need this.', ['false-certainty']), 'certain accounts is benign').toEqual([])
  })

  it('field-operation imperatives are NOT flagged (the allowlisted class — R40-U4)', () => {
    for (const phrase of [
      'Skip this if none applies.',
      'Set an age only if it ends earlier.',
      'Lower it only if part is a tax-free return of basis.',
      'Leave blank to treat it as fully taxable.',
      'Add this account.',
      'Tap again to remove.',
    ]) {
      expect(lintCopy(phrase, ['advice-verb']), phrase).toEqual([])
    }
  })

  // --- scope seam (owned by copyGuard, not a duplicated prefix sniff) ---
  it('isVerdictKey captures the anticipated verdict/recommendation surface, excludes intake', () => {
    for (const k of [
      'verdictHeadline', 'recommendSequencing', 'confidenceStatement', 'strategyLead',
      'outcomeOnTrack', 'answerPending', 'dateFreeToday', 'readoutMain',
      'fuckOffDate', 'workOptionalDate', 'headlineVerdict', // the headline feature — verdict word isn't the prefix
    ]) {
      expect(isVerdictKey(k), `${k} is verdict copy (free-numeral must gate it)`).toBe(true)
    }
    for (const k of [
      'birthYearLabel', 'errSsClaimWindow', 'kind401k', 'incomeColaPctHelp', 'spendHelp',
      'incomeAlimonyDateHelp', // intake "date" key — must NOT match (it carries a factual year)
    ]) {
      expect(isVerdictKey(k), `${k} is intake copy (its factual numerals are legitimate)`).toBe(false)
    }
  })

  it('DIRECTIVE_VERBS includes "validate" — load-bearing for the staticDisclosures-exclusion proof', () => {
    expect(DIRECTIVE_VERBS).toContain('validate')
  })

  // --- U12 scope-seam pins: the `assumption*` chrome prefix is DELIBERATELY exempt from the
  //     scoped gates (the U11 precedent — a documented exemption, never an accident). Panel
  //     chrome carries factual numerals (a table year, a section number) like intake copy, and
  //     provenance lines are statements, not plan-moving claims — so neither the verdict sweep
  //     (free-numeral/superlative) nor the control sweep (require-hedge) may reach it. The
  //     UNIVERSAL gates still cover every assumption* string via the catalog enumeration above. ---
  it('U12: assumption* chrome is exempt from the verdict + control sweeps (deliberate, pinned)', () => {
    for (const k of [
      'assumptionMarketName', 'assumptionMarketFloorNote', 'assumptionLongevityValue', 'assumptionConversionTaxValue',
    ]) {
      expect(isVerdictKey(k), `${k} must NOT be verdict-swept (factual numerals are legitimate)`).toBe(false)
      expect(isControlKey(k), `${k} must NOT be require-hedge-swept (chrome, not a plan-moving readout)`).toBe(false)
    }
    // The name deliberately avoids the swept substrings — a rename into 'readout'/'headline'
    // territory would silently change its gate set; these arms pin the vocabulary line.
    expect(isControlKey('assumptionRothName'), 'assumptionRothName does not LEAD with the roth prefix').toBe(false)
  })

  it('U12: survivor-substring keys stay catastrophe-gated (the truer-picture line left with the panel, RC18)', () => {
    // Control arms (burned/070 — prove the scope extension is live, not vacuous):
    expect(isMortalityKey('assumptionSurvivorRatioHelp'), 'survivor-substring keys ride the survivor net').toBe(true)
    expect(isMortalityKey('assumptionSurvivorSsValue')).toBe(true)
    expect(isMortalityKey('assumptionMarketFloorNote'), 'non-mortality panel chrome stays out').toBe(false)
    // 2026-09-04 — the generic HOLD joins the net BY NAME: it is the fail-closed line for any hold with
    // no authored reason (`withheldReasonText`'s default) AND the UNWITNESSABLE refusal's interim line,
    // and that set of readers INCLUDES the already-failing household (`?seed=failing`) — the rethink
    // clause's own worst-moment class — so the net must hold for the worst reader on the key. Control
    // arm: a sibling hold that names its own reason stays out.
    expect(isMortalityKey('recHoldGeneric'), 'the fail-closed hold line whose readers include the already-failing cohort').toBe(true)
    expect(isMortalityKey('recHoldDemotionAxis'), 'a hold that names its own reason stays out').toBe(false)
    expect(lintCopy(copy.recHoldGeneric, ['catastrophe'])).toEqual([])
  })

  it('staticDisclosures is deliberately OUT of the gate — proven meaningful: its directive WOULD trip', () => {
    // copyGuard never enumerates staticDisclosures; this asserts WHY (so the exclusion can't
    // silently become vacuous — burned/070). The R13 line is a legal mandatory directive.
    expect(lintCopy(staticDisclosures.honestLimitsValidate, ['advice-verb']).length).toBeGreaterThan(0)
  })

  // ============================================================================================
  // U10 — the require-hedge gate (the INVERSE shape): a control readout / recommendation headline
  // must WEAR a hedge, so a plan-moving claim is never a bald "buys you 3 years" (R12). The gate is
  // control-SCOPED (isControlKey) — never run over terse honest verdicts ("On track"). Contract #4,
  // docs/plans/3-controls.md. The U10-6 UI strings land the control keys LATER; today the sweep is
  // empty, so the canary + adversarial corpus carry the non-vacuity proof.
  // ============================================================================================

  const controlGates: CopyGate[] = ['false-certainty', 'advice-verb', 'superlative', 'require-hedge']

  it('the Medicare card’s $0-arm POINTER twins stay FIGURE-FREE — they sit outside require-hedge only because they claim no amount (Briggsy, 2026-10-16)', () => {
    for (const k of ['medicareExtrasPointerOne', 'medicareExtrasPointer'] as const) {
      const s = copy[k]
      expect(isControlKey(k), `${k}: the mechanism family is not control-scoped`).toBe(false)
      expect(s, 'no digit, no dollar, no tilde: an amount would re-enter the hedged irmaaStep* family').not.toMatch(/[0-9$~]/)
      expect(lintCopy(s, ['false-certainty', 'advice-verb', 'superlative', 'free-numeral', 'catastrophe']), s).toEqual([])
    }
  })

  it('every control readout passes the ban-gates AND wears a hedge (require-hedge — sweeps when U10-6 lands)', () => {
    for (const [k, v] of entries.filter(([k]) => isControlKey(k))) {
      expect(lintCopy(v, controlGates), `${k}: "${v}"`).toEqual([])
    }
    // slot-rendered control readouts too (the numeric channel — rendered via SLOT_RENDER, as the
    // other loops do). Both sweeps are empty TODAY; the machinery below proves they are not vacuous.
    for (const [name, rendered] of Object.entries(SLOT_RENDER).filter(([name]) => isControlKey(name))) {
      expect(lintCopy(rendered, controlGates), `${name}: "${rendered}"`).toEqual([])
    }
  })

  it('the require-hedge machinery works end-to-end (predicate scope + gate polarity — non-vacuity canary)', () => {
    // predicate: control readouts IN, chart chrome + terse verdicts OUT
    expect(isControlKey('rothDeltaReadout'), 'a roth readout is control-scoped').toBe(true)
    expect(isControlKey('sequencingPolicyNote'), 'a sequencing readout is control-scoped').toBe(true)
    expect(isControlKey('twoFuturesDeltaHeadline'), 'the two-futures delta headline is control-scoped').toBe(true)
    expect(isControlKey('ladderBarLabel'), 'ladder chart chrome is NOT control-scoped').toBe(false)
    expect(isControlKey('bandLegendMedian'), 'band chart chrome is NOT control-scoped').toBe(false)
    expect(isControlKey('outcomeOnTrack'), 'a terse honest verdict wears no forced hedge').toBe(false)
    expect(isControlKey('survivorReadoutEyebrow'), 'an existing survivor readout is NOT swept in').toBe(false)
    // U16 §S3 — the recommendation-surface PLAN-MOVING keys MUST be control-scoped (mutant c: remove a
    // prefix from CONTROL_KEY_PREFIXES and require-hedge stops biting that key — this canary goes RED).
    // Each row is one prefix's representative key; the grade WORDS + nameplate stay verdict-scoped (out).
    expect(isControlKey('recDeltaLeaveMore'), 'the delta-as-hero is control-scoped (require-hedge)').toBe(true)
    expect(isControlKey('recSkewMedian'), 'the skew median quote is control-scoped').toBe(true)
    expect(isControlKey('recDeltaTypical'), 'the heros median qualification is control-scoped').toBe(true)
    expect(isControlKey('recDeltaTypicalNone'), 'the qualifications no-dollar arm is control-scoped').toBe(true)
    expect(isControlKey('recDeltaTypicalBehind'), 'the qualifications behind arm is control-scoped').toBe(true)
    expect(isControlKey('recGradeNoteShape'), 'the ShapeDisclosure/hinge notes are control-scoped').toBe(true)
    expect(isControlKey('recComposeAlready'), 'the compose reassurance is control-scoped').toBe(true)
    expect(isControlKey('recHoldTrend'), 'the withheld reasons are control-scoped').toBe(true)
    expect(isControlKey('recRunnerUpWhy'), 'the runner-up "why this beat it" is control-scoped').toBe(true)
    expect(isControlKey('recDiscNiit'), 'the delta disclosures are control-scoped').toBe(true)
    // The pay-less-tax ALL-IN copy (build spec D7, HIS words 2026-10-05): the unpriced hero arm and the
    // all-in scope note are plan-moving claims, so their PREFIXES must put them under require-hedge.
    expect(isControlKey('recDeltaPayLessTaxUnpriced'), 'the unpriced hero arm is control-scoped').toBe(true)
    expect(isControlKey('recDiscAllInScope'), 'the all-in scope note is control-scoped').toBe(true)
    expect(isControlKey('recommendGradeConfident'), 'the terse GRADE WORD stays verdict-scoped (no forced hedge)').toBe(false)
    expect(isControlKey('recommendBaselineNameplate'), 'the baseline nameplate stays verdict-scoped').toBe(false)
    // gate polarity: a bald deterministic claim FAILS, a hedged one PASSES
    expect(lintCopy('The conversion saves you three years.', ['require-hedge']).length, 'bald → fail').toBeGreaterThan(0)
    expect(lintCopy('Converting could help in about 8 of 10 futures.', ['require-hedge']), 'hedged → pass').toEqual([])
  })

  // 2026-09-08 — THE rec* SCOPE CANARY. copyGuard's scopes are prefix ALLOWLISTS, so a NEW `rec*` key
  // lands in NEITHER scope silently — the hole that left the RecommendationViz aria sentence outside
  // require-hedge until it was renamed `recDeltaVizAria`. `/^rec(?!over)/` is the net: a bare `/^rec/`
  // would sweep the 16 `recovery*`/`recover*` intake keys (copy.ts:888-901, :947-964), which are correctly
  // unscoped. The two allowlists are SPLIT because the surfaces differ: an unscoped FLAT key rides only
  // the three universal gates (the `entries` loops at the top of this file — superlative and free-numeral
  // are verdict-scoped); an unscoped SLOT rides the four voice gates (survival-claim included) + catastrophe (the SLOT_RENDER loop
  // above) and NEVER the flat loops. So a FLAT exception is legal only for chrome that speaks no figure
  // AND crowns nothing (both pinned below), and a SLOT exception only where the figure is R3's sanctioned
  // calendar year and no modal belongs — BY NAME, never by prefix.
  const REC_SCOPED = /^rec(?!over)/
  const UNSCOPED_FLAT_REC: readonly string[] = [
    'recVizWithLabel', 'recVizWithoutLabel', 'recSeeRunnerUp',
  ]
  const VERDICT_ONLY_REC_SLOTS: readonly string[] = ['recommendRecordSavedIn']

  it('every rec* key is verdict-scoped, control-scoped, or a NAMED figure-free exception', () => {
    const flat = Object.keys(copy).filter((k) => REC_SCOPED.test(k))
    const slotNames = Object.keys(slots).filter((k) => REC_SCOPED.test(k))
    expect(flat.length, 'the rec* surface is non-empty (the net works)').toBeGreaterThan(40)
    expect(slotNames.length, 'the rec* SLOT surface is non-empty too').toBeGreaterThan(0)
    // Non-vacuity: the `over` exclusion is load-bearing AND live — the recovery keys exist and stay out.
    const recovery = Object.keys(copy).filter((k) => /^recover/.test(k))
    expect(recovery.length, 'the recovery keys exist').toBeGreaterThan(0)
    expect(recovery.some((k) => REC_SCOPED.test(k)), 'and the net excludes every one').toBe(false)

    const unscopedFlat = flat.filter((k) => !isVerdictKey(k) && !isControlKey(k))
    expect(unscopedFlat.slice().sort()).toEqual([...UNSCOPED_FLAT_REC].sort())
    // Every exception is figure-free chrome: a numeral or a dollar sign makes it a plan-moving claim,
    // which belongs in a scope, not on this list. AND every one must crown nothing: `superlative` is
    // VERDICT-scoped (copyGuard.ts:19-23), so these ride only the three universal gates — and
    // without the second arm `recVizWithLabel: 'The best strategy'` (R12's crowning sin) would ship green
    // as the recommended side's legend name on Tax Strategies' Summary and Comparison charts.
    for (const k of UNSCOPED_FLAT_REC) {
      expect(copy[k as CopyKey], `${k} is allowlisted, so it must speak no figure`).not.toMatch(/[\d$]/)
      expect(lintCopy(copy[k as CopyKey], ['superlative']), `${k} is unscoped, so it must crown nothing`).toEqual([])
    }
    // No SLOT may sit outside CONTROL scope: a slot exists to carry a FIGURE, so an unscoped one is the
    // pre-rename `recVizAria` shape by construction. VERDICT scope is deliberately NOT counted as
    // protection here (2026-09-08) — it buys a SLOT nothing: the SLOT_RENDER sweep above runs
    // false-certainty/advice-verb/superlative/survival-claim (+catastrophe) over EVERY slot whatever its scope,
    // `require-hedge` runs over isControlKey slots ALONE, and free-numeral never runs over slots at all.
    // So naming the next AT sentence `recommendVizAria` rather than `recDeltaVizAria` would have kept
    // this canary green while require-hedge went silent — the pre-rename hole, re-opened under a
    // verdict-shaped name.
    const unscopedSlots = slotNames.filter((k) => !isControlKey(k) && !VERDICT_ONLY_REC_SLOTS.includes(k))
    expect(unscopedSlots, 'a rec* slot carries a figure — it must be control-scoped').toEqual([])
    // The one allowlisted verdict-only slot is real, and genuinely outside control scope: a calendar year
    // is R3's sanctioned numeric channel on the saved-record card, and "Saved in 2026." wears no modal by
    // design. Both arms keep the allowlist from going stale into a silent free pass.
    expect(slotNames, 'the named verdict-only slot still exists').toContain(VERDICT_ONLY_REC_SLOTS[0])
    expect(isControlKey(VERDICT_ONLY_REC_SLOTS[0]!), 'and it is genuinely unscoped by control').toBe(false)
  })

  it('require-hedge catches bald deterministic control claims (≥8) — the calm-but-wrong family', () => {
    const mustFail = [
      'This conversion buys you 3 years.',
      'Converting saves $40,000.',
      'This strategy wins.',
      'Your taxes will drop.',
      'The Roth conversion adds four years to the plan.',
      'Sequencing taxable first gives you an extra $12,000.',
      'The survivor keeps $1,200 more a month.',
      'This move puts the survivor over the line.',
      'The delta is three years.',
      'Converting now is the difference.',
    ]
    for (const s of mustFail) {
      expect(lintCopy(s, ['require-hedge']).length, `MUST fail (no hedge): "${s}"`).toBeGreaterThan(0)
    }
  })

  it('require-hedge passes properly hedged control readouts (≥8), incl. the "X of 10" frequency frame', () => {
    const mustPass = [
      'Converting could help in about 8 of 10 futures.',
      `The survivor’s money lasts in ${slots.xOfTen(8)} futures instead of ${slots.xOfTen(6)}.`,
      'This looks to be worth roughly a few years longer, around the median.',
      'A conversion may lift the survivor toward steadier ground.',
      'These odds assume today’s plan; a different order can move them.',
      'Sequencing taxable first tends to stretch the taxable bucket.',
      `Converting lands you near ${slots.withOdds(slots.xOfTen(8))}.`,
      'The survivor keeps about ~$1,200 more a month, most likely.',
      'Delaying often leaves a little more room before Medicare.',
      'We estimate the shift is usually small.',
    ]
    for (const s of mustPass) {
      expect(lintCopy(s, ['require-hedge']), `MUST pass (hedged): "${s}"`).toEqual([])
    }
  })

  it('require-hedge is non-vacuous — a hedge-less string always goes red, and the catalog can never empty', () => {
    // With no hedge token present — equivalently, as if HEDGE_TOKENS were EMPTIED (no matcher can
    // ever fire) — the gate flags EVERY string. That is the loud failure an emptied catalog produces,
    // never a silent green (burned/070).
    expect(lintCopy('The conversion changes the plan.', ['require-hedge']).length).toBeGreaterThan(0)
    expect(HEDGE_TOKENS.length, 'the hedge catalog is never empty').toBeGreaterThan(0)
    // Load-bearing proof: the sole hedge token IS what flips the verdict — drop it from the same
    // sentence and it goes red (so a catalog that failed to cover it would wrongly flag honest copy).
    expect(lintCopy('Converting could change the plan.', ['require-hedge']), 'with a hedge → clean').toEqual([])
    expect(lintCopy('Converting changes the plan.', ['require-hedge']).length, 'hedge removed → red').toBeGreaterThan(0)
  })

  it('the hedge catalog already covers honest verdict/plan copy — a future re-scope never rewords it', () => {
    // ladderPlanCaveat is chart chrome (NOT control-scoped today), but were it ever pulled under
    // require-hedge it already wears a hedge ("assume" + "can move them") — the tokens must cover it
    // so the gate never pressures an author to reword honest copy.
    expect(lintCopy(copy.ladderPlanCaveat, ['require-hedge']), copy.ladderPlanCaveat).toEqual([])
    // the verdict magnitude clauses wear theirs too ("looks to be" / "would").
    expect(lintCopy(slots.verdictRoomClause('6,500'), ['require-hedge'])).toEqual([])
    expect(lintCopy(slots.verdictTrimClause('2,500'), ['require-hedge'])).toEqual([])
    // the two room-denying unsized forms (the register's Tier 0 room sentence) — "would" carries both
    expect(lintCopy(slots.verdictRoomWithinStep('6,500'), ['require-hedge'])).toEqual([])
    expect(lintCopy(slots.verdictRoomSurvivorShort('6,500'), ['require-hedge'])).toEqual([])
  })

  // --- THE UNIT-INERTNESS BAN (Tier-0, 2026-08-03) pinned the assumption panel's spend-period help, the copy that defended
  //     its re-label toggle against a 12× retype. RETIRED at Act 6 · RC18 with the panel: the toggle and its help are gone,
  //     and the Living expenses drawer asks the unit WITH the figure (RC13b's walk rule, `spend-period-unconfirmed`), so no
  //     surface re-labels a committed figure any more. ---
})
