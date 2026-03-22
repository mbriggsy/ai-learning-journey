/**
 * VISUAL AUDIT: Comprehensive screenshot + automated check suite.
 *
 * Captures every possible screen state on:
 *   - Player phone (iPhone 13: 390x844)
 *   - Host tablet  (iPad 10.2" landscape: 1080x810)
 *
 * For each screenshot, runs automated visual checks:
 *   1. No horizontal overflow (body.scrollWidth <= viewport width)
 *   2. No truncated content in overflow:hidden containers
 *   3. Minimum font sizes (12px phone, 14px tablet)
 *   4. Minimum button tap targets (44x44)
 *   5. No pure-white backgrounds (noir game)
 *   6. No elements positioned off-screen
 *
 * Run: npx playwright test tests/e2e/visual-audit.spec.ts --project=chromium
 *
 * Output: test-results/visual-audit/{phone,tablet}/*.png + AUDIT-REPORT.txt
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:5173';
const SCREENSHOT_BASE = path.resolve('test-results/visual-audit');
const PHONE_DIR = path.join(SCREENSHOT_BASE, 'phone');
const TABLET_DIR = path.join(SCREENSHOT_BASE, 'tablet');

const PHONE_VIEWPORT = { width: 390, height: 844 };
const TABLET_VIEWPORT = { width: 1080, height: 810 };

// ── Issue tracking ───────────────────────────────────────────────────

interface UIIssue {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  device: 'phone' | 'tablet';
  screen: string;
  description: string;
}

const allIssues: UIIssue[] = [];

function report(
  severity: UIIssue['severity'],
  device: UIIssue['device'],
  screen: string,
  description: string,
): void {
  allIssues.push({ severity, device, screen, description });
}

// ── Helpers ──────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

async function snap(page: Page, dir: string, name: string): Promise<void> {
  ensureDir(dir);
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: true,
  });
}

async function spawnBots(page: Page, count: number): Promise<void> {
  const botSelect = page.locator('[data-test-id="host-bot-count"]');
  await botSelect.selectOption(String(count));
  await page.locator('[data-test-id="host-spawn-bots"]').click();
  await page.waitForTimeout(1000);
}

async function loadScenario(host: Page, scenario: string): Promise<void> {
  const select = host.locator('[data-test-id="host-scenario-select"]');
  await select.waitFor({ state: 'visible', timeout: 5_000 });
  await select.selectOption(scenario);
  // Wait for scenario to process and state to propagate
  await host.waitForTimeout(2500);
}

async function resetToLobby(host: Page, ...players: Page[]): Promise<void> {
  // Try DEV RESET first, then force-click through overlays if needed
  const resetBtn = host.locator('button:has-text("DEV RESET")');
  if (await resetBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await resetBtn.click();
    await host.waitForTimeout(1000);
  } else {
    // DEV RESET may be hidden behind game-over overlay
    const overlay = host.locator('[data-overlay-id="game-over"]');
    if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
      const playAgain = host.locator('button:has-text("Play Again")');
      if (await playAgain.isVisible({ timeout: 500 }).catch(() => false)) {
        await playAgain.click();
        await host.waitForTimeout(1000);
      } else {
        await resetBtn.click({ force: true }).catch(() => {});
        await host.waitForTimeout(1000);
      }
    }
  }

  // Dismiss any lingering host overlays (power-overlay, game-over, etc.)
  await host.evaluate(() => {
    const overlays = document.getElementById('host-overlays');
    if (overlays) {
      while (overlays.firstChild) overlays.removeChild(overlays.firstChild);
    }
  });
  await host.waitForTimeout(300);

  // Reconnect player pages — after DEV RESET their connections are stale
  if (players.length > 0) {
    // Extract room code from host URL
    const hostUrl = new URL(host.url());
    const room = hostUrl.searchParams.get('room') ?? '';
    const names = ['Vincenz', 'Carmine'];
    for (let i = 0; i < players.length; i++) {
      const name = names[i] ?? `Player${i + 1}`;
      await players[i].goto(`${BASE}/?room=${room}&name=${name}`);
      await players[i].waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 }).catch(() => {});
    }
    await host.waitForTimeout(500);
  }

  // After reset, bots may have been purged — re-spawn if player count is low
  const countEl = host.locator('[data-test-id="host-player-count"]');
  const countText = await countEl.textContent({ timeout: 2_000 }).catch(() => '');
  const currentCount = parseInt(countText?.match(/(\d+)\s*\//)?.[1] ?? '0', 10);
  if (currentCount < 5) {
    const needed = 5 - currentCount;
    if (needed > 0) await spawnBots(host, needed);
    await host.locator('[data-test-id="host-player-count"]')
      .filter({ hasText: '5 / 10' })
      .waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  }
}

// ── Automated visual checks ──────────────────────────────────────────

/**
 * Check 1: No horizontal overflow (body.scrollWidth <= viewport width).
 */
