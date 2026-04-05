import type { LevelConfig, DoorConfig } from '../types/level';
import type { WorldState, ZoneInfo, DoorState, NavNode, NavEdge, NavGraph, ZoneId } from '../types/state';
import type { NoiseZone, ZoneConnection } from './noise';
import { NOISE } from '../constants';
import { getFloorAmbientLight } from './light-zones';

export type LoadedLevel = {
  readonly world: WorldState;
  readonly noiseZones: readonly NoiseZone[];
};

export function loadLevel(config: LevelConfig): LoadedLevel {
  const zones = new Map<ZoneId, ZoneInfo>();
  const doors: DoorState[] = [];
  const hidingSpots: Array<{ id: string; type: string; position: { x: number; y: number }; zoneId: ZoneId }> = [];
  const noiseConnections = new Map<ZoneId, ZoneConnection[]>();
  const navNodes = new Map<string, NavNode>();
  const navEdges = new Map<string, NavEdge[]>();
  const doorZoneMap = new Map<string, readonly [ZoneId, ZoneId]>();

  // Process each floor
  for (const floor of config.floors) {
    for (const room of floor.rooms) {
      // Create zone
      zones.set(room.id, {
        id: room.id,
        floor: floor.number,
        surfaceType: room.surfaceType,
        ambientLight: room.ambientLight ?? getFloorAmbientLight(floor.id),
      });

      // Initialize noise connections for this zone
      if (!noiseConnections.has(room.id)) {
        noiseConnections.set(room.id, []);
      }

      // Create nav waypoint at room center
      const centerX = room.bounds.x + room.bounds.width / 2;
      const centerY = room.bounds.y + room.bounds.height / 2;
      navNodes.set(room.id, {
        id: room.id,
        position: { x: centerX, y: centerY },
        floor: floor.number,
        type: 'waypoint',
      });
      if (!navEdges.has(room.id)) {
        navEdges.set(room.id, []);
      }

      // Process doors — connect this room to adjacent rooms
      for (const door of room.doors) {
        doorZoneMap.set(door.id, [room.id, door.connectsTo]);

        // Only add door once (it connects two rooms, each may reference it)
        if (!doors.some(d => d.id === door.id)) {
          doors.push({
            id: door.id,
            isOpen: door.initialState === 'open',
            position: door.position,
            connectsZones: [room.id, door.connectsTo],
          });
        }

        // Noise connection through door
        const attenuation = door.initialState === 'open'
          ? NOISE.ADJACENT_ROOM_OPEN_DOOR
          : NOISE.ADJACENT_ROOM_CLOSED_DOOR;

        addNoiseConnection(noiseConnections, room.id, door.connectsTo, attenuation);

        // Nav edge through door
        const doorCost = door.initialState === 'open' ? 10 : 50;
        addNavEdge(navEdges, room.id, door.connectsTo, doorCost);
        addNavEdge(navEdges, door.connectsTo, room.id, doorCost);
      }

      // Process hiding spots
      for (const spot of room.hidingSpots) {
        hidingSpots.push({
          id: spot.id,
          type: spot.type,
          position: spot.position,
          zoneId: room.id,
        });
      }
    }
  }

  // Process floor connections (stairs, chutes)
  for (const conn of config.connections) {
    const fromZone = findNearestZone(config, conn.fromFloor, conn.fromPosition);
    const toZone = findNearestZone(config, conn.toFloor, conn.toPosition);
    if (!fromZone || !toZone) continue;

    // Noise: cross-floor attenuation
    addNoiseConnection(noiseConnections, fromZone, toZone, NOISE.CROSS_FLOOR);
    if (conn.bidirectional) {
      addNoiseConnection(noiseConnections, toZone, fromZone, NOISE.CROSS_FLOOR);
    }

    // Nav: stair nodes and edges
    const fromNodeId = `${conn.type}-${conn.fromFloor}`;
    const toNodeId = `${conn.type}-${conn.toFloor}`;
    const fromFloorNum = config.floors.find(f => f.id === conn.fromFloor)?.number ?? 0;
    const toFloorNum = config.floors.find(f => f.id === conn.toFloor)?.number ?? 0;

    navNodes.set(fromNodeId, {
      id: fromNodeId, position: conn.fromPosition,
      floor: fromFloorNum, type: 'stair-bottom',
    });
    navNodes.set(toNodeId, {
      id: toNodeId, position: conn.toPosition,
      floor: toFloorNum, type: 'stair-top',
    });

    const stairCost = 50;
    addNavEdge(navEdges, fromZone, fromNodeId, 5);
    addNavEdge(navEdges, fromNodeId, fromZone, 5);
    addNavEdge(navEdges, fromNodeId, toNodeId, stairCost);
    addNavEdge(navEdges, toZone, toNodeId, 5);
    addNavEdge(navEdges, toNodeId, toZone, 5);
    if (conn.bidirectional) {
      addNavEdge(navEdges, toNodeId, fromNodeId, stairCost);
    }
  }

  // Process elevator stops
  for (let i = 0; i < config.elevator.stops.length; i++) {
    const stop = config.elevator.stops[i]!;
    const nodeId = `elevator-${stop.floor}`;
    const floorNum = config.floors.find(f => f.id === stop.floor)?.number ?? 0;
    const nearestZone = findNearestZone(config, stop.floor, stop.position);

    navNodes.set(nodeId, {
      id: nodeId, position: stop.position,
      floor: floorNum, type: 'elevator-stop',
    });

    // Connect elevator stop to nearest zone on that floor
    if (nearestZone) {
      addNavEdge(navEdges, nearestZone, nodeId, 5);
      addNavEdge(navEdges, nodeId, nearestZone, 5);
      // Elevator shaft noise connection
      addNoiseConnection(noiseConnections, nearestZone, nodeId, NOISE.ELEVATOR_SHAFT);
    }

    // Connect elevator stops to each other
    for (let j = i + 1; j < config.elevator.stops.length; j++) {
      const otherStop = config.elevator.stops[j]!;
      const otherNodeId = `elevator-${otherStop.floor}`;
      const dist = Math.abs(i - j);
      const elevatorCost = dist * 30;
      addNavEdge(navEdges, nodeId, otherNodeId, elevatorCost);
      addNavEdge(navEdges, otherNodeId, nodeId, elevatorCost);
    }
  }

  // Build noise zones
  const noiseZones: NoiseZone[] = [];
  for (const [zoneId, connections] of noiseConnections) {
    const zone = zones.get(zoneId);
    noiseZones.push({
      id: zoneId,
      floor: zone?.floor ?? 0,
      adjacentZones: connections,
    });
  }

  const navGraph: NavGraph = { nodes: navNodes, edges: navEdges };

  const world: WorldState = {
    zones,
    doors,
    hidingSpots: hidingSpots.map(s => ({
      id: s.id,
      type: s.type as any,
      position: s.position,
      zoneId: s.zoneId,
    })),
    navGraph,
    elevatorFloor: config.elevator.stops[0]?.floor ?? 'lobby',
    elevatorMoving: false,
  };

  return { world, noiseZones };
}

