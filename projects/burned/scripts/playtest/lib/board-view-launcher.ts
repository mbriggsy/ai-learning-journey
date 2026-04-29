/**
 * Board-view launcher (Phase 6 Unit 2.6).
 *
 * Spawns ONE orchestrator-owned Chromium board page and taps "Cleared Hot"
 * once the lobby has enough operatives to start. Closes the page + browser
 * on `close()`.
 *
 * Why this exists: Phase 6 Unit 2.5 / Option A retired the orchestrator's
 * Chromium and gave each seat its own MCP-Playwright browser via the
 * `playwright-seat-N` MCP servers. That was correct for SEATS — they hold
 * private hand state that benefits from per-process isolation. But the
 * board has no private surface to protect (it's a shared TV view; spectator-
 * grade projection only) and was the host of the human-tap "Cleared Hot"
 * affordance (`src/client/board/Lobby.tsx:97-99`). Without a board client,
 * agents land in the lobby and wait forever — see insight 032.
 *
 * Architecture choice (insight 032 Option 1, recommended):
 *   - Orchestrator owns this browser directly via `@playwright/test`'s
 *     `chromium.launch`. No MCP isolation; the board has no read-write
 *     surface that benefits from per-seat process boundaries.
 *   - Tap once, then idle. We do NOT close the page mid-session — that
 *     would disconnect the board's WebSocket and emit a bystander COMMS
 *     event that real product flow doesn't produce.
 *   - Cleanup in orchestrator's `finalize()` after seats teardown but
 *     before god/servers (board WS depends on the wrangler being up).
 *
 * Insight 022: ZERO imports from `src/server/`, `src/shared/`, or
 * `partyserver`. Node stdlib + @playwright/test only.
 */

