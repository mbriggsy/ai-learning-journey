import { promises as fs } from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';
import type { ProxyStats } from './taxonomy.js';
import { HARD_EXCLUDE_DIRS, toPosix } from './walker.js';

export interface ProxyOptions {
  /** Directory basenames whose immediate children count as iteration receipts. */
  iterationDirNames?: string[];
  /** Globs (relative to root, forward-slash) for regen-style scripts. */
  regenScriptGlobs?: string[];
}

const DEFAULT_ITERATION_DIRS = ['sample-eval'];
const DEFAULT_REGEN_GLOBS = [
  'scripts/regen-*.{ts,tsx,js,jsx,mjs,cjs}',
  '**/scripts/regen-*.{ts,tsx,js,jsx,mjs,cjs}',
];

async function findIterationDirChildren(rootDir: string, iterationDirNames: string[]): Promise<number> {
  const targetNames = new Set(iterationDirNames);
  let totalChildren = 0;

  async function recurse(dirAbs: string): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (HARD_EXCLUDE_DIRS.has(entry.name)) continue;
      const absChild = path.join(dirAbs, entry.name);
      if (targetNames.has(entry.name)) {
        // Count immediate subdirectories of this iteration dir.
        let grandchildren: import('node:fs').Dirent[];
        try {
          grandchildren = await fs.readdir(absChild, { withFileTypes: true });
        } catch {
          continue;
        }
        totalChildren += grandchildren.filter((g) => g.isDirectory()).length;
        // Don't descend further; iteration dirs aren't usually nested.
        continue;
      }
      await recurse(absChild);
    }
  }

  await recurse(rootDir);
  return totalChildren;
}

async function countRegenScripts(rootDir: string, globs: string[]): Promise<number> {
  const matcher = picomatch(globs, { dot: true });
  let count = 0;

  async function recurse(dirAbs: string): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absChild = path.join(dirAbs, entry.name);
      const relChild = toPosix(path.relative(rootDir, absChild));
      if (entry.isDirectory()) {
        if (HARD_EXCLUDE_DIRS.has(entry.name)) continue;
        await recurse(absChild);
        continue;
      }
      if (entry.isFile() && matcher(relChild)) {
        count += 1;
      }
    }
  }

  await recurse(rootDir);
  return count;
}

export async function collectProxyStats(rootDir: string, opts: ProxyOptions = {}): Promise<ProxyStats> {
  const iterationDirNames = opts.iterationDirNames ?? DEFAULT_ITERATION_DIRS;
  const regenGlobs = opts.regenScriptGlobs ?? DEFAULT_REGEN_GLOBS;

  const [sampleEvalRunCount, regenScriptCount] = await Promise.all([
    findIterationDirChildren(rootDir, iterationDirNames),
    countRegenScripts(rootDir, regenGlobs),
  ]);

  return {
    sampleEvalRunCount,
    regenScriptCount,
    iterationProxyTotal: sampleEvalRunCount + regenScriptCount,
  };
}
