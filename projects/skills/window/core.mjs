// The window law and the one reading every context check shares. window.mjs
// (the /window one-liner) and context-watch.mjs (the hook that fires the line
// on its own when a session crosses one) both import from here, so the
// numbers, the wording and the way the live size is read can never drift
// apart between the two.

import { openSync, readSync, fstatSync, closeSync } from "node:fs";

// THE STANDING WINDOW LAW (% of the 1M window): Briggsy set the 60% stop on
// 2026-07-12 and added the 40/50 checkpoints on 2026-09-08 (memory
// user_context_window_1m.md; re-audited on Opus 5.5 2026-11-08 — the numbers
// held). THIS FILE IS THE SINGLE SOURCE of the three numbers; every doc that
// states them cites these constants. A law change edits here first, then
// greps every method file for the OLD value.
export const WARN = 40; // say so out loud; shape the remaining work toward a clean milestone
export const NO_FANOUT = 50; // no new fan-outs that cannot finish inside the remaining budget
export const WRAP = 60; // wrap to a milestone, write the TODO, start a fresh terminal

const WINDOW = 1_000_000;

// The % as printed (rounded to 0.1). Every tier is judged on THIS value, so
// the tier always agrees with the number printed beside it: 39.96% prints as
// 40.0% and reads as past the warn line, never as "plenty of room".
export function pctOf(total) {
  return Math.round((total / WINDOW) * 1000) / 10;
}

// The tail of the one line.
export function headroomRead(pct) {
  const toWrap = `${(WRAP - pct).toFixed(1)}% to the ${WRAP}% wrap line`;
  if (pct >= WRAP) return `past the ${WRAP}% wrap line — wrap up and start a fresh terminal`;
  if (pct >= NO_FANOUT) return `past ${NO_FANOUT}% — no new fan-outs; ${toWrap}`;
  if (pct >= WARN) return `past the ${WARN}% warn line — steer toward a clean milestone; ${toWrap}`;
  return "plenty of room";
}

export function contextLine(total, label = "Context") {
  return `${label}: ${total.toLocaleString()} / 1M = ${pctOf(total).toFixed(1)}% — ${headroomRead(pctOf(total))}`;
}

// Test hook, shared: WINDOW_TEST_TOKENS=<non-negative integer> stands in for
// the live read, and every line built from it carries this label, so a stray
// variable (a settings.json env block, a shell profile) can never pass a
// made-up number off as a live read.
export const TEST_LABEL = "Context (TEST — WINDOW_TEST_TOKENS is set, not a live read)";

// The live context size of a turn: what the API saw on input.
export function liveTotal(usage) {
  return (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
}

// The newest reading in a transcript, scanning backward from the end: the last
// assistant `usage` (the live size), or — when one comes first — a
// `compact_boundary`, which makes every usage behind it stale (see window.mjs
// on 2026-10-20). Returns { usage, compacted, entry }: at most one of usage
// and compacted is set, and entry is the whole row that was found (the
// watcher reads its tool_use ids and output_tokens), or null.
//
// It reads from the END in chunks instead of loading the file: a long session's
// transcript runs to tens of MB, and the watcher hook runs this after every
// tool batch. A chunk boundary can split a line, so the part of a chunk before
// its first newline is held back until an earlier chunk supplies the line's
// start. The held pieces are joined once, when that start turns up, so a line
// longer than many chunks costs one copy, not one per chunk. Lines are split
// on the newline BYTE, which never occurs inside a multi-byte UTF-8 character,
// so no character is cut in half. A line that does not parse (the writer
// mid-line) is skipped, as before.
export function readLatest(path, chunkSize = 1 << 20) {
  const fd = openSync(path, "r");
  try {
    let pos = fstatSync(fd).size;
    let held = []; // pieces of one line still missing its start, newest first
    while (pos > 0) {
      const len = Math.min(chunkSize, pos);
      pos -= len;
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, pos);
      const nl = pos > 0 ? buf.indexOf(0x0a) : -1;
      if (pos > 0 && nl === -1) {
        held.push(buf);
        continue;
      }
      // Everything from just after this chunk's first newline (or from the
      // file's first byte) through the held pieces is whole lines.
      const head = pos > 0 ? buf.subarray(nl + 1) : buf;
      const whole = held.length ? Buffer.concat([head].concat(held.reverse())) : head;
      held = pos > 0 ? [buf.subarray(0, nl)] : [];
      const lines = whole.toString("utf8").split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        const hit = classify(lines[i]);
        if (hit) return hit;
      }
    }
    return { usage: null, compacted: null, entry: null };
  } finally {
    closeSync(fd);
  }
}

function classify(line) {
  if (!line.trim()) return null;
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    return null; // non-JSON / partial line
  }
  // A line that parses to null would throw on the field reads below; the old
  // whole-file scan kept them inside its try and skipped it. Keep skipping it.
  if (entry === null || typeof entry !== "object") return null;
  if (entry.type === "system" && entry.subtype === "compact_boundary") return { usage: null, compacted: entry, entry };
  const u = (entry.message || {}).usage;
  if (u && (u.input_tokens || u.cache_read_input_tokens || u.cache_creation_input_tokens)) {
    return { usage: u, compacted: null, entry };
  }
  return null;
}
