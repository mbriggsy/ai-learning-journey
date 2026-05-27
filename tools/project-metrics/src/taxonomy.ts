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
  // 0.1 — temporal context (null = no git history measured)
  firstCommitISO: string | null;
  lastCommitISO: string | null;
  projectAgeDays: number | null;
  // 0.4 — author breakdown (Co-Authored-By aware; additive attribution)
  linesByAuthor: Array<{
    author: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    coAuthoredCommits: number;
  }>;
  // 0.5 — cadence + commit-size story
  timeline: {
    commitsByDay: Array<{ date: string; count: number }>;
    activeDays: number;
    peakDay: { date: string; count: number } | null;
    largestSingleCommit: {
      sha: string;
      dateISO: string;
      linesAdded: number;
      linesRemoved: number;
    } | null;
  };
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
  // 0.2 — bytes-on-disk per asset family (ZERO discipline: measured-and-none = 0, never null)
  assetBytesByKind: {
    images: number;
    audio: number;
    video: number;
    fonts: number;
    'misc-media': number;
  };
  // 0.3 — pre-computed callout cards (top 5 subcategories by bytes)
  topSubcategories: Array<{
    tier: Tier;
    category: string;
    subcategory: string;
    bytes: number;
    files: number;
    lines: number;
  }>;
  // 0.5b — Claude Code session tokens (window-bounded floor; null = no JSONL measured)
  tokens: TokenStats | null;
  // 0.5c — static test-case + plan breadth (counts only, NO execution; ZERO discipline)
  testCases: number;
  testLines: number;
  planCount: number;
  planLines: number;
  // 0.6 — editorial content (per-project config; null = no editorial block)
  editorial: EditorialContent | null;
}

export interface TokenStats {
  // Window covered (oldest assistant message → newest, per-project). Null = unmeasured.
  windowStartISO: string | null;
  windowEndISO: string | null;
  windowDays: number | null;

  sessionCount: number;
  sidechainTokens: number; // subset of tokensProcessed sourced from isSidechain=true lines

  // Raw buckets
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;

  // Aggregates (named to avoid the ambiguous "totalTokens")
  tokensProcessed: number; // input + output + cacheCreation + cacheRead — magnitude shock
  tokensFresh: number; // input + output + cacheCreation — work signal (excludes cheap re-feeds)

  // Per-model breakdown (model name normalized: "claude-opus-4-7" → "Opus 4.7")
  byModel: Array<{ model: string; sessions: number; tokensProcessed: number }>;

  // Parser health — surfaced so the honesty signal is observable. Counters only, never strings.
  parseHealth: {
    lineParseErrors: number;
    usageShapeWarnings: number;
    fileReadErrors: number;
  };
}

export interface EditorialContent {
  oneLiner: string;
  hookStat: { label: string; value: string };
  liveUrl: string | null;
  repoUrl: string | null;
  // 2-value enum; 'shelved' kept open for future per-archive detail pages.
  // NO 'meta' value — meta entries carry editorial: null (no status), ideation §7.
  status: 'active' | 'shelved';
  description: string;
  largestCommitCaption?: string; // optional Briggsy-authored caption next to largestSingleCommit
}

export interface ArchiveCollective {
  projectNames: string[];
  projectCount: number;
  totalAuthoredFiles: number;
  totalAuthoredBytes: number;
  totalAuthoredLines: number;
  totalPipelineGeneratedFiles: number;
  totalPipelineGeneratedBytes: number;
  totalAllBytes: number;
  totalCommits: number;
  totalTokensProcessed: number;
  totalTokensFresh: number;
  totalSessions: number;
  // 0.5c — breadth totals rolled up from archive entries (uniform with combined sum-class)
  totalTestCases: number;
  totalTestLines: number;
  totalPlanCount: number;
  totalPlanLines: number;
}

export interface MultiProjectReport {
  // INVARIANT: archive entries never appear in projects[] or meta[] (they roll up into archiveCollective).
  // INVARIANT: meta entries (tool + site) never appear in projects[] — they live in meta[] only,
  //            carry editorial: null, emit NO tile/detail/asset, and exist ONLY to feed combined totals.
  // INVARIANT A (sum-class): combined.totalX === Σ(projects[].X) + Σ(meta[].X) + (archiveCollective?.totalX ?? 0)
  // INVARIANT C (window): combined.tokenWindow* is min/max across non-null project+meta windows, never a sum.
  // Any change to the aggregation loop in multi-report.ts MUST keep these true (§0.10 test enforces).
  projects: ProjectReport[];
  meta: ProjectReport[]; // totals-only bucket (project-metrics tool + ai-journey-stats site). No tiles. editorial: null.
  archiveCollective: ArchiveCollective | null;
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
    // 0.5b — token aggregates (null-safe; meta[] contributions included per "count everything")
    totalTokensProcessed: number;
    totalTokensFresh: number;
    totalSessions: number;
    tokenWindowStartISO: string | null; // min across non-null project + meta starts
    tokenWindowEndISO: string | null; // max across non-null project + meta ends
    tokenWindowDays: number | null;
    modelBreakdown: Array<{ model: string; sessions: number; tokensProcessed: number }>;
    // 0.5c — breadth totals (test/plan counts, summed across projects + meta + archive)
    totalTestCases: number;
    totalTestLines: number;
    totalPlanCount: number;
    totalPlanLines: number;
  };
  scannedAt: string;
}

/** Empty subcategory stats helper. */
export function emptyStats(subcategory: string): SubcategoryStats {
  return { subcategory, files: 0, bytes: 0, totalLines: 0, nonBlankLines: 0 };
}
