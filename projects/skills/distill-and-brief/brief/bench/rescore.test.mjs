// Tests for the re-score harness's copy builder, scorer, merge and audit
// (U6 of docs/plans/brief-recall-fix-plan.md).
// Run: node --test "projects/skills/distill-and-brief/brief/**/*.test.mjs"

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCopies } from "./build-copies.mjs";
import { score, namesOf, limitsOf } from "./score.mjs";
import { merge, ARM_BRIEFS } from "./make-rescore.mjs";
import { auditReads, auditRuns } from "./audit-transcripts.mjs";
import { insertAppliesWhen } from "./fills.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..", "..", "..");
const BENCH = JSON.parse(readFileSync(join(here, "..", "results", "recall-benchmark-2026-10-31.json"), "utf8"));
const scratch = mkdtempSync(join(tmpdir(), "rescore-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
const gitShow = (rev, path) => spawnSync("git", ["-C", REPO, "show", `${rev}:${path}`], { maxBuffer: 1 << 26 }).stdout;

test("the copy builder reproduces each lesson's bytes at the brief's commit, a lesson deleted since included, and leaves out one added after", () => {
  const out = join(scratch, "copies");
  const m = buildCopies(out, null, ["B11", "B01"]);
  // B11 (10-23) saw playbook 001, deleted on 10-29.
  const b11 = m.briefs.B11;
  const f001 = b11.files.find((f) => f.name.startsWith("001-"));
  assert.ok(f001, "playbook 001 is in B11's copy");
  assert.ok(!existsSync(join(REPO, "playbook", "docs", "insights", f001.name)), "and is gone from today's folder");
  assert.deepEqual(readFileSync(join(out, "B11", "asof", "docs", "insights", f001.name)), gitShow(b11.commit, `playbook/docs/insights/${f001.name}`));
  // B01 (10-19) predates Back Nine 148 (added 10-31).
  assert.ok(!m.briefs.B01.files.some((f) => f.name.startsWith("148-")));
  assert.deepEqual(m.briefs.B01.leftOut, ["dnb-001", "ultra-001"]);
  // The plain copy carries the fills; the as-of copy does not.
  const f008 = m.briefs.B01.files.find((f) => f.name.startsWith("008-")).name;
  assert.match(readFileSync(join(out, "B01", "asof", "docs", "insights", f008), "utf8"), /^tags: \[\]/m);
  assert.match(readFileSync(join(out, "B01", "plain", "docs", "insights", f008), "utf8"), /^tags: \[nan-guard,/m);
});

test("insertAppliesWhen puts the line after tags (after a block list's last item), keeps the line ending, and applying twice changes nothing", () => {
  const line = "applies_when: [adding a thing, changing a thing]";
  const flow = "---\ntitle: t\ntags: [a, b]\nstatus: x\n---\n\nbody\n";
  const once = insertAppliesWhen(flow, line);
  assert.equal(once, "---\ntitle: t\ntags: [a, b]\napplies_when: [adding a thing, changing a thing]\nstatus: x\n---\n\nbody\n");
  assert.equal(insertAppliesWhen(once, line), once);
  const block = "---\r\ntitle: t\r\ntags:\r\n  - a\r\n  - b\r\n---\r\n";
  assert.equal(insertAppliesWhen(block, line), "---\r\ntitle: t\r\ntags:\r\n  - a\r\n  - b\r\napplies_when: [adding a thing, changing a thing]\r\n---\r\n");
  assert.equal(insertAppliesWhen("---\ntitle: t\n---\n", line), "---\ntitle: t\napplies_when: [adding a thing, changing a thing]\n---\n");
});

// A synthetic run set over the real benchmark.
function syntheticRuns(namesFor) {
  const runs = [];
  for (const [arm, ids] of Object.entries(ARM_BRIEFS)) for (const run of [1, 2]) for (const id of ids) {
    const names = namesFor(arm, id, run);
    runs.push({ arm, brief: id, run, result: { read: names.slice(0, 5), next: names.slice(5), bigJob: arm === "A1" ? null : "big", savedToFile: [], unread: "none" } });
  }
  const judges = ARM_BRIEFS.A1.map((id) => ({ brief: id, result: { lessons_read: 1, lessons: [] } }));
  return { runs, judges };
}
const judgedNums = (id, pred) => BENCH.briefs.find((b) => b.id === id).judged.filter(pred).map((j) => j.lesson.split("-")[1]);

test("the scorer counts 222 relevant Back Nine pairs, gives no arm credit for a plan citation, and is the same twice", () => {
  const data = syntheticRuns((arm, id) => judgedNums(id, (j) => j.verdict === "SURFACED" && j.lesson.startsWith("b9-")).slice(0, 10));
  const s1 = score(data, BENCH);
  const s2 = score(JSON.parse(JSON.stringify(data)), BENCH);
  assert.deepEqual(s1, s2);
  assert.equal(s1.perRun["A1#1"].rel, 222);
  // IN_PLAN lessons stay in the denominator, and naming nothing earns nothing.
  const none = score(syntheticRuns(() => []), BENCH);
  assert.equal(none.perRun["A2#1"].hits, 0);
  assert.equal(none.perRun["A2#1"].rel, 222);
  const inPlan = BENCH.briefs.flatMap((b) => b.judged.filter((j) => j.verdict === "IN_PLAN" && j.lesson.startsWith("b9-")));
  assert.ok(inPlan.length > 0);
});

test("the scorer counts an arm's names only up to its own limits", () => {
  const twenty = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, "0"));
  const r1 = { arm: "A1", brief: "B02", run: 1, result: { read: twenty, next: twenty.slice(5), bigJob: null } };
  assert.equal(namesOf(r1).length, 10);
  const r2 = { arm: "A2", brief: "B02", run: 1, result: { read: twenty.slice(0, 15), next: twenty.slice(15).concat(["101", "102", "103", "104", "105", "106"]), bigJob: "big" } };
  assert.equal(namesOf(r2).length, 20);
  assert.deepEqual(limitsOf("A2", "small"), { read: 5, next: 10 });
  assert.throws(() => limitsOf("A3", null), /must report big or small/);
});

test("a name outside the judged set counts as relevant for every arm when the blind judge listed it", () => {
  const outside = (id) => {
    const j = new Set(judgedNums(id, () => true));
    for (let n = 1; n < 200; n++) { const s = String(n).padStart(3, "0"); if (!j.has(s)) return s; }
  };
  const data = syntheticRuns((arm, id) => (arm === "A2" ? [outside(id)] : []));
  assert.equal(score(data, BENCH).perRun["A2#1"].hits, 0);
  data.judges = data.judges.map((j) => ({ ...j, result: { lessons_read: 1, lessons: [{ lesson: outside(j.brief), strength: "moderate", trap: "t" }] } }));
  const s = score(data, BENCH);
  assert.equal(s.perRun["A2#1"].hits, 11);
  assert.equal(s.perRun["A2#1"].rel, 233);
  assert.equal(s.perRun["A1#1"].rel, 233, "the judged-in name joins every arm's set");
});

test("a missing run or judge makes the scorer and the merge refuse", () => {
  const data = syntheticRuns(() => []);
  data.runs[3].result = null;
  assert.throws(() => score(data, BENCH), /refusing to score: missing run/);
  const d2 = syntheticRuns(() => []);
  assert.throws(() => score({ ...d2, missing: ["judge B18"] }, BENCH), /refusing to score: missing judge B18/);
  const m = merge([{ part: "A1", items: d2.runs.filter((r) => r.arm === "A1") }], {});
  assert.ok(m.missing.some((x) => x.startsWith("run A2/")));
  assert.ok(m.missing.some((x) => x.startsWith("judge ")));
});

test("the small-corpus guard fails when both titles-only runs miss a lesson both old runs named", () => {
  const b11 = judgedNums("B11", (j) => j.verdict !== "NOT_RELEVANT");
  assert.equal(score(syntheticRuns((arm, id) => (id === "B11" ? b11 : [])), BENCH).guard.holds, true);
  const lost = score(syntheticRuns((arm, id) => (id === "B11" && arm === "A1" ? b11 : [])), BENCH);
  assert.equal(lost.guard.holds, false);
  assert.ok(lost.guard.losses.length > 0 && lost.guard.losses.every((l) => l.startsWith("B11:playbook-")));
});

test("the audit catches a helper that used another tool, read outside its folder, invoked Skill or touched a live lesson folder", () => {
  const dir = join(scratch, "transcripts");
  mkdirSync(dir);
  const t = (name, calls) => {
    writeFileSync(join(dir, `agent-${name}.jsonl`), calls.map((c) => JSON.stringify({ message: { role: "assistant", content: [{ type: "tool_use", name: c[0], input: c[1] }] } })).join("\n"));
    writeFileSync(join(dir, `agent-${name}.meta.json`), JSON.stringify({ description: name }));
  };
  t("ok", [["Read", { file_path: "C:/x/u5/blobs/a.md" }], ["StructuredOutput", { line: "x" }]]);
  t("grep", [["Grep", { pattern: "x" }]]);
  t("far", [["Read", { file_path: "C:/elsewhere/b.md" }]]);
  t("skill", [["Skill", { skill: "brief" }]]);
  t("live", [["Grep", { path: "C:\\Users\\brigg\\ai-learning-journey\\projects\\the-back-nine\\docs\\insights" }]]);
  t("copy", [["Grep", { path: "C:/Users/brigg/.claude/jobs/x/tmp/rescore/B04/plain/docs/insights" }]]);
  const reads = auditReads(dir, "C:/x/u5");
  assert.deepEqual(reads.breaches.filter((b) => /^(ok|grep|far):/.test(b)).map((b) => b.split(":")[0]).sort(), ["far", "grep"]);
  assert.deepEqual(auditRuns(dir).breaches.map((b) => b.split(":")[0]).sort(), ["live", "skill"]);
});