async function checkNoOverflow(
  page: Page,
  device: UIIssue['device'],
  screen: string,
): Promise<void> {
  const { bw, vw } = await page.evaluate(() => ({
    bw: document.body.scrollWidth,
    vw: window.innerWidth,
  }));
  if (bw > vw + 1) {
    report(
      'CRITICAL',
      device,
      screen,
      `Horizontal overflow: body.scrollWidth=${bw}px > viewport=${vw}px (+${bw - vw}px)`,
    );
  }
}

/**
 * Check 2: No element with overflow:hidden that has scrollWidth > clientWidth
 *           (truncated content).
 */
async function checkTruncatedContent(
  page: Page,
  device: UIIssue['device'],
  screen: string,
): Promise<void> {
  const hits = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement)) continue;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      // Check overflow:hidden containers with clipped content
      if (
        (s.overflow === 'hidden' || s.overflowX === 'hidden') &&
        el.scrollWidth > el.clientWidth + 2
      ) {
        const text = el.textContent?.trim().slice(0, 50) ?? '';
        if (text.length > 0) {
          out.push(
            `"${text}" (${el.className.split(' ')[0] || el.tagName}) scrollW=${el.scrollWidth} clientW=${el.clientWidth}`,
          );
        }
      }
    }
    return out;
  });
  for (const h of hits) {
    report('MAJOR', device, screen, `Truncated content: ${h}`);
  }
}

/**
 * Check 3: All text elements have fontSize >= minPx.
 *           Phone: 12px, Tablet: 14px.
 */
async function checkTextSizes(
  page: Page,
  device: UIIssue['device'],
  screen: string,
  minPx: number,
): Promise<void> {
  const appSelector = device === 'phone' ? '#app' : '#host-app';
  const hits = await page.evaluate(
    ({ selector, min }: { selector: string; min: number }) => {
      const root = document.querySelector(selector);
      if (!root) return [];
      const out: string[] = [];
      for (const el of root.querySelectorAll('*')) {
        if (!(el instanceof HTMLElement)) continue;
        const t = el.textContent?.trim();
        if (!t || el.children.length > 0) continue;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const fs = parseFloat(s.fontSize);
        if (fs < min) {
          out.push(`"${t.slice(0, 40)}" at ${fs.toFixed(1)}px (min: ${min}px) [${el.className.split(' ')[0] || el.tagName}]`);
        }
      }
      return out;
    },
    { selector: appSelector, min: minPx },
  );
  for (const h of hits) {
    report('MAJOR', device, screen, `Small text: ${h}`);
  }
}

/**
 * Check 4: All buttons have width >= 44 && height >= 44 (tap targets).
 */
