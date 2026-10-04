import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/*
 * scripts/__tests__/ci-gate-completeness.test.ts — every gate script in package.json is RUN by the
 * CI workflow, and every `pnpm <x>` step the workflow runs names a script that exists.
 *
 * A verify script CI never runs is not a gate. This has already happened: `verify:doc-stats` was
 * local-only until `c68afc5e` (2026-07-26), and in that window a commit that added two test arms
 * without touching README/roadmap went GREEN through this workflow (the yml's own comment above
 * its step). Nothing tied the package.json script list to the workflow's step list. The reverse
 * drift is just as silent: a renamed script leaves a `pnpm <old-name>` step that CI reds on, and
 * this catches it before CI does. (The 2026-09-29 method review named this gap; hve-core carries
 * such a check.)
 *
 * The workflow is read the way playwright-harness-partition.test.ts reads it (its sibling: the
 * same monorepo-root path, a textual read of the `run:` steps, and a throw on any spelling the
 * resolver cannot read). Two rules keep this test from passing for nothing:
 *   - EVERY script is a gate unless NON_GATE_SCRIPTS names it with a reason. A new script nobody
 *     classified therefore reds here until it is wired into CI or exempted — never green by default.
 *   - A step is credited only when it runs the script EXACTLY: no arguments (a `-- --shard` or a
 *     `&& …` can narrow the gate), no `if:` or `continue-on-error:` in any quoting (`"if": false`
 *     is the same skip; a skipped or soft-failing step is not a pass), no job- or workflow-level
 *     condition, and no working directory other than this project (in any key quoting). A `run: |` block, a run step
 *     outside any `steps:` list, any OTHER quoted key inside a step (a `"run":` would hide the
 *     step from this walk), a non-pnpm command, or a pnpm flag before the script name THROWS:
 *     the credited set must never grow through a spelling this file does not understand.
 * And the gates must actually be triggered: a workflow cut to `workflow_dispatch`, or one whose
 * `paths` filter lost this project, runs no gate on a push or a PR while every step arm stays
 * green. So the `on:` block is read too (push to main + pull_request, each path-filtered to this
 * project), and a trigger shape it cannot read (a flow `on:`, `tags:`, `types:`, a `-ignore`
 * filter, a negated path) THROWS for the same reason.
 */

const ROOT = process.cwd()
/** The monorepo-root workflow that runs this project's gates (the same resolution as the partition test). */
const WORKFLOW = resolve(ROOT, '..', '..', '.github', 'workflows', 'verify-the-back-nine.yml')
const PROJECT_DIR = 'projects/the-back-nine'

/** package.json scripts that are deliberately NOT CI gates. Each carries its reason. Keep this short:
 *  any script NOT named here must be run by the workflow. */
const NON_GATE_SCRIPTS: Readonly<Record<string, string>> = {
  dev: 'the Vite dev server: a long-running local process, not a check',
  'dev:phone': 'the LAN-phone dev server over self-signed HTTPS: local and long-running, not a check',
  preview: 'serves dist/ for a human look. It asserts nothing and does not apply vercel.json\'s CSP (verify:csp does)',
  'test:watch': 'vitest in watch mode: the same suite `test` runs once, and it never exits',
  'doc:reanchor': 'a tool that REWRITES doc citations from a git diff: a mutation, not a check (verify:doc-stats arm 4 is the gate)',
  'caddie:walk': 'the Caddie capture harness: writes bundles for the reader panel; its expects guard the walk, not a product law (on-demand, driven by the caddie skill)',
}

/** The gate family by name. A script matching this can never be exempted. */
const GATE_FAMILY = /^(?:build|typecheck|test|lint|verify:.+)$/

/** pnpm's own subcommands the workflow may run. They name no package script, so they credit none. */
const PNPM_BUILTINS: Readonly<Record<string, string>> = {
  install: 'installs the frozen lockfile: setup, not a gate',
  exec: 'runs a dependency binary (the Playwright browser install): never a package script',
}

interface RunStep {
  job: string
  line: number
  command: string
  /** The first `if:` / `continue-on-error:` key on the step, or null. */
  guard: string | null
}

