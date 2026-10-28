// check-config-liveness.mjs, run as the session-start hook runs it: a child
// process, here with every override pointed into a temp root that is also
// HOME and USERPROFILE, CLAUDE_PROJECT_DIR and CLAUDE_CODE_USE_POWERSHELL_TOOL
// out of its environment. This file covers the permissions block (U4, D10);
// U9 extends it.
//
// Each world is built from the test's own temp root, never with the code
// under test (insight 006), and removed in a finally that covers the whole
// test. Its user settings are synthetic: the catalog's rules, its soft_deny
// entry and the auto-updating marketplace beside placeholder entries, never a copy
// of anyone's real settings. Its installed plugins grant exactly the U4
// baseline, spelled out here rather than read from lib/plugin-grants.mjs. Its
// monorepo is a real git repository, and a worktree, where a test needs one,
// is made by a real `git worktree add`.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MANIFEST } from '../deploy.mjs';
import { gitEnv } from './leak.mjs';

const HOOKS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(HOOKS, 'check-config-liveness.mjs');
const CATALOG_FILE = path.join(HOOKS, 'lib', 'permission-rules.json');
const CATALOG = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
const CATALOG_RULES = CATALOG.ask.length + CATALOG.deny.length;
const LENS = '---\nname: review-lens\ndescription: A test lens.\ntools: Read, Grep, Glob\nmodel: opus\n---\n\nA test body.\n';
const SOURCE_REL = 'projects/skills/ultramode-code-review';
const USER = '~/.claude/settings.json';
const FAILED = 'permissions check failed: ';
const LINK = process.platform === 'win32' ? 'junction' : 'dir';

// Installed plugins whose push grants are design 2b's six, each beside rules
// no push matcher flags: the U4 baseline's two narrow ones and four bare
// `Bash` ones auto mode drops, so none is a warning. Plugin key -> {path
// below the plugin's folder: its allowed-tools}.
const BASELINE_PLUGINS = {
  'commit-commands@claude-plugins-official': { 'commands/commit-push-pr.md': 'Bash(git push:*)', 'commands/commit.md': 'Read, Bash(git status)' },
  'compound-engineering@every-marketplace': { 'skills/ce-resolve-pr-feedback/SKILL.md': 'Read, Bash(git *)', 'skills/ce-proof/SKILL.md': 'Bash', 'skills/ce-product-pulse/SKILL.md': 'Bash', 'skills/ce-plan/SKILL.md': 'Read, Grep' },
  'pr-review-toolkit@claude-plugins-official': { 'commands/review-pr.md': 'Bash' },
  'plugin-dev@claude-plugins-official': { 'commands/create-plugin.md': 'Bash' },
};
const md = (tools) => `---\nname: x\ndescription: A test component.\nallowed-tools: ${tools}\n---\n\nBody.\n`;
const PLUGIN_TAIL = 'which the U4 baseline (lib/plugin-grants.mjs) does not list';

function put(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2));
}

// R/plugins/<name>/... for each plugin, and the installed_plugins.json in
// `claudeDir` that lists them.
function installPlugins(root, claudeDir, plugins) {
  const installed = { version: 2, plugins: {} };
  for (const [key, files] of Object.entries(plugins)) {
    const at = path.join(root, 'plugins', key.split('@')[0]);
    for (const [rel, tools] of Object.entries(files)) put(path.join(at, ...rel.split('/')), md(tools));
    installed.plugins[key] = [{ scope: 'user', installPath: at, version: '1.0.0' }];
  }
  put(path.join(claudeDir, 'plugins', 'installed_plugins.json'), installed);
}

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

// User settings holding everything the catalog asks for, beside entries that
// stand in for a person's own.
function cleanUser() {
  return {
    permissions: {
      allow: ['Read', 'Bash(npm test)', 'PowerShell(Get-Date)'],
      ask: ['Bash(rm *)', ...CATALOG.ask.map((r) => r.rule)],
      deny: CATALOG.deny.map((r) => r.rule),
    },
    autoMode: { soft_deny: ['A placeholder entry standing in for the user\'s own.', CATALOG.softDeny] },
    extraKnownMarketplaces: { [CATALOG.marketplace.name]: { source: { source: 'github', repo: 'example/marketplace' }, autoUpdate: CATALOG.marketplace.autoUpdate } },
  };
}

