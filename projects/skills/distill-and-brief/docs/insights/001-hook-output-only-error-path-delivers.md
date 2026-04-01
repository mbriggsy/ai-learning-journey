---
title: Hook output only delivers via error paths — both Pre and PostToolUse
date: 2026-04-01
modules: [hooks]
tags: [hooks, platform-bug, blocking, PostToolUse, PreToolUse]
---

## Problem

Non-blocking hook output never reaches Claude. Tested 7 formats across both PreToolUse and PostToolUse — only 2 deliver.

## Root Cause

The Claude Code platform only delivers hook output through error/rejection paths. Any non-error output (`exit 0` + stdout in any JSON format) is silently discarded. The two working paths are:

1. `{"decision":"block","reason":"..."}` with `exit 0`
2. stderr text with `exit 2`

Both are error signals — one is structured rejection, the other is shell failure. The platform routes them the same way: "something went wrong, tell the model."

## Fix

Use `{"decision":"block","reason":"..."}` for all hook-to-model communication. On PreToolUse this blocks the tool (expected). On PostToolUse this delivers the message WITHOUT undoing the tool result — the "block" is meaningless after the fact, but the delivery path works.

## Key Insight

It's not that "block" has special magic. The platform has two output paths: error (delivers) and non-error (broken). Any hook that needs to talk to Claude must use an error signal. This applies identically to PreToolUse and PostToolUse.

## Also Applies To

Any future hook that needs to deliver context, reminders, or instructions to the model. Don't waste time trying non-blocking formats — they're all broken. Use the error path.
