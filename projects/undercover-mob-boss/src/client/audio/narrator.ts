// ── Narrator Player ────────────────────────────────────────────────
// Sequential playback of pre-generated narrator audio files.
// V2: Variant-aware — uses NarratorSelection to resolve trigger → audio file.

import { audioEngine } from './audio-engine';
import { NARRATOR_LINES, PHASE_GROUPS } from './narrator-lines';
import type { NarratorSelection } from './narrator-pool';

const AUDIO_BASE_PATH = '/audio';
const GAP_BETWEEN_LINES_MS = 200;

class NarratorPlayer {
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private queue: Array<{ lineId: string; round?: number }> = [];
  private playing = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private gameSelection: NarratorSelection | null = null;

  /** Called when narrator begins speaking (for music ducking, UI, etc.). */
  onNarratorStart: (() => void) | null = null;

  /** Called when narrator finishes speaking (for music un-ducking, etc.). */
  onNarratorEnd: (() => void) | null = null;

  // ── Game Selection API ─────────────────────────────────────────

  /**
   * Set the variant selection for the current game.
   * Called by narrator-bridge at role-reveal transition.
   */
  setGameSelection(selection: NarratorSelection): void {
    this.gameSelection = selection;
  }

  /**
   * Clear the variant selection (game-over → lobby transition).
   */
  clearGameSelection(): void {
    this.gameSelection = null;
  }

  // ── Preloading ───────────────────────────────────────────────────

  /**
   * Preload all narrator files for a given game phase.
   * For variant triggers, only preloads the selected variant (not all).
   * For round-start, loads all 15 round files.
   */
  async preloadPhase(phase: string): Promise<void> {
    const lineIds = PHASE_GROUPS[phase];
    if (!lineIds) return;

    const loadPromises: Promise<void>[] = [];

    for (const lineId of lineIds) {
      const line = NARRATOR_LINES[lineId];
      if (!line) continue;

      if (line.kind === 'single') {
        // Round-start: preload all 15 round-specific files
        for (let n = 1; n <= 15; n++) {
          const url = `${AUDIO_BASE_PATH}/round-start-${n}.ogg`;
          const cacheKey = `round-start-${n}`;
          if (!this.bufferCache.has(cacheKey)) {
            loadPromises.push(this.loadAndCache(cacheKey, url));
          }
        }
      } else {
        // Variant trigger: preload all variants (any could play)
        for (let n = 1; n <= line.variantCount; n++) {
          const cacheKey = `${lineId}-${n}`;
          if (!this.bufferCache.has(cacheKey)) {
            const url = `${AUDIO_BASE_PATH}/${lineId}-${n}.ogg`;
            loadPromises.push(this.loadAndCache(cacheKey, url));
          }
        }
      }
    }

    await Promise.all(loadPromises);
  }

  private async loadAndCache(cacheKey: string, url: string): Promise<void> {
    try {
      const buffer = await audioEngine.loadBuffer(url);
      this.bufferCache.set(cacheKey, buffer);
    } catch (err) {
      console.warn(`[narrator] Failed to preload ${url}:`, err);
    }
  }

  // ── Queue management ─────────────────────────────────────────────

  /**
   * Add a narrator line to the sequential playback queue.
   * For 'round-start', pass the round number to select the correct file.
   */
  enqueue(lineId: string, round?: number): void {
    this.queue.push({ lineId, round });
    if (!this.playing) {
      void this.playNext();
    }
  }

