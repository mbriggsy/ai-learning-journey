import { test, expect } from '@playwright/test';

test.describe('found moment', () => {
  test('triggerFound transitions through sequence to Results', async ({ page }) => {
    await page.goto('/');
    await page.locator('#game-container canvas').click();
    await page.waitForTimeout(2000);

    // Start game
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Wait for hunt phase
    let flowState: string | null = null;
    for (let i = 0; i < 30; i++) {
      flowState = await page.evaluate(() => window.__GAME_TEST__?.gameFlowState() ?? null);
      if (flowState === 'hunt') break;
      await page.waitForTimeout(500);
    }
    expect(flowState).toBe('hunt');

    // Trigger found via TestBridge
    await page.evaluate(() => window.__GAME_TEST__?.triggerFound());
    await page.waitForTimeout(500);

    // Game flow should be 'found'
    const newState = await page.evaluate(() => window.__GAME_TEST__?.gameFlowState());
    expect(newState).toBe('found');
  });
});
