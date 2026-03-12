/**
 * SoundManager — no-op stub for Phase 2.
 * Phase 4 replaces with real audio implementation.
 */
export class SoundManager {
  init(): void {}
  suspend(): void {}
  resume(): void {}
  update(): void {}
  setMusicVolume(_v: number): void {}
  setSfxVolume(_v: number): void {}
  get musicVolume(): number { return 0.5; }
  get masterVolume(): number { return 0.5; }
  set masterVolume(_v: number) { /* no-op */ }
  get sfxVolume(): number { return 0.5; }
  set sfxVolume(_v: number) { /* no-op */ }
}
