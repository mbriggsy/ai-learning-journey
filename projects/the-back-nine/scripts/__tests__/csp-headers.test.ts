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

// Parse into a directive→value map so the security-critical directives can be matched EXACTLY, not by
// substring: an additive loosening like `connect-src 'self' https://attacker` keeps the
// `connect-src 'self'` substring (a `toContain` would stay green) while opening an exfil/RCE channel.
// Exact-match reds on ANY such loosening (verified by the e2e's behavioral connect-src/script-src arms).
function directiveMap(policy: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const part of policy.split(';')) {
    const t = part.trim()
    if (t === '') continue
    const i = t.indexOf(' ')
    map.set(i === -1 ? t : t.slice(0, i), i === -1 ? '' : t.slice(i + 1).trim())
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

  it('locks script-execution + exfil + worker directives to EXACT values (an additive loosen reds this)', () => {
    // Exact, not substring — these gate XSS code-execution (script-src), model exfil (connect-src),
    // and worker origin. A `script-src 'self' https://cdn.evil` / `connect-src 'self' https://evil`
    // loosening keeps the old substring but fails here.
    expect(directives.get('default-src')).toBe("'self'")
    expect(directives.get('script-src')).toBe("'self'")
    expect(directives.get('connect-src')).toBe("'self'")
    expect(directives.get('worker-src')).toBe("'self'")
    // No inline/eval escape anywhere in the policy.
    expect(csp).not.toContain("'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('locks the dangerous sinks to none (exact)', () => {
    expect(directives.get('object-src')).toBe("'none'")
    expect(directives.get('base-uri')).toBe("'none'")
    expect(directives.get('frame-ancestors')).toBe("'none'")
  })

  it('sets the supporting security headers', () => {
    const keys = rule?.headers.map((h) => h.key) ?? []
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
  })
})
