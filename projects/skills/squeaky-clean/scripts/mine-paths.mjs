#!/usr/bin/env node
// mine-paths.mjs: split the dirty paths into this session's and everyone else's.
//
//   node mine-paths.mjs [--session <id>] [--repo <dir>] [--temp-dir <dir>] [--out <file>]
//   node mine-paths.mjs [--session <id>] --temp-dir temp --delete-temp
//
// Evidence comes from every transcript of the session: the main JSONL plus all
// subagent and workflow-agent JSONL under ~/.claude/projects (or
// SQUEAKY_PROJECTS_DIR). A record stamped with another sessionId (history that
// --fork-session copied in) is skipped.
//   touched  Edit / Write / MultiEdit file_path, NotebookEdit notebook_path
//   read     Read file_path. It counts for the temp dir only: a Read never
//            makes a repo file mine.
//   added    explicit paths this session passed to `git add` in Bash or
//            PowerShell. `.`, -A, --all, -u, folders, globs and variables never
//            count: a wildcard add proves nothing about ownership.
//   moved    `git mv` destinations;  removed  `git rm` paths and `git mv` sources
// A tool call counts once its id has a tool_result that is not an error. One
// with no recorded result (killed mid-call, still running) makes its paths
// contested, never mine; a git add/mv/rm in a call that errored is kept apart.
// A file written only by a shell command is NOT mine; it shows as foreign,
// which is the safe direction. A path on a network share (\\host\share,
// //host/share) is never stat'd, opened or resolved: it is dropped, with a
// warning. HEAD is read before git status; a HEAD that can't be read (other
// than an unborn branch) is exit 2.
//
// Evidence expires. It counts only while its record's timestamp, in whole
// seconds, is later than the path's last commit (git log -1 %ct): a path this
// session committed mid-session is not mine again when a peer changes it. A
// later command that may unstage (git restore --staged, git reset in any mode,
// git stash push / save / bare, git checkout <tree-ish> [--] <paths>) takes
// back the git add/mv/rm evidence before it, in timestamp order across every
// transcript, even when it errored or has no result. One whose paths can't be
// resolved takes back all of it, with a warning naming its git subcommand;
// each path it took back that is still dirty is contested (revoked), never a
// peer's. A record's cwd is stamped after its call ran, so a command holding a
// cd (or env -C / --chdir), or sharing its message with a call that holds
// one, resolves only absolute paths.
//
// Ownership is per file until U7 adds a ledger: commit-mine commits a mine
// file whole, as it is on disk. So the invariant: a path is mine only if
// replaying this session's fresh Edit / MultiEdit / Write calls (the values
// each one APPLIED, from its result), in order, from the committed file (HEAD,
// or no file) reproduces the disk exactly, each call finding what it found
// when it ran. A Write must find its recorded pre-image (originalFile, or the
// old side of its structuredPatch), so a Write that carried a peer's
// uncommitted lines fails; an Edit must find its old_string once (or at all,
// with replace_all). Anything else goes to contested foreign-hunks. What can
// still ride along unseen is only a change the transcripts can't show that
// leaves the disk byte for byte exactly as this session's own edits would;
// and line endings, which are checked only against a HEAD file all in one
// style that no Write touched: a HEAD that mixes styles, a new file and a
// file a Write touched go unchecked. Text that isn't UTF-8 is never compared
// (contested, 'not UTF-8 text'). A deletion (a rename's source side too) is
// mine only when this session's latest call on the path is a fresh git rm,
// or a git mv away from it, and the file is gone from disk: a git add never
// proves one (contested, deleted-outside-git), and one still on disk is
// rm-cached. A git mv pair goes together: a mine side whose dirty partner
// isn't mine is contested too.
//
// stdout (exit 0), small fields first:
//   {ok, session, repo, head, branch, defaultBranch, transcripts, tempDir,
//    warnings, counts, mine, mineNew, deleted, pairs, vanished, contested,
//    tempMine, sha, foreign, peerStaged, tempKeep}
//   head: HEAD's commit (null when unborn); branch: null on a detached HEAD;
//   defaultBranch: from origin/HEAD, null if unset.
//   deleted: the mine paths that are deletions; pairs: [[from, to]] for each
//   rename among mine and mineNew, committed together or not at all.
//   vanished: [{path, reason}], this session's work gone from a path git
//   status shows clean: 'edits gone' (their replay from HEAD leaves text HEAD
//   doesn't hold), 'new file gone' (created or added, now gone from disk and
//   the index; not ignored, and not last removed by this session), 'git rm
//   or git mv undone' (back at HEAD's bytes). Never clean while not empty.
//   sha: path -> sha1 of the disk bytes (null when gone), for mine and mineNew;
//   each contested entry carries its own. commit-mine holds a commit to them.
//   contested: [{path, reason, untracked?, pair?, addedForeign?, removedForeign?,
//   detail?, staged?, revokedBy?, sha}], never committed by default. A
//   contested path with content ops carries the replay's counts: 0 and 0 with
//   no detail means every line is this session's; any detail means the disk
//   differs from the replay, whatever the counts.
//   staged: true means the index holds it staged with no fresh git
//   add/mv/rm of ours: it may be a peer's staging, whatever the reason says.
//     staged-elsewhere          staged with no per-file git add/mv/rm of ours we can
//                               prove: a peer's, this session's own folder, glob, -u
//                               or variable add, or a commit-mine run that couldn't
//                               unstage it
//     staged-by-failed-command  staged, and named only by a git add/mv/rm in a call
//                               that errored
//     revoked                   a blind revoke (revokedBy: its git subcommand) took
//                               back this session's git add/mv/rm of it
//     rename-split              one side of a rename is this session's, the other
//                               (pair) isn't, or isn't provably
//     deleted-outside-git       deleted, and this session's last call on it was not
//                               a git rm or a git mv away from it
//     unconfirmed               only tool calls with no recorded result name it
//     committed-since           all of this session's evidence predates its last commit
//     case-mismatch             this session's evidence names it in different letter case
//     rm-cached                 out of the index while still on disk (an ignored one
//                               too): git commit --only would add it back, so it
//                               can't be committed by path
//     foreign-hunks             it would be mine, but the replay doesn't reproduce the
//                               disk: addedForeign / removedForeign count the lines, and
//                               detail says more (a Write over unrecorded lines, lines
//                               moved, the final newline, line endings changed,
//                               unreadable, not UTF-8 text, can't compare: binary, a
//                               notebook edit, no pre-write content)
// --out <file> writes that JSON to <file> (a temp file, then a rename), only
// on success: a failed run leaves <file> absent. stdout is then one line,
// `wrote <file>: <list> <count>, ...`, and a `warning: ...` line per warning:
// the lists are read from the file, where no output cut can hide them.
//
// --delete-temp re-sorts temp/ at that moment and deletes tempMine: regular,
// git-ignored files whose real path stays inside it and that haven't changed
// (mtime, ctime or birth time) since this session's last call on them; never
// a directory, a link or a *.lock. --temp-dir must be `temp` right under the
// folder it runs from, which must be the folder this session's registry entry
// names (peers.mjs's reader; a registry that can't say refuses), and not a
// link or junction. stdout:
//   {tempDir, deleted, kept: [{path, reason}], skipped: [{path, reason}], warnings}
//
// Exit 2 on any failure, with the reason on stderr.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { canonAbs, isMain, parseArgs, readIfPresent, repoRelative, runGit, sha1, sleepMs, slashify, toplevelOf } from './lib.mjs';
import { selfEntry } from './peers.mjs';

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);
const SHELL_TOOLS = { Bash: 'bash', PowerShell: 'pwsh' };

// ---------------------------------------------------------------------------
// Shell tokenizer. Not a full shell: it recognises enough of Bash and
// PowerShell to find explicit `git add` / `git mv` / `git rm` paths without
// being fooled by quoted text, comments, heredoc bodies, here-strings or
// redirections. Anything it can't resolve (variables, substitutions, globs) is
// dropped, never guessed.
// ---------------------------------------------------------------------------

function readHeredocDelimiter(src, i) {
  let j = i;
  while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
  let delim = '';
  while (j < src.length && !/[\s;|&<>()]/.test(src[j])) {
    const c = src[j];
    if (c === "'" || c === '"') {
      const k = src.indexOf(c, j + 1);
      const end = k < 0 ? src.length : k;
      delim += src.slice(j + 1, end);
      j = end + 1;
    } else if (c === '\\') {
      if (j + 1 < src.length) delim += src[j + 1];
      j += 2;
    } else {
      delim += c;
      j++;
    }
  }
  return { delim, next: j };
}

function skipHeredocBodies(src, i, pending) {
  let pos = i;
  for (const { delim, strip } of pending) {
    for (;;) {
      if (pos >= src.length) return src.length;
      let nl = src.indexOf('\n', pos);
      if (nl < 0) nl = src.length;
      let line = src.slice(pos, nl).replace(/\r$/, '');
      if (strip) line = line.replace(/^\t+/, '');
      pos = nl + 1;
      if (line === delim) break;
    }
  }
  return Math.min(pos, src.length);
}

