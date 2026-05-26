import type { ProjectReport } from '@/types'

type AssetBytesByKind = ProjectReport['assetBytesByKind']

export interface DonutSegment {
  key: string
  label: string
  /** TRUE byte value (the legend shows this — proportions are approximate by design). */
  bytes: number
  /** Cumulative start fraction [0,1) of the ring, 0% at 12 o'clock. */
  start: number
  /** Rendered sweep fraction (after min-arc flooring + renormalization). */
  sweep: number
}

// Fixed kind order → stable segment order → stable color assignment (palette lives in the
// component). "misc-media" reads as "other media" in the legend.
const KINDS: ReadonlyArray<{ key: keyof AssetBytesByKind; label: string }> = [
  { key: 'images', label: 'images' },
  { key: 'audio', label: 'audio' },
  { key: 'video', label: 'video' },
  { key: 'fonts', label: 'fonts' },
  { key: 'misc-media', label: 'other media' },
]

/**
 * Build the media-volume donut segments from `assetBytesByKind` (Phase 5 Decision 5).
 *
 * - Omits EXACTLY-zero kinds (a project with no audio shows no audio slice + no legend row).
 *   All-zero media → `[]` (the page omits the whole donut — an empty ring is noise).
 * - Enforces a MIN-ARC FLOOR: a sub-2% sliver (e.g. fonts against gigabytes of video) would
 *   render as an invisible arc and break the color-blind position-pairing, so each non-zero
 *   slice gets at least `minFraction` of the ring, then all are renormalized to sum to 1.
 *   The legend still carries the TRUE byte value, so the floor never lies about magnitude.
 * Pure; does not mutate the input.
 */
export function buildDonutSegments(assetBytesByKind: AssetBytesByKind, minFraction = 0.03): DonutSegment[] {
  const present = KINDS.map(({ key, label }) => ({ key: String(key), label, bytes: assetBytesByKind[key] ?? 0 })).filter(
    (k) => k.bytes > 0,
  )
  if (present.length === 0) return []

  const totalBytes = present.reduce((sum, k) => sum + k.bytes, 0)
  const floored = present.map((k) => ({ ...k, raw: Math.max(k.bytes / totalBytes, minFraction) }))
  const flooredSum = floored.reduce((sum, k) => sum + k.raw, 0)

  let cursor = 0
  return floored.map((k) => {
    const sweep = k.raw / flooredSum // renormalize so the ring sums to exactly 1
    const seg: DonutSegment = { key: k.key, label: k.label, bytes: k.bytes, start: cursor, sweep }
    cursor += sweep
    return seg
  })
}

/** Total media bytes across all non-zero kinds (the donut center label). */
export function totalMediaBytes(assetBytesByKind: AssetBytesByKind): number {
  return KINDS.reduce((sum, { key }) => sum + (assetBytesByKind[key] ?? 0), 0)
}
