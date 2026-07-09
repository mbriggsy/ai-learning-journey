/**
 * The app methodology-default vintage (P3·U13, council 2026-07-09 — Q7 REBUILT).
 *
 * `CURRENT_APP_DEFAULT_VERSION` is the canonical version the save path stamps (it replaced
 * the bare literal that lived in memoryModel's default draft — a version string disconnected
 * from any comparator is staleness-undetectable).
 *
 * `APP_DEFAULT_ERAS` is the add-only version → defaults map the staleness reader keys on.
 * THE DIRECTION IS LOAD-BEARING (the council's red-team catch, conceded across the roster):
 * a household is immune from the "we've updated our default assumptions" note iff its
 * persisted value differs from **its SAVED era's** default (they overrode it back then) —
 * NEVER iff it differs from the CURRENT default. The current-default derivation is inverted
 * honesty: after a conservative default move, the household that took the old default now
 * differs from the new default, reads as "overridden", and the exact note built to protect
 * them is silently withheld (calm-but-wrong).
 *
 * Vacuously inert in v1 — only one era exists, so no note can fire — but the SHAPE is the
 * deliverable: it locks the saved-era contract into the per-surface clock map Act-4 U17
 * inherits (4-recommendation.md contract #8b). A new methodology default ships by ADDING an
 * era entry (add-only, like every persisted vocabulary in this product), never by editing
 * one.
 *
 * KNOWN v1 EDGE (documented, not built around): a user who saw the note and re-saved
 * WITHOUT touching the knob re-stamps the current version while keeping the old era's
 * value — future comparators read them as overridden. Resolving that (re-seat vs re-ask)
 * is a U17-era question; the ratified v1 contract is the map above.
 */

/** The survivor-spending-ratio default each era shipped (the ONE user-editable methodology
 *  knob today — assumptionRegistry `survivor-ratio`; the market editor is the F1 defer). */
export interface AppDefaultEra {
  readonly survivorSpendingRatio: number
}

const ERAS = Object.freeze({
  'p2-d1': { survivorSpendingRatio: 0.75 },
}) satisfies Readonly<Record<string, AppDefaultEra>>

/** Compile-tied to the map: the current version cannot be stamped without an era entry (a
 *  stamp with no comparator would re-create the exact undetectability this file closes). */
export const CURRENT_APP_DEFAULT_VERSION: keyof typeof ERAS = 'p2-d1'

/** The saved era's defaults, or `undefined` for a version this build has no entry for
 *  (a FUTURE build's stamp read by an older build — the staleness reader treats it as
 *  not-comparable, never as "not overridden"). */
export function appDefaultEraFor(version: string): AppDefaultEra | undefined {
  return (ERAS as Readonly<Record<string, AppDefaultEra | undefined>>)[version]
}
