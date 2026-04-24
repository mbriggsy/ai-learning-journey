/**
 * Shared types for the BURNED playtest harness.
 *
 * IMPORTANT: This module MUST NOT import from `src/server` (ESLint boundary,
 * insight 022). It also MUST NOT import from `src/shared/protocol.ts` —
 * per plan D11 the harness mirrors the public protocol surface locally so
 * `scripts/playtest/` has zero coupling to Workers-types-polluted modules
 * and can evolve independently of the wire protocol with explicit
 * contract-diff review.
 *
 * Sources of truth referenced by the mirrored shapes below:
 *   - Phase 2 D4 god-event envelope  → `GodEvent`
 *   - Phase 1 D5 info-gap row labels → `ROW_DISPLAY_LABELS`
 *   - Phase 3 D15 scrub mode         → `Config.scrubMode`
 *   - Phase 4 wrapper contract       → `ALLOWED_PAGE_METHODS`
 */

// -----------------------------------------------------------------------------
// Locally-mirrored protocol types (D11 — do NOT import from src/shared).
//
// These are structural mirrors of `src/shared/protocol.ts`'s PlayerView and
// BoardView. The harness never constructs these — it only consumes them as
// parsed JSON from the god WS. Fields we actively inspect get named shapes;
// fields we pass through opaquely use `unknown` to stay decoupled from wire-
// format evolution. Unit 10's parity test asserts field-name overlap with
// the real protocol to catch drift.
// -----------------------------------------------------------------------------

/** Mirror of `src/shared/protocol.ts#PlayerView`. Opaque beyond id + hand. */
export interface PlayerView {
  readonly myPlayerId: string
  readonly myHand: readonly { readonly id: string; readonly type: string }[]
  // All other PlayerView fields are carried opaquely — harness does not
  // destructure them, only relays to scenario-detector for path-based asserts.
  readonly [k: string]: unknown
}

/** Mirror of `src/shared/protocol.ts#BoardView`. Opaque discriminated union. */
export interface BoardView {
  readonly phase: 'playing' | 'game_over'
  readonly stateVersion: number
  readonly [k: string]: unknown
}

/**
 * Engine action envelope. Harness relays opaquely — scenarios match on paths
 * inside, but Unit 1 does not need to enumerate every action shape.
 */
export interface EngineAction {
  readonly type: string
  readonly playerId: string
  readonly [k: string]: unknown
}

/** Game event envelope (opaque, path-matched by scenarios). */
export interface GameEvent {
  readonly type: string
  readonly [k: string]: unknown
}

// -----------------------------------------------------------------------------
// God-event envelope (phase-2 D4, character-for-character).
//
// Field order / names below MUST match phase-2 D4. Unit 10 has a regression
// test asserting the key set equals the documented set.
// -----------------------------------------------------------------------------

export interface GodEvent {
  readonly type: 'god-event'
  readonly action: EngineAction
  readonly events: readonly GameEvent[]
  readonly stateVersion: number
  readonly nowMs: number
  /** Keyed by playerId. Every SEATED player (including eliminated-but-seated
   *  spectators and disconnected seats) per phase-2 D4 Unit 6a rule. */
  readonly projections: Record<string, PlayerView>
  readonly boardView: BoardView
  /**
   * OPTIONAL — present only on per-viewer split chunks (phase-2 D4
   * "Split-envelope metadata fields"). Required by Unit 4 reassembly when
   * splitting fires; absent / empty / redundantly equal to
   * `Object.keys(projections)` means "unsplit, consume in one shot."
   */
  readonly expectedViewerIds?: readonly string[]
}

// -----------------------------------------------------------------------------
// Seat handle — the handoff contract Phase 4 consumes.
// -----------------------------------------------------------------------------

/**
 * Opaque Playwright Page reference. Phase 4 wraps this behind `SeatPageWrapper`
 * before handing it to the subagent; Phase 3 just threads the object through.
 * Typed as `unknown` here to avoid pulling `@playwright/test` types into
 * every harness module — server-controller imports playwright directly; other
 * modules don't need its types.
 */
