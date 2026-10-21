// Shared fixtures for the squeaky-clean tests. Everything lives under
// os.tmpdir() and is removed by the caller's cleanup. Session ids are
// synthetic (sess-self, sess-peer); no real path or id appears here.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitEnv } from '../scripts/lib.mjs';

export const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts');

export function scratch(prefix = 'squeaky-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// gitEnv drops GIT_DIR, GIT_INDEX_FILE and the rest: a suite run from inside a
// git hook must never act on the outer repo.
export function git(cwd, ...args) {
  return gitWith({}, cwd, ...args);
}

// git with extra environment, e.g. GIT_COMMITTER_DATE for a commit at a set time.
export function gitWith(env, cwd, ...args) {
  const r = spawnSync('git', args, {
    cwd,
    env: gitEnv(env),
    shell: false,
    windowsHide: true,
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

// Environment that dates a commit at `ms` (epoch milliseconds).
export function dated(ms) {
  const at = `@${Math.floor(ms / 1000)} +0000`;
  return { GIT_COMMITTER_DATE: at, GIT_AUTHOR_DATE: at };
}

export function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// A repo with one commit holding `files` ({relPath: content}). The commit is
// dated an hour back, so evidence a test writes now is newer than it.
export function initRepo(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'test@example.invalid');
  git(dir, 'config', 'user.name', 'Squeaky Test');
  git(dir, 'config', 'core.autocrlf', 'false');
  git(dir, 'config', 'commit.gpgsign', 'false');
  for (const [rel, text] of Object.entries(files)) write(path.join(dir, rel), text);
  git(dir, 'add', '-A');
  gitWith(dated(Date.now() - 3_600_000), dir, 'commit', '-q', '-m', 'initial');
  return dir;
}

let seq = 0;
// One assistant record holding one tool_use. `at` is epoch ms; `msgId` groups
// calls of one message.
export function toolUse(name, input, cwd, { session = 'sess-self', at = Date.now(), msgId } = {}) {
  const id = `toolu_test_${++seq}`;
  const message = { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] };
  if (msgId) message.id = msgId;
  return { id, line: { type: 'assistant', cwd, sessionId: session, timestamp: new Date(at).toISOString(), message } };
}

// `applied` is the record's toolUseResult: what an Edit / MultiEdit / Write
// actually did (absent for an error, as in real transcripts).
export function toolResult(id, isError = false, { session = 'sess-self', at = Date.now(), applied } = {}) {
  const rec = {
    type: 'user', sessionId: session, timestamp: new Date(at).toISOString(),
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: isError ? 'Error' : 'ok' }] },
  };
  if (applied && !isError) rec.toolUseResult = applied;
  return rec;
}

// The toolUseResult Claude Code records for a content tool, shaped like the
// real ones: an Edit's applied strings (originalFile often null), a
// MultiEdit's edits, a Write's type. A Write is a create unless `pre` (the
// file it replaced) is given; `result` overrides any field.
function appliedFor(name, input, { pre, result } = {}) {
  let base = null;
  if (name === 'Edit') {
    base = {
      filePath: input.file_path, oldString: input.old_string, newString: input.new_string, originalFile: null,
      replaceAll: Boolean(input.replace_all), structuredPatch: [], userModified: false,
    };
  } else if (name === 'MultiEdit') {
    base = { filePath: input.file_path, edits: input.edits, structuredPatch: [], userModified: false };
  } else if (name === 'Write') {
    base = typeof pre === 'string'
      ? { type: 'update', filePath: input.file_path, content: input.content, structuredPatch: [], originalFile: pre }
      : { type: 'create', filePath: input.file_path, content: input.content, structuredPatch: [], originalFile: null };
  }
  return base && result ? { ...base, ...result } : base;
}

// The session a transcript file belongs to: <sid>.jsonl, or a file under <sid>/subagents/.
function sessionOf(file) {
  const m = /[\\/]([^\\/]+)[\\/]subagents[\\/]/.exec(file);
  return m ? m[1] : path.basename(file, '.jsonl');
}

