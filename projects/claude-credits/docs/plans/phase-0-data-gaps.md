---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T12:43:38-04:00
doc-reviewed: 2026-05-24T13:11:43-04:00
---

# Phase 0 — Data contract (`tools/claude-credit/`)

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is the paint-by-numbers recipe for the data contract Phase 1+ renders against.

Phase 0 lands the full data contract for the site: six new data field groups in the CLI's report shape, the multi-project config parser extension, the CLI surface parity to render the new fields (§0.8), the test harness bootstrap with fixture-based integration tests (§0.10), and the privacy-by-construction enforcement (shared `strip-for-publish.ts` + allowlist test). The phase name was "Fill data gaps" pre-doc-review — renamed at doc-review time because the scope is the full contract, not just field-adds. None of this is visual work; it's the data spine. The site renders nothing meaningful until these land.

## Locked decisions inherited from Phase −1 preflight cascade

Apply these throughout — they are NOT optional:

1. **§0.9 REMOVED.** The `~/.claude-credit-projects.yaml` edit moved into preflight −1.2. Leaving §0.9 in place would re-write the YAML and silently clobber the new `meta:` / `archive:` keys preflight just wrote. The slot is preserved as a one-line marker so the deepening-drift audit catches any reintroduction.
2. **§0.6b ADDED.** Parser extension to `loadMultiProjectConfig` + `buildMultiProjectReport` so the CLI recognizes THREE top-level config keys: `projects:`, `meta:`, `archive:`. `archive[*]` entries scan + contribute to `combined.totalX`, but emit ONE rolled-up `archiveCollective` block, not individual `ProjectReport` entries.
3. **§0.6 `EditorialContent.status` enum — KEPT AT THREE VALUES** (`'active' | 'shelved' | 'meta'`). The preflight cascade originally reduced this to two values on the rationale "the archive collective is a separate surface, not an `EditorialContent` row." Doc-review reopened the decision on 2026-05-24 because that reduction silently foreclosed per-archive detail pages — ideation §6 explicitly commits to "Detail pages explain what was tried." Restoring the third value keeps the contract open; Phase 4 still ships the archive-collective grid tile as the v1 choice, but Phase 5 deepening can later add per-archive detail pages without a v0.3 schema migration. **This overrides one of the four preflight-cascade locks at doc-review time.**
4. **`ProjectReport.kind: 'active' | 'meta'` discriminator added.** So the site (Phase 4 grid) can split the rendering into "active" tiles + "the tools" tiles cleanly. Archive entries never appear in `projects[]` — they live ONLY in `archiveCollective`.

## Decisions locked at this deepening (read before executing)

- **Execution order: three batches.** Batch A lands every `taxonomy.ts` edit in ONE commit before any consumer touches the new types. The `GitStats` and `ProjectReport` interfaces are non-optional today (every field required); half-landed types fail `tsc -p .` on every consumer file. Batch B runs implementations 0.1 → 0.6b in order. Batch C runs the markdown surface (0.8), the test fixture pass (0.10), and the version bump (0.7) last.
- **§0.4 + §0.5 are merged.** The original plan said "bucket the already-collected commit data by day" — but `collectGitStats` runs SEPARATE `git log` passes per metric; there is no shared in-memory commit list. Merging into a single `git log --pretty=format:"%H%x00%aI%x00%aN%x00%B%x00END" --numstat -- .` pass cuts subprocess time in half and lets `largestSingleCommit` reuse the numstat data `linesByAuthor` already reads.
- **Token field naming is split. Hero displays BOTH numbers side-by-side** (decision locked 2026-05-24 at doc-review). The original plan's single `totalTokens` field summed all four buckets (input + output + cacheCreation + cacheRead). That number is dominated by cache reads (5–20× the rest in real traffic) — fine as a magnitude shock but misleading as a "work done" measure. Ship BOTH numbers under unambiguous names AND surface both in the hero:
  - `tokensProcessed = input + output + cacheCreation + cacheRead` — the magnitude (tokens the model touched, including re-feeds).
  - `tokensFresh = input + output + cacheCreation` — the honest "work done" signal (excludes cache re-feeds). Named `tokensFresh` (not `tokensGenerated`) because the model didn't "generate" cacheCreation tokens — they're input bytes billed with a cache premium.
  - **Hero treatment**: both numbers displayed together — e.g., *"1.2B tokens processed · 240M fresh · across 22 days of session retention"*. Magnitude + honesty in the same glance. No "primary" / "secondary" hierarchy; they read as a pair. This pre-empts the "wow Claude built this with juiced numbers" failure mode the AI-peer audience would otherwise diagnose on sight.
- **`largestSingleCommit.messageFirstLine` is DROPPED from the schema.** Commit subjects can contain `C:\Users\...`, `/Users/...`, `~`-paths, internal slugs, `@mentions`, or accidentally-pasted secrets. The "+4,200-line commit on Apr 22" story works with `sha + dateISO + linesAdded + linesRemoved` alone. Removing the field eliminates a whole class of public-data leak vectors AND simplifies the privacy-stripping discipline.
- **Privacy by construction is STRUCTURAL, not documentary.** The session-tokens parser uses a pick-list pattern — the parsed object has exactly **seven** keys (timestamp, isSidechain, model + the four `usage` integers), constructed as an EXPLICIT object literal (no `{...rest}` destructuring), and the parent `line` object is never retained by reference. A `Pick<T, K>` TypeScript pattern + a `satisfies ParsedAssistantLine` assertion enforce the shape at compile time. An assertion-based allowlist test (not a text snapshot) compares the published JSON's full key-path set against a hand-coded frozen list. A pre-publish grep-guard in the GitHub Action refuses to commit `public/data/stats.json` if it contains forbidden path / username / secret patterns (see Privacy by Construction section for the full enumeration).
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
  tokensFresh: number;  // input + output + cacheCreation — work signal (excludes cheap re-feeds)

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
  status: 'active' | 'shelved' | 'meta';  // 3-value: shelved kept open for per-archive detail pages
  description: string;
  gallery: string[];
  largestCommitCaption?: string;  // optional Briggsy-authored caption rendered next to largestSingleCommit
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
  totalTokensFresh: number;
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
    totalTokensFresh: number;
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

**A.6 — land minimal consumer-side casts inside Batch A so typecheck is GREEN at the end.** This avoids a half-landed state where "the type frame compiled" is ambiguous against "all consumers broke." Concretely, inside the SAME Batch A commit:

- In `report.ts` line 75 (the `return { … }` block of `buildProjectReport`), add the five new ProjectReport fields with placeholder values that satisfy the new types: `assetBytesByKind: { images: 0, audio: 0, video: 0, fonts: 0, 'misc-media': 0 }`, `topSubcategories: []`, `tokens: null`, `editorial: null`, `kind: 'active' as const`. Add a `// TODO(0.2 / 0.3 / 0.5b / 0.6): replace placeholder` comment above each so each Batch B unit knows which placeholder it replaces.
- In `multi-report.ts` line 131 (the `return { report: { … } }` block of `buildMultiProjectReport`), add the new top-level fields with placeholder values: `meta: []`, `archiveCollective: null`, and extend `combined` with `totalTokensProcessed: 0`, `totalTokensFresh: 0`, `totalSessions: 0`, `tokenWindowStartISO: null`, `tokenWindowEndISO: null`, `tokenWindowDays: null`, `modelBreakdown: []`. Each gets the same `// TODO(0.5b / 0.6b): replace placeholder` marker.

