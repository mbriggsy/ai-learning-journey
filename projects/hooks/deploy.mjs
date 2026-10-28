#!/usr/bin/env node
// deploy.mjs: deploy hook versions into ~/.claude/hooks/v-<sha12>/ and switch
// ~/.claude/settings.json over to them with ONE settings-writer call (KTD 12).
//
// Why versioned folders: until now the hooks were copied flat into
// ~/.claude/hooks/ by hand (README, "Install / re-sync"). A live session
// could run a half-copied set, nothing said which commit was live, and the
// only way back was another hand copy. Here each version is built from a
// commit's blobs into a folder of its own, compared byte for byte with those
// blobs, and only then switched on, by one atomic settings write. Rollback
// points settings back at a kept folder. A folder is never deleted: a live
// process may still be running a hook from it (KTD 12 keeps every version
// until each live process shows a heartbeat from its successor, which U7 and
// U9 build), so there is no prune command.
//
//   node deploy.mjs deploy [--commit <rev>] [--patch <extra.json>] [--dry-run]
//   node deploy.mjs snapshot-flat [--commit <rev>]
//   node deploy.mjs rollback [--to v-<x>] [--dry-run]
//   node deploy.mjs status
// Every action takes [--hooks-dir <dir>] [--settings <file>] [--repo <dir>]
// [--log <file>]; deploy and rollback also take [--inverse-out <file>] and
// [--persist-delay-ms <n>] (how long the writer waits before re-reading the
// switched settings; 1 500 by default, shorter only in tests), passed to the
// writer. Defaults: ~/.claude/hooks, ~/.claude/settings.json,
// the git toplevel of this file's folder, ~/.claude/flow/deploys.jsonl, and
// the writer's own inverse path. Tests pass the first four, a temp HOME and
// --persist-delay-ms 50; they leave --inverse-out to the writer's default.
//
// MANIFEST (below) names every deployed file, relative to projects/hooks. It
// is explicit, never a glob: a stray file must never go live by accident.
// Later units add to it.
//
// deploy. The source is a commit, never the working tree: each manifest
// file's blob is read at --commit (default HEAD), so a dirty tree doesn't
// matter and the name v-<first 12 hex of the commit sha> means exactly those
// bytes. The order, so that a refusal leaves nothing half done:
//   1. Plan the switch from the current settings (rules below). A command
//      that names the hooks folder in any form but the known ones refuses
//      here, before anything is written.
//   2. Build: write the files into v-<sha12>.tmp-<rand>/, read each copy back
//      and compare it with its blob (the cmp step), write DEPLOYED.json
//      ({version, commit, source, files: {path: sha256}, builtAt}), then
//      rename the folder to v-<sha12>/. A failed cmp removes the temp folder
//      (it was never live) and settings are not touched. The removal retries
//      (on Windows a scanner briefly holds files just written); one that
//      still fails is a warning, never the reported cause, and status lists
//      the leftover folder. The refusal is worded after the removal, so it
//      says whether the folder went. A v-<sha12>/ that already exists is
//      re-verified against its DEPLOYED.json and the blobs and reused
//      (idempotent); any mismatch refuses.
//   3. The peers gate (KTD 23): settings.json is user-global, so the switch
//      needs peers.mjs (projects/skills/squeaky-clean/scripts) to answer
//      ok: true and busyAnywhere: false. It runs just before the write. A
//      refusal here leaves the built folder in place; it is not live, and the
//      next deploy of that commit reuses it. --dry-run reports the gate
//      without refusing.
//   4. One settingsWrite() call (tools/settings-write.mjs), bound to the
//      settings read the plan was made from (the writer's expectSha): any
//      change since, such as a hooks command added during the build or the
//      gate, which no test op covers, refuses with nothing written (exit 3:
//      run it again to plan from the new settings; the writer's own exit for
//      it is 3, and a writer from before that rule exits 2 there, which the
//      sha it read still marks as a change). Its ops: a test op with
//      each rewritten command's current value, then a set op with its new
//      one; --patch's ops follow in the SAME write (later units add hook
//      entries this way).
//   5. Settings are read again and must point where the plan said, then one
//      line is appended to the deploy log. A write that landed but failed a
//      check after it (the writer's exit 4, or that re-read) is logged too,
//      marked postcheck: "failed", and exits 4: the switch is in force, and
//      the line is what a later rollback finds it by. The way back the
//      message names follows the facts as they then are (settings read
//      again, the log replayed), never a fixed promise. For a deploy: a bare
//      rollback when the switch is the newest in force, its undo plans and
//      settings still point at the version (or are byte for byte what the
//      switch found, when the bare rollback only records the undo); else
//      rollback --to the version before (for "flat", its snapshot), when
//      settings hold a command that names the hooks folder (the check --to
//      itself refuses on), that folder passes its check and the pointer
//      switch plans; else the switch's own inverse by hand, when the manual
//      way back's checks (under rollback) pass; else it says no way back is
//      known. A pointer switch leaves alone what a switch wrote beyond
//      command pointers (a --patch's env, permissions or hook entries), so
//      beside --to the words name those paths, read from the switch's
//      inverse (where it can't be read, they say why in plain words, never
//      the refused undo's own advice), and offer that inverse by hand after
//      --to, never ahead of it: the hand path skips the peers gate and the
//      log. For a rollback (a bare undo or a --to), the way on leads to the
//      version it was going to, never back to the one it left: when
//      settings point there, it is in force and only the check failed (the
//      words name any path it wrote that another writer has changed since);
//      else rollback --to that version, when it plans as above (with the
//      same note on what --to leaves); else no way back is known. A bare
//      rollback (it would undo the switch below) and the rollback's own
//      inverse (it puts back what the rollback replaced) both lead back, so
//      neither is offered for it. The result's recovery says which, as
//      {how, to}.
//
// The rewrite rules. Every string value under a key named "command", at any
// depth (hooks.<event>[].hooks[].command, statusLine.command, any later
// command-shaped setting), is scanned for the hooks folder, in any spelling
// (~, $HOME, an absolute path, a backslash, another case), and for the legacy
// status line script. Only the tilde forms rewrite, and only at the start of
// a word (bash expands ~ there and nowhere else, never inside quotes):
//   ~/.claude/hooks/<file>             -> ~/.claude/hooks/<new>/<file>
//   ~/.claude/hooks/v-<12 hex>/<file>  -> ~/.claude/hooks/<new>/<file>
//   ~/.claude/hooks/v-flat-<12 hex>/<file> (a snapshot-flat folder) -> same
//   ~/.claude/statusline.py, in statusLine.command only
//                                      -> ~/.claude/hooks/<new>/statusline.py
// for every <file> the new version holds. Anything else that names the hooks
// folder (a file the version lacks, $HOME/..., an absolute path, a quoted
// tilde) refuses the whole deploy: settings are never half switched. A
// command that names neither (the Notification PowerShell one) is left
// alone. After the planned ops and --patch's are applied to a copy in memory,
// every reference must name the new version and a file it holds, or the
// deploy refuses. A hooks-folder mention outside a command (a permission
// rule, prose) is left as it is and named in a warning.
//
// Each deployed file's text is also checked for the flat path of a sibling
// (~/.claude/hooks/<another manifest file>, or $HOME/...): a warning, since a
// deployed copy that calls its sibling by the flat path reaches the flat copy,
// not its own version's.
//
// snapshot-flat (the bootstrap, run once) copies today's six flat hooks from
// the hooks folder into a kept folder, so the first versioned deploy has a
// rollback target. It never switches settings. The folder is named by the
// newest commit at or before --commit (default HEAD) whose six blobs equal the
// flat files byte for byte (a walk of `git log -- <the six paths>`); when no
// commit matches, it is v-flat-<first 12 hex of sha256 over every copied
// file, in sorted name order, each as name NUL byte-length NUL bytes>, and a
// warning says so. DEPLOYED.json says source "flat" (commit null when named
// by content). A commit-named snapshot shares the v-<sha12> namespace with
// deploys: a deploy of that very commit finds the snapshot and refuses (it is
// never rewritten), so the first deploy must be a later commit. The walk
// makes that the normal case: the snapshot is named by the last commit that
// touched the six hooks, the deploy by the commit being landed. The legacy status line script beside the hooks folder
// (~/.claude/statusline.py) is copied in too when it exists, recorded under
// "extras" as "../statusline.py": the first deploy moves statusLine into the
// version folder, so a rollback target without a statusline.py would refuse
// (see rollback). The commit match covers the six hooks only.
//
// rollback (no --to) UNDOES the newest switch still in force. The deploy log
// replays as a stack: a deploy or a `rollback --to` pushes its entry, and a
// bare rollback pops one (its own line says {undoes: <id>}), so repeated bare
// rollbacks step back a switch at a time (C, then B, then A), never toggling
// between the last two. A pointer switch back to the previous folder is not
// an undo: a deploy whose --patch added a hook for a file the previous folder
// lacks could never be rolled back, and a hook entry the patch removed or an
// env value it changed would stay as the patch left it. So, for the newest
// entry still in force:
//   1. settings must point at the version it switched to (else they changed
//      outside deploy since: pass --to, which logs a resync when they already
//      point at that folder). The one exception: settings byte for byte what
//      that switch found (sha256 equal to its settingsBefore: a hand-applied
//      inverse, or a writer that put the old bytes back). Its whole effect is
//      gone already, so the undo is logged with nothing written ({undoes,
//      noop: true}), and the next bare rollback reaches the switch below. A
//      "flat" previous, which --to can't name, is covered this way too;
//   2. the target is its "previous": a kept folder, or for "flat" the newest
//      snapshot-flat folder, which must pass its DEPLOYED.json check;
//   3. its logged inverse (the writer's inverse file for that very write) is
//      applied to a copy in memory. Its test ops prove each path the switch
//      changed still holds what the switch left; its set and delete ops put
//      back what the switch replaced, --patch ops included. An inverse that
//      is missing, belongs to another write, holds an irreversible op (a
//      secret-shaped old value, never stored) or no longer applies refuses by
//      name, with nothing written, as does a resync's (it wrote nothing);
//   4. that copy is switched onto the target folder by the rewrite rules (a
//      "flat" previous lands on its snapshot), and must then point at the
//      target alone;
//   5. the inverse ops and the switch ops go to the writer as ONE write,
//      behind the peers gate, bound to the settings read it was planned from;
//      settings are read again, and the log line says {undoes: <id>}. An undo
//      the writer finds nothing to change in is logged all the same (noop:
//      true), so the stack pops and the next bare rollback reaches the switch
//      below.
// rollback --to v-<x> stays a pointer switch: the rewrite rules, restricted
// to the files that folder holds, applied to settings as they are (a command
// naming a file the folder lacks refuses). It is pushed like a deploy, so a
// bare rollback after it returns to where the jump started. The folder must
// exist and pass its DEPLOYED.json check. The peers gate and the log apply as
// for deploy. A --to that finds settings already pointing at the folder
// writes nothing. When that folder is the one the newest switch in force
// left (its previous) and settings are byte for byte what that switch found,
// the no-op is that switch's undo and is logged as one ({undoes, noop:
// true}), which pops it: the switch below stays within a bare rollback's
// reach (after a hand-applied inverse, say, or the exit-4 advice). Else,
// when the log's newest switch in force names another version (settings
// changed outside deploy), it is logged as a resync ({resync: true, noop:
// true}, no inverse), pushed like any --to, so the log agrees with settings
// again. A bare rollback can't undo a resync (there is nothing to undo): it
// says so, and --to is the way on. A log that doesn't replay as a stack gets
// neither (it would not put the log right), and a warning says so. A --to on
// settings that hold no command naming the hooks folder refuses: it has
// nothing to point, and a resync would claim settings name the folder. The
// advice after an exit 4 asks the same check, so it never names such a --to.
//
// The manual way back. A rollback that can't plan (bare, once the newest
// switch's inverse has applied, or --to) offers that switch's logged inverse,
// applied by the writer by hand, only where it leads somewhere sound: applied
// in memory to settings as they are, every command reference must then name
// a kept folder that passes its DEPLOYED.json check and holds the file named,
// a flat hook that exists, or the legacy status line, which must exist. So it
// is never offered onto the very folder that just failed its check, or onto
// files that are gone; a folder whose check throws (a listed file that is a
// folder, an unreadable one) counts as failing it. The printed command
// (fallback.command, as argv) runs the writer deployed in the folder the way
// back lands on (the switch's previous, normally) when that folder holds one,
// verified; else the working tree's. Never the writer of the version being
// escaped, which may be why. fallback.commandLine is node, bare, then every
// argument single-quoted: Git Bash, sh and PowerShell 7 all read that line as
// the same words (PowerShell parses a line that opens with a quoted string as
// an expression and fails on the next word), so long as no argument holds a
// single quote, which POSIX writes as '\'' and PowerShell as ''. When one
// does (PowerShell counts the curly quotes U+2018 to U+201B too), the words
// say the line is for a POSIX shell (Git Bash) only. They also say it skips
// the peers gate and the deploy log, and what rollback --to the folder it
// lands on then logs: that switch's undo when settings are byte for byte what
// it found and the folder is its previous; else a resync; nothing when the
// log has settings there already (a switch that kept its version, a --patch
// alone), so the log goes on naming the switch as in force. Where it lands
// on no version folder (the flat files, a mix, no hooks command), which --to
// can't name, the words say a bare rollback records it as the switch's undo
// while that switch is the newest in force and settings are then byte for
// byte what it found (rollback step 1); else the log goes on naming the
// switch as in force.
//
// status reports the active version (from settings: every hooks-folder
// command must agree; a mix reads "mixed"), every kept folder with its
// DEPLOYED.json summary and check, leftover temp folders, which flat files
// still exist, and the last log entries. It writes nothing.
//
// The log, ~/.claude/flow/deploys.jsonl, gets one JSON line per switch:
// {id, at, action, version, previous, commit, settingsBefore, settingsAfter,
// inverse} (a random id, sha256s of the settings file, and the writer's
// inverse file), with {undoes: <id>} on an undo's line (a bare rollback's,
// or a --to's that is logged as one), {postcheck: "failed", postcheckError}
// on a write that landed but failed a check after it, and {noop: true}
// (settingsBefore equal to settingsAfter, inverse null) on an undo or a
// resync that wrote nothing, a resync adding {resync: true}; and one line
// per snapshot-flat (its settings fields null).
// It is append-only: each entry is one O_APPEND write, so a concurrent append
// can't be lost the way a read-modify-rename of the whole file could lose it.
//
// Output: one JSON object on stdout: {ok, exit, action, ...}; a switch adds
// logId (its log line's id; a logged no-op has one too, and a resync adds
// resync: true), and a bare rollback inverse (the inverse file it applies),
// undoes (the id it undoes) and undone ([{op, path}]: the inverse's set and
// delete ops, paths only, since an inverse stores env values). undoes and
// undone come only with an undo that is done (a dry run included) or whose
// line is in the log (exit 4), never with a refusal; a --to logged as an
// undo adds undoes too. A refusal that offers the manual way back adds
// fallback: {undoes, version, previous, inverse, lands (where it points
// settings), writer, writerFrom (a version, or "working tree"), command,
// commandLine}; an exit 4 adds recovery {how: "bare rollback" | "rollback
// --to" | "in force" (a rollback whose switch landed where it was going) |
// "by hand" | "none", to}, and fallback when it is "by hand", or beside
// "rollback --to" when the switch wrote paths a pointer switch leaves.
// Errors also go to stderr with the exit code. Commands
// are shown as they are, except a secret-shaped one (the writer's
// secretShaped), which shows as {type, length, sha8}. The busy sessions the
// gate names are pid, name and status, never a socket path or a full session
// id.
//
// Exit codes: 0 done (or dry run, or nothing to change); 1 internal error
// (including a log append that failed after a switch: the result then says
// switched: true); 2 refused (cmp failed, an unknown hooks-folder reference,
// a version folder mismatch, peers busy or unknown, nothing to undo or an
// inverse that can't be applied, a --to with no hooks-folder command in
// settings, the writer refused or its lock was busy, bad arguments); 3
// settings changed after deploy read them to plan (the writer's expect-sha
// check, which exits 3 itself (an older writer's exit 2
// there is read by the sha it read), or its own concurrent-change check, or
// a resync's re-read; nothing written: run it again); 4 written, but a check
// after the write failed (the writer's post-write check, or settings read
// again pointing elsewhere), logged with postcheck: "failed".
//
// Library: deploy(), snapshotFlat(), rollback() and status() take the CLI's
// options camel-cased ({commit, patch, dryRun, to, hooksDir, settings, repo,
// log, inverseOut}) and return exactly the object the CLI prints; they never
// throw. For tests only: `seams.afterCopy(tmpDir)` runs between the copy and
// the cmp step, `writerSeams` goes to settingsWrite() as its `seams`, and
// `registry: {sessionsDir, selfPid, selfSession}` overrides what peers.mjs
// would read from SQUEAKY_SESSIONS_DIR, CLAUDE_PID and CLAUDE_CODE_SESSION_ID.

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GIT_LOCATION_VARS } from './probes/lib.mjs';
import { applyOps, deepEqual, describe as describeValue, secretShaped, settingsWrite, validateOps } from './tools/settings-write.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));

