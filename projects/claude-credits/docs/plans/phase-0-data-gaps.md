---
created: 2026-05-24T09:46:48-04:00
deepened:
doc-reviewed:
---

# Phase 0 — Fill data gaps in `tools/claude-credit/` (~60 min)

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

These additions unlock the editorial spine + storytelling beats. Add them before building the site so the data contract is stable.

## 0.1 — Add `firstCommit` / `lastCommit` per project
**File:** `tools/claude-credit/src/git-stats.ts`, `src/taxonomy.ts`

Add to `GitStats`:
```ts
firstCommitISO: string | null;
lastCommitISO: string | null;
projectAgeDays: number | null;
```

Implementation in `collectGitStats`:
- First: `git -C <root> log --pretty=format:%aI --reverse -- . | head -1`
- Last: `git -C <root> log -1 --pretty=format:%aI -- .`
- Age: diff in days.

Unlocks: "BURNED · born 47 days ago" ribbon on project tiles.

## 0.2 — Add asset-bytes-by-kind on disk
**File:** `tools/claude-credit/src/counter.ts` or `src/report.ts`

While aggregating `CategorizedFile[]`, sum bytes per asset subcategory and surface in `ProjectReport.assetBytesByKind`:
```ts
assetBytesByKind: {
  images: number;
  audio: number;
  video: number;
  fonts: number;
  'misc-media': number;
}
```

Unlocks: hero donut on detail page ("211 MB images · 133 MB video · 37 MB audio").

## 0.3 — Add `topSubcategories` pre-computed
**File:** `tools/claude-credit/src/report.ts`

After tier aggregation, add to `ProjectReport`:
```ts
topSubcategories: Array<{
  tier: Tier;
  category: string;
  subcategory: string;
  bytes: number;
  files: number;
  lines: number;
}>;  // sorted desc by bytes, top 5
```

Unlocks: detail-page callout cards without per-tile iteration in the renderer.

## 0.4 — `linesByAuthor` in `GitStats` (Co-Authored-By aware)
**File:** `tools/claude-credit/src/git-stats.ts`, `src/taxonomy.ts`

Existing `commitsByAuthor` is misleading for AI-pair work (Claude makes one 4K-line commit; Briggsy makes five 20-line commits — count makes Briggsy look 5x more productive). Add:
```ts
linesByAuthor: Array<{
  author: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  coAuthoredCommits: number;  // commits where this author appears as Co-Authored-By trailer
}>;
```

Implementation:
- One `git log --pretty=format:"%H%x00%aN%x00%B%x00END" --numstat -- .` pass.
- Parse: primary author per commit + scan `%B` body for `Co-Authored-By: Name <email>` trailers.
- **Attribution rule (decided):** for each commit, full `linesAdded`/`linesRemoved` are credited to BOTH primary author AND each co-author (additive, not split). This honestly reflects the AI-pair-programming reality. `commits` counts primary only; `coAuthoredCommits` counts co-author appearances. Site UI surfaces a small footnote: "lines attributed to primary + each co-author; totals exceed lifetime adds when commits are co-authored."
- Sort descending by `linesAdded + linesRemoved` (total churn contribution).

Unlocks: "AUTHORED BY · Claude 312K · Briggsy 8K" — the headline lens for the AI-peer audience.

## 0.5 — `timeline` block in `GitStats`
**File:** `tools/claude-credit/src/git-stats.ts`, `src/taxonomy.ts`

Add to `GitStats`:
```ts
timeline: {
  commitsByDay: Array<{ date: string; count: number }>;  // ISO date, ASC
  activeDays: number;
  peakDay: { date: string; count: number } | null;
  largestSingleCommit: {
    sha: string;
    dateISO: string;
    linesAdded: number;
    linesRemoved: number;
    messageFirstLine: string;
  } | null;
};
```

