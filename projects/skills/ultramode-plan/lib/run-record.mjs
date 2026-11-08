#!/usr/bin/env node
// THE RUN RECORD (KTD10 and KTD23 of docs/plans/hybrid-plan-step-plan.md; U3). A plan run can die
// or stop at the window line mid-plan, so everything a later session needs to finish it lives in
// one record, found from the plan path alone (R8):
//   - where: a job folder named for the project and the plan's file name, inside the Claude Code
//     projects folder of the plan's git root (the one that holds that root's memory folder), one
//     subfolder per run, named by its start time. The git root is taken in its long form, so an
//     8.3, junction or Git Bash spelling of the same plan path finds the same folder (playbook
//     insight 012);
//   - what: ultramode-plan-run.json, with the base commit and project subtree hash, the brief's
//     sha256, the contract brief, the named path's state at the start, every CE resolution with the
//     stages it served, the risk profile and lens picks, one step per pass through a stage (its
//     before and target hashes of the staged plan and its fold ledger), the premise send-backs,
//     every session id, and every Workflow launch (run id, session, script and its sha256, CLI
//     version, exact args, relayed user text, saved-result path, transcript folder);
//   - the staged plan: written and folded in the run folder (plan.md), reaching the named path only
//     at landing, so the named path is before or after a whole fold at every moment;
//   - the stray sweep: before each Workflow the project subtree's untracked and ignored files are
//     listed; after it, the new ones a helper of that Workflow wrote are moved out of the tree into
//     the run folder (strays/<launch>/) and named in the receipt, and every other new file is left
//     alone. A helper's shell write leaves only a command string, so a file counts as the run's when
//     a Write names it or a Bash or PowerShell command names it as a whole path token (playbook
//     insight 011), and the file was born during that call (an Edit counts only for a path a helper
//     call also created, since an Edit makes a new file); the plan's own path never moves. A stray
//     a lock kept in the tree is retried at restart, and only while it is the very file the sweep
//     found;
//   - restart: a finished Workflow is folded from its saved result and never re-run; one that never
//     finished re-runs from its start with the recorded args (or starts again when CE moved since
//     it launched, its args naming the old CE's files); a launch this process made with no saved
//     result makes the restart wait, since it may still be running, while one another process made
//     under the same session id (a resumed session) died with that process; a leftover working file
//     is deleted first; a staged plan at its before hash re-runs the fold, at its target hash moves
//     on, at neither stops, naming both; CE is resolved again; a window gate clears work only in the
//     session that passed it, and only while it is the step's last reading;
//   - CE credit: a resolution is credited with a stage only where work ran on it (a completed
//     launch, a landed write fold, the lens picks), never where a step merely opened;
//   - landing: KTD3's path checks again, the staged plan checked against the last step's hash, the
//     project-move line read again and matched in the message, one copy through a recorded sibling
//     temp and one rename, and one commit of that path alone carrying the receipt, found by its
//     record line as a whole line, touching the plan alone at the staged blob (an update run that
//     changed nothing lands as an empty commit). Nothing is staged in the shared index. A crash
//     after the copy but before the commit leaves the named path holding the staged plan, which a
//     re-landing recognizes by its blob and commits.
// A closed record (landed or blocked) is never rewritten: a landed receipt cites its path.
// Run by the main loop as a command; never inlined into a Workflow script (KTD1).
//
// Usage: node run-record.mjs <command> <json | path to a .json file>, in the order a run runs:
//   locate       { plan, job? }                                -> { jobFolder, resume, open, closed }
//   start        { plan, update, brief?, job?, session? }       -> { ok, record, stage, ... } (exit 1 when refused)
//   restart      { record } or { plan, job? }, with session?, pid? -> { action, ... } (exit 1 on a stop;
//                action "wait" while a launch of this process may still be running)
//   show         { record }                                    -> the run's state, its launches included
//   note         { record, key, value, session? }              -> records one fact (KTD5, KTD6, KTD11, KTD22);
//                risk while a deepen step is current, before its outcome
//   gate         { record, line, action, session? }            -> flow.mjs's window gate, recorded
//   launch       { record, script, args, relayed, seats?, resumeOf?, session?, pid? } -> { launch, args }
//   launched     { record, launch, runId }                     -> the run id, saved-result path, transcript folder
//   complete     { record, launch, notStarted? }               -> the saved result's status and the stray sweep
//                (stuck strays named); notStarted, the Workflow tool's error, closes a launch with no run id
//   fold-start   { record, session? }                          -> { working, staged, before, savedResult }
//   fold-land    { record, ids, session? }                     -> { target }
//   advance      { record, outcome, changes?, p0p1?, open?, brief?, session? } -> flow.mjs's next step, recorded
//   block        { record, reason, session? }                  -> closes the run as blocked
//   land-check   { record }                                    -> { ok, moved, ... } (exit 1 when the path changed)
//   receipt-fields { record, ran, park }                       -> the receipt fields the record holds; ran maps
//                each completed launch's id to the seats that ran in it
//   land         { record, message, session? }                 -> { ok, commit } (exit 1 when refused)
// `session` defaults to this session's CLAUDE_CODE_SESSION_ID; a command that writes refuses when
// neither names one. `pid` defaults to this process's CLAUDE_PID. `registry` (the plugin registry)
// and `projectsDir` may be given for a fixture.
// Exit 0 is an answer, 1 a refusal or stop (nothing written past it), 2 an input the command could
// not read or a refused write (nothing was decided).

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, copyFileSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { isMain, usage } from "./entry.mjs";
import { STAGES, firstStage, landingCheck, loadStageCosts, moveLine, nextStep, pathFacts, stageGate, startCheck } from "./flow.mjs";
import { MAX_SLUG, defaultProjectsDir, fromGitBash, longOf, samePath, slugOf } from "./paths.mjs";
import { KNOWN_SEATS, SEATS_WITHOUT_CE, changedInPlace, checkResolution, inlineSeats, resolveCe, sameResolution } from "./resolve-ce.mjs";

export const RECORD = "ultramode-plan-run.json";
const KIND = "ultramode-plan-run";
const VERSION = 1;
const STAGED = "plan.md";
const WORKING = "plan.working.md";
// The stages that run a Workflow; brief runs the /brief skill and the write is research's fold.
const WORKFLOW_STAGES = ["research", "deepen", "check-1", "check-2", "check-3"];
// Stages that start before any staged plan exists (flow.mjs's gate takes no plan size for them).
const PLANLESS = ["brief", "research"];
const OPEN = ["running", "window-stop"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUN_ID = /^wf_[0-9a-z][0-9a-z-]*$/;

// ---------------------------------------------------------------- small tools

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const fileSha = (p) => sha256(readFileSync(p));
const stamp = (now) => (now instanceof Date ? now : new Date()).toISOString();
const fail = (msg) => {
  throw new Error(`run-record: ${msg}`);
};

// A pause for a retry, without a busy loop.
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// A rename, retried while Windows holds the target open (an indexer or a virus scan answers EPERM,
// EACCES or EBUSY for a moment).
function renameRetry(from, to) {
  for (let i = 0; ; i++) {
    try {
      return renameSync(from, to);
    } catch (e) {
      if (i >= 20 || !["EPERM", "EACCES", "EBUSY"].includes(e.code)) throw e;
      pause(50);
    }
  }
}

// A file written whole or not at all: a temporary file beside it, then one rename.
function writeAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, data);
  renameRetry(tmp, path);
}

// A move that also works across volumes (EXDEV: copy, then delete the original).
function moveFile(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  try {
    renameRetry(from, to);
  } catch (e) {
    if (e.code !== "EXDEV") throw e;
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

// Whether a relative() answer stays at or below its base: "..", "../x" and an absolute answer
// leave it; a folder named "..x" does not.
const below = (rel) => rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith("../") && !isAbsolute(rel);

// "~" for the home folder: the form the receipt prints, since the repo is public.
const home = () => homedir();
export function untilde(text) {
  return String(text).replace(/^~(?=$|[\\/])/, () => home());
}
export function tildeOf(p) {
  const h = home();
  const rel = relative(h, p);
  if (rel && below(rel)) return `~/${rel.split(sep).join("/")}`;
  return p;
}

// A path a session typed, in its long form: "~", Git Bash's "/c/x" and an 8.3 or junction
// spelling all come back as the one path (fromGitBash first: longOf on "/c/x" reads a folder c).
export const typedPath = (text, cwd = process.cwd()) => longOf(resolve(cwd, fromGitBash(untilde(text))));

// One git command in the repository. Git is never handed a path inside the run folder: on Windows
// it cannot open a path past 260 characters ("Filename too long", measured in a deep test copy),
// and a run folder sits deep under the projects folder, so such bytes go in on stdin (`input`).
function git(cwd, args, { buffer = false, quiet = [], input } = {}) {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: buffer ? "buffer" : "utf8", maxBuffer: 512 * 1024 * 1024, env: { ...process.env, MSYS_NO_PATHCONV: "1" }, ...(input === undefined ? {} : { input }) });
  if (r.error) fail(`git could not run: ${r.error.message}`);
  if (r.status === 0) return buffer ? r.stdout : r.stdout.replace(/\n$/, "");
  if (quiet.includes(r.status)) return null;
  fail(gitFailure(args, r));
}

// A failed git command's error text. Git prints some refusals on stdout (a commit with nothing to
// commit), so both streams go in it.
export function gitFailure(args, { status, stderr, stdout }) {
  const said = [stderr, stdout].map((x) => String(x ?? "").trim()).filter(Boolean).join(" | ");
  return `git ${args.join(" ")} failed (exit ${status}): ${said}`;
}
const literal = (rel) => `:(literal)${rel}`;

// The plugin registry a fixture names, read in its long form ("~", Git Bash and 8.3 spellings);
// none given is resolveCe's default.
const registryOf = (input, cwd) => (input.registry === undefined || input.registry === null ? {} : { registry: typedPath(String(input.registry), cwd) });

// The session id a command writes under: the input's, else this session's own.
function sessionOf(input) {
  const id = input.session ?? process.env.CLAUDE_CODE_SESSION_ID;
  if (typeof id !== "string" || !UUID.test(id)) fail(`a command that writes names its session (input "session", or this session's CLAUDE_CODE_SESSION_ID); got ${JSON.stringify(id)}`);
  return id.toLowerCase();
}

// The Claude Code process a command runs under (CLAUDE_PID; input "pid" for a fixture), or null
// where none is named. A background Workflow lives only as long as that process, and
// `claude --resume` keeps the session id, so the session alone cannot say a launch is dead.
function procOf(input) {
  const v = input.pid ?? process.env.CLAUDE_PID;
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) fail(`pid is the Claude Code process id, got ${JSON.stringify(v)}`);
  return n;
}

// ---------------------------------------------------------------- where a run lives (KTD10)

const nameSlug = (s) => s.replace(/[^A-Za-z0-9]/g, "-");

