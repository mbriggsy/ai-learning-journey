import { describe, it, expect } from 'vitest';
import { EvidenceTracker } from '../../../src/game/ai/evidence.js';
import type { DoorId, DoorState } from '../../../src/types/state.js';

function makeDoor(id: string, isOpen: boolean, lastToggleTick: number): DoorState {
  return {
    id: id as DoorId,
    position: { x: 5, y: 5 },
    isOpen,
    lastToggleTick,
  };
}

describe('EvidenceTracker', () => {
  it('detects door state change since snapshot', () => {
    const doors = new Map<DoorId, DoorState>();
    const door = makeDoor('door1', false, -30); // starts closed
    doors.set(door.id, door);

    const tracker = new EvidenceTracker(doors, 100);

    // Door is now open (toggled by player at tick 150)
    const changedDoor = makeDoor('door1', true, 150);
    expect(tracker.hasEvidence(changedDoor)).toBe(true);
  });

  it('ignores self-opened doors', () => {
    const doors = new Map<DoorId, DoorState>();
    const door = makeDoor('door1', false, -30);
    doors.set(door.id, door);

    const tracker = new EvidenceTracker(doors, 100);
    tracker.recordSelfOpen('door1' as DoorId);

    const changedDoor = makeDoor('door1', true, 150);
    expect(tracker.hasEvidence(changedDoor)).toBe(false);
  });

  it('detects double-toggled door via lastToggleTick', () => {
    const doors = new Map<DoorId, DoorState>();
    const door = makeDoor('door1', false, -30);
    doors.set(door.id, door);

    const tracker = new EvidenceTracker(doors, 100);

    // Door was toggled twice (open → close), ending in same state as snapshot
    // But lastToggleTick > huntStartTick reveals the activity
    const sameStateDoor = makeDoor('door1', false, 200);
    expect(tracker.hasEvidence(sameStateDoor)).toBe(true);
  });

  it('returns false for unchanged doors', () => {
    const doors = new Map<DoorId, DoorState>();
    const door = makeDoor('door1', false, -30);
    doors.set(door.id, door);

    const tracker = new EvidenceTracker(doors, 100);

    // Door unchanged since snapshot
    expect(tracker.hasEvidence(door)).toBe(false);
  });

  it('hasDoors returns false for empty map', () => {
    const tracker = new EvidenceTracker(new Map(), 100);
    expect(tracker.hasDoors).toBe(false);
  });

  it('hasDoors returns true when doors exist', () => {
    const doors = new Map<DoorId, DoorState>();
    doors.set('door1' as DoorId, makeDoor('door1', false, -30));
    const tracker = new EvidenceTracker(doors, 100);
    expect(tracker.hasDoors).toBe(true);
  });
});
