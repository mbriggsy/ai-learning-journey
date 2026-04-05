# Playwright E2E Testing: Multi-Device WebSocket Games

**Research date:** 2026-04-05
**Context:** Exploding Kittens Digital -- Jackbox-style architecture (TV board + phone controllers via PartyKit WebSocket)
**Playwright version:** v1.58+ (current stable as of research date)

---

## Table of Contents

1. [Multi-Context Setup (TV + Phones)](#1-multi-context-setup)
2. [Phone Viewport Emulation](#2-phone-viewport-emulation)
3. [WebSocket Reconnection Testing](#3-websocket-reconnection-testing)
4. [Avoiding Flaky Async Tests](#4-avoiding-flaky-async-tests)
5. [Network Condition Simulation](#5-network-condition-simulation)
6. [Test Structure: Fixtures + POM](#6-test-structure)
7. [CI: GitHub Actions](#7-ci-github-actions)
8. [Phone Lock/Unlock (visibilitychange)](#8-phone-lock-unlock)
9. [Seeded Randomness for Deterministic Tests](#9-seeded-randomness)
10. [Common Pitfalls](#10-common-pitfalls)
11. [Performance Metrics](#11-performance-metrics)
12. [Local PartyKit vs Deployed](#12-local-vs-deployed)

---

## 1. Multi-Context Setup

Each `BrowserContext` is an isolated session (separate cookies, storage, WebSocket connections). This is the foundation -- one context per player.

### The Core Fixture Pattern

```typescript
// e2e/fixtures/game-fixtures.ts
import { test as base, Browser, BrowserContext, Page, devices } from '@playwright/test';

interface PlayerContext {
  context: BrowserContext;
  page: Page;
  name: string;
}

interface GameFixtures {
  tvBoard: Page;
  phone1: PlayerContext;
  phone2: PlayerContext;
  phone3: PlayerContext;
  phone4: PlayerContext;
}

export const test = base.extend<GameFixtures>({
  tvBoard: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },

  phone1: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      ...devices['iPhone 14 Pro'],
    });
    const page = await ctx.newPage();
    await use({ context: ctx, page, name: 'Player1' });
    await ctx.close();
  },

  phone2: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      ...devices['Pixel 7'],
    });
    const page = await ctx.newPage();
    await use({ context: ctx, page, name: 'Player2' });
    await ctx.close();
  },

  phone3: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await ctx.newPage();
    await use({ context: ctx, page, name: 'Player3' });
    await ctx.close();
  },

  phone4: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      ...devices['Galaxy S21'],
    });
    const page = await ctx.newPage();
    await use({ context: ctx, page, name: 'Player4' });
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
```

### Coordinating Actions Across Contexts

Use `Promise.all()` for parallel navigation, sequential `await` for turn-based actions:

```typescript
test('full game flow: join, play, explode, win', async ({ tvBoard, phone1, phone2, phone3 }) => {
  // TV creates the room
  await tvBoard.goto('/host');
  const roomCode = await tvBoard.locator('[data-testid="room-code"]').textContent();

  // All phones join in parallel
  await Promise.all([
    phone1.page.goto(`/join?code=${roomCode}`),
    phone2.page.goto(`/join?code=${roomCode}`),
    phone3.page.goto(`/join?code=${roomCode}`),
  ]);

  // TV should show all players
  await expect(tvBoard.locator('[data-testid="player-count"]')).toHaveText('3');

  // Host starts game
  await tvBoard.locator('[data-testid="start-game"]').click();

  // Wait for all phones to show their hand
  await Promise.all([
    expect(phone1.page.locator('[data-testid="hand"]')).toBeVisible(),
    expect(phone2.page.locator('[data-testid="hand"]')).toBeVisible(),
    expect(phone3.page.locator('[data-testid="hand"]')).toBeVisible(),
  ]);
});
```

**Key insight:** Each `BrowserContext` maintains its own WebSocket connection to PartyKit. They are truly independent -- no shared state leakage.

---

## 2. Phone Viewport Emulation

### Built-in Device Registry

Playwright ships with pre-configured device profiles. These set viewport, user agent, device scale factor, and `isMobile: true` (which enables touch events).

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'tv-board',
      use: { viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'phone-iphone',
      use: { ...devices['iPhone 14 Pro'] },
      // Sets: viewport 393x852, UA string, deviceScaleFactor 3, isMobile true, hasTouch true
    },
    {
      name: 'phone-android',
      use: { ...devices['Pixel 7'] },
      // Sets: viewport 412x915, UA string, deviceScaleFactor 2.625, isMobile true, hasTouch true
    },
  ],
});
```

### Key Device Viewports for Testing

| Device | Viewport | Scale | Notes |
|--------|----------|-------|-------|
| iPhone SE | 375x667 | 2x | Smallest common iPhone |
| iPhone 14 Pro | 393x852 | 3x | Modern iPhone |
| iPhone 15 Pro Max | 430x932 | 3x | Largest iPhone |
| Pixel 7 | 412x915 | 2.625x | Standard Android |
| Galaxy S21 | 360x800 | 3x | Samsung flagship |

### Touch Event Simulation

Playwright automatically dispatches touch events when `hasTouch: true` (set by device profiles). For `tap`, Playwright's `.click()` automatically becomes a tap on touch-enabled contexts.

For custom touch gestures (swipe to discard a card):

```typescript
async function swipeCard(locator: Locator, deltaX: number, deltaY: number) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element not visible');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  const touches = [{ clientX: startX, clientY: startY }];
  await locator.dispatchEvent('touchstart', {
    touches, changedTouches: touches, targetTouches: touches,
  });

  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    touches[0].clientX = startX + (deltaX * i) / steps;
    touches[0].clientY = startY + (deltaY * i) / steps;
    await locator.dispatchEvent('touchmove', {
      touches, changedTouches: touches, targetTouches: touches,
    });
  }

  await locator.dispatchEvent('touchend', {
    touches: [], changedTouches: touches, targetTouches: [],
  });
}
```

---

## 3. WebSocket Reconnection Testing

Three techniques, from simple to advanced.

### Technique A: `context.setOffline()` (Simplest)

Toggles the browser's offline state. WebSocket connections will fail/close. When toggled back, the app's reconnection logic kicks in.

```typescript
test('reconnects after WiFi drop', async ({ phone1, tvBoard }) => {
  // ... join game, verify connected ...

  // Simulate WiFi drop on phone1
  await phone1.context.setOffline(true);

  // Wait for TV to show player disconnected
  await expect(tvBoard.locator(`[data-testid="player-${phone1.name}-status"]`))
    .toHaveText('disconnected', { timeout: 10000 });

  // Bring WiFi back
  await phone1.context.setOffline(false);

  // Wait for reconnection + state restoration
  await expect(phone1.page.locator('[data-testid="hand"]')).toBeVisible({ timeout: 15000 });
  await expect(tvBoard.locator(`[data-testid="player-${phone1.name}-status"]`))
    .toHaveText('connected');
});
```

### Technique B: CDP Network Emulation (Chromium Only)

Gives granular control over latency, throughput, and connection type. Best for simulating spotty mobile connections.

```typescript
test('handles high-latency reconnection', async ({ phone1 }) => {
  const cdp = await phone1.context.newCDPSession(phone1.page);

  // Simulate slow 3G
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 2000,                       // 2s round-trip
    downloadThroughput: 750 * 1024 / 8,  // 750 kbps
    uploadThroughput: 250 * 1024 / 8,    // 250 kbps
    connectionType: 'cellular3g',
  });

  // Perform game actions under poor conditions...
  // Assert that state still synchronizes correctly

  // Full disconnect
  await cdp.send('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
  });

  // Restore
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  });

  await cdp.detach();
});
```

**Limitation:** CDP is Chromium-only. For cross-browser testing, use `context.setOffline()`.

### Technique C: `page.routeWebSocket()` (Message-Level Control)

Intercept WebSocket traffic to simulate server-side disconnects, inject messages, or delay frames.

```typescript
test('handles server-initiated disconnect during Defuse', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();

  let serverWs: any;

  await ctx.routeWebSocket('**/party/**', async route => {
    serverWs = await route.connectToServer();

    route.onMessage(msg => {
      // Forward all messages from client to server
      serverWs.send(msg);
    });

    serverWs.onMessage(msg => {
      // Forward all messages from server to client
      route.send(msg);
    });
  });

  await page.goto('/join?code=TEST');
  // ... play until Defuse card drawn ...

  // Simulate server dropping the connection
  if (serverWs) {
    serverWs.close(1001, 'server restarting');
  }

  // Assert client shows reconnecting UI
  await expect(page.locator('[data-testid="reconnecting-overlay"]'))
    .toBeVisible({ timeout: 5000 });

  await ctx.close();
});
```

---

## 4. Avoiding Flaky Async Tests

### Rule 1: NEVER Use Static Waits

```typescript
// BAD: Race condition waiting to happen
await page.waitForTimeout(2000);

// GOOD: Wait for the actual state change
await expect(page.locator('[data-testid="turn-indicator"]'))
  .toHaveText('Player2\'s Turn', { timeout: 10000 });
```

### Rule 2: Use Auto-Retrying Assertions

Playwright's `expect(locator)` assertions auto-retry until timeout. These are the backbone of reliable WebSocket tests:

```typescript
// This will poll until the text appears or timeout (default 5s)
await expect(phone2.page.locator('[data-testid="hand-count"]')).toHaveText('6');

// Wait for an element to appear after a WebSocket state push
await expect(tvBoard.locator('[data-testid="nope-window"]')).toBeVisible();
```

### Rule 3: waitForFunction for Complex State

When you need to wait for application state that isn't directly visible in the DOM:

```typescript
await phone1.page.waitForFunction(() => {
  const state = (window as any).__GAME_STATE__;
  return state?.phase === 'playing' && state?.currentPlayer === 'Player1';
}, { timeout: 15000 });
```

### Rule 4: Synchronize Multi-Player Actions

For turn-based games, sequence actions with `waitForEvent`:

```typescript
// Wait for the WebSocket to receive the state update confirming it's Player1's turn
const [turnUpdate] = await Promise.all([
  phone1.page.waitForEvent('websocket').then(ws =>
    ws.waitForEvent('framereceived', {
      predicate: e => {
        const msg = JSON.parse(e.payload as string);
        return msg.type === 'state-update' && msg.currentPlayer === 'Player1';
      },
    })
  ),
  tvBoard.locator('[data-testid="end-turn"]').click(),
]);
```

### Rule 5: Utility Function for Cross-Client State Sync

```typescript
async function waitForAllPlayersToSee(
  pages: Page[],
  selector: string,
  expectedText: string,
  timeout = 10000
) {
  await Promise.all(
    pages.map(page =>
      expect(page.locator(selector)).toContainText(expectedText, { timeout })
    )
  );
}

// Usage:
await waitForAllPlayersToSee(
  [phone1.page, phone2.page, phone3.page],
  '[data-testid="game-phase"]',
  'Playing'
);
```

---

## 5. Network Condition Simulation

### Per-Context Isolation

Each `BrowserContext` can have independent network conditions. This is perfect for testing "one player has bad WiFi while others are fine."

```typescript
test('game continues when one player has bad connection', async ({ phone1, phone2, tvBoard }) => {
  // Only phone1 gets degraded network
  const cdp = await phone1.context.newCDPSession(phone1.page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 3000,
    downloadThroughput: 100 * 1024 / 8,  // 100 kbps
    uploadThroughput: 50 * 1024 / 8,
  });

  // phone2 plays a card -- should work fine on TV
  await phone2.page.locator('[data-testid="card-attack"]').click();
  await expect(tvBoard.locator('[data-testid="last-action"]'))
    .toContainText('Attack', { timeout: 5000 });

  // phone1 should eventually catch up
  await expect(phone1.page.locator('[data-testid="last-action"]'))
    .toContainText('Attack', { timeout: 15000 }); // Generous timeout for slow network

  await cdp.detach();
});
```

### Preset Network Profiles

```typescript
const NETWORK_PROFILES = {
  offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
  slow3g: {
    offline: false, latency: 2000,
    downloadThroughput: 750 * 1024 / 8,
    uploadThroughput: 250 * 1024 / 8,
    connectionType: 'cellular3g' as const,
  },
  fast3g: {
    offline: false, latency: 562,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    connectionType: 'cellular4g' as const,
  },
  wifi: {
    offline: false, latency: 28,
    downloadThroughput: 30 * 1024 * 1024 / 8,
    uploadThroughput: 15 * 1024 * 1024 / 8,
    connectionType: 'wifi' as const,
  },
  reset: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
} as const;

