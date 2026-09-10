import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { BP_LAPTOP_REM, BROWSER_DEFAULT_PX, FLOOR } from '../../e2e/reviewSurface'

/*
 * scripts/__tests__/breakpoint-mirrors.test.ts — the `--bp-laptop` SOURCE-BIND.
 *
 * `src/ui/styles/tokens.css` declares `--bp-laptop: 68rem` as the two-pane breakpoint, and its own
 * comment says why every consumer re-types it: an `@media` query CANNOT read a custom property, so
 * the value is RE-STATED as a bare literal in ~15 `@media (min-width: 68rem)` rules across the CSS,
 * in `window.matchMedia('(min-width: 68rem)')` inside the vertical-fit harness, and (as pixels) in
 * `e2e/reviewSurface.ts`'s FLOOR arm. Nothing tied those copies to the declaration, so moving the
 * token would leave every mirror silently pointing at the OLD seam — the fit gate would then measure
 * a viewport the CSS no longer two-panes, and stay green while proving nothing. Council 2026-09-10
 * (wf_d2b1d05a-001, item 6) ordered this bind.
 *
 * Sibling of playwright-projects.test.ts and pwa-icons.test.ts: read the REAL bytes of the shipped
 * files, pin the halves against each other, authored failure messages. Deliberately NOT a total
 * count — a count reds on every innocent add/remove and teaches the reader to re-baseline it. What
 * is pinned instead: (a) each file that carries a mirror TODAY still carries one (a mirror vanishing
 * from a surface is a real two-pane regression), and (b) EVERY mirror found anywhere agrees with the
 * token. A NEW mirror in a new file needs no edit here — it is checked by (b) the moment it lands.
 */

const ROOT = process.cwd()
const TOKENS_PATH = join(ROOT, 'src', 'ui', 'styles', 'tokens.css')

/**
 * The files that carry a `--bp-laptop` mirror today. If a mirror disappears from one of these, the
 * surface stopped two-paning at the shared seam — that is a product regression, not a cleanup, so
 * it reds here and has to be justified by deleting the entry deliberately.
 */
const REQUIRED_MIRROR_FILES = [
  'src/intake/budget.css',
  'src/intake/controls.css',
  'src/intake/sheetShell.css',
  'src/ui/styles/app.css',
  'src/ui/styles/confidence.css',
  'src/ui/styles/fuckOffDate.css',
  'src/ui/styles/recommendation.css',
  'src/ui/styles/result.css',
  'e2e/vertical-fit.spec.ts',
] as const

/** Every `(min-width: <N>rem)` in the tree — the @media form and the matchMedia string are the same
 *  bytes, so one pattern catches both. Comments are scanned too, ON PURPOSE: a stale "68rem" in a
 *  doc comment beside a moved token is exactly the kind of quiet lie this file exists to stop. */
const MIRROR_RE = /\(\s*min-width:\s*([0-9]+(?:\.[0-9]+)?)rem\s*\)/g

interface Mirror {
  readonly file: string
  readonly line: number
  readonly rem: number
  readonly text: string
}

/** POSIX-style path relative to the repo root, so the assertions read the same on Windows and CI. */
function rel(absolute: string): string {
  return relative(ROOT, absolute).split(sep).join('/')
}

