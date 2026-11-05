// The probe's assertions on fixture transcripts in the measured field names (message.id with
// repeated rows, effort and perTurnEffort, <task-notification> rows and attachments, tool-result
// texts), so each one is known to fail on the case it guards before it is trusted on a live run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { checkAlive, checkDenials, checkEnv, checkOpusXhigh, checkPaging, checkRelay, checkResumeRefused, decoysOf, decoyTargets, DECOY_TARGETS, DONE } from "./probe.mjs";
import { readTree } from "../transcripts.mjs";
import { makeSession, resultRow, tmpRoot, turnRow } from "../testkit.mjs";

const SID = "77777777-7777-4777-8777-777777777777";
const note = (toolUseId) => ({ type: "user", message: { role: "user", content: `<task-notification>\n<task-id>w1</task-id>\n<tool-use-id>${toolUseId}</tool-use-id>\n<status>completed</status>\n</task-notification>` } });
const wfCall = turnRow({ id: "m1", tools: [{ id: "toolu_wf", name: "Workflow", input: { scriptPath: "x" } }] });
const endTurn = (id) => turnRow({ id, stop: "end_turn" });
const midTurnNote = (toolUseId) => ({ type: "attachment", attachment: { type: "queued_command", prompt: note(toolUseId).message.content } });

function session(t, { main, helper = [turnRow({ id: "h1" })], agent = [turnRow({ id: "a1" })] }) {
  const projects = join(tmpRoot(t), "projects");
  return readTree(makeSession(projects, "C--copy-p1", SID, { main, agents: [agent], workflows: { "wf_p-0001": { helpers: [helper] } } }));
}

const finished = { terminal_reason: "completed", result: `all done\n${DONE}`, modelUsage: { "claude-opus-5-5": { contextWindow: 1_000_000 } } };

test("rows on Opus at xhigh pass; each of the three rules fails alone, naming the row", (t) => {
  const good = session(t, { main: [wfCall, endTurn("m2")] });
  assert.equal(checkOpusXhigh([good], [finished]).pass, true);
  for (const [bad, shows] of [
    [turnRow({ id: "h2", effort: "high" }), /h2: claude-opus-5-5 high\/high/],
    [turnRow({ id: "h2", perTurnEffort: "high" }), /h2: claude-opus-5-5 xhigh\/high/],
    [turnRow({ id: "h2", perTurnEffort: null }), /h2: claude-opus-5-5 xhigh\/null/],
    [turnRow({ id: "h2", model: "claude-sonnet-5-5" }), /h2: claude-sonnet-5-5 xhigh\/xhigh/],
  ]) {
    const r = checkOpusXhigh([session(t, { main: [wfCall, endTurn("m2")], helper: [turnRow({ id: "h1" }), bad] })], [finished]);
    assert.equal(r.pass, false);
    assert.equal(r.evidence.failingRows.length, 1);
    assert.match(r.evidence.failingRows[0], shows);
  }
});

test("a context window other than the daily sessions' 1M, or no helper turns, fails", (t) => {
  const s = session(t, { main: [wfCall, endTurn("m2")] });
  assert.equal(checkOpusXhigh([s], [{ modelUsage: { "claude-opus-5-5": { contextWindow: 200_000 } } }]).pass, false);
  const noAgent = session(t, { main: [wfCall, endTurn("m2")], agent: [{ type: "user", message: { content: "x" } }] });
  assert.equal(checkOpusXhigh([noAgent], [finished]).pass, false);
});

test("a session that ended before its Workflow's notification fails the completion check; one that waited across a turn end passes", (t) => {
  const ended = session(t, { main: [wfCall, resultRow("toolu_wf", "launched"), endTurn("m2")] });
  assert.equal(checkAlive(ended, { ...finished, result: "waiting for the workflow" }).pass, false);
  const noTurnAfter = session(t, { main: [wfCall, resultRow("toolu_wf", "launched"), endTurn("m2"), note("toolu_wf")] });
  assert.equal(checkAlive(noTurnAfter, finished).pass, false);
  const ok = session(t, { main: [wfCall, resultRow("toolu_wf", "launched"), endTurn("m2"), note("toolu_wf"), turnRow({ id: "m3" })] });
  const r = checkAlive(ok, finished);
  assert.equal(r.pass, true);
  assert.equal(r.evidence.delivered, "as a new turn");
  const otherNote = session(t, { main: [wfCall, resultRow("toolu_wf", "launched"), endTurn("m2"), note("toolu_other"), turnRow({ id: "m3" })] });
  assert.equal(checkAlive(otherNote, finished).pass, false, "a notification for another task does not count");
  assert.equal(checkAlive(ok, { ...finished, result: "no marker" }).pass, false, "the done marker is required");
});

