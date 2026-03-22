/**
 * UI Audit: Player Phone Views
 *
 * Hostile QA pass -- screenshots every player screen on iPhone 13 viewport
 * (390x844) and runs automated visual quality checks.
 *
 * Flow:
 *   Phase 1: Normal game start -> Lobby + Role Reveal screenshots.
 *   Phase 2: Fresh room. Load scenario from lobby, screenshot, DEV RESET
 *            back to lobby, repeat for each scenario.
 *
 *   Vincenz joins first => players[0] => mayor in all scenarios.
 */
import { test, expect, devices, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:5173';
const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);
const SCREENSHOT_DIR = path.join(_dirname, '..', '..', 'test-results', 'ui-audit', 'player');
const VIEWPORT = { width: 390, height: 844 }; // iPhone 13

// ── Issue tracking ──────────────────────────────────────────────────

interface Issue {
  screen: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description: string;
}

const allIssues: Issue[] = [];

function issue(screen: string, sev: Issue['severity'], desc: string): void {
  allIssues.push({ screen, severity: sev, description: desc });
}

// ── Helpers ─────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function clearDir(): void {
  ensureDir();
  for (const f of fs.readdirSync(SCREENSHOT_DIR)) fs.unlinkSync(path.join(SCREENSHOT_DIR, f));
}

async function snap(page: Page, name: string): Promise<void> {
  ensureDir();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
}

function uid(): string {
  return Date.now().toString(36).slice(-4).toUpperCase();
}

function makePlayerCtx(browser: any): Promise<BrowserContext> {
  return browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
  });
}

/** Load a scenario from the host lobby, wait for player to transition. */
async function loadScenario(host: Page, player: Page, scenario: string): Promise<void> {
  const sel = host.locator('[data-test-id="host-scenario-select"]');
  await sel.waitFor({ state: 'visible', timeout: 8_000 });
  await sel.selectOption(scenario);
  // Wait for state broadcast + crossfade transition (550ms in store.ts)
  await player.waitForTimeout(2500);
}

/** Reset by clicking DEV RESET and waiting for the lobby to remount.
 *  Falls back to navigating the host back to the room URL if DEV RESET fails. */
async function resetToLobby(host: Page, player: Page, roomCode: string): Promise<void> {
  // Try DEV RESET button first
  const resetBtn = host.locator('button:has-text("DEV RESET")');
  const vis = await resetBtn.isVisible({ timeout: 2_000 }).catch(() => false);
  if (vis) {
    await resetBtn.click();
    // Wait for host lobby to remount
    const lobbyOk = await host.locator('[data-test-id="host-scenario-select"]')
      .isVisible({ timeout: 6_000 }).catch(() => false);
    if (lobbyOk) {
      await player.waitForTimeout(1500);
      return;
    }
  }
  // Fallback: hard-navigate both pages back to the room
  await host.goto(`${BASE}/host?room=${roomCode}`);
  await host.waitForSelector('[data-test-id="host-scenario-select"]', { timeout: 10_000 });
  await player.goto(`${BASE}/?room=${roomCode}&name=Vincenz`);
  await player.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 10_000 });
  await player.waitForTimeout(500);
}

// ── Visual checks ───────────────────────────────────────────────────

async function checkOverflow(p: Page, s: string): Promise<void> {
  const { bw, vw } = await p.evaluate(() => ({ bw: document.body.scrollWidth, vw: window.innerWidth }));
  if (bw > vw + 1) issue(s, 'CRITICAL', `Horizontal overflow: body=${bw}px > viewport=${vw}px (+${bw - vw}px)`);
}

async function checkTruncation(p: Page, s: string): Promise<void> {
  const hits = await p.evaluate(() => {
    const r: string[] = [];
    for (const el of document.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement)) continue;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth)
        r.push(`"${el.textContent?.trim().slice(0, 40)}" (${el.className})`);
    }
    return r;
  });
  for (const h of hits) issue(s, 'MAJOR', `Truncated text: ${h}`);
}

async function checkTapTargets(p: Page, s: string): Promise<void> {
  const hits = await p.evaluate(() => {
    const r: string[] = [];
    for (const btn of document.querySelectorAll('button, [role="button"], .action-btn')) {
      if (!(btn instanceof HTMLElement)) continue;
      const cs = getComputedStyle(btn);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const b = btn.getBoundingClientRect();
      if (b.width > 0 && b.height > 0 && (b.width < 44 || b.height < 44))
        r.push(`"${btn.textContent?.trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}px`);
    }
    return r;
  });
  for (const h of hits) issue(s, 'CRITICAL', `Button < 44x44: ${h}`);
}

