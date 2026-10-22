#!/usr/bin/env node
// run.mjs: run the platform probes (Q0-Q16) on the installed CLI and record
// what they found.
//
//   node run.mjs [--only Q1,Q2] [--out <dir>]
//   node run.mjs --cleanup <run dir>    delete the throwaway probe sessions
//                                       that run made (transcripts, workspaces)
//
// Each probe answers one question the flow's design relies on, by running
// throwaway headless sessions (lib.mjs) and reading what their hooks saw. It
// returns a verdict:
//   VERIFIED      the CLI behaves as the design assumes
//   CONTRADICTED  it doesn't; the units that depend on it halt (plan, U2)
//   PARTIAL       some arms settled, others need a human or a later unit
//                 (unsettledOnly: true when no settled arm deviates; see
//                 UNSETTLED_OK)
//   INCONCLUSIVE  the instrument couldn't see (a control arm failed)
//   BLOCKED       needs hands or state a headless run can't have
//   ERROR         the probe crashed, failed to load, outran its ceiling, or
//                 returned none of the above
//
// Results go to a private run folder (default
// ~/.claude/flow/probes/<cli version>/<UTC stamp>/): <id>/result.json, the
// captures, <id>/made.json (the folders it made, written as it goes) and
// results.json for the whole run, rewritten after each probe. Nothing here is
// written to the monorepo: captures carry real session ids and paths, so
// --out refuses any folder inside a git work tree.
//
// ~/.claude/flow/probes/passes.json files each version's verdicts as
// {verdict, run, hash, at, seen}, hash being probeHash: the def plus the two
// instrument files it ran on. KTD 10's gate enforces only on a version where
// passedOn(version) returns true: every load-bearing probe (LOAD_BEARING,
// pinned here) VERIFIED by the def, lib.mjs and capture.mjs now on disk;
// passCheck(version) says which probes fail and why. Both re-hash at read
// time, so editing any of those files voids the verdicts it backed until they
// re-run.

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CAPTURE, HERE, cliVersion, gitEnv, sleep } from './lib.mjs';

export const FLOW_PROBES = path.join(os.homedir(), '.claude', 'flow', 'probes');
export const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
export const DEFS = path.join(HERE, 'defs');
const LIB = path.join(HERE, 'lib.mjs');

// Q0-Q16, the plan's probe table. A version can't pass while any of them has
// no probe file.
export const EXPECTED = Array.from({ length: 17 }, (_, i) => `Q${i}`);

// The probes KTD 10's gate rests on. Pinned here, never read from a def's
// own loadBearing flag: an edited flag must not drop a probe from the gate.
// Q11 (resume/fork id stability, which the ledger keys on) stays in it.
export const LOAD_BEARING = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q8', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15'];

export const VERDICTS = ['VERIFIED', 'CONTRADICTED', 'PARTIAL', 'INCONCLUSIVE', 'BLOCKED'];

