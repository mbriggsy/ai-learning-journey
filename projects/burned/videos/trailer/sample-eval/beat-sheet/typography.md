# Typography system — Unit 1.8 (LOCKED — variable-axis validated by Phase 0 Unit 0.5 spike)

> Status: typography decision LOCKED — BURNED's existing 3-family
> variable woff2 stack ships in the trailer. `useFonts.ts` rewritten
> to Promise.all pattern per plan Step 3. Per-element typography
> assignments documented + emil-design-eng polish lens applied to
> tracking, line-height, and feature-settings.

## Step 1 — Decision: inherit BURNED's stack

Locked: **inherit BURNED's typography stack** (Clash Display +
General Sans + JetBrains Mono variable woff2). Three reasons:

1. **Brand consistency.** The trailer's typographic vocabulary should
   read as the same world as the HTP dossier. Engineering-peer viewer
   who clicks through to play the game encounters identical typography
   — the trailer becomes the visual prelude to the game.
2. **UMB v3 split was forced.** UMB's in-game typography was less
   refined; UMB v3 trailer correctly defined a separate video stack.
   BURNED's HTP dossier IS the brand identity. The trailer claims it.
3. **§2 frame-pass rate.** Sample frames composited in the typography
   audition pass should pass §2 ("could be a frame from an Archer
   episode") with BURNED's existing stack. If they don't, the
   typography isn't the problem — the composition is.

## Step 2 — Font asset sourcing (LOCKED — no copy step per ADR #15)

BURNED ships **three variable woff2 files** at `public/fonts/`
(verified 2026-05-18 via Glob):

| File | Variable axis range | Source verification |
|------|---------------------|---------------------|
| `ClashDisplay-Variable.woff2` | weight 200–700 | (Fontshare distribution; matches BURNED's existing HTP usage) |
| `GeneralSans-Variable.woff2` | weight 200–700 | (Fontshare distribution; matches BURNED's existing HTP usage) |
| `JetBrainsMono-Variable.woff2` | weight **100–900** | `src/client/howtoplay/fonts-mono-htp.css:9` declares `font-weight: 100 900` ✓ |

There are NO weight-specific files (`clash-display-700.woff2` etc.) —
the first-draft Phase 1 named files that don't exist (same shape as
Phase 0's `burned-display.woff2` ghost-reference catch).

**ADR #15 path discipline (LOCKED):** fonts live at BURNED's
project-root `public/fonts/`. Remotion reads them through Phase 0
ADR #8 `Config.setPublicDir('../../public')`. The first-draft Phase
1 prescribed copying the 3 variable files to
`videos/trailer/public/fonts/` — that path is **UNREACHABLE** to
`staticFile()` during render. NO COPY.

**Variable-axis weight resolution validated by Phase 0 Unit 0.5
spike** (`sample-eval/spike/spike-results.md`): all 5 Remotion
integration points cleared, including custom-font rendering at
multiple weights in MP4 export. Phase 4 Unit 4.0 spike on
variable-axis range is DROPPED from scope per the spike disposition.

## Step 3 — `useFonts.ts` implementation (LOCKED — Promise.all pattern)

Rewrote `src/hooks/useFonts.ts` to address the prior sync-flag race
condition. Phase 0 Unit 0.1 explicitly prescribed
`await Promise.all([loadFont(...) × N])` for multi-font loads. The
prior stub set `loaded = true` before the async loads completed, so
second consumers within the same render frame saw `loaded === true`
and skipped without waiting on the underlying promise.

```ts
// videos/trailer/src/hooks/useFonts.ts (shipped 2026-05-18)
import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

let loadPromise: Promise<unknown> | null = null

export function useFonts(): Promise<unknown> {
  if (loadPromise) return loadPromise

  loadPromise = Promise.all([
    loadFont({
      family: 'Clash Display',
      url: staticFile('fonts/ClashDisplay-Variable.woff2'),
      weight: '200 700',
      format: 'woff2',
    }),
    loadFont({
      family: 'General Sans',
      url: staticFile('fonts/GeneralSans-Variable.woff2'),
      weight: '200 700',
      format: 'woff2',
    }),
    loadFont({
      family: 'JetBrains Mono',
      url: staticFile('fonts/JetBrainsMono-Variable.woff2'),
      weight: '100 900',
      format: 'woff2',
    }),
  ])

  return loadPromise
}
```

Called at `Root.tsx` top level. `@remotion/fonts.loadFont()` auto-tracks
each font via `delayRender` — render blocks until all fonts ready.
Returning the Promise lets a second consumer `await useFonts()`
instead of fire-and-forget; the shared cached promise prevents the
re-fire race.

Three `loadFont` calls instead of nine (3 families × ~3 weights).
Phase 4 references per-element weights (Step 4 table) via CSS
`font-weight` — the variable axis resolves at run-time inside the
browser, no per-weight static woff2 files needed.

## Step 4 — Per-element typography assignments

Plan-locked per-element table + emil-design-eng polish lens applied
(tracking + line-height + feature-settings columns are emil's additions
— the plan handled font/weight/size and let those decisions land in
Phase 4 implementation).

| Element | Font | Weight | Size @ 1920×1080 | Tracking | Line-height | Feature-settings |
|---------|------|--------|------------------|----------|-------------|------------------|
| BURNED logo word (S06 capstone) | Clash Display | 700 | ~180px tall | -2% (display weights tighten optically at this scale) | 1.0 (single line) | `"ss01"` if available for any geometric alt — else default |
| R15 classification stamp ("OPERATION PENDLETON" S01) | JetBrains Mono | 700 | ~28px | +80 (8% — institutional chrome at small caps benefits from open tracking) | 1.15 (3-line stamp) | `"tnum"` for any numerals (case file numbers) |
| Briefing-room CASE BANNER (S02/S03/S06) | Clash Display | 700 | ~64px | -1% | 1.05 | default |
| Comms-ticker text (S04 background, S02/S03/S06 idle) | JetBrains Mono | 500 | ~22px | +40 (4%) | 1.2 | `"tnum"` + `"calt"` (contextual alternates if any) |
| Goofy-stat captions — dry stat (S04 stats 1–4 active) | General Sans | 600 | ~36px | -1% (display-adjacent sans at 36px) | 1.15 | `"tnum"` for numerals (1,407 + 17 + 7) |
| Goofy-stat captions — absurd companion (S04 stats 1–4 active) | General Sans | 500 italic | ~28px | 0 | 1.3 (italic at smaller size breathes) | default |
| Operative dossier card labels (S03) | JetBrains Mono | 700 | ~22px | +60 (6%) | 1.2 | `"tnum"` |
| Stacked-payoff stamp ("AUTONOMOUS FIELD UNIT — ASSET DELIVERED" frame 2280) | JetBrains Mono | 700 | ~38px | +30 (3% — heavier weight + larger size tightens; chrome stays open but not as wide as the small-size R15 #1) | 1.1 | default |
| Closing R15 #4 subhead ("OPERATION STATUS: FIELD-READY" frame 3150) | JetBrains Mono | 700 | ~32px | +50 (5%) | 1.15 | default |
| **Closing R15 #5 main line ("DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS." frame 3165)** | JetBrains Mono | 700 | ~32px | +50 (5% matches R15 #4 above) | 1.2 (two-line allowance for line-break behavior) | default |
| **Closing R15 #5 subhead (30%-opacity bookend per Unit 1.9 lock)** | JetBrains Mono | 500 italic | ~22px | +20 (2%) | 1.3 | default |

### Emil lens notes (polish micro-decisions)

- **Tracking inverse-to-size principle:** small caps + small sizes
  need open tracking to read as institutional chrome; large display
  weights need slight negative tracking to read as confident. The
  +80/-1/-2% gradient by scale is intentional, not arbitrary.
- **Line-height inverse-to-weight principle:** heavy display weights
  (700) sit lower; lighter italic chrome at smaller sizes needs more
  vertical breathing room (1.3) so the descenders don't crowd the
  next line.
- **`"tnum"` discipline:** all stat numerals (1,407 / 17 / 5 / 6 /
  7 / 120) get tabular figures so the cascade's stat captions don't
  jitter horizontally as the numerals enter. Default is proportional;
  the chrome look wants `"tnum"`.
- **Italic for hierarchy, not decoration:** italic on the absurd
  companion line + the R15 #5 subhead creates a secondary-voice
  reading — italic = "this is the parenthetical / aside." Match the
  Sterling-CODED deadpan-with-asides voice in type.
- **NOT applied:** font-feature-settings `"ss01"` etc. are
  family-specific; only enable if the specific Fontshare distribution
  exposes a useful stylistic set. Phase 4 may surface useful sets
  during implementation; locked at defaults for now.

## Step 5 — Color tokens (LOCKED — Radix-style scale+step naming)

BURNED's color tokens use a Radix-inspired 12-step scale per family
(verified in `src/client/shared/tokens/primitives.css:41-132`). Bare
family tokens like `--color-cream` / `--color-teal` / `--color-ink` /
`--color-mahogany` do NOT exist. The trailer references explicit step
indices via `videos/trailer/src/lib/colors.ts PALETTE` (snapshot
constant — single trailer-side source of truth).

| Token | Hex | Use |
|-------|-----|-----|
| `PALETTE.cream12` / `--color-cream-12` | `#f6ebce` | Background tone, parchment, stamp paper |
| `PALETTE.cream2` / `--color-cream-1` | `#19160f` (close to spec's `#0e0c08`) | Body text |
| `PALETTE.teal11` / `--color-teal-11` | `#a0c5ca` | Briefing-room frame light accents |
| `PALETTE.teal4` / `--color-teal-4` | `#163338` | Briefing-room shadow accents |
| `PALETTE.ochre7` / `--color-ochre-7` | `#805032` | Mahogany frame dark tone |
| `PALETTE.ochre9` / `--color-ochre-9` | `#947226` | Card borders, R15 #1 + #2 + #4 + #5-main stamp ink |
| `--color-burned-fire` / spec'd `#be2e27` | `#be2e27` | Critical emphasis — R15 #3 payoff stamp ink, BURNED card flash. Semantic alias: `--color-accent-burned` |

Phase 1 PALETTE export in `videos/trailer/src/lib/colors.ts` carries
the snapshot. Phase 4 references `PALETTE.{name}{step}` constants,
NOT raw hex (single source of truth).

**Color-blind discipline (Briggsy is color blind):** typography +
position + shape carry signal, never color alone. Per BURNED's
existing patterns this is already the case. Phase 4 verifies in MP4
export that:
- `--color-ochre-9` ochre ink on `--color-cream-12` paper survives
  H.264 compression contrast.
- `--color-burned-fire` on HTP hero overprint (R15 #3) survives.

Phase 4 may surface that additional ochre steps (e.g.,
`--color-ochre-11`, `--color-ochre-10`) work better for the R15
chrome treatment than `-9` — locked at `-9` for Phase 1, but Phase 4
micro-tune is allowed.

## Patterns to follow

- UMB v3 `useFonts.ts` pattern (Promise.all multi-font loader).
- BURNED's existing `public/fonts/` directory + typography conventions
  in `docs/PRODUCT-SPECIFICATION.md`.
- Phase 0 Unit 0.5 spike validated custom-font rendering in MP4 export
  at variable-axis weights.
- `src/client/howtoplay/fonts-mono-htp.css` (per-surface font-face
  declaration; HTP-page-scoped).

## Test scenarios

- **Happy path:** `useFonts.ts` loads 3 variable font files via
  `Promise.all([loadFont(...) × 3])`; render blocks until all fonts
  ready (no race condition — verified by deliberately importing
  useFonts in two parallel Sequences and confirming both block on
  the same shared promise; Phase 4 adds this as a render-time
  assertion).
- **Happy path:** Sample frame at frame 2280 (stacked-payoff stamp)
  composites with Clash Display + JetBrains Mono visible — verify in
  MP4 export, not just studio preview (Phase 4 Unit 4.1 + Unit 4.4
  spot-check).
- **Edge case:** Mobile safe-square preview — typography readable at
  1:1 crop centered on 1920×1080 (Phase 6 QA verifies).
- **Anti-pattern guard:** No element uses `system-ui` or any web-
  default font fallback in the trailer (Phase 4 lint rule).
- **Anti-pattern guard:** No reference to weight-specific font files
  (e.g., `clash-display-700.woff2`) — grep `trailer/src/**` returns
  zero matches.

## Verification

- [x] `useFonts.ts` rewritten to Promise.all pattern with shared cached
      promise; typecheck clean.
- [x] **3 variable woff2 files** verified at BURNED's `public/fonts/`
      (Clash Display, General Sans, JetBrains Mono). NO copy to
      `videos/trailer/public/fonts/` per ADR #15.
- [x] `staticFile('fonts/...')` paths resolve through Phase 0 ADR #8
      `setPublicDir('../../public')`.
- [x] Typography assignments documented per element with tracking +
      line-height + feature-settings polish lens.
- [x] Color tokens snapshot lives in `videos/trailer/src/lib/colors.ts`
      `PALETTE` constant; Phase 4 imports from there, not raw hex.
- [x] JetBrains Mono variable axis range `100 900` (matches
      `fonts-mono-htp.css:9` source).
- [ ] **Phase 4 owns:** MP4 export visual verification of variable-axis
      weight resolution at all per-element sizes (the Phase 0 Unit 0.5
      spike validated the mechanism; Phase 4 validates the specific
      per-element compositions).
