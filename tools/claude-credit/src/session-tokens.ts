/**
 * PRIVACY BY CONSTRUCTION.
 *
 * This parser walks ~/.claude/projects/<slug>/*.jsonl files and computes token
 * usage statistics. Session JSONLs contain the FULL conversation transcript —
 * user prompts, assistant outputs, tool stdout/stderr, file contents, hook
 * outputs, paths, accidentally-pasted secrets, internal hostnames, etc.
 *
 * The parser extracts ONLY these fields, by name, from each line:
 *   - line.timestamp (top-level)
 *   - line.isSidechain (top-level)
 *   - line.message.model
 *   - line.message.usage.input_tokens
 *   - line.message.usage.output_tokens
 *   - line.message.usage.cache_creation_input_tokens
 *   - line.message.usage.cache_read_input_tokens
 *
 * The parser MUST NEVER reference line.cwd, line.gitBranch, line.lastPrompt,
 * line.attachment, line.aiTitle, line.toolUseResult, line.snapshot, or
 * message.content. The line object is never retained beyond the per-line
 * extraction step (no destructuring-with-rest, never serialized in any path).
 *
 * The downstream stats.json published to a public deploy goes through an
 * assertion-based allowlist test (src/__tests__/stats-shape.test.ts) that
 * compares the JSON's key-paths against a hand-coded ALLOWED_KEY_PATHS array
 * exported from src/strip-for-publish.ts. Adding a new field requires adding
 * a line to that array — CI fails otherwise.
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TokenStats } from './taxonomy.js';

/** The ONLY fields that enter aggregation. Exactly seven keys, by construction. */
type ParsedAssistantLine = {
  ts: string; // line.timestamp
  sidechain: boolean; // line.isSidechain === true
  model: string; // line.message.model
  input: number; // line.message.usage.input_tokens
  output: number; // line.message.usage.output_tokens
  cacheCreate: number; // line.message.usage.cache_creation_input_tokens
  cacheRead: number; // line.message.usage.cache_read_input_tokens
};

const MODEL_NAMES: Record<string, string> = {
  'claude-opus-4-7': 'Opus 4.7',
  'claude-opus-4-6': 'Opus 4.6',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-sonnet-4-5': 'Sonnet 4.5',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
};

/**
 * Normalize a raw model id to a display name. Known ids map to friendly names;
 * a trailing `-<8-digit-date>` snapshot suffix and a `[1m]` context tag are
 * stripped before lookup so dated/variant ids still resolve. Unknown ids pass
 * through unchanged.
 */
export function normalizeModel(id: string): string {
  if (MODEL_NAMES[id]) return MODEL_NAMES[id]!;
  const stripped = id.replace(/\[1m\]$/, '').replace(/-\d{8}$/, '');
  return MODEL_NAMES[stripped] ?? id;
}

/**
 * Slugify an absolute project path the way Claude Code names its session dir.
 * Normalize FIRST (resolves `..`) so a `..`-bearing path yields the canonical
 * parent's slug. `C:/Users/brigg/.../burned` → `C--Users-brigg-...-burned`.
 */