// Where the manifest's files live in the monorepo.
export const SOURCE_DIR = 'projects/hooks';

// The six hooks live today, flat in ~/.claude/hooks/.
export const FLAT_HOOKS = Object.freeze([
  'block-webfetch.sh',
  'check-config-liveness.mjs',
  'elite-engineer-session-start.sh',
  'enforce-brief-before-work.sh',
  'remind-distill-after-work.sh',
  'stop-distill-gate.sh',
]);

// Everything a version folder holds, relative to projects/hooks. The writer
// imports ../lib/encoding.mjs, and the liveness check loads
// lib/permissions.mjs, which imports its catalog, and lib/plugin-grants.mjs,
// which imports lib/permissions.mjs, so the layout is kept as it is in the
// repo.
export const MANIFEST = Object.freeze([
  ...FLAT_HOOKS,
  'statusline.py',
  'tools/settings-write.mjs',
  'lib/encoding.mjs',
  'lib/permissions.mjs',
  'lib/permission-rules.json',
  'lib/plugin-grants.mjs',
]);

export const EXIT = Object.freeze({ OK: 0, INTERNAL: 1, REFUSED: 2, CONCURRENT: 3, POSTCHECK: 4 });

const DEPLOYED = 'DEPLOYED.json';
const VERSION_RE = /^v-(?:flat-)?[0-9a-f]{12}$/;
const TEMP_RE = /^v-(?:flat-)?[0-9a-f]{12}\.tmp-[0-9a-f]+$/;
const STATUSLINE = 'statusline.py';
const TILDE_HOOKS = '~/.claude/hooks/';
const TILDE_LEGACY = '~/.claude/statusline.py';
const RENAME_RETRY_MS = 3_000;
const SNAPSHOT_WALK = 1_000;
const LOG_TAIL = 10;
const PEERS_MODULE = path.join(HERE, '..', 'skills', 'squeaky-clean', 'scripts', 'peers.mjs');
const SQUEAKY_LIB = path.join(HERE, '..', 'skills', 'squeaky-clean', 'scripts', 'lib.mjs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const cloneJson = (v) => JSON.parse(JSON.stringify(v));
const fmt = (p) => JSON.stringify(p);
// A message part as the start of a sentence.
const cap = (s) => (s ? `${s[0].toUpperCase()}${s.slice(1)}` : s);

// A failure with its exit code. `extra` joins the result.
class Refusal extends Error {
  constructor(exit, message, extra = {}) {
    super(message);
    this.exit = exit;
    this.extra = extra;
  }
}
const refuse = (message, extra) => new Refusal(EXIT.REFUSED, message, extra);

// ---------------------------------------------------------------- git

// Every git call works on the repo it is pointed at (-C), never on one an
// outer git hook or shell names, and never takes the index lock a live
// session may hold (GIT_OPTIONAL_LOCKS=0). Matched case-blind, as Windows
// reads environment names (the tests/leak.mjs pattern).
function gitEnv() {
  const drop = new Set([...GIT_LOCATION_VARS, 'GIT_OPTIONAL_LOCKS']);
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!drop.has(k.toUpperCase())) env[k] = v;
  return { ...env, GIT_OPTIONAL_LOCKS: '0' };
}

// One git call from an argv array (KTD 11). A failure throws with git's own
// message, or returns null when `allowFail`.
function git(repo, args, { input, binary = false, allowFail = false } = {}) {
  const r = spawnSync('git', ['-C', repo, ...args], {
    input: input === undefined ? undefined : Buffer.from(input, 'utf8'),
    env: gitEnv(),
    shell: false,
    windowsHide: true,
    encoding: binary ? 'buffer' : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.error) throw new Error(`git ${args[0]} could not run: ${r.error.message}`);
  if (r.status !== 0) {
    if (allowFail) return null;
    throw new Error(`git ${args[0]} failed (exit ${r.status}): ${String(r.stderr).trim()}`);
  }
  return r.stdout;
}

function toplevel(dir) {
  const out = git(dir, ['rev-parse', '--show-toplevel'], { allowFail: true });
  if (out === null || !out.trim()) throw refuse(`${dir} is not inside a git work tree (--repo names the monorepo root)`);
  return path.resolve(out.trim());
}

// The full sha of a commit. A rev that starts with "-" would read as an
// option, so it is refused, never passed.
function resolveCommit(repo, rev) {
  if (typeof rev !== 'string' || rev === '' || rev.startsWith('-') || /[\0\r\n]/.test(rev)) throw refuse(`--commit must name a commit, not ${JSON.stringify(rev)}`);
  const sha = git(repo, ['rev-parse', '-q', '--verify', `${rev}^{commit}`], { allowFail: true })?.trim();
  if (!sha || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sha)) throw refuse(`${rev} is not a commit in ${repo}`);
  return sha;
}

// {repo path -> {mode, type, id}} for the given paths at `commit`.
function treeEntries(repo, commit, paths) {
  const out = git(repo, ['ls-tree', '-z', '--full-tree', commit, '--', ...paths]);
  const map = new Map();
  for (const rec of out.split('\0')) {
    if (!rec) continue;
    const tab = rec.indexOf('\t');
    const [mode, type, id] = rec.slice(0, tab).split(' ');
    map.set(rec.slice(tab + 1), { mode, type, id });
  }
  return map;
}

// Blob bytes by object id, in one `git cat-file --batch` call: id -> Buffer.
function readBlobs(repo, ids) {
  const want = [...new Set(ids)];
  const blobs = new Map();
  if (!want.length) return blobs;
  const out = git(repo, ['cat-file', '--batch'], { input: `${want.join('\n')}\n`, binary: true });
  let at = 0;
  for (const id of want) {
    const nl = out.indexOf(0x0a, at);
    if (nl < 0) throw new Error(`git cat-file --batch: no answer for ${id}`);
    const header = out.toString('utf8', at, nl);
    const m = /^([0-9a-f]+) (\S+) (\d+)$/.exec(header);
    if (!m || m[1] !== id || m[2] !== 'blob') throw new Error(`git cat-file --batch: asked for blob ${id}, got "${header}"`);
    const size = Number(m[3]);
    if (nl + 1 + size > out.length) throw new Error(`git cat-file --batch: ${id} was cut short`);
    blobs.set(id, out.subarray(nl + 1, nl + 1 + size));
    at = nl + 1 + size + 1;
  }
  return blobs;
}

