---
title: On a git index several sessions share, every write must name its paths, and "mine" must be proven, never assumed
date: 2026-10-21
phase: our-setup U29 (peer-safe squeaky-clean)
modules: [projects/skills/squeaky-clean/scripts/commit-mine.mjs, projects/skills/squeaky-clean/scripts/mine-paths.mjs, projects/skills/squeaky-clean/scripts/peers.mjs]
tags: [git, shared-index, peer-sessions, commit-only, pathspec, literal-pathspec, index-lock, ownership, transcripts, squeaky-clean]
---

## Problem
Several Claude Code sessions work in one monorepo checkout, so they share one working tree and one git index. The pre-U29 end-of-session skill:
- staged broadly and committed the whole index;
- deleted a held `index.lock`;
- ran machine-wide dev-process kills.

Monorepo commit `c5e2d08b`, a Back Nine solver commit, also carries a family-feud insight rename that another session had staged.

## Root Cause
Three shared resources were treated as private:
- **The index.** `git add <mine>` followed by a plain `git commit` commits everything staged, a peer's entries included.
- **`index.lock`.** A held lock is another git process in the middle of a write; deleting it breaks that write.
- **The process table.** A kill by image name reaches every repo on the machine.

"Mine" was assumed, not proven: nothing records which session wrote a dirty file.

## Fix
- **Commit:** `git add` only the new files proven mine. Then run `git commit --only -F <msg> --pathspec-from-file=<list> --pathspec-file-nul`, with every entry written as `:(literal)<path>`.
  - git's docs: `--only` takes "the updated working tree contents of the paths specified … disregarding any contents that have been staged for other paths".
  - NUL-separated lists plus `:(literal)` keep a file name from acting as a flag, a glob or pathspec magic.
- **On a failure after the add,** unstage only the entries whose index blob is still the one we staged. Any other entry may be a peer's by now.
- **`index.lock`:** retry with backoff, then report. Never delete it.
- **Kills:** only when the session registry shows no other live session anywhere.
- **Proving "mine"** until a write-time ledger exists: exact replay. Replaying this session's recorded Edit/Write ops from `HEAD:<path>` must reproduce the disk bytes; anything else is contested and needs a human yes. That yes is bound to a content sha, checked again just before the commit.
- **Transcript facts that bit:**
  - A record's `cwd` is stamped AFTER the call, so a command holding a `cd` leaves its relative paths unresolvable.
  - Evidence must expire at the path's last commit.
  - Subagent and workflow transcripts carry the parent's session id.

## Key Insight
On a shared index, any git verb that runs without a path list acts on peers: a plain `commit`, `reset`, `stash`, `add -A`, `checkout .`.
- Name the paths on every write.
- Take the paths from proof, not inference.
- When the proof fails, ask instead of acting. A skipped commit costs one question. A swept or deleted peer change costs work that nobody can see is gone.

## Also Applies To
- Any script or hook that commits on a session's behalf: deploy tools, doc audits, auto-commit hooks.
- Any cleanup that deletes from a shared folder (`temp/`, screenshot drops).
- Any kill by name (`workerd`, `node`) on a machine where other sessions run dev servers.
