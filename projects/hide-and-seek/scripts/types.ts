/** Asset categories matching directory structure */
export type AssetCategory = 'characters' | 'tiles' | 'ui' | 'furniture';

/** Aspect ratios supported by Imagen 4 */
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

/** Image size tiers supported by Imagen 4 (omit for default 1K) */
export type ImageSize = '1K' | '2K';

/** Post-processing strategy for each asset */
export type PostProcessing =
  | { readonly kind: 'tile' }
  | { readonly kind: 'sprite' }
  | { readonly kind: 'sprite-multi'; readonly sliceWidth: number; readonly sliceHeight: number }
  | { readonly kind: 'ui' };

/** Definition for a single asset to generate */
export interface AssetDefinition {
  /** Unique kebab-case identifier: {category}-{entity}-{variant} */
  readonly id: string;
  readonly category: AssetCategory;
  /** Prompt suffix appended to STYLE_PREFIX */
  readonly promptSuffix: string;
  /** Final output dimensions in pixels */
  readonly targetWidth: number;
  readonly targetHeight: number;
  /** Aspect ratio for API request */
  readonly aspectRatio: AspectRatio;
  /** Resolution tier for API request */
  readonly imageSize: ImageSize;
  /** Post-processing strategy */
  readonly postProcess: PostProcessing;
  /** Whether this asset needs chroma-key background removal */
  readonly chromaKey: boolean;
  /** Whether this is a floor tile (must be opaque, no chroma-key) */
  readonly opaque: boolean;
}

/** Configuration for a generation session */
export interface GenerationConfig {
  /** Gemini model ID */
  readonly model: string;
  /** Maximum API calls per invocation */
  readonly budgetCap: number;
  /** Minimum delay between API calls in ms */
  readonly interCallDelayMs: number;
  /** Maximum retry attempts per asset */
  readonly maxRetries: number;
  /** Halt after this many consecutive failures */
  readonly circuitBreakerThreshold: number;
  /** Path to approved style reference image (if any) */
  readonly styleReferencePath: string | undefined;
  /** Force regeneration of all assets */
  readonly forceAll: boolean;
  /** Print what would be generated without calling API */
  readonly dryRun: boolean;
  /** Only generate these asset IDs */
  readonly only: readonly string[] | undefined;
}

/** Result of generating a single asset */
export type GenerationResult =
  | { readonly status: 'success'; readonly assetId: string; readonly path: string }
  | { readonly status: 'skipped'; readonly assetId: string; readonly reason: 'prompt-unchanged' }
  | { readonly status: 'failed'; readonly assetId: string; readonly attempts: number; readonly lastError: string };

/** Error classification for retry decisions */
export type GenerationError =
  | { readonly kind: 'auth'; readonly message: string }
  | { readonly kind: 'rate-limit'; readonly retryAfterMs: number }
  | { readonly kind: 'server-error'; readonly status: number; readonly message: string }
  | { readonly kind: 'safety-block'; readonly reason: string }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'unknown'; readonly message: string };

/** Single entry in the generation log */
export interface GenerationLogEntry {
  readonly assetId: string;
  readonly status: 'success' | 'skipped' | 'failed';
  readonly promptHash: string;
  readonly timestamp: string;
  readonly model: string;
  readonly attempts: number;
  readonly dimensions?: { readonly width: number; readonly height: number };
  readonly error?: string;
}

/** Persistent generation log — tracks what has been generated and with what prompts */
export interface GenerationLog {
  generatedAt: string;
  model: string;
  assets: GenerationLogEntry[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}

/** Quality gate check result */
export type QualityCheckSeverity = 'CRITICAL' | 'WARNING';

export interface QualityCheckResult {
  readonly assetId: string;
  readonly check: string;
  readonly severity: QualityCheckSeverity;
  readonly passed: boolean;
  readonly expected: string;
  readonly actual: string;
}

/** Validation report for all processed assets */
export interface ValidationReport {
  readonly timestamp: string;
  readonly totalAssets: number;
  readonly passed: number;
  readonly criticalFailures: number;
  readonly warnings: number;
  readonly results: readonly QualityCheckResult[];
}
