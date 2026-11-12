import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DIGEST_CUT, block, digest, entries, ledger, resultOf } from "./digest.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// Results in the shapes the scripts return (read from the first real run's output files,
// 2026-11-11): a check finding, a deepen amendment, a deepen premise finding, each with its verdict
// and votes.
const vote = (extra = {}) => ({ real: true, material: true, new: true, corrected_severity: "P2", fix_is_correct: true, reasoning: "holds at plan line 3", better_fix: "", ...extra });
const finding = (id, status, extra = {}) => ({
  id,
  seat: id.split("-").slice(1, -1).join("-"),
  finding: { title: `the title of ${id}`, severity: "P1", section: "KTD15", line: 202, confidence: 75, why_it_matters: "why", suggested_fix: `the fix of ${id}`, ...extra },
  verdict: { status, basis: "NEW x REAL x MATERIAL", votedSeverity: ["P1", "P2"] },
  votes: [vote(), vote()],
  line: "both",
});
const CHECK = {
  summary: { stage: "check-1", round: 1, confirmed: ["c1-coherence-1", "c1-adv-hidden-work-2"], handVerify: ["c1-reach-1"], advisory: ["c1-premise-1"], rejected: [] },
  seats: [],
  findings: [
    finding("c1-coherence-1", "confirmed"),
    { ...finding("c1-adv-hidden-work-2", "confirmed"), votes: [vote(), vote({ fix_is_correct: false, better_fix: "Gate Keep on the plan's unsaved mark instead." }), null] },
    { ...finding("c1-reach-1", "hand-verify"), votes: [vote({ real: false }), null] },
    finding("c1-premise-1", "advisory"),
  ],
};
const DEEPEN = {
  summary: { stage: "deepen", outcome: "deepen", amendments: { confirmed: ["A1"], handVerify: [], advisory: ["A2"], rejected: [] } },
  premise: [{ id: "premise-1", finding: { title: "the goal is the wrong one", severity: "P2", section: "Goal", line: 9, suggested_fix: "restate the goal" }, verdict: { status: "confirmed", votedSeverity: ["P2", "P2"] }, votes: [vote(), vote()], line: "below" }],
  scorer: {},
  selection: {},
  research: [],
  amendments: [
    { id: "A1", section: { line: 40, heading: "U3. The table" }, agent: "repo-research-analyst", amendment: { section: "U3", gap: "the table never names its pass", severity: "P1", change: "Name the floor pass.", evidence: "src/x.ts:3", old_values: ["the full pass", "KTD9"] }, verdict: { status: "confirmed", votedSeverity: ["P1", "P1"] }, votes: [vote(), vote()] },
    { id: "A2", section: { line: 50, heading: "U4" }, agent: "spec-flow-analyzer", amendment: { section: "U4", gap: "g", severity: "P2", change: "c", evidence: "e", old_values: [] }, verdict: { status: "advisory", votedSeverity: [] }, votes: [] },
  ],
};

test("the digest prints the summary one key a line, then a block per confirmed and hand-verify finding, advisory and rejected left out", () => {
  const d = digest(CHECK);
  assert.ok(d.startsWith("# check-1 result, digested\n\n## summary\nstage: \"check-1\"\nround: 1\n"));
  assert.ok(d.includes('handVerify: ["c1-reach-1"]\n'));
  assert.ok(d.includes("## 3 of 4 ledger entries: 2 confirmed, 1 hand-verify (advisory and rejected ids are in the summary)"));
  assert.ok(d.includes("## c1-coherence-1 [confirmed] P1 -> P1/P2 | L202 KTD15\nT: the title of c1-coherence-1\nFIX: the fix of c1-coherence-1\nACT: apply\n"));
  // A dead voter (null) is skipped, and a real voter who calls the fix wrong brings its better fix.
  assert.ok(d.includes("ACT: rework: 1 of 2 real voters call the fix wrong or short\n  B: Gate Keep on the plan's unsaved mark instead."));
  assert.ok(d.includes("## c1-reach-1 [hand-verify] P1 -> P1/P2 | L202 KTD15\nT: the title of c1-reach-1\nFIX: the fix of c1-reach-1\nACT: trace: no voter held it real"));
  assert.ok(!d.includes("c1-premise-1 ["));
});

