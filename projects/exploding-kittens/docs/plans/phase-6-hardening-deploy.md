---
title: "Phase 6: Hardening & Deploy"
type: feat
phase: 6
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened: 2026-04-05T11:30PM EDT
executed: 2026-04-05T10:27PM EDT
reviewed: 2026-04-06T12:22AM EDT
---

# Phase 6: Hardening & Deploy

**Goal:** Bulletproof game night experience. No crashes, no weirdness, deploys cleanly.

## Enhancement Summary

**Deepened on:** 2026-04-05
**Research agents used:** 16 (Architecture Strategist, Security Sentinel, Performance Oracle, Frontend Races Reviewer, Kieran TypeScript Reviewer, Code Simplicity Reviewer, Deployment Verification Agent, Spec Flow Analyzer, Pattern Recognition Specialist, WebSocket Reconnection Researcher, Mobile Browser Hardening Researcher, Playwright E2E Researcher, PartyKit Deployment Researcher, Canvas GPU Memory Researcher, Room Security Researcher, UMB Deployment Study)
**Context7 docs queried:** Playwright (multi-context, fixtures, network), PartyKit (deploy, hibernation, config)

### Key Improvements
1. **75% of original plan was duplication** — SESSION_REPLACED, memo components, selector hooks, canvas cleanup, inactivity, Nope rejection all already specified in Phases 1-5. Struck completely. Phase 6 now contains ONLY new work + verification.
2. **3 contradictions fixed** — `nopeWindow.active` field doesn't exist (nullable), Favor/Future can't be Noped once in pending SubPhase, "Favor-cancelled-by-Nope" E2E scenario was invalid.
3. **`100dvh` corrected to `100svh`** — `dvh` causes layout jank as iOS address bar animates. `svh` gives stable minimum height.
4. **`user-scalable=no` removed** — iOS ignores it since iOS 10, WCAG AA violation, does nothing useful.
5. **Cloudflare Pages decided** (not "Vercel or") — same network as PartyKit, unlimited free bandwidth, instant rollback, zero CORS.
6. **4 P0 race conditions discovered** — reconnection state-send not enqueued in serial queue, partysocket buffer replays ghost actions, Nope grace window has no mechanism, iOS Safari dual reconnection path creates SESSION_REPLACED loop.
7. **React error boundaries completely absent from all phases** — critical hardening gap. Phone crashes = white screen, but module-level WS singleton survives, so recovery = remount + resubscribe.
8. **State schema versioning missing** — deploying new code to hibernated DOs with old-format state = silent corruption. Need `schemaVersion` + migration in `onStart()`.
9. **E2E expanded from 6 to 20 scenarios** (Tier 1: 10 ship-blockers, Tier 2: 10 quality) with infrastructure: `TEST_TIMEOUT_SCALE`, `devSeed`, WebSocket frame interception, Playwright fixtures + POMs.
10. **Complete deployment pipeline** — GitHub Actions (verify -> deploy-server -> deploy-client), 4 secrets, CF Pages `_headers` file, `partykit.json`, `vite-env.d.ts`, rollback strategy.

### New Considerations Discovered
- Prompt timeout timers (favor-pending, defuse-pending, etc.) NOT restored after server hibernation — Phase 3 gap, game can freeze permanently
- partysocket has no built-in application-level ping/pong — need custom 30s/10s heartbeat
- iOS Safari 26 + iCloud Private Relay breaks WebSocket upgrades (sends HTTP CONNECT instead of GET) — no server-side fix, need help screen
- Durable Object 128KB per-key storage limit — must verify 10-player state fits
- `ctx.reset()` available in all browsers since Dec 2023 — stronger canvas cleanup than clearRect
- ImageBitmap.close() required for GPU memory release — Phase 5 gap
- CF Pages defaults to `max-age=0` for all assets — need explicit `_headers` file for immutable hashed assets
- 5-different special combo is unspecified in the engine (no handler, no SubPhase) — scope cut decision needed
- Draw from Bottom card/action interaction is ambiguous — clarification needed

### Blocking Questions (defaults assumed, verify before execution)

**Q1: Is the 5-different special combo in scope?**
**RESOLVED: NO, cut.** The official Party Pack rulebook (docs/user/ekpp-instructions-english.pdf) does NOT include the 5-different combo. It only lists Two of a Kind and Three of a Kind. The 5-different combo is from the original base game only. The Party Pack replaced it with the any-card combo expansion (any matching pair/triple works, not just cats). See cross-plan note #15.

**Q2: Does playing "Draw from Bottom" card auto-trigger a bottom draw after Nope window?**
**RESOLVED: Auto-trigger with TV announcement.** Per official rules, the card text is "End your turn by drawing the bottom card from the Draw Pile" — playing the card IS the draw, there is no separate step. After Nope window resolves, server auto-draws from bottom. TV announces "DREW FROM THE BOTTOM" with Phase 5 theatrical treatment for the visual cue. `draw-from-bottom` is a server-only action dispatched by the card effect handler. See cross-plan note #16.

