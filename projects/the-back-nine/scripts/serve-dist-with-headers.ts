/**
 * CSP browser-enforcement harness — serves the built `dist/` with the EXACT response headers
 * Vercel ships (read from `vercel.json`, never re-typed), so a real browser can prove it ENFORCES
 * the strict CSP. This exists because `vite preview` does NOT apply `vercel.json` headers
 * (docs/insights/001) — and a vitest regex on the JSON proves the *string*, not *enforcement*.
 *
 * It listens on TWO ports in one process so the e2e suite can prove enforcement is REAL, not vacuous:
 *   - ENFORCED (4180): every `vercel.json` header, INCLUDING Content-Security-Policy.
 *   - CONTROL  (4181): every `vercel.json` header EXCEPT Content-Security-Policy.
 * The control isolates a single variable (CSP present vs absent): the same inline-script injection
 * that is BLOCKED on :4180 must EXECUTE on :4181, which is what makes the blocked assertion meaningful
 * (a broken injector would silently pass on :4180 alone — the false-pass trap).
 *
 * Driven by `playwright.config.ts`'s `webServer` (which manages its lifecycle — no orphan). It serves
 * the EXISTING `dist/`; it does not build (mirrors `verify:bundle`'s convention — CI builds first).
 * Fails loud before listening if `dist/`, `dist/index.html`, or the CSP entry is missing — never let
 * the security suite run against a broken/no-CSP harness and silently pass.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist')
const VERCEL = join(ROOT, 'vercel.json')

const ENFORCED_PORT = 4180
const CONTROL_PORT = 4181
const HOST = '127.0.0.1' // never `localhost` — it can resolve to ::1 while we bind IPv4, flaking readiness

const CSP_HEADER = 'Content-Security-Policy'

interface VercelHeaderEntry {
  readonly key: string
  readonly value: string
}
interface VercelConfig {
  readonly headers?: ReadonlyArray<{ readonly source: string; readonly headers: readonly VercelHeaderEntry[] }>
}

// JS-valid MIME types are LOAD-BEARING: vercel.json ships `X-Content-Type-Options: nosniff`, so a
// module script / module Web Worker served with a non-JS MIME is HARD-blocked by the browser — a
// NON-CSP failure that would otherwise masquerade as a CSP block. Map every extension in this dist.
const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
}

// ---- fail-loud preconditions (a broken harness must never let the security suite false-pass) ----
function fail(message: string): never {
  console.error(`[csp-harness] ${message}`)
  process.exit(1)
}

if (!existsSync(DIST) || !statSync(DIST).isDirectory()) fail(`dist/ missing at ${DIST} — run \`pnpm build\` first.`)
if (!existsSync(join(DIST, 'index.html'))) fail(`dist/index.html missing — run \`pnpm build\` first.`)
if (!existsSync(VERCEL)) fail(`vercel.json not found at ${VERCEL}.`)

const vercel = JSON.parse(readFileSync(VERCEL, 'utf-8')) as VercelConfig
// Select the CSP-carrying rule by its `source` predicate, NOT by array index. Vercel applies EVERY
// matching rule, so trusting `headers[0]` would silently serve a different policy than production if
// vercel.json ever gains/reorders a rule — a green gate proving the WRONG policy. Require exactly one
// rule to carry the CSP and that it be the `/(.*)` catch-all the harness mimics (it serves all paths).
const cspRules = (vercel.headers ?? []).filter((r) => r.headers.some((h) => h.key === CSP_HEADER))
const [cspRule, ...extraCspRules] = cspRules
if (cspRule === undefined || extraCspRules.length > 0) {
  fail(`expected exactly ONE vercel.json rule carrying ${CSP_HEADER}, found ${cspRules.length} — refusing to serve an ambiguous policy.`)
}
if (cspRule.source !== '/(.*)') {
  fail(`the ${CSP_HEADER} rule is scoped to "${cspRule.source}", not the "/(.*)" catch-all — the harness serves every path, so this would misrepresent enforcement.`)
}
const headerBlock: readonly VercelHeaderEntry[] = cspRule.headers

function makeHandler(applyCsp: boolean) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')
    const rel = normalize(urlPath).replace(/^[/\\]+/, '')
    let filePath = resolve(DIST, rel)

    // Path-traversal guard: the resolved path must stay inside dist/.
    if (filePath !== DIST && !filePath.startsWith(DIST + sep)) {
      res.writeHead(403).end('forbidden')
      return
    }

    const ext = extname(filePath)
    if (ext === '') {
      filePath = join(DIST, 'index.html') // SPA navigateFallback parity for extensionless routes
    } else if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      // A missing hashed asset must FAIL LOUD (404), never fall back to HTML — serving HTML where JS
      // is expected would, under nosniff, look like a confusing CSP failure instead of a renamed chunk.
      res.writeHead(404).end('not found')
      return
    }

    const body = readFileSync(filePath)
    // Apply the SHIPPED vercel.json catch-all headers first (validated `/(.*)` → every response)...
    for (const { key, value } of headerBlock) {
      if (!applyCsp && key === CSP_HEADER) continue // control port: omit ONLY the CSP
      res.setHeader(key, value)
    }
    // ...then the Content-Type (harness-owned, authoritative — vercel.json carries no Content-Type).
    res.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream')
    res.writeHead(200).end(body)
  }
}

const builtAt = statSync(join(DIST, 'index.html')).mtime.toISOString()

createServer(makeHandler(true)).listen(ENFORCED_PORT, HOST, () => {
  console.log(`[csp-harness] ENFORCED  http://${HOST}:${ENFORCED_PORT}  (CSP applied)   dist built ${builtAt}`)
})
createServer(makeHandler(false)).listen(CONTROL_PORT, HOST, () => {
  console.log(`[csp-harness] CONTROL   http://${HOST}:${CONTROL_PORT}  (NO CSP header)`)
})
