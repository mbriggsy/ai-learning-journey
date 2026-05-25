import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { GitStats } from './taxonomy.js';

const execFileAsync = promisify(execFile);

const ASSET_EXT_FAMILIES: Record<string, string[]> = {
  images: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.tiff', '.tif'],
  audio: ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'],
  video: ['.mp4', '.webm', '.mov', '.mkv', '.avi'],
  fonts: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
};

const ALL_ASSET_EXTS = new Set(Object.values(ASSET_EXT_FAMILIES).flat());

function extToFamily(ext: string): string | null {
  const lower = ext.toLowerCase();
  for (const [family, exts] of Object.entries(ASSET_EXT_FAMILIES)) {
    if (exts.includes(lower)) return family;
  }
  return null;
}

function emptyStats(): GitStats {
  return {
    isGitRepo: false,
    totalCommits: 0,
    commitsByAuthor: [],
    lifetimeLinesAdded: 0,
    lifetimeLinesRemoved: 0,
    uniqueFilesTouched: 0,
    commitMessageLines: 0,
    discardedAssetFiles: 0,
    discardedAssetEvents: 0,
    discardedAssetByKind: {},
    assetModificationEvents: 0,
    assetUniquePathsTouched: 0,
    firstCommitISO: null,
    lastCommitISO: null,
    projectAgeDays: null,
    linesByAuthor: [],
    timeline: {
      commitsByDay: [],
      activeDays: 0,
      peakDay: null,
      largestSingleCommit: null,
    },
  };
}

/**
 * Resolve repo context for the given project root.
 *   - `scope: 'own'` — rootDir IS the git toplevel (its own repo).
 *   - `scope: 'subdir'` — rootDir is inside a larger repo; we'll scope
 *     all git queries to its subtree using a pathspec.
 *   - returns null if not under git at all.
 */
async function getRepoContext(rootDir: string): Promise<{
  scope: 'own' | 'subdir';
  /** Pathspec to use with `-- <pathspec>` when scope === 'subdir'. */
  pathspec?: string;
} | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', rootDir, 'rev-parse', '--show-toplevel'],
      { windowsHide: true },
    );
    const toplevel = path.resolve(stdout.trim());
    const resolvedRoot = path.resolve(rootDir);
    if (toplevel === resolvedRoot) {
      return { scope: 'own' };
    }
    return { scope: 'subdir' };
  } catch {
    return null;
  }
}

async function git(rootDir: string, args: string[], maxBuffer = 256 * 1024 * 1024): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', rootDir, ...args], {
    maxBuffer,
    windowsHide: true,
  });
  return stdout;
}

/**
 * Append `-- .` to scope a log command to the current directory's subtree.
 * Works whether we're at the repo root (matches everything) or in a subdir
 * (matches only that subtree's history).
 */
function withScope(args: string[]): string[] {
  return [...args, '--', '.'];
}

export async function collectGitStats(rootDir: string): Promise<GitStats> {
  const stats = emptyStats();
  const ctx = await getRepoContext(rootDir);
  if (!ctx) return stats;
  stats.isGitRepo = true;

  // Total commits scoped to rootDir's subtree.
  try {
    const out = await git(rootDir, withScope(['log', '--pretty=format:%H']));
    stats.totalCommits = out.split(/\r?\n/).filter(Boolean).length;
  } catch {
    return stats;
  }

  if (stats.totalCommits === 0) return stats;

  // Commits by author, scoped. shortlog doesn't take pathspec directly in
  // all versions — pipe via `log --format=%aN` and tally in JS.
  try {
    const out = await git(rootDir, withScope(['log', '--pretty=format:%aN']));
    const counts = new Map<string, number>();
    for (const line of out.split(/\r?\n/)) {
      const a = line.trim();
      if (!a) continue;
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
    stats.commitsByAuthor = Array.from(counts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    /* ignore */
  }

  // Lifetime churn + unique files touched, scoped.
  try {
    const out = await git(rootDir, withScope(['log', '--numstat', '--pretty=format:']));
    const filesTouched = new Set<string>();
    let added = 0;
    let removed = 0;
    for (const line of out.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [aStr, rStr, ...rest] = parts;
      const filePath = rest.join('\t');
      if (aStr !== '-' && rStr !== '-') {
        added += Number(aStr) || 0;
        removed += Number(rStr) || 0;
      }
      const renameMatch = filePath.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
      filesTouched.add(renameMatch ? `${renameMatch[1]}${renameMatch[3]}${renameMatch[4]}` : filePath);
    }
    stats.lifetimeLinesAdded = added;
    stats.lifetimeLinesRemoved = removed;
    stats.uniqueFilesTouched = filesTouched.size;
  } catch {
    /* ignore */
  }

  // Commit message line count, scoped.
  try {
    const out = await git(rootDir, withScope(['log', '--pretty=format:%B']));
    stats.commitMessageLines = out.split(/\r?\n/).filter((l) => l.trim()).length;
  } catch {
    /* ignore */
  }

  // Discarded asset files, scoped. Get all deletions in subtree, filter by ext in JS.
  try {
    const out = await git(rootDir, withScope(['log', '--diff-filter=D', '--name-only', '--pretty=format:']));
    const uniquePaths = new Set<string>();
    let events = 0;
    const byKind: Record<string, number> = {};
    for (const line of out.split(/\r?\n/)) {
      const p = line.trim();
      if (!p) continue;
      const ext = path.extname(p).toLowerCase();
      if (!ALL_ASSET_EXTS.has(ext)) continue;
      events += 1;
      uniquePaths.add(p);
      const family = extToFamily(ext);
      if (family) byKind[family] = (byKind[family] ?? 0) + 1;
    }
    stats.discardedAssetFiles = uniquePaths.size;
    stats.discardedAssetEvents = events;
    stats.discardedAssetByKind = byKind;
  } catch {
    /* ignore */
  }

  // Asset modification events — every commit-event touching an asset path, scoped.
  try {
    const out = await git(rootDir, withScope(['log', '--name-only', '--pretty=format:']));
    const unique = new Set<string>();
    let events = 0;
    for (const line of out.split(/\r?\n/)) {
      const p = line.trim();
      if (!p) continue;
      const ext = path.extname(p).toLowerCase();
      if (!ALL_ASSET_EXTS.has(ext)) continue;
      events += 1;
      unique.add(p);
    }
    stats.assetModificationEvents = events;
    stats.assetUniquePathsTouched = unique.size;
  } catch {
    /* ignore */
  }

  return stats;
}
