// tools/permission-patch.mjs: the U4 permission patch, user and project
// mode. Every case runs on SYNTHETIC fixtures (never a copy of real settings:
// their autoMode text is private) in a temp root of its own, removed in a
// finally that covers the whole case. Fixture paths are built from that
// root, never with the tool (insight 006). HOME and USERPROFILE point at a
// temp home for the whole file and for every child run, so a default path
// that slipped through would land there.
//
// The patch is applied by the real writer (tools/settings-write.mjs, its
// CLI), and the file it leaves is compared byte for byte with a document the
// case builds by hand from its fixture: that is the proof that every byte
// outside the planned edits is as it was. The catalog is the real one
// (lib/permission-rules.json), read as a file, as --rules reads it. Since the
// U4 cut (2026-10-27) it asks nothing, keeps tool-wide shell allows (auto
// mode drops them) and denies playwright's run-code on twelve servers, so a
// glob on one of those stays; the per-tool conversion is exercised with a
// server it does not deny (playwright-extra).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { skipsSafetyCheck } from '../lib/permissions.mjs';
import { applyOps } from '../tools/settings-write.mjs';
import { keyFor, permissionPatch, planProject, planUncatalogued, planUser, verifyPlan } from '../tools/permission-patch.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOKS = path.join(HERE, '..');
const TOOL = path.join(HOOKS, 'tools', 'permission-patch.mjs');
const WRITER = path.join(HOOKS, 'tools', 'settings-write.mjs');
const CATALOG_FILE = path.join(HOOKS, 'lib', 'permission-rules.json');
const RULES = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
const TOOLS = RULES.playwright.tools;
const MK = RULES.marketplace.name;
// The catalog's autoUpdate (true since 2026-10-27: nothing is frozen); the
// cases read it, so a later flip needs no test rewrite.
const AUTO = RULES.marketplace.autoUpdate;
const ASK = RULES.ask.map((r) => r.rule);
const DENY = RULES.deny.map((r) => r.rule);
const RUN = RULES.playwright.runCode;
const CLICK = `mcp__playwright__${TOOLS[0]}`;
// A playwright server no catalog deny covers: its glob is still removed and
// converted, the path a run-code allow with no deny takes.
const EXTRA = 'playwright-extra';
const EXTRA_CLICK = `mcp__${EXTRA}__${TOOLS[0]}`;
// A catalog deny rule no push sample or run-code reading flags as an allow.
const OTHER_DENY = DENY.find((r) => r.startsWith('Bash(codex'));
// A string as a regex matches it literally; q() is its JSON spelling (how an
// error quotes a rule or a name).
const lit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const q = (s) => lit(JSON.stringify(s));

const BURNED = 'projects/burned/.claude/settings.local.json';
// No longer catalog files since the cut: their only changes were Bash(*) and
// playwright globs, which now stay.
const RACER02 = 'projects/top-down-racer-02/.claude/settings.local.json';
const RACER04 = 'projects/top-down-racer-04/.claude/settings.local.json';
const RACER03 = 'projects/archive/top-down-racer-03/.claude/settings.local.json';
const RACER01 = 'projects/archive/top-down-racer-01/.claude/settings.json';

let home;
const saved = {};
before(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-home-'));
  for (const k of ['HOME', 'USERPROFILE', 'CLAUDE_CONFIG_DIR']) saved[k] = process.env[k];
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  delete process.env.CLAUDE_CONFIG_DIR;
});
after(() => {
  for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  fs.rmSync(home, { recursive: true, force: true });
});

// ---------------------------------------------------------------- helpers

// A temp root for one case, removed whatever the case does.
function withRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-'));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const canonical = (doc) => `${JSON.stringify(doc, null, 2)}\n`;
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const clone = (v) => JSON.parse(JSON.stringify(v));
// What the patched file must no longer hold: skipsSafetyCheck's allows, with
// `denies` (the file's own, or the catalog's for a project file) in place.
const flaggedWith = (denies) => (r) => skipsSafetyCheck(r, { denies });
const perTool = (server) => TOOLS.map((t) => `mcp__${server}__${t}`);

function put(file, doc) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof doc === 'string' ? doc : canonical(doc));
}

function node(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { env: { ...process.env }, encoding: 'utf8', shell: false, windowsHide: true });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch { /* usage text, or nothing */ }
  return { status: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

// The generator's CLI; its exit code is the one its result reports.
function gen(args) {
  const r = node(TOOL, args);
  assert.ok(r.json, `permission-patch printed no JSON (exit ${r.status}): ${r.stdout}\n${r.stderr}`);
  assert.equal(r.status, r.json.exit, 'the exit code is the one the result reports');
  return r;
}

// The writer's CLI on a fixture, its inverse kept in the case's root.
function write(root, file, args) {
  const inverse = path.join(root, `inverse-${randomBytes(4).toString('hex')}.json`);
  return { ...node(WRITER, ['--target', 'settings', '--file', file, '--inverse-out', inverse, ...args]), inverse };
}

// ---------------------------------------------------------------- fixtures

// A user settings file shaped like the real one (K1: allow and defaultMode,
// no ask or deny list), every value a stand-in: generic allows, push-matching
// ones of two kinds (a prefix rule, a wrapper), a tool-wide PowerShell allow
// and a playwright glob (both kept), placeholder autoMode arrays, another
// marketplace.
function userFixture() {
  return {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    env: { EXAMPLE_FLAG: '1' },
    permissions: {
      allow: ['Read(*)', 'Bash(git push:*)', 'Bash(npm test)', 'PowerShell(*)', 'mcp__context7__*', 'mcp__playwright__*', 'Bash(timeout *)', 'WebSearch'],
      defaultMode: 'auto',
    },
    model: 'opus',
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'bash ~/.claude/hooks/example.sh' }] }] },
    enabledPlugins: { 'example@other-marketplace': true },
    extraKnownMarketplaces: { 'other-marketplace': { source: { source: 'github', repo: 'example/other-plugins' } } },
    autoMode: {
      allow: ['Placeholder allow entry'],
      soft_deny: ['Placeholder soft deny one', 'Placeholder soft deny two'],
      environment: ['Placeholder environment entry'],
    },
  };
}
const USER_EXPECTED = ['Bash(git push:*)', 'Bash(timeout *)'];
const USER_KEPT = ['Read(*)', 'Bash(npm test)', 'PowerShell(*)', 'mcp__context7__*', 'mcp__playwright__*', 'WebSearch'];

const SOURCE = { source: 'git', url: 'https://example.invalid/every-plugin.git', ref: 'main' };
function marketplacesFixture() {
  return {
    'other-marketplace': { source: { source: 'github', repo: 'example/other-plugins' }, installLocation: 'placeholder', lastUpdated: '2026-01-01T00:00:00.000Z' },
    [MK]: { source: clone(SOURCE), installLocation: 'placeholder', lastUpdated: '2026-01-02T00:00:00.000Z' },
  };
}

// The user fixture after the patch, built by hand: the removals gone, an
// empty ask list right after allow (the catalog asks nothing), deny right
// after it, D4 appended, the marketplace entry last; every other key where
// it was.
function userAfter(f) {
  return {
    ...f,
    permissions: { allow: USER_KEPT, ask: ASK, deny: DENY, defaultMode: 'auto' },
    extraKnownMarketplaces: { ...f.extraKnownMarketplaces, [MK]: { source: SOURCE, autoUpdate: AUTO } },
    autoMode: { ...f.autoMode, soft_deny: [...f.autoMode.soft_deny, RULES.softDeny] },
  };
}

