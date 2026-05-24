import kleur from 'kleur';
import type { MultiProjectReport, ProjectReport, TierReport } from '../taxonomy.js';
import { fmtBytes, fmtNum, padLeft, padRight } from './util.js';

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
  out.push(kleur.bold().underline(`claude-credit  ·  ${report.projectName}`));
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
  out.push(kleur.bold().underline(`claude-credit  ·  ALL PROJECTS  ·  ${report.projects.length} scanned`));
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
  out.push(kleur.bold('  PER-PROJECT'));
  out.push(kleur.gray(`  ${'─'.repeat(64)}`));
  out.push(`    ${padRight('project', 28)} ${padLeft('files', 8)}  ${padLeft('lines', 12)}  ${padLeft('bytes', 10)}  ${padLeft('discards', 10)}`);
  for (const p of report.projects) {
    const g = p.grandTotals;
    out.push(
      `    ${padRight(p.projectName, 28)} ${kleur.yellow(padLeft(fmtNum(g.allFiles), 8))}  ${kleur.green(padLeft(fmtNum(g.authoredLines), 12))}  ${kleur.gray(padLeft(fmtBytes(g.allBytes), 10))}  ${kleur.magenta(padLeft(fmtNum(p.git.discardedAssetFiles), 10))}`,
    );
  }
  out.push('');
  return out.join('\n');
}
