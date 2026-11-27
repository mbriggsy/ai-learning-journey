/* global process */
/**
 * The per-key compare of two identity records (`record.ts`), never a whole-file `cmp`: new seeds add keys.
 *
 *   node scripts/engine-sweep/compare.mjs <before.json> <after.json> [--strip=<arm prefix>[,…]]
 *
 * Per key: every arm digest equal, or the moved arm paths listed with the readable figures before → after. A key in
 * the after record only is listed as new and not compared; a key in the before record only is a FAIL (it vanished).
 * Two records made by different recorders, on different Node versions or over different key filters are a FAIL ("not
 * comparable"). `--strip` drops arms whose path starts with a prefix, on both sides, for a move made on purpose.
 * Exit 0 when nothing moved or vanished, else 1. Read the exit code directly, never through a pipe.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Compare two parsed records. Returns `{ ok, lines }`; `lines[0]` is the one result line a commit message carries. */
export function compareRecords(before, after, { strip = [], baseLabel = 'base' } = {}) {
  const lines = []
  const refuse = (why) => ({ ok: false, lines: [`engine identity: NOT COMPARABLE vs ${baseLabel}: ${why}`] })
  if (before.meta.recorder !== after.meta.recorder) return refuse(`the recorders differ (${before.meta.recorder} vs ${after.meta.recorder})`)
  if (before.meta.node !== after.meta.node) return refuse(`the Node versions differ (${before.meta.node} vs ${after.meta.node})`)
  if (JSON.stringify(before.meta.filter) !== JSON.stringify(after.meta.filter)) return refuse('the key filters differ')
  if (before.meta.plant !== null) return refuse(`the before record is itself planted (${before.meta.plant})`)

  const kept = (arms) => Object.fromEntries(Object.entries(arms).filter(([p]) => !strip.some((s) => p.startsWith(s))))
  const beforeKeys = Object.keys(before.keys)
  const added = Object.keys(after.keys).filter((k) => !(k in before.keys))
  const vanished = beforeKeys.filter((k) => !(k in after.keys))
  const moved = []
  for (const key of beforeKeys) {
    if (!(key in after.keys)) continue
    const b = before.keys[key]
    const a = after.keys[key]
    const ba = kept(b.arms)
    const aa = kept(a.arms)
    const paths = [...new Set([...Object.keys(ba), ...Object.keys(aa)])].sort()
    const diff = paths.filter((p) => ba[p] !== aa[p]).map((p) => (!(p in ba) ? `+${p}` : !(p in aa) ? `-${p}` : p))
    if (b.route !== a.route) diff.unshift(`route ${b.route} -> ${a.route}`)
    if (diff.length === 0) continue
    const readable = [...new Set([...Object.keys(b.readable), ...Object.keys(a.readable)])]
      .filter((f) => b.readable[f] !== a.readable[f])
      .map((f) => `    ${f}: ${b.readable[f] ?? '(none)'} -> ${a.readable[f] ?? '(none)'}`)
    moved.push({ key, diff, readable })
  }

  const compared = beforeKeys.length - vanished.length
  const newNote = added.length === 0 ? '' : ` (${added.length} new, not compared: ${added.join(', ')})`
  const stripNote = strip.length === 0 ? '' : ` [stripped: ${strip.join(', ')}]`
  const ok = moved.length === 0 && vanished.length === 0
  lines.push(
    ok
      ? `engine identity: IDENTICAL ${compared} of ${compared} keys vs ${baseLabel}${newNote}${stripNote}`
      : `engine identity: MOVED ${moved.length} of ${compared} keys vs ${baseLabel}` +
          (vanished.length === 0 ? '' : `, ${vanished.length} VANISHED (${vanished.join(', ')})`) +
          `${newNote}${stripNote}`,
  )
  for (const m of moved) {
    lines.push(`  ${m.key}: ${m.diff.join(' ')}`)
    lines.push(...m.readable)
  }
  return { ok, lines }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const files = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const stripArg = process.argv.find((a) => a.startsWith('--strip='))
  if (files.length !== 2) {
    process.stderr.write('usage: compare.mjs <before.json> <after.json> [--strip=<arm prefix>[,…]]\n')
    process.exit(2)
  }
  const [before, after] = files.map((f) => JSON.parse(readFileSync(f, 'utf8')))
  const strip = stripArg === undefined ? [] : stripArg.slice('--strip='.length).split(',').filter((s) => s !== '')
  const { ok, lines } = compareRecords(before, after, { strip, baseLabel: files[0] })
  process.stdout.write(`${lines.join('\n')}\n`)
  process.exit(ok ? 0 : 1)
}