// The manifest's files at `commit`: Map rel -> {bytes, mode}. Each must be a
// regular blob: a symlink would deploy its link text, a submodule nothing.
function commitFiles(repo, commit, files) {
  const repoPath = (rel) => `${SOURCE_DIR}/${rel}`;
  const tree = treeEntries(repo, commit, files.map(repoPath));
  const missing = files.filter((rel) => !tree.has(repoPath(rel)));
  if (missing.length) throw refuse(`commit ${commit.slice(0, 12)} does not hold ${missing.map(repoPath).join(', ')}: every manifest file must be in the commit`);
  const odd = files.filter((rel) => {
    const e = tree.get(repoPath(rel));
    return e.type !== 'blob' || !['100644', '100755'].includes(e.mode);
  });
  if (odd.length) throw refuse(`at commit ${commit.slice(0, 12)}, ${odd.map((rel) => `${repoPath(rel)} (mode ${tree.get(repoPath(rel)).mode})`).join(', ')} is not a regular file`);
  const blobs = readBlobs(repo, files.map((rel) => tree.get(repoPath(rel)).id));
  return new Map(files.map((rel) => {
    const e = tree.get(repoPath(rel));
    return [rel, { bytes: blobs.get(e.id), mode: e.mode === '100755' ? 0o755 : 0o644 }];
  }));
}

// A blob's object id, computed here, in the repo's own hash.
function blobId(bytes, format) {
  return createHash(format).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

// The newest commit at or before `rev` whose blobs for the six flat hooks
// equal `flat` (name -> bytes), byte for byte; null when none does.
function matchingCommit(repo, rev, flat) {
  const format = git(repo, ['rev-parse', '--show-object-format'], { allowFail: true })?.trim() === 'sha256' ? 'sha256' : 'sha1';
  const paths = FLAT_HOOKS.map((n) => `${SOURCE_DIR}/${n}`);
  const want = new Map(FLAT_HOOKS.map((n, i) => [paths[i], blobId(flat.get(n), format)]));
  const shas = git(repo, ['log', `-n${SNAPSHOT_WALK}`, '--format=%H', rev, '--', ...paths]).split('\n').filter(Boolean);
  for (const sha of shas) {
    const tree = treeEntries(repo, sha, paths);
    if (!paths.every((p) => tree.get(p)?.type === 'blob' && tree.get(p).id === want.get(p))) continue;
    // The ids agree; the bytes are compared too, not taken on the hash.
    const blobs = readBlobs(repo, paths.map((p) => tree.get(p).id));
    if (FLAT_HOOKS.every((n, i) => blobs.get(tree.get(paths[i]).id).equals(flat.get(n)))) return sha;
  }
  return null;
}

// ---------------------------------------------------------------- files

function readIfPresent(file) {
  try {
    return fs.readFileSync(file);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return null;
    throw e;
  }
}

// A new file, written whole (exclusive create, fsync).
function writeNew(file, data, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'wx', mode);
  try {
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

// A manifest or DEPLOYED.json path: relative, forward slashes, no empty, "."
// or ".." segment, no drive.
function safeRel(rel) {
  return typeof rel === 'string' && rel !== '' && !rel.includes('\\') && !/^[A-Za-z]:/.test(rel)
    && rel.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
}

const inFolder = (dir, rel) => path.join(dir, ...rel.split('/'));

// Every file under `dir`, relative, forward slashes.
function listFiles(dir, prefix = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...listFiles(path.join(dir, d.name), rel));
    else out.push(rel);
  }
  return out;
}

// Rename the finished temp folder into place. Windows refuses a rename onto
// an existing folder with EPERM, the same code a scanner's open handle gives,
// so the target is checked before each try and after each failure: another
// deploy that got there first means "reuse theirs" (returns true), never
// "retry". Checking first also keeps POSIX from replacing an empty folder.
async function renameIntoPlace(from, to) {
  const t0 = Date.now();
  for (let delay = 25; ; delay = Math.min(delay * 2, 400)) {
    if (fs.existsSync(to)) return true;
    try {
      fs.renameSync(from, to);
      return false;
    } catch (e) {
      if (fs.existsSync(to)) return true;
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || Date.now() - t0 >= RENAME_RETRY_MS) throw e;
      await sleep(delay);
    }
  }
}

// Build a version folder from `files` (Map rel -> {bytes, mode}): copy into a
// temp folder, read every copy back and compare it with its source bytes,
// run `confirm` (problems it returns refuse), write DEPLOYED.json, rename.
// The temp folder is removed on every path but a kept rename. Returns
// {raced}: true when another deploy put the folder there first. A removal
// that fails goes into `warnings`, never in place of the outcome.
async function buildFolder({ hooksDir, version, files, meta, confirm, warnings, seams = {} }) {
  fs.mkdirSync(hooksDir, { recursive: true });
  const tmp = path.join(hooksDir, `${version}.tmp-${randomBytes(6).toString('hex')}`);
  // mkdir without recursive fails if the name exists: we only ever write
  // into a folder this call made.
  fs.mkdirSync(tmp);
  let kept = false;
  let tried = false;
  // Remove the temp folder, once; true when it is gone. On Windows a
  // scanner briefly holds files just written (EBUSY, EPERM): retry, as
  // probes/run.mjs's cleanup does. A throw from here would replace the real
  // outcome (a cmp refusal, a raced reuse) with an internal error, so a
  // removal that still fails is a warning. The folder was never live, and
  // status lists it as a leftover.
  const discard = () => {
    tried = true;
    try {
      fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      return true;
    } catch (e) {
      warnings.push(`the temp build folder ${tmp} could not be removed (${e.code || e.message}); it was never live, and status lists it as a leftover`);
      return false;
    }
  };
  try {
    for (const [rel, { bytes, mode }] of files) writeNew(inFolder(tmp, rel), bytes, mode);
    if (seams.afterCopy) await seams.afterCopy(tmp);
    const differs = [...files].filter(([rel, { bytes }]) => !(readIfPresent(inFolder(tmp, rel))?.equals(bytes))).map(([rel]) => rel);
    if (differs.length) {
      // Removed before the refusal is worded, so it says what happened.
      const removed = discard();
      const where = removed ? 'The temp folder was removed (it was never live)' : `The temp folder ${tmp} could not be removed (it was never live, and status lists it as a leftover)`;
      throw refuse(`cmp failed: ${differs.join(', ')} in the new folder differ from the source. ${where}, and settings were not touched.`, { cmpFailed: differs });
    }
    const problems = confirm ? confirm() : [];
    if (problems.length) throw refuse(problems.join('; '));
    const deployed = {
      version,
      commit: meta.commit,
      source: meta.source,
      files: Object.fromEntries([...files].map(([rel, { bytes }]) => [rel, sha256(bytes)])),
      builtAt: new Date().toISOString(),
      ...(meta.extras ? { extras: meta.extras } : {}),
    };
    writeNew(path.join(tmp, DEPLOYED), `${JSON.stringify(deployed, null, 2)}\n`);
    const raced = await renameIntoPlace(tmp, path.join(hooksDir, version));
    kept = !raced;
    return { raced };
  } finally {
    if (!kept && !tried) discard();
  }
}

// A kept folder checked against its own DEPLOYED.json: {ok, problems,
// warnings, deployed}. Every listed file must exist with its sha256; a file
// the folder holds but DEPLOYED.json doesn't list is a warning.
export function verifyFolder(dir, version) {
  const problems = [];
  const warnings = [];
  let st;
  try {
    st = fs.statSync(dir);
  } catch {
    return { ok: false, problems: [`${version} does not exist`], warnings, deployed: null };
  }
  if (!st.isDirectory()) return { ok: false, problems: [`${version} is not a folder`], warnings, deployed: null };
  let deployed;
  try {
    deployed = JSON.parse(fs.readFileSync(path.join(dir, DEPLOYED), 'utf8'));
  } catch (e) {
    return { ok: false, problems: [`${version}/${DEPLOYED} ${e.code === 'ENOENT' ? 'is missing' : 'is unreadable or not JSON'}`], warnings, deployed: null };
  }
  if (!isObj(deployed)) return { ok: false, problems: [`${version}/${DEPLOYED} is not a JSON object`], warnings, deployed: null };
  if (deployed.version !== version) problems.push(`${DEPLOYED} names the version ${fmt(deployed.version)}, not ${version}`);
  if (!['git', 'flat'].includes(deployed.source)) problems.push(`${DEPLOYED} has no known source (${fmt(deployed.source)})`);
  if (!isObj(deployed.files) || !Object.keys(deployed.files).length) {
    problems.push(`${DEPLOYED} lists no files`);
    return { ok: false, problems, warnings, deployed };
  }
  for (const [rel, want] of Object.entries(deployed.files)) {
    if (!safeRel(rel) || rel === DEPLOYED) {
      problems.push(`${DEPLOYED} lists an unsafe path ${fmt(rel)}`);
      continue;
    }
    if (typeof want !== 'string' || !/^[0-9a-f]{64}$/.test(want)) {
      problems.push(`${DEPLOYED} gives ${rel} no sha256`);
      continue;
    }
    const bytes = readIfPresent(inFolder(dir, rel));
    if (bytes === null) problems.push(`${rel} is missing`);
    else if (sha256(bytes) !== want) problems.push(`${rel} does not match its sha256 in ${DEPLOYED}`);
  }
  for (const rel of listFiles(dir)) {
    if (rel !== DEPLOYED && !Object.hasOwn(deployed.files, rel)) warnings.push(`${version}/${rel} is in the folder but not in ${DEPLOYED}`);
  }
  return { ok: problems.length === 0, problems, warnings, deployed };
}

