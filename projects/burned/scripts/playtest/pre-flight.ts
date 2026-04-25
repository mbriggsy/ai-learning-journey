#!/usr/bin/env tsx
/**
 * `pnpm playtest:pre-flight` — Phase 6 Unit 1 D7 authorization gate.
 *
 * Runs SIX fail-closed checks before any Phase 6 series-#1 run is allowed
 * to fire. On all-pass: exit 0. On any fail: print diagnostic table, exit
 * non-zero, no side effects.
 *
 * Checks (verbatim from phase-6 plan §Unit 1):
 *   1. `.last-selftest` exists AND timestamp < 24h old (phase-3 D10)
 *   2. `.claude/agents/playtest-seat.md` parses + non-empty `tools:` whitelist
 *   3. `.claude/agents/playtest-triage.md` parses + non-empty `tools:` whitelist
 *   4. Catalog at calibration.json's `catalogPath` parses; per phase-1 D1 each
 *      scenario carries a vibe-check; KNOWN_PRODUCT_CALL_CLUSTER members
 *      each have ≥1 catalog scenario tagged `known-product-call: <id>`
 *   5. Phase 2 capability probe (live god WS handshake) — boots wrangler,
 *      opens god WS, asserts envelope shape carries `expectedViewerIds:
 *      string[]`. Feature-detect, NOT version-parse (phase-2 D4).
 *   6. `--no-scrub` refusal gate — refuses without `CALIBRATION_DEBUG=1`,
 *      passes with stderr warning when both present.
 *
 * Insights honored:
 *   020 — frontmatter `tools:` whitelist IS the enforcement; checks 2+3
 *         verify shape, not behavior.
 *   022 — pre-flight.ts MUST NOT import `src/server/room.ts` (cloudflare:
 *         scheme breaks Node ESM). Live probe via wrangler subprocess only.
 *   024 — wrangler dev needs `--var KEY:VALUE` flags. Reuse startServers
 *         which already does this correctly.
 *   025 — bare `new WebSocket()` gets 4003. Reuse buildLanOriginFromWsUrl
 *         to set the Origin header.
 *   026 — wrangler stdio MUST be drained or 'ignore'. startServers already
 *         drains.
 *   027 — every absence assertion paired with a presence companion. Probe
 *         asserts envelope shape AFTER asserting an envelope arrived.
 *   029 — reuse parseCatalog, do not re-derive scenario shape.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import WebSocket from 'ws'

import { parseCatalog, type ParsedScenario } from './lib/scenario-detector'
import { buildLanOriginFromWsUrl } from './lib/god-subscriber'
import { startServers, stopServers } from './lib/server-controller'
import { mintPlaytestToken } from './lib/session-secrets'
import type { Config } from './lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The cluster of BLOCKED + OPEN-but-deliberate issues whose scenarios
 * MUST carry a `**Known product call:**` tag in the calibration catalog.
 * Hardcoded per phase-6 plan M3 — update this list when the cluster
 * composition changes (i.e. when a new cluster issue lands in
 * `docs/testing/E2E-ISSUE-LIST.md`).
 *
 * Composition (phase-1 D4 / Unit 6):
 *   - A-01            (Favor self-target atomicity gap)
 *   - B-03 ... B-07   (active-state-pending disconnect cluster)
 *   - B-13            (active-player mid-turn disconnect)
 *   - C-15            (Burned board-drama variant)
 *   - D-03            (simultaneous Nope UX)
 *   - D-16            (counter-counter-nope UI gap, chainDepth >= 1)
 */
export const KNOWN_PRODUCT_CALL_CLUSTER: readonly string[] = [
  'A-01',
  'B-03',
  'B-04',
  'B-05',
  'B-06',
  'B-07',
  'B-13',
  'C-15',
  'D-03',
  'D-16',
] as const

const STAMP_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24h
const PROBE_TIMEOUT_MS = 10_000

