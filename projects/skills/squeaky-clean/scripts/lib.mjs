// Shared helpers for the squeaky-clean scripts.
//
// Every child process starts from an argv array with shell: false. File names
// are model-controlled, and `&` is legal in a Windows file name, so no command
// string is ever built from data. Every git call sets GIT_OPTIONAL_LOCKS=0 so a
// read never takes the index lock a peer's commit needs.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Repository-locating variables are dropped so every git call acts on the
// directory it is pointed at (-C or cwd), never on an inherited repo.
const GIT_LOCATION_VARS = [
  'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_COMMON_DIR', 'GIT_NAMESPACE', 'GIT_PREFIX', 'GIT_LITERAL_PATHSPECS',
  'GIT_GLOB_PATHSPECS', 'GIT_NOGLOB_PATHSPECS', 'GIT_ICASE_PATHSPECS',
];

export function gitEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of GIT_LOCATION_VARS) delete env[k];
  return { ...env, GIT_OPTIONAL_LOCKS: '0', ...extra };
}

export function runGit(args, { cwd, env, input } = {}) {
  const r = spawnSync('git', args, {
    cwd,
    env: gitEnv(env),
    input,
    shell: false,
    windowsHide: true,
    maxBuffer: 512 * 1024 * 1024,
  });
  return {
    status: r.status,
    stdout: r.stdout ? r.stdout.toString('utf8') : '',
    buffer: r.stdout || Buffer.alloc(0), // the raw bytes, for blob contents
    stderr: r.stderr ? r.stderr.toString('utf8') : '',
    error: r.error || null,
  };
}

// Forward slashes, no \\?\ prefix, lower-case drive letter.
export function slashify(p) {
  let s = String(p).replace(/\\/g, '/');
  if (s.startsWith('//?/UNC/')) s = '//' + s.slice(8);
  else if (s.startsWith('//?/')) s = s.slice(4);
  if (/^[A-Za-z]:/.test(s)) s = s[0].toLowerCase() + s.slice(1);
  if (s.length > 1 && s.endsWith('/') && !/^[a-z]:\/$/.test(s)) s = s.slice(0, -1);
  return s;
}

function realpathOne(p) {
  try { return fs.realpathSync.native(p); } catch { /* fall through */ }
  return fs.realpathSync(p);
}

// realpath of the longest existing prefix, with the missing tail re-joined.
// A deleted file under a junction still maps to its real location.
export function realpathLoose(p) {
  let cur = path.resolve(p);
  const tail = [];
  for (;;) {
    try {
      const real = realpathOne(cur);
      return tail.length ? path.join(real, ...tail.reverse()) : real;
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return path.resolve(p);
      tail.push(path.basename(cur));
      cur = parent;
    }
  }
}

const canonCache = new Map();
// Canonical absolute form: realpath (junctions resolved), forward slashes,
// case-folded drive.
export function canonAbs(p) {
  const key = path.resolve(p);
  let v = canonCache.get(key);
  if (v === undefined) {
    v = slashify(realpathLoose(key));
    canonCache.set(key, v);
  }
  return v;
}

// Repo-relative form of a canonical absolute path, or null when outside.
export function repoRelative(canonPath, canonTop) {
  const prefix = canonTop.endsWith('/') ? canonTop : canonTop + '/';
  if (!canonPath.startsWith(prefix)) return null;
  const rel = canonPath.slice(prefix.length);
  return rel.length ? rel : null;
}

// Canonical toplevel of the repo holding `dir`, or null.
export function toplevelOf(dir) {
  if (!dir || typeof dir !== 'string') return null;
  const r = runGit(['-C', dir, 'rev-parse', '--show-toplevel']);
  if (r.error || r.status !== 0) return null;
  const top = r.stdout.trim();
  return top ? canonAbs(top) : null;
}

// Minimal argv parser. `known` names take a value (--name value or
// --name=value), `repeatable` ones collect, `flags` take none. Any other name
// is refused: a typo such as --exlude must never be silently ignored.
export function parseArgs(argv, { known = [], repeatable = [], flags = [] } = {}) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument: ${a}`);
    const eq = a.indexOf('=');
    const name = eq > 2 ? a.slice(2, eq) : a.slice(2);
    if (flags.includes(name)) {
      if (eq > 2) throw new Error(`--${name} takes no value`);
      out[name] = true;
      continue;
    }
    if (!known.includes(name) && !repeatable.includes(name)) throw new Error(`unknown option --${name}`);
    let value;
    if (eq > 2) value = a.slice(eq + 1); else {
      if (i + 1 >= argv.length) throw new Error(`missing value for --${name}`);
      value = argv[++i];
    }
    if (repeatable.includes(name)) (out[name] ||= []).push(value);
    else out[name] = value;
  }
  return out;
}

// A file's bytes, or null when it is gone (ENOENT, ENOTDIR). Any other read
// error (EBUSY, EACCES, EISDIR) is thrown: a file we can't read is never
// taken as gone.
export function readIfPresent(file) {
  try {
    return fs.readFileSync(file);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return null;
    throw e;
  }
}

// The sha1 consent is bound to: of some bytes, hex.
export const sha1 = (buf) => createHash('sha1').update(buf).digest('hex');

// The sha1 of a file's bytes, null when it is gone; other read errors throw.
export function fileSha1(file) {
  const buf = readIfPresent(file);
  return buf === null ? null : sha1(buf);
}

// Blocking sleep without a busy loop.
export function sleepMs(ms) {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// True when this module file is the script node was started with. Compared
// through realpath so a run through the ~/.claude/skills junction still counts.
export function isMain(importMetaUrl) {
  if (!process.argv[1]) return false;
  try {
    const self = fs.realpathSync(new URL(importMetaUrl));
    const started = fs.realpathSync(process.argv[1]);
    return self === started;
  } catch {
    return false;
  }
}
