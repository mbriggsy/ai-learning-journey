export type AreaPalette = {
  readonly primary: number;
  readonly accent: number;
  readonly shadow: number;
  readonly name: string;
};

export const AREA_PALETTES = {
  lobby: {
    primary: 0xD4A574,
    accent: 0xC9A94E,
    shadow: 0x3D2B1F,
    name: 'Warm amber — old money, decay',
  },
  floors: {
    primary: 0x6B7B8D,
    accent: 0xE8D5A3,
    shadow: 0x1A1A2E,
    name: 'Blue-grey — eerie calm',
  },
  attic: {
    primary: 0xC4C8CC,
    accent: 0x8FA4B8,
    shadow: 0x151520,
    name: 'Cold white — exposure, isolation',
  },
  basement: {
    primary: 0x0D0D12,
    accent: 0x8B4513,
    shadow: 0x050508,
    name: 'Near-black — dread, claustrophobia',
  },
} as const satisfies Record<string, AreaPalette>;

export type AreaId = keyof typeof AREA_PALETTES;

export function getAreaPalette(area: AreaId): AreaPalette {
  return AREA_PALETTES[area];
}

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xFF,
    g: (hex >> 8) & 0xFF,
    b: hex & 0xFF,
  };
}
