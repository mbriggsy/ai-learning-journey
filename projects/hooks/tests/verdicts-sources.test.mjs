// The verdict logic of probes Q3 and Q4 on planted observations, with no
// claude and no live session. Q3 pins each arm's command_source and Q4 each
// agent's agent_type inside the def (so the verdict hash covers the pins);
// these tests hold Q3's table equal to fields.mjs's enum, which the def must
// never import, and drive every branch the pins and Q4's "agents fire
// SubagentStop, never Stop" rule added. Q3's user-scratch arm launches only
// after a hooks-off pre-flight: its gate (scratchIsolation) runs on planted
// logs, and runArm against a stand-in CLI. Every sample id and path is built
// at run time, and none is real-shaped, so this file stays clean for the leak
// test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import q03, { ARMS, EXPECTED_SOURCE, decide as decideQ3, runArm, scratchIsolation } from '../probes/defs/q03-prompt-expansion.mjs';
import q04, { EXPECTED_AGENT_TYPE, analyze, decide as decideQ4 } from '../probes/defs/q04-post-tool-batch.mjs';
import { failure, setClaudeCommand } from '../probes/lib.mjs';
import { measured } from '../probes/run.mjs';
import { EVENTS } from './fields.mjs';

// The defs scrub evidence; planted values carry nothing to scrub.
const keep = (s) => s;

