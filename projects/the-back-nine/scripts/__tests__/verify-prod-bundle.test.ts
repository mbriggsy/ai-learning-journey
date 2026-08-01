import { describe, it, expect } from 'vitest'
import { checkBundleBudget, initialJsFromHtml, BUNDLE_BUDGET_BYTES } from '../verify-prod-bundle'

describe('bundle byte-budget sentinel', () => {
  it('passes when initial JS is under budget', () => {
    const r = checkBundleBudget([{ name: '/assets/a.js', bytes: 100 * 1024 }])
    expect(r.ok).toBe(true)
  })

  it('FAILS when initial JS exceeds budget (the planted-oversize case)', () => {
    // ⚠️ THE BUDGET'S VALUE IS PINNED HERE, and it must be — every other arm in this file is
    // BUDGET-RELATIVE (`BUNDLE_BUDGET_BYTES + 1`, or a literal well under it), so raising the
    // constant to 3 MiB would leave the whole sentinel GREEN while the gate it names is
    // effectively disarmed. 300 KiB is a documented contract (CLAUDE.md's commands table:
    // "Initial-JS byte budget sentinel (≤ 300 KiB entry JS)"), not an implementation detail —
    // a deliberate raise must edit this line and say why in the commit.
    expect(BUNDLE_BUDGET_BYTES, 'the shipped budget is 300 KiB — loosening it is a decision, never a silent edit').toBe(
      300 * 1024,
    )
    const r = checkBundleBudget([{ name: '/assets/huge.js', bytes: BUNDLE_BUDGET_BYTES + 1 }])
    expect(r.ok).toBe(false)
    expect(r.totalBytes).toBeGreaterThan(r.budgetBytes)
  })

  it('sums multiple initial-JS files', () => {
    const r = checkBundleBudget(
      [
        { name: '/assets/a.js', bytes: 200 * 1024 },
        { name: '/assets/b.js', bytes: 200 * 1024 },
      ],
      300 * 1024,
    )
    expect(r.ok).toBe(false)
    expect(r.totalBytes).toBe(400 * 1024)
  })

  it('parses entry script + modulepreload links from index.html', () => {
    const html =
      '<script type="module" crossorigin src="/assets/index-abc.js"></script>' +
      '<link rel="modulepreload" href="/assets/dep-def.js">'
    expect(initialJsFromHtml(html).sort()).toEqual(['/assets/dep-def.js', '/assets/index-abc.js'])
  })

  it('excludes the worker chunk (it is not referenced in index.html)', () => {
    const html = '<script type="module" src="/assets/index-abc.js"></script>'
    expect(initialJsFromHtml(html)).not.toContain('/assets/engine.worker-xyz.js')
  })
})
