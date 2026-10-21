#!/usr/bin/env node
// peers.mjs: list the other live Claude Code sessions, on our git toplevel and
// on the whole machine.
//
//   node peers.mjs [--self-session <id>] [--toplevel <path>]
//
// Reads the native session registry (~/.claude/sessions/<pid>.json, or
// SQUEAKY_SESSIONS_DIR). The registry must describe this session: CLAUDE_PID's
// entry, else one carrying our session id, parsed and alive, with a start time
// matching the running process where that can be checked. Without one the
// answer is ok:false: a registry that changed its layout or its procStart
// units must never read as "nobody else is here", and neither may a file
// name that isn't <pid>.json or its <pid>.<hex>.key (ok:false). Excludes
// ourselves and dead pids. A live pid whose procStart doesn't match within
// 10 s (a recycled pid, or a peer on another version writing other units)
// stays, as status 'unverified', with a warning: it counts as live and busy.
//
// stdout (always exit 0):
//   {ok:true, peers, busyPeer, others, anyOtherLive, busyAnywhere, twin, warnings}
//     peers         [{pid, session, name, status, cwd, idleMinutes}]: the live
//                   sessions in our git toplevel. One whose folder can't be
//                   resolved (no cwd, a folder that is gone, git won't start) is
//                   a peer with status 'unresolved', counted busy.
//     busyPeer      some peer isn't idle
//     others        [{pid, session, name, status, cwd}]: every other live session
//                   on the machine, in any folder
//     anyOtherLive  others isn't empty: idle, busy, unreadable or unresolved
//     busyAnywhere  some session in others isn't idle
//     twin          another live process runs under our session id (a resumed
//                   copy). A readable entry that proves one makes it true;
//                   with none proven it is null (unknown) when no session id
//                   was given or a live registry entry can't be read, which
//                   SKILL.md treats like ok:false
//   {ok:false, assumePeer:true, peers:[], busyPeer:true, others:[],
//    anyOtherLive:true, busyAnywhere:true, twin:null, warnings:[error], error}
//                 couldn't check (registry unreadable or not describing this
//                 session, no toplevel, bad arguments): the gates read as the
//                 worst case, and twin is unknown (null), never false
//
// Never prints messagingSocketPath or bridgeSessionId.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonAbs, isMain, parseArgs, runGit, toplevelOf } from './lib.mjs';

const START_TOLERANCE_TICKS = 100_000_000n; // 10 s in 100 ns FILETIME ticks

// Couldn't check. The gates read as the worst case (a busy peer, a live
// session elsewhere); whether a twin runs is unknown, so twin is null and
// SKILL.md asks Briggsy.
const unknown = (error) => ({
  ok: false, assumePeer: true, peers: [], busyPeer: true, others: [], anyOtherLive: true, busyAnywhere: true, twin: null, warnings: [error], error,
});

export function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if (e && e.code === 'ESRCH') return false;
    return true; // EPERM and anything unknown: alive is the conservative answer
  }
}

// One batched PowerShell call: pid -> StartTime as FILETIME (BigInt).
// Returns null when the lookup can't run; callers then keep every entry.
export function processStartTimes(pids) {
  if (process.platform !== 'win32' || pids.length === 0) return null;
  const exe = process.env.SQUEAKY_POWERSHELL || 'powershell.exe';
  // The pid list travels in an env var, never in the command text.
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$ids = @($env:SQUEAKY_PIDS -split ',' | Where-Object { $_ -match '^[0-9]+$' } | ForEach-Object { [int]$_ })",
    'Get-Process -Id $ids -ErrorAction SilentlyContinue | ForEach-Object {',
    "  try { '{0} {1}' -f $_.Id, $_.StartTime.ToFileTimeUtc() } catch { }",
    '}',
  ].join('\n');
  const r = spawnSync(exe, ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, SQUEAKY_PIDS: pids.join(',') },
    shell: false,
    windowsHide: true,
    encoding: 'utf8',
    timeout: 30_000,
  });
  // Get-Process exits non-zero when any one pid is gone; the lines it did
  // print still hold. Only no lines at all means the lookup failed.
  if (r.error || typeof r.stdout !== 'string') return null;
  const map = new Map();
  for (const line of r.stdout.split(/\r?\n/)) {
    const m = /^\s*(\d+)\s+(\d+)\s*$/.exec(line);
    if (m) map.set(Number(m[1]), BigInt(m[2]));
  }
  return map.size ? map : null;
}

function parseProcStart(v) {
  if (typeof v === 'number' && Number.isSafeInteger(v) && v > 0) return BigInt(v);
  if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
  return null;
}

function idleMinutes(entry, now) {
  if (entry.status !== 'idle') return null;
  const t = Number.isFinite(entry.statusUpdatedAt) ? entry.statusUpdatedAt
    : Number.isFinite(entry.updatedAt) ? entry.updatedAt : null;
  if (t === null) return null;
  return Math.max(0, Math.floor((now - t) / 60_000));
}

