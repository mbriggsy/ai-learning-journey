#!/usr/bin/env node
// commit-mine.mjs: commit only this session's paths.
//
//   node commit-mine.mjs --session <id> --message-file <file> --paths-json <mine-paths output>
//                        --expect <step-3 mine-paths output> [--repo <toplevel>]
//                        [--include <contested path>]... [--exclude <path>]...
//                        [--allow-secret-name <path>]...
//
// Runs `git add` on mineNew, then immediately a pathspec-only commit of
// mine + mineNew (`git commit --only --pathspec-from-file ... --pathspec-file-nul`):
// staged work in every OTHER path stays staged and out of the commit. A path
// in the list goes in whole, as it is on disk: until U7 adds a ledger, a
// peer's edits to a mine file would be committed with it, so mine-paths sends
// any file whose disk this session's replayed edits don't reproduce exactly to
// contested (foreign-hunks); what can still ride along unseen is only a change
// the transcripts can't show that leaves the disk byte for byte exactly as
// this session's own edits would, and line endings where mine-paths can't
// check them: a HEAD file that mixes styles, a new file, a file a Write
// touched. The contested list also holds a file staged with no per-file
// add/mv/rm of ours (a peer's staging, this session's own folder or glob add,
// or an earlier commit-mine run that couldn't unstage), and the rest. Each
// pathspec is written `:(literal)<path>`, so a file named `f[1].txt` can never
// glob a peer's `f1.txt` into the commit (not GIT_LITERAL_PATHSPECS, which
// hooks inherit).
//
// Consent is bound to bytes. The paths JSON must carry this --session and a
// repo that is this one. --expect, required, is the file step 3 showed
// Briggsy (never the --paths-json file itself). The tree is checked first
// (exit 5), so a peer's rebase holding our edits in its autostash never reads
// as lost work. Refused (exit 2), as "changed since step 3": a mine or mineNew
// path step 3 didn't list in the same list with the same sha1, an --include
// whose contested entry isn't identical to step 3's, and a step-3 mine or
// mineNew path that is now contested or foreign. A step-3 path that is clean
// now was taken by a commit made since step 3 that holds step 3's bytes
// (reported), became git-ignored (reported), or lost this session's work: a
// stash, a checkout, a discard, a peer's commit of other bytes (exit 6).
// Before every git add and git commit attempt, lock retries included, every
// path is hashed again and any change is refused: what remains is the moment
// between that hash and git reading the file. --include adds a contested
// path, and only one the paths JSON lists as contested; a rename-split side
// only together with its pair. --exclude keeps a path out (a trailing '/'
// keeps out everything under it), must match a path the commit would hold,
// and takes both sides of a rename or neither; an excluded mine path this
// session staged is unstaged before the commit, so on every exit from there,
// unless its index entry no longer holds the bytes mine-paths recorded (left
// staged, named); an unstage that fails is exit 1. Every unstage of ours
// touches only index entries still holding our bytes, and stderr then says,
// from git ls-files, what of ours is still staged. A secret-like name
// (.env, .env.*, *.env, .envrc, .dev.vars, .npmrc, .netrc, .pypirc,
// .git-credentials, credentials, local.settings.json, *.pem, *.key, *.p12,
// *.pfx, *.keystore, *.jks, id_rsa*, id_ed25519*, id_ecdsa*,
// *credentials*.json, client_secret*.json, token.json) is refused unless
// excluded or named in --allow-secret-name. Paths are taken as mine-paths
// printed them; backslashes and a leading ./ are forgiven.
//
// A held index.lock is retried 3 more times (2 s, 4 s, 8 s; override with
// SQUEAKY_LOCK_BACKOFF_MS="a,b,c") and is NEVER deleted.
//
// stdout: `included: <path> (<reason>[, staged])` and `excluded: <path>` per
// path, `not in this commit: <path> (taken by <sha> <subject>)` or `(now
// ignored)` for a step-3 path that is clean now, `committed <sha>`, the
// diffstat, a `file: <path>` line for every path the commit holds (read
// these: the diffstat cuts long names), then `not in this commit: <path>
// (last changed in <sha> <subject>)` for each listed path the commit doesn't
// hold (it was already committed, maybe by a peer's whole-index commit that
// swept it up), and `unstaged (excluded): <path>` for each excluded path
// unstaged. When our new files can't be unstaged after a failure, stderr names
// each one still staged.
//
// Exit codes:
//   0 committed
//   1 git failed (index.lock still held, a hook failed, ...)
//   2 refused, bad input: read stderr, fix, rerun
//   3 committed, but stop: the commit holds a path that was not in the list,
//     it can't be identified, or git failed after it landed
//   4 nothing of this session's to commit
//   5 the shared tree isn't safe to commit into: a merge, rebase, cherry-pick
//     or revert in progress, unmerged entries, a detached HEAD, or a branch
//     other than step 3's; stderr says what of ours is staged. Never abort,
//     continue or conclude another session's operation.
//   6 this session's uncommitted work on a step-3 path vanished: it is neither
//     on disk nor in a commit made since step 3 holding step 3's bytes;
//     nothing was staged. Stop, check git stash list, report.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonAbs, fileSha1, isMain, parseArgs, readIfPresent, runGit, sha1, sleepMs, toplevelOf } from './lib.mjs';

