/**
 * Act-4 · U17 §S4 — THE STALENESS EXPOSURE SEAM (the ui/intake join the store cannot make).
 *
 * `deriveStaleness` must answer "did THIS household's answer move?", not "did the table move?".
 * That needs a producer's-output read of the run's own built params — and `src/store/**` is
 * BANNED from importing intake (eslint.config.js:116-121), so the store can never call the
 * params builders. `staleness.ts` said so itself: its state-tax clock carried a KNOWN QUIET
 * LIMITATION naming this exact fix. So the decision is made HERE, at the one layer that may see
 * both sides, and injected as a value.
 *
 * THE LAW THIS FILE OBEYS (insights 080/081/088): every read below comes from a BUILT PARAMS
 * OUTPUT. Never an age, never a geography, never a re-derivation of a builder's inputs.
 *   · Insight 080's scar (`healthSheetChrome.ts:307-321`): a predicate keyed on "every member
 *     65+" equalled the pricing complement only until `dateSearch` became a SECOND producer of
 *     `healthcareEnabled` — then it silently lied.
 *   · Insight 081: a re-derivation forks from its producer at the producer's first early
 *     return (`buildOverlay`'s degenerate $0-accounts/no-income/no-premium guard).
 *   · Insight 088: a predicate must read the producer of the run THE SURFACE DESCRIBES. See
 *     the ACA note below for why the pre-crown base overlay IS that producer at THIS surface,
 *     and why the same read is forbidden beside a crowned one.
 *
 * SIX READS, SIX PRODUCERS — NEVER ONE DERIVED FROM ANOTHER. `overlayBuilt`, `medicare`, `aca`,
 * `contributions`, `blend` and `pricedState` each call their own exported predicate.
 *
 * BE PRECISE ABOUT WHY, because the obvious justification is FALSE and was written here once
 * before being caught (two reviewers, 2026-07-25): `overlayBuilt` and `medicare` do NOT currently
 * disagree on any reachable household. There is no "accounts but no marketplace quote pair"
 * witness — the pair is a REQUIRED fact for any household with a pre-65 member
 * (`intakeMap.ts:159-166`), and an all-65+ household takes the Medicare-only branch, which sets
 * `healthcareEnabled: true` with no quote pair at all (`intakeMap.ts:581`). So for every draft this
 * function actually evaluates (the missing-facts arm has already returned), an overlay exists IFF
 * healthcare is on. **The two predicates are perfectly correlated today.**
 *
 * THAT IS THE ARGUMENT FOR SIX CALLS, NOT AGAINST IT. The correlation is a coincidence of two
 * unrelated rules — one about which facts intake demands, one about which overlay branch an
 * all-65+ household takes — and neither rule exists to keep these two predicates equal. A third
 * overlay branch, or a relaxed quote-pair requirement, breaks it with nothing going red. Deriving
 * one from the other would be insight 081's shape one level up: the cost of six calls is six
 * builder invocations; the cost of one derivation is a silent lie the day the coincidence lapses.
 *
 * The practical consequence, recorded so nobody deletes the fixture: the `overlayBuilt` gate is
 * falsifiable ONLY through a deliberately-hypothetical fixture (`OVERLAY_NO_HEALTH`), because no
 * dev seed can separate the two. That fixture is not redundant — it is the only thing standing
 * between this seam and the coincidence.
 */
import type { ScenarioDraft } from '@store/memoryModel'
import {
  blendTableReadForRun,
  contributionsPricedForRun,
  dateBaseAcaPriced,
  dateMedicarePriced,
  isDateRoute,
  missingRequiredFacts,
  overlayBuiltForRun,
  pricedStateForRun,
  spineAcaPriced,
  spineMedicarePriced,
} from '@intake/intakeMap'
import type { ExposureRead, StalenessExposure } from '@store/staleness'

const read = (priced: boolean): ExposureRead => (priced ? 'priced' : 'unpriced')