export function tokenize(src, dialect) {
  const out = [];
  const n = src.length;
  let i = 0;
  let cur = null; // { v, x } x = holds an unresolvable expansion
  let dropNext = false; // the next word is a redirection target
  let pending = []; // bash heredocs whose bodies start after the next newline

  const start = () => { if (!cur) cur = { v: '', x: false }; };
  const endWord = () => {
    if (!cur) return;
    if (dropNext) dropNext = false;
    else out.push({ t: 'w', v: cur.v, x: cur.x });
    cur = null;
  };
  const sep = (op) => { endWord(); dropNext = false; out.push({ t: 's', op }); };
  // A command substitution ("$(...)", `...`, quoted or not) or bash's $'...'
  // can hold quotes, heredocs and text that reads like `git add X`: Claude's
  // own git commit -m "$(cat <<'EOF' ... EOF\n)" form does. Tokenizing stops
  // there: earlier words keep their evidence, nothing after it counts.
  // `out.rest` keeps the untokenized text.
  const stop = () => { start(); cur.x = true; endWord(); out.rest = src.slice(i); return out; };

  while (i < n) {
    const c = src[i];

    if (c === '\n') {
      sep('\n');
      i++;
      if (pending.length) { i = skipHeredocBodies(src, i, pending); pending = []; }
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') { endWord(); i++; continue; }

    if (dialect === 'bash') {
      if (c === '\\') {
        if (src[i + 1] === '\n') { i += 2; continue; }
        if (src[i + 1] === '\r' && src[i + 2] === '\n') { i += 3; continue; }
        start();
        if (i + 1 < n) cur.v += src[i + 1];
        i += 2;
        continue;
      }
      if (c === "'") {
        start();
        const k = src.indexOf("'", i + 1);
        const end = k < 0 ? n : k;
        cur.v += src.slice(i + 1, end);
        i = end + 1;
        continue;
      }
      if (c === '"') {
        start();
        i++;
        while (i < n && src[i] !== '"') {
          if (src[i] === '\\' && i + 1 < n && '$`"\\\n'.includes(src[i + 1])) {
            if (src[i + 1] !== '\n') cur.v += src[i + 1];
            i += 2;
            continue;
          }
          if (src[i] === '`' || (src[i] === '$' && src[i + 1] === '(')) return stop();
          if (src[i] === '$') cur.x = true;
          cur.v += src[i];
          i++;
        }
        i++;
        continue;
      }
      if (c === '`' || (c === '$' && (src[i + 1] === '(' || src[i + 1] === "'"))) return stop();
      if (c === '$') { start(); cur.x = true; cur.v += c; i++; continue; }
      if (c === '<' && src[i + 1] === '<' && src[i + 2] !== '<') {
        endWord();
        i += 2;
        let strip = false;
        if (src[i] === '-') { strip = true; i++; }
        const { delim, next } = readHeredocDelimiter(src, i);
        if (delim) pending.push({ delim, strip });
        i = next;
        continue;
      }
    } else {
      if (c === '<' && src[i + 1] === '#') {
        // A block comment, <# ... #>, may span lines.
        endWord();
        const k = src.indexOf('#>', i + 2);
        i = k < 0 ? n : k + 2;
        continue;
      }
      if (c === '`') {
        if (src[i + 1] === '\n') { i += 2; continue; }
        if (src[i + 1] === '\r' && src[i + 2] === '\n') { i += 3; continue; }
        start();
        if (i + 1 < n) cur.v += src[i + 1];
        i += 2;
        continue;
      }
      if (c === '@' && (!cur || cur.v.endsWith('=')) && (src[i + 1] === "'" || src[i + 1] === '"')
        && (src[i + 2] === '\n' || (src[i + 2] === '\r' && src[i + 3] === '\n'))) {
        // Here-string: literal until a line that starts with '@ or "@. It may
        // follow an assignment with no space: $m=@'
        endWord();
        const close = src[i + 1] + '@';
        let pos = src.indexOf('\n', i) + 1;
        let end = n;
        while (pos > 0 && pos < n) {
          if (src.startsWith(close, pos)) { end = pos + 2; break; }
          const nl = src.indexOf('\n', pos);
          if (nl < 0) break;
          pos = nl + 1;
        }
        out.push({ t: 'w', v: '', x: true });
        i = end;
        continue;
      }
      if (c === "'") {
        start();
        i++;
        while (i < n) {
          if (src[i] === "'") {
            if (src[i + 1] === "'") { cur.v += "'"; i += 2; continue; }
            break;
          }
          cur.v += src[i];
          i++;
        }
        i++;
        continue;
      }
      if (c === '"') {
        start();
        i++;
        while (i < n) {
          if (src[i] === '`' && i + 1 < n) { cur.v += src[i + 1]; i += 2; continue; }
          if (src[i] === '"') {
            if (src[i + 1] === '"') { cur.v += '"'; i += 2; continue; }
            break;
          }
          if (src[i] === '$' && src[i + 1] === '(') return stop();
          if (src[i] === '$') cur.x = true;
          cur.v += src[i];
          i++;
        }
        i++;
        continue;
      }
      if (c === '$' && src[i + 1] === '(') return stop();
      if (c === '$') { start(); cur.x = true; cur.v += c; i++; continue; }
    }

    if (c === '#' && !cur) {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === ';') { sep(';'); i++; continue; }
    if (c === '|') {
      if (src[i + 1] === '|') { sep('||'); i += 2; } else if (src[i + 1] === '&') { sep('|'); i += 2; } else { sep('|'); i++; }
      continue;
    }
    if (c === '&') {
      if (src[i + 1] === '&') { sep('&&'); i += 2; continue; }
      if (src[i + 1] === '>') {
        endWord();
        i += 2;
        if (src[i] === '>') i++;
        dropNext = true;
        continue;
      }
      sep('&');
      i++;
      continue;
    }
    if (c === '(' || c === ')') { sep(c); i++; continue; }
    if (c === '>' || c === '<') {
      if (cur && /^\d+$/.test(cur.v) && !cur.x) cur = null; // fd number, e.g. 2>
      else endWord();
      i++;
      while (i < n && (src[i] === '>' || src[i] === '<' || src[i] === '&' || src[i] === '|')) i++;
      dropNext = true;
      continue;
    }
    start();
    cur.v += c;
    i++;
  }
  endWord();
  return out;
}

const WIN = process.platform === 'win32';

// Every path a transcript names passes through here first. One on a network
// share (\\host\share, //host/share, \\?\UNC\...) is unresolvable and never
// touched: a stat there can hand this user's credentials to that host. A
// local device path (\\?\C:\x, \\.\C:\x) reads as C:\x. On Windows, Git Bash
// hands /c/x to native programs as C:/x; other POSIX-rooted paths (/tmp,
// /usr) map to places we can't know there, so they are unresolvable too.
export const shares = { seen: 0 };
function nativePath(v, dialect) {
  const device = /^[\\/]{2}[?.][\\/]([A-Za-z]:(?:[\\/].*)?)$/.exec(v);
  if (device) return device[1];
  if (/^[\\/]{2}/.test(v)) { shares.seen++; return null; }
  if (!WIN || dialect !== 'bash') return v;
  const m = /^\/([A-Za-z])(\/.*)?$/.exec(v);
  if (m) return `${m[1].toUpperCase()}:${m[2] || '/'}`;
  if (v.startsWith('/')) return null;
  return v;
}

// Fully-qualified absolute path? On Windows that means a drive root; a bare
// \x is relative to the current drive, which a record doesn't name.
function isFullyAbsolute(p) {
  if (!path.isAbsolute(p)) return false;
  return !WIN || /^[A-Za-z]:/.test(p);
}

// A transcript record's cwd, native and absolute, or null. On Windows it comes
// spelled two ways: C:\x, and Git Bash's /c/x.
function recordCwd(cwd) {
  if (typeof cwd !== 'string' || !cwd) return null;
  const p = nativePath(cwd, 'bash');
  return p !== null && isFullyAbsolute(p) ? p : null;
}

function resolveIn(base, v, dialect) {
  const p = nativePath(v, dialect);
  if (p === null) return null;
  if (isFullyAbsolute(p)) return path.resolve(p);
  if (path.isAbsolute(p)) return null;
  if (base === null) return null;
  return path.resolve(base, p);
}

const PREFIX_WORDS = new Set([
  'if', 'then', 'else', 'elif', 'do', 'while', 'until', '{', '!', 'time',
  'command', 'builtin', 'exec', 'nohup', 'env',
]);
// The words that move a shell's directory: these to a named folder, popd and
// pop-location to one the command doesn't name.
const CD_WORDS = new Set(['cd', 'pushd', 'chdir', 'set-location', 'sl', 'push-location']);
const CD_BACK = new Set(['popd', 'pop-location']);
// Any of them anywhere in a command, quoted or not.
const CD_NAMED = new RegExp(`(?:^|[^A-Za-z0-9_-])(?:${[...CD_WORDS, ...CD_BACK].join('|')})(?![A-Za-z0-9_-])`, 'i');
// env --chdir=<dir> and env -C <dir> run a command in another folder too.
// Matching more than that (a git -C after an env) only leaves paths unresolved.
const ENV_CHDIR = /--chdir\b|(?:^|[\s;&|(])env\s+(?:\S+\s+)*?-C(?:\s|$)/;
const hasCd = (command) => CD_NAMED.test(command) || ENV_CHDIR.test(command);
const GIT_TWO_TOKEN = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--super-prefix']);
const GIT_PATH_COMMANDS = new Map([['add', 'added'], ['stage', 'added'], ['mv', 'mv'], ['rm', 'removed']]);
// Git commands that may unstage: their revocations take back add/mv/rm evidence.
const REVOKERS = new Set(['restore', 'reset', 'stash', 'checkout']);
// Stash subcommands that change no staging.
const STASH_KEEPS = new Set(['list', 'show', 'drop', 'clear', 'create', 'store', 'branch', 'pop', 'apply']);
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

function commandName(v) {
  const base = v.split(/[\\/]/).pop().toLowerCase();
  return base.replace(/\.(exe|cmd|bat|com)$/, '');
}

const isDryRun = (o) => o === '--dry-run' || /^-[A-Za-z]*n[A-Za-z]*$/.test(o);

// Is an option set: a long form (--name, --name=value) or a short letter,
// alone or in a cluster (-SW, -fdx)?
function hasFlag(opts, short, ...long) {
  return opts.some((o) => long.some((l) => o === l || o.startsWith(`${l}=`))
    || (short !== null && /^-[A-Za-z]+$/.test(o) && o.slice(1).includes(short)));
}

// One git subcommand's words: its options, and its positional words before
// and after `--`. A `valued` option takes the next word as its value.
function gitArgs(words, valued) {
  const opts = [];
  const before = [];
  const after = [];
  let dashDash = false;
  for (let m = 0; m < words.length; m++) {
    const w = words[m];
    if (!dashDash && !w.x && w.v === '--') { dashDash = true; continue; }
    if (!dashDash && !w.x && w.v.length > 1 && w.v.startsWith('-')) {
      opts.push(w.v);
      if (valued.includes(w.v)) m++;
      continue;
    }
    (dashDash ? after : before).push(w);
  }
  return { opts, before, after, dashDash };
}

// One path argument, resolved, or null when it names no single file we can know.
function pathOf(w, gcwd, dialect) {
  const v = w.v;
  if (w.x || v === '' || v === '.' || v === '..' || v === './' || v === '.\\') return null;
  if (/[*?[]/.test(v)) return null; // glob, quoted or not: git expands pathspec globs itself
  if (v.startsWith(':')) return null; // pathspec magic
  return resolveIn(gcwd, v, dialect);
}

// A git command that may unstage (git restore --staged, git reset in any
// mode, git stash push / save / bare, git checkout <tree-ish> [--] <paths>)
// revokes the git add/mv/rm evidence recorded before it: for the paths it
// names, or for every path (path: null) when it names none we can resolve.
// A worktree discard (git checkout -- <paths>, git restore, git clean)
// revokes nothing: it leaves the index alone, and the exact replay already
// contests a file whose disk no longer matches this session's edits.
function revoke(sub, words, gcwd, dialect, found) {
  const push = (paths) => {
    if (!paths.length || paths.includes(null)) found.push({ kind: 'revoke', path: null, sub });
    else for (const p of paths) found.push({ kind: 'revoke', path: p, sub });
  };
  const resolve = (ws) => ws.map((w) => pathOf(w, gcwd, dialect));
  if (sub === 'checkout') {
    // From a tree-ish, checkout rewrites the paths' index entries too; -f and
    // --pathspec-from-file rewrite what can't be named. With no --, two or
    // more words may be a tree-ish and paths: all of them count. One word (a
    // branch, or '.') and `--` with nothing before it read the index only.
    const a = gitArgs(words, ['-b', '-B', '--orphan', '--pathspec-from-file', '--conflict']);
    if (hasFlag(a.opts, 'f', '--force') || hasFlag(a.opts, null, '--pathspec-from-file')) push([null]);
    else if (a.dashDash) { if (a.before.length) push(resolve(a.after)); }
    else if (a.before.length >= 2) push(resolve(a.before));
  } else if (sub === 'restore') {
    const a = gitArgs(words, ['-s', '--source', '--pathspec-from-file']);
    if (!hasFlag(a.opts, 'S', '--staged')) return;
    push(hasFlag(a.opts, null, '--pathspec-from-file') ? [null] : resolve([...a.before, ...a.after]));
  } else if (sub === 'reset') {
    const a = gitArgs(words, ['--pathspec-from-file']);
    if (hasFlag(a.opts, null, '--pathspec-from-file')) push([null]);
    else if (a.dashDash) push(resolve(a.after));
    else if (a.before.length === 1) {
      // One word: a commit (git reset HEAD~1: every path) or a path. What is
      // on disk decides when the evidence is applied.
      found.push({ kind: 'revoke', path: pathOf(a.before[0], gcwd, dialect), orAll: true, sub });
    } else push(resolve(a.before)); // none: every path; a leading commit names no file
  } else {
    const a = gitArgs(words, ['-m', '--message', '--pathspec-from-file']);
    const first = a.before[0];
    if (first && !first.x && STASH_KEEPS.has(first.v)) return;
    const pushing = !first || (!first.x && first.v === 'push');
    push(pushing && !hasFlag(a.opts, null, '--pathspec-from-file') ? resolve([...a.before.slice(first ? 1 : 0), ...a.after]) : [null]);
  }
}

// One simple command. Pushes its git add / mv / rm evidence and revocations
// onto `found` and returns the cwd that follows it (null = unknown).
function handleSegment(words, cwd, dialect, found) {
  let k = 0;
  let base = cwd; // where the command itself runs: env -C moves it, never the shell
  while (k < words.length) {
    const w = words[k];
    if (dialect === 'bash' && ASSIGNMENT.test(w.v)) { k++; continue; }
    const lw = w.v.toLowerCase();
    if (!w.x && PREFIX_WORDS.has(lw)) {
      k++;
      if (lw === 'env') {
        while (k < words.length && (words[k].v.startsWith('-') || ASSIGNMENT.test(words[k].v))) {
          const o = words[k];
          if (o.v === '-C' || o.v === '--chdir') {
            const d = words[k + 1];
            base = !d || d.x || o.x ? null : resolveIn(base, d.v, dialect);
            k += 2;
          } else if (o.v.startsWith('--chdir=')) {
            base = o.x ? null : resolveIn(base, o.v.slice('--chdir='.length), dialect);
            k++;
          } else if (['-u', '--unset', '-S', '--split-string'].includes(o.v)) {
            k += 2; // these take a value
          } else k++;
        }
      }
      continue;
    }
    break;
  }
  if (k >= words.length || words[k].x) return cwd;
  const cmd = commandName(words[k].v);

  if (CD_WORDS.has(cmd)) {
    const args = words.slice(k + 1).filter((w) => !(w.v.length > 1 && w.v.startsWith('-')));
    if (args.length !== 1) return null;
    const a = args[0];
    if (a.x || a.v === '' || a.v === '-' || a.v.startsWith('~')) return null;
    return resolveIn(cwd, a.v, dialect);
  }
  if (CD_BACK.has(cmd)) return null;
  if (cmd !== 'git') return cwd;

  let j = k + 1;
  let gcwd = base;
  while (j < words.length) {
    const v = words[j].v;
    if (words[j].x) return cwd;
    if (v === '-C') {
      const d = words[j + 1];
      if (!d) return cwd;
      gcwd = d.x ? null : resolveIn(gcwd, d.v, dialect);
      j += 2;
      continue;
    }
    if (GIT_TWO_TOKEN.has(v)) { j += 2; continue; }
    if (v.startsWith('-')) { j++; continue; }
    break;
  }
  if (j >= words.length) return cwd;
  const rest = words.slice(j + 1);
  if (REVOKERS.has(words[j].v)) { revoke(words[j].v, rest, gcwd, dialect, found); return cwd; }
  const kind = GIT_PATH_COMMANDS.get(words[j].v);
  if (!kind) return cwd;

  const a = gitArgs(rest, ['--pathspec-from-file', '--chmod']);
  // mv -k skips any move that fails, silently: what moved is unknown.
  if (a.opts.some((o) => isDryRun(o) || (kind === 'mv' && /^-[A-Za-z]*k[A-Za-z]*$/.test(o)))) return cwd;
  const paths = [...a.before, ...a.after].map((w) => pathOf(w, gcwd, dialect));
  if (kind !== 'mv') {
    for (const p of paths) if (p !== null) found.push({ kind, path: p });
    return cwd;
  }
  // git mv <src>... <dst>: each source leaves its path and lands at dst, or
  // inside dst when dst is a folder. One argument we couldn't resolve shifts
  // every position, so then the whole move counts for nothing.
  if (paths.length < 2 || paths.includes(null)) return cwd;
  const dst = paths[paths.length - 1];
  const srcs = paths.slice(0, -1);
  for (const src of srcs) {
    found.push({ kind: 'removed', path: src });
    found.push({ kind: 'moved', path: dst, src, into: srcs.length > 1 });
  }
  return cwd;
}

// Explicit git add / mv / rm evidence and revocations in one Bash or
// PowerShell command: [{kind: 'added' | 'moved' | 'removed', path, src?, into?}
// | {kind: 'revoke', path, orAll?}], each path resolved to an absolute
// native path against `cwd`, any `cd` earlier in the same command that ran in
// this shell, and `git -C`. `cwd` is the record's cwd, stamped after the call
// ran: with a cd anywhere in the command the start is unknown, and only
// absolute paths (or ones after an absolute cd) resolve.
export function parseGitEvidence(command, dialect, cwd) {
  if (typeof command !== 'string' || !command.includes('git')) return [];
  const items = tokenize(command, dialect);
  const found = [];
  const stack = [];
  let here = hasCd(command) ? null : recordCwd(cwd);
  let words = [];
  let prevOp = null;
  const flush = (nextOp) => {
    if (!words.length) return;
    const after = handleSegment(words, here, dialect, found);
    words = [];
    if (after === here) return;
    // A cd moves the base only when it runs in this shell. A background job
    // (`&`) never does. In bash every pipeline member runs in a subshell; in
    // PowerShell a pipeline's first command runs here, and a cd fed by a pipe
    // may not run at all.
    if (nextOp === '&') return;
    if (dialect === 'bash' && (prevOp === '|' || nextOp === '|')) return;
    here = prevOp === '|' ? null : after;
  };
  for (const it of items) {
    if (it.t === 'w') { words.push(it); continue; }
    if (it.op === '&' && !words.length) { prevOp = '&'; continue; } // PowerShell's call operator: & git add x
    flush(it.op);
    prevOp = it.op;
    if (dialect === 'bash' && it.op === '(') stack.push(here);
    else if (dialect === 'bash' && it.op === ')' && stack.length) here = stack.pop();
  }
  flush(null);
  // Text past a substitution is never tokenized. A git command there, at the
  // start of a line or after a separator, that the same rules count as a
  // staging revoker still revokes, of every path, since its paths are unknown.
  // Its words are split on blanks alone: only the options and the word count
  // matter, and a path read wrong is never used.
  if (items.rest !== undefined) {
    for (const m of items.rest.matchAll(/(?:^|[\n;&|(])\s*git\s+(?:-C\s+\S+\s+)?(restore|reset|stash|checkout)\b([^\n;&|)]*)/g)) {
      const tried = [];
      revoke(m[1], m[2].split(/\s+/).filter(Boolean).map((v) => ({ v, x: false })), null, dialect, tried);
      if (tried.length) { found.push({ kind: 'revoke', path: null, sub: m[1] }); break; }
    }
  }
  return found;
}

// The `git add` paths alone.
export function parseGitAdds(command, dialect, cwd) {
  return parseGitEvidence(command, dialect, cwd).filter((f) => f.kind === 'added').map((f) => f.path);
}

// ---------------------------------------------------------------------------
// Transcripts
// ---------------------------------------------------------------------------

function isSafeId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9._-]+$/.test(id) && id !== '.' && id !== '..';
}

// A folder we can't read is reported, never taken as "no transcripts here".
function walkJsonl(dir, out, warnings) {
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code !== 'ENOENT') warnings.push(`cannot read ${dir} (${e.code || e.message}): transcripts in it are not counted`);
    return;
  }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkJsonl(full, out, warnings);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
}

