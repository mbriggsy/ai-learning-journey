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
//     (playbook insight 011);
//   - restart: a finished Workflow is folded from its saved result and never re-run; one that never
//     finished re-runs from its start with the recorded args; a leftover working file is deleted
//     first; a staged plan at its before hash re-runs the fold, at its target hash moves on, at
//     neither stops, naming both; CE is resolved again;
//   - landing: KTD3's path checks again, the project-move line, one whole-file copy and one commit
//     of that path alone carrying the receipt. A crash after the copy but before the commit leaves
//     the named path holding the staged plan, which a re-landing recognizes by its blob and commits.
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
//   complete     { record, launch }                            -> the saved result's status and the stray sweep
//   fold-start   { record, session? }                          -> { working, staged, before, savedResult }
//   fold-land    { record, ids, session? }                     -> { target }
//   advance      { record, outcome, changes?, p0p1?, open?, brief?, session? } -> flow.mjs's next step, recorded
//   block        { record, reason, session? }                  -> closes the run as blocked
//   restart      { record } or { plan, job? }, with session?   -> { action, ... } (exit 1 on a stop)
//   land-check   { record }                                    -> { ok, moved, ... } (exit 1 when the path changed)
//   land         { record, message, session? }                 -> { ok, commit } (exit 1 when refused)
//   receipt-fields { record, ran }                             -> the receipt fields the record holds
// `session` defaults to this session's CLAUDE_CODE_SESSION_ID; a command that writes refuses when
// neither names one. `registry` (the plugin registry) and `projectsDir` may be given for a fixture.
// Exit 0 is an answer, 1 a refusal or stop (nothing written past it), 2 an input the command could
// not read or a refused write (nothing was decided).

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, copyFileSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { isMain, usage } from "./entry.mjs";
import { STAGES, firstStage, landingCheck, loadStageCosts, nextStep, pathFacts, stageGate, startCheck } from "./flow.mjs";
import { MAX_SLUG, defaultProjectsDir, fromGitBash, longOf, samePath, slugOf } from "./paths.mjs";
import { changedInPlace, checkResolution, inlineSeats, resolveCe, sameResolution } from "./resolve-ce.mjs";

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

// "~" for the home folder: the form the receipt prints, since the repo is public.
const home = () => homedir();
export function untilde(text) {
  return String(text).replace(/^~(?=$|[\\/])/, () => home());
}
export function tildeOf(p) {
  const h = home();
  const rel = relative(h, p);
  if (rel && !rel.startsWith("..") && !isAbsolute(rel)) return `~/${rel.split(sep).join("/")}`;
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
  fail(`git ${args.join(" ")} failed (exit ${r.status}): ${String(r.stderr).trim()}`);
}
const literal = (rel) => `:(literal)${rel}`;

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
  if (name.length > 120) name = `${name.slice(0, 100)}-${sha256(facts.rel).slice(0, 12)}`;
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

// A resolution serves a stage that reads CE: every stage but the brief, which runs /brief.
function serve(rec, ceId, stage) {
  if (stage === "brief") return;
  const c = rec.ce.find((x) => x.id === ceId);
  if (!c.stages.includes(stage)) c.stages.push(stage);
}