// The probes whose PARTIAL may say it measured no deviation. Pinned here like
// LOAD_BEARING, so an edited def can't opt itself in. Never Q1, Q2 or Q15:
// their PARTIALs are measured deviations (a Stop context delivered but no
// turn extended, a mixed arm's allow winning, an omitClaudeMd spawn keeping a
// word), and a re-roll to VERIFIED must not pass them.
export const UNSETTLED_OK = ['Q0', 'Q3', 'Q5', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14'];

// Verdicts that measured something. Two of them that differ on one hash are a
// flaky instrument, and the probe fails until its hash (def, lib.mjs or
// capture.mjs) changes: a re-roll must never be how a CONTRADICTED turns into
// a pass.
const MEASURED = ['VERIFIED', 'CONTRADICTED', 'PARTIAL'];

// A PARTIAL counts as measured unless its def returned unsettledOnly: true
// (every open arm unsettled or blocked, every settled one agreeing) and the
// probe is in UNSETTLED_OK. That one measured as little as an INCONCLUSIVE,
// so a VERIFIED after it on one hash is no conflict. A def that forgets the
// flag fails safe: its PARTIAL still counts.
export function measured(r) {
  if (!MEASURED.includes(r.verdict)) return false;
  return !(r.verdict === 'PARTIAL' && r.unsettledOnly === true && UNSETTLED_OK.includes(r.id));
}

// How long a probe may run before the runner gives up on it, unless its def
// sets timeoutMs. Every lib launcher bounds itself; this catches what they
// can't, such as a process tree killTree could not end, whose 'exit' never
// comes. Past it the runner ends its own child processes (endChildren) before
// the next probe starts.
export const PROBE_CEILING_MS = 45 * 60_000;

// {value} once `promise` resolves, or {expired: true} once `ms` pass first;
// rejects as `promise` does. Racing it leaves a handler on `promise`, so a
// rejection that comes after the ceiling is no unhandled one, and the timer
// is cleared whichever side wins.
export function withCeiling(promise, ms) {
  let timer;
  const ceiling = new Promise((resolve) => { timer = setTimeout(() => resolve({ expired: true }), ms); });
  return Promise.race([Promise.resolve(promise).then((value) => ({ value })), ceiling]).finally(() => clearTimeout(timer));
}

// lib.mjs as this process loaded it. A probe's hash names the instrument that
// actually ran, so an edit after start-up reads as a changed def.
const LIB_AT_START = fs.readFileSync(LIB);

// sha256 over a def and the instrument it runs on (every def imports lib.mjs;
// every hook it sets runs capture.mjs). Each part is framed by its name and
// length, so bytes can't shift from one file to the next unseen.
export function hashParts(def, lib, capture) {
  const h = createHash('sha256');
  for (const [name, bytes] of [['def', def], ['lib.mjs', lib], ['capture.mjs', capture]]) h.update(`${name}\0${bytes.length}\0`).update(bytes);
  return h.digest('hex');
}

const instrumentNow = () => ({ lib: fs.readFileSync(LIB), capture: fs.readFileSync(CAPTURE) });

// The hash a def file has now, against lib.mjs and capture.mjs now.
export function probeHash(defFile, inst = instrumentNow()) {
  return hashParts(fs.readFileSync(defFile), inst.lib, inst.capture);
}

const idOf = (f) => `Q${parseInt(f.slice(1), 10)}`;
const byNum = (a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);

// {Q0: <path>, ...}: defs/qNN-<slug>.mjs, the id taken from the file name.
export function defFiles(defs = DEFS) {
  const files = {};
  if (!fs.existsSync(defs)) return files;
  for (const f of fs.readdirSync(defs).filter((x) => /^q\d+.*\.mjs$/.test(x))) {
    const id = idOf(f);
    if (files[id]) throw new Error(`two def files claim ${id}: ${path.basename(files[id])} and ${f}`);
    files[id] = path.join(defs, f);
  }
  return files;
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--only') { a.only = v.split(',').map((s) => s.trim().toUpperCase()); i++; }
    else if (k === '--out') { a.out = v; i++; }
    else if (k === '--cleanup') { a.cleanup = v; i++; }
    else throw new Error(`unknown argument ${k}`);
  }
  return a;
}

// [{id, file, bytes, def}] in id order, bytes being the def as imported (its
// hash input). A def that fails to import comes back with `error` instead and
// is filed as ERROR, never as a crash of this run.
export async function loadProbes(only, { defs = DEFS } = {}) {
  const files = defFiles(defs);
  const unknown = (only ?? []).filter((id) => !files[id]);
  if (unknown.length) throw new Error(`no def file for ${unknown.join(', ')}`);
  const probes = [];
  for (const id of Object.keys(files).filter((x) => !only || only.includes(x)).sort(byNum)) {
    const file = files[id];
    const bytes = fs.readFileSync(file);
    try {
      const def = (await import(pathToFileURL(file).href)).default;
      if (typeof def?.run !== 'function') throw new Error('its default export has no run()');
      if (def.id !== id) throw new Error(`it declares id ${def.id}`);
      probes.push({ id, file, bytes, def });
    } catch (e) {
      console.error(`warning: ${path.basename(file)} did not load (${e.message}); it is filed as ERROR`);
      probes.push({ id, file, bytes, error: e.message });
    }
  }
  return probes;
}

