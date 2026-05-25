import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';
import { loadMultiProjectConfig } from './config.js';
import { buildProjectReport } from './report.js';
import type { MultiProjectReport, ProjectReport } from './taxonomy.js';

export interface BuildMultiOptions {
  homeDir?: string;
  /** If provided, use this list instead of reading the config. */
  projectPaths?: string[];
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
}> {
  const homeDir = opts.homeDir ?? os.homedir();
  let projectPaths: string[];
  let configPath: string | null = null;
  let configCreated = false;

  if (opts.projectPaths) {
    projectPaths = opts.projectPaths;
  } else {
    const ensured = await ensureMultiProjectConfig(homeDir);
    configPath = ensured.configPath;
    configCreated = ensured.created;
    const { config } = await loadMultiProjectConfig(homeDir);
    projectPaths = (config?.projects ?? []).map((p) => expandHome(p.path, homeDir));
  }

  const projects: ProjectReport[] = [];
  for (const projectPath of projectPaths) {
    try {
      const stat = await fs.stat(projectPath);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    const report = await buildProjectReport({
      rootDir: projectPath,
      includeIgnored: opts.includeIgnored,
    });
    projects.push(report);
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
  for (const p of projects) {
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
  }

  return {
    report: {
      projects,
      // TODO(0.6b): populate meta[] (totals-only, editorial: null) + archiveCollective rollup
      meta: [],
      archiveCollective: null,
      combined,
      scannedAt: new Date().toISOString(),
    },
    configPath,
    configCreated,
  };
}
