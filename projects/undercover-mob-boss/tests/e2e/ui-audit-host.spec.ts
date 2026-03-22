/**
 * UI AUDIT: Host/Table View — iPad 10.2" Landscape (1080x810)
 *
 * Hostile QA pass: screenshots every host screen and overlay,
 * then runs automated visual checks for layout, readability,
 * contrast, and polish issues.
 *
 * Output: ui-audit-screenshots/host/*.png
 *         (also written to test-results/ui-audit/host/ during the run,
 *          but Playwright cleans test-results/ between invocations)
 */
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE = 'http://localhost:5173';
// Primary output dir (survives across Playwright runs)
const SCREENSHOT_DIR = path.resolve('ui-audit-screenshots/host');
// Also copy to test-results for Playwright report attachment
const SECONDARY_DIR = path.resolve('test-results/ui-audit/host');
let roomSeq = 0;
const roomPrefix = 'H' + Date.now().toString(36).slice(-3).toUpperCase();
function nextRoom(): string {
  return roomPrefix + (roomSeq++).toString(36).toUpperCase();
}

// iPad 10.2" landscape
const VIEWPORT = { width: 1080, height: 810 };
const DEVICE_SCALE = 2;

// Minimum font sizes (in px) for table readability
const MIN_IMPORTANT_TEXT_PX = 16;
const MIN_SECONDARY_TEXT_PX = 12;

// ── Types ──────────────────────────────────────────────────────────

interface UIIssue {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  screen: string;
  description: string;
}

const allIssues: UIIssue[] = [];

function report(severity: UIIssue['severity'], screen: string, description: string): void {
  allIssues.push({ severity, screen, description });
}

// ── Helpers ────────────────────────────────────────────────────────

async function screenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(SECONDARY_DIR, { recursive: true });
  const primaryPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: primaryPath,
    fullPage: false,
  });
  // Copy to secondary (test-results) location
  fs.copyFileSync(primaryPath, path.join(SECONDARY_DIR, `${name}.png`));
}

async function spawnBots(page: Page, count: number): Promise<void> {
  const botSelect = page.locator('[data-test-id="host-bot-count"]');
  await botSelect.selectOption(String(count));
  await page.locator('[data-test-id="host-spawn-bots"]').click();
  // Wait for players to appear
  await page.waitForTimeout(1000);
}

async function loadScenario(page: Page, scenario: string): Promise<void> {
  const select = page.locator('[data-test-id="host-scenario-select"]');
  await select.selectOption(scenario);
  // Wait for scenario to load and render
  await page.waitForTimeout(2000);
}

async function resetToLobby(page: Page): Promise<void> {
  // Navigate to a fresh room — DEV RESET may be hidden behind overlays
  // (game-over, voting) and fails silently, so we always start clean.
  const room = nextRoom();
  await page.goto(`${BASE}/host?room=${room}`);
  await page.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });
  await spawnBots(page, 5);
  await expect(page.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });
}

/**
 * Returns bounding box + computed styles for all text elements.
 */
async function getTextElements(page: Page): Promise<Array<{
  tag: string;
  text: string;
  fontSize: number;
  color: string;
  bgColor: string;
  rect: { x: number; y: number; width: number; height: number };
  visible: boolean;
  opacity: number;
}>> {
  return page.evaluate(() => {
    const results: Array<{
      tag: string;
      text: string;
      fontSize: number;
      color: string;
      bgColor: string;
      rect: { x: number; y: number; width: number; height: number };
      visible: boolean;
      opacity: number;
    }> = [];

    // Gather all visible text-containing elements
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null,
    );

    let node: Node | null = walker.currentNode;
    while (node) {
      const el = node as HTMLElement;
      const text = el.textContent?.trim() ?? '';
      if (text && el.children.length === 0 && text.length < 200) {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          let totalOpacity = 1;
          let ancestor: HTMLElement | null = el;
          while (ancestor) {
            const s = window.getComputedStyle(ancestor);
            totalOpacity *= parseFloat(s.opacity);
            ancestor = ancestor.parentElement;
          }

          results.push({
            tag: el.tagName.toLowerCase(),
            text: text.slice(0, 100),
            fontSize: parseFloat(styles.fontSize),
            color: styles.color,
            bgColor: styles.backgroundColor,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            visible: styles.display !== 'none' && styles.visibility !== 'hidden' && totalOpacity > 0.1,
            opacity: totalOpacity,
          });
        }
      }
      node = walker.nextNode();
    }
    return results;
  });
}

