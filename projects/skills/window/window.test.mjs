// Tests for the window skill: the law and the backward read in core.mjs, the
// /window one-liner's live path (window.mjs), and the context-watch hook that
// announces a line crossing on its own.
// Run: node --test "projects/skills/window/**/*.test.mjs"

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, existsSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WARN, NO_FANOUT, WRAP, contextLine, pctOf, liveTotal, readLatest, TEST_LABEL } from "./core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = join(here, "context-watch.mjs");
const WINDOW = join(here, "window.mjs");
const ESTIMATE = "Context (next request, estimated)";
const SLACK = 5_000; // context-watch.mjs SLACK_TOKENS
const SKILL = 17_000; // context-watch.mjs SKILL_TOKENS
const scratch = mkdtempSync(join(tmpdir(), "window-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

// One assistant row as Claude Code logs it. `n` is the live size (input +
// cache reads + cache writes); `out` its output_tokens; `tools` the ids of
// tool_use blocks in it.
function call(n, { out = 0, tools = [], creation = 0, id = `msg_${n}_${tools.join("_")}` } = {}) {
  const content = tools.length ? tools.map((t) => ({ type: "tool_use", id: t, name: "Bash", input: {} })) : [{ type: "text", text: "ok" }];
  return JSON.stringify({
    type: "assistant",
    message: { id, content, usage: { input_tokens: 2, cache_read_input_tokens: n - 2 - creation, cache_creation_input_tokens: creation, output_tokens: out } },
  });
}
const compaction = JSON.stringify({
  type: "system",
  subtype: "compact_boundary",
  timestamp: "2026-11-08T00:00:00.000Z",
  compactMetadata: { trigger: "auto", preTokens: 485_045, postTokens: 45_821 },
});
const userTurn = JSON.stringify({ type: "user", message: { role: "user", content: "keep going — ✓ ünïcode" } });

let n = 0;
// A fresh project folder with one session transcript; returns its paths.
function session(lines) {
  const sid = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const dir = join(scratch, `proj-${n}`);
  mkdirSync(dir, { recursive: true });
  const transcript = join(dir, `${sid}.jsonl`);
  writeFileSync(transcript, lines.length ? lines.join("\n") + "\n" : "");
  return { sid, transcript, state: join(dir, sid, "context-watch.json") };
}
const append = (s, ...lines) => appendFileSync(s.transcript, lines.join("\n") + "\n");

function hookInput(s, { event = "PostToolBatch", calls = [], prompt = "go", extra = {} } = {}) {
  const base = { session_id: s.sid, transcript_path: s.transcript, hook_event_name: event };
  if (event === "PostToolBatch") base.tool_calls = calls;
  if (event === "UserPromptSubmit") base.prompt = prompt;
  return JSON.stringify({ ...base, ...extra });
}
function childEnv(env = {}) {
  const e = { ...process.env, ...env };
  if (!("WINDOW_TEST_TOKENS" in env)) delete e.WINDOW_TEST_TOKENS;
  return e;
}
function parse(r) {
  return { code: r.status ?? r.code, out: r.stdout, json: r.stdout.trim() ? JSON.parse(r.stdout) : null };
}
// Runs the hook as Claude Code does (JSON on stdin).
function hook(s, opts = {}) {
  const input = opts.raw ?? hookInput(s, opts);
  return parse(spawnSync(process.execPath, [HOOK], { input, encoding: "utf8", env: childEnv(opts.env) }));
}
// What Claude Code writes when it delivers a hook's context: the receipt.
function deliver(s, r) {
  const ev = r.json.hookSpecificOutput.hookEventName;
  append(s, JSON.stringify({ type: "attachment", attachment: { type: "hook_additional_context", content: [r.json.hookSpecificOutput.additionalContext], hookName: ev, hookEvent: ev } }));
}
const stateOf = (s) => (existsSync(s.state) ? JSON.parse(readFileSync(s.state, "utf8")) : undefined);

// ---------------------------------------------------------------- core.mjs

test("the law: 40 / 50 / 60, judged on the printed percent", () => {
  assert.deepEqual([WARN, NO_FANOUT, WRAP], [40, 50, 60]);
  assert.equal(pctOf(399_549), 40);
  assert.match(contextLine(399_549), /= 40\.0% — past the 40% warn line — steer toward a clean milestone; 20\.0% to the 60% wrap line$/);
  assert.match(contextLine(500_000), /= 50\.0% — past 50% — no new fan-outs; 10\.0% to the 60% wrap line$/);
  assert.match(contextLine(599_950), /= 60\.0% — past the 60% wrap line — wrap up and start a fresh terminal$/);
  assert.match(contextLine(120_000), /= 12\.0% — plenty of room$/);
});

test("liveTotal counts input, cache reads and cache writes", () => {
  assert.equal(liveTotal({ input_tokens: 3, cache_read_input_tokens: 300_000, cache_creation_input_tokens: 112_342 }), 412_345);
  assert.equal(liveTotal({ input_tokens: 5 }), 5);
});

test("readLatest: newest usage wins; a newer compaction wins over it; junk is skipped", () => {
  const a = session([call(100_000), userTurn, call(200_000), '{"type":"assistant","message":{"usage":{"input_tok']);
  assert.equal(liveTotal(readLatest(a.transcript).usage), 200_000);
  const b = session([call(300_000), compaction, userTurn]);
  assert.equal(readLatest(b.transcript).compacted.subtype, "compact_boundary");
  assert.equal(readLatest(b.transcript).usage, null);
  const c = session([call(300_000), compaction, call(50_000)]);
  assert.equal(liveTotal(readLatest(c.transcript).usage), 50_000);
  const zero = JSON.stringify({ type: "assistant", message: { usage: { input_tokens: 0, cache_read_input_tokens: 0 } } });
  const d = session([call(70_000), zero]);
  assert.equal(liveTotal(readLatest(d.transcript).usage), 70_000);
  const e = session([]);
  assert.deepEqual(readLatest(e.transcript), { usage: null, compacted: null, entry: null });
});

test("readLatest: a line that parses to null, or to any non-object, is skipped like a broken one", () => {
  const s = session([call(512_000), "null", "42", '"str"', "[]", "true"]);
  assert.equal(liveTotal(readLatest(s.transcript).usage), 512_000);
});

test("readLatest: returns the row it found, so its tool_use ids and output can be read", () => {
  const s = session([call(300_000, { out: 1_234, tools: ["toolu_A"] })]);
  const { entry, usage } = readLatest(s.transcript);
  assert.equal(entry.message.content[0].id, "toolu_A");
  assert.equal(usage.output_tokens, 1_234);
});

test("readLatest: the same answer at every chunk size, across split lines and multi-byte characters", () => {
  const big = JSON.stringify({ type: "user", message: { content: "é—✓🙂".repeat(2_000) } });
  const s = session([call(10_000), big, call(420_000), big, userTurn, big]);
  const want = JSON.stringify(readLatest(s.transcript));
  assert.equal(liveTotal(JSON.parse(want).usage), 420_000);
  for (const size of [1, 2, 3, 7, 64, 4096, 65_537]) assert.equal(JSON.stringify(readLatest(s.transcript, size)), want, `chunk ${size}`);
});

test("readLatest: a line longer than many chunks is joined once, not once per chunk", () => {
  const huge = JSON.stringify({ type: "user", message: { content: "x".repeat(8_000_000) } });
  const s = session([call(333_000), huge]);
  const real = Buffer.concat;
  let joins = 0;
  Buffer.concat = (...a) => {
    joins++;
    return real.apply(Buffer, a);
  };
  let got;
  try {
    got = readLatest(s.transcript, 1024);
  } finally {
    Buffer.concat = real;
  }
  assert.equal(liveTotal(got.usage), 333_000);
  assert.ok(joins <= 2, `an 8 MB line read in 1 KB chunks must be joined once, not per chunk (got ${joins} joins)`);
});

// ------------------------------------------------------- window.mjs, live

// Runs window.mjs against a fake home whose projects folder holds `logs`
// ({ <session id>: [rows] }) for a fresh cwd.
function windowRun({ id, envId, logs }) {
  const home = mkdtempSync(join(scratch, "home-"));
  const cwd = realpathSync(mkdtempSync(join(scratch, "cwd-")));
  const proj = join(home, ".claude", "projects", cwd.replace(/[:\\/]/g, "-"));
  mkdirSync(proj, { recursive: true });
  for (const [sid, lines] of Object.entries(logs)) writeFileSync(join(proj, `${sid}.jsonl`), lines.join("\n") + "\n");
  const env = childEnv({ HOME: home, USERPROFILE: home });
  delete env.CLAUDE_CODE_SESSION_ID; // a live Claude Code shell sets it; the test must not inherit it
  if (envId) env.CLAUDE_CODE_SESSION_ID = envId;
  const r = spawnSync(process.execPath, id ? [WINDOW, id] : [WINDOW], { cwd, encoding: "utf8", env });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("window.mjs live: reads this session's log by id, cache writes included", () => {
  const r = windowRun({ id: A, logs: { [A]: [call(100_000), call(412_345, { creation: 300_000 })], [B]: [call(900_000)] } });
  assert.equal(r.code, 0);
  assert.equal(r.out, contextLine(412_345));
});

test("window.mjs live: a newer compaction prints the compacted line, never the stale size", () => {
  const r = windowRun({ id: A, logs: { [A]: [call(485_045), compaction] } });
  assert.equal(r.code, 0);
  assert.match(r.out, /^Context: compacted \d+ (min|h) ago \(485,045 → a 45,821-token summary\) — no live read since; ask again after one more step\.$/);
});

test("window.mjs live: two ids that disagree fail loudly; no id at all is labeled a GUESS", () => {
  const bad = windowRun({ id: A, envId: B, logs: { [A]: [call(100_000)], [B]: [call(200_000)] } });
  assert.equal(bad.code, 1);
  assert.match(bad.out, /two session ids disagree/);
  const guess = windowRun({ logs: { [A]: [call(250_000)] } });
  assert.equal(guess.code, 0);
  assert.equal(guess.out, contextLine(250_000, "Context (GUESS — no session id; newest log here, maybe another session's)"));
});

// ------------------------------------------------------ context-watch.mjs

test("hook: silent below the first line", () => {
  const s = session([call(300_000)]);
  const r = hook(s);
  assert.equal(r.code, 0);
  assert.equal(r.out, "");
  assert.equal(stateOf(s).line, 0);
});

test("hook: announces a crossing until the transcript shows it was delivered, then never again", () => {
  const s = session([call(300_000), call(412_345)]);
  const r = hook(s);
  assert.equal(r.code, 0);
  assert.equal(r.json.systemMessage, contextLine(412_345 + SLACK, ESTIMATE));
  assert.equal(r.json.hookSpecificOutput.hookEventName, "PostToolBatch");
  assert.ok(r.json.hookSpecificOutput.additionalContext.startsWith("Context watch (the window-law hook; first reading past the 40% line this session): "));
  assert.ok(r.json.hookSpecificOutput.additionalContext.includes(contextLine(412_345 + SLACK, ESTIMATE)));
  // No receipt (the context was dropped: an end-turn batch, an Esc, a timeout): it is said again.
  const again = hook(s);
  assert.equal(again.json.systemMessage, contextLine(412_345 + SLACK, ESTIMATE));
  deliver(s, again);
  append(s, call(430_000));
  assert.equal(hook(s).out, "", "a delivered line is not announced twice");
  assert.equal(stateOf(s).line, 40);
});

test("hook: each line in turn, 40 then 50 then 60, judged on the printed percent", () => {
  const s = session([call(300_000)]);
  for (const [tokens, line, re] of [
    [399_600, 40, /= 40\.0% — past the 40% warn line/],
    [512_000, 50, /past 50% — no new fan-outs/],
    [605_000, 60, /past the 60% wrap line/],
  ]) {
    append(s, call(tokens - SLACK)); // the next request is estimated at exactly `tokens`
    const r = hook(s);
    assert.equal(r.json.systemMessage, contextLine(tokens, ESTIMATE), `${line}%`);
    assert.match(r.json.systemMessage, re);
    assert.ok(r.json.hookSpecificOutput.additionalContext.includes(`first reading past the ${line}% line`));
    deliver(s, r);
    assert.equal(hook(s).out, "");
    assert.equal(stateOf(s).line, line);
  }
});

test("hook: a jump over several lines announces the highest one; past the wrap line it repeats every 10 points", () => {
  const s = session([call(450_000)]);
  deliver(s, hook(s));
  append(s, call(623_000));
  const r = hook(s);
  assert.match(r.json.systemMessage, /past the 60% wrap line/);
  deliver(s, r);
  for (const [tokens, line] of [[701_000, 70], [805_000, 80], [930_000, 90]]) {
    append(s, call(tokens));
    const x = hook(s);
    assert.ok(x.json.hookSpecificOutput.additionalContext.includes(`first reading past the ${line}% line`), `${line}%`);
    deliver(s, x);
  }
  append(s, call(990_000));
  assert.equal(hook(s).out, "", "nothing past 90");
});

test("hook: a compaction resets the watch, so climbing back past a line announces it again", () => {
  const s = session([call(610_000)]);
  deliver(s, hook(s));
  assert.equal(hook(s).out, "");
  append(s, compaction);
  assert.equal(hook(s).out, "", "no live reading right after a compaction");
  assert.equal(stateOf(s).line, 0);
  append(s, call(120_000));
  assert.equal(hook(s).out, "");
  append(s, call(405_000));
  assert.equal(hook(s).json.systemMessage, contextLine(405_000 + SLACK, ESTIMATE));
});

test("hook: without a compaction the line never drops, so a dip and a climb back say nothing", () => {
  const s = session([call(615_000)]);
  deliver(s, hook(s));
  append(s, call(455_000));
  assert.equal(hook(s).out, "");
  append(s, call(605_000));
  assert.equal(hook(s).out, "");
  assert.equal(stateOf(s).line, 60);
});

test("hook: a batch is judged on the next request: this input, its output, and the batch's results", () => {
  const s = session([call(495_000, { out: 2_000, tools: ["toolu_1", "toolu_2"] })]);
  const calls = [
    { tool_name: "Read", tool_use_id: "toolu_1", tool_input: {}, tool_response: "x".repeat(9_000) }, // ~3,000 tokens
    { tool_name: "Read", tool_use_id: "toolu_2", tool_input: {}, tool_response: [{ type: "text", text: "y".repeat(3_000) }] }, // ~1,000
  ];
  const r = hook(s, { calls });
  assert.equal(r.json.systemMessage, contextLine(501_000 + SLACK, ESTIMATE)); // 495,000 + 2,000 out + 4,000 results + slack
  assert.match(r.json.systemMessage, /past 50% — no new fan-outs/);
  const small = session([call(489_000, { out: 500, tools: ["toolu_3"] })]);
  const under = hook(small, { calls: [{ tool_use_id: "toolu_3", tool_response: "ok" }] });
  assert.equal(under.json.systemMessage, contextLine(494_501, ESTIMATE), "still under 50% with the step ahead included");
  assert.match(under.json.systemMessage, /past the 40% warn line/);
});

test("hook: an image result counts 1,600 tokens", () => {
  const s = session([call(398_000 - SLACK, { tools: ["toolu_img"] })]);
  const calls = [{ tool_use_id: "toolu_img", tool_response: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "AAAA" } }] }];
  assert.equal(hook(s, { calls }).json.systemMessage, contextLine(399_600, ESTIMATE));
});

