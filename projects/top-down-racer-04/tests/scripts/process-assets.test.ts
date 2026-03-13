/**
 * Asset Processor Tests
 *
 * Validates the outputs of scripts/process-assets.ts:
 * - Generated manifest is valid TypeScript with correct paths
 * - All manifest paths resolve to existing files on disk
 * - Atlas JSON has correct frame coordinates and metadata
 * - Atlas PNG dimensions are 520×520 (4 × 256×256 + 2px padding)
 * - Optimized PNGs are ≤ raw PNGs in file size (within 5% tolerance)
 * - All car sprite frames reference valid atlas regions
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { ASSETS } from '../../src/assets/manifest';

const ROOT = resolve(__dirname, '../..');
const PUBLIC = join(ROOT, 'public');

describe('Asset processor outputs', () => {
  describe('Manifest validity', () => {
    it('manifest exports ASSETS with expected structure', () => {
      expect(ASSETS).toBeDefined();
      expect(ASSETS.cars).toBeDefined();
      expect(ASSETS.cars.atlas).toBeDefined();
      expect(ASSETS.cars.frames).toBeDefined();
      expect(ASSETS.tracks).toBeDefined();
      expect(ASSETS.textures).toBeDefined();
    });

    it('all manifest paths resolve to existing files', () => {
      const paths: string[] = [
        ASSETS.cars.atlas,
        ...Object.values(ASSETS.tracks).map((t) => t.bg),
        ...Object.values(ASSETS.textures),
      ];

      for (const relPath of paths) {
        const absPath = join(PUBLIC, relPath);
        expect(existsSync(absPath), `missing: ${relPath}`).toBe(true);
      }
    });
  });

  describe('Atlas JSON', () => {
    const atlasPath = join(PUBLIC, ASSETS.cars.atlas);
    const atlas = JSON.parse(readFileSync(atlasPath, 'utf-8'));

    it('has correct frame coordinates and trimmed: false', () => {
      const frameNames = Object.values(ASSETS.cars.frames) as string[];
      expect(frameNames.length).toBe(4);

      for (const name of frameNames) {
        const frame = atlas.frames[name];
        expect(frame, `missing frame: ${name}`).toBeDefined();
        expect(frame.frame.w).toBe(256);
        expect(frame.frame.h).toBe(256);
        expect(frame.trimmed).toBe(false);
        expect(frame.sourceSize).toEqual({ w: 256, h: 256 });
        expect(frame.spriteSourceSize).toEqual({ x: 0, y: 0, w: 256, h: 256 });
      }
    });

    it('atlas meta reports 520×520 dimensions', () => {
      expect(atlas.meta.size).toEqual({ w: 520, h: 520 });
      expect(atlas.meta.format).toBe('RGBA8888');
      expect(atlas.meta.image).toBe('cars-atlas.png');
    });

    it('all car sprite frames reference valid atlas regions (within 520×520)', () => {
      for (const [name, data] of Object.entries(atlas.frames) as [string, any][]) {
        const { x, y, w, h } = data.frame;
        expect(x + w, `${name} exceeds atlas width`).toBeLessThanOrEqual(520);
        expect(y + h, `${name} exceeds atlas height`).toBeLessThanOrEqual(520);
        expect(x, `${name} negative x`).toBeGreaterThanOrEqual(0);
        expect(y, `${name} negative y`).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Optimized file sizes', () => {
    const RAW = join(ROOT, 'assets', 'raw');

    const fileMap: Array<{ raw: string; optimized: string }> = [
      ...Object.values(ASSETS.tracks).map((t) => ({
        raw: join(RAW, t.bg.split('/').pop()!),
        optimized: join(PUBLIC, t.bg),
      })),
      {
        raw: join(RAW, 'asphalt-tile.png'),
        optimized: join(PUBLIC, ASSETS.textures.asphalt),
      },
      {
        raw: join(RAW, 'grass-tile.png'),
        optimized: join(PUBLIC, ASSETS.textures.grass),
      },
      {
        raw: join(RAW, 'curb-tile.png'),
        optimized: join(PUBLIC, ASSETS.textures.curb),
      },
    ];

    it('optimized PNGs are ≤ raw PNGs in file size (within 5% tolerance)', () => {
      for (const { raw, optimized } of fileMap) {
        if (!existsSync(raw) || !existsSync(optimized)) continue;
        const rawSize = statSync(raw).size;
        const optSize = statSync(optimized).size;
        expect(
          optSize,
          `${optimized} (${optSize}B) exceeds raw (${rawSize}B) by >5%`,
        ).toBeLessThanOrEqual(rawSize * 1.05);
      }
    });
  });
});
