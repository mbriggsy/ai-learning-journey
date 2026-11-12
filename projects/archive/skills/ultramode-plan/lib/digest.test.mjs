import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DIGEST_CUT, DIGEST_PRINT_CAP, block, digest, entries, ledger, resultOf, summaryIds } from "./digest.mjs";
import { judge } from "./vote-law.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// Results in the shapes the scripts return (read from the first real run's output files,
// 2026-11-11), each verdict made by the vote law itself, so it carries the law's fix call.
const vote = (extra = {}) => ({ real: true, material: true, new: true, corrected_severity: "P2", fix_is_correct: true, reasoning: "holds at plan line 3", better_fix: "", ...extra });
const finding = (id, severity, votes, extra = {}) => ({
  id,
  seat: id.split("-").slice(1, -1).join("-"),
  finding: { title: `the title of ${id}`, severity, section: "KTD15", line: 202, confidence: 75, why_it_matters: "why", suggested_fix: `the fix of ${id}`, ...extra },
  verdict: judge(votes, severity),
  votes,
  line: "both",
});
const CHECK = {
  summary: { stage: "check-1", round: 1, confirmed: ["c1-coherence-1", "c1-adv-hidden-work-2", "c1-reach-2"], handVerify: ["c1-reach-1"], advisory: ["c1-premise-1"], rejected: [] },
  seats: [],
  findings: [
    finding("c1-coherence-1", "P1", [vote(), vote(), vote()]),
    finding("c1-adv-hidden-work-2", "P1", [vote(), vote({ fix_is_correct: false, better_fix: "Gate Keep on the plan's unsaved mark instead." }), vote({ better_fix: "Also test that popstate cannot be cancelled." })]),
    finding("c1-reach-2", "P2", [vote({ fix_is_correct: false, better_fix: "Name the floor pass in U3." }), vote({ fix_is_correct: false, better_fix: "Name the floor pass in U3." })]),
    finding("c1-reach-1", "P2", [vote(), vote({ real: false })]),
    finding("c1-premise-1", "P2", [vote({ material: false }), vote({ material: false })]),
  ],
};
const amendment = (id, change, votes) => ({ id, section: { line: 40, heading: "U3. The table" }, agent: "repo-research-analyst", amendment: { section: "U3", gap: "the table never names its pass", severity: "P1", change, evidence: "src/x.ts:3", old_values: ["the full pass", "KTD9"] }, verdict: judge(votes, "P1"), votes });
const DEEPEN = {
  summary: { stage: "deepen", outcome: "deepen", premise: { ran: true, above: [], carried: ["premise-1"] }, amendments: { confirmed: ["A1"], handVerify: [], advisory: ["A2"], rejected: [] } },
  premise: [{ id: "premise-1", finding: { title: "the goal is the wrong one", severity: "P2", section: "Goal", line: 9, suggested_fix: "restate the goal" }, verdict: judge([vote(), vote()], "P2"), votes: [vote(), vote()], line: "below" }],
  scorer: {},
  selection: {},
  research: [],
  amendments: [
    amendment("A1", `Name the floor pass. ${"Then say which count the rail compares. ".repeat(9)}The end.`, [vote(), vote(), vote()]),
    amendment("A2", "c", [vote({ material: false }), vote({ material: false }), vote({ material: false })]),
  ],
};

test("the vote law's fixtures read as intended: the statuses and fix calls the digest must print", () => {
  assert.deepEqual(CHECK.findings.map((f) => [f.id, f.verdict.status, f.verdict.fix.action]), [
    ["c1-coherence-1", "confirmed", "apply"],
    ["c1-adv-hidden-work-2", "confirmed", "apply"],
    ["c1-reach-2", "confirmed", "apply-better"],
    ["c1-reach-1", "hand-verify", "apply"],
    ["c1-premise-1", "advisory", "apply"],
  ]);
});