/**
 * Parse CSS color string to RGB values.
 */
function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }
  return null;
}

/**
 * Calculate relative luminance per WCAG 2.0.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors.
 */
function contrastRatio(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(fg.r, fg.g, fg.b);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if any elements overlap others improperly.
 */
async function checkOverlapping(page: Page, screen: string): Promise<void> {
  const overlaps = await page.evaluate(() => {
    const found: string[] = [];
    // Only check board-level layout elements for non-overlay overlap
    const elements = document.querySelectorAll(
      '.board-header, .board-tracks, .player-strip'
    );
    const rects = Array.from(elements).map(el => ({
      name: el.className.split(' ')[0],
      rect: el.getBoundingClientRect(),
    }));

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].rect;
        const b = rects[j].rect;
        // Check if they meaningfully overlap (more than 10px in both axes)
        const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (xOverlap > 10 && yOverlap > 10) {
          found.push(`${rects[i].name} overlaps ${rects[j].name} by ${Math.round(xOverlap)}x${Math.round(yOverlap)}px`);
        }
      }
    }
    return found;
  });

  for (const overlap of overlaps) {
    report('MAJOR', screen, `Overlapping elements: ${overlap}`);
  }
}

/**
 * Check viewport fill — the game should use most of the landscape viewport.
 */
async function checkViewportFill(page: Page, screen: string): Promise<void> {
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('.game-board, .host-screen, .lobby') as HTMLElement;
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  if (!metrics) {
    report('CRITICAL', screen, 'No root .game-board, .host-screen, or .lobby element found');
    return;
  }

  const widthRatio = metrics.width / metrics.viewportWidth;
  const heightRatio = metrics.height / metrics.viewportHeight;

  if (widthRatio < 0.8) {
    report('MAJOR', screen, `Layout only fills ${Math.round(widthRatio * 100)}% of viewport width (expected >80%)`);
  }
  if (heightRatio < 0.6) {
    report('MAJOR', screen, `Layout only fills ${Math.round(heightRatio * 100)}% of viewport height (expected >60%)`);
  }

  // Check for large empty gaps (> 100px) at edges
  if (metrics.top > 100) {
    report('MINOR', screen, `${Math.round(metrics.top)}px empty gap at top`);
  }
  if (metrics.left > 100) {
    report('MINOR', screen, `${Math.round(metrics.left)}px empty gap at left`);
  }
}

/**
 * Check text readability from across a table.
 */
async function checkTextReadability(page: Page, screen: string): Promise<void> {
  const textElements = await getTextElements(page);

  // Text that's dev-only (not player-facing)
  const DEV_ONLY_TEXT = ['DEV RESET', 'DEV', '+ Bots', 'Load scenario...'];

  for (const el of textElements) {
    if (!el.visible || el.opacity < 0.3) continue;
    // Skip dev-only UI
    if (DEV_ONLY_TEXT.some(d => el.text.startsWith(d))) continue;
    // Skip single-digit numbers (bot count dropdown etc.)
    if (/^\d$/.test(el.text.trim())) continue;
    // Skip kick button "×" — intentionally small icon-style button
    if (el.tag === 'button' && el.text.trim() === '×') continue;

    // Determine if text is "important" (player-facing, needs table visibility)
    const isImportant = el.tag === 'h1' || el.tag === 'h2' || el.text.length < 30;

    // Buttons with dark text on gold background are intentional — skip contrast check
    const isGoldButton = el.tag === 'button' && el.text.match(/Start Game|Play Again/i);

    if (isImportant && el.fontSize < MIN_IMPORTANT_TEXT_PX) {
      report('MAJOR', screen, `Important text "${el.text.slice(0, 40)}" is ${el.fontSize}px (min: ${MIN_IMPORTANT_TEXT_PX}px)`);
    } else if (el.fontSize < MIN_SECONDARY_TEXT_PX) {
      report('MINOR', screen, `Secondary text "${el.text.slice(0, 40)}" is ${el.fontSize}px (min: ${MIN_SECONDARY_TEXT_PX}px)`);
    }

    // Check color contrast (skip dark-on-gold buttons — the gold BG is not captured)
    if (isGoldButton) continue;

    const fg = parseColor(el.color);
    if (fg && fg.a > 0.5) {
      // Assume dark background (noir theme) — check against #0a0a0c
      const darkBg = { r: 10, g: 10, b: 12 };
      const ratio = contrastRatio(fg, darkBg);
      if (ratio < 3.0 && el.fontSize < 18) {
        report('MAJOR', screen, `Low contrast (${ratio.toFixed(1)}:1) on "${el.text.slice(0, 30)}" — color: ${el.color}`);
      } else if (ratio < 4.5 && el.fontSize < 14) {
        report('MINOR', screen, `Suboptimal contrast (${ratio.toFixed(1)}:1) on "${el.text.slice(0, 30)}" — small text needs 4.5:1`);
      }
    }
  }
}

