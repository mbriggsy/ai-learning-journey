import { test, expect } from '@playwright/test';

test.describe('survived moment', () => {
  test('game reaches hunt phase with fog state available', async ({ page }) => {
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

    // Verify fog state is exposed and contains data
    const fogData = await page.evaluate(() => window.__GAME_TEST__?.fogState() ?? []);
    expect(fogData.length).toBeGreaterThan(0);
  });
});
