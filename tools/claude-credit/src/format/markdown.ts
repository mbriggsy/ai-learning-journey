import type { MultiProjectReport, ProjectReport, TierReport } from '../taxonomy.js';
import { fmtBytes, fmtNum } from './util.js';

const TIER_LABEL: Record<string, string> = {
  authored: 'Authored',
  'pipeline-generated': 'Pipeline-Generated',
  'tool-generated': 'Tool-Generated (not credited)',
};

function tierTable(tier: TierReport): string {
  const lines: string[] = [];
  lines.push(`### ${TIER_LABEL[tier.tier] ?? tier.tier}`);
  lines.push('');
  if (tier.categories.length === 0) {
    lines.push('_(none)_');
    return lines.join('\n');
  }
  lines.push('| Category | Subcategory | Files | Lines | Bytes |');
  lines.push('|---|---|---:|---:|---:|');
  for (const cat of tier.categories) {
    for (const sub of cat.subcategories) {
      lines.push(
        `| ${cat.category} | ${sub.subcategory} | ${fmtNum(sub.files)} | ${sub.totalLines > 0 ? fmtNum(sub.totalLines) : '—'} | ${fmtBytes(sub.bytes)} |`,
      );
    }
  }
  lines.push(
    `| **TIER TOTAL** | | **${fmtNum(tier.totals.files)}** | **${tier.totals.totalLines > 0 ? fmtNum(tier.totals.totalLines) : '—'}** | **${fmtBytes(tier.totals.bytes)}** |`,
  );
  return lines.join('\n');
}

export function renderProjectMarkdown(report: ProjectReport): string {
  const out: string[] = [];
  const g = report.grandTotals;

  out.push(`# claude-credit · ${report.projectName}`);
  out.push('');
  out.push(`_Scanned ${report.scannedAt}_`);
  out.push('');
  out.push('## Headline');
  out.push('');
  out.push(`- **${fmtNum(g.authoredFiles)}** authored files — **${fmtNum(g.authoredLines)} lines** of authored content (${fmtBytes(g.authoredBytes)})`);
  out.push(`- **${fmtNum(g.pipelineGeneratedFiles)}** pipeline-generated files (${fmtBytes(g.pipelineGeneratedBytes)})`);
  out.push(`- ${fmtNum(g.toolGeneratedFiles)} tool-generated files (excluded from credit)`);
  out.push(`- **Grand total: ${fmtNum(g.allFiles)} files · ${fmtBytes(g.allBytes)}**`);
  out.push('');

  out.push('## Breakdown by tier');
  out.push('');
  for (const tier of report.tiers) {
    out.push(tierTable(tier));
    out.push('');
  }

  out.push('## Git');
  out.push('');
  if (!report.git.isGitRepo) {
    out.push('_Not a git repository._');
  } else {
    out.push('| Metric | Value |');
    out.push('|---|---:|');
    out.push(`| Commits | ${fmtNum(report.git.totalCommits)} |`);
    out.push(`| Commit-message lines (authored prose) | ${fmtNum(report.git.commitMessageLines)} |`);
    out.push(`| Lifetime lines added | ${fmtNum(report.git.lifetimeLinesAdded)} |`);
    out.push(`| Lifetime lines removed | ${fmtNum(report.git.lifetimeLinesRemoved)} |`);
    out.push(`| Unique files touched | ${fmtNum(report.git.uniqueFilesTouched)} |`);
    out.push(`| **Asset modification events** (every commit touching an asset) | **${fmtNum(report.git.assetModificationEvents)}** |`);
    out.push(`| Unique asset paths ever touched | ${fmtNum(report.git.assetUniquePathsTouched)} |`);
    out.push(`| Asset files deleted entirely | ${fmtNum(report.git.discardedAssetFiles)} |`);
    out.push(`| Asset deletion events | ${fmtNum(report.git.discardedAssetEvents)} |`);
    if (Object.keys(report.git.discardedAssetByKind).length > 0) {
      out.push('');
      out.push('Discarded assets by kind:');
      for (const [kind, n] of Object.entries(report.git.discardedAssetByKind).sort((a, b) => b[1] - a[1])) {
        out.push(`- ${kind}: ${fmtNum(n)}`);
      }
    }
  }
  out.push('');

  out.push('## Iteration proxies');
  out.push('');
  out.push('| Signal | Count |');
  out.push('|---|---:|');
  out.push(`| sample-eval runs (iteration receipts on disk) | ${fmtNum(report.proxies.sampleEvalRunCount)} |`);
  out.push(`| regen-* scripts | ${fmtNum(report.proxies.regenScriptCount)} |`);
  out.push(`| **Iteration proxy total** | **${fmtNum(report.proxies.iterationProxyTotal)}** |`);
  out.push('');

  if (report.warnings.length > 0) {
    out.push('## Notes');
    out.push('');
    for (const w of report.warnings) out.push(`- ${w}`);
    out.push('');
  }

  return out.join('\n');
}

export function renderMultiProjectMarkdown(report: MultiProjectReport): string {
  const out: string[] = [];
  const c = report.combined;
  out.push(`# claude-credit · all projects (${c.projectCount})`);
  out.push('');
  out.push(`_Scanned ${report.scannedAt}_`);
  out.push('');
  out.push('## Grand totals across all projects');
  out.push('');
  out.push(`- **${fmtNum(c.totalAuthoredFiles)}** authored files — **${fmtNum(c.totalAuthoredLines)} lines** (${fmtBytes(c.totalAuthoredBytes)})`);
  out.push(`- **${fmtNum(c.totalPipelineGeneratedFiles)}** pipeline-generated files (${fmtBytes(c.totalPipelineGeneratedBytes)})`);
  out.push(`- ${fmtNum(c.totalToolGeneratedFiles)} tool-generated files (excluded)`);
  out.push(`- **Total: ${fmtNum(c.totalAllFiles)} files · ${fmtBytes(c.totalAllBytes)}**`);
  out.push(`- ${fmtNum(c.totalCommits)} commits · **${fmtNum(c.totalDiscardedAssets)}** discarded asset files · ${fmtNum(c.totalIterationProxies)} iteration proxies`);
  out.push('');

  out.push('## Per-project');
  out.push('');
  out.push('| Project | Files | Authored lines | Bytes | Discarded assets | Commits |');
  out.push('|---|---:|---:|---:|---:|---:|');
  for (const p of report.projects) {
    const g = p.grandTotals;
    out.push(
      `| ${p.projectName} | ${fmtNum(g.allFiles)} | ${fmtNum(g.authoredLines)} | ${fmtBytes(g.allBytes)} | ${fmtNum(p.git.discardedAssetFiles)} | ${fmtNum(p.git.totalCommits)} |`,
    );
  }
  out.push('');
  return out.join('\n');
}