/**
 * Check policy tracks are visible and sized correctly.
 */
async function checkPolicyTracks(page: Page, screen: string): Promise<void> {
  const trackInfo = await page.evaluate(() => {
    const tracks = document.querySelectorAll('.policy-track');
    const results: Array<{
      label: string;
      width: number;
      height: number;
      slotCount: number;
      slotWidth: number;
      slotHeight: number;
      visible: boolean;
    }> = [];

    tracks.forEach(track => {
      const rect = track.getBoundingClientRect();
      const label = track.querySelector('.policy-track__label')?.textContent ?? 'unknown';
      const slots = track.querySelectorAll('.policy-slot');
      const firstSlot = slots[0]?.getBoundingClientRect();
      results.push({
        label,
        width: rect.width,
        height: rect.height,
        slotCount: slots.length,
        slotWidth: firstSlot?.width ?? 0,
        slotHeight: firstSlot?.height ?? 0,
        visible: rect.width > 0 && rect.height > 0,
      });
    });
    return results;
  });

  if (trackInfo.length === 0) {
    report('CRITICAL', screen, 'No policy tracks found on game board');
    return;
  }

  for (const track of trackInfo) {
    if (!track.visible) {
      report('CRITICAL', screen, `Policy track "${track.label}" not visible`);
    }
    if (track.slotWidth < 40) {
      report('MAJOR', screen, `Policy slots in "${track.label}" too small: ${Math.round(track.slotWidth)}px wide (min: 40px)`);
    }
    if (track.slotHeight < 50) {
      report('MAJOR', screen, `Policy slots in "${track.label}" too short: ${Math.round(track.slotHeight)}px tall (min: 50px)`);
    }
  }
}

/**
 * Check player strip readability.
 */
async function checkPlayerStrip(page: Page, screen: string): Promise<void> {
  const stripInfo = await page.evaluate(() => {
    const strip = document.querySelector('.player-strip');
    if (!strip) return null;
    const rect = strip.getBoundingClientRect();
    const items = strip.querySelectorAll('.player-strip__item');
    const names = strip.querySelectorAll('.player-strip__name');
    const nameData: Array<{ text: string; fontSize: number; truncated: boolean; width: number }> = [];

    names.forEach(nameEl => {
      const styles = window.getComputedStyle(nameEl);
      const htmlEl = nameEl as HTMLElement;
      nameData.push({
        text: nameEl.textContent ?? '',
        fontSize: parseFloat(styles.fontSize),
        truncated: htmlEl.scrollWidth > htmlEl.clientWidth,
        width: htmlEl.getBoundingClientRect().width,
      });
    });

    return {
      visible: rect.width > 0 && rect.height > 0,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      itemCount: items.length,
      names: nameData,
    };
  });

  if (!stripInfo) {
    // Player strip not present (e.g., lobby) — skip
    return;
  }

  if (!stripInfo.visible) {
    report('CRITICAL', screen, 'Player strip not visible');
    return;
  }

  // Check strip is at bottom and not clipped
  const distFromBottom = stripInfo.viewportHeight - stripInfo.bottom;
  if (distFromBottom < -5) {
    report('CRITICAL', screen, `Player strip clipped off-screen: ${Math.round(Math.abs(distFromBottom))}px below viewport`);
  }

  // Check name readability
  for (const name of stripInfo.names) {
    if (name.fontSize < 10) {
      report('MAJOR', screen, `Player name "${name.text}" at ${name.fontSize}px — too small to read`);
    }
    if (name.truncated) {
      report('MINOR', screen, `Player name "${name.text}" is truncated at ${Math.round(name.width)}px width`);
    }
  }
}

/**
 * Check overlay centering and clipping.
 */