async function checkContrast(p: Page, s: string): Promise<void> {
  const hits = await p.evaluate(() => {
    const r: string[] = [];
    const lum = (rv: number, gv: number, bv: number) => {
      const [rs, gs, bs] = [rv, gv, bv].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    const parse = (c: string) => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] ? +m[4] : 1] as const : null; };
    for (const el of document.querySelectorAll('#app *')) {
      if (!(el instanceof HTMLElement)) continue;
      const t = el.textContent?.trim();
      if (!t || el.children.length > 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.3) continue;
      const fg = parse(cs.color), bg = parse(cs.backgroundColor);
      if (fg && bg && bg[3] > 0.5) {
        const fL = lum(fg[0], fg[1], fg[2]), bL = lum(bg[0], bg[1], bg[2]);
        const ratio = (Math.max(fL, bL) + 0.05) / (Math.min(fL, bL) + 0.05);
        if (ratio < 2.5) r.push(`"${t.slice(0, 30)}" ratio=${ratio.toFixed(1)} fg=${cs.color} bg=${cs.backgroundColor}`);
      }
    }
    return r;
  });
  for (const h of hits) issue(s, 'MAJOR', `Low contrast: ${h}`);
}

async function checkOverlaps(p: Page, s: string): Promise<void> {
  const hits = await p.evaluate(() => {
    const r: string[] = [];
    const sels = ['.glass-panel','.action-btn','.vote-card','.policy-card','.role-reveal-card','.game-over__panel','.player-picker','.veto-panel','.veto-art','h1','.waiting__message','.mini-board','.investigation-card'];
    const els: { el: Element; b: DOMRect; t: string }[] = [];
    for (const sel of sels) for (const m of document.querySelectorAll(sel)) {
      const b = m.getBoundingClientRect(); const cs = getComputedStyle(m);
      if (b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden')
        els.push({ el: m, b, t: `${sel}("${(m as HTMLElement).textContent?.trim().slice(0, 12) ?? ''}")` });
    }
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      if (els[i].el.contains(els[j].el) || els[j].el.contains(els[i].el)) continue;
      const a = els[i].b, b = els[j].b;
      const oa = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const sa = Math.min(a.width * a.height, b.width * b.height);
      if (sa > 0 && oa / sa > 0.2) r.push(`${els[i].t} overlaps ${els[j].t} by ${Math.round(oa / sa * 100)}%`);
    }
    return r;
  });
  for (const h of hits) issue(s, 'CRITICAL', `Overlap: ${h}`);
}

async function checkPanels(p: Page, s: string): Promise<void> {
  const hits = await p.evaluate(() => {
    const r: string[] = [];
    for (const panel of document.querySelectorAll('.glass-panel, .game-over__panel, .role-reveal-card, .investigation-card, .policy-card, .vote-card')) {
      if (!(panel instanceof HTMLElement)) continue;
      const cs = getComputedStyle(panel); const b = panel.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || b.width === 0 || b.height === 0) continue;
      const hasBorder = cs.borderWidth !== '0px' && cs.borderStyle !== 'none';
      const hasShadow = cs.boxShadow !== 'none' && cs.boxShadow !== '';
      const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
      if (!hasBorder && !hasShadow && !hasBg) r.push(`${panel.className.split(' ')[0]} floating (no border/shadow/bg)`);
    }
    return r;
  });
  for (const h of hits) issue(s, 'MAJOR', `Floating panel: ${h}`);
}

