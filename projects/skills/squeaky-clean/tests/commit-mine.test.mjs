import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { isSecretName, landedCommit, landedReport, ourCommit, run, staleEntries } from '../scripts/commit-mine.mjs';
import { sleepMs } from '../scripts/lib.mjs';
import { git, gitWith, initRepo, rm, runScript, runScriptAsync, scratch, write, writeTranscript } from './_helpers.mjs';

const SESSION = 'sess-self';
const WIN = process.platform === 'win32';
let root;
let n = 0;

before(() => { root = scratch('squeaky-commit-'); });
after(() => rm(root));

// A fresh repo where a peer staged A, this session edited B and wrote C, and
// a scheduled task left D dirty.
function fixture() {
  const dir = path.join(root, `case-${++n}`);
  const repo = initRepo(path.join(dir, 'repo'), { 'A.txt': 'a\n', 'B.txt': 'b\n', 'D.txt': 'd\n' });
  write(path.join(repo, 'A.txt'), 'a-peer\n');
  git(repo, 'add', 'A.txt');
  write(path.join(repo, 'B.txt'), 'b-mine\n');
  write(path.join(repo, 'C.txt'), 'c-mine\n');
  write(path.join(repo, 'D.txt'), 'd-scheduled\n');
  return withMsg(dir, repo, 'test: commit only this session\'s paths\n');
}

function withMsg(dir, repo, text) {
  const msg = path.join(dir, 'msg.txt');
  write(msg, text);
  return { dir, repo, msg, head: git(repo, 'rev-parse', 'HEAD').trim() };
}

const sha1 = (file) => { try { return createHash('sha1').update(fs.readFileSync(file)).digest('hex'); } catch { return null; } };
const onDisk = (f, p) => path.join(f.repo, ...String(p).split('/'));

// A paths file as mine-paths writes it: this session's, for this repo, on
// main, each listed file's sha1 taken from the disk now (unless given).
function pathsFile(f, data) {
  const file = path.join(f.dir, `paths-${++n}.json`);
  const full = { session: SESSION, repo: f.repo, head: git(f.repo, 'rev-parse', 'HEAD').trim(), branch: 'main', mine: [], mineNew: [], contested: [], ...data };
  if (!data.sha) full.sha = Object.fromEntries([...full.mine, ...full.mineNew].map((p) => [p, sha1(onDisk(f, p))]));
  full.contested = full.contested.map((c) => ('sha' in c ? c : { ...c, sha: sha1(onDisk(f, c.path)) }));
  write(file, JSON.stringify(full));
  return file;
}

// Step 3's file when step 6 found the same: a copy, never the same file.
function copyOf(f, pj) {
  const file = path.join(f.dir, `step3-${++n}.json`);
  if (fs.existsSync(pj)) fs.copyFileSync(pj, file);
  return file;
}

function argvFor(f, data, extra = []) {
  const pj = typeof data === 'string' ? data : pathsFile(f, data);
  const expect = extra.includes('--expect') ? [] : ['--expect', copyOf(f, pj)];
  return ['--session', SESSION, '--repo', f.repo, '--message-file', f.msg, '--paths-json', pj, ...expect, ...extra];
}

const cm = (f, data, extra = [], opts = {}) => runScript('commit-mine.mjs', argvFor(f, data, extra), opts);

const headFiles = (repo) => git(repo, 'diff-tree', '-r', '--root', '--no-commit-id', '--name-only', '--no-renames', 'HEAD')
  .split('\n').filter(Boolean).sort();
const staged = (repo) => git(repo, 'diff', '--cached', '--name-only').split('\n').filter(Boolean).sort();
const status = (repo) => git(repo, 'status', '--porcelain=v1', '--untracked-files=all');
const hook = (repo, name, body) => {
  write(path.join(repo, '.git', 'hooks', name), body);
  fs.chmodSync(path.join(repo, '.git', 'hooks', name), 0o755);
};
const FAST = { env: { SQUEAKY_LOCK_BACKOFF_MS: '10,10,10' } };