test("a deepen's digest holds its amendments and its premise findings, each amendment with its old values", () => {
  const d = digest(DEEPEN);
  assert.ok(d.includes("## 2 of 3 ledger entries: 2 confirmed, 0 hand-verify"));
  assert.ok(d.includes("## premise-1 [confirmed] P2 -> P2/P2 | L9 Goal\nT: the goal is the wrong one\nFIX: restate the goal\nACT: apply"));
  assert.ok(d.includes("## A1 [confirmed] P1 -> P1/P1 | L40 U3. The table | repo-research-analyst\nGAP: the table never names its pass\nCHANGE: Name the floor pass.\nOLD: the full pass | KTD9\nACT: apply"));
  assert.ok(!d.includes("## A2 "));
  assert.deepEqual(ledger(DEEPEN).map((e) => [e.id, e.kind]), [["premise-1", "finding"], ["A1", "amendment"], ["A2", "amendment"]]);
});

test("every field is one line, cut at the limit with a mark; a research result prints its gists whole", () => {
  const long = "word ".repeat(200);
  const b = block({ id: "c1-coherence-9", kind: "finding", entry: { ...finding("c1-coherence-9", "confirmed", { title: `line one\nline two ${long}` }), votes: [vote({ fix_is_correct: false, better_fix: long })] } });
  const t = b.split("\n").find((l) => l.startsWith("T: "));
  assert.equal(t.length, "T: ".length + DIGEST_CUT + 3);
  assert.ok(t.startsWith("T: line one line two word") && t.endsWith("..."));
  assert.ok(b.split("\n").every((l) => l.length <= DIGEST_CUT + 200));
  const research = { summary: { stage: "research", asked: 2, answered: 2 }, gists: [{ agent: "repo-research-analyst", gist: long, dossier: "C:/job/dossiers/x.md", changes_a_decision: true }] };
  const d = digest(research);
  assert.ok(d.includes("## gists\n"));
  assert.ok(d.includes(JSON.stringify(research.gists[0])));
});

test("the file is the notice's output file (the return under result) or the return itself; anything else is refused", () => {
  assert.deepEqual(resultOf(JSON.stringify({ summary: "the workflow's description", agentCount: 141, result: CHECK })), CHECK);
  assert.deepEqual(resultOf(JSON.stringify(CHECK)), CHECK);
  assert.throws(() => resultOf(JSON.stringify({ result: { findings: [] } })), /digest: the file holds no stage result/);
  assert.throws(() => resultOf("[1, 2]"), /digest: the file holds no stage result/);
});

test("ids print their entries whole, and an id in no ledger is named and counted against the ids asked for", () => {
  const { found, missing } = entries(CHECK, ["c1-reach-1", "c9-nobody-1", "c1-premise-1"]);
  assert.deepEqual(found.map((e) => e.id), ["c1-reach-1", "c1-premise-1"]);
  assert.deepEqual(missing, ["c9-nobody-1"]);
});

test("the command digests a file, prints entries by id (exit 1 naming any it cannot find), and exits 2 on a file it cannot read", (t) => {
  const dir = tmpRoot(t);
  const file = join(dir, "check.output");
  writeFileSync(file, JSON.stringify({ result: CHECK }));
  const run = (...args) => spawnSync(process.execPath, [join(here, "digest.mjs"), ...args], { encoding: "utf8" });
  const all = run(file);
  assert.equal(all.status, 0, all.stderr);
  assert.equal(all.stdout, digest(CHECK));
  const one = run(file, "c1-adv-hidden-work-2");
  assert.equal(one.status, 0, one.stderr);
  assert.deepEqual(JSON.parse(one.stdout), CHECK.findings[1]);
  const some = run(file, "c1-reach-1", "A9");
  assert.equal(some.status, 1);
  assert.equal(JSON.parse(some.stdout).id, "c1-reach-1");
  assert.match(some.stderr, /1 of the 2 ids asked for are in no ledger of this result: A9/);
  writeFileSync(file, "{not json");
  assert.equal(run(file).status, 2);
  assert.equal(run(join(dir, "none.output")).status, 2);
  assert.match(run().stderr, /^usage: /);
});