// A probe's result.json. `base` holds what the runner knows (id, question,
// assumption, loadBearing, version, ms, made, hash); the def's object can add
// fields (unsettledOnly, which measured() reads off the record writePasses
// files) but never replace those. A def that returns no verdict, or one
// outside VERDICTS, is filed as ERROR with what it said kept in the summary.
export function recordOf(base, returned) {
  const body = returned && typeof returned === 'object' && !Array.isArray(returned) ? returned : { returned };
  const said = typeof body.summary === 'string' ? body.summary : body.summary === undefined ? '' : JSON.stringify(body.summary);
  const valid = VERDICTS.includes(body.verdict) || (body.verdict === 'ERROR' && base.internal);
  const verdict = valid ? body.verdict : 'ERROR';
  const summary = valid ? said : `the probe returned verdict ${JSON.stringify(body.verdict)}, not one of ${VERDICTS.join(' ')}${said ? `; its summary: ${said}` : ''}`;
  const evidence = Array.isArray(body.evidence) ? body.evidence : body.evidence == null ? [] : [body.evidence];
  const { internal, ...fixed } = base;
  return { ...fixed, ...body, ...fixed, verdict, summary, evidence };
}

// null for a missing, unreadable or torn file: the callers fall back.
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// The folders a probe recorded: result.json's `made` and the made.json that
// arm()/track() keep as they go (all a crashed probe leaves).
function madeIn(runDir) {
  const lists = [];
  for (const r of readJson(path.join(runDir, 'results.json'))?.results ?? []) lists.push(r.made);
  for (const d of fs.existsSync(runDir) ? fs.readdirSync(runDir, { withFileTypes: true }) : []) {
    if (!d.isDirectory()) continue;
    lists.push(readJson(path.join(runDir, d.name, 'result.json'))?.made, readJson(path.join(runDir, d.name, 'made.json')));
  }
  return [...new Set(lists.filter(Array.isArray).flat().filter((x) => typeof x === 'string'))];
}

// Claude Code's project-folder name for a cwd: every non-alphanumeric
// character becomes '-'.
const slug = (p) => p.replace(/[^A-Za-z0-9]/g, '-');

// A name or path as the file system compares it: case-blind on Windows.
const fold = (s) => (process.platform === 'win32' ? s.toLowerCase() : s);

// Only folders a probe made: a workspace is <tmp>/claude-probe-*, and its
// transcripts live in <projects>/<slug of that workspace, or of a folder in
// it>. Anything else a run folder lists (a look-alike elsewhere, the roots
// themselves, a nested path) is never a target. A listed workspace's own
// folders are also found by name, listed or not: a crash or an arm whose hooks
// never fired lists no transcript folder, and a session started in a folder
// inside the workspace (Q0's <ws>/repo) gets one named <slug of ws>-<rest>.
// The same two names hold each session's task output (background shell logs,
// the scratchpad) under the CLI's temp root, <tasks>: on Windows
// %TEMP%\claude\<slug of cwd>\<session id>\ (claude-directory.md; the Linux
// and macOS CLIs use a claude-<uid> folder, so pass `tasks` there). That root
// also holds every live session's folder, so nothing in it is a target unless
// its name derives from a workspace a run listed. The CLI's per-cwd cache,
// <cache>, follows the same naming and holds an MCP server's logs
// (mcp-logs-<server>), which Q15's probe-local stub server leaves: on Windows
// %LOCALAPPDATA%\claude-cli-nodejs\Cache (seen on disk; elsewhere pass `cache`).
const CLI_CACHE = process.platform === 'win32' && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'claude-cli-nodejs', 'Cache') : null;
export function cleanupTargets(runDir, { projects = PROJECTS, tmp = os.tmpdir(), tasks = path.join(tmp, 'claude'), cache = CLI_CACHE } = {}) {
  const tmpAbs = path.resolve(tmp);
  const projAbs = path.resolve(projects);
  const prefix = `${slug(tmpAbs)}-claude-probe-`;
  const listed = madeIn(runDir).filter((d) => {
    const abs = path.resolve(d);
    const base = path.basename(abs);
    const inTmp = path.dirname(abs) === tmpAbs && base.startsWith('claude-probe-');
    const inProjects = path.dirname(abs) === projAbs && base.startsWith(prefix);
    return inTmp || inProjects;
  });
  const workspaces = listed.filter((d) => path.dirname(path.resolve(d)) === tmpAbs).map((d) => fold(slug(path.resolve(d))));
  const named = (root) => {
    let names = [];
    try { names = workspaces.length ? fs.readdirSync(root) : []; } catch { /* no such root */ }
    return names.filter((n) => workspaces.some((w) => fold(n) === w || fold(n).startsWith(`${w}-`))).map((n) => path.join(root, n));
  };
  // One entry per folder, however its listing spelled it (drive-letter case).
  const targets = new Map();
  for (const d of [...listed, ...named(projAbs), ...named(path.resolve(tasks)), ...(cache ? named(path.resolve(cache)) : [])]) {
    const key = fold(path.resolve(d));
    if (!targets.has(key)) targets.set(key, d);
  }
  return [...targets.values()];
}

