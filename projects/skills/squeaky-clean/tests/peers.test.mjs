import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { processStartTimes, selfEntry } from '../scripts/peers.mjs';
import { deadPid, fileTimes, initRepo, rm, runScript, scratch, spawnSleepers } from './_helpers.mjs';

const WIN = process.platform === 'win32';
const EPOCH_1970 = '116444736000000000'; // a FILETIME no live process has
const SELF = 'sess-self';

let root; let repoA; let repoB; let kids = []; let starts = new Map();

before(() => {
  root = scratch('squeaky-peers-');
  repoA = initRepo(path.join(root, 'repo-a'), { 'a.txt': 'a\n', 'sub/keep.txt': 'k\n' });
  repoB = initRepo(path.join(root, 'repo-b'), { 'b.txt': 'b\n' });
  kids = spawnSleepers(4); // kids[0] stands in for this session
  starts = WIN ? fileTimes(kids.map((k) => k.pid)) : new Map();
});

after(() => {
  for (const k of kids) { try { k.kill(); } catch { /* already gone */ } }
  rm(root);
});

function entry(pid, over = {}) {
  const now = Date.now();
  return {
    pid,
    sessionId: `sess-${pid}`,
    cwd: repoA,
    startedAt: now - 3_600_000,
    procStart: starts.get(pid) ?? EPOCH_1970,
    name: `peer-${pid}`,
    status: 'busy',
    updatedAt: now,
    statusUpdatedAt: now,
    messagingSocketPath: 'SECRET-SOCKET-VALUE',
    bridgeSessionId: 'SECRET-BRIDGE-VALUE',
    ...over,
  };
}

// A registry folder. It holds this session's own entry (kids[0], sess-self)
// unless `self` is false or the entries already give kids[0] one.
let regSeq = 0;
function registry(entries, extraFiles = {}, { self = true } = {}) {
  const dir = path.join(root, `sessions-${++regSeq}`);
  fs.mkdirSync(dir);
  const all = self && !entries.some((e) => e.pid === kids[0].pid) ? [entry(kids[0].pid, { sessionId: SELF }), ...entries] : entries;
  for (const e of all) fs.writeFileSync(path.join(dir, `${e.pid}.json`), JSON.stringify(e));
  for (const [name, text] of Object.entries(extraFiles)) fs.writeFileSync(path.join(dir, name), text);
  return dir;
}

function peers(sessionsDir, { args = ['--self-session', SELF, '--toplevel', repoA], env = {}, cwd } = {}) {
  const r = runScript('peers.mjs', args, { env: { SQUEAKY_SESSIONS_DIR: sessionsDir, ...env }, cwd });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes('SECRET'), 'messagingSocketPath / bridgeSessionId must never print');
  return JSON.parse(r.stdout);
}

const byPid = (rows) => rows.sort((a, b) => a[0] - b[0]);

