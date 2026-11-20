import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { BP_LAPTOP_REM, BROWSER_DEFAULT_PX, FLOOR, REAL } from '../../e2e/reviewSurface'

/*
 * scripts/__tests__/breakpoint-mirrors.test.ts — the `--bp-laptop` SOURCE-BIND.
 *
 * THE LAW THIS FILE ENFORCES, stated plainly (the 2026-09-10 council, wf_d2b1d05a-001, item 6):
 *
 *   This project has exactly ONE layout breakpoint — `--bp-laptop`, the two-pane seam declared in
 *   `src/ui/styles/tokens.css` — and it is written in REM, never px. `@media` cannot read a custom
 *   property, so the value is RE-TYPED as a bare literal in every `@media` rule, in the
 *   `window.matchMedia('…')` string the vertical-fit harness reads the tier from, and (resolved to
 *   pixels) in `e2e/reviewSurface.ts`'s FLOOR arm. Nothing tied those copies to the declaration, so
 *   moving the token would leave every mirror silently pointing at the OLD seam — the fit gate would
 *   then measure a viewport the CSS no longer two-panes, and stay green while proving nothing.
 *
 * So: every width breakpoint anywhere in the swept trees must BE that one seam. That is the reason
 * the equality below is deliberately total rather than an allowlist — a genuinely new tier is a
 * product decision, and the way to add one is to come here and say so, not to slip a second literal
 * past a guard. What is checked, exactly:
 *
 *   (a) REM — every `(min-width: <N>rem)` and `(max-width: <N>rem)` in `src/**\/*.{css,ts,tsx}`,
 *       `e2e/**\/*.ts` and `scripts/**\/*.ts` must equal the token. Comments are scanned too, ON
 *       PURPOSE: a stale "68rem" in prose beside a moved token is exactly the kind of quiet lie this
 *       file exists to stop. A `max-width` COMPLEMENT counts: a max-width written a hundredth of a
 *       rem below the seam is a re-typed derivative that drifts on its own once the token moves, and
 *       the honest spelling is `not (min-width: <token>rem)` (or the token value itself).
 *   (b) PX / EM — any px or em width breakpoint inside an `@media` prelude or a `matchMedia(…)`
 *       string under `src/**` reds outright: px was VETOED by the council (a px breakpoint cannot
 *       see a reader who raised the browser font, which is the whole reason the seam is rem).
 *       Scope, honestly: this arm reads LINE BY LINE and only lines that carry `@media` or
 *       `matchMedia(`, so a media prelude split across lines would escape it (this project writes
 *       them on one line), and `@container` queries are deliberately OUT — a container query is a
 *       component's own box, not the layout seam, and `src/viz` uses px ones on purpose.
 *   (c) PRESENCE — each file that carries a mirror TODAY still carries one. A mirror vanishing from
 *       a surface means that surface stopped two-paning at the shared seam: a product regression,
 *       not a cleanup. Deliberately NOT a total count — a count reds on every innocent add/remove
 *       and teaches the reader to re-baseline it. A NEW mirror in a NEW file needs no edit here; (a)
 *       checks it the moment it lands.
 *   (d) FLOOR — `e2e/reviewSurface.ts`'s BP_LAPTOP_REM equals the token, and its FLOOR width is that
 *       many rem resolved at the browser's default root font size, pinned as a literal 16 so the
 *       identity is not checked against itself.
 *
 * Sibling of playwright-projects.test.ts and pwa-icons.test.ts: read the REAL bytes of the shipped
 * files, pin the halves against each other, authored failure messages.
 */

const ROOT = process.cwd()
const TOKENS_PATH = join(ROOT, 'src', 'ui', 'styles', 'tokens.css')

/** The CSS initial `font-size` — the browser default one rem resolves to when the reader has not
 *  raised it. 16 is the spec's initial value, not a project choice, which is why it is pinned as a
 *  literal here and named (never inlined) in reviewSurface.ts. */
const CSS_INITIAL_FONT_PX = 16

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