async function setNetworkProfile(
  context: BrowserContext,
  page: Page,
  profile: keyof typeof NETWORK_PROFILES
) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', NETWORK_PROFILES[profile]);
  return cdp; // Caller must detach when done
}
```

---

## 6. Test Structure

### Recommended Directory Layout

```
e2e/
  fixtures/
    game-fixtures.ts          # test.extend with TV + phone contexts
    network-fixtures.ts       # CDP network helpers
    seed-fixtures.ts          # Seeded randomness
  pages/
    tv-board.page.ts          # POM for TV board view
    phone-controller.page.ts  # POM for phone controller view
    lobby.page.ts             # POM for lobby/join screen
  helpers/
    wait-helpers.ts           # Cross-client sync utilities
    ws-helpers.ts             # WebSocket interception utilities
  tests/
    full-game-flow.spec.ts
    reconnection.spec.ts
    nope-chains.spec.ts
    favor-nope-cancel.spec.ts
    stale-version.spec.ts
    phone-lock-unlock.spec.ts
```

### Page Object Model for Game Views

```typescript
// e2e/pages/phone-controller.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class PhoneControllerPage {
  readonly page: Page;
  readonly hand: Locator;
  readonly handCards: Locator;
  readonly drawButton: Locator;
  readonly nopeButton: Locator;
  readonly turnIndicator: Locator;
  readonly reconnectingOverlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.hand = page.locator('[data-testid="hand"]');
    this.handCards = page.locator('[data-testid="hand-card"]');
    this.drawButton = page.getByRole('button', { name: /draw/i });
    this.nopeButton = page.getByRole('button', { name: /nope/i });
    this.turnIndicator = page.locator('[data-testid="turn-indicator"]');
    this.reconnectingOverlay = page.locator('[data-testid="reconnecting-overlay"]');
  }

  async joinRoom(code: string, playerName: string) {
    await this.page.goto(`/join`);
    await this.page.getByLabel('Room Code').fill(code);
    await this.page.getByLabel('Name').fill(playerName);
    await this.page.getByRole('button', { name: /join/i }).click();
    await expect(this.page.locator('[data-testid="lobby"]')).toBeVisible();
  }

  async playCard(cardTestId: string) {
    await this.page.locator(`[data-testid="${cardTestId}"]`).click();
    await this.page.getByRole('button', { name: /confirm/i }).click();
  }

  async getHandCount(): Promise<number> {
    return await this.handCards.count();
  }

  async waitForMyTurn(timeout = 30000) {
    await expect(this.turnIndicator).toHaveText(/your turn/i, { timeout });
  }

  async expectReconnecting() {
    await expect(this.reconnectingOverlay).toBeVisible({ timeout: 10000 });
  }

  async expectConnected() {
    await expect(this.reconnectingOverlay).not.toBeVisible({ timeout: 15000 });
  }
}
```

```typescript
// e2e/pages/tv-board.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class TVBoardPage {
  readonly page: Page;
  readonly roomCode: Locator;
  readonly playerList: Locator;
  readonly drawPile: Locator;
  readonly discardPile: Locator;
  readonly nopeWindow: Locator;
  readonly currentPlayerIndicator: Locator;
  readonly startButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.roomCode = page.locator('[data-testid="room-code"]');
    this.playerList = page.locator('[data-testid="player-list"]');
    this.drawPile = page.locator('[data-testid="draw-pile"]');
    this.discardPile = page.locator('[data-testid="discard-pile"]');
    this.nopeWindow = page.locator('[data-testid="nope-window"]');
    this.currentPlayerIndicator = page.locator('[data-testid="current-player"]');
    this.startButton = page.getByRole('button', { name: /start game/i });
  }

  async createRoom(): Promise<string> {
    await this.page.goto('/host');
    const code = await this.roomCode.textContent();
    if (!code) throw new Error('Room code not found');
    return code;
  }

  async startGame() {
    await this.startButton.click();
    await expect(this.drawPile).toBeVisible();
  }

  async expectPlayerCount(n: number) {
    await expect(this.playerList.locator('[data-testid^="player-"]'))
      .toHaveCount(n, { timeout: 10000 });
  }

  async expectPlayerStatus(playerName: string, status: 'connected' | 'disconnected') {
    await expect(this.page.locator(`[data-testid="player-${playerName}-status"]`))
      .toHaveText(status, { timeout: 10000 });
  }

  async expectNopeWindowVisible() {
    await expect(this.nopeWindow).toBeVisible({ timeout: 5000 });
  }
}
```

### Fixture with POMs

```typescript
// e2e/fixtures/game-fixtures.ts (enhanced)
import { test as base, devices } from '@playwright/test';
import { TVBoardPage } from '../pages/tv-board.page';
import { PhoneControllerPage } from '../pages/phone-controller.page';

