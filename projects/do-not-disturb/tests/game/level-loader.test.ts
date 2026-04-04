import { describe, it, expect } from 'vitest';
import { loadLevel } from '../../src/game/level-loader';
import { createTestHotel } from './fixtures/test-hotel';

describe('loadLevel', () => {
  const config = createTestHotel();
  const { world, noiseZones } = loadLevel(config);

  it('creates zones for all rooms', () => {
    expect(world.zones.size).toBe(4); // 2 lobby rooms + 2 floor2 rooms
    expect(world.zones.has('room-lobby-a')).toBe(true);
    expect(world.zones.has('room-lobby-b')).toBe(true);
    expect(world.zones.has('room-f2-a')).toBe(true);
    expect(world.zones.has('room-f2-b')).toBe(true);
  });

  it('zones have correct surface types', () => {
    expect(world.zones.get('room-lobby-a')?.surfaceType).toBe('wood');
    expect(world.zones.get('room-lobby-b')?.surfaceType).toBe('tile');
    expect(world.zones.get('room-f2-a')?.surfaceType).toBe('carpet');
  });

  it('zones have correct ambient light', () => {
    expect(world.zones.get('room-lobby-a')?.ambientLight).toBe(0.5);
    expect(world.zones.get('room-f2-a')?.ambientLight).toBe(0.25);
  });

  it('creates doors with correct initial state', () => {
    expect(world.doors).toHaveLength(2); // door-1 and door-2
    const door1 = world.doors.find(d => d.id === 'door-1');
    const door2 = world.doors.find(d => d.id === 'door-2');
    expect(door1?.isOpen).toBe(false);
    expect(door2?.isOpen).toBe(true);
  });

  it('doors have connectsZones', () => {
    const door1 = world.doors.find(d => d.id === 'door-1');
    expect(door1?.connectsZones).toContain('room-lobby-a');
    expect(door1?.connectsZones).toContain('room-lobby-b');
  });

  it('creates hiding spots', () => {
    expect(world.hidingSpots).toHaveLength(4); // desk, bed, closet, vent
  });

  it('builds noise zones with connections', () => {
    expect(noiseZones.length).toBeGreaterThanOrEqual(4);
    // Lobby rooms should be connected
    const lobbyA = noiseZones.find(z => z.id === 'room-lobby-a');
    expect(lobbyA?.adjacentZones.some(c => c.targetZoneId === 'room-lobby-b')).toBe(true);
  });

  it('builds nav graph with nodes for rooms', () => {
    expect(world.navGraph.nodes.has('room-lobby-a')).toBe(true);
    expect(world.navGraph.nodes.has('room-f2-a')).toBe(true);
  });

  it('builds nav graph with stair connections', () => {
    expect(world.navGraph.nodes.has('stairs-lobby')).toBe(true);
    expect(world.navGraph.nodes.has('stairs-floor2')).toBe(true);
  });

  it('builds nav graph with elevator stops', () => {
    expect(world.navGraph.nodes.has('elevator-lobby')).toBe(true);
    expect(world.navGraph.nodes.has('elevator-floor2')).toBe(true);
  });

  it('elevator starts at first stop', () => {
    expect(world.elevatorFloor).toBe('lobby');
    expect(world.elevatorMoving).toBe(false);
  });

  it('same config produces same world (data-driven)', () => {
    const { world: world2 } = loadLevel(config);
    expect(world2.zones.size).toBe(world.zones.size);
    expect(world2.doors.length).toBe(world.doors.length);
  });
});
