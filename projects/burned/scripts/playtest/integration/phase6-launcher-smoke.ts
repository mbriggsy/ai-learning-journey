#!/usr/bin/env tsx
/**
 * Phase 6 Unit 2.5 launcher-driver smoke.
 *
 * Proves the audit-then-triage chain wired through the orchestrator works
 * end-to-end with the real `createAgentLauncherDriver` as `seatDriver` and
 * `skipBrowserLaunch: true`, WITHOUT spawning real Chromium / wrangler /
 * Claude subagents. Mocks (a) servers, (b) god subscriber, (c) selftest
 * stamp; lets isolation-audit + triage run for real against the empty seat
 * dirs (both gracefully no-op).
 *
 *   1. Build a temp run-root with the calibration catalog as `catalogPath`.
 *   2. Construct deps: mock startServers/stopServers/connectGod/mintToken/
 *      mintSalt/applyRetention; real `seatDriver = createAgentLauncherDriver`;
 *      real `runIsolationAudit`; real `runPostSessionTriage = runTriagePipeline`.
 *   3. Concurrently watch for `<runDir>/agent-specs.manifest.json`; once it
 *      appears (driver emitted specs), write `<runDir>/agents-done.marker`
 *      to release the driver. Simulates a Claude Code conversation finishing
 *      its dispatched subagents.
 *   4. After `runSession` returns:
 *        - outcome = 'success'
 *        - manifest contains N entries, each with subagentType = `playtest-seat-N`
 *        - per-seat spec JSON files exist with playerUrl + mcpNamespace populated
 *        - isolation-audit.md written, status PASS (empty seats dir)
 *        - session.md has end block (triage skipped='no-seeds' or 'isolation-breach',
 *          either is fine — the orchestrator wrote the end block in both cases)
 *
 * Exit 0 = PASS, 1 = FAIL.
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  createAgentLauncherDriver,
  loadDefaultTemplates,
  AGENTS_DONE_MARKER,
} from '../lib/agent-launcher'
import { runSession, type RunSessionDeps } from '../lib/orchestrator'
import { parseCatalog } from '../lib/scenario-detector'
import { runTriagePipeline } from '../lib/triage-pipeline'
import type { Config, GodEvent } from '../lib/types'
import type { GodHandle } from '../lib/god-subscriber'
import type { ServerHandles } from '../lib/server-controller'

const REPO_ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..', '..', '..')

const failures: string[] = []
function assert(cond: boolean, msg: string): void {
  if (cond) {
    // eslint-disable-next-line no-console
    console.log(`  [pass] ${msg}`)
  } else {
    failures.push(msg)
    // eslint-disable-next-line no-console
    console.log(`  [FAIL] ${msg}`)
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function waitFor<T>(
  probe: () => Promise<T | null>,
  timeoutMs: number,
  intervalMs = 25,
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const r = await probe()
    if (r !== null) return r
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return null
}

function makeFakeServerHandles(): ServerHandles {
  return {
    wranglerPid: -1,
    vitePid: -1,
    healthUrl: 'http://localhost:8787/health',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _wrangler: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _vite: {} as any,
    _stopped: false,
  }
}

function makeFakeGodHandle(): GodHandle {
  return {
    disconnect: async () => {
      // noop
    },
    // Never resolves — orchestrator's race lets the driver win.
    onFatalClose: new Promise(() => {
      // intentional empty executor
    }),
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('phase6-launcher-smoke: starting')

  const outputRoot = mkdtempSync(path.join(tmpdir(), 'phase6-launcher-smoke-'))
  // Stamp the selftest stamp file in the output dir so the gate passes.
  // Default reader looks at process cwd; we override with the deps below.

  const catalogPath = path.join(REPO_ROOT, 'scripts/playtest/fixtures/mini-catalog.md')
  assert(await fileExists(catalogPath), `calibration catalog exists at ${catalogPath}`)

  const { scriptedTemplate, freePlayTemplate } = await loadDefaultTemplates(REPO_ROOT)
  const catalogText = await readFile(catalogPath, 'utf8')
  const catalog = parseCatalog(catalogText)
  assert(catalog.length > 0, 'parsed at least one scenario from mini-catalog')

  const config: Config = {
    seats: 3,
    nopeWindowMs: 5000,
    sessionTimeoutMs: 10_000,
    roomCode: 'SMOKE',
    catalogPath,
    outputRoot,
    viewports: [{ width: 390, height: 844, label: '390x844' }],
    freePlayWallclockFraction: 0.2,
    sessionDirRetention: 10,
    scrubMode: 'on',
    godReassemblyTimeoutMs: 5000,
  }

  const deps: RunSessionDeps = {
    mintToken: () => 'a'.repeat(64),
    mintSalt: () => '0'.repeat(64),
    startServers: async () => makeFakeServerHandles(),
    stopServers: async () => {
      /* noop */
    },
    connectGod: async () => makeFakeGodHandle(),
    applyRetention: async () => ({
      kept: [],
      rotated: [],
      skipped: [],
    }),
    readSelftestStamp: async () => ({
      timestamp: new Date().toISOString(),
      ageMs: 0,
    }),
    seatDriver: createAgentLauncherDriver({
      catalog,
      modeSignal: 'scripted',
      sessionTimeoutMs: config.sessionTimeoutMs,
      scriptedTemplate,
      freePlayTemplate,
      pollIntervalMs: 25,
      // runDir derived from seats[0].logPath at call time.
    }),
    runPostSessionTriage: runTriagePipeline,
  }

  // Watch for the manifest. Once it appears, find its run dir and touch
  // the marker. This simulates a Claude Code conversation that read the
  // manifest, dispatched subagents, and reported they finished.
  const watcherDone = (async (): Promise<string | null> => {
    // The orchestrator creates a sessionId-named subdir under outputRoot;
    // we don't know the exact name in advance. Walk outputRoot until we
    // find an `agent-specs.manifest.json`.
    const found = await waitFor(async () => {
      const { readdir } = await import('node:fs/promises')
      try {
        const sessions = await readdir(outputRoot)
        for (const s of sessions) {
          const candidate = path.join(outputRoot, s, 'agent-specs.manifest.json')
          if (await fileExists(candidate)) return path.join(outputRoot, s)
        }
      } catch {
        // outputRoot not yet created
      }
      return null
    }, 10_000, 50)

    if (found === null) return null
    // Wait a beat so the driver's polling catches us.
    await new Promise((r) => setTimeout(r, 50))
    await writeFile(path.join(found, AGENTS_DONE_MARKER), 'smoke')
    return found
  })()

  const result = await runSession(config, deps, { skipSelftestGate: true, skipBrowserLaunch: true })

  assert(result.outcome === 'success', `runSession outcome = success (got ${result.outcome}, err=${result.errorMessage ?? '<none>'})`)

  const runDir = await watcherDone
  assert(runDir !== null, 'manifest emitted (watcher found run dir)')
  if (runDir === null) {
    // eslint-disable-next-line no-console
    console.log('phase6-launcher-smoke: FAIL (watcher never saw a manifest)')
    process.exit(1)
  }

  // ---- Manifest assertions
  const manifestRaw = await readFile(path.join(runDir, 'agent-specs.manifest.json'), 'utf8')
  const manifest = JSON.parse(manifestRaw) as {
    seats: { seatId: string; subagentType: string; mode: string }[]
    modeSignal: string
  }
  assert(manifest.seats.length === 3, `manifest has 3 seat entries (got ${manifest.seats.length})`)
  manifest.seats.forEach((m, i) => {
    assert(m.subagentType === `playtest-seat-${i + 1}`, `manifest[${i}].subagentType === playtest-seat-${i + 1}`)
  })

  // ---- Spec JSON assertions
  const spec1Raw = await readFile(path.join(runDir, 'agent-specs', 'seat-1.json'), 'utf8')
  const spec1 = JSON.parse(spec1Raw) as {
    subagentType: string
    playerUrl: string
    mcpNamespace: string
    prompt: string
  }
  assert(spec1.subagentType === 'playtest-seat-1', 'spec seat-1 subagentType')
  assert(spec1.mcpNamespace === 'playwright-seat-1', 'spec seat-1 mcpNamespace')
  assert(
    spec1.playerUrl.startsWith('http://localhost:5173/player.html?room=SMOKE&name='),
    `spec seat-1 playerUrl points at vite + room (got ${spec1.playerUrl})`,
  )
  assert(
    spec1.prompt.includes('mcp__playwright-seat-1__browser_navigate'),
    'spec seat-1 prompt references seat-1 MCP namespace',
  )
  assert(
    !spec1.prompt.includes('mcp__playwright-seat-2__'),
    'spec seat-1 prompt does NOT reference seat-2 namespace (per-seat isolation)',
  )

  // ---- Isolation audit assertions
  const auditPath = path.join(runDir, 'isolation-audit.md')
  assert(await fileExists(auditPath), 'isolation-audit.md written')
  const auditMd = await readFile(auditPath, 'utf8')
  assert(auditMd.length > 0, 'isolation-audit.md non-empty')

  // ---- Session.md end block assertion
  const sessionMdPath = path.join(runDir, 'session.md')
  assert(await fileExists(sessionMdPath), 'session.md exists')
  const sessionMd = await readFile(sessionMdPath, 'utf8')
  assert(sessionMd.includes('## Session Start'), 'session.md has Session Start block')
  assert(sessionMd.includes('## Session End'), 'session.md has Session End block')
  assert(/outcome:\s*success/i.test(sessionMd), 'session.md records outcome=success')

  // ---- Coverage.md assertions (Phase 6 — orchestrator wires real renderer)
  // Even with zero seats / zero fires, orchestrator must overwrite the
  // create-time empty file with renderCoverageMd output. verify-calibration
  // check 6 enforces these three markers; mirror them here so the smoke
  // catches a regression before the user runs the verifier.
  const coverageMdPath = path.join(runDir, 'coverage.md')
  assert(await fileExists(coverageMdPath), 'coverage.md exists')
  const coverageMd = await readFile(coverageMdPath, 'utf8')
  assert(coverageMd.length > 0, 'coverage.md non-empty (was overwritten by renderer)')
  assert(coverageMd.includes('# Coverage report'), 'coverage.md has header')
  assert(/Fired:\s*\d+\s*\/\s*target:\s*\d+/.test(coverageMd), 'coverage.md has fired/target banner')
  assert(coverageMd.includes('## 7×2 info-gap grid'), 'coverage.md has 7×2 grid heading')

  // eslint-disable-next-line no-console
  console.log('')
  // eslint-disable-next-line no-console
  console.log('========================================')
  if (failures.length === 0) {
    // eslint-disable-next-line no-console
    console.log('Phase 6 launcher smoke: PASS')
    // eslint-disable-next-line no-console
    console.log('========================================')
    process.exit(0)
  } else {
    // eslint-disable-next-line no-console
    console.log(`Phase 6 launcher smoke: FAIL (${failures.length} assertion(s))`)
    for (const f of failures) {
      // eslint-disable-next-line no-console
      console.log(`  - ${f}`)
    }
    // eslint-disable-next-line no-console
    console.log('========================================')
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('phase6-launcher-smoke: unexpected failure')
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
