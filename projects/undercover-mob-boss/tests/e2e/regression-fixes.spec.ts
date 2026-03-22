/**
 * E2E Regression Tests for bugs fixed in the 2026-03-19 session.
 *
 * Bug 3: Browser refresh race condition — join fires on 'connected' callback
 * Bug 4: Tablet font sizing — CSS clamp values bumped for iPad readability
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:5173';

// ── Shared Helpers ──────────────────────────────────────────────────

async function spawnBots(hostPage: Page, count: number): Promise<void> {
  const botSelect = hostPage.locator('[data-test-id="host-bot-count"], select').first();
  await botSelect.selectOption(String(count));
  await hostPage.locator('[data-test-id="host-spawn-bots"], button:has-text("+ Bots")').click();
  await hostPage.waitForTimeout(500);
}

async function startGame(hostPage: Page): Promise<void> {
  const startBtn = hostPage.locator('[data-test-id="host-start-btn"]');
  await expect(startBtn).toBeEnabled({ timeout: 5_000 });
  await startBtn.click();
  await hostPage.waitForSelector('.host-screen-container', { timeout: 5_000 });
}

async function loadScenario(page: Page, scenario: string): Promise<void> {
  const select = page.locator('[data-test-id="host-scenario-select"]');
  await select.selectOption(scenario);
  await page.waitForTimeout(2000);
}

// ══════════════════════════════════════════════════════════════════════
// BUG 3: Browser refresh race condition
// Fix: Host/player join fires on 'connected' callback, not setTimeout
// ══════════════════════════════════════════════════════════════════════

test.describe('Bug 3: Browser refresh reconnects correctly', () => {
  test('player reconnects after refresh during policy session', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'RFRSH' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    // Join a real player plus bots
    const player = await context.newPage();
    await player.goto(`${BASE}/?room=${roomCode}&name=Vincenz`);
    await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

    await spawnBots(host, 4);
    await host.waitForTimeout(500);
    await startGame(host);

    // Wait for role reveal
    await expect(player.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 10_000 });

    // Acknowledge role (tap twice — open then close)
    await player.locator('[data-test-id="role-card"]').click();
    await player.waitForTimeout(800);
    await player.locator('[data-test-id="role-card"]').click();
    await player.waitForTimeout(1500);

    // Player refreshes the browser
    await player.reload();

    // After refresh, player should reconnect and see the game (not a blank screen)
    // They should either see the role-reveal still or the nomination screen
    // depending on whether bots have acknowledged. The key assertion:
    // the page must NOT be blank/stuck on "Connecting..."
    await player.waitForTimeout(3000);

    // Check that either the lobby-based UI or game UI is visible (not a dead screen)
    const hasGameUI = await player.locator('[data-test-id="role-card"], [data-test-id="nomination-picker"], [data-test-id="vote-approve"], [data-test-id="lobby-player-list"], [data-test-id="waiting-message"]').first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasGameUI).toBe(true);

    await context.close();
  });

  test('player reconnects 3 times in a row without failure', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'RF3X' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    const player = await context.newPage();
    await player.goto(`${BASE}/?room=${roomCode}&name=Carmine`);
    await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

    await spawnBots(host, 4);
    await host.waitForTimeout(500);
    await startGame(host);

    // Wait for game to start
    await expect(player.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 10_000 });

    // Refresh 3 times in a row
    for (let i = 0; i < 3; i++) {
      await player.reload();
      await player.waitForTimeout(2000);

      // Verify the player can see some game UI each time (not a dead screen)
      const hasUI = await player.locator('[data-test-id="role-card"], [data-test-id="nomination-picker"], [data-test-id="vote-approve"], [data-test-id="lobby-player-list"], [data-test-id="waiting-message"]').first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasUI).toBe(true);
    }

    await context.close();
  });

  test('host reconnects after refresh and sees game board', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'HRFSH' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    await spawnBots(host, 5);
    await host.waitForTimeout(500);

    // Load a scenario to get into game state quickly
    await loadScenario(host, 'election');

    // Verify game board is visible
    await expect(host.locator('.host-screen-container')).toBeVisible({ timeout: 5_000 });

    // Refresh the host
    await host.reload();
    await host.waitForTimeout(3000);

    // After refresh, host should reconnect and see the game board (not blank)
    const hasBoardOrLobby = await host.locator('.host-screen-container').isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasBoardOrLobby).toBe(true);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════
// BUG 4: Tablet font sizing — CSS clamp values for iPad readability
// ══════════════════════════════════════════════════════════════════════

test.describe('Bug 4: Tablet font sizing meets minimum thresholds', () => {
  // iPad 10.2" landscape viewport
  const TABLET_VIEWPORT = { width: 1080, height: 810 };

  test('all text in #host-app is >= 10px at iPad viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: TABLET_VIEWPORT,
    });
    const host = await context.newPage();
    const roomCode = 'FONT' + Date.now().toString(36).slice(-2).toUpperCase();

    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    await spawnBots(host, 5);
    await host.waitForTimeout(500);

    // Load election scenario to get a rich game board with player strip
    await loadScenario(host, 'election');

    // Collect all visible text elements inside #host-app
    const textElements = await host.evaluate(() => {
      const hostApp = document.getElementById('host-app');
      if (!hostApp) return [];

      const results: Array<{ text: string; fontSize: number; className: string }> = [];
      const walker = document.createTreeWalker(
        hostApp,
        NodeFilter.SHOW_ELEMENT,
        null,
      );

      let node: Node | null = walker.currentNode;
      while (node) {
        const el = node as HTMLElement;
        const text = el.textContent?.trim() ?? '';
        // Leaf elements with visible text
        if (text && el.children.length === 0 && text.length < 200) {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden') {
            results.push({
              text: text.slice(0, 60),
              fontSize: parseFloat(styles.fontSize),
              className: el.className || el.tagName.toLowerCase(),
            });
          }
        }
        node = walker.nextNode();
      }
      return results;
    });

    // Every visible text element must be >= 10px
    const tooSmall = textElements.filter(el => el.fontSize < 10);
    if (tooSmall.length > 0) {
      console.log('Text elements below 10px:', JSON.stringify(tooSmall, null, 2));
    }
    expect(tooSmall).toHaveLength(0);

    await context.close();
  });

  test('player strip names are >= 13px at iPad viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: TABLET_VIEWPORT,
    });
    const host = await context.newPage();
    const roomCode = 'FNAM' + Date.now().toString(36).slice(-2).toUpperCase();

    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    await spawnBots(host, 5);
    await host.waitForTimeout(500);

    // Load election scenario to get player strip rendered
    await loadScenario(host, 'election');

    // Get font sizes of all player name elements
    const nameSizes = await host.evaluate(() => {
      const names = document.querySelectorAll('.player-strip__name');
      return Array.from(names).map(el => {
        const styles = window.getComputedStyle(el);
        return {
          text: el.textContent?.trim() ?? '',
          fontSize: parseFloat(styles.fontSize),
        };
      });
    });

    // Must have some player names
    expect(nameSizes.length).toBeGreaterThan(0);

    // Every player name must be >= 13px
    const tooSmall = nameSizes.filter(n => n.fontSize < 13);
    if (tooSmall.length > 0) {
      console.log('Player names below 13px:', JSON.stringify(tooSmall, null, 2));
    }
    expect(tooSmall).toHaveLength(0);

    await context.close();
  });

  test('no old clamp values remain in source CSS', async () => {
    // The old clamp values that were too small for tablet:
    // player-strip__name used clamp(0.7rem, ...) — now bumped to clamp(0.85rem, ...)
    // player-strip__badge used clamp(0.55rem, ...) — now bumped to clamp(0.65rem, ...)
    //
    // Verify the current source doesn't contain the dangerous old minimums.
    // This is a source-level grep, not a runtime check.
    const boardCssPath = path.resolve('src/client/host/styles/board.css');
    const css = fs.readFileSync(boardCssPath, 'utf-8');

    // Old dangerous clamp floors for player names: 0.7rem or smaller
    // Current fix should use 0.85rem minimum for names
    const nameRule = css.match(/\.player-strip__name\s*\{[^}]*font-size:\s*clamp\(([^,]+),/);
    if (nameRule) {
      const minValue = parseFloat(nameRule[1]);
      // The minimum should be at least 0.8rem (i.e., >= ~12.8px at default 16px root)
      expect(minValue).toBeGreaterThanOrEqual(0.8);
    }

    // Old dangerous clamp floors for badges: 0.55rem
    // Current fix should use 0.65rem minimum
    const badgeRule = css.match(/\.player-strip__badge\s*\{[^}]*font-size:\s*clamp\(([^,]+),/);
    if (badgeRule) {
      const minValue = parseFloat(badgeRule[1]);
      expect(minValue).toBeGreaterThanOrEqual(0.6);
    }
  });
});
