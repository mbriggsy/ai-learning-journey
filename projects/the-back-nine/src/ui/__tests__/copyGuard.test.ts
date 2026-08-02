import { describe, it, expect } from 'vitest'
import { copy, slots, staticDisclosures, HEDGE_TOKENS, type CopyKey } from '../copy'
import {
  lintCopy,
  isVerdictKey,
  isMortalityKey,
  isControlKey,
  DIRECTIVE_VERBS,
  type CopyGate,
} from '../copyGuard'

/*
 * copyGuard enumerates the catalog and asserts every entry passes its applicable gates. Three
 * gates are UNIVERSAL (a sure outcome / an advice imperative / a superlative is a sin in EVERY
 * voice); `free-numeral` is scoped to the verdict surface (isVerdictKey — intake carries factual
 * numerals); `catastrophe` is survivor-scoped. The ADVERSARIAL CORPUS below tests the threat CLASS,
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
    for (const k of ['budgetCta', 'budgetSheetTitle', 'budgetSheetIntro'] as const) {
      expect(copy[k], `${k}: "${copy[k]}" promises a direction the engine can invert`).not.toMatch(DIRECTIONAL)
    }
    // NON-VACUITY, two ways. (1) The axis must still be NAMED — silencing the copy is not a
    // pass, or the gate would reward deleting the strings it guards.
    expect(copy.budgetCta, 'the axis survives: what could give').toContain('what could give')
    expect(copy.budgetSheetTitle, 'the axis survives: must hold').toContain('must hold')
    expect(copy.budgetSheetIntro, 'the axis survives: each on its own terms').toContain('on its own terms')
    // (2) The regex must be able to BITE. `dateFloorInversionNote` is the engine's own
    // opposite-direction disclosure — it MUST match, proving this is a live net and not a
    // pattern that happens to find nothing. It is also why the sweep is key-scoped: directional
    // truth is sanctioned in the gated POST-split disclosure, never in the pre-split ask.
    expect(copy.dateFloorInversionNote, 'the control: a real directional claim trips the regex').toMatch(DIRECTIONAL)
  })

  // --- U17 §S4 — the `staleness*` WARNING REGISTER. The prefix's hedge/verdict EXEMPTION is
  //     documented law (copy.ts: chrome/note prefixes carry no odds and recommend nothing), which
  //     makes it the WEAKEST net in the catalog — and these are the strings that tell a household
  //     their saved answer may have moved. This arm sweeps every one of them through the two
  //     SCOPED gates the prefix exempts them from (superlative + free-numeral) on top of the two
  //     universal gates the catalog enumeration already applies, and then pins the aggregate
  //     line's specific promises. ---
  it('U17 §S4: every staleness* warning string clears the SCOPED gates too, not just the universal pair', () => {
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

  // --- F-B (U16 chair fix, cold-read panel): the STALE card's body drift-pin. Two falsehoods the
  //     cold read killed must stay dead: (1) "since we found this" — FALSE when the predecessor was the
  //     HELD card (nothing is "found" on a hold), so the body must never claim a find; (2) the body must
  //     positively affirm the ANSWER above is current (only the strategy read went stale) — the honest
  //     truth the coherent card carries. Planted mutant (b): restoring the old wording reds this pin. ---
  it('the stale card body kills "since we found this" and affirms the answer above is current (F-B drift-pin)', () => {
    const body = copy.recommendStaleBody
    // (1) the false "found" claim is dead (untrue whenever the predecessor was the HELD card).
    expect(body, 'the "since we found this" falsehood must stay dead').not.toMatch(/found this/i)
    // Broadened past the one lexeme (insight 087 spirit): no "found"/"we made"/"we worked out" claim
    // that a HOLD predecessor would falsify — a synonym reword resurrecting the falsehood trips this.
    expect(body, 'no find/produce claim a hold predecessor would falsify').not.toMatch(/\b(found|we made|worked out|we built)\b/i)
    // (2) the positive anchor (non-vacuity — burned/070): the body affirms the answer above is current.
    expect(body, 'the body affirms the answer above already reflects the change').toContain('Your answer above already reflects them')
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

  // --- slots: render with representative args, then scan. Slots are the SANCTIONED numeric channel,
  //     so they are NOT free-numeral scanned; the verdict voice still must hold. Record<keyof typeof
  //     slots, …> makes a new slot without a sample a COMPILE error (no silent no-op — burned/070). ---
  const SLOT_RENDER: Record<keyof typeof slots, string> = {
    questionPosition: slots.questionPosition(3),
    ssClaimAge: slots.ssClaimAge(64),
    ssClaimWindow: slots.ssClaimWindow(2030, 2038),
    fraEcho: slots.fraEcho(803),
    accountSummary: slots.accountSummary('401(k)', 'You', '120,000'),
    accountsTotal: slots.accountsTotal('1,400,000'),
    incomeSummary: slots.incomeSummary('Pension', 'You', '30,000'),
    incomeSurvivorNote: slots.incomeSurvivorNote('Your spouse', 'you', 0.5),
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
    withOdds: slots.withOdds('7 of 10'),
    withOddsAtCeiling: slots.withOddsAtCeiling(),
    dateTradeoff: slots.dateTradeoff(2, slots.xOfTen(8)),
    ladderOffsetTick: slots.ladderOffsetTick(6),
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
    spendBudgetTotal: slots.spendBudgetTotal('78,000'),
    budgetRemoveLine: slots.budgetRemoveLine('Groceries'),
    stepDownNote: slots.stepDownNote(2030),
    oopHint: slots.oopHint('3,000', '3,400'),
    factsMore: slots.factsMore(3),
    verdictRoomClause: slots.verdictRoomClause('430'),
    verdictTrimClause: slots.verdictTrimClause('280'),
    verdictRethinkClause: slots.verdictRethinkClause(),
    verdictHoldClause: slots.verdictHoldClause(),
    verdictSurvivorStepDown: slots.verdictSurvivorStepDown('1,200'),
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
    rothDeltaSurvivor: slots.rothDeltaSurvivor(slots.xOfTen(8), slots.xOfTen(6)),
    rothDeltaJoint: slots.rothDeltaJoint(slots.xOfTen(8), slots.xOfTen(7)),
    rothDeltaEven: slots.rothDeltaEven(slots.xOfTen(7)),
    rothDeltaCountEven: slots.rothDeltaCountEven(slots.xOfTen(9)),
    rothStateShift: slots.rothStateShift('Off track', 'On track'),
    rothYearsSecondary: slots.rothYearsSecondary(3, 'more'),
    sequencingDelta: slots.sequencingDelta(slots.xOfTen(8), slots.xOfTen(7)),
    // U17 §S1 — the start names the CALENDAR year (wall-time-stable), tense picked by `passed`.
    rothPlanEcho: slots.rothPlanEcho('40,000', 2028, false, 5),
    // Council 2026-07-30 — the band note naming BOTH spending levels. Sampled with a REAL gap
    // (74,000 vs 46,000, the datesplit shape) rather than equal figures, so the guard reads the
    // sentence a household actually meets. `band*` leads neither prefix list, so these ride the two
    // universal gates — correct: they state two arithmetic facts and must wear no hedge.
    bandPricesFullBudgetWithLevels: slots.bandPricesFullBudgetWithLevels('74,000', '46,000'),
    bandPricesEssentialsWithLevels: slots.bandPricesEssentialsWithLevels('46,000', '74,000'),
    // U17 §S6 — the applied conversion's own passed start, STATED where §S1's refusal used to fire.
    // Named `leverRoth*` on purpose: a `roth*` spelling would be control-scoped and require-hedge
    // would demand a modal on a year read straight from the reader's saved plan (see the slot's
    // own note). It rides the two universal gates, which is the right scope for a plain fact.
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
    dateFloorNotWithinEither: slots.dateFloorNotWithinEither(11),
    shadowRateLine: slots.shadowRateLine(34),
    shadowRateHeadroom: slots.shadowRateHeadroom('66,600', '84,600', '18,000'),
    irmaaStepNowBase: slots.irmaaStepNowBase('4,900'),
    irmaaStepNowSurcharged: slots.irmaaStepNowSurcharged('7,300', '2,400'),
    irmaaStepNext: slots.irmaaStepNext('218,000', '150,000', '68,000', '2,300', true),
    healthFigPerYear: slots.healthFigPerYear('8,900'),
    healthFigRoom: slots.healthFigRoom('19,500'),
    healthFigCents: slots.healthFigCents(22),
    healthFigStepAdd: slots.healthFigStepAdd('1,100'),
    subsidyRegimeCostDelta: slots.subsidyRegimeCostDelta('96,000', '128,000'),
    subsidyRegimeCostEven: slots.subsidyRegimeCostEven('99,800'),
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
    recDeltaPayLessTax: slots.recDeltaPayLessTax('12,000'),
    recSkewMedian: slots.recSkewMedian('230,000'),
    // The median-advantage increment (2026-07-23): the hero's typical-future qualification arms.
    recDeltaTypical: slots.recDeltaTypical('48,000', '9,000'),
    recDeltaTypicalNone: slots.recDeltaTypicalNone('48,000'),
    recDeltaTypicalBehind: slots.recDeltaTypicalBehind('48,000', '9,000'),
    recHoldStateCert: slots.recHoldStateCert('North Carolina'),
    // Act-4 · U16 §S3b — the heir-bracket disclosure (recDisc* ⇒ require-hedge-swept) + the viz aria
    // sentence (recViz* — NOT control-scoped; universal-gate-swept only). Figures pre-formatted.
    recDiscHeirBracket: slots.recDiscHeirBracket('24'),
    recVizAria: slots.recVizAria('Your plan today', '740,000', 'The recommended strategy', '788,000', '48,000'),
    recommendRecordSavedIn: slots.recommendRecordSavedIn(2026),
  }

  it('every U10 delta-readout slot WEARS a hedge (the control readouts are slot-composed, so the require-hedge sweep must reach the rendered samples here)', () => {
    const deltaSlots = [
      'rothDeltaSurvivor', 'rothDeltaJoint', 'rothDeltaEven', 'rothDeltaCountEven', 'rothStateShift',
      'rothYearsSecondary', 'sequencingDelta',
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
      const gates: CopyGate[] = ['false-certainty', 'advice-verb', 'superlative']
      // mortality net (not just survivor): the already-failing rethink clause is catastrophe-gated too.
      if (isMortalityKey(name)) gates.push('catastrophe')
      expect(lintCopy(rendered, gates), `${name}: "${rendered}"`).toEqual([])
    }
  })

  it('verdict money-clauses hardcode no numeral in the template (slot-discipline)', () => {
    const S = '§§§' // a non-numeric sentinel — any digit left is a hardcoded one in the template
    for (const rendered of [
      slots.verdictRoomClause(S),
      slots.verdictTrimClause(S),
      slots.verdictSurvivorStepDown(S),
    ]) {
      expect(lintCopy(rendered, ['free-numeral']), rendered).toEqual([])
    }
    expect(lintCopy(slots.verdictHoldClause(), ['free-numeral'])).toEqual([])
    expect(lintCopy(slots.verdictRethinkClause(), ['free-numeral'])).toEqual([]) // figure-less by construction
  })

  it('the F10 slotted messages hardcode no numeral in the template (digit-free — the limit/figures ride the slot args)', () => {
    const S = '§§§' // a non-numeric sentinel — any digit left is a hardcoded one in the template
    for (const rendered of [
      slots.errContributionCeiling(S),
      slots.errAdditionsCeiling(S),
      slots.errRothStartPast(S),
      slots.budgetMedicalExceedsTotal(S, S),
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
      'assumptionDoorCta', 'assumptionTitle', 'assumptionMarketName', 'assumptionMarketFloorNote',
      'assumptionLongevityValue', 'assumptionConversionTaxValue', 'assumptionTruerPicture',
    ]) {
      expect(isVerdictKey(k), `${k} must NOT be verdict-swept (factual numerals are legitimate)`).toBe(false)
      expect(isControlKey(k), `${k} must NOT be require-hedge-swept (chrome, not a plan-moving readout)`).toBe(false)
    }
    // The name deliberately avoids the swept substrings — a rename into 'readout'/'headline'
    // territory would silently change its gate set; these arms pin the vocabulary line.
    expect(isVerdictKey('assumptionEchoQuiet')).toBe(false)
    expect(isControlKey('assumptionRothName'), 'assumptionRothName does not LEAD with the roth prefix').toBe(false)
  })

  it('U12: the truer-picture line IS catastrophe-gated by name, and survivor-substring keys stay swept', () => {
    // Control arms (burned/070 — prove the scope extension is live, not vacuous):
    expect(isMortalityKey('assumptionTruerPicture'), 'the worst-moment line joins the catastrophe net').toBe(true)
    expect(isMortalityKey('assumptionSurvivorRatioHelp'), 'survivor-substring keys ride the survivor net').toBe(true)
    expect(isMortalityKey('assumptionSurvivorSsValue')).toBe(true)
    expect(isMortalityKey('assumptionMarketFloorNote'), 'non-mortality panel chrome stays out').toBe(false)
    // The line itself passes the gate it joined (the catalog sweep above covers it too — this
    // arm keeps the pairing visible next to the scope pin).
    expect(lintCopy(copy.assumptionTruerPicture, ['catastrophe'])).toEqual([])
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
    expect(isControlKey('recommendGradeConfident'), 'the terse GRADE WORD stays verdict-scoped (no forced hedge)').toBe(false)
    expect(isControlKey('recommendBaselineNameplate'), 'the baseline nameplate stays verdict-scoped').toBe(false)
    // gate polarity: a bald deterministic claim FAILS, a hedged one PASSES
    expect(lintCopy('The conversion saves you three years.', ['require-hedge']).length, 'bald → fail').toBeGreaterThan(0)
    expect(lintCopy('Converting could help in about 8 of 10 futures.', ['require-hedge']), 'hedged → pass').toEqual([])
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
    // the verdict magnitude clauses wear theirs too ("looks to be" / "toward").
    expect(lintCopy(slots.verdictRoomClause('430'), ['require-hedge'])).toEqual([])
    expect(lintCopy(slots.verdictTrimClause('280'), ['require-hedge'])).toEqual([])
  })
})
