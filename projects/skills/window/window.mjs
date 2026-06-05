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

const WRAP = 70; // Briggsy's soft "start a fresh terminal" threshold (%)

function line(msg) {
  console.log(msg);
  process.exit(0);
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

const total =
  (usage.input_tokens || 0) +
  (usage.cache_read_input_tokens || 0) +
  (usage.cache_creation_input_tokens || 0);
const pct = (total / 1_000_000) * 100;

let read;
if (pct < 50) read = "plenty of room";
else if (pct < WRAP) read = `getting up there — ${(WRAP - pct).toFixed(0)}% to your ${WRAP}% wrap line`;
else read = `past your ${WRAP}% wrap line — worth starting a fresh terminal`;

line(`Context: ${total.toLocaleString()} / 1M = ${pct.toFixed(1)}% — ${read}`);