// An exclusive lock beside `target`, holding its owner's token. Contention is
// EEXIST, or EPERM/EACCES while Windows still has a deleted lock pending. The
// critical sections take well under a second, so a lock older than staleMs is
// a crashed owner's; it is broken by renaming it aside and checking that the
// file moved is the one judged stale, so two waiters can't both break it and
// one delete the other's fresh lock. The wait outlasts the stale age, and only
// the owner's token removes the lock.
export async function withLock(target, fn, { waitMs = 90_000, staleMs = 30_000 } = {}) {
  const lock = `${target}.lock`;
  const token = `${process.pid}.${randomBytes(8).toString('hex')}`;
  const t0 = Date.now();
  for (;;) {
    try {
      fs.writeFileSync(lock, token, { flag: 'wx' });
      break;
    } catch (e) {
      if (!['EEXIST', 'EPERM', 'EACCES'].includes(e.code)) throw e;
      breakIfStale(lock, staleMs);
      if (Date.now() - t0 > waitMs) throw new Error(`${lock} held for over ${Math.round(waitMs / 1000)} s (last ${e.code})`);
      await sleep(100);
    }
  }
  try {
    return await fn();
  } finally {
    try {
      if (fs.readFileSync(lock, 'utf8') === token) fs.rmSync(lock, { force: true });
    } catch { /* gone: broken as stale */ }
  }
}

function breakIfStale(lock, staleMs) {
  let seen;
  let st;
  try {
    seen = fs.readFileSync(lock, 'utf8');
    st = fs.statSync(lock);
  } catch {
    return;
  }
  if (Date.now() - st.mtimeMs <= staleMs) return;
  const aside = `${lock}.${process.pid}.${randomBytes(4).toString('hex')}.stale`;
  try { fs.renameSync(lock, aside); } catch { return; }
  let moved = null;
  try { moved = fs.readFileSync(aside, 'utf8'); } catch { /* unreadable: treat as not ours */ }
  if (moved !== seen) {
    // A fresh lock taken after our look: hand it back if its slot is still free.
    try { fs.linkSync(aside, lock); } catch { /* the slot is taken again */ }
  }
  fs.rmSync(aside, { force: true });
}

// Write `file` whole or not at all (a reader never sees half of it).
export async function replaceFile(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  for (let i = 0; ; i++) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (e) {
      // Windows refuses the rename while another program holds the file open.
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(e.code) || i >= 20) throw e;
      await sleep(100);
    }
  }
}

const readPasses = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});

// A version's {Q1: {verdict, run, hash, at, seen}} map. An entry filed before
// hashing ({verdicts, runs}) comes back with hash null, which never counts.
export function probesOf(entry) {
  if (!entry) return {};
  if (entry.probes) return entry.probes;
  return Object.fromEntries(Object.entries(entry.verdicts ?? {}).map(([id, verdict]) => [id, { verdict, run: entry.runs?.[id] ?? null, hash: null, at: null, seen: [] }]));
}

// Why one probe's filed verdict doesn't count (null when it does): missing
// def, not run, recorded before hashing, def changed since its verdict,
// verdicts disagree on the same def, not VERIFIED.
export function judge(e, defFile, inst = instrumentNow()) {
  if (!defFile) return 'missing def';
  if (!e) return 'not run';
  if (!e.hash) return 'recorded before hashing';
  if (e.hash !== probeHash(defFile, inst)) return 'def changed since its verdict';
  if ((e.seen ?? []).length > 1) return 'verdicts disagree on the same def';
  if (e.verdict !== 'VERIFIED') return 'not VERIFIED';
  return null;
}

