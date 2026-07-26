/**
 * U17 · S5 — THE ANTI-LIE MACHINE for the remembered recommendation: what the strategy slot is
 * allowed to CLAIM, and the minimal card a returning household reads.
 *
 * THE "SAVED" CLAIM IS COMPUTED FROM WHAT IS ON DISK, NEVER TRACKED IN A FLAG. This is
 * `resultSave.ts`'s "DIRTY IS COMPUTED, NEVER TRACKED" law applied to the harder direction — the
 * plan rail's flag would lie about an EDIT; this one would lie about a WRITE, which is the cardinal
 * calm-but-wrong sin ("a surface reporting a save that did not happen"). A boolean somebody sets
 * after the write survives every one of: a retry that failed, a solve the store demoted mid-flight,
 * a codec that dropped the record atom on the way to disk (`scenarioCodec.ts` DELETES an invalid
 * record from the object `decodeScenario` returns, so the drop is invisible to anything that
 * remembers rather than re-reads), and a second tab that owns the writer. A value derived from
 * `persist.scenario` — documented at `resultSave.ts:41-42` as "the LAST COMMITTED model (during
 * 'saving' and after 'save-failed' the disk still holds the previous commit)" — cannot: THERE IS NO
 * SUCCESS PARAMETER IN THIS FILE. No argument to `deriveRecommendationSave` means "the save
 * worked"; the only route to `{ kind: 'saved' }` runs through the record the disk actually carries,
 * matched to the winner on screen, and cleared as re-presentable by the store's own trichotomy.
 *
 * THE REFUSAL UNION IS BARE STRINGS, AND THAT IS A TYPE-LEVEL SAFETY PROPERTY, not a style. The
 * mint's and the codec's developer text (`validateSavedRecommendation`'s refusal string, the
 * codec's dropped-atom report) is written for a `console`, not for a household — it names fields
 * and schema paths. Carrying it here would put it one `{refusal.x}` away from the screen, and
 * ESLint cannot catch that leak: its inline-copy selectors (`eslint.config.js:92-102`) match
 * JSXText and Literals under an aria-label/placeholder/alt/title ATTRIBUTE — never a member
 * expression in a child expression container, which is exactly what `{refusal.…}` would be. So
 * the leak is made UNREPRESENTABLE instead — `reason` is a string union, and the surface can only
 * switch on it. That is why nothing in this file carries developer text of any kind.
 *
 * PURE, AND SESSION-FREE. No clock (`todayEpochDay` is injected), no store read, no
 * `getVaultSession()` — every state this machine can be in is reachable from a plain argument
 * table, so every arm is planted-fail testable (insight 048: the honesty-critical decisions come
 * out of the un-drivable render path into a pure module).
 */
import type { SavedRecommendationV3 } from '@shared/model'
import type { SolveAnswer } from '@store/memoryModel'
import type {
  SavedRecommendationStatus,
  SavedRecommendationSupersededCause,
} from '@store/savedRecommendation'
import { epochDayToCalendarYear } from '@store/staleness'
import type { PersistState } from './resultSave'
import type { SaveReady } from './scenarioFromDraft'

/**
 * WHY THE GESTURE REFUSES — THREE REASONS, NOT FOUR, and each one is a whole string.
 *
 * A failed mint, a save-gate probe that came back unready, and a dropped record atom are three
 * different DEFECTS OF OURS with one meaning to the household and one repair: none. Nothing was
 * written (S5's gesture returns before it touches the store and before it touches disk), and no
 * tap of theirs can fix our minting code. Three separately-worded cards would offer three
 * distinctions the reader cannot act on, so they collapse to `'record-invalid'`; the differing
 * developer text stays on IntakeApp state for the `console`, which is its only honest reader.
 *
 * `'write'` is the one refusal where the household's own retry is the repair — the plan rail
 * already owns that control, so the copy register authors no second retry here (a deterministic
 * mint that re-fails under a fresh "Try again" is the lying-remedy shape).
 *
 * `'recovery-locked'` is the survivor-unlocked session, which cannot persist at all (`session.ts`
 * clears `passphraseWrapCurrent` on a recovery unlock, and `RecoveryUnlockResult` carries no
 * `readOnly`, so `deriveResultSave`'s read-only parameter does not cover it). ITS NAME IS
 * DELIBERATELY NOT `…Survivor…`: `copyGuard.ts`'s `isSurvivorKey` is a `/survivor/i` SUBSTRING net
 * feeding `isMortalityKey`, so a `…Survivor…` spelling would silently enrol this plumbing key in
 * the mortality-lexicon gate and make its guard arm pass for the wrong reason.
 */
