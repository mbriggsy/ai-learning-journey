---
name: squeaky-clean
description: End-of-session cleanup automation. Trigger when the user says "squeaky", "squeaky clean", "let's get squeaky", or any other end-of-session shutdown signal. Runs the full checklist — TODO update, typechecks, git verification, temp cleanup, commit, push, orphan dev-process cleanup, and a handoff message to the successor session when Briggsy named one.
user-invocable: true
---

End-of-session cleanup. Every step runs in order — don't skip, don't reorder. If a step fails, stop and fix it before continuing. Never declare "clean" until every step is verified.

Other Claude sessions share this working tree and its git index. One rule runs through every step: **this session touches only what this session made.** You know which files those are: every Edit, Write and `git` call of yours is in this conversation. Everything else dirty in the tree belongs to someone else; list it, leave it.

## The Checklist

### 0. Wait for Your Own Background Work, Then See Who Else Is Here

If this session launched a background Workflow or agent that hasn't sent its completion notice, it may still be writing files. Name it, end the turn, and start again at step 0 when its notice arrives. Never stop one unasked: a stop mid-edit leaves its edits half-applied. (Background shells are step 8b's.)

Then run `ListAgents` (load it with ToolSearch if it is deferred). Note every other session that is local (any kind except `Remote Control` and `cloud`, which run on another machine or in the cloud) and not `offline`: those are live on this machine, busy or idle. Steps 4, 8a and 10 use this list.

### 1. Update TODO.md

