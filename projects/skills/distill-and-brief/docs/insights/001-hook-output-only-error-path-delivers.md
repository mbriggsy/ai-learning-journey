---
title: Hook platform behavior — three findings from empirical testing
date: 2026-04-01
modules: [hooks]
tags: [hooks, platform-bug, blocking, PostToolUse, PreToolUse, slash-commands]
---

## Problem

Hook behavior is undocumented and inconsistent. Three major findings from exhaustive testing (7 output formats, Pre and Post, user vs Claude invocations).

## Finding 1: Only error-path output reaches the model

Non-blocking hook output is silently discarded. Tested 7 formats on both PreToolUse and PostToolUse:

- `{"decision":"block","reason":"..."}` (exit 0) — **DELIVERED**
- stderr text (exit 2) — **DELIVERED**
- plain text, systemMessage, decision:allow+reason, hookSpecificOutput, continue+systemMessage — **ALL DROPPED**

The platform has two output paths: error (delivers) and non-error (broken).

## Finding 2: PostToolUse block delivers without undoing the tool result

`{"decision":"block"}` on PostToolUse delivers the message as a system-reminder AND preserves the tool's output. The "block" is meaningless after the fact, but the delivery path works. This is useful for reminders after skill completion.

## Finding 3: PreToolUse hooks don't fire on user slash commands

When the USER types `/ce:work`, PreToolUse hooks with matcher "Skill" do NOT fire. Proven with side-effect test (`touch` a file) — file never created. When CLAUDE invokes the same skill via the Skill tool, PreToolUse fires and blocks correctly. PostToolUse fires in both cases.

| | User slash command | Claude Skill tool |
|---|---|---|
| PreToolUse | does NOT fire | fires |
| PostToolUse | fires | fires |

## Finding 4: Stop hooks fire at the right moment for end-of-work reminders

PostToolUse fires when a skill LOADS, not when work finishes. For long-running skills like `/ce:work`, the reminder arrives too early and gets buried. Stop hooks fire when Claude tries to finish responding — the actual end of work. Combining PostToolUse (silent marker) + Stop hook (blocking delivery) gives correct timing.

## Fix

- Use `{"decision":"block"}` for all hook-to-model communication
- PreToolUse enforcement only works on Claude's programmatic Skill invocations, not user commands
- PostToolUse for silent side effects (marker files), Stop hooks for end-of-work delivery
- Filed as [anthropics/claude-code#42250](https://github.com/anthropics/claude-code/issues/42250)

## Key Insight

Don't trust hook behavior based on docs or assumptions. Test with side effects (file creation) to verify hooks actually execute, and test with both user and Claude invocations — they behave differently.

## Also Applies To

Any hook-based enforcement workflow. If the user is the one typing the slash command, PreToolUse cannot gate it. Only PostToolUse fires reliably for user-initiated skills.
