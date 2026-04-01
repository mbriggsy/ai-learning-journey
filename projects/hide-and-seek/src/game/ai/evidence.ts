import type { DoorId, DoorState } from '../../types/state.js';

/**
 * Evidence tracking for Hard AI.
 * Tracks door state changes to detect player activity.
 */
export class EvidenceTracker {
  private readonly doorSnapshot: Map<DoorId, DoorState>;
  private readonly doorsIOpened: Set<DoorId> = new Set();
  private readonly huntStartTick: number;

  constructor(doors: ReadonlyMap<DoorId, DoorState>, huntStartTick: number) {
    // Shallow clone — DoorState is immutable
    this.doorSnapshot = new Map(doors);
    this.huntStartTick = huntStartTick;
  }

  /** Check if a door shows evidence of player activity. */
  hasEvidence(door: DoorState): boolean {
    // Seeker opened it — not evidence
    if (this.doorsIOpened.has(door.id)) return false;

    // Any toggle since hunt start = evidence (catches double-toggles)
    if (door.lastToggleTick > this.huntStartTick) return true;

    // State differs from snapshot
    const snapshot = this.doorSnapshot.get(door.id);
    if (snapshot && door.isOpen !== snapshot.isOpen) return true;

    return false;
  }

  /** Record that the seeker opened this door (so it's not flagged as evidence). */
  recordSelfOpen(doorId: DoorId): void {
    this.doorsIOpened.add(doorId);
  }

  /** Check if evidence system has any doors to track. */
  get hasDoors(): boolean {
    return this.doorSnapshot.size > 0;
  }
}