async function checkOverlayCentering(page: Page, screen: string): Promise<void> {
  const overlayInfo = await page.evaluate(() => {
    const overlays = document.querySelectorAll('.host-overlay, .session-status-bar');
    const results: Array<{
      id: string;
      rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
      viewportWidth: number;
      viewportHeight: number;
    }> = [];

    overlays.forEach(overlay => {
      const rect = overlay.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        results.push({
          id: (overlay as HTMLElement).dataset.overlayId ?? overlay.className.split(' ')[0],
          rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        });
      }
    });
    return results;
  });

  for (const overlay of overlayInfo) {
    // Check right edge clipping
    if (overlay.rect.right > overlay.viewportWidth + 5) {
      report('CRITICAL', screen, `Overlay "${overlay.id}" clips off right edge by ${Math.round(overlay.rect.right - overlay.viewportWidth)}px`);
    }
    // Check bottom edge clipping
    if (overlay.rect.bottom > overlay.viewportHeight + 5) {
      report('MAJOR', screen, `Overlay "${overlay.id}" clips off bottom by ${Math.round(overlay.rect.bottom - overlay.viewportHeight)}px`);
    }
    // Check left edge clipping
    if (overlay.rect.left < -5) {
      report('CRITICAL', screen, `Overlay "${overlay.id}" clips off left edge by ${Math.round(Math.abs(overlay.rect.left))}px`);
    }
  }
}

/**
 * Check background renders (not just solid black).
 */
async function checkBackground(page: Page, screen: string): Promise<void> {
  const bgInfo = await page.evaluate(() => {
    const gameBoard = document.querySelector('.game-board') as HTMLElement;
    if (!gameBoard) return null;
    const styles = window.getComputedStyle(gameBoard);
    return {
      background: styles.background,
      backgroundImage: styles.backgroundImage,
      backgroundColor: styles.backgroundColor,
    };
  });

  if (!bgInfo) return; // Not on game board

  // Check that background isn't just solid black
  if (bgInfo.backgroundImage === 'none' && !bgInfo.background.includes('gradient') && !bgInfo.background.includes('url')) {
    report('MAJOR', screen, 'Game board has no background image or gradient — may appear as blank dark screen');
  }
}

// ── Run all checks for a screen ──────────────────────────────────

async function auditScreen(page: Page, screen: string): Promise<void> {
  await screenshot(page, screen);
  await checkViewportFill(page, screen);
  await checkTextReadability(page, screen);
  await checkOverlapping(page, screen);
  await checkOverlayCentering(page, screen);
  await checkBackground(page, screen);
  await checkPlayerStrip(page, screen);
}

// ══════════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════════

