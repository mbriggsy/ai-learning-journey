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

export interface AudioSettings {
  readonly schemaVersion: 1;
  readonly masterVolume: number;   // [0, 1]
  readonly sfxVolume: number;      // [0, 1]
  readonly ambientVolume: number;  // [0, 1]
  readonly muteAll: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = {
  schemaVersion: 1,
  masterVolume: 0.7,
  sfxVolume: 0.8,
  ambientVolume: 0.5,
  muteAll: false,
} as const;
