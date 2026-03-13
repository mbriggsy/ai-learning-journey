/**
 * AssetManager — two-tier asset loading with race-condition guards.
 *
 * Boot tier: shared assets loaded once at startup (car atlas, tiles) + font ready gate.
 * Per-track tier: track BG loaded on selection, unloaded on track change.
 *
 * Generation counter prevents stale-load races on rapid track switching (C1).
 */

import { Assets } from 'pixi.js';
import { ASSETS, type TrackId } from '../assets/manifest';

export class AssetManager {
  private currentTrackId: TrackId | null = null;
  private loadGeneration = 0;

  /** Load all shared assets + fonts in parallel. Called once at boot. */
  async boot(): Promise<void> {
    await Promise.all([
      Assets.load([
        ASSETS.cars.atlas,
        ASSETS.textures.asphalt,
        ASSETS.textures.grass,
        ASSETS.textures.curb,
      ]),
      document.fonts.ready,
    ]);
  }

  /**
   * Load a track's BG texture. Unloads previous track BG if different.
   * Generation counter discards stale loads from rapid switching (C1).
   */
  async loadTrack(trackId: TrackId): Promise<void> {
    if (this.currentTrackId === trackId) return;

    const generation = ++this.loadGeneration;

    // Unload previous track BG immediately
    if (this.currentTrackId) {
      Assets.unload(ASSETS.tracks[this.currentTrackId].bg);
      this.currentTrackId = null;
    }

    await Assets.load(ASSETS.tracks[trackId].bg);

    // Stale check: another loadTrack() was called while we were awaiting
    if (generation !== this.loadGeneration) {
      Assets.unload(ASSETS.tracks[trackId].bg);
      return;
    }

    this.currentTrackId = trackId;
  }

  /** Unload current track BG. Call when leaving gameplay. */
  unloadTrack(): void {
    if (this.currentTrackId) {
      Assets.unload(ASSETS.tracks[this.currentTrackId].bg);
      this.currentTrackId = null;
    }
  }

  get hasTrackLoaded(): boolean {
    return this.currentTrackId !== null;
  }

  get loadedTrackId(): TrackId | null {
    return this.currentTrackId;
  }
}
