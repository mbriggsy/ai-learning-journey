#!/usr/bin/env tsx
/**
 * `pnpm playtest:selftest` entrypoint — Phase 3 Unit 7.
 *
 * Runs the 8-check isolation self-test. Writes `.last-selftest` (at repo
 * root) with an ISO timestamp on all-pass. On any fail: diagnostic table,
 * exit non-zero, NO stamp.
 *
 * Checks:
 *   1. Cookie isolation       [LIVE — needs browser]
 *   2. localStorage isolation [LIVE — needs browser + vite]
 *   3. WS-frame isolation     [LIVE — needs browser + wrangler]
 *   4. God events don't reach players [LIVE — browser + wrangler]
 *   5. Agent allowlist        [PURE]
 *   6. God close codes        [LIVE — wrangler only]
 *   7. Scrubber invoked       [PURE]
 *   8. Retention boundary     [PURE + tmpfs]
 *
 * Flags:
 *   --help / -h     Print usage, exit 0.
 *   --only N        Run just check N (1-8).
 *   --skip-live     Skip checks 1-4, 6. Useful for CI / fast feedback.
 *                   Still writes stamp if 5, 7, 8 all pass; stamp marked
 *                   with `liveSkipped: true` so orchestrator can notice.
 *
 * Live flow:
 *   - Mint a throwaway 64-hex token.
 *   - Spawn wrangler on 8787 with PLAYTEST_MODE=1 + PLAYTEST_TOKEN=<token>.
 *   - Spawn vite on 5173.
 *   - Poll health on both.
 *   - Launch chromium headless.
 *   - Run the live checks.
 *   - Teardown in reverse on any outcome.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { spawn, type ChildProcess } from 'node:child_process'

import { mintPlaytestToken } from './lib/session-secrets'

import {
  checkCookieIsolation,
  checkLocalStorageIsolation,
  checkWsFrameIsolation,
  checkGodNonDeliveryToPlayers,
  checkAgentAllowlistDefinition,
  checkGodCloseCodesDistinct,
  checkScrubberInvokedFailClosed,
  checkRetentionBoundary,
  type CheckResult,
  type LiveCtx,
} from './lib/selftest-checks'

const USAGE = `
Usage: pnpm playtest:selftest [options]

Runs the isolation self-test — 8 checks that validate the harness is a safe
observer (no cross-seat leakage, no god-mode reachable by seat agents, token
gate rejecting unauthenticated connections, scrubber + retention contracts).
Must pass within 24h of every \`pnpm playtest:run\` invocation.

Options:
  --help, -h        Print this message and exit.
  --only N          Run just check N (1-8). Does NOT write the stamp.
  --skip-live       Skip checks 1-4 + 6 (live servers). Writes stamp
                    with liveSkipped:true on pass of 5, 7, 8.

On all-pass: writes \`.last-selftest\` at repo root with ISO timestamp.
On any fail: prints diagnostic table, exits non-zero, does NOT write stamp.

See scripts/playtest/README.md §2 Trust Model.
`.trim()

const STAMP_PATH = '.last-selftest'

interface ParsedArgs {
  readonly help: boolean
  readonly skipLive: boolean
  readonly only: number | null
}

export function parseSelftestArgs(argv: readonly string[]): ParsedArgs {
  let help = false
  let skipLive = false
  let only: number | null = null

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') help = true
    else if (a === '--skip-live') skipLive = true
    else if (a === '--only') {
      const v = argv[i + 1]
      if (v === undefined) throw new Error('--only requires a number 1-8')
      const n = parseInt(v, 10)
      if (!Number.isInteger(n) || n < 1 || n > 8) {
        throw new Error(`--only expects 1-8, got ${v}`)
      }
      only = n
      i++
    } else if (a.startsWith('--only=')) {
      const n = parseInt(a.slice(7), 10)
      if (!Number.isInteger(n) || n < 1 || n > 8) {
        throw new Error(`--only expects 1-8, got ${a}`)
      }
      only = n
    } else {
      throw new Error(`unknown argument: ${a}`)
    }
  }
  return { help, skipLive, only }
}

function printTable(results: readonly CheckResult[]): void {
  const width = Math.max(...results.map((r) => r.name.length), 20)
  const header = `  ${'check'.padEnd(width)}  result   detail`
  // eslint-disable-next-line no-console
  console.log(header)
  // eslint-disable-next-line no-console
  console.log(`  ${'-'.repeat(width)}  ------   ${'-'.repeat(40)}`)
  for (const r of results) {
    const mark = r.pass ? 'PASS' : 'FAIL'
    // eslint-disable-next-line no-console
    console.log(`  ${r.name.padEnd(width)}  ${mark}   ${r.detail}`)
  }
}

interface StampFile {
  readonly ts: string
  readonly liveSkipped?: boolean
  readonly only?: number
}

async function writeStamp(data: StampFile): Promise<void> {
  // The orchestrator's default reader only cares about the first line
  // being an ISO timestamp; extra JSON below is additive. For forward
  // compatibility, we still put the ISO timestamp on line 1.
  const body = `${data.ts}\n${JSON.stringify(data)}\n`
  await fs.writeFile(
    path.join(process.cwd(), STAMP_PATH),
    body,
    'utf8',
  )
}

async function runPureChecks(): Promise<CheckResult[]> {
  return [
    checkAgentAllowlistDefinition(),
    await checkScrubberInvokedFailClosed(),
    await checkRetentionBoundary(),
  ]
}

async function runLiveChecks(live: LiveCtx): Promise<CheckResult[]> {
  // Each check is independent — run sequentially so we can report
  // clear progress and avoid hammering the dev servers.
  const results: CheckResult[] = []
  results.push(await checkCookieIsolation(live))
  results.push(await checkLocalStorageIsolation(live))
  results.push(await checkWsFrameIsolation(live))
  results.push(await checkGodNonDeliveryToPlayers(live))
  results.push(await checkGodCloseCodesDistinct(live))
  return results
}

const WRANGLER_PORT = 8787
const VITE_PORT = 5173
const WRANGLER_HEALTH_URL = `http://127.0.0.1:${WRANGLER_PORT}/health`
const VITE_HEALTH_URL = `http://127.0.0.1:${VITE_PORT}/player.html`
const BOOT_TIMEOUT_MS = 60_000

async function waitForHealth(
  url: string,
  predicate: (body: unknown) => boolean,
  label: string,
): Promise<void> {
  const deadline = Date.now() + BOOT_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.status === 200) {
        const body = await res
          .json()
          .catch(() => null as unknown)
          .then((b) => b)
          .catch(() => null)
        if (predicate(body)) return
      }
    } catch {
      /* retry */
    }
    await delay(400)
  }
  throw new Error(`${label} not ready after ${BOOT_TIMEOUT_MS}ms at ${url}`)
}