// {passed, failing: [{id, why, verdict?}]} for a version's probes map,
// against the files on disk now. Every EXPECTED probe needs a def; every
// LOAD_BEARING one needs a VERIFIED verdict whose hash still matches. Throws
// on two defs claiming one id: callers go through passCheck.
function evaluate(probes, { defs = DEFS } = {}) {
  const files = defFiles(defs);
  const inst = instrumentNow();
  const failing = [];
  for (const id of EXPECTED) {
    if (!files[id]) failing.push({ id, why: 'missing def' });
    else if (LOAD_BEARING.includes(id)) {
      const why = judge(probes[id], files[id], inst);
      if (why) failing.push({ id, why, ...(probes[id] ? { verdict: probes[id].verdict } : {}) });
    }
  }
  return { passed: failing.length === 0, failing };
}

// KTD 10's check in full: {passed, failing: [{id, why, verdict?}]} for
// `version` with the defs and instrument on disk NOW, never passes.json's
// stored loadBearingPassed, which is only true as of its filing. It fails
// closed and never throws: whatever stops the check (two defs claiming one id,
// an unreadable passes.json) comes back as a failing {id: '*', why}. `passes`
// is a passes.json object already in hand (writePasses and report.mjs read it
// under the lock); without it the file under `root` is read.
export function passCheck(version, { root = FLOW_PROBES, defs = DEFS, passes } = {}) {
  try {
    return evaluate(probesOf((passes ?? readPasses(path.join(root, 'passes.json')))[version]), { defs });
  } catch (e) {
    return { passed: false, failing: [{ id: '*', why: e.message }] };
  }
}

// KTD 10's predicate: true only when passCheck(version) passes. The gate
// enforces only on a version where this returns true.
export function passedOn(version, opts) {
  return passCheck(version, opts).passed;
}

function filed(prev, r, run, at) {
  const same = !!prev?.hash && prev.hash === r.hash;
  const seen = new Set(same ? prev.seen ?? [] : []);
  if (measured(r)) seen.add(r.verdict);
  return { verdict: r.verdict, run, hash: r.hash ?? null, at, seen: [...seen] };
}

// File this run's results under `version` in <root>/passes.json, under its
// lock (runs overlap, one per probe group), and record loadBearingPassed from
// passCheck() as of now. Returns the version's entry.
export async function writePasses(version, runDir, results, { root = FLOW_PROBES, defs = DEFS } = {}) {
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, 'passes.json');
  return withLock(file, async () => {
    const passes = readPasses(file);
    const probes = { ...probesOf(passes[version]) };
    const at = new Date().toISOString();
    for (const r of results) probes[r.id] = filed(probes[r.id], r, runDir, at);
    const entry = { updatedAt: at, probes, loadBearing: LOAD_BEARING };
    const { passed, failing } = passCheck(version, { defs, passes: { [version]: entry } });
    passes[version] = { ...entry, loadBearingPassed: passed, failing };
    await replaceFile(file, `${JSON.stringify(passes, null, 2)}\n`);
    return passes[version];
  });
}

// 'outside' a git work tree, 'ignored' by the repo it is in, or 'visible'. It
// fails closed: git's "not a work tree" reads as 'outside' only when no
// ancestor of the folder holds a .git entry either, so a repo git refuses to
// read (dubious ownership, a .git file naming a gone gitdir, a ceiling
// variable, corruption) throws instead of passing, as does a folder inside a
// .git dir (git says 'false' there). 'ignored' needs git to ignore both
// results.json and a random extensionless name in the folder: a pattern on
// the folder or '*' covers both, while a name-only one (results.json,
// *.json) hides that one file and leaves the captures beside it committable.
export function gitView(dir) {
  const abs = path.resolve(dir);
  let at = abs;
  while (!fs.existsSync(at) && path.dirname(at) !== at) at = path.dirname(at);
  const git = (args) => spawnSync('git', ['-C', at, ...args], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true, timeout: 30_000 });
  const inside = git(['rev-parse', '--is-inside-work-tree']);
  if (inside.error) throw new Error(`git could not be run to check ${abs}: ${inside.error.message}`);
  const said = inside.stdout.trim();
  if (inside.status === 0 && said === 'true') {
    const ignored = (name) => git(['check-ignore', '-q', '--no-index', path.join(abs, name)]).status === 0;
    return ignored('results.json') && ignored(`probe-${randomBytes(6).toString('hex')}`) ? 'ignored' : 'visible';
  }
  if (inside.status === 0 && said === 'false') throw new Error(`${abs} is inside a git directory (a .git folder or a bare repo), not a work tree; pick a folder outside every repo`);
  for (let d = abs; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) throw new Error(`git could not tell whether ${abs} is in a work tree (exit ${inside.status}): ${(inside.stderr || said).trim()}`);
    if (path.dirname(d) === d) return 'outside';
  }
}

