import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { findSession, readTree, toolCalls, walk } from "./transcripts.mjs";
import { makeSession, resultRow, tmpRoot, turnRow } from "./testkit.mjs";

const SID = "44444444-4444-4444-8444-444444444444";

function tree(t) {
  const projects = join(tmpRoot(t), "projects");
  const main = makeSession(projects, "C--copy-c1", SID, {
    main: [
      { type: "user", message: { role: "user", content: "go" } },
      turnRow({ id: "m1", tools: [{ id: "tu1", name: "Read", input: { file_path: "C:\\copy\\a.md" } }] }),
      turnRow({ id: "m1", tools: [{ id: "tu1", name: "Read", input: { file_path: "C:\\copy\\a.md" } }] }),
      resultRow("tu1", "file text"),
      turnRow({ id: "m2" }),
    ],
    agents: [[turnRow({ id: "a1" }), turnRow({ id: "a1" })]],
    workflows: { "wf_one-0001": { helpers: [[turnRow({ id: "h1" })]] } },
  });
  return { projects, main };
}

test("the walk finds the main loop, an Agent-tool subagent and a Workflow helper", (t) => {
  const { main } = tree(t);
  const w = walk(main);
  assert.equal(w.sessionId, SID);
  assert.deepEqual(w.files.map((f) => f.kind), ["main", "agent", "workflow"]);
  assert.deepEqual(w.workflows, [{ run: "wf_one-0001", recorded: true, helpers: 1 }]);
  assert.equal(w.files[1].meta.description, "agent 0");
});

test("rows sharing a message.id are one turn, across the whole tree", (t) => {
  const { main } = tree(t);
  const r = readTree(main);
  assert.deepEqual(r.turns.map((x) => x.id), ["m1", "m2", "a1", "h1"]);
  assert.equal(r.repeats, 2);
  assert.deepEqual([...new Set(r.turns.map((x) => `${x.model}/${x.effort}/${x.perTurnEffort}`))], ["claude-opus-5-5/xhigh/xhigh"]);
});

test("a tool call carries its result's text", (t) => {
  const { main } = tree(t);
  const calls = toolCalls(readTree(main));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "Read");
  assert.equal(calls[0].result.text, "file text");
});

test("a session is found by its id from any project folder, and a missing one fails with 'no transcript', never as empty", (t) => {
  const { projects, main } = tree(t);
  assert.equal(findSession(SID, { projectsDir: projects }), main);
  assert.throws(() => findSession("55555555-5555-4555-8555-555555555555", { projectsDir: projects }), /no transcript/);
  assert.throws(() => walk(join(projects, "nowhere", `${SID}.jsonl`)), /no transcript/);
});

test("a line that does not parse is counted, never dropped quietly", (t) => {
  const { main } = tree(t);
  appendFileSync(main, '{"type":"assistant", truncated\n');
  const r = readTree(main);
  assert.equal(r.files[0].unparsed, 1);
});
