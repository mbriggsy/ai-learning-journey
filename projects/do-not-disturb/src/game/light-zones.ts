// Default ambient light per floor
export const FLOOR_AMBIENT_LIGHT: Record<string, number> = {
  attic: 0.3,
  floor3: 0.25,
  floor2: 0.25,
  lobby: 0.5,
  basement: 0.05,
};

export function getFloorAmbientLight(floorId: string): number {
  return FLOOR_AMBIENT_LIGHT[floorId] ?? 0.2;
}