function cleanup(runDir) {
  const targets = cleanupTargets(runDir);
  const doomed = new Set(targets.map((t) => fold(path.resolve(t))));
  for (const d of madeIn(runDir).filter((x) => !doomed.has(fold(path.resolve(x))))) console.log(`kept ${d} (not a probe workspace or transcript folder)`);
  let failed = 0;
  for (const d of targets) {
    try {
      fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 });
      console.log(`deleted ${d}`);
    } catch (e) {
      failed++;
      console.error(`could not delete ${d}: ${e.code || e.message}`);
    }
  }
  if (failed) {
    console.error(`${failed} of ${targets.length} folders were not deleted; run --cleanup again once nothing holds them`);
    process.exitCode = 1;
  }
}

// A def's own timeoutMs when it is a usable timer length, else the default.
const ceilingOf = (def) => (Number.isFinite(def.timeoutMs) && def.timeoutMs > 0 && def.timeoutMs < 2 ** 31 ? def.timeoutMs : PROBE_CEILING_MS);

// When this process started, by the wall clock a process listing reports in.
const RUNNER_START_MS = Date.now() - process.uptime() * 1000;

// Win32_Process rows as PowerShell's ConvertTo-Json prints them (one object
// alone, an array for several, nothing for none): [{pid, ppid, name,
// startMs}]. Throws on output that is not JSON.
export function parseCimProcesses(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  const v = JSON.parse(t);
  return (Array.isArray(v) ? v : [v])
    .filter((p) => Number.isInteger(p?.ProcessId) && Number.isInteger(p?.ParentProcessId))
    .map((p) => ({ pid: p.ProcessId, ppid: p.ParentProcessId, name: String(p.Name ?? ''), startMs: Number.isFinite(p.StartMs) ? p.StartMs : null }));
}

// `ps -A -o pid=,ppid=,comm=` lines: [{pid, ppid, name, startMs: null}].
export function parsePsProcesses(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*?)\s*$/.exec(line);
    if (m) out.push({ pid: Number(m[1]), ppid: Number(m[2]), name: m[3], startMs: null });
  }
  return out;
}

// The rows that are `parent`'s own children: {children} to end, {undated} to
// name and leave running. Windows keeps a dead parent's pid on its orphans,
// so a row the listing dates before `since` (this runner's start) names a
// reused pid and is someone else's, and a row a dated listing (CIM's
// CreationDate) could not date may be one too, whose tree taskkill /T would
// take whole. ps dates no row (`dated: false`) and POSIX re-parents an orphan,
// so there an undated row is this runner's own. The default reads a listing
// as dated: a caller that forgets the flag leaves more running, never ends
// more. Never `skip` (the lister itself) or a console host, which ending would
// take this runner's console with it.
export function childrenOf(procs, { parent, since = -Infinity, skip = [], dated = true }) {
  const own = procs.filter((p) => p.ppid === parent && !skip.includes(p.pid) && !/^conhost(\.exe)?$/i.test(p.name));
  const undated = dated ? own.filter((p) => p.startMs === null) : [];
  return { children: own.filter((p) => !undated.includes(p) && (p.startMs === null || p.startMs >= since)), undated };
}

// `pid` and every process under it in a listing, parents first.
export function treeOf(procs, pid) {
  const tree = [pid];
  for (let i = 0; i < tree.length; i++) for (const p of procs) if (p.ppid === tree[i] && !tree.includes(p.pid)) tree.push(p.pid);
  return tree;
}

// childrenOf's two lists as endChildren's rows, [{pid, name, ended, left?}]:
// each child goes through `end` (true once it is gone); an undated one is
// never tried, and `left` says why.
export function endEach({ children, undated }, end) {
  return [
    ...children.map((p) => ({ pid: p.pid, name: p.name, ended: end(p) })),
    ...undated.map((p) => ({ pid: p.pid, name: p.name, ended: false, left: 'the listing gave no creation time, so its parent id may be one an earlier process held' })),
  ];
}

