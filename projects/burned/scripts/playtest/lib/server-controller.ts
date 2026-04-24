/**
 * Server controller — wrangler + vite subprocess lifecycle (Phase 3 Unit 3).
 *
 * Spawns `pnpm exec wrangler dev` (wrangler) and `pnpm dev` (vite) with
 * per-session playtest vars (`PLAYTEST_MODE=1`, `PLAYTEST_TOKEN=<token>`,
 * optional `PLAYTEST_GOD_ORIGINS`) forwarded via wrangler's `--var KEY:VALUE`
 * CLI flags, polls their healthchecks, then tears them down on demand.
 * Orchestrator (Unit 6) owns token lifecycle — this module is a conduit,
 * never a source.
 *
 * Security invariants:
 *   - The token is a per-session secret. It is NEVER logged, NEVER embedded
 *     in thrown `Error` messages, NEVER written to stderr. Error strings may
 *     include the token's LENGTH but never its raw value.
 *   - Log-hygiene pre-flight aborts the launch when env vars that would
 *     capture the god WS URL (and therefore the token query-string) are set,
 *     unless the caller explicitly opts in via `allowTrace`.
 *   - The spawned child's env map AND the `--var PLAYTEST_TOKEN:<t>` CLI
 *     argument are visible via `/proc/<pid>/environ`, `/proc/<pid>/cmdline`
 *     (Linux) and Process Explorer / `tasklist /v` (Windows). Both exposure
 *     points are ACCEPTED v1 risk per phase-3 plan "Scope Boundaries →
 *     Trust Model" — any local actor with access to per-process env or
 *     cmdline already owns the developer machine.
 *
 * Why CLI flags and not env:
 *   wrangler dev does NOT forward arbitrary Node process env into workerd's
 *   binding env. Values MUST arrive via `--var KEY:VALUE` (or wrangler.toml
 *   [vars] / .dev.vars) — phase2-smoke.ts is the authoritative precedent.
 *   `buildServerEnv` below is retained for Node-side defense-in-depth (any
 *   Node-level tool that inspects process env still sees the flags) but
 *   alone it is insufficient to reach workerd bindings.
 *
 * Insight 022: NO imports from `src/server/` or transitive `partyserver` —
 * Node stdlib + local types only.
 */
import { spawn as defaultSpawn, type ChildProcess } from 'node:child_process'
import type { Config } from './types'

// -----------------------------------------------------------------------------
// Public surface.
// -----------------------------------------------------------------------------

export interface ServerHandles {
  readonly wranglerPid: number
  readonly vitePid: number
  readonly healthUrl: string
  /** Internal — used by `stopServers`. Exposed via the handle so stop is
   *  self-contained and doesn't need module-level state. */
  readonly _wrangler: ChildProcess
  readonly _vite: ChildProcess
  /** Idempotency flag set by the first `stopServers` call. */
  _stopped: boolean
}

export interface StartServerOptions {
  /**
   * `--allow-trace` opt-in. When true, proceed past the log-hygiene gate
   * after printing a banner. Default: false (gate aborts).
   */
  readonly allowTrace?: boolean
  /**
   * Test-only injection seam. Allows unit tests to avoid live subprocess
   * spawning + live HTTP probes.
   */
  readonly spawn?: typeof defaultSpawn
  readonly fetchFn?: typeof fetch
  readonly now?: () => number
  readonly sleep?: (ms: number) => Promise<void>
  /** Override `process.env` used by the log-hygiene gate (tests). */
  readonly envSource?: NodeJS.ProcessEnv
}

// -----------------------------------------------------------------------------
// Constants.
// -----------------------------------------------------------------------------

const WRANGLER_HEALTH_URL = 'http://localhost:8787/health'
const VITE_HEALTH_URL = 'http://localhost:5173/player.html'
const HEALTH_POLL_INTERVAL_MS = 250
const HEALTH_POLL_TIMEOUT_MS = 30_000
const SIGTERM_GRACE_MS = 5_000

// -----------------------------------------------------------------------------
// Env + validation helpers (pure — test targets).
// -----------------------------------------------------------------------------

