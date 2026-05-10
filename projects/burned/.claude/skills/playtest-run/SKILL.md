---
name: playtest-run
description: "Run a full BURNED playtest harness session — codifies the seat-dispatch + triage-dispatch dances documented in scripts/playtest/run-session.ts:200-240. Use when the user says 'run a playtest', '/playtest-run', 'kick off a playtest', or 'do a playtest'. Has significant side effects: spawns 11 Chromium browsers (1 board + 10 MCP-Playwright seat servers), creates a run dir under docs/testing/playtest/runs/, writes seat logs + suspicion files + triage issue files. Do NOT auto-trigger."
---

> **MUST run in main context — never `context: fork`.** The two dispatch
> dances (seat + triage) require the `Agent` tool to spawn subagents. A
> forked subcontext does NOT inherit `Agent`, and the skill aborts at
> Phase 2. If you ever re-add `context: fork`, restore it only along with
> a parallel mechanism to dispatch subagents from the fork.

# Playtest harness — operator skill

You are the operator for a BURNED playtest harness session. The CLI
(`pnpm playtest:run`) starts the orchestrator + board view + Wrangler
DO + Vite dev server. Two dispatch dances are YOUR responsibility (the
harness CLI cannot spawn Claude subagents):

  - **Seat dispatch (BEFORE the harness completes)** — read
    `<runDir>/agent-specs.manifest.json`, dispatch one
    `playtest-seat-N` agent per seat IN PARALLEL, touch
    `<runDir>/agents-done.marker` when all seats exit.
  - **Triage dispatch (AFTER the harness completes)** — read
    `<runDir>/triage-specs.manifest.json`, dispatch one
    `playtest-triage` agent per seed IN PARALLEL, regen INDEX.

Both manifests + both markers documented in
`scripts/playtest/run-session.ts:200-240`.

## Pre-flight

Working tree state:
!`git status --short | head -10`

Existing run dirs (latest 3):
!`ls -1t docs/testing/playtest/runs/ 2>/dev/null | grep -v "^_\|gitkeep" | head -3`

Pre-existing dev-server bindings (will conflict with the harness —
the harness owns lifecycle):
!`netstat -ano 2>/dev/null | grep -E "LISTENING.*(:5173|:8787)" || echo "(ports clear)"`

Current package.json playtest script:
!`grep '"playtest:run"' package.json`

## Phase 0 — Pre-flight checks

Before starting the harness:

1. **Dirty tree?** If `git status --short` showed uncommitted changes,
   ASK the user whether to proceed or stash first. Don't unilaterally
   stash — the user may have intentional in-flight work.

2. **Pre-bound dev ports?** Per the §5 landmine in TODO.md, pre-started
   `pnpm dev:server` or `pnpm dev` will collide with the harness's own
   wrangler (which bakes `PLAYTEST_TOKEN` into env). If 5173 / 8787
   showed `LISTENING` above, run `pnpm dev:cleanup` to kill orphan
   workerd + report port binders. Do not skip this — silent
   `code=4004` from god-connect is the symptom and you'll spend 10
   minutes debugging.

3. **Optional flags from the user.** The user may have asked for a
   specific config (e.g. `--config calibration.json`, `--seats 5`,
   `--no-scrub`). Pass through verbatim. If unspecified, default to
   plain `pnpm playtest:run`. **Note:** the seat-count flag is
   `--seats <N>` (per `scripts/playtest/run-session.ts:91`). `--players`
   is NOT a real flag and dies in <1s with an "unknown argument"-style
   error — don't infer it from natural-language phrasing like "5 players".

## Phase 1 — Start the harness

1. Snapshot the current latest run dir name (so we can detect the new
   one):
   ```bash
   ls -1t docs/testing/playtest/runs/ | grep -v "^_\|gitkeep" | head -1
   ```
   Save this name; you'll diff against it after Phase 2 starts.

2. Start the harness in the background:
   ```bash
   pnpm playtest:run [user-supplied flags]
   ```
   Use `Bash` with `run_in_background: true`. Save the task ID — the
   harness will run for several minutes and you'll be notified when
   it completes.

