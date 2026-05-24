import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import picomatch from 'picomatch';
import type { Ignore } from 'ignore';

const require = createRequire(import.meta.url);
const ignore: () => Ignore = require('ignore');

/** Directories we never descend into, regardless of .gitignore. */
export const HARD_EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.vite',
  '.wrangler',
  '.cache',
  '.parcel-cache',
  '.pnpm-store',
  '.yarn',
  '.npm',
  '.chrome-dev-profile',
  '.firefox-dev-profile',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  '.DS_Store',
]);

/** Files we never include, regardless of .gitignore. */
export const HARD_EXCLUDE_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
]);

export interface WalkOptions {
  rootDir: string;
  respectGitignore?: boolean;
  /** Additional directory names or relative-path globs to skip. */
  additionalExcludes?: string[];
  /** Globs to rescue from .gitignore even when respectGitignore is true. */
  includeFromGitignore?: string[];
}

export interface WalkedFile {
  /** Forward-slash, relative to rootDir. */
  relPath: string;
  absPath: string;
  size: number;
}

/** Convert any path to forward-slash. */
export function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

async function loadGitignore(rootDir: string): Promise<Ignore | null> {
  try {
    const content = await fs.readFile(path.join(rootDir, '.gitignore'), 'utf8');
    return ignore().add(content);
  } catch {
    return null;
  }
}

export async function* walkProject(opts: WalkOptions): AsyncGenerator<WalkedFile> {
  const { rootDir } = opts;
  const respectGitignore = opts.respectGitignore ?? true;
  const additionalExcludes = new Set(opts.additionalExcludes ?? []);
  const rescue = opts.includeFromGitignore?.length
    ? picomatch(opts.includeFromGitignore, { dot: true })
    : null;

  const gi = respectGitignore ? await loadGitignore(rootDir) : null;

  async function* recurse(dirAbs: string): AsyncGenerator<WalkedFile> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absPath = path.join(dirAbs, entry.name);
      const relPath = toPosix(path.relative(rootDir, absPath));

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (HARD_EXCLUDE_DIRS.has(entry.name)) continue;
        if (additionalExcludes.has(entry.name)) continue;
        // Don't skip ignored dirs that contain rescue paths — descend so the
        // rescue match has a chance to fire on files inside.
        if (gi && gi.ignores(`${relPath}/`) && !rescue?.(`${relPath}/`) && !rescue?.(relPath)) {
          continue;
        }
        yield* recurse(absPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (HARD_EXCLUDE_FILES.has(entry.name)) continue;
      if (gi && gi.ignores(relPath) && !rescue?.(relPath)) continue;

      let size = 0;
      try {
        const st = await fs.stat(absPath);
        size = st.size;
      } catch {
        continue;
      }

      yield { relPath, absPath, size };
    }
  }

  yield* recurse(rootDir);
}
