/* global process */
/**
 * `pnpm engine:identity`: the per-seed identity check an engine or `intakeMap` commit carries (the Act 5 plan's
 * Verification Contract). Freezes the base commit, records it, records the tree, compares key by key.
 *
 *   pnpm engine:identity [--base=<commit>=HEAD] [--strip=<arm prefix>,…] [--keys=a,b] [--plant=<key>] [--dir=<dir>]
 *   pnpm engine:identity --clean [--dir=<dir>]
 *
 * 1. Freeze (insight 148): `git archive <sha>:projects/the-back-nine src scripts tsconfig.json package.json
 *    vite-env.d.ts`, run from the repo root (the project-relative form fails), unpacked to `<dir>/frozen-<sha7>/`
 *    outside the repo, with `node_modules` junctioned to the project's. The tree's `scripts/engine-sweep/` is copied
 *    over the archive's, so both sides run one recorder (the record's `meta.recorder` proves it; a recorder that
 *    calls a function the base lacks fails loudly, which is right).
 * 2. Record the copy (cached as `<dir>/base-<sha7>-<recorder>.json`, so a second check against one base records the
 *    tree alone), then record the tree. `--plant` reaches the tree side only: the vacuity witness.
 * 3. Compare (`compare.mjs`): the first printed line is the result line for the commit message.
 *
 * `<dir>` defaults to `<os temp>/b9-engine-sweep`, never inside the repo (Grep, `doc:reanchor` and the collectors
 * would see a second `src`). `--clean` removes the frozen copies and cached records, each junction first. Run it
 * alone, never beside the suite, a fit run or a mutant run: the date keys run the full search, about a minute each,
 * so a side takes about half an hour. `--keys` is for a quick partial read, never a commit's proof.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareRecords } from './compare.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const projectDir = resolve(here, '..', '..')
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const list = (s) => (s === undefined ? [] : s.split(',').filter((x) => x !== ''))
const fail = (msg) => {
  process.stderr.write(`[engine:identity] ${msg}\n`)
  process.exit(2)
}

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) fail(`git ${args.join(' ')} failed: ${r.stderr.trim()}`)
  return r.stdout.trim()
}

const repoRoot = resolve(git(['rev-parse', '--show-toplevel'], projectDir))
const prefix = git(['rev-parse', '--show-prefix'], projectDir).replace(/\/$/, '')
const dir = resolve(arg('dir') ?? join(tmpdir(), 'b9-engine-sweep'))
if (!relative(repoRoot, dir).startsWith('..')) fail(`--dir must be outside the repo (got ${dir})`)
mkdirSync(dir, { recursive: true })

/** Remove a frozen copy: the junction alone first, never through it (`docs/landmines.md`), then the folder. */
function removeFrozen(frozen) {
  const link = join(frozen, 'node_modules')
  let st
  try {
    st = lstatSync(link)
  } catch {
    st = undefined
  }
  if (st !== undefined) {
    if (!st.isSymbolicLink()) fail(`${link} is a real folder, not the junction: not removing ${frozen}`)
    try {
      unlinkSync(link)
    } catch {
      rmdirSync(link)
    }
  }
  if (!existsSync(join(projectDir, 'node_modules', 'tsx'))) fail('the project node_modules looks damaged after removing a junction: stopped')
  rmSync(frozen, { recursive: true, force: true })
}

if (process.argv.includes('--clean')) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (name.startsWith('frozen-')) removeFrozen(p)
    else if (/^(base|tree)-.*\.json$/.test(name)) rmSync(p)
  }
  process.stdout.write(`[engine:identity] cleaned ${dir}\n`)
  process.exit(0)
}

const sweepFiles = readdirSync(here).filter((f) => /\.(ts|mjs)$/.test(f))
const recorderHash = createHash('sha256')
  .update(readFileSync(join(here, 'record.ts'), 'utf8').replace(/\r\n/g, '\n'))
  .digest('hex')
  .slice(0, 8)
const keys = arg('keys')
const plant = arg('plant')
const keysTag = keys === undefined ? '' : `-k${createHash('sha256').update(keys).digest('hex').slice(0, 8)}`
const sha = git(['rev-parse', '--verify', `${arg('base') ?? 'HEAD'}^{commit}`], projectDir)
const sha7 = sha.slice(0, 7)
const tsxCli = createRequire(join(projectDir, 'package.json')).resolve('tsx/cli')

function record(cwd, out, extra) {
  const args = [tsxCli, join('scripts', 'engine-sweep', 'record.ts'), `--out=${out}`]
  if (keys !== undefined) args.push(`--keys=${keys}`)
  args.push(...extra)
  const r = spawnSync(process.execPath, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.status !== 0) fail(`the recorder failed in ${cwd} (exit ${r.status})`)
}

// 1–2. The base: frozen and recorded, unless this recorder already recorded it.
const baseFile = join(dir, `base-${sha7}-${recorderHash}${keysTag}.json`)
if (existsSync(baseFile)) {
  process.stderr.write(`[engine:identity] base ${sha7}: cached record ${baseFile}\n`)
} else {
  const frozen = join(dir, `frozen-${sha7}`)
  if (existsSync(frozen) && !existsSync(join(frozen, '.complete'))) removeFrozen(frozen)
  if (!existsSync(frozen)) {
    process.stderr.write(`[engine:identity] freezing ${sha7} into ${frozen}\n`)
    mkdirSync(frozen, { recursive: true })
    const tar = join(frozen, 'frozen.tar')
    git(['archive', '--format=tar', '-o', tar, `${sha}:${prefix}`, 'src', 'scripts', 'tsconfig.json', 'package.json', 'vite-env.d.ts'], repoRoot)
    // Relative names and the copy as the working folder: GNU tar reads a drive letter as a remote host.
    const x = spawnSync('tar', ['-xf', 'frozen.tar'], { cwd: frozen, encoding: 'utf8' })
    if (x.status !== 0) fail(`tar failed: ${x.stderr}`)
    rmSync(tar)
    symlinkSync(join(projectDir, 'node_modules'), join(frozen, 'node_modules'), 'junction')
    writeFileSync(join(frozen, '.complete'), `${sha}\n`)
  }
  const target = join(frozen, 'scripts', 'engine-sweep')
  mkdirSync(target, { recursive: true })
  for (const f of sweepFiles) copyFileSync(join(here, f), join(target, f))
  process.stderr.write(`[engine:identity] recording the base ${sha7}\n`)
  record(frozen, baseFile, [])
}

// 2. The tree.
const treeFile = join(dir, `tree${plant === undefined ? '' : `-plant-${plant}`}${keysTag}.json`)
process.stderr.write(`[engine:identity] recording the tree${plant === undefined ? '' : ` with $1 planted on ${plant}`}\n`)
record(projectDir, treeFile, plant === undefined ? [] : [`--plant=${plant}`])

// 3. The compare.
const before = JSON.parse(readFileSync(baseFile, 'utf8'))
const after = JSON.parse(readFileSync(treeFile, 'utf8'))
const { ok, lines } = compareRecords(before, after, { strip: list(arg('strip')), baseLabel: sha7 })
process.stdout.write(`${lines.join('\n')}\n`)
process.stderr.write(`[engine:identity] records: ${baseFile} ${treeFile}\n`)
process.exit(ok ? 0 : 1)
