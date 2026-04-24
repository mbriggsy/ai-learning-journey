/**
 * Connection log — per-seat WS lifecycle transitions.
 *
 * Implementation: Unit 4 (natural transitions) + Unit 6 (orchestrator-tagged).
 * Unit 1 ships the signatures only.
 */
import type { ConnectionEvent } from './types'

export interface ConnectionLog {
  readonly append: (event: ConnectionEvent) => void
  readonly tag: (
    seatId: string,
    transition: ConnectionEvent['transition'],
    reason: ConnectionEvent['reason'],
  ) => void
  readonly flush: () => Promise<void>
}

export function openConnectionLog(_jsonlPath: string): ConnectionLog {
  throw new Error('not implemented')
}
