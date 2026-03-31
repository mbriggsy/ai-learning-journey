export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  readonly countdownDuration: number;   // seconds
  readonly huntTimeLimit: number;       // seconds
  readonly seekerDifficulty: Difficulty;
  readonly reducedMotion: boolean;      // from prefers-reduced-motion
}

export const DEFAULT_SETTINGS: Readonly<GameSettings> = {
  countdownDuration: 10,
  huntTimeLimit: 120,
  seekerDifficulty: 'easy',
  reducedMotion: false,  // overridden at boot from media query
} as const;
