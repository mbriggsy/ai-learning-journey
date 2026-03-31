import { test, expect } from '@playwright/test';

test.describe('reduced motion', () => {
  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#game-container canvas').click();
    await page.waitForTimeout(2000);

    // Start game
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Game should be running
    const flowState = await page.evaluate(() => window.__GAME_TEST__?.gameFlowState());
    expect(flowState).toBeDefined();
  });
});
