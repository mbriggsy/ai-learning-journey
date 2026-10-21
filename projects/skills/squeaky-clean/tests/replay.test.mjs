// The invariant: a path is mine only if replaying this session's own
// recorded edits (the values each tool applied) from the committed file
// reproduces the disk exactly, each edit finding what it found when it ran.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { sleepMs } from '../scripts/lib.mjs';
import { foreignLines, reversePatch } from '../scripts/mine-paths.mjs';
import { git, initRepo, rm, runScript, runScriptAsync, scratch, write, writeTranscript } from './_helpers.mjs';

const WIN = process.platform === 'win32';
let root; let repo; let projects; let out;
const at = (...p) => path.join(repo, ...p);
// A contested entry without its sha1, which these tests don't pin.
const plain = (o, p) => { const { sha, ...rest } = o.contested.find((c) => c.path === p) || {}; return rest; };
const lines = (word, n) => Array.from({ length: n }, (_, k) => `${word} ${k + 1}\n`).join('');

function classify(r, session = 'sess-self') {
  const res = runScript('mine-paths.mjs', ['--session', session, '--repo', r], { env: { SQUEAKY_PROJECTS_DIR: projects } });
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout);
}

// A Write's structuredPatch, as Claude Code records one hunk of it.
const hunk = (oldStart, oldLines, newStart, newLines, ls) => ({ oldStart, oldLines, newStart, newLines, lines: ls });

