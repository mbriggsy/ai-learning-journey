import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Phase 9 / inherited Phase-1 #1 — token-boundary guard (backs README verification item 19).
//
// Only the token layer may name colors: tokens.physical.css defines the --c-* raw values,
// tokens.semantic.css maps them to roles. EVERY other stylesheet — components, pages, global —
// must consume SEMANTIC tokens only. That keeps a palette change a one-file edit and makes
// light/dark a variable swap rather than a parallel stylesheet (Visual system, plans/README.md).
//
// Enforced as a vitest test, not stylelint, to reuse the existing gate with zero new toolchain.

const SRC = join(process.cwd(), 'src')
const TOKEN_LAYER = ['tokens.physical.css', 'tokens.semantic.css']

function cssFilesUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...cssFilesUnder(full))
    else if (entry.name.endsWith('.css')) out.push(full)
  }
  return out
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const HEX = /#[0-9a-fA-F]{3,8}\b/
const PHYSICAL_TOKEN = /var\(\s*--c-/

describe('token boundary (verification item 19)', () => {
  const guarded = cssFilesUnder(SRC).filter((p) => !TOKEN_LAYER.some((t) => p.endsWith(t)))

  // Guard against a walk that silently finds nothing — an empty set would pass every assertion
  // below and lie that the boundary holds (insight 001 corollary: empty ≠ absent).
  it('scans real stylesheets beyond the token layer', () => {
    expect(guarded.length).toBeGreaterThan(0)
  })

  for (const path of guarded) {
    const rel = path.slice(SRC.length + 1).replace(/\\/g, '/')
    const body = stripComments(readFileSync(path, 'utf8'))
    it(`${rel}: no raw hex (semantic tokens only)`, () => {
      expect(body).not.toMatch(HEX)
    })
    it(`${rel}: no --c-* physical token reference`, () => {
      expect(body).not.toMatch(PHYSICAL_TOKEN)
    })
  }
})
