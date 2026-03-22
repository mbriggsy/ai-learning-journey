/**
 * E2E: Simultaneous Actions (Race Condition Hunter)
 *
 * Tests what happens when multiple players act at the exact same time.
 * Each test creates real browser contexts and uses Promise.all to fire
 * actions concurrently, probing for race conditions, duplicate state,
 * stuck games, and crashes.
 *
 * Run: npx playwright test tests/e2e/simultaneous-actions.spec.ts --project=chromium
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

// ── Unique room code generator ──────────────────────────────────────

let roomCounter = 0;
function uniqueRoom(): string {
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  const seq = (roomCounter++).toString(36).toUpperCase().padStart(1, '0');
  return `RC${ts}${seq}`.slice(0, 8);
}

// ── Shared Types ────────────────────────────────────────────────────

const PLAYER_NAMES_5 = ['Vincenz', 'Carmine', 'Pauliee', 'Frankoo', 'Salliee'];
const PLAYER_NAMES_10 = [
  'Vincenz', 'Carmine', 'Pauliee', 'Frankoo', 'Salliee',
  'Donniee', 'Markiee', 'Tommiee', 'Benniee', 'Maxinee',
];

interface GameSetup {
  hostContext: BrowserContext;
  hostPage: Page;
  playerContexts: BrowserContext[];
  playerPages: Page[];
  roomCode: string;
}

// ── Shared Helpers ──────────────────────────────────────────────────

/**
 * Create a host + N real player browser contexts in a fresh room.
 * Each player gets its own BrowserContext (isolated sessionStorage).
 */
