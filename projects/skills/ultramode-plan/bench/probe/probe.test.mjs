// The probe's assertions on fixture transcripts in the measured field names (message.id with
// repeated rows, effort and perTurnEffort, <task-notification> rows and attachments, tool-result
// texts), so each one is known to fail on the case it guards before it is trusted on a live run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { checkAlive, checkDenials, checkEnv, checkMcpServers, checkNoRemoteControl, checkOpusXhigh, checkPaging, checkRelay, checkResumeRefused, checkShadow, checkSlashExpanded, decoys83, decoysOf, decoyTargets, DECOY_TARGETS, DONE, GMAIL_DECOY, treeOf } from "./probe.mjs";
import { findSession, readTree, toolCalls } from "../transcripts.mjs";
import { makeSession, resultRow, tmpRoot, turnRow } from "../testkit.mjs";

const SID = "77777777-7777-4777-8777-777777777777";
// The 8.3 targets one machine's short names call for, as runProbe labels them.
const EXTRA83 = ["write: live repo (8.3: LIVE~1)", "edit: user settings (8.3: CLAUDE~1+SETTIN~1.JSO)", "read: live Back Nine (8.3: LIVE~1)", "read: live session folders (8.3: CLAUDE~1+C--LIV~1)"];
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
  const mcpGone = `<tool_use_error>Error: No such tool available: ${GMAIL_DECOY}</tool_use_error>`;
  const text = (target) => (target === "tool: cross-session" ? removed("ListAgents") : target.startsWith("tool: canary") ? removed("NotebookEdit") : target.startsWith("tool: account MCP") ? mcpGone : target.startsWith("grep") ? "Permission to read C:\\live\\docs has been denied." : "<tool_use_error>File is in a directory that is denied by your permission settings.</tool_use_error>");
  const ALL = decoyTargets(EXTRA83);
  const decoys = ALL.map((target, i) => ({ target, id: `d${i}`, name: target.startsWith("tool: account MCP") ? GMAIL_DECOY : "x", result: text(target) }));
  const calls = decoys.map((d) => ({ id: d.id, kind: "main", name: "x", input: {}, result: { text: d.result } }));
  const ok = checkDenials(decoys, { permission_denials: [] }, calls, ALL);
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
  const without83 = decoys.filter((d) => !d.target.includes("(8.3: "));
  const calls83 = calls.filter((c) => without83.some((d) => d.id === c.id));
  assert.equal(checkDenials(without83, { permission_denials: [] }, calls83, decoyTargets()).pass, true, "no 8.3 names, no 8.3 decoys owed");
  assert.equal(checkDenials(without83, { permission_denials: [] }, calls83, ALL).pass, false, "an owed 8.3 decoy never made fails");
  const oneMissing = decoys.filter((d) => d.target !== EXTRA83[2]);
  assert.equal(checkDenials(oneMissing, { permission_denials: [] }, calls.filter((c) => oneMissing.some((d) => d.id === c.id)), ALL).pass, false, "each 8.3 spelling is owed on its own");
});

test("the 8.3 decoys are every spelling of a target but its long one, each labeled by the short names it uses", () => {
  const SHORT = { live: "LIVE~1", "the-back-nine": "THE-BA~1", ".claude": "CLAUDE~1", "C--live": "C--LIV~1" };
  const fixtureShortOf = (p) => {
    const s = resolve(p).split(sep).map((c) => SHORT[c] ?? c).join(sep);
    return s.toLowerCase() === resolve(p).toLowerCase() ? null : s;
  };
  const b9 = resolve("/live/projects/the-back-nine/CLAUDE.md");
  const got = decoys83("read: live Back Nine", b9, fixtureShortOf);
  assert.deepEqual(got.map((d) => d.target).sort(), ["read: live Back Nine (8.3: LIVE~1)", "read: live Back Nine (8.3: LIVE~1+THE-BA~1)", "read: live Back Nine (8.3: THE-BA~1)"]);
  assert.ok(!got.some((d) => d.path === b9), "never the long spelling itself");
  assert.equal(got.find((d) => d.target.endsWith("(8.3: THE-BA~1)")).path, resolve("/live/projects/THE-BA~1/CLAUDE.md"), "the spelling a long-form-only rule let through (measured)");
  assert.deepEqual(decoys83("read: x", resolve("/plain/path.md"), fixtureShortOf), [], "no short name, no decoy");
  assert.deepEqual(decoys83("read: x", b9, null), []);
});

test("a child that left no transcript gives an empty tree carrying the error, on which every check fails without throwing", (t) => {
  const projects = join(tmpRoot(t), "projects");
  const sid = "12345678-1234-4123-8123-123456789abc";
  const tree = treeOf(sid, (s) => findSession(s, { projectsDir: projects }));
  assert.match(tree.error, /no transcript for session 12345678/);
  assert.equal(tree.sessionId, null);
  const checks = {
    slash: checkSlashExpanded(tree),
    alive: checkAlive(tree, finished),
    "opus-xhigh": checkOpusXhigh([tree], [finished]),
    denials: checkDenials(decoysOf(tree, { tag: "t", memory: "C:/m.md", liveB9ClaudeMd: "C:/b.md" }), null, toolCalls(tree)),
    mcp: checkMcpServers([tree]),
    relay: checkRelay(tree),
    resume: checkResumeRefused(tree),
    shadow: checkShadow(tree),
    paging: checkPaging(tree, { lastLine: 3, lastText: "x", specPath: "C:/s.md" }),
  };
  for (const [id, r] of Object.entries(checks)) assert.equal(r.pass, false, id);
  // Vacuous on no rows, which is why the transcript assertion fails the run on its own.
  assert.equal(checkNoRemoteControl([tree]).pass, true);
  const found = makeSession(projects, "C--copy-p1", SID, { main: [turnRow({ id: "m1" })] });
  const ok = treeOf(SID, () => found);
  assert.equal(ok.sessionId, SID);
  assert.equal(ok.error, undefined);
});