class Refusal extends Error {} // exit 2
class NothingToCommit extends Error {} // exit 4
class InProgress extends Error {} // exit 5
class Vanished extends Error {} // exit 6

function backoffs() {
  const raw = process.env.SQUEAKY_LOCK_BACKOFF_MS;
  if (raw) {
    const list = raw.split(',').map((s) => Number(s.trim()));
    if (list.length && list.every((n) => Number.isFinite(n) && n >= 0)) return list;
  }
  return [2000, 4000, 8000];
}

export function isLockFailure(stderr) {
  return /index\.lock/.test(stderr) && /File exists|Unable to create/i.test(stderr);
}

function lockPath(top) {
  const r = runGit(['rev-parse', '--git-path', 'index.lock'], { cwd: top });
  const rel = r.status === 0 ? r.stdout.trim() : '.git/index.lock';
  return path.resolve(top, rel);
}

function lockAge(file) {
  try {
    const s = fs.statSync(file);
    return `${Math.round((Date.now() - s.mtimeMs) / 1000)} s old`;
  } catch {
    return 'gone now';
  }
}

// Run a git step, retrying only while index.lock is held. `beforeAttempt(n)`
// runs before each attempt and may throw to stop: the wait can be long, and
// the files and the tree can change in it.
function withLockRetry(label, args, top, log, beforeAttempt = () => {}) {
  const waits = backoffs();
  for (let attempt = 1; ; attempt++) {
    beforeAttempt(attempt);
    const r = runGit(args, { cwd: top });
    if (!r.error && r.status === 0) return { ok: true, r };
    const stderr = r.stderr || String(r.error || '');
    if (!isLockFailure(stderr)) return { ok: false, r, lock: false, attempts: attempt };
    if (attempt > waits.length) return { ok: false, r, lock: true, attempts: attempt };
    const wait = waits[attempt - 1];
    log(`commit-mine: ${label}: index.lock is held (attempt ${attempt} of ${waits.length + 1}); retrying in ${wait} ms`);
    sleepMs(wait);
  }
}

// Both input files may come through a shell redirect. Windows PowerShell 5.1's
// `>` writes UTF-16LE with a BOM; PowerShell 7 and Bash write UTF-8.
function readText(file) {
  const buf = fs.readFileSync(file);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  return buf.toString('utf8');
}

function validRel(p) {
  return typeof p === 'string' && p.length > 0 && !p.includes('\0')
    && !path.isAbsolute(p) && !/^[A-Za-z]:/.test(p) && !p.startsWith('/')
    && !p.split(/[\\/]/).includes('..');
}

// The list git reads through --pathspec-from-file --pathspec-file-nul.
const literalList = (paths) => paths.map((p) => `:(literal)${p}\0`).join('');
const literal = (paths) => paths.map((p) => `:(literal)${p}`);

// A path as the model may have copied it: forward slashes, no leading ./
const normalize = (p) => p.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');

// The candidates one --exclude names: itself, its normalized form, or, with a
// trailing '/', everything under it. No cwd-relative guessing.
function excludeHits(raw, candidates) {
  if (candidates.includes(raw)) return [raw];
  const v = normalize(raw);
  if (v.length > 1 && v.endsWith('/')) return candidates.filter((c) => c.startsWith(v));
  return candidates.includes(v) ? [v] : [];
}

// File names that usually hold a secret.
const SECRET_NAME = new RegExp('^(?:\\.env(?:\\..*)?|.*\\.env|\\.envrc|\\.dev\\.vars|\\.npmrc|\\.netrc|\\.pypirc|\\.git-credentials'
  + '|credentials|local\\.settings\\.json|token\\.json|client_secret.*\\.json'
  + '|.*\\.(?:pem|key|p12|pfx|keystore|jks)|id_(?:rsa|ed25519|ecdsa).*|.*credentials.*\\.json)$', 'i');
export const isSecretName = (p) => SECRET_NAME.test(p.split('/').pop());

// The sha1 of a path's bytes, as mine-paths records it: null when it is gone.
// A file that can't be read at all matches no recorded sha1.
function shaOf(top, p) {
  try { return fileSha1(path.join(top, ...p.split('/'))); } catch { return 'unreadable'; }
}

// One value as canonical JSON (keys sorted), for comparing whole entries.
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

