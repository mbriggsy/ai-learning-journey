/**
 * E2E: Full Game to Completion
 *
 * THE ultimate E2E test. Plays an entire 5-player game from lobby to
 * game-over using 5 real player browser contexts. No dev scenarios, no
 * bots, no shortcuts. Every action happens through the UI.
 *
 * Run with:
 *   npx playwright test tests/e2e/full-game-to-completion.spec.ts --project=chromium --timeout=300000
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5173';
const PLAYER_NAMES = ['Vincenz', 'Carmine', 'Pauliee', 'Frankoo', 'Salliee'] as const;
const MAX_ROUNDS = 20;
const PROPAGATION_DELAY = 1500; // ms to wait for server state propagation + animations
const ACTION_DELAY = 1500;      // ms between rapid UI actions (must exceed 800ms GSAP flip animation + headless overhead)

// ── Logging Helper ──────────────────────────────────────────────────

function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[FULL-GAME] ${msg}`);
}

// ── Selector Helpers ────────────────────────────────────────────────

function sel(testId: string): string {
  return `[data-test-id="${testId}"]`;
}

function overlaySel(overlayId: string): string {
  return `[data-overlay-id="${overlayId}"]`;
}

// ── Player Discovery Helpers ────────────────────────────────────────

/**
 * Find the first player page that has the given selector visible.
 * Always searches the full `allPlayers` array so the returned index
 * maps directly to PLAYER_NAMES[]. Only checks players in `aliveSet`.
 * Returns null if no player has it.
 */
async function findPlayerWith(
  allPlayers: Page[],
  aliveSet: Set<number>,
  selector: string,
  timeoutMs = 3000,
): Promise<{ page: Page; index: number } | null> {
  const indices = [...aliveSet];

  // First try: quick check on alive players (no waiting)
  for (const i of indices) {
    try {
      const visible = await allPlayers[i].locator(selector).first().isVisible();
      if (visible) return { page: allPlayers[i], index: i };
    } catch {
      // Page may be closed or element missing — skip
    }
  }

  // Second try: poll until timeout (state may still be propagating)
  if (timeoutMs > 0) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      for (const i of indices) {
        try {
          const visible = await allPlayers[i].locator(selector).first().isVisible();
          if (visible) return { page: allPlayers[i], index: i };
        } catch {
          // skip
        }
      }
    }
  }

  return null;
}

/**
 * Check if any player sees the game-over screen.
 */
async function isGameOver(players: Page[]): Promise<boolean> {
  for (const p of players) {
    try {
      const visible = await p.locator(sel('game-over-winner')).isVisible();
      if (visible) return true;
    } catch {
      // skip
    }
  }
  return false;
}

// ── The Test ────────────────────────────────────────────────────────

