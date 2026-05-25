import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';
import { loadMultiProjectConfig } from './config.js';
import { buildProjectReport } from './report.js';
import { classifySlugs, projectPathToSessionSlug } from './session-tokens.js';
import type { ArchiveCollective, MultiProjectReport, ProjectReport } from './taxonomy.js';

export interface BuildMultiOptions {
  homeDir?: string;
  /** If provided, use this list instead of reading the config's `projects:`. */
  projectPaths?: string[];
  /** Meta-project paths (tool + site). Totals-only; editorial forced null. Test/override seam. */
  metaPaths?: string[];
  /** Archive paths ("the misses"). Rolled into archiveCollective. Test/override seam. */
  archivePaths?: string[];
  includeIgnored?: boolean;
}

function expandHome(p: string, homeDir: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.join(homeDir, p.slice(1));
  }
  return p;
}

async function autoDiscoverProjects(homeDir: string): Promise<string[]> {
  // Look for ~/ai-learning-journey/projects/* first (Briggsy's layout).
  const candidates = [path.join(homeDir, 'ai-learning-journey', 'projects')];
  const projects: string[] = [];
  for (const dir of candidates) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'archive' || entry.name.startsWith('.')) continue;
        projects.push(path.join(dir, entry.name));
      }
    } catch {
      /* dir doesn't exist; skip */
    }
  }
  return projects;
}

export async function ensureMultiProjectConfig(homeDir: string): Promise<{
  configPath: string;
  created: boolean;
}> {
  const { configPath: existing } = await loadMultiProjectConfig(homeDir);
  if (existing) return { configPath: existing, created: false };

  const projects = await autoDiscoverProjects(homeDir);
  const configPath = path.join(homeDir, '.claude-credit-projects.yaml');
  const yamlContent = yaml.dump({
    projects: projects.map((p) => ({ path: p })),
  });
  const header = [
    '# claude-credit project list',
    '# Add or remove projects to control what `claude-credit --all` scans.',
    '# Tilde (~) expands to your home directory. Absolute paths also supported.',
    '',
  ].join('\n');
  await fs.writeFile(configPath, header + yamlContent, 'utf8');
  return { configPath, created: true };
}

