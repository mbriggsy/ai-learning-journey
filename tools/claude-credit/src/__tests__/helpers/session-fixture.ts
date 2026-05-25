import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** slug dir -> filename -> array of lines (objects are JSON-stringified; raw strings written verbatim). */
export type SessionFixtureSpec = Record<string, Record<string, Array<Record<string, unknown> | string>>>;

/**
 * Build a throwaway home dir containing ~/.claude/projects/<slug>/*.jsonl from
 * the spec. Returns the home dir path (pass as collectSessionTokens homeDir).
 * Caller owns cleanupHome().
 */
export async function makeSessionFixture(spec: SessionFixtureSpec): Promise<string> {
  const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-home-'));
  const projectsDir = path.join(homeDir, '.claude', 'projects');
  await fs.mkdir(projectsDir, { recursive: true });
  for (const [slug, files] of Object.entries(spec)) {
    const dir = path.join(projectsDir, slug);
    await fs.mkdir(dir, { recursive: true });
    for (const [filename, lines] of Object.entries(files)) {
      const content = lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n');
      await fs.writeFile(path.join(dir, filename), content + '\n', 'utf8');
    }
  }
  return homeDir;
}

export async function cleanupHome(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/** Build a realistic `assistant` session line with a usage block. */
export function assistantLine(opts: {
  ts?: string;
  model?: string;
  sidechain?: boolean;
  input?: number;
  output?: number;
  cacheCreate?: number;
  cacheRead?: number;
}): Record<string, unknown> {
  return {
    type: 'assistant',
    timestamp: opts.ts ?? '2026-05-01T10:00:00.000Z',
    isSidechain: opts.sidechain ?? false,
    message: {
      model: opts.model ?? 'claude-opus-4-7',
      usage: {
        input_tokens: opts.input ?? 0,
        output_tokens: opts.output ?? 0,
        cache_creation_input_tokens: opts.cacheCreate ?? 0,
        cache_read_input_tokens: opts.cacheRead ?? 0,
      },
    },
  };
}
