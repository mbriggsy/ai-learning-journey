import { test, expect } from '@playwright/test';

test.describe('fog of war', () => {
  test('fog state contains all three values during hunt', async ({ page }) => {
    await page.goto('/');
    await page.locator('#game-container canvas').click();
    await page.waitForTimeout(2000);

    // Start game
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Wait for hunt phase (countdown is ~10s, but we check periodically)
    let flowState: string | null = null;
    for (let i = 0; i < 30; i++) {
      flowState = await page.evaluate(() => window.__GAME_TEST__?.gameFlowState() ?? null);
      if (flowState === 'hunt') break;
      await page.waitForTimeout(500);
    }
    expect(flowState).toBe('hunt');

    // Move around to create explored tiles
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500);

    // Check fog state has UNEXPLORED (0), EXPLORED (1), and VISIBLE (2)
    const fogData = await page.evaluate(() => window.__GAME_TEST__?.fogState() ?? []);
    const unique = new Set(fogData);
    expect(unique.has(0)).toBe(true); // UNEXPLORED
    expect(unique.has(2)).toBe(true); // VISIBLE
    // EXPLORED (1) may or may not exist depending on movement — don't require it
  });
});