  /**
   * Play the next line in the queue.
   * Lines play sequentially with a 200ms gap between them.
   */
  async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.playing = false;
      this.onNarratorEnd?.();
      return;
    }

    this.playing = true;
    const entry = this.queue.shift()!;

    // Resolve the cache key and URL for this line
    const { cacheKey, url } = this.resolveLineAudio(entry.lineId, entry.round);
    if (!cacheKey) {
      // Unknown line — skip and continue
      void this.playNext();
      return;
    }

    // Fire narrator start callback on first line
    if (!this.currentSource) {
      this.onNarratorStart?.();
    }

    // Load buffer if not cached — with variant-1 fallback on failure
    let buffer = this.bufferCache.get(cacheKey);
    if (!buffer && url) {
      try {
        buffer = await audioEngine.loadBuffer(url);
        this.bufferCache.set(cacheKey, buffer);
      } catch (err) {
        console.warn(`[narrator] Failed to load ${url}:`, err);
        // Variant-1 fallback: if selected variant fails, try variant 1
        buffer = await this.tryVariant1Fallback(entry.lineId, cacheKey) ?? undefined;
        if (!buffer) {
          void this.playNext();
          return;
        }
      }
    }

    if (!buffer) {
      void this.playNext();
      return;
    }

    // Play through the narrator channel gain
    const ctx = audioEngine.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioEngine.getChannelGain('narrator'));
    this.currentSource = source;

    return new Promise<void>((resolve) => {
      source.onended = () => {
        this.currentSource = null;

        if (this.queue.length > 0) {
          // Gap between consecutive lines
          setTimeout(() => {
            void this.playNext().then(resolve).catch(resolve);
          }, GAP_BETWEEN_LINES_MS);
        } else {
          this.playing = false;
          this.onNarratorEnd?.();
          resolve();
        }
      };

      source.start(0);
    });
  }

  /**
   * Resolve line ID + optional round number to a cache key and URL.
   * Handles round-start (deterministic) and variant triggers (pool-selected).
   */
  private resolveLineAudio(
    lineId: string,
    round?: number,
  ): { cacheKey: string | null; url: string | null } {
    const line = NARRATOR_LINES[lineId as keyof typeof NARRATOR_LINES];
    if (!line) {
      console.warn(`[narrator] Unknown line ID: ${lineId}`);
      return { cacheKey: null, url: null };
    }

    if (line.kind === 'single') {
      // Round-start: round number determines file (NOT variant pool)
      const n = Math.max(1, Math.min(15, round ?? 1));
      return {
        cacheKey: `round-start-${n}`,
        url: `${AUDIO_BASE_PATH}/round-start-${n}.ogg`,
      };
    }

    // Variant trigger: use pool selection
    const variantNum = this.getVariantNum(lineId);
    return {
      cacheKey: `${lineId}-${variantNum}`,
      url: `${AUDIO_BASE_PATH}/${lineId}-${variantNum}.ogg`,
    };
  }

  /**
   * Pick a random variant number for a trigger.
   * Fresh random pick every time — no two consecutive plays guaranteed the same.
   */
  private getVariantNum(lineId: string): number {
    const line = NARRATOR_LINES[lineId as keyof typeof NARRATOR_LINES];
    if (!line || line.kind !== 'variant') return 1;
    return Math.floor(Math.random() * line.variantCount) + 1;
  }

  /**
   * Fallback: if selected variant fails to load, try variant 1 (guaranteed to exist).
   */
  private async tryVariant1Fallback(
    lineId: string,
    failedCacheKey: string,
  ): Promise<AudioBuffer | null> {
    const line = NARRATOR_LINES[lineId as keyof typeof NARRATOR_LINES];
    if (!line || line.kind !== 'variant') return null;

    const fallbackKey = `${lineId}-1`;
    if (fallbackKey === failedCacheKey) return null; // Already tried variant 1

    // Check cache first
    const cached = this.bufferCache.get(fallbackKey);
    if (cached) return cached;

    // Try loading variant 1
    const fallbackUrl = `${AUDIO_BASE_PATH}/${lineId}-1.ogg`;
    try {
      console.warn(`[narrator] Falling back to variant 1 for ${lineId}`);
      const buffer = await audioEngine.loadBuffer(fallbackUrl);
      this.bufferCache.set(fallbackKey, buffer);
      return buffer;
    } catch {
      console.warn(`[narrator] Variant-1 fallback also failed for ${lineId}`);
      return null;
    }
  }

  // ── Stop / Dispose ───────────────────────────────────────────────

  /** Stop current playback and clear the queue. */
  stop(): void {
    this.queue.length = 0;

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped — ignore
      }
      this.currentSource = null;
    }

    if (this.playing) {
      this.playing = false;
      this.onNarratorEnd?.();
    }
  }

  /** Clear the buffer cache and selection to free memory. */
  dispose(): void {
    this.stop();
    this.bufferCache.clear();
    this.gameSelection = null;
  }
}

export const narrator = new NarratorPlayer();