export type RecommendationSaveRefusal = 'record-invalid' | 'write' | 'recovery-locked'

/** The strategy slot's save state, handler-free (the surface attaches the callbacks; IntakeApp owns
 *  the gesture). Every arm is a claim the disk can back. */
export type RecommendationSaveView =
  /** No claim either way — not offerable and nothing to report. NEVER a silent "not saved". */
  | { readonly kind: 'none' }
  /** The CTA. `route` names what the tap escalates to, so the hint can disclose it BEFORE the tap:
   *  'ceremony' sets up a vault (two passphrases + a backup copy), 'update' re-writes the vault
   *  that exists. Both write the WHOLE plan — `session.save()` has no note-only mode. */
  | { readonly kind: 'offer'; readonly route: 'ceremony' | 'update' }
  /** The write this gesture asked for is in flight. */
  | { readonly kind: 'saving' }
  /** The disk carries THIS recommendation, and the store's trichotomy says it may still be spoken
   *  in the present tense. The only arm that asserts a completed save. */
  | { readonly kind: 'saved' }
  /** A promised affordance that did not complete owes a rendered outcome (insight 100). */
  | { readonly kind: 'refused'; readonly reason: RecommendationSaveRefusal }

export interface RecommendationSaveInput {
  /** What is on disk (`resultSave.ts`) — the ONLY evidence a save happened. */
  readonly persist: PersistState
  /** The live solve channel. A record can only be offered for the recommendation ON SCREEN. */
  readonly solve: SolveAnswer
  /** The plan-save gate. An answer that cannot be encoded cannot carry a record to disk. */
  readonly ready: SaveReady
  /** A second tab owns the writer (captured once at unlock). */
  readonly readOnly: boolean
  /** The store's re-entry trichotomy over the DISK record, or undefined when there is no record to
   *  judge (or the route cannot answer honestly — the date-route short-circuit). CONSUMED, never
   *  re-implemented: see the saved arm. */
  readonly status: SavedRecommendationStatus | undefined
  /** This gesture's own write is in flight. */
  readonly inFlight: boolean
  /** The last gesture's refusal, still standing. `null` = nothing to report.
   *
   *  THREE CLEARING MOMENTS, and the middle one is an OBLIGATION ON THE GESTURE (step 8), not on
   *  this module: IntakeApp clears it (a) on a draft change, (b) **on the tap that starts a new
   *  write — in the SAME state update that sets `inFlight`**, and (c) on the write that lands.
   *  Miss (b) and the slot renders the stale `refused` card over a write that is genuinely in
   *  flight, because the standing refusal deliberately outranks `inFlight` in the guard order (a
   *  refusal must survive an unrelated commit-on-blur demotion). That direction is the QUIETER
   *  claim — never "saved" over a failure — so it is not calm-but-wrong, but it is a dead outcome
   *  shown over live work, and only the caller can prevent it. */
  readonly refusal: RecommendationSaveRefusal | null
}

/**
 * THE GUARD ORDER IS THE MACHINE. Each guard names the lie it prevents; the order is fail-CLOSED
 * (a state that could route two ways routes to the quieter claim).
 */
