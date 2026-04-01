import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const PHASER_IMPORT_PATTERNS = [
  /from\s+['"]phaser['"]/,
  /import\s+['"]phaser['"]/,
  /require\(\s*['"]phaser['"]\s*\)/,
];

const BROWSER_GLOBAL_PATTERNS = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\bnavigator\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\brequestAnimationFrame\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bAudio\b/,
  /\bHTMLElement\b/,
  /\bCanvas\b/,
];

const ROOT = process.cwd();
const GAME_DIR = path.join(ROOT, 'src', 'game');
const TYPES_DIR = path.join(ROOT, 'src', 'types');

// Becomes meaningful in Phase 1 when game logic files are added
describe('architecture boundary: src/game/', () => {
  const gameFiles = collectTsFiles(GAME_DIR);

  it('has zero Phaser imports', () => {
    const violations: string[] = [];
    for (const filePath of gameFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of PHASER_IMPORT_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(ROOT, filePath)}: matches ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('has zero browser global references', () => {
    const violations: string[] = [];
    for (const filePath of gameFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Skip comments
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
        for (const pattern of BROWSER_GLOBAL_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(
              `${path.relative(ROOT, filePath)}:${i + 1}: "${line.trim()}" matches ${pattern}`
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('architecture boundary: FogRenderer', () => {
  it('has zero imports from src/game/', () => {
    const fogPath = path.join(ROOT, 'src', 'renderer', 'systems', 'FogRenderer.ts');
    if (!fs.existsSync(fogPath)) return; // Skip if not yet created
    const content = fs.readFileSync(fogPath, 'utf-8');
    const forbidden = /from\s+['"].*\/game\//;
    expect(forbidden.test(content)).toBe(false);
  });
});

describe('architecture boundary: src/types/', () => {
  const typeFiles = collectTsFiles(TYPES_DIR);

  it('has zero imports from src/game/ or src/renderer/', () => {
    const violations: string[] = [];
    const forbidden = [
      /from\s+['"].*\/game\//,
      /from\s+['"].*\/renderer\//,
    ];
    for (const filePath of typeFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of forbidden) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(ROOT, filePath)}: matches ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