**A.7 — verify Batch A compiles green:** `cd C:/Users/brigg/ai-learning-journey/tools/claude-credit && pnpm typecheck`. Expected outcome: **clean exit** — every new type is satisfied by a placeholder. Each Batch B unit then REPLACES its placeholder with the real implementation; the `pnpm typecheck` gate stays binary green across the whole phase. This trades a slightly larger Batch A commit for a binary signal at every subsequent step.

**Batch A commit point:** `chore(claude-credit): add Phase 0 type frame to taxonomy.ts + consumer placeholders`. Single commit, no Batch B logic yet — just type frame + the minimum consumer-side wiring needed to keep tsc green.

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

**Pick-list pattern at the parser entry.** The parser MUST extract exactly these seven fields, by name, into a fresh object — constructed as an EXPLICIT object literal. The parent `line` object is never retained, summed against, destructured-with-rest, or compared structurally.

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

// REQUIRED construction form (typed return + satisfies):
function parseLine(line: unknown): ParsedAssistantLine | null {
  // ... validation ...
  return {
    ts: l.timestamp,
    sidechain: l.isSidechain === true,
    model: String(l.message.model ?? 'unknown'),
    input: Number(l.message.usage.input_tokens) || 0,
    output: Number(l.message.usage.output_tokens) || 0,
    cacheCreate: Number(l.message.usage.cache_creation_input_tokens) || 0,
    cacheRead: Number(l.message.usage.cache_read_input_tokens) || 0,
  } satisfies ParsedAssistantLine;
}
```

**FORBIDDEN patterns** (the test below catches the output shape, not the construction; this prose binds the construction):
- `const { ts, ..., ...rest } = parsed` — destructuring-with-rest creates a referenceable variable carrying every other field. NEVER use.
- `console.error(line)` / `throw new Error(JSON.stringify(line))` in any catch path — never serialize the raw line, even in error paths. Log only the line number + a generic error class.
- Storing `line` in a closure (e.g., for a deferred warning callback) — never. Errors are surfaced via the counter pattern, not referenced.

The 0.5b unit test asserts that `Object.keys(parseLine(realFixture)).sort()` is exactly `['cacheCreate', 'cacheRead', 'input', 'model', 'output', 'sidechain', 'ts']` AND that the parser file does not contain the regex `/\.\.\.rest/` or `JSON\.stringify\(line/` (grep-based source-code linting in the test).

**Stats.json allowlist — assertion-based, not text-snapshot.** `public/data/stats.json` ships only fields in the allowlist defined in §0.10 — a hand-coded `const ALLOWED_KEY_PATHS: readonly string[]` (e.g., `'combined.totalTokensProcessed'`, `'projects[].tokens.tokensProcessed'`, `'projects[].git.firstCommitISO'`, etc.). The test deep-walks the parsed JSON, collects every unique key-path, asserts `extractedKeys ⊆ ALLOWED_KEY_PATHS`. Adding a new field requires adding a line to `ALLOWED_KEY_PATHS` — a deliberate, reviewable edit. (Why not a text snapshot: snapshots are one CLI flag away from being blessed without review; an explicit array makes "what's allowed" an enumerable code surface.)

**Pre-publish grep-guard** (GitHub Action — Phase 8). Refuse to commit `public/data/stats.json` if any STRING VALUE in the parsed JSON matches any of:
- `C:\\` (Windows backslash absolute path)
- `C:/` (Windows forward-slash absolute path — Node normalizes here often)
- `/Users/` (POSIX home path)
- `\\Users\\` (Windows mixed-form path fragment)
- `AppData` (Windows local user data path fragment)
- `brigg` (username substring; matches `briggsy` too)
- `node_modules` (paths from accidental stack traces)
- `/private/` or `\\private\\` (path-scoped — does NOT match a project named `private-foo`)
- `secret`, `password`
- email pattern: `/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i`
- Windows drive-letter slug pattern: `/^[A-Za-z]--[A-Za-z]/` (catches things like `c--Development-Projects-...`)
- UUID-shaped strings (`/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i`) outside the model-name allowlist (the allowlist is a fixed list of known model IDs like `claude-opus-4-7`)

Scope: the guard reads `JSON.parse(stats.json)`, deep-walks, and checks ONLY string-valued leaves — never field NAMES. This is critical: a field named `tokenWindowStartISO` is fine; a string value `"sk-ant-..."` is not. The `token` substring is therefore NOT in the bad-list because it would false-trigger on every model name and the `TOKENS CONSUMED` UI label that may legitimately appear in editorial copy. The `secret` / `password` bad-list members ARE in scope as substrings — false positives are vanishingly rare in stats data and the conservative bias is correct here.

**parseHealth shape — counters only, never strings.** `parseHealth.{lineParseErrors, usageShapeWarnings, fileReadErrors}` are integer counts. The parser MUST NEVER push a string error message into anything that lands in the published JSON. Error strings live in stderr only. Structural rule: any field that ends up in `stats.json` is either a number, an ISO timestamp string, an author-controlled editorial string, a normalized model name, or `null`. No free-text error strings.

---

## Aggregation invariants (LOCKED — write as comments above `MultiProjectReport`)

Two invariants, because `grandTotals` and `tokens` live on different sub-objects with different shapes:

**INVARIANT A — grandTotals aggregation (sum-class):**
```
combined.totalX = Σ(projects[].grandTotals.X ?? 0)
                + Σ(meta[].grandTotals.X ?? 0)
                + (archiveCollective?.totalX ?? 0)
where X ∈ {
  AuthoredFiles, AuthoredBytes, AuthoredLines,
  PipelineGeneratedFiles, PipelineGeneratedBytes,
  AllBytes, Commits
}
```

**INVARIANT B — token aggregation (sum-class, separate shape, null-safe):**
```
combined.totalTokensProcessed = Σ(projects[].tokens?.tokensProcessed ?? 0)
                              + Σ(meta[].tokens?.tokensProcessed ?? 0)
                              + (archiveCollective?.totalTokensProcessed ?? 0)
combined.totalTokensFresh = Σ(projects[].tokens?.tokensFresh ?? 0)
                              + Σ(meta[].tokens?.tokensFresh ?? 0)
                              + (archiveCollective?.totalTokensFresh ?? 0)
combined.totalSessions        = Σ(projects[].tokens?.sessionCount ?? 0)
                              + Σ(meta[].tokens?.sessionCount ?? 0)
                              + (archiveCollective?.totalSessions ?? 0)
```

**INVARIANT C — token window (NOT sum-class, min/max across non-null):**
```
combined.tokenWindowStartISO = min(p.tokens.windowStartISO for p in projects[]+meta[]
                                    where p.tokens !== null)
                                ?? null if no project has tokens
combined.tokenWindowEndISO   = max(...) similarly
combined.tokenWindowDays     = floor((Date.parse(end) - Date.parse(start)) / 86_400_000)
                                if both bounds non-null, else null
```

Archive entries are NEVER present in `projects[]` or `meta[]`. `archiveCollective` is `null` when no `archive:` entries are configured — every invariant treats null `archiveCollective` as the zero-element contribution. Null per-project `tokens` is similarly the zero-element contribution. The §0.10 fixture-based test enforces all three invariants explicitly (one fixture with archive populated, one without; one project with `tokens: null` mixed with projects with token data).

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
pnpm dev C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.git | {firstCommitISO, lastCommitISO, projectAgeDays}'
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
pnpm dev C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.assetBytesByKind'
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
pnpm dev C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.topSubcategories | {len: length, top: .[0]}'
```
Expected: `len = 5`, `top.bytes` is the largest subcategory by bytes (on BURNED, likely `pipeline-generated/assets/images` or `pipeline-generated/assets/video`).

**Tests:** deferred. Trivially observable in JSON.

**Commit:** `feat(claude-credit): topSubcategories pre-computed`

## 0.4 + 0.5 (merged) — `linesByAuthor` + `timeline` (~60 min — co-author parser + state machine + 3 unit tests)

**File:** `tools/claude-credit/src/git-stats.ts`

**Single `git log` pass** (one subprocess instead of two) produces both blocks. Existing helper `git()` + `withScope()` apply.

Command shape — use `git log -z` for unambiguous NUL-delimited ENTRIES (no fragile END marker):

```
git log -z --pretty=format:"%H%x00%aI%x00%aN%x00%B" --numstat -- .
```

`-z` means commit entries are delimited by NUL bytes at the BOUNDARY, not by newlines/literals. The `--numstat` block for each commit follows the commit header (NUL-separated path field within numstat lines). This eliminates the entire class of `END` collisions (commit messages legitimately containing the word END, code fences, etc.).

Parse output by splitting on the **commit boundary NUL** (the `\0` AFTER the numstat block; under `-z`, git emits `<commit_header>\0<numstat_block>\0\0`). State machine:
- Header field shape (after split): `<sha>\0<authorISO>\0<authorName>\0<commitBody>`
- Numstat lines: `<added>\t<removed>\t<path>` (one per file). For binary files git emits `-\t-\t<path>` — these contribute 0 to `linesAdded` / `linesRemoved` but DO count toward `uniqueFilesTouched`.

For each commit, capture:
- **For `linesByAuthor`:**
  - Primary author = the `%aN` value. Sum `linesAdded`/`linesRemoved` from numstat. Increment `commits`.
  - Co-authors = parse `%B` body with `/^Co-[Aa]uthored-[Bb]y:\s*(.+?)\s*<.+?>/gm`. For each co-author trailer:
    - Add full `linesAdded`/`linesRemoved` for the commit (ADDITIVE attribution — per locked decision).
    - Increment `coAuthoredCommits` (NOT `commits` — co-authored ≠ primary).
- **For `timeline`:**
  - Bucket by date: `dateISO.slice(0, 10)` (YYYY-MM-DD). Increment count per day.
  - Track running max of `linesAdded + linesRemoved` per commit → `largestSingleCommit = { sha, dateISO, linesAdded, linesRemoved }`. **No `messageFirstLine` — dropped from schema; commit subjects can leak paths.**
  - **Binary-only commits** (where all numstat lines are `-\t-\t<path>`) contribute `linesAdded: 0, linesRemoved: 0` and are INELIGIBLE for `largestSingleCommit` — `0 + 0 = 0` never beats a running max > 0.
  - **Tiebreaker rule**: when two commits tie on `linesAdded + linesRemoved`, the LATER `dateISO` wins.
  - **No-text-churn fallback**: if every commit has `linesAdded + linesRemoved === 0` (a pure-binary project), `largestSingleCommit` stays `null`. UI per null discipline shows em-dash.

Post-pass:
- `linesByAuthor`: sort desc by `linesAdded + linesRemoved` (total churn contribution).
- `timeline.commitsByDay`: sort asc by date.
- `timeline.activeDays = commitsByDay.length`.
- `timeline.peakDay`: pick max by count, ties broken by latest date.
- `timeline.largestSingleCommit`: as accumulated per the rules above; null if no commit has any text churn.

**Preserve the existing rename-tracking regex** at line 137 (`/^(.*)\{(.*) => (.*)\}(.*)$/`) — apply to the numstat path field. The existing `uniqueFilesTouched` calculation in the OLD numstat pass at lines 122-145 still needs to run separately (it's keyed differently and reuses the existing block). Don't delete it; the merged pass is ADDITIVE to it.

**Pattern to follow:**
- Map-tally + sort-desc-by-metric tail at `git-stats.ts:106-119` (`commitsByAuthor`).
- Try/catch graceful-degradation pattern at every `git()` call.

**Verify:**
```
pnpm dev C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.git | {linesByAuthor: .linesByAuthor[0:3], timeline: {activeDays, peakDay, largestSingleCommit}}'
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

**Pattern to mirror for fixture creation — REQUIRED env-var setup** (without this, tests fail in CI with `git commit` complaining "Please tell me who you are" AND timeline tests are flaky because commit timestamps are nondeterministic):

```ts
// In test/helpers/git-fixture.ts — shared by every git-touching test
const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-git-'));
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test Author',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test Author',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  // Per-commit dates injected per-call via GIT_AUTHOR_DATE + GIT_COMMITTER_DATE
};
await execFileAsync('git', ['init', '-b', 'main'], { cwd: tmpDir, env: gitEnv });
// For each commit:
await fs.writeFile(path.join(tmpDir, 'f.txt'), content);
await execFileAsync('git', ['add', 'f.txt'], { cwd: tmpDir, env: gitEnv });
await execFileAsync(
  'git', ['commit', '-m', message],
  { cwd: tmpDir, env: { ...gitEnv, GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate } }
);
```

Use `git init -b main` (not `git init` alone) — git 2.28+ otherwise prompts on default-branch-name. Use `os.tmpdir()` + `fs.mkdtemp` for scratch dirs; vitest cleans up via `afterAll` (`fs.rm(tmpDir, { recursive: true, force: true })`).

**Commit:** `feat(claude-credit): linesByAuthor + timeline (Co-Authored-By aware)`

## 0.5b — `tokens` block (session-tokens parser) (~2-3 hours — 9 unit tests + fixture infra + state machine)

**Files:**
- NEW: `tools/claude-credit/src/session-tokens.ts`
- NEW: `tools/claude-credit/src/session-tokens.test.ts`
- NEW: `tools/claude-credit/src/strip-for-publish.ts` (shared with Phase 2 — see Privacy section)
- `tools/claude-credit/src/report.ts` (call + attach)
- `tools/claude-credit/src/multi-report.ts` (aggregate to combined + orphan-slug collection)

This is the highest-risk unit in Phase 0. Privacy by construction. Worktree + subdir slug merging (including case-insensitive matching). Window-bounded floor. Honest dual-token numbers.

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
 * assertion-based allowlist test (src/__tests__/stats-shape.test.ts) that
 * compares the JSON's key-paths against a hand-coded ALLOWED_KEY_PATHS array
 * exported from src/strip-for-publish.ts. Adding a new field requires adding
 * a line to that array — CI fails otherwise.
 */
```

### Slug derivation

```ts
function projectPathToSessionSlug(absPath: string): string {
  // Normalize FIRST (collapses .., resolves to canonical form) before slugifying.
  // Without this, a path containing .. produces a slug with .. that doesn't match
  // the canonical parent's slug.
  const normalized = path.resolve(absPath);
  return normalized
    .replace(/\\/g, '/')
    .replace(/:/g, '-')
    .replace(/\//g, '-')
    .replace(/^-+/, '');
}
// C:/Users/brigg/ai-learning-journey/projects/burned →
// C--Users-brigg-ai-learning-journey-projects-burned
```

### Slug matching — case-insensitive, longest-prefix-match-wins (critical)

The naïve approach `slug.startsWith(parentSlug)` false-matches `data-engineering-atc` against `data-engineering`. Additionally, Claude Code historically emitted MIXED-CASE drive-letter slugs (`c--Development-...` AND `C--Users-...` both exist on disk at deepening time). All comparisons MUST be case-insensitive. Use this rule:

1. Build the set of all configured parent slugs from `MultiProjectConfig.{projects, meta, archive}[].path`. Compute each parent slug via `projectPathToSessionSlug` and normalize to LOWERCASE for matching.
2. Sort parent slugs **descending by length** — longest-prefix-match-wins.
3. Enumerate `~/.claude/projects/`. For each on-disk slug, lowercase it and assign to the FIRST parent that matches via:
   - **Exact match**: `slugLower === parentLower`
   - **Worktree match**: `slugLower.startsWith(parentLower + '--claude-worktrees-')`
   - **Subdir match**: `slugLower.startsWith(parentLower + '-') && !slugLower.startsWith(parentLower + '--')`

   (The `-` vs `--` distinction matters: `--` is the worktree separator OR the multi-segment subdir; either way the parent prefix has to be followed by a separator, not just any character. Anything matching `parent + '--<something other than claude-worktrees->'` falls through to orphan.)

   **Nested worktrees** (e.g., a worktree-of-worktree like `parent--claude-worktrees-foo--claude-worktrees-bar`) match the worktree rule on the outermost `--claude-worktrees-` separator and merge into the canonical parent. All worktree-derived activity counts as parent activity.

4. Slugs that match NO configured parent are **orphans**. They are NOT merged into any project. They are NOT counted in the public `archiveCollective` or `combined`. The parser returns the orphan slugs to the caller (NOT via stderr — see the function shape section below) so `buildMultiProjectReport` can surface a single aggregated warning at the end. Orphan slug NAMES are NEVER published to `stats.json` (they contain path fragments — PII).

Why longest-first: if `data-engineering-other` is later added as its own project, its slug wins the match before `data-engineering` could subsume it. The sort makes this automatic.

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
- `tokensFresh = input + output + cacheCreation` (NO cache reads — those are cheap re-feeds)
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
// Pseudocode — both per-project and multi-project collectors return result objects.
// Orphan-slug surfacing flows through return values, NOT stderr writes inside the parser.

export async function collectSessionTokens(
  projectPath: string,
  opts: { homeDir?: string; configuredParentSlugs?: string[] } = {}
): Promise<{ stats: TokenStats | null; matchedSlugs: string[] }>;

// At the multi-project layer (in multi-report.ts), the caller:
//  1. Calls collectSessionTokens for each configured project, accumulating matchedSlugs.
//  2. Diffs against all on-disk slugs in ~/.claude/projects/.
//  3. Computes orphanSlugs = onDisk - matched.
//  4. Returns orphanSlugs as part of the multi-report result.
//  5. cli.ts emits a single aggregated stderr warning if orphanSlugs.length > 0.
// This shape is testable as a pure function via the return value — no Vitest spy on
// process.stderr.write is needed.
```

- If `~/.claude/projects/` doesn't exist → return `{ stats: null, matchedSlugs: [] }` (graceful for CI / clean machines).
- If no matched slug directories for this project → `stats: null, matchedSlugs: []`.
- File-level I/O errors → increment `parseHealth.fileReadErrors`, skip file, continue.
- Per-line errors → increment `parseHealth.lineParseErrors` / `usageShapeWarnings`, skip line, continue.
- ALL token integers are guaranteed numeric (never NaN, never null) by the per-line clamp `Number(value) || 0`.

**Active-session race condition (documented behavior).** If a Claude Code session is actively writing a JSONL while `claude-credit` reads it, `fs.readFile` returns the OS-snapshot of bytes at read-time. The final line may be partially flushed → catches as a `lineParseErrors` and is dropped. This produces a single-line tail-undercount per active session per run. The next `claude-credit --all` after the session settles catches up. Acceptable for the personal-site use case; documented here so future Claude doesn't chase a phantom bug when `parseHealth.lineParseErrors > 0` correlates with sessions Briggsy was in mid-stream.

### Wire-up

In `report.ts` line 40 `Promise.all([collectGitStats(...), collectProxyStats(...)])` → add `collectSessionTokens(rootDir, { homeDir: opts.homeDir })`. Attach the result to the return object.

Plumb `homeDir` through `BuildReportOptions` so tests can inject a stub. Existing `buildMultiProjectReport` already accepts `homeDir` (`multi-report.ts:9, 64, 69`); pass it through to `buildProjectReport`.

In `multi-report.ts` lines 99-127 aggregation loop → extend with:
- `combined.totalTokensProcessed += p.tokens?.tokensProcessed ?? 0` (null-skip)
- `combined.totalTokensFresh += p.tokens?.tokensFresh ?? 0`
- `combined.totalSessions += p.tokens?.sessionCount ?? 0`
- `combined.tokenWindowStartISO = min(..., p.tokens?.windowStartISO)` (null-skip; lexical min works on ISO strings)
- `combined.tokenWindowEndISO = max(...)` similarly
- `combined.tokenWindowDays = floor((Date.parse(end) - Date.parse(start)) / 86_400_000)` if both non-null
- `combined.modelBreakdown` = merge per-model arrays (group by `model`, sum `sessions` + `tokensProcessed`)

### Verify

```
pnpm dev C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.tokens | {windowDays, sessionCount, sidechainTokens, tokensProcessed, tokensFresh, byModel: .byModel[0:3], parseHealth}'
```
Expected on BURNED:
- `windowDays` between 5 and 45 (recent activity, within rotation).
- `sessionCount > 5` (BURNED is heavily worked).
- `tokensProcessed > 100_000_000` (BURNED is 100M+ tokens — magnitude shock target).
- `tokensProcessed > tokensFresh` (cache reads are a large fraction).
- `byModel[0].model` is `"Opus 4.7"` (normalized, NOT `"claude-opus-4-7"`).
- `parseHealth.lineParseErrors` is small (single-digit; some early-rotation lines may be truncated).

Multi-project verify:
```
pnpm dev --all --json | jq '.combined | {totalTokensProcessed, totalTokensFresh, totalSessions, tokenWindowDays, modelBreakdown: .modelBreakdown[0:3]}'
```

**Note on `pnpm dev` arg passthrough (verified 2026-05-24):** pnpm 10.30.3 no longer strips the `--` separator for npm-script pass-through — it forwards `--` to the script literally, which `parseArgs` in `cli.ts` would log as `Warning: unknown flag "--" ignored`. The verify probes above use the bare form `pnpm dev <args>` which works cleanly because pnpm forwards positional args without a separator. If a future pnpm version changes this, fall back to `npx tsx src/cli.ts <args>` from the package directory.

### Tests — REQUIRED

`src/session-tokens.test.ts` minimum coverage:

1. **Pick-list assertion + construction-form linting.** Pass a fixture line containing all PII-bearing fields (`cwd`, `gitBranch`, `lastPrompt`, `attachment`, `aiTitle`, `toolUseResult`, `snapshot`, `message.content`). Assert `Object.keys(parseLine(realFixture)).sort()` is EXACTLY `['cacheCreate', 'cacheRead', 'input', 'model', 'output', 'sidechain', 'ts']`. AND grep-lint the file source: `fs.readFile('src/session-tokens.ts', 'utf8')` must NOT contain `/\.\.\.[a-zA-Z]+\s*}/` (destructure-rest pattern) or `JSON\.stringify\(line\)` (raw-line serialization).

2. **Slug merge — worktree.** Fixture `~/.claude/projects/` (under `os.tmpdir()`) with `parent` and `parent--claude-worktrees-foo-hash` slugs. Each has one JSONL with 1 assistant message at 100 tokens. `collectSessionTokens` returns `tokensProcessed: 200` and `sessionCount: 2`.

3. **Slug merge — subdir + longest-prefix priority.** Fixture with `parent` and `parent-atc` slugs (single-dash separator) AND `parent-other` configured as its own project. Assert: `parent-atc` merges into `parent`; `parent-other` claims its own slug; no false cross-merge. (Reproduces the `data-engineering` / `data-engineering-atc` / hypothetical `data-engineering-other` scenario.)

4. **Slug merge — case-insensitive.** Fixture with `C--Users-test-foo` configured but on-disk slug is `c--Users-test-foo` (lowercase drive letter). Assert: merges successfully. (Reproduces the real-disk pattern where `c--Development-...` and `C--Users-...` slugs coexist.)

5. **Slug merge — nested worktree.** Fixture with `parent` configured and on-disk slug `parent--claude-worktrees-foo--claude-worktrees-bar`. Assert: merges into `parent`.

6. **Window computation.** Fixture with 3 messages timestamped 5 days apart. `windowDays === 10`. Single-message fixture: `windowDays === 0`.

7. **Sidechain accounting.** Fixture line with `isSidechain: true` contributes to `sidechainTokens` AND `tokensProcessed`.

8. **Token aggregate math.** Fixture line with `input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 50, cache_read_input_tokens: 1000`. Assert `tokensProcessed === 1350`, `tokensFresh === 350`.

9. **Model normalization.** Fixture lines with `claude-opus-4-7` and an unknown model `claude-future-7-0`. Assert byModel entries have `"Opus 4.7"` and `"claude-future-7-0"` respectively.

10. **Graceful malformed.** Fixture file with one truncated final line, one `JSON.parse` error, one missing `message.usage`. Assert no throw; `parseHealth` counters are incremented appropriately.

11. **No `~/.claude/projects/`.** Pass a `homeDir` pointing to an empty tmp dir. Assert return is `{ stats: null, matchedSlugs: [] }`.

12. **Orphan slug return.** Fixture `homeDir` with an on-disk slug `c--Users-test-unconfigured` that doesn't match any configured parent. Assert: at the multi-report layer (test orchestrates a `buildMultiProjectReport` against this fixture), `result.orphanSlugs` contains the slug name, AND `stats.json`-stripped output does NOT contain the slug name anywhere.

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
  status?: 'active' | 'shelved' | 'meta';  // defaults to 'active'
  description: string;
  gallery?: string[];
  largestCommitCaption?: string;  // optional storytelling caption (see §0.6 details)
};
```

