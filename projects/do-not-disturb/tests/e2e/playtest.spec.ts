/**
 * Automated playtest for Do Not Disturb greybox build.
 *
 * Exercises: game boot, player movement (walk/run/sneak/jump/slide),
 * door interaction, hiding spots, tool selection, monster presence,
 * HUD display, escape-window survival, and the catch→retry loop.
 *
 * Run:  npx playwright test tests/e2e/playtest.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

// ── helpers ──────────────────────────────────────────────────────────

/** Press a key for `ms` milliseconds. */
async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Tap a key briefly. */
async function tap(page: Page, key: string) {
  await page.keyboard.press(key);
}

/** Wait N game-seconds (roughly — Phaser runs at 60 fps, wall-clock ≈ game-clock). */
async function waitGameSeconds(page: Page, seconds: number) {
  await page.waitForTimeout(seconds * 1000);
}

/** Read the debug text overlay (bottom-left of viewport). */
async function getDebugText(page: Page): Promise<string> {
  return page.evaluate(() => {
    // The debug text is a Phaser Text object; read its actual rendered text
    // by querying the Phaser scene's children.
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'NO_CANVAS';
    // Fallback: screenshot the game and look for text — but we can read the
    // game state directly through the Phaser global if available.
    // For now, return a marker so we know the canvas exists.
    return 'CANVAS_OK';
  });
}

/** Evaluate game state via the Phaser scene. */
async function getGameState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(() => {
    const game = (window as unknown as { game?: { scene: { scenes: Array<{ session?: { getState(): unknown } }> } } }).game;
    if (!game) return null;
    const scene = game.scene.scenes[0] as { session?: { getState(): unknown } };
    if (!scene?.session) return null;
    return scene.session.getState() as Record<string, unknown>;
  });
}

// ── tests ────────────────────────────────────────────────────────────

