// The probe runner's bookkeeping, none of which needs claude: passes.json and
// KTD 10's check (passedOn, passCheck), what --cleanup may delete, capture.mjs's
// answer rules, the shared scrubber, lib's isolation pieces and failure(), the
// import guard behind the verdict hash, the per-probe ceiling and what it ends,
// the passes.json lock and the probes.md block. Every sample that looks like a
// real id or path is built at run time, so this file stays clean for the leak
// test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  CAPTURE, HERE, baseArgs, claudeMdExcludes, cleanEnv, cliVersion, failure, gitEnv, readCaptures, runClaude, runClaudeAsync,
  runStream, scrubber, setClaudeCommand, sleep, writeSettings,
} from '../probes/lib.mjs';
import { BEGIN, END, renderBlock, writeReport } from '../probes/report.mjs';
import {
  DEFS, EXPECTED, JOBS, LOAD_BEARING, PROBE_CEILING_MS, Q8_BG, UNSETTLED_OK, bgLaunchId, childrenOf, cleanup, cleanupTargets, endChildren, endEach,
  gitView, hashParts, judge, leftoversSaid, loadProbes, measured, parseCimProcesses, parsePsProcesses, passCheck, passedOn, probeHash, recordOf,
  treeOf, withCeiling, withLock, writePasses,
} from '../probes/run.mjs';
import { RULES } from './leak.mjs';

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-probes-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const fresh = (name) => fs.mkdtempSync(path.join(dir, `${name}-`));
const fwd = (p) => p.replace(/\\/g, '/');
const slug = (p) => p.replace(/[^A-Za-z0-9]/g, '-');
const winHome = (name = 'someone') => ['C:', 'Users', name].join('\\');

// A defs folder holding a stub for every EXPECTED probe; only hashed, never run.
function plantDefs() {
  const defs = fresh('defs');
  for (const id of EXPECTED) fs.writeFileSync(path.join(defs, `q${id.slice(1).padStart(2, '0')}-planted.mjs`), `export default { id: '${id}', run: async () => ({ verdict: 'VERIFIED' }) };\n`);
  return defs;
}
const defOf = (defs, id) => path.join(defs, `q${id.slice(1).padStart(2, '0')}-planted.mjs`);

describe('passes.json, passedOn and passCheck (KTD 10)', () => {
  let root;
  let defs;
  let run;
  const result = (id, verdict = 'VERIFIED') => ({ id, verdict, hash: probeHash(defOf(defs, id)) });
  const allVerified = () => LOAD_BEARING.map((id) => result(id));
  before(() => {
    root = fresh('flow');
    defs = plantDefs();
    run = path.join(root, 'run-1');
  });

  test('the probe table and the load-bearing set are pinned', () => {
    assert.deepEqual(EXPECTED, Array.from({ length: 17 }, (_, i) => `Q${i}`));
    assert.deepEqual(LOAD_BEARING, ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q8', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15']);
  });

  test('every load-bearing probe VERIFIED with matching hashes passes, as filed and as re-checked', async () => {
    const entry = await writePasses('9.9.9', run, allVerified(), { root, defs });
    assert.equal(entry.loadBearingPassed, true);
    assert.deepEqual(entry.failing, []);
    assert.deepEqual(Object.keys(entry.probes).sort(), [...LOAD_BEARING].sort());
    assert.equal(entry.probes.Q1.run, run);
    assert.deepEqual(passCheck('9.9.9', { root, defs }), { passed: true, failing: [] });
    assert.equal(passedOn('9.9.9', { root, defs }), true);
    assert.ok(!fs.existsSync(path.join(root, 'passes.json.lock')), 'the lock outlived the write');
  });

  test('passedOn is a yes/no (an object would be truthy in an if); passCheck carries the detail', () => {
    for (const version of ['9.9.9', '0.0.1']) {
      assert.equal(typeof passedOn(version, { root, defs }), 'boolean', version);
      assert.equal(passedOn(version, { root, defs }), passCheck(version, { root, defs }).passed, version);
    }
    assert.equal(passedOn('0.0.1', { root, defs }), false);
  });

  test('a def edited after its verdict fails at read time, though passes.json filed a pass; re-running it clears that', async () => {
    fs.appendFileSync(defOf(defs, 'Q4'), '// edited after the run\n');
    assert.deepEqual(passCheck('9.9.9', { root, defs }), { passed: false, failing: [{ id: 'Q4', why: 'def changed since its verdict', verdict: 'VERIFIED' }] });
    assert.equal(passedOn('9.9.9', { root, defs }), false);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'passes.json'), 'utf8'))['9.9.9'].loadBearingPassed, true);
    const entry = await writePasses('9.9.9', run, [result('Q4')], { root, defs });
    assert.equal(entry.loadBearingPassed, true);
    assert.equal(passedOn('9.9.9', { root, defs }), true);
  });

  test('the hash covers the def, lib.mjs and capture.mjs: an edit to any one of them voids the verdict', () => {
    const [d, l, c] = ['def', 'lib', 'capture'].map((s) => Buffer.from(s));
    const h = hashParts(d, l, c);
    assert.notEqual(hashParts(Buffer.from('def2'), l, c), h);
    assert.notEqual(hashParts(d, Buffer.from('lib2'), c), h);
    assert.notEqual(hashParts(d, l, Buffer.from('capture2')), h);
    assert.notEqual(hashParts(Buffer.from('de'), Buffer.from('flib'), c), h, 'bytes moved across a part boundary went unseen');
    const file = defOf(plantDefs(), 'Q1');
    const inst = { lib: fs.readFileSync(path.join(HERE, 'lib.mjs')), capture: fs.readFileSync(CAPTURE) };
    const e = { verdict: 'VERIFIED', hash: probeHash(file, inst), seen: ['VERIFIED'] };
    assert.equal(judge(e, file, inst), null);
    assert.equal(judge(e, file), null, 'the files on disk hash as the instrument read here');
    const edited = (b) => Buffer.concat([b, Buffer.from('\n// edited\n')]);
    assert.equal(judge(e, file, { ...inst, lib: edited(inst.lib) }), 'def changed since its verdict');
    assert.equal(judge(e, file, { ...inst, capture: edited(inst.capture) }), 'def changed since its verdict');
  });

  test('a load-bearing probe that never ran fails as not run, even when every other one passed', async () => {
    const entry = await writePasses('9.9.8', run, allVerified().filter((r) => r.id !== 'Q8'), { root, defs });
    assert.equal(entry.loadBearingPassed, false);
    assert.deepEqual(entry.failing, [{ id: 'Q8', why: 'not run' }]);
    assert.deepEqual(passCheck('9.9.8', { root, defs }).failing, [{ id: 'Q8', why: 'not run' }]);
    assert.deepEqual(passCheck('0.0.1', { root, defs }).failing.map((f) => `${f.id} ${f.why}`), LOAD_BEARING.map((id) => `${id} not run`));
  });

  test('a load-bearing PARTIAL fails; a non-load-bearing CONTRADICTED does not', async () => {
    const results = [...allVerified().filter((r) => r.id !== 'Q14'), result('Q14', 'PARTIAL'), result('Q6', 'CONTRADICTED')];
    const entry = await writePasses('9.9.7', run, results, { root, defs });
    assert.deepEqual(entry.failing, [{ id: 'Q14', why: 'not VERIFIED', verdict: 'PARTIAL' }]);
  });

  test('a missing def fails the version, load-bearing or not', () => {
    const q16 = defOf(defs, 'Q16');
    fs.renameSync(q16, `${q16}.away`);
    try {
      assert.deepEqual(passCheck('9.9.9', { root, defs }), { passed: false, failing: [{ id: 'Q16', why: 'missing def' }] });
      assert.equal(passedOn('9.9.9', { root, defs }), false);
    } finally {
      fs.renameSync(`${q16}.away`, q16);
    }
  });

  test('two runs of one def that disagree fail until the def changes; a re-roll never decides it', async () => {
    await writePasses('9.9.6', run, [...allVerified().filter((r) => r.id !== 'Q2'), result('Q2', 'CONTRADICTED')], { root, defs });
    let entry = await writePasses('9.9.6', run, [result('Q2')], { root, defs });
    assert.deepEqual(entry.failing, [{ id: 'Q2', why: 'verdicts disagree on the same def', verdict: 'VERIFIED' }]);
    entry = await writePasses('9.9.6', run, [result('Q2')], { root, defs });
    assert.equal(entry.loadBearingPassed, false, 'a second VERIFIED on the same def must not outvote the CONTRADICTED');
    // An INCONCLUSIVE measured nothing, so it neither conflicts nor resolves.
    fs.appendFileSync(defOf(defs, 'Q2'), '// the flake fixed\n');
    await writePasses('9.9.6', run, [result('Q2', 'INCONCLUSIVE')], { root, defs });
    entry = await writePasses('9.9.6', run, [result('Q2')], { root, defs });
    assert.equal(entry.loadBearingPassed, true);
  });

  test('a PARTIAL its def flags unsettledOnly measured nothing, but only for a probe pinned in UNSETTLED_OK', async () => {
    assert.deepEqual(UNSETTLED_OK, ['Q0', 'Q3', 'Q5', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14']);
    for (const id of ['Q1', 'Q2', 'Q15']) assert.ok(!UNSETTLED_OK.includes(id), `${id}'s PARTIAL is a measured deviation`);
    const flagged = (id, verdict = 'PARTIAL') => ({ ...result(id, verdict), unsettledOnly: true });
    // [version, the verdict filed first on a hash, whether a VERIFIED after it on that hash passes]
    const cases = [
      ['9.8.5', flagged('Q5'), true],
      ['9.8.4', flagged('Q15'), false],
      ['9.8.3', result('Q5', 'PARTIAL'), false],
      ['9.8.2', { ...result('Q5', 'PARTIAL'), unsettledOnly: 'true' }, false],
      ['9.8.1', flagged('Q5', 'CONTRADICTED'), false],
    ];
    for (const [version, first, passes] of cases) {
      const label = `${first.id} ${first.verdict} (unsettledOnly ${JSON.stringify(first.unsettledOnly)}) then VERIFIED`;
      assert.equal((await writePasses(version, run, [...allVerified().filter((r) => r.id !== first.id), first], { root, defs })).loadBearingPassed, false, label);
      const entry = await writePasses(version, run, [result(first.id)], { root, defs });
      assert.equal(entry.loadBearingPassed, passes, label);
      assert.deepEqual(entry.failing, passes ? [] : [{ id: first.id, why: 'verdicts disagree on the same def', verdict: 'VERIFIED' }], label);
      assert.equal(passedOn(version, { root, defs }), passes, label);
      // report.mjs marks a conflict exactly where the gate sees one.
      const row = renderBlock({ [version]: entry }, { defs }).split('\n').find((l) => l.startsWith(`| ${first.id} |`));
      assert.equal(row.includes('CONFLICT'), !passes, `${label}: ${row}`);
    }
  });

  test('two defs claiming one id fail closed: passCheck names both, passedOn is false, writePasses files not passed, loadProbes refuses', async () => {
    const twice = plantDefs();
    fs.copyFileSync(defOf(twice, 'Q4'), path.join(twice, 'q04-x - Copy.mjs'));
    const check = passCheck('9.9.9', { root, defs: twice });
    assert.equal(check.passed, false);
    assert.deepEqual(check.failing.map((f) => f.id), ['*']);
    assert.match(check.failing[0].why, /two def files claim Q4/);
    for (const f of ['q04-planted.mjs', 'q04-x - Copy.mjs']) assert.ok(check.failing[0].why.includes(f), check.failing[0].why);
    assert.equal(passedOn('9.9.9', { root, defs: twice }), false);
    const entry = await writePasses('9.7.0', run, [{ id: 'Q1', verdict: 'VERIFIED', hash: probeHash(defOf(twice, 'Q1')) }], { root, defs: twice });
    assert.equal(entry.loadBearingPassed, false);
    assert.equal(entry.probes.Q1.verdict, 'VERIFIED', 'the verdicts were not filed');
    assert.deepEqual(entry.failing.map((f) => f.id), ['*']);
    await assert.rejects(loadProbes(undefined, { defs: twice }), /two def files claim Q4/);
  });

  test('an unreadable passes.json fails the check closed instead of throwing', () => {
    const torn = fresh('torn');
    fs.writeFileSync(path.join(torn, 'passes.json'), '{"9.9.9": {"probes"');
    const check = passCheck('9.9.9', { root: torn, defs });
    assert.equal(check.passed, false);
    assert.deepEqual(check.failing.map((f) => f.id), ['*']);
    assert.equal(passedOn('9.9.9', { root: torn, defs }), false);
  });

  test('a verdict filed before hashing never counts, and the next filing replaces that shape', async () => {
    const file = path.join(root, 'passes.json');
    const passes = JSON.parse(fs.readFileSync(file, 'utf8'));
    passes['9.9.5'] = { verdicts: Object.fromEntries(LOAD_BEARING.map((id) => [id, 'VERIFIED'])), runs: Object.fromEntries(LOAD_BEARING.map((id) => [id, run])), loadBearingPassed: true };
    fs.writeFileSync(file, JSON.stringify(passes));
    assert.deepEqual(passCheck('9.9.5', { root, defs }).failing.map((f) => f.why), LOAD_BEARING.map(() => 'recorded before hashing'));
    const entry = await writePasses('9.9.5', run, allVerified(), { root, defs });
    assert.equal(entry.loadBearingPassed, true);
    assert.equal(entry.verdicts, undefined);
    const after = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(after['9.9.9'].loadBearingPassed, true, 'filing one version rewrote another');
  });
});

