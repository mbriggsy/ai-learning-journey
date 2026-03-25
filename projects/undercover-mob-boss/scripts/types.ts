// --- Prompt & Asset Definitions ---

export type PostProcessing =
  | { kind: 'resize' }
  | { kind: 'chroma-key-then-resize' };

export interface AssetPrompt {
  readonly name: string;
  readonly promptSuffix: string;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly aspectRatio: '3:4' | '1:1' | '16:9';
  readonly needsTransparency: boolean;
  readonly postProcess: PostProcessing;
  /** Output format — defaults to 'png' if omitted. */
  readonly format?: 'png' | 'webp';
  /** Subdirectory under public/assets/ — e.g. 'cards' → public/assets/cards/. */
  readonly outputSubDir?: string;
}

// --- Generation Log ---

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

// --- Narrator Types ---

/** @deprecated Use NarratorVariant for V2 variant-aware prompts. */
export interface NarratorPrompt {
  readonly id: string;
  readonly trigger: string;
  readonly script: string;
}

/** V2 variant-aware narrator prompt. Groups multiple scripts per trigger. */
export interface NarratorVariant {
  readonly triggerId: string;
  readonly variantNum: number;
  readonly script: string;
  /** Human-readable description of when this line plays. */
  readonly description: string;
  /** Category to separate game lines from trailer lines. */
  readonly category: 'game' | 'trailer';
}

/** Compute the file ID for a variant (e.g. 'nomination-1'). */
export function variantId(v: NarratorVariant): string {
  return `${v.triggerId}-${v.variantNum}`;
}

export interface NarratorLogEntry {
  id: string;
  status: 'success' | 'failed' | 'skipped';
  fileSizeBytes: number | null;
  durationMs: number | null;
  failureReason?: string;
  generatedAt: string;
}

export interface NarratorLog {
  generatedAt: string;
  model: string;
  voiceId: string;
  lines: NarratorLogEntry[];
  summary: { total: number; succeeded: number; failed: number };
}