before(() => {
  root = scratch('squeaky-replay-');
  projects = path.join(root, 'projects');
  repo = initRepo(path.join(root, 'repo'), {
    'two-ops.txt': 'one\ntwo\nthree\n',
    'multi-edit.txt': 'a\nb\nc\n',
    'replace-all.txt': 'x\nx\ny\n',
    'twice.txt': 'x\nx\n',
    'crlf.txt': 'a\r\nb\r\n',
    'flip.txt': 'a\r\nb\r\n',
    'order.txt': 'a\nb\nc\n',
    'final-nl.txt': 'a\n',
    'peer-dirty-a.txt': 'base\n',
    'peer-dirty-b.txt': 'base\n',
    'clean-write.txt': 'base\n',
    'bad-patch.txt': 'base\n',
    'no-result.txt': 'base\n',
    'created-over.txt': 'base\n',
    'user-mod.txt': 'v1\n',
    'user-mod-raw.txt': 'v1\n',
    'write-then-edit.txt': 'h\n',
    'between.txt': 'a\nb\n',
    'rm-by-add.txt': 'gone\n',
    'write-eol.txt': 'a\r\nb\r\n',
    'own-rm.txt': 'mine to delete\n',
    'peer-rm-after-add.txt': 'p\n',
    'rm-undone.txt': 'r\n',
    'mv-undone-a.txt': lines('mv', 6),
    'gone-edit.txt': 'g\n',
    'undone-edit.txt': 'u\n',
    'latin1.txt': Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a]),
    'um-src.txt': lines('source', 10),
    'pr-src.txt': lines('pair', 10),
    'es-src.txt': lines('edit', 10),
  });

  // The disk at squeaky time: this session's work, and others' in some files.
  write(at('two-ops.txt'), 'ONE\ntwo\nTHREE\n');
  write(at('multi-edit.txt'), 'A\nb\nC\n');
  write(at('replace-all.txt'), 'z\nz\ny\n');
  write(at('twice.txt'), 'z\n'); // a peer removed one x before our Edit, which then found it once
  write(at('crlf.txt'), 'A\r\nb\r\n');
  write(at('flip.txt'), 'A\nb\n'); // our Edit, then something rewrote the line endings
  write(at('order.txt'), 'b\na\nC\n'); // our Edit of c, then a peer swapped a and b
  write(at('final-nl.txt'), 'A'); // our Edit, then the final newline went
  write(at('peer-dirty-a.txt'), 'ours\n'); // our Write over a peer's uncommitted "peer" line
  write(at('peer-dirty-b.txt'), 'ours\n');
  write(at('clean-write.txt'), 'ours\n');
  write(at('bad-patch.txt'), 'ours\n');
  write(at('no-result.txt'), 'ours\n');
  write(at('created-over.txt'), 'new\n');
  write(at('user-mod.txt'), 'v3\n'); // Briggsy changed the proposed v2 to v3
  write(at('user-mod-raw.txt'), 'v3\n');
  write(at('write-then-edit.txt'), 'w1\nW2\n');
  write(at('between.txt'), 'A\nB\np\n'); // a peer's p between our two Edits
  write(at('write-eol.txt'), 'c\nd\n'); // a Write's own line endings: no record states them
  fs.rmSync(at('rm-by-add.txt'));
  git(repo, 'add', 'rm-by-add.txt'); // stages the deletion: a git add never proves one
  git(repo, 'rm', '-q', 'own-rm.txt');
  write(at('peer-rm-after-add.txt'), 'P\n');
  git(repo, 'add', 'peer-rm-after-add.txt');
  git(repo, 'rm', '-qf', 'peer-rm-after-add.txt'); // a peer's git rm, after our edit and add
  fs.rmSync(at('rm-undone.txt')); // a peer's rm, after we ran git rm and undid it
  fs.rmSync(at('mv-undone-a.txt')); // a peer's rm, after we moved it away and back
  write(at('latin1.txt'), Buffer.from([0x43, 0x41, 0x46, 0xe9, 0x0a]));
  // A move edited past rename detection: git status shows D and A, not R.
  git(repo, 'mv', 'um-src.txt', 'um-dst.txt');
  write(at('um-dst.txt'), `${lines('other', 10)}peer\n`);
  git(repo, 'add', 'um-dst.txt');
  git(repo, 'mv', 'pr-src.txt', 'pr-dst.txt'); // a plain rename of ours: R
  write(at('es-src.txt'), lines('edit', 10).replace('edit 1\n', 'EDIT 1\n'));
  git(repo, 'mv', 'es-src.txt', 'es-dst.txt');
  write(at('es-dst.txt'), lines('edit', 10).replace('edit 1\n', 'EDIT 1\n').replace('edit 10\n', 'EDIT 10\n'));

  writeTranscript(path.join(projects, 'proj', 'sess-self.jsonl'), repo, [
    ['Edit', { file_path: at('two-ops.txt'), old_string: 'one', new_string: 'ONE' }],
    ['Edit', { file_path: at('two-ops.txt'), old_string: 'three', new_string: 'THREE' }],
    ['MultiEdit', { file_path: at('multi-edit.txt'), edits: [{ old_string: 'a\n', new_string: 'A\n' }, { old_string: 'c', new_string: 'C' }] }],
    ['Edit', { file_path: at('replace-all.txt'), old_string: 'x', new_string: 'z', replace_all: true }],
    ['Edit', { file_path: at('twice.txt'), old_string: 'x', new_string: 'z' }],
    ['Edit', { file_path: at('crlf.txt'), old_string: 'a\nb', new_string: 'A\nb' }],
    ['Edit', { file_path: at('flip.txt'), old_string: 'a', new_string: 'A' }],
    ['Edit', { file_path: at('order.txt'), old_string: 'c', new_string: 'C' }],
    ['Edit', { file_path: at('final-nl.txt'), old_string: 'a', new_string: 'A' }],
    ['Write', { file_path: at('peer-dirty-a.txt'), content: 'ours\n' }, { pre: 'base\npeer\n' }],
    ['Write', { file_path: at('peer-dirty-b.txt'), content: 'ours\n' },
      { pre: 'x', result: { originalFile: null, structuredPatch: [hunk(1, 2, 1, 1, ['-base', '-peer', '+ours'])] } }],
    ['Write', { file_path: at('clean-write.txt'), content: 'ours\n' },
      { pre: 'x', result: { originalFile: null, structuredPatch: [hunk(1, 1, 1, 1, ['-base', '+ours'])] } }],
    ['Write', { file_path: at('bad-patch.txt'), content: 'ours\n' },
      { pre: 'x', result: { originalFile: null, structuredPatch: [hunk(1, 1, 1, 1, ['-zzz', '+nope'])] } }],
    ['Write', { file_path: at('no-result.txt'), content: 'ours\n' }, { noApplied: true }],
    ['Write', { file_path: at('created-over.txt'), content: 'new\n' }],
    ['Edit', { file_path: at('user-mod.txt'), old_string: 'v1', new_string: 'v2' }, { result: { newString: 'v3', userModified: true } }],
    ['Edit', { file_path: at('user-mod-raw.txt'), old_string: 'v1', new_string: 'v2' }, { noApplied: true }],
    ['Write', { file_path: at('write-then-edit.txt'), content: 'w1\nw2\n' }, { pre: 'h\n' }],
    ['Edit', { file_path: at('write-then-edit.txt'), old_string: 'w2', new_string: 'W2' }],
    ['Edit', { file_path: at('between.txt'), old_string: 'a', new_string: 'A' }],
    ['Edit', { file_path: at('between.txt'), old_string: 'b', new_string: 'B' }],
    ['Bash', { command: 'rm rm-by-add.txt && git add rm-by-add.txt' }],
    ['Write', { file_path: at('write-eol.txt'), content: 'c\nd\n' }, { pre: 'a\r\nb\r\n' }],
    ['Bash', { command: 'git rm own-rm.txt' }],
    ['Edit', { file_path: at('peer-rm-after-add.txt'), old_string: 'p', new_string: 'P' }],
    ['Bash', { command: 'git add peer-rm-after-add.txt' }],
    ['Bash', { command: 'git rm rm-undone.txt' }],
    ['Bash', { command: 'git checkout HEAD -- rm-undone.txt' }],
    ['Bash', { command: 'git mv mv-undone-a.txt mv-undone-b.txt' }],
    ['Bash', { command: 'git mv mv-undone-b.txt mv-undone-a.txt' }],
    ['Edit', { file_path: at('gone-edit.txt'), old_string: 'g', new_string: 'G' }],
    ['Edit', { file_path: at('undone-edit.txt'), old_string: 'u', new_string: 'U' }],
    ['Edit', { file_path: at('undone-edit.txt'), old_string: 'U', new_string: 'u' }],
    ['Edit', { file_path: at('latin1.txt'), old_string: 'caf', new_string: 'CAF' }],
    ['Bash', { command: 'git mv um-src.txt um-dst.txt' }],
    ['Write', { file_path: at('um-dst.txt'), content: lines('other', 10) }, { pre: lines('source', 10) }],
    ['Bash', { command: 'git add um-dst.txt' }],
    ['Bash', { command: 'git mv pr-src.txt pr-dst.txt' }],
    ['Edit', { file_path: at('es-src.txt'), old_string: 'edit 1\n', new_string: 'EDIT 1\n' }],
    ['Bash', { command: 'git mv es-src.txt es-dst.txt' }],
    ['Edit', { file_path: at('es-dst.txt'), old_string: 'edit 10\n', new_string: 'EDIT 10\n' }],
  ]);
  out = classify(repo);
});
after(() => rm(root));

