// The leak test: nothing git would commit under the flow's public folders may
// carry a real id, a user-profile path or a transcript field, in its name or
// its body, or be a binary: a file holding a NUL (git's own sniff for one)
// that isn't UTF-16 text. See leak.mjs: no rule can read a binary, so every
// one fails, an image or a font as surely as an archive, unless
// REVIEWED_BINARIES, empty, holds its path and the hash of its bytes; encoded
// content with no NUL, such as base64, is out of scope. That
// covers the staged blobs too (A7): what a plain `git commit` records is the
// index, not the disk. The planted cases build every sample at run time, so
// this file stays clean.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GIT_LOCATION_VARS } from '../probes/lib.mjs';
import { REVIEWED_BINARIES, SCOPE, gitEnv, scan, scanBlob } from './leak.mjs';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
// Hits in a fixed order: by file, then line, then rule (one file can hold a
// name hit and a body hit on line 0).
const byFile = (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0));
// A PNG signature and chunk length: a real image's first bytes, NUL included.
const PNG_HEAD = () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('the scope is the five folders the plan names', () => {
  assert.deepEqual(SCOPE, [
    'projects/hooks',
    'projects/skills/ultramode-code-review',
    'projects/skills/deepen-verify',
    'projects/skills/squeaky-clean',
    'projects/skills/distill-and-brief',
  ]);
});

test('the published folders carry no uuid, user-profile path, transcript field, API id or binary', (t) => {
  const out = scan(REPO);
  const hooks = out.roots.find((r) => r.dir === 'projects/hooks');
  assert.ok(hooks.exists, 'projects/hooks is missing: the scan would read as clean with nothing to scan');
  assert.ok(out.files > 0, 'no files listed: an empty scan must never read as clean');
  for (const r of out.roots.filter((x) => !x.exists)) t.diagnostic(`not created yet: ${r.dir}`);
  for (const b of out.reviewed) t.diagnostic(`reviewed binary, body not read: ${b}`);
  if (out.staged) t.diagnostic(`staged entries scanned from the index: ${out.staged}`);
  assert.deepEqual(out.hits, []);
});

// An entry lets a binary's body through unread, so each one is a reviewed
// decision: adding one means changing this pin too, on purpose. Frozen, so
// no code can add one at run time either.
test('REVIEWED_BINARIES is empty and frozen: no binary is let through today', () => {
  assert.deepEqual(Object.keys(REVIEWED_BINARIES), []);
  assert.ok(Object.isFrozen(REVIEWED_BINARIES), 'REVIEWED_BINARIES can be added to at run time');
});

// The mechanism REVIEWED_BINARIES drives, given a map of the test's own.
test("a reviewed binary passes only at its own path with its own bytes; its label doesn't matter, and text at that path is still read", () => {
  const rel = 'projects/hooks/assets/logo.png';
  const bytes = Buffer.concat([PNG_HEAD(), Buffer.from(randomUUID())]);
  const reviewed = { [rel]: sha256(bytes) };
  assert.deepEqual(scanBlob(rel, bytes, rel, reviewed), { hits: [], reviewed: true });
  // An index blob is labeled staged:<path>; the lookup goes by the real path.
  assert.deepEqual(scanBlob(rel, bytes, `staged:${rel}`, reviewed), { hits: [], reviewed: true });
  const fails = (r, b, label = r) => assert.deepEqual(scanBlob(r, b, label, reviewed), { hits: [{ file: label, line: 0, rule: 'binary' }], reviewed: false });
  // One byte changed: a new version, so a new review.
  const changed = Buffer.from(bytes);
  changed[changed.length - 1] ^= 1;
  fails(rel, changed);
  fails(rel, changed, `staged:${rel}`);
  // The same bytes anywhere else.
  fails('projects/hooks/assets/other.png', bytes);
  fails('projects/hooks/assets/LOGO.PNG', bytes);
  // An inherited key is no entry.
  fails('constructor', bytes);
  // Without the map (REVIEWED_BINARIES, empty), the same bytes fail.
  assert.deepEqual(scanBlob(rel, bytes), { hits: [{ file: rel, line: 0, rule: 'binary' }], reviewed: false });
  // An entry spares only a binary's body: text at that path, its hash
  // listed, is read under every rule like any other text.
  const text = Buffer.from(`clean\n${randomUUID()}\n`);
  assert.deepEqual(scanBlob(rel, text, rel, { [rel]: sha256(text) }), { hits: [{ file: rel, line: 2, rule: 'uuid' }], reviewed: false });
});

