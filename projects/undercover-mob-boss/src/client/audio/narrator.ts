// ── Narrator Player ────────────────────────────────────────────────
// Sequential playback of pre-generated narrator WAV files.
// Connects through the narrator channel gain in the audio engine.

import { audioEngine } from './audio-engine';
import { NARRATOR_LINES, PHASE_GROUPS } from './narrator-lines';

const AUDIO_BASE_PATH = '/audio';
const GAP_BETWEEN_LINES_MS = 200;

class NarratorPlayer {
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private queue: Array<{ lineId: string; round?: number }> = [];
  private playing = false;
  private currentSource: AudioBufferSourceNode | null = null;

  /** Called when narrator begins speaking (for music ducking, UI, etc.). */
  onNarratorStart: (() => void) | null = null;

  /** Called when narrator finishes speaking (for music un-ducking, etc.). */
  onNarratorEnd: (() => void) | null = null;

  // ── Preloading ───────────────────────────────────────────────────

  /**
   * Preload all narrator files for a given game phase.
   * Resolves round-start templates by loading rounds 1–15.
   */
  async preloadPhase(phase: string): Promise<void> {
    const lineIds = PHASE_GROUPS[phase];
    if (!lineIds) return;

    const loadPromises: Promise<void>[] = [];

    for (const lineId of lineIds) {
      if (lineId === 'round-start') {
        // Preload all 15 round-start variants
        for (let n = 1; n <= 15; n++) {
          const url = `${AUDIO_BASE_PATH}/round-start-${n}.wav`;
          const cacheKey = `round-start-${n}`;
          if (!this.bufferCache.has(cacheKey)) {
            loadPromises.push(this.loadAndCache(cacheKey, url));
          }
        }
      } else {
        const line = NARRATOR_LINES[lineId];
        if (line && !this.bufferCache.has(lineId)) {
          const url = `${AUDIO_BASE_PATH}/${line.file}`;
          loadPromises.push(this.loadAndCache(lineId, url));
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

    // Load buffer if not cached
    let buffer = this.bufferCache.get(cacheKey);
    if (!buffer && url) {
      try {
        buffer = await audioEngine.loadBuffer(url);
        this.bufferCache.set(cacheKey, buffer);
      } catch (err) {
        console.warn(`[narrator] Failed to load ${url}:`, err);
        void this.playNext();
        return;
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
   * Handles the round-start {N} template pattern.
   */
  private resolveLineAudio(
    lineId: string,
    round?: number,
  ): { cacheKey: string | null; url: string | null } {
    if (lineId === 'round-start') {
      const n = Math.max(1, Math.min(15, round ?? 1));
      return {
        cacheKey: `round-start-${n}`,
        url: `${AUDIO_BASE_PATH}/round-start-${n}.wav`,
      };
    }

    const line = NARRATOR_LINES[lineId];
    if (!line) {
      console.warn(`[narrator] Unknown line ID: ${lineId}`);
      return { cacheKey: null, url: null };
    }

    return {
      cacheKey: lineId,
      url: `${AUDIO_BASE_PATH}/${line.file}`,
    };
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

  /** Clear the buffer cache to free memory. */
  dispose(): void {
    this.stop();
    this.bufferCache.clear();
  }
}

export const narrator = new NarratorPlayer();
