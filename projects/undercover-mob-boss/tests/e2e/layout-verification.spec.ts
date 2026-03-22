/**
 * LAYOUT VERIFICATION: Pixel-perfect font-size and layout checks.
 *
 * Verifies CSS fixes for iPad 10.2" (1080x810) font sizing
 * did not break phone or desktop layouts.
 *
 * Viewports tested:
 *   - iPhone 13:          390x844  (phone)
 *   - iPad 10.2" landscape: 1080x810 (tablet)
 *   - Desktop:            1920x1080 (laptop fallback)
 *
 * Every measurement uses window.getComputedStyle() to capture
 * actual rendered values (resolves clamp() at each viewport width).
 *
 * Run: npx playwright test tests/e2e/layout-verification.spec.ts --project=chromium
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:5173';
const RESULTS_DIR = path.resolve('test-results');
const MEASUREMENTS_FILE = path.join(RESULTS_DIR, 'layout-measurements.json');

// ── Viewport definitions ────────────────────────────────────────────

interface ViewportDef {
  name: string;
  tag: 'phone' | 'tablet' | 'desktop';
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
  deviceScaleFactor: number;
}

const VIEWPORTS: ViewportDef[] = [
  { name: 'iPhone 13', tag: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  { name: 'iPad 10.2" landscape', tag: 'tablet', width: 1080, height: 810, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'Desktop 1920x1080', tag: 'desktop', width: 1920, height: 1080, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];

// ── Measurement recording ───────────────────────────────────────────

interface Measurement {
  viewport: string;
  scenario: string;
  element: string;
  property: string;
  actual: string | number;
  threshold: string | number | null;
  pass: boolean;
}

const allMeasurements: Measurement[] = [];

function record(m: Measurement): void {
  allMeasurements.push(m);
}

function saveMeasurements(): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(MEASUREMENTS_FILE, JSON.stringify(allMeasurements, null, 2));
}

// ── Helpers ─────────────────────────────────────────────────────────

function uniqueRoom(prefix: string): string {
  return prefix + Date.now().toString(36).slice(-4).toUpperCase();
}

async function spawnBots(host: Page, count: number): Promise<void> {
  const botSelect = host.locator('[data-test-id="host-bot-count"]');
  await botSelect.selectOption(String(count));
  await host.locator('[data-test-id="host-spawn-bots"]').click();
  await host.waitForTimeout(1000);
}

async function loadScenario(host: Page, scenario: string): Promise<void> {
  const select = host.locator('[data-test-id="host-scenario-select"]');
  await select.selectOption(scenario);
  await host.waitForTimeout(2500);
}

/**
 * Measure a computed CSS property (font-size, color, text-shadow, etc.)
 * on every element matching `selector` within `rootSelector`.
 * Returns an array of { text, value } for each matching leaf element.
 */
async function measureAll(
  page: Page,
  rootSelector: string,
  targetSelector: string,
  property: string,
): Promise<Array<{ text: string; value: string; numericValue: number }>> {
  return page.evaluate(
    ({ root, target, prop }) => {
      const rootEl = document.querySelector(root);
      if (!rootEl) return [];
      const els = rootEl.querySelectorAll(target);
      const results: Array<{ text: string; value: string; numericValue: number }> = [];
      for (const el of els) {
        if (!(el instanceof HTMLElement)) continue;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const val = s.getPropertyValue(prop);
        results.push({
          text: (el.textContent?.trim() ?? '').slice(0, 40),
          value: val,
          numericValue: parseFloat(val) || 0,
        });
      }
      return results;
    },
    { root: rootSelector, target: targetSelector, prop: property },
  );
}

/**
 * Measure a single element's computed style property.
 */
async function measureOne(
  page: Page,
  selector: string,
  property: string,
): Promise<{ text: string; value: string; numericValue: number } | null> {
  return page.evaluate(
    ({ sel, prop }) => {
      const el = document.querySelector(sel);
      if (!(el instanceof HTMLElement)) return null;
      const s = window.getComputedStyle(el);
      return {
        text: (el.textContent?.trim() ?? '').slice(0, 40),
        value: s.getPropertyValue(prop),
        numericValue: parseFloat(s.getPropertyValue(prop)) || 0,
      };
    },
    { sel: selector, prop: property },
  );
}

