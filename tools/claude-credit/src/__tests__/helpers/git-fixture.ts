import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);

export interface FixtureCommit {
  message: string;
  /** relPath (forward-slash) -> file content. Written before the commit. */
  files: Record<string, string>;
  /** Sets GIT_AUTHOR_DATE + GIT_COMMITTER_DATE — include an explicit offset for determinism. */
  dateISO: string;
  /** Primary author name; defaults to 'Test Author'. */
  authorName?: string;
}

/**
 * Create a throwaway git repo with the given commits, in commit order.
 * Pins author identity AND per-commit dates via env so timeline/peakDay
 * assertions are deterministic and `git commit` never prompts for identity.
 * Caller is responsible for cleanupFixture().
 */
export async function makeGitFixture(commits: FixtureCommit[]): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-git-'));
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test Author',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test Author',
    GIT_COMMITTER_EMAIL: 'test@example.com',
  };
  // -b main avoids the git 2.28+ default-branch-name prompt.
  await run('git', ['init', '-b', 'main'], { cwd: tmpDir, env: baseEnv });

  for (const c of commits) {
    for (const [rel, content] of Object.entries(c.files)) {
      const abs = path.join(tmpDir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, 'utf8');
    }
    await run('git', ['add', '-A'], { cwd: tmpDir, env: baseEnv });
    const name = c.authorName ?? 'Test Author';
    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      GIT_AUTHOR_NAME: name,
      GIT_COMMITTER_NAME: name,
      GIT_AUTHOR_DATE: c.dateISO,
      GIT_COMMITTER_DATE: c.dateISO,
    };
    await run('git', ['commit', '-m', c.message], { cwd: tmpDir, env });
  }
  return tmpDir;
}

export async function cleanupFixture(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}