// ---------------------------------------------------------------------------
// CheckResult
// ---------------------------------------------------------------------------

export type CheckStatus = 'pass' | 'fail'

export interface CheckResult {
  readonly name: string
  readonly status: CheckStatus
  readonly detail?: string
  readonly warning?: string
}

const pass = (name: string, detail?: string, warning?: string): CheckResult => ({
  name,
  status: 'pass',
  ...(detail ? { detail } : {}),
  ...(warning ? { warning } : {}),
})
const fail = (name: string, detail: string): CheckResult => ({
  name,
  status: 'fail',
  detail,
})

// ---------------------------------------------------------------------------
// Check 1 — selftest stamp freshness
// ---------------------------------------------------------------------------

export interface SelftestStampDeps {
  readonly stampPath?: string
  readonly readFile?: (p: string) => Promise<string>
  readonly now?: () => number
}

/**
 * Check 1. `.last-selftest` exists AND timestamp < 24h old (phase-3 D10).
 *
 * The selftest itself runs 8 checks (cookie / localStorage / WS-frame /
 * god-non-delivery / allowlist-defined / close-codes-distinct / scrubber-
 * fail-closed / retention-boundary). Pre-flight just checks the stamp file
 * is fresh; it does NOT re-run the selftest.
 *
 * Stamp file format: selftest.ts writes TWO lines —
 *   line 1: bare ISO timestamp (e.g. `2026-04-24T18:08:23.955Z`)
 *   line 2: JSON payload `{"ts":"<ISO>"}`
 * We parse line-by-line and accept the first parseable timestamp, so a
 * stamp with extra trailing lines / fields stays compatible.
 */
export async function checkSelftestStamp(
  deps: SelftestStampDeps = {},
): Promise<CheckResult> {
  const stampPath = deps.stampPath ?? '.last-selftest'
  const readFile = deps.readFile ?? ((p) => fs.readFile(p, 'utf8'))
  const now = deps.now ?? Date.now

  let raw: string
  try {
    raw = await readFile(stampPath)
  } catch {
    return fail(
      '1. selftest stamp',
      `\`.last-selftest\` missing — run \`pnpm playtest:selftest\` first (phase-3 D10).`,
    )
  }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  let stampTime = Number.NaN
  for (const line of lines) {
    const iso = Date.parse(line)
    if (!Number.isNaN(iso)) {
      stampTime = iso
      break
    }
    try {
      const obj = JSON.parse(line) as { ts?: unknown; at?: unknown }
      const isoField = typeof obj.ts === 'string' ? obj.ts : typeof obj.at === 'string' ? obj.at : undefined
      if (isoField) {
        const parsed = Date.parse(isoField)
        if (!Number.isNaN(parsed)) {
          stampTime = parsed
          break
        }
      }
    } catch {
      /* not JSON — try next line */
    }
  }

  if (Number.isNaN(stampTime)) {
    return fail(
      '1. selftest stamp',
      `\`.last-selftest\` exists but contents unreadable — re-run \`pnpm playtest:selftest\`.`,
    )
  }

  const ageMs = now() - stampTime
  if (ageMs > STAMP_MAX_AGE_MS) {
    const ageHours = (ageMs / (60 * 60 * 1000)).toFixed(1)
    return fail(
      '1. selftest stamp',
      `selftest expired — stamp is ${ageHours}h old (max 24h). Re-run \`pnpm playtest:selftest\`.`,
    )
  }

  const ageMinutes = Math.round(ageMs / 60000)
  return pass('1. selftest stamp', `stamp is ${ageMinutes} minutes old`)
}

// ---------------------------------------------------------------------------
// Checks 2 + 3 — subagent files + tools: whitelist
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/

/**
 * Parse frontmatter from a markdown agent file. Returns the parsed key/value
 * map (string values only — single-line). Returns null if no frontmatter
 * fence found. Comma-separated `tools:` value is preserved verbatim; caller
 * splits + validates non-empty.
 *
 * NOT a full YAML parser — we only need flat `key: value` pairs.
 */