// The default job folder for a plan path's facts (flow.mjs's pathFacts): inside the projects folder
// of the plan's git root, named for the project and the plan's path under its docs/plans/. Null,
// with the reason, for a path KTD3 would refuse anyway (outside a project's docs/plans/).
export function defaultJobFolder(facts, { projectsDir = defaultProjectsDir() } = {}) {
  if (!facts.gitRoot) return { folder: null, reason: `${facts.path} is not inside a git repository` };
  if (!facts.projectRel) return { folder: null, reason: `${facts.rel ?? facts.path} is not inside a project's own docs/plans/ folder` };
  const root = longOf(facts.gitRoot);
  const slug = slugOf(root);
  if (slug.length > MAX_SLUG) fail(`the git root ${root} names a projects folder longer than ${MAX_SLUG} characters, which Claude Code cuts and hashes in a way this cannot model`);
  const under = facts.rel.slice(`${facts.projectRel}/docs/plans/`.length).replace(/\.md$/i, "");
  let name = `plan-${nameSlug(facts.projectRel)}--${nameSlug(under)}`;
  // A long name is cut and given a hash of the plan's path, so it stays unique and well under
  // Windows' path limit with the run folders and files below it.
  // Hashed case-folded on Windows, where two casings of one path are one file.
  if (name.length > 120) name = `${name.slice(0, 100)}-${sha256(process.platform === "win32" ? facts.rel.toLowerCase() : facts.rel).slice(0, 12)}`;
  return { folder: join(projectsDir, slug, name), reason: null };
}

// A run folder's record, read and checked. A record that does not parse, or is not one, refuses:
// it never reads as an open or a closed run.
export function loadRecord(path) {
  const p = typedPath(path);
  const file = existsSync(p) && statSync(p).isDirectory() ? join(p, RECORD) : p;
  if (!existsSync(file)) fail(`there is no run record at ${file}`);
  let rec;
  try {
    rec = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`the run record at ${file} does not parse: ${e.message}`);
  }
  if (!rec || rec.kind !== KIND || rec.version !== VERSION) fail(`${file} is not a version-${VERSION} ${KIND} record`);
  for (const k of ["plan", "dir", "state", "steps", "launches", "ce", "sessions", "start", "base"]) if (!(k in rec)) fail(`the run record at ${file} has no ${k}`);
  Object.defineProperty(rec, "_path", { value: file, enumerable: false });
  return rec;
}

const isOpen = (rec) => OPEN.includes(rec.state);

function save(rec) {
  writeAtomic(rec._path, `${JSON.stringify(rec, null, 1)}\n`);
  return rec;
}

// Every write refuses a closed record: a landed receipt cites its path, and a blocked run's
// report is final. A new run starts beside it.
function writable(rec, session) {
  if (!isOpen(rec)) fail(`the run at ${rec.dir} is ${rec.state}, and a closed record is never rewritten; start a new run beside it`);
  if (!rec.sessions.some((s) => s.id === session)) rec.sessions.push({ id: session, at: stamp() });
  return rec;
}

// Every run in a job folder, each record read. Runs whose record names another plan are kept apart:
// a job folder given by hand may hold them, and resuming one would finish the wrong plan.
export function listRuns(jobFolder, planPath) {
  if (!existsSync(jobFolder)) return { mine: [], others: [] };
  const mine = [];
  const others = [];
  for (const name of readdirSync(jobFolder).sort()) {
    const dir = join(jobFolder, name);
    if (!statSync(dir).isDirectory() || !existsSync(join(dir, RECORD))) continue;
    const rec = loadRecord(join(dir, RECORD));
    const row = { record: rec._path, run: name, state: rec.state, stage: currentStep(rec)?.stage ?? null, startedAt: rec.startedAt };
    (samePath(rec.plan.path, planPath) ? mine : others).push(row);
  }
  return { mine, others };
}

// The newest unfinished run for a plan path, looked for before KTD3's path checks.
export function locate({ plan, job, cwd = process.cwd(), projectsDir = defaultProjectsDir() } = {}) {
  if (typeof plan !== "string" || !plan.trim()) fail(`locate needs the plan path, got ${JSON.stringify(plan)}`);
  const facts = pathFacts(fromGitBash(untilde(plan)), { cwd });
  let jobFolder;
  if (job !== undefined && job !== null) jobFolder = typedPath(job, cwd);
  else {
    const d = defaultJobFolder(facts, { projectsDir });
    if (!d.folder) return { plan: facts.path, jobFolder: null, reason: d.reason, resume: null, open: [], closed: [], others: [] };
    jobFolder = d.folder;
  }
  const { mine, others } = listRuns(jobFolder, facts.path);
  const open = mine.filter((r) => OPEN.includes(r.state)).sort((a, b) => (a.run < b.run ? 1 : -1));
  return { plan: facts.path, jobFolder, resume: open[0]?.record ?? null, open, closed: mine.filter((r) => !OPEN.includes(r.state)), others };
}

// ---------------------------------------------------------------- steps and resolutions

const currentStep = (rec) => rec.steps[rec.steps.length - 1] ?? null;
const stagedPath = (rec) => join(rec.dir, STAGED);
const workingPath = (rec) => join(rec.dir, WORKING);
const stagedHash = (rec) => (existsSync(stagedPath(rec)) ? fileSha(stagedPath(rec)) : null);
const latestCe = (rec) => rec.ce[rec.ce.length - 1];

// The work that ran, one row per piece, each with the resolution it ran on and the seats that read
// a CE file in it: every completed launch (its seats from `ran`, keyed by launch id, plus research's
// mapping, which the main loop reads to build research's args, KTD4), each landed write fold (the
// plan's shape, KTD3) and the lens picks the main loop read for the check (KTD6). The receipt's CE
// line and its inline seats are both read from these rows, so they cannot disagree.
function workRows(rec, ran = {}) {
  const rows = rec.launches.filter((l) => l.status === "completed").map((l) => ({ stage: l.stage, ce: l.ce, seats: [...(ran[l.id] ?? []), ...(l.stage === "research" ? ["research"] : [])] }));
  for (const s of rec.steps) if (s.stage === "write" && s.target !== null && s.foldCe) rows.push({ stage: "write", ce: s.foldCe, seats: ["write"] });
  if (rec.lenses !== null && rec.lensesCe) rows.push({ stage: "check-1", ce: rec.lensesCe, seats: ["lens-picks"] });
  return rows;
}

// The stages each resolution served, in STAGES order, credited only where work ran on it. Opening a
// step credits nothing (the brief runs /brief and reads no CE).
function servedStages(rec) {
  const by = new Map(rec.ce.map((c) => [c.id, new Set()]));
  for (const r of workRows(rec)) by.get(r.ce)?.add(r.stage);
  return new Map([...by].map(([id, set]) => [id, STAGES.filter((s) => set.has(s))]));
}

// What a park's relaunch must carry wherever its step is handed on (restart, show): without it a
// relaunch after a window stop would run the premise seat again.
const premiseOf = (step) => (step?.skipPremise ? { skipPremise: true, parked: step.parked === true, scoresFrom: step.scoresFrom ?? null } : {});

// A write that opened with a start gate (a send-back's rewrite, not research's fold): its fold is
// new work, not a returned Workflow's fold that always completes, so it needs a passed start gate
// in the session that folds it. Every other stage's fold reads a finished Workflow (KTD10).
const writeBehindStartGate = (step) => step.stage === "write" && step.gate === "start";
// Whether the step's last gate reading is a passed start gate of this session: a fold gate, a
// compaction or a hold read after it takes the clearance back, as it does for a launch.
const passedStart = (step, session) => {
  const g = step.gates[step.gates.length - 1];
  return Boolean(g && g.action === "start" && g.go && g.session === session);
};

function openStep(rec, stage, extra = {}) {
  const step = { n: rec.steps.length + 1, stage, openedAt: stamp(), before: stagedHash(rec), launches: [], gates: [], target: null, ledger: null, foldedAt: null, outcome: null, endedAt: null, ...extra };
  rec.steps.push(step);
  return step;
}

// Records a resolution: the same bytes as the latest one only add the session; anything else is a
// new entry, and a file whose bytes changed under one commit is named (Scope Boundaries' trigger).
function addResolution(rec, resolution, session) {
  checkResolution(resolution);
  const last = rec.ce.length ? rec.ce[rec.ce.length - 1] : null;
  if (last) {
    const prev = JSON.parse(readFileSync(join(rec.dir, last.file), "utf8"));
    if (sameResolution(prev, resolution)) {
      if (!last.sessions.includes(session)) last.sessions.push(session);
      return last;
    }
    const changed = changedInPlace(prev, resolution);
    if (changed.length) rec.warnings.push({ at: stamp(), what: `CE ${resolution.commit} changed in place since ${last.id}: ${changed.join(", ")}` });
  }
  const id = `C${rec.ce.length + 1}`;
  const file = `ce/${id}.json`;
  writeAtomic(join(rec.dir, file), `${JSON.stringify(resolution, null, 1)}\n`);
  const entry = { id, commit: resolution.commit, absent: resolution.absent, version: resolution.version, installPath: resolution.installPath, resolvedAt: resolution.resolvedAt, file, sessions: [session] };
  rec.ce.push(entry);
  return entry;
}

// ---------------------------------------------------------------- the session's own files

// The folder Claude Code keeps a session's helpers and saved Workflow results in:
// <projects>/<slug>/<session id>/. The main transcript sits beside it; a session can run with no
// transcript on disk (playbook-2, 2026-10-31), so the folder alone also counts.
export function sessionDir(sessionId, projectsDir = defaultProjectsDir()) {
  if (!existsSync(projectsDir)) return null;
  const slugs = readdirSync(projectsDir);
  for (const d of slugs) if (existsSync(join(projectsDir, d, `${sessionId}.jsonl`))) return join(projectsDir, d, sessionId);
  for (const d of slugs) if (existsSync(join(projectsDir, d, sessionId))) return join(projectsDir, d, sessionId);
  return null;
}

// The CLI version a session runs, from its own transcript's last row (a running session keeps
// the binary it started with, whatever an update has installed since).
export function cliOf(sessionId, projectsDir = defaultProjectsDir()) {
  const dir = sessionDir(sessionId, projectsDir);
  const file = dir ? `${dir}.jsonl` : null;
  if (!file || !existsSync(file)) return { cli: null, cliFrom: "no transcript for this session on disk" };
  const size = statSync(file).size;
  const len = Math.min(size, 256 * 1024);
  const buf = Buffer.alloc(len);
  const fd = openSync(file, "r");
  try {
    readSync(fd, buf, 0, len, size - len);
  } finally {
    closeSync(fd);
  }
  const lines = buf.toString("utf8").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(lines[i]);
      if (typeof o.version === "string" && o.version) return { cli: o.version, cliFrom: "the session's transcript" };
    } catch {
      // a line cut by the read's start, or a blank one
    }
  }
  return { cli: null, cliFrom: "the session's transcript names no version in its last 256 KB" };
}