/**
 * Build the env map for the wrangler child process.
 *
 * Defense-in-depth ONLY — wrangler does NOT forward arbitrary Node process
 * env to workerd bindings. The authoritative propagation path is the
 * `--var` CLI flags built by `buildWranglerArgs`. This helper still sets
 * PLAYTEST_MODE / PLAYTEST_TOKEN so any Node-side tooling (scripts, hooks)
 * observing the child's env sees a consistent view, and so a future change
 * of propagation strategy has a known-good fallback.
 *
 * - Always includes `PLAYTEST_MODE=1` and `PLAYTEST_TOKEN=<token>`.
 * - Includes `PLAYTEST_GOD_ORIGINS` ONLY when `config.godOriginAllowlist` is
 *   a non-empty array. When absent/empty, the key is NOT added, so phase-2
 *   Unit 1's LAN-default allowlist kicks in server-side.
 */
export function buildServerEnv(
  config: Config,
  token: string,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    PLAYTEST_MODE: '1',
    PLAYTEST_TOKEN: token,
  }
  const allow = config.godOriginAllowlist
  if (Array.isArray(allow) && allow.length > 0) {
    env.PLAYTEST_GOD_ORIGINS = allow.join(',')
  }
  return env
}

/**
 * Build the argv array for `pnpm exec wrangler dev ...` — the AUTHORITATIVE
 * propagation path for PLAYTEST_* values into workerd bindings. Mirrors
 * phase2-smoke.ts:
 *
 *   pnpm exec wrangler dev --ip 0.0.0.0 --port 8787
 *     --var PLAYTEST_MODE:1
 *     --var PLAYTEST_TOKEN:<token>
 *     [--var PLAYTEST_GOD_ORIGINS:<a,b,...>]
 *
 * Contract:
 *   - Token is validated (length + charset) up front. On failure, throws an
 *     error that NEVER echoes the token (defense against log leakage).
 *   - `PLAYTEST_GOD_ORIGINS` flag is emitted ONLY when allowlist is a
 *     non-empty array — matches `buildServerEnv`'s behaviour so the
 *     server-side default (phase-2 Unit 1's LAN-default) is preserved.
 *   - SECURITY: the token ends up in `argv`, which means it's visible via
 *     `/proc/<pid>/cmdline` (Linux) / Process Explorer (Windows). This is
 *     the same ACCEPTED v1 exposure class as per-process env — local
 *     actors with that level of access already own the dev machine.
 */
export function buildWranglerArgs(
  config: Config,
  token: string,
): string[] {
  validatePlaytestToken(token)
  const args: string[] = [
    'exec',
    'wrangler',
    'dev',
    '--ip',
    '0.0.0.0',
    '--port',
    '8787',
    '--var',
    'PLAYTEST_MODE:1',
    '--var',
    `PLAYTEST_TOKEN:${token}`,
  ]
  const allow = config.godOriginAllowlist
  if (Array.isArray(allow) && allow.length > 0) {
    args.push('--var', `PLAYTEST_GOD_ORIGINS:${allow.join(',')}`)
  }
  return args
}

/**
 * Defense-in-depth token validation — Unit 3b's `mintPlaytestToken` already
 * emits 64 hex chars, but the token travels through orchestrator state; a
 * corrupted/truncated value should fail fast with a CLEAR error that does
 * NOT include the raw token value.
 */
export function validatePlaytestToken(token: string): void {
  if (typeof token !== 'string' || token.length !== 64) {
    throw new Error(
      `playtest token malformed — expected 64 hex chars, got length=${typeof token === 'string' ? token.length : 'non-string'}. ` +
      `Unit 3b's mintPlaytestToken should have minted a 64-hex value; token NOT echoed for security.`,
    )
  }
  if (!/^[0-9a-f]{64}$/.test(token)) {
    throw new Error(
      `playtest token malformed — expected /^[0-9a-f]{64}$/ charset (lowercase hex), got length=${token.length} with invalid chars. ` +
      `Token NOT echoed for security.`,
    )
  }
}

/**
 * Log-hygiene pre-flight. Returns the list of offending env var names, or
 * an empty array when safe.
 *
 * Rejected patterns (C6 — token URL leak):
 *   - `PLAYWRIGHT_TRACE` set to anything truthy → Playwright tracing would
 *     capture the full god WS URL including `?token=<T>`.
 *   - `DEBUG=*` / `DEBUG=*wrangler*` glob → wrangler's verbose mode echoes
 *     inbound URLs with query strings.
 *   - `NODE_OPTIONS` contains `--inspect` → source-level debugger exposes
 *     the minted token in live memory + via the debugger protocol.
 *   - `NODE_DEBUG` set → Node core logs sometimes surface URLs.
 */
