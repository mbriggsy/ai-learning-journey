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

export interface NarratorPrompt {
  readonly id: string;
  readonly trigger: string;
  readonly script: string;
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
