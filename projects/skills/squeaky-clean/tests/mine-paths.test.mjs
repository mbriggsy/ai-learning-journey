import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { gitEnv } from '../scripts/lib.mjs';
import { collectEvidence, headBlobs, shares, writeAtomic } from '../scripts/mine-paths.mjs';
import { git, initRepo, rm, runScript, scratch, slash, write, writeTranscript } from './_helpers.mjs';

const WIN = process.platform === 'win32';

let root; let repo; let projects; let out;
// A contested entry without its sha1, which these tests don't pin.
const plain = (o, p) => { const { sha, ...rest } = o.contested.find((c) => c.path === p) || {}; return rest; };
const sha1 = (file) => createHash('sha1').update(fs.readFileSync(file)).digest('hex');

function minePaths(args, env = {}) {
  return runScript('mine-paths.mjs', args, { env: { SQUEAKY_PROJECTS_DIR: projects, ...env } });
}

before(() => {
  root = scratch('squeaky-mine-');
  repo = initRepo(path.join(root, 'repo'), {
    '.gitignore': 'temp/\n',
    'edited.txt': 'e\n',
    'multi.txt': 'm\n',
    'peer-staged.txt': 'p\n',
    'scheduled.txt': 's\n',
    'peer-edited.txt': 'pe\n',
    'failed-edit.txt': 'f\n',
    'sub/agent-edited.txt': 'a\n',
    'jdir/target.txt': 't\n',
    'ren-old.txt': 'rename me\n'.repeat(10),
  });
  projects = path.join(root, 'projects');
  const at = (...p) => path.join(repo, ...p);
  const fwd = (p) => p.replace(/\\/g, '/');
  const link = path.join(root, 'jlink');
  fs.symlinkSync(path.join(repo, 'jdir'), link, 'junction');

  // The working tree after a session, its agents, a peer and a scheduled task.
  write(at('edited.txt'), 'e2\n');
  write(at('multi.txt'), 'm2\n');
  write(at('new-written.txt'), 'new\n');
  write(at('nb.ipynb'), '{}\n');
  write(at('peer-staged.txt'), 'p2\n');
  git(repo, 'add', 'peer-staged.txt'); // staged by a peer, no evidence of ours
  write(at('scheduled.txt'), 's2\n'); // a scheduled task's output
  write(at('peer-edited.txt'), 'pe2\n');
  write(at('peer-new.txt'), 'a peer wrote this\n'); // untracked; this session only Read it
  write(at('failed-edit.txt'), 'f2\n'); // a peer changed it; our Edit failed
  write(at('sub/agent-edited.txt'), 'a2\n');
  write(at('wf-written.txt'), 'wf\n');
  write(at('jdir/target.txt'), 't2\n');
  write(at('shell-only.txt'), 'hi\n');
  write(at('dot-swept.txt'), 'swept\n');
  write(at('bash-added.txt'), 'b\n');
  write(at('quoted dir/spaced name.txt'), 'q\n');
  write(at('sub/c-added.txt'), 'c\n');
  git(repo, 'add', '--', 'bash-added.txt', 'quoted dir/spaced name.txt', 'sub/c-added.txt');
  git(repo, 'mv', 'ren-old.txt', 'ren-new.txt');
  write(at('ren-new.txt'), 'rename me\n'.repeat(10) + 'edited\n');
  write(path.join(root, 'outside.txt'), 'o\n');
  write(at('temp/read.png'), 'png');
  write(at('temp/written.txt'), 'w');
  write(at('temp/sub/deep.txt'), 'd');
  write(at('temp/keep.png'), 'keep');
  write(at('temp/peer-read.png'), 'peer');
  write(at('temp/rewritten.png'), 'ours, then someone else rewrote it');

  const proj = path.join(projects, 'proj-a');
  writeTranscript(path.join(proj, 'sess-self.jsonl'), repo, [
    ['Edit', { file_path: at('edited.txt'), old_string: 'e', new_string: 'e2' }],
    ['MultiEdit', { file_path: at('multi.txt'), edits: [{ old_string: 'm', new_string: 'm2' }] }],
    ['Write', { file_path: at('new-written.txt'), content: 'new\n' }],
    ['NotebookEdit', { notebook_path: at('nb.ipynb'), new_source: '' }],
    ['Edit', { file_path: at('failed-edit.txt'), old_string: 'x', new_string: 'y' }, { error: true }],
    ['Edit', { file_path: path.join(link, 'target.txt'), old_string: 't', new_string: 't2' }],
    ['Edit', { file_path: at('ren-new.txt'), old_string: 'rename me\n'.repeat(10), new_string: `${'rename me\n'.repeat(10)}edited\n` }],
    ['Edit', { file_path: path.join(root, 'outside.txt'), old_string: 'o', new_string: 'o2' }],
    ['Bash', { command: 'echo hi > shell-only.txt' }],
    ['Bash', { command: 'git add .' }],
    ['Write', { file_path: at('bash-added.txt'), content: 'b\n' }],
    ['Write', { file_path: at('quoted dir', 'spaced name.txt'), content: 'q\n' }],
    ['Write', { file_path: at('sub', 'c-added.txt'), content: 'c\n' }],
    // A cd anywhere leaves the record's cwd (stamped after the call) no start: only absolute paths resolve.
    ['Bash', { command: `git add -- "${fwd(at('bash-added.txt'))}" && cd "${fwd(at('quoted dir'))}" && git add "spaced name.txt"` }],
    ['PowerShell', { command: 'git -C sub add c-added.txt' }],
    ['Read', { file_path: at('temp', 'read.png') }],
    ['Read', { file_path: at('temp', 'sub', 'deep.txt') }],
    ['Write', { file_path: at('temp', 'written.txt'), content: 'w' }],
    ['Read', { file_path: at('peer-edited.txt') }],
    ['Read', { file_path: at('peer-new.txt') }],
    ['Read', { file_path: at('temp', 'rewritten.png') }],
  ], { garbage: true });
  const later = new Date(Date.now() + 60_000);
  fs.utimesSync(at('temp', 'rewritten.png'), later, later); // changed after this session's Read
  writeTranscript(path.join(proj, 'sess-self', 'subagents', 'agent-sub1.jsonl'), repo, [
    ['Edit', { file_path: at('sub', 'agent-edited.txt'), old_string: 'a', new_string: 'a2' }],
  ]);
  writeTranscript(path.join(proj, 'sess-self', 'subagents', 'workflows', 'wf_test1', 'agent-wf1.jsonl'), repo, [
    ['Write', { file_path: at('wf-written.txt'), content: 'wf\n' }],
  ]);
  writeTranscript(path.join(proj, 'sess-peer.jsonl'), repo, [
    ['Edit', { file_path: at('peer-edited.txt'), old_string: 'pe', new_string: 'pe2' }],
    ['Read', { file_path: at('temp', 'peer-read.png') }],
  ]);

  const r = minePaths(['--session', 'sess-self', '--repo', repo, '--temp-dir', at('temp')]);
  assert.equal(r.status, 0, r.stderr);
  out = JSON.parse(r.stdout);
});