describe('commit-mine.mjs', () => {
  test('end to end, step 3 then step 6: HEAD holds exactly B and C; the peer-staged A stays staged; D, which this session only Read, stays dirty', () => {
    const f = fixture();
    const projects = path.join(f.dir, 'projects');
    writeTranscript(path.join(projects, 'proj', 'sess-self.jsonl'), f.repo, [
      ['Edit', { file_path: path.join(f.repo, 'B.txt'), old_string: 'b', new_string: 'b-mine' }],
      ['Write', { file_path: path.join(f.repo, 'C.txt'), content: 'c-mine\n' }],
      ['Read', { file_path: path.join(f.repo, 'D.txt') }],
    ]);
    const step3 = path.join(f.dir, 'step3.json');
    const paths = path.join(f.dir, 'paths.json');
    for (const out of [step3, paths]) {
      const mp = runScript('mine-paths.mjs', ['--session', SESSION, '--repo', f.repo, '--out', out], { env: { SQUEAKY_PROJECTS_DIR: projects } });
      assert.equal(mp.status, 0, mp.stderr);
    }
    const json = JSON.parse(fs.readFileSync(paths, 'utf8'));
    assert.deepEqual([json.mine, json.mineNew, json.peerStaged, json.branch], [['B.txt'], ['C.txt'], ['A.txt'], 'main']);
    assert.deepEqual(json.sha, { 'B.txt': sha1(onDisk(f, 'B.txt')), 'C.txt': sha1(onDisk(f, 'C.txt')) });

    const r = cm(f, paths, ['--expect', step3]);
    assert.equal(r.status, 0, r.stderr);
    const sha = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    assert.match(r.stdout, new RegExp(`^committed ${sha}\\n`));
    assert.deepEqual(r.stdout.match(/^file: .*$/gm), ['file: B.txt', 'file: C.txt']);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD~1').trim(), f.head);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'C.txt']);
    assert.deepEqual(staged(f.repo), ['A.txt'], 'the peer-staged file must still be staged');
    assert.equal(git(f.repo, 'show', 'HEAD:A.txt'), 'a\n');
    assert.equal(git(f.repo, 'show', ':A.txt'), 'a-peer\n');
    assert.match(status(f.repo), /^ M D\.txt$/m);
    assert.equal(git(f.repo, 'log', '-1', '--format=%B').trim(), 'test: commit only this session\'s paths');
  });

  test('a file: line names every committed path in full, however long (the diffstat cuts them)', () => {
    const f = fixture();
    const long = `${'very-long-folder-name/'.repeat(4)}a-file-whose-name-is-long-too.txt`;
    write(path.join(f.repo, long), 'x\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: [long] });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^file: ${long.replace(/[.]/g, '\\.')}$`, 'm'));
    assert.doesNotMatch(r.stdout.split('\n').filter((l) => !l.startsWith('file: ')).join('\n'), new RegExp(long.replace(/[.]/g, '\\.')), 'control: the diffstat alone cuts it');
  });

  test('a held index.lock (at git add) is retried, then reported; the lock survives, and no unstage is tried', () => {
    const f = fixture();
    const lock = path.join(f.repo, '.git', 'index.lock');
    fs.writeFileSync(lock, '');
    const t0 = Date.now();
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] }, [], { env: { SQUEAKY_LOCK_BACKOFF_MS: '50,100,150' } });
    assert.equal(r.status, 1);
    assert.ok(Date.now() - t0 >= 300, 'the backoff waits were skipped');
    assert.match(r.stderr, /git add failed: index\.lock is held/);
    assert.match(r.stderr, /Tried 4 times; the lock was NOT deleted/);
    assert.doesNotMatch(r.stderr, /git reset|unstage/, 'an add the lock stopped staged nothing: there is nothing to unstage');
    assert.ok(fs.existsSync(lock), 'the lock must never be deleted');
    fs.rmSync(lock);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
  });

  test('a held index.lock at the commit step is retried, then reported; the lock survives', () => {
    const f = fixture();
    const lock = path.join(f.repo, '.git', 'index.lock');
    fs.writeFileSync(lock, '');
    const r = cm(f, { mine: ['B.txt'], mineNew: [] }, [], FAST);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /git commit failed: index\.lock is held/);
    assert.ok(fs.existsSync(lock));
    fs.rmSync(lock);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('our new file stranded by a failed unstage: the error names its --include, and the rerun from step 3 commits it on Briggsy\'s yes', () => {
    const f = fixture();
    // post-index-change fires after `git add` writes the index: the "peer" takes the lock right then.
    hook(f.repo, 'post-index-change', '#!/bin/sh\n: > "$(git rev-parse --git-dir)/index.lock"\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] }, [], FAST);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /git commit failed: index\.lock is held/);
    assert.equal((r.stderr.match(/git reset: index\.lock is held/g) || []).length, 3, 'the unstage must retry on the lock');
    assert.match(r.stderr, /they are still staged: C\.txt\. They are this session's own new files\. Rerun from step 3, where they show as contested staged-elsewhere; tell Briggsy they're ours; --include them on his yes:/);
    assert.match(r.stderr, /^ {2}--include C\.txt$/m);
    const lock = path.join(f.repo, '.git', 'index.lock');
    assert.ok(fs.existsSync(lock), 'the lock must never be deleted');
    fs.rmSync(lock);
    fs.rmSync(path.join(f.repo, '.git', 'hooks', 'post-index-change'));
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.deepEqual(staged(f.repo), ['A.txt', 'C.txt']);

    // The rerun, as SKILL.md says, from step 3: commit-mine's add left no evidence, so C.txt reads staged-elsewhere.
    const projects = path.join(f.dir, 'projects');
    writeTranscript(path.join(projects, 'proj', 'sess-self.jsonl'), f.repo, [
      ['Edit', { file_path: path.join(f.repo, 'B.txt'), old_string: 'b', new_string: 'b-mine' }],
      ['Write', { file_path: path.join(f.repo, 'C.txt'), content: 'c-mine\n' }],
    ]);
    const step3 = path.join(f.dir, 'rerun-step3.json');
    const paths = path.join(f.dir, 'rerun-paths.json');
    for (const out of [step3, paths]) {
      const mp = runScript('mine-paths.mjs', ['--session', SESSION, '--repo', f.repo, '--out', out], { env: { SQUEAKY_PROJECTS_DIR: projects } });
      assert.equal(mp.status, 0, mp.stderr);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(step3, 'utf8')).contested, [
      { path: 'C.txt', reason: 'staged-elsewhere', staged: true, addedForeign: 0, removedForeign: 0, sha: sha1(onDisk(f, 'C.txt')) },
    ]);
    const again = cm(f, paths, ['--include', 'C.txt', '--expect', step3]);
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /^included: C\.txt \(staged-elsewhere, staged\)$/m);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'C.txt']);
    assert.deepEqual(staged(f.repo), ['A.txt']);
  });

  test('a failed unstage names only the new files the index still holds', () => {
    const f = fixture();
    write(path.join(f.repo, '.gitignore'), 'late.txt\n');
    write(path.join(f.repo, 'late.txt'), 'l\n');
    hook(f.repo, 'post-index-change', '#!/bin/sh\n: > "$(git rev-parse --git-dir)/index.lock"\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt', 'late.txt'] }, [], FAST);
    fs.rmSync(path.join(f.repo, '.git', 'index.lock'), { force: true });
    fs.rmSync(path.join(f.repo, '.git', 'hooks', 'post-index-change'));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /git add failed: .*ignored/s);
    assert.match(r.stderr, /they are still staged: C\.txt\. They are/);
    assert.doesNotMatch(r.stderr, /--include late\.txt/, 'the ignored file never reached the index');
    assert.deepEqual(staged(f.repo), ['A.txt', 'C.txt']);
  });

  test('every lock retry hashes again: a file that changes while we wait is refused, nothing committed or left staged', async () => {
    for (const mineNew of [['C.txt'], []]) {
      const f = fixture();
      const lock = path.join(f.repo, '.git', 'index.lock');
      fs.writeFileSync(lock, '');
      let done = false;
      const r = await runScriptAsync('commit-mine.mjs', argvFor(f, { mine: ['B.txt'], mineNew }), {
        env: { SQUEAKY_LOCK_BACKOFF_MS: '300,300,300' },
        onStderr: (all) => {
          if (done || !/retrying in/.test(all)) return;
          done = true;
          write(path.join(f.repo, 'B.txt'), 'b-mine\npeer\n'); // the lock holder's edit
          fs.rmSync(lock, { force: true });
        },
      });
      assert.equal(r.status, 2, `${mineNew}: ${r.stderr}`);
      assert.match(r.stderr, /changed on disk while waiting for index\.lock: B\.txt/);
      assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
      assert.deepEqual(staged(f.repo), ['A.txt']);
    }
  });

  test('a peer\'s merge that starts while we wait for the lock stops the retry with exit 5, nothing committed', async () => {
    const f = fixture();
    const lock = path.join(f.repo, '.git', 'index.lock');
    fs.writeFileSync(lock, '');
    let done = false;
    const r = await runScriptAsync('commit-mine.mjs', argvFor(f, { mine: ['B.txt'], mineNew: ['C.txt'] }), {
      env: { SQUEAKY_LOCK_BACKOFF_MS: '300,300,300' },
      onStderr: (all) => {
        if (done || !/retrying in/.test(all)) return;
        done = true;
        fs.writeFileSync(path.join(f.repo, '.git', 'MERGE_HEAD'), `${f.head}\n`);
        fs.rmSync(lock, { force: true });
      },
    });
    fs.rmSync(path.join(f.repo, '.git', 'MERGE_HEAD'), { force: true });
    assert.equal(r.status, 5, r.stderr);
    assert.match(r.stderr, /a merge \(.*\) is in progress in the shared tree\. Nothing was staged\./, 'the lock stopped our git add: true');
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
  });

  test('exit 5 after our git add unstages our new files first, and only git ls-files may say nothing of ours is staged', async () => {
    const f = fixture();
    // post-index-change fires after `git add` writes the index: the "peer" takes the lock right then.
    hook(f.repo, 'post-index-change', '#!/bin/sh\n: > "$(git rev-parse --git-dir)/index.lock"\n');
    let done = false;
    const lock = path.join(f.repo, '.git', 'index.lock');
    const r = await runScriptAsync('commit-mine.mjs', argvFor(f, { mine: ['B.txt'], mineNew: ['C.txt'] }), {
      env: { SQUEAKY_LOCK_BACKOFF_MS: '300,300,300' },
      onStderr: (all) => {
        if (done || !/git commit: index\.lock is held/.test(all)) return;
        done = true;
        fs.rmSync(path.join(f.repo, '.git', 'hooks', 'post-index-change'));
        fs.writeFileSync(path.join(f.repo, '.git', 'MERGE_HEAD'), `${f.head}\n`);
        fs.rmSync(lock, { force: true });
      },
    });
    fs.rmSync(path.join(f.repo, '.git', 'MERGE_HEAD'), { force: true });
    assert.equal(r.status, 5, r.stderr);
    assert.match(r.stderr, /a merge \(.*\) is in progress in the shared tree\. Stop and report it/);
    assert.doesNotMatch(r.stderr, /Nothing was staged/);
    assert.match(r.stderr, /The new files were unstaged again: git ls-files lists none of them\. Nothing of ours is staged\./);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
  });

  test('a peer commit landing while we wait for the lock: our commit is still recognised as ours', async () => {
    const f = fixture();
    const lock = path.join(f.repo, '.git', 'index.lock');
    fs.writeFileSync(lock, '');
    let done = false;
    const r = await runScriptAsync('commit-mine.mjs', argvFor(f, { mine: ['B.txt'], mineNew: [] }), {
      env: { SQUEAKY_LOCK_BACKOFF_MS: '400,400,400' },
      onStderr: (all) => {
        if (done || !/retrying in/.test(all)) return;
        done = true;
        fs.rmSync(lock, { force: true });
        git(f.repo, 'commit', '-q', '-m', 'peer: while we waited', '--', 'D.txt');
      },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(f.repo, 'log', '-1', '--format=%s', 'HEAD~1').trim(), 'peer: while we waited');
    assert.match(r.stdout, new RegExp(`^committed ${git(f.repo, 'rev-parse', '--short', 'HEAD').trim()}\\n`));
  });

  test('a lock released during the backoff lets the commit land', async () => {
    const f = fixture();
    const lock = path.join(f.repo, '.git', 'index.lock');
    fs.writeFileSync(lock, '');
    // The "peer" finishes its git command once the script has hit the lock and said so.
    const r = await runScriptAsync('commit-mine.mjs', argvFor(f, { mine: ['B.txt'], mineNew: ['C.txt'] }), {
      env: { SQUEAKY_LOCK_BACKOFF_MS: '400,800,1600' },
      onStderr: (all) => { if (/retrying in/.test(all)) fs.rmSync(lock, { force: true }); },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /retrying in 400 ms/);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'C.txt']);
  });

  test('an empty mine set exits 4 (nothing to commit) and nothing changes', () => {
    const f = fixture();
    const before = status(f.repo);
    const r = cm(f, { mine: [], mineNew: [], foreign: ['A.txt', 'D.txt'] });
    assert.equal(r.status, 4);
    assert.match(r.stderr, /nothing of this session's to commit/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.equal(status(f.repo), before);
  });

  test('git\'s own "nothing to commit": a peer\'s commit took every listed path, new file included; exit 4 names that commit, and nothing of ours stays staged', () => {
    const f = fixture();
    const argv = argvFor(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    git(f.repo, 'add', 'B.txt', 'C.txt');
    git(f.repo, 'commit', '-q', '-m', 'peer: sweep', '--', 'B.txt', 'C.txt');
    const peer = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    const r = runScript('commit-mine.mjs', argv);
    assert.equal(r.status, 4, r.stderr);
    assert.match(r.stderr, /git says .*(nothing to commit|no changes added to commit|nothing added to commit)/s);
    for (const p of ['B', 'C']) assert.match(r.stdout, new RegExp(`^not in this commit: ${p}\\.txt \\(last changed in ${peer} peer: sweep\\)$`, 'm'));
    assert.equal(git(f.repo, 'rev-parse', '--short', 'HEAD').trim(), peer);
    assert.deepEqual(staged(f.repo), ['A.txt'], 'the new file the peer committed is not left staged by our add');
  });

  test('a git add that fails part way (a path ignored since) leaves nothing of ours staged', () => {
    const f = fixture();
    write(path.join(f.repo, '.gitignore'), 'late.txt\n');
    write(path.join(f.repo, 'late.txt'), 'l\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt', 'late.txt'] });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /git add failed: .*ignored/s);
    assert.match(r.stderr, /new files were unstaged again/);
    assert.deepEqual(staged(f.repo), ['A.txt'], 'C.txt, staged before git add gave up, must be unstaged');
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('an empty or truncated paths file is bad input (exit 2), never "nothing to commit"', () => {
    const f = fixture();
    for (const text of ['', '{"mine": ["B.t']) {
      const pj = path.join(f.dir, `broken-${++n}.json`);
      fs.writeFileSync(pj, text);
      const r = cm(f, pj);
      assert.equal(r.status, 2, r.stderr);
      assert.match(r.stderr, /cannot read the paths JSON/);
    }
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('the paths file must be this session\'s and name this repo; --session is required', () => {
    const f = fixture();
    const other = pathsFile(f, { session: 'sess-other', mine: ['B.txt'], mineNew: [] });
    const r1 = cm(f, other);
    assert.equal(r1.status, 2);
    assert.match(r1.stderr, /belongs to session "sess-other", not sess-self/);
    const noRepo = path.join(f.dir, 'no-repo.json');
    write(noRepo, JSON.stringify({ session: SESSION, mine: ['B.txt'], mineNew: [] }));
    const r2 = cm(f, noRepo);
    assert.equal(r2.status, 2);
    assert.match(r2.stderr, /names no repo/);
    const r3 = runScript('commit-mine.mjs', ['--repo', f.repo, '--message-file', f.msg, '--paths-json', pathsFile(f, { mine: ['B.txt'] })]);
    assert.equal(r3.status, 2);
    assert.match(r3.stderr, /--session is required/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('--expect is required, and must be step 3\'s own file: never the paths file, by any name', () => {
    const f = fixture();
    const pj = pathsFile(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    const base = ['--session', SESSION, '--repo', f.repo, '--message-file', f.msg, '--paths-json', pj];
    const none = runScript('commit-mine.mjs', base);
    assert.equal(none.status, 2);
    assert.match(none.stderr, /--expect is required: the file step 3 showed Briggsy\. If it is gone, rerun from step 3 and show him again/);
    const link = path.join(root, `link-${++n}`);
    fs.symlinkSync(f.dir, link, 'junction');
    for (const same of [pj, path.join(link, path.basename(pj))]) {
      const r = runScript('commit-mine.mjs', [...base, '--expect', same]);
      assert.equal(r.status, 2, same);
      assert.match(r.stderr, /--expect must be step 3's file, not the --paths-json file itself: rerun from step 3 and show Briggsy again/);
    }
    const missing = runScript('commit-mine.mjs', [...base, '--expect', path.join(f.dir, 'gone.json')]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /cannot read the --expect file/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
  });

  test('--expect: a mine or mineNew path step 3 never showed is refused, named, and nothing changes', () => {
    const f = fixture();
    const step3 = pathsFile(f, { mine: ['B.txt'], mineNew: [] });
    const r = cm(f, { mine: ['B.txt', 'D.txt'], mineNew: ['C.txt'] }, ['--expect', step3]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /changed since step 3: D\.txt \(mine now, not mine or mineNew in step 3\); C\.txt \(mineNew now, not mine or mineNew in step 3\)\. Nothing was staged\. Show Briggsy, then rerun from step 3/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    const moved = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] }, ['--expect', pathsFile(f, { mine: ['C.txt'], mineNew: ['B.txt'] })]);
    assert.equal(moved.status, 2, 'a path in the other list');
    assert.match(moved.stderr, /changed since step 3: B\.txt \(mine now, mineNew in step 3\); C\.txt \(mineNew now, mine in step 3\)/);
    const ok = cm(f, { mine: ['B.txt', 'D.txt'], mineNew: ['C.txt'] }, ['--expect', step3, '--exclude', 'D.txt', '--exclude', 'C.txt']);
    assert.equal(ok.status, 0, `an excluded path needs no step-3 match: ${ok.stderr}`);
  });

  test('--expect: bytes that are not the ones step 3 showed are refused, even in the same list', () => {
    const f = fixture();
    const step3 = pathsFile(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    write(path.join(f.repo, 'B.txt'), 'b-mine-and-more\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] }, ['--expect', step3]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /changed since step 3: B\.txt \(its content changed since step 3\)\. Nothing was staged\. Show Briggsy, then rerun from step 3/);
    const unhashed = cm(f, { mine: ['B.txt'], mineNew: [], sha: {} });
    assert.equal(unhashed.status, 2, 'a paths file with no sha for a path binds nothing');
    assert.match(unhashed.stderr, /changed since step 3: B\.txt/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('--expect: a step-3 mine path now contested or foreign is refused; one no longer dirty is reported, not committed', () => {
    const f = fixture();
    const step3 = pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: ['C.txt'] });
    const contested = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'], contested: [{ path: 'D.txt', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 0 }] }, ['--expect', step3]);
    assert.equal(contested.status, 2);
    assert.match(contested.stderr, /changed since step 3: D\.txt \(was mine, now foreign-hunks\)\. Nothing was staged\. Show Briggsy/);
    const foreign = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'], foreign: ['D.txt'] }, ['--expect', step3]);
    assert.equal(foreign.status, 2);
    assert.match(foreign.stderr, /changed since step 3: D\.txt \(was mine, now foreign\)/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('a step-3 mine path that is clean now because a commit since took it is reported, also on exit 4', () => {
    const f = fixture();
    const step3 = pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: [] });
    git(f.repo, 'commit', '-q', '-m', 'peer: took D', '--', 'D.txt');
    const peer = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    const r = cm(f, { mine: ['B.txt'], mineNew: [] }, ['--expect', step3]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^not in this commit: D\\.txt \\(taken by ${peer} peer: took D\\)$`, 'm'));
    const g = fixture();
    const only = pathsFile(g, { mine: ['B.txt'], mineNew: [] });
    git(g.repo, 'commit', '-q', '-m', 'peer: took B', '--', 'B.txt');
    const four = cm(g, { mine: [], mineNew: [] }, ['--expect', only]);
    assert.equal(four.status, 4, four.stderr);
    assert.match(four.stdout, /^not in this commit: B\.txt \(taken by \w+ peer: took B\)$/m);
  });

  test('a step-3 mine path whose work is gone (no commit since took it) stops with exit 6, nothing staged', () => {
    const f = fixture();
    const step3 = pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: ['C.txt'] });
    write(path.join(f.repo, 'D.txt'), 'd\n'); // a stash or a discard put HEAD's text back
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] }, ['--expect', step3]);
    assert.equal(r.status, 6, r.stderr);
    assert.match(r.stderr, /this session's uncommitted work on D\.txt vanished since step 3: it is neither on disk nor in a commit made since with step 3's bytes \(a stash, a checkout or a discard\)\. Nothing was staged\. Check git stash list/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
    const noHead = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] }, ['--expect', pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: ['C.txt'], head: undefined })]);
    assert.equal(noHead.status, 2, 'a step-3 file with no head can\'t tell taken from vanished');
    assert.match(noHead.stderr, /D\.txt \(clean now, and step 3's file names no head commit to check it against\)/);
  });

  test('a step-3 new file that became git-ignored is reported as such', () => {
    const f = fixture();
    write(path.join(f.repo, 'E.txt'), 'e\n');
    const step3 = pathsFile(f, { mine: ['B.txt'], mineNew: ['C.txt', 'E.txt'] });
    write(path.join(f.repo, '.git', 'info', 'exclude'), 'E.txt\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] }, ['--expect', step3]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^not in this commit: E\.txt \(now ignored\)$/m);
  });

  test('--expect: an --include whose contested entry changed in any field since step 3 is refused', () => {
    const f = fixture();
    const entry = { path: 'D.txt', reason: 'foreign-hunks', staged: true, addedForeign: 1, removedForeign: 1 };
    const now = { mine: ['B.txt'], mineNew: [], contested: [entry] };
    for (const was of [
      [],
      [{ ...entry, reason: 'unconfirmed' }],
      [{ path: 'D.txt', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 1 }],
      [{ ...entry, addedForeign: 2 }],
      [{ ...entry, detail: 'lines moved or reordered' }],
      [{ ...entry, sha: '0'.repeat(40) }],
    ]) {
      const r = cm(f, now, ['--include', 'D.txt', '--expect', pathsFile(f, { mine: ['B.txt'], mineNew: [], contested: was })]);
      assert.equal(r.status, 2, JSON.stringify(was));
      assert.match(r.stderr, was.length ? /changed since step 3: D\.txt \(its contested entry changed since step 3\)/ : /changed since step 3: D\.txt \(not contested in step 3\)/);
    }
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    const same = cm(f, now, ['--include', 'D.txt', '--expect', pathsFile(f, now)]);
    assert.equal(same.status, 0, same.stderr);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'D.txt']);
  });

  test('bytes that change after mine-paths read them are refused: before git add, and while the new files are being staged', () => {
    const f = fixture();
    const pj = pathsFile(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    write(path.join(f.repo, 'B.txt'), 'b-mine\npeer\n');
    const early = cm(f, pj);
    assert.equal(early.status, 2);
    assert.match(early.stderr, /changed on disk since mine-paths read it: B\.txt\. Nothing was staged\. Show Briggsy, then rerun from step 3/);
    assert.deepEqual(staged(f.repo), ['A.txt']);
    write(path.join(f.repo, 'B.txt'), 'b-mine\n');
    // A "peer" writes to B the moment our git add has written the index.
    hook(f.repo, 'post-index-change', '#!/bin/sh\necho peer >> B.txt\n');
    const late = cm(f, pj);
    assert.equal(late.status, 2);
    assert.match(late.stderr, /changed on disk while it was being staged: B\.txt/);
    assert.match(late.stderr, /new files were unstaged again/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
    assert.deepEqual(staged(f.repo), ['A.txt']);
  });

  test('a detached HEAD, or a branch other than step 3\'s, exits 5 before anything is staged', () => {
    const f = fixture();
    const data = { mine: ['B.txt'], mineNew: ['C.txt'] };
    git(f.repo, 'checkout', '-q', '--detach');
    const detached = cm(f, data);
    assert.equal(detached.status, 5, detached.stderr);
    assert.match(detached.stderr, /HEAD is detached in the shared tree\. Nothing was staged\./);
    git(f.repo, 'checkout', '-q', '-b', 'feature');
    const other = cm(f, data);
    assert.equal(other.status, 5, other.stderr);
    assert.match(other.stderr, /the shared tree is on branch feature, but step 3 saw main\. Nothing was staged\./);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
    assert.deepEqual(staged(f.repo), ['A.txt']);
    const there = cm(f, { ...data, branch: 'feature' });
    assert.equal(there.status, 0, `step 3 saw feature: ${there.stderr}`);
  });

  test('the branch and tree checks come before nothing-to-commit: a detached HEAD with nothing of ours is exit 5, not 4', () => {
    const f = fixture();
    git(f.repo, 'checkout', '-q', '--detach');
    const r = cm(f, { mine: [], mineNew: [] });
    assert.equal(r.status, 5, r.stderr);
    assert.match(r.stderr, /HEAD is detached/);
  });

  test('a rename goes in whole: excluding one side alone is refused and names the pair', () => {
    const dir = path.join(root, `case-${++n}`);
    const repo = initRepo(path.join(dir, 'repo'), { 'old.txt': 'rename me\n'.repeat(10), 'b.txt': 'b\n' });
    git(repo, 'mv', 'old.txt', 'new.txt');
    write(path.join(repo, 'b.txt'), 'b2\n');
    const g = withMsg(dir, repo, 'rename\n');
    const data = { mine: ['b.txt', 'new.txt', 'old.txt'], mineNew: [], pairs: [['old.txt', 'new.txt']] };
    const half = cm(g, data, ['--exclude', 'new.txt']);
    assert.equal(half.status, 2);
    assert.match(half.stderr, /--exclude new\.txt splits the rename old\.txt -> new\.txt: exclude both sides or neither/);
    const both = cm(g, data, ['--exclude', 'new.txt', '--exclude', 'old.txt']);
    assert.equal(both.status, 0, both.stderr);
    assert.deepEqual(headFiles(repo), ['b.txt']);
    assert.deepEqual(both.stdout.match(/^unstaged \(excluded\): .*$/gm).sort(), ['unstaged (excluded): new.txt', 'unstaged (excluded): old.txt']);
  });

  test('an excluded mine path this session staged is unstaged on exit 4 too, when every mine path is excluded', () => {
    const f = fixture();
    write(path.join(f.repo, 'D.txt'), 'd-mine\n');
    git(f.repo, 'add', 'D.txt');
    const r = cm(f, { mine: ['D.txt'], mineNew: [] }, ['--exclude', 'D.txt']);
    assert.equal(r.status, 4, r.stderr);
    assert.match(r.stdout, /^unstaged \(excluded\): D\.txt$/m);
    assert.deepEqual(staged(f.repo), ['A.txt']);
  });

  test('an excluded staged path that can\'t be unstaged (the lock) stops with exit 1, naming it; one whose bytes moved is left alone', () => {
    const f = fixture();
    write(path.join(f.repo, 'D.txt'), 'd-mine\n');
    git(f.repo, 'add', 'D.txt');
    const lock = path.join(f.repo, '.git', 'index.lock');
    fs.writeFileSync(lock, '');
    const held = cm(f, { mine: ['B.txt', 'D.txt'], mineNew: [] }, ['--exclude', 'D.txt'], FAST);
    fs.rmSync(lock);
    assert.equal(held.status, 1, held.stderr);
    assert.match(held.stderr, /could not unstage the excluded paths .*; they are still staged: D\.txt\. Nothing was committed\./s);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    const pj = pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: [] });
    write(path.join(f.repo, 'D.txt'), 'd-mine and a peer\n'); // the bytes moved after mine-paths read them
    const moved = cm(f, pj, ['--exclude', 'D.txt']);
    assert.equal(moved.status, 0, moved.stderr);
    assert.match(moved.stderr, /left staged \(excluded\): D\.txt: the index no longer holds the bytes mine-paths recorded/);
    assert.deepEqual(staged(f.repo), ['A.txt', 'D.txt']);
  });

  test('a commit since step 3 that holds other bytes than step 3 saw is not "taken": exit 6', () => {
    const f = fixture();
    const step3 = pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: [] });
    write(path.join(f.repo, 'D.txt'), 'd-peer-version\n'); // a peer discarded ours and committed its own
    git(f.repo, 'commit', '-q', '-m', 'peer: own D', '--', 'D.txt');
    const r = cm(f, { mine: ['B.txt'], mineNew: [] }, ['--expect', step3]);
    assert.equal(r.status, 6, r.stderr);
    assert.match(r.stderr, /uncommitted work on D\.txt vanished since step 3: it is neither on disk nor in a commit made since with step 3's bytes/);
    assert.doesNotMatch(r.stdout, /taken by/);
  });

  test('a HEAD moved back to an older commit holding step 3\'s bytes is not "taken": exit 6', () => {
    const f = fixture();
    git(f.repo, 'commit', '-q', '-m', 'old: D as step 3 will see it', '--', 'D.txt');
    const old = git(f.repo, 'rev-parse', 'HEAD').trim();
    write(path.join(f.repo, 'D.txt'), 'd\n');
    git(f.repo, 'commit', '-q', '-m', 'D back', '--', 'D.txt');
    write(path.join(f.repo, 'D.txt'), 'd-scheduled\n');
    const step3 = pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: [] });
    git(f.repo, 'reset', '-q', old); // a peer moved HEAD back: D is clean, and no commit since step 3 took it
    const r = cm(f, { mine: ['B.txt'], mineNew: [] }, ['--expect', step3]);
    assert.equal(r.status, 6, r.stderr);
    assert.match(r.stderr, /uncommitted work on D\.txt vanished since step 3/);
    assert.doesNotMatch(r.stdout, /taken by/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), old);
  });

  test('a peer\'s rebase in progress reads as exit 5, before any step-3 path can read as vanished', () => {
    const f = fixture();
    const step3 = pathsFile(f, { mine: ['B.txt', 'D.txt'], mineNew: [] });
    write(path.join(f.repo, 'D.txt'), 'd\n'); // its autostash took our edit
    fs.mkdirSync(path.join(f.repo, '.git', 'rebase-merge'));
    const r = cm(f, { mine: ['B.txt'], mineNew: [] }, ['--expect', step3]);
    fs.rmSync(path.join(f.repo, '.git', 'rebase-merge'), { recursive: true });
    assert.equal(r.status, 5, r.stderr);
    assert.match(r.stderr, /a rebase .* is in progress in the shared tree\. Nothing was staged\./);
  });

  test('a rename-split side goes in only with its pair', () => {
    const dir = path.join(root, `case-${++n}`);
    const repo = initRepo(path.join(dir, 'repo'), { 'old.txt': 'rename me\n'.repeat(10) });
    git(repo, 'mv', 'old.txt', 'new.txt');
    write(path.join(repo, 'new.txt'), `${'rename me\n'.repeat(10)}edited\n`);
    const g = withMsg(dir, repo, 'rename\n');
    const data = { mine: [], mineNew: [], contested: [
      { path: 'new.txt', reason: 'foreign-hunks', pair: 'old.txt', addedForeign: 1, removedForeign: 0 },
      { path: 'old.txt', reason: 'rename-split', pair: 'new.txt' },
    ] };
    const alone = cm(g, data, ['--include', 'old.txt']);
    assert.equal(alone.status, 2);
    assert.match(alone.stderr, /--include old\.txt is one side of a rename with new\.txt: include new\.txt too, or leave both out/);
    assert.equal(git(repo, 'rev-parse', 'HEAD').trim(), g.head);
    const both = cm(g, data, ['--include', 'old.txt', '--include', 'new.txt']);
    assert.equal(both.status, 0, both.stderr);
    assert.deepEqual(headFiles(repo), ['new.txt', 'old.txt']);
  });

  test('an excluded mine path this session staged is unstaged after the commit, so no peer\'s commit sweeps it up', () => {
    const f = fixture();
    write(path.join(f.repo, 'D.txt'), 'd-mine\n');
    git(f.repo, 'add', 'D.txt'); // our own git add
    const r = cm(f, { mine: ['B.txt', 'D.txt'], mineNew: [] }, ['--exclude', 'D.txt']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^unstaged \(excluded\): D\.txt$/m);
    assert.deepEqual(staged(f.repo), ['A.txt'], 'the peer-staged A stays staged; our excluded D does not');
    assert.match(status(f.repo), /^ M D\.txt$/m);
  });

  test('a merge, rebase, cherry-pick or revert in progress exits 5 before anything is staged', () => {
    const f = fixture();
    const pj = pathsFile(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    const before = status(f.repo);
    for (const marker of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD']) {
      const file = path.join(f.repo, '.git', marker);
      fs.writeFileSync(file, `${f.head}\n`);
      const r = cm(f, pj);
      fs.rmSync(file);
      assert.equal(r.status, 5, `${marker}: ${r.stderr}`);
      assert.match(r.stderr, /in progress in the shared tree\. Nothing was staged\./);
    }
    for (const marker of ['rebase-merge', 'rebase-apply']) {
      const d = path.join(f.repo, '.git', marker);
      fs.mkdirSync(d);
      const r = cm(f, pj);
      fs.rmSync(d, { recursive: true });
      assert.equal(r.status, 5, `${marker}: ${r.stderr}`);
      assert.match(r.stderr, /a rebase/);
    }
    assert.equal(status(f.repo), before, 'nothing may be staged into the other operation');
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('a real peer merge left open: exit 5, and the merge is left exactly as it was', () => {
    const dir = path.join(root, `case-${++n}`);
    const repo = initRepo(path.join(dir, 'repo'), { 'a.txt': 'a\n', 'b.txt': 'b\n' });
    git(repo, 'checkout', '-q', '-b', 'side');
    write(path.join(repo, 'side.txt'), 'side\n');
    git(repo, 'add', 'side.txt');
    git(repo, 'commit', '-q', '-m', 'side');
    git(repo, 'checkout', '-q', 'main');
    git(repo, 'merge', '-q', '--no-commit', '--no-ff', 'side');
    write(path.join(repo, 'b.txt'), 'b-mine\n');
    write(path.join(repo, 'mine-new.txt'), 'n\n');
    const f = withMsg(dir, repo, 'x\n');
    const mergeHead = fs.readFileSync(path.join(repo, '.git', 'MERGE_HEAD'), 'utf8');
    const r = cm(f, { mine: ['b.txt'], mineNew: ['mine-new.txt'] });
    assert.equal(r.status, 5, r.stderr);
    assert.match(r.stderr, /a merge \(/);
    assert.equal(fs.readFileSync(path.join(repo, '.git', 'MERGE_HEAD'), 'utf8'), mergeHead);
    assert.deepEqual(staged(repo), ['side.txt']);
    assert.match(status(repo), /^\?\? mine-new\.txt$/m);
  });

  test('unmerged entries with no merge marker (a stash pop that conflicted) exit 5 too', () => {
    const f = fixture();
    git(f.repo, 'stash', '-q');
    write(path.join(f.repo, 'B.txt'), 'b-other\n');
    git(f.repo, 'commit', '-q', '-am', 'other');
    try { git(f.repo, 'stash', 'pop'); } catch { /* the conflict is the point */ }
    assert.notEqual(git(f.repo, 'ls-files', '-u'), '', 'control: B.txt is unmerged');
    const r = cm(withMsg(f.dir, f.repo, 'x\n'), { mine: ['D.txt'], mineNew: [] });
    assert.equal(r.status, 5, r.stderr);
    assert.match(r.stderr, /unmerged index entries/);
  });

  test('an unknown option is refused (exit 2) before anything runs', () => {
    const f = fixture();
    const r = cm(f, { mine: ['B.txt'], mineNew: [] }, ['--exlude', 'B.txt']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown option --exlude/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('pathspecs are literal: a mine file named f[1].txt never sweeps a peer\'s f1.txt in', () => {
    const dir = path.join(root, `case-${++n}`);
    const repo = initRepo(path.join(dir, 'repo'), { 'f1.txt': 'peer\n' });
    write(path.join(repo, 'f1.txt'), 'peer-changed\n');
    git(repo, 'add', 'f1.txt');
    write(path.join(repo, 'f[1].txt'), 'mine\n');
    const r = cm(withMsg(dir, repo, 'literal\n'), { mine: [], mineNew: ['f[1].txt'] });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(headFiles(repo), ['f[1].txt']);
    assert.deepEqual(staged(repo), ['f1.txt']);
  });

  test('hooks never inherit GIT_LITERAL_PATHSPECS (pathspecs are literal by :(literal) magic instead)', () => {
    const f = fixture();
    const seen = path.join(f.dir, 'hook-saw.txt');
    hook(f.repo, 'pre-commit', `#!/bin/sh\nprintf '[%s]' "$GIT_LITERAL_PATHSPECS" > "${seen.replace(/\\/g, '/')}"\n`);
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.readFileSync(seen, 'utf8'), '[]');
  });

  test('a failing pre-commit hook leaves the new files untracked again', () => {
    const f = fixture();
    hook(f.repo, 'pre-commit', '#!/bin/sh\necho "hook says no" >&2\nexit 1\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /hook says no/);
    assert.match(r.stderr, /new files were unstaged again/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.match(status(f.repo), /^\?\? C\.txt$/m);
    assert.deepEqual(staged(f.repo), ['A.txt']);
  });

  test('a commit that picked up a path we did not list exits 3 and names it', () => {
    const f = fixture();
    hook(f.repo, 'pre-commit', '#!/bin/sh\ngit add D.txt\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: [] });
    assert.equal(r.status, 3, r.stderr);
    assert.match(r.stderr, /STOP: commit \w+ holds paths that were not in the list: D\.txt/);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'D.txt']);
  });

  test('a cleanup that throws after the commit changes nothing: the sha is printed and the exit stays 0 (or 3)', () => {
    for (const withHook of [false, true]) {
      const f = fixture();
      if (withHook) hook(f.repo, 'pre-commit', '#!/bin/sh\ngit add D.txt\n');
      const out = [];
      const err = [];
      const tmps = [];
      const code = run(argvFor(f, { mine: ['B.txt'], mineNew: [] }), {
        say: (s) => out.push(s),
        log: (s) => err.push(s),
        removeDir: (d) => { tmps.push(d); throw Object.assign(new Error('busy'), { code: 'EBUSY' }); },
      });
      for (const d of tmps) rm(d);
      assert.equal(code, withHook ? 3 : 0, err.join('\n'));
      assert.equal(out[0], `committed ${git(f.repo, 'rev-parse', '--short', 'HEAD').trim()}`);
      assert.ok(err.some((l) => /warning: could not remove .* \(EBUSY\)/.test(l)), err.join('\n'));
    }
  });

  test('--exclude keeps a path out (a binary, a generated file) and says so', () => {
    const f = fixture();
    write(path.join(f.repo, 'dump.bin'), 'x\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt', 'dump.bin'] }, ['--exclude', 'dump.bin']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^excluded: dump\.bin$/m);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'C.txt']);
    assert.match(status(f.repo), /^\?\? dump\.bin$/m);
  });

  test('--exclude forgives backslashes and a leading ./, and a trailing / keeps a whole folder out', () => {
    const f = fixture();
    write(path.join(f.repo, 'cfg', 'settings.json'), '{}\n');
    write(path.join(f.repo, 'out', 'a.bin'), 'a');
    write(path.join(f.repo, 'out', 'deep', 'b.bin'), 'b');
    const r = cm(f, { mine: ['B.txt', 'D.txt'], mineNew: ['C.txt', 'cfg/settings.json', 'out/a.bin', 'out/deep/b.bin'] },
      ['--exclude', '.\\cfg\\settings.json', '--exclude', './out/', '--exclude', 'D.txt']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.stdout.match(/^excluded: .*$/gm), ['excluded: D.txt', 'excluded: cfg/settings.json', 'excluded: out/a.bin', 'excluded: out/deep/b.bin']);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'C.txt']);
    assert.match(status(f.repo), /^ M D\.txt$/m, 'an excluded tracked path stays dirty, uncommitted');
  });

  test('an --exclude that matches nothing is refused (exit 2), names it and lists the candidates; nothing is committed', () => {
    const f = fixture();
    write(path.join(f.repo, 'dump.bin'), 'x\n');
    const before = status(f.repo);
    // A cwd-relative spelling from a project subfolder: never guessed at.
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt', 'dump.bin'] }, ['--exclude', 'proj/dump.bin']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--exclude "proj\/dump\.bin" matches no path/);
    assert.match(r.stderr, /Candidates: B\.txt, C\.txt, dump\.bin/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    assert.equal(status(f.repo), before);
  });

  test('a secret-like name is refused unless excluded or allowed by path', () => {
    const f = fixture();
    write(path.join(f.repo, 'cfg', '.env.local'), 'KEY=x\n');
    const data = { mine: ['B.txt'], mineNew: ['C.txt', 'cfg/.env.local'] };
    const refused = cm(f, data);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /secret-like file names: cfg\/\.env\.local/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
    const stray = cm(f, data, ['--allow-secret-name', 'cfg/.env.local', '--allow-secret-name', 'nope.env']);
    assert.equal(stray.status, 2, 'an allow that matches nothing is refused');
    assert.match(stray.stderr, /--allow-secret-name "nope\.env" matches no path/);
    const allowed = cm(f, data, ['--allow-secret-name', 'cfg/.env.local']);
    assert.equal(allowed.status, 0, allowed.stderr);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'C.txt', 'cfg/.env.local']);
  });

  test('which names count as secret-like', () => {
    for (const p of ['.env', 'a/.env.production', 'prod.env', '.envrc', 'worker/.dev.vars', '.npmrc', 'k/server.pem', 'tls.KEY', 'c.p12', 'c.pfx',
      'release.keystore', 'upload.jks', 'id_rsa', '.ssh/id_rsa.pub', 'id_ed25519', 'id_ecdsa_sk', 'gcp-credentials.json', 'credentials.json',
      'client_secret_123.apps.googleusercontent.com.json', 'auth/token.json', 'credentials', '.aws/credentials', '.git-credentials', '.netrc', '.pypirc',
      'api/local.settings.json']) assert.ok(isSecretName(p), p);
    for (const p of ['env.ts', 'a.env.md', 'keys.txt', 'monkey.txt', 'credentials.md', 'rsa.txt', 'my-id_rsa-notes.md', 'my-token.json',
      'token.json.md', 'npmrc.txt', 'client_secret.txt', 'keystore.md', 'dev.vars.ts', 'credentials.txt', 'netrc.md', 'settings.json', 'my-credentials']) assert.ok(!isSecretName(p), p);
  });

  test('a UTF-16LE message file (Windows PowerShell 5.1 `>`) and a UTF-8 BOM one commit the right text', () => {
    for (const [label, bytes] of [
      ['utf16', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('fix: café ✓\n', 'utf16le')])],
      ['utf8bom', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('fix: café ✓\n', 'utf8')])],
    ]) {
      const f = fixture();
      fs.writeFileSync(f.msg, bytes);
      const r = cm(f, { mine: ['B.txt'], mineNew: [] });
      assert.equal(r.status, 0, `${label}: ${r.stderr}`);
      assert.equal(git(f.repo, 'log', '-1', '--format=%B').trim(), 'fix: café ✓', label);
    }
  });

  test('a peer commit landing right after ours (post-commit hook) is never reported as ours', () => {
    const f = fixture();
    hook(f.repo, 'post-commit', '#!/bin/sh\nunset GIT_INDEX_FILE\ngit add D.txt && git commit -q -m "peer: scheduled output" -- D.txt\n');
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(f.repo, 'log', '-1', '--format=%s').trim(), 'peer: scheduled output', 'control: the peer commit is HEAD');
    const ours = git(f.repo, 'rev-parse', '--short', 'HEAD~1').trim();
    assert.match(r.stdout, new RegExp(`^committed ${ours}\\n`));
    assert.match(r.stdout, /^file: B\.txt$/m);
    assert.doesNotMatch(r.stdout, /D\.txt/);
  });

  test('a listed path a peer\'s whole-index commit already took is reported, with that commit', () => {
    const f = fixture();
    git(f.repo, 'add', 'C.txt'); // our new file, left staged (a failed unstage, a lock)...
    git(f.repo, 'commit', '-q', '-m', 'peer: sweep everything'); // ...and a peer's plain commit takes it, and A
    const peer = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(headFiles(f.repo), ['B.txt']);
    assert.match(r.stdout, new RegExp(`^not in this commit: C\\.txt \\(last changed in ${peer} peer: sweep everything\\)$`, 'm'));
  });

  test('ourCommit: without a summary line, HEAD counts only when it sits right on the starting commit', () => {
    const f = fixture();
    git(f.repo, 'commit', '-q', '-m', 'ours', '--', 'B.txt');
    const oursSha = git(f.repo, 'rev-parse', 'HEAD').trim();
    assert.equal(ourCommit('', f.head, f.repo, 'ours\n'), oursSha);
    const short = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    git(f.repo, 'commit', '-q', '-m', 'peer', '--', 'D.txt');
    assert.equal(ourCommit('', f.head, f.repo, 'ours\n'), null, 'HEAD is a peer commit on top of ours');
    assert.equal(ourCommit(`[main ${short}] ours\n 1 file changed\n`, f.head, f.repo, 'ours\n'), oursSha);
  });

  test('ourCommit: a summary line counts only for a commit on our starting point with our message', () => {
    const f = fixture();
    git(f.repo, 'checkout', '-q', '-b', 'side');
    git(f.repo, 'commit', '-q', '-m', 'a peer elsewhere', '--', 'D.txt');
    const side = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    git(f.repo, 'checkout', '-q', 'main');
    assert.equal(ourCommit(`[main ${side}] ours\n`, f.head, f.repo, 'ours\n'), null, 'right parent, another message');
    git(f.repo, 'commit', '-q', '-m', 'ours', '--', 'B.txt');
    const ours = git(f.repo, 'rev-parse', 'HEAD').trim();
    write(path.join(f.repo, 'D.txt'), 'd-later\n');
    git(f.repo, 'commit', '-q', '-m', 'ours', '--', 'D.txt');
    const next = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    assert.equal(ourCommit(`[main ${next}] ours\n`, f.head, f.repo, 'ours\n'), null, 'our message, a parent that is not our start');
    assert.equal(ourCommit(`[main ${side}] ours\n`, ours, f.repo, 'a peer elsewhere\n'), git(f.repo, 'rev-parse', 'HEAD').trim(),
      'a lookalike line naming a commit off our start is passed over for HEAD, which sits on it');
  });

  test('landedCommit: a commit git reported as failed is ours only with our parent, our message and only our paths', () => {
    const f = fixture();
    const message = 'test: landed\n\nbody line   \n\n\n';
    write(path.join(f.dir, 'landed.txt'), message);
    git(f.repo, 'commit', '-q', '-F', path.join(f.dir, 'landed.txt'), '--', 'B.txt');
    const head = git(f.repo, 'rev-parse', 'HEAD').trim();
    const base = { top: f.repo, before: f.head, message, all: ['B.txt', 'C.txt'] };
    assert.equal(landedCommit(base), head);
    assert.equal(landedCommit({ ...base, message: 'test: someone else\n' }), null, 'another message');
    assert.equal(landedCommit({ ...base, message: 'test: landed\n\nbody' }), null, 'a prefix of ours that ends mid-line');
    assert.equal(landedCommit({ ...base, all: ['C.txt'] }), null, 'a path outside our list');
    assert.equal(landedCommit({ ...base, before: head }), null, 'HEAD did not move');
    git(f.repo, 'commit', '-q', '-m', 'peer', '--', 'D.txt');
    assert.equal(landedCommit(base), null, 'HEAD is not right on our starting commit');
    // Our message and only our paths, but on top of a peer's commit: still not ours to claim.
    const g = fixture();
    git(g.repo, 'commit', '-q', '-m', 'peer first', '--', 'D.txt');
    git(g.repo, 'commit', '-q', '-F', path.join(f.dir, 'landed.txt'), '--', 'B.txt');
    assert.equal(landedCommit({ top: g.repo, before: g.head, message, all: ['B.txt', 'C.txt'] }), null, 'its parent is not our starting commit');
  });

  test('landedCommit: trailers a hook appended after our message still match', () => {
    const f = fixture();
    const message = 'test: landed\n\nbody line\n';
    write(path.join(f.dir, 'trailered.txt'), `${message}\nSigned-off-by: Hook <hook@example.invalid>\n`);
    git(f.repo, 'commit', '-q', '-F', path.join(f.dir, 'trailered.txt'), '--', 'B.txt');
    assert.equal(landedCommit({ top: f.repo, before: f.head, message, all: ['B.txt'] }), git(f.repo, 'rev-parse', 'HEAD').trim());
  });

  test('landedCommit: a commit.cleanup of strip drops our comment lines, by core.commentChar, before the compare', () => {
    for (const [mark, message, stored] of [
      [null, 'test: stripped\n# a note git drops\nbody\n', 'test: stripped\nbody'],
      [';', 'test: stripped\n; a note git drops\n# kept\n', 'test: stripped\n# kept'],
    ]) {
      const f = fixture();
      git(f.repo, 'config', 'commit.cleanup', 'strip');
      if (mark) git(f.repo, 'config', 'core.commentChar', mark);
      write(path.join(f.dir, 'strip.txt'), message);
      git(f.repo, 'commit', '-q', '-F', path.join(f.dir, 'strip.txt'), '--', 'B.txt');
      assert.equal(git(f.repo, 'log', '-1', '--format=%B').trim(), stored, 'control: git dropped the comment');
      assert.equal(landedCommit({ top: f.repo, before: f.head, message, all: ['B.txt'] }), git(f.repo, 'rev-parse', 'HEAD').trim(), mark || '#');
    }
  });

  test('a commit that landed while its index write failed: the report names the paths the index still reverts, and index.lock', () => {
    const f = fixture();
    // git commit --only commits through a copy of the index; here the real one is never written back.
    const copy = path.join(f.dir, 'index-copy');
    fs.copyFileSync(path.join(f.repo, '.git', 'index'), copy);
    gitWith({ GIT_INDEX_FILE: copy }, f.repo, 'add', 'B.txt', 'C.txt');
    gitWith({ GIT_INDEX_FILE: copy }, f.repo, 'commit', '-q', '-m', 'ours', '--', 'B.txt', 'C.txt');
    git(f.repo, 'add', 'C.txt'); // our git add of the new file reached the real index first
    assert.deepEqual(staleEntries(f.repo, ['B.txt', 'C.txt']), ['B.txt']);
    const out = { sha: 'abc1234', landedError: 'unable to write new index file', staleIndex: ['B.txt'], lock: '/r/.git/index.lock, 3 s old' };
    const stale = landedReport({ ...out, resynced: false });
    assert.match(stale, /The index still holds pre-commit content \(a staged revert of abc1234\) for: B\.txt; index\.lock: \/r\/\.git\/index\.lock, 3 s old\./);
    assert.doesNotMatch(stale, /resynced/);
    assert.match(landedReport({ ...out, resynced: true }), /The index was resynced for our paths only\./);
  });

  test('end to end: a commit lands, git can\'t write the index after it, and the resync fails too: exit 3 names the stale paths, never "resynced"', { skip: !WIN && 'Windows-only (a share-none file handle)' }, () => {
    const f = fixture();
    // A "peer" holds .git/index open with no sharing from just before the commit: git's final index write fails.
    hook(f.repo, 'pre-commit', [
      '#!/bin/sh',
      'idx="$(git rev-parse --git-dir)/index"',
      'powershell.exe -NoProfile -NonInteractive -Command "\\$f=[IO.File]::Open(\'$idx\',\'Open\',\'Read\',\'None\'); New-Item -ItemType File -Path \'$idx.held\' | Out-Null; \\$n=0; while (-not (Test-Path \'$idx.release\') -and \\$n -lt 300) { Start-Sleep -Milliseconds 100; \\$n++ }; \\$f.Close(); Remove-Item \'$idx.held\'" </dev/null >/dev/null 2>&1 &',
      'while [ ! -f "$idx.held" ]; do sleep 0.1; done',
      '',
    ].join('\n'));
    const r = cm(f, { mine: ['B.txt'], mineNew: ['C.txt'] });
    fs.writeFileSync(path.join(f.repo, '.git', 'index.release'), '');
    const held = path.join(f.repo, '.git', 'index.held');
    for (const t0 = Date.now(); fs.existsSync(held) && Date.now() - t0 < 20_000;) sleepMs(100);
    assert.equal(r.status, 3, r.stderr);
    const ours = git(f.repo, 'rev-parse', '--short', 'HEAD').trim();
    assert.match(r.stdout, new RegExp(`^committed ${ours}\\n`));
    assert.match(r.stderr, new RegExp(`STOP: commit ${ours} landed, but git then failed: .*unable to write`, 's'));
    assert.match(r.stderr, new RegExp(`The index still holds pre-commit content \\(a staged revert of ${ours}\\) for: B\\.txt`));
    assert.match(r.stderr, /index\.lock: .*index\.lock, /);
    assert.doesNotMatch(r.stderr, /resynced/);
    assert.deepEqual(headFiles(f.repo), ['B.txt', 'C.txt']);
    assert.ok(staged(f.repo).includes('B.txt'), 'control: the index really does still hold the old B');
  });

  test('a staged rename commits as a pair', () => {
    const dir = path.join(root, `case-${++n}`);
    const repo = initRepo(path.join(dir, 'repo'), { 'old.txt': 'rename me\n'.repeat(10) });
    git(repo, 'mv', 'old.txt', 'new.txt');
    write(path.join(repo, 'new.txt'), 'rename me\n'.repeat(10) + 'edited\n');
    const r = cm(withMsg(dir, repo, 'rename\n'), { mine: ['new.txt', 'old.txt'], mineNew: [] });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(headFiles(repo), ['new.txt', 'old.txt']);
    assert.equal(status(repo), '');
  });

  test('reads a paths file written as UTF-16LE with a BOM (Windows PowerShell 5.1 `>`)', () => {
    const f = fixture();
    const pj = path.join(f.dir, 'utf16.json');
    const text = JSON.stringify({ session: SESSION, repo: f.repo, branch: 'main', mine: ['B.txt'], mineNew: [], sha: { 'B.txt': sha1(onDisk(f, 'B.txt')) } });
    fs.writeFileSync(pj, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
    const r = cm(f, pj);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(headFiles(f.repo), ['B.txt']);
  });

  test('refuses a paths file made for another repo', () => {
    const f = fixture();
    const other = initRepo(path.join(f.dir, 'other'), { 'x.txt': 'x\n' });
    const r = cm(f, { repo: other, mine: ['B.txt'], mineNew: [] });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /was made for/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('refuses paths that are not repo-relative', () => {
    const f = fixture();
    for (const bad of ['../escape.txt', path.join(f.repo, 'B.txt'), '/abs.txt', '']) {
      const r = cm(f, { mine: [bad], mineNew: [] });
      assert.equal(r.status, 2, `should refuse ${JSON.stringify(bad)}`);
    }
  });

  test('refuses an empty message and missing arguments', () => {
    const f = fixture();
    const empty = path.join(f.dir, 'empty.txt');
    write(empty, '  \n');
    const pj = pathsFile(f, { mine: ['B.txt'], mineNew: [] });
    const base = ['--session', SESSION, '--repo', f.repo, '--expect', copyOf(f, pj)];
    assert.equal(runScript('commit-mine.mjs', [...base, '--message-file', empty, '--paths-json', pj]).status, 2);
    assert.equal(runScript('commit-mine.mjs', [...base, '--paths-json', pj]).status, 2);
    assert.equal(runScript('commit-mine.mjs', [...base, '--message-file', empty]).status, 2);
  });
});