test.describe('Full Game to Completion', () => {
  test('5 real players play from lobby to game-over', async ({ browser }) => {
    test.setTimeout(480_000); // 8-minute timeout (needs headroom under parallel load)

    const context = await browser.newContext();
    const roomCode = 'FULL' + Date.now().toString(36).slice(-3).toUpperCase();

    log(`Room code: ${roomCode}`);

    // ── 1. Create host ──────────────────────────────────────────────

    const host = await context.newPage();
    await host.goto(`${BASE}/host?room=${roomCode}`);
    await host.waitForSelector(sel('host-start-btn'), { timeout: 15_000 });
    log('Host created and lobby loaded');

    // ── 2. Create 5 real players ────────────────────────────────────

    const players: Page[] = [];
    for (const name of PLAYER_NAMES) {
      const page = await context.newPage();
      await page.goto(`${BASE}/?room=${roomCode}&name=${name}`);
      await page.waitForSelector(sel('lobby-player-list'), { timeout: 10_000 });
      players.push(page);
      log(`Player ${name} joined`);
    }

    // Verify all 5 players visible on host
    await expect(host.locator(sel('host-player-count'))).toContainText('5 / 10', {
      timeout: 5_000,
    });
    log('All 5 players confirmed on host');

    // ── 3. Host clicks Start Game ───────────────────────────────────

    const startBtn = host.locator(sel('host-start-btn'));
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();
    await host.waitForSelector('.host-screen-container', { timeout: 10_000 });
    log('Game started');

    // ── 4. Role Reveal: all players tap to reveal, tap to ack ───────

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      await expect(p.locator(sel('role-card'))).toBeVisible({ timeout: 15_000 });

      // Tap to flip open
      await p.locator(sel('role-card')).click();

      // Wait for flip animation to complete — role-name becomes visible when card is open
      await expect(p.locator(sel('role-name'))).toBeVisible({ timeout: 5_000 });
      await p.waitForTimeout(300); // buffer for GSAP timeline to fully deactivate

      // Read role for logging
      try {
        const roleName = await p.locator(sel('role-name')).textContent({ timeout: 2000 });
        log(`${PLAYER_NAMES[i]} is ${roleName}`);
      } catch {
        log(`${PLAYER_NAMES[i]} role revealed (could not read name)`);
      }

      // Tap to flip closed (sends acknowledge-role)
      await p.locator(sel('role-card')).click();
      await p.waitForTimeout(ACTION_DELAY);
    }

    log('All players acknowledged roles');
    await host.waitForTimeout(PROPAGATION_DELAY);

    // ── 5. Game Loop ────────────────────────────────────────────────

    // Track which players are alive (indices into players[])
    const alive = new Set<number>([0, 1, 2, 3, 4]);

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      log(`--- Round ${round} ---`);

      // Check for game-over first
      if (await isGameOver(players)) {
        log(`Game ended at start of round ${round}`);
        break;
      }

      // ── 5a. Find the Mayor (sees nomination-picker) ───────────

      const mayor = await findPlayerWith(
        players,
        alive,
        sel('nomination-picker'),
        10_000,
      );

      if (!mayor) {
        // Maybe game ended during the wait, or we're in a transitional state
        if (await isGameOver(players)) {
          log(`Game ended while waiting for mayor (round ${round})`);
          break;
        }

        // Check if an auto-enact happened (3 failed elections) — host shows auto-enact overlay
        // then loops back to nomination. Wait a bit and retry.
        log(`No mayor found in round ${round} — waiting for state to settle...`);
        await host.waitForTimeout(3000);

        if (await isGameOver(players)) {
          log(`Game ended during auto-enact recovery (round ${round})`);
          break;
        }

        // Try one more time after a longer wait
        const retryMayor = await findPlayerWith(
          players,
          alive,
          sel('nomination-picker'),
          10_000,
        );
        if (!retryMayor) {
          // Could be stuck — check for any power screen or investigation
          log(`WARN: Still no mayor in round ${round}. Checking executive powers...`);

          // Handle pending executive powers that might be blocking
          const handled = await handleExecutivePower(players, alive, host);
          if (handled) {
            log('Handled a pending executive power, continuing...');
            await host.waitForTimeout(PROPAGATION_DELAY);
            if (await isGameOver(players)) {
              log(`Game ended after executive power (round ${round})`);
              break;
            }
            continue; // Retry the round
          }

          // If nothing helps, fail with diagnostic info
          log(`FATAL: No mayor found and no executive power pending. Dumping state...`);
          for (let i = 0; i < players.length; i++) {
            if (!alive.has(i)) continue;
            const html = await players[i].locator('body').innerHTML().catch(() => '(error)');
            log(`${PLAYER_NAMES[i]} body snippet: ${html.substring(0, 200)}`);
          }
          throw new Error(`Round ${round}: No mayor found — game appears stuck`);
        }

        // Use retry result
        await doNomination(retryMayor.page, PLAYER_NAMES[retryMayor.index], round);
      } else {
        // ── 5b. Mayor nominates ─────────────────────────────────

        await doNomination(mayor.page, PLAYER_NAMES[mayor.index], round);
      }

      await host.waitForTimeout(PROPAGATION_DELAY);

      // Check for game-over (mob boss elected as chief with 3+ bad policies)
      if (await isGameOver(players)) {
        log(`Game ended after nomination (round ${round}) — mob boss may have been elected`);
        break;
      }

      // ── 5c. All alive players vote APPROVE ────────────────────

      let votesCast = 0;
      for (let i = 0; i < players.length; i++) {
        if (!alive.has(i)) continue;
        try {
          const hasVote = await players[i]
            .locator(sel('vote-approve'))
            .isVisible({ timeout: 3000 })
            .catch(() => false);
          if (hasVote) {
            await players[i].locator(sel('vote-approve')).click();
            votesCast++;
            await players[i].waitForTimeout(300);
          }
        } catch {
          // Player may not have vote UI (already voted or dead)
        }
      }
      log(`Round ${round}: ${votesCast} votes cast (all approve)`);

      await host.waitForTimeout(PROPAGATION_DELAY * 2); // Extra time for vote reveal animation

      // Check for game-over after election
      if (await isGameOver(players)) {
        log(`Game ended after election (round ${round})`);
        break;
      }

      // ── 5d. Policy Session (if election passed) ───────────────

      // Find the Mayor who sees the mayor-hand (3 cards to discard from)
      const policyMayor = await findPlayerWith(
        players,
        alive,
        sel('mayor-hand'),
        8_000,
      );

      if (!policyMayor) {
        // Election might have failed (shouldn't, since all voted approve,
        // but handle gracefully). Could also be auto-enact.
        log(`Round ${round}: No mayor-hand found — election may have failed or auto-enact occurred`);
        await host.waitForTimeout(PROPAGATION_DELAY);

        if (await isGameOver(players)) {
          log(`Game ended during policy phase (round ${round})`);
          break;
        }
        continue; // Next round
      }

      // Mayor selects first card and discards
      const mayorCards = policyMayor.page.locator(sel('policy-card'));
      const cardCount = await mayorCards.count();
      log(`Round ${round}: Mayor (${PLAYER_NAMES[policyMayor.index]}) has ${cardCount} cards`);

      await mayorCards.first().click();
      await policyMayor.page.waitForTimeout(ACTION_DELAY);
      await policyMayor.page.locator(sel('mayor-discard-btn')).click();
      log(`Round ${round}: Mayor discarded a card`);

      await host.waitForTimeout(PROPAGATION_DELAY * 2); // Wait for discard animation + server

      // Check for game-over
      if (await isGameOver(players)) {
        log(`Game ended after mayor discard (round ${round})`);
        break;
      }

      // Find the Chief who sees the chief-hand (2 cards to enact from)
      const chiefResult = await findPlayerWith(
        players,
        alive,
        sel('chief-hand'),
        8_000,
      );

      if (!chiefResult) {
        log(`Round ${round}: No chief-hand found — possible race condition`);
        await host.waitForTimeout(PROPAGATION_DELAY);
        if (await isGameOver(players)) {
          log(`Game ended while waiting for chief (round ${round})`);
          break;
        }
        continue;
      }

      // Chief selects first card and enacts
      // Skip veto — if veto button is visible, ignore it and enact normally
      const chiefCards = chiefResult.page.locator(sel('policy-card'));
      const chiefCardCount = await chiefCards.count();
      log(`Round ${round}: Chief (${PLAYER_NAMES[chiefResult.index]}) has ${chiefCardCount} cards`);

      await chiefCards.first().click();
      await chiefResult.page.waitForTimeout(ACTION_DELAY);
      await chiefResult.page.locator(sel('chief-enact-btn')).click();
      log(`Round ${round}: Chief enacted a policy`);

      await host.waitForTimeout(PROPAGATION_DELAY * 2); // Wait for enact animation

      // Check for game-over after enactment
      if (await isGameOver(players)) {
        log(`Game ended after policy enactment (round ${round})`);
        break;
      }

      // ── 5e. Handle Executive Powers ───────────────────────────

      const powerHandled = await handleExecutivePower(players, alive, host);
      if (powerHandled) {
        log(`Round ${round}: Executive power handled`);
        await host.waitForTimeout(PROPAGATION_DELAY);
      }

      // Check for game-over after executive power
      if (await isGameOver(players)) {
        log(`Game ended after executive power (round ${round})`);
        break;
      }

      log(`Round ${round} complete`);
    }

    // ── 6. Verify Game Over ─────────────────────────────────────────

    // Wait for game-over to propagate to all players
    await host.waitForTimeout(PROPAGATION_DELAY);

    // At least one player must see the winner text
    let winnerFound = false;
    let winnerText = '';
    for (let i = 0; i < players.length; i++) {
      try {
        const winnerEl = players[i].locator(sel('game-over-winner'));
        const visible = await winnerEl.isVisible({ timeout: 5000 }).catch(() => false);
        if (visible) {
          winnerText = (await winnerEl.textContent()) ?? '';
          winnerFound = true;
          log(`${PLAYER_NAMES[i]} sees game-over: "${winnerText}"`);
          break;
        }
      } catch {
        // skip
      }
    }

    expect(winnerFound, 'At least one player must see the game-over screen').toBe(true);
    expect(
      winnerText === 'Citizens Win!' || winnerText === 'Mob Wins!',
      `Winner text must be "Citizens Win!" or "Mob Wins!" — got "${winnerText}"`,
    ).toBe(true);
    log(`Winner: ${winnerText}`);

    // Verify host shows game-over overlay
    const hostGameOver = host.locator(overlaySel('game-over'));
    await expect(hostGameOver).toBeVisible({ timeout: 10_000 });

    const hostWinner = host.locator(sel('host-game-over-winner'));
    await expect(hostWinner).toBeVisible({ timeout: 5_000 });
    const hostWinnerText = await hostWinner.textContent();
    log(`Host shows: "${hostWinnerText}"`);

    expect(
      hostWinnerText === 'Citizens Win!' || hostWinnerText === 'Mob Wins!',
      `Host winner text must match — got "${hostWinnerText}"`,
    ).toBe(true);

    log('GAME COMPLETE - All verifications passed');

    await context.close();
  });
});