export type PlaywrightPage = unknown

export interface SeatHandle {
  readonly seatId: string
  readonly seatName: string
  readonly roomCode: string
  readonly page: PlaywrightPage
  readonly viewport: Viewport
  readonly logPath: string
  readonly suspicionPath: string
  readonly scenariosPath: string
}

// -----------------------------------------------------------------------------
// Viewport.
// -----------------------------------------------------------------------------

export interface Viewport {
  readonly width: 360 | 390 | 768
  readonly height: 640 | 844 | 1024
  readonly label: string
}

// -----------------------------------------------------------------------------
// Connection event — WS lifecycle log consumed by Unit 9's tier-3 matcher.
// -----------------------------------------------------------------------------

export interface ConnectionEvent {
  readonly seatId: string
  readonly transition: 'disconnect' | 'reconnect'
  readonly atStateVersion: number
  readonly atNowMs: number
  /**
   * `'natural'` — real connectivity event (player backgrounded tab, flaky
   * network, etc.). Unit 4 writes this by default.
   * `'orchestrator-driven'` — harness-initiated (viewport rotation,
   * teardown/rebuild between scripted + free-play segments). Unit 6 writes
   * this explicitly before tearing down a seat. Unit 9's tier-3 matcher
   * filters these out per C8 so scenarios targeting REAL connectivity
   * events aren't drowned by harness noise.
   */
  readonly reason: 'natural' | 'orchestrator-driven'
}

// -----------------------------------------------------------------------------
// Free-play accounting.
// -----------------------------------------------------------------------------

export interface FreePlayBudget {
  readonly totalMs: number
  readonly freePlayMs: number
  readonly scriptedMs: number
  readonly fraction: number
}

// -----------------------------------------------------------------------------
// Session config.
// -----------------------------------------------------------------------------

export interface Config {
  readonly seats: number
  readonly seatNames?: string[]
  readonly seed?: number
  readonly nopeWindowMs: number
  /**
   * Required per-config; no harness-side default. Caller sets
   * (e.g. Phase 6 series scales 60min + 10min/seat beyond 3; Phase 4 unit
   * tests use 3min). Orchestrator hard-stops the session when wallclock
   * since seat-join exceeds this.
   */
  readonly sessionTimeoutMs: number
  readonly roomCode?: string
  readonly catalogPath: string
  readonly outputRoot: string
  /** Default: 360×640, 390×844, 768×1024 (phase-3 R9). */
  readonly viewports: Viewport[]
  /** Default: 0.20. */
  readonly freePlayWallclockFraction: number
  /** Default: 10. */
  readonly sessionDirRetention: number
  /** Default: `'on'`; `--no-scrub` flips to `'off'` with a loud banner (D15). */
  readonly scrubMode: 'on' | 'off'
  /** Default: 5000ms. Reassembly partial-flush window for split god-events. */
  readonly godReassemblyTimeoutMs: number
  /** Passed through to `PLAYTEST_GOD_ORIGINS` in server env. */
  readonly godOriginAllowlist?: string[]
}

// -----------------------------------------------------------------------------
// Session result (the orchestrator's return value — consumed by
// retention + the finalized session.md writer).
// -----------------------------------------------------------------------------

export interface SessionResult {
  readonly sessionId: string
  readonly runDir: string
  readonly startedAt: string
  readonly endedAt: string
  readonly coverage: CoverageReport
  readonly freePlay: FreePlayBudget
  readonly viewportsExercised: readonly string[]
}

// -----------------------------------------------------------------------------
// Info-gap rows (phase-1 D5).
//
// Internal identifier (ViewerRole) is the TypeScript-safe key. The literal
// prose label (ROW_DISPLAY_LABELS value) is what renders in coverage.md.
// Unit 10's regression test asserts every entry equals phase-1 D5's literal
// prose character-for-character.
// -----------------------------------------------------------------------------

export type ViewerRole =
  | 'SERVER'
  | 'ACTOR'
  | 'TARGET'
  | 'OTHER_ALIVE'
  | 'SPECTATOR'
  | 'DISCONNECTED'
  | 'BOARD'