// A paths file from mine-paths, checked: it must be this session's, for this repo.
function readPaths(file, label, session, top) {
  let data;
  try { data = JSON.parse(readText(file)); } catch (e) { throw new Refusal(`cannot read the ${label}: ${e.code || e.message}`); }
  if (!data || typeof data !== 'object') throw new Refusal(`the ${label} is not an object`);
  if (data.session !== session) {
    throw new Refusal(`the ${label} belongs to session ${JSON.stringify(data.session)}, not ${session}; rerun mine-paths for this session`);
  }
  if (typeof data.repo !== 'string') throw new Refusal(`the ${label} names no repo; rerun mine-paths here`);
  if (canonAbs(data.repo) !== top) throw new Refusal(`the ${label} was made for ${data.repo}, not ${top}; rerun mine-paths here`);
  for (const key of ['mine', 'mineNew', 'contested', 'foreign', 'pairs']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw new Refusal(`"${key}" in the ${label} must be a list`);
  }
  if ((data.contested || []).some((c) => !c || typeof c.path !== 'string' || typeof c.reason !== 'string')) {
    throw new Refusal(`"contested" in the ${label} must hold {path, reason} entries`);
  }
  if ((data.pairs || []).some((pr) => !Array.isArray(pr) || pr.length !== 2 || !pr.every(validRel))) {
    throw new Refusal(`"pairs" in the ${label} must hold [from, to] path pairs`);
  }
  if (data.sha !== undefined && (!data.sha || typeof data.sha !== 'object' || Array.isArray(data.sha))) {
    throw new Refusal(`"sha" in the ${label} must map paths to hashes`);
  }
  if (data.head !== undefined && data.head !== null && typeof data.head !== 'string') throw new Refusal(`"head" in the ${label} must be a commit or null`);
  const bad = [...(data.mine || []), ...(data.mineNew || []), ...(data.contested || []).map((c) => c.path)].filter((p) => !validRel(p));
  if (bad.length) throw new Refusal(`not repo-relative paths in the ${label}: ${bad.map((p) => JSON.stringify(p)).join(', ')}`);
  return data;
}

const IN_PROGRESS = [
  ['MERGE_HEAD', 'a merge'],
  ['CHERRY_PICK_HEAD', 'a cherry-pick'],
  ['REVERT_HEAD', 'a revert'],
  ['rebase-merge', 'a rebase'],
  ['rebase-apply', 'a rebase or am'],
];

// An operation some session left in progress in the shared tree, or null. Git
// refuses a partial commit during one, and whatever we staged would land in
// its index. Unmerged entries with no marker (a stash pop that conflicted)
// count too.
function operationInProgress(top) {
  const r = runGit(['rev-parse', ...IN_PROGRESS.flatMap(([name]) => ['--git-path', name])], { cwd: top });
  const lines = r.stdout.split(/\r?\n/).filter(Boolean);
  if (r.error || r.status !== 0 || lines.length !== IN_PROGRESS.length) {
    throw new Error(`cannot check for a merge or rebase in progress: ${(r.stderr || String(r.error || 'unexpected output')).trim()}`);
  }
  for (let k = 0; k < lines.length; k++) {
    const marker = path.resolve(top, lines[k]);
    if (fs.existsSync(marker)) return `${IN_PROGRESS[k][1]} (${marker})`;
  }
  const u = runGit(['ls-files', '-u', '-z'], { cwd: top });
  if (u.error || u.status !== 0) throw new Error(`cannot check for unmerged entries: ${(u.stderr || String(u.error)).trim()}`);
  if (u.stdout.length) return 'a conflict (unmerged index entries, e.g. from a stash pop)';
  return null;
}

const gitConfig = (top, key) => {
  const r = runGit(['config', '--get', key], { cwd: top });
  return r.status === 0 ? r.stdout.trim() : null;
};

// git's whitespace cleanup: no trailing blanks, no runs of empty lines, none
// at either end.
const whitespace = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();

// Our message as git stored it: -F's default cleanup is whitespace; a
// commit.cleanup of strip also drops comment lines.
function storedMessage(message, top) {
  if (gitConfig(top, 'commit.cleanup') !== 'strip') return whitespace(message);
  const mark = gitConfig(top, 'core.commentChar');
  const ch = mark && mark !== 'auto' ? mark : '#';
  return whitespace(message.split('\n').filter((l) => !l.startsWith(ch)).join('\n'));
}

const revParse = (spec, top) => runGit(['rev-parse', '--verify', '-q', spec], { cwd: top }).stdout.trim();

// A commit sits directly on `before` and carries our message (a commit-msg
// hook may have appended trailers).
function ourShape(sha, before, message, top) {
  if (revParse(`${sha}^`, top) !== before) return false;
  const body = runGit(['log', '-1', '--format=%B', sha], { cwd: top });
  const want = storedMessage(message, top);
  const got = whitespace(body.stdout);
  return body.status === 0 && (got === want || got.startsWith(`${want}\n`));
}