async function bootLiveCtx(): Promise<{
  live: LiveCtx
  teardown: () => Promise<void>
}> {
  const token = mintPlaytestToken()

  // eslint-disable-next-line no-console
  console.log('[selftest] booting wrangler + vite (may take ~30s)…')

  // Spawn wrangler DIRECTLY with `--var` flags. This mirrors phase2-smoke.ts
  // — passing PLAYTEST_* via Node's process env does NOT reach the worker
  // runtime; wrangler dev requires `--var KEY:VALUE` / wrangler.toml [vars]
  // / .dev.vars. Bypassing server-controller here keeps Unit 3's test
  // contract (`args === ['dev:server']`) intact while giving Unit 7 the
  // playtest-enabled wrangler it needs. Orchestrator (Unit 6) / Unit 8
  // will surface the same issue — Unit 3 fix is a follow-up.
  const wrangler = spawn(
    'pnpm',
    [
      'exec',
      'wrangler',
      'dev',
      '--ip',
      '0.0.0.0',
      '--port',
      String(WRANGLER_PORT),
      '--var',
      'PLAYTEST_MODE:1',
      '--var',
      `PLAYTEST_TOKEN:${token}`,
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    },
  )
  // Silent by default — uncomment for debugging.
  // wrangler.stdout?.on('data', (d: Buffer) => process.stderr.write(`[wrangler] ${d}`))
  // wrangler.stderr?.on('data', (d: Buffer) => process.stderr.write(`[wrangler] ${d}`))

  const vite = spawn('pnpm', ['dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  try {
    await waitForHealth(
      WRANGLER_HEALTH_URL,
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        (b as Record<string, unknown>).ok === true &&
        (b as Record<string, unknown>).playtest === true,
      'wrangler /health with playtest:true',
    )
    await waitForHealth(VITE_HEALTH_URL, () => true, 'vite /player.html')
  } catch (err) {
    await shutdownProcess(wrangler)
    await shutdownProcess(vite)
    throw err
  }

  // eslint-disable-next-line no-console
  console.log('[selftest] launching chromium (headless)…')
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch({ headless: true })

  const live: LiveCtx = {
    browser,
    playerBaseUrl: `http://localhost:${VITE_PORT}/player.html`,
    wranglerBaseUrl: `http://127.0.0.1:${WRANGLER_PORT}`,
    wsBaseUrl: `ws://127.0.0.1:${WRANGLER_PORT}`,
    token,
    roomCode: 'SELFT1',
    goodOrigin: `http://127.0.0.1:${WRANGLER_PORT}`,
  }

  const teardown = async (): Promise<void> => {
    try {
      await browser.close()
    } catch {
      /* ignore */
    }
    await shutdownProcess(vite)
    await shutdownProcess(wrangler)
    // Small grace to let sockets fully close.
    await delay(500)
  }

  return { live, teardown }
}

async function shutdownProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) return
  try {
    child.kill('SIGTERM')
  } catch {
    /* noop */
  }
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => child.once('exit', () => resolve(true))),
    delay(3000).then(() => false),
  ])
  if (!exited) {
    try {
      child.kill('SIGKILL')
    } catch {
      /* noop */
    }
  }
}

