import { describe, it, expect } from 'vitest';
import { ASSETS } from '../../src/assets/manifest';

describe('Asset manifest placeholder', () => {
  it('exports ASSETS with required top-level keys', () => {
    const keys = Object.keys(ASSETS);
    expect(keys).toContain('cars');
    expect(keys).toContain('tracks');
    expect(keys).toContain('textures');
    expect(keys).toContain('audio');
    expect(keys).toContain('atlas');
    expect(keys).toHaveLength(5);
  });

  it('cars has player and ai sub-keys', () => {
    expect(ASSETS.cars).toHaveProperty('player');
    expect(ASSETS.cars).toHaveProperty('ai');
  });
});