export function findTranscripts(projectsDir, sessionId, warnings = []) {
  const files = [];
  let dirs;
  try {
    dirs = fs.readdirSync(projectsDir, { withFileTypes: true });
  } catch (e) {
    if (e.code !== 'ENOENT') warnings.push(`cannot read ${projectsDir} (${e.code || e.message})`);
    return files;
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const base = path.join(projectsDir, d.name);
    const main = path.join(base, `${sessionId}.jsonl`);
    try {
      if (fs.statSync(main).isFile()) files.push(main);
    } catch (e) {
      if (e.code !== 'ENOENT') warnings.push(`cannot read ${main} (${e.code || e.message}): not counted`);
    }
    walkJsonl(path.join(base, sessionId, 'subagents'), files, warnings);
  }
  return files.sort();
}

// A file path from a tool call, absolute and native, or null. Git Bash's /c/x
// spelling means C:/x, as for a cwd.
function absFrom(p, cwd) {
  if (typeof p !== 'string' || !p) return null;
  const q = nativePath(p, 'bash');
  if (q === null) return null;
  if (isFullyAbsolute(q)) return path.resolve(q);
  if (path.isAbsolute(q) || !cwd) return null;
  return path.resolve(cwd, q);
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

// Text as lines, and whether the last one ends in a newline.
function splitLines(s) {
  if (s === '') return { lines: [], nl: false };
  const lines = s.split('\n');
  const nl = lines[lines.length - 1] === '';
  if (nl) lines.pop();
  return { lines, nl };
}

// The text a Write replaced, rebuilt from its new content and its result's
// structuredPatch: each hunk's new side (' ' and '+' lines) gives way to its
// old side (' ' and '-' lines); '\' marker lines say which side's last line
// has no newline. null when the patch doesn't fit the content.
export function reversePatch(content, hunks) {
  if (typeof content !== 'string' || !Array.isArray(hunks)) return null;
  const now = splitLines(content);
  const out = [];
  let pos = 0;
  let oldNl = now.nl;
  for (const h of hunks) {
    if (!h || !Array.isArray(h.lines) || !Number.isInteger(h.newStart) || !Number.isInteger(h.newLines) || !Number.isInteger(h.oldLines)) return null;
    // jsdiff's structuredPatch is 1-based even for an empty new side (only
    // its unified-diff text names the line before): checked against jsdiff 8.
    const start = h.newStart - 1;
    if (start < pos || start > now.lines.length) return null;
    out.push(...now.lines.slice(pos, start));
    const newSide = [];
    const oldSide = [];
    let last = null;
    let oldMarker = false;
    for (const l of h.lines) {
      if (typeof l !== 'string' || l === '') return null;
      const tag = l[0];
      if (tag === '\\') {
        if (last === '-' || last === ' ') oldMarker = true;
        continue;
      }
      if (tag === ' ' || tag === '+') newSide.push(l.slice(1));
      if (tag === ' ' || tag === '-') oldSide.push(l.slice(1));
      if (tag !== ' ' && tag !== '+' && tag !== '-') return null;
      last = tag;
    }
    if (newSide.length !== h.newLines || oldSide.length !== h.oldLines) return null;
    if (newSide.some((l, k) => now.lines[start + k] !== l)) return null;
    out.push(...oldSide);
    pos = start + newSide.length;
    // A hunk that reaches the end of the new text reaches the end of the old
    // one too: the old side ends in a newline unless a '\' marker says not.
    if (pos === now.lines.length) oldNl = !oldMarker;
  }
  out.push(...now.lines.slice(pos));
  return out.length ? out.join('\n') + (oldNl ? '\n' : '') : '';
}

// What an Edit, MultiEdit, Write or NotebookEdit call did to its file, for the
// replay. The values are the ones the tool APPLIED (its result's
// toolUseResult: the user may have changed the proposal), else the call's
// input. A Write carries what it replaced: originalFile, or the old side
// rebuilt from its structuredPatch. A shape the replay can't use is `bad`.
function contentOp(name, input, applied) {
  const a = applied && typeof applied === 'object' ? applied : {};
  const pair = (e, x = {}) => {
    const from = typeof x.oldString === 'string' ? x.oldString : e && (e.old_string ?? e.oldString);
    const to = typeof x.newString === 'string' ? x.newString : e && (e.new_string ?? e.newString);
    const all = typeof x.replaceAll === 'boolean' ? x.replaceAll : Boolean(e && (e.replace_all ?? e.replaceAll));
    return typeof from === 'string' && typeof to === 'string' ? { old: from, new: to, all } : null;
  };
  if (name === 'Write') {
    const content = typeof a.content === 'string' ? a.content : input.content;
    if (typeof content !== 'string') return { bad: 'a Write with no content' };
    if (a.type === 'create') return { write: content, kind: 'create' };
    const pre = a.type !== 'update' ? null
      : typeof a.originalFile === 'string' ? a.originalFile : reversePatch(content, a.structuredPatch);
    return { write: content, kind: 'update', pre };
  }
  if (name === 'Edit') {
    const e = pair(input, a);
    return e ? { edits: [e] } : { bad: 'an Edit with no strings' };
  }
  if (name === 'MultiEdit') {
    const list = Array.isArray(a.edits) ? a.edits : input.edits;
    const es = Array.isArray(list) ? list.map((e) => pair(e)) : [null];
    return es.length && es.every(Boolean) ? { edits: es } : { bad: 'a MultiEdit with no strings' };
  }
  return { bad: 'a notebook edit' };
}

const OWNERSHIP = ['touched', 'added', 'moved', 'removed', 'failed', 'unconfirmedTouched', 'unconfirmedExplicit'];
// What a staging revocation takes back: the explicit git add/mv/rm evidence.
const STAGING = ['added', 'moved', 'removed', 'failed', 'unconfirmedExplicit'];
// The parts of each content tool's result the replay reads. An Edit's
// originalFile is never kept: only a Write's replay needs a pre-image.
const APPLIED = {
  Write: ['type', 'content', 'originalFile', 'structuredPatch'],
  Edit: ['oldString', 'newString', 'replaceAll'],
  MultiEdit: ['edits'],
  NotebookEdit: [],
};

export async function collectEvidence(files, sessionId) {
  shares.seen = 0;
  const uses = []; // tool_use calls in reading order
  const results = new Map(); // tool_use id -> { error, ts, applied }
  const contentIds = new Map(); // id of each Edit / MultiEdit / Write / NotebookEdit call -> its tool
  const cdMessages = new Set(); // message ids holding a shell call with a cd in it
  const warnings = [];
  let malformed = 0;
  let otherSession = 0;
  for (const file of files) {
    const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
    let tailFailed = false;
    for await (const line of rl) {
      tailFailed = false;
      if (!line.trim()) continue;
      let o;
      try { o = JSON.parse(line); } catch { malformed++; tailFailed = true; continue; }
      if (!o || typeof o !== 'object') continue;
      // --fork-session copies a parent's history under the new id: those records are the parent's.
      if (o.sessionId !== undefined && o.sessionId !== sessionId) { otherSession++; continue; }
      const content = o.message && Array.isArray(o.message.content) ? o.message.content : null;
      if (!content) continue;
      const parsed = typeof o.timestamp === 'string' ? Date.parse(o.timestamp) : NaN;
      const ts = Number.isFinite(parsed) ? parsed : null;
      if (o.type === 'user') {
        for (const c of content) {
          if (!c || c.type !== 'tool_result' || typeof c.tool_use_id !== 'string') continue;
          const res = { error: c.is_error === true, ts, applied: null };
          const tur = o.toolUseResult;
          if (contentIds.has(c.tool_use_id) && tur && typeof tur === 'object') {
            res.applied = Object.fromEntries(APPLIED[contentIds.get(c.tool_use_id)].filter((k) => k in tur).map((k) => [k, tur[k]]));
          }
          results.set(c.tool_use_id, res);
        }
        continue;
      }
      if (o.type !== 'assistant') continue;
      const msgId = typeof o.message.id === 'string' ? o.message.id : null;
      for (const c of content) {
        if (!c || c.type !== 'tool_use' || !c.input || typeof c.input !== 'object') continue;
        // A use with no id can never be matched to a result: it stays unconfirmed.
        const use = { id: typeof c.id === 'string' ? c.id : `${file}:${uses.length}`, name: c.name, ts, cwd: o.cwd, msgId, seq: uses.length };
        if (EDIT_TOOLS.has(c.name) || c.name === 'NotebookEdit') {
          use.file = c.name === 'NotebookEdit' ? c.input.notebook_path : c.input.file_path;
          use.input = c.input;
          contentIds.set(use.id, c.name);
        } else if (c.name === 'Read') {
          use.file = c.input.file_path;
        } else if (Object.hasOwn(SHELL_TOOLS, c.name) && typeof c.input.command === 'string') {
          use.command = c.input.command;
          if (msgId !== null && hasCd(use.command)) cdMessages.add(msgId);
        } else continue;
        uses.push(use);
      }
    }
    // Only the live session's own main transcript is still being appended
    // to: its broken final line is a write in progress, not damage.
    if (tailFailed && path.basename(file) === `${sessionId}.jsonl`) malformed--;
  }

  // A record's cwd is stamped after its call ran. Calls in one message run
  // together, so a cd in any of them leaves every one's start unknown.
  const events = [];
  for (const use of uses) {
    const cwd = use.msgId !== null && cdMessages.has(use.msgId) ? null : recordCwd(use.cwd);
    const found = use.command !== undefined
      ? parseGitEvidence(use.command, SHELL_TOOLS[use.name], cwd)
      : [{ kind: use.name === 'Read' ? 'read' : 'touched', path: absFrom(use.file, cwd) }];
    for (const f of found) events.push({ ...f, use });
  }
  // Timestamp order across every transcript: a revocation undoes only what
  // came before it. With no timestamp, evidence sorts first (it proves
  // nothing fresh) and a revocation last (it undoes everything).
  const key = (e) => (e.use.ts !== null ? e.use.ts : e.kind === 'revoke' ? Infinity : -Infinity);
  events.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : a.use.seq - b.use.seq));

  // content: path -> this session's content changes, in order, for replay.
  // last: path -> the kind of this session's latest call on it (confirmed or
  // not), which says whether a deletion is the last thing it did there.
  // blind: path -> {sec, by}: git add/mv/rm evidence a blind revoke took back.
  // moves: new path -> {src, sec}: each git mv, paired.
  const ev = { malformed, otherSession, warnings, temp: new Map(), content: new Map(), last: new Map(), blind: new Map(), moves: new Map() };
  for (const kind of OWNERSHIP) ev[kind] = new Map();
  // Each path keeps the timestamp of its latest evidence, in whole seconds.
  const note = (map, p, sec) => {
    const k = canonAbs(p);
    if (!map.has(k) || sec > map.get(k)) map.set(k, sec);
  };
  let order = 0;
  for (const e of events) {
    order++;
    const r = results.get(e.use.id);
    if (e.kind === 'revoke') {
      // A command that may have unstaged a path takes back the git add/mv/rm
      // evidence before it. A blind one (no path we can resolve) takes back
      // all of it, and each path it took is remembered: still dirty, it is
      // asked about (contested, revoked), never filed as a peer's. Content
      // evidence is never revoked: a file whose disk no longer matches this
      // session's edits already fails the exact replay.
      const target = e.orAll && (e.path === null || !fs.existsSync(e.path)) ? null : e.path;
      const prefix = target === null ? null : canonAbs(target);
      const hit = (k) => prefix === null || k === prefix || k.startsWith(`${prefix}/`);
      const by = `git ${e.sub || 'reset'}`;
      for (const kind of STAGING) {
        for (const [k, sec] of [...ev[kind]]) {
          if (!hit(k)) continue;
          ev[kind].delete(k);
          if (prefix === null && !(ev.blind.get(k)?.sec >= sec)) ev.blind.set(k, { sec, by });
        }
      }
      // Only the git subcommand is named: the rest of the line may hold a secret.
      const said = `"${by}" may have unstaged any path: every git add/mv/rm before it is taken back`;
      if (prefix === null && !warnings.includes(said)) warnings.push(said);
      continue;
    }
    let p = e.path;
    if (!p) continue;
    if (e.kind === 'moved' && (e.into || isDir(p))) p = path.join(p, path.basename(e.src));
    // A git command on a directory proves nothing about the files in it.
    if (e.kind !== 'touched' && e.kind !== 'read' && isDir(p)) continue;
    const sec = e.use.ts === null ? -Infinity : Math.floor(e.use.ts / 1000);
    if (e.kind !== 'read') ev.last.set(canonAbs(p), e.kind);
    if (e.kind === 'moved' && r && !r.error) ev.moves.set(canonAbs(p), { src: canonAbs(e.src), sec });
    if (r && !r.error) {
      if (e.kind !== 'read') note(ev[e.kind], p, sec);
      if (e.use.input) {
        const k = canonAbs(p);
        if (!ev.content.has(k)) ev.content.set(k, []);
        ev.content.get(k).push({ sec, order, ...contentOp(e.use.name, e.use.input, r.applied) });
      }
      if (e.kind === 'touched' || e.kind === 'read') {
        // temp/ compares a file's mtime with the moment the call finished.
        const k = canonAbs(p);
        const was = ev.temp.get(k);
        ev.temp.set(k, r.ts === null ? (was === undefined ? null : was) : Math.max(r.ts, was ?? -Infinity));
      }
    } else if (r) {
      if (e.kind === 'added' || e.kind === 'moved' || e.kind === 'removed') note(ev.failed, p, sec);
    } else if (e.kind === 'touched') {
      note(ev.unconfirmedTouched, p, sec);
    } else if (e.kind !== 'read') {
      note(ev.unconfirmedExplicit, p, sec);
    }
  }
  return ev;
}