/** Every rem width breakpoint: `min-width` or `max-width`, either side of the colon spaced however
 *  the author liked, decimals allowed, an optional space before the unit. The `@media` form and the
 *  `matchMedia` string are the same bytes, so one pattern catches both — and any prose copy too. */
const REM_BREAKPOINT_RE = /\(\s*(min|max)-width\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*rem\s*\)/g

/** The same shape in px or em — the VETOED units. Only applied to lines that are a media prelude or
 *  a matchMedia string (see (b) above); a bare px width elsewhere is an ordinary size, not a seam. */
const PX_BREAKPOINT_RE = /\(\s*(min|max)-width\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*(px|em)\s*\)/g

/** A line that can carry a real breakpoint: a media prelude, or a JS media-query string. */
const QUERY_CONTEXT_RE = /@media|matchMedia\s*\(/

interface Breakpoint {
  readonly file: string
  readonly line: number
  readonly edge: string
  readonly value: number
  readonly unit: string
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

function scan(absolute: string, pattern: RegExp, contextOnly: boolean): Breakpoint[] {
  const file = rel(absolute)
  const out: Breakpoint[] = []
  readFileSync(absolute, 'utf-8')
    .split(/\r?\n/)
    .forEach((text, i) => {
      if (contextOnly && !QUERY_CONTEXT_RE.test(text)) return
      for (const m of text.matchAll(pattern)) {
        out.push({
          file,
          line: i + 1,
          edge: m[1]!,
          value: Number.parseFloat(m[2]!),
          unit: m[3] ?? 'rem',
          text: text.trim(),
        })
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

const SRC_FILES = filesUnder(join(ROOT, 'src'), (n) => /\.(css|ts|tsx)$/.test(n))
const REM_SCOPE = [
  ...SRC_FILES,
  ...filesUnder(join(ROOT, 'e2e'), (n) => n.endsWith('.ts')),
  ...filesUnder(join(ROOT, 'scripts'), (n) => n.endsWith('.ts')),
]

const REM_BREAKPOINTS = REM_SCOPE.flatMap((f) => scan(f, REM_BREAKPOINT_RE, false))
const PX_BREAKPOINTS = SRC_FILES.flatMap((f) => scan(f, PX_BREAKPOINT_RE, true))

const at = (b: Breakpoint) => `${b.file}:${b.line} → (${b.edge}-width: ${b.value}${b.unit}) :: ${b.text}`

describe('--bp-laptop source-bind', () => {
  it('declares the two-pane breakpoint in tokens.css', () => {
    expect(TOKEN_REM, `[bp-laptop] ${rel(TOKENS_PATH)} must declare a positive rem breakpoint`).toBeGreaterThan(0)
  })

  it('finds mirrors to check (the sweep is not vacuous)', () => {
    expect(
      REM_BREAKPOINTS.length,
      `[bp-laptop] the sweep of src/**/*.{css,ts,tsx} + e2e/**/*.ts + scripts/**/*.ts found NO rem ` +
        `width breakpoint at all — the pattern or the walk broke, and every assertion below would ` +
        `pass vacuously.`,
    ).toBeGreaterThan(10)
  })

  it.each(REQUIRED_MIRROR_FILES)('%s still carries a --bp-laptop mirror', (file) => {
    const here = REM_BREAKPOINTS.filter((b) => b.file === file && b.value === TOKEN_REM)
    expect(
      here.length,
      `[bp-laptop] ${file} carries NO ${TOKEN_REM}rem width breakpoint any more. Either the surface ` +
        `stopped two-paning at the shared seam (a regression — the fit law assumes it does), or the ` +
        `mirror moved on purpose, in which case delete this entry from REQUIRED_MIRROR_FILES.`,
    ).toBeGreaterThan(0)
  })

  it('every rem width breakpoint equals the token — this project has ONE seam', () => {
    const wrong = REM_BREAKPOINTS.filter((b) => b.value !== TOKEN_REM)
    expect(
      wrong.map(at),
      `[bp-laptop] a rem width breakpoint disagrees with \`--bp-laptop: ${TOKEN_REM}rem\` in ` +
        `${rel(TOKENS_PATH)}. @media cannot read a custom property, so these literals ARE the ` +
        `contract. If it is a MIRROR, fix it (or move the token and every mirror together). If it is ` +
        `a max-width COMPLEMENT of the seam, do not re-type a derivative that drifts on its own — ` +
        `write \`not (min-width: ${TOKEN_REM}rem)\`, or use the token value itself. If it is a ` +
        `genuinely NEW tier, that is a product decision: add it here deliberately, never by ` +
        `loosening this arm.`,
    ).toEqual([])
  })

  it('no px or em width breakpoint under src/** — the seam is rem (council 2026-09-10)', () => {
    expect(
      PX_BREAKPOINTS.map(at),
      `[bp-laptop] a px/em width breakpoint sits in an @media prelude or a matchMedia string under ` +
        `src/**. The breakpoint is rem (council 2026-09-10, wf_d2b1d05a-001): a px seam cannot see a ` +
        `reader who raised the browser font, so the layout would split at a width the rem-based fit ` +
        `gate never measures — green while the real page two-panes somewhere else. Re-author it in ` +
        `rem against \`--bp-laptop\` (${TOKEN_REM}rem). A component's own @container query is NOT a ` +
        `layout breakpoint and is deliberately out of scope here.`,
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

  it("e2e/reviewSurface.ts's BROWSER_DEFAULT_PX is the CSS initial font size", () => {
    expect(
      BROWSER_DEFAULT_PX,
      `[bp-laptop] BROWSER_DEFAULT_PX=${BROWSER_DEFAULT_PX} is not ${CSS_INITIAL_FONT_PX}. This is ` +
        `the CSS initial \`font-size\` — the browser default the READER may raise, not a knob this ` +
        `project tunes (the 20px/24px arms send CDP Page.setFontSizes to raise it, and are deltas ` +
        `FROM this). Raise it here and FLOOR silently slides off the two-pane seam, taking the ` +
        `honesty-floor arm with it.`,
    ).toBe(CSS_INITIAL_FONT_PX)
  })

  it("e2e/reviewSurface.ts's FLOOR width is the token resolved at the default root font size", () => {
    // Literal 16 on the right-hand side ON PURPOSE: deriving both sides from BROWSER_DEFAULT_PX
    // would make this arm self-referential — it would stay green while FLOOR walked off the seam.
    expect(
      FLOOR.width,
      `[bp-laptop] FLOOR.width=${FLOOR.width} is not ${TOKEN_REM}rem × ${CSS_INITIAL_FONT_PX}px. The ` +
        `FLOOR arm exists to sit EXACTLY on the two-pane seam (the honesty floor); a width off the ` +
        `seam measures a layout no user is at.`,
    ).toBe(TOKEN_REM * CSS_INITIAL_FONT_PX)
  })
})

/*
 * THE HEIGHT MIRROR (the 1440×731 re-point plan's KTD12, 2026-11-20). The one-frame fit law is
 * STATED by `--laptop-fit-height` in tokens.css and ENFORCED by e2e/reviewSurface.ts's REAL.height:
 * every fit arm asserts against REAL.height, and no CSS rule reads the token. Nothing tied the two,
 * and they drifted apart: the token read 800px while the gate enforced 791, and an earlier 768-vs-800
 * split between the stylesheets' comments hid the 2026-07-08 regression. So the token must equal
 * REAL.height in px, read from the source, never re-typed. Comments are stripped first: the token's
 * own docblock records its history, and a quoted old declaration there must never satisfy the bind.
 * (The short tier's prelude, the `(max-height: …px)` literals among them, is bound by the next describe.)
 */
/** A stylesheet with its block comments removed, so a declaration quoted in prose never reads as live. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function declaredLaptopFitHeightPx(): number {
  const tokens = withoutComments(readFileSync(TOKENS_PATH, 'utf-8'))
  const m = /--laptop-fit-height:\s*([0-9]+(?:\.[0-9]+)?)px\s*;/.exec(tokens)
  if (m === null) {
    throw new Error(
      `[laptop-fit-height] no \`--laptop-fit-height: <N>px;\` declaration in ${rel(TOKENS_PATH)} — the ` +
        `one-frame fit law has no statement, so the gate's REAL.height enforces a number nothing declares.`,
    )
  }
  return Number.parseFloat(m[1]!)
}

describe('--laptop-fit-height source-bind', () => {
  it("--laptop-fit-height equals e2e/reviewSurface.ts's REAL.height — the law and its gate name one frame", () => {
    const tokenPx = declaredLaptopFitHeightPx()
    expect(
      tokenPx,
      `[laptop-fit-height] ${rel(TOKENS_PATH)} declares --laptop-fit-height: ${tokenPx}px while ` +
        `e2e/reviewSurface.ts's REAL is ${REAL.width}×${REAL.height}. The fit gate enforces REAL.height, so ` +
        `the law and its enforcement now name two frames (the 768-vs-800 and 800-vs-791 drift class). ` +
        `Move the token and REAL together, in one commit.`,
    ).toBe(REAL.height)
  })
})

/*
 * THE SHORT TIER'S WHOLE PRELUDE (the 1440×731 re-point's review, 2026-11-20). Every short-tier rule keys
 * on `[data-twopane]`, which the reveals stamp at EVERY width, so the `(min-width: <--bp-laptop>)` half of
 * the tier's prelude is the only thing keeping the rungs off the stacked layouts: a raised root font at his
 * own 1440×731 window, the 844×390 landscape phone. Drop that half from one block and those frames tighten
 * while every fit arm stays green: the stacked arms assert ORDER and REACHABILITY, which tightening cannot
 * break, and the density helper's two sides (REAL/TIER short, SHOWCASE tall) both sit at ≥68rem. So every
 * `@media` prelude under src/** that names a max-height must be exactly the tier's, both halves read from
 * the tokens (R4 of the re-point plan: the sub-68rem tiers stay byte-identical).
 */
function declaredBpLaptopShortPx(): number {
  const tokens = withoutComments(readFileSync(TOKENS_PATH, 'utf-8'))
  const m = /--bp-laptop-short:\s*([0-9]+(?:\.[0-9]+)?)px\s*;/.exec(tokens)
  if (m === null) {
    throw new Error(
      `[bp-laptop-short] no \`--bp-laptop-short: <N>px;\` declaration in ${rel(TOKENS_PATH)} — the short ` +
        `laptop tier's boundary has no source of truth, so its re-stated literals are unanchored.`,
    )
  }
  return Number.parseFloat(m[1]!)
}

const SHORT_TIER_PRELUDE = `@media (min-width: ${TOKEN_REM}rem) and (max-height: ${declaredBpLaptopShortPx()}px) {`

const HEIGHT_PRELUDES = SRC_FILES.flatMap((absolute) =>
  readFileSync(absolute, 'utf-8')
    .split(/\r?\n/)
    .flatMap((text, i) =>
      /@media/.test(text) && /max-height/.test(text) ? [{ where: `${rel(absolute)}:${i + 1}`, text: text.trim() }] : [],
    ),
)

describe('the short laptop tier prelude', () => {
  it('finds the tier blocks to check (the sweep is not vacuous)', () => {
    expect(
      HEIGHT_PRELUDES.length,
      `[bp-laptop-short] no \`@media … max-height\` prelude under src/** — the sweep broke, or the short ` +
        `tier is gone (then delete this describe on purpose).`,
    ).toBeGreaterThan(0)
  })

  it('every max-height prelude is the whole tier prelude: the width half and the height half, from the tokens', () => {
    const wrong = HEIGHT_PRELUDES.filter((p) => p.text !== SHORT_TIER_PRELUDE)
    expect(
      wrong.map((p) => `${p.where} :: ${p.text}`),
      `[bp-laptop-short] a max-height @media prelude is not \`${SHORT_TIER_PRELUDE}\`. Without the width half ` +
        `the rungs reach the stacked layouts (a raised root at his window, the landscape phone) and no fit ` +
        `arm can see it; a different height is a second tier, which is a product decision (the 1440×731 ` +
        `re-point plan's KTD3), not a literal to slip past this file.`,
    ).toEqual([])
  })
})
