import path from 'node:path';
import { compileRules, DEFAULT_RULES, classify } from './classifier.js';
import { loadProjectConfig } from './config.js';
import { categorize, aggregateTiers } from './counter.js';
import { collectGitStats } from './git-stats.js';
import { collectProxyStats } from './proxies.js';
import type { CategorizedFile, GrandTotals, ProjectReport } from './taxonomy.js';
import { walkProject } from './walker.js';

export interface BuildReportOptions {
  rootDir: string;
  includeIgnored?: boolean;
}

export async function buildProjectReport(opts: BuildReportOptions): Promise<ProjectReport> {
  const rootDir = path.resolve(opts.rootDir);
  const warnings: string[] = [];

  const { config, configPath } = await loadProjectConfig(rootDir);
  if (!configPath) {
    warnings.push('No claude-credit.config.* found — using built-in defaults.');
  }

  // Prepend user rules so they win over defaults.
  const allRules = [...(config.classificationRules ?? []), ...DEFAULT_RULES];
  const compiled = compileRules(allRules);

  const categorized: CategorizedFile[] = [];
  for await (const file of walkProject({
    rootDir,
    respectGitignore: !opts.includeIgnored,
    additionalExcludes: config.excludeAdditional ?? [],
    includeFromGitignore: config.includeFromGitignore ?? [],
  })) {
    const classification = classify(file, compiled);
    categorized.push(await categorize(file, classification));
  }

  const tiers = aggregateTiers(categorized);
  const [git, proxies] = await Promise.all([
    collectGitStats(rootDir),
    collectProxyStats(rootDir, {
      iterationDirNames: config.proxies?.iterationDirNames,
      regenScriptGlobs: config.proxies?.regenScriptGlobs,
    }),
  ]);

  const grandTotals: GrandTotals = {
    authoredFiles: 0,
    authoredBytes: 0,
    authoredLines: 0,
    pipelineGeneratedFiles: 0,
    pipelineGeneratedBytes: 0,
    toolGeneratedFiles: 0,
    toolGeneratedBytes: 0,
    allFiles: 0,
    allBytes: 0,
  };
  for (const tier of tiers) {
    grandTotals.allFiles += tier.totals.files;
    grandTotals.allBytes += tier.totals.bytes;
    if (tier.tier === 'authored') {
      grandTotals.authoredFiles += tier.totals.files;
      grandTotals.authoredBytes += tier.totals.bytes;
      grandTotals.authoredLines += tier.totals.totalLines;
    } else if (tier.tier === 'pipeline-generated') {
      grandTotals.pipelineGeneratedFiles += tier.totals.files;
      grandTotals.pipelineGeneratedBytes += tier.totals.bytes;
    } else {
      grandTotals.toolGeneratedFiles += tier.totals.files;
      grandTotals.toolGeneratedBytes += tier.totals.bytes;
    }
  }

  return {
    projectPath: rootDir,
    projectName: path.basename(rootDir),
    scannedAt: new Date().toISOString(),
    tiers,
    git,
    proxies,
    grandTotals,
    warnings,
    // TODO(0.2): replace placeholder with aggregateAssetBytes(categorized)
    assetBytesByKind: { images: 0, audio: 0, video: 0, fonts: 0, 'misc-media': 0 },
    // TODO(0.3): replace placeholder with flat-mapped top-5 subcategories
    topSubcategories: [],
    // TODO(0.5b): replace placeholder with collectSessionTokens(...) result
    tokens: null,
    // TODO(0.5c): replace placeholders with static test-case + plan breadth counts
    testCases: 0,
    testLines: 0,
    planCount: 0,
    planLines: 0,
    // TODO(0.6): replace placeholder with validated editorial block
    editorial: null,
  };
}
