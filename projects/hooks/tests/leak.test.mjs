// The leak test: nothing git would commit under the flow's public folders may
// carry a real id, a user-profile path or a transcript field, in its name or
// its body, or be a binary no rule can read (see leak.mjs). The planted cases
// build every sample at run time, so this file stays clean.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GIT_LOCATION_VARS } from '../probes/lib.mjs';
import { SCOPE, gitEnv, scan } from './leak.mjs';

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

test('the published folders carry no uuid, user-profile path, transcript field, API id or unreadable binary', (t) => {
  const out = scan(REPO);
  const hooks = out.roots.find((r) => r.dir === 'projects/hooks');
  assert.ok(hooks.exists, 'projects/hooks is missing: the scan would read as clean with nothing to scan');
  assert.ok(out.files > 0, 'no files listed: an empty scan must never read as clean');
  for (const r of out.roots.filter((x) => !x.exists)) t.diagnostic(`not created yet: ${r.dir}`);
  for (const b of out.binary) t.diagnostic(`allowlisted binary, not scanned: ${b}`);
  assert.deepEqual(out.hits, []);
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
    'transcript-field': () => '{"' + 'parent' + 'Uuid' + '": null}',
    'api-id': () => 'tool' + 'u_01' + 'A'.repeat(22),
    'api-id (bridge session)': () => 'sess' + 'ion_01' + 'B'.repeat(22),
  };
  const ruleOf = (name) => name.replace(/ \(.*\)$/, '');
  const byFile = (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line);

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

  // Claude Code names a transcript by its session uuid and a project folder by
  // the profile slug, so a scrubbed copy can keep a leaking name. Every body
  // here is clean: the only hits are names, at line 0. The .png is an
  // allowlisted binary, whose body is never read.
  test('a uuid-named file and a profile-slug-named folder fail the scan by name, in projects/hooks and in a covered skill folder', () => {
    const profileSlug = ['C', '', 'Users', 'someone', 'proj'].join('-');
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
    const named = {
      [`projects/hooks/tests/fixtures/Stop/${randomUUID()}.json`]: 'uuid',
      [`projects/hooks/tests/fixtures/${randomUUID()}.png`]: 'uuid',
      [`projects/hooks/tests/fixtures/${profileSlug}/capture.json`]: 'user-profile-path',
      [`projects/skills/squeaky-clean/tests/${randomUUID()}.jsonl`]: 'uuid',
      [`projects/skills/squeaky-clean/tests/${profileSlug}/notes.md`]: 'user-profile-path',
    };
    for (const rel of Object.keys(named)) put(rel, rel.endsWith('.png') ? png : '{"ok": 1}\n');
    try {
      const hits = scan(repo).hits.filter((h) => Object.hasOwn(named, h.file));
      assert.deepEqual(hits.sort(byFile), Object.entries(named).map(([file, rule]) => ({ file, line: 0, rule })).sort(byFile));
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

  test('an allowlisted binary is listed, not scanned; any other binary fails the scan', () => {
    // A PNG signature and chunk length, then a uuid no rule could read here.
    const blob = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]), Buffer.from(randomUUID())]);
    const allowed = {
      'projects/hooks/tests/fixtures/logo.png': blob,
      'projects/skills/squeaky-clean/assets/ICON.WOFF2': blob,
    };
    const failed = {
      'projects/hooks/tests/fixtures/blob.bin': blob,
      'projects/skills/squeaky-clean/tests/captures.gz': blob,
      // Opens with a UTF-16LE BOM but decodes to a NUL: still a binary.
      'projects/hooks/tests/fixtures/bom.bin': Buffer.from([0xff, 0xfe, 0, 0, 0x41, 0]),
      // A NUL past git's 8000-byte head is a binary too, not text read as clean.
      'projects/skills/squeaky-clean/notes.md': Buffer.from('a'.repeat(9000) + '\0\n'),
    };
    const mine = [...Object.keys(allowed), ...Object.keys(failed)];
    for (const rel of mine) put(rel, allowed[rel] ?? failed[rel]);
    try {
      const out = scan(repo);
      assert.deepEqual(out.binary.filter((f) => mine.includes(f)).sort(), Object.keys(allowed).sort());
      assert.deepEqual(
        out.hits.filter((h) => mine.includes(h.file)).sort(byFile),
        Object.keys(failed).map((file) => ({ file, line: 0, rule: 'binary' })).sort(byFile),
      );
    } finally {
      for (const rel of mine) fs.rmSync(path.join(repo, rel));
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
