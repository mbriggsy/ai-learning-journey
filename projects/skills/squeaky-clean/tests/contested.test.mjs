// The contested list: paths this session has evidence for but can't prove are
// its own. None is ever committed unless named with --include.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { git, initRepo, rm, runScript, scratch, write, writeTranscript } from './_helpers.mjs';

const WIN = process.platform === 'win32';
const lines = (word, n) => Array.from({ length: n }, (_, k) => `${word} ${k + 1}\n`).join('');

let root;
let seq = 0;
let fx;
let out;

// One working tree holding every contested case next to its mine control.
// Files a peer staged were staged here with no evidence in the transcript.
function build() {
  const dir = path.join(root, `case-${++seq}`);
  const repo = initRepo(path.join(dir, 'repo'), {
    'staged-x.txt': 'x\n',
    'own-staged.txt': 'o\n',
    'peer-rm-old.txt': lines('alpha', 20),
    'both-old.txt': lines('bravo', 20),
    'orig.txt': lines('echo', 30),
    'shell-mv.txt': 's\n',
    'own-rm.txt': 'charlie\n',
    'unconf.txt': 'u\n',
    'Case.txt': 'c\n',
    'uncached.txt': 'delta\n',
  });
  git(repo, 'config', 'status.renames', 'copies');
  const at = (...p) => path.join(repo, ...p);

  write(at('staged-x.txt'), 'x-mine\n');
  git(repo, 'add', 'staged-x.txt'); // (a) a peer staged the file this session edited
  write(at('own-staged.txt'), 'o-mine\n');
  git(repo, 'add', 'own-staged.txt');
  write(at('new-peer-added.txt'), 'npa\n');
  git(repo, 'add', 'new-peer-added.txt'); // (a) a peer staged the file this session wrote
  write(at('peer-rm-new.txt'), lines('alpha', 20) + 'alpha new\n');
  git(repo, 'add', 'peer-rm-new.txt');
  git(repo, 'rm', '-q', 'peer-rm-old.txt'); // (b) a peer's rm pairs with our add as a rename
  git(repo, 'mv', 'both-old.txt', 'both-new.txt');
  fs.appendFileSync(at('both-new.txt'), 'bravo edited\n');
  write(at('copy.txt'), lines('echo', 30));
  git(repo, 'add', 'copy.txt');
  fs.appendFileSync(at('orig.txt'), 'echo peer\n');
  git(repo, 'add', 'orig.txt'); // a peer's staged edit to the copy's original
  write(at('shell-mv.txt'), 's-mine\n');
  fs.renameSync(at('shell-mv.txt'), at('shell-moved.txt')); // (c) a shell mv after our edit
  git(repo, 'rm', '-q', 'own-rm.txt');
  write(at('unconf.txt'), 'u2\n');
  write(at('unconf-new.txt'), 'un\n');
  if (WIN) {
    fs.renameSync(at('Case.txt'), at('case-tmp'));
    fs.renameSync(at('case-tmp'), at('case.txt')); // (e) the index says Case.txt, the disk case.txt
    write(at('case.txt'), 'c2\n');
  }
  write(at('uncached.txt'), 'delta2\n');
  git(repo, 'rm', '-q', '--cached', 'uncached.txt'); // (f) out of the index, still on disk

  const projects = path.join(dir, 'projects');
  writeTranscript(path.join(projects, 'proj', 'sess-self.jsonl'), repo, [
    ['Edit', { file_path: at('staged-x.txt'), old_string: 'x', new_string: 'x-mine' }],
    ['Edit', { file_path: at('own-staged.txt'), old_string: 'o', new_string: 'o-mine' }],
    ['Bash', { command: 'git add own-staged.txt' }],
    ['Write', { file_path: at('new-peer-added.txt'), content: 'npa\n' }],
    ['Write', { file_path: at('peer-rm-new.txt'), content: `${lines('alpha', 20)}alpha new\n` }],
    ['Bash', { command: 'git add peer-rm-new.txt' }],
    ['Bash', { command: 'git mv both-old.txt both-new.txt' }],
    ['Edit', { file_path: at('both-new.txt'), old_string: 'bravo 20\n', new_string: 'bravo 20\nbravo edited\n' }],
    ['Write', { file_path: at('copy.txt'), content: lines('echo', 30) }],
    ['Bash', { command: 'git add copy.txt' }],
    ['Edit', { file_path: at('shell-mv.txt'), old_string: 's', new_string: 's-mine' }],
    ['Bash', { command: 'mv shell-mv.txt shell-moved.txt' }],
    ['PowerShell', { command: 'git rm own-rm.txt' }],
    ['Edit', { file_path: at('unconf.txt'), old_string: 'u', new_string: 'u2' }, { noResult: true }],
    ['Write', { file_path: at('unconf-new.txt'), content: 'un' }, { noResult: true }],
    ...(WIN ? [['Edit', { file_path: at('case.txt'), old_string: 'c', new_string: 'c2' }]] : []),
    ['Edit', { file_path: at('uncached.txt'), old_string: 'delta', new_string: 'delta2' }],
    ['Bash', { command: 'git rm --cached uncached.txt' }],
  ]);
  const msg = path.join(dir, 'msg.txt');
  write(msg, 'test: contested paths\n');
  return { dir, repo, projects, msg, head: git(repo, 'rev-parse', 'HEAD').trim() };
}

