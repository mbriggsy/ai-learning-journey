import { z } from 'zod';

// Hand-written Zod mirror of taxonomy.ts (keeps the tool dep-light vs a
// runtime ts-json-schema generator). Validates buildMultiProjectReport output.

const tierEnum = z.enum(['authored', 'pipeline-generated', 'tool-generated']);

const subcategoryStats = z.object({
  subcategory: z.string(),
  files: z.number(),
  bytes: z.number(),
  totalLines: z.number(),
  nonBlankLines: z.number(),
});

const tierReport = z.object({
  tier: tierEnum,
  categories: z.array(
    z.object({
      category: z.string(),
      subcategories: z.array(subcategoryStats),
      totals: subcategoryStats,
    }),
  ),
  totals: subcategoryStats,
});

const gitStats = z.object({
  isGitRepo: z.boolean(),
  totalCommits: z.number(),
  commitsByAuthor: z.array(z.object({ author: z.string(), count: z.number() })),
  lifetimeLinesAdded: z.number(),
  lifetimeLinesRemoved: z.number(),
  uniqueFilesTouched: z.number(),
  commitMessageLines: z.number(),
  discardedAssetFiles: z.number(),
  discardedAssetEvents: z.number(),
  discardedAssetByKind: z.record(z.string(), z.number()),
  assetModificationEvents: z.number(),
  assetUniquePathsTouched: z.number(),
  firstCommitISO: z.string().nullable(),
  lastCommitISO: z.string().nullable(),
  projectAgeDays: z.number().nullable(),
  linesByAuthor: z.array(
    z.object({
      author: z.string(),
      commits: z.number(),
      linesAdded: z.number(),
      linesRemoved: z.number(),
      coAuthoredCommits: z.number(),
    }),
  ),
  timeline: z.object({
    commitsByDay: z.array(z.object({ date: z.string(), count: z.number() })),
    activeDays: z.number(),
    peakDay: z.object({ date: z.string(), count: z.number() }).nullable(),
    largestSingleCommit: z
      .object({
        sha: z.string(),
        dateISO: z.string(),
        linesAdded: z.number(),
        linesRemoved: z.number(),
      })
      .nullable(),
  }),
});

const tokenStats = z.object({
  windowStartISO: z.string().nullable(),
  windowEndISO: z.string().nullable(),
  windowDays: z.number().nullable(),
  sessionCount: z.number(),
  sidechainTokens: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationInputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  tokensProcessed: z.number(),
  tokensFresh: z.number(),
  byModel: z.array(
    z.object({ model: z.string(), sessions: z.number(), tokensProcessed: z.number() }),
  ),
  parseHealth: z.object({
    lineParseErrors: z.number(),
    usageShapeWarnings: z.number(),
    fileReadErrors: z.number(),
  }),
});

const editorialContent = z.object({
  oneLiner: z.string(),
  hookStat: z.object({ label: z.string(), value: z.string() }),
  liveUrl: z.string().nullable(),
  repoUrl: z.string().nullable(),
  status: z.enum(['active', 'shelved']),
  description: z.string(),
  largestCommitCaption: z.string().optional(),
});

const projectReport = z.object({
  projectPath: z.string(),
  projectName: z.string(),
  scannedAt: z.string(),
  tiers: z.array(tierReport),
  git: gitStats,
  proxies: z.object({
    sampleEvalRunCount: z.number(),
    regenScriptCount: z.number(),
    iterationProxyTotal: z.number(),
  }),
  grandTotals: z.object({
    authoredFiles: z.number(),
    authoredBytes: z.number(),
    authoredLines: z.number(),
    pipelineGeneratedFiles: z.number(),
    pipelineGeneratedBytes: z.number(),
    toolGeneratedFiles: z.number(),
    toolGeneratedBytes: z.number(),
    allFiles: z.number(),
    allBytes: z.number(),
  }),
  warnings: z.array(z.string()),
  assetBytesByKind: z.object({
    images: z.number(),
    audio: z.number(),
    video: z.number(),
    fonts: z.number(),
    'misc-media': z.number(),
  }),
  topSubcategories: z.array(
    z.object({
      tier: tierEnum,
      category: z.string(),
      subcategory: z.string(),
      bytes: z.number(),
      files: z.number(),
      lines: z.number(),
    }),
  ),
  tokens: tokenStats.nullable(),
  testCases: z.number(),
  testLines: z.number(),
  planCount: z.number(),
  planLines: z.number(),
  editorial: editorialContent.nullable(),
});

const archiveCollective = z.object({
  projectNames: z.array(z.string()),
  projectCount: z.number(),
  totalAuthoredFiles: z.number(),
  totalAuthoredBytes: z.number(),
  totalAuthoredLines: z.number(),
  totalPipelineGeneratedFiles: z.number(),
  totalPipelineGeneratedBytes: z.number(),
  totalAllBytes: z.number(),
  totalCommits: z.number(),
  totalTokensProcessed: z.number(),
  totalTokensFresh: z.number(),
  totalSessions: z.number(),
  totalTestCases: z.number(),
  totalTestLines: z.number(),
  totalPlanCount: z.number(),
  totalPlanLines: z.number(),
});

export const multiProjectReportSchema = z.object({
  projects: z.array(projectReport),
  meta: z.array(projectReport),
  archiveCollective: archiveCollective.nullable(),
  combined: z.object({
    projectCount: z.number(),
    totalAuthoredFiles: z.number(),
    totalAuthoredBytes: z.number(),
    totalAuthoredLines: z.number(),
    totalPipelineGeneratedFiles: z.number(),
    totalPipelineGeneratedBytes: z.number(),
    totalToolGeneratedFiles: z.number(),
    totalToolGeneratedBytes: z.number(),
    totalCommits: z.number(),
    totalDiscardedAssets: z.number(),
    totalIterationProxies: z.number(),
    totalAllFiles: z.number(),
    totalAllBytes: z.number(),
    totalTokensProcessed: z.number(),
    totalTokensFresh: z.number(),
    totalSessions: z.number(),
    tokenWindowStartISO: z.string().nullable(),
    tokenWindowEndISO: z.string().nullable(),
    tokenWindowDays: z.number().nullable(),
    modelBreakdown: z.array(
      z.object({ model: z.string(), sessions: z.number(), tokensProcessed: z.number() }),
    ),
    totalTestCases: z.number(),
    totalTestLines: z.number(),
    totalPlanCount: z.number(),
    totalPlanLines: z.number(),
  }),
  scannedAt: z.string(),
});