// A Workflow's saved result: finished only when its status reads "completed" and it holds a result.
export function savedResultState(path) {
  if (!path) return { finished: false, why: "the launch never recorded its run id, so its saved result cannot be found" };
  if (!existsSync(path)) return { finished: false, why: `there is no saved result at ${path}` };
  let o;
  try {
    o = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { finished: false, why: `the saved result at ${path} does not parse: ${e.message}` };
  }
  if (o?.status !== "completed") return { finished: false, why: `the saved result at ${path} has status ${JSON.stringify(o?.status)}, not "completed"` };
  if (!("result" in o)) return { finished: false, why: `the saved result at ${path} holds no result` };
  return { finished: true, agentCount: Number.isInteger(o.agentCount) ? o.agentCount : null, runId: o.runId ?? null };
}

// ---------------------------------------------------------------- the stray sweep (KTD23)

// The project subtree's untracked and ignored files, repo-relative, each once.
export function looseFiles(gitRoot, projectRel) {
  const list = (extra) => git(gitRoot, ["ls-files", "-z", "--others", "--exclude-standard", ...extra, "--", literal(projectRel)]).split("\0").filter(Boolean);
  return [...new Set([...list([]), ...list(["--ignored"])])].sort();
}

const WRITE_TOOLS = { Write: "file_path", Edit: "file_path", MultiEdit: "file_path", NotebookEdit: "notebook_path" };
const SHELL_TOOLS = ["Bash", "PowerShell"];

// The slack around a call's own span, for clock steps between a transcript row and a file's stamp.
const SLACK_MS = 2000;

// Everything the helper transcripts in one folder wrote: each Write or Edit's path and each shell
// command's text, with the row's working folder and the call's window: its tool_use row's time
// minus the slack to its tool_result row's time plus the slack, paired by tool_use_id. A call
// missing either time has no window (null) and is never credited with a file. A folder with no
// transcript reads as none read, never as "wrote nothing".
export function helperTrail(transcriptDir) {
  if (!transcriptDir || !existsSync(transcriptDir)) return { transcripts: 0, writes: [], commands: [] };
  const files = readdirSync(transcriptDir).filter((f) => /^agent-.*\.jsonl$/.test(f)).sort();
  const writes = [];
  const commands = [];
  for (const f of files) {
    const calls = [];
    const ended = new Map();
    for (const line of readFileSync(join(transcriptDir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      const c = o?.message?.content;
      if (!Array.isArray(c)) continue;
      const at = Date.parse(o.timestamp ?? "");
      if (o.type === "user") {
        for (const b of c) if (b?.type === "tool_result" && typeof b.tool_use_id === "string") ended.set(b.tool_use_id, at);
        continue;
      }
      if (o.type !== "assistant") continue;
      for (const b of c) {
        if (b?.type !== "tool_use" || !b.input) continue;
        const row = { cwd: o.cwd ?? null, tool: b.name, id: b.id, transcript: f };
        const field = WRITE_TOOLS[b.name];
        if (field && typeof b.input[field] === "string") calls.push({ list: writes, at, entry: { path: b.input[field], ...row } });
        if (SHELL_TOOLS.includes(b.name) && typeof b.input.command === "string") calls.push({ list: commands, at, entry: { text: b.input.command, ...row } });
      }
    }
    for (const { list, at, entry } of calls) {
      const end = ended.get(entry.id);
      list.push({ ...entry, window: Number.isFinite(at) && Number.isFinite(end) ? { from: at - SLACK_MS, to: end + SLACK_MS } : null });
    }
  }
  return { transcripts: files.length, writes, commands };
}

const PATH_CHAR = /[A-Za-z0-9_.~\-\\/:]/;

// Whether `text` holds `spelling` as a whole path token: not inside a longer path or name.
function holdsToken(text, spelling, foldCase) {
  const hay = foldCase ? text.toLowerCase() : text;
  const needle = foldCase ? spelling.toLowerCase() : spelling;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) {
    const before = at === 0 ? "" : hay[at - 1];
    const after = hay[at + needle.length] ?? "";
    // A path cited at a sentence's end: a "." with no path character after it ends the token.
    const next = hay[at + needle.length + 1] ?? "";
    const sentenceEnd = after === "." && (!next || !PATH_CHAR.test(next));
    if ((!before || !PATH_CHAR.test(before)) && (!after || !PATH_CHAR.test(after) || after === ":" || sentenceEnd)) return true;
  }
  return false;
}

// The spellings a shell command could use for an absolute file path: both slashes, Git Bash's
// drive form, and relative to the command's working folder when the file sits below it.
function spellings(abs, cwd) {
  const fwd = abs.split("\\").join("/");
  const out = new Set([abs, fwd]);
  const drive = fwd.match(/^([A-Za-z]):\/(.*)$/);
  if (drive) out.add(`/${drive[1].toLowerCase()}/${drive[2]}`);
  if (cwd) {
    const rel = relative(cwd, abs);
    if (rel && below(rel)) {
      const fwd = rel.split("\\").join("/");
      out.add(rel);
      out.add(fwd);
      out.add(`./${fwd}`);
      out.add(`.\\${fwd.split("/").join("\\")}`);
    }
  }
  return [...out];
}

// The folders a command moves into before naming a file: each `cd <dir> &&` or `cd <dir>;` in it,
// read from the row's working folder (most helper commands start with one).
const CD = /(?:^|&&|;|\|\|)\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))\s*(?=&&|;)/g;
function cdBases(text, cwd, platform) {
  const out = [];
  for (const m of text.matchAll(CD)) {
    const dir = fromGitBash(untilde(m[1] ?? m[2] ?? m[3]), platform);
    if (isAbsolute(dir)) out.push(dir);
    else if (cwd) out.push(resolve(cwd, dir));
  }
  return out;
}

// The tools that change a file in place. Claude Code's Edit writes a new file over the old one
// (measured 2026-11-08: a new inode, and a birth at the Edit's moment), so the span of an Edit holds
// the birth of any file it touched, another session's included.
const EDIT_TOOLS = ["Edit", "MultiEdit", "NotebookEdit"];

// Which helper call wrote a file, or null: a Write or Edit naming its path, or a shell command
// naming it as a whole path token. Matching is by spelling, never by name alone, so another
// session's file of the same name elsewhere is never the run's. With `born` (the file's birth, in
// epoch ms) a call counts only when the birth falls inside its window, so a call that read a file
// made before it, or named a path filled in after it, is never its writer; a call with no window
// counts for nothing. Without `born` this is the spelling match alone. An Edit counts only when a
// helper call also created that path (a Write or a shell command naming it, at any time): its own
// span proves nothing about who made the file.
export function writerOf(abs, trail, { platform = process.platform, gitRoot, born } = {}) {
  const fold = platform === "win32";
  const during = (call) => born === undefined || (call.window != null && born >= call.window.from && born <= call.window.to);
  const pathOf = (w) => w.abs ?? longOf(resolve(w.cwd || gitRoot || ".", fromGitBash(w.path, platform)));
  const names = (c) => [c.cwd, ...cdBases(c.text, c.cwd, platform)].some((base) => spellings(abs, base).some((s) => holdsToken(c.text, s, fold)));
  const created = () => trail.writes.some((w) => !EDIT_TOOLS.includes(w.tool) && samePath(pathOf(w), abs, platform)) || trail.commands.some(names);
  for (const w of trail.writes) {
    if (!during(w) || !samePath(pathOf(w), abs, platform)) continue;
    if (EDIT_TOOLS.includes(w.tool) && !created()) continue;
    return { tool: w.tool, id: w.id, transcript: w.transcript };
  }
  for (const c of trail.commands) if (during(c) && names(c)) return { tool: c.tool, id: c.id, transcript: c.transcript };
  return null;
}

function snapshot(rec, launchId) {
  const files = looseFiles(rec.plan.gitRoot, rec.plan.projectRel);
  const file = `launches/${launchId}.before.json.gz`;
  writeAtomic(join(rec.dir, file), gzipSync(JSON.stringify(files)));
  return { before: file, count: files.length };
}

// The sweep after one launch: new loose files (absent from its snapshot) that its helpers wrote
// move to strays/<launch>/<repo path>; the others stay where they are and are listed as foreign.
const strayOf = (rec, l, rel) => join(rec.dir, "strays", l.id, ...rel.split("/"));
const noteDeleted = (rec, rel) => {
  if (!rec.strays.deleted.includes(rel)) rec.strays.deleted.push(rel);
};
const stuckLine = (stuck) => `${stuck.length} stray file${stuck.length === 1 ? "" : "s"} a helper wrote could not be moved and stay${stuck.length === 1 ? "s" : ""} in the tree: ${stuck.map((s) => `${s.path} (${s.error})`).join(", ")}`;
// The sweep's note: its standing notes, then the strays still stuck.
const noteOf = (sw) => [...(sw.notes ?? []), ...(sw.stuck?.length ? [stuckLine(sw.stuck)] : [])].join("; ") || undefined;
const recoveredLine = (recovered) => `recovered ${recovered.length} move${recovered.length === 1 ? "" : "s"} a dead sweep made: ${recovered.join(", ")}`;

// A file's identity for a later retry: its inode, and its birth where the volume keeps one (0 where
// it does not). A path can be emptied and filled again by another session; NTFS even gives a file
// made again within 15 seconds the old one's birth, but never its inode.
const identity = (st) => ({ ino: String(st.ino), birth: Number(st.birthtimeMs) });
const sameFile = (st, id) => st.isFile() && String(st.ino) === id.ino && (!id.birth || !Number(st.birthtimeMs) || Number(st.birthtimeMs) === id.birth);

// The files under strays/<launch>/ the record does not name: moves a sweep made before it died
// short of its record write. They are recorded now, never lost from the receipt.
function recoverMoves(rec, l) {
  const root = join(rec.dir, "strays", l.id);
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (lstatSync(p).isDirectory()) walk(p);
      else found.push(relative(root, p).split(sep).join("/"));
    }
  };
  if (existsSync(root)) walk(root);
  const recovered = found.filter((rel) => !rec.strays.deleted.includes(rel));
  for (const rel of recovered) noteDeleted(rec, rel);
  return recovered;
}

// A move into the run folder, its failure caught: a locked file stays where it is, named with its
// identity, so a retry moves that file and no other.
function tryMove(rec, l, rel, by, id) {
  try {
    moveFile(join(rec.plan.gitRoot, ...rel.split("/")), strayOf(rec, l, rel));
    noteDeleted(rec, rel);
    return null;
  } catch (e) {
    return { path: rel, by, error: e.code ?? e.message, ...id };
  }
}

// A swept launch's stuck strays, moved again (a restart runs this, maybe days later): the very file
// the sweep found moves now if it is free. A path gone from the tree, a file that is not the one the
// sweep found, or one committed since stays where it is and drops out, with a note.
function retryStuck(rec, l) {
  const still = [];
  const notes = l.sweep.notes ?? [];
  for (const s of l.sweep.stuck) {
    let st = null;
    try {
      st = lstatSync(join(rec.plan.gitRoot, ...s.path.split("/")), { bigint: true });
    } catch {
      // gone from the tree
    }
    if (!st) notes.push(`${s.path}, stuck at the sweep, left the tree before a retry moved it`);
    else if (!s.ino || !sameFile(st, s)) notes.push(`${s.path} is not the file the sweep found (replaced since): it stays where it is`);
    else if (git(rec.plan.gitRoot, ["ls-files", "--error-unmatch", "--", literal(s.path)], { quiet: [1] }) !== null) notes.push(`${s.path} was committed since the sweep: it stays where it is`);
    else {
      const failed = tryMove(rec, l, s.path, s.by, { ino: s.ino, birth: s.birth });
      if (failed) still.push(failed);
      else l.sweep.deleted.push({ path: s.path, by: s.by });
    }
  }
  l.sweep.stuck = still;
  l.sweep.notes = notes;
  l.sweep.note = noteOf(l.sweep);
  return l.sweep;
}