export function parseAgentFrontmatter(
  raw: string,
): Record<string, string> | null {
  const m = FRONTMATTER_RE.exec(raw)
  if (!m) return null
  const body = m[1] ?? ''
  const out: Record<string, string> = {}
  for (const line of body.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key) out[key] = value
  }
  return out
}

export interface AgentFileDeps {
  readonly readFile?: (p: string) => Promise<string>
}

/**
 * Generic agent-file shape check used by checks 2 + 3. Verifies:
 *   (a) file exists and is readable
 *   (b) `---\n...\n---` frontmatter fence present
 *   (c) `tools:` field present
 *   (d) tools value is a non-empty comma-separated list (not blank, not '[]')
 *
 * Per insight 020, this frontmatter IS the enforcement boundary — Claude
 * Code refuses tool calls outside the whitelist at the tool-surface gate.
 * This check verifies the gate file is present and shaped, NOT that any
 * specific tool is in/out (the agent files document their own surface).
 */
export async function checkAgentFile(
  agentPath: string,
  checkName: string,
  deps: AgentFileDeps = {},
): Promise<CheckResult> {
  const readFile = deps.readFile ?? ((p) => fs.readFile(p, 'utf8'))

  let raw: string
  try {
    raw = await readFile(agentPath)
  } catch {
    return fail(
      checkName,
      `subagent file missing: ${agentPath}. Required for capability isolation (insight 020).`,
    )
  }

  const fm = parseAgentFrontmatter(raw)
  if (!fm) {
    return fail(
      checkName,
      `${agentPath}: no \`---\` frontmatter fence found. Required for Claude Code agent registration.`,
    )
  }

  const tools = fm.tools
  if (typeof tools !== 'string' || tools.trim().length === 0) {
    return fail(
      checkName,
      `${agentPath}: frontmatter \`tools:\` missing or empty. The whitelist IS the enforcement boundary (insight 020).`,
    )
  }

  const trimmed = tools.trim()
  if (trimmed === '[]' || trimmed === '[ ]') {
    return fail(
      checkName,
      `${agentPath}: \`tools:\` is an empty array. Whitelist must list >= 1 allowed tool.`,
    )
  }

  const items = trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
  if (items.length === 0) {
    return fail(
      checkName,
      `${agentPath}: \`tools:\` parsed to zero non-empty entries.`,
    )
  }

  return pass(checkName, `${items.length} tools whitelisted`)
}

// ---------------------------------------------------------------------------
// Check 4 — catalog parses + cluster tags present
// ---------------------------------------------------------------------------

export interface CatalogDeps {
  readonly readFile?: (p: string) => Promise<string>
  readonly cluster?: readonly string[]
}

/**
 * Check 4. Catalog at the configured `catalogPath`:
 *   - parses (parseCatalog returns >=1 scenario)
 *   - every scenario carries a `vibeCheck` body (phase-1 D1)
 *   - every KNOWN_PRODUCT_CALL_CLUSTER member appears in some scenario's
 *     `knownProductCall` field via substring match (handles compound tags
 *     like `A-01, D-03` and natural-language formats)
 *
 * Reuses `parseCatalog` from scenario-detector.ts (insight 029 — no
 * re-derivation).
 */