// git for the fixture's own calls: never the repository this suite runs in,
// never the machine's git config.
function fixtureGit(root, dir, ...args) {
  const env = Object.fromEntries(Object.entries(gitEnv()).filter(([k]) => !/^GIT_CONFIG/i.test(k)));
  Object.assign(env, {
    GIT_CONFIG_GLOBAL: path.join(root, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Liveness Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Liveness Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
  });
  const r = spawnSync('git', ['-C', dir, ...args], { env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000 });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.error ?? r.stderr}`);
}

// A world under a fresh temp root R, which is also the child's home:
//   R/.claude/settings.json            user settings (none when user is null)
//   R/.claude/agents/review-lens.md    the deployed lens (lens: same, differs, missing)
//   R/skills/ultramode-code-review     a junction into the monorepo's skill (junction)
//   R/project/                         the project dir
//   R/mono/                            the monorepo, a git repository unless git is false
//   R/mono/<SOURCE_REL>/agents/review-lens.md   the lens's tracked source
//   R/rules.json                       a byte copy of the catalog
//   R/wt/                              a worktree of R/mono (worktree)
//   R/plugins/<name>/, R/.claude/plugins/installed_plugins.json
//                                      the installed plugins (none when plugins is null)
function world({ user = cleanUser(), lens = 'same', junction = true, git = true, worktree = false, plugins = BASELINE_PLUGINS } = {}) {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'liveness-')));
  const w = {
    root,
    claude: path.join(root, '.claude'),
    settings: path.join(root, '.claude', 'settings.json'),
    skills: path.join(root, 'skills'),
    project: path.join(root, 'project'),
    mono: path.join(root, 'mono'),
    rules: path.join(root, 'rules.json'),
    wt: path.join(root, 'wt'),
  };
  w.source = path.join(w.mono, ...SOURCE_REL.split('/'), 'agents', 'review-lens.md');
  w.deployed = path.join(w.claude, 'agents', 'review-lens.md');
  try {
    if (user !== null) put(w.settings, user);
    put(w.source, LENS);
    if (lens === 'same') put(w.deployed, LENS);
    if (lens === 'differs') put(w.deployed, `${LENS}One more line.\n`);
    fs.mkdirSync(w.project, { recursive: true });
    fs.mkdirSync(w.skills, { recursive: true });
    if (junction) fs.symlinkSync(path.join(w.mono, ...SOURCE_REL.split('/')), path.join(w.skills, 'ultramode-code-review'), LINK);
    if (plugins !== null) installPlugins(root, w.claude, plugins);
    put(w.rules, fs.readFileSync(CATALOG_FILE));
    put(path.join(root, 'gitconfig'), '');
    if (git) fixtureGit(root, w.mono, 'init', '-q', '-b', 'main');
    if (worktree) {
      put(path.join(w.mono, 'README.md'), 'fixture\n');
      fixtureGit(root, w.mono, 'add', 'README.md');
      fixtureGit(root, w.mono, 'commit', '-qm', 'fixture');
      fixtureGit(root, w.mono, 'worktree', 'add', '-q', w.wt, '-b', 'side');
    }
  } catch (e) {
    fs.rmSync(root, { recursive: true, force: true });
    throw e;
  }
  return w;
}

// A world for `fn`, removed afterwards whatever fn did.
function inWorld(opts, fn) {
  const w = world(opts);
  try {
    return fn(w);
  } finally {
    fs.rmSync(w.root, { recursive: true, force: true });
  }
}

// The home is the world's; the two variables the block reads from the
// environment stay out unless a test sets them.
function childEnv(root, extra) {
  const drop = new Set(['HOME', 'USERPROFILE', 'CLAUDE_PROJECT_DIR', 'CLAUDE_CODE_USE_POWERSHELL_TOOL']);
  const env = Object.fromEntries(Object.entries(gitEnv()).filter(([k]) => !drop.has(k.toUpperCase())));
  return { ...env, HOME: root, USERPROFILE: root, ...extra };
}

// The script with every override pointed into the world. `rules` or
// `monorepo` null leaves that override out. Returns the warning lines (no
// leading "- ") beside the raw output; every run must exit 0.
function run(w, { script = SCRIPT, rules = w.rules, monorepo = w.mono, args = [], env = {} } = {}) {
  const argv = [script, '--claude-dir', w.claude, '--settings', w.settings, '--skills-dir', w.skills, '--project-dir', w.project];
  if (rules !== null) argv.push('--rules', rules);
  if (monorepo !== null) argv.push('--monorepo', monorepo);
  const r = spawnSync(process.execPath, [...argv, ...args], { env: childEnv(w.root, env), encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000 });
  assert.equal(r.error, undefined, String(r.error));
  assert.equal(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  const out = r.stdout.split('\n').filter(Boolean);
  if (out.length) assert.match(out[0], /^CONFIG LIVENESS WARNINGS \(/, r.stdout);
  const lines = out.slice(1);
  for (const l of lines) assert.ok(l.startsWith('- '), `not a warning line: ${l}`);
  return { stdout: r.stdout, stderr: r.stderr, header: out[0], lines: lines.map((l) => l.slice(2)) };
}

const label = (w, file) => `~/${path.relative(w.root, file).split(path.sep).join('/')}`;
const pushLine = (lbl, rule) => `permissions: ${lbl} allows ${rule}`;
const settingsAt = (dir, name = 'settings.local.json') => path.join(dir, '.claude', name);

// Exactly one warning, starting with `prefix`.
function only(r, prefix) {
  assert.equal(r.lines.length, 1, r.stdout);
  assert.ok(r.lines[0].startsWith(prefix), `expected a line starting "${prefix}":\n${r.stdout}`);
}
const has = (r, prefix) => assert.ok(r.lines.some((l) => l.startsWith(prefix)), `expected a line starting "${prefix}":\n${r.stdout}`);
const lacks = (r, prefix) => assert.ok(!r.lines.some((l) => l.startsWith(prefix)), `expected no line starting "${prefix}":\n${r.stdout}`);

describe('the permissions block: a world with everything in place', () => {
  test('prints nothing and exits 0: every catalog rule, the soft_deny entry, the auto-updating marketplace, an equal review-lens, benign project files, a worktree and only the baseline plugin grants', () => {
    inWorld({ worktree: true }, (w) => {
      put(settingsAt(w.mono), { permissions: { allow: ['Bash(npm test)'] } });
      put(settingsAt(path.join(w.mono, 'projects', 'archive', 'old')), { permissions: { allow: ['Read', 'mcp__playwright__browser_click'] } });
      put(settingsAt(path.join(w.wt, 'projects', 'app'), 'settings.json'), { permissions: { allow: ['Bash(git status)'] } });
      const r = run(w);
      assert.equal(r.stdout, '');
    });
  });

  test('without --rules the block reads lib/permission-rules.json, and without --monorepo the root comes from the skill junction', () => {
    inWorld({}, (w) => {
      assert.equal(run(w, { rules: null, monorepo: null }).stdout, '');
      // The junction's root is really scanned: a push allow there is found.
      const f = settingsAt(path.join(w.mono, 'projects', 'app'));
      put(f, { permissions: { allow: ['Bash(git push *)'] } });
      only(run(w, { rules: null, monorepo: null }), pushLine(label(w, f), 'Bash(git push *)'));
    });
  });
});

describe('the permissions block: each warning, from user settings', () => {
  test('a missing catalog rule (a D3 force-class deny, an ask until the cut): one line with the count and the first one missing', () => {
    const user = cleanUser();
    const gone = CATALOG.deny[5].rule;
    assert.match(CATALOG.deny[5].why, /blocked on every branch/);
    user.permissions.deny = user.permissions.deny.filter((r) => r !== gone);
    inWorld({ user }, (w) => only(run(w), `permissions: 1 of ${CATALOG_RULES} U4 catalog rules are missing from ${USER} (first: deny ${gone})`));
  });

  test('a missing deny rule is counted the same way', () => {
    const user = cleanUser();
    const gone = CATALOG.deny.slice(0, 3).map((r) => r.rule);
    user.permissions.deny = user.permissions.deny.filter((r) => !gone.includes(r));
    inWorld({ user }, (w) => only(run(w), `permissions: 3 of ${CATALOG_RULES} U4 catalog rules are missing from ${USER} (first: deny ${gone[0]})`));
  });

  test('the soft_deny entry missing', () => {
    const user = cleanUser();
    user.autoMode.soft_deny = user.autoMode.soft_deny.filter((s) => s !== CATALOG.softDeny);
    inWorld({ user }, (w) => only(run(w), `permissions: the U4 autoMode.soft_deny entry (destructive pushes to a default branch) is missing from ${USER}`));
  });

  test('the marketplace not set to auto-update: autoUpdate false, or no entry at all', () => {
    const prefix = `permissions: extraKnownMarketplaces["${CATALOG.marketplace.name}"].autoUpdate is not ${CATALOG.marketplace.autoUpdate} in ${USER}`;
    const off = cleanUser();
    off.extraKnownMarketplaces[CATALOG.marketplace.name].autoUpdate = !CATALOG.marketplace.autoUpdate;
    inWorld({ user: off }, (w) => only(run(w), prefix));
    const absent = cleanUser();
    delete absent.extraKnownMarketplaces;
    inWorld({ user: absent }, (w) => only(run(w), prefix));
  });

  test('a push allow and a run-code allow in user settings, each named; Bash(*), and a playwright glob whose run-code the user denies, are not', () => {
    const user = cleanUser();
    user.permissions.allow.push('Bash(git push *)');
    inWorld({ user }, (w) => only(run(w), pushLine(USER, 'Bash(git push *)')));
    const kept = cleanUser();
    kept.permissions.allow.push('Bash(*)', 'PowerShell(*)', 'mcp__playwright__*');
    inWorld({ user: kept }, (w) => assert.equal(run(w).stdout, '', 'auto mode drops Bash(*), and the catalog denies playwright\'s run-code'));
    const pw = cleanUser();
    pw.permissions.allow.push('mcp__playwright__*');
    pw.permissions.deny = pw.permissions.deny.filter((r) => r !== `mcp__playwright__${CATALOG.playwright.runCode}`);
    inWorld({ user: pw }, (w) => {
      const r = run(w);
      has(r, pushLine(USER, 'mcp__playwright__*'));
      has(r, `permissions: 1 of ${CATALOG_RULES} U4 catalog rules are missing`);
    });
  });

  test('a Bash deny with no PowerShell rule warns while CLAUDE_CODE_USE_POWERSHELL_TOOL is empty or unset, and not once it is set ("0" counts)', () => {
    const user = { permissions: { deny: ['Bash(rm -rf *)'] } };
    const prefix = `permissions: ${USER} denies a Bash command and no PowerShell rule applies`;
    inWorld({ user }, (w) => {
      has(run(w), prefix);
      has(run(w, { env: { CLAUDE_CODE_USE_POWERSHELL_TOOL: '' } }), prefix);
      lacks(run(w, { env: { CLAUDE_CODE_USE_POWERSHELL_TOOL: '0' } }), prefix);
      lacks(run(w, { env: { CLAUDE_CODE_USE_POWERSHELL_TOOL: '1' } }), prefix);
    });
  });

  test('review-lens not deployed, or deployed and different from its tracked source', () => {
    inWorld({ lens: 'missing' }, (w) => only(run(w), 'review-lens: ~/.claude/agents/review-lens.md is missing'));
    inWorld({ lens: 'differs' }, (w) => only(run(w), 'review-lens: ~/.claude/agents/review-lens.md differs from its tracked source'));
  });

  test('review-lens\'s tracked source missing from the monorepo: one line naming it', () => {
    inWorld({}, (w) => {
      fs.rmSync(w.source);
      only(run(w), `review-lens: could not read its tracked source ${label(w, w.source)} (no such file)`);
    });
  });
});

describe('the permissions block: the project files it reads', () => {
  test('folders 0 to 3 levels below the root are read; level 4, node_modules and .git are not', () => {
    inWorld({}, (w) => {
      const allow = { permissions: { allow: ['Bash(git push *)'] } };
      const read = [
        settingsAt(w.mono),
        settingsAt(path.join(w.mono, 'tools'), 'settings.json'),
        settingsAt(path.join(w.mono, 'projects', 'app')),
        settingsAt(path.join(w.mono, 'projects', 'archive', 'old')),
      ];
      const unread = [
        settingsAt(path.join(w.mono, 'projects', 'archive', 'old', 'deeper')),
        settingsAt(path.join(w.mono, 'node_modules', 'pkg'), 'settings.json'),
        settingsAt(path.join(w.mono, 'projects', 'node_modules')),
        settingsAt(path.join(w.mono, '.git', 'info')),
      ];
      for (const f of [...read, ...unread]) put(f, allow);
      const r = run(w);
      assert.deepEqual(r.lines.map((l) => l.replace(/ allows .*/, '')).sort(), read.map((f) => `permissions: ${label(w, f)}`).sort(), r.stdout);
      for (const f of read) has(r, pushLine(label(w, f), 'Bash(git push *)'));
    });
  });

  test('a playwright run-code allow in a project file is named, unless user settings deny that server\'s run-code tool', () => {
    inWorld({}, (w) => {
      const f = settingsAt(path.join(w.mono, 'projects', 'game'));
      put(f, { permissions: { allow: ['mcp__playwright-seat-1__*', 'mcp__playwright-seat-2__*'] } });
      assert.equal(run(w).stdout, '', 'the catalog denies run-code on burned\'s seats');
      put(f, { permissions: { allow: ['mcp__playwright-seat-1__*', 'mcp__playwright-seat-11__*', 'mcp__playwright-seat-12__*'] } });
      only(run(w), `${pushLine(label(w, f), 'mcp__playwright-seat-11__*')} (and 1 more), which covers playwright's ${CATALOG.playwright.runCode}`);
    });
  });

  test('a worktree git lists for the monorepo is read too, and one inside the monorepo is read once', () => {
    inWorld({ worktree: true }, (w) => {
      const f = settingsAt(path.join(w.wt, 'projects', 'archive', 'old'));
      put(f, { permissions: { allow: ['Bash(git push *)'] } });
      only(run(w), pushLine(label(w, f), 'Bash(git push *)'));
      // Level 2 of the monorepo and level 0 of its own worktree root.
      const inner = path.join(w.mono, 'trees', 'inner');
      fixtureGit(w.root, w.mono, 'worktree', 'add', '-q', inner, '-b', 'inner');
      fs.rmSync(f);
      const g = settingsAt(inner);
      put(g, { permissions: { allow: ['Bash(git push)'] } });
      only(run(w), pushLine(label(w, g), 'Bash(git push)'));
    });
  });

  test('a junction inside the monorepo is not followed', () => {
    inWorld({}, (w) => {
      const outside = path.join(w.root, 'outside');
      // A canary the block flags, so a silent result means the link was not followed.
      put(settingsAt(outside), { permissions: { allow: ['Bash(git push *)'] } });
      fs.mkdirSync(path.join(w.mono, 'projects'), { recursive: true });
      fs.symlinkSync(outside, path.join(w.mono, 'projects', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
      assert.equal(run(w).stdout, '');
    });
  });

  test('user settings inside a scanned root are read once, as user settings', () => {
    const user = cleanUser();
    user.permissions.allow.push('Bash(git push *)');
    inWorld({ user }, (w) => {
      fixtureGit(w.root, w.root, 'init', '-q', '-b', 'main');
      const r = run(w, { monorepo: w.root });
      const push = r.lines.filter((l) => l.includes(' allows '));
      assert.deepEqual(push.map((l) => l.replace(/ allows .*/, '')), [`permissions: ${USER}`], r.stdout);
    });
  });

  test('a GIT_DIR in the environment does not move the worktree listing to another repository', () => {
    inWorld({}, (w) => assert.equal(run(w, { env: { GIT_DIR: path.join(w.root, 'nowhere.git') } }).stdout, ''));
  });

  test('files in one .claude folder apply together: a Bash deny beside a PowerShell rule is fine, a Bash deny alone is not', () => {
    // User settings with no PowerShell rule, so only the project files decide.
    inWorld({ user: { permissions: { allow: ['Read'] } } }, (w) => {
      const together = path.join(w.mono, 'projects', 'both');
      put(settingsAt(together, 'settings.json'), { permissions: { deny: ['Bash(curl *)'] } });
      put(settingsAt(together), { permissions: { allow: ['PowerShell(Get-Date)'] } });
      const alone = settingsAt(path.join(w.mono, 'projects', 'alone'), 'settings.json');
      put(alone, { permissions: { deny: ['Bash(curl *)'] } });
      const r = run(w);
      const landmine = r.lines.filter((l) => l.includes('no PowerShell rule applies'));
      assert.equal(landmine.length, 1, r.stdout);
      assert.ok(landmine[0].startsWith(`permissions: ${label(w, alone)} denies a Bash command`), r.stdout);
    });
  });

  test('an unreadable project file is named and the others are still read', () => {
    inWorld({}, (w) => {
      const broken = settingsAt(path.join(w.mono, 'projects', 'broken'));
      const list = settingsAt(path.join(w.mono, 'projects', 'list'), 'settings.json');
      const good = settingsAt(path.join(w.mono, 'projects', 'good'));
      put(broken, '{ "permissions": ');
      put(list, '[]');
      put(good, { permissions: { allow: ['Bash(git push)'] } });
      const r = run(w);
      assert.equal(r.lines.length, 3, r.stdout);
      has(r, `permissions: could not read ${label(w, broken)} (not valid JSON), so its rules were not checked`);
      has(r, `permissions: could not read ${label(w, list)} (not a JSON object), so its rules were not checked`);
      has(r, pushLine(label(w, good), 'Bash(git push)'));
    });
  });

  test('unreadable user settings are named: malformed, or no file at all', () => {
    inWorld({ user: '{"permissions": [' }, (w) => only(run(w), `permissions: could not read ${USER} (not valid JSON), so its rules were not checked`));
    inWorld({ user: null }, (w) => only(run(w), `permissions: could not read ${USER} (no such file), so its rules were not checked`));
  });
});