function sweep(rec, l) {
  // Moves a sweep or a retry made before it died short of its record write, recorded first.
  const recovered = recoverMoves(rec, l);
  if (l.sweep.done) {
    if (recovered.length) {
      l.sweep.deleted.push(...recovered.map((path) => ({ path, by: null, recovered: true })));
      l.sweep.stuck = (l.sweep.stuck ?? []).filter((s) => !recovered.includes(s.path));
      l.sweep.notes = [...(l.sweep.notes ?? []), recoveredLine(recovered)];
    }
    if (l.sweep.stuck?.length) return retryStuck(rec, l);
    l.sweep.note = noteOf(l.sweep);
    return l.sweep;
  }
  const notes = recovered.length ? [recoveredLine(recovered)] : [];
  let before;
  try {
    before = new Set(JSON.parse(gunzipSync(readFileSync(join(rec.dir, l.sweep.before))).toString("utf8")));
  } catch (e) {
    // With no snapshot no file can be told new, so nothing moves.
    notes.push(`the snapshot ${l.sweep.before} is missing or unreadable (${e.code ?? e.message}), so no new file could be told apart and nothing was moved`);
    l.sweep = { ...l.sweep, done: true, at: stamp(), transcripts: null, helpers: l.agentCount ?? null, fresh: null, deleted: recovered.map((path) => ({ path, by: null, recovered: true })), foreign: [], stuck: [], notes, note: notes.join("; ") };
    return l.sweep;
  }
  const fresh = looseFiles(rec.plan.gitRoot, rec.plan.projectRel).filter((f) => !before.has(f));
  const raw = helperTrail(l.transcriptDir);
  // Each Write or Edit path resolved once, not once per new file.
  const trail = { ...raw, writes: raw.writes.map((w) => ({ ...w, abs: longOf(resolve(w.cwd || rec.plan.gitRoot, fromGitBash(w.path))) })) };
  const deleted = recovered.map((path) => ({ path, by: null, recovered: true }));
  const foreign = [];
  const stuck = [];
  let planNote = null;
  for (const rel of fresh) {
    const abs = join(rec.plan.gitRoot, ...rel.split("/"));
    let st = null;
    try {
      st = lstatSync(abs, { bigint: true });
    } catch {
      // gone again since the listing
    }
    // The plan's own path never moves: landing's KTD3 check must see whatever is there.
    if (samePath(abs, rec.plan.path)) {
      foreign.push(rel);
      planNote = `${rel}, the plan's own path, is new since the launch: it stays where it is, so landing's path check sees it`;
      continue;
    }
    // A file's birth (its mtime where the volume keeps no birth time) dates it against each call.
    const born = st ? Number(st.birthtimeMs) || Number(st.mtimeMs) : undefined;
    const by = st && !st.isDirectory() ? writerOf(abs, trail, { gitRoot: rec.plan.gitRoot, born }) : null;
    if (!by) {
      foreign.push(rel);
      continue;
    }
    const failed = tryMove(rec, l, rel, by, identity(st));
    if (failed) stuck.push(failed);
    else deleted.push({ path: rel, by });
  }
  if (trail.transcripts === 0) notes.push("no helper transcript was read, so no new file could be attributed to this launch");
  else if (Number.isInteger(l.agentCount) && trail.transcripts !== l.agentCount) notes.push(`read ${trail.transcripts} helper transcripts of the ${l.agentCount} the saved result counts`);
  // `notes` keeps the standing ones, so a retry of stuck strays can rebuild the note.
  l.sweep = { ...l.sweep, done: true, at: stamp(), transcripts: trail.transcripts, helpers: l.agentCount ?? null, fresh: fresh.length, deleted, foreign, stuck, notes, ...(planNote ? { planNote } : {}) };
  const note = noteOf(l.sweep);
  if (note) l.sweep.note = note;
  return l.sweep;
}

// ---------------------------------------------------------------- the commands

function readJsonArg(v, what) {
  if (v === undefined) fail(`${what} is required`);
  if (v !== null && typeof v === "object") return v;
  if (typeof v === "string") {
    const p = typedPath(v);
    if (!existsSync(p)) fail(`${what} names no file at ${p}`);
    return JSON.parse(readFileSync(p, "utf8"));
  }
  fail(`${what} is an object or a path to a .json file, got ${JSON.stringify(v)}`);
}

// KTD3's start check, then a new run: its folder, its CE resolution, the brief, under `update` the
// staged plan as HEAD's committed file, and its first step. An unfinished run for the same plan
// refuses: resume it instead.
export function start(input = {}, { now = new Date(), projectsDir = defaultProjectsDir(), cwd = process.cwd() } = {}) {
  const session = sessionOf(input);
  const update = input.update;
  if (typeof update !== "boolean") fail(`update must be true or false, got ${JSON.stringify(update)}`);
  const loc = locate({ plan: input.plan, job: input.job, cwd, projectsDir });
  if (loc.resume) return { ok: false, reason: `an unfinished run for this plan exists at ${loc.resume}: resume it (restart) rather than start another`, resume: loc.resume };
  const facts = pathFacts(fromGitBash(untilde(input.plan)), { cwd });
  const check = startCheck(facts, { update });
  if (!check.ok) return { ok: false, reason: check.reason, state: check.state };
  if (!loc.jobFolder) fail(loc.reason);
  const rel = relative(facts.gitRoot, loc.jobFolder);
  if (!rel || below(rel)) return { ok: false, reason: `the job folder ${loc.jobFolder} is inside the repository at ${facts.gitRoot}: the run writes only outside the tree until landing (KTD23)` };
  // The base is read before any folder is made, so a refusal leaves nothing behind.
  const projectTree = git(facts.gitRoot, ["rev-parse", "--verify", "--quiet", `HEAD:${facts.projectRel}`], { quiet: [1, 128] });
  if (!projectTree) return { ok: false, reason: `${facts.projectRel} is not in HEAD: commit the project first, since the run records its committed tree as its base (KTD23)` };
  const base = { commit: git(facts.gitRoot, ["rev-parse", "HEAD"]), projectTree };
  let briefText = null;
  if (input.brief !== undefined && input.brief !== null) {
    const p = typedPath(input.brief, cwd);
    if (!existsSync(p)) fail(`the brief names no file at ${p}`);
    briefText = readFileSync(p, "utf8");
  }
  const first = firstStage({ update, brief: briefText });
  const t = stamp(now);
  let runName = t.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  for (let i = 2; existsSync(join(loc.jobFolder, runName)); i++) runName = `${t.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}-${i}`;
  const dir = join(loc.jobFolder, runName);
  mkdirSync(dir, { recursive: true });
  const rec = {
    kind: KIND, version: VERSION, startedAt: t, dir, job: loc.jobFolder, update,
    plan: { path: facts.path, rel: facts.rel, gitRoot: facts.gitRoot, projectRel: facts.projectRel, projectRoot: facts.projectRoot },
    base,
    start: check.state, createPlansFolder: check.createPlansFolder,
    brief: null, contractBrief: null, risk: null, lenses: null, lensesCe: null, external: null, council: [], parks: [], handBack: null,
    sendBacks: 0, sessions: [{ id: session, at: t }], ce: [], steps: [], launches: [],
    state: "running", windowStop: null, end: null, moved: undefined, landing: null, closed: null, strays: { deleted: [] }, warnings: [],
  };
  Object.defineProperty(rec, "_path", { value: join(dir, RECORD), enumerable: false });
  addResolution(rec, resolveCe({ ...registryOf(input, cwd), now }), session);
  if (briefText !== null) {
    writeAtomic(join(dir, "brief.md"), briefText);
    rec.brief = { file: "brief.md", sha256: sha256(Buffer.from(briefText, "utf8")) };
  }
  // Under update the staged plan starts as HEAD's committed bytes (KTD3), the blob itself.
  if (update) writeAtomic(stagedPath(rec), git(facts.gitRoot, ["cat-file", "blob", facts.headBlob], { buffer: true }));
  openStep(rec, first.stage, { gate: first.gate });
  save(rec);
  return { ok: true, record: rec._path, dir, stage: first.stage, gate: first.gate, reason: first.reason, ce: join(dir, latestCe(rec).file), staged: stagedPath(rec) };
}

const NOTES = {
  contractBrief: { once: true, check: (v) => typeof v === "string" && v.trim() },
  // The deepen's risk profile, kept on each deepen step; the latest stands for the run, since a
  // send-back's second deepen scores a rewritten plan.
  risk: { deepen: true, check: (v) => v && typeof v === "object" && !Array.isArray(v) },
  lenses: { once: true, check: (v) => Array.isArray(v) && v.every((x) => x && typeof x.lens === "string" && typeof x.reason === "string" && x.reason.trim()) },
  external: { once: true, check: (v) => v && typeof v === "object" && typeof v.reason === "string" && v.reason.trim() },
  council: { list: true, check: (v) => v && typeof v === "object" && !Array.isArray(v) },
  parks: { list: true, check: (v) => typeof v === "string" && v.trim() },
  handBack: { check: (v) => typeof v === "string" && v.trim() },
};

// One fact the run keeps: the contract brief (KTD22), the risk profile (KTD5), the lens picks with
// their reasons (KTD6), the external-research call with its reason (KTD4), a council row or a park's
// question (KTD11), the handed-back START HERE line (KTD23). A once-only fact is never rewritten,
// so a restart cannot quietly replace what earlier stages ran on.
export function note(rec, input) {
  writable(rec, sessionOf(input));
  const spec = NOTES[input.key];
  if (!spec) fail(`note has no key ${JSON.stringify(input.key)} (one of: ${Object.keys(NOTES).join(", ")})`);
  if (!spec.check(input.value)) fail(`note ${input.key} got a value of the wrong shape: ${JSON.stringify(input.value)}`);
  if (spec.once && rec[input.key] !== null) fail(`${input.key} is already recorded, and an earlier stage ran on it`);
  // A park noted again (a restart replaying its note) is the same question, kept once.
  if (input.key === "parks" && rec.parks.includes(input.value)) return { ok: true, key: input.key, skipped: true };
  if (spec.deepen) {
    const step = currentStep(rec);
    if (step.stage !== "deepen") fail(`${input.key} is the deepen's score: note it while a deepen step is current (step ${step.n} is ${step.stage})`);
    step[input.key] = input.value;
  }
  if (spec.list) rec[input.key].push(input.value);
  else rec[input.key] = input.value;
  // The lens picks are the main loop's read of persona-selection.md, on the CE it holds now.
  if (input.key === "lenses") rec.lensesCe = latestCe(rec).id;
  save(rec);
  return { ok: true, key: input.key };
}

