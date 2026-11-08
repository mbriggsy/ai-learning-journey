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
//     a Write or Edit names it or a Bash or PowerShell command names it as a whole path token
//     (playbook insight 011), and the file was born during that call; the plan's own path never
//     moves;
//   - restart: a finished Workflow is folded from its saved result and never re-run; one that never
//     finished re-runs from its start with the recorded args (or starts again when CE moved since
//     it launched, its args naming the old CE's files); a launch this session made with no saved
//     result stops the restart, since it may still be running; a leftover working file is deleted
//     first; a staged plan at its before hash re-runs the fold, at its target hash moves on, at
//     neither stops, naming both; CE is resolved again; a window gate clears work only in the
//     session that passed it;
//   - CE credit: a resolution is credited with a stage only where work ran on it (a completed
//     launch, a landed write fold), never where a step merely opened;
//   - landing: KTD3's path checks again, the staged plan checked against the last step's hash, the
//     project-move line read again, one copy through a recorded sibling temp and one rename, and
//     one commit of that path alone carrying the receipt, found by its record line (an update run
//     that changed nothing lands as an empty commit). Nothing is staged in the shared index. A
//     crash after the copy but before the commit leaves the named path holding the staged plan,
//     which a re-landing recognizes by its blob and commits.
// A closed record (landed or blocked) is never rewritten: a landed receipt cites its path.
// Run by the main loop as a command; never inlined into a Workflow script (KTD1).
//
// Usage: node run-record.mjs <command> <json | path to a .json file>
//   locate       { plan, job? }                                -> { jobFolder, resume, open, closed }
//   start        { plan, update, brief?, job?, session? }       -> { ok, record, stage, ... } (exit 1 when refused)
//   show         { record }                                    -> the run's state
//   note         { record, key, value, session? }              -> records one fact (KTD5, KTD6, KTD11, KTD22)
//   gate         { record, line, action, session? }            -> flow.mjs's window gate, recorded
//   launch       { record, script, args, relayed, seats?, resumeOf?, session? } -> { launch, args }
//   launched     { record, launch, runId }                     -> the run id, saved-result path, transcript folder
//   complete     { record, launch }                            -> the saved result's status and the stray sweep (stuck strays named)
//   fold-start   { record, session? }                          -> { working, staged, before, savedResult }
//   fold-land    { record, ids, session? }                     -> { target }
//   advance      { record, outcome, changes?, p0p1?, open?, brief?, session? } -> flow.mjs's next step, recorded
//   block        { record, reason, session? }                  -> closes the run as blocked
//   restart      { record } or { plan, job? }, with session?   -> { action, ... } (exit 1 on a stop)
//   land-check   { record }                                    -> { ok, moved, ... } (exit 1 when the path changed)
//   land         { record, message, session? }                 -> { ok, commit } (exit 1 when refused)
//   receipt-fields { record, ran, park }                       -> the receipt fields the record holds
// `session` defaults to this session's CLAUDE_CODE_SESSION_ID; a command that writes refuses when
// neither names one. `registry` (the plugin registry) and `projectsDir` may be given for a fixture.
// Exit 0 is an answer, 1 a refusal or stop (nothing written past it), 2 an input the command could
// not read or a refused write (nothing was decided).

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, copyFileSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { isMain, usage } from "./entry.mjs";
import { STAGES, firstStage, landingCheck, loadStageCosts, nextStep, pathFacts, stageGate, startCheck } from "./flow.mjs";
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
  // Git prints some refusals on stdout (a commit with nothing to commit), so both go in the error.
  const said = [r.stderr, r.stdout].map((x) => String(x ?? "").trim()).filter(Boolean).join(" | ");
  fail(`git ${args.join(" ")} failed (exit ${r.status}): ${said}`);
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

