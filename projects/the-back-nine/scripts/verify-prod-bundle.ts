/**
 * Initial-JS byte-budget sentinel. Fails the build (exit 1) when the JS the page
 * loads to become interactive exceeds the budget — catches accidental bloat (a
 * heavy dependency pulled into the entry graph) before it ships.
 *
 * "Initial JS" = the entry `<script type="module" src>` + every
 * `<link rel="modulepreload">` target in dist/index.html — exactly what the
 * browser fetches to render. The engine WORKER chunk (loaded by the Worker, not
 * the page) and the service worker are intentionally excluded.
 *
 * NOTE: this is a SIZE budget — distinct from burned's verify-prod-bundle, which
 * is a forbidden-strings leak sentinel. A leak sentinel becomes relevant here once
 * P4 ships dev-only solver/oracle internals or seed-injection harnesses that must
 * not reach the client bundle; nothing secret exists to leak yet in U0.
 */
import { readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Initial-JS budget — the entry graph the browser loads to render. */
export const BUNDLE_BUDGET_BYTES = 300 * 1024 // 300 KiB

export interface InitialJsFile {
  name: string
  bytes: number
}

export interface BundleReport {
  ok: boolean
  totalBytes: number
  budgetBytes: number
  files: InitialJsFile[]
}

/** Pure checker (testable): is the summed initial JS within budget? */
export function checkBundleBudget(
  files: InitialJsFile[],
  budgetBytes: number = BUNDLE_BUDGET_BYTES,
): BundleReport {
  const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0)
  return { ok: totalBytes <= budgetBytes, totalBytes, budgetBytes, files }
}

/** Parse dist/index.html for the initial-JS asset paths the browser loads.
 *  Attribute-order-independent — matching only `rel` before `href` would silently
 *  UNDERCOUNT (the dangerous failure mode for a size budget). */
export function initialJsFromHtml(html: string): string[] {
  const paths = new Set<string>()
  // Entry <script src="….js"> (any attribute order).
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*>/g)) {
    if (m[1]) paths.add(m[1])
  }
  // <link rel="modulepreload" href="….js"> — match the tag, then require
  // rel=modulepreload and extract href regardless of attribute order.
  for (const m of html.matchAll(/<link\b[^>]*>/g)) {
    const tag = m[0]
    if (!/\brel="modulepreload"/.test(tag)) continue
    const href = tag.match(/\bhref="([^"]+\.js)"/)
    if (href?.[1]) paths.add(href[1])
  }
  return [...paths]
}

const kib = (b: number): string => `${(b / 1024).toFixed(1)} KiB`

function main(): number {
  const dist = join(process.cwd(), 'dist')
  const indexPath = join(dist, 'index.html')
  if (!existsSync(indexPath)) {
    console.error('[verify:bundle] no dist/index.html — run `pnpm build` first.')
    return 1
  }
  const html = readFileSync(indexPath, 'utf-8')
  const files: InitialJsFile[] = initialJsFromHtml(html).map((p) => {
    const abs = join(dist, p.replace(/^\//, ''))
    return { name: p, bytes: existsSync(abs) ? statSync(abs).size : 0 }
  })
  const report = checkBundleBudget(files)
  for (const f of report.files) console.log(`  ${kib(f.bytes).padStart(12)}  ${f.name}`)
  if (!report.ok) {
    console.error(
      `[verify:bundle] FAILED — initial JS ${kib(report.totalBytes)} exceeds budget ${kib(report.budgetBytes)}.`,
    )
    return 1
  }
  console.log(`[verify:bundle] OK — initial JS ${kib(report.totalBytes)} ≤ budget ${kib(report.budgetBytes)}.`)
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main())
}
