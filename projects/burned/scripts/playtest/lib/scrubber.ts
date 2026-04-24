/**
 * Scrubber — hashes card IDs + strips myHand types from god-events before
 * they land in events.jsonl. Salt is session-scoped (Unit 3b).
 *
 * Privacy contract (Phase 3 Unit 4b / plan D15):
 *   - `projections[*].myHand[*].id` replaced with
 *     `sha256(salt + id).digest('hex').slice(0, 12)` (12 hex chars).
 *   - `projections[*].myHand[*].type` replaced with the literal `'<redacted>'`.
 *   - Any other fields on a myHand entry (`index`, custom flags, ...) are
 *     preserved VERBATIM — scrub scope is narrow by design.
 *   - `boardView` and `events[]` are left BYTE-IDENTICAL. The server has
 *     already scrubbed private fields (Phase 2 `stripPrivateEventFields`)
 *     from non-party viewers before we see them; we don't re-touch.
 *   - Mode `'off'` returns the input unchanged (identity).
 *
 * Fail-closed: malformed input throws. The salt is NEVER included in any
 * error message — the salt's value IS the threat surface (plan D15).
 *
 * Purity: this module imports `node:crypto` ONLY. No I/O, no randomness,
 * no wallclock. Same `(event, mode, salt)` → same output forever.
 */
import { createHash } from 'node:crypto'
import type { GodEvent, PlayerView } from './types'

export type ScrubMode = 'on' | 'off'

const REDACTED_TYPE = '<redacted>'
const HASH_LENGTH = 12

function hashId(salt: string, id: string): string {
  return createHash('sha256').update(salt + id).digest('hex').slice(0, HASH_LENGTH)
}

/**
 * Pure scrub. Returns a new outer object; deep-clones the `projections`
 * substructure. `events[]`, `boardView`, `action` remain referentially
 * equal to the input (shallow copy on the outer envelope).
 */
export function scrub(event: GodEvent, mode: ScrubMode, salt: string): GodEvent {
  if (mode === 'off') {
    return event
  }

  // Structural validation (fail-closed). Do NOT leak the salt into any
  // thrown message — plan D15 threat model.
  if (
    event === null ||
    typeof event !== 'object' ||
    event.projections === null ||
    typeof event.projections !== 'object' ||
    Array.isArray(event.projections)
  ) {
    throw new Error('scrub: malformed GodEvent — projections must be a non-null object')
  }

  const scrubbedProjections: Record<string, PlayerView> = {}
  for (const viewerId of Object.keys(event.projections)) {
    const view = event.projections[viewerId]
    if (view === null || typeof view !== 'object') {
      throw new Error(
        `scrub: malformed PlayerView for viewer ${JSON.stringify(viewerId)} — must be an object`,
      )
    }
    if (!Array.isArray(view.myHand)) {
      throw new Error(
        `scrub: malformed PlayerView for viewer ${JSON.stringify(viewerId)} — myHand must be an array`,
      )
    }

    const scrubbedHand = view.myHand.map((entry, i) => {
      if (entry === null || typeof entry !== 'object') {
        throw new Error(
          `scrub: malformed myHand entry at viewer ${JSON.stringify(viewerId)} index ${i} — must be an object`,
        )
      }
      if (typeof entry.id !== 'string') {
        throw new Error(
          `scrub: malformed myHand entry at viewer ${JSON.stringify(viewerId)} index ${i} — id must be a string`,
        )
      }
      // Preserve `rest` fields verbatim; overwrite id + type.
      return {
        ...entry,
        id: hashId(salt, entry.id),
        type: REDACTED_TYPE,
      }
    })

    scrubbedProjections[viewerId] = {
      ...view,
      myHand: scrubbedHand,
    }
  }

  return {
    ...event,
    projections: scrubbedProjections,
  }
}
