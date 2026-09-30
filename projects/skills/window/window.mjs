#!/usr/bin/env node
// Context-window check. Self-locates the active session's JSONL transcript
// from the current working directory, scans backward for the most recent
// `usage` block, and prints a single phone-friendly line.
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

// cwd -> project slug: Claude Code replaces `:`, `\`, `/` with `-`.
const slug = process.cwd().replace(/[:\\/]/g, "-");
const dir = join(homedir(), ".claude", "projects", slug);
if (!existsSync(dir)) line(`Context: no session logs for this project yet (${slug}).`);

// Newest .jsonl in the project dir = the active session.
const logs = readdirSync(dir)
  .filter((f) => f.endsWith(".jsonl"))
  .map((f) => ({ path: join(dir, f), m: statSync(join(dir, f)).mtimeMs }))
  .sort((a, b) => b.m - a.m);
if (logs.length === 0) line("Context: no session log found yet.");

const lines = readFileSync(logs[0].path, "utf8").split("\n");
let usage = null;
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i].trim()) continue;
  try {
    const u = (JSON.parse(lines[i]).message || {}).usage;
    if (u && (u.input_tokens || u.cache_read_input_tokens || u.cache_creation_input_tokens)) {
      usage = u;
      break;
    }
  } catch {
    /* skip non-JSON / partial lines */
  }
}
if (!usage) line("Context: no usage data in the active session yet.");

report(
  (usage.input_tokens || 0) +
    (usage.cache_read_input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0),
);