async function checkSmallText(p: Page, s: string): Promise<void> {
  const hits = await p.evaluate(() => {
    const r: string[] = [];
    for (const el of document.querySelectorAll('#app *')) {
      if (!(el instanceof HTMLElement)) continue;
      const t = el.textContent?.trim(); if (!t || el.children.length > 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      if (parseFloat(cs.fontSize) < 11) r.push(`"${t.slice(0, 30)}" at ${parseFloat(cs.fontSize)}px`);
    }
    return r;
  });
  for (const h of hits) issue(s, 'MAJOR', `Text < 11px: ${h}`);
}

async function audit(p: Page, s: string): Promise<void> {
  await checkOverflow(p, s);
  await checkTruncation(p, s);
  await checkTapTargets(p, s);
  await checkContrast(p, s);
  await checkOverlaps(p, s);
  await checkPanels(p, s);
  await checkSmallText(p, s);
}

// ── Test Suite ──────────────────────────────────────────────────────

test.describe('UI Audit: Player Phone Views', () => {
  test.setTimeout(300_000); // 5 min

  test('screenshot and audit every player screen', async ({ browser }) => {
    clearDir();
    const contexts: BrowserContext[] = [];

    try {
      // ============================================================
      // PHASE 1: Lobby + Role Reveal
      // ============================================================
      const roomA = 'UIA' + uid();

      const hostCtxA = await browser.newContext();
      contexts.push(hostCtxA);
      const hostA = await hostCtxA.newPage();
      await hostA.goto(`${BASE}/host?room=${roomA}`);
      await hostA.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

      const playerCtxA = await makePlayerCtx(browser);
      contexts.push(playerCtxA);
      const playerA = await playerCtxA.newPage();
      await playerA.goto(`${BASE}/?room=${roomA}&name=Vincenz`);
      await playerA.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });

      await hostA.locator('[data-test-id="host-bot-count"]').selectOption('5');
      await hostA.locator('[data-test-id="host-spawn-bots"]').click();
      await hostA.waitForTimeout(800);

      // 01. LOBBY
      await playerA.waitForTimeout(500);
      await snap(playerA, '01-lobby');
      await audit(playerA, 'lobby');

      // 02. ROLE REVEAL -- sealed
      await hostA.locator('[data-test-id="host-start-btn"]').click();
      await playerA.waitForSelector('[data-test-id="role-card"]', { timeout: 15_000 });
      await playerA.waitForTimeout(1200);
      await snap(playerA, '02-role-reveal-sealed');
      await audit(playerA, 'role-reveal-sealed');

      // 03. ROLE REVEAL -- opened
      await playerA.locator('[data-test-id="role-card"]').tap();
      await playerA.waitForTimeout(1200);
      await snap(playerA, '03-role-reveal-opened');
      await audit(playerA, 'role-reveal-opened');

      // ============================================================
      // PHASE 2: Scenario screens (fresh room, load from lobby)
      // ============================================================
      const roomB = 'UIB' + uid();

      const hostCtxB = await browser.newContext();
      contexts.push(hostCtxB);
      const hostB = await hostCtxB.newPage();
      await hostB.goto(`${BASE}/host?room=${roomB}`);
      await hostB.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

      const playerCtxB = await makePlayerCtx(browser);
      contexts.push(playerCtxB);
      const playerB = await playerCtxB.newPage();
      await playerB.goto(`${BASE}/?room=${roomB}&name=Vincenz`);
      await playerB.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });

      await hostB.locator('[data-test-id="host-bot-count"]').selectOption('5');
      await hostB.locator('[data-test-id="host-spawn-bots"]').click();
      await hostB.waitForTimeout(800);

      // Reusable: load scenario, wait, screenshot, audit, reset
      const doScenario = async (
        scenario: string,
        selector: string,
        screenshotName: string,
        auditLabel: string,
        extraWork?: (player: Page) => Promise<void>,
      ): Promise<boolean> => {
        await loadScenario(hostB, playerB, scenario);
        const vis = await playerB.locator(selector).isVisible({ timeout: 5_000 }).catch(() => false);
        if (vis) {
          await playerB.waitForTimeout(600);
          await snap(playerB, screenshotName);
          await audit(playerB, auditLabel);
          if (extraWork) await extraWork(playerB);
        } else {
          // Screenshot whatever is on screen as fallback
          await snap(playerB, `${screenshotName}-FALLBACK`);
          await audit(playerB, `${auditLabel}-FALLBACK`);
        }
        // Reset to lobby for next scenario
        await resetToLobby(hostB, playerB, roomB);
        return vis;
      };

      // 04. VOTE SCREEN
      // Election scenario: subPhase=election-voting. Everyone votes (including mayor).
      await doScenario('election', '[data-test-id="vote-approve"]', '04-vote-screen', 'vote-screen');

      // 05. MAYOR HAND (3 policy cards)
      // policy-session scenario: subPhase=policy-mayor-discard, Vincenz=mayor
      await doScenario('policy-session', '[data-test-id="mayor-hand"]', '05-mayor-hand', 'mayor-hand');

      // 06. VETO -- chief hand
      // veto scenario: subPhase=policy-chief-discard, chief=players[1]
      // Mayor (Vincenz) sees waiting while chief decides.
      // But we want the chief-hand screenshot. Vincenz isn't the chief.
      // Screenshot what the mayor sees (waiting).
      await doScenario('veto', '[data-test-id="waiting-message"]', '06-veto-mayor-waiting', 'veto-mayor-waiting');

      // 07. POLICY PEEK (mayor power)
      // policy-peek scenario: subPhase=policy-peek-viewing, Vincenz=mayor
      await doScenario('policy-peek', '[data-test-id="peek-cards"]', '07-policy-peek', 'policy-peek');

      // 08. INVESTIGATION PICKER (mayor power)
      const invOk = await doScenario('investigation', '[data-test-id="investigate-picker"]', '08-investigation-picker', 'investigation-picker',
        async (player) => {
          // Select a player and investigate to get investigation result
          const items = player.locator('[data-test-id="investigate-player"]');
          if (await items.count() > 0) {
            await items.first().click();
            await player.waitForTimeout(300);
            await snap(player, '08b-investigation-selected');

            await player.locator('[data-test-id="investigate-confirm"]').click();

            // 09. INVESTIGATION RESULT -- sealed
            const card = player.locator('[data-test-id="investigation-card"]');
            const cardVis = await card.isVisible({ timeout: 8_000 }).catch(() => false);
            if (cardVis) {
              await player.waitForTimeout(500);
              await snap(player, '09-investigation-result-sealed');
              await audit(player, 'investigation-result-sealed');

              // Tap to reveal
              await card.click();
              await player.waitForTimeout(1500);
              await snap(player, '09b-investigation-result-revealed');
              await audit(player, 'investigation-result-revealed');
            }
          }
        },
      );

      // 10. EXECUTION PICKER (mayor power)
      await doScenario('execution', '[data-test-id="execute-picker"]', '10-execution-picker', 'execution-picker');

      // 11. SPECIAL NOMINATION (mayor power)
      await doScenario('special-nomination', '[data-test-id="special-nominate-picker"]', '11-special-nomination', 'special-nomination');

      // 12. GAME OVER -- citizens
      await doScenario('game-over-citizens', '[data-test-id="game-over-winner"]', '12-game-over-citizens', 'game-over-citizens');

      // 13. GAME OVER -- mob
      await doScenario('game-over-mob', '[data-test-id="game-over-winner"]', '13-game-over-mob', 'game-over-mob');

      // 14. WAITING SCREEN (load veto -- mayor sees waiting while chief decides)
      await doScenario('veto', '[data-test-id="waiting-message"]', '14-waiting-screen', 'waiting-screen');

    } finally {
      for (const ctx of contexts) await ctx.close().catch(() => {});
    }

    // ================================================================
    // REPORT
    // ================================================================
    const critical = allIssues.filter(i => i.severity === 'CRITICAL');
    const major    = allIssues.filter(i => i.severity === 'MAJOR');
    const minor    = allIssues.filter(i => i.severity === 'MINOR');

    const sep = '='.repeat(70);
    console.log(`\n${sep}`);
    console.log('  UI AUDIT REPORT -- Player Phone Views (iPhone 13: 390x844)');
    console.log(sep);

    if (critical.length) {
      console.log(`\n  CRITICAL (${critical.length}):`);
      for (const i of critical) console.log(`    [${i.screen}] ${i.description}`);
    }
    if (major.length) {
      console.log(`\n  MAJOR (${major.length}):`);
      for (const i of major) console.log(`    [${i.screen}] ${i.description}`);
    }
    if (minor.length) {
      console.log(`\n  MINOR (${minor.length}):`);
      for (const i of minor) console.log(`    [${i.screen}] ${i.description}`);
    }
    if (!allIssues.length) {
      console.log('\n  All screens passed visual quality checks.');
    }

    console.log(`\n  Total: ${critical.length} critical, ${major.length} major, ${minor.length} minor`);
    console.log(`  Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`${sep}\n`);

    // Write text report
    const lines = [
      'UI AUDIT REPORT -- Player Phone Views (iPhone 13: 390x844)',
      `Date: ${new Date().toISOString()}`,
      '',
      `Total: ${allIssues.length} (${critical.length} critical, ${major.length} major, ${minor.length} minor)`,
      '',
    ];
    if (critical.length) { lines.push('CRITICAL:'); for (const i of critical) lines.push(`  [${i.screen}] ${i.description}`); lines.push(''); }
    if (major.length)    { lines.push('MAJOR:');    for (const i of major)    lines.push(`  [${i.screen}] ${i.description}`); lines.push(''); }
    if (minor.length)    { lines.push('MINOR:');    for (const i of minor)    lines.push(`  [${i.screen}] ${i.description}`); lines.push(''); }

    lines.push('SCREENSHOTS:');
    try {
      for (const f of fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort()) lines.push(`  ${f}`);
    } catch { /* empty */ }

    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'AUDIT-REPORT.txt'), lines.join('\n'));

    // Soft-fail on CRITICAL
    if (critical.length) {
      expect.soft(critical.length, `${critical.length} CRITICAL issues found`).toBe(0);
    }
  });
});
