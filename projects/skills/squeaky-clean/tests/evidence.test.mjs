// What evidence still proves, and what a mine file may hold: evidence expires
// at the path's next commit, later git commands revoke it, a record's cwd is
// stamped after its call, and a mine file must hold only this session's own lines.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { dated, git, gitWith, initRepo, rm, runScript, scratch, toolResult, toolUse, write, writeTranscript } from './_helpers.mjs';

const WIN = process.platform === 'win32';
const T0 = Date.now() - 20 * 60_000; // when "this session" made its calls; the initial commit is older
const SAME = Math.floor(T0 / 1000) + 5; // a whole second holding both a call and a commit

let root; let repo; let projects; let out;
const at = (...p) => path.join(repo, ...p);
const fwd = (p) => p.replace(/\\/g, '/');
const entry = (o, p) => o.contested.find((c) => c.path === p);
// An entry without its sha1, which these tests don't pin.
const plain = (o, p) => { const { sha, ...rest } = entry(o, p) || {}; return rest; };

function classify(session) {
  const r = runScript('mine-paths.mjs', ['--session', session, '--repo', repo], { env: { SQUEAKY_PROJECTS_DIR: projects } });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

before(() => {
  root = scratch('squeaky-evidence-');
  repo = initRepo(path.join(root, 'repo'), {
    'mid.txt': 'mid\n', 'same.txt': 'same\n', 'fresh.txt': 'f\n', 'committed-add.txt': 'ca\n', 'p.md': 'p\n',
    'discarded.txt': 'd\n', 'errored-restore.txt': 'er\n', 'late.txt': 'l\n', 'gone.txt': 'gone\n',
    'burned/TODO.md': 'burned\n', 'b9/TODO.md': 'b9\n', 'sub2/sib.txt': 'sib\n', 'shared.md': 'x\ny\n',
    'partial.txt': 'const v = 1;\n', 'rewritten.txt': 'old\nlines\n', 'removal.txt': 'a\nb\nc\n', 'blob.bin': 'text\n',
    'added-only.txt': 'ao\n', 'msys.txt': 'm\n', 'forked.txt': 'fk\n', 'stash-a.txt': 'sa\n', 'stash-b.txt': 'sb\n', 'stash-c.txt': 'sc\n', 'stash-d.txt': 'sd\n',
    'blind-old.txt': 'bo\n',
  });
  projects = path.join(root, 'projects');

  // Mid-session commits, each after this session's own call on that path.
  write(at('mid.txt'), 'mid-ours\n');
  gitWith(dated(T0 + 10_000), repo, 'commit', '-q', '-m', 'mid', '--', 'mid.txt');
  write(at('same.txt'), 'same-ours\n');
  gitWith(dated(SAME * 1000), repo, 'commit', '-q', '-m', 'same second', '--', 'same.txt');
  write(at('committed-add.txt'), 'ca-ours\n');
  git(repo, 'add', 'committed-add.txt');
  gitWith(dated(T0 + 10_000), repo, 'commit', '-q', '-m', 'add and commit', '--', 'committed-add.txt');
  git(repo, 'rm', '-q', 'gone.txt');
  gitWith(dated(T0 + 10_000), repo, 'commit', '-q', '-m', 'gone', '--', 'gone.txt');
  write(at('blind-old.txt'), 'bo2\n');
  gitWith(dated(T0 + 10_000), repo, 'commit', '-q', '-m', 'blind-old committed', '--', 'blind-old.txt');
  write(at('blind-old.txt'), 'bo3\n'); // a peer's change after that commit

  // The tree at squeaky time: this session's work, and others' on top.
  write(at('mid.txt'), 'mid-peer\n');
  write(at('same.txt'), 'same-peer\n');
  write(at('fresh.txt'), 'f2\n');
  write(at('committed-add.txt'), 'ca-peer\n');
  git(repo, 'add', 'committed-add.txt'); // a peer re-stages what we committed: the c5e2d08b shape
  write(at('p.md'), 'p-peer\n');
  git(repo, 'add', 'p.md');
  write(at('discarded.txt'), 'd-peer\n');
  write(at('errored-restore.txt'), 'er-peer\n');
  git(repo, 'add', 'errored-restore.txt');
  write(at('late.txt'), 'l2\n');
  git(repo, 'add', 'late.txt');
  write(at('gone.txt'), 'someone else made a new one\n');
  write(at('burned', 'TODO.md'), 'burned-ours\n');
  git(repo, 'add', 'burned/TODO.md');
  write(at('b9', 'TODO.md'), 'b9-peer\n');
  git(repo, 'add', 'b9/TODO.md');
  write(at('sub2', 'sib.txt'), 'sib-peer\n');
  git(repo, 'add', 'sub2/sib.txt');
  write(at('shared.md'), 'x\ny\nB\nA\n'); // our A after y, then a peer's B after y
  write(at('partial.txt'), 'const v = 2;\n');
  write(at('rewritten.txt'), 'brand\nnew\n');
  write(at('ours-new.txt'), 'mine\npeer\n');
  write(at('removal.txt'), 'b\nc\nd\n'); // our d added, a peer's removal of a
  fs.writeFileSync(at('blob.bin'), Buffer.from([0, 1, 2, 3]));
  write(at('added-only.txt'), 'ao2\n');
  git(repo, 'add', 'added-only.txt');
  write(at('failed-add.txt'), 'fa\n');
  git(repo, 'add', 'failed-add.txt');
  write(at('folder', 'a.txt'), 'fo\n');
  git(repo, 'add', 'folder/');
  write(at('msys.txt'), 'm2\n');
  write(at('forked.txt'), 'fk2\n');
  write(at('stash-a.txt'), 'sa2\n');
  write(at('stash-b.txt'), 'sb2\n');
  git(repo, 'add', 'stash-b.txt');
  git(repo, 'rm', '-q', 'stash-c.txt'); // staged deletion: only this session's git rm says it is ours
  write(at('stash-d.txt'), 'sd2\n');
  git(repo, 'add', 'stash-d.txt');

  const t = (k) => ({ at: T0 + k });
  const main = path.join(projects, 'proj', 'sess-self.jsonl');
  const calls = [
    ['Edit', { file_path: at('mid.txt'), old_string: 'mid', new_string: 'mid-ours' }, t(0)],
    ['Edit', { file_path: at('same.txt'), old_string: 'same', new_string: 'same-ours' }, { at: SAME * 1000 + 500 }],
    ['Edit', { file_path: at('fresh.txt'), old_string: 'f', new_string: 'f2' }, t(1)],
    ['Write', { file_path: at('committed-add.txt'), content: 'ca-ours\n' }, t(2)],
    ['Bash', { command: 'git add committed-add.txt' }, t(3)],
    ['Bash', { command: 'git add p.md' }, t(4)],
    ['Bash', { command: 'git restore --staged p.md' }, t(5)],
    ['Edit', { file_path: at('discarded.txt'), old_string: 'd', new_string: 'd-ours' }, t(6)],
    ['Bash', { command: 'git checkout -- discarded.txt' }, t(7)],
    ['Bash', { command: 'git add errored-restore.txt' }, t(8)],
    ['Bash', { command: 'git restore --staged errored-restore.txt' }, { ...t(9), error: true }],
    ['Edit', { file_path: at('late.txt'), old_string: 'l', new_string: 'l2' }, t(10)],
    ['Bash', { command: 'git add late.txt' }, t(10.5)],
    ['Bash', { command: 'git rm gone.txt' }, t(11)],
    ['Edit', { file_path: at('burned', 'TODO.md'), old_string: 'burned', new_string: 'burned-ours' }, t(12)],
    // Stamped after the call: the record's cwd is where the cd ended, not where the add ran.
    ['Bash', { command: 'git add TODO.md && cd ../b9 && pnpm typecheck' }, { ...t(13), cwd: at('b9') }],
    ['Bash', { command: 'cd sub2' }, { ...t(14), cwd: at('sub2'), msgId: 'msg-parallel' }],
    ['Bash', { command: 'git add sib.txt' }, { ...t(15), cwd: at('sub2'), msgId: 'msg-parallel' }],
    ['Edit', { file_path: at('shared.md'), old_string: 'y\n', new_string: 'y\nA\n' }, t(16)],
    ['Edit', { file_path: at('partial.txt'), old_string: '1', new_string: '2' }, t(17)],
    ['Write', { file_path: at('rewritten.txt'), content: 'brand\nnew\n' }, { ...t(18), pre: 'old\nlines\n' }],
    ['Write', { file_path: at('ours-new.txt'), content: 'mine\n' }, t(19)],
    ['Edit', { file_path: at('removal.txt'), old_string: 'c\n', new_string: 'c\nd\n' }, t(20)],
    ['Write', { file_path: at('blob.bin'), content: 'text2\n' }, { ...t(21), pre: 'text\n' }],
    ['Bash', { command: 'git add added-only.txt' }, t(22)],
    ['Write', { file_path: at('failed-add.txt'), content: 'fa\n' }, t(23)],
    ['Bash', { command: 'git add failed-add.txt && false' }, { ...t(24), error: true }],
    ['Write', { file_path: at('folder', 'a.txt'), content: 'fo\n' }, t(25)],
    ['Bash', { command: 'git add folder/' }, t(26)],
  ];
  if (WIN) {
    const real = fs.realpathSync.native(at('msys.txt'));
    calls.push(['Edit', { file_path: `/${real[0].toLowerCase()}/${fwd(real.slice(3))}`, old_string: 'm', new_string: 'm2' }, t(27)]);
  }
  writeTranscript(main, repo, calls);
  // History a --fork-session copied in: the parent's records, under the parent's id.
  const fork = toolUse('Edit', { file_path: at('forked.txt'), old_string: 'fk', new_string: 'fk2' }, repo, { session: 'sess-parent', at: T0 + 28 });
  fs.appendFileSync(main, `${JSON.stringify(fork.line)}\n${JSON.stringify(toolResult(fork.id, false, { session: 'sess-parent', at: T0 + 29 }))}\n`);
  fs.appendFileSync(main, 'this line is not JSON and holds no tool marker\n');
  fs.appendFileSync(main, `${JSON.stringify({ type: 'system', sessionId: 'sess-self', timestamp: new Date(T0 + 30).toISOString() })}\n`);
  // A subagent's earlier unstage of late.txt takes back nothing that came after it.
  writeTranscript(path.join(projects, 'proj', 'sess-self', 'subagents', 'agent-early.jsonl'), repo, [
    ['Bash', { command: 'git restore --staged late.txt' }, { at: T0 - 100 }],
  ]);
  writeTranscript(path.join(projects, 'proj', 'sess-peer.jsonl'), repo, [
    ['Edit', { file_path: at('shared.md'), old_string: 'y\n', new_string: 'y\nB\n' }, t(40)],
  ]);
  writeTranscript(path.join(projects, 'proj', 'sess-stash.jsonl'), repo, [
    ['Edit', { file_path: at('stash-a.txt'), old_string: 'sa', new_string: 'sa2' }, t(0)],
    ['Edit', { file_path: at('stash-b.txt'), old_string: 'sb', new_string: 'sb2' }, t(1)],
    ['Bash', { command: 'git add stash-b.txt' }, t(2)],
    ['Bash', { command: 'git rm stash-c.txt' }, t(2.2)],
    ['Bash', { command: 'git add stash-d.txt' }, t(2.4)],
    ['Bash', { command: 'git stash push -m "token=s3cr3t"' }, t(3)],
    ['Bash', { command: 'git add stash-d.txt' }, t(4)],
  ]);
  writeTranscript(path.join(projects, 'proj', 'sess-stale-blind.jsonl'), repo, [
    ['Edit', { file_path: at('blind-old.txt'), old_string: 'bo', new_string: 'bo2' }, t(0)],
    ['Bash', { command: 'git add blind-old.txt' }, t(1)],
    ['Bash', { command: 'git reset' }, t(2)],
  ]);
  writeTranscript(path.join(projects, 'proj', 'sess-stash-list.jsonl'), repo, [
    ['Edit', { file_path: at('stash-b.txt'), old_string: 'sb', new_string: 'sb2' }, t(1)],
    ['Bash', { command: 'git add stash-b.txt' }, t(2)],
    ['Bash', { command: 'git stash list' }, t(3)],
  ]);
  out = classify('sess-self');
});
after(() => rm(root));

describe('evidence expires at the path\'s next commit (G1)', () => {
  test('a path this session committed mid-session, then a peer changed, is committed-since, never mine', () => {
    assert.equal(entry(out, 'mid.txt').reason, 'committed-since');
    assert.ok(!out.mine.includes('mid.txt'));
  });

  test('a call in the same whole second as the commit counts as stale', () => {
    assert.equal(entry(out, 'same.txt').reason, 'committed-since');
  });

  test('git add and commit, then a peer re-stages the file: committed-since, staged, never mine', () => {
    assert.deepEqual(plain(out, 'committed-add.txt'), { path: 'committed-add.txt', reason: 'committed-since', staged: true });
  });

  test('a git rm that was committed no longer makes a re-created file rm-cached', () => {
    assert.deepEqual(plain(out, 'gone.txt'), { path: 'gone.txt', reason: 'committed-since', untracked: true });
  });

  test('evidence after the last commit still counts: an edit, even one inside a line, is mine', () => {
    assert.ok(out.mine.includes('fresh.txt'));
    assert.ok(out.mine.includes('partial.txt'), 'an Edit of part of a line is replayed exactly');
  });
});

describe('later git commands revoke earlier evidence (G1)', () => {
  test('git restore --staged revokes a git add: the peer\'s staged p.md is foreign and peer-staged', () => {
    assert.ok(out.foreign.includes('p.md'));
    assert.ok(out.peerStaged.includes('p.md'));
  });

  test('a worktree discard (git checkout --) takes nothing back: the edited file, discarded and changed by a peer, fails the replay', () => {
    assert.deepEqual(plain(out, 'discarded.txt'), { path: 'discarded.txt', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 1 });
  });

  test('a revoking command counts even when its call errored', () => {
    assert.ok(out.foreign.includes('errored-restore.txt'));
    assert.ok(out.peerStaged.includes('errored-restore.txt'));
  });

  test('timestamps order calls across transcripts: a subagent\'s earlier unstage leaves a later git add standing', () => {
    assert.ok(out.mine.includes('late.txt'));
  });

  test('a bare git stash takes back every git add/mv/rm before it, with a warning naming it; edits stay, checked by the replay', () => {
    const o = classify('sess-stash');
    assert.deepEqual(o.mine, ['stash-a.txt'], 'an edit is never taken back');
    assert.deepEqual(plain(o, 'stash-b.txt'), { path: 'stash-b.txt', reason: 'revoked', revokedBy: 'git stash', staged: true, addedForeign: 0, removedForeign: 0 }, 'a blind revoke only turns a staged path into revoked');
    assert.deepEqual(plain(o, 'stash-c.txt'), { path: 'stash-c.txt', reason: 'revoked', revokedBy: 'git stash', staged: true }, 'a git rm alone, taken back: asked about, never a peer\'s');
    assert.ok(!o.foreign.includes('stash-c.txt') && !o.peerStaged.includes('stash-c.txt'));
    assert.ok(o.warnings.includes('"git stash" may have unstaged any path: every git add/mv/rm before it is taken back'), o.warnings.join('\n'));
    assert.ok(!o.warnings.some((w) => /s3cr3t/.test(w)), 'the warning names the git subcommand, never its arguments');
    assert.equal(plain(o, 'stash-d.txt').reason, 'foreign-hunks', 'a git add after the revoke stands, so not revoked (and, as ever, an add proves no lines)');
  });

  test('evidence a blind revoke took back expires too: once the path was committed since, it is committed-since, not revoked', () => {
    const o = classify('sess-stale-blind');
    assert.deepEqual(plain(o, 'blind-old.txt'), { path: 'blind-old.txt', reason: 'committed-since' });
  });

  test('git stash list takes back nothing, and warns of nothing', () => {
    const o = classify('sess-stash-list');
    assert.deepEqual(o.mine, ['stash-b.txt']);
    assert.ok(!o.warnings.some((w) => /may have unstaged/.test(w)), o.warnings.join('\n'));
  });
});

describe('staging this session can\'t prove per file (G2, G4)', () => {
  test('a git add in a call that errored: staged-by-failed-command, not staged-elsewhere', () => {
    assert.deepEqual(plain(out, 'failed-add.txt'), { path: 'failed-add.txt', reason: 'staged-by-failed-command', staged: true, addedForeign: 0, removedForeign: 0 });
  });

  test('a file this session wrote and staged through a folder add: staged-elsewhere', () => {
    assert.deepEqual(plain(out, 'folder/a.txt'), { path: 'folder/a.txt', reason: 'staged-elsewhere', staged: true, addedForeign: 0, removedForeign: 0 });
  });
});

describe('a record\'s cwd is stamped after its call (G14)', () => {
  test('git add TODO.md && cd ../b9: the add never lands on b9\'s TODO.md', () => {
    assert.ok(out.foreign.includes('b9/TODO.md'));
    assert.ok(out.peerStaged.includes('b9/TODO.md'));
    assert.equal(entry(out, 'burned/TODO.md').reason, 'staged-elsewhere', 'our own add, from a start the record does not show, is unproven');
  });

  test('a cd in a parallel call of the same message leaves its sibling\'s start unknown', () => {
    assert.ok(out.foreign.includes('sub2/sib.txt'));
    assert.ok(out.peerStaged.includes('sub2/sib.txt'));
  });
});

describe('transcript records (G16, G18)', () => {
  test('a record stamped with another session id (a --fork-session copy) is skipped, with a warning', () => {
    assert.ok(out.foreign.includes('forked.txt'));
    assert.ok(out.warnings.some((w) => /2 transcript record\(s\) stamped with another session id skipped/.test(w)), out.warnings.join('\n'));
  });

  test('a non-JSON line that is not the last counts as malformed, tool marker or not', () => {
    assert.ok(out.warnings.some((w) => /^1 malformed transcript line/.test(w)), out.warnings.join('\n'));
  });

  test('a file path spelled /c/... is the C:/... file', { skip: !WIN && 'Windows-only' }, () => {
    assert.ok(out.mine.includes('msys.txt'));
  });

  test('a transcript folder that can\'t be read is reported, never taken as "none here"', () => {
    const p2 = path.join(root, 'projects-broken');
    write(path.join(p2, 'proj', 'sess-x.jsonl'), '');
    write(path.join(p2, 'proj', 'sess-x', 'subagents'), 'a file where the subagents folder should be');
    const r = runScript('mine-paths.mjs', ['--session', 'sess-x', '--repo', repo], { env: { SQUEAKY_PROJECTS_DIR: p2 } });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(JSON.parse(r.stdout).warnings.some((w) => /cannot read .*subagents \(ENOTDIR\)/.test(w)));
  });
});

describe('a mine file holds only this session\'s own lines (G22)', () => {
  test('two sessions each add a line to one file: it is foreign-hunks for each of them', () => {
    assert.deepEqual(plain(out, 'shared.md'), { path: 'shared.md', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 0 });
    const peer = classify('sess-peer');
    assert.deepEqual(plain(peer, 'shared.md'), { path: 'shared.md', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 0 });
    assert.ok(!out.mine.includes('shared.md') && !peer.mine.includes('shared.md'));
  });

  test('a file this session rewrote with Write stays mine', () => {
    assert.ok(out.mine.includes('rewritten.txt'));
  });

  test('a peer\'s line appended to our untracked new file: contested, never mineNew', () => {
    assert.deepEqual(plain(out, 'ours-new.txt'), { path: 'ours-new.txt', reason: 'foreign-hunks', untracked: true, addedForeign: 1, removedForeign: 0 });
  });

  test('a peer\'s removal of a line our edits kept is foreign too', () => {
    assert.deepEqual(plain(out, 'removal.txt'), { path: 'removal.txt', reason: 'foreign-hunks', addedForeign: 0, removedForeign: 1 });
  });

  test('a file this session only git-added holds none of its own lines', () => {
    assert.deepEqual(plain(out, 'added-only.txt'), { path: 'added-only.txt', reason: 'foreign-hunks', addedForeign: 1, removedForeign: 1 });
  });

  test('a binary file can\'t be compared: contested, the safe way', () => {
    assert.deepEqual(plain(out, 'blob.bin'), { path: 'blob.bin', reason: 'foreign-hunks', detail: 'can\'t compare (binary)' });
  });

  test('the exact mine list', () => {
    assert.deepEqual(out.mine, ['fresh.txt', 'late.txt', ...(WIN ? ['msys.txt'] : []), 'partial.txt', 'rewritten.txt']);
    assert.deepEqual(out.mineNew, []);
  });
});
