// The verdict logic of probes Q0, Q5, Q8 and Q14, on planted observations:
// each def exports the decision its run() calls, so every branch runs here
// without claude. A PARTIAL whose open arms are only unsettled or blocked
// must say unsettledOnly, which run.mjs's measured() honors for these ids; a
// deviation must never say it. Q8's launcher-version check, Q0's real-tree
// tripwire and real-run gate, and Q14's reader hook run here too. Every id
// and path is built at run time, so this file stays clean for the leak test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import * as q00 from '../probes/defs/q00-parent-settings.mjs';
import * as q05 from '../probes/defs/q05-background-tasks.mjs';
import * as q08 from '../probes/defs/q08-session-kind-env.mjs';
import * as q14 from '../probes/defs/q14-prompt-origin.mjs';
import { TRUSTED_NAME } from '../probes/lib.mjs';
import { measured } from '../probes/run.mjs';

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-verdicts-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));
const fresh = (name) => fs.mkdtempSync(path.join(dir, `${name}-`));

// A PARTIAL that opted out counts as unmeasured for its id; anything else
// that measured something still counts.
const unmeasured = (id, d) => !measured({ id, ...d });

describe('the defs load as the runner loads them', () => {
  test('each keeps its id, its run() and its exported decision', () => {
    for (const [m, id] of [[q00, 'Q0'], [q05, 'Q5'], [q08, 'Q8'], [q14, 'Q14']]) {
      assert.equal(m.default.id, id);
      assert.equal(typeof m.default.run, 'function', id);
      assert.equal(typeof m.decide, 'function', id);
    }
    for (const f of ['hooksOff', 'snapshot', 'changed', 'replica', 'realSkip']) assert.equal(typeof q00[f], 'function', f);
    assert.equal(typeof q08.launcherVersion, 'function');
    assert.equal(typeof q08.sessionRecord, 'function');
  });
});

describe("Q8: the launching session's CLI version (H6)", () => {
  const V = '9.8.7';
  const pid = '4242';
  const sid = randomUUID();
  const agent = (v) => `claude-code_${v.replaceAll('.', '-')}_agent`;
  const env = (extra = {}) => ({ CLAUDE_PID: pid, CLAUDE_CODE_SESSION_ID: sid, ...extra });
  const own = (version = V) => ({ pid: Number(pid), sessionId: sid, version });

  test('match: either source alone, or both, naming this run\'s version', () => {
    assert.deepEqual(q08.launcherVersion(env({ AI_AGENT: agent(V) }), own(), V), { aiAgent: V, sessionFile: V, recordFound: true, recordOwn: true, ok: true });
    assert.equal(q08.launcherVersion(env({ AI_AGENT: agent(V) }), null, V).ok, true, 'AI_AGENT alone');
    assert.equal(q08.launcherVersion(env(), own(), V).ok, true, 'the sessions record alone');
  });

  test('mismatch: any source naming another version blocks, even when the other agrees', () => {
    assert.equal(q08.launcherVersion(env({ AI_AGENT: agent('9.8.6') }), null, V).ok, false);
    assert.equal(q08.launcherVersion(env(), own('9.8.6'), V).ok, false);
    const split = q08.launcherVersion(env({ AI_AGENT: agent(V) }), own('9.8.6'), V);
    assert.equal(split.ok, false, 'an old session whose AI_AGENT a newer env leaked into');
    assert.deepEqual([split.aiAgent, split.sessionFile], [V, '9.8.6']);
  });

  test('absent: no source naming a version blocks', () => {
    assert.deepEqual(q08.launcherVersion({}, null, V), { aiAgent: null, sessionFile: null, recordFound: false, recordOwn: false, ok: false });
    assert.equal(q08.launcherVersion(env({ AI_AGENT: 'some-other-agent_9-8-7' }), null, V).ok, false, 'an AI_AGENT of another form names nothing');
    const noVersion = q08.launcherVersion(env(), { pid: Number(pid), sessionId: sid }, V);
    assert.deepEqual([noVersion.recordOwn, noVersion.sessionFile, noVersion.ok], [true, null, false]);
  });

  test('stale: a sessions record that is not this session\'s is never read', () => {
    const cases = [
      ['another session id', { ...own(), sessionId: randomUUID() }, env()],
      ['another pid', { ...own(), pid: Number(pid) + 1 }, env()],
      ['a pid stored as text', { ...own(), pid }, env()],
      ['no CLAUDE_PID in the env', own(), { CLAUDE_CODE_SESSION_ID: sid }],
      ['no session id in the env', own(), { CLAUDE_PID: pid }],
      ['no session id in the record', { pid: Number(pid), version: V }, env()],
    ];
    for (const [label, record, e] of cases) {
      const lv = q08.launcherVersion(e, record, V);
      assert.deepEqual([lv.recordFound, lv.recordOwn, lv.sessionFile, lv.ok], [true, false, null, false], label);
      // A stale record naming another version neither counts nor blocks.
      const withAgent = q08.launcherVersion({ ...e, AI_AGENT: agent(V) }, { ...record, version: '9.8.1' }, V);
      assert.equal(withAgent.ok, true, `${label}, with AI_AGENT on this version`);
    }
  });

  test('only version strings and booleans come back, never the session id', () => {
    const lv = q08.launcherVersion(env({ AI_AGENT: agent(V) }), own(), V);
    for (const [k, v] of Object.entries(lv)) assert.ok(v === null || typeof v === 'boolean' || /^\d+\.\d+\.\d+$/.test(v), `${k}: ${v}`);
    assert.ok(!JSON.stringify(lv).includes(sid));
  });

  test('sessionRecord keeps pid, sessionId and version, and nothing else of the file', () => {
    const sessions = fresh('sessions');
    fs.writeFileSync(path.join(sessions, `${pid}.json`), JSON.stringify({ ...own(), cwd: path.join(sessions, 'ws'), name: 'a named session', kind: 'interactive' }));
    assert.deepEqual(q08.sessionRecord(pid, sessions), own());
    fs.writeFileSync(path.join(sessions, '7.json'), '{"pid": 7, "sessi');
    fs.writeFileSync(path.join(sessions, '8.json'), 'null');
    for (const p of ['7', '8', '9', undefined, '', `..${path.sep}${pid}`, '42x']) assert.equal(q08.sessionRecord(p, sessions), null, String(p));
  });
});

