// Q18's and Q19's verdict pieces that need no claude.
// Q18 (the U4 Skill denials): the catalog pin and its five Skill rules, the
// plugin copy and its tree hash, the body marker a typed arm looks for, the
// push fence (run for real with git on a fixture repo: the fence is the one
// part of the probe that acts), skillOutcome's reading of one Skill call,
// callMatches, typedOutcome, and decide over planted rows.
// Q19 (review-lens): the lens copy, the logging stub MCP server run on its own
// over stdio, lensFacts, resultKind, judgeWorkflow, judgeAgent and decide.
// Every id, word, tool list and path is planted; each fixture path is built
// from the test's own temp root, never by the code under test.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import q18, {
  ARMS, CACHE_MARKERS, CATALOG_FILE, CATALOG_SHA256, DENIED, DENIED_NAMES, DMI_TEXT, FENCE_OWNER, GH_DENY, INIT_TOOLS, PLUGINS, PROBE_MS as Q18_MS, RULE_TEXT,
  bodyMarker, callMatches, copyPlugin, decide as decide18, fenceEnv, fenceUrl, fencedRepo, holdsMarker, installedPlugin, proveFence, readPinned,
  resultsById, sessionEnv, skillDenials, skillOutcome, treeHash, typedOutcome,
} from '../probes/defs/q18-skill-denials.mjs';
import q19, {
  DENY_REASON, LENS, LENS_ALLOWED, LENS_EXTRAS, LENS_SOURCE, LENS_TOOLS, MCP_SERVER, MCP_TOOL, POOL, PROBE_MS as Q19_MS, SCHEMA, SEARCH_POOL, STUB_MCP, TOOL_SEARCH,
  copyLens, decide as decide19, judgeAgent, judgeWorkflow, lensFacts, probeTask, resultKind, sameBytes,
} from '../probes/defs/q19-review-lens.mjs';
import { measured } from '../probes/run.mjs';