function classify(f) {
  const r = runScript('mine-paths.mjs', ['--session', 'sess-self', '--repo', f.repo], { env: { SQUEAKY_PROJECTS_DIR: f.projects } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

// Step 6's paths file and step 3's --expect file, when the two runs agreed.
function commit(f, json, extra = []) {
  const pj = path.join(f.dir, `paths-${++seq}.json`);
  const step3 = path.join(f.dir, `step3-${seq}.json`);
  fs.writeFileSync(pj, json);
  fs.writeFileSync(step3, json);
  return runScript('commit-mine.mjs', ['--session', 'sess-self', '--repo', f.repo, '--message-file', f.msg, '--paths-json', pj, '--expect', step3, ...extra]);
}

const reasonOf = (p) => (out.contested.find((c) => c.path === p) || {}).reason;
const entryOf = (p) => out.contested.find((c) => c.path === p);
const sha1 = (file) => createHash('sha1').update(fs.readFileSync(file)).digest('hex');
const headFiles = (repo) => git(repo, 'diff-tree', '-r', '--root', '--no-commit-id', '--name-only', '--no-renames', 'HEAD')
  .split('\n').filter(Boolean).sort();
const stagedFiles = (repo) => git(repo, 'diff', '--cached', '--name-only', '--no-renames').split('\n').filter(Boolean).sort();

before(() => {
  root = scratch('squeaky-contested-');
  fx = build();
  out = JSON.parse(classify(fx));
});
after(() => rm(root));

describe('mine-paths.mjs: contested', () => {
  test('a contested path is never in mine, mineNew, foreign or peerStaged', () => {
    for (const { path: p } of out.contested) {
      for (const list of ['mine', 'mineNew', 'foreign', 'peerStaged']) assert.ok(!out[list].includes(p), `${p} is also in ${list}`);
    }
  });

  test('(a) staged-elsewhere: a file this session edited or wrote but someone else staged', () => {
    assert.equal(reasonOf('staged-x.txt'), 'staged-elsewhere');
    assert.equal(reasonOf('new-peer-added.txt'), 'staged-elsewhere');
    for (const p of ['staged-x.txt', 'new-peer-added.txt']) assert.equal(out.contested.find((c) => c.path === p).staged, true, p);
    assert.ok(out.mine.includes('own-staged.txt'), 'staged by this session\'s own git add: mine');
  });

  test('every contested entry carries the sha1 of its bytes (null when gone), and one this session edited carries the replay\'s counts', () => {
    for (const c of out.contested) {
      const file = path.join(fx.repo, c.path);
      assert.equal(c.sha, fs.existsSync(file) ? sha1(file) : null, c.path);
    }
    assert.deepEqual([entryOf('staged-x.txt').addedForeign, entryOf('staged-x.txt').removedForeign], [0, 0], 'every line is ours: 0 and 0');
    assert.equal(entryOf('shell-mv.txt').detail, 'can\'t compare (not on disk)');
    assert.equal(entryOf('unconf.txt').addedForeign, undefined, 'an unconfirmed call is never replayed');
  });

  test('(b) rename-split: our staged add paired with a peer\'s rm; the peer\'s side stays foreign and peer-staged', () => {
    const { sha, ...entry } = entryOf('peer-rm-new.txt');
    assert.deepEqual(entry, { path: 'peer-rm-new.txt', reason: 'rename-split', pair: 'peer-rm-old.txt', addedForeign: 0, removedForeign: 0 });
    assert.ok(out.foreign.includes('peer-rm-old.txt'));
    assert.ok(out.peerStaged.includes('peer-rm-old.txt'));
  });

  test('(b) a rename made with this session\'s own git mv is mine on both sides', () => {
    assert.ok(out.mine.includes('both-new.txt'));
    assert.ok(out.mine.includes('both-old.txt'));
  });

  test('(b) a copy is judged by its new path only; the original keeps its own entry', () => {
    assert.ok(out.mine.includes('copy.txt'));
    assert.ok(out.foreign.includes('orig.txt'), 'the copy\'s original is a peer\'s staged edit');
    assert.ok(out.peerStaged.includes('orig.txt'));
  });

  test('(c) deleted-outside-git: an edited file moved by a shell mv; its new name is foreign', () => {
    assert.equal(reasonOf('shell-mv.txt'), 'deleted-outside-git');
    assert.ok(out.foreign.includes('shell-moved.txt'));
    assert.ok(out.mine.includes('own-rm.txt'), 'a deletion through this session\'s own git rm is mine');
  });

  test('(d) unconfirmed: a tool call with no recorded result proves nothing', () => {
    assert.equal(reasonOf('unconf.txt'), 'unconfirmed');
    const { sha, ...entry } = entryOf('unconf-new.txt');
    assert.deepEqual(entry, { path: 'unconf-new.txt', reason: 'unconfirmed', untracked: true });
  });

  test('(e) case-mismatch: evidence names the file in other letter case', { skip: !WIN && 'Windows-only' }, () => {
    assert.equal(reasonOf('Case.txt'), 'case-mismatch');
  });

  test('rm-cached: out of the index but on disk is listed once', () => {
    assert.equal(reasonOf('uncached.txt'), 'rm-cached');
    assert.equal(out.contested.filter((c) => c.path === 'uncached.txt').length, 1);
  });

  test('the exact split', () => {
    assert.deepEqual(out.mine, ['both-new.txt', 'both-old.txt', 'copy.txt', 'own-rm.txt', 'own-staged.txt']);
    assert.deepEqual(out.mineNew, []);
    assert.deepEqual(out.contested.map((c) => `${c.path}:${c.reason}`), [
      ...(WIN ? ['Case.txt:case-mismatch'] : []),
      'new-peer-added.txt:staged-elsewhere',
      'peer-rm-new.txt:rename-split',
      'shell-mv.txt:deleted-outside-git',
      'staged-x.txt:staged-elsewhere',
      'uncached.txt:rm-cached',
      'unconf-new.txt:unconfirmed',
      'unconf.txt:unconfirmed',
    ]);
    assert.deepEqual(out.foreign, ['orig.txt', 'peer-rm-old.txt', 'shell-moved.txt']);
    assert.deepEqual(out.peerStaged, ['orig.txt', 'peer-rm-old.txt']);
  });
});

describe('commit-mine.mjs: contested', () => {
  test('by default nothing contested is committed, and everyone\'s staged work stays staged', () => {
    const f = build();
    const json = classify(f);
    const r = commit(f, json);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(headFiles(f.repo), ['both-new.txt', 'both-old.txt', 'copy.txt', 'own-rm.txt', 'own-staged.txt']);
    assert.deepEqual(stagedFiles(f.repo), ['new-peer-added.txt', 'orig.txt', 'peer-rm-new.txt', 'peer-rm-old.txt', 'staged-x.txt', 'uncached.txt']);
    assert.equal(git(f.repo, 'show', ':staged-x.txt'), 'x-mine\n');
    assert.ok(fs.existsSync(path.join(f.repo, 'shell-moved.txt')));
    assert.ok(fs.existsSync(path.join(f.repo, 'uncached.txt')));
  });

  test('--include commits a contested path Briggsy said yes to, and git-adds an untracked one', () => {
    const f = build();
    const r = commit(f, classify(f), ['--include', 'staged-x.txt', '--include', '.\\unconf-new.txt']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^included: staged-x\.txt \(staged-elsewhere, staged\)$/m);
    assert.match(r.stdout, /^included: unconf-new\.txt \(unconfirmed\)$/m);
    assert.deepEqual(headFiles(f.repo), ['both-new.txt', 'both-old.txt', 'copy.txt', 'own-rm.txt', 'own-staged.txt', 'staged-x.txt', 'unconf-new.txt']);
  });

  test('--include of a path that is not contested is refused, and nothing changes', () => {
    const f = build();
    const json = classify(f);
    for (const p of ['peer-rm-old.txt', 'own-staged.txt', 'nope.txt']) {
      const r = commit(f, json, ['--include', p]);
      assert.equal(r.status, 2, `${p}: ${r.stderr}`);
      assert.match(r.stderr, /names no contested path/);
    }
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });

  test('--include of an rm-cached path is refused: git commit --only would add it back', () => {
    const f = build();
    const r = commit(f, classify(f), ['--include', 'uncached.txt']);
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /would add it back/);
    assert.equal(git(f.repo, 'rev-parse', 'HEAD').trim(), f.head);
  });
});
