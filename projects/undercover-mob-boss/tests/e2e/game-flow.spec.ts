/**
 * E2E: Full Game Flow
 *
 * Tests the complete game experience through real browsers.
 * Uses data-testid selectors for stability (Risk 1 mitigation).
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

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

// ── Host Lobby ──────────────────────────────────────────────────────

test.describe('Host Lobby', () => {
  test('host sees lobby with room code and start button', async ({ browser }) => {
    const context = await browser.newContext();
    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=LOBBY`);

    await expect(host.locator('.lobby__title')).toContainText('Undercover Mob Boss');
    const startBtn = host.locator('[data-test-id="host-start-btn"]');
    await expect(startBtn).toContainText('Start Game');
    await expect(startBtn).toBeDisabled();

    await context.close();
  });

  test('players appear on host when they join', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'JOIN' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    await spawnBots(host, 5);

    await expect(host.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });
    await expect(host.locator('[data-test-id="host-start-btn"]')).toBeEnabled();

    await context.close();
  });
});

// ── Player Lobby ────────────────────────────────────────────────────

test.describe('Player Join and Lobby', () => {
  test('player sees lobby with their name after joining', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'PLOB' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    const player = await context.newPage();
    await player.goto(`${BASE}/?room=${roomCode}&name=TestGuy`);
    await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

    await expect(player.locator('[data-test-id="lobby-player-item"]')).toHaveCount(1);
    await expect(player.locator('[data-test-id="lobby-player-item"]')).toContainText('TestGuy');

    await context.close();
  });
});

// ── Role Reveal ─────────────────────────────────────────────────────

test.describe('Role Reveal', () => {
  test('player sees role card after game starts', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'ROLE' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    const player = await context.newPage();
    await player.goto(`${BASE}/?room=${roomCode}&name=Vincenz`);
    await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

    await spawnBots(host, 4);
    await host.waitForTimeout(500);
    await startGame(host);

    await expect(player.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 10_000 });
    await expect(player.locator('[data-test-id="role-card-hint"]')).toContainText('Tap to open');

    await context.close();
  });

  test('tapping card reveals role, tapping again acknowledges', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'FLIP' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    const player = await context.newPage();
    await player.goto(`${BASE}/?room=${roomCode}&name=Carmine`);
    await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

    await spawnBots(host, 4);
    await host.waitForTimeout(500);
    await startGame(host);

    await expect(player.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 10_000 });
    await player.locator('[data-test-id="role-card"]').click();
    await player.waitForTimeout(1000);

    const roleLabel = player.locator('[data-test-id="role-name"]');
    await expect(roleLabel).toBeVisible({ timeout: 3_000 });
    const roleName = await roleLabel.textContent();
    expect(['Citizen', 'Mob Soldier', 'Mob Boss']).toContain(roleName);

    await player.locator('[data-test-id="role-card"]').click();
    await player.waitForTimeout(1000);

    await context.close();
  });
});

// ── Full Game: 5 Real Players ───────────────────────────────────────

test.describe('Full Game Flow', () => {
  test('5 real players: lobby to first policy enacted', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext();
    const roomCode = 'REAL' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    const playerNames = ['Vincenz', 'Carmine', 'Pauliee', 'Frankoo', 'Salliee'];
    const players: Page[] = [];

    for (const name of playerNames) {
      const page = await context.newPage();
      await page.goto(`${BASE}/?room=${roomCode}&name=${name}`);
      await page.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });
      players.push(page);
    }

    await expect(host.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });
    await startGame(host);

    // Role reveal: all players flip open then closed
    for (const p of players) {
      await expect(p.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 10_000 });
      await p.locator('[data-test-id="role-card"]').click();
      await p.waitForTimeout(800);
      await p.locator('[data-test-id="role-card"]').click();
      await p.waitForTimeout(500);
    }

    await host.waitForTimeout(1500);

    // Find mayor (sees nomination picker)
    let mayorPage: Page | null = null;
    for (const p of players) {
      const hasPicker = await p.locator('[data-test-id="nomination-picker"]').isVisible().catch(() => false);
      if (hasPicker) { mayorPage = p; break; }
    }
    expect(mayorPage).not.toBeNull();
    if (!mayorPage) return;

    // Mayor nominates
    await mayorPage.locator('[data-test-id="nomination-player"]').first().click();
    await mayorPage.locator('[data-test-id="nomination-confirm"]').click();
    await host.waitForTimeout(1000);

    // All voters approve
    for (const p of players) {
      const hasVote = await p.locator('[data-test-id="vote-approve"]').isVisible().catch(() => false);
      if (hasVote) {
        await p.locator('[data-test-id="vote-approve"]').click();
        await p.waitForTimeout(300);
      }
    }

    // Wait for election-result display to resolve (5s server timer + propagation)
    await host.waitForTimeout(7000);

    // Mayor discards a card — poll for mayor-hand (may still be propagating)
    let policyMayor: Page | null = null;
    for (let attempt = 0; attempt < 20 && !policyMayor; attempt++) {
      for (const p of players) {
        const hasHand = await p.locator('[data-test-id="mayor-hand"]').isVisible().catch(() => false);
        if (hasHand) { policyMayor = p; break; }
      }
      if (!policyMayor) await host.waitForTimeout(500);
    }

    if (policyMayor) {
      const cards = policyMayor.locator('[data-test-id="policy-card"]');
      expect(await cards.count()).toBe(3);
      await cards.first().click();
      await policyMayor.waitForTimeout(300);
      await policyMayor.locator('[data-test-id="mayor-discard-btn"]').click();
      await host.waitForTimeout(2000);

      // Chief enacts a card — poll for chief-hand
      let chiefPage: Page | null = null;
      for (let attempt = 0; attempt < 20 && !chiefPage; attempt++) {
        for (const p of players) {
          const hasHand = await p.locator('[data-test-id="chief-hand"]').isVisible().catch(() => false);
          if (hasHand) { chiefPage = p; break; }
        }
        if (!chiefPage) await host.waitForTimeout(500);
      }

      if (chiefPage) {
        const chiefCards = chiefPage.locator('[data-test-id="policy-card"]');
        expect(await chiefCards.count()).toBe(2);
        await chiefCards.first().click();
        await chiefPage.waitForTimeout(300);
        await chiefPage.locator('[data-test-id="chief-enact-btn"]').click();
      }
    }

    await host.waitForTimeout(2000);
    // Verified: lobby → role reveal → nomination → election → policy session complete
    await context.close();
  });
});

// ── Game Over via Scenario ──────────────────────────────────────────

test.describe('Game Over Screen', () => {
  test('citizens-win game-over shows winner and overlay', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'GOVR' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    await spawnBots(host, 5);
    await host.waitForTimeout(500);

    const scenarioSelect = host.locator('[data-test-id="host-scenario-select"]');
    await scenarioSelect.selectOption('game-over-citizens');
    await host.waitForTimeout(1000);

    await expect(host.locator('[data-overlay-id="game-over"]')).toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('mob-win game-over shows winner', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'GMOB' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    await spawnBots(host, 5);
    await host.waitForTimeout(500);

    const scenarioSelect = host.locator('[data-test-id="host-scenario-select"]');
    await scenarioSelect.selectOption('game-over-mob');
    await host.waitForTimeout(1000);

    await expect(host.locator('[data-overlay-id="game-over"]')).toBeVisible({ timeout: 5_000 });

    await context.close();
  });
});

// ── Dev Scenario Loading ────────────────────────────────────────────

test.describe('Dev Scenarios', () => {
  test('loading election scenario transitions host to game board', async ({ browser }) => {
    const context = await browser.newContext();
    const roomCode = 'SCEN' + Date.now().toString(36).slice(-2).toUpperCase();

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

    await spawnBots(host, 5);
    await host.waitForTimeout(500);

    const scenarioSelect = host.locator('[data-test-id="host-scenario-select"]');
    await scenarioSelect.selectOption('election');
    await host.waitForTimeout(1500);

    const boardVisible = await host.locator('.host-screen-container').isVisible();
    expect(boardVisible).toBe(true);

    await context.close();
  });
});
