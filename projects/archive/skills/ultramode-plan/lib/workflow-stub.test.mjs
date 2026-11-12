import { test } from "node:test";
import assert from "node:assert/strict";
import { STUB_ITEMS, runWorkflow, scriptParts } from "./workflow-stub.mjs";
import { SCHEMAS } from "./caps.mjs";

const META = "export const meta = {\n  name: 'stub-test',\n  description: 'a script for the stub tests',\n  phases: [{ title: 'One', detail: 'the first phase' }],\n}\n";
const script = (body) => `${META}${body}`;
const OBJ = { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] };
// A responder that answers every schema call { ok: true } and every other call its prompt back.
const echo = ({ prompt, opts }) => (opts.schema ? { ok: true } : `echo: ${prompt}`);

test("a script's parts: meta, a pure literal, read without running the body", () => {
  const p = scriptParts(script("return 1\n"));
  assert.deepEqual(p.meta, { name: "stub-test", description: "a script for the stub tests", phases: [{ title: "One", detail: "the first phase" }] });
  assert.equal(p.body, "\nreturn 1\n");
  // Strings may hold anything a literal's syntax uses, comments included.
  assert.equal(scriptParts("export const meta = { name: 'a {b} [c]', description: \"it's // not a comment\", /* a } comment */ phases: [] }\n").meta.name, "a {b} [c]");
});

test("a script that does not open with a pure-literal meta, or holds another export or an import, is refused", () => {
  assert.throws(() => scriptParts("// a comment first\n" + script("")), /begins with `export const meta = \{`/);
  assert.throws(() => scriptParts("export const meta = { name: NAME, description: 'd' }\n"), /pure literal; it names NAME/);
  assert.throws(() => scriptParts("export const meta = { name: 'n', description: describe('x') }\n"), /it names describe/);
  assert.throws(() => scriptParts("export const meta = { name: 'n', description: 'd', ...more }\n"), /a spread/);
  assert.throws(() => scriptParts("export const meta = { name: `n${x}`, description: 'd' }\n"), /template interpolation/);
  assert.throws(() => scriptParts("export const meta = { name: 'n' }\n"), /needs a name and a description/);
  assert.throws(() => scriptParts("export const meta = { name: 'n', description: 'd'\n"), /never closes/);
  assert.throws(() => scriptParts(script("export const x = 1\n")), /has one export, its meta; this one has 2/);
  assert.throws(() => scriptParts(script("import fs from 'node:fs'\n")), /imports nothing/);
  assert.throws(() => scriptParts(script("const m = await import('node:fs')\n")), /imports nothing/);
  // Numbers, booleans and null are literal; a key is no free name.
  assert.equal(scriptParts("export const meta = { name: 'n', description: 'd', n: 1e3, h: 0x1F, b: true, z: null }\n").meta.n, 1000);
});

test("the body runs as an async function body with the runtime's globals and no Node API; its return comes back as JSON carries it", async () => {
  const r = await runWorkflow(script("return { kinds: [typeof agent, typeof parallel, typeof pipeline, typeof phase, typeof log, typeof budget, typeof workflow], node: [typeof process, typeof require, typeof console], gone: undefined, n: 2 }\n"), { respond: echo });
  assert.equal(r.error, null);
  assert.deepEqual(r.result, { kinds: ["function", "function", "function", "function", "function", "object", "function"], node: ["undefined", "undefined", "undefined"], n: 2 });
  assert.equal((await runWorkflow(script("process.exit(1)\n"), { respond: echo })).error, "process is not defined");
  assert.match((await runWorkflow(script("await workflow('x')\n"), { respond: echo })).error, /never do/);
  const b = await runWorkflow(script("return [budget.total, budget.remaining() === Infinity, budget.spent()]\n"), { respond: echo });
  assert.deepEqual(b.result, [null, true, 0]);
  assert.deepEqual((await runWorkflow(script("return [budget.total, budget.remaining()]\n"), { respond: echo, budget: { total: 500 } })).result, [500, 500]);
});

test("args arrive verbatim: an object stays an object and a JSON string stays a string", async () => {
  const body = script("return { type: typeof args, isArray: Array.isArray(args), value: args }\n");
  assert.deepEqual((await runWorkflow(body, { respond: echo, args: { plan: "C:/p.md", n: [1, 2] } })).result, { type: "object", isArray: false, value: { plan: "C:/p.md", n: [1, 2] } });
  assert.deepEqual((await runWorkflow(body, { respond: echo, args: '{"plan":"C:/p.md"}' })).result, { type: "string", isArray: false, value: '{"plan":"C:/p.md"}' });
  assert.deepEqual((await runWorkflow(body, { respond: echo })).result, { type: "undefined", isArray: false });
});

