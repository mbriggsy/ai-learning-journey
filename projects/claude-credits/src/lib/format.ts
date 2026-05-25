import type { MultiProjectReport } from '@/types'

type ModelBreakdown = MultiProjectReport['combined']['modelBreakdown']

/**
 * Format a token count with a magnitude suffix, choosing the unit ONCE from the
 * value's magnitude. The mantissa decimals are fixed per unit so an animated
 * tick-up never changes glyph count mid-tween (Phase 3 Decision 5):
 *   ≥ 1e9 → "X.XXB"  (2 decimals)
 *   ≥ 1e6 → "XXX.XM" (1 decimal)
 *   ≥ 1e3 → "XXX.XK" (1 decimal)
 *   else  → integer
 * The unit is derived from the FINAL/target value and passed to the counter so
 * every animation frame uses the same unit (see HeroCounter). For static render
 * the target IS the value, so the single-arg form is correct.
 *
 * NOTE: within a unit the INTEGER part can still grow (e.g. "0.00B" → "10.72B"
 * crosses 5→6 glyphs as it passes 10B). padCounter() handles that width growth;
 * formatTokens only guarantees a stable SUFFIX and decimal count.
 */
export function formatTokens(n: number, unitFromTarget?: 'B' | 'M' | 'K' | ''): string {
  const unit = unitFromTarget ?? pickTokenUnit(n)
  switch (unit) {
    case 'B':
      return `${(n / 1e9).toFixed(2)}B`
    case 'M':
      return `${(n / 1e6).toFixed(1)}M`
    case 'K':
      return `${(n / 1e3).toFixed(1)}K`
    default:
      return `${Math.round(n)}`
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

/** Bytes → human (KB/MB/GB, 1 decimal). 2_100_000_000 → "2.1 GB". */
export function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`
  return `${Math.round(n)} B`
}

/**
 * Derived model clause for the unit label (Phase 3 Decision 3 — DATA-DERIVED, never
 * hardcoded). Models that processed ZERO tokens are dropped: the clause is a "what
 * built this" credibility signal, and a 0-token model built nothing. This also keeps
 * parser sentinels like `<synthetic>` (sessions with an undetermined model, 0 tokens)
 * off the hero — rendering a literal "<SYNTHETIC>" on the centerpiece is a slop signal.
 * The filter is principled, not a name blocklist, so it stays rotation-immune.
 * Empty (or all-zero) breakdown → "" (no trailing clause).
 */
export function formatModelList(models: ModelBreakdown): string {
  return models
    .filter((m) => m.tokensProcessed > 0)
    .map((m) => m.model.toUpperCase())
    .join(' · ')
}

// U+2007 FIGURE SPACE — same advance width as a digit in tabular fonts, but invisible.
// MUST stay U+2007: a normal space (U+0020) is NOT digit-width and would defeat the
// constant-width guard. The test pins the exact codepoint so an encoding swap fails loudly.
const FIGURE_SPACE = ' '

/**
 * Left-pad a counter frame to a fixed glyph count with FIGURE SPACE so a growing
 * integer/mantissa (e.g. "0.00B" → "10.72B", or M-range "8.5M" → "847.0M") never
 * changes rendered width and never crawls under center alignment (Phase 3 Decision 5).
 * `targetLen` = final string length.
 */
export function padCounter(s: string, targetLen: number): string {
  return s.length >= targetLen ? s : FIGURE_SPACE.repeat(targetLen - s.length) + s
}