---

## Part A: New Code

### Task 1: Mobile Browser Hardening

#### `src/client/shared/hooks/useWakeLock.ts`

```typescript
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [isActive, setIsActive] = useState(false)

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setIsActive(true)
      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false)
        wakeLockRef.current = null
      })
    } catch { /* low battery or user preference -- silent fail */ }
  }, [])

  useEffect(() => {
    request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      wakeLockRef.current?.release()
    }
  }, [request])

  return isActive
}
```

**Research Insight:** Wake Lock API supported since Safari 16.4, Chrome 84, Firefox 126. Browser auto-releases on tab background. `visibilitychange` re-acquisition is mandatory. (Mobile Research)

#### `player.html` Meta Viewport Update

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
```

**Removed:** `user-scalable=no` (iOS ignores since iOS 10, WCAG violation).
**Added:** `viewport-fit=cover` (notched phones), `interactive-widget=resizes-content` (Chromium keyboard behavior).

#### Game-Mode CSS (`src/client/player/player-hardening.css`)

```css
html, body {
  height: 100svh;
  height: 100vh; /* fallback */
  overflow: hidden;
  overscroll-behavior: none; /* kills rubber banding, pull-to-refresh, swipe nav */
  touch-action: manipulation; /* kills 300ms tap delay */
}

#controller-root {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

#controller-root img {
  -webkit-user-drag: none;
  pointer-events: none;
}

input[type="text"] {
  -webkit-user-select: text;
  user-select: text;
}
```

**Research Insights:**
- **`100svh` not `100dvh`**: `dvh` causes layout jank as address bar animates. `svh` = stable minimum viewport, content never clips. (Mobile Research -- CRITICAL CORRECTION)
- **`overscroll-behavior: none`**: One property kills rubber banding (iOS), pull-to-refresh (both), swipe-back navigation (Android). (Mobile Research)
- **Safe-area insets**: Required for iPhone X+ notch/Dynamic Island. (Mobile Research)

#### Landscape Detection

```typescript
function useOrientationWarning() {
  const [isLandscape, setIsLandscape] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)')
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches)
    setIsLandscape(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isLandscape
}
```

Show "Rotate your phone" overlay when landscape. `screen.orientation.lock()` does NOT work on iOS Safari. (Mobile Research)

#### Suppress PWA Install Banner

```typescript
window.addEventListener('beforeinstallprompt', (e) => e.preventDefault())
```

---

### Task 2: Production Security

#### Origin Validation (`src/server/room.ts` -- `onBeforeConnect`)

```typescript
static async onBeforeConnect(req: Party.Request) {
  const origin = req.headers.get('Origin')
  const allowedOrigins = [
    'https://exploding-kittens.pages.dev',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : []),
  ]
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 })
  }
}
```

**Research Insight:** WebSocket bypasses CORS but ANY website can open a WebSocket to the PartyKit server. Origin validation in `onBeforeConnect` prevents cross-origin room sniping. (Security -- C2, Deployment Research)

#### Room Code Generation

6-character code from 31-character alphabet (uppercase + digits minus ambiguous `0, O, 1, I, L`).

```typescript
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 31 chars, ~887M combos
const OFFENSIVE_PATTERNS = /FUCK|SHIT|DAMN|HELL|COCK|CUNT|DICK|TWAT|NAZI/

