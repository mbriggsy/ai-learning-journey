import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The token-sheet contrast gate (source-bind pattern, docs/insights/032): every fact
 * asserted here is RE-DERIVED from the committed src/ui/styles/theme.css text — never
 * re-typed. If a token hex drifts below its WCAG floor, this fails; if a token is
 * renamed/removed, the lookup throws (fail-loud, burned/062 — no silent fallback).
 *
 * Floors (WCAG 2.2): 4.5:1 for normal text (SC 1.4.3); 3:1 for UI component
 * boundaries (SC 1.4.11). The planted-fail arm proves the gate can fail (burned/070):
 * the reference's own blue and its axis grey fail where B9 replaced them — that is exactly
 * why theme.css carries the -ink tokens.
 *
 * Act 6 · RC21: the old sheet (`tokens.css`, the Clubhouse Ledger palette) left with its last reader, and its contrast
 * pairs and the token-name collision arm (a legacy name re-valued by a later layer) left with it: there is one sheet.
 */

const here = dirname(fileURLToPath(import.meta.url))
const THEME_PATH = join(here, '..', 'styles', 'theme.css')

/** Extract every `--name: #hex` declaration from the committed sheet. */
function parseHexTokens(css: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    out.set(m[1]!, m[2]!.toLowerCase())
  }
  return out
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const chan = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = chan((n >> 16) & 0xff)
  const g = chan((n >> 8) & 0xff)
  const b = chan(n & 0xff)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio (order-independent). */
function contrast(hexA: string, hexB: string): number {
  const la = luminance(hexA)
  const lb = luminance(hexB)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

describe('canonical-source rule — no raw hex outside theme.css', () => {
  // Mirrors the engine-constants shape test: a dated figure is never re-typed
  // elsewhere. Walk every committed .css file under src/ and assert theme.css is
  // the only one declaring hex colors (the data hues live in src/viz/palette.ts).
  function cssFilesUnder(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) out.push(...cssFilesUnder(p))
      else if (p.endsWith('.css')) out.push(p)
    }
    return out
  }

  it('every src/**/*.css except theme.css is hex-free (reads var() only)', () => {
    // theme.css is Act 6's canonical token sheet (plan 6-rightcapital-ui-plan.md, 2.3); chartTheme.css stays var-only.
    const HEX = /#[0-9a-fA-F]{3,8}\b/
    const all = cssFilesUnder(join(here, '..', '..'))
    const theme = all.filter((p) => p === THEME_PATH)
    const rest = all.filter((p) => p !== THEME_PATH)
    // Not vacuous: the walk reaches the sheet the rule exempts and the sheets it binds (the chart sheet among them), and
    // the pattern finds the colours the exempt sheet really declares (the control: a pattern that matched nothing would
    // pass every file).
    expect(theme, 'the walk finds theme.css').toHaveLength(1)
    expect(rest.some((p) => p.endsWith(join('charts', 'chartTheme.css'))), 'the walk reaches chartTheme.css').toBe(true)
    expect(HEX.test(readFileSync(THEME_PATH, 'utf8')), 'the hex pattern finds theme.css’s own colours').toBe(true)
    expect(rest.filter((p) => HEX.test(readFileSync(p, 'utf8')))).toEqual([])
  })

  it('a blocked button never darkens on hover: every kit Button hover fill is `not-aria-disabled:` (Act 6 · RC19)', () => {
    // Card 14a moved the goal picker's confirm from native `disabled` to `aria-disabled` (the BudgetBuilder law), and a
    // hover press-darken written as `:not(:disabled):hover` stops excluding the button the instant the native attribute
    // is gone: the blocked CTA would darken on hover and begin to feel pressable. No gate can see it (jsdom loads no
    // stylesheet, no browser gate hovers a button: insight 131, face #2), so the SOURCE is pinned. Until RC19 the rule
    // was `.btn-primary`'s in intake.css; RC19 deleted that sheet and every vault screen draws the kit's Button, so the
    // pin moved to the kit: every `hover:` class in Button.tsx's variants carries the `not-aria-disabled:` variant first.
    // Non-vacuity: at least one hover class that sets a fill exists.
    const button = readFileSync(join(here, '..', 'kit', 'Button.tsx'), 'utf8')
    const variants = button.slice(button.indexOf('const VARIANT'), button.indexOf('const SIZE'))
    const hovers = [...variants.matchAll(/(\S*)hover:(\S+?)['\s]/g)].map((m) => ({ prefix: m[1]!, utility: m[2]! }))
    expect(hovers.filter((h) => h.utility.startsWith('bg-')).length, 'the hover press-darken exists (the arm is not vacuous)').toBeGreaterThan(0)
    const leaking = hovers.filter((h) => !h.prefix.endsWith('not-aria-disabled:'))
    expect(leaking, 'a hover class on a kit button that does not exclude aria-disabled').toEqual([])
  })
})

// ─── Act 6: the token sheet theme.css (plan 6-rightcapital-ui-plan.md, 2.1 decision 3 and 2.2) ─────────────────────
describe('Act 6: theme.css contrast (the critique’s fixes, plan 2.2)', () => {
  const theme = parseHexTokens(readFileSync(THEME_PATH, 'utf8'))
  const t = (name: string): string => {
    const v = theme.get(name)
    if (v === undefined) throw new Error(`token --${name} missing from theme.css — gate cannot run`)
    return v
  }
  // Each row is a pair the plan's table names, as it sits on the page. Text: 4.5:1 (SC 1.4.3).
  const TEXT: ReadonlyArray<readonly [fg: string, bg: string]> = [
    ['color-stone-600', 'color-stone-100'], // muted text in card bodies and the tray
    ['color-stone-600', 'color-stone-200'], // table headers, sub-nav, read-only inputs
    ['color-stone-600', 'color-stone-250'], // table group headers
    ['color-stone-600', 'color-bg'],
    ['color-blue-ink', 'color-bg'], // links, the ACTION ITEMS label
    ['color-blue-ink', 'color-blue-changed'], // the tray's changed value
    ['color-blue-ink', 'color-stone-100'], // links in the tray
    ['color-blue-ink', 'color-stone-200'],
    ['color-blue-ink', 'color-stone-250'],
    ['color-bg', 'color-blue-ink'], // primary buttons, the Add menus
    ['color-bg', 'color-coral-ink'], // Delete
    ['color-bg', 'color-plum'], // card bands, the drawer header
    ['color-plum', 'color-bg'], // titles
    ['color-stone-900', 'color-stone-300'], // the outlined neutral button's text near its edge
    ['color-stone-900', 'color-blue-tint'],
  ]
  it.each(TEXT)('text --%s on --%s ≥ 4.5:1', (fg, bg) => {
    expect(contrast(t(fg), t(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it('the focus ring (blue-ink) clears 3:1 against the page (SC 1.4.11)', () => {
    expect(contrast(t('color-blue-ink'), t('color-bg'))).toBeGreaterThanOrEqual(3)
  })

  it('theme.css resets Tailwind’s default theme before its own tokens (--*: initial): every token has a role name', () => {
    expect(readFileSync(THEME_PATH, 'utf8')).toMatch(/@theme[^{]*\{\s*--\*:\s*initial;/)
  })

  it('PLANTED: the reference’s own picks fail where B9 replaced them (why the -ink tokens exist)', () => {
    // --color-blue as text on the tray, and --color-stone-500 on a table header: the critique's measured failures.
    expect(contrast(t('color-blue'), t('color-stone-100'))).toBeLessThan(4.5)
    expect(contrast(t('color-stone-500'), t('color-stone-200'))).toBeLessThan(4.5)
  })
})
