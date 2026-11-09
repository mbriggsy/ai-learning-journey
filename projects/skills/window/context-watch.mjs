#!/usr/bin/env node
// context-watch.mjs — the window law's watcher, a Claude Code hook on two
// events (~/.claude/settings.json: hooks.PostToolBatch and
// hooks.UserPromptSubmit, both running this file).
//
// Why it exists: the 2026-11-08 audit of the 40/50/60 lines found the numbers
// held and the CHECKING failed. Opus 5.5 is not told how full its own window
// is (the API's context-awareness updates go only to some Sonnet and Haiku
// models), and Claude ran past the lines unchecked at least three times: a b9
// session to 78.5% ("I blew past the 60% context line without checking"),
// another from 8% to 80% "unnoticed", and a fan-out launched before the window
// check. The deepest sessions had nobody watching. So the check no longer waits
// on memory: this reads the size the same way /window does (core.mjs), and the
// first time a session's NEXT request will be past a line, it puts /window's
// own line in front of Claude (additionalContext, which rides with that very
// request) and on Briggsy's screen (systemMessage).
//
// Lines: WARN, NO_FANOUT and WRAP from core.mjs, then every 10 points past the
// wrap line (70, 80, 90), because the unnoticed overruns ran to 78-84%.
//
// Judged one step ahead. The newest usage in the transcript is the input of
// the response that just finished, and that response has already run its
// tools: judged on it alone, a crossing would surface only after the crossing
// step's own tools ran — a fan-out included, the exact failure above (the
// 2026-11-09 review found a real back-nine session launching two agents at 50.0%
// while the hook still read 49.7%). So the trigger is an estimate of the
// next request: that input, plus the response's own output_tokens (the next
// request re-sends it), plus what this event adds before the next request:
//   PostToolBatch    — the batch's tool results, from tool_calls[].tool_response
//   UserPromptSubmit — the prompt being submitted (this event also covers a
//                      crossing made by a reply with no tool calls, which
//                      fires no batch)
// Text is counted at 3 characters a token, an image at 1,600, a PDF at 3,000
// a page, and every estimate carries a fixed slack (plus more on a Skill
// call) for what rides along unseen (the constants below say how each was
// measured). The bias is deliberately early: early by a point beats late by a
// step. The line it prints is that estimate, labeled "Context (next request,
// estimated)", so it can never pass for a live reading.
//
// Transcript lag: Claude Code writes the transcript a beat behind (the hook
// docs: it "may not yet include the current turn's most recent messages").
// On a batch, the response that made it is known by its tool_use ids, so the
// hook waits up to 300 ms for that row to land before reading; past that it
// reads what is there (one step older, so the estimate runs low by that step).
//
// What counts as announced: the RECEIPT, not the attempt. Claude Code records
// each delivered context as a transcript row of attachment.type
// "hook_additional_context"; a batch that ends the turn (StructuredOutput, an
// MCP tool that ends it), an Esc, or a timeout can drop the context, and an
// attempt counted as delivered would then never be repeated (found by the
// 2026-11-09 review with a headless probe). So the state holds the highest
// line whose receipt is in the transcript since the newest compaction, and a
// line with no receipt is announced again on the next event.
//
// State: context-watch.json in the session's own folder beside its transcript
// (<project>/<session id>/), holding { line, offset }: the highest receipted
// line, and how many bytes of the transcript have been scanned for receipts
// and compactions, so each run reads only what was added since. A compaction
// in the scanned part resets the line to 0, so climbing back past a line
// announces it again; nothing else lowers it (the review replayed 419 real
// transcripts: the size never fell without a compaction). A transcript
// shorter than the offset (rewritten) is rescanned from the start.
//
// Never in the way: any failure (bad input, a missing transcript, unreadable
// state) exits 0 with no output, and an event inside a subagent or teammate
// (agent_id set; its input still names the MAIN transcript) is skipped, since
// the law governs the main window only.
//
// Test hook: WINDOW_TEST_TOKENS=<non-negative integer> stands in for the
// reading, as in window.mjs, with nothing added ahead, and the line it
// produces carries the TEST label.