// Our commit's full sha. git commit's own summary line, "[<branch>
// (root-commit)? <sha>] <subject>", names it even when a peer's commit has
// already landed on top, but only a commit on our starting point with our
// message counts: a lookalike line names nothing. Without one, HEAD counts
// only if it sits directly on the commit we started from.
export function ourCommit(stdout, before, top, message) {
  const m = /^\[[^\n]*? ([0-9a-f]{4,64})\] /m.exec(stdout);
  if (m) {
    const sha = revParse(`${m[1]}^{commit}`, top);
    if (sha && ourShape(sha, before, message, top)) return sha;
  }
  const head = revParse('HEAD', top);
  return head && head !== before && revParse('HEAD^', top) === before ? head : null;
}

// The paths a commit holds.
const commitNames = (sha, top) => runGit(['diff-tree', '-r', '--root', '--no-commit-id', '--name-only', '--no-renames', '-z', sha], { cwd: top })
  .stdout.split('\0').filter(Boolean);

// A commit can land and git still exit non-zero ("repository has been
// updated, but unable to write new index file"). HEAD is ours only if it
// moved, sits directly on the commit we started from, carries our message
// and holds nothing outside our list.
export function landedCommit({ top, before, message, all }) {
  const head = revParse('HEAD', top);
  if (!head || head === before) return null;
  if (!ourShape(head, before, message, top)) return null;
  const allowed = new Set(all);
  return commitNames(head, top).every((n) => allowed.has(n)) ? head : null;
}

// Which of these paths the index holds an entry for.
function inIndex(top, paths) {
  if (!paths.length) return [];
  const r = runGit(['ls-files', '--cached', '-z', '--', ...literal(paths)], { cwd: top });
  return r.status === 0 ? r.stdout.split('\0').filter(Boolean) : paths;
}

// The last commit that touched a path, for a report line.
function lastChanged(top, p) {
  const r = runGit(['log', '-1', '--format=%h %s', '--', `:(literal)${p}`], { cwd: top });
  const last = r.status === 0 ? r.stdout.trim() : '';
  return last ? `last changed in ${last}` : 'never committed';
}

// The commit made since `since` (step 3's HEAD; null: none existed) that last
// touched a path, as "<sha> <subject>", but only when that commit holds the
// bytes step 3 saw (`want`, their sha1; null: no file). Else null.
function takenSince(top, since, p, want) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const r = runGit(['log', '-1', '--format=%H %h %s', range, '--', `:(literal)${p}`], { cwd: top });
  const line = r.status === 0 ? r.stdout.trim() : '';
  if (!line) return null;
  const [full, ...shown] = line.split(' ');
  const id = runGit(['rev-parse', '--verify', '-q', `${full}:${p}`], { cwd: top });
  if (id.error || (id.status !== 0 && id.status !== 1)) return null;
  const got = id.status === 0 ? sha1(runGit(['cat-file', 'blob', id.stdout.trim()], { cwd: top }).buffer) : null;
  return got === want ? shown.join(' ') : null;
}

// git's object id for a file's bytes (a SHA-1 repository's blob id).
const blobId = (buf) => sha1(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf]));

const isIgnored = (top, p) => runGit(['check-ignore', '-q', '--', p], { cwd: top }).status === 0;

// The listed paths whose index entry differs from HEAD. After a commit that
// landed but whose index write failed, that is each one whose entry still
// holds the content from before it: a staged revert of the commit.
export function staleEntries(top, all) {
  if (!all.length) return []; // no pathspec at all would list every staged path
  const d = runGit(['diff', '--cached', '--name-only', '--no-renames', '-z', '--', ...literal(all)], { cwd: top });
  return d.status === 0 ? d.stdout.split('\0').filter(Boolean) : all;
}

// What to say when a commit landed and git then failed: the index was put
// back in line for our paths, or which of them it still reverts.
export function landedReport({ sha, landedError, resynced, staleIndex, lock }) {
  const index = resynced
    ? 'The index was resynced for our paths only.'
    : `The index still holds pre-commit content (a staged revert of ${sha}) for: ${staleIndex.join(', ') || '(none found)'}; index.lock: ${lock}.`;
  return `commit-mine: STOP: commit ${sha} landed, but git then failed: ${landedError}. ${index} Never run git restore --staged :/ or any repo-wide unstage.`;
}

const NOTHING = /nothing to commit|no changes added to commit|nothing added to commit/;

function removeTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

