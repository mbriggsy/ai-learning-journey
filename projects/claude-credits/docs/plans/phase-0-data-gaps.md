---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T12:43:38-04:00
doc-reviewed:
---

# Phase 0 — Fill data gaps in `tools/claude-credit/`

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is the paint-by-numbers recipe for the data contract Phase 1+ renders against.

Phase 0 extends the CLI with six new data field groups + a multi-project config parser extension. None of this is visual work; it's the data spine. The site renders nothing meaningful until these land.

## Locked decisions inherited from Phase −1 preflight cascade

Apply these throughout — they are NOT optional:

1. **§0.9 REMOVED.** The `~/.claude-credit-projects.yaml` edit moved into preflight −1.2. Leaving §0.9 in place would re-write the YAML and silently clobber the new `meta:` / `archive:` keys preflight just wrote. The slot is preserved as a one-line marker so the deepening-drift audit catches any reintroduction.
2. **§0.6b ADDED.** Parser extension to `loadMultiProjectConfig` + `buildMultiProjectReport` so the CLI recognizes THREE top-level config keys: `projects:`, `meta:`, `archive:`. `archive[*]` entries scan + contribute to `combined.totalX`, but emit ONE rolled-up `archiveCollective` block, not individual `ProjectReport` entries.
3. **§0.6 `EditorialContent.status` enum reduced to two values.** Was `'active' | 'shelved' | 'meta'`; now `'active' | 'meta'` only. The archive collective is a separate surface, not an `EditorialContent` row, so there is no consumer for `'shelved'`.
4. **`ProjectReport.kind: 'active' | 'meta'` discriminator added.** So the site (Phase 4 grid) can split the rendering into "active" tiles + "the tools" tiles cleanly. Archive entries never appear in `projects[]` — they live ONLY in `archiveCollective`.

## Decisions locked at this deepening (read before executing)

- **Execution order: three batches.** Batch A lands every `taxonomy.ts` edit in ONE commit before any consumer touches the new types. The `GitStats` and `ProjectReport` interfaces are non-optional today (every field required); half-landed types fail `tsc -p .` on every consumer file. Batch B runs implementations 0.1 → 0.6b in order. Batch C runs the markdown surface (0.8), the test fixture pass (0.10), and the version bump (0.7) last.
- **§0.4 + §0.5 are merged.** The original plan said "bucket the already-collected commit data by day" — but `collectGitStats` runs SEPARATE `git log` passes per metric; there is no shared in-memory commit list. Merging into a single `git log --pretty=format:"%H%x00%aI%x00%aN%x00%B%x00END" --numstat -- .` pass cuts subprocess time in half and lets `largestSingleCommit` reuse the numstat data `linesByAuthor` already reads.
- **Token field naming is split.** The original plan's single `totalTokens` field summed all four buckets (input + output + cacheCreation + cacheRead). That number is dominated by cache reads (5–20× the rest in real traffic) — fine as a magnitude-shock hero but misleading as a "work done" measure. Ship BOTH numbers under unambiguous names:
  - `tokensProcessed = input + output + cacheCreation + cacheRead` — the "tokens the model touched" magnitude. Hero PRIMARY uses this.
  - `tokensGenerated = input + output + cacheCreation` — "fresh tokens produced or first-read." Honest work signal. Detail-page breakdown shows both.
- **`largestSingleCommit.messageFirstLine` is DROPPED from the schema.** Commit subjects can contain `C:\Users\...`, `/Users/...`, `~`-paths, internal slugs, `@mentions`, or accidentally-pasted secrets. The "+4,200-line commit on Apr 22" story works with `sha + dateISO + linesAdded + linesRemoved` alone. Removing the field eliminates a whole class of public-data leak vectors AND simplifies the privacy-stripping discipline.
- **Privacy by construction is STRUCTURAL, not documentary.** The session-tokens parser uses a pick-list pattern — the parsed object has exactly eight keys and the `message` object is never retained by reference. A snapshot test asserts the parser's output keys against a frozen list. A pre-publish grep-guard in the GitHub Action refuses to commit `public/data/stats.json` if it contains `C:\\`, `/Users/`, `brigg`, `private`, `secret`, `token`, `password`, or UUID-shaped strings outside the model-name allowlist.
- **Tests are required for §0.4, §0.5b, §0.6b.** Zero tests exist today (vitest is wired in `tools/claude-credit/package.json` but the harness has never run). Other units defer with a stated reason. See §0.10.

## Current state (verified at deepening, 2026-05-24)

Read of `tools/claude-credit/src/taxonomy.ts`:
- `GitStats` has `isGitRepo`, `totalCommits`, `commitsByAuthor`, `lifetimeLinesAdded`, `lifetimeLinesRemoved`, `uniqueFilesTouched`, `commitMessageLines`, `discardedAssetFiles`, `discardedAssetEvents`, `discardedAssetByKind`, `assetModificationEvents`, `assetUniquePathsTouched`. **None of the six new fields exist.**
- `ProjectReport` is `{ projectPath, projectName, scannedAt, tiers, git, proxies, grandTotals, warnings }`. **No `tokens`, no `editorial`, no `kind`, no `assetBytesByKind`, no `topSubcategories`.**
- `MultiProjectReport.combined` has 13 keys, none for tokens or archive. **No `archiveCollective`. No top-level `meta` array.**

Read of `tools/claude-credit/src/config.ts`:
- `ProjectConfig` carries `excludeAdditional`, `includeFromGitignore`, `classificationRules`, `proxies`, `generationLogs`. **No `editorial:` field.**
- `MultiProjectConfig` only knows `projects:` (single array). **No `meta:` / `archive:` parsing.**
- `loadProjectConfig` already iterates five file formats (`.mjs`, `.js`, `.cjs`, `.json`, `.yaml`/`.yml`). Reuse.
- `loadMultiProjectConfig` reads `~/.claude-credit-projects.yaml`. Same pattern, single function — extend it.

Read of `tools/claude-credit/src/git-stats.ts`:
- `collectGitStats(rootDir)` does its own subprocess management via `execFileAsync` wrapped in `git()` at line 71.
- `withScope(args)` at line 84 appends `-- .` so subdir projects work.
- `getRepoContext` at lines 49-69 detects "own" vs "subdir" scope.
- `emptyStats()` at line 25 initializes every field — **every new `GitStats` field MUST be added here too**, or `tsc -p .` fails on missing properties (interface is non-optional today).
- Existing rename-tracking regex at line 137: `/^(.*)\{(.*) => (.*)\}(.*)$/` — handles `path/{old => new}/x` syntax. **The merged 0.4+0.5 pass must preserve this** or `uniqueFilesTouched` regresses on rename-heavy projects.

Read of `tools/claude-credit/src/multi-report.ts`:
- `buildMultiProjectReport` accepts `homeDir?: string` option (line 9, used at line 69). **This is the load-bearing testability seam for session-tokens.ts** — tests can inject a stub `~/.claude/projects/` path without touching the real one.
- Aggregation loop at lines 114-127 sums per-project values into `combined`. Extend in place for the four new combined fields.

Read of `tools/claude-credit/src/report.ts`:
- `buildProjectReport` runs `collectGitStats` + `collectProxyStats` in `Promise.all` at line 40. **Add `collectSessionTokens(rootDir, opts.homeDir)` to this `Promise.all`** so tokens collection runs in parallel with git + proxies.

Read of `tools/claude-credit/package.json`:
- Version `0.1.0` → bump to `0.2.0` in §0.7.
- `vitest` is in `devDependencies` (line 44). `test` script is `vitest run` (line 30). **Zero `*.test.ts` files exist** — Phase 0 lights up the harness for the first time.

Read of `~/.claude/projects/` (the session JSONL directory):
- Confirmed slug for BURNED: `C--Users-brigg-ai-learning-journey-projects-burned`.
- Worktree slug present: `C--Users-brigg-ai-learning-journey-projects-burned--claude-worktrees-angry-matsumoto-39913a` (double-dash separator).
- **Subdir-slug landmine confirmed on disk:** `C--Users-brigg-ai-learning-journey-projects-data-engineering` AND `...-data-engineering-atc` BOTH exist (single-dash separator). A naïve `startsWith(parentSlug)` would false-merge across project boundaries.
- Sidechain records are interleaved into the **parent session's JSONL** as lines with `isSidechain: true` — they are NOT written to a separate slug directory. The same parser handles them; no separate file enumeration.

Read of a real assistant message line (BURNED, 2026-05-11):
- Top-level keys: `parentUuid`, `isSidechain`, `message`, `requestId`, `type`, `uuid`, `timestamp`, `userType`, `entrypoint`, `cwd`, `sessionId`, `version`, `gitBranch`.
- **PII-bearing top-level fields the parser MUST NEVER reference by name:** `cwd` (absolute Windows path including username), `gitBranch` (feature names / ticket IDs), `lastPrompt` (raw user prompt on `last-prompt` lines), `attachment` (`stdout` / `content` = hook output, can include manifesto + pasted file content), `aiTitle` (LLM-generated summary of session content), `toolUseResult` (tool stdout/stderr with file contents + paths + secrets), `snapshot` (on `file-history-snapshot` lines — raw file content).
- Within `message`: only `model` + `usage` are safe. `message.content` is the conversation transcript — DO NOT TOUCH.
- `message.usage` keys: `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`, plus extras (`server_tool_use`, `service_tier`, `cache_creation`, `inference_geo`, `iterations`, `speed`). Of the extras, **`inference_geo` is a free-form string** — read only the four canonical integer fields by name.