// End every direct child of this runner, tree and all: what a probe past its
// ceiling left running would otherwise run beside the next probe. Returns
// endEach's rows; throws when the processes can't be listed. Windows lists
// them by ParentProcessId and ends each with taskkill /T /F, as lib's
// killTree does, except a row it gave no creation time; elsewhere one ps
// listing gives each child's tree, which gets SIGKILL. Neither reaches a
// grandchild whose parent already died (a hook or Bash child of a claude.exe
// that exited), and the probe's own code may go on to start more, so the
// advice to wait before --cleanup stays.
export function endChildren({ parent = process.pid, since = RUNNER_START_MS } = {}) {
  // It lands in a PowerShell command line, so a pid it is.
  if (!Number.isInteger(parent) || parent <= 0) throw new Error(`endChildren needs a process id, not ${JSON.stringify(parent)}`);
  const sh = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000, maxBuffer: 16 * 1024 * 1024 });
  const listed = (r, what) => {
    if (r.error || (r.status !== 0 && !r.stdout.trim())) throw new Error(`${what} could not list this runner's child processes: ${r.error?.message || r.stderr.trim() || `exit ${r.status}`}`);
    return r;
  };
  if (process.platform === 'win32') {
    const query = `Get-CimInstance Win32_Process -Filter "ParentProcessId=${parent}" | Select-Object ProcessId,ParentProcessId,Name,@{n='StartMs';e={([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds()}} | ConvertTo-Json -Compress`;
    const r = listed(sh('powershell', ['-NoProfile', '-NonInteractive', '-Command', query]), 'powershell');
    const found = childrenOf(parseCimProcesses(r.stdout), { parent, since, skip: [r.pid] });
    return endEach(found, (p) => sh('taskkill', ['/pid', String(p.pid), '/T', '/F']).status === 0);
  }
  const r = listed(sh('ps', ['-A', '-o', 'pid=,ppid=,comm=']), 'ps');
  const procs = parsePsProcesses(r.stdout);
  return endEach(childrenOf(procs, { parent, since, skip: [r.pid], dated: false }), (p) => {
    let ended = true;
    for (const pid of treeOf(procs, p.pid)) {
      try { process.kill(pid, 'SIGKILL'); } catch { if (pid === p.pid) ended = false; }
    }
    return ended;
  });
}

// endChildren()'s rows as one evidence line, a child left running named with
// its reason, so a hung probe's record says what may still run.
export function leftoversSaid(rows) {
  if (!rows.length) return 'no child process of this runner was still running';
  return `this runner's child processes: ${rows.map((c) => `${c.name} pid ${c.pid} ${c.left ? `left running (${c.left})` : c.ended ? 'ended' : 'could not be ended'}`).join('; ')}`;
}

// endChildren() for a probe that outran its ceiling, said on stderr and
// returned as an evidence line; never fatal, since the run goes on either way.
function endLeftovers(id) {
  let said;
  try {
    said = leftoversSaid(endChildren());
  } catch (e) {
    said = `could not end its processes: ${e.message}`;
  }
  console.error(`${id} outran its ceiling; ${said}`);
  return said;
}