describe('the exact replay (K1)', () => {
  test('two Edits on one file, a MultiEdit of several edits, replace_all, a CRLF file, a Write then an Edit: mine', () => {
    for (const p of ['two-ops.txt', 'multi-edit.txt', 'replace-all.txt', 'crlf.txt', 'write-then-edit.txt']) assert.ok(out.mine.includes(p), p);
    assert.ok(out.mine.includes('write-eol.txt'), 'after a Write, line endings are the residual: never contested');
  });

  test('an Edit must find its old_string exactly once (a peer\'s change before it shows)', () => {
    assert.deepEqual(plain(out, 'twice.txt'), { path: 'twice.txt', reason: 'foreign-hunks', detail: 'an Edit whose old_string the replay holds 2 times' });
  });

  test('a peer\'s line between two of our Edits is foreign', () => {
    assert.deepEqual(plain(out, 'between.txt'), { path: 'between.txt', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 0 });
  });

  test('a reorder, a line-ending flip and a lost final newline each land in contested, with equal line counts', () => {
    assert.deepEqual(plain(out, 'order.txt'), { path: 'order.txt', reason: 'foreign-hunks', addedForeign: 0, removedForeign: 0, detail: 'lines moved or reordered' });
    assert.deepEqual(plain(out, 'flip.txt'), { path: 'flip.txt', reason: 'foreign-hunks', addedForeign: 0, removedForeign: 0, detail: 'line endings changed' });
    assert.deepEqual(plain(out, 'final-nl.txt'), { path: 'final-nl.txt', reason: 'foreign-hunks', addedForeign: 0, removedForeign: 0, detail: 'the final newline changed' });
  });

  test('a Write over a peer\'s uncommitted lines is contested: its originalFile as a string, or rebuilt from its structuredPatch', () => {
    for (const p of ['peer-dirty-a.txt', 'peer-dirty-b.txt']) {
      assert.deepEqual(plain(out, p), { path: p, reason: 'foreign-hunks', addedForeign: 1, removedForeign: 0, detail: 'a Write over lines this session\'s edits don\'t account for' }, p);
    }
    assert.ok(out.mine.includes('clean-write.txt'), 'control: the same Write over the committed text is mine');
  });

  test('a Write whose pre-image can\'t be rebuilt can\'t be compared: a patch that doesn\'t fit, or no result at all', () => {
    for (const p of ['bad-patch.txt', 'no-result.txt']) {
      assert.deepEqual(plain(out, p), { path: p, reason: 'foreign-hunks', detail: 'can\'t compare (no pre-write content)' }, p);
    }
  });

  test('a Write that says it created a file HEAD already holds is contested', () => {
    assert.deepEqual(plain(out, 'created-over.txt'), { path: 'created-over.txt', reason: 'foreign-hunks', detail: 'a Write created a file the replay already holds' });
  });

  test('the replay uses what the tool applied (Briggsy\'s change to the proposal), not what was proposed', () => {
    assert.ok(out.mine.includes('user-mod.txt'));
    assert.deepEqual(plain(out, 'user-mod-raw.txt'), { path: 'user-mod-raw.txt', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 1 },
      'control: with no recorded result, the proposal is all there is');
  });

  test('text that isn\'t UTF-8 is never compared: two different bytes would decode alike', () => {
    assert.deepEqual(plain(out, 'latin1.txt'), { path: 'latin1.txt', reason: 'foreign-hunks', detail: 'not UTF-8 text' });
  });
});