export function projectPathToSessionSlug(absPath: string): string {
  return path
    .resolve(absPath)
    .replace(/\\/g, '/')
    .replace(/:/g, '-')
    .replace(/\//g, '-')
    .replace(/^-+/, '');
}

/**
 * Assign each on-disk session slug to the configured parent it belongs to,
 * case-INSENSITIVELY, longest-prefix-match-wins. A slug that matches no parent
 * is an orphan. Returns parents keyed LOWERCASE; matched slug names keep their
 * on-disk casing (they are real directory names).
 *
 * Match rules (all lowercased):
 *   - exact:    slug === parent
 *   - worktree: slug starts with `parent--claude-worktrees-` (incl. nested)
 *   - subdir:   slug starts with `parent-` but NOT `parent--`
 * Longest-first ensures `data-engineering-atc` claims itself before
 * `data-engineering` could subsume it.
 */
export function classifySlugs(
  parentSlugs: string[],
  onDiskSlugs: string[],
): { byParent: Map<string, string[]>; orphans: string[] } {
  const sorted = [...new Set(parentSlugs.map((s) => s.toLowerCase()))].sort(
    (a, b) => b.length - a.length,
  );
  const byParent = new Map<string, string[]>();
  const orphans: string[] = [];
  for (const slug of onDiskSlugs) {
    const lower = slug.toLowerCase();
    let matched: string | null = null;
    for (const parent of sorted) {
      if (
        lower === parent ||
        lower.startsWith(parent + '--claude-worktrees-') ||
        (lower.startsWith(parent + '-') && !lower.startsWith(parent + '--'))
      ) {
        matched = parent;
        break;
      }
    }
    if (matched) {
      const arr = byParent.get(matched) ?? [];
      arr.push(slug);
      byParent.set(matched, arr);
    } else {
      orphans.push(slug);
    }
  }
  return { byParent, orphans };
}

/**
 * Pick-list extraction. Returns EXACTLY seven keys for an `assistant` line, or
 * null for any other line type / structurally-broken line. Missing or
 * non-numeric usage integers clamp to 0 (the line is still "seen"). The parent
 * `line` is never retained, destructured-with-rest, or serialized.
 */
export function parseLine(raw: unknown): ParsedAssistantLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const line = raw as Record<string, unknown>;
  if (line.type !== 'assistant') return null;
  const message = line.message;
  if (!message || typeof message !== 'object') return null;
  const msg = message as Record<string, unknown>;
  const usage =
    msg.usage && typeof msg.usage === 'object' ? (msg.usage as Record<string, unknown>) : {};
  return {
    ts: typeof line.timestamp === 'string' ? line.timestamp : '',
    sidechain: line.isSidechain === true,
    model: String(msg.model ?? 'unknown'),
    input: Number(usage.input_tokens) || 0,
    output: Number(usage.output_tokens) || 0,
    cacheCreate: Number(usage.cache_creation_input_tokens) || 0,
    cacheRead: Number(usage.cache_read_input_tokens) || 0,
  } satisfies ParsedAssistantLine;
}

