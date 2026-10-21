// mine-paths --delete-temp: the temp/ rule (C16) in code. Only files this
// session created or read go, and only regular, git-ignored files inside
// <project>/temp/ that nobody changed since this session's call on them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { sleepMs } from '../scripts/lib.mjs';
import { removeTempFiles } from '../scripts/mine-paths.mjs';
import { fileTimes, git, initRepo, rm, runScript, scratch, write, writeTranscript } from './_helpers.mjs';

let root; let repo; let projects;
const at = (...p) => path.join(repo, ...p);

// Runs from a project folder (the repo root by default), as SKILL.md does.
function deleteTemp(args, cwd = repo, env = {}) {
  return runScript('mine-paths.mjs', ['--session', 'sess-self', ...args, '--delete-temp'],
    { env: { SQUEAKY_PROJECTS_DIR: projects, ...env }, cwd });
}

// A session registry holding this session's entry, recorded in folder `home`:
// the test process stands in for the session, alive, its start time real.
let regSeq = 0;
function registryAt(home) {
  const dir = path.join(root, `sessions-${++regSeq}`);
  const self = { pid: process.pid, sessionId: 'sess-self', cwd: home };
  const start = fileTimes([process.pid]).get(process.pid);
  if (start) self.procStart = start;
  write(path.join(dir, `${process.pid}.json`), JSON.stringify(self));
  return dir;
}
const ownRegistry = (home) => ({ SQUEAKY_SESSIONS_DIR: registryAt(home) });

before(() => {
  root = scratch('squeaky-deltemp-');
  repo = initRepo(path.join(root, 'repo'), { '.gitignore': 'temp/\n', 'src/edited.txt': 'e\n' });
  projects = path.join(root, 'projects');
  for (const f of ['mine-read.png', 'mine-written.txt', 'sub/deep.txt', 'a[1].png', 'a1.png', 'keep.png', 'peer.png', 'held.lock', 'rewritten.png', 'tracked.txt', 'copied-in.png']) {
    write(at('temp', ...f.split('/')), f);
  }
  git(repo, 'add', '-f', 'temp/tracked.txt'); // a file git tracks, inside the ignored temp/
  write(path.join(root, 'outside', 'precious.txt'), 'outside the temp dir');
  fs.symlinkSync(path.join(root, 'outside'), at('temp', 'jl'), 'junction');
  write(path.join(root, 'elsewhere', 'shot.png'), 'png');
  // A second project whose temp/ is a junction, and a third with no temp/ at all.
  write(path.join(root, 'link-target', 'shot2.png'), 'png');
  fs.mkdirSync(at('proj-linked'));
  fs.symlinkSync(path.join(root, 'link-target'), at('proj-linked', 'temp'), 'junction');
  fs.mkdirSync(at('proj-bare'));

  const readAt = Date.now(); // after every temp file above was created
  writeTranscript(path.join(projects, 'proj', 'sess-self.jsonl'), repo, [
    ['Read', { file_path: at('temp', 'mine-read.png') }],
    ['Write', { file_path: at('temp', 'mine-written.txt'), content: 'mine-written.txt' }],
    ['Read', { file_path: at('temp', 'sub', 'deep.txt') }],
    ['Read', { file_path: at('temp', 'a[1].png') }],
    ['Write', { file_path: at('temp', 'held.lock'), content: '' }],
    ['Read', { file_path: at('temp', 'rewritten.png') }],
    ['Read', { file_path: at('temp', 'tracked.txt') }],
    ['Read', { file_path: path.join(root, 'outside', 'precious.txt') }],
    ['Read', { file_path: path.join(root, 'elsewhere', 'shot.png') }],
    ['Read', { file_path: at('proj-linked', 'temp', 'shot2.png') }],
    ['Read', { file_path: at('temp', 'copied-in.png') }, { at: readAt }],
  ]);
  writeTranscript(path.join(projects, 'proj', 'sess-peer.jsonl'), repo, [
    ['Read', { file_path: at('temp', 'peer.png') }],
    ['Read', { file_path: at('temp', 'a1.png') }],
  ]);
  const later = new Date(Date.now() + 60_000);
  fs.utimesSync(at('temp', 'rewritten.png'), later, later); // someone wrote it after this session's Read
  // Someone copied a file over one this session read, keeping the copy's old
  // mtime: only its change time says it is new (its birth time stays older
  // than the Read: the copy overwrites the file in place).
  sleepMs(50);
  write(path.join(root, 'old-source.png'), 'an older picture');
  fs.copyFileSync(path.join(root, 'old-source.png'), at('temp', 'copied-in.png'));
  const old = new Date(Date.now() - 2 * 3_600_000);
  fs.utimesSync(at('temp', 'copied-in.png'), old, old);
});
after(() => rm(root));