describe('deletions (L1): only this session\'s own git rm, as its last call, proves one', () => {
  test('this session\'s git rm is mine, listed in deleted, with a null sha', () => {
    assert.ok(out.mine.includes('own-rm.txt'));
    assert.ok(out.deleted.includes('own-rm.txt'));
    assert.equal(out.sha['own-rm.txt'], null);
  });

  test('a git add of a deletion proves nothing: deleted-outside-git', () => {
    assert.deepEqual(plain(out, 'rm-by-add.txt'), { path: 'rm-by-add.txt', reason: 'deleted-outside-git' });
  });

  test('our edit and git add, then a peer\'s git rm: deleted-outside-git, never mine', () => {
    assert.deepEqual(plain(out, 'peer-rm-after-add.txt'), { path: 'peer-rm-after-add.txt', reason: 'deleted-outside-git', detail: 'can\'t compare (not on disk)' });
    assert.ok(!out.mine.includes('peer-rm-after-add.txt') && !out.deleted.includes('peer-rm-after-add.txt'));
  });

  test('a git rm undone by git checkout <tree-ish> --, then a peer\'s rm: the checkout took our rm back, so the deletion is a peer\'s', () => {
    assert.ok(out.foreign.includes('rm-undone.txt'));
    assert.ok(!out.mine.includes('rm-undone.txt'));
  });

  test('a git mv away and back, then a peer\'s rm: our last call there was the move back, so deleted-outside-git', () => {
    assert.equal(plain(out, 'mv-undone-a.txt').reason, 'deleted-outside-git');
  });
});

