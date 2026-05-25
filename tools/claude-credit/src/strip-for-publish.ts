/**
 * PRIVACY: produces the public-safe JSON shape for stats.json.
 *
 * Two structural rules:
 *   1. Drop every `projectPath` key (absolute on-disk path — PII) anywhere in
 *      the tree (projects[] AND meta[], both ProjectReport[]).
 *   2. Drop `git.timeline.largestSingleCommit.sha` — a private-repo commit id
 *      with no client use (the site renders only linesAdded). The only `sha`
 *      key in the shape, so dropping the bare name is precise.
 *
 * The hand-coded ALLOWED_KEY_PATHS list is the structural enforcement of
 * "what may ship publicly". The §0.10 stats-shape test asserts the stripped
 * report's key-paths are a SUBSET of this list — so adding a new field that
 * reaches stats.json REQUIRES a deliberate, reviewable edit here (CI fails
 * otherwise). Array indices collapse to `[]` in a path.
 *
 * Consciously published (decided, not oversight): commit DATES
 * (git.timeline.commitsByDay[].date, *.dateISO, *CommitISO) — the cadence
 * story. Calendar dates carry no path/username/secret.
 */
import type { MultiProjectReport } from './taxonomy.js';

/** Keys removed from the published shape wherever they appear. */
const DROP_KEYS = new Set(['projectPath', 'sha']);

function deepStrip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepStrip);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (DROP_KEYS.has(k)) continue;
      out[k] = deepStrip(v);
    }
    return out;
  }
  return value;
}

/** Structurally-cloned, PII-stripped report suitable for JSON.stringify. */
export function stripForPublish(report: MultiProjectReport): unknown {
  return deepStrip(report);
}

/**
 * Every key-path permitted in the published stats.json (array indices → `[]`).
 * Hand-curated: the §0.10 stats-shape test fails if the stripped report yields
 * any path not listed here. `discardedAssetByKind` keys are the fixed asset
 * families (images/audio/video/fonts) emitted by extToFamily.
 */
