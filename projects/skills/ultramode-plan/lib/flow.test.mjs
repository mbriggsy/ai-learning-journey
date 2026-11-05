import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
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
  assert.equal(firstStage({ brief: "the brief" }).stage, "research");
  assert.equal(firstStage({ brief: "  " }).stage, "brief");
  assert.equal(firstStage({}).stage, "brief");
});

test("each stage outcome maps to its next step", () => {
  const step = (stage, outcome, o = {}) => nextStep({ stage, outcome, ...o });
  assert.equal(step("brief", "done").step, "research");
  assert.equal(step("research", "done").step, "write");
  assert.equal(step("write", "done").step, "deepen");
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
  assert.throws(() => nextStep({ stage: "review", outcome: "done" }), /no stage "review"/);
  assert.throws(() => nextStep({ stage: "research", outcome: "passed" }), /research has no outcome "passed"/);
  assert.throws(() => nextStep({ stage: "check-1", outcome: "done" }), /changes must be a whole number/);
  assert.throws(() => nextStep({ stage: "check-3", outcome: "done", open: -1 }), /open must be a whole number/);
  assert.throws(() => nextStep({ stage: "deepen", outcome: "premise-goal", sendBacks: 0.5 }), /sendBacks/);
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

test("at the wrap tier the gate stops whatever the stage's cost", () => {
  const g = stageGate({ line: windowLine(650_000), stage: "research", costs: { research: { cost: 1, planBytes: null } } });
  assert.deepEqual([g.go, g.step, g.handBack], [false, "window-stop", "research"]);
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
  const guess = live(windowLine(100_000)).replace(/^Context/, "Context (GUESS — no session id; newest log here, maybe another session's)");
  for (const line of [guess, "Context: no transcript for this session (x) yet.", "", "Context: 100,000 / 1M = 10.0% — roomy"]) {
    const g = stageGate({ line, stage: "research" });
    assert.deepEqual([g.go, g.step], [false, "window-stop"], line);
  }
  assert.match(stageGate({ line: "Context: 100,000 / 1M = 10.0% — roomy", stage: "research" }).reason, /window skill changed/);
});

test("a compacted line asks for a fresh reading instead of starting or stopping", () => {
  const g = stageGate({ line: "Context: compacted 3 min ago (500,000 → a 40,000-token summary) — no live read since; ask again after one more step.", stage: "deepen" });
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
  coverage: { premise: { nothing: true }, reach: { verified: ["C3", "C7"] }, "blast-radius": { nothing: true }, "test-vacuity": { skipped: "the plan has no code" } },
  record: "~/.claude/projects/x/job/2026-11-05T01-00-00Z/ultramode-plan-run.json",
};
const firstLine = (o) => receipt({ ...BASE, ...o }).split("\n")[0];

test("each receipt form in R9 comes out word for word, the updated forms included", () => {
  assert.equal(firstLine({}), "planned, deepened and checked");
  assert.equal(firstLine({ deepen: "passed" }), "planned, confidence check passed, checked");
  assert.equal(firstLine({ update: true }), "updated, deepened and checked");
  assert.equal(firstLine({ update: true, deepen: "passed" }), "updated, confidence check passed, checked");
  assert.equal(firstLine({ open: 2 }), "planned, deepened and checked, 2 P0/P1 open");
  assert.equal(firstLine({ deepen: "passed", open: 1 }), "planned, confidence check passed, checked, 1 P0/P1 open");
  assert.equal(firstLine({ adversary: false }), "planned, deepened, check incomplete: no adversary");
  assert.equal(firstLine({ adversary: false, deepen: "passed", update: true }), "updated, confidence check passed, check incomplete: no adversary");
});

test("the whole receipt: park, CE commits with their stages, the four classes, holes, inline seats, strays, a move and the record", () => {
  const text = receipt({
    ...BASE,
    park: "KTD4 says X; the check found Y. Keep X?",
    ce: [{ commit: SHA, stages: ["research", "deepen"] }, { commit: "3449230", stages: ["check-1"] }],
    holes: [{ seat: "security", missed: "U4 to U6", resumes: 2 }],
    inline: [{ seat: "coherence", file: "coherence-reviewer.md" }],
    strays: ["projects/x/probe.txt"],
    moved: { changed: 5, cited: ["projects/x/a.mjs", "projects/x/b.mjs"] },
  });
  assert.equal(
    text,
    [
      "planned, deepened and checked",
      "parked: KTD4 says X; the check found Y. Keep X?",
      `CE: ${SHA} (research, deepen); 3449230 (check-1)`,
      "coverage: premise: nothing found; reach: 2 verified (C3, C7); blast radius: nothing found; test vacuity: skipped: the plan has no code",
      "coverage holes: security (U4 to U6, resumed 2 times)",
      "seats without their CE file: coherence (coherence-reviewer.md)",
      "stray files deleted: projects/x/probe.txt",
      "project moved during the run: 5 files changed, 2 the plan cites (projects/x/a.mjs, projects/x/b.mjs)",
      `run record: ${BASE.record}`,
    ].join("\n"),
  );
});

test("a quiet run's receipt still says none for each list, names CE absent, and has no move line when nothing moved", () => {
  const text = receipt({ ...BASE, ce: [{ commit: null, stages: ["check-1"] }], coverage: { premise: { hole: true }, reach: { nothing: true }, "blast-radius": { verified: ["B1"] }, "test-vacuity": { nothing: true } } });
  assert.match(text, /^CE: CE absent \(check-1\)$/m);
  assert.match(text, /premise: no result \(a coverage hole\)/);
  assert.match(text, /^coverage holes: none$/m);
  assert.match(text, /^seats without their CE file: none$/m);
  assert.match(text, /^stray files deleted: none$/m);
  assert.doesNotMatch(text, /project moved/);
  assert.doesNotMatch(text, /parked:/);
});

test("the receipt refuses silence and the wrong skips: a missing class, two forms at once, a skipped premise or blast radius, an empty verified list", () => {
  const cov = (o) => receipt({ ...BASE, coverage: { ...BASE.coverage, ...o } });
  assert.throws(() => receipt({ ...BASE, coverage: { premise: { nothing: true }, reach: { nothing: true }, "blast-radius": { nothing: true } } }), /test vacuity coverage needs exactly one/);
  assert.throws(() => cov({ premise: { nothing: true, verified: ["P1"] } }), /premise coverage needs exactly one/);
  assert.throws(() => cov({ premise: { skipped: "no code" } }), /premise is never skipped/);
  assert.throws(() => cov({ "blast-radius": { skipped: "no code" } }), /blast radius is never skipped/);
  assert.throws(() => cov({ reach: { verified: [] } }), /non-empty list/);
  assert.throws(() => cov({ reach: { skipped: " " } }), /names its reason/);
  assert.throws(() => receipt({ ...BASE, coverage: { ...BASE.coverage, design: { nothing: true } } }), /no class design/);
  assert.throws(() => receipt({ ...BASE, deepen: "skipped" }), /deepen is/);
  assert.throws(() => receipt({ ...BASE, adversary: undefined }), /adversary/);
  assert.throws(() => receipt({ ...BASE, ce: [] }), /every CE resolution/);
  assert.throws(() => receipt({ ...BASE, ce: [{ commit: "not-a-sha", stages: ["x"] }] }), /git sha/);
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

// ------------------------------------------------------------------------- the command

test("the command answers each subcommand in JSON, the receipt as text, and exits 1 on a refused path", (t) => {
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
  const refused = run("path-start", JSON.stringify({ path: at(dir, "docs", "plans", "x.md") }));
  assert.equal(refused.status, 1);
  assert.equal(JSON.parse(refused.stdout).ok, false);
  const gate = run("gate", JSON.stringify({ line: windowLine(520_000), stage: "research", costs: { research: { cost: 1000, planBytes: null } } }));
  assert.equal(gate.status, 0, gate.stderr);
  assert.equal(JSON.parse(gate.stdout).go, true);
  const bad = run("next", '{"stage":"nope","outcome":"done"}');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /^flow: no stage "nope"/);
});