describe('renames (L12)', () => {
  test('a move edited past rename detection still goes as a pair: the source deletion is contested with its new side', () => {
    assert.ok(!out.mine.includes('um-src.txt') && !out.mineNew.includes('um-dst.txt'));
    assert.deepEqual(plain(out, 'um-src.txt'), { path: 'um-src.txt', reason: 'rename-split', pair: 'um-dst.txt' });
    assert.equal(plain(out, 'um-dst.txt').reason, 'foreign-hunks');
  });

  test('a rename of ours is mine on both sides and listed in pairs; its source is a deletion', () => {
    assert.ok(out.mine.includes('pr-src.txt') && out.mine.includes('pr-dst.txt'));
    assert.deepEqual(out.pairs.filter(([a]) => a.startsWith('pr-')), [['pr-src.txt', 'pr-dst.txt']]);
    assert.ok(out.deleted.includes('pr-src.txt'));
  });

  test('a rename made of our git rm and git add (no git mv) still goes as a pair when its new side fails', () => {
    const r2 = initRepo(path.join(root, 'rm-add'), { 'ra-old.txt': lines('ra', 10) });
    git(r2, 'rm', '-q', 'ra-old.txt');
    write(path.join(r2, 'ra-new.txt'), lines('ra', 10));
    git(r2, 'add', 'ra-new.txt');
    write(path.join(r2, 'ra-new.txt'), `${lines('ra', 10)}peer\n`); // a peer's line on top
    writeTranscript(path.join(projects, 'proj-rm-add', 'sess-ra.jsonl'), r2, [
      ['Bash', { command: 'git rm ra-old.txt' }],
      ['Write', { file_path: path.join(r2, 'ra-new.txt'), content: lines('ra', 10) }],
      ['Bash', { command: 'git add ra-new.txt' }],
    ]);
    assert.match(git(r2, 'status', '--porcelain'), /^RM ra-old\.txt -> ra-new\.txt$/m, 'control: git status pairs them as R');
    const o = classify(r2, 'sess-ra');
    assert.deepEqual([o.mine, o.mineNew], [[], []]);
    assert.deepEqual(plain(o, 'ra-old.txt'), { path: 'ra-old.txt', reason: 'rename-split', pair: 'ra-new.txt' });
    assert.equal(plain(o, 'ra-new.txt').reason, 'foreign-hunks');
  });

  test('edit the source, git mv, edit the new name: both edits replay from the source\'s HEAD copy, so the pair is mine', () => {
    assert.ok(out.mine.includes('es-src.txt') && out.mine.includes('es-dst.txt'), JSON.stringify(out.contested.filter((c) => c.path.startsWith('es-'))));
    assert.deepEqual(out.pairs.filter(([a]) => a.startsWith('es-')), [['es-src.txt', 'es-dst.txt']]);
  });
});

describe('vanished work (L6)', () => {
  test('a clean file whose fresh edits are gone is listed, with a warning; an edit undone by our own edit is not', () => {
    assert.deepEqual(out.vanished, [{ path: 'gone-edit.txt', reason: 'edits gone' }]);
    assert.ok(out.warnings.some((w) => /uncommitted work on 1 path\(s\) git status shows clean is gone \(a stash, a checkout, a clean or a discard\): gone-edit\.txt \(edits gone\)\. Check git stash list/.test(w)), out.warnings.join('\n'));
    assert.equal(out.counts.vanished, 1);
  });

  test('a new file this session created or added, gone from disk and the index, is vanished; an ignored one, or one our own git rm took, is not', () => {
    const r2 = initRepo(path.join(root, 'newgone'), { '.gitignore': 'scratch/\n', 'kept.txt': 'k\n', 'undone.txt': 'u\n' });
    writeTranscript(path.join(projects, 'proj-newgone', 'sess-ng.jsonl'), r2, [
      ['Write', { file_path: path.join(r2, 'created.txt'), content: 'c\n' }],
      ['Bash', { command: 'git add created.txt' }],
      ['Write', { file_path: path.join(r2, 'added-only.txt'), content: 'a\n' }],
      ['Write', { file_path: path.join(r2, 'scratch', 'note.txt'), content: 'n\n' }],
      ['Write', { file_path: path.join(r2, 'own-rm.txt'), content: 'o\n' }],
      ['Bash', { command: 'git add own-rm.txt && git rm -f own-rm.txt' }],
      ['Bash', { command: 'git rm undone.txt' }],
      ['Bash', { command: 'git add shell-made.txt' }], // a file a shell command made, then this session's git add
    ]);
    // A peer's stash -u took created.txt and added-only.txt; scratch/ is ignored and gone; undone.txt is back at HEAD.
    const o = classify(r2, 'sess-ng');
    assert.deepEqual(o.vanished, [
      { path: 'added-only.txt', reason: 'new file gone' },
      { path: 'created.txt', reason: 'new file gone' },
      { path: 'shell-made.txt', reason: 'new file gone' },
      { path: 'undone.txt', reason: 'git rm or git mv undone' },
    ]);
  });

  test('a committed edit, and an ignored file this session wrote, never read as vanished', () => {
    const r2 = initRepo(path.join(root, 'vanish'), { '.gitignore': 'scratch.txt\n', 'done.txt': 'd\n' });
    writeTranscript(path.join(projects, 'proj-vanish', 'sess-v.jsonl'), r2, [
      ['Edit', { file_path: path.join(r2, 'done.txt'), old_string: 'd', new_string: 'D' }, { at: Date.now() - 60_000 }],
      ['Write', { file_path: path.join(r2, 'scratch.txt'), content: 'tmp\n' }, { at: Date.now() - 60_000 }],
    ]);
    write(path.join(r2, 'done.txt'), 'D\n');
    git(r2, 'commit', '-qam', 'ours');
    write(path.join(r2, 'scratch.txt'), 'tmp\n');
    assert.deepEqual(classify(r2, 'sess-v').vanished, []);
  });
});

