import path from 'node:path';
import { compileRules, DEFAULT_RULES, classify } from './classifier.js';
import { loadProjectConfig } from './config.js';
import { aggregateAssetBytes, categorize, aggregateTiers, countTestCases } from './counter.js';
import { collectGitStats } from './git-stats.js';
import { collectProxyStats } from './proxies.js';
import { collectSessionTokens } from './session-tokens.js';
import type { CategorizedFile, GrandTotals, ProjectReport } from './taxonomy.js';
import { walkProject } from './walker.js';

export interface BuildReportOptions {
  rootDir: string;
  includeIgnored?: boolean;
  /** Home dir override for session-token slug resolution (testability seam). */
  homeDir?: string;
  /**
   * Full set of configured project slugs (projects + meta + archive), so the
   * session-token slug matcher can disambiguate subdir siblings via
   * longest-prefix-match. Omitted for single-project scans (self-only).
   */
  configuredParentSlugs?: string[];
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
  const [git, proxies, tokenResult] = await Promise.all([
    collectGitStats(rootDir),
    collectProxyStats(rootDir, {
      iterationDirNames: config.proxies?.iterationDirNames,
      regenScriptGlobs: config.proxies?.regenScriptGlobs,
    }),
    collectSessionTokens(rootDir, {
      homeDir: opts.homeDir,
      configuredParentSlugs: opts.configuredParentSlugs,
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

  const assetBytesByKind = aggregateAssetBytes(categorized);

  // 0.3 — top 5 subcategories by bytes, flattened across all tiers/categories.
  const topSubcategories = tiers
    .flatMap((t) =>
      t.categories.flatMap((c) =>
        c.subcategories.map((s) => ({
          tier: t.tier,
          category: c.category,
          subcategory: s.subcategory,
          bytes: s.bytes,
          files: s.files,
          lines: s.totalLines,
        })),
      ),
    )
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5);

  // 0.5c — breadth counts. testCases is a static definition scan (no execution);
  // testLines/planCount/planLines are already-computed sums over the classified files.
  const testCases = await countTestCases(categorized);
  let testLines = 0;
  let planCount = 0;
  let planLines = 0;
  for (const f of categorized) {
    if (f.tier === 'authored' && f.category === 'code' && f.subcategory === 'tests') {
      testLines += f.totalLines ?? 0;
    } else if (f.tier === 'authored' && f.category === 'docs' && f.subcategory === 'plans') {
      planCount += 1;
      planLines += f.totalLines ?? 0;
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
    assetBytesByKind,
    topSubcategories,
    tokens: tokenResult.stats,
    testCases,
    testLines,
    planCount,
    planLines,
    // TODO(0.6): replace placeholder with validated editorial block
    editorial: null,
  };
}