// The files a user-mode run reads, in `root`; `over` replaces any of them.
function userWorld(root, over = {}) {
  const w = {
    settings: path.join(root, 'claude', 'settings.json'),
    marketplaces: path.join(root, 'claude', 'plugins', 'known_marketplaces.json'),
    expected: path.join(root, 'expected-user.json'),
    rules: CATALOG_FILE,
    out: path.join(root, 'user-patch.json'),
  };
  put(w.settings, over.settings ?? userFixture());
  put(w.marketplaces, over.marketplaces ?? marketplacesFixture());
  put(w.expected, over.expected ?? USER_EXPECTED);
  if (over.rules) {
    w.rules = path.join(root, 'rules.json');
    put(w.rules, over.rules);
  }
  w.args = ['--rules', w.rules, '--target', 'user', '--file', w.settings, '--marketplaces', w.marketplaces, '--expected', w.expected, '--out', w.out];
  return w;
}

// Project files shaped like the four tracked ones (counts, indices, kinds),
// every rule but the targets a stand-in.
const filler = (from, to) => Array.from({ length: to - from }, (_, i) => `Bash(example-${from + i} *)`);
function burnedFixture() {
  const allow = [
    ...filler(0, 12),
    'Bash(git push *)', 'Bash(git push)', // 12, 13
    'Bash(rm -rf temp/*)', 'PowerShell(Get-Date *)', // 14, 15
    ...Array.from({ length: 10 }, (_, i) => `mcp__playwright-seat-${i + 1}__*`), // 16..25
    ...filler(26, 40),
  ];
  return { permissions: { allow }, enabledMcpjsonServers: Array.from({ length: 10 }, (_, i) => `playwright-seat-${i + 1}`) };
}
function racer02Fixture() {
  const allow = filler(0, 15);
  allow[0] = 'Bash(*)';
  allow[10] = 'mcp__playwright__*';
  return { permissions: { allow } };
}
function racer04Fixture() {
  const allow = filler(0, 10);
  allow[0] = 'Bash(*)';
  return { permissions: { allow, deny: ['Skill(example:*)'] } };
}
function racer03Fixture() {
  const allow = filler(0, 13);
  allow[0] = 'Bash(*)';
  allow[10] = 'mcp__playwright__*';
  return { permissions: { allow } };
}
function racer01Fixture() {
  const allow = filler(0, 6);
  allow[0] = 'Bash(python*)';
  return { env: { EXAMPLE_FLAG: '1' }, permissions: { allow } };
}

// A file the catalog does not name, shaped like racer-01's untracked
// settings.local.json (interpreter allows of three spellings), plus a
// playwright glob no catalog deny covers, which must be removed and never
// converted.
const LOCAL01 = 'projects/archive/top-down-racer-01/.claude/settings.local.json';
function local01Fixture() {
  return {
    permissions: { allow: ['Bash("D:/tools/python.exe" -c:*)', 'Bash(.venv/Scripts/python:*)', 'Bash(example-2 *)', 'Bash(python3 -m pytest:*)', `mcp__${EXTRA}__*`, 'Read(*)'] },
    enableAllProjectMcpServers: true,
  };
}
const LOCAL01_EXPECTED = [`mcp__${EXTRA}__*`, 'Bash(python3 -m pytest:*)', 'Bash(.venv/Scripts/python:*)', 'Bash("D:/tools/python.exe" -c:*)'];

// A project file at its catalog key under `root`/mono, and the args to
// generate its patch.
function projectWorld(root, key, doc) {
  const file = path.join(root, 'mono', ...key.split('/'));
  put(file, doc);
  const out = path.join(root, 'project-patch.json');
  return { file, out, args: ['--rules', CATALOG_FILE, '--target', 'project', '--file', file, '--out', out] };
}

// ---------------------------------------------------------------- user mode

