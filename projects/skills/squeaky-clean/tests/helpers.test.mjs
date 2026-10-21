// The suite may run from inside a git hook, where GIT_DIR and GIT_INDEX_FILE
// point at the outer repo. Every git call in the tests must ignore them.
import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { git, initRepo, rm, scratch, write } from './_helpers.mjs';

let root;
before(() => { root = scratch('squeaky-helpers-'); });
after(() => rm(root));

test('the helpers\' git() acts on the folder it is given, not on an inherited GIT_DIR', () => {
  const outer = initRepo(path.join(root, 'outer'), { 'outer.txt': 'o\n' });
  const inner = initRepo(path.join(root, 'inner'), { 'inner.txt': 'i\n' });
  const saved = { GIT_DIR: process.env.GIT_DIR, GIT_INDEX_FILE: process.env.GIT_INDEX_FILE };
  process.env.GIT_DIR = path.join(outer, '.git');
  process.env.GIT_INDEX_FILE = path.join(outer, '.git', 'index');
  try {
    write(path.join(inner, 'inner.txt'), 'changed\n');
    assert.equal(git(inner, 'status', '--porcelain'), ' M inner.txt\n');
    assert.equal(git(inner, 'ls-files'), 'inner.txt\n');
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  assert.equal(git(outer, 'status', '--porcelain'), '', 'the outer repo was touched');
});