// flow.mjs's window gate for the current step, recorded with its reading (a "Context (TEST" line
// marked as a test reading, KTD10). A held start leaves the run open as a window stop that hands
// back this stage.
export function gate(rec, input) {
  const session = sessionOf(input);
  writable(rec, session);
  const step = currentStep(rec);
  const action = input.action ?? "start";
  const planBytes = PLANLESS.includes(step.stage) || action === "fold" ? undefined : existsSync(stagedPath(rec)) ? statSync(stagedPath(rec)).size : fail(`${step.stage} reads the staged plan, and there is none at ${stagedPath(rec)}`);
  const g = stageGate({ line: input.line, action, stage: step.stage, planBytes, costs: input.costs ?? loadStageCosts() });
  // launchesBefore ties a passed start gate to the launch it clears: launch() needs one per launch.
  // The reading is this session's own window, so a gate clears work in this session only.
  step.gates.push({ at: stamp(), session, action, line: input.line ?? null, go: g.go, step: g.step, test: g.test === true, reason: g.reason, launchesBefore: step.launches.length });
  if (g.step === "window-stop") {
    rec.state = "window-stop";
    rec.windowStop = { stage: step.stage, reason: g.reason, at: stamp() };
  } else if (g.go) {
    rec.state = "running";
    rec.windowStop = null;
  }
  save(rec);
  return g;
}

// A Workflow launch, written before the Workflow starts: its script and sha256, its exact args, the
// relayed user text (KTD22), the session and its CLI version, and the stray snapshot.
export function launch(rec, input, { projectsDir = defaultProjectsDir() } = {}) {
  const session = sessionOf(input);
  writable(rec, session);
  if (rec.state !== "running") fail(`the run is a window stop: run the gate again before launching`);
  if (rec.end) fail("the run has reached its landing; it launches nothing more");
  const step = currentStep(rec);
  if (!WORKFLOW_STAGES.includes(step.stage)) fail(`${step.stage} runs no Workflow`);
  if (step.target !== null) fail(`step ${step.n}'s fold has landed; it launches nothing more`);
  // KTD10: the window gate runs before every Workflow launch, a resumed one included.
  const g = step.gates[step.gates.length - 1];
  if (!g || g.action !== "start" || !g.go || g.launchesBefore !== step.launches.length || g.session !== session) fail(`no passed window gate in this session since step ${step.n}'s last launch: run the gate before every launch (KTD10)`);
  if (!("relayed" in input) || (input.relayed !== null && typeof input.relayed !== "string")) fail(`relayed is the user text the Workflow's helpers receive, or null for none (KTD22)`);
  const script = typedPath(String(input.script ?? ""));
  if (!input.script || !existsSync(script) || !statSync(script).isFile()) fail(`the script names no file: ${JSON.stringify(input.script)}`);
  const args = readJsonArg(input.args, "args");
  if (input.seats !== undefined && !(Array.isArray(input.seats) && input.seats.every((s) => typeof s === "string" && s.trim()))) fail("seats is a list of seat keys");
  if (input.resumeOf !== undefined && !step.launches.includes(input.resumeOf)) fail(`resumeOf names ${JSON.stringify(input.resumeOf)}, which is no launch of step ${step.n}`);
  const id = `L${rec.launches.length + 1}`;
  const argsFile = `launches/${id}.args.json`;
  const argsText = `${JSON.stringify(args, null, 1)}\n`;
  writeAtomic(join(rec.dir, argsFile), argsText);
  const entry = {
    id, step: step.n, stage: step.stage, ce: latestCe(rec).id, session, pid: procOf(input), launchedAt: stamp(), ...cliOf(session, projectsDir),
    script, scriptSha256: fileSha(script), args: argsFile, argsSha256: sha256(Buffer.from(argsText, "utf8")),
    relayed: input.relayed, seats: input.seats ?? null, resumeOf: input.resumeOf ?? null,
    runId: null, savedResult: null, transcriptDir: null, completedAt: null, status: null, agentCount: null,
    sweep: { ...snapshot(rec, id), done: false },
  };
  rec.launches.push(entry);
  step.launches.push(id);
  save(rec);
  return { ok: true, launch: id, args: join(rec.dir, argsFile), script };
}

const launchOf = (rec, id) => rec.launches.find((l) => l.id === id) ?? fail(`no launch ${JSON.stringify(id)} in this run`);

// The Workflow's run id, as soon as the tool returns it, with the paths that follow from it.
export function launched(rec, input, { projectsDir = defaultProjectsDir() } = {}) {
  writable(rec, sessionOf(input));
  const l = launchOf(rec, input.launch);
  if (typeof input.runId !== "string" || !RUN_ID.test(input.runId)) fail(`a Workflow run id reads like wf_e04ebb7e-65b, got ${JSON.stringify(input.runId)}`);
  if (l.runId !== null && l.runId !== input.runId) fail(`${l.id} already recorded run ${l.runId}`);
  const dir = sessionDir(l.session, projectsDir);
  l.runId = input.runId;
  l.savedResult = dir ? join(dir, "workflows", `${input.runId}.json`) : null;
  l.transcriptDir = dir ? join(dir, "subagents", "workflows", input.runId) : null;
  if (!dir) l.pathsNote = `no folder for session ${l.session} under ${projectsDir}`;
  save(rec);
  return { ok: true, launch: l.id, runId: l.runId, savedResult: l.savedResult, transcriptDir: l.transcriptDir };
}

// A launch's saved-result path, found again when its session folder appeared after `launched`
// (a session can run with no transcript on disk at first).
function findResult(l, projectsDir) {
  if (l.savedResult === null && l.runId !== null) {
    const dir = sessionDir(l.session, projectsDir);
    if (dir) {
      l.savedResult = join(dir, "workflows", `${l.runId}.json`);
      l.transcriptDir = join(dir, "subagents", "workflows", l.runId);
      delete l.pathsNote;
    }
  }
  return l.savedResult;
}

const strayAnswer = (sw) => ({ deleted: sw.deleted.map((d) => d.path), foreign: sw.foreign.length, stuck: (sw.stuck ?? []).map((s) => s.path), note: sw.note ?? null });

// A launch's completion: its saved result's state, then its stray sweep. A launch whose Workflow
// call failed (the tool refused it, so no run id came back) is closed with `notStarted`, the tool's
// error: its sweep has no transcripts to read, so it moves nothing.
export function complete(rec, input, { projectsDir = defaultProjectsDir() } = {}) {
  writable(rec, sessionOf(input));
  const l = launchOf(rec, input.launch);
  if ("notStarted" in input) {
    if (typeof input.notStarted !== "string" || !input.notStarted.trim()) fail("notStarted is the Workflow tool's error for a call that never started");
    if (l.runId !== null) fail(`${l.id} recorded run ${l.runId}, so its Workflow started: run complete once it finishes`);
    l.completedAt = stamp();
    l.status = `never started: ${input.notStarted.trim()}`;
    const sw = sweep(rec, l);
    save(rec);
    return { ok: true, launch: l.id, finished: false, why: l.status, savedResult: null, strays: strayAnswer(sw) };
  }
  if (l.runId === null) fail(`${l.id} has no run id: record it with launched first, or close it with notStarted when its Workflow call failed`);
  if (findResult(l, projectsDir) === null) fail(`the session folder for ${l.session} is missing under ${projectsDir}, so ${l.id}'s saved result cannot be found`);
  if (!existsSync(l.savedResult)) fail(`${l.id}'s Workflow has no saved result yet at ${l.savedResult}: it has not finished`);
  const s = savedResultState(l.savedResult);
  l.completedAt = stamp();
  l.status = s.finished ? "completed" : s.why;
  l.agentCount = s.agentCount ?? null;
  const sw = sweep(rec, l);
  save(rec);
  return { ok: true, launch: l.id, finished: s.finished, why: s.why ?? null, savedResult: l.savedResult, strays: strayAnswer(sw) };
}

// The step's newest launch whose Workflow finished, by its saved result.
function finishedLaunch(rec, step) {
  for (const id of [...step.launches].reverse()) {
    const l = launchOf(rec, id);
    if (savedResultState(l.savedResult).finished) return l;
  }
  return null;
}

// The staged plan against the step's hashes: "before", "target" or null for neither.
function stagedAt(rec, step) {
  const h = stagedHash(rec);
  if (step.target !== null && h === step.target) return "target";
  if (h === step.before) return "before";
  return null;
}
const hashes = (rec, step) => `the staged plan reads ${stagedHash(rec) ?? "absent"}; step ${step.n} (${step.stage}) recorded before ${step.before ?? "absent"}${step.target !== null ? ` and target ${step.target}` : ""}`;

// At the landing the staged plan must be what the last step left (its target when its fold landed,
// else its before hash): a fold made after the last check would otherwise land as checked. Null
// when it is, else the refusal naming both.
function landedDrift(rec) {
  const step = currentStep(rec);
  const want = step.target ?? step.before;
  const now = stagedHash(rec);
  if (now === want) return null;
  return `the staged plan changed since step ${step.n} (${step.stage}), the last before the landing: it reads ${now ?? "absent"}, and that step left ${want ?? "absent"}`;
}

// The start of a fold: a leftover working file is deleted, and the staged plan, still at the step's
// before hash, is copied to the working file the main loop edits.
export function foldStart(rec, input) {
  const session = sessionOf(input);
  writable(rec, session);
  if (rec.end) fail("the run has reached its landing; it folds nothing more");
  if (rec.state !== "running") fail("the run is a window stop: run the gate again before folding");
  const step = currentStep(rec);
  if (step.stage === "brief") fail("the brief stage has no fold");
  if (writeBehindStartGate(step) && !passedStart(step, session)) fail(`step ${step.n}'s write rewrites the plan after a send-back, so it starts behind a start gate: run the gate in this session first (KTD10)`);
  const removed = existsSync(workingPath(rec));
  if (removed) unlinkSync(workingPath(rec));
  const at = stagedAt(rec, step);
  if (at === "target") fail(`step ${step.n}'s fold has landed (the staged plan is at its target): advance instead`);
  if (at !== "before") fail(`the staged plan matches neither hash: ${hashes(rec, step)}`);
  const from = foldSource(rec, step);
  if (!from) fail(`step ${step.n} (${step.stage}) has no finished Workflow to fold from`);
  if (existsSync(stagedPath(rec))) copyFileSync(stagedPath(rec), workingPath(rec));
  save(rec);
  return { ok: true, working: workingPath(rec), staged: stagedPath(rec), before: step.before, savedResult: from?.savedResult ?? null, removedLeftover: removed };
}

function lastFinishedBefore(rec, step) {
  for (const s of rec.steps.slice(0, step.n - 1).reverse()) {
    const l = finishedLaunch(rec, s);
    if (l) return l;
  }
  return null;
}

// The launch whose saved result a step's fold reads: a write folds the last finished Workflow
// before it (research's dossiers, or the deepen whose premise finding sent the plan back), every
// other stage its own newest finished launch. Null when none is readable.
const foldSource = (rec, step) => (step.stage === "write" ? lastFinishedBefore(rec, step) : finishedLaunch(rec, step));

