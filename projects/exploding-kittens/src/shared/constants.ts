/** Nope window durations in ms — tension scales as players are eliminated */
export const NOPE_WINDOW_MS = {
  manyPlayers: 3_000,
  fewPlayers: 5_000,
  headsUp: 7_000,
} as const

/** Paw-print composition: which card subsets for each player count range */
export const DECK_COMPOSITION = {
  small: { min: 2, max: 3, usePaw: true, useNonPaw: false },
  medium: { min: 4, max: 7, usePaw: false, useNonPaw: true },
  large: { min: 8, max: 10, usePaw: true, useNonPaw: true },
} as const

/** Animation durations in ms — single source of truth for engine + client */
export const TIMING = {
  // Phase 2 engine values
  NOPE_WINDOW_MS,

  // Phase 5 animation durations
  EK_REVEAL_MS: 2_500,          // steps 1-5 (tension hold is open-ended)
  EK_RELIEF_MS: 1_000,          // Defuse relief animation
  EK_ELIMINATION_MS: 1_000,     // elimination animation
  CARD_PLAY_FLY_MS: 400,        // card -> arena -> discard
  CARD_DRAW_MS: 600,            // draw pile -> reveal
  STAGGER_CHILDREN_MS: 100,     // deal stagger per card
  DEAL_DELAY_MS: 300,           // delay before deal starts
  TURN_PULSE_MS: 800,           // turn change animation
  NOPE_SHAKE_MS: 350,           // per-Nope impact
  SCREEN_FLASH_MS: 300,         // semi-transparent overlay
  SEE_FUTURE_AUTO_CLOSE_MS: 10_000, // auto-close See the Future sheet
  NOPE_GRACE_MS: 300,           // FAB grace window before tappable
  SHUFFLE_MS: 700,              // deck shuffle visual
  FAVOR_TRANSFER_MS: 600,       // card-back flies between players
} as const
