# claude-credit

Project-agnostic CLI that tallies every byte of authored / pipeline-generated work in a project. Built for exec slides, video stat sheets, and "show the receipts" moments — the dumb-but-important stuff like file counts, line counts, asset counts, generation counts.

```
claude-credit  ·  burned

  HEADLINE
  ────────────────────────────────────────────────────────────────
    809 authored files  ·  188,800 lines of authored content  ·  8.76 MB
    258 pipeline-generated files  ·  384 MB
    2 tool-generated files (excluded from credit)

    GRAND TOTAL  1,069 files  ·  393 MB
```

## Install

From inside this repo:

```sh
pnpm install
pnpm build
npm link            # exposes `claude-credit` on your PATH globally
```

Verify:

```sh
claude-credit --help
```

## Usage

```sh
claude-credit                    # scan current directory
claude-credit ~/code/burned      # scan a specific project
claude-credit --all              # scan every project in your project list
```

### Output formats

```sh
claude-credit                          # pretty terminal table (default)
claude-credit --markdown               # markdown report — paste straight into slides
claude-credit --markdown > stats.md    # save the markdown report
claude-credit --json | jq .            # JSON for scripting / further processing
claude-credit --include-ignored        # include files .gitignore would normally skip
```

### Cross-project mode

`claude-credit --all` aggregates across every project listed in `~/.claude-credit-projects.yaml`. On first run the file is auto-created by scanning `~/ai-learning-journey/projects/` for siblings. Edit it to add/remove projects:

```yaml
projects:
  - path: ~/ai-learning-journey/projects/burned
  - path: ~/ai-learning-journey/projects/undercover-mob-boss
  - path: ~/some-other-dir/project-x
    name: Project X
```

## Tiers

Three tiers separate "who/what made this":

| Tier | What it covers | Credited? |
|---|---|---|
| **authored** | Code, docs, prompts, narration, configs — anything you + Claude wrote directly | yes |
| **pipeline-generated** | Imagen images, TTS voices, ffmpeg renders, anything a Claude-built pipeline emitted | yes |
| **tool-generated** | Compiler output, lockfiles, snapshot files | no, but tracked |

The headline and grand-total numbers separate the three so nobody can call BS on "the lockfile counts as authored code."

## Default classifications

Files are routed first-match-wins through a built-in ruleset:

| Tier · Category · Subcategory | What lands here |
|---|---|
| authored · code · source | `.ts/.tsx/.js/.py/.rb/.go/.rs/.java/...` under `src/`, top-level, etc. |
| authored · code · tests | `*.test.*`, `*.spec.*`, `__tests__/**`, `tests/**`, `e2e/**` |
| authored · code · test-fixtures | `fixtures/**`, `__fixtures__/**` |
| authored · code · config | `package.json`, `tsconfig.*`, `*.config.*`, `.eslintrc*`, `.github/workflows/**`, Dockerfile, Makefile, … |
| authored · code · schemas | `.d.ts`, `schemas/**`, `zod/**` |
| authored · code · build-scripts | `scripts/**`, `tools/**`, `tasks/**` |
| authored · code · styles | `.css/.scss/.sass/.less/.pcss` |
| authored · code · markup | `.html/.xml`, in-src SVGs |
| authored · docs · plans | `docs/plans/**`, `docs/phases/**` |
| authored · docs · specifications | `docs/specifications/**`, `**/PRODUCT-SPECIFICATION*.md` |
| authored · docs · conventions | `docs/conventions/**` |
| authored · docs · adrs | `docs/adrs/**`, `**/adr-*.md` |
| authored · docs · insights | `docs/insights/**`, `docs/post-mortems/**` |
| authored · docs · triage | `docs/testing/**/issues/**`, `**/runs/*/issues/**` |
| authored · docs · narrative | `videos/**`, `voiceover/**`, `storyboard/**`, `trailer/**`, `scripts/**` markdown |
| authored · docs · readmes | `README.md`, `CLAUDE.md`, `AGENTS.md`, `TODO.md`, `ONBOARDING.md`, `CHANGELOG.md`, `LICENSE`, `next-step.md`, … |
| authored · docs · general | Any other `.md/.mdx/.rst/.txt/.adoc` |
| authored · data · game-content | `cards/**`, `characters/**`, `lore/**`, `dialogue/**`, `quests/**` (json/yaml) |
| authored · data · generation-prompts | `prompts/**`, `imagen-prompts/**`, `voice-scripts/**`, `tts-scripts/**` |
| authored · data · lookup-tables | Other `.json/.yaml/.yml/.toml/.csv/.tsv` |
| pipeline-generated · assets · images | `.png/.jpg/.jpeg/.webp/.gif/.bmp/.ico/.tiff`, non-src SVGs |
| pipeline-generated · assets · audio | `.mp3/.wav/.ogg/.flac/.m4a/.aac/.opus` |
| pipeline-generated · assets · video | `.mp4/.webm/.mov/.mkv/.avi` |
| pipeline-generated · assets · fonts | `.woff/.woff2/.ttf/.otf/.eot` |
| pipeline-generated · assets · misc-media | `.pdf/.psd/.ai/.sketch/.fig` |
| pipeline-generated · iteration-receipts · regen-scripts | `scripts/regen-*.{ts,js}` |
| tool-generated · lockfiles | `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`, `Cargo.lock`, `Gemfile.lock`, `poetry.lock`, `uv.lock` |
| tool-generated · snapshots | `*.snap` |
| tool-generated · caches | `.cache/**`, `.turbo/**`, `.next/**`, `.vite/**`, `.wrangler/**`, `.parcel-cache/**` |

