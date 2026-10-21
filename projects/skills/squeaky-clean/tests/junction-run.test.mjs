// SKILL.md runs the scripts as node "$HOME/.claude/skills/squeaky-clean/scripts/<x>.mjs",
// and ~/.claude/skills/<name> is a directory junction. The scripts must run,
// and find their shared lib, through such a link.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { SCRIPTS, cleanEnv, fileTimes, initRepo, rm, scratch } from './_helpers.mjs';

let root; let linkedScripts; let repo;

before(() => {
  root = scratch('squeaky-junction-');
  const real = path.join(root, 'real-skill');
  fs.cpSync(SCRIPTS, path.join(real, 'scripts'), { recursive: true }); // a copy: the link never points at the source
  fs.mkdirSync(path.join(root, 'skills'));
  fs.symlinkSync(real, path.join(root, 'skills', 'squeaky-clean'), 'junction');
  linkedScripts = path.join(root, 'skills', 'squeaky-clean', 'scripts');
  repo = initRepo(path.join(root, 'repo'), { 'a.txt': 'a\n' });
});

after(() => rm(root));

function run(script, args, env) {
  return spawnSync(process.execPath, [path.join(linkedScripts, script), ...args], {
    cwd: repo, env: cleanEnv(env), encoding: 'utf8', windowsHide: true,
  });
}

test('peers.mjs runs through a directory junction', () => {
  const reg = path.join(root, 'sessions');
  fs.mkdirSync(reg, { recursive: true });
  // This session's own entry: the test process stands in for it.
  const self = { pid: process.pid, sessionId: 'sess-self', cwd: repo, status: 'busy' };
  const start = fileTimes([process.pid]).get(process.pid);
  if (start) self.procStart = start;
  fs.writeFileSync(path.join(reg, `${process.pid}.json`), JSON.stringify(self));
  const r = run('peers.mjs', ['--self-session', 'sess-self'], { SQUEAKY_SESSIONS_DIR: reg });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), {
    ok: true, peers: [], busyPeer: false, others: [], anyOtherLive: false, busyAnywhere: false, twin: false, warnings: [],
  });
});

test('mine-paths.mjs runs through a directory junction', () => {
  fs.writeFileSync(path.join(repo, 'a.txt'), 'changed\n');
  const r = run('mine-paths.mjs', ['--session', 'sess-self'], { SQUEAKY_PROJECTS_DIR: path.join(root, 'projects') });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).foreign, ['a.txt']);
});

test('commit-mine.mjs runs through a directory junction (and has nothing to commit)', () => {
  const pj = path.join(root, 'paths.json');
  const step3 = path.join(root, 'step3.json');
  const msg = path.join(root, 'msg.txt');
  const empty = { session: 'sess-self', repo, branch: 'main', mine: [], mineNew: [], contested: [], sha: {} };
  fs.writeFileSync(pj, JSON.stringify(empty));
  fs.writeFileSync(step3, JSON.stringify(empty));
  fs.writeFileSync(msg, 'm\n');
  const r = run('commit-mine.mjs', ['--session', 'sess-self', '--message-file', msg, '--paths-json', pj, '--expect', step3], {});
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /nothing of this session's to commit/);
});
