/**
 * E2E: Veto Flow
 *
 * Uses the 'veto' dev scenario to test both veto-accepted and veto-rejected
 * paths through the browser UI.
 *
 * Scenario state: 5 bad policies enacted, commissioner has [bad, good],
 * players[0] = mayor, players[1] = commissioner.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function setupVetoScenario(
  browser: any,
): Promise<{ context: BrowserContext; host: Page; mayor: Page; commissioner: Page; roomCode: string }> {
  const context = await browser.newContext();
  const roomCode = 'VETO' + Date.now().toString(36).slice(-3).toUpperCase();

  // Host
  const host = await context.newPage();
  await host.goto(`${BASE}/host?room=${roomCode}`);
  await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 10_000 });

  // Mayor (players[0]) — joins first
  const mayor = await context.newPage();
  await mayor.goto(`${BASE}/?room=${roomCode}&name=Vincenz`);
  await mayor.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

  // Commissioner (players[1]) — joins second
  const commissioner = await context.newPage();
  await commissioner.goto(`${BASE}/?room=${roomCode}&name=Carmine`);
  await commissioner.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });

  // Spawn 3 more bots (need 5 total)
  const botSelect = host.locator('[data-test-id="host-bot-count"]').first();
  await botSelect.selectOption('3');
  await host.locator('[data-test-id="host-spawn-bots"]').click();
  await host.waitForTimeout(500);

  // Load veto scenario — commissioner (players[1] = Carmine) has cards
  const scenarioSelect = host.locator('[data-test-id="host-scenario-select"]').last();
  await scenarioSelect.selectOption('veto');
  await host.waitForTimeout(1500);

  return { context, host, mayor, commissioner, roomCode };
}

test.describe('Veto: Accept Path', () => {
  test('commissioner proposes veto, mayor accepts → cards discarded', async ({ browser }) => {
    const { context, commissioner, mayor, host } = await setupVetoScenario(browser);

    // Commissioner should see 2 policy cards + veto button
    const commissionerHand = commissioner.locator('[data-test-id="commissioner-hand"]');
    await expect(commissionerHand).toBeVisible({ timeout: 10_000 });

    const vetoBtn = commissioner.locator('[data-test-id="commissioner-veto-btn"]');
    await expect(vetoBtn).toBeVisible();
    await expect(vetoBtn).toContainText('Propose Veto');

    // Commissioner proposes veto
    await vetoBtn.click();
    await commissioner.waitForTimeout(1000);

    // Mayor should see veto response screen (accept/reject)
    const acceptBtn = mayor.locator('[data-test-id="veto-accept"]');
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 });

    const rejectBtn = mayor.locator('[data-test-id="veto-reject"]');
    await expect(rejectBtn).toBeVisible();

    // Mayor accepts
    await acceptBtn.click();
    await mayor.waitForTimeout(2000);

    // Game should transition (veto enacted, next nomination)
    // Mayor should not still be on veto screen
    await expect(acceptBtn).not.toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});

test.describe('Veto: Reject Path', () => {
  test('commissioner proposes veto, mayor rejects → commissioner must enact', async ({ browser }) => {
    const { context, commissioner, mayor, host } = await setupVetoScenario(browser);

    // Commissioner sees hand + veto button
    const commissionerHand = commissioner.locator('[data-test-id="commissioner-hand"]');
    await expect(commissionerHand).toBeVisible({ timeout: 10_000 });

    const vetoBtn = commissioner.locator('[data-test-id="commissioner-veto-btn"]');
    await vetoBtn.click();
    await commissioner.waitForTimeout(1000);

    // Mayor rejects
    const rejectBtn = mayor.locator('[data-test-id="veto-reject"]');
    await expect(rejectBtn).toBeVisible({ timeout: 10_000 });
    await rejectBtn.click();
    await mayor.waitForTimeout(1500);

    // Commissioner should be back to policy hand — must enact
    const commissionerHandAgain = commissioner.locator('[data-test-id="commissioner-hand"]');
    await expect(commissionerHandAgain).toBeVisible({ timeout: 10_000 });

    // Commissioner selects and enacts a card
    const cards = commissioner.locator('[data-test-id="policy-card"]');
    await cards.first().click();
    await commissioner.waitForTimeout(300);

    const enactBtn = commissioner.locator('[data-test-id="commissioner-enact-btn"]');
    await expect(enactBtn).toBeEnabled();
    await enactBtn.click();

    // Game should continue
    await commissioner.waitForTimeout(2000);
    await expect(commissionerHandAgain).not.toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});