// ---------------------------------------------------------------------------
// Dirty set
// ---------------------------------------------------------------------------

export function parsePorcelainZ(buf) {
  const parts = buf.split('\0');
  const entries = [];
  for (let i = 0; i < parts.length; i++) {
    const rec = parts[i];
    if (rec.length < 4) continue;
    const x = rec[0];
    const y = rec[1];
    const p = rec.slice(3);
    let orig = null;
    if ('RC'.includes(x) || 'RC'.includes(y)) orig = parts[++i] || null;
    entries.push({ x, y, path: p, orig });
  }
  return entries;
}

// The last time a file's content or place changed: a file moved or copied in
// keeps its old mtime but gets a new change or birth time.
const changedAt = (st) => Math.max(st.mtimeMs, st.ctimeMs, st.birthtimeMs);

// Every entry under the temp dir, links marked and never followed. null when
// the temp dir is itself a link or junction (a junction lstats as a symbolic
// link on Windows): what it points at is not this project's temp.
function listTempFiles(dir) {
  try { if (fs.lstatSync(dir).isSymbolicLink()) return null; } catch { return []; }
  const out = [];
  const walk = (d, rel) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const full = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) out.push({ rel: r, full, link: true });
      else if (e.isDirectory()) walk(full, r);
      else {
        let changedMs = Infinity;
        try { changedMs = changedAt(fs.lstatSync(full)); } catch { /* gone: never this session's */ }
        out.push({ rel: r, full, link: false, changedMs });
      }
    }
  };
  walk(dir, '');
  return out;
}