function filesUnder(dir: string, matches: (name: string) => boolean): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      out.push(...filesUnder(full, matches))
    } else if (entry.isFile() && matches(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function mirrorsIn(absolute: string): Mirror[] {
  const source = readFileSync(absolute, 'utf-8')
  const file = rel(absolute)
  const out: Mirror[] = []
  source.split(/\r?\n/).forEach((text, i) => {
    for (const m of text.matchAll(MIRROR_RE)) {
      out.push({ file, line: i + 1, rem: Number.parseFloat(m[1]!), text: text.trim() })
    }
  })
  return out
}

/** The declared token — read, never re-typed. Absence is a LOUD failure, not a skip: a silently
 *  missing token would make every mirror below vacuously "agree" with nothing. */
function declaredBpLaptopRem(): number {
  const tokens = readFileSync(TOKENS_PATH, 'utf-8')
  const m = /--bp-laptop:\s*([0-9]+(?:\.[0-9]+)?)rem\s*;/.exec(tokens)
  if (m === null) {
    throw new Error(
      `[bp-laptop] no \`--bp-laptop: <N>rem;\` declaration in ${rel(TOKENS_PATH)} — the two-pane ` +
        `breakpoint has no source of truth, so every literal mirror in the CSS is unanchored.`,
    )
  }
  return Number.parseFloat(m[1]!)
}

const TOKEN_REM = declaredBpLaptopRem()
const ALL_MIRRORS = [
  ...filesUnder(join(ROOT, 'src'), (n) => n.endsWith('.css')),
  ...filesUnder(join(ROOT, 'e2e'), (n) => n.endsWith('.ts')),
].flatMap(mirrorsIn)

describe('--bp-laptop source-bind', () => {
  it('declares the two-pane breakpoint in tokens.css', () => {
    expect(TOKEN_REM, `[bp-laptop] ${rel(TOKENS_PATH)} must declare a positive rem breakpoint`).toBeGreaterThan(0)
  })

  it('finds mirrors to check (the sweep is not vacuous)', () => {
    expect(
      ALL_MIRRORS.length,
      `[bp-laptop] the sweep of src/**/*.css + e2e/**/*.ts found NO \`(min-width: <N>rem)\` at all — ` +
        `the pattern or the walk broke, and every assertion below would pass vacuously.`,
    ).toBeGreaterThan(10)
  })

  it.each(REQUIRED_MIRROR_FILES)('%s still carries a --bp-laptop mirror', (file) => {
    const here = ALL_MIRRORS.filter((m) => m.file === file)
    expect(
      here.length,
      `[bp-laptop] ${file} carries NO \`(min-width: ${TOKEN_REM}rem)\` any more. Either the surface ` +
        `stopped two-paning at the shared seam (a regression — the fit law assumes it does), or the ` +
        `mirror moved on purpose, in which case delete this entry from REQUIRED_MIRROR_FILES.`,
    ).toBeGreaterThan(0)
  })

  it('every min-width rem mirror equals the token', () => {
    const wrong = ALL_MIRRORS.filter((m) => m.rem !== TOKEN_REM)
    expect(
      wrong.map((m) => `${m.file}:${m.line} → ${m.rem}rem (token is ${TOKEN_REM}rem) :: ${m.text}`),
      `[bp-laptop] a \`(min-width: <N>rem)\` disagrees with \`--bp-laptop: ${TOKEN_REM}rem\` in ` +
        `${rel(TOKENS_PATH)}. @media cannot read a custom property, so these literals ARE the ` +
        `contract — fix the mirror, or move the token and every mirror together.`,
    ).toEqual([])
  })

  it("e2e/reviewSurface.ts's BP_LAPTOP_REM mirrors the token", () => {
    expect(
      BP_LAPTOP_REM,
      `[bp-laptop] e2e/reviewSurface.ts exports BP_LAPTOP_REM=${BP_LAPTOP_REM} while ` +
        `${rel(TOKENS_PATH)} declares ${TOKEN_REM}rem — the review harness would size its FLOOR arm ` +
        `at a width the CSS does not two-pane.`,
    ).toBe(TOKEN_REM)
  })

  it("e2e/reviewSurface.ts's FLOOR width is the token resolved at the default root font size", () => {
    expect(
      FLOOR.width,
      `[bp-laptop] FLOOR.width=${FLOOR.width} is not ${TOKEN_REM}rem × ${BROWSER_DEFAULT_PX}px. The ` +
        `FLOOR arm exists to sit EXACTLY on the two-pane seam (the honesty floor); a width off the ` +
        `seam measures a layout no user is at.`,
    ).toBe(TOKEN_REM * BROWSER_DEFAULT_PX)
  })
})
