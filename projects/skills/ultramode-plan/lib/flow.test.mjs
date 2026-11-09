import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { firstStage, landingCheck, nextStep, parseWindowLine, pathFacts, receipt, roundSeats, stageCost, stageGate, startCheck } from "./flow.mjs";
import { git, repoRoot, tmpRoot, writeAt } from "../bench/testkit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FLOW = join(here, "flow.mjs");

// ------------------------------------------------------------------------- stages

test("under update the first stage is the deepen; with no brief it is /brief; with one, research", () => {
  assert.equal(firstStage({ update: true }).stage, "deepen");
  assert.equal(firstStage({ update: true, brief: "b" }).stage, "deepen");
  assert.equal(firstStage({ update: false, brief: "the brief" }).stage, "research");
  assert.equal(firstStage({ update: false, brief: "  " }).stage, "brief");
  assert.equal(firstStage({ update: false }).stage, "brief");
  assert.equal(firstStage({ update: false }).gate, "start");
});

test("update is a boolean wherever it is read: the string \"false\" never starts a deepen", () => {
  assert.throws(() => firstStage({ update: "false" }), /update must be true or false/);
  assert.throws(() => firstStage({}), /update must be true or false/);
  assert.throws(() => firstStage({ update: false, brief: 3 }), /brief is the brief's text or null/);
  assert.throws(() => startCheck({ gitRoot: "x", inside: true }, { update: "true" }), /update must be true or false/);
});

test("each stage outcome maps to its next step, and names the gate the main loop runs before it", () => {
  const step = (stage, outcome, o = {}) => nextStep({ stage, outcome, sendBacks: 0, ...o });
  assert.equal(step("brief", "done").step, "research");
  // Writing from research's dossiers is research's fold: it always completes (KTD10, U6 step 3).
  assert.deepEqual([step("research", "done").step, step("research", "done").gate], ["write", "fold"]);
  assert.deepEqual([step("write", "done").step, step("write", "done").gate], ["deepen", "start"]);
  // A send-back rewrite is a stage start, which the window gate may hold.
  assert.equal(step("deepen", "premise-goal").gate, "start");
  assert.equal(step("deepen", "blocked").gate, null);
  assert.equal(step("check-1", "done", { changes: 0 }).gate, null);
  assert.equal(step("deepen", "blocked").step, "blocked");
  const back = step("deepen", "premise-goal");
  assert.equal(back.step, "write");
  assert.equal(back.sendBacks, 1);
  const park = step("deepen", "park");
  assert.equal(park.step, "deepen");
  assert.equal(park.skipPremise, true);
  assert.deepEqual([step("deepen", "passed").step, step("deepen", "passed").deepen], ["check-1", "passed"]);
  assert.deepEqual([step("deepen", "deepened").step, step("deepen", "deepened").deepen], ["check-1", "deepened"]);
  assert.equal(step("check-1", "done", { changes: 3 }).step, "check-2");
  assert.deepEqual([step("check-1", "done", { changes: 0 }).step, step("check-1", "done", { changes: 0 }).open], ["land", 0]);
  assert.equal(step("check-2", "done", { p0p1: 1 }).step, "check-3");
  assert.deepEqual([step("check-2", "done", { p0p1: 0 }).step, step("check-2", "done", { p0p1: 0 }).open], ["land", 0]);
  // The open exit: the run's only landing with a P0 or P1 still standing.
  const openExit = step("check-3", "done", { open: 2 });
  assert.deepEqual([openExit.step, openExit.open], ["land", 2]);
  assert.match(openExit.reason, /"checked, 2 P0\/P1 open"/);
  assert.deepEqual([step("check-3", "done", { open: 0 }).step, step("check-3", "done", { open: 0 }).open], ["land", 0]);
});

test("a second premise send-back blocks, so write and premise cannot loop", () => {
  const second = nextStep({ stage: "deepen", outcome: "premise-goal", sendBacks: 1 });
  assert.equal(second.step, "blocked");
  assert.match(second.reason, /second verified premise finding/);
});

test("an unknown stage, an outcome the stage cannot have, and a missing count each throw", () => {
  assert.throws(() => nextStep({ stage: "review", outcome: "done", sendBacks: 0 }), /no stage "review"/);
  assert.throws(() => nextStep({ stage: "research", outcome: "passed", sendBacks: 0 }), /research has no outcome "passed"/);
  assert.throws(() => nextStep({ stage: "check-1", outcome: "done", sendBacks: 0 }), /changes must be a whole number/);
  assert.throws(() => nextStep({ stage: "check-3", outcome: "done", open: -1, sendBacks: 0 }), /open must be a whole number/);
  assert.throws(() => nextStep({ stage: "deepen", outcome: "premise-goal", sendBacks: 0.5 }), /sendBacks/);
});

test("the send-back count is required on every call, so a resumed session cannot disarm the loop guard", () => {
  assert.throws(() => nextStep({ stage: "deepen", outcome: "premise-goal" }), /sendBacks must be a whole number/);
  assert.throws(() => nextStep({ stage: "write", outcome: "done" }), /sendBacks must be a whole number/);
  // Each answer carries the count forward for the next call.
  assert.equal(nextStep({ stage: "write", outcome: "done", sendBacks: 1 }).sendBacks, 1);
});

// ------------------------------------------------------------------------- the window gate

// Real lines from the window skill itself, through its test hook: no transcript is read.
const WINDOW = join(repoRoot(), "projects", "skills", "window", "window.mjs");
function windowLine(tokens) {
  const r = spawnSync(process.execPath, [WINDOW], { encoding: "utf8", env: { ...process.env, WINDOW_TEST_TOKENS: String(tokens) } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
// The same reading as a live line: the window skill's label without the TEST marker.
const live = (line) => line.replace(/^Context \(TEST [^)]*\)/, "Context");

const SMOKE = 20_000; // the smoke plan's bytes when its stages were measured
const DEEP = 150_000; // a Deep plan's bytes
const COSTS = {
  research: { cost: 30_000, planBytes: null },
  deepen: { cost: 10_000, planBytes: SMOKE },
  "check-1": { cost: 40_000, planBytes: SMOKE },
};

test("the parser reads every tier from the window skill's own lines, live and TEST alike", () => {
  const cases = [
    [100_000, "room", null],
    [450_000, "warn", 60],
    [520_000, "no-fanout", 60],
    [650_000, "wrap", 60],
  ];
  for (const [tokens, tier, wrap] of cases) {
    const testLine = parseWindowLine(windowLine(tokens));
    assert.deepEqual([testLine.kind, testLine.test, testLine.tier, testLine.wrapPercent, testLine.tokens], ["reading", true, tier, wrap, tokens], `TEST line at ${tokens}`);
    const liveLine = parseWindowLine(live(windowLine(tokens)));
    assert.deepEqual([liveLine.kind, liveLine.test, liveLine.tier, liveLine.tokens], ["reading", false, tier, tokens], `live line at ${tokens}`);
  }
});

test("the gate starts a stage below the no-new-fan-out tier, at room and at the warn line", () => {
  for (const tokens of [100_000, 450_000]) {
    const g = stageGate({ line: windowLine(tokens), stage: "check-1", planBytes: DEEP, costs: {} });
    assert.equal(g.go, true, String(tokens));
    assert.equal(g.step, "check-1");
  }
});

test("at the no-new-fan-out tier, a stage with no measured cost is held, and a held start maps to a window stop", () => {
  const g = stageGate({ line: windowLine(520_000), stage: "check-2", planBytes: DEEP, costs: COSTS });
  assert.equal(g.go, false);
  assert.equal(g.step, "window-stop");
  assert.equal(g.handBack, "check-2");
  assert.match(g.reason, /no measured main-loop cost/);
});

test("at the no-new-fan-out tier, a stage starts when its cost, scaled to a Deep plan, stays under the wrap line", () => {
  // deepen: 10,000 tokens at 20,000 bytes scales to 75,000 at 150,000 bytes; 520,000 + 75,000 reads 59.5%.
  assert.equal(stageCost(COSTS, "deepen", DEEP), 75_000);
  const g = stageGate({ line: windowLine(520_000), stage: "deepen", planBytes: DEEP, costs: COSTS });
  assert.equal(g.go, true, g.reason);
  assert.equal(g.cost, 75_000);
  // check-1: 40,000 tokens fits unscaled (560,000), but scaled to the Deep plan it is 300,000.
  const big = stageGate({ line: windowLine(520_000), stage: "check-1", planBytes: DEEP, costs: COSTS });
  assert.equal(big.go, false);
  assert.equal(big.cost, 300_000);
  assert.equal(stageGate({ line: windowLine(520_000), stage: "check-1", planBytes: SMOKE, costs: COSTS }).go, true);
  // A fixed cost does not scale.
  assert.equal(stageCost(COSTS, "research", DEEP), 30_000);
  assert.throws(() => stageGate({ line: windowLine(520_000), stage: "deepen", costs: COSTS }), /needs the staged plan's size/);
});

test("the wrap edge is the window skill's own rounding: 599,499 reads 59.9% and starts, 599,500 reads 60.0% and holds", () => {
  const fixed = (cost) => ({ research: { cost, planBytes: null } });
  assert.equal(stageGate({ line: windowLine(520_000), stage: "research", costs: fixed(79_499) }).go, true);
  assert.equal(stageGate({ line: windowLine(520_000), stage: "research", costs: fixed(79_500) }).go, false);
  // The window skill agrees: those two totals print 59.9% and 60.0%.
  assert.match(windowLine(599_499), /= 59\.9% /);
  assert.match(windowLine(599_500), /= 60\.0% .*past the 60% wrap line/);
});

test("at the no-new-fan-out tier research starts only on a fixed cost: one that grows with the plan it will write has no bound yet", () => {
  // Research fits alone at 52%: 520,000 + 30,000 reads 55.0%.
  assert.equal(stageGate({ line: windowLine(520_000), stage: "research", costs: COSTS }).go, true);
  // Measured launch to landed fold, its cost includes the write, so it grows with the plan; no
  // staged plan exists yet to scale it by, so it holds, however small the smoke figure.
  const grows = { research: { cost: 1_000, planBytes: SMOKE } };
  const held = stageGate({ line: windowLine(520_000), stage: "research", costs: grows });
  assert.deepEqual([held.go, held.step, held.handBack], [false, "window-stop", "research"]);
  assert.match(held.reason, /grows with the staged plan, which does not exist yet/);
  // Below the no-new-fan-out tier it starts as any stage does.
  assert.equal(stageGate({ line: windowLine(450_000), stage: "research", costs: grows }).go, true);
  // A plan size for a stage that starts before any plan exists is a wiring mistake.
  assert.throws(() => stageGate({ line: windowLine(520_000), stage: "research", planBytes: DEEP, costs: COSTS }), /takes no planBytes/);
  assert.throws(() => stageGate({ line: windowLine(100_000), stage: "brief", planBytes: DEEP, costs: {} }), /takes no planBytes/);
});

test("at the wrap tier the gate stops whatever the stage's cost", () => {
  const g = stageGate({ line: windowLine(650_000), stage: "research", costs: { research: { cost: 1, planBytes: null } } });
  assert.deepEqual([g.go, g.step, g.handBack], [false, "window-stop", "research"]);
});

test("past the wrap line the write from research's saved dossiers still completes, as U6's smoke step 3 needs, and the next launch stops", () => {
  const write = nextStep({ stage: "research", outcome: "done", sendBacks: 0 });
  const g = stageGate({ line: windowLine(650_000), action: write.gate, stage: write.step });
  assert.deepEqual([g.go, g.step], [true, "fold"]);
  const deepen = nextStep({ stage: "write", outcome: "done", sendBacks: 0 });
  assert.equal(stageGate({ line: windowLine(650_000), action: deepen.gate, stage: deepen.step, costs: COSTS, planBytes: DEEP }).step, "window-stop");
});

test("a scaled cost rounds up, never down", () => {
  // 10,001 tokens measured at 20,000 bytes, on a 150,000-byte plan: 75,007.5, so 75,008.
  assert.equal(stageCost({ deepen: { cost: 10_001, planBytes: SMOKE } }, "deepen", DEEP), 75_008);
  assert.equal(stageCost({ deepen: { cost: 1, planBytes: 3 } }, "deepen", 1), 1);
});

test("the gate never holds a pending fold, whatever the window says", () => {
  for (const line of [windowLine(650_000), "Context: no transcript for this session (x) yet.", ""]) {
    const g = stageGate({ line, action: "fold", stage: "check-1" });
    assert.deepEqual([g.go, g.step], [true, "fold"]);
  }
});

test("a TEST line counts as a reading and is marked; a GUESS line, a missing one and a new wording are not, and hold", () => {
  const t = stageGate({ line: windowLine(100_000), stage: "research" });
  assert.deepEqual([t.go, t.test], [true, true]);
  assert.equal(stageGate({ line: live(windowLine(100_000)), stage: "research" }).test, false);
  const guess = live(windowLine(100_000)).replace(/^Context/, "Context (GUESS \u2014 no session id; newest log here, maybe another session's)");
  for (const line of [guess, "Context: no transcript for this session (x) yet.", "", "Context: 100,000 / 1M = 10.0% \u2014 roomy"]) {
    const g = stageGate({ line, stage: "research" });
    assert.deepEqual([g.go, g.step], [false, "window-stop"], line);
  }
  assert.match(stageGate({ line: "Context: 100,000 / 1M = 10.0% \u2014 roomy", stage: "research" }).reason, /window skill changed/);
});

test("a compacted line asks for a fresh reading instead of starting or stopping", () => {
  const g = stageGate({ line: "Context: compacted 3 min ago (500,000 \u2192 a 40,000-token summary) \u2014 no live read since; ask again after one more step.", stage: "deepen" });
  assert.deepEqual([g.go, g.step], [false, "reread"]);
});

test("a malformed stage-costs table throws", () => {
  assert.throws(() => stageCost({ review: { cost: 1, planBytes: null } }, "review"), /name no stage "review"/);
  assert.throws(() => stageCost({ deepen: { cost: 1.5, planBytes: null } }, "deepen"), /whole number of tokens/);
  assert.throws(() => stageCost({ deepen: { cost: 1, planBytes: 0 } }, "deepen"), /planBytes/);
  assert.throws(() => stageCost([], "deepen"), /object keyed by stage/);
  assert.equal(stageCost({}, "deepen", DEEP), null);
});

// ------------------------------------------------------------------------- rounds 2 and 3

const ROSTER = ["coherence", "feasibility", "scope-guardian", "adversarial", "security", "premise", "reach", "blast-radius", "test-vacuity"];

test("round 2 lists coherence plus exactly the touched seats, in roster order, a deletion counting as a touch", () => {
  const r = roundSeats({
    roster: ROSTER,
    changes: [
      { id: "C1", kind: "edit", classes: ["test-vacuity", "feasibility"] },
      { id: "C2", kind: "delete", classes: ["reach"] },
      { id: "C3", kind: "add", classes: [] },
    ],
  });
  assert.deepEqual(r.seats, ["coherence", "feasibility", "reach", "test-vacuity"]);
  assert.deepEqual(r.touchedBy.reach, ["C2"]);
  // A deletion alone still re-runs its seat.
  assert.deepEqual(roundSeats({ roster: ROSTER, changes: [{ id: "C9", kind: "delete", classes: ["blast-radius"] }] }).seats, ["coherence", "blast-radius"]);
  // Nothing touched: coherence alone.
  assert.deepEqual(roundSeats({ roster: ROSTER, changes: [] }).seats, ["coherence"]);
  // A change naming coherence lists it once.
  assert.deepEqual(roundSeats({ roster: ROSTER, changes: [{ id: "C1", kind: "edit", classes: ["coherence"] }] }).seats, ["coherence"]);
  // A change id is trimmed, as fold.mjs's grep list trims it: one ledger id, one spelling.
  assert.deepEqual(roundSeats({ roster: ROSTER, changes: [{ id: " C4 ", kind: "edit", classes: ["reach"] }] }).touchedBy.reach, ["C4"]);
});

test("round 3 lists coherence plus exactly the seats its one fix touched", () => {
  const panel = ["coherence", "feasibility", "adv-sequencing", "adv-settled", "adv-hidden-work", "adv-verification", "premise", "reach"];
  assert.deepEqual(roundSeats({ roster: panel, changes: [{ id: "F2", kind: "edit", classes: ["adv-settled", "reach"] }] }).seats, ["coherence", "adv-settled", "reach"]);
});

test("a round refuses a seat outside the roster, a roster without coherence, and a malformed change", () => {
  assert.throws(() => roundSeats({ roster: ROSTER, changes: [{ id: "C1", kind: "edit", classes: ["design"] }] }), /"design", which is not a seat in this run's roster/);
  assert.throws(() => roundSeats({ roster: ["feasibility"], changes: [] }), /no coherence seat/);
  assert.throws(() => roundSeats({ roster: ROSTER, changes: [{ id: "C1", kind: "move", classes: [] }] }), /kind "move"/);
  assert.throws(() => roundSeats({ roster: ROSTER, changes: [{ kind: "edit", classes: [] }] }), /no id/);
  assert.throws(() => roundSeats({ roster: ["coherence", "coherence"], changes: [] }), /twice/);
});

// ------------------------------------------------------------------------- the receipt

const SHA = "799ac9aeb97bf1c51238c38122915470413c26c5";
const BASE = {
  update: false,
  deepen: "deepened",
  adversary: true,
  open: 0,
  ce: [{ commit: SHA, stages: ["research", "deepen", "check-1", "check-2"] }],
  coverage: { premise: { nothing: true }, reach: { verified: ["C3", "C7"] }, "blast-radius": { nothing: true }, "test-vacuity": { nothing: true } },
  holes: [],
  inline: [],
  strays: [],
  park: null,
  moved: null,
  record: "~/.claude/projects/x/job/2026-11-05T01-00-00Z/ultramode-plan-run.json",
};
const firstLine = (o) => receipt({ ...BASE, ...o }).split("\n")[0];
// An update run skips research, so no CE resolution served it.
const UPDATE_CE = [{ commit: SHA, stages: ["deepen", "check-1", "check-2"] }];

test("each receipt form in R9 comes out word for word, the updated forms included", () => {
  assert.equal(firstLine({}), "planned, deepened and checked");
  assert.equal(firstLine({ deepen: "passed" }), "planned, confidence check passed, checked");
  assert.equal(firstLine({ update: true, ce: UPDATE_CE }), "updated, deepened and checked");
  assert.equal(firstLine({ update: true, ce: UPDATE_CE, deepen: "passed" }), "updated, confidence check passed, checked");
  assert.equal(firstLine({ open: 2 }), "planned, deepened and checked, 2 P0/P1 open");
  assert.equal(firstLine({ deepen: "passed", open: 1 }), "planned, confidence check passed, checked, 1 P0/P1 open");
  assert.equal(firstLine({ adversary: false }), "planned, deepened, check incomplete: no adversary");
  assert.equal(firstLine({ adversary: false, deepen: "passed", update: true, ce: UPDATE_CE }), "updated, confidence check passed, check incomplete: no adversary");
});

test("the CE line names real stages, none an update run skipped, and every inline seat's commit is one it names", () => {
  assert.throws(() => receipt({ ...BASE, ce: [{ commit: SHA, stages: ["research", "review"] }] }), /names no stage review/);
  assert.throws(() => receipt({ ...BASE, update: true }), /an update run skips research/);
  // A seat's commit must be one the CE line names; a short sha matches its full form.
  const seat = (commit) => ({ seat: "coherence", file: "coherence-reviewer.md", commit });
  assert.throws(() => receipt({ ...BASE, inline: [seat("deadbee")] }), /which no CE resolution in the receipt names/);
  assert.throws(() => receipt({ ...BASE, inline: [seat(null)] }), /at CE absent, which no CE resolution/);
  assert.match(receipt({ ...BASE, inline: [seat(SHA.slice(0, 7))] }), /coherence \(coherence-reviewer\.md, CE 799ac9a\)/);
  assert.match(receipt({ ...BASE, ce: [{ commit: SHA.slice(0, 7), stages: ["check-1"] }], inline: [seat(SHA)] }), /, CE 799ac9a/);
  assert.throws(() => receipt({ ...BASE, moved: { changed: 3, cited: ["a", "a"] } }), /name one path twice/);
});

test("the whole receipt: park, CE commits with their stages, the four classes, holes, inline seats, strays, a move and the record", () => {
  const text = receipt({
    ...BASE,
    park: "KTD4 says X; the check found Y. Keep X?",
    ce: [{ commit: SHA, stages: ["research", "deepen"] }, { commit: "3449230", stages: ["check-1"] }],
    holes: [{ seat: "security", missed: "U4 to U6", resumes: 2 }],
    inline: [{ seat: "coherence", file: "coherence-reviewer.md", commit: "3449230" }, { seat: "premise", file: "adversarial-document-reviewer.md", commit: SHA }],
    strays: ["projects/x/probe.txt"],
    moved: { changed: 5, cited: ["projects/x/a.mjs", "projects/x/b.mjs"] },
  });
  assert.equal(
    text,
    [
      "planned, deepened and checked",
      "parked: KTD4 says X; the check found Y. Keep X?",
      `CE: ${SHA} (research, deepen); 3449230 (check-1)`,
      "coverage: premise: nothing found; reach: 2 verified (C3, C7); blast radius: nothing found; test vacuity: nothing found",
      "coverage holes: security (U4 to U6, resumed 2 times)",
      `seats without their CE file: coherence (coherence-reviewer.md, CE 3449230); premise (adversarial-document-reviewer.md, CE ${SHA})`,
      "stray files deleted: projects/x/probe.txt",
      "project moved during the run: 5 files changed, 2 the plan cites (projects/x/a.mjs, projects/x/b.mjs)",
      `run record: ${BASE.record}`,
    ].join("\n"),
  );
});

test("a quiet run's receipt says none for each empty list, names CE absent, and has no move or park line when there is none", () => {
  const text = receipt({ ...BASE, ce: [{ commit: null, stages: ["check-1"] }] });
  assert.match(text, /^CE: CE absent \(check-1\)$/m);
  const absent = { seat: "coherence", file: "coherence-reviewer.md", commit: null };
  assert.match(receipt({ ...BASE, ce: [{ commit: null, stages: ["check-1"] }], inline: [absent] }), /^seats without their CE file: coherence \(coherence-reviewer\.md, CE absent\)$/m);
  assert.match(text, /^coverage holes: none$/m);
  assert.match(text, /^seats without their CE file: none$/m);
  assert.match(text, /^stray files deleted: none$/m);
  assert.doesNotMatch(text, /project moved/);
  assert.doesNotMatch(text, /parked:/);
});

test("a class in the hole form needs its seat in the holes list, with what it missed and its resume count", () => {
  const holeCov = { ...BASE.coverage, premise: { hole: true } };
  assert.throws(() => receipt({ ...BASE, coverage: holeCov }), /premise is a coverage hole, so the holes list names seat "premise"/);
  const text = receipt({ ...BASE, coverage: holeCov, holes: [{ seat: "premise", missed: "the whole seat", resumes: 2 }] });
  assert.match(text, /premise: no result \(a coverage hole\)/);
  assert.match(text, /^coverage holes: premise \(the whole seat, resumed 2 times\)$/m);
  assert.throws(() => receipt({ ...BASE, holes: [{ seat: "x", missed: "y" }] }), /resumes must be a whole number/);
  // A holes list that names only another seat does not answer for this class.
  assert.throws(() => receipt({ ...BASE, coverage: holeCov, holes: [{ seat: "security", missed: "U4", resumes: 1 }] }), /names seat "premise"/);
  // The entry is keyed by the class's key, never its printed label ("blast radius").
  const blast = { ...BASE.coverage, "blast-radius": { hole: true } };
  assert.throws(() => receipt({ ...BASE, coverage: blast, holes: [{ seat: "blast radius", missed: "docs", resumes: 2 }] }), /names seat "blast-radius"/);
  assert.match(receipt({ ...BASE, coverage: blast, holes: [{ seat: "blast-radius", missed: "docs", resumes: 2 }] }), /blast radius: no result \(a coverage hole\)/);
});

test("an update's unjudged goal is a holes entry beside the premise class's own form, so verified premise findings and an unjudged goal both show (U4's R4-30, the route U6 takes)", () => {
  const goal = { seat: "premise", missed: "goal: no brief or origin document states one", resumes: 0 };
  const quiet = receipt({ ...BASE, update: true, ce: UPDATE_CE, holes: [goal] });
  assert.match(quiet, /^coverage: premise: nothing found; /m);
  assert.match(quiet, /^coverage holes: premise \(goal: no brief or origin document states one, resumed 0 times\)$/m);
  const found = receipt({ ...BASE, update: true, ce: UPDATE_CE, coverage: { ...BASE.coverage, premise: { verified: ["P2"] } }, holes: [goal] });
  assert.match(found, /^coverage: premise: 1 verified \(P2\); /m);
  assert.match(found, /^coverage holes: premise \(goal: no brief or origin document states one, resumed 0 times\)$/m);
});

test("reach and test vacuity skip together, on a plan with no code, and never one without the other", () => {
  const noCode = { ...BASE.coverage, reach: { skipped: "the plan has no code" }, "test-vacuity": { skipped: "the plan has no code" } };
  assert.match(receipt({ ...BASE, coverage: noCode }), /reach: skipped: the plan has no code; blast radius: nothing found; test vacuity: skipped: the plan has no code/);
  assert.throws(() => receipt({ ...BASE, coverage: { ...BASE.coverage, "test-vacuity": { skipped: "no code" } } }), /test-vacuity is skipped but reach is not/);
  assert.throws(() => receipt({ ...BASE, coverage: { ...BASE.coverage, reach: { skipped: "no code" } } }), /reach is skipped but test-vacuity is not/);
});

test("a project move changes at least one file, and cites no more than changed", () => {
  assert.throws(() => receipt({ ...BASE, moved: { changed: 0, cited: [] } }), /an unmoved project is moved: null/);
  assert.throws(() => receipt({ ...BASE, moved: { changed: 1, cited: ["a", "b"] } }), /more than the 1 that changed/);
  assert.throws(() => receipt({ ...BASE, moved: { changed: 2, cited: [""] } }), /a cited file is a path/);
  assert.match(receipt({ ...BASE, moved: { changed: 1, cited: [] } }), /^project moved during the run: 1 file changed, 0 the plan cites$/m);
});

test("the receipt needs every field and defaults none: an omitted open count never prints as a clean check", () => {
  for (const key of ["open", "holes", "inline", "strays", "park", "moved", "update"]) {
    const { [key]: _, ...rest } = BASE;
    assert.throws(() => receipt(rest), new RegExp(`missing ${key}`), key);
  }
  assert.throws(() => receipt({ ...BASE, opens: 2 }), /no field opens/);
  assert.throws(() => receipt({ ...BASE, open: null }), /open must be a whole number/);
  assert.throws(() => receipt({ ...BASE, update: "false" }), /update must be true or false/);
  assert.throws(() => receipt({ ...BASE, holes: null }), /holes must be a list/);
  assert.throws(() => receipt({ ...BASE, inline: ["coherence"] }), /names the seat, the file and the CE commit/);
  assert.throws(() => receipt({ ...BASE, inline: [{ seat: "coherence", file: "coherence-reviewer.md" }] }), /names the seat, the file and the CE commit/);
  assert.throws(() => receipt({ ...BASE, inline: [{ seat: "coherence", file: "c.md", commit: "v3.35" }] }), /CE commit is a git sha/);
  assert.throws(() => receipt({ ...BASE, strays: [3] }), /a stray file is a path/);
  assert.throws(() => receipt({ ...BASE, park: "" }), /paste-ready question, or null/);
  assert.throws(() => receipt({ ...BASE, moved: { changed: 1 } }), /changed, cited/);
});

test("a coverage form is read by its value, never its presence", () => {
  const cov = (o) => receipt({ ...BASE, coverage: { ...BASE.coverage, ...o } });
  assert.throws(() => cov({ premise: { nothing: false } }), /written \{ nothing: true \}/);
  assert.throws(() => cov({ premise: { nothing: null } }), /written \{ nothing: true \}/);
  assert.throws(() => cov({ premise: { hole: false } }), /written \{ hole: true \}/);
  assert.throws(() => cov({ premise: {} }), /exactly one of/);
  assert.throws(() => cov({ premise: { nothing: true, note: "x" } }), /exactly one of/);
});

test("the receipt refuses silence and the wrong skips: a missing class, two forms at once, a skipped premise or blast radius, an empty verified list", () => {
  const cov = (o) => receipt({ ...BASE, coverage: { ...BASE.coverage, ...o } });
  assert.throws(() => receipt({ ...BASE, coverage: { premise: { nothing: true }, reach: { nothing: true }, "blast-radius": { nothing: true } } }), /test vacuity coverage is missing: never silence/);
  assert.throws(() => cov({ premise: { nothing: true, verified: ["P1"] } }), /premise coverage needs exactly one/);
  assert.throws(() => cov({ premise: { skipped: "no code" } }), /premise is never skipped/);
  assert.throws(() => cov({ "blast-radius": { skipped: "no code" } }), /blast radius is never skipped/);
  assert.throws(() => cov({ reach: { verified: [] } }), /non-empty list/);
  assert.throws(() => cov({ reach: { skipped: " " }, "test-vacuity": { skipped: "no code" } }), /names its reason/);
  assert.throws(() => receipt({ ...BASE, coverage: { ...BASE.coverage, design: { nothing: true } } }), /no class design/);
  assert.throws(() => receipt({ ...BASE, deepen: "skipped" }), /deepen is/);
  assert.throws(() => receipt({ ...BASE, adversary: undefined }), /adversary/);
  assert.throws(() => receipt({ ...BASE, ce: [] }), /every CE resolution/);
  assert.throws(() => receipt({ ...BASE, ce: [{ commit: "not-a-sha", stages: ["deepen"] }] }), /git sha/);
  assert.throws(() => receipt({ ...BASE, record: "" }), /run record/);
});

// ------------------------------------------------------------------------- the named path (KTD3)

// A repository with a project holding a committed plan, and a plans folder at the repository root.
function planRepo(t) {
  const dir = join(tmpRoot(t), "repo");
  mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "bench@example.invalid"]);
  git(dir, ["config", "user.name", "bench"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  writeAt(join(dir, "projects", "p", "docs", "plans", "done.md"), "# Done\n- R1. x\n");
  writeAt(join(dir, "projects", "q", "README.md"), "q\n");
  writeAt(join(dir, "docs", "plans", "root.md"), "# Root\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "start"]);
  return dir;
}
const at = (dir, ...p) => join(dir, ...p);
const start = (path, update = false) => startCheck(pathFacts(path), { update });

test("KTD3 refuses the monorepo root's plans folder, an existing file without update, and a path with uncommitted changes", (t) => {
  const dir = planRepo(t);
  assert.match(start(at(dir, "docs", "plans", "new.md")).reason, /repository root's docs\/plans/);
  const existing = start(at(dir, "projects", "p", "docs", "plans", "done.md"));
  assert.equal(existing.ok, false);
  assert.match(existing.reason, /already exists \(committed at blob [0-9a-f]+, clean\)/);
  writeFileSync(at(dir, "projects", "p", "docs", "plans", "done.md"), "# Done, edited\n");
  for (const update of [false, true]) {
    const dirty = start(at(dir, "projects", "p", "docs", "plans", "done.md"), update);
    assert.equal(dirty.ok, false);
    assert.match(dirty.reason, /uncommitted changes .* even under update/);
  }
  // A staged change is uncommitted too.
  git(dir, ["add", "-A"]);
  assert.match(start(at(dir, "projects", "p", "docs", "plans", "done.md"), true).reason, /uncommitted changes/);
});

test("KTD3 passes an absent path inside a project's plans folder, and update on a committed clean plan", (t) => {
  const dir = planRepo(t);
  const fresh = start(at(dir, "projects", "p", "docs", "plans", "new.md"));
  assert.equal(fresh.ok, true, fresh.reason);
  assert.equal(fresh.createPlansFolder, false);
  assert.deepEqual([fresh.state.exists, fresh.state.tracked, fresh.state.headBlob], [false, false, null]);
  // A project with no plans folder yet: the skill creates it.
  const made = start(at(dir, "projects", "q", "docs", "plans", "sub", "first.md"));
  assert.equal(made.ok, true, made.reason);
  assert.equal(made.createPlansFolder, true);
  const upd = start(at(dir, "projects", "p", "docs", "plans", "done.md"), true);
  assert.equal(upd.ok, true, upd.reason);
  assert.equal(upd.state.headBlob, upd.state.worktreeBlob);
});

test("KTD3 refuses update with nothing committed, an untracked file, a folder, a non-.md path, no project folder, and a path outside the repository", (t) => {
  const dir = planRepo(t);
  assert.match(start(at(dir, "projects", "p", "docs", "plans", "missing.md"), true).reason, /absent: update needs the plan committed at HEAD/);
  writeAt(at(dir, "projects", "p", "docs", "plans", "loose.md"), "x\n");
  assert.equal(start(at(dir, "projects", "p", "docs", "plans", "loose.md")).ok, false);
  assert.equal(start(at(dir, "projects", "p", "docs", "plans", "loose.md"), true).ok, false);
  mkdirSync(at(dir, "projects", "p", "docs", "plans", "afolder.md"));
  assert.match(start(at(dir, "projects", "p", "docs", "plans", "afolder.md")).reason, /is a folder/);
  assert.match(start(at(dir, "projects", "p", "docs", "plans", "new.txt")).reason, /a plan is a \.md file/);
  assert.match(start(at(dir, "projects", "p", "notes", "new.md")).reason, /not inside a project's docs\/plans/);
  assert.match(start(at(dir, "projects", "nope", "docs", "plans", "new.md")).reason, /no project folder at projects\/nope/);
  assert.match(start(join(dirname(dir), "elsewhere", "docs", "plans", "x.md")).reason, /not inside a git repository/);
});

test("a path given through a linked folder resolves to the repository it points into", (t) => {
  const dir = planRepo(t);
  const link = join(dirname(dir), "linked");
  symlinkSync(dir, link, process.platform === "win32" ? "junction" : "dir");
  const r = start(join(link, "projects", "p", "docs", "plans", "new.md"));
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.state.rel, "projects/p/docs/plans/new.md");
});

const win = process.platform === "win32";

test("a path in Git Bash's /c/ form or through an 8.3 short name resolves to the same repository", { skip: !win && "platform: Windows only (drive paths and 8.3 short names)" }, async (t) => {
  const { shortOf } = await import("../bench/shortpath.mjs");
  const dir = planRepo(t);
  const long = at(dir, "projects", "p", "docs", "plans", "new.md");
  const bash = long.replace(/^([A-Za-z]):\\/, (_, d) => `/${d.toLowerCase()}/`).split("\\").join("/");
  const viaBash = start(bash);
  assert.equal(viaBash.ok, true, viaBash.reason);
  assert.equal(viaBash.state.rel, "projects/p/docs/plans/new.md");
  const shortRepo = shortOf(dir);
  assert.ok(shortRepo, "the temp folder has an 8.3 short name to test with");
  const viaShort = start(join(shortRepo, "projects", "p", "docs", "plans", "new.md"));
  assert.equal(viaShort.ok, true, viaShort.reason);
  assert.equal(viaShort.state.path.toLowerCase(), long.toLowerCase());
});

test("a plan name holding pattern characters is matched as itself, never as a pattern", (t) => {
  const dir = planRepo(t);
  // "plan[1].md" as a pattern matches the committed plan1.md; as itself it is absent.
  writeAt(at(dir, "projects", "p", "docs", "plans", "plan1.md"), "# One\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "plan1"]);
  const r = start(at(dir, "projects", "p", "docs", "plans", "plan[1].md"));
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.state.tracked, false);
});

test("the landing check passes an unchanged path and stops a changed one, naming both states", (t) => {
  const dir = planRepo(t);
  const path = at(dir, "projects", "p", "docs", "plans", "new.md");
  const begun = start(path);
  assert.equal(landingCheck(begun.state, pathFacts(path)).ok, true);
  writeAt(path, "# Someone else's plan\n");
  const stop = landingCheck(begun.state, pathFacts(path));
  assert.equal(stop.ok, false);
  assert.match(stop.reason, /at the start absent; now an untracked file/);
  // An update run: the plan committed again by another session between start and landing.
  const done = at(dir, "projects", "p", "docs", "plans", "done.md");
  const upd = start(done, true);
  writeFileSync(done, "# Done, v2\n");
  git(dir, ["commit", "-q", "-am", "v2"]);
  const moved = landingCheck(upd.state, pathFacts(done));
  assert.equal(moved.ok, false);
  assert.match(moved.reason, /at the start committed at blob [0-9a-f]+, clean; now committed at blob [0-9a-f]+, clean/);
});

test("the landing check stops on a different path, even one in the same absent state", (t) => {
  const dir = planRepo(t);
  const begun = start(at(dir, "projects", "p", "docs", "plans", "new.md"));
  const other = landingCheck(begun.state, pathFacts(at(dir, "projects", "p", "docs", "plans", "other.md")));
  assert.equal(other.ok, false);
  assert.match(other.reason, /but the run started on/);
  assert.throws(() => landingCheck({ exists: false }, pathFacts(at(dir, "projects", "p", "docs", "plans", "new.md"))), /path and rel included/);
});

test("the landing check compares the path and the rel each on its own: the same rel in another copy stops, and so does the same path under another rel", (t) => {
  // Two copies of one repository share every rel (KTD16's frozen copies do): the start, recorded
  // in A and JSON round-tripped as the run record keeps it, lands in B.
  const a = planRepo(t);
  const b = join(dirname(a), "copy-b");
  git(dirname(a), ["clone", "-q", a, b]);
  const rel = ["projects", "p", "docs", "plans", "new.md"];
  const begun = JSON.parse(JSON.stringify(start(at(a, ...rel)).state));
  assert.equal(landingCheck(begun, pathFacts(at(a, ...rel))).ok, true);
  const elsewhere = landingCheck(begun, pathFacts(at(b, ...rel)));
  assert.equal(elsewhere.ok, false);
  assert.match(elsewhere.reason, /but the run started on/);
  // The same path with a record whose rel was another: the rel half alone stops it.
  const otherRel = landingCheck({ ...begun, rel: "projects/p/docs/plans/other.md" }, pathFacts(at(a, ...rel)));
  assert.equal(otherRel.ok, false);
  assert.match(otherRel.reason, /but the run started on/);
});

test("a git error is never read as an absent, clean path: a broken index throws, and the command exits 2", (t) => {
  const dir = planRepo(t);
  writeFileSync(join(dir, ".git", "index"), "garbage");
  const path = at(dir, "projects", "p", "docs", "plans", "new.md");
  assert.throws(() => pathFacts(path), /failed \(exit 128\)/);
  const r = spawnSync(process.execPath, [FLOW, "path-start", JSON.stringify({ path, update: false })], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /failed \(exit 128\)/);
  const landing = spawnSync(process.execPath, [FLOW, "path-landing", JSON.stringify({ path, start: { path, rel: "projects/p/docs/plans/new.md" } })], { encoding: "utf8" });
  assert.equal(landing.status, 2, landing.stdout);
});

test("the index command gives the staged plan's section index, its last line and its size, and refuses an open fence", (t) => {
  const dir = tmpRoot(t);
  const plan = join(dir, "staged.md");
  writeFileSync(plan, "---\ntitle: x\n---\n# Plan\n\n## Goal\nText.\n```sh\n# a comment, not a heading\n```\n## Units\n### U1. One\nLast line.\n\n");
  const r = spawnSync(process.execPath, [FLOW, "index", JSON.stringify({ plan })], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.index, [
    { line: 4, level: 1, heading: "Plan", own: false },
    { line: 6, level: 2, heading: "Goal", own: true },
    { line: 11, level: 2, heading: "Units", own: false },
    { line: 12, level: 3, heading: "U1. One", own: true },
  ]);
  assert.deepEqual(out.last, { line: 13, text: "Last line." });
  assert.equal(out.bytes, Buffer.byteLength(readFileSync(plan)));
  writeFileSync(plan, "# Plan\n## Goal\n```\n## Hidden\n");
  const open = spawnSync(process.execPath, [FLOW, "index", JSON.stringify({ plan })], { encoding: "utf8" });
  assert.equal(open.status, 2);
  assert.match(open.stderr, /opens a fence at line 3 that never closes/);
  assert.equal(spawnSync(process.execPath, [FLOW, "index", "{}"], { encoding: "utf8" }).status, 2);
});

// ------------------------------------------------------------------------- the command

test("the command answers in JSON, the receipt as text; exits 1 on a refused path and 2 on input it cannot read", (t) => {
  const run = (...args) => spawnSync(process.execPath, [FLOW, ...args], { encoding: "utf8" });
  const first = run("first", '{"update":true}');
  assert.equal(first.status, 0, first.stderr);
  assert.equal(JSON.parse(first.stdout).stage, "deepen");
  const dir = planRepo(t);
  const input = join(dir, "..", "receipt.json");
  writeFileSync(input, JSON.stringify(BASE));
  const r = run("receipt", input);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^planned, deepened and checked\n/);
  const refused = run("path-start", JSON.stringify({ path: at(dir, "docs", "plans", "x.md"), update: false }));
  assert.equal(refused.status, 1);
  assert.equal(JSON.parse(refused.stdout).ok, false);
  const gate = run("gate", JSON.stringify({ line: windowLine(520_000), stage: "research", costs: { research: { cost: 1000, planBytes: null } } }));
  assert.equal(gate.status, 0, gate.stderr);
  assert.equal(JSON.parse(gate.stdout).go, true);
  const bad = run("next", '{"stage":"nope","outcome":"done","sendBacks":0}');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^flow: no stage "nope"/);
  assert.equal(run("path-start", JSON.stringify({ path: at(dir, "docs", "plans", "x.md") })).status, 2, "a missing update is unreadable input, not a refusal");
  assert.equal(run("path-start", '{"update":false}').status, 2, "a missing path is unreadable input, not a refusal");
  assert.equal(run("path-landing", '{"start":{}}').status, 2);
  assert.equal(run("first", "{not json").status, 2);
  const arrayFile = join(dir, "..", "list.json");
  writeFileSync(arrayFile, "[]");
  const list = run("first", arrayFile);
  assert.equal(list.status, 2);
  assert.match(list.stderr, /the input is one JSON object/);
  for (const name of ["constructor", "toString", "__proto__"]) {
    const r2 = run(name, "{}");
    assert.equal(r2.status, 2, name);
    assert.match(r2.stderr, /^usage: /m, name);
  }
});