describe('the permissions block: no monorepo root, or no git', () => {
  test('no junction and no --monorepo: one line, and user settings and the deployed lens are still checked; the S1 lines (the push allow, then the blind root) come before the lens note', () => {
    const user = cleanUser();
    user.permissions.allow.push('Bash(git push *)');
    inWorld({ user, junction: false, lens: 'missing' }, (w) => {
      const r = run(w, { monorepo: null });
      assert.equal(r.lines.length, 3, r.stdout);
      assert.ok(r.lines[0].startsWith(pushLine(USER, 'Bash(git push *)')), r.stdout);
      assert.ok(r.lines[1].startsWith('permissions: no monorepo root was found (~/skills/ultramode-code-review does not resolve), so the project settings files and the review-lens source were not checked'), r.stdout);
      assert.ok(r.lines[2].startsWith('review-lens: ~/.claude/agents/review-lens.md is missing'), r.stdout);
    });
  });

  test('a skill folder that is not <monorepo>/projects/skills/ultramode-code-review is no root; nor is a --monorepo that is not a folder', () => {
    inWorld({ junction: false }, (w) => {
      const elsewhere = path.join(w.root, 'elsewhere', 'a', 'b', 'ultramode-code-review');
      fs.mkdirSync(elsewhere, { recursive: true });
      put(settingsAt(path.join(w.root, 'elsewhere')), { permissions: { allow: ['Bash(git push *)'] } });
      fs.symlinkSync(elsewhere, path.join(w.skills, 'ultramode-code-review'), process.platform === 'win32' ? 'junction' : 'dir');
      only(run(w, { monorepo: null }), `permissions: no monorepo root was found (~/skills/ultramode-code-review is ${label(w, elsewhere)}, not <monorepo>/${SOURCE_REL})`);
      only(run(w, { monorepo: path.join(w.root, 'nowhere') }), 'permissions: no monorepo root was found (--monorepo ~/nowhere is not a folder)');
    });
  });

  test('a root that is not the top of a repository: one line, git never climbs to the repository above, and the root\'s own files are still read', () => {
    inWorld({ git: false }, (w) => {
      // The temp root is a repository; the monorepo inside it is not. Its
      // worktrees are not the monorepo's, and a walk of them would reach
      // this file.
      fixtureGit(w.root, w.root, 'init', '-q', '-b', 'main');
      // A canary the block flags: a third line would mean the walk climbed.
      put(settingsAt(path.join(w.root, 'above')), { permissions: { allow: ['Bash(git push *)'] } });
      const f = settingsAt(path.join(w.mono, 'projects', 'app'));
      put(f, { permissions: { allow: ['Bash(git push *)'] } });
      const r = run(w);
      assert.equal(r.lines.length, 2, r.stdout);
      assert.ok(r.lines[0].startsWith(pushLine(label(w, f), 'Bash(git push *)')), r.stdout);
      assert.ok(r.lines[1].startsWith('permissions: git could not list the worktrees of ~/mono ('), r.stdout);
      assert.ok(r.lines[1].endsWith('), so only that folder\'s settings files were checked'), r.stdout);
    });
  });
});