async function maybeRunSingle(
  only: number,
  live: LiveCtx | null,
): Promise<CheckResult> {
  switch (only) {
    case 1:
      if (!live) throw new Error('--only 1 requires live servers')
      return checkCookieIsolation(live)
    case 2:
      if (!live) throw new Error('--only 2 requires live servers')
      return checkLocalStorageIsolation(live)
    case 3:
      if (!live) throw new Error('--only 3 requires live servers')
      return checkWsFrameIsolation(live)
    case 4:
      if (!live) throw new Error('--only 4 requires live servers')
      return checkGodNonDeliveryToPlayers(live)
    case 5:
      return checkAgentAllowlistDefinition()
    case 6:
      if (!live) throw new Error('--only 6 requires live servers')
      return checkGodCloseCodesDistinct(live)
    case 7:
      return checkScrubberInvokedFailClosed()
    case 8:
      return checkRetentionBoundary()
    default:
      throw new Error(`--only expects 1-8, got ${only}`)
  }
}

export async function main(argv: readonly string[]): Promise<number> {
  let parsed: ParsedArgs
  try {
    parsed = parseSelftestArgs(argv)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err))
    // eslint-disable-next-line no-console
    console.error(USAGE)
    return 2
  }

  if (parsed.help) {
    // eslint-disable-next-line no-console
    console.log(USAGE)
    return 0
  }

  const startedAt = Date.now()

  // ---- --only N mode -----------------------------------------------------
  if (parsed.only !== null) {
    const needsLive = [1, 2, 3, 4, 6].includes(parsed.only)
    let teardownFn: (() => Promise<void>) | null = null
    let live: LiveCtx | null = null
    if (needsLive) {
      const boot = await bootLiveCtx()
      live = boot.live
      teardownFn = boot.teardown
    }
    let result: CheckResult
    try {
      result = await maybeRunSingle(parsed.only, live)
    } finally {
      if (teardownFn) await teardownFn()
    }
    printTable([result])
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
    // eslint-disable-next-line no-console
    console.log(`[selftest] --only ${parsed.only} done in ${elapsed}s`)
    // --only never writes stamp.
    return result.pass ? 0 : 1
  }

  // ---- Full run ---------------------------------------------------------
  const allResults: CheckResult[] = []

  if (parsed.skipLive) {
    // eslint-disable-next-line no-console
    console.warn(
      '[selftest] ⚠️  --skip-live mode: skipping checks 1-4 + 6 (cookie, localStorage, WS frame, god non-delivery, close codes)',
    )
  } else {
    let boot: Awaited<ReturnType<typeof bootLiveCtx>>
    try {
      boot = await bootLiveCtx()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[selftest] live-server boot failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return 1
    }
    try {
      const liveResults = await runLiveChecks(boot.live)
      allResults.push(...liveResults)
    } finally {
      await boot.teardown()
    }
  }

  const pureResults = await runPureChecks()
  allResults.push(...pureResults)

  printTable(allResults)
  const allPass = allResults.every((r) => r.pass)
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  // eslint-disable-next-line no-console
  console.log(
    `[selftest] ${allPass ? 'ALL PASS' : 'FAIL'} — ${allResults.filter((r) => r.pass).length}/${allResults.length} checks in ${elapsed}s`,
  )

  if (allPass) {
    const stamp: StampFile = {
      ts: new Date().toISOString(),
    }
    if (parsed.skipLive) {
      ;(stamp as { liveSkipped: boolean } & StampFile).liveSkipped = true
    }
    await writeStamp(stamp)
    // eslint-disable-next-line no-console
    console.log(`[selftest] wrote ${STAMP_PATH}`)
    return 0
  }
  return 1
}

// ESM-safe main-module check.
const isMain = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`
if (isMain || process.argv[1]?.endsWith('selftest.ts')) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[selftest] unexpected failure:', err)
      process.exit(1)
    })
}
