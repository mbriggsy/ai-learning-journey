/**
 * Build Verification Tests — Sub-Phase 6.6
 *
 * Validates the production build output (dist/) contains all required files.
 * Run separately via: pnpm run test:build
 * Requires: pnpm run build to have been run first.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(__dirname, '../../dist');

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(DIST, relativePath));
}

function fileSize(relativePath: string): number {
  const stat = fs.statSync(path.join(DIST, relativePath));
  return stat.size;
}

function dirSize(relativePath: string): number {
  let total = 0;
  const entries = fs.readdirSync(path.join(DIST, relativePath), { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const fullPath = path.join(entry.parentPath ?? entry.path, entry.name);
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

describe('Build Verification', () => {
  it('dist/ directory exists', () => {
    expect(fs.existsSync(DIST)).toBe(true);
  });

  it('index.html exists', () => {
    expect(fileExists('index.html')).toBe(true);
  });

  // ── AI Model Assets ──

  it('ONNX model exists and is reasonable size (10KB-100KB)', () => {
    expect(fileExists('ai/model.onnx')).toBe(true);
    const size = fileSize('ai/model.onnx');
    expect(size).toBeGreaterThan(10_000);
    expect(size).toBeLessThan(100_000);
  });

  it('vecnorm_stats.json exists and is valid JSON', () => {
    expect(fileExists('ai/vecnorm_stats.json')).toBe(true);
    const raw = fs.readFileSync(path.join(DIST, 'ai/vecnorm_stats.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('obs_mean');
    expect(parsed).toHaveProperty('obs_var');
  });

  // ── ORT WASM ──

  it('ORT WASM files exist in assets/ort/ and are > 1MB', () => {
    const ortDir = path.join(DIST, 'assets/ort');
    expect(fs.existsSync(ortDir)).toBe(true);
    const files = fs.readdirSync(ortDir).filter(f => f.endsWith('.wasm') || f.endsWith('.mjs'));
    expect(files.length).toBeGreaterThanOrEqual(1);
    for (const f of files) {
      if (f.endsWith('.wasm')) {
        expect(fs.statSync(path.join(ortDir, f)).size).toBeGreaterThan(1_000_000);
      }
    }
  });

  // ── Track Backgrounds ──

  it('all 3 track backgrounds exist', () => {
    expect(fileExists('assets/tracks/track01-bg.png')).toBe(true);
    expect(fileExists('assets/tracks/track02-bg.png')).toBe(true);
    expect(fileExists('assets/tracks/track03-bg.png')).toBe(true);
  });

  // ── Car Atlas ──

  it('car atlas exists (PNG + JSON)', () => {
    expect(fileExists('assets/sprites/cars-atlas.png')).toBe(true);
    expect(fileExists('assets/sprites/cars-atlas.json')).toBe(true);
  });

  // ── Textures ──

  it('tile textures exist', () => {
    expect(fileExists('assets/textures/asphalt-tile.png')).toBe(true);
    expect(fileExists('assets/textures/grass-tile.png')).toBe(true);
    expect(fileExists('assets/textures/curb-tile.png')).toBe(true);
  });

  // ── UI ──

  it('menu background exists', () => {
    expect(fileExists('assets/ui/menu-bg.png')).toBe(true);
  });

  // ── Security / Leak Guards ──

  it('no .env files in dist', () => {
    const allFiles = fs.readdirSync(DIST, { recursive: true }) as string[];
    const envFiles = allFiles.filter(f => typeof f === 'string' && f.includes('.env'));
    expect(envFiles).toHaveLength(0);
  });

  it('no .ts or .d.ts source files in dist', () => {
    const allFiles = fs.readdirSync(DIST, { recursive: true }) as string[];
    const tsFiles = allFiles.filter(f => typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.d.ts')));
    expect(tsFiles).toHaveLength(0);
  });

  it('no .map source map files in dist', () => {
    const allFiles = fs.readdirSync(DIST, { recursive: true }) as string[];
    const mapFiles = allFiles.filter(f => typeof f === 'string' && f.endsWith('.map'));
    expect(mapFiles).toHaveLength(0);
  });

  // ── Size Budget ──

  it('total dist size < 80MB', () => {
    const total = dirSize('.');
    const MB = total / (1024 * 1024);
    expect(MB).toBeLessThan(80);
  });
});
