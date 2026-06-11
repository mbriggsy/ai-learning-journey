import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

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

  it('every src/**/*.css except tokens.css is hex-free (reads var() only)', () => {
    const srcRoot = join(here, '..', '..')
    const offenders = cssFilesUnder(srcRoot)
      .filter((p) => !p.endsWith(join('styles', 'tokens.css')))
      .filter((p) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(p, 'utf8')))
    expect(offenders).toEqual([])
  })
})
