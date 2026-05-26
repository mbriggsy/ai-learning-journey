import kleur from 'kleur';
import type { MultiProjectReport, ProjectReport, TierReport } from '../taxonomy.js';
import { DASH, fmtBytes, fmtDateOrDash, fmtNum, fmtNumOrDash, padLeft, padRight } from './util.js';

const TIER_COLOR: Record<string, (s: string) => string> = {
  authored: (s) => kleur.cyan().bold(s),
  'pipeline-generated': (s) => kleur.magenta().bold(s),
  'tool-generated': (s) => kleur.gray(s),
};

const TIER_LABEL: Record<string, string> = {
  authored: 'AUTHORED',
  'pipeline-generated': 'PIPELINE-GENERATED',
  'tool-generated': 'TOOL-GENERATED (not credited)',
};

function renderTierBlock(tier: TierReport): string {
  const lines: string[] = [];
  const color = TIER_COLOR[tier.tier] ?? ((s: string) => s);
  const label = TIER_LABEL[tier.tier] ?? tier.tier.toUpperCase();
  lines.push('');
  lines.push(color(`  ${label}`));
  lines.push(kleur.gray(`  ${'─'.repeat(64)}`));

  if (tier.categories.length === 0) {
    lines.push(kleur.gray('    (none)'));
    return lines.join('\n');
  }

  for (const cat of tier.categories) {
    lines.push('');
    lines.push(kleur.white().bold(`    ${cat.category}`));
    for (const sub of cat.subcategories) {
      const fileCol = padLeft(fmtNum(sub.files), 7);
      const lineCol = padLeft(sub.totalLines > 0 ? fmtNum(sub.totalLines) : '—', 11);
      const byteCol = padLeft(fmtBytes(sub.bytes), 10);
      lines.push(
        `      ${padRight(sub.subcategory, 22)} ${kleur.yellow(fileCol)} files  ${kleur.green(lineCol)} lines  ${kleur.gray(byteCol)}`,
      );
    }
    const tFiles = padLeft(fmtNum(cat.totals.files), 7);
    const tLines = padLeft(cat.totals.totalLines > 0 ? fmtNum(cat.totals.totalLines) : '—', 11);
    const tBytes = padLeft(fmtBytes(cat.totals.bytes), 10);
    lines.push(
      kleur.gray(`      ${padRight(`subtotal`, 22)} ${tFiles} files  ${tLines} lines  ${tBytes}`),
    );
  }

  lines.push('');
  const ttFiles = padLeft(fmtNum(tier.totals.files), 7);
  const ttLines = padLeft(tier.totals.totalLines > 0 ? fmtNum(tier.totals.totalLines) : '—', 11);
  const ttBytes = padLeft(fmtBytes(tier.totals.bytes), 10);
  lines.push(color(`    TIER TOTAL              ${ttFiles} files  ${ttLines} lines  ${ttBytes}`));
  return lines.join('\n');
}