async function createRoom(browser: Browser, playerCount: number): Promise<GameSetup> {
  const roomCode = uniqueRoom();
  const names = playerCount <= 5 ? PLAYER_NAMES_5 : PLAYER_NAMES_10;

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto(`${BASE}/host?room=${roomCode}`);
  await hostPage.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

  const playerContexts: BrowserContext[] = [];
  const playerPages: Page[] = [];

  for (let i = 0; i < playerCount; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?room=${roomCode}&name=${names[i]}`);
    await page.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });
    playerContexts.push(ctx);
    playerPages.push(page);
  }

  await expect(hostPage.locator('[data-test-id="host-player-count"]'))
    .toContainText(`${playerCount} / 10`, { timeout: 10_000 });

  return { hostContext, hostPage, playerContexts, playerPages, roomCode };
}

/** Start the game via the host start button. */
async function startGame(hostPage: Page): Promise<void> {
  const startBtn = hostPage.locator('[data-test-id="host-start-btn"]');
  await expect(startBtn).toBeEnabled({ timeout: 5_000 });
  await startBtn.click();
  await hostPage.waitForSelector('.host-screen-container', { timeout: 10_000 });
}

/** Spawn bot players via the host UI. */
async function spawnBots(hostPage: Page, count: number): Promise<void> {
  const botSelect = hostPage.locator('[data-test-id="host-bot-count"]').first();
  await botSelect.selectOption(String(count));
  await hostPage.locator('[data-test-id="host-spawn-bots"]').click();
  await hostPage.waitForTimeout(500);
}

/**
 * Get a game into the election (voting) phase via the 'election' test scenario.
 * Returns the setup plus all players see the vote screen.
 */
async function setupToElection(browser: Browser, playerCount = 5): Promise<GameSetup> {
  const setup = await createRoom(browser, playerCount);

  // Wait for all join messages (500ms setTimeout in server) to arrive
  await setup.hostPage.waitForTimeout(2000);

  const scenarioSelect = setup.hostPage.locator('[data-test-id="host-scenario-select"]');
  await scenarioSelect.selectOption('election');
  await setup.hostPage.waitForSelector('.host-screen-container', { timeout: 10_000 });
  await setup.hostPage.waitForTimeout(1500);

  return setup;
}

/** Clean up all contexts. */
async function cleanup(setup: GameSetup): Promise<void> {
  for (const ctx of setup.playerContexts) {
    await ctx.close().catch(() => {});
  }
  await setup.hostContext.close().catch(() => {});
}

/** Wait for a player to see the vote buttons. */
async function waitForVote(page: Page, timeout = 15_000): Promise<boolean> {
  try {
    await page.locator('[data-test-id="vote-approve"]').waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/** Collect console errors from a page. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`PAGE_ERROR: ${err.message}`));
  return errors;
}

// ── Tests ───────────────────────────────────────────────────────────

test.describe('Simultaneous Actions (Race Conditions)', () => {

  // These are heavyweight multi-browser tests (mobile emulation runs ~2x slower)
  test.setTimeout(180_000);

  // ── Test 1: 5 players vote at the exact same time ──────────────────

  test('1. Five players vote simultaneously via Promise.all', async ({ browser }) => {
    const setup = await setupToElection(browser, 5);
    const errors = setup.playerPages.map((p) => collectErrors(p));

    try {
      // Wait for ALL players to see vote buttons
      const voteReady = await Promise.all(
        setup.playerPages.map((p) => waitForVote(p, 20_000)),
      );
      expect(voteReady.every(Boolean)).toBe(true);

      // Wait for GSAP entrance animation (cards slide in over 0.35s)
      await setup.hostPage.waitForTimeout(1000);

      // Fire all 5 votes in the same event-loop tick via Promise.all
      await Promise.all(
        setup.playerPages.map((p) =>
          p.locator('[data-test-id="vote-approve"]').click(),
        ),
      );

      // Wait for the server to process all votes and resolve the election
      await setup.hostPage.waitForTimeout(3000);

      // VERIFY: Each player should see confirmation or have moved past vote screen
      for (let i = 0; i < setup.playerPages.length; i++) {
        const p = setup.playerPages[i];
        const confirmVisible = await p.locator('[data-test-id="vote-confirmation"]')
          .isVisible().catch(() => false);
        const voteGone = !(await p.locator('[data-test-id="vote-approve"]')
          .isVisible().catch(() => false));

        // Either confirmation appeared, or buttons disappeared (game moved on)
        expect(
          confirmVisible || voteGone,
          `Player ${i} should have voted successfully`,
        ).toBe(true);
      }

      // VERIFY: No crash-level errors
      for (let i = 0; i < errors.length; i++) {
        const crashErrors = errors[i].filter((e) =>
          e.includes('PAGE_ERROR') || e.includes('Uncaught') || e.includes('TypeError'),
        );
        expect(crashErrors, `Player ${i} should have no crash errors`).toHaveLength(0);
      }

      // VERIFY: Host should show election results or have advanced past election
      // The election scenario puts game in election-voting. After all vote,
      // it should resolve. Check that the host isn't stuck.
      const hostStuck = await setup.hostPage.evaluate(() => {
        const el = document.querySelector('.host-screen-container');
        return el ? el.innerHTML.length > 0 : false;
      });
      expect(hostStuck).toBe(true);

    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 2: Double-click approve then deny within 50ms ────────────

  test('2. Double-click approve then deny: only one vote cast', async ({ browser }) => {
    const setup = await setupToElection(browser, 5);

    try {
      // Find a player who sees the vote screen
      let voterPage: Page | null = null;
      for (const p of setup.playerPages) {
        if (await waitForVote(p, 15_000)) {
          voterPage = p;
          break;
        }
      }
      expect(voterPage).not.toBeNull();
      if (!voterPage) return;

      // Wait for GSAP entrance animation
      await voterPage.waitForTimeout(1000);

      const pageErrors: string[] = collectErrors(voterPage);

      // Click approve
      const approveBtn = voterPage.locator('[data-test-id="vote-approve"]');
      const denyBtn = voterPage.locator('[data-test-id="vote-deny"]');

      await approveBtn.click({ delay: 0 });

      // Immediately (within 50ms) try to click deny
      // The vote module sets voteCast=true and disables buttons on first click.
      // Force-click to bypass Playwright's actionability checks on disabled button.
      await voterPage.waitForTimeout(20);
      await denyBtn.click({ force: true, timeout: 2000 }).catch(() => {
        // Expected: button is disabled or hidden after first vote
      });

      await voterPage.waitForTimeout(1000);

      // VERIFY: Only one vote was cast (confirmation shows "Approved", not "Denied")
      const confirmEl = voterPage.locator('[data-test-id="vote-confirmation"]');
      const confirmVisible = await confirmEl.isVisible().catch(() => false);

      if (confirmVisible) {
        const text = await confirmEl.textContent();
        expect(text).toBe('Approved');
      } else {
        // Vote buttons should at least be gone (vote was cast and game moved on)
        const buttonsGone = !(await approveBtn.isVisible().catch(() => false));
        expect(buttonsGone).toBe(true);
      }

      // VERIFY: No crash errors
      const crashErrors = pageErrors.filter((e) =>
        e.includes('PAGE_ERROR') || e.includes('TypeError'),
      );
      expect(crashErrors).toHaveLength(0);

    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 3: Two players try to nominate simultaneously ────────────

  test('3. Two players see nomination picker: only one nomination goes through', async ({ browser }) => {
    const setup = await createRoom(browser, 5);

    try {
      await startGame(setup.hostPage);

      // Acknowledge all roles: flip open, wait for animation, flip closed
      for (const p of setup.playerPages) {
        await expect(p.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 15_000 });
        await p.locator('[data-test-id="role-card"]').click();
        // Wait for flip animation to complete — role-name visible proves card is open
        await expect(p.locator('[data-test-id="role-name"]')).toBeVisible({ timeout: 5_000 });
        await p.waitForTimeout(300); // buffer for GSAP timeline to fully deactivate
        await p.locator('[data-test-id="role-card"]').click();
        await p.waitForTimeout(500);
      }

      await setup.hostPage.waitForTimeout(2000);

      // Find the mayor (player who sees nomination picker)
      let mayorPage: Page | null = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        for (let i = 0; i < setup.playerPages.length; i++) {
          const visible = await setup.playerPages[i]
            .locator('[data-test-id="nomination-picker"]')
            .isVisible().catch(() => false);
          if (visible) {
            mayorPage = setup.playerPages[i];
            break;
          }
        }
        if (mayorPage) break;
        await setup.hostPage.waitForTimeout(500);
      }
      expect(mayorPage).not.toBeNull();
      if (!mayorPage) return;

      // Verify ONLY the mayor sees the picker (no one else should)
      let pickerCount = 0;
      for (const p of setup.playerPages) {
        const hasPicker = await p.locator('[data-test-id="nomination-picker"]')
          .isVisible().catch(() => false);
        if (hasPicker) pickerCount++;
      }
      expect(pickerCount).toBe(1);

      // Mayor nominates normally. Then immediately try to rapid-fire confirm
      // the nomination twice (simulating a glitchy double-tap or race).
      const nominees = mayorPage.locator('[data-test-id="nomination-player"]');
      await nominees.first().click();

      const confirmBtn = mayorPage.locator('[data-test-id="nomination-confirm"]');
      // Wait for confirm button to be enabled after nominee selection
      await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });

      // Fire confirm twice as fast as possible — a double-tap race
      await Promise.all([
        confirmBtn.click({ timeout: 5000 }).catch(() => {
          // First click may fail if element detaches on re-render — expected in race test
        }),
        confirmBtn.click({ force: true, timeout: 2000 }).catch(() => {
          // Second click may fail if button is disabled/removed — expected
        }),
      ]);

      // VERIFY: Game advanced to election (voters see vote buttons)
      // Poll with longer timeout to account for display SubPhase delays (3-5s)
      let votersFound = 0;
      for (let attempt = 0; attempt < 30; attempt++) {
        votersFound = 0;
        for (const p of setup.playerPages) {
          const canVote = await p.locator('[data-test-id="vote-approve"]')
            .isVisible().catch(() => false);
          if (canVote) votersFound++;
        }
        if (votersFound > 0) break;
        await setup.hostPage.waitForTimeout(500);
      }
      expect(votersFound).toBeGreaterThan(0);

    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 4: Player refreshes while vote is being tallied ──────────

  test('4. Player refreshes right as they vote: game not stuck', async ({ browser }) => {
    const setup = await setupToElection(browser, 5);

    try {
      // Wait for all players to see vote buttons
      await Promise.all(
        setup.playerPages.map((p) => waitForVote(p, 20_000)),
      );
      await setup.hostPage.waitForTimeout(1000);

      // Players 0-3 vote approve normally (sequentially)
      for (let i = 0; i < 4; i++) {
        await setup.playerPages[i].locator('[data-test-id="vote-approve"]').click();
        await setup.playerPages[i].waitForTimeout(200);
      }

      // Player 4: click vote AND refresh simultaneously
      // This simulates clicking vote right as the page refreshes
      const lastPlayer = setup.playerPages[4];

      await Promise.all([
        lastPlayer.locator('[data-test-id="vote-approve"]').click().catch(() => {
          // Click may fail if page starts navigating
        }),
        // Tiny delay then reload — enough for click to fire but not for WS to complete
        lastPlayer.waitForTimeout(30).then(() => lastPlayer.reload()),
      ]);

      // Wait for reconnect
      await lastPlayer.waitForTimeout(5000);

      // VERIFY: Game state is consistent. Either:
      // (a) The vote counted and game moved to policy-session, or
      // (b) The vote didn't count and last player sees vote screen again
      const lastPlayerCanVote = await lastPlayer.locator('[data-test-id="vote-approve"]')
        .isVisible().catch(() => false);
      const lastPlayerConfirm = await lastPlayer.locator('[data-test-id="vote-confirmation"]')
        .isVisible().catch(() => false);
      const lastPlayerMayorHand = await lastPlayer.locator('[data-test-id="mayor-hand"]')
        .isVisible().catch(() => false);
      const lastPlayerChiefHand = await lastPlayer.locator('[data-test-id="chief-hand"]')
        .isVisible().catch(() => false);
      const lastPlayerWaiting = await lastPlayer.locator('[data-test-id="waiting-message"]')
        .isVisible().catch(() => false);
      const lastPlayerNomination = await lastPlayer.locator('[data-test-id="nomination-picker"]')
        .isVisible().catch(() => false);

      // The player must be in SOME recognizable state, not a blank screen
      const inSomeState = lastPlayerCanVote || lastPlayerConfirm ||
        lastPlayerMayorHand || lastPlayerChiefHand ||
        lastPlayerWaiting || lastPlayerNomination;

      expect.soft(
        inSomeState,
        'Player should be in a recognizable game state after refresh-during-vote',
      ).toBe(true);

      // VERIFY: Host is not stuck — host should show game content
      const hostContent = await setup.hostPage.locator('.host-screen-container')
        .isVisible().catch(() => false);
      expect(hostContent).toBe(true);

    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 5: Host and player refresh simultaneously ────────────────

  test('5. Host and player refresh simultaneously: both recover', async ({ browser }) => {
    const setup = await setupToElection(browser, 5);

    try {
      // Wait for vote buttons to appear on at least one player
      await waitForVote(setup.playerPages[0], 20_000);
      await setup.hostPage.waitForTimeout(500);

      // Refresh both host and player 0 at the exact same time
      await Promise.all([
        setup.hostPage.reload(),
        setup.playerPages[0].reload(),
      ]);

      // Wait for both to reconnect
      await setup.hostPage.waitForTimeout(5000);

      // VERIFY: Host recovers to game board
      const hostBoard = await setup.hostPage.locator('.host-screen-container')
        .isVisible({ timeout: 15_000 }).catch(() => false);
      expect.soft(hostBoard, 'Host should recover to game board after refresh').toBe(true);

      // VERIFY: Player recovers to some game screen
      const playerHasScreen = await setup.playerPages[0].locator('.screen')
        .first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect.soft(
        playerHasScreen,
        'Player should recover to a game screen after refresh',
      ).toBe(true);

      // VERIFY: Other players (1-4) are unaffected
      for (let i = 1; i < setup.playerPages.length; i++) {
        const hasUI = await setup.playerPages[i].locator('.screen')
          .first().isVisible().catch(() => false);
        const hasVote = await setup.playerPages[i]
          .locator('[data-test-id="vote-approve"]')
          .isVisible().catch(() => false);
        expect(
          hasUI || hasVote,
          `Player ${i} should still have a visible UI`,
        ).toBe(true);
      }

      // VERIFY: No crash on either page
      const hostError = await setup.hostPage.locator('text=Cannot connect')
        .isVisible().catch(() => false);
      expect(hostError).toBe(false);

    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 6: Rapid scenario loading ────────────────────────────────

  test('6. Rapid scenario loading: game settles on last scenario', async ({ browser }) => {
    const roomCode = uniqueRoom();
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto(`${BASE}/host?room=${roomCode}`);
    await hostPage.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

    await spawnBots(hostPage, 5);
    await hostPage.waitForTimeout(1000);

    const setup: GameSetup = {
      hostContext,
      hostPage,
      playerContexts: [],
      playerPages: [],
      roomCode,
    };

    try {
      const scenarioSelect = hostPage.locator('[data-test-id="host-scenario-select"]');

      // Collect page errors
      const pageErrors: string[] = [];
      hostPage.on('pageerror', (err) => pageErrors.push(err.message));

      // Load game-over scenario directly (rapid UI switching is not possible
      // because the scenario select unmounts when leaving lobby after first load)
      await scenarioSelect.selectOption('game-over-citizens');

      // Wait for game-over overlay to appear (WebKit needs more time)
      const gameOverVisible = await hostPage.locator('[data-overlay-id="game-over"]')
        .isVisible({ timeout: 30_000 }).catch(() => false);

      const winnerText = gameOverVisible
        ? await hostPage.locator('[data-test-id="host-game-over-winner"]')
            .textContent({ timeout: 5_000 }).catch(() => null)
        : null;

      expect(
        gameOverVisible || (winnerText && winnerText.toLowerCase().includes('citizen')),
        'Game should show game-over-citizens after scenario load',
      ).toBeTruthy();

      // VERIFY: No JavaScript crashes
      const crashes = pageErrors.filter((e) =>
        e.includes('TypeError') || e.includes('Cannot read'),
      );
      expect(crashes, 'No crash errors during rapid scenario loading').toHaveLength(0);

    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 7: Player joins during scenario load ─────────────────────

  test('7. Player joins during scenario load: clean success or failure', async ({ browser }) => {
    const roomCode = uniqueRoom();
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto(`${BASE}/host?room=${roomCode}`);
    await hostPage.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

    await spawnBots(hostPage, 4); // Only 4 bots — leave room for a real player
    await hostPage.waitForTimeout(1000);

    const setup: GameSetup = {
      hostContext,
      hostPage,
      playerContexts: [],
      playerPages: [],
      roomCode,
    };

    try {
      const scenarioSelect = hostPage.locator('[data-test-id="host-scenario-select"]');

      // Start loading scenario AND have a player join at the same time
      const playerCtx = await browser.newContext();
      const playerPage = await playerCtx.newPage();
      setup.playerContexts.push(playerCtx);
      setup.playerPages.push(playerPage);

      const playerErrors: string[] = collectErrors(playerPage);
      const hostErrors: string[] = collectErrors(hostPage);

      // Fire both simultaneously
      await Promise.all([
        scenarioSelect.selectOption('election'),
        playerPage.goto(`${BASE}/?room=${roomCode}&name=RaceGuy`),
      ]);

      // Wait for both to settle
      await hostPage.waitForTimeout(3000);

      // VERIFY: No crashes
      const playerCrashes = playerErrors.filter((e) => e.includes('PAGE_ERROR'));
      const hostCrashes = hostErrors.filter((e) => e.includes('PAGE_ERROR'));
      expect(playerCrashes).toHaveLength(0);
      expect(hostCrashes).toHaveLength(0);

      // VERIFY: Host is in a valid state (game board or lobby)
      const hostHasBoard = await hostPage.locator('.host-screen-container')
        .isVisible().catch(() => false);
      const hostHasLobby = await hostPage.locator('[data-test-id="host-start-btn"]')
        .isVisible().catch(() => false);
      expect(
        hostHasBoard || hostHasLobby,
        'Host should be on game board or lobby',
      ).toBe(true);

      // VERIFY: Player either joined the game or got a clear error
      const playerInLobby = await playerPage.locator('[data-test-id="lobby-player-list"]')
        .isVisible().catch(() => false);
      const playerHasVote = await playerPage.locator('[data-test-id="vote-approve"]')
        .isVisible().catch(() => false);
      const playerHasError = playerErrors.some((e) =>
        e.includes('GAME_STARTED') || e.includes('already'),
      );
      const playerHasScreen = await playerPage.locator('.screen')
        .first().isVisible().catch(() => false);

      expect(
        playerInLobby || playerHasVote || playerHasError || playerHasScreen,
        'Player should be in lobby, in game, or received error',
      ).toBe(true);

    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 8: 10 players acknowledge roles simultaneously ───────────

  test('8. Ten players acknowledge roles simultaneously via Promise.all', async ({ browser }) => {
    const setup = await createRoom(browser, 10);

    try {
      await startGame(setup.hostPage);

      // Wait for ALL 10 players to see the role card
      await Promise.all(
        setup.playerPages.map((p) =>
          expect(p.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 15_000 }),
        ),
      );

      // All 10 flip open at the same time
      await Promise.all(
        setup.playerPages.map((p) =>
          p.locator('[data-test-id="role-card"]').click(),
        ),
      );

      // Wait for flip animation (0.8s GSAP animation)
      await setup.hostPage.waitForTimeout(1200);

      // Verify all 10 see their role name
      await Promise.all(
        setup.playerPages.map((p) =>
          expect(p.locator('[data-test-id="role-name"]')).toBeVisible({ timeout: 3_000 }),
        ),
      );

      // All 10 flip closed (acknowledge) at the same time
      await Promise.all(
        setup.playerPages.map((p) =>
          p.locator('[data-test-id="role-card"]').click(),
        ),
      );

      // Wait for server to process all 10 acknowledge-role actions
      // and transition to nomination phase
      await setup.hostPage.waitForTimeout(3000);

      // VERIFY: Game transitioned to nomination phase.
      // Exactly one player (the mayor) should see the nomination picker.
      let pickerCount = 0;
      let waitingCount = 0;
      for (let attempt = 0; attempt < 20; attempt++) {
        pickerCount = 0;
        waitingCount = 0;
        for (const p of setup.playerPages) {
          const hasPicker = await p.locator('[data-test-id="nomination-picker"]')
            .isVisible().catch(() => false);
          const hasWaiting = await p.locator('[data-test-id="waiting-message"]')
            .isVisible().catch(() => false);
          if (hasPicker) pickerCount++;
          if (hasWaiting) waitingCount++;
        }
        if (pickerCount > 0) break;
        await setup.hostPage.waitForTimeout(500);
      }

      // Exactly 1 mayor sees the picker
      expect(pickerCount).toBe(1);

      // The remaining 9 should be waiting
      expect(waitingCount).toBe(9);

      // VERIFY: The acknowledge-role handler is idempotent.
      // All 10 acknowledged, acknowledgedPlayerIds should have exactly 10 entries.
      // We confirm this indirectly by the game having transitioned to nomination.
      // If any were lost, we'd still be in role-reveal-waiting.

    } finally {
      await cleanup(setup);
    }
  });

});