test("Date.now(), Math.random(), an argless new Date() and Date() as a function throw; a dated new Date works", async () => {
  for (const [expr, what] of [["Date.now()", /Date\.now\(\) is unavailable/], ["Math.random()", /Math\.random\(\) is unavailable/], ["new Date()", /an argless new Date\(\) is unavailable/], ["Date()", /Date\(\) called as a function is unavailable/]]) {
    const r = await runWorkflow(script(`return ${expr}\n`), { respond: echo });
    assert.match(r.error, what, expr);
  }
  const ok = await runWorkflow(script("return [new Date(0).toISOString(), Date.UTC(2026, 10, 8), Math.max(1, 2)]\n"), { respond: echo });
  assert.deepEqual(ok.result, ["1970-01-01T00:00:00.000Z", Date.UTC(2026, 10, 8), 2]);
  // The host's own clock is untouched.
  assert.equal(typeof Date.now(), "number");
});

test("parallel never rejects: a throwing thunk and a dead helper each become null, and the swallowed error is recorded", async () => {
  const respond = ({ prompt }) => (prompt === "dies" ? null : { ok: true });
  // A script bug inside a thunk reads as a dead helper, which is why the stub records what it swallowed.
  const r = await runWorkflow(script("return await parallel([() => agent('lives', { schema: S })])\nconst S = " + JSON.stringify(OBJ) + "\n"), { respond });
  assert.equal(r.error, null);
  assert.deepEqual(r.result, [null]);
  assert.deepEqual(r.swallowed, [{ where: "parallel item 0", message: "Cannot access 'S' before initialization" }]);
  const s = await runWorkflow(script(`const S = ${JSON.stringify(OBJ)}\nreturn await parallel([() => agent('lives', { schema: S }), () => agent('dies', { schema: S }), () => { throw new Error('a script bug') }, () => Promise.reject(new Error('rejected'))])\n`), { respond });
  assert.equal(s.error, null);
  assert.deepEqual(s.result, [{ ok: true }, null, null, null]);
  assert.deepEqual(s.swallowed, [{ where: "parallel item 2", message: "a script bug" }, { where: "parallel item 3", message: "rejected" }]);
  assert.deepEqual(s.calls.map((c) => c.prompt), ["lives", "dies"]);
  const many = await runWorkflow(script(`return await parallel(Array.from({ length: ${STUB_ITEMS + 1} }, () => () => 1))\n`), { respond: echo });
  assert.match(many.error, /at most 4096 items/);
});

test("pipeline runs each item through its stages with no barrier; a throwing stage nulls its item and skips its later stages, a null result passes on", async () => {
  // Item 0's first stage waits on a gate item 1's second stage opens: a barrier between stages would hang.
  const body = script(`let open
const gate = new Promise((r) => { open = r })
const order = []
const out = await pipeline(['a', 'b', 'c'],
  async (item, orig, i) => { if (i === 0) await gate; order.push('s1:' + item); if (item === 'c') throw new Error('stage 1 broke on c'); return item + '1' },
  async (prev, orig, i) => { order.push('s2:' + orig); if (i === 1) open(); return orig === 'a' ? null : prev + '2' },
  async (prev, orig) => { order.push('s3:' + orig + ':' + prev); return prev })
return { out, order }
`);
  const r = await runWorkflow(body, { respond: echo });
  assert.equal(r.error, null);
  assert.deepEqual(r.result.out, [null, "b12", null]);
  assert.ok(r.result.order.indexOf("s2:b") < r.result.order.indexOf("s1:a"), `a barrier ran: ${r.result.order}`);
  assert.ok(!r.result.order.some((o) => o.startsWith("s2:c")), "a stage after a throwing one ran");
  assert.ok(r.result.order.includes("s3:a:null"), "a null result did not pass on");
  assert.deepEqual(r.swallowed, [{ where: "pipeline item 2, stage 1", message: "stage 1 broke on c" }]);
});