// Where a session's folder sits in git: {top}, {notRepo: true}, or
// {unresolved: why}. Only git's own "not a git repository", about a folder
// that exists, takes a session out of the git scope; any other failure (a
// dubious-ownership refusal, a cwd inside .git) counts it as a busy peer. Git
// runs in the C locale so that message is never translated.
function locate(cwd) {
  if (cwd === null) return { unresolved: 'its registry entry has no cwd' };
  if (!path.isAbsolute(cwd)) return { unresolved: `its cwd ${cwd} is not an absolute path` };
  let st;
  try { st = fs.statSync(cwd); } catch (e) { return { unresolved: `its cwd ${cwd} can't be read (${e.code || e.message})` }; }
  if (!st.isDirectory()) return { unresolved: `its cwd ${cwd} is not a folder` };
  const r = runGit(['-C', cwd, 'rev-parse', '--show-toplevel'], { env: { LC_ALL: 'C', LANGUAGE: 'C' } });
  if (r.error) return { unresolved: `git could not run (${r.error.code || r.error.message})` };
  if (r.status !== 0) {
    if (/not a git repository/i.test(r.stderr)) return { notRepo: true };
    return { unresolved: `git rev-parse failed there (${r.stderr.trim().split('\n')[0] || `exit ${r.status}`})` };
  }
  const top = r.stdout.trim();
  return top ? { top: canonAbs(top) } : { unresolved: 'git named no toplevel' };
}

// Where the registry lives, and the pid CLAUDE_PID names (0 when unset).
export const registryDir = () => process.env.SQUEAKY_SESSIONS_DIR || path.join(os.homedir(), '.claude', 'sessions');
export const envSelfPid = () => (/^\d+$/.test(process.env.CLAUDE_PID || '') ? Number(process.env.CLAUDE_PID) : 0);

// The registry as this session sees it: every live entry (unreadable ones as
// entry null), the start-time check, and our own entry. {error} when it can't
// describe this session.
function readRegistry({ sessionsDir, selfSession, selfPid }) {
  const warnings = [];
  let names;
  try {
    names = fs.readdirSync(sessionsDir);
  } catch (e) {
    return { error: `session registry unreadable: ${e.code || e.message}` };
  }
  if (!selfSession && !selfPid) return { error: 'registry does not describe this session: no session id and no CLAUDE_PID to find it by' };

  const candidates = [];
  for (const name of names.sort()) {
    const m = /^(\d+)\.json$/.exec(name);
    if (!m) {
      // A <pid>.<hex>.key file sits beside its entry and is never read. Any
      // other name may mean the registry's layout changed.
      if (!/^\d+\.[^.]+\.key$/.test(name)) return { error: `registry file ${name} is not a <pid>.json entry: the registry's layout may have changed` };
      continue;
    }
    const filePid = Number(m[1]);
    let entry = null;
    try {
      entry = JSON.parse(fs.readFileSync(path.join(sessionsDir, name), 'utf8'));
      if (!entry || typeof entry !== 'object') entry = null;
    } catch {
      entry = null;
    }
    const pid = entry && Number.isSafeInteger(entry.pid) && entry.pid > 0 ? entry.pid : filePid;
    if (!pidAlive(pid)) continue;
    candidates.push({ pid, entry });
  }

  // One batched start-time lookup for every candidate with a procStart, our
  // own entry included.
  const withStart = candidates.filter((c) => c.entry && parseProcStart(c.entry.procStart) !== null);
  const starts = processStartTimes(withStart.map((c) => c.pid));
  if (withStart.length && starts === null && process.platform === 'win32') {
    warnings.push('process start-time lookup failed: kept every live pid');
  }
  // 'match', 'mismatch' (a recycled pid) or 'unchecked'.
  const startCheck = (c) => {
    if (!starts || !c.entry) return 'unchecked';
    const want = parseProcStart(c.entry.procStart);
    const got = starts.get(c.pid);
    if (want === null || got === undefined) return 'unchecked';
    const diff = got > want ? got - want : want - got;
    return diff <= START_TOLERANCE_TICKS ? 'match' : 'mismatch';
  };

  // This session's own entry must be there. Where the lookup ran, its start
  // time must match: a procStart that moved units or went missing is a
  // registry we can't read.
  const ours = (entry) => Boolean(selfSession) && Boolean(entry) && entry.sessionId === selfSession;
  const isSelf = (c) => (selfPid ? c.pid === selfPid : ours(c.entry));
  const selfOk = (c) => c.entry && (starts ? startCheck(c) === 'match' : true);
  const selves = candidates.filter((c) => isSelf(c) && selfOk(c));
  if (!selves.length) return { error: 'registry does not describe this session: no live entry for it with a matching start time' };
  return { warnings, candidates, startCheck, ours, isSelf, selves };
}