export const ROW_DISPLAY_LABELS = {
  SERVER:       'SERVER',
  ACTOR:        'ACTOR',
  TARGET:       'TARGET',
  OTHER_ALIVE:  'OTHER (alive)',
  SPECTATOR:    'SPECTATOR (eliminated, connected)',
  DISCONNECTED: 'DISCONNECTED (alive, not connected)',
  BOARD:        'BOARD',
} as const satisfies Record<ViewerRole, string>

// -----------------------------------------------------------------------------
// Coverage report (phase-3 B5 / D13.1 absolute ≥50 gate + no-zero-cell gate).
// -----------------------------------------------------------------------------

export interface CoverageReport {
  /** Absolute count of distinct catalog scenarios fired. PRD §8.2 gate. */
  readonly firedCount: number
  /** PRD §8.2 (revised 2026-04-23) — 50 distinct scenarios = pass. */
  readonly threshold: 50
  /** 7 rows × 2 columns = 14 cells. */
  readonly gridCells: Record<
    ViewerRole,
    { readonly column1: number; readonly column2: number; readonly scenarioIds: string[] }
  >
  /** Count of cells (out of 14) with zero fires. Secondary gate (B5). */
  readonly zeroCellCount: number
  /** `firedCount >= 50 && zeroCellCount === 0`. */
  readonly passed: boolean
  /** Scenario IDs fired under each viewport label (e.g. '390x844'). */
  readonly firedByViewport: Record<string, string[]>
  readonly freePlayAccounting: FreePlayBudget
  readonly divergences: ReadonlyArray<{
    readonly kind: 'self-without-detector' | 'detector-without-self' | 'column-1-vs-2'
    readonly scenarioId: string
    readonly notes: string
  }>
  /** Scenarios surfaced as "known product calls" — not counted against ≥50. */
  readonly knownProductCalls: string[]
}

// -----------------------------------------------------------------------------
// Page-method allowlist (phase-4 wrapper contract / D5).
//
// Named exports as const tuples so Phase 4's `SeatPageWrapper` derives a
// literal union for compile-time narrowing. Unit 7 self-test check 5 asserts
// both arrays exist and their intersection is empty.
// -----------------------------------------------------------------------------

export const ALLOWED_PAGE_METHODS = [
  'locator',
  'waitFor',
  'click',
  'fill',
  'type',
  'press',
  'getByRole',
  'getByText',
  'getByLabel',
  'getByTestId',
  'screenshot',
] as const
export type AllowedPageMethod = (typeof ALLOWED_PAGE_METHODS)[number]

export const DISALLOWED_PAGE_METHODS = [
  'goto',
  'evaluate',
  'addInitScript',
  'route',
  'setExtraHTTPHeaders',
  'setOfflineMode',
  'request',
  'context',
  'addLocatorHandler',
  'setViewportSize',
] as const
export type DisallowedPageMethod = (typeof DISALLOWED_PAGE_METHODS)[number]

// -----------------------------------------------------------------------------
// God-subscriber WS close codes (insight 023 / phase-2 HTTP-level rejection).
//
// These constants are the authoritative mapping consumed by Unit 4's god
// subscriber and Unit 7's self-test. Insight 023 confirms partyserver's
// onConnect close does NOT propagate under hibernation — the server performs
// the rejection pre-upgrade at HTTP level and the browser surfaces the close
// code below. `4001` is NOT a god-auth code (reserved for room-full).
// -----------------------------------------------------------------------------

export const GOD_CLOSE_CODE = {
  /** Origin not in allowlist (pre-upgrade HTTP 403). */
  ORIGIN_DENIED: 4003,
  /** Playtest mode off OR token mismatch (pre-upgrade HTTP 401). */
  AUTH_FAILED: 4004,
  /** Rate-limit: 3+ rapid token-mismatch attempts (pre-upgrade HTTP 429). */
  RATE_LIMITED: 4005,
} as const
export type GodCloseCode = (typeof GOD_CLOSE_CODE)[keyof typeof GOD_CLOSE_CODE]
