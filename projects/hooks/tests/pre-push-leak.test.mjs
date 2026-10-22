// The pre-push leak gate (tools/pre-push-leak.mjs, D8 of U3) and its
// installer (tools/install-git-hooks.mjs). The gate is run the way git runs
// it: from the work tree's top, with `<remote> <url>` as arguments and the
// ref lines on stdin. Then the installer puts it in a temp repo's pre-push
// hook and a real `git push` to a bare "remote" is refused or let through,
// with the gate run from HEAD's committed copy, never the work tree's.
//
// Every repo is a throwaway under os.tmpdir(). The user's own git config
// stays out (an empty global file, no system file), so a template dir or a
// core.hooksPath there can't change what these repos do, and the hook is
// never installed anywhere else. Every leak sample is built at run time, so
// this file stays clean under the leak test it exercises.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GATE_ENTRY, GATE_ROOT, HOOK_TEXT, MARKER, PRIOR_HOOK_TEXTS, run as runInstaller } from '../tools/install-git-hooks.mjs';
import { gitEnv, readFdSync } from './leak.mjs';

const HOOKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The monorepo's top: GATE_ROOT and GATE_ENTRY are paths from it.
const MONO = path.resolve(HOOKS, '..', '..');
const GATE = path.join(HOOKS, 'tools', 'pre-push-leak.mjs');
const INSTALLER = path.join(HOOKS, 'tools', 'install-git-hooks.mjs');
const ZERO = '0'.repeat(40);
// A remote URL carrying a credential: the gate must never print it.
const SECRET = 'hunter2-not-a-real-secret';
const URL_WITH_CREDENTIAL = `https://someone:${SECRET}@example.invalid/repo.git`;

let root;
let env;

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-pre-push-'));
  const globalConfig = path.join(root, 'gitconfig');
  fs.writeFileSync(globalConfig, '');
  env = Object.fromEntries(Object.entries(gitEnv()).filter(([k]) => !/^GIT_CONFIG/i.test(k)));
  Object.assign(env, {
    GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Leak Gate Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Leak Gate Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
  });
  // The installed hook runs `node` from PATH: this node, first. Windows
  // spells the key Path, and a second PATH key beside it would be ambiguous.
  const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  env[key] = `${path.dirname(process.execPath)}${path.delimiter}${env[key] ?? ''}`;
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

// `extraEnv` adds to the shared env for one run (a push's TMPDIR).
function run(cmd, args, { cwd, input, extraEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd, input, encoding: 'utf8', env: extraEnv ? { ...env, ...extraEnv } : env, shell: false, windowsHide: true, timeout: 120_000 });
  if (r.error) throw r.error;
  return { status: r.status, out: r.stdout, err: r.stderr };
}
function git(dir, ...args) {
  const r = run('git', ['-C', dir, ...args]);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.err}`);
  return r.out.trim();
}
function gitIn(dir, input, ...args) {
  const r = run('git', ['-C', dir, ...args], { input });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.err}`);
  return r.out.trim();
}

// A bare "remote" and a work repo whose origin it is.
function repos() {
  const dir = fs.mkdtempSync(path.join(root, 'r-'));
  const remote = path.join(dir, 'remote.git');
  const work = path.join(dir, 'work');
  git(dir, 'init', '-q', '--bare', '-b', 'main', remote);
  git(dir, 'init', '-q', '-b', 'main', work);
  git(work, 'remote', 'add', 'origin', remote);
  return { dir, remote, work };
}

