/* global process, console */
// reanchor-delta-2.mjs — re-anchor every line-numbered citation into the files this session changed,
// mapping old → new from `git diff -U0 <BASE>`. v2 (2026-09-24), the two gaps the 2026-09-23/24 closes
// hand-fixed on every build:
//   (1) PER-TOKEN freeze, not per-line: a token is frozen when it is a recorded number — followed by
//       "-at-filing" / " (then", or preceded by "(not `", "cites `", "filed as … at `". Other tokens on the
//       same line are LIVE and move (TODO's frozen lines carried a rotted live anchor for a week).
//   (2) BARE continuations (`:N`, `:N-M`, `:N–:M`) are attributed to the NEAREST file name before them on
//       the same line (a named citation `x.ts:12` or a bare `` `x.ts` ``) and moved with that file's map.
// LAW unchanged: runs ONCE, LAST, from the BASE commit's numbers; never hand-fix before it. A tree whose
// NAMED tokens were already moved by the v1 tool for the same base takes --only-missed (bare tokens +
// named tokens on lines v1 froze wholesale) — running the full pass there would move them TWICE.
// Usage: node scripts/reanchor-citations.mjs <BASE> [--apply] [--only-missed]  (or: pnpm doc:reanchor <BASE> ...)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const [BASE, ...flags] = process.argv.slice(2)
if (!BASE) throw new Error('usage: pnpm doc:reanchor <BASE> [--apply] [--only-missed]')
const APPLY = flags.includes('--apply')
const ONLY_MISSED = flags.includes('--only-missed')
const V1_LINE_FROZEN = /at[- ]filing|\(not `:|not `:|cites `/i
const git = (args) => execFileSync('git', args, { encoding: 'utf8' })

const changed = git(['diff', '--name-only', BASE, '--', '.']).split('\n').map((s) => s.trim()).filter(Boolean)
  .map((p) => p.replace(/^projects\/the-back-nine\//, '')).filter((p) => fs.existsSync(p))

function mappingFor(file) {
  const diff = git(['diff', '-U0', BASE, '--', file])
  const hunks = [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map((m) => ({
    a: Number(m[1]), b: m[2] === undefined ? 1 : Number(m[2]), c: Number(m[3]), d: m[4] === undefined ? 1 : Number(m[4]),
  }))
  return (oldLine) => {
    let offset = 0
    for (const h of hunks) {
      if (h.b === 0) { if (oldLine <= h.a) return { line: oldLine + offset, inside: false }; offset += h.d; continue }
      if (oldLine < h.a) return { line: oldLine + offset, inside: false }
      if (oldLine < h.a + h.b) return { line: h.c, inside: true }
      offset += h.d - h.b
    }
    return { line: oldLine + offset, inside: false }
  }
}

const tracked = git(['ls-files']).split('\n').filter(Boolean)
const byBase = new Map()
for (const t of tracked) byBase.set(path.basename(t), [...(byBase.get(path.basename(t)) ?? []), t])
const targets = new Map()
for (const f of changed) {
  const b = path.basename(f)
  if (!/\.(ts|tsx|css|md|mjs|js)$/.test(b)) continue
  if ((byBase.get(b) ?? []).length !== 1) { console.log(`SKIP ambiguous basename: ${b}`); continue }
  targets.set(b, mappingFor(f))
}

const FROZEN_BEFORE = /(\(not|cites|filed as[^\n]{0,80} at|filed as|was|then) ?`?$/i
const FROZEN_AFTER = /^`?-at-filing|^`? \(then\b|^`?[ ,]*(at|as) filing/i
const EXT = '(?:ts|tsx|css|md|mjs|js)'
const NAMED = new RegExp(`(^|[^\\w/.-])((?:[\\w-]+/)*)([\\w.-]+\\.${EXT}):(\\d+)(?:-(\\d+))?(?![\\d-])`, 'g')
// A bare continuation: `:N`, `:N-M`, `:N–:M` (en dash, optional second colon), not preceded by a word/ext char.
const BARE = /(^|[^\w/.:-])(`?)(:)(\d+)(?:([-–]:?)(\d+))?(`?)(?![\d-])/g
// The nearest file name before a bare token on the same line (within 60 chars): `x.ts:12`, or `` `x.ts` ``.
const LAST_FILE = new RegExp(`([\\w.-]+\\.${EXT})(?::\\d+(?:-\\d+)?)?\`?[^\\n]{0,60}$`)

const scan = tracked.filter((t) => /\.(md|ts|tsx|css|mjs|js|json|yml|yaml)$/.test(t) && !t.includes('node_modules'))
let edits = 0
const review = []
for (const file of scan) {
  const raw = fs.readFileSync(file, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const lines = raw.split(/\r\n|\n/)
  let touched = false
  const selfBase = path.basename(file)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const spans = []
    const frozenAt = (start, end) => FROZEN_BEFORE.test(line.slice(Math.max(0, start - 90), start)) || FROZEN_AFTER.test(line.slice(end, end + 14))
    // (a) named citations
    for (const m of line.matchAll(NAMED)) {
      const [whole, pre, dirs, base, s1, s2] = m
      const map = targets.get(base)
      if (!map || base === selfBase) continue
      if (dirs && !changed.some((c) => c.endsWith(dirs + base))) continue
      if (ONLY_MISSED && !V1_LINE_FROZEN.test(line)) continue
      const start = m.index + pre.length, end = m.index + whole.length
      if (s2 !== undefined && Number(s2) < Number(s1)) continue
      if (frozenAt(start, end)) continue
      const r1 = map(Number(s1)), r2 = s2 !== undefined ? map(Number(s2)) : null
      if (r1.inside || (r2 && r2.inside)) { review.push(`${file}:${i + 1}  ${whole.trim()}  → inside a modified hunk (new ~${r1.line}${r2 ? '-' + r2.line : ''})`); continue }
      if (r1.line === Number(s1) && (r2 === null || r2.line === Number(s2))) continue
      spans.push({ start, end, repl: `${dirs}${base}:${r1.line}${r2 ? '-' + r2.line : ''}` })
    }
    // (b) bare continuations attributed to the nearest file name before them
    for (const m of line.matchAll(BARE)) {
      const [whole, pre, q1, colon, s1, sep, s2, q2] = m
      const start = m.index + pre.length, end = m.index + whole.length
      if (spans.some((s) => start < s.end && end > s.start)) continue
      const lf = line.slice(0, start).match(LAST_FILE)
      if (!lf) continue
      const base = lf[1]
      const map = targets.get(base)
      if (!map || base === selfBase) continue
      if (frozenAt(start, end)) continue
      const r1 = map(Number(s1)), r2 = s2 !== undefined ? map(Number(s2)) : null
      if (r1.inside || (r2 && r2.inside)) { review.push(`${file}:${i + 1}  ${whole.trim()} (after ${base})  → inside a modified hunk`); continue }
      if (r1.line === Number(s1) && (r2 === null || r2.line === Number(s2))) continue
      spans.push({ start, end, repl: `${q1}${colon}${r1.line}${sep !== undefined ? sep + r2.line : ''}${q2}`, bare: base })
    }
    if (!spans.length) continue
    spans.sort((a, b) => a.start - b.start)
    let out = '', last = 0
    for (const s of spans) {
      console.log(`${APPLY ? 'EDIT' : 'WOULD'} ${file}:${i + 1}  ${line.slice(s.start, s.end)} → ${s.repl}${s.bare ? `  (bare, after ${s.bare})` : ''}`)
      out += line.slice(last, s.start) + s.repl
      last = s.end
      edits++
    }
    lines[i] = out + line.slice(last)
    touched = true
  }
  if (touched && APPLY) fs.writeFileSync(file, lines.join(eol))
}
console.log(`\n${edits} citation edits ${APPLY ? 'applied' : 'pending (dry run)'}; ${review.length} for hand review`)
for (const r of review) console.log('REVIEW ' + r)