/**
 * What the run this draft describes actually prices — the record `deriveStaleness` gates every
 * clock on.
 *
 * ROUTE-SPLIT on the two healthcare reads, because the two routes have DIFFERENT producers:
 *
 * SPINE. `buildSpineParams` is the exact builder the headline run uses, so both reads are EXACT.
 * `spineMedicarePriced` is the shipped precedent (`healthSheetChrome`'s Medicare disclosure
 * rides it); `spineAcaPriced` is its sibling over the same overlay.
 *
 * DATE. Medicare is EXACT: `dateSearch.ts:229` forces `healthcareEnabled: true` on every
 * candidate, so the only question is whether the run built an overlay at all. ACA reads the
 * PRE-SWEEP BASE overlay (`dateBaseAcaPriced`) — and that is the right producer HERE, at a
 * surface taken ONCE at unlock, BEFORE any date search dispatches: there is no crowned run for
 * this report to describe, so the base run IS the run it describes (the pilot's 2026-07-25
 * ruling on insight 088). Its FALSE arm is exact in every case — no candidate offset can
 * synthesize an ACA stream the base lacks — which is the arm the silence rides.
 *
 * DO NOT LIFT THIS FUNCTION TO A CROWNED SURFACE. Beside a landed date/preview/verdict the ACA
 * read must be `acaPricedForRun(d, crownedOffsetYears)`; the base read WOULD lie there (a
 * work-to-65+ crown prices zero ACA years while the base stream is positive). The two are not
 * interchangeable, and the difference is a surface property, not a code-style preference.
 *
 * AND BE HONEST ABOUT WHERE THIS ONE ALREADY TRAVELS (a reviewer's catch, 2026-07-25 — the clause
 * above overstated its own boundary). This read feeds `rulesMoved`, and `rulesMoved` is carried to
 * `IntakeApp.tsx:394` → `Result.tsx:518,533` → `FuckOffDate.tsx:393`, which renders the standing
 * hero echo BESIDE THE CROWNED DATE. So for a 63-working/67-retired household with the required
 * quote pair, a moved `acaStatus` names the ACA line at the gate (honest — the gate is pre-crown)
 * and ALSO lights that echo, even where a crown ≥2 years out puts both members at 65+ and the
 * crowned run prices zero ACA years (`windowGate`, healthcareStreams.ts).
 *
 * THAT RESIDUAL IS ACCEPTED, DELIBERATELY, AND IT IS BOUNDED. The echo's sentence is a PROVENANCE
 * claim — "Figured under today's rules, from the numbers you saved" — which is true of every
 * recompute; the defect is that it APPEARS where nothing moved, not that it says something false.
 * The alternative was worse and was tried: keying the date route's ACA to `'unknown'` pushed the
 * enhanced-subsidy flip — the one legislative event `verify:aca` gates every build on — to the
 * pre-65 marketplace planner as a nameless "we can't tell" line with no echo at all. A silent
 * stale on the app's most consequential clock beats an over-present provenance note on a narrower
 * one, so the trade was taken knowingly.
 *
 * THE FIX THIS COMMENT USED TO PRESCRIBE IS WRONG — CORRECTED 2026-07-26. It said: "the echo
 * renders AFTER a crown exists, so it can gate on `acaPricedForRun(d, crownedOffset)` rather than
 * inheriting the gate's pre-crown boolean." Executing that would SILENCE more than it fixes.
 * `rulesMoved` reaches the echo as ONE OR-collapsed boolean with no clock attribution
 * (`staleness.ts`: appDefault ∨ tax ∨ stateTax ∨ movedClocks ∨ contribution), so gating THAT on
 * ACA pricing also suppresses the echo for a household whose FEDERAL-TAX or MEDICARE clock moved
 * while the crowned run happens to price zero ACA years — trading a bounded over-alarm for a
 * silent stale on the more consequential clock. That is precisely the trade the paragraph above
 * says was rejected, and precisely insight 103's shape (a rule written to kill an over-alarm must
 * be checked in the SILENCING direction). `acaPricedForRun` already exists and is exported
 * (`intakeMap.ts:896`) — the predicate was never the missing piece.
 *
 * THE ACTUAL FIX — AND ONE OF ITS TWO ARMS IS ALSO A TRAP (corrected 2026-08-02, the second time
 * this comment's own prescription has had to be withdrawn).
 *
 * ✗ "Re-derive the exposure against the CROWNED offset" — DO NOT. It is the same insight-103 shape a
 *   third time. The date route SWEEPS every offset (`dateSearch.ts:425/450/457`) and candidate Y=0
 *   carries the base ACA stream UNGATED (`healthcareStreams.ts:149` → `windowStart = 0`, so
 *   `windowGate` is a pass-through). So `exposure.aca === 'priced'` PROVES the ACA tables were
 *   consumed somewhere in the sweep — it is not an over-read. Re-deriving against the crown alone
 *   would silence the ACA line for a household whose crown sits at 65+ *precisely because* a subsidy
 *   flip pushed it there — the one household the clock exists to warn.
 *
 * ✓ PER-CLOCK ATTRIBUTION carried to the echo, so the ACA line can withdraw on its own without
 *   taking the tax and Medicare lines with it. This is the sound arm and the only one left. It is a
 *   real data-flow change (`rulesMoved` must stop being one OR-collapsed boolean), never a one-line
 *   gate.
 *
 * ⚑ THE OVER-ALARM ITSELF IS NOT A DEFECT — the residual above is bounded and knowingly accepted.
 * Anyone arriving here to "fix the ACA clock" should read the two paragraphs above first: the clock
 * is load-bearing, and every cheap gate proposed for it so far has been a silencing bug.
 *
 * NO RUN AT ALL (`missingRequiredFacts` non-empty ⇒ every builder returns null): `'unknown'` on
 * every family, NOT `'unpriced'`. Silence has to be EARNED by a proof that the run priced
 * nothing; an unbuildable draft proves nothing either way, so its clocks land in the nameless
 * aggregate. Unreachable from a real vault (a saved scenario is save-ready by construction) —
 * this is the fail-safe direction for the cross-build case where an older vault lacks a fact a
 * newer build requires.
 *
 * RESIDUAL, NAMED: the state-tax clock has only a named arm (no aggregate sentence names a
 * state, and `'unknown'` would not say WHICH profile to compare), so an unbuildable draft leaves
 * it silent rather than aggregated. Same unreachability; called out rather than hidden.
 */
export function exposureForDraft(d: ScenarioDraft): StalenessExposure {
  if (missingRequiredFacts(d).length > 0) {
    return {
      overlayBuilt: 'unknown',
      medicare: 'unknown',
      aca: 'unknown',
      contributions: 'unknown',
      blend: 'unknown',
      pricedState: undefined,
    }
  }
  // The route-INVARIANT reads: each producer unions the two builders internally (the
  // `pricedStateForRun` idiom), so no `isDateRoute` branch may fork them.
  const routeInvariant = {
    overlayBuilt: read(overlayBuiltForRun(d)),
    contributions: read(contributionsPricedForRun(d)),
    blend: read(blendTableReadForRun(d)),
    pricedState: pricedStateForRun(d),
  }

  if (isDateRoute(d)) {
    return {
      ...routeInvariant,
      medicare: read(dateMedicarePriced(d)),
      aca: read(dateBaseAcaPriced(d)),
    }
  }

  return {
    ...routeInvariant,
    medicare: read(spineMedicarePriced(d)),
    aca: read(spineAcaPriced(d)),
  }
}