describe('round 5: deletions still on disk, rename sources, one-sided pairs', () => {
  test('git rm --cached of an ignored file is rm-cached, never a mine deletion: git commit --only would add it back', () => {
    const r2 = initRepo(path.join(root, 'rmcached'), { 'build.log': 'old\n' });
    write(path.join(r2, '.gitignore'), 'build.log\n');
    git(r2, 'add', '.gitignore');
    git(r2, 'rm', '-q', '--cached', 'build.log');
    write(path.join(r2, 'build.log'), 'a peer\'s rebuild\n');
    writeTranscript(path.join(projects, 'proj-rmcached', 'sess-rc.jsonl'), r2, [['Bash', { command: 'git rm --cached build.log' }]]);
    assert.match(git(r2, 'status', '--porcelain', '--untracked-files=all'), /^D  build\.log$/m);
    assert.doesNotMatch(git(r2, 'status', '--porcelain', '--untracked-files=all'), /\?\? build\.log/, 'control: ignored, so never listed as untracked');
    const o = classify(r2, 'sess-rc');
    assert.ok(!o.mine.includes('build.log') && !o.deleted.includes('build.log'));
    assert.equal(plain(o, 'build.log').reason, 'rm-cached');
  });

  test('a rename source is judged as a deletion: a peer\'s deletion plus our add of a similar new file proves nothing', () => {
    const r2 = initRepo(path.join(root, 'rsrc'), { 'doc.md': lines('doc', 10) });
    fs.rmSync(path.join(r2, 'doc.md')); // a peer's shell mv ...
    write(path.join(r2, 'docs.md'), lines('doc', 10));
    writeTranscript(path.join(projects, 'proj-rsrc', 'sess-rs.jsonl'), r2, [['Bash', { command: 'git add doc.md docs.md' }]]);
    git(r2, 'add', 'doc.md', 'docs.md'); // ... and our git add of both sides
    assert.match(git(r2, 'status', '--porcelain'), /^R  doc\.md -> docs\.md$/m, 'control: git pairs them as R');
    const o = classify(r2, 'sess-rs');
    assert.deepEqual([o.mine, o.mineNew], [[], []]);
    assert.equal(plain(o, 'doc.md').reason, 'deleted-outside-git');
    assert.equal(plain(o, 'docs.md').reason, 'rename-split');
  });

  test('git mv, then a one-sided unstage of the new side: the source\'s deletion is never mine alone', () => {
    const r2 = initRepo(path.join(root, 'onesided'), { 'a.md': lines('a', 10) });
    git(r2, 'mv', 'a.md', 'b.md');
    git(r2, 'restore', '--staged', 'b.md');
    writeTranscript(path.join(projects, 'proj-onesided', 'sess-os.jsonl'), r2, [
      ['Bash', { command: 'git mv a.md b.md' }],
      ['Bash', { command: 'git restore --staged b.md' }],
    ]);
    const o = classify(r2, 'sess-os');
    assert.ok(o.foreign.includes('b.md'), 'the unstaged new side has no evidence left');
    assert.deepEqual(plain(o, 'a.md'), { path: 'a.md', reason: 'rename-split', pair: 'b.md' });
    assert.deepEqual(o.mine, []);
  });
});