const HOOKS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A temp root for one test, removed in a finally over the whole test body.
async function inTemp(prefix, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return await fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('Q18: the def, its pin and the catalog it reads', () => {
  test('the def loads as Q18 with its own ceiling, reads the catalog beside it, and decides through decide()', () => {
    assert.equal(q18.id, 'Q18');
    assert.equal(q18.loadBearing, false);
    assert.equal(q18.timeoutMs, Q18_MS);
    assert.ok(Number.isFinite(Q18_MS) && Q18_MS > 45 * 60_000 && Q18_MS < 2 ** 31, `${Q18_MS}`);
    assert.equal(CATALOG_FILE, path.join(HOOKS, 'lib', 'permission-rules.json'));
    const src = fs.readFileSync(path.join(HOOKS, 'probes', 'defs', 'q18-skill-denials.mjs'), 'utf8');
    assert.match(src, /^export const CATALOG_SHA256 = '([0-9a-f]{64})';$/m);
    const run = q18.run.toString();
    for (const re of [/readPinned\(/, /skillDenials\(/, /copyPlugin\(/, /fencedRepo\(/, /proveFence\(/, /decide\(rows\)/, /'--permission-mode', 'auto'/, /'--permission-prompts', 'none'/, /'--tools', 'Skill'/, /disableSkillShellExecution: true/]) assert.match(run, re);
    // The fence is proven before any session starts, and a failed proof returns before the launch.
    const runArm = run.slice(run.indexOf('const runArm'));
    assert.ok(runArm.indexOf('proveFence(') < runArm.indexOf('runStream('), 'the proof comes before the model session');
    assert.ok(runArm.indexOf('proveFence(') < runArm.indexOf('runClaude('), 'the proof comes before the typed session');
    assert.match(runArm, /if \(!fence\.ok\) return \{ \.\.\.row, why: fence\.why \};/);
    // The row decide() reads carries every arm field it branches on.
    assert.match(runArm, /const row = \{ arm: a\.name, kind: a\.kind, expect: a\.expect, ctl: !!a\.ctl, bareCommand: !!a\.bareCommand, call: a\.call, cmd: a\.cmd, names: a\.names, target: a\.target \?\? null, launched: false \};/);
    // Its PARTIAL is a measured deviation, never unsettledOnly.
    for (const f of [run, decide18.toString()]) assert.doesNotMatch(f, /unsettledOnly/);
  });

  test('readPinned: the pinned bytes parse; any other bytes are refused before parsing, and a pinned file that is not JSON is refused', () => {
    const bytes = fs.readFileSync(CATALOG_FILE);
    const ok = readPinned(bytes);
    assert.equal(ok.ok, true);
    assert.equal(ok.have, sha(bytes));
    assert.ok(Array.isArray(ok.catalog.deny));
    const changed = Buffer.from(bytes);
    changed[changed.length - 2] ^= 1;
    const bad = readPinned(changed);
    assert.equal(bad.ok, false);
    assert.equal(bad.catalog, undefined);
    assert.match(bad.why, new RegExp(`not the pinned ${CATALOG_SHA256}`));
    const junk = Buffer.from('{ not json');
    const notJson = readPinned(junk, sha(junk));
    assert.equal(notJson.ok, false);
    assert.match(notJson.why, /does not parse/);
  });

  test('skillDenials: the real catalog holds exactly the five tested rules; one dropped, added, respelled or doubled is not the tested set', () => {
    const { catalog } = readPinned(fs.readFileSync(CATALOG_FILE));
    const real = skillDenials(catalog);
    assert.equal(real.sameAsTested, true);
    assert.deepEqual([...real.names].sort(), [...DENIED].sort());
    assert.deepEqual(real.rules, DENIED.map((n) => `Skill(skill:${n})`).filter((r) => real.rules.includes(r)));
    const withDeny = (deny) => skillDenials({ deny: deny.map((rule) => ({ rule, why: 'x' })) });
    const five = DENIED.map((n) => `Skill(skill:${n})`);
    assert.equal(withDeny(five).sameAsTested, true);
    assert.equal(withDeny([...five, 'Bash(codex *)']).sameAsTested, true, 'shell rules are not Skill rules');
    assert.equal(withDeny(five.slice(1)).sameAsTested, false, 'one dropped');
    assert.equal(withDeny([...five, 'Skill(skill:compound-engineering:ce-plan)']).sameAsTested, false, 'one added');
    assert.equal(withDeny([...five.slice(1), 'Skill(compound-engineering:ce-work-beta)']).sameAsTested, false, 'not the parameter form');
    assert.equal(withDeny([...five.slice(1), five[1]]).sameAsTested, false, 'one doubled');
    assert.equal(skillDenials(null).sameAsTested, false);
  });

  test('the arms: every denied skill but ce-work-beta three ways, ce-work-beta once, an undenied control first, a bare-name control, the two typed commands and two typed controls', () => {
    assert.equal(ARMS[0].name, 'control');
    assert.ok(!DENIED.includes(ARMS[0].call.skill));
    assert.equal(ARMS[0].expect, 'ran');
    const rule = ARMS.filter((a) => a.expect === 'rule');
    assert.equal(rule.length, 12);
    for (const name of DENIED.filter((n) => n !== 'compound-engineering:ce-work-beta')) {
      const mine = rule.filter((a) => a.target === name);
      const bare = name.split(':')[1];
      assert.deepEqual(mine.map((a) => a.call), [{ skill: name, args: 'probe' }, { skill: name }, { skill: bare }], name);
      for (const a of mine) assert.deepEqual(a.names, [name, bare]);
    }
    // Only commit-push-pr is a plugin command (commands/*.md); its bare arm is
    // read against the bare name of its undenied sibling command.
    assert.deepEqual(ARMS.filter((a) => a.bareCommand).map((a) => a.name), ['cpp-bare']);
    const bc = ARMS.find((a) => a.name === 'cmdbare-control');
    assert.deepEqual([bc.kind, bc.call, bc.expect, bc.ctl, bc.target], ['model', { skill: 'commit' }, 'observe', true, 'commit-commands:commit']);
    assert.ok(!DENIED.includes(bc.target));
    assert.deepEqual(ARMS.filter((a) => a.expect === 'dmi').map((a) => a.call), [{ skill: 'compound-engineering:ce-work-beta' }]);
    const typed = ARMS.filter((a) => a.kind === 'typed');
    assert.deepEqual(typed.filter((a) => !a.ctl).map((a) => a.cmd), ['/commit-commands:commit-push-pr', '/compound-engineering:ce-resolve-pr-feedback']);
    assert.equal(typed.filter((a) => a.ctl).length, 2);
    assert.ok(typed.every((a) => a.expect === 'expanded'));
    assert.deepEqual(new Set(ARMS.map((a) => a.name)).size, ARMS.length);
    assert.deepEqual(INIT_TOOLS, ['Skill']);
    assert.deepEqual(GH_DENY, ['Bash(gh *)', 'PowerShell(gh *)']);
    assert.deepEqual(PLUGINS.map((p) => p.name), ['compound-engineering', 'commit-commands']);
  });
});

describe('Q18: the plugins, copied out of the cache', () => {
  test('installedPlugin: the user-scope entry, else the first; a missing key or installPath says why', () => {
    const installed = { plugins: { 'a@m': [{ scope: 'project', installPath: '/p', version: '1' }, { scope: 'user', installPath: '/u', version: '2', gitCommitSha: 'abc' }], 'b@m': [{ scope: 'project', installPath: '/q', version: '3' }], 'c@m': [{ scope: 'user' }] } };
    assert.deepEqual(installedPlugin(installed, 'a@m'), { path: '/u', version: '2', sha: 'abc' });
    assert.deepEqual(installedPlugin(installed, 'b@m'), { path: '/q', version: '3', sha: null });
    assert.match(installedPlugin(installed, 'c@m').why, /no installPath/);
    assert.match(installedPlugin(installed, 'd@m').why, /d@m/);
    assert.match(installedPlugin(null, 'a@m').why, /a@m/);
  });

  test('copyPlugin: a byte copy without the cache markers, its tree hash equal to the source\'s; a changed byte or name changes the hash', () => inTemp('q18-plugin-', (root) => {
    const src = path.join(root, 'src');
    const put = (rel, text) => { const f = path.join(src, ...rel.split('/')); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
    put('.claude-plugin/plugin.json', '{"name":"p"}');
    put('skills/a/SKILL.md', '---\nname: a\n---\nbody\n');
    put('skills/a/references/r.md', 'ref');
    put('.in_use/1234', 'pid');
    put('.orphaned_at', 'when');
    put('skills/a/.gcs-sha', 'x');
    const dst = path.join(root, 'dst');
    const h = copyPlugin(src, dst);
    assert.equal(h.src.sha, h.dst.sha);
    assert.equal(h.dst.files, 3);
    assert.ok(!fs.existsSync(path.join(dst, '.in_use')));
    assert.ok(!fs.existsSync(path.join(dst, '.orphaned_at')));
    assert.ok(!fs.existsSync(path.join(dst, 'skills', 'a', '.gcs-sha')));
    assert.equal(fs.readFileSync(path.join(dst, 'skills', 'a', 'references', 'r.md'), 'utf8'), 'ref');
    assert.deepEqual(CACHE_MARKERS, ['.in_use', '.orphaned_at', '.gcs-sha', '.links_materialized']);
    fs.writeFileSync(path.join(dst, 'skills', 'a', 'references', 'r.md'), 'reF');
    assert.notEqual(treeHash(dst).sha, h.src.sha);
    fs.writeFileSync(path.join(dst, 'skills', 'a', 'references', 'r.md'), 'ref');
    assert.equal(treeHash(dst).sha, h.src.sha);
    fs.renameSync(path.join(dst, 'skills', 'a', 'references', 'r.md'), path.join(dst, 'skills', 'a', 'references', 's.md'));
    assert.notEqual(treeHash(dst).sha, h.src.sha);
    // Framed: bytes moved from one file to the next change the hash.
    const one = path.join(root, 'one');
    const two = path.join(root, 'two');
    fs.mkdirSync(one);
    fs.mkdirSync(two);
    fs.writeFileSync(path.join(one, 'a'), 'xy');
    fs.writeFileSync(path.join(one, 'b'), 'z');
    fs.writeFileSync(path.join(two, 'a'), 'x');
    fs.writeFileSync(path.join(two, 'b'), 'yz');
    assert.notEqual(treeHash(one).sha, treeHash(two).sha);
  }));
});

describe('Q18: the body marker a typed arm looks for', () => {
  test('bodyMarker: the longest body line, past the frontmatter, that no !` line, $ARGUMENTS or ${...} can change', () => {
    const text = [
      '---',
      'allowed-tools: Bash(git push:*), and a frontmatter line far longer than any line of the body below it',
      'description: x',
      '---',
      '',
      '- Current git status: !`git status` and a long tail so it would win on length alone',
      'Handle $ARGUMENTS with a long tail so it would win on length alone, too',
      'Use ${CLAUDE_PLUGIN_ROOT}/scripts/x with a long tail so it would win on length',
      'A plain body line that is long enough to count.',
      'The longest plain line of this body, the one the marker must be.',
      'short',
    ].join('\r\n');
    assert.equal(bodyMarker(text), 'The longest plain line of this body, the one the marker must be.');
    assert.equal(bodyMarker('---\nname: x\n---\n\nshort line\n'), null);
    assert.equal(bodyMarker('no frontmatter at all, one line that is long enough here'), 'no frontmatter at all, one line that is long enough here');
  });

  test('holdsMarker finds a marker inside a transcript\'s JSON strings, quotes and backslashes escaped', () => {
    const marker = 'Say "done" and use C:\\path, nothing else, please now';
    const raw = `${JSON.stringify({ type: 'user', message: { content: `Base dir\n\n${marker}\n` } })}\n`;
    assert.ok(holdsMarker(raw, marker));
    assert.ok(!holdsMarker(raw.replace('done', 'dome'), marker));
    assert.ok(!holdsMarker(raw, null));
    assert.ok(!holdsMarker('', marker));
  });
});

describe('Q18: the push fence, run with git', () => {
  test('fenceEnv: credentials emptied, prompts off, file the only protocol, github rewritten into the fence folder, gh pointed at an empty folder', () => {
    const env = fenceEnv({ fence: path.join('C:\\', 'w', 'fence'), ghConfig: path.join('C:\\', 'w', 'gh') });
    assert.equal(env.GIT_TERMINAL_PROMPT, '0');
    assert.equal(env.GIT_ALLOW_PROTOCOL, 'file');
    assert.equal(env.GIT_CONFIG_COUNT, '3');
    assert.deepEqual([env.GIT_CONFIG_KEY_0, env.GIT_CONFIG_VALUE_0], ['credential.helper', '']);
    for (const [k, v, kind] of [[env.GIT_CONFIG_KEY_1, env.GIT_CONFIG_VALUE_1, 'pushInsteadOf'], [env.GIT_CONFIG_KEY_2, env.GIT_CONFIG_VALUE_2, 'insteadOf']]) {
      assert.match(k, new RegExp(`^url\\.file:///[^\\\\]*/fence/\\.${kind}$`), k);
      assert.equal(v, 'https://github.com/');
    }
    assert.ok(!env.GH_CONFIG_DIR.includes('\\'));
    assert.equal(fenceUrl('probe-u4-x'), `https://github.com/${FENCE_OWNER}/probe-u4-x.git`);
  });

  test('a push to the origin URL lands in the fence, a push to another github repo fails on a missing folder, and https is refused as a transport', () => inTemp('q18-fence-', (root) => {
    const ws = path.join(root, 'ws');
    fs.mkdirSync(ws);
    const fx = fencedRepo(ws);
    assert.ok(fx.repo.startsWith(ws) && fx.bare.startsWith(path.join(ws, 'fence')) && fx.ghConfig.startsWith(ws), 'every folder inside the workspace');
    assert.deepEqual(fs.readdirSync(fx.ghConfig), []);
    const env = sessionEnv(path.join(root, 'out'), fenceEnv(fx));
    const proof = proveFence(fx, env);
    assert.deepEqual({ ok: proof.ok, landed: proof.landed, refused: proof.refused, why: proof.why }, { ok: true, landed: true, refused: true, why: null });
    const git = (args) => spawnSync('git', ['-C', fx.repo, ...args], { env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000 });
    const origin = git(['push', 'origin', 'HEAD:refs/heads/through-origin']);
    assert.equal(origin.status, 0, origin.stderr);
    const refs = spawnSync('git', ['--git-dir', fx.bare, 'for-each-ref', '--format=%(refname)'], { encoding: 'utf8', shell: false, windowsHide: true });
    assert.match(refs.stdout, /refs\/heads\/through-origin/);
    const other = git(['push', `https://github.com/${FENCE_OWNER}/some-real-repo.git`, 'HEAD:refs/heads/x']);
    assert.notEqual(other.status, 0);
    assert.match(other.stderr, /does not appear to be a git repository/);
    for (const url of ['git@github.com:someone/x.git', 'ssh://git@github.com/someone/x.git']) {
      const ssh = git(['push', url, 'HEAD:refs/heads/x']);
      assert.notEqual(ssh.status, 0, url);
      assert.match(ssh.stderr, /transport 'ssh' not allowed/, url);
    }
  }));

  test('proveFence fails, and says so, when the rewrite is missing or the bare is gone', () => inTemp('q18-fence-', (root) => {
    const ws = path.join(root, 'ws');
    fs.mkdirSync(ws);
    const fx = fencedRepo(ws);
    const full = fenceEnv(fx);
    const noRewrite = { ...full, GIT_CONFIG_COUNT: '1' };
    const p1 = proveFence(fx, sessionEnv(path.join(root, 'out'), noRewrite));
    assert.equal(p1.ok, false);
    assert.equal(p1.landed, false);
    assert.match(p1.why, /fence proof failed/);
    fs.rmSync(fx.bare, { recursive: true, force: true });
    const p2 = proveFence(fx, sessionEnv(path.join(root, 'out'), full));
    assert.equal(p2.ok, false);
  }));

  test('proveFence needs all three: a push that lands somewhere else, or https left open, fails it', () => inTemp('q18-fence-', (root) => {
    const ws = path.join(root, 'ws');
    fs.mkdirSync(ws);
    const fx = fencedRepo(ws);
    const env = sessionEnv(path.join(root, 'out'), fenceEnv(fx));
    // The push succeeds into the real fence, but the bare checked is another one.
    const other = path.join(root, 'other.git');
    assert.equal(spawnSync('git', ['init', '-q', '--bare', other], { encoding: 'utf8', shell: false, windowsHide: true }).status, 0);
    const elsewhere = proveFence({ ...fx, bare: other }, env);
    assert.deepEqual([elsewhere.ok, elsewhere.landed, elsewhere.refused], [false, false, true]);
    // https not blocked: the push fails on connecting (to a closed local
    // proxy port, so nothing leaves the machine), not as a refused
    // transport, so the fence is unproven.
    const open = { ...env, GIT_CONFIG_COUNT: '4', GIT_CONFIG_KEY_3: 'http.proxy', GIT_CONFIG_VALUE_3: 'http://127.0.0.1:9' };
    delete open.GIT_ALLOW_PROTOCOL;
    const p = proveFence(fx, open);
    assert.deepEqual([p.ok, p.landed, p.refused], [false, true, false]);
    assert.match(p.why, /https refused false/);
  }));
});

describe('Q18: skillOutcome, one Skill call as the CLI answered it', () => {
  const res = (text, isError = true) => ({ answered: true, isError, text });
  const dec = (decision, reasonCode, reasonType) => ({ decision, source: 'config', reasonType, ...(reasonCode ? { reasonCode } : {}) });

  test('by the rule: a reject with a rule: reasonCode; or, with no decision recorded, a stream denial of type rule', () => {
    const a = skillOutcome({ result: res(RULE_TEXT), decision: dec('reject', 'rule:flagSettings', 'rule'), denied: { decision_reason_type: 'rule' } });
    assert.deepEqual([a.kind, a.via, a.code, a.type, a.streamType], ['rule', 'transcript', 'rule:flagSettings', 'rule', 'rule']);
    assert.equal(skillOutcome({ result: res(RULE_TEXT), decision: dec('reject', 'rule:userSettings', 'subcommandResults') }).kind, 'rule');
    const b = skillOutcome({ result: res(RULE_TEXT), decision: null, denied: { decision_reason_type: 'rule' } });
    assert.deepEqual([b.kind, b.via], ['rule', 'stream']);
    // A recorded decision outranks the stream: a classifier reject stays one.
    assert.equal(skillOutcome({ result: res('nope'), decision: dec('reject', 'classifier:auto-mode', 'classifier'), denied: { decision_reason_type: 'rule' } }).kind, 'other');
  });

  test('ran: the layer accepted it, or it answered without error and no decision', () => {
    assert.equal(skillOutcome({ result: res('Launching skill', false), decision: dec('accept', null, 'classifier') }).kind, 'ran');
    assert.equal(skillOutcome({ result: res('Launching skill', false), decision: null }).kind, 'ran');
    // An accept that failed later still means no rule stopped it.
    assert.equal(skillOutcome({ result: res('could not be loaded'), decision: dec('accept', null, 'mode') }).kind, 'ran');
  });

  test('the input check\'s refusals, a bare rule message, another layer, and no result', () => {
    assert.equal(skillOutcome({ result: res('<tool_use_error>Skill compound-engineering:ce-work-beta cannot be used with Skill tool due to disable-model-invocation. Ask the user</tool_use_error>') }).kind, 'dmi');
    assert.ok(DMI_TEXT.test('cannot be used with Skill tool due to disable-model-invocation'));
    assert.equal(skillOutcome({ result: res('<tool_use_error>Unknown skill: ce-optimize. Did you mean x?</tool_use_error>') }).kind, 'unknown');
    assert.equal(skillOutcome({ result: res(`<tool_use_error>${RULE_TEXT}</tool_use_error>`) }).kind, 'ruleText');
    assert.equal(skillOutcome({ result: res(RULE_TEXT), denied: { decision_reason_type: 'classifier' } }).kind, 'other', 'a stream event of another type is not the rule');
    assert.equal(skillOutcome({ result: res('Skill x is not in this session\'s skills allowlist') }).kind, 'other');
    assert.equal(skillOutcome({ result: res('blocked'), decision: dec('reject', 'classifier:auto-mode', 'classifier') }).kind, 'other');
    // Only a reject counts as the rule, and a recorded decision that is
    // neither accept nor a rule reject is never read as ran, error or not.
    assert.equal(skillOutcome({ result: res('x'), decision: dec('defer', 'rule:flagSettings', 'rule') }).kind, 'other');
    assert.equal(skillOutcome({ result: res('Launching skill', false), decision: dec('reject', 'classifier:auto-mode', 'classifier') }).kind, 'other');
    for (const result of [undefined, null, { answered: false }]) assert.equal(skillOutcome({ result }).kind, 'unread');
    assert.equal(skillOutcome({ result: res('x'.repeat(500)) }).text.length, 300);
  });

  test('resultsById pairs each tool_result with its record\'s permissionDecision', () => {
    const records = [
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Skill', input: { skill: 'a' } }] } },
      { type: 'user', permissionDecision: dec('reject', 'rule:flagSettings', 'rule'), message: { content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true, content: [{ type: 'text', text: RULE_TEXT }] }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't2', content: 'Launching skill: b' }] } },
      { type: 'user', message: { content: 'a plain prompt' } },
    ];
    const m = resultsById(records);
    assert.deepEqual([...m.keys()], ['t1', 't2']);
    assert.deepEqual(m.get('t1'), { answered: true, isError: true, text: RULE_TEXT, decision: dec('reject', 'rule:flagSettings', 'rule') });
    assert.deepEqual(m.get('t2'), { answered: true, isError: false, text: 'Launching skill: b', decision: null });
  });

  test('callMatches: the planned skill and args byte for byte; no args means absent or empty', () => {
    assert.ok(callMatches({ skill: 'p:s', args: 'probe' }, { skill: 'p:s', args: 'probe' }));
    assert.ok(callMatches({ skill: 'p:s' }, { skill: 'p:s' }));
    assert.ok(callMatches({ skill: 'p:s', args: '' }, { skill: 'p:s' }));
    assert.ok(!callMatches({ skill: '/p:s' }, { skill: 'p:s' }));
    assert.ok(!callMatches({ skill: 'p:s', args: 'Probe' }, { skill: 'p:s', args: 'probe' }));
    assert.ok(!callMatches({ skill: 'p:s', args: 'probe' }, { skill: 'p:s' }));
    assert.ok(!callMatches({ skill: 'p:s' }, { skill: 'p:s', args: 'probe' }));
    assert.ok(!callMatches(null, { skill: 'p:s' }));
  });

  test('typedOutcome: expanded on the marker, unread with no prompt or no result, else refused', () => {
    assert.equal(typedOutcome({ ups: 1, result: {}, found: true }), 'expanded');
    assert.equal(typedOutcome({ ups: 0, result: null, found: true }), 'expanded');
    assert.equal(typedOutcome({ ups: 1, result: {}, found: false }), 'refused');
    assert.equal(typedOutcome({ ups: 0, result: {}, found: false }), 'unread');
    assert.equal(typedOutcome({ ups: 1, result: null, found: false }), 'unread');
  });
});

describe('Q18: decide over every arm\'s row', () => {
  const RULE = { kind: 'rule', via: 'transcript', code: 'rule:flagSettings', type: 'rule', streamType: 'rule', text: RULE_TEXT };
  const UNKNOWN = (name) => ({ kind: 'unknown', via: 'result', code: null, type: null, streamType: null, text: `<tool_use_error>Unknown skill: ${name}. Did you mean x:${name}? Invoke it by that full name.</tool_use_error>` });
  const clean = () => ARMS.map((a) => {
    const base = { arm: a.name, kind: a.kind, expect: a.expect, ctl: !!a.ctl, bareCommand: !!a.bareCommand, call: a.call, cmd: a.cmd ?? '/q18-typed-x', names: a.names, target: a.target ?? 'q18-typed-x', launched: true, initMode: 'auto', initTools: ['Skill'], listed: true };
    if (a.kind === 'typed') return { ...base, outcome: 'expanded' };
    // As 2.1.309 measured: commit-push-pr's bare name, and its undenied
    // sibling's, are refused as unknown skills before any rule.
    const outcome = a.bareCommand || a.expect === 'observe' ? UNKNOWN(a.call.skill)
      : a.expect === 'rule' ? RULE
      : a.expect === 'dmi' ? { kind: 'dmi', via: 'result', code: null, type: null, streamType: null, text: 'cannot be used with Skill tool due to disable-model-invocation' }
        : { kind: 'ran', via: 'transcript', code: null, type: 'classifier', streamType: null, text: 'Launching skill' };
    return { ...base, sent: { ...a.call }, reached: true, outcome };
  });
  const patch = (rows, arm, p) => {
    assert.ok(rows.some((r) => r.arm === arm), arm);
    return rows.map((r) => (r.arm === arm ? { ...r, ...p } : r));
  };
  const out = (kind, extra = {}) => ({ ...RULE, kind, ...extra });

  test('a run that holds is VERIFIED, by the rule\'s code, whether the transcript or the stream recorded it', () => {
    const v = decide18(clean());
    assert.equal(v.verdict, 'VERIFIED', v.summary);
    assert.match(v.summary, /11 of the 12 model calls/);
    assert.match(v.summary, /rule:flagSettings/);
    assert.match(v.summary, /cpp-bare \(commit-push-pr\) never reached a rule: the Skill tool's input check refused the bare name as an unknown skill/);
    assert.match(v.summary, /interactive composer was not driven/);
    const stream = decide18(patch(clean(), 'resolve-bare', { outcome: { ...RULE, via: 'stream', code: null } }));
    assert.equal(stream.verdict, 'VERIFIED', stream.summary);
    assert.match(stream.summary, /stream rule/);
    // A later CLI that gives commands a bare alias would refuse it by the rule: that holds too.
    const ruled = decide18(patch(clean(), 'cpp-bare', { outcome: RULE }));
    assert.equal(ruled.verdict, 'VERIFIED', ruled.summary);
    assert.match(ruled.summary, /12 of the 12 model calls/);
    assert.doesNotMatch(ruled.summary, /never reached a rule/);
  });

  test('a plugin command\'s bare name refused as unknown holds only beside the bare-name control refused the same way', () => {
    const resolved = decide18(patch(clean(), 'cmdbare-control', { outcome: out('ran', { code: null, text: 'Launching skill: commit-commands:commit' }) }));
    assert.equal(resolved.verdict, 'PARTIAL');
    assert.match(resolved.summary, /^cpp-bare: refused at the input check as an unknown skill .* while the undenied commit-commands:commit ran by its bare name/);
    for (const [p, re] of [
      [{ reached: false, sent: { skill: 'commit-commands:commit' } }, /cmdbare-control: the model did not send/],
      [{ outcome: out('other', { code: 'classifier:auto-mode', text: 'blocked' }) }, /cmdbare-control: the bare name of the undenied command was neither run nor refused as unknown/],
      [{ outcome: out('unread', { code: null }) }, /cmdbare-control: the bare name of the undenied command was neither run nor refused/],
      [{ launched: false, why: 'x' }, /cpp-bare: refused at the input check as an unknown skill, and the bare-name control \(missing\)/],
    ]) {
      const v = decide18(patch(clean(), 'cmdbare-control', p));
      assert.equal(v.verdict, 'INCONCLUSIVE', JSON.stringify(p));
      assert.match(v.summary, re);
    }
    const gone = decide18(clean().filter((r) => r.arm !== 'cmdbare-control'));
    assert.equal(gone.verdict, 'INCONCLUSIVE');
    assert.match(gone.summary, /bare-name control \(missing\)/);
    // A plugin SKILL's bare name has an alias: refused as unknown there stays PARTIAL, control or not.
    assert.equal(decide18(patch(clean(), 'resolve-bare', { outcome: UNKNOWN('ce-resolve-pr-feedback') })).verdict, 'PARTIAL');
    // And the denied command running by its bare name is CONTRADICTED whatever the control says.
    assert.equal(decide18(patch(clean(), 'cpp-bare', { outcome: out('ran', { code: null }) })).verdict, 'CONTRADICTED');
  });

  test('a denied skill that ran is CONTRADICTED, even with every control failed', () => {
    const ran = out('ran', { code: null });
    const v = decide18(patch(clean(), 'riffrec-noargs', { outcome: ran }));
    assert.equal(v.verdict, 'CONTRADICTED');
    assert.match(v.summary, /^riffrec-noargs: the denied skill RAN/);
    let rows = patch(clean(), 'cpp-bare', { outcome: ran, sent: { skill: '/commit-push-pr' }, reached: false });
    rows = patch(rows, 'control', { outcome: out('other') });
    rows = patch(rows, 'typed-ctl-plugin', { outcome: 'refused' });
    const w = decide18(rows);
    assert.equal(w.verdict, 'CONTRADICTED', 'a leading slash still names the denied skill');
    assert.match(w.summary, /also unread/);
    // A call to some other skill that ran says nothing about the deny.
    const other = decide18(patch(clean(), 'optimize-args', { outcome: ran, sent: { skill: 'compound-engineering:ce-plan' }, reached: false }));
    assert.equal(other.verdict, 'INCONCLUSIVE');
    assert.match(other.summary, /did not send/);
  });

  test('every Skill call is judged, not only the first (R2-D): a later call that ran any of the five denied skills, by either name, in any arm, is CONTRADICTED', () => {
    assert.deepEqual(DENIED_NAMES, DENIED.flatMap((n) => [n, n.split(':')[1]]), 'the five qualified names and their bare forms');
    const call = (skill, outcome) => ({ input: { skill }, outcome, pre: false });
    const first = (r) => call(r.sent.skill, r.outcome.kind);
    const later = (arm, skill, outcome = 'ran') => (rows) => rows.map((r) => (r.arm === arm ? { ...r, skillCalls: [...(r.kind === 'model' ? [first(r)] : []), call(skill, outcome)] } : r));
    const cases = [
      ['control', 'compound-engineering:ce-optimize', /control: Skill call 2 of 2, to compound-engineering:ce-optimize, RAN/],
      ['cmdbare-control', 'ce-riffrec-feedback-analysis', /cmdbare-control: Skill call 2 of 2, to ce-riffrec-feedback-analysis, RAN/],
      ['workbeta-dmi', 'compound-engineering:ce-work-beta', /workbeta-dmi: Skill call 2 of 2, to compound-engineering:ce-work-beta, RAN/],
      ['typed-cpp', '/commit-commands:commit-push-pr', /typed-cpp: Skill call 1 of 1, to commit-commands:commit-push-pr, RAN/],
      ['typed-ctl-project', 'ce-work-beta', /typed-ctl-project: Skill call 1 of 1, to ce-work-beta, RAN/],
    ];
    for (const [arm, skill, re] of cases) {
      const v = decide18(later(arm, skill)(clean()));
      assert.equal(v.verdict, 'CONTRADICTED', `${arm}: ${v.summary}`);
      assert.match(v.summary, re, arm);
    }
    // A later call refused, or one to an undenied skill that ran, says nothing about the deny.
    assert.equal(decide18(later('control', 'compound-engineering:ce-optimize', 'rule')(clean())).verdict, 'VERIFIED');
    assert.equal(decide18(later('typed-cpp', 'compound-engineering:ce-plan')(clean())).verdict, 'VERIFIED');
    // A first call to its own arm's name is reported once, by the arm's own judgment.
    const ran = out('ran', { code: null });
    const own = decide18(patch(clean(), 'riffrec-noargs', { outcome: ran, skillCalls: [call('compound-engineering:ce-riffrec-feedback-analysis', 'ran')] }));
    assert.equal(own.verdict, 'CONTRADICTED');
    assert.equal((own.summary.match(/riffrec-noargs/g) ?? []).length, 1, own.summary);
    // A first call that ran ANOTHER denied skill is caught by the scan, not lost as "did not send".
    const wrong = decide18(patch(clean(), 'riffrec-noargs', { outcome: ran, sent: { skill: 'compound-engineering:ce-optimize' }, reached: false, skillCalls: [call('compound-engineering:ce-optimize', 'ran')] }));
    assert.equal(wrong.verdict, 'CONTRADICTED', wrong.summary);
    assert.match(wrong.summary, /riffrec-noargs: Skill call 1 of 1, to compound-engineering:ce-optimize, RAN/);
  });

  test('more than one Skill call in an arm that expects the rule\'s refusal is INCONCLUSIVE: the first call\'s reading is not the whole session\'s', () => {
    const rows = clean().map((r) => (r.arm === 'optimize-args' ? { ...r, skillCalls: [{ input: r.sent, outcome: 'rule', pre: false }, { input: r.sent, outcome: 'rule', pre: false }] } : r));
    const v = decide18(rows);
    assert.equal(v.verdict, 'INCONCLUSIVE', v.summary);
    assert.match(v.summary, /optimize-args: 2 Skill calls, and the arm asks for one/);
    const ctl = clean().map((r) => (r.arm === 'control' ? { ...r, skillCalls: [{ input: r.sent, outcome: 'ran' }, { input: { skill: 'compound-engineering:ce-plan' }, outcome: 'ran' }] } : r));
    assert.equal(decide18(ctl).verdict, 'VERIFIED', 'a control arm may make two calls to undenied skills');
  });

  test('another layer refusing a denied call is CONTRADICTED while the control loaded, INCONCLUSIVE once it did not', () => {
    const classifier = out('other', { code: 'classifier:auto-mode', type: 'classifier', streamType: 'classifier', text: 'blocked' });
    const v = decide18(patch(clean(), 'resolve-args', { outcome: classifier }));
    assert.equal(v.verdict, 'CONTRADICTED');
    assert.match(v.summary, /resolve-args: refused by another layer, not by the rule \(other classifier:auto-mode/);
    const rows = patch(patch(clean(), 'resolve-args', { outcome: classifier }), 'control', { outcome: classifier });
    const w = decide18(rows);
    assert.equal(w.verdict, 'INCONCLUSIVE');
    assert.match(w.summary, /control: the undenied compound-engineering:ce-strategy did not load/);
    assert.match(w.summary, /the control failed, so this may be that layer refusing every skill/);
  });

  test('a refusal before any rule was read is PARTIAL, a measured deviation that counts as measured', () => {
    const v = decide18(patch(clean(), 'optimize-bare', { outcome: out('unknown', { code: null, text: 'Unknown skill: ce-optimize' }) }));
    assert.equal(v.verdict, 'PARTIAL');
    assert.match(v.summary, /^optimize-bare: refused before any rule was read \(unknown/);
    assert.equal(v.unsettledOnly, undefined);
    assert.equal(measured({ id: 'Q18', ...v }), true);
    assert.equal(decide18(patch(clean(), 'cpp-noargs', { outcome: out('dmi', { code: null }) })).verdict, 'PARTIAL');
  });

  test('ce-work-beta: its own refusal holds; the rule first is PARTIAL; running is CONTRADICTED; no result is INCONCLUSIVE', () => {
    assert.equal(decide18(patch(clean(), 'workbeta-dmi', { outcome: RULE })).verdict, 'PARTIAL');
    assert.match(decide18(patch(clean(), 'workbeta-dmi', { outcome: RULE })).summary, /not by its disable-model-invocation first/);
    assert.equal(decide18(patch(clean(), 'workbeta-dmi', { outcome: out('ran', { code: null }) })).verdict, 'CONTRADICTED');
    assert.equal(decide18(patch(clean(), 'workbeta-dmi', { outcome: out('unread', { code: null }) })).verdict, 'INCONCLUSIVE');
    assert.equal(decide18(patch(clean(), 'workbeta-dmi', { sent: { skill: 'ce-work' }, reached: false, outcome: out('unknown') })).verdict, 'INCONCLUSIVE');
  });

  test('a call not sent byte for byte, no result, or a rule message with no layer recorded is INCONCLUSIVE', () => {
    for (const p of [
      { sent: { skill: 'compound-engineering:ce-optimize', args: 'x' }, reached: false },
      { sent: null, reached: false, outcome: out('unread', { code: null }) },
      { outcome: out('unread', { code: null }) },
      { outcome: out('ruleText', { code: null, type: null, streamType: null }) },
    ]) {
      const v = decide18(patch(clean(), 'optimize-args', p));
      assert.equal(v.verdict, 'INCONCLUSIVE', JSON.stringify(p));
      assert.match(v.summary, /^optimize-args: /);
    }
  });

  test('every session must be in auto mode, hold only Skill, list its target, and have launched', () => {
    for (const [p, re] of [
      [{ initMode: 'default' }, /permissionMode is "default", not auto/],
      [{ initMode: undefined }, /permissionMode is null/],
      [{ initTools: ['Skill', 'Bash'] }, /holds \["Bash"\] beside Skill/],
      [{ initTools: null }, /no init tool list/],
      [{ listed: false }, /do not list commit-commands:commit-push-pr/],
      [{ listed: null }, /do not list/],
      [{ launched: false, why: 'the fence proof failed' }, /not launched \(the fence proof failed\)/],
    ]) {
      const v = decide18(patch(clean(), 'cpp-args', p));
      assert.equal(v.verdict, 'INCONCLUSIVE', JSON.stringify(p));
      assert.match(v.summary, re);
    }
  });

  test('a typed command that did not expand is CONTRADICTED only beside both typed controls and its own listing', () => {
    const v = decide18(patch(clean(), 'typed-cpp', { outcome: 'refused' }));
    assert.equal(v.verdict, 'CONTRADICTED');
    assert.match(v.summary, /typed-cpp: typed \/commit-commands:commit-push-pr did NOT expand under the deny/);
    assert.match(v.summary, /8a\.7/);
    for (const ctl of ['typed-ctl-project', 'typed-ctl-plugin']) {
      for (const o of ['refused', 'unread']) {
        const w = decide18(patch(patch(clean(), 'typed-resolve', { outcome: 'refused' }), ctl, { outcome: o }));
        assert.equal(w.verdict, 'INCONCLUSIVE', `${ctl} ${o}`);
        assert.match(w.summary, new RegExp(`${ctl}: the typed control did not expand`));
      }
    }
    const notListed = decide18(patch(clean(), 'typed-resolve', { outcome: 'refused', listed: false }));
    assert.equal(notListed.verdict, 'INCONCLUSIVE');
    const unread = decide18(patch(clean(), 'typed-resolve', { outcome: 'unread' }));
    assert.equal(unread.verdict, 'INCONCLUSIVE');
    assert.match(unread.summary, /left no prompt or result/);
  });

  test('precedence: CONTRADICTED over INCONCLUSIVE over PARTIAL, each naming the others', () => {
    let rows = patch(clean(), 'optimize-bare', { outcome: out('unknown') });
    rows = patch(rows, 'riffrec-args', { initMode: 'default' });
    const i = decide18(rows);
    assert.equal(i.verdict, 'INCONCLUSIVE');
    assert.match(i.summary, /also: optimize-bare/);
    rows = patch(rows, 'resolve-noargs', { outcome: out('ran') });
    const c = decide18(rows);
    assert.equal(c.verdict, 'CONTRADICTED');
    assert.match(c.summary, /^resolve-noargs: the denied skill RAN.*also unread: riffrec-args.*also: optimize-bare/);
  });
});

describe('Q19: the def and the lens it copies', () => {
  test('the def loads as Q19 with its own ceiling, carries no catalog pin, and decides through judgeWorkflow, judgeAgent and decide', () => {
    assert.equal(q19.id, 'Q19');
    assert.equal(q19.loadBearing, false);
    assert.equal(q19.timeoutMs, Q19_MS);
    assert.ok(Q19_MS > 0 && Q19_MS < 2 ** 31);
    const src = fs.readFileSync(path.join(HOOKS, 'probes', 'defs', 'q19-review-lens.mjs'), 'utf8');
    assert.doesNotMatch(src, /CATALOG_SHA256/);
    const run = q19.run.toString();
    for (const re of [/copyLens\(LENS_SOURCE/, /STUB_MCP/, /'--mcp-config'/, /ENABLE_TOOL_SEARCH: searchOn \? 'true' : 'false'/, /'--tools', \['Workflow', \.\.\.\(searchOn \? SEARCH_POOL : POOL\)\]/, /'--tools', \['Agent', \.\.\.SEARCH_POOL\]/, /mainTools: X\.S\.mainTools/, /\['wf-on', true\], \['wf-off', false\]/, /'--model', 'sonnet'/, /agentType: '\$\{LENS\}', schema: SCHEMA, model: 'opus'/, /judgeWorkflow\(s\)/, /judgeAgent\(r\)/, /decide\(\{ copies, judged \}\)/, /permissions: \{ allow: \[MCP_TOOL\] \}/]) assert.match(run, re);
    assert.match(run, /Do not pass a model, run_in_background or any other optional parameter/);
    assert.equal(DENY_REASON.length > 10, true);
  });

  test('LENS_SOURCE is the tracked review-lens file, and it says what Q19 tests', () => {
    assert.equal(LENS_SOURCE, path.join(HOOKS, '..', 'skills', 'ultramode-code-review', 'agents', 'review-lens.md'));
    const text = fs.readFileSync(LENS_SOURCE, 'utf8').replace(/\r\n/g, '\n');
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '';
    assert.match(fm, /^name: review-lens$/m);
    assert.match(fm, /^tools: Read, Grep, Glob$/m);
    assert.match(fm, /^model: opus$/m);
    assert.equal(LENS, 'review-lens');
    assert.deepEqual(LENS_TOOLS, ['Read', 'Grep', 'Glob']);
    assert.deepEqual(LENS_EXTRAS, ['StructuredOutput', 'advisor']);
    assert.deepEqual(LENS_ALLOWED, [...LENS_TOOLS, ...LENS_EXTRAS]);
    assert.deepEqual(TOOL_SEARCH, ['ToolSearch', 'DeferredToolPlaceholder']);
    // --tools names the whole built-in set: a tool-search-on session needs
    // ToolSearch named (measured on 2.1.309), and the pool holds tools a lens
    // must not get, so a leak can be seen.
    assert.deepEqual(POOL, ['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit']);
    assert.deepEqual(SEARCH_POOL, [...POOL, 'ToolSearch']);
  });

  test('copyLens: a byte copy in <ws>/.claude/agents, both hashes recorded', () => inTemp('q19-lens-', (root) => {
    const src = path.join(root, 'src.md');
    const bytes = Buffer.from('---\r\nname: review-lens\r\n---\r\nbody \u00e9\n');
    fs.writeFileSync(src, bytes);
    const ws = path.join(root, 'ws');
    fs.mkdirSync(ws);
    const c = copyLens(src, ws);
    assert.deepEqual(c, { ok: true, source: sha(bytes), copy: sha(bytes) });
    assert.deepEqual(fs.readFileSync(path.join(ws, '.claude', 'agents', 'review-lens.md')), bytes);
  }));

  test('sameBytes: equal bytes are ok; one byte or a line ending changed is not, both hashes named', () => {
    const a = Buffer.from('name: review-lens\r\n');
    assert.deepEqual(sameBytes(a, Buffer.from(a)), { ok: true, source: sha(a), copy: sha(a) });
    const lf = Buffer.from('name: review-lens\n');
    assert.deepEqual(sameBytes(a, lf), { ok: false, source: sha(a), copy: sha(lf) });
    assert.equal(sameBytes(a, Buffer.from('name: review-lenS\r\n')).ok, false);
  });

  test('the schema: every key required and defined, nothing else allowed; every probe task fits in a single-quoted script string', () => {
    assert.equal(SCHEMA.additionalProperties, false);
    assert.deepEqual([...SCHEMA.required].sort(), Object.keys(SCHEMA.properties).sort());
    for (const schema of [true, false]) {
      const t = probeTask('LENSABC', 'LENSWORD-1A2B3C', schema);
      assert.doesNotMatch(t, /['"\\\n]/);
      assert.ok(t.includes(`select:${MCP_TOOL}`) && t.includes('the tag LENSABC') && t.includes('LENSWORD-1A2B3C'));
    }
    assert.match(probeTask('T', 'W', true), /structured output/);
    assert.match(probeTask('T', 'W', false), /WORD: W$/);
  });
});

describe('Q19: the logging stub MCP server', () => {
  const msg = (o) => `${JSON.stringify({ jsonrpc: '2.0', ...o })}\n`;
  // Runs the stub with its log file, writes the chunks (a pause between
  // them), closes stdin and resolves with its exit, stderr and replies.
  const talk = (file, log, chunks) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, log], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8').on('data', (d) => { out += d; });
    child.stderr.setEncoding('utf8').on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      try { resolve({ code, err, replies: out.split('\n').filter(Boolean).map((l) => JSON.parse(l)) }); } catch (e) { reject(e); }
    });
    (async () => {
      for (const c of chunks) { child.stdin.write(c); await sleep(20); }
      child.stdin.end();
    })();
  });

  test('it answers like Q15\'s stub and logs each listing and each call\'s tag, one JSON line each', { timeout: 15_000 }, () => inTemp('q19-stub-', async (root) => {
    const file = path.join(root, 'stub.cjs');
    const log = path.join(root, 'log.jsonl');
    fs.writeFileSync(file, STUB_MCP);
    const r = await talk(file, log, [
      msg({ id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {} } }),
      msg({ method: 'notifications/initialized' }),
      msg({ id: 2, method: 'tools/list', params: {} }),
      msg({ id: 3, method: 'tools/call', params: { name: 'stub_log', arguments: { tag: 'LENSX' } } }),
      'not json\n',
      msg({ id: 4, method: 'tools/call', params: { name: 'stub_log', arguments: {} } }),
      msg({ id: 5, method: 'tools/call', params: { name: 'nope', arguments: { tag: 'Y' } } }),
      msg({ id: 6, method: 'ping' }),
      msg({ id: 7, method: 'resources/list' }),
    ]);
    assert.equal(r.code, 0, r.err);
    assert.equal(r.err, '');
    assert.deepEqual(r.replies.map((x) => x.id), [1, 2, 3, 4, 5, 6, 7]);
    const [init, list, call] = r.replies;
    assert.equal(init.result.protocolVersion, '2025-03-26');
    assert.equal(init.result.serverInfo.name, MCP_SERVER);
    assert.equal(`mcp__${MCP_SERVER}__${list.result.tools[0].name}`, MCP_TOOL);
    assert.deepEqual(list.result.tools[0].inputSchema.required, ['tag']);
    assert.deepEqual(call.result, { content: [{ type: 'text', text: 'Q19_STUB_OK' }] });
    assert.equal(r.replies[4].error.code, -32602);
    assert.deepEqual(r.replies[5].result, {});
    assert.equal(r.replies[6].error.code, -32601);
    const lines = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual(lines, [
      { method: 'tools/list' },
      { method: 'tools/call', name: 'stub_log', tag: 'LENSX' },
      { method: 'tools/call', name: 'stub_log', tag: null },
      { method: 'tools/call', name: 'nope', tag: 'Y' },
    ]);
  }));

  test('a log it cannot write never stops it answering', { timeout: 15_000 }, () => inTemp('q19-stub-', async (root) => {
    const file = path.join(root, 'stub.cjs');
    fs.writeFileSync(file, STUB_MCP);
    const r = await talk(file, path.join(root, 'no', 'such', 'dir', 'log.jsonl'), [msg({ id: 1, method: 'tools/list' }), msg({ id: 2, method: 'tools/call', params: { name: 'stub_log', arguments: { tag: 'T' } } })]);
    assert.equal(r.code, 0, r.err);
    assert.deepEqual(r.replies.map((x) => x.id), [1, 2]);
  }));
});

describe('Q19: lensFacts and resultKind', () => {
  const lens = (over = {}) => ({ id: 'aa11', tools: ['Read', 'Grep', 'Glob', 'StructuredOutput', 'advisor'], shapes: 2, models: ['claude-opus-5-5'], last: '', searchCalls: [], stubCalls: [], ...over });

  test('a clean lens: no leak, nothing missing, no reach', () => {
    const f = lensFacts(lens(), { pre: [], log: [], tag: 'L' });
    assert.deepEqual([f.leaks, f.missing, f.search, f.called, f.reached, f.tried, f.logged], [[], [], [], [], [], false, 0]);
  });

  test('leaks: a pool tool or an MCP tool; the tool-search pair is no leak; missing allowlisted tools are named', () => {
    const f = lensFacts(lens({ tools: ['Read', 'Glob', 'Bash', 'ToolSearch', 'DeferredToolPlaceholder', MCP_TOOL, 'StructuredOutput'] }), { tag: 'L' });
    assert.deepEqual(f.leaks, ['Bash', MCP_TOOL]);
    assert.deepEqual(f.missing, ['Grep']);
    assert.deepEqual(f.search, ['ToolSearch', 'DeferredToolPlaceholder']);
    assert.deepEqual(f.called, []);
    assert.equal(f.reached.length, 1);
    assert.match(f.reached[0], /request shapes offered/);
  });

  test('a stub call counts only under its own agent id or in its own transcript the CLI answered; the log counts its tag', () => {
    const pre = [{ tool: MCP_TOOL, agentId: 'zz99' }, { tool: MCP_TOOL, agentId: null }, { tool: 'ToolSearch', agentId: 'zz99' }];
    const log = [{ method: 'tools/list' }, { method: 'tools/call', name: 'stub_log', tag: 'L' }, { method: 'tools/call', name: 'stub_log', tag: 'D' }];
    const other = lensFacts(lens(), { pre, log, tag: 'L' });
    assert.deepEqual([other.called, other.tried, other.logged], [[], false, 1]);
    const own = lensFacts(lens({ id: 'zz99' }), { pre, log, tag: 'L' });
    assert.equal(own.called.length, 1);
    assert.equal(own.tried, true);
    const refused = lensFacts(lens({ stubCalls: [{ answered: true, isError: true, text: '<tool_use_error>Error: No such tool available: mcp__q19stub__stub_log</tool_use_error>' }] }), { tag: 'L' });
    assert.deepEqual(refused.called, []);
    const taken = lensFacts(lens({ stubCalls: [{ answered: true, isError: false, text: 'Q19_STUB_OK' }], searchCalls: [{ input: {} }] }), { tag: 'L' });
    assert.equal(taken.called.length, 1);
    assert.equal(taken.tried, true);
    assert.equal(lensFacts(lens({ stubCalls: [{ answered: false }] }), { tag: 'L' }).called.length, 0);
  });

  test('no request shape: nothing read, so no leak or missing tool is claimed', () => {
    for (const a of [null, lens({ shapes: 0 })]) {
      const f = lensFacts(a, { tag: 'L' });
      assert.deepEqual([f.tools, f.leaks, f.missing], [null, [], []]);
    }
  });

  test('resultKind: an object (with or without its word), the agent-type miss, another throw, text, null, missing', () => {
    assert.deepEqual(resultKind({ word: 'W' }, 'W'), { kind: 'object', word: true, value: { word: 'W' } });
    assert.equal(resultKind({ word: 'X' }, 'W').word, false);
    const miss = resultKind(`THREW: Agent type '${LENS}' not found. Available agents: general-purpose`, 'W');
    assert.deepEqual([miss.kind, miss.unresolved], ['threw', true]);
    assert.deepEqual([resultKind('THREW: schema failed', 'W').kind, resultKind('THREW: schema failed', 'W').unresolved], ['threw', false]);
    assert.equal(resultKind('THREW: Agent type \'other\' not found', 'W').unresolved, false);
    assert.equal(resultKind('the tools are Read', 'W').kind, 'text');
    assert.equal(resultKind(['a'], 'W').kind, 'text');
    assert.equal(resultKind(null, 'W').kind, 'null');
    assert.equal(resultKind(undefined, 'W').kind, 'missing');
  });
});

describe('Q19: judgeWorkflow, judgeAgent and decide', () => {
  const lens = (over = {}) => ({ id: 'aa11', type: LENS, tools: ['Glob', 'Grep', 'Read', 'StructuredOutput', 'advisor'], shapes: 2, models: ['claude-opus-5-5'], last: '', searchCalls: [], stubCalls: [], ...over });
  const def = (on) => ({ id: 'bb22', type: 'general-purpose', tools: ['Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Write', 'StructuredOutput', 'advisor', ...(on ? ['ToolSearch', 'DeferredToolPlaceholder', MCP_TOOL] : [MCP_TOOL])], shapes: 3, models: ['claude-opus-5-5'], last: '', searchCalls: on ? [{ input: { query: `select:${MCP_TOOL}` } }] : [], stubCalls: [{ answered: true, isError: false, text: 'Q19_STUB_OK' }] });
  const wf = (on, over = {}) => ({
    name: on ? 'wf-on' : 'wf-off',
    wf: { found: true, intact: true, status: 'completed' },
    lens: lens(), def: def(on),
    result: { lens: { tools: ['Read', 'Grep', 'Glob'], toolSearch: 'absent', stub: 'unavailable', word: 'LW-1' }, def: { tools: [], toolSearch: on ? 'called' : 'absent', stub: 'called', word: 'DW-1' } },
    pre: [{ tool: MCP_TOOL, agentId: 'bb22' }],
    log: [{ method: 'tools/list' }, { method: 'tools/call', name: 'stub_log', tag: 'DEFX' }],
    tags: { lens: 'LENSX', def: 'DEFX' }, words: { lens: 'LW-1', def: 'DW-1' }, searchOn: on,
    ...over,
  });
  const ag = (over = {}) => ({ ref: lens({ id: 'cc33', last: 'TOOLS: Read, Grep, Glob; TOOLSEARCH: absent; STUB: unavailable; WORD: RW-1' }), call: { subagentType: LENS }, mainModels: ['claude-sonnet-5-5'], mainTools: ['Agent', 'Bash', 'Read', 'ToolSearch', 'DeferredToolPlaceholder'], pre: [], log: [{ method: 'tools/list' }], tag: 'REFX', listed: 1, word: 'RW-1', ...over });
  const empty = { contradicted: [], blind: [] };

  test('clean sessions judge clean, and decide reads VERIFIED with the source\'s sha', () => {
    assert.deepEqual(judgeWorkflow(wf(true)), empty);
    assert.deepEqual(judgeWorkflow(wf(false)), empty);
    assert.deepEqual(judgeAgent(ag()), empty);
    const copies = ['wf-on', 'wf-off', 'agent'].map((arm) => ({ arm, ok: true, source: 'f'.repeat(64), copy: 'f'.repeat(64) }));
    const v = decide19({ copies, judged: [judgeWorkflow(wf(true)), judgeWorkflow(wf(false)), judgeAgent(ag())] });
    assert.equal(v.verdict, 'VERIFIED', v.summary);
    assert.match(v.summary, new RegExp(`sha256 ${'f'.repeat(64)}`));
  });

  test('the lens may hold ToolSearch once it tried it and reached nothing; never tried is unread', () => {
    const tried = lens({ tools: [...lens().tools, 'ToolSearch', 'DeferredToolPlaceholder'], searchCalls: [{ input: { query: `select:${MCP_TOOL}` }, answered: true, text: 'No matching deferred tools found' }] });
    assert.deepEqual(judgeWorkflow(wf(true, { lens: tried })), empty);
    const untried = judgeWorkflow(wf(true, { lens: { ...tried, searchCalls: [] } }));
    assert.deepEqual(untried.contradicted, []);
    assert.match(untried.blind.join(), /offered ToolSearch but never called it/);
    // The placeholder alone, with no ToolSearch to load through, is nothing to try.
    assert.deepEqual(judgeWorkflow(wf(true, { lens: lens({ tools: [...lens().tools, 'DeferredToolPlaceholder'] }) })), empty);
  });

  test('measured deviations on the workflow path are CONTRADICTED, each named', () => {
    for (const [over, re] of [
      [{ lens: lens({ tools: [...lens().tools, 'Bash'] }) }, /wf-on: the lens was offered \["Bash"\] outside/],
      [{ lens: lens({ tools: [...lens().tools, 'ToolSearch', MCP_TOOL], searchCalls: [{}] }) }, /reached the stub MCP tool \(its request shapes offered/],
      [{ lens: lens({ tools: ['Read', 'StructuredOutput'] }) }, /not offered its allowlisted \["Grep","Glob"\]/],
      [{ lens: lens({ type: 'general-purpose' }) }, /the lens ran as "general-purpose", not review-lens/],
      [{ pre: [{ tool: MCP_TOOL, agentId: 'aa11' }, { tool: MCP_TOOL, agentId: 'bb22' }] }, /the lens reached the stub MCP tool \(PreToolUse saw 1 stub call/],
      [{ result: { lens: `THREW: Agent type '${LENS}' not found. Available agents: x`, def: {} } }, /agentType 'review-lens' did not resolve/],
      [{ result: { lens: 'Read, Grep, Glob', def: {} } }, /returned text, not the schema's object/],
    ]) {
      const j = judgeWorkflow(wf(true, over));
      assert.ok(j.contradicted.some((c) => re.test(c)), `${re}: ${JSON.stringify(j)}`);
      assert.equal(decide19({ copies: [], judged: [j] }).verdict, 'CONTRADICTED');
    }
  });

  test('records and controls that could not be read are INCONCLUSIVE', () => {
    for (const [on, over, re] of [
      [true, { wf: { found: false, intact: false } }, /record not found/],
      [true, { wf: { found: true, intact: false } }, /script changed/],
      [true, { lens: null }, /no transcript for the lens/],
      [true, { lens: lens({ shapes: 0 }) }, /no request shape for the lens/],
      [true, { lens: lens({ type: null }) }, /type was not recorded/],
      [true, { def: null }, /no transcript for the default agent/],
      [true, { def: { ...def(true), tools: def(true).tools.filter((t) => t !== 'Bash') } }, /not offered Bash/],
      [true, { def: { ...def(true), tools: def(true).tools.filter((t) => t !== 'ToolSearch') } }, /did not run with tool search on/],
      [false, { def: { ...def(false), tools: [...def(false).tools, 'ToolSearch'] } }, /did not run with tool search off/],
      [true, { pre: [] , def: { ...def(true), stubCalls: [] } }, /default agent did not reach the stub/],
      [true, { log: [{ method: 'tools/list' }] }, /default agent did not reach the stub/],
      [true, { result: { lens: { word: 'other' }, def: {} } }, /without its word/],
      [true, { result: { lens: null, def: {} } }, /resolved null/],
      [true, { result: { lens: 'THREW: boom', def: {} } }, /threw \(boom\)/],
      [true, { result: {} }, /left no result/],
    ]) {
      const j = judgeWorkflow(wf(on, over));
      assert.deepEqual(j.contradicted, [], JSON.stringify(over));
      assert.ok(j.blind.some((b) => re.test(b)), `${re}: ${JSON.stringify(j.blind)}`);
      assert.equal(decide19({ copies: [], judged: [j] }).verdict, 'INCONCLUSIVE');
    }
    // A main-thread call with the default agent's tag is no reach for it.
    const mainOnly = judgeWorkflow(wf(true, { pre: [{ tool: MCP_TOOL, agentId: null }], def: { ...def(true), stubCalls: [] } }));
    assert.match(mainOnly.blind.join(), /default agent did not reach the stub/);
  });

  test('the Agent-tool spawn: leaks, reach, a wrong type and a Sonnet run are CONTRADICTED; an untestable model check is unread', () => {
    for (const [over, re] of [
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', tools: [...lens().tools, 'Write'] }) }, /spawn was offered \["Write"\] outside/],
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', stubCalls: [{ answered: true, isError: false, text: 'Q19_STUB_OK' }] }) }, /spawn reached the stub MCP tool/],
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', type: 'general-purpose' }) }, /spawn ran as "general-purpose"/],
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', models: ['claude-sonnet-5-5'] }) }, /review-lens ran on \["claude-sonnet-5-5"\], not on an Opus: its frontmatter model lost/],
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', models: ['claude-opus-5-5', 'claude-sonnet-5-5'] }) }, /not on an Opus/],
    ]) {
      const j = judgeAgent(ag(over));
      assert.ok(j.contradicted.some((c) => re.test(c)), `${re}: ${JSON.stringify(j)}`);
    }
    for (const [over, re] of [
      [{ call: null }, /made no Agent call/],
      [{ call: { subagentType: 'Explore' } }, /named "Explore"/],
      [{ ref: null }, /no transcript for the spawned agent/],
      [{ call: { subagentType: LENS, model: 'opus' } }, /passed model "opus", so the frontmatter model went untested/],
      [{ mainModels: ['claude-opus-5-5'] }, /not on Sonnet alone/],
      [{ mainModels: [] }, /not on Sonnet alone/],
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', models: [] }) }, /no model was recorded/],
      [{ ref: lens({ id: 'cc33', last: 'no word here' }) }, /reply lacks its word/],
      [{ listed: 0 }, /never answered tools\/list/],
      [{ mainTools: ['Agent', 'Bash', 'Read', 'DeferredToolPlaceholder', MCP_TOOL] }, /main session was not offered ToolSearch .* did not run with tool search on/],
      [{ mainTools: undefined }, /main session was not offered ToolSearch \(offered null\)/],
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', type: null }) }, /type was not recorded/],
      [{ ref: lens({ id: 'cc33', last: 'WORD: RW-1', tools: [...lens().tools, 'ToolSearch'] }) }, /offered ToolSearch but never called it/],
    ]) {
      const j = judgeAgent(ag(over));
      assert.deepEqual(j.contradicted, [], JSON.stringify(over));
      assert.ok(j.blind.some((b) => re.test(b)), `${re}: ${JSON.stringify(j.blind)}`);
    }
  });

  test('decide: a copy that differs is INCONCLUSIVE; a contradiction anywhere outranks every blind spot and names them', () => {
    const bad = decide19({ copies: [{ arm: 'wf-on', ok: false, source: 'a', copy: 'b' }], judged: [empty] });
    assert.equal(bad.verdict, 'INCONCLUSIVE');
    assert.match(bad.summary, /wf-on: the workspace copy of review-lens\.md differs from its source \(b vs a\)/);
    const both = decide19({ copies: [{ arm: 'agent', ok: false, source: 'a', copy: 'b' }], judged: [{ contradicted: ['x leaked'], blind: ['y unread'] }] });
    assert.equal(both.verdict, 'CONTRADICTED');
    assert.equal(both.summary, 'x leaked; also unread: agent: the workspace copy of review-lens.md differs from its source (b vs a); also unread: y unread');
    assert.equal(measured({ id: 'Q19', ...both }), true);
  });
});
