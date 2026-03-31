import type { RoomId, RoomDefinition } from '../../types/ai.js';
import { AI } from '../../constants.js';

/**
 * Tracks room visitation for Medium/Hard systematic patrol.
 * Pure utility scoring — deterministic, no randomness.
 */
export class RoomTracker {
  private readonly lastVisitedTick: Map<RoomId, number> = new Map();
  private currentTarget: RoomId | null = null;

  isStale(roomId: RoomId, currentTick: number): boolean {
    const last = this.lastVisitedTick.get(roomId);
    if (last === undefined) return true; // never visited = stale
    return currentTick - last > AI.RE_CLEAR_TICKS;
  }

  markVisited(roomId: RoomId, currentTick: number): void {
    this.lastVisitedTick.set(roomId, currentTick);
  }

  /** Force a room stale (e.g., door toggled in/near room). */
  forceStale(roomId: RoomId): void {
    this.lastVisitedTick.delete(roomId);
  }

  /** Clear completion lock (call when seeker arrives at target room). */
  clearTarget(): void {
    this.currentTarget = null;
  }

  /**
   * Utility score for a room: higher = more attractive.
   * timeFactor (50%) + distFactor (30%) + adjacencyBonus (15%) - recentPenalty (5%)
   */
  scoreRoom(
    room: RoomDefinition,
    seekerX: number,
    seekerY: number,
    currentTick: number,
    currentRoomId: RoomId | undefined,
  ): number {
    const lastTick = this.lastVisitedTick.get(room.id);
    const ticksSince = lastTick === undefined ? AI.MAX_STALE_TICKS : currentTick - lastTick;

    const timeFactor = Math.min(ticksSince / AI.MAX_STALE_TICKS, 1.0) * 0.5;

    const dx = room.center.x - seekerX;
    const dy = room.center.y - seekerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const distFactor = (1 - Math.min(distance / AI.MAX_ROOM_DIST, 1.0)) * 0.3;

    const isAdjacent = currentRoomId !== undefined &&
      room.adjacentRooms.includes(currentRoomId);
    const adjacencyBonus = isAdjacent ? 0.15 : 0;

    const recentPenalty = (lastTick !== undefined && currentTick - lastTick < AI.ROOM_SCORING_COOLDOWN_TICKS)
      ? 0.05
      : 0;

    return timeFactor + distFactor + adjacencyBonus - recentPenalty;
  }

  /**
   * Pick the best room to patrol next.
   * Completion lock: returns current target if not yet cleared.
   */
  getBestRoom(
    rooms: readonly RoomDefinition[],
    seekerX: number,
    seekerY: number,
    currentTick: number,
    currentRoomId: RoomId | undefined,
  ): RoomDefinition | undefined {
    if (rooms.length === 0) return undefined;

    // Completion lock — keep current target until arrived
    if (this.currentTarget !== null) {
      const locked = rooms.find(r => r.id === this.currentTarget);
      if (locked) return locked;
      // Target room no longer exists — clear lock
      this.currentTarget = null;
    }

    let best: RoomDefinition | undefined;
    let bestScore = -Infinity;

    for (const room of rooms) {
      const score = this.scoreRoom(room, seekerX, seekerY, currentTick, currentRoomId);
      if (score > bestScore) {
        bestScore = score;
        best = room;
      }
    }

    // All rooms recently visited — fall back to undefined (caller picks random)
    if (best && !this.isStale(best.id, currentTick)) {
      const anyStale = rooms.some(r => this.isStale(r.id, currentTick));
      if (!anyStale) return undefined;
    }

    if (best) {
      this.currentTarget = best.id;
    }

    return best;
  }

  /** Reset all state (for Play Again). */
  reset(): void {
    this.lastVisitedTick.clear();
    this.currentTarget = null;
  }
}
