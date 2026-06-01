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
 * Derived model names for the unit label (Phase 3 Decision 3 — DATA-DERIVED, never
 * hardcoded). Models that processed ZERO tokens are dropped: the clause is a "what
 * built this" credibility signal, and a 0-token model built nothing. This also keeps
 * parser sentinels like `<synthetic>` (sessions with an undetermined model, 0 tokens)
 * off the hero — rendering a literal "<SYNTHETIC>" on the centerpiece is a slop signal.
 * The filter is principled, not a name blocklist, so it stays rotation-immune.
 *
 * Returns the uppercased names as TOKENS (not a joined string): the Hero renders each as a
 * non-breaking segment so a name like "OPUS 4.7" never splits across a line break (the wrap
 * lands only on the ` · ` separators between segments). Empty/all-zero breakdown → [].
 */
export function formatModelList(models: ModelBreakdown): string[] {
  return models.filter((m) => m.tokensProcessed > 0).map((m) => m.model.toUpperCase())
}

/**
 * Split a short editorial string into its sentences (one per element) so a caller can render
 * each on its own line — one-liners read better as a sentence stack (Briggsy, 2026-06-01).
 * Uses the platform's locale-aware sentence segmenter, which correctly leaves hyphenated terms
 * ("Pac-Man"), en/em-dashes ("2–10", " — "), version numbers, and colons intact — unlike a
 * naive period-split. Degrades to the whole string as one line where Segmenter is unavailable
 * (older engines); single-sentence input is a no-op. Empty/whitespace → [].
 */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) return [trimmed]
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' })
  return Array.from(segmenter.segment(trimmed), (s) => s.segment.trim()).filter(Boolean)
}

/**
 * Token-retention window → the honest human clause "across 30 days of session retention". The
 * token tally is a window-bounded floor (session JSONLs rotate ~30 days), never a lifetime claim
 * (ideation §2). ONE shared source for the Hero sub-line, the TokensBlock footnote, AND the Close
 * qualifier so the wording can't drift between surfaces (code review F5, 2026-05-27). `null → null`
 * (unmeasured → the caller omits the clause). The "<" char is spelled out ("under a day") to stay
 * safe in static HTML.
 */
export function formatWindowClause(days: number | null): string | null {
  if (days === null) return null
  if (days === 0) return 'across under a day of session retention'
  return `across ${days} ${days === 1 ? 'day' : 'days'} of session retention`
}

/**
 * ISO date → short human date "Apr 22" (en-US, month-short + day, no year). `null → null`.
 * Used by the cadence peak-day callout + the token-window range.
 *
 * TZ-safe by design: takes only the calendar-date portion (YYYY-MM-DD), ignoring any time
 * or offset, and renders it as a UTC-anchored date. A bare "2026-05-09" parsed by `new Date()`
 * is UTC midnight, which `toLocaleDateString` would render as the PREVIOUS day for any viewer
 * west of UTC — so we pin the day explicitly. Non-date input → null (never "Invalid Date").
 */
export function formatShortDate(iso: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * ISO date → "as of" long date "May 27, 2026" (en-US, month-short + day + YEAR). `null → null`.
 * Same UTC-pinning + Invalid-Date guard as formatShortDate, just carrying the year — so a malformed
 * `scannedAt` yields null and the caller OMITS the staleness line rather than rendering the literal
 * "Invalid Date" (or throwing a RangeError on stricter engines). Used by the Hero honest sub-line
 * + the About methodology "Numbers as of …" line.
 */
export function formatAsOf(iso: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
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
