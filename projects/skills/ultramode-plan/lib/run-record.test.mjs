import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
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

// `now` is start's option, not its input: it names the run folder.
const begin = (w, { now, ...extra } = {}) => start({ plan: w.plan, update: false, brief: w.brief, session: S1, registry: w.registry, ...extra }, { ...w.opts, ...(now ? { now } : {}) });
const load = (p) => loadRecord(p);

// A finished Workflow in a session's folder: its saved result and its helpers' transcripts.
function finish(w, session, runId, { status = "completed", agentCount, helpers = [] } = {}) {
  const dir = join(w.projects, SLUG, session);
  writeAt(join(dir, "workflows", `${runId}.json`), JSON.stringify({ runId, status, result: { summary: { ok: true } }, agentCount: agentCount ?? helpers.length }));
  helpers.forEach((rows, i) => writeAt(join(dir, "subagents", "workflows", runId, `agent-w${i}.jsonl`), `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`));
}
let calls = 0;
// A helper's tool call with no timestamps (a row the sweep can never attribute a file to).
const toolRow = (cwd, ...tools) => ({ type: "assistant", cwd, message: { role: "assistant", content: tools.map(([name, input]) => ({ type: "tool_use", id: `tu_${name}_${++calls}`, name, input })) } });
// One helper tool call as a transcript holds it: the tool_use row at `from` and its tool_result row
// at `to` (epoch ms), paired by id. The sweep credits a call only with files born inside that span.
function timed(cwd, from, to, [name, input]) {
  const id = `tu_${name}_${++calls}`;
  return [
    { type: "assistant", cwd, timestamp: new Date(from).toISOString(), message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } },
    { type: "user", cwd, timestamp: new Date(to).toISOString(), message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } },
  ];
}

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
  assert.equal(dirname(second.record).split(/[\\/]/).pop(), "20261105T090000Z");
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
  runStage(w, saved, "wf_research-001");
  assert.deepEqual(show(load(r.record)).ce.map((c) => c.stages), [["research"]]);
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
  // The crash: fold-land's record write lands, then its rename onto the staged plan fails.
  const unlock = lockRenames(t, "plan.working.md", "EIO");
  assert.throws(() => foldLand(rec, { ids: ["D1", "D2"], session: S1 }), /EIO/);
  unlock();
  const step = load(rec._path).steps.at(-1);
  assert.deepEqual([step.target, step.ledger], [sha256("# New plan\n\nfirst try\n"), ["D1", "D2"]]);
  assert.equal(sha256(readFileSync(join(rec.dir, "plan.md"))), step.before);
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
  // A commit is credited with a stage only when work ran on it: the write opened under the old CE
  // but folds under the new one.
  const served = (p) => show(load(p)).ce.map((c) => [c.commit, c.stages]);
  assert.deepEqual(served(rec._path), [[SHA_OLD, ["research"]], [SHA_NEW, []]]);
  const again = load(rec._path);
  fold(again, "# New plan\n\nwritten\n", [], S2);
  assert.deepEqual(served(rec._path), [[SHA_OLD, ["research"]], [SHA_NEW, ["write"]]]);
  advance(again, { outcome: "done", session: S2 });
  assert.deepEqual(served(rec._path), [[SHA_OLD, ["research"]], [SHA_NEW, ["write"]]]);
  // A second restart on the same CE adds the session to it, not a third resolution.
  restart({ record: rec._path, session: S3, registry }, w.opts);
  assert.deepEqual(load(rec._path).ce.map((c) => c.sessions), [[S1], [S2, S3]]);
  // A deepen launched on the new CE that never finished, then the registry moves again: its
  // recorded args name the old CE's paths, so restart answers start (rebuild the args), never rerun.
  const deep = load(rec._path);
  assert.equal(gate(deep, { line: ROOM, session: S3 }).go, true);
  const l = launch(deep, { script: w.script, args: { stage: "deepen" }, relayed: null, session: S3 }, w.opts);
  launched(deep, { launch: l.launch, runId: "wf_deepen-009", session: S3 }, w.opts);
  assert.equal(load(rec._path).launches.at(-1).ce, "C2");
  registryAt(w.root, [ceEntry(oldInstall, SHA_OLD, "3.34.0")], { at: registry });
  // S3 is gone; a later session picks the run up.
  const moved = restart({ record: rec._path, session: S2, registry }, w.opts);
  assert.equal(moved.action, "start");
  assert.match(moved.reason, /C2.*C3|rebuild/);
});

test("the receipt credits each CE commit only with the work that ran on it, and names inline seats by each launch's own resolution", (t) => {
  const w = world(t);
  // The old CE lacks the write's plan-sections file; the new one has it.
  const oldInstall = ceInstall(w.root, "3.34.0", { missing: ["plan-sections"] });
  const registry = registryAt(w.root, [ceEntry(oldInstall, SHA_OLD, "3.34.0")]);
  const rec = load(start({ plan: w.plan, update: false, brief: w.brief, session: S1, registry }, w.opts).record);
  runStage(w, rec, "wf_research-001");
  advance(rec, { outcome: "done", session: S1 });
  registryAt(w.root, [ceEntry(w.install, SHA_NEW, "3.35.3")], { at: registry });
  restart({ record: rec._path, session: S2, registry }, w.opts);
  const back = load(rec._path);
  fold(back, "# New plan\n\n## Goal\n\nwritten\n", [], S2);
  advance(back, { outcome: "done", session: S2 });
  runStage(w, back, "wf_deepen-002", { s: S2 });
  fold(back, "# New plan\n\n## Goal\n\ndeepened\n", ["D1"], S2);
  advance(back, { outcome: "deepened", session: S2 });
  runStage(w, back, "wf_check-003", { s: S2 });
  assert.equal(advance(back, { outcome: "done", changes: 0, session: S2 }).step, "land");
  landCheck(load(rec._path));
  const f = receiptFields(load(rec._path), { park: null, ran: { research: ["research"], write: ["write"], deepen: ["scorer"], "check-1": ["coherence"] } });
  assert.deepEqual(f.ce, [{ commit: SHA_OLD, stages: ["research"] }, { commit: SHA_NEW, stages: ["write", "deepen", "check-1"] }]);
  assert.deepEqual(f.inline, []);
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
  assert.equal(gate(rec, { line: ROOM, session: S1 }).go, true);
  fold(rec, "# New plan\n\nrewritten\n", []);
  advance(rec, { outcome: "done", session: S1 });
  runStage(w, rec, "wf_deepen-004");
  const end = advance(rec, { outcome: "premise-goal", session: S1 });
  assert.equal(end.step, "blocked");
  const closed = load(rec._path);
  assert.equal(closed.state, "blocked");
  assert.match(closed.handBack, /^blocked: a second verified premise finding/);
});

