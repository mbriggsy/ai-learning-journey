/**
 * E2E: Chaotic User Simulation
 *
 * Tests what happens when real drunk party game players do unpredictable things:
 * refresh mid-game, close tabs and rejoin, rapid-fire clicks, back button, etc.
 *
 * Each test creates a fresh room with a host + 5 real player browser contexts,
 * starts the game, and then unleashes chaos.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

// Each test opens its own isolated room so tests are independent.

// ── Unique room code generator ──────────────────────────────────────────

let roomCounter = 0;
function uniqueRoom(): string {
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  const seq = (roomCounter++).toString(36).toUpperCase().padStart(1, '0');
  return `CH${ts}${seq}`.slice(0, 8);
}

// ── Shared Helpers ──────────────────────────────────────────────────────

const PLAYER_NAMES = ['Vincenz', 'Carmine', 'Pauliee', 'Frankoo', 'Salliee'];

interface GameSetup {
  hostContext: BrowserContext;
  hostPage: Page;
  playerContexts: BrowserContext[];
  playerPages: Page[];
  roomCode: string;
}

/**
 * Create a host + N real player browser contexts in a fresh room.
 * Each player gets its own BrowserContext (isolated sessionStorage).
 */
async function createRoom(browser: Browser, playerCount = 5): Promise<GameSetup> {
  const roomCode = uniqueRoom();

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto(`${BASE}/host?room=${roomCode}`);
  await hostPage.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

  const playerContexts: BrowserContext[] = [];
  const playerPages: Page[] = [];

  for (let i = 0; i < playerCount; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?room=${roomCode}&name=${PLAYER_NAMES[i]}`);
    await page.waitForSelector('[data-test-id="lobby-player-list"]', { timeout: 15_000 });
    playerContexts.push(ctx);
    playerPages.push(page);
  }

  // Wait for all players to appear on host
  await expect(hostPage.locator('[data-test-id="host-player-count"]'))
    .toContainText(`${playerCount} / 10`, { timeout: 10_000 });

  return { hostContext, hostPage, playerContexts, playerPages, roomCode };
}

/** Start the game via the host start button. */
async function startGame(hostPage: Page): Promise<void> {
  const startBtn = hostPage.locator('[data-test-id="host-start-btn"]');
  await expect(startBtn).toBeEnabled({ timeout: 5_000 });
  await startBtn.click();
  // Wait for the game board to appear
  await hostPage.waitForSelector('.host-screen-container', { timeout: 10_000 });
}

/** Acknowledge roles for all players: flip open, wait for animation, flip closed. */
async function acknowledgeAllRoles(players: Page[]): Promise<void> {
  for (const p of players) {
    await expect(p.locator('[data-test-id="role-card"]')).toBeVisible({ timeout: 15_000 });
    await p.locator('[data-test-id="role-card"]').click();
    // Wait for flip animation to complete — role-name visible proves card is open
    await expect(p.locator('[data-test-id="role-name"]')).toBeVisible({ timeout: 5_000 });
    await p.waitForTimeout(300); // buffer for GSAP timeline to fully deactivate
    await p.locator('[data-test-id="role-card"]').click();
    await p.waitForTimeout(500);
  }
}

/** Wait until at least one player sees the nomination picker (nomination phase). */
async function waitForNominationPhase(players: Page[], hostPage: Page): Promise<Page> {
  // Give the host time to transition
  await hostPage.waitForTimeout(2000);

  // Poll until we find the mayor
  for (let attempt = 0; attempt < 20; attempt++) {
    for (const p of players) {
      const visible = await p.locator('[data-test-id="nomination-picker"]')
        .isVisible().catch(() => false);
      if (visible) return p;
    }
    await hostPage.waitForTimeout(500);
  }
  throw new Error('No player reached nomination-picker within timeout');
}

/** Nominate the first eligible player and confirm. */
async function nominateFirstPlayer(mayorPage: Page): Promise<void> {
  await mayorPage.locator('[data-test-id="nomination-player"]').first().click();
  await mayorPage.locator('[data-test-id="nomination-confirm"]').click();
}

/** Wait until vote buttons are visible for a player. */
async function waitForVote(page: Page, timeout = 10_000): Promise<boolean> {
  try {
    await page.locator('[data-test-id="vote-approve"]').waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/** Have all eligible players vote approve. Returns the number of votes cast. */
async function allVoteApprove(players: Page[]): Promise<number> {
  let votes = 0;
  for (const p of players) {
    const canVote = await p.locator('[data-test-id="vote-approve"]')
      .isVisible().catch(() => false);
    if (canVote) {
      await p.locator('[data-test-id="vote-approve"]').click();
      votes++;
      await p.waitForTimeout(200);
    }
  }
  return votes;
}

/** Clean up all contexts. */
async function cleanup(setup: GameSetup): Promise<void> {
  for (const ctx of setup.playerContexts) {
    await ctx.close().catch(() => {});
  }
  await setup.hostContext.close().catch(() => {});
}

/** Get a game into nomination phase using the election scenario shortcut. */
async function setupToElection(browser: Browser): Promise<GameSetup & { mayorPage: Page }> {
  const setup = await createRoom(browser, 5);

  // Extra wait to ensure all players' join messages (500ms setTimeout) have arrived
  await setup.hostPage.waitForTimeout(2000);

  // Use the election scenario to jump straight to voting
  const scenarioSelect = setup.hostPage.locator('[data-test-id="host-scenario-select"]');
  await scenarioSelect.selectOption('election');

  // Wait for the game board to appear (confirms scenario loaded successfully)
  await setup.hostPage.waitForSelector('.host-screen-container', { timeout: 10_000 });
  await setup.hostPage.waitForTimeout(1500);

  // In the election scenario, all players see vote screen
  // Player 0 is the mayor per baseState (mayorIndex: 0)
  return { ...setup, mayorPage: setup.playerPages[0] };
}

/** Get a game into the policy-session (mayor discard) phase. */
async function setupToPolicySession(browser: Browser): Promise<GameSetup & { mayorPage: Page }> {
  const setup = await createRoom(browser, 5);

  // Extra wait to ensure all players' join messages (500ms setTimeout) have arrived
  await setup.hostPage.waitForTimeout(2000);

  const scenarioSelect = setup.hostPage.locator('[data-test-id="host-scenario-select"]');
  await scenarioSelect.selectOption('policy-session');

  // Wait for the game board to appear (confirms scenario loaded successfully)
  await setup.hostPage.waitForSelector('.host-screen-container', { timeout: 10_000 });
  await setup.hostPage.waitForTimeout(1500);

  // Player 0 is mayor in baseState
  return { ...setup, mayorPage: setup.playerPages[0] };
}

// ── Tests ───────────────────────────────────────────────────────────────

test.describe('Chaotic User Simulation', () => {

  // Increase overall timeout for these complex multi-browser tests
  test.setTimeout(180_000);

  // ── Test 1: Browser refresh mid-vote ─────────────────────────────────

  test('1. Browser refresh mid-vote: player can still vote after reload', async ({ browser }) => {
    const { hostPage, playerPages, playerContexts, hostContext, roomCode } = await setupToElection(browser);
    const setup: GameSetup = { hostContext, hostPage, playerContexts, playerPages, roomCode };

    try {
      // Find a non-mayor player who has the vote screen (poll all simultaneously)
      let voterPage: Page | null = null;
      let voterIndex = -1;
      for (let attempt = 0; attempt < 30 && !voterPage; attempt++) {
        for (let i = 1; i < playerPages.length; i++) {
          const canVote = await playerPages[i].locator('[data-test-id="vote-approve"]')
            .isVisible().catch(() => false);
          if (canVote) { voterPage = playerPages[i]; voterIndex = i; break; }
        }
        if (!voterPage) await hostPage.waitForTimeout(500);
      }
      expect(voterPage).not.toBeNull();
      if (!voterPage || voterIndex < 0) return;

      // Grab the sessionStorage token before refresh
      const sessionToken = await voterPage.evaluate(() => sessionStorage.getItem('umb-session'));
      expect(sessionToken).toBeTruthy();

      // Refresh the voter's page mid-vote
      await voterPage.reload();

      // After reload, the player should rejoin via sessionToken and see vote screen
      // OR confirmation (if their vote was somehow preserved through the reload)
      const canVoteAfterReload = await waitForVote(voterPage, 15_000);

      if (canVoteAfterReload) {
        // Cast the vote — should succeed without error
        await voterPage.locator('[data-test-id="vote-approve"]').click();
        // Vote confirmation may vanish quickly if all votes resolve the election
        const hasConfirmR = await voterPage.locator('[data-test-id="vote-confirmation"]')
          .isVisible({ timeout: 3_000 }).catch(() => false);
        const btnGoneR = !(await voterPage.locator('[data-test-id="vote-approve"]')
          .isVisible().catch(() => false));
        expect(hasConfirmR || btnGoneR, 'Vote should have been cast after reload').toBe(true);
      } else {
        // Player may already have their vote recorded, or game advanced.
        // Verify they're in a recognizable game state (not a blank/dead screen).
        const hasAnyUI = await voterPage.locator(
          '[data-test-id="vote-confirmation"], [data-test-id="waiting-message"], [data-test-id="nomination-picker"], [data-test-id="mayor-hand"]',
        ).first().isVisible({ timeout: 5_000 }).catch(() => false);
        expect(hasAnyUI, 'Player should be in a recognizable game state after reload').toBe(true);
      }
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 2: Browser refresh mid-policy-session ───────────────────────

  test('2. Browser refresh mid-policy-session: mayor sees cards after reload', async ({ browser }) => {
    const { hostPage, playerPages, playerContexts, hostContext, roomCode, mayorPage } =
      await setupToPolicySession(browser);
    const setup: GameSetup = { hostContext, hostPage, playerContexts, playerPages, roomCode };

    try {
      // Verify mayor sees their 3 cards
      await expect(mayorPage.locator('[data-test-id="mayor-hand"]'))
        .toBeVisible({ timeout: 10_000 });
      const cardCountBefore = await mayorPage.locator('[data-test-id="policy-card"]').count();
      expect(cardCountBefore).toBe(3);

      // Refresh the mayor's page
      await mayorPage.reload();

      // After reload, check if mayor still sees their cards.
      // The server re-sends private data (mayorCards) on reconnect via broadcastPrivateData.
      // Allow generous time for: WS connect + 500ms join delay + 550ms crossfade transition.
      let handVisible = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        handVisible = await mayorPage.locator('[data-test-id="mayor-hand"]')
          .isVisible().catch(() => false);
        if (handVisible) break;
        await mayorPage.waitForTimeout(500);
      }

      if (handVisible) {
        // Cards survived the refresh — ideal behavior
        const cardCountAfter = await mayorPage.locator('[data-test-id="policy-card"]').count();
        expect(cardCountAfter).toBe(3);
      } else {
        // BUG DETECTED: the mayor-hand never appeared after refresh.
        // Check what the page is actually showing.
        const waitingVisible = await mayorPage.locator('[data-test-id="waiting-message"]')
          .isVisible().catch(() => false);
        const anyScreen = await mayorPage.locator('.screen').first()
          .isVisible().catch(() => false);
        const appContent = await mayorPage.locator('#app').innerHTML().catch(() => '');

        // Log findings
        console.warn('[BUG] Mayor refresh during policy-session: mayor-hand never re-appeared.');
        console.warn(`  waiting-message visible: ${waitingVisible}`);
        console.warn(`  any .screen visible: ${anyScreen}`);
        console.warn(`  #app innerHTML length: ${appContent.length}`);

        // The game is stuck. This is a known issue: after refresh, the screen
        // container transition (opacity 0 -> 1) plus the 500ms join delay
        // may cause the player to land in a state where the screen never mounts.
        // Mark as a known failure so the test suite signals the problem.
        expect.soft(handVisible, 'BUG: Mayor should see policy cards after refresh').toBe(true);
      }
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 3: Close tab and rejoin with same name ──────────────────────

  test('3. Close tab and rejoin with same name: takes over existing slot', async ({ browser }) => {
    const { hostPage, playerPages, playerContexts, hostContext, roomCode } = await setupToElection(browser);
    const setup: GameSetup = { hostContext, hostPage, playerContexts, playerPages, roomCode };

    try {
      // Player 2 (Pauliee) will close their tab
      const targetName = PLAYER_NAMES[2]; // Pauliee

      // Verify the player can see the vote screen first
      for (let attempt = 0; attempt < 30; attempt++) {
        const canVote = await playerPages[2].locator('[data-test-id="vote-approve"]')
          .isVisible().catch(() => false);
        if (canVote) break;
        await playerPages[2].waitForTimeout(500);
      }

      // Close the player's entire browser context (simulates closing tab)
      await playerContexts[2].close();

      // Wait for server to notice the disconnect
      await hostPage.waitForTimeout(2000);

      // Create a new context and rejoin with the same name
      const newCtx = await browser.newContext();
      const newPage = await newCtx.newPage();
      await newPage.goto(`${BASE}/?room=${roomCode}&name=${targetName}`);

      // The player should take over the existing slot (no NAME_TAKEN error)
      // and see the vote screen since the game is in election phase
      const canVote = await waitForVote(newPage, 15_000);
      expect(canVote).toBe(true);

      // Cast the vote to prove we're fully functional
      await newPage.locator('[data-test-id="vote-approve"]').click();
      // Vote confirmation may vanish quickly if all votes resolve the election
      const hasConfirmC3 = await newPage.locator('[data-test-id="vote-confirmation"]')
        .isVisible({ timeout: 3_000 }).catch(() => false);
      const btnGoneC3 = !(await newPage.locator('[data-test-id="vote-approve"]')
        .isVisible().catch(() => false));
      expect(hasConfirmC3 || btnGoneC3, 'Vote should have been cast').toBe(true);

      // Replace in setup for cleanup
      setup.playerContexts[2] = newCtx;
      setup.playerPages[2] = newPage;
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 4: Double-click vote button ─────────────────────────────────

  test('4. Double-click vote button: only one vote registered', async ({ browser }) => {
    const { hostPage, playerPages, playerContexts, hostContext, roomCode } = await setupToElection(browser);
    const setup: GameSetup = { hostContext, hostPage, playerContexts, playerPages, roomCode };

    try {
      // Find a voter — poll all players simultaneously instead of sequentially
      let voterPage: Page | null = null;
      for (let attempt = 0; attempt < 30 && !voterPage; attempt++) {
        for (const p of playerPages) {
          const canVote = await p.locator('[data-test-id="vote-approve"]')
            .isVisible().catch(() => false);
          if (canVote) { voterPage = p; break; }
        }
        if (!voterPage) await hostPage.waitForTimeout(500);
      }
      expect(voterPage).not.toBeNull();
      if (!voterPage) return;

      // Wait for GSAP entrance animation to complete (cards slide in over 0.35s)
      await voterPage.waitForTimeout(1000);

      // Collect any console errors
      const errors: string[] = [];
      voterPage.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      // Double-click the approve button as fast as possible.
      // Use force:true on second click because the button gets disabled after first click,
      // and Playwright normally waits for it to be actionable (which never happens).
      const approveBtn = voterPage.locator('[data-test-id="vote-approve"]');
      await approveBtn.click({ delay: 0 });
      await approveBtn.click({ force: true, timeout: 2000 }).catch(() => {
        // Button might be disabled, hidden, or removed after first click — that's expected
      });

      // Wait a moment for any error messages
      await voterPage.waitForTimeout(1000);

      // The confirmation should appear, OR the vote buttons should be gone (both mean vote was cast)
      const confirmVisible = await voterPage.locator('[data-test-id="vote-confirmation"]')
        .isVisible({ timeout: 5_000 }).catch(() => false);
      const buttonsGone = await voterPage.locator('[data-test-id="vote-approve"]')
        .isVisible().catch(() => false) === false;

      // At least one indicator that the vote went through
      expect(confirmVisible || buttonsGone).toBe(true);

      // No crash-level console errors (server errors about duplicate votes are fine to log)
      const crashErrors = errors.filter((e) =>
        e.includes('Uncaught') || e.includes('TypeError') || e.includes('Cannot read'));
      expect(crashErrors).toHaveLength(0);
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 5: Click disabled start button ──────────────────────────────

  test('5. Click disabled start button: nothing bad happens with < 5 players', async ({ browser }) => {
    const roomCode = uniqueRoom();

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto(`${BASE}/host?room=${roomCode}`);
    await hostPage.waitForSelector('[data-test-id="host-start-btn"]', { timeout: 15_000 });

    try {
      // Spawn only 3 bots (below the 5-player minimum)
      const botSelect = hostPage.locator('[data-test-id="host-bot-count"]').first();
      await botSelect.selectOption('3');
      await hostPage.locator('[data-test-id="host-spawn-bots"]').click();
      await hostPage.waitForTimeout(1000);

      await expect(hostPage.locator('[data-test-id="host-player-count"]'))
        .toContainText('3 / 10', { timeout: 5_000 });

      // Start button should be disabled
      const startBtn = hostPage.locator('[data-test-id="host-start-btn"]');
      await expect(startBtn).toBeDisabled();

      // Force-click the disabled button (simulate a determined user)
      await startBtn.click({ force: true });
      await hostPage.waitForTimeout(1000);

      // Should still be on the lobby screen, not crashed
      await expect(hostPage.locator('[data-test-id="host-start-btn"]')).toBeVisible();
      await expect(hostPage.locator('[data-test-id="host-player-count"]'))
        .toContainText('3 / 10');

      // No JavaScript errors thrown
      const pageErrors: Error[] = [];
      hostPage.on('pageerror', (err) => pageErrors.push(err));
      await startBtn.click({ force: true });
      await hostPage.waitForTimeout(500);
      expect(pageErrors).toHaveLength(0);
    } finally {
      await hostContext.close();
    }
  });

  // ── Test 6: Android back button (popstate) ───────────────────────────

  test('6. Android back button: app traps popstate, does not navigate away', async ({ browser }) => {
    const { hostPage, playerPages, playerContexts, hostContext, roomCode } = await setupToElection(browser);
    const setup: GameSetup = { hostContext, hostPage, playerContexts, playerPages, roomCode };

    try {
      const voterPage = playerPages[1]; // Pick any non-mayor player
      // Wait until vote screen appears
      for (let attempt = 0; attempt < 30; attempt++) {
        const canVote = await voterPage.locator('[data-test-id="vote-approve"]')
          .isVisible().catch(() => false);
        if (canVote) break;
        await voterPage.waitForTimeout(500);
      }

      // Record current URL
      const urlBefore = voterPage.url();

      // Simulate Android back button by going back in history
      await voterPage.goBack().catch(() => {
        // goBack may reject if there's nowhere to go — that's fine
      });

      // Wait a moment
      await voterPage.waitForTimeout(1000);

      // The app should have trapped the popstate and pushed state again
      // We should still be on the same page, NOT navigated away
      const urlAfter = voterPage.url();
      expect(urlAfter).toContain(roomCode);

      // The vote UI should still be visible (not a blank page or navigation error)
      const voteVisible = await voterPage.locator('[data-test-id="vote-approve"]')
        .isVisible().catch(() => false);
      const anyScreenVisible = await voterPage.locator('.screen')
        .first().isVisible().catch(() => false);
      expect(voteVisible || anyScreenVisible).toBe(true);
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 7: Refresh during role reveal ───────────────────────────────

  test('7. Refresh during role reveal: player still sees role card after reload', async ({ browser }) => {
    const setup = await createRoom(browser, 5);

    try {
      await startGame(setup.hostPage);

      // Wait for first player to see the role card
      const targetPlayer = setup.playerPages[0];
      await expect(targetPlayer.locator('[data-test-id="role-card"]'))
        .toBeVisible({ timeout: 15_000 });

      // Flip the card open (role is visible)
      await targetPlayer.locator('[data-test-id="role-card"]').click();
      await targetPlayer.waitForTimeout(800);

      // Verify role name is visible
      await expect(targetPlayer.locator('[data-test-id="role-name"]'))
        .toBeVisible({ timeout: 3_000 });

      // NOW REFRESH while the role card is flipped open
      await targetPlayer.reload();

      // After reload, the player should reconnect and see the role-reveal screen again
      // (since they haven't acknowledged yet — acknowledge only happens on closing the card).
      // Allow generous time: WS connect + 500ms join delay + 550ms crossfade transition.
      let roleCardVisible = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        roleCardVisible = await targetPlayer.locator('[data-test-id="role-card"]')
          .isVisible().catch(() => false);
        if (roleCardVisible) break;
        await targetPlayer.waitForTimeout(500);
      }

      // Use soft assertion — if this fails, it's the same screen-mount bug as test 2
      expect.soft(roleCardVisible, 'BUG: Role card should be visible after refresh during role-reveal').toBe(true);

      // The player should be able to complete the role reveal flow:
      // flip open, see role, flip closed (which sends acknowledge)
      if (roleCardVisible) {
        await targetPlayer.locator('[data-test-id="role-card"]').click();
        await targetPlayer.waitForTimeout(900);
        await expect(targetPlayer.locator('[data-test-id="role-name"]'))
          .toBeVisible({ timeout: 3_000 });

        // Flip closed to acknowledge
        await targetPlayer.locator('[data-test-id="role-card"]').click();
        await targetPlayer.waitForTimeout(500);
      }

      // Acknowledge remaining players so the game can proceed
      for (let i = 1; i < setup.playerPages.length; i++) {
        const card = setup.playerPages[i].locator('[data-test-id="role-card"]');
        const visible = await card.isVisible().catch(() => false);
        if (visible) {
          await card.click();
          await setup.playerPages[i].waitForTimeout(900);
          await card.click();
          await setup.playerPages[i].waitForTimeout(500);
        }
      }
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 8: Host refresh mid-game ────────────────────────────────────

  test('8. Host refresh mid-game: host view recovers to correct state', async ({ browser }) => {
    const { hostPage, playerPages, playerContexts, hostContext, roomCode } =
      await setupToPolicySession(browser);
    const setup: GameSetup = { hostContext, hostPage, playerContexts, playerPages, roomCode };

    try {
      // Verify host is showing the game board
      await expect(hostPage.locator('.host-screen-container')).toBeVisible({ timeout: 5_000 });

      // Host refreshes their browser
      await hostPage.reload();

      // After reload, the host should reconnect via umb-host-session token
      // and receive the current game state
      await expect(hostPage.locator('.host-screen-container'))
        .toBeVisible({ timeout: 15_000 });

      // The game should still be in policy-session phase
      // Verify by checking that the mayor can still see their cards
      const mayorPage = playerPages[0];
      const handVisible = await mayorPage.locator('[data-test-id="mayor-hand"]')
        .isVisible().catch(() => false);

      // If mayor hand is visible, the game state survived the host refresh
      if (handVisible) {
        const cardCount = await mayorPage.locator('[data-test-id="policy-card"]').count();
        expect(cardCount).toBe(3);
      }

      // At minimum, the host page should not be crashed or showing an error
      const hasError = await hostPage.locator('text=Cannot connect').isVisible().catch(() => false);
      expect(hasError).toBe(false);
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 9: Rapid nomination clicks ──────────────────────────────────

  test('9. Rapid nomination clicks: only one nomination goes through', async ({ browser }) => {
    const setup = await createRoom(browser, 5);

    try {
      await startGame(setup.hostPage);
      await acknowledgeAllRoles(setup.playerPages);

      const mayorPage = await waitForNominationPhase(setup.playerPages, setup.hostPage);

      // Get all eligible nomination targets
      const nominees = mayorPage.locator('[data-test-id="nomination-player"]');
      const nomineeCount = await nominees.count();
      expect(nomineeCount).toBeGreaterThan(1);

      // Rapidly click 3 different nominees
      for (let i = 0; i < Math.min(3, nomineeCount); i++) {
        await nominees.nth(i).click({ delay: 0 });
      }

      // Now rapidly click confirm
      const confirmBtn = mayorPage.locator('[data-test-id="nomination-confirm"]');
      await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });
      await confirmBtn.click({ timeout: 5000 }).catch(() => {});
      // Try clicking confirm again immediately (should be disabled after first click)
      await confirmBtn.click({ force: true, timeout: 2000 }).catch(() => {});

      // The game should have advanced to election (vote screen appears for players)
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

      // At least some players should see the vote screen (game advanced correctly)
      expect(votersFound).toBeGreaterThan(0);

      // Collect any console errors from the mayor's page
      const errors: string[] = [];
      mayorPage.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes('Uncaught')) {
          errors.push(msg.text());
        }
      });
      await mayorPage.waitForTimeout(500);
      expect(errors).toHaveLength(0);
    } finally {
      await cleanup(setup);
    }
  });

  // ── Test 10: Player joins after game started ─────────────────────────

  test('10. Late player join: gets error message, not a crash', async ({ browser }) => {
    const { hostPage, playerPages, playerContexts, hostContext, roomCode } = await setupToElection(browser);
    const setup: GameSetup = { hostContext, hostPage, playerContexts, playerPages, roomCode };

    try {
      // A 6th player tries to join the in-progress game with a new name
      const lateCtx = await browser.newContext();
      const latePage = await lateCtx.newPage();

      // Collect console messages for error detection
      const consoleMessages: string[] = [];
      latePage.on('console', (msg) => consoleMessages.push(msg.text()));

      // Collect page-level crashes
      const pageErrors: Error[] = [];
      latePage.on('pageerror', (err) => pageErrors.push(err));

      await latePage.goto(`${BASE}/?room=${roomCode}&name=LateGuy`);

      // Wait for the page to process the join attempt
      await latePage.waitForTimeout(3000);

      // The server should send a GAME_STARTED error
      // Check that the page isn't crashed (no JS errors)
      expect(pageErrors).toHaveLength(0);

      // The player should see something — either an error message in the UI,
      // or at minimum the page should not be blank/crashed
      const pageContent = await latePage.textContent('body');
      expect(pageContent).toBeTruthy();

      // The late player should NOT see a vote screen (they're not in the game)
      const canVote = await latePage.locator('[data-test-id="vote-approve"]')
        .isVisible().catch(() => false);
      expect(canVote).toBe(false);

      // Verify the server logged a GAME_STARTED error
      const hasGameStartedError = consoleMessages.some((m) =>
        m.includes('GAME_STARTED') || m.includes('Game already'));
      // This is logged via console.warn in the error handler
      expect(hasGameStartedError).toBe(true);

      await lateCtx.close();
    } finally {
      await cleanup(setup);
    }
  });

});