// The stages each resolution served, in STAGES order, credited only where work ran on it: a
// completed launch on the resolution it recorded, and a write whose fold landed on the resolution
// its fold-land recorded. Opening a step credits nothing (the brief runs /brief and reads no CE).
function servedStages(rec) {
  const by = new Map(rec.ce.map((c) => [c.id, new Set()]));
  for (const l of rec.launches) if (l.status === "completed") by.get(l.ce)?.add(l.stage);
  for (const s of rec.steps) if (s.stage === "write" && s.target !== null && s.foldCe) by.get(s.foldCe)?.add("write");
  return new Map([...by].map(([id, set]) => [id, STAGES.filter((s) => set.has(s))]));
}

// The work that ran on each resolution, one row per completed launch and per landed write fold,
// with the resolution it ran on: the receipt's inline seats are read per row.
function workRows(rec) {
  const rows = rec.launches.filter((l) => l.status === "completed").map((l) => ({ stage: l.stage, ce: l.ce }));
  for (const s of rec.steps) if (s.stage === "write" && s.target !== null && s.foldCe) rows.push({ stage: "write", ce: s.foldCe });
  return rows;
}

// What a park's relaunch must carry wherever its step is handed on (restart, show): without it a
// relaunch after a window stop would run the premise seat again.
const premiseOf = (step) => (step?.skipPremise ? { skipPremise: true, parked: step.parked === true, scoresFrom: step.scoresFrom ?? null } : {});

// A write that opened with a start gate (a send-back's rewrite, not research's fold): its fold is
// new work, not a returned Workflow's fold that always completes, so it needs a passed start gate
// in the session that folds it. Every other stage's fold reads a finished Workflow (KTD10).
const writeBehindStartGate = (step) => step.stage === "write" && step.gate === "start";

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