// ── Executive Power Handler ─────────────────────────────────────────

/**
 * Checks for and handles any pending executive power.
 * Returns true if a power was found and handled.
 */
async function handleExecutivePower(
  players: Page[],
  alive: Set<number>,
  host: Page,
): Promise<boolean> {
  // ── Investigation ─────────────────────────────────────────────
  const investigator = await findPlayerWith(players, alive, sel('investigate-picker'), 3000);
  if (investigator) {
    const name = PLAYER_NAMES[investigator.index];
    log(`Executive power: ${name} is investigating`);

    // Select first eligible player
    await investigator.page.locator(sel('investigate-player')).first().click();
    await investigator.page.waitForTimeout(ACTION_DELAY);
    await investigator.page.locator(sel('investigate-confirm')).click();
    log('Investigation target selected');

    // Wait for investigation result card
    await investigator.page.waitForTimeout(PROPAGATION_DELAY);

    // The investigation result screen has a tap-to-reveal, then auto-burns.
    // Click the card area to reveal, then click again or wait for auto-burn.
    const investCard = investigator.page.locator(sel('investigation-card'));
    const cardVisible = await investCard.isVisible({ timeout: 5000 }).catch(() => false);
    if (cardVisible) {
      // Tap to reveal
      await investCard.click();
      await investigator.page.waitForTimeout(1500);

      // Tap again or click burn button to dismiss
      const burnBtn = investigator.page.locator(sel('investigation-burn-btn'));
      const burnVisible = await burnBtn.isVisible().catch(() => false);
      if (burnVisible) {
        await burnBtn.click();
      } else {
        // Click the card area again to trigger burn
        await investCard.click();
      }
      await investigator.page.waitForTimeout(PROPAGATION_DELAY * 2);
      log('Investigation complete — evidence burned');
    }

    return true;
  }

  // ── Policy Peek ───────────────────────────────────────────────
  const peeker = await findPlayerWith(players, alive, sel('peek-cards'), 3000);
  if (peeker) {
    const name = PLAYER_NAMES[peeker.index];
    log(`Executive power: ${name} is peeking at policies`);

    await peeker.page.locator(sel('peek-confirm')).click();
    await peeker.page.waitForTimeout(PROPAGATION_DELAY);
    log('Policy peek acknowledged');
    return true;
  }

  // ── Special Nomination ────────────────────────────────────────
  const nominator = await findPlayerWith(players, alive, sel('special-nominate-picker'), 3000);
  if (nominator) {
    const name = PLAYER_NAMES[nominator.index];
    log(`Executive power: ${name} is making a special nomination`);

    await nominator.page.locator(sel('special-nominate-player')).first().click();
    await nominator.page.waitForTimeout(ACTION_DELAY);
    await nominator.page.locator(sel('special-nominate-confirm')).click();
    await nominator.page.waitForTimeout(PROPAGATION_DELAY);
    log('Special nomination complete');
    return true;
  }

  // ── Execution ─────────────────────────────────────────────────
  const executioner = await findPlayerWith(players, alive, sel('execute-picker'), 3000);
  if (executioner) {
    const name = PLAYER_NAMES[executioner.index];
    log(`Executive power: ${name} is executing someone`);

    // Select first eligible (alive) player — skip dead players
    const targets = executioner.page.locator(sel('execute-player'));
    const count = await targets.count();
    log(`Execution: ${count} targets available`);

    // Wait for GSAP stagger entrance animation to finish (~0.6s)
    await executioner.page.waitForTimeout(1000);

    // Find and click first alive target (dead items have --dead class)
    let targetClicked = false;
    for (let t = 0; t < count; t++) {
      const item = targets.nth(t);
      const isDead = await item.evaluate(el => el.classList.contains('player-picker__item--dead'));
      if (!isDead) {
        await item.click({ force: true, timeout: 10_000 });
        targetClicked = true;
        break;
      }
    }
    if (!targetClicked) {
      log('WARN: No alive execution targets found, clicking first');
      await targets.first().click({ force: true, timeout: 10_000 });
    }
    await executioner.page.waitForTimeout(ACTION_DELAY);
    await executioner.page.locator(sel('execute-confirm')).click({ force: true, timeout: 10_000 });
    await executioner.page.waitForTimeout(PROPAGATION_DELAY);

    // Update alive set: find which player became a spectator
    for (let i = 0; i < players.length; i++) {
      if (!alive.has(i)) continue;
      try {
        const isSpectator = await players[i]
          .locator(sel('spectator-badge'))
          .isVisible({ timeout: 2000 })
          .catch(() => false);
        if (isSpectator) {
          alive.delete(i);
          log(`${PLAYER_NAMES[i]} was eliminated (now spectator)`);
        }
      } catch {
        // skip
      }
    }

    log('Execution complete');
    return true;
  }

  return false;
}