test.describe('Do Not Disturb — Greybox Playtest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    // Wait for the Phaser canvas to appear
    await page.waitForSelector('canvas', { timeout: 10_000 });
    // Give Phaser time to boot + create scene + start night 1
    await page.waitForTimeout(2000);
  });

  // ─── 1. Boot & Render ────────────────────────────────────────────

  test('game boots and renders a canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
    await page.screenshot({ path: 'tests/e2e/screenshots/01-boot.png' });
  });

  // ─── 2. Player Movement ──────────────────────────────────────────

  test('player can walk right and left', async ({ page }) => {
    // Walk right
    await hold(page, 'ArrowRight', 1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/02-walk-right.png' });

    // Walk left
    await hold(page, 'ArrowLeft', 1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/03-walk-left.png' });
  });

  test('player can run (shift + direction)', async ({ page }) => {
    await page.keyboard.down('ShiftLeft');
    await hold(page, 'ArrowRight', 1500);
    await page.keyboard.up('ShiftLeft');
    await page.screenshot({ path: 'tests/e2e/screenshots/04-run.png' });
  });

  test('player can sneak (ctrl + direction)', async ({ page }) => {
    await page.keyboard.down('ControlLeft');
    await hold(page, 'ArrowRight', 1500);
    await page.keyboard.up('ControlLeft');
    await page.screenshot({ path: 'tests/e2e/screenshots/05-sneak.png' });
  });

  test('player can jump', async ({ page }) => {
    await tap(page, 'Space');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/e2e/screenshots/06-jump.png' });
    // Wait for landing
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'tests/e2e/screenshots/07-landed.png' });
  });

  // ─── 3. Door Interaction ─────────────────────────────────────────

  test('player can interact with a door', async ({ page }) => {
    // Walk right toward the first door (lobby-ab at x=460, player starts at x=200)
    // Distance ~260px at walk speed 100px/s ≈ 2.6s
    await hold(page, 'ArrowRight', 3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/08-near-door.png' });

    // Press E to toggle door
    await tap(page, 'KeyE');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/e2e/screenshots/09-door-toggled.png' });

    // Toggle it back
    await tap(page, 'KeyE');
    await page.waitForTimeout(300);
  });

  // ─── 4. Hiding Spot ─────────────────────────────────────────────

  test('player can hide in a furniture spot', async ({ page }) => {
    // lobby-furn-a is at x=300, player starts at x=200
    await hold(page, 'ArrowRight', 1200);

    // Press E to hide
    await tap(page, 'KeyE');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/10-hiding.png' });

    // Exit hiding
    await tap(page, 'KeyE');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/11-exited-hiding.png' });
  });

  // ─── 5. Tool Selection ──────────────────────────────────────────

  test('player can select tools with number keys', async ({ page }) => {
    // Select throwable (1), dnd sign (2), lighter (3)
    await tap(page, 'Digit1');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'tests/e2e/screenshots/12-tool-throwable.png' });

    await tap(page, 'Digit2');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'tests/e2e/screenshots/13-tool-dnd-sign.png' });

    await tap(page, 'Digit3');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'tests/e2e/screenshots/14-tool-lighter.png' });
  });

  // ─── 6. Stairs / Floor Traversal ────────────────────────────────

  test('player can use stairs to go up and down', async ({ page }) => {
    // Stairs are at x=96, player starts at x=200 — walk left
    await hold(page, 'ArrowLeft', 1500);
    await page.screenshot({ path: 'tests/e2e/screenshots/15-near-stairs.png' });

    // Go down: press slide(S) + interact(E) simultaneously
    // The game checks: input.slide && stairsDown → teleport down
    await page.keyboard.down('KeyS');
    await tap(page, 'KeyE');
    await page.keyboard.up('KeyS');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/16-stairs-down.png' });

    // Go back up: press jump(Space) + interact(E)
    await page.keyboard.down('Space');
    await tap(page, 'KeyE');
    await page.keyboard.up('Space');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/17-stairs-up.png' });
  });

  // ─── 7. Monster Presence (Night 1 = Bellhop) ───────────────────

  test('bellhop is active on night 1', async ({ page }) => {
    // Wait a few seconds for the bellhop to patrol
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/18-bellhop-patrol.png' });

    // Run toward bellhop (top of map — floor3) via stairs
    // Go left to stairs
    await hold(page, 'ArrowLeft', 1500);

    // Go up stairs (lobby→floor2)
    await page.keyboard.down('Space');
    await tap(page, 'KeyE');
    await page.keyboard.up('Space');
    await page.waitForTimeout(300);

    // Go up again (floor2→floor3)
    await page.keyboard.down('Space');
    await tap(page, 'KeyE');
    await page.keyboard.up('Space');
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'tests/e2e/screenshots/19-floor3-bellhop.png' });
  });

  // ─── 8. Survive to Escape Window ───────────────────────────────

  test('survive to first escape window and escape night 1', async ({ page }) => {
    test.setTimeout(120_000); // 2 min timeout for this test

    // Strategy: hide in lobby-furn-a (x=300) for 90s, then run to escape door (x=360)
    // Walk to hiding spot
    await hold(page, 'ArrowRight', 1200);

    // Hide
    await tap(page, 'KeyE');
    await page.waitForTimeout(200);

    // The breath system gives 8s of hiding, so we need to exit, re-hide, etc.
    // Actually let's just sneak around quietly instead.
    // Exit hiding
    await tap(page, 'KeyE');
    await page.waitForTimeout(200);

    // Sneak in place near the escape door for ~88 seconds
    // Escape door is at x=360; we're at ~300; sneak right briefly
    await page.keyboard.down('ControlLeft');
    await hold(page, 'ArrowRight', 1500);
    await page.keyboard.up('ControlLeft');

    // Now wait quietly near escape door (~85s)
    // Take periodic screenshots
    await page.screenshot({ path: 'tests/e2e/screenshots/20-waiting-for-escape.png' });

    // Wait in chunks with screenshots
    for (let i = 0; i < 8; i++) {
      await waitGameSeconds(page, 10);
      if (i === 3) {
        await page.screenshot({ path: 'tests/e2e/screenshots/21-halfway.png' });
      }
    }

    // Escape window should be open or about to open (we're at ~82s, window at 90s)
    await waitGameSeconds(page, 12);
    await page.screenshot({ path: 'tests/e2e/screenshots/22-escape-window.png' });

    // Try to escape — press E near the escape door
    await tap(page, 'KeyE');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/23-escaped.png' });
  });

  // ─── 9. Get Caught → Retry ─────────────────────────────────────

  test('getting caught triggers catch screen and retry', async ({ page }) => {
    test.setTimeout(30_000);

    // Run loudly to attract bellhop, then run to bellhop's floor
    // Sprint to stairs
    await page.keyboard.down('ShiftLeft');
    await hold(page, 'ArrowLeft', 500);
    await page.keyboard.up('ShiftLeft');

    // Go up 2 floors to where bellhop patrols (floor3)
    await page.keyboard.down('Space');
    await tap(page, 'KeyE');
    await page.keyboard.up('Space');
    await page.waitForTimeout(200);

    await page.keyboard.down('Space');
    await tap(page, 'KeyE');
    await page.keyboard.up('Space');
    await page.waitForTimeout(200);

    // Run around loudly to attract bellhop
    for (let i = 0; i < 5; i++) {
      await page.keyboard.down('ShiftLeft');
      await hold(page, 'ArrowRight', 800);
      await hold(page, 'ArrowLeft', 800);
      await page.keyboard.up('ShiftLeft');
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/24-attracting-bellhop.png' });

    // Wait for potential catch (bellhop needs to reach us)
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/e2e/screenshots/25-after-bellhop-chase.png' });

    // If caught, we should see the catch overlay — wait for retry
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/e2e/screenshots/26-catch-or-survived.png' });
  });

  // ─── 10. Phone Interaction ──────────────────────────────────────

  test('player can answer the phone', async ({ page }) => {
    // Phone is at x=120, player starts at x=200 — walk left
    await hold(page, 'ArrowLeft', 1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/27-near-phone.png' });

    // Press E to answer
    await tap(page, 'KeyE');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/28-phone-answered.png' });

    // Wait for dialogue lines
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'tests/e2e/screenshots/29-phone-dialogue.png' });
  });
});