describe('Q3: each arm\'s command_source is pinned', () => {
  const TYPED = ['control', 'legacy-command', 'user-live', 'user-scratch', 'plugin-skill', 'plugin-bare', 'plugin-command', 'workflow', 'builtin'];
  const NAME = { control: 'probe-proj', 'legacy-command': 'probe-cmd', 'user-live': 'window', 'user-scratch': 'probe-user', 'plugin-skill': 'probeplug:pskill', 'plugin-bare': 'probeplug:pskill', 'plugin-command': 'probeplug:pcmd', workflow: 'probewf', builtin: 'init' };

  // One arm's row as runArm() builds it: a typed arm that fired with its
  // pinned source, or the model-invoked arm's Skill call with no expansion.
  // The user-scratch arm launched after a passing pre-flight.
  function row(arm, over = {}) {
    const typed = arm !== 'model-invoked';
    const prompt = typed ? `/${NAME[arm]} q` : 'use the Skill tool';
    const answers = arm === 'control' || arm === 'model-invoked';
    return {
      arm, prompt, expect: typed ? NAME[arm] : null,
      ups: 1, userSrc: arm === 'user-scratch' ? 1 : 0,
      upe: typed ? [{ keys: [], expansion_type: 'slash_command', command_name: NAME[arm], command_args: 'q', command_source: EXPECTED_SOURCE[arm], prompt }] : [],
      pre: typed ? [] : [{ tool_name: 'Skill', tool_input: { skill: 'probe-model' } }],
      stops: 1, order: typed ? ['ups', 'upe'] : ['ups'],
      listed: typed, liveUserSkillsListed: [], commandsListed: 9,
      okSeen: answers, assistants: answers ? 1 : 0, resultSubtype: 'success', upeHookEvents: [],
      reply: '', exit: 0, ms: 1, timedOut: false, streamLines: 3, stderr: '',
      configDirInHookEnv: arm === 'user-scratch' ? true : null,
      ...(arm === 'user-scratch' ? { preflight: { ok: true, why: null }, launched: true } : {}),
      ...over,
    };
  }
  const rows = (over = {}) => [...TYPED, 'model-invoked'].map((a) => row(a, over[a]));
  const source = (arm, value) => ({ upe: [{ ...row(arm).upe[0], command_source: value }] });
  const notLoaded = { upe: [], order: ['ups'], listed: false, okSeen: false };

  test("the def's value set is fields.mjs's command_source enum, so the two lists can't drift", () => {
    const [values] = EVENTS.UserPromptExpansion.command_source;
    assert.deepEqual([...new Set(Object.values(EXPECTED_SOURCE))].sort(), [...values].sort());
  });

  test('every typed arm has a pinned value, and the assumption names each one', () => {
    assert.deepEqual(Object.keys(EXPECTED_SOURCE).sort(), [...TYPED].sort());
    for (const v of new Set(Object.values(EXPECTED_SOURCE))) assert.match(q03.assumption, new RegExp(`\\b${v}\\b`), v);
  });

  test('every arm on its pinned source VERIFIES, with no opt-out flag', () => {
    const r = decideQ3(rows(), keep);
    assert.equal(r.verdict, 'VERIFIED', r.summary);
    assert.equal(r.unsettledOnly, undefined);
  });

  test('a renamed source on any fired arm is CONTRADICTED, never a re-VERIFY', () => {
    for (const arm of TYPED) {
      const r = decideQ3(rows({ [arm]: source(arm, 'renamed') }), keep);
      assert.equal(r.verdict, 'CONTRADICTED', arm);
      assert.ok(r.summary.includes(`${arm}: command_source "renamed" (expected "${EXPECTED_SOURCE[arm]}")`), `${arm}: ${r.summary}`);
      assert.equal(r.observed.state[arm], 'deviates', arm);
    }
  });

  test('two origins sharing a value are CONTRADICTED, whichever value they share', () => {
    const userAsPlugin = decideQ3(rows({ 'plugin-skill': source('plugin-skill', 'userSettings') }), keep);
    assert.equal(userAsPlugin.verdict, 'CONTRADICTED');
    assert.match(userAsPlugin.summary, /plugin-skill: command_source "userSettings" \(expected "plugin"\)/);
    const builtinAsProject = decideQ3(rows({ builtin: source('builtin', 'projectSettings') }), keep);
    assert.equal(builtinAsProject.verdict, 'CONTRADICTED');
    assert.match(builtinAsProject.summary, /builtin: command_source "projectSettings" \(expected "builtin"\)/);
  });

  test('an absent command_source is CONTRADICTED and says so', () => {
    const r = decideQ3(rows({ workflow: source('workflow', '<absent>') }), keep);
    assert.equal(r.verdict, 'CONTRADICTED');
    assert.match(r.summary, /workflow: command_source absent \(expected "projectSettings"\)/);
  });

  test('a scratch user source never proven drops that arm\'s deviation; with user-live unloaded too, user scope is an opt-out PARTIAL', () => {
    for (const [why, over] of [['user-src never fired', { userSrc: 0 }], ['the live user skills were listed', { liveUserSkillsListed: ['window'] }]]) {
      const r = decideQ3(rows({ 'user-scratch': { ...source('user-scratch', 'renamed'), ...over }, 'user-live': notLoaded }), keep);
      assert.equal(r.verdict, 'PARTIAL', `${why}: ${r.summary}`);
      assert.equal(r.unsettledOnly, true, why);
      assert.equal(r.observed.state['user-scratch'], 'isolation-unproven', why);
      assert.doesNotMatch(r.summary, /user-scratch: command_source/, why);
      assert.match(r.summary, /unsettled: user scope/, why);
    }
  });

  test('a scratch arm with no passing pre-flight is isolation-unproven, though its user-src fired and it listed no live skill', () => {
    const failed = { preflight: { ok: false, why: 'its command list lacks the scratch skill probe-user' }, launched: false };
    for (const [why, over, said] of [['failed', failed, /pre-flight not isolated \(its command list lacks the scratch skill probe-user\), so the arm never launched/], ['missing', { preflight: undefined, launched: undefined }, /\(no pre-flight, user-src fired 1/]]) {
      const r = decideQ3(rows({ 'user-scratch': { ...source('user-scratch', 'renamed'), ...over }, 'user-live': notLoaded }), keep);
      assert.equal(r.verdict, 'PARTIAL', `${why}: ${r.summary}`);
      assert.equal(r.unsettledOnly, true, why);
      assert.equal(r.observed.state['user-scratch'], 'isolation-unproven', why);
      assert.doesNotMatch(r.summary, /user-scratch: command_source/, why);
      assert.match(r.summary, said, why);
    }
  });

  test('a decisive arm that did not load is an opt-out PARTIAL, which run.mjs counts as unmeasured for Q3', () => {
    const r = decideQ3(rows({ 'legacy-command': notLoaded }), keep);
    assert.equal(r.verdict, 'PARTIAL', r.summary);
    assert.equal(r.unsettledOnly, true);
    assert.match(r.summary, /unsettled: legacy-command: \/probe-cmd q did not load/);
    assert.equal(measured({ id: 'Q3', ...r }), false);
  });

  test('a deviation beside an unsettled arm is CONTRADICTED and never opts out', () => {
    const r = decideQ3(rows({ 'legacy-command': notLoaded, 'plugin-command': source('plugin-command', 'renamed') }), keep);
    assert.equal(r.verdict, 'CONTRADICTED');
    assert.equal(r.unsettledOnly, undefined);
    assert.match(r.summary, /plugin-command: command_source "renamed".*unsettled: legacy-command/);
    assert.equal(measured({ id: 'Q3', ...r }), true);
  });

  test('a failed control is INCONCLUSIVE before any source is judged', () => {
    const r = decideQ3(rows({ control: { upe: [], order: ['ups'], okSeen: false }, builtin: source('builtin', 'renamed') }), keep);
    assert.equal(r.verdict, 'INCONCLUSIVE');
    assert.match(r.summary, /^the control arm failed/);
  });
});

describe("Q3: the user-scratch arm's hooks-off pre-flight gate (scratchIsolation)", () => {
  // A pre-flight as 2.1.306 prints it on Windows: backslash paths in the
  // init and the debug log, while the scratch folder is passed in the env
  // with forward slashes (here in another drive-letter case too).
  const sep = '\\';
  const at = (...p) => p.join(sep);
  const WS = at('C:', 'probe-tmp', 'q3-scratch-ws');
  const CONFIG = at(WS, 'config');
  const LIVE = at('C:', 'pilot-home', '.claude');
  const stamp = new Date(0).toISOString();
  const skillsLine = (user) => `${stamp} [DEBUG] Loading skills from: managed=${at('C:', 'managed', '.claude', 'skills')}, user=${user}, project=[${at(WS, '.claude', 'skills')}]`;
  const watcherLine = (user) => `${stamp} [DEBUG] Watching for changes in setting files ${user}, ${at(WS, '.claude', 'settings.json')}, ${at(WS, '.claude', 'settings.local.json')}...`;
  const plant = (over = {}) => ({
    fired: [],
    init: { type: 'system', subtype: 'init', slash_commands: ['probe-user', 'probe-proj', 'init'], memory_paths: { auto: `${at(CONFIG, 'projects', 'q3-slug', 'memory')}${sep}` } },
    debug: [skillsLine(at(CONFIG, 'skills')), watcherLine(at(CONFIG, 'settings.json'))],
    roots: [CONFIG.replace(/\\/g, '/').toLowerCase()],
    live: LIVE,
    expect: 'probe-user',
    ...over,
  });
  const initWith = (fields) => ({ ...plant().init, ...fields });

  test('a pre-flight on the scratch user source alone passes, across slash and drive-case spellings, with or without a watcher line', () => {
    assert.deepEqual([scratchIsolation(plant()).ok, scratchIsolation(plant()).why], [true, null]);
    const noWatcher = scratchIsolation(plant({ debug: [skillsLine(at(CONFIG, 'skills'))] }));
    assert.equal(noWatcher.ok, true, noWatcher.why);
  });

  test("the folder's resolved spelling counts as well as the one passed", () => {
    const short = at('C:', 'PROBE~1', 'q3-scratch-ws', 'config');
    assert.equal(scratchIsolation(plant({ roots: [short, CONFIG] })).ok, true);
    const only = scratchIsolation(plant({ roots: [short] }));
    assert.equal(only.ok, false);
    assert.match(only.why, /memory_paths\.auto is outside the scratch config folder/);
  });

  test('each sign of another user source, or of a hook running, fails it and says which', () => {
    const cases = [
      ['a capture fired', { fired: ['capture user-src'] }, /^hooks ran with disableAllHooks in --settings \(\["capture user-src"\]\)/],
      ['a hook event streamed', { fired: ['hook SessionStart'] }, /hooks ran with disableAllHooks in --settings \(\["hook SessionStart"\]\)/],
      ['no init message', { init: null }, /it printed no init message/],
      ['an init with no command list', { init: initWith({ slash_commands: undefined }) }, /its init lists no slash_commands/],
      ['the scratch skill unlisted', { init: initWith({ slash_commands: ['probe-proj'] }) }, /its command list lacks the scratch skill probe-user/],
      ['a live user skill listed', { init: initWith({ slash_commands: ['probe-user', '/window'] }) }, /its command list holds the live user skills \["window"\]/],
      ['auto memory in the live home', { init: initWith({ memory_paths: { auto: at(LIVE, 'projects', 'q3-slug', 'memory') } }) }, /memory_paths\.auto is outside the scratch config folder/],
      ['auto memory in a sibling sharing the prefix', { init: initWith({ memory_paths: { auto: at(`${CONFIG}-old`, 'projects', 'q3-slug', 'memory') } }) }, /memory_paths\.auto is outside the scratch config folder/],
      ['no auto memory path', { init: initWith({ memory_paths: undefined }) }, /memory_paths\.auto is missing/],
      ['no skills line', { debug: [watcherLine(at(CONFIG, 'settings.json'))] }, /its debug log has no "Loading skills from" line/],
      ['user skills from the live home', { debug: [skillsLine(at(LIVE, 'skills')), watcherLine(at(CONFIG, 'settings.json'))] }, /its debug log loads user skills from outside the scratch config folder/],
      ['the watcher on the live settings', { debug: [skillsLine(at(CONFIG, 'skills')), watcherLine(at(LIVE, 'settings.json'))] }, /its settings watcher lists the live settings\.json; its settings watcher does not list the scratch settings\.json/],
      ['the watcher missing the scratch settings', { debug: [skillsLine(at(CONFIG, 'skills')), watcherLine(at(WS, 'other', 'settings.json'))] }, /its settings watcher does not list the scratch settings\.json/],
    ];
    for (const [name, over, why] of cases) {
      const r = scratchIsolation(plant(over));
      assert.equal(r.ok, false, name);
      assert.match(r.why ?? '', why, name);
    }
  });
});

// A stand-in CLI for runArm, which logs each launch (argv, cwd, PROBE_OUT,
// CLAUDE_CONFIG_DIR, the --settings file) beside the stand-in.json it finds
// above PROBE_OUT. It lists the skills under its user folder and the
// workspace, and puts its auto memory and its debug-log user folder under
// that same user folder: CLAUDE_CONFIG_DIR (resolved through any link in mode
// "resolved"), or <root>/live when there is none or the mode is "ignored" (a
// CLI that ignores the variable). Mode "hooks" also writes a user-src capture
// and streams a SessionStart hook_started event during a debug-file run, as
// if disableAllHooks had not held. A debug-file run (the pre-flight) ends on
// an error result and exit 1, like a scratch folder with no login.
const STAND_IN = `
import fs from 'node:fs';
import path from 'node:path';
const argv = process.argv.slice(2);
const flag = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
let root = process.env.PROBE_OUT;
while (!fs.existsSync(path.join(root, 'stand-in.json'))) {
  if (path.dirname(root) === root) throw new Error('no stand-in.json above PROBE_OUT');
  root = path.dirname(root);
}
const { mode } = JSON.parse(fs.readFileSync(path.join(root, 'stand-in.json'), 'utf8'));
const config = process.env.CLAUDE_CONFIG_DIR ?? null;
fs.appendFileSync(path.join(root, 'launches.jsonl'), JSON.stringify({ argv, cwd: process.cwd(), out: process.env.PROBE_OUT, config, settings: JSON.parse(fs.readFileSync(flag('--settings'), 'utf8')) }) + '\\n');
const user = mode === 'ignored' || !config ? path.join(root, 'live') : mode === 'resolved' ? fs.realpathSync.native(config) : config;
const ls = (d) => (fs.existsSync(d) ? fs.readdirSync(d) : []);
const debugFile = flag('--debug-file');
if (debugFile) {
  fs.writeFileSync(debugFile, [
    'T [DEBUG] Loading skills from: managed=' + path.join(root, 'managed') + ', user=' + path.join(user, 'skills') + ', project=[]',
    'T [DEBUG] Watching for changes in setting files ' + path.join(user, 'settings.json') + ', ' + path.join(process.cwd(), '.claude', 'settings.json') + '...',
  ].join('\\n') + '\\n');
  if (mode === 'hooks') fs.appendFileSync(path.join(process.env.PROBE_OUT, 'captures.jsonl'), JSON.stringify({ label: 'user-src', input: {} }) + '\\n');
}
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
if (debugFile && mode === 'hooks') out({ type: 'system', subtype: 'hook_started', hook_name: 'SessionStart:startup', hook_event: 'SessionStart' });
out({ type: 'system', subtype: 'init', slash_commands: [...ls(path.join(user, 'skills')), ...ls(path.join(process.cwd(), '.claude', 'skills'))], memory_paths: { auto: path.join(user, 'projects', 'p', 'memory') + path.sep } });
out(debugFile ? { type: 'result', subtype: 'error_during_execution', is_error: true, result: 'not logged in' } : { type: 'result', subtype: 'success', is_error: false, result: '' });
process.exitCode = debugFile ? 1 : 0;
`;

describe('Q3: runArm launches the user-scratch arm only after its pre-flight passes, against a stand-in CLI', () => {
  let dir;
  let prev;
  const made = [];
  const runs = {};
  const flag = (l, f) => l.argv[l.argv.indexOf(f) + 1];

  // Each mode gets its own root, stand-in.json and ctx; the arms run at once.
  // The control arm runs beside the isolated one, to show only user-scratch
  // gets a pre-flight. The resolved mode runs last, alone, with the temp dir
  // reached through a link (a junction on Windows), so the workspace path
  // runArm passes differs from the one the stand-in prints: the environment
  // holds the link only until runArm's first pause, by which time the
  // workspace exists and the pre-flight has run.
  async function scenario(mode, a) {
    const root = path.join(dir, `${mode}-${a.name}`);
    fs.mkdirSync(path.join(root, 'live', 'skills', 'window'), { recursive: true });
    fs.writeFileSync(path.join(root, 'stand-in.json'), JSON.stringify({ mode }));
    const ctx = { id: 'Q3', out: path.join(root, 'Q3'), version: '0.0.0', made: [] };
    try {
      const row = await runArm(ctx, a);
      const launches = fs.readFileSync(path.join(root, 'launches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
      return { row, launches };
    } finally {
      made.push(...ctx.made);
    }
  }

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-q3-'));
    const standIn = path.join(dir, 'claude.mjs');
    fs.writeFileSync(standIn, STAND_IN.replace(/^\n/, ''));
    prev = setClaudeCommand([process.execPath, standIn]);
    const scratch = ARMS.find((a) => a.scratchUser);
    const control = ARMS.find((a) => a.name === 'control');
    [runs.isolated, runs.ignored, runs.hooks, runs.control] = await Promise.all([scenario('isolated', scratch), scenario('ignored', scratch), scenario('hooks', scratch), scenario('isolated', control)]);
    const real = path.join(dir, 'tmp-real');
    const link = path.join(dir, 'tmp-link');
    fs.mkdirSync(real);
    fs.symlinkSync(real, link, 'junction');
    const names = ['TMPDIR', 'TEMP', 'TMP'];
    const saved = names.map((k) => process.env[k]);
    for (const k of names) process.env[k] = link;
    let resolved;
    try {
      resolved = scenario('resolved', scratch);
    } finally {
      names.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
    }
    runs.resolved = { ...(await resolved), real, link };
  });
  after(() => {
    if (prev) setClaudeCommand(prev);
    for (const d of [...made, dir]) if (d) fs.rmSync(d, { recursive: true, force: true });
  });

  test("the pre-flight is the arm's own session with every hook off, no tools and a debug file; the arm follows it, though its model call failed", () => {
    const { row, launches } = runs.isolated;
    assert.equal(launches.length, 2, JSON.stringify(launches.map((l) => l.argv[1])));
    const [pre, armRun] = launches;
    assert.ok(pre.argv.includes('--debug-file') && !armRun.argv.includes('--debug-file'), 'the pre-flight launched first');
    assert.equal(pre.settings.disableAllHooks, true);
    assert.equal(pre.settings.hooks, undefined);
    assert.equal(armRun.settings.disableAllHooks, undefined);
    assert.ok(armRun.settings.hooks.UserPromptExpansion, 'the arm itself runs with its hooks on');
    assert.equal(flag(pre, '--tools'), '');
    assert.equal(flag(pre, '--setting-sources'), 'user,project,local');
    assert.equal(flag(pre, '--setting-sources'), flag(armRun, '--setting-sources'));
    assert.ok(pre.config && pre.config === armRun.config, 'one CLAUDE_CONFIG_DIR for both');
    assert.equal(pre.cwd, armRun.cwd);
    assert.notEqual(pre.out, armRun.out, "the pre-flight's captures land apart from the arm's");
    assert.equal(row.launched, true);
    assert.equal(row.preflight.ok, true, row.preflight.why);
    assert.deepEqual([row.preflight.result, row.preflight.exit], ['error_during_execution', 1]);
    const ctl = runs.control;
    assert.equal(ctl.launches.length, 1);
    assert.ok(!ctl.launches[0].argv.includes('--debug-file'), 'only user-scratch gets a pre-flight');
    assert.equal('preflight' in ctl.row, false);
  });

  test('a CLI that prints the scratch folder resolved through a link still passes the pre-flight', () => {
    const { row, launches, real, link } = runs.resolved;
    const norm = (p) => String(p).replace(/\\/g, '/').toLowerCase();
    assert.ok(norm(launches[0].config).startsWith(norm(link)), 'the folder was passed through the link');
    assert.ok(norm(row.preflight.facts.memoryAuto).startsWith(norm(fs.realpathSync.native(real))), 'the stand-in printed it resolved');
    assert.equal(row.preflight.ok, true, row.preflight.why);
    assert.equal(row.launched, true);
  });

  test('a CLI that ignored CLAUDE_CONFIG_DIR keeps the arm from launching, and the row says why', () => {
    const { row, launches } = runs.ignored;
    assert.equal(launches.length, 1, 'only the pre-flight launched');
    assert.ok(launches[0].argv.includes('--debug-file'));
    assert.equal(row.launched, false);
    assert.equal(row.preflight.ok, false);
    for (const why of [/lacks the scratch skill probe-user/, /holds the live user skills \["window"\]/, /memory_paths\.auto is outside/, /loads user skills from outside/, /does not list the scratch settings\.json/]) assert.match(row.preflight.why, why);
    assert.deepEqual([row.ups, row.userSrc, row.upe], [0, 0, []]);
  });

  test("a hook that ran in the pre-flight keeps the arm from launching, read from its own capture folder and its stream's hook events", () => {
    const { row, launches } = runs.hooks;
    assert.equal(launches.length, 1, 'only the pre-flight launched');
    assert.equal(row.launched, false);
    assert.equal(row.preflight.ok, false);
    assert.match(row.preflight.why, /^hooks ran with disableAllHooks in --settings \(\["capture user-src","hook SessionStart"\]\)/);
    assert.equal(row.userSrc, 0, "the pre-flight's capture is not the arm's");
  });
});

describe('Q4: each agent\'s agent_type is pinned, and agents fire SubagentStop, never Stop', () => {
  let dir;
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-q4-')); });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  // One arm as the CLI leaves it, fed through the def's own row builder: the
  // hook captures, the -p result, and the session folder's transcripts (the
  // main one, each agent's, a workflow's run journal and meta file). Options:
  // agentType (what the agent's events carry), asked (the Agent call's
  // subagent_type), stop ('own' or 'other': a Stop carrying that agent's id),
  // subagentStop (false: none fired), res (fields over a clean result).
  function plant(name, { agentType = EXPECTED_AGENT_TYPE[name], asked = EXPECTED_AGENT_TYPE.agent, stop = null, subagentStop = true, res = {} } = {}) {
    const root = fs.mkdtempSync(path.join(dir, `${name}-`));
    const transcript = path.join(root, 'main.jsonl');
    const sessionDir = path.join(root, 'main');
    const session = `${name}-session`;
    const cap = (label, input = {}) => ({ label, input: { session_id: session, transcript_path: transcript, cwd: root, hook_event_name: label, ...input } });
    const record = (file, ids) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify({ type: 'assistant', message: { content: ids.map((id) => ({ type: 'tool_use', id })) } })}\n`);
    };
    const reads = (prefix, extra = {}) => [1, 2].map((n) => ({ tool_name: 'Read', tool_use_id: `${prefix}-read-${n}`, ...extra }));
    const caps = [cap('SessionStart')];
    let mainIds;
    if (name === 'main') {
      const calls = reads('main');
      caps.push(...calls.map((c) => cap('PreToolUse', c)), cap('PostToolBatch', { tool_calls: calls }));
      mainIds = calls.map((c) => c.tool_use_id);
    } else {
      const launcher = name === 'agent' ? 'Agent' : 'Workflow';
      const launch = { tool_name: launcher, tool_use_id: `${name}-launch` };
      const agentId = `${name}-agent`;
      const own = { agent_id: agentId, agent_type: agentType };
      const agentDir = name === 'agent' ? path.join(sessionDir, 'subagents') : path.join(sessionDir, 'subagents', 'workflows', 'run-1');
      const calls = reads(agentId);
      caps.push(cap('PreToolUse', { ...launch, tool_input: name === 'agent' ? { subagent_type: asked } : { script: 'return 1' } }), cap('SubagentStart', own));
      caps.push(...calls.map((c) => cap('PreToolUse', { ...own, ...c })), cap('PostToolBatch', { ...own, tool_calls: calls }));
      if (stop) caps.push(cap('Stop', { ...own, agent_id: stop === 'own' ? agentId : 'other-agent' }));
      if (subagentStop) caps.push(cap('SubagentStop', { ...own, agent_transcript_path: path.join(agentDir, `agent-${agentId}.jsonl`) }));
      caps.push(cap('PostToolBatch', { tool_calls: [launch] }));
      record(path.join(agentDir, `agent-${agentId}.jsonl`), calls.map((c) => c.tool_use_id));
      if (name === 'workflow') {
        fs.writeFileSync(path.join(agentDir, 'journal.jsonl'), `${JSON.stringify({ type: 'started', agentId })}\n`);
        fs.writeFileSync(path.join(agentDir, `agent-${agentId}.meta.json`), JSON.stringify({ agentType }));
      }
      mainIds = [launch.tool_use_id];
    }
    // The workflow arm's main thread stops twice on 2.1.306, legitimately.
    caps.push(cap('Stop'), ...(name === 'workflow' ? [cap('Stop')] : []));
    record(transcript, mainIds);
    return analyze(name, caps, { status: 0, ms: 1, timedOut: false, json: { type: 'result', is_error: false, session_id: session, result: 'DONE' }, ...res });
  }
  const run = (over = {}) => decideQ4({ main: plant('main'), agent: plant('agent', over.agent), workflow: plant('workflow', over.workflow) }, keep);

  test('the pins are the 2.1.306 values, and the assumption names each one and the Stop rule', () => {
    assert.deepEqual(EXPECTED_AGENT_TYPE, { agent: 'general-purpose', workflow: 'workflow-subagent' });
    for (const v of Object.values(EXPECTED_AGENT_TYPE)) assert.ok(q04.assumption.includes(v), v);
    assert.match(q04.assumption, /agents fire SubagentStop, never Stop/);
  });

  test('a healthy planted run VERIFIES through the row builder, though the workflow arm\'s main thread stopped twice', () => {
    const rows = { main: plant('main'), agent: plant('agent'), workflow: plant('workflow') };
    assert.deepEqual(rows.agent.launchTypes, ['general-purpose']);
    assert.deepEqual([rows.agent.stopInAgent, rows.workflow.stopInAgent], [0, 0]);
    assert.equal(rows.workflow.events.Stop.main, 2);
    const r = decideQ4(rows, keep);
    assert.equal(r.verdict, 'VERIFIED', r.summary);
    assert.match(r.summary, /each agent fired SubagentStop and no Stop/);
  });

  test('a renamed or missing agent_type on either agent is CONTRADICTED', () => {
    for (const [name, label] of [['agent', 'Agent-tool subagent'], ['workflow', 'workflow agent']]) {
      const renamed = run({ [name]: { agentType: 'renamed' } });
      assert.equal(renamed.verdict, 'CONTRADICTED', name);
      assert.ok(renamed.summary.includes(`${label}: its batch agent_type is ["renamed"], not the pinned "${EXPECTED_AGENT_TYPE[name]}"`), renamed.summary);
      const missing = run({ [name]: { agentType: null } });
      assert.equal(missing.verdict, 'CONTRADICTED', name);
      assert.ok(missing.summary.includes(`${label}: its batch agent_type is [null]`), missing.summary);
    }
  });

  test('an Agent call that asked for another subagent_type is a failed control, never a contradiction', () => {
    const r = run({ agent: { asked: 'Explore', agentType: 'Explore' } });
    assert.equal(r.verdict, 'INCONCLUSIVE');
    assert.match(r.summary, /the agent arm's Agent call asked for subagent_type \["Explore"\], not "general-purpose"/);
  });

  test('a Stop carrying any agent_id is CONTRADICTED, on a clean run or a timed-out one', () => {
    for (const [name, label] of [['agent', 'Agent-tool subagent'], ['workflow', 'workflow agent']]) {
      for (const stop of ['own', 'other']) {
        for (const res of [{}, { timedOut: true }]) {
          const r = run({ [name]: { stop, res } });
          assert.equal(r.verdict, 'CONTRADICTED', `${name} ${stop} ${JSON.stringify(res)}`);
          assert.ok(r.summary.includes(`${label}: Stop fired inside the agent (1 Stop firing(s) carried an agent_id)`), r.summary);
        }
      }
    }
  });

  test('an agent that fired no SubagentStop settles nothing: INCONCLUSIVE, naming a failed run', () => {
    for (const [name, label] of [['agent', 'Agent-tool subagent'], ['workflow', 'workflow agent']]) {
      const clean = run({ [name]: { subagentStop: false } });
      assert.equal(clean.verdict, 'INCONCLUSIVE', name);
      assert.ok(clean.summary.includes(`${label}: no SubagentStop fired for it, and an agent that died fires none`), clean.summary);
      const timedOut = run({ [name]: { subagentStop: false, res: { timedOut: true } } });
      assert.equal(timedOut.verdict, 'INCONCLUSIVE', name);
      assert.ok(timedOut.summary.includes(`${label}: no SubagentStop fired for it (the run timed out)`), timedOut.summary);
    }
  });

  test("a run's failure reads through lib's failure(), the one copy every def shares", () => {
    const shapes = [
      {},
      { timedOut: true },
      { status: 1, json: null },
      { status: 1, json: { type: 'result', is_error: true, subtype: 'error_max_turns' } },
      { status: 3 },
    ];
    for (const over of shapes) {
      const res = { status: 0, ms: 1, timedOut: false, json: { type: 'result', is_error: false, session_id: 'main-session', result: 'DONE' }, ...over };
      assert.equal(analyze('main', [], res).failed, failure(res), JSON.stringify(over));
    }
    assert.equal(analyze('main', [], { status: 1, timedOut: false, json: null }).failed, 'exited 1 with no result');
  });
});
