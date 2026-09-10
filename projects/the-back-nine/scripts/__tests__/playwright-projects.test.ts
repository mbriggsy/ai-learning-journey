import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/*
 * scripts/__tests__/playwright-projects.test.ts — the WebKit project's NON-VACUITY pin.
 *
 * `playwright.config.ts` adds a second browser project scoped by `grep: /@cross-browser/`, and
 * `e2e/vault.spec.ts` carries that tag on the two arms meant to run cross-browser. Nothing else
 * ties those two halves together, and the failure is SILENT: Playwright applies a project's grep
 * with `filterTestsRemoveEmptySuites`, and its "no tests found" throw is guarded on the WHOLE root
 * suite — Chromium keeps the root non-empty, so a renamed/dropped tag leaves the webkit project
 * collecting ZERO tests while `pnpm verify:csp` stays green and the docs go on claiming a
 * cross-browser proof. e2e/ is outside tsconfig's `include`, so `tsc --noEmit` cannot catch the
 * drift either.
 *
 * Sibling of csp-headers.test.ts and pwa-icons.test.ts: same shape (read the REAL bytes of the
 * shipped config, pin the halves against each other, authored failure messages), same reason (a
 * load-bearing file that may not drift silently). The last arm goes one better and asks Playwright
 * ITSELF what the project collects — a textual pin proves the tag strings agree, only the collector
 * proves the tag actually selects tests.
 */

const ROOT = process.cwd()
const CONFIG_PATH = join(ROOT, 'playwright.config.ts')
const SPEC_PATH = join(ROOT, 'e2e', 'vault.spec.ts')

const config = readFileSync(CONFIG_PATH, 'utf-8')
const spec = readFileSync(SPEC_PATH, 'utf-8')

/** The webkit project's `grep` literal, read out of the shipped config (never re-typed here — that
 *  would just move the hand copy). Deliberately anchored on `name: 'webkit'` so a project renamed
 *  or stripped of its grep reds rather than silently widening to the whole directory. */
function webkitGrepSource(): string {
  const line = config.split('\n').find((l) => /name:\s*'webkit'/.test(l))
  if (line === undefined) throw new Error('[playwright projects] no `name: \'webkit\'` project in playwright.config.ts')
  const grep = /grep:\s*\/([^/\n]+)\//.exec(line)
  if (grep === null) {
    throw new Error(
      `[playwright projects] the webkit project carries NO \`grep:\` — it would collect the WHOLE e2e directory, ` +
        `including the Chromium-tuned arms the config's comment holds back. Line: ${line.trim()}`,
    )
  }
  return grep[1]!
}

/** Every `test(` call in a spec, sliced from the call to the start of its callback — i.e. the title
 *  plus the options argument, which is the only place a Playwright tag can live. Slicing (rather
 *  than a bare file-wide substring count) is what keeps a `@cross-browser` mention in a docblock or
 *  a comment from inflating the count into a false green. */
function testSignatures(source: string): string[] {
  const out: string[] = []
  const call = /\btest\(/g
  let m: RegExpExecArray | null
  while ((m = call.exec(source)) !== null) {
    const rest = source.slice(m.index + m[0].length)
    const body = rest.search(/async\s*\(/)
    out.push(body === -1 ? rest : rest.slice(0, body))
  }
  return out
}

describe('playwright.config.ts — the WebKit project actually collects the tagged arms', () => {
  it('the webkit project exists and is scoped by a grep', () => {
    expect(config).toContain("name: 'webkit'")
    expect(webkitGrepSource().length).toBeGreaterThan(0)
  })

  it("e2e/vault.spec.ts carries the config's grep tag on at least two test() calls", () => {
    const tag = webkitGrepSource()
    const tagged = testSignatures(spec).filter((s) => s.includes(`tag: '${tag}'`))
    expect(
      tagged.length,
      `e2e/vault.spec.ts carries \`tag: '${tag}'\` on ${tagged.length} test() call(s). playwright.config.ts's ` +
        `webkit project greps for it, and Playwright does NOT error on a project that collects zero tests — ` +
        `so a renamed or dropped tag silently turns the cross-browser gate into nothing.`,
    ).toBeGreaterThanOrEqual(2)
  })

  it("vault.spec.ts is not in the config's testIgnore denylist", () => {
    // The tag can be right and the grep can be right while the spec is denied collection entirely —
    // the same zero-test green by another route.
    const denylist = /testIgnore:\s*\[([^\]]*)\]/s.exec(config)?.[1] ?? ''
    expect(denylist).not.toContain('vault.spec.ts')
  })

  it('Playwright itself lists at least two tests for --project=webkit', () => {
    // The one arm that is not a textual proxy: run the real collector. `--list` compiles the specs
    // and applies each project's grep WITHOUT launching a browser or the webServer (~0.7 s), so it
    // needs no `playwright install` and can sit in the unit suite. `--reporter=list` overrides the
    // config's CI reporter so the output shape is the same locally and on the runner.
    const cli = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js')
    expect(existsSync(cli), `@playwright/test CLI not found at ${cli} — the verify:csp gate cannot run either`).toBe(true)
    const listed = spawnSync(process.execPath, [cli, 'test', '--list', '--project=webkit', '--reporter=list'], {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 120_000,
    })
    const output = `${listed.stdout ?? ''}${listed.stderr ?? ''}`
    expect(listed.status, `playwright --list exited ${listed.status}:\n${output}`).toBe(0)
    const collected = output.split('\n').filter((l) => l.includes('[webkit] ›'))
    expect(
      collected.length,
      `--project=webkit collected ${collected.length} test(s). Playwright treats an empty PROJECT as ` +
        `success (only an empty ROOT suite throws), so this is the arm that catches it:\n${output}`,
    ).toBeGreaterThanOrEqual(2)
  })
})