test("a window gate passed in a dead session clears nothing for the next one, and a send-back's write folds only behind its own start gate", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  assert.equal(gate(rec, { line: ROOM, session: S1 }).go, true);
  assert.equal(load(rec._path).steps[0].gates[0].session, S1);
  assert.equal(load(rec._path).steps[0].gate, "start");
  // S1 dies with its gate passed and nothing launched.
  restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.throws(() => launch(load(rec._path), { script: w.script, args: {}, relayed: null, session: S2 }, w.opts), /no passed window gate in this session/);
  // A send-back's write rewrites the plan, so it starts behind a start gate of its own session.
  const deep = atDeepen(world(t));
  assert.equal(advance(deep, { outcome: "premise-goal", session: S1 }).step, "write");
  assert.equal(load(deep._path).steps.at(-1).gate, "start");
  assert.throws(() => foldStart(load(deep._path), { session: S1 }), /start gate/);
  assert.equal(gate(load(deep._path), { line: WRAP, session: S1 }).step, "window-stop");
  assert.throws(() => foldStart(load(deep._path), { session: S1 }), /window stop/);
  const r = restart({ record: deep._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.action, "start");
  assert.equal(gate(load(deep._path), { line: ROOM, session: S2 }).go, true);
  fold(load(deep._path), "# New plan\n\nrewritten\n", [], S2);
  assert.equal(advance(load(deep._path), { outcome: "done", session: S2 }).step, "deepen");
  // Research's write is its fold, behind a fold gate only: it needs no start gate.
  const plain = load(begin(world(t)).record);
  runStage(w, plain, "wf_research-001");
  advance(plain, { outcome: "done", session: S1 });
  assert.equal(load(plain._path).steps.at(-1).gate, "fold");
  assert.equal(restart({ record: plain._path, session: S2, registry: w.registry }, w.opts).action, "fold");
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
  // Every call spans the moment the files are made below.
  const around = [Date.now() - 5_000, Date.now() + 120_000];
  const helpers = [
    [...timed(w.repo, ...around, ["Write", { file_path: probe, content: "x" }]), ...timed(w.repo, ...around, ["Bash", { command: "node gen.mjs > projects/demo/temp/trace.mjs; cat projects/demo/temp/kept.txt" }])],
    [...timed(w.repo, ...around, ["Read", { file_path: foreign }]), ...timed(w.repo, ...around, ["Bash", { command: "cat elsewhere/notes/trace.mjs" }])],
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
  const later = join(w.repo, "projects", "demo", "src", "later.mjs");
  const now = Date.now();
  writeAt(stray, "x\n");
  // A file made at a path a helper's command named, but after that command had finished.
  const rows = [...timed(w.repo, now - 5_000, now + 60_000, ["Write", { file_path: stray }]), ...timed(w.repo, now - 60_000, now - 50_000, ["Bash", { command: "test -f projects/demo/src/later.mjs" }])];
  writeAt(join(w.projects, SLUG, S1, "subagents", "workflows", "wf_dead-001", "agent-w0.jsonl"), `${rows.map((x) => JSON.stringify(x)).join("\n")}\n`);
  writeAt(later, "x\n");
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.deepEqual(r.swept, ["L1"]);
  assert.equal(r.action, "rerun");
  assert.equal(existsSync(stray), false);
  assert.ok(existsSync(later), "a file born after the command stays");
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
  // PowerShell's .\ spelling, and a relative spelling after a cd inside the command.
  assert.ok(writerOf(abs, trail(`Get-Content .\\${rel.split("/").join("\\")}`)));
  assert.ok(writerOf(abs, trail("cd projects/demo && echo x > temp/x.mjs")));
  assert.ok(writerOf(abs, trail("cd projects/demo; node temp/x.mjs")));
  assert.equal(writerOf(abs, trail("cd projects/other && echo x > temp/x.mjs")), null);
});

test("start refuses a project not yet in HEAD before making any folder, and a job folder under a '..x' subfolder of the repository", (t) => {
  const w = world(t);
  writeAt(join(w.repo, "projects", "fresh", "CLAUDE.md"), "# not committed yet\n");
  const plan = join(w.repo, "projects", "fresh", "docs", "plans", "p.md");
  const r = start({ plan, update: false, brief: w.brief, session: S1, registry: w.registry }, w.opts);
  assert.equal(r.ok, false);
  assert.match(r.reason, /projects\/fresh is not in HEAD/);
  assert.equal(existsSync(join(w.projects, slugOf(longOf(w.repo)), "plan-projects-fresh--p")), false);
  const inside = begin(w, { job: join(w.repo, "..x", "jobs") });
  assert.equal(inside.ok, false);
  assert.match(inside.reason, /inside the repository/);
});

test("a long job name hashes its plan path case-folded on Windows, and a typed registry path is read in its long form", { skip: !win && "platform: Windows only (case-folded paths, Git Bash spellings)" }, (t) => {
  const facts = { gitRoot: "/r", path: "/r/p/docs/plans/x.md", projectRel: "projects/demo", rel: `projects/demo/docs/plans/${"a".repeat(150)}.md` };
  const upper = { ...facts, rel: `projects/demo/docs/plans/${"A".repeat(150)}.md` };
  assert.equal(defaultJobFolder(facts, { projectsDir: "/p" }).folder.slice(-12), defaultJobFolder(upper, { projectsDir: "/p" }).folder.slice(-12));
  const w = world(t);
  const bash = w.registry.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`).split("\\").join("/");
  const r = start({ plan: w.plan, update: false, brief: w.brief, session: S1, registry: bash }, w.opts);
  assert.equal(r.ok, true, r.reason);
  assert.equal(JSON.parse(readFileSync(r.ce, "utf8")).commit, SHA_NEW);
});

test("complete finds a saved result whose session folder appeared after the launch, and says so when the folder is still missing", (t) => {
  const w = world(t);
  const S4 = "44444444-4444-4444-8444-444444444444";
  const rec = load(begin(w).record);
  gate(rec, { line: ROOM, session: S4 });
  const l = launch(rec, { script: w.script, args: {}, relayed: null, session: S4 }, w.opts);
  assert.equal(launched(rec, { launch: l.launch, runId: "wf_research-001", session: S4 }, w.opts).savedResult, null);
  assert.throws(() => complete(load(rec._path), { launch: "L1", session: S4 }, w.opts), /the session folder for 44444444-.* is missing/);
  finish(w, S4, "wf_research-001");
  const c = complete(load(rec._path), { launch: "L1", session: S4 }, w.opts);
  assert.equal(c.finished, true);
  assert.equal(c.savedResult, join(w.projects, SLUG, S4, "workflows", "wf_research-001.json"));
});

test("restart from the session that made a launch with no saved result refuses to sweep or re-run it: it may still be running", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  gate(rec, { line: ROOM, session: S1 });
  const l = launch(rec, { script: w.script, args: {}, relayed: null, session: S1 }, w.opts);
  launched(rec, { launch: l.launch, runId: "wf_research-001", session: S1 }, w.opts);
  const r = restart({ record: rec._path, session: S1, registry: w.registry }, w.opts);
  assert.equal(r.ok, false);
  assert.equal(r.action, "stop");
  assert.match(r.reason, /L1 .* may still be running/);
  assert.equal(load(rec._path).launches[0].sweep.done, false);
});

test("a path cited at a sentence's end is still a whole token, and no command calls process.exit after printing", () => {
  const cwd = join("/", "w", "repo");
  const abs = join(cwd, "projects", "demo", "temp", "x.mjs");
  const trail = { writes: [], commands: [{ text: "echo hi > projects/demo/temp/x.mjs. Then stop.", cwd, tool: "Bash", id: "t1", transcript: "a" }] };
  assert.ok(writerOf(abs, trail));
  assert.equal(writerOf(abs, { ...trail, commands: [{ ...trail.commands[0], text: "cat projects/demo/temp/x.mjs.bak" }] }), null);
  // An exit right after a print can cut a piped stdout short; an exit after only a stderr line
  // (an unread input, before any answer) is left as it is.
  for (const f of ["run-record.mjs", "flow.mjs"]) assert.doesNotMatch(readFileSync(join(here, f), "utf8"), /process\.exit\(/, `${f} sets process.exitCode instead`);
  assert.doesNotMatch(readFileSync(join(here, "fold.mjs"), "utf8"), /console\.log\([^\n]*\n(?:[^\n]*\n){0,3}\s*process\.exit\(/, "fold.mjs prints its answer, then sets process.exitCode");
});

// node:fs's renameSync made to fail for one file name, through the module ESM imports bind to.
test("a killed or failed saved result in its measured shape re-runs at restart, and neither advance nor fold-start reads it", (t) => {
  for (const status of ["killed", "failed"]) {
    const w = world(t);
    const rec = atDeepen(w);
    note(rec, { key: "parks", value: PARK, session: S1 });
    advance(rec, { outcome: "park", session: S1 });
    assert.equal(gate(load(rec._path), { line: ROOM, session: S1 }).go, true);
    const l = launch(load(rec._path), { script: w.script, args: { stage: "deepen" }, relayed: null, session: S1 }, w.opts);
    const runId = `wf_${status}-003`;
    launched(load(rec._path), { launch: l.launch, runId, session: S1 }, w.opts);
    // The shape 2 of 229 saved results on this laptop have.
    writeAt(join(w.projects, SLUG, S1, "workflows", `${runId}.json`), JSON.stringify({ runId, status, result: null }));
    assert.equal(complete(load(rec._path), { launch: l.launch, session: S1 }).finished, false);
    assert.throws(() => advance(load(rec._path), { outcome: "deepened", session: S1 }), /no finished Workflow/);
    assert.throws(() => foldStart(load(rec._path), { session: S1 }), /no finished Workflow to fold from/);
    const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
    assert.equal(r.action, "rerun", status);
    assert.match(r.reason, new RegExp(`status "${status}"`));
  }
});

test("a launch refuses after a compacted reading and after a fold gate: only a passed start gate clears it", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  const g = gate(rec, { line: "Context: compacted since the last measured turn", session: S1 });
  assert.equal(g.go, false);
  assert.equal(g.step, "reread");
  assert.throws(() => launch(load(rec._path), { script: w.script, args: {}, relayed: null, session: S1 }, w.opts), /no passed window gate/);
  assert.equal(gate(load(rec._path), { line: ROOM, action: "fold", session: S1 }).go, true);
  assert.throws(() => launch(load(rec._path), { script: w.script, args: {}, relayed: null, session: S1 }, w.opts), /no passed window gate/);
});

test("of two finished launches of one step, restart and fold-start read the newer", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  note(rec, { key: "parks", value: PARK, session: S1 });
  advance(rec, { outcome: "park", session: S1 });
  const ids = [];
  for (const runId of ["wf_deepen-older", "wf_deepen-newer"]) {
    assert.equal(gate(load(rec._path), { line: ROOM, session: S1 }).go, true);
    const l = launch(load(rec._path), { script: w.script, args: { runId }, relayed: null, session: S1 }, w.opts);
    launched(load(rec._path), { launch: l.launch, runId, session: S1 }, w.opts);
    ids.push(l.launch);
  }
  for (const [i, runId] of ["wf_deepen-older", "wf_deepen-newer"].entries()) {
    finish(w, S1, runId);
    complete(load(rec._path), { launch: ids[i], session: S1 });
  }
  const newer = join(w.projects, SLUG, S1, "workflows", "wf_deepen-newer.json");
  assert.equal(restart({ record: rec._path, session: S2, registry: w.registry }, w.opts).savedResult, newer);
  assert.equal(foldStart(load(rec._path), { session: S2 }).savedResult, newer);
});

test("writerOf matches Git Bash and case-folded spellings on Windows; the move line counts a file the plan cites by its name alone", (t) => {
  if (win) {
    const cwd = join("C:\\", "w", "repo");
    const abs = join(cwd, "projects", "demo", "temp", "x.mjs");
    const cmd = (text) => ({ writes: [], commands: [{ text, cwd, tool: "Bash", id: "t1", transcript: "a" }] });
    assert.ok(writerOf(abs, cmd("echo > /c/w/repo/projects/demo/temp/x.mjs"), { platform: "win32" }));
    assert.ok(writerOf(abs, cmd("echo > PROJECTS/Demo/TEMP/X.mjs"), { platform: "win32" }));
    assert.ok(writerOf(abs, { writes: [{ path: "/c/w/repo/projects/demo/temp/x.mjs", cwd, tool: "Write", id: "t2", transcript: "a" }], commands: [] }, { platform: "win32" }));
  }
  const w = world(t);
  const rec = atLanding(w, "# New plan\n\nTouches b.mjs and `projects/demo/src/c.mjs`, nothing else.\n");
  for (const f of ["b.mjs", "c.mjs", "d.mjs"]) writeAt(join(w.repo, "projects", "demo", "src", f), "x\n");
  git(w.repo, ["add", "-A", "--", "projects/demo/src"]);
  git(w.repo, ["commit", "-q", "-m", "another session's work"]);
  assert.deepEqual(landCheck(rec).moved, { changed: 3, cited: ["projects/demo/src/b.mjs", "projects/demo/src/c.mjs"] });
});

// EBUSY is what Windows answers for a held file (renameRetry retries it for about a second); any
// other code fails at once.
function lockRenames(t, name, code = "EBUSY") {
  const fs = createRequire(import.meta.url)("node:fs");
  const real = fs.renameSync;
  const restore = () => {
    fs.renameSync = real;
    syncBuiltinESMExports();
  };
  fs.renameSync = (from, to) => {
    if (String(from).endsWith(name)) throw Object.assign(new Error(`${code}: the rename of '${from}' failed`), { code });
    return real(from, to);
  };
  syncBuiltinESMExports();
  t.after(restore);
  return restore;
}

test("a stray that cannot be moved stays, is named as stuck and retried at restart, and the other moves keep", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  const demo = join(w.repo, "projects", "demo");
  const locked = join(demo, "temp", "locked.mjs");
  const free = join(demo, "temp", "free.mjs");
  const around = [Date.now() - 5_000, Date.now() + 120_000];
  const helpers = [[...timed(w.repo, ...around, ["Write", { file_path: locked, content: "x" }]), ...timed(w.repo, ...around, ["Write", { file_path: free, content: "x" }])]];
  const unlock = lockRenames(t, "locked.mjs");
  const sw = runStage(w, rec, "wf_research-001", { helpers, before: () => { writeAt(locked, "x\n"); writeAt(free, "x\n"); } });
  assert.deepEqual(sw.strays.deleted, ["projects/demo/temp/free.mjs"]);
  assert.deepEqual(sw.strays.stuck, ["projects/demo/temp/locked.mjs"]);
  assert.match(sw.strays.note, /could not be moved.*projects\/demo\/temp\/locked\.mjs \(EBUSY\)/);
  assert.ok(existsSync(locked));
  assert.deepEqual(load(rec._path).strays.deleted, ["projects/demo/temp/free.mjs"]);
  // The receipt cannot be built while a stray stays in the tree.
  const landed = atLanding(world(t));
  landCheck(landed);
  const r = load(landed._path);
  r.launches[0].sweep.stuck = [{ path: "projects/demo/temp/locked.mjs", by: null, error: "EBUSY" }];
  writeFileSync(r._path, JSON.stringify(r, null, 1));
  assert.throws(() => receiptFields(load(landed._path), { park: null, ran: RAN_NONE }), /could not be moved: projects\/demo\/temp\/locked\.mjs \(EBUSY\)/);
  // Freed, it moves at the next restart.
  unlock();
  restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(existsSync(locked), false);
  const after = load(rec._path);
  assert.deepEqual(after.launches[0].sweep.stuck, []);
  assert.deepEqual(after.strays.deleted.sort(), ["projects/demo/temp/free.mjs", "projects/demo/temp/locked.mjs"]);
});

test("a sweep recovers the moves a dead sweep made, and one with no readable snapshot moves nothing and says why", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  gate(rec, { line: ROOM, session: S1 });
  const l = launch(rec, { script: w.script, args: {}, relayed: null, session: S1 }, w.opts);
  launched(rec, { launch: l.launch, runId: "wf_dead-001", session: S1 }, w.opts);
  // The dead sweep moved one file out, then died before its record write.
  writeAt(join(rec.dir, "strays", "L1", "projects", "demo", "src", "moved.mjs"), "x\n");
  restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  const back = load(rec._path);
  assert.deepEqual(back.strays.deleted, ["projects/demo/src/moved.mjs"]);
  assert.match(back.launches[0].sweep.note, /recovered 1 move a dead sweep made: projects\/demo\/src\/moved\.mjs/);
  restart({ record: rec._path, session: S3, registry: w.registry }, w.opts);
  assert.deepEqual(load(rec._path).strays.deleted, ["projects/demo/src/moved.mjs"]);
  // A launch whose snapshot is gone: nothing can be told new, so nothing moves.
  const w2 = world(t);
  const rec2 = load(begin(w2).record);
  const stray = join(w2.repo, "projects", "demo", "src", "_zz_helper.mjs");
  const around = [Date.now() - 5_000, Date.now() + 120_000];
  const sw = runStage(w2, rec2, "wf_research-001", {
    helpers: [timed(w2.repo, ...around, ["Write", { file_path: stray, content: "x" }])],
    before: () => {
      writeAt(stray, "x\n");
      unlinkSync(join(rec2.dir, "launches", "L1.before.json.gz"));
    },
  });
  assert.deepEqual(sw.strays.deleted, []);
  assert.match(sw.strays.note, /snapshot .* is missing or unreadable/);
  assert.ok(existsSync(stray));
  assert.equal(load(rec2._path).launches[0].sweep.done, true);
});

test("the sweep credits a new file only to a call it was born during: a read, an edit or an untimed call of it never moves it, nor the plan path", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  const demo = join(w.repo, "projects", "demo");
  const read = join(demo, "src", "read-only.mjs");
  const edited = join(demo, "src", "edited.mjs");
  const untimed = join(demo, "src", "untimed.mjs");
  const cdWrite = join(demo, "temp", "y.mjs");
  const now = Date.now();
  // Calls made well after the files below were born, and calls that span their birth.
  const after = [now + 30_000, now + 31_000];
  const around = [now - 5_000, now + 120_000];
  const helpers = [[
    ...timed(w.repo, ...after, ["Bash", { command: "wc -l projects/demo/src/read-only.mjs" }]),
    ...timed(w.repo, ...after, ["Edit", { file_path: edited, old_string: "new", new_string: "old" }]),
    ...timed(w.repo, ...around, ["Bash", { command: "cd projects/demo && echo x > temp/y.mjs" }]),
    ...timed(w.repo, ...around, ["Write", { file_path: w.plan, content: "# a helper's plan\n" }]),
    toolRow(w.repo, ["Write", { file_path: untimed, content: "x" }]),
  ]];
  const sw = runStage(w, rec, "wf_research-001", { helpers, before: () => { for (const p of [read, edited, untimed, cdWrite, w.plan]) writeAt(p, "new\n"); } });
  assert.deepEqual(sw.strays.deleted, ["projects/demo/temp/y.mjs"]);
  assert.equal(existsSync(cdWrite), false);
  for (const p of [read, edited, untimed, w.plan]) assert.ok(existsSync(p), `${p} was kept`);
  const l = load(rec._path).launches[0];
  assert.ok(l.sweep.foreign.includes("projects/demo/docs/plans/new-plan.md"));
  assert.match(l.sweep.planNote, /projects\/demo\/docs\/plans\/new-plan\.md/);
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
// Every stage a full run serves, each with no seat named: a receipt names each served stage.
const RAN_NONE = { research: [], write: [], deepen: [], "check-1": [] };
const FIELDS = { deepen: "deepened", adversary: true, open: 0, park: null, holes: [], coverage: { premise: { nothing: true }, reach: { nothing: true }, "blast-radius": { nothing: true }, "test-vacuity": { nothing: true } } };
const message = (rec) => `docs(plans): new-plan\n\n${receipt({ ...FIELDS, ...receiptFields(rec, { park: null, ran: { ...RAN_NONE, write: ["write"], "check-1": ["coherence"] } }) })}\n`;

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

test("a run at its landing takes no fold, and a staged plan changed since its last step refuses restart, land-check and land, naming both", (t) => {
  const w = world(t);
  const rec = atLanding(w);
  assert.throws(() => foldStart(rec, { session: S1 }), /reached its landing/);
  writeFileSync(join(rec.dir, "plan.working.md"), "# an unchecked fold\n");
  assert.throws(() => foldLand(load(rec._path), { ids: ["X1"], session: S1 }), /reached its landing/);
  const want = load(rec._path).steps.at(-1).before;
  writeFileSync(join(rec.dir, "plan.md"), "# an unchecked fold\n");
  const now = sha256("# an unchecked fold\n");
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.ok, false);
  assert.equal(r.action, "stop");
  assert.ok(r.reason.includes(want) && r.reason.includes(now), r.reason);
  const c = landCheck(load(rec._path));
  assert.equal(c.ok, false);
  assert.ok(c.reason.includes(want) && c.reason.includes(now), c.reason);
  const l = land(load(rec._path), { message: "x\n", session: S2 });
  assert.equal(l.ok, false);
  assert.ok(l.reason.includes(want) && l.reason.includes(now), l.reason);
  assert.equal(existsSync(w.plan), false);
});

test("an unmoved project gives no move line; a moved one gives the count and the files the plan cites", (t) => {
  const w = world(t);
  const rec = atLanding(w, "# New plan\n\nChanges `src/a.mjs` and nothing else.\n");
  assert.equal(landCheck(rec).moved, null);
  assert.equal(receiptFields(load(rec._path), { park: null, ran: RAN_NONE }).moved, null);
  writeAt(join(w.repo, "projects", "demo", "src", "a.mjs"), "export const a = 2;\n");
  writeAt(join(w.repo, "projects", "demo", "src", "b.mjs"), "export const b = 1;\n");
  writeAt(join(w.repo, "projects", "other", "y.txt"), "outside the project\n");
  git(w.repo, ["add", "-A"]);
  git(w.repo, ["commit", "-q", "-m", "another session's work"]);
  const c = landCheck(load(rec._path));
  assert.equal(c.ok, true, c.reason);
  assert.deepEqual(c.moved, { changed: 2, cited: ["projects/demo/src/a.mjs"] });
  const fields = receiptFields(load(rec._path), { park: null, ran: RAN_NONE });
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
  // The failed commit leaves no staged plan in the shared index: nothing another session's plain
  // commit would sweep up.
  assert.equal(git(w.repo, ["diff", "--cached", "--name-only"]).trim(), "");
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

test("land refuses when the project moved since land-check, and lands once land-check and the receipt are rebuilt", (t) => {
  const w = world(t);
  const rec = atLanding(w, "# New plan\n\nChanges `src/a.mjs`.\n");
  assert.equal(landCheck(rec).moved, null);
  const stale = message(load(rec._path));
  writeAt(join(w.repo, "projects", "demo", "src", "a.mjs"), "export const a = 3;\n");
  git(w.repo, ["commit", "-q", "-am", "another session's work"]);
  const refused = land(load(rec._path), { message: stale, session: S1 });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /the project moved since land-check: run land-check and rebuild the receipt/);
  assert.equal(existsSync(w.plan), false);
  assert.deepEqual(landCheck(load(rec._path)).moved, { changed: 1, cited: ["projects/demo/src/a.mjs"] });
  const out = land(load(rec._path), { message: message(load(rec._path)), session: S1 });
  assert.equal(out.ok, true, out.reason);
  assert.match(git(w.repo, ["log", "-1", "--format=%B", out.commit]), /^project moved during the run: 1 file changed/m);
});

test("land copies through a recorded sibling temp, deletes a leftover one, and finds its commit by the record line when another commit follows it", (t) => {
  const w = world(t);
  const rec = atLanding(w);
  landCheck(rec);
  // A crash between the temp's write and its rename left the temp behind and no plan.
  const leftover = join(dirname(w.plan), ".new-plan.md.landing.tmp");
  writeAt(leftover, "# half a plan\n");
  const r = load(rec._path);
  r.landing = { tmp: leftover, at: "2026-11-08T00:00:00.000Z" };
  writeFileSync(r._path, JSON.stringify(r, null, 1));
  // Another session commits the moment this one does.
  const hook = join(w.repo, ".git", "hooks", "post-commit");
  writeAt(hook, `#!/bin/sh\nif [ ! -f "${join(w.root, "hooked").split("\\").join("/")}" ]; then touch "${join(w.root, "hooked").split("\\").join("/")}"; git commit -q --allow-empty -m "another session's commit"; fi\n`);
  spawnSync("chmod", ["+x", hook]);
  const out = land(load(rec._path), { message: message(load(rec._path)), session: S1 });
  assert.equal(out.ok, true, out.reason);
  assert.equal(existsSync(leftover), false);
  assert.deepEqual(readFileSync(w.plan), readFileSync(join(rec.dir, "plan.md")));
  assert.notEqual(git(w.repo, ["rev-parse", "HEAD"]).trim(), out.commit);
  assert.equal(git(w.repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", out.commit]).trim(), "projects/demo/docs/plans/new-plan.md");
  assert.equal(load(rec._path).closed.commit, out.commit);
  assert.equal(load(rec._path).landing.tmp, leftover);
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

// An update run whose deepen passed and whose round 1 changed nothing: the staged plan is HEAD's
// own blob, so there is no change to commit at the plan path.
function atUnchangedLanding(w) {
  const old = join(w.repo, "projects", "demo", "docs", "plans", "old-plan.md");
  const r = start({ plan: old, update: true, session: S1, registry: w.registry }, w.opts);
  assert.equal(r.ok, true, r.reason);
  const rec = load(r.record);
  runStage(w, rec, "wf_deepen-001");
  assert.equal(advance(rec, { outcome: "passed", session: S1 }).step, "check-1");
  runStage(w, rec, "wf_check-002");
  assert.equal(advance(rec, { outcome: "done", changes: 0, session: S1 }).step, "land");
  const c = landCheck(load(rec._path));
  assert.equal(c.ok, true, c.reason);
  return load(rec._path);
}
const unchangedMessage = (rec) => `docs(plans): old-plan\n\n${receipt({ ...FIELDS, deepen: "passed", ...receiptFields(rec, { park: null, ran: { deepen: [], "check-1": [] } }) })}\n`;

test("an update run that changed nothing lands as an empty commit, with exit 0, and another session's staged file stays staged", (t) => {
  const w = world(t);
  const rec = atUnchangedLanding(w);
  writeAt(join(w.repo, "projects", "other", "staged.txt"), "staged by another session\n");
  git(w.repo, ["add", "projects/other/staged.txt"]);
  const head = git(w.repo, ["rev-parse", "HEAD"]).trim();
  const r = spawnSync(process.execPath, [join(here, "run-record.mjs"), "land", JSON.stringify({ record: rec._path, message: unchangedMessage(rec) })], { encoding: "utf8", env: { ...process.env, CLAUDE_CODE_SESSION_ID: S1 } });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.ok, true, out.reason);
  assert.equal(git(w.repo, ["rev-parse", `${out.commit}^`]).trim(), head);
  assert.equal(git(w.repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", out.commit]).trim(), "");
  assert.match(git(w.repo, ["status", "--porcelain"]), /^A  projects\/other\/staged\.txt$/m);
  const closed = load(rec._path);
  assert.equal(closed.state, "landed");
  assert.equal(closed.closed.commit, out.commit);
});

test("an empty landing commit made before a crash is found by its record line and closed, with no second commit", (t) => {
  const w = world(t);
  const rec = atUnchangedLanding(w);
  const msg = unchangedMessage(rec);
  writeFileSync(join(w.root, "msg.txt"), msg);
  git(w.repo, ["commit", "-q", "--allow-empty", "-F", join(w.root, "msg.txt")]);
  const head = git(w.repo, ["rev-parse", "HEAD"]).trim();
  assert.equal(landCheck(load(rec._path)).committed, head);
  const out = land(load(rec._path), { message: msg, session: S2 });
  assert.equal(out.ok, true, out.reason);
  assert.equal(out.commit, head);
  assert.equal(git(w.repo, ["rev-parse", "HEAD"]).trim(), head);
  assert.equal(load(rec._path).closed.commit, head);
});

test("receipt-fields give flow.mjs's receipt every CE commit with its stages, the inline seats that ran, the strays and the record", (t) => {
  const w = world(t);
  rmSync(join(w.install, "skills", "ce-doc-review", "references", "personas", "coherence-reviewer.md"));
  const rec = atLanding(w);
  landCheck(rec);
  const f = receiptFields(load(rec._path), { park: null, ran: { research: [], write: ["write"], "check-1": ["coherence", "feasibility"], deepen: ["scorer"] } });
  assert.deepEqual(f.ce, [{ commit: SHA_NEW, stages: ["research", "write", "deepen", "check-1"] }]);
  assert.deepEqual(f.inline, [{ seat: "coherence", file: "skills/ce-doc-review/references/personas/coherence-reviewer.md", commit: SHA_NEW }]);
  assert.deepEqual(f.strays, []);
  assert.equal(f.update, false);
  assert.equal(typedPath(f.record), rec._path);
  const text = receipt({ ...FIELDS, ...f });
  assert.match(text, /^CE: 799ac9a\S* \(research, write, deepen, check-1\)$/m);
  assert.match(text, /^seats without their CE file: coherence \(skills\/ce-doc-review\/references\/personas\/coherence-reviewer\.md, CE 799ac9a/m);
  assert.throws(() => receiptFields(load(rec._path), { park: null, ran: { review: [] } }), /names no stage "review"/);
});

test("a step's outcome and the receipt wait for every launch's sweep, so 'stray files deleted: none' is never a default", (t) => {
  const w = world(t);
  const rec = load(begin(w).record);
  gate(rec, { line: ROOM, session: S1 });
  const l = launch(rec, { script: w.script, args: {}, relayed: null, session: S1 }, w.opts);
  launched(rec, { launch: l.launch, runId: "wf_research-001", session: S1 }, w.opts);
  finish(w, S1, "wf_research-001");
  assert.throws(() => advance(load(rec._path), { outcome: "done", session: S1 }), /L1 has not been swept: run complete/);
  complete(load(rec._path), { launch: "L1", session: S1 });
  assert.equal(advance(load(rec._path), { outcome: "done", session: S1 }).step, "write");
  const landed = atLanding(world(t));
  landCheck(landed);
  const r = load(landed._path);
  r.launches[1].sweep.done = false;
  writeFileSync(r._path, JSON.stringify(r, null, 1));
  assert.throws(() => receiptFields(load(landed._path), { park: null, ran: RAN_NONE }), /L2 has not been swept/);
});

const PARK = "Keep the 10% margin, or drop it to 5%?";

// A run whose deepen parked a question, relaunched without the premise seat and reached its landing.
function atParkedLanding(w) {
  const rec = atDeepen(w);
  note(rec, { key: "parks", value: PARK, session: S1 });
  assert.equal(advance(rec, { outcome: "park", session: S1 }).step, "deepen");
  runStage(w, rec, "wf_deepen-003");
  fold(rec, "# New plan\n\n## Goal\n\nparked, deepened\n", ["D1"]);
  advance(rec, { outcome: "deepened", session: S1 });
  runStage(w, rec, "wf_check-004");
  assert.equal(advance(rec, { outcome: "done", changes: 0, session: S1 }).step, "land");
  landCheck(rec);
  return load(rec._path);
}

test("receipt-fields carry the park, the open count and the deepen's outcome from the record, and refuse a park that disagrees with it", (t) => {
  const w = world(t);
  const plain = atLanding(w);
  landCheck(plain);
  const f = receiptFields(load(plain._path), { park: null, ran: RAN_NONE });
  assert.deepEqual([f.park, f.open, f.deepen], [null, 0, "deepened"]);
  assert.throws(() => receiptFields(load(plain._path), { park: "A question nobody parked?", ran: RAN_NONE }), /no park was noted/);
  assert.throws(() => receiptFields(load(plain._path), { ran: RAN_NONE }), /park is the parked question, or null/);
  const parked = atParkedLanding(world(t));
  assert.throws(() => receiptFields(parked, { park: null, ran: RAN_NONE }), /parked 1 question/);
  assert.equal(receiptFields(parked, { park: PARK, ran: RAN_NONE }).park, PARK);
});

test("land refuses a message with no parked line while a park was noted, or whose head line's open count is not the record's", (t) => {
  const w = world(t);
  const rec = atParkedLanding(w);
  const msg = `docs(plans): new-plan\n\n${receipt({ ...FIELDS, ...receiptFields(rec, { park: PARK, ran: RAN_NONE }) })}\n`;
  assert.match(msg, /^parked: Keep the 10% margin/m);
  assert.throws(() => land(load(rec._path), { message: msg.replace(/^parked: .*\n/m, ""), session: S1 }), /no "parked:" line/);
  const wrongOpen = msg.replace(/^(planned, deepened and checked)$/m, "$1, 2 P0/P1 open");
  assert.notEqual(wrongOpen, msg);
  assert.throws(() => land(load(rec._path), { message: wrongOpen, session: S1 }), /2 P0\/P1 open, and the record holds 0/);
  assert.equal(existsSync(w.plan), false);
  assert.equal(land(load(rec._path), { message: msg, session: S1 }).ok, true);
});

test("a park's relaunch carries skipPremise, parked and the parked scores through a window stop and every restart answer", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  const scores = load(rec._path).launches.at(-1).savedResult;
  note(rec, { key: "parks", value: PARK, session: S1 });
  advance(rec, { outcome: "park", session: S1 });
  assert.equal(gate(load(rec._path), { line: WRAP, session: S1 }).step, "window-stop");
  const r = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(r.action, "start");
  assert.deepEqual([r.skipPremise, r.parked, r.scoresFrom], [true, true, scores]);
  const s = show(load(rec._path)).step;
  assert.deepEqual([s.skipPremise, s.parked, s.scoresFrom], [true, true, scores]);
  runStage(w, load(rec._path), "wf_deepen-003", { s: S2 });
  const f = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(f.action, "fold");
  assert.deepEqual([f.skipPremise, f.parked, f.scoresFrom], [true, true, scores]);
});

test("show gives a resuming session every recorded fact and each step's ledger, and restart's advance answer carries the saved result", (t) => {
  const w = world(t);
  const rec = atDeepen(w);
  assert.throws(() => note(load(begin(world(t)).record), { key: "risk", value: { level: "low" }, session: S1 }), /risk is the deepen's/);
  note(rec, { key: "contractBrief", value: "the laws", session: S1 });
  note(rec, { key: "risk", value: { level: "high" }, session: S1 });
  note(rec, { key: "lenses", value: [{ lens: "design", reason: "a UI plan" }], session: S1 });
  note(rec, { key: "external", value: { run: false, reason: "no outside API" }, session: S1 });
  note(rec, { key: "parks", value: PARK, session: S1 });
  assert.equal(note(load(rec._path), { key: "parks", value: PARK, session: S1 }).skipped, true);
  fold(load(rec._path), "# New plan\n\n## Goal\n\ndeepened\n", ["D1", "D2"]);
  const at = restart({ record: rec._path, session: S2, registry: w.registry }, w.opts);
  assert.equal(at.action, "advance");
  assert.equal(at.savedResult, join(w.projects, SLUG, S1, "workflows", "wf_deepen-002.json"));
  const s = show(load(rec._path));
  assert.equal(s.contractBrief, "the laws");
  assert.deepEqual(s.risk, { level: "high" });
  assert.deepEqual(s.lenses, [{ lens: "design", reason: "a UI plan" }]);
  assert.deepEqual(s.external, { run: false, reason: "no outside API" });
  assert.deepEqual(s.parks, [PARK]);
  assert.deepEqual(s.council, []);
  assert.deepEqual(s.steps.map((x) => [x.n, x.stage, x.outcome, x.ledger]), [[1, "research", "done", null], [2, "write", "done", []], [3, "deepen", null, ["D1", "D2"]]]);
  // A send-back's second deepen scores a rewritten plan: its risk is the one that stands.
  assert.equal(advance(load(rec._path), { outcome: "premise-goal", session: S2 }).step, "write");
  assert.equal(gate(load(rec._path), { line: ROOM, session: S2 }).go, true);
  fold(load(rec._path), "# New plan\n\nrewritten\n", [], S2);
  advance(load(rec._path), { outcome: "done", session: S2 });
  note(load(rec._path), { key: "risk", value: { level: "low" }, session: S2 });
  const again = load(rec._path);
  assert.deepEqual(again.risk, { level: "low" });
  assert.deepEqual(again.steps.filter((x) => x.stage === "deepen").map((x) => x.risk), [{ level: "high" }, { level: "low" }]);
});

test("restart's new answer lists the plan's closed runs", (t) => {
  const w = world(t);
  const r = begin(w);
  block(load(r.record), { reason: "a test block", session: S1 });
  const n = restart({ plan: w.plan, session: S2, registry: w.registry }, w.opts);
  assert.equal(n.action, "new");
  assert.deepEqual(n.closed.map((c) => [c.record, c.state]), [[r.record, "blocked"]]);
});

test("receipt-fields refuses a served stage left out of ran, seats for a stage that never ran, and a seat key nothing names", (t) => {
  const w = world(t);
  const rec = atLanding(w);
  landCheck(rec);
  const fields = (ran) => receiptFields(load(rec._path), { park: null, ran });
  // Left out is not "ran with its file": every served stage is written out, empty when no seat ran.
  assert.throws(() => fields({ write: ["write"], "check-1": ["coherence"] }), /research, deepen/);
  assert.throws(() => fields({ ...RAN_NONE, brief: ["premise"] }), /brief/);
  assert.throws(() => fields({ ...RAN_NONE, deepen: ["scorer", "no-such-seat"] }), /no-such-seat/);
  // The seats that read no CE file are known, and never inline.
  const f = fields({ ...RAN_NONE, deepen: ["premise", "scorer"], "check-1": ["reach", "blast-radius", "test-vacuity", "coherence"] });
  assert.deepEqual(f.inline, []);
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
