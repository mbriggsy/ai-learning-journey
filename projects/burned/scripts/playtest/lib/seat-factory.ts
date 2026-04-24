/**
 * Seat factory — creates Playwright contexts, joins rooms, returns SeatHandles.
 *
 * Implementation: Unit 5. Unit 1 ships the signature only.
 */
import type { SeatHandle, Viewport } from './types'

export function createSeat(
  _context: unknown, // Playwright BrowserContext — typed in Unit 5.
  _roomCode: string,
  _seatName: string,
  _seatId: string,
  _viewport: Viewport,
  _runDir: string,
): Promise<SeatHandle> {
  throw new Error('not implemented')
}