describe('a probe result becomes a record', () => {
  const base = { id: 'Q3', question: 'q', assumption: 'a', loadBearing: true, version: '1.2.3', ms: 5, made: [], hash: 'h' };

  test('no verdict, or one outside the vocabulary, is filed as ERROR with what the probe said', () => {
    for (const r of [undefined, null, 'VERIFIED', [], {}, { verdict: 'PASS', summary: 'fine' }, { verdict: 'ERROR' }, { verdict: 'verified' }]) {
      const rec = recordOf(base, r);
      assert.equal(rec.verdict, 'ERROR', JSON.stringify(r));
      assert.match(rec.summary, /the probe returned verdict/);
      assert.deepEqual(rec.evidence, []);
    }
    assert.match(recordOf(base, { verdict: 'PASS', summary: 'fine' }).summary, /"PASS".*its summary: fine/);
  });

  test("the def's object cannot replace what the runner knows", () => {
    const rec = recordOf(base, { verdict: 'VERIFIED', summary: 's', evidence: 'one line', id: 'Q99', version: '0.0.0', loadBearing: false, hash: 'x', made: ['elsewhere'], extra: 1 });
    assert.deepEqual({ id: rec.id, version: rec.version, loadBearing: rec.loadBearing, hash: rec.hash, made: rec.made }, { id: 'Q3', version: '1.2.3', loadBearing: true, hash: 'h', made: [] });
    assert.equal(rec.verdict, 'VERIFIED');
    assert.deepEqual(rec.evidence, ['one line']);
    assert.equal(rec.extra, 1);
  });

  test('unsettledOnly rides into the record, and measured() honors it only on a pinned PARTIAL', () => {
    const rec = recordOf(base, { verdict: 'PARTIAL', summary: 's', unsettledOnly: true });
    assert.equal(rec.unsettledOnly, true);
    assert.equal(measured(rec), false, 'Q3 is in UNSETTLED_OK');
    assert.equal(measured(recordOf({ ...base, id: 'Q15' }, { verdict: 'PARTIAL', unsettledOnly: true })), true, 'Q15 is not');
    assert.equal(measured(recordOf(base, { verdict: 'PARTIAL' })), true, 'no flag, no opt-out');
    assert.equal(measured(recordOf(base, { verdict: 'VERIFIED', unsettledOnly: true })), true);
    assert.equal(measured(recordOf(base, { verdict: 'INCONCLUSIVE' })), false);
    assert.equal(measured(recordOf(base, { verdict: 'PARTIAL', unsettledOnly: true, id: 'Q15' })), false, "the record's id is the runner's, whatever the def says");
  });

  test("the runner's own ERROR keeps its summary", () => {
    const rec = recordOf({ ...base, internal: true }, { verdict: 'ERROR', summary: 'the probe crashed: boom' });
    assert.equal(rec.verdict, 'ERROR');
    assert.equal(rec.summary, 'the probe crashed: boom');
    assert.ok(!('internal' in rec));
  });
});

describe('--cleanup deletes only what a probe made', () => {
  test('claude-probe-* workspaces in the temp dir, their transcript and task-output folders, never a look-alike', () => {
    const tmp = fresh('tmp');
    const projects = fresh('projects');
    const tasks = path.join(tmp, 'claude');
    const cache = fresh('cache');
    const run = fresh('run');
    const ws1 = path.join(tmp, 'claude-probe-q1-main-abc');
    const ws2 = path.join(tmp, 'claude-probe-q7-kill-def');
    const ws3 = path.join(tmp, 'claude-probe-q2-deny-ghi');
    const tr1 = path.join(projects, slug(ws1));
    const tr2 = path.join(projects, slug(path.join(ws2, 'repo', 'projects')));
    const lookalike = path.join(dir, 'elsewhere', 'claude-probe-q1-x');
    const never = [
      tmp,
      projects,
      path.join(tmp, 'other-folder'),
      path.join(ws1, 'nested'),
      path.join(ws1, '..', '..', 'escaped'),
      lookalike,
      path.join(projects, slug(lookalike)),
      path.join(projects, 'C--live-project-claude-probe-tools'),
      path.join(projects, slug(path.join(dir, 'the-back-nine'))),
      path.join(tr1, 'subagents'),
      'claude-probe-relative',
    ];
    // An older run's results.json, a finished probe's result.json, and a
    // crashed probe's made.json (all it left).
    fs.writeFileSync(path.join(run, 'results.json'), JSON.stringify({ results: [{ made: [ws1, tr1, ...never.slice(0, 6)] }] }));
    fs.mkdirSync(path.join(run, 'Q1'));
    fs.writeFileSync(path.join(run, 'Q1', 'result.json'), JSON.stringify({ made: [ws1, 42, null] }));
    fs.mkdirSync(path.join(run, 'Q7'));
    fs.writeFileSync(path.join(run, 'Q7', 'made.json'), JSON.stringify([ws2, tr2, ...never.slice(6)]));
    fs.mkdirSync(path.join(run, 'Q9'));
    fs.writeFileSync(path.join(run, 'Q9', 'made.json'), '["torn');
    // A probe that crashed before track() ran: its workspace listed, its
    // transcript folder not.
    fs.mkdirSync(path.join(run, 'Q2'));
    fs.writeFileSync(path.join(run, 'Q2', 'made.json'), JSON.stringify([ws3]));
    // On disk only: ws3's own transcript folder, a session started in
    // <ws1>/repo (no def lists either), the task output under the CLI's temp
    // root for both, and look-alikes that share a prefix with a workspace but
    // aren't inside it, or name a workspace no run listed, or a live session.
    const tr3 = path.join(projects, slug(ws3));
    const nested = path.join(projects, slug(path.join(ws1, 'repo')));
    const out1 = path.join(tasks, slug(ws1));
    const outNested = path.join(tasks, slug(path.join(ws1, 'repo')));
    // The CLI cache's MCP log folder for ws3 (Q15's stub server), and a live
    // project's cache folder beside it.
    const logs3 = path.join(cache, slug(ws3));
    const notTargets = [
      `${tr1}x-repo`,
      path.join(projects, slug(path.join(tmp, 'other-folder', 'repo'))),
      `${out1}x`,
      path.join(tasks, slug(path.join(tmp, 'claude-probe-q9-unlisted-jkl'))),
      path.join(tasks, slug(path.join(dir, 'the-back-nine'))),
      path.join(tasks, slug(ws2).slice(0, -1)),
      path.join(cache, slug(path.join(dir, 'the-back-nine'))),
      path.join(cache, slug(path.join(tmp, 'claude-probe-q9-unlisted-jkl'))),
    ];
    for (const n of [tr3, nested, out1, outNested, path.join(logs3, 'mcp-logs-stub'), ...notTargets]) fs.mkdirSync(n, { recursive: true });
    assert.deepEqual(cleanupTargets(run, { tmp, projects, cache }).sort(), [ws1, ws2, ws3, tr1, tr2, tr3, nested, out1, outNested, logs3].sort());
    // Without a cache root (a CLI that has none), the rest is unchanged.
    assert.deepEqual(cleanupTargets(run, { tmp, projects, cache: null }).sort(), [ws1, ws2, ws3, tr1, tr2, tr3, nested, out1, outNested].sort());
  });

  test('the task-output root is overridable like the others', () => {
    const tmp = fresh('tmp');
    const tasks = fresh('tasks');
    const run = fresh('run');
    const ws = path.join(tmp, 'claude-probe-q5-shell-mno');
    fs.mkdirSync(path.join(run, 'Q5'));
    fs.writeFileSync(path.join(run, 'Q5', 'made.json'), JSON.stringify([ws]));
    const out = path.join(tasks, slug(ws));
    const unused = path.join(tmp, 'claude', slug(ws));
    for (const n of [out, unused]) fs.mkdirSync(n, { recursive: true });
    assert.deepEqual(cleanupTargets(run, { tmp, projects: fresh('projects'), tasks }).sort(), [ws, out].sort());
  });

  test('by default the roots are the system temp dir and ~/.claude/projects', () => {
    const run = fresh('run');
    const ws = path.join(os.tmpdir(), 'claude-probe-q0-zz-test');
    const tr = path.join(os.homedir(), '.claude', 'projects', slug(ws));
    const live = path.join(os.homedir(), '.claude', 'projects', 'C--a-live-project');
    fs.mkdirSync(path.join(run, 'Q0'));
    fs.writeFileSync(path.join(run, 'Q0', 'made.json'), JSON.stringify([ws, tr, live, path.join(os.homedir(), 'claude-probe-q0-zz')]));
    assert.deepEqual(cleanupTargets(run).sort(), [ws, tr].sort());
  });

  test('a run folder with no records, or none at all, yields nothing', () => {
    assert.deepEqual(cleanupTargets(fresh('empty')), []);
    assert.deepEqual(cleanupTargets(path.join(dir, 'no-such-run')), []);
  });
});

