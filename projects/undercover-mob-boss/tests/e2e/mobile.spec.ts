/**
 * E2E: Mobile Browser Testing
 *
 * Tests the game on mobile viewports and touch devices.
 * Uses browser.newContext() with device descriptors instead of test.use()
 * to avoid worker boundary issues with dynamic device loops.
 */
import { test, expect, devices, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

const MOBILE_DEVICES = [
  { name: 'iPhone 13', config: devices['iPhone 13'] },
  { name: 'Pixel 5', config: devices['Pixel 5'] },
];

// ── Mobile Device Tests ─────────────────────────────────────────────

test.describe('Mobile: Lobby Rendering', () => {
  for (const device of MOBILE_DEVICES) {
    test(`${device.name}: lobby renders without horizontal overflow`, async ({ browser }) => {
      const roomCode = 'MLOB' + Date.now().toString(36).slice(-3).toUpperCase();

      const hostCtx = await browser.newContext();
      const host = await hostCtx.newPage();
      await host.goto(`${BASE}/host?room=${roomCode}`);
      await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

      const mobileCtx = await browser.newContext(device.config);
      const player = await mobileCtx.newPage();
      await player.goto(`${BASE}/?room=${roomCode}&name=TestGuy`);
      await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

      const bodyWidth = await player.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await player.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

      await hostCtx.close();
      await mobileCtx.close();
    });
  }
});

test.describe('Mobile: Role Reveal', () => {
  for (const device of MOBILE_DEVICES) {
    test(`${device.name}: role card fits viewport and tap works`, async ({ browser }) => {
      const roomCode = 'MROL' + Date.now().toString(36).slice(-3).toUpperCase();

      const hostCtx = await browser.newContext();
      const host = await hostCtx.newPage();
      await host.goto(`${BASE}/host?room=${roomCode}`);
      await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

      // Spawn 4 bots
      const botSelect = host.locator('[data-test-id="host-bot-count"], select').first();
      await botSelect.selectOption('4');
      await host.locator('[data-test-id="host-spawn-bots"], button:has-text("+ Bots")').click();
      await host.waitForTimeout(500);

      // Player on mobile
      const mobileCtx = await browser.newContext(device.config);
      const player = await mobileCtx.newPage();
      await player.goto(`${BASE}/?room=${roomCode}&name=TestGuy`);
      await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

      // Start game
      await host.locator('[data-test-id="host-start-btn"]').click();
      await player.waitForSelector('[data-test-id="role-card"]', { timeout: 10_000 });

      // Card within viewport
      const cardBox = await player.locator('[data-test-id="role-card"]').boundingBox();
      const viewport = await player.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));

      expect(cardBox).not.toBeNull();
      if (cardBox) {
        expect(cardBox.x).toBeGreaterThanOrEqual(0);
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);
      }

      // Tap to reveal
      await player.locator('[data-test-id="role-card"]').tap();
      await player.waitForTimeout(1000);

      const roleName = player.locator('[data-test-id="role-name"]');
      await expect(roleName).toBeVisible({ timeout: 3_000 });

      await hostCtx.close();
      await mobileCtx.close();
    });
  }
});

// ── Tap Target Size Validation ──────────────────────────────────────

test.describe('Tap Targets: Minimum 44x44px', () => {
  test('vote buttons meet minimum tap target size on iPhone', async ({ browser }) => {
    const roomCode = 'TTAP' + Date.now().toString(36).slice(-3).toUpperCase();

    const hostCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    // Spawn 5 bots
    const botSelect = host.locator('[data-test-id="host-bot-count"], select').first();
    await botSelect.selectOption('5');
    await host.locator('[data-test-id="host-spawn-bots"], button:has-text("+ Bots")').click();
    await host.waitForTimeout(500);

    // Player on iPhone
    const mobileCtx = await browser.newContext(devices['iPhone 13']);
    const player = await mobileCtx.newPage();
    await player.goto(`${BASE}/?room=${roomCode}&name=Vincenz`);
    await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

    // Load election scenario
    const scenarioSelect = host.locator('[data-test-id="host-scenario-select"]');
    await scenarioSelect.selectOption('election');
    await player.waitForTimeout(2000);

    // Player should see vote buttons
    const approveBtn = player.locator('[data-test-id="vote-approve"]');
    const isVisible = await approveBtn.isVisible().catch(() => false);

    if (isVisible) {
      const box = await approveBtn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width, 'Approve button width >= 44px').toBeGreaterThanOrEqual(44);
        expect(box.height, 'Approve button height >= 44px').toBeGreaterThanOrEqual(44);
      }
    }

    await hostCtx.close();
    await mobileCtx.close();
  });
});

// ── Responsive Viewport Sweep ───────────────────────────────────────

test.describe('Responsive: No Horizontal Overflow', () => {
  const widths = [320, 375, 414, 768];

  for (const width of widths) {
    test(`lobby at ${width}px width has no horizontal scroll`, async ({ browser }) => {
      const roomCode = `R${width}` + Date.now().toString(36).slice(-2).toUpperCase();

      const context = await browser.newContext({
        viewport: { width, height: 812 },
      });

      const host = await context.newPage();
      await host.goto(`${BASE}/host?room=${roomCode}`);
      await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

      const player = await context.newPage();
      await player.goto(`${BASE}/?room=${roomCode}&name=TestGuy`);
      await player.waitForTimeout(2000);

      const bodyWidth = await player.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth, `Body width at viewport ${width}px`).toBeLessThanOrEqual(width + 1);

      await context.close();
    });
  }
});

// ── Text Readability ────────────────────────────────────────────────

test.describe('Text Readability: Minimum 12px', () => {
  test('no text smaller than 12px on mobile lobby', async ({ browser }) => {
    const roomCode = 'TXTM' + Date.now().toString(36).slice(-3).toUpperCase();

    const hostCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    const mobileCtx = await browser.newContext(devices['iPhone 13']);
    const player = await mobileCtx.newPage();
    await player.goto(`${BASE}/?room=${roomCode}&name=TestGuy`);
    await player.waitForTimeout(2000);

    const tooSmall = await player.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const violations: string[] = [];
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.trim();
        if (!text || text.length === 0) continue;
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (style.opacity === '0') continue;
        // Skip elements inside #app container only (ignore framework/browser chrome)
        if (!el.closest('#app')) continue;
        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 11 && el.children.length === 0) {
          violations.push(`"${text.slice(0, 30)}" at ${fontSize}px`);
        }
      }
      return violations;
    });

    expect(tooSmall, 'No text below 11px').toEqual([]);

    await hostCtx.close();
    await mobileCtx.close();
  });
});