Read of `projects/burned/claude-credit.config.yaml`:
- Existing keys: `includeFromGitignore`, `generationLogs`. **No `editorial:` block.** The config schema must be EXTENDED (additive optional field), not replaced. No other project has any config file yet.

---

## Execution order — three batches

### Batch A — taxonomy.ts (one commit)

Land every type change in `tools/claude-credit/src/taxonomy.ts` BEFORE touching any consumer file. Each new `GitStats` / `ProjectReport` / `MultiProjectReport` field must be added to both the interface AND the corresponding `emptyStats()` factory (in `git-stats.ts`) or default initializer (in `report.ts`).

Exact edit blocks — apply in order:

**A.1 — extend `GitStats`** (additive, append at end of interface body, lines 78-100):

```ts
export interface GitStats {
  // ... existing 12 fields ...
  // 0.1 — temporal context
  firstCommitISO: string | null;
  lastCommitISO: string | null;
  projectAgeDays: number | null;
  // 0.4 — author breakdown (Co-Authored-By aware)
  linesByAuthor: Array<{
    author: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    coAuthoredCommits: number;
  }>;
  // 0.5 — cadence + commit-size story
  timeline: {
    commitsByDay: Array<{ date: string; count: number }>;
    activeDays: number;
    peakDay: { date: string; count: number } | null;
    largestSingleCommit: {
      sha: string;
      dateISO: string;
      linesAdded: number;
      linesRemoved: number;
    } | null;
  };
}
```

**A.2 — extend `ProjectReport`** (additive, append at end of interface body, lines 120-129):

```ts
export interface ProjectReport {
  // ... existing 8 fields ...
  // 0.2 — bytes-on-disk per asset family
  assetBytesByKind: {
    images: number;
    audio: number;
    video: number;
    fonts: number;
    'misc-media': number;
  };
  // 0.3 — pre-computed callout cards
  topSubcategories: Array<{
    tier: Tier;
    category: string;
    subcategory: string;
    bytes: number;
    files: number;
    lines: number;
  }>;
  // 0.5b — Claude Code session tokens (window-bounded floor)
  tokens: TokenStats | null;
  // 0.6 — editorial content (per-project config)
  editorial: EditorialContent | null;
  // 0.6b — discriminator: archive entries never appear here
  kind: 'active' | 'meta';
}
```

**A.3 — add `TokenStats` + `EditorialContent` + `ArchiveCollective` interfaces** (insert before `MultiProjectReport`):

```ts
export interface TokenStats {
  // Window covered (oldest assistant message → newest, per-project)
  windowStartISO: string | null;
  windowEndISO: string | null;
  windowDays: number | null;

  sessionCount: number;
  sidechainTokens: number;  // subset of tokensProcessed sourced from isSidechain=true lines

  // Raw buckets
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;

  // Aggregates (named to avoid the ambiguous "totalTokens")
  tokensProcessed: number;  // input + output + cacheCreation + cacheRead — magnitude shock
  tokensGenerated: number;  // input + output + cacheCreation — work signal (excludes cheap re-feeds)

  // Per-model breakdown (model name normalized: "claude-opus-4-7" → "Opus 4.7")
  byModel: Array<{ model: string; sessions: number; tokensProcessed: number }>;

  // Parser health — surfaced so the honesty signal is observable
  parseHealth: {
    lineParseErrors: number;
    usageShapeWarnings: number;
    fileReadErrors: number;
  };
}

export interface EditorialContent {
  oneLiner: string;
  hookStat: { label: string; value: string };
  heroImage: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  status: 'active' | 'meta';  // 'shelved' removed — archive collective is a separate surface
  description: string;
  gallery: string[];
}

export interface ArchiveCollective {
  projectNames: string[];
  projectCount: number;
  totalAuthoredFiles: number;
  totalAuthoredBytes: number;
  totalAuthoredLines: number;
  totalPipelineGeneratedFiles: number;
  totalPipelineGeneratedBytes: number;
  totalAllBytes: number;
  totalCommits: number;
  totalTokensProcessed: number;
  totalTokensGenerated: number;
  totalSessions: number;
}
```

**A.4 — extend `MultiProjectReport`** (top-level shape becomes three-array):

```ts
export interface MultiProjectReport {
  // INVARIANT: archive entries never appear in projects[] or meta[].
  // INVARIANT: combined.totalX === sum(projects[].X) + sum(meta[].X) + archiveCollective.totalX
  projects: ProjectReport[];      // kind: 'active'
  meta: ProjectReport[];           // kind: 'meta'
  archiveCollective: ArchiveCollective | null;
  combined: {
    // ... existing 13 fields stay ...
    // 0.5b — token aggregates
    totalTokensProcessed: number;
    totalTokensGenerated: number;
    totalSessions: number;
    tokenWindowStartISO: string | null;  // min across non-null project starts
    tokenWindowEndISO: string | null;    // max across non-null project ends
    tokenWindowDays: number | null;
    modelBreakdown: Array<{ model: string; sessions: number; tokensProcessed: number }>;
  };
  scannedAt: string;
}
```

**A.5 — update `git-stats.ts` `emptyStats()`** (line 25): add every new field with its empty default so the interface stays non-optional.

```ts
function emptyStats(): GitStats {
  return {
    // ... existing 12 ...
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
```

