// lib/plugin-grants.mjs: the push and run-code grants in installed plugins'
// allowed-tools frontmatter, and PLUGIN_GRANTS, the baseline the liveness
// check holds them against. The frontmatter and component cases came over
// from the landing check's tests with the functions (2026-10-23, review
// round 1); the landing check was retired by the U4 cut (2026-10-27).
//
// Every plugin home is synthetic, built from the test's own temp root (insight
// 006) and removed in a finally that covers the whole test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PLUGIN_GRANTS, frontmatter, parseAllowedTools, pluginComponents, pluginGrants } from '../lib/plugin-grants.mjs';
import { CATALOG, matchesPush, skipsSafetyCheck } from '../lib/permissions.mjs';

const HOOKS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function put(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2));
  return file;
}

function inTemp(fn) {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-grants-')));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const md = (tools) => `---\nname: x\ndescription: A test component.\nallowed-tools: ${tools}\n---\n\nBody.\n`;
const clone = (v) => JSON.parse(JSON.stringify(v));

// The plugins design 2b names, shaped as installed, plus one more a user's
// settings turn off. Markdown outside commands/ and skills/ is no component.
const PLUGINS = [
  { key: 'commit-commands@claude-plugins-official', dir: 'commit-commands', files: { 'commands/commit-push-pr.md': 'Bash(git push:*)', 'commands/commit.md': 'Bash(git add:*), Bash(git commit:*)' } },
  { key: 'compound-engineering@every-marketplace', dir: 'ce', files: { 'skills/ce-resolve-pr-feedback/SKILL.md': 'Bash(gh *), Bash(git *)', 'skills/ce-proof/SKILL.md': 'Bash', 'skills/ce-product-pulse/SKILL.md': 'Bash', 'skills/ce-plan/SKILL.md': 'Read, Grep', 'tests/fixture/SKILL.md': 'Bash' } },
  { key: 'pr-review-toolkit@claude-plugins-official', dir: 'prt', files: { 'commands/review-pr.md': 'Bash' } },
  { key: 'plugin-dev@claude-plugins-official', dir: 'plugin-dev', files: { 'commands/create-plugin.md': 'Bash' } },
  { key: 'off-plugin@x', dir: 'off', files: { 'commands/push-it.md': 'Bash(git push *)' } },
];
const OFF = { 'off-plugin@x': false };
// The push grants design 2b found, as pluginGrants reads them from PLUGINS:
// the baseline's two narrow ones and four bare `Bash` ones auto mode drops.
const DESIGN_2B = [
  'commit-commands:commit-push-pr Bash(git push:*)',
  'compound-engineering:ce-resolve-pr-feedback Bash(git *)',
  'compound-engineering:ce-proof Bash',
  'compound-engineering:ce-product-pulse Bash',
  'pr-review-toolkit:review-pr Bash',
  'plugin-dev:create-plugin Bash',
];

// A home under `root`: <home>/plugins/<dir>/... and
// <home>/.claude/plugins/installed_plugins.json listing each plugin's folder.
function home(root, plugins = PLUGINS) {
  const h = path.join(root, 'home');
  const installed = { version: 2, plugins: {} };
  for (const p of plugins) {
    const at = path.join(h, 'plugins', p.dir);
    for (const [rel, tools] of Object.entries(p.files)) put(path.join(at, ...rel.split('/')), md(tools));
    installed.plugins[p.key] = [{ scope: 'user', installPath: at, version: '1.0.0' }];
  }
  put(path.join(h, '.claude', 'plugins', 'installed_plugins.json'), installed);
  return h;
}
const installedOf = (h) => path.join(h, '.claude', 'plugins', 'installed_plugins.json');

// Makes `file` unreadable while it still stats as a file; returns the undo.
// Windows: a read-data deny for this user. Elsewhere: mode 000, which root
// still reads, so the caller checks that a read really fails.
function unreadable(file) {
  if (process.platform === 'win32') {
    const who = os.userInfo().username;
    const r = spawnSync('icacls', [file, '/deny', `${who}:(RD)`], { encoding: 'utf8', shell: false, windowsHide: true });
    if (r.status !== 0) throw new Error(`icacls /deny failed: ${r.stderr || r.stdout}`);
    return () => spawnSync('icacls', [file, '/remove:d', who], { shell: false, windowsHide: true });
  }
  fs.chmodSync(file, 0o000);
  return () => fs.chmodSync(file, 0o644);
}
const readFails = (file) => { try { fs.readFileSync(file); return false; } catch { return true; } };

describe('PLUGIN_GRANTS, the baseline', () => {
  test("design 2b's two narrow grants, each one skipsSafetyCheck flags; its four bare-Bash grants reach a push but auto mode drops them, so they are not listed", () => {
    const rule = (g) => g.slice(g.indexOf(' ') + 1);
    assert.deepEqual(PLUGIN_GRANTS, [
      'commit-commands:commit-push-pr Bash(git push:*)',
      'compound-engineering:ce-resolve-pr-feedback Bash(git *)',
    ]);
    for (const g of PLUGIN_GRANTS) assert.ok(skipsSafetyCheck(rule(g)), g);
    for (const g of DESIGN_2B.filter((x) => !PLUGIN_GRANTS.includes(x))) assert.ok(matchesPush(rule(g)) && !skipsSafetyCheck(rule(g)), g);
  });
});

describe('frontmatter and parseAllowedTools', () => {
  test('each form the installed plugins use', () => {
    assert.equal(frontmatter('no frontmatter'), null);
    assert.equal(frontmatter('\uFEFF---\r\nallowed-tools: Bash\r\n---\r\nbody'), 'allowed-tools: Bash');
    const at = (body) => parseAllowedTools(`name: x\n${body}\ndescription: y`);
    assert.deepEqual(at('allowed-tools: Bash(gh pr view *), Read Grep'), ['Bash(gh pr view *)', 'Read', 'Grep']);
    assert.deepEqual(at('allowed-tools: Bash(git add:*, git commit:*), Read'), ['Bash(git add:*, git commit:*)', 'Read'], 'a comma inside parens splits nothing');
    assert.deepEqual(at('allowed-tools: ["Read", "Bash(git push:*)",]'), ['Read', 'Bash(git push:*)']);
    assert.deepEqual(at('allowed-tools: [\n  "Read",\n  "Bash"\n]'), ['Read', 'Bash']);
    assert.deepEqual(at('allowed-tools:\n  - Read\n  - "Bash(git *)"'), ['Read', 'Bash(git *)']);
    assert.deepEqual(at('allowed-tools: |\n  Read, Bash'), ['Read', 'Bash']);
    assert.deepEqual(at("allowed-tools: 'Bash'"), ['Bash']);
    assert.deepEqual(parseAllowedTools('name: x'), []);
    assert.deepEqual(parseAllowedTools(null), []);
  });

  test('the value ends at the next top-level key; a frontmatter needs its closing line', () => {
    assert.deepEqual(parseAllowedTools('allowed-tools:\n  - Read\nmodel: opus\n  - Bash'), ['Read']);
    assert.equal(frontmatter('---\nallowed-tools: Bash\nno closing line'), null);
    assert.equal(frontmatter('text first\n---\nallowed-tools: Bash\n---\n'), null, 'a frontmatter starts the file');
  });
});

describe('pluginComponents', () => {
  test("commands by path, skills by folder, plugin.json's extra paths; other markdown is no component", () => {
    inTemp((root) => {
      put(path.join(root, 'commands', 'a.md'), 'x');
      put(path.join(root, 'commands', 'g', 'b.md'), 'x');
      put(path.join(root, 'skills', 's', 'SKILL.md'), 'x');
      put(path.join(root, 'skills', 'not-a-skill', 'README.md'), 'x');
      put(path.join(root, 'extra', 'c.md'), 'x');
      put(path.join(root, 'more', 't', 'SKILL.md'), 'x');
      put(path.join(root, 'one', 'SKILL.md'), 'x');
      put(path.join(root, '.claude-plugin', 'plugin.json'), { commands: './extra', skills: ['./more', './one'] });
      put(path.join(root, 'tests', 'z.md'), 'x');
      assert.deepEqual(pluginComponents(root).map((c) => c.name), ['a', 'c', 'g:b', 'one', 's', 't']);
      assert.equal(pluginComponents(root).find((c) => c.name === 'g:b').file, path.join(root, 'commands', 'g', 'b.md'));
    });
  });

  test('a plugin.json that is not JSON, or JSON null, adds nothing and breaks nothing', () => {
    inTemp((root) => {
      put(path.join(root, 'commands', 'a.md'), 'x');
      put(path.join(root, 'extra', 'c.md'), 'x');
      for (const manifest of ['{ "commands": ', 'null']) {
        put(path.join(root, '.claude-plugin', 'plugin.json'), manifest);
        assert.deepEqual(pluginComponents(root).map((c) => c.name), ['a'], manifest);
      }
    });
  });
});

describe('pluginGrants', () => {
  test("design 2b's world: the six grants live, the off plugin's grant listed apart, components only", () => {
    inTemp((root) => {
      const h = home(root);
      const g = pluginGrants({ home: h, enabledPlugins: OFF });
      assert.equal(g.ok, true);
      assert.equal(g.why, null);
      assert.deepEqual(g.live, [...DESIGN_2B].sort());
      assert.deepEqual(g.disabled, ['off-plugin:push-it Bash(git push *)']);
      assert.ok(![...g.live, ...g.disabled].some((x) => x.includes('fixture')), 'markdown outside commands/ and skills/ is no component');
      assert.equal(g.scanned, 9);
      assert.deepEqual(g.unread, []);
      assert.deepEqual(g.grants.find((x) => x.grant === 'commit-commands:commit-push-pr Bash(git push:*)'),
        { grant: 'commit-commands:commit-push-pr Bash(git push:*)', plugin: 'commit-commands', component: 'commit-push-pr', rule: 'Bash(git push:*)', live: true });
      assert.deepEqual(g.grants.map((x) => x.grant), [...g.live, ...g.disabled].sort());
    });
  });

  test('a plugin enabledPlugins does not set false counts as enabled; an extra grant and a run-code grant are found', () => {
    inTemp((root) => {
      const h = home(root);
      assert.ok(pluginGrants({ home: h }).live.includes('off-plugin:push-it Bash(git push *)'), 'no enabledPlugins at all');
      assert.ok(pluginGrants({ home: h, enabledPlugins: { 'off-plugin@x': true } }).live.includes('off-plugin:push-it Bash(git push *)'));
      put(path.join(h, 'plugins', 'prt', 'commands', 'nested', 'ship.md'), md('Read, Bash(git push *)'));
      put(path.join(h, 'plugins', 'prt', 'skills', 'browse', 'SKILL.md'), md('mcp__playwright__*, mcp__playwright__browser_click'));
      const g = pluginGrants({ home: h, enabledPlugins: OFF });
      assert.deepEqual(g.live.filter((x) => !DESIGN_2B.includes(x)), ['pr-review-toolkit:browse mcp__playwright__*', 'pr-review-toolkit:nested:ship Bash(git push *)']);
    });
  });

  test("claudeDir names where installed_plugins.json is; the catalog given is the one rules are read against", () => {
    inTemp((root) => {
      const h = home(root);
      const elsewhere = path.join(root, 'elsewhere');
      fs.cpSync(path.join(h, '.claude'), elsewhere, { recursive: true });
      fs.rmSync(installedOf(h));
      assert.equal(pluginGrants({ home: h, enabledPlugins: OFF }).ok, false);
      assert.deepEqual(pluginGrants({ home: h, claudeDir: elsewhere, enabledPlugins: OFF }).live, [...DESIGN_2B].sort());
      // Two grants only the catalog decides: a command no push sample names
      // (a catalog that adds one makes it a push grant) and the run-code tool
      // (a catalog naming another tool makes it none).
      put(path.join(h, 'plugins', 'prt', 'commands', 'ship.md'), md('Bash(ship-it *), mcp__playwright__browser_run_code_unsafe'));
      const extra = (catalog) => pluginGrants({ home: h, claudeDir: elsewhere, enabledPlugins: OFF, catalog }).live.filter((x) => !DESIGN_2B.includes(x));
      assert.deepEqual(extra(undefined), ['pr-review-toolkit:ship mcp__playwright__browser_run_code_unsafe']);
      const custom = { ...CATALOG, pushSamples: [...CATALOG.pushSamples, { shell: 'Bash', command: 'ship-it now' }], playwright: { ...CATALOG.playwright, runCode: 'browser_other' } };
      assert.deepEqual(extra(custom), ['pr-review-toolkit:ship Bash(ship-it *)']);
    });
  });

  test('installed_plugins.json missing, not JSON, or without a plugins object: not ok, with why, nothing listed', () => {
    inTemp((root) => {
      const h = home(root);
      const empty = { live: [], disabled: [], grants: [], unread: [], scanned: 0 };
      for (const [bytes, why] of [['{ "plugins": ', /^installed_plugins\.json is not JSON \(/], ['{"version": 2}', /^installed_plugins\.json holds no plugins object$/], ['null', /^installed_plugins\.json holds no plugins object$/], ['{"plugins": []}', /^installed_plugins\.json holds no plugins object$/]]) {
        put(installedOf(h), bytes);
        const { ok, why: said, ...rest } = pluginGrants({ home: h, enabledPlugins: OFF });
        assert.equal(ok, false, bytes);
        assert.match(said, why, bytes);
        assert.deepEqual(rest, empty, bytes);
      }
      fs.rmSync(installedOf(h));
      assert.equal(pluginGrants({ home: h, enabledPlugins: OFF }).why, 'installed_plugins.json is missing');
    });
  });

  test('a byte-order mark and a plugin installed twice are read as the CLI lists them', () => {
    inTemp((root) => {
      const h = home(root);
      const installed = JSON.parse(fs.readFileSync(installedOf(h), 'utf8'));
      const cc = installed.plugins['commit-commands@claude-plugins-official'];
      installed.plugins['commit-commands@claude-plugins-official'] = [...cc, { ...cc[0], scope: 'project' }];
      put(installedOf(h), `\uFEFF${JSON.stringify(installed)}`);
      const g = pluginGrants({ home: h, enabledPlugins: OFF });
      assert.equal(g.ok, true);
      assert.deepEqual(g.live, [...DESIGN_2B].sort(), 'the same grant from two entries is listed once');
      assert.equal(g.scanned, 11, 'both entries are read');
    });
  });

  test('a shape this reader does not know is not read at all (R2-C; until round 2 an entry with no installPath was skipped, and the half went quiet): another version, a plugin that is not a list, an entry with no installPath, or no component in any listed plugin; not ok, why names the first, nothing listed', () => {
    inTemp((root) => {
      const h = home(root);
      const base = JSON.parse(fs.readFileSync(installedOf(h), 'utf8'));
      const empty = { live: [], disabled: [], grants: [], unread: [], scanned: 0 };
      const CC = 'commit-commands@claude-plugins-official';
      const cases = [
        ['version 3', (v) => { v.version = 3; }, /^installed_plugins\.json is version 3, not 2, the shape this reader knows$/],
        ['no version', (v) => { delete v.version; }, /^installed_plugins\.json is version null, not 2/],
        ['a plugin that is not a list', (v) => { v.plugins[CC] = v.plugins[CC][0]; }, new RegExp(`^installed_plugins\\.json's plugins\\["${CC}"\\] is not a list$`)],
        ['an entry with no installPath', (v) => { v.plugins[CC].unshift({ scope: 'user', version: '0.9' }); }, new RegExp(`^installed_plugins\\.json's plugins\\["${CC}"\\]\\[0\\] has no installPath$`)],
        ['an empty installPath', (v) => { v.plugins[CC][0].installPath = ''; }, /\]\[0\] has no installPath$/],
        ['an installPath that is not a string', (v) => { v.plugins[CC][0].installPath = 7; }, /\]\[0\] has no installPath$/],
        ['no component in any listed plugin', (v) => { for (const k of Object.keys(v.plugins)) v.plugins[k] = [{ scope: 'user', installPath: path.join(root, 'nowhere', k) }]; }, /^installed_plugins\.json lists 5 plugins, but no skill or command was found in any$/],
      ];
      for (const [name, change, why] of cases) {
        const v = clone(base);
        change(v);
        put(installedOf(h), v);
        const { ok, why: said, ...rest } = pluginGrants({ home: h, enabledPlugins: OFF });
        assert.equal(ok, false, name);
        assert.match(said, why, name);
        assert.deepEqual(rest, empty, name);
      }
      put(installedOf(h), { version: 2, plugins: {} });
      assert.deepEqual(pluginGrants({ home: h, enabledPlugins: OFF }), { ok: true, why: null, ...empty }, 'no plugin at all is no shape change');
    });
  });

  test('one plugin name from two marketplaces, one turned off: the live copy stays live', () => {
    inTemp((root) => {
      const twins = [
        { key: 'twin@a', dir: 'twin-a', files: { 'commands/ship.md': 'Bash(git push *)' } },
        { key: 'twin@b', dir: 'twin-b', files: { 'commands/ship.md': 'Bash(git push *)' } },
      ];
      for (const off of ['twin@a', 'twin@b']) {
        const g = pluginGrants({ home: home(root, twins), enabledPlugins: { [off]: false } });
        assert.deepEqual(g.live, ['twin:ship Bash(git push *)'], off);
        assert.deepEqual(g.disabled, ['twin:ship Bash(git push *)'], off);
      }
    });
  });

  test('a component that cannot be read is listed in unread, never passed over', () => {
    inTemp((root) => {
      const h = home(root);
      const file = path.join(h, 'plugins', 'prt', 'commands', 'review-pr.md');
      const undo = unreadable(file);
      try {
        if (!readFails(file)) return; // root reads a mode-000 file: nothing to test here
        const g = pluginGrants({ home: h, enabledPlugins: OFF });
        assert.deepEqual(g.unread, [file]);
        assert.ok(!g.live.includes('pr-review-toolkit:review-pr Bash'));
        assert.equal(g.scanned, 9, 'it still counts as scanned');
      } finally {
        undo();
      }
    });
  });

  test('the module imports only node builtins and ./permissions.mjs, so a version folder can load it', () => {
    const src = fs.readFileSync(path.join(HOOKS, 'lib', 'plugin-grants.mjs'), 'utf8');
    const specs = [...src.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    assert.deepEqual(specs.filter((s) => !s.startsWith('node:')), ['./permissions.mjs']);
  });
});
