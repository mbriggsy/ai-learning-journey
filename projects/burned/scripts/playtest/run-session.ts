#!/usr/bin/env tsx
/**
 * `pnpm playtest:run` entrypoint (Phase 3 Unit 6).
 *
 * Parses argv, layers overrides over `config/default-config.json`, calls
 * `runSession`. Exit code: 0 on outcome 'success', 1 otherwise.
 *
 * The full end-to-end smoke (Unit 8) will exercise this path against a real
 * wrangler + vite pair; Unit 6 tests use the `runSession` deps seam directly.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { runSession, type RunSessionDeps } from './lib/orchestrator'
import {
  createAgentLauncherDriver,
  loadDefaultTemplates,
} from './lib/agent-launcher'
import { runTriagePipeline } from './lib/triage-pipeline'
import { parseCatalog } from './lib/scenario-detector'
import type { Config, Viewport } from './lib/types'

const USAGE = `
Usage: pnpm playtest:run [options]

Drives a deterministic, Playwright-automated BURNED playtest session against
a local wrangler dev + vite dev pair. Writes a self-contained run directory
under docs/testing/playtest/runs/<session-id>/.

Options:
  --config <path>         Path to a JSON config (layered over default-config.json).
  --seats <N>             Number of seats (2..10).
  --seed <S>              RNG seed (integer; omit for CSPRNG-random server seed).
  --viewport <WxH>        Override viewport list to a single entry (e.g. 390x844).
  --no-scrub              Disable the card-ID scrubber. DANGEROUS — see README.
  --allow-trace           Opt in past the log-hygiene gate (trace env vars OK).
  --help, -h              Print this message.

See scripts/playtest/README.md for the operator contract, trust model,
retention policy, and --no-scrub warning.
`.trim()

interface CliFlags {
  configPath?: string
  seats?: number
  seed?: number
  viewport?: Viewport
  noScrub: boolean
  allowTrace: boolean
}

function parseViewport(raw: string): Viewport {
  const match = /^(\d+)x(\d+)$/.exec(raw)
  if (!match) {
    throw new Error(`--viewport ${JSON.stringify(raw)} must be WxH (e.g. 390x844)`)
  }
  const width = Number(match[1])
  const height = Number(match[2])
  return {
    width: width as Viewport['width'],
    height: height as Viewport['height'],
    label: `${width}x${height}`,
  }
}

function parseArgv(argv: readonly string[]): CliFlags {
  const flags: CliFlags = { noScrub: false, allowTrace: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--config':
        flags.configPath = argv[++i]
        break
      case '--seats': {
        const v = argv[++i]
        if (v === undefined) throw new Error('--seats requires a value')
        const n = Number(v)
        if (!Number.isInteger(n) || n < 2 || n > 10) {
          throw new Error(`--seats must be an integer in [2,10], got ${JSON.stringify(v)}`)
        }
        flags.seats = n
        break
      }
      case '--seed': {
        const v = argv[++i]
        if (v === undefined) throw new Error('--seed requires a value')
        const n = Number(v)
        if (!Number.isInteger(n)) {
          throw new Error(`--seed must be an integer, got ${JSON.stringify(v)}`)
        }
        flags.seed = n
        break
      }
      case '--viewport': {
        const v = argv[++i]
        if (v === undefined) throw new Error('--viewport requires a value')
        flags.viewport = parseViewport(v)
        break
      }
      case '--no-scrub':
        flags.noScrub = true
        break
      case '--allow-trace':
        flags.allowTrace = true
        break
      default:
        throw new Error(`unknown argument: ${JSON.stringify(arg)}`)
    }
  }
  return flags
}

// Mutable mirror of Config used during CLI merge. The final object is cast
// back to Config (which is deep-readonly by convention) before handing off
// to runSession.
type MutableConfig = {
  -readonly [K in keyof Config]?: Config[K] extends readonly (infer U)[]
    ? U[]
    : Config[K]
}

async function loadConfig(flags: CliFlags): Promise<Config> {
  const here = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
  const defaultPath = path.join(here, 'config', 'default-config.json')
  const baseRaw = await fs.readFile(defaultPath, 'utf8')
  const base = JSON.parse(baseRaw) as MutableConfig

  let overlay: MutableConfig = {}
  if (flags.configPath !== undefined) {
    const overlayRaw = await fs.readFile(flags.configPath, 'utf8')
    overlay = JSON.parse(overlayRaw) as MutableConfig
  }

  const merged: MutableConfig = { ...base, ...overlay }

  if (flags.seats !== undefined) merged.seats = flags.seats
  if (flags.seed !== undefined) merged.seed = flags.seed
  if (flags.viewport !== undefined) merged.viewports = [flags.viewport]
  if (flags.noScrub) merged.scrubMode = 'off'

  return {
    seats: merged.seats ?? 4,
    seatNames: merged.seatNames,
    seed: merged.seed,
    nopeWindowMs: merged.nopeWindowMs ?? 5000,
    sessionTimeoutMs: merged.sessionTimeoutMs ?? 3_600_000,
    roomCode: merged.roomCode,
    catalogPath: merged.catalogPath ?? 'docs/testing/playtest/SCENARIOS.md',
    outputRoot: merged.outputRoot ?? 'docs/testing/playtest/runs',
    viewports: merged.viewports ?? [
      { width: 360, height: 640, label: '360x640' },
      { width: 390, height: 844, label: '390x844' },
      { width: 768, height: 1024, label: '768x1024' },
    ],
    freePlayWallclockFraction: merged.freePlayWallclockFraction ?? 0.2,
    sessionDirRetention: merged.sessionDirRetention ?? 10,
    scrubMode: merged.scrubMode ?? 'on',
    godReassemblyTimeoutMs: merged.godReassemblyTimeoutMs ?? 5000,
    godOriginAllowlist: merged.godOriginAllowlist,
  }
}

async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    // eslint-disable-next-line no-console
    console.log(USAGE)
    return
  }

  const flags = parseArgv(argv)
  const config = await loadConfig(flags)

  if (flags.noScrub) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING --no-scrub — events.jsonl will contain raw card IDs. Do not share the run dir.',
    )
  }

  // Phase 6 Unit 2.5 / Option A defaults: launcher-driver + triage hook
  // wired with skipBrowserLaunch=true. Each seat owns its own MCP-Playwright
  // browser via the `playwright-seat-N` MCP servers in `.mcp.json`; the
  // orchestrator no longer launches its own Chromium.
  //
  // The Claude Code conversation that invokes this CLI is responsible for
  // reading `<runDir>/agent-specs.manifest.json`, dispatching one
  // `Agent({ subagent_type: 'playtest-seat-N', ... })` per entry, then
  // touching `<runDir>/agents-done.marker` when all seats exit. This script
  // emits the manifest and waits for the marker.
  const repoRoot = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..', '..')
  const { scriptedTemplate, freePlayTemplate } = await loadDefaultTemplates(repoRoot)
  const catalogText = await fs.readFile(path.resolve(repoRoot, config.catalogPath), 'utf8')
  const catalog = parseCatalog(catalogText)

  const deps: RunSessionDeps = {
    seatDriver: createAgentLauncherDriver({
      catalog,
      modeSignal: 'scripted',
      sessionTimeoutMs: config.sessionTimeoutMs,
      scriptedTemplate,
      freePlayTemplate,
      // runDir derived from seats[0].logPath at call time — orchestrator
      // computes the run dir AFTER constructing this driver.
    }),
    runPostSessionTriage: runTriagePipeline,
  }

  const result = await runSession(config, deps, {
    allowTrace: flags.allowTrace,
    skipBrowserLaunch: true,
  })
  // eslint-disable-next-line no-console
  console.log(
    `[orchestrator] outcome=${result.outcome} sessionId=${result.sessionId} seatsJoined=${result.seatsJoined}`,
  )
  if (result.outcome !== 'success') {
    process.exit(1)
  }
}

main(process.argv.slice(2)).catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
