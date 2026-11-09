#!/usr/bin/env node
// Context-window check. Locates THIS session's JSONL transcript by its
// session id, scans backward for the most recent `usage` block, and prints a
// single phone-friendly line.
//
// Why backward-scan-first-hit: the last assistant message's usage reflects
// what Anthropic's API saw on input for the current turn = the live context
// size. Matches /context within ~2 points (the drift is a few messages of
// conversation between the two reads). See reference-context-window-check.

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
// The window law (the WARN / NO_FANOUT / WRAP numbers and the line's wording)
// and the backward read of a transcript live in core.mjs, shared with the
// context-watch hook so the two can never disagree.
import { contextLine, liveTotal, readLatest, TEST_LABEL } from "./core.mjs";

function line(msg, code = 0) {
  console.log(msg);
  process.exit(code);
}

function report(total, label = "Context") {
  line(contextLine(total, label));
}

// Test hook: WINDOW_TEST_TOKENS=<non-negative integer> skips the transcript
// read and reports that token total through the same formatting path, so every
// tier can be exercised without a live session at that size. Any other value
// fails loudly (exit 1) instead of silently reporting the real session. The
// test line is LABELED as such (core.mjs TEST_LABEL).
const testTokens = process.env.WINDOW_TEST_TOKENS;
if (testTokens !== undefined) {
  if (!/^\d+$/.test(testTokens)) {
    line(`Context: WINDOW_TEST_TOKENS must be a non-negative integer, got "${testTokens}" (unset it for a live read).`, 1);
  }
  report(Number(testTokens), TEST_LABEL);
}

const projects = join(homedir(), ".claude", "projects");
// cwd -> project slug: Claude Code replaces `:`, `\`, `/` with `-`.
const slug = process.cwd().replace(/[:\\/]/g, "-");

// WHICH transcript: this session's, by id — never "the newest file". Two
// sessions in one project each write their own transcript, so mtime names
// whichever wrote last: on 2026-10-16 a 3-day session at ~55% ran beside a
// fresh one at ~9%, their logs written 9 s apart — either could have been
// read for the other, the full one told "plenty of room" off its
// neighbor's number. Claude Code exports CLAUDE_CODE_SESSION_ID to the Bash
// environment — the session_id its hooks receive; the transcript is
// `<id>.jsonl`. SKILL.md also passes the skill-substituted
// ${CLAUDE_SESSION_ID} as argv[2]. A non-UUID argument (the shell expanding
// an unfilled placeholder to "") is ignored; two valid ids that DISAGREE are
// reported, never resolved by guessing which one is live.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ids = [process.argv[2], process.env.CLAUDE_CODE_SESSION_ID].filter((v) => UUID.test(v ?? ""));
if (ids.length === 2 && ids[0].toLowerCase() !== ids[1].toLowerCase()) {
  line(`Context: two session ids disagree (skill ${ids[0]}, env ${ids[1]}) — can't tell which is live.`, 1);
}
const sessionId = ids[0];

let transcript;
let label = "Context";
if (sessionId) {
  // The cwd's project folder first, then every other one: a `cd` moves the
  // cwd, never the transcript.
  const dirs = existsSync(projects) ? [slug, ...readdirSync(projects).filter((d) => d !== slug)] : [];
  transcript = dirs.map((d) => join(projects, d, `${sessionId}.jsonl`)).find((p) => existsSync(p));
  if (!transcript) line(`Context: no transcript for this session (${sessionId}) yet.`);
} else {
  // No id at all (run by hand, outside Claude Code): fall back to the newest
  // log in this folder — and LABEL it, since a concurrent session can own it.
  const dir = join(projects, slug);
  if (!existsSync(dir)) line(`Context: no session logs for this project yet (${slug}).`);
  const logs = readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ path: join(dir, f), m: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (logs.length === 0) line("Context: no session log found yet.");
  transcript = logs[0].path;
  label = "Context (GUESS — no session id; newest log here, maybe another session's)";
}

// A COMPACTION after the last measured turn makes that measure stale. On
// 2026-10-20 the harness compacted this project's session while it sat idle
// (both times ~55 min after a turn ended: 212,652 → 43,451 and 485,045 →
// 45,821). /window, run as the next turn's first step, reported the
// pre-compaction 48.3% while the live context was ~12.3%: the backward scan
// passed the `compact_boundary` entry and the newest usage behind it was the
// old one (a turn's own usage lands in the log only after its first tool call
// returns). The boundary's postTokens counts the summary alone (the re-sent
// system prompt, tools and memory sit outside it), so it is no estimate of
// the live size either: say there is no live read instead of guessing.
function compactedLine(entry) {
  const meta = entry.compactMetadata || {};
  const mins = Math.round((Date.now() - Date.parse(entry.timestamp)) / 60_000);
  const age = !Number.isFinite(mins) ? "" : mins < 90 ? ` ${mins} min ago` : ` ${Math.round(mins / 60)} h ago`;
  const sizes =
    Number.isFinite(meta.preTokens) && Number.isFinite(meta.postTokens)
      ? ` (${meta.preTokens.toLocaleString()} → a ${meta.postTokens.toLocaleString()}-token summary)`
      : "";
  return `Context: compacted${age}${sizes} — no live read since; ask again after one more step.`;
}

// The newest usage or compact_boundary, read backward from the end (core.mjs).
const { usage, compacted } = readLatest(transcript);
if (compacted) line(compactedLine(compacted));
if (!usage) line("Context: no usage data in the active session yet.");

report(liveTotal(usage), label);