export function commitMine({
  repo, session, messageFile, pathsJson, expectJson, exclude = [], include = [], allowSecret = [],
  say = (s) => process.stdout.write(s + '\n'),
  log = (s) => process.stderr.write(s + '\n'),
  removeDir = removeTmpDir,
}) {
  const top = toplevelOf(repo);
  if (!top) throw new Refusal(`not inside a git repository: ${repo}`);

  let msg;
  try { msg = readText(messageFile); } catch (e) { throw new Refusal(`cannot read the message file: ${e.code || e.message}`); }
  if (!msg.trim()) throw new Refusal('the message file is empty');

  if (!expectJson) throw new Refusal('--expect is required: the file step 3 showed Briggsy. If it is gone, rerun from step 3 and show him again');
  if (canonAbs(expectJson) === canonAbs(pathsJson)) { // canonAbs resolves links: the same file by any name
    throw new Refusal('--expect must be step 3\'s file, not the --paths-json file itself: rerun from step 3 and show Briggsy again');
  }
  const data = readPaths(pathsJson, 'paths JSON', session, top);
  const expected = readPaths(expectJson, '--expect file', session, top);
  const contested = data.contested || [];

  // The tree must be safe to commit into before anything else is said about
  // it (a peer's rebase can set our edits aside in its autostash: that is an
  // operation in progress, not vanished work), and again before each retry:
  // a peer's operation can start while we wait. `staged` says what of ours
  // the index holds at that moment.
  const checkTree = (staged) => {
    const op = operationInProgress(top);
    if (op) {
      throw new InProgress(`${op} is in progress in the shared tree.${staged} Stop and report it. Never abort, continue or conclude another session's operation.`);
    }
    const r = runGit(['symbolic-ref', '-q', '--short', 'HEAD'], { cwd: top });
    const branchNow = r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
    if (branchNow === null) throw new InProgress(`HEAD is detached in the shared tree.${staged} Stop and report it.`);
    if (branchNow !== expected.branch) {
      throw new InProgress(`the shared tree is on branch ${branchNow}, but step 3 saw ${expected.branch ?? 'a detached HEAD'}.${staged} Stop and report it.`);
    }
  };
  const NOTHING_STAGED = ' Nothing was staged.';
  checkTree(NOTHING_STAGED);

  // A contested path goes in only by name, and only one mine-paths listed.
  const mine = [...(data.mine || [])];
  const mineNew = [...(data.mineNew || [])];
  const included = [];
  for (const raw of include) {
    const hit = contested.find((c) => c.path === raw) || contested.find((c) => c.path === normalize(raw));
    if (!hit) {
      throw new Refusal(`--include ${JSON.stringify(raw)} names no contested path. Contested: ${contested.map((c) => c.path).join(', ') || '(none)'}`);
    }
    if (hit.reason === 'rm-cached') {
      throw new Refusal(`--include ${hit.path}: it is out of the index but still on disk, and git commit --only would add it back. It can't be committed by path; leave it out and report it`);
    }
    (hit.untracked ? mineNew : mine).push(hit.path);
    included.push(hit);
    say(`included: ${hit.path} (${hit.reason}${hit.staged ? ', staged' : ''})`);
  }

  const candidates = [...new Set([...mine, ...mineNew])];
  const skip = new Set();
  for (const raw of exclude) {
    const hits = excludeHits(raw, candidates);
    if (!hits.length) {
      throw new Refusal(`--exclude ${JSON.stringify(raw)} matches no path this commit would hold; copy it exactly as mine-paths printed it. Candidates: ${candidates.join(', ') || '(none)'}`);
    }
    for (const h of hits) skip.add(h);
  }
  // A rename commits as a pair: half of one is a lone deletion or a lone add.
  for (const [from, to] of data.pairs || []) {
    if (skip.has(from) !== skip.has(to)) {
      throw new Refusal(`--exclude ${skip.has(from) ? from : to} splits the rename ${from} -> ${to}: exclude both sides or neither`);
    }
  }
  for (const c of included) {
    if (c.reason === 'rename-split' && c.pair && !included.some((e) => e.path === c.pair) && !skip.has(c.pair)) {
      throw new Refusal(`--include ${c.path} is one side of a rename with ${c.pair}: include ${c.pair} too, or leave both out`);
    }
  }
  for (const p of [...skip].sort()) say(`excluded: ${p}`);
  const keep = (p) => !skip.has(p);
  const toCommit = [...new Set(mine.filter(keep))];
  const toAdd = [...new Set(mineNew.filter(keep))];
  const all = [...new Set([...toCommit, ...toAdd])];

  // A secret-like name goes in only when Briggsy allowed it by path.
  const allowed = new Set();
  for (const raw of allowSecret) {
    const v = all.includes(raw) ? raw : normalize(raw);
    if (!all.includes(v)) throw new Refusal(`--allow-secret-name ${JSON.stringify(raw)} matches no path this commit would hold`);
    allowed.add(v);
  }
  const secrets = all.filter((p) => isSecretName(p) && !allowed.has(p));
  if (secrets.length) {
    throw new Refusal(`secret-like file names: ${secrets.join(', ')}. --exclude each one, or ask Briggsy and pass --allow-secret-name <path> on his yes`);
  }

  // Briggsy's step-3 yes covers exactly the entries, and the bytes, he saw.
  const listOf = (d, p) => ((d.mine || []).includes(p) ? 'mine' : (d.mineNew || []).includes(p) ? 'mineNew' : null);
  const shaIn = (d, p) => (d.sha && Object.hasOwn(d.sha, p) ? d.sha[p] : undefined);
  const includedPaths = new Set(included.map((c) => c.path));
  const changed = [];
  for (const p of all) {
    if (includedPaths.has(p)) continue;
    const now = listOf(data, p);
    const was = listOf(expected, p);
    if (now !== was) changed.push(`${p} (${now} now, ${was ? `${was} in step 3` : 'not mine or mineNew in step 3'})`);
    else if (shaIn(data, p) === undefined || shaIn(data, p) !== shaIn(expected, p)) changed.push(`${p} (its content changed since step 3)`);
  }
  for (const c of included.filter((e) => keep(e.path))) {
    const old = (expected.contested || []).find((e) => e.path === c.path);
    if (!old) changed.push(`${c.path} (not contested in step 3)`);
    else if (canonical(old) !== canonical(c)) changed.push(`${c.path} (its contested entry changed since step 3)`);
  }
  // A step-3 path that is clean now: a commit since took it, it became
  // ignored, or this session's work on it is gone.
  const gone = [];
  const vanished = [];
  for (const p of [...(expected.mine || []), ...(expected.mineNew || [])]) {
    if (skip.has(p) || includedPaths.has(p) || listOf(data, p)) continue;
    const c = contested.find((e) => e.path === p);
    if (c) changed.push(`${p} (was mine, now ${c.reason})`);
    else if ((data.foreign || []).includes(p)) changed.push(`${p} (was mine, now foreign)`);
    else if (isIgnored(top, p)) gone.push(`${p} (now ignored)`);
    else if (expected.head === undefined) changed.push(`${p} (clean now, and step 3's file names no head commit to check it against)`);
    else {
      const by = takenSince(top, expected.head, p, shaIn(expected, p));
      if (by) gone.push(`${p} (taken by ${by})`);
      else vanished.push(p);
    }
  }
  if (vanished.length) {
    throw new Vanished(`this session's uncommitted work on ${vanished.join(', ')} vanished since step 3: it is neither on disk nor in a commit made since with step 3's bytes (a stash, a checkout or a discard).${NOTHING_STAGED} Check git stash list; stop and report it`);
  }
  if (changed.length) {
    throw new Refusal(`changed since step 3: ${changed.join('; ')}.${NOTHING_STAGED} Show Briggsy, then rerun from step 3`);
  }
  for (const g of gone) say(`not in this commit: ${g}`);

  // The bytes now must still be the bytes Briggsy saw.
  const recorded = (p) => {
    const c = included.find((e) => e.path === p);
    return c ? c.sha : shaIn(data, p);
  };
  const rehash = (when, staged) => {
    const moved = all.filter((p) => recorded(p) === undefined || shaOf(top, p) !== recorded(p));
    if (moved.length) throw new Refusal(`changed on disk ${when}: ${moved.join(', ')}.${staged} Show Briggsy, then rerun from step 3`);
  };
  // Before every attempt: the tree on a retry, and the bytes always.
  const guard = (first, staged) => (attempt) => {
    if (attempt > 1) checkTree(staged);
    rehash(attempt > 1 ? 'while waiting for index.lock' : first, staged);
  };
  // Each path's index entry, as git's blob id (no entry: absent). null when
  // git can't say.
  const indexBlobs = (paths) => {
    if (!paths.length) return new Map();
    const r = runGit(['ls-files', '-s', '-z', '--', ...literal(paths)], { cwd: top });
    if (r.error || r.status !== 0) return null;
    const blobs = new Map();
    for (const rec of r.stdout.split('\0').filter(Boolean)) {
      const m = /^\d+ ([0-9a-f]+) \d\t([^]*)$/.exec(rec);
      if (m) blobs.set(m[2], m[1]);
    }
    return blobs;
  };
  // Of these paths, the ones whose index entry holds exactly the bytes
  // mine-paths recorded: the disk still hashes to that sha1, and the index
  // holds git's blob of those bytes (a recorded deletion: neither the index
  // nor the disk has the file). Only those are ours to unstage; any other
  // entry may be a peer's staging now, and is left alone.
  const oursInIndex = (paths) => {
    const blobs = indexBlobs(paths);
    if (!blobs) return [];
    return paths.filter((p) => {
      let buf;
      try { buf = readIfPresent(path.join(top, ...p.split('/'))); } catch { return false; }
      if (recorded(p) === null) return buf === null && !blobs.has(p);
      return buf !== null && sha1(buf) === recorded(p) && blobs.get(p) === blobId(buf);
    });
  };

  // An excluded mine path this session staged stays out of our commit, but a
  // peer's whole-index commit would sweep it up: unstage it now, by path,
  // whatever exit follows. One whose index entry is no longer ours stays.
  const excludedStaged = staleEntries(top, [...skip].filter((p) => (data.mine || []).includes(p)));
  const ourExcluded = oursInIndex(excludedStaged);
  for (const p of excludedStaged.filter((e) => !ourExcluded.includes(e))) {
    log(`commit-mine: left staged (excluded): ${p}: the index no longer holds the bytes mine-paths recorded, so the staging may be a peer's`);
  }
  if (ourExcluded.length) {
    const exList = path.join(os.tmpdir(), `squeaky-excluded-${process.pid}.nul`);
    fs.writeFileSync(exList, literalList(ourExcluded));
    let un;
    try { un = withLockRetry('git reset', ['reset', '-q', `--pathspec-from-file=${exList}`, '--pathspec-file-nul'], top, log); } finally { fs.rmSync(exList, { force: true }); }
    if (!un.ok) {
      throw new Error(`git reset failed: could not unstage the excluded paths (${(un.r.stderr || String(un.r.error || '')).trim()}); they are still staged: ${inIndex(top, ourExcluded).join(', ') || ourExcluded.join(', ')}. Nothing was committed. Report them; a peer's whole-index commit would take them`);
    }
    for (const p of ourExcluded) say(`unstaged (excluded): ${p}`);
  }

  if (!all.length) {
    const left = contested.length ? `; contested and left out: ${contested.map((c) => c.path).join(', ')}` : '';
    throw new NothingToCommit(`nothing of this session's to commit: mine and mineNew are empty${skip.size ? ' after the excludes' : ''}${left}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'squeaky-commit-'));
  try {
    const newList = path.join(tmp, 'new.nul');
    const allList = path.join(tmp, 'all.nul');
    const message = path.join(tmp, 'message.txt'); // git reads -F as UTF-8; the original may be UTF-16
    fs.writeFileSync(newList, literalList(toAdd));
    fs.writeFileSync(allList, literalList(all));
    fs.writeFileSync(message, msg, 'utf8');

    const gitSaid = (res) => (res.r.stderr.trim() || res.r.stdout.trim() || String(res.r.error || 'unknown error'));
    const fail = (step, res) => {
      const lock = lockPath(top);
      const why = res.lock
        ? `index.lock is held by another git process (${lock}, ${lockAge(lock)}). Tried ${res.attempts} times; the lock was NOT deleted. Wait for the other session's git command to finish, then rerun.`
        : gitSaid(res);
      return new Error(`${step} failed: ${why}`);
    };
    // Put the new files back to untracked so the shared index holds nothing
    // of ours that a peer's commit could sweep up: only those whose index
    // entry is still the one we staged. The failure may have been the lock,
    // so the unstage waits for it the same way. Then git ls-files says what
    // is still staged, and each is named: commit-mine's own add leaves no
    // transcript evidence, so step 3 lists it as contested staged-elsewhere.
    let staged = new Map(); // what our git add put in the index
    const unstage = (err) => {
      if (!toAdd.length) return err;
      const now = indexBlobs(toAdd) || new Map();
      const ours = toAdd.filter((p) => now.has(p) && now.get(p) === staged.get(p));
      let why = '';
      if (ours.length) {
        const ourList = path.join(tmp, 'ours.nul');
        fs.writeFileSync(ourList, literalList(ours));
        const un = withLockRetry('git reset', ['reset', '-q', `--pathspec-from-file=${ourList}`, '--pathspec-file-nul'], top, log);
        if (!un.ok) why = (un.r.stderr || String(un.r.error || '')).trim();
      }
      const still = inIndex(top, toAdd);
      const stuck = still.filter((p) => ours.includes(p));
      const left = still.filter((p) => !ours.includes(p));
      if (!still.length) err.message += '\nThe new files were unstaged again: git ls-files lists none of them. Nothing of ours is staged.';
      if (stuck.length) {
        err.message += `\nCould not unstage the new files (${why}); they are still staged: ${stuck.join(', ')}. They are this session's own new files. Rerun from step 3, where they show as contested staged-elsewhere; tell Briggsy they're ours; --include them on his yes:\n${stuck.map((p) => `  --include ${p}`).join('\n')}`;
      }
      if (left.length) {
        err.message += `\nLeft staged, not unstaged: ${left.join(', ')}: the index entry changed since our git add, so the staging may be a peer's now.`;
      }
      return err;
    };

    if (toAdd.length) {
      // A failed add can still have staged some paths (one ignored since,
      // say), unless the lock stopped it before it staged anything.
      const res = withLockRetry('git add', ['add', `--pathspec-from-file=${newList}`, '--pathspec-file-nul'], top, log, guard('since mine-paths read it', NOTHING_STAGED));
      if (!res.lock) staged = indexBlobs(toAdd) || new Map();
      if (!res.ok) throw res.lock ? fail('git add', res) : unstage(fail('git add', res));
    }

    let before = '';
    let res;
    try {
      res = withLockRetry('git commit', ['commit', '--only', '-F', message, `--pathspec-from-file=${allList}`, '--pathspec-file-nul'], top, log, (attempt) => {
        guard(toAdd.length ? 'while it was being staged' : 'since mine-paths read it', toAdd.length ? '' : NOTHING_STAGED)(attempt);
        before = revParse('HEAD', top); // a peer's commit may have landed while we waited
      });
    } catch (e) {
      throw unstage(e);
    }
    let sha;
    let landedError = null;
    let resynced = true;
    let staleIndex = [];
    if (res.ok) {
      sha = ourCommit(res.r.stdout, before, top, msg);
      if (!sha) return { sha: null };
    } else {
      const landed = res.lock ? null : landedCommit({ top, before, message: msg, all });
      if (!landed) {
        if (!res.lock && NOTHING.test(res.r.stdout)) {
          // Every listed path already matches HEAD: a peer's commit took them.
          for (const p of all) say(`not in this commit: ${p} (${lastChanged(top, p)})`);
          throw unstage(new NothingToCommit(`nothing of this session's to commit: git says ${gitSaid(res)}`));
        }
        throw unstage(fail('git commit', res));
      }
      // It landed. Bring the index back in line for our paths only; never a
      // repo-wide unstage, which would take every peer's staging with it.
      sha = landed;
      landedError = gitSaid(res);
      const re = withLockRetry('git reset', ['reset', '-q', `--pathspec-from-file=${allList}`, '--pathspec-file-nul'], top, log);
      resynced = re.ok;
      if (!re.ok) {
        landedError += `\nCould not resync the index: ${gitSaid(re)}`;
        staleIndex = staleEntries(top, all);
      }
    }
    const short = runGit(['rev-parse', '--short', sha], { cwd: top }).stdout.trim();
    const stat = runGit(['show', '--stat', '--format=', sha], { cwd: top }).stdout.replace(/\s+$/, '');
    const names = commitNames(sha, top);
    const allowedPaths = new Set(all);
    const unexpected = names.filter((n) => !allowedPaths.has(n));
    // A listed path the commit doesn't hold matched HEAD already: fine when
    // we had reverted it, worth a word when a peer's commit took it.
    const held = new Set(names);
    const absent = all.filter((p) => !held.has(p)).map((p) => ({ path: p, last: lastChanged(top, p) }));
    const lock = lockPath(top);
    return {
      sha: short, stat, files: names, unexpected, absent, landedError, resynced, staleIndex,
      lock: `${lock}, ${lockAge(lock)}`,
    };
  } finally {
    // Cleanup can't change the outcome: a commit that landed stays reported.
    try { removeDir(tmp); } catch (e) { log(`commit-mine: warning: could not remove ${tmp} (${e.code || e.message})`); }
  }
}

