import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface VercelHeader {
  key: string
  value: string
}
interface VercelConfig {
  headers: { source: string; headers: VercelHeader[] }[]
}

const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf-8')) as VercelConfig
const rule = vercel.headers[0]
const csp = rule?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''

// Parse into a directive→value map so the WHOLE policy can be matched EXACTLY, not by substring: an
// additive loosening like `connect-src 'self' https://attacker` keeps the `connect-src 'self'` substring
// (a `toContain` would stay green) while opening an exfil/RCE channel. Exact-match reds on ANY such drift.
// FAIL LOUD on a duplicate directive: the browser enforces the FIRST occurrence and ignores the rest, so a
// last-wins parser could read a tight duplicate while the browser enforces a loose first copy — a hole in a
// guard sold as loosen-proof. Our policy has no duplicates; a duplicate is itself a red flag (insight 016).
function directiveMap(policy: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const part of policy.split(';')) {
    const t = part.trim()
    if (t === '') continue
    const i = t.indexOf(' ')
    const name = i === -1 ? t : t.slice(0, i)
    if (map.has(name)) throw new Error(`[csp guard] duplicate directive "${name}" — the browser enforces the FIRST; refusing the ambiguity`)
    map.set(name, i === -1 ? '' : t.slice(i + 1).trim())
  }
  return map
}
const directives = directiveMap(csp)

// Regression guard for the in-memory trust boundary: a loosened vercel.json CSP is the one change
// that would silently un-protect the decrypted model. This asserts the vercel.json STRING; real
// browser ENFORCEMENT (an injected inline script is blocked AND the engine worker still constructs)
// is proven by e2e/csp.spec.ts — `pnpm verify:csp`, CI-gated — which serves dist/ through
// scripts/serve-dist-with-headers.ts with these exact headers applied.
describe('vercel.json CSP — regression guard', () => {
  it('exists and applies to all routes', () => {
    expect(rule?.source).toBe('/(.*)')
    expect(csp.length).toBeGreaterThan(0)
  })

  it('matches the FULL expected directive table exactly — deny-by-default; any drift/loosen/add/remove reds', () => {
    // The COMPLETE shipped policy as an exact directive→value table. Asserting the WHOLE policy (not a
    // hand-picked subset) closes EVERY exfil channel CLAUDE.md names — connect-src AND img-src AND
    // form-action — plus every 'none' sink, in one deny-by-default check: a loosened, added, removed, or
    // drifted directive each reds it. A deliberate CSP change (e.g. a future motion `style-src` nonce or
    // `wasm-unsafe-eval`) MUST update this table and re-confirm enforcement — the policy is load-bearing
    // and may not drift silently. Values mirror vercel.json (single source of truth). (insight 016)
    const EXPECTED: Record<string, string> = {
      'default-src': "'self'",
      'script-src': "'self'",
      'style-src': "'self'",
      'img-src': "'self' data:",
      'font-src': "'self'",
      'connect-src': "'self'",
      'worker-src': "'self'",
      'manifest-src': "'self'",
      'frame-src': "'none'",
      'child-src': "'none'",
      'media-src': "'none'",
      'object-src': "'none'",
      'base-uri': "'none'",
      'frame-ancestors': "'none'",
      'form-action': "'self'",
    }
    expect(Object.fromEntries(directives)).toEqual(EXPECTED)
    // Belt-and-suspenders whole-string check: no inline/eval escape anywhere in the policy.
    expect(csp).not.toContain("'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('the directive parser fails loud on a duplicate (the browser enforces the FIRST, not the last)', () => {
    // A first-loose/last-tight duplicate would slip a last-wins parser; the throw closes that bypass.
    expect(() => directiveMap("connect-src 'self' https://evil; connect-src 'self'")).toThrow(/duplicate directive/)
  })

  it('sets the supporting security headers', () => {
    const keys = rule?.headers.map((h) => h.key) ?? []
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
  })
})
