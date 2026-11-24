import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { seriesVars } from '../../viz/charts/seriesVars'

/**
 * The token-sheet contrast gate (source-bind pattern, docs/insights/032): every fact
 * asserted here is RE-DERIVED from the committed src/ui/styles/tokens.css text — never
 * re-typed. If a token hex drifts below its WCAG floor, this fails; if a token is
 * renamed/removed, the lookup throws (fail-loud, burned/062 — no silent fallback).
 *
 * Floors (WCAG 2.2): 4.5:1 for normal text (SC 1.4.3); 3:1 for UI component
 * boundaries (SC 1.4.11). The planted-fail arm proves the gate can fail (burned/070):
 * raw Okabe–Ito vermilion on paper is a KNOWN small-text failure — that is exactly why
 * tokens.css carries the darkened derivative --error-ink instead.
 */

const here = dirname(fileURLToPath(import.meta.url))
const TOKENS_PATH = join(here, '..', 'styles', 'tokens.css')
const tokensCss = readFileSync(TOKENS_PATH, 'utf8')

/** Extract every `--name: #hex` declaration from the committed sheet. */
function parseHexTokens(css: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    out.set(m[1]!, m[2]!.toLowerCase())
  }
  return out
}

const tokens = parseHexTokens(tokensCss)