test("the digest prints the summary one key a line, then a block per confirmed and hand-verify finding, advisory and rejected left out", () => {
  const { text: d, missing } = digest(CHECK);
  assert.deepEqual(missing, []);
  assert.ok(d.startsWith("# check-1 result, digested\n\n## summary\nstage: \"check-1\"\nround: 1\n"));
  assert.ok(d.includes('handVerify: ["c1-reach-1"]\n'));
  assert.ok(d.includes("## 4 of 5 ledger entries: 3 confirmed, 1 hand-verify (advisory and rejected ids are in the summary)"));
  assert.ok(d.includes("## c1-coherence-1 [confirmed] P1 -> P2/P2/P2 | L202 KTD15\nT: the title of c1-coherence-1\nFIX: the fix of c1-coherence-1\nACT: apply: 3 of 3 real-voters judged the proposed change right\n"));
  assert.ok(!d.includes("c1-premise-1 ["));
});

test("the ACT line is the vote law's fix call: a minority's fix is a D line under apply, a right-voter's addition an N line, apply-better's fix a B line", () => {
  const { text: d } = digest(CHECK);
  // Two of three judged the fix right: the law says apply, and the dissent's fix is not the fold.
  assert.ok(d.includes("ACT: apply: 2 of 3 real-voters judged the proposed change right\n  D: Gate Keep on the plan's unsaved mark instead.\n  N: Also test that popstate cannot be cancelled."));
  assert.ok(d.includes("## c1-reach-2 [confirmed] P2 -> P2/P2 | L202 KTD15\nT: the title of c1-reach-2\nFIX: the fix of c1-reach-2\nACT: apply-better: 2 of 2 real-voters judged the proposed change wrong, with one better fix\n  B: Name the floor pass in U3."));
  assert.ok(d.includes("## c1-reach-1 [hand-verify] P2 -> P2/P2 | L202 KTD15\nT: the title of c1-reach-1\nFIX: the fix of c1-reach-1\nACT: apply: 1 of 1 real-voters judged the proposed change right"));
  // An entry whose verdict has no fix call is sent to a trace, never folded as proposed.
  const bare = block({ id: "c1-x-1", kind: "finding", entry: { finding: { title: "t", severity: "P2" }, verdict: { status: "confirmed", votedSeverity: ["P2"] }, votes: [] } });
  assert.match(bare, /ACT: hand-verify: the verdict carries no fix call/);
});

test("a deepen's digest holds its amendments and its premise findings, the change and old values whole", () => {
  const { text: d, missing } = digest(DEEPEN);
  assert.deepEqual(missing, []);
  assert.ok(d.includes("## 2 of 3 ledger entries: 2 confirmed, 0 hand-verify"));
  assert.ok(d.includes("## premise-1 [confirmed] P2 -> P2/P2 | L9 Goal\nT: the goal is the wrong one\nFIX: restate the goal\nACT: apply"));
  const a1 = DEEPEN.amendments[0].amendment.change;
  assert.ok(a1.length > DIGEST_CUT);
  assert.ok(d.includes(`## A1 [confirmed] P1 -> P2/P2/P2 | L40 U3. The table | repo-research-analyst\nGAP: the table never names its pass\nCHANGE: ${a1}\nOLD: the full pass | KTD9\nACT: apply`));
  assert.ok(!d.includes("## A2 "));
  assert.deepEqual(ledger(DEEPEN).map((e) => [e.id, e.kind]), [["premise-1", "finding"], ["A1", "amendment"], ["A2", "amendment"]]);
  assert.deepEqual(summaryIds(DEEPEN.summary), ["A1", "premise-1"]);
});

test("an acted-on id the summary names with no ledger entry is named, never dropped quietly", () => {
  const short = { ...CHECK, findings: CHECK.findings.filter((f) => f.id !== "c1-reach-2") };
  const { text, missing } = digest(short);
  assert.deepEqual(missing, ["c1-reach-2"]);
  assert.ok(text.includes("## NOT IN THE LEDGER: the summary names 1 acted-on id(s) with no entry here: c1-reach-2"));
});

