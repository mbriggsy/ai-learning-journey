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

// Regression guard for the in-memory trust boundary: a loosened vercel.json CSP is
// the one change that would silently un-protect the decrypted model. (Browser
// enforcement itself is verified manually via the header-serving harness + Playwright.)
describe('vercel.json CSP — regression guard', () => {
  it('exists and applies to all routes', () => {
    expect(rule?.source).toBe('/(.*)')
    expect(csp.length).toBeGreaterThan(0)
  })

  it('locks scripts to same-origin with no inline or eval escape', () => {
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('blocks programmatic exfil and dangerous sinks', () => {
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('confines the engine worker to same-origin', () => {
    expect(csp).toContain("worker-src 'self'")
  })

  it('sets the supporting security headers', () => {
    const keys = rule?.headers.map((h) => h.key) ?? []
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
  })
})