describe('mine-paths.mjs --delete-temp', () => {
  test('--temp-dir must be temp/ right under the folder it runs from: anything else is refused, nothing touched', () => {
    for (const dir of [path.join(root, 'elsewhere'), repo, at('src'), at('temp', 'sub'), 'tmp']) {
      const r = deleteTemp(['--temp-dir', dir]);
      assert.equal(r.status, 2, dir);
      assert.match(r.stderr, /--temp-dir must be .*temp, the temp folder right under where this runs: refused, nothing deleted/);
    }
    assert.ok(fs.existsSync(path.join(root, 'elsewhere', 'shot.png')));
    assert.ok(fs.existsSync(at('src', 'edited.txt')));
  });

  test('refuses a temp/ that is itself a junction; nothing behind it is touched', () => {
    const r = deleteTemp(['--temp-dir', 'temp'], at('proj-linked'), ownRegistry(at('proj-linked')));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /is a link or junction: refused, nothing deleted/);
    assert.ok(fs.existsSync(path.join(root, 'link-target', 'shot2.png')));
  });

  test('needs --temp-dir, and takes neither --out nor --repo', () => {
    assert.equal(deleteTemp([]).status, 2);
    assert.equal(deleteTemp(['--temp-dir', 'temp', '--out', path.join(root, 'x.json')]).status, 2);
    assert.equal(deleteTemp(['--temp-dir', 'temp', '--repo', repo]).status, 2);
  });

  test('runs only from this session\'s own folder when its registry entry names one', () => {
    const r = deleteTemp(['--temp-dir', 'temp'], repo, ownRegistry(path.join(root, 'elsewhere')));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--delete-temp runs only from this session's own folder, .*elsewhere, not .*: refused, nothing deleted/);
    assert.ok(fs.existsSync(at('temp', 'mine-read.png')));
  });

  test('a registry that can\'t name this session\'s folder deletes nothing: missing, unreadable, or a dead entry', () => {
    const dead = path.join(root, 'sessions-dead');
    write(path.join(dead, '4242.json'), JSON.stringify({ pid: 4242, sessionId: 'sess-self', cwd: repo }));
    const unreadable = path.join(root, 'sessions-unreadable');
    write(path.join(unreadable, `${process.pid}.json`), '{"pid":');
    for (const env of [{}, { SQUEAKY_SESSIONS_DIR: dead }, { SQUEAKY_SESSIONS_DIR: unreadable }]) {
      const r = deleteTemp(['--temp-dir', 'temp'], repo, env);
      assert.equal(r.status, 2, JSON.stringify(env));
      assert.match(r.stderr, /can't find this session's own folder in the session registry: refused, nothing deleted/);
    }
    assert.ok(fs.existsSync(at('temp', 'mine-read.png')));
  });

  test('no temp dir: nothing to delete, and says so', () => {
    const r = deleteTemp(['--temp-dir', 'temp'], at('proj-bare'), ownRegistry(at('proj-bare')));
    assert.equal(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout);
    assert.deepEqual(o.deleted, []);
    assert.ok(o.warnings.some((w) => /nothing to delete/.test(w)));
  });

  // Runs last: it deletes.
  test('deletes exactly this session\'s files; keeps the rest with a reason, never "a peer\'s"', () => {
    const r = deleteTemp(['--temp-dir', 'temp'], repo, ownRegistry(repo));
    assert.equal(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout);
    assert.equal(o.tempDir.toLowerCase(), path.join(repo, 'temp').replace(/\\/g, '/').toLowerCase());
    assert.deepEqual(o.deleted, ['a[1].png', 'mine-read.png', 'mine-written.txt', 'sub/deep.txt']);
    assert.deepEqual(o.kept, [
      { path: 'a1.png', reason: 'not proven this session\'s' },
      { path: 'copied-in.png', reason: 'changed since this session last touched it' },
      { path: 'jl', reason: 'not proven this session\'s (a link)' },
      { path: 'keep.png', reason: 'not proven this session\'s' },
      { path: 'peer.png', reason: 'not proven this session\'s' },
      { path: 'rewritten.png', reason: 'changed since this session last touched it' },
    ]);
    assert.deepEqual(o.skipped, [
      { path: 'held.lock', reason: 'a lock file' },
      { path: 'tracked.txt', reason: 'not ignored by git' },
    ]);
    assert.doesNotMatch(r.stdout, /a peer's/);
    for (const f of ['a1.png', 'copied-in.png', 'keep.png', 'peer.png', 'held.lock', 'rewritten.png', 'tracked.txt']) assert.ok(fs.existsSync(at('temp', f)), `${f} must survive`);
    assert.ok(fs.statSync(at('temp', 'sub')).isDirectory(), 'folders are never deleted');
    assert.ok(fs.existsSync(path.join(root, 'outside', 'precious.txt')), 'nothing behind a link inside temp/ is touched');
  });
});