const staged = (x) => x !== ' ' && x !== '?' && x !== '!';
// Windows and macOS file systems ignore letter case by default.
const FOLDS_CASE = WIN || process.platform === 'darwin';
const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

// HEAD's commit, or null on an unborn branch: rev-parse finds no HEAD while
// HEAD still names a branch. Any other failure to read it is an error.
export function readHead(top) {
  const r = runGit(['-C', top, 'rev-parse', '--verify', '-q', 'HEAD^{commit}']); // a commit that exists, not just a well-formed id
  if (!r.error && r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  if (!r.error && r.status === 1 && runGit(['-C', top, 'symbolic-ref', '-q', 'HEAD']).status === 0) return null;
  throw new Error(`cannot read HEAD: ${(r.stderr || String(r.error || '')).trim() || `git rev-parse exited ${r.status}`}`);
}

// Which of these repo-relative paths git ignores. A check that fails names
// none, so nothing is excused.
function ignoredOf(top, paths) {
  if (!paths.length) return new Set();
  const r = runGit(['-C', top, 'check-ignore', '-z', '--stdin'], { input: paths.map((p) => `${p}\0`).join('') });
  return !r.error && (r.status === 0 || r.status === 1) ? new Set(r.stdout.split('\0').filter(Boolean)) : new Set();
}

// HEAD's content of each path, from one `git cat-file --batch`: path ->
// Buffer, or null when HEAD has no such file (a new one). A path the map
// lacks couldn't be read, and its replay can't compare.
export function headBlobs(top, paths, warnings) {
  const out = new Map();
  const list = [...new Set(paths)].filter((p) => !p.includes('\n'));
  if (!list.length) return out;
  const r = runGit(['-C', top, 'cat-file', '--batch'], { input: list.map((p) => `HEAD:${p}\n`).join('') });
  if (r.error || r.status !== 0) {
    warnings.push(`git cat-file --batch failed (${(r.stderr || String(r.error)).trim() || `exit ${r.status}`}): no file can be compared with HEAD, so none is mine`);
    return out;
  }
  const buf = r.buffer;
  let pos = 0;
  for (const p of list) {
    const nl = buf.indexOf(10, pos);
    if (nl < 0) break;
    const header = buf.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    if (header.endsWith(' missing')) { out.set(p, null); continue; }
    const m = /^[0-9a-f]+ (\w+) (\d+)$/.exec(header);
    if (!m) break;
    const size = Number(m[2]);
    if (m[1] === 'blob') out.set(p, buf.subarray(pos, pos + size));
    pos += size + 1;
  }
  return out;
}

const lf = (s) => s.replace(/\r\n/g, '\n');

// For the report only: how many lines each side holds that the other lacks.
function tally(now, ours) {
  const count = (s) => {
    const m = new Map();
    for (const l of splitLines(s).lines) m.set(l, (m.get(l) || 0) + 1);
    return m;
  };
  const a = count(now);
  const b = count(ours);
  let addedForeign = 0;
  let removedForeign = 0;
  for (const [l, k] of a) addedForeign += Math.max(0, k - (b.get(l) || 0));
  for (const [l, k] of b) removedForeign += Math.max(0, k - (a.get(l) || 0));
  return { addedForeign, removedForeign };
}

// 'crlf' or 'lf' when every line break is that kind, else null.
function eolStyle(s) {
  const all = (s.match(/\n/g) || []).length;
  const crlf = (s.match(/\r\n/g) || []).length;
  if (!all) return null;
  return crlf === all ? 'crlf' : crlf === 0 ? 'lf' : null;
}

// Bytes that UTF-8 text round-trips exactly. Others (Latin-1, a stray byte)
// would decode to U+FFFD, and two different such bytes would compare equal.
const isUtf8 = (buf) => Buffer.from(buf.toString('utf8'), 'utf8').equals(buf);

// This session's fresh content ops replayed, in order, from HEAD's text
// (`head` null: HEAD has no such file). Each must find what it found when it
// ran: a Write's recorded pre-image (or no file, for a create) must equal the
// replay so far, and an Edit's old_string must be there once (at least once
// with replace_all). {text} (null: still no file), or {fail} saying which
// step didn't hold.
function replay(head, ops) {
  let text = head === null ? null : lf(head.toString('utf8'));
  for (const op of ops) {
    if (op.bad) return { fail: { detail: `can't compare (${op.bad})` } };
    if (op.write !== undefined) {
      if (op.kind === 'create') {
        if (text !== null) return { fail: { detail: 'a Write created a file the replay already holds' } };
      } else if (op.pre === null) {
        return { fail: { detail: 'can\'t compare (no pre-write content)' } };
      } else if (text === null || lf(op.pre) !== text) {
        // The Write carried lines this session's edits never made: a peer's,
        // read in and written back out.
        return { fail: { ...tally(lf(op.pre), text ?? ''), detail: 'a Write over lines this session\'s edits don\'t account for' } };
      }
      text = lf(op.write);
      continue;
    }
    for (const e of op.edits) {
      const from = lf(e.old);
      const to = lf(e.new);
      if (from === '') {
        if (text !== null && text !== '') return { fail: { detail: 'an Edit with an empty old_string, on a file with content' } };
        text = to;
        continue;
      }
      const n = text === null ? 0 : text.split(from).length - 1;
      if (e.all ? n < 1 : n !== 1) return { fail: { detail: `an Edit whose old_string the replay holds ${n} times` } };
      text = e.all ? text.split(from).join(to) : text.replace(from, () => to);
    }
  }
  return { text };
}

// Whether the file on disk is exactly this session's own work: the replay
// must hold and its result equal the disk, text and order, with CRLF read as
// LF. Line endings are held to HEAD's only when HEAD's are all one style and
// no Write touched the file: a mixed HEAD, a new file and a Write's own
// endings go unchecked. null when it all holds; else {addedForeign,
// removedForeign} (for the report: line counts of the difference) and, when
// that doesn't say enough, a detail. Counts of 0 and 0 with a detail mean the
// disk still differs.
export function foreignLines(head, disk, ops) {
  const same = !ops.length && head !== null && head.equals(disk);
  if ((head && head.includes(0)) || disk.includes(0)) return same ? null : { detail: 'can\'t compare (binary)' };
  if ((head && !isUtf8(head)) || !isUtf8(disk)) return same ? null : { detail: 'not UTF-8 text' };
  const played = replay(head, ops);
  if (played.fail) return played.fail;
  const { text } = played;
  const raw = disk.toString('utf8');
  const now = lf(raw);
  if (now !== text) {
    const t = tally(now, text ?? '');
    if (t.addedForeign || t.removedForeign) return t;
    const lines = splitLines(now).lines.join('\n') === splitLines(text ?? '').lines.join('\n');
    return { ...t, detail: lines ? 'the final newline changed' : 'lines moved or reordered' };
  }
  if (head !== null && !ops.some((op) => op.write !== undefined)) {
    const style = eolStyle(head.toString('utf8'));
    if (style && eolStyle(raw) !== style) return { addedForeign: 0, removedForeign: 0, detail: 'line endings changed' };
  }
  return null;
}

// Whether this session's uncommitted work on a clean file is gone: its
// replay from HEAD fails, or leaves text HEAD doesn't hold. A stash, a
// checkout or a discard (ours or a peer's) took it.
export function vanishedFrom(head, ops) {
  if (head.includes(0) || !isUtf8(head)) return true;
  const played = replay(head, ops);
  return Boolean(played.fail) || played.text !== lf(head.toString('utf8'));
}

// The whole classification, plus what --delete-temp needs: why each temp file
// is kept, and the latest moment this session finished a call on each one it
// may delete.
async function sortAll({ sessionId, repo, projectsDir, tempDir }) {
  const warnings = [];
  const top = toplevelOf(repo);
  if (!top) throw new Error(`not inside a git repository: ${repo}`);

  const files = findTranscripts(projectsDir, sessionId, warnings);
  if (!files.length) warnings.push(`no transcripts found for session ${sessionId}: nothing can be attributed, so every dirty path is foreign`);
  const ev = await collectEvidence(files, sessionId);
  if (ev.malformed) warnings.push(`${ev.malformed} malformed transcript line(s) skipped: attribution may be wrong`);
  if (shares.seen) warnings.push(`${shares.seen} path(s) on a network share in this session's tool calls were ignored, never opened`);
  if (ev.otherSession) warnings.push(`${ev.otherSession} transcript record(s) stamped with another session id skipped (history a --fork-session copied in)`);
  warnings.push(...ev.warnings);

  // The evidence maps keyed by repo-relative path. A Read is not among them.
  const relKeys = (map) => {
    const keys = new Map();
    for (const [p, v] of map) {
      const rel = repoRelative(p, top);
      if (rel !== null) keys.set(rel, v);
    }
    return keys;
  };
  const [touched, added, moved, removed, failed, unconfirmedT, unconfirmedE] = [ev.touched, ev.added, ev.moved, ev.removed, ev.failed, ev.unconfirmedTouched, ev.unconfirmedExplicit].map(relKeys);
  const content = relKeys(ev.content); // path -> this session's content changes, in order
  const last = relKeys(ev.last); // path -> the kind of this session's latest call on it
  const blind = relKeys(ev.blind); // path -> {sec, by}: evidence a blind revoke took back
  const moves = new Map(); // new path -> {src, sec}: this session's git mv calls
  for (const [dst, m] of ev.moves) {
    const d = repoRelative(dst, top);
    const s = repoRelative(m.src, top);
    if (d !== null && s !== null) moves.set(d, { src: s, sec: m.sec });
  }

  // One freshness rule for every kind of evidence: it counts only while its
  // timestamp, in whole seconds, is later than the path's last commit. Equal
  // (git add F && git commit in one second), no timestamp, or a git log that
  // fails all read as stale.
  const commitTimes = new Map();
  const lastCommit = (p) => {
    if (!commitTimes.has(p)) {
      const r = runGit(['-C', top, 'log', '-1', '--format=%ct', '--', `:(literal)${p}`]);
      const s = r.stdout.trim();
      commitTimes.set(p, r.error || r.status !== 0 ? null : s ? Number(s) : -Infinity);
    }
    return commitTimes.get(p);
  };
  const isFresh = (p, sec) => {
    const ct = lastCommit(p);
    return ct !== null && sec > ct;
  };
  const fresh = (keys, p) => keys.has(p) && isFresh(p, keys.get(p));
  const explicit = (p) => fresh(added, p) || fresh(moved, p) || fresh(removed, p);
  const has = (p) => fresh(touched, p) || explicit(p);
  const evidenced = (p) => [touched, added, moved, removed, unconfirmedT, unconfirmedE].some((keys) => keys.has(p));
  const revokedBy = (p) => (blind.has(p) && isFresh(p, blind.get(p).sec) ? blind.get(p).by : null);
  // A git add never proves a deletion: only this session's own git rm, or
  // its git mv away from the path, still standing and the last thing this
  // session did to it.
  const deletedByUs = (p) => fresh(removed, p) && last.get(p) === 'removed';
  const folded = new Set();
  if (FOLDS_CASE) {
    for (const keys of [touched, added, moved, removed, unconfirmedT, unconfirmedE]) for (const k of keys.keys()) folded.add(k.toLowerCase());
  }
  // Evidence that names a path without proving it is ours now.
  const weak = (p, x) => {
    if (fresh(unconfirmedT, p) || fresh(unconfirmedE, p)) return 'unconfirmed';
    if (staged(x) && fresh(failed, p)) return 'staged-by-failed-command';
    if (revokedBy(p)) return 'revoked';
    if (evidenced(p)) return 'committed-since';
    if (folded.has(p.toLowerCase())) return 'case-mismatch';
    return null;
  };

  // HEAD before git status: step 6 asks which commits came after it.
  const headSha = readHead(top);
  const st = runGit(['-C', top, 'status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (st.error || st.status !== 0) throw new Error(`git status failed: ${(st.stderr || String(st.error)).trim()}`);
  const entries = parsePorcelainZ(st.stdout);
  const isNew = (e) => e.x === '?' && e.y === '?';
  const tracked = new Set(entries.filter((e) => !isNew(e)).flatMap((e) => (e.orig ? [e.path, e.orig] : [e.path])));
  // Each path's bytes: a Buffer, null when it is gone, or {unreadable} when
  // reading failed some other way (a lock, a permission): never taken as gone.
  const disks = new Map();
  const diskOf = (p) => {
    if (!disks.has(p)) {
      let d;
      try { d = readIfPresent(path.join(top, ...p.split('/'))); } catch (e) { d = { unreadable: e.code || e.message }; }
      disks.set(p, d);
    }
    return disks.get(p);
  };

  // One side of a tracked entry: 'mine', 'foreign', or a contested reason.
  const judge = (p, x, y) => {
    const w = has(p) ? null : weak(p, x);
    if (!has(p) && !w) return 'foreign';
    // A deletion still on disk (git rm --cached, of an ignored file too, or a
    // new file where a removed one was): git commit --only would add the disk
    // file back. One is mine only when the file is gone from disk.
    const deleted = x === 'D' || y === 'D';
    if (deleted && diskOf(p) !== null) return 'rm-cached';
    if (w) return w;
    if (deleted && !deletedByUs(p)) return 'deleted-outside-git';
    if (staged(x) && !explicit(p)) return fresh(failed, p) ? 'staged-by-failed-command' : revokedBy(p) ? 'revoked' : 'staged-elsewhere';
    return 'mine';
  };
  // An untracked file: this session created it, or it isn't this session's.
  const judgeNew = (p) => {
    if (fresh(removed, p)) return 'rm-cached';
    if (fresh(touched, p) || fresh(added, p) || fresh(moved, p)) return 'mineNew';
    return weak(p, '?') || 'foreign';
  };

  const mine = new Set();
  const mineNew = new Set();
  const foreign = new Set();
  const peerStaged = new Set();
  const contested = new Map();
  const xOf = new Map(); // each path's index column
  const deletions = new Set(); // paths git status shows deleted, in the index or on disk
  const renamed = new Map(); // a rename judged mine: new path -> its source
  const place = (p, verdict, x, extra = {}) => {
    if (verdict === 'mine') mine.add(p);
    else if (verdict === 'mineNew') mineNew.add(p);
    else if (verdict === 'foreign') { foreign.add(p); if (staged(x)) peerStaged.add(p); }
    else if (!contested.has(p)) {
      const entry = { path: p, reason: verdict, ...extra };
      if (verdict === 'revoked') entry.revokedBy = revokedBy(p);
      // Whatever the reason, say so when the index holds it staged with no
      // fresh add/mv/rm of ours: that staging may be a peer's.
      if (staged(x) && !explicit(p)) entry.staged = true;
      contested.set(p, entry);
    }
  };
  // Move a mine path (and, recursively, its rename partner) to contested.
  const demote = (p, reason, extra) => {
    const wasNew = mineNew.delete(p);
    mine.delete(p);
    place(p, reason, xOf.get(p), { ...(wasNew ? { untracked: true } : {}), ...extra });
  };
  for (const e of entries) {
    xOf.set(e.path, e.x);
    if (e.orig && !xOf.has(e.orig)) xOf.set(e.orig, e.x);
    if (e.x === 'D' || e.y === 'D') deletions.add(e.path);
    if (isNew(e)) {
      if (!tracked.has(e.path)) place(e.path, judgeNew(e.path), e.x, { untracked: true });
      continue;
    }
    if (!e.orig || !(e.x === 'R' || e.y === 'R')) {
      // A copy's original stays in the tree (it has its own entry if it
      // changed): only the new path is judged.
      place(e.path, judge(e.path, e.x, e.y), e.x);
      continue;
    }
    // A rename commits as a pair, so both sides must be this session's. The
    // source side is a deletion, staged (R in the index) or, for an
    // intent-to-add rename (R in the worktree), done on disk, and is judged
    // as one: a git add of both sides proves nothing about it.
    deletions.add(e.orig);
    const sides = [[e.path, e.y], [e.orig, 'D']];
    const verdicts = sides.map(([p, y]) => judge(p, e.x, y));
    if (verdicts[0] === 'mine' && verdicts[1] === 'mine') { mine.add(e.path); mine.add(e.orig); renamed.set(e.path, e.orig); continue; }
    const lone = has(e.path) !== has(e.orig); // only one side has fresh evidence
    sides.forEach(([p], k) => {
      const v = verdicts[k];
      const split = v === 'mine' || (lone && has(p) && v !== 'rm-cached');
      place(p, split ? 'rename-split' : v, e.x, { pair: sides[1 - k][0] });
    });
  }
  // A path is mine only if replaying this session's fresh content ops
  // reproduces its disk exactly (foreignLines): anything else in it would be
  // committed under our message. One cat-file reads HEAD's side of every path
  // replayed. A rename's new side is replayed from HEAD's copy of its source,
  // the edits made under both names in order. A contested path with content
  // ops gets the same replay from its own name, for the report. A deletion
  // judge() let through is this session's git rm: nothing to replay.
  const sources = new Set(renamed.values());
  const baseOf = (p) => renamed.get(p) ?? p;
  const opsOf = (p) => (renamed.has(p) ? [renamed.get(p), p] : [p])
    .flatMap((name) => (content.get(name) || []).filter((op) => isFresh(name, op.sec)))
    .sort((a, b) => a.order - b.order);
  // Paths git status lists nowhere that this session edited, added or
  // removed: its uncommitted work there may have vanished.
  const listed = new Set(entries.flatMap((e) => (e.orig ? [e.path, e.orig] : [e.path])));
  const unlisted = [...new Set([...content.keys(), ...added.keys(), ...removed.keys()])].filter((p) => !listed.has(p)).sort();
  const candidates = [...mine, ...mineNew].filter((p) => !sources.has(p) && !deletions.has(p));
  const reported = [...contested.keys()].filter((p) => opsOf(p).length);
  const heads = headBlobs(top, [...candidates, ...reported, ...unlisted].map(baseOf), warnings);
  const replayOf = (p) => {
    const disk = diskOf(p);
    const head = heads.get(baseOf(p));
    if (disk === null) return { detail: 'can\'t compare (not on disk)' };
    if (!Buffer.isBuffer(disk)) return { detail: `unreadable (${disk.unreadable})` };
    if (head === undefined) return { detail: 'can\'t compare (HEAD\'s copy unreadable)' };
    return foreignLines(head, disk, opsOf(p));
  };
  for (const p of reported) {
    const entry = contested.get(p);
    Object.assign(entry, replayOf(p) || { addedForeign: 0, removedForeign: 0 });
  }
  for (const p of candidates) {
    const found = replayOf(p);
    if (!found) continue;
    demote(p, 'foreign-hunks', { ...(renamed.has(p) ? { pair: renamed.get(p) } : {}), ...found });
    if (renamed.has(p)) demote(renamed.get(p), 'rename-split', { pair: p });
  }
  // A git mv pair goes in together or not at all, whatever git status shows
  // (a heavily edited move reads as a deletion and a new file, not R): a mine
  // side whose dirty partner isn't mine (contested, or foreign once its own
  // evidence was taken back) is contested too.
  const pairs = [...moves].filter(([dst, m]) => isFresh(dst, m.sec)).map(([dst, m]) => [m.src, dst]);
  const isMine = (p) => mine.has(p) || mineNew.has(p);
  for (let again = true; again;) {
    again = false;
    for (const [src, dst] of pairs) {
      for (const [p, other] of [[src, dst], [dst, src]]) {
        if (isMine(p) && listed.has(other) && !isMine(other)) { demote(p, 'rename-split', { pair: other }); again = true; }
      }
    }
  }

  // Each path lands in one list, the most cautious one.
  for (const p of contested.keys()) { mine.delete(p); mineNew.delete(p); foreign.delete(p); peerStaged.delete(p); }
  for (const p of foreign) { mine.delete(p); mineNew.delete(p); }

  // This session's work gone from a path git status lists nowhere: its git
  // rm or git mv undone (the file is back at HEAD's bytes); a new file it
  // created or added, gone from disk and the index (a peer's stash -u or
  // clean) unless its own last call there was a rm, or the file is ignored
  // (a temp/ file step 4 deleted); or its edits to a clean file (their
  // replay leaves text HEAD doesn't hold). A false alarm only stops step 9.
  const created = (p) => fresh(added, p) || (content.get(p) || []).some((op) => op.kind === 'create' && isFresh(p, op.sec));
  const newGone = unlisted.filter((p) => heads.get(p) === null && diskOf(p) === null && created(p) && last.get(p) !== 'removed');
  const ignored = ignoredOf(top, newGone);
  const vanished = [];
  for (const p of unlisted) {
    const head = heads.get(p);
    const disk = diskOf(p);
    const atHead = Buffer.isBuffer(head) && Buffer.isBuffer(disk) && head.equals(disk);
    if (deletedByUs(p) && atHead) vanished.push({ path: p, reason: 'git rm or git mv undone' });
    else if (newGone.includes(p) && !ignored.has(p)) vanished.push({ path: p, reason: 'new file gone' });
    else if (atHead && opsOf(p).length && vanishedFrom(head, opsOf(p))) vanished.push({ path: p, reason: 'edits gone' });
  }
  if (vanished.length) {
    warnings.push(`this session's uncommitted work on ${vanished.length} path(s) git status shows clean is gone (a stash, a checkout, a clean or a discard): ${vanished.map((v) => `${v.path} (${v.reason})`).join(', ')}. Check git stash list`);
  }

  // temp/: a file is this session's when this session created or read it and
  // nobody has changed it since (its mtime is no later than that call's
  // result). Temp files are git-ignored, so commits and revocations don't
  // touch this evidence.
  const tempMine = [];
  const tempKeep = [];
  const keepWhy = new Map();
  const limits = new Map();
  if (tempDir) {
    const listedTemp = listTempFiles(tempDir);
    if (listedTemp === null) warnings.push(`the temp dir ${tempDir} is a link or junction: not listed, and nothing in it counts as this session's`);
    for (const f of listedTemp || []) {
      const lastTouch = f.link ? undefined : ev.temp.get(canonAbs(f.full));
      let why = null;
      if (f.link) why = 'not proven this session\'s (a link)';
      else if (lastTouch === undefined) why = 'not proven this session\'s';
      else if (lastTouch === null || Math.floor(f.changedMs) > lastTouch) why = 'changed since this session last touched it';
      if (why) { tempKeep.push(f.rel); keepWhy.set(f.rel, why); } else { tempMine.push(f.rel); limits.set(f.rel, lastTouch); }
    }
  }

  // Briggsy's yes in step 3 is bound to these bytes: commit-mine refuses a
  // path whose sha1 has moved since.
  const shaOf = (p) => {
    const d = diskOf(p);
    return Buffer.isBuffer(d) ? sha1(d) : null;
  };
  for (const entry of contested.values()) entry.sha = shaOf(entry.path);
  const symref = (ref) => {
    const r = runGit(['-C', top, 'symbolic-ref', '-q', '--short', ref]);
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  };
  const origin = symref('refs/remotes/origin/HEAD');
  const sorted = (s) => [...s].sort();
  const lists = {
    mine: sorted(mine),
    mineNew: sorted(mineNew),
    vanished,
    contested: [...contested.values()].sort(byPath),
    tempMine: tempMine.sort(),
    foreign: sorted(foreign),
    peerStaged: sorted(peerStaged),
    tempKeep: tempKeep.sort(),
  };
  const ours = new Set([...lists.mine, ...lists.mineNew]);
  // Small fields first, the long lists last: the Bash tool cuts long output.
  const out = {
    ok: true,
    session: sessionId,
    repo: top,
    head: headSha, // the commit step 6 checks a vanished path against
    branch: symref('HEAD'), // null on a detached HEAD
    defaultBranch: origin ? origin.replace(/^origin\//, '') : null,
    transcripts: files.length,
    tempDir: tempDir ? slashify(path.resolve(tempDir)) : null,
    warnings,
    counts: Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.length])),
    mine: lists.mine,
    mineNew: lists.mineNew,
    deleted: lists.mine.filter((p) => deletions.has(p)),
    pairs: [...new Map([...renamed, ...pairs.map(([src, dst]) => [dst, src])])]
      .filter(([dst, src]) => ours.has(dst) && ours.has(src)).map(([dst, src]) => [src, dst]).sort(),
    vanished: lists.vanished,
    contested: lists.contested,
    tempMine: lists.tempMine,
    sha: Object.fromEntries([...ours].sort().map((p) => [p, shaOf(p)])),
    foreign: lists.foreign,
    peerStaged: lists.peerStaged,
    tempKeep: lists.tempKeep,
  };
  return { out, keepWhy, limits };
}

export async function classify(opts) {
  return (await sortAll(opts)).out;
}

// ---------------------------------------------------------------------------
// Temp deletion
// ---------------------------------------------------------------------------

// Unlink each entry (temp-relative, '/'-separated) only if, at this moment,
// it is a regular file, not a link, not a *.lock, unchanged since this
// session's last call on it (`limits`: rel -> ms), and its real path stays
// inside the temp dir. A directory is never deleted.
export function removeTempFiles(root, rels, limits) {
  const realRoot = slashify(fs.realpathSync.native(root));
  const deleted = [];
  const skipped = [];
  for (const rel of rels) {
    const full = path.join(root, ...rel.split('/'));
    if (/\.lock$/i.test(rel)) { skipped.push({ path: rel, reason: 'a lock file' }); continue; }
    let st;
    try { st = fs.lstatSync(full); } catch (e) { skipped.push({ path: rel, reason: `gone (${e.code || e.message})` }); continue; }
    if (st.isSymbolicLink()) { skipped.push({ path: rel, reason: 'a link' }); continue; }
    if (!st.isFile()) { skipped.push({ path: rel, reason: 'not a regular file' }); continue; }
    const limit = limits.get(rel);
    if (typeof limit !== 'number' || Math.floor(changedAt(st)) > limit) {
      skipped.push({ path: rel, reason: 'changed since this session last touched it' });
      continue;
    }
    let real;
    try { real = slashify(fs.realpathSync.native(full)); } catch (e) { skipped.push({ path: rel, reason: `unresolvable (${e.code || e.message})` }); continue; }
    if (!real.startsWith(realRoot + '/')) { skipped.push({ path: rel, reason: `resolves outside the temp dir, to ${real}` }); continue; }
    try {
      fs.unlinkSync(full);
      deleted.push(rel);
    } catch (e) {
      skipped.push({ path: rel, reason: `unlink failed (${e.code || e.message})` });
    }
  }
  return { deleted, skipped };
}

// This session's own folder, as peers.mjs reads its registry entry
// (CLAUDE_PID's, else the one live entry carrying our session id, its start
// time checked). A read can catch the entry mid-rewrite, so one miss is
// retried; null when the registry still can't say.
function sessionHome(sessionId) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const entry = selfEntry({ selfSession: sessionId });
    if (entry && typeof entry.cwd === 'string' && entry.cwd) return entry.cwd;
    if (attempt === 1) sleepMs(200);
  }
  return null;
}