import type { Browser, BrowserContext, Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LaunchBoardViewArgs {
  /** Room code the board should join. Same value the orchestrator hands seats. */
  readonly roomCode: string
  /** Vite dev server base URL (no trailing slash). e.g. `http://localhost:5173`. */
  readonly viteBaseUrl: string
  /**
   * Wait for the lobby to reach EXACTLY this many connected operatives before
   * clicking "Cleared Hot". Required to prevent the harness from starting the
   * game with fewer-than-configured seats — the lobby's start button enables
   * at the product minimum (2 players, `Lobby.tsx:35`), which made any seat
   * whose MCP browser was slow to boot miss the start (TODO #6, three observed
   * occurrences across calibration runs 1303-3p and 1339-3p).
   *
   * Defaults to 2 (matches the product minimum and preserves prior behavior
   * for callers that don't pass a seat count). The orchestrator passes the
   * configured `config.seats` here.
   *
   * Must be an integer in [2, 10] (matches `MAX_PLAYERS` and the Config seat
   * range). Validated synchronously before chromium launch.
   */
  readonly expectedPlayerCount?: number
  /**
   * How long to poll for the lobby to reach `expectedPlayerCount` before
   * giving up. This is the slow wait — seats are remote-dispatched Claude
   * agents that take a few seconds each to spawn. The subsequent
   * "Cleared Hot" wait reuses the small fixed timeout below because once
   * the count is reached the button is guaranteed enabled.
   *
   * Defaults to 60_000 (60s).
   */
  readonly waitForStartTimeoutMs?: number
  /** Optional viewport for the board page. Defaults to 1920x1080 (TV-ish). */
  readonly viewport?: { readonly width: number; readonly height: number }
  /** Test seam: chromium launcher. Defaults to real `@playwright/test`. */
  readonly chromiumLauncher?: () => Promise<Browser>
  /** Optional logger; defaults to no-op. */
  readonly logger?: (msg: string) => void
}

/**
 * Handle returned by `launchBoardView`. The orchestrator stores this on its
 * teardown list and `close()`s it during `finalize()`.
 *
 * `started` resolves when "Cleared Hot" was successfully clicked. The
 * orchestrator does NOT wait on `started` — it backgrounds the start work
 * so seat-driver and start-tap proceed in parallel. We expose it for tests
 * and for future schedulers that want to gate work on game-actually-started.
 */
export interface BoardViewHandle {
  /** Resolves when "Cleared Hot" was clicked. Rejects on timeout / launch error. */
  readonly started: Promise<void>
  /** Idempotent. Closes page → context → browser. Best-effort; never throws. */
  close(): Promise<void>
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_WAIT_TIMEOUT_MS = 60_000
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 } as const
const DEFAULT_EXPECTED_PLAYER_COUNT = 2
const MIN_EXPECTED_PLAYER_COUNT = 2
const MAX_EXPECTED_PLAYER_COUNT = 10
/**
 * Once the lobby reaches `expectedPlayerCount` the "Cleared Hot" button is
 * guaranteed enabled (canStart fires at >=2 in Lobby.tsx). We give it a
 * generous-but-finite window to render the enabled label so a CSS-module
 * hash drift doesn't hang the launcher forever.
 */
const BUTTON_VISIBLE_TIMEOUT_MS = 5_000

async function defaultChromiumLauncher(): Promise<Browser> {
  const { chromium } = await import('@playwright/test')
  return chromium.launch({ headless: true })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open a board page, wait for the configured operative count, click
 * "Cleared Hot", return a close handle.
 *
 * Lifecycle:
 *   1. Launch chromium (test seam: `chromiumLauncher`).
 *   2. New context with viewport.
 *   3. New page; navigate to `${viteBaseUrl}/board.html#${roomCode}`.
 *   4. Wait for `[data-player-count="${expectedPlayerCount}"]` to be visible
 *      — the lobby roster div carries this attribute (`Lobby.tsx:53`) and
 *      updates live as players join. This is the slow gate; it gets the
 *      caller-supplied `waitForStartTimeoutMs`.
 *   5. Wait for `button:has-text("Cleared Hot")` to be visible. Once the
 *      count is reached the button is guaranteed enabled, so this gate
 *      uses a small fixed timeout.
 *   6. Click it once.
 *   7. Resolve `started`. Idle until `close()` is called.
 *
 * Errors during the start sequence reject `started` but do NOT throw from
 * `launchBoardView` itself — the handle is returned so the orchestrator can
 * still `close()` the browser cleanly.
 */
export async function launchBoardView(
  args: LaunchBoardViewArgs,
): Promise<BoardViewHandle> {
  const {
    roomCode,
    viteBaseUrl,
    expectedPlayerCount = DEFAULT_EXPECTED_PLAYER_COUNT,
    waitForStartTimeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
    viewport = DEFAULT_VIEWPORT,
    chromiumLauncher = defaultChromiumLauncher,
    logger = () => {
      /* no-op */
    },
  } = args

  if (roomCode.length === 0) {
    throw new Error('launchBoardView: roomCode must be non-empty')
  }
  if (viteBaseUrl.length === 0) {
    throw new Error('launchBoardView: viteBaseUrl must be non-empty')
  }
  if (
    !Number.isInteger(expectedPlayerCount) ||
    expectedPlayerCount < MIN_EXPECTED_PLAYER_COUNT ||
    expectedPlayerCount > MAX_EXPECTED_PLAYER_COUNT
  ) {
    throw new Error(
      `launchBoardView: expectedPlayerCount must be an integer in [${MIN_EXPECTED_PLAYER_COUNT}, ${MAX_EXPECTED_PLAYER_COUNT}], got ${expectedPlayerCount}`,
    )
  }

  const boardUrl = `${viteBaseUrl.replace(/\/+$/, '')}/board.html#${encodeURIComponent(roomCode)}`
  const lobbyCountSelector = `[data-player-count="${expectedPlayerCount}"]`
  const startButtonSelector = 'button:has-text("Cleared Hot")'

  logger(`[board-view-launcher] launching chromium`)
  const browser: Browser = await chromiumLauncher()

  let context: BrowserContext | null = null
  let page: Page | null = null
  let closed = false

  const close = async (): Promise<void> => {
    if (closed) return
    closed = true
    if (page !== null) {
      try {
        await page.close()
      } catch {
        /* best-effort */
      }
    }
    if (context !== null) {
      try {
        await context.close()
      } catch {
        /* best-effort */
      }
    }
    try {
      await browser.close()
    } catch {
      /* best-effort */
    }
  }

  const started: Promise<void> = (async () => {
    context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
    page = await context.newPage()
    logger(`[board-view-launcher] navigating to ${boardUrl}`)
    await page.goto(boardUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })

    logger(
      `[board-view-launcher] waiting for ${expectedPlayerCount} operatives ` +
      `(${lobbyCountSelector}, timeout ${waitForStartTimeoutMs}ms)`,
    )
    await page
      .locator(lobbyCountSelector)
      .waitFor({ state: 'visible', timeout: waitForStartTimeoutMs })

    logger(`[board-view-launcher] waiting for "Cleared Hot" (timeout ${BUTTON_VISIBLE_TIMEOUT_MS}ms)`)
    await page
      .locator(startButtonSelector)
      .waitFor({ state: 'visible', timeout: BUTTON_VISIBLE_TIMEOUT_MS })

    logger(`[board-view-launcher] clicking "Cleared Hot"`)
    await page.locator(startButtonSelector).click({ timeout: 5_000 })
    logger(`[board-view-launcher] start clicked; idling until close()`)
  })()

  // Swallow the rejection on the handle's promise so an unawaited `started`
  // can't crash the orchestrator with an unhandled-rejection warning. The
  // caller can still `await handle.started` to learn the failure.
  started.catch((err: unknown) => {
    logger(`[board-view-launcher] start sequence failed: ${err instanceof Error ? err.message : String(err)}`)
  })

  return { started, close }
}