export function deriveRecommendationSave(input: RecommendationSaveInput): RecommendationSaveView {
  const { persist, solve, ready, readOnly, status, inFlight, refusal } = input

  // (1) A READ-ONLY session makes NO claim at all — the same override, for the same reason, as
  // `deriveResultSave` (resultSave.ts:66-73): `session.save()` REFUSES in this tab, so a CTA is a
  // dead end and a badge would claim a save this tab never made. Its comment names App's standing
  // View-only banner as "the whole disclosure", so this file authors NO second read-only sentence —
  // two disclosures of one fact read as two facts. This outranks even a standing refusal: the
  // refusal card would be a second explanation of a state the banner already owns.
  if (readOnly) return { kind: 'none' }

  // (2) A STANDING REFUSAL OUTRANKS THE SOLVE GUARD — hoisted deliberately, and this order is the
  // whole reason the guard list is written out rather than folded into a switch. The store demotes
  // a committed solve to `stale` on EVERY draft mutation (`memoryModel.ts`'s `invalidateStaleSolve`,
  // run from `update()`), and a commit-on-blur fires one of those the instant focus leaves a field.
  // With the solve guard first, the household taps Save, the write fails, they click away from the
  // card, and the refusal EVAPORATES into `{kind:'none'}` — a promised affordance whose outcome was
  // erased by an unrelated keystroke (insight 100: the gesture owes a rendered outcome). The
  // refusal describes a write that already happened-and-failed; nothing downstream of it can make
  // that untrue.
  if (refusal !== null) return { kind: 'refused', reason: refusal }

  // (3) There must be a LIVE RECOMMENDATION to save. `stale`, `pending`, `blocked`, `idle`,
  // `compute-error` and every non-`recommended` committed payload (refused / withheld /
  // token-withheld / mint-failed) have no crowned winner, so there is nothing a record could
  // describe — and offering to "keep" one would promise a mint that `mintSavedRecommendation`
  // cannot make. No claim.
  if (solve.kind !== 'committed' || solve.payload.kind !== 'recommended') return { kind: 'none' }

  // (4) An answer the save gate cannot encode cannot carry a record to disk either — the record
  // rides the SCENARIO. Mirrors `deriveResultSave`'s own `!ready.ready ⇒ none` (resultSave.ts:77).
  if (!ready.ready) return { kind: 'none' }

  // (5) The write this gesture started is in flight. Ranked ABOVE the saved arm on purpose: during
  // an UPDATE the disk still holds the previous commit (resultSave.ts:41-42), so the saved-arm
  // predicate below can be TRUE for the OLD record while a new one is being written — reporting
  // "saved" there would be a claim about the wrong record.
  if (inFlight) return { kind: 'saving' }

  // (6) THE SAVED ARM — four conjuncts, every one of them read off the disk operand or off the
  // store's own comparator. There is no fifth conjunct and no boolean.
  //   a. `persist.kind !== 'unsaved'` — there is a vault. (Expressed as the lookup below: an
  //      unsaved persist state HAS no `scenario`, so the record is structurally absent.)
  //   b. the disk scenario CARRIES a record. The codec deletes an invalid record from the very
  //      object `decodeScenario` returns, so a record our minter got wrong is ABSENT here rather
  //      than present-and-bad: the drop makes this predicate false BY CONSTRUCTION.
  //   c. the store's trichotomy says it may be re-presented as current. CONSUMED (`status.current`),
  //      NEVER re-implemented — an inline "fingerprint matches and the solver version matches"
  //      compare beside it would be the second comparator `savedRecommendation.ts:23-25` forbids by
  //      name, and it would bless a constants-only release (identical fingerprint, identical
  //      version, a rulebook that moved under the remembered ranking). `?.current === true` is
  //      explicit: an ABSENT status is not a quiet yes.
  //   d. the remembered arm is the arm ON SCREEN. Without this a household that re-solves to a
  //      different winner reads "saved" over a recommendation the vault has never seen.
  // NOTE that `persist.kind` is NOT compared to 'saved': during 'saving' and after 'save-failed'
  // the disk still holds its last commit, and a screen that shows the plan rail's "couldn't finish"
  // alert beside a strategy slot claiming nothing was ever saved would be two contradictory claims
  // about one vault. The disk is the authority in every persist state.
  const onDisk = persist.kind === 'unsaved' ? undefined : persist.scenario.savedRecommendation
  if (
    onDisk !== undefined &&
    status?.current === true &&
    onDisk.action.candidateId === solve.payload.winner.id
  ) {
    return { kind: 'saved' }
  }

  // (7) Everything else is an honest OFFER. The no-vault path ROUTES INTO THE CEREMONY rather than
  // going dead (the product ruling): that path is every dev seed, the Caddie walk and the fit gate,
  // and a control that is inert exactly where the surface is most often seen is the dead-end this
  // whole machine exists to make unrepresentable. `route` is derived, never hard-coded to 'update':
  // the ceremony hint is the one that must name the escalation BEFORE the tap.
  return { kind: 'offer', route: persist.kind === 'unsaved' ? 'ceremony' : 'update' }
}