export function renderProjectTerminal(report: ProjectReport): string {
  const out: string[] = [];
  out.push('');
  out.push(kleur.bold().underline(`project-metrics  ·  ${report.projectName}`));
  if (report.editorial?.oneLiner) out.push(kleur.italic(`  "${report.editorial.oneLiner}"`));
  out.push(kleur.gray(report.projectPath));
  out.push(kleur.gray(`scanned ${report.scannedAt}`));

  // Headline
  const g = report.grandTotals;
  out.push('');
  out.push(kleur.bold('  HEADLINE'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  out.push(`    ${kleur.cyan().bold(fmtNum(g.authoredFiles))} authored files  ·  ${kleur.cyan().bold(fmtNum(g.authoredLines))} lines of authored content  ·  ${kleur.cyan(fmtBytes(g.authoredBytes))}`);
  out.push(`    ${kleur.magenta().bold(fmtNum(g.pipelineGeneratedFiles))} pipeline-generated files  ·  ${kleur.magenta(fmtBytes(g.pipelineGeneratedBytes))}`);
  out.push(`    ${kleur.gray(fmtNum(g.toolGeneratedFiles) + ' tool-generated files (excluded from credit)')}`);
  out.push('');
  out.push(`    ${kleur.bold().yellow('GRAND TOTAL')}  ${kleur.bold(fmtNum(g.allFiles))} files  ·  ${kleur.bold(fmtBytes(g.allBytes))}`);

  for (const tier of report.tiers) {
    out.push(renderTierBlock(tier));
  }

  // Git
  out.push('');
  out.push(kleur.bold('  GIT'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  if (!report.git.isGitRepo) {
    out.push(kleur.gray('    not a git repo'));
  } else {
    out.push(`    ${padRight('commits', 28)} ${kleur.yellow(padLeft(fmtNum(report.git.totalCommits), 10))}`);
    out.push(`    ${padRight('commit-message lines', 28)} ${kleur.yellow(padLeft(fmtNum(report.git.commitMessageLines), 10))}`);
    out.push(`    ${padRight('lifetime lines added', 28)} ${kleur.green(padLeft(fmtNum(report.git.lifetimeLinesAdded), 10))}`);
    out.push(`    ${padRight('lifetime lines removed', 28)} ${kleur.red(padLeft(fmtNum(report.git.lifetimeLinesRemoved), 10))}`);
    out.push(`    ${padRight('unique files touched', 28)} ${kleur.yellow(padLeft(fmtNum(report.git.uniqueFilesTouched), 10))}`);
    out.push(`    ${padRight('asset modification events', 28)} ${kleur.magenta().bold(padLeft(fmtNum(report.git.assetModificationEvents), 10))}`);
    out.push(`    ${padRight('  · unique asset paths', 28)} ${kleur.magenta(padLeft(fmtNum(report.git.assetUniquePathsTouched), 10))}`);
    out.push(`    ${padRight('  · files deleted entirely', 28)} ${kleur.magenta(padLeft(fmtNum(report.git.discardedAssetFiles), 10))}`);
    out.push(`    ${padRight('  · deletion events', 28)} ${kleur.magenta(padLeft(fmtNum(report.git.discardedAssetEvents), 10))}`);
    if (Object.keys(report.git.discardedAssetByKind).length > 0) {
      for (const [kind, n] of Object.entries(report.git.discardedAssetByKind).sort((a, b) => b[1] - a[1])) {
        out.push(`      ${padRight(`  · ${kind}`, 26)} ${kleur.gray(padLeft(fmtNum(n), 10))}`);
      }
    }
    if (report.git.commitsByAuthor.length > 0) {
      out.push('');
      out.push(kleur.gray('    commits by author:'));
      for (const a of report.git.commitsByAuthor.slice(0, 10)) {
        out.push(`      ${padRight(a.author, 30)} ${kleur.yellow(padLeft(fmtNum(a.count), 6))}`);
      }
    }
  }

  // 0.1 / 0.5 — Tempo
  out.push('');
  out.push(kleur.bold('  TEMPO'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  out.push(`    ${padRight('first commit', 28)} ${kleur.gray(padLeft(fmtDateOrDash(report.git.firstCommitISO), 12))}`);
  out.push(`    ${padRight('last commit', 28)} ${kleur.gray(padLeft(fmtDateOrDash(report.git.lastCommitISO), 12))}`);
  out.push(`    ${padRight('project age (days)', 28)} ${kleur.yellow(padLeft(fmtNumOrDash(report.git.projectAgeDays), 12))}`);
  out.push(`    ${padRight('active days', 28)} ${kleur.yellow(padLeft(fmtNum(report.git.timeline.activeDays), 12))}`);
  const tlPeak = report.git.timeline.peakDay;
  out.push(`    ${padRight('peak day', 28)} ${kleur.gray(tlPeak ? `${tlPeak.date} (${fmtNum(tlPeak.count)})` : DASH)}`);
  const tlLargest = report.git.timeline.largestSingleCommit;
  out.push(
    `    ${padRight('largest commit', 28)} ${kleur.gray(tlLargest ? `+${fmtNum(tlLargest.linesAdded)} / −${fmtNum(tlLargest.linesRemoved)} on ${fmtDateOrDash(tlLargest.dateISO)}` : DASH)}`,
  );

  // 0.4 — Authored by (Co-Authored-By aware)
  if (report.git.linesByAuthor.length > 0) {
    out.push('');
    out.push(kleur.bold('  AUTHORED BY'));
    out.push(kleur.gray(`  ${'─'.repeat(64)}`));
    for (const a of report.git.linesByAuthor.slice(0, 5)) {
      out.push(
        `    ${padRight(a.author, 30)} ${kleur.yellow(padLeft(fmtNum(a.commits), 5))} commits ${kleur.gray(padLeft(fmtNum(a.coAuthoredCommits), 5))} co ${kleur.green(padLeft('+' + fmtNum(a.linesAdded), 10))} ${kleur.red(padLeft('−' + fmtNum(a.linesRemoved), 9))}`,
      );
    }
  }

  // 0.5b — Tokens (omitted entirely when null)
  if (report.tokens) {
    const t = report.tokens;
    out.push('');
    out.push(kleur.bold('  TOKENS'));
    out.push(kleur.gray(`  ${'─'.repeat(64)}`));
    out.push(
      `    ${kleur.cyan().bold(fmtNum(t.tokensProcessed))} processed  ·  ${kleur.cyan(fmtNum(t.tokensFresh))} fresh  ·  ${kleur.yellow(fmtNum(t.sessionCount))} assistant messages`,
    );
    out.push(
      kleur.gray(
        `    window ${fmtDateOrDash(t.windowStartISO)} → ${fmtDateOrDash(t.windowEndISO)} (${fmtNumOrDash(t.windowDays)} days of session retention — JSONLs >~30d are pruned)`,
      ),
    );
    if (t.sidechainTokens > 0) {
      out.push(kleur.gray(`    ${fmtNum(t.sidechainTokens)} from subagent (sidechain) invocations`));
    }
    for (const m of t.byModel.slice(0, 3)) {
      out.push(
        `      ${padRight(m.model, 24)} ${kleur.yellow(padLeft(fmtNum(m.sessions), 6))} sessions  ${kleur.cyan(padLeft(fmtNum(m.tokensProcessed), 14))}`,
      );
    }
  }

  // 0.5c — Breadth
  out.push('');
  out.push(kleur.bold('  BREADTH'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  out.push(`    ${padRight('test cases (static scan)', 28)} ${kleur.green(padLeft(fmtNum(report.testCases), 10))}`);
  out.push(`    ${padRight('test lines', 28)} ${kleur.green(padLeft(fmtNum(report.testLines), 10))}`);
  out.push(`    ${padRight('plan docs', 28)} ${kleur.cyan(padLeft(fmtNum(report.planCount), 10))}`);
  out.push(`    ${padRight('plan lines', 28)} ${kleur.cyan(padLeft(fmtNum(report.planLines), 10))}`);

  // 0.2 — Assets (bytes on disk)
  out.push('');
  out.push(kleur.bold('  ASSETS (bytes on disk)'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  for (const [kind, bytes] of Object.entries(report.assetBytesByKind)) {
    out.push(`    ${padRight(kind, 28)} ${kleur.magenta(padLeft(fmtBytes(bytes), 10))}`);
  }

  // 0.3 — Top subcategories (by bytes)
  if (report.topSubcategories.length > 0) {
    out.push('');
    out.push(kleur.bold('  TOP SUBCATEGORIES (by bytes)'));
    out.push(kleur.gray(`  ${'─'.repeat(64)}`));
    for (const s of report.topSubcategories) {
      out.push(
        `    ${padRight(`${s.category}/${s.subcategory}`, 30)} ${kleur.gray(padLeft(fmtBytes(s.bytes), 10))}  ${kleur.yellow(padLeft(fmtNum(s.files), 6))} files`,
      );
    }
  }

  // Proxies
  out.push('');
  out.push(kleur.bold('  ITERATION PROXIES'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  out.push(`    ${padRight('sample-eval runs', 28)} ${kleur.magenta(padLeft(fmtNum(report.proxies.sampleEvalRunCount), 10))}`);
  out.push(`    ${padRight('regen-* scripts', 28)} ${kleur.magenta(padLeft(fmtNum(report.proxies.regenScriptCount), 10))}`);
  out.push(`    ${padRight('iteration proxy total', 28)} ${kleur.magenta().bold(padLeft(fmtNum(report.proxies.iterationProxyTotal), 10))}`);

  if (report.warnings.length > 0) {
    out.push('');
    out.push(kleur.yellow('  NOTES'));
    for (const w of report.warnings) out.push(kleur.gray(`    · ${w}`));
  }

  out.push('');
  return out.join('\n');
}

export function renderMultiProjectTerminal(report: MultiProjectReport): string {
  const out: string[] = [];
  out.push('');
  out.push(kleur.bold().underline(`project-metrics  ·  ALL PROJECTS  ·  ${report.projects.length} scanned`));
  out.push(kleur.gray(`scanned ${report.scannedAt}`));

  const c = report.combined;
  out.push('');
  out.push(kleur.bold('  GRAND TOTALS ACROSS ALL PROJECTS'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  out.push(`    ${kleur.cyan().bold(fmtNum(c.totalAuthoredFiles))} authored files  ·  ${kleur.cyan().bold(fmtNum(c.totalAuthoredLines))} lines  ·  ${kleur.cyan(fmtBytes(c.totalAuthoredBytes))}`);
  out.push(`    ${kleur.magenta().bold(fmtNum(c.totalPipelineGeneratedFiles))} pipeline-generated files  ·  ${kleur.magenta(fmtBytes(c.totalPipelineGeneratedBytes))}`);
  out.push(`    ${kleur.gray(fmtNum(c.totalToolGeneratedFiles) + ' tool-generated files (excluded)')}`);
  out.push(`    ${kleur.bold().yellow('TOTAL')}  ${kleur.bold(fmtNum(c.totalAllFiles))} files  ·  ${kleur.bold(fmtBytes(c.totalAllBytes))}`);
  out.push('');
  out.push(`    ${kleur.bold(fmtNum(c.totalCommits))} commits  ·  ${kleur.magenta().bold(fmtNum(c.totalDiscardedAssets))} discarded asset files  ·  ${kleur.magenta(fmtNum(c.totalIterationProxies))} iteration proxies`);
  out.push('');
  out.push(
    `    ${kleur.cyan().bold(fmtNum(c.totalTokensProcessed))} tokens processed  ·  ${kleur.cyan(fmtNum(c.totalTokensFresh))} fresh  ·  ${kleur.yellow(fmtNum(c.totalSessions))} assistant messages`,
  );
  out.push(
    kleur.gray(`    across ${fmtNumOrDash(c.tokenWindowDays)} days of session retention (JSONLs >~30d are pruned)`),
  );
  out.push(
    `    ${kleur.green(fmtNum(c.totalTestCases))} test cases  ·  ${kleur.cyan(fmtNum(c.totalPlanCount))} plan docs`,
  );
  if (report.meta.length > 0) {
    out.push(
      kleur.gray(`    grand totals include ${fmtNum(report.meta.length)} meta source(s) + the archive (not listed as rows)`),
    );
  }

  if (c.modelBreakdown.length > 0) {
    out.push('');
    out.push(kleur.bold('  BY MODEL'));
    out.push(kleur.gray(`  ${'─'.repeat(64)}`));
    for (const m of c.modelBreakdown) {
      out.push(
        `    ${padRight(m.model, 24)} ${kleur.yellow(padLeft(fmtNum(m.sessions), 7))} sessions  ${kleur.cyan(padLeft(fmtNum(m.tokensProcessed), 16))}`,
      );
    }
  }

  out.push('');
  out.push(kleur.bold('  PER-PROJECT'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  out.push(`    ${padRight('project', 24)} ${padLeft('files', 7)}  ${padLeft('lines', 10)}  ${padLeft('tokens', 14)}  ${padLeft('bytes', 10)}`);
  for (const p of report.projects) {
    const g = p.grandTotals;
    out.push(
      `    ${padRight(p.projectName, 24)} ${kleur.yellow(padLeft(fmtNum(g.allFiles), 7))}  ${kleur.green(padLeft(fmtNum(g.authoredLines), 10))}  ${kleur.cyan(padLeft(fmtNumOrDash(p.tokens?.tokensProcessed ?? null), 14))}  ${kleur.gray(padLeft(fmtBytes(g.allBytes), 10))}`,
    );
  }

  if (report.archiveCollective) {
    const a = report.archiveCollective;
    out.push('');
    out.push(kleur.bold('  ARCHIVE COLLECTIVE (the misses)'));
    out.push(kleur.gray(`  ${'─'.repeat(64)}`));
    out.push(kleur.gray(`    ${fmtNum(a.projectCount)} shelved: ${a.projectNames.join(', ')}`));
    out.push(
      `    ${kleur.green(fmtNum(a.totalAuthoredLines))} authored lines  ·  ${kleur.gray(fmtBytes(a.totalAllBytes))}  ·  ${kleur.bold(fmtNum(a.totalCommits))} commits  ·  ${kleur.cyan(fmtNum(a.totalTokensProcessed))} tokens`,
    );
  }
  out.push('');
  return out.join('\n');
}
