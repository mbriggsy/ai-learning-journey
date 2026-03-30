import type { GameMap, SpawnPoint } from '../types/state.js';
import { DISPLAY } from '../constants.js';

const TILE_SIZE = DISPLAY.TILE_SIZE;

// --- Tiled JSON shape (minimal subset we actually use) ---

interface TiledTileProperty {
  name: string;
  type: string;
  value: unknown;
}

interface TiledTile {
  id: number;
  properties?: TiledTileProperty[];
}

interface TiledTileset {
  firstgid: number;
  name: string;
  tilecount: number;
  tiles?: TiledTile[];
}

interface TiledTileLayer {
  type: 'tilelayer';
  name: string;
  data: number[];
  width: number;
  height: number;
}

interface TiledObject {
  id: number;
  name: string;
  type?: string;
  class?: string;
  x: number;
  y: number;
  point?: boolean;
  properties?: TiledTileProperty[];
}

interface TiledObjectGroup {
  type: 'objectgroup';
  name: string;
  objects: TiledObject[];
}

type TiledLayer = TiledTileLayer | TiledObjectGroup;

interface TiledMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

// --- Map implementation ---

class GameMapImpl implements GameMap {
  readonly width: number;
  readonly height: number;
  private readonly collisionGrid: Uint8Array;
  private readonly losGrid: Uint8Array;

  constructor(width: number, height: number, collisionGrid: Uint8Array, losGrid: Uint8Array) {
    this.width = width;
    this.height = height;
    this.collisionGrid = collisionGrid;
    this.losGrid = losGrid;
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.collisionGrid[y * this.width + x] === 0;
  }

  isBlocking(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return this.losGrid[y * this.width + x] === 1;
  }
}

// --- Helpers ---

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function findLayer<T extends TiledLayer>(layers: TiledLayer[], name: string, type: T['type']): T {
  const layer = layers.find(l => l.name === name && l.type === type);
  if (!layer) throw new Error(`Required layer "${name}" (type=${type}) not found in map`);
  return layer as T;
}

// --- Validation ---

function validateMapData(data: TiledMapJson): void {
  if (data.width < 10 || data.width > 200) {
    throw new Error(`Map width ${data.width} outside valid range 10-200`);
  }
  if (data.height < 10 || data.height > 200) {
    throw new Error(`Map height ${data.height} outside valid range 10-200`);
  }
  if (data.tilewidth !== TILE_SIZE || data.tileheight !== TILE_SIZE) {
    throw new Error(`Tile size ${data.tilewidth}x${data.tileheight} does not match expected ${TILE_SIZE}x${TILE_SIZE}`);
  }

  // Check required layers exist
  findLayer<TiledTileLayer>(data.layers, 'Ground', 'tilelayer');
  findLayer<TiledTileLayer>(data.layers, 'Walls', 'tilelayer');
  findLayer<TiledObjectGroup>(data.layers, 'Spawns', 'objectgroup');

  // Check for at least one hider spawn
  const spawnsLayer = findLayer<TiledObjectGroup>(data.layers, 'Spawns', 'objectgroup');
  const hasHiderSpawn = spawnsLayer.objects.some(
    obj => (obj.type === 'hider_spawn' || obj.class === 'hider_spawn')
  );
  if (!hasHiderSpawn) {
    throw new Error('No hider_spawn point object found in Spawns layer');
  }
}

// --- Build tile property lookup ---

function buildTileProperties(tilesets: TiledTileset[]): Map<number, { collides: boolean; blocksLos: boolean }> {
  const props = new Map<number, { collides: boolean; blocksLos: boolean }>();
  for (const tileset of tilesets) {
    if (!tileset.tiles) continue;
    for (const tile of tileset.tiles) {
      const gid = tileset.firstgid + tile.id;
      const collides = toBool(tile.properties?.find(p => p.name === 'collides')?.value);
      const blocksLos = toBool(tile.properties?.find(p => p.name === 'blocks_los')?.value);
      props.set(gid, { collides, blocksLos });
    }
  }
  return props;
}

// --- Public API ---

export function createGameMap(tiledJson: unknown): { map: GameMap; spawns: SpawnPoint[] } {
  const data = tiledJson as TiledMapJson;
  validateMapData(data);

  const { width, height } = data;
  const collisionGrid = new Uint8Array(width * height);
  const losGrid = new Uint8Array(width * height);

  const tileProps = buildTileProperties(data.tilesets);

  // Scan all tile layers for collision/LOS properties
  for (const layer of data.layers) {
    if (layer.type !== 'tilelayer') continue;
    const tileLayer = layer as TiledTileLayer;
    for (let i = 0; i < tileLayer.data.length; i++) {
      const gid = tileLayer.data[i];
      if (gid === undefined || gid === 0) continue; // empty tile
      const props = tileProps.get(gid);
      if (props?.collides) collisionGrid[i] = 1;
      if (props?.blocksLos) losGrid[i] = 1;
    }
  }

  // Extract spawn points
  const spawnsLayer = findLayer<TiledObjectGroup>(data.layers, 'Spawns', 'objectgroup');
  const spawns: SpawnPoint[] = [];
  for (const obj of spawnsLayer.objects) {
    const spawnType = obj.type || obj.class;
    if (spawnType === 'hider_spawn' || spawnType === 'seeker_spawn') {
      spawns.push({ x: obj.x, y: obj.y, type: spawnType });
    }
  }

  return { map: new GameMapImpl(width, height, collisionGrid, losGrid), spawns };
}

// Pre-allocated result objects — do not store references across calls.
const _tileResult = { x: 0, y: 0 };
const _pixelResult = { x: 0, y: 0 };

/** Returned object is reused — do not store references across calls. */
export function pixelToTile(pixelX: number, pixelY: number): { x: number; y: number } {
  _tileResult.x = Math.floor(pixelX / TILE_SIZE);
  _tileResult.y = Math.floor(pixelY / TILE_SIZE);
  return _tileResult;
}

/** Returned object is reused — do not store references across calls. */
export function tileToPixelCenter(tileX: number, tileY: number): { x: number; y: number } {
  _pixelResult.x = tileX * TILE_SIZE + TILE_SIZE / 2;
  _pixelResult.y = tileY * TILE_SIZE + TILE_SIZE / 2;
  return _pixelResult;
}