describe('the permissions block: plugin grants', () => {
  const pushTail = 'so a push can skip the auto-mode safety check';
  const runTail = `which covers playwright's ${CATALOG.playwright.runCode} (arbitrary code) before the safety check`;
  const grantLine = (plugin, grant, more, tail) => `permissions: enabled plugin ${plugin} grants ${grant}${more}, ${PLUGIN_TAIL}, ${tail}`;
  const pluginDir = (w, name) => path.join(w.root, 'plugins', name);

  test('a push grant the baseline does not list, in an enabled plugin: one line naming it', () => {
    inWorld({}, (w) => {
      put(path.join(pluginDir(w, 'commit-commands'), 'commands', 'ship.md'), md('Read, Bash(git push *)'));
      assert.deepEqual(run(w).lines, [grantLine('commit-commands', 'commit-commands:ship Bash(git push *)', '', pushTail)]);
    });
  });

  test('one line per plugin and kind: two grants in one plugin share a line, a run-code grant and another plugin get their own; a grant auto mode drops, or a run-code glob the user denies, is none', () => {
    inWorld({}, (w) => {
      put(path.join(pluginDir(w, 'commit-commands'), 'commands', 'ship.md'), md('Bash(git push *), Bash(git push)'));
      put(path.join(pluginDir(w, 'commit-commands'), 'skills', 'browse', 'SKILL.md'), md('mcp__playwright-seat-11__*, mcp__playwright__*, mcp__playwright__browser_click'));
      put(path.join(pluginDir(w, 'plugin-dev'), 'commands', 'deploy.md'), md('Bash(*), Bash(git push origin *)'));
      assert.deepEqual(run(w).lines, [
        grantLine('commit-commands', 'commit-commands:browse mcp__playwright-seat-11__*', '', runTail),
        grantLine('commit-commands', 'commit-commands:ship Bash(git push *)', ' (and 1 more)', pushTail),
        grantLine('plugin-dev', 'plugin-dev:deploy Bash(git push origin *)', '', pushTail),
      ]);
    });
  });

  test('the user\'s denies clear a plugin\'s run-code glob, a project\'s do not (a grant applies in every session); with user settings unread, nothing clears it', () => {
    const grant = grantLine('commit-commands', 'commit-commands:browse mcp__playwright__*', '', runTail);
    const user = cleanUser();
    user.permissions.deny = user.permissions.deny.filter((r) => r !== `mcp__playwright__${CATALOG.playwright.runCode}`);
    inWorld({ user }, (w) => {
      put(path.join(pluginDir(w, 'commit-commands'), 'skills', 'browse', 'SKILL.md'), md('mcp__playwright__*'));
      put(settingsAt(path.join(w.mono, 'projects', 'app')), { permissions: { deny: [`mcp__playwright__${CATALOG.playwright.runCode}`] } });
      const r = run(w);
      assert.equal(r.lines[0], grant, r.stdout);
      assert.equal(r.lines.length, 2, r.stdout);
      assert.match(r.lines[1], /^permissions: 1 of \d+ U4 catalog rules are missing from /, 'the deny taken out of user settings is named too');
    });
    inWorld({ user: '{"permissions": [' }, (w) => {
      put(path.join(pluginDir(w, 'commit-commands'), 'skills', 'browse', 'SKILL.md'), md('mcp__playwright__*'));
      assert.deepEqual(run(w).lines, [grant, `permissions: could not read ${USER} (not valid JSON), so its rules were not checked`]);
    });
  });

  test('one way only: a baseline grant that disappears, or a whole plugin that goes, is no warning', () => {
    inWorld({}, (w) => {
      put(path.join(pluginDir(w, 'commit-commands'), 'commands', 'commit-push-pr.md'), md('Read'));
      fs.rmSync(path.join(pluginDir(w, 'compound-engineering'), 'skills', 'ce-proof'), { recursive: true });
      assert.equal(run(w).stdout, '');
      installPlugins(w.root, w.claude, Object.fromEntries(Object.entries(BASELINE_PLUGINS).filter(([key]) => !key.startsWith('plugin-dev@'))));
      assert.equal(run(w).stdout, '');
    });
  });

  test('a plugin user settings turn off is not read as live, unless a project settings file turns it back on; one no setting names is live', () => {
    const user = cleanUser();
    user.enabledPlugins = { 'deploy-kit@example': false };
    inWorld({ user, plugins: { ...BASELINE_PLUGINS, 'deploy-kit@example': { 'commands/ship.md': 'Bash(git push *)' } } }, (w) => {
      assert.equal(run(w).stdout, '');
      put(settingsAt(path.join(w.mono, 'projects', 'app'), 'settings.json'), { enabledPlugins: { 'deploy-kit@example': true } });
      assert.deepEqual(run(w).lines, [grantLine('deploy-kit', 'deploy-kit:ship Bash(git push *)', '', pushTail)]);
    });
    inWorld({ plugins: { ...BASELINE_PLUGINS, 'deploy-kit@example': { 'commands/ship.md': 'Bash(git push *)' } } }, (w) => {
      assert.deepEqual(run(w).lines, [grantLine('deploy-kit', 'deploy-kit:ship Bash(git push *)', '', pushTail)]);
    });
  });

  test('installed_plugins.json is read from --claude-dir', () => {
    inWorld({ lens: 'missing' }, (w) => {
      const alt = path.join(w.root, 'alt-claude');
      installPlugins(w.root, alt, { ...BASELINE_PLUGINS, 'deploy-kit@example': { 'commands/ship.md': 'Bash(git push *)' } });
      const r = spawnSync(process.execPath, [SCRIPT, '--claude-dir', alt, '--settings', w.settings, '--skills-dir', w.skills, '--project-dir', w.project, '--rules', w.rules, '--monorepo', w.mono], { env: childEnv(w.root, {}), encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000 });
      assert.equal(r.status, 0, r.stderr);
      const lines = r.stdout.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
      assert.deepEqual(lines, [
        grantLine('deploy-kit', 'deploy-kit:ship Bash(git push *)', '', pushTail),
        'review-lens: ~/.claude/agents/review-lens.md is missing, so a workflow naming agentType review-lens gets no read-only lens',
      ], r.stdout);
    });
  });

  test('installed_plugins.json missing, not JSON, holding no plugins object, or in a shape the reader does not know (R2-C): one line after the push allow, and the rest of the block still runs', () => {
    const user = cleanUser();
    user.permissions.allow.push('Bash(git push *)');
    inWorld({ user, plugins: null }, (w) => {
      const installed = path.join(w.claude, 'plugins', 'installed_plugins.json');
      const check = (why) => {
        const r = run(w);
        assert.equal(r.lines.length, 2, r.stdout);
        assert.ok(r.lines[0].startsWith(pushLine(USER, 'Bash(git push *)')), r.stdout);
        assert.match(r.lines[1], new RegExp(`^permissions: plugin grants were not checked \\(installed_plugins\\.json${why}`));
      };
      check(' is missing\\)$');
      put(installed, '{ "plugins": ');
      check(' is not JSON \\(');
      put(installed, { version: 2 });
      check(' holds no plugins object\\)$');
      put(installed, { version: 3, plugins: {} });
      check(' is version 3, not 2, the shape this reader knows\\)$');
      put(installed, { version: 2, plugins: { 'x@y': [{ scope: 'user' }] } });
      check('\'s plugins\\["x@y"\\]\\[0\\] has no installPath\\)$');
    });
  });

  test('a plugin skill or command file that cannot be read is named, never passed over', () => {
    inWorld({}, (w) => {
      const file = path.join(pluginDir(w, 'pr-review-toolkit'), 'commands', 'review-pr.md');
      const undo = unreadable(file);
      try {
        if (!readFails(file)) return; // root reads a mode-000 file: nothing to test here
        assert.deepEqual(run(w).lines, [`permissions: could not read 1 plugin skill or command file (first: ${label(w, file)}), so their grants were not checked`]);
      } finally {
        undo();
      }
    });
  });
});