after(() => rm(root));

describe('mine-paths.mjs', () => {
  test('reads the main, subagent and workflow-agent transcripts, and only ours', () => {
    assert.equal(out.session, 'sess-self');
    assert.equal(out.transcripts, 3);
    assert.equal(out.repo, slash(fs.realpathSync.native(repo)));
  });

  test('an edited tracked file is mine; so are files this session wrote and git-added (quoted, after an absolute cd, via -C)', () => {
    for (const p of ['edited.txt', 'multi.txt', 'bash-added.txt', 'quoted dir/spaced name.txt', 'sub/c-added.txt']) {
      assert.ok(out.mine.includes(p), `${p} should be mine`);
    }
  });

  test('a Write\'d untracked file is mineNew; a NotebookEdit\'d one can\'t be compared line by line, so it is contested', () => {
    assert.ok(out.mineNew.includes('new-written.txt'));
    assert.deepEqual(plain(out, 'nb.ipynb'), { path: 'nb.ipynb', reason: 'foreign-hunks', untracked: true, detail: 'can\'t compare (a notebook edit)' });
  });

  test('subagent and workflow-agent edits count', () => {
    assert.ok(out.mine.includes('sub/agent-edited.txt'));
    assert.ok(out.mineNew.includes('wf-written.txt'));
  });

  test('a path through a directory junction resolves to the repo path', () => {
    assert.ok(out.mine.includes('jdir/target.txt'));
  });

  test('a staged rename where only the new side has evidence is split: that side contested, the other foreign', () => {
    // Someone else ran the git mv; this session only edited the new file.
    // Its own name has no HEAD copy, so the report's replay finds nothing for the Edit to change.
    assert.deepEqual(plain(out, 'ren-new.txt'), { path: 'ren-new.txt', reason: 'rename-split', pair: 'ren-old.txt', staged: true, detail: 'an Edit whose old_string the replay holds 0 times' });
    assert.ok(!out.mine.includes('ren-new.txt') && !out.mine.includes('ren-old.txt'));
    assert.ok(out.foreign.includes('ren-old.txt'));
    assert.ok(out.peerStaged.includes('ren-old.txt'), 'the old side\'s staged deletion is someone else\'s');
  });

  test('a peer-staged file is foreign and peerStaged', () => {
    assert.ok(out.foreign.includes('peer-staged.txt'));
    assert.ok(out.peerStaged.includes('peer-staged.txt'));
  });

  test('a file this session only Read stays foreign: a tracked peer-edited one and a peer\'s untracked new one', () => {
    for (const p of ['peer-edited.txt', 'peer-new.txt']) {
      assert.ok(out.foreign.includes(p), `${p} should be foreign`);
      assert.ok(!out.mine.includes(p) && !out.mineNew.includes(p), `${p} must not be mine`);
      assert.ok(!out.contested.some((c) => c.path === p), `${p} must not be contested`);
    }
  });

  test('an untouched dirty file (a scheduled task\'s) is foreign, not peer-staged', () => {
    assert.ok(out.foreign.includes('scheduled.txt'));
    assert.ok(!out.peerStaged.includes('scheduled.txt'));
  });

  test('a shell-only file, a `git add .` sweep, a peer session\'s edit and a failed Edit are all foreign', () => {
    for (const p of ['shell-only.txt', 'dot-swept.txt', 'peer-edited.txt', 'failed-edit.txt']) {
      assert.ok(out.foreign.includes(p), `${p} should be foreign`);
    }
  });

  test('the exact split, with nothing outside the repo', () => {
    assert.deepEqual(out.mine, ['bash-added.txt', 'edited.txt', 'jdir/target.txt', 'multi.txt',
      'quoted dir/spaced name.txt', 'sub/agent-edited.txt', 'sub/c-added.txt']);
    assert.deepEqual(out.mineNew, ['new-written.txt', 'wf-written.txt']);
    assert.deepEqual(out.contested.map((c) => c.path), ['nb.ipynb', 'ren-new.txt']);
    assert.deepEqual(out.foreign, ['dot-swept.txt', 'failed-edit.txt', 'peer-edited.txt', 'peer-new.txt',
      'peer-staged.txt', 'ren-old.txt', 'scheduled.txt', 'shell-only.txt']);
    assert.deepEqual(out.peerStaged, ['peer-staged.txt', 'ren-old.txt']);
  });

  test('the output names the temp dir as an absolute path', () => {
    assert.equal(out.tempDir, slash(path.join(repo, 'temp')));
  });

  test('temp: files this session read or wrote are tempMine; the rest (a peer\'s, one rewritten since) are tempKeep', () => {
    assert.deepEqual(out.tempMine, ['read.png', 'sub/deep.txt', 'written.txt']);
    assert.deepEqual(out.tempKeep, ['keep.png', 'peer-read.png', 'rewritten.png']);
  });

  test('a malformed transcript line is skipped and reported', () => {
    assert.ok(out.warnings.some((w) => /1 malformed transcript line/.test(w)));
  });

  test('a half-written final line of the main transcript (the live session still appending) is not reported as damage', () => {
    const f = path.join(projects, 'proj-a', 'sess-tail.jsonl');
    writeTranscript(f, repo, [['Edit', { file_path: path.join(repo, 'edited.txt'), old_string: 'e', new_string: 'e2' }]], { tail: true });
    const r = minePaths(['--session', 'sess-tail', '--repo', repo]);
    assert.equal(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout);
    assert.deepEqual(o.warnings, []);
    assert.deepEqual(o.mine, ['edited.txt']);
  });

  test('a subagent transcript\'s broken final line is damage: only the main one is still being written', () => {
    writeTranscript(path.join(projects, 'proj-a', 'sess-tail2.jsonl'), repo, [['Edit', { file_path: path.join(repo, 'edited.txt'), old_string: 'e', new_string: 'e2' }]]);
    writeTranscript(path.join(projects, 'proj-a', 'sess-tail2', 'subagents', 'agent-cut.jsonl'), repo, [['Read', { file_path: path.join(repo, 'edited.txt') }]], { tail: true });
    const r = minePaths(['--session', 'sess-tail2', '--repo', repo]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(JSON.parse(r.stdout).warnings.some((w) => /^1 malformed transcript line/.test(w)), r.stdout);
  });

  test('stdout leads with the small fields, counts each list, and ends with the long foreign lists', () => {
    assert.deepEqual(Object.keys(out), ['ok', 'session', 'repo', 'head', 'branch', 'defaultBranch', 'transcripts', 'tempDir', 'warnings', 'counts',
      'mine', 'mineNew', 'deleted', 'pairs', 'vanished', 'contested', 'tempMine', 'sha', 'foreign', 'peerStaged', 'tempKeep']);
    assert.equal(out.ok, true);
    assert.equal(out.head, git(repo, 'rev-parse', 'HEAD').trim());
    for (const k of ['mine', 'mineNew', 'vanished', 'contested', 'tempMine', 'foreign', 'peerStaged', 'tempKeep']) assert.equal(out.counts[k], out[k].length, k);
  });

  test('sha binds each mine and mineNew file to its bytes', () => {
    assert.deepEqual(Object.keys(out.sha), [...out.mine, ...out.mineNew].sort());
    for (const p of Object.keys(out.sha)) assert.equal(out.sha[p], sha1(path.join(repo, ...p.split('/'))), p);
  });

  test('branch and defaultBranch: the checked-out branch (null when detached) and origin\'s HEAD (null when unset)', () => {
    assert.deepEqual([out.branch, out.defaultBranch], ['main', null]);
    const r2 = initRepo(path.join(root, 'branches'), { 'f.txt': 'f\n' });
    git(r2, 'update-ref', 'refs/remotes/origin/trunk', 'HEAD');
    git(r2, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk');
    git(r2, 'checkout', '-q', '-b', 'feature');
    const named = JSON.parse(minePaths(['--session', 'sess-self', '--repo', r2]).stdout);
    assert.deepEqual([named.branch, named.defaultBranch], ['feature', 'trunk']);
    git(r2, 'checkout', '-q', '--detach');
    assert.equal(JSON.parse(minePaths(['--session', 'sess-self', '--repo', r2]).stdout).branch, null);
  });

  test('a temp dir that is itself a junction is never listed, even when a file through it was read', () => {
    const target = path.join(root, 'temp-target');
    write(path.join(target, 'shot.png'), 'png');
    const linked = path.join(repo, 'temp-linked');
    fs.symlinkSync(target, linked, 'junction');
    try {
      const f = path.join(projects, 'proj-a', 'sess-linkroot.jsonl');
      writeTranscript(f, repo, [['Read', { file_path: path.join(linked, 'shot.png') }]]);
      const r = minePaths(['--session', 'sess-linkroot', '--repo', repo, '--temp-dir', linked]);
      assert.equal(r.status, 0, r.stderr);
      const o = JSON.parse(r.stdout);
      assert.deepEqual([o.tempMine, o.tempKeep], [[], []]);
      assert.ok(o.warnings.some((w) => /is a link or junction/.test(w)));
    } finally {
      fs.rmSync(linked, { recursive: false, force: true });
    }
    assert.ok(fs.existsSync(path.join(target, 'shot.png')));
  });

  test('a temp link is never tempMine, even when its target was read', () => {
    const t = path.join(root, 'temp-with-link');
    fs.mkdirSync(t);
    fs.symlinkSync(path.join(repo, 'jdir'), path.join(t, 'jl'), 'junction');
    const r = minePaths(['--session', 'sess-self', '--repo', repo, '--temp-dir', t]);
    assert.equal(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout);
    assert.deepEqual(o.tempMine, []);
    assert.deepEqual(o.tempKeep, ['jl']);
  });

  test('a temp symlink to a file this session read is never tempMine', (t) => {
    const tdir = path.join(root, 'temp-with-file-link');
    fs.mkdirSync(tdir);
    try {
      fs.symlinkSync(path.join(repo, 'temp', 'read.png'), path.join(tdir, 'alias.png'), 'file');
    } catch (e) {
      if (e.code === 'EPERM') { t.skip('file symlinks need Developer Mode or admin on Windows'); return; }
      throw e;
    }
    const r = minePaths(['--session', 'sess-self', '--repo', repo, '--temp-dir', tdir]);
    assert.equal(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout);
    assert.deepEqual(o.tempMine, []);
    assert.deepEqual(o.tempKeep, ['alias.png']);
  });

  test('a session with no transcripts attributes nothing and says so', () => {
    const r = minePaths(['--session', 'sess-nobody', '--repo', repo]);
    assert.equal(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout);
    assert.equal(o.transcripts, 0);
    assert.deepEqual(o.mine, []);
    assert.deepEqual(o.mineNew, []);
    assert.ok(o.foreign.includes('edited.txt'));
    assert.ok(o.warnings.some((w) => /no transcripts found/.test(w)));
  });

  test('the session id defaults to CLAUDE_CODE_SESSION_ID; with none it refuses', () => {
    const ok = minePaths(['--repo', repo], { CLAUDE_CODE_SESSION_ID: 'sess-self' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.deepEqual(JSON.parse(ok.stdout).mine, out.mine);
    const none = minePaths(['--repo', repo]);
    assert.equal(none.status, 2);
    assert.match(none.stderr, /no usable session id/);
  });

  test('a session id that could escape the projects folder is refused', () => {
    const r = minePaths(['--session', '../proj-a/sess-self', '--repo', repo]);
    assert.equal(r.status, 2);
  });

  test('runs while a peer holds index.lock, and leaves the lock alone', () => {
    const lock = path.join(repo, '.git', 'index.lock');
    fs.writeFileSync(lock, '');
    try {
      const r = minePaths(['--session', 'sess-self', '--repo', repo]);
      assert.equal(r.status, 0, r.stderr);
      assert.ok(fs.existsSync(lock));
    } finally {
      fs.rmSync(lock, { force: true });
    }
  });

  test('never rewrites the index (GIT_OPTIONAL_LOCKS=0), where a plain git status would', () => {
    const r2 = initRepo(path.join(root, 'stat-dirty'), { 'f.txt': 'same\n' });
    const index = path.join(r2, '.git', 'index');
    const statDirty = () => {
      const later = new Date(Date.now() + 120_000);
      fs.utimesSync(path.join(r2, 'f.txt'), later, later); // same bytes, new stat
    };
    statDirty();
    const before = fs.readFileSync(index);
    const r = minePaths(['--session', 'sess-self', '--repo', r2]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.readFileSync(index).equals(before), 'mine-paths rewrote the index');
    // Control: the same state does make a plain status refresh the index.
    const raw = spawnSync('git', ['status', '--porcelain'], { cwd: r2, env: gitEnv({ GIT_OPTIONAL_LOCKS: '1' }), windowsHide: true });
    assert.equal(raw.status, 0);
    assert.ok(!fs.readFileSync(index).equals(before), 'control failed: plain git status did not refresh the index');
  });

  test('--out writes the whole JSON to the file and prints only one line of counts, then the warnings', () => {
    const file = path.join(root, 'out-ok', 'paths.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const r = minePaths(['--session', 'sess-self', '--repo', repo, '--out', file]);
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(json.mine, out.mine);
    const lines = r.stdout.trimEnd().split('\n');
    assert.equal(lines[0], `wrote ${slash(file)}: ${Object.entries(json.counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    assert.deepEqual(lines.slice(1), json.warnings.map((w) => `warning: ${w}`));
    assert.doesNotMatch(r.stdout, /"mine"/, 'never the JSON itself');
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['paths.json'], 'no temp file left behind');
  });

  test('writeAtomic retries a rename a scanner holds for a moment, and gives up cleanly', () => {
    const dir = path.join(root, 'atomic');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'out.json');
    let calls = 0;
    const flaky = (a, b) => { if (++calls < 3) throw Object.assign(new Error('busy'), { code: 'EBUSY' }); fs.renameSync(a, b); };
    writeAtomic(file, 'one', flaky);
    assert.equal(calls, 3);
    assert.equal(fs.readFileSync(file, 'utf8'), 'one');
    const stuck = () => { throw Object.assign(new Error('perm'), { code: 'EPERM' }); };
    assert.throws(() => writeAtomic(file, 'two', stuck), /perm/);
    assert.equal(fs.readFileSync(file, 'utf8'), 'one', 'the old file stands');
    assert.deepEqual(fs.readdirSync(dir), ['out.json'], 'the temp file is removed');
    const other = () => { throw Object.assign(new Error('nope'), { code: 'ENOSPC' }); };
    calls = 0;
    assert.throws(() => writeAtomic(file, 'three', (a, b) => { calls++; other(a, b); }), /nope/);
    assert.equal(calls, 1, 'only a held file is retried');
  });

  test('head: null on an unborn branch; any other failure to read HEAD refuses (exit 2)', () => {
    const unborn = path.join(root, 'unborn');
    fs.mkdirSync(unborn, { recursive: true });
    git(unborn, 'init', '-q', '-b', 'main');
    write(path.join(unborn, 'f.txt'), 'f\n');
    const r = minePaths(['--session', 'sess-self', '--repo', unborn]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).head, null);
    const broken = initRepo(path.join(root, 'broken-head'), { 'g.txt': 'g\n' });
    fs.writeFileSync(path.join(broken, '.git', 'HEAD'), `${'0123456789abcdef'.repeat(2)}01234567\n`); // a detached HEAD naming no object
    const bad = minePaths(['--session', 'sess-self', '--repo', broken]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /cannot read HEAD/);
  });

  test('a path on a network share is never opened: no fs call reaches it, and a warning counts it', async () => {
    const tr = path.join(root, 'unc-projects', 'proj', 'sess-unc.jsonl');
    const share = String.raw`\\evil-host\share`;
    writeTranscript(tr, share, [
      ['Edit', { file_path: String.raw`\\evil-host\share\x.txt`, old_string: 'a', new_string: 'b' }],
      ['Read', { file_path: '//evil-host/share/y.png' }],
      ['Bash', { command: String.raw`git add '\\evil-host\share\z.txt'` }],
      ['Bash', { command: 'git -C //evil-host/share add a.txt' }],
      ['Bash', { command: 'git reset //evil-host/share/f' }],
      ['Bash', { command: `git mv "${path.join(repo, 'edited.txt').replace(/\\/g, '/')}" //evil-host/share/dir` }],
      ['Bash', { command: 'git add rel.txt' }],
      ['PowerShell', { command: String.raw`git add \\evil-host\share\p.txt` }],
      ['Edit', { file_path: '\\\\?\\' + path.join(repo, 'multi.txt'), old_string: 'm', new_string: 'm2' }, { cwd: repo }],
    ]);
    const touched = [];
    const methods = ['statSync', 'lstatSync', 'existsSync', 'realpathSync', 'readFileSync', 'readdirSync', 'openSync', 'accessSync'];
    const saved = Object.fromEntries(methods.map((m) => [m, fs[m]]));
    const savedNative = fs.realpathSync.native;
    const spy = (name, fn) => function (p, ...rest) {
      if (typeof p === 'string' && /^[\\/]{2}(?![?.][\\/])/.test(p)) touched.push(`${name} ${p}`);
      return fn.call(this, p, ...rest);
    };
    for (const m of methods) fs[m] = spy(m, saved[m]);
    fs.realpathSync.native = spy('realpathSync.native', savedNative);
    let ev;
    try {
      ev = await collectEvidence([tr], 'sess-unc');
    } finally {
      for (const m of methods) fs[m] = saved[m];
      fs.realpathSync.native = savedNative;
    }
    assert.deepEqual(touched, [], 'a share path reached the file system');
    assert.ok(shares.seen >= 6, `share paths counted: ${shares.seen}`);
    // A \\?\ local device path is a Windows form; elsewhere it names no file.
    if (WIN) assert.ok([...ev.touched.keys()].some((k) => k.toLowerCase().endsWith('/multi.txt')), 'a \\\\?\\C:\\ local device path is the local file');
    const r = runScript('mine-paths.mjs', ['--session', 'sess-unc', '--repo', repo], { env: { SQUEAKY_PROJECTS_DIR: path.join(root, 'unc-projects') } });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(JSON.parse(r.stdout).warnings.some((w) => /path\(s\) on a network share in this session's tool calls were ignored, never opened/.test(w)));
  });

  test('headBlobs: a cat-file that fails is a warning naming git, and no file compares', () => {
    const warnings = [];
    const lone = path.join(root, 'not-a-repo-for-blobs');
    fs.mkdirSync(lone, { recursive: true });
    const got = headBlobs(lone, ['a.txt'], warnings);
    assert.equal(got.size, 0);
    assert.equal(warnings.length, 1);
    // git's message can span lines (Linux adds "Stopping at filesystem boundary").
    assert.match(warnings[0], /^git cat-file --batch failed \([\s\S]+\): no file can be compared with HEAD, so none is mine$/);
  });

  test('a failed run leaves the --out file absent, even when an earlier run wrote one', () => {
    const file = path.join(root, 'out-fail', 'paths.json');
    write(file, JSON.stringify({ mine: ['stale.txt'], mineNew: [] }));
    const notRepo = path.join(root, 'out-fail', 'not-a-repo');
    fs.mkdirSync(notRepo);
    const r = minePaths(['--session', 'sess-self', '--repo', notRepo, '--out', file], { GIT_CEILING_DIRECTORIES: root });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /not inside a git repository/);
    assert.equal(r.stdout, '');
    assert.ok(!fs.existsSync(file), 'a stale paths file survived a failed run');
  });

  test('an unknown option is refused', () => {
    const r = minePaths(['--session', 'sess-self', '--repo', repo, '--temp-dri', 'temp']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown option --temp-dri/);
  });

  test('a relative git add under a Git Bash cwd (/c/...) lands on the git status path', { skip: !WIN && 'Windows-only' }, () => {
    const real = fs.realpathSync.native(repo);
    const msys = `/${real[0].toLowerCase()}/${real.slice(3).replace(/\\/g, '/')}`;
    write(path.join(repo, 'msys-new.txt'), 'n\n');
    git(repo, 'add', 'msys-new.txt'); // staged here by "this session"
    try {
      writeTranscript(path.join(projects, 'proj-a', 'sess-msys.jsonl'), msys, [
        ['Write', { file_path: path.join(repo, 'msys-new.txt'), content: 'n\n' }],
        ['Bash', { command: 'git add msys-new.txt' }],
      ]);
      const r = minePaths(['--session', 'sess-msys', '--repo', repo]);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout).mine, ['msys-new.txt'], 'unresolved, the add would leave it staged-elsewhere');
    } finally {
      git(repo, 'rm', '-q', '--cached', '--', 'msys-new.txt');
      fs.rmSync(path.join(repo, 'msys-new.txt'));
    }
  });
});
