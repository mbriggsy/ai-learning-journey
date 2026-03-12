/**
 * Shared types for Phase 0 (asset generation) and Phase 1 (asset processing).
 *
 * Phase 0 writes PNG files to assets/raw/.
 * Phase 1 reads *.png files from assets/raw/ (ignoring *.raw.png fallbacks and *.json).
 */

// --- Prompt & Asset Definitions ---

export type PostProcessing =
  | { kind: 'resize' }
  | { kind: 'chroma-key-then-resize' }
  | { kind: 'crop-and-resize'; cropRegion: { left: number; top: number; width: number; height: number } };

export interface AssetPrompt {
  readonly name: string;
  readonly promptSuffix: string;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly aspectRatio: '1:1' | '16:9';
  readonly sizeTier: '1K' | '2K';
  readonly postProcess: PostProcessing;
}

// --- Generation Results ---

export type GenerationError =
  | { kind: 'auth'; message: string }
  | { kind: 'rate-limit'; retryAfterMs: number }
  | { kind: 'server-error'; status: number; message: string }
  | { kind: 'safety-block'; reason: string }
  | { kind: 'timeout' }
  | { kind: 'sharp-error'; message: string; rawSaved: boolean };

export type GenerationResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; error: GenerationError };

// --- Generation Log (written to assets/raw/generation-log.json) ---

export interface GenerationLogEntry {
  name: string;
  status: 'success' | 'failed';
  promptHash: string;
  dimensions: { width: number; height: number } | null;
  hasAlpha: boolean | null;
  failureReason?: string;
  generatedAt: string;
}

export interface GenerationLog {
  generatedAt: string;
  model: string;
  sdkVersion: string;
  assets: GenerationLogEntry[];
  summary: { total: number; succeeded: number; failed: number };
}

// --- Spritesheet Types (Phase 1 — Asset Processing) ---

export interface SpritesheetFrame {
  frame: { x: number; y: number; w: number; h: number };
  trimmed: boolean;
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
}

export interface SpritesheetDescriptor {
  frames: Record<string, SpritesheetFrame>;
  meta: { image: string; format: string; size: { w: number; h: number }; scale: string };
}
