import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import type { ClassifierRule } from './classifier.js';

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
}

export interface MultiProjectConfig {
  projects: Array<{
    /** Absolute or ~-relative path to the project root. */
    path: string;
    /** Optional display name (defaults to basename of path). */
    name?: string;
  }>;
}

const CONFIG_FILE_CANDIDATES = [
  'claude-credit.config.mjs',
  'claude-credit.config.js',
  'claude-credit.config.cjs',
  'claude-credit.config.json',
  'claude-credit.config.yaml',
  'claude-credit.config.yml',
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
  '.claude-credit-projects.yaml',
  '.claude-credit-projects.yml',
  '.claude-credit-projects.json',
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