// The end of a fold: the working file's hash is recorded as the step's target, with its applied
// ids as the step's ledger entry, in one record write just before the rename that lands it; a fold
// that re-runs rewrites both. A crash at any point leaves the staged plan at its before hash or its
// target (KTD9).
export function foldLand(rec, input) {
  writable(rec, sessionOf(input));
  if (rec.end) fail("the run has reached its landing; it folds nothing more");
  const step = currentStep(rec);
  const ids = input.ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string" || !x.trim())) fail("ids is the list of ledger ids this fold applied");
  const clean = ids.map((x) => x.trim());
  if (new Set(clean).size !== clean.length) fail("ids names one ledger id twice");
  if (clean.length === 0 && step.stage !== "write") fail(`a ${step.stage} fold applies at least one id; with none there is no fold to land (advance with zero changes)`);
  if (!existsSync(workingPath(rec))) fail(`there is no working file at ${workingPath(rec)}: run fold-start first`);
  if (stagedHash(rec) !== step.before) fail(`the staged plan is not at step ${step.n}'s before hash: ${hashes(rec, step)}`);
  const target = fileSha(workingPath(rec));
  // A fold that changed no byte would make its target its before hash, and a restart could not
  // tell a landed fold from an unlanded one.
  if (target === step.before) fail("the working file is identical to the staged plan: the fold changed nothing, so there is nothing to land");
  step.target = target;
  step.ledger = clean;
  step.foldedAt = stamp();
  // The write's fold is research's work done by the main loop, on the CE it holds now.
  if (step.stage === "write") step.foldCe = latestCe(rec).id;
  save(rec);
  renameRetry(workingPath(rec), stagedPath(rec));
  if (stagedHash(rec) !== step.target) fail(`the staged plan reads ${stagedHash(rec)} after the rename, not the target ${step.target}`);
  return { ok: true, target: step.target, ledger: step.ledger };
}

// A stage boundary: the step's outcome goes to flow.mjs's nextStep with the recorded send-back
// count, and the answer is recorded: a new step for the next stage, the landing, or a blocked close.
export function advance(rec, input, { cwd = process.cwd() } = {}) {
  const session = sessionOf(input);
  writable(rec, session);
  const step = currentStep(rec);
  if (rec.end) fail("the run has reached its landing; land it");
  // /brief runs in the main loop, so, like a launch, it runs behind a start gate of this session.
  if (step.stage === "brief" && !passedStart(step, session)) fail("/brief runs in the main loop, so the brief starts behind a start gate: run the gate in this session, then /brief, then advance (KTD10)");
  const at = stagedAt(rec, step);
  if (step.target !== null && at !== "target") fail(`step ${step.n}'s fold has not landed: ${hashes(rec, step)}`);
  if (step.target === null && at !== "before") fail(`the staged plan moved outside a fold: ${hashes(rec, step)}`);
  if (WORKFLOW_STAGES.includes(step.stage) && !finishedLaunch(rec, step)) fail(`step ${step.n} (${step.stage}) has no finished Workflow: its outcome cannot be read`);
  // A launch's strays are swept before its outcome is used (KTD23).
  const unswept = step.launches.filter((id) => !launchOf(rec, id).sweep.done);
  if (unswept.length) fail(`step ${step.n}'s launch ${unswept.join(", ")} has not been swept: run complete for it first`);
  if (step.stage === "write" && step.target === null) fail("the write has not landed a staged plan (fold-land)");
  if (step.stage === "deepen") {
    // A landed fold deepened sections, so an outcome that deepened nothing contradicts it.
    if (step.target !== null && ["passed", "park", "premise-goal"].includes(input.outcome)) fail(`step ${step.n}'s fold landed, so its outcome cannot be ${input.outcome}`);
    // The check's lenses are picked from the deepen's risk profile (KTD5, KTD6), so a deepen that
    // scored the plan has its own before its outcome counts.
    if (["passed", "park", "deepened"].includes(input.outcome) && !step.risk) fail(`step ${step.n}'s deepen scored the plan: note risk (its risk profile) before its outcome, since the check's lenses are picked from it (KTD5, KTD6)`);
  }
  if (step.stage === "check-1") {
    const applied = step.ledger?.length ?? 0;
    if (input.changes !== applied) fail(`check round 1's changes must equal the ${applied} id${applied === 1 ? "" : "s"} its fold's ledger applied, got ${JSON.stringify(input.changes)}`);
  }
  // Round 2 folds each P0 or P1 it confirms: a count with no landed fold would land them unfixed.
  if (step.stage === "check-2" && Number.isInteger(input.p0p1) && input.p0p1 > 0 && step.target === null) fail(`check round 2 confirmed ${input.p0p1} P0 or P1 finding${input.p0p1 === 1 ? "" : "s"}, each folded, and its fold has not landed (fold-land)`);
  if (step.stage === "brief") {
    if (typeof input.brief !== "string") fail("the brief stage ends with the path of the brief /brief wrote");
    const p = typedPath(input.brief, cwd);
    if (!existsSync(p)) fail(`the brief names no file at ${p}`);
    const text = readFileSync(p, "utf8");
    if (!text.trim()) fail("the brief is empty");
    writeAtomic(join(rec.dir, "brief.md"), text);
    rec.brief = { file: "brief.md", sha256: sha256(Buffer.from(text, "utf8")) };
  }
  const next = nextStep({ stage: step.stage, outcome: input.outcome, sendBacks: rec.sendBacks, changes: input.changes, p0p1: input.p0p1, open: input.open });
  step.outcome = input.outcome;
  step.endedAt = stamp();
  step.next = next.step;
  rec.sendBacks = next.sendBacks;
  if (next.step === "blocked") close(rec, "blocked", next.reason);
  else if (next.step === "land") rec.end = { open: next.open, reason: next.reason, at: stamp() };
  else {
    // A park's relaunch runs without the premise seat on the parked deepen's scores, its risk
    // profile included (KTD5, KTD11); any other deepen scores a plan no profile has read yet.
    if (next.step === "deepen" && !next.skipPremise) rec.risk = null;
    openStep(rec, next.step, { gate: next.gate, ...(next.skipPremise ? { skipPremise: true, scoresFrom: finishedLaunch(rec, step)?.savedResult ?? null, risk: step.risk ?? null } : {}), ...(next.parked ? { parked: true } : {}) });
  }
  save(rec);
  return { ...next, stepNumber: currentStep(rec).n, state: rec.state };
}

// A closed run's reason; a blocked one is also handed back (KTD23).
function close(rec, as, reason, extra = {}) {
  rec.state = as;
  rec.closed = { as, reason, at: stamp(), ...extra };
  if (as === "blocked") rec.handBack = `blocked: ${reason}`;
}

// A blocked report from the main loop: the run closes, and its reason is handed back.
export function block(rec, input) {
  writable(rec, sessionOf(input));
  if (typeof input.reason !== "string" || !input.reason.trim()) fail("a blocked run names its reason");
  dropTemp(rec);
  close(rec, "blocked", input.reason.trim());
  save(rec);
  return { ok: true, state: rec.state };
}

// A later session's way back in (KTD10): CE resolved again, every launch that was never swept is
// swept, a leftover working file is deleted, and the next action is read from the step's hashes and
// its Workflow's saved result.
export function restart(input = {}, { projectsDir = defaultProjectsDir(), cwd = process.cwd() } = {}) {
  const session = sessionOf(input);
  let path = input.record;
  if (!path) {
    const loc = locate({ plan: input.plan, job: input.job, cwd, projectsDir });
    if (!loc.resume) return { ok: true, action: "new", reason: loc.jobFolder ? "no unfinished run for this plan: start a new one" : loc.reason, jobFolder: loc.jobFolder, closed: loc.closed };
    path = loc.resume;
  }
  const rec = loadRecord(path);
  writable(rec, session);
  for (const l of rec.launches) findResult(l, projectsDir);
  // A launch this process made with no saved result yet may still be running in the background:
  // sweeping it would move files its helpers are writing, and re-running it would run it twice. A
  // launch another process made under this session id (a resumed session) died with that process.
  // This answers before CE is resolved again: a wait resolves nothing, so the next launch is
  // credited to the resolution its args were built from.
  const pid = procOf(input);
  const live = rec.launches.filter((l) => !l.sweep.done && l.session === session && (l.pid == null || pid === null || l.pid === pid) && !existsSync(l.savedResult ?? ""));
  if (live.length) {
    save(rec);
    const ids = live.map((l) => l.id);
    const one = ids.length === 1;
    return { ok: true, action: "wait", record: rec._path, live: ids, ...premiseOf(currentStep(rec)), reason: `${ids.join(", ")} ${one ? "was" : "were"} launched by this process and ${one ? "has" : "have"} no saved result, so ${one ? "it" : "they"} may still be running: wait for the completion notice, then run complete. A launch whose Workflow call failed, with no run id, is closed by complete with notStarted` };
  }
  const ce = addResolution(rec, resolveCe(registryOf(input, cwd)), session);
  // The session that launched them is gone, so every launch it never swept is swept now, and a
  // stray a sweep could not move is tried again.
  const swept = [];
  for (const l of rec.launches) {
    if (l.sweep.done && !l.sweep.stuck?.length) continue;
    const s = savedResultState(l.savedResult);
    if (l.status === null) {
      l.status = s.finished ? "completed" : `never completed: ${s.why}`;
      // As complete does: the sweep counts the transcripts it read against the helpers that ran.
      l.agentCount = s.agentCount ?? null;
    }
    sweep(rec, l);
    swept.push(l.id);
  }
  const removed = existsSync(workingPath(rec));
  if (removed) unlinkSync(workingPath(rec));
  // Every answer, a stop included, carries a park relaunch's skipPremise, parked and scoresFrom.
  const base = { ok: true, record: rec._path, ce: join(rec.dir, ce.file), commit: ce.commit, swept, removedLeftover: removed, ...premiseOf(currentStep(rec)) };
  const done = (answer) => {
    save(rec);
    return { ...base, ...answer };
  };
  if (rec.end) {
    const drift = landedDrift(rec);
    if (drift) {
      save(rec);
      return { ...base, ok: false, action: "stop", reason: `${drift}, so the run stops` };
    }
    return done({ action: "land", reason: "the run reached its landing: land-check, receipt-fields, then land", open: rec.end.open });
  }
  const step = currentStep(rec);
  const at = stagedAt(rec, step);
  if (at === null) {
    save(rec);
    return { ...base, ok: false, action: "stop", reason: `the staged plan matches neither recorded hash, so the run stops: ${hashes(rec, step)}`, step: step.n, stage: step.stage };
  }
  // The outcome may live in the saved result the fold read (check round 2's P0/P1 count does).
  if (at === "target") return done({ action: "advance", step: step.n, stage: step.stage, reason: `step ${step.n}'s fold landed (the staged plan is at its target): record ${step.stage}'s outcome`, savedResult: foldSource(rec, step)?.savedResult ?? null });
  // From here the staged plan is at the step's before hash, and any fold re-runs from it.
  const from = step.stage === "brief" ? null : foldSource(rec, step);
  const unlanded = step.target !== null ? `step ${step.n}'s target was recorded but its rename never landed: ` : "";
  if (step.stage === "write") {
    // A write folds the Workflow before it, which never relaunches: with its result gone the run stops.
    if (!from) {
      save(rec);
      return { ...base, ok: false, action: "stop", reason: `${unlanded}step ${step.n}'s write folds the saved result of the Workflow before it, and none is readable, so the run stops`, step: step.n, stage: step.stage };
    }
    // A send-back's write re-runs behind a start gate of this session.
    if (writeBehindStartGate(step)) return done({ action: "start", step: step.n, stage: step.stage, reason: "a send-back's write rewrites the plan: run the gate in this session, then fold (KTD10)", savedResult: from.savedResult });
    return done({ action: "fold", step: step.n, stage: step.stage, reason: `${unlanded}write the staged plan from the saved result; research never relaunches`, savedResult: from.savedResult });
  }
  if (step.target !== null) {
    if (from) return done({ action: "fold", step: step.n, stage: step.stage, reason: `${unlanded}the fold re-runs from the before hash and rewrites its ledger entry`, savedResult: from.savedResult });
    // The saved result the recorded fold read is gone, so the fold cannot re-run: the stage does.
    Object.assign(step, { target: null, ledger: null, foldedAt: null });
  }
  if (step.stage === "brief") return done({ action: "start", step: step.n, stage: step.stage, reason: "the brief has not been recorded: run the gate in this session, then /brief, then advance with its path" });
  if (step.launches.length === 0) return done({ action: "start", step: step.n, stage: step.stage, reason: `${step.stage} has not launched: run the gate, then launch it` });
  const fin = finishedLaunch(rec, step);
  if (fin) {
    return done(step.stage === "research"
      ? { action: "advance", step: step.n, stage: step.stage, reason: "research's Workflow finished: advance to the write, which folds its saved result", savedResult: fin.savedResult }
      : { action: "fold", step: step.n, stage: step.stage, reason: `${step.stage}'s Workflow ${fin.runId} finished: fold from its saved result, never re-run it`, savedResult: fin.savedResult });
  }
  const last = launchOf(rec, step.launches[step.launches.length - 1]);
  // Args built on another resolution name its files: the main loop rebuilds them from this one.
  if (last.ce !== ce.id) return done({ action: "start", step: step.n, stage: step.stage, reason: `${step.stage}'s Workflow ${last.id} never finished, and it ran on ${last.ce} while CE now resolves as ${ce.id}: rebuild the args from ${ce.id}, run the gate, then launch` });
  const argsPath = join(rec.dir, last.args);
  if (!existsSync(argsPath) || fileSha(argsPath) !== last.argsSha256) {
    save(rec);
    return { ...base, ok: false, action: "stop", reason: `the recorded args at ${argsPath} are missing or no longer match their sha256, so the stage cannot re-run as recorded`, step: step.n, stage: step.stage };
  }
  return done({ action: "rerun", step: step.n, stage: step.stage, reason: `${step.stage}'s Workflow never finished (${savedResultState(last.savedResult).why}): it re-runs from its start with the recorded args, since a Workflow resumes only in the session that launched it`, script: last.script, args: argsPath });
}