test("hook: a PDF counts 3,000 tokens a page, counted from the file, not its base64 bytes", () => {
  const pdf = (pages) =>
    Buffer.from(
      "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count " + pages + " >> endobj\n" +
        Array.from({ length: pages }, (_, i) => `${3 + i} 0 obj << /Type /Page /Parent 2 0 R >> endobj\n`).join("") +
        "x".repeat(1_000_000) + "\n%%EOF",
      "latin1",
    ).toString("base64");
  const doc = (data) => [{ type: "text", text: "PDF file read" }, { type: "document", source: { type: "base64", media_type: "application/pdf", data } }];
  const s = session([call(300_000, { tools: ["toolu_pdf"] })]);
  const r = hook(s, { calls: [{ tool_name: "Read", tool_use_id: "toolu_pdf", tool_response: doc(pdf(4)) }] });
  assert.equal(r.out, "", "a 1 MB, 4-page PDF is about 12,000 tokens, not 400,000");
  const t2 = session([call(380_000, { tools: ["toolu_pdf2"] })]);
  const r2 = hook(t2, { calls: [{ tool_use_id: "toolu_pdf2", tool_response: doc(Buffer.from("no page objects here").toString("base64")) }] });
  assert.equal(r2.json.systemMessage, contextLine(380_000 + 60_000 + 4 + SLACK, ESTIMATE), "no page markers: 20 pages assumed"); // "PDF file read" = 13 chars ≈ 4
});

