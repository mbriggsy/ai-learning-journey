/**
 * U8 Save-completeness + field-fidelity gate (pure decision; insight 048, plan §263–264).
 *
 * The result screen can be reached on an INDETERMINATE answer (the engine runs on burned/062
 * sentinels for absent facts), so reaching the Save beat does NOT prove the draft is saveable.
 * This gate decides it — and it does so WITHOUT a parallel validator that could drift from the
 * restore path: it constructs the single-shape candidate (`{ schemaVersion: 3, ...draft }` — no
 * field-mapping layer, the draft IS the v3 field set minus the discriminant) and runs it through
 * the codec ROUND-TRIP. `decodeScenario` is the SAME authoritative gate the restore path runs, so
 * a missing required fact, an incomplete person, or a DND/009 array hole (an `undefined` element
 * that `JSON.stringify` silently nulls) fails HERE, loud, rather than reaching disk and surfacing
 * as a calm-but-wrong reload.
 *
 * The returned scenario is the DECODED form — i.e. exactly what a save→reload would reproduce — so
 * handing it to `firstSave` makes the round-trip field-identity true by construction.
 */
import type { ScenarioDraft } from '@store/memoryModel'
import { encodeScenario, decodeScenario } from '@shared/scenarioCodec'
import { healthcareVintageStamp } from '@engine/constants/health'
import { taxVintageStamp } from '@engine/constants/tax'
import { stateTaxVintageStamp } from '@engine/constants/stateTax'
import { dateVintageStamp } from '@engine/constants'
import { CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import type { ScenarioV3 } from '@shared/model'

export type SaveReady =
  | {
      readonly ready: true
      readonly scenario: ScenarioV3
      /**
       * ATOMS THE SAVE GATE THREW AWAY (U17) — empty when the candidate survived intact.
       *
       * `ready: true` with a NON-EMPTY list means: this plan is saveable and will be written, but
       * one tolerated atom (today only the saved-recommendation record) did not survive the codec.
       * The plan is honest; the atom is gone.
       *
       * WHY THE SAVE STILL PROCEEDS. See the ruling at the return site below — refusing the whole
       * save strands the household's real edits over a defect in OUR minting code, and does it
       * through `deriveResultSave`'s `{ kind: 'none' }`, which withdraws the CTA and the badge with
       * no message at all. That is exactly the lying dead-end resultSave.ts's header says the
       * edit-and-re-save machine exists to make UNREPRESENTABLE.
       *
       * S5'S BINDING OBLIGATION, IN TWO PARTS: (1) validate the mint with
       * {@link validateSavedRecommendation} BEFORE putting a record on the draft, so this list
       * stays empty by construction; (2) if it is ever non-empty at the gesture, the gesture
       * REFUSES ALOUD — "we saved your plan, we could not save the recommendation" — and never
       * reports a saved recommendation. A gesture that promises an affordance owes a rendered
       * outcome (insight 100); silently completing is the failure this field exists to make
       * impossible to miss.
       */
      readonly droppedAtoms: readonly string[]
    }
  | { readonly ready: false; readonly detail: string }

/** Today as a LOCAL-calendar epoch-day integer (the `savedAt` unit — DND 009: a plain small
 *  integer, never epoch-ms). LOCAL, not UTC (U13 ultramode review, the basis-mismatch catch):
 *  the persisted `startCalendarYear` is minted from the household's local year, so every
 *  wall-year comparison downstream (budget windows, the date anchor, the elapsed line) must
 *  read the SAME calendar — a UTC day here expired budget windows a few hours early every
 *  Dec 31 for any household behind UTC. Cross-timezone skew is ±1 day, immaterial at the
 *  year granularity every claim floors to. ui-layer clock read; the engine never sees it. */
export function currentEpochDay(): number {
  const now = new Date()
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000)
}

export function scenarioFromDraft(draft: ScenarioDraft): SaveReady {
  // The cast only reaches `encodeScenario`'s type; correctness is decided at runtime by the
  // decode below (the draft's optional seed/spend and Partial people are validated there).
  // P3·U11+U13 — EVERY vintage stamp is written FRESH from the current build's constants at
  // every save (write-time truth: the answer on screen was computed under THIS build), so a
  // restored draft's ridden-along old stamps are never re-written as if current. U13's
  // staleness reader diffs the RAW-decoded persisted stamps at unlock — BEFORE this
  // re-stamping can overwrite what the vault actually said (council 2026-07-09, constraint
  // (a)); the save that follows re-stamps honestly.
  // `savedAt` is the one WALL-TIME stamp: consumers judging identity (the dirty compare,
  // the round-trip guard) go through `scenarioIdentity` — comparing raw output of this
  // function across days would read an untouched session as permanently dirty.
  const candidate = {
    schemaVersion: 3 as const,
    ...draft,
    healthcareVintage: healthcareVintageStamp(),
    taxVintageDetail: taxVintageStamp(),
    dateVintage: dateVintageStamp(),
    stateTaxVintage: stateTaxVintageStamp(),
    appDefaultVersion: CURRENT_APP_DEFAULT_VERSION,
    savedAt: currentEpochDay(),
  } as ScenarioV3
  const decoded = decodeScenario(encodeScenario(candidate))
  if (decoded.ok && decoded.scenario.schemaVersion === 3) {
    // A NON-FATAL DROP ON THE WRITE SIDE IS A MINTER DEFECT — REPORTED, never swallowed, and
    // never allowed to hold the household's PLAN hostage. (U17 F-pass ruling, dated 2026-07-25.)
    //
    // The codec's one tolerated drop (the saved-recommendation record) is charter'd for the READ
    // side: "a household's whole plan must never become unopenable at unlock because its
    // recommendation memory went bad." Nothing in that charter reaches this call, which is the
    // SAVE gate — so the drop must not pass silently: `session.save` would write a record-free
    // scenario while the draft keeps its record, and since `deriveResultSave` compares two
    // POST-codec operands the badge would read CLEAN. The household would be told "Saved" about a
    // record the vault does not have.
    //
    // BUT REFUSING THE SAVE IS WORSE, AND WAS THE FIRST CUT OF THIS FIX. `ready: false` is the
    // INCOMPLETE-ANSWER arm; `deriveResultSave` maps it to `{ kind: 'none' }`, which withdraws the
    // save CTA, the saved badge, AND the aged-balances clause — with no message anywhere, and
    // `SaveReady.detail` has no reader outside this file. A household with a complete answer, an
    // existing vault and real unsaved edits would watch their save affordance vanish, unexplained,
    // over a bug in OUR minting code. That is precisely the lying dead-end resultSave.ts's header
    // says this machine exists to make UNREPRESENTABLE — so the fix must not re-introduce one.
    //
    // THE PROPORTIONATE ANSWER: save the plan (their edits are never collateral), report the atom,
    // and put the refusal where the promise was made — at S5's gesture, which is the only surface
    // that claimed a recommendation would be saved. The ROOT fix is upstream of both arms:
    // `validateSavedRecommendation` lets S5 refuse at the MINT, so a record this gate could drop
    // never reaches the draft. See the obligation recorded on `SaveReady.droppedAtoms`.
    return { ready: true, scenario: decoded.scenario, droppedAtoms: decoded.droppedAtoms }
  }
  const detail = decoded.ok
    ? `unexpected schema version ${decoded.scenario.schemaVersion}`
    : decoded.reason === 'corrupt'
      ? decoded.detail
      : `newer version ${decoded.got}`
  return { ready: false, detail }
}