describe('the permissions block never goes silent', () => {
  const failedOnly = (r, reason) => {
    assert.equal(r.lines.length, 1, r.stdout);
    assert.ok(r.lines[0].startsWith(FAILED), r.stdout);
    assert.match(r.lines[0].slice(FAILED.length), reason);
  };

  test('a --rules file that is not JSON, not a catalog, missing a key the check reads, or missing: one failed line each', () => {
    inWorld({}, (w) => {
      put(w.rules, '{ "ask": [');
      failedOnly(run(w), /^~\/rules\.json is not valid JSON$/);
      put(w.rules, '{}');
      failedOnly(run(w), /^~\/rules\.json is not a permission catalog/);
      const noFlag = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
      delete noFlag.marketplace.autoUpdate;
      put(w.rules, noFlag);
      failedOnly(run(w), /^~\/rules\.json is not a permission catalog/);
      for (const pushSamples of [undefined, [], [{ shell: 'Bash' }]]) {
        put(w.rules, { ...CATALOG, pushSamples });
        failedOnly(run(w), /^~\/rules\.json is not a permission catalog/);
      }
      fs.rmSync(w.rules);
      failedOnly(run(w), /^could not read ~\/rules\.json \(no such file\)$/);
    });
  });

  test('--rules is the catalog used: a smaller one held in full reads clean, and the same settings fail the real one', () => {
    // Two twin denies, so a PowerShell rule is present and the PowerShell-off line stays out.
    const small = { ...CATALOG, ask: [], deny: CATALOG.deny.slice(0, 2), softDeny: 'A test soft_deny entry.', marketplace: { name: 'test-marketplace', autoUpdate: false } };
    const user = {
      permissions: { allow: ['Read'], ask: small.ask.map((r) => r.rule), deny: small.deny.map((r) => r.rule) },
      autoMode: { soft_deny: [small.softDeny] },
      extraKnownMarketplaces: { 'test-marketplace': { source: { source: 'github', repo: 'example/marketplace' }, autoUpdate: false } },
    };
    inWorld({ user }, (w) => {
      put(w.rules, small);
      assert.equal(run(w).stdout, '');
      has(run(w, { rules: null }), `permissions: ${CATALOG_RULES - 2} of ${CATALOG_RULES} U4 catalog rules are missing`);
    });
  });

  test("--rules's pushSamples are the ones an allow and a plugin grant are tested against, not the module's own", () => {
    // `ship-it` is a command no push sample in the real catalog names and no
    // structural reading flags: only a catalog that adds it as a push sample
    // makes the allow, or the grant, a push.
    const user = cleanUser();
    user.permissions.allow.push('Bash(ship-it *)');
    inWorld({ user, plugins: { ...BASELINE_PLUGINS, 'deploy-kit@example': { 'commands/ship.md': 'Bash(ship-it now)' } } }, (w) => {
      assert.equal(run(w).stdout, '');
      put(w.rules, { ...CATALOG, pushSamples: [...CATALOG.pushSamples, { shell: 'Bash', command: 'ship-it now' }] });
      assert.deepEqual(run(w).lines, [
        `${pushLine(USER, 'Bash(ship-it *)')}, so a push can skip the auto-mode safety check`,
        `permissions: enabled plugin deploy-kit grants deploy-kit:ship Bash(ship-it now), ${PLUGIN_TAIL}, so a push can skip the auto-mode safety check`,
      ], 'S1 order: the settings allows, then the plugin grants');
    });
  });

  test('a version folder laid out as deploy lays it runs the block; without lib/plugin-grants.mjs, lib/permissions.mjs or its catalog it prints the failed line first, and the other checks still run', () => {
    inWorld({}, (w) => {
      const v = path.join(w.root, 'hooks', 'v-0123456789ab');
      for (const rel of MANIFEST) put(path.join(v, ...rel.split('/')), fs.readFileSync(path.join(HOOKS, ...rel.split('/'))));
      const script = path.join(v, 'check-config-liveness.mjs');
      assert.equal(run(w, { script, rules: null }).stdout, '', 'the whole copy: all green');
      // A dangling junction for check 3 to find, beside the block's failure.
      const dangling = path.join(w.root, 'gone');
      fs.mkdirSync(dangling);
      fs.symlinkSync(dangling, path.join(w.skills, 'dangling'), LINK);
      fs.rmdirSync(dangling);
      const junctionLine = '~/skills/dangling is a junction/symlink whose target does not resolve';
      const failedThenJunction = (r, names) => {
        assert.equal(r.lines.length, 2, r.stdout);
        assert.ok(r.lines[0].startsWith(FAILED) && r.lines[0].includes(names), r.stdout);
        assert.ok(r.lines[1].startsWith(junctionLine), r.stdout);
      };

      const grants = path.join(v, 'lib', 'plugin-grants.mjs');
      const saved = fs.readFileSync(grants);
      fs.rmSync(grants);
      failedThenJunction(run(w, { script, rules: null }), 'plugin-grants.mjs');
      put(grants, saved);

      fs.rmSync(path.join(v, 'lib', 'permission-rules.json'));
      failedThenJunction(run(w, { script, rules: null }), 'permission-rules.json');

      fs.rmSync(path.join(v, 'lib', 'permissions.mjs'));
      failedThenJunction(run(w, { script, rules: null }), 'permissions.mjs');

      // A module that throws a message of two lines: still one line.
      put(path.join(v, 'lib', 'permissions.mjs'), "throw new Error('first line\\n  second line');\n");
      const r = run(w, { script, rules: null });
      assert.deepEqual(r.lines.slice(0, 1), [`${FAILED}first line second line`], r.stdout);
    });
  });

  test("check 4's lines print first, so the 15-line cap never hides a push line behind other checks' warnings", () => {
    const user = cleanUser();
    user.permissions.allow.push('Bash(git push *)');
    inWorld({ user }, (w) => {
      // 17 dangling junctions for check 3, beside one push allow for check 4.
      for (let i = 0; i < 17; i++) {
        const gone = path.join(w.root, 'gone', String(i));
        fs.mkdirSync(gone, { recursive: true });
        fs.symlinkSync(gone, path.join(w.skills, `dangling-${String(i).padStart(2, '0')}`), LINK);
        fs.rmdirSync(gone);
      }
      const r = run(w);
      assert.equal(r.lines.length, 16, r.stdout);
      assert.ok(r.lines[0].startsWith(pushLine(USER, 'Bash(git push *)')), r.stdout);
      for (const l of r.lines.slice(1, 15)) assert.match(l, /^~\/skills\/dangling-\d\d is a junction\/symlink/);
      assert.match(r.lines[15], /^\.\.\.and 3 more \(run: node .* --all\)$/);
    });
  });

  // 17 dangling junctions (notes from check 3), in the world's skills folder.
  const dangle = (w, n = 17) => {
    for (let i = 0; i < n; i++) {
      const gone = path.join(w.root, 'gone', String(i));
      fs.mkdirSync(gone, { recursive: true });
      fs.symlinkSync(gone, path.join(w.skills, `dangling-${String(i).padStart(2, '0')}`), LINK);
      fs.rmdirSync(gone);
    }
  };

  test('past 15 lines the block says how many more and names --all on the copy that ran, so a rerun shows every line', () => {
    inWorld({}, (w) => {
      const v = path.join(w.root, 'hooks', 'v-0123456789ab');
      for (const rel of MANIFEST) put(path.join(v, ...rel.split('/')), fs.readFileSync(path.join(HOOKS, ...rel.split('/'))));
      dangle(w);
      const script = path.join(v, 'check-config-liveness.mjs');
      const r = run(w, { script });
      assert.equal(r.lines.length, 16, r.stdout);
      assert.ok(r.header.startsWith('CONFIG LIVENESS WARNINGS (~/hooks/v-0123456789ab/check-config-liveness.mjs, run at session start)'), r.header);
      assert.equal(r.lines[15], '...and 2 more (run: node ~/hooks/v-0123456789ab/check-config-liveness.mjs --all)');
      const all = run(w, { script, args: ['--all'] });
      assert.equal(all.lines.length, 17, all.stdout);
      assert.ok(all.lines.every((l) => /^~\/skills\/dangling-\d\d is a junction\/symlink/.test(l)), 'every line, and no tail');
    });
  });

  test('S1 lines are never cut (review round 2, advisory 24): more of them than the cap all print (the allows, then a plugin grant, then a line saying a check went blind), then the notes are cut and counted', () => {
    const user = cleanUser();
    user.autoMode.soft_deny = [];
    inWorld({ user }, (w) => {
      for (let i = 0; i < 18; i++) put(settingsAt(path.join(w.mono, 'projects', `p${String(i).padStart(2, '0')}`)), { permissions: { allow: ['Bash(git push *)'] } });
      put(path.join(w.root, 'plugins', 'commit-commands', 'commands', 'ship.md'), md('Bash(git push *)'));
      const broken = settingsAt(path.join(w.mono, 'projects', 'broken'));
      put(broken, '{ "permissions": ');
      // More notes than S1 lines go past the cap, so a cap that went
      // negative would print some of them.
      dangle(w, 8);
      const r = run(w);
      assert.equal(r.lines.length, 21, r.stdout);
      for (const l of r.lines.slice(0, 18)) assert.match(l, /allows Bash\(git push \*\), so a push can skip the auto-mode safety check$/);
      assert.equal(r.lines[18], `permissions: enabled plugin commit-commands grants commit-commands:ship Bash(git push *), ${PLUGIN_TAIL}, so a push can skip the auto-mode safety check`);
      assert.equal(r.lines[19], `permissions: could not read ${label(w, broken)} (not valid JSON), so its rules were not checked`);
      assert.match(r.lines[20], /^\.\.\.and 9 more \(run: node .* --all\)$/, 'the D4 note and all eight junctions, counted');
      const all = run(w, { args: ['--all'] });
      assert.equal(all.lines.length, 29, all.stdout);
      assert.match(all.lines[20], /autoMode\.soft_deny entry .* is missing/, 'check 4\'s notes come before checks 1-3');
    });
  });

  test('every kind of line saying part of the check went blind is S1, never cut: user settings not read, the worktree list failed, the plugin list not read, no monorepo root', () => {
    inWorld({ user: '{"permissions": [', git: false, plugins: null }, (w) => {
      for (let i = 0; i < 15; i++) put(settingsAt(path.join(w.mono, 'projects', `p${String(i).padStart(2, '0')}`)), { permissions: { allow: ['Bash(git push *)'] } });
      put(path.join(w.claude, 'plugins', 'installed_plugins.json'), { version: 3, plugins: {} });
      dangle(w, 2);
      const r = run(w);
      assert.equal(r.lines.length, 19, r.stdout);
      for (const l of r.lines.slice(0, 15)) assert.match(l, /allows Bash\(git push \*\), so a push can skip the auto-mode safety check$/);
      assert.equal(r.lines[15], `permissions: could not read ${USER} (not valid JSON), so its rules were not checked`);
      assert.match(r.lines[16], /^permissions: git could not list the worktrees of ~\/mono \(.*\), so only that folder's settings files were checked$/);
      assert.equal(r.lines[17], 'permissions: plugin grants were not checked (installed_plugins.json is version 3, not 2, the shape this reader knows)');
      assert.match(r.lines[18], /^\.\.\.and 2 more \(run: node .* --all\)$/, 'both junctions, counted');
    });
    // No root means no project file, so fifteen plugin grants fill the cap.
    const plugins = { ...BASELINE_PLUGINS };
    for (let i = 0; i < 15; i++) plugins[`kit-${String(i).padStart(2, '0')}@example`] = { 'commands/ship.md': 'Bash(git push *)' };
    inWorld({ junction: false, plugins }, (w) => {
      dangle(w, 2);
      const r = run(w, { monorepo: null });
      assert.equal(r.lines.length, 17, r.stdout);
      for (const l of r.lines.slice(0, 15)) assert.ok(l.endsWith(`${PLUGIN_TAIL}, so a push can skip the auto-mode safety check`), l);
      assert.match(r.lines[15], /^permissions: no monorepo root was found \(/);
      assert.match(r.lines[16], /^\.\.\.and 2 more \(run: node .* --all\)$/, 'both junctions, counted');
    });
  });

  test('--debug adds one stderr line from the block (files, roots, rules, plugins, time) and leaves stdout as it was', () => {
    inWorld({ worktree: true }, (w) => {
      const f = settingsAt(path.join(w.mono, 'projects', 'app'));
      put(f, { permissions: { allow: ['Read', 'Bash(git push *)'] } });
      const plain = run(w);
      const debug = run(w, { args: ['--debug'] });
      assert.equal(debug.stdout, plain.stdout);
      const lines = debug.stderr.split(/\r?\n/).filter((l) => l.startsWith('permissions: '));
      assert.equal(lines.length, 1, debug.stderr);
      const want = `permissions: files=1 (${label(w, f)}) roots=2 (~/mono, ~/wt) catalog-rules=${CATALOG_RULES} allows-read=5 plugin-components=8 plugin-grants=6; `;
      assert.ok(lines[0].startsWith(want), `${lines[0]}\nexpected to start: ${want}`);
      assert.match(lines[0].slice(want.length), /^\d+\.\d ms$/);
    });
  });
});
