---
name: squeaky-clean
description: End-of-session cleanup automation. Runs the full shutdown checklist — TODO update, typechecks, git verification, temp cleanup, commit, push.
user-invocable: true
disable-model-invocation: true
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

- If a `temp/` directory exists in the project root, delete its contents but keep the folder.
- Delete any `.playwright-mcp/` directories created during the session.
- Check for other session artifacts: `.distill-needed` markers, stale lock files, generated HTML reports.
- Check system temp (`$TEMP` or `/tmp/`) for project-related temp files created this session.

Don't delete anything you're not sure about — ask first.

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

### 8. Final Verification

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

If you can't verify it, don't claim it.