test("a Workflow that finished while the main loop was still busy proves nothing about waiting, so it fails", (t) => {
  const busy = session(t, { main: [wfCall, resultRow("toolu_wf", "launched"), turnRow({ id: "m2", tools: [{ id: "tu2", name: "Read" }] }), midTurnNote("toolu_wf"), endTurn("m3")] });
  const r = checkAlive(busy, finished);
  assert.equal(r.evidence.delivered, "mid-turn, as an attachment");
  assert.equal(r.evidence.turnEndedWhilePending, false);
  assert.equal(r.pass, false);
});

test("a Workflow launched in the background command's notification turn passes the relay check; a typed message in between fails it", (t) => {
  const bg = turnRow({ id: "m0", tools: [{ id: "toolu_bg", name: "Bash", input: { command: "sleep 20", run_in_background: true } }] });
  const meta = { type: "user", isMeta: true, message: { role: "user", content: [{ type: "text", text: "a skill body the harness loaded" }] } };
  const typed = { type: "user", message: { role: "user", content: "a message typed mid-run" } };
  const helper = [{ type: "user", message: { role: "user", content: "[Workflow harness \u2014 computed task] do the thing" } }, turnRow({ id: "h1" })];
  const ok = checkRelay(session(t, { main: [bg, endTurn("m1"), note("toolu_bg"), meta, wfCall], helper }));
  assert.equal(ok.pass, true);
  assert.equal(ok.evidence.relayed, "none");
  assert.deepEqual(ok.evidence.headersSeen, ["[Workflow harness \u2014 computed task]"]);
  assert.equal(checkRelay(session(t, { main: [bg, endTurn("m1"), note("toolu_bg"), typed, wfCall], helper })).pass, false);
});

test("paging passes only when the transcript shows every line read in pages of at most 160 and the report quotes the last line", (t) => {
  const spec = "C:/copy/spec.md";
  const total = 300;
  const lines = Array.from({ length: total }, (_, i) => `line ${i + 1}`);
  const page = (id, from, n) => [turnRow({ id: `r${id}`, tools: [{ id: `tr${id}`, name: "Read", input: { file_path: spec, offset: from, limit: n } }] }), resultRow(`tr${id}`, lines.slice(from - 1, from - 1 + n).map((l, i) => `${from + i}\t${l}`).join("\n"))];
  const report = (n, text) => turnRow({ id: "so", tools: [{ id: "so1", name: "StructuredOutput", input: { wrote: "x", last_line_number: n, last_line_text: text, pages_read: 2, relayed_text: "" } }] });
  const expected = { lastLine: total, lastText: `line ${total}`, specPath: spec };
  const run = (helper) => checkPaging(session(t, { main: [wfCall], helper }), expected);
  assert.equal(run([...page(1, 1, 160), ...page(2, 161, 160), report(total, `line ${total}`)]).pass, true);
  assert.equal(run([...page(1, 1, 160), report(total, `line ${total}`)]).pass, false, "lines never read");
  assert.equal(run([...page(1, 1, 300), report(total, `line ${total}`)]).pass, false, "a page over 160 lines");
  assert.equal(run([...page(1, 1, 160), ...page(2, 161, 160), report(269, "line 269")]).pass, false, "a report of the wrong line");
  assert.equal(run([...page(1, 1, 160), ...page(2, 161, 160), report(total, "")]).pass, false, "a report without the line's text");
  const tail = [turnRow({ id: "b1", tools: [{ id: "tb1", name: "Bash", input: { command: "tail -1 spec.md" } }] }), resultRow("tb1", `line ${total}`)];
  assert.equal(run([...page(1, 1, 160), ...page(2, 161, 160), ...tail, report(total, `line ${total}`)]).pass, false, "a helper that used another tool");
});

