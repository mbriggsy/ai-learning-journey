/* global process, console */
// Positional pair-check after a doc:reanchor run (docs/landmines.md, Citations and the doc gates).
// For every tracked file that cites the changed code file, pair each citation token on each line at BASE
// with the same-position token in the TREE (named `<file>:N[-M]` and bare `:N[-M]` continuations that
// follow a named citation of that file on the same line), then compare the CITED CODE by content:
// BASE code line at the old number against TREE code line at the new number (start and end of a range).
// Prints every token whose content does not match, moved or not: a missed bare continuation shows up as
// "unmoved, content differs"; a frozen historical number shows up the same way and is judged by hand.
// Usage: node scripts/check-citation-pairs.mjs <BASE> <code file, project-relative> (run from the project dir; once per
// code file the change moved). Written b9-7 (2026-11-20) after b9-6 and b9-7 each rebuilt it from scratch: the Dell-era
// tools folder died with the Dell. A dev tool, not a CI gate: `verify:doc-stats` arm 4 is the gate it backs.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const [BASE, CODE] = process.argv.slice(2)
if (!BASE || !CODE) throw new Error('usage: node scripts/check-citation-pairs.mjs <BASE> <code file>')
const codeBase = path.basename(CODE)
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 })
const baseCode = git('show', `${BASE}:./${CODE}`).split('\n')
const treeCode = fs.readFileSync(CODE, 'utf8').split('\n')

// Every tracked file under the project that mentions the code file's basename followed by a colon and digit.
const files = git('grep', '-l', '-E', `${codeBase.replace(/\./g, '\\.')}:[0-9]`, '--', '.')
  .split('\n')
  .filter(Boolean)
  .filter((f) => f !== CODE)

const TOKEN = /([A-Za-z0-9_./-]+\.(?:tsx?|mjs|cjs|js|css|md|json|cmd|yml|yaml)):(\d+)(?:-(\d+))?|(?<![A-Za-z0-9_])(:)(\d+)(?:-(\d+))?/g

function tokensOf(line) {
  const out = []
  let current = null
  for (const m of line.matchAll(TOKEN)) {
    if (m[1] !== undefined) {
      current = path.basename(m[1])
      if (current === codeBase) out.push({ start: Number(m[2]), end: m[3] === undefined ? null : Number(m[3]), bare: false })
    } else if (current === codeBase) {
      out.push({ start: Number(m[5]), end: m[6] === undefined ? null : Number(m[6]), bare: true })
    }
  }
  return out
}

const norm = (s) => (s ?? '<past end of file>').trim()
let paired = 0
const findings = []
for (const file of files) {
  let baseText
  try {
    baseText = git('show', `${BASE}:./${file}`)
  } catch {
    findings.push(`${file}: NEW since base (not paired; check its citations by hand)`)
    continue
  }
  const baseLines = baseText.split('\n')
  const treeLines = fs.readFileSync(file, 'utf8').split('\n')
  if (baseLines.length !== treeLines.length) {
    findings.push(`${file}: line count changed ${baseLines.length} -> ${treeLines.length} (a content edit, not only re-anchors: pair by hand)`)
    continue
  }
  for (let i = 0; i < treeLines.length; i++) {
    const b = tokensOf(baseLines[i])
    const t = tokensOf(treeLines[i])
    if (b.length === 0 && t.length === 0) continue
    if (b.length !== t.length) {
      findings.push(`${file}:${i + 1}: token count ${b.length} -> ${t.length} (pair by hand)`)
      continue
    }
    for (let k = 0; k < t.length; k++) {
      paired++
      const bt = b[k]
      const tt = t[k]
      const checks = [[bt.start, tt.start, 'start']]
      if (bt.end !== null || tt.end !== null) checks.push([bt.end ?? bt.start, tt.end ?? tt.start, 'end'])
      for (const [o, n, which] of checks) {
        const was = norm(baseCode[o - 1])
        const now = norm(treeCode[n - 1])
        if (was !== now) {
          findings.push(
            `${file}:${i + 1} ${tt.bare ? 'bare' : 'named'} ${which} :${o} -> :${n} ${o === n ? '(UNMOVED)' : '(moved)'}\n    BASE[${o}]: ${was.slice(0, 150)}\n    TREE[${n}]: ${now.slice(0, 150)}`,
          )
        }
      }
    }
  }
}
console.log(`files citing ${codeBase}: ${files.length} · tokens paired: ${paired} · to judge: ${findings.length}`)
for (const f of findings) console.log(f)