// O24. Every root is a temp folder: the real ~/.claude/jobs holds real
// background sessions' folders, and no test may list it.
describe("--cleanup also deletes the job folder Q8's --bg session left (O24)", () => {
  const short = () => randomUUID().slice(0, 8);
  const sid = (id) => `${id}${randomUUID().slice(8)}`;
  const roots = () => ({ tmp: fresh('tmp'), projects: fresh('projects'), tasks: fresh('tasks'), cache: null, jobs: fresh('jobs') });
  // What `claude --bg` prints once a session is up (agent-view.md's sample).
  const launched = (id) => [
    `backgrounded · ${id}`,
    '  claude agents             list sessions',
    `  claude attach ${id}    open in this terminal`,
    `  claude logs ${id}      show recent output`,
    `  claude stop ${id}      stop this session`,
    '',
  ].join('\n');
  // A run whose Q8 bg arm made `ws` and kept a launch record, as the def
  // writes both: <run>/Q8/made.json and <run>/Q8/bg/bg-launch.json.
  const bgRun = (ws, stdout, stderr = '') => {
    const run = fresh('run');
    fs.mkdirSync(path.join(run, 'Q8', 'bg'), { recursive: true });
    fs.writeFileSync(path.join(run, 'Q8', 'made.json'), JSON.stringify([ws]));
    fs.writeFileSync(path.join(run, 'Q8', 'bg', 'bg-launch.json'), JSON.stringify({ code: 0, signal: null, stdout, stderr, ms: 900 }, null, 2));
    return run;
  };
  // A job folder as the CLI leaves one: tmp/ and, unless state is undefined,
  // a state.json (a string is written as is).
  const job = (jobs, name, state) => {
    const d = path.join(jobs, name);
    fs.mkdirSync(path.join(d, 'tmp'), { recursive: true });
    if (state !== undefined) fs.writeFileSync(path.join(d, 'state.json'), typeof state === 'string' ? state : JSON.stringify(state));
    return d;
  };
  // A probe workspace in the temp root, and a run whose launch record names `id`.
  const setUp = (id = short()) => {
    const r = roots();
    const ws = path.join(r.tmp, 'claude-probe-q8-bg-abc');
    fs.mkdirSync(ws);
    return { r, ws, id, run: bgRun(ws, launched(id)) };
  };

  test('JOBS is ~/.claude/jobs, where every background session keeps its folder', () => {
    assert.equal(JOBS, path.join(os.homedir(), '.claude', 'jobs'));
  });

  test('its folder goes with the workspace; every other job folder, the settled folder and pins.json stay', () => {
    const { r, ws, id, run } = setUp();
    const mine = job(r.jobs, id, { state: 'stopped', sessionId: sid(id), daemonShort: id, cwd: ws });
    // A live session of someone else's, and one started in a probe-named
    // folder this run never made.
    const other = short();
    job(r.jobs, other, { state: 'done', sessionId: sid(other), cwd: path.join(dir, 'the-back-nine') });
    const stranger = short();
    job(r.jobs, stranger, { state: 'stopped', sessionId: sid(stranger), cwd: path.join(r.tmp, 'claude-probe-q8-bg-zzz') });
    fs.mkdirSync(path.join(r.jobs, 'settled'));
    fs.writeFileSync(path.join(r.jobs, 'pins.json'), '[]');
    const notes = [];
    assert.deepEqual(cleanupTargets(run, { ...r, notes }).sort(), [ws, mine].sort());
    assert.deepEqual(notes, []);
  });

  test("each ended state goes, and so does a session started in a folder inside the workspace or a worktree whose originCwd is the workspace", () => {
    for (const [label, state] of [
      ['done', (ws, id) => ({ state: 'done', sessionId: sid(id), cwd: ws })],
      ['failed', (ws, id) => ({ state: 'failed', sessionId: sid(id), cwd: ws })],
      ['inside the workspace', (ws, id) => ({ state: 'stopped', sessionId: sid(id), cwd: path.join(ws, 'repo') })],
      ['a worktree', (ws, id) => ({ state: 'stopped', sessionId: sid(id), cwd: path.join(dir, 'worktree-x'), originCwd: ws })],
      ['no sessionId', (ws) => ({ state: 'stopped', cwd: ws })],
      ['the workspace spelled in the other case', (ws, id) => ({ state: 'stopped', sessionId: sid(id), cwd: process.platform === 'win32' ? ws.toUpperCase() : ws })],
    ]) {
      const { r, ws, id, run } = setUp();
      const mine = job(r.jobs, id, state(ws, id));
      const notes = [];
      assert.deepEqual(cleanupTargets(run, { ...r, notes }).sort(), [ws, mine].sort(), label);
      assert.deepEqual(notes, [], label);
    }
  });

  test("a folder that can't show it is this run's ended session is kept, and a note says why", () => {
    const cases = [
      ['still working', (ws, id) => ({ state: 'working', sessionId: sid(id), cwd: ws }), (id) => new RegExp(`reads "working", so it may still be running: claude stop ${id}, then claude rm ${id}`)],
      ['blocked', (ws, id) => ({ state: 'blocked', sessionId: sid(id), cwd: ws }), () => /reads "blocked", so it may still be running/],
      ['no state', (ws, id) => ({ sessionId: sid(id), cwd: ws }), () => /reads null, so it may still be running/],
      ['an unknown state', (ws, id) => ({ state: 'paused', sessionId: sid(id), cwd: ws }), () => /reads "paused"/],
      ['no state.json', () => undefined, () => /no readable state\.json/],
      ['a torn state.json', () => '{"state":"sto', () => /no readable state\.json/],
      ['a state.json that is no object', () => '["stopped"]', () => /no readable state\.json/],
      ['another folder', (ws, id) => ({ state: 'stopped', sessionId: sid(id), cwd: path.join(dir, 'the-back-nine') }), () => /names no workspace this run made/],
      ['a look-alike sharing the prefix', (ws, id) => ({ state: 'stopped', sessionId: sid(id), cwd: `${ws}x` }), () => /names no workspace this run made/],
      ['a relative cwd', (ws, id) => ({ state: 'stopped', sessionId: sid(id), cwd: path.basename(ws) }), () => /names no workspace this run made/],
      ['another session', (ws) => ({ state: 'stopped', sessionId: randomUUID(), cwd: ws }), () => /names another session/],
    ];
    for (const [label, state, why] of cases) {
      const { r, ws, id, run } = setUp();
      const kept = job(r.jobs, id, state(ws, id));
      const notes = [];
      assert.deepEqual(cleanupTargets(run, { ...r, notes }), [ws], label);
      assert.equal(notes.length, 1, `${label}: ${notes}`);
      assert.ok(notes[0].startsWith(`kept ${kept} (`), `${label}: ${notes[0]}`);
      assert.match(notes[0], why(id), label);
      assert.ok(fs.existsSync(kept), label);
    }
    // A file in the folder's place, and a link to a folder that would pass.
    const { r, ws, id, run } = setUp();
    fs.writeFileSync(path.join(r.jobs, id), 'not a folder');
    const notes = [];
    assert.deepEqual(cleanupTargets(run, { ...r, notes }), [ws]);
    assert.match(notes[0], /not a plain folder/);
    const real = job(fresh('elsewhere'), 'real', { state: 'stopped', sessionId: sid(id), cwd: ws });
    fs.rmSync(path.join(r.jobs, id));
    let linked = true;
    try { fs.symlinkSync(real, path.join(r.jobs, id), 'junction'); } catch { linked = false; }
    if (linked) {
      const linkNotes = [];
      assert.deepEqual(cleanupTargets(run, { ...r, notes: linkNotes }), [ws]);
      assert.match(linkNotes[0], /not a plain folder/);
      assert.ok(fs.existsSync(path.join(real, 'state.json')));
    }
  });

  test('no record, a refused launch, or a gone folder leave nothing to look for and say nothing', () => {
    const r = roots();
    const ws = path.join(r.tmp, 'claude-probe-q8-bg-abc');
    const id = short();
    job(r.jobs, id, { state: 'stopped', sessionId: sid(id), cwd: ws });
    // No launch record: the bg arm never ran.
    const bare = fresh('run');
    fs.mkdirSync(path.join(bare, 'Q8'));
    fs.writeFileSync(path.join(bare, 'Q8', 'made.json'), JSON.stringify([ws]));
    // The CLI refused the folder: no session started, whatever id-like text it printed.
    const refused = bgRun(ws, `claude stop ${id}\n`, 'Workspace not trusted. Run `claude` in <ws> once and accept the trust prompt, then retry.\n');
    // The record names an id whose folder is gone.
    const gone = bgRun(ws, launched(short()));
    for (const [label, run] of [['no record', bare], ['refused', refused], ['gone', gone]]) {
      const notes = [];
      assert.deepEqual(cleanupTargets(run, { ...r, notes }), [ws], label);
      assert.deepEqual(notes, [], label);
    }
    assert.deepEqual(bgLaunchId(bare), { id: null });
    assert.deepEqual(bgLaunchId(refused), { id: null });
  });

  test('the id comes only from the launch record Q8 kept, read the way its def reads it', () => {
    const src = fs.readFileSync(path.join(DEFS, 'q08-session-kind-env.mjs'), 'utf8');
    for (const re of [Q8_BG.refused, ...Q8_BG.ids]) assert.ok(src.includes(String(re)), `${re} is no longer in q08's def: make Q8_BG read as the def does`);
    assert.ok(src.includes(`${Q8_BG.ids[0]}.exec(text) ?? ${Q8_BG.ids[1]}.exec(text)`), "q08's def no longer tries the two patterns in Q8_BG's order");
    assert.ok(src.includes('const text = `${launch.stdout}\\n${launch.stderr}`;'), "q08's def no longer joins stdout and stderr that way");
    assert.ok(src.includes("arm(ctx, 'bg')") && src.includes("path.join(out, 'bg-launch.json')"), "q08's def no longer keeps its launch at <run>/Q8/bg/bg-launch.json");

    const id = short();
    const record = (launch) => {
      const run = fresh('run');
      fs.mkdirSync(path.join(run, 'Q8', 'bg'), { recursive: true });
      fs.writeFileSync(path.join(run, 'Q8', 'bg', 'bg-launch.json'), typeof launch === 'string' ? launch : JSON.stringify(launch));
      return bgLaunchId(run);
    };
    const said = (stdout, stderr = '') => record({ code: 0, signal: null, stdout, stderr, ms: 1 });
    assert.deepEqual(said(launched(id)), { id });
    assert.deepEqual(said(`Starting background service…\n${launched(id)}`), { id });
    assert.deepEqual(said('', `claude stop ${id}\n`), { id }, 'the second pattern, on stderr');
    assert.match(said('Starting background service…\n').why, /names no session id/);
    // Q8's own pattern reads a color code glued to the id, or a word: no
    // short id, so no folder is looked for.
    for (const text of [`backgrounded · \u001b[36m${id}\u001b[39m\n`, 'backgrounded · settled\n', `backgrounded · ${id.toUpperCase().replace(/^./, 'A')}\n`, 'backgrounded · abc123\n']) {
      assert.match(said(text).why, /not a background session's short id/, JSON.stringify(text));
    }
    assert.match(record('{"stdout": "backgr').why, /unreadable or holds no launch output/);
    assert.match(record({ stdout: null, stderr: '' }).why, /unreadable or holds no launch output/);

    // A note, never a target, when the record names no usable id.
    const { r, ws } = setUp();
    const run = bgRun(ws, `backgrounded · \u001b[36m${id}\u001b[39m\n`);
    job(r.jobs, id, { state: 'stopped', sessionId: sid(id), cwd: ws });
    const notes = [];
    assert.deepEqual(cleanupTargets(run, { ...r, notes }), [ws]);
    assert.equal(notes.length, 1);
    assert.match(notes[0], /^no --bg job folder looked for: Q8 read ".*" from its launch/);
  });

  test('cleanup() deletes the job folder with the rest, says what it kept and why, and leaves the exit code to its caller', () => {
    const { r, ws, id, run } = setUp();
    const mine = job(r.jobs, id, { state: 'done', sessionId: sid(id), cwd: ws });
    const said = [];
    const warned = [];
    const exitBefore = process.exitCode;
    const res = cleanup(run, { ...r, say: (l) => said.push(l), warn: (l) => warned.push(l) });
    assert.equal(res.failed, 0);
    assert.deepEqual(res.targets.sort(), [ws, mine].sort());
    assert.deepEqual(said.sort(), [`deleted ${ws}`, `deleted ${mine}`].sort());
    assert.deepEqual(warned, []);
    assert.ok(!fs.existsSync(ws) && !fs.existsSync(mine));
    // A later run on the same (now deleted) workspace whose session still
    // works: its folder stays, and the line says how to stop it.
    const id2 = short();
    const run2 = bgRun(ws, launched(id2));
    const working = job(r.jobs, id2, { state: 'working', sessionId: sid(id2), cwd: ws });
    said.length = 0;
    const res2 = cleanup(run2, { ...r, say: (l) => said.push(l), warn: (l) => warned.push(l) });
    assert.deepEqual(res2, { targets: [ws], failed: 0 });
    assert.ok(fs.existsSync(working));
    assert.ok(said.some((l) => l.startsWith(`kept ${working} (`) && l.includes(`claude stop ${id2}`)), said.join('\n'));
    assert.deepEqual(warned, []);
    assert.equal(process.exitCode, exitBefore);
  });
});

describe('capture.mjs', () => {
  const fire = (out, label, flags = [], input = {}, env = { PROBE_OUT: out }) => {
    const base = { ...process.env };
    delete base.PROBE_OUT;
    return spawnSync(process.execPath, [CAPTURE, label, ...flags], { input: JSON.stringify(input), env: { ...base, ...env }, encoding: 'utf8' });
  };
  const answer = (out) => {
    const f = path.join(out, 'answer.txt');
    fs.writeFileSync(f, 'ANSWER');
    return ['--respond', f, '--exit', '2'];
  };

  test("--first-only answers on the label's first firing only, counted by label, not by text", () => {
    const out = fresh('cap');
    // An earlier firing of another label whose payload carries the label's text.
    assert.equal(fire(out, 'other', [], { label: 'stop', note: '"label":"stop"' }).status, 0);
    const first = fire(out, 'stop', ['--first-only', ...answer(out)]);
    assert.equal(first.stdout, 'ANSWER');
    assert.equal(first.status, 2);
    const second = fire(out, 'stop', ['--first-only', ...answer(out)]);
    assert.equal(second.stdout, '');
    assert.equal(second.status, 0);
    assert.equal(fire(out, 'pre', ['--first-only', ...answer(out)]).stdout, 'ANSWER', "another label's first firing still answers");
    assert.deepEqual(readCaptures(out).map((c) => c.label), ['other', 'stop', 'stop', 'pre']);
  });

  test('without --first-only every firing answers', () => {
    const out = fresh('cap');
    for (let i = 0; i < 2; i++) assert.equal(fire(out, 'stop', answer(out)).stdout, 'ANSWER');
  });

  test('--when-inactive answers only while stop_hook_active is not true', () => {
    const out = fresh('cap');
    assert.equal(fire(out, 'stop', ['--when-inactive', ...answer(out)], { stop_hook_active: false }).status, 2);
    const active = fire(out, 'stop', ['--when-inactive', ...answer(out)], { stop_hook_active: true });
    assert.equal(active.stdout, '');
    assert.equal(active.status, 0);
    assert.equal(readCaptures(out).length, 2, 'every firing is captured, answered or not');
  });

  test('without PROBE_OUT it writes nothing and exits 0, whatever it was asked to answer', () => {
    const out = fresh('cap');
    const r = fire(out, 'stop', answer(out), {}, {});
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    assert.ok(!fs.existsSync(path.join(out, 'captures.jsonl')));
  });
});

describe('scrub', () => {
  test('a Windows home in every spelling becomes ~; another profile becomes <profile>', () => {
    const home = winHome();
    const s = scrubber({ home });
    assert.equal(s(`${home}\\AppData\\x`), '~\\AppData\\x');
    assert.equal(s(`${fwd(home)}/.claude`), '~/.claude');
    assert.equal(s(`c${fwd(home).slice(1)}/y`), '~/y');
    assert.equal(s('/c/' + 'Users' + '/someone/z'), '~/z');
    assert.deepEqual(JSON.parse(s(JSON.stringify({ p: `${home}\\x\\"q`, list: [home] }))), { p: '~\\x\\"q', list: ['~'] });
    assert.equal(s(`${home}s\\y`), '<profile>\\y', 'a longer name is a different profile');
    assert.equal(s(['D:', 'Users', 'else', 'f'].join('/')), '<profile>/f');
    assert.equal(s('/d/' + 'Users' + '/else/g'), '<profile>/g');
    const slug = (p) => fwd(p).replace(/[^A-Za-z0-9]/g, '-');
    assert.equal(s(`projects\\${slug(home)}-AppData-Local-Temp-x\\a.jsonl`), 'projects\\~-AppData-Local-Temp-x\\a.jsonl', 'the folder-name form of the home');
    assert.equal(s(`c${slug(home).slice(1)}-proj`), '~-proj');
    assert.equal(s(`${slug(home)}s-proj`), '<profile>-proj', 'a longer name in folder-name form is a different profile');
    assert.equal(s(`${slug(winHome('else'))}-proj`), '<profile>-proj');
    assert.equal(s('/mnt/c/' + 'Users' + '/else/g'), '<profile>/g', 'a WSL path');
    assert.equal(s(`x${winHome('else')}\\f`), 'x<profile>\\f', 'a drive form glued to a letter');
    assert.equal(JSON.parse(s(JSON.stringify(`ran\n${winHome('else')}\\f`))), 'ran\n<profile>\\f', "a path after a JSON-escaped newline, glued to its 'n'");
    assert.equal(JSON.parse(s(JSON.stringify('ran\t/d/' + 'Users' + '/else/g'))), 'ran\t<profile>/g', "an msys path after a JSON-escaped tab, glued to its 't'");
  });

  test('ids become aliases, the same one each time an id recurs', () => {
    const s = scrubber({ home: winHome() });
    const a = randomUUID();
    const b = randomUUID();
    assert.equal(s(`${a} ${b} ${a.toUpperCase()} run_${a}`), '<id-1> <id-2> <id-1> run_<id-1>');
    assert.equal(s(`then ${b}`), 'then <id-2>');
    assert.equal(s(`${'tool' + 'u_01'}${'A'.repeat(22)} ${'ms' + 'g_01'}${'B'.repeat(22)}`), '<toolu-1> <msg-1>');
    assert.equal(scrubber({ home: winHome() })(b), '<id-1>', 'a new scrubber numbers from 1');
  });

  test('a POSIX home becomes ~ only where it starts a path', () => {
    const s = scrubber({ home: '/home/someone' });
    assert.equal(s('/home/someone/x and /home/someone'), '~/x and ~');
    assert.equal(s('/mnt/home/someone/x'), '/mnt/home/someone/x');
    assert.equal(s('/home/someoneelse/x'), '/home/someoneelse/x');
  });

  test("its output passes the leak scan's id, path and API-id rules", () => {
    const id = randomUUID();
    const rules = RULES.filter((r) => r.id !== 'transcript-field');
    for (const home of [winHome(), os.homedir()]) {
      const text = [
        `${home}\\AppData\\Local\\Temp\\claude-probe-q1-x\\captures.jsonl`,
        JSON.stringify({ transcript_path: `${home}\\.claude\\projects\\p\\${id}.jsonl` }),
        `${fwd(home)}/.claude`, `/c/${'Users'}/someone/w`, winHome('other'), `probe_${id}`, `sess${'ion'}_01${'C'.repeat(24)}`,
        `projects/${fwd(home).replace(/[^A-Za-z0-9]/g, '-')}-AppData-Local-Temp-claude-probe-q9-x/a.jsonl`,
        `projects/${fwd(winHome('other')).replace(/[^A-Za-z0-9]/g, '-')}-proj/b.jsonl`,
        JSON.stringify(`ran\n${home}\\x`), JSON.stringify(`ran\n${winHome('other')}\\x`), JSON.stringify(`ran\t/c/${'Users'}/someone/v`),
        `/mnt/c/${'Users'}/someone/w`, `x${winHome('other')}\\y`,
      ].join('\n');
      const out = scrubber({ home })(text);
      for (const line of out.split('\n')) for (const r of rules) assert.ok(!r.re.test(line), `${r.id} still matches: ${line}`);
    }
  });
});

describe('lib isolation', () => {
  test('claudeMdExcludes names ~/.claude/CLAUDE.md and ~/.claude/rules in each spelling, and nothing else', () => {
    const home = winHome();
    const low = `c${home.slice(1)}`;
    assert.deepEqual(claudeMdExcludes(home).sort(), [
      `${fwd(home)}/.claude/CLAUDE.md`, `${fwd(home)}/.claude/rules/**`, `${home}\\.claude\\CLAUDE.md`,
      `${fwd(low)}/.claude/CLAUDE.md`, `${fwd(low)}/.claude/rules/**`, `${low}\\.claude\\CLAUDE.md`,
    ].sort());
    assert.deepEqual(claudeMdExcludes('/home/someone'), ['/home/someone/.claude/CLAUDE.md', '/home/someone/.claude/rules/**']);
  });

  test('every launch carries a settings file with the excludes and inbound messages refused; one a def wrote is merged in place', () => {
    const out = fresh('settings');
    const f = writeSettings(out);
    assert.deepEqual(JSON.parse(fs.readFileSync(f, 'utf8')), { crossSessionInbound: 'refuse', claudeMdExcludes: claudeMdExcludes() });
    assert.deepEqual(baseArgs({ settingsFile: f }), ['--strict-mcp-config', '--setting-sources', 'project,local', '--settings', fwd(f)]);
    const own = path.join(out, 'own.json');
    fs.writeFileSync(own, JSON.stringify({ hooks: { Stop: [] }, claudeMdExcludes: ['**/vendor/**/CLAUDE.md'] }));
    assert.deepEqual(baseArgs({ sources: null, settingsFile: own }), ['--strict-mcp-config', '--settings', fwd(own)]);
    assert.deepEqual(JSON.parse(fs.readFileSync(own, 'utf8')), { crossSessionInbound: 'refuse', hooks: { Stop: [] }, claudeMdExcludes: ['**/vendor/**/CLAUDE.md', ...claudeMdExcludes()] });
    assert.deepEqual(baseArgs({ sources: 'user,project,local', settingsFile: writeSettings(out, null) }).slice(1, 3), ['--setting-sources', 'user,project,local']);
    assert.throws(() => baseArgs({}), /settings file/);
  });

  test("a def's own crossSessionInbound stands; a def-written file is rewritten whenever the merge changes it, and only then", () => {
    const out = fresh('settings');
    assert.equal(JSON.parse(fs.readFileSync(writeSettings(out, { crossSessionInbound: 'hold' }), 'utf8')).crossSessionInbound, 'hold');
    // Every exclude already listed: only the inbound key is missing.
    const own = path.join(out, 'own.json');
    fs.writeFileSync(own, JSON.stringify({ claudeMdExcludes: claudeMdExcludes() }));
    baseArgs({ settingsFile: own });
    assert.deepEqual(JSON.parse(fs.readFileSync(own, 'utf8')), { crossSessionInbound: 'refuse', claudeMdExcludes: claudeMdExcludes() });
    // A file the merge leaves equal keeps its bytes, however it is laid out.
    const merged = JSON.stringify({ crossSessionInbound: 'accept', claudeMdExcludes: claudeMdExcludes() });
    fs.writeFileSync(own, merged);
    baseArgs({ settingsFile: own });
    assert.equal(fs.readFileSync(own, 'utf8'), merged);
  });

  test('cleanEnv also drops AI_AGENT, every secret-shaped name, the gateway pair and the other-credential names, and keeps what the CLI needs to run and sign in', () => {
    // The gateway pair and the other-credential names end in no key suffix,
    // so only SECRET_ENV's own names can drop them.
    const dropped = [
      'AI_AGENT', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_CUSTOM_HEADERS',
      'ANTHROPIC_PROFILE', 'ANTHROPIC_FEDERATION_RULE_ID', 'ANTHROPIC_ORGANIZATION_ID', 'ANTHROPIC_WORKSPACE_ID',
      'OPENAI_API_KEY', 'CLOUDFLARE_API_TOKEN', 'PROBE_TEST_SECRET', 'probe_test_token',
      'AWS_SECRET_ACCESS_KEY', 'AWS_BEARER_TOKEN_BEDROCK', 'PROBE_SECRET_KEY', 'PROBE_PRIVATE_KEY', 'DB_PASSWORD',
      'PROBE_DB_PASS', 'PROBE_PWD', 'GOOGLE_APPLICATION_CREDENTIALS', 'DATABASE_URL',
    ];
    // Names a secret suffix must not catch: git's and ssh's askpass helpers
    // (no underscore before PASS) and the proxy and CA variables the CLI needs.
    const kept = ['PATH', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'SystemRoot', 'GIT_ASKPASS', 'SSH_ASKPASS', 'HTTPS_PROXY', 'NODE_EXTRA_CA_CERTS'];
    // Windows reads environment names case-blind; cleanEnv's object keeps
    // each name as the process spells it (Path, say).
    const named = (env, k) => Object.keys(env).find((x) => x.toUpperCase() === k.toUpperCase());
    // Linux has no USERPROFILE or SystemRoot: those get planted for the test.
    const planted = {
      ...Object.fromEntries(dropped.map((k) => [k, 'planted'])),
      ...Object.fromEntries(kept.filter((k) => !named(process.env, k)).map((k) => [k, `planted-${k}`])),
      PROBE_TOKENS_KEPT: '1',
    };
    const saved = Object.fromEntries(Object.keys(planted).map((k) => [k, process.env[k]]));
    Object.assign(process.env, planted);
    try {
      const c = cleanEnv({ PROBE_OUT: 'o', EXTRA_API_KEY: 'the caller passed it' });
      assert.deepEqual(dropped.filter((k) => named(c, k)), []);
      for (const k of kept) assert.equal(c[named(c, k)], process.env[k], k);
      assert.equal(c.PROBE_TOKENS_KEPT, '1', 'only a name ending in _TOKEN goes');
      assert.equal(c.EXTRA_API_KEY, 'the caller passed it', "the caller's own variables are kept as given");
    } finally {
      for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  });

  test('gitEnv drops the git location variables; cleanEnv drops them and every CLAUDE* one', () => {
    const planted = { GIT_DIR: 'x', GIT_INDEX_FILE: 'y', GIT_WORK_TREE: 'z', GIT_LITERAL_PATHSPECS: '1', CLAUDE_CODE_PROBE_TEST: '1', PROBE_KEEP: '1' };
    const saved = Object.fromEntries(Object.keys(planted).map((k) => [k, process.env[k]]));
    Object.assign(process.env, planted);
    try {
      const g = gitEnv({ EXTRA: '1' });
      for (const k of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE', 'GIT_LITERAL_PATHSPECS']) assert.equal(g[k], undefined, k);
      assert.equal(g.PROBE_KEEP, '1');
      assert.equal(g.EXTRA, '1');
      const c = cleanEnv({ PROBE_OUT: 'o' });
      assert.deepEqual(Object.keys(c).filter((k) => /^(GIT_DIR|GIT_INDEX_FILE|GIT_WORK_TREE|GIT_LITERAL_PATHSPECS|CLAUDE)/i.test(k)), []);
      assert.equal(c.PROBE_KEEP, '1');
      assert.equal(c.PROBE_OUT, 'o');
    } finally {
      for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  });

  test('readCaptures skips a torn last line, but a bad line before it throws', () => {
    const out = fresh('caps');
    const f = path.join(out, 'captures.jsonl');
    fs.writeFileSync(f, '{"label":"a"}\n{"label":"b"}\n{"label":"c","inp');
    assert.deepEqual(readCaptures(out).map((c) => c.label), ['a', 'b']);
    fs.writeFileSync(f, '{"label":"a"}\n{"lab\n{"label":"c"}\n');
    assert.throws(() => readCaptures(out), SyntaxError);
  });

  test('gitView tells a folder outside any repo from one a repo ignores or sees', () => {
    const repo = fresh('repo');
    const init = spawnSync('git', ['init', '-q', repo], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
    assert.equal(init.status, 0, init.stderr);
    fs.writeFileSync(path.join(repo, '.gitignore'), 'private/\n');
    assert.equal(gitView(path.join(repo, 'pub', 'run')), 'visible');
    assert.equal(gitView(path.join(repo, 'private', 'run')), 'ignored');
    const outside = path.join(fresh('plain'), 'run');
    const top = spawnSync('git', ['-C', path.dirname(outside), 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
    if (top.stdout.trim() !== 'true') assert.equal(gitView(outside), 'outside');
  });

  test('gitView reads a name-only ignore pattern as visible: it hides results.json, never the captures beside it', () => {
    const repo = fresh('repo');
    const init = spawnSync('git', ['init', '-q', repo], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
    assert.equal(init.status, 0, init.stderr);
    for (const pattern of ['results.json', '*.json', 'results.json\n*.jsonl']) {
      fs.writeFileSync(path.join(repo, '.gitignore'), `${pattern}\n`);
      assert.equal(gitView(path.join(repo, 'runs', 'r1')), 'visible', pattern);
    }
    for (const pattern of ['runs/', 'runs/*', '*']) {
      fs.writeFileSync(path.join(repo, '.gitignore'), `${pattern}\n`);
      assert.equal(gitView(path.join(repo, 'runs', 'r1')), 'ignored', pattern);
    }
  });

  test('gitView fails closed where git cannot tell: a .git file naming a gone gitdir, a folder inside a .git dir', () => {
    const bogus = fresh('bogus');
    fs.writeFileSync(path.join(bogus, '.git'), 'gitdir: nowhere\n');
    assert.throws(() => gitView(path.join(bogus, 'run')), /git could not tell whether .* is in a work tree \(exit \d+\)/);
    const repo = fresh('repo');
    const init = spawnSync('git', ['init', '-q', repo], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
    assert.equal(init.status, 0, init.stderr);
    assert.throws(() => gitView(path.join(repo, '.git', 'run')), /inside a git directory/);
  });

  test('failure() names why a run failed, first match wins, and is null for a clean result', () => {
    const ok = { type: 'result', is_error: false };
    assert.equal(failure({ timedOut: true, status: 1, json: { type: 'result', is_error: true, subtype: 'x' } }), 'timed out');
    assert.equal(failure({ timedOut: false, status: 1, json: null }), 'exited 1 with no result');
    assert.equal(failure({ timedOut: false, status: null, json: { type: 'system' } }), 'exited null with no result');
    assert.equal(failure({ timedOut: false, status: 1, json: { type: 'result', is_error: true, subtype: 'error_max_turns' } }), 'ended on an error result (error_max_turns)');
    assert.equal(failure({ timedOut: false, status: 2, json: ok }), 'exited 2');
    assert.equal(failure({ timedOut: false, status: 0, json: ok }), null);
  });
});

// The specifiers a module's static imports and re-exports name (import ...
// from '...', import '...', export ... from '...'), counting only statements
// that start a line: q09's import() inside a hook-script string is no import
// of its own. An import statement this can't read fails, never passes unread.
const STATIC_IMPORT = /^[ \t]*(?:import\s*(?:[\w$*{}\s,]+?\s*from\s*)?|export\s*(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*)(['"])([^'"\n]+)\1/gm;
function staticImports(src, name) {
  const found = [...src.matchAll(STATIC_IMPORT)];
  const starts = new Set(found.map((m) => m.index));
  for (const m of src.matchAll(/^[ \t]*import\b(?!\s*[(.])/gm)) assert.ok(starts.has(m.index), `${name}: an import at offset ${m.index} this test can't read`);
  return found.map((m) => m[2]);
}

// The loads the reader above never sees: an import() of a quoted name, a
// createRequire, a new URL(..., import.meta.url). Any of them in a def,
// lib.mjs or capture.mjs could reach a file the verdict hash skips, so each
// fails the guard wherever it sits, code, string or comment. q09's
// import(${...}) is code it writes out for a hook, inside a template string,
// and its argument is no quoted name.
const DYNAMIC_LOAD = /\bimport\s*\(\s*['"`]|\bcreateRequire\b|\bnew\s+URL\s*\([^;]*?,\s*import\.meta\.url\b/g;
const dynamicLoads = (src) => [...src.matchAll(DYNAMIC_LOAD)].map((m) => m[0]);

describe('the verdict hash covers every file a probe runs', () => {
  test('the import reader takes static imports and re-exports, never an import() in code or a string', () => {
    const sample = [
      "import fs from 'node:fs';",
      'import {',
      '  a,',
      '  b,',
      "} from '../lib.mjs';",
      "import './side.mjs';",
      "export * from './star.mjs';",
      "export { c } from './named.mjs';",
      'export { d };',
      "import('./top-level-dynamic.mjs');",
      "export default { id: 'Q9', run: async () => import('./dynamic.mjs') };",
      "const s = `x\\nawait import(${JSON.stringify('./in-string.mjs')});\\n`;",
      "// import nothing from './comment.mjs'",
    ].join('\n');
    assert.deepEqual(staticImports(sample, 'sample'), ['node:fs', '../lib.mjs', './side.mjs', './star.mjs', './named.mjs']);
    assert.throws(() => staticImports("import /* why */ x from './x.mjs';", 'odd'), /can't read/);
  });

  test('the load guard catches import() of a quoted name, createRequire and new URL(..., import.meta.url), and passes a computed import', () => {
    const caught = [
      ["const m = await import('./shared.mjs');", "import('"],
      ['const m = await import ( "./shared.mjs" );', 'import ( "'],
      ['const m = await import(`./shared.mjs`);', 'import(`'],
      ['export default { run: async () => (await import("./shared.mjs")).run() };', 'import("'],
      ["const require = createRequire(import.meta.url);\nrequire('./x.cjs');", 'createRequire'],
      ["import { createRequire } from 'node:module';", 'createRequire'],
      ["const raw = fs.readFileSync(new URL('./x.json', import.meta.url), 'utf8');", "new URL('./x.json', import.meta.url"],
      ['const u = new URL(name,\n  import.meta.url);', 'new URL(name,\n  import.meta.url'],
    ];
    for (const [src, hit] of caught) assert.deepEqual(dynamicLoads(src), [hit], src);
    const passed = [
      // q09's hook script: the import sits in a template string and names no file here.
      "const s = (label) => `x\\nawait import(${JSON.stringify(pathToFileURL(CAPTURE).href)});\\n`;",
      'const HERE = path.dirname(fileURLToPath(import.meta.url));',
      'const def = (await import(pathToFileURL(file).href)).default;',
      "const u = new URL('https://example.invalid/x'); f(a, import.meta.url);",
      "// imports ('./x.mjs') and requires nothing",
    ];
    for (const src of passed) assert.deepEqual(dynamicLoads(src), [], src);
  });

  test('a def imports only ../lib.mjs and node: builtins; lib.mjs and capture.mjs only node: builtins; none of them loads a file any other way', () => {
    const defs = fs.readdirSync(DEFS, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
    assert.ok(defs.length >= EXPECTED.length, `only ${defs.length} files in ${DEFS}`);
    for (const f of defs) {
      const src = fs.readFileSync(path.join(DEFS, f), 'utf8');
      const other = staticImports(src, f).filter((s) => s !== '../lib.mjs' && !s.startsWith('node:'));
      assert.deepEqual(other, [], `${f} imports a file the verdict hash does not cover`);
      assert.deepEqual(dynamicLoads(src), [], `${f} loads a file the verdict hash may not cover`);
    }
    for (const f of [path.join(HERE, 'lib.mjs'), CAPTURE]) {
      const src = fs.readFileSync(f, 'utf8');
      const specs = staticImports(src, path.basename(f));
      assert.ok(specs.includes('node:fs'), `${path.basename(f)}: the reader found no imports`);
      assert.deepEqual(specs.filter((s) => !s.startsWith('node:')), [], `${path.basename(f)} imports a file the verdict hash does not cover`);
      assert.deepEqual(dynamicLoads(src), [], `${path.basename(f)} loads a file the verdict hash may not cover`);
    }
  });
});

// A ceiling that never fires would hang these, so each fails at 10 s instead.
describe('the per-probe ceiling', () => {
  test('a probe that never settles comes back expired at the ceiling; one that settles keeps its value or its error', { timeout: 10_000 }, async () => {
    assert.equal(PROBE_CEILING_MS, 45 * 60_000);
    const t0 = Date.now();
    assert.deepEqual(await withCeiling(new Promise(() => {}), 50), { expired: true });
    assert.ok(Date.now() - t0 >= 40, `expired after ${Date.now() - t0} ms`);
    assert.deepEqual(await withCeiling(Promise.resolve({ verdict: 'VERIFIED' }), 5_000), { value: { verdict: 'VERIFIED' } });
    assert.deepEqual(await withCeiling('not a promise', 5_000), { value: 'not a promise' });
    await assert.rejects(withCeiling(Promise.reject(new Error('boom')), 5_000), /boom/);
  });

  test('a probe that fails after its ceiling leaves no unhandled rejection to crash the runner', { timeout: 10_000 }, async () => {
    const unhandled = [];
    const onUnhandled = (e) => unhandled.push(e);
    process.on('unhandledRejection', onUnhandled);
    try {
      assert.deepEqual(await withCeiling(sleep(100).then(() => { throw new Error('late'); }), 20), { expired: true });
      await sleep(250);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    assert.deepEqual(unhandled, []);
  });
});

describe('what a probe past its ceiling leaves running is ended before the next one', () => {
  const cim = (pid, ppid, name, startMs) => ({ ProcessId: pid, ParentProcessId: ppid, Name: name, StartMs: startMs });

  test("parseCimProcesses reads ConvertTo-Json's three shapes, one object, an array, nothing, and throws on anything else", () => {
    assert.deepEqual(parseCimProcesses(''), []);
    assert.deepEqual(parseCimProcesses('\r\n'), []);
    assert.deepEqual(parseCimProcesses(`${JSON.stringify(cim(10, 1, 'claude.exe', 5))}\r\n`), [{ pid: 10, ppid: 1, name: 'claude.exe', startMs: 5 }]);
    assert.deepEqual(parseCimProcesses(JSON.stringify([cim(10, 1, 'claude.exe', 5), cim(11, 1, 'node.exe', null), { ProcessId: '12', ParentProcessId: 1 }])), [
      { pid: 10, ppid: 1, name: 'claude.exe', startMs: 5 },
      { pid: 11, ppid: 1, name: 'node.exe', startMs: null },
    ]);
    assert.throws(() => parseCimProcesses('Get-CimInstance : Access denied'), SyntaxError);
  });

  test('parsePsProcesses reads ps lines, a name with a space included, and skips what is no row', () => {
    assert.deepEqual(parsePsProcesses('    1     0 init\n  200     1 node\n  201   200 Google Chrome \nnot a row\n\n'), [
      { pid: 1, ppid: 0, name: 'init', startMs: null },
      { pid: 200, ppid: 1, name: 'node', startMs: null },
      { pid: 201, ppid: 200, name: 'Google Chrome', startMs: null },
    ]);
  });

  const pidsOf = ({ children, undated }) => ({ children: children.map((p) => p.pid), undated: undated.map((p) => p.pid) });

  test("childrenOf keeps the parent's own children: never the lister, a console host, another parent's child or an orphan older than the runner", () => {
    const procs = [
      { pid: 10, ppid: 1, name: 'claude.exe', startMs: 500 },
      { pid: 11, ppid: 1, name: 'node', startMs: null },
      { pid: 12, ppid: 1, name: 'powershell.exe', startMs: 600 },
      { pid: 13, ppid: 1, name: 'conhost.exe', startMs: 500 },
      { pid: 14, ppid: 1, name: 'Code.exe', startMs: 99 },
      { pid: 15, ppid: 10, name: 'node.exe', startMs: 700 },
      { pid: 16, ppid: 1, name: 'node.exe', startMs: 100 },
    ];
    // A listing that dates no row (ps): an undated row is a child there.
    assert.deepEqual(pidsOf(childrenOf(procs, { parent: 1, since: 100, skip: [12], dated: false })), { children: [10, 11, 16], undated: [] });
    assert.deepEqual(pidsOf(childrenOf(procs, { parent: 10, since: 100, dated: false })), { children: [15], undated: [] });
    assert.deepEqual(childrenOf(procs, { parent: 2 }), { children: [], undated: [] });
  });

  // Windows keeps a dead parent's pid on its orphans; an orphan's creation
  // time is what shows its parent id predates this runner holding that pid.
  test('on a dated listing, a child Windows gave no creation time is named and left running, never ended', () => {
    // powershell prints StartMs null for a CreationDate it can't convert; a
    // row with no StartMs at all reads the same. 23 is an orphan from before
    // the runner started.
    const text = JSON.stringify([cim(20, 7, 'claude.exe', 500), cim(21, 7, 'node.exe', null), { ProcessId: 22, ParentProcessId: 7, Name: 'bash.exe' }, cim(23, 7, 'Code.exe', 99)]);
    const found = childrenOf(parseCimProcesses(text), { parent: 7, since: 100 });
    assert.deepEqual(pidsOf(found), { children: [20], undated: [21, 22] }, 'a listing reads as dated unless its caller says otherwise');
    const tried = [];
    const rows = endEach(found, (p) => { tried.push(p.pid); return true; });
    assert.deepEqual(tried, [20], 'only a dated child is ever ended');
    assert.deepEqual(rows.map(({ pid, ended, left }) => [pid, ended, typeof left]), [[20, true, 'undefined'], [21, false, 'string'], [22, false, 'string']]);
    const said = leftoversSaid(rows);
    assert.match(said, /claude\.exe pid 20 ended/);
    for (const pid of [21, 22]) assert.match(said, new RegExp(`pid ${pid} left running \\(the listing gave no creation time, so its parent id may be one an earlier process held\\)`), said);
  });

  test('leftoversSaid names each child endChildren found and what became of it, or that there was none', () => {
    assert.equal(leftoversSaid([]), 'no child process of this runner was still running');
    assert.equal(
      leftoversSaid([{ pid: 5, name: 'claude.exe', ended: true }, { pid: 6, name: 'node.exe', ended: false }]),
      "this runner's child processes: claude.exe pid 5 ended; node.exe pid 6 could not be ended",
    );
  });

  test('treeOf walks a child and everything under it, parents first, and a cycle in a stale listing ends', () => {
    const procs = [[2, 1], [3, 2], [4, 2], [5, 3], [6, 1], [7, 8], [8, 7]].map(([pid, ppid]) => ({ pid, ppid, name: 'x', startMs: null }));
    assert.deepEqual(treeOf(procs, 2), [2, 3, 4, 5]);
    assert.deepEqual(treeOf(procs, 6), [6]);
    assert.deepEqual(treeOf(procs, 7), [7, 8]);
  });

  // Each value names no process, so a regression that let one through would
  // end nothing (never 0: ps lists init as its child).
  test('endChildren takes only a process id as the parent, which it writes into a PowerShell command', () => {
    for (const parent of ['1; Remove-Item x', -1, 1.5, null]) assert.throws(() => endChildren({ parent }), /needs a process id/, String(parent));
  });

  // endChildren ends every child of the process that calls it, so it runs in
  // a helper of its own: what it may end is the helper's child and that
  // child's child, both sleepers this test started that exit by themselves
  // after 60 s if it fails. The grandchild is detached: on Windows a node
  // parent's job object would otherwise end it along with its parent, and
  // only a walk of the tree (taskkill /T, treeOf) reaches it the way it must
  // reach claude.exe's hook and Bash children.
  test("endChildren ends a child of its process, tree and all, through the platform's real listing", { timeout: 60_000 }, () => {
    const helper = path.join(fresh('end-children'), 'helper.mjs');
    fs.writeFileSync(helper, [
      "import { spawn } from 'node:child_process';",
      "import fs from 'node:fs';",
      `import { endChildren } from ${JSON.stringify(pathToFileURL(path.join(HERE, 'run.mjs')).href)};`,
      "const sleeper = 'setTimeout(() => {}, 60000);';",
      "const parentCode = `const { spawn } = require('node:child_process'); const g = spawn(process.execPath, ['-e', ${JSON.stringify(sleeper)}], { stdio: 'ignore', windowsHide: true, detached: true }); console.log(g.pid); ${sleeper}`;",
      "const kid = spawn(process.execPath, ['-e', parentCode], { stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true });",
      "const grandchild = await new Promise((resolve) => kid.stdout.once('data', (d) => resolve(Number(String(d).trim()))));",
      'const ended = endChildren();',
      // A killed process waiting to be reaped (Linux state Z) is gone too.
      "const zombie = (pid) => { try { return /\\) Z /.test(fs.readFileSync(`/proc/${pid}/stat`, 'utf8')); } catch { return false; } };",
      'const alive = (pid) => { try { process.kill(pid, 0); } catch { return false; } return !zombie(pid); };',
      'const t0 = Date.now();',
      'while ((alive(kid.pid) || alive(grandchild)) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 200));',
      'console.log(JSON.stringify({ kid: kid.pid, grandchild, ended, kidAlive: alive(kid.pid), grandchildAlive: alive(grandchild) }));',
      'process.exit(0);',
    ].join('\n'));
    const r = spawnSync(process.execPath, [helper], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 50_000 });
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout.trim().split('\n').at(-1));
    // Its one child, never the lister it ran to find it.
    assert.deepEqual(got.ended.map((c) => c.pid), [got.kid], JSON.stringify(got.ended));
    assert.equal(got.ended[0].ended, true, JSON.stringify(got.ended));
    assert.match(got.ended[0].name, process.platform === 'win32' ? /^node\.exe$/i : /\S/);
    assert.deepEqual([got.kidAlive, got.grandchildAlive], [false, false]);
  });
});

describe('run.mjs and report.mjs run their main only when node runs them', () => {
  const node = (args) => spawnSync(process.execPath, args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });

  // --bogus stops either main at its argument parser, before anything runs.
  test('launched directly, each one parses its arguments', () => {
    for (const f of ['run.mjs', 'report.mjs']) {
      const r = node([path.join(HERE, f), '--bogus']);
      assert.equal(r.status, 1, `${f}: ${r.stderr}`);
      assert.match(r.stderr, /unknown argument --bogus/, f);
    }
  });

  test('imported, neither one does', () => {
    const urls = ['run.mjs', 'report.mjs'].map((f) => pathToFileURL(path.join(HERE, f)).href);
    const code = `const [run, report] = await Promise.all(${JSON.stringify(urls)}.map((u) => import(u)));\nconsole.log(typeof run.passedOn, typeof run.passCheck, typeof report.writeReport);`;
    // Under -e, argv[1] is the first word after `--`, so main would read the second.
    const r = node(['--input-type=module', '-e', code, '--', '--bogus', '--bogus']);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'function function function');
    assert.doesNotMatch(r.stderr, /unknown argument/);
  });
});

describe('the passes.json lock', () => {
  test('holders take turns, and the last one out leaves no lock', async () => {
    const target = path.join(fresh('lock'), 'passes.json');
    const order = [];
    await Promise.all([1, 2, 3].map((n) => withLock(target, async () => {
      order.push(`in ${n}`);
      await sleep(30);
      order.push(`out ${n}`);
    })));
    for (let i = 0; i < order.length; i += 2) assert.equal(order[i].replace('in', 'out'), order[i + 1], `two holders at once: ${order}`);
    assert.ok(!fs.existsSync(`${target}.lock`));
  });

  test("a crashed owner's lock is broken once stale; a live one is waited out, then the wait gives up", async () => {
    const target = path.join(fresh('lock'), 'passes.json');
    const lock = `${target}.lock`;
    fs.writeFileSync(lock, 'dead-owner');
    const old = new Date(Date.now() - 3_600_000);
    fs.utimesSync(lock, old, old);
    assert.equal(await withLock(target, () => 'ran', { staleMs: 1000, waitMs: 5000 }), 'ran');
    assert.ok(!fs.existsSync(lock));
    fs.writeFileSync(lock, 'live-owner');
    await assert.rejects(withLock(target, () => 'ran', { staleMs: 60_000, waitMs: 300 }), /held for over/);
    assert.equal(fs.readFileSync(lock, 'utf8'), 'live-owner', 'a waiter removed a live lock');
  });

  test('release removes only its own lock', async () => {
    const target = path.join(fresh('lock'), 'passes.json');
    await withLock(target, () => fs.writeFileSync(`${target}.lock`, 'someone-else'));
    assert.equal(fs.readFileSync(`${target}.lock`, 'utf8'), 'someone-else');
  });
});

describe('report.mjs', () => {
  let root;
  let defs;
  let run;
  before(async () => {
    root = fresh('report');
    defs = plantDefs();
    run = path.join(root, '1.0.0', 'stamp');
    const r = (id) => ({ id, verdict: 'VERIFIED', hash: probeHash(defOf(defs, id)) });
    await writePasses('1.0.0', run, LOAD_BEARING.map(r), { root, defs });
    for (const id of LOAD_BEARING.filter((x) => x !== 'Q2')) {
      fs.mkdirSync(path.join(run, id), { recursive: true });
      fs.writeFileSync(path.join(run, id, 'result.json'), JSON.stringify({ id, question: `${id} question?`, assumption: 'a', verdict: 'VERIFIED', summary: `seen at ${fwd(os.homedir())}/x`, evidence: ['e1'], version: '1.0.0', ms: 2000 }));
    }
    fs.appendFileSync(defOf(defs, 'Q3'), '// edited after the run\n');
  });

  test('rewrites only the generated block, and marks a missing result and a stale def', async () => {
    const doc = path.join(root, 'probes.md');
    const head = '# Mine\n\nhand intro\n\n';
    const tail = '\n\n## Recorded by hand\n\nkept\n';
    fs.writeFileSync(doc, `${head}${BEGIN}\nold block\n${END}${tail}`);
    const notes = path.join(root, 'my-notes.json');
    fs.writeFileSync(notes, JSON.stringify({ Q1: 'note one' }));
    const res = await writeReport({ root, defs, doc, notesFile: notes });
    const text = fs.readFileSync(doc, 'utf8');
    assert.ok(text.startsWith(`${head}${BEGIN}\n`), 'the hand-written head changed');
    assert.ok(text.endsWith(`${END}${tail}`), 'the hand-written tail changed');
    assert.ok(!text.includes('old block'));
    assert.match(text, /^\| Q1 \| VERIFIED \| yes \| Q1 question\? \|$/m);
    assert.match(text, /^\| Q2 \| VERIFIED — RESULT MISSING/m);
    assert.match(text, /^\| Q3 \| VERIFIED — STALE/m);
    assert.match(text, /^\| Q0 \| not run \| no \|/m);
    assert.match(text, /Passes now: \*\*no\*\* \(Q3 def changed since its verdict\) \(passes\.json filed it as passed/);
    assert.match(text, /What it means for the design:\*\* note one/);
    assert.match(text, /Finding:\*\* seen at ~\/x/);
    assert.equal(res.marked, 2);
    assert.ok(!fs.existsSync(path.join(root, 'passes.json.lock')));
  });

  test('a document with no block is refused and left as it was', async () => {
    const doc = path.join(root, 'hand.md');
    fs.writeFileSync(doc, 'hand only\n');
    await assert.rejects(writeReport({ root, defs, doc }), /no generated block/);
    assert.equal(fs.readFileSync(doc, 'utf8'), 'hand only\n');
    fs.writeFileSync(doc, `${END}\n${BEGIN}\n`);
    await assert.rejects(writeReport({ root, defs, doc }), /out of order/);
  });

  test('a new document gets the header around the block', async () => {
    const doc = path.join(root, 'new', 'probes.md');
    await writeReport({ root, defs, doc });
    const text = fs.readFileSync(doc, 'utf8');
    assert.match(text, /^# Our-setup platform probes \(U2\)/);
    assert.ok(text.indexOf(BEGIN) < text.indexOf('## CLI 1.0.0') && text.indexOf('## CLI 1.0.0') < text.indexOf(END));
  });

  // The CLI reads the real passes.json root, so each launch also names a
  // --notes file that doesn't exist: a launch the guard lets through stops
  // there (or at a missing passes.json, on CI) before it writes anything.
  test('the CLI refuses an explicit --doc inside a git work tree before writing it; one outside every repo gets past the check', () => {
    const report = (doc, notes) => spawnSync(process.execPath, [path.join(HERE, 'report.mjs'), '--doc', doc, '--notes', notes], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });
    const repo = fresh('repo');
    const init = spawnSync('git', ['init', '-q', repo], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
    assert.equal(init.status, 0, init.stderr);
    for (const doc of [path.join(repo, 'probes.md'), path.join(repo, 'docs', 'new', 'probes.md')]) {
      const r = report(doc, path.join(repo, 'no-such-notes.json'));
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /--doc .* is inside a git work tree/);
      assert.ok(!fs.existsSync(doc), `${doc} was written`);
    }
    const plain = fresh('plain');
    const top = spawnSync('git', ['-C', plain, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
    if (top.stdout.trim() !== 'true') {
      const r = report(path.join(plain, 'probes.md'), path.join(plain, 'no-such-notes.json'));
      assert.equal(r.status, 1, r.stderr);
      assert.doesNotMatch(r.stderr, /inside a git work tree/);
      assert.match(r.stderr, /no-such-notes\.json|no passes\.json/);
      assert.ok(!fs.existsSync(path.join(plain, 'probes.md')));
    }
  });
});

// A stand-in for the CLI, so the runners' lifecycle is tested without one. Its
// init line and its -p result echo its argv and the environment names a
// launcher must not pass on (CLAUDE*, the git location trio) plus PROBE_OUT.
// In stream mode it answers each user message with a result whose first
// multi-byte character it writes in two pieces, and on the end of its stdin
// says goodbye on a last line with no newline. FAKE_MODE: hang ignores the end
// of stdin (and, in -p mode, never answers); late answers after FAKE_DELAY_MS
// and lingers FAKE_END_MS after its stdin ends.
const STAND_IN = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mode = process.env.FAKE_MODE || 'ok';
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
const argv = process.argv.slice(2);
const env = Object.keys(process.env).filter((k) => /^(CLAUDE|GIT_DIR$|GIT_INDEX_FILE$|GIT_WORK_TREE$|PROBE_OUT$)/i.test(k));
if (argv.includes('--version')) {
  process.stdout.write('9.9.9 (stand-in)\\n');
} else if (argv.includes('--input-format')) {
  out({ type: 'system', subtype: 'init', argv, env });
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\\n')) >= 0) {
      const text = JSON.parse(buf.slice(0, i)).message.content[0].text;
      buf = buf.slice(i + 1);
      if (mode === 'late') await wait(Number(process.env.FAKE_DELAY_MS));
      const reply = Buffer.from(JSON.stringify({ type: 'result', result: 'échο ' + text }) + '\\n');
      const cut = reply.indexOf(Buffer.from('é')) + 1;
      process.stdout.write(reply.subarray(0, cut));
      await wait(50);
      process.stdout.write(reply.subarray(cut));
    }
  });
  process.stdin.on('end', async () => {
    if (mode === 'hang') return void setInterval(() => {}, 1000);
    await wait(Number(process.env.FAKE_END_MS || 100));
    process.stdout.write(JSON.stringify({ type: 'system', subtype: 'bye' }));
  });
} else if (mode === 'hang') {
  setInterval(() => {}, 1000);
} else {
  process.stdout.write(JSON.stringify({ type: 'result', result: 'ok', argv, env }));
}
`;

// The isolation flags baseArgs puts on every launch, as they sit in its argv.
const ISOLATION = ['--strict-mcp-config', '--setting-sources', 'project,local', '--settings'];
const isolationOf = (argv) => argv.slice(argv.indexOf('--strict-mcp-config'), argv.indexOf('--strict-mcp-config') + ISOLATION.length);

describe('runStream, runClaude and runClaudeAsync against a stand-in CLI', () => {
  let prev;
  let ws;
  // What a nested session would inherit: a launcher that passed this
  // environment on would hand both to the stand-in, which echoes them.
  const planted = { CLAUDE_PROBE_STAND_IN: '1', GIT_DIR: '' };
  let saved;
  before(() => {
    const standIn = path.join(fresh('stand-in'), 'claude.mjs');
    fs.writeFileSync(standIn, STAND_IN.replace(/^\n/, ''));
    prev = setClaudeCommand([process.execPath, standIn]);
    ws = fresh('ws');
    planted.GIT_DIR = path.join(dir, 'no-such-repo');
    saved = Object.fromEntries(Object.keys(planted).map((k) => [k, process.env[k]]));
    Object.assign(process.env, planted);
  });
  after(() => {
    setClaudeCommand(prev);
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  });

  test('two turns, a reply split inside a character, and a last line with no newline all arrive', async () => {
    const out = fresh('out');
    const s = await runStream({ cwd: ws, out, turns: ['one', () => 'two'], timeoutMs: 20_000 });
    assert.equal(s.why, 'done');
    assert.deepEqual(s.results.map((r) => r.result), ['échο one', 'échο two']);
    assert.equal(s.messages.at(-1).subtype, 'bye', 'the last line, written just before exit, was lost');
    assert.equal(s.code, 0);
    assert.equal(s.killedByLib, false);
    assert.ok(s.stdinToExitMs >= 0 && s.stdinToExitMs < 10_000, `stdinToExitMs ${s.stdinToExitMs}`);
    assert.deepEqual(isolationOf(s.messages[0].argv), ISOLATION);
    assert.deepEqual(s.messages[0].env, ['PROBE_OUT'], 'a CLAUDE* or git location variable reached the session');
    assert.ok(JSON.parse(fs.readFileSync(path.join(out, 'settings.json'), 'utf8')).claudeMdExcludes.length > 0);
    assert.ok(fs.readdirSync(out).some((f) => /^stream-\d+\.jsonl$/.test(f)));
  });

  test('a turn function that throws ends the session as turn-error instead of crashing the runner', async () => {
    const s = await runStream({ cwd: ws, out: fresh('out'), turns: ['one', () => { throw new Error('boom'); }], timeoutMs: 20_000 });
    assert.equal(s.why, 'turn-error');
    assert.match(s.stderr, /boom/);
    assert.equal(s.results.length, 1);
    assert.equal(s.killedByLib, false);
  });

  test('a result that arrives after the timeout starts no further turn', async () => {
    let called = false;
    const s = await runStream({
      cwd: ws, out: fresh('out'), timeoutMs: 300, env: { FAKE_MODE: 'late', FAKE_DELAY_MS: '800', FAKE_END_MS: '1500' },
      turns: ['one', () => { called = true; return 'two'; }],
    });
    assert.equal(s.why, 'timeout');
    assert.equal(called, false);
    assert.equal(s.results.length, 1, 'the late result is still recorded');
  });

  test('a session that ignores the end of its stdin is killed, and says so', async () => {
    const s = await runStream({ cwd: ws, out: fresh('out'), turns: ['one'], timeoutMs: 20_000, killAfterMs: 500, env: { FAKE_MODE: 'hang' } });
    assert.equal(s.why, 'done');
    assert.equal(s.killedByLib, true);
    assert.ok(s.stdinToExitMs >= 400, `stdinToExitMs ${s.stdinToExitMs}`);
  });

  test('runClaude and cliVersion go through the same command', () => {
    const r = runClaude({ cwd: ws, out: fresh('out'), prompt: 'hi', timeoutMs: 20_000 });
    assert.equal(r.json.result, 'ok');
    assert.deepEqual(isolationOf(r.json.argv), ISOLATION);
    assert.deepEqual(r.json.env, ['PROBE_OUT'], 'a CLAUDE* or git location variable reached the session');
    assert.equal(cliVersion(), '9.9.9');
  });

  test('runClaudeAsync: a finished run, a caller kill and a timeout each report who ended it', async () => {
    const ok = runClaudeAsync({ cwd: ws, out: fresh('out'), prompt: 'hi', timeoutMs: 20_000 });
    const r1 = await ok.done;
    assert.deepEqual([r1.status, r1.json.result, r1.timedOut, r1.pid], [0, 'ok', false, ok.child.pid]);
    assert.deepEqual(isolationOf(r1.json.argv), ISOLATION);
    assert.deepEqual(r1.json.env, ['PROBE_OUT'], 'a CLAUDE* or git location variable reached the session');
    assert.ok(!('killedByLib' in r1), 'timedOut is the one name for a lib kill');
    const killed = runClaudeAsync({ cwd: ws, out: fresh('out'), prompt: 'hi', timeoutMs: 20_000, env: { FAKE_MODE: 'hang' } });
    setTimeout(() => killed.child.kill(), 300);
    const r2 = await killed.done;
    assert.deepEqual([r2.timedOut, r2.json], [false, null]);
    const r3 = await runClaudeAsync({ cwd: ws, out: fresh('out'), prompt: 'hi', timeoutMs: 300, env: { FAKE_MODE: 'hang' } }).done;
    assert.equal(r3.timedOut, true);
  });

  // The out folder becomes a file once the session is up, so the record each
  // launcher writes as it settles fails. A throw there would be uncaught and
  // leave the promise pending, so each test fails at 15 s instead of hanging.
  const block = (out) => {
    fs.rmSync(out, { recursive: true, force: true });
    fs.writeFileSync(out, 'not a folder');
  };

  test('runClaudeAsync resolves when its run record cannot be written, and names the error', { timeout: 15_000 }, async () => {
    const out = fresh('out');
    const run = runClaudeAsync({ cwd: ws, out, prompt: 'hi', timeoutMs: 10_000 });
    block(out);
    const r = await run.done;
    assert.deepEqual([r.status, r.json?.result, r.timedOut], [0, 'ok', false]);
    assert.match(String(r.recordError), /^E[A-Z]+$/);
  });

  test('runStream resolves when its stream record cannot be written, and notes it on stderr', { timeout: 15_000 }, async () => {
    const out = fresh('out');
    const run = runStream({ cwd: ws, out, turns: ['one'], timeoutMs: 10_000 });
    block(out);
    const s = await run;
    assert.equal(s.why, 'done');
    assert.deepEqual(s.results.map((x) => x.result), ['échο one']);
    assert.match(s.stderr, /\[runStream\] could not write stream-\d+\.jsonl: E[A-Z]+/);
  });
});
