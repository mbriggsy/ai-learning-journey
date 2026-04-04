import type { ZoneId, Position } from '../types/state';
import { NOISE } from '../constants';

export type NoiseZone = {
  readonly id: ZoneId;
  readonly floor: number;
  readonly adjacentZones: readonly ZoneConnection[];
};

export type ZoneConnection = {
  readonly targetZoneId: ZoneId;
  readonly attenuation: number; // 0-1
};

export type NoiseEvent = {
  readonly sourceZoneId: ZoneId;
  readonly level: number; // 0-1 normalized
  readonly position: Position;
};

export type NoiseSystem = {
  propagate(sourceZoneId: ZoneId, level: number): ReadonlyMap<ZoneId, number>;
  updateConnection(zoneA: ZoneId, zoneB: ZoneId, attenuation: number): void;
};

export function createNoiseSystem(zones: readonly NoiseZone[]): NoiseSystem {
  // Build mutable adjacency map for dynamic door updates
  const adjacency = new Map<ZoneId, Map<ZoneId, number>>();

  for (const zone of zones) {
    const connections = new Map<ZoneId, number>();
    for (const conn of zone.adjacentZones) {
      connections.set(conn.targetZoneId, conn.attenuation);
    }
    adjacency.set(zone.id, connections);
  }

  return {
    propagate(sourceZoneId: ZoneId, level: number): ReadonlyMap<ZoneId, number> {
      const result = new Map<ZoneId, number>();
      result.set(sourceZoneId, level);

      // BFS with attenuation
      const queue: Array<{ zoneId: ZoneId; currentLevel: number }> = [
        { zoneId: sourceZoneId, currentLevel: level },
      ];

      while (queue.length > 0) {
        const item = queue.shift()!;
        const connections = adjacency.get(item.zoneId);
        if (!connections) continue;

        for (const [targetId, attenuation] of connections) {
          const propagated = item.currentLevel * attenuation;
          if (propagated < NOISE.PROPAGATION_THRESHOLD) continue;

          const existing = result.get(targetId);
          if (existing !== undefined && existing >= propagated) continue;

          result.set(targetId, propagated);
          queue.push({ zoneId: targetId, currentLevel: propagated });
        }
      }

      return result;
    },

    updateConnection(zoneA: ZoneId, zoneB: ZoneId, attenuation: number) {
      adjacency.get(zoneA)?.set(zoneB, attenuation);
      adjacency.get(zoneB)?.set(zoneA, attenuation);
    },
  };
}