test.describe('Host UI Audit — iPad Landscape', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE,
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    // Print the full issue report
    console.log('\n');
    console.log('='.repeat(72));
    console.log('  HOST UI AUDIT REPORT');
    console.log('='.repeat(72));

    const criticals = allIssues.filter(i => i.severity === 'CRITICAL');
    const majors = allIssues.filter(i => i.severity === 'MAJOR');
    const minors = allIssues.filter(i => i.severity === 'MINOR');

    if (criticals.length > 0) {
      console.log(`\n  CRITICAL (${criticals.length}):`);
      criticals.forEach(i => console.log(`    [${i.screen}] ${i.description}`));
    }
    if (majors.length > 0) {
      console.log(`\n  MAJOR (${majors.length}):`);
      majors.forEach(i => console.log(`    [${i.screen}] ${i.description}`));
    }
    if (minors.length > 0) {
      console.log(`\n  MINOR (${minors.length}):`);
      minors.forEach(i => console.log(`    [${i.screen}] ${i.description}`));
    }

    if (allIssues.length === 0) {
      console.log('\n  No issues found. All screens pass visual audit.');
    }

    console.log('\n' + '='.repeat(72));
    console.log(`  TOTALS: ${criticals.length} critical, ${majors.length} major, ${minors.length} minor`);
    console.log('='.repeat(72));
    console.log(`\n  Screenshots saved to: ${SCREENSHOT_DIR}\n`);

    await page.context().close();
  });

  test('01 — Lobby with 5 players', async () => {
    await page.goto(`${BASE}/host?room=${nextRoom()}`);
    await page.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

    // Spawn 5 bots
    await spawnBots(page, 5);
    await expect(page.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });

    await auditScreen(page, '01-lobby');

    // Lobby-specific checks
    const lobbyInfo = await page.evaluate(() => {
      const title = document.querySelector('.lobby__title');
      const roomCode = document.querySelector('.lobby__room-code');
      return {
        titleVisible: title ? title.getBoundingClientRect().height > 0 : false,
        titleFontSize: title ? parseFloat(window.getComputedStyle(title).fontSize) : 0,
        roomCodeVisible: roomCode ? roomCode.getBoundingClientRect().height > 0 : false,
      };
    });

    if (!lobbyInfo.titleVisible) {
      report('CRITICAL', '01-lobby', 'Title "Undercover Mob Boss" not visible');
    }
    if (lobbyInfo.titleFontSize < 20) {
      report('MAJOR', '01-lobby', `Title font size ${lobbyInfo.titleFontSize}px — too small for table display`);
    }
  });

  test('02 — Game board (via election scenario)', async () => {
    // Load election scenario to get onto the game board
    await loadScenario(page, 'election');

    // Wait for game board to render
    await page.waitForSelector('.game-board', { timeout: 10_000 });
    // Wait for any entrance animations to finish
    await page.waitForTimeout(1500);

    await checkPolicyTracks(page, '02-game-board');
    await auditScreen(page, '02-game-board');
  });

  test('03 — Nomination overlay (nomination-pending)', async () => {
    // The election scenario starts with nomination-pending
    // The overlay should already be showing from the election scenario load
    // If not visible, reload the scenario
    const nominationVisible = await page.locator('.nomination-bar').isVisible({ timeout: 2000 }).catch(() => false);
    if (!nominationVisible) {
      await resetToLobby(page);
      await page.waitForTimeout(500);
      await loadScenario(page, 'election');
      await page.waitForTimeout(1500);
    }

    await auditScreen(page, '03-nomination');

    // Nomination-specific checks
    const nomInfo = await page.evaluate(() => {
      const mayorName = document.querySelector('.nomination-bar__name--mayor');
      const chiefName = document.querySelectorAll('.nomination-bar__name')[1];
      const status = document.querySelector('.nomination-bar__status');
      return {
        mayorVisible: mayorName ? mayorName.getBoundingClientRect().height > 0 : false,
        mayorFontSize: mayorName ? parseFloat(window.getComputedStyle(mayorName).fontSize) : 0,
        chiefVisible: chiefName ? chiefName.getBoundingClientRect().height > 0 : false,
        statusText: status?.textContent ?? '',
      };
    });

    if (!nomInfo.mayorVisible) {
      report('MAJOR', '03-nomination', 'Mayor name not visible in nomination bar');
    }
    if (nomInfo.mayorFontSize < 18) {
      report('MAJOR', '03-nomination', `Mayor name at ${nomInfo.mayorFontSize}px — should be large for table visibility`);
    }
  });

  test('04 — Policy session active overlay', async () => {
    await resetToLobby(page);
    await page.waitForTimeout(500);
    await loadScenario(page, 'policy-session');
    await page.waitForSelector('.game-board', { timeout: 10_000 });
    await page.waitForTimeout(1500);

    await auditScreen(page, '04-policy-session');

    // Check session status bar
    const barInfo = await page.evaluate(() => {
      const bar = document.querySelector('.session-status-bar');
      if (!bar) return null;
      const rect = bar.getBoundingClientRect();
      return {
        visible: rect.width > 0 && rect.height > 0,
        bottom: rect.bottom,
        viewportHeight: window.innerHeight,
        text: bar.textContent?.trim() ?? '',
      };
    });

    if (!barInfo) {
      report('MAJOR', '04-policy-session', 'Session status bar not found');
    } else if (!barInfo.visible) {
      report('MAJOR', '04-policy-session', 'Session status bar not visible');
    }
  });

  test('05 — Executive power: Investigation', async () => {
    await resetToLobby(page);
    await page.waitForTimeout(500);
    await loadScenario(page, 'investigation');
    await page.waitForTimeout(2000);

    await auditScreen(page, '05-investigation');

    // Check power overlay content
    const powerInfo = await page.evaluate(() => {
      const title = document.querySelector('.power-overlay__title');
      const art = document.querySelector('.power-overlay__art') as HTMLImageElement;
      const description = document.querySelector('.power-overlay__description');
      return {
        titleText: title?.textContent ?? '',
        titleFontSize: title ? parseFloat(window.getComputedStyle(title).fontSize) : 0,
        artVisible: art ? art.getBoundingClientRect().height > 0 : false,
        artNaturalWidth: art?.naturalWidth ?? 0,
        descText: description?.textContent ?? '',
      };
    });

    if (powerInfo.titleText !== 'Investigation') {
      report('MAJOR', '05-investigation', `Power title shows "${powerInfo.titleText}" instead of "Investigation"`);
    }
    if (powerInfo.artVisible && powerInfo.artNaturalWidth === 0) {
      report('MAJOR', '05-investigation', 'Power art image failed to load (broken image)');
    }
  });

  test('06 — Executive power: Execution', async () => {
    await resetToLobby(page);
    await page.waitForTimeout(500);
    await loadScenario(page, 'execution');
    await page.waitForTimeout(2000);

    await auditScreen(page, '06-execution');
  });

  test('07 — Executive power: Policy Peek', async () => {
    await resetToLobby(page);
    await page.waitForTimeout(500);
    await loadScenario(page, 'policy-peek');
    await page.waitForTimeout(2000);

    await auditScreen(page, '07-policy-peek');
  });

  test('08 — Executive power: Special Nomination', async () => {
    await resetToLobby(page);
    await page.waitForTimeout(500);
    await loadScenario(page, 'special-nomination');
    await page.waitForTimeout(2000);

    await auditScreen(page, '08-special-nomination');
  });

  test('09 — Game Over: Citizens win', async () => {
    await resetToLobby(page);
    await page.waitForTimeout(500);
    await loadScenario(page, 'game-over-citizens');
    await page.waitForTimeout(2500);

    await auditScreen(page, '09-game-over-citizens');

    // Game-over specific checks
    const goInfo = await page.evaluate(() => {
      const winner = document.querySelector('[data-test-id="host-game-over-winner"]');
      const reason = document.querySelector('[data-test-id="host-game-over-reason"]');
      const overlay = document.querySelector('.game-over-overlay');
      const playAgain = document.querySelector('.host-btn');
      const roleItems = document.querySelectorAll('.game-over-overlay [style*="border-bottom"]');
      return {
        winnerText: winner?.textContent ?? '',
        winnerFontSize: winner ? parseFloat(window.getComputedStyle(winner).fontSize) : 0,
        reasonText: reason?.textContent ?? '',
        overlayCoversScreen: overlay ? (() => {
          const rect = overlay.getBoundingClientRect();
          return rect.width >= window.innerWidth * 0.95 && rect.height >= window.innerHeight * 0.95;
        })() : false,
        playAgainVisible: playAgain ? playAgain.getBoundingClientRect().height > 0 : false,
        roleCount: roleItems.length,
      };
    });

    if (!goInfo.winnerText) {
      report('CRITICAL', '09-game-over-citizens', 'Winner text is empty');
    }
    if (goInfo.winnerFontSize < 24) {
      report('MAJOR', '09-game-over-citizens', `Winner text at ${goInfo.winnerFontSize}px — should be very large`);
    }
    if (!goInfo.overlayCoversScreen) {
      report('MAJOR', '09-game-over-citizens', 'Game over overlay does not cover the full screen');
    }
    if (!goInfo.playAgainVisible) {
      report('MAJOR', '09-game-over-citizens', 'Play Again button not visible');
    }
  });

  test('10 — Game Over: Mob wins', async () => {
    await resetToLobby(page);
    await page.waitForTimeout(500);
    await loadScenario(page, 'game-over-mob');
    await page.waitForTimeout(2500);

    await auditScreen(page, '10-game-over-mob');

    // Check mob-specific styling
    const mobInfo = await page.evaluate(() => {
      const winner = document.querySelector('[data-test-id="host-game-over-winner"]');
      const color = winner ? window.getComputedStyle(winner).color : '';
      return {
        winnerText: winner?.textContent ?? '',
        color,
      };
    });

    if (!mobInfo.winnerText.toLowerCase().includes('mob')) {
      report('MAJOR', '10-game-over-mob', `Winner text "${mobInfo.winnerText}" does not mention mob`);
    }
  });

  test('11 — Final summary: fail on critical issues', async () => {
    const criticals = allIssues.filter(i => i.severity === 'CRITICAL');

    // This test always runs to produce the final report
    // It fails if there are CRITICAL issues
    if (criticals.length > 0) {
      const summary = criticals.map(i => `  [${i.screen}] ${i.description}`).join('\n');
      expect(criticals.length, `Found ${criticals.length} CRITICAL UI issues:\n${summary}`).toBe(0);
    }
  });
});