export async function deleteTemp({ sessionId, projectsDir, tempDir, cwd = process.cwd() }) {
  const root = path.resolve(tempDir);
  const want = path.join(path.resolve(cwd), 'temp');
  if ((WIN ? root.toLowerCase() : root) !== (WIN ? want.toLowerCase() : want)) {
    throw new Error(`--temp-dir must be ${want}, the temp folder right under where this runs: refused, nothing deleted`);
  }
  // Another project's temp/ may hold its own session's drops that this
  // session merely read: only this session's own folder's temp/ is touched,
  // and a registry that can't name that folder deletes nothing.
  const home = sessionHome(sessionId);
  if (home === null) {
    throw new Error('--delete-temp can\'t find this session\'s own folder in the session registry: refused, nothing deleted');
  }
  if (canonAbs(home) !== canonAbs(cwd)) {
    throw new Error(`--delete-temp runs only from this session's own folder, ${home}, not ${path.resolve(cwd)}: refused, nothing deleted`);
  }
  let st = null;
  try { st = fs.lstatSync(root); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (st && st.isSymbolicLink()) throw new Error(`the temp dir ${root} is a link or junction: refused, nothing deleted`);
  if (st && !st.isDirectory()) throw new Error(`the temp dir ${root} is not a folder: refused, nothing deleted`);
  const { out, keepWhy, limits } = await sortAll({ sessionId, repo: cwd, projectsDir, tempDir: root });
  const result = {
    tempDir: out.tempDir,
    deleted: [],
    kept: out.tempKeep.map((p) => ({ path: p, reason: keepWhy.get(p) })),
    skipped: [],
    warnings: out.warnings,
  };
  if (!st) { result.warnings.push(`no temp dir at ${root}: nothing to delete`); return result; }
  if (!out.tempMine.length) return result;

  // A tracked or committable file is never temp, whatever folder it sits in:
  // only git-ignored files go.
  const realRoot = slashify(fs.realpathSync.native(root));
  const keyOf = new Map(out.tempMine.map((rel) => [rel, repoRelative(`${realRoot}/${rel}`, out.repo)]));
  const ci = runGit(['-C', out.repo, 'check-ignore', '-z', '--stdin'], {
    input: [...keyOf.values()].filter(Boolean).map((k) => k + '\0').join(''),
  });
  if (ci.error || (ci.status !== 0 && ci.status !== 1)) {
    throw new Error(`git check-ignore failed, nothing deleted: ${(ci.stderr || String(ci.error)).trim()}`);
  }
  const ignored = new Set(ci.stdout.split('\0').filter(Boolean));
  const go = [];
  for (const [rel, key] of keyOf) {
    if (key && ignored.has(key)) go.push(rel);
    else result.skipped.push({ path: rel, reason: 'not ignored by git' });
  }
  const done = removeTempFiles(root, go, limits);
  result.deleted = done.deleted;
  result.skipped = [...result.skipped, ...done.skipped].sort(byPath);
  return result;
}

// Write through a temp file in the same folder, then rename over the target.
// A virus scanner or indexer can hold the target for a moment (EPERM,
// EBUSY): the rename is retried 3 times, 100 ms apart. `rename` is
// fs.renameSync, replaceable in tests.
export function writeAtomic(file, text, rename = fs.renameSync) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, text);
    for (let attempt = 1; ; attempt++) {
      try {
        rename(tmp, file);
        break;
      } catch (e) {
        if (attempt > 3 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
        sleepMs(100);
      }
    }
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

// What a run with --out prints: the file it wrote, the size of each list, and
// the warnings. The lists themselves are read from the file, where no output
// cut can hide them.
export function outSummary(file, out) {
  const counts = Object.entries(out.counts).map(([k, v]) => `${k} ${v}`).join(', ');
  return [`wrote ${file}: ${counts}`, ...out.warnings.map((w) => `warning: ${w}`)].join('\n') + '\n';
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2), { known: ['session', 'repo', 'temp-dir', 'out'], flags: ['delete-temp'] });
    const outFile = args.out ? path.resolve(args.out) : null;
    // A stale file from an earlier run must never outlive a failed one.
    if (outFile) fs.rmSync(outFile, { force: true });
    const sessionId = args.session || process.env.CLAUDE_CODE_SESSION_ID || '';
    if (!isSafeId(sessionId)) throw new Error('no usable session id: pass --session or set CLAUDE_CODE_SESSION_ID');
    const projectsDir = process.env.SQUEAKY_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects');
    const repo = args.repo ? path.resolve(args.repo) : process.cwd();
    const tempDir = args['temp-dir'] ? path.resolve(args['temp-dir']) : null;
    if (args['delete-temp']) {
      if (!tempDir) throw new Error('--delete-temp needs --temp-dir temp');
      if (outFile || args.repo) throw new Error('--delete-temp runs from the project folder and takes neither --out nor --repo');
      const res = await deleteTemp({ sessionId, projectsDir, tempDir });
      process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      return;
    }
    const out = await classify({ sessionId, repo, projectsDir, tempDir });
    const text = JSON.stringify(out, null, 2) + '\n';
    if (outFile) {
      writeAtomic(outFile, text);
      process.stdout.write(outSummary(slashify(outFile), out));
    } else process.stdout.write(text);
  } catch (e) {
    process.stderr.write(`mine-paths: ${e && e.message ? e.message : e}\n`);
    process.exitCode = 2;
  }
}

if (isMain(import.meta.url)) main();