/** True iff raw.message.usage carries all four canonical token integers. */
function usageIsWellFormed(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const message = (raw as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return false;
  const usage = (message as { usage?: unknown }).usage;
  if (!usage || typeof usage !== 'object') return false;
  const u = usage as Record<string, unknown>;
  return (
    typeof u.input_tokens === 'number' &&
    typeof u.output_tokens === 'number' &&
    typeof u.cache_creation_input_tokens === 'number' &&
    typeof u.cache_read_input_tokens === 'number'
  );
}

/**
 * Collect Claude Code session-token stats for one project. NEVER throws.
 *
 * Returns the window-bounded TokenStats (a FLOOR — JSONLs rotate after ~30
 * days) plus the on-disk slug dirs that merged into this project (for the
 * caller's orphan accounting). `stats` is null when ~/.claude/projects is
 * absent, no slug matched, or no assistant message was found.
 *
 * NOTE: `sessionCount` counts assistant MESSAGES across matched files (per the
 * data contract / tests), not distinct session files. byModel.sessions is the
 * same per-model message count.
 */
export async function collectSessionTokens(
  projectPath: string,
  opts: { homeDir?: string; configuredParentSlugs?: string[] } = {},
): Promise<{ stats: TokenStats | null; matchedSlugs: string[] }> {
  const homeDir = opts.homeDir ?? os.homedir();
  const projectsDir = path.join(homeDir, '.claude', 'projects');
  const projectSlug = projectPathToSessionSlug(projectPath);

  let onDiskSlugs: string[];
  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    onDiskSlugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return { stats: null, matchedSlugs: [] }; // no ~/.claude/projects (clean machine / CI)
  }

  const parents =
    opts.configuredParentSlugs && opts.configuredParentSlugs.length > 0
      ? opts.configuredParentSlugs
      : [projectSlug];
  const { byParent } = classifySlugs(parents, onDiskSlugs);
  const matchedSlugs = byParent.get(projectSlug.toLowerCase()) ?? [];
  if (matchedSlugs.length === 0) return { stats: null, matchedSlugs: [] };

  const parseHealth = { lineParseErrors: 0, usageShapeWarnings: 0, fileReadErrors: 0 };
  let input = 0;
  let output = 0;
  let cacheCreate = 0;
  let cacheRead = 0;
  let sidechainTokens = 0;
  let sessionCount = 0; // assistant-message count (see JSDoc)
  let windowStartMs: number | null = null;
  let windowEndMs: number | null = null;
  let windowStartISO: string | null = null;
  let windowEndISO: string | null = null;
  const modelMap = new Map<string, { sessions: number; tokensProcessed: number }>();

  for (const slug of matchedSlugs) {
    const dir = path.join(projectsDir, slug);
    let files: string[];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jsonl'));
    } catch {
      parseHealth.fileReadErrors += 1;
      continue;
    }
    for (const file of files) {
      let content: string;
      try {
        content = await fs.readFile(path.join(dir, file), 'utf8');
      } catch {
        parseHealth.fileReadErrors += 1;
        continue;
      }
      for (const rawLine of content.split('\n')) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;
        let json: unknown;
        try {
          json = JSON.parse(trimmed);
        } catch {
          parseHealth.lineParseErrors += 1;
          continue;
        }
        const parsed = parseLine(json);
        if (!parsed) continue; // not an assistant line
        sessionCount += 1;
        if (!usageIsWellFormed(json)) parseHealth.usageShapeWarnings += 1;

        input += parsed.input;
        output += parsed.output;
        cacheCreate += parsed.cacheCreate;
        cacheRead += parsed.cacheRead;
        const lineProcessed = parsed.input + parsed.output + parsed.cacheCreate + parsed.cacheRead;
        if (parsed.sidechain) sidechainTokens += lineProcessed;

        const ms = Date.parse(parsed.ts);
        if (Number.isFinite(ms)) {
          if (windowStartMs === null || ms < windowStartMs) {
            windowStartMs = ms;
            windowStartISO = parsed.ts;
          }
          if (windowEndMs === null || ms > windowEndMs) {
            windowEndMs = ms;
            windowEndISO = parsed.ts;
          }
        }

        const model = normalizeModel(parsed.model);
        const entry = modelMap.get(model) ?? { sessions: 0, tokensProcessed: 0 };
        entry.sessions += 1;
        entry.tokensProcessed += lineProcessed;
        modelMap.set(model, entry);
      }
    }
  }

  if (sessionCount === 0) return { stats: null, matchedSlugs };

  const tokensProcessed = input + output + cacheCreate + cacheRead;
  const tokensFresh = input + output + cacheCreate;
  const windowDays =
    windowStartMs !== null && windowEndMs !== null
      ? Math.floor((windowEndMs - windowStartMs) / 86_400_000)
      : null;

  if (windowDays !== null && windowDays > 45) {
    process.stderr.write(
      `[claude-credit] token window ${windowDays}d exceeds the ~30d JSONL rotation; ` +
        `retention may not be pruning as expected (showing the real number).\n`,
    );
  }

  const byModel = Array.from(modelMap.entries())
    .map(([model, v]) => ({ model, sessions: v.sessions, tokensProcessed: v.tokensProcessed }))
    .sort((a, b) => b.tokensProcessed - a.tokensProcessed);

  const stats: TokenStats = {
    windowStartISO,
    windowEndISO,
    windowDays,
    sessionCount,
    sidechainTokens,
    inputTokens: input,
    outputTokens: output,
    cacheCreationInputTokens: cacheCreate,
    cacheReadInputTokens: cacheRead,
    tokensProcessed,
    tokensFresh,
    byModel,
    parseHealth,
  };
  return { stats, matchedSlugs };
}