// The files a moved project changed since the run's base, and those the staged plan cites (by
// its path in the project or the repo, or its file name as a whole token).
function moveOf(rec) {
  const { gitRoot, projectRel, rel } = rec.plan;
  const now = git(gitRoot, ["rev-parse", `HEAD:${projectRel}`]);
  if (now === rec.base.projectTree) return null;
  const changed = git(gitRoot, ["diff", "--name-only", "--no-renames", "-z", rec.base.commit, "HEAD", "--", literal(projectRel)]).split("\0").filter(Boolean).filter((f) => f !== rel);
  if (changed.length === 0) return null;
  const text = existsSync(stagedPath(rec)) ? readFileSync(stagedPath(rec), "utf8") : "";
  const cited = changed.filter((f) => {
    const inProject = f.slice(projectRel.length + 1);
    const name = f.slice(f.lastIndexOf("/") + 1);
    return [f, inProject, name].some((s) => holdsToken(text, s, false));
  });
  return { changed: changed.length, cited, files: changed };
}

// The staged plan's git blob as the named path would store it (the path's own filters applied),
// its bytes read by node and given to git on stdin.
const stagedBlob = (rec) => git(rec.plan.gitRoot, ["hash-object", "--stdin", `--path=${rec.plan.rel}`], { input: readFileSync(stagedPath(rec)) });
const recordLine = (rec) => `run record: ${tildeOf(rec._path)}`;

