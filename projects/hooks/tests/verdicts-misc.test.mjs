// The verdict logic of Q2, Q6, Q7, Q9, Q10, Q11 and Q12 without claude: each
// def exports the pure decide() its run() returns through (and Q9 its
// junction sub-verdict, ConfigChange filter and junction cmd argv, which a
// Windows run also uses to make a junction, Q12 its per-agent facts), so
// planted observations reach every branch a live run on a healthy CLI never
// takes (a run lib's timeout killed, a model that re-invoked a skill, an arm
// BLOCKED, an agent that fell back to another model). The PARTIALs whose open
// arms only couldn't see say unsettledOnly, which the runner honors for the
// ids in UNSETTLED_OK; Q2's PARTIAL is a measured deviation and never says it.
// Ids are built at run time (randomUUID), records carry bare keys and paths no
// profile, so this file stays clean for the leak test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { failure } from '../probes/lib.mjs';
import { UNSETTLED_OK, measured } from '../probes/run.mjs';
import * as q02 from '../probes/defs/q02-pretooluse-decision.mjs';
import * as q06 from '../probes/defs/q06-once.mjs';
import * as q07 from '../probes/defs/q07-session-end.mjs';
import * as q09 from '../probes/defs/q09-hot-reload.mjs';
import * as q10 from '../probes/defs/q10-bash-edit-diff.mjs';
import * as q11 from '../probes/defs/q11-session-ids.mjs';
import * as q12 from '../probes/defs/q12-agent-null-or-throw.mjs';

const DEFS = { Q2: q02, Q6: q06, Q7: q07, Q9: q09, Q10: q10, Q11: q11, Q12: q12 };

// A result as writePasses files it: the def's fields under the runner's id.
const filedAs = (id, d) => ({ id, ...d });

// An unsettled-only PARTIAL: flagged by the def, pinned by the runner, so it
// measured nothing and a VERIFIED after it on one hash is no conflict.
function assertUnsettledOnly(id, d) {
  assert.equal(d.verdict, 'PARTIAL', d.summary);
  assert.equal(d.unsettledOnly, true, `${id}'s PARTIAL lost its unsettledOnly flag`);
  assert.ok(UNSETTLED_OK.includes(id), `${id} is not pinned in UNSETTLED_OK, so its flag is ignored`);
  assert.equal(measured(filedAs(id, d)), false);
}

const cap = (label, input = {}) => ({ label, input });