// The kept version folders under the hooks folder, sorted.
function keptFolders(hooksDir) {
  let names;
  try {
    names = fs.readdirSync(hooksDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return { kept: [], temps: [] };
    throw e;
  }
  return {
    kept: names.filter((d) => d.isDirectory() && VERSION_RE.test(d.name)).map((d) => d.name).sort(),
    temps: names.filter((d) => d.isDirectory() && TEMP_RE.test(d.name)).map((d) => d.name).sort(),
  };
}

// A deployed copy that calls a sibling by its flat path reaches the flat copy
// (or nothing, once the flat files go), not its own version's. A file naming
// itself is a message (run: node ~/.claude/hooks/x.mjs), not a call.
function siblingWarnings(files) {
  const out = [];
  for (const [rel, { bytes }] of files) {
    const named = new Set();
    for (const m of bytes.toString('utf8').matchAll(/\.claude[\\/]hooks[\\/]([\w./-]+)/g)) {
      if (!m[1].startsWith('v-') && m[1] !== rel && files.has(m[1])) named.add(m[1]);
    }
    for (const sib of named) out.push(`${rel} names its sibling ${sib} by the flat path ~/.claude/hooks/${sib}: deployed, it reaches the flat copy (or nothing, once the flat files go), not its own version's ${sib}`);
  }
  return out;
}

// ---------------------------------------------------------------- settings

function readSettings(file) {
  let bytes;
  try {
    bytes = fs.readFileSync(file);
  } catch (e) {
    throw refuse(`cannot read the settings file ${file}: ${e.code || e.message}`);
  }
  let doc;
  try {
    // An escape, never the literal character: an editor can drop an
    // invisible BOM from source, which would leave /^/ and strip nothing.
    doc = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  } catch {
    throw refuse(`the settings file ${file} is not valid JSON`);
  }
  if (!isObj(doc)) throw refuse(`the settings file ${file} does not hold a JSON object`);
  return { bytes, doc, sha: sha256(bytes) };
}

// Every string value in a document, with its path.
function* stringsIn(v, p = []) {
  if (typeof v === 'string') yield { path: p, text: v };
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* stringsIn(v[i], [...p, i]);
  else if (isObj(v)) for (const k of Object.keys(v)) yield* stringsIn(v[k], [...p, k]);
}

const isCommand = (p) => p[p.length - 1] === 'command';
const isStatusLine = (p) => p.length === 2 && p[0] === 'statusLine' && p[1] === 'command';

// Any mention of the hooks folder or the legacy status line script, in any
// spelling. `.claude/hooks-old` is another folder, so a word character, dot
// or dash right after the name ends the match.
const HOOKS_MENTION = /\.claude[\\/]+hooks(?![\w.-])/gi;
const LEGACY_MENTION = /\.claude[\\/]+statusline\.py(?![\w.-])/gi;
const PATH_CHAR = /[\w./-]/;
const wordStart = (s, i) => i === 0 || /\s/.test(s[i - 1]);

// Each reference in a command: {start, end, form, version, file}. form is
// 'flat' (~/.claude/hooks/<file>), 'versioned' (~/.claude/hooks/<v>/<file>),
// 'legacy' (~/.claude/statusline.py) or 'unknown' (any other spelling, where
// start..end covers the mention). end is the end of the path's run of path
// characters, so `x.sh;` or `x.sh"` stop at the file name.
export function scanCommand(cmd) {
  const refs = [];
  for (const m of cmd.matchAll(HOOKS_MENTION)) {
    const start = m.index - 2;
    if (start < 0 || !wordStart(cmd, start) || cmd.slice(start, start + TILDE_HOOKS.length) !== TILDE_HOOKS) {
      refs.push({ start: Math.max(0, start), end: m.index + m[0].length, form: 'unknown', version: null, file: null });
      continue;
    }
    let end = start + TILDE_HOOKS.length;
    while (end < cmd.length && PATH_CHAR.test(cmd[end])) end++;
    const rest = cmd.slice(start + TILDE_HOOKS.length, end);
    const v = /^(v-(?:flat-)?[0-9a-f]{12})\/(.*)$/.exec(rest);
    refs.push(v ? { start, end, form: 'versioned', version: v[1], file: v[2] } : { start, end, form: 'flat', version: null, file: rest });
  }
  for (const m of cmd.matchAll(LEGACY_MENTION)) {
    const start = m.index - 2;
    const end = m.index + m[0].length;
    const exact = start >= 0 && wordStart(cmd, start) && cmd.slice(start, end) === TILDE_LEGACY && !(end < cmd.length && PATH_CHAR.test(cmd[end]));
    refs.push(exact ? { start, end, form: 'legacy', version: null, file: STATUSLINE } : { start: Math.max(0, start), end, form: 'unknown', version: null, file: null });
  }
  return refs.sort((a, b) => a.start - b.start);
}

// The version settings point at: one version name, 'flat' (the flat files
// and the legacy status line), 'mixed', 'unknown' (only unknown spellings),
// or null (no command names the hooks folder); with every reference found.
export function activeOf(doc) {
  const references = [];
  for (const s of stringsIn(doc)) {
    if (!isCommand(s.path)) continue;
    for (const r of scanCommand(s.text)) references.push({ path: s.path, form: r.form, version: r.version, file: r.file });
  }
  const kinds = new Set(references.map((r) => (r.form === 'versioned' ? r.version : r.form === 'unknown' ? 'unknown' : 'flat')));
  return { active: kinds.size === 0 ? null : kinds.size === 1 ? [...kinds][0] : 'mixed', references };
}

// A command as output may show it.
const shown = (p, v) => (secretShaped(p, v) ? describeValue(v) : v);

// The whitespace-delimited word holding start..end, for messages: an unknown
// spelling's match starts mid-word ($HOME/.claude/hooks/x.sh).
function wordAround(text, start, end) {
  let a = start;
  while (a > 0 && !/\s/.test(text[a - 1])) a--;
  let b = end;
  while (b < text.length && !/\s/.test(text[b])) b++;
  return text.slice(a, b);
}

function problemOf(ref, at, files, target) {
  if (ref.form === 'unknown') return 'names the hooks folder (or the status line script) in a form deploy does not rewrite: only ~/.claude/hooks/<file> at the start of a word';
  if (ref.form === 'legacy') {
    if (!isStatusLine(at)) return `names ${TILDE_LEGACY} outside statusLine.command`;
    return files.has(STATUSLINE) ? null : `names ${TILDE_LEGACY}, but ${target} holds no ${STATUSLINE}`;
  }
  if (files.has(ref.file)) return null;
  return `names ${TILDE_HOOKS}${ref.version ? `${ref.version}/` : ''}${ref.file}, and ${ref.file ? `${ref.file} is not a file ${target} holds` : 'no file'}`;
}

// The ops that switch every command to `target` (files: the Set of files it
// holds), then `extra` (the --patch ops). Refuses, before anything is
// written, on any reference the rules don't cover, and on any reference left
// pointing elsewhere once all the ops are applied to a copy.
function planSwitch(doc, target, files, extra = []) {
  const ops = [];
  const changes = [];
  const problems = [];
  const warnings = [];
  for (const s of stringsIn(doc)) {
    const refs = scanCommand(s.text);
    if (!refs.length) continue;
    if (!isCommand(s.path)) {
      warnings.push(`${fmt(s.path)} names the hooks folder (or the status line script) outside a command; left as it is`);
      continue;
    }
    let out = '';
    let last = 0;
    let bad = false;
    for (const r of refs) {
      const why = problemOf(r, s.path, files, target);
      if (why) {
        bad = true;
        problems.push({ path: s.path, reference: shown(s.path, wordAround(s.text, r.start, r.end)), problem: why });
        continue;
      }
      out += `${s.text.slice(last, r.start)}${TILDE_HOOKS}${target}/${r.file}`;
      last = r.end;
    }
    out += s.text.slice(last);
    if (bad || out === s.text) continue;
    ops.push({ op: 'test', path: s.path, value: s.text }, { op: 'set', path: s.path, value: out });
    changes.push({ path: s.path, from: shown(s.path, s.text), to: shown(s.path, out) });
  }
  if (problems.length) {
    throw refuse(`${problems.length} command reference(s) to the hooks folder can't be switched to ${target}; nothing was written: ${problems.map((p) => `${fmt(p.path)} ${p.problem}`).join('; ')}`, { problems });
  }
  if (extra.length) {
    try {
      validateOps(extra);
    } catch (e) {
      throw refuse(`the --patch ops are not valid: ${e.message}`);
    }
  }
  const all = [...ops, ...extra];
  if (all.length) {
    const sim = cloneJson(doc);
    try {
      applyOps(sim, all);
    } catch (e) {
      throw refuse(`the switch would not apply: ${e.message}; nothing was written`);
    }
    const left = [];
    for (const s of stringsIn(sim)) {
      if (!isCommand(s.path)) continue;
      for (const r of scanCommand(s.text)) {
        if (r.form !== 'versioned' || r.version !== target || !files.has(r.file)) left.push({ path: s.path, reference: shown(s.path, wordAround(s.text, r.start, r.end)) });
      }
    }
    if (left.length) {
      throw refuse(`after the switch, ${left.length} command reference(s) would still not name ${target} and a file it holds (a --patch op?): ${left.map((l) => fmt(l.path)).join(', ')}; nothing was written`, { problems: left });
    }
  }
  return { ops: all, changes, warnings };
}

// ---------------------------------------------------------------- peers gate

// KTD 23 through peers.mjs: {pass, ok, busyAnywhere, busy: [{pid, name,
// status}], error?, warnings}. Loaded when needed, so a missing squeaky-clean
// folder fails the gate (peers unknown), not every action.
async function peersGate(repo, registry = {}) {
  let peers;
  let lib;
  try {
    peers = await import(pathToFileURL(PEERS_MODULE).href);
    lib = await import(pathToFileURL(SQUEAKY_LIB).href);
  } catch (e) {
    return { pass: false, ok: false, busyAnywhere: true, busy: [], error: `peers.mjs could not load: ${e.message}`, warnings: [] };
  }
  let out;
  try {
    out = peers.listPeers({
      sessionsDir: registry.sessionsDir ?? peers.registryDir(),
      selfPid: registry.selfPid ?? peers.envSelfPid(),
      selfSession: registry.selfSession ?? (process.env.CLAUDE_CODE_SESSION_ID || ''),
      toplevel: lib.canonAbs(repo),
    });
  } catch (e) {
    out = { ok: false, busyAnywhere: true, others: [], error: `peers.mjs failed: ${e.message}`, warnings: [] };
  }
  const busy = (out.others || []).filter((o) => o.status !== 'idle').map((o) => ({ pid: o.pid, name: o.name, status: o.status }));
  return {
    pass: out.ok === true && out.busyAnywhere === false,
    ok: out.ok === true,
    busyAnywhere: out.busyAnywhere !== false,
    busy,
    ...(out.error ? { error: out.error } : {}),
    warnings: out.warnings || [],
  };
}

function gateMessage(gate) {
  if (!gate.ok) return `the peers gate could not check the other sessions (${gate.error || 'peers.mjs answered ok: false'}), and settings.json is user-global: every session must be seen idle first`;
  return `settings.json is user-global and ${gate.busy.length} other session(s) are not idle: ${gate.busy.map((b) => `${b.name ?? '(unnamed)'} (pid ${b.pid}, ${b.status})`).join(', ')}`;
}

// ---------------------------------------------------------------- the log

function readLog(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return { entries: [], unreadable: 0 };
    throw e;
  }
  const entries = [];
  let unreadable = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (isObj(e)) entries.push(e);
      else unreadable++;
    } catch {
      unreadable++;
    }
  }
  return { entries, unreadable };
}

// One line, one write. A line left without its newline by a crash is closed
// first, so this entry never joins it.
function appendLog(file, entry) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'a+', 0o600);
  try {
    const size = fs.fstatSync(fd).size;
    let lead = '';
    if (size > 0) {
      const last = Buffer.alloc(1);
      fs.readSync(fd, last, 0, 1, size - 1);
      if (last[0] !== 0x0a) lead = '\n';
    }
    const data = Buffer.from(`${lead}${JSON.stringify(entry)}\n`, 'utf8');
    let off = 0;
    while (off < data.length) off += fs.writeSync(fd, data, off, data.length - off);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

// A log entry's id: what a bare rollback's {undoes} names.
const newId = () => randomBytes(8).toString('hex');

// The switches still in force, oldest first: the log replayed as a stack. A
// deploy or a rollback --to pushes its entry; a bare rollback's entry, which
// carries {undoes: <id>}, pops the entry it undid. snapshot-flat switches
// nothing and is skipped. {stack, error}: error when an undo names something
// other than the top, which only a hand-edited or interleaved log gives.
function switchStack(entries) {
  const stack = [];
  for (const e of entries) {
    if (e.action !== 'deploy' && e.action !== 'rollback') continue;
    if (e.undoes === undefined) {
      stack.push(e);
      continue;
    }
    const top = stack[stack.length - 1];
    if (!top || top.id !== e.undoes) {
      return { stack, error: `an entry undoes ${fmt(e.undoes)}, but the newest switch still in force then was ${top ? fmt(top.id) : 'none'}` };
    }
    stack.pop();
  }
  return { stack };
}

const foldPath = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));

// The inverse file a switch's log entry names, read and checked: it must
// undo a write to this settings file, the very write the entry logged, and
// hold only ops the writer applies. An irreversible op (an old value that was
// secret-shaped, so never stored) refuses by name: undoing the rest would
// leave that value as the switch set it.
function loadInverse(entry, settingsFile) {
  const file = entry.inverse;
  const by = `the switch ${entry.id} (to ${entry.version})`;
  // A resync (a rollback --to that found settings already where it points)
  // wrote nothing, so it has nothing to undo.
  if (entry.resync === true) throw refuse(`${by} is a resync: rollback --to found settings already pointing at ${fmt(entry.version)} and wrote nothing, so there is nothing to undo exactly: pass --to`);
  if (typeof file !== 'string' || !file) throw refuse(`${by} logged no inverse file, so it can't be undone exactly: pass --to`);
  let inv;
  try {
    inv = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw refuse(`the inverse file of ${by}, ${file}, ${e.code === 'ENOENT' ? 'is missing' : 'is unreadable or not JSON'}, so it can't be undone exactly: pass --to`, { inverse: file });
  }
  if (!isObj(inv) || !isObj(inv.inverseOf) || !Array.isArray(inv.ops)) throw refuse(`${file}, the inverse file of ${by}, is not an inverse file`, { inverse: file });
  if (inv.inverseOf.target !== 'settings' || typeof inv.inverseOf.file !== 'string' || foldPath(inv.inverseOf.file) !== foldPath(settingsFile)) {
    throw refuse(`${file}, the inverse file of ${by}, undoes a ${fmt(inv.inverseOf.target)} write to ${fmt(inv.inverseOf.file)}, not one to ${settingsFile}`, { inverse: file });
  }
  if (inv.inverseOf.after !== entry.settingsAfter) {
    throw refuse(`${file} undoes a write that left settings at sha256 ${fmt(inv.inverseOf.after)}, but ${by} left ${fmt(entry.settingsAfter)}: it is not that switch's inverse`, { inverse: file });
  }
  const irreversible = inv.ops.filter((op) => isObj(op) && op.irreversible === true);
  if (irreversible.length) {
    throw refuse(`${by} can't be undone exactly: its inverse ${file} holds ${irreversible.length} irreversible op(s), whose old values were secret-shaped and never stored: ${irreversible.map((op) => fmt(op.path)).join(', ')}. Nothing was written. Put those values back by hand through the writer, then pass --to`, { inverse: file, irreversible: irreversible.map((op) => op.path) });
  }
  try {
    validateOps(inv.ops);
  } catch (e) {
    throw refuse(`${file}, the inverse file of ${by}, holds ops the writer refuses: ${e.message}`, { inverse: file });
  }
  return { file, ops: inv.ops };
}

