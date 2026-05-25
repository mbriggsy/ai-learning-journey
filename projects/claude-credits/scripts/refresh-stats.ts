import { promises as fs } from 'node:fs'
import path from 'node:path'
import { buildMultiProjectReport } from '../../../tools/claude-credit/dist/multi-report.js'
import { stripForPublish } from '../../../tools/claude-credit/dist/strip-for-publish.js'
import { copyEditorialAssets } from './copy-editorial-assets.js'
import { assertPublishSafe } from './publish-guard.js'
import { stableStringify } from './stable-stringify.js'

const OUT = path.resolve('public/data/stats.json')
const CC_DIR = path.resolve('../../tools/claude-credit') // cwd = projects/claude-credits → 2 hops to root

// Dist-FRESHNESS guard. The static imports above already fail loud if dist/*.js is MISSING
// (ERR_MODULE_NOT_FOUND at load). The latent failure this catches is STALE dist: src edited
// without a rebuild → we import an old contract and ship stale data while `tsc` stays green
// against the old .d.ts. Compare newest src/*.ts mtime against the imported dist bundle.
async function assertDistFresh(): Promise<void> {
  const distMtime = (await fs.stat(path.join(CC_DIR, 'dist/multi-report.js'))).mtimeMs
  const srcDir = path.join(CC_DIR, 'src')
  for (const rel of await fs.readdir(srcDir, { recursive: true })) {
    const f = String(rel)
    if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue
    if ((await fs.stat(path.join(srcDir, f))).mtimeMs > distMtime) {
      throw new Error(
        `claude-credit dist is STALE (src/${f} newer than dist) — run \`pnpm build\` in tools/claude-credit.`,
      )
    }
  }
}

async function main(): Promise<void> {
  await assertDistFresh()

  // Production path: no opts → reads ~/.claude-credit-projects.yaml + real homeDir for tokens.
  const { report } = await buildMultiProjectReport({})

  // Drop the diagnostic `warnings[]` from every published project (projects + meta) — no site
  // component consumes it, and it carries free-text path strings (e.g. heroImage-not-found
  // messages). Removing it before publish takes that leak surface to zero. (`delete` needs a
  // cast: warnings is a required field.) commitsByAuthor is KEPT (ATC 2026-05-25).
  for (const p of [...report.projects, ...report.meta]) {
    delete (p as { warnings?: unknown }).warnings
  }

  // ORDER IS LOAD-BEARING:
  await copyEditorialAssets(report) // 1. needs projectPath (still present) to resolve sources
  const safe = stripForPublish(report) // 2. shared fn: deep-clone + delete every projectPath
  assertPublishSafe(safe) // 3. throw before writing if any PII/secret string slipped through
  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(OUT, stableStringify(safe), 'utf8') // 4. deterministic write

  process.stdout.write(`refresh: wrote ${OUT}\n`)
}

main().catch((err) => {
  process.stderr.write(`refresh failed: ${(err as Error).message}\n`)
  process.exit(1)
})