test("hook: a Skill call adds the skill body it never sees in the result", () => {
  const s = session([call(380_000, { tools: ["toolu_sk"] })]);
  const r = hook(s, { calls: [{ tool_name: "Skill", tool_use_id: "toolu_sk", tool_response: "Launching skill: x" }] });
  assert.equal(r.json.systemMessage, contextLine(380_000 + 6 + SKILL + SLACK, ESTIMATE)); // 18 chars = 6 tokens
});

test("hook: on a prompt, judged on the last reply's input and output plus the prompt (a crossing by a reply with no tools)", () => {
  const s = session([call(593_000, { out: 1_500 })]);
  const r = hook(s, { event: "UserPromptSubmit", prompt: "z".repeat(1_800) }); // 593,000 + 1,500 + 600 + slack
  assert.equal(r.json.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.equal(r.json.systemMessage, contextLine(600_100, ESTIMATE));
  deliver(s, r);
  assert.equal(hook(s, { event: "UserPromptSubmit" }).out, "");
  assert.equal(hook(s).out, "", "the batch after it knows it was delivered");
});

test("hook: waits for the batch's own response when the transcript is behind, then reads it", async () => {
  const s = session([call(380_000, { tools: ["toolu_old"] })]);
  const input = hookInput(s, { calls: [{ tool_use_id: "toolu_new", tool_response: "ok" }] });
  const child = spawn(process.execPath, [HOOK], { env: childEnv() });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  const done = new Promise((res) => child.on("close", (code) => res(code)));
  child.stdin.end(input);
  setTimeout(() => append(s, call(410_000, { tools: ["toolu_new"] })), 100);
  assert.equal(await done, 0);
  assert.equal(JSON.parse(out).systemMessage, contextLine(410_001 + SLACK, ESTIMATE)); // "ok" = 2 chars, 0.67 tokens
});

test("hook: when the batch's response never lands, it reads what is there after the wait", () => {
  const s = session([call(420_000, { tools: ["toolu_old"] })]);
  const t0 = Date.now();
  const r = hook(s, { calls: [{ tool_use_id: "toolu_missing", tool_response: "" }] });
  assert.ok(Date.now() - t0 >= 250, "it waited");
  assert.equal(r.json.systemMessage, contextLine(420_000 + SLACK, ESTIMATE));
});

test("hook: only a delivered-context row is a receipt; the hook's own stdout row or a quote of the text is not", () => {
  const s = session([call(412_000)]);
  const r = hook(s);
  const text = r.json.hookSpecificOutput.additionalContext;
  append(
    s,
    JSON.stringify({ type: "attachment", attachment: { type: "hook_success", hookEvent: "PostToolBatch", stdout: r.out, content: "" } }),
    JSON.stringify({ type: "attachment", attachment: { type: "hook_system_message", hookEvent: "PostToolBatch", content: r.json.systemMessage } }),
    JSON.stringify({ type: "user", message: { role: "user", content: `hook_additional_context ${text}` } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: `"hook_additional_context" ${text}` }] } }),
  );
  assert.equal(hook(s).json.systemMessage, contextLine(412_000 + SLACK, ESTIMATE), "still not delivered, so said again");
});