describe('removeTempFiles: every entry is re-checked right before it goes', () => {
  test('only an unchanged regular file inside the temp dir goes; a link, a folder, an escape, a lock, a rewrite and a vanished file stay', () => {
    const t = path.join(root, 'unit-temp');
    write(path.join(t, 'real.txt'), 'r');
    write(path.join(t, 'newer.txt'), 'n');
    write(path.join(t, 'sub', 'x.txt'), 'x');
    write(path.join(t, 'x.lock'), '');
    write(path.join(root, 'unit-outside', 'out.txt'), 'keep me');
    fs.symlinkSync(path.join(root, 'unit-outside'), path.join(t, 'jparent'), 'junction');
    fs.symlinkSync(path.join(t, 'sub'), path.join(t, 'jdir'), 'junction');
    write(path.join(t, 'copied.txt'), 'c');
    const old = new Date(Date.now() - 3_600_000);
    fs.utimesSync(path.join(t, 'copied.txt'), old, old); // an old mtime, a new change time
    const rels = ['real.txt', 'newer.txt', 'copied.txt', 'jdir', 'sub', 'jparent/out.txt', 'x.lock', 'gone.txt'];
    const limits = new Map(rels.map((r) => [r, Infinity]));
    limits.set('newer.txt', fs.statSync(path.join(t, 'newer.txt')).mtimeMs - 1000); // changed after our last call
    limits.set('copied.txt', old.getTime() + 60_000); // our call came after its mtime, before it was copied in
    const res = removeTempFiles(t, rels, limits);
    assert.deepEqual(res.deleted, ['real.txt']);
    assert.deepEqual(res.skipped.map((s) => [s.path, s.reason.replace(/, to .*$/, '')]), [
      ['newer.txt', 'changed since this session last touched it'],
      ['copied.txt', 'changed since this session last touched it'],
      ['jdir', 'a link'],
      ['sub', 'not a regular file'],
      ['jparent/out.txt', 'resolves outside the temp dir'],
      ['x.lock', 'a lock file'],
      ['gone.txt', 'gone (ENOENT)'],
    ]);
    assert.ok(fs.existsSync(path.join(root, 'unit-outside', 'out.txt')));
    assert.ok(fs.existsSync(path.join(t, 'sub', 'x.txt')));
    assert.ok(fs.existsSync(path.join(t, 'newer.txt')));
  });
});