describe('Q8: the verdict', () => {
  const V = '9.8.7';
  const sid = randomUUID();
  const row = (label, { entry = 'sdk-cli', attended = '0', agent = false, claudecode = '1' } = {}) => ({
    label, agent, agentType: agent ? 'general-purpose' : null, entry, attended, kind: null, child: '1', claudecode,
    sidPresent: true, sidMatchesInput: !agent, bridge: false, jobDir: false, remote: null, bgBackend: null, bgSource: null,
    bash: label === 'post' ? { entry, attended, kind: null, child: '1', sidMatchesHook: true, aiAgent: 'set' } : null,
    sidSameAsMain: !agent,
  });
  const red = (rows) => ({ rows, envKeys: [], inputKeys: [] });
  const headless = () => red([row('ss'), row('ups'), row('pre'), row('post'), row('stop'), row('end')]);
  const arms = () => ({
    'p-json': headless(),
    'p-stream': headless(),
    workflow: red([row('ss'), row('pre'), row('sub-start', { agent: true }), row('pre', { agent: true }), row('post', { agent: true }), row('sub-stop', { agent: true }), row('stop')]),
  });
  const bgRan = () => ({ state: 'ran', said: 'backgrounded', red: red([row('ss', { entry: 'cli' }), row('post', { entry: 'cli' }), row('stop', { entry: 'cli' })]), sessionState: 'done', listed: true });
  const bgBlocked = { state: 'blocked', said: 'Workspace not trusted', code: 1 };
  const launcher = { entry: 'cli', attended: '1', kind: null, child: null };
  const lv = (version = V) => q08.launcherVersion({ AI_AGENT: `claude-code_${version.replaceAll('.', '-')}_agent`, CLAUDE_PID: '1', CLAUDE_CODE_SESSION_ID: sid }, null, V);
  const obs = (over = {}) => ({ version: V, launcher, launcherVersion: lv(), arms: arms(), bg: bgRan(), ...over });

  test('every kind measured, the launcher on this version: VERIFIED, which counts', () => {
    const d = q08.decide(obs());
    assert.equal(d.verdict, 'VERIFIED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
    assert.match(d.summary, new RegExp(`attended interactive session on CLI ${V.replaceAll('.', '\\.')}`));
    assert.equal(unmeasured('Q8', d), false);
  });

  test('a launcher on another version blocks the interactive arm: PARTIAL, unsettled only', () => {
    const d = q08.decide(obs({ launcherVersion: lv('9.8.6') }));
    assert.equal(d.verdict, 'PARTIAL', d.summary);
    assert.equal(d.unsettledOnly, true);
    assert.match(d.summary, /the interactive arm is BLOCKED: .*AI_AGENT names 9\.8\.6/);
    assert.match(d.summary, /Not measured in this run: the interactive arm\./);
    assert.equal(unmeasured('Q8', d), true);
  });

  test('a launcher whose version nothing names blocks it too', () => {
    const d = q08.decide(obs({ launcherVersion: q08.launcherVersion({}, null, V) }));
    assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', true]);
    assert.match(d.summary, /AI_AGENT names no version, its sessions record was not found/);
  });

  test('a run launched outside an interactive session, or a refused --bg: PARTIAL, unsettled only', () => {
    for (const over of [{ launcher: { entry: 'sdk-cli', attended: '0', kind: null, child: null } }, { bg: bgBlocked }]) {
      const d = q08.decide(obs(over));
      assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', true], d.summary);
      assert.equal(unmeasured('Q8', d), true);
    }
  });

  // One refusal reads the same whatever caused it, so the summary names the
  // trusted folder and each cause, and claims none of them.
  test('a refused --bg names the trusted folder and every cause it could be, and guesses none', () => {
    const d = q08.decide(obs({ bg: bgBlocked }));
    assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', true], d.summary);
    assert.ok(d.summary.includes(`a fresh folder inside the trusted probe folder ${TRUSTED_NAME} as trusted`), d.summary);
    for (const cause of [/its one-time trust entry in ~\/\.claude\.json is gone/, /this CLI no longer takes trust from a parent folder/, /this run's temp dir is spelled differently from that entry/]) assert.match(d.summary, cause);
    assert.match(d.summary, /find out which before approving the trust write again\)/);
    assert.doesNotMatch(d.summary, /no probe folder is trusted|can't accept the workspace trust dialog/);
  });

  test('a deviation is CONTRADICTED and never opts out, whatever stays open', () => {
    const a = arms();
    a['p-json'] = red([row('ss', { entry: 'cli', attended: '1' }), row('stop', { entry: 'cli', attended: '1' })]);
    const d = q08.decide(obs({ arms: a, bg: bgBlocked, launcherVersion: lv('9.8.6') }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
    assert.equal(unmeasured('Q8', d), false);
    const bg = bgRan();
    bg.red.rows[0].attended = '1';
    assert.equal(q08.decide(obs({ bg })).verdict, 'CONTRADICTED', 'a --bg hook reading attended 1');
  });

  test('a failed control or an unread --bg: INCONCLUSIVE', () => {
    const a = arms();
    a['p-stream'].rows[0].claudecode = null;
    assert.equal(q08.decide(obs({ arms: a })).verdict, 'INCONCLUSIVE');
    assert.equal(q08.decide(obs({ bg: { state: 'no-id', said: 'nothing', code: 0 } })).verdict, 'INCONCLUSIVE');
    const noAgent = arms();
    noAgent.workflow.rows = noAgent.workflow.rows.filter((r) => !r.agent);
    assert.equal(q08.decide(obs({ arms: noAgent })).verdict, 'INCONCLUSIVE');
  });

  // Run 2.1.306's workflow agent ran a cat before node q8env.js: a post row
  // whose output carried no Q8ENV line.
  const blind = (opts) => ({ ...row('post', opts), bash: null });
  const postOf = (red) => red.rows.find((r) => r.label === 'post');

  test('a Bash call that read nothing, beside one that did, neither helps nor hurts the bridge (H1)', () => {
    const a = arms();
    a['p-json'].rows.push(blind());
    a.workflow.rows.splice(3, 0, blind({ agent: true }));
    const d = q08.decide(obs({ arms: a }));
    assert.equal(d.verdict, 'VERIFIED', d.summary);
    assert.equal(unmeasured('Q8', d), false);
  });

  test('an arm, or the workflow agent, with no reading stays open: PARTIAL, unsettled only (R2)', () => {
    const cases = [
      ['p-stream ran something else', (a) => { a['p-stream'].rows = a['p-stream'].rows.map((r) => (r.label === 'post' ? { ...r, bash: null } : r)); }, /but no Bash env reading came back from p-stream, so it can't stand/],
      ['the agent read nothing while its main thread did', (a) => { a.workflow.rows = a.workflow.rows.map((r) => (r.label === 'post' ? { ...r, bash: null } : r)); a.workflow.rows.splice(1, 0, row('post')); }, /no Bash env reading came back from the workflow agent,/],
      ['a Q8ENV line carrying another session id', (a) => { const p = postOf(a['p-json']); p.bash = { ...p.bash, sidMatchesHook: false }; }, /no Bash env reading came back from p-json,/],
    ];
    for (const [label, plant, said] of cases) {
      const a = arms();
      plant(a);
      const d = q08.decide(obs({ arms: a }));
      assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', true], `${label}: ${d.summary}`);
      assert.match(d.summary, said, label);
      assert.doesNotMatch(d.summary, /Measured mismatch|disagreed/, label);
      assert.equal(unmeasured('Q8', d), true, label);
    }
  });

  test('a reading that disagrees with its own hook env: a measured PARTIAL, never CONTRADICTED, never unsettled only (R2)', () => {
    const a = arms();
    const p = postOf(a['p-json']);
    p.bash = { ...p.bash, entry: 'cli', attended: '1' };
    const other = { entry: 'sdk-cli', attended: '0', kind: null, child: null };
    for (const [label, over] of [['every other arm measured', {}], ['--bg refused', { bg: bgBlocked }], ['launched outside a session', { launcher: other }], ['on another version', { launcherVersion: lv('9.8.6') }]]) {
      const d = q08.decide(obs({ arms: a, ...over }));
      assert.equal(d.verdict, 'PARTIAL', `${label}: ${d.summary}`);
      assert.equal(d.unsettledOnly, undefined, label);
      assert.equal(unmeasured('Q8', d), false, label);
      assert.match(d.summary, /Measured mismatch \(counts as measured\): p-json: Bash env entrypoint cli, attended 1, kind unset, child 1, its hook env entrypoint sdk-cli, attended 0, kind unset, child 1\. Not measured in this run: the interactive arm/, label);
    }
    // Beside an unread arm, and inside the workflow agent, it still counts.
    const both = arms();
    const ap = both.workflow.rows.find((r) => r.agent && r.label === 'post');
    ap.bash = { ...ap.bash, attended: '1' };
    both['p-stream'].rows = both['p-stream'].rows.filter((r) => r.label !== 'post');
    const d = q08.decide(obs({ arms: both }));
    assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', undefined], d.summary);
    assert.match(d.summary, /but the Bash env disagreed with its hook env in workflow, and no Bash env reading came back from p-stream/);
    assert.match(d.summary, /Measured mismatch \(counts as measured\): workflow agent: Bash env entrypoint sdk-cli, attended 1/);
  });

  test('a workflow arm whose hooks all fired inside its agent: INCONCLUSIVE, not compared to nothing (R3)', () => {
    const a = arms();
    a.workflow.rows = a.workflow.rows.filter((r) => r.agent);
    const d = q08.decide(obs({ arms: a }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /no main-thread hook fired in the workflow arm/);
  });

  test('the claim about agents stops at the -p session that measured it; interactive agents stay an open arm (A5)', () => {
    assert.match(q08.default.assumption, /; in a -p session, workflow-agent hooks read the same values as its main thread\.$/);
    assert.doesNotMatch(q08.default.assumption, /inherit/);
    const verified = q08.decide(obs());
    assert.equal(verified.verdict, 'VERIFIED', 'the open arm sits outside the claim, so it never holds VERIFIED back');
    for (const d of [verified, q08.decide(obs({ bg: bgBlocked }))]) {
      assert.match(d.summary, /in a -p session, workflow-agent hooks read sdk-cli \/ 0 \(its main thread sdk-cli \/ 0\)/);
      assert.match(d.summary, /Open arm, never claimed: whether an interactive session's workflow agents carry its cli \/ 1/);
    }
    // The comparison itself is unchanged: an agent reading other than its
    // main thread is still CONTRADICTED.
    const a = arms();
    for (const r of a.workflow.rows.filter((x) => x.agent)) r.attended = '1';
    assert.equal(q08.decide(obs({ arms: a })).verdict, 'CONTRADICTED');
  });
});

describe('Q0: the hooks-off calibration and the verdict (A10)', () => {
  const on = ['child-local', 'child-shared'];

  const quiet = (listed = on) => ({ failed: null, fired: [], listed });

  test('hooksOff: a clean, quiet, calibrated run listing what fired with hooks on lets the real run go and stand', () => {
    assert.deepEqual(q00.hooksOff(quiet(['child-shared', 'child-local']), on, true), { runReal: true, why: null });
  });

  test('hooksOff: a failed run, or a hook that fired anyway, skips the real run', () => {
    const failed = q00.hooksOff({ failed: 'timed out', fired: [], listed: [] }, on, true);
    assert.equal(failed.runReal, false);
    assert.match(failed.why, /timed out.*skipped/);
    const fired = q00.hooksOff({ failed: null, fired: ['child-local'], listed: on }, on, true);
    assert.equal(fired.runReal, false);
    assert.match(fired.why, /still fired \["child-local"\].*skipped/);
  });

  // A real-tree session whose reading can't be used is never started: one
  // fewer session in the live tree.
  test('hooksOff: a watcher line that lists other files with hooks off skips the real run too', () => {
    for (const listed of [['child-local'], [...on, 'parent-local'], []]) {
      const r = q00.hooksOff(quiet(listed), on, true);
      assert.equal(r.runReal, false, JSON.stringify(listed));
      assert.match(r.why, /would say nothing about what loads, and the real run was skipped/);
    }
  });

  test('hooksOff: no load kind skips the real run, and a failed or firing run is still the reason given first', () => {
    const uncal = q00.hooksOff(quiet(), on, false);
    assert.deepEqual([uncal.runReal, /no debug-line shape.*was skipped/.test(uncal.why)], [false, true], uncal.why);
    assert.match(q00.hooksOff({ failed: 'exited 1 with no result', fired: [], listed: [] }, on, false).why, /exited 1 with no result/);
    assert.match(q00.hooksOff({ failed: null, fired: ['child-shared'], listed: [] }, on, false).why, /still fired/);
  });

  const healthy = (over = {}) => ({
    gitOk: true,
    firedB: on,
    firedP: ['parent-local', 'parent-shared'],
    hooksOff: { runReal: true, why: null },
    real: { exit: 0, ok: true, control: true, parentSeen: [], canonNamesRoot: true, touched: [] },
    ...over,
  });

  test('replica and real tree agree, with every hook off: VERIFIED', () => {
    const d = q00.decide(healthy());
    assert.equal(d.verdict, 'VERIFIED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
    assert.match(d.summary, /with every hook off/);
  });

  test('a real tree left unread is PARTIAL, unsettled only, whichever piece is missing', () => {
    const skipped = q00.hooksOff({ failed: null, fired: ['child-shared'], listed: on }, on, true);
    const unread = q00.hooksOff(quiet(['child-local']), on, true);
    const uncal = q00.hooksOff(quiet(), on, false);
    for (const [label, over, why] of [
      ['hooks fired with the flag', { hooksOff: skipped, real: null }, /skipped/],
      ['the flag changed the watcher line', { hooksOff: unread, real: null }, /would say nothing about what loads/],
      ['no load kind', { hooksOff: uncal, real: null }, /no debug-line shape/],
      ['the real run failed', { real: { ...healthy().real, ok: false, exit: 1 } }, /did not finish cleanly \(exit 1\)/],
      ['the real control unseen', { real: { ...healthy().real, control: false } }, /absent from the calibrated line/],
    ]) {
      const d = q00.decide(healthy(over));
      assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', true], label);
      assert.match(d.summary, /the real tree is unconfirmed: /, label);
      assert.match(d.summary, why, label);
      assert.equal(unmeasured('Q0', d), true, label);
    }
  });

  test('a skip outranks a missing load kind as the reason given', () => {
    const skipped = q00.hooksOff({ failed: 'exited 1 with no result', fired: [], listed: [] }, on, false);
    assert.match(q00.decide(healthy({ hooksOff: skipped, real: null })).summary, /exited 1 with no result/);
  });

  test('a deviation is CONTRADICTED and never opts out, even with the real tree unread', () => {
    const real = q00.decide(healthy({ real: { ...healthy().real, parentSeen: ['projects-local'] } }));
    assert.equal(real.verdict, 'CONTRADICTED', real.summary);
    assert.equal(real.unsettledOnly, undefined);
    assert.equal(unmeasured('Q0', real), false);
    const skipped = q00.hooksOff({ failed: null, fired: ['child-local'], listed: [] }, on);
    const replica = q00.decide(healthy({ firedB: [...on, 'parent-local'], hooksOff: skipped, real: null }));
    assert.equal(replica.verdict, 'CONTRADICTED', replica.summary);
    assert.equal(q00.decide(healthy({ firedP: ['root-local'] })).verdict, 'CONTRADICTED', 'the git-root local file read in place of the parent one');
  });

  test('a replica control that never fired: INCONCLUSIVE', () => {
    assert.equal(q00.decide(healthy({ gitOk: false })).verdict, 'INCONCLUSIVE');
    assert.equal(q00.decide(healthy({ firedB: ['child-local'] })).verdict, 'INCONCLUSIVE');
    assert.equal(q00.decide(healthy({ firedP: ['parent-local'] })).verdict, 'INCONCLUSIVE');
  });

  // Each replica branch decide() returns on before it reads the real tree.
  const replicaVerdicts = [
    ['not a repo rooted at repo/ (a timed-out git reads so too)', { gitOk: false }, 'INCONCLUSIVE', /^the replica is not a git repo rooted at repo\//],
    ['a back-nine control never fired', { firedB: ['child-local'] }, 'INCONCLUSIVE', /^a back-nine control hook never fired/],
    ['the git-root local file read in place of the parent one', { firedP: ['root-local'] }, 'CONTRADICTED', /read the git-root settings\.local\.json/],
    ['a parent file that loads nowhere', { firedP: ['parent-local'] }, 'INCONCLUSIVE', /^a parent file did not load even in a session at projects\//],
    ['a back-nine session that loaded a parent file', { firedB: [...on, 'parent-shared'] }, 'CONTRADICTED', /a back-nine session loaded parent-shared/],
  ];

  test('replica: each replica branch is its own verdict, decide() returns it unchanged without the real tree, and a replica that holds gives its reading (A1)', () => {
    const held = q00.replica(healthy());
    assert.equal(held.verdict, null);
    assert.match(held.summary, /^replica: a back-nine session loaded only \["child-local","child-shared"\], a projects\/ session loaded \["parent-local","parent-shared"\] \(git-root local file not loaded/);
    assert.ok(q00.decide(healthy()).summary.startsWith(`${held.summary}; on the real tree`), 'a real-tree verdict builds on the replica reading');
    for (const [label, over, verdict, said] of replicaVerdicts) {
      const r = q00.replica(healthy(over));
      assert.equal(r.verdict, verdict, label);
      assert.match(r.summary, said, label);
      assert.deepEqual(q00.decide(healthy({ ...over, real: null })), r, label);
    }
  });

  test('realSkip: the real run goes only when hooksOff() and the replica both clear it, and a skip always names its reason (A1)', () => {
    const go = { runReal: true, why: null };
    const held = q00.replica(healthy());
    assert.equal(q00.realSkip(go, held), null);
    for (const [label, over, verdict] of replicaVerdicts) {
      const skip = q00.realSkip(go, q00.replica(healthy(over)));
      assert.match(skip, new RegExp(`^the replica alone decides the verdict \\(${verdict}: .+\\), so the real tree's reading would go unused$`), label);
    }
    const off = q00.hooksOff({ failed: 'timed out', fired: [], listed: [] }, on, true);
    assert.equal(q00.realSkip(off, held), off.why);
    // Both reasons, the replica's first, as decide() reads it first.
    assert.match(q00.realSkip(off, q00.replica(healthy({ gitOk: false }))), /^the replica alone decides the verdict \(INCONCLUSIVE: the replica is not a git repo.*; the replica run with hooks off timed out/);
    // A refusal that gave no reason still skips, and says so.
    assert.equal(q00.realSkip({ runReal: false, why: null }, held), 'the hooks-off check did not clear it');
    for (const s of [q00.realSkip(go, q00.replica(healthy({ gitOk: false }))), q00.realSkip(off, held), q00.realSkip({ runReal: false }, held)]) assert.doesNotMatch(s, /\bnull\b|\bundefined\b/);
  });

  test("run() starts the real-tree session only when realSkip() clears it, and its skipped line gives realSkip()'s reason, never 'skipped (null)' (A1)", () => {
    const src = q00.default.run.toString();
    assert.match(src, /const rep = replica\(\{ gitOk, firedB: runs\['at-back-nine'\]\.fired, firedP: runs\['at-projects'\]\.fired \}\);\s*const skip = realSkip\(off, rep\);/);
    // The one real-tree launch sits inside that gate's block.
    assert.equal(src.match(/runClaude\(\{ cwd: REAL_CWD\b/g)?.length, 1);
    assert.match(src, /\n( +)if \(!skip\) \{\n(?:\1 {2}.*\n)*?\1 {2}realRes = runClaude\(\{ cwd: REAL_CWD\b/);
    assert.match(src, /skipped \(\$\{skip\}\)/);
    assert.doesNotMatch(src, /off\.runReal|\$\{off\.why\}/);
  });

  // The tripwire on a planted tree: two settings files and a .claude folder.
  test('snapshot and changed: a rewrite, a creation, a deletion and a folder listing change are each named; identical bytes are not', () => {
    const root = fresh('real-tree');
    const dot = path.join(root, '.claude');
    fs.mkdirSync(dot);
    const files = { local: path.join(dot, 'settings.local.json'), shared: path.join(dot, 'settings.json'), parent: path.join(root, 'parent.json') };
    fs.writeFileSync(files.local, '{"permissions":{"allow":["a"]}}');
    fs.writeFileSync(files.parent, '{}');
    fs.writeFileSync(path.join(dot, 'keep.md'), 'x');
    fs.writeFileSync(path.join(dot, 'gone.md'), 'x');
    const before = q00.snapshot(files, dot);
    assert.deepEqual(before.names, ['gone.md', 'keep.md', 'settings.local.json']);
    assert.deepEqual([before.files.local.exists, before.files.local.size, /^[0-9a-f]{64}$/.test(before.files.local.sha256)], [true, 31, true]);
    assert.deepEqual(before.files.shared, { exists: false, size: null, sha256: null });
    assert.deepEqual(q00.changed(before, q00.snapshot(files, dot)), [], 'nothing moved');
    fs.writeFileSync(files.parent, '{}');
    assert.deepEqual(q00.changed(before, q00.snapshot(files, dot)), [], 'the same bytes written again');

    fs.writeFileSync(files.local, '{"permissions":{"allow":["b"]}}');
    fs.writeFileSync(files.shared, '{}');
    fs.rmSync(files.parent);
    fs.rmSync(path.join(dot, 'gone.md'));
    fs.writeFileSync(path.join(dot, 'new.md'), 'x');
    assert.deepEqual(q00.changed(before, q00.snapshot(files, dot)), [
      'local rewritten', 'shared created', 'parent deleted',
      'the-back-nine/.claude/new.md added', 'the-back-nine/.claude/settings.json added', 'the-back-nine/.claude/gone.md removed',
    ], 'a same-size rewrite is caught by its hash');
    assert.deepEqual(q00.snapshot(files, path.join(root, 'no-such-folder')).names, []);
  });

  test('a real tree that changed across the real run: INCONCLUSIVE ahead of any VERIFIED or CONTRADICTED, left as found (R27)', () => {
    const touched = ['back-nine-local (control) rewritten'];
    for (const [label, over] of [
      ['would VERIFY', {}],
      ['the real tree would CONTRADICT', { real: { ...healthy().real, parentSeen: ['projects-local'] } }],
      ['the replica would CONTRADICT', { firedB: [...on, 'parent-shared'] }],
    ]) {
      const h = healthy(over);
      const d = q00.decide({ ...h, real: { ...h.real, touched } });
      assert.equal(d.verdict, 'INCONCLUSIVE', `${label}: ${d.summary}`);
      assert.match(d.summary, /^the real run changed back-nine-local \(control\) rewritten: /, label);
      assert.match(d.summary, /It was left as found: restoring it would be a second write to the live tree/, label);
      assert.equal(unmeasured('Q0', d), true, label);
    }
    assert.equal(q00.decide(healthy()).verdict, 'VERIFIED', 'an empty touched list is no change');
    assert.equal(q00.decide(healthy({ real: null, hooksOff: q00.hooksOff(quiet(), on, false) })).verdict, 'PARTIAL', 'a skipped real run touched nothing');
  });
});

describe('Q5: the verdict', () => {
  const stop = (tasks) => ({ present: true, tasks, crons: [] });
  const task = (id, type, extra) => ({ id, type, status: 'running', description: 'd', ...extra });
  const rows = (over = {}) => ({
    idle: { kind: null, stops: [stop([])], taskId: null, inFlight: false, endedAfterStopMs: null },
    shell: { kind: 'shell', stops: [stop([task('b1', 'shell', { command: 'node wait.js' })])], taskId: 'b1', inFlight: true, endedAfterStopMs: 40_000 },
    workflow: { kind: 'workflow', stops: [stop([task('w1', 'workflow', { name: 'probe-q5-background' })])], taskId: 'w1', inFlight: true, endedAfterStopMs: null },
    ...over,
  });
  const foreground = { kind: 'shell', stops: [stop([])], taskId: null, inFlight: false, endedAfterStopMs: null };

  test('idle empty, each launch listed with its type while in flight: VERIFIED', () => {
    const d = q05.decide(rows());
    assert.equal(d.verdict, 'VERIFIED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
    assert.match(d.summary, /shell: listed \(running, command "node wait\.js", the launch's task id true\)/);
  });

  test('one launch that never went to the background, or ended first: PARTIAL, unsettled only', () => {
    const ended = { ...rows().shell, inFlight: false, endedAfterStopMs: -500 };
    for (const [label, shell, why] of [['foreground', foreground, /never went to the background/], ['ended first', ended, /ended 500 ms before the first Stop/]]) {
      const d = q05.decide(rows({ shell }));
      assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', true], label);
      assert.match(d.summary, why, label);
      assert.equal(unmeasured('Q5', d), true, label);
    }
  });

  test('both launches unsettled: INCONCLUSIVE', () => {
    const d = q05.decide(rows({ shell: foreground, workflow: { ...rows().workflow, taskId: null } }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
  });

  test('a wrong reading is CONTRADICTED and never opts out, even beside an unsettled arm', () => {
    const unlisted = { ...rows().shell, stops: [stop([])] };
    const d = q05.decide(rows({ shell: unlisted, workflow: { ...rows().workflow, taskId: null } }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
    assert.equal(unmeasured('Q5', d), false);
    const mistyped = { ...rows().shell, stops: [stop([task('b1', 'workflow', {})])] };
    assert.equal(q05.decide(rows({ shell: mistyped })).verdict, 'CONTRADICTED');
    const idleMissing = { ...rows().idle, stops: [{ present: false, tasks: null, crons: null }] };
    assert.equal(q05.decide(rows({ idle: idleMissing, shell: foreground })).verdict, 'CONTRADICTED');
  });

  test('an idle run with no Stop: INCONCLUSIVE', () => {
    assert.equal(q05.decide(rows({ idle: { ...rows().idle, stops: [] } })).verdict, 'INCONCLUSIVE');
  });
});

describe('Q14: the verdict and the reader hook', () => {
  const view = (kind, found, originKind = null) => ({
    kind,
    head: kind === 'p' ? 'Reply with the single' : '<task-notification>',
    atHookTime: found ? { found: true, origin: null, promptSource: null, keys: ['type'] } : { found: false, readError: false },
    afterRun: { origin: originKind ? { kind: originKind } : null, promptSource: null },
  });
  const keys = ['hook_event_name', 'prompt', 'session_id'];
  const armRow = (notes, missing = []) => ({
    due: { p: 1, notification: notes },
    fired: { p: 1, notification: notes },
    missing,
    firings: [{ kind: 'p', keys }, ...Array.from({ length: notes }, () => ({ kind: 'notification', keys }))],
    views: [view('p', true), ...Array.from({ length: notes }, () => view('notification', false, 'task-notification'))],
  });
  const census = { files: 2, records: 3, tally: { [['human', '', '', 'src=typed', 'entry=cli'].join('|')]: 2, [['task-notification', '', 'session-task', 'src=system', 'entry=cli'].join('|')]: 1 }, originKeys: ['kind'], humanOrNoOriginKeys: {} };
  const observed = (over = {}) => ({ census, rows: { 'typed-equivalent': armRow(0), 'shell-notification': armRow(1), 'agent-notification': armRow(1), ...over } });

  test('every arm fired as due: PARTIAL with the human origins BLOCKED, unsettled only', () => {
    const d = q14.decide(observed());
    assert.deepEqual([d.verdict, d.unsettledOnly], ['PARTIAL', true], d.summary);
    assert.match(d.summary, /typed and Remote Control prompts: BLOCKED/);
    assert.match(d.summary, /transcript origin\.kind \["task-notification","task-notification"\]/);
    assert.match(d.summary, /already readable in all 3 -p firings and missing in 2 of 2 notification firings \(the write lags the hook\)/);
    assert.match(d.summary, /census kinds: \["human","task-notification"\]/);
    assert.equal(unmeasured('Q14', d), true);
  });

  test('an arm short of a firing it was due: INCONCLUSIVE', () => {
    const d = q14.decide(observed({ 'agent-notification': armRow(1, ['notification 0 of 1 in the capture hook']) }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.equal(d.unsettledOnly, undefined);
    assert.match(d.summary, /agent-notification \(notification 0 of 1 in the capture hook\)/);
  });

  // The hook as the probe runs it: node <file>, the hook input on stdin.
  const reader = () => {
    const f = path.join(fresh('reader'), 'ups-view.cjs');
    fs.writeFileSync(f, q14.READER);
    return f;
  };
  const runReader = (file, input, extraEnv) => {
    const env = { ...process.env, ...extraEnv };
    if (!extraEnv) delete env.PROBE_OUT;
    return spawnSync(process.execPath, [file], { cwd: path.dirname(file), input: JSON.stringify(input), env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });
  };

  // Unguarded, the hook appended to the relative path 'undefined/captures.jsonl':
  // a folder of that name in its cwd would have taken the line.
  test('the reader hook writes nothing without PROBE_OUT, and never fails the session', () => {
    const file = reader();
    const trap = path.join(path.dirname(file), 'undefined');
    fs.mkdirSync(trap);
    const r = runReader(file, { prompt_id: 'p-1', transcript_path: path.join(dir, 'none.jsonl'), prompt: 'hi' });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(fs.readdirSync(trap), []);
    const stray = runReader(file, 'not even an object');
    assert.equal(stray.status, 0, stray.stderr);
    assert.deepEqual(fs.readdirSync(trap), []);
  });

  test('with PROBE_OUT it appends one line to <PROBE_OUT>/captures.jsonl, with the record when it is on disk', () => {
    const file = reader();
    const out = fresh('out');
    const transcript = path.join(out, 'transcript.jsonl');
    fs.writeFileSync(transcript, `${JSON.stringify({ type: 'user', promptId: 'p-1', origin: { kind: 'human' } })}\n`);
    for (const [id, tp] of [['p-1', transcript], ['p-2', transcript], ['p-3', path.join(out, 'gone.jsonl')]]) {
      const r = runReader(file, { prompt_id: id, transcript_path: tp, prompt: '<task-notification> x' }, { PROBE_OUT: out });
      assert.equal(r.status, 0, r.stderr);
    }
    const lines = fs.readFileSync(path.join(out, 'captures.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual(lines.map((l) => [l.label, l.input.prompt_id, l.record.found, l.record.readError ?? null]), [['ups-view', 'p-1', true, null], ['ups-view', 'p-2', false, false], ['ups-view', 'p-3', false, true]]);
    assert.deepEqual(lines[0].record.origin, { kind: 'human' });
    assert.equal(lines[0].input.promptHead, '<task-notification> x');
  });
});