export async function buildMultiProjectReport(opts: BuildMultiOptions = {}): Promise<{
  report: MultiProjectReport;
  configPath: string | null;
  configCreated: boolean;
  /** On-disk session slugs matching no configured project (path-bearing — never published). */
  orphanSlugs: string[];
}> {
  const homeDir = opts.homeDir ?? os.homedir();
  let projectPaths: string[];
  let metaPaths: string[];
  let archivePaths: string[];
  let configPath: string | null = null;
  let configCreated = false;

  if (opts.projectPaths) {
    projectPaths = opts.projectPaths;
    metaPaths = opts.metaPaths ?? [];
    archivePaths = opts.archivePaths ?? [];
  } else {
    const ensured = await ensureMultiProjectConfig(homeDir);
    configPath = ensured.configPath;
    configCreated = ensured.created;
    const { config } = await loadMultiProjectConfig(homeDir);
    projectPaths = (config?.projects ?? []).map((p) => expandHome(p.path, homeDir));
    metaPaths = (config?.meta ?? []).map((p) => expandHome(p.path, homeDir));
    archivePaths = (config?.archive ?? []).map((p) => expandHome(p.path, homeDir));
  }

  // Full set of configured slugs for longest-prefix session-slug matching —
  // projects + meta + archive, so the tool's/site's/archived projects' own
  // session dirs are NOT misclassified as orphans.
  const configuredParentSlugs = [...projectPaths, ...metaPaths, ...archivePaths].map(
    projectPathToSessionSlug,
  );

  const buildOne = async (rootDir: string): Promise<ProjectReport | null> => {
    try {
      const stat = await fs.stat(rootDir);
      if (!stat.isDirectory()) return null;
    } catch {
      return null;
    }
    return buildProjectReport({
      rootDir,
      includeIgnored: opts.includeIgnored,
      homeDir,
      configuredParentSlugs,
    });
  };

  const projects: ProjectReport[] = [];
  for (const projectPath of projectPaths) {
    const report = await buildOne(projectPath);
    if (report) projects.push(report);
  }

  // meta[] — totals-only: scanned + summed, but editorial FORCED null (no tile).
  const meta: ProjectReport[] = [];
  for (const metaPath of metaPaths) {
    const report = await buildOne(metaPath);
    if (report) meta.push({ ...report, editorial: null });
  }

  // archive[] — rolled into ONE archiveCollective; never an individual ProjectReport.
  const archiveReports: ProjectReport[] = [];
  for (const archivePath of archivePaths) {
    const report = await buildOne(archivePath);
    if (report) archiveReports.push(report);
  }
  let archiveCollective: ArchiveCollective | null = null;
  if (archiveReports.length > 0) {
    const sum = (pick: (r: ProjectReport) => number) =>
      archiveReports.reduce((acc, r) => acc + pick(r), 0);
    archiveCollective = {
      projectNames: archiveReports.map((r) => r.projectName),
      projectCount: archiveReports.length,
      totalAuthoredFiles: sum((r) => r.grandTotals.authoredFiles),
      totalAuthoredBytes: sum((r) => r.grandTotals.authoredBytes),
      totalAuthoredLines: sum((r) => r.grandTotals.authoredLines),
      totalPipelineGeneratedFiles: sum((r) => r.grandTotals.pipelineGeneratedFiles),
      totalPipelineGeneratedBytes: sum((r) => r.grandTotals.pipelineGeneratedBytes),
      totalAllBytes: sum((r) => r.grandTotals.allBytes),
      totalCommits: sum((r) => r.git.totalCommits),
      totalTokensProcessed: sum((r) => r.tokens?.tokensProcessed ?? 0),
      totalTokensFresh: sum((r) => r.tokens?.tokensFresh ?? 0),
      totalSessions: sum((r) => r.tokens?.sessionCount ?? 0),
      totalTestCases: sum((r) => r.testCases),
      totalTestLines: sum((r) => r.testLines),
      totalPlanCount: sum((r) => r.planCount),
      totalPlanLines: sum((r) => r.planLines),
    };
  }

  const combined: MultiProjectReport['combined'] = {
    projectCount: projects.length,
    totalAuthoredFiles: 0,
    totalAuthoredBytes: 0,
    totalAuthoredLines: 0,
    totalPipelineGeneratedFiles: 0,
    totalPipelineGeneratedBytes: 0,
    totalToolGeneratedFiles: 0,
    totalToolGeneratedBytes: 0,
    totalCommits: 0,
    totalDiscardedAssets: 0,
    totalIterationProxies: 0,
    totalAllFiles: 0,
    totalAllBytes: 0,
    // TODO(0.5b): aggregated by the loop below once tokens land
    totalTokensProcessed: 0,
    totalTokensFresh: 0,
    totalSessions: 0,
    tokenWindowStartISO: null,
    tokenWindowEndISO: null,
    tokenWindowDays: null,
    modelBreakdown: [],
    // TODO(0.5c): aggregated by the loop below once test/plan counts land
    totalTestCases: 0,
    totalTestLines: 0,
    totalPlanCount: 0,
    totalPlanLines: 0,
  };
  // Invariant A (sum-class): combined.totalX = Σ(projects) + Σ(meta) + archiveCollective.
  // meta counts toward magnitude ("count everything"); projectCount stays projects-only.
  for (const p of [...projects, ...meta]) {
    combined.totalAuthoredFiles += p.grandTotals.authoredFiles;
    combined.totalAuthoredBytes += p.grandTotals.authoredBytes;
    combined.totalAuthoredLines += p.grandTotals.authoredLines;
    combined.totalPipelineGeneratedFiles += p.grandTotals.pipelineGeneratedFiles;
    combined.totalPipelineGeneratedBytes += p.grandTotals.pipelineGeneratedBytes;
    combined.totalToolGeneratedFiles += p.grandTotals.toolGeneratedFiles;
    combined.totalToolGeneratedBytes += p.grandTotals.toolGeneratedBytes;
    combined.totalCommits += p.git.totalCommits;
    combined.totalDiscardedAssets += p.git.discardedAssetFiles;
    combined.totalIterationProxies += p.proxies.iterationProxyTotal;
    combined.totalAllFiles += p.grandTotals.allFiles;
    combined.totalAllBytes += p.grandTotals.allBytes;
    combined.totalTestCases += p.testCases;
    combined.totalTestLines += p.testLines;
    combined.totalPlanCount += p.planCount;
    combined.totalPlanLines += p.planLines;
  }
  // archiveCollective contributes the sum-class fields it carries (no tool-generated,
  // no allFiles, no discarded/iteration — those aren't rolled up for the misses coda).
  if (archiveCollective) {
    combined.totalAuthoredFiles += archiveCollective.totalAuthoredFiles;
    combined.totalAuthoredBytes += archiveCollective.totalAuthoredBytes;
    combined.totalAuthoredLines += archiveCollective.totalAuthoredLines;
    combined.totalPipelineGeneratedFiles += archiveCollective.totalPipelineGeneratedFiles;
    combined.totalPipelineGeneratedBytes += archiveCollective.totalPipelineGeneratedBytes;
    combined.totalAllBytes += archiveCollective.totalAllBytes;
    combined.totalCommits += archiveCollective.totalCommits;
    combined.totalTestCases += archiveCollective.totalTestCases;
    combined.totalTestLines += archiveCollective.totalTestLines;
    combined.totalPlanCount += archiveCollective.totalPlanCount;
    combined.totalPlanLines += archiveCollective.totalPlanLines;
  }

  // 0.5b — token aggregation over projects[] + meta[] (null-skip). Invariants B + C.
  // Window bounds compare real timestamps (Date.parse), not lexical ISO, but store
  // the ISO string. 0.6b adds the archiveCollective term to these totals.
  let tokenWindowStartMs: number | null = null;
  let tokenWindowEndMs: number | null = null;
  const modelAcc = new Map<string, { sessions: number; tokensProcessed: number }>();
  for (const e of [...projects, ...meta]) {
    const t = e.tokens;
    if (!t) continue;
    combined.totalTokensProcessed += t.tokensProcessed;
    combined.totalTokensFresh += t.tokensFresh;
    combined.totalSessions += t.sessionCount;
    if (t.windowStartISO) {
      const ms = Date.parse(t.windowStartISO);
      if (Number.isFinite(ms) && (tokenWindowStartMs === null || ms < tokenWindowStartMs)) {
        tokenWindowStartMs = ms;
        combined.tokenWindowStartISO = t.windowStartISO;
      }
    }
    if (t.windowEndISO) {
      const ms = Date.parse(t.windowEndISO);
      if (Number.isFinite(ms) && (tokenWindowEndMs === null || ms > tokenWindowEndMs)) {
        tokenWindowEndMs = ms;
        combined.tokenWindowEndISO = t.windowEndISO;
      }
    }
    for (const m of t.byModel) {
      const acc = modelAcc.get(m.model) ?? { sessions: 0, tokensProcessed: 0 };
      acc.sessions += m.sessions;
      acc.tokensProcessed += m.tokensProcessed;
      modelAcc.set(m.model, acc);
    }
  }
  combined.tokenWindowDays =
    tokenWindowStartMs !== null && tokenWindowEndMs !== null
      ? Math.floor((tokenWindowEndMs - tokenWindowStartMs) / 86_400_000)
      : null;
  combined.modelBreakdown = Array.from(modelAcc.entries())
    .map(([model, v]) => ({ model, sessions: v.sessions, tokensProcessed: v.tokensProcessed }))
    .sort((a, b) => b.tokensProcessed - a.tokensProcessed);
  // archiveCollective adds its token totals (it has no per-model or window data,
  // so it does not affect modelBreakdown or the retention window — per Invariant C).
  if (archiveCollective) {
    combined.totalTokensProcessed += archiveCollective.totalTokensProcessed;
    combined.totalTokensFresh += archiveCollective.totalTokensFresh;
    combined.totalSessions += archiveCollective.totalSessions;
  }

  // Orphan session slugs: on-disk dirs matching no configured project.
  // NEVER published (path-bearing PII) — surfaced only as an aggregated warning.
  let orphanSlugs: string[] = [];
  try {
    const projectsDir = path.join(homeDir, '.claude', 'projects');
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    const onDisk = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    orphanSlugs = classifySlugs(configuredParentSlugs, onDisk).orphans;
  } catch {
    /* no ~/.claude/projects */
  }

  return {
    report: {
      projects,
      meta,
      archiveCollective,
      combined,
      scannedAt: new Date().toISOString(),
    },
    configPath,
    configCreated,
    orphanSlugs,
  };
}