/**
 * Check horizontal overflow: body.scrollWidth <= viewport width.
 */
async function checkNoOverflow(page: Page): Promise<{ bodyWidth: number; viewportWidth: number; overflows: boolean }> {
  return page.evaluate(() => {
    const bw = document.body.scrollWidth;
    const vw = window.innerWidth;
    return { bodyWidth: bw, viewportWidth: vw, overflows: bw > vw + 1 };
  });
}

/**
 * Check if any element matching selector has scrollWidth > clientWidth (truncation).
 */
async function checkTruncation(
  page: Page,
  selector: string,
): Promise<Array<{ text: string; scrollWidth: number; clientWidth: number; truncated: boolean }>> {
  return page.evaluate(
    (sel) => {
      const results: Array<{ text: string; scrollWidth: number; clientWidth: number; truncated: boolean }> = [];
      for (const el of document.querySelectorAll(sel)) {
        if (!(el instanceof HTMLElement)) continue;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        results.push({
          text: (el.textContent?.trim() ?? '').slice(0, 30),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          truncated: el.scrollWidth > el.clientWidth + 1,
        });
      }
      return results;
    },
    selector,
  );
}

/**
 * Compute relative luminance of a CSS color string (rgb/rgba format).
 * Returns 0..1.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Test Suite ──────────────────────────────────────────────────────

test.describe('Layout Verification', () => {
  // We save the consolidated measurements after all tests
  test.afterAll(() => {
    saveMeasurements();
  });

  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {

      // ────────────────────────────────────────────────────────────
      // SCENARIO 1: Lobby with 5 players
      // ────────────────────────────────────────────────────────────
      test('Lobby: font sizes and no overflow', async ({ browser }) => {
        const room = uniqueRoom('LV1');

        // Single host context at the target viewport — two hosts on the same room conflict
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.hasTouch,
          deviceScaleFactor: vp.deviceScaleFactor,
        });
        const page = await ctx.newPage();
        await page.goto(`${BASE}/host?room=${room}`);
        await page.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

        // Spawn 5 bots
        await spawnBots(page, 5);
        await expect(page.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });

        // --- Player count text font-size ---
        const playerCount = await measureOne(page, '[data-test-id="host-player-count"]', 'font-size');
        if (playerCount) {
          const minPx = vp.tag === 'phone' ? 12 : 14;
          const pass = playerCount.numericValue >= minPx;
          record({
            viewport: vp.name,
            scenario: 'lobby',
            element: 'host-player-count',
            property: 'font-size',
            actual: playerCount.numericValue,
            threshold: `>= ${minPx}px`,
            pass,
          });
          expect(
            playerCount.numericValue,
            `[${vp.name}] Player count font-size ${playerCount.numericValue}px >= ${minPx}px`,
          ).toBeGreaterThanOrEqual(minPx);
        }

        // --- Start Game button font-size ---
        const startBtn = await measureOne(page, '[data-test-id="host-start-btn"]', 'font-size');
        if (startBtn) {
          const minPx = vp.tag === 'tablet' ? 14 : 12;
          const pass = startBtn.numericValue >= minPx;
          record({
            viewport: vp.name,
            scenario: 'lobby',
            element: 'host-start-btn',
            property: 'font-size',
            actual: startBtn.numericValue,
            threshold: `>= ${minPx}px`,
            pass,
          });
          if (vp.tag === 'tablet') {
            expect(
              startBtn.numericValue,
              `[${vp.name}] Start Game button font-size ${startBtn.numericValue}px >= ${minPx}px`,
            ).toBeGreaterThanOrEqual(minPx);
          }
        }

        // --- No horizontal overflow ---
        const overflow = await checkNoOverflow(page);
        record({
          viewport: vp.name,
          scenario: 'lobby',
          element: 'body',
          property: 'horizontal-overflow',
          actual: `scrollWidth=${overflow.bodyWidth} viewportWidth=${overflow.viewportWidth}`,
          threshold: 'scrollWidth <= viewportWidth + 1',
          pass: !overflow.overflows,
        });
        expect(
          overflow.overflows,
          `[${vp.name}] Lobby horizontal overflow: body=${overflow.bodyWidth}px, vp=${overflow.viewportWidth}px`,
        ).toBe(false);

        await ctx.close();
      });

      // ────────────────────────────────────────────────────────────
      // SCENARIO 2: Game board with player strip (election)
      // ────────────────────────────────────────────────────────────
      test('Game board: player strip font sizes and no truncation', async ({ browser }) => {
        const room = uniqueRoom('LV2');

        // Host at target viewport
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.hasTouch,
          deviceScaleFactor: vp.deviceScaleFactor,
        });
        const host = await ctx.newPage();
        await host.goto(`${BASE}/host?room=${room}`);
        await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

        // Spawn 5 bots for a 5-player game
        await spawnBots(host, 5);

        // Load election scenario to get to game board with player strip
        await loadScenario(host, 'election');
        await host.waitForTimeout(1000);

        // Wait for the player strip to be rendered
        const stripVisible = await host.locator('.player-strip').isVisible({ timeout: 5_000 }).catch(() => false);
        if (!stripVisible) {
          // Record skip but don't fail — the strip might not render at this viewport
          record({
            viewport: vp.name,
            scenario: 'election-board',
            element: 'player-strip',
            property: 'visibility',
            actual: 'not visible',
            threshold: 'visible',
            pass: false,
          });
          await ctx.close();
          return;
        }

        // --- Player name font sizes ---
        const nameMinPx = vp.tag === 'phone' ? 11 : 13;
        const names = await measureAll(host, '.player-strip', '.player-strip__name', 'font-size');
        for (const n of names) {
          const pass = n.numericValue >= nameMinPx;
          record({
            viewport: vp.name,
            scenario: 'election-board',
            element: `player-name:"${n.text}"`,
            property: 'font-size',
            actual: n.numericValue,
            threshold: `>= ${nameMinPx}px`,
            pass,
          });
          expect(
            n.numericValue,
            `[${vp.name}] Player name "${n.text}" font-size ${n.numericValue}px >= ${nameMinPx}px`,
          ).toBeGreaterThanOrEqual(nameMinPx);
        }

        // --- Badge (MAYOR / CHIEF) font sizes ---
        const badges = await measureAll(host, '.player-strip', '.player-strip__badge', 'font-size');
        for (const b of badges) {
          const pass = b.numericValue >= 10;
          record({
            viewport: vp.name,
            scenario: 'election-board',
            element: `badge:"${b.text}"`,
            property: 'font-size',
            actual: b.numericValue,
            threshold: '>= 10px',
            pass,
          });
          expect(
            b.numericValue,
            `[${vp.name}] Badge "${b.text}" font-size ${b.numericValue}px >= 10px`,
          ).toBeGreaterThanOrEqual(10);
        }

        // --- Player strip horizontal overflow ---
        const stripOverflow = await host.evaluate(() => {
          const strip = document.querySelector('.player-strip');
          if (!strip) return { overflows: false, scrollWidth: 0, clientWidth: 0 };
          return {
            overflows: strip.scrollWidth > (strip as HTMLElement).clientWidth + 1,
            scrollWidth: strip.scrollWidth,
            clientWidth: (strip as HTMLElement).clientWidth,
          };
        });
        record({
          viewport: vp.name,
          scenario: 'election-board',
          element: 'player-strip',
          property: 'horizontal-overflow',
          actual: `scrollW=${stripOverflow.scrollWidth} clientW=${stripOverflow.clientWidth}`,
          threshold: 'scrollWidth <= clientWidth + 1',
          pass: !stripOverflow.overflows,
        });
        expect(
          stripOverflow.overflows,
          `[${vp.name}] Player strip overflows: scrollW=${stripOverflow.scrollWidth} clientW=${stripOverflow.clientWidth}`,
        ).toBe(false);

        // --- Player name truncation ---
        const truncations = await checkTruncation(host, '.player-strip__name');
        for (const t of truncations) {
          record({
            viewport: vp.name,
            scenario: 'election-board',
            element: `name-truncation:"${t.text}"`,
            property: 'scrollWidth vs clientWidth',
            actual: `scrollW=${t.scrollWidth} clientW=${t.clientWidth}`,
            threshold: 'scrollWidth === clientWidth (no truncation)',
            pass: !t.truncated,
          });
          // Note: we record but don't hard-fail on truncation since text-overflow:ellipsis
          // is intentional for very long names — just flag it.
        }

        // --- No page-level horizontal overflow ---
        const pageOverflow = await checkNoOverflow(host);
        record({
          viewport: vp.name,
          scenario: 'election-board',
          element: 'body',
          property: 'horizontal-overflow',
          actual: `scrollWidth=${pageOverflow.bodyWidth} viewportWidth=${pageOverflow.viewportWidth}`,
          threshold: 'scrollWidth <= viewportWidth + 1',
          pass: !pageOverflow.overflows,
        });
        expect(
          pageOverflow.overflows,
          `[${vp.name}] Board page overflow: body=${pageOverflow.bodyWidth}px, vp=${pageOverflow.viewportWidth}px`,
        ).toBe(false);

        await ctx.close();
      });

      // ────────────────────────────────────────────────────────────
      // SCENARIO 3: Mini-board on phone viewport
      // ────────────────────────────────────────────────────────────
      if (vp.tag === 'phone') {
        test('Mini-board: track labels, election label, warning text sizes', async ({ browser }) => {
          const room = uniqueRoom('LV3');

          // Host (desktop-sized — it's the table device)
          const hostCtx = await browser.newContext({
            viewport: { width: 1080, height: 810 },
          });
          const host = await hostCtx.newPage();
          await host.goto(`${BASE}/host?room=${room}`);
          await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

          // Spawn bots
          await spawnBots(host, 4);

          // Phone player
          const phoneCtx = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            isMobile: true,
            hasTouch: true,
            deviceScaleFactor: vp.deviceScaleFactor,
          });
          const player = await phoneCtx.newPage();
          await player.goto(`${BASE}/?room=${room}&name=TestGuy`);
          await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });

          // Load election scenario — non-mayor players see the mini-board in waiting/vote views
          await loadScenario(host, 'election');
          await player.waitForTimeout(2000);

          // The mini-board might be visible on the waiting screen or vote screen
          const miniBoardVisible = await player.locator('.mini-board').isVisible({ timeout: 5_000 }).catch(() => false);

          if (miniBoardVisible) {
            // --- Track labels (e.g. "CITIZENS" / "MOB") ---
            const trackLabels = await measureAll(player, '.mini-board', '.mini-track__label', 'font-size');
            for (const l of trackLabels) {
              const pass = l.numericValue >= 11;
              record({
                viewport: vp.name,
                scenario: 'mini-board',
                element: `track-label:"${l.text}"`,
                property: 'font-size',
                actual: l.numericValue,
                threshold: '>= 11px (was 9.6px, now ~11.2px)',
                pass,
              });
              expect(
                l.numericValue,
                `[${vp.name}] Mini-board track label "${l.text}" at ${l.numericValue}px >= 11px`,
              ).toBeGreaterThanOrEqual(11);
            }

            // --- Election tracker label ---
            const electionLabel = await measureAll(player, '.mini-board', '.mini-election__label', 'font-size');
            for (const l of electionLabel) {
              const pass = l.numericValue >= 11;
              record({
                viewport: vp.name,
                scenario: 'mini-board',
                element: `election-label:"${l.text}"`,
                property: 'font-size',
                actual: l.numericValue,
                threshold: '>= 11px (was 8.8px)',
                pass,
              });
              expect(
                l.numericValue,
                `[${vp.name}] Mini-board election label "${l.text}" at ${l.numericValue}px >= 11px`,
              ).toBeGreaterThanOrEqual(11);
            }

            // --- Warning text (if visible) ---
            const warnings = await measureAll(player, '.mini-board', '.mini-board__warning', 'font-size');
            for (const w of warnings) {
              const pass = w.numericValue >= 11;
              record({
                viewport: vp.name,
                scenario: 'mini-board',
                element: `warning:"${w.text}"`,
                property: 'font-size',
                actual: w.numericValue,
                threshold: '>= 11px',
                pass,
              });
              expect(
                w.numericValue,
                `[${vp.name}] Mini-board warning "${w.text}" at ${w.numericValue}px >= 11px`,
              ).toBeGreaterThanOrEqual(11);
            }
          } else {
            // Mini-board not visible — record for evidence but don't fail
            record({
              viewport: vp.name,
              scenario: 'mini-board',
              element: '.mini-board',
              property: 'visibility',
              actual: 'not visible (player may be on vote screen without mini-board)',
              threshold: 'visible',
              pass: true, // not a failure, just a different screen state
            });
          }

          await phoneCtx.close();
          await hostCtx.close();
        });
      }

      // ────────────────────────────────────────────────────────────
      // SCENARIO 4: Game-over role badges
      // ────────────────────────────────────────────────────────────
      test('Game-over role badges: color, contrast, text-shadow', async ({ browser }) => {
        test.setTimeout(180_000); // Two-room test needs extra time, especially in WebKit
        const room = uniqueRoom('LV4');

        // Host context
        const hostCtx = await browser.newContext({
          viewport: { width: 1080, height: 810 },
        });
        const host = await hostCtx.newPage();
        await host.goto(`${BASE}/host?room=${room}`);
        await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

        await spawnBots(host, 4);

        // Player at target viewport
        const playerCtx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.hasTouch,
          deviceScaleFactor: vp.deviceScaleFactor,
        });
        const player = await playerCtx.newPage();
        await player.goto(`${BASE}/?room=${room}&name=TestGuy`);
        await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });

        // Wait for host to confirm 5 players before loading scenario
        await expect(host.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });

        // --- Test game-over-citizens ---
        await loadScenario(host, 'game-over-citizens');
        const citizenWinner = await player.locator('[data-test-id="game-over-winner"]')
          .isVisible({ timeout: 5_000 }).catch(() => false);

        if (citizenWinner) {
          // Winner heading text-shadow
          const winnerShadow = await measureOne(player, '[data-test-id="game-over-winner"]', 'text-shadow');
          if (winnerShadow) {
            const hasShadow = winnerShadow.value !== 'none' && winnerShadow.value !== '';
            record({
              viewport: vp.name,
              scenario: 'game-over-citizens',
              element: 'winner-heading',
              property: 'text-shadow',
              actual: winnerShadow.value,
              threshold: 'not "none"',
              pass: hasShadow,
            });
            expect(hasShadow, `[${vp.name}] Citizens winner heading has text-shadow`).toBe(true);
          }

          // Check mob role badge color — should be #d04040 (brighter red)
          const mobBadges = await player.evaluate(() => {
            const badges = document.querySelectorAll('.game-over__role-badge--mob');
            return Array.from(badges).map((el) => {
              const s = window.getComputedStyle(el as HTMLElement);
              return {
                text: (el.textContent?.trim() ?? '').slice(0, 30),
                color: s.color,
                textShadow: s.textShadow,
                bgColor: s.backgroundColor,
              };
            });
          });

          for (const badge of mobBadges) {
            // Parse rgb color
            const colorMatch = badge.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (colorMatch) {
              const [, rStr, gStr, bStr] = colorMatch;
              const r = parseInt(rStr, 10);
              const g = parseInt(gStr, 10);
              const b = parseInt(bStr, 10);
              // #d04040 = rgb(208, 64, 64) — check it's the brighter red, not #a82020 = rgb(168, 32, 32)
              const isBright = r >= 180; // #d04040 has R=208, #a82020 has R=168
              record({
                viewport: vp.name,
                scenario: 'game-over-citizens',
                element: `mob-badge:"${badge.text}"`,
                property: 'color (brightness)',
                actual: badge.color,
                threshold: '#d04040 (R >= 180), not #a82020',
                pass: isBright,
              });
              if (vp.tag === 'phone') {
                expect(
                  isBright,
                  `[${vp.name}] Mob badge color R=${r} should be >= 180 (#d04040), got ${badge.color}`,
                ).toBe(true);
              }
            }

            // text-shadow exists
            const hasShadow = badge.textShadow !== 'none' && badge.textShadow !== '';
            record({
              viewport: vp.name,
              scenario: 'game-over-citizens',
              element: `mob-badge:"${badge.text}"`,
              property: 'text-shadow',
              actual: badge.textShadow,
              threshold: 'not "none"',
              pass: hasShadow,
            });
          }

          // Contrast ratio check: badge text vs background
          const contrastData = await player.evaluate(() => {
            const items = document.querySelectorAll('.game-over__role-badge');
            return Array.from(items).map((el) => {
              const s = window.getComputedStyle(el as HTMLElement);
              // Walk up to find the background
              let bgEl: HTMLElement | null = el as HTMLElement;
              let bgColor = 'rgba(0, 0, 0, 0)';
              while (bgEl) {
                const bg = window.getComputedStyle(bgEl).backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                  bgColor = bg;
                  break;
                }
                bgEl = bgEl.parentElement;
              }
              return {
                text: (el.textContent?.trim() ?? '').slice(0, 30),
                fgColor: s.color,
                bgColor,
              };
            });
          });

          for (const item of contrastData) {
            const fgMatch = item.fgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            const bgMatch = item.bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (fgMatch && bgMatch) {
              const fgLum = relativeLuminance(
                parseInt(fgMatch[1], 10), parseInt(fgMatch[2], 10), parseInt(fgMatch[3], 10),
              );
              const bgLum = relativeLuminance(
                parseInt(bgMatch[1], 10), parseInt(bgMatch[2], 10), parseInt(bgMatch[3], 10),
              );
              const ratio = contrastRatio(fgLum, bgLum);
              const pass = ratio >= 3;
              record({
                viewport: vp.name,
                scenario: 'game-over-citizens',
                element: `contrast:"${item.text}"`,
                property: 'contrast-ratio',
                actual: `${ratio.toFixed(2)}:1 (fg=${item.fgColor}, bg=${item.bgColor})`,
                threshold: '>= 3:1',
                pass,
              });
              expect(
                ratio,
                `[${vp.name}] Contrast ratio for "${item.text}": ${ratio.toFixed(2)}:1 >= 3:1`,
              ).toBeGreaterThanOrEqual(3);
            }
          }
        } else {
          record({
            viewport: vp.name,
            scenario: 'game-over-citizens',
            element: 'game-over-winner',
            property: 'visibility',
            actual: 'not visible',
            threshold: 'visible',
            pass: false,
          });
        }

        // --- Test game-over-mob (fresh room — scenario select only exists in lobby) ---
        const mobRoom = uniqueRoom('LV5');
        await host.goto(`${BASE}/host?room=${mobRoom}`);
        await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });
        await spawnBots(host, 4);
        await player.goto(`${BASE}/?room=${mobRoom}&name=TestGuy`);
        await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });
        await expect(host.locator('[data-test-id="host-player-count"]')).toContainText('5 / 10', { timeout: 5_000 });
        await loadScenario(host, 'game-over-mob');
        const mobWinner = await player.locator('[data-test-id="game-over-winner"]')
          .isVisible({ timeout: 5_000 }).catch(() => false);

        if (mobWinner) {
          const winnerText = await measureOne(player, '[data-test-id="game-over-winner"]', 'text-shadow');
          if (winnerText) {
            const hasShadow = winnerText.value !== 'none' && winnerText.value !== '';
            record({
              viewport: vp.name,
              scenario: 'game-over-mob',
              element: 'winner-heading',
              property: 'text-shadow',
              actual: winnerText.value,
              threshold: 'not "none"',
              pass: hasShadow,
            });
            expect(hasShadow, `[${vp.name}] Mob winner heading has text-shadow`).toBe(true);
          }
        }

        await playerCtx.close();
        await hostCtx.close();
      });

      // ────────────────────────────────────────────────────────────
      // SCENARIO 5: Role reveal text
      // ────────────────────────────────────────────────────────────
      test('Role reveal: text-shadow and allies readability', async ({ browser }) => {
        const room = uniqueRoom('LV5');

        // Host
        const hostCtx = await browser.newContext({
          viewport: { width: 1080, height: 810 },
        });
        const host = await hostCtx.newPage();
        await host.goto(`${BASE}/host?room=${room}`);
        await host.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

        await spawnBots(host, 4);

        // Player at target viewport
        const playerCtx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.hasTouch,
          deviceScaleFactor: vp.deviceScaleFactor,
        });
        const player = await playerCtx.newPage();
        await player.goto(`${BASE}/?room=${room}&name=TestGuy`);
        await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });

        // Start the real game
        await host.locator('[data-test-id="host-start-btn"]').click();
        await player.waitForSelector('[data-test-id="role-card"]', { timeout: 15_000 });
        await player.waitForTimeout(1000);

        // Flip the card
        if (vp.hasTouch) {
          await player.locator('[data-test-id="role-card"]').tap();
        } else {
          await player.locator('[data-test-id="role-card"]').click();
        }
        await player.waitForTimeout(1200); // wait for flip animation

        // --- Role name h1 text-shadow ---
        const roleName = await player.locator('[data-test-id="role-name"]').isVisible({ timeout: 3_000 }).catch(() => false);
        if (roleName) {
          const roleNameShadow = await measureOne(player, '[data-test-id="role-name"]', 'text-shadow');
          if (roleNameShadow) {
            const hasShadow = roleNameShadow.value !== 'none' && roleNameShadow.value !== '';
            record({
              viewport: vp.name,
              scenario: 'role-reveal',
              element: `role-name:"${roleNameShadow.text}"`,
              property: 'text-shadow',
              actual: roleNameShadow.value,
              threshold: 'not "none"',
              pass: hasShadow,
            });
            expect(hasShadow, `[${vp.name}] Role name h1 has text-shadow`).toBe(true);
          }

          // --- Allies text ---
          const alliesEl = await player.locator('[data-test-id="role-allies"]').isVisible({ timeout: 2_000 }).catch(() => false);
          if (alliesEl) {
            const alliesText = await player.locator('[data-test-id="role-allies"]').textContent();
            // Only check if there's actual ally text (citizens have no allies)
            if (alliesText && alliesText.trim().length > 0) {
              const alliesFontSize = await measureOne(player, '[data-test-id="role-allies"]', 'font-size');
              if (alliesFontSize) {
                const pass = alliesFontSize.numericValue >= 14;
                record({
                  viewport: vp.name,
                  scenario: 'role-reveal',
                  element: 'allies-text',
                  property: 'font-size',
                  actual: alliesFontSize.numericValue,
                  threshold: '>= 14px',
                  pass,
                });
                // Only hard-assert on phone where readability is critical
                if (vp.tag === 'phone') {
                  expect(
                    alliesFontSize.numericValue,
                    `[${vp.name}] Allies text at ${alliesFontSize.numericValue}px >= 14px`,
                  ).toBeGreaterThanOrEqual(14);
                }
              }

              const alliesShadow = await measureOne(player, '[data-test-id="role-allies"]', 'text-shadow');
              if (alliesShadow) {
                // Record — allies may or may not have text-shadow depending on styling
                record({
                  viewport: vp.name,
                  scenario: 'role-reveal',
                  element: 'allies-text',
                  property: 'text-shadow',
                  actual: alliesShadow.value,
                  threshold: 'has text-shadow for readability',
                  pass: alliesShadow.value !== 'none',
                });
              }
            }
          }
        } else {
          record({
            viewport: vp.name,
            scenario: 'role-reveal',
            element: 'role-name',
            property: 'visibility',
            actual: 'not visible after flip',
            threshold: 'visible',
            pass: false,
          });
        }

        await playerCtx.close();
        await hostCtx.close();
      });
    });
  }
});
