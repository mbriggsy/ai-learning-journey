---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T18:07:15-04:00
doc-reviewed: 2026-05-24T18:23:05-04:00
---

# Phase 3 — Hero (the first "wow")

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. Read [phase-1-scaffold.md](phase-1-scaffold.md) (the tokens/eases/type this phase consumes) and [phase-2-data-wiring.md](phase-2-data-wiring.md) (the `useStats()` contract + canonical field names). This file is the decisions-not-code recipe for the landing page's first surface.

Phase 3 lands the **hero** — the single most important surface in the project, the first thing a stranger sees, the make-or-break on the bar. Structurally simple: ONE massive number framed cold, with an honest sub-line and a staggered supporting line beneath. The magnitude IS the wow. No falling droplets, no iridescent accents, no competing visual weights. The "slick" lives in **type as instrument + material surface treatment + motion timing** — not effects.

The bar for "Phase 3 done": the hero renders the real `tokensProcessed` magnitude as a weighty tick-up counter that settles (not snaps), with a faint cursor-drift specular sheen on the digits and one barely-perceptible gradient breath behind; the honest `fresh` + retention-window sub-line and the staggered supporting line read as deliberate negative-space composition; it holds at 360–430px without overflow; both light and dark pass the water-bead bar; `prefers-reduced-motion` shows the final number instantly with no motion; and the whole thing degrades honestly when token data is absent (clean clone / CI). **Eye-on-browser in BOTH modes is the gate — green tests are not enough** (manifesto).

---

## Decisions locked at this deepening (read before executing)