test("hook: a transcript rewritten shorter than the scanned offset is rescanned from the start", () => {
  const s = session([call(450_000)]);
  deliver(s, hook(s));
  assert.equal(hook(s).out, "");
  writeFileSync(s.transcript, call(460_000) + "\n"); // rewritten, receipt gone
  assert.equal(hook(s).json.systemMessage, contextLine(460_000 + SLACK, ESTIMATE));
});

test("hook: a state with no valid offset keeps no line: it is rebuilt from the transcript's receipts", () => {
  const s = session([call(420_000)]);
  mkdirSync(dirname(s.state), { recursive: true });
  writeFileSync(s.state, JSON.stringify({ line: 40 }) + "\n"); // the first version's attempt-counted state
  assert.equal(hook(s).json.systemMessage, contextLine(420_000 + SLACK, ESTIMATE), "no receipt in the transcript, so not delivered");
});

test("hook: a subagent's or teammate's event, and any other event, is skipped", () => {
  const s = session([call(650_000)]);
  const sub = hook(s, { extra: { agent_id: "a1b2c3", agent_type: "general-purpose" } });
  assert.equal(sub.code, 0);
  assert.equal(sub.out, "");
  assert.equal(stateOf(s), undefined);
  assert.equal(hook(s, { event: "Stop" }).out, "");
  assert.equal(stateOf(s), undefined);
});

