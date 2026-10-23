// leak.mjs: the leak scan for the public folders the flow publishes into.
//
// projects/hooks and four skill folders hold code, fixtures and insight
// files that later units write, playbook/ holds our-setup's docs and its
// insight files, and the monorepo is public. A real session id, a path under
// a Windows user profile, or a field copied out of a transcript must never
// land there. Hooks see all three (session_id, transcript_path and the
// transcript itself), so a captured payload pasted into a fixture is the
// failure this guards against.
//
// It scans what git would commit: tracked files plus untracked ones that
// aren't ignored (`git ls-files -co --exclude-standard`), names as well as
// bodies. A file it can't read as text fails rather than passing unread:
// UTF-16 is decoded (and read as UTF-8 with NULs dropped, for UTF-8 inside
// it), a symlink is read as the link text git stores, and every binary fails
// as 'binary', whatever its kind. A binary is what git's own sniff calls one:
// a file holding a NUL byte (git looks in the first 8000 bytes; this looks in
// all of them), unless it decodes as UTF-16 text. No kind passes on its
// extension, because no rule can read what a binary holds: a font stores its
// names as UTF-16, which a WOFF or WOFF2 also compresses (table by table, or
// in one Brotli stream); a PDF's streams and a zip's bodies are compressed;
// an image can carry text in a compressed zTXt chunk or as UTF-16 in its
// EXIF. A binary that truly has to live in the scope passes only through
// REVIEWED_BINARIES (below, empty): an entry for its path, pinned to the
// sha256 of the bytes a person read.
// Encoded content is out of scope. Base64, or a short compressed stream that
// happens to hold no NUL, reads as text (lossy UTF-8) in which no rule finds
// anything, so it passes: this guards against a captured payload pasted in
// by accident, not a deliberate encoding. A strict UTF-8 read, failing every
// file that isn't valid UTF-8, would catch that compressed stream but never
// base64, and it would fail any cp1252 text a peer commits into the scope:
// every push carrying that commit, Back Nine's included, would be refused
// until the commit was rewritten.
// Every pattern is assembled from pieces, so this file never matches itself.
//
// It also scans the index (A7, U3): a plain `git commit` records the staged
// blob, not the file on disk, so a leak staged and then fixed on disk without
// being staged again would pass a worktree-only scan and still be committed.
// Every path staged under the scope (the index differs from HEAD, or from the
// empty tree before the first commit) is read from the object store and
// scanned with the same rules. Its hits carry the file as `staged:<path>`; a
// worktree hit keeps the bare path. A staged blob byte-identical to the file
// on disk is skipped, since the worktree pass already reported whatever it
// holds. Names need no second pass: ls-files lists every index path already.
//
// tools/pre-push-leak.mjs (D8) scans the blobs of the commits being pushed
// with these same rules and this scope, through nameHits, scanBlob,
// readBlobs and git, so the rules live here alone. It reads git's ref lines
// with readFdSync, which is here so a test can drive it with a fake read.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GIT_LOCATION_VARS } from '../probes/lib.mjs';

// deepen-verify doesn't exist until U11 creates it. A missing folder is
// reported, never failed: the scan covers it from the day it appears.
export const SCOPE = [
  'projects/hooks',
  'projects/skills/ultramode-code-review',
  'projects/skills/deepen-verify',
  'projects/skills/squeaky-clean',
  'projects/skills/distill-and-brief',
  'playbook',
];

const hex = (n) => `[0-9a-f]{${n}}`;

// Keys only a transcript record carries (checked against a 2.1.306
// transcript). A hook payload carries session_id, transcript_path and cwd
// instead, so synthetic hook fixtures never trip these. Matched in JSON form
// ("key":), the shape a pasted transcript line has; a synthetic JS record
// built with bare keys stays legal.
const TRANSCRIPT_KEYS = [
  'parent' + 'Uuid', 'leaf' + 'Uuid', 'is' + 'Sidechain', 'user' + 'Type',
  'request' + 'Id', 'prompt' + 'Id', 'sourceToolAssistant' + 'UUID',
  'ownerAccount' + 'Uuid', 'ownerOrganization' + 'Uuid', 'bridge' + 'SessionId',
];

// Ids the API and the claude.ai bridge issue: msg_01…, req_01…, toolu_01…,
// session_01… (a Remote Control session). The rule takes no left edge: the
// API glues a word to some of these (a server tool's use id is the toolu
// form with "srv" in front), and \b never fires between two word characters.
const API_ID_PREFIXES = ['ms' + 'g', 're' + 'q', 'tool' + 'u', 'sess' + 'ion'];

