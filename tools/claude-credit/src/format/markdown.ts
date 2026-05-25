import type { MultiProjectReport, ProjectReport, TierReport } from '../taxonomy.js';
import { DASH, fmtBytes, fmtDateOrDash, fmtNum, fmtNumOrDash } from './util.js';

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
  if (report.editorial?.oneLiner) {
    out.push(`> ${report.editorial.oneLiner}`);
    out.push('');
  }
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

  // 0.1 / 0.5 — Tempo
  out.push('## Tempo');
  out.push('');
  out.push('| Metric | Value |');
  out.push('|---|---:|');
  out.push(`| First commit | ${fmtDateOrDash(report.git.firstCommitISO)} |`);
  out.push(`| Last commit | ${fmtDateOrDash(report.git.lastCommitISO)} |`);
  out.push(`| Project age (days) | ${fmtNumOrDash(report.git.projectAgeDays)} |`);
  out.push(`| Active days | ${fmtNum(report.git.timeline.activeDays)} |`);
  const peak = report.git.timeline.peakDay;
  out.push(`| Peak day | ${peak ? `${peak.date} (${fmtNum(peak.count)} commits)` : DASH} |`);
  const largest = report.git.timeline.largestSingleCommit;
  out.push(
    `| Largest single commit | ${largest ? `+${fmtNum(largest.linesAdded)} / −${fmtNum(largest.linesRemoved)} on ${fmtDateOrDash(largest.dateISO)}` : DASH} |`,
  );
  out.push('');

  // 0.4 — Authored by (Co-Authored-By aware)
  if (report.git.linesByAuthor.length > 0) {
    out.push('## Authored by');
    out.push('');
    out.push('| Author | Commits | Co-authored | Lines + | Lines − |');
    out.push('|---|---:|---:|---:|---:|');
    for (const a of report.git.linesByAuthor.slice(0, 5)) {
      out.push(
        `| ${a.author} | ${fmtNum(a.commits)} | ${fmtNum(a.coAuthoredCommits)} | ${fmtNum(a.linesAdded)} | ${fmtNum(a.linesRemoved)} |`,
      );
    }
    out.push('');
  }

  // 0.5b — Tokens (omitted entirely when null — null discipline)
  if (report.tokens) {
    const t = report.tokens;
    out.push('## Tokens');
    out.push('');
    out.push(
      `- **${fmtNum(t.tokensProcessed)}** tokens processed · **${fmtNum(t.tokensFresh)}** fresh · ${fmtNum(t.sessionCount)} assistant messages`,
    );
    out.push(
      `- Window: ${fmtDateOrDash(t.windowStartISO)} → ${fmtDateOrDash(t.windowEndISO)} (${fmtNumOrDash(t.windowDays)} days of session retention — JSONLs older than ~30 days are pruned by Claude Code)`,
    );
    if (t.sidechainTokens > 0) {
      out.push(`- ${fmtNum(t.sidechainTokens)} from subagent (sidechain) invocations`);
    }
    if (t.byModel.length > 0) {
      out.push('');
      out.push('| Model | Sessions | Tokens processed |');
      out.push('|---|---:|---:|');
      for (const m of t.byModel.slice(0, 3)) {
        out.push(`| ${m.model} | ${fmtNum(m.sessions)} | ${fmtNum(m.tokensProcessed)} |`);
      }
    }
    out.push('');
  }

  // 0.5c — Breadth
  out.push('## Breadth');
  out.push('');
  out.push(
    `- ${fmtNum(report.testCases)} test cases (static scan, not run) · ${fmtNum(report.testLines)} test lines`,
  );
  out.push(`- ${fmtNum(report.planCount)} plan docs · ${fmtNum(report.planLines)} plan lines`);
  out.push('');

  // 0.2 — Assets (bytes on disk)
  out.push('## Assets (bytes on disk)');
  out.push('');
  out.push('| Kind | Bytes |');
  out.push('|---|---:|');
  for (const [kind, bytes] of Object.entries(report.assetBytesByKind)) {
    out.push(`| ${kind} | ${fmtBytes(bytes)} |`);
  }
  out.push('');

  // 0.3 — Top subcategories (by bytes)
  if (report.topSubcategories.length > 0) {
    out.push('## Top subcategories (by bytes)');
    out.push('');
    out.push('| Tier | Category | Subcategory | Files | Lines | Bytes |');
    out.push('|---|---|---|---:|---:|---:|');
    for (const s of report.topSubcategories) {
      out.push(
        `| ${s.tier} | ${s.category} | ${s.subcategory} | ${fmtNum(s.files)} | ${s.lines > 0 ? fmtNum(s.lines) : DASH} | ${fmtBytes(s.bytes)} |`,
      );
    }
    out.push('');
  }

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
  out.push(
    `- **${fmtNum(c.totalTokensProcessed)}** tokens processed · **${fmtNum(c.totalTokensFresh)}** fresh · ${fmtNum(c.totalSessions)} assistant messages across ${fmtNumOrDash(c.tokenWindowDays)} days of session retention`,
  );
  out.push(`- ${fmtNum(c.totalTestCases)} test cases · ${fmtNum(c.totalPlanCount)} plan docs`);
  if (report.meta.length > 0) {
    out.push(
      `- _grand totals include ${fmtNum(report.meta.length)} meta source(s) (tool + site) + the archive, not listed as project rows_`,
    );
  }
  out.push('');

  if (c.modelBreakdown.length > 0) {
    out.push('## By model');
    out.push('');
    out.push('| Model | Sessions | Tokens processed |');
    out.push('|---|---:|---:|');
    for (const m of c.modelBreakdown) {
      out.push(`| ${m.model} | ${fmtNum(m.sessions)} | ${fmtNum(m.tokensProcessed)} |`);
    }
    out.push('');
  }

  out.push('## Per-project');
  out.push('');
  out.push('| Project | Files | Authored lines | Tokens | Bytes | Discarded assets | Commits |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const p of report.projects) {
    const g = p.grandTotals;
    out.push(
      `| ${p.projectName} | ${fmtNum(g.allFiles)} | ${fmtNum(g.authoredLines)} | ${fmtNumOrDash(p.tokens?.tokensProcessed ?? null)} | ${fmtBytes(g.allBytes)} | ${fmtNum(p.git.discardedAssetFiles)} | ${fmtNum(p.git.totalCommits)} |`,
    );
  }
  out.push('');

  if (report.archiveCollective) {
    const a = report.archiveCollective;
    out.push('## Archive collective (the misses)');
    out.push('');
    out.push(`- ${fmtNum(a.projectCount)} shelved projects: ${a.projectNames.join(', ')}`);
    out.push(
      `- **${fmtNum(a.totalAuthoredLines)}** authored lines · ${fmtBytes(a.totalAllBytes)} · ${fmtNum(a.totalCommits)} commits · ${fmtNum(a.totalTokensProcessed)} tokens`,
    );
    out.push('');
  }
  return out.join('\n');
}