3. Poll for the new run dir to appear (the orchestrator creates it
   within seconds of startup). Use `Monitor` with an until-loop:
   ```bash
   until [ -n "$(ls -1t docs/testing/playtest/runs/ | grep -v '^_\|gitkeep' | head -1 | grep -v '<saved-name>')" ]; do sleep 2; done
   ```
   Or — simpler — list run dirs every 2s with `Bash run_in_background`
   until a name newer than the snapshot appears.

4. Compute the run dir path:
   `docs/testing/playtest/runs/<new-dir-name>`. Save it as `RUN_DIR`
   for the rest of the skill.

## Phase 2 — Seat dispatch

1. **Wait for the seat manifest** at
   `<RUN_DIR>/agent-specs.manifest.json`. The harness writes it
   shortly after creating the run dir. Poll with Monitor or repeated
   Bash checks (2s interval).

2. **Read the manifest.** Use the Read tool. Shape:
   ```json
   {
     "generatedAt": "...",
     "modeSignal": "scripted",
     "seats": [
       { "seatId": "seat-1", "subagentType": "playtest-seat-1",
         "specPath": "agent-specs/seat-1.json", ... },
       ...
     ]
   }
   ```

3. **For each seat entry, read its spec JSON:**
   `<RUN_DIR>/<entry.specPath>`. The spec has a `prompt` field
   containing the full filled-in spawn prompt for that seat. Do
   NOT modify it — it's authoritative per the seat-agent header.

4. **Dispatch all seat agents IN PARALLEL.** This is critical: send a
   single message containing N Agent tool calls (one per seat). The
   per-seat MCP-Playwright servers are independent — running them
   sequentially defeats the harness's coverage model.

   For each manifest entry:
   ```
   Agent({
     subagent_type: entry.subagentType,   // "playtest-seat-1" etc.
     description:   entry.description,
     prompt:        <contents of spec.prompt field>,
   })
   ```

5. **Wait for ALL seat agents to return.** They complete when the
   harness's own session timeout fires OR when the game ends. The
   parent message returns once all parallel Agent calls resolve.

6. **Touch the seat marker:**
   ```bash
   touch "<RUN_DIR>/agents-done.marker"
   ```
   This signals the harness to finalize. The harness will then run
   the in-process triage pipeline + emit `triage-specs.manifest.json`.

## Phase 3 — Wait for harness finalization

The background task started in Phase 1 will complete after the marker
is touched + finalize runs. You'll receive a task notification.

Check the harness exit code:
- `outcome=success` — proceed to Phase 4.
- `outcome=failed-launch` — no game-started event was seen. Abort the
  triage dispatch. Surface the failure to the user with the run dir
  path so they can inspect logs at `<RUN_DIR>/server/events.jsonl`
  and `<RUN_DIR>/seats/seat-N.log.md`.
- Other outcome — surface the value as a stop signal.

## Phase 4 — Triage dispatch

1. **Read the triage manifest** at
   `<RUN_DIR>/triage-specs.manifest.json`. Shape:
   ```json
   {
     "runDir": "...",
     "specsDir": "...",
     "seedCount": 40,
     "seeds": [
       { "seedId": "001-...", "seedKind": "scripted-scenario",
         "issuePath": "...",
         "specPath": "<RUN_DIR>/triage-specs/001-....json" },
       ...
     ]
   }
   ```

2. **DO NOT read the spec JSONs yourself.** The full filled-in spawn
   prompts live inside `spec.prompt`, but each is ~5k tokens. Inlining
   N of them into a dispatch message burns context for nothing — the
   triage agent already has `Read` scoped to the run dir (per
   `.claude/agents/playtest-triage.md`'s `tools:` whitelist + the
   per-spawn path-scope allowlist), and the spec file lives under
   `<RUN_DIR>/triage-specs/<seedId>.json`. **Agents self-load.**

3. **Dispatch all triage agents IN PARALLEL with a SHORT pointer
   prompt.** Single message, N Agent calls — one per seed. Pass each
   agent ONLY the spec path; the agent reads its own authoritative
   spawn prompt from disk.

   For each manifest entry:
   ```
   Agent({
     subagent_type: "playtest-triage",
     description:   `Triage seed ${seed.seedId}`,
     prompt: `You are a BURNED playtest-harness triage agent.