test('every def here returns through its exported decide()', () => {
  for (const [id, m] of Object.entries(DEFS)) {
    assert.equal(m.default.id, id);
    assert.equal(typeof m.decide, 'function', `${id} exports no decide()`);
    assert.match(m.default.run.toString(), /\bdecide\(/, `${id}'s run() never calls decide(), so these tests prove nothing about it`);
  }
  assert.match(q09.default.run.toString(), /\bjunctionVerdict\(k\)/, "Q9's run() never calls junctionVerdict()");
  assert.match(q12.default.run.toString(), /\bagentFacts\(/, "Q12's run() never calls agentFacts()");
});

describe('Q2: the mixed arms lower it to a PARTIAL that stays measured', () => {
  const row = (arm, expect, over = {}) => ({
    arm, expect, tried: true, ran: false, failed: null, resultSent: true, denied: true, contentSent: false,
    reasonIn: { result: true, blob: false, reply: true }, reasonSeen: true, ...over,
  });
  const rows = (over = {}) => [
    row('control', 'ran', { ran: true, denied: false, contentSent: true, reasonIn: null, reasonSeen: null }),
    row('deny', 'blocked'),
    row('deprecated-block', 'blocked'),
    row('exit-2', 'blocked'),
    row('hso-allow-vs-old-block', 'deny-wins'),
    row('hso-deny-vs-old-approve', 'deny-wins'),
  ].map((r) => ({ ...r, ...over[r.arm] }));

  test('every single-form arm blocked with its reason delivered: VERIFIED', () => {
    const d = q02.decide(rows());
    assert.equal(d.verdict, 'VERIFIED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
  });

  test("a mixed arm whose read ran is PARTIAL with no unsettledOnly, so a later VERIFIED on its hash is a conflict", () => {
    const d = q02.decide(rows({ 'hso-allow-vs-old-block': { ran: true, denied: false } }));
    assert.equal(d.verdict, 'PARTIAL', d.summary);
    assert.match(d.summary, /the allow won in hso-allow-vs-old-block/);
    assert.equal('unsettledOnly' in d, false);
    assert.equal(measured(filedAs('Q2', d)), true);
    assert.equal(measured(filedAs('Q2', { ...d, unsettledOnly: true })), true, 'Q2 must never be pinned in UNSETTLED_OK');
  });

  test("a decided arm whose run lib's timeout killed is INCONCLUSIVE, read through lib's failure()", () => {
    const failed = failure({ timedOut: true });
    const d = q02.decide(rows({ deny: { failed, reasonSeen: false, resultSent: false } }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /deny: the run timed out before the reason's delivery could be read/);
  });
});

describe("Q6: a skill arm's once count is void when the model invoked the skill again or its hook never ran", () => {
  const rows = (over = {}) => {
    const base = {
      'exit0-block': { where: 'skill', once: 1, every: 3, ran: 0, skillCalls: 0, turns: 4, exit: 0 },
      exit2: { where: 'skill', once: 3, every: 3, ran: 0, skillCalls: 0, turns: 4, exit: 0 },
      pass: { where: 'skill', once: 1, every: 3, ran: 3, skillCalls: 0, turns: 4, exit: 0 },
      settings: { where: 'settings', once: 3, every: 3, ran: 3, skillCalls: 0, turns: 4, exit: 0 },
    };
    return Object.fromEntries(Object.entries(base).map(([k, r]) => [k, { ...r, ...over[k] }]));
  };

  test('the documented counts with no Skill-tool call: VERIFIED', () => {
    assert.equal(q06.decide(rows()).verdict, 'VERIFIED');
  });

  test('a once hook that ran on every read after a JSON block, with no Skill-tool call: CONTRADICTED', () => {
    const d = q06.decide(rows({ 'exit0-block': { once: 3 } }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.match(d.summary, /exit-0 JSON block: ran 3 times/);
  });

  test('the same counts beside a Skill-tool call in that arm: INCONCLUSIVE, naming the arm and its turns', () => {
    const d = q06.decide(rows({ 'exit0-block': { once: 3, skillCalls: 2, turns: 6 } }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /Skill tool in exit0-block \(2 call\(s\) that ran, 6 turns\)/);
  });

  test('a re-invocation voids a count that would have read VERIFIED too', () => {
    const d = q06.decide(rows({ pass: { skillCalls: 1 } }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /in pass /);
  });

  test("a Skill call the run lists as denied never ran, so the arm's count stays readable (the 2.1.307 run's shape)", () => {
    const d = q06.decide(rows({ 'exit0-block': { once: 3, skillCalls: 1, skillDenied: 1, turns: 6 }, pass: { skillCalls: 1, skillDenied: 1, turns: 6 } }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.match(d.summary, /exit-0 JSON block: ran 3 times/);
    assert.equal(q06.decide(rows({ pass: { skillCalls: 1, skillDenied: 1 } })).verdict, 'VERIFIED');
  });

  test('only the calls that ran void an arm: one denied beside one that ran is INCONCLUSIVE, counting the one', () => {
    const d = q06.decide(rows({ 'exit0-block': { once: 3, skillCalls: 2, skillDenied: 1, turns: 7 } }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /Skill tool in exit0-block \(1 call\(s\) that ran, 7 turns\)/);
  });

  test("skillUse counts a call denied only when the run's permission_denials names its tool_use_id under Skill", () => {
    const caps = [
      { label: 'skill', input: { tool_name: 'Skill', tool_use_id: 'call-a' } },
      { label: 'skill', input: { tool_name: 'Skill', tool_use_id: 'call-b' } },
      { label: 'every', input: { tool_name: 'Read', tool_use_id: 'call-c' } },
    ];
    const json = { permission_denials: [
      { tool_name: 'Skill', tool_use_id: 'call-a', tool_input: { skill: 'probe-q6-pass' } },
      { tool_name: 'Read', tool_use_id: 'call-b' },
      { tool_name: 'Read', tool_use_id: 'call-c' },
    ] };
    assert.deepEqual(q06.skillUse(caps, json), { skillCalls: 2, skillDenied: 1 });
    assert.deepEqual(q06.skillUse(caps, { permission_denials: [] }), { skillCalls: 2, skillDenied: 0 });
    assert.deepEqual(q06.skillUse(caps, {}), { skillCalls: 2, skillDenied: 0 });
    assert.deepEqual(q06.skillUse(caps, null), { skillCalls: 2, skillDenied: 0 }, 'a failed run has no list: every call counts as one that ran');
    const noId = [{ label: 'skill', input: { tool_name: 'Skill' } }];
    assert.deepEqual(q06.skillUse(noId, { permission_denials: [{ tool_name: 'Skill' }] }), { skillCalls: 1, skillDenied: 0 }, 'a call with no id is never matched');
  });

  test("a skill arm whose once hook never ran never registered it: INCONCLUSIVE, naming every such arm; the settings arm's 0 stays measured", () => {
    for (const k of ['exit0-block', 'exit2', 'pass']) {
      const d = q06.decide(rows({ [k]: { once: 0 } }));
      assert.equal(d.verdict, 'INCONCLUSIVE', `${k}: ${d.summary}`);
      assert.ok(d.summary.startsWith(`the skill's once hook never ran in ${k}, so it was never registered`), d.summary);
    }
    const two = q06.decide(rows({ 'exit0-block': { once: 0 }, exit2: { once: 0 } }));
    assert.ok(two.summary.startsWith("the skill's once hook never ran in exit0-block, exit2,"), two.summary);
    const settings = q06.decide(rows({ settings: { once: 0 } }));
    assert.equal(settings.verdict, 'CONTRADICTED', settings.summary);
    assert.match(settings.summary, /in a settings file: ran 0 of 3$/);
  });
});

describe("Q7: lib's timeout voids the normal arm, never the block arm's signal", () => {
  const ended = () => [cap('ss', { source: 'startup' }), cap('ups'), cap('stop'), cap('se', { reason: 'other' })];
  const rows = (over = {}) => ({
    normal: { caps: ended(), exit: 0, timedOut: false, ms: 4000, ...over.normal },
    block: {
      caps: [...ended(), cap('se-exit2'), cap('se-json')], exit: 0, timedOut: false, ms: 3600, blockHooksFired: true,
      wordIn: { stdout: false, stderr: false }, markerIn: { stdout: false, stderr: true }, ...over.block,
    },
    stdinClose: { caps: ended(), why: 'exited', code: 0, signal: null, results: 1, lagMs: 400, killedByLib: false, selfExit: true, ...over.stdinClose },
    kill: { caps: [cap('ss', { source: 'startup' }), cap('ups')], code: null, signal: null, midTurn: true, ...over.kill },
  });
  const noEnd = [cap('ss', { source: 'startup' }), cap('ups'), cap('stop')];

  test('every arm that settled agrees, the human arms stay open: PARTIAL with unsettledOnly', () => {
    const d = q07.decide(rows());
    assertUnsettledOnly('Q7', d);
    assert.match(d.summary, /normal -p end: SessionEnd reason \["other"\]/);
  });

  test("a normal run lib's timeout killed after Stop is INCONCLUSIVE, not CONTRADICTED", () => {
    const d = q07.decide(rows({ normal: { caps: noEnd, exit: null, timedOut: true, ms: 120_000 } }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /killed by lib's timeout before it could end/);
    assert.equal(d.unsettledOnly, undefined);
  });

  test('a normal run that ended on its own with no SessionEnd is CONTRADICTED, a non-zero exit included', () => {
    for (const exit of [0, 1]) {
      const d = q07.decide(rows({ normal: { caps: noEnd, exit, timedOut: false } }));
      assert.equal(d.verdict, 'CONTRADICTED', `exit ${exit}: ${d.summary}`);
      assert.match(d.summary, /a normal -p run ended \(Stop fired\) with no SessionEnd/);
    }
  });

  test("the block arm's own timeout still reads as the block holding, against a normal arm that ended", () => {
    const d = q07.decide(rows({ block: { timedOut: true, exit: null, ms: 120_000 } }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.match(d.summary, /the blocking SessionEnd hooks kept the session from ending/);
  });

  test('when the normal arm hung too, the block arm has no clean run to be read against: INCONCLUSIVE', () => {
    const d = q07.decide(rows({ normal: { caps: noEnd, exit: null, timedOut: true }, block: { timedOut: true, exit: null } }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /no clean run to be read against/);
  });

  test("another arm's contradiction stands when the normal arm timed out", () => {
    const d = q07.decide(rows({
      normal: { caps: noEnd, exit: null, timedOut: true },
      stdinClose: { caps: [cap('ss', { source: 'startup' }), cap('se', { reason: 'not-a-documented-reason' })] },
    }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.match(d.summary, /undocumented SessionEnd reason/);
  });
});

describe('Q9: VERIFIED subs beside INCONCLUSIVE ones are an unsettled-only PARTIAL', () => {
  const sub = (over = {}) => ({
    junction: ['VERIFIED', 'reloaded'], settingsHooks: ['VERIFIED', 'H2 not H1'], hookScript: ['VERIFIED', 'S2'], configChange: ['VERIFIED', 'fired'], ...over,
  });

  test('all VERIFIED: VERIFIED', () => assert.equal(q09.decide(sub()).verdict, 'VERIFIED'));

  test('one sub that could not see: PARTIAL with unsettledOnly', () => {
    const d = q09.decide(sub({ junction: ['INCONCLUSIVE', 'the model did not invoke both skills again on turn 2'] }));
    assertUnsettledOnly('Q9', d);
    assert.match(d.summary, /^settled: settings hooks block, hook script, ConfigChange; unsettled: /);
  });

  test('any CONTRADICTED sub decides it, with no flag; none settled is INCONCLUSIVE', () => {
    const c = q09.decide(sub({ junction: ['INCONCLUSIVE', 'x'], hookScript: ['CONTRADICTED', 'turn 2 fired S1'] }));
    assert.equal(c.verdict, 'CONTRADICTED');
    assert.equal(c.unsettledOnly, undefined);
    const none = Object.fromEntries(Object.keys(sub()).map((k) => [k, ['INCONCLUSIVE', 'x']]));
    assert.equal(q09.decide(none).verdict, 'INCONCLUSIVE');
  });
});

describe("Q9: the junction is read against the real-folder control, each wait on its own skill's ConfigChange", () => {
  // skillsArm's return as junctionVerdict reads it, shaped as 2.1.306 ran it:
  // both skills invoked on both turns, every token in a request, each
  // ConfigChange about 2 s after its edit.
  const k = ({ reached = {}, waits = {} } = {}) => ({
    ok: true, s: { why: 'done', results: [{}, {}] },
    inv: { real1: 1, junc1: 1, real2: 1, junc2: 1 },
    reached: { realA: true, realB: true, juncA: true, juncB: true, ...reached },
    waits: { real: 2025, junction: 2032, ...waits },
  });
  const others = { settingsHooks: ['VERIFIED', 'H2 not H1'], hookScript: ['VERIFIED', 'S2'], configChange: ['VERIFIED', 'fired'] };

  test('both edits reached the model: VERIFIED', () => {
    assert.deepEqual(q09.junctionVerdict(k()), ['VERIFIED', 'an edit to the junction target reached the model on re-invoke, as did the real-folder control']);
  });

  test('no ConfigChange behind the junction and an edit that never reached the model: CONTRADICTED, with the 45 s bound and the control\'s time in its text', () => {
    const j = q09.junctionVerdict(k({ reached: { juncB: false }, waits: { junction: null } }));
    assert.deepEqual(j, ['CONTRADICTED', 'no ConfigChange behind the junction within 45 s (control 2025 ms), and its edit never reached the model']);
    const d = q09.decide({ junction: j, ...others });
    assert.equal(d.verdict, 'CONTRADICTED');
    assert.match(d.summary, /^junctioned skill CONTRADICTED \(no ConfigChange behind the junction within 45 s \(control 2025 ms\), and its edit never reached the model\)/);
    const noCtl = q09.junctionVerdict(k({ reached: { juncB: false }, waits: { real: null, junction: null } }));
    assert.equal(noCtl[1], 'no ConfigChange behind the junction within 45 s (control none within 45 s), and its edit never reached the model');
  });

  test('a ConfigChange behind the junction that came, beside an edit that never reached the model: CONTRADICTED, saying when it came', () => {
    assert.deepEqual(q09.junctionVerdict(k({ reached: { juncB: false } })), ['CONTRADICTED', 'a ConfigChange behind the junction came 2032 ms after its edit (control 2025 ms), but its edit never reached the model']);
  });

  test('a junction miss beside a control that never reloaded, or a junction that never loaded, reads as before', () => {
    assert.equal(q09.junctionVerdict(k({ reached: { realB: false, juncB: false }, waits: { real: null, junction: null } }))[0], 'INCONCLUSIVE');
    assert.equal(q09.junctionVerdict(k({ reached: { juncA: false } }))[0], 'CONTRADICTED');
    assert.deepEqual(q09.junctionVerdict({ ok: false, why: 'the junction could not be made' }), ['INCONCLUSIVE', 'the junction could not be made']);
  });

  test("each wait counts only its own skill's ConfigChange(skills): by a whole folder name, the junction's link or its target", () => {
    const sep = '\\';
    const skillPath = (dir) => ['D:', 'probe-ws', '.claude', 'skills', dir, 'SKILL.md'].join(sep);
    const cc = (source, file_path) => cap('CC', { hook_event_name: 'ConfigChange', source, file_path });
    const caps = [
      cc('skills', skillPath('q9-real')),
      cc('skills', skillPath('q9-real')),
      cc('skills', skillPath('q9-realx')),
      cc('project_settings', skillPath('q9-junction')),
      cap('ss', { source: 'startup' }),
    ];
    assert.equal(q09.skillCCs(caps, 'real').length, 2);
    assert.equal(q09.skillCCs(caps, 'junction').length, 0, "a second firing for the real skill ended the junction's wait");
    assert.equal(q09.skillCCs([...caps, cc('skills', skillPath('q9-junction'))], 'junction').length, 1);
    assert.equal(q09.skillCCs([...caps, cc('skills', ['D:', 'probe-ws', 'targets', 'junction-target', 'SKILL.md'].join('/'))], 'junction').length, 1);
    assert.throws(() => q09.skillCCs(caps, 'q9-real'), /no skill/);
  });
});

describe("Q9: the junction's cmd runs with /d, so no registry AutoRun runs before mklink", () => {
  test('mklinkArgv puts /d ahead of /c, and the def\'s one cmd spawn takes its argv from it', () => {
    assert.deepEqual(q09.mklinkArgv('L', 'T'), ['/d', '/c', 'mklink', '/J', 'L', 'T']);
    const src = fs.readFileSync(fileURLToPath(new URL('../probes/defs/q09-hot-reload.mjs', import.meta.url)), 'utf8');
    const cmdSpawns = src.match(/\bspawn(?:Sync)?\(\s*['"`]cmd(?:\.exe)?['"`][^\n]*/gi) ?? [];
    assert.equal(cmdSpawns.length, 1, JSON.stringify(cmdSpawns));
    assert.match(cmdSpawns[0], /^spawnSync\('cmd', mklinkArgv\(link, target\), \{[^}]*\bshell: false\b/);
  });

  test('that argv makes a junction cmd reads through', { skip: process.platform !== 'win32' && 'mklink /J is Windows only' }, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'q9-mklink-'));
    try {
      const target = path.join(dir, 'target');
      fs.mkdirSync(target);
      fs.writeFileSync(path.join(target, 'SKILL.md'), 'through');
      const link = path.join(dir, 'link');
      const mk = spawnSync('cmd', q09.mklinkArgv(link, target), { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });
      assert.equal(mk.status, 0, mk.stderr || mk.stdout);
      assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
      assert.equal(fs.readFileSync(path.join(link, 'SKILL.md'), 'utf8'), 'through');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Q10: a BLOCKED PowerShell arm beside a Bash claim that held is an unsettled-only PARTIAL', () => {
  const diff = { present: true, keys: ['changedFiles', 'files'], changedFiles: ['tracked.txt'], files: [{ name: 'tracked.txt', hunks: 1, created: null, deleted: null }], unavailable: null, namesTracked: true, exactPath: true, absolute: true, separators: ['slash'] };
  const arm = (over) => ({ available: true, initTools: ['Bash', 'PowerShell'], posts: 1, changed: true, permissionMode: 'default', responseKeys: ['stderr', 'stdout'], status: 'M tracked.txt', info: { present: false }, ...over });
  const rows = (ps = {}) => ({ 'bash-on': arm({ info: diff, responseKeys: ['bashEditDiff', 'stdout'] }), 'bash-off': arm({}), 'ps-on': arm(ps) });

  test('PowerShell edited and carried no diff: VERIFIED', () => assert.equal(q10.decide(rows()).verdict, 'VERIFIED'));

  test('no PowerShell tool in the session: PARTIAL with unsettledOnly', () => {
    const d = q10.decide(rows({ available: false, initTools: ['Bash'], posts: 0, changed: false }));
    assertUnsettledOnly('Q10', d);
    assert.match(d.summary, /The PowerShell arm is BLOCKED/);
  });

  test('a PowerShell edit that carried the diff: CONTRADICTED, no flag', () => {
    const d = q10.decide(rows({ info: diff }));
    assert.equal(d.verdict, 'CONTRADICTED');
    assert.equal(d.unsettledOnly, undefined);
  });
});

describe('Q11: a headless /clear the CLI did not honor is an unsettled-only PARTIAL', () => {
  // A chain and clear stream shaped as 2.1.306 ran them: start, resume and
  // continue under U, the fork under a new id, the clear stream under V and,
  // once /clear is honored, a new id X. env matches the input on every firing
  // unless envOff gives one hook the fork's id.
  function obs({ honored = false, resumeFailed = null, envOff = false } = {}) {
    const [U, V, F, X] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const names = new Map([[U, 'U'], [V, 'V'], [F, 'new-1'], [X, 'new-2']]);
    const alias = (id) => names.get(id) ?? String(id);
    const c = (label, input) => ({ label, input, env: { CLAUDE_CODE_SESSION_ID: input.session_id } });
    const turn = (source, sid, prompt) => [c('ss', { source, session_id: sid }), c('ups', { session_id: sid, prompt }), c('stop', { session_id: sid }), c('se', { reason: 'other', session_id: sid })];
    const chain = {
      start: { caps: turn('startup', U, 'one'), failed: null, outId: U },
      resume: { caps: turn('resume', U, 'two'), failed: resumeFailed, outId: resumeFailed ? undefined : U },
      continue: { caps: turn('resume', U, 'three'), failed: null, outId: U },
      fork: { caps: turn('fork', F, 'four'), failed: null, outId: F },
    };
    if (envOff) chain.continue.caps[1].env = { CLAUDE_CODE_SESSION_ID: F };
    const cc = honored
      ? [c('ss', { source: 'startup', session_id: V }), c('ups', { session_id: V, prompt: 'alpha' }), c('stop', { session_id: V }), c('se', { reason: 'clear', session_id: V }), c('ss', { source: 'clear', session_id: X }), c('ups', { session_id: X, prompt: 'bravo' }), c('stop', { session_id: X })]
      : [c('ss', { source: 'startup', session_id: V }), c('ups', { session_id: V, prompt: 'alpha' }), c('stop', { session_id: V }), c('ups', { session_id: V, prompt: '/clear' }), c('stop', { session_id: V }), c('ups', { session_id: V, prompt: 'bravo' }), c('stop', { session_id: V })];
    const after = honored ? 'new-2' : 'V';
    const clear = { why: 'done', code: 0, results: [{ sid: 'V' }, { sid: after }, { sid: after }] };
    return { chain, cc, clear, U, V, alias };
  }

  test('/clear honored with a new id throughout: VERIFIED', () => {
    const d = q11.decide(obs({ honored: true }));
    assert.equal(d.verdict, 'VERIFIED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
  });

  test('/clear reached UserPromptSubmit as a prompt and the id stayed V: PARTIAL with unsettledOnly', () => {
    const d = q11.decide(obs());
    assertUnsettledOnly('Q11', d);
    assert.match(d.summary, /headless \/clear was not honored .*: BLOCKED, needs a typed \/clear/);
  });

  test("a chain arm whose run lib's timeout killed is INCONCLUSIVE, not a reading", () => {
    const d = q11.decide(obs({ resumeFailed: failure({ timedOut: true }) }));
    assert.equal(d.verdict, 'INCONCLUSIVE', d.summary);
    assert.match(d.summary, /resume: the run timed out, so its output session_id can't be read/);
  });

  test('an env id that differs from the input decides CONTRADICTED, whatever /clear did', () => {
    const d = q11.decide(obs({ envOff: true }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.match(d.summary, /differed from the input session_id on 1 hook firing/);
    assert.equal(d.unsettledOnly, undefined);
  });
});

describe('Q12: a terminal-API-error proxy that never fired is an unsettled-only PARTIAL', () => {
  const facts = (over = {}) => ({ started: true, apiError: true, apiErrorStatus: 404, apiErrorCode: 'model_not_found', requestsSent: ['m', 'm'], errorText: 'the model was not found', fellBack: false, subagentStart: 1, subagentStop: 0, ...over });
  const report = (over = {}) => ({
    ctl_throw: { threw: true, msg: 'q12-deliberate' },
    ctl_parallel_thunk_throw: { threw: false, isNull: false, type: 'array', json: '[null,"ok"]', slots: [null, 'ok'] },
    ctl_value: { threw: false, isNull: false, type: 'string', json: '"OK"' },
    schema_impossible: { threw: true, msg: 'agent received an unusable JSON Schema' },
    bad_model_direct: { threw: false, isNull: true, type: 'null', json: 'null' },
    bad_model_in_parallel: { threw: false, isNull: false, type: 'array', json: '[null,"ok"]', slots: [null, 'ok'] },
    ...over,
  });
  const obs = ({ rep = report(), direct = facts(), parallel = facts() } = {}) => ({
    launched: [{}], run: { status: 'completed' }, rep,
    facts: { ctl: facts({ apiError: false, subagentStop: 1 }), schema: facts({ started: false, apiError: false }), direct, parallel },
  });

  test('null on a terminal API error, [null, "ok"] from parallel(), a throw on an impossible schema: VERIFIED', () => {
    const d = q12.decide(obs());
    assert.equal(d.verdict, 'VERIFIED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
  });

  test('an agent rejected before it started (no API error on record): PARTIAL with unsettledOnly', () => {
    const d = q12.decide(obs({ direct: facts({ started: false, apiError: false }) }));
    assertUnsettledOnly('Q12', d);
    assert.match(d.summary, /unsettled, needing another terminal-API-error proxy: agent\(\) direct/);
  });

  test('a case that contradicts decides it beside an unsettled one, with no flag', () => {
    const d = q12.decide(obs({
      direct: facts({ started: false, apiError: false }),
      rep: report({ bad_model_in_parallel: { threw: true, msg: 'API Error: 404 model not found' } }),
    }));
    assert.equal(d.verdict, 'CONTRADICTED', d.summary);
    assert.equal(d.unsettledOnly, undefined);
  });

  test('a failed control is INCONCLUSIVE before any case is read', () => {
    const d = q12.decide(obs({ rep: report({ ctl_value: { threw: true, msg: 'agent died' } }) }));
    assert.equal(d.verdict, 'INCONCLUSIVE');
    assert.match(d.summary, /a control failed/);
  });

  test('a started bad-model agent that fell back and resolved a value beside the 404 it recovered from: PARTIAL with unsettledOnly, never CONTRADICTED', () => {
    const value = { threw: false, isNull: false, type: 'string', json: '"⚠ This agent switched to claude-other because its earlier model could not be used.\\nOK"' };
    const d = q12.decide(obs({ rep: report({ bad_model_direct: value }), direct: facts({ fellBack: true }) }));
    assertUnsettledOnly('Q12', d);
    assert.match(d.summary, /agent\(\) direct: the rejected-model proxy fell back to another model \(started true, API error on record true, fell back true/);
    const par = q12.decide(obs({ rep: report({ bad_model_in_parallel: { ...value, type: 'array', json: '["OK","ok"]', slots: ['OK', 'ok'] } }), parallel: facts({ fellBack: true }) }));
    assertUnsettledOnly('Q12', par);
    assert.match(par.summary, /parallel\(\): the rejected-model proxy fell back to another model/);
  });
});

describe("Q12 agentFacts: an API error read from error text only, a fallback from the model sent or the switch line", () => {
  const BAD = 'claude-q12-planted-bad';
  const LABEL = 'q12-badmodel';
  const AGENT = 'agent-1';
  // What run() hands agentFacts for one agent: its journal and progress rows,
  // its transcript records, its SubagentStart and (when `stop` is given) its
  // SubagentStop.
  const seen = (recs, { prog = {}, stop } = {}) => ({
    journal: [{ type: 'started', label: LABEL, agentId: AGENT }],
    progress: [{ type: 'workflow_agent', label: LABEL, agentId: AGENT, model: BAD, state: 'error', tokens: 0, ...prog }],
    transcripts: { [AGENT]: recs },
    sstart: [cap('sstart', { agent_id: AGENT })],
    sstop: stop === undefined ? [] : [cap('sstop', { agent_id: AGENT, last_assistant_message: stop })],
  });
  const request = (model) => ({ type: 'api-request', params: { model, max_tokens: 404 } });
  // The prompt records: the task and a request shape whose system text names
  // the very words an error carries.
  const prompt = [
    { type: 'user', message: { role: 'user', content: 'Reply with exactly the word OK. On an API Error or a 404 model not found, say so.' } },
    { type: 'api-request-shape', system: 'Report any API Error: 404 not_found_error you meet.' },
  ];
  const assistant = (text, over = {}) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }], usage: { input_tokens: 404, output_tokens: 404 } }, ...over });
  // The record 2.1.306 wrote for an agent whose model the API rejected.
  const modelMessage = (model) => `There's an issue with the selected model (${model}). It may not exist or you may not have access to it. Run --model to pick a different model.`;
  const rejected = () => assistant(modelMessage(BAD), { isApiErrorMessage: true, apiErrorStatus: 404, error: 'model_not_found' });
  const okValue = { threw: false, isNull: false, type: 'string', json: '"OK"' };

  test('a 404 in usage counts, request params, progress tokens or a reply, and error words in the prompt, read no API error: the proxy missing, never CONTRADICTED', () => {
    const f = q12.agentFacts(LABEL, okValue, seen([...prompt, request(BAD), assistant('OK, in 404 ms')], { prog: { state: 'done', tokens: 404, resultPreview: 'OK' } }), BAD);
    assert.equal(f.started, true);
    assert.equal(f.apiError, false, `read an API error from ${JSON.stringify(f.errorText)}`);
    assert.equal(f.fellBack, false);
    const d = q12.decide({
      launched: [{}], run: { status: 'completed' },
      rep: { ctl_throw: { threw: true, msg: 'q12-deliberate' }, ctl_value: okValue, schema_impossible: { threw: true, msg: 'unusable schema' }, bad_model_direct: okValue, bad_model_in_parallel: { threw: false, isNull: false, type: 'array', json: '[null,"ok"]', slots: [null, 'ok'] } },
      facts: { ctl: f, schema: f, direct: f, parallel: { ...f, apiError: true } },
    });
    assertUnsettledOnly('Q12', d);
    assert.match(d.summary, /agent\(\) direct: the rejected-model proxy produced no terminal API error/);
  });

  test("the CLI's model_not_found record reads as an API error, and so does each error text alone: assistant text, an error code, the progress error, SubagentStop's message, the thrown text", () => {
    const f = q12.agentFacts(LABEL, { threw: false, isNull: true, type: 'null', json: 'null' }, seen([...prompt, request(BAD), request(BAD), rejected()]), BAD);
    assert.deepEqual([f.apiError, f.apiErrorStatus, f.apiErrorCode, f.fellBack, f.requestsSent], [true, 404, 'model_not_found', false, [BAD, BAD]]);
    assert.ok(f.errorText.startsWith("There's an issue with the selected model"), f.errorText);
    const alone = {
      'assistant text': [[assistant(modelMessage(BAD))], {}],
      'API Error line': [[assistant('API Error: 529 overloaded')], {}],
      'error code': [[{ type: 'assistant', message: { content: [] }, error: 'model_not_found' }], {}],
      'progress error': [[], { prog: { error: modelMessage(BAD) } }],
      'SubagentStop message': [[], { stop: modelMessage(BAD) }],
    };
    for (const [name, [recs, opts]] of Object.entries(alone)) {
      assert.equal(q12.agentFacts(LABEL, null, seen(recs, opts), BAD).apiError, true, name);
    }
    assert.equal(q12.agentFacts(LABEL, { threw: true, msg: `agent failed: ${modelMessage(BAD)}` }, seen([]), BAD).apiError, true, 'thrown text');
    assert.equal(q12.agentFacts(LABEL, null, seen([{ type: 'system', apiErrorStatus: 404 }]), BAD).apiError, true, 'a status on record');
  });

  test('a fallback reads from a request sent with another model id or the "This agent switched to" line, wherever the reply lands', () => {
    const switched = '⚠ This agent switched to claude-other because its earlier model could not be used.';
    const other = q12.agentFacts(LABEL, okValue, seen([request(BAD), rejected(), request('claude-other'), assistant('OK')]), BAD);
    assert.deepEqual([other.apiError, other.fellBack], [true, true]);
    assert.equal(q12.agentFacts(LABEL, okValue, seen([request(`${BAD}[1m]`)]), BAD).fellBack, false, 'a decorated id of the bad model is no fallback');
    const lines = {
      'the outcome': [{ ...okValue, json: JSON.stringify(`${switched}\nOK`) }, {}, []],
      'the transcript': [okValue, {}, [assistant(`${switched}\nOK`)]],
      'SubagentStop': [okValue, { stop: `${switched}\nOK` }, []],
      'the progress preview': [okValue, { prog: { resultPreview: `${switched}\nOK` } }, []],
    };
    for (const [where, [rec, opts, recs]] of Object.entries(lines)) {
      assert.equal(q12.agentFacts(LABEL, rec, seen(recs, opts), BAD).fellBack, true, where);
    }
    assert.equal(q12.agentFacts(LABEL, okValue, seen([request('claude-other')])).fellBack, false, 'with no model asked for, another id is no fallback');
    const d = q12.decide({
      launched: [{}], run: { status: 'completed' },
      rep: { ctl_throw: { threw: true, msg: 'q12-deliberate' }, ctl_value: okValue, schema_impossible: { threw: true, msg: 'unusable schema' }, bad_model_direct: okValue, bad_model_in_parallel: { threw: false, isNull: false, type: 'array', json: '[null,"ok"]', slots: [null, 'ok'] } },
      facts: { ctl: other, schema: other, direct: other, parallel: { ...other, fellBack: false } },
    });
    assertUnsettledOnly('Q12', d);
    assert.match(d.summary, /agent\(\) direct: the rejected-model proxy fell back to another model/);
  });
});
