import { test, expect } from '@playwright/test';

test.describe('found moment', () => {
  test('game reaches hunt phase and tracks flow state', async ({ page }) => {
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

    // Verify TestBridge exposes game flow state during hunt
    const cameraState = await page.evaluate(() => window.__GAME_TEST__?.cameraState());
    expect(cameraState).toBeDefined();
    expect(cameraState!.zoom).toBe(2);
  });
});