export const ALLOWED_KEY_PATHS: readonly string[] = [
  'scannedAt',

  // combined
  'combined.projectCount',
  'combined.totalAuthoredFiles',
  'combined.totalAuthoredBytes',
  'combined.totalAuthoredLines',
  'combined.totalPipelineGeneratedFiles',
  'combined.totalPipelineGeneratedBytes',
  'combined.totalToolGeneratedFiles',
  'combined.totalToolGeneratedBytes',
  'combined.totalCommits',
  'combined.totalDiscardedAssets',
  'combined.totalIterationProxies',
  'combined.totalAllFiles',
  'combined.totalAllBytes',
  'combined.totalTokensProcessed',
  'combined.totalTokensFresh',
  'combined.totalSessions',
  'combined.tokenWindowStartISO',
  'combined.tokenWindowEndISO',
  'combined.tokenWindowDays',
  'combined.modelBreakdown[].model',
  'combined.modelBreakdown[].sessions',
  'combined.modelBreakdown[].tokensProcessed',
  'combined.totalTestCases',
  'combined.totalTestLines',
  'combined.totalPlanCount',
  'combined.totalPlanLines',

  // archiveCollective
  'archiveCollective.projectNames[]',
  'archiveCollective.projectCount',
  'archiveCollective.totalAuthoredFiles',
  'archiveCollective.totalAuthoredBytes',
  'archiveCollective.totalAuthoredLines',
  'archiveCollective.totalPipelineGeneratedFiles',
  'archiveCollective.totalPipelineGeneratedBytes',
  'archiveCollective.totalAllBytes',
  'archiveCollective.totalCommits',
  'archiveCollective.totalTokensProcessed',
  'archiveCollective.totalTokensFresh',
  'archiveCollective.totalSessions',
  'archiveCollective.totalTestCases',
  'archiveCollective.totalTestLines',
  'archiveCollective.totalPlanCount',
  'archiveCollective.totalPlanLines',

  // projects[] + meta[] share the ProjectReport shape (projectPath stripped).
  ...['projects', 'meta'].flatMap((root) => [
    `${root}[].projectName`,
    `${root}[].scannedAt`,
    `${root}[].tiers[].tier`,
    `${root}[].tiers[].categories[].category`,
    `${root}[].tiers[].categories[].subcategories[].subcategory`,
    `${root}[].tiers[].categories[].subcategories[].files`,
    `${root}[].tiers[].categories[].subcategories[].bytes`,
    `${root}[].tiers[].categories[].subcategories[].totalLines`,
    `${root}[].tiers[].categories[].subcategories[].nonBlankLines`,
    `${root}[].tiers[].categories[].totals.subcategory`,
    `${root}[].tiers[].categories[].totals.files`,
    `${root}[].tiers[].categories[].totals.bytes`,
    `${root}[].tiers[].categories[].totals.totalLines`,
    `${root}[].tiers[].categories[].totals.nonBlankLines`,
    `${root}[].tiers[].totals.subcategory`,
    `${root}[].tiers[].totals.files`,
    `${root}[].tiers[].totals.bytes`,
    `${root}[].tiers[].totals.totalLines`,
    `${root}[].tiers[].totals.nonBlankLines`,
    `${root}[].git.isGitRepo`,
    `${root}[].git.totalCommits`,
    `${root}[].git.commitsByAuthor[].author`,
    `${root}[].git.commitsByAuthor[].count`,
    `${root}[].git.lifetimeLinesAdded`,
    `${root}[].git.lifetimeLinesRemoved`,
    `${root}[].git.uniqueFilesTouched`,
    `${root}[].git.commitMessageLines`,
    `${root}[].git.discardedAssetFiles`,
    `${root}[].git.discardedAssetEvents`,
    `${root}[].git.discardedAssetByKind.images`,
    `${root}[].git.discardedAssetByKind.audio`,
    `${root}[].git.discardedAssetByKind.video`,
    `${root}[].git.discardedAssetByKind.fonts`,
    `${root}[].git.assetModificationEvents`,
    `${root}[].git.assetUniquePathsTouched`,
    `${root}[].git.firstCommitISO`,
    `${root}[].git.lastCommitISO`,
    `${root}[].git.projectAgeDays`,
    `${root}[].git.linesByAuthor[].author`,
    `${root}[].git.linesByAuthor[].commits`,
    `${root}[].git.linesByAuthor[].linesAdded`,
    `${root}[].git.linesByAuthor[].linesRemoved`,
    `${root}[].git.linesByAuthor[].coAuthoredCommits`,
    `${root}[].git.timeline.commitsByDay[].date`,
    `${root}[].git.timeline.commitsByDay[].count`,
    `${root}[].git.timeline.activeDays`,
    `${root}[].git.timeline.peakDay.date`,
    `${root}[].git.timeline.peakDay.count`,
    `${root}[].git.timeline.largestSingleCommit.dateISO`,
    `${root}[].git.timeline.largestSingleCommit.linesAdded`,
    `${root}[].git.timeline.largestSingleCommit.linesRemoved`,
    `${root}[].proxies.sampleEvalRunCount`,
    `${root}[].proxies.regenScriptCount`,
    `${root}[].proxies.iterationProxyTotal`,
    `${root}[].grandTotals.authoredFiles`,
    `${root}[].grandTotals.authoredBytes`,
    `${root}[].grandTotals.authoredLines`,
    `${root}[].grandTotals.pipelineGeneratedFiles`,
    `${root}[].grandTotals.pipelineGeneratedBytes`,
    `${root}[].grandTotals.toolGeneratedFiles`,
    `${root}[].grandTotals.toolGeneratedBytes`,
    `${root}[].grandTotals.allFiles`,
    `${root}[].grandTotals.allBytes`,
    `${root}[].warnings[]`,
    `${root}[].assetBytesByKind.images`,
    `${root}[].assetBytesByKind.audio`,
    `${root}[].assetBytesByKind.video`,
    `${root}[].assetBytesByKind.fonts`,
    `${root}[].assetBytesByKind.misc-media`,
    `${root}[].topSubcategories[].tier`,
    `${root}[].topSubcategories[].category`,
    `${root}[].topSubcategories[].subcategory`,
    `${root}[].topSubcategories[].bytes`,
    `${root}[].topSubcategories[].files`,
    `${root}[].topSubcategories[].lines`,
    `${root}[].tokens.windowStartISO`,
    `${root}[].tokens.windowEndISO`,
    `${root}[].tokens.windowDays`,
    `${root}[].tokens.sessionCount`,
    `${root}[].tokens.sidechainTokens`,
    `${root}[].tokens.inputTokens`,
    `${root}[].tokens.outputTokens`,
    `${root}[].tokens.cacheCreationInputTokens`,
    `${root}[].tokens.cacheReadInputTokens`,
    `${root}[].tokens.tokensProcessed`,
    `${root}[].tokens.tokensFresh`,
    `${root}[].tokens.byModel[].model`,
    `${root}[].tokens.byModel[].sessions`,
    `${root}[].tokens.byModel[].tokensProcessed`,
    `${root}[].tokens.parseHealth.lineParseErrors`,
    `${root}[].tokens.parseHealth.usageShapeWarnings`,
    `${root}[].tokens.parseHealth.fileReadErrors`,
    `${root}[].testCases`,
    `${root}[].testLines`,
    `${root}[].planCount`,
    `${root}[].planLines`,
    `${root}[].editorial.oneLiner`,
    `${root}[].editorial.hookStat.label`,
    `${root}[].editorial.hookStat.value`,
    `${root}[].editorial.heroImage`,
    `${root}[].editorial.liveUrl`,
    `${root}[].editorial.repoUrl`,
    `${root}[].editorial.status`,
    `${root}[].editorial.description`,
    `${root}[].editorial.gallery[]`,
    `${root}[].editorial.largestCommitCaption`,
  ]),
];