Implementation:
- Bucket the already-collected commit data by day from `%aI`.
- `activeDays` = `commitsByDay.length` (only days with ≥ 1 commit are stored).
- `peakDay` = max by count.
- `largestSingleCommit` = from the numstat pass, track running max of `linesAdded + linesRemoved` per commit; capture sha + first line of message + dateISO.

Unlocks: detail-page cadence sparkline + three storytelling callouts ("14 active days · biggest day Apr 22 · largest commit +4,200 lines").

## 0.5b — `tokens` block (Claude Code session JSONL parser)
**Files:**
- `tools/claude-credit/src/session-tokens.ts` (NEW — JSONL parser)
- `tools/claude-credit/src/taxonomy.ts` (add `TokenStats` type + `ProjectReport.tokens`)
- `tools/claude-credit/src/report.ts` (call parser, attach to ProjectReport)
- `tools/claude-credit/src/multi-report.ts` (aggregate to combined totals)

**Honesty constraint (load-bearing):** Claude Code session JSONLs rotate after ~30 days. Any disk-derived tally is a **window-bounded FLOOR**, never a lifetime total. The UI MUST surface the window: *"1.2B tokens · across N days of session retention"* — never *"lifetime."*

Add to taxonomy:
```ts
export interface TokenStats {
  // Window the data covers (oldest session message → newest)
  windowStartISO: string | null;
  windowEndISO: string | null;
  windowDays: number | null;

  // Session counts
  sessionCount: number;

  // Token totals across all sessions in window (sum of assistant messages)
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalTokens: number;  // sum of all four

  // Per-model breakdown (normalized: "claude-opus-4-7" → "Opus 4.7")
  byModel: Array<{ model: string; sessions: number; totalTokens: number }>;
}

// In ProjectReport:
tokens: TokenStats | null;  // null if no session JSONLs found for this project
```

Aggregate to `MultiProjectReport.combined`:
```ts
combined: {
  // ...existing fields...
  totalTokens: number;
  totalSessions: number;
  tokenWindowStartISO: string | null;  // min across non-null project starts
  tokenWindowEndISO: string | null;    // max across non-null project ends
  tokenWindowDays: number | null;
  modelBreakdown: Array<{ model: string; sessions: number; totalTokens: number }>;
}
```

**Implementation in `session-tokens.ts`:**

1. **Slug derivation.** Project path → session slug:
   ```ts
   function projectPathToSessionSlug(absPath: string): string {
     return absPath
       .replace(/\\/g, '/')   // normalize separators
       .replace(/:/g, '-')    // Windows drive colon → dash
       .replace(/\//g, '-')   // path slashes → dashes
       .replace(/^-+/, '');   // collapse leading dashes
   }
   ```
   Example: `C:/Users/brigg/ai-learning-journey/projects/burned` → `C--Users-brigg-ai-learning-journey-projects-burned` (verified against `~/.claude/projects/` directory listing).

2. **Worktree handling (LANDMINE).** Sessions run inside git worktrees get a DIFFERENT slug suffix: `<parent-slug>--claude-worktrees-<name>-<hash>`. Parser must enumerate `~/.claude/projects/` and merge any slug matching `^<parent-slug>(--claude-worktrees-.*)?$` into the parent project's totals.

3. **JSONL walk.** For each `*.jsonl` in the matched slug directories: read line by line, parse JSON, filter to lines where `message.role === 'assistant'` AND `message.usage` exists. Sum the four token fields. Capture `message.model` and top-level `timestamp`.

4. **Sidechain sessions** (subagent invocations) have `isSidechain: true` at the top level. They DO count — they consumed tokens for this project's work. Sum them too.

5. **Window computation.** Across all messages parsed, track `min(timestamp)` and `max(timestamp)`. Window days = `(end - start) / 86400000`, floor. If only one message exists, windowDays = 0.

6. **Privacy by construction.** Parser ONLY reads `message.usage` + `message.model` + top-level `timestamp` + top-level `isSidechain`. NEVER reads `message.content`. Document this in a code header comment. Conversation transcripts stay on disk only.

