import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

/*
 * scripts/__tests__/playwright-harness-partition.test.ts — every Playwright spec is claimed by
 * EXACTLY ONE harness, and nothing under `e2e/held/` is claimed by a CI gate.
 *
 * Four harnesses share `testDir: './e2e'` and split the directory by hand: `playwright.config.ts`
 * (the CSP gate) collects by a `testIgnore` DENYLIST — anything not named is collected — while
 * the fit / fit-rv / caddie configs collect by `testMatch` allowlists, and `e2e/held/shots.config.ts`
 * owns the instruments beside it. Nothing enforced that split before 2026-09-11. The failure it
 * lets through is not hypothetical: `c61dea7e` added `e2e/held/council-24px-shots.spec.ts` with a
 * docblock saying it "can never red CI" (it was outside `verify:fit`'s allowlist, and vitest's
 * `exclude: ['e2e/**']` — a denylist entry, not an include — kept vitest off it) — but the CSP
 * harness's denylist did not name `held/`, so `pnpm verify:csp` collected the six instrument arms
 * against `dist/`, where the `?seed=` routes do not exist, and CI ran red for three commits
 * (runs 34548167354 / 34548391962 / 34548619915) while every LOCAL gate the session ran was
 * green — `verify:csp` was not among them. e2e/ is outside tsconfig's `include`, so `tsc --noEmit`
 * saw nothing either.
 *
 * Sibling of playwright-projects.test.ts (same shape: a fast textual pin, then the REAL collector —
 * `playwright test --list` compiles the specs and applies each config's match rules without a
 * browser or a webServer, so it can sit in the unit suite). The harness ROLES are read from the CI
 * workflow, never typed here: a script the workflow runs is a CI gate, any other config is
 * on-demand — and the resolver FAILS LOUD on any step or script spelling it does not understand,
 * rather than falling through to a default and shrinking the gate set in silence. Non-goal, stated:
 * this proves the PARTITION (one owner per spec), not that every owner is a gate —
 * `caddie-walk.spec.ts` is owned by the on-demand walk by design — and a spec wired to NO harness
 * still lands in the CSP denylist collector and fails loudly there in CI (that is the denylist
 * doing its job); what the partition catches is the double claim and the held-in-a-gate case.
 */

const ROOT = process.cwd()
const E2E = join(ROOT, 'e2e')
const CSP_CONFIG = join(ROOT, 'playwright.config.ts')
const CLI = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js')
/** Playwright's default config file when `playwright test` is run bare (the CLI resolves
 *  `playwright.config.{ts,js,mts,mjs,cts,cjs}` from the cwd; this repo carries the `.ts` one). */
const DEFAULT_CONFIG = 'playwright.config.ts'
/** The monorepo-root workflow that runs this project's gates (the roles' single source). */
const WORKFLOW = resolve(ROOT, '..', '..', '.github', 'workflows', 'verify-the-back-nine.yml')

const toPosix = (p: string): string => p.replace(/\\/g, '/')

/** Every `*.spec.ts` under e2e/, as a POSIX path relative to the project root. */
function specFiles(dir = E2E): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...specFiles(p))
    else if (name.endsWith('.spec.ts')) out.push(toPosix(relative(ROOT, p)))
  }
  return out.sort()
}

/** Every Playwright config: the root `playwright*.config.ts` files plus any `*.config.ts` under e2e/. */
function configFiles(): string[] {
  const root = readdirSync(ROOT).filter((n) => /^playwright.*\.config\.ts$/.test(n))
  const nested: string[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.config.ts')) nested.push(toPosix(relative(ROOT, p)))
    }
  }
  walk(E2E)
  return [...root, ...nested].sort()
}

/** The configs the CI workflow actually runs: each `run: pnpm <script>` step (compact `- run:` or a
 *  named step's own `run:` line, with or without a trailing YAML comment) whose package.json command
 *  is a `playwright test` invocation, resolved to its config. A script that carries a config flag in a
 *  spelling this resolver cannot read, or a `run: |` block scalar in the workflow, THROWS — the gate
 *  set must never shrink silently, because the held rule below is only as strong as this set. */