**A.6 — verify Batch A compiles:** `cd C:/Users/brigg/ai-learning-journey/tools/claude-credit && pnpm typecheck`. Expected outcome: clean exit. If any consumer file fails (e.g., `report.ts` doesn't yet set `assetBytesByKind` / `topSubcategories` / `tokens` / `editorial` / `kind`), the missing-property errors are EXPECTED — Batch A is a deliberate "type frame first" landing. Each Batch B unit lands one consumer-side fix. **Don't try to make Batch A green on its own; expect missing-property errors from `report.ts` and `multi-report.ts` until 0.2 / 0.3 / 0.5b / 0.6 / 0.6b each land their consumer-side edits.**

Workaround if Batch A's missing-property errors block local-dev workflow: insert temporary `as ProjectReport` casts at the report-return site in `report.ts` line 75, removed unit by unit as each consumer fix lands.

**Batch A commit point:** `chore(claude-credit): add Phase 0 type frame to taxonomy.ts`. Single commit, no consumer code yet.

### Batch B — implementations (units in order)

Each unit lands one consumer-side fix + its implementation. Run the per-unit verification probe before moving on. Don't chain.

### Batch C — surfacing + tests + version

After all Batch B units land: §0.8 (markdown.ts + terminal.ts surface the new fields), §0.10 (test fixture monorepo + integration tests), §0.7 (version bump 0.1.0 → 0.2.0 + omnibus verify).

---

## Null discipline — load-bearing rule

Pick ONE semantic and hold it across the type, the renderer, and the site:

- **NULL = "we did not measure this."** No git history (`firstCommitISO: null`), no JSONL on disk (`tokens: null`), no editorial config block (`editorial: null`), peak day undefined (`timeline.peakDay: null`), no largest-commit-yet (`timeline.largestSingleCommit: null`). Renderers display **em-dash "—"** and SUPPRESS any derived UI affordance (no age ribbon, no AUTHORED BY block, no live-link button, no TOKENS CONSUMED section). Aggregation skips null values entirely.
- **ZERO = "we measured and there were none."** `assetBytesByKind.video = 0` means we scanned and found zero video bytes. Renderers display **"0"** (numeric).
- **NEVER coerce null to zero in aggregation.** `combined.totalTokensProcessed` skips projects where `tokens === null`; `tokenWindowStartISO` is `min` across non-null project starts only; `modelBreakdown` only merges non-null contributions.
- **Site (Phase 2+) consumes JSON-stringified `null` as JS `null`.** Predicates are explicit: `if (report.tokens === null)` not `if (!report.tokens.tokensProcessed)`.

Fields that may be null after Phase 0:
- `git.firstCommitISO`, `git.lastCommitISO`, `git.projectAgeDays`
- `git.timeline.peakDay`, `git.timeline.largestSingleCommit`
- `tokens` (whole block) — and consequently all its children
- `editorial` (whole block) — and consequently all its children
- `editorial.heroImage`, `editorial.liveUrl`, `editorial.repoUrl`
- `archiveCollective` (the whole block, when no `archive:` entries are configured)
- All combined token aggregates when every project has `tokens: null`

---

## Privacy by construction — structural enforcement

The session-tokens parser feeds a public deploy. Doc-rules ("don't read message.content") are not enforceable. The discipline below is.

**Pick-list pattern at the parser entry.** The parser MUST extract exactly these fields from a JSONL line, by name, into a fresh object — and discard the line reference. The parent `line` object is never retained, summed against, or compared structurally.

```ts
// Pseudocode — the only fields that enter aggregation.
// Header comment in src/session-tokens.ts MUST repeat this rule.
type ParsedAssistantLine = {
  ts: string;          // line.timestamp
  sidechain: boolean;  // line.isSidechain === true
  model: string;       // line.message.model
  input: number;       // line.message.usage.input_tokens
  output: number;      // line.message.usage.output_tokens
  cacheCreate: number; // line.message.usage.cache_creation_input_tokens
  cacheRead: number;   // line.message.usage.cache_read_input_tokens
};
```

The 0.5b unit test asserts that `Object.keys(parseLine(realFixture))` is exactly the 7-key set above.

**Stats.json allowlist.** `public/data/stats.json` ships only fields in the allowlist defined by the snapshot test in §0.10 (which compares the keys of a fresh `JSON.stringify(multiReport)` against a frozen approved-keys list). Adding a new field requires updating the snapshot — CI fails otherwise.

**Pre-publish grep-guard** (GitHub Action — Phase 8). Refuse to commit `public/data/stats.json` if it contains any of:
- `C:\` (Windows absolute path)
- `/Users/` (POSIX home path)
- `brigg` (username)
- `private` (the monorepo's `private/` parent — sensitive projects)
- `secret`, `token` (token in a SECRET sense, not the model-token sense — see exemption below), `password`
- UUID-shaped strings outside the known model-name allowlist

Exemption: the grep for `token` is scoped to **string values** that contain the word in a security context (e.g., `"token": "sk-..."`); it does NOT match the numeric token-count fields. Implementation: grep against `JSON.parse → JSON.stringify(filtered, null, 2)` looking only at string values, never field names.

---

## Aggregation invariant (LOCKED — write as a comment above `MultiProjectReport`)

```
INVARIANT: combined.totalX = sum(projects[].grandTotals.X)
                           + sum(meta[].grandTotals.X)
                           + archiveCollective.totalX
where X ∈ { AuthoredFiles, AuthoredBytes, AuthoredLines, AllBytes,
            Commits, TokensProcessed, TokensGenerated, Sessions }
```

Archive entries are NEVER present in `projects[]` or `meta[]`. The §0.10 fixture-based aggregation invariant test enforces this on every CI run.

---

## 0.1 — `firstCommitISO` / `lastCommitISO` / `projectAgeDays` (~5 min)

**File:** `tools/claude-credit/src/git-stats.ts`

After the existing `commitsByAuthor` block (around line 117), add a try/catch block that runs two `git log` calls scoped via `withScope()`:

- First commit: `git log --pretty=format:%aI --reverse --max-count=1 -- .`
  - **DO NOT** use `git log ... | head -1` — `head` is a POSIX-ism. The pipe doesn't exist on Windows PowerShell paths even via `execFileAsync` (Node passes args to `git`, no shell). Use `--max-count=1` directly.
- Last commit: `git log --pretty=format:%aI -1 -- .` (`-1` is shorthand for `--max-count=1`)
- Age: `Math.floor((Date.parse(last) - Date.parse(first)) / 86_400_000)`. Days, floored.

Set `stats.firstCommitISO`, `stats.lastCommitISO`, `stats.projectAgeDays`. On exception: leave at their null defaults from `emptyStats()`.

**Pattern to follow:** existing try/catch wrappers at `git-stats.ts:106-119`. Use the existing `git()` helper. Use `withScope()` for subdir-mode projects.

**Verify:**
```
cd C:/Users/brigg/ai-learning-journey/tools/claude-credit
pnpm dev -- C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.git | {firstCommitISO, lastCommitISO, projectAgeDays}'
```
Expected: all three non-null on BURNED. `projectAgeDays` ≥ 40 (BURNED is ~50 days old at deepening time).

**Tests:** deferred. Pure git wrapper, no edge cases beyond non-repo (already handled by `getRepoContext` returning null at the top of `collectGitStats`). The 0.10 fixture test validates the field is present.

**Commit:** `feat(claude-credit): GitStats temporal context — firstCommit/lastCommit/age`

## 0.2 — `assetBytesByKind` (~5 min)

**Files:** `tools/claude-credit/src/counter.ts` (add helper) + `tools/claude-credit/src/report.ts` (call + attach)

Add a helper in `counter.ts` after `aggregateTiers`:

```ts
// Pseudocode shape
export function aggregateAssetBytes(files: CategorizedFile[]): ProjectReport['assetBytesByKind'] {
  // Initialize all five keys to 0 (never null — ZERO discipline)
  // Filter files where tier === 'pipeline-generated' && category === 'assets'
  // Sum bytes per subcategory key
  // Return the typed record
}
```

In `report.ts` after line 73 (`grandTotals` aggregation block): `const assetBytesByKind = aggregateAssetBytes(categorized);` then add to the return object.

**Pattern to follow:** the existing `aggregateTiers` Map-reduce shape at `counter.ts:94`. Same iteration over `categorized: CategorizedFile[]`.

**Verify:**
```
pnpm dev -- C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.assetBytesByKind'
```
Expected: five keys present (images, audio, video, fonts, misc-media). `images > 0` on BURNED. All five integer-valued, never null.

**Tests:** deferred. Output visible in JSON; no edge cases.

**Commit:** `feat(claude-credit): assetBytesByKind aggregation`

## 0.3 — `topSubcategories` (~5 min)

**File:** `tools/claude-credit/src/report.ts`

After the `aggregateTiers` call at line 39 produces `tiers`, flat-map all (tier, category, subcategory) triples into a single array, sort desc by bytes, slice to 5:

```ts
// Pseudocode
const topSubcategories = tiers
  .flatMap(t => t.categories.flatMap(c => c.subcategories.map(s => ({
    tier: t.tier, category: c.category, subcategory: s.subcategory,
    bytes: s.bytes, files: s.files, lines: s.totalLines,
  }))))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 5);
```

Attach to the return object.

**Pattern to follow:** the `subs.sort((a, b) => b.bytes - a.bytes)` comparator at `counter.ts:121`. Same sort discipline.

**Verify:**
```
pnpm dev -- C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.topSubcategories | {len: length, top: .[0]}'
```
Expected: `len = 5`, `top.bytes` is the largest subcategory by bytes (on BURNED, likely `pipeline-generated/assets/images` or `pipeline-generated/assets/video`).

**Tests:** deferred. Trivially observable in JSON.

**Commit:** `feat(claude-credit): topSubcategories pre-computed`

## 0.4 + 0.5 (merged) — `linesByAuthor` + `timeline` (~30 min)

**File:** `tools/claude-credit/src/git-stats.ts`

**Single `git log` pass** (one subprocess instead of two) produces both blocks. Existing helper `git()` + `withScope()` apply.

Command shape (pseudocode for the args; preserve exact format string for the NUL-delimited fields):

```
git log --pretty=format:"%H%x00%aI%x00%aN%x00%B%x00END" --numstat -- .
```

Parse output line-by-line. State machine:
- Header line shape: `<sha>NUL<authorISO>NUL<authorName>NUL<commitBody>...NULEND`
  - Note: `%B` (commit body) can contain newlines AND the literal `END` marker if a commit message includes that word; use the `%x00END\n` as the delimiter sequence (NUL + "END" + newline) — collisions are vanishingly rare and the parse is tolerant.
- Subsequent `--numstat` lines: `<added>\t<removed>\t<path>` until the next commit header.

For each commit, capture:
- **For `linesByAuthor`:**
  - Primary author = the `%aN` value. Sum `linesAdded`/`linesRemoved` from numstat. Increment `commits`.
  - Co-authors = parse `%B` body with `/^Co-[Aa]uthored-[Bb]y:\s*(.+?)\s*<.+?>/gm`. For each co-author trailer:
    - Add full `linesAdded`/`linesRemoved` for the commit (ADDITIVE attribution — per locked decision).
    - Increment `coAuthoredCommits` (NOT `commits` — co-authored ≠ primary).
- **For `timeline`:**
  - Bucket by date: `dateISO.slice(0, 10)` (YYYY-MM-DD). Increment count per day.
  - Track running max of `linesAdded + linesRemoved` per commit → `largestSingleCommit = { sha, dateISO, linesAdded, linesRemoved }`. **No `messageFirstLine` — dropped from schema; commit subjects can leak paths.**

Post-pass:
- `linesByAuthor`: sort desc by `linesAdded + linesRemoved` (total churn contribution).
- `timeline.commitsByDay`: sort asc by date.
- `timeline.activeDays = commitsByDay.length`.
- `timeline.peakDay`: pick max by count, ties broken by latest date.
- `timeline.largestSingleCommit`: as accumulated; null if no commits.

**Preserve the existing rename-tracking regex** at line 137 (`/^(.*)\{(.*) => (.*)\}(.*)$/`) — apply to the numstat path field. The existing `uniqueFilesTouched` calculation in the OLD numstat pass at lines 122-145 still needs to run separately (it's keyed differently and reuses the existing block). Don't delete it; the merged pass is ADDITIVE to it.

**Pattern to follow:**
- Map-tally + sort-desc-by-metric tail at `git-stats.ts:106-119` (`commitsByAuthor`).
- Try/catch graceful-degradation pattern at every `git()` call.

**Verify:**
```
pnpm dev -- C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.git | {linesByAuthor: .linesByAuthor[0:3], timeline: {activeDays, peakDay, largestSingleCommit}}'
```
Expected:
- `linesByAuthor[0]` is Claude OR Briggsy (BURNED has both). Each entry has all 5 fields populated.
- `coAuthoredCommits` on the Claude entry is > 0 (most BURNED commits trail `Co-Authored-By: Claude...`).
- `timeline.activeDays` ≥ 30 (BURNED has been active ~50 days).
- `timeline.peakDay` non-null. Date in ISO YYYY-MM-DD shape.
- `timeline.largestSingleCommit.sha` is a 40-char hex. `linesAdded + linesRemoved` ≥ 1000 (the trailer-pipeline scaffold commits are large).

**Tests:** REQUIRED. New file: `tools/claude-credit/src/git-stats.test.ts`. Minimum:

1. `parseCoAuthorTrailers(body)` correctness — fixture commit bodies with 0, 1, 2 co-authors; case variants (`Co-authored-by` / `co-Authored-By`); malformed trailer (no email). Pure function, no git required.
2. End-to-end fixture: vitest `beforeAll` creates a tmp directory, runs `git init`, makes 3 commits (one with co-author, one without, one with two co-authors), then `collectGitStats(tmpDir)` returns the expected `linesByAuthor` shape with the additive attribution rule visible.
3. `timeline.peakDay` correctness — fixture with two commits on day A, one on day B → peakDay is day A.

**Pattern to mirror for fixture creation:** `execFileAsync('git', ['init', ...], { cwd: tmpDir })` from `git-stats.ts:55`. Use `os.tmpdir()` + `fs.mkdtemp` for scratch dirs.

**Commit:** `feat(claude-credit): linesByAuthor + timeline (Co-Authored-By aware)`

## 0.5b — `tokens` block (session-tokens parser)

**Files:**
- NEW: `tools/claude-credit/src/session-tokens.ts`
- NEW: `tools/claude-credit/src/session-tokens.test.ts`
- `tools/claude-credit/src/report.ts` (call + attach)
- `tools/claude-credit/src/multi-report.ts` (aggregate to combined)

This is the highest-risk unit in Phase 0. Privacy by construction. Worktree + subdir slug merging. Window-bounded floor. Honest dual-token numbers.

### Honesty constraint (load-bearing)

Claude Code session JSONLs rotate after ~30 days (non-atomic, file-level, not directory-level). Any tally is a **window-bounded FLOOR**, never lifetime. UI MUST surface the window: *"N tokens · across X days of session retention (sessions older than ~30 days are pruned by Claude Code)"* — never "lifetime."

`windowDays = floor((max(timestamp) - min(timestamp)) / 86_400_000)`. If a single message exists, `windowDays = 0` and UI shows "< 1 day". If `windowDays > 45`, log a warning (`stderr`) that rotation hasn't fired as expected — display the real number, don't cap. Rotation behavior is the truth; never invent a 30-day display cap that hides what's on disk.

### File-header JSDoc (required, copy verbatim)

```ts
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
 * extraction step.
 *
 * The downstream stats.json published to a public deploy goes through an
 * allowlist snapshot test (src/__tests__/stats-shape.test.ts) — adding a new
 * field requires updating the snapshot. CI fails otherwise.
 */
