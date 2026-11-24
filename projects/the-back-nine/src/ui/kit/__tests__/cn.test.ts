import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cn, KIT_THEME_SCALES } from '../cn'
import { tableNumber } from '../format'

/**
 * The kit's `cn` knows the role tokens (src/ui/kit/cn.ts): without them tailwind-merge reads `text-page-title` as a
 * text colour and drops it beside `text-plum`, and never merges two radii it does not know. The second arm reads
 * theme.css itself, so a token added to a role scale there and not here reds.
 */
const THEME = readFileSync(join(process.cwd(), 'src', 'ui', 'styles', 'theme.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')

/** theme.css's names in one namespace (`--text-page-title: …` → `page-title`), sub-properties (`--x--line-height`) left out. */
function declared(namespace: string): string[] {
  const re = new RegExp(`--${namespace}-([a-z0-9-]+?)\\s*:`, 'g')
  return [...THEME.matchAll(re)].map((m) => m[1]!).filter((name) => !name.includes('--'))
}

describe('cn: the role tokens merge by kind', () => {
  it('a type size and a text colour are different kinds (both kept)', () => {
    expect(cn('text-page-title', 'text-plum').split(' ').sort()).toEqual(['text-page-title', 'text-plum'])
    expect(cn('text-label text-stone-600', 'text-body')).toBe('text-stone-600 text-body')
  })

  it('two of the same role scale: the later wins', () => {
    expect(cn('rounded-control', 'rounded-card')).toBe('rounded-card')
    expect(cn('shadow-menu', 'shadow-drawer')).toBe('shadow-drawer')
    expect(cn('font-regular', 'font-semibold')).toBe('font-semibold')
    expect(cn('p-panel', 'p-8')).toBe('p-8')
  })

  it("every name in theme.css's role scales is known to cn", () => {
    const pairs: [string, readonly string[]][] = [
      ['text', KIT_THEME_SCALES.text],
      ['font-weight', KIT_THEME_SCALES['font-weight']],
      ['tracking', KIT_THEME_SCALES.tracking],
      ['radius', KIT_THEME_SCALES.radius],
      ['shadow', KIT_THEME_SCALES.shadow],
      ['spacing', KIT_THEME_SCALES.spacing],
      ['ease', KIT_THEME_SCALES.ease],
    ]
    for (const [namespace, known] of pairs) {
      const names = declared(namespace)
      expect(names.length, `theme.css declares no --${namespace}-* token: the read is broken`).toBeGreaterThan(0)
      expect(names.filter((n) => !known.includes(n)), `--${namespace}-* names missing from KIT_THEME_SCALES`).toEqual([])
    }
  })
})

describe('tableNumber: whole dollars, no $, negatives in parentheses', () => {
  it('formats', () => {
    expect(tableNumber(1234.4)).toBe('1,234')
    expect(tableNumber(-1234)).toBe('(1,234)')
    expect(tableNumber(-0.4)).toBe('0')
    expect(tableNumber(0)).toBe('0')
    expect(tableNumber(Number.NaN)).toBe('')
  })
})