export async function checkCatalog(
  catalogPath: string,
  deps: CatalogDeps = {},
): Promise<CheckResult> {
  const readFile = deps.readFile ?? ((p) => fs.readFile(p, 'utf8'))
  const cluster = deps.cluster ?? KNOWN_PRODUCT_CALL_CLUSTER

  let raw: string
  try {
    raw = await readFile(catalogPath)
  } catch {
    return fail('4. catalog', `catalog not readable at ${catalogPath}`)
  }

  let scenarios: ParsedScenario[]
  try {
    scenarios = parseCatalog(raw)
  } catch (err) {
    return fail('4. catalog', `parseCatalog threw: ${(err as Error).message}`)
  }

  if (scenarios.length === 0) {
    return fail('4. catalog', `${catalogPath}: parseCatalog returned 0 scenarios`)
  }

  const missingVibe = scenarios
    .filter((s) => !s.vibeCheck || s.vibeCheck.trim().length === 0)
    .map((s) => s.id)
  if (missingVibe.length > 0) {
    return fail(
      '4. catalog',
      `scenarios missing \`**Vibe check:**\` body (phase-1 D1): ${missingVibe.join(', ')}`,
    )
  }

  const allTags = scenarios
    .map((s) => s.knownProductCall ?? '')
    .filter((t) => t.length > 0)
    .join('\n')

  const missingCluster = cluster.filter((id) => !allTags.includes(id))
  if (missingCluster.length > 0) {
    return fail(
      '4. catalog',
      `KNOWN_PRODUCT_CALL_CLUSTER members with zero tagged scenarios in ${catalogPath}: ${missingCluster.join(', ')}. ` +
        `Add \`**Known product call:** <id>\` to >=1 scenario per cluster issue (phase-1 D4 / Unit 6).`,
    )
  }

  return pass(
    '4. catalog',
    `${scenarios.length} scenarios parsed; all ${cluster.length} cluster IDs tagged`,
  )
}

// ---------------------------------------------------------------------------
// Check 5 — Phase 2 capability probe (live god WS handshake)
// ---------------------------------------------------------------------------

/**
 * Pure shape-assertion. Given an arbitrary parsed JSON payload, verify it
 * is a `god-event` envelope with a string-array `expectedViewerIds` field
 * (phase-2 D4). Returns CheckResult so callers can stitch into the table.
 *
 * Per insight 027, callers MUST FIRST establish that an envelope arrived
 * (presence companion) before calling this — otherwise an empty inbox
 * passes vacuously.
 */
export function assertGodEnvelopeShape(payload: unknown): CheckResult {
  if (payload === null || typeof payload !== 'object') {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — envelope is not an object (got ${payload === null ? 'null' : typeof payload}). Bounce back to Phase 2 Unit 6.`,
    )
  }
  const obj = payload as Record<string, unknown>

  if (obj.type !== 'god-event') {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — envelope.type is ${JSON.stringify(obj.type)}, expected 'god-event'. Bounce back to Phase 2 Unit 6.`,
    )
  }

  if (!('expectedViewerIds' in obj)) {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — server missing expectedViewerIds on god-event envelope. Bounce back to Phase 2 Unit 6.`,
    )
  }

  const viewers = obj.expectedViewerIds
  if (!Array.isArray(viewers)) {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — expectedViewerIds present but not an array (got ${typeof viewers}). Bounce back to Phase 2 Unit 6.`,
    )
  }

  if (viewers.some((v) => typeof v !== 'string')) {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — expectedViewerIds contains non-string entries. Bounce back to Phase 2 Unit 6.`,
    )
  }

  return pass(
    '5. capability probe',
    `god-event envelope shape OK; expectedViewerIds: string[${viewers.length}]`,
  )
}

/**
 * Pure assertion against a `playtest-config-ack` payload. Server emits this
 * in response to a god WS `playtest-config` message; ok:true means the
 * server accepted the config. Tests + the live probe both consume this.
 */
export function assertConfigAck(payload: unknown): CheckResult {
  if (payload === null || typeof payload !== 'object') {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — ack is not an object (got ${payload === null ? 'null' : typeof payload}). Bounce back to Phase 2 Unit 6.`,
    )
  }
  const obj = payload as Record<string, unknown>
  if (obj.type !== 'playtest-config-ack') {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — ack.type is ${JSON.stringify(obj.type)}, expected 'playtest-config-ack'.`,
    )
  }
  if (obj.ok !== true) {
    const code = typeof obj.code === 'string' ? obj.code : 'unknown'
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — server rejected playtest-config (code: ${code}). Bounce back to Phase 2 Unit 6.`,
    )
  }
  return pass(
    '5. capability probe',
    'god WS handshake green; envelope shape detection deferred to Unit 3 first broadcast',
  )
}