import { readFileSync, writeFileSync, mkdirSync, openSync, readSync, fstatSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { WARN, NO_FANOUT, WRAP, pctOf, contextLine, liveTotal, readLatest, TEST_LABEL } from "./core.mjs";

const LINES = [WARN, NO_FANOUT, WRAP, WRAP + 10, WRAP + 20, WRAP + 30];
const EVENTS = new Set(["PostToolBatch", "UserPromptSubmit"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MARK = "Context watch (the window-law hook";
const HEAD = `${MARK}; first reading past the `;
const RECEIPT_LINE = /first reading past the (\d+)% line/;
const ESTIMATE_LABEL = "Context (next request, estimated)";
const CHARS_PER_TOKEN = 3;
const IMAGE_TOKENS = 1600;
// What a next request carries beyond the results or prompt the hook can see:
// system reminders, attachments, prompts queued mid-turn. In the 2026-11-09
// replay of 426 real transcripts the real next request beat the estimate in
// 99% of batches (median +139 tokens, p99 about +4,100 outside Skill calls),
// and 37 of 210 crossings would have gone out unannounced; with this slack, 1.
const SLACK_TOKENS = 5_000;
// A Skill call's result is only "Launching skill: X"; the skill's body rides
// in as a separate message the hook never sees (replay p99 +16,858).
const SKILL_TOKENS = 17_000;
// A PDF Read returns the whole file as a base64 document block; counted as
// text, a 1 MB PDF read as about 470K tokens and fired a false wrap line.
// Pages are counted from the decoded file instead.
const PDF_PAGE_TOKENS = 3_000;
const PDF_FALLBACK_PAGES = 20;
const WAIT_MS = 300;
const WAIT_STEP_MS = 50;

// The highest line a printed % has reached (0 = below the first line).
function lineOf(pct) {
  let reached = 0;
  for (const l of LINES) if (pct >= l) reached = l;
  return reached;
}

// Tokens a tool result or prompt will add to the next request, estimated.
function estimate(x) {
  if (x == null) return 0;
  if (typeof x === "string") return x.length / CHARS_PER_TOKEN;
  if (Array.isArray(x)) return x.reduce((sum, b) => sum + estimateBlock(b), 0);
  return JSON.stringify(x).length / CHARS_PER_TOKEN;
}
function estimateBlock(b) {
  if (b && b.type === "image") return IMAGE_TOKENS;
  if (b && b.type === "document" && b.source && b.source.type === "base64") {
    const raw = Buffer.from(String(b.source.data ?? ""), "base64").toString("latin1");
    const pages = (raw.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length || PDF_FALLBACK_PAGES;
    return pages * PDF_PAGE_TOKENS;
  }
  if (b && b.type === "text" && typeof b.text === "string") return b.text.length / CHARS_PER_TOKEN;
  return estimate(typeof b === "string" ? b : JSON.stringify(b ?? ""));
}

function readState(path) {
  try {
    const s = JSON.parse(readFileSync(path, "utf8"));
    // A line is only trusted with the offset that backs it: a state with no
    // valid offset (the first version wrote {"line": N} on the ATTEMPT) is
    // rebuilt from the transcript's receipts, from 0.
    const offset = Number.isInteger(s.offset) && s.offset > 0 ? s.offset : 0;
    return { line: offset && Number.isFinite(s.line) ? s.line : 0, offset };
  } catch {
    return { line: 0, offset: 0 };
  }
}

function writeState(path, state) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state) + "\n");
}

// Reads the transcript from state.offset to its last complete line and folds
// in what it finds: a compaction resets the line, a receipt raises it.
function scan(transcript, state) {
  const fd = openSync(transcript, "r");
  try {
    const size = fstatSync(fd).size;
    let { line, offset } = state;
    if (size < offset) {
      line = 0;
      offset = 0;
    }
    if (size === offset) return { line, offset };
    const buf = Buffer.alloc(size - offset);
    readSync(fd, buf, 0, buf.length, offset);
    const end = buf.lastIndexOf(0x0a);
    if (end === -1) return { line, offset }; // no complete line yet
    for (const text of buf.subarray(0, end).toString("utf8").split("\n")) {
      const compaction = text.includes('"compact_boundary"');
      const receipt = text.includes("hook_additional_context") && text.includes(MARK);
      if (!compaction && !receipt) continue;
      let row;
      try {
        row = JSON.parse(text);
      } catch {
        continue;
      }
      if (!row || typeof row !== "object") continue;
      if (row.type === "system" && row.subtype === "compact_boundary") line = 0;
      const a = row.attachment;
      if (row.type === "attachment" && a && a.type === "hook_additional_context" && Array.isArray(a.content)) {
        for (const c of a.content) {
          const m = typeof c === "string" && c.startsWith(MARK) ? c.match(RECEIPT_LINE) : null;
          if (m) line = Math.max(line, Number(m[1]));
        }
      }
    }
    return { line, offset: offset + end + 1 };
  } finally {
    closeSync(fd);
  }
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Whether a transcript row is (part of) the response that called these tools.
function madeBatch(entry, ids) {
  const content = entry?.message?.content;
  return Array.isArray(content) && content.some((b) => b && b.type === "tool_use" && ids.has(b.id));
}

function main() {
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (!input || typeof input !== "object" || input.agent_id) return;
  const event = input.hook_event_name;
  if (!EVENTS.has(event)) return;
  const sid = input.session_id;
  const transcript = input.transcript_path;
  if (!UUID.test(sid ?? "") || typeof transcript !== "string" || !transcript) return;
  const statePath = join(dirname(transcript), sid, "context-watch.json");
  const calls = event === "PostToolBatch" && Array.isArray(input.tool_calls) ? input.tool_calls : [];

  let total;
  let label = "Context";
  const test = process.env.WINDOW_TEST_TOKENS;
  if (test !== undefined) {
    if (!/^\d+$/.test(test)) return;
    total = Number(test);
    label = TEST_LABEL;
  } else {
    const ids = new Set(calls.map((c) => c && c.tool_use_id).filter(Boolean));
    let latest = readLatest(transcript);
    for (let waited = 0; ids.size && latest.usage && !madeBatch(latest.entry, ids) && waited < WAIT_MS; waited += WAIT_STEP_MS) {
      sleep(WAIT_STEP_MS);
      latest = readLatest(transcript);
    }
    if (!latest.usage) {
      // No live reading (nothing measured yet, or a compaction newer than any
      // usage): only fold in what the transcript says, and say nothing.
      writeState(statePath, scan(transcript, readState(statePath)));
      return;
    }
    const adds =
      event === "PostToolBatch"
        ? calls.reduce((sum, c) => sum + estimate(c && c.tool_response) + (c && c.tool_name === "Skill" ? SKILL_TOKENS : 0), 0)
        : estimate(input.prompt);
    const ahead = (latest.usage.output_tokens || 0) + SLACK_TOKENS + adds;
    total = Math.round(liveTotal(latest.usage) + ahead);
    label = ESTIMATE_LABEL;
  }

  const state = scan(transcript, readState(statePath));
  writeState(statePath, state);
  const now = lineOf(pctOf(total));
  if (now <= state.line) return;

  const reading = contextLine(total, label);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext:
          `${HEAD}${now}% line this session): ${reading}. ` +
          "Under the window law (memory user_context_window_1m), each line crossing is relayed to Briggsy in the next message, and the line's tail names the action.",
      },
      systemMessage: reading,
    }),
  );
}

// No process.exit: it can cut off a pending stdout write to a pipe. With every
// fault caught here the script ends on its own with exit code 0.
try {
  main();
} catch {
  // Never in the way: a watcher fault must not touch the tool loop.
}
