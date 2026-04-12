/// <reference types="node" />
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Verify structural correctness of the reduced-motion CSS fork.
// Full Playwright coverage lands in Phase 5. This suite catches regressions
// where a Phase 2-4 commit accidentally removes an essential token.

const __dir = dirname(fileURLToPath(import.meta.url))

const primitivesCss = readFileSync(
  resolve(__dir, '../primitives.css'),
  'utf-8',
)

describe('reduced-motion token structure', () => {
  test('primitives.css contains @media (prefers-reduced-motion: reduce) block', () => {
    expect(primitivesCss).toContain('prefers-reduced-motion: reduce')
  })

  test('essential tokens are NOT zeroed in reduced-motion block', () => {
    const rmMatch = primitivesCss.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\s*\}/,
    )
    expect(rmMatch, 'reduced-motion block not found').toBeTruthy()
    const rmBlock = rmMatch![0]

    expect(rmBlock).not.toMatch(/--motion-duration-essential-pulse:\s*0ms/)
    expect(rmBlock).not.toMatch(/--motion-duration-essential-spin:\s*0ms/)
    expect(rmBlock).not.toMatch(/--motion-duration-essential-flash:\s*0ms/)
  })

  test('decorative tokens ARE zeroed in reduced-motion block', () => {
    const rmMatch = primitivesCss.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\s*\}/,
    )
    const rmBlock = rmMatch![0]

    expect(rmBlock).toMatch(/--motion-duration-fast:\s*0ms/)
    expect(rmBlock).toMatch(/--motion-duration-base:\s*0ms/)
    expect(rmBlock).toMatch(/--motion-duration-slow:\s*0ms/)
    expect(rmBlock).toMatch(/--motion-duration-dramatic:\s*0ms/)
  })
})