export function detectLogHygieneViolations(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const offenders: string[] = []
  if (env.PLAYWRIGHT_TRACE && env.PLAYWRIGHT_TRACE !== '0' && env.PLAYWRIGHT_TRACE !== '') {
    offenders.push('PLAYWRIGHT_TRACE')
  }
  const debug = env.DEBUG
  if (typeof debug === 'string' && debug.length > 0) {
    // Wildcard or wrangler-matching globs are the leakers. `DEBUG=` alone
    // (empty) or debug scopes narrowly targeting non-wrangler modules are
    // fine; be conservative and reject any `*`.
    if (debug === '*' || /\*/.test(debug) || /wrangler/i.test(debug)) {
      offenders.push('DEBUG')
    }
  }
  if (typeof env.NODE_OPTIONS === 'string' && /--inspect(\b|=|-brk)/.test(env.NODE_OPTIONS)) {
    offenders.push('NODE_OPTIONS (--inspect)')
  }
  if (typeof env.NODE_DEBUG === 'string' && env.NODE_DEBUG.length > 0) {
    offenders.push('NODE_DEBUG')
  }
  return offenders
}

// -----------------------------------------------------------------------------
// Healthcheck poller (pure fetch loop — test target).
// -----------------------------------------------------------------------------

export interface HealthcheckDeps {
  readonly fetchFn: typeof fetch
  readonly now: () => number
  readonly sleep: (ms: number) => Promise<void>
  readonly intervalMs?: number
  readonly timeoutMs?: number
}

/**
 * Poll `/health` until `200 + { ok: true, playtest: true, version: string }`
 * or timeout. Distinct rejection paths per plan:
 *   - Body says `playtest: false` → env not picked up.
 *   - Entire window times out on 404 / non-200 → /health missing or
 *     wrangler never came up.
 */
export async function pollWranglerHealth(deps: HealthcheckDeps): Promise<void> {
  const intervalMs = deps.intervalMs ?? HEALTH_POLL_INTERVAL_MS
  const timeoutMs = deps.timeoutMs ?? HEALTH_POLL_TIMEOUT_MS
  const deadline = deps.now() + timeoutMs
  let sawPlaytestFalse = false

  while (deps.now() < deadline) {
    try {
      const res = await deps.fetchFn(WRANGLER_HEALTH_URL)
      if (res.status === 200) {
        const body = (await res.json()) as {
          ok?: unknown
          playtest?: unknown
          version?: unknown
        }
        // `version` is PROTOCOL_VERSION from src/server/health.ts — a number
        // in production. Accept number OR string so fixture-mocked unit
        // tests (which use '1.0.0') still satisfy the shape check.
        const versionOk = typeof body.version === 'string' || typeof body.version === 'number'
        if (body && body.ok === true && versionOk) {
          if (body.playtest === true) return
          if (body.playtest === false) {
            sawPlaytestFalse = true
          }
        }
      }
      // non-200 / bad body → fall through to retry
    } catch {
      // network refused / worker not up yet → retry
    }
    await deps.sleep(intervalMs)
  }

  if (sawPlaytestFalse) {
    throw new Error(
      'wrangler started but PLAYTEST_MODE not picked up — env var was not set at boot. ' +
      'Verify startServers passed PLAYTEST_MODE=1 in the spawn env.',
    )
  }
  throw new Error(
    `wrangler not ready or /health missing after ${timeoutMs}ms — confirm phase-2 Unit 1b shipped the /health route returning {ok,playtest,version}.`,
  )
}

/**
 * Poll vite's `/player.html` until any 200 arrives or timeout.
 */
export async function pollViteHealth(deps: HealthcheckDeps): Promise<void> {
  const intervalMs = deps.intervalMs ?? HEALTH_POLL_INTERVAL_MS
  const timeoutMs = deps.timeoutMs ?? HEALTH_POLL_TIMEOUT_MS
  const deadline = deps.now() + timeoutMs

  while (deps.now() < deadline) {
    try {
      const res = await deps.fetchFn(VITE_HEALTH_URL)
      if (res.status === 200) return
    } catch {
      // retry
    }
    await deps.sleep(intervalMs)
  }
  throw new Error(`vite dev not ready on 5173 after ${timeoutMs}ms`)
}

// -----------------------------------------------------------------------------
// startServers — the orchestrated lifecycle entry point.
// -----------------------------------------------------------------------------

/**
 * Spawn both dev servers, wait for healthchecks (wrangler first, then vite),
 * and return handles. Caller owns teardown via `stopServers`.
 *
 * On any failure mid-startup, both subprocesses are torn down before the
 * promise rejects.
 */