async function checkTapTargets(
  page: Page,
  device: UIIssue['device'],
  screen: string,
): Promise<void> {
  const hits = await page.evaluate(() => {
    const out: string[] = [];
    // Dev-only button text to skip (not player-facing)
    const DEV_SKIP = ['\u00d7', '+ Bots', 'DEV RESET', 'DEV'];
    for (const btn of document.querySelectorAll(
      'button, [role="button"], .action-btn, .vote-card, .policy-card--selectable',
    )) {
      if (!(btn instanceof HTMLElement)) continue;
      const text = btn.textContent?.trim() ?? '';
      if (DEV_SKIP.some(d => text === d || text.startsWith(d))) continue;
      const s = getComputedStyle(btn);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
      const r = btn.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
        out.push(
          `"${text.slice(0, 30) || btn.className.split(' ')[0]}" ${Math.round(r.width)}x${Math.round(r.height)}px`,
        );
      }
    }
    return out;
  });
  for (const h of hits) {
    report('CRITICAL', device, screen, `Button < 44x44 tap target: ${h}`);
  }
}

/**
 * Check 5: Background is not pure white (noir game should be dark).
 */
async function checkDarkBackground(
  page: Page,
  device: UIIssue['device'],
  screen: string,
): Promise<void> {
  const bgInfo = await page.evaluate(() => {
    const body = document.body;
    const s = getComputedStyle(body);
    const bg = s.backgroundColor;
    // Also check the main container
    const app = document.querySelector('#app, #host-app, .host-root, .game-board') as HTMLElement;
    const appBg = app ? getComputedStyle(app).backgroundColor : '';
    return { bodyBg: bg, appBg };
  });

  const isWhite = (color: string): boolean => {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    return +m[1] > 240 && +m[2] > 240 && +m[3] > 240;
  };

  if (isWhite(bgInfo.bodyBg) || isWhite(bgInfo.appBg)) {
    report(
      'CRITICAL',
      device,
      screen,
      `Pure white background detected -- noir game should be dark (body: ${bgInfo.bodyBg}, app: ${bgInfo.appBg})`,
    );
  }
}

/**
 * Check 6: No elements positioned off-screen (bounding box x/y negative or beyond viewport).
 */
async function checkOffScreen(
  page: Page,
  device: UIIssue['device'],
  screen: string,
): Promise<void> {
  const hits = await page.evaluate(() => {
    const out: string[] = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Check significant interactive/visible elements, not every DOM node
    const selectors = [
      'button',
      'h1',
      'h2',
      '.glass-panel',
      '.action-btn',
      '.vote-card',
      '.policy-card',
      '.role-reveal-card',
      '.game-over__panel',
      '.player-picker',
      '.investigation-card',
      '.spectator-panel',
      '.mini-board',
      '.nomination-bar',
      '.power-overlay',
      '.game-over-overlay',
      '.session-status-bar',
      '.board-header',
      '.board-tracks',
      '.player-strip',
    ];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (!(el instanceof HTMLElement)) continue;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Significantly off-screen (more than 50px)
        if (r.right < -50 || r.bottom < -50 || r.left > vw + 50 || r.top > vh + 50) {
          const text = el.textContent?.trim().slice(0, 30) || el.className.split(' ')[0];
          out.push(
            `"${text}" at (${Math.round(r.left)},${Math.round(r.top)}) -- beyond viewport ${vw}x${vh}`,
          );
        }
      }
    }
    return out;
  });
  for (const h of hits) {
    report('CRITICAL', device, screen, `Off-screen element: ${h}`);
  }
}

/**
 * Run all 6 automated checks.
 */
async function runChecks(
  page: Page,
  device: UIIssue['device'],
  screen: string,
): Promise<void> {
  const minFont = device === 'phone' ? 12 : 14;
  await checkNoOverflow(page, device, screen);
  await checkTruncatedContent(page, device, screen);
  await checkTextSizes(page, device, screen, minFont);
  await checkTapTargets(page, device, screen);
  await checkDarkBackground(page, device, screen);
  await checkOffScreen(page, device, screen);
}

/**
 * Screenshot + run all checks.
 */
async function auditScreen(
  page: Page,
  dir: string,
  device: UIIssue['device'],
  screen: string,
): Promise<void> {
  await snap(page, dir, screen);
  await runChecks(page, device, screen);
}