// Mixed case is how Windows hands a child a variable it reads as GIT_DIR; on
// Linux it is merely dropped.
test("gitEnv drops lib's git location variables in any case, and sets GIT_OPTIONAL_LOCKS=0 in one spelling", () => {
  const planted = { GIT_DIR: 'x', Git_Index_File: 'y', git_work_tree: 'z', GIT_LITERAL_PATHSPECS: '1', Git_Optional_Locks: '1', LEAK_KEEP: '1' };
  const saved = Object.fromEntries(Object.keys(planted).map((k) => [k, process.env[k]]));
  Object.assign(process.env, planted);
  try {
    const env = gitEnv();
    const owned = new Set([...GIT_LOCATION_VARS, 'GIT_OPTIONAL_LOCKS']);
    assert.deepEqual(Object.entries(env).filter(([k]) => owned.has(k.toUpperCase())), [['GIT_OPTIONAL_LOCKS', '0']]);
    assert.equal(env.LEAK_KEEP, '1');
  } finally {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

describe('planted leaks', () => {
  let repo;
  const sep = '\\';
  const SAMPLES = {
    uuid: () => randomUUID(),
    'uuid (after an underscore)': () => 'run_' + randomUUID(),
    'uuid (between letters, upper case)': () => 'RUN' + randomUUID().toUpperCase() + 'Z',
    'user-profile-path': () => ['C:', 'Users', 'someone', 'notes.txt'].join(sep),
    'user-profile-path (JSON-escaped)': () => ['C:', 'Users', 'someone'].join(sep + sep),
    'user-profile-path (msys)': () => '/c/' + 'Users' + '/someone/notes.txt',
    'user-profile-path (projects slug)': () => ['C', '', 'Users', 'someone', 'proj'].join('-'),
    // The form an editor writes a file URI in: the drive colon as %3A.
    'user-profile-path (file URI, drive colon percent-encoded)': () => 'file:///c' + '%3A' + '/' + 'Users' + '/someone/notes.txt',
    'user-profile-path (percent-encoded separators)': () => 'C' + '%3A' + '%5C' + 'Users' + '%5Csomeone',
    'transcript-field': () => '{"' + 'parent' + 'Uuid' + '": null}',
    'api-id': () => 'tool' + 'u_01' + 'A'.repeat(22),
    'api-id (bridge session)': () => 'sess' + 'ion_01' + 'B'.repeat(22),
    // A server tool's use id: a word glued in front, where \b never fires.
    'api-id (server tool use)': () => 'srv' + 'tool' + 'u_01' + 'C'.repeat(22),
  };
  const ruleOf = (name) => name.replace(/ \(.*\)$/, '');

  // gitEnv() drops lib's location set in any case, so `init` and `add` land in
  // the temp repo: under an outer git hook, GIT_DIR and GIT_INDEX_FILE would
  // aim them at the live one.
  function git(...args) {
    const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  }
  function put(rel, data) {
    const full = path.join(repo, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
  }

  before(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-leak-'));
    git('init', '-q', '-b', 'main');
  });
  after(() => fs.rmSync(repo, { recursive: true, force: true }));

  for (const [name, make] of Object.entries(SAMPLES)) {
    test(`a planted ${name} fails the scan, in projects/hooks and in a covered skill folder`, () => {
      const slug = name.replace(/\W+/g, '-');
      const inHooks = `projects/hooks/tests/fixtures/${slug}.json`;
      const inSkill = `projects/skills/squeaky-clean/tests/${slug}.mjs`;
      put(inHooks, `{\n  "ok": 1,\n  "x": "${make()}"\n}\n`);
      put(inSkill, `// clean line\nconst x = '${make()}';\n`);
      try {
        const hits = scan(repo).hits.filter((h) => h.file === inHooks || h.file === inSkill);
        assert.deepEqual(hits, [
          { file: inHooks, line: 3, rule: ruleOf(name) },
          { file: inSkill, line: 2, rule: ruleOf(name) },
        ]);
      } finally {
        fs.rmSync(path.join(repo, inHooks));
        fs.rmSync(path.join(repo, inSkill));
      }
    });
  }

  // Windows PowerShell 5.1's `>` and Out-File write UTF-16LE with a BOM; the
  // other three are what other Windows tools and a stripped BOM leave.
  const le = (s) => Buffer.from(s, 'utf16le');
  const ENCODINGS = {
    'UTF-16LE with a BOM': (s) => le('﻿' + s),
    'UTF-16BE with a BOM': (s) => le('﻿' + s).swap16(),
    'UTF-16LE without a BOM': (s) => le(s),
    'UTF-16BE without a BOM': (s) => le(s).swap16(),
  };

  for (const [name, encode] of Object.entries(ENCODINGS)) {
    test(`${name} is decoded and scanned, in projects/hooks and in a covered skill folder`, () => {
      const slug = name.replace(/\W+/g, '-');
      const inHooks = `projects/hooks/tests/fixtures/${slug}.txt`;
      const inSkill = `projects/skills/squeaky-clean/tests/${slug}.txt`;
      // A non-ASCII dash too: the BOM-less check needs most pairs ASCII, not all.
      const capture = () => `clean line — a capture\r\n{"x": "${randomUUID()}"}\r\n${['C:', 'Users', 'someone'].join(sep)}\r\n`;
      put(inHooks, encode(capture()));
      put(inSkill, encode(capture()));
      try {
        const hits = scan(repo).hits.filter((h) => h.file === inHooks || h.file === inSkill);
        assert.deepEqual(hits, [
          { file: inHooks, line: 2, rule: 'uuid' },
          { file: inHooks, line: 3, rule: 'user-profile-path' },
          { file: inSkill, line: 2, rule: 'uuid' },
          { file: inSkill, line: 3, rule: 'user-profile-path' },
        ]);
      } finally {
        fs.rmSync(path.join(repo, inHooks));
        fs.rmSync(path.join(repo, inSkill));
      }
    });
  }

  // A UTF-8 tail appended to a UTF-16 file (a Git Bash `>>` onto a
  // PowerShell 5.1 capture) reads as CJK in the UTF-16 view, and a tail of
  // even length decodes there with no error: only the file's UTF-8 view sees
  // what the tail says. The clean file, its non-ASCII characters included,
  // gains no hit from that view. An odd tail can't decode as UTF-16, so it
  // was already a binary.
  for (const [name, encode] of Object.entries(ENCODINGS)) {
    test(`${name} with a UTF-8 tail appended: a uuid in the tail fails the scan, and the clean file still passes`, () => {
      const rel = 'projects/hooks/tests/fixtures/capture.txt';
      const clean = encode('clean line \u2014 a capture\r\n\u65E5\u672C\u8A9E\u306E\u30C6\u30AD\u30B9\u30C8\r\nanother clean line of the same capture\r\n');
      assert.deepEqual(scanBlob(rel, clean), { hits: [], reviewed: false });
      // The uuid at an even offset in the tail, then at an odd one.
      for (const tail of [`${randomUUID()}\r\n`, `x${randomUUID()}\n`]) {
        assert.deepEqual(scanBlob(rel, Buffer.concat([clean, Buffer.from(tail)])), { hits: [{ file: rel, line: 4, rule: 'uuid' }], reviewed: false }, JSON.stringify(tail));
      }
      assert.deepEqual(scanBlob(rel, Buffer.concat([clean, Buffer.from(`${randomUUID()}\n`)])), { hits: [{ file: rel, line: 0, rule: 'binary' }], reviewed: false });
    });
  }

  // A UTF-8 line of odd length shifts the UTF-16 text after it by one byte,
  // and a second odd line makes the total even again: the shifted line then
  // decodes as CJK, and in the raw bytes its ASCII sits between NULs, so only
  // the UTF-8 view with the NULs dropped reads it (U3 review round 4). The
  // first part is most of the file, so a BOM-less form keeps its byte order.
  for (const [name, encode] of Object.entries(ENCODINGS)) {
    test(`${name} with a UTF-16 line shifted by an odd UTF-8 line: a uuid in it fails the scan, and the clean file still passes`, () => {
      const rel = 'projects/hooks/tests/fixtures/capture.txt';
      const head = encode(`clean line \u2014 a capture\r\n\u65E5\u672C\u8A9E\u306E\u30C6\u30AD\u30B9\u30C8\r\n${'another clean line of the same capture\r\n'.repeat(4)}`);
      // encode('') is the form's BOM alone (nothing without one), which a
      // line further in doesn't carry.
      const later = (s) => encode(s).subarray(encode('').length);
      const odd = Buffer.from('odd tail\n');
      assert.equal(odd.length % 2, 1);
      const file = (line) => Buffer.concat([head, odd, later(line), odd]);
      assert.deepEqual(scanBlob(rel, file('{"x": "clean"}\r\n')), { hits: [], reviewed: false });
      assert.deepEqual(scanBlob(rel, file(`{"x": "${randomUUID()}"}\r\n`)), { hits: [{ file: rel, line: 8, rule: 'uuid' }], reviewed: false });
    });
  }

  // Both views can find one rule on one line: line 1 holds a uuid written in
  // UTF-16, then UTF-16 characters whose bytes spell, in ASCII, another uuid
  // and a profile path (no two ASCII bytes make a surrogate, so they decode).
  // Its uuid hit is listed once; the UTF-8 view's other hits, a second rule
  // on that line and the tail's uuid on line 2, are kept.
  test('a hit the UTF-16 and the UTF-8 view both find on one line is listed once; their other hits are all kept', () => {
    const rel = 'projects/hooks/tests/fixtures/capture.txt';
    const spell = (s) => Buffer.from(s).toString('utf16le');
    const buf = Buffer.concat([
      le(`\uFEFF${randomUUID()} ${spell(randomUUID())} ${spell(['C:', 'Users', 'someone'].join(sep))}\r\n`),
      Buffer.from(`${randomUUID()}\r\n`),
    ]);
    assert.deepEqual(scanBlob(rel, buf), {
      hits: [
        { file: rel, line: 1, rule: 'uuid' },
        { file: rel, line: 1, rule: 'user-profile-path' },
        { file: rel, line: 2, rule: 'uuid' },
      ],
      reviewed: false,
    });
  });

  // Claude Code names a transcript by its session uuid and a project folder by
  // the profile slug, so a scrubbed copy can keep a leaking name. Every text
  // body here is clean: their only hits are names, at line 0. The .png's body
  // is a binary, which fails on its own (rule 'binary', line 0); its name is
  // checked all the same, before the body is looked at.
  test('a uuid-named file and a profile-slug-named folder fail the scan by name, in projects/hooks and in a covered skill folder', () => {
    const profileSlug = ['C', '', 'Users', 'someone', 'proj'].join('-');
    const pngName = `projects/hooks/tests/fixtures/${randomUUID()}.png`;
    const named = {
      [`projects/hooks/tests/fixtures/Stop/${randomUUID()}.json`]: 'uuid',
      [pngName]: 'uuid',
      [`projects/hooks/tests/fixtures/${profileSlug}/capture.json`]: 'user-profile-path',
      [`projects/skills/squeaky-clean/tests/${randomUUID()}.jsonl`]: 'uuid',
      [`projects/skills/squeaky-clean/tests/${profileSlug}/notes.md`]: 'user-profile-path',
    };
    for (const rel of Object.keys(named)) put(rel, rel === pngName ? PNG_HEAD() : '{"ok": 1}\n');
    try {
      const hits = scan(repo).hits.filter((h) => Object.hasOwn(named, h.file));
      assert.deepEqual(hits.sort(byFile), [
        ...Object.entries(named).map(([file, rule]) => ({ file, line: 0, rule })),
        { file: pngName, line: 0, rule: 'binary' },
      ].sort(byFile));
    } finally {
      for (const rel of Object.keys(named)) fs.rmSync(path.join(repo, rel));
    }
  });

  test('a clean file passes; a leak outside the scope and a git-ignored file are not reported', () => {
    put('projects/hooks/README.md', '# Hooks\nsession_id and transcript_path are hook input fields.\n');
    put('projects/the-back-nine/notes.md', `${randomUUID()}\n`);
    put('.gitignore', 'projects/hooks/tests/scratch/\n');
    put('projects/hooks/tests/scratch/capture.json', `${randomUUID()}\n`);
    const out = scan(repo);
    assert.deepEqual(out.hits, []);
    assert.ok(out.files >= 1, 'the clean file was not listed');
  });

  test('a tracked file and an untracked one are both scanned; a tracked file deleted on disk is checked by name only', () => {
    put('projects/skills/distill-and-brief/tracked.md', 'clean\n');
    git('add', '--', 'projects/skills/distill-and-brief/tracked.md');
    put('projects/skills/distill-and-brief/tracked.md', `${randomUUID()}\n`);
    put('projects/skills/ultramode-code-review/new.md', `${randomUUID()}\n`);
    const goneNamed = `projects/hooks/${randomUUID()}.md`;
    for (const rel of ['projects/hooks/gone.md', goneNamed]) {
      put(rel, 'clean\n');
      git('add', '--', rel);
      fs.rmSync(path.join(repo, rel));
    }
    const hits = scan(repo).hits.map((h) => `${h.file}:${h.line}`).sort();
    assert.deepEqual(hits, [`${goneNamed}:0`, 'projects/skills/distill-and-brief/tracked.md:1', 'projects/skills/ultramode-code-review/new.md:1']);
  });

  // No kind of binary passes on its extension: an image or a font fails as
  // surely as an archive. A latin1 read of one (what an earlier version
  // did for images and fonts) can't see a compressed or UTF-16 name, so the
  // body is never read and the only hit is 'binary', at line 0, even where
  // a profile path or an API id sits in the clear.
  test('every binary (a file holding a NUL) fails the scan as binary, whatever its kind: an image or a font as surely as an archive or a PDF', () => {
    const blob = Buffer.concat([PNG_HEAD(), Buffer.from(randomUUID())]);
    // A profile path in a PNG text chunk, an API id in a font's table.
    const pngWithPath = Buffer.concat([PNG_HEAD(), Buffer.from('tEXtComment\0'), Buffer.from(['C:', 'Users', 'someone', 'shot.png'].join(sep))]);
    const fontWithId = Buffer.concat([Buffer.from('wOFF\0\x01\0\0'), Buffer.from('tool' + 'u_01' + 'D'.repeat(22))]);
    // A WOFF2's tables sit in one Brotli stream, so nothing of its names
    // is left to read.
    const woff2 = Buffer.concat([Buffer.from('wOF2\0\x01\0\0'), Buffer.from([0x8b, 0x02, 0x80, 0, 0x1f])]);
    // A zip names its entries in the clear (here a session-uuid transcript)
    // but deflates their bodies; a PDF deflates its streams.
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0, 0x08, 0]), Buffer.from(`${randomUUID()}.jsonl`)]);
    const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n%'), Buffer.from([0xe2, 0xe3, 0, 0x0a]), Buffer.from('1 0 obj << /Filter /FlateDecode >> stream\n')]);
    const files = {
      // Every image and font extension an earlier version let through.
      'projects/hooks/tests/fixtures/logo.png': blob,
      'projects/hooks/tests/fixtures/shot.png': pngWithPath,
      'projects/hooks/tests/fixtures/photo.JPG': blob,
      'projects/hooks/tests/fixtures/photo.jpeg': blob,
      'projects/hooks/tests/fixtures/anim.gif': blob,
      'projects/hooks/tests/fixtures/favicon.ico': blob,
      'projects/hooks/tests/fixtures/pic.webp': blob,
      'projects/skills/squeaky-clean/assets/face.woff': fontWithId,
      'projects/skills/squeaky-clean/assets/ICON.WOFF2': woff2,
      // And the rest.
      'projects/hooks/tests/fixtures/blob.bin': blob,
      'projects/skills/squeaky-clean/tests/captures.gz': blob,
      'projects/hooks/tests/fixtures/run.zip': zip,
      'projects/skills/squeaky-clean/assets/notes.PDF': pdf,
      // Opens with a UTF-16LE BOM but decodes to a NUL: still a binary.
      'projects/hooks/tests/fixtures/bom.bin': Buffer.from([0xff, 0xfe, 0, 0, 0x41, 0]),
      // A NUL past git's 8000-byte head is a binary too, not text read as clean.
      'projects/skills/squeaky-clean/notes.md': Buffer.from('a'.repeat(9000) + '\0\n'),
    };
    const mine = Object.keys(files);
    for (const rel of mine) put(rel, files[rel]);
    try {
      const out = scan(repo);
      assert.deepEqual(out.reviewed, []);
      assert.deepEqual(out.hits.filter((h) => mine.includes(h.file)).sort(byFile), mine.map((file) => ({ file, line: 0, rule: 'binary' })).sort(byFile));
    } finally {
      for (const rel of mine) fs.rmSync(path.join(repo, rel));
    }
  });

  // scan() hands its map to every scanBlob call, the index pass's too: a
  // binary that matches passes, from disk or from the index (labeled
  // staged:), while a version with other bytes fails wherever it sits.
  test('a binary its map lists, path and hash, passes the scan from disk and from the index; a version with other bytes fails', () => {
    const rel = 'projects/hooks/tests/fixtures/reviewed.png';
    const other = 'projects/skills/squeaky-clean/assets/reviewed.png';
    const bytes = Buffer.concat([PNG_HEAD(), Buffer.from('reviewed by a person')]);
    const changed = Buffer.concat([PNG_HEAD(), Buffer.from('changed since')]);
    const map = { [rel]: sha256(bytes), [other]: sha256(bytes) };
    // `rel` sits on disk only, reviewed. `other` is staged reviewed, then
    // changed on disk: the index holds the reviewed version, the disk not.
    put(rel, bytes);
    put(other, bytes);
    git('add', '--', other);
    put(other, changed);
    try {
      const out = scan(repo, SCOPE, map);
      const mine = (f) => [rel, other, `staged:${other}`].includes(f);
      assert.deepEqual(out.reviewed.filter(mine).sort(), [rel, `staged:${other}`].sort());
      assert.deepEqual(out.hits.filter((h) => mine(h.file)), [{ file: other, line: 0, rule: 'binary' }]);
      // Without the map, both fail, on disk and in the index.
      assert.deepEqual(scan(repo).hits.filter((h) => mine(h.file)).sort(byFile), [
        { file: other, line: 0, rule: 'binary' },
        { file: rel, line: 0, rule: 'binary' },
        { file: `staged:${other}`, line: 0, rule: 'binary' },
      ].sort(byFile));
    } finally {
      // -f: the index holds bytes that match neither the disk nor a HEAD.
      git('rm', '-q', '-f', '--cached', '--', other);
      fs.rmSync(path.join(repo, rel));
      fs.rmSync(path.join(repo, other));
    }
  });

  test('a symlink is scanned as its name and its link text, not followed: a dangling link to a profile path fails', (t) => {
    const target = ['C:', 'Users', 'someone', 'notes.txt'].join(sep);
    // The second link is named by a uuid: its name is checked before the
    // link branch returns.
    const links = ['projects/hooks/tests/fixtures/capture.json', `projects/skills/squeaky-clean/tests/${randomUUID()}.json`];
    const made = [];
    try {
      for (const rel of links) {
        fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
        fs.symlinkSync(target, path.join(repo, rel));
        made.push(rel);
      }
      const hits = scan(repo).hits.filter((h) => links.includes(h.file));
      assert.deepEqual(hits.sort(byFile), [
        { file: links[0], line: 1, rule: 'user-profile-path' },
        { file: links[1], line: 0, rule: 'uuid' },
        { file: links[1], line: 1, rule: 'user-profile-path' },
      ]);
    } catch (e) {
      // Windows makes a symlink only under Developer Mode or elevation; the
      // Linux CI runner always can, so the case still gates there.
      if (e.code === 'EPERM' && made.length === 0) return t.skip('this account cannot create a symlink; CI on Linux runs this case');
      throw e;
    } finally {
      for (const rel of made) fs.unlinkSync(path.join(repo, rel));
    }
  });
});