// ------------------------------------------------------------------------------------------------
// THE RECORD CARD — what a returning household reads about a memory.
// ------------------------------------------------------------------------------------------------

/**
 * THE CARD'S COPY, INJECTED — and the one place this file departs from the S5 step spec, which
 * wrote `savedRecordCardView(status, record, todayEpochDay)` reading `copy.ts` directly.
 *
 * WHY. The `recommendRecord*` register is a SEPARATE step's file (`copy.ts` + its copyGuard arms),
 * and it does not exist yet: `grep -c 'recommendSave\|recommendRecord' src/ui/copy.ts` is 0 today.
 * A composer that hard-codes key names it cannot resolve is neither buildable nor testable, and
 * inventing the names here would pre-empt the wording step's own decisions while leaving this
 * module's every arm unproven. Injection costs the caller one literal — assembled from `copy` /
 * `slots`, so every string still ships from the swept catalog — and buys two structural binds the
 * direct read does not have:
 *   1. `Record<SavedRecommendationSupersededCause, string>` is EXHAUSTIVE. The day the store adds a
 *      fifth supersession cause, the assembly site fails to compile (TS2741) instead of this
 *      composer silently emitting a card with a missing clause — the "arm whose gate is nulled
 *      downstream" shape (insight 029) applied to copy.
 *   2. label and cost line arrive as ONE value with the heading, so a partial register cannot exist.
 */
export interface SavedRecordCopy {
  /** The card's heading — that a saved strategy read exists. */
  readonly heading: string
  /** The still-holds clause: the memory may be spoken in the present tense. */
  readonly stillHolds: string
  /** One clause per supersession cause. EXHAUSTIVE by type — see the interface header. */
  readonly causes: Readonly<Record<SavedRecommendationSupersededCause, string>>
  /** The mint-year slot (`slots.recommendRecordSavedIn`) — a slot, not a flat key, because
   *  copyGuard's free-numeral sweep is `/\d/` over the verdict surface and a year is a digit. */
  readonly savedIn: (year: number) => string
  /** The re-open control's label — names the OUTCOME it leads to, never an imperative. */
  readonly reopenLabel: string
  /** What re-opening COSTS, worded the way the pending label is: a re-solve is minutes, not a
   *  click, and a control that hides that is an invitation the household cannot price. */
  readonly reopenCostLine: string
}

/**
 * WHETHER THE MEMORY STILL HOLDS — a discriminated pair, so "still holds" and "here is why it
 * doesn't" cannot both be on the card, and neither can be missing.
 *
 * `clauses` is populated on BOTH arms so the surface renders one list either way; the discriminant
 * carries the meaning (and lets the surface mark it with something that is not colour — colour is
 * never the only signal).
 *
 * OBLIGATION ON THE SURFACE (step 9): the `superseded` arm's `clauses` may legitimately be EMPTY —
 * the fail-closed output of the broken-contract split, where the store demoted the record without
 * reporting a cause. A surface that renders `superseded` as nothing but a heading over
 * `clauses.map(...)` would then draw a card that neither says the memory holds nor says why it
 * does not: a blank exactly where the disclosure belongs. The superseded marker must be a
 * non-colour signal that stands on its own with ZERO clauses beneath it.
 */
export type SavedRecordStanding =
  | { readonly kind: 'holds'; readonly clauses: readonly [string] }
  | { readonly kind: 'superseded'; readonly clauses: readonly string[] }