function generateRoomCode(activeRooms: Set<string>): string {
  let code: string
  let attempts = 0
  do {
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    code = Array.from(bytes, b => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('')
    if (++attempts > 100) throw new Error('Room code generation exhausted')
  } while (activeRooms.has(code) || OFFENSIVE_PATTERNS.test(code))
  return code
}
```

**Research Insights:**
- Jackbox uses 4-letter codes (~457K combos). 6 chars with 31-char set gives ~887M -- brute-force proof with rate limiting. (Room Security Research)
- CSPRNG via `crypto.getRandomValues`, not `Math.random()`. (Security -- H1)
- Offensive word filter prevents embarrassing room codes on the TV screen. (Room Security Research)

#### Join-Attempt Rate Limiter (separate from message rate limit)

In `onBeforeConnect`: 5 join attempts per IP per minute. 5-minute lockout after exceeded. Uses `CF-Connecting-IP` header.

**Research Insight:** The 10msg/s message rate limit (Phase 3) does not protect against room code scanning, which operates at the connection level. Separate rate limiting in `onBeforeConnect` blocks enumeration. Wrong code and non-existent room MUST return the same error message and timing to prevent enumeration. (Room Security -- M2, Security -- H3)

#### Max Connections Per Room

Reject when `this.getConnections().length >= 12` (10 players + 1 host + 1 reconnection buffer). Return `ROOM_FULL` error code. (Security -- H4)

#### Reject New Joins After Game Starts

In `handleJoin`: if `gameState.phase !== 'lobby'` AND connection has no valid session token, reject with `GAME_IN_PROGRESS` error. (Security -- H5)

#### Per-Connection Idle Timeout

If a connection sends no messages (including pong) for 2 minutes, disconnect. The client's partysocket auto-reconnect re-establishes if the player returns. Prevents silent connection slot consumption. (Security -- H7)

#### Security Headers (`public/_headers` -- copied to `dist/` by Vite build)

```
# HTML entry points: always revalidate
/board.html
  Cache-Control: public, max-age=0, must-revalidate
/player.html
  Cache-Control: public, max-age=0, must-revalidate

# Content-hashed assets: cache forever
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Security headers on everything
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://*.partykit.dev; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'
```

**Research Insights:**
- **Referrer-Policy `no-referrer`**: Join URL contains `?room=ABCD`. Without this, room code leaks to external resources via Referer header. (Security -- C1)
- **CSP `connect-src wss://*.partykit.dev`**: Allow WebSocket to PartyKit only. `data:` in `img-src` for QR code SVG rendering. (Security -- C1)
- **CF Pages defaults to `max-age=0` for everything** -- need explicit `_headers` for immutable hashed assets. (PartyKit Deploy Research)

#### Name Validation Regex

Replace Phase 3's vague "alphanumeric + spaces + basic punctuation" with explicit: `/^[a-zA-Z0-9 .!?_-]{1,12}$/`. No angle brackets, no quotes, no ampersands. (Security -- M3)

#### ESLint Rule

Add `react/no-danger` to ESLint config (bans React's unsafe HTML injection escape hatch). Zero cost, defense-in-depth against XSS. (Security -- H6, L2)

---

### Task 3: Client Resilience

#### React Error Boundaries

**Phone:** Wrap each screen in an error boundary. On crash:
1. Show "Something went wrong" with "Rejoin" button
2. Do NOT kill the WebSocket (module-level singleton in `connection.ts` survives React crashes)
3. On "Rejoin", remount component tree, which re-subscribes to gameStore (which has been receiving updates)
4. Log error stack to console

**TV Board:** Error boundary with auto-recovery -- remount after 1 second (no user to tap "Rejoin"). Separate boundary around AnimationSequencer (canvas errors should not crash the game view).

**Research Insight:** Zero mention of error boundaries across ALL six phases. A hardening phase without crash protection is incomplete. The module-level WS singleton surviving React crashes makes recovery trivial -- just remount. (Performance -- #5, Pattern Recognition -- 3a)

#### Stale Client Detection (Protocol Version Handshake)

Server includes `protocolVersion` in the `joined` message. Client compares to its compiled-in version. If mismatch, show "Game updated -- please refresh" banner.

```typescript
// src/shared/protocol.ts
export const PROTOCOL_VERSION = 1

// Server sends in joined message:
{ type: 'joined', payload: { playerId, sessionToken, protocolVersion: PROTOCOL_VERSION } }

// Client checks on connect:
if (msg.payload.protocolVersion !== PROTOCOL_VERSION) {
  showRefreshBanner()
}
```

**Research Insight:** After deployment, cached client JS may speak an old protocol. Without version detection, users see weird behavior with no explanation. (Deployment Verification -- #2, Architecture -- Missing)

#### WebSocket Failure Fallback

After N reconnection failures (partysocket exhausts retries or 30 seconds with no successful connect), show a helpful error: "Unable to connect. Your network may be blocking WebSocket connections. Try a different WiFi network."

**iOS Safari 26 Help:** If the connection fails specifically on iOS, add: "If you are using iCloud Private Relay, try disabling it in Settings > Apple Account > iCloud > Private Relay." (Reconnection Research -- iOS Safari #4)

#### Browser Compatibility Baseline

Document minimum: **Safari 16.4+, Chrome 111+, Firefox 126+**. Based on:
- `<dialog>` element: Safari 15.4+
- `color-mix()`: Safari 16.4+
- `svh` units: Safari 15.4+
- Wake Lock API: Firefox 126+
- `ctx.reset()`: all browsers Dec 2023+

---

### Task 4: Reconnection Wiring

These are the mechanisms that make Phase 3's reconnection INFRASTRUCTURE actually work under stress. Phase 3 built the pipes; Phase 6 wires them together.

#### Enqueue Reconnection State-Send in Serial Queue

```typescript
// In room.ts onConnect for reconnecting players:
onConnect(conn: Connection, ctx: ConnectionContext) {
  // ... validate session token ...
  this.enqueue(() => {
    this.sendPlayerState(conn, playerId)
  })
}
```

**Research Insight (P0):** Without this, `onConnect` reads `this.gameState` directly -- which may be mid-dispatch. Client receives stale state, then immediately gets the real state. The Nope button appears and vanishes in 50ms. 12 characters of code fix this. (Frontend Races -- P0-1)

#### partysocket Buffer Handling on Reconnect

On reconnection, mark store as `isReconnecting = true`. Suppress error toasts and optimistic rollback until first fresh `state-update` arrives.

```typescript
// In gameStore.handleMessage:
if (this.isReconnecting && (msg.type === 'error' || msg.type === 'action-rejected')) {
  return  // Swallow stale rejections from buffered messages
}
if (msg.type === 'state-update' || msg.type === 'player-update') {
  this.isReconnecting = false
  this.optimisticOverlays.clear()
  // ... normal handling
}
```

**Research Insight (P0):** partysocket buffers outgoing messages while disconnected and replays them on reconnect. If a player tapped "Play Card" as WiFi dropped, the stale message gets replayed, rejected, and triggers a confusing error toast. (Frontend Races -- P0-2)

#### Nope Grace Window Implementation

Phase 3 mentions "200-300ms grace" but specifies no mechanism. The engine must implement grace explicitly:

```typescript
// In nope-window-expired handler (engine.ts):
// Do not destroy the window. Set it to grace state.
return ok({
  ...state,
  nopeWindow: { ...state.nopeWindow, graceDeadlineMs: ctx.now + NOPE_GRACE_MS, expired: true }
})

// In nope handler (engine.ts):
if (!window) return reject('NO_NOPE_WINDOW')
if (window.expired && ctx.now > window.graceDeadlineMs) return reject('NOPE_GRACE_EXPIRED')
// Otherwise: accept, reset window for new chain round

// In room.ts: schedule grace cleanup after dispatching nope-window-expired
setTimeout(() => {
  this.enqueue(() => this.dispatchServerAction({
    type: 'nope-grace-expired', windowGeneration: gen
  }))
}, NOPE_GRACE_MS)
```

**Research Insight (P0):** Without this, a player who taps Nope 150ms before server-side expiry has their Nope enqueued BEHIND the expiry action. The queue processes expiry first, closes the window, then rejects the legitimate Nope. The card is wasted. (Frontend Races -- P0-3)

#### iOS Safari Reconnection -- Reset Backoff, Not New Connection

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && socket) {
    socket.reconnect() // Resets partysocket backoff, tries immediately
  }
})
```

**Research Insight (P0):** iOS Safari kills WebSocket after ~30s background. partysocket backoff grows to 16s, 32s... User foregrounds the tab. If the visibility handler creates a NEW connection instead of resetting the existing socket backoff, two reconnections race and create a SESSION_REPLACED loop. (Frontend Races -- P0-4)

#### Application-Level Heartbeat (30s ping / 10s pong)

partysocket has no built-in application-level ping/pong. Implement at the protocol level:

```typescript
// Server: ping every 30s per connection
// Any game message from client also counts as heartbeat (resets pong timeout)
// No pong within 10s -> connection.close(1001, 'Heartbeat timeout')

// Client: respond to ping immediately
if (msg.type === 'ping') { socket.send(JSON.stringify({ type: 'pong' })); return }
```

**Research Insight:** 30s is the industry consensus for mobile WebSocket heartbeats. Must be shorter than Cloudflare idle timeout (~100s). (Reconnection Research -- #8)

#### Server-Side Disconnect Debounce (3 seconds)

Do not broadcast "player disconnected" to the TV immediately. Wait 3 seconds. If the player reconnects within 3s (WiFi blip), nobody sees the disconnect.

```typescript
// In onClose: set 3s timer. If reconnect arrives, clear timer.
// In onConnect (reconnection): clear any pending disconnect timer.
```

Also track reconnection frequency: 3+ reconnects in 60s, show persistent "unstable connection" icon on TV next to player name. (Reconnection Research -- #5, #6)

#### AnimationSequencer Reset on Reconnect

When `isReconnecting` is set, call `sequencer.reset()`:
1. Cancel all in-progress animations (`controls.stop()`)
2. Clear the animation queue entirely
3. Set `skipNextAnimation = true` for the next state update

Phase 5's `skipNextAnimation` flag prevents NEW animations, but does not clear the EXISTING queue. A reconnect during a Nope shake targets DOM nodes that no longer exist. (Frontend Races -- P1-7)

#### NopeWindowView: Add `startedAtMs` to Projection

Phase 4's CSS countdown bar uses force-reflow for chain resets, but reconnection needs a starting `scaleX` ratio. Without `startedAtMs`, the bar flashes to full width before animating down.

```typescript
// In projection: include total window duration
nopeWindow: { deadlineMs, generation, startedAtMs }

// In NopeCountdownBar on mount:
const total = deadlineMs - startedAtMs
const remaining = deadlineMs - Date.now()
bar.style.transform = `scaleX(${Math.max(0, remaining / total)})`
void bar.offsetWidth // force reflow
bar.style.transition = `transform ${remaining / 1000}s linear`
bar.style.transform = 'scaleX(0)'
```

(Frontend Races -- P1-5)

---

### Task 5: Performance Gates

#### Bundle Size CI Gate

Postbuild script that reads Vite build output and asserts gzip sizes. Fail CI if phone entry exceeds 100KB or TV entry exceeds 150KB gzipped. 10 lines of Node script in `scripts/check-bundle-size.ts`.

```typescript
// After vite build, read dist/assets/*.js, gzip each, compare to budget
const BUDGETS = { 'player': 100_000, 'board': 150_000 } // bytes gzipped
```

(Performance -- #2)

#### Font Loading Strategy

```css
@font-face {
  font-family: 'Clash Display';
  font-display: swap; /* show fallback immediately, swap when loaded */
  /* ... */
}
```

Preload primary weight of Clash Display in both HTML files:
```html
<link rel="preload" href="/assets/fonts/ClashDisplay-Semibold.woff2" as="font" type="font/woff2" crossorigin>
```

JetBrains Mono (numbers only) does NOT need preloading -- appears after game start. Consider subsetting fonts to Latin characters only (60-80% file size reduction). (Performance -- #6)

#### Preconnect Hints

```html
<!-- In both board.html and player.html -->
<link rel="preconnect" href="https://exploding-kittens.mbriggsy.partykit.dev">
```

Saves 100-300ms on WebSocket connection establishment on phones over cellular. (Performance -- #9)

---

## Part B: Verification

### Task 6: E2E Test Infrastructure

#### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  workers: 2,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] }, timeout: 120_000 },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] }, timeout: 120_000 },
  ],
  webServer: [
    { command: 'npx partykit dev', port: 1999, reuseExistingServer: true, timeout: 15_000 },
    { command: 'pnpm run dev', port: 5173, reuseExistingServer: true, timeout: 15_000 },
  ],
})
```

**Research Insight:** UMB's proven config uses dual `webServer` (PartyKit + Vite). WebKit timeout doubled due to slower WebSocket under parallel load. 2 workers safe on GitHub Actions (5 contexts ~250MB, within 7GB RAM). (Playwright Research, UMB Study)

#### Custom Fixtures (`tests/e2e/fixtures.ts`)

```typescript
type GameFixtures = {
  board: Page           // TV view, 1920x1080
  phones: Page[]        // 3-4 phone views
  roomCode: string      // auto-generated room code
}

export const test = base.extend<GameFixtures>({
  board: async ({ browser }, use) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await ctx.newPage()
    await use(page)
    await ctx.close()
  },
  phones: async ({ browser }, use) => {
    const pages: Page[] = []
    for (let i = 0; i < 3; i++) {
      const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true })
      pages.push(await ctx.newPage())
    }
    await use(pages)
    // cleanup: close all contexts
  },
  // ... roomCode from board page after connection
})
```

#### `waitForGameState` Utility

```typescript
// Expose store in test mode (src/client/shared/gameStore.ts):
if (import.meta.env.MODE === 'test') {
  (window as any).__gameStoreSnapshot = () => JSON.parse(JSON.stringify(gameStore.getSnapshot()))
}

// Test helper (tests/e2e/helpers.ts):
async function waitForPhase(page: Page, phase: string, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const snap = (window as any).__gameStoreSnapshot?.()
      return snap && snap.phase === expected
    },
    phase,
    { timeout }
  )
}

async function waitForPlayerCount(page: Page, count: number, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const snap = (window as any).__gameStoreSnapshot?.()
      return snap && snap.players?.length === expected
    },
    count,
    { timeout }
  )
}
```

Zero production cost -- only exposed in test mode. (Playwright Research -- #4)

#### TEST_TIMEOUT_SCALE

Environment variable on the server. `const PROMPT_TIMEOUT = 60_000 * (Number(room.env.TEST_TIMEOUT_SCALE) || 1)`. In E2E: set to `0.01` so 60s timeouts become 600ms. Guarded behind `!this.isProduction`. (Spec Flow -- Q2)

#### devSeed for Deterministic Deck Order

Room accepts `seed` query param in dev mode. Server uses seeded PRNG (mulberry32) instead of CSPRNG for shuffle. Enables deterministic EK draws and combo setups in E2E tests. (Spec Flow -- Q3, Playwright Research -- #9)

#### Disable Animations in E2E

Phase 5's `MotionConfig` with `transition={{ duration: 0 }}` MUST be active during E2E tests. Without this, every assertion needs to account for animation duration. (Playwright Research, Frontend Races -- P1-8)

---

### Task 7: E2E Test Suite

#### Tier 1 -- Ship Blockers (must pass before deploy)

| # | Scenario | Validates |
|---|----------|-----------|
| 1 | Full lifecycle: 4 phones join, play, EK drawn, Defuse, more play, elimination, winner, new game in same room | Lobby, playing, game_over, lobby return, state reset |
| 2 | Every card type exercised (seeded deck) | Skip, Attack, Targeted Attack, See the Future, Alter the Future, Shuffle, Draw from Bottom, Favor, Defuse, Nope, 2-of-a-kind combo |
| 3 | Reconnection per SubPhase: disconnect+reconnect during (a) turn-active, (b) nope-window, (c) defuse-pending, (d) favor-pending | UI state correct, remainingMs accurate |
| 4 | SESSION_REPLACED: two tabs for same player, old tab stops reconnecting | Multi-tab protection |
| 5 | Nope window expiry: play Nopeable card, nobody Nopes, action resolves | Timer lifecycle |
| 6 | Prompt timeout: Favor target does not respond, auto-resolve | 60s timeout (via TEST_TIMEOUT_SCALE) |
| 7 | Security: no private data in board WebSocket frames | Intercept all frames, assert no drawPile card IDs, no hand contents, no deckSeed |
| 8 | Stale stateVersion rejected with error feedback | Server-side validation |
| 9 | Concurrent Nope: two players Nope in same 50ms window, both enter chain | Serial queue ordering |
| 10 | Error paths: invalid room code, duplicate name, play out of turn, eliminated player action | Clear error feedback, no crashes |

#### Tier 2 -- Quality (pass before game night)

| # | Scenario | Validates |
|---|----------|-----------|
| 11 | Attack stacking: A attacks B (2 turns), B attacks C (4 turns), C skips (3 remaining) | Turn count correctness |
| 12 | 2-player minimum game | Fast endgame, 1 EK |
| 13 | Host (board) disconnect/reconnect mid-game | Phones keep playing, board restores |
| 14 | All-disconnect: everyone drops, room hibernates, all reconnect | State persisted through hibernation |
| 15 | Eliminated player: spectator view, no interactive elements, cannot send actions | Dead player UX |
| 16 | Alter the Future: play, rearrange, confirm, private to player | Interactive prompt + privacy |
| 17 | Late joiner rejected after game starts | Phase gate |
| 18 | Nope grace window: Nope sent 100-200ms after server-side expiry, accepted | Grace mechanism |
| 19 | Reconnect during game_over: player sees results | State restore at game boundaries |
| 20 | Rapid disconnect/reconnect (5 cycles in 10s): game state consistent | WiFi flapping resilience |

**Research Insight:** Phase 2's `DispatchContext` with injected timestamps enables deterministic timing tests. Phase 6's Nope timing tests need either injected timestamps or tolerance ranges. (Spec Flow, Playwright Research)

---

### Task 8: Memory and Performance Regression

#### 3-Game Memory Regression Test

E2E test: run 3 consecutive full game loops (start, play, game_over, lobby, start again). After each game, take JS heap snapshot via CDP `HeapProfiler`. Assert heap does not grow more than 15% between games. Chromium-only, but sufficient for CI. (Performance -- #3, Canvas GPU Research -- #12)

#### Bundle Size Assertion

Run `scripts/check-bundle-size.ts` as part of CI. Fail if phone > 100KB or TV > 150KB gzipped. (Performance -- #2)

#### Canvas Cleanup Verification

After the 3-game loop, verify no retained `HTMLCanvasElement`, `ImageBitmap`, or `CanvasRenderingContext2D` objects in heap. The 5-step cleanup sequence (cancel rAF, close ImageBitmaps, ctx.reset(), width=0, null refs) must leave zero canvas artifacts. (Canvas GPU Research)

---

## Part C: Deployment

### Task 9: Cloudflare Pages Configuration

**Decision: Cloudflare Pages** (not "Vercel or"). PartyKit IS Cloudflare. Same network, same ecosystem, zero cross-origin friction. Unlimited free bandwidth. Instant rollback via dashboard.

#### `public/_redirects`

```
/ /board.html
```

Board is the default view (TV opens the root URL).

**Research Insight:** UMB uses the same pattern (`/ -> /host`). CF Pages supports `_redirects` file in the output directory. (UMB Study, PartyKit Deploy Research)

---

### Task 10: PartyKit Configuration

#### `partykit.json`

```json
{
  "$schema": "https://www.partykit.io/schema.json",
  "name": "exploding-kittens",
  "main": "src/server/room.ts",
  "port": 1999,
  "compatibilityDate": "2026-01-01",
  "minify": true
}
```

(PartyKit Deploy Research, UMB Study)

---

### Task 11: Environment Variables

#### `src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_PARTYKIT_HOST: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

#### `.env.development`
```
VITE_PARTYKIT_HOST=localhost:1999
```

#### `.env.production`
```
VITE_PARTYKIT_HOST=exploding-kittens.mbriggsy.partykit.dev
```

#### `.env.example` (committed)
```
VITE_PARTYKIT_HOST=localhost:1999
```

**Research Insight:** Vite loads `.env.[mode]` automatically. Shell environment (CI `env:` block) takes highest priority. TypeScript IntelliSense via `vite-env.d.ts` catches untyped `import.meta.env` access. (PartyKit Deploy Research -- Q5, TS Reviewer -- H3)

---

### Task 12: GitHub Actions CI/CD

```yaml
# .github/workflows/deploy-ek.yml
name: Deploy Exploding Kittens

on:
  push:
    branches: [main]
    paths: ['projects/exploding-kittens/**']

jobs:
  verify:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: projects/exploding-kittens
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: node scripts/check-bundle-size.ts

  deploy-server:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      # ... checkout, pnpm, node setup ...
      - run: npx partykit deploy
        env:
          PARTYKIT_TOKEN: ${{ secrets.PARTYKIT_TOKEN }}
          PARTYKIT_LOGIN: ${{ secrets.PARTYKIT_LOGIN }}

  deploy-client:
    needs: deploy-server   # SERVER FIRST -- always
    runs-on: ubuntu-latest
    steps:
      # ... checkout, pnpm, node setup, build ...
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=exploding-kittens
```

**4 Required GitHub Secrets:**

| Secret | Source |
|--------|--------|
| `PARTYKIT_TOKEN` | `npx partykit token generate` |
| `PARTYKIT_LOGIN` | same command (outputs both) |
| `CLOUDFLARE_API_TOKEN` | CF dashboard > API Tokens > "Edit Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | CF dashboard > Overview sidebar |

**Research Insights:**
- **Server MUST deploy before client.** New client + old server = Zod rejects every message. `needs: deploy-server` enforces ordering. (Deployment Verification -- #3, Architecture -- Missing)
- **Path filter** `paths: ['projects/exploding-kittens/**']` prevents deploys on unrelated changes in the monorepo. (PartyKit Deploy Research)
- **Cost: $0.** Free tier handles 100K requests/day. A party game will not approach this. (PartyKit Deploy Research -- Q10)

---

### Task 13: State Schema Versioning

Add `schemaVersion` to persisted state. Migration function in `onStart()`.

```typescript
const CURRENT_SCHEMA_VERSION = 1

async onStart() {
  const stored = await this.ctx.storage.get('gameState')
  if (stored) {
    const state = stored as PersistedState
    if (state.schemaVersion < CURRENT_SCHEMA_VERSION) {
      this.gameState = migrateState(state)
      await this.persistState()
    } else {
      this.gameState = state
    }
  }
  // ... also restore playerSessions, Nope timer, prompt timers
}
```

**Research Insight:** Active Durable Objects keep running old code until hibernation. When they hibernate and wake with new code, `onStart()` loads old-format state. Without schema versioning, this is silent data corruption. The single most dangerous deployment gap. (Deployment Verification -- #1)

---

### Task 14: Monitoring and Observability

#### `npx partykit tail`

Live server log streaming. The primary production debugging tool. Streams `console.log/error/warn` from all active DOs. (PartyKit Deploy Research -- Q9)

#### Structured Server Logging

Log dispatch failures, validation rejections, unexpected disconnects, and alarm handlers with structured format:

```typescript
console.error(JSON.stringify({
  event: 'dispatch_error',
  room: this.room.id,
  playerId,
  action: action.type,
  error: result.error,
  timestamp: Date.now(),
}))
```

(Architecture -- Missing, Pattern Recognition -- 3b)

#### Client Error Reporting

```typescript
window.addEventListener('error', (e) => console.error('Uncaught:', e.error))
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled:', e.reason))
```

For a party game, `console.error` + `partykit tail` + CF analytics is sufficient. Sentry is overkill. (PartyKit Deploy Research -- Q9)

---

### Task 15: Rollback Strategy

| Target | Rollback Method | Speed |
|--------|----------------|-------|
| CF Pages client | Dashboard > select previous deployment | Instant |
| PartyKit server | `git checkout {sha}` + `npx partykit deploy` | ~30s |
| Active DOs | Cannot force-restart; wait for hibernation | Minutes to 15 min |

CF Pages keeps deployment history indefinitely. (PartyKit Deploy Research -- Q11)

---

## Key Files

| File | Location | Responsibility |
|------|----------|---------------|
| `useWakeLock.ts` | `src/client/shared/hooks/` | Wake Lock with visibilitychange re-acquisition |
| `player-hardening.css` | `src/client/player/` | Game-mode CSS (svh, overscroll, touch, safe-area) |
| `_headers` | `public/` | CF Pages security headers + caching |
| `_redirects` | `public/` | CF Pages URL routing |
| `partykit.json` | root | PartyKit server configuration |
| `vite-env.d.ts` | `src/` | TypeScript env var types |
| `.env.*` | root | Environment-specific PartyKit host URLs |
| `check-bundle-size.ts` | `scripts/` | Postbuild bundle budget enforcement |
| `playwright.config.ts` | root | E2E multi-context test configuration |
| `fixtures.ts` | `tests/e2e/` | Board + phone context fixtures |
| `deploy-ek.yml` | `.github/workflows/` | CI/CD pipeline |

---

## Tests

### Unit Tests (new in Phase 6)
- Room code generation: correct length, alphabet, collision avoidance, offensive filter
- Join rate limiter: 5/min per IP, lockout, reset
- Origin validation: allowed origins pass, others rejected
- Max connections: 12th connection rejected
- Schema migration: old format to current format
- Protocol version comparison

### E2E Tests
- Tier 1 (10 tests) + Tier 2 (10 tests) as specified in Task 7
- Memory regression (Task 8)
- Bundle size gate (Task 8)

### Manual Testing
- Real phones: iOS Safari + Chrome Android
- Multiple games back-to-back
- WiFi toggle mid-game
- Screen lock/unlock cycle
- 10-player stress test

---

## Done When

Full game night -- multiple games, phones locking/unlocking, WiFi drops -- nothing breaks. Deploy is one push to main.

Specifically:
1. All Tier 1 E2E tests pass (10 scenarios)
2. Bundle size under budget (phone <100KB, TV <150KB gzipped)
3. Memory regression test passes (3-game loop, <15% heap growth)
4. Security headers verified via securityheaders.com scan
5. `pnpm typecheck` passes
6. Production deploy succeeds (server + client)
7. Production smoke: board loads QR, phone joins, game plays to completion

---

## Cross-Plan Notes

1. **Phase 3 room.ts `onStart()`**: MUST restore prompt timeout timers (favor-pending, defuse-pending, future-rearrange-pending, steal-target-pending, name-card-pending), not just Nope timer. Add deadline timestamps to all SubPhase state. Without this, server hibernation during a Favor prompt freezes the game permanently.
2. **Phase 3 room.ts**: Add max connections per room (12). Reject when `getConnections().length >= 12`.
3. **Phase 3 room.ts**: Explicit phase gate in `handleJoin` -- reject when `phase !== 'lobby'` AND no valid session token.
4. **Phase 3 room.ts**: Reconnection state-send MUST be enqueued in serial queue.
5. **Phase 3 room.ts**: Add `nope-grace-expired` to `ServerOnlyActionMap`. Add `graceDeadlineMs` and `expired` to `NopeWindow` type.
6. **Phase 3 protocol.ts**: Add `protocolVersion` to `joined` message payload.
7. **Phase 3 validation.ts**: Name validation regex `/^[a-zA-Z0-9 .!?_-]{1,12}$/` -- replace vague "basic punctuation."
8. **Phase 2 types.ts**: Add `startedAtMs` to `NopeWindow` (or to `NopeWindowView` projection) for reconnection countdown bar.
9. **Phase 2 engine.ts**: Implement Nope grace window mechanism (`graceDeadlineMs`, two-timer pattern).
10. **Phase 5**: Add `ImageBitmap.close()` to canvas cleanup. Add `contextlost`/`contextrestored` event handling.
11. **Phase 5**: Add `sequencer.reset()` method -- cancel all animations, clear queue, set `skipNextAnimation`.
12. **Phase 1 player.html**: Remove `user-scalable=no`. Add `viewport-fit=cover` and `interactive-widget=resizes-content`.
13. **Roadmap Mermaid**: Remove `favor_pending -> nope_window` and `future_pending -> nope_window` arrows (pending states are NOT Nopeable per official rules -- Phase 2 cross-plan note #1).
14. **Roadmap Scope Cuts**: Add "5-different special combo" -- NOT in the Party Pack rules (only Two of a Kind and Three of a Kind). The 5-different combo is original base game only. The Party Pack replaced it with the any-card combo expansion.
15. **Phase 2 engine.ts**: VERIFIED -- any-card combos already specified (line 280: "Any matching pair including non-cats: two Attacks, two Skips"). No fix needed. Feral Cat correctly limited to cat substitution only.
16. **Phase 2 engine.ts**: `draw-from-bottom` is a server-only action dispatched by the Draw from Bottom card effect after Nope resolves. The card text is "End your turn by drawing the bottom card" -- playing the card IS the end-of-turn draw. No client action needed.
17. **Phase 5**: Add "DREW FROM THE BOTTOM" TV announcement with theatrical treatment when `draw-from-bottom` event fires. Visual cue so the table knows the deck order was subverted. Map to Visual Flow Specifications table alongside other draw events.
18. **Phase 2 (AUDIT)**: VERIFIED -- dead player's cards go to `Player.deadCards` (line 132, 163), not discard pile. Conservation invariant includes them. No fix needed.