describe('peers.mjs', () => {
  test('excludes self (by session id), dead pids and other toplevels; keeps an idle same-repo peer', () => {
    const dead = deadPid();
    const dir = registry([
      entry(kids[1].pid, { sessionId: 'sess-peer-idle', status: 'idle', cwd: path.join(repoA, 'sub'), statusUpdatedAt: Date.now() - 30 * 60_000 }),
      entry(dead, { sessionId: 'sess-dead' }),
      entry(kids[3].pid, { sessionId: 'sess-other-repo', cwd: repoB }),
    ], { [`${kids[1].pid}.0123abcd.key`]: 'not json, never read' });
    const out = peers(dir);
    assert.equal(out.ok, true);
    assert.deepEqual(out.peers.map((p) => p.pid), [kids[1].pid]);
    const [p] = out.peers;
    assert.equal(p.session, 'sess-pee', 'session is the first 8 characters only');
    assert.equal(p.status, 'idle');
    assert.equal(p.name, `peer-${kids[1].pid}`);
    assert.ok(p.idleMinutes >= 29 && p.idleMinutes <= 31, `idleMinutes ${p.idleMinutes}`);
    assert.equal(out.busyPeer, false);
    // The machine view keeps the other-repo session the git scope dropped.
    assert.deepEqual(out.others.map((o) => [o.pid, o.status]), byPid([[kids[1].pid, 'idle'], [kids[3].pid, 'busy']]));
    assert.equal(out.anyOtherLive, true);
    assert.equal(out.busyAnywhere, true);
    assert.equal(out.twin, false);
    assert.deepEqual(out.warnings, [], 'a <pid>.<hex>.key file beside its entry is expected');
  });

  test('an idle session in another repo: no peer, but anyOtherLive (its dev server may still run)', () => {
    const dir = registry([entry(kids[3].pid, { sessionId: 'sess-elsewhere', cwd: repoB, status: 'idle' })]);
    const out = peers(dir);
    assert.deepEqual(out.peers, []);
    assert.equal(out.busyPeer, false);
    assert.deepEqual(out.others.map((o) => o.pid), [kids[3].pid]);
    assert.equal(out.others[0].cwd, repoB);
    assert.equal(out.anyOtherLive, true);
    assert.equal(out.busyAnywhere, false);
  });

  test('a session in a folder outside any repo is out of the git scope but in the machine view', () => {
    const lone = path.join(root, 'plain-folder');
    fs.mkdirSync(lone, { recursive: true });
    const dir = registry([entry(kids[2].pid, { cwd: lone, status: 'busy' })]);
    const out = peers(dir, { env: { GIT_CEILING_DIRECTORIES: root } });
    assert.deepEqual(out.peers, []);
    assert.deepEqual(out.others.map((o) => [o.pid, o.status]), [[kids[2].pid, 'busy']]);
    assert.equal(out.busyAnywhere, true);
  });

  test('a live session whose folder can\'t be resolved is an unresolved peer, counted busy, with a warning', () => {
    const gone = path.join(root, 'deleted-folder');
    const dir = registry([
      entry(kids[1].pid, { cwd: null, status: 'idle' }),
      entry(kids[2].pid, { cwd: gone, status: 'idle' }),
    ]);
    const out = peers(dir);
    assert.deepEqual(out.peers.map((p) => [p.pid, p.status]), byPid([[kids[1].pid, 'unresolved'], [kids[2].pid, 'unresolved']]));
    assert.equal(out.busyPeer, true);
    assert.equal(out.busyAnywhere, true);
    assert.equal(out.anyOtherLive, true);
    assert.equal(out.warnings.filter((w) => /counted as a busy peer/.test(w)).length, 2);
  });

  test('only git\'s own "not a git repository" takes a session out of scope; any other git failure is unresolved', () => {
    const dir = registry([entry(kids[1].pid, { cwd: path.join(repoA, '.git'), status: 'idle' })]);
    const out = peers(dir);
    assert.deepEqual(out.peers.map((p) => [p.pid, p.status]), [[kids[1].pid, 'unresolved']]);
    assert.ok(out.warnings.some((w) => /git rev-parse failed there/.test(w)));
  });

  test('when git itself can\'t start, a live session is an unresolved peer, never dropped', () => {
    const empty = path.join(root, 'empty-bin');
    fs.mkdirSync(empty, { recursive: true });
    const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
    const dir = registry([entry(kids[1].pid, { status: 'idle' })]);
    const out = peers(dir, { env: { [pathKey]: empty } });
    assert.deepEqual(out.peers.map((p) => [p.pid, p.status]), [[kids[1].pid, 'unresolved']]);
    assert.equal(out.busyPeer, true);
    assert.ok(out.warnings.some((w) => /git could not run/.test(w)));
  });

  test('without CLAUDE_PID, two live entries with our session id are twins; one is just us', () => {
    const twins = registry([entry(kids[1].pid, { sessionId: SELF })]);
    const out = peers(twins);
    assert.equal(out.twin, true);
    assert.equal(out.anyOtherLive, true);
    assert.deepEqual(out.others.map((o) => o.pid), [kids[0].pid, kids[1].pid].sort((a, b) => a - b));
    const single = peers(registry([]));
    assert.equal(single.twin, false);
    assert.deepEqual(single.others, []);
    assert.equal(single.anyOtherLive, false);
  });

  test('self session id comes from CLAUDE_CODE_SESSION_ID when no flag is given', () => {
    const out = peers(registry([]), { args: ['--toplevel', repoA], env: { CLAUDE_CODE_SESSION_ID: SELF } });
    assert.equal(out.ok, true);
    assert.deepEqual(out.peers, []);
    assert.equal(out.busyPeer, false);
  });

  test('excludes self by CLAUDE_PID even when the session id differs', () => {
    const dir = registry([entry(kids[0].pid, { sessionId: 'sess-renamed' })]);
    const out = peers(dir, { env: { CLAUDE_PID: String(kids[0].pid) } });
    assert.equal(out.ok, true);
    assert.deepEqual(out.peers, []);
  });

  test('a second live process with our session id (a resumed twin) is a peer, flagged', () => {
    const dir = registry([entry(kids[1].pid, { sessionId: SELF })]);
    const out = peers(dir, { env: { CLAUDE_PID: String(kids[0].pid) } });
    assert.deepEqual(out.peers.map((p) => p.pid), [kids[1].pid]);
    assert.equal(out.peers[0].twin, true);
    assert.equal(out.busyPeer, true);
    assert.equal(out.twin, true);
  });

  test('a registry that doesn\'t describe this session reads as ok:false, never as "nobody else here"', () => {
    // No entry carries our id (a registry that renamed its fields, say).
    const noSelf = peers(registry([entry(kids[1].pid)], {}, { self: false }));
    assert.equal(noSelf.ok, false);
    assert.equal(noSelf.anyOtherLive, true);
    assert.match(noSelf.error, /registry does not describe this session/);
    // CLAUDE_PID's entry is missing.
    const noPidEntry = peers(registry([entry(kids[1].pid)]), { env: { CLAUDE_PID: String(kids[2].pid) } });
    assert.equal(noPidEntry.ok, false);
    // No identity at all.
    const none = peers(registry([entry(kids[1].pid)]), { args: ['--toplevel', repoA] });
    assert.equal(none.ok, false);
    assert.equal(none.twin, null);
    assert.match(none.error, /no session id and no CLAUDE_PID/);
  });

  test('our own entry with a start time that doesn\'t match (procStart in other units) reads as ok:false', { skip: !WIN && 'procStart check is Windows-only' }, () => {
    const moved = String(BigInt(starts.get(kids[0].pid)) / 10_000n); // FILETIME ticks read as milliseconds
    const out = peers(registry([entry(kids[0].pid, { sessionId: SELF, procStart: moved }), entry(kids[1].pid)]));
    assert.equal(out.ok, false);
    assert.match(out.error, /matching start time/);
  });

  test('a live pid whose procStart does not match (a recycled pid, or a peer on another version) stays, unverified, live and busy', { skip: !WIN && 'procStart check is Windows-only' }, () => {
    const dir = registry([
      entry(kids[1].pid, { procStart: EPOCH_1970, status: 'idle', cwd: repoB }),
      entry(kids[2].pid, { procStart: String(Date.now()), status: 'idle', cwd: repoB }), // milliseconds, not FILETIME
    ]);
    const out = peers(dir);
    assert.equal(out.ok, true);
    assert.deepEqual(out.others.map((o) => [o.pid, o.status]), [[kids[1].pid, 'unverified'], [kids[2].pid, 'unverified']].sort((a, b) => a[0] - b[0]));
    assert.equal(out.anyOtherLive, true);
    assert.equal(out.busyAnywhere, true, 'an idle status it can\'t verify counts as busy');
    for (const k of [kids[1], kids[2]]) assert.ok(out.warnings.some((w) => w.startsWith(`pid ${k.pid} unverified`)), out.warnings.join('\n'));
  });

  test('a registry file name that isn\'t <pid>.json or its .key reads as ok:false: the layout may have changed', () => {
    const fine = peers(registry([], { [`${kids[0].pid}.89abcdef.key`]: 'k' }));
    assert.equal(fine.ok, true);
    for (const name of ['session-abc.json', 'notes.txt']) {
      const out = peers(registry([], { [name]: '{}' }));
      assert.equal(out.ok, false, name);
      assert.match(out.error, new RegExp(`registry file ${name.replace('.', '\\.')} is not a <pid>\\.json entry`));
    }
  });

  test('when the start-time lookup fails, a live pid is kept (alive is the conservative answer)', { skip: !WIN && 'Windows-only' }, () => {
    const dir = registry([entry(kids[1].pid, { procStart: EPOCH_1970 })]);
    const out = peers(dir, { env: { SQUEAKY_POWERSHELL: 'no-such-powershell-binary.exe' } });
    assert.deepEqual(out.peers.map((p) => p.pid), [kids[1].pid]);
    assert.ok(out.warnings.some((w) => /start-time lookup failed/.test(w)));
  });

  test('a busy peer sets busyPeer', () => {
    const dir = registry([
      entry(kids[1].pid, { status: 'idle' }),
      entry(kids[2].pid, { status: 'busy' }),
    ]);
    const out = peers(dir);
    assert.equal(out.peers.length, 2);
    assert.equal(out.busyPeer, true);
    assert.equal(out.peers.find((p) => p.pid === kids[2].pid).idleMinutes, null);
  });

  test('any non-idle status (e.g. shell) counts as busy', () => {
    const dir = registry([entry(kids[1].pid, { status: 'shell' })]);
    assert.equal(peers(dir).busyPeer, true);
  });

  test('a missing registry gives ok:false: the gates at their worst case, and twin unknown (null), never false', () => {
    const out = peers(path.join(root, 'no-such-registry'));
    assert.deepEqual({ ...out, error: undefined, warnings: undefined }, {
      ok: false, assumePeer: true, peers: [], busyPeer: true, others: [], anyOtherLive: true, busyAnywhere: true, twin: null,
      warnings: undefined, error: undefined,
    });
    assert.match(out.error, /unreadable/);
    assert.deepEqual(out.warnings, [out.error]);
  });

  test('an unknown option gives the ok:false shape', () => {
    const out = peers(registry([]), { args: ['--self-sesion', SELF, '--toplevel', repoA] });
    assert.equal(out.ok, false);
    assert.equal(out.anyOtherLive, true);
    assert.match(out.error, /unknown option --self-sesion/);
  });

  test('an unreadable registry (a file, not a folder) gives assumePeer', () => {
    const file = path.join(root, 'registry-is-a-file');
    fs.writeFileSync(file, 'x');
    const out = peers(file);
    assert.equal(out.ok, false);
    assert.equal(out.assumePeer, true);
  });

  test('an unreadable entry for a live pid counts as a busy peer, and leaves twin unknown (it may be ours)', () => {
    const dir = registry([], { [`${kids[1].pid}.json`]: '{"pid":' });
    const out = peers(dir);
    assert.equal(out.ok, true);
    assert.deepEqual(out.peers.map((p) => [p.pid, p.status]), [[kids[1].pid, 'unreadable']]);
    assert.equal(out.busyPeer, true);
    assert.equal(out.twin, null);
    assert.equal(peers(dir, { env: { CLAUDE_PID: String(kids[0].pid) } }).twin, null, 'CLAUDE_PID does not settle it');
  });

  test('a twin a readable entry proves stays true, whatever unreadable entries sit beside it', () => {
    const dir = registry([entry(kids[1].pid, { sessionId: SELF })], { [`${kids[2].pid}.json`]: '{"pid":' });
    assert.equal(peers(dir).twin, true, 'without CLAUDE_PID: two live entries carry our id');
    assert.equal(peers(dir, { env: { CLAUDE_PID: String(kids[0].pid) } }).twin, true, 'with CLAUDE_PID: another entry carries our id');
  });

  test('selfEntry: this session\'s own live entry, or null when the registry can\'t say which one is us', () => {
    const one = registry([entry(kids[1].pid)]);
    assert.equal(selfEntry({ sessionsDir: one, selfSession: SELF, selfPid: 0 }).pid, kids[0].pid);
    assert.equal(selfEntry({ sessionsDir: one, selfSession: SELF, selfPid: kids[0].pid }).pid, kids[0].pid);
    const two = registry([entry(kids[1].pid, { sessionId: SELF })]);
    assert.equal(selfEntry({ sessionsDir: two, selfSession: SELF, selfPid: 0 }), null, 'two live entries carry our id: which is us is unknown');
    assert.equal(selfEntry({ sessionsDir: two, selfSession: SELF, selfPid: kids[1].pid }).pid, kids[1].pid, 'CLAUDE_PID settles it');
    assert.equal(selfEntry({ sessionsDir: path.join(root, 'no-such-registry'), selfSession: SELF, selfPid: 0 }), null);
    assert.equal(selfEntry({ sessionsDir: registry([], {}, { self: false }), selfSession: SELF, selfPid: 0 }), null);
  });

  test('with CLAUDE_PID but no session id, twin is unknown (null): nothing names the id a twin would carry', () => {
    const dir = registry([entry(kids[1].pid, { sessionId: SELF })]);
    const out = peers(dir, { args: ['--toplevel', repoA], env: { CLAUDE_PID: String(kids[0].pid) } });
    assert.equal(out.ok, true);
    assert.equal(out.twin, null);
  });

  test('the start-time lookup keeps the lines it printed when it exits non-zero (one pid already gone)', { skip: !WIN && 'Windows-only' }, () => {
    const map = processStartTimes([process.pid, deadPid()]);
    assert.ok(map && map.has(process.pid), 'a gone pid makes Get-Process exit 1; the live one still counts');
    assert.equal(map.size, 1);
  });

  test('outside any repo and with no --toplevel, it assumes a peer', () => {
    const lone = path.join(root, 'not-a-repo');
    fs.mkdirSync(lone, { recursive: true });
    const out = peers(registry([]), { args: ['--self-session', SELF], cwd: lone, env: { GIT_CEILING_DIRECTORIES: root } });
    assert.equal(out.ok, false);
    assert.equal(out.assumePeer, true);
  });
});