// The whole run, as an exit code. main() is this with the real streams.
export function run(argv, {
  say = (s) => process.stdout.write(s + '\n'),
  log = (s) => process.stderr.write(s + '\n'),
  removeDir,
} = {}) {
  try {
    let args;
    try {
      args = parseArgs(argv, { known: ['session', 'message-file', 'paths-json', 'expect', 'repo'], repeatable: ['exclude', 'include', 'allow-secret-name'] });
    } catch (e) {
      throw new Refusal(e.message);
    }
    if (!args.session) throw new Refusal('--session is required');
    if (!args['message-file']) throw new Refusal('--message-file is required');
    if (!args['paths-json']) throw new Refusal('--paths-json is required');
    const out = commitMine({
      repo: args.repo ? path.resolve(args.repo) : process.cwd(),
      session: args.session,
      messageFile: path.resolve(args['message-file']),
      pathsJson: path.resolve(args['paths-json']),
      expectJson: args.expect ? path.resolve(args.expect) : null,
      exclude: args.exclude || [],
      include: args.include || [],
      allowSecret: args['allow-secret-name'] || [],
      say,
      log,
      ...(removeDir ? { removeDir } : {}),
    });
    if (!out.sha) {
      log('commit-mine: STOP: git commit succeeded, but its commit cannot be identified (HEAD has moved past it). Find it in git log before anything else.');
      return 3;
    }
    say(`committed ${out.sha}`);
    if (out.stat) say(out.stat);
    for (const f of out.files) say(`file: ${f}`);
    for (const a of out.absent) say(`not in this commit: ${a.path} (${a.last})`);
    let code = 0;
    if (out.landedError) {
      log(landedReport(out));
      code = 3;
    }
    if (out.unexpected.length) {
      log(`commit-mine: STOP: commit ${out.sha} holds paths that were not in the list: ${out.unexpected.join(', ')}`);
      code = 3;
    }
    return code;
  } catch (e) {
    log(`commit-mine: ${e && e.message ? e.message : e}`);
    return e instanceof Refusal ? 2 : e instanceof NothingToCommit ? 4 : e instanceof InProgress ? 5 : e instanceof Vanished ? 6 : 1;
  }
}

if (isMain(import.meta.url)) process.exitCode = run(process.argv.slice(2));