7. **Model name normalization.** Map `claude-opus-4-7` → `Opus 4.7`, `claude-sonnet-4-6` → `Sonnet 4.6`, etc. Unknown models pass through as-is.

8. **Graceful degradation.** If `~/.claude/projects/` doesn't exist (e.g., CI environment), return `null` per project. If parent slug directory exists but is empty, return `null`. If `usage` field has unexpected shape (future schema change), skip the line and increment a warning counter — don't crash.

**Unlocks:**
- Hero PRIMARY: combined `totalTokens`
- Detail page AUTHORED BY block: gains a token column (Claude gets totalTokens; Briggsy gets "you don't tokenize")
- Detail page NEW SECTION: TOKENS CONSUMED block (session count, total, model breakdown, window footnote)

## 0.6 — Editorial config schema
**File:** `tools/claude-credit/src/config.ts`, `src/taxonomy.ts`, `src/report.ts`

The site needs per-project editorial content. Schema lives in `claude-credit.config.yaml` (per-project, co-located with project), surfaces on `ProjectReport.editorial`.

YAML shape:
```yaml
# in each project's claude-credit.config.yaml
editorial:
  oneLiner: "BURNED — Archer-toned party card game"
  hookStat:
    label: "tests"
    value: "167"
  heroImage: "docs/screenshots/hero.png"   # path relative to project root
  liveUrl: "https://burned.vercel.app"     # omit if not deployed
  repoUrl: "https://github.com/mbriggsy/..."  # omit if same as monorepo
  status: "active"                          # active | shelved | meta
  description: |
    Two-sentence description of what this project IS and WHY it exists.
    Second sentence carries the iteration arc or design moment.
  gallery:                                  # optional, additional images
    - "docs/screenshots/card-1.png"
    - "docs/screenshots/arena.png"
```

TypeScript type:
```ts
interface EditorialContent {
  oneLiner: string;
  hookStat: { label: string; value: string };
  heroImage: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  status: 'active' | 'shelved' | 'meta';
  description: string;
  gallery: string[];
}

// in ProjectReport:
editorial: EditorialContent | null;  // null if config absent or block missing
```

Implementation:
- Extend `loadProjectConfig` to parse + validate the `editorial` block.
- Default `status` to `'active'` if absent.
- `null` if no editorial block present; site renders a degraded tile (project name + auto stats only, no one-liner / no hook).
- `heroImage` path validation: confirm file exists on disk; if not, warn + null it.
- During GitHub Action's `stats.json` build, hero images get copied into `projects/claude-credits/public/assets/<projectName>/` so the deployed site can serve them.

This is the schema that unblocks tiles, status markers, live-link buttons, and detail-page narrative.

## 0.7 — Bump version + rebuild
- Bump `tools/claude-credit/package.json` to `0.2.0`
- `pnpm build` from `tools/claude-credit/`
- Verify with: `claude-credit C:/Users/brigg/ai-learning-journey/projects/burned --json | jq '.git.projectAgeDays, .git.linesByAuthor, .git.timeline.activeDays, .assetBytesByKind, .topSubcategories, .editorial'`
- All five new field groups must return non-null (assuming BURNED has an editorial block — author it first OR test against a project with editorial filled in).

## 0.8 — Update `format/markdown.ts`
Surface the new fields in markdown output so the CLI consumer (current users) also sees the additions. Not blocking for site work but keeps the tool consistent.

## 0.9 — Multi-project config plumbing
Add the two meta-projects to `~/.claude-credit-projects.yaml`:
```yaml
projects:
  # ... existing 9 entries
  - path: C:\Users\brigg\ai-learning-journey\tools\claude-credit
  - path: C:\Users\brigg\ai-learning-journey\projects\claude-credits
```

Run `claude-credit --all --json | jq '.projects | length'` → expect **11**.

---

← [Phase −1 — Pre-flight](phase-preflight.md) | [Index](README.md) | Next → [Phase 1 — Scaffold](phase-1-scaffold.md)