describe('permission-patch.mjs --target user', () => {
  test('his file\'s shape (no ask or deny list): the computed removals equal the expected list; through the writer the patch takes them out (PowerShell(*) and the playwright glob stay), adds an empty ask list, every catalog deny rule once, D4 and the marketplace entry, and every other byte is as it was; its inverse puts the bytes back', () => withRoot((root) => {
    const w = userWorld(root);
    const original = fs.readFileSync(w.settings);
    const r = gen(w.args);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(r.json.removed, [
      { index: 1, rule: 'Bash(git push:*)' },
      { index: 6, rule: 'Bash(timeout *)' },
    ]);
    assert.deepEqual(r.json.converted, []);
    assert.deepEqual(r.json.added, { allow: 0, ask: 0, deny: DENY.length, softDeny: true, marketplace: 'created' });
    assert.equal(r.json.settingsSha256, sha256(original));
    assert.equal(r.json.rulesSha256, sha256(fs.readFileSync(CATALOG_FILE)));
    assert.deepEqual([r.json.written, r.json.noop, r.json.out], [true, false, w.out]);

    // The patch is exactly {ops}: the binding tests, then each removal as a
    // value test and a delete, highest index first.
    const patch = readJson(w.out);
    assert.deepEqual(Object.keys(patch), ['ops']);
    assert.equal(r.json.ops, patch.ops.length);
    assert.deepEqual(patch.ops.slice(0, 5).map((op) => [op.op, op.path, Object.keys(op).filter((k) => k !== 'op' && k !== 'path')]), [
      ['test', ['permissions', 'allow'], ['sha256']],
      ['test', ['permissions', 'ask'], ['absent']],
      ['test', ['permissions', 'deny'], ['absent']],
      ['test', ['autoMode', 'soft_deny'], ['sha256']],
      ['test', ['extraKnownMarketplaces', MK], ['absent']],
    ]);
    assert.deepEqual(patch.ops.slice(5, 9), [6, 1].flatMap((i) => [
      { op: 'test', path: ['permissions', 'allow', i], value: userFixture().permissions.allow[i] },
      { op: 'delete', path: ['permissions', 'allow', i] },
    ]));
    assert.deepEqual(patch.ops.find((op) => op.op === 'set' && op.path.join('.') === 'permissions.ask'), { op: 'set', path: ['permissions', 'ask'], value: [], after: 'allow' }, 'an empty ask list: no ask rule');
    assert.ok(!fs.readFileSync(w.out, 'utf8').includes('Placeholder'), 'no autoMode text in the patch');

    // Applied by the writer, bound to the bytes the tool read.
    const a = write(root, w.settings, ['--patch', w.out, '--expect-sha', r.json.settingsSha256]);
    assert.equal(a.status, 0, a.stdout);
    const text = fs.readFileSync(w.settings, 'utf8');
    assert.equal(text, canonical(userAfter(userFixture())));
    const doc = JSON.parse(text);
    assert.deepEqual(doc.permissions.allow.filter(flaggedWith(doc.permissions.deny)), [], 'no allow lets a push skip the check or reaches run-code past its deny');
    assert.ok(doc.permissions.deny.includes(`mcp__playwright__${RUN}`), 'the kept glob\'s run-code is denied');
    assert.ok(!doc.permissions.allow.includes(`mcp__playwright__${RUN}`));
    assert.deepEqual(doc.extraKnownMarketplaces[MK].source, marketplacesFixture()[MK].source, 'the source is the one known_marketplaces.json holds');

    // The write's own inverse restores the file byte for byte.
    const back = write(root, w.settings, ['--apply-inverse', a.inverse]);
    assert.equal(back.status, 0, back.stdout);
    assert.ok(fs.readFileSync(w.settings).equals(original));
  }));

  test('lists that exist are appended to where they stand; a catalog rule, a per-tool allow or D4 already there is not added again; a playwright glob no catalog deny covers converts under its own name; an existing marketplace entry with the same source gets autoUpdate only', () => withRoot((root) => {
    const f = userFixture();
    f.permissions = {
      allow: [...f.permissions.allow, CLICK, EXTRA_CLICK, `mcp__${EXTRA}__*`],
      deny: ['Bash(curl *)', DENY[2]],
      defaultMode: 'auto',
      ask: ['Bash(rm -rf /scratch/*)'],
    };
    f.autoMode.soft_deny.splice(1, 0, RULES.softDeny);
    f.extraKnownMarketplaces[MK] = { source: clone(SOURCE), autoUpdate: !AUTO };
    const w = userWorld(root, { settings: f, expected: [...USER_EXPECTED, `mcp__${EXTRA}__*`] });
    const r = gen(w.args);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(r.json.converted, [{ server: EXTRA, tools: TOOLS.length - 1 }]);
    assert.deepEqual(r.json.added, { allow: TOOLS.length - 1, ask: 0, deny: DENY.length - 1, softDeny: false, marketplace: 'autoUpdate set' });
    const a = write(root, w.settings, ['--patch', w.out, '--expect-sha', r.json.settingsSha256]);
    assert.equal(a.status, 0, a.stdout);
    const want = {
      ...f,
      permissions: {
        allow: [...USER_KEPT, CLICK, EXTRA_CLICK, ...perTool(EXTRA).filter((x) => x !== EXTRA_CLICK)],
        deny: ['Bash(curl *)', DENY[2], ...DENY.filter((_, i) => i !== 2)],
        defaultMode: 'auto',
        ask: ['Bash(rm -rf /scratch/*)'],
      },
      extraKnownMarketplaces: { ...f.extraKnownMarketplaces, [MK]: { source: SOURCE, autoUpdate: AUTO } },
    };
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(want));
    const patch = readJson(w.out);
    assert.deepEqual(patch.ops.slice(1, 5).map((op) => Object.keys(op).pop()), ['sha256', 'sha256', 'sha256', 'sha256'], 'lists and an entry that exist are bound by their hash');
    assert.ok(!patch.ops.some((op) => op.op === 'set' && op.path.length === 2 && op.path[0] === 'permissions'), 'no list is made where one exists');
  }));

  test('an existing marketplace entry already right is left alone; one without autoUpdate gets it as a new key', () => withRoot((root) => {
    for (const [entry, state, want] of [
      [{ source: clone(SOURCE), autoUpdate: AUTO }, 'unchanged', { source: SOURCE, autoUpdate: AUTO }],
      [{ source: clone(SOURCE) }, 'autoUpdate set', { source: SOURCE, autoUpdate: AUTO }],
    ]) {
      const sub = fs.mkdtempSync(path.join(root, 'case-'));
      const f = userFixture();
      f.extraKnownMarketplaces[MK] = entry;
      const w = userWorld(sub, { settings: f });
      const r = gen(w.args);
      assert.equal(r.status, 0, r.stdout);
      assert.equal(r.json.added.marketplace, state);
      const ops = readJson(w.out).ops;
      assert.equal(ops.filter((op) => op.path[0] === 'extraKnownMarketplaces' && op.op === 'set').length, state === 'unchanged' ? 0 : 1);
      assert.equal(write(sub, w.settings, ['--patch', w.out]).status, 0);
      assert.deepEqual(readJson(w.settings).extraKnownMarketplaces[MK], want);
    }
  }));

  test('a settings file with no extraKnownMarketplaces gets one holding only the entry', () => withRoot((root) => {
    const f = userFixture();
    delete f.extraKnownMarketplaces;
    const w = userWorld(root, { settings: f });
    const r = gen(w.args);
    assert.equal(r.status, 0, r.stdout);
    assert.equal(write(root, w.settings, ['--patch', w.out]).status, 0);
    const doc = readJson(w.settings);
    assert.deepEqual(doc.extraKnownMarketplaces, { [MK]: { source: SOURCE, autoUpdate: AUTO } });
    assert.equal(Object.keys(doc).pop(), 'extraKnownMarketplaces', 'a new key goes last');
  }));

  test('refusals name their cause, write no patch and leave the settings as they were', () => {
    const swap = (fn) => { const f = userFixture(); fn(f); return f; };
    const rulesWith = (fn) => { const r = clone(RULES); fn(r); return r; };
    const cases = [
      ['an expected removal the settings do not hold', { expected: [...USER_EXPECTED, 'Bash(git push --tags)'] }, /differ from --expected: expected but not computed: "Bash\(git push --tags\)"$/],
      ['a computed removal the expected list lacks', { expected: USER_EXPECTED.filter((r) => r !== 'Bash(timeout *)') }, /differ from --expected: computed but not expected: "Bash\(timeout \*\)"$/],
      ['a tool-wide shell allow expected (auto mode drops it, so it stays)', { expected: [...USER_EXPECTED, 'PowerShell(*)'] }, /differ from --expected: expected but not computed: "PowerShell\(\*\)"$/],
      ['a playwright glob expected whose run-code the catalog denies', { expected: [...USER_EXPECTED, 'mcp__playwright__*'] }, /differ from --expected: expected but not computed: "mcp__playwright__\*"$/],
      ['a duplicate computed removal', { settings: swap((f) => f.permissions.allow.push('Bash(git push:*)')) }, /computed but not expected: "Bash\(git push:\*\)"$/],
      ['a marketplace entry with another source', { settings: swap((f) => { f.extraKnownMarketplaces[MK] = { source: { source: 'github', repo: 'someone/else' } }; }) }, new RegExp(`^extraKnownMarketplaces\\[${q(MK)}\\] holds the source \\{"source":"github","repo":"someone/else"\\}, but known_marketplaces\\.json's is `)],
      ['a marketplace entry with no source', { settings: swap((f) => { f.extraKnownMarketplaces[MK] = { autoUpdate: AUTO }; }) }, /holds the source null, but known_marketplaces\.json's is /],
      ['known_marketplaces.json without the entry', { marketplaces: { 'other-marketplace': marketplacesFixture()['other-marketplace'] } }, new RegExp(`^--marketplaces holds no ${q(MK)} entry with a source object$`)],
      ['known_marketplaces.json with the entry but no source', { marketplaces: { [MK]: { installLocation: 'placeholder' } } }, new RegExp(`^--marketplaces holds no ${q(MK)} entry with a source object$`)],
      ['every MCP tool allowed', { settings: swap((f) => f.permissions.allow.push('mcp__*')), expected: [...USER_EXPECTED, 'mcp__*'] }, new RegExp(`^allow\\[8\\] "mcp__\\*" covers playwright's ${lit(RUN)}, but it is not a server glob`)],
      ['a bare playwright server no deny covers', { settings: swap((f) => f.permissions.allow.push(`mcp__${EXTRA}`)), expected: [...USER_EXPECTED, `mcp__${EXTRA}`] }, new RegExp(`^allow\\[8\\] ${q(`mcp__${EXTRA}`)} covers playwright's ${lit(RUN)}, but it is not a server glob`)],
      ['the run-code tool itself, on a server no deny covers', { settings: swap((f) => f.permissions.allow.push(`mcp__${EXTRA}__${RUN}`)), expected: [...USER_EXPECTED, `mcp__${EXTRA}__${RUN}`] }, new RegExp(`^allow\\[8\\] ${q(`mcp__${EXTRA}__${RUN}`)} covers playwright's`)],
      ['a server glob with a wildcard server', { settings: swap((f) => f.permissions.allow.push('mcp__play*__*')), expected: [...USER_EXPECTED, 'mcp__play*__*'] }, /^allow\[8\] "mcp__play\*__\*" covers playwright's/],
      ['a catalog deny rule in ask', { settings: swap((f) => { f.permissions.ask = [DENY[0]]; }) }, new RegExp(`^${q(DENY[0])} is a catalog deny rule, but permissions\\.ask holds it`)],
      ['a catalog deny rule in allow', { settings: swap((f) => f.permissions.allow.push(OTHER_DENY)) }, new RegExp(`^${q(OTHER_DENY)} is a catalog deny rule, but permissions\\.allow holds it`)],
      ['a catalog deny rule in deny twice', { settings: swap((f) => { f.permissions.deny = [DENY[1], DENY[1]]; }) }, new RegExp(`^permissions\\.deny already holds the catalog rule ${q(DENY[1])} 2 times`)],
      ['no autoMode.soft_deny', { settings: swap((f) => { delete f.autoMode.soft_deny; }) }, /^the settings hold no autoMode\.soft_deny list; this tool appends to one and never makes it/],
      ['no permissions.allow', { settings: swap((f) => { delete f.permissions.allow; }) }, /^the settings hold no permissions\.allow list$/],
      ['an ask that is not a list', { settings: swap((f) => { f.permissions.ask = 'Bash(x)'; }) }, /^permissions\.ask is not a list$/],
      ['extraKnownMarketplaces not an object', { settings: swap((f) => { f.extraKnownMarketplaces = []; }) }, /^extraKnownMarketplaces is not an object$/],
      ['--expected not a list of strings', { expected: { rules: USER_EXPECTED } }, /^--expected must hold a JSON list of rule strings$/],
      ['--rules whose pushSamples differ from the module\'s', { rules: rulesWith((r) => r.pushSamples.pop()) }, /^--rules: its pushSamples differ from lib\/permissions\.mjs's catalog/],
      ['--rules whose runCode differs from the module\'s', { rules: rulesWith((r) => { r.playwright.runCode = 'browser_evaluate'; }) }, /^--rules: its playwright\.runCode differs/],
      ['--rules whose per-tool list holds run-code', { rules: rulesWith((r) => r.playwright.tools.push(r.playwright.runCode)) }, new RegExp(`^--rules: playwright\\.tools holds ${lit(RUN)}, the tool the per-tool list exists to leave out$`)],
      ['--rules with a rule in both ask and deny', { rules: rulesWith((r) => r.ask.push({ rule: r.deny[0].rule, why: 'x' })) }, /^--rules: ".*" is in both ask and deny$/],
      ['--rules with a deny rule twice', { rules: rulesWith((r) => r.deny.push(r.deny[0])) }, /^--rules: deny lists ".*" twice$/],
      ['--rules with a rule that does not parse', { rules: rulesWith((r) => { r.deny[0].rule = 'Bash(x'; }) }, /^--rules: deny\[0\] is not an entry whose rule parses$/],
      ['--rules with no softDeny', { rules: rulesWith((r) => { delete r.softDeny; }) }, /^--rules: softDeny must be a non-empty string$/],
      ['--rules with a marketplace autoUpdate that is not a boolean', { rules: rulesWith((r) => { r.marketplace.autoUpdate = 'false'; }) }, /^--rules: marketplace must be \{name, autoUpdate: true\|false\}$/],
      ['--rules with a project server that is not a name', { rules: rulesWith((r) => { r.projects[BURNED].playwright = ['play*']; }) }, /^--rules: projects\[".*"\]\.playwright holds "play\*", not a server name$/],
      ['--rules whose project entry both removes and converts a glob', { rules: rulesWith((r) => { r.projects[BURNED].playwright = ['playwright-seat-1']; r.projects[BURNED].remove.push('mcp__playwright-seat-1__*'); }) }, /^--rules: projects\[".*"\] both removes and converts mcp__playwright-seat-1__\*$/],
      ['--rules with a project key that is not repo-relative', { rules: rulesWith((r) => { r.projects['/abs/settings.json'] = { remove: [], playwright: [] }; }) }, /^--rules: projects key "\/abs\/settings\.json" is not a repo-relative path/],
      ['--rules that is not JSON', { rules: '{"ask": [' }, /^the --rules file .* is not valid JSON$/],
      ['--rules that is not an object', { rules: '[]\n' }, /^--rules: not a JSON object$/],
      ['--rules with an empty deny list', { rules: rulesWith((r) => { r.deny = []; }) }, /^--rules: "deny" must be a non-empty list of \{rule, why\}$/],
      ['--rules whose ask is not a list (an empty one is fine: the real catalog\'s is)', { rules: rulesWith((r) => { r.ask = {}; }) }, /^--rules: "ask" must be a list of \{rule, why\}$/],
      ['--rules with a tool that is not a name', { rules: rulesWith((r) => { r.playwright.tools[0] = 'browser click'; }) }, /^--rules: playwright\.tools must be a non-empty list of tool names$/],
      ['--rules with a tool twice', { rules: rulesWith((r) => r.playwright.tools.push(r.playwright.tools[0])) }, /^--rules: playwright\.tools lists a tool twice$/],
      ['--rules with a project server twice', { rules: rulesWith((r) => { r.projects[BURNED].playwright = ['playwright', 'playwright']; }) }, /^--rules: projects\[".*"\]\.playwright lists a server twice$/],
      ['--rules with a project entry of the wrong shape', { rules: rulesWith((r) => { r.projects[BURNED] = { remove: 'Bash(*)', playwright: [] }; }) }, /^--rules: projects\[".*"\] must be \{remove: \[rule\], playwright: \[server\]\}$/],
      ['--rules with a project remove that is not a string', { rules: rulesWith((r) => r.projects[BURNED].remove.push(42)) }, /^--rules: projects\[".*"\] must be \{remove: \[rule\], playwright: \[server\]\}$/],
      ['--rules with no projects', { rules: rulesWith((r) => { r.projects = []; }) }, /^--rules: projects must be an object of repo-relative paths$/],
    ];
    for (const [name, over, re] of cases) {
      withRoot((root) => {
        const w = userWorld(root, over);
        const before = fs.readFileSync(w.settings);
        const r = gen(w.args);
        assert.equal(r.status, 2, `${name}: ${r.stdout}`);
        assert.equal(r.json.ok, false, name);
        assert.match(r.json.error, re, name);
        assert.match(r.stderr, /^permission-patch: exit 2: /, name);
        assert.equal(fs.existsSync(w.out), false, `${name}: no patch`);
        assert.ok(fs.readFileSync(w.settings).equals(before), `${name}: settings untouched`);
        assert.deepEqual(fs.readdirSync(root).filter((n) => n.includes('.tmp-')), [], `${name}: no temp file`);
      });
    }
  });

  test('the patch is bound to the lists it was computed from: a push allow, an ask list or a marketplace entry added after it was made refuses the write (the writer\'s exit 2), with nothing written', () => {
    const later = [
      ['a push allow', (d) => d.permissions.allow.push('Bash(git push origin main)'), /^op 1 \(test \["permissions","allow"\]\): test failed: the value differs/],
      ['an ask list', (d) => { d.permissions.ask = ['Bash(make deploy)']; }, /^op 2 \(test \["permissions","ask"\]\): test failed: the path exists/],
      ['a deny list', (d) => { d.permissions.deny = ['Bash(make deploy)']; }, /^op 3 \(test \["permissions","deny"\]\): test failed: the path exists/],
      ['a soft_deny entry', (d) => d.autoMode.soft_deny.push('Placeholder soft deny three'), /^op 4 \(test \["autoMode","soft_deny"\]\): test failed: the value differs/],
      ['the marketplace entry', (d) => { d.extraKnownMarketplaces[MK] = { source: clone(SOURCE), autoUpdate: !AUTO }; }, new RegExp(`^op 5 \\(test \\["extraKnownMarketplaces",${q(MK)}\\]\\): test failed: the path exists`)],
    ];
    for (const [name, change, re] of later) {
      withRoot((root) => {
        const w = userWorld(root);
        assert.equal(gen(w.args).status, 0, name);
        const doc = readJson(w.settings);
        change(doc);
        put(w.settings, doc);
        const before = fs.readFileSync(w.settings);
        const a = write(root, w.settings, ['--patch', w.out]);
        assert.equal(a.status, 2, `${name}: ${a.stdout}`);
        assert.match(a.json.error, re, name);
        assert.ok(fs.readFileSync(w.settings).equals(before), `${name}: nothing written`);
      });
    }
  });

  test('nothing left to change writes no patch: noop, exit 0', () => withRoot((root) => {
    const w = userWorld(root);
    assert.equal(gen(w.args).status, 0);
    assert.equal(write(root, w.settings, ['--patch', w.out]).status, 0);
    // The patched file again, with nothing left to remove.
    const again = userWorld(path.join(root, 'again'), { settings: readJson(w.settings), expected: [] });
    fs.mkdirSync(path.dirname(again.out), { recursive: true });
    const r = gen(again.args);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual([r.json.noop, r.json.written, r.json.ops], [true, false, 0]);
    assert.deepEqual(r.json.added, { allow: 0, ask: 0, deny: 0, softDeny: false, marketplace: 'unchanged' });
    assert.equal(fs.existsSync(again.out), false);
  }));
});

// ---------------------------------------------------------------- project mode

describe('permission-patch.mjs --target project', () => {
  test('burned-shaped: the targets at 12 and 13 go by value test and delete, highest index first; the seat globs at 16 to 25 stay (the catalog denies their run-code); every other byte is as it was; the inverse puts the bytes back', () => withRoot((root) => {
    const f = burnedFixture();
    const w = projectWorld(root, BURNED, f);
    const original = fs.readFileSync(w.file);
    const r = gen(w.args);
    assert.equal(r.status, 0, r.stdout);
    assert.equal(r.json.key, BURNED);
    assert.deepEqual(r.json.removed.map((x) => x.index), [12, 13]);
    assert.deepEqual(r.json.converted, []);
    const ops = readJson(w.out).ops;
    assert.deepEqual(ops[0], { op: 'test', path: ['permissions', 'allow'], sha256: ops[0].sha256 });
    const order = [13, 12];
    assert.deepEqual(ops.slice(1), order.flatMap((i) => [
      { op: 'test', path: ['permissions', 'allow', i], value: f.permissions.allow[i] },
      { op: 'delete', path: ['permissions', 'allow', i] },
    ]));

    const a = write(root, w.file, ['--patch', w.out, '--expect-sha', r.json.settingsSha256]);
    assert.equal(a.status, 0, a.stdout);
    const kept = f.permissions.allow.filter((_, i) => !order.includes(i));
    assert.equal(fs.readFileSync(w.file, 'utf8'), canonical({ permissions: { allow: kept }, enabledMcpjsonServers: f.enabledMcpjsonServers }));
    assert.deepEqual(readJson(w.file).permissions.allow.filter(flaggedWith(DENY)), [], 'with the catalog\'s denies in user settings, nothing left skips the check');
    const back = write(root, w.file, ['--apply-inverse', a.inverse]);
    assert.equal(back.status, 0, back.stdout);
    assert.ok(fs.readFileSync(w.file).equals(original));
  }));

  test('archive/racer-01 shaped: Bash(python*) out, its env untouched; racer-02, racer-04 and archive/racer-03 shaped files need no change (their Bash(*) and playwright glob stay), so they are no catalog files', () => {
    withRoot((root) => {
      const f = racer01Fixture();
      const w = projectWorld(root, RACER01, f);
      const r = gen(w.args);
      assert.equal(r.status, 0, r.stdout);
      assert.equal(r.json.key, RACER01);
      const ops = readJson(w.out).ops;
      assert.deepEqual(ops.slice(1).filter((op) => op.op === 'delete').map((op) => op.path[2]), [0]);
      assert.equal(ops.length, 3);
      assert.equal(write(root, w.file, ['--patch', w.out, '--expect-sha', r.json.settingsSha256]).status, 0);
      const want = clone(f);
      want.permissions.allow = f.permissions.allow.slice(1);
      assert.equal(fs.readFileSync(w.file, 'utf8'), canonical(want));
    });
    assert.deepEqual(Object.keys(RULES.projects).sort(), [RACER01, BURNED].sort());
    for (const [key, f] of [[RACER02, racer02Fixture()], [RACER04, racer04Fixture()], [RACER03, racer03Fixture()]]) {
      withRoot((root) => {
        const w = projectWorld(root, key, f);
        const expected = path.join(root, 'expected-none.json');
        put(expected, []);
        const r = gen([...w.args, '--expected', expected]);
        assert.equal(r.status, 0, `${key}: ${r.stdout}`);
        assert.deepEqual([r.json.key, r.json.noop, r.json.written, r.json.removed], [null, true, false, []], key);
      });
    }
  });

  test('a file the catalog does not name, with --expected: the computed removals equal it (as a multiset) and go by value test and delete, highest index first; a playwright glob is removed, never converted; every other byte is as it was; the inverse puts the bytes back', () => withRoot((root) => {
    const f = local01Fixture();
    const w = projectWorld(root, LOCAL01, f);
    const expected = path.join(root, 'expected-local.json');
    put(expected, LOCAL01_EXPECTED);
    const original = fs.readFileSync(w.file);
    const r = gen([...w.args, '--expected', expected]);
    assert.equal(r.status, 0, r.stdout);
    assert.equal(r.json.key, null);
    assert.deepEqual(r.json.removed, [0, 1, 3, 4].map((index) => ({ index, rule: f.permissions.allow[index] })));
    assert.deepEqual([r.json.converted, r.json.added], [[], { allow: 0 }]);
    const ops = readJson(w.out).ops;
    assert.deepEqual(ops, [
      { op: 'test', path: ['permissions', 'allow'], sha256: ops[0].sha256 },
      ...[4, 3, 1, 0].flatMap((i) => [
        { op: 'test', path: ['permissions', 'allow', i], value: f.permissions.allow[i] },
        { op: 'delete', path: ['permissions', 'allow', i] },
      ]),
    ]);
    const a = write(root, w.file, ['--patch', w.out, '--expect-sha', r.json.settingsSha256]);
    assert.equal(a.status, 0, a.stdout);
    assert.equal(fs.readFileSync(w.file, 'utf8'), canonical({ permissions: { allow: ['Bash(example-2 *)', 'Read(*)'] }, enableAllProjectMcpServers: true }));
    const back = write(root, w.file, ['--apply-inverse', a.inverse]);
    assert.equal(back.status, 0, back.stdout);
    assert.ok(fs.readFileSync(w.file).equals(original));
  }));

  test('a file the catalog does not name: a --expected that differs from the computed removals, or is not a list of rule strings, refuses; nothing to remove with an empty one is a noop', () => {
    const cases = [
      ['a removal --expected lacks', LOCAL01_EXPECTED.slice(1), /^the allows to remove, computed from the settings \(every allow skipsSafetyCheck flags, the catalog's denies counted as in place\), differ from --expected: computed but not expected: "mcp__playwright-extra__\*"$/],
      ['a glob --expected names whose run-code the catalog denies', [...LOCAL01_EXPECTED, 'mcp__playwright-seat-3__*'], /differ from --expected: expected but not computed: "mcp__playwright-seat-3__\*"$/],
      ['a removal the file lacks', [...LOCAL01_EXPECTED, 'Bash(node:*)'], /differ from --expected: expected but not computed: "Bash\(node:\*\)"$/],
      ['a --expected that is not a list', { allow: LOCAL01_EXPECTED }, /^--expected must hold a JSON list of rule strings$/],
    ];
    for (const [name, list, re] of cases) {
      withRoot((root) => {
        const w = projectWorld(root, LOCAL01, local01Fixture());
        const expected = path.join(root, 'expected-local.json');
        put(expected, list);
        const before = fs.readFileSync(w.file);
        const r = gen([...w.args, '--expected', expected]);
        assert.equal(r.status, 2, `${name}: ${r.stdout}`);
        assert.match(r.json.error, re, name);
        assert.equal(fs.existsSync(w.out), false, `${name}: no patch`);
        assert.ok(fs.readFileSync(w.file).equals(before), `${name}: untouched`);
      });
    }
    withRoot((root) => {
      const w = projectWorld(root, LOCAL01, { permissions: { allow: ['Read(*)', 'Bash(example-2 *)'] } });
      const expected = path.join(root, 'expected-local.json');
      put(expected, []);
      const r = gen([...w.args, '--expected', expected]);
      assert.equal(r.status, 0, r.stdout);
      assert.deepEqual([r.json.noop, r.json.written, r.json.ops, r.json.key], [true, false, 0, null]);
      assert.equal(fs.existsSync(w.out), false);
    });
  });

  test('a remove string the file holds twice goes at both indices', () => withRoot((root) => {
    const f = racer01Fixture();
    f.permissions.allow[5] = 'Bash(python*)';
    const w = projectWorld(root, RACER01, f);
    const r = gen(w.args);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(r.json.removed, [{ index: 0, rule: 'Bash(python*)' }, { index: 5, rule: 'Bash(python*)' }]);
    assert.equal(write(root, w.file, ['--patch', w.out]).status, 0);
    assert.deepEqual(readJson(w.file).permissions.allow, f.permissions.allow.filter((x) => x !== 'Bash(python*)'));
  }));

  test('removals are reported by index, whatever order the catalog names them in', () => withRoot((root) => {
    const f = burnedFixture();
    assert.deepEqual(RULES.projects[BURNED].remove, ['Bash(git push *)', 'Bash(git push)']);
    [f.permissions.allow[12], f.permissions.allow[13]] = [f.permissions.allow[13], f.permissions.allow[12]];
    const w = projectWorld(root, BURNED, f);
    const r = gen(w.args);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(r.json.removed, [{ index: 12, rule: 'Bash(git push)' }, { index: 13, rule: 'Bash(git push *)' }]);
  }));

  test('the value tests bind each removal by itself: with the binding test taken out, a file whose entries moved since refuses at the first index that changed', () => withRoot((root) => {
    const w = projectWorld(root, BURNED, burnedFixture());
    assert.equal(gen(w.args).status, 0);
    const doc = readJson(w.file);
    [doc.permissions.allow[11], doc.permissions.allow[12]] = [doc.permissions.allow[12], doc.permissions.allow[11]];
    put(w.file, doc);
    const before = fs.readFileSync(w.file);
    const whole = write(root, w.file, ['--patch', w.out]);
    assert.equal(whole.status, 2, whole.stdout);
    assert.match(whole.json.error, /^op 1 \(test \["permissions","allow"\]\): test failed/);
    const loose = path.join(root, 'unbound.json');
    put(loose, { ops: readJson(w.out).ops.slice(1) });
    const one = write(root, w.file, ['--patch', loose]);
    assert.equal(one.status, 2, one.stdout);
    // Ops 1-2 are index 13 (unchanged), 3 index 12.
    assert.match(one.json.error, /^op 3 \(test \["permissions","allow",12\]\): test failed: the value differs/);
    assert.ok(fs.readFileSync(w.file).equals(before), 'nothing written either time');
  }));

  test('refusals: no catalog entry for the path (a key that is not at a folder boundary included), a remove string the file lacks, a push or run-code allow the entry leaves', () => {
    const extra = (rule) => { const f = burnedFixture(); f.permissions.allow.push(rule); return f; };
    const lacking = (rule) => { const f = burnedFixture(); f.permissions.allow = f.permissions.allow.filter((r) => r !== rule); return f; };
    const r01 = racer01Fixture();
    r01.permissions.allow.push(`mcp__${EXTRA}__*`);
    const cases = [
      ['a file the catalog does not name, with no --expected', 'projects/other/.claude/settings.local.json', burnedFixture(), new RegExp(`is none of the catalog's project files \\(${Object.keys(RULES.projects).map(lit).join(', ')}\\); for a file the catalog does not name, give --expected \\(the allows to remove, a JSON list\\)$`)],
      ['a key not at a folder boundary', 'xprojects/burned/.claude/settings.local.json', burnedFixture(), /is none of the catalog's project files/],
      ['a remove string the file lacks', BURNED, lacking('Bash(git push)'), /^the catalog removes "Bash\(git push\)" from projects\/burned\/\.claude\/settings\.local\.json, but its permissions\.allow does not hold it/],
      ['a push allow the entry leaves', BURNED, extra('Bash(git push origin main)'), /^projects\/burned\/\.claude\/settings\.local\.json allow\[40\] "Bash\(git push origin main\)" lets a push skip the safety check, and the catalog's entry neither removes nor converts it/],
      ['a run-code glob no catalog deny covers, which the entry leaves', BURNED, extra('mcp__playwright-seat-11__*'), new RegExp(`^${lit(BURNED)} allow\\[40\\] "mcp__playwright-seat-11__\\*" covers playwright's ${lit(RUN)}, and the catalog's entry neither`)],
      ['a run-code allow the entry leaves', RACER01, r01, new RegExp(`^${lit(RACER01)} allow\\[6\\] ${q(`mcp__${EXTRA}__*`)} covers playwright's ${lit(RUN)}, and the catalog's entry neither`)],
      ['no allow list', RACER01, { permissions: { deny: [] } }, /^the settings hold no permissions\.allow list$/],
    ];
    for (const [name, key, doc, re] of cases) {
      withRoot((root) => {
        const w = projectWorld(root, key, doc);
        const before = fs.readFileSync(w.file);
        const r = gen(w.args);
        assert.equal(r.status, 2, `${name}: ${r.stdout}`);
        assert.match(r.json.error, re, name);
        assert.equal(fs.existsSync(w.out), false, `${name}: no patch`);
        assert.ok(fs.readFileSync(w.file).equals(before), `${name}: untouched`);
      });
    }
  });
});

// ---------------------------------------------------------------- the CLI

describe('permission-patch.mjs arguments and --out', () => {
  test('--help prints the usage and exits 0; unknown, repeated or valueless arguments, a bad target and a missing or misplaced flag exit 2', () => withRoot((root) => {
    const help = node(TOOL, ['--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /^usage: node tools\/permission-patch\.mjs --rules <catalog\.json> --target user\|project\n/);
    const w = userWorld(root);
    const drop = (flag) => { const a = [...w.args]; a.splice(a.indexOf(flag), 2); return a; };
    const pw = projectWorld(root, RACER01, racer01Fixture());
    for (const [args, re] of [
      [['--frob'], /^unknown argument --frob$/],
      [[...w.args, '--target', 'user'], /^--target given twice$/],
      [['--out'], /^--out needs a value$/],
      [[...drop('--target'), '--target', 'both'], /^--target must be one of user, project$/],
      [drop('--rules'), /^--rules is required$/],
      [drop('--file'), /^--file is required$/],
      [drop('--out'), /^--out is required$/],
      [drop('--marketplaces'), /^--marketplaces is required with --target user$/],
      [drop('--expected'), /^--expected is required with --target user$/],
      [[...pw.args, '--expected', w.expected], new RegExp(`^--expected is for a file the catalog does not name, and .* is the catalog's ${lit(RACER01)}, whose entry says what to remove \\(one source per file\\)$`)],
      [[...pw.args, '--marketplaces', w.marketplaces], /^--marketplaces is for --target user only$/],
      [[...drop('--file'), '--file', path.join(root, 'missing.json')], /^cannot read the settings file .*missing\.json: ENOENT$/],
    ]) {
      const r = gen(args);
      assert.equal(r.status, 2, `${args.join(' ')}: ${r.stdout}`);
      assert.match(r.json.error, re, args.join(' '));
    }
    assert.equal(fs.existsSync(w.out), false);
    assert.equal(fs.existsSync(pw.out), false);
  }));

  test('settings that are not a JSON object refuse', () => withRoot((root) => {
    for (const [text, re] of [['{"permissions": ', /^the settings file .* is not valid JSON$/], ['[1, 2]\n', /does not hold a JSON object at the top$/]]) {
      const w = userWorld(root);
      fs.writeFileSync(w.settings, text);
      const r = gen(w.args);
      assert.equal(r.status, 2, r.stdout);
      assert.match(r.json.error, re);
    }
  }));

  test('--out that exists is never overwritten; --out in a folder that does not exist refuses', () => withRoot((root) => {
    const w = userWorld(root);
    fs.writeFileSync(w.out, 'kept\n');
    const r = gen(w.args);
    assert.equal(r.status, 2, r.stdout);
    assert.match(r.json.error, /^--out .*user-patch\.json already exists; a patch is never overwritten$/);
    assert.equal(fs.readFileSync(w.out, 'utf8'), 'kept\n');
    const deep = path.join(root, 'no', 'such', 'patch.json');
    const r2 = gen([...w.args.slice(0, -2), '--out', deep]);
    assert.equal(r2.status, 2, r2.stdout);
    assert.match(r2.json.error, /^--out's folder .* does not exist; make it first$/);
    assert.equal(fs.existsSync(path.join(root, 'no')), false);
  }));

  test('--out inside the git work tree that holds the tool refuses (the patch quotes the rules it removes)', () => withRoot((root) => {
    const w = userWorld(root);
    const inside = path.join(HOOKS, `permission-patch-guard-${randomBytes(4).toString('hex')}.json`);
    try {
      const r = gen([...w.args.slice(0, -2), '--out', inside]);
      assert.equal(r.status, 2, r.stdout);
      assert.match(r.json.error, /^--out .* is inside the git work tree that holds this tool \(.*\); the patch quotes the rules it removes, so it goes outside the repo$/);
      assert.equal(fs.existsSync(inside), false);
    } finally {
      fs.rmSync(inside, { force: true });
    }
  }));
});

// ---------------------------------------------------------------- the library

describe('permission-patch.mjs keyFor and the self-check', () => {
  test('keyFor takes the one key the path ends at a folder boundary; none is null; two refuse', () => {
    const at = (...parts) => path.join(os.tmpdir(), 'pp-key', ...parts);
    assert.equal(keyFor(at('mono', ...BURNED.split('/')), RULES.projects), BURNED);
    assert.equal(keyFor(at('wt', 'b', ...BURNED.split('/')), RULES.projects), BURNED, 'a worktree copy maps to the same key');
    assert.equal(keyFor(at('mono', ...RACER03.split('/')), RULES.projects), null, 'archive/racer-03 is no catalog file since the cut');
    assert.equal(keyFor(at('xprojects', 'burned', '.claude', 'settings.local.json'), RULES.projects), null);
    assert.equal(keyFor(at('projects', 'burned', '.claude', 'settings.json'), RULES.projects), null);
    assert.equal(keyFor(at('mono', ...LOCAL01.split('/')), RULES.projects), null, 'racer-01\'s untracked file has no entry; its tracked one has');
    assert.equal(keyFor(at('mono', ...RACER01.split('/')), RULES.projects), RACER01);
    const two = { 'a/s.json': {}, 'x/a/s.json': {} };
    assert.throws(() => keyFor(at('x', 'a', 's.json'), two), /ends more than one catalog key \(a\/s\.json, x\/a\/s\.json\)$/);
    assert.equal(keyFor(at('y', 'a', 's.json'), two), 'a/s.json');
  });

  // A plan and the document its ops give, to break one way at a time.
  function userCase() {
    const doc = userFixture();
    const built = planUser({ rules: RULES, doc, marketplaces: marketplacesFixture(), expected: USER_EXPECTED });
    const after = clone(doc);
    applyOps(after, built.ops);
    return { doc, after, plan: built.plan };
  }

  test('verifyPlan passes the planned result and throws, by name, on each way it can be wrong', () => {
    const ok = userCase();
    assert.doesNotThrow(() => verifyPlan(ok.doc, ok.after, ok.plan, RULES));
    const breaks = [
      ['an extra allow', (c) => c.after.permissions.allow.push('Bash(ls)'), /permissions\.allow is not the kept entries plus the per-tool list/],
      ['a push allow the plan kept', (c) => { c.plan.kept.push('Bash(git push *)'); c.after.permissions.allow.splice(c.plan.kept.length - 1, 0, 'Bash(git push *)'); }, /permissions\.allow still holds "Bash\(git push \*\)"/],
      ['the run-code deny the kept glob leans on dropped, as planned: caught as a catalog rule missing', (c) => { c.plan.deny = c.plan.deny.filter((r) => r !== `mcp__playwright__${RUN}`); c.after.permissions.deny = c.after.permissions.deny.filter((r) => r !== `mcp__playwright__${RUN}`); }, new RegExp(`the catalog deny rule ${q(`mcp__playwright__${RUN}`)} is not in permissions\\.deny exactly once`)],
      ['the ask list missing', (c) => { delete c.after.permissions.ask; }, /permissions\.ask is not the list planned/],
      ['a deny rule missing', (c) => c.after.permissions.deny.pop(), /permissions\.deny is not the list planned/],
      ['a deny rule twice, as planned', (c) => { c.plan.deny.push(DENY[0]); c.after.permissions.deny.push(DENY[0]); }, /the catalog deny rule ".*" is not in permissions\.deny exactly once/],
      ['a deny rule in ask, as planned', (c) => { c.plan.ask.push(DENY[0]); c.after.permissions.ask.push(DENY[0]); }, /the catalog deny rule ".*" is in another list/],
      ['a deny rule in allow, as planned', (c) => { c.plan.kept.push(OTHER_DENY); c.after.permissions.allow.splice(c.plan.kept.length - 1, 0, OTHER_DENY); }, new RegExp(`the catalog deny rule ${q(OTHER_DENY)} is in another list`)],
      ['D4 missing', (c) => c.after.autoMode.soft_deny.pop(), /autoMode\.soft_deny is not its old entries plus the catalog's/],
      ['D4 missing, as planned', (c) => { c.plan.softDeny.pop(); c.after.autoMode.soft_deny.pop(); }, /autoMode\.soft_deny is not its old entries plus the catalog's/],
      ['an old soft_deny entry changed, D4 kept', (c) => { c.after.autoMode.soft_deny[0] = 'Placeholder changed'; }, /autoMode\.soft_deny is not its old entries plus the catalog's/],
      ['the marketplace source changed, autoUpdate right', (c) => { c.after.extraKnownMarketplaces[MK].source = { source: 'github', repo: 'someone/else' }; }, new RegExp(`extraKnownMarketplaces\\[${q(MK)}\\] is not the entry planned`)],
      ['the marketplace entry wrong', (c) => { c.after.extraKnownMarketplaces[MK].autoUpdate = !AUTO; }, new RegExp(`extraKnownMarketplaces\\[${q(MK)}\\] is not the entry planned`)],
      ['autoUpdate wrong, as planned', (c) => { c.plan.marketplace.entry.autoUpdate = !AUTO; c.after.extraKnownMarketplaces[MK].autoUpdate = !AUTO; }, new RegExp(`extraKnownMarketplaces\\[${q(MK)}\\] is not the entry planned`)],
      ['a made extraKnownMarketplaces holding more', (c) => { c.plan.marketplace.created = true; }, /extraKnownMarketplaces holds more than the entry made/],
      ['another marketplace changed', (c) => { c.after.extraKnownMarketplaces['other-marketplace'].source.repo = 'example/changed'; }, /a value outside the planned paths changed, or moved/],
      ['a value outside changed', (c) => { c.after.model = 'sonnet'; }, /a value outside the planned paths changed, or moved/],
      ['a key moved', (c) => { const m = c.after.model; delete c.after.model; c.after.model = m; }, /a value outside the planned paths changed, or moved/],
      ['an autoMode entry outside soft_deny changed', (c) => c.after.autoMode.allow.push('Placeholder added'), /a value outside the planned paths changed, or moved/],
      ['defaultMode changed', (c) => { c.after.permissions.defaultMode = 'default'; }, /a value outside the planned paths changed, or moved/],
    ];
    for (const [name, change, re] of breaks) {
      const c = userCase();
      change(c);
      assert.throws(() => verifyPlan(c.doc, c.after, c.plan, RULES), re, name);
    }
  });

  test('a plan that is wrong is caught by the self-check before anything is written: exit 1, said as a self-check, no patch', () => withRoot((root) => {
    const breaks = [
      ['an op that adds a push allow', (b) => b.ops.push({ op: 'push', path: ['permissions', 'allow'], value: 'Bash(git push *)' }), /^self-check: permissions\.allow is not the kept entries plus the per-tool list; no patch was written$/],
      ['an op that cannot apply', (b) => b.ops.push({ op: 'delete', path: ['permissions', 'allow', 999] }), /^self-check: the generated ops do not apply as writer ops \(op \d+ \(delete \["permissions","allow",999\]\): the path does not exist .*\); no patch was written$/],
      ['an op the writer does not know', (b) => b.ops.push({ op: 'frob', path: [] }), /^self-check: the generated ops do not apply as writer ops \(op \d+: unknown op "frob" .*\); no patch was written$/],
      ['a plan whose lists disagree with its ops', (b) => b.plan.deny.pop(), /^self-check: permissions\.deny is not the list planned; no patch was written$/],
    ];
    for (const [name, change, re] of breaks) {
      const sub = fs.mkdtempSync(path.join(root, 'case-'));
      const w = userWorld(sub);
      const r = permissionPatch({ rules: w.rules, target: 'user', file: w.settings, marketplaces: w.marketplaces, expected: w.expected, out: w.out, seams: { afterPlan: change } });
      assert.deepEqual([r.ok, r.exit, r.written], [false, 1, false], name);
      assert.match(r.error, re, name);
      assert.equal(fs.existsSync(w.out), false, `${name}: no patch`);
      assert.deepEqual(fs.readdirSync(sub).filter((n) => n.includes('.tmp-')), [], `${name}: no temp file`);
    }
  }));

  test('verifyPlan in project mode checks allow and everything else, never the user-only lists', () => {
    const doc = racer01Fixture();
    doc.permissions.deny = ['Skill(example:*)'];
    const built = planProject({ rules: RULES, doc, key: RACER01 });
    const after = clone(doc);
    applyOps(after, built.ops);
    assert.doesNotThrow(() => verifyPlan(doc, after, built.plan, RULES));
    const moved = clone(after);
    moved.permissions.deny.push('Bash(ls)');
    assert.throws(() => verifyPlan(doc, moved, built.plan, RULES), /a value outside the planned paths changed, or moved/);
    const kept = clone(after);
    kept.permissions.allow.unshift('Bash(*)');
    assert.throws(() => verifyPlan(doc, kept, built.plan, RULES), /permissions\.allow is not the kept entries plus the per-tool list/);
  });

  test('planUncatalogued: the plan passes verifyPlan, keeps exactly the unflagged allows in order, and a change outside them fails it; the file\'s own run-code deny clears its server\'s glob', () => {
    const doc = local01Fixture();
    const built = planUncatalogued({ rules: RULES, doc, expected: LOCAL01_EXPECTED });
    assert.deepEqual([built.binds, built.plan.key, built.plan.kept], [1, null, ['Bash(example-2 *)', 'Read(*)']]);
    const after = clone(doc);
    applyOps(after, built.ops);
    assert.doesNotThrow(() => verifyPlan(doc, after, built.plan, RULES));
    const changed = clone(after);
    changed.enableAllProjectMcpServers = false;
    assert.throws(() => verifyPlan(doc, changed, built.plan, RULES), /a value outside the planned paths changed, or moved/);
    assert.throws(() => planUncatalogued({ rules: RULES, doc, expected: [] }), /computed but not expected: /);
    const ownDeny = { permissions: { allow: [`mcp__${EXTRA}__*`, 'Read(*)'], deny: [`mcp__${EXTRA}__${RUN}`] } };
    assert.deepEqual(planUncatalogued({ rules: RULES, doc: ownDeny, expected: [] }).plan.removed, [], 'a deny in the file itself counts, as the catalog\'s do');
  });
});
