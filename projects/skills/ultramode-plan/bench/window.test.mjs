import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { cacheWrites, measure, nullBaseline } from "./window.mjs";
import { makeSession, resultRow, tmpRoot, turnRow } from "./testkit.mjs";

// Integer weights per 100 tokens of plain input: 5-minute write 1.25x, 1-hour write 2x,
// read 0.1x, output 5x. A fixture only; the bench's own ratios are fixed in bench/bar.md (U8).
const W = { input: 100, cacheWrite5m: 125, cacheWrite1h: 200, cacheRead: 10, output: 500 };
const ids = ["66666666-6666-4666-8666-666666666661", "66666666-6666-4666-8666-666666666662", "66666666-6666-4666-8666-666666666663"];

function run(t) {
  const projects = join(tmpRoot(t), "projects");
  // A synthetic row (an API error placeholder) can come first; the baseline is the first real turn.
  const nul = makeSession(projects, "C--null", ids[0], { main: [turnRow({ id: "s0", model: "<synthetic>", read: 999 }), turnRow({ id: "n1", w1h: 40000, read: 10000 }), turnRow({ id: "n2", w1h: 1, read: 90000 })] });
  const seg1 = makeSession(projects, "C--arm", ids[1], {
    main: [turnRow({ id: "m1", w1h: 60000, read: 50000 }), turnRow({ id: "m2", input: 3, w5m: 1000, read: 120000 }), turnRow({ id: "m2", input: 3, w5m: 1000, read: 120000 }), turnRow({ id: "m2", input: 3, w5m: 1000, read: 120000 })],
    // Both helper kinds peak above the main loop, so a Rise taken over helpers would show.
    agents: [[turnRow({ id: "a1", input: 5, w5m: 20000, read: 130000, output: 100 })]],
    workflows: { "wf_seg1-0001": { helpers: [[turnRow({ id: "h1", input: 1, w5m: 30000, read: 200000, output: 50 }), turnRow({ id: "h1", input: 1, w5m: 30000, read: 200000, output: 50 })]] } },
  });
  // A resumed segment can carry rows of the one before it: m2 again must count once.
  const seg2 = makeSession(projects, "C--arm", ids[2], { main: [turnRow({ id: "m2", input: 3, w5m: 1000, read: 120000 }), turnRow({ id: "m3", w1h: 5000, read: 100000 })] });
  return { projects, nul, seg1, seg2 };
}

test("the null launch's first-turn context is the baseline", (t) => {
  assert.equal(nullBaseline(run(t).nul), 2 + 40000 + 10000);
});

test("a two-segment Rise and a Spend with both cache-write kinds match the hand computation, each turn counted once", (t) => {
  const { nul, seg1, seg2 } = run(t);
  const r = measure([seg1, seg2], { baseline: nullBaseline(nul), weights: W });
  // Peaks 121,003 and 105,002 over a 50,002 baseline.
  assert.equal(r.rise, (121003 - 50002) + (105002 - 50002));
  // m1 12,505,200 + m2 1,330,300 + a1 3,850,500 + h1 5,775,100 + m3 2,005,200, each once.
  assert.equal(r.spend, 25466300);
  // The absolute peak is the main loop's; the helpers' peaks (150,005 and 230,001) are summed apart.
  assert.deepEqual(r.reported, { absolutePeak: 121003, helperPeakSum: 150005 + 230001, output: 180, cumulative: 110002 + 121003 + 150005 + 230001 + 105002, cacheRead: 600000 });
  assert.deepEqual(r.segments.map((s) => s.peakId), ["m2", "m3"]);
  assert.equal(r.transcripts.reduce((a, x) => a + x.spend, 0), r.spend, "per-transcript Spend adds up to the run's");
});

test("a Workflow with no helper files fails rather than measuring as zero", (t) => {
  const projects = join(tmpRoot(t), "projects");
  const seg = makeSession(projects, "C--arm", ids[1], { main: [turnRow({ id: "m1" })], workflows: { "wf_empty-0001": { helpers: [] } } });
  assert.throws(() => measure([seg], { baseline: 0, weights: W }), /no helper files/);
});

test("a segment with no transcript fails", (t) => {
  const projects = join(tmpRoot(t), "projects");
  assert.throws(() => measure([join(projects, "C--arm", `${ids[1]}.jsonl`)], { baseline: 0, weights: W }), /no transcript/);
});

test("a cache write with no lifetime split, or a split that does not add up, cannot be priced", () => {
  assert.throws(() => cacheWrites({ cache_creation_input_tokens: 10 }), /no 5-minute and 1-hour split/);
  assert.throws(() => cacheWrites({ cache_creation_input_tokens: 10, cache_creation: { ephemeral_5m_input_tokens: 3, ephemeral_1h_input_tokens: 3 } }), /does not add up/);
  assert.deepEqual(cacheWrites({ cache_creation_input_tokens: 0 }), { w5m: 0, w1h: 0 });
});

test("weights must be non-negative integers under the five known names", (t) => {
  const { seg1 } = run(t);
  assert.throws(() => measure([seg1], { baseline: 0, weights: { ...W, cacheRead: 0.1 } }), /cacheRead/);
  assert.throws(() => measure([seg1], { baseline: 0, weights: { ...W, extra: 1 } }), /unknown weights/);
});

test("a launched Workflow or Agent whose transcripts are not where the walk looks fails; one that is found, or an errored call, passes", (t) => {
  const projects = join(tmpRoot(t), "projects");
  const wf = (id, run) => [turnRow({ id: `t-${id}`, tools: [{ id, name: "Workflow", input: {} }] }), resultRow(id, `Workflow launched in background. Run ID: ${run}`, false, { status: "async_launched", runId: run })];
  const ag = (id, agentId) => [turnRow({ id: `t-${id}`, tools: [{ id, name: "Agent", input: {} }] }), resultRow(id, `done
agentId: ${agentId}`, false, { status: "completed", agentId })];
  const found = makeSession(projects, "C--a", ids[0], { main: [...wf("tw1", "wf_here-0001"), ...ag("ta1", "a0")], agents: [[turnRow({ id: "a1" })]], workflows: { "wf_here-0001": { helpers: [[turnRow({ id: "h1" })]] } } });
  assert.doesNotThrow(() => measure([found], { baseline: 0, weights: W }));
  const movedRun = makeSession(projects, "C--b", ids[1], { main: [...wf("tw2", "wf_gone-0001")] });
  assert.throws(() => measure([movedRun], { baseline: 0, weights: W }), /wf_gone-0001.*no helper transcripts/);
  const movedAgent = makeSession(projects, "C--c", ids[2], { main: [...ag("ta2", "zzz9")] });
  assert.throws(() => measure([movedAgent], { baseline: 0, weights: W }), /Agent zzz9/);
  const projects2 = join(tmpRoot(t), "projects");
  const errored = makeSession(projects2, "C--d", ids[0], { main: [turnRow({ id: "t1", tools: [{ id: "tw3", name: "Workflow", input: {} }] }), resultRow("tw3", "<tool_use_error>bad script</tool_use_error>", true)] });
  assert.doesNotThrow(() => measure([errored], { baseline: 0, weights: W }));
});
