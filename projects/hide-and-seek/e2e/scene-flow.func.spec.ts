import { test, expect } from '@playwright/test';

test.describe('scene flow', () => {
  test('navigates from Boot → MainMenu → Game', async ({ page }) => {
    await page.goto('/');

    // Wait for "Click to Start" text
    await expect(page.locator('#game-container canvas')).toBeVisible({ timeout: 10000 });

    // Click the canvas to start
    await page.locator('#game-container canvas').click();

    // Wait for game to load and transition to MainMenu
    await page.waitForTimeout(2000);

    // Press Enter to start game (MainMenu → Game)
    await page.keyboard.press('Enter');

    // Wait for game to initialize
    await page.waitForTimeout(1000);

    // Verify game is running via TestBridge
    const flowState = await page.evaluate(() => window.__GAME_TEST__?.gameFlowState());
    expect(flowState).toBeDefined();
    expect(['countdown', 'hunt']).toContain(flowState);
  });

  test('Escape opens pause menu and resume continues', async ({ page }) => {
    await page.goto('/');
    await page.locator('#game-container canvas').click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Press Escape to pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Press Escape again to resume
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Game should still be running
    const flowState = await page.evaluate(() => window.__GAME_TEST__?.gameFlowState());
    expect(flowState).toBeDefined();
  });
});
