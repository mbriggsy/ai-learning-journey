---
created: 2026-05-09
type: workflow-reference
covers: Cowork mode (Claude desktop)
aliases: [cowork, cowork-mode, desktop-claude]
tags: [cowork, claude-mode, playbook]
---

# Cowork Mode

Most of this playbook is implicitly about Claude Code. This page covers **Cowork** — Claude's desktop mode for file/task work outside a dev terminal. Different surface, different reflexes, same Claude underneath.

## What Cowork is (and isn't)

**Is:**
- A Claude desktop session with file tools (Read/Write/Edit), a sandboxed Linux shell, and access to a folder you mount
- Good at: file-shaped work, doc maintenance, vault upkeep, cross-folder operations, MCP connector calls (Slack, Linear, Notion, etc.), creating artifacts that persist across sessions
- Where you do *non-code* work with Claude — the playbook audit, daily notes, anything that's not happening inside a project repo

**Isn't:**
- Claude Code. No `/squeaky-clean`, no `/distill`, no project CLAUDE.md auto-loading, no SessionStart hooks, no `~/.claude/manifesto/elite-engineer.md`
- A persistent assistant. Each Cowork session starts cold — folder access does NOT carry over, and there's no project memory file Cowork loads on its own
- The right tool for code work. Use Claude Code for code. Cowork is for everything around the code.

## When to reach for Cowork (vs. Claude Code)

| Reach for Cowork | Reach for Claude Code |
|---|---|
| Maintaining the playbook vault | Coding inside a project |
| Cross-cutting file ops (move, rename, audit) on non-repo folders | Anything that benefits from `/squeaky-clean`, `/distill`, `/brief` |
| Calling MCP connectors (Slack, Linear, Notion, Google Drive) | Any work where session memory pays rent |
| Creating an artifact (live HTML view that pulls fresh connector data) | Project-scoped work with a CLAUDE.md and TODO.md |
| One-off tasks where dev tooling would be overkill | Multi-session workflows that lean on the manifesto |

If you're not sure: code work → Claude Code. Everything else → start in Cowork, switch if the task pulls you into a repo.

## The cold-start problem

Cowork starts every session blind. Three things to fix on the way in:

1. **Mount the folder.** Cowork can only read/write folders you've explicitly granted access to. Re-grant on every session.
2. **Orient.** Send a one-shot orientation prompt — Cowork doesn't auto-load anything from the vault. The pattern that works:
   > *"Read OBSIDIAN.md, _HOME.md, and briggsy-playbook/principles.md before doing anything else."*
3. **Point at the work.** If you're resuming a long-running task, point Cowork at the checkpoint section of the relevant doc (see next section).

## Session checkpoint pattern (resume across sessions)

Cowork forgets everything between sessions. The vault doesn't. So: write the resumption state into the vault.

When wrapping up a multi-session task in Cowork, append a **Session checkpoint** section to whatever doc was the work product. Include:

- **Last worked on:** date
- **Status table:** what's done, what's pending, what's blocked, why
- **Open questions for next session:** the things that need your input before we proceed
- **Resume prompt:** the literal text to paste into the next Cowork session, including which folders to mount

The next Cowork session, opened cold, reads the checkpoint and picks up clean. `PLAYBOOK-AUDIT.md` is the canonical example of this pattern — see its bottom section.

The same trick works for any long-running task — write the resumption state into the work product itself, not into a separate "session log" doc that Cowork won't know to look at.

## Cowork-specific tools worth knowing

- **Artifacts** — Cowork can create a self-contained HTML page that persists across sessions and pulls fresh data from connectors each time it's opened. Useful for status pages, recurring reports, anything you'll want to re-open. Reach for this when the answer is something you'll want refreshed later, not just answered once.
- **Scheduled tasks** — Cowork can create tasks that run on demand or on a recurring schedule. Different from Claude Code skills; lives at the Cowork layer.
- **MCP connectors** — Cowork has a registry of connectors (Slack, Linear, Notion, GitHub, Atlassian, BigQuery, Figma, etc.) that authenticate per-session and let Claude operate on those services directly. Tell Cowork what tool you want to use; if it's in the registry, it'll suggest connecting.
- **Skills** — Cowork ships its own skill set (separate from Claude Code's). Examples: `pptx`, `docx`, `xlsx`, `pdf`, `data:analyze`, `engineering:debug`, `design:design-critique`. Many require connectors to be useful. Use them like Claude Code skills — by name.
- **Bash sandbox** — Cowork has a Linux shell at `/sessions/.../mnt/...` that mirrors your mounted folders. Useful for `ls`, `find`, `grep`, quick scripts. Each call is independent (no cwd carryover between calls — use absolute paths).

## Things that DON'T translate from Claude Code

- Slash commands you built (`/squeaky-clean`, `/distill`, `/brief`, `/ce:plan`, etc.). Cowork has its own skill system; your custom Claude Code skills don't appear here. If you want the *behavior* of one of those skills in Cowork, describe what you want and Cowork will execute it manually.
- The manifesto (`~/.claude/manifesto/elite-engineer.md`). Cowork doesn't auto-load it. If you want manifesto-level discipline in Cowork, paste the relevant section into the orientation prompt OR point Cowork at the file.
- Claude's project memory (`~/.claude/projects/.../memory/`). Cowork doesn't auto-read it. If you want a memory loaded, ask explicitly: *"read the memory at <path>."*

## Origin

This file added 2026-05-09 during the playbook audit (L1 finding). The pattern of "use Cowork to maintain the vault, and write checkpoints into the work product so the next cold-start session can resume" was already established by the time this got written — `PLAYBOOK-AUDIT.md` is the proof of concept.

#cowork #playbook #workflow
