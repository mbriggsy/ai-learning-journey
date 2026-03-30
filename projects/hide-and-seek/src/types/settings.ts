export interface GameSettings {
  readonly countdownDuration: number;   // seconds
  readonly huntTimeLimit: number;       // seconds
  readonly difficulty: 'easy';          // only 'easy' until Phase 5
  readonly reducedMotion: boolean;      // from prefers-reduced-motion
}

export const DEFAULT_SETTINGS: Readonly<GameSettings> = {
  countdownDuration: 10,
  huntTimeLimit: 120,
  difficulty: 'easy',
  reducedMotion: false,  // overridden at boot from media query
} as const;