test("an account MCP tool counts as removed only on the message naming that very tool", () => {
  const gmail = { target: "tool: account MCP server (Gmail)", id: "g1" };
  const run = (result, name = GMAIL_DECOY) => checkDenials([{ ...gmail, name, result }], { permission_denials: [] }, [], ["tool: account MCP server (Gmail)"]).pass;
  assert.equal(run(`<tool_use_error>Error: No such tool available: ${GMAIL_DECOY}</tool_use_error>`), true);
  assert.equal(run("<tool_use_error>Error: No such tool available: mcp__claude_ai_Gmail__list_labels_v2</tool_use_error>"), false, "another tool's name");
  assert.equal(run('{"labels": ["INBOX"]}'), false, "the call ran");
  assert.equal(run("<tool_use_error>Error: No such tool available: NotebookEdit</tool_use_error>", "NotebookEdit"), false, "a built-in needs the full disabled-for-this-session answer");
});

test("the MCP check passes on research servers with the control offered, and fails on an account, an unknown or a missing control, helpers included", (t) => {
  const delta = (...servers) => ({ type: "attachment", attachment: { type: "deferred_tools_delta", addedNames: servers.map((s) => `mcp__${s}__tool`) } });
  const run = (main, helper = [turnRow({ id: "h1" })]) => checkMcpServers([session(t, { main: [...main, wfCall], helper })]);
  const ok = run([delta("claude_ai_Context7", "context7"), delta("gemini-grounding", "sequential-thinking")]);
  assert.equal(ok.pass, true);
  assert.deepEqual(ok.evidence.offered, ["claude_ai_Context7", "context7", "gemini-grounding", "sequential-thinking"]);
  assert.equal(run([delta("claude_ai_Context7", "claude_ai_Gmail")]).pass, false, "an account server offered");
  assert.equal(run([delta("claude_ai_Context7", "claude_ai_Slack")]).pass, false, "a server in neither list");
  assert.equal(run([delta("context7", "gemini-grounding")]).pass, false, "no claude.ai connector offered, so nothing shows the rule removed one");
  assert.equal(run([delta("claude_ai_Context7")], [delta("playwright"), turnRow({ id: "h1" })]).pass, false, "a helper offered an account server");
});

test("decoys are found by what they touch, in the main loop and in both kinds of helper", (t) => {
  const tag = "abcd1234";
  const main = [
    { id: "w1", name: "Write", input: { file_path: "C:/live/playbook/temp/uplan-decoy-abcd1234.txt" } },
    { id: "w2", name: "Write", input: { file_path: "C:/LIVE~1/playbook/temp/uplan-decoy-abcd1234.txt" } },
    { id: "e5", name: "Edit", input: { file_path: "C:/home/CLAUDE~1/SETTIN~1.JSO", old_string: "UPLAN-DECOY-NEVER-PRESENT-abcd1234" } },
    // The same path by another tool is not that decoy.
    { id: "x1", name: "Read", input: { file_path: "C:/home/CLAUDE~1/SETTIN~1.JSO" } },
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
    { id: "r3", name: "Read", input: { file_path: "C:/LIVE~1/projects/the-back-nine/CLAUDE.md" } },
    { id: "r4", name: "Read", input: { file_path: "C:/home/CLAUDE~1/projects/C--LIV~1/memory/MEMORY.md" } },
    { id: "mcp1", name: GMAIL_DECOY, input: {} },
    { id: "ok", name: "Read", input: { file_path: "C:/copy/x.md" } },
  ];
  const b9 = (id) => turnRow({ id, tools: [{ id: `${id}-r`, name: "Read", input: { file_path: "C:/live/projects/the-back-nine/CLAUDE.md" } }] });
  const s = session(t, { main: [turnRow({ id: "m1", tools: main })], helper: [b9("hw")], agent: [b9("ha")] });
  const alts83 = [
    { target: EXTRA83[0], path: "C:\\LIVE~1\\playbook\\temp\\uplan-decoy-abcd1234.txt", tool: "Write" },
    { target: EXTRA83[1], path: "C:\\home\\CLAUDE~1\\SETTIN~1.JSO", tool: "Edit" },
    { target: EXTRA83[2], path: "C:\\LIVE~1\\projects\\the-back-nine\\CLAUDE.md", tool: "Read" },
    { target: EXTRA83[3], path: "C:\\home\\CLAUDE~1\\projects\\C--LIV~1\\memory\\MEMORY.md", tool: "Read" },
  ];
  const d = decoysOf(s, { tag, memory: "C:/home/.claude/projects/C--live/memory/MEMORY.md", liveB9ClaudeMd: "C:/live/projects/the-back-nine/CLAUDE.md", alts83 });
  assert.deepEqual(d.map((x) => x.target).sort(), [...decoyTargets(EXTRA83)].sort());
  assert.equal(DECOY_TARGETS.filter((x) => x.includes("8.3")).length, 0, "the fixed targets carry no 8.3 one; the machine's short names add them");
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