const indentOf = (l: string): number => l.length - l.trimStart().length
const isNeutral = (l: string): boolean => l.trim() === '' || l.trimStart().startsWith('#')
const stripComment = (v: string): string => v.replace(/\s+#.*$/, '').trim()
const unquote = (v: string): string => v.trim().replace(/^(["'])(.*)\1$/, (_m, _q: string, inner: string) => inner)

/** A step's skip / soft-fail key, in ANY quoting: `if:`, `"if":`, `'continue-on-error' :`. */
const GUARD_KEY = /^\s*(?:-\s*)?["']?(if|continue-on-error)["']?\s*:/
/** The working-directory key, in ANY quoting: a quoted `"working-directory":` under `defaults.run`
 *  sits outside every step, so the quoted-key throw below never sees it. Its value is unquoted too. */
const WORKING_DIR_KEY = /^\s*(?:-\s*)?["']?working-directory["']?\s*:\s*(.*)$/
/** Any quoted mapping key. Inside a step, every one but a guard key is a spelling this file does not read. */
const QUOTED_KEY = /^\s*(?:-\s*)?["'][^"']+["']\s*:/

/** Every `run:` STEP in the workflow, attributed to its job, with its guard. Throws on any shape it
 *  cannot read (see the docblock). Pure: the mutant arms below feed it edited text. */
function readRunSteps(yml: string): RunStep[] {
  const block = /^\s*(?:-\s*)?run:\s*[|>]/m.exec(yml)
  if (block !== null) {
    throw new Error(`[ci gates] the workflow carries a block-scalar run step (${block[0].trim()}); extend readRunSteps() to read it`)
  }
  const lines = yml.split(/\r?\n/)
  const jobsAt = lines.findIndex((l) => /^jobs:\s*(?:#.*)?$/.test(l))
  if (jobsAt < 0) throw new Error('[ci gates] the workflow has no top-level `jobs:` key')

  // Lines that live inside a step, mapped to that step's id; every other line is job/workflow level.
  const stepOf = new Map<number, number>()
  const stepJob: string[] = []
  const stepStart: number[] = []
  let jobIndent = -1
  let job = ''
  for (let i = jobsAt + 1; i < lines.length; i++) {
    const l = lines[i]!
    if (isNeutral(l)) continue
    const ind = indentOf(l)
    if (ind === 0) break // the next top-level key ends `jobs:`
    if (jobIndent < 0) jobIndent = ind
    if (ind === jobIndent) {
      const key = /^\s*([\w.-]+):\s*(?:#.*)?$/.exec(l)
      if (key === null) throw new Error(`[ci gates] line ${i + 1} sits at the job-key indent but is not a job key: ${l.trim()}`)
      job = key[1]!
      continue
    }
    if (!/^\s*steps:\s*(?:#.*)?$/.test(l)) continue
    // A steps list: every item starts `- ` at one indent; it ends at the first line indented less.
    const stepsIndent = ind
    let itemIndent = -1
    let current = -1
    for (i = i + 1; i < lines.length; i++) {
      const s = lines[i]!
      if (isNeutral(s)) continue
      const si = indentOf(s)
      if (itemIndent < 0) {
        if (si < stepsIndent || !s.trimStart().startsWith('- ')) throw new Error(`[ci gates] the \`steps:\` list above line ${i + 1} does not start with a \`- \` item`)
        itemIndent = si
      }
      if (si < itemIndent) { i--; break }
      if (si === itemIndent) {
        if (!s.trimStart().startsWith('- ')) { i--; break }
        current = stepJob.length
        stepJob.push(job)
        stepStart.push(i)
      }
      stepOf.set(i, current)
    }
  }

  const steps = new Map<number, RunStep>()
  const guards = new Map<number, string>()
  let prev = ''
  lines.forEach((l, i) => {
    if (isNeutral(l)) return
    const wd = WORKING_DIR_KEY.exec(l)
    if (wd !== null && unquote(stripComment(wd[1]!)) !== PROJECT_DIR) {
      throw new Error(`[ci gates] line ${i + 1} sets working-directory to "${stripComment(wd[1]!)}", not ${PROJECT_DIR}`)
    }
    const step = stepOf.get(i)
    const guard = GUARD_KEY.exec(l)
    if (guard !== null) {
      if (step === undefined) {
        throw new Error(`[ci gates] line ${i + 1} puts a job- or workflow-level \`${guard[1]}:\` on the gates (${l.trim()}); a skipped job is not a pass`)
      }
      if (!guards.has(step)) guards.set(step, `${guard[1]}: ${stripComment(l.slice(l.indexOf(':') + 1))}`)
    } else if (step !== undefined && QUOTED_KEY.test(l)) {
      throw new Error(`[ci gates] line ${i + 1} has a quoted key inside a step (${l.trim()}); extend readRunSteps() to read it`)
    }
    const run = /^\s*(?:-\s*)?run:\s*(.*)$/.exec(l)
    if (run !== null) {
      const value = stripComment(run[1]!)
      if (value === '') {
        if (prev.trim() !== 'defaults:') throw new Error(`[ci gates] line ${i + 1} has an empty \`run:\` that is not a \`defaults:\` mapping`)
      } else if (step === undefined) {
        throw new Error(`[ci gates] line ${i + 1} has a \`run:\` outside any steps list: ${l.trim()}`)
      } else {
        steps.set(step, { job: stepJob[step]!, line: stepStart[step]! + 1, command: value, guard: null })
      }
    }
    prev = l
  })
  return [...steps.entries()].map(([id, s]) => ({ ...s, guard: guards.get(id) ?? null }))
}

interface Audit {
  /** Script name → where the workflow runs it (credited steps only). */
  ran: Map<string, string[]>
  /** `pnpm <x>` steps whose x is neither a package script nor a named pnpm builtin. */
  unknown: string[]
  /** Script steps that carry arguments (they may narrow the gate). */
  narrowed: string[]
  /** Script steps under an `if:` or `continue-on-error:` (a skip or a soft failure is not a pass). */
  guarded: string[]
}

function audit(yml: string, scripts: Record<string, string>): Audit {
  const out: Audit = { ran: new Map(), unknown: [], narrowed: [], guarded: [] }
  for (const step of readRunSteps(yml)) {
    const where = `${step.job} (workflow line ${step.line}): ${step.command}`
    if (!/^pnpm\s/.test(step.command)) {
      throw new Error(`[ci gates] a run step that is not a pnpm command; extend audit() before trusting the gate set: ${where}`)
    }
    const tokens = step.command.slice(4).trim().split(/\s+/)
    if (tokens[0]!.startsWith('-')) throw new Error(`[ci gates] a pnpm flag before the script name; extend audit() to read it: ${where}`)
    if (Object.hasOwn(PNPM_BUILTINS, tokens[0]!)) continue
    const [name, ...rest] = tokens[0] === 'run' ? tokens.slice(1) : tokens
    if (name === undefined || !Object.hasOwn(scripts, name)) { out.unknown.push(where); continue }
    if (rest.length > 0) { out.narrowed.push(where); continue }
    if (step.guard !== null) { out.guarded.push(`${where} [${step.guard}]`); continue }
    out.ran.set(name, [...(out.ran.get(name) ?? []), `${step.job}:${step.line}`])
  }
  return out
}

/** Every package script that is neither credited as run by CI nor exempted. */
const unwired = (scripts: Record<string, string>, a: Audit): string[] =>
  Object.keys(scripts).filter((s) => !Object.hasOwn(NON_GATE_SCRIPTS, s) && !a.ran.has(s)).sort()

const readScripts = (): Record<string, string> =>
  (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as { scripts: Record<string, string> }).scripts

/** One trigger event's filters; null = the filter key is absent. */
interface Trigger {
  branches: string[] | null
  paths: string[] | null
}
type TriggerFilter = keyof Trigger
const TRIGGER_FILTERS: ReadonlySet<string> = new Set<TriggerFilter>(['branches', 'paths'])
/** The events whose filters decide whether the gates run; any other event is recorded, never read. */
const GATE_EVENTS: ReadonlySet<string> = new Set(['push', 'pull_request'])

/** The workflow's `on:` block as event → filters. Reads a block mapping of events; `push` and
 *  `pull_request` must each be a block mapping of `branches:` / `paths:` lists (block or flow
 *  form), and anything else there throws. Other events (`workflow_dispatch`, …) are skipped. Pure. */
function readTriggers(yml: string): Map<string, Trigger> {
  const lines = yml.split(/\r?\n/)
  const heads = lines.flatMap((l, i) => (/^["']?on["']?\s*:/.test(l) ? [i] : []))
  if (heads.length !== 1) throw new Error(`[ci gates] expected ONE top-level \`on:\` key, found ${heads.length}`)
  const at = heads[0]!
  if (!/^["']?on["']?\s*:\s*(?:#.*)?$/.test(lines[at]!)) {
    throw new Error(`[ci gates] the \`on:\` triggers are not a block mapping (${lines[at]!.trim()}); extend readTriggers() to read it`)
  }
  const out = new Map<string, Trigger>()
  let eventIndent = -1
  let filterIndent = -1
  let event: { name: string; t: Trigger } | null = null
  let list: string[] | null = null // the block list being read, if any
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i]!
    if (isNeutral(l)) continue
    const ind = indentOf(l)
    if (ind === 0) break // the next top-level key ends `on:`
    if (eventIndent < 0) eventIndent = ind
    const key = /^\s*([\w-]+):\s*(.*)$/.exec(l)
    if (ind === eventIndent) {
      if (key === null) throw new Error(`[ci gates] line ${i + 1} is not a trigger event this test can read: ${l.trim()}`)
      const rest = stripComment(key[2]!)
      if (GATE_EVENTS.has(key[1]!) && rest !== '' && rest !== '{}') {
        throw new Error(`[ci gates] line ${i + 1}: \`${key[1]}\` is not a block mapping (${l.trim()}); extend readTriggers() to read it`)
      }
      event = { name: key[1]!, t: { branches: null, paths: null } }
      out.set(event.name, event.t)
      filterIndent = -1
      list = null
      continue
    }
    if (event === null || ind < eventIndent) throw new Error(`[ci gates] line ${i + 1} sits outside any trigger event: ${l.trim()}`)
    if (!GATE_EVENTS.has(event.name)) continue
    if (filterIndent < 0) filterIndent = ind
    if (ind === filterIndent) {
      if (key === null || !TRIGGER_FILTERS.has(key[1]!)) {
        throw new Error(`[ci gates] line ${i + 1}: \`${event.name}\` carries a filter this test cannot read (${l.trim()}); extend readTriggers()`)
      }
      const rest = stripComment(key[2]!)
      const flow = /^\[(.*)\]$/.exec(rest)
      if (rest !== '' && flow === null) throw new Error(`[ci gates] line ${i + 1}: a filter that is neither a block nor a flow list: ${l.trim()}`)
      list = rest === '' ? [] : null
      event.t[key[1] as TriggerFilter] = list ?? flow![1]!.split(',').map(unquote).filter((v) => v !== '')
      continue
    }
    const item = /^\s*-\s+(.*)$/.exec(l)
    if (item === null || list === null || ind < filterIndent) throw new Error(`[ci gates] line ${i + 1} is not a filter-list item: ${l.trim()}`)
    list.push(unquote(stripComment(item[1]!)))
  }
  return out
}

const PROJECT_GLOB = `${PROJECT_DIR}/**`

/** What stops the gates firing on a push to main or on a PR that touches this project (empty = none). */
function triggerHoles(yml: string): string[] {
  const on = readTriggers(yml)
  const holes: string[] = []
  for (const name of ['push', 'pull_request'] as const) {
    const t = on.get(name)
    if (t === undefined) {
      holes.push(`no \`${name}\` trigger: the gates never run on ${name === 'push' ? 'a push to main' : 'a pull request'}`)
      continue
    }
    const negated = [...(t.branches ?? []), ...(t.paths ?? [])].filter((v) => v.startsWith('!'))
    if (negated.length > 0) throw new Error(`[ci gates] \`${name}\` carries a negated filter (${negated.join(', ')}); extend triggerHoles() to read it`)
    // push pins main by name (the spelling the workflow uses); a PR fires for main unless a base-branch filter drops it.
    const firesForMain = name === 'push' ? (t.branches ?? []).includes('main') : t.branches === null || t.branches.includes('main')
    if (!firesForMain) holes.push(`\`${name}\` does not fire for main (branches: ${JSON.stringify(t.branches)})`)
    if (!(t.paths ?? []).includes(PROJECT_GLOB)) holes.push(`\`${name}\` paths do not include '${PROJECT_GLOB}' (paths: ${JSON.stringify(t.paths)})`)
  }
  return holes
}

/** Apply one exact-once edit to the (LF-normalized) real workflow; a plant that does not land
 *  throws. A FUNCTION replacer, so `$` in the new text is never read as a replacement pattern. */
function mutate(yml: string, from: RegExp, to: (...groups: string[]) => string): string {
  const hits = yml.match(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g'))?.length ?? 0
  if (hits !== 1) throw new Error(`[ci gates] mutant plant ${from} matched ${hits} times, not once`)
  return yml.replace(from, (...m: string[]) => to(...m))
}

describe('CI gate completeness: package.json gates vs the workflow that runs them', () => {
  const yml = existsSync(WORKFLOW) ? readFileSync(WORKFLOW, 'utf-8') : ''
  const scripts = readScripts()

  it('reads the workflow: every run step resolves, and none is unknown, narrowed or guarded', () => {
    expect(existsSync(WORKFLOW), `CI workflow not found at ${WORKFLOW}`).toBe(true)
    const steps = readRunSteps(yml)
    // Non-vacuity: the structural walk must attribute EVERY valued `run:` line in the raw text to a
    // step. A walk that lost a job or a steps list would green every arm below on a shrunken set.
    const rawRunLines = yml.split(/\r?\n/).filter((l) => /^\s*(?:-\s*)?run:\s*[^\s#]/.test(l)).length
    expect(rawRunLines, 'no valued `run:` line in the workflow at all').toBeGreaterThan(0)
    expect(steps.length, 'the step walk attributed fewer run steps than the text carries').toBe(rawRunLines)
    const a = audit(yml, scripts)
    expect(a.unknown, 'a `pnpm <x>` step names no package.json script (renamed or deleted?)').toEqual([])
    expect(a.narrowed, 'a script step carries arguments; they may narrow the gate').toEqual([])
    expect(a.guarded, 'a script step is conditional or soft-failing; a skip is not a pass').toEqual([])
    expect(a.ran.size, 'no script step was credited at all').toBeGreaterThan(0)
  })

  it('every package.json script is run by CI, or exempted by name with a reason', () => {
    const a = audit(yml, scripts)
    const missing = unwired(scripts, a)
    expect(
      missing,
      `package.json script(s) that CI never runs: ${missing.join(', ')}. A gate CI does not run is not a ` +
        `gate. Wire each into ${WORKFLOW} as \`- run: pnpm <name>\`, or, if it is genuinely not a check, ` +
        'add it to NON_GATE_SCRIPTS with a one-line reason.',
    ).toEqual([])
    const exemptButRun = Object.keys(NON_GATE_SCRIPTS).filter((s) => a.ran.has(s))
    expect(exemptButRun, 'an exempted script IS run by CI, so the exemption is false; delete it').toEqual([])
  })

  it('the gates are triggered: a push to main and every pull request that touches this project', () => {
    // Non-vacuity is built in: a read that lost `push` or `pull_request` reports it as a hole.
    expect(triggerHoles(yml), 'a gate CI is never triggered to run is not a gate').toEqual([])
  })

  it('the exemption list names only live, non-gate scripts', () => {
    const stale = Object.keys(NON_GATE_SCRIPTS).filter((s) => !Object.hasOwn(scripts, s))
    expect(stale, 'NON_GATE_SCRIPTS names a script package.json no longer has').toEqual([])
    const exemptedGates = Object.keys(NON_GATE_SCRIPTS).filter((s) => GATE_FAMILY.test(s))
    expect(exemptedGates, 'a build / typecheck / test / lint / verify:* script can never be exempted').toEqual([])
    const unreasoned = Object.entries(NON_GATE_SCRIPTS).filter(([, why]) => why.trim().length < 20).map(([s]) => s)
    expect(unreasoned, 'an exemption without a real reason').toEqual([])
  })

  it('goes red on each hole it exists for (mutants of the real workflow, planted in memory)', () => {
    const lf = yml.replace(/\r\n/g, '\n')
    const baseline = audit(lf, scripts)
    expect(unwired(scripts, baseline), 'the baseline must be green before the mutants mean anything').toEqual([])

    // A gate step deleted.
    const noFit = mutate(lf, /^ *- run: pnpm verify:fit\n/m, () => '')
    expect(unwired(scripts, audit(noFit, scripts))).toEqual(['verify:fit'])
    // A new script nobody classified: fail-loud, never green by default.
    expect(unwired({ ...scripts, storybook: 'storybook dev' }, baseline)).toEqual(['storybook'])
    // A step naming a script that does not exist.
    expect(audit(mutate(lf, /pnpm verify:bundle$/m, () => 'pnpm verify:bundel'), scripts).unknown).toHaveLength(1)
    // A narrowed gate step.
    expect(audit(mutate(lf, /pnpm test$/m, () => 'pnpm test -- --shard=1/2'), scripts).narrowed).toHaveLength(1)
    // A soft-failing gate step.
    const soft = mutate(lf, /^( *)- run: pnpm lint$/m, (_m, ind) => `${ind}- run: pnpm lint\n${ind}  continue-on-error: true`)
    expect(audit(soft, scripts).guarded).toEqual([expect.stringContaining('pnpm lint')])
    expect(unwired(scripts, audit(soft, scripts))).toEqual(['lint'])
    // The same skip / soft failure behind a QUOTED key is still never a credited pass.
    for (const plant of ['"if": false', "'continue-on-error': true"]) {
      const quoted = mutate(lf, /^( *)- run: pnpm lint$/m, (_m, ind) => `${ind}- run: pnpm lint\n${ind}  ${plant}`)
      expect(audit(quoted, scripts).guarded, plant).toEqual([expect.stringContaining('pnpm lint')])
      expect(unwired(scripts, audit(quoted, scripts)), plant).toEqual(['lint'])
    }
    // Any OTHER quoted key inside a step throws: a quoted `"run":` would hide the step from the walk.
    expect(() => audit(mutate(lf, /- run: pnpm typecheck$/m, () => '- "run": pnpm typecheck'), scripts)).toThrow(/quoted key inside a step/)
    // Shapes the resolver cannot read throw rather than shrink the credited set.
    expect(() => audit(mutate(lf, /- run: pnpm typecheck$/m, () => '- run: |\n          pnpm typecheck'), scripts)).toThrow(/block-scalar/)
    expect(() => audit(mutate(lf, /- run: pnpm build$/m, () => '- run: npm run build'), scripts)).toThrow(/not a pnpm command/)
    expect(() => audit(mutate(lf, /^ {2}verify:\n/m, () => '  verify:\n    if: false\n'), scripts)).toThrow(/job- or workflow-level/)
    // A job's `defaults.run` moved off this project, in ANY key quoting: the quoted spelling sits outside
    // every step, so only the working-directory read itself can catch it. A quoted CORRECT value stays green.
    const verifyDefaults = /^( {2}verify:\n {4}runs-on: .*\n {4}defaults:\n {6}run:\n {8})working-directory: projects\/the-back-nine$/m
    for (const key of ['working-directory', '"working-directory"', "'working-directory'"]) {
      const moved = mutate(lf, verifyDefaults, (_m, head) => `${head}${key}: projects/elsewhere`)
      expect(() => audit(moved, scripts), key).toThrow(/sets working-directory to "projects\/elsewhere"/)
    }
    expect(unwired(scripts, audit(mutate(lf, verifyDefaults, (_m, head) => `${head}"working-directory": "projects/the-back-nine"`), scripts))).toEqual([])

    // Triggers: every step arm above stays green on each of these, so each needs its own red.
    expect(triggerHoles(lf), 'the trigger baseline must be green before the mutants mean anything').toEqual([])
    const noPush = mutate(lf, /^ {2}push:\n(?: {4}.*\n)+/m, () => '')
    expect(triggerHoles(noPush)).toEqual([expect.stringContaining('no `push` trigger')])
    const dispatchOnly = mutate(lf, /^on:\n(?: {2}.*\n)+/m, () => 'on:\n  workflow_dispatch: {}\n')
    expect(triggerHoles(dispatchOnly)).toEqual([expect.stringContaining('no `push`'), expect.stringContaining('no `pull_request`')])
    const prLostProject = mutate(lf, /^( {2}pull_request:\n {4}paths:\n) {6}- 'projects\/the-back-nine\/\*\*'\n/m, (_m, head) => head)
    expect(triggerHoles(prLostProject)).toEqual([expect.stringContaining('`pull_request` paths do not include')])
    const pushOffMain = mutate(lf, /branches: \[main\]/, () => 'branches: [release]')
    expect(triggerHoles(pushOffMain)).toEqual([expect.stringContaining('`push` does not fire for main')])
    // Trigger shapes the read cannot vouch for throw rather than pass.
    expect(() => triggerHoles(mutate(lf, /^( {4})branches: \[main\]$/m, (_m, ind) => `${ind}branches: [main]\n${ind}tags: ['v*']`))).toThrow(/cannot read/)
    expect(() => triggerHoles(mutate(lf, /^( {2}pull_request:\n {4}paths:\n)/m, (_m, head) => `${head}      - '!projects/the-back-nine/docs/**'\n`))).toThrow(/negated filter/)
    expect(() => triggerHoles(mutate(lf, /^on:\n(?: {2}.*\n)+/m, () => 'on: [push, pull_request]\n'))).toThrow(/not a block mapping/)
  })
})
