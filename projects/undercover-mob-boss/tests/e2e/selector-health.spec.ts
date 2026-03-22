/**
 * Selector Health Check
 *
 * Meta-test: verifies that every data-testid used in E2E test files
 * actually exists in the source code. If someone removes a testid
 * from a view file, this test fails with a clear message naming
 * the exact missing testid.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// All data-testid values used across E2E tests.
// If you add a new testid to an E2E test, add it here too.
const EXPECTED_TESTIDS = [
  // Player lobby
  'lobby-room-code',
  'lobby-player-list',
  'lobby-player-item',
  // Role reveal
  'role-card',
  'role-card-hint',
  'role-name',
  'role-allies',
  // Vote
  'vote-approve',
  'vote-deny',
  'vote-confirmation',
  // Nomination
  'nomination-picker',
  'nomination-player',
  'nomination-confirm',
  // Mayor hand
  'mayor-hand',
  'policy-card',
  'mayor-discard-btn',
  // Chief hand
  'chief-hand',
  'chief-enact-btn',
  'chief-veto-btn',
  // Veto response
  'veto-accept',
  'veto-reject',
  // Investigation
  'investigate-picker',
  'investigate-player',
  'investigate-confirm',
  'investigation-card',
  'investigation-tap-prompt',
  'investigation-burn-btn',
  // Execution
  'execute-picker',
  'execute-player',
  'execute-confirm',
  // Special nomination
  'special-nominate-picker',
  'special-nominate-player',
  'special-nominate-confirm',
  // Policy peek
  'peek-cards',
  'peek-card',
  'peek-confirm',
  // Game over (player)
  'game-over-winner',
  'game-over-reason',
  'game-over-roles',
  // Waiting
  'waiting-message',
  // Spectator
  'spectator-badge',
  // Host lobby
  'host-start-btn',
  'host-player-count',
  'host-spawn-bots',
  'host-scenario-select',
  'host-bot-count',
  // Host game over
  'host-game-over-winner',
  'host-game-over-reason',
];

function findTestIdInSource(testId: string, srcDir: string): boolean {
  const files = getAllTsFiles(srcDir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes(`'${testId}'`) || content.includes(`"${testId}"`)) {
      return true;
    }
  }
  return false;
}

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

test.describe('Selector Health Check', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const srcDir = path.resolve(__dirname, '../../src/client');

  test('all expected data-testid values exist in source code', () => {
    const missing: string[] = [];

    for (const testId of EXPECTED_TESTIDS) {
      if (!findTestIdInSource(testId, srcDir)) {
        missing.push(testId);
      }
    }

    expect(missing, `Missing data-testid values in source:\n${missing.join('\n')}`).toEqual([]);
  });

  test('no duplicate testid values in the registry', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];

    for (const id of EXPECTED_TESTIDS) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }

    expect(dupes, 'Duplicate testid values').toEqual([]);
  });
});
