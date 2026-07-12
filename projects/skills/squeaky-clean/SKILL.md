---
name: squeaky-clean
description: End-of-session cleanup automation. Trigger when the user says "squeaky", "squeaky clean", "let's get squeaky", or any other end-of-session shutdown signal. Runs the full checklist — TODO update, typechecks, git verification, temp cleanup, commit, push, orphan dev-process cleanup.
user-invocable: true
---

End-of-session cleanup. Every step runs in order — don't skip, don't reorder. If a step fails, stop and fix it before continuing. Never declare "clean" until every step is verified.

## The Checklist

### 1. Update TODO.md

If TODO.md exists in the project root, update it to reflect reality:
- Current state (test counts, build status, bundle sizes — run the actual commands, don't copy from memory)
- Next steps in priority order
- Landmines (known issues, gotchas, things that'll bite the next session)

Rules:
- TODO is for actionable items ONLY. No session history, no "What We Did" logs. Git log has the history.
- Unfinished fixes must be prescriptions, not diagnoses. Write the exact file, line, and change needed.
- Run real commands to get real numbers. Never copy stats from another doc.

If TODO.md doesn't exist, skip this step.

### 2. Run Typechecks

Detect the project's typecheck command:

1. Check `package.json` for a `typecheck` script → run `pnpm typecheck` (or npm/yarn equivalent)
2. If no typecheck script, check for `tsconfig.json` → run `tsc --noEmit`
3. If no TypeScript, check for `pyproject.toml` or `setup.py` → run `mypy .` or `pyright`
4. If none of the above, skip with a note: "No typecheck configured."

Typechecks must pass. If they fail, fix the errors before continuing.

### 3. Verify Git Status

Run `git status` and check:
- Are only expected files changed? Look for surprise modifications.
- Are there untracked files that should be tracked (new source files)?
- Are there files that should NOT be committed (.env, credentials, large binaries)?
- Are there temp files that weren't cleaned up yet?

If anything looks unexpected, flag it and ask before proceeding.

### 4. Clean Temp Files

- **`temp/` is UNCONDITIONAL — never ask about it.** If a `temp/` directory exists in the project root, delete its contents (keep the folder) — *every* file, including screenshots or artifacts the user dropped there themselves. By squeaky time `temp/` is consumed; it is the throwaway zone **by definition**, never an archive. This explicitly **overrides** both the "ask first" caveat below AND any general "don't delete what you didn't create" instinct — `temp/` is carved out of both.
- Delete any `.playwright-mcp/` directories created during the session.
- Check for other session artifacts: `.distill-needed` markers, stale lock files, generated HTML reports.
- Check system temp (`$TEMP` or `/tmp/`) for project-related temp files created this session.

Ask-first applies ONLY to the ambiguous items above (stray artifacts, system-temp files you can't attribute) — **not** to `temp/`, which is always cleared.

### 5. Check for Doc Drift

Quick scan (not a full audit):
- Were any markdown docs modified this session? Run `git diff --name-only | grep '\.md$'`
- If yes, do a 30-second sanity check: does the change in one doc create a contradiction or stale reference in another?
- If drift is likely, suggest: "Docs were modified this session. Consider running /doc-audit before the next major session."

This is a nudge, not a gate. Don't block the cleanup for a full doc audit.

### 6. Commit

Stage all relevant changes and commit with a descriptive message. Follow the repo's commit conventions (check recent git log for style).

Do NOT commit:
- `.env` files or credentials
- Large binary files
- Temp/generated files that should be gitignored

### 7. Push

Push to origin. Verify the push succeeded.

### 8. Cleanup Orphan Dev Processes

Long-running dev servers (vite, wrangler/workerd, webpack, etc.) often
survive past their parent terminal — a single stale process can hold a
port for days, blocking the next session's dev boot. Catch it now while
you're already cleaning up.

By the time we hit step 8, the user has explicitly invoked squeaky-clean
to wrap up the session. Killing dev servers is **safe at squeaky time
specifically** — the user is by definition done. (Mid-session use of
the same cleanup script should stay conservative because the user might
be running the dev server in parallel; that mid-session contract is the
project's to define, not ours.)

This step has TWO halves. **Both must run** — half (a) without half (b)
leaves orphan bash shells in the agent harness even after the OS-level
processes are dead.

#### 8a. Kill OS-level dev server processes

Detection (in order):
1. Check `package.json` for a `dev:cleanup` script. Try the **force
   variant first**: run `pnpm dev:cleanup --force-ports` (or npm/yarn
   equivalent). Projects that support the flag will kill port binders;
   projects that don't will silently treat it as an unknown arg and
   fall through to their default behavior. Either outcome is fine.
2. If no `dev:cleanup` script and the project uses Cloudflare Workers
   (look for `wrangler.toml` / `wrangler.jsonc`), suggest the user run
   the platform-appropriate workerd kill (`taskkill /F /IM workerd.exe`
   on Windows, `pkill workerd` on POSIX) and offer to add a `dev:cleanup`
   script for next time.
3. Otherwise skip silently. Most projects don't need this.

If a project's `dev:cleanup` script reports active port binders
WITHOUT killing them despite the `--force-ports` flag, surface the
report verbatim — the project author made that call deliberately.

#### 8b. Stop background bash shells you launched

When you start a long-running command via Bash with
`run_in_background: true`, the harness gives you a task ID and the
shell stays alive until either (1) the wrapped command exits naturally
or (2) you call `TaskStop` on it. Step 8a kills the OS-level child
process (workerd, vite, etc.) but the **bash parent in the harness
keeps the shell registered as "running"** because nothing told it to
exit. The user sees a hanging shell count even though the server
binary is dead.

This step is required even if step 8a reported "killed" successfully
— their cleanup scripts cannot reach into the agent harness.

Procedure:

1. **Audit the session for `run_in_background: true` Bash calls.**
   Walk back through the conversation and list every task ID you
   launched that way. Common offenders:
   - `pnpm dev`, `pnpm dev:server`, `pnpm dev:launch` (long-running)
   - `until <check>; do sleep N; done` poll-loops
   - `tail -f <log>` (rare in tests, common in debug)
   - Long-running test suites that you switched to background
2. **Filter to the still-running.** Any task ID for which you received
   a `<status>completed</status>` system notification has already
   exited — skip it. Anything else is potentially still alive.
3. **TaskStop each candidate.** A successful stop returns a JSON
   `{message: "Successfully stopped task: ...", task_id, command}`. If
   the task was already dead, the call is still safe (idempotent).

If you cannot remember which IDs you launched, that's a signal you
should have been tracking them — at minimum, scan the conversation
for `run_in_background: true` and grab the IDs from the bash response
blocks.

**Better: prefer harness-managed lifecycle for dev servers.** When a
test framework can spawn + auto-kill the server itself (Playwright's
`webServer` config, Vitest's `globalSetup`, etc.), use that instead of
launching dev servers in background bash. The dev server lives only
for the duration of the test run; no manual cleanup needed.

### 9. Final Verification

Run one last `git status` to confirm:
- Working tree is clean
- Branch is up to date with origin

Only after this step, report: "Squeaky clean." with a brief summary of what was committed.

## What "Clean" Means

Clean means VERIFIED, not BELIEVED. Every claim must be backed by a command you actually ran this checklist:
- "Tests pass" → you ran the tests
- "Typecheck clean" → you ran the typecheck
- "No unexpected files" → you read the git status output
- "Pushed" → you saw the push output
- "Dev processes cleaned" → step 8a's cleanup script ran AND step 8b TaskStop'd every still-alive background bash shell from this session (or confirmed none were launched). One without the other is a false-clean — see the 2026-05-06 session where `dev:cleanup` killed `workerd` + `vite` correctly but two background bash shells (`pnpm dev:server`, an `until` poll-loop) stayed alive in the harness, surfaced only because the user noticed his shell count.

If you can't verify it, don't claim it.