describe('a rename whose new side fails the replay (K16)', () => {
  test('neither side is mine, and commit-mine commits the rest while HEAD and the index keep the pair as it was', () => {
    const r2 = initRepo(path.join(root, 'rename'), { 'ren-src.txt': 'r1\nr2\n', 'other.txt': 'o\n', 'peerdel.txt': 'p\n' });
    git(r2, 'mv', 'ren-src.txt', 'ren-dst.txt');
    write(path.join(r2, 'ren-dst.txt'), 'R1\nr2\npeer\n'); // our Edit, then a peer's line
    write(path.join(r2, 'other.txt'), 'O\n');
    write(path.join(r2, 'peerdel.txt'), 'P\n');
    git(r2, 'add', 'peerdel.txt');
    git(r2, 'rm', '-qf', 'peerdel.txt'); // a peer's git rm after our edit and add
    writeTranscript(path.join(projects, 'proj-rename', 'sess-ren.jsonl'), r2, [
      ['Bash', { command: 'git mv ren-src.txt ren-dst.txt' }],
      ['Edit', { file_path: path.join(r2, 'ren-dst.txt'), old_string: 'r1', new_string: 'R1' }],
      ['Edit', { file_path: path.join(r2, 'other.txt'), old_string: 'o', new_string: 'O' }],
      ['Edit', { file_path: path.join(r2, 'peerdel.txt'), old_string: 'p', new_string: 'P' }],
      ['Bash', { command: 'git add peerdel.txt' }],
    ]);
    const o = classify(r2, 'sess-ren');
    assert.deepEqual([o.mine, o.mineNew], [['other.txt'], []]);
    assert.deepEqual(plain(o, 'ren-dst.txt'), { path: 'ren-dst.txt', reason: 'foreign-hunks', pair: 'ren-src.txt', addedForeign: 1, removedForeign: 0 });
    assert.deepEqual(plain(o, 'ren-src.txt'), { path: 'ren-src.txt', reason: 'rename-split', pair: 'ren-dst.txt' });
    assert.equal(plain(o, 'peerdel.txt').reason, 'deleted-outside-git');

    const head = git(r2, 'rev-parse', 'HEAD').trim();
    const pj = path.join(root, 'ren-paths.json');
    const step3 = path.join(root, 'ren-step3.json');
    const msg = path.join(root, 'ren-msg.txt');
    write(pj, JSON.stringify(o));
    write(step3, JSON.stringify(o));
    write(msg, 'rename\n');
    const r = runScript('commit-mine.mjs', ['--session', 'sess-ren', '--repo', r2, '--message-file', msg, '--paths-json', pj, '--expect', step3]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(r2, 'rev-parse', 'HEAD~1').trim(), head);
    assert.deepEqual(r.stdout.match(/^file: .*$/gm), ['file: other.txt']);
    assert.equal(git(r2, 'show', 'HEAD:peerdel.txt'), 'p\n', 'the peer\'s deletion is not committed');
    assert.equal(git(r2, 'show', 'HEAD:ren-src.txt'), 'r1\nr2\n', 'the rename is not committed');
    assert.deepEqual(git(r2, 'diff', '--cached', '--name-status').split('\n').filter(Boolean).sort(),
      ['D\tpeerdel.txt', 'R100\tren-src.txt\tren-dst.txt'], 'the peer\'s staging and our rename stay staged, untouched');
  });
});

describe('a file that can\'t be read (L12)', () => {
  test('a mine file another process holds locked is contested (unreadable), never taken as gone', { skip: !WIN && 'Windows-only (a share-none file handle)' }, async () => {
    const r2 = initRepo(path.join(root, 'locked'), { 'held.txt': 'h\n' });
    write(path.join(r2, 'held.txt'), 'H\n');
    writeTranscript(path.join(projects, 'proj-locked', 'sess-lock.jsonl'), r2, [
      ['Edit', { file_path: path.join(r2, 'held.txt'), old_string: 'h', new_string: 'H' }],
    ]);
    const file = path.join(r2, 'held.txt');
    const marker = path.join(root, 'held.marker');
    const release = path.join(root, 'held.release');
    const holder = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `$f=[IO.File]::Open($env:T_FILE,'Open','Read','None'); New-Item -ItemType File -Path $env:T_MARK | Out-Null; $n=0; while (-not (Test-Path $env:T_REL) -and $n -lt 300) { Start-Sleep -Milliseconds 100; $n++ }; $f.Close()`],
    { env: { ...process.env, T_FILE: file, T_MARK: marker, T_REL: release }, stdio: 'ignore', windowsHide: true });
    try {
      for (const t0 = Date.now(); !fs.existsSync(marker) && Date.now() - t0 < 20_000;) sleepMs(50);
      const res = await runScriptAsync('mine-paths.mjs', ['--session', 'sess-lock', '--repo', r2], { env: { SQUEAKY_PROJECTS_DIR: projects } });
      assert.equal(res.status, 0, res.stderr);
      const o = JSON.parse(res.stdout);
      assert.deepEqual(o.mine, []);
      assert.deepEqual(plain(o, 'held.txt'), { path: 'held.txt', reason: 'foreign-hunks', detail: 'unreadable (EBUSY)' });
    } finally {
      fs.writeFileSync(release, '');
      await new Promise((resolve) => holder.on('close', resolve));
    }
  });
});

