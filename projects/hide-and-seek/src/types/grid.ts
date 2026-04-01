declare const TileCoordBrand: unique symbol;

export interface TileCoord {
  readonly [TileCoordBrand]: never;
  readonly x: number;
  readonly y: number;
}

export function tileCoord(x: number, y: number): TileCoord {
  return { x, y } as TileCoord;
}

export interface ReadonlyTileGrid<T extends number> {
  readonly width: number;
  readonly height: number;
  get(coord: TileCoord): T | undefined;
}

export interface MutableTileGrid<T extends number> extends ReadonlyTileGrid<T> {
  set(coord: TileCoord, value: T): void;
}