// Write a transcript of tool calls. `calls` are [name, input, opts?], opts:
//   error: true      the result is an error
//   noResult: true   no tool_result line at all
//   at: <ms>         the call's timestamp (default: now, 1 ms apart, in order)
//   msgId: <id>      the message it belongs to (parallel calls share one)
//   cwd: <dir>       the record's cwd, stamped after the call (default: `cwd`)
//   session: <id>    the record's sessionId (default: from the file's path)
//   pre: <text>      a Write replaced this text (default: it created the file)
//   result: {...}    toolUseResult fields to override
//   noApplied: true  the result has no toolUseResult (the input is replayed)
// `tail` appends a final line cut mid-write.
export function writeTranscript(file, cwd, calls, { garbage = false, tail = false } = {}) {
  const lines = [];
  if (garbage) lines.push('{"type":"assistant","message":{"content":[{"type":"tool_use"  <- truncated');
  const base = Date.now();
  calls.forEach(([name, input, opts = {}], k) => {
    const at = opts.at ?? base + k * 2;
    const session = opts.session ?? sessionOf(file);
    const u = toolUse(name, input, opts.cwd ?? cwd, { session, at, msgId: opts.msgId });
    lines.push(JSON.stringify(u.line));
    const applied = opts.noApplied ? undefined : appliedFor(name, input, opts);
    if (!opts.noResult) lines.push(JSON.stringify(toolResult(u.id, !!opts.error, { session, at: at + 1, applied })));
  });
  if (tail) lines.push('{"type":"user","message":{"content":[{"type":"tool_res');
  write(file, lines.join('\n') + (tail ? '' : '\n'));
}

export function runScript(script, args, { env = {}, cwd } = {}) {
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    cwd,
    env: cleanEnv(env),
    shell: false,
    windowsHide: true,
    encoding: 'utf8',
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// `onStderr(all)` sees the whole stderr so far after every chunk, so a test
// can act on what the child just said instead of on a timer.
export function runScriptAsync(script, args, { env = {}, cwd, onStderr } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(SCRIPTS, script), ...args], {
      cwd, env: cleanEnv(env), shell: false, windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; if (onStderr) onStderr(stderr); });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

// A sessions dir that never exists: a script run by a test reads no real
// registry unless the test gives it one.
export const NO_SESSIONS = path.join(os.tmpdir(), 'squeaky-no-sessions-dir');

// The test run itself happens inside a Claude Code session: strip its
// identity so a script never sees the real session.
export function cleanEnv(extra) {
  const env = { ...process.env };
  for (const k of ['CLAUDE_PID', 'CLAUDE_CODE_SESSION_ID', 'SQUEAKY_SESSIONS_DIR', 'SQUEAKY_PROJECTS_DIR',
    'SQUEAKY_POWERSHELL', 'SQUEAKY_LOCK_BACKOFF_MS', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete env[k];
  env.SQUEAKY_SESSIONS_DIR = NO_SESSIONS;
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  return env;
}

// Long-lived child processes to stand in for live peer sessions.
export function spawnSleepers(n) {
  const kids = [];
  for (let i = 0; i < n; i++) {
    kids.push(spawn(process.execPath, ['-e', 'setInterval(() => {}, 1e9)'], { stdio: 'ignore', windowsHide: true }));
  }
  return kids;
}

// A pid that is certainly dead: a child that has already exited.
export function deadPid() {
  const r = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8', windowsHide: true });
  return Number(r.stdout);
}

// Independent oracle for process start times (FILETIME strings), Windows only.
export function fileTimes(pids) {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    "$env:T_PIDS -split ',' | ForEach-Object { $p = Get-Process -Id ([int]$_); '{0} {1}' -f $p.Id, $p.StartTime.ToFileTimeUtc() }"], {
    env: { ...process.env, T_PIDS: pids.join(',') }, encoding: 'utf8', windowsHide: true,
  });
  const map = new Map();
  for (const line of r.stdout.split(/\r?\n/)) {
    const m = /^(\d+) (\d+)$/.exec(line.trim());
    if (m) map.set(Number(m[1]), m[2]);
  }
  return map;
}

export function slash(p) {
  const s = p.replace(/\\/g, '/');
  return /^[A-Za-z]:/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