If TODO.md exists in the project root, update it to reflect reality:
- Current state (build and gate status by exit code, bundle sizes; a test or open count only where the project gives it no single gated home — a TODO that says its counts live elsewhere, e.g. under a doc-stats gate, gets the gate's NAME, never its numbers — run the actual commands, don't copy from memory)
- Next steps in priority order
- Landmines (known issues, gotchas, things that'll bite the next session)

Rules:
- TODO is for actionable items ONLY. No session history, no "What We Did" logs. Git log has the history.
- PRUNE before you write the new close block: cut every earlier session block whose NEXT list the new one supersedes — AFTER migrating its landmines and still-live items (an OWED, an unfinished fix, a "read run X first", a ⚑ negative) into the standing sections (the landmines section, the ranked list, or the project's register). Keep only the newest close block.
- Unfinished fixes must be prescriptions, not diagnoses. Write the exact file, line, and change needed.
- Run real commands to get real numbers. Never copy stats from another doc.
- If another live session has uncommitted edits in TODO.md (`git diff -- TODO.md` shows lines you didn't write), don't edit it: put your close block in the final report and say TODO.md was left for its owner.

If TODO.md doesn't exist, skip this step.

### 2. Run Typechecks

Detect the project's typecheck command:

1. Check `package.json` for a `typecheck` script → run `pnpm typecheck` (or npm/yarn equivalent)
2. If no typecheck script, check for `tsconfig.json` → run `tsc --noEmit`
3. If no TypeScript, check for `pyproject.toml` or `setup.py` → run `mypy .` or `pyright`
4. If none of the above, skip with a note: "No typecheck configured."

Typechecks must pass in this session's code. Fix a failure in a file this session changed. A failure in a file another live session is changing is that session's to fix: name the file and the error in the final report and go on.

### 3. Verify Git Status

Run `git status --short` and sort every dirty path into two lists:
- **Mine:** the paths this session changed (its Edit, Write and `git rm`/`git mv` calls). Look for surprises: a path you don't remember changing isn't yours.
- **Theirs:** everything else. A peer's, a scheduled task's, anything you can't place. Never commit, stage, unstage, revert, stash or delete these, and don't ask about them; list them in the report.

Flag anything in **Mine** that must not be committed (.env, credentials, large binaries, temp or generated files). If something looks wrong, ask before going on.

### 4. Clean Temp Files

- **`temp/`:** delete only the files this session created or read (Briggsy's screenshots for this session included), never a folder, a link or a `*.lock`. Leave the rest: it may be another session's. Never ask about `temp/`.
- **Never delete a lock or another session's marker:** `.git/index.lock`, `/tmp/.distill-needed`, `/tmp/.brief-gate`, or any marker this session didn't create. If `.git/index.lock` exists, report its path and age: a peer's commit may be holding it.
- **`.playwright-mcp/` folders, generated HTML reports and system-temp files:** delete what this session created only when step 0 found no other live session; otherwise list them and leave them (a `.playwright-mcp/` folder belongs to every session in that folder). This session's own scratchpad folder is always yours to clean.

### 5. Check for Doc Drift

Quick scan (not a full audit):
- Were any markdown docs in **Mine**?
- If yes, do a 30-second sanity check: does the change in one doc create a contradiction or stale reference in another?
- If drift is likely, suggest: "Docs were modified this session. Consider running /doc-audit before the next major session."

This is a nudge, not a gate. Don't block the cleanup for a full doc audit.

### 6. Commit

Commit only **Mine**, by name, so a peer's staged files stay out:

```bash
git add -- <each new file of mine>
git commit -m "<message>" -- <every path in Mine>
```

Follow the repo's commit conventions (check recent git log for style). Never `git commit -a`, `git add .`, `git add -A`, a plain `git commit`, or a `git stash` / `git reset` / `git checkout .` / `git restore .` without paths: each of those acts on every session's files.

Do NOT commit:
- `.env` files or credentials
- Large binary files
- Temp/generated files that should be gitignored

Then read `git show --stat HEAD`: it must list only **Mine**.

### 7. Push

Fetch first. Never pull or merge into a tree other sessions share.

```bash
git fetch
git rev-list --left-right --count '@{u}...HEAD'
git log --oneline '@{u}..HEAD'
```

The count is `<behind> <ahead>`. The log lists every commit the push will send: name in the report any this session didn't make (a peer's). They're on the shared branch already, so the push still goes ahead.
- **Behind > 0: don't push.** Report "N behind origin; committed locally as <sha>, not pushed."
- Ahead 0: nothing to push; say so.
- Otherwise `git push` — never `--force`, `--force-with-lease`, `-f` or a `+` refspec. Verify the push succeeded.

### 8. Cleanup Orphan Dev Processes

Long-running dev servers (vite, wrangler/workerd, webpack, etc.) often
survive past their parent terminal — a single stale process can hold a
port for days, blocking the next session's dev boot. Catch it now while
you're already cleaning up.

#### 8a. Kill OS-level dev server processes

**Only when step 0 found no other live session.** These kills reach the
whole machine: a project's `dev:cleanup` can kill every `workerd.exe`, and
an idle session may keep its own dev server running. Otherwise skip 8a and
say so: "Skipped dev-process cleanup: <name> is live."

When 8a runs, detection (in order):
1. Check `package.json` for a `dev:cleanup` script. Try the **force
   variant first**: run `pnpm dev:cleanup --force-ports` (or npm/yarn
   equivalent). Projects that don't support the flag fall through to
   their default behavior. Either outcome is fine.
2. If no `dev:cleanup` script and the project uses Cloudflare Workers
   (look for `wrangler.toml` / `wrangler.jsonc`), run the workerd kill
   yourself — Briggsy never runs commands: `taskkill /F /IM workerd.exe`
   from PowerShell, `taskkill //F //IM workerd.exe` from Git Bash (MSYS
   rewrites a bare `/F` into a path). Then offer to add a `dev:cleanup`
   script for next time.
3. Otherwise skip silently. Most projects don't need this.

If a project's `dev:cleanup` script reports active port binders
WITHOUT killing them despite the `--force-ports` flag, surface the
report verbatim — the project author made that call deliberately.

#### 8b. Stop background bash shells you launched

This half **always runs**, even when 8a was skipped: these shells are
this session's own. A Bash call with `run_in_background: true` stays
registered in the harness until its command exits or you `TaskStop` it,
even after 8a killed the server binary underneath it.

1. **List every `run_in_background: true` Bash call this session made.**
   Common offenders: `pnpm dev`, `until <check>; do sleep N; done`
   poll-loops, `tail -f`, long test runs switched to background.
2. **Skip the ones whose `<status>completed</status>` notice arrived.**
3. **TaskStop the rest.** It is safe on a task that already ended.

Better: when a test framework can spawn and kill the server itself
(Playwright's `webServer`, Vitest's `globalSetup`), use that instead of
a background dev server.

### 9. Final Verification

```bash
git status --short
git rev-list --left-right --count '@{u}...HEAD'
```

Confirm:
- No path in **Mine** is dirty, except ones you left out on purpose (name each one and why).
- The branch is not behind its upstream, and nothing is left unpushed, unless step 7 stopped, which you report as such.

Only after this step, report: "Squeaky clean." with a brief summary: the commit's sha and files, then what was left for others (the **Theirs** paths and the other live sessions). Never say "working tree is clean" while a **Theirs** path is dirty; say "my paths are clean; N paths left for their owners."

### 10. Hand Off to the Successor

Run this step only when Briggsy named a successor this session: the session that picks up when this one closes ("b9-2 is watching", "hand off to our setup 7"). It is the last thing squeaky does, after a stop too: a close that stopped is what the successor most needs to hear. With no successor named, end with "No handoff: no successor was named this session."

1. Run `ListAgents` again. The successor is the one live local session (step 0's kind) whose name is exactly the name Briggsy gave, ignoring case. A nickname finds nothing, by design: a near-miss can wake the wrong session.
   - None: end with "No handoff: no live session on this machine is named <name>." If some names contain his, add "<each name> only contains it."
   - More than one live match: end with "No handoff: <name> matches <each name [ref]>."
2. Send one `SendMessage` to it. When other rows (offline, Remote Control or cloud) share its name, address it as `<name> [ref]`, copying the `[ref]` from its ListAgents row; a bare name is refused when names clash. The first line carries the outcome: `Handoff: squeaky clean, your turn.`, or `Handoff: not clean, <what step 9's report led with>; your turn.` Then one line each:
   - Committed: the sha and its file count, pushed or not and why.
   - Start here: the path and line where this close wrote the next work (TODO.md's start-here line, a memory file), or "none written". If TODO.md was left for its owner, put the close block in the message itself.
   - Checks: each build, gate and typecheck command with its exit code; or "none run".
   - Left in the tree: the **Theirs** paths by count, the other live sessions by name, and 8a's skip line if it skipped.
   - Waiting on Briggsy: each stop or question only he can clear.
3. The message reports; it never asks the successor to do what this session couldn't or wasn't allowed to. Name files by path: an `@` attaches nothing on the other side.
4. On a successful send, end with "Handed off to <name>." (it reached the inbox, not that it was read). If the send errors, don't retry; end with "No handoff: the send to <name> failed: <error>." After the send, this session edits and commits nothing: the successor is already working in the same files.

If a `[Cross-session delivery notice]` says the successor held or refused the message, tell Briggsy, and don't send it again. A successor in a different permission mode holds the message for its user's approval, which overnight nobody gives: keep both sessions in the same mode.

## What "Clean" Means

Clean means VERIFIED, not BELIEVED. Every claim must be backed by a command you actually ran this checklist:
- "Tests pass" → you ran the tests
- "Typecheck clean" → you ran the typecheck and it passed; a failure in another session's file is reported file by file, never as clean
- "No unexpected files" → you read the git status output and sorted every path into **Mine** or **Theirs**
- "Committed" → `git show --stat HEAD` lists only **Mine**
- "Pushed" → `git fetch` showed the branch not behind, and you saw the push output
- "Dev processes cleaned" → step 8a ran (or was skipped for a live session you named) AND step 8b TaskStop'd every still-alive background shell from this session (or confirmed none were launched). One without the other is a false-clean — see the 2026-05-06 session where `dev:cleanup` killed `workerd` + `vite` correctly but two background bash shells stayed alive in the harness, surfaced only because the user noticed his shell count.
- "Handed off" → `SendMessage` succeeded for the one live session it matched; that proves delivery, never that it was read.

If you can't verify it, don't claim it.
