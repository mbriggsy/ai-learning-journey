// Tests for the re-score harness's copy builder, scorer, merge and audit
// (U6 of docs/plans/brief-recall-fix-plan.md).
// Run: node --test "projects/skills/distill-and-brief/brief/**/*.test.mjs"

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCopies, BACK_NINE } from "./build-copies.mjs";
import { score, namesOf, limitsOf, prefixOf, SMALL } from "./score.mjs";
import { merge, ARM_BRIEFS, ALL } from "./make-rescore.mjs";
import { auditReads, auditRuns } from "./audit-transcripts.mjs";
import { insertAppliesWhen } from "./fills.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..", "..", "..");
const BENCH = JSON.parse(readFileSync(join(here, "..", "results", "recall-benchmark-2026-10-31.json"), "utf8"));
const RESCORE = JSON.parse(readFileSync(join(here, "..", "results", "recall-rescore-2026-10-31.json"), "utf8"));
const scratch = mkdtempSync(join(tmpdir(), "rescore-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
const gitShow = (rev, path) => spawnSync("git", ["-C", REPO, "show", `${rev}:${path}`], { maxBuffer: 1 << 26 }).stdout;
const n3 = (i) => String(i).padStart(3, "0");

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

// The committed verdict: the fixed bytes of both recipes, and the scorer's own
// reading of the committed runs and judges, so a scorer edit that would move a
// stated number fails here.
test("the committed re-score: the arm hashes are git's bytes, and scoring its runs and judges again gives its verdict and every number", () => {
  const hashOf = (commit, recipe, corpus) =>
    createHash("sha256").update(gitShow(commit, `projects/skills/distill-and-brief/brief/${recipe}`)).update(gitShow(commit, `projects/skills/distill-and-brief/brief/${corpus}`)).digest("hex");
  assert.equal(RESCORE.arms.A1.hash, hashOf(RESCORE.arms.A1.commit, "SKILL.md", "corpus.mjs"));
  assert.equal(RESCORE.arms.A2.hash, hashOf(RESCORE.arms.A2.commit, "SKILL.next.md", "corpus.next.mjs"));
  assert.equal(RESCORE.arms.A3.hash, RESCORE.arms.A2.hash, "A2 and A3 run the same recipe bytes");
  assert.equal(RESCORE.arms.A1.hash.slice(0, 8), "35ee1c7f");
  assert.equal(RESCORE.arms.A2.hash.slice(0, 8), "87a2748e");
  const again = score({ runs: RESCORE.runs, judges: RESCORE.judges }, BENCH);
  assert.equal(again.verdict, "LAND NOTHING");
  assert.equal(again.verdict, RESCORE.verdict);
  assert.deepEqual(again.comparisons, RESCORE.comparisons);
  assert.deepEqual(again.guard, { holds: false, losses: ["B09:hooks-001"] });
  assert.deepEqual(again.guard, RESCORE.guard);
  assert.deepEqual(again.perRun, RESCORE.perRun);
  assert.deepEqual(again.ktd9Extra, RESCORE.ktd9Extra);
});

// A synthetic run set over the real benchmark.
function syntheticRuns(namesFor) {
  const runs = [];
  for (const [arm, ids] of Object.entries(ARM_BRIEFS)) for (const run of [1, 2]) for (const id of ids) {
    const names = namesFor(arm, id, run);
    runs.push({ arm, brief: id, run, result: { read: names.slice(0, 5), next: names.slice(5), bigJob: arm === "A1" ? null : "big", savedToFile: [], unread: "none" } });
  }
  const judges = ALL.map((id) => ({ brief: id, result: { lessons_read: 1, lessons: [] } }));
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
  assert.equal(none.verdict, "LAND NOTHING");
  const inPlan = BENCH.briefs.flatMap((b) => b.judged.filter((j) => j.verdict === "IN_PLAN" && j.lesson.startsWith("b9-")));
  assert.ok(inPlan.length > 0);
});

test("the scorer counts an arm's names only up to its own limits, in order", () => {
  const nums = (from, k) => Array.from({ length: k }, (_, i) => n3(from + i));
  // Disjoint lists, so a wrong read cap cannot hide behind a duplicate.
  const r1 = { arm: "A1", brief: "B02", run: 1, result: { read: nums(1, 20), next: nums(101, 20), bigJob: null } };
  assert.deepEqual(namesOf(r1), [...nums(1, 5), ...nums(101, 5)].map((n) => `b9-${n}`));
  const big = { arm: "A2", brief: "B02", run: 1, result: { read: nums(1, 20), next: nums(101, 20), bigJob: "big" } };
  assert.deepEqual(namesOf(big), [...nums(1, 10), ...nums(101, 10)].map((n) => `b9-${n}`));
  const small = { arm: "A3", brief: "B02", run: 1, result: { read: nums(1, 20), next: nums(101, 20), bigJob: "small" } };
  assert.deepEqual(namesOf(small), [...nums(1, 5), ...nums(101, 10)].map((n) => `b9-${n}`));
  assert.deepEqual(limitsOf("A2", "small"), { read: 5, next: 10 });
  assert.throws(() => limitsOf("A3", null), /must report big or small/);
  // A pick is a bare lesson number; anything else is refused, never read as some other lesson.
  assert.throws(() => namesOf({ arm: "A1", brief: "B02", run: 1, result: { read: ["b9-027"], next: [], bigJob: null } }), /not a lesson number/);
  assert.throws(() => prefixOf("B99"), /no folder for B99/);
});

test("a name outside the judged set counts as relevant for every arm when the blind judge listed it", () => {
  const outside = (id) => {
    const j = new Set(judgedNums(id, () => true));
    for (let n = 1; n < 200; n++) { const s = n3(n); if (!j.has(s)) return s; }
  };
  const data = syntheticRuns((arm, id) => (arm === "A2" ? [outside(id)] : []));
  assert.equal(score(data, BENCH).perRun["A2#1"].hits, 0);
  data.judges = data.judges.map((j) => ({ ...j, result: { lessons_read: 1, lessons: [{ lesson: outside(j.brief), strength: "moderate", trap: "t" }] } }));
  const s = score(data, BENCH);
  assert.equal(s.perRun["A2#1"].hits, 11);
  assert.equal(s.perRun["A2#1"].rel, 233);
  assert.equal(s.perRun["A1#1"].rel, 233, "the judged-in name joins every arm's set");
});

test("a missing, null or doubled run or judge makes the scorer and the merge refuse", () => {
  const data = syntheticRuns(() => []);
  data.runs[3].result = null;
  assert.throws(() => score(data, BENCH), /refusing to score: missing run/);
  const d2 = syntheticRuns(() => []);
  assert.throws(() => score({ ...d2, missing: ["judge B18"] }, BENCH), /refusing to score: missing judge B18/);
  // An entry that is absent, not just null, is refused by the scorer itself.
  assert.throws(() => score({ runs: d2.runs, judges: d2.judges.filter((j) => j.brief !== "B15") }, BENCH), /missing judge B15/);
  assert.throws(() => score({ runs: d2.runs.filter((r) => !(r.arm === "A2" && r.brief === "B07" && r.run === 2)), judges: d2.judges }, BENCH), /missing run A2\/B07\/2/);
  assert.throws(() => score({ runs: d2.runs.filter((r) => r.arm !== "A1"), judges: d2.judges }, BENCH), /missing run A1\//);
  assert.throws(() => score({ runs: [...d2.runs, d2.runs[0]], judges: d2.judges }, BENCH), /run A1\/B01\/1 appears 2 times/);
  const m = merge([{ part: "A1", hash: "h1", items: d2.runs.filter((r) => r.arm === "A1") }], { A1: { hash: "h1" } });
  assert.ok(m.missing.some((x) => x.startsWith("run A2/")));
  assert.ok(m.missing.some((x) => x.startsWith("judge ")));
});

test("the merge refuses a part that is not one the plan runs, a run of another arm, a doubled run and a part on other recipe bytes", () => {
  const d = syntheticRuns(() => []);
  const arms = { A1: { hash: "h1" }, A2: { hash: "h2" }, A3: { hash: "h2" } };
  const part = (name, hash) => ({ part: name, hash, items: d.runs.filter((r) => r.arm === name) });
  const judges = { part: "judges", hash: null, items: d.judges };
  const clean = merge([part("A1", "h1"), part("A2", "h2"), part("A3", "h2"), judges], arms);
  assert.deepEqual(clean.missing, []);
  const dry = { part: "dry", hash: "h2", items: [d.runs.find((r) => r.arm === "A2")] };
  assert.ok(merge([dry, part("A1", "h1"), part("A2", "h2"), part("A3", "h2"), judges], arms).missing.some((x) => /part dry is not one of/.test(x)));
  const mixed = { ...part("A2", "h2"), items: [...part("A2", "h2").items, d.runs.find((r) => r.arm === "A1")] };
  assert.ok(merge([part("A1", "h1"), mixed, part("A3", "h2"), judges], arms).missing.some((x) => /part A2 holds a run of A1/.test(x)));
  assert.ok(merge([part("A1", "h1"), part("A1", "h1"), part("A2", "h2"), part("A3", "h2"), judges], arms).missing.some((x) => /appears 2 times/.test(x)));
  assert.ok(merge([part("A1", "h1"), part("A2", "hX"), part("A3", "h2"), judges], arms).missing.some((x) => /part A2 ran on recipe hash hX/.test(x)));
  assert.ok(merge([part("A1", "h1"), part("A2", "h2"), part("A3", "h2"), judges, judges], arms).missing.some((x) => /judge B01 appears 2 times/.test(x)));
});

// A synthetic benchmark whose Back Nine briefs hold `relTotal` judged lessons
// (numbers 001 up) and whose small briefs hold 5, and runs whose Back Nine names
// hit `hits` judged lessons out of `named`, spread over the 11 briefs.
function edgeCase(relTotal, spec) {
  const per = BACK_NINE.map((_, i) => Math.floor(relTotal / 11) + (i < relTotal % 11 ? 1 : 0));
  const bench = { briefs: ALL.map((id) => {
    const k = BACK_NINE.includes(id) ? per[BACK_NINE.indexOf(id)] : 5;
    return { id, judged: Array.from({ length: k }, (_, i) => ({ lesson: `${prefixOf(id)}-${n3(i + 1)}`, strength: "moderate", verdict: "SURFACED", hit: "N/A" })) };
  }) };
  const spread = (total, caps) => {
    const out = caps.map(() => 0);
    let left = total;
    while (left > 0) {
      let moved = false;
      for (let i = 0; i < caps.length && left > 0; i++) if (out[i] < caps[i]) { out[i]++; left--; moved = true; }
      if (!moved) throw new Error(`cannot spread ${total}`);
    }
    return out;
  };
  const runs = [];
  for (const [arm, ids] of Object.entries(ARM_BRIEFS)) for (const run of [1, 2]) {
    const { hits, named, small = () => [] } = spec[`${arm}#${run}`];
    const cap = arm === "A1" ? 10 : 20;
    const h = spread(hits, per.map((k) => Math.min(k, cap)));
    const n = spread(named, per.map(() => cap));
    for (const id of ids) {
      let names;
      if (BACK_NINE.includes(id)) {
        const i = BACK_NINE.indexOf(id);
        if (n[i] < h[i]) throw new Error("named below hits");
        names = [...Array.from({ length: h[i] }, (_, j) => n3(j + 1)), ...Array.from({ length: n[i] - h[i] }, (_, j) => n3(500 + j))];
      } else {
        names = small(id);
      }
      const read = names.slice(0, arm === "A1" ? 5 : 10);
      runs.push({ arm, brief: id, run, result: { read, next: names.slice(read.length), bigJob: arm === "A1" ? null : "big" } });
    }
  }
  return { bench, data: { runs, judges: ALL.map((id) => ({ brief: id, result: { lessons: [] } })) } };
}
const both = (x) => ({ [`${x.arm}#1`]: x.r1, [`${x.arm}#2`]: x.r2 });

test("every bar is tested on the exact shares, not on rounded percents, and on the candidate's worse run against the other's better", () => {
  const verdictOf = (spec) => { const { bench, data } = edgeCase(244, spec); return score(data, bench); };
  const A1 = { r1: { hits: 50, named: 110 }, r2: { hits: 48, named: 110 } };
  // A3 over A2 by 12 of 244 lessons, 4.918 points: rounded per run, 57.0 - 52.0 reads 5.0, but it misses the 5-point bar.
  const short = verdictOf({ ...both({ arm: "A1", ...A1 }), ...both({ arm: "A2", r1: { hits: 127, named: 220 }, r2: { hits: 120, named: 220 } }), ...both({ arm: "A3", r1: { hits: 139, named: 220 }, r2: { hits: 150, named: 220 } }) });
  assert.equal(short.comparisons.A3_vs_A2, 4.9);
  assert.equal(short.verdict, "LAND THE RECIPE AND THE FILLS, WITHOUT THE LINES");
  // 13 of 244, 5.33 points, clears it.
  const clears = verdictOf({ ...both({ arm: "A1", ...A1 }), ...both({ arm: "A2", r1: { hits: 127, named: 220 }, r2: { hits: 120, named: 220 } }), ...both({ arm: "A3", r1: { hits: 140, named: 220 }, r2: { hits: 150, named: 220 } }) });
  assert.equal(clears.verdict, "LAND THE RECIPE, THE FILLS AND THE LINES");
  // The worse A3 run decides: had the better run been the only one compared, 150 would clear easily.
  assert.equal(clears.comparisons.A3_vs_A2, 5.3);
});

test("the recipe's recall bar passes at exactly 10 points over the old arm's better run and fails just under it", () => {
  // 220 judged: 22 more lessons is exactly 10 points, 21 is 9.5.
  const spec = (worse) => ({
    "A1#1": { hits: 30, named: 110 }, "A1#2": { hits: 25, named: 110 },
    "A2#1": { hits: worse, named: 220 }, "A2#2": { hits: 60, named: 220 },
    "A3#1": { hits: 0, named: 220 }, "A3#2": { hits: 0, named: 220 },
  });
  const at = edgeCase(220, spec(52));
  const s = score(at.data, at.bench);
  assert.equal(s.comparisons.A2_vs_A1, 10);
  assert.equal(s.verdict, "LAND THE RECIPE AND THE FILLS, WITHOUT THE LINES");
  const under = edgeCase(220, spec(51));
  assert.equal(score(under.data, under.bench).verdict, "LAND NOTHING");
});

test("the precision condition passes at exactly 10 points below the old arm and fails just past it", () => {
  // A1's better run: 60 of 110 named on target (54.545%). A2's worse run at 98 of 220 (44.545%) is exactly 10 below.
  const spec = (worse) => ({
    "A1#1": { hits: 60, named: 110 }, "A1#2": { hits: 55, named: 110 },
    "A2#1": { hits: worse, named: 220 }, "A2#2": { hits: 120, named: 220 },
    "A3#1": { hits: 0, named: 220 }, "A3#2": { hits: 0, named: 220 },
  });
  const at = edgeCase(244, spec(98));
  const s = score(at.data, at.bench);
  assert.equal(s.comparisons.A2_precision_vs_A1, -10);
  assert.equal(s.comparisons.A2_precisionOk, true);
  assert.equal(s.verdict, "LAND THE RECIPE AND THE FILLS, WITHOUT THE LINES");
  const past = edgeCase(244, spec(97));
  const p = score(past.data, past.bench);
  assert.equal(p.comparisons.A2_precisionOk, false);
  assert.equal(p.verdict, "LAND NOTHING");
});

test("the small-corpus guard counts a loss only when both old runs named a judged lesson and both titles-only runs missed it", () => {
  const passing = { hits: 100, named: 220 };
  const base = (smallA1, smallA2) => ({
    "A1#1": { hits: 20, named: 110, small: smallA1(1) }, "A1#2": { hits: 20, named: 110, small: smallA1(2) },
    "A2#1": { ...passing, small: smallA2(1) }, "A2#2": { ...passing, small: smallA2(2) },
    "A3#1": passing, "A3#2": passing,
  });
  const names = (id, list) => (id === "B11" ? list : ["001", "002", "003", "004", "005"]);
  const run = (spec) => { const { bench, data } = edgeCase(244, spec); return score(data, bench); };
  // Both old runs name 001 to 005 everywhere; both new runs drop B11's 004 and 005.
  const lost = run(base(() => (id) => names(id, ["001", "002", "003", "004", "005"]), () => (id) => names(id, ["001", "002", "003"])));
  assert.deepEqual(lost.guard.losses, ["B11:playbook-004", "B11:playbook-005"]);
  assert.equal(lost.verdict, "LAND NOTHING", "a failing guard blocks a landing the recall and precision bars would allow");
  // Only one old run named 004 and 005: run noise, no loss.
  const noise = run(base((k) => (id) => names(id, k === 1 ? ["001", "002", "003", "004", "005"] : ["001", "002", "003"]), () => (id) => names(id, ["001", "002", "003"])));
  assert.deepEqual(noise.guard.losses, []);
  // One new run still named them: no loss.
  const kept = run(base(() => (id) => names(id, ["001", "002", "003", "004", "005"]), (k) => (id) => names(id, k === 1 ? ["001", "002", "003"] : ["001", "002", "003", "004", "005"])));
  assert.deepEqual(kept.guard.losses, []);
  assert.equal(kept.verdict, "LAND THE RECIPE AND THE FILLS, WITHOUT THE LINES");
  assert.deepEqual(SMALL, ["B08", "B09", "B10", "B11", "B12", "B16"]);
});

test("the audit holds each helper to its own copy: tools, folders, paths and Bash", () => {
  const root = "C:/s/rs";
  const own = `${root}/B04/plain/docs/insights`;
  const dir = join(scratch, "transcripts");
  mkdirSync(dir);
  let n = 0;
  const t = (label, calls) => {
    const name = `agent-${++n}`;
    writeFileSync(join(dir, `${name}.jsonl`), calls.map((c) => JSON.stringify({ message: { role: "assistant", content: [{ type: "tool_use", name: c[0], input: c[1] }] } })).join("\n"));
    writeFileSync(join(dir, `${name}.meta.json`), JSON.stringify({ description: label }));
  };
  // Clean: everything a real run does.
  t("A1:B04:r1", [["Read", { file_path: `${root}/arms/A1/SKILL.md` }], ["Bash", { command: `node "${root}/arms/A1/corpus.mjs" "${own}"` }], ["Grep", { pattern: "^tags:", path: own, glob: "[0-9]*.md" }], ["Glob", { pattern: "*-seed*.md", path: own }], ["Read", { file_path: "C:\\Users\\x\\.claude\\projects\\p\\s\\tool-results\\toolu_1.txt" }], ["StructuredOutput", { read: [] }]]);
  t("judge:B04", [["Bash", { command: `cd "${root}/B04/asof/docs/insights" && cat 00*.md > C:/s/b04_1.txt` }], ["Read", { file_path: "C:/s/b04_1.txt" }]]);
  // Each of these breaks the rule once.
  t("A2:B04:r1", [["Grep", { pattern: "x" }]]);
  t("A2:B04:r2", [["Grep", { pattern: "x", path: "docs/insights/" }]]);
  t("A3:B04:r1", [["Glob", { pattern: "docs/insights/*seed*.md" }]]);
  t("A3:B04:r2", [["Bash", { command: `node "${root}/arms/A3/corpus.mjs" --list` }]]);
  t("A1:B04:r2", [["Bash", { command: "ls docs/insights" }]]);
  t("judge:B05", [["Read", { file_path: `${root}/out-A2.json` }]]);
  t("judge:B06", [["Bash", { command: `cat "${root}/B06/asof/docs/insights/../../../out-A1.json"` }]]);
  t("A1:B05:r1", [["Read", { file_path: `${root}/B05/plain/docs/insights/../../../B06/plain/docs/insights/001-x.md` }]]);
  t("A1:B06:r1", [["Grep", { path: "C:\\Users\\brigg\\ai-learning-journey\\projects\\the-back-nine\\docs\\insights", pattern: "x" }]]);
  t("A1:B07:r1", [["Skill", { skill: "brief" }]]);
  t("A1:B08:r1", [["Read", { file_path: `${root}/B09/plain/docs/insights/001-x.md` }]]);
  const r = auditRuns(dir, root);
  const who = r.breaches.map((b) => b.split(": ")[0]);
  assert.equal(r.helpers, 13);
  assert.deepEqual([...new Set(who)].sort(), ["A1:B04:r2", "A1:B05:r1", "A1:B06:r1", "A1:B07:r1", "A1:B08:r1", "A2:B04:r1", "A2:B04:r2", "A3:B04:r1", "A3:B04:r2", "judge:B05", "judge:B06"].sort());
  assert.ok(!who.includes("A1:B04:r1") && !who.includes("judge:B04"), "the clean run and judge pass");
  // The writers' audit: only Read, only inside the allowed folder.
  const wdir = join(scratch, "writers");
  mkdirSync(wdir);
  const w = (name, calls) => {
    writeFileSync(join(wdir, `agent-${name}.jsonl`), calls.map((c) => JSON.stringify({ message: { role: "assistant", content: [{ type: "tool_use", name: c[0], input: c[1] }] } })).join("\n"));
    writeFileSync(join(wdir, `agent-${name}.meta.json`), JSON.stringify({ description: name }));
  };
  w("ok", [["Read", { file_path: "C:/x/u5/blobs/a.md" }], ["StructuredOutput", { line: "x" }]]);
  w("grep", [["Grep", { pattern: "x" }]]);
  w("far", [["Read", { file_path: "C:/elsewhere/b.md" }]]);
  assert.deepEqual(auditReads(wdir, "C:/x/u5").breaches.map((b) => b.split(":")[0]).sort(), ["far", "grep"]);
});

test("the bench's command-line tools act when run through a linked folder, as ~/.claude/skills/brief is", () => {
  // A junction on Windows (no admin rights needed), a folder symlink elsewhere.
  const link = join(scratch, "linked-bench");
  symlinkSync(here, link, "junction");
  for (const [file, usage] of [["audit-transcripts.mjs", /usage: audit-transcripts\.mjs/], ["score.mjs", /usage: node score\.mjs/], ["make-rescore.mjs", /usage: make-rescore\.mjs/], ["build-copies.mjs", /usage: node build-copies\.mjs/]]) {
    const r = spawnSync(process.execPath, [join(link, file)], { encoding: "utf8" });
    assert.match(r.stderr, usage, `${file} run through the link printed its usage error`);
    assert.notEqual(r.status, 0, `${file} run through the link exits non-zero`);
  }
});