```

### Slug derivation

```ts
function projectPathToSessionSlug(absPath: string): string {
  return absPath
    .replace(/\\/g, '/')
    .replace(/:/g, '-')
    .replace(/\//g, '-')
    .replace(/^-+/, '');
}
// C:/Users/brigg/ai-learning-journey/projects/burned →
// C--Users-brigg-ai-learning-journey-projects-burned
```

### Slug matching — longest-prefix-match-wins (critical)

The naïve approach `slug.startsWith(parentSlug)` false-matches `data-engineering-atc` against `data-engineering`. Use this rule:

1. Build the set of all configured parent slugs from `MultiProjectConfig.{projects, meta, archive}[].path`.
2. Sort the parent slugs **descending by length** — longest-prefix-match-wins.
3. Enumerate `~/.claude/projects/`. For each on-disk slug, assign to the FIRST parent that matches via:
   - **Exact match**: `slug === parent`
   - **Worktree match**: `slug.startsWith(parent + '--claude-worktrees-')`
   - **Subdir match**: `slug.startsWith(parent + '-') && !slug.startsWith(parent + '--')`

   (The `-` vs `--` distinction matters: `--` is the worktree separator OR the multi-segment subdir; either way the parent prefix has to be followed by a separator, not just any character.)

4. Slugs that match NO configured parent are **orphans**. They are NOT merged into any project. They are NOT counted in the public `archiveCollective`. They surface only in CLI stderr as a warning: `claude-credit: 3 orphan session slugs (data-engineering-foo, ...). Add the project to ~/.claude-credit-projects.yaml to count them.`

Why longest-first: if `data-engineering-other` is later added as its own project, its slug `...-data-engineering-other` wins the match before `data-engineering` could subsume it. The sort makes this automatic.

### JSONL walk + pick-list filter

For each `.jsonl` in matched directories: read line by line. For each line:

1. Parse JSON. On `SyntaxError` → increment `parseHealth.lineParseErrors`, skip line.
2. Filter: `line.type === 'assistant'`. (NOT `message.role` — `type` is the top-level discriminator. Other line types like `last-prompt`, `attachment`, `file-history-snapshot` etc. are skipped here and never accessed beyond `.type`.)
3. Pick-list extract: ONLY the 7 fields listed in the header JSDoc. Never retain the raw `line`. Never read any other key.
4. If any of the four `usage` integers is missing or non-numeric → record line as "seen" (for `sessionCount` increment) but contribute 0 tokens. Increment `parseHealth.usageShapeWarnings`.

### Sidechain handling (confirmed at deepening)

Sidechain records are interleaved into the parent session's JSONL as lines with `isSidechain: true`. NO separate file enumeration is required. The same pick-list parser handles them. Track `sidechainTokens` as a subset of `tokensProcessed` for the detail-page footnote ("of which X% from subagent invocations").

### Window computation

Across ALL extracted assistant lines for the project (including merged worktree/subdir slugs):
- `windowStartISO = min(line.timestamp)` → ISO string of the earliest message
- `windowEndISO = max(line.timestamp)` → ISO string of the latest
- `windowDays = floor((Date.parse(max) - Date.parse(min)) / 86_400_000)` → integer days; 0 if only one message

### Token aggregates

Per-project:
- `inputTokens = Σ input_tokens`
- `outputTokens = Σ output_tokens`
- `cacheCreationInputTokens = Σ cache_creation_input_tokens`
- `cacheReadInputTokens = Σ cache_read_input_tokens`
- `tokensProcessed = input + output + cacheCreation + cacheRead`
- `tokensGenerated = input + output + cacheCreation` (NO cache reads — those are cheap re-feeds)
- `sidechainTokens = Σ (tokensProcessed contribution from lines where sidechain === true)`

### Model name normalization

Map known IDs:
- `claude-opus-4-7` → `Opus 4.7`
- `claude-opus-4-6` → `Opus 4.6`
- `claude-sonnet-4-6` → `Sonnet 4.6`
- `claude-sonnet-4-5` → `Sonnet 4.5`
- `claude-haiku-4-5-20251001` → `Haiku 4.5`

Unknown / future IDs pass through as-is (raw string). Per-model `tokensProcessed` per the same allowlist rule (no caching or other fields).

### Function shape (NEVER throws)

```ts
// Pseudocode — the function returns a result object, never propagates exceptions.
export async function collectSessionTokens(
  projectPath: string,
  opts: { homeDir?: string; configuredParentSlugs?: string[] } = {}
): Promise<TokenStats | null>;
```

- If `~/.claude/projects/` doesn't exist → return `null` (graceful for CI / clean machines).
- If no matched slug directories → return `null`.
- File-level I/O errors → increment `parseHealth.fileReadErrors`, skip file.
- Per-line errors → increment `parseHealth.lineParseErrors` / `usageShapeWarnings`, skip line.
- ALL token integers are guaranteed numeric (never NaN, never null) by the per-line clamp `Number(value) || 0`.

### Wire-up

In `report.ts` line 40 `Promise.all([collectGitStats(...), collectProxyStats(...)])` → add `collectSessionTokens(rootDir, { homeDir: opts.homeDir })`. Attach the result to the return object.

Plumb `homeDir` through `BuildReportOptions` so tests can inject a stub. Existing `buildMultiProjectReport` already accepts `homeDir` (`multi-report.ts:9, 64, 69`); pass it through to `buildProjectReport`.

In `multi-report.ts` lines 99-127 aggregation loop → extend with:
- `combined.totalTokensProcessed += p.tokens?.tokensProcessed ?? 0` (null-skip)
- `combined.totalTokensGenerated += p.tokens?.tokensGenerated ?? 0`
- `combined.totalSessions += p.tokens?.sessionCount ?? 0`
- `combined.tokenWindowStartISO = min(..., p.tokens?.windowStartISO)` (null-skip; lexical min works on ISO strings)
- `combined.tokenWindowEndISO = max(...)` similarly
- `combined.tokenWindowDays = floor((Date.parse(end) - Date.parse(start)) / 86_400_000)` if both non-null
- `combined.modelBreakdown` = merge per-model arrays (group by `model`, sum `sessions` + `tokensProcessed`)

### Verify

```
pnpm dev -- C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.tokens | {windowDays, sessionCount, sidechainTokens, tokensProcessed, tokensGenerated, byModel: .byModel[0:3], parseHealth}'
```
Expected on BURNED:
- `windowDays` between 5 and 45 (recent activity, within rotation).
- `sessionCount > 5` (BURNED is heavily worked).
- `tokensProcessed > 100_000_000` (BURNED is 100M+ tokens — magnitude shock target).
- `tokensProcessed > tokensGenerated` (cache reads are a large fraction).
- `byModel[0].model` is `"Opus 4.7"` (normalized, NOT `"claude-opus-4-7"`).
- `parseHealth.lineParseErrors` is small (single-digit; some early-rotation lines may be truncated).

Multi-project verify:
```
pnpm dev -- --all --json | jq '.combined | {totalTokensProcessed, totalTokensGenerated, totalSessions, tokenWindowDays, modelBreakdown: .modelBreakdown[0:3]}'
```

### Tests — REQUIRED

`src/session-tokens.test.ts` minimum coverage:

1. **Pick-list assertion.** Pass a fixture line containing all PII-bearing fields (`cwd`, `gitBranch`, `lastPrompt`, `attachment`, `aiTitle`, `toolUseResult`, `snapshot`, `message.content`). Assert the parser's extracted object has EXACTLY the 7 documented keys — no others. This is the structural enforcement of the privacy comment.

2. **Slug merge — worktree.** Fixture `~/.claude/projects/` (under `os.tmpdir()`) with `parent` and `parent--claude-worktrees-foo-hash` slugs. Each has one JSONL with 1 assistant message at 100 tokens. `collectSessionTokens` returns `tokensProcessed: 200` and `sessionCount: 2`.

3. **Slug merge — subdir.** Fixture with `parent` and `parent-atc` slugs (single-dash separator) AND `parent-other` configured as its own project. Assert: `parent-atc` merges into `parent`; `parent-other` claims its own slug; no false cross-merge. (Reproduces the `data-engineering` / `data-engineering-atc` / hypothetical `data-engineering-other` scenario.)

4. **Window computation.** Fixture with 3 messages timestamped 5 days apart. `windowDays === 10`. Single-message fixture: `windowDays === 0`.

5. **Sidechain accounting.** Fixture line with `isSidechain: true` contributes to `sidechainTokens` AND `tokensProcessed`.

6. **Token aggregate math.** Fixture line with `input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 50, cache_read_input_tokens: 1000`. Assert `tokensProcessed === 1350`, `tokensGenerated === 350`.

7. **Model normalization.** Fixture lines with `claude-opus-4-7` and an unknown model `claude-future-7-0`. Assert byModel entries have `"Opus 4.7"` and `"claude-future-7-0"` respectively.

8. **Graceful malformed.** Fixture file with one truncated final line, one `JSON.parse` error, one missing `message.usage`. Assert no throw; `parseHealth` counters are incremented appropriately.

9. **No `~/.claude/projects/`.** Pass a `homeDir` pointing to an empty tmp dir. Assert return is `null`.

### Commit

`feat(claude-credit): session-tokens parser with privacy-by-construction + slug merging`

## 0.6 — Editorial config schema

**Files:** `tools/claude-credit/src/taxonomy.ts` (Batch A already added `EditorialContent`), `tools/claude-credit/src/config.ts`, `tools/claude-credit/src/report.ts`.

### Extend `ProjectConfig`

In `config.ts` `ProjectConfig` interface (lines 7-34), add:

```ts
editorial?: {
  oneLiner: string;
  hookStat: { label: string; value: string };
  heroImage?: string | null;
  liveUrl?: string | null;
  repoUrl?: string | null;
  status?: 'active' | 'meta';  // defaults to 'active'
  description: string;
  gallery?: string[];
};
```

The field is OPTIONAL on the config; absence means "no editorial block" → `report.editorial = null`.

### Add inline validator

Local helper in `config.ts` (NOT a separate module — co-author parser pattern: keep it where it's used):

```ts
// Pseudocode — validates required fields, defaults optional ones.
function validateEditorial(raw: unknown): EditorialContent | null {
  if (!raw || typeof raw !== 'object') return null;
  // Require: oneLiner (string), hookStat ({label, value}), description (string).
  // If any required missing or wrong type → return null + push warning to caller.
  // Default: status → 'active'; heroImage/liveUrl/repoUrl → null; gallery → [].
}
```

Where to push warnings: `loadProjectConfig` doesn't currently produce warnings — they belong in `report.warnings` so `report.ts` should handle it. Either:
- (a) Have `validateEditorial` return `{ value: EditorialContent | null, warnings: string[] }` and `report.ts` push them, OR
- (b) Log via stderr at validate time.

**Pick (a).** Keeps warnings in the report JSON consumers can read.

### heroImage existence check

After validation, in `report.ts` after the editorial pull:
```ts
if (editorial?.heroImage) {
  // Resolve path: heroImage is project-root-relative.
  const abs = path.join(rootDir, editorial.heroImage);
  if (!(await fs.stat(abs).catch(() => null))) {
    warnings.push(`editorial.heroImage path does not exist: ${editorial.heroImage}`);
    editorial.heroImage = null;  // null-discipline: file missing → field is null
  }
}
```

### Wire-up

`report.ts` reads `config.editorial` after `loadProjectConfig` at line 19, runs the validator, attaches to the return object as `editorial: EditorialContent | null`.

### Verify

Author a minimal `editorial:` block in `projects/burned/claude-credit.config.yaml` (the existing config) for the test:
```yaml
editorial:
  oneLiner: "Couch-of-friends spy comedy"
  hookStat: { label: "TESTS", value: "167" }
  heroImage: docs/screenshots/hero.png
  status: active
  description: |
    Real-time browser card game for 2–10 players.
```

Then:
```
pnpm dev -- C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.editorial'
```
Expected: the typed editorial block returned. `heroImage` is null (the path `docs/screenshots/hero.png` doesn't yet exist — heroImage existence check fires + warning is pushed to `warnings[]`). All other fields populated.

NOTE: don't COMMIT the editorial block to BURNED's config as part of Phase 0 — that's preflight −1.5's authored worksheet work. The verify-step block is a local experiment; revert before the §0.6 commit.

### Tests

Deferred. The YAML loading is mechanical and the §0.10 fixture monorepo test covers both presence + absence paths.

### Commit

`feat(claude-credit): editorial config schema (per-project)`

## 0.6b — Multi-project config parser extension (LOCKED amendment)

**Files:** `tools/claude-credit/src/taxonomy.ts` (Batch A added `ArchiveCollective`), `tools/claude-credit/src/config.ts`, `tools/claude-credit/src/multi-report.ts`.

### Extend `MultiProjectConfig`

In `config.ts` (line 36-43):

```ts
export interface MultiProjectConfig {
  projects: Array<{ path: string; name?: string }>;
  meta?: Array<{ path: string; name?: string }>;       // NEW
  archive?: Array<{ path: string; name?: string }>;    // NEW
}
```

`loadMultiProjectConfig` already handles `.yaml` / `.yml` / `.json` via the `CANDIDATES` pattern at line 83. No code changes needed there — the YAML loader just returns the new keys.

### Extend `buildMultiProjectReport`

In `multi-report.ts`:

1. After `const { config } = await loadMultiProjectConfig(homeDir)` at line 80, also extract:
   ```ts
   const metaPaths = (config?.meta ?? []).map(p => expandHome(p.path, homeDir));
   const archivePaths = (config?.archive ?? []).map(p => expandHome(p.path, homeDir));
   ```

2. Loop through `metaPaths` the same way as `projectPaths` — build a `ProjectReport` per path, set `kind: 'meta'`. Push to a new `meta: ProjectReport[]` array.

3. Loop through `archivePaths` — build a `ProjectReport` per path BUT do NOT push to either array. Instead, accumulate into `archiveCollective`:
   ```ts
   archiveCollective = {
     projectNames: [...],         // basename per path
     projectCount: archivePaths.length,
     totalAuthoredFiles: Σ p.grandTotals.authoredFiles,
     totalAuthoredBytes: Σ ...,
     totalAuthoredLines: Σ ...,
     totalPipelineGeneratedFiles: Σ ...,
     totalPipelineGeneratedBytes: Σ ...,
     totalAllBytes: Σ ...,
     totalCommits: Σ p.git.totalCommits,
     totalTokensProcessed: Σ p.tokens?.tokensProcessed ?? 0,
     totalTokensGenerated: Σ p.tokens?.tokensGenerated ?? 0,
     totalSessions: Σ p.tokens?.sessionCount ?? 0,
   };
   // null if archivePaths is empty
   ```

4. Extend `combined` accumulation to include `meta[]` + `archiveCollective` per the aggregation invariant:
   ```ts
   combined.totalAuthoredLines = sum(projects[].X) + sum(meta[].X) + (archiveCollective?.totalAuthoredLines ?? 0)
   // same for every X in the invariant
   ```

5. Set `kind: 'active'` on every `ProjectReport` built from `projectPaths`. Set `kind: 'meta'` on every one built from `metaPaths`. Archive projects never produce `ProjectReport` records — they only contribute to `archiveCollective`.

### Backward compatibility

A `.claude-credit-projects.yaml` with ONLY `projects:` (the pre-preflight shape) must continue to work:
- `config?.meta ?? []` → empty array → `meta: ProjectReport[]` is `[]`
- `config?.archive ?? []` → empty array → `archiveCollective` stays null
- `combined.totalX` is identical to v0.1.x output, augmented with the new token + archive fields (zero-valued when no archive)
- The existing `projects[]` array is unchanged in shape and semantics

### Verify

```
pnpm dev -- --all --json | jq '{projectsCount: .projects | length, metaCount: .meta | length, archiveCollective: .archiveCollective, combined: {totalSessions, totalTokensProcessed}}'
```
Expected after preflight −1.2 lands its YAML edit:
- `projectsCount`: 9
- `metaCount`: 2 (claude-credit + claude-credits)
- `archiveCollective.projectCount`: 6 (the misses)
- `archiveCollective.projectNames`: array of 6 names

### Tests — REQUIRED (light)

`src/config.test.ts` minimum:
1. **Existing-shape compat.** Load a fixture YAML with ONLY `projects:`. Assert `meta` and `archive` are absent or empty.
2. **New-shape parse.** Load a fixture YAML with all three keys. Assert each is parsed into its typed array.
3. **Backward compat in multi-report.** Build a fake multi-report against (1) — assert `meta = []`, `archiveCollective = null`, `combined.totalSessions === 0`.

### Commit

`feat(claude-credit): multi-project config supports meta + archive keys + ArchiveCollective rollup`

## 0.7 — Version bump + omnibus verify (~5 min)

**Files:** `tools/claude-credit/package.json`, OPTIONAL: `tools/claude-credit/CHANGELOG.md` (create if absent).

1. Bump `package.json` version `0.1.0` → `0.2.0`.
2. If a CHANGELOG.md doesn't exist, create one with a single `## 0.2.0 — 2026-05-24` section that lists the additive changes from Batch A + each implementation unit. Pattern: `feat: …`, `feat: …`, no full prose.
3. `pnpm install` (no-op locally but updates the lockfile timestamp if needed).
4. `pnpm build` — verify clean exit, dist/ regenerated.
5. `pnpm typecheck` — clean exit.
6. **Omnibus verify** — runs the now-published binary (the `claude-credit` global command), confirming dist/ is the version under test:
   ```
   claude-credit C:/Users/brigg/ai-learning-journey/projects/burned --json \
     | jq '.git | {firstCommitISO, lastCommitISO, projectAgeDays}, .git.linesByAuthor[0], .git.timeline | {activeDays, peakDay, largestSingleCommit}, .assetBytesByKind, .topSubcategories[0:2], .tokens | {windowDays, sessionCount, tokensProcessed, tokensGenerated, byModel: .byModel[0]}, .editorial, .kind'
   ```
   All sub-paths must return non-null where expected (Per BURNED ground truth: editorial may be null until preflight −1.5 authors the worksheet block).

7. Multi verify:
   ```
   claude-credit --all --json | jq '{projects: .projects | length, meta: .meta | length, archive: .archiveCollective.projectCount, combined: .combined | {totalTokensProcessed, totalSessions, tokenWindowDays, modelBreakdown: .modelBreakdown}}'
   ```
   Expected after preflight cascade: `projects: 9, meta: 2, archive: 6`.

### Commit

`chore(claude-credit): bump to 0.2.0 + CHANGELOG`. Tag is OPTIONAL (Briggsy's repo workflow doesn't currently tag — defer).

## 0.8 — Surface new fields in `format/markdown.ts` and `format/terminal.ts` (HARD requirement)

**Files:** `tools/claude-credit/src/format/markdown.ts`, `tools/claude-credit/src/format/terminal.ts`.

The original plan tagged §0.8 as "not blocking for site work but keeps the tool consistent." The deepening **promotes it to a hard requirement**: the CLI's terminal + markdown output are the contract users see when running `claude-credit` standalone. If the CLI doesn't surface the new fields, users get a misleading minimal report while the site shows the rich data. The two outputs MUST stay in sync.

### Surface in markdown — minimum additions

In `renderProjectMarkdown` (markdown.ts:33):
- New "Tempo" subsection under Git: render `firstCommitISO`, `lastCommitISO`, `projectAgeDays`, `timeline.activeDays`, `timeline.peakDay`, `timeline.largestSingleCommit` (all null-aware — em-dash for null).
- New "Authored By" table: render top 5 entries from `linesByAuthor` with author / commits / coAuthoredCommits / linesAdded / linesRemoved.
- New "Tokens" subsection (skip if `tokens === null`): render `tokensProcessed`, `tokensGenerated`, `sessionCount`, `windowStartISO → windowEndISO (windowDays days)`, top 3 entries from `byModel`. **Always include the window footnote** — never quote without it.
- New "Assets" table: render `assetBytesByKind` (5 rows: images/audio/video/fonts/misc-media).
- New "Top subcategories" table: render `topSubcategories` (5 rows: tier / category / subcategory / files / lines / bytes).
- Header line: if `editorial?.oneLiner` is set, prepend it as a `> <oneLiner>` blockquote.
- `kind: 'meta'` projects get a `(tools)` suffix on the title.

In `renderMultiProjectMarkdown` (markdown.ts:101):
- "Grand totals across all projects" — add a token line: `**X tokens processed** · **Y tokens generated** · Z sessions across N days of retention`.
- New "By model" table at top: model / sessions / tokens (from `combined.modelBreakdown`).
- "Per-project" table — add a `Kind` column (active/meta) AND a `Tokens` column (`tokensProcessed` or em-dash).
- If `archiveCollective !== null`: add a final "Archive collective" subsection with the rolled-up totals + the project-names list.

### Surface in terminal — same shape, terminal kleur

Mirror the markdown additions in `terminal.ts` using `kleur.*` styling consistent with the existing palette (gray for labels, cyan for callouts, yellow for warnings).

### Null discipline reminder

`null` values render as `—` (em-dash). `0` values render as `0`. NEVER coerce null to zero.

### Verify

```
claude-credit C:/Users/brigg/ai-learning-journey/projects/burned --markdown | head -80
claude-credit --all --markdown | head -100
```
Eyeball check: every new field appears, null values are em-dashed, the window footnote is present.

### Tests

Deferred. Markdown rendering is content-presentation; the §0.10 schema test asserts the data is shaped correctly upstream, and visual review covers the rendering. Snapshot-testing rendered markdown is high-churn for low value.

### Commit

`feat(claude-credit): surface Phase 0 fields in markdown + terminal renderers`

## 0.9 — REMOVED (cascade-amendment marker)

The original §0.9 ("Multi-project config plumbing — add the two meta-projects to `~/.claude-credit-projects.yaml`") has been MOVED into preflight −1.2. The YAML edit happens there. Leaving §0.9 in place would re-write the YAML and silently clobber the new `meta:` / `archive:` keys that preflight wrote.

The slot is preserved as this one-paragraph marker so the deepening-drift audit (per `feedback-deepening-drift-anti-pattern.md`) catches any future reintroduction. Don't delete the section header; don't fold the numbering. Future audits grep for `0.9 — REMOVED` to confirm the cascade landed.

## 0.10 — Test fixture monorepo + integration tests (NEW)

**Files:** `tools/claude-credit/test/fixtures/multi-fixture/` (NEW directory tree), `tools/claude-credit/src/__tests__/multi-report.test.ts` (NEW), `tools/claude-credit/src/__tests__/stats-shape.test.ts` (NEW).

Lights up the previously-unused vitest harness with five integration tests that gate Phase 0 done. All five must pass on `pnpm test` before the §0.7 version bump.

### Fixture tree

```
tools/claude-credit/test/fixtures/multi-fixture/
  .claude-credit-projects.yaml    # 3 active + 1 meta + 2 archive entries
  active-a/
    claude-credit.config.yaml     # has full editorial block
    README.md
    src/index.ts
    public/assets/images/hero.png
    .git/                          # initialized via vitest beforeAll
  active-b/                        # no editorial block
    README.md
    .git/
  active-c/                        # no git history (not a repo)
    README.md
  meta-a/                          # CLI-style meta project
    bin/foo.mjs
    README.md
    .git/
  archive-a/
    README.md
    .git/
  archive-b/
    README.md
    .git/
  claude-projects-stub/            # injected as homeDir override
    C--<active-a-slug>/
      session-1.jsonl              # 3 assistant messages, 1 sidechain
    C--<active-a-slug>--claude-worktrees-test-abc/
      session-2.jsonl              # 1 assistant message
    C--<active-b-slug>/
      empty.jsonl                  # 0 lines
    orphan-slug/                   # not in config — orphan policy test
      stranded.jsonl
```

### Tests

1. **JSON schema validation** (`src/__tests__/multi-report.test.ts`). Run `buildMultiProjectReport({ homeDir: fixture-claude-projects, projectPaths: [...fixture-paths] })`. Validate the resulting JSON against a hand-written Zod schema (NEW file: `src/__tests__/schema.ts`) that mirrors every interface in `taxonomy.ts`. Asserts presence of all new fields + null-discipline (active-b has no editorial → `editorial: null`).

2. **Aggregation invariant** (same file). Assert:
   ```
   combined.totalAuthoredLines === sum(projects[].grandTotals.authoredLines)
                                 + sum(meta[].grandTotals.authoredLines)
                                 + (archiveCollective?.totalAuthoredLines ?? 0)
   ```
   Same for each X in the invariant. Run on the fixture with all three kinds populated.

3. **Privacy round-trip** (same file). Build the report, run a stand-in stripper (mirrors what Phase 2 §2.1's `scripts/refresh-stats.ts` will eventually do): deep-walk + delete every `projectPath` key. Assert no `projectPath` survives anywhere in the tree, no `messageFirstLine` exists (schema-level), no string value matches the grep-guard patterns (`C:\\`, `/Users/`, `brigg`, etc.).

4. **Session-tokens fixture** (same file). Already tested in `session-tokens.test.ts` (per §0.5b) — this integration test asserts the merged behavior through `buildMultiProjectReport`: `combined.totalSessions === 4` (3 from active-a primary + 1 from active-a worktree + 0 from active-b empty), orphan slug NOT in `combined.totalSessions`, orphan-slug warning IS in stderr (capture via Vitest spy on `process.stderr.write`).

5. **Stats-shape snapshot** (`src/__tests__/stats-shape.test.ts`). Build the report. JSON-serialize. Deep-walk the parsed JSON, collect every unique key path (e.g., `projects[].git.firstCommitISO`, `combined.modelBreakdown[].model`). Snapshot-compare against `__snapshots__/stats-shape.snap`. **Adding a new top-level field requires updating the snapshot — CI fails otherwise.** This is the structural enforcement of the privacy "allowlist for public publishing."

### Pattern to follow

- Vitest `beforeAll` for fixture setup: `execFileAsync('git', ['init', ...], { cwd: fixture })` for each `.git/` directory + commit a small initial file (mirror the pattern from §0.4's tests). Use `os.tmpdir()` if fixture state would otherwise persist between runs.
- `homeDir` override via `buildMultiProjectReport({ homeDir })`. Already supported (multi-report.ts:9, 64, 69).
- Hand-written Zod schema (NOT ts-json-schema-generator runtime dep) — keeps `tools/claude-credit/` dep-light.

### Verify

```
cd C:/Users/brigg/ai-learning-journey/tools/claude-credit
pnpm test
```
Expected: 5 integration tests pass + the unit tests from §0.4 / §0.5b / §0.6b. Total non-zero test count (currently 0).

### Commit

`feat(claude-credit): test fixture monorepo + 5 integration tests + stats-shape snapshot`

---

## System-Wide Impact

### Interaction graph — consumers of `ProjectReport` / `MultiProjectReport`

| Consumer | Path | Must accommodate (new) |
|---|---|---|
| `renderProjectMarkdown` | `tools/claude-credit/src/format/markdown.ts:33` | All six field groups + `kind` (per §0.8) |
| `renderMultiProjectMarkdown` | `tools/claude-credit/src/format/markdown.ts:101` | `combined` token aggregates + `archiveCollective` summary row + `kind` column |
| `renderProjectTerminal` | `tools/claude-credit/src/format/terminal.ts` | Same as markdown project renderer (§0.8) |
| `renderMultiProjectTerminal` | `tools/claude-credit/src/format/terminal.ts` | Same as markdown multi renderer (§0.8) |
| `cli.ts` JSON output | `tools/claude-credit/src/cli.ts:114-115, 131-132` | Automatic — `JSON.stringify(report)` passthrough |
| `projects/claude-credits/` site (Phase 1+) | per `phase-2-data-wiring.md` | All new field groups + `kind` + `archiveCollective`. Deprecates reads of `git.commitsByAuthor` in favor of `linesByAuthor` for the AUTHORED BY block. |

### Error propagation — null discipline

The Null discipline section above is the rule. Specifically:
- `tokens === null` → AUTHORED BY block drops the tokens column (not "—"); TOKENS CONSUMED block omitted entirely from the detail page; hero PRIMARY falls back to `combined.totalAuthoredLines` with a footnote change.
- `editorial === null` → tile renders in "degraded" mode (project name + grandTotals only); no one-liner, no hookStat, no live-link button.
- `git.firstCommitISO === null` → suppress age ribbon and "Tempo" section in the detail page.

### Aggregation invariant

Written as a comment above `MultiProjectReport` in `taxonomy.ts`. §0.10 test (2) enforces. Any future change to the aggregation loop must keep this true.

### API surface parity / semver

- Phase 0 lands `0.2.0` (minor). Justification: every change is **additive**. `MultiProjectReport.projects[]` continues to contain the same shape, just augmented with new optional fields + `kind: 'active'` default. New top-level keys (`meta`, `archiveCollective`) are additive. Existing `combined` keys keep current semantics.
- CHANGELOG.md entry (created in §0.7) documents the additive changes + the backward-compat guarantee.
- Future change that DEPRECATES `commitsByAuthor` (in favor of `linesByAuthor`) would be `1.0.0`. Not in Phase 0 scope.

### Privacy stripping — cross-cutting

`messageFirstLine` was DROPPED from the schema (per Decisions section). This eliminates a privacy-stripping concern entirely — no commit-message-text leaks possible.

Other new fields are public-safe:
- `git.linesByAuthor[].author` — names are already public on GitHub commits.
- `tokens.byModel[].model` — model IDs are public.
- `editorial.heroImage` — project-relative path. The Phase 2 §2.2 rewrite step converts to `/assets/<projectName>/<basename>` before publishing.
- `editorial.liveUrl` / `repoUrl` — author-supplied public URLs.
- `archiveCollective.projectNames` — basenames only (no paths).

`projectPath` is still stripped from every `ProjectReport` in `projects[]` AND `meta[]` (existing rule, applies to the expanded shape).

### Integration coverage — fixture-based

§0.10's five tests gate Phase 0 done. They run BEFORE the site exists. CI green = data contract is reliable for Phase 1 to consume.

### Unchanged invariants — the don't-touch list

Phase 0 preserves these guarantees:

1. **All CLI flags keep current behavior.** `--all`, `--json`, `--markdown` / `--md`, `--include-ignored`, `-h` / `--help` (cli.ts:35-60).
2. **All existing `GitStats` fields keep current semantics.** `totalCommits`, `commitsByAuthor`, `lifetimeLinesAdded/Removed`, `uniqueFilesTouched`, `commitMessageLines`, `discardedAssetFiles`/`Events`/`ByKind`, `assetModificationEvents`, `assetUniquePathsTouched`.
3. **All existing `ProjectReport` fields keep current shape.** `projectPath`, `projectName`, `scannedAt`, `tiers`, `git`, `proxies`, `grandTotals`, `warnings`.
4. **All existing `MultiProjectReport.combined` fields stay.** 13 current keys; new keys are added.
5. **Existing markdown rendering produces a parseable document when new fields are null.** Phase 0 §0.8 surface-the-fields work guards with null-checks, never assumes presence.
6. **`.claude-credit-projects.yaml` with ONLY `projects:` continues to load cleanly.** No errors, no warnings.
7. **`generationLogs` field on `ProjectConfig` stays for v2** (config.ts:27-33). Don't repurpose.
8. **Existing test baseline (currently 0) stays additive.** Phase 0 lights up vitest with new tests; no deletions.

---

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **Half-landed taxonomy types break `tsc`** (every consumer file fails to compile) | Batch A lands ALL `taxonomy.ts` + `emptyStats()` edits in one commit before any consumer touches the new types. Temporary `as ProjectReport` cast in `report.ts:75` if Batch A's missing-property errors block local-dev (removed unit by unit). |
| **POSIX-ism in `git log ... \| head -1`** on Windows | Use `--max-count=1` directly. No shell pipe. Caught at deepening. |
| **`git log --pretty=format:"…END" -- .` body parsing collides with `END` in commit messages** | Use the NUL+"END"+newline sequence as the delimiter. Collisions are vanishingly rare; the parse is tolerant (un-recognized fragments skipped). |
| **Rename-tracking regression in merged 0.4+0.5 pass** | The existing `/^(.*)\{(.*) => (.*)\}(.*)$/` regex at git-stats.ts:137 must be preserved in the merged pass for `uniqueFilesTouched` integrity. Test 4 in §0.10 covers. |
| **Session-tokens parser reads PII fields by accident** | Structural pick-list at parser entry + snapshot test asserting 7-key output + file-header JSDoc + pre-publish grep-guard in Phase 8. Four-layer defense. |
| **Subdir-slug false-merge** (`data-engineering` ↔ `data-engineering-atc`) | Longest-prefix-match-wins sort + `slug.startsWith(parent + '-') && !slug.startsWith(parent + '--')` separator rule. Test 3 in §0.5b explicitly covers a hypothetical `data-engineering-other` config to catch regressions. |
| **Worktree slug split** (BURNED worktree session tokens orphan) | `^<parent>--claude-worktrees-` match. Confirmed on disk at deepening (real worktree slug exists). Test 2 in §0.5b. |
| **Window-bounded floor misread as lifetime** | UI mandates "across N days of session retention" footnote on every token surface. Honesty signal. Plan §0.5b honesty constraint is load-bearing. |
| **`tokensProcessed` vs `tokensGenerated` confusion in downstream phases** | Both fields ship; both names are unambiguous. Hero PRIMARY uses `tokensProcessed` (per spec); detail page shows both with breakdown. No single ambiguous `totalTokens` field exists. |
| **`messageFirstLine` path leak** | Field DROPPED from schema. Eliminated at source. |
| **Public stats.json grows new keys without snapshot update** | §0.10 stats-shape snapshot test fails CI on any new key. Adding a field is a deliberate snapshot update + reviewer pass. |
| **Backward-compat break for `projects:`-only configs** | Empty-default in `multi-report.ts` (`config?.meta ?? []`, `config?.archive ?? []`). §0.10 test (3) explicitly loads a pre-preflight YAML and asserts `meta = []` + `archiveCollective = null`. |
| **Empty / malformed JSONL crashes the parser** | Function-level wrapper returns `{ stats, errors }`; never throws. Per-line try/catch increments `parseHealth` counters. Test 8 in §0.5b. |
| **`pnpm dev` vs `pnpm build` confusion between units** | Use `pnpm dev` (`tsx src/cli.ts`) for per-unit probes — no `dist/` rebuild. Reserve `pnpm build` for §0.7 omnibus + final binary verify. |
| **`vitest` harness unused for the first time** | §0.10 sets up the fixture infrastructure; subsequent units add tests with the harness already proven green. |

---

## Cascade to downstream phase plans

The deepening locks decisions that affect later phases. Apply these amendments when each phase is deepened or executed (whichever comes first). Land them as a separate commit before the affected phase executes: `docs(claude-credits): cascade Phase 0 decisions to phase-1/2/3/4/5/8 plans`.

### `phase-1-scaffold.md`

- **No structural change required** — Phase 1 scaffolds the Vite + TS site shell with no data dependencies. Pass-through.

### `phase-2-data-wiring.md`

- **ADD: `refresh-stats.ts` must mutate `report.meta[*].editorial.heroImage` in addition to `report.projects[*].editorial.heroImage`.** Both arrays carry editorial blocks now (Phase 0 §0.6). The path-rewrite step must walk both.
- **ADD: `refresh-stats.ts` must NOT strip from `archiveCollective`** — that block has no `projectPath` and no editorial. Walk projects/meta only.
- **UPDATE the type imports:** Phase 2 imports `MultiProjectReport`, `ProjectReport`, `TokenStats`, `EditorialContent`, `ArchiveCollective` from `tools/claude-credit/dist/taxonomy`. The list of imports should be updated.
- **ADD pre-publish grep-guard** to the GitHub Action (the Phase 8 deploy plan also references this). The guard runs on `stats.json` content and refuses commit on path / username / secret-keyword / non-allowlisted UUID matches.

### `phase-3-hero.md`

- **LOCK: Hero PRIMARY = `combined.totalTokensProcessed`** (per Decisions section in this Phase 0 deepening). NOT `combined.totalTokens` — that field doesn't exist.
- **LOCK: Hero subtitle = window footnote, hardcoded honesty per `combined.tokenWindowDays`** — `"X tokens · across N days of session retention"`. Never display without the window.
- **ADD: tooltip / footnote breakdown** showing `tokensProcessed` decomposition (`output + fresh input + cache reads`). Lets curious readers see why the number is large.
- **LIKELY: secondary stat = `combined.totalAuthoredLines`** (lines authored, secondary supporting line per ideation §2).

### `phase-4-grid.md`

- **LOCK: grid splits on `ProjectReport.kind`.** "Active" tiles (`kind === 'active'`) sorted by `grandTotals.allBytes` desc, then a divider labeled "the tools", then "Meta" tiles (`kind === 'meta'`), then a divider labeled "the misses", then the single `archiveCollective` tile in last position.
- **LOCK: archive collective tile reads from `report.archiveCollective`** (not from any `ProjectReport`). Subtitle composed from `archiveCollective.projectCount` + `totalAuthoredLines` + `totalTokensProcessed` per the preflight −1.5 spec.
- **TILE always-last rule for archive collective** — does NOT sort by bytes; ALWAYS last position regardless of size.

### `phase-5-detail.md`

- **ADD: "View source →" affordance** reads from `editorial.repoUrl` (preflight cascade requirement, restated here for Phase 0 → Phase 5 chain).
- **ADD: detail page handles `tokens === null` gracefully** — AUTHORED BY drops the tokens column; TOKENS CONSUMED section is omitted from the page (not rendered as "0 tokens"). Per null discipline.
- **ADD: TOKENS CONSUMED block** displays `tokensProcessed` (primary), `tokensGenerated` (secondary), `sessionCount`, `windowStartISO → windowEndISO (windowDays)`, per-model breakdown from `byModel`, sidechain footnote `"X% from subagent invocations"` if `sidechainTokens > 0`.
- **ADD: `Archive.tsx` detail page** at route `/archive` — renders 6 archive project names + Briggsy-authored one-liners (content authored in preflight −1.5).

### `phase-8-deploy.md`

- **ADD pre-publish grep-guard** to the GitHub Action workflow (`refresh-claude-credits.yml`). The guard runs on `public/data/stats.json` content before the `git commit` step. Match patterns enumerated in this plan's Privacy by Construction section.

### Verification — apply this AFTER landing the cascade commit

```
# Phase 0 deepening landed: 0.6b present, 0.9 marked REMOVED, status enum is 2-value, kind discriminator present
grep -nE "0.6b|0.9 — REMOVED|'active' \\| 'meta'|kind: 'active' \\| 'meta'|tokensProcessed|tokensGenerated" \
  projects/claude-credits/docs/plans/phase-0-data-gaps.md

# Phase 2: heroImage rewrite walks meta[], grep-guard mentioned
grep -nE "meta\\[\\]|grep-guard|archiveCollective" projects/claude-credits/docs/plans/phase-2-data-wiring.md

# Phase 3: hero locked to tokensProcessed, window footnote
grep -nE "tokensProcessed|tokenWindowDays|window footnote" projects/claude-credits/docs/plans/phase-3-hero.md

# Phase 4: kind discriminator + archive collective in last position
grep -nE "kind: 'active'|kind: 'meta'|archiveCollective|always last" projects/claude-credits/docs/plans/phase-4-grid.md

# Phase 5: null tokens graceful + TOKENS CONSUMED block + Archive.tsx
grep -nE "tokens === null|TOKENS CONSUMED|Archive\\.tsx|sidechainTokens" projects/claude-credits/docs/plans/phase-5-detail.md

# Phase 8: grep-guard step
grep -nE "grep-guard|refuse to commit" projects/claude-credits/docs/plans/phase-8-deploy.md
```

---

## Phase 0 → Phase 1 handoff

When every checklist item below is green AND the cascade-amendment commit has landed:

- [ ] Batch A taxonomy.ts edits landed, `pnpm typecheck` clean
- [ ] §0.1 firstCommit/lastCommit/projectAgeDays → fields populated on BURNED verify
- [ ] §0.2 assetBytesByKind → 5 keys, integer-valued, never null
- [ ] §0.3 topSubcategories → length 5, sorted desc by bytes
- [ ] §0.4+0.5 (merged) linesByAuthor + timeline → Claude + Briggsy both visible, peakDay non-null, largestSingleCommit sha is 40-char hex (NO messageFirstLine), git-stats.test.ts tests green
- [ ] §0.5b session-tokens → tokensProcessed > 100M on BURNED, byModel shows normalized names, sidechainTokens populated, parseHealth all single-digit, session-tokens.test.ts 9 tests green
- [ ] §0.6 editorial → validator works, missing heroImage → null + warning, status enum is 2-value (`active` | `meta`)
- [ ] §0.6b multi-config parser → `meta:` + `archive:` keys parsed, ArchiveCollective rolled up, `kind` discriminator on every ProjectReport, config.test.ts tests green
- [ ] §0.7 version 0.2.0 + CHANGELOG.md + omnibus verify green
- [ ] §0.8 markdown + terminal renderers surface every new field, null-discipline holds
- [ ] §0.9 → REMOVED marker preserved
- [ ] §0.10 fixture monorepo + 5 integration tests green (schema validation + aggregation invariant + privacy round-trip + session-tokens fixture + stats-shape snapshot)
- [ ] Cascade commit to phase-2/3/4/5/8 landed (one commit, message format matches preflight cascade)

Then open [phase-1-scaffold.md](phase-1-scaffold.md) and start.

---

← [Phase −1 — Pre-flight](phase-preflight.md) | [Index](README.md) | Next → [Phase 1 — Scaffold](phase-1-scaffold.md)