// A7: the index is scanned as well as the disk. Each case gets a fresh repo,
// so what one stages never reaches another. The user's own git config stays
// out (an empty global file, no system file): a template dir, a hooksPath or
// core.autocrlf there would change what these repos hold.
describe('staged blobs (A7)', () => {
  let root;
  let env;
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-leak-staged-'));
    const globalConfig = path.join(root, 'gitconfig');
    fs.writeFileSync(globalConfig, '');
    env = Object.fromEntries(Object.entries(gitEnv()).filter(([k]) => !/^GIT_CONFIG/i.test(k)));
    Object.assign(env, {
      GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Leak Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
      GIT_COMMITTER_NAME: 'Leak Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
    });
  });
  after(() => fs.rmSync(root, { recursive: true, force: true }));

  function git(repo, args, input) {
    const r = spawnSync('git', ['-C', repo, ...args], { input, encoding: 'utf8', env, shell: false, windowsHide: true });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  }
  function fresh() {
    const repo = fs.mkdtempSync(path.join(root, 'r-'));
    git(repo, ['init', '-q', '-b', 'main']);
    return repo;
  }
  function put(repo, rel, data) {
    const full = path.join(repo, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
  }
  const leakJson = () => `{\n  "x": "${randomUUID()}"\n}\n`;

  test('a leak staged and then fixed on disk, not staged again, fails as staged: before the first commit', () => {
    const repo = fresh();
    put(repo, 'projects/hooks/tests/fixtures/a.json', leakJson());
    git(repo, ['add', '--', 'projects/hooks/tests/fixtures/a.json']);
    put(repo, 'projects/hooks/tests/fixtures/a.json', '{\n  "x": "clean"\n}\n');
    const out = scan(repo);
    assert.deepEqual(out.hits, [{ file: 'staged:projects/hooks/tests/fixtures/a.json', line: 2, rule: 'uuid' }]);
    assert.equal(out.staged, 1);
  });

  test('a staged change against HEAD fails as staged in a covered skill folder; a leak staged as it sits on disk is reported once, from the disk', () => {
    const repo = fresh();
    put(repo, 'projects/skills/squeaky-clean/notes.md', 'clean\n');
    put(repo, 'projects/hooks/same.json', '{}\n');
    git(repo, ['add', '--', '.']);
    git(repo, ['commit', '-q', '-m', 'base']);
    put(repo, 'projects/skills/squeaky-clean/notes.md', `clean\n${['C:', 'Users', 'someone'].join('\\')}\n`);
    put(repo, 'projects/hooks/same.json', leakJson());
    git(repo, ['add', '--', '.']);
    put(repo, 'projects/skills/squeaky-clean/notes.md', 'clean\nfixed\n');
    const out = scan(repo);
    assert.deepEqual(out.hits.sort(byFile), [
      { file: 'projects/hooks/same.json', line: 2, rule: 'uuid' },
      { file: 'staged:projects/skills/squeaky-clean/notes.md', line: 2, rule: 'user-profile-path' },
    ]);
    assert.equal(out.staged, 2);
  });

  test('a staged blob gets the same binary and UTF-16 handling as a file on disk: an image fails as a binary, like any other', () => {
    const repo = fresh();
    const png = Buffer.concat([PNG_HEAD(), Buffer.from(randomUUID())]);
    const utf16 = Buffer.from(`\uFEFFclean\r\n{"x": "${randomUUID()}"}\r\n`, 'utf16le');
    const staged = {
      'projects/hooks/tests/fixtures/logo.png': png,
      'projects/hooks/tests/fixtures/blob.bin': Buffer.from([0x41, 0, 0x42, 0x43, 0x44, 0x45, 0x46]),
      'projects/hooks/tests/fixtures/capture.txt': utf16,
    };
    for (const [rel, data] of Object.entries(staged)) put(repo, rel, data);
    git(repo, ['add', '--', '.']);
    // Clean text on disk: only the index holds these bodies now.
    for (const rel of Object.keys(staged)) put(repo, rel, 'clean\n');
    const out = scan(repo);
    assert.deepEqual(out.reviewed, []);
    assert.deepEqual(out.hits.sort(byFile), [
      { file: 'staged:projects/hooks/tests/fixtures/blob.bin', line: 0, rule: 'binary' },
      { file: 'staged:projects/hooks/tests/fixtures/capture.txt', line: 2, rule: 'uuid' },
      { file: 'staged:projects/hooks/tests/fixtures/logo.png', line: 0, rule: 'binary' },
    ]);
  });

  // Staged through update-index, so no filesystem symlink is needed: this
  // case runs on Windows without Developer Mode, unlike the one above.
  test('a staged symlink is scanned as its link text; a staged submodule entry is skipped, not read', () => {
    const repo = fresh();
    put(repo, 'projects/hooks/a.md', 'clean\n');
    git(repo, ['add', '--', '.']);
    git(repo, ['commit', '-q', '-m', 'base']);
    const head = git(repo, ['rev-parse', 'HEAD']);
    const link = git(repo, ['hash-object', '-w', '--stdin'], ['C:', 'Users', 'someone', 'notes.txt'].join('\\'));
    git(repo, ['update-index', '--add', '--cacheinfo', `120000,${link},projects/hooks/link`]);
    git(repo, ['update-index', '--add', '--cacheinfo', `160000,${head},projects/hooks/sub`]);
    const out = scan(repo);
    assert.deepEqual(out.hits, [{ file: 'staged:projects/hooks/link', line: 1, rule: 'user-profile-path' }]);
    assert.equal(out.staged, 2);
  });

  test('a staged deletion and a staged leak outside the scope are not reported', () => {
    const repo = fresh();
    put(repo, 'projects/hooks/gone.md', 'clean\n');
    git(repo, ['add', '--', '.']);
    git(repo, ['commit', '-q', '-m', 'base']);
    git(repo, ['rm', '-q', '--', 'projects/hooks/gone.md']);
    put(repo, 'projects/the-back-nine/notes.md', `${randomUUID()}\n`);
    git(repo, ['add', '--', 'projects/the-back-nine/notes.md']);
    put(repo, 'projects/the-back-nine/notes.md', 'clean\n');
    const out = scan(repo);
    assert.deepEqual(out.hits, []);
    assert.equal(out.staged, 0);
  });

  // An unmerged path has no stage-0 blob to read; the scan must not throw on
  // one (a live merge conflict in the monorepo would otherwise break the
  // leak test), and the conflicted file on disk is still scanned.
  test('an unmerged path during a merge conflict is scanned on disk, never read from the index', () => {
    const repo = fresh();
    put(repo, 'projects/hooks/m.txt', 'base\n');
    git(repo, ['add', '--', '.']);
    git(repo, ['commit', '-q', '-m', 'base']);
    git(repo, ['switch', '-q', '-c', 'other']);
    put(repo, 'projects/hooks/m.txt', `other ${randomUUID()}\n`);
    git(repo, ['commit', '-q', '-am', 'other']);
    git(repo, ['switch', '-q', 'main']);
    put(repo, 'projects/hooks/m.txt', 'mine\n');
    git(repo, ['commit', '-q', '-am', 'mine']);
    const merge = spawnSync('git', ['-C', repo, 'merge', '-q', 'other'], { encoding: 'utf8', env, shell: false, windowsHide: true });
    assert.notEqual(merge.status, 0, 'the merge was meant to conflict');
    const out = scan(repo);
    assert.equal(out.staged, 0);
    assert.deepEqual(out.hits.map((h) => `${h.file}:${h.rule}`), ['projects/hooks/m.txt:uuid']);
  });
});
