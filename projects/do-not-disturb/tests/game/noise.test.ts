import { describe, it, expect } from 'vitest';
import { createNoiseSystem } from '../../src/game/noise';
import type { NoiseZone } from '../../src/game/noise';
import { NOISE } from '../../src/constants';

function makeThreeRoomGraph(): NoiseZone[] {
  // A -- (open door) -- B -- (closed door) -- C
  return [
    {
      id: 'roomA',
      floor: 1,
      adjacentZones: [{ targetZoneId: 'roomB', attenuation: NOISE.ADJACENT_ROOM_OPEN_DOOR }],
    },
    {
      id: 'roomB',
      floor: 1,
      adjacentZones: [
        { targetZoneId: 'roomA', attenuation: NOISE.ADJACENT_ROOM_OPEN_DOOR },
        { targetZoneId: 'roomC', attenuation: NOISE.ADJACENT_ROOM_CLOSED_DOOR },
      ],
    },
    {
      id: 'roomC',
      floor: 1,
      adjacentZones: [{ targetZoneId: 'roomB', attenuation: NOISE.ADJACENT_ROOM_CLOSED_DOOR }],
    },
  ];
}

function makeTwoFloorGraph(): NoiseZone[] {
  // floor1Room -- (stairs, cross-floor) -- floor2Room
  // floor1Room -- (elevator shaft) -- floor2Room
  return [
    {
      id: 'floor1',
      floor: 1,
      adjacentZones: [
        { targetZoneId: 'floor2', attenuation: NOISE.CROSS_FLOOR },
        { targetZoneId: 'floor2elevator', attenuation: NOISE.ELEVATOR_SHAFT },
      ],
    },
    {
      id: 'floor2',
      floor: 2,
      adjacentZones: [{ targetZoneId: 'floor1', attenuation: NOISE.CROSS_FLOOR }],
    },
    {
      id: 'floor2elevator',
      floor: 2,
      adjacentZones: [{ targetZoneId: 'floor1', attenuation: NOISE.ELEVATOR_SHAFT }],
    },
  ];
}

describe('createNoiseSystem', () => {
  it('noise in source zone returns full level', () => {
    const system = createNoiseSystem(makeThreeRoomGraph());
    const result = system.propagate('roomA', 1.0);
    expect(result.get('roomA')).toBe(1.0);
  });

  it('noise attenuates through open door', () => {
    const system = createNoiseSystem(makeThreeRoomGraph());
    const result = system.propagate('roomA', 1.0);
    expect(result.get('roomB')).toBeCloseTo(NOISE.ADJACENT_ROOM_OPEN_DOOR);
  });

  it('noise attenuates more through closed door', () => {
    const system = createNoiseSystem(makeThreeRoomGraph());
    const result = system.propagate('roomA', 1.0);
    // A → B (open: 0.7) → C (closed: 0.7 * 0.2 = 0.14)
    const expected = NOISE.ADJACENT_ROOM_OPEN_DOOR * NOISE.ADJACENT_ROOM_CLOSED_DOOR;
    expect(result.get('roomC')).toBeCloseTo(expected);
  });

  it('noise barely propagates cross-floor via stairs', () => {
    const system = createNoiseSystem(makeTwoFloorGraph());
    const result = system.propagate('floor1', 1.0);
    expect(result.get('floor2')).toBeCloseTo(NOISE.CROSS_FLOOR);
  });

  it('elevator shaft propagates at moderate attenuation', () => {
    const system = createNoiseSystem(makeTwoFloorGraph());
    const result = system.propagate('floor1', 1.0);
    expect(result.get('floor2elevator')).toBeCloseTo(NOISE.ELEVATOR_SHAFT);
  });

  it('BFS stops at threshold (does not infinite loop)', () => {
    // Chain of rooms with 0.1 attenuation each
    const zones: NoiseZone[] = [];
    for (let i = 0; i < 20; i++) {
      const adj: Array<{ targetZoneId: string; attenuation: number }> = [];
      if (i > 0) adj.push({ targetZoneId: `room${i - 1}`, attenuation: 0.1 });
      if (i < 19) adj.push({ targetZoneId: `room${i + 1}`, attenuation: 0.1 });
      zones.push({ id: `room${i}`, floor: 1, adjacentZones: adj });
    }

    const system = createNoiseSystem(zones);
    const result = system.propagate('room0', 1.0);

    // 0.1^2 = 0.01 = threshold, so room2 should be at threshold
    // 0.1^3 = 0.001 < threshold, so room3 should NOT be present
    expect(result.has('room0')).toBe(true);
    expect(result.has('room1')).toBe(true);
    expect(result.has('room2')).toBe(true);
    expect(result.has('room3')).toBe(false);
  });

  it('updateConnection changes attenuation for door toggle', () => {
    const system = createNoiseSystem(makeThreeRoomGraph());

    // Initially B→C has closed door attenuation (0.2)
    let result = system.propagate('roomB', 1.0);
    expect(result.get('roomC')).toBeCloseTo(NOISE.ADJACENT_ROOM_CLOSED_DOOR);

    // Open the door between B and C
    system.updateConnection('roomB', 'roomC', NOISE.ADJACENT_ROOM_OPEN_DOOR);
    result = system.propagate('roomB', 1.0);
    expect(result.get('roomC')).toBeCloseTo(NOISE.ADJACENT_ROOM_OPEN_DOOR);
  });
});