function ciGateConfigs(): string[] {
  const scripts = (
    JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as { scripts: Record<string, string> }
  ).scripts
  const yml = readFileSync(WORKFLOW, 'utf-8')
  const blockScalar = /^\s*(?:-\s*)?run:\s*[|>]/m.exec(yml)
  if (blockScalar !== null) {
    throw new Error(
      `[harness partition] ${WORKFLOW} carries a block-scalar run step (${blockScalar[0].trim()}) — extend ` +
        `ciGateConfigs() to read it before trusting the gate set`,
    )
  }
  const ran = [...yml.matchAll(/^\s*(?:-\s*)?run:\s*pnpm\s+([\w:.-]+)\s*(?:#.*)?$/gm)].map((m) => m[1]!)
  const gates = new Set<string>()
  for (const name of ran) {
    const cmd = scripts[name]
    if (cmd === undefined || !/^playwright test\b/.test(cmd)) continue
    const flagged = /(?:^|\s)(?:--config|-c)(?=\s|=|$)/.test(cmd)
    const cfg = /(?:^|\s)(?:--config|-c)(?:\s+|=)(\S+)/.exec(cmd)?.[1]
    if (flagged && cfg === undefined) {
      throw new Error(`[harness partition] package.json script "${name}" carries a config flag this resolver cannot read: ${cmd}`)
    }
    gates.add(toPosix(cfg ?? DEFAULT_CONFIG))
  }
  return [...gates].sort()
}

/** What Playwright ITSELF collects for one config: spec file (root-relative POSIX) → project names.
 *  The report is parsed BEFORE the exit status is judged: on zero collection Playwright exits 1 but
 *  still prints a full JSON report, and that empty report must reach the authored assertion below
 *  rather than surfacing as a raw CLI dump. */
function collect(config: string): Map<string, Set<string>> {
  const run = spawnSync(process.execPath, [CLI, 'test', '--list', '--config', config, '--reporter=json'], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  })
  type Suite = { file: string; suites?: Suite[]; specs?: { tests?: { projectName: string }[] }[] }
  type Report = { config: { configFile: string; rootDir: string }; suites: Suite[] }
  let report: Report
  try {
    if (run.error !== undefined) throw run.error
    report = JSON.parse(run.stdout) as Report
  } catch (e) {
    throw new Error(
      `[harness partition] playwright --list --config ${config} produced no readable report (exit ${run.status}, ` +
        `${(e as Error).message}):\n${run.stdout}\n${run.stderr}`,
      { cause: e },
    )
  }
  const loaded = toPosix(relative(ROOT, report.config.configFile))
  if (loaded !== config) {
    throw new Error(`[harness partition] asked Playwright for ${config} but the report came from ${loaded}`)
  }
  const claimed = new Map<string, Set<string>>()
  const walk = (s: Suite): void => {
    const file = toPosix(relative(ROOT, resolve(report.config.rootDir, s.file)))
    for (const spec of s.specs ?? []) {
      for (const t of spec.tests ?? []) {
        if (!claimed.has(file)) claimed.set(file, new Set())
        claimed.get(file)!.add(t.projectName)
      }
    }
    for (const child of s.suites ?? []) walk(child)
  }
  report.suites.forEach(walk)
  return claimed
}

describe('the Playwright harnesses partition e2e/ — one owner per spec, no instrument in a CI gate', () => {
  it("playwright.config.ts's testIgnore denylist names the held directory", () => {
    // The fast textual pin. The CSP harness is the ONE denylist collector, so it — and only it —
    // silently adopts any spec dropped under e2e/ that no allowlist names; the held instruments are
    // exactly such specs, and they drive dev-only `?seed=` routes the dist harness cannot serve.
    const config = readFileSync(CSP_CONFIG, 'utf-8')
    const denylist = /testIgnore:\s*\[([^\]]*)\]/s.exec(config)?.[1]
    expect(denylist, 'playwright.config.ts carries no `testIgnore: [...]` denylist').toBeDefined()
    const live = denylist!
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, '')) // a commented-out entry is not an entry
      .join('\n')
    expect(
      live,
      "playwright.config.ts's testIgnore does not name `held/` — `pnpm verify:csp` will collect every " +
        'instrument under e2e/held/ against dist/, where the `?seed=` routes do not exist (CI runs ' +
        '34548167354 / 34548391962 / 34548619915 went red exactly this way).',
    ).toMatch(/['"]\*\*\/held\/\*\*['"]/)
  })

  it('the CI workflow resolves to a gate set that names the CSP gate and only configs this test collects', () => {
    // Non-vacuity of the role derivation: if the yml regex or the script map drifts, the partition
    // arm below would classify EVERY config as on-demand and the held rule would pass for nothing —
    // and a gate resolved to a path the collector never runs is the same hole by another route.
    expect(existsSync(WORKFLOW), `CI workflow not found at ${WORKFLOW}`).toBe(true)
    const gates = ciGateConfigs()
    expect(gates, `no CI gate resolved from ${WORKFLOW} + package.json scripts`).toContain(DEFAULT_CONFIG)
    const known = new Set(configFiles())
    const unknown = gates.filter((g) => !known.has(g))
    expect(
      unknown,
      `CI gate(s) resolved to a config this test never collects — the held rule would pass for nothing: ${unknown.join(', ')}`,
    ).toEqual([])
  })

  it(
    'Playwright itself claims every spec under e2e/ exactly once, and no held spec in a CI gate',
    () => {
      expect(existsSync(CLI), `@playwright/test CLI not found at ${CLI}`).toBe(true)
      const specs = specFiles()
      const configs = configFiles()
      const gates = new Set(ciGateConfigs())
      expect(specs.length, 'no *.spec.ts under e2e/').toBeGreaterThan(0)
      expect(configs.length, 'no Playwright config found').toBeGreaterThan(0)

      const owners = new Map<string, string[]>(specs.map((s) => [s, []]))
      const unexpected: string[] = []
      for (const config of configs) {
        const claimed = collect(config)
        expect(
          claimed.size,
          `${config} collects ZERO specs — a harness that runs nothing is not a gate`,
        ).toBeGreaterThan(0)
        for (const file of claimed.keys()) {
          const list = owners.get(file)
          if (list === undefined) unexpected.push(`${config} → ${file}`)
          else list.push(config)
        }
      }
      expect(unexpected, 'a config collected a spec the walk of e2e/ never found').toEqual([])

      const table = specs.map((s) => `  ${s} ← ${owners.get(s)!.join(', ') || '(nobody)'}`).join('\n')
      // The incident's own law is asserted FIRST, so a held spec inside a gate reds under this name
      // even when it is also (as today) claimed by the held harness and would trip "shared" below.
      const heldInGate = specs.filter(
        (s) => s.startsWith('e2e/held/') && owners.get(s)!.some((c) => gates.has(c)),
      )
      expect(
        heldInGate,
        `instrument(s) under e2e/held/ collected by a CI gate (${[...gates].join(', ')}) — held means ` +
          `NEVER a gate:\n${table}`,
      ).toEqual([])
      const orphans = specs.filter((s) => owners.get(s)!.length === 0)
      expect(
        orphans,
        `spec(s) collected by NO harness — a gate wired into no harness is not a gate:\n${table}`,
      ).toEqual([])
      const shared = specs.filter((s) => owners.get(s)!.length > 1)
      expect(
        shared,
        `spec(s) collected by MORE than one harness — a dev-server spec on the dist harness fails ` +
          `confusingly (no seeds), a dist spec on the dev harness measures uncommitted state:\n${table}`,
      ).toEqual([])
    },
    180_000,
  )
})