// The writer a printed command runs, and the file it imports.
const WRITER = 'tools/settings-write.mjs';
const WRITER_IMPORTS = Object.freeze(['lib/encoding.mjs']);

// One argument quoted for a POSIX shell (Git Bash here, sh in CI): inside
// single quotes nothing is special but the quote itself, written '\''.
const shQuote = (s) => `'${String(s).replaceAll("'", "'\\''")}'`;

// What PowerShell reads as a single quote, in single quotes or out (it
// writes one as '' there, where POSIX writes '\''): the straight one and the
// curly ones, U+2018 to U+201B.
const PWSH_QUOTE = /['\u2018-\u201B]/;

const isFile = (f) => {
  try {
    return fs.statSync(f).isFile();
  } catch {
    return false;
  }
};

// The manual way back: `entry`'s logged inverse, applied by the writer
// itself, restores settings exactly as that switch found them (flat paths
// included), its test ops refusing if they changed since. It is offered only
// where it leads somewhere sound. Applied in memory to `doc` (settings as
// they are now) it must apply, and then every command reference must name a
// kept folder that passes its DEPLOYED.json check and holds the file named,
// a flat hook that exists, or the legacy status line, which must exist. A
// way back onto the folder that just failed its check, or onto files that
// are gone, would leave every session's hooks naming missing or tampered
// scripts, and this path skips the peers gate. null otherwise: no inverse,
// another write's, an irreversible op, one that no longer applies, or a
// landing that fails those checks. A folder whose check throws (a listed
// file that is a folder: EISDIR; an unreadable one) fails it: a throw here
// would turn the refusal or the exit 4 this is offered with into exit 1.
//
// The command runs the writer deployed in the folder this way back lands on
// (the switch's previous, normally) when that folder holds one, verified;
// else the working tree's. Never the writer of the version being escaped,
// which may be why it is being escaped. commandLine is the same argv with
// node bare and every argument single-quoted (shQuote): PowerShell 7 parses
// a line that opens with a quoted string as an expression and stops at the
// next word ("Unexpected token"), while a bare command name followed by
// single-quoted arguments it runs as Git Bash and sh do.
function fallbackOf(entry, { settingsFile, hooksDir, doc }) {
  if (!isObj(entry) || !isObj(doc)) return null;
  const sim = cloneJson(doc);
  let inverse;
  try {
    inverse = loadInverse(entry, settingsFile);
    applyOps(sim, inverse.ops);
  } catch {
    return null;
  }
  const checked = new Map();
  const check = (v) => {
    if (!checked.has(v)) {
      let r;
      try {
        r = verifyFolder(path.join(hooksDir, v), v);
      } catch (e) {
        r = { ok: false, problems: [`${v} could not be checked (${e.code || e.message})`], warnings: [], deployed: null };
      }
      checked.set(v, r);
    }
    return checked.get(v);
  };
  const { active, references } = activeOf(sim);
  for (const r of references) {
    if (r.form === 'versioned') {
      const v = check(r.version);
      if (!v.ok || !Object.hasOwn(v.deployed.files, r.file)) return null;
    } else if (r.form === 'flat') {
      if (!safeRel(r.file) || !isFile(inFolder(hooksDir, r.file))) return null;
    } else if (r.form === 'legacy') {
      if (!isFile(path.join(path.dirname(hooksDir), STATUSLINE))) return null;
    } else return null;
  }
  let writer = { file: inFolder(HERE, WRITER), from: 'working tree' };
  if (typeof active === 'string' && VERSION_RE.test(active)) {
    const d = check(active);
    if (d.ok && [WRITER, ...WRITER_IMPORTS].every((rel) => Object.hasOwn(d.deployed.files, rel))) writer = { file: inFolder(path.join(hooksDir, active), WRITER), from: active };
  }
  const command = ['node', writer.file, '--target', 'settings', '--file', settingsFile, '--apply-inverse', inverse.file];
  return {
    undoes: entry.id ?? null,
    version: entry.version ?? null,
    previous: entry.previous ?? null,
    inverse: inverse.file,
    lands: active,
    writer: writer.file,
    writerFrom: writer.from,
    command,
    commandLine: [command[0], ...command.slice(1).map(shQuote)].join(' '),
  };
}

// The words that offer a manual way back: the shells its line is for, what
// it restores, what it skips, and what rollback --to the folder it lands on
// then logs (pointTo): the switch's undo when settings are byte for byte
// what the switch found and the folder is its previous; else a resync,
// unless the log has settings at that folder already (a switch that kept
// its version: a --patch alone), when it logs nothing. A landing on no
// version folder (the flat files, a mix, no hooks command) is one --to
// can't name: a bare rollback records it instead (undoBasis's byte-for-byte
// undo), while the switch is the newest in force and settings are then byte
// for byte what it found.
function fallbackText(fb) {
  const shells = fb.command.slice(1).some((a) => PWSH_QUOTE.test(a))
    ? 'for a POSIX shell (Git Bash) only, since an argument holds a single quote'
    : 'for Git Bash, sh or PowerShell 7';
  let record = `afterwards, while ${fb.undoes} is the newest switch in force, a bare rollback records it as its undo when settings are then byte for byte what that switch found; otherwise the deploy log goes on naming ${fb.undoes} as in force`;
  if (typeof fb.lands === 'string' && VERSION_RE.test(fb.lands)) {
    const then = `afterwards, rollback --to ${fb.lands}`;
    const exact = `as the undo of ${fb.undoes} when settings are then byte for byte what that switch found`;
    const stays = `the deploy log goes on naming ${fb.undoes} as in force`;
    if (fb.lands === fb.previous) record = fb.lands === fb.version ? `${then} records it ${exact}; otherwise it logs nothing, and ${stays}` : `${then} records it ${exact}, otherwise as a resync`;
    else record = fb.lands === fb.version ? `${then} logs nothing (the log has settings there already), and ${stays}` : `${then} records in the deploy log where settings point (a resync)`;
  }
  const runs = fb.writerFrom === 'working tree' ? 'the writer in the working tree' : `the writer deployed in ${fb.writerFrom}`;
  return `The manual way back, ${shells}: ${fb.commandLine} restores settings exactly as the switch ${fb.undoes} (${fmt(fb.previous)} to ${fmt(fb.version)}) found them, pointing at ${fmt(fb.lands)}. It runs ${runs} directly, so it skips the peers gate (run it only while every other session is idle) and the deploy log (${record})`;
}

// A planning refusal with the manual way back added to it.
function withFallback(e, fb) {
  if (!(e instanceof Refusal) || !fb) return e;
  return new Refusal(e.exit, `${e.message}. ${fallbackText(fb)}`, { ...e.extra, fallback: fb });
}

// ---------------------------------------------------------------- actions

function context(o) {
  const claude = path.join(os.homedir(), '.claude');
  let settings = o.settings;
  if (settings === undefined || settings === null) {
    // The writer refuses its default here too: the CLI reads settings from
    // CLAUDE_CONFIG_DIR then, and a guess could switch the wrong file.
    if (process.env.CLAUDE_CONFIG_DIR) throw refuse('CLAUDE_CONFIG_DIR is set, so the CLI reads its settings from there: pass --settings explicitly');
    settings = path.join(claude, 'settings.json');
  }
  return {
    hooksDir: path.resolve(o.hooksDir ?? path.join(claude, 'hooks')),
    settings: path.resolve(settings),
    log: path.resolve(o.log ?? path.join(claude, 'flow', 'deploys.jsonl')),
  };
}

async function act(action, o, body) {
  const res = { ok: false, exit: EXIT.INTERNAL, action, dryRun: !!o.dryRun, warnings: [] };
  try {
    const ctx = context(o);
    Object.assign(res, { hooksDir: ctx.hooksDir, settings: ctx.settings, log: ctx.log });
    await body(res, ctx);
    res.ok = true;
    res.exit = EXIT.OK;
  } catch (e) {
    res.ok = false;
    if (e instanceof Refusal) {
      res.exit = e.exit;
      res.error = e.message;
      Object.assign(res, e.extra);
    } else {
      res.exit = EXIT.INTERNAL;
      res.error = `internal error: ${e?.code ? `${e.code} ` : ''}${e?.message ?? e}`;
    }
  }
  return res;
}

// The --patch ops, from a patch object ({ops: [...]}).
function patchOps(patch) {
  if (patch === undefined || patch === null) return [];
  if (!isObj(patch) || Object.keys(patch).some((k) => k !== 'ops') || !Array.isArray(patch.ops) || !patch.ops.length) {
    throw refuse('--patch must hold {"ops": [...]}: a non-empty list of settings-writer ops, nothing else');
  }
  return patch.ops;
}

// Steps 3-5 for deploy and rollback: the gate, the one write, the re-read,
// the log. `from` is the settings read ({doc, sha}) the ops were planned
// on. `entry` joins the log line (a bare rollback's undoes). `logNoop`, when
// an object, logs a switch that writes nothing, with its fields joined: a
// bare rollback's undo still pops the stack ({}), and a rollback --to that
// finds settings already where it points, while the log's newest switch in
// force names another version, is a resync ({resync: true}).
async function switchTo(res, ctx, o, { action, version, commit, previous, ops, repo, from, entry = {}, logNoop = null }) {
  const noopLine = (sha) => logNoopLine(res, ctx, { action, version, commit, previous, sha, fields: { ...entry, ...logNoop } });
  if (!ops.length) {
    res.noop = true;
    res.warnings.push(`no command needs switching (every hooks-folder reference already names ${version}, or there is none): nothing written`);
    if (logNoop && o.dryRun) res.warnings.push('dry run: the no-op would be logged');
    else if (logNoop) {
      // No write binds this line to the read it describes, so the read is
      // checked again here.
      if (readSettings(ctx.settings).sha !== from.sha) throw new Refusal(EXIT.CONCURRENT, 'settings changed after rollback read them (another writer); nothing was logged. Run it again');
      noopLine(from.sha);
    }
    return;
  }
  // Where the write must leave settings: the ops applied to the planning
  // read. The writer applies the same ops to the same bytes (expectSha), so
  // the re-read after the write must show the same.
  const end = cloneJson(from.doc);
  try {
    applyOps(end, ops);
  } catch (e) {
    throw refuse(`the switch would not apply: ${e.message}; nothing was written`);
  }
  const expected = activeOf(end).active;
  const gate = await peersGate(repo, o.registry);
  res.peers = gate;
  if (!gate.pass) {
    if (!o.dryRun) throw refuse(`${gateMessage(gate)}; nothing was written`);
    res.warnings.push(`dry run: the peers gate would refuse: ${gateMessage(gate)}`);
  }
  // expectSha: the plan's test ops cover only the commands it rewrites, so
  // a hooks command another writer added since the plan's read (in the
  // build and gate window) would pass them and stay unswitched. Bound to
  // the read, any change refuses before writing.
  // persistCheck: whether the CLI locks settings.json when it writes it is
  // unmeasured, so a CLI write landing between the writer's re-check and its
  // rename would overwrite the switch silently. The re-read a moment later
  // turns that into exit 4 instead of a deploy that reports success.
  const w = await settingsWrite({ target: 'settings', file: ctx.settings, ops, expectSha: from.sha, dryRun: !!o.dryRun, inverseOut: o.inverseOut, seams: o.writerSeams, persistCheck: true, persistDelayMs: o.persistDelayMs === undefined ? undefined : Number(o.persistDelayMs) });
  res.writer = { ok: w.ok, exit: w.exit, before: w.before, after: w.after, written: w.written, noop: w.noop, inverse: w.inverse, warnings: w.warnings, ...(w.error ? { error: w.error } : {}) };
  if (!w.written) {
    if (!w.ok) {
      // The writer's own read differing from the plan's is a change since
      // the plan, whatever it then refused for: exit 3, as its
      // concurrent-change check is. Its expect-sha check comes first and
      // exits 3 itself; a writer from before that rule exits 2 there, which
      // the before sha still catches.
      if (w.exit === 3 || (typeof w.before === 'string' && w.before !== from.sha)) {
        throw new Refusal(EXIT.CONCURRENT, `settings changed after deploy read them to plan this switch (another writer, between the plan and the write); nothing was written. Run it again to plan from the settings as they are now (writer exit ${w.exit}: ${w.error})`);
      }
      throw new Refusal(w.exit === 1 ? EXIT.INTERNAL : EXIT.REFUSED, `the settings writer stopped with exit ${w.exit}: ${w.error}`);
    }
    if (!o.dryRun) {
      res.noop = true;
      // The writer read exactly the plan's bytes (expectSha) and found
      // nothing to change.
      if (logNoop) noopLine(w.before);
    }
    return;
  }
  // Written: the switch is in force, whatever a check after it says, so it
  // is logged either way; a failed check marks the line and exits 4.
  res.switched = true;
  let failed = w.ok ? null : `the settings writer stopped with exit ${w.exit} after writing: ${w.error}`;
  if (!failed) {
    let now;
    try {
      now = activeOf(readSettings(ctx.settings).doc).active;
    } catch (e) {
      failed = `the switch was written, but settings could not be read again: ${e.message}`;
    }
    if (!failed && now !== expected) failed = `the switch was written, but settings read again point at ${fmt(now)}, not ${fmt(expected)} (another writer since)`;
  }
  const id = newId();
  const line = { id, at: new Date().toISOString(), action, version, previous, commit, settingsBefore: w.before, settingsAfter: w.after, inverse: w.inverse, ...entry, ...(failed ? { postcheck: 'failed', postcheckError: failed } : {}) };
  try {
    appendLog(ctx.log, line);
  } catch (e) {
    throw new Refusal(EXIT.INTERNAL, `settings were switched to ${version}${failed ? ` (and ${failed})` : ''}, but the deploy log append failed (${e.code || e.message}); the writer's inverse file is ${w.inverse}`);
  }
  res.logId = id;
  if (failed) {
    const way = wayBack(ctx, line);
    throw new Refusal(w.exit === 1 ? EXIT.INTERNAL : EXIT.POSTCHECK, `${failed}. The switch is in force, and in the deploy log as ${id} (postcheck: failed). ${way.text}`, way.extra);
  }
}

// A switch that wrote nothing, logged: {settingsBefore, settingsAfter} are
// both the sha of the settings it found, and there is no inverse.
function logNoopLine(res, ctx, { action, version, commit, previous, sha, fields }) {
  const id = newId();
  try {
    appendLog(ctx.log, { id, at: new Date().toISOString(), action, version, previous, commit, settingsBefore: sha, settingsAfter: sha, inverse: null, noop: true, ...fields });
  } catch (e) {
    throw new Refusal(EXIT.INTERNAL, `settings needed no change, but the deploy log append failed (${e.code || e.message}): the log still names the switch it did before`);
  }
  res.logId = id;
  if (fields.resync) {
    res.resync = true;
    res.warnings.push(`logged as a resync (${id}): the deploy log's newest switch in force now names ${version}, as settings do`);
  } else if (fields.undoes) res.warnings.push(`the undo needed no write, and is logged (${id}) so ${fields.undoes} no longer counts as in force`);
}

// A value with every command's hooks-folder references cut down to the file
// each names (an unknown spelling is left as it is): two values equal this
// way differ in command pointers alone, which is all a pointer switch
// changes.
function unpointed(v, p) {
  if (typeof v === 'string') {
    if (!isCommand(p)) return v;
    let out = '';
    let last = 0;
    for (const r of scanCommand(v)) {
      if (r.form === 'unknown') continue;
      out += `${v.slice(last, r.start)}${TILDE_HOOKS}*/${r.file}`;
      last = r.end;
    }
    return `${out}${v.slice(last)}`;
  }
  if (Array.isArray(v)) return v.map((x, i) => unpointed(x, [...p, i]));
  if (isObj(v)) return Object.fromEntries(Object.keys(v).map((k) => [k, unpointed(v[k], [...p, k])]));
  return v;
}

// Why a switch's logged inverse can't be read, in plain words, for the
// advice after an exit 4. Never loadInverse's own message: that is worded
// for a refused undo ("Nothing was written. Put those values back by hand
// ... then pass --to"), which is false once the switch has landed, and on a
// rollback's line points back at the version the rollback left.
function inverseTrouble(line, e) {
  const irreversible = e?.extra?.irreversible;
  if (Array.isArray(irreversible) && irreversible.length) return `its inverse holds irreversible op(s) at ${irreversible.map(fmt).join(', ')}`;
  if (typeof line.inverse !== 'string' || !line.inverse) return 'it logged no inverse file';
  if (!isFile(line.inverse)) return 'its inverse file is missing';
  return 'its inverse file can\'t be read as this switch\'s inverse';
}

// What the switch a log line records wrote, read from its logged inverse and
// held against `doc` (settings as they are now), paths only, never values:
// {other, clobbered}, or {error} when the inverse can't be read (missing,
// another write's, irreversible): a plain reason (inverseTrouble). In an
// inverse, each restore op (set or delete) follows the test op that holds
// what the switch wrote there.
// other: the restore paths where the switch changed more than command
// pointers (a --patch's env, permissions or hook entries; for a bare
// rollback, what its undo put back), which rollback --to, a pointer switch,
// leaves as they are. The writer takes an array as one value, so a
// hooks.<event> path is named only when it changed beyond its pointers.
// clobbered: the paths whose test fails on `doc`: another writer has changed
// them since.
function wroteOf(line, ctx, doc) {
  let ops;
  try {
    ({ ops } = loadInverse(line, ctx.settings));
  } catch (e) {
    return { error: inverseTrouble(line, e) };
  }
  const other = [];
  const clobbered = [];
  ops.forEach((op, i) => {
    if (op.op === 'test') {
      try {
        applyOps(doc, [op]); // a test op reads, never writes
      } catch {
        clobbered.push(op.path);
      }
      return;
    }
    const wrote = ops[i - 1];
    const pointers = op.op === 'set' && wrote?.op === 'test' && fmt(wrote.path) === fmt(op.path) && Object.hasOwn(wrote, 'value')
      && deepEqual(unpointed(wrote.value, op.path), unpointed(op.value, op.path));
    if (!pointers) other.push(op.path);
  });
  return { other, clobbered };
}

// What to do about a switch that landed but failed a check after it (exit
// 4), read from the facts as they are now, never promised in advance:
// settings read again, and the deploy log replayed with this switch's
// `line` in it.
//
// A rollback's line (a bare undo or a --to) was on its way to its version,
// so the way on leads there, never back to `previous`, the version it left:
// a bare rollback would undo the switch below it, and the rollback's own
// inverse would put back what it replaced, so neither is offered. When
// settings point at the version, the rollback is in force and only the check
// failed (the words name any path it wrote that has changed since). Else
// rollback --to that version, when it plans. Else no way back is known.
//
// A deploy's line: a bare rollback when it is the newest switch in force,
// its undo plans, and settings still point at its version or are byte for
// byte what it found (then the bare rollback only records the undo). Else
// rollback --to the version before it (for "flat", the snapshot standing in
// for the flat files), when that folder passes its check and the pointer
// switch plans. Else this switch's own inverse by hand, when fallbackOf
// finds where it leads sound. Else no way back is known, and the words say
// so.
//
// --to is named only where it would plan: settings read again must hold a
// command that names the hooks folder (nothingToPoint, the check pointTo
// refuses on), and its folder and pointer switch must plan. Else the way on
// falls through to the inverse by hand (a deploy's), or to none.
//
// Whenever --to is named, the paths the switch wrote beyond command
// pointers, which --to leaves, are named with it; for a deploy, its inverse
// by hand is offered after --to (never ahead: it skips the peers gate and
// the log), when sound. {text, extra: {recovery: {how, to}, fallback?}}.
function wayBack(ctx, line) {
  const { id, version, previous } = line;
  const onward = line.action === 'rollback';
  let cur = null;
  let unread = null;
  try {
    cur = readSettings(ctx.settings);
  } catch (e) {
    unread = `settings could not be read again (${e.message})`;
  }
  let entries = [];
  let replay;
  try {
    ({ entries } = readLog(ctx.log));
    replay = switchStack(entries);
  } catch (e) {
    replay = { stack: [], error: `the deploy log could not be read (${e.code || e.message})` };
  }
  const scratch = () => ({ warnings: [] });
  const now = cur ? activeOf(cur.doc).active : null;

  let why;
  if (!cur) why = unread;
  else if (onward) {
    if (now === version) {
      const wrote = wroteOf(line, ctx, cur.doc);
      const since = wrote.error
        ? `Which of the paths it wrote have changed since is unknown: ${wrote.error}`
        : wrote.clobbered.length
          ? `Another writer has since changed paths it wrote: ${wrote.clobbered.map(fmt).join(', ')}`
          : 'Every path it wrote still holds what it wrote';
      return { text: `Settings point at ${version}, where this rollback was going: it is in force, and only the check after it failed. ${since}.`, extra: { recovery: { how: 'in force', to: version } } };
    }
    why = `settings now point at ${fmt(now)}, not ${version}, where this rollback was going`;
  } else if (now !== version && cur.sha !== line.settingsBefore) why = `a bare rollback would refuse: settings now point at ${fmt(now)}, not ${version}`;
  else if (replay.error) why = `a bare rollback would refuse: ${replay.error}`;
  else if (replay.stack[replay.stack.length - 1]?.id !== id) why = `a bare rollback would not undo it: the newest switch in force in the deploy log is no longer ${id}`;
  else {
    try {
      const basis = undoBasis(ctx, cur, replay);
      if (basis.gone) return { text: 'Settings are byte for byte what this switch found (another writer put them back), so a bare rollback records it as undone, writing nothing.', extra: { recovery: { how: 'bare rollback', to: null } } };
      undoPlan(scratch(), ctx, cur, entries, basis);
      return { text: 'A bare rollback can undo it.', extra: { recovery: { how: 'bare rollback', to: null } } };
    } catch (e) {
      why = `a bare rollback would refuse: ${e.message}`;
    }
  }

  let toWhy = null;
  if (cur) {
    const back = onward ? version : typeof previous === 'string' && VERSION_RE.test(previous) ? previous : previous === 'flat' ? snapshotOf(entries) : null;
    let plans = false;
    const none = back ? nothingToPoint(now, back) : null;
    if (!back) {
      toWhy = previous === 'flat'
        ? 'the version before was the flat files, and the deploy log names no snapshot-flat folder to stand in for them'
        : `the version before was ${fmt(previous)}, not a kept folder`;
    } else if (none) {
      toWhy = none;
    } else {
      try {
        planSwitch(cur.doc, back, rollbackFolder(scratch(), ctx, back));
        plans = true;
      } catch (e) {
        toWhy = `rollback --to ${back} would refuse too: ${e.message}`;
      }
    }
    if (plans) {
      const stands = !onward && previous === 'flat' ? ', the snapshot standing in for the flat files' : '';
      let text = `${cap(why)}. rollback --to ${back} points settings ${onward ? 'at' : 'back at'} ${back}${stands}.`;
      const wrote = wroteOf(line, ctx, cur.doc);
      let fb = null;
      if (wrote.error) text += ` It switches command pointers only, and which other paths this switch wrote is unknown: ${wrote.error}.`;
      else if (wrote.other.length) {
        text += ` It switches command pointers only, so the other paths this switch wrote stay as they are: ${wrote.other.map(fmt).join(', ')}.`;
        fb = onward ? null : fallbackOf(line, { settingsFile: ctx.settings, hooksDir: ctx.hooksDir, doc: cur.doc });
        if (fb) text += ` This switch's own inverse puts those back too. ${fallbackText(fb)}.`;
      }
      return { text, extra: { recovery: { how: 'rollback --to', to: back }, ...(fb ? { fallback: fb } : {}) } };
    }
  }
  // Unreadable settings are named even when the first reason was another.
  const reasons = cap([...new Set([why, unread, toWhy])].filter(Boolean).join('; '));
  if (onward) {
    return { text: `${reasons}. Put settings right through the writer by hand, then run rollback --to <a kept folder> to record where they point.`, extra: { recovery: { how: 'none', to: null } } };
  }
  const fb = cur ? fallbackOf(line, { settingsFile: ctx.settings, hooksDir: ctx.hooksDir, doc: cur.doc }) : null;
  if (fb) return { text: `${reasons}. ${fallbackText(fb)}.`, extra: { recovery: { how: 'by hand', to: null }, fallback: fb } };
  return {
    text: `${reasons}. Nor is this switch's own inverse a way back deploy can vouch for (it is missing, irreversible or no longer applies, or it would point settings at a folder or file that fails its check). Put settings right through the writer by hand, then run rollback --to <a kept folder> to record where they point.`,
    extra: { recovery: { how: 'none', to: null } },
  };
}

export function deploy(o = {}) {
  return act('deploy', o, async (res, ctx) => {
    const repo = toplevel(o.repo ?? HERE);
    const extra = patchOps(o.patch);
    const commit = resolveCommit(repo, o.commit ?? 'HEAD');
    const version = `v-${commit.slice(0, 12)}`;
    Object.assign(res, { version, commit });
    const files = commitFiles(repo, commit, [...MANIFEST]);
    res.warnings.push(...siblingWarnings(files));

    // 1. The plan, before anything is written.
    const cur = readSettings(ctx.settings);
    const previous = activeOf(cur.doc).active;
    res.previous = previous;
    const plan = planSwitch(cur.doc, version, new Set(MANIFEST), extra);
    res.changes = plan.changes;
    res.warnings.push(...plan.warnings);

    // 2. The folder: reuse a verified one, or build it.
    const folder = path.join(ctx.hooksDir, version);
    res.folder = folder;
    const reuse = () => {
      const v = verifyFolder(folder, version);
      res.warnings.push(...v.warnings);
      const problems = [...v.problems];
      if (v.deployed) {
        if (v.deployed.source !== 'git' || v.deployed.commit !== commit) problems.push(`it was not built from commit ${commit.slice(0, 12)} (source ${fmt(v.deployed.source)}, commit ${fmt(v.deployed.commit)})`);
        const listed = isObj(v.deployed.files) ? Object.keys(v.deployed.files) : [];
        const lacks = MANIFEST.filter((rel) => !listed.includes(rel));
        const more = listed.filter((rel) => !MANIFEST.includes(rel));
        if (lacks.length) problems.push(`it lacks ${lacks.join(', ')}`);
        if (more.length) problems.push(`it holds ${more.join(', ')}, which the manifest doesn't`);
        for (const [rel, { bytes }] of files) {
          if (listed.includes(rel) && !(readIfPresent(inFolder(folder, rel))?.equals(bytes))) problems.push(`${rel} differs from its blob`);
        }
      }
      // snapshot-flat names its folder by the commit the flat files match,
      // the same namespace: deploying that very commit finds the snapshot.
      const snapshot = v.deployed?.source === 'flat' ? ' It is the flat snapshot snapshot-flat named by this commit: deploy a later commit (any new commit, even an empty one) to build a full version.' : '';
      if (problems.length) throw refuse(`${version} already exists and does not match commit ${commit.slice(0, 12)}: ${[...new Set(problems)].join('; ')}. A version folder is never rewritten or deleted.${snapshot}`, { problems });
      res.reused = true;
    };
    if (fs.existsSync(folder)) reuse();
    else if (o.dryRun) res.wouldBuild = true;
    else {
      const { raced } = await buildFolder({ hooksDir: ctx.hooksDir, version, files, meta: { commit, source: 'git' }, warnings: res.warnings, seams: o.seams });
      if (raced) reuse();
      else res.built = true;
    }

    // 3-5. The gate, the one write (bound to the read the plan used), the
    // re-read, the log.
    await switchTo(res, ctx, o, { action: 'deploy', version, commit, previous, ops: plan.ops, repo, from: cur });
  });
}

export function snapshotFlat(o = {}) {
  return act('snapshot-flat', o, async (res, ctx) => {
    const repo = toplevel(o.repo ?? HERE);
    const readFlat = () => new Map(FLAT_HOOKS.map((n) => [n, readIfPresent(path.join(ctx.hooksDir, n))]));
    const flat = readFlat();
    const missing = FLAT_HOOKS.filter((n) => flat.get(n) === null);
    if (missing.length) throw refuse(`the hooks folder lacks ${missing.join(', ')}: snapshot-flat copies all six flat hooks or none`);
    const legacyPath = path.join(path.dirname(ctx.hooksDir), STATUSLINE);
    const legacy = readIfPresent(legacyPath);

    const rev = resolveCommit(repo, o.commit ?? 'HEAD');
    const commit = matchingCommit(repo, rev, flat);
    const files = new Map(FLAT_HOOKS.map((n) => [n, flat.get(n)]));
    if (legacy !== null) files.set(STATUSLINE, legacy);
    const version = commit ? `v-${commit.slice(0, 12)}` : `v-flat-${contentHash(files).slice(0, 12)}`;
    Object.assign(res, { version, commit, namedBy: commit ? 'commit' : 'content', statusline: legacy !== null });
    if (!commit) res.warnings.push(`no commit at or before ${rev.slice(0, 12)} holds all six flat hooks byte for byte under ${SOURCE_DIR}: the folder is named by content`);
    if (legacy === null) res.warnings.push(`no ${STATUSLINE} beside the hooks folder: the snapshot holds the six hooks only, so a rollback to it refuses while statusLine points into a version folder`);

    const folder = path.join(ctx.hooksDir, version);
    res.folder = folder;
    const reuse = () => {
      const v = verifyFolder(folder, version);
      res.warnings.push(...v.warnings);
      const problems = [...v.problems];
      if (v.deployed) {
        if (v.deployed.source !== 'flat') problems.push(`it is not a flat snapshot (source ${fmt(v.deployed.source)})`);
        // The six must be today's flat bytes; the status line must match
        // only while the legacy file still exists (once statusLine has moved
        // into a version folder and the legacy file is gone, the snapshot
        // keeps the copy it took).
        for (const [rel, bytes] of files) {
          if (!(readIfPresent(inFolder(folder, rel))?.equals(bytes))) problems.push(`${rel} differs from the flat file now`);
        }
      }
      if (problems.length) throw refuse(`${version} already exists and does not match the flat files: ${[...new Set(problems)].join('; ')}. A version folder is never rewritten or deleted.`, { problems });
      res.reused = true;
    };
    if (fs.existsSync(folder)) {
      reuse();
      return;
    }
    const modeOf = (file) => {
      try {
        return fs.statSync(file).mode & 0o777;
      } catch {
        return 0o644;
      }
    };
    const withModes = new Map([...files].map(([rel, bytes]) => [rel, { bytes, mode: modeOf(rel === STATUSLINE ? legacyPath : path.join(ctx.hooksDir, rel)) }]));
    // A flat file edited while the copy ran would leave a snapshot of no
    // moment in time: the sources are read again just before the rename.
    const confirm = () => {
      const again = readFlat();
      const changed = FLAT_HOOKS.filter((n) => !(again.get(n)?.equals(flat.get(n))));
      if (legacy !== null && !(readIfPresent(legacyPath)?.equals(legacy))) changed.push(STATUSLINE);
      return changed.length ? [`${changed.join(', ')} changed while the snapshot was being taken; nothing was kept`] : [];
    };
    const { raced } = await buildFolder({
      hooksDir: ctx.hooksDir,
      version,
      files: withModes,
      meta: { commit, source: 'flat', ...(legacy !== null ? { extras: { [STATUSLINE]: `../${STATUSLINE}` } } : {}) },
      confirm,
      warnings: res.warnings,
      seams: o.seams,
    });
    if (raced) {
      reuse();
      return;
    }
    res.built = true;
    appendLog(ctx.log, { id: newId(), at: new Date().toISOString(), action: 'snapshot-flat', version, previous: null, commit, settingsBefore: null, settingsAfter: null });
  });
}

// sha256 over every file in sorted name order, each as name NUL byte-length
// NUL bytes: the name a snapshot gets when no commit matches.
export function contentHash(files) {
  const h = createHash('sha256');
  for (const rel of [...files.keys()].sort()) {
    const bytes = files.get(rel);
    h.update(`${rel}\0${bytes.length}\0`);
    h.update(bytes);
  }
  return h.digest('hex');
}

export function rollback(o = {}) {
  return act('rollback', o, async (res, ctx) => {
    const repo = toplevel(o.repo ?? HERE);
    if (o.to !== undefined && (typeof o.to !== 'string' || !VERSION_RE.test(o.to))) throw refuse(`--to must name a version folder (v-<12 hex> or v-flat-<12 hex>), not ${fmt(o.to)}`);
    const cur = readSettings(ctx.settings);
    const current = activeOf(cur.doc).active;
    res.previous = current;
    const { entries } = readLog(ctx.log);
    const replay = switchStack(entries);
    if (o.to !== undefined) await pointTo(res, ctx, o, { repo, cur, current, target: o.to, replay });
    else await undoNewest(res, ctx, o, { repo, cur, current, entries, replay });
  });
}

// The kept folder a rollback switches to, which must pass its DEPLOYED.json
// check: the Set of files it holds. `out` (the result, or a scratch object
// for a plan that is only being tried) gets the folder, its commit and its
// warnings.
function rollbackFolder(out, ctx, target) {
  const folder = path.join(ctx.hooksDir, target);
  out.folder = folder;
  const v = verifyFolder(folder, target);
  out.warnings.push(...v.warnings);
  if (!v.ok) throw refuse(`${target} can't be rolled back to: ${v.problems.join('; ')}`, { problems: v.problems });
  out.commit = v.deployed.commit ?? null;
  return new Set(Object.keys(v.deployed.files));
}

// Why rollback --to `target` has nothing to point, or null. `active` is
// activeOf(settings).active: null when no command names the hooks folder,
// and a logged no-op would then claim settings name the target. The one
// check pointTo refuses on and wayBack asks before it names a --to, so an
// exit 4 never advises a --to that would refuse.
function nothingToPoint(active, target) {
  return active === null ? `settings hold no command that names the hooks folder, so rollback --to ${target} has nothing to point at it` : null;
}

// rollback --to: a pointer switch onto the named folder, from settings as
// they are. A refusal to plan names the manual way back, when there is a
// sound one. A log that doesn't replay names no trustworthy newest switch,
// so it then offers none, and logs no resync or undo either (it would not
// put the log right).
async function pointTo(res, ctx, o, { repo, cur, current, target, replay }) {
  res.version = target;
  const stack = replay.error ? [] : replay.stack;
  const top = stack[stack.length - 1];
  let plan;
  try {
    const none = nothingToPoint(current, target);
    if (none) throw refuse(`${none}; nothing was written or logged. Put the hooks commands back first (a deploy --patch, or the writer)`);
    plan = planSwitch(cur.doc, target, rollbackFolder(res, ctx, target));
  } catch (e) {
    throw withFallback(e, fallbackOf(top, { settingsFile: ctx.settings, hooksDir: ctx.hooksDir, doc: cur.doc }));
  }
  res.changes = plan.changes;
  res.warnings.push(...plan.warnings);
  // A no-op onto the folder the newest switch in force left (its previous),
  // with settings byte for byte what that switch found (a hand-applied
  // inverse, or a writer that put the old bytes back): its whole effect is
  // gone, so the no-op is logged as its undo, which pops it and leaves the
  // switch below within a bare rollback's reach. Never a resync's undo: a
  // resync wrote nothing, and popping it would leave the log naming the
  // version before it while settings name this one.
  const undoes = !plan.ops.length && isObj(top) && top.noop !== true && typeof top.id === 'string' && top.id !== '' && target === top.previous && cur.sha === top.settingsBefore;
  // Else settings already pointing at the target while the log's newest
  // switch in force names another version (settings changed outside
  // deploy): the no-op is logged as a resync, pushed like any --to, so the
  // log agrees with settings again.
  const resync = !undoes && top?.version !== target;
  if (undoes) res.warnings.push(`settings are byte for byte what ${top.id} found, and ${target} is the folder it left: its whole effect is gone already, so this is logged as its undo`);
  await switchTo(res, ctx, o, { action: 'rollback', version: target, commit: res.commit, previous: current, ops: plan.ops, repo, from: cur, entry: undoes ? { undoes: top.id } : {}, logNoop: undoes ? {} : resync && !replay.error ? { resync: true } : null });
  if (undoes) res.undoes = top.id;
  if (res.noop && resync && replay.error) res.warnings.push(`the deploy log does not replay as a stack (${replay.error}), so no resync was logged: it would not put the log right`);
}

// A bare rollback: undo the newest switch still in force (the header's
// steps 1-5). The undo's line pops the stack even when it needs no write.
// undoes and undone are set only once the undo is done (a dry run included)
// or its line is in the log (exit 4), never on a refusal.
async function undoNewest(res, ctx, o, { repo, cur, current, entries, replay }) {
  const basis = undoBasis(ctx, cur, replay);
  const { top, inverse } = basis;
  if (basis.gone) {
    // Settings are byte for byte what the switch found: there is nothing
    // to write, and the line pops it.
    res.warnings.push(`settings are byte for byte what ${top.id} found, though they point at ${fmt(current)}, not ${fmt(top.version)}: its whole effect is gone already (a hand-applied inverse, or a writer that put the old bytes back), so its undo is logged with nothing written`);
    res.version = current;
    await switchTo(res, ctx, o, { action: 'rollback', version: current, commit: null, previous: current, ops: [], repo, from: cur, entry: { undoes: top.id }, logNoop: {} });
    res.undoes = top.id;
    res.undone = [];
    return;
  }
  res.inverse = inverse.file;
  let plan;
  try {
    plan = undoPlan(res, ctx, cur, entries, basis);
  } catch (e) {
    throw withFallback(e, fallbackOf(top, { settingsFile: ctx.settings, hooksDir: ctx.hooksDir, doc: cur.doc }));
  }
  res.changes = plan.changes;
  const done = () => {
    res.undoes = top.id;
    res.undone = inverse.ops.filter((op) => op.op !== 'test').map((op) => ({ op: op.op, path: op.path }));
  };
  try {
    await switchTo(res, ctx, o, { action: 'rollback', version: plan.target, commit: res.commit, previous: current, ops: plan.ops, repo, from: cur, entry: { undoes: top.id }, logNoop: {} });
  } catch (e) {
    if (res.logId) done();
    throw e;
  }
  done();
}

// A bare rollback's first half (the header's steps 1 and 3): the newest
// switch still in force, which settings must point at, and its logged
// inverse applied to a copy of them: {top, inverse, sim}; or {top, gone:
// true} when settings point elsewhere but are byte for byte what that switch
// found (sha256 equal to its settingsBefore), so its whole effect is gone
// and the undo has nothing to write. Refuses with nothing written, and with
// no manual way back: each refusal here means that inverse is unknown or no
// longer fits settings.
function undoBasis(ctx, cur, replay) {
  if (replay.error) throw refuse(`the deploy log does not replay as a stack (${replay.error}), so which switch to undo is unknown: pass --to`);
  const top = replay.stack[replay.stack.length - 1];
  if (!top) throw refuse('the deploy log holds no switch still in force, so there is nothing to undo: pass --to to point settings at a kept folder');
  if (typeof top.id !== 'string' || !top.id) throw refuse(`the newest switch in the deploy log (to ${fmt(top.version)}) has no id, so its undo could not be recorded: pass --to`);
  const current = activeOf(cur.doc).active;
  if (current !== top.version) {
    if (top.noop !== true && cur.sha === top.settingsBefore) return { top, gone: true };
    throw refuse(`settings point at ${fmt(current)}, but the newest switch in the deploy log (${top.id}) went to ${fmt(top.version)}: settings changed outside deploy since. Pass --to to point them at a kept folder (when they already point at it, that logs a resync)`);
  }
  const inverse = loadInverse(top, ctx.settings);
  const sim = cloneJson(cur.doc);
  try {
    applyOps(sim, inverse.ops);
  } catch (e) {
    throw refuse(`the logged inverse of ${top.id}, ${inverse.file}, no longer applies: ${e.message}. Settings changed since that switch; nothing was written. Pass --to for a pointer switch`, { inverse: inverse.file });
  }
  return { top, inverse, sim };
}

// Its second half (steps 2 and 4): the target folder, and the switch of
// that copy onto it, which must leave settings pointing at the target
// alone: {target, ops, changes}. `out` gets the target, the folder's facts
// and the warnings. A refusal here may come with the manual way back.
function undoPlan(out, ctx, cur, entries, { top, inverse, sim }) {
  const target = undoTarget(top, entries);
  out.version = target;
  const plan = planSwitch(sim, target, rollbackFolder(out, ctx, target));
  out.warnings.push(...plan.warnings);
  // sim is settings with the inverse applied, so this is where the one
  // write (the inverse ops, then the switch ops) leaves them; planSwitch
  // has applied these very ops to a copy of sim already.
  const end = cloneJson(sim);
  applyOps(end, plan.ops);
  const lands = activeOf(end).active;
  if (lands !== target) throw refuse(`the planned write would leave settings pointing at ${fmt(lands)}, not ${target}; nothing was written`);
  return { target, ops: [...inverse.ops, ...plan.ops], changes: plan.changes };
}

// The newest snapshot-flat folder the log names, or null: what stands in for
// the flat files.
function snapshotOf(entries) {
  return entries.filter((e) => e.action === 'snapshot-flat' && typeof e.version === 'string' && VERSION_RE.test(e.version)).pop()?.version ?? null;
}

// Where undoing `top` lands: its previous version, or for "flat" the newest
// snapshot-flat folder, which stands in for the flat files.
function undoTarget(top, entries) {
  if (typeof top.previous === 'string' && VERSION_RE.test(top.previous)) return top.previous;
  if (top.previous === 'flat') {
    const snap = snapshotOf(entries);
    if (snap) return snap;
    throw refuse(`${top.version} replaced the flat files, and the log has no snapshot-flat folder to stand in for them: pass --to`);
  }
  throw refuse(`the version before ${top.version} was ${fmt(top.previous)}, not a kept folder: pass --to`);
}

export function status(o = {}) {
  return act('status', o, async (res, ctx) => {
    try {
      const cur = readSettings(ctx.settings);
      const a = activeOf(cur.doc);
      res.active = a.active;
      res.references = a.references;
      res.settingsSha = cur.sha;
    } catch (e) {
      res.active = null;
      res.settingsError = e.message;
    }
    const { kept, temps } = keptFolders(ctx.hooksDir);
    res.kept = kept.map((name) => {
      const v = verifyFolder(path.join(ctx.hooksDir, name), name);
      const d = v.deployed || {};
      return { version: name, ok: v.ok, source: d.source ?? null, commit: d.commit ?? null, files: isObj(d.files) ? Object.keys(d.files).length : 0, builtAt: d.builtAt ?? null, ...(v.problems.length ? { problems: v.problems } : {}) };
    });
    res.leftoverTemps = temps;
    for (const t of temps) res.warnings.push(`${t} is a temp build folder left by a crashed deploy (never live)`);
    const has = (f) => fs.existsSync(f);
    res.flat = {
      present: FLAT_HOOKS.filter((n) => has(path.join(ctx.hooksDir, n))),
      missing: FLAT_HOOKS.filter((n) => !has(path.join(ctx.hooksDir, n))),
      statusline: has(path.join(path.dirname(ctx.hooksDir), STATUSLINE)),
    };
    const log = readLog(ctx.log);
    res.lastLog = log.entries.slice(-LOG_TAIL);
    if (log.unreadable) res.warnings.push(`${log.unreadable} line(s) of the deploy log are not JSON objects`);
  });
}

// ---------------------------------------------------------------- the CLI

const COMMON = ['hooks-dir', 'settings', 'repo', 'log'];
const ACTIONS = {
  deploy: ['commit', 'patch', 'dry-run', 'inverse-out', 'persist-delay-ms', ...COMMON],
  'snapshot-flat': ['commit', ...COMMON],
  rollback: ['to', 'dry-run', 'inverse-out', 'persist-delay-ms', ...COMMON],
  status: [...COMMON],
};
const FLAGS = new Set(['dry-run']);
const RUN = { deploy, 'snapshot-flat': snapshotFlat, rollback, status };

const USAGE = `usage: node deploy.mjs deploy [--commit <rev>] [--patch <extra.json>] [--dry-run]
       node deploy.mjs snapshot-flat [--commit <rev>]
       node deploy.mjs rollback [--to v-<x>] [--dry-run]
       node deploy.mjs status
  every action: [--hooks-dir <dir>] [--settings <file>] [--repo <dir>] [--log <file>]
  deploy, rollback: [--inverse-out <file>] [--persist-delay-ms <n>]
See the header of this file for the rules and the exit codes.`;

export function parseArgs(argv) {
  const [action, ...rest] = argv;
  if (action === undefined || ['--help', '-h', 'help'].includes(action)) return { help: true };
  if (!Object.hasOwn(ACTIONS, action)) throw refuse(`unknown action ${fmt(action)}: one of ${Object.keys(ACTIONS).join(', ')} (there is no prune: a version folder is never deleted)`);
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw refuse(`unexpected argument ${fmt(a)}`);
    const name = a.slice(2);
    if (!ACTIONS[action].includes(name)) throw refuse(`${action} takes no --${name}`);
    const key = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (Object.hasOwn(options, key)) throw refuse(`--${name} given twice`);
    if (FLAGS.has(name)) {
      options[key] = true;
      continue;
    }
    if (i + 1 >= rest.length) throw refuse(`--${name} needs a value`);
    options[key] = rest[++i];
  }
  return { action, options };
}