// ── Nomination Helper ───────────────────────────────────────────────

async function doNomination(mayorPage: Page, mayorName: string, round: number): Promise<void> {
  // Find and click first eligible nomination target
  const nominationPlayers = mayorPage.locator(sel('nomination-player'));
  const count = await nominationPlayers.count();
  log(`Round ${round}: Mayor ${mayorName} sees ${count} nomination candidates`);

  // Click the first player who is clickable (not dead, not term-limited)
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const item = nominationPlayers.nth(i);
    // Check if the item is interactable (not pointer-events: none, not dead)
    const pointerEvents = await item.evaluate(
      (el) => window.getComputedStyle(el).pointerEvents,
    );
    const isDead = await item.evaluate((el) => el.classList.contains('player-picker__item--dead'));
    if (pointerEvents !== 'none' && !isDead) {
      await item.click();
      clicked = true;
      const targetName = await item.textContent();
      log(`Round ${round}: Mayor ${mayorName} selected "${targetName}" as chief`);
      break;
    }
  }

  if (!clicked) {
    // Fallback: just click the first one
    await nominationPlayers.first().click();
    log(`Round ${round}: Mayor ${mayorName} force-selected first candidate`);
  }

  await mayorPage.waitForTimeout(ACTION_DELAY);

  // Confirm nomination
  const confirmBtn = mayorPage.locator(sel('nomination-confirm'));
  await expect(confirmBtn).toBeEnabled({ timeout: 3000 });
  await confirmBtn.click();
  log(`Round ${round}: Nomination confirmed`);
}