function addNoiseConnection(
  connections: Map<ZoneId, ZoneConnection[]>,
  from: ZoneId,
  to: ZoneId,
  attenuation: number,
) {
  let list = connections.get(from);
  if (!list) { list = []; connections.set(from, list); }
  // Don't duplicate
  if (!list.some(c => c.targetZoneId === to)) {
    list.push({ targetZoneId: to, attenuation });
  }
}

function addNavEdge(
  edges: Map<string, NavEdge[]>,
  from: string,
  to: string,
  cost: number,
) {
  let list = edges.get(from);
  if (!list) { list = []; edges.set(from, list); }
  if (!list.some(e => e.to === to)) {
    list.push({ from, to, cost });
  }
}

function findNearestZone(
  config: LevelConfig,
  floorId: string,
  position: { x: number; y: number },
): ZoneId | null {
  const floor = config.floors.find(f => f.id === floorId);
  if (!floor) return null;

  let nearest: ZoneId | null = null;
  let minDist = Infinity;

  for (const room of floor.rooms) {
    const cx = room.bounds.x + room.bounds.width / 2;
    const cy = room.bounds.y + room.bounds.height / 2;
    const dist = Math.abs(position.x - cx) + Math.abs(position.y - cy);
    if (dist < minDist) {
      minDist = dist;
      nearest = room.id;
    }
  }

  return nearest;
}