// Writes `files` ({rel: text or Buffer}) into the work tree, stages them and
// commits; returns the new commit's id.
function commit(work, files, message = 'change') {
  for (const [rel, data] of Object.entries(files)) {
    const full = path.join(work, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
    git(work, 'add', '--', rel);
  }
  git(work, 'commit', '-q', '-m', message);
  return git(work, 'rev-parse', 'HEAD');
}

// Module specifiers in an ES module's source: static imports and re-exports
// (from '...'), a bare `import '...'`, and import('...') with a literal (the
// gate loads leak.mjs that way).
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])([^'"\n]+)\1/gm;

// What `entry` loads, read from the files under `top`: `files`, the entry
// and every file it imports, transitively, following relative specifiers, as
// paths from `top`; and `others`, every specifier that is not relative (node's
// own modules, or something no copy of GATE_ROOT could hold).
function importClosure(entry, top = MONO) {
  const files = new Set();
  const others = new Set();
  const visit = (rel) => {
    if (files.has(rel)) return;
    files.add(rel);
    const src = fs.readFileSync(path.join(top, rel), 'utf8');
    for (const m of src.matchAll(IMPORT)) {
      if (/^\.{1,2}\//.test(m[2])) visit(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[2])));
      else others.add(m[2]);
    }
  };
  visit(entry);
  return { files: [...files], others: [...others] };
}

// The two attributes git archive obeys that would change the hook's copy of
// GATE_ROOT: export-ignore leaves a path out (a folder's, all of it) and
// export-subst rewrites a file's text. Read with `git check-attr` (read only)
// in `top`'s checkout, from every source git reads them from: the
// .gitattributes files, .git/info/attributes and the global attributes file.
// Asked twice, as the leak scan reads: with the work tree's .gitattributes
// files (what the next commit takes, untracked ones included), then with the
// index's (--cached). Asked about: every file git would commit under `dir`
// and every folder above or inside it, a folder with a trailing slash, the
// way git archive asks (measured 2026-10-22: a folder's export-ignore drops
// the files inside it, though check-attr on each of them reads unspecified).
// Returns {asked, found}: how many paths were asked about, and
// `<path> <attribute>: <value>` for each one set to anything but unspecified
// or unset.
function exportAttrs(top, dir, gitEnvironment = gitEnv()) {
  const opts = { encoding: 'utf8', env: gitEnvironment, shell: false, windowsHide: true, timeout: 60_000 };
  const ls = spawnSync('git', ['-C', top, 'ls-files', '-z', '-co', '--exclude-standard', '--', dir], opts);
  assert.equal(ls.status, 0, `git ls-files in ${top}: ${ls.stderr}`);
  const files = [...new Set(ls.stdout.split('\0').filter(Boolean))];
  const folders = new Set();
  for (const f of files) for (let d = path.posix.dirname(f); d !== '.'; d = path.posix.dirname(d)) folders.add(`${d}/`);
  const paths = [...files, ...folders];
  const found = new Set();
  for (const source of [[], ['--cached']]) {
    const r = spawnSync('git', ['-C', top, 'check-attr', ...source, '-z', '--stdin', 'export-ignore', 'export-subst'], { ...opts, input: paths.map((p) => `${p}\0`).join('') });
    assert.equal(r.status, 0, `git check-attr ${source.join(' ')} in ${top}: ${r.stderr}`);
    // <path> NUL <attribute> NUL <value> NUL, for each path and attribute.
    const f = r.stdout.split('\0');
    assert.equal(f.length, 3 * 2 * paths.length + 1, `git check-attr ${source.join(' ')} did not answer for every path and attribute`);
    for (let i = 0; i + 2 < f.length; i += 3) {
      if (f[i + 2] !== 'unspecified' && f[i + 2] !== 'unset') found.add(`${f[i]} ${f[i + 1]}: ${f[i + 2]}`);
    }
  }
  return { asked: paths.length, found: [...found].sort() };
}

const leakJson = () => `{\n  "x": "${randomUUID()}"\n}\n`;
const profilePath = () => ['C:', 'Users', 'someone', 'notes.txt'].join('\\');
const short = (id) => id.slice(0, 12);

// The gate as git runs it. `lines` are [local ref, local sha, remote ref,
// remote sha] arrays.
function gate(work, lines) {
  return run(process.execPath, [GATE, 'origin', URL_WITH_CREDENTIAL], {
    cwd: work, input: lines.map((l) => `${l.join(' ')}\n`).join(''),
  });
}
const update = (local, remote, ref = 'refs/heads/main') => [ref, local, ref, remote];

// The hit lines of a refusal: "<commit12> <path> <rule> (<where>)".
const hitsOf = (err) => [...err.matchAll(/^ {2}([0-9a-f]{12}) (\S+) (\S+) \((.*)\)$/gm)].map((m) => `${m[1]} ${m[2]} ${m[3]} (${m[4]})`);

function assertRefused(r, hits) {
  assert.equal(r.status, 1, `expected a refusal; stderr:\n${r.err}`);
  assert.match(r.err, /^pre-push leak gate: the push is refused/m);
  assert.deepEqual(hitsOf(r.err).sort(), [...hits].sort());
  assert.ok(!(r.out + r.err).includes(SECRET), 'the remote URL was printed');
}
function assertClean(r, summary) {
  assert.equal(r.status, 0, `expected a pass; stderr:\n${r.err}`);
  assert.match(r.err, summary);
  assert.ok(!(r.out + r.err).includes(SECRET), 'the remote URL was printed');
}

describe('pre-push-leak.mjs', () => {
  test('a pushed commit that plants a uuid under projects/hooks is refused, named by commit, path and rule, never by its text', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const uuid = randomUUID();
    const leak = commit(work, { 'projects/hooks/tests/fixtures/x.json': `{\n  "x": "${uuid}"\n}\n` });
    const r = gate(work, [update(leak, base)]);
    assertRefused(r, [`${short(leak)} projects/hooks/tests/fixtures/x.json uuid (line 2)`]);
    assert.ok(!(r.out + r.err).includes(uuid), 'the matched text was printed');
  });

  test('a clean range passes and says what it scanned', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    commit(work, { 'projects/hooks/a.md': 'clean\n' });
    const head = commit(work, { 'projects/skills/squeaky-clean/b.md': 'clean\n' });
    assertClean(gate(work, [update(head, base)]), /^pre-push leak gate: clean \(2 commits, 2 file versions scanned\)$/m);
  });

  test('a leak added and then removed in a later commit of the same push is still refused, at the commit that added it', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const added = commit(work, { 'projects/skills/distill-and-brief/notes.md': `clean\n${profilePath()}\n` });
    const removed = commit(work, { 'projects/skills/distill-and-brief/notes.md': 'clean\n' });
    assertRefused(gate(work, [update(removed, base)]), [`${short(added)} projects/skills/distill-and-brief/notes.md user-profile-path (line 2)`]);
  });

  test('a new branch (zero remote sha) scans only the commits no remote-tracking ref holds', () => {
    const { work } = repos();
    // A leak already on the remote, pushed before any gate existed: it is
    // public already, and a new branch built on it doesn't republish it.
    commit(work, { 'projects/hooks/old.json': leakJson() });
    git(work, 'push', '-q', 'origin', 'main');
    git(work, 'switch', '-q', '-c', 'feature');
    const clean = commit(work, { 'projects/hooks/a.md': 'clean\n' });
    assertClean(gate(work, [update(clean, ZERO, 'refs/heads/feature')]), /clean \(1 commit, 1 file version scanned\)/);
    const leak = commit(work, { 'projects/hooks/b.json': leakJson() });
    assertRefused(gate(work, [update(leak, ZERO, 'refs/heads/feature')]), [`${short(leak)} projects/hooks/b.json uuid (line 2)`]);
  });

  test('a delete push publishes nothing and passes', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/x.json': leakJson() });
    assertClean(gate(work, [['(delete)', ZERO, 'refs/heads/gone', base]]), /clean \(no commit the remote lacks\)/);
  });

  test('a range that touches no scanned folder passes, even with a leak outside them', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const head = commit(work, { 'projects/the-back-nine/notes.md': leakJson(), 'README.md': `${profilePath()}\n` });
    assertClean(gate(work, [update(head, base)]), /clean \(1 commit, none touching the scanned folders\)/);
  });

  test('commit messages are never scanned: an attribution trailer and a uuid in one pass', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const trailer = `Claude-Session: https://claude.ai/code/${'sess' + 'ion_01'}${'B'.repeat(24)}`;
    const head = commit(work, { 'projects/hooks/a.md': 'clean\n' }, `change ${randomUUID()}\n\n${trailer}`);
    assertClean(gate(work, [update(head, base)]), /clean \(1 commit, 1 file version scanned\)/);
  });

  test('a merge that writes a leak while merging is refused at the merge commit (diff-tree -c); what it took from a parent is not re-listed', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    git(work, 'switch', '-q', '-c', 'side');
    commit(work, { 'projects/hooks/side.md': 'clean\n' });
    git(work, 'switch', '-q', 'main');
    commit(work, { 'projects/hooks/main.md': 'clean\n' });
    git(work, 'merge', '-q', '--no-commit', '--no-ff', 'side');
    fs.writeFileSync(path.join(work, 'projects/hooks/evil.json'), leakJson());
    git(work, 'add', '--', 'projects/hooks/evil.json');
    git(work, 'commit', '-q', '-m', 'merge side');
    const merge = git(work, 'rev-parse', 'HEAD');
    assertRefused(gate(work, [update(merge, base)]), [`${short(merge)} projects/hooks/evil.json uuid (line 2)`]);
  });

  test('a leak added and removed on a merged side branch is refused at the side commit', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    git(work, 'switch', '-q', '-c', 'side');
    const added = commit(work, { 'projects/hooks/side.json': leakJson() });
    commit(work, { 'projects/hooks/side.json': '{}\n' });
    git(work, 'switch', '-q', 'main');
    commit(work, { 'projects/hooks/main.md': 'clean\n' });
    git(work, 'merge', '-q', '--no-ff', '-m', 'merge side', 'side');
    const merge = git(work, 'rev-parse', 'HEAD');
    assertRefused(gate(work, [update(merge, base)]), [`${short(added)} projects/hooks/side.json uuid (line 2)`]);
  });

  test('a remote sha this repo lacks (pushed since the last fetch) falls back to every commit no remote-tracking ref holds', () => {
    const { work } = repos();
    const old = commit(work, { 'projects/hooks/old.json': leakJson() });
    const head = commit(work, { 'projects/hooks/a.md': 'clean\n' });
    // No remote-tracking ref exists here, so the fallback reaches the root.
    assertRefused(gate(work, [update(head, '1'.repeat(40))]), [`${short(old)} projects/hooks/old.json uuid (line 2)`]);
  });

  test('two refs sharing commits list each hit once', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const leak = commit(work, { 'projects/hooks/x.json': leakJson() });
    assertRefused(gate(work, [update(leak, base), update(leak, ZERO, 'refs/heads/copy')]), [`${short(leak)} projects/hooks/x.json uuid (line 2)`]);
  });

  test('every kind of path the leak test reads: a uuid name, a UTF-16 capture, an unreadable binary, an archive, a PDF, a symlink, an image, a font, a submodule', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const named = `projects/hooks/tests/fixtures/${randomUUID()}.json`;
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
    // Images and fonts fail as binaries, like any other binary: no rule can
    // read one, so a profile path sitting in a PNG text chunk is reported as
    // 'binary', never by the rule a latin1 read would have matched.
    const png = Buffer.concat([sig, Buffer.from(randomUUID())]);
    const shot = Buffer.concat([sig, Buffer.from('tEXtComment\0'), Buffer.from(profilePath())]);
    const font = Buffer.concat([Buffer.from('wOF2\0\x01\0\0'), Buffer.from([0x8b, 0x02, 0x80, 0, 0x1f])]);
    // The zip names a session-uuid transcript in the clear: the case the
    // review found passing as clean while .zip sat on an allowlist.
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0, 0x08, 0]), Buffer.from(`${randomUUID()}.jsonl`)]);
    const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n%'), Buffer.from([0xe2, 0xe3, 0, 0x0a])]);
    for (const [rel, data] of Object.entries({
      [named]: '{"ok": 1}\n',
      'projects/hooks/tests/fixtures/capture.txt': Buffer.from(`﻿clean\r\n${profilePath()}\r\n`, 'utf16le'),
      'projects/skills/squeaky-clean/blob.bin': Buffer.from([0x41, 0, 0x42]),
      'projects/skills/squeaky-clean/fixtures/run.zip': zip,
      'projects/hooks/fixtures/notes.pdf': pdf,
      'projects/hooks/logo.png': png,
      'projects/hooks/shot.png': shot,
      'projects/skills/squeaky-clean/assets/face.woff2': font,
    })) {
      fs.mkdirSync(path.dirname(path.join(work, rel)), { recursive: true });
      fs.writeFileSync(path.join(work, rel), data);
      git(work, 'add', '--', rel);
    }
    // Staged through update-index, so no filesystem symlink (or submodule
    // checkout) is needed and this runs on Windows too.
    const link = gitIn(work, profilePath(), 'hash-object', '-w', '--stdin');
    git(work, 'update-index', '--add', '--cacheinfo', `120000,${link},projects/hooks/link`);
    git(work, 'update-index', '--add', '--cacheinfo', `160000,${base},projects/hooks/sub`);
    git(work, 'commit', '-q', '-m', 'kinds');
    const head = git(work, 'rev-parse', 'HEAD');
    const c = short(head);
    const binary = (rel) => `${c} ${rel} binary (not text, and no rule can read a binary)`;
    assertRefused(gate(work, [update(head, base)]), [
      `${c} ${named} uuid (in its name)`,
      `${c} projects/hooks/tests/fixtures/capture.txt user-profile-path (line 2)`,
      binary('projects/skills/squeaky-clean/blob.bin'),
      binary('projects/skills/squeaky-clean/fixtures/run.zip'),
      binary('projects/hooks/fixtures/notes.pdf'),
      binary('projects/hooks/logo.png'),
      binary('projects/hooks/shot.png'),
      binary('projects/skills/squeaky-clean/assets/face.woff2'),
      `${c} projects/hooks/link user-profile-path (line 1)`,
    ]);
  });

  test('stdin that stops partway through a line fails closed: git ends every ref line with a newline', () => {
    const { work } = repos();
    const base = commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const head = commit(work, { 'projects/hooks/a.md': 'clean\n' });
    // A whole, clean ref line short of its LF: read as given, it would pass.
    const r = run(process.execPath, [GATE, 'origin', URL_WITH_CREDENTIAL], { cwd: work, input: update(head, base).join(' ') });
    assert.equal(r.status, 1, `expected a refusal; stderr:\n${r.err}`);
    assert.match(r.err, /^pre-push leak gate: internal error: stdin stops partway through a line/m);
    assert.match(r.err, /`git push --no-verify` skips the gate/);
    // The same line with its LF passes.
    assertClean(gate(work, [update(head, base)]), /clean \(1 commit, 1 file version scanned\)/);
  });

  test('an internal error fails closed and names git push --no-verify', () => {
    const { work } = repos();
    commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    for (const input of ['not a ref line', `refs/heads/main ${'2'.repeat(40)} refs/heads/main ${ZERO}`]) {
      const r = run(process.execPath, [GATE, 'origin', URL_WITH_CREDENTIAL], { cwd: work, input: `${input}\n` });
      assert.equal(r.status, 1, `expected a refusal for ${JSON.stringify(input)}; stderr:\n${r.err}`);
      assert.match(r.err, /^pre-push leak gate: internal error: /m);
      assert.match(r.err, /fails closed/);
      assert.match(r.err, /`git push --no-verify` skips the gate/);
      assert.ok(!(r.out + r.err).includes(SECRET), 'the remote URL was printed');
    }
  });

  test('an empty stdin (git runs the hook on an up-to-date push) passes', () => {
    const { work } = repos();
    commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    assertClean(run(process.execPath, [GATE, 'origin', URL_WITH_CREDENTIAL], { cwd: work, input: '' }), /clean \(no commit the remote lacks\)/);
  });
});