// A path separator as it appears in text: a slash or a backslash, any number
// of them (JSON doubles a backslash), or percent-encoded (%2F, %5C).
const SEP = '(?:[\\\\/]|%2F|%5C)';

// The uuid rule's edges are hex lookarounds, not \b: `_` and letters are word
// characters, so \b never fires in run_<uuid> or run<uuid>Z. (One glued to 0-9
// or a-f reads as a longer hex run, not a uuid.) The first user-profile-path
// rule reads the drive colon plain or percent-encoded (%3A), the form a file
// URI written by an editor carries, and the separators in any spelling SEP
// names. The last one is the slug the CLI names a project folder by
// (~/.claude/projects/<slug>, %TEMP%/claude/<slug>): the profile path with its
// drive colon and each separator turned into a dash.
export const RULES = [
  { id: 'uuid', re: new RegExp(`(?<![0-9a-f])${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}(?![0-9a-f])`, 'i') },
  { id: 'user-profile-path', re: new RegExp('[A-Za-z]' + '(?::|%3A)' + SEP + '+' + 'Users' + SEP, 'i') },
  { id: 'user-profile-path', re: new RegExp('/[a-z]/' + 'Users' + '/', 'i') },
  { id: 'user-profile-path', re: new RegExp('[A-Za-z]-' + '-Users' + '-', 'i') },
  { id: 'transcript-field', re: new RegExp(`"(?:${TRANSCRIPT_KEYS.join('|')})"\\s*:`) },
  { id: 'api-id', re: new RegExp(`(?:${API_ID_PREFIXES.join('|')})_01[A-Za-z0-9]{20,}`) },
];

// lib's location variables are dropped so git lists the repo it is pointed at,
// never one an outer git hook names, and reads the scope folders as plain
// paths. Case-blind, as Windows reads environment names: a spawned child given
// Git_Dir sees GIT_DIR. GIT_OPTIONAL_LOCKS=0, in one spelling, so a scan never
// takes the index lock a live session may hold. Exported for the test's own
// git calls, which would otherwise init and stage into that outer repo.
export function gitEnv() {
  const drop = new Set([...GIT_LOCATION_VARS, 'GIT_OPTIONAL_LOCKS']);
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!drop.has(k.toUpperCase())) env[k] = v;
  return { ...env, GIT_OPTIONAL_LOCKS: '0' };
}

// spawnSync keeps a child's whole output in memory and kills it past
// maxBuffer (1 MB by default). One cat-file batch can carry every blob of a
// large push, so the ceiling is high; past it the call throws, never passes.
const MAX_GIT_OUTPUT = 1 << 30;