// Which helper call wrote a file, or null: a Write or Edit naming its path, or a shell command
// naming it as a whole path token. Matching is by spelling, never by name alone, so another
// session's file of the same name elsewhere is never the run's. With `born` (the file's birth, in
// epoch ms) a call counts only when the birth falls inside its window, so a call that read a file
// made before it, or named a path filled in after it, is never its writer; a call with no window
// counts for nothing. Without `born` this is the spelling match alone.
export function writerOf(abs, trail, { platform = process.platform, gitRoot, born } = {}) {
  const fold = platform === "win32";
  const during = (call) => born === undefined || (call.window != null && born >= call.window.from && born <= call.window.to);
  for (const w of trail.writes) {
    if (!during(w)) continue;
    const p = w.abs ?? longOf(resolve(w.cwd || gitRoot || ".", fromGitBash(w.path, platform)));
    if (samePath(p, abs, platform)) return { tool: w.tool, id: w.id, transcript: w.transcript };
  }
  for (const c of trail.commands) {
    if (!during(c)) continue;
    const bases = [c.cwd, ...cdBases(c.text, c.cwd, platform)];
    if (bases.some((base) => spellings(abs, base).some((s) => holdsToken(c.text, s, fold)))) return { tool: c.tool, id: c.id, transcript: c.transcript };
  }
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

// A move into the run folder, its failure caught: a locked file stays where it is, named.
function tryMove(rec, l, rel, by) {
  try {
    moveFile(join(rec.plan.gitRoot, ...rel.split("/")), strayOf(rec, l, rel));
    noteDeleted(rec, rel);
    return null;
  } catch (e) {
    return { path: rel, by, error: e.code ?? e.message };
  }
}

// A swept launch's stuck strays, moved again (a restart runs this): one freed since moves now,
// one gone from the tree drops out, and the rest stay named.
function retryStuck(rec, l) {
  const still = [];
  for (const s of l.sweep.stuck) {
    if (!existsSync(join(rec.plan.gitRoot, ...s.path.split("/")))) continue;
    const failed = tryMove(rec, l, s.path, s.by);
    if (failed) still.push(failed);
    else l.sweep.deleted.push({ path: s.path, by: s.by });
  }
  l.sweep.stuck = still;
  l.sweep.note = [...(l.sweep.notes ?? []), ...(still.length ? [stuckLine(still)] : [])].join("; ") || undefined;
  return l.sweep;
}

function sweep(rec, l) {
  if (l.sweep.done) return l.sweep.stuck?.length ? retryStuck(rec, l) : l.sweep;
  const recovered = recoverMoves(rec, l);
  const notes = recovered.length ? [`recovered ${recovered.length} move${recovered.length === 1 ? "" : "s"} a dead sweep made: ${recovered.join(", ")}`] : [];
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
      st = lstatSync(abs);
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
    const born = st ? st.birthtimeMs || st.mtimeMs : undefined;
    const by = st && !st.isDirectory() ? writerOf(abs, trail, { gitRoot: rec.plan.gitRoot, born }) : null;
    if (!by) {
      foreign.push(rel);
      continue;
    }
    const failed = tryMove(rec, l, rel, by);
    if (failed) stuck.push(failed);
    else deleted.push({ path: rel, by });
  }
  if (trail.transcripts === 0) notes.push("no helper transcript was read, so no new file could be attributed to this launch");
  else if (Number.isInteger(l.agentCount) && trail.transcripts !== l.agentCount) notes.push(`read ${trail.transcripts} helper transcripts of the ${l.agentCount} the saved result counts`);
  // `notes` keeps the standing ones, so a retry of stuck strays can rebuild the note.
  l.sweep = { ...l.sweep, done: true, at: stamp(), transcripts: trail.transcripts, helpers: l.agentCount ?? null, fresh: fresh.length, deleted, foreign, stuck, notes, ...(planNote ? { planNote } : {}) };
  const note = [...notes, ...(stuck.length ? [stuckLine(stuck)] : [])].join("; ");
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
    brief: null, contractBrief: null, risk: null, lenses: null, external: null, council: [], parks: [], handBack: null,
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
    id, step: step.n, stage: step.stage, ce: latestCe(rec).id, session, launchedAt: stamp(), ...cliOf(session, projectsDir),
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

// A launch's completion: its saved result's state, then its stray sweep.
export function complete(rec, input, { projectsDir = defaultProjectsDir() } = {}) {
  writable(rec, sessionOf(input));
  const l = launchOf(rec, input.launch);
  if (l.runId === null) fail(`${l.id} has no run id: record it with launched first`);
  // A session folder that did not exist at launched (no transcript yet) may exist now.
  if (l.savedResult === null) {
    const dir = sessionDir(l.session, projectsDir);
    if (!dir) fail(`the session folder for ${l.session} is missing under ${projectsDir}, so ${l.id}'s saved result cannot be found`);
    l.savedResult = join(dir, "workflows", `${l.runId}.json`);
    l.transcriptDir = join(dir, "subagents", "workflows", l.runId);
    delete l.pathsNote;
  }
  if (!existsSync(l.savedResult)) fail(`${l.id}'s Workflow has no saved result yet at ${l.savedResult}: it has not finished`);
  const s = savedResultState(l.savedResult);
  l.completedAt = stamp();
  l.status = s.finished ? "completed" : s.why;
  l.agentCount = s.agentCount ?? null;
  const sw = sweep(rec, l);
  save(rec);
  return { ok: true, launch: l.id, finished: s.finished, why: s.why ?? null, savedResult: l.savedResult, strays: { deleted: sw.deleted.map((d) => d.path), foreign: sw.foreign.length, stuck: (sw.stuck ?? []).map((s) => s.path), note: sw.note ?? null } };
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
  if (writeBehindStartGate(step) && !step.gates.some((g) => g.action === "start" && g.go && g.session === session)) fail(`step ${step.n}'s write rewrites the plan after a send-back, so it starts behind a start gate: run the gate in this session first (KTD10)`);
  const removed = existsSync(workingPath(rec));
  if (removed) unlinkSync(workingPath(rec));
  const at = stagedAt(rec, step);
  if (at === "target") fail(`step ${step.n}'s fold has landed (the staged plan is at its target): advance instead`);
  if (at !== "before") fail(`the staged plan matches neither hash: ${hashes(rec, step)}`);
  if (existsSync(stagedPath(rec))) copyFileSync(stagedPath(rec), workingPath(rec));
  const from = finishedLaunch(rec, step) ?? (step.stage === "write" ? lastFinishedBefore(rec, step) : null);
  if (WORKFLOW_STAGES.includes(step.stage) && !from) fail(`step ${step.n} (${step.stage}) has no finished Workflow to fold from`);
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
  writable(rec, sessionOf(input));
  const step = currentStep(rec);
  if (rec.end) fail("the run has reached its landing; land it");
  const at = stagedAt(rec, step);
  if (step.target !== null && at !== "target") fail(`step ${step.n}'s fold has not landed: ${hashes(rec, step)}`);
  if (step.target === null && at !== "before") fail(`the staged plan moved outside a fold: ${hashes(rec, step)}`);
  if (WORKFLOW_STAGES.includes(step.stage) && !finishedLaunch(rec, step)) fail(`step ${step.n} (${step.stage}) has no finished Workflow: its outcome cannot be read`);
  // A launch's strays are swept before its outcome is used (KTD23).
  const unswept = step.launches.filter((id) => !launchOf(rec, id).sweep.done);
  if (unswept.length) fail(`step ${step.n}'s launch ${unswept.join(", ")} has not been swept: run complete for it first`);
  if (step.stage === "write" && step.target === null) fail("the write has not landed a staged plan (fold-land)");
  if (step.stage === "check-1") {
    const applied = step.ledger?.length ?? 0;
    if (input.changes !== applied) fail(`check round 1's changes must equal the ${applied} id${applied === 1 ? "" : "s"} its fold's ledger applied, got ${JSON.stringify(input.changes)}`);
  }
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
  // A park's relaunch runs without the premise seat on the parked deepen's scores (KTD5, KTD11).
  else openStep(rec, next.step, { gate: next.gate, ...(next.skipPremise ? { skipPremise: true, scoresFrom: finishedLaunch(rec, step)?.savedResult ?? null } : {}), ...(next.parked ? { parked: true } : {}) });
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
  const ce = addResolution(rec, resolveCe(registryOf(input, cwd)), session);
  // A launch this session made with no saved result yet may still be running in the background:
  // sweeping it would move files its helpers are writing, and re-running it would run it twice.
  const live = rec.launches.filter((l) => !l.sweep.done && l.session === session && !existsSync(l.savedResult ?? ""));
  if (live.length) {
    save(rec);
    const ids = live.map((l) => l.id).join(", ");
    return { ok: false, action: "stop", record: rec._path, reason: `${ids} ${live.length === 1 ? "was" : "were"} launched by this session and ${live.length === 1 ? "has" : "have"} no saved result, so ${live.length === 1 ? "it" : "they"} may still be running: wait for the completion notice, then run complete` };
  }
  // The session that launched them is gone, so every launch it never swept is swept now, and a
  // stray a sweep could not move is tried again.
  const swept = [];
  for (const l of rec.launches) {
    if (l.sweep.done && !l.sweep.stuck?.length) continue;
    const s = savedResultState(l.savedResult);
    if (l.status === null) l.status = s.finished ? "completed" : `never completed: ${s.why}`;
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
    return done({ action: "land", reason: "the run reached its landing: land-check, then land", open: rec.end.open });
  }
  const step = currentStep(rec);
  const at = stagedAt(rec, step);
  if (at === null) {
    save(rec);
    return { ...base, ok: false, action: "stop", reason: `the staged plan matches neither recorded hash, so the run stops: ${hashes(rec, step)}`, step: step.n, stage: step.stage };
  }
  // The outcome may live in the saved result the fold read (check round 2's P0/P1 count does).
  if (at === "target") return done({ action: "advance", step: step.n, stage: step.stage, reason: `step ${step.n}'s fold landed (the staged plan is at its target): record ${step.stage}'s outcome`, savedResult: (finishedLaunch(rec, step) ?? (step.stage === "write" ? lastFinishedBefore(rec, step) : null))?.savedResult ?? null });
  // From here the staged plan is at the step's before hash, and any fold re-runs from it. A
  // send-back's write re-runs behind a start gate of this session.
  if (writeBehindStartGate(step)) return done({ action: "start", step: step.n, stage: step.stage, reason: "a send-back's write rewrites the plan: run the gate in this session, then fold (KTD10)", savedResult: lastFinishedBefore(rec, step)?.savedResult ?? null });
  if (step.target !== null) return done({ action: "fold", step: step.n, stage: step.stage, reason: `step ${step.n}'s target was recorded but its rename never landed: the fold re-runs from the before hash and rewrites its ledger entry`, savedResult: (finishedLaunch(rec, step) ?? lastFinishedBefore(rec, step))?.savedResult ?? null });
  if (step.stage === "brief") return done({ action: "start", step: step.n, stage: step.stage, reason: "the brief has not been recorded: run /brief, then advance with its path" });
  if (step.stage === "write") {
    const from = lastFinishedBefore(rec, step);
    return done({ action: "fold", step: step.n, stage: step.stage, reason: "write the staged plan from the saved result; research never relaunches", savedResult: from?.savedResult ?? null });
  }
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

// The newest commit since the run's base whose message carries this run's record line as a whole
// line. Found by the line, never by a log of the plan path: a landing that changed nothing is an
// empty commit, which a path-limited log never shows.
function landedCommit(rec) {
  const line = recordLine(rec);
  const out = git(rec.plan.gitRoot, ["log", "-1", "--format=%H%x00%B", "--fixed-strings", `--grep=${line}`, `${rec.base.commit}..HEAD`], { quiet: [128] });
  if (!out) return null;
  const [sha, body = ""] = out.split("\0");
  return body.split(/\r?\n/).includes(line) ? sha : null;
}

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
  const committed = facts.headBlob === blob && landedCommit(rec);
  const copied = !committed && rec.landing?.copying === blob && facts.worktreeBlob === blob;
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
  const facts = pathFacts(rec.plan.path);
  const blob = stagedBlob(rec);
  const already = facts.headBlob === blob && landedCommit(rec);
  if (already) {
    close(rec, "landed", "landed", { commit: already });
    save(rec);
    return { ok: true, commit: already, reason: "the commit had landed before a crash; the record is closed now" };
  }
  // The receipt's move line was read at land-check; a project that moved since makes it stale.
  const moved = moveOf(rec);
  if (JSON.stringify(moved) !== JSON.stringify(rec.moved)) return { ok: false, reason: "the project moved since land-check: run land-check and rebuild the receipt" };
  const copied = rec.landing?.copying === blob && facts.worktreeBlob === blob;
  if (!copied) {
    const chk = landingCheck(rec.start, facts);
    if (!chk.ok) {
      rec.landing = { ...(rec.landing ?? {}), refused: { at: stamp(), reason: chk.reason } };
      save(rec);
      return { ok: false, reason: chk.reason, start: chk.start, state: chk.state };
    }
    // R8: the named path never holds half a plan. The copy goes to a sibling temp, recorded before
    // it is written, then one rename; a re-land first deletes a temp a crash left behind.
    const tmp = join(dirname(rec.plan.path), `.${basename(rec.plan.path)}.landing.tmp`);
    for (const old of new Set([rec.landing?.tmp, tmp].filter(Boolean))) if (existsSync(old)) unlinkSync(old);
    rec.landing = { copying: blob, tmp, at: stamp() };
    save(rec);
    mkdirSync(dirname(rec.plan.path), { recursive: true });
    copyFileSync(stagedPath(rec), tmp);
    renameRetry(tmp, rec.plan.path);
  }
  // The message is kept in the run folder, and given to git on stdin ("-F -").
  writeAtomic(join(rec.dir, "landing-message.txt"), message);
  // An update run that changed nothing stages HEAD's own blob: its commit carries the receipt and
  // touches no path, so it is made empty on purpose, and only then may it touch nothing.
  const unchanged = blob === facts.headBlob;
  // Nothing is staged in the shared index: a commit naming a path takes its worktree bytes, so a
  // tracked plan needs no add, and an untracked one is only marked as intended (add -N). A failed
  // commit then leaves no staged plan for another session's commit to sweep up.
  const tracked = git(rec.plan.gitRoot, ["ls-files", "--error-unmatch", "--", literal(rec.plan.rel)], { quiet: [1] }) !== null;
  if (!tracked) git(rec.plan.gitRoot, ["add", "-N", "--", literal(rec.plan.rel)]);
  git(rec.plan.gitRoot, ["commit", "-q", ...(unchanged ? ["--allow-empty"] : []), "-F", "-", "--", literal(rec.plan.rel)], { input: message });
  // Found by its record line, never as HEAD: another session can commit in between.
  const sha = landedCommit(rec) ?? fail(`the commit carrying "${recordLine(rec)}" is not in the history since ${rec.base.commit}`);
  const touched = git(rec.plan.gitRoot, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", "-z", sha]).split("\0").filter(Boolean);
  const alone = unchanged ? touched.length === 0 : touched.length === 1 && touched[0] === rec.plan.rel;
  if (!alone) fail(`commit ${sha} touched ${touched.join(", ") || "no path"}, not ${unchanged ? "nothing (the plan was unchanged)" : "the plan alone"}`);
  close(rec, "landed", "landed", { commit: sha });
  save(rec);
  return { ok: true, commit: sha };
}

// The receipt fields the record holds, in flow.mjs's receipt shape: update, every CE commit with the
// stages it served, the seats in `ran` (keyed by stage) that ran without their CE file, the stray
// files deleted, the project move and the record's path. The main loop adds the rest (R9).
export function receiptFields(rec, input) {
  const ran = input.ran;
  if (!ran || typeof ran !== "object" || Array.isArray(ran)) fail("ran maps each stage to the seat keys that ran in it");
  const park = input.park;
  if (!("park" in input) || (park !== null && (typeof park !== "string" || !park.trim()))) fail(`park is the parked question, or null when none was parked; got ${JSON.stringify(park)}`);
  if (park === null && rec.parks.length) fail(`the run parked ${rec.parks.length} question${rec.parks.length === 1 ? "" : "s"}, so the receipt names one (park)`);
  if (park !== null && !rec.parks.length) fail("no park was noted in this run, so the receipt names none (park null)");
  for (const [stage, seats] of Object.entries(ran)) {
    if (!STAGES.includes(stage)) fail(`ran names no stage ${JSON.stringify(stage)}`);
    if (!Array.isArray(seats)) fail(`ran.${stage} is a list of seat keys`);
    const unknown = seats.filter((s) => !KNOWN_SEATS.has(s));
    if (unknown.length) fail(`ran.${stage} names no known seat ${unknown.map((s) => JSON.stringify(s)).join(", ")}: a seat is a CE file's seat or one that reads none (${SEATS_WITHOUT_CE.join(", ")})`);
  }
  if (rec.moved === undefined) fail("run land-check first: the project-move line comes from it");
  // "stray files deleted" is read from the sweeps, so every launch must have had one.
  const unswept = rec.launches.filter((l) => !l.sweep.done).map((l) => l.id);
  if (unswept.length) fail(`launch ${unswept.join(", ")} has not been swept: run complete for it (or restart) first`);
  // A stray left in the tree has no receipt line, so the receipt waits until it is moved.
  const stuck = rec.launches.flatMap((l) => l.sweep.stuck ?? []);
  if (stuck.length) fail(`stray files a helper wrote could not be moved: ${stuck.map((s) => `${s.path} (${s.error})`).join(", ")}; free them and restart, which moves them`);
  const served = servedStages(rec);
  // A stage left out of ran would read as "every seat ran with its file", and seats named for a
  // stage no work ran in would vanish from the receipt: both refuse.
  const ranStages = new Set([...served.values()].flat());
  const omitted = STAGES.filter((s) => ranStages.has(s) && !(s in ran));
  if (omitted.length) fail(`ran leaves out ${omitted.join(", ")}, which the run served: name each served stage's seats, an empty list when none ran`);
  const idle = Object.keys(ran).filter((s) => !ranStages.has(s) && ran[s].length);
  if (idle.length) fail(`ran names seats for ${idle.join(", ")}, which no work in this run served`);
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
  for (const row of workRows(rec)) {
    for (const s of inlineSeats(resolutions.get(row.ce), ran[row.stage] ?? [])) {
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
