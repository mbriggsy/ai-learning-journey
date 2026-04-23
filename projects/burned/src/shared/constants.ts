/** Nope window durations in ms — flat 10s across all player counts.
 *  Prior tiered values (3s/5s/7s) felt rushed at the table; playtests
 *  consistently ran out of decision time before players registered the
 *  action, let alone decided whether to Nope. 10s gives the couch
 *  enough breathing room without stalling the party. */
export const NOPE_WINDOW_MS = {
  manyPlayers: 10_000,
  fewPlayers: 10_000,
  headsUp: 10_000,
} as const

/** Paw-print composition: which card subsets for each player count range */
export const DECK_COMPOSITION = {
  small: { min: 2, max: 3, usePaw: true, useNonPaw: false },
  medium: { min: 4, max: 7, usePaw: false, useNonPaw: true },
  large: { min: 8, max: 10, usePaw: true, useNonPaw: true },
} as const

/** Engine timing values — single source of truth for server. */
export const TIMING = {
  NOPE_WINDOW_MS,
  NOPE_GRACE_MS: 300,
} as const