function hexOf(name: string): string {
  const v = tokens.get(name)
  if (v === undefined) throw new Error(`token --${name} missing from tokens.css — gate cannot run`)
  return v
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

describe('tokens.css — WCAG contrast gate (derived from the committed sheet)', () => {
  // ----- text pairs: ≥ 4.5:1 (SC 1.4.3) -----
  const TEXT_PAIRS: ReadonlyArray<readonly [fg: string, bg: string]> = [
    ['ink', 'paper'],
    ['ink', 'paper-raised'],
    ['ink', 'brand-tint'],
    ['ink-muted', 'paper'],
    ['ink-muted', 'paper-raised'],
    ['error-ink', 'paper'],
    ['error-ink', 'paper-raised'],
    ['error-ink', 'error-fill'],
    ['brand', 'paper'], // headings + link text
    ['brand', 'paper-raised'],
    ['brand', 'brand-tint'], // text on the selected wash
    ['on-brand', 'brand'], // button labels on the brand CTA
  ]

  it.each(TEXT_PAIRS)('text --%s on --%s ≥ 4.5:1', (fg, bg) => {
    expect(contrast(hexOf(fg), hexOf(bg))).toBeGreaterThanOrEqual(4.5)
  })

  // ----- UI component boundaries: ≥ 3:1 (SC 1.4.11) -----
  const UI_PAIRS: ReadonlyArray<readonly [fg: string, bg: string]> = [
    ['line-control', 'paper'], // field borders on the page
    ['line-control', 'paper-raised'], // field borders on input wells
    ['brand', 'paper'], // the global focus ring vs the page
  ]

  it.each(UI_PAIRS)('UI boundary --%s vs --%s ≥ 3:1', (fg, bg) => {
    expect(contrast(hexOf(fg), hexOf(bg))).toBeGreaterThanOrEqual(3)
  })

  // ----- planted-fail arm (burned/070): the gate must be able to fail -----
  it('raw Okabe–Ito vermilion #D55E00 on paper FAILS the 4.5:1 text floor (why --error-ink is a derivative)', () => {
    expect(contrast('#d55e00', hexOf('paper'))).toBeLessThan(4.5)
  })

  it('--error-ink stays in the vermilion hue family (a derivative, not a re-pick)', () => {
    // Same-hue check, decidable without a color library: both are pure warm-orange
    // (R > G, B == 0 in the base; derivative keeps R:G within a narrow band of the
    // base ratio 213/94 ≈ 2.27).
    const hex = hexOf('error-ink')
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 0xff
    const g = (n >> 8) & 0xff
    const b = n & 0xff
    expect(b).toBeLessThanOrEqual(20)
    expect(r / g).toBeGreaterThan(1.8)
    expect(r / g).toBeLessThan(2.8)
  })
})

describe('canonical-source rule — no raw hex outside tokens.css', () => {
  // Mirrors the engine-constants shape test: a dated figure is never re-typed
  // elsewhere. Walk every committed .css file under src/ and assert tokens.css is
  // the only one declaring hex colors.
  function cssFilesUnder(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) out.push(...cssFilesUnder(p))
      else if (p.endsWith('.css')) out.push(p)
    }
    return out
  }

  it('every src/**/*.css except tokens.css and theme.css is hex-free (reads var() only)', () => {
    // theme.css is Act 6's canonical token sheet (plan 6-rightcapital-ui-plan.md, 2.3); chartTheme.css stays var-only.
    const srcRoot = join(here, '..', '..')
    const offenders = cssFilesUnder(srcRoot)
      .filter((p) => !p.endsWith(join('styles', 'tokens.css')) && !p.endsWith(join('styles', 'theme.css')))
      .filter((p) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(p, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('a blocked button never darkens on hover: every .btn-primary / .btn-quiet :hover rule that sets a fill excludes [aria-disabled="true"]', () => {
    // Card 14a moved the goal picker's confirm from native `disabled` to `aria-disabled` (the BudgetBuilder
    // law). The hover press-darken was written as `.btn-primary:not(:disabled):hover`, which stops
    // excluding the button the instant the native attribute is gone — the blocked CTA would darken on
    // hover and begin to feel pressable. No gate can see it: jsdom loads no stylesheet, ESLint reads no
    // CSS, and no browser gate hovers a button (insight 131, face #2). So the SELECTOR is pinned here, by
    // the same source-bind idiom as the hex arm: every hover rule on either button class that touches
    // the fill must carry `:not([aria-disabled='true'])`. Non-vacuity: at least one such rule must exist.
    const srcRoot = join(here, '..', '..')
    const rules: { file: string; selector: string }[] = []
    for (const p of cssFilesUnder(srcRoot)) {
      const css = readFileSync(p, 'utf8')
      for (const m of css.matchAll(/([^{}]*?)\s*\{([^{}]*)\}/g)) {
        const selector = m[1]!.trim()
        const body = m[2]!
        if (!/:hover/.test(selector) || !/\.btn-(?:primary|quiet)\b/.test(selector)) continue
        if (!/\bbackground(?:-color)?\s*:/.test(body)) continue
        rules.push({ file: p.slice(srcRoot.length + 1), selector })
      }
    }
    expect(rules.length, 'the hover press-darken rule exists (the arm is not vacuous)').toBeGreaterThan(0)
    const leaking = rules.filter((r) => !/:not\(\[aria-disabled=['"]true['"]\]\)/.test(r.selector))
    expect(leaking, 'a hover fill rule on a button class that does not exclude aria-disabled').toEqual([])
  })
})

// ─── Act 6: the token sheet theme.css (plan 6-rightcapital-ui-plan.md, 2.1 decision 3 and 2.2) ─────────────────────
const SRC_ROOT = join(here, '..', '..')
const THEME_PATH = join(here, '..', 'styles', 'theme.css')
/** The sheets Act 6 adds (everything else under src/ is a legacy sheet, wrapped in `@layer legacy`). */
const NEW_SHEETS = [THEME_PATH, join(SRC_ROOT, 'viz', 'charts', 'chartTheme.css'), join(here, '..', 'styles', 'layers.css')]

function allCssUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...allCssUnder(p))
    else if (p.endsWith('.css')) out.push(p)
  }
  return out
}

/** Every custom property a sheet DECLARES (a `--name:` after a brace, a semicolon or whitespace), comments stripped. */
function declaredProps(css: string): Set<string> {
  const out = new Set<string>()
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[{;\s])(--[a-zA-Z0-9_-]+)\s*:/g)) out.add(m[1]!)
  return out
}

describe('Act 6: no token name is shared between the legacy sheets and the new ones', () => {
  // A later layer's `:root` silently re-values an old surface's variable of the same name (Tailwind's default theme
  // alone carries --text-xs, --radius-sm, --ease-out and --leading-*, all names tokens.css uses). theme.css starts its
  // `@theme` with `--*: initial` and uses role names only; this arm proves it.
  const legacy = new Set<string>()
  for (const p of allCssUnder(SRC_ROOT).filter((p) => !NEW_SHEETS.includes(p))) {
    for (const name of declaredProps(readFileSync(p, 'utf8'))) legacy.add(name)
  }
  const fresh = new Set<string>(seriesVars().map(([name]) => name))
  for (const p of NEW_SHEETS) for (const name of declaredProps(readFileSync(p, 'utf8'))) fresh.add(name)

  it('reads real declarations on both sides (the arm is not vacuous)', () => {
    expect(legacy.has('--radius-sm'), 'tokens.css declares --radius-sm').toBe(true)
    expect(fresh.has('--color-stone-200'), 'theme.css declares --color-stone-200').toBe(true)
    expect(fresh.has('--highcharts-color-0'), 'the CSSOM write sets --highcharts-color-0').toBe(true)
  })

  it('no custom property is declared on both sides', () => {
    expect([...fresh].filter((name) => legacy.has(name)).sort()).toEqual([])
  })

  it('theme.css resets Tailwind’s default theme before its own tokens (--*: initial)', () => {
    expect(readFileSync(THEME_PATH, 'utf8')).toMatch(/@theme[^{]*\{\s*--\*:\s*initial;/)
  })
})

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

  it('PLANTED: the reference’s own picks fail where B9 replaced them (why the -ink tokens exist)', () => {
    // --color-blue as text on the tray, and --color-stone-500 on a table header: the critique's measured failures.
    expect(contrast(t('color-blue'), t('color-stone-100'))).toBeLessThan(4.5)
    expect(contrast(t('color-stone-500'), t('color-stone-200'))).toBeLessThan(4.5)
  })
})
