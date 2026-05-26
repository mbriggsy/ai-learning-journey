import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import type { ClassifierRule } from './classifier.js';
import type { EditorialContent } from './taxonomy.js';

export interface ProjectConfig {
  /** Additional directory basenames or relative-path globs to skip during the walk. */
  excludeAdditional?: string[];
  /**
   * Globs (forward-slash, relative to project root) to RESCUE from .gitignore.
   * Useful for creative outputs that are gitignored to keep the repo lean
   * but still count as authored/pipeline work (e.g. videos/trailer/out/**).
   */
  includeFromGitignore?: string[];
  /** Custom classification rules. Prepended to defaults (first-match-wins). */
  classificationRules?: ClassifierRule[];
  /** Proxy-counter overrides. */
  proxies?: {
    iterationDirNames?: string[];
    regenScriptGlobs?: string[];
  };
  /**
   * Locations of structured generation logs. v1 surfaces this but does not
   * read them yet — wired for v2 when the logGeneration() helper has been
   * adopted by enough projects to make parsing worthwhile.
   */
  generationLogs?: Array<{
    path: string;
    format: 'jsonl';
    /** Human label, e.g. "Imagen runs" / "TTS takes". */
    label?: string;
  }>;
  /**
   * 0.6 — per-project editorial content (site copy). Absent ⇒ report.editorial = null.
   * hookStat.value may be a literal ("120") OR a `metric:<key>` reference
   * (e.g. "metric:testCases") resolved live at scan time against the project's
   * own numbers — so countable hooks (TESTS/PLANS/FILES/LINES) never drift.
   */
  editorial?: {
    oneLiner: string;
    hookStat: { label: string; value: string };
    heroImage?: string | null;
    liveUrl?: string | null;
    repoUrl?: string | null;
    status?: 'active' | 'shelved';
    description: string;
    gallery?: string[];
    largestCommitCaption?: string;
  };
}

/**
 * 0.6 — validate + normalize a raw `editorial` config block. Pure; returns the
 * typed value (or null when required fields are missing/mistyped) plus warnings.
 * Rejects absolute heroImage paths (they would leak into the public warnings[]).
 */
export function validateEditorial(raw: unknown): {
  value: EditorialContent | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') return { value: null, warnings };
  const r = raw as Record<string, unknown>;

  if (typeof r.oneLiner !== 'string' || typeof r.description !== 'string') {
    warnings.push('editorial: requires string oneLiner + description — block ignored.');
    return { value: null, warnings };
  }
  const hs = r.hookStat as { label?: unknown; value?: unknown } | undefined;
  if (!hs || typeof hs !== 'object' || typeof hs.label !== 'string' || typeof hs.value !== 'string') {
    warnings.push('editorial: hookStat must be { label: string, value: string } — block ignored.');
    return { value: null, warnings };
  }

  let status: 'active' | 'shelved' = 'active';
  if (r.status === 'shelved') status = 'shelved';
  else if (r.status !== undefined && r.status !== 'active') {
    warnings.push(`editorial.status '${String(r.status)}' invalid — defaulting to 'active'.`);
  }

  let heroImage: string | null = null;
  if (typeof r.heroImage === 'string' && r.heroImage.length > 0) {
    if (/^[/\\~]/.test(r.heroImage) || /^[A-Za-z]:/.test(r.heroImage)) {
      warnings.push(
        `editorial.heroImage must be a project-relative path, got an absolute path — set to null.`,
      );
    } else {
      heroImage = r.heroImage;
    }
  }

  const gallery = Array.isArray(r.gallery)
    ? r.gallery.filter((g): g is string => typeof g === 'string')
    : [];

  const value: EditorialContent = {
    oneLiner: r.oneLiner,
    hookStat: { label: hs.label, value: hs.value },
    heroImage,
    liveUrl: typeof r.liveUrl === 'string' ? r.liveUrl : null,
    repoUrl: typeof r.repoUrl === 'string' ? r.repoUrl : null,
    status,
    description: r.description,
    gallery,
  };
  if (typeof r.largestCommitCaption === 'string') value.largestCommitCaption = r.largestCommitCaption;
  return { value, warnings };
}

export interface MultiProjectConfig {
  projects: Array<{
    /** Absolute or ~-relative path to the project root. */
    path: string;
    /** Optional display name (defaults to basename of path). */
    name?: string;
  }>;
  /** 0.6b — meta projects (the tool + this site). Totals-only: scanned + summed
   *  into combined, but emit NO tile/detail/asset (editorial forced null). */
  meta?: Array<{ path: string; name?: string }>;
  /** 0.6b — shelved projects ("the misses"). Rolled into ONE archiveCollective,
   *  never an individual ProjectReport. */
  archive?: Array<{ path: string; name?: string }>;
}

const CONFIG_FILE_CANDIDATES = [
  'project-metrics.config.mjs',
  'project-metrics.config.js',
  'project-metrics.config.cjs',
  'project-metrics.config.json',
  'project-metrics.config.yaml',
  'project-metrics.config.yml',
];

export async function loadProjectConfig(rootDir: string): Promise<{
  config: ProjectConfig;
  configPath: string | null;
}> {
  for (const candidate of CONFIG_FILE_CANDIDATES) {
    const abs = path.join(rootDir, candidate);
    try {
      await fs.access(abs);
    } catch {
      continue;
    }

    if (candidate.endsWith('.json')) {
      const raw = await fs.readFile(abs, 'utf8');
      return { config: JSON.parse(raw) as ProjectConfig, configPath: abs };
    }
    if (candidate.endsWith('.yaml') || candidate.endsWith('.yml')) {
      const raw = await fs.readFile(abs, 'utf8');
      return { config: (yaml.load(raw) ?? {}) as ProjectConfig, configPath: abs };
    }
    // .js / .mjs / .cjs — dynamic import.
    const fileUrl = pathToFileURL(abs).href;
    const mod = (await import(fileUrl)) as { default?: ProjectConfig } & ProjectConfig;
    const config = (mod.default ?? mod) as ProjectConfig;
    return { config, configPath: abs };
  }
  return { config: {}, configPath: null };
}

const MULTI_PROJECT_CONFIG_CANDIDATES = [
  '.project-metrics-projects.yaml',
  '.project-metrics-projects.yml',
  '.project-metrics-projects.json',
];

export async function loadMultiProjectConfig(homeDir: string): Promise<{
  config: MultiProjectConfig | null;
  configPath: string | null;
}> {
  for (const candidate of MULTI_PROJECT_CONFIG_CANDIDATES) {
    const abs = path.join(homeDir, candidate);
    try {
      await fs.access(abs);
    } catch {
      continue;
    }
    const raw = await fs.readFile(abs, 'utf8');
    if (candidate.endsWith('.json')) {
      return { config: JSON.parse(raw) as MultiProjectConfig, configPath: abs };
    }
    return { config: yaml.load(raw) as MultiProjectConfig, configPath: abs };
  }
  return { config: null, configPath: null };
}