// One git call in `repo`, from an argv array (KTD 11). Text output unless
// `binary`; any failure throws with git's own message, so a scan that could
// not read something fails instead of passing it. Exported for
// tools/pre-push-leak.mjs, whose git calls need the same environment. The
// input goes in as bytes: spawnSync would otherwise encode a string input
// with the output encoding, which 'buffer' is not.
export function git(repo, args, { input, binary = false } = {}) {
  const r = spawnSync('git', ['-C', repo, ...args], {
    input: input === undefined ? undefined : Buffer.from(input, 'utf8'),
    env: gitEnv(), shell: false, windowsHide: true,
    encoding: binary ? 'buffer' : 'utf8', maxBuffer: MAX_GIT_OUTPUT,
  });
  if (r.error) throw new Error(`git ${args[0]}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`git ${args[0]} failed (exit ${r.status}): ${String(r.stderr).trim()}`);
  return r.stdout;
}

// The files git would commit under each scope folder, relative to `repo`,
// each once: during a merge conflict ls-files names an unmerged path once per
// stage (measured: three times), which would scan and report it three times.
export function listFiles(repo, scope = SCOPE) {
  return [...new Set(git(repo, ['ls-files', '-z', '-co', '--exclude-standard', '--', ...scope]).split('\0').filter(Boolean))];
}

// The binaries a person has read and cleared, each by its path (as git
// prints it, from the repo's top) and the sha256 of the exact bytes read:
// { 'projects/hooks/assets/logo.png': '<64 hex digits>' }. Empty, and kept
// so until a binary truly has to live in the scope (none does: checked
// 2026-10-22, U3 review round 2). An earlier version let images and fonts
// through on their extension, reading them as latin1, which can't see a
// compressed or UTF-16 name; that list is gone. The hash makes each entry
// cover one version of one file: a changed byte, or the same bytes at
// another path, fails as 'binary' again, so a new version is a new review.
// An entry spares only the body: the path is still checked by every rule.
// tests/leak.test.mjs pins this empty, so an entry is a change to both files.
export const REVIEWED_BINARIES = Object.freeze({});

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// How much of a BOM-less file the NUL-interleave check samples: the head git's
// own binary sniff reads.
const SNIFF = 8000;

// The file as UTF-16 text, or null. A BOM names the byte order; without one,
// NUL-interleaved ASCII does (a zero high byte in most pairs means LE, a zero
// low byte BE). Windows PowerShell 5.1's `>` and Out-File write UTF-16LE with a
// BOM. The decode must then read as text, with no NUL and no lone surrogate,
// so a binary that happens to open FF FE still fails as a binary.
function utf16(buf) {
  let order = null;
  if (buf[0] === 0xff && buf[1] === 0xfe) order = 'le';
  else if (buf[0] === 0xfe && buf[1] === 0xff) order = 'be';
  else {
    const n = Math.min(buf.length, SNIFF) & ~1;
    let le = 0;
    let be = 0;
    for (let i = 0; i < n; i += 2) {
      if (buf[i + 1] === 0 && buf[i] > 0 && buf[i] < 0x80) le++;
      else if (buf[i] === 0 && buf[i + 1] > 0 && buf[i + 1] < 0x80) be++;
    }
    if (le > n / 4) order = 'le';
    else if (be > n / 4) order = 'be';
  }
  if (!order || buf.length % 2) return null;
  try {
    // The decoder drops a leading LE BOM; swap16 turns a BE one into it.
    const text = new TextDecoder('utf-16le', { fatal: true }).decode(order === 'be' ? Buffer.from(buf).swap16() : buf);
    return text.includes('\0') ? null : text;
  } catch {
    return null;
  }
}

// The bytes with every NUL taken out, read as lossy UTF-8. A byte that
// starts no valid sequence reads as U+FFFD and never swallows the ASCII byte
// after it (measured on node 24.13.1), so every non-NUL ASCII byte of the
// file reads as itself, in order.
function withoutNuls(buf) {
  const kept = Buffer.allocUnsafe(buf.length);
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] !== 0) kept[n++] = buf[i];
  return kept.toString('utf8', 0, n);
}

// Every hit of `rules` in `text`, one per rule per line, with `file` as the
// label.
function hitsIn(file, text, rules = RULES) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const { id, re } of rules) {
      if (re.test(line)) hits.push({ file, line: i + 1, rule: id });
    }
  });
  return hits;
}

// git commits a path as surely as a body, and Claude Code names a transcript
// by its session uuid and a project folder by the profile slug. The whole path
// is tested for a rule that spans a separator, each segment for one anchored
// to a name's edges; one hit per rule, at line 0.
export function nameHits(rel) {
  const names = [rel, ...rel.split('/')];
  return RULES.filter(({ re }) => names.some((n) => re.test(n))).map(({ id }) => ({ file: rel, line: 0, rule: id }));
}

// A regular file's bytes, from disk or from a git blob: {hits, reviewed}.
// Text (UTF-8, or UTF-16 decoded) is read under every rule, and UTF-16 text
// is read again as UTF-8 with its NUL bytes dropped (below). A binary, any
// file with a NUL that isn't UTF-16 text, whatever its extension, is a hit:
// rule 'binary', line 0. The one exception is a binary whose path `rel` (the
// real path, never the label) has an entry in `reviewed` that its bytes'
// sha256 matches: no hit, and `reviewed` is true. `label` names the file in
// each hit (`staged:<rel>` for an index blob). `reviewed` is
// REVIEWED_BINARIES unless a test passes its own.
export function scanBlob(rel, buf, label = rel, reviewed = REVIEWED_BINARIES) {
  const wide = utf16(buf);
  if (wide !== null) {
    // UTF-8 written into a UTF-16 file (a Git Bash `>>` or a node append onto
    // a PowerShell 5.1 capture) reads as CJK characters in the UTF-16 view,
    // and a part of even length decodes with no error, so a uuid in it passed
    // unread (measured 2026-10-22: with a BOM or without, either byte order;
    // an odd total already fails as a binary). A UTF-8 part of odd length
    // also shifts the UTF-16 text after it by one byte; a second odd part
    // makes the total even again, and the shifted text then decodes as CJK
    // too (U3 review round 4). So the second view reads every byte but the
    // NULs, as UTF-8: a UTF-8 part reads as itself, and the ASCII of a UTF-16
    // part, in step or shifted, reads as plain ASCII, since each such
    // character is its byte and a NUL. (Round 3 kept the NULs, which split
    // every UTF-16 character from the next, so that view saw the UTF-8 parts
    // only.) The parts join as the text reads: a uuid glued to a UTF-16 hex
    // digit is a longer hex run here, as it is in a file of one encoding. A
    // clean UTF-16 file gains no hit unless the bytes of its other characters
    // spell one (a character holding a NUL byte reads as its other byte):
    // improbable, and a named hit, never a passed leak. A hit both views find
    // on one line is listed once.
    const hits = hitsIn(label, wide);
    for (const h of hitsIn(label, withoutNuls(buf))) {
      if (!hits.some((k) => k.line === h.line && k.rule === h.rule)) hits.push(h);
    }
    return { hits, reviewed: false };
  }
  // A NUL anywhere, not just in git's 8000-byte head, makes a binary unless
  // the file is UTF-16 text: UTF-16 starting past that head would otherwise
  // read as clean UTF-8.
  if (!buf.includes(0)) return { hits: hitsIn(label, buf.toString('utf8')), reviewed: false };
  // Object.hasOwn: a path named like an Object.prototype key (constructor,
  // __proto__) is no entry.
  if (Object.hasOwn(reviewed, rel) && reviewed[rel] === sha256(buf)) return { hits: [], reviewed: true };
  return { hits: [{ file: label, line: 0, rule: 'binary' }], reviewed: false };
}

// The mode git gives a submodule entry (a gitlink): a commit id in another
// repo, with no blob here to read. A symlink (mode 120000) needs no mode of
// its own: its blob is the link text, which scanBlob reads as text, and a
// crafted one holding a NUL fails as a binary.
export const GITLINK_MODE = '160000';

// Blob bytes by object id, read in one `git cat-file --batch` call: a Map
// from each id to its Buffer. An id git doesn't have, or one that names
// anything but a blob, throws. Only the batch header is ever quoted in an
// error, never a body.
export function readBlobs(repo, ids) {
  const want = [...new Set(ids)];
  const blobs = new Map();
  if (want.length === 0) return blobs;
  const out = git(repo, ['cat-file', '--batch'], { input: `${want.join('\n')}\n`, binary: true });
  let at = 0;
  for (const id of want) {
    const nl = out.indexOf(0x0a, at);
    if (nl < 0) throw new Error(`git cat-file --batch: no answer for ${id}`);
    const header = out.toString('utf8', at, nl);
    const m = /^([0-9a-f]+) (\S+) (\d+)$/.exec(header);
    if (!m || m[1] !== id) throw new Error(`git cat-file --batch: asked for ${id}, got "${header}"`);
    if (m[2] !== 'blob') throw new Error(`git cat-file --batch: ${id} is a ${m[2]}, not a blob`);
    const size = Number(m[3]);
    if (nl + 1 + size > out.length) throw new Error(`git cat-file --batch: ${id} was cut short`);
    blobs.set(id, out.subarray(nl + 1, nl + 1 + size));
    // Each body is followed by one LF.
    at = nl + 1 + size + 1;
  }
  return blobs;
}

// How long readFdSync keeps retrying a non-blocking descriptor that has
// nothing yet (EAGAIN) before it gives up and throws.
const EAGAIN_LIMIT_MS = 30_000;
const EAGAIN_STEP_MS = 10;

// Every byte `fd` gives until its end, as one Buffer: the pre-push gate reads
// git's ref lines from stdin with it. fs.readFileSync is not used because it
// throws away what it has read when a read fails partway; a caller that took
// the failure for "no input" would then see a push with nothing to scan. A
// read of 0 bytes is the end. A thrown EOF (libuv's UV_EOF, which the gate's
// first version caught for a closed, empty stdin on Windows) is the end too,
// keeping what came before it. Measured 2026-10-22 on node 24.13.1, Windows:
// git's pre-push pipe, a node pipe, and an ignored or inherited stdin all end
// with a 0-byte read, never a thrown EOF. EAGAIN (a non-blocking stdin with
// nothing yet) waits and reads again, up to EAGAIN_LIMIT_MS. Any other error
// throws. Whether the bytes are whole is the caller's to judge: the gate
// refuses input that stops partway through a line.
// `readSync` is fs.readSync's signature, replaceable for a test.
export function readFdSync(fd, readSync = fs.readSync) {
  const chunks = [];
  const buf = Buffer.alloc(1 << 16);
  let waited = 0;
  for (;;) {
    let n;
    try {
      n = readSync(fd, buf, 0, buf.length, null);
    } catch (e) {
      if (e?.code === 'EOF') break;
      if (e?.code === 'EAGAIN' && waited < EAGAIN_LIMIT_MS) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, EAGAIN_STEP_MS);
        waited += EAGAIN_STEP_MS;
        continue;
      }
      throw e;
    }
    if (n === 0) break;
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  return Buffer.concat(chunks);
}

// Paths whose index entry differs from HEAD (or, before the first commit,
// from the empty tree) under the scope: [{path, mode, id}], id being the
// staged blob. Plumbing, so no diff.* config reshapes it; no rename pairing,
// so a staged rename is its new path, added. A deletion has no blob to scan,
// and an unmerged path no stage-0 blob (git refuses to commit it until it is
// resolved, and resolving stages the worktree file), so the filter keeps
// additions, modifications and type changes only.
export function stagedEntries(repo, scope = SCOPE) {
  let base;
  try {
    base = git(repo, ['rev-parse', '-q', '--verify', 'HEAD^{tree}']).trim();
  } catch {
    // An unborn branch: everything staged is new. The empty tree's id comes
    // from git itself, so a SHA-256 repo gets its own.
    base = git(repo, ['hash-object', '-t', 'tree', '--stdin'], { input: '' }).trim();
  }
  const out = git(repo, ['diff-index', '--cached', '--raw', '-z', '--no-renames', '--diff-filter=ACMRT', base, '--', ...scope]);
  const parts = out.split('\0');
  const entries = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    // ":<old mode> <new mode> <old id> <new id> <status>", then the path.
    const meta = parts[i].replace(/^:/, '').split(' ');
    if (meta.length < 5) throw new Error(`git diff-index: unreadable entry "${parts[i]}"`);
    entries.push({ path: parts[i + 1], mode: meta[1], id: meta[3] });
  }
  return entries;
}

// {roots: [{dir, exists}], files, staged, reviewed: [file], hits: [{file, line, rule}]}
// `files` counts what git would commit, `staged` the index entries scanned.
// `reviewed` lists the binaries REVIEWED_BINARIES let through, whose bodies
// are not read (their names are, under every rule); empty while it is.
// A path a rule matches is a hit at line 0 under that rule. Any other
// binary, a file with a NUL that isn't UTF-16 text, is a hit: rule 'binary',
// line 0. An index blob's hits and reviewed entry read `staged:<path>`.
// `reviewedBinaries` is REVIEWED_BINARIES unless a test passes its own.
export function scan(repo, scope = SCOPE, reviewedBinaries = REVIEWED_BINARIES) {
  const roots = scope.map((dir) => ({ dir, exists: fs.existsSync(path.join(repo, dir)) }));
  const files = listFiles(repo, scope);
  const hits = [];
  const reviewed = [];
  // The bytes read from disk for each path (a symlink's as its link text), so
  // an identical staged blob is not scanned and reported twice.
  const onDisk = new Map();
  for (const rel of files) {
    // Before the body is read: a binary or a link body never reaches hitsIn,
    // and a file gone from disk keeps its name in the index, and so in a plain
    // commit, until its deletion is staged.
    hits.push(...nameHits(rel));
    const full = path.join(repo, rel);
    let st;
    try {
      st = fs.lstatSync(full);
    } catch (e) {
      // Listed by git but gone from disk (a deletion not yet staged).
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    // git commits a symlink's own text, never its target, so the link is read,
    // not followed: a dangling one is scanned, not skipped as gone.
    if (st.isSymbolicLink()) {
      const link = fs.readlinkSync(full);
      onDisk.set(rel, Buffer.from(link));
      hits.push(...hitsIn(rel, link));
      continue;
    }
    const buf = fs.readFileSync(full);
    onDisk.set(rel, buf);
    const r = scanBlob(rel, buf, rel, reviewedBinaries);
    hits.push(...r.hits);
    if (r.reviewed) reviewed.push(rel);
  }

  const staged = stagedEntries(repo, scope);
  const blobs = readBlobs(repo, staged.filter((e) => e.mode !== GITLINK_MODE).map((e) => e.id));
  for (const e of staged) {
    // A submodule's commit id is all the index holds; its name was checked
    // above, as every index path is.
    if (e.mode === GITLINK_MODE) continue;
    const buf = blobs.get(e.id);
    if (onDisk.get(e.path)?.equals(buf)) continue;
    const label = `staged:${e.path}`;
    const r = scanBlob(e.path, buf, label, reviewedBinaries);
    hits.push(...r.hits);
    if (r.reviewed) reviewed.push(label);
  }
  return { roots, files: files.length, staged: staged.length, reviewed, hits };
}