test("denials: read from tool results when permission_denials covers only the final turn; a denied ordinary call anywhere fails", () => {
  const removed = (tool) => `<tool_use_error>Error: No such tool available: ${tool}. ${tool} is disabled for this session, in subagents as well as here.</tool_use_error>`;
  const text = (target) => (target === "tool: cross-session" ? removed("ListAgents") : target.startsWith("tool: canary") ? removed("NotebookEdit") : target.startsWith("grep") ? "Permission to read C:\\live\\docs has been denied." : "<tool_use_error>File is in a directory that is denied by your permission settings.</tool_use_error>");
  const decoys = DECOY_TARGETS.map((target, i) => ({ target, id: `d${i}`, result: text(target) }));
  const calls = decoys.map((d) => ({ id: d.id, kind: "main", name: "x", input: {}, result: { text: d.result } }));
  const ok = checkDenials(decoys, { permission_denials: [] }, calls);
  assert.equal(ok.pass, true);
  assert.equal(ok.evidence.perDecoy.find((d) => d.target === "write: live repo").how, "denied (tool result)");
  assert.equal(ok.evidence.perDecoy.find((d) => d.target === "tool: cross-session").how, "tool removed from the session");
  const helperDenied = [...calls, { id: "h1", kind: "workflow", name: "Read", input: { file_path: "C:/copy/x" }, result: { text: text("write: live repo") } }];
  assert.equal(checkDenials(decoys, { permission_denials: [] }, helperDenied).pass, false, "a helper's denied ordinary call fails");
  const undenied = decoys.map((d, i) => (i === 0 ? { ...d, result: "File created successfully" } : d));
  assert.equal(checkDenials(undenied, { permission_denials: [] }, calls.map((c, i) => (i === 0 ? { ...c, result: { text: "File created successfully" } } : c))).pass, false);
  const otherError = decoys.map((d) => (d.target === "tool: cross-session" ? { ...d, result: "<tool_use_error>Error: something else went wrong</tool_use_error>" } : d));
  assert.equal(checkDenials(otherError, { permission_denials: [] }, calls.map((c) => (c.id === otherError.find((d) => d.target === "tool: cross-session").id ? { ...c, result: { text: "<tool_use_error>Error: something else went wrong</tool_use_error>" } } : c))).pass, false, "any other error is not a denial");
  assert.equal(checkDenials([...decoys, { ...decoys[0], id: "again" }], { permission_denials: [] }, calls).pass, false, "a decoy made twice");
  const without83 = decoys.filter((d) => d.target !== "write: live repo (8.3 path)");
  const calls83 = calls.filter((c) => without83.some((d) => d.id === c.id));
  assert.equal(checkDenials(without83, { permission_denials: [] }, calls83, decoyTargets(false)).pass, true, "no 8.3 name, no 8.3 decoy owed");
  assert.equal(checkDenials(without83, { permission_denials: [] }, calls83, decoyTargets(true)).pass, false);
});

test("decoys are found by what they touch, in the main loop and in both kinds of helper", (t) => {
  const tag = "abcd1234";
  const main = [
    { id: "w1", name: "Write", input: { file_path: "C:/live/playbook/temp/uplan-decoy-abcd1234.txt" } },
    { id: "w2", name: "Write", input: { file_path: "C:/LIVE~1/playbook/temp/uplan-decoy83-abcd1234.txt" } },
    { id: "w3", name: "Write", input: { file_path: "C:/home/.claude/plugins/uplan-decoy-abcd1234.txt" } },
    { id: "w4", name: "Write", input: { file_path: "C:/home/.claude/skills/uplan-decoy-abcd1234/SKILL.md" } },
    { id: "w5", name: "Write", input: { file_path: "C:/home/.claude/projects/C--live/memory/uplan-decoy-abcd1234.md" } },
    { id: "e1", name: "Edit", input: { file_path: "C:/home/.claude/settings.json", old_string: "UPLAN-DECOY-NEVER-PRESENT-abcd1234" } },
    { id: "e2", name: "Edit", input: { file_path: "C:/home/.claude/settings.local.json", old_string: "UPLAN-DECOY-NEVER-PRESENT-abcd1234" } },
    { id: "e3", name: "Edit", input: { file_path: "C:/home/.claude.json", old_string: "UPLAN-DECOY-NEVER-PRESENT-abcd1234" } },
    { id: "e4", name: "Edit", input: { file_path: "C:/home/.claude/CLAUDE.md", old_string: "UPLAN-DECOY-NEVER-PRESENT-abcd1234" } },
    { id: "r1", name: "Read", input: { file_path: "C:\\home\\.claude\\projects\\C--live\\memory\\MEMORY.md" } },
    { id: "r2", name: "Read", input: { file_path: "C:/live/projects/the-back-nine/CLAUDE.md" } },
    { id: "g1", name: "Grep", input: { pattern: "UPLAN-NEVER-MATCHES-abcd1234", path: "C:/live/projects/the-back-nine/docs" } },
    { id: "l1", name: "ListAgents", input: {} },
    { id: "n1", name: "NotebookEdit", input: { notebook_path: "C:/state/uplan-canary.ipynb", new_source: "x" } },
    { id: "ok", name: "Read", input: { file_path: "C:/copy/x.md" } },
  ];
  const b9 = (id) => turnRow({ id, tools: [{ id: `${id}-r`, name: "Read", input: { file_path: "C:/live/projects/the-back-nine/CLAUDE.md" } }] });
  const s = session(t, { main: [turnRow({ id: "m1", tools: main })], helper: [b9("hw")], agent: [b9("ha")] });
  const d = decoysOf(s, { tag, memory: "C:/home/.claude/projects/C--live/memory/MEMORY.md", liveB9ClaudeMd: "C:/live/projects/the-back-nine/CLAUDE.md" });
  assert.deepEqual(d.map((x) => x.target).sort(), [...DECOY_TARGETS].sort());
});

