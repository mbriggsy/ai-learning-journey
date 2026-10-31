# Hooks

**Status: active.** Two hook scripts: the session-start manifesto (with its config-liveness check) and the WebFetch blocker. `~/.claude/settings.json` also carries an inline Notification hook (a Windows message box when Claude needs attention) that has no script here.

### Claude Code SessionStart & PreToolUse Hooks

---

Small scripts Claude Code runs by itself at set moments: one loads the Elite Engineer manifesto at the start of every session, the other blocks the WebFetch tool. Deployed at `~/.claude/hooks/`, configured in `~/.claude/settings.json`.

**No hook enforces /brief or /distill** (Briggsy's decision, 2026-10-31). The flow runs because every session's close names the next step in the TODO's START HERE line, and because ultramode's last step is /distill ([playbook/principles.md](../../playbook/principles.md#how-we-work)). The skill-name hooks that tried it (`enforce-brief-before-work.sh`, `remind-distill-after-work.sh`, `stop-distill-gate.sh`) held nothing or fired at the wrong moment: the brief gate guarded only the `ce-work` skill, which builds no longer use, and the distill gate armed when a review skill loaded and fired at Claude's next turn end, minutes before a long review was done (6 times in 6 review sessions checked from 10-20 to 10-31, 5 of them waved off). Don't add a flow hook without a time a step START HERE named was skipped.

---

## Platform Findings

Discovered through testing. The first was filed as [anthropics/claude-code#42250](https://github.com/anthropics/claude-code/issues/42250).

1. **Hook output reaches the model on more events than #42250 said.** That issue (2026-04) found only error-path output (`{"decision":"block"}`, or stderr with exit 2) delivered. Since then: SessionStart's `additionalContext` delivers (transcripts carry it as a `hook_additional_context` attachment); PreToolUse can return `additionalContext` (Claude Code 2.1.9); Stop and SubagentStop can return it to give Claude feedback and keep the turn going (2.1.163); and a probe measured it reaching the model on PostToolUse and Stop ([playbook insight 003](../../playbook/docs/insights/003-a-rule-about-the-platform-is-a-map-until-a-run-measures-it-whoever-wrote-it-a-verdict-holds-only-for-its-bytes.md)).
2. **A PostToolUse block delivers without undoing the tool result.**
3. **PreToolUse hooks don't fire on user slash commands**, only on Claude's own tool calls. PostToolUse and Stop hooks fire in both cases.
4. **A `Skill` hook sees the skill name in `.tool_input.skill`**: exactly the string passed to the Skill tool, a plugin skill as `<plugin>:<skill>` (e.g. `compound-engineering:ce-code-review`), a `~/.claude/skills` or project skill bare (e.g. `ultramode-code-review`). A case-arm name that is not in the installed roster never matches and never says so; `check-config-liveness.mjs` exists to say so.
5. **`onFailure: "block"` makes a guard fail CLOSED** (Claude Code ≥ 2.1.295, set per hook in `settings.json`). Without it, a hook that can't start, times out, or exits with an unexpected code is a non-blocking error and the tool runs anyway. `block-webfetch.sh` carries it since 2026-10-08, proven with a missing-script hook in a headless run: with the flag the call was refused (`failed; blocking because onFailure is "block"`), without it the same call ran. It is **ignored on Stop / SubagentStop / TaskCompleted / TeammateIdle** (the binary logs `onFailure: "block" is ignored on Stop`). The advisory SessionStart and Notification hooks don't carry it: a broken reminder must not block work. **Landmine:** a session reloads `settings.json` when it changes, but if its file watcher misses an edit, a fail-closed guard whose script was deleted refuses every matching call until that session restarts. Remove a guard's settings entry before deleting its script.

---

## The Hooks

### block-webfetch.sh

| | |
|---|---|
| **Type** | PreToolUse |
| **Matcher** | WebFetch |
| **Blocks** | `WebFetch` tool |
| **Redirects to** | `mcp__gemini-grounding__search_with_grounding` or `curl --max-time 15` |

`WebFetch` has no timeout, so agents hang indefinitely. The gemini-grounding server's tools are `search_with_grounding`, `search_documentation`, `search_developer_resources` and `search_reddit`; the redirect named a nonexistent `web_search` until 2026-09-30.

### elite-engineer-session-start.sh

| | |
|---|---|
| **Type** | SessionStart |
| **Matcher** | (all) |
| **Delivers** | The Elite Engineer Protocol manifesto as `additionalContext` on every new Claude Code session, plus a `CONFIG LIVENESS WARNINGS` block only when the liveness check finds something. |

Guarantees Claude sees Briggsy's non-negotiable quality bar at the start of every session: no relying on memory being loaded, no relying on "Claude remembers this project." The hook reads the deployed manifesto at `~/.claude/manifesto/elite-engineer.md` and emits a SessionStart JSON envelope with the content.

Paired file: **`elite-engineer.md`**, the manifesto (its source copy lives in this folder; `wc -l` it rather than trusting a line count here, because this README said 38 lines long after it had grown to 88). "You are elite. Quality is the deliverable. Here are the non-negotiable rules. Here's the test before every claim." The hook is a thin transport; the manifesto is the payload.

**Rationale:** Captured 2026-04-22 after a sloppy session where Claude called a broken feature "hardened" after writing unit tests around it. Briggsy's direction: *"Figure out a way to NEVER forget that with me. Build software around it, whatever, you can't say you forgot."* Memory files were not enough; SessionStart injection is the mechanism that guarantees delivery.

If `elite-engineer.md` is missing at runtime the hook emits a WARNING payload instead of silently failing: Claude sees the warning on session start and must restore the file before claiming any work is done. (That early-exit branch does not run the liveness check.)

### check-config-liveness.mjs

| | |
|---|---|
| **Type** | Called by `elite-engineer-session-start.sh`, with no hook entry of its own |
| **Runs** | Every session start, `/usr/bin/timeout 3 node ~/.claude/hooks/check-config-liveness.mjs` (~0.1 s; a PATH `timeout` is used only if it reports GNU coreutils) |
| **Prints** | NOTHING when all green; otherwise a short `CONFIG LIVENESS WARNINGS` block, appended to the manifesto's `additionalContext` |

Added 2026-09-30 after one research pass found three dead-and-silent wiring defects at once (a skill-name arm matching no installed skill, the `web_search` redirect, a stale Serena permission). A hook that never matches looks exactly like a hook with nothing to say, so the check looks for the wiring itself:

1. **A skill name in a hook's case-arm that is not installed.** It reads every `case` whose subject variable was assigned from `.tool_input.skill`, in every `.sh` a settings hook command names plus `~/.claude/hooks/*.sh`, and judges **each alternative on its own**: a dead alias beside a live one is still flagged, because a whole dead arm can hide inside a mixed one. The roster: every **enabled** plugin in `~/.claude/plugins/installed_plugins.json` (`installPath` → `skills/<dir>` and `commands/*.md`, in bare and `<plugin>:<name>` form, plus each `SKILL.md`'s frontmatter `name:`), `~/.claude/skills/*`, `~/.claude/commands/*.md`, and `<dir>/.claude/skills/*` + `<dir>/.claude/commands/*.md` for the project dir and every ancestor. No live hook reads a skill name today, so this check has nothing to scan until one does.
2. **A settings.json hook (or `statusLine`) command whose script path does not exist**: a token with a script/executable extension and a directory part, after expanding `~`, `$HOME` and `$CLAUDE_PROJECT_DIR`.
3. **A `~/.claude/skills` (or `<project>/.claude/skills`) entry that is a junction/symlink whose target does not resolve.**

**It must never break the manifesto injection.** Each check runs in its own try/catch and an error drops that check's findings (a half-built roster never produces false alarms: an unreadable `installed_plugins.json` skips the skill-name check); the whole script is wrapped and always exits 0; the output is ASCII-only; the session-start hook runs it under `timeout 3`, skips it if `node` or a GNU `timeout` is missing (Windows `system32\timeout.exe` is never used: it rejects the arguments and would silently skip the check), and discards its output on any non-zero exit. Fault-injected 2026-09-30 (syntax error, top-level throw, infinite loop, non-zero exit, `node` absent from PATH): every case still emitted valid JSON carrying the manifesto byte-for-byte.

**Run it by hand:** `node ~/.claude/hooks/check-config-liveness.mjs --debug` (roster size and scanned scripts on stderr). Test-only overrides: `--claude-dir`, `--settings`, `--hook <file>` (repeatable), `--skills-dir`, `--project-dir`. Point them at scratch copies, never at a live hook.

**What it does not check:** MCP tool names inside hook text or CLAUDE.md (e.g. the `search_with_grounding` redirect): enumerating a server's tools means starting the server, which a session-start hook must not do.

---

## Deployment

Scripts deployed at `~/.claude/hooks/`. The Elite Engineer manifesto deploys alongside at `~/.claude/manifesto/elite-engineer.md` (sibling directory: content vs code separation). Configuration in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/elite-engineer-session-start.sh" }] }
    ],
    "PreToolUse": [
      { "matcher": "WebFetch", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/block-webfetch.sh", "onFailure": "block" }] }
    ],
    "Notification": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "powershell.exe -Command \"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Claude Code needs your attention', 'Claude Code')\"" }] }
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

# Elite Engineer manifesto: goes to a sibling dir, NOT ~/.claude/hooks/
mkdir -p ~/.claude/manifesto
cp projects/hooks/elite-engineer.md ~/.claude/manifesto/elite-engineer.md
```

After any source edit in this folder, re-run the copy, then `cmp` each pair: the live and tracked copies must stay byte-identical. The hook reads the manifesto at `~/.claude/manifesto/elite-engineer.md` at session start, so the runtime copy is what Claude sees.
