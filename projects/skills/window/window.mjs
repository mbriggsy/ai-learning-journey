#!/usr/bin/env node
// Context-window check. Locates THIS session's JSONL transcript by its
// session id, scans backward for the most recent `usage` block, and prints a
// single phone-friendly line.
//
// Why backward-scan-first-hit: the last assistant message's usage reflects
// what Anthropic's API saw on input for the current turn = the live context
// size. Matches /context within ~2 points (the drift is a few messages of
// conversation between the two reads). See reference-context-window-check.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// THE STANDING WINDOW LAW (% of the 1M window): Briggsy set the 60% stop on
// 2026-07-12 and added the 40/50 checkpoints on 2026-09-08 (memory
// user_context_window_1m.md). THIS FILE IS THE SINGLE SOURCE of the three
// numbers; every doc that states them cites these constants. A law change
// edits here first, then greps every method file for the OLD value.
const WARN = 40; // say so out loud; shape the remaining work toward a clean milestone
const NO_FANOUT = 50; // no new fan-outs that cannot finish inside the remaining budget
const WRAP = 60; // wrap to a milestone, write the TODO, start a fresh terminal

function line(msg, code = 0) {
  console.log(msg);
  process.exit(code);
}

// The tail of the one line. `pct` is the DISPLAYED value (rounded to 0.1), so
// the tier always agrees with the number printed beside it: 39.96% prints as
// 40.0% and reads as past the warn line, never as "plenty of room".
function headroomRead(pct) {
  const toWrap = `${(WRAP - pct).toFixed(1)}% to the ${WRAP}% wrap line`;
  if (pct >= WRAP) return `past the ${WRAP}% wrap line — wrap up and start a fresh terminal`;
  if (pct >= NO_FANOUT) return `past ${NO_FANOUT}% — no new fan-outs; ${toWrap}`;
  if (pct >= WARN) return `past the ${WARN}% warn line — steer toward a clean milestone; ${toWrap}`;
  return "plenty of room";
}

function report(total, label = "Context") {
  const pct = Math.round((total / 1_000_000) * 1000) / 10;
  line(`${label}: ${total.toLocaleString()} / 1M = ${pct.toFixed(1)}% — ${headroomRead(pct)}`);
}

// Test hook: WINDOW_TEST_TOKENS=<non-negative integer> skips the transcript
// read and reports that token total through the same formatting path, so every
// tier can be exercised without a live session at that size. Any other value
// fails loudly (exit 1) instead of silently reporting the real session. The
// test line is LABELED as such, so a stray variable (a settings.json env block,
// a shell profile) can never pass a made-up number off as a live read.
const TEST_LABEL = "Context (TEST — WINDOW_TEST_TOKENS is set, not a live read)";
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

const lines = readFileSync(transcript, "utf8").split("\n");
let usage = null;
let compacted = null;
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i].trim()) continue;
  try {
    const entry = JSON.parse(lines[i]);
    if (entry.type === "system" && entry.subtype === "compact_boundary") {
      compacted = entry;
      break;
    }
    const u = (entry.message || {}).usage;
    if (u && (u.input_tokens || u.cache_read_input_tokens || u.cache_creation_input_tokens)) {
      usage = u;
      break;
    }
  } catch {
    /* skip non-JSON / partial lines */
  }
}
if (compacted) line(compactedLine(compacted));
if (!usage) line("Context: no usage data in the active session yet.");

report(
  (usage.input_tokens || 0) +
    (usage.cache_read_input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0),
  label,
);
