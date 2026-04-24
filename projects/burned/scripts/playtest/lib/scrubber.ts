/**
 * Scrubber — hashes card IDs + strips myHand types from god-events before
 * they land in events.jsonl. Salt is session-scoped (Unit 3b).
 *
 * Implementation: Unit 4b. Unit 1 ships the signature only.
 */
import type { GodEvent } from './types'

export type ScrubMode = 'on' | 'off'

export function scrub(_event: GodEvent, _mode: ScrubMode, _salt: string): GodEvent {
  throw new Error('not implemented')
}