1. **Hero framing = Option A: one dominant number + honest sub-line** (ATC call, 2026-05-24). The hero leads with `combined.totalTokensProcessed` rendered as the massive counter — the magnitude shock. `combined.totalTokensFresh` + the retention window ride directly beneath as a **quiet, muted honest sub-line** (`· 287M fresh · across 22 days of session retention`). This resolves a three-doc disagreement (ideation's "ONE massive number, no competing weights" vs Phase 0's "two co-equal numbers, no hierarchy" vs README gate 8b's "tokens primary"). The dominant-number-plus-honest-subline shape honors ideation's "frame it cold, magnitude is the wow" AND Phase 0's anti-"juiced-numbers" intent (the AI-peer audience knows cache-reads inflate `processed`; `fresh` is the credibility anchor, present in the same glance but subordinate). The cascade (below) reconciles ideation §2, README gate 8b, and Phase 0's "no hierarchy" clause to this one contract.

2. **The dead field is fixed.** Pre-deepening this file referenced `combined.totalTokens` — a field that **never existed post-Phase-0**. The canonical contract (Phase 0 Batch A.4, exposed non-null via Phase 2's `useStats()`) is the dual pair `combined.totalTokensProcessed` (`= input + output + cacheCreation + cacheRead`) and `combined.totalTokensFresh` (`= input + output + cacheCreation`, excludes cheap re-feeds). Both consumed here.

3. **Model list is DATA-DERIVED, never hardcoded.** Pre-deepening the unit label hardcoded "CLAUDE OPUS 4.7, SONNET 4.6, HAIKU 4.5". That's a stat-drift landmine (a new model in the data wouldn't appear; a retired one would lie). Derive the model list from `combined.modelBreakdown` (Phase 0 normalizes IDs → "Opus 4.7" etc.). Empty breakdown → just "TOKENS PROCESSED", no trailing model clause.

4. **The "web searches" supporting line is DROPPED — it's unbuildable.** Pre-deepening it read "Z sessions · M web searches (optional bonus from `server_tool_use` aggregation)". Phase 0's parser uses a strict 7-field pick-list that reads only the four `usage` integers — `server_tool_use` is deliberately NOT collected (privacy-by-construction). There is no web-search count in the contract. Sessions stay (`combined.totalSessions`); web searches are gone.

5. **Counter formats with a LOCKED final-magnitude suffix AND constant glyph width — no unit flicker, no sideways crawl.** The tick-up animates only the mantissa within the final magnitude unit (e.g. `0.00B → 1.24B`), never crossing units mid-tween (`K→M→B`). Crossing units changes the suffix and the glyph count → jitter + reflow, which fights "frame it cold." `formatTokens` picks the unit ONCE from the target, then the animated value renders at fixed decimals in that unit. **Constant-width guard (doc-review fix):** within a unit the integer-part digit count still grows (M-range `0.0M → 847.0M` is 4→6 glyphs; B-range is immune because `/1e9` keeps one integer digit for any realistic total). With center alignment a growing string *re-centers every frame* → the number crawls sideways. So the counter's `onUpdate` LEFT-PADS the formatted string to the final string's length with U+2007 FIGURE SPACE (tabular-width, invisible) via `padCounter()` — constant rendered width every frame, in any unit, zero crawl, zero neighbor reflow. Combined `tokensProcessed` across 11 projects (cache-read-inclusive) is almost certainly **B**-range; the M/K paths are the documented fallback and are now gate-tested.

6. **Static-first, motion-second commit order.** Commit 2 builds the full composition + real data + responsive + null-degrade rendering at FINAL values (no animation). Commit 3 layers motion on top. Rationale (emil + manifesto): get layout/data/responsive correct as verifiable runtime truth FIRST, then add motion — never debug a layout bug through a running animation.

7. **Gradient breath is CSS `@keyframes`, NOT GSAP.** It's a predetermined infinite ambient loop (not interruptible/dynamic). CSS animations run off the main thread and stay smooth under load (emil); GSAP is reserved for the counter + the cursor sheen (the dynamic pieces). This also keeps GSAP's registered surface minimal (Phase 1 registered only `useGSAP` + `CustomEase` — Phase 3 adds **no** new plugin; ScrollTrigger is still not needed, the hero fires on mount at the top of the page).

8. **`/frontend-design` + `/emil-design-eng` both fired at this deepening** (Briggsy's "as appropriate"). Composition/type/negative-space from frontend-design; motion-feel/restraint/reduced-motion/decoration-vs-function from emil. Their calls are baked into the recipe below, not deferred to Phase 9 (Phase 9 is final polish iteration, not first-build design).

9. **Accessibility is baked into the first build, not retrofitted in Phase 9** (doc-review fix). The honest sub-line carries the credibility anchor (`fresh`) — it's information-bearing, so it uses `--text-secondary` (≥7:1 contrast, passes WCAG AA), NOT `--text-muted` (which measured ~2.9–3.3:1 over both surfaces and fails AA for 14px text). The taxonomy-hint `<Link>` — the hero's only interactive element — gets an explicit `:focus-visible` ring (Phase 1's `reset.css` strips the default) and a ≥44×44px tap target (Apple HIG). The counter's `aria-label` is parameterized so the null-degrade branch announces "lines authored", not "tokens processed". Cascade-flags Phase 1 to raise the `--text-muted` alpha floor to AA for the decorative model-clause + taxonomy-hint surfaces.

10. **Reveal choreography surfaces the `fresh` credibility anchor EARLY, not behind the full 2.4s counter** (doc-review fix). The original "all supporting content waits `duration.counter` (2.4s)" would show ONLY the cache-inflated `processed` number for 2.4s on every load — the exact "juiced numbers" misread Option A exists to prevent. Resolution that preserves "number lands first": the number + unit label + honest sub-line reveal together early (the `fresh` anchor is present in the same glance, per Option A's thesis); only the *supporting* line (lines/files/commits) + taxonomy hint stagger in after the counter settles. The magnitude still leads; the credibility anchor is never hidden.

---

## Current state (verified at deepening, 2026-05-24)

**Foundation inherited from Phase 1 (consume — do NOT redefine):**
- Type tokens: `--text-display-hero: clamp(4rem, 18vw, 22rem)`, `--leading-display-hero: 0.95` (single-line numbers ONLY), `--tracking-display: -0.04em`, `--font-display` (self-hosted Satoshi Variable), `--text-meta`, `--text-body`. The `.tabular` utility (`font-variant-numeric: tabular-nums lining-nums`) is in `global.css`.
- Color tokens (semantic, mode-aware): `--surface-page`, `--surface-page-gradient-stop`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-stat-highlight` (gold — the "ONE moment per surface" token), `--text-link`, `--accent-primary`.
- Motion: `easings.ts` exports `weighted-settle` (hero counter — slow 12% ramp, long 30% settle tail) and `weighted-arrive` (reveals). `motion/tokens.ts` exports `duration.counter: 2.4` and `stagger.supportingLines: 0.08`. `motion/reduced-motion.ts` exports `prefersReducedMotion()`. `gsap-context.ts` exports `{ gsap, useGSAP }` with `useGSAP` + `CustomEase` already registered.
- `clsx` was deferred from Phase 1 explicitly "add in Phase 3 with the first real component" — install it here (C1).

**Data contract from Phase 2 (`useStats()` returns NON-NULL `MultiProjectReport`):**
- `combined.totalTokensProcessed: number`, `combined.totalTokensFresh: number`, `combined.totalSessions: number` (Phase 0 A.4).
- `combined.tokenWindowDays: number | null`, `combined.tokenWindowStartISO/EndISO: string | null`.
- `combined.modelBreakdown: Array<{ model: string; sessions: number; tokensProcessed: number }>`.
- Supporting-line fields (existing combined, **verified in `taxonomy.ts:133-146`**): `combined.totalAuthoredLines`, `combined.totalAuthoredFiles`, `combined.totalAllFiles`, `combined.totalAllBytes`, `combined.totalCommits`.
- Project count = `report.projects.length + report.meta.length + (report.archiveCollective?.projectCount ?? 0)`.
- **Null discipline (Phase 0):** when no session JSONLs exist (clean clone, CI runner — see Phase 2 Open Decision #2), every project's `tokens` is null → `combined.totalTokensProcessed === 0`, `totalTokensFresh === 0`, `tokenWindowDays === null`, `modelBreakdown === []`. The hero MUST degrade honestly (Null-degrade path below), never render "0 TOKENS PROCESSED".

**Phase 1 placeholder being replaced:** `src/pages/Landing.tsx` currently renders an inline-styled `<h1>claude-credits</h1>` + nav placeholder. Phase 3 replaces the body with `<Hero/>`; the project grid lands BELOW it in Phase 4.

**Precondition gate (run before C1):** confirm Phase 0's cascade actually landed every field this phase reads. `grep -nE "totalTokensProcessed|totalTokensFresh|modelBreakdown|tokenWindowDays|totalAuthoredLines|totalAuthoredFiles|totalAllBytes|totalCommits" ../../tools/claude-credit/dist/taxonomy.d.ts` must hit ALL of them on `combined` (the token group from Phase 0 A.4; `totalAuthoredLines`/`totalAuthoredFiles`/`totalAllBytes`/`totalCommits` are pre-existing combined aggregates — verified at deepening in `taxonomy.ts:133-146`, but the dist must carry them post-Phase-0 build). If any miss, Phase 0 hasn't been executed/rebuilt — stop and resolve before building against a contract that isn't there.

---

## The hero contract (Option A — locked composition)

Top-to-bottom, centered, generous negative space (the luxury signal). Five stacked elements:

```
            ┌───────────────────────────┐
            │                           │
            │         1.24B             │   (1) massive Satoshi tabular counter — tokensProcessed
            │                           │       background-clip:text specular sheen, drifts w/ cursor
            └───────────────────────────┘
              TOKENS PROCESSED · OPUS 4.7 · SONNET 4.6 · HAIKU 4.5   (2) small-caps unit label, model list DERIVED

          · 287M fresh · across 22 days of session retention ·       (3) honest sub-line — muted, quiet
                                                                          fresh + tokenWindowDays (the receipt)

        421,633 lines authored across 11 projects                    (4) supporting line — staggered reveal
              1,204 files · 2.1 GB · 8,917 commits

           AUTHORED · PIPELINE-GENERATED · TOOL-GENERATED            (5) taxonomy hint — quiet, links → /about
                       what each tier means →
```

*(The `1.24B` / `287M` / `22 days` / counts above are ILLUSTRATIVE — real values come from `stats.json` at build time. The recipe must render correctly for whatever the data is, including the null-degrade case.)*

**Element specs:**

| # | Element | Source | Type token | Color | Notes |
|---|---|---|---|---|---|
| 1 | Counter | `combined.totalTokensProcessed` | `--text-display-hero`, Satoshi 700, `.tabular`, `--leading-display-hero`, `--tracking-display` | `--text-primary` base; sheen is a near-white/cream highlight band over it | The wow. Fills 360–430px horizontally → 22rem desktop. |
| 2 | Unit label | static "TOKENS PROCESSED" + derived `modelBreakdown` models | `--text-meta`, small caps, POSITIVE letter-spacing (~+0.12em) | `--text-secondary` | Model clause omitted if `modelBreakdown` empty. |
| 3 | Honest sub-line | `combined.totalTokensFresh` + `combined.tokenWindowDays` + `scannedAt` | `--text-meta` or `--text-body`, `.tabular` on numbers | `--text-muted` | The retention-honesty receipt. Suppress retention clause if `tokenWindowDays === null`; "< 1 day" if `0`. **Also surface a quiet "as of <date>" from `scannedAt`** (Phase 8 Decision 9) — the manual-refresh cadence makes this the staleness-honesty signal; pairs with the window (when-measured vs how-far-back). |
| 4 | Supporting line | `totalAuthoredLines`, project count, `totalAuthoredFiles`, `totalAllBytes`, `totalCommits` | `--text-body`, `.tabular` on numbers | `--text-secondary` | Two visual rows; staggered reveal. NO web-searches (Decision 4). |
| 5 | Taxonomy hint | static copy → `<Link to="/about">` | `--text-meta`, small caps | `--text-muted`, arrow in `--text-link` | Peers grok the tiers without leaving the page (ideation §8). |

**The `--accent-stat-highlight` gold is NOT spent on the hero number** (it's `--text-primary` + sheen). Gold is the "ONE moment per surface" token — reserve it for a single deliberate accent decided in Phase 9, or a per-tile hook in Phase 4. Two gold moments on one screen breaks the rule.

---

## Output structure (what this phase adds)

```
projects/claude-credits/
├── src/
│   ├── lib/
│   │   ├── format.ts          # NEW — formatTokens / formatInt / formatBytes / formatModelList (pure, tested)
│   │   └── format.test.ts     # NEW — vitest (node env)
│   ├── components/
│   │   └── Hero/
│   │       ├── Hero.tsx          # NEW — composition + reveal timeline (useGSAP)
│   │       ├── HeroCounter.tsx   # NEW — counter tween + specular sheen + reduced-motion branch
│   │       └── Hero.module.css   # NEW — type, layout, sheen, gradient breath, clamps, mobile, reduced-motion
│   └── pages/
│       └── Landing.tsx        # MODIFIED — replace placeholder body with <Hero/>
├── vitest.config.ts           # MODIFIED — broaden include to cover src/**/*.test.ts
└── package.json               # MODIFIED — add clsx@^2.1.1
```

Scope declaration, not a constraint — the per-commit file lists below are authoritative.

---

## Dependency additions

**Runtime (add to Phase 1 dependencies):**
- `clsx@^2.1.1` — className composition for the conditional sheen/reduced-motion classes. Deferred from Phase 1 to here by Phase 1 Decision 10.

**No new GSAP plugin.** Phase 1 registered `useGSAP` + `CustomEase`; that's everything the counter + sheen need. Do NOT register ScrollTrigger (no scroll-driven behavior in the hero).

`vitest.config.ts` `include` broadens from `['scripts/**/*.test.ts']` to `['scripts/**/*.test.ts', 'src/**/*.test.ts']` so `format.test.ts` runs. Environment stays `'node'` — `format.ts` is pure functions, no DOM. (Component DOM tests / jsdom are still deferred — the counter's correctness is verified by eye-on-browser per the manifesto, and `format.ts` carries the unit-testable logic.)

---

## Execution — three commits, ordered

Each commit has a verify gate. Don't proceed past a red gate (manifesto: runtime truth > "it compiles").

### Commit 1 — format helpers (`src/lib/format.ts` + tests + clsx + vitest include)

**3.1a — `src/lib/format.ts`** (pure, the testable logic concentrate):

```ts
import type { MultiProjectReport } from '@/types'

type ModelBreakdown = MultiProjectReport['combined']['modelBreakdown']

/**
 * Format a token count with a magnitude suffix, choosing the unit ONCE from the
 * value's magnitude. The mantissa decimals are fixed per unit so an animated
 * tick-up never changes glyph count mid-tween (Decision 5):
 *   ≥ 1e9 → "X.XXB"  (2 decimals — stable 4-glyph mantissa)
 *   ≥ 1e6 → "XXX.XM" (1 decimal)
 *   ≥ 1e3 → "XXX.XK" (1 decimal)
 *   else  → integer
 * The unit is derived from the FINAL/target value and passed to the counter so
 * every animation frame uses the same unit (see HeroCounter). For static render
 * the target IS the value, so this single-arg form is correct.
 */
export function formatTokens(n: number, unitFromTarget?: 'B' | 'M' | 'K' | ''): string {
  const unit = unitFromTarget ?? pickTokenUnit(n)
  switch (unit) {
    case 'B': return `${(n / 1e9).toFixed(2)}B`
    case 'M': return `${(n / 1e6).toFixed(1)}M`
    case 'K': return `${(n / 1e3).toFixed(1)}K`
    default:  return `${Math.round(n)}`
  }
}

export function pickTokenUnit(n: number): 'B' | 'M' | 'K' | '' {
  if (n >= 1e9) return 'B'
  if (n >= 1e6) return 'M'
  if (n >= 1e3) return 'K'
  return ''
}

/** Thousands-separated integer (e.g. 421633 → "421,633"). Pair with .tabular in markup. */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** Bytes → human (MB/GB, 1 decimal). 2_100_000_000 → "2.1 GB". */
export function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`
  return `${Math.round(n)} B`
}

/** Derived model clause for the unit label. [] → "" (no trailing clause). */
export function formatModelList(models: ModelBreakdown): string {
  if (models.length === 0) return ''
  return models.map((m) => m.model.toUpperCase()).join(' · ')
}

const FIGURE_SPACE = ' ' // tabular-width, invisible — keeps the counter constant-width as it grows

/**
 * Left-pad a counter frame to a fixed glyph count with FIGURE SPACE so a growing
 * mantissa (M/K-range, e.g. "8.5M" → "847.0M") never changes rendered width and
 * never crawls under center alignment (Decision 5). `targetLen` = final string length.
 */
export function padCounter(s: string, targetLen: number): string {
  return s.length >= targetLen ? s : FIGURE_SPACE.repeat(targetLen - s.length) + s
}
```

**3.1b — `src/lib/format.test.ts`** (the feature-bearing tests):

```ts
import { describe, it, expect } from 'vitest'
import { formatTokens, pickTokenUnit, formatInt, formatBytes, formatModelList, padCounter } from './format'

describe('formatTokens', () => {
  it('formats billions with 2 decimals', () => expect(formatTokens(1_240_000_000)).toBe('1.24B'))
  it('formats millions with 1 decimal', () => expect(formatTokens(287_000_000)).toBe('287.0M'))
  it('formats thousands with 1 decimal', () => expect(formatTokens(12_400)).toBe('12.4K'))
  it('formats sub-1k as integer', () => expect(formatTokens(847)).toBe('847'))
  it('respects a forced unit so a tick-up never changes suffix', () => {
    // mid-tween value rendered in the TARGET's unit (B), not its own magnitude
    expect(formatTokens(50_000_000, 'B')).toBe('0.05B')
    expect(formatTokens(0, 'B')).toBe('0.00B')
  })
  it('boundary: exactly 1e9 is B, 999_999_999 is M', () => {
    expect(pickTokenUnit(1e9)).toBe('B')
    expect(pickTokenUnit(999_999_999)).toBe('M')
  })
})

describe('formatInt', () => {
  it('thousands-separates', () => expect(formatInt(421633)).toBe('421,633'))
  it('handles zero', () => expect(formatInt(0)).toBe('0'))
})

describe('formatBytes', () => {
  it('GB with 1 decimal', () => expect(formatBytes(2_100_000_000)).toBe('2.1 GB'))
  it('MB with 1 decimal', () => expect(formatBytes(5_400_000)).toBe('5.4 MB'))
})

describe('formatModelList', () => {
  it('uppercases + joins with middot', () =>
    expect(formatModelList([
      { model: 'Opus 4.7', sessions: 1, tokensProcessed: 1 },
      { model: 'Sonnet 4.6', sessions: 1, tokensProcessed: 1 },
    ])).toBe('OPUS 4.7 · SONNET 4.6'))
  it('empty breakdown yields no clause', () => expect(formatModelList([])).toBe(''))
})

describe('padCounter (constant-width counter frames)', () => {
  const FS = ' '
  it('pads a short M-range frame to the final width', () =>
    expect(padCounter('8.5M', '847.0M'.length)).toBe(`${FS}${FS}8.5M`))
  it('leaves a frame already at target width unchanged', () =>
    expect(padCounter('1.24B', '1.24B'.length)).toBe('1.24B'))
  it('every tick of an M-range tween renders the same length', () => {
    const finalLen = '847.0M'.length
    for (const v of [0, 8_470_000, 84_700_000, 847_000_000]) {
      expect(padCounter(formatTokens(v, 'M'), finalLen).length).toBe(finalLen)
    }
  })
})
```

**3.1c — broaden `vitest.config.ts`** include + **add `clsx@^2.1.1`** to `package.json` dependencies.

**Verify gate:**
```
cd C:/Users/brigg/ai-learning-journey/projects/claude-credits
pnpm install            # picks up clsx
pnpm test               # format.test.ts green (and Phase 2's publish-guard.test.ts still green)
pnpm typecheck          # clean
```

**Commit:** `feat(claude-credits): hero format helpers (token/int/bytes/model) + tests`

---

### Commit 2 — hero composition, static (`Hero.module.css` + `Hero.tsx` + `HeroCounter.tsx` at final values, wired into Landing)

Build the WHOLE composition rendering real data at FINAL values — no animation yet (Decision 6). This is the layout/data/responsive/null-degrade truth gate.

**3.2a — `src/components/Hero/HeroCounter.tsx`** (static-first: render the formatted final number; the motion branch lands in C3):

```tsx
import { useRef, type CSSProperties } from 'react'
import { formatTokens, pickTokenUnit } from '@/lib/format'
import styles from './Hero.module.css'

// srUnit: the screen-reader unit phrase ("tokens processed" | "lines authored") so the
// null-degrade branch announces the truth (doc-review fix — aria must match the visible unit).
export function HeroCounter({ value, srUnit }: { value: number; srUnit: string }) {
  const numberRef = useRef<HTMLSpanElement>(null)
  const unit = pickTokenUnit(value)
  const finalText = formatTokens(value, unit)
  // C2: render final value statically (no GSAP writer yet, so a JSX text child is safe here).
  // C3 removes the JSX child and lets GSAP own textContent exclusively (see 3.3a).
  return (
    <span className={styles.counterWrap}>
      <span
        ref={numberRef}
        className={`${styles.counter} tabular`}
        // reserve width so the C3 tick-up can't reflow neighbors (Decision 5)
        style={{ '--counter-ch': `${finalText.length}ch` } as CSSProperties}
        aria-label={`${finalText} ${srUnit}`}
      >
        {finalText}
      </span>
    </span>
  )
}
```

**3.2b — `src/components/Hero/Hero.tsx`** (composition + the null-degrade fork; no motion yet):

```tsx
import { useRef } from 'react'
import { Link } from 'react-router'
import { useStats } from '@/hooks/useStats'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import { formatInt, formatBytes, formatTokens, formatModelList } from '@/lib/format'
import { HeroCounter } from './HeroCounter'
import styles from './Hero.module.css'
// C3 adds: import { gsap, useGSAP } from '@/motion/gsap-context'
//          import { duration, stagger } from '@/motion/tokens'

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)   // GSAP scope root (used by the C3 reveal timeline)
  const { combined, projects, meta, archiveCollective } = useStats()
  const projectCount = projects.length + meta.length + (archiveCollective?.projectCount ?? 0)

  // Null discipline (Phase 0): tokenWindowDays is null ⇔ NO project had a measured token
  // window ⇔ no session data (clean clone / CI). This is the SAME "unmeasured" signal the
  // sub-line uses below — NOT `totalTokensProcessed > 0`, which conflates "unmeasured" with
  // a measured-zero (doc-review fix). A genuine measured-zero stays in the token branch and
  // renders "0" honestly.
  const hasTokens = combined.tokenWindowDays !== null
  // Secondary guard: if there's also no git history (CI tarball with totalAuthoredLines === 0),
  // lead with the project count rather than a "0 LINES AUTHORED" hero (the bar forbids a zero hero).
  const hasAuthored = combined.totalAuthoredLines > 0

  const modelClause = formatModelList(combined.modelBreakdown)
  const windowClause =
    combined.tokenWindowDays === null ? null
    : combined.tokenWindowDays === 0 ? 'across under a day of session retention'   // avoid the "<" char in static HTML
    : `across ${combined.tokenWindowDays} days of session retention`

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      data-reduced-motion={prefersReducedMotion()}   // CSS branches the sheen base off this (3.3c)
    >
      <div className={styles.breath} aria-hidden />   {/* gradient-breath layer (CSS @keyframes, C3) */}

      <div data-reveal="number">   {/* reveal group: number + label + honest sub-line land together early (Decision 10) */}
        {hasTokens ? (
          <>
            <HeroCounter value={combined.totalTokensProcessed} srUnit="tokens processed" />
            <p className={styles.unitLabel}>
              TOKENS PROCESSED{modelClause && <span className={styles.modelClause}> · {modelClause}</span>}
            </p>
            <p className={styles.honest}>
              <span className="tabular">{formatTokens(combined.totalTokensFresh)}</span> fresh
              {windowClause && <> · {windowClause}</>}
            </p>
          </>
        ) : hasAuthored ? (
          // Null-degrade: no token data. Lead with authored lines, suppress the token sub-line.
          <>
            <HeroCounter value={combined.totalAuthoredLines} srUnit="lines authored" />
            <p className={styles.unitLabel}>LINES AUTHORED</p>
          </>
        ) : (
          // Floor: no tokens AND no git history. Lead with project count — never a zero hero.
          <>
            <HeroCounter value={projectCount} srUnit="projects" />
            <p className={styles.unitLabel}>PROJECTS</p>
          </>
        )}
      </div>

      <div className={styles.supporting} data-reveal="after">
        {hasTokens && hasAuthored && (
          <p className={styles.supportingLine}>
            <span className="tabular">{formatInt(combined.totalAuthoredLines)}</span> lines authored
            across <span className="tabular">{projectCount}</span> projects
          </p>
        )}
        {hasAuthored && (
          <p className={styles.supportingLine}>
            <span className="tabular">{formatInt(combined.totalAuthoredFiles)}</span> files
            · <span className="tabular">{formatBytes(combined.totalAllBytes)}</span>
            · <span className="tabular">{formatInt(combined.totalCommits)}</span> commits
          </p>
        )}
      </div>

      <Link to="/about" className={styles.taxonomyHint} data-reveal="after">
        AUTHORED · PIPELINE-GENERATED · TOOL-GENERATED — what each tier means →
      </Link>
    </section>
  )
}
```

*(`heroRef` + `prefersReducedMotion` + the reveal timeline are added in C3 §3.3b — the `data-reveal` / `data-reduced-motion` hooks are placed here in C2 so the markup is final and C3 only adds the `useGSAP` block. In C2 the `ref`/`data-reduced-motion` line can render with `heroRef` as a no-op `useRef(null)` and `prefersReducedMotion()` already exists from Phase 1.)*

**3.2c — `src/components/Hero/Hero.module.css`** (type, layout, negative space, mobile, sheen base, breath base — motion keyframes activated in C3). Key blocks:

```css
.hero {
  min-height: 100vh;
  min-height: 100dvh;                 /* dvh truth on iOS (Phase 1 pattern) */
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--space-6);
  padding: var(--space-16) var(--space-6);
  text-align: center;
  position: relative;
  overflow: hidden;                   /* breath layer must not cause scroll */
}

/* (1) THE NUMBER — type as instrument */
.counterWrap {            /* GSAP scope root for HeroCounter; inline-block so the inner width-reservation behaves */
  display: inline-block;
}
.counter {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-display-hero);          /* clamp(4rem, 18vw, 22rem) — Phase 1 token */
  line-height: var(--leading-display-hero);     /* 0.95 — single-line numbers ONLY */
  letter-spacing: var(--tracking-display);      /* -0.04em */
  min-width: var(--counter-ch, auto);           /* reserve width → no tick-up reflow */
  display: inline-block;
  text-align: center;                           /* with padCounter's figure-space pad → constant-width, centered */
  color: var(--text-primary);                   /* base + fallback (no bg-clip / reduced-motion / touch) */
}
/* Specular sheen: gated to hover-capable, fine pointers — touch gets the crisp solid color
   (no rest-state gradient on phones; deliberate). --sheen-x/--sheen-y are UNITLESS 0–100
   numbers (quickTo pipes raw numbers and skips unit-appending — passing "50%" would write an
   invalid bare-number position and kill the gradient). The gradient converts via calc(* 1%).
   A near-invisible luminance lift — NOT a chrome swipe (the disqualified slop). In DARK,
   --text-primary is cream (#f5e9d3) → the lift reads as a warm highlight; in LIGHT it's warm
   near-black (#1a1a1c) → the lift reads as a softer-grey curve. Both intentional; verify both. */
@supports (background-clip: text) or (-webkit-background-clip: text) {
  @media (hover: hover) and (pointer: fine) {
    .hero:not([data-reduced-motion='true']) .counter {
      --sheen-x: 50;   /* unitless — seeded by gsap.set in 3.3a so quickTo doesn't start from 0 */
      --sheen-y: 40;
      background-image: radial-gradient(
        120% 120% at calc(var(--sheen-x) * 1%) calc(var(--sheen-y) * 1%),
        color-mix(in oklab, var(--text-primary) 82%, white 18%) 0%,  /* faint lift, mode-relative */
        var(--text-primary) 38%
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }
}

/* (2) unit label — small caps, positive tracking. Wraps legibly when the DERIVED model
   list grows (it's unbounded by construction — every model ever seen appears). max-width +
   balanced wrap keeps it a deliberate block, never a viewport-overflowing single line. */
.unitLabel {
  font-family: var(--font-body);
  font-size: var(--text-meta);
  font-variant-caps: all-small-caps;
  letter-spacing: 0.12em;
  color: var(--text-secondary);
  max-width: 32ch;
  margin-inline: auto;
  text-wrap: balance;
  overflow-wrap: break-word;
}
.modelClause { color: var(--text-muted); }   /* decorative — Phase 1 cascade raises --text-muted to AA */

/* (3) honest sub-line — quiet but LEGIBLE. Uses --text-secondary (≥7:1, passes WCAG AA):
   it carries the `fresh` credibility anchor, so it's information-bearing, not decorative.
   --text-muted (~2.9–3.3:1) would fail AA for 14px text (doc-review fix). */
.honest {
  font-family: var(--font-body);
  font-size: var(--text-meta);
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

/* (4) supporting lines */
.supporting { display: grid; gap: var(--space-2); margin-top: var(--space-4); }
.supportingLine {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

/* (5) taxonomy hint — the hero's ONLY interactive element. Needs a real tap target
   (≥44px, Apple HIG) and a visible focus ring (Phase 1 reset.css strips the default). */
.taxonomyHint {
  margin-top: var(--space-8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: var(--space-3) var(--space-4);
  max-width: 40ch;
  text-wrap: balance;
  font-family: var(--font-body);
  font-size: var(--text-meta);
  font-variant-caps: all-small-caps;
  letter-spacing: 0.1em;
  color: var(--text-muted);            /* decorative; Phase 1 cascade raises --text-muted to AA */
  border-radius: var(--radius-chip);
  transition: color 0.25s ease;   /* motion tokens live in TS (motion/tokens.ts), not CSS — literal here */
}
.taxonomyHint:hover { color: var(--text-secondary); }
.taxonomyHint:focus-visible {
  outline: 2px solid var(--accent-focus);
  outline-offset: 4px;
  color: var(--text-secondary);
}

/* gradient breath layer — keyframes activated in C3 */
.breath {
  position: absolute;
  inset: -20%;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(60% 50% at 50% 38%, var(--surface-page-gradient-stop), transparent 70%);
  opacity: 0.7;
}

/* explicit phone polish (Phase 1 mobile cascade: 600px) */
@media (max-width: 600px) {
  .hero { padding: var(--space-12) var(--space-4); gap: var(--space-4); }
  .supportingLine { font-size: var(--text-meta); }
}
```

**Verify gate (eye-on-browser — runtime truth, BOTH modes):**
```
pnpm refresh            # ensure public/data/stats.json exists with real data (Phase 2)
pnpm dev
```
- Hero renders the real `tokensProcessed` formatted (e.g. `1.24B`), the derived model list, the `fresh` + window sub-line, the supporting lines, the taxonomy-hint link.
- Numbers are tabular; no `NaN`/`undefined`; `/about` link navigates client-side.
- **Toggle Windows light↔dark** (and `?theme=light`/`?theme=dark`): both modes read as deliberate composition — number dominant, sub-line quiet, generous negative space. Sheen base visible as a faint luminance curve on the digits (static for now).
- **Resize 360 / 375 / 390 / 430px:** the number fills horizontally WITHOUT overflow; no horizontal scroll; supporting lines wrap legibly.
- **Null-degrade check:** temporarily rename `public/data/stats.json` to a copy with all `tokens` nulled (or hand-edit `combined.totalTokensProcessed` to 0) → hero leads with `LINES AUTHORED`, no token sub-line, no "0 TOKENS PROCESSED". Restore.

**Commit:** `feat(claude-credits): hero composition (static) — counter + honest sub-line + supporting + taxonomy hint`

---

### Commit 3 — motion (counter tween + specular sheen + gradient breath + reveal stagger + reduced-motion)

Layer motion onto the verified-correct static composition.

**3.3a — `HeroCounter.tsx` motion** (proxy tween → `snap` → `onUpdate` writes `textContent`; cursor sheen via `quickTo` in `contextSafe`; reduced-motion branch). Verified against GSAP skills docs (`useGSAP((ctx, contextSafe) => …, { scope })`, `gsap.quickTo`, `snap`, `onUpdate`):

```tsx
import { useRef, type CSSProperties } from 'react'
import { gsap, useGSAP } from '@/motion/gsap-context'
import { duration } from '@/motion/tokens'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import { formatTokens, pickTokenUnit, padCounter } from '@/lib/format'
import styles from './Hero.module.css'

export function HeroCounter({ value, srUnit }: { value: number; srUnit: string }) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)
  const unit = pickTokenUnit(value)
  const finalText = formatTokens(value, unit)
  const render = (n: number) => padCounter(formatTokens(n, unit), finalText.length)

  // useGSAP runs at useLayoutEffect timing (before browser paint), so writing textContent
  // here — NOT as a JSX child — avoids an empty-frame flash AND avoids the React-vs-GSAP
  // ownership fight: the number span has NO JSX text child, so React never reconciles a text
  // node against GSAP's per-frame writes (doc-review fix — the prior `{finalText}` child would
  // be re-asserted on any parent re-render, e.g. the Phase 4 grid mounting below in <Landing>,
  // clobbering the animated value mid-tween). GSAP owns el.textContent exclusively.
  useGSAP((_ctx, contextSafe) => {
    const el = numberRef.current
    if (!el) return

    // Reduced motion: final number instantly, no tween, no sheen (emil: keep comprehension —
    // the NUMBER is the comprehension; the sheen is decoration, drop it).
    if (prefersReducedMotion()) { el.textContent = finalText; return }

    // Counter: tween a proxy, snap to integer, render in the LOCKED unit + constant width each frame.
    const proxy = { val: 0 }
    el.textContent = render(0)
    gsap.to(proxy, {
      val: value,
      duration: duration.counter,        // 2.4s
      ease: 'weighted-settle',           // registered in Phase 1 easings.ts (boot-imported)
      snap: { val: 1 },
      onUpdate: () => { el.textContent = render(proxy.val) },
    })

    // Specular sheen: drift the radial-gradient center toward the cursor, smoothed.
    // Decorative (no function) ⇒ eased follow is correct (emil). --sheen-x/y are UNITLESS
    // 0–100 numbers (the CSS converts via calc(* 1%)). quickTo pipes RAW NUMBERS and skips
    // unit-appending — passing a "50%" string would write an invalid bare-number position and
    // silently kill the gradient (doc-review fix). Seed via gsap.set so quickTo's first move
    // eases from the resting 50/40, not from 0.
    gsap.set(el, { '--sheen-x': 50, '--sheen-y': 40 })
    const setX = gsap.quickTo(el, '--sheen-x', { duration: 0.5, ease: 'power3' })
    const setY = gsap.quickTo(el, '--sheen-y', { duration: 0.5, ease: 'power3' })
    const onMove = contextSafe((e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      setX(((e.clientX - r.left) / r.width) * 100)     // unitless number, not "%"
      setY(((e.clientY - r.top) / r.height) * 100)
    })
    // Only on hover-capable, fine pointers (touch has no cursor — sheen stays solid via the CSS gate).
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (canHover) window.addEventListener('pointermove', onMove)
    return () => { if (canHover) window.removeEventListener('pointermove', onMove) }
  }, { scope: rootRef, dependencies: [value] })

  return (
    <span ref={rootRef} className={styles.counterWrap}>
      {/* NO JSX text child — GSAP owns textContent (see comment above). aria-label is a React-
          owned attribute (no conflict with textContent) and uses srUnit so null-degrade is honest. */}
      <span
        ref={numberRef}
        className={`${styles.counter} tabular`}
        style={{ '--counter-ch': `${finalText.length}ch` } as CSSProperties}
        aria-label={`${finalText} ${srUnit}`}
      />
    </span>
  )
}
```

(StrictMode note: `useGSAP` with `{ scope }` auto-reverts on the dev double-invoke, so the tween/listener add-revert-add cleanly — no double animation, no leaked listener. The empty span + layout-effect write means even the double-invoke never shows an empty or `{finalText}`-then-`0` flash.)

**3.3b — `Hero.tsx` reveal timeline.** Add the two GSAP imports + a `useGSAP` block inside `Hero()`. The `[data-reveal="number"]` group (counter + unit label + **honest sub-line**) reveals early so the `fresh` credibility anchor is in the first glance (Decision 10); only `[data-reveal="after"]` (supporting line + taxonomy hint) staggers in after the counter settles — magnitude still lands first, anchor never hidden. Reveals use y+opacity (`autoAlpha`), never `scale(0)` (emil). `heroRef` + `data-reduced-motion` are already on the `<section>` from C2:

```tsx
// C3 adds these two imports at the top of Hero.tsx:
import { gsap, useGSAP } from '@/motion/gsap-context'
import { duration, stagger } from '@/motion/tokens'

// ...and this block inside Hero() (heroRef already declared in C2 §3.2b):
useGSAP(() => {
  if (prefersReducedMotion()) return   // CSS net + HeroCounter already render the final static state
  // Number group (incl. the honest fresh sub-line) lands early; HeroCounter's own useGSAP runs the tick-up.
  gsap.from('[data-reveal="number"]', { autoAlpha: 0, y: 12, duration: 0.6, ease: 'weighted-arrive' })
  // Supporting line + taxonomy hint arrive after the counter settles.
  gsap.from('[data-reveal="after"]', {
    autoAlpha: 0, y: 16, duration: 0.6, ease: 'weighted-arrive',
    stagger: stagger.supportingLines,  // 0.08
    delay: duration.counter,           // 2.4 — secondary context follows the magnitude
  })
}, { scope: heroRef })
```

(`data-reveal="number"` wraps counter + label + honest sub-line; `data-reveal="after"` is on the `.supporting` block and the taxonomy `<Link>` — both already set in the C2 markup §3.2b.)

**3.3c — `Hero.module.css` motion** — gradient breath `@keyframes` (CSS, off-main-thread per Decision 7), reduced-motion gate:

```css
/* ONE slow gradient breath — barely perceptible, ~12s, opacity+position only (GPU-cheap) */
@keyframes breath {
  0%, 100% { opacity: 0.55; transform: translateY(0) scale(1); }
  50%      { opacity: 0.8;  transform: translateY(-1.5%) scale(1.04); }
}
.breath { animation: breath 12s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .breath { animation: none; }   /* global.css net also covers this; explicit here for intent */
}
```

**Verify gate (eye-on-browser, dev AND preview — the prod bundle is the real gate):**
```
pnpm dev
pnpm build && pnpm preview
```
- **Watch the tick-up** in both dev and preview: the number counts 0.00B → final over ~2.4s, decelerating into a long settle (weighty, not linear, not a snap). Suffix never flickers; no neighbor reflow.
- **Sheen:** move the cursor across the number — a faint highlight drifts with smoothing, "almost invisible until you notice it." NOT a chrome/iridescent swipe.
- **Breath:** the background gradient breathes slowly behind, barely perceptible.
- **Reveal order:** number first, then the sub-line/supporting/taxonomy stagger in after the counter settles.
- **Reduced motion:** set the OS flag → number renders at FINAL value instantly, no tween, no sheen, no breath, no stagger (everything visible immediately). `gsap.parseEase('weighted-settle')` still resolves (Phase 1 gate).
- **Touch:** on a real phone (or DevTools touch emulation), the sheen does NOT track (no cursor) and nothing traps.
- No console errors; no CSP violations in preview (GSAP inline-style + CSS vars are covered by Phase 1's `style-src 'unsafe-inline'`).

**Commit:** `feat(claude-credits): hero motion — weighted counter tick-up + cursor specular sheen + gradient breath + staggered reveal`

---

## Landmines

| Landmine | Guard |
|---|---|
| **Dead `combined.totalTokens` field** | Never existed post-Phase-0. Use `totalTokensProcessed` (hero) + `totalTokensFresh` (sub-line). Precondition gate greps `dist/taxonomy.d.ts` before C1. |
| **Hardcoded model names drift** | Unit label derives the model list from `combined.modelBreakdown` via `formatModelList`. Never hardcode "Opus 4.7" etc. |
| **Web-searches line is unbuildable** | `server_tool_use` is NOT collected (Phase 0 7-field pick-list). Dropped from the supporting line. |
| **Counter suffix flicker / reflow / sideways crawl** | `formatTokens(value, unitFromTarget)` locks the unit from the target; `padCounter()` left-pads each frame to the final length with U+2007 figure space → constant rendered width in ANY unit (B-range is naturally stable; M/K would grow 4→6 glyphs and crawl under center-align without the pad). `.tabular` + `--counter-ch` reserve the box. An M-range value is gate-tested (verification #3a). |
| **React clobbers GSAP-animated `textContent`** | The animated `<span>` has NO JSX text child — GSAP owns `textContent` exclusively, written at `useLayoutEffect` timing in `useGSAP`. A JSX `{finalText}` child would be re-asserted on any parent re-render (e.g. the Phase 4 grid mounting below in `<Landing>`) and clobber the tween mid-flight. `aria-label` is a separate React-owned attribute (no conflict). |
| **`quickTo` silently kills the sheen (units)** | `quickTo` pipes RAW NUMBERS and skips unit-appending. `--sheen-x/y` are UNITLESS 0–100 numbers seeded via `gsap.set`; the CSS converts with `calc(var(--sheen-x) * 1%)`. Passing a `"50%"` string would write an invalid bare-number `<position>` and the gradient would silently stop drifting (passes in dev, dead in build). |
| **`setState` per animation frame** | The counter writes `el.textContent` via GSAP `onUpdate` — NEVER React state per frame (2.4s × 60fps = 144 re-renders). Proxy object + ref, not `useState`. |
| **`use(getStatsPromise())`-style infinite suspend** | N/A here — Hero consumes the resolved `useStats()` (Phase 2 guarantees non-null). No fetch in this component. |
| **CSS var on parent recalcs all children** | The sheen `--sheen-x/y` vars live ON the number node itself, consumed by its own `background-position` — no child-recalc cost (emil perf rule). |
| **mousemove handler leaks / not cleaned up** | The `pointermove` handler is wrapped in `contextSafe` AND removed in the `useGSAP` cleanup return (GSAP skills doc requirement). Gated behind `(hover: hover) and (pointer: fine)`. |
| **`scale(0)` reveal looks like it pops from nowhere** | Reveal uses `autoAlpha` + small `y` (12/16px), never `scale(0)` (emil rule). |
| **`background-clip: text` unsupported / reduced-motion** | `@supports` gate + `color: var(--text-primary)` fallback; reduced-motion branch keeps the solid color and shows the final number instantly. |
| **`--leading-display-hero: 0.95` clips descenders on a wrapping label** | 0.95 is for the SINGLE-LINE number ONLY (Phase 1 landmine). The unit label + sub-line use body leading. Never apply the hero number's class to wrapping text. |
| **Null-degrade predicate conflates measured-zero with unmeasured** | The fork keys on `combined.tokenWindowDays !== null` (Phase 0's true "did we measure tokens" signal — the SAME one the sub-line uses), NOT `totalTokensProcessed > 0` (which would misread a genuine measured-zero as "no data"). Zero hero never renders: tokens → `LINES AUTHORED`; no git either → `PROJECTS`. Covers clean-clone + CI (Phase 2 Open Decision #2). |
| **`--text-muted` fails WCAG AA on info-bearing text** | The honest sub-line carries the `fresh` anchor → uses `--text-secondary` (≥7:1). `--text-muted` (~2.9–3.3:1) is only on decorative surfaces (model clause, taxonomy hint); Phase 1 cascade raises its alpha floor to AA. |
| **Hero's only interactive element: no focus ring / tiny tap target** | `.taxonomyHint` gets `:focus-visible` (`--accent-focus` ring — Phase 1 reset strips the default) + `min-height: 44px` + padding (Apple HIG). |
| **`.counterWrap` undefined** | Defined in `Hero.module.css` (`display: inline-block`) — the GSAP scope root wrapping the width-reserved inner `.counter`. |
| **Unbounded model list overflows the unit label** | `modelBreakdown` is unbounded (every model ever seen, incl. unknown passthrough IDs). `.unitLabel` has `max-width: 32ch` + `text-wrap: balance` + `overflow-wrap` so it wraps to a deliberate block, never a viewport-overflowing line. |
| **Gradient breath causes scroll / layout shift** | `.breath` is `position: absolute; inset: -20%; z-index: -1; pointer-events: none`, `.hero` is `overflow: hidden`; animates only opacity + transform. |
| **GSAP plugin over-registration** | Phase 3 registers NO new plugin. `useGSAP` + `CustomEase` (Phase 1) are sufficient. ScrollTrigger stays out (hero fires on mount). |

---

## System-wide impact

- **Interaction graph:** `Hero` is the first `useStats()` consumer to render real fields. It reads `combined.*` only (no per-project iteration) — Phase 4's grid is the first per-project consumer. The non-null `MultiProjectReport` guarantee (Phase 2) means Hero writes no top-level null-guards; it DOES honor field-level null discipline (`tokenWindowDays === null`, the `hasTokens` fork).
- **Shared primitives established here for Phases 4–9:** `src/lib/format.ts` becomes the canonical number/byte/model formatter — Phase 4 tiles and Phase 5 detail MUST reuse it (no re-rolling `toFixed` per component). `src/components/<Name>/` + `<Name>.module.css` is the component-folder convention. The `useGSAP` + `weighted-*` ease + reduced-motion-branch pattern is the motion template every later animated component follows.
- **Reduced-motion contract:** the branch shape (instant final state in JS via `prefersReducedMotion()`, CSS `@keyframes` gated by the media query) is the reference for all later motion.
- **Unchanged invariants:** Phase 1's tokens/eases/fonts and Phase 2's data layer (`useStats`, `StatsGate`, types) are untouched — Phase 3 only consumes them and modifies `Landing.tsx` + `vitest.config.ts` + `package.json` (clsx).

---

## Cascade (corrections this deepening forces elsewhere)

Per the "propagate the most-recent locked decision, report after" rule (2026-05-24): these are reconciled in the deepen commit so the upstream docs stop contradicting the locked hero contract.

### `ideation.md` §2 (reconcile to Option A)
- Current text: "ONE massive number... no competing weights in the hero. ... Lines authored, project count, files, commits drop to a supporting line." Add that the ONE massive number is `tokensProcessed`, and that `fresh` + the retention window ride beneath as a **quiet honest sub-line** (not a competing weight — subordinate by design). Keeps the "one number, frame it cold" spirit while recording the honesty sub-line that Phase 0's data work introduced.

### `plans/README.md`
- **Verification gate 8b** currently reads "Hero shows tokens primary (B/M suffix), lines as secondary supporting line — NOT the inverse." Restate to the Option A contract: "Hero shows `totalTokensProcessed` as the dominant number; `totalTokensFresh` + retention window as a quiet honest sub-line directly beneath; `totalAuthoredLines` + counts as the supporting stagger." 
- **Gate 8c** (window footnote surfaced) — still correct, now satisfied by the honest sub-line's `windowClause`.
- The "Named wow moments → Landing hero: the counter tick-up + supporting-line stagger" line stays accurate.

### `phase-0-data-gaps.md` (one clause, not the contract)
- Phase 0's token-naming decision says the hero shows "both numbers... **no primary/secondary hierarchy; they read as a pair.**" The ATC call (Option A) overrides that single clause: there IS a deliberate hierarchy (processed dominant, fresh subordinate-but-present). The dual-FIELD data contract Phase 0 built is unchanged and correct; only its hero-*presentation* clause is superseded. (Light touch — the field names, aggregation invariants, and rationale all stand.)

### `phase-1-scaffold.md` (token floor — doc-review a11y fix)
- Raise the `--text-muted` alpha floor so it meets WCAG AA (4.5:1) for 14px text in BOTH modes. Measured at deepening: dark `rgba(158,180,196,0.6)` over `#0a1a26` ≈ 3.3:1; light `rgba(74,74,82,0.6)` over `#f7f1e3` ≈ 2.9:1 — both fail. Bump the dark alpha to ≈0.78+ and the light alpha to ≈0.82+ (or re-pick the muted physicals) and re-verify contrast. Phase 3 sidesteps the issue for the info-bearing honest sub-line (it uses `--text-secondary`), but the decorative model-clause + taxonomy-hint still ride `--text-muted` — and `--text-muted` is a shared token every later phase inherits. Fix it at the source.

### `phase-5-detail.md` (forward flag — Phase 5's own deepening owns it)
- The per-project detail page reads the same dual fields (`tokens.tokensProcessed` / `tokens.tokensFresh`) plus `tokens.sidechainTokens` for the "X% from subagent invocations" footnote and `tokens.byModel`. Detail reuses `src/lib/format.ts`. No work here — flagged so Phase 5 inherits one contract.

---

## Out of scope for Phase 3 (explicit "later")

- The project grid below the hero → Phase 4.
- Per-project tiles / detail / token byModel breakdown → Phases 4–5.
- The cross-fade route transition logic → route-transition phase (the seam exists from Phase 1).
- Component DOM tests / jsdom / `@testing-library/react` → only if a later component needs render-level assertions; the counter is verified eye-on-browser.
- The `--accent-stat-highlight` gold "one moment" placement → a Phase 9 polish decision (deliberately NOT spent on the hero number).
- WebGL / metaballs / any particle effect → out of scope for v1 entirely (README).
- Final motion-timing polish (ease tuning, settle feel, breath rate) → Phase 9 is where the bar gets iterated; Phase 3 ships a correct, on-spec first build.

---

## Verification (Phase 3 done gate)

1. ✅ `pnpm test` green — `format.test.ts` (token B/M/K + locked-unit + int + bytes + model list + `padCounter` constant-width) and Phase 2's tests both pass.
2. ✅ `pnpm typecheck` clean (incl. the `as CSSProperties` cast with `type CSSProperties` imported).
3. ✅ `pnpm dev` AND `pnpm build && pnpm preview`: hero renders real `tokensProcessed` as a weighted tick-up that settles (not snaps); suffix never flickers; no reflow.
3a. ✅ **M-range gate:** force an M-range value through the counter (scratch `stats.json` with `totalTokensProcessed` ~847e6) → the number does NOT crawl sideways during the tick-up (`padCounter` holds constant width). Real B-range data never exercises this path.
4. ✅ Honest sub-line shows `fresh` + retention window; window suppressed when `tokenWindowDays === null`, "under a day" when 0 (no literal `<` in static HTML).
5. ✅ Unit-label model list is DERIVED from `modelBreakdown` (add/remove a model in a scratch `stats.json` → the label changes); empty breakdown → no model clause; a long (6–8 model) list WRAPS to a deliberate block, no viewport overflow.
6. ✅ Supporting line shows authored lines + project count + files + bytes + commits; NO web-searches.
7. ✅ Specular sheen drifts with the cursor (faint, almost invisible) on hover-capable pointers; **touch shows the crisp solid color, no rest-state gradient**; never a chrome swipe. In `pnpm preview` (built), confirm the gradient ACTUALLY drifts — the quickTo-units bug would silently freeze it. Move the cursor; watch the highlight move.
8. ✅ Gradient breath is barely perceptible, ~12s, no layout shift, no scroll.
9. ✅ Reveal order: number + unit label + **honest sub-line** land early (the `fresh` anchor is NOT gated behind the full 2.4s); only the supporting line + taxonomy hint stagger in after the counter settles.
10. ✅ `prefers-reduced-motion`: final number instant, no tween/sheen/breath/stagger; everything visible immediately.
11. ✅ 360 / 375 / 390 / 430px: number fills horizontally, no overflow, no horizontal scroll; supporting lines wrap legibly.
12. ✅ BOTH modes (light + dark, via OS toggle AND `?theme=`): composition reads deliberate, negative space generous, both pass the water-bead bar.
13. ✅ Null-degrade: `tokenWindowDays === null` ⇒ hero leads with `LINES AUTHORED` (no token sub-line); no tokens AND no git history ⇒ leads with `PROJECTS`. Never "0 TOKENS PROCESSED" / "0 LINES AUTHORED". Counter `aria-label` matches the visible unit in every branch.
14. ✅ **React-vs-GSAP:** the animated number span has no JSX text child; trigger a parent re-render (navigate away and back, or mount a Phase 4 grid stub below) → the counter's value is NOT clobbered / does NOT flash back to 0.
15. ✅ **A11y:** the taxonomy `<Link>` shows a visible `:focus-visible` ring on keyboard tab and is ≥44×44px; the honest sub-line uses `--text-secondary` (AA-legible), not `--text-muted`.
16. ✅ No console errors; no CSP violations in preview; `gsap.parseEase('weighted-settle')` resolves in dev AND preview.
17. ✅ Cold-watch test: record the hero load in both modes. If you react "wow Claude built this" instead of "wow this is slick" — keep polishing (that's Phase 9, but the first build should already be close).

Then open [phase-4-grid.md](phase-4-grid.md) and start.

---

← [Phase 2 — Data wiring](phase-2-data-wiring.md) | [Index](README.md) | Next → [Phase 4 — Project grid](phase-4-grid.md)
