/* global process, console */
// Checks a `pnpm doc:reanchor <base>` DRY RUN by content (the review's gates, step 3 in TODO.md; it replaced the Dell's
// classifier, which died with that laptop's session folder): for every WOULD line, HEAD's line(s) at the old number must
// equal the tree's line(s) at the new number, a pure shift the diff explains. A range that spans edited code reports
// "NOT a pure shift": check its start and end lines by hand. Every SKIPPED line, and every REVIEW line the dry run
// prints, is read by hand. Run it BEFORE `--apply` (after it, a citation the apply rewrote inside a cited range reads
// as a difference). Written b9-2, 2026-11-20, on U2's 127 moves.
// Usage, from the project dir: pnpm doc:reanchor <base> > <dry file> ; node scripts/check-reanchor-moves.mjs <dry file> <base>
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const [dryPath, base] = process.argv.slice(2)
if (dryPath === undefined || base === undefined) {
  console.error('usage: node scripts/check-reanchor-moves.mjs <dry-run output file> <base sha>')
  process.exit(2)
}
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
/** A cited file as the doc names it (a path, or a bare file name) to its one tracked path, or null. */
const resolve = (name) => {
  if (files.includes(name)) return name
  const hits = files.filter((f) => f === name || f.endsWith('/' + name))
  return hits.length === 1 ? hits[0] : null
}
const cache = new Map()
const linesOf = (key, read) => {
  if (!cache.has(key)) cache.set(key, read().split(/\r?\n/))
  return cache.get(key)
}
const head = (p) => linesOf(`head:${p}`, () => execFileSync('git', ['show', `${base}:./${p}`], { encoding: 'utf8', maxBuffer: 1 << 28 }))
const tree = (p) => linesOf(`tree:${p}`, () => readFileSync(p, 'utf8'))

let pure = 0
const notPure = []
const unresolved = []
for (const raw of readFileSync(dryPath, 'utf8').split(/\r?\n/)) {
  if (!raw.startsWith('WOULD')) continue
  // "WOULD <doc>:<n>  `:A-B` → `:C-D`  (bare, after <file>)" or "WOULD <doc>:<n>  <file>:A-B → <file>:C-D".
  const bare = /^WOULD \S+:\d+\s+`?:(\d+)(?:-(\d+))?`? → `?:(\d+)(?:-(\d+))?`?\s+\(bare, after (\S+)\)/.exec(raw)
  const full = /^WOULD \S+:\d+\s+(\S+?):(\d+)(?:-(\d+))? → \S+?:(\d+)(?:-(\d+))?/.exec(raw)
  const m = bare ? { cited: bare[5], a: bare[1], b: bare[2], na: bare[3], nb: bare[4] } : full ? { cited: full[1], a: full[2], b: full[3], na: full[4], nb: full[5] } : null
  if (m === null) {
    console.log(`SKIPPED ${raw}`)
    continue
  }
  const path = resolve(m.cited.replace(/^[`(]/, ''))
  if (path === null) {
    unresolved.push(raw)
    continue
  }
  const h = head(path).slice(+m.a - 1, m.b ? +m.b : +m.a).map((s) => s.trim())
  const t = tree(path).slice(+m.na - 1, m.nb ? +m.nb : +m.na).map((s) => s.trim())
  if (h.length === t.length && h.every((x, i) => x === t[i])) pure += 1
  else notPure.push(`${raw}\n    HEAD: ${h.join(' | ').slice(0, 160)}\n    TREE: ${t.join(' | ').slice(0, 160)}`)
}
console.log(`pure shifts: ${pure}`)
console.log(`NOT a pure shift (check the start and end lines by hand): ${notPure.length}`)
for (const line of notPure) console.log(line)
console.log(`unresolved cited file: ${unresolved.length}`)
for (const line of unresolved) console.log(`  ${line}`)