export async function main(argv) {
  let res;
  let parsed;
  try {
    parsed = parseArgs(argv);
    if (parsed.help) {
      process.stdout.write(`${USAGE}\n`);
      return EXIT.OK;
    }
    if (parsed.options.patch !== undefined) {
      try {
        parsed.options.patch = JSON.parse(fs.readFileSync(parsed.options.patch, 'utf8'));
      } catch (e) {
        throw refuse(`cannot read the patch file ${parsed.options.patch}: ${e.code || 'not valid JSON'}`);
      }
    }
  } catch (e) {
    res = { ok: false, exit: e instanceof Refusal ? e.exit : EXIT.INTERNAL, action: parsed?.action ?? null, error: e.message };
  }
  if (!res) res = await RUN[parsed.action](parsed.options);
  process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  if (!res.ok) process.stderr.write(`deploy: exit ${res.exit}: ${res.error}\n`);
  return res.exit;
}

// Run as a script, not imported: node was started on this very file. Never
// import.meta.main, which exists only from Node 24.2: on an older node it
// reads undefined and the CLI exits 0 having done nothing. Both sides are
// realpaths (the native call, which also settles a path's case on Windows),
// so a start through a junction, a symlink or another spelling still runs,
// as squeaky-clean's isMain does it.
function startedAsScript() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (startedAsScript()) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }, (e) => {
    process.stderr.write(`deploy: exit 1: ${e?.stack || e}\n`);
    process.exitCode = EXIT.INTERNAL;
  });
}
