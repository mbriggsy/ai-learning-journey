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
import { dateVintageStamp } from '@engine/constants'
import { CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import type { ScenarioV3 } from '@shared/model'

export type SaveReady =
  | { readonly ready: true; readonly scenario: ScenarioV3 }
  | { readonly ready: false; readonly detail: string }

/** Today as a UTC epoch-day integer (the `savedAt` unit — DND 009: a plain small integer,
 *  never epoch-ms). ui-layer clock read; the engine never sees it. */
export function currentEpochDay(): number {
  return Math.floor(Date.now() / 86_400_000)
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
    appDefaultVersion: CURRENT_APP_DEFAULT_VERSION,
    savedAt: currentEpochDay(),
  } as ScenarioV3
  const decoded = decodeScenario(encodeScenario(candidate))
  if (decoded.ok && decoded.scenario.schemaVersion === 3) {
    return { ready: true, scenario: decoded.scenario }
  }
  const detail = decoded.ok
    ? `unexpected schema version ${decoded.scenario.schemaVersion}`
    : decoded.reason === 'corrupt'
      ? decoded.detail
      : `newer version ${decoded.got}`
  return { ready: false, detail }
}
