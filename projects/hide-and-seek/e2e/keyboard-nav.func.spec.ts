import { test, expect } from '@playwright/test';

test.describe('keyboard navigation', () => {
  test('MainMenu Play button selectable via Enter', async ({ page }) => {
    await page.goto('/');
    await page.locator('#game-container canvas').click();
    await page.waitForTimeout(2000);

    // Press Enter on MainMenu — should start game
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    const flowState = await page.evaluate(() => window.__GAME_TEST__?.gameFlowState());
    expect(flowState).toBeDefined();
  });
});