test("agent records every call's prompt and options in order, returns a schema call's object, a plain call's text and a dead helper's null", async () => {
  const respond = ({ n, prompt }) => (n === 3 ? null : prompt.startsWith("plain") ? "words back" : { ok: false });
  const r = await runWorkflow(script(`const S = ${JSON.stringify(OBJ)}
const a = await agent('structured', { label: 'one', phase: 'One', schema: S, model: 'opus', effort: 'xhigh' })
const b = await agent('plain text', { label: 'two', model: 'opus', effort: 'xhigh' })
const c = await agent('dies', { label: 'three', schema: S, model: 'opus', effort: 'xhigh' })
return [a, b, c]
`), { respond });
  assert.equal(r.error, null);
  assert.deepEqual(r.result, [{ ok: false }, "words back", null]);
  assert.deepEqual(r.calls.map((c) => [c.n, c.prompt, c.opts.label, c.opts.model, c.opts.effort]), [[1, "structured", "one", "opus", "xhigh"], [2, "plain text", "two", "opus", "xhigh"], [3, "dies", "three", "opus", "xhigh"]]);
  assert.deepEqual(r.calls[0].opts.schema, OBJ);
  assert.deepEqual(r.problems, []);
});

test("agent throws on a schema whose root is no object or whose required fields are not all properties, as the runtime does; an uncapped schema, an unknown option or effort, and an answer its schema rejects are problems", async () => {
  const run = (body, respond = echo) => runWorkflow(script(body), { respond });
  const notObject = await run("await agent('x', { schema: { type: 'array', items: { type: 'string' }, maxItems: 2 } })\n");
  assert.match(notObject.error, /root is \{ type: 'object', properties/);
  assert.equal(notObject.problems.length, 1);
  const missing = await run("await agent('x', { schema: { type: 'object', properties: { a: { type: 'boolean' } }, required: ['b'] } })\n");
  assert.match(missing.error, /required fields are all properties/);
  // Back Nine insight 084: an uncapped string, a list with no maxItems, a required field after an optional one.
  const uncapped = await run("return await agent('x', { schema: { type: 'object', properties: { note: { type: 'string' }, ok: { type: 'boolean' } }, required: ['ok'] } })\n", () => ({ ok: true }));
  assert.equal(uncapped.error, null);
  assert.deepEqual(uncapped.problems, ["agent 1 (no label): root: the required fields (ok) are not the first properties (note)", "agent 1 (no label): root.note: a string with no maxLength"]);
  const opts = await run("return await agent('x', { label: 'L', schema: " + JSON.stringify(OBJ) + ", effort: 'extreme', temperature: 0 })\n");
  assert.deepEqual(opts.problems, ["agent 1 (L): no agent() option temperature", 'agent 1 (L): effort "extreme" is none agent() accepts']);
  // caps.mjs's own schemas pass, and an answer past a cap fails.
  const finder = await run(`return await agent('x', { label: 'F', schema: ${JSON.stringify(SCHEMAS.finder)} })\n`, () => ({ findings: [{ title: "t".repeat(101), severity: "P1", section: "s", line: 3, confidence: 75, why_it_matters: "w", suggested_fix: "f" }] }));
  assert.match(finder.error, /fails its schema: root\.findings\[0\]\.title: 101 characters, past 100/);
  assert.deepEqual(finder.problems, ["agent 1 (F): the answer fails its schema: root.findings[0].title: 101 characters, past 100"]);
  const enumBad = await run(`return await agent('x', { schema: ${JSON.stringify(SCHEMAS.verdict)} })\n`, () => ({ real: true, material: true, new: true, corrected_severity: "P5", fix_is_correct: true, reasoning: "r", better_fix: "" }));
  assert.match(enumBad.error, /corrected_severity: "P5" is not one of/);
  const short = await run(`return await agent('x', { schema: ${JSON.stringify(SCHEMAS.verdict)} })\n`, () => ({ real: true, material: true, new: true, corrected_severity: "P2", fix_is_correct: true, reasoning: "r" }));
  assert.match(short.error, /fails its schema: root: required better_fix is missing/);
  const extra = await run(`return await agent('x', { schema: ${JSON.stringify(OBJ)} })\n`, () => ({ ok: true, more: 1 }));
  assert.match(extra.error, /fails its schema: root: more is no property/);
  const text = await run("return await agent('x', {})\n", () => ({ not: "text" }));
  assert.deepEqual(text.problems, ["agent 1 (no label): a call with no schema answers text, got object"]);
});

test("a responder that throws is the test's own bug and fails the run, even inside parallel", async () => {
  await assert.rejects(runWorkflow(script("return await parallel([() => agent('x', {})])\n"), { respond: () => { throw new Error("fixture has no answer for x"); } }), /fixture has no answer for x/);
  await assert.rejects(runWorkflow(script("return 1\n"), {}), /respond is the function/);
});