The field is OPTIONAL on the config; absence means "no editorial block" → `report.editorial = null`.

### Add inline validator

Local helper in `config.ts` (NOT a separate module — co-author parser pattern: keep it where it's used):

```ts
// Pseudocode — validates required fields, defaults optional ones,
// AND rejects absolute paths in heroImage (which would leak into the public warnings array).
function validateEditorial(raw: unknown): { value: EditorialContent | null; warnings: string[] } {
  if (!raw || typeof raw !== 'object') return { value: null, warnings: [] };
  // Require: oneLiner (string), hookStat ({label, value}), description (string).
  // If any required missing or wrong type → return { value: null, warnings: [...] }.
  // Default: status → 'active'; heroImage/liveUrl/repoUrl → null; gallery → [];
  //          largestCommitCaption → undefined (optional, see field section).
  // heroImage RELATIVE-PATH CHECK: reject any heroImage that starts with '/',
  // '\\', '~', or matches /^[A-Za-z]:/. Reset to null + push warning.
  // (Prevents config-supplied absolute paths from being reflected into the
  // public warnings[] array via the existence-check step in report.ts.)
}
```

Pick the result-object shape: `validateEditorial` returns `{ value, warnings[] }` and `report.ts` pushes warnings into `report.warnings`. This keeps validation pure and discoverable in the JSON.

### Optional storytelling field — `editorial.largestCommitCaption`

Add an OPTIONAL field to the editorial schema (Briggsy-authored, opt-in):

```ts
// Inside EditorialContent (taxonomy.ts) — already added via Batch A header.
largestCommitCaption?: string;  // optional; rendered on the detail page next
                                 // to the largestSingleCommit numbers if present.
```

This restores the storytelling beat lost when `messageFirstLine` was dropped from the schema — but does so via author-curated copy rather than auto-derivation. Zero auto-leak surface (Briggsy writes the string). If absent, the detail page renders numbers-only per the existing plan. Phase 5 detail-page cascade picks this up (see cascade block at the end).

### heroImage existence check

After validation, in `report.ts` after the editorial pull:
```ts
const { value: editorial, warnings: editorialWarnings } = validateEditorial(config.editorial);
warnings.push(...editorialWarnings);

if (editorial?.heroImage) {
  const abs = path.join(rootDir, editorial.heroImage);
  if (!(await fs.stat(abs).catch(() => null))) {
    warnings.push(`editorial.heroImage path does not exist: ${editorial.heroImage}`);
    // CLONE before mutating — don't mutate the (potentially cached) config-load object.
    // The path string here is RELATIVE (absolute paths were rejected at validation
    // time above), so reflecting into warnings[] is safe.
  }
}
// Build the final editorial object as a fresh literal so any later cache layer
// over loadProjectConfig is safe from in-place mutation.
const finalEditorial: EditorialContent | null = editorial
  ? { ...editorial, heroImage: heroImageExists ? editorial.heroImage : null }
  : null;
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
pnpm dev C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.editorial'
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
     totalTokensFresh: Σ p.tokens?.tokensFresh ?? 0,
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
3. `pnpm install --frozen-lockfile` — deterministic (respects existing pnpm-lock.yaml; no version drift). If the lockfile is missing or stale, regenerate intentionally in a separate commit BEFORE this step; do NOT regenerate as a side effect of the version bump.
4. `pnpm build` — verify clean exit, dist/ regenerated.
5. `pnpm typecheck` — clean exit.
6. **Omnibus verify** — runs the now-published binary (the `claude-credit` global command), confirming dist/ is the version under test:
   ```
   claude-credit C:/Users/brigg/ai-learning-journey/projects/burned --json \
     | jq '.git | {firstCommitISO, lastCommitISO, projectAgeDays}, .git.linesByAuthor[0], .git.timeline | {activeDays, peakDay, largestSingleCommit}, .assetBytesByKind, .topSubcategories[0:2], .tokens | {windowDays, sessionCount, tokensProcessed, tokensFresh, byModel: .byModel[0]}, .editorial, .kind'
   ```
   All sub-paths must return non-null where expected (Per BURNED ground truth: editorial may be null until preflight −1.5 authors the worksheet block).

7. Multi verify:
   ```
   claude-credit --all --json | jq '{projects: .projects | length, meta: .meta | length, archive: .archiveCollective.projectCount, combined: .combined | {totalTokensProcessed, totalSessions, tokenWindowDays, modelBreakdown: .modelBreakdown}}'
   ```
   Expected after preflight cascade: `projects: 9, meta: 2, archive: 6`.

### Commit

`chore(claude-credit): bump to 0.2.0 + CHANGELOG`. Tag is OPTIONAL (Briggsy's repo workflow doesn't currently tag — defer).

## 0.8 — Surface new fields in `format/markdown.ts` and `format/terminal.ts` (HARD requirement) (~45-60 min — 6 rendering blocks per file + null-aware helpers)

**Files:** `tools/claude-credit/src/format/markdown.ts`, `tools/claude-credit/src/format/terminal.ts`.

The original plan tagged §0.8 as "not blocking for site work but keeps the tool consistent." The deepening **promotes it to a hard requirement**: the CLI's terminal + markdown output are the contract users see when running `claude-credit` standalone. If the CLI doesn't surface the new fields, users get a misleading minimal report while the site shows the rich data. The two outputs MUST stay in sync.

### Surface in markdown — minimum additions

In `renderProjectMarkdown` (markdown.ts:33):
- New "Tempo" subsection under Git: render `firstCommitISO`, `lastCommitISO`, `projectAgeDays`, `timeline.activeDays`, `timeline.peakDay`, `timeline.largestSingleCommit` (all null-aware — em-dash for null).
- New "Authored By" table: render top 5 entries from `linesByAuthor` with author / commits / coAuthoredCommits / linesAdded / linesRemoved.
- New "Tokens" subsection (skip if `tokens === null`): render `tokensProcessed`, `tokensFresh`, `sessionCount`, `windowStartISO → windowEndISO (windowDays days)`, top 3 entries from `byModel`. **Always include the window footnote** — never quote without it.
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

## 0.10 — Test fixture monorepo + integration tests (NEW) (~90-120 min — fixture tree + Zod schema mirror + 5 integration tests + shared stripper)

**Files:**
- NEW directory tree: `tools/claude-credit/test/fixtures/multi-fixture/`
- NEW: `tools/claude-credit/src/__tests__/multi-report.test.ts`
- NEW: `tools/claude-credit/src/__tests__/stats-shape.test.ts`
- NEW: `tools/claude-credit/src/__tests__/schema.ts` (Zod schema mirror)
- NEW (used by both Phase 0 test AND Phase 2 production): `tools/claude-credit/src/strip-for-publish.ts`

Lights up the previously-unused vitest harness with five integration tests that gate Phase 0 done. All five must pass on `pnpm test` before the §0.7 version bump.

### Shared stripper — `strip-for-publish.ts` (NEW, Phase 0 scope)

The privacy-stripping discipline must be ONE implementation, used by both the Phase 0 round-trip test AND Phase 2's `refresh-stats.ts` production script. Extracting it now (in Phase 0) avoids a future Phase 2 from writing a divergent implementation that the Phase 0 test wouldn't catch.

```ts
// tools/claude-credit/src/strip-for-publish.ts (NEW)
// PRIVACY: this module produces the public-safe JSON shape. The hand-coded
// ALLOWED_KEY_PATHS list is the structural enforcement of the "what ships
// publicly" rule. Adding a new key requires adding a line here.

import type { MultiProjectReport } from './taxonomy.js';

export const ALLOWED_KEY_PATHS: readonly string[] = [
  // ... enumerate every key path that may appear in stats.json ...
  // e.g.:
  'scannedAt',
  'combined.projectCount',
  'combined.totalTokensProcessed',
  'combined.tokenWindowStartISO',
  'projects[].projectName',
  'projects[].kind',
  'projects[].git.firstCommitISO',
  // ... (full list lives in code; ~50-70 entries)
];

export function stripForPublish(report: MultiProjectReport): unknown {
  // Deep-walk + delete every 'projectPath' key.
  // Return a structurally-cloned object suitable for JSON.stringify.
}
```

Phase 2's `refresh-stats.ts` imports `stripForPublish` directly. The §0.10 round-trip test imports the same function. One source of truth.

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

1. **JSON schema validation** (`src/__tests__/multi-report.test.ts`). Run `buildMultiProjectReport({ homeDir: fixture-claude-projects, projectPaths: [...fixture-paths] })`. Validate the resulting JSON against the Zod schema in `src/__tests__/schema.ts` (mirrors every interface in `taxonomy.ts`). Asserts presence of all new fields + null-discipline (active-b has no editorial → `editorial: null`; active-c has no git history → `git.firstCommitISO: null`).

2. **Aggregation invariants — all three** (same file). Verify all three invariants from the Aggregation invariants section:
   - **Invariant A (grandTotals sum-class)** for X ∈ {AuthoredFiles, AuthoredBytes, AuthoredLines, PipelineGeneratedFiles, PipelineGeneratedBytes, AllBytes, Commits}.
   - **Invariant B (token sum-class)** for `totalTokensProcessed`, `totalTokensFresh`, `totalSessions`.
   - **Invariant C (window min/max)** for `tokenWindowStartISO === min(non-null project starts)`, `tokenWindowEndISO === max(non-null project ends)`, `tokenWindowDays === floor((end - start) / 86_400_000)` when both bounds non-null else null.
   
   Run twice: once on a fixture with `archive:` populated, once without (`archiveCollective` is null). Once with a project that has `tokens: null` mixed with projects that have token data.

3. **Privacy round-trip** (same file). Build the report, call the SHARED `stripForPublish` function from `src/strip-for-publish.ts` (NOT a stand-in — the production function). Assert:
   - No `projectPath` key survives anywhere in the deep tree.
   - No `messageFirstLine` key exists at the schema level (`largestSingleCommit` shape excludes it by type).
   - For each string-valued leaf, NONE matches any grep-guard pattern enumerated in the Privacy by Construction section: `C:\\`, `C:/`, `/Users/`, `\\Users\\`, `AppData`, `brigg`, `node_modules`, `/private/`, `\\private\\`, `secret`, `password`, the email regex, the Windows drive-letter slug regex `^[A-Za-z]--[A-Za-z]`, the UUID regex (outside the model-name allowlist).

4. **Session-tokens fixture** (same file). Integration via `buildMultiProjectReport`: `combined.totalSessions === 4` (3 from active-a primary + 1 from active-a worktree + 0 from active-b empty), orphan slug NOT in `combined.totalSessions`, AND `result.orphanSlugs` array (returned from `buildMultiProjectReport`, NOT spied off stderr) contains the orphan slug name.

5. **Stats-shape allowlist** (`src/__tests__/stats-shape.test.ts`). Build the report, run through `stripForPublish`. Deep-walk the parsed JSON, collect every unique key path (e.g., `projects[].git.firstCommitISO`, `combined.modelBreakdown[].model`). Assert `extractedPaths ⊆ ALLOWED_KEY_PATHS` (the hand-coded array exported from `src/strip-for-publish.ts`). **Adding a new top-level field requires adding a line to ALLOWED_KEY_PATHS — a deliberate, reviewable edit. (Why not a vitest text snapshot: snapshot blesses are one CLI flag away from being applied without review; an explicit array makes "what's allowed" an enumerable code surface.)**

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

`feat(claude-credit): test fixture monorepo + 5 integration tests + stats-shape allowlist + shared stripForPublish`

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
| **Session-tokens parser reads PII fields by accident** | Five-layer structural defense: explicit-object-literal construction form (no `{...rest}` destructure) + `satisfies ParsedAssistantLine` compile-time check + `Object.keys` test asserting exact 7-key output + grep-lint asserting source has no forbidden patterns + pre-publish grep-guard in Phase 8 on the final JSON. |
| **Subdir-slug false-merge** (`data-engineering` ↔ `data-engineering-atc`) | Longest-prefix-match-wins sort + `slug.startsWith(parent + '-') && !slug.startsWith(parent + '--')` separator rule. Test 3 in §0.5b explicitly covers a hypothetical `data-engineering-other` config to catch regressions. |
| **Worktree slug split** (BURNED worktree session tokens orphan) | `^<parent>--claude-worktrees-` match. Confirmed on disk at deepening (real worktree slug exists). Test 2 in §0.5b. |
| **Window-bounded floor misread as lifetime** | UI mandates "across N days of session retention" footnote on every token surface. Honesty signal. Plan §0.5b honesty constraint is load-bearing. |
| **`tokensProcessed` vs `tokensFresh` confusion in downstream phases** | Both fields ship; both names are unambiguous. Hero displays BOTH side-by-side (locked dual-hero treatment); detail page renders the full breakdown. No single ambiguous `totalTokens` field exists. The name `tokensFresh` (NOT `tokensGenerated`) is precise — `cacheCreation` is fresh input that got cached, not model-generated output. |
| **`messageFirstLine` path leak** | Field DROPPED from schema. Eliminated at source. |
| **Public stats.json grows new keys without allowlist update** | §0.10 stats-shape allowlist test fails CI on any key-path not in `ALLOWED_KEY_PATHS` (hand-coded array in `src/strip-for-publish.ts`). Adding a field requires editing the array — a deliberate, reviewable change, not a bless-and-go snapshot update. |
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

The cascade carries CONTRACT (schema facts), not CONTENT (display decisions). Phase 3's deepening picks the content per its own pass.

- **LOCK: hero displays BOTH `combined.totalTokensProcessed` AND `combined.totalTokensFresh` side-by-side** (decided 2026-05-24 at doc-review). Reading example: *"1.2B tokens processed · 240M fresh · across N days of session retention"*. Magnitude + honesty in the same glance — pre-empts the "wow Claude built this with juiced numbers" failure mode for the AI-peer audience. Phase 3 deepening picks reading order, type weights, exact typography, and the supporting line (lines authored / sessions / project count), but the dual-number treatment is fixed.
- **LOCK: every token surface is window-bounded.** `combined.tokenWindowDays` is the load-bearing footnote. Phase 3 MUST surface it on every page that displays a token number. The honesty signal is non-optional per the §0.5b honesty constraint.
- **CONTRACT: secondary stats** can pull from `combined.totalAuthoredLines`, `combined.totalCommits`, `combined.totalSessions`, `combined.projectCount`. Phase 3 deepening picks which to feature.

### `phase-4-grid.md`

- **CONTRACT: grid splits on `ProjectReport.kind`.** Phase 4 renders `kind === 'active'` tiles sorted by `grandTotals.allBytes` desc, then `kind === 'meta'` tiles (also sorted), then the single `archiveCollective` tile in last position. The structure is locked by the data shape.
- **CONTRACT: archive collective tile reads from `report.archiveCollective`** (not from any `ProjectReport`). Subtitle composed from `archiveCollective.projectCount` + `totalAuthoredLines` + `totalTokensProcessed` per preflight −1.5.
- **CONTRACT: archive collective tile always last** — does NOT sort by bytes; ALWAYS last position regardless of size.
- **CONTENT: divider labels and tile copy are Phase 4's call.** Phase 0 does not pre-lock the literal strings ("the tools" / "the misses" appear in preflight −1.5 as a working vocabulary, but the on-grid copy is a tonal decision that belongs in Phase 4 deepening with a cold-read pass).

### `phase-5-detail.md`

- **CONTRACT: "View source →" affordance** reads from `editorial.repoUrl` (preflight cascade requirement; data field is locked here in Phase 0).
- **CONTRACT: detail page handles `tokens === null` per null discipline** — AUTHORED BY drops the tokens column; TOKENS CONSUMED section is omitted from the page (not rendered as "0 tokens").
- **CONTRACT: TOKENS CONSUMED block has access to** `tokensProcessed`, `tokensFresh`, `sessionCount`, `windowStartISO → windowEndISO (windowDays)`, per-model breakdown from `byModel`, `sidechainTokens`. Phase 5 composes the visual.
- **CONTRACT: optional `editorial.largestCommitCaption?: string`** — Phase 5 renders next to `largestSingleCommit` numbers if present, falls back to numbers-only otherwise. Restores storytelling beat lost when `messageFirstLine` was dropped.
- **CONTRACT: `Archive.tsx` detail page** at route `/archive` — renders archive project names from `archiveCollective.projectNames` + Briggsy-authored one-liners (content authored in preflight −1.5).

### `phase-8-deploy.md`

- **ADD pre-publish grep-guard** to the GitHub Action workflow (`refresh-claude-credits.yml`). The guard runs on `public/data/stats.json` content before the `git commit` step. Match patterns enumerated in this plan's Privacy by Construction section.

### Verification — semantic review, not greps

Greps are circular: they pass when the cascade commit literally wrote the patterns, but tell you nothing about whether the cascaded content is COHERENT with the surrounding plan. The cascade commit must be reviewed by READING each downstream plan in full, not by greps. Use the checklist below as a semantic review guide.

**Pre-cascade state (TODAY, before Phase 0 executes) — verified findings to fix during the cascade commit:**

- `phase-3-hero.md` currently references `combined.totalTokens` — a field name that no longer exists. The cascade commit MUST replace it with the LOCKED dual-hero treatment: BOTH `combined.totalTokensProcessed` AND `combined.totalTokensFresh` rendered side-by-side per the Phase 3 cascade contract above.
- `phase-4-grid.md` currently references a `shelved` status branch on `StatusMarker` — **KEEP this branch.** The doc-review reopened `EditorialContent.status` to three values (`'active' | 'shelved' | 'meta'`). The grid still ships the archive-collective tile as the v1 surface for shelved projects in aggregate, but the per-project `'shelved'` status path stays intact so a future Phase 5 pass can add per-archive detail pages without a schema migration.
- `phase-2-data-wiring.md` currently doesn't reference `meta[]`, `archiveCollective`, or the grep-guard. The cascade commit MUST add them.
- `phase-5-detail.md` currently doesn't handle `tokens === null` gracefully and doesn't reference `Archive.tsx` or `sidechainTokens`. The cascade commit MUST add them.
- `phase-8-deploy.md` currently has no grep-guard step. The cascade commit MUST add it under the deploy workflow.

**Semantic review checklist (for the reviewer of the cascade commit):**

| Phase | Open the file and confirm... |
|---|---|
| phase-2-data-wiring.md | `refresh-stats.ts` walks BOTH `report.projects[*].editorial.heroImage` AND `report.meta[*].editorial.heroImage` for path rewrite. Does NOT strip anything from `archiveCollective` (no projectPath there). Imports `stripForPublish` from `tools/claude-credit/src/strip-for-publish.ts` (single source of truth — same function the §0.10 test uses). |
| phase-3-hero.md | Hero displays BOTH `combined.totalTokensProcessed` AND `combined.totalTokensFresh` side-by-side (per the locked dual-hero treatment). The window footnote (`combined.tokenWindowDays` "across N days of session retention") is on every token surface. No reference to a `totalTokens` field. |
| phase-4-grid.md | Grid splits on `kind === 'active'` / `kind === 'meta'` / `archiveCollective` (last position, doesn't sort by bytes). StatusMarker handles all three status values: `'active'` (default, no marker), `'shelved'` (faded/badge for any per-project tile that opts in), `'meta'` (subtle indicator). v1 ships zero per-project tiles with `status: 'shelved'` — those projects all roll into `archiveCollective` instead — but the branch is preserved so Phase 5 can add per-archive detail pages later. |
| phase-5-detail.md | "View source →" reads `editorial.repoUrl`. `tokens === null` path renders no TOKENS CONSUMED section. TOKENS block uses `tokensProcessed`/`tokensFresh`/`sessionCount`/window/byModel/`sidechainTokens`. Optional `editorial.largestCommitCaption` renders next to `largestSingleCommit` if present. `Archive.tsx` at `/archive` renders `archiveCollective.projectNames`. |
| phase-8-deploy.md | GitHub Action's deploy workflow has a `validate-stats-json` step that runs the grep-guard against `public/data/stats.json` BEFORE the `git commit` step. Refuses to commit on any match. Pattern list matches the Privacy by Construction section in this Phase 0 plan. |

---

## Phase 0 → Phase 1 handoff

When every checklist item below is green AND the cascade-amendment commit has landed:

- [ ] Batch A taxonomy.ts edits + consumer-side placeholders landed, `pnpm typecheck` clean (binary green, no expected-failure ambiguity)
- [ ] §0.1 firstCommit/lastCommit/projectAgeDays → fields populated on BURNED verify
- [ ] §0.2 assetBytesByKind → 5 keys, integer-valued, never null
- [ ] §0.3 topSubcategories → length 5, sorted desc by bytes
- [ ] §0.4+0.5 (merged) linesByAuthor + timeline → Claude + Briggsy both visible via the `git log -z` parser, peakDay non-null, largestSingleCommit sha is 40-char hex (NO messageFirstLine, binary-only commits ineligible), git-stats.test.ts 3+ tests green (co-author parser + e2e fixture + peakDay tiebreaker)
- [ ] §0.5b session-tokens → tokensProcessed > 100M on BURNED, byModel shows normalized names, sidechainTokens populated, parseHealth all integer counters (no strings), session-tokens.test.ts 12 tests green (pick-list + 4 slug-merge cases + window + sidechain + aggregate math + model norm + malformed + empty-homedir + orphan return)
- [ ] §0.6 editorial → validator works with `{value, warnings}` return shape, heroImage absolute-path rejection works, missing heroImage → null + warning in `report.warnings`, status enum is 2-value (`active` | `meta`), optional `largestCommitCaption` field present in the schema
- [ ] §0.6b multi-config parser → `meta:` + `archive:` keys parsed, ArchiveCollective rolled up, `kind` discriminator on every ProjectReport, `result.orphanSlugs` returned from buildMultiProjectReport, config.test.ts 3 tests green
- [ ] §0.7 version 0.2.0 + CHANGELOG.md + `pnpm install --frozen-lockfile` + omnibus verify green
- [ ] §0.8 markdown + terminal renderers surface every new field, null-discipline holds (em-dash for null, "0" for zero)
- [ ] §0.9 → REMOVED marker preserved
- [ ] §0.10 fixture monorepo + 5 integration tests green (Zod schema validation + three aggregation invariants A/B/C + privacy round-trip via shared `stripForPublish` + session-tokens-merge fixture with orphan + stats-shape ALLOWED_KEY_PATHS allowlist assertion)
- [ ] `src/strip-for-publish.ts` exists and is imported by both the §0.10 test AND wired for Phase 2's `refresh-stats.ts` import path
- [ ] Cascade commit to phase-2/3/4/5/8 landed AND each downstream file passed the semantic review checklist (not just greps)

Then open [phase-1-scaffold.md](phase-1-scaffold.md) and start.

---

← [Phase −1 — Pre-flight](phase-preflight.md) | [Index](README.md) | Next → [Phase 1 — Scaffold](phase-1-scaffold.md)