## Per-project config (optional)

Drop a `claude-credit.config.yaml` (or `.json`, `.mjs`, `.js`, `.cjs`) at the project root. All fields are optional and additive.

```yaml
# Exclude additional directory basenames during the walk.
excludeAdditional:
  - .my-cache
  - playground

# Rescue gitignored paths that ARE real authored/pipeline output.
# Most useful for creative outputs that are too big to commit.
includeFromGitignore:
  - videos/trailer/out/**
  - public/trailer/**

# Override iteration proxy targets (defaults: ['sample-eval'] and scripts/regen-*).
proxies:
  iterationDirNames:
    - sample-eval
    - eval-runs
  regenScriptGlobs:
    - scripts/regen-*.{ts,js,mjs,cjs}
    - tools/regen-*.{ts,js}

# Declare generation-log locations. v1 surfaces this but doesn't read yet —
# v2 will parse for high-fidelity discarded-generation counts.
generationLogs:
  - path: .claude-credit/generations.jsonl
    format: jsonl
    label: "Imagen / TTS / ffmpeg pipeline runs"
```

### Custom classification rules

Add your own rules to the front of the classifier (first-match-wins):

```js
// claude-credit.config.mjs
export default {
  classificationRules: [
    {
      name: 'remotion-compositions',
      match: { pathGlobs: ['videos/trailer/src/compositions/**/*.tsx'] },
      tier: 'authored',
      category: 'code',
      subcategory: 'source',
    },
  ],
};
```

## logGeneration() helper

Long-term, the most accurate way to count "every generation Claude ever attempted" is to write a structured log as each one runs. Drop this call into any generation script (Imagen, TTS, ffmpeg, etc.) and v2 of claude-credit will read it for high-fidelity counts.

```sh
# Not published to npm — it's an internal monorepo tool.
# Use it from elsewhere in this repo via a workspace reference or `npm link`
# (see "Local setup" above), then:
#   import { logGeneration } from 'claude-credit/log';
```

```ts
import { logGeneration } from 'claude-credit/log';

const result = await imagen.generate({ prompt });
await logGeneration({
  kind: 'image',
  model: 'imagen-4',
  prompt,
  outputPath: result.path,
  outputBytes: result.bytes,
  durationMs: result.elapsed,
  costUsd: 0.03,
  status: 'kept',
});
```

If you don't want a dependency, copy `src/log-generation.ts` directly into your project — it's ~50 lines with no imports beyond `node:fs` and `node:path`.

The helper writes to `<cwd>/.claude-credit/generations.jsonl`. Add that path to your `.gitignore` if you don't want to commit the log.

## What's excluded by default

Walker never descends into these (regardless of `.gitignore`):

```
node_modules  .git  .svn  .hg  dist  build  coverage
.next  .turbo  .vite  .wrangler  .cache  .parcel-cache
.pnpm-store  .yarn  .npm  .chrome-dev-profile
__pycache__  .pytest_cache  .mypy_cache  .venv  venv
.idea  .vscode
```

`.gitignore` is respected for everything else. Use `--include-ignored` to bypass globally, or `includeFromGitignore` per-project for surgical un-ignoring.

## Iteration proxy signals

Since no project (yet) writes structured generation logs, claude-credit infers iteration count from:

1. **Asset modification events from git** — every commit that added/modified/deleted an asset file. Captures iteration in place.
2. **Unique asset paths ever touched** — set size of those events.
3. **Asset files deleted entirely** — files removed from the repo permanently.
4. **`sample-eval/` subdirs** — each immediate child of any `sample-eval/` dir = one iteration receipt.
5. **`regen-*.ts` scripts** — each is evidence of an iteration pass.

For projects that adopt `logGeneration()`, v2 will surface a separate "true generations" count straight from the log.

## v2 roadmap (not in v1)

- Parse `.claude-credit/generations.jsonl` for high-fidelity discarded-generation counts.
- Claude Code session JSONL parsing — skill invocations, agent spawns, token-usage history.
- GitHub PR / review-comment counts via `gh`.
- Time-windowed mode (`--since=30d`).
- Per-author git attribution breakdowns.
- HTML output format with charts.
- Diff-against-last-run for "what changed this week" reports.

## File layout

```
tools/claude-credit/
├── src/
│   ├── cli.ts              # CLI entry — arg parsing, format selection
│   ├── index.ts            # programmatic exports
│   ├── taxonomy.ts         # tier/category/subcategory types
│   ├── walker.ts           # filesystem walker (gitignore-aware)
│   ├── classifier.ts       # rule-based file → (tier, category, subcategory)
│   ├── counter.ts          # text/binary counting + aggregation
│   ├── git-stats.ts        # git churn + discard counts (subdir-scoped)
│   ├── proxies.ts          # sample-eval + regen-script counters
│   ├── config.ts           # per-project + multi-project config loaders
│   ├── report.ts           # single-project orchestrator
│   ├── multi-report.ts     # cross-project aggregator
│   ├── log-generation.ts   # helper exported as claude-credit/log
│   └── format/
│       ├── terminal.ts     # pretty terminal output
│       ├── markdown.ts     # markdown report
│       └── util.ts         # fmtBytes, fmtNum, padding helpers
├── bin/claude-credit.mjs   # bin entry → dist/cli.js
├── package.json
├── tsconfig.json
└── README.md
```
