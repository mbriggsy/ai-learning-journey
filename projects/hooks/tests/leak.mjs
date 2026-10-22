// leak.mjs: the leak scan for the public folders the flow publishes into.
//
// projects/hooks and four skill folders hold code, fixtures and insight files
// that later units write, and the monorepo is public. A real session id, a
// path under a Windows user profile, or a field copied out of a transcript
// must never land there. Hooks see all three (session_id, transcript_path and
// the transcript itself), so a captured payload pasted into a fixture is the
// failure this guards against.
//
// It scans what git would commit: tracked files plus untracked ones that
// aren't ignored (`git ls-files -co --exclude-standard`), names as well as
// bodies. A file it can't read as text fails rather than passing unread:
// UTF-16 is decoded, a symlink is read as the link text git stores, and any
// other binary fails unless its extension is on the allowlist. Every pattern
// is assembled from pieces, so this file never matches itself.

import { spawnSync } from 'node:child_process';
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
// session_01… (a Remote Control session).
const API_ID_PREFIXES = ['ms' + 'g', 're' + 'q', 'tool' + 'u', 'sess' + 'ion'];

// The uuid rule's edges are hex lookarounds, not \b: `_` and letters are word
// characters, so \b never fires in run_<uuid> or run<uuid>Z. (One glued to 0-9
// or a-f reads as a longer hex run, not a uuid.) The last
// user-profile-path rule is the slug the CLI names a project folder by
// (~/.claude/projects/<slug>, %TEMP%/claude/<slug>): the profile path with its
// drive colon and each separator turned into a dash.
export const RULES = [
  { id: 'uuid', re: new RegExp(`(?<![0-9a-f])${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}(?![0-9a-f])`, 'i') },
  { id: 'user-profile-path', re: new RegExp('[A-Za-z]:' + '[\\\\/]+' + 'Users' + '[\\\\/]', 'i') },
  { id: 'user-profile-path', re: new RegExp('/[a-z]/' + 'Users' + '/', 'i') },
  { id: 'user-profile-path', re: new RegExp('[A-Za-z]-' + '-Users' + '-', 'i') },
  { id: 'transcript-field', re: new RegExp(`"(?:${TRANSCRIPT_KEYS.join('|')})"\\s*:`) },
  { id: 'api-id', re: new RegExp(`\\b(?:${API_ID_PREFIXES.join('|')})_01[A-Za-z0-9]{20,}`) },
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

// The files git would commit under each scope folder, relative to `repo`.
export function listFiles(repo, scope = SCOPE) {
  const r = spawnSync('git', ['-C', repo, 'ls-files', '-z', '-co', '--exclude-standard', '--', ...scope], {
    encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true,
  });
  if (r.status !== 0) throw new Error(`git ls-files failed: ${r.stderr}`);
  return r.stdout.split('\0').filter(Boolean);
}

// Binaries git commits that no rule could read: images, fonts, PDFs, archives.
// Matched case-blind (a camera writes .JPG).
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.pdf', '.zip']);

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

function hitsIn(rel, text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const { id, re } of RULES) {
      if (re.test(line)) hits.push({ file: rel, line: i + 1, rule: id });
    }
  });
  return hits;
}

// git commits a path as surely as a body, and Claude Code names a transcript
// by its session uuid and a project folder by the profile slug. The whole path
// is tested for a rule that spans a separator, each segment for one anchored
// to a name's edges; one hit per rule, at line 0.
function nameHits(rel) {
  const names = [rel, ...rel.split('/')];
  return RULES.filter(({ re }) => names.some((n) => re.test(n))).map(({ id }) => ({ file: rel, line: 0, rule: id }));
}

// {roots: [{dir, exists}], files, binary: [file], hits: [{file, line, rule}]}
// `binary` lists the allowlisted binaries, whose bodies are not scanned (their
// names are). A path a rule matches is a hit at line 0 under that rule. Any
// other file with a NUL that isn't UTF-16 text is a hit: rule 'binary', line 0.
export function scan(repo, scope = SCOPE) {
  const roots = scope.map((dir) => ({ dir, exists: fs.existsSync(path.join(repo, dir)) }));
  const files = listFiles(repo, scope);
  const hits = [];
  const binary = [];
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
      hits.push(...hitsIn(rel, fs.readlinkSync(full)));
      continue;
    }
    const buf = fs.readFileSync(full);
    // A NUL anywhere, not just in git's 8000-byte head, makes a binary unless
    // the file is UTF-16 text: UTF-16 starting past that head would otherwise
    // read as clean UTF-8.
    const text = utf16(buf) ?? (buf.includes(0) ? null : buf.toString('utf8'));
    if (text !== null) hits.push(...hitsIn(rel, text));
    else if (BINARY_EXTENSIONS.has(path.extname(rel).toLowerCase())) binary.push(rel);
    else hits.push({ file: rel, line: 0, rule: 'binary' });
  }
  return { roots, files: files.length, binary, hits };
}
