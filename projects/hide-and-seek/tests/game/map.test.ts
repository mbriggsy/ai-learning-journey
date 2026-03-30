import { describe, it, expect } from 'vitest';
import { createGameMap, pixelToTile, tileToPixelCenter } from '../../src/game/map.js';

function makeMinimalTiledJson(overrides: Record<string, unknown> = {}) {
  return {
    width: 10,
    height: 10,
    tilewidth: 32,
    tileheight: 32,
    layers: [
      {
        type: 'tilelayer',
        name: 'Ground',
        width: 10,
        height: 10,
        data: new Array(100).fill(1),
      },
      {
        type: 'tilelayer',
        name: 'Walls',
        width: 10,
        height: 10,
        // Perimeter walls (tile GID 2 = collides + blocks_los)
        data: (() => {
          const d = new Array(100).fill(0);
          for (let x = 0; x < 10; x++) { d[x] = 2; d[90 + x] = 2; }
          for (let y = 0; y < 10; y++) { d[y * 10] = 2; d[y * 10 + 9] = 2; }
          return d;
        })(),
      },
      {
        type: 'objectgroup',
        name: 'Spawns',
        objects: [
          { id: 1, name: 'hider_spawn', type: 'hider_spawn', x: 160, y: 160, point: true },
          { id: 2, name: 'seeker_spawn', type: 'seeker_spawn', x: 256, y: 256, point: true },
        ],
      },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: 'placeholder',
        tilecount: 3,
        tiles: [
          { id: 0, properties: [{ name: 'collides', type: 'bool', value: false }, { name: 'blocks_los', type: 'bool', value: false }] },
          { id: 1, properties: [{ name: 'collides', type: 'bool', value: true }, { name: 'blocks_los', type: 'bool', value: true }] },
          { id: 2, properties: [{ name: 'collides', type: 'bool', value: true }, { name: 'blocks_los', type: 'bool', value: true }] },
        ],
      },
    ],
    ...overrides,
  };
}

describe('createGameMap', () => {
  it('creates a valid map from Tiled JSON', () => {
    const { map, spawns } = createGameMap(makeMinimalTiledJson());
    expect(map.width).toBe(10);
    expect(map.height).toBe(10);
    expect(spawns).toHaveLength(2);
    expect(spawns[0]?.type).toBe('hider_spawn');
    expect(spawns[1]?.type).toBe('seeker_spawn');
  });

  it('marks perimeter tiles as not walkable', () => {
    const { map } = createGameMap(makeMinimalTiledJson());
    expect(map.isWalkable(0, 0)).toBe(false);
    expect(map.isWalkable(5, 0)).toBe(false);
    expect(map.isWalkable(0, 5)).toBe(false);
    expect(map.isWalkable(9, 9)).toBe(false);
  });

  it('marks interior tiles as walkable', () => {
    const { map } = createGameMap(makeMinimalTiledJson());
    expect(map.isWalkable(5, 5)).toBe(true);
    expect(map.isWalkable(3, 3)).toBe(true);
  });

  it('reports out-of-bounds as not walkable', () => {
    const { map } = createGameMap(makeMinimalTiledJson());
    expect(map.isWalkable(-1, 5)).toBe(false);
    expect(map.isWalkable(5, -1)).toBe(false);
    expect(map.isWalkable(10, 5)).toBe(false);
    expect(map.isWalkable(5, 10)).toBe(false);
  });

  it('reports wall tiles as blocking LOS', () => {
    const { map } = createGameMap(makeMinimalTiledJson());
    expect(map.isBlocking(0, 0)).toBe(true);
    expect(map.isBlocking(5, 5)).toBe(false);
  });

  it('reports out-of-bounds as blocking LOS', () => {
    const { map } = createGameMap(makeMinimalTiledJson());
    expect(map.isBlocking(-1, 0)).toBe(true);
    expect(map.isBlocking(100, 100)).toBe(true);
  });

  it('throws on missing hider_spawn', () => {
    const json = makeMinimalTiledJson();
    (json.layers[2] as { objects: unknown[] }).objects = [
      { id: 1, name: 'seeker_spawn', type: 'seeker_spawn', x: 160, y: 160, point: true },
    ];
    expect(() => createGameMap(json)).toThrow('hider_spawn');
  });

  it('throws on invalid dimensions', () => {
    expect(() => createGameMap(makeMinimalTiledJson({ width: 5 }))).toThrow('width');
  });

  it('throws on wrong tile size', () => {
    expect(() => createGameMap(makeMinimalTiledJson({ tilewidth: 16 }))).toThrow('Tile size');
  });

  it('coerces string boolean properties', () => {
    const json = makeMinimalTiledJson();
    json.tilesets[0]!.tiles![1]!.properties = [
      { name: 'collides', type: 'bool', value: 'true' as unknown as boolean },
      { name: 'blocks_los', type: 'bool', value: 'true' as unknown as boolean },
    ];
    const { map } = createGameMap(json);
    expect(map.isWalkable(0, 0)).toBe(false);
  });

  it('handles obj.class (Tiled 1.9+ rename)', () => {
    const json = makeMinimalTiledJson();
    const spawnsLayer = json.layers[2] as { objects: Record<string, unknown>[] };
    spawnsLayer.objects = [
      { id: 1, name: 'hider_spawn', class: 'hider_spawn', x: 160, y: 160, point: true },
    ];
    const { spawns } = createGameMap(json);
    expect(spawns[0]?.type).toBe('hider_spawn');
  });
});

describe('pixelToTile', () => {
  it('converts pixel coordinates to tile coordinates', () => {
    const coord = pixelToTile(64, 96);
    expect(coord.x).toBe(2);
    expect(coord.y).toBe(3);
  });

  it('uses floor, not round', () => {
    const coord = pixelToTile(63, 95);
    expect(coord.x).toBe(1);
    expect(coord.y).toBe(2);
  });

  it('handles origin', () => {
    const coord = pixelToTile(0, 0);
    expect(coord.x).toBe(0);
    expect(coord.y).toBe(0);
  });
});

describe('tileToPixelCenter', () => {
  it('returns center of tile in pixels', () => {
    const center = tileToPixelCenter(2, 3);
    expect(center.x).toBe(80);  // 2*32 + 16
    expect(center.y).toBe(112); // 3*32 + 16
  });
});
