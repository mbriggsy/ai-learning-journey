import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { receipt } from "./flow.mjs";
import { longOf, slugOf } from "./paths.mjs";
import {
  RECORD, advance, block, complete, defaultJobFolder, foldLand, foldStart, gate, helperTrail, land, landCheck, launch, launched,
  loadRecord, locate, note, receiptFields, restart, show, start, typedPath, writerOf,
} from "./run-record.mjs";
import { SHA_NEW, SHA_OLD, ceEntry, ceInstall, registryAt } from "./fixtures/ce-fixture.mjs";
import { shortOf } from "../bench/shortpath.mjs";
import { git, repoRoot, tmpRoot, writeAt } from "../bench/testkit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const win = process.platform === "win32";
const S1 = "11111111-1111-4111-8111-111111111111";
const S2 = "22222222-2222-4222-8222-222222222222";
const S3 = "33333333-3333-4333-8333-333333333333";
const SLUG = "C--work";
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// Real lines from the window skill, through its test hook (no transcript is read).
const WINDOW = join(repoRoot(), "projects", "skills", "window", "window.mjs");
function windowLine(tokens) {
  const r = spawnSync(process.execPath, [WINDOW], { encoding: "utf8", env: { ...process.env, WINDOW_TEST_TOKENS: String(tokens) } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
const ROOM = windowLine(100_000);
const WRAP = windowLine(650_000);

// A repository with one project (projects/demo, its CLAUDE.md, code and an old plan, temp/ ignored),
// a fake Claude Code projects folder with three sessions' transcripts, and a CE install with its
// registry.
function world(t) {
  const root = tmpRoot(t, "uplan-rr-");
  const repo = join(root, "repo");
  mkdirSync(repo);
  git(repo, ["init", "-q", "-b", "main"]);
  git(repo, ["config", "user.email", "bench@example.invalid"]);
  git(repo, ["config", "user.name", "bench"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  git(repo, ["config", "core.autocrlf", "false"]);
  writeAt(join(repo, ".gitignore"), "temp/\n");
  writeAt(join(repo, "projects", "demo", "CLAUDE.md"), "# demo\n");
  writeAt(join(repo, "projects", "demo", "src", "a.mjs"), "export const a = 1;\n");
  writeAt(join(repo, "projects", "demo", "docs", "plans", "old-plan.md"), "# Old plan\n\n## One\n\ntext\n");
  writeAt(join(repo, "projects", "demo", "temp", "kept.txt"), "ignored, there before\n");
  writeAt(join(repo, "projects", "other", "x.txt"), "x\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "start"]);
  const projects = join(root, "claude-projects");
  for (const s of [S1, S2, S3]) writeAt(join(projects, SLUG, `${s}.jsonl`), `${JSON.stringify({ type: "user", version: "2.1.318", message: { role: "user", content: "hi" } })}\n`);
  const install = ceInstall(root, "3.35.3");
  const registry = registryAt(root, [ceEntry(install, SHA_NEW, "3.35.3")]);
  const brief = join(root, "brief.md");
  writeFileSync(brief, "the brief\n");
  const script = join(root, "research.workflow.js");
  writeFileSync(script, "export const meta = { name: 'x', description: 'x' }\n");
  const plan = join(repo, "projects", "demo", "docs", "plans", "new-plan.md");
  return { root, repo, projects, install, registry, brief, script, plan, opts: { projectsDir: projects, cwd: repo } };
}

const begin = (w, extra = {}) => start({ plan: w.plan, update: false, brief: w.brief, session: S1, registry: w.registry, ...extra }, w.opts);
const load = (p) => loadRecord(p);

// A finished Workflow in a session's folder: its saved result and its helpers' transcripts.
function finish(w, session, runId, { status = "completed", agentCount, helpers = [] } = {}) {
  const dir = join(w.projects, SLUG, session);
  writeAt(join(dir, "workflows", `${runId}.json`), JSON.stringify({ runId, status, result: { summary: { ok: true } }, agentCount: agentCount ?? helpers.length }));
  helpers.forEach((rows, i) => writeAt(join(dir, "subagents", "workflows", runId, `agent-w${i}.jsonl`), `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`));
}
const toolRow = (cwd, ...tools) => ({ type: "assistant", cwd, message: { role: "assistant", content: tools.map(([name, input], i) => ({ type: "tool_use", id: `tu_${name}_${i}`, name, input })) } });

// One Workflow stage run in session `s`: gate, launch, run id, saved result, completion.
function runStage(w, rec, runId, { s = S1, helpers = [], before } = {}) {
  assert.equal(gate(rec, { line: ROOM, session: s }).go, true);
  const l = launch(rec, { script: w.script, args: { stage: runId }, relayed: "plan it", session: s }, w.opts);
  launched(rec, { launch: l.launch, runId, session: s }, w.opts);
  if (before) before();
  finish(w, s, runId, { helpers });
  return complete(rec, { launch: l.launch, session: s });
}

// A fold of the current step: the working file gets `text`, and the ids land.
function fold(rec, text, ids, s = S1) {
  const f = foldStart(rec, { session: s });
  writeFileSync(f.working, text);
  return foldLand(rec, { ids, session: s });
}

// A run taken through research and the write to the deepen step, with the deepen launched and
// finished but not folded.
function atDeepen(w, extra = {}) {
  const r = begin(w, extra);
  assert.equal(r.ok, true, r.reason);
  const rec = load(r.record);
  runStage(w, rec, "wf_research-001");
  assert.equal(advance(rec, { outcome: "done", session: S1 }).step, "write");
  fold(rec, "# New plan\n\n## Goal\n\nwritten\n", []);
  assert.equal(advance(rec, { outcome: "done", session: S1 }).step, "deepen");
  runStage(w, rec, "wf_deepen-002");
  return rec;
}

// ------------------------------------------------------------------------- where a run lives

test("one plan path gives one default job folder from any working folder, through Git Bash and junction spellings", (t) => {
  const w = world(t);
  const want = join(w.projects, slugOf(longOf(w.repo)), "plan-projects-demo--new-plan");
  const fromRoot = locate({ plan: w.plan, projectsDir: w.projects, cwd: w.repo });
  const fromProject = locate({ plan: join("docs", "plans", "new-plan.md"), projectsDir: w.projects, cwd: join(w.repo, "projects", "demo") });
  assert.equal(fromRoot.jobFolder, want);
  assert.equal(fromProject.jobFolder, want);
  const link = join(w.root, "via-link");
  symlinkSync(w.repo, link, win ? "junction" : "dir");
  assert.equal(locate({ plan: join(link, "projects", "demo", "docs", "plans", "new-plan.md"), projectsDir: w.projects }).jobFolder, want);
  if (win) {
    const bash = w.plan.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`).split("\\").join("/");
    assert.equal(locate({ plan: bash, projectsDir: w.projects, cwd: w.root }).jobFolder, want);
  }
  // A path KTD3 would refuse has no default job folder, and says why.
  const outside = locate({ plan: join(w.repo, "projects", "demo", "notes.md"), projectsDir: w.projects });
  assert.equal(outside.jobFolder, null);
  assert.match(outside.reason, /not inside a project's own docs\/plans/);
});

test("an 8.3 spelling of the repository finds the same job folder", { skip: !win && "platform: Windows only (8.3 short names)" }, (t) => {
  const w = world(t);
  const short = shortOf(w.repo);
  if (!short || short.toLowerCase() === w.repo.toLowerCase()) return t.skip("platform: this volume gives the test folder no 8.3 name");
  const want = locate({ plan: w.plan, projectsDir: w.projects }).jobFolder;
  assert.equal(locate({ plan: join(short, "projects", "demo", "docs", "plans", "new-plan.md"), projectsDir: w.projects }).jobFolder, want);
});

test("a long plan name is cut and hashed, so its job folder stays short and unique", () => {
  const facts = { gitRoot: "/r", path: "/r/p/docs/plans/x.md", projectRel: "projects/demo", rel: `projects/demo/docs/plans/${"a".repeat(150)}.md` };
  const other = { ...facts, rel: `projects/demo/docs/plans/${"a".repeat(149)}b.md` };
  const a = defaultJobFolder(facts, { projectsDir: "/p" }).folder;
  const b = defaultJobFolder(other, { projectsDir: "/p" }).folder;
  assert.ok(a.split(/[\\/]/).pop().length <= 113);
  assert.notEqual(a, b);
});

test("an unfinished run is resumed; a landed or blocked one stays byte for byte and a new run starts beside it", (t) => {
  const w = world(t);
  const first = begin(w);
  assert.equal(first.ok, true, first.reason);
  assert.equal(locate({ plan: w.plan, ...w.opts }).resume, first.record);
  const again = begin(w);
  assert.equal(again.ok, false);
  assert.equal(again.resume, first.record);
  block(load(first.record), { reason: "a test block", session: S1 });
  const blockedBytes = readFileSync(first.record);
  const second = begin(w, { now: new Date("2026-11-05T09:00:00Z") });
  assert.equal(second.ok, true, second.reason);
  assert.notEqual(second.record, first.record);
  assert.equal(dirname(dirname(second.record)), dirname(dirname(first.record)));
  assert.deepEqual(readFileSync(first.record), blockedBytes);
  const loc = locate({ plan: w.plan, ...w.opts });
  assert.equal(loc.resume, second.record);
  assert.deepEqual(loc.closed.map((r) => r.state), ["blocked"]);
  // A closed record refuses every write.
  assert.throws(() => note(load(first.record), { key: "handBack", value: "x", session: S1 }), /blocked, and a closed record is never rewritten/);
});

test("a run record's path alone finds its run, and a job folder's run for another plan is never resumed", (t) => {
  const w = world(t);
  const r = begin(w);
  const s = show(load(r.record));
  assert.equal(s.plan, w.plan);
  assert.equal(s.step.stage, "research");
  assert.equal(show(load(dirname(r.record))).record, r.record);
  assert.equal(restart({ record: r.record, session: S2, registry: w.registry }, w.opts).action, "start");
  // Another plan started into the same job folder by hand is listed apart, never resumed.
  const otherPlan = join(w.repo, "projects", "demo", "docs", "plans", "other-plan.md");
  const job = dirname(dirname(r.record));
  const other = start({ plan: otherPlan, update: false, brief: w.brief, session: S1, registry: w.registry, job }, w.opts);
  assert.equal(other.ok, true, other.reason);
  const loc = locate({ plan: w.plan, job, ...w.opts });
  assert.equal(loc.resume, r.record);
  assert.deepEqual(loc.others.map((x) => x.record), [other.record]);
});

test("start refuses an existing plan without update, a job folder inside the repository and a missing session, writing nothing", (t) => {
  const w = world(t);
  const old = join(w.repo, "projects", "demo", "docs", "plans", "old-plan.md");
  const r = start({ plan: old, update: false, brief: w.brief, session: S1, registry: w.registry }, w.opts);
  assert.equal(r.ok, false);
  assert.match(r.reason, /already exists/);
  assert.equal(existsSync(join(w.projects, slugOf(longOf(w.repo)))), false);
  const inside = begin(w, { job: join(w.repo, "projects", "demo", "jobs") });
  assert.equal(inside.ok, false);
  assert.match(inside.reason, /inside the repository/);
  const saved = process.env.CLAUDE_CODE_SESSION_ID;
  delete process.env.CLAUDE_CODE_SESSION_ID;
  try {
    assert.throws(() => begin(w, { session: undefined }), /names its session/);
  } finally {
    if (saved !== undefined) process.env.CLAUDE_CODE_SESSION_ID = saved;
  }
  assert.throws(() => begin(w, { update: "false" }), /update must be true or false/);
});

test("under update the staged plan starts as HEAD's committed bytes and the first stage is the deepen", (t) => {
  const w = world(t);
  const old = join(w.repo, "projects", "demo", "docs", "plans", "old-plan.md");
  const r = start({ plan: old, update: true, session: S1, registry: w.registry }, w.opts);
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.stage, "deepen");
  assert.deepEqual(readFileSync(r.staged), readFileSync(old));
  const rec = load(r.record);
  assert.equal(rec.steps[0].before, sha256(readFileSync(old)));
  assert.equal(rec.brief, null);
  // No brief and no update: the brief stage runs first.
  const fresh = start({ plan: w.plan, update: false, session: S1, registry: w.registry }, w.opts);
  assert.equal(fresh.stage, "brief");
});

test("the brief stage ends with the brief's file, recorded by sha256, and no CE commit is said to have served it", (t) => {
  const w = world(t);
  const r = start({ plan: w.plan, update: false, session: S1, registry: w.registry }, w.opts);
  const rec = load(r.record);
  assert.equal(restart({ record: r.record, session: S1, registry: w.registry }, w.opts).action, "start");
  assert.throws(() => advance(rec, { outcome: "done", session: S1 }), /ends with the path of the brief/);
  assert.equal(advance(load(r.record), { outcome: "done", brief: w.brief, session: S1 }).step, "research");
  const saved = load(r.record);
  assert.deepEqual(saved.brief, { file: "brief.md", sha256: sha256(readFileSync(w.brief)) });
  assert.deepEqual(saved.ce.map((c) => c.stages), [["research"]]);
});

// ------------------------------------------------------------------------- launches

test("a launch records its run id, session, script sha256, exact args, relayed text, CLI, saved-result path and transcript folder", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  assert.throws(() => launch(rec, { script: w.script, args: { a: 1 }, relayed: null, session: S1 }, w.opts), /no passed window gate/);
  gate(rec, { line: ROOM, session: S1 });
  assert.throws(() => launch(rec, { script: w.script, args: { a: 1 }, session: S1 }, w.opts), /relayed is the user text/);
  const l = launch(rec, { script: w.script, args: { a: 1, b: "two" }, relayed: "plan it", seats: ["repo-research-analyst"], session: S1 }, w.opts);
  launched(rec, { launch: l.launch, runId: "wf_abc12345-678", session: S1 }, w.opts);
  const e = load(rec._path).launches[0];
  assert.equal(e.runId, "wf_abc12345-678");
  assert.equal(e.session, S1);
  assert.equal(e.scriptSha256, sha256(readFileSync(w.script)));
  assert.deepEqual(JSON.parse(readFileSync(join(rec.dir, e.args), "utf8")), { a: 1, b: "two" });
  assert.equal(e.argsSha256, sha256(readFileSync(join(rec.dir, e.args))));
  assert.equal(e.relayed, "plan it");
  assert.equal(e.cli, "2.1.318");
  assert.equal(e.savedResult, join(w.projects, SLUG, S1, "workflows", "wf_abc12345-678.json"));
  assert.equal(e.transcriptDir, join(w.projects, SLUG, S1, "subagents", "workflows", "wf_abc12345-678"));
  // Each launch needs its own passed gate (KTD10), a resume included.
  assert.throws(() => launch(rec, { script: w.script, args: {}, relayed: null, resumeOf: "L1", session: S1 }, w.opts), /no passed window gate/);
  assert.throws(() => launched(rec, { launch: "L1", runId: "not-a-run", session: S1 }, w.opts), /run id reads like/);
  assert.throws(() => complete(rec, { launch: "L1", session: S1 }), /no saved result yet/);
});

// ------------------------------------------------------------------------- restart

test("restart: a finished Workflow goes to its fold and nothing launches; a missing saved result re-runs and says why", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  const launches = rec.launches.length;
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.action, "fold");
  assert.equal(r.savedResult, join(w.projects, SLUG, S1, "workflows", "wf_deepen-002.json"));
  assert.equal(load(rec._path).launches.length, launches);
  // A deepen whose saved result is gone re-runs with the recorded args, and says why.
  unlinkSync(r.savedResult);
  const again = restart({ record: rec._path, session: S3, registry: w.registry }, w.opts);
  assert.equal(again.action, "rerun");
  assert.match(again.reason, /there is no saved result at/);
  assert.deepEqual(JSON.parse(readFileSync(again.args, "utf8")), { stage: "wf_deepen-002" });
  assert.equal(again.script, longOf(w.script));
  assert.deepEqual(load(rec._path).sessions.map((s) => s.id), [S1, S2, S3]);
  // Args changed since the launch cannot re-run "as recorded": the run stops.
  writeFileSync(again.args, JSON.stringify({ stage: "edited" }));
  const stop = restart({ record: rec._path, session: S3, registry: w.registry }, w.opts);
  assert.equal(stop.action, "stop");
  assert.match(stop.reason, /no longer match their sha256/);
});

test("restart: a staged plan at the target advances with no second fold; at neither hash it stops, naming both", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  fold(rec, "# New plan\n\n## Goal\n\nwritten, deepened\n", ["D1"]);
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.action, "advance");
  assert.throws(() => foldStart(load(rec._path), { session: S2 }), /fold has landed/);
  writeFileSync(join(rec.dir, "plan.md"), "# someone else's edit\n");
  const stop = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(stop.ok, false);
  assert.equal(stop.action, "stop");
  const step = load(rec._path).steps.at(-1);
  assert.ok(stop.reason.includes(step.before) && stop.reason.includes(step.target), stop.reason);
});

test("restart: a leftover working file is deleted and the fold re-runs from the before hash", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  const f = foldStart(rec, { session: S1 });
  writeFileSync(f.working, "# half a fold\n");
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.removedLeftover, true);
  assert.equal(existsSync(f.working), false);
  assert.equal(r.action, "fold");
  const again = load(rec._path);
  assert.equal(fold(again, "# New plan\n\n## Goal\n\nfolded again\n", ["D1"], S2).ledger[0], "D1");
});

test("restart: a crash after the target is recorded but before the rename re-runs the fold and rewrites the ledger entry", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  const f = foldStart(rec, { session: S1 });
  writeFileSync(f.working, "# New plan\n\nfirst try\n");
  // The crash: the record holds the target and the ledger, and the rename never ran.
  const step = rec.steps.at(-1);
  step.target = sha256(readFileSync(f.working));
  step.ledger = ["D1", "D2"];
  writeFileSync(rec._path, JSON.stringify(rec, null, 1));
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.action, "fold");
  assert.match(r.reason, /rename never landed/);
  const again = load(rec._path);
  const landed = fold(again, "# New plan\n\nsecond try\n", ["D3"], S2);
  assert.deepEqual(load(rec._path).steps.at(-1).ledger, ["D3"]);
  assert.equal(landed.target, sha256("# New plan\n\nsecond try\n"));
  assert.equal(advance(load(rec._path), { outcome: "deepened", session: S2 }).step, "check-1");
});

test("restart: a window stop resumes at the held stage, and the TEST reading is recorded as one", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  const g = gate(rec, { line: WRAP, session: S1 });
  assert.equal(g.go, false);
  assert.equal(g.step, "window-stop");
  const saved = load(rec._path);
  assert.equal(saved.state, "window-stop");
  assert.equal(saved.windowStop.stage, "research");
  assert.equal(saved.steps[0].gates[0].test, true);
  assert.throws(() => launch(saved, { script: w.script, args: {}, relayed: null, session: S1 }, w.opts), /window stop/);
  assert.equal(restart({ record: rec._path, session: S2, registry: w.registry }, w.opts).action, "start");
  const back = load(rec._path);
  assert.equal(gate(back, { line: ROOM, session: S2 }).go, true);
  assert.equal(load(rec._path).state, "running");
  assert.equal(load(rec._path).windowStop, null);
});

test("restart after the registry moves to a new CE uses its install path, and the record keeps both with the stages each served", (t) => {
  const w = world(t);
  const oldInstall = ceInstall(w.root, "3.34.0");
  const registry = registryAt(w.root, [ceEntry(oldInstall, SHA_OLD, "3.34.0")]);
  const r = start({ plan: w.plan, update: false, brief: w.brief, session: S1, registry }, w.opts);
  const rec = load(r.record);
  runStage(w, rec, "wf_research-001");
  advance(rec, { outcome: "done", session: S1 });
  // The update lands between sessions: the registry now names 3.35.3.
  registryAt(w.root, [ceEntry(w.install, SHA_NEW, "3.35.3")], { at: registry });
  const back = restart({ record: rec._path, session: S2, registry }, w.opts);
  assert.equal(back.action, "fold");
  assert.equal(back.commit, SHA_NEW);
  const c2 = JSON.parse(readFileSync(back.ce, "utf8"));
  assert.equal(c2.installPath, w.install);
  const again = load(rec._path);
  assert.deepEqual(again.ce.map((c) => [c.commit, c.stages]), [[SHA_OLD, ["research", "write"]], [SHA_NEW, ["write"]]]);
  fold(again, "# New plan\n\nwritten\n", [], S2);
  advance(again, { outcome: "done", session: S2 });
  assert.deepEqual(load(rec._path).ce.map((c) => c.stages), [["research", "write"], ["write", "deepen"]]);
  // A second restart on the same CE adds the session to it, not a third resolution.
  restart({ record: rec._path, session: S3, registry }, w.opts);
  assert.deepEqual(load(rec._path).ce.map((c) => c.sessions), [[S1], [S2, S3]]);
});

// ------------------------------------------------------------------------- stage boundaries

test("a boundary reads its outcome only from a finished Workflow, and round 1's changes must match its fold's ledger", (t) => {
  const w = world(t);
  const r = begin(w);
  const rec = load(r.record);
  assert.throws(() => advance(rec, { outcome: "done", session: S1 }), /no finished Workflow/);
  runStage(w, rec, "wf_research-001");
  advance(rec, { outcome: "done", session: S1 });
  assert.throws(() => advance(rec, { outcome: "done", session: S1 }), /write has not landed/);
  fold(rec, "# Plan\n\nv1\n", []);
  advance(rec, { outcome: "done", session: S1 });
  runStage(w, rec, "wf_deepen-002");
  assert.throws(() => fold(rec, "# Plan\n\nv1\n", ["D1"]), /fold changed nothing/);
  assert.throws(() => foldLand(rec, { ids: [], session: S1 }), /applies at least one id/);
  fold(rec, "# Plan\n\nv2\n", ["D1"]);
  advance(rec, { outcome: "deepened", session: S1 });
  runStage(w, rec, "wf_check-003");
  fold(rec, "# Plan\n\nv3\n", ["C1", "C2"]);
  assert.throws(() => advance(rec, { outcome: "done", changes: 1, session: S1 }), /must equal the 2 ids/);
  assert.equal(advance(rec, { outcome: "done", changes: 2, session: S1 }).step, "check-2");
});

test("a second premise send-back closes the run as blocked and hands its reason back", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  const back = advance(rec, { outcome: "premise-goal", session: S1 });
  assert.equal(back.step, "write");
  assert.equal(load(rec._path).sendBacks, 1);
  fold(rec, "# New plan\n\nrewritten\n", []);
  advance(rec, { outcome: "done", session: S1 });
  runStage(w, rec, "wf_deepen-004");
  const end = advance(rec, { outcome: "premise-goal", session: S1 });
  assert.equal(end.step, "blocked");
  const closed = load(rec._path);
  assert.equal(closed.state, "blocked");
  assert.match(closed.handBack, /^blocked: a second verified premise finding/);
});

test("a park relaunches the deepen without the premise seat, and the run keeps the park's question", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  note(rec, { key: "parks", value: "Keep the 10% margin, or drop it to 5%?", session: S1 });
  const next = advance(rec, { outcome: "park", session: S1 });
  assert.equal(next.step, "deepen");
  const saved = load(rec._path);
  assert.equal(saved.steps.at(-1).skipPremise, true);
  assert.deepEqual(saved.parks, ["Keep the 10% margin, or drop it to 5%?"]);
  note(saved, { key: "contractBrief", value: "the laws", session: S1 });
  assert.throws(() => note(load(rec._path), { key: "contractBrief", value: "other laws", session: S1 }), /already recorded/);
  assert.throws(() => note(load(rec._path), { key: "lenses", value: [{ lens: "design" }], session: S1 }), /wrong shape/);
});

// ------------------------------------------------------------------------- the stray sweep

test("the sweep moves out new files a helper wrote, by Write or by a shell command naming them, and keeps every other new file", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  const demo = join(w.repo, "projects", "demo");
  const probe = join(demo, "src", "_zz_probe.test.mjs");
  const traced = join(demo, "temp", "trace.mjs");
  const foreign = join(demo, "src", "someone-else.mjs");
  const twin = join(demo, "notes", "trace.mjs");
  const touched = join(demo, "temp", "kept.txt");
  const helpers = [
    [toolRow(w.repo, ["Write", { file_path: probe, content: "x" }]), toolRow(w.repo, ["Bash", { command: "node projects/demo/temp/trace.mjs > /dev/null; cat projects/demo/temp/kept.txt" }])],
    [toolRow(w.repo, ["Read", { file_path: foreign }], ["Bash", { command: "cat elsewhere/notes/trace.mjs" }])],
  ];
  const sw = runStage(w, rec, "wf_research-001", {
    helpers,
    before: () => {
      for (const p of [probe, traced, foreign, twin]) writeAt(p, "new\n");
      writeFileSync(touched, "rewritten by a helper\n");
    },
  });
  assert.deepEqual(sw.strays.deleted.sort(), ["projects/demo/src/_zz_probe.test.mjs", "projects/demo/temp/trace.mjs"]);
  assert.equal(sw.strays.foreign, 2);
  assert.equal(existsSync(probe), false);
  assert.equal(existsSync(traced), false);
  assert.ok(existsSync(join(rec.dir, "strays", "L1", "projects", "demo", "src", "_zz_probe.test.mjs")));
  for (const p of [foreign, twin, touched]) assert.ok(existsSync(p), `${p} was kept`);
  const l = load(rec._path).launches[0];
  assert.deepEqual(l.sweep.foreign.sort(), ["projects/demo/notes/trace.mjs", "projects/demo/src/someone-else.mjs"]);
  assert.equal(l.sweep.transcripts, 2);
  assert.deepEqual(load(rec._path).strays.deleted.sort(), ["projects/demo/src/_zz_probe.test.mjs", "projects/demo/temp/trace.mjs"]);
});

test("a launch whose helpers left no transcript attributes nothing and says so", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  const stray = join(w.repo, "projects", "demo", "src", "left.mjs");
  const sw = runStage(w, rec, "wf_research-001", { before: () => writeAt(stray, "x\n") });
  assert.deepEqual(sw.strays.deleted, []);
  assert.equal(sw.strays.foreign, 1);
  assert.match(sw.strays.note, /no helper transcript was read/);
  assert.ok(existsSync(stray));
});

test("restart sweeps a launch its dead session never swept", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  gate(rec, { line: ROOM, session: S1 });
  const l = launch(rec, { script: w.script, args: {}, relayed: null, session: S1 }, w.opts);
  launched(rec, { launch: l.launch, runId: "wf_dead-001", session: S1 }, w.opts);
  const stray = join(w.repo, "projects", "demo", "src", "_zz_dead.mjs");
  writeAt(stray, "x\n");
  writeAt(join(w.projects, SLUG, S1, "subagents", "workflows", "wf_dead-001", "agent-w0.jsonl"), `${JSON.stringify(toolRow(w.repo, ["Write", { file_path: stray }]))}\n`);
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.deepEqual(r.swept, ["L1"]);
  assert.equal(r.action, "rerun");
  assert.equal(existsSync(stray), false);
  assert.match(load(rec._path).launches[0].status, /^never completed: there is no saved result/);
});

test("writerOf matches whole path tokens in every spelling, never a name inside a longer path", () => {
  const cwd = join("/", "w", "repo");
  const abs = join(cwd, "projects", "demo", "temp", "x.mjs");
  const trail = (text, at = cwd) => ({ writes: [], commands: [{ text, cwd: at, tool: "Bash", id: "t1", transcript: "a" }] });
  const rel = relative(cwd, abs).split("\\").join("/");
  assert.ok(writerOf(abs, trail(`echo > ${rel}`)));
  assert.ok(writerOf(abs, trail(`echo > "./${rel}"`)));
  assert.ok(writerOf(abs, trail(`cat '${abs.split("\\").join("/")}'`)));
  assert.ok(writerOf(abs, trail("node x.mjs", join(cwd, "projects", "demo", "temp"))));
  assert.equal(writerOf(abs, trail(`cat other/${rel}`)), null);
  assert.equal(writerOf(abs, trail(`cat ${rel}.bak`)), null);
  assert.equal(writerOf(abs, trail("node x.mjs")), null);
  assert.equal(writerOf(abs, { writes: [], commands: [] }), null);
  assert.deepEqual(helperTrail(join("/", "no", "such", "folder")), { transcripts: 0, writes: [], commands: [] });
});

// ------------------------------------------------------------------------- landing

// A run brought to its landing: research, write, deepen (folded), check-1 with no change.
function atLanding(w, text = "# New plan\n\n## Goal\n\nlanded\n", extra = {}) {
  const rec = atDeepen(w, extra);
  fold(rec, text, ["D1"]);
  advance(rec, { outcome: "deepened", session: S1 });
  runStage(w, rec, "wf_check-003");
  assert.equal(advance(rec, { outcome: "done", changes: 0, session: S1 }).step, "land");
  return rec;
}
const FIELDS = { deepen: "deepened", adversary: true, open: 0, park: null, holes: [], coverage: { premise: { nothing: true }, reach: { nothing: true }, "blast-radius": { nothing: true }, "test-vacuity": { nothing: true } } };
const message = (rec) => `docs(plans): new-plan\n\n${receipt({ ...FIELDS, ...receiptFields(rec, { ran: { write: ["write"], "check-1": ["coherence"] } }) })}\n`;

test("landing stops when the named path changed since the start, naming both states", (t) => {
  const w = world(t);
  const rec = atLanding(w);
  assert.throws(() => launch(rec, { script: w.script, args: {}, relayed: null, session: S1 }, w.opts), /reached its landing/);
  assert.throws(() => advance(rec, { outcome: "done", changes: 0, session: S1 }), /reached its landing/);
  writeAt(w.plan, "# someone else's plan\n");
  const c = landCheck(rec);
  assert.equal(c.ok, false);
  assert.match(c.reason, /at the start absent; now an untracked file/);
  const l = land(load(rec._path), { message: message(load(rec._path)), session: S1 });
  assert.equal(l.ok, false);
  assert.deepEqual(readFileSync(w.plan, "utf8"), "# someone else's plan\n");
  assert.equal(load(rec._path).state, "running");
});

test("an unmoved project gives no move line; a moved one gives the count and the files the plan cites", (t) => {
  const w = world(t);
  const rec = atLanding(w, "# New plan\n\nChanges `src/a.mjs` and nothing else.\n");
  assert.equal(landCheck(rec).moved, null);
  assert.equal(receiptFields(load(rec._path), { ran: {} }).moved, null);
  writeAt(join(w.repo, "projects", "demo", "src", "a.mjs"), "export const a = 2;\n");
  writeAt(join(w.repo, "projects", "demo", "src", "b.mjs"), "export const b = 1;\n");
  writeAt(join(w.repo, "projects", "other", "y.txt"), "outside the project\n");
  git(w.repo, ["add", "-A"]);
  git(w.repo, ["commit", "-q", "-m", "another session's work"]);
  const c = landCheck(load(rec._path));
  assert.equal(c.ok, true, c.reason);
  assert.deepEqual(c.moved, { changed: 2, cited: ["projects/demo/src/a.mjs"] });
  const fields = receiptFields(load(rec._path), { ran: {} });
  assert.deepEqual(fields.moved, { changed: 2, cited: ["projects/demo/src/a.mjs"] });
  assert.match(receipt({ ...FIELDS, ...fields }), /^project moved during the run: 2 files changed, 1 the plan cites \(projects\/demo\/src\/a\.mjs\)$/m);
});

test("land copies the staged plan and commits that path alone with the receipt, then the record is closed", (t) => {
  const w = world(t);
  const rec = atLanding(w);
  assert.throws(() => land(rec, { message: "x\nrun record: elsewhere\n", session: S1 }), /run land-check first/);
  landCheck(rec);
  assert.throws(() => land(load(rec._path), { message: "no receipt here\n", session: S1 }), /carries no receipt for this run/);
  // Another session's staged file and an untracked file stay out of the commit.
  writeAt(join(w.repo, "projects", "other", "staged.txt"), "staged by another session\n");
  git(w.repo, ["add", "projects/other/staged.txt"]);
  writeAt(join(w.repo, "projects", "demo", "src", "untracked.mjs"), "x\n");
  const msg = message(load(rec._path));
  const out = land(load(rec._path), { message: msg, session: S1 });
  assert.equal(out.ok, true, out.reason);
  assert.equal(git(w.repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", out.commit]).trim(), "projects/demo/docs/plans/new-plan.md");
  assert.equal(git(w.repo, ["log", "-1", "--format=%B"]).trim(), msg.trim());
  assert.match(git(w.repo, ["status", "--porcelain"]), /^A  projects\/other\/staged\.txt$/m);
  assert.deepEqual(readFileSync(w.plan), readFileSync(join(rec.dir, "plan.md")));
  const closed = load(rec._path);
  assert.equal(closed.state, "landed");
  assert.equal(closed.closed.commit, out.commit);
  assert.match(msg, new RegExp(`^run record: .*${RECORD.replace(/\./g, "\\.")}$`, "m"));
  assert.throws(() => land(closed, { message: msg, session: S1 }), /landed, and a closed record is never rewritten/);
});

// Git on Windows cannot open a path past 260 characters ("Filename too long"), and a run folder
// sits deep under the projects folder: found when this suite ran from a deeper scratch copy.
test("a run folder past Windows' 260-character path limit still checks, lands and commits", (t) => {
  const w = world(t);
  const job = join(w.root, "j".repeat(100), "k".repeat(100), "l".repeat(60));
  const rec = atLanding(w, undefined, { job });
  assert.ok(join(rec.dir, "plan.md").length > 260, `the staged plan's path is only ${join(rec.dir, "plan.md").length} characters`);
  const c = landCheck(rec);
  assert.equal(c.ok, true, c.reason);
  const out = land(load(rec._path), { message: message(load(rec._path)), session: S1 });
  assert.equal(out.ok, true, out.reason);
  assert.deepEqual(readFileSync(w.plan), readFileSync(join(rec.dir, "plan.md")));
});

test("a crash after landing's copy but before its commit is recognized by the blob and committed on the next try", (t) => {
  const w = world(t);
  const rec = atLanding(w);
  landCheck(rec);
  const hook = join(w.repo, ".git", "hooks", "pre-commit");
  writeAt(hook, "#!/bin/sh\nexit 1\n");
  spawnSync("chmod", ["+x", hook]);
  const msg = message(load(rec._path));
  assert.throws(() => land(load(rec._path), { message: msg, session: S1 }), /git commit/);
  assert.deepEqual(readFileSync(w.plan), readFileSync(join(rec.dir, "plan.md")));
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.action, "land");
  const c = landCheck(load(rec._path));
  assert.equal(c.ok, true, c.reason);
  assert.equal(c.copied, true);
  rmSync(hook);
  const out = land(load(rec._path), { message: msg, session: S2 });
  assert.equal(out.ok, true, out.reason);
  assert.equal(load(rec._path).state, "landed");
});

test("a crash after the commit but before the record closed is closed on the next try, with no second commit", (t) => {
  const w = world(t);
  const rec = atLanding(w);
  landCheck(rec);
  const msg = message(load(rec._path));
  writeAt(w.plan, readFileSync(join(rec.dir, "plan.md"), "utf8"));
  git(w.repo, ["add", "--", "projects/demo/docs/plans/new-plan.md"]);
  writeFileSync(join(w.root, "msg.txt"), msg);
  git(w.repo, ["commit", "-q", "-F", join(w.root, "msg.txt")]);
  const head = git(w.repo, ["rev-parse", "HEAD"]).trim();
  const out = land(load(rec._path), { message: msg, session: S2 });
  assert.equal(out.commit, head);
  assert.equal(git(w.repo, ["rev-parse", "HEAD"]).trim(), head);
  assert.equal(load(rec._path).closed.commit, head);
});

test("receipt-fields give flow.mjs's receipt every CE commit with its stages, the inline seats that ran, the strays and the record", (t) => {
  const w = world(t);
  rmSync(join(w.install, "skills", "ce-doc-review", "references", "personas", "coherence-reviewer.md"));
  const rec = atLanding(w);
  landCheck(rec);
  const f = receiptFields(load(rec._path), { ran: { write: ["write"], "check-1": ["coherence", "feasibility"], deepen: ["scorer"] } });
  assert.deepEqual(f.ce, [{ commit: SHA_NEW, stages: ["research", "write", "deepen", "check-1"] }]);
  assert.deepEqual(f.inline, [{ seat: "coherence", file: "skills/ce-doc-review/references/personas/coherence-reviewer.md", commit: SHA_NEW }]);
  assert.deepEqual(f.strays, []);
  assert.equal(f.update, false);
  assert.equal(typedPath(f.record), rec._path);
  const text = receipt({ ...FIELDS, ...f });
  assert.match(text, /^CE: 799ac9a\S* \(research, write, deepen, check-1\)$/m);
  assert.match(text, /^seats without their CE file: coherence \(skills\/ce-doc-review\/references\/personas\/coherence-reviewer\.md, CE 799ac9a/m);
  assert.throws(() => receiptFields(load(rec._path), { ran: { review: [] } }), /names no stage "review"/);
});

// ------------------------------------------------------------------------- the command

test("the command answers with exit 0, refuses with exit 1 and fails an unreadable input with exit 2", (t) => {
  const w = world(t);
  const cmd = (name, input) => spawnSync(process.execPath, [join(here, "run-record.mjs"), name, JSON.stringify(input)], { encoding: "utf8", env: { ...process.env, CLAUDE_CODE_SESSION_ID: S1 } });
  const ok = cmd("start", { plan: w.plan, update: false, brief: w.brief, registry: w.registry, projectsDir: w.projects });
  assert.equal(ok.status, 0, ok.stderr);
  const out = JSON.parse(ok.stdout);
  assert.equal(load(out.record).sessions[0].id, S1);
  const shown = cmd("show", { record: out.record });
  assert.equal(shown.status, 0, shown.stderr);
  assert.equal(JSON.parse(shown.stdout).step.stage, "research");
  const refused = cmd("start", { plan: w.plan, update: false, brief: w.brief, registry: w.registry, projectsDir: w.projects });
  assert.equal(refused.status, 1);
  const bad = cmd("show", { record: join(w.root, "nowhere") });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^run-record: there is no run record/m);
});
