import Phaser from 'phaser';

// Insight 003: Phaser flattens Tiled properties from array format to Record<string, unknown>.
// Access as obj.properties?.key, NOT obj.properties[0].value
export function getTiledProperty<T>(
  obj: Phaser.Types.Tilemaps.TiledObject,
  key: string,
): T | undefined {
  const props = obj.properties as Record<string, unknown> | undefined;
  return props?.[key] as T | undefined;
}