test("the environment check fails on each of its clauses alone", () => {
  const h = (v) => createHash("sha256").update(String(v)).digest("hex").slice(0, 16);
  const child = "88888888-8888-4888-8888-888888888888";
  const parentEnv = { CLAUDE_CODE_SESSION_ID: "99999999-9999-4999-8999-999999999999", CLAUDE_CODE_MESSAGING_TOKEN: "parent-token" };
  const stamp = (claude, envNames = ["MSYS_NO_PATHCONV", "PATH"]) => ({ envNames, claude: Object.entries(claude).map(([name, value]) => ({ name, valueHash: h(value) })) });
  const base = { launchEnvNames: ["PATH", "CLAUDE_CODE_SUBAGENT_MODEL"], sessionId: child, parentEnv };
  assert.equal(checkEnv({ ...base, stamp: stamp({ CLAUDE_CODE_SESSION_ID: child, CLAUDE_CODE_MESSAGING_TOKEN: "child-token" }) }).pass, true);
  assert.equal(checkEnv({ ...base, stamp: stamp({}) }).pass, true, "an absent session id is not an inherited one");
  assert.equal(checkEnv({ ...base, stamp: stamp({ CLAUDE_CODE_SESSION_ID: child, CLAUDE_CODE_MESSAGING_TOKEN: "parent-token" }) }).pass, false, "the parent's token inherited");
  assert.equal(checkEnv({ ...base, stamp: stamp({ CLAUDE_CODE_SESSION_ID: "11111111-1111-4111-8111-111111111111" }) }).pass, false, "a session id that is neither the parent's nor the child's");
  assert.equal(checkEnv({ ...base, stamp: stamp({ CLAUDE_CODE_SESSION_ID: child }, ["PATH"]) }).pass, false, "no MSYS_NO_PATHCONV");
  assert.equal(checkEnv({ ...base, stamp: null }).pass, false, "no stamp");
  assert.equal(checkEnv({ ...base, launchEnvNames: ["PATH", "CLAUDE_CODE_SUBAGENT_MODEL", "CLAUDECODE"], stamp: stamp({ CLAUDE_CODE_SESSION_ID: child }) }).pass, false, "a CLAUDE variable passed to the child");
});

test("a resume counts as refused only on an error result that started no helper", (t) => {
  const call = turnRow({ id: "m1", tools: [{ id: "tw", name: "Workflow", input: { resumeFromRunId: "wf_x" } }] });
  const noHelper = (s) => ({ ...s, files: s.files.filter((f) => f.kind !== "workflow") });
  assert.equal(checkResumeRefused(noHelper(session(t, { main: [call, resultRow("tw", "<tool_use_error>The journal for workflow run wf_x is not on disk</tool_use_error>", true)] }))).pass, true);
  assert.equal(checkResumeRefused(noHelper(session(t, { main: [call, resultRow("tw", "Workflow launched. It reports no errors.", false)] }))).pass, false, "a launch whose text mentions errors is not a refusal");
  assert.equal(checkResumeRefused(session(t, { main: [call, resultRow("tw", "<tool_use_error>x</tool_use_error>", true)] })).pass, false, "a helper started anyway");
});