test("descriptive fields are one line, cut at the limit with a mark; a long summary value spreads over lines; a research result prints its gists whole", () => {
  const long = "word ".repeat(200);
  const b = block({ id: "c1-coherence-9", kind: "finding", entry: finding("c1-coherence-9", "P2", [vote(), vote()], { title: `line one\nline two ${long}`, suggested_fix: long }) });
  const t = b.split("\n").find((l) => l.startsWith("T: "));
  assert.equal(t.length, "T: ".length + DIGEST_CUT + 3);
  assert.ok(t.startsWith("T: line one line two word") && t.endsWith("..."));
  assert.equal(b.split("\n").find((l) => l.startsWith("FIX: ")), `FIX: ${long.trim()}`);
  const wide = digest({ ...CHECK, summary: { ...CHECK.summary, holes: Array.from({ length: 40 }, (_, i) => ({ seat: `seat-${i}`, missed: "the sections it never confirmed reading" })) } }).text;
  assert.ok(wide.split("\n").every((l) => l.length < 2000));
  assert.ok(wide.includes("holes:\n[\n"));
  const research = { summary: { stage: "research", asked: 2, answered: 2 }, gists: [{ agent: "repo-research-analyst", gist: long, dossier: "C:/job/dossiers/x.md", changes_a_decision: true }] };
  const d = digest(research).text;
  assert.ok(d.includes("## gists\n"));
  assert.ok(d.includes(JSON.stringify(research.gists[0], null, 1)));
});

test("the file is the notice's output file (the return under result) or the return itself; anything else is refused", () => {
  assert.deepEqual(resultOf(JSON.stringify({ summary: "the workflow's description", agentCount: 141, result: CHECK })), JSON.parse(JSON.stringify(CHECK)));
  assert.deepEqual(resultOf(JSON.stringify(CHECK)), JSON.parse(JSON.stringify(CHECK)));
  assert.throws(() => resultOf(JSON.stringify({ result: { findings: [] } })), /digest: the file holds no stage result/);
  assert.throws(() => resultOf("[1, 2]"), /digest: the file holds no stage result/);
});

test("ids print their entries whole up to the print cap; one past it, or in no ledger, is named and counted against the ids asked for", () => {
  const { printed, over, missing } = entries(CHECK, ["c1-reach-1", "c9-nobody-1", "c1-premise-1"]);
  assert.deepEqual(printed.map((t) => JSON.parse(t).id), ["c1-reach-1", "c1-premise-1"]);
  assert.deepEqual([over, missing], [[], ["c9-nobody-1"]]);
  const big = (id) => finding(id, "P2", [vote({ reasoning: "r".repeat(400) }), vote()], { why_it_matters: "w".repeat(9000) });
  const heavy = { ...CHECK, findings: [big("c1-reach-7"), big("c1-reach-8"), big("c1-reach-9")] };
  const capped = entries(heavy, ["c1-reach-7", "c1-reach-8", "c1-reach-9"]);
  assert.deepEqual(capped.printed.map((t) => JSON.parse(t).id), ["c1-reach-7", "c1-reach-8"]);
  assert.deepEqual(capped.over, ["c1-reach-9"]);
  assert.ok(capped.printed.join("").length <= DIGEST_PRINT_CAP);
});

test("the command digests a file, prints entries by id (exit 1 naming any it cannot find), and exits 2 on a file it cannot read", (t) => {
  const dir = tmpRoot(t);
  const file = join(dir, "check.output");
  writeFileSync(file, JSON.stringify({ result: CHECK }));
  const run = (...args) => spawnSync(process.execPath, [join(here, "digest.mjs"), ...args], { encoding: "utf8" });
  const all = run(file);
  assert.equal(all.status, 0, all.stderr);
  assert.equal(all.stdout, digest(JSON.parse(JSON.stringify(CHECK))).text);
  const one = run(file, "c1-adv-hidden-work-2");
  assert.equal(one.status, 0, one.stderr);
  assert.deepEqual(JSON.parse(one.stdout), JSON.parse(JSON.stringify(CHECK.findings[1])));
  const some = run(file, "c1-reach-1", "A9");
  assert.equal(some.status, 1);
  assert.equal(JSON.parse(some.stdout).id, "c1-reach-1");
  assert.match(some.stderr, /1 of the 2 ids asked for are in no ledger of this result: A9/);
  writeFileSync(file, JSON.stringify({ result: { ...CHECK, findings: CHECK.findings.slice(1) } }));
  const gap = run(file);
  assert.equal(gap.status, 1);
  assert.match(gap.stderr, /the summary names 1 acted-on id\(s\) that no ledger entry holds: c1-coherence-1/);
  writeFileSync(file, "{not json");
  assert.equal(run(file).status, 2);
  assert.equal(run(join(dir, "none.output")).status, 2);
  assert.match(run().stderr, /^usage: /);
});
