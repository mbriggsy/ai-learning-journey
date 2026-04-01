export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'player' | 'spectator';

export interface GameSettings {
  readonly mode: GameMode;
  readonly countdownDuration: number;   // seconds
  readonly huntTimeLimit: number;       // seconds
  readonly seekerDifficulty: Difficulty;
  readonly hiderDifficulty: Difficulty;
  readonly reducedMotion: boolean;      // from prefers-reduced-motion
}

export const DEFAULT_SETTINGS: Readonly<GameSettings> = {
  mode: 'player',
  countdownDuration: 10,
  huntTimeLimit: 120,
  seekerDifficulty: 'easy',
  hiderDifficulty: 'easy',
  reducedMotion: false,  // overridden at boot from media query
} as const;
