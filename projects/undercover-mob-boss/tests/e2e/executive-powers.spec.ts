/**
 * E2E: Executive Powers
 *
 * Uses dev scenarios to jump directly to each executive power phase,
 * then verifies the real player (mayor) can interact with the UI.
 *
 * Scenarios set players[0] as mayor, so the first-joined player
 * (or the first bot slot a real player takes over) is the mayor.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function setupScenario(
  browser: any,
  scenario: string,
): Promise<{ context: BrowserContext; host: Page; player: Page; roomCode: string }> {
  const context = await browser.newContext();
  const roomCode = scenario.toUpperCase().slice(0, 3) + Date.now().toString(36).slice(-3).toUpperCase();

  // Host
  const host = await context.newPage();
  await host.goto(`${BASE}/host?room=${roomCode}`);
  await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

  // Real player joins FIRST — will be players[0] = mayor in scenarios
  const player = await context.newPage();
  await player.goto(`${BASE}/?room=${roomCode}&name=Vincenz`);
  await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

  // Spawn 4 bots (need 5 total)
  const botSelect = host.locator('[data-test-id="host-bot-count"]');
  await botSelect.selectOption('4');
  await host.locator('[data-test-id="host-spawn-bots"]').click();

  // Wait for host to confirm 5 players before loading scenario
  await expect(host.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });

  // Load scenario
  const scenarioSelect = host.locator('[data-test-id="host-scenario-select"]');
  await scenarioSelect.selectOption(scenario);

  // Wait for player to leave lobby (confirms scenario state arrived)
  await player.waitForSelector('[data-test-id="lobby-player-list"]', { state: 'detached', timeout: 10_000 });

  return { context, host, player, roomCode };
}

test.describe('Executive Power: Investigation', () => {
  test('mayor sees investigation picker and can investigate a player', async ({ browser }) => {
    const { context, host, player } = await setupScenario(browser, 'investigation');

    // Mayor (Vincenz) should see the investigation player picker
    const picker = player.locator('[data-test-id="investigate-picker"]');
    await expect(picker).toBeVisible({ timeout: 10_000 });

    // Should see other players as selectable items
    const items = player.locator('[data-test-id="investigate-player"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Select first eligible player
    await items.first().click();
    await player.waitForTimeout(300);

    // Confirm investigation
    const confirmBtn = player.locator('[data-test-id="investigate-confirm"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Should transition to investigation result (card flip)
    await expect(
      player.locator('[data-test-id="investigation-card"]'),
    ).toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});

test.describe('Executive Power: Policy Peek', () => {
  test('mayor sees 3 peek cards and can acknowledge', async ({ browser }) => {
    const { context, host, player } = await setupScenario(browser, 'policy-peek');

    // Mayor should see peek cards
    const peekCards = player.locator('[data-test-id="peek-cards"]');
    await expect(peekCards).toBeVisible({ timeout: 10_000 });

    // Should have 3 policy cards
    const cards = player.locator('[data-test-id="peek-card"]');
    await expect(cards).toHaveCount(3, { timeout: 5_000 });

    // Acknowledge button
    const ackBtn = player.locator('[data-test-id="peek-confirm"]');
    await expect(ackBtn).toBeVisible();
    await ackBtn.click();

    // Should transition away from peek (to waiting or nomination)
    await expect(peekCards).not.toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});

test.describe('Executive Power: Special Nomination', () => {
  test('mayor sees nomination picker and can nominate next mayor', async ({ browser }) => {
    const { context, host, player } = await setupScenario(browser, 'special-nomination');

    // Mayor should see special nomination picker
    const picker = player.locator('[data-test-id="special-nominate-picker"]');
    await expect(picker).toBeVisible({ timeout: 10_000 });

    // Select a player
    const items = player.locator('[data-test-id="special-nominate-player"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await items.first().click();
    await player.waitForTimeout(300);

    // Confirm
    const confirmBtn = player.locator('[data-test-id="special-nominate-confirm"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Should transition to nomination phase (mayor changed)
    // Player should now be in waiting mode (no longer mayor after special nomination)
    const waitingMsg = player.locator('[data-test-id="waiting-message"]');
    await expect(waitingMsg).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});

test.describe('Executive Power: Execution', () => {
  test('mayor sees execution picker and can eliminate a player', async ({ browser }) => {
    const { context, host, player } = await setupScenario(browser, 'execution');

    // Mayor should see execution picker
    const picker = player.locator('[data-test-id="execute-picker"]');
    await expect(picker).toBeVisible({ timeout: 10_000 });

    // Select a player
    const items = player.locator('[data-test-id="execute-player"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await items.first().click();
    await player.waitForTimeout(300);

    // Confirm execution
    const confirmBtn = player.locator('[data-test-id="execute-confirm"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click({ force: true }); // GSAP entrance animation causes instability in WebKit

    // Should transition (nomination or game-over if boss was executed)
    await player.waitForTimeout(2000);
    // Game continues — verify we're not stuck
    const stillOnPicker = await picker.isVisible().catch(() => false);
    expect(stillOnPicker).toBe(false);

    await context.close();
  });
});
