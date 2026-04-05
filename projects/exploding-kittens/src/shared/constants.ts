/** Nope window durations in ms — tension scales as players are eliminated */
export const NOPE_WINDOW_MS = {
  manyPlayers: 3_000,
  fewPlayers: 5_000,
  headsUp: 7_000,
} as const

/** Inactivity nudge: phone vibrates + board shows "waiting on..." */
export const INACTIVITY_NUDGE_MS = 30_000

/** Paw-print composition: which card subsets for each player count range */
export const DECK_COMPOSITION = {
  small: { min: 2, max: 3, usePaw: true, useNonPaw: false },
  medium: { min: 4, max: 7, usePaw: false, useNonPaw: true },
  large: { min: 8, max: 10, usePaw: true, useNonPaw: true },
} as const
