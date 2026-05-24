/**
 * Taxonomy: three tiers of credit, with category + subcategory under each.
 *
 * Tiers separate "who/what made this":
 *   - authored: Claude + Briggsy wrote it directly (code, docs, prompts).
 *   - pipeline-generated: Claude built the pipeline; pipeline produced this
 *     (Imagen images, TTS voices, ffmpeg renders, regen scripts).
 *   - tool-generated: Compiler/bundler/package-manager output. Tracked but
 *     not counted as credit (so we don't claim we "wrote" pnpm-lock).
 */

export const TIERS = ['authored', 'pipeline-generated', 'tool-generated'] as const;
export type Tier = (typeof TIERS)[number];

export const CATEGORIES = {
  authored: ['code', 'docs', 'data', 'process'],
  'pipeline-generated': ['assets', 'iteration-receipts'],
  'tool-generated': ['compiled', 'lockfiles', 'snapshots', 'caches'],
} as const satisfies Record<Tier, readonly string[]>;

export type Category<T extends Tier = Tier> = (typeof CATEGORIES)[T][number];

export const SUBCATEGORIES = {
  // Authored
  code: ['source', 'tests', 'test-fixtures', 'config', 'build-scripts', 'schemas', 'styles', 'markup'],
  docs: ['plans', 'specifications', 'conventions', 'adrs', 'insights', 'readmes', 'narrative', 'triage', 'general'],
  data: ['game-content', 'generation-prompts', 'lookup-tables'],
  process: ['commit-messages'],
  // Pipeline-generated
  assets: ['images', 'audio', 'video', 'fonts', 'misc-media'],
  'iteration-receipts': ['sample-eval-runs', 'regen-scripts'],
  // Tool-generated
  compiled: ['compiled'],
  lockfiles: ['lockfiles'],
  snapshots: ['snapshots'],
  caches: ['caches'],
} as const satisfies Record<string, readonly string[]>;

export type Subcategory = (typeof SUBCATEGORIES)[keyof typeof SUBCATEGORIES][number];

export type FileKind = 'text' | 'binary';

export interface CategorizedFile {
  /** Path relative to project root, forward-slash normalized. */
  relPath: string;
  /** Absolute path on disk. */
  absPath: string;
  tier: Tier;
  category: string;
  subcategory: string;
  kind: FileKind;
  bytes: number;
  /** Only set for text files. */
  totalLines?: number;
  nonBlankLines?: number;
}

export interface SubcategoryStats {
  subcategory: string;
  files: number;
  bytes: number;
  totalLines: number;
  nonBlankLines: number;
}

export interface CategoryReport {
  category: string;
  subcategories: SubcategoryStats[];
  totals: SubcategoryStats;
}

export interface TierReport {
  tier: Tier;
  categories: CategoryReport[];
  totals: SubcategoryStats;
}

export interface GitStats {
  isGitRepo: boolean;
  totalCommits: number;
  commitsByAuthor: Array<{ author: string; count: number }>;
  lifetimeLinesAdded: number;
  lifetimeLinesRemoved: number;
  uniqueFilesTouched: number;
  commitMessageLines: number;
  /** Unique asset filepaths deleted across history. */
  discardedAssetFiles: number;
  /** Total deletion events; a path deleted/recreated/deleted counts twice. */
  discardedAssetEvents: number;
  /** Breakdown by extension family. */
  discardedAssetByKind: Record<string, number>;
  /**
   * Total asset modification events across history (any commit that added,
   * modified, or deleted an asset file). Better proxy for iteration than
   * the discarded count, since most regens overwrite in place.
   */
  assetModificationEvents: number;
  /** Unique asset paths ever touched across history. */
  assetUniquePathsTouched: number;
}

export interface ProxyStats {
  sampleEvalRunCount: number;
  regenScriptCount: number;
  iterationProxyTotal: number;
}

export interface GrandTotals {
  authoredFiles: number;
  authoredBytes: number;
  authoredLines: number;
  pipelineGeneratedFiles: number;
  pipelineGeneratedBytes: number;
  toolGeneratedFiles: number;
  toolGeneratedBytes: number;
  allFiles: number;
  allBytes: number;
}

export interface ProjectReport {
  projectPath: string;
  projectName: string;
  scannedAt: string;
  tiers: TierReport[];
  git: GitStats;
  proxies: ProxyStats;
  grandTotals: GrandTotals;
  warnings: string[];
}

export interface MultiProjectReport {
  projects: ProjectReport[];
  combined: {
    projectCount: number;
    totalAuthoredFiles: number;
    totalAuthoredBytes: number;
    totalAuthoredLines: number;
    totalPipelineGeneratedFiles: number;
    totalPipelineGeneratedBytes: number;
    totalToolGeneratedFiles: number;
    totalToolGeneratedBytes: number;
    totalCommits: number;
    totalDiscardedAssets: number;
    totalIterationProxies: number;
    totalAllFiles: number;
    totalAllBytes: number;
  };
  scannedAt: string;
}

/** Empty subcategory stats helper. */
export function emptyStats(subcategory: string): SubcategoryStats {
  return { subcategory, files: 0, bytes: 0, totalLines: 0, nonBlankLines: 0 };
}