export interface CapabilityProbeDeps {
  readonly config: Config
  readonly probeTimeoutMs?: number
  /**
   * Test injection seam — when provided, skip the live wrangler boot and
   * just hand back this payload to assertConfigAck. Real invocation leaves
   * this unset and the function dials wrangler.
   */
  readonly fakeAck?: unknown
}

/**
 * Check 5. Live god-WS handshake probe per phase-6 D7.5.
 *
 *   1. Mint a fresh PLAYTEST_TOKEN.
 *   2. Boot wrangler via startServers (handles --var, stdio drain, Windows
 *      taskkill on teardown — insights 024, 026).
 *   3. Open a god WebSocket (role=god, token in query) at
 *      `ws://127.0.0.1:8787/parties/game-room/<room>`. Path is `game-room`,
 *      not `main` — partyserver routes by Server-class export name. Origin
 *      header set via buildLanOriginFromWsUrl (insight 025).
 *   4. Send `playtest-config { seed, nopeWindowMs }`. Wait for
 *      `playtest-config-ack` with `ok: true`.
 *   5. Tear down WS + servers.
 *
 * Boundary (verified against `src/server/room.ts:902-911`): god-events
 * fire ONLY when `pendingGodEventTrigger` is set, which only happens at
 * dispatch sites for real engine actions. Lobby state, host-connect, and
 * simple joins do NOT produce god-event broadcasts. So a pre-flight
 * probe in an empty room CANNOT feature-detect `expectedViewerIds` on
 * the envelope — that detection runs against the FIRST real broadcast in
 * Phase 6 Unit 3. `assertGodEnvelopeShape` (above) stays in this file
 * for Unit 3 to import and run against the first live envelope.
 *
 * What this check DOES verify in pre-flight:
 *   - wrangler boots with PLAYTEST_MODE=1 + valid PLAYTEST_TOKEN
 *   - /health returns `playtest: true` (via startServers' poll)
 *   - god origin gate accepts a LAN Origin header (insight 025)
 *   - god token gate accepts the minted 64-hex token
 *   - playtest mode is on the wire (server replies with config-ack:ok)
 *
 * If `fakeAck` is provided, skips steps 1-5 entirely and validates the
 * supplied ack payload directly. Used by tests; real invocation always
 * omits it.
 */