/** The card, fully resolved — the surface renders these strings and composes nothing. */
export interface SavedRecordCardView {
  readonly heading: string
  readonly standing: SavedRecordStanding
  /** The mint year, or undefined when the record was minted THIS calendar year (see below). */
  readonly savedIn: string | undefined
  /** ALWAYS PRESENT — never gated on a wiring boolean. See the function header. */
  readonly reopen: { readonly label: string; readonly costLine: string }
}

/**
 * Compose the record card. MINIMAL BY RULING: that a saved read exists, its age, whether it still
 * holds, and the re-open CTA naming its cost. The remembered grade/verdict enums stay persisted and
 * unquoted — the only field this composer reads off the record is `mintedAt`, which is the ruling
 * made structural rather than remembered.
 *
 * `reopen` IS ALWAYS PRESENT, AND THAT IS NOT AN OVERSIGHT. There is no `reopen: boolean`
 * parameter, because the predicate that decides whether re-opening is even possible
 * (`solveInvitable` — the date route, the live solve channel) is owned by `Result`, one level ABOVE
 * whoever would compute a boolean here: a flag minted upstream of the wiring decision either ships
 * a dead button or an unreachable arm. The surface renders the control IFF the caller wired the
 * handler — the shipped `onRepick === undefined ⇒ no dead door` law
 * (`RecommendationSurface.tsx:126`, pinned at `RecommendationSurface.test.tsx:207-209`) — which
 * makes the label, the cost line and the onClick structurally inseparable.
 *
 * `todayEpochDay` is INJECTED (this module reads no clock).
 */
export function savedRecordCardView(
  status: SavedRecommendationStatus,
  record: SavedRecommendationV3,
  todayEpochDay: number,
  text: SavedRecordCopy,
): SavedRecordCardView {
  // THE AGE CLAUSE SUPPRESSES RATHER THAN FABRICATES, on the same rule and the same arithmetic as
  // the aged-balances caveat next door (`agedBalancesYearFor`, resultSave.ts:145-155): a record
  // minted in the CURRENT calendar year has no age to report, and "saved in 2026" read in 2026 is
  // noise dressed as provenance. `record.mintedAt` — never the scenario's `savedAt`, which re-mints
  // on every re-save and would reset the memory's age each time the household edited a budget line.
  const mintYear = epochDayToCalendarYear(record.mintedAt)
  const aged = epochDayToCalendarYear(todayEpochDay) - mintYear >= 1

  // EVERY CAUSE THAT HOLDS, IN THE PRODUCER'S OWN DECLARATION ORDER — insight 101 is binding: a
  // warning that names one cause when two hold describes its poster child, not the predicate's
  // whole extension. `causes` is already stably ordered (inputs → solver → rules) and carries no
  // priority meaning, so this maps and never sorts, filters or truncates.
  const clauses = status.causes.map((cause) => text.causes[cause])

  // THE SPLIT NEEDS BOTH HALVES TO AGREE — fail-CLOSED, and the conjunction is not redundancy.
  // Under the producer's own contract the two are equivalent (`causes` is empty IFF `current`,
  // savedRecommendation.ts:54-61), so this reads as belt-and-braces. It is not: it is the ONLY
  // thing that decides what a BROKEN contract renders, and the two halves fail in opposite
  // directions. A bare `status.current` would speak a memory in the present tense while its own
  // demotion causes sat populated beside it — the cardinal calm-but-wrong sin. A bare
  // `clauses.length === 0` would do the same the moment a cause went un-named (the mapping above
  // is total, so today that means the store demoted for a reason it did not report). Requiring
  // both routes every disagreement to the quieter claim: a card that says the memory no longer
  // holds, naming whatever reasons it does have — never louder than the truth.
  const standing: SavedRecordStanding =
    status.current && clauses.length === 0
      ? { kind: 'holds', clauses: [text.stillHolds] }
      : { kind: 'superseded', clauses }

  return {
    heading: text.heading,
    standing,
    savedIn: aged ? text.savedIn(mintYear) : undefined,
    reopen: { label: text.reopenLabel, costLine: text.reopenCostLine },
  }
}