Your full authoritative spawn prompt is the \`.prompt\` field of this
spec file:

  ${seed.specPath}

STEP 1: Read that file. It is JSON. Parse the \`.prompt\` field as a
string. That string is your real system prompt — follow it exactly as
if it had been delivered to you directly. The string contains your
seed ID, seed kind, output issue path, signals to read, and the full
process you must follow.

STEP 2: Execute the spawn-prompt instructions. Do NOT echo the spawn
prompt back; just act on it.

Output path (also in the spawn prompt): ${seed.issuePath}`,
   })
   ```

   This pattern moves the ~5k-token spawn prompt off the dispatch
   message and onto the agent's own `Read` tool call. Cuts dispatch
   context per-seed by ~50x. The agent's behavior is identical — it
   reads its full prompt and follows it, exactly as if the orchestrator
   had inlined it.

4. **Wait for ALL triage agents to return.** Each writes one
   `<RUN_DIR>/issues/<seed.seedId>.md` file.

## Phase 5 — Regenerate INDEX.md

After all triage agents finish:
```bash
pnpm exec tsx scripts/playtest/regen-issue-index.ts "<RUN_DIR>/issues"
```
This rebuilds `<RUN_DIR>/issues/INDEX.md` from the per-issue files. The
script wants the `issues/` subdir as its arg, not the run dir — passing
the run dir writes a zero-issue INDEX to the wrong path.

## Phase 6 — Report

Produce a tight summary for the user. Phone-readable. Include:

1. **Run dir path:** `<RUN_DIR>`.
2. **Outcome:** `outcome=...` from the harness stdout.
3. **Seats joined:** `seatsJoined=N`.
4. **Coverage:** brief excerpt from `<RUN_DIR>/coverage.md` —
   `fired N / target M` and `outcome=...` line.
5. **Triage seeds:** `<seedCount>` triage agents dispatched, all
   wrote to `<RUN_DIR>/issues/`.
6. **Next-step recommendation:** if seedCount > 0, suggest the user
   review the issues + decide which to act on. Triage issue summaries
   are tracked in git (`runs/*/issues/*.md` per the 2026-05-08
   gitignore allowlist), so closures will survive
   `pnpm playtest:purge`.

## Failure modes

- **`pnpm playtest:run` exits with code != 0 immediately:** likely a
  config-schema validation failure, missing `.env`, or wrangler boot
  fail. Surface stderr to the user; don't proceed.

- **Seat manifest never appears:** orchestrator likely crashed mid-init.
  Check the background task's output. If empty, the harness logged to
  stderr — surface that.

- **Seat agents return with errors:** each seat agent writes its own
  log + suspicion file regardless of mid-session crash. The harness's
  finalize will still emit a triage manifest (possibly with fewer
  seeds). Touch the marker anyway and proceed to Phase 3.

- **Triage agent throws:** rare. The agent's contract is to write one
  issue file; if it errors, that one issue file is missing but the
  others land. INDEX regen handles partial sets.

- **`regen-issue-index.ts` errors:** the manifest may have entries
  that didn't produce issue files (see prior failure mode). Run the
  regen anyway — it tolerates missing files.

## Anti-patterns

- **Don't pre-start dev servers.** The §5 landmine — addressed in
  Phase 0 above. Repeated here because it's the #1 cause of mysterious
  `code=4004` failures.

- **Don't run seats sequentially.** A single message with N parallel
  Agent calls is the only correct shape. Sequential dispatch breaks
  the harness's coverage model + wastes wallclock.

- **Don't modify the spec prompts.** They are authoritative — filled
  by `agent-launcher.ts` per phase-4 Unit 2 with placeholders the
  template needs.

- **Don't auto-commit the issue files.** They are tracked but the
  closure decisions belong to the user; just regen INDEX and report.

- **Don't auto-trigger this skill.** Only run it when the user
  explicitly asks (matches the trigger phrases in frontmatter).