export async function checkCapabilityProbeLive(
  deps: CapabilityProbeDeps,
): Promise<CheckResult> {
  if ('fakeAck' in deps) {
    return assertConfigAck(deps.fakeAck)
  }

  const probeTimeoutMs = deps.probeTimeoutMs ?? PROBE_TIMEOUT_MS

  const token = mintPlaytestToken()
  const roomCode = `PROBE${Math.floor(Math.random() * 9000 + 1000)}`
  const baseWs = `ws://127.0.0.1:8787/parties/game-room/${encodeURIComponent(roomCode)}`
  const godWsUrl = `${baseWs}?role=god&token=${token}`
  const origin = buildLanOriginFromWsUrl(godWsUrl)

  let serverHandles: Awaited<ReturnType<typeof startServers>> | undefined
  let godWs: WebSocket | undefined
  try {
    serverHandles = await startServers(deps.config, token)

    const ack = await new Promise<unknown>((resolve, reject) => {
      const god = new WebSocket(godWsUrl, { headers: { Origin: origin } })
      godWs = god

      const timer = setTimeout(() => {
        reject(
          new Error(
            `no playtest-config-ack received within ${probeTimeoutMs}ms`,
          ),
        )
      }, probeTimeoutMs)

      god.on('open', () => {
        god.send(
          JSON.stringify({
            type: 'playtest-config',
            seed: deps.config.seed ?? 1,
            nopeWindowMs: deps.config.nopeWindowMs,
          }),
        )
      })

      god.on('message', (data: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(data.toString('utf8')) as { type?: unknown }
          if (parsed && parsed.type === 'playtest-config-ack') {
            clearTimeout(timer)
            resolve(parsed)
          }
        } catch {
          /* malformed JSON — ignore */
        }
      })

      god.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      god.on('close', (code) => {
        clearTimeout(timer)
        reject(new Error(`god WS closed with code ${code} before ack arrived`))
      })

      god.on('unexpected-response', (_req, res) => {
        clearTimeout(timer)
        reject(
          new Error(
            `god WS pre-upgrade rejection — HTTP ${res.statusCode}. Likely Origin / token gate.`,
          ),
        )
      })
    })

    return assertConfigAck(ack)
  } catch (err) {
    return fail(
      '5. capability probe',
      `Phase 2 capability probe failed — ${(err as Error).message}. Bounce back to Phase 2 Unit 6.`,
    )
  } finally {
    for (const sock of [godWs]) {
      if (sock && sock.readyState !== WebSocket.CLOSED) {
        try {
          sock.close()
        } catch {
          /* noop */
        }
      }
    }
    if (serverHandles) {
      await stopServers(serverHandles).catch(() => {
        /* swallow during cleanup */
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Check 6 — --no-scrub refusal gate
// ---------------------------------------------------------------------------

export interface NoScrubDeps {
  readonly argv?: readonly string[]
  readonly env?: Readonly<Record<string, string | undefined>>
}

const NO_SCRUB_REFUSAL_MESSAGE =
  '--no-scrub requires CALIBRATION_DEBUG=1 env var. Unscrubbed runs retain ' +
  'full myHand contents and are retained-internal-only (not shareable).'

/**
 * Check 6. `--no-scrub` refusal gate (phase-6 I3).
 *
 * Three branches:
 *   (a) `--no-scrub` absent -> pass silently
 *   (b) `--no-scrub` present + CALIBRATION_DEBUG=1 -> pass with stderr
 *       warning banner (downstream marks the run UNSCRUBBED-RETAIN-
 *       INTERNAL-ONLY)
 *   (c) `--no-scrub` present without CALIBRATION_DEBUG=1 -> fail with the
 *       exact actionable message
 */
export function checkNoScrubGate(deps: NoScrubDeps = {}): CheckResult {
  const argv = deps.argv ?? process.argv
  const env = deps.env ?? process.env

  const hasNoScrub = argv.includes('--no-scrub')
  if (!hasNoScrub) return pass('6. --no-scrub gate', 'flag absent')

  const debug = env.CALIBRATION_DEBUG
  if (debug === '1') {
    return pass(
      '6. --no-scrub gate',
      '--no-scrub + CALIBRATION_DEBUG=1 confirmed',
      '--no-scrub mode active — run will be tagged UNSCRUBBED-RETAIN-INTERNAL-ONLY',
    )
  }

  return fail('6. --no-scrub gate', NO_SCRUB_REFUSAL_MESSAGE)
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

const USAGE = `
Usage: pnpm playtest:pre-flight [options]

Phase 6 Unit 1 D7 authorization gate. Runs SIX fail-closed checks before
the calibration / series-#1 run is allowed to proceed.

Options:
  --help, -h        Print this message and exit.
  --config <path>   Path to calibration config JSON.
                    Default: scripts/playtest/config/calibration.json
  --no-scrub        Refusal-gated. Requires CALIBRATION_DEBUG=1 env var.
                    Run will be tagged UNSCRUBBED-RETAIN-INTERNAL-ONLY.
  --skip-probe      Skip check 5 (live god WS handshake). Use ONLY when
                    iterating on checks 1-4 / 6 — the live probe remains
                    a hard pre-flight requirement before a real run.

On all-pass: exit 0. On any fail: print diagnostic table, exit non-zero.
`.trim()

export interface PreflightArgs {
  readonly help: boolean
  readonly configPath: string
  readonly skipProbe: boolean
  readonly noScrub: boolean
}

export function parseArgs(argv: readonly string[]): PreflightArgs {
  let help = false
  let configPath = 'scripts/playtest/config/calibration.json'
  let skipProbe = false
  const noScrub = argv.includes('--no-scrub')

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') help = true
    if (a === '--skip-probe') skipProbe = true
    if (a === '--config' && i + 1 < argv.length) {
      configPath = argv[i + 1]!
    }
  }

  return { help, configPath, skipProbe, noScrub }
}

export async function loadConfig(configPath: string): Promise<Config> {
  const raw = await fs.readFile(configPath, 'utf8')
  return JSON.parse(raw) as Config
}

export interface RunChecksResult {
  readonly results: readonly CheckResult[]
}

/**
 * Run the gate. Pure orchestration over check helpers; no process.exit.
 * Caller decides exit status from `results`.
 */
export async function runChecks(
  args: PreflightArgs,
  log: (msg: string) => void = (m) => process.stderr.write(`${m}\n`),
): Promise<RunChecksResult> {
  const results: CheckResult[] = []

  // Check 6 first — --no-scrub gate runs BEFORE anything else so an
  // unauthorized invocation rejects without booting wrangler.
  const noScrubResult = checkNoScrubGate()
  if (noScrubResult.status === 'fail') {
    results.push(noScrubResult)
    return { results }
  }
  if (noScrubResult.warning) {
    log(`WARN  ${noScrubResult.warning}`)
  }

  let config: Config
  try {
    config = await loadConfig(args.configPath)
  } catch (err) {
    results.push(
      fail(
        '0. config',
        `failed to load ${args.configPath}: ${(err as Error).message}`,
      ),
    )
    return { results }
  }

  results.push(await checkSelftestStamp())
  results.push(
    await checkAgentFile('.claude/agents/playtest-seat.md', '2. playtest-seat.md'),
  )
  results.push(
    await checkAgentFile(
      '.claude/agents/playtest-triage.md',
      '3. playtest-triage.md',
    ),
  )
  results.push(await checkCatalog(path.normalize(config.catalogPath)))

  if (args.skipProbe) {
    results.push(
      pass('5. capability probe', '--skip-probe — DEFERRED, NOT GREEN'),
    )
  } else {
    results.push(await checkCapabilityProbeLive({ config }))
  }

  results.push(noScrubResult)

  return { results }
}

function renderTable(results: readonly CheckResult[]): string {
  const rows = results.map((r) => {
    const icon = r.status === 'pass' ? '[OK]' : '[FAIL]'
    const detail = r.detail ? ` — ${r.detail}` : ''
    return `  ${icon} ${r.name}${detail}`
  })
  return rows.join('\n')
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  if (args.help) {
    process.stdout.write(`${USAGE}\n`)
    process.exit(0)
  }

  process.stderr.write('Phase 6 pre-flight — D7 authorization gate\n')
  process.stderr.write(`config: ${args.configPath}\n\n`)

  const { results } = await runChecks(args)

  process.stderr.write(`${renderTable(results)}\n\n`)

  const failed = results.filter((r) => r.status === 'fail')
  if (failed.length > 0) {
    process.stderr.write(`${failed.length} of ${results.length} checks failed.\n`)
    process.exit(1)
  }

  process.stderr.write(`All ${results.length} checks passed. Pre-flight green.\n`)
  process.exit(0)
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  /pre-flight\.(ts|js|mjs)$/.test(process.argv[1])
if (invokedDirectly) {
  main().catch((err: unknown) => {
    process.stderr.write(`pre-flight crashed: ${(err as Error).message}\n`)
    process.exit(2)
  })
}