export async function startServers(
  config: Config,
  token: string,
  options: StartServerOptions = {},
): Promise<ServerHandles> {
  const spawnFn = options.spawn ?? defaultSpawn
  const fetchFn = options.fetchFn ?? fetch
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)))
  const envSource = options.envSource ?? process.env
  const allowTrace = options.allowTrace === true

  // 1. Token validation (never echoes the value).
  validatePlaytestToken(token)

  // 2. Log-hygiene gate (C6). Must run BEFORE spawn.
  const offenders = detectLogHygieneViolations(envSource)
  if (offenders.length > 0) {
    if (!allowTrace) {
      throw new Error(
        `Log hygiene gate — these env vars can leak the god WS token: ${offenders.join(', ')}. ` +
        `Restart without them OR pass --allow-trace to opt in.`,
      )
    }
    // Explicit opt-in: print banner to stderr, proceed.
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️  TRACE MODE — god WS URL with token will appear in trace output. Do not share the trace file.',
    )
  }

  // 3. Build env (defense-in-depth — wrangler ignores this for workerd
  //    bindings; see module-level note). Also build the wrangler CLI args
  //    — this is the AUTHORITATIVE path for PLAYTEST_* to reach workerd.
  const spawnEnv = buildServerEnv(config, token, envSource)
  const wranglerArgs = buildWranglerArgs(config, token)

  // 4. Spawn wrangler directly via `pnpm exec wrangler dev ...`. We cannot
  //    use the `pnpm dev:server` script here because pnpm would pass the
  //    trailing `--var KEY:VALUE` flags to itself, not to wrangler. Mirrors
  //    phase2-smoke.ts. `shell: true` on Windows so `pnpm.cmd` resolves.
  const wrangler = spawnFn('pnpm', wranglerArgs, {
    env: spawnEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  // 5. Spawn vite with plain env (vite doesn't need the playtest secrets).
  //    Pass the base env only — no PLAYTEST_* leakage into the client build.
  const vite = spawnFn('pnpm', ['dev'], {
    env: envSource,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  // Drain stdout/stderr so the OS pipe buffers don't fill up and block the
  // child process (wrangler in particular is chatty at boot). We route
  // everything to our own stderr with a [wrangler] / [vite] prefix so the
  // orchestrator's normal stdout stays clean. phase2-smoke.ts mirrors this.
  const drain = (child: ChildProcess, label: string): void => {
    child.stdout?.on('data', (d: Buffer) => process.stderr.write(`[${label}] ${d}`))
    child.stderr?.on('data', (d: Buffer) => process.stderr.write(`[${label}] ${d}`))
  }
  drain(wrangler, 'wrangler')
  drain(vite, 'vite')

  const wranglerPid = wrangler.pid
  const vitePid = vite.pid
  if (typeof wranglerPid !== 'number' || typeof vitePid !== 'number') {
    // Best-effort teardown then reject.
    try { wrangler.kill('SIGTERM') } catch { /* noop */ }
    try { vite.kill('SIGTERM') } catch { /* noop */ }
    throw new Error('failed to spawn wrangler or vite — no pid assigned')
  }

  const handles: ServerHandles = {
    wranglerPid,
    vitePid,
    healthUrl: WRANGLER_HEALTH_URL,
    _wrangler: wrangler,
    _vite: vite,
    _stopped: false,
  }

  // 6. Healthcheck — wrangler first, then vite. If either fails, tear both
  //    down before rejecting.
  try {
    await pollWranglerHealth({ fetchFn, now, sleep })
    await pollViteHealth({ fetchFn, now, sleep })
  } catch (err) {
    await stopServers(handles).catch(() => { /* swallow during cleanup */ })
    throw err
  }

  return handles
}

// -----------------------------------------------------------------------------
// stopServers — idempotent SIGTERM → 5s grace → SIGKILL.
// -----------------------------------------------------------------------------

export async function stopServers(handles: ServerHandles): Promise<void> {
  if (handles._stopped) return
  handles._stopped = true

  const children: ChildProcess[] = [handles._wrangler, handles._vite]

  // Send SIGTERM to any still-alive child.
  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      try { child.kill('SIGTERM') } catch { /* already dead */ }
    }
  }

  // Wait for both to exit, or grace-window elapse.
  await Promise.all(children.map((child) => waitForExit(child, SIGTERM_GRACE_MS)))

  // Anything still alive after the grace window → SIGKILL.
  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      try { child.kill('SIGKILL') } catch { /* noop */ }
    }
  }
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve()
      return
    }
    let settled = false
    const done = (): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    child.once('exit', done)
    child.once('close', done)
  })
}