// `hung` collects the probes that outran their ceiling, for the caller.
async function main(hung) {
  const args = parseArgs(process.argv.slice(2));
  if (args.cleanup) return cleanup(args.cleanup);
  const version = cliVersion();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Captures hold real session ids and paths: an --out folder may sit in no
  // git work tree at all (ignored is one `git add -f` away), and the default
  // only where git ignores it (~/.claude is a repo on some machines).
  if (args.out && gitView(args.out) !== 'outside') throw new Error(`--out ${args.out} is inside a git work tree; captures hold real session ids and paths, so pick a folder outside every repo`);
  const runDir = path.resolve(args.out || path.join(FLOW_PROBES, version, stamp));
  if (!args.out && gitView(runDir) === 'visible') throw new Error(`${runDir} is inside a git work tree that does not ignore it; pass --out with a folder outside every repo`);
  fs.mkdirSync(runDir, { recursive: true });
  const probes = await loadProbes(args.only);
  for (const p of probes.filter((x) => x.def && !!x.def.loadBearing !== LOAD_BEARING.includes(x.id))) {
    console.error(`warning: ${p.id}'s def says loadBearing ${!!p.def.loadBearing}, but run.mjs pins it ${LOAD_BEARING.includes(p.id)} (LOAD_BEARING), and the pin is what counts`);
  }
  const at = new Date().toISOString();
  const results = [];
  const save = (extra = {}) => fs.writeFileSync(path.join(runDir, 'results.json'), `${JSON.stringify({ version, at, complete: false, results, ...extra }, null, 2)}\n`);
  save();
  for (const [i, p] of probes.entries()) {
    const out = path.join(runDir, p.id);
    fs.mkdirSync(out, { recursive: true });
    const ctx = { id: p.id, out, version, made: [] };
    const hash = hashParts(p.bytes, LIB_AT_START, fs.readFileSync(CAPTURE));
    const t0 = Date.now();
    let r;
    let internal = false;
    if (p.error) {
      r = { verdict: 'ERROR', summary: `the def did not load: ${p.error}`, evidence: [] };
      internal = true;
    } else {
      const limit = ceilingOf(p.def);
      try {
        const got = await withCeiling(p.def.run(ctx), limit);
        if (got.expired) {
          // Its sessions end before the next probe starts, not beside it.
          r = { verdict: 'ERROR', summary: `${p.id} did not finish in ${Math.round(limit / 6_000) / 10} min; it may still be running`, evidence: [endLeftovers(p.id)] };
          internal = true;
          hung.push(p.id);
        } else {
          r = got.value;
        }
      } catch (e) {
        r = { verdict: 'ERROR', summary: `the probe crashed: ${e.stack || e}`, evidence: [] };
        internal = true;
      }
    }
    const onDisk = readJson(path.join(out, 'made.json'));
    const made = [...new Set([...ctx.made, ...(Array.isArray(onDisk) ? onDisk : [])])];
    const rec = recordOf({ id: p.id, question: p.def?.question ?? '', assumption: p.def?.assumption ?? '', loadBearing: LOAD_BEARING.includes(p.id), version, ms: Date.now() - t0, made, hash, internal }, r);
    fs.writeFileSync(path.join(out, 'result.json'), `${JSON.stringify(rec, null, 2)}\n`);
    results.push(rec);
    save();
    console.log(`${p.id.padEnd(4)} ${rec.verdict.padEnd(13)} ${rec.summary.split('\n')[0]}`);
    if (i < probes.length - 1) await sleep(2000);
  }
  // A CLI that updated itself mid-run ran some probes on one version and
  // some on another: nothing from this run is filed under either.
  let after;
  try { after = cliVersion(); } catch (e) { after = `unreadable (${e.message})`; }
  save({ complete: true, versionAfter: after, ...(after === version ? {} : { invalid: true }) });
  console.log(`\nrun: ${runDir}`);
  if (after !== version) {
    console.error(`INVALID RUN: the CLI went from ${version} to ${after} during it; passes.json was not updated. Re-run the probes.`);
    process.exitCode = 1;
    return;
  }
  const pass = await writePasses(version, runDir, results);
  console.log(`load-bearing on ${version}: ${pass.loadBearingPassed ? 'all VERIFIED' : `not yet (${pass.failing.map((f) => `${f.id} ${f.why === 'not VERIFIED' ? f.verdict : f.why}`).join(', ')})`}`);
}

// import.meta.main (Node >= 24.2) is false when report.mjs or a test imports
// this file, and true through a symlink or junction, where comparing argv[1]
// with this file's URL is not.
if (import.meta.main) {
  const hung = [];
  main(hung).catch((e) => {
    console.error(e.stack || e);
    process.exitCode = 1;
  }).then(() => {
    if (!hung.length) return;
    // A probe past its ceiling still holds whatever kept it waiting, which
    // would hold this process open for good: exit once this run is filed and
    // the output is flushed.
    console.error(`${hung.join(', ')} outran the probe ceiling and may still be running; exiting now. Run --cleanup on this run once nothing holds its folders.`);
    process.exitCode = 1;
    process.stdout.write('', () => process.stderr.write('', () => process.exit()));
  });
}