describe('foreignLines and reversePatch, directly', () => {
  test('reversePatch rebuilds the old text, and refuses a patch that does not fit', () => {
    assert.equal(reversePatch('a\nB\nc\n', [hunk(2, 1, 2, 1, ['-b', '+B'])]), 'a\nb\nc\n');
    assert.equal(reversePatch('a\nb\n', [hunk(1, 0, 1, 1, ['+a'])]), 'b\n', 'an added first line');
    assert.equal(reversePatch('a\n', [hunk(1, 1, 1, 1, ['-a', '\\ No newline at end of file', '+a'])]), 'a', 'the old side lacked its final newline');
    assert.equal(reversePatch('keep', [hunk(1, 1, 1, 1, ['-keep', '+keep', '\\ No newline at end of file'])]), 'keep\n', 'only the new side lacks it');
    assert.equal(reversePatch('a\nb\n', [hunk(1, 1, 1, 1, ['-x', '+q'])]), null, 'the new side is not in the content');
    assert.equal(reversePatch('a\nb\n', [hunk(1, 1, 1, 2, ['-x', '+a'])]), null, 'the counts do not match the lines');
    assert.equal(reversePatch('a\n', 'not a list'), null);
  });

  test('reversePatch takes jsdiff\'s hunks as jsdiff 8 writes them: an empty new side, and several hunks', () => {
    // Each hunk below is jsdiff 8.0.3's own structuredPatch output.
    assert.equal(reversePatch('a\nc\n', [hunk(2, 1, 2, 0, ['-b'])]), 'a\nb\nc\n', 'a deleted line, newStart naming where it was');
    assert.equal(reversePatch('', [hunk(1, 2, 1, 0, ['-a', '-b'])]), 'a\nb\n', 'everything deleted');
    const now = 'a\nB\nc\nd\ne\nf\ng\nh\ni\nJ\nk\n';
    assert.equal(reversePatch(now, [hunk(1, 3, 1, 3, [' a', '-b', '+B', ' c']), hunk(9, 3, 9, 3, [' i', '-j', '+J', ' k'])]), 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\n');
    assert.equal(reversePatch(now, [hunk(9, 3, 9, 3, [' i', '-j', '+J', ' k']), hunk(1, 3, 1, 3, [' a', '-b', '+B', ' c'])]), null, 'hunks out of order');
  });

  test('foreignLines: binary only compares equal bytes with no ops; HEAD-less creates replay from nothing', () => {
    const bin = Buffer.from([0, 1, 2]);
    assert.equal(foreignLines(bin, Buffer.from(bin), []), null);
    assert.deepEqual(foreignLines(bin, Buffer.from(bin), [{ edits: [{ old: 'a', new: 'b', all: false }] }]), { detail: 'can\'t compare (binary)' });
    assert.equal(foreignLines(null, Buffer.from('n\n'), [{ write: 'n\n', kind: 'create' }]), null);
    assert.deepEqual(foreignLines(null, Buffer.from('n\n'), [{ edits: [{ old: '', new: 'n\n', all: false }] }]), null, 'an empty old_string creates the file');
    assert.deepEqual(foreignLines(Buffer.from('h\n'), Buffer.from('n\n'), [{ edits: [{ old: '', new: 'n\n', all: false }] }]),
      { detail: 'an Edit with an empty old_string, on a file with content' });
  });
});