// This session's own registry entry: CLAUDE_PID's, else the one live entry
// carrying our session id, its start time checked. null when the registry
// can't say, or when two live entries carry our id with no CLAUDE_PID to tell
// which is us.
export function selfEntry({ sessionsDir = registryDir(), selfSession, selfPid = envSelfPid() }) {
  const reg = readRegistry({ sessionsDir, selfSession, selfPid });
  return reg.error || reg.selves.length !== 1 ? null : reg.selves[0].entry;
}

export function listPeers({
  sessionsDir,
  selfSession,
  selfPid,
  toplevel,
  now = Date.now(),
}) {
  const reg = readRegistry({ sessionsDir, selfSession, selfPid });
  if (reg.error) return unknown(reg.error);
  const { warnings, candidates, startCheck, ours, isSelf } = reg;
  const alive = candidates.filter((c) => !(isSelf(c) && selfPid)); // ourselves, by CLAUDE_PID
  for (const c of alive) {
    if (startCheck(c) === 'mismatch') warnings.push(`pid ${c.pid} unverified: its registry start time doesn't match the live process (a recycled pid, or a peer writing other units): counted as a live, busy session`);
  }

  // A twin is our session id on another live process: the session resumed in a
  // second terminal. With CLAUDE_PID that is any other entry carrying our id;
  // without it one such entry is presumably us, so it takes two. Twins all
  // stay listed then, since which one is us can't be told. A twin a readable
  // entry proves is true whatever else the registry holds; with none proven,
  // no session id to compare or a live entry we can't read leaves it unknown.
  const sameId = alive.filter((c) => ours(c.entry)).length;
  const proven = selfPid ? sameId > 0 : sameId >= 2;
  const twin = !selfSession ? null : proven ? true : alive.some((c) => !c.entry) ? null : false;
  const rest = selfPid || twin ? alive : alive.filter((c) => !ours(c.entry));

  const tops = new Map();
  const peers = [];
  const others = [];
  for (const c of rest) {
    const { pid, entry } = c;
    if (!entry) {
      others.push({ pid, session: null, name: null, status: 'unreadable', cwd: null });
      peers.push({ pid, session: null, name: null, status: 'unreadable', cwd: null, idleMinutes: null });
      warnings.push(`registry entry for pid ${pid} is unreadable: counted as a busy peer`);
      continue;
    }
    const cwd = typeof entry.cwd === 'string' && entry.cwd ? entry.cwd : null;
    if (!tops.has(cwd)) tops.set(cwd, locate(cwd));
    const where = tops.get(cwd);
    const row = {
      pid,
      session: typeof entry.sessionId === 'string' ? entry.sessionId.slice(0, 8) : null,
      name: typeof entry.name === 'string' ? entry.name : null,
      status: where.unresolved ? 'unresolved' : startCheck(c) === 'mismatch' ? 'unverified' : typeof entry.status === 'string' ? entry.status : 'unknown',
      cwd,
    };
    if (ours(entry)) row.twin = true;
    others.push(row);
    if (where.unresolved) warnings.push(`pid ${pid}: ${where.unresolved}: counted as a busy peer`);
    if (where.unresolved || where.top === toplevel) peers.push({ ...row, idleMinutes: idleMinutes(entry, now) });
  }
  const byPid = (a, b) => a.pid - b.pid;
  peers.sort(byPid);
  others.sort(byPid);
  return {
    ok: true,
    peers,
    busyPeer: peers.some((p) => p.status !== 'idle'),
    others,
    anyOtherLive: others.length > 0,
    busyAnywhere: others.some((o) => o.status !== 'idle'),
    twin,
    warnings,
  };
}

function main() {
  let out;
  try {
    const args = parseArgs(process.argv.slice(2), { known: ['self-session', 'toplevel'] });
    const sessionsDir = registryDir();
    const selfSession = args['self-session'] || process.env.CLAUDE_CODE_SESSION_ID || '';
    const selfPid = envSelfPid();
    let toplevel;
    if (args.toplevel) {
      toplevel = toplevelOf(args.toplevel) || canonAbs(args.toplevel);
    } else {
      const r = runGit(['rev-parse', '--show-toplevel']);
      if (r.error || r.status !== 0 || !r.stdout.trim()) {
        throw new Error(`cannot resolve the git toplevel of ${process.cwd()}: ${(r.stderr || String(r.error)).trim()}`);
      }
      toplevel = canonAbs(r.stdout.trim());
    }
    out = listPeers({ sessionsDir, selfSession, selfPid, toplevel });
  } catch (e) {
    out = unknown(String(e && e.message ? e.message : e));
  }
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (isMain(import.meta.url)) main();