test("hook: never in the way: bad input, a missing transcript, a bad id all exit 0 with no output", () => {
  const s = session([call(650_000)]);
  for (const raw of ["", "not json", "null", "[]", JSON.stringify({ session_id: s.sid, hook_event_name: "PostToolBatch" })]) {
    const r = hook(s, { raw });
    assert.equal(r.code, 0, raw);
    assert.equal(r.out, "", raw);
  }
  const gone = hook(s, { extra: { transcript_path: join(scratch, "nope", `${s.sid}.jsonl`) } });
  assert.equal(gone.code, 0);
  assert.equal(gone.out, "");
  const badId = hook(s, { extra: { session_id: "../../etc" } });
  assert.equal(badId.code, 0);
  assert.equal(badId.out, "");
  const corrupt = session([call(650_000)]);
  mkdirSync(dirname(corrupt.state), { recursive: true });
  writeFileSync(corrupt.state, "{oops");
  assert.match(hook(corrupt).json.systemMessage, /past the 60% wrap line/, "an unreadable state counts as nothing delivered yet");
});

test("hook: WINDOW_TEST_TOKENS stands in for the reading, labeled TEST, nothing added ahead; a bad value is silent", () => {
  const s = session([call(100_000, { out: 50_000 })]);
  const r = hook(s, { env: { WINDOW_TEST_TOKENS: "410000" }, calls: [{ tool_use_id: "t", tool_response: "x".repeat(90_000) }] });
  assert.equal(r.json.systemMessage, contextLine(410_000, TEST_LABEL));
  const t = session([call(100_000)]);
  const bad = hook(t, { env: { WINDOW_TEST_TOKENS: "lots" } });
  assert.equal(bad.code, 0);
  assert.equal(bad.out, "");
});