interface PlayerFixture {
  controller: PhoneControllerPage;
  name: string;
}

interface GameFixtures {
  tvBoard: TVBoardPage;
  player1: PlayerFixture;
  player2: PlayerFixture;
  player3: PlayerFixture;
}

export const test = base.extend<GameFixtures>({
  tvBoard: async ({ browser }, use) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await use(new TVBoardPage(page));
    await ctx.close();
  },

  player1: async ({ browser }, use) => {
    const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
    const page = await ctx.newPage();
    await use({ controller: new PhoneControllerPage(page), name: 'Alice' });
    await ctx.close();
  },

  player2: async ({ browser }, use) => {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await use({ controller: new PhoneControllerPage(page), name: 'Bob' });
    await ctx.close();
  },

  player3: async ({ browser }, use) => {
    const ctx = await browser.newContext({ ...devices['iPhone 12'] });
    const page = await ctx.newPage();
    await use({ controller: new PhoneControllerPage(page), name: 'Carol' });
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
```

---

## 7. CI: GitHub Actions

### Basic Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        # Only chromium needed -- we use device emulation, not real Firefox/WebKit

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

### Sharded Workflow for Speed

Multi-context tests are heavier than normal. Sharding distributes across machines:

```yaml
jobs:
  e2e-shards:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run shard ${{ matrix.shard }}/4
        run: npx playwright test --shard=${{ matrix.shard }}/4 --reporter=blob
      - uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 7

  merge-reports:
    needs: e2e-shards
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
      - run: npx playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-html-report
          path: playwright-report/
          retention-days: 30
```

### playwright.config.ts for CI

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  // Multi-context tests are memory-heavy; 2 workers is safe on GH Actions (7GB RAM)
  reporter: process.env.CI ? 'blob' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Start both the frontend dev server and PartyKit
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npx partykit dev',
      url: 'http://localhost:1999',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],

  projects: [
    {
      name: 'multi-device-game',
      use: { ...devices['Desktop Chrome'] },
      // Individual tests create their own contexts with device profiles
    },
  ],
});
```

### Resource Usage Notes

- Each `BrowserContext` is lightweight (~50MB) vs a full `Browser` instance (~200MB+)
- 5 contexts (1 TV + 4 phones) in one test: ~250MB total
- GitHub Actions `ubuntu-latest`: 7GB RAM, 2 vCPUs
- Safe to run 2 workers with 5 contexts each (2 * 250MB = 500MB, well within limits)
- Use `workers: 1` if tests share a single PartyKit room and could interfere

---

## 8. Phone Lock/Unlock (visibilitychange)

Playwright cannot trigger a real OS-level screen lock. The approach is to use `page.evaluate()` to override `document.visibilityState` and dispatch `visibilitychange`.

### Utility Functions

```typescript
// e2e/helpers/visibility-helpers.ts
import { Page } from '@playwright/test';

export async function simulatePhoneLock(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

export async function simulatePhoneUnlock(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
```

### Test: Lock During Nope Window

```typescript
import { simulatePhoneLock, simulatePhoneUnlock } from '../helpers/visibility-helpers';

test('phone lock during Nope window, unlock shows correct state', async ({
  tvBoard, player1, player2
}) => {
  // ... setup: game in progress, player1 plays a card, Nope window opens ...

  // Lock player2's phone during the Nope window
  await simulatePhoneLock(player2.controller.page);

  // Nope window expires on TV
  await expect(tvBoard.nopeWindow).not.toBeVisible({ timeout: 10000 });

  // Unlock player2's phone
  await simulatePhoneUnlock(player2.controller.page);

  // player2 should see updated state (Nope window gone, action resolved)
  await expect(player2.controller.page.locator('[data-testid="nope-button"]'))
    .not.toBeVisible({ timeout: 5000 });
});
```

### Combining Lock + Network Offline

Real phone locks on mobile Safari can also cause WebSocket disconnects. Test both simultaneously:

```typescript
test('phone lock causes WS disconnect, unlock triggers reconnect', async ({ player1 }) => {
  // Lock the phone (visibilitychange)
  await simulatePhoneLock(player1.controller.page);

  // Also go offline (simulates what really happens on iOS when locked for >30s)
  await player1.controller.page.context().setOffline(true);

  // Wait a bit to simulate time locked
  await player1.controller.page.waitForTimeout(2000);

  // Unlock
  await player1.controller.page.context().setOffline(false);
  await simulatePhoneUnlock(player1.controller.page);

  // App should reconnect and restore state
  await player1.controller.expectConnected();
  await expect(player1.controller.hand).toBeVisible();
});
```

---

## 9. Seeded Randomness

### The Problem

PartyKit server shuffles the deck using `Math.random()`. Different shuffle = different game state = non-deterministic tests.

### Two Approaches

**Approach A: Seed the Server (Recommended for EK)**

Since our game engine runs on the PartyKit server, inject a seed via the room creation API:

```typescript
// In your PartyKit server
export default class GameServer implements Party.Server {
  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message);
    if (msg.type === 'create-game') {
      // Use seed if provided (testing), otherwise generate one
      const seed = msg.seed ?? Date.now().toString(36);
      this.room.storage.put('seed', seed);
      const rng = createSeededRNG(seed); // Your seeded PRNG
      const deck = shuffleDeck(ALL_CARDS, rng);
      // ...
    }
  }
}

// In E2E test
test('deterministic deck order with seed', async ({ tvBoard }) => {
  await tvBoard.page.goto('/host?seed=test-seed-42');
  // The server will use "test-seed-42" to shuffle the deck
  // Now you know the exact card order and can make precise assertions
});
```

**Approach B: Override `Math.random` on Client (for client-side randomness only)**

Use `addInitScript` to override `Math.random` before any page scripts run:

```typescript
// e2e/helpers/seed-helpers.ts
import { BrowserContext } from '@playwright/test';

export async function seedContext(context: BrowserContext, seed: number) {
  await context.addInitScript((s: number) => {
    // Simple mulberry32 PRNG (fast, good distribution)
    let t = s;
    Math.random = () => {
      t |= 0;
      t = (t + 0x6d2b79f5) | 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}
```

**Approach A is better for EK** because game state lives on the server. Seeding the server gives you full control of the deck order, draw sequence, and every game outcome.

### Reproducing Failures

When a test fails with a random seed, log it:

```typescript
const seed = `e2e-${Date.now()}`;
console.log(`Test seed: ${seed}`);
// On failure, re-run: TEST_SEED=e2e-1712345678 npx playwright test --grep "specific test"
```

---

## 10. Common Pitfalls

### Pitfall 1: Racing Against WebSocket Delivery

```typescript
// BAD: Click button, immediately assert UI -- WS message might not have arrived yet
await phone1.controller.playCard('attack');
expect(await tvBoard.page.locator('#last-action').textContent()).toBe('Attack');

// GOOD: Use auto-retrying assertion
await phone1.controller.playCard('attack');
await expect(tvBoard.page.locator('#last-action')).toContainText('Attack');
```

### Pitfall 2: Shared Room State Between Tests

```typescript
// BAD: All tests use the same room code -- state leaks between tests
const ROOM_CODE = 'test-room';

// GOOD: Each test gets a unique room
test('game flow', async ({ tvBoard }) => {
  const code = await tvBoard.createRoom(); // Generates unique code
  // ...
});
```

### Pitfall 3: Not Waiting for All Clients to Receive State

After a game action, ALL clients need to receive the WebSocket update before asserting:

```typescript
// BAD: Only check one client
await phone1.controller.playCard('skip');
await expect(tvBoard.page.locator('[data-testid="current-player"]')).toHaveText('Bob');

// GOOD: Verify all clients see the update
await phone1.controller.playCard('skip');
await Promise.all([
  expect(tvBoard.page.locator('[data-testid="current-player"]')).toHaveText('Bob'),
  expect(phone1.controller.turnIndicator).not.toHaveText(/your turn/i),
  expect(phone2.controller.turnIndicator).toHaveText(/your turn/i),
]);
```

### Pitfall 4: Forgetting to Close Contexts

Not closing contexts leaks memory and can cause port exhaustion:

```typescript
// Always use the fixture pattern -- ctx.close() happens in teardown automatically
// If manually creating contexts in tests, always close them:
test.afterEach(async ({ browser }) => {
  // Fixtures handle this -- but if you create extra contexts, close them
});
```

### Pitfall 5: routeWebSocket Must Be Set Before Navigation

```typescript
// BAD: Route set after page loads -- WebSocket already connected, route is ignored
await page.goto('/game');
await page.routeWebSocket('**/party/**', handler);

// GOOD: Route set before navigation
await page.routeWebSocket('**/party/**', handler);
await page.goto('/game');
```

### Pitfall 6: CDP Network Emulation is Chromium-Only

Tests using `newCDPSession` will fail on Firefox and WebKit. Guard them:

```typescript
test('slow network handling', async ({ browserName, phone1 }) => {
  test.skip(browserName !== 'chromium', 'CDP only available on Chromium');
  const cdp = await phone1.context.newCDPSession(phone1.page);
  // ...
});
```

### Pitfall 7: Assertions on `textContent()` vs Locator Assertions

```typescript
// BAD: textContent() is a snapshot -- no retries, race condition
const text = await page.locator('#count').textContent();
expect(text).toBe('5');

// GOOD: Auto-retrying locator assertion
await expect(page.locator('#count')).toHaveText('5');
```

---

## 11. Performance Metrics

### Measuring WebSocket Round-Trip Time

```typescript
test('WebSocket round-trip under 100ms', async ({ phone1 }) => {
  const rtt = await phone1.controller.page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const ws = (window as any).__WS__; // Expose your WS instance
      const start = performance.now();
      const pingId = crypto.randomUUID();

      const handler = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong' && msg.id === pingId) {
          ws.removeEventListener('message', handler);
          resolve(performance.now() - start);
        }
      };

      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ type: 'ping', id: pingId }));
    });
  });

  expect(rtt).toBeLessThan(100);
});
```

### Measuring State Propagation Time

Time from one client's action to another client seeing the update:

```typescript
test('state propagation < 200ms between clients', async ({ phone1, phone2 }) => {
  // Inject a timestamp marker before the action
  const t0 = Date.now();

  await phone1.controller.playCard('attack');

  // Wait for phone2 to see the update and capture when it appeared
  await phone2.controller.page.waitForFunction(
    (startTime) => {
      const el = document.querySelector('[data-testid="last-action"]');
      if (el?.textContent?.includes('Attack')) {
        (window as any).__propagationTime = Date.now() - startTime;
        return true;
      }
      return false;
    },
    t0,
    { timeout: 5000 }
  );

  const propagationTime = await phone2.controller.page.evaluate(
    () => (window as any).__propagationTime
  );

  expect(propagationTime).toBeLessThan(200);
});
```

### Web Vitals via PerformanceObserver

```typescript
test('TV board LCP under 2.5s', async ({ tvBoard }) => {
  // Navigate and measure
  await tvBoard.page.goto('/host', { waitUntil: 'networkidle' });

  const lcp = await tvBoard.page.evaluate(() => {
    return new Promise<number>((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        resolve(last.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Fallback if no LCP entry after 5s
      setTimeout(() => resolve(-1), 5000);
    });
  });

  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThan(2500);
});
```

### Custom Timing with performance.mark/measure

```typescript
test('card animation completes within 500ms', async ({ phone1 }) => {
  // Inject marks around the animation
  await phone1.controller.page.evaluate(() => {
    performance.mark('animation-start');
  });

  await phone1.controller.playCard('defuse');

  // Wait for animation to complete (indicated by a CSS class or data attribute)
  await expect(phone1.controller.page.locator('[data-testid="card-animation"]'))
    .toHaveAttribute('data-state', 'complete', { timeout: 2000 });

  const duration = await phone1.controller.page.evaluate(() => {
    performance.mark('animation-end');
    performance.measure('card-animation', 'animation-start', 'animation-end');
    const measure = performance.getEntriesByName('card-animation', 'measure')[0];
    return measure?.duration ?? -1;
  });

  expect(duration).toBeGreaterThan(0);
  expect(duration).toBeLessThan(500);
});
```

---

## 12. Local PartyKit vs Deployed

### Recommendation: BOTH, with Different Strategies

| Aspect | Local (`npx partykit dev`) | Deployed (PartyKit preview) |
|--------|---------------------------|----------------------------|
| Speed | Fast iteration, instant feedback | Slower, requires deploy step |
| Fidelity | Good but not production-identical | Production infrastructure |
| CI | Primary target for all E2E tests | Smoke tests only |
| Network | Localhost, no real latency | Real network, real edge nodes |
| WebSocket | Direct localhost:1999 | wss://your-app.partykit.dev |
| Cost | Free | Free tier covers testing |

### Local Setup (Primary)

Use Playwright's `webServer` to auto-start PartyKit dev server:

```typescript
// playwright.config.ts
webServer: [
  {
    command: 'npm run dev',          // Vite frontend
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  {
    command: 'npx partykit dev',     // PartyKit server
    url: 'http://localhost:1999',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
],
```

Playwright waits for both servers to be ready before running tests. In CI, fresh instances every time. Locally, reuses existing dev servers if already running.

### Deployed Smoke Tests

For post-deploy verification, use environment variables:

```typescript
// playwright.config.ts
const isDeployed = !!process.env.DEPLOYED_URL;

export default defineConfig({
  use: {
    baseURL: process.env.DEPLOYED_URL || 'http://localhost:3000',
  },
  webServer: isDeployed ? undefined : [
    // ... local servers only when not testing deployed
  ],
});
```

```yaml
# In CI, after deploy step:
- name: Smoke test deployed environment
  env:
    DEPLOYED_URL: https://ek-preview-${{ github.sha }}.partykit.dev
  run: npx playwright test --grep @smoke
```

### PartyKit Preview Environments

PartyKit supports preview deploys for branches:

```bash
npx partykit deploy --preview pr-42
# Creates: https://your-app-pr-42.your-name.partykit.dev
```

This is useful for PR-level testing against real infrastructure.

---

## Summary: What to Build

### Phase 6 E2E Test Plan (Priority Order)

1. **Fixture infrastructure** -- `game-fixtures.ts` with TV + phone contexts, POM classes
2. **Full game flow** -- Join, play cards, draw, explode, Defuse, win
3. **Reconnection** -- `context.setOffline()` for each edge case in phase plan
4. **Nope chain** -- Play card, Nope, Nope-the-Nope, verify resolution
5. **Favor cancelled by Nope** -- Favor played, target prompted, Noped, prompt cancelled
6. **Stale stateVersion** -- Inject outdated version, verify server rejection
7. **Phone lock/unlock** -- `visibilitychange` simulation + offline combo
8. **Seeded randomness** -- Server-side seed for deterministic deck order
9. **Performance gates** -- WS round-trip < 100ms, state propagation < 200ms, LCP < 2.5s
10. **CI pipeline** -- GitHub Actions with sharding, report upload, PartyKit auto-start
