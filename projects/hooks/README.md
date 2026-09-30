# Hooks

**Status: COMPLETE** — deployed and enforcing.

### Claude Code SessionStart, PreToolUse, PostToolUse & Stop Hooks

---

Blocking hooks that enforce the distill-and-brief knowledge loop, plus the session-start manifesto injection and its config-liveness check. Deployed at `~/.claude/hooks/`, configured in `~/.claude/settings.json`.

---

## Platform Findings

Discovered through empirical testing. Filed as [anthropics/claude-code#42250](https://github.com/anthropics/claude-code/issues/42250).

1. **Only error-path output reaches the model** — `{"decision":"block"}` and stderr (exit 2) deliver. All non-blocking formats silently discarded. (SessionStart's `additionalContext` is the exception: it delivers — session transcripts carry it as a `hook_additional_context` attachment.)
2. **PostToolUse block delivers without undoing the tool result** — useful for reminders after skill completion.
3. **PreToolUse hooks don't fire on user slash commands** — only on Claude's programmatic Skill invocations. PostToolUse and Stop hooks fire in both cases.
4. **A `Skill` hook sees the skill name in `.tool_input.skill`** — exactly the string passed to the Skill tool: a plugin skill as `<plugin>:<skill>` (e.g. `compound-engineering:ce-code-review`), a `~/.claude/skills` or project skill bare (e.g. `ultramode-code-review`). A case-arm name that is not in the installed roster never matches and never says so — `check-config-liveness.mjs` exists to say so.

---

## The Hooks

### enforce-brief-before-work.sh

| | |
|---|---|
| **Type** | PreToolUse |
| **Matcher** | Skill |
| **Blocks** | the `ce-work` skill — `compound-engineering:ce-work` (Claude invocations only) |
| **Until** | `/brief` runs |

Gates `ce-work` behind `/brief` so the agent loads documented gotchas from `docs/insights/` before starting work. Uses a marker file (`/tmp/.brief-gate`). Also clears the distill marker when `/distill` runs.

**Workflow and Agent builds are NOT hook-gated — by design.** The gate matches the `Skill` tool only, so a build driven through the Workflow or Agent tools never passes through it. Retargeting the gate onto those tools was considered and rejected (2026-09-30): it would be a new cage on every fan-out, not a brief. The /brief-before-a-unit law for those builds lives in skill and TODO text. The dead `ce:work` and `distill-and-brief:*` aliases were pruned the same day (no such plugin or skill is installed; the liveness check flagged them).

### remind-distill-after-work.sh

| | |
|---|---|
| **Type** | PostToolUse |
| **Matcher** | Skill |
| **Fires after** | `ce-work`, `ce-code-review`, `ultramode-code-review` (bare and `compound-engineering:`-prefixed forms) |

Drops a marker file (`/tmp/.distill-needed`) as a silent side effect. No output — the Stop hook handles delivery at the right moment.

Until 2026-09-30 the review arm matched `ce:review|ce-review|compound-engineering:ce-review` — a skill CE 3.14.3 does not ship (its review skill is `ce-code-review`) — so no review ever set the marker, and nothing said so.

### stop-distill-gate.sh

| | |
|---|---|
| **Type** | Stop |
| **Matcher** | (all) |
| **Blocks** | Claude from stopping if `.distill-needed` exists |

Fires when Claude tries to finish responding. If the distill marker exists (set by PostToolUse after ce-work or a code review), blocks with a reminder to run `/distill`. Clears the marker on block so the agent isn't stuck in a loop.

This is the key timing innovation — Stop hooks fire when work is actually DONE, not when the skill loads.

### block-webfetch.sh

| | |
|---|---|
| **Type** | PreToolUse |
| **Matcher** | WebFetch |
| **Blocks** | `WebFetch` tool |
| **Redirects to** | `mcp__gemini-grounding__search_with_grounding` or `curl --max-time 15` |

Unrelated to the knowledge loop. `WebFetch` has no timeout — agents hang indefinitely. The gemini-grounding server's tools are `search_with_grounding`, `search_documentation`, `search_developer_resources` and `search_reddit`; the redirect named a nonexistent `web_search` until 2026-09-30.

### elite-engineer-session-start.sh

| | |
|---|---|
| **Type** | SessionStart |
| **Matcher** | (all) |
| **Delivers** | The Elite Engineer Protocol manifesto as `additionalContext` on every new Claude Code session, plus a `CONFIG LIVENESS WARNINGS` block only when the liveness check finds something. |

Unrelated to the knowledge loop. Guarantees Claude sees Briggsy's non-negotiable quality bar at the start of every session — no relying on memory being loaded, no relying on "Claude remembers this project." The hook reads the deployed manifesto at `~/.claude/manifesto/elite-engineer.md` and emits a SessionStart JSON envelope with the content.

Paired file — **`elite-engineer.md`** — the manifesto (its source copy lives in this folder; `wc -l` it rather than trusting a line count here — this README said 38 lines long after it had grown to 88). "You are elite. Quality is the deliverable. Here are the non-negotiable rules. Here's the test before every claim." The hook is a thin transport; the manifesto is the payload.

**Rationale:** Captured 2026-04-22 after a sloppy session where Claude called a broken feature "hardened" after writing unit tests around it. Briggsy's direction: *"Figure out a way to NEVER forget that with me. Build software around it, whatever, you can't say you forgot."* Memory files were not enough — SessionStart injection is the mechanism that guarantees delivery.

If `elite-engineer.md` is missing at runtime the hook emits a WARNING payload instead of silently failing — Claude sees the warning on session start and must restore the file before claiming any work is done. (That early-exit branch does not run the liveness check.)

### check-config-liveness.mjs

| | |
|---|---|
| **Type** | Called by `elite-engineer-session-start.sh` — no hook entry of its own |
| **Runs** | Every session start, `/usr/bin/timeout 3 node ~/.claude/hooks/check-config-liveness.mjs` (~0.1 s; a PATH `timeout` is used only if it reports GNU coreutils) |
| **Prints** | NOTHING when all green; otherwise a short `CONFIG LIVENESS WARNINGS` block, appended to the manifesto's `additionalContext` |

Added 2026-09-30 after one research pass found three dead-and-silent wiring defects at once (the `ce:review` arm, the `web_search` redirect, a stale Serena permission). A hook that never matches looks exactly like a hook with nothing to say, so the check looks for the wiring itself:

1. **A skill name in a hook's case-arm that is not installed.** It reads every `case` whose subject variable was assigned from `.tool_input.skill`, in every `.sh` a settings hook command names plus `~/.claude/hooks/*.sh`, and judges **each alternative on its own** — a dead alias beside a live one is still flagged, because a whole dead arm can hide inside a mixed one (the original `ce:work|…|ce:review|…` arm was exactly that). The roster: every **enabled** plugin in `~/.claude/plugins/installed_plugins.json` (`installPath` → `skills/<dir>` and `commands/*.md`, in bare and `<plugin>:<name>` form, plus each `SKILL.md`'s frontmatter `name:`), `~/.claude/skills/*`, `~/.claude/commands/*.md`, and `<dir>/.claude/skills/*` + `<dir>/.claude/commands/*.md` for the project dir and every ancestor.
2. **A settings.json hook (or `statusLine`) command whose script path does not exist** — a token with a script/executable extension and a directory part, after expanding `~`, `$HOME` and `$CLAUDE_PROJECT_DIR`.
3. **A `~/.claude/skills` (or `<project>/.claude/skills`) entry that is a junction/symlink whose target does not resolve.**

**It must never break the manifesto injection.** Each check runs in its own try/catch and an error drops that check's findings (a half-built roster never produces false alarms — an unreadable `installed_plugins.json` skips the skill-name check); the whole script is wrapped and always exits 0; the output is ASCII-only; the session-start hook runs it under `timeout 3`, skips it if `node` or a GNU `timeout` is missing (Windows `system32\timeout.exe` is never used — it rejects the arguments and would silently skip the check), and discards its output on any non-zero exit. Fault-injected 2026-09-30 (syntax error, top-level throw, infinite loop, non-zero exit, `node` absent from PATH): every case still emitted valid JSON carrying the manifesto byte-for-byte.

**Run it by hand:** `node ~/.claude/hooks/check-config-liveness.mjs --debug` (roster size and scanned scripts on stderr). Test-only overrides: `--claude-dir`, `--settings`, `--hook <file>` (repeatable), `--skills-dir`, `--project-dir` — point them at scratch copies, never at a live hook.

**What it does not check:** MCP tool names inside hook text or CLAUDE.md (e.g. the `search_with_grounding` redirect) — enumerating a server's tools means starting the server, which a session-start hook must not do.

---

## The Full Chain

```
User: "run ce-work on Phase X plan"

1. Claude invokes compound-engineering:ce-work
   → PreToolUse BLOCKS: "run /brief first"

2. Claude invokes /brief
   → PreToolUse: marker created, allowed through
   → /brief loads insights into conversation

3. Claude re-invokes compound-engineering:ce-work
   → PreToolUse: marker consumed, allowed through
   → PostToolUse: drops /tmp/.distill-needed (silent)
   → ce-work loads, agent follows instructions

4. ... work happens ...

5. Claude tries to stop
   → Stop hook: marker exists → BLOCK: "run /distill"

6. Claude invokes /distill
   → PreToolUse: clears marker, allowed through
   → Agent captures insights (or confirms nothing to capture)

7. Claude tries to stop again
   → Stop hook: no marker → allowed through
```

A code review (`compound-engineering:ce-code-review` or `ultramode-code-review`) enters at step 3's PostToolUse: no brief gate, but the distill marker drops the same way.

**Known limit:** both markers are single global files under `/tmp`, shared by every concurrent session and subagent on the machine — a Skill call in one session can set (or consume) a marker another session's hook then reads.

---

## Deployment

Scripts deployed at `~/.claude/hooks/`. The Elite Engineer manifesto deploys alongside at `~/.claude/manifesto/elite-engineer.md` (sibling directory — content vs code separation). Configuration in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/elite-engineer-session-start.sh" }] }
    ],
    "PreToolUse": [
      { "matcher": "WebFetch", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/block-webfetch.sh" }] },
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/enforce-brief-before-work.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/remind-distill-after-work.sh" }] }
    ],
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/stop-distill-gate.sh" }] }
    ]
  }
}
```

This project folder is source control. The deployed copies at `~/.claude/hooks/` (and the manifesto at `~/.claude/manifesto/`) are the live versions.

**Install / re-sync:**

```bash
# Shell hooks + the liveness check the session-start hook calls
cp projects/hooks/*.sh projects/hooks/check-config-liveness.mjs ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh

# Elite Engineer manifesto — goes to a sibling dir, NOT ~/.claude/hooks/
mkdir -p ~/.claude/manifesto
cp projects/hooks/elite-engineer.md ~/.claude/manifesto/elite-engineer.md
```

After any source edit in this folder, re-run the copy, then `cmp` each pair — the live and tracked copies must stay byte-identical. The hook reads the manifesto at `~/.claude/manifesto/elite-engineer.md` at session start, so the runtime copy is what Claude sees.