function openStep(rec, stage, extra = {}) {
  const step = { n: rec.steps.length + 1, stage, openedAt: stamp(), before: stagedHash(rec), ce: latestCe(rec).id, launches: [], gates: [], target: null, ledger: null, foldedAt: null, outcome: null, endedAt: null, ...extra };
  rec.steps.push(step);
  serve(rec, step.ce, stage);
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
  const entry = { id, commit: resolution.commit, absent: resolution.absent, version: resolution.version, installPath: resolution.installPath, resolvedAt: resolution.resolvedAt, file, sessions: [session], stages: [] };
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

// Everything the helper transcripts in one folder wrote: each Write or Edit's path and each shell
// command's text, with the row's working folder. A folder with no transcript reads as none read,
// never as "wrote nothing".
export function helperTrail(transcriptDir) {
  if (!transcriptDir || !existsSync(transcriptDir)) return { transcripts: 0, writes: [], commands: [] };
  const files = readdirSync(transcriptDir).filter((f) => /^agent-.*\.jsonl$/.test(f)).sort();
  const writes = [];
  const commands = [];
  for (const f of files) {
    for (const line of readFileSync(join(transcriptDir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      const c = o?.message?.content;
      if (o?.type !== "assistant" || !Array.isArray(c)) continue;
      for (const b of c) {
        if (b?.type !== "tool_use" || !b.input) continue;
        const field = WRITE_TOOLS[b.name];
        if (field && typeof b.input[field] === "string") writes.push({ path: b.input[field], cwd: o.cwd ?? null, tool: b.name, id: b.id, transcript: f });
        if (SHELL_TOOLS.includes(b.name) && typeof b.input.command === "string") commands.push({ text: b.input.command, cwd: o.cwd ?? null, tool: b.name, id: b.id, transcript: f });
      }
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
    if ((!before || !PATH_CHAR.test(before)) && (!after || !PATH_CHAR.test(after) || after === ":")) return true;
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
    if (rel && !rel.startsWith("..") && !isAbsolute(rel)) {
      out.add(rel);
      out.add(rel.split("\\").join("/"));
      out.add(`./${rel.split("\\").join("/")}`);
    }
  }
  return [...out];
}

// Which helper call wrote a file, or null: a Write or Edit naming its path, or a shell command
// naming it as a whole path token. Matching is by spelling, never by name alone, so another
// session's file of the same name elsewhere is never the run's.
export function writerOf(abs, trail, { platform = process.platform, gitRoot } = {}) {
  const fold = platform === "win32";
  for (const w of trail.writes) {
    const p = longOf(resolve(w.cwd || gitRoot || ".", fromGitBash(w.path, platform)));
    if (samePath(p, abs, platform)) return { tool: w.tool, id: w.id, transcript: w.transcript };
  }
  for (const c of trail.commands) {
    if (spellings(abs, c.cwd).some((s) => holdsToken(c.text, s, fold))) return { tool: c.tool, id: c.id, transcript: c.transcript };
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
function sweep(rec, l) {
  if (l.sweep.done) return l.sweep;
  const before = new Set(JSON.parse(gunzipSync(readFileSync(join(rec.dir, l.sweep.before))).toString("utf8")));
  const fresh = looseFiles(rec.plan.gitRoot, rec.plan.projectRel).filter((f) => !before.has(f));
  const trail = helperTrail(l.transcriptDir);
  const deleted = [];
  const foreign = [];
  for (const rel of fresh) {
    const abs = join(rec.plan.gitRoot, ...rel.split("/"));
    let st = null;
    try {
      st = lstatSync(abs);
    } catch {
      // gone again since the listing
    }
    const by = st && !st.isDirectory() ? writerOf(abs, trail, { gitRoot: rec.plan.gitRoot }) : null;
    if (!by) {
      foreign.push(rel);
      continue;
    }
    moveFile(abs, join(rec.dir, "strays", l.id, ...rel.split("/")));
    deleted.push({ path: rel, by });
    rec.strays.deleted.push(rel);
  }
  l.sweep = { ...l.sweep, done: true, at: stamp(), transcripts: trail.transcripts, helpers: l.agentCount ?? null, fresh: fresh.length, deleted, foreign };
  if (trail.transcripts === 0) l.sweep.note = "no helper transcript was read, so no new file could be attributed to this launch";
  else if (Number.isInteger(l.agentCount) && trail.transcripts !== l.agentCount) l.sweep.note = `read ${trail.transcripts} helper transcripts of the ${l.agentCount} the saved result counts`;
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
  if (!rel || (!rel.startsWith("..") && !isAbsolute(rel))) return { ok: false, reason: `the job folder ${loc.jobFolder} is inside the repository at ${facts.gitRoot}: the run writes only outside the tree until landing (KTD23)` };
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
    base: { commit: git(facts.gitRoot, ["rev-parse", "HEAD"]), projectTree: git(facts.gitRoot, ["rev-parse", `HEAD:${facts.projectRel}`]) },
    start: check.state, createPlansFolder: check.createPlansFolder,
    brief: null, contractBrief: null, risk: null, lenses: null, external: null, council: [], parks: [], handBack: null,
    sendBacks: 0, sessions: [{ id: session, at: t }], ce: [], steps: [], launches: [],
    state: "running", windowStop: null, end: null, moved: undefined, landing: null, closed: null, strays: { deleted: [] }, warnings: [],
  };
  Object.defineProperty(rec, "_path", { value: join(dir, RECORD), enumerable: false });
  addResolution(rec, resolveCe({ registry: input.registry, now }), session);
  if (briefText !== null) {
    writeAtomic(join(dir, "brief.md"), briefText);
    rec.brief = { file: "brief.md", sha256: sha256(Buffer.from(briefText, "utf8")) };
  }
  // Under update the staged plan starts as HEAD's committed bytes (KTD3), the blob itself.
  if (update) writeAtomic(stagedPath(rec), git(facts.gitRoot, ["cat-file", "blob", facts.headBlob], { buffer: true }));
  openStep(rec, first.stage);
  save(rec);
  return { ok: true, record: rec._path, dir, stage: first.stage, gate: first.gate, reason: first.reason, ce: join(dir, latestCe(rec).file), staged: stagedPath(rec) };
}

const NOTES = {
  contractBrief: { once: true, check: (v) => typeof v === "string" && v.trim() },
  risk: { once: true, check: (v) => v && typeof v === "object" && !Array.isArray(v) },
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
  if (spec.list) rec[input.key].push(input.value);
  else rec[input.key] = input.value;
  save(rec);
  return { ok: true, key: input.key };
}

// flow.mjs's window gate for the current step, recorded with its reading (a "Context (TEST" line
// marked as a test reading, KTD10). A held start leaves the run open as a window stop that hands
// back this stage.
export function gate(rec, input) {
  writable(rec, sessionOf(input));
  const step = currentStep(rec);
  const action = input.action ?? "start";
  const planBytes = PLANLESS.includes(step.stage) || action === "fold" ? undefined : existsSync(stagedPath(rec)) ? statSync(stagedPath(rec)).size : fail(`${step.stage} reads the staged plan, and there is none at ${stagedPath(rec)}`);
  const g = stageGate({ line: input.line, action, stage: step.stage, planBytes, costs: input.costs ?? loadStageCosts() });
  // launchesBefore ties a passed start gate to the launch it clears: launch() needs one per launch.
  step.gates.push({ at: stamp(), action, line: input.line ?? null, go: g.go, step: g.step, test: g.test === true, reason: g.reason, launchesBefore: step.launches.length });
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
  if (!g || g.action !== "start" || !g.go || g.launchesBefore !== step.launches.length) fail(`no passed window gate since step ${step.n}'s last launch: run the gate before every launch (KTD10)`);
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
    id, step: step.n, stage: step.stage, ce: step.ce, session, launchedAt: stamp(), ...cliOf(session, projectsDir),
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
export function complete(rec, input) {
  writable(rec, sessionOf(input));
  const l = launchOf(rec, input.launch);
  if (l.runId === null) fail(`${l.id} has no run id: record it with launched first`);
  if (!existsSync(l.savedResult ?? "")) fail(`${l.id}'s Workflow has no saved result yet at ${l.savedResult}: it has not finished`);
  const s = savedResultState(l.savedResult);
  l.completedAt = stamp();
  l.status = s.finished ? "completed" : s.why;
  l.agentCount = s.agentCount ?? null;
  const sw = sweep(rec, l);
  save(rec);
  return { ok: true, launch: l.id, finished: s.finished, why: s.why ?? null, savedResult: l.savedResult, strays: { deleted: sw.deleted.map((d) => d.path), foreign: sw.foreign.length, note: sw.note ?? null } };
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

// The start of a fold: a leftover working file is deleted, and the staged plan, still at the step's
// before hash, is copied to the working file the main loop edits.
export function foldStart(rec, input) {
  writable(rec, sessionOf(input));
  const step = currentStep(rec);
  if (step.stage === "brief") fail("the brief stage has no fold");
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
  else openStep(rec, next.step, { ...(next.skipPremise ? { skipPremise: true } : {}), ...(next.parked ? { parked: true } : {}) });
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
    if (!loc.resume) return { ok: true, action: "new", reason: loc.jobFolder ? "no unfinished run for this plan: start a new one" : loc.reason, jobFolder: loc.jobFolder };
    path = loc.resume;
  }
  const rec = loadRecord(path);
  writable(rec, session);
  const ce = addResolution(rec, resolveCe({ registry: input.registry }), session);
  // The session that launched them is gone, so every launch it never swept is swept now.
  const swept = [];
  for (const l of rec.launches) {
    if (l.sweep.done) continue;
    const s = savedResultState(l.savedResult);
    if (l.status === null) l.status = s.finished ? "completed" : `never completed: ${s.why}`;
    sweep(rec, l);
    swept.push(l.id);
  }
  const removed = existsSync(workingPath(rec));
  if (removed) unlinkSync(workingPath(rec));
  const base = { ok: true, record: rec._path, ce: join(rec.dir, ce.file), commit: ce.commit, swept, removedLeftover: removed };
  const done = (answer) => {
    save(rec);
    return { ...base, ...answer };
  };
  if (rec.end) return done({ action: "land", reason: "the run reached its landing: land-check, then land", open: rec.end.open });
  const step = currentStep(rec);
  const at = stagedAt(rec, step);
  if (at === null) {
    save(rec);
    return { ...base, ok: false, action: "stop", reason: `the staged plan matches neither recorded hash, so the run stops: ${hashes(rec, step)}`, step: step.n, stage: step.stage };
  }
  if (at === "target") return done({ action: "advance", step: step.n, stage: step.stage, reason: `step ${step.n}'s fold landed (the staged plan is at its target): record ${step.stage}'s outcome` });
  // From here the staged plan is at the step's before hash, and any fold re-runs from it.
  serve(rec, ce.id, step.stage);
  step.ce = ce.id;
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

// The newest commit touching the plan path, when its message carries this run's record line.
function landedCommit(rec) {
  const out = git(rec.plan.gitRoot, ["log", "-1", "--format=%H%x00%B", "--", literal(rec.plan.rel)], { quiet: [128] });
  if (!out) return null;
  const [sha, body] = out.split("\0");
  return body.includes(recordLine(rec)) ? sha : null;
}

// KTD3 again before landing, and the project-move line (KTD23). A crash after landing's copy but
// before its commit leaves the named path holding the staged plan, which this reads as copied, not
// changed.
export function landCheck(rec) {
  if (!rec.end) fail("the run has not reached its landing");
  if (!existsSync(stagedPath(rec))) fail(`there is no staged plan at ${stagedPath(rec)}`);
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
  if (rec.moved === undefined) fail("run land-check first: the receipt's project-move line comes from it");
  let message = input.message;
  if (typeof message !== "string" || !message.trim()) fail("land needs the commit message, the receipt in it");
  if (!message.includes("\n") && existsSync(typedPath(message, cwd))) message = readFileSync(typedPath(message, cwd), "utf8");
  if (!message.split(/\r?\n/).includes(recordLine(rec))) fail(`the message carries no receipt for this run: it needs the line "${recordLine(rec)}"`);
  const facts = pathFacts(rec.plan.path);
  const blob = stagedBlob(rec);
  const already = facts.headBlob === blob && landedCommit(rec);
  if (already) {
    close(rec, "landed", "landed", { commit: already });
    save(rec);
    return { ok: true, commit: already, reason: "the commit had landed before a crash; the record is closed now" };
  }
  const copied = rec.landing?.copying === blob && facts.worktreeBlob === blob;
  if (!copied) {
    const chk = landingCheck(rec.start, facts);
    if (!chk.ok) {
      rec.landing = { ...(rec.landing ?? {}), refused: { at: stamp(), reason: chk.reason } };
      save(rec);
      return { ok: false, reason: chk.reason, start: chk.start, state: chk.state };
    }
    rec.landing = { copying: blob, at: stamp() };
    save(rec);
    mkdirSync(dirname(rec.plan.path), { recursive: true });
    copyFileSync(stagedPath(rec), rec.plan.path);
  }
  // The message is kept in the run folder, and given to git on stdin ("-F -").
  writeAtomic(join(rec.dir, "landing-message.txt"), message);
  git(rec.plan.gitRoot, ["add", "--", literal(rec.plan.rel)]);
  git(rec.plan.gitRoot, ["commit", "-q", "-F", "-", "--", literal(rec.plan.rel)], { input: message });
  const sha = git(rec.plan.gitRoot, ["rev-parse", "HEAD"]);
  const touched = git(rec.plan.gitRoot, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", "-z", sha]).split("\0").filter(Boolean);
  if (touched.length !== 1 || touched[0] !== rec.plan.rel) fail(`commit ${sha} touched ${touched.join(", ")}, not the plan alone`);
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
  for (const [stage, seats] of Object.entries(ran)) {
    if (!STAGES.includes(stage)) fail(`ran names no stage ${JSON.stringify(stage)}`);
    if (!Array.isArray(seats)) fail(`ran.${stage} is a list of seat keys`);
  }
  if (rec.moved === undefined) fail("run land-check first: the project-move line comes from it");
  const byCommit = new Map();
  for (const c of rec.ce) {
    const key = c.commit ?? "absent";
    const e = byCommit.get(key) ?? { commit: c.commit, stages: [] };
    for (const s of c.stages) if (!e.stages.includes(s)) e.stages.push(s);
    byCommit.set(key, e);
  }
  const ce = [...byCommit.values()].filter((e) => e.stages.length).map((e) => ({ commit: e.commit, stages: STAGES.filter((s) => e.stages.includes(s)) }));
  const inline = [];
  const seen = new Set();
  for (const c of rec.ce) {
    const r = JSON.parse(readFileSync(join(rec.dir, c.file), "utf8"));
    for (const stage of c.stages) {
      for (const s of inlineSeats(r, ran[stage] ?? [])) {
        const k = `${s.seat}\0${s.file}\0${s.commit}`;
        if (!seen.has(k)) {
          seen.add(k);
          inline.push(s);
        }
      }
    }
  }
  return { update: rec.update, ce, inline, strays: [...rec.strays.deleted], moved: rec.moved === null ? null : { changed: rec.moved.changed, cited: rec.moved.cited }, record: tildeOf(rec._path) };
}

// The run's state, for a session picking it up.
export function show(rec) {
  const step = currentStep(rec);
  return {
    record: rec._path, plan: rec.plan.path, state: rec.state, update: rec.update, startedAt: rec.startedAt,
    step: step ? { n: step.n, stage: step.stage, before: step.before, target: step.target, launches: step.launches, outcome: step.outcome } : null,
    end: rec.end, closed: rec.closed, sendBacks: rec.sendBacks, staged: stagedPath(rec), stagedHash: stagedHash(rec),
    ce: rec.ce.map((c) => ({ id: c.id, commit: c.commit, stages: c.stages })), sessions: rec.sessions.map((s) => s.id), windowStop: rec.windowStop, handBack: rec.handBack, warnings: rec.warnings,
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
    process.exit(out && out.ok === false ? 1 : 0);
  } catch (e) {
    console.error(`run-record: ${e.message.replace(/^run-record: /, "")}`);
    process.exit(2);
  }
}