// ── Report printer ───────────────────────────────────────────────────

function printReport(): void {
  const criticals = allIssues.filter((i) => i.severity === 'CRITICAL');
  const majors = allIssues.filter((i) => i.severity === 'MAJOR');
  const minors = allIssues.filter((i) => i.severity === 'MINOR');

  const sep = '='.repeat(76);
  console.log(`\n${sep}`);
  console.log('  VISUAL AUDIT REPORT');
  console.log(sep);

  if (criticals.length) {
    console.log(`\n  CRITICAL (${criticals.length}):`);
    for (const i of criticals)
      console.log(`    [${i.device}][${i.screen}] ${i.description}`);
  }
  if (majors.length) {
    console.log(`\n  MAJOR (${majors.length}):`);
    for (const i of majors)
      console.log(`    [${i.device}][${i.screen}] ${i.description}`);
  }
  if (minors.length) {
    console.log(`\n  MINOR (${minors.length}):`);
    for (const i of minors)
      console.log(`    [${i.device}][${i.screen}] ${i.description}`);
  }
  if (allIssues.length === 0) {
    console.log('\n  No issues found. All screens pass visual audit.');
  }

  console.log(`\n  Total: ${criticals.length} critical, ${majors.length} major, ${minors.length} minor`);
  console.log(`  Screenshots: ${SCREENSHOT_BASE}`);
  console.log(`${sep}\n`);

  // Write text report
  ensureDir(SCREENSHOT_BASE);
  const lines = [
    'VISUAL AUDIT REPORT',
    `Date: ${new Date().toISOString()}`,
    '',
    `Total: ${allIssues.length} issues (${criticals.length} critical, ${majors.length} major, ${minors.length} minor)`,
    '',
  ];
  if (criticals.length) {
    lines.push('CRITICAL:');
    for (const i of criticals) lines.push(`  [${i.device}][${i.screen}] ${i.description}`);
    lines.push('');
  }
  if (majors.length) {
    lines.push('MAJOR:');
    for (const i of majors) lines.push(`  [${i.device}][${i.screen}] ${i.description}`);
    lines.push('');
  }
  if (minors.length) {
    lines.push('MINOR:');
    for (const i of minors) lines.push(`  [${i.device}][${i.screen}] ${i.description}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(SCREENSHOT_BASE, 'AUDIT-REPORT.txt'), lines.join('\n'));
}

// =====================================================================
// TEST SUITE
// =====================================================================

test.describe('Visual Audit: Phone + Tablet', () => {
  test.setTimeout(300_000); // 5 minutes

  let hostCtx: BrowserContext;
  let host: Page;
  let playerCtx: BrowserContext;
  let player: Page;
  let player2Ctx: BrowserContext;
  let player2: Page;
  let roomCode: string;

  test.beforeAll(async ({ browser }) => {
    roomCode = 'VA' + Date.now().toString(36).slice(-4).toUpperCase();

    // Host context: iPad 10.2" landscape
    hostCtx = await browser.newContext({
      viewport: TABLET_VIEWPORT,
      deviceScaleFactor: 2,
    });
    host = await hostCtx.newPage();

    // Player 1 context: iPhone 13 (Vincenz = players[0] = mayor)
    playerCtx = await browser.newContext({
      viewport: PHONE_VIEWPORT,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    player = await playerCtx.newPage();

    // Player 2 context: iPhone 13 (players[1] = chief in scenarios)
    player2Ctx = await browser.newContext({
      viewport: PHONE_VIEWPORT,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    player2 = await player2Ctx.newPage();

    // Navigate host
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

    // Player 1 joins first => players[0]
    await player.goto(`${BASE}/?room=${roomCode}&name=Vincenz`);
    await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });

    // Player 2 joins second => players[1]
    await player2.goto(`${BASE}/?room=${roomCode}&name=Carmine`);
    await player2.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });
  });

  test.afterAll(async () => {
    printReport();
    await hostCtx?.close();
    await playerCtx?.close();
    await player2Ctx?.close();
  });

  // ─── PLAYER PHONE SCENARIOS ──────────────────────────────────────

  test.describe('Player Phone (390x844)', () => {
    test('01 -- Lobby (waiting for game)', async () => {
      // Spawn 3 bots so we have 5 players total
      await spawnBots(host, 3);
      await player.waitForTimeout(500);

      await auditScreen(player, PHONE_DIR, 'phone', 'P01-lobby');
    });

    test('02 -- Role reveal: sealed card', async () => {
      await host.locator('[data-test-id="host-start-btn"]').click();
      await player.waitForSelector('[data-test-id="role-card"]', { timeout: 15_000 });
      await player.waitForTimeout(1000); // entrance animation

      await auditScreen(player, PHONE_DIR, 'phone', 'P02-role-reveal-sealed');
    });

    test('03 -- Role reveal: card flipped (role visible)', async () => {
      await player.locator('[data-test-id="role-card"]').tap();
      await player.waitForTimeout(1200); // flip animation

      await auditScreen(player, PHONE_DIR, 'phone', 'P03-role-reveal-flipped');
    });

    test('04 -- Waiting screen (non-mayor during nomination)', async () => {
      // After test 03, game is in role-reveal. Scenario select is only on lobby screen.
      // Navigate host back to lobby for a clean scenario load, but keep same room
      // so player connections stay valid.
      // Actually: the scenario select is on the LOBBY, not during role-reveal.
      // Use Play Again or navigate. Simplest: acknowledge remaining roles + load scenario
      // from the game-board that appears after role-reveal.
      // OR: just screenshot whatever the player sees after role-reveal + election scenario attempt.

      // Try to get to a state where we can load scenarios:
      // The host may be on role-reveal or game-board depending on bot acknowledgement timing.
      // Wait a bit for the game to potentially advance.
      await host.waitForTimeout(3000);

      // Check if scenario select is available (we're on lobby or game-board with dev tools)
      const scenarioSelect = host.locator('[data-test-id="host-scenario-select"]');
      const canLoadScenario = await scenarioSelect.isVisible({ timeout: 2_000 }).catch(() => false);

      if (canLoadScenario) {
        await loadScenario(host, 'election');
        await player.waitForTimeout(2500);
      } else {
        // Can't load scenario — just capture whatever screen the player is on
        await player.waitForTimeout(1000);
      }

      // Mayor might see waiting during election-voting
      const waitMsg = player.locator('[data-test-id="waiting-message"]');
      const isWaiting = await waitMsg.isVisible({ timeout: 3_000 }).catch(() => false);
      if (isWaiting) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P04-waiting-screen');
      } else {
        // Take screenshot of whatever the mayor sees
        await auditScreen(player, PHONE_DIR, 'phone', 'P04-mayor-election-view');
      }
    });

    test('05 -- Mayor nomination picker', async () => {
      // The election scenario may or may not put us in nomination-pending.
      // Check if the nomination picker is visible for the mayor.
      const picker = player.locator('[data-test-id="nomination-picker"]');
      const vis = await picker.isVisible({ timeout: 2_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P05-mayor-nomination-picker');
      } else {
        // Capture the fallback screen
        await auditScreen(player, PHONE_DIR, 'phone', 'P05-mayor-nomination-fallback');
      }
    });

    test('06 -- Vote screen (approve/deny buttons)', async () => {
      // In election scenario, player2 (non-mayor) should see the vote screen
      await player2.waitForTimeout(500);
      const voteBtn = player2.locator('[data-test-id="vote-approve"]');
      const vis = await voteBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player2, PHONE_DIR, 'phone', 'P06-vote-screen');
      } else {
        await auditScreen(player2, PHONE_DIR, 'phone', 'P06-vote-screen-fallback');
      }
    });

    test('07 -- Mayor hand (3 policy cards)', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'policy-session');
      await player.waitForTimeout(2500);

      const hand = player.locator('[data-test-id="mayor-hand"]');
      const vis = await hand.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P07-mayor-hand-3-cards');
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P07-mayor-hand-fallback');
      }
    });

    test('08 -- Chief hand (2 policy cards)', async () => {
      // Player2 = players[1] = chief in policy-session scenario
      const hand = player2.locator('[data-test-id="chief-hand"]');
      const vis = await hand.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player2, PHONE_DIR, 'phone', 'P08-chief-hand-2-cards');
      } else {
        await auditScreen(player2, PHONE_DIR, 'phone', 'P08-chief-hand-fallback');
      }
    });

    test('09 -- Chief hand with veto button (5+ bad policies)', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'veto');
      await player2.waitForTimeout(2500);

      // Player2 = players[1] = chief, should see veto button
      const chiefHand = player2.locator('[data-test-id="chief-hand"]');
      const vis = await chiefHand.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player2, PHONE_DIR, 'phone', 'P09-chief-hand-veto');
      } else {
        await auditScreen(player2, PHONE_DIR, 'phone', 'P09-chief-hand-veto-fallback');
      }
    });

    test('10 -- Veto response (mayor accept/reject)', async () => {
      // Vincenz (players[0]) = mayor sees veto response
      const vetoPanel = player.locator('[data-test-id="veto-response"]');
      const vis = await vetoPanel.isVisible({ timeout: 3_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P10-veto-response');
      } else {
        // Mayor may see waiting while chief proposes veto
        await auditScreen(player, PHONE_DIR, 'phone', 'P10-veto-mayor-waiting');
      }
    });

    test('11 -- Investigation picker', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'investigation');
      await player.waitForTimeout(2500);

      const picker = player.locator('[data-test-id="investigate-picker"]');
      const vis = await picker.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P11-investigation-picker');
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P11-investigation-fallback');
      }
    });

    test('12 -- Investigation result: sealed dossier', async () => {
      // Select a player and confirm to get the result card
      const items = player.locator('[data-test-id="investigate-player"]');
      const count = await items.count();
      if (count > 0) {
        await items.first().click();
        await player.waitForTimeout(300);
        const confirmBtn = player.locator('[data-test-id="investigate-confirm"]');
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
          await player.waitForTimeout(1500);
        }

        const card = player.locator('[data-test-id="investigation-card"]');
        const vis = await card.isVisible({ timeout: 8_000 }).catch(() => false);
        if (vis) {
          await auditScreen(player, PHONE_DIR, 'phone', 'P12-investigation-sealed');

          // Tap to flip (revealed dossier)
          await card.click();
          await player.waitForTimeout(1500);
          await auditScreen(player, PHONE_DIR, 'phone', 'P12b-investigation-revealed');
        } else {
          await auditScreen(player, PHONE_DIR, 'phone', 'P12-investigation-result-fallback');
        }
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P12-no-investigation-targets');
      }
    });

    test('13 -- Policy peek (3 cards displayed)', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'policy-peek');
      await player.waitForTimeout(2500);

      const peek = player.locator('[data-test-id="peek-cards"]');
      const vis = await peek.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P13-policy-peek');
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P13-policy-peek-fallback');
      }
    });

    test('14 -- Execution picker', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'execution');
      await player.waitForTimeout(2500);

      const picker = player.locator('[data-test-id="execute-picker"]');
      const vis = await picker.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P14-execution-picker');
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P14-execution-fallback');
      }
    });

    test('15 -- Special nomination picker', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'special-nomination');
      await player.waitForTimeout(2500);

      const picker = player.locator('[data-test-id="special-nominate-picker"]');
      const vis = await picker.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P15-special-nomination');
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P15-special-nomination-fallback');
      }
    });

    test('16 -- Spectator/eliminated screen', async () => {
      // Spectator view is shown when a player is eliminated.
      // The execution scenario kills a player. Let's check if player2
      // sees spectator after execution. This requires executing player2.
      // Instead, load the execution scenario and check if spectator badge is visible.
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'execution');
      await player.waitForTimeout(2000);

      // Execute player2 if the picker is visible
      const picker = player.locator('[data-test-id="execute-picker"]');
      const pickerVis = await picker.isVisible({ timeout: 3_000 }).catch(() => false);
      if (pickerVis) {
        // Find and click player2's name in the execution picker
        const items = player.locator('[data-test-id="execute-player"]');
        const count = await items.count();
        for (let i = 0; i < count; i++) {
          const text = await items.nth(i).textContent();
          if (text?.includes('Carmine')) {
            await items.nth(i).click();
            await player.waitForTimeout(300);
            const confirmBtn = player.locator('[data-test-id="execute-confirm"]');
            if (await confirmBtn.isVisible().catch(() => false)) {
              await confirmBtn.click({ force: true }); // GSAP entrance animation causes instability in WebKit
              await player2.waitForTimeout(2000);
            }
            break;
          }
        }
      }

      const specBadge = player2.locator('[data-test-id="spectator-badge"]');
      const specVis = await specBadge.isVisible({ timeout: 5_000 }).catch(() => false);
      if (specVis) {
        await auditScreen(player2, PHONE_DIR, 'phone', 'P16-spectator-eliminated');
      } else {
        // Still take a screenshot of whatever player2 sees
        await auditScreen(player2, PHONE_DIR, 'phone', 'P16-spectator-fallback');
      }
    });

    test('17 -- Game over: citizens win', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'game-over-citizens');
      await player.waitForTimeout(2500);

      const winner = player.locator('[data-test-id="game-over-winner"]');
      const vis = await winner.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P17-game-over-citizens');
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P17-game-over-citizens-fallback');
      }
    });

    test('18 -- Game over: mob win', async () => {
      await resetToLobby(host, player, player2);
      await host.waitForTimeout(500);
      await loadScenario(host, 'game-over-mob');
      await player.waitForTimeout(2500);

      const winner = player.locator('[data-test-id="game-over-winner"]');
      const vis = await winner.isVisible({ timeout: 5_000 }).catch(() => false);
      if (vis) {
        await auditScreen(player, PHONE_DIR, 'phone', 'P18-game-over-mob');
      } else {
        await auditScreen(player, PHONE_DIR, 'phone', 'P18-game-over-mob-fallback');
      }
    });
  });

  // ─── HOST TABLET SCENARIOS ──────────────────────────────────────────

  test.describe('Host Tablet (1080x810)', () => {
    test('01 -- Lobby with 5 players', async () => {
      // Reset to lobby for host tablet tests
      await resetToLobby(host);
      await host.waitForTimeout(1000);

      // Navigate host fresh for a clean lobby
      const freshRoom = 'VT' + Date.now().toString(36).slice(-4).toUpperCase();
      await host.goto(`${BASE}/host?room=${freshRoom}`);
      await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

      await spawnBots(host, 5);
      await expect(host.locator('[data-test-id="host-player-count"]')).toContainText(
        '5 / 10',
        { timeout: 5_000 },
      );

      await auditScreen(host, TABLET_DIR, 'tablet', 'H01-lobby-5-players');
    });

    test('02 -- Lobby with 10 players', async () => {
      // Spawn 5 more bots to reach 10
      await spawnBots(host, 5);
      await expect(host.locator('[data-test-id="host-player-count"]')).toContainText(
        '10 / 10',
        { timeout: 5_000 },
      );

      await auditScreen(host, TABLET_DIR, 'tablet', 'H02-lobby-10-players');
    });

    test('03 -- Game board (base, no overlay)', async () => {
      // Load election scenario to get onto game board, then check the board
      await loadScenario(host, 'election');
      await host.waitForSelector('.game-board', { timeout: 10_000 });
      await host.waitForTimeout(1500);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H03-game-board');
    });

    test('04 -- Nomination overlay', async () => {
      // The election scenario should show the nomination bar
      const nomBar = host.locator('.nomination-bar');
      const vis = await nomBar.isVisible({ timeout: 3_000 }).catch(() => false);
      if (vis) {
        await auditScreen(host, TABLET_DIR, 'tablet', 'H04-nomination-overlay');
      } else {
        // Reload scenario
        await resetToLobby(host);
        await host.waitForTimeout(500);
        await loadScenario(host, 'election');
        await host.waitForTimeout(2000);
        await auditScreen(host, TABLET_DIR, 'tablet', 'H04-nomination-overlay');
      }
    });

    test('05 -- Election results overlay', async () => {
      // Election results are shown briefly after votes are tallied.
      // The election scenario puts us in election-voting, so results
      // may not be directly visible. Capture what we see.
      await auditScreen(host, TABLET_DIR, 'tablet', 'H05-election-state');
    });

    test('06 -- Policy session active overlay', async () => {
      await resetToLobby(host);
      await loadScenario(host, 'policy-session');
      await host.waitForSelector('.game-board', { timeout: 10_000 });
      await host.waitForTimeout(1500);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H06-policy-session');
    });

    test('07 -- Executive power overlay', async () => {
      await resetToLobby(host);
      await host.waitForTimeout(500);
      await loadScenario(host, 'investigation');
      await host.waitForTimeout(2000);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H07-executive-power-investigation');

      // Also capture execution power
      await resetToLobby(host);
      await host.waitForTimeout(500);
      await loadScenario(host, 'execution');
      await host.waitForTimeout(2000);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H07b-executive-power-execution');

      // Also capture special nomination power
      await resetToLobby(host);
      await host.waitForTimeout(500);
      await loadScenario(host, 'special-nomination');
      await host.waitForTimeout(2000);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H07c-executive-power-special-nom');

      // Also capture policy peek power
      await resetToLobby(host);
      await host.waitForTimeout(500);
      await loadScenario(host, 'policy-peek');
      await host.waitForTimeout(2000);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H07d-executive-power-policy-peek');
    });

    test('08 -- Game over: citizens win overlay', async () => {
      await resetToLobby(host);
      await host.waitForTimeout(500);
      await loadScenario(host, 'game-over-citizens');
      await host.waitForTimeout(2500);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H08-game-over-citizens');

      // Verify the overlay covers the screen
      const overlayInfo = await host.evaluate(() => {
        const overlay = document.querySelector('.game-over-overlay, [data-overlay-id="game-over"]');
        if (!overlay) return null;
        const r = overlay.getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          vw: window.innerWidth,
          vh: window.innerHeight,
        };
      });
      if (overlayInfo && overlayInfo.width < overlayInfo.vw * 0.9) {
        report(
          'MAJOR',
          'tablet',
          'H08-game-over-citizens',
          `Game over overlay only ${Math.round(overlayInfo.width)}px wide (viewport: ${overlayInfo.vw}px)`,
        );
      }
    });

    test('09 -- Game over: mob win overlay', async () => {
      await resetToLobby(host);
      await host.waitForTimeout(500);
      await loadScenario(host, 'game-over-mob');
      await host.waitForTimeout(2500);

      await auditScreen(host, TABLET_DIR, 'tablet', 'H09-game-over-mob');
    });
  });

  // ─── FINAL SUMMARY ────────────────────────────────────────────────

  test('FINAL -- Summary and fail on critical issues', async () => {
    // This test exists solely to print the report and fail on criticals
    printReport();

    const criticals = allIssues.filter((i) => i.severity === 'CRITICAL');
    if (criticals.length > 0) {
      const summary = criticals
        .map((i) => `  [${i.device}][${i.screen}] ${i.description}`)
        .join('\n');
      expect.soft(
        criticals.length,
        `Found ${criticals.length} CRITICAL visual issues:\n${summary}`,
      ).toBe(0);
    }
  });
});
