/**
 * Deterministic flavor-pool picker. Same seed → same variant.
 *
 * Used to vary card-played narration, drama beats, and Phrasing!
 * cadence across event surfaces while keeping the choice consistent
 * across viewers — pass an event ID and every observer's phone
 * (plus the board) lands on the same variant for the same fire.
 *
 * Implementation: 32-bit string hash → modulo into the variants array.
 * Cheap, deterministic, no dependency. Same shape DossierFeed has used
 * since 2026-04-22 (`src/client/board/events.ts` original site).
 */
export function pick<T extends string>(variants: readonly T[], seed: string): T {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return variants[Math.abs(hash) % variants.length]!
}