// The gate's stdin read, driven by a fake fs.readSync: no real pipe on any
// platform this runs on throws EOF or EAGAIN on demand (measured 2026-10-22,
// see readFdSync's comment), so these are the only way to reach those arms.
describe('readFdSync (leak.mjs), the read the gate takes its ref lines with', () => {
  // Plays `steps` in order: a string hands back its bytes, '!CODE' throws an
  // error with that code; past the end every read gives 0 bytes.
  function fake(steps) {
    let i = 0;
    return (fd, buf, off, len) => {
      const s = steps[i++];
      if (s === undefined) return 0;
      if (s.startsWith('!')) throw Object.assign(new Error(`fake ${s.slice(1)}`), { code: s.slice(1) });
      return Buffer.from(s).copy(buf, off, 0, len);
    };
  }

  test('it reads every chunk until a read gives 0 bytes', () => {
    assert.equal(readFdSync(0, fake(['refs/heads/a 1 ', 'refs/heads/a 2\n', 'second\n'])).toString(), 'refs/heads/a 1 refs/heads/a 2\nsecond\n');
  });

  test('a thrown EOF ends the input and keeps what came before it', () => {
    assert.equal(readFdSync(0, fake(['first\n', 'second\n', '!EOF'])).toString(), 'first\nsecond\n');
    assert.equal(readFdSync(0, fake(['!EOF'])).length, 0);
  });

  test('EAGAIN (a non-blocking stdin with nothing yet) waits and reads again', () => {
    assert.equal(readFdSync(0, fake(['!EAGAIN', 'a\n', '!EAGAIN', 'b\n'])).toString(), 'a\nb\n');
  });

  test('any other error throws, with what was read so far dropped', () => {
    assert.throws(() => readFdSync(0, fake(['partial', '!EIO'])), { code: 'EIO' });
  });

  // No pipe here throws EOF, so a gate gone back to fs.readFileSync (which
  // drops a partial read when one does) would pass every run above; the
  // gate's source is checked instead.
  test('the gate reads its stdin through readFdSync, never fs.readFileSync', () => {
    const code = fs.readFileSync(GATE, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//'));
    assert.ok(code.some((l) => l.includes('leak.readFdSync(0)')), 'the gate does not read stdin with readFdSync');
    assert.ok(!code.some((l) => /readFileSync|readSync\(/.test(l)), 'the gate reads with something besides readFdSync');
  });
});

describe('install-git-hooks.mjs', () => {
  const install = (work, ...args) => run(process.execPath, [INSTALLER, '--repo', work, ...args]);
  const hookFile = (work) => path.join(work, '.git', 'hooks', 'pre-push');
  const leftovers = (work) => fs.readdirSync(path.join(work, '.git', 'hooks')).filter((f) => f.includes('.install-'));

  test("the hook opens with a shebang and the marker, has LF line endings, and runs the gate from a temp copy of HEAD's GATE_ROOT folder, never the work tree's", () => {
    assert.equal(MARKER, '# installed by projects/hooks/tools/install-git-hooks.mjs (U3 D8)');
    assert.ok(HOOK_TEXT.startsWith(`#!/bin/sh\n${MARKER}\n`), HOOK_TEXT);
    assert.ok(!HOOK_TEXT.includes('\r') && HOOK_TEXT.endsWith('\n'));
    const lines = HOOK_TEXT.split('\n');
    // The temp copy: TMPDIR first, then /tmp, then a refusal by name (the
    // real pushes below run each of the three).
    const mk = lines.findIndex((l) => l.startsWith('tmp=$(mktemp -d "${TMPDIR:-/tmp}/pre-push-leak.XXXXXX" 2>/dev/null) ||'));
    assert.ok(mk >= 0, 'the hook does not make its temp folder in TMPDIR first');
    assert.equal(lines[mk + 1], '  tmp=$(mktemp -d /tmp/pre-push-leak.XXXXXX) ||', 'the hook does not fall back to /tmp');
    assert.match(lines[mk + 2], /^ {2}fail '.*'$/, 'the hook does not refuse when no temp folder can be made');
    assert.equal(lines[mk + 3], `trap 'rm -rf "$tmp"' EXIT`, 'the EXIT trap does not follow the temp folder');
    assert.ok(lines.some((l) => l.startsWith(`git archive --format=tar HEAD -- '${GATE_ROOT}' `)), 'the hook does not archive the GATE_ROOT folder (and only it) from HEAD');
    assert.ok(lines.some((l) => l.startsWith(`[ -f "$tmp/${GATE_ENTRY}" ] || fail `)), 'the hook does not check the unpacked copy holds the gate');
    assert.ok(lines.includes(`node "$tmp/${GATE_ENTRY}" "$@"`), 'the hook does not run the temp copy of the gate');
    // Nothing points into the work tree: the old exec line found the gate
    // there through the top level.
    assert.ok(!HOOK_TEXT.includes('--show-toplevel'), 'the hook names the work tree');
    // Each earlier version's text is one this tool wrote (it has the marker),
    // never this version's (that one is 'same', not an upgrade).
    for (const t of PRIOR_HOOK_TEXTS) {
      assert.notEqual(t, HOOK_TEXT);
      assert.ok(t.split(/\r?\n/).includes(MARKER), 'a PRIOR_HOOK_TEXTS entry has no marker line');
    }
  });

  // A repo keeps the hook text it was given, and --go knows only HOOK_TEXT
  // and PRIOR_HOOK_TEXTS: any other text with the marker is refused as not
  // exactly its own, so a fixed hook would reach the monorepo only after a
  // delete by hand. HOOK_TEXT bakes in MARKER, GATE_ROOT and GATE_ENTRY, so
  // changing any of them changes this hash too.
  const HOOK_TEXT_SHA256 = '3e0da7b25b70dff8ba3bf0b725a664dca06a9c84424af4343d9e84afb2b5eb6c';
  test('HOOK_TEXT is pinned by the sha256 of its UTF-8 bytes: changing the installed hook takes the upgrade steps the failure names', () => {
    assert.equal(createHash('sha256').update(Buffer.from(HOOK_TEXT, 'utf8')).digest('hex'), HOOK_TEXT_SHA256,
      'HOOK_TEXT changed. If any repo has the old text installed (the monorepo does from U3\'s live step 8 on): '
      + 'append the old text (the one this pin hashes) to PRIOR_HOOK_TEXTS in tools/install-git-hooks.mjs, update this pin, '
      + 'run `node projects/hooks/tools/install-git-hooks.mjs --go` on the monorepo before pushing, '
      + 'and keep the old GATE_ROOT and GATE_ENTRY paths in HEAD until then, since the old hook archives and runs them. '
      + 'If no repo ever had the old text installed, update this pin alone.');
  });

  // The hook extracts GATE_ROOT whole, so it serves the gate exactly when
  // everything the gate loads sits inside that folder. A static or literal
  // dynamic import is what the scan sees; the gate uses no other kind.
  test("every file the gate imports, transitively, sits inside GATE_ROOT, the folder the hook archives, and it imports nothing else but node's own modules", () => {
    assert.equal(GATE_ENTRY, `${GATE_ROOT}/tools/pre-push-leak.mjs`);
    const { files, others } = importClosure(GATE_ENTRY);
    // The scan reached the gate's imports at all: it loads leak.mjs, which
    // loads the probes' lib.
    for (const rel of [`${GATE_ROOT}/tests/leak.mjs`, `${GATE_ROOT}/probes/lib.mjs`]) assert.ok(files.includes(rel), `the import scan missed ${rel}`);
    for (const rel of files) assert.ok(rel.startsWith(`${GATE_ROOT}/`), `the gate loads ${rel}, outside ${GATE_ROOT}: the hook's copy would lack it`);
    for (const s of others) assert.match(s, /^node:/, `the gate loads "${s}", which no copy of ${GATE_ROOT} holds`);
    // The hook quotes both, but neither should need it.
    for (const p of [GATE_ROOT, GATE_ENTRY]) assert.match(p, /^[A-Za-z0-9._/-]+$/);
    // The scan itself, on a gate that reaches out of the folder and into a
    // package: both are named, so the assertions above can fail.
    const top = fs.mkdtempSync(path.join(root, 'scan-'));
    const plant = (rel, text) => {
      fs.mkdirSync(path.dirname(path.join(top, rel)), { recursive: true });
      fs.writeFileSync(path.join(top, rel), text);
    };
    plant(GATE_ENTRY, "import { a } from '../../shared/a.mjs';\nconst b = await import('./b.mjs');\n");
    plant(`${GATE_ROOT}/tools/b.mjs`, "export * from 'some-package';\n");
    plant('projects/shared/a.mjs', 'export const a = 1;\n');
    const seen = importClosure(GATE_ENTRY, top);
    assert.deepEqual(seen.files.sort(), [GATE_ENTRY, `${GATE_ROOT}/tools/b.mjs`, 'projects/shared/a.mjs'].sort());
    assert.deepEqual(seen.others, ['some-package']);
  });

  // Git Bash's tar can't make a symlink without the right to (measured: it
  // exits 2, "Cannot create symlink"), so one committed under GATE_ROOT would
  // make the hook refuse every push from Windows. Read from the checkout's
  // index (read only): what the next commit holds.
  test('no symlink sits in GATE_ROOT in the checkout: the hook unpacks the whole folder, and Git Bash can not unpack one', () => {
    const r = spawnSync('git', ['-C', MONO, 'ls-files', '--stage', '-z', '--', GATE_ROOT], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true, timeout: 60_000 });
    assert.equal(r.status, 0, `git ls-files in ${MONO}: ${r.stderr}`);
    const entries = r.stdout.split('\0').filter(Boolean);
    assert.ok(entries.length > 0, `the index of ${MONO} has nothing under ${GATE_ROOT}: not the monorepo's checkout`);
    const links = entries.filter((e) => e.startsWith('120000 ')).map((e) => e.split('\t')[1]);
    assert.deepEqual(links, [], 'symlinks under GATE_ROOT');
  });

  // The hook's git archive obeys export-ignore and export-subst, so either
  // one set on a gate file, or on a folder holding one, would drop or
  // rewrite what the hook runs: every push, Back Nine's included, would then
  // fail closed (or run a changed gate). Read only, from the checkout's
  // work tree and index, with this machine's own git config, as the hook's
  // git archive reads them.
  test("no path under GATE_ROOT in the checkout, nor a folder above it, has export-ignore or export-subst set: the hook's git archive obeys both", () => {
    const { asked, found } = exportAttrs(MONO, GATE_ROOT);
    assert.ok(asked > 0, `nothing under ${GATE_ROOT} in ${MONO}: not the monorepo's checkout`);
    assert.deepEqual(found, [], `attributes git archive would apply to the hook's copy of ${GATE_ROOT}`);
  });

  // The guard above can fail: each source and each form it must see, planted
  // in a temp repo (with no user config), is found; an unset attribute is
  // not. Then the reason folders are asked about, shown on git itself.
  test('the export-attribute guard sees a committed, a staged-only, an untracked and a .git/info rule, on a file and on a folder above or inside GATE_ROOT', () => {
    const { work } = repos();
    commit(work, {
      '.gitattributes': 'projects/hooks/lib export-ignore\nprojects export-subst\nprojects/hooks/b.mjs -export-ignore\n',
      'projects/hooks/README.md': '# Hooks\n',
      'projects/hooks/a.md': 'a\n',
      'projects/hooks/b.mjs': 'export const b = 1;\n',
      'projects/hooks/lib/x.mjs': 'export const x = 1;\n',
      'projects/hooks/tools/g.mjs': 'export const g = 1;\n',
    });
    // Staged only: the index's copy names a.md, the work tree's names nothing.
    fs.writeFileSync(path.join(work, 'projects/hooks/.gitattributes'), 'a.md export-ignore\n');
    git(work, 'add', '--', 'projects/hooks/.gitattributes');
    fs.writeFileSync(path.join(work, 'projects/hooks/.gitattributes'), '# nothing\n');
    // Untracked: only the work tree holds it.
    fs.writeFileSync(path.join(work, 'projects/hooks/tools/.gitattributes'), 'g.mjs export-subst\n');
    // This repo's own, in no tree.
    fs.mkdirSync(path.join(work, '.git', 'info'), { recursive: true });
    fs.writeFileSync(path.join(work, '.git', 'info', 'attributes'), 'projects/hooks/README.md export-ignore\n');
    assert.deepEqual(exportAttrs(work, GATE_ROOT, env).found, [
      'projects/ export-subst: set',
      'projects/hooks/README.md export-ignore: set',
      'projects/hooks/a.md export-ignore: set',
      'projects/hooks/lib/ export-ignore: set',
      'projects/hooks/tools/g.mjs export-subst: set',
    ]);
    // A folder's export-ignore leaves its files out of git archive's output,
    // though check-attr on the file reads unspecified.
    const ask = run('git', ['-C', work, 'check-attr', 'export-ignore', '--', 'projects/hooks/lib/x.mjs']);
    assert.equal(ask.out.trim(), 'projects/hooks/lib/x.mjs: export-ignore: unspecified');
    const tar = spawnSync('git', ['-C', work, 'archive', '--format=tar', 'HEAD', '--', GATE_ROOT], { env, shell: false, windowsHide: true, timeout: 60_000 });
    assert.equal(tar.status, 0, String(tar.stderr));
    assert.ok(tar.stdout.includes('projects/hooks/b.mjs'), 'the archive does not name a file it holds: the check below proves nothing');
    assert.ok(!tar.stdout.includes('projects/hooks/lib/x.mjs'), 'git archive kept a file in a folder marked export-ignore');
  });

  test('without --go it installs nothing and says what it would do; with --go it installs, and again it writes nothing', () => {
    const { work } = repos();
    const dry = install(work);
    assert.equal(dry.status, 0, dry.err);
    assert.match(dry.out, /^would install .*pre-push \(run again with --go to install it\)$/m);
    assert.ok(!fs.existsSync(hookFile(work)), 'a dry run wrote the hook');

    const go = install(work, '--go');
    assert.equal(go.status, 0, go.err);
    assert.match(go.out, /^installed .*pre-push$/m);
    assert.equal(fs.readFileSync(hookFile(work), 'utf8'), HOOK_TEXT);
    if (process.platform !== 'win32') assert.equal(fs.statSync(hookFile(work)).mode & 0o777, 0o755);

    const before = fs.statSync(hookFile(work)).mtimeMs;
    const again = install(work, '--go');
    assert.equal(again.status, 0, again.err);
    assert.match(again.out, /^already installed: /m);
    assert.equal(fs.statSync(hookFile(work)).mtimeMs, before);
    assert.deepEqual(leftovers(work), []);
  });

  // Its own means exactly HOOK_TEXT or a PRIOR_HOOK_TEXTS entry. The marker
  // alone would hand the tool a hook someone added their own lines to, which
  // --go would overwrite and --uninstall remove, dropping those lines.
  test('a hook with the marker but other text (a version PRIOR_HOOK_TEXTS does not list; its own with lines added; one with CRLF) is refused by --go and --uninstall, and left byte for byte', () => {
    for (const text of [
      `#!/bin/sh\n${MARKER}\nexec node old-path.mjs "$@"\n`,
      `${HOOK_TEXT}echo "someone's own check" >&2\n`,
      HOOK_TEXT.replace(/\n/g, '\r\n'),
    ]) {
      const { work } = repos();
      fs.writeFileSync(hookFile(work), text);
      for (const args of [['--go'], [], ['--uninstall', '--go'], ['--uninstall']]) {
        const r = install(work, ...args);
        assert.equal(r.status, 2, `${args.join(' ')}: ${r.out}${r.err}`);
        assert.match(r.err, /^install-git-hooks: refused: .*carries this tool's marker but is not exactly a hook this tool writes or wrote/m);
        assert.equal(fs.readFileSync(hookFile(work), 'utf8'), text);
      }
      assert.deepEqual(leftovers(work), []);
    }
  });

  // The installer run in this process: the one way to plant an earlier
  // version's text in PRIOR_HOOK_TEXTS (a child process gets its own empty
  // copy). run() is synchronous, so for exactly that call process.env is the
  // hermetic env the child runs get (no user git config), and nothing else
  // runs meanwhile; the planted text and process.env are put back after.
  // Refused is the installer's own class, not exported: exit 2 by its name.
  function installWithPrior(prior, work, ...args) {
    const saved = { ...process.env };
    const setEnv = (to) => {
      for (const k of Object.keys(process.env)) delete process.env[k];
      Object.assign(process.env, to);
    };
    PRIOR_HOOK_TEXTS.push(prior);
    try {
      setEnv(env);
      return { status: 0, out: runInstaller(['--repo', work, ...args]).join('\n'), err: '' };
    } catch (e) {
      return { status: e?.constructor?.name === 'Refused' ? 2 : 1, out: '', err: String(e?.message ?? e) };
    } finally {
      PRIOR_HOOK_TEXTS.splice(PRIOR_HOOK_TEXTS.lastIndexOf(prior), 1);
      setEnv(saved);
    }
  }

  // The hook an earlier version wrote (a test's stand-in: the list is empty
  // today) is the tool's own: --go upgrades it by the same temp file and
  // rename as an install, and --uninstall removes it. Its text with anything
  // changed is still someone's to keep.
  test('a hook an earlier version wrote (exactly a PRIOR_HOOK_TEXTS entry) is upgraded by --go and removed by --uninstall; an edited copy is still refused', () => {
    const prior = `#!/bin/sh\n${MARKER}\n# an earlier version's hook, planted by the test\nexec node old-gate.mjs "$@"\n`;
    // The list as it stands, which this test must leave as it found it: each
    // entry a hook this tool wrote (it has the marker), none this version's
    // (that one is 'same', not an upgrade), and none the text planted here,
    // or the control below would prove nothing.
    const listed = [...PRIOR_HOOK_TEXTS];
    for (const t of listed) {
      assert.ok(t.split(/\r?\n/).includes(MARKER), 'a PRIOR_HOOK_TEXTS entry has no marker line');
      assert.notEqual(t, HOOK_TEXT, "a PRIOR_HOOK_TEXTS entry is this version's own text");
    }
    assert.ok(!listed.includes(prior), 'PRIOR_HOOK_TEXTS already holds the text this test plants: plant another');

    // Control: while the list doesn't hold it (the CLI's empty list, or
    // another text planted), the same file is refused.
    const control = repos();
    fs.writeFileSync(hookFile(control.work), prior);
    for (const r of [install(control.work, '--go'), installWithPrior('#!/bin/sh\nsomething else\n', control.work, '--go')]) {
      assert.equal(r.status, 2, r.out + r.err);
      assert.match(r.err, /carries this tool's marker but is not exactly a hook this tool writes or wrote/);
    }
    assert.equal(fs.readFileSync(hookFile(control.work), 'utf8'), prior);

    // --go: a dry run says so and changes nothing; then the upgrade.
    const up = repos();
    fs.writeFileSync(hookFile(up.work), prior);
    const dry = installWithPrior(prior, up.work);
    assert.equal(dry.status, 0, dry.err);
    assert.match(dry.out, /^would upgrade .*pre-push, an earlier version of this tool's hook, to this version's \(run again with --go to upgrade it\)$/m);
    assert.equal(fs.readFileSync(hookFile(up.work), 'utf8'), prior);
    const old = fs.statSync(hookFile(up.work), { bigint: true });
    const go = installWithPrior(prior, up.work, '--go');
    assert.equal(go.status, 0, go.err);
    assert.match(go.out, /^upgraded .*pre-push from an earlier version of this tool's hook$/m);
    assert.equal(fs.readFileSync(hookFile(up.work), 'utf8'), HOOK_TEXT);
    const now = fs.statSync(hookFile(up.work), { bigint: true });
    // A new file renamed over the old, never the old one rewritten in place.
    if (old.ino !== 0n) assert.notEqual(now.ino, old.ino, 'the hook was rewritten in place');
    if (process.platform !== 'win32') assert.equal(Number(now.mode) & 0o777, 0o755);
    assert.deepEqual(leftovers(up.work), []);
    assert.match(install(up.work, '--go').out, /^already installed: /m);

    // --uninstall: a dry run, then the removal.
    const un = repos();
    fs.writeFileSync(hookFile(un.work), prior);
    const keep = installWithPrior(prior, un.work, '--uninstall');
    assert.equal(keep.status, 0, keep.err);
    assert.match(keep.out, /^would remove .*pre-push \(an earlier version of this tool's hook\) \(run again with --go to remove it\)$/m);
    assert.equal(fs.readFileSync(hookFile(un.work), 'utf8'), prior);
    const rm = installWithPrior(prior, un.work, '--uninstall', '--go');
    assert.equal(rm.status, 0, rm.err);
    assert.match(rm.out, /^removed .*pre-push \(an earlier version of this tool's hook\)$/m);
    assert.ok(!fs.existsSync(hookFile(un.work)), 'the earlier version was not removed');

    // Edited copies: a line added, the line endings changed. Refused by
    // every action, left byte for byte.
    for (const text of [`${prior}echo "someone's own check" >&2\n`, prior.replace(/\n/g, '\r\n')]) {
      const { work } = repos();
      fs.writeFileSync(hookFile(work), text);
      for (const args of [['--go'], [], ['--uninstall', '--go'], ['--uninstall']]) {
        const r = installWithPrior(prior, work, ...args);
        assert.equal(r.status, 2, `${args.join(' ')}: ${r.out}${r.err}`);
        assert.match(r.err, /carries this tool's marker but is not exactly a hook this tool writes or wrote/);
        assert.equal(fs.readFileSync(hookFile(work), 'utf8'), text);
      }
      assert.deepEqual(leftovers(work), []);
    }
    assert.deepEqual(PRIOR_HOOK_TEXTS, listed, 'a planted text was left behind');
  });

  // Node before 24.2 leaves import.meta.main undefined, and a CLI guarded by
  // it would exit 0 having done nothing. Node 24.2+ (this runner) can't show
  // that, so the source is checked; the CLI cases here show the argv check
  // runs it, and the import at the top of this file shows it stays quiet.
  test('the installer decides it was run as a command from argv, not import.meta.main', () => {
    const code = fs.readFileSync(INSTALLER, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//'));
    assert.ok(!code.some((l) => l.includes('import.meta.main')), 'the CLI guard still reads import.meta.main');
    assert.ok(code.some((l) => l.includes('process.argv[1]') && l.includes('import.meta.url')), 'no argv check found');
  });

  test('it refuses to overwrite or remove a pre-push hook without its marker, and leaves it byte for byte', () => {
    const { work } = repos();
    const foreign = '#!/bin/sh\necho "someone else\'s hook"\n';
    fs.writeFileSync(hookFile(work), foreign);
    for (const args of [['--go'], [], ['--uninstall', '--go'], ['--uninstall']]) {
      const r = install(work, ...args);
      assert.equal(r.status, 2, `${args.join(' ')}: ${r.out}${r.err}`);
      assert.match(r.err, /^install-git-hooks: refused: .*not this tool's hook/m);
      assert.equal(fs.readFileSync(hookFile(work), 'utf8'), foreign);
    }
    assert.deepEqual(leftovers(work), []);
  });

  test('--uninstall removes only its own hook, and only with --go', () => {
    const { work } = repos();
    assert.equal(install(work, '--go').status, 0);
    const dry = install(work, '--uninstall');
    assert.equal(dry.status, 0, dry.err);
    assert.match(dry.out, /^would remove /m);
    assert.ok(fs.existsSync(hookFile(work)), 'a dry run removed the hook');
    const go = install(work, '--uninstall', '--go');
    assert.equal(go.status, 0, go.err);
    assert.match(go.out, /^removed /m);
    assert.ok(!fs.existsSync(hookFile(work)));
    const again = install(work, '--uninstall', '--go');
    assert.equal(again.status, 0, again.err);
    assert.match(again.out, /nothing to remove/);
  });

  test('it refuses while core.hooksPath sends git to another folder: git would never run a hook in .git/hooks', () => {
    const { work } = repos();
    git(work, 'config', 'core.hooksPath', 'elsewhere');
    const r = install(work, '--go');
    assert.equal(r.status, 2, r.out + r.err);
    assert.match(r.err, /core\.hooksPath sends git to .*elsewhere/);
    assert.ok(!fs.existsSync(hookFile(work)));
  });

  // The end-to-end case below sets the absolute form the monorepo's own
  // .git/config holds; this is the relative spelling of the same folder.
  test('a core.hooksPath naming .git/hooks itself is no detour: it installs there', () => {
    const { work } = repos();
    git(work, 'config', 'core.hooksPath', '.git/hooks');
    const r = install(work, '--go');
    assert.equal(r.status, 0, r.out + r.err);
    assert.equal(fs.readFileSync(hookFile(work), 'utf8'), HOOK_TEXT);
  });

  // An empty template leaves no hooks folder. Nothing on disk to resolve
  // then, so the folder comparison rests on spelling alone (git prints C:/
  // where Node's path.join writes C:\ on Windows).
  test('a repo with no hooks folder yet (an empty template) gets one, with the hook in it', () => {
    const dir = fs.mkdtempSync(path.join(root, 'r-'));
    const template = path.join(dir, 'empty-template');
    fs.mkdirSync(template);
    const work = path.join(dir, 'work');
    git(dir, 'init', '-q', '-b', 'main', `--template=${template}`, work);
    assert.ok(!fs.existsSync(path.join(work, '.git', 'hooks')), 'the template made a hooks folder after all');
    const r = install(work, '--go');
    assert.equal(r.status, 0, r.out + r.err);
    assert.equal(fs.readFileSync(hookFile(work), 'utf8'), HOOK_TEXT);
  });

  test('from a linked worktree it installs into the shared hooks folder, where git looks', () => {
    const { dir, work } = repos();
    commit(work, { 'projects/hooks/README.md': '# Hooks\n' });
    const wt = path.join(dir, 'wt');
    git(work, 'worktree', 'add', '-q', '-b', 'wt', wt);
    const r = install(wt, '--go');
    assert.equal(r.status, 0, r.err);
    assert.equal(fs.readFileSync(hookFile(work), 'utf8'), HOOK_TEXT);
  });

  test('a bad argument or a folder outside any work tree is refused', () => {
    const { work, remote } = repos();
    const bad = install(work, '--force');
    assert.equal(bad.status, 2);
    assert.match(bad.err, /usage: /);
    // A bare repo has no work tree for the hook's exec line to find.
    const bare = install(remote, '--go');
    assert.equal(bare.status, 2, bare.out + bare.err);
    assert.match(bare.err, /not inside a git work tree/);
  });
});

// The whole path: the installer's hook, git running it, the gate refusing.
// The hook runs the gate from HEAD's committed bytes, so each repo's first
// commit holds byte copies of the gate and everything it imports
// (importClosure) from this checkout, at their real paths. The repo's config
// sets core.hooksPath to its own hooks folder, absolute and in the
// platform's spelling, as the monorepo's .git/config does (measured
// 2026-10-21), so git is shown running the hook under that setting too.
// Every push runs with TMPDIR at a folder of the test's own, which must be
// empty again after each push: the hook's temp copy is removed on every way
// out, a refusal and a failure included. The positive control for those
// checks: a module the gate is made to import prints the folder it runs
// from, which must sit in that TMPDIR folder. The same module shows a stale
// TMPDIR (a missing folder, a plain file) sending the copy to /tmp, and
// removed from there too.
describe('a real git push through the installed hook', () => {
  const MARKER_RULE = "\nRULES.push({ id: 'test-marker', re: new RegExp('ZZ' + 'TOP-' + 'MARKER') });\n";
  const marker = () => `${'ZZ'}${'TOP-'}${'MARKER'}\n`;
  const gateBytes = (rel) => fs.readFileSync(path.join(MONO, rel));
  const gateFiles = () => importClosure(GATE_ENTRY).files;
  // Writes this checkout's copy of every gate file into the work tree.
  const restoreGate = (work) => {
    for (const rel of gateFiles()) {
      fs.mkdirSync(path.dirname(path.join(work, rel)), { recursive: true });
      fs.writeFileSync(path.join(work, rel), gateBytes(rel));
    }
  };
  const refLine = (local, remote) => `${update(local, remote).join(' ')}\n`;

  // A work repo with the hook installed and a first commit, not yet pushed:
  // `head` ({rel: text}), by default a README under projects/hooks and the
  // gate's files. push() runs `git push origin <args>` with TMPDIR at `tmp`
  // and checks that folder is empty afterwards; pushWith(extraEnv, ...args)
  // runs it with `extraEnv` laid over that (a TMPDIR of its own, a PATH),
  // and checks nothing.
  function hooked({ head } = {}) {
    const { dir, remote, work } = repos();
    const tmp = path.join(dir, 'tmpdir');
    fs.mkdirSync(tmp);
    git(work, 'config', 'core.hooksPath', path.join(work, '.git', 'hooks'));
    const inst = run(process.execPath, [INSTALLER, '--repo', work, '--go']);
    assert.equal(inst.status, 0, inst.err);
    const files = head ?? { 'projects/hooks/README.md': '# Hooks\n', ...Object.fromEntries(gateFiles().map((rel) => [rel, gateBytes(rel)])) };
    const base = commit(work, files, 'base');
    const pushWith = (extraEnv, ...args) => run('git', ['-C', work, 'push', 'origin', ...args], { extraEnv: { TMPDIR: tmp, ...extraEnv } });
    const push = (...args) => {
      const r = pushWith({}, ...args);
      assert.deepEqual(fs.readdirSync(tmp), [], `the hook left its temp copy behind; stderr:\n${r.err}`);
      return r;
    };
    return { dir, remote, work, base, tmp, push, pushWith };
  }
  const tipOf = (remote) => run('git', ['-C', remote, 'rev-parse', '-q', '--verify', 'refs/heads/main']).out.trim();

  // A module for the gate to import: it prints the real path of the folder
  // it runs from, so a push shows where the hook unpacked HEAD's copy. Read
  // while the copy exists; the hook removes it before git returns, so a path
  // printed by the test afterwards would no longer resolve.
  const GATE_EXTRA = [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "process.stderr.write(`gate-extra: running in ${fs.realpathSync.native(path.dirname(fileURLToPath(import.meta.url)))}\\n`);",
    '',
  ].join('\n');
  // Commits that module and an import of it in leak.mjs; returns the commit.
  const growGate = (work) => commit(work, {
    [`${GATE_ROOT}/tests/leak.mjs`]: Buffer.concat([gateBytes(`${GATE_ROOT}/tests/leak.mjs`), Buffer.from("\nimport '../lib/gate-extra.mjs';\n")]),
    [`${GATE_ROOT}/lib/gate-extra.mjs`]: GATE_EXTRA,
  }, 'the gate gains an import');
  // The hook's temp copy, from the folder gate-extra printed
  // (<copy>/projects/hooks/lib): {copy, base}, copy being
  // <base>/pre-push-leak.XXXXXX, as the hook's mktemp template names it.
  function copyOf(err) {
    const lib = /^gate-extra: running in (.+)$/m.exec(err)?.[1].replace(/\r$/, '');
    assert.ok(lib, `gate-extra did not run; stderr:\n${err}`);
    const copy = path.resolve(lib, '..', '..', '..');
    assert.equal(path.relative(copy, lib).split(path.sep).join('/'), `${GATE_ROOT}/lib`);
    assert.match(path.basename(copy), /^pre-push-leak\.[A-Za-z0-9]{6}$/);
    return { copy, base: path.dirname(copy) };
  }

  test('is refused on a leak, leaving the remote as it was, and goes through when clean', () => {
    const { remote, work, base, push } = hooked();
    const first = push('main');
    assert.equal(first.status, 0, first.err);
    assert.match(first.err, new RegExp(`pre-push leak gate: clean \\(1 commit, ${gateFiles().length + 1} file versions scanned\\)`));
    assert.equal(tipOf(remote), base);

    const leak = commit(work, { 'projects/hooks/tests/fixtures/x.json': leakJson() });
    const refused = push('main');
    assert.notEqual(refused.status, 0, 'git pushed a leak');
    assert.match(refused.err, /pre-push leak gate: the push is refused/);
    assert.deepEqual(hitsOf(refused.err), [`${short(leak)} projects/hooks/tests/fixtures/x.json uuid (line 2)`]);
    assert.equal(tipOf(remote), base, 'the remote moved');

    git(work, 'switch', '-q', '-c', 'fixed', base);
    const clean = commit(work, { 'projects/hooks/tests/fixtures/x.json': '{\n  "x": "synthetic"\n}\n' });
    const ok = push('fixed:main');
    assert.equal(ok.status, 0, ok.err);
    assert.equal(tipOf(remote), clean);
  });

  test("runs the gate HEAD commits, never the work tree's: gate files broken on disk refuse no clean push, and rules emptied on disk pass no leak", () => {
    const { remote, work, base, push } = hooked();
    assert.equal(push('main').status, 0);

    // Every gate file on disk replaced with a syntax error, none of it staged.
    for (const rel of gateFiles()) fs.writeFileSync(path.join(work, rel), 'this is not JavaScript (\n');
    const clean = commit(work, { 'projects/hooks/a.md': 'clean\n' });
    // Control: the work tree's gate, run directly, fails on this push.
    const direct = run(process.execPath, [path.join(work, GATE_ENTRY), 'origin', URL_WITH_CREDENTIAL], { cwd: work, input: refLine(clean, base) });
    assert.notEqual(direct.status, 0, "the broken work-tree gate ran clean: the test's control is wrong");
    const ok = push('main');
    assert.equal(ok.status, 0, ok.err);
    assert.match(ok.err, /pre-push leak gate: clean \(1 commit, 1 file version scanned\)/);
    assert.equal(tipOf(remote), clean);

    // The rules on disk emptied (the rest put back), none of it staged.
    restoreGate(work);
    fs.appendFileSync(path.join(work, 'projects/hooks/tests/leak.mjs'), '\nRULES.length = 0;\n');
    const leak = commit(work, { 'projects/hooks/tests/fixtures/x.json': leakJson() });
    // Control: the work tree's gate, run directly, passes this leak.
    const weak = run(process.execPath, [path.join(work, GATE_ENTRY), 'origin', URL_WITH_CREDENTIAL], { cwd: work, input: refLine(leak, clean) });
    assert.equal(weak.status, 0, `the weakened work-tree gate refused: the test's control is wrong; stderr:\n${weak.err}`);
    const refused = push('main');
    assert.notEqual(refused.status, 0, 'a rule emptied on disk let a leak through');
    assert.deepEqual(hitsOf(refused.err), [`${short(leak)} projects/hooks/tests/fixtures/x.json uuid (line 2)`]);
    assert.equal(tipOf(remote), clean, 'the remote moved');
  });

  test('a rule committed to HEAD judges the push that carries it; the same rule only on disk does not', () => {
    const { remote, work, push } = hooked();
    assert.equal(push('main').status, 0);
    const stricter = Buffer.concat([gateBytes('projects/hooks/tests/leak.mjs'), Buffer.from(MARKER_RULE)]);

    // On disk only: the push is judged by HEAD's rules, which don't know it.
    fs.writeFileSync(path.join(work, 'projects/hooks/tests/leak.mjs'), stricter);
    const one = commit(work, { 'projects/hooks/one.md': marker() });
    const ok = push('main');
    assert.equal(ok.status, 0, ok.err);
    assert.equal(tipOf(remote), one);

    // Committed: the next push is judged by it, the commit adding it included
    // (its source builds the pattern from pieces, so it passes its own rule).
    commit(work, { 'projects/hooks/tests/leak.mjs': stricter }, 'stricter rules');
    const two = commit(work, { 'projects/hooks/two.md': marker() });
    const refused = push('main');
    assert.notEqual(refused.status, 0, 'a committed rule was not applied');
    assert.deepEqual(hitsOf(refused.err), [`${short(two)} projects/hooks/two.md test-marker (line 1)`]);
    assert.equal(tipOf(remote), one, 'the remote moved');
  });

  // Why the hook takes the whole folder: the gate grows an import after the
  // hook is installed (here leak.mjs gains one of a module that did not
  // exist then), and the hook already installed runs it, unchanged. A hook
  // that extracted a fixed list of files would leave the new module out,
  // and the gate would fail closed on every push.
  // The same push is the positive control for every cleanup check in this
  // block: gate-extra ran from a copy inside the test's TMPDIR folder, which
  // push() then found empty, so an empty folder means the copy was removed,
  // not that it was made somewhere else.
  test('a gate that gains an import after the install runs through the same installed hook, since the whole folder comes from HEAD; the copy it runs from sits in TMPDIR', () => {
    const { remote, work, tmp, push } = hooked();
    assert.equal(push('main').status, 0);
    const hook = path.join(work, '.git', 'hooks', 'pre-push');
    assert.equal(fs.readFileSync(hook, 'utf8'), HOOK_TEXT);
    const head = growGate(work);
    const r = push('main');
    assert.equal(r.status, 0, r.err);
    assert.match(r.err, /pre-push leak gate: clean \(1 commit, 2 file versions scanned\)/);
    assert.equal(tipOf(remote), head);
    assert.equal(fs.readFileSync(hook, 'utf8'), HOOK_TEXT, 'the hook changed');
    const { copy, base } = copyOf(r.err);
    assert.equal(base, fs.realpathSync.native(tmp), 'the hook did not make its copy in TMPDIR');
    assert.ok(!fs.existsSync(copy), `the copy was left behind: ${copy}`);
  });

  // A TMPDIR naming a folder that is gone, or a plain file, makes mktemp
  // fail there; without a fallback every push, Back Nine's included, would
  // be refused. The copy goes to /tmp instead: the runner's /tmp on Linux,
  // and under Git Bash the user's %TEMP%, which it mounts at /tmp (measured
  // 2026-10-22; see install-git-hooks.mjs). Both cases work the same way.
  test('a TMPDIR naming a missing folder or a plain file falls back to /tmp: the push runs, and its copy there is removed', () => {
    const { dir, remote, work, pushWith } = hooked();
    growGate(work);
    const slashTmp = fs.realpathSync.native(process.platform === 'win32' ? process.env.TEMP : '/tmp');
    const missing = path.join(dir, 'no-such-folder');
    const plain = path.join(dir, 'a-plain-file');
    fs.writeFileSync(plain, 'not a folder\n');
    for (const tmpdir of [missing, plain]) {
      const head = commit(work, { [`projects/hooks/${path.basename(tmpdir)}.md`]: 'clean\n' });
      const r = pushWith({ TMPDIR: tmpdir }, 'main');
      assert.equal(r.status, 0, `TMPDIR=${tmpdir}: ${r.err}`);
      assert.match(r.err, /^pre-push leak gate: clean \(/m);
      assert.equal(tipOf(remote), head);
      const { copy, base } = copyOf(r.err);
      // This copy sits in the real /tmp, outside the test's own folders: one
      // left behind (a broken EXIT trap) is taken out before the test fails,
      // so a failing run leaves nothing there either.
      const left = fs.existsSync(copy);
      if (left) fs.rmSync(copy, { recursive: true, force: true });
      assert.equal(base, slashTmp, `TMPDIR=${tmpdir}: the copy was not made in /tmp`);
      assert.ok(!left, `TMPDIR=${tmpdir}: the copy in /tmp was left behind: ${copy}`);
    }
    assert.ok(!fs.existsSync(missing), 'mktemp made the missing TMPDIR folder');
    assert.equal(fs.readFileSync(plain, 'utf8'), 'not a folder\n');
  });

  // No temp folder anywhere: a stub mktemp first on PATH (git puts only its
  // own libexec folder ahead of PATH, measured) logs each call and fails it.
  // The hook tries TMPDIR, then /tmp, shows only the second complaint (the
  // fallback answers the first), and refuses by name before reading
  // anything; the remote is untouched.
  test('fails closed by name when no temp folder can be made, in TMPDIR or in /tmp', () => {
    const { dir, remote, work, tmp, pushWith } = hooked();
    const stub = path.join(dir, 'stub-bin');
    fs.mkdirSync(stub);
    fs.writeFileSync(path.join(stub, 'mktemp'), '#!/bin/sh\nprintf \'%s\\n\' "$*" >>"$STUB_LOG"\necho "mktemp stub: refused $*" >&2\nexit 1\n', { mode: 0o755 });
    // Forward slashes: sh opens a C:/... path on Windows, and Linux has none.
    const log = path.join(dir, 'mktemp-calls.log').split(path.sep).join('/');
    const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH');
    const r = pushWith({ [key]: `${stub}${path.delimiter}${env[key]}`, STUB_LOG: log }, 'main');
    assert.notEqual(r.status, 0, 'git pushed with no temp folder for the gate');
    assert.match(r.err, /^pre-push leak gate: internal error: could not make a temp folder for the gate \(mktemp, in \$TMPDIR and in \/tmp\)$/m);
    assert.match(r.err, /fails closed/);
    assert.match(r.err, /`git push --no-verify` skips the gate/);
    const calls = fs.readFileSync(log, 'utf8').trim().split('\n');
    assert.equal(calls.length, 2, calls.join('\n'));
    assert.match(calls[0], /^-d .+\/tmpdir\/pre-push-leak\.XXXXXX$/, 'the first try was not in TMPDIR');
    assert.equal(calls[1], '-d /tmp/pre-push-leak.XXXXXX');
    assert.deepEqual([...r.err.matchAll(/^mktemp stub: refused (.*)$/gm)].map((m) => m[1]), [calls[1]]);
    assert.equal(tipOf(remote), '', 'the remote received the push');
    assert.deepEqual(fs.readdirSync(tmp), []);
  });

  // The old hook ran the work tree's copies; this one never does, so the gate
  // on disk changes nothing. HEAD with the folder but no gate fails the
  // check after unpacking; HEAD with no folder at all fails git archive.
  test("fails closed by name when HEAD lacks the gate (its folder without it, or no folder at all), even with the gate's files on disk", () => {
    for (const [head, reason] of [
      [{ 'projects/hooks/README.md': '# Hooks\n' }, /^pre-push leak gate: internal error: HEAD has no projects\/hooks\/tools\/pre-push-leak\.mjs: the gate is not committed$/m],
      [{ 'README.md': '# Repo\n' }, /^pre-push leak gate: internal error: could not read the gate's folder from HEAD \(git archive HEAD -- projects\/hooks\)$/m],
    ]) {
      const { remote, work, push } = hooked({ head });
      restoreGate(work);
      const r = push('main');
      assert.notEqual(r.status, 0, `git pushed with no gate in HEAD (${Object.keys(head)})`);
      assert.match(r.err, reason);
      assert.match(r.err, /fails closed/);
      assert.match(r.err, /`git push --no-verify` skips the gate/);
      assert.equal(tipOf(remote), '', 'the remote received the push');
    }
  });
});