// An update run that changed nothing: its staged plan is the blob the run started from.
const unchangedRun = (rec, blob) => rec.update === true && blob === rec.start.headBlob;
const touchedBy = (rec, sha) => git(rec.plan.gitRoot, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", "-z", sha]).split("\0").filter(Boolean);

// The commits since the run's base whose message carries this run's record line as a whole line,
// newest first. Found by the line, never by a log of the plan path: a landing that changed nothing
// is an empty commit, which a path-limited log never shows. A failed log fails loud: a missing base
// never reads as "not landed", which would commit the receipt twice.
function lineCommits(rec) {
  const line = recordLine(rec);
  const shas = git(rec.plan.gitRoot, ["log", "--format=%H", "--fixed-strings", `--grep=${line}`, `${rec.base.commit}..HEAD`]).split("\n").filter(Boolean);
  return shas.filter((sha) => git(rec.plan.gitRoot, ["log", "-1", "--format=%B", sha]).split(/\r?\n/).includes(line));
}

// Whether a commit is this run's landing: the plan alone at the staged blob, or, for an update run
// that changed nothing, no path at all. A commit that only quotes the record line, or another
// session's commit of the plan, is not.
function isLanding(rec, sha, blob) {
  const touched = touchedBy(rec, sha);
  if (unchangedRun(rec, blob)) return touched.length === 0;
  return touched.length === 1 && touched[0] === rec.plan.rel && git(rec.plan.gitRoot, ["rev-parse", "--verify", "--quiet", `${sha}:${rec.plan.rel}`], { quiet: [1, 128] }) === blob;
}

// This run's landing commit since its base, or null: whatever the plan path holds now (a later
// commit may have edited it), and past any later commit that quotes the record line.
const landedCommit = (rec, blob) => lineCommits(rec).find((sha) => isLanding(rec, sha, blob)) ?? null;

// The landing's sibling temp, removed wherever a landing stops short of its rename: a leftover from a
// landing that died is never left beside the plan, where another session's add could take it.
function dropTemp(rec) {
  const tmp = rec.landing?.tmp;
  if (tmp && existsSync(tmp)) unlinkSync(tmp);
}

// What a copy left at the named path before a crash: the staged blob in the working tree, the
// landing recorded as copying it, and HEAD's plan still as the run found it (a commit of the copy by
// another session is a change the landing check names, never a copy to commit again).
const copiedBefore = (rec, facts, blob) => rec.landing?.copying === blob && facts.worktreeBlob === blob && (facts.headBlob ?? null) === (rec.start.headBlob ?? null);

// KTD3 again before landing, and the project-move line (KTD23). A crash after landing's copy but
// before its commit leaves the named path holding the staged plan, which this reads as copied, not
// changed.
export function landCheck(rec) {
  if (!rec.end) fail("the run has not reached its landing");
  if (!existsSync(stagedPath(rec))) fail(`there is no staged plan at ${stagedPath(rec)}`);
  const drift = landedDrift(rec);
  if (drift) return { ok: false, reason: drift, moved: null, copied: false, committed: null };
  const facts = pathFacts(rec.plan.path);
  const blob = stagedBlob(rec);
  const committed = landedCommit(rec, blob);
  const copied = !committed && copiedBefore(rec, facts, blob);
  const chk = committed || copied ? { ok: true, reason: committed ? `already committed in ${committed}` : "the staged plan was copied before a crash; the commit is what is left" } : landingCheck(rec.start, facts);
  if (rec.moved === undefined || !committed) rec.moved = moveOf(rec);
  if (isOpen(rec)) save(rec);
  return { ok: chk.ok, reason: chk.reason, start: chk.start, state: chk.state, moved: rec.moved === null ? null : { changed: rec.moved.changed, cited: rec.moved.cited }, copied: Boolean(copied), committed: committed || null };
}

// The landing: the staged plan reaches its named path by one whole-file copy and one commit of that
// path alone, carrying the receipt; then the record closes as landed.
export function land(rec, input, { cwd = process.cwd() } = {}) {
  writable(rec, sessionOf(input));
  if (!rec.end) fail("the run has not reached its landing");
  dropTemp(rec);
  const drift = landedDrift(rec);
  if (drift) return { ok: false, reason: drift };
  if (rec.moved === undefined) fail("run land-check first: the receipt's project-move line comes from it");
  let message = input.message;
  if (typeof message !== "string" || !message.trim()) fail("land needs the commit message, the receipt in it");
  if (!message.includes("\n") && existsSync(typedPath(message, cwd))) message = readFileSync(typedPath(message, cwd), "utf8");
  const lines = message.split(/\r?\n/);
  if (!lines.includes(recordLine(rec))) fail(`the message carries no receipt for this run: it needs the line "${recordLine(rec)}"`);
  // The receipt must say what the record holds: the head line's open count and a park.
  const head = lines.find((l) => /^(planned|updated), /.test(l));
  if (!head) fail('the message carries no receipt head line ("planned, ..." or "updated, ...")');
  const said = Number(head.match(/, (\d+) P0\/P1 open$/)?.[1] ?? 0);
  if (said !== rec.end.open) fail(`the receipt's head line says ${said} P0/P1 open, and the record holds ${rec.end.open}`);
  const parkLine = lines.some((l) => /^parked: \S/.test(l));
  if (rec.parks.length && !parkLine) fail(`the run parked ${rec.parks.length} question${rec.parks.length === 1 ? "" : "s"}, and the message has no "parked:" line`);
  if (!rec.parks.length && parkLine) fail('the message has a "parked:" line, and no park was noted in this run');
  // And its project-move line is the one the last land-check read.
  const wantMove = moveLine(rec.moved === null ? null : { changed: rec.moved.changed, cited: rec.moved.cited });
  const saidMove = lines.filter((l) => l.startsWith("project moved during the run:"));
  if (saidMove.length !== (wantMove === null ? 0 : 1) || (wantMove !== null && saidMove[0] !== wantMove)) fail(`the message's project-move line is not land-check's: it says ${saidMove.length ? JSON.stringify(saidMove.join(" | ")) : "nothing"}, and land-check read ${wantMove === null ? "no move" : JSON.stringify(wantMove)}; rebuild the receipt`);
  const facts = pathFacts(rec.plan.path);
  const blob = stagedBlob(rec);
  const already = landedCommit(rec, blob);
  if (already) {
    close(rec, "landed", "landed", { commit: already });
    save(rec);
    return { ok: true, commit: already, reason: "the commit had landed before a crash; the record is closed now" };
  }
  // The receipt's move line was read at land-check; a project that moved since makes it stale.
  const moved = moveOf(rec);
  if (JSON.stringify(moved) !== JSON.stringify(rec.moved)) return { ok: false, reason: "the project moved since land-check: run land-check and rebuild the receipt" };
  const copied = copiedBefore(rec, facts, blob);
  if (!copied) {
    const chk = landingCheck(rec.start, facts);
    if (!chk.ok) {
      rec.landing = { ...(rec.landing ?? {}), refused: { at: stamp(), reason: chk.reason } };
      save(rec);
      return { ok: false, reason: chk.reason, start: chk.start, state: chk.state };
    }
    // R8: the named path never holds half a plan. The copy goes to a sibling temp, recorded before
    // it is written, then one rename; a copy or rename that fails takes the temp away with it.
    const tmp = join(dirname(rec.plan.path), `.${basename(rec.plan.path)}.landing.tmp`);
    rec.landing = { copying: blob, tmp, at: stamp() };
    save(rec);
    mkdirSync(dirname(rec.plan.path), { recursive: true });
    try {
      copyFileSync(stagedPath(rec), tmp);
      renameRetry(tmp, rec.plan.path);
    } catch (e) {
      dropTemp(rec);
      throw e;
    }
  }
  // The message is kept in the run folder, and given to git on stdin ("-F -").
  writeAtomic(join(rec.dir, "landing-message.txt"), message);
  // An update run that changed nothing stages the blob it started from: its commit carries the
  // receipt and touches no path, so it is made empty on purpose, and only then may it touch nothing.
  const unchanged = unchangedRun(rec, blob);
  // Nothing is staged in the shared index: a commit naming a path takes its worktree bytes, so a
  // tracked plan needs no add, and an untracked one is only marked as intended (add -N). A failed
  // commit takes that mark back, so it leaves nothing for another session's add -u or commit -a.
  const tracked = git(rec.plan.gitRoot, ["ls-files", "--error-unmatch", "--", literal(rec.plan.rel)], { quiet: [1] }) !== null;
  if (!tracked) git(rec.plan.gitRoot, ["add", "-N", "--", literal(rec.plan.rel)]);
  try {
    git(rec.plan.gitRoot, ["commit", "-q", ...(unchanged ? ["--allow-empty"] : []), "-F", "-", "--", literal(rec.plan.rel)], { input: message });
  } catch (e) {
    if (!tracked) {
      try {
        if (!landedCommit(rec, blob)) git(rec.plan.gitRoot, ["rm", "--cached", "-q", "--ignore-unmatch", "--", literal(rec.plan.rel)]);
      } catch (e2) {
        e.message += `; the plan's intent-to-add entry may remain in the index: ${e2.message}`;
      }
    }
    throw e;
  }
  // Found by its record line, never as HEAD: another session can commit in between.
  const sha = landedCommit(rec, blob);
  if (!sha) {
    const newest = lineCommits(rec)[0];
    fail(newest ? `commit ${newest} carries this run's record line but touched ${touchedBy(rec, newest).join(", ") || "no path"}, not ${unchanged ? "nothing (the plan was unchanged)" : "the plan alone at the staged blob"}` : `the commit carrying "${recordLine(rec)}" is not in the history since ${rec.base.commit}`);
  }
  close(rec, "landed", "landed", { commit: sha });
  save(rec);
  return { ok: true, commit: sha };
}

// The receipt fields the record holds, in flow.mjs's receipt shape: update, every CE commit with the
// stages it served, the seats that ran without their CE file (each launch's seats in `ran`, keyed by
// its launch id, and the main loop's own reads, each against the resolution it ran on), the stray
// files deleted, the project move and the record's path. The main loop adds the rest (R9).
export function receiptFields(rec, input) {
  const ran = input.ran;
  if (!ran || typeof ran !== "object" || Array.isArray(ran)) fail("ran maps each completed launch's id to the seat keys that ran in it");
  const park = input.park;
  if (!("park" in input) || (park !== null && (typeof park !== "string" || !park.trim()))) fail(`park is the parked question, or null when none was parked; got ${JSON.stringify(park)}`);
  if (park === null && rec.parks.length) fail(`the run parked ${rec.parks.length} question${rec.parks.length === 1 ? "" : "s"}, so the receipt names one (park)`);
  if (park !== null && !rec.parks.length) fail("no park was noted in this run, so the receipt names none (park null)");
  const completed = rec.launches.filter((l) => l.status === "completed").map((l) => l.id);
  for (const [id, seats] of Object.entries(ran)) {
    if (!completed.includes(id)) fail(`ran names ${JSON.stringify(id)}, which is no completed launch of this run (${completed.join(", ") || "none completed"})`);
    if (!Array.isArray(seats)) fail(`ran.${id} is a list of seat keys`);
    const unknown = seats.filter((s) => !KNOWN_SEATS.has(s));
    if (unknown.length) fail(`ran.${id} names no known seat ${unknown.map((s) => JSON.stringify(s)).join(", ")}: a seat is a CE file's seat or one that reads none (${SEATS_WITHOUT_CE.join(", ")})`);
  }
  // A launch left out of ran would read as "every seat ran with its file": each one is named, an
  // empty list when no seat that reads a CE file ran in it.
  const omitted = completed.filter((id) => !(id in ran));
  if (omitted.length) fail(`ran leaves out ${omitted.join(", ")}, which completed: name each completed launch's seats, an empty list when none ran`);
  if (rec.moved === undefined) fail("run land-check first: the project-move line comes from it");
  // "stray files deleted" is read from the sweeps, so every launch must have had one.
  const unswept = rec.launches.filter((l) => !l.sweep.done).map((l) => l.id);
  if (unswept.length) fail(`launch ${unswept.join(", ")} has not been swept: run complete for it (or restart) first`);
  // A stray left in the tree has no receipt line, so the receipt waits until it is moved.
  const stuck = rec.launches.flatMap((l) => l.sweep.stuck ?? []);
  if (stuck.length) fail(`stray files a helper wrote could not be moved: ${stuck.map((s) => `${s.path} (${s.error})`).join(", ")}; free them and restart, which moves them`);
  const served = servedStages(rec);
  const byCommit = new Map();
  for (const c of rec.ce) {
    const key = c.commit ?? "absent";
    const e = byCommit.get(key) ?? { commit: c.commit, stages: [] };
    for (const s of served.get(c.id)) if (!e.stages.includes(s)) e.stages.push(s);
    byCommit.set(key, e);
  }
  const ce = [...byCommit.values()].filter((e) => e.stages.length).map((e) => ({ commit: e.commit, stages: STAGES.filter((s) => e.stages.includes(s)) }));
  // Inline seats per piece of work, each read against the resolution that work ran on.
  const resolutions = new Map(rec.ce.map((c) => [c.id, JSON.parse(readFileSync(join(rec.dir, c.file), "utf8"))]));
  const inline = [];
  const seen = new Set();
  for (const row of workRows(rec, ran)) {
    for (const s of inlineSeats(resolutions.get(row.ce), row.seats)) {
      const k = `${s.seat}\0${s.file}\0${s.commit}`;
      if (!seen.has(k)) {
        seen.add(k);
        inline.push(s);
      }
    }
  }
  // The deepen line is the last deepen that scored the plan (a park's relaunch, a send-back's
  // second deepen), and the open count is the landing's own.
  const deepen = [...rec.steps].reverse().find((s) => s.stage === "deepen" && ["deepened", "passed"].includes(s.outcome))?.outcome ?? null;
  return { update: rec.update, deepen, open: rec.end.open, park: park === null ? null : park.trim(), ce, inline, strays: [...rec.strays.deleted], moved: rec.moved === null ? null : { changed: rec.moved.changed, cited: rec.moved.cited }, record: tildeOf(rec._path) };
}

// The run's state, for a session picking it up.
export function show(rec) {
  const step = currentStep(rec);
  const served = servedStages(rec);
  return {
    record: rec._path, plan: rec.plan.path, state: rec.state, update: rec.update, startedAt: rec.startedAt,
    step: step ? { n: step.n, stage: step.stage, before: step.before, target: step.target, launches: step.launches, outcome: step.outcome, ...premiseOf(step) } : null,
    // Rounds 2 and 3 re-check what earlier folds applied, so every step's ledger is handed on.
    steps: rec.steps.map((s) => ({ n: s.n, stage: s.stage, outcome: s.outcome, ledger: s.ledger })),
    // receipt-fields' `ran` is keyed by these launch ids, one per completed launch.
    launches: rec.launches.map((l) => ({ id: l.id, step: l.step, stage: l.stage, ce: l.ce, status: l.status, runId: l.runId })),
    contractBrief: rec.contractBrief, risk: rec.risk, lenses: rec.lenses, external: rec.external, parks: rec.parks, council: rec.council,
    end: rec.end, closed: rec.closed, sendBacks: rec.sendBacks, staged: stagedPath(rec), stagedHash: stagedHash(rec),
    ce: rec.ce.map((c) => ({ id: c.id, commit: c.commit, stages: served.get(c.id) })), sessions: rec.sessions.map((s) => s.id), windowStop: rec.windowStop, handBack: rec.handBack, warnings: rec.warnings,
  };
}

// ---------------------------------------------------------------- the command

function readInput(arg) {
  const text = arg.trim().startsWith("{") ? arg : readFileSync(typedPath(arg), "utf8");
  const input = JSON.parse(text);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("the input is one JSON object");
  return input;
}

const opts = (i) => (i.projectsDir ? { projectsDir: typedPath(i.projectsDir) } : {});
const withRecord = (fn) => (i) => fn(loadRecord(i.record ?? fail("record is required")), i, opts(i));
const COMMANDS = {
  locate: (i) => locate({ ...i, ...opts(i) }),
  start: (i) => start(i, opts(i)),
  show: withRecord((rec) => show(rec)),
  note: withRecord(note),
  gate: withRecord(gate),
  launch: withRecord(launch),
  launched: withRecord(launched),
  complete: withRecord(complete),
  "fold-start": withRecord(foldStart),
  "fold-land": withRecord(foldLand),
  advance: withRecord(advance),
  block: withRecord(block),
  restart: (i) => restart(i, opts(i)),
  "land-check": withRecord((rec) => landCheck(rec)),
  land: withRecord(land),
  "receipt-fields": withRecord(receiptFields),
};

if (isMain(import.meta.url)) {
  const [command, arg] = process.argv.slice(2);
  if (!command || !Object.hasOwn(COMMANDS, command) || arg === undefined) usage(`node run-record.mjs <${Object.keys(COMMANDS).join(" | ")}> <json | path to a .json file>`);
  try {
    const out = COMMANDS[command](readInput(arg));
    console.log(JSON.stringify(out, null, 1));
    // exitCode, not exit(): an exit right after a print can cut a piped stdout short.
    process.exitCode = out && out.ok === false ? 1 : 0;
  } catch (e) {
    console.error(`run-record: ${e.message.replace(/^run-record: /, "")}`);
    process.exitCode = 2;
  }
}
