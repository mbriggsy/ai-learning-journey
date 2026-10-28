// deploy.mjs: versioned hook deploys (KTD 12). Every case builds its own
// world in a temp folder: a git repo with a projects/hooks tree, a hooks
// folder, a settings file, a deploy log and a session registry. The real
// ~/.claude, the real monorepo index and every real session stay untouched:
// HOME and USERPROFILE point at a temp home for the whole file (the settings
// writer's default inverse path lands there), and the session variables of
// the Claude Code process running this suite are removed.
//
// The peers gate runs the real peers.mjs against a fixture registry
// (SQUEAKY_SESSIONS_DIR for a child run, deploy()'s `registry` option in
// process). "This session" is this test process, by CLAUDE_PID; a peer is a
// sleeping child process. No entry carries a procStart, so peers.mjs never
// spawns its PowerShell start-time lookup, and the cases run the same on
// Windows and Linux.
//
// A world's manifest files are synthetic bodies, except where a case commits
// the real writer and the file it imports (realWriter): a printed manual way
// back then runs from its deployed copy, as it would live. Its printed line
// is also pasted whole into sh -c and pwsh -Command, with this node first on
// PATH and the temp home; each such case skips, naming why, when that shell
// is not on PATH.
//
// Two guards read this folder's own files instead of a world: every relative
// import a MANIFEST .mjs makes is in MANIFEST (or a deployed copy can't
// load), and the CLI starts on a node without import.meta.main and through a
// junction, from a temp copy.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EXIT, FLAT_HOOKS, MANIFEST, activeOf, deploy, rollback, scanCommand, status } from '../deploy.mjs';
import { GIT_LOCATION_VARS } from '../probes/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = path.join(HERE, '..');
const DEPLOY = path.join(HOOKS_DIR, 'deploy.mjs');
const SQUEAKY = path.join(HOOKS_DIR, '..', 'skills', 'squeaky-clean', 'scripts');
const SOURCE = 'projects/hooks';

const made = [];
const saved = {};
let home;
let sleeper;

// The variables that would tie a run to the live session, or to a real
// registry, home or config folder.
const LIVE_VARS = ['HOME', 'USERPROFILE', 'CLAUDE_PID', 'CLAUDE_CODE_SESSION_ID', 'SQUEAKY_SESSIONS_DIR', 'SQUEAKY_POWERSHELL', 'CLAUDE_CONFIG_DIR'];

before(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-home-'));
  made.push(home);
  for (const k of LIVE_VARS) saved[k] = process.env[k];
  for (const k of LIVE_VARS) delete process.env[k];
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  // A live process to stand in for another session.
  sleeper = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1e9)'], { stdio: 'ignore', windowsHide: true });
});

after(() => {
  try { sleeper.kill(); } catch { /* already gone */ }
  for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

// ---------------------------------------------------------------- helpers

function gitEnv() {
  const drop = new Set([...GIT_LOCATION_VARS, 'GIT_OPTIONAL_LOCKS']);
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!drop.has(k.toUpperCase())) env[k] = v;
  return { ...env, GIT_OPTIONAL_LOCKS: '0' };
}

function git(repo, ...args) {
  const r = spawnSync('git', ['-C', repo, ...args], { env: gitEnv(), shell: false, windowsHide: true, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

function blob(repo, spec) {
  const r = spawnSync('git', ['-C', repo, 'cat-file', 'blob', spec], { env: gitEnv(), shell: false, windowsHide: true });
  if (r.status !== 0) throw new Error(`git cat-file blob ${spec} failed: ${r.stderr}`);
  return r.stdout;
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

const canonical = (doc) => `${JSON.stringify(doc, null, 2)}\n`;
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const ls = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []);
const versions = (w) => ls(w.hooks).filter((n) => /^v-/.test(n));
const logLines = (w) => (fs.existsSync(w.log) ? fs.readFileSync(w.log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

// A synthetic body for a manifest file.
function body(rel, tag) {
  if (rel.endsWith('.sh')) return `#!/usr/bin/env bash\n# ${rel} ${tag}\nexit 0\n`;
  if (rel.endsWith('.py')) return `#!/usr/bin/env python3\n# ${rel} ${tag}\nprint("ok")\n`;
  return `// ${rel} ${tag}\nexport const tag = ${JSON.stringify(tag)};\n`;
}

// A settings file shaped like the real one: the six hooks by their flat
// tilde paths, a Notification command that names no hooks folder, the
// legacy status line, env, and a permission rule that mentions the hooks
// folder outside any command. ASCII and canonical, as the writer requires.
function settingsFixture() {
  const cmd = (file) => ({ type: 'command', command: `bash ~/.claude/hooks/${file}` });
  return {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    env: { EXAMPLE_FLAG: '1' },
    permissions: { allow: ['Bash(git status:*)', 'Read(~/.claude/hooks/**)'], deny: ['WebFetch'] },
    hooks: {
      SessionStart: [{ hooks: [cmd('elite-engineer-session-start.sh')] }],
      PreToolUse: [
        { matcher: 'WebFetch', hooks: [{ ...cmd('block-webfetch.sh'), onFailure: 'block' }] },
        { matcher: 'Skill', hooks: [cmd('enforce-brief-before-work.sh')] },
      ],
      PostToolUse: [{ matcher: 'Skill', hooks: [cmd('remind-distill-after-work.sh')] }],
      Stop: [{ matcher: '', hooks: [cmd('stop-distill-gate.sh')] }],
      Notification: [{ matcher: '', hooks: [{ type: 'command', command: "powershell.exe -Command \"[System.Windows.Forms.MessageBox]::Show('Claude Code needs your attention', 'Claude Code')\"" }] }],
    },
    statusLine: { type: 'command', command: 'python ~/.claude/statusline.py' },
    model: 'opus',
    autoMode: { allow: ['Local scratch work -- temp folders'], soft_deny: ['Force push -- never'], environment: ['Rule 1 -- detail'] },
  };
}

// The fixture with every flat reference pointed at `version`.
function switchedFixture(version, doc = settingsFixture()) {
  const out = structuredClone(doc);
  for (const groups of Object.values(out.hooks)) {
    for (const g of groups) for (const h of g.hooks) h.command = h.command.replace(/~\/\.claude\/hooks\/(?:v-(?:flat-)?[0-9a-f]{12}\/)?/, `~/.claude/hooks/${version}/`);
  }
  out.statusLine.command = `python ~/.claude/hooks/${version}/statusline.py`;
  return out;
}

function registryEntry(pid, over = {}) {
  const now = Date.now();
  return { pid, sessionId: `sess-${pid}`, cwd: null, name: `session-${pid}`, status: 'busy', startedAt: now - 3_600_000, updatedAt: now, statusUpdatedAt: now, ...over };
}

// A fresh world: the repo (one commit holding every manifest file), an empty
// hooks folder, the settings fixture, and a registry holding only this
// process ("self", busy: it is running the deploy).
function world({ files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-test-'));
  made.push(root);
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  git(repo, 'config', 'user.name', 'Deploy Test');
  git(repo, 'config', 'core.autocrlf', 'false');
  git(repo, 'config', 'commit.gpgsign', 'false');
  for (const rel of MANIFEST) write(path.join(repo, SOURCE, rel), files[rel] ?? body(rel, 'v1'));
  write(path.join(repo, 'README.md'), 'outside the hooks folder\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'one');
  const claude = path.join(root, 'claude');
  const hooks = path.join(claude, 'hooks');
  fs.mkdirSync(hooks, { recursive: true });
  const settings = path.join(claude, 'settings.json');
  write(settings, canonical(settingsFixture()));
  const sessions = path.join(root, 'sessions');
  fs.mkdirSync(sessions);
  write(path.join(sessions, `${process.pid}.json`), JSON.stringify(registryEntry(process.pid, { sessionId: 'sess-self', name: 'self', cwd: repo })));
  return { root, repo, claude, hooks, settings, sessions, log: path.join(root, 'flow', 'deploys.jsonl') };
}

const head = (w) => git(w.repo, 'rev-parse', 'HEAD').trim();
const vOf = (sha) => `v-${sha.slice(0, 12)}`;

// Commit new contents for some manifest files; returns the new sha.
function commit(w, changes, message) {
  for (const [rel, text] of Object.entries(changes)) write(path.join(w.repo, SOURCE, rel), text);
  git(w.repo, 'add', '-A');
  git(w.repo, 'commit', '-q', '-m', message);
  return head(w);
}

function addPeer(w, over) {
  write(path.join(w.sessions, `${sleeper.pid}.json`), JSON.stringify(registryEntry(sleeper.pid, { sessionId: 'sess-peer', name: 'peer-b9', cwd: w.repo, messagingSocketPath: 'SECRET-SOCKET-VALUE', ...over })));
}

// A --patch file holding `ops`, in the world's folder.
function patchFile(w, ops) {
  const f = path.join(w.root, `patch-${Math.random().toString(16).slice(2)}.json`);
  write(f, JSON.stringify({ ops }));
  return f;
}

// The relative module specifiers a file imports, statically or by a literal
// dynamic import(). Comment lines go first: a usage example in a header
// (`import { x } from './tools/x.mjs'`) is not an import.
function relativeImports(src) {
  const code = src.replace(/^\s*\/\*[\s\S]*?\*\//gm, '').split('\n').filter((l) => !l.trimStart().startsWith('//')).join('\n');
  const out = new Set();
  for (const re of [/\b(?:import|export)\s+(?:[^'";]*?\bfrom\s*)?['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g]) {
    for (const m of code.matchAll(re)) if (/^\.\.?\//.test(m[1])) out.add(m[1]);
  }
  return [...out];
}

// The files reachable from `starts` (paths relative to projects/hooks)
// through relative imports, following each import `follow` accepts:
// {files, edges: [{from, spec, dep}]}, dep relative to projects/hooks.
function importClosure(starts, follow = (dep) => !dep.startsWith('../')) {
  const seen = new Set();
  const edges = [];
  const queue = [...starts];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    for (const spec of relativeImports(fs.readFileSync(path.join(HOOKS_DIR, ...rel.split('/')), 'utf8'))) {
      const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
      edges.push({ from: rel, spec, dep });
      if (follow(dep)) queue.push(dep);
    }
  }
  return { files: [...seen], edges };
}

// deploy.mjs as a child process, every path pointed into the world.
function run(w, args, { env = {} } = {}) {
  // The writer re-reads switched settings after a delay; 50 ms keeps the suite
  // fast (deploy and rollback only: the other actions take no such flag).
  const delay = ['deploy', 'rollback'].includes(args[0]) ? ['--persist-delay-ms', '50'] : [];
  const r = spawnSync(process.execPath, [DEPLOY, ...args, ...delay, '--hooks-dir', w.hooks, '--settings', w.settings, '--repo', w.repo, '--log', w.log], {
    env: { ...gitEnv(), SQUEAKY_SESSIONS_DIR: w.sessions, CLAUDE_PID: String(process.pid), ...env },
    shell: false,
    windowsHide: true,
    encoding: 'utf8',
  });
  let json;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    assert.fail(`deploy.mjs printed no JSON (exit ${r.status}): ${r.stdout}\n${r.stderr}`);
  }
  assert.equal(r.status, json.exit, 'the exit code is the one the result reports');
  return { status: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

// The same, in process (for the test seams).
const inProcess = (w, extra = {}) => ({ hooksDir: w.hooks, settings: w.settings, repo: w.repo, log: w.log, registry: { sessionsDir: w.sessions, selfPid: process.pid, selfSession: '' }, persistDelayMs: 50, ...extra });

// Nothing a write leaves behind: no writer lock or temp file beside the
// settings, no temp build folder in the hooks folder.
function assertClean(w) {
  assert.deepEqual(ls(w.claude).filter((n) => n !== 'hooks' && n !== 'statusline.py'), ['settings.json'], 'only settings.json beside the hooks folder');
  assert.deepEqual(ls(w.hooks).filter((n) => /\.tmp-/.test(n)), [], 'no temp build folder');
}

function listFiles(dir, prefix = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...listFiles(path.join(dir, d.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

// A command line as a POSIX shell splits it, for the form deploy prints:
// node, bare, then single-quoted words, each unquoted, with '\'' read as one
// quote. Anything else in the line fails.
function shWords(line) {
  if (!line.startsWith('node ')) throw new Error(`the line does not start with a bare node: ${line}`);
  const words = ['node'];
  const word = /'((?:[^']|'\\'')*)'(?: |$)/y;
  for (let at = 'node '.length; at < line.length; at = word.lastIndex) {
    word.lastIndex = at;
    const m = word.exec(line);
    if (!m) throw new Error(`not a line of single-quoted words at ${at}: ${line.slice(at)}`);
    words.push(m[1].replaceAll("'\\''", "'"));
  }
  return words;
}

// The shells a printed line is pasted into: sh (Git Bash here, dash or bash
// in CI) and PowerShell 7, each given the line whole, as a person pastes it.
const SHELLS = Object.freeze({
  sh: { cmd: 'sh', args: ['-c'] },
  pwsh: { cmd: 'pwsh', args: ['-NoProfile', '-NonInteractive', '-Command'] },
});

// The environment a line runs in there: this test's node first on PATH, so
// the line's bare node is this very node; PowerShell's telemetry and update
// check off. HOME and USERPROFILE are the temp home (set in before()).
function shellEnv() {
  const env = { ...gitEnv(), POWERSHELL_TELEMETRY_OPTOUT: '1', POWERSHELL_UPDATECHECK: 'Off' };
  const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  env[key] = `${path.dirname(process.execPath)}${path.delimiter}${env[key] ?? ''}`;
  return env;
}

function inShell(name, line) {
  const { cmd, args } = SHELLS[name];
  return spawnSync(cmd, [...args, line], { env: shellEnv(), encoding: 'utf8', shell: false, windowsHide: true, timeout: 120_000 });
}

// Why a shell can't run a line on this machine (the skip reason), or null.
function noShell(name) {
  const r = inShell(name, 'exit 0');
  if (r.error) return `no ${SHELLS[name].cmd} on PATH to paste the line into (${r.error.code || r.error.message})`;
  if (r.status !== 0) return `${SHELLS[name].cmd} did not run a trivial line (exit ${r.status}): ${r.stderr}`;
  return null;
}

// The real writer and the file it imports, as a world's committed bytes: a
// deployed copy that can actually run a printed --apply-inverse command.
const realWriter = () => Object.fromEntries(['tools/settings-write.mjs', 'lib/encoding.mjs'].map((rel) => [rel, fs.readFileSync(path.join(HOOKS_DIR, ...rel.split('/')))]));

// A fallback's command, run as its argv (node is this test's node).
function runFallback(fb) {
  assert.equal(fb.command[0], 'node');
  assert.deepEqual(shWords(fb.commandLine), fb.command, 'the printed line is the same argv');
  return spawnSync(process.execPath, fb.command.slice(1), { env: gitEnv(), shell: false, windowsHide: true, encoding: 'utf8' });
}

// Another writer, right after the rename: a model change the switch never
// made, so the writer's re-read differs from what it wrote (its exit 4).
function raceIn(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  d.model = 'raced-in';
  fs.writeFileSync(file, canonical(d));
}

// A flat hooks command under an event no switch touches, landing before the
// writer's persist check (which re-reads only the paths the write changed,
// each hooks.<event> array whole): settings then read "mixed".
function slipIn(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  d.hooks.SubagentStop = [{ hooks: [{ type: 'command', command: 'bash ~/.claude/hooks/block-webfetch.sh' }] }];
  fs.writeFileSync(file, canonical(d));
}

// Another writer, right after the rename, changing a path every switch
// writes (the PreToolUse array, as one value) but no command pointer:
// settings still point where the switch put them.
function rematch(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  d.hooks.PreToolUse[0].matcher = 'WebFetch|WebSearch';
  fs.writeFileSync(file, canonical(d));
}

// Another writer, after the write and before the writer's persist check,
// taking out the hooks and the status line: settings then hold no command
// that names the hooks folder.
function unhook(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  delete d.hooks;
  delete d.statusLine;
  fs.writeFileSync(file, canonical(d));
}

// The flat hooks folder as it is before any versioned deploy: the six hooks
// (each the blob at `from`, a sha, unless `bodies` gives its text) and the legacy status
// line beside it.
function flatFolder(w, { from, bodies = {}, statusline = '# the legacy status line\n' } = {}) {
  for (const n of FLAT_HOOKS) write(path.join(w.hooks, n), bodies[n] ?? blob(w.repo, `${from}:${SOURCE}/${n}`));
  if (statusline !== null) write(path.join(w.claude, 'statusline.py'), statusline);
}

// ---------------------------------------------------------------- cases

describe('deploy.mjs deploy', () => {
  test('builds v-<sha12> from the commit, not the working tree, and switches every hooks command and the status line in one write', () => {
    const w = world();
    const sha = head(w);
    const v = vOf(sha);
    // A dirty tree and an untracked file: neither may reach the folder.
    write(path.join(w.repo, SOURCE, 'block-webfetch.sh'), '# DIRTY working-tree edit\n');
    write(path.join(w.repo, SOURCE, 'untracked.sh'), '# never deployed\n');
    const before = fs.readFileSync(w.settings);

    const r = run(w, ['deploy']);
    assert.equal(r.status, EXIT.OK, r.stdout);
    assert.equal(r.json.version, v);
    assert.equal(r.json.commit, sha);
    assert.equal(r.json.built, true);
    assert.equal(r.json.previous, 'flat');
    assert.equal(r.json.peers.pass, true);

    // The folder: exactly the manifest plus DEPLOYED.json, each file the
    // committed blob byte for byte.
    const folder = path.join(w.hooks, v);
    assert.deepEqual(listFiles(folder), [...MANIFEST, 'DEPLOYED.json'].sort());
    for (const rel of MANIFEST) assert.ok(fs.readFileSync(path.join(folder, rel)).equals(blob(w.repo, `${sha}:${SOURCE}/${rel}`)), `${rel} is the committed blob`);
    assert.ok(!fs.readFileSync(path.join(folder, 'block-webfetch.sh'), 'utf8').includes('DIRTY'), 'the working-tree edit was not deployed');
    const deployed = readJson(path.join(folder, 'DEPLOYED.json'));
    assert.equal(deployed.version, v);
    assert.equal(deployed.commit, sha);
    assert.equal(deployed.source, 'git');
    assert.deepEqual(Object.keys(deployed.files), [...MANIFEST]);
    for (const rel of MANIFEST) assert.equal(deployed.files[rel], sha256(blob(w.repo, `${sha}:${SOURCE}/${rel}`)));
    assert.ok(!Number.isNaN(Date.parse(deployed.builtAt)));

    // Settings: the whole file is the fixture with the hooks commands and
    // the status line switched, byte for byte. The Notification command and
    // the permission rule that mentions the hooks folder are untouched.
    const now = fs.readFileSync(w.settings, 'utf8');
    assert.equal(now, canonical(switchedFixture(v)));
    const doc = JSON.parse(now);
    assert.deepEqual(doc.hooks.Notification, settingsFixture().hooks.Notification);
    assert.equal(doc.statusLine.command, `python ~/.claude/hooks/${v}/statusline.py`);
    assert.deepEqual(doc.permissions, settingsFixture().permissions);
    assert.ok(r.json.warnings.some((x) => x.includes('["permissions","allow",1] names the hooks folder (or the status line script) outside a command')), r.json.warnings.join('\n'));
    assert.equal(r.json.changes.length, 6, 'five hook commands (check-config-liveness.mjs runs from the session-start script, never from settings) and the status line');

    // One log line, with its id and sha256s of the settings before and after.
    const log = logLines(w);
    assert.equal(log.length, 1);
    assert.match(log[0].id, /^[0-9a-f]{16}$/);
    assert.equal(r.json.logId, log[0].id);
    assert.equal(log[0].postcheck, undefined);
    assert.equal(log[0].action, 'deploy');
    assert.equal(log[0].version, v);
    assert.equal(log[0].previous, 'flat');
    assert.equal(log[0].commit, sha);
    assert.equal(log[0].settingsBefore, sha256(before));
    assert.equal(log[0].settingsAfter, sha256(Buffer.from(now)));
    // The writer's inverse went to the temp home, never the real one.
    assert.ok(log[0].inverse.startsWith(home), `inverse ${log[0].inverse} is under the temp home`);
    assert.ok(fs.existsSync(log[0].inverse));
    assertClean(w);
  });

  test('a copy that fails cmp (injected) refuses: no folder, no temp folder, settings and log untouched', async () => {
    const w = world();
    const before = fs.readFileSync(w.settings);
    const res = await deploy(inProcess(w, {
      seams: { afterCopy: (tmp) => fs.appendFileSync(path.join(tmp, 'stop-distill-gate.sh'), '# tampered between the copy and the cmp\n') },
    }));
    assert.equal(res.exit, EXIT.REFUSED, res.error);
    assert.deepEqual(res.cmpFailed, ['stop-distill-gate.sh']);
    assert.match(res.error, /cmp failed/);
    assert.match(res.error, /The temp folder was removed \(it was never live\), and settings were not touched/);
    assert.deepEqual(ls(w.hooks), [], 'neither the version folder nor its temp folder is left');
    assert.ok(fs.readFileSync(w.settings).equals(before), 'settings untouched');
    assert.equal(fs.existsSync(w.log), false, 'nothing logged');
    assertClean(w);

    // A copy that vanished is a cmp failure too.
    const gone = await deploy(inProcess(w, { seams: { afterCopy: (tmp) => fs.rmSync(path.join(tmp, 'lib', 'encoding.mjs')) } }));
    assert.equal(gone.exit, EXIT.REFUSED);
    assert.deepEqual(gone.cmpFailed, ['lib/encoding.mjs']);
    assert.deepEqual(ls(w.hooks), []);
  });

  test('an unknown hooks-folder reference refuses before anything is written', () => {
    const w = world();
    const variants = [
      ['$HOME spelling', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'bash $HOME/.claude/hooks/stop-distill-gate.sh'],
      ['a file not in the manifest', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'bash ~/.claude/hooks/not-in-the-manifest.sh'],
      ['an absolute path', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'bash /opt/someone/.claude/hooks/stop-distill-gate.sh'],
      ['a quoted tilde (bash never expands it)', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'bash "~/.claude/hooks/stop-distill-gate.sh"'],
      ['backslashes', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'bash ~\\.claude\\hooks\\stop-distill-gate.sh'],
      ['another case', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'bash ~/.Claude/Hooks/stop-distill-gate.sh'],
      ['a malformed version folder', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'bash ~/.claude/hooks/v-123/stop-distill-gate.sh'],
      ['the folder with no file', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'ls ~/.claude/hooks/'],
      ['the legacy status line outside statusLine', ['hooks', 'Stop', 0, 'hooks', 0, 'command'], 'python ~/.claude/statusline.py'],
      ['the legacy status line by $HOME', ['statusLine', 'command'], 'python $HOME/.claude/statusline.py'],
    ];
    for (const [label, at, command] of variants) {
      const doc = settingsFixture();
      let o = doc;
      for (const k of at.slice(0, -1)) o = o[k];
      o[at[at.length - 1]] = command;
      write(w.settings, canonical(doc));
      const before = fs.readFileSync(w.settings);
      const r = run(w, ['deploy']);
      assert.equal(r.status, EXIT.REFUSED, `${label}: ${r.stdout}`);
      assert.match(r.json.error, /can't be switched/, label);
      assert.deepEqual(r.json.problems.map((p) => p.path), [at], label);
      assert.ok(fs.readFileSync(w.settings).equals(before), `${label}: settings unchanged`);
      assert.deepEqual(versions(w), [], `${label}: no folder built (the plan comes first)`);
      assert.equal(fs.existsSync(w.log), false, `${label}: nothing logged`);
    }
    assertClean(w);
  });

  test('a re-deploy of the same commit reuses the verified folder and writes nothing; a tampered folder refuses and stays as it is', () => {
    const w = world();
    const v = vOf(head(w));
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const settings = fs.readFileSync(w.settings);
    const deployedJson = fs.readFileSync(path.join(w.hooks, v, 'DEPLOYED.json'));

    const again = run(w, ['deploy']);
    assert.equal(again.status, EXIT.OK, again.stdout);
    assert.equal(again.json.reused, true);
    assert.equal(again.json.noop, true);
    assert.equal(again.json.built, undefined);
    assert.equal(again.json.writer, undefined, 'the writer is not called when nothing changes');
    assert.ok(fs.readFileSync(w.settings).equals(settings));
    assert.ok(fs.readFileSync(path.join(w.hooks, v, 'DEPLOYED.json')).equals(deployedJson), 'the folder is never rebuilt');
    assert.equal(logLines(w).length, 1, 'no log line for a switch that did not happen');

    const target = path.join(w.hooks, v, 'tools', 'settings-write.mjs');
    fs.appendFileSync(target, '// tampered\n');
    const tampered = run(w, ['deploy']);
    assert.equal(tampered.status, EXIT.REFUSED);
    assert.match(tampered.json.error, /already exists and does not match/);
    assert.ok(tampered.json.problems.some((p) => p.includes('tools/settings-write.mjs')), tampered.json.problems.join('\n'));
    assert.ok(fs.readFileSync(target, 'utf8').endsWith('// tampered\n'), 'a version folder is never rewritten');
    assertClean(w);
  });

  test('--patch ops ride in the same write; ops that leave a hooks reference elsewhere, or are not valid, refuse with nothing written', () => {
    const w = world();
    const v = vOf(head(w));
    const patch = (ops) => patchFile(w, ops);

    const bad = run(w, ['deploy', '--patch', patch([{ op: 'push', path: ['hooks', 'Stop', 0, 'hooks'], value: { type: 'command', command: 'bash ~/.claude/hooks/block-webfetch.sh' } }])]);
    assert.equal(bad.status, EXIT.REFUSED, bad.stdout);
    assert.match(bad.json.error, /would still not name/);
    const invalid = run(w, ['deploy', '--patch', patch([{ op: 'frobnicate', path: ['env'] }])]);
    assert.equal(invalid.status, EXIT.REFUSED);
    assert.match(invalid.json.error, /--patch ops are not valid/);
    assert.ok(fs.readFileSync(w.settings).equals(Buffer.from(canonical(settingsFixture()))), 'nothing written by either');
    assert.deepEqual(versions(w), [], 'the plan, extras included, is checked before the build');
    assert.equal(fs.existsSync(w.log), false);

    const good = run(w, ['deploy', '--patch', patch([
      { op: 'set', path: ['env', 'DEPLOY_MARK'], value: 'on' },
      { op: 'push', path: ['hooks', 'Stop', 0, 'hooks'], value: { type: 'command', command: `bash ~/.claude/hooks/${v}/block-webfetch.sh` } },
    ])]);
    assert.equal(good.status, EXIT.OK, good.stdout);
    const doc = readJson(w.settings);
    assert.equal(doc.env.DEPLOY_MARK, 'on');
    assert.equal(doc.hooks.Stop[0].hooks[1].command, `bash ~/.claude/hooks/${v}/block-webfetch.sh`);
    assert.equal(activeOf(doc).active, v);
    assert.equal(logLines(w).length, 1, 'one write, one log line');
    // One inverse file undoes it all: the six switched commands and both
    // patch ops.
    const inverse = readJson(logLines(w)[0].inverse);
    const restored = inverse.ops.filter((op) => op.op === 'set' || op.op === 'delete').map((op) => op.path.join('.'));
    assert.ok(restored.includes('env.DEPLOY_MARK') && restored.includes('statusLine.command'), restored.join('\n'));
    assertClean(w);
  });

  test('a deployed file that calls a sibling by its flat path is named in a warning; a file naming itself is not', () => {
    const w = world({
      files: {
        'elite-engineer-session-start.sh': '#!/usr/bin/env bash\nLIVENESS="$HOME/.claude/hooks/check-config-liveness.mjs"\n',
        'check-config-liveness.mjs': '// run: node ~/.claude/hooks/check-config-liveness.mjs\n',
      },
    });
    const r = run(w, ['deploy', '--dry-run']);
    assert.equal(r.status, EXIT.OK, r.stdout);
    const sib = r.json.warnings.filter((x) => x.includes('by the flat path'));
    assert.equal(sib.length, 1, sib.join('\n'));
    assert.match(sib[0], /^elite-engineer-session-start\.sh names its sibling check-config-liveness\.mjs/);
  });

  test('--dry-run builds nothing and writes nothing, and reports the switch it would make', () => {
    const w = world();
    const before = fs.readFileSync(w.settings);
    const inverses = ls(path.join(home, '.claude', 'flow', 'settings-writer'));
    const r = run(w, ['deploy', '--dry-run']);
    assert.equal(r.status, EXIT.OK, r.stdout);
    assert.equal(r.json.wouldBuild, true);
    assert.equal(r.json.writer.ok, true);
    assert.equal(r.json.writer.written, false);
    assert.equal(r.json.writer.after, sha256(Buffer.from(canonical(switchedFixture(vOf(head(w)))))), 'the writer computed the exact bytes it would write');
    assert.equal(r.json.changes.length, 6);
    assert.deepEqual(versions(w), []);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    assert.equal(fs.existsSync(w.log), false);
    assert.deepEqual(ls(path.join(home, '.claude', 'flow', 'settings-writer')), inverses, 'no inverse file for a dry run');
    assertClean(w);
  });

  test('the writer refusing (non-canonical settings) refuses the deploy with settings untouched and nothing logged', () => {
    const w = world();
    write(w.settings, JSON.stringify(settingsFixture()));
    const before = fs.readFileSync(w.settings);
    const r = run(w, ['deploy']);
    assert.equal(r.status, EXIT.REFUSED, r.stdout);
    assert.equal(r.json.writer.exit, 2);
    assert.match(r.json.error, /canonical/);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    assert.equal(fs.existsSync(w.log), false);
    assertClean(w);
  });

  test('two deploys of one commit at once: the second to finish its build reuses the first one\'s folder, and its stale plan is refused', async () => {
    const w = world();
    const v = vOf(head(w));
    let inner;
    // Mid-build, after the outer deploy has copied into its temp folder,
    // another deploy of the same commit runs start to finish.
    const outer = await deploy(inProcess(w, { seams: { afterCopy: async () => { inner = await deploy(inProcess(w)); } } }));
    assert.equal(inner.exit, EXIT.OK, inner.error);
    assert.equal(inner.built, true);
    assert.equal(outer.reused, true, 'the outer deploy found the folder raced into place and verified it');
    assert.equal(outer.built, undefined);
    // Its plan was made from settings the inner deploy has since switched:
    // the writer's expect-sha check refuses it as a concurrent change, and
    // nothing is written twice.
    assert.equal(outer.exit, EXIT.CONCURRENT, outer.error);
    assert.match(outer.error, /changed after deploy read them/);
    assert.deepEqual(versions(w), [v]);
    assert.deepEqual(ls(path.join(w.hooks, v)).includes('DEPLOYED.json'), true);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(v)));
    assert.equal(logLines(w).length, 1);
    assertClean(w);
  });

  test('a concurrent settings change caught by the writer stops the switch (exit 3) and nothing is logged', async () => {
    const w = world();
    const theirs = canonical({ ...settingsFixture(), model: 'someone-else' });
    const res = await deploy(inProcess(w, { writerSeams: { beforeRename: (file) => fs.writeFileSync(file, theirs) } }));
    assert.equal(res.exit, EXIT.CONCURRENT, res.error);
    assert.equal(res.switched, undefined);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), theirs, 'the other writer\'s change stands');
    assert.equal(fs.existsSync(w.log), false);
    assert.deepEqual(versions(w), [vOf(head(w))], 'the built folder is kept: it is not live');
    assertClean(w);
  });

  test('settings edited after the plan, during the build, refuse the switch (exit 3, nothing written); a rerun plans from them', async () => {
    const w = world();
    const theirs = settingsFixture();
    // A hooks command at a NEW path: no test op of the plan covers it, so
    // only binding the write to the plan's read (expectSha) catches it.
    theirs.hooks.Stop[0].hooks.push({ type: 'command', command: 'bash ~/.claude/hooks/block-webfetch.sh' });
    const res = await deploy(inProcess(w, { seams: { afterCopy: () => write(w.settings, canonical(theirs)) } }));
    assert.equal(res.exit, EXIT.CONCURRENT, res.error);
    assert.match(res.error, /changed after deploy read them to plan this switch/);
    assert.equal(res.switched, undefined);
    assert.equal(res.writer.written, false);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(theirs), 'their edit stands, untouched by any half switch');
    assert.equal(fs.existsSync(w.log), false);
    assert.deepEqual(versions(w), [vOf(head(w))], 'the built folder is kept: it is not live');

    const again = await deploy(inProcess(w));
    assert.equal(again.exit, EXIT.OK, again.error);
    assert.equal(activeOf(readJson(w.settings)).active, vOf(head(w)), 'their command is switched too');
    assertClean(w);
  });

  test('a stale plan reads as exit 3 even from a writer whose expect-sha refusal is exit 2 (before that rule): by the sha the writer read', () => {
    const w = world();
    // A load hook turns the writer's expect-sha refusal back into exit 2,
    // in a child of its own; a writer that still exits 2 there needs none.
    const hook = path.join(w.root, 'old-writer.mjs');
    write(hook, [
      "import { registerHooks } from 'node:module';",
      'registerHooks({',
      '  load(url, context, nextLoad) {',
      '    const r = nextLoad(url, context);',
      "    if (!url.endsWith('/tools/settings-write.mjs')) return r;",
      '    let n = 0;',
      "    const source = Buffer.from(r.source).toString('utf8').replace(/new Stop\\(EXIT\\.CONCURRENT, (`--expect-sha)/g, (_, m) => { n++; return `new Stop(EXIT.REFUSED, ${m}`; });",
      '    globalThis.planted = n;',
      '    return { ...r, source };',
      '  },',
      '});',
      '',
    ].join('\n'));
    const driver = path.join(w.root, 'driver.mjs');
    write(driver, [
      "import fs from 'node:fs';",
      'const [deployUrl, json] = process.argv.slice(2);',
      'const o = JSON.parse(json);',
      'const { deploy } = await import(deployUrl);',
      // Settings edited after the plan, during the build.
      'const res = await deploy({ ...o, seams: { afterCopy: () => fs.writeFileSync(o.settings, o.theirs) } });',
      'process.stdout.write(JSON.stringify({ planted: globalThis.planted ?? 0, res }));',
      '',
    ].join('\n'));
    const theirs = canonical({ ...settingsFixture(), model: 'someone-else' });
    const o = { hooksDir: w.hooks, settings: w.settings, repo: w.repo, log: w.log, registry: { sessionsDir: w.sessions, selfPid: process.pid, selfSession: '' }, persistDelayMs: 50, theirs };
    const r = spawnSync(process.execPath, ['--import', pathToFileURL(hook).href, driver, pathToFileURL(DEPLOY).href, JSON.stringify(o)], { env: gitEnv(), encoding: 'utf8', shell: false, windowsHide: true });
    assert.equal(r.status, 0, r.stderr);
    const { planted, res } = JSON.parse(r.stdout);
    assert.equal(res.writer.exit, 2, `the writer refused the stale plan with exit 2 (the load hook rewrote ${planted} place(s))`);
    assert.equal(res.writer.written, false);
    assert.notEqual(res.writer.before, sha256(Buffer.from(canonical(settingsFixture()))), 'the sha it read is not the plan\'s');
    assert.equal(res.exit, EXIT.CONCURRENT, res.error);
    assert.match(res.error, /changed after deploy read them to plan this switch.*\(writer exit 2:/);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), theirs);
    assert.equal(fs.existsSync(w.log), false);
  });

  test('a switch that lands but fails the writer\'s post-write check (exit 4) is logged, postcheck failed, and a bare rollback undoes it', async () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    // Another writer lands right after the rename: the writer's re-read
    // differs from what it wrote. Settings still point at B, so the facts
    // say a bare rollback can undo it.
    const raced = await deploy(inProcess(w, { writerSeams: { afterRename: raceIn } }));
    assert.equal(raced.exit, EXIT.POSTCHECK, raced.error);
    assert.equal(raced.writer.exit, 4);
    assert.equal(raced.switched, true);
    assert.match(raced.error, /The switch is in force, and in the deploy log as [0-9a-f]{16} \(postcheck: failed\)\. A bare rollback can undo it\.$/);
    assert.deepEqual(raced.recovery, { how: 'bare rollback', to: null });
    assert.equal(raced.fallback, undefined);
    const line = logLines(w).pop();
    assert.deepEqual([line.action, line.version, line.previous, line.postcheck], ['deploy', vOf(b), vOf(a), 'failed']);
    assert.equal(line.id, raced.logId);
    assert.match(line.postcheckError, /exit 4 after writing/);
    assert.ok(fs.existsSync(line.inverse), 'the inverse of the write that landed is kept');

    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.equal(back.json.undoes, line.id);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical({ ...switchedFixture(vOf(a)), model: 'raced-in' }), 'back on A; the other writer\'s change stands');
    assertClean(w);
  });

  test('settings read again after the write must point where the plan said: a hooks command that slips in is exit 4, logged, and the way back it names works', async () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    // A flat command appears under an event the write never touched.
    const res = await deploy(inProcess(w, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(res.exit, EXIT.POSTCHECK, res.error);
    assert.equal(res.writer.ok, true, 'the writer saw nothing wrong: its checks cover the paths it changed');
    assert.equal(res.switched, true);
    assert.match(res.error, /read again point at "mixed", not "v-[0-9a-f]{12}"/);
    const line = logLines(w).pop();
    assert.deepEqual([line.version, line.postcheck], [vOf(b), 'failed']);
    assert.match(line.postcheckError, /"mixed"/);

    // Settings no longer point at B alone, so a bare rollback is never
    // promised; the version before, A, is.
    assert.ok(!/bare rollback can undo/i.test(res.error), res.error);
    assert.ok(res.error.endsWith(`A bare rollback would refuse: settings now point at "mixed", not ${vOf(b)}. rollback --to ${vOf(a)} points settings back at ${vOf(a)}.`), res.error);
    assert.deepEqual(res.recovery, { how: 'rollback --to', to: vOf(a) });
    // B wrote command pointers alone (each hooks.<event> array, as one
    // value, changed in its pointers only): --to leaves nothing of it, so
    // no path is named and no inverse by hand is offered beside it.
    assert.equal(res.fallback, undefined);

    // As it said: a bare rollback refuses, with nothing written ...
    const atMixed = fs.readFileSync(w.settings);
    const bare = run(w, ['rollback']);
    assert.equal(bare.status, EXIT.REFUSED, bare.stdout);
    assert.match(bare.json.error, /settings point at "mixed".*settings changed outside deploy/);
    assert.ok(fs.readFileSync(w.settings).equals(atMixed));
    // ... and rollback --to A puts every command on A, the one that slipped
    // in included.
    const back = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(back.status, EXIT.OK, back.stdout);
    const doc = readJson(w.settings);
    assert.equal(activeOf(doc).active, vOf(a));
    assert.equal(doc.hooks.SubagentStop[0].hooks[0].command, `bash ~/.claude/hooks/${vOf(a)}/block-webfetch.sh`);
    assertClean(w);

    // The version before, tampered: rollback --to it would refuse, so it is
    // not named, and B's inverse, which would point every hook at it, is not
    // offered either.
    const t2 = world();
    const a2 = head(t2);
    assert.equal(run(t2, ['deploy']).status, EXIT.OK);
    commit(t2, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    fs.appendFileSync(path.join(t2.hooks, vOf(a2), 'remind-distill-after-work.sh'), '# tampered\n');
    const broken = await deploy(inProcess(t2, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(broken.exit, EXIT.POSTCHECK, broken.error);
    assert.deepEqual(broken.recovery, { how: 'none', to: null });
    assert.equal(broken.fallback, undefined);
    assert.ok(broken.error.includes(`rollback --to ${vOf(a2)} would refuse too: ${vOf(a2)} can't be rolled back to: remind-distill-after-work.sh does not match its sha256`), broken.error);
  });

  test('exit 4 naming rollback --to names what that pointer switch leaves (the --patch\'s paths, never values), and offers the switch\'s own inverse beside it, never ahead', async () => {
    const w = world();
    const a = head(w);
    // The flat files exist, so the slipped-in flat command is one the
    // inverse by hand may land on.
    flatFolder(w, { from: a });
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    const res = await deploy(inProcess(w, {
      patch: { ops: [{ op: 'set', path: ['env', 'DEPLOY_MARK'], value: 'on-SECRETISH-VALUE' }, { op: 'set', path: ['permissions', 'deny'], value: ['WebFetch', 'WebSearch'] }] },
      writerSeams: { beforePersistCheck: slipIn },
    }));
    assert.equal(res.exit, EXIT.POSTCHECK, res.error);
    const line = logLines(w).pop();
    assert.deepEqual(res.recovery, { how: 'rollback --to', to: vOf(a) });
    const named = `rollback --to ${vOf(a)} points settings back at ${vOf(a)}. It switches command pointers only, so the other paths this switch wrote stay as they are: ["env","DEPLOY_MARK"], ["permissions","deny"]. This switch's own inverse puts those back too. The manual way back`;
    assert.ok(res.error.includes(named), res.error);
    assert.ok(!res.error.includes('SECRETISH'), 'paths only, never values');
    // Beside --to, after it.
    assert.deepEqual([res.fallback.undoes, res.fallback.inverse, res.fallback.lands], [line.id, line.inverse, 'mixed']);
    assert.ok(res.error.indexOf(`rollback --to ${vOf(a)}`) < res.error.indexOf('The manual way back'), res.error);
  });

  test('exit 4 naming rollback --to names each hooks event a --patch changed beyond its pointers (a command\'s own words, a matcher), and never one whose pointers alone changed', async () => {
    // The --patch edits two hook entries in place, as U4 and U5 will: one
    // event's command gains an argument (the array keeps its shape, and the
    // file it names is the same), another event's matcher changes. A flat
    // command slips into a third event after the write.
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a });
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    const res = await deploy(inProcess(w, {
      patch: { ops: [
        { op: 'set', path: ['hooks', 'PostToolUse', 0, 'hooks', 0, 'command'], value: `bash ~/.claude/hooks/${vOf(b)}/remind-distill-after-work.sh --quiet` },
        { op: 'set', path: ['hooks', 'PreToolUse', 1, 'matcher'], value: 'Skill|Task' },
      ] },
      writerSeams: { beforePersistCheck: slipIn },
    }));
    assert.equal(res.exit, EXIT.POSTCHECK, res.error);
    const line = logLines(w).pop();
    assert.deepEqual(res.recovery, { how: 'rollback --to', to: vOf(a) });
    // Exactly the two events it changed beyond their pointers: never
    // SessionStart, Stop or the status line, whose pointers alone moved.
    const named = /so the other paths this switch wrote stay as they are: (.*?)\. This switch's own inverse puts those back too\./.exec(res.error)?.[1];
    assert.deepEqual(named?.split(', ').sort(), ['["hooks","PostToolUse"]', '["hooks","PreToolUse"]'], res.error);
    // The switch's own inverse, which puts them back, beside --to and after it.
    assert.deepEqual([res.fallback.undoes, res.fallback.inverse, res.fallback.lands], [line.id, line.inverse, 'mixed']);
    assert.ok(res.error.indexOf(`rollback --to ${vOf(a)}`) < res.error.indexOf('The manual way back'), res.error);
  });

  test('exit 4 with settings read again holding no command that names the hooks folder names no rollback --to (it would refuse): the way on falls through', async () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    // A deploy: another writer takes the hooks and the status line out
    // after the write. B's inverse no longer applies (its tests name them),
    // so no way back is known.
    const res = await deploy(inProcess(w, { writerSeams: { beforePersistCheck: unhook } }));
    assert.equal(res.exit, EXIT.POSTCHECK, res.error);
    const depB = logLines(w).pop();
    assert.deepEqual(res.recovery, { how: 'none', to: null });
    assert.equal(res.fallback, undefined);
    const why = `settings hold no command that names the hooks folder, so rollback --to ${vOf(a)} has nothing to point at it`;
    assert.ok(res.error.includes(why), res.error);
    assert.ok(!res.error.includes(`rollback --to ${vOf(a)} points settings`), res.error);
    assert.match(res.error, /Put settings right through the writer by hand, then run rollback --to <a kept folder>/);
    // As it said: that --to refuses, writing and logging nothing.
    const count = logLines(w).length;
    const unhooked = fs.readFileSync(w.settings);
    const to = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(to.status, EXIT.REFUSED, to.stdout);
    assert.ok(to.json.error.startsWith(why), to.json.error);
    assert.ok(fs.readFileSync(w.settings).equals(unhooked));
    assert.equal(logLines(w).length, count);

    // A rollback the same way: settings back on B as its deploy left them,
    // then a bare undo of B lands on A and the hooks go again. --to A, the
    // version it was going to, is not named either.
    write(w.settings, canonical(switchedFixture(vOf(b))));
    const undo = await rollback(inProcess(w, { writerSeams: { beforePersistCheck: unhook } }));
    assert.equal(undo.exit, EXIT.POSTCHECK, undo.error);
    assert.equal(undo.undoes, depB.id);
    assert.deepEqual(undo.recovery, { how: 'none', to: null });
    assert.equal(undo.fallback, undefined);
    assert.ok(undo.error.includes(`Settings now point at null, not ${vOf(a)}, where this rollback was going; ${why}.`), undo.error);
    assert.ok(!undo.error.includes(`rollback --to ${vOf(a)} points settings`), undo.error);
  });

  test('exit 4 when the version before was the flat files names the snapshot that stands in for them; with none, the inverse by hand only where it lands on files that exist', async () => {
    // A snapshot of the flat files: rollback --to it.
    const s = world();
    flatFolder(s, { from: head(s) });
    const snap = run(s, ['snapshot-flat']).json.version;
    commit(s, { 'statusline.py': body('statusline.py', 'v2') }, 'two');
    const viaSnap = await deploy(inProcess(s, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(viaSnap.exit, EXIT.POSTCHECK, viaSnap.error);
    assert.deepEqual(viaSnap.recovery, { how: 'rollback --to', to: snap });
    assert.ok(viaSnap.error.endsWith(`rollback --to ${snap} points settings back at ${snap}, the snapshot standing in for the flat files.`), viaSnap.error);
    // The switch wrote command pointers alone, so --to leaves nothing of it:
    // its inverse by hand (which would land soundly on the flat files) is
    // not offered beside it.
    assert.equal(viaSnap.fallback, undefined);
    const back = run(s, ['rollback', '--to', snap]);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.equal(activeOf(readJson(s.settings)).active, snap);

    // No snapshot, but the flat files are there: this switch's own inverse,
    // by hand. It lands on the flat files (the slipped-in command was flat
    // already), and says what it skips.
    const f = world();
    flatFolder(f, { from: head(f) });
    const byHand = await deploy(inProcess(f, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(byHand.exit, EXIT.POSTCHECK, byHand.error);
    const line = logLines(f).pop();
    assert.deepEqual(byHand.recovery, { how: 'by hand', to: null });
    assert.deepEqual([byHand.fallback.undoes, byHand.fallback.inverse, byHand.fallback.lands], [line.id, line.inverse, 'flat']);
    assert.match(byHand.error, /the version before was the flat files, and the deploy log names no snapshot-flat folder/);
    assert.ok(byHand.error.includes(byHand.fallback.commandLine), byHand.error);
    // It lands on no version folder, which --to can't name: the words say a
    // bare rollback records it.
    assert.ok(byHand.error.includes(`skips the peers gate (run it only while every other session is idle) and the deploy log (afterwards, while ${line.id} is the newest switch in force, a bare rollback records it as its undo when settings are then byte for byte what that switch found; otherwise the deploy log goes on naming ${line.id} as in force)`), byHand.error);

    // Neither: no way back is offered, and the words say so.
    const n = world();
    const none = await deploy(inProcess(n, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(none.exit, EXIT.POSTCHECK, none.error);
    assert.deepEqual(none.recovery, { how: 'none', to: null });
    assert.equal(none.fallback, undefined);
    assert.ok(!none.error.includes('--apply-inverse'), none.error);
    assert.match(none.error, /Put settings right through the writer by hand, then run rollback --to <a kept folder>/);

    // Settings still on the version (only the model raced in), the switch
    // the newest in force, and yet its undo would refuse (no snapshot for
    // the flat files): no bare rollback is promised.
    const r = world();
    flatFolder(r, { from: head(r) });
    const undoable = await deploy(inProcess(r, { writerSeams: { afterRename: raceIn } }));
    assert.equal(undoable.exit, EXIT.POSTCHECK, undoable.error);
    assert.ok(!/bare rollback can undo/i.test(undoable.error), undoable.error);
    assert.match(undoable.error, /A bare rollback would refuse: v-[0-9a-f]{12} replaced the flat files, and the log has no snapshot-flat folder/);
    assert.deepEqual(undoable.recovery, { how: 'by hand', to: null });
    assert.equal(undoable.fallback.lands, 'flat');
  });

  test('a rollback that lands but fails its check leads on to the version it was going to, never back to the one it left: in force when settings point there, naming what changed since', async () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depB = logLines(w).pop();

    // A bare undo of B lands on A, and another writer then changes the
    // PreToolUse array the undo wrote (no pointer in it).
    const raced = await rollback(inProcess(w, { writerSeams: { afterRename: rematch } }));
    assert.equal(raced.exit, EXIT.POSTCHECK, raced.error);
    assert.equal(raced.switched, true);
    assert.equal(activeOf(readJson(w.settings)).active, vOf(a));
    assert.deepEqual(raced.recovery, { how: 'in force', to: vOf(a) });
    assert.equal(raced.fallback, undefined, 'its inverse leads back to B');
    assert.ok(raced.error.endsWith(`Settings point at ${vOf(a)}, where this rollback was going: it is in force, and only the check after it failed. Another writer has since changed paths it wrote: ["hooks","PreToolUse"].`), raced.error);
    assert.ok(!/bare rollback can undo|rollback --to/.test(raced.error), raced.error);
    // Its line is in the log, so it names what it undid.
    const line = logLines(w).pop();
    assert.deepEqual([line.undoes, line.postcheck], [depB.id, 'failed']);
    assert.equal(raced.undoes, depB.id);

    // A --to that lands but fails its check: in force too. A bare rollback
    // would undo the --to itself, back to the version it left.
    const jumped = await rollback(inProcess(w, { to: vOf(b), writerSeams: { afterRename: raceIn } }));
    assert.equal(jumped.exit, EXIT.POSTCHECK, jumped.error);
    assert.equal(logLines(w).pop().undoes, undefined);
    assert.deepEqual(jumped.recovery, { how: 'in force', to: vOf(b) });
    assert.ok(jumped.error.endsWith(`Settings point at ${vOf(b)}, where this rollback was going: it is in force, and only the check after it failed. Every path it wrote still holds what it wrote.`), jumped.error);
    assertClean(w);
  });

  test('a rollback that lands but fails its check, with settings pointing elsewhere, names rollback --to the version it was going to (and what that leaves); never its own inverse', async () => {
    // B carries a --patch, which the bare undo takes out; a flat command
    // slips in after the write, so settings read "mixed". The flat files
    // exist, so the undo's own inverse would land somewhere sound, and
    // still it is never offered: it puts B back.
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a });
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy', '--patch', patchFile(w, [{ op: 'set', path: ['env', 'DEPLOY_MARK'], value: 'on' }])]).status, EXIT.OK);
    const undo = await rollback(inProcess(w, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(undo.exit, EXIT.POSTCHECK, undo.error);
    assert.deepEqual(undo.recovery, { how: 'rollback --to', to: vOf(a) });
    assert.equal(undo.fallback, undefined);
    assert.ok(undo.error.endsWith(`Settings now point at "mixed", not ${vOf(a)}, where this rollback was going. rollback --to ${vOf(a)} points settings at ${vOf(a)}. It switches command pointers only, so the other paths this switch wrote stay as they are: ["env","DEPLOY_MARK"].`), undo.error);
    // As it said: --to A puts every command on A, the slipped-in one
    // included, and leaves DEPLOY_MARK as the undo left it (gone).
    const on = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(on.status, EXIT.OK, on.stdout);
    const doc = readJson(w.settings);
    assert.equal(activeOf(doc).active, vOf(a));
    assert.equal(doc.hooks.SubagentStop[0].hooks[0].command, `bash ~/.claude/hooks/${vOf(a)}/block-webfetch.sh`);
    assert.equal(doc.env.DEPLOY_MARK, undefined);

    // The same, with A's folder broken after the write: --to A would refuse,
    // so no way back is known; the undo's sound inverse is still not offered.
    const q = world();
    const qa = head(q);
    flatFolder(q, { from: qa });
    assert.equal(run(q, ['deploy']).status, EXIT.OK);
    commit(q, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(q, ['deploy', '--patch', patchFile(q, [{ op: 'set', path: ['env', 'DEPLOY_MARK'], value: 'on' }])]).status, EXIT.OK);
    const broken = await rollback(inProcess(q, { writerSeams: { beforePersistCheck: (file) => {
      slipIn(file);
      fs.appendFileSync(path.join(q.hooks, vOf(qa), 'remind-distill-after-work.sh'), '# tampered\n');
    } } }));
    assert.equal(broken.exit, EXIT.POSTCHECK, broken.error);
    assert.deepEqual(broken.recovery, { how: 'none', to: null });
    assert.equal(broken.fallback, undefined);
    assert.ok(!broken.error.includes('--apply-inverse'), broken.error);
    assert.ok(broken.error.includes(`rollback --to ${vOf(qa)} would refuse too: ${vOf(qa)} can't be rolled back to: remind-distill-after-work.sh does not match its sha256`), broken.error);
    assert.match(broken.error, /Put settings right through the writer by hand, then run rollback --to <a kept folder>/);
  });

  test('exit 4 when the switch\'s inverse can\'t be read (irreversible: a hooks array holding a secret-shaped command) says what is unknown in plain words, never the refused undo\'s advice, and never prints the secret', async () => {
    const w = world();
    const doc = settingsFixture();
    doc.hooks.Stop[0].hooks[0].command = 'bash ~/.claude/hooks/stop-distill-gate.sh --api-key=FAKEFAKEFAKEFAKE1234';
    write(w.settings, canonical(doc));
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    // A --to that lands where it was going: in force, but which of the
    // paths it wrote have changed since can't be read from its inverse.
    const jumped = await rollback(inProcess(w, { to: vOf(a), writerSeams: { afterRename: raceIn } }));
    assert.equal(jumped.exit, EXIT.POSTCHECK, jumped.error);
    assert.deepEqual(jumped.recovery, { how: 'in force', to: vOf(a) });
    assert.match(jumped.error, /it is in force, and only the check after it failed\. Which of the paths it wrote have changed since is unknown: its inverse holds irreversible op\(s\) at .*\["hooks","Stop"\]/);
    assert.ok(!JSON.stringify(jumped).includes('FAKEFAKE'), 'the secret is never printed');
    // A deploy whose way back is --to: which other paths it wrote is unknown.
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v3') }, 'three');
    const res = await deploy(inProcess(w, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(res.exit, EXIT.POSTCHECK, res.error);
    assert.deepEqual(res.recovery, { how: 'rollback --to', to: vOf(a) });
    assert.equal(res.fallback, undefined);
    assert.ok(res.error.includes(`rollback --to ${vOf(a)} points settings back at ${vOf(a)}. It switches command pointers only, and which other paths this switch wrote is unknown: its inverse holds irreversible op(s) at `), res.error);
    assert.ok(!JSON.stringify(res).includes('FAKEFAKE'), 'the secret is never printed');
    // A rollback that lands with settings pointing elsewhere: --to on, to
    // the version it was going to, with what it leaves unknown.
    const onward = await rollback(inProcess(w, { to: vOf(b), writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(onward.exit, EXIT.POSTCHECK, onward.error);
    assert.deepEqual(onward.recovery, { how: 'rollback --to', to: vOf(b) });
    assert.match(onward.error, new RegExp(`rollback --to ${vOf(b)} points settings at ${vOf(b)}\\. It switches command pointers only, and which other paths this switch wrote is unknown: its inverse holds irreversible op\\(s\\) at .*\\["hooks","Stop"\\]`));
    assert.ok(!JSON.stringify(onward).includes('FAKEFAKE'), 'the secret is never printed');
    // A refused undo's words ("Nothing was written. Put those values back
    // by hand ... then pass --to") are false once a switch has landed, and
    // on a rollback's line they point back at the version it left.
    for (const r of [jumped, res, onward]) assert.ok(!/Put those values back|Nothing was written/.test(r.error), r.error);
  });

  test('exit 4 when the switch\'s inverse file is gone or garbled by the time the advice is read says so in plain words', async () => {
    for (const [how, spoil, reason] of [
      ['gone', (f) => fs.rmSync(f), 'its inverse file is missing'],
      ['garbled', (f) => fs.writeFileSync(f, 'not json'), 'its inverse file can\'t be read as this switch\'s inverse'],
    ]) {
      const w = world();
      const a = head(w);
      assert.equal(run(w, ['deploy']).status, EXIT.OK);
      commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
      // The writer writes the inverse before its rename; it is spoiled after.
      const inverse = path.join(w.root, 'b-inverse.json');
      const res = await deploy(inProcess(w, { inverseOut: inverse, writerSeams: { beforePersistCheck: (file) => { slipIn(file); spoil(inverse); } } }));
      assert.equal(res.exit, EXIT.POSTCHECK, `${how}: ${res.error}`);
      assert.deepEqual(res.recovery, { how: 'rollback --to', to: vOf(a) }, how);
      assert.ok(res.error.endsWith(`rollback --to ${vOf(a)} points settings back at ${vOf(a)}. It switches command pointers only, and which other paths this switch wrote is unknown: ${reason}.`), `${how}: ${res.error}`);
    }
  });

  test('a kept folder whose check throws (a listed file that is a folder) counts as not verified: an exit 4 stays 4, a refusal stays 2', async () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    const listed = path.join(w.hooks, vOf(a), 'remind-distill-after-work.sh');
    fs.rmSync(listed);
    fs.mkdirSync(listed);
    // B lands, a command slips in, and every way back runs A's check, which
    // throws EISDIR reading the folder where a file should be.
    const res = await deploy(inProcess(w, { writerSeams: { beforePersistCheck: slipIn } }));
    assert.equal(res.exit, EXIT.POSTCHECK, res.error);
    assert.deepEqual(res.recovery, { how: 'none', to: null });
    assert.equal(res.fallback, undefined);
    assert.match(res.error, /rollback --to v-[0-9a-f]{12} would refuse too: .*EISDIR/);
    // A refused --to offers B's inverse only if A checks out: it can't.
    const to = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(to.status, EXIT.REFUSED, to.stdout);
    assert.equal(to.json.fallback, undefined);
  });

  test('a deploy clobbered back to the very bytes it found (exit 4) names the bare rollback, which records the undo with nothing written', async () => {
    const w = world();
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depA = logLines(w).pop();
    const atA = fs.readFileSync(w.settings);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    // Another writer puts the old bytes back right after the rename.
    const res = await deploy(inProcess(w, { writerSeams: { afterRename: (file) => fs.writeFileSync(file, atA) } }));
    assert.equal(res.exit, EXIT.POSTCHECK, res.error);
    const line = logLines(w).pop();
    assert.deepEqual(res.recovery, { how: 'bare rollback', to: null });
    assert.ok(res.error.endsWith('Settings are byte for byte what this switch found (another writer put them back), so a bare rollback records it as undone, writing nothing.'), res.error);
    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.deepEqual([back.json.undoes, back.json.noop, back.json.writer], [line.id, true, undefined]);
    assert.ok(fs.readFileSync(w.settings).equals(atA));
    // Popped: A's deploy is next (it replaced the flat files, with no
    // snapshot to stand in for them).
    const next = run(w, ['rollback']);
    assert.equal(next.status, EXIT.REFUSED, next.stdout);
    assert.ok(next.json.error.includes(`${depA.version} replaced the flat files`), next.json.error);
  });

  test('a temp build folder that can\'t be removed (Windows EBUSY) is a warning; the cmp refusal stays the outcome', async (t) => {
    const w = world();
    const realRm = fs.rmSync;
    const asked = [];
    t.mock.method(fs, 'rmSync', (p, opts) => {
      if (path.dirname(String(p)) === w.hooks && /\.tmp-/.test(path.basename(String(p)))) {
        asked.push(opts);
        throw Object.assign(new Error(`EBUSY: resource busy or locked, rmdir '${p}'`), { code: 'EBUSY' });
      }
      return realRm(p, opts);
    });
    const res = await deploy(inProcess(w, { seams: { afterCopy: (tmp) => fs.appendFileSync(path.join(tmp, 'block-webfetch.sh'), '# tampered\n') } }));
    t.mock.restoreAll();
    assert.equal(res.exit, EXIT.REFUSED, res.error);
    assert.deepEqual(res.cmpFailed, ['block-webfetch.sh']);
    assert.match(res.error, /cmp failed/);
    // The refusal says what happened to the folder, not what should have.
    assert.match(res.error, /The temp folder .+?\.tmp-[0-9a-f]+ could not be removed \(it was never live, and status lists it as a leftover\), and settings were not touched/);
    assert.ok(!res.error.includes('was removed'), res.error);
    assert.equal(asked.length, 1);
    assert.ok(asked[0]?.maxRetries >= 1, `the removal retries (${JSON.stringify(asked[0])})`);
    assert.ok(res.warnings.some((x) => /could not be removed \(EBUSY\)/.test(x)), res.warnings.join('\n'));
    const s = await status(inProcess(w));
    assert.equal(s.leftoverTemps.length, 1, 'status lists the leftover');
    assert.ok(fs.readFileSync(w.settings).equals(Buffer.from(canonical(settingsFixture()))), 'settings untouched');
  });
});

describe('deploy.mjs peers gate', () => {
  test('a busy session anywhere refuses, by name, with settings unchanged; --dry-run reports it without refusing; an idle one passes', () => {
    const w = world();
    const v = vOf(head(w));
    addPeer(w, { status: 'busy' });
    const before = fs.readFileSync(w.settings);

    const busy = run(w, ['deploy']);
    assert.equal(busy.status, EXIT.REFUSED, busy.stdout);
    assert.match(busy.json.error, /peer-b9 \(pid \d+, busy\)/);
    assert.deepEqual(busy.json.peers.busy.map((b) => b.name), ['peer-b9']);
    assert.ok(!busy.stdout.includes('SECRET-SOCKET') && !busy.stderr.includes('SECRET-SOCKET'), 'a socket path is never printed');
    assert.ok(fs.readFileSync(w.settings).equals(before), 'settings unchanged');
    assert.equal(fs.existsSync(w.log), false);
    // The folder was built before the gate (the gate runs just before the
    // write); it is not live, and the next deploy reuses it.
    assert.deepEqual(versions(w), [v]);

    const dry = run(w, ['deploy', '--dry-run']);
    assert.equal(dry.status, EXIT.OK, dry.stdout);
    assert.equal(dry.json.peers.pass, false);
    assert.ok(dry.json.warnings.some((x) => x.startsWith('dry run: the peers gate would refuse')));
    assert.ok(fs.readFileSync(w.settings).equals(before));

    addPeer(w, { status: 'idle' });
    const idle = run(w, ['deploy']);
    assert.equal(idle.status, EXIT.OK, idle.stdout);
    assert.equal(idle.json.reused, true);
    assert.equal(idle.json.peers.pass, true);
    assert.equal(readJson(w.settings).statusLine.command, `python ~/.claude/hooks/${v}/statusline.py`);
    assertClean(w);
  });

  test('a busy session in ANOTHER repo refuses too: settings.json is user-global, so the gate reads busyAnywhere, never busyPeer', async () => {
    const w = world();
    const elsewhere = path.join(w.root, 'elsewhere');
    fs.mkdirSync(elsewhere);
    git(elsewhere, 'init', '-q', '-b', 'main');
    addPeer(w, { status: 'busy', name: 'peer-elsewhere', cwd: elsewhere });
    // peers.mjs itself reads this session as outside the deploy's repo, so
    // a gate on busyPeer (or on peers filtered by toplevel) would pass it.
    const peers = await import(pathToFileURL(path.join(SQUEAKY, 'peers.mjs')).href);
    const squeaky = await import(pathToFileURL(path.join(SQUEAKY, 'lib.mjs')).href);
    const seen = peers.listPeers({ sessionsDir: w.sessions, selfPid: process.pid, selfSession: '', toplevel: squeaky.canonAbs(w.repo) });
    assert.equal(seen.ok, true, JSON.stringify(seen));
    assert.deepEqual(seen.peers, [], 'no peer in the deploy\'s own repo');
    assert.equal(seen.busyPeer, false);
    assert.equal(seen.busyAnywhere, true);

    const before = fs.readFileSync(w.settings);
    const r = run(w, ['deploy']);
    assert.equal(r.status, EXIT.REFUSED, r.stdout);
    assert.match(r.json.error, /peer-elsewhere \(pid \d+, busy\)/);
    assert.deepEqual(r.json.peers.busy.map((b) => b.name), ['peer-elsewhere']);
    assert.ok(fs.readFileSync(w.settings).equals(before), 'settings unchanged');
    assert.equal(fs.existsSync(w.log), false);
  });

  test('a registry that can\'t describe this session refuses (peers unknown), never reads as "nobody else here"', () => {
    const w = world();
    const before = fs.readFileSync(w.settings);
    // CLAUDE_PID names a live process with no registry entry.
    const noSelf = run(w, ['deploy'], { env: { CLAUDE_PID: String(sleeper.pid) } });
    assert.equal(noSelf.status, EXIT.REFUSED, noSelf.stdout);
    assert.equal(noSelf.json.peers.ok, false);
    assert.match(noSelf.json.error, /could not check the other sessions/);
    // No registry at all.
    const none = run(w, ['deploy'], { env: { SQUEAKY_SESSIONS_DIR: path.join(w.root, 'no-such-registry') } });
    assert.equal(none.status, EXIT.REFUSED);
    assert.match(none.json.error, /could not check/);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    assert.equal(fs.existsSync(w.log), false);
  });
});

describe('deploy.mjs rollback', () => {
  test('a bare rollback undoes the newest switch: after three deploys, two rollbacks step back twice; a third, with no snapshot for the flat files, refuses', () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const c = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v3') }, 'three');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(vOf(c))));
    const deploys = logLines(w);
    assert.equal(new Set(deploys.map((e) => e.id)).size, 3, 'every entry has its own id');

    const back1 = run(w, ['rollback']);
    assert.equal(back1.status, EXIT.OK, back1.stdout);
    assert.deepEqual([back1.json.version, back1.json.previous, back1.json.undoes], [vOf(b), vOf(c), deploys[2].id]);
    assert.equal(back1.json.inverse, deploys[2].inverse, 'it applied the undone deploy\'s own inverse');
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(vOf(b))), 'every command and the status line point at B');
    const back2 = run(w, ['rollback']);
    assert.equal(back2.status, EXIT.OK, back2.stdout);
    assert.deepEqual([back2.json.version, back2.json.undoes], [vOf(a), deploys[1].id], 'stepped back again, never toggled to C');
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(vOf(a))));
    assert.deepEqual(logLines(w).slice(3).map((e) => [e.action, e.version, e.previous, e.commit, e.undoes]), [
      ['rollback', vOf(b), vOf(c), b, deploys[2].id],
      ['rollback', vOf(a), vOf(b), a, deploys[1].id],
    ]);

    // A's deploy replaced the flat files, and no snapshot stands in for
    // them: refused. A's inverse would put the flat paths back, but the
    // flat files are gone, so no manual way back is offered.
    const before = fs.readFileSync(w.settings);
    const third = run(w, ['rollback']);
    assert.equal(third.status, EXIT.REFUSED, third.stdout);
    assert.match(third.json.error, /no snapshot-flat folder to stand in/);
    assert.equal(third.json.fallback, undefined, 'never a way back onto flat files that are gone');
    assert.ok(!third.json.error.includes('--apply-inverse'), third.json.error);
    // The legacy status line back, the six flat hooks still gone: still
    // none.
    const legacy = path.join(w.claude, 'statusline.py');
    write(legacy, '# the legacy status line\n');
    const noHooks = run(w, ['rollback']);
    assert.equal(noHooks.status, EXIT.REFUSED, noHooks.stdout);
    assert.equal(noHooks.json.fallback, undefined, 'never a way back onto flat hooks that are gone');
    // The six flat hooks back, the legacy status line gone: its command
    // would name a missing script, so still none.
    fs.rmSync(legacy);
    flatFolder(w, { from: a, statusline: null });
    const noLegacy = run(w, ['rollback']);
    assert.equal(noLegacy.status, EXIT.REFUSED, noLegacy.stdout);
    assert.equal(noLegacy.json.fallback, undefined, 'never a way back onto a legacy status line that is gone');
    // Every flat file there: A's inverse, by hand, node bare and every
    // argument quoted. The flat files it lands on hold no writer, and A's,
    // verified as it is, belongs to the version being escaped: the working
    // tree's writer runs it.
    write(legacy, '# the legacy status line\n');
    const offered = run(w, ['rollback']);
    assert.equal(offered.status, EXIT.REFUSED, offered.stdout);
    const fb = offered.json.fallback;
    assert.deepEqual([fb.undoes, fb.inverse, fb.lands, fb.writerFrom], [deploys[0].id, deploys[0].inverse, 'flat', 'working tree']);
    assert.equal(fb.writer, path.join(HOOKS_DIR, 'tools', 'settings-write.mjs'));
    assert.deepEqual(fb.command, ['node', fb.writer, '--target', 'settings', '--file', w.settings, '--apply-inverse', deploys[0].inverse]);
    assert.equal(fb.commandLine, `node '${fb.writer}' '--target' 'settings' '--file' '${w.settings}' '--apply-inverse' '${deploys[0].inverse}'`);
    assert.deepEqual(shWords(fb.commandLine), fb.command);
    assert.ok(offered.json.error.includes(`The manual way back, for Git Bash, sh or PowerShell 7: ${fb.commandLine} restores settings`), offered.json.error);
    assert.ok(offered.json.error.includes(`(afterwards, while ${deploys[0].id} is the newest switch in force, a bare rollback records it as its undo when settings are then byte for byte what that switch found; otherwise the deploy log goes on naming ${deploys[0].id} as in force)`), offered.json.error);
    assert.ok(fs.readFileSync(w.settings).equals(before), 'every refusal left settings as they were');
    assert.equal(logLines(w).length, 5);
    // Run as printed (the working tree's real writer): settings are back to
    // what A's deploy found, byte for byte.
    const ran = runFallback(fb);
    assert.equal(ran.status, 0, `${ran.stdout}\n${ran.stderr}`);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(settingsFixture()));
    assert.equal(logLines(w).length, 5, 'the hand path writes no log line');
    assert.deepEqual(versions(w), [vOf(a), vOf(b), vOf(c)].sort());
    assertClean(w);
  });

  test('rollback --to is a pointer switch, pushed like a deploy: a bare rollback after it returns to where the jump started', () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);

    const jump = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(jump.status, EXIT.OK, jump.stdout);
    assert.equal(jump.json.undoes, undefined);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(vOf(a))));
    const jumpLine = logLines(w).pop();
    assert.deepEqual([jumpLine.action, jumpLine.version, jumpLine.previous, jumpLine.undoes], ['rollback', vOf(a), vOf(b), undefined]);

    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.deepEqual([back.json.version, back.json.undoes], [vOf(b), jumpLine.id], 'the jump undone: back on B');
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(vOf(b))));
    // And on down the stack: B's deploy next.
    const again = run(w, ['rollback']);
    assert.equal(again.status, EXIT.OK, again.stdout);
    assert.equal(again.json.version, vOf(a));
    assert.equal(logLines(w).length, 5);
    assertClean(w);
  });

  test('a deploy whose --patch added a hook for a file the previous folder lacks rolls back, the hook leaving with it; rollback --to refuses and names the inverse', () => {
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a });
    assert.equal(run(w, ['snapshot-flat']).json.version, vOf(a));
    const b = commit(w, { 'statusline.py': body('statusline.py', 'v2') }, 'two');
    // tools/settings-write.mjs is in B's manifest, never in the snapshot.
    const added = { type: 'command', command: `node ~/.claude/hooks/${vOf(b)}/tools/settings-write.mjs --help` };
    const dep = run(w, ['deploy', '--patch', patchFile(w, [{ op: 'push', path: ['hooks', 'Stop', 0, 'hooks'], value: added }])]);
    assert.equal(dep.status, EXIT.OK, dep.stdout);
    assert.deepEqual(readJson(w.settings).hooks.Stop[0].hooks[1], added);
    const depLine = logLines(w).pop();
    const switched = fs.readFileSync(w.settings);

    // A pointer switch can't: the snapshot holds no tools/settings-write.mjs.
    const to = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(to.status, EXIT.REFUSED, to.stdout);
    assert.deepEqual(to.json.problems.map((p) => p.path), [['hooks', 'Stop', 0, 'hooks', 1, 'command']]);
    // The deploy's inverse lands on the flat files, which are all there.
    assert.deepEqual([to.json.fallback.undoes, to.json.fallback.inverse, to.json.fallback.lands], [depLine.id, depLine.inverse, 'flat']);
    assert.ok(to.json.error.includes(`'--apply-inverse' '${depLine.inverse}'`), to.json.error);
    assert.ok(fs.readFileSync(w.settings).equals(switched));

    // The undo: the deploy's inverse takes the added hook out and puts the
    // flat commands back, and those land on the snapshot.
    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.deepEqual([back.json.version, back.json.undoes], [vOf(a), depLine.id]);
    assert.ok(back.json.undone.some((op) => op.op === 'set' && op.path.join('.') === 'hooks.Stop'), JSON.stringify(back.json.undone));
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(vOf(a))), 'the added hook is gone; every command and the status line point at the snapshot');
    assertClean(w);
  });

  test('a deploy whose --patch retired a hook entry and changed env rolls back with both put back, byte for byte', () => {
    const w = world();
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const atA = fs.readFileSync(w.settings, 'utf8');
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    const dep = run(w, ['deploy', '--patch', patchFile(w, [
      { op: 'delete', path: ['hooks', 'PostToolUse'] },
      { op: 'set', path: ['env', 'EXAMPLE_FLAG'], value: '0' },
      { op: 'set', path: ['env', 'DEPLOY_MARK'], value: 'on' },
    ])]);
    assert.equal(dep.status, EXIT.OK, dep.stdout);
    const doc = readJson(w.settings);
    assert.equal(doc.hooks.PostToolUse, undefined);
    assert.deepEqual(doc.env, { EXAMPLE_FLAG: '0', DEPLOY_MARK: 'on' });

    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), atA, 'the retired entry is back in its place and env is as it was');
    // The inverse stores env values; the output names paths only.
    assert.ok(back.json.undone.every((op) => Object.keys(op).sort().join() === 'op,path'), JSON.stringify(back.json.undone));
    assertClean(w);
  });

  test('an undo whose inverse is irreversible, no longer applies, or is missing refuses by name with nothing written', () => {
    const w = world();
    // apiKeyHelper is secret-shaped by its name: the writer never stores
    // its old value, so the op that would restore it is irreversible.
    write(w.settings, canonical({ ...settingsFixture(), apiKeyHelper: 'echo old-helper' }));
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy', '--patch', patchFile(w, [{ op: 'set', path: ['apiKeyHelper'], value: 'echo new-helper' }])]).status, EXIT.OK);
    const depB = logLines(w).pop();
    const atB = fs.readFileSync(w.settings);

    // Settings changed outside deploy (a flat command under an event no
    // switch touched): the newest switch's paths still pass its inverse's
    // tests, but settings no longer point at its version alone.
    const mixed = readJson(w.settings);
    mixed.hooks.SubagentStop = [{ hooks: [{ type: 'command', command: 'bash ~/.claude/hooks/block-webfetch.sh' }] }];
    write(w.settings, canonical(mixed));
    let before = fs.readFileSync(w.settings);
    const outside = run(w, ['rollback']);
    assert.equal(outside.status, EXIT.REFUSED, outside.stdout);
    assert.match(outside.json.error, /settings point at "mixed", but the newest switch in the deploy log \([0-9a-f]{16}\) went to "v-[0-9a-f]{12}": settings changed outside deploy/);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    write(w.settings, atB);
    before = atB;

    const irr = run(w, ['rollback']);
    assert.equal(irr.status, EXIT.REFUSED, irr.stdout);
    assert.deepEqual(irr.json.irreversible, [['apiKeyHelper']]);
    assert.ok(irr.json.error.includes(depB.inverse) && irr.json.error.includes('["apiKeyHelper"]'), irr.json.error);
    assert.equal(irr.json.fallback, undefined, 'no hand-applied inverse gets past an irreversible op');
    for (const value of ['old-helper', 'new-helper']) assert.ok(!`${irr.stdout}${irr.stderr}`.includes(value), `${value} is never printed`);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    assert.equal(logLines(w).length, 2);
    // A --to that refuses names no manual way back: by hand, B's inverse
    // would be refused for the same irreversible op.
    const noWay = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(noWay.status, EXIT.REFUSED, noWay.stdout);
    assert.match(noWay.json.error, /does not exist/);
    assert.equal(noWay.json.fallback, undefined);

    // A pointer switch still goes (apiKeyHelper stays as it is), pushed;
    // its inverse is now the manual way back a refused --to names.
    assert.equal(run(w, ['rollback', '--to', vOf(a)]).status, EXIT.OK);
    const jump = logLines(w).pop();
    const way = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(way.status, EXIT.REFUSED, way.stdout);
    assert.deepEqual([way.json.fallback?.undoes, way.json.fallback?.inverse], [jump.id, jump.inverse]);

    // A hand edit to a command the jump switched: its inverse's test fails.
    const doc = readJson(w.settings);
    doc.hooks.Stop[0].hooks[0].command += ' --edited';
    write(w.settings, canonical(doc));
    before = fs.readFileSync(w.settings);
    const stale = run(w, ['rollback']);
    assert.equal(stale.status, EXIT.REFUSED, stale.stdout);
    assert.match(stale.json.error, /no longer applies: .*test failed/);
    assert.equal(stale.json.inverse, jump.inverse);
    assert.ok(fs.readFileSync(w.settings).equals(before));

    // The inverse file gone: refused, by its path.
    fs.rmSync(jump.inverse);
    const gone = run(w, ['rollback']);
    assert.equal(gone.status, EXIT.REFUSED, gone.stdout);
    assert.ok(gone.json.error.includes(`${jump.inverse}, is missing`), gone.json.error);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    assert.equal(logLines(w).length, 3);
  });

  test('a doctored deploy log refuses: an undo naming no switch in force, or a "previous" the inverse does not lead back to', () => {
    const w = world();
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const before = fs.readFileSync(w.settings);
    fs.appendFileSync(w.log, `${JSON.stringify({ id: 'feedfacefeedface', action: 'rollback', version: 'v-0123456789ab', undoes: 'not-in-the-log' })}\n`);
    const bad = run(w, ['rollback']);
    assert.equal(bad.status, EXIT.REFUSED, bad.stdout);
    assert.match(bad.json.error, /does not replay as a stack \(an entry undoes "not-in-the-log"/);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    // Nor does a refused --to offer a manual way back from such a log.
    const to = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(to.status, EXIT.REFUSED, to.stdout);
    assert.equal(to.json.fallback, undefined);
    // Nor does a --to that finds settings already there write a resync: it
    // would not put such a log right.
    const count = logLines(w).length;
    const same = run(w, ['rollback', '--to', vOf(b)]);
    assert.equal(same.status, EXIT.OK, same.stdout);
    assert.deepEqual([same.json.noop, same.json.resync], [true, undefined]);
    assert.ok(same.json.warnings.some((x) => x.startsWith('the deploy log does not replay as a stack') && x.endsWith('so no resync was logged: it would not put the log right')), same.json.warnings.join('\n'));
    assert.equal(logLines(w).length, count);

    // Settings with no hooks command until a --patch adds one: the deploy's
    // previous is null. A log claiming it was A again would have the undo
    // land on A, but the inverse takes the only hook out: refused unwritten.
    const bare = world();
    write(bare.settings, canonical({ model: 'opus' }));
    const sha = head(bare);
    const hooks = { Stop: [{ hooks: [{ type: 'command', command: `bash ~/.claude/hooks/${vOf(sha)}/stop-distill-gate.sh` }] }] };
    const dep = run(bare, ['deploy', '--patch', patchFile(bare, [{ op: 'set', path: ['hooks'], value: hooks }])]);
    assert.equal(dep.status, EXIT.OK, dep.stdout);
    assert.equal(dep.json.previous, null);
    const lines = logLines(bare);
    lines[lines.length - 1].previous = vOf(sha);
    write(bare.log, `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`);
    const at = fs.readFileSync(bare.settings);
    const lands = run(bare, ['rollback']);
    assert.equal(lands.status, EXIT.REFUSED, lands.stdout);
    assert.match(lands.json.error, /the planned write would leave settings pointing at null, not v-[0-9a-f]{12}; nothing was written/);
    assert.ok(fs.readFileSync(bare.settings).equals(at));
  });

  test('refuses a folder that fails its DEPLOYED.json check, a missing one, or one lacking a file a command names, with settings unchanged', () => {
    const w = world();
    const a = head(w);
    // A six-file snapshot (no legacy status line beside the hooks folder),
    // named by A; the deploy lands a later commit, as the live sequence does.
    flatFolder(w, { from: a, statusline: null });
    const snap = run(w, ['snapshot-flat']);
    assert.equal(snap.status, EXIT.OK, snap.stdout);
    assert.equal(snap.json.version, vOf(a));
    assert.ok(snap.json.warnings.some((x) => x.includes('the snapshot holds the six hooks only')));
    commit(w, { 'statusline.py': body('statusline.py', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const before = fs.readFileSync(w.settings);

    const lacks = run(w, ['rollback', '--to', snap.json.version]);
    assert.equal(lacks.status, EXIT.REFUSED, lacks.stdout);
    assert.deepEqual(lacks.json.problems.map((p) => p.path), [['statusLine', 'command']]);
    assert.match(lacks.json.problems[0].problem, /statusline\.py is not a file v-[0-9a-f]{12} holds/);

    fs.appendFileSync(path.join(w.hooks, snap.json.version, 'block-webfetch.sh'), '# tampered\n');
    const tampered = run(w, ['rollback', '--to', snap.json.version]);
    assert.equal(tampered.status, EXIT.REFUSED);
    assert.match(tampered.json.error, /block-webfetch\.sh does not match its sha256/);

    const missing = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(missing.status, EXIT.REFUSED);
    assert.match(missing.json.error, /does not exist/);
    const malformed = run(w, ['rollback', '--to', '../settings']);
    assert.equal(malformed.status, EXIT.REFUSED);
    assert.match(malformed.json.error, /--to must name a version folder/);

    assert.ok(fs.readFileSync(w.settings).equals(before), 'settings unchanged by every refusal');
    assert.equal(logLines(w).length, 2, 'the snapshot and the deploy only');
  });

  test('the manual way back is offered only where it leads somewhere sound: never onto a folder that fails its check or lacks a file a command names', () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depB = logLines(w).pop();
    const before = fs.readFileSync(w.settings);
    const logBefore = fs.readFileSync(w.log);

    // The control: a --to naming a missing folder offers B's inverse, which
    // lands on A, sound. It runs the writer deployed in A, the folder it
    // lands on, never B's (the version being escaped, whose writer is just
    // as sound here), and says what the hand path skips and how --to A then
    // records it.
    const sound = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(sound.status, EXIT.REFUSED, sound.stdout);
    const fb = sound.json.fallback;
    assert.deepEqual([fb.undoes, fb.inverse, fb.lands, fb.writerFrom], [depB.id, depB.inverse, vOf(a), vOf(a)]);
    assert.equal(fb.writer, path.join(w.hooks, vOf(a), 'tools', 'settings-write.mjs'));
    assert.deepEqual(shWords(fb.commandLine), fb.command);
    assert.ok(sound.json.error.includes(`It runs the writer deployed in ${vOf(a)} directly, so it skips the peers gate (run it only while every other session is idle) and the deploy log (afterwards, rollback --to ${vOf(a)} records it as the undo of ${depB.id} when settings are then byte for byte what that switch found, otherwise as a resync)`), sound.json.error);

    // A hooks command in a spelling deploy can't vouch for, added since (B's
    // inverse leaves it alone): no way back is offered over it.
    const withUnknown = readJson(w.settings);
    withUnknown.hooks.SubagentStop = [{ hooks: [{ type: 'command', command: 'bash $HOME/.claude/hooks/block-webfetch.sh' }] }];
    write(w.settings, canonical(withUnknown));
    assert.equal(run(w, ['rollback', '--to', 'v-0123456789ab']).json.fallback, undefined);
    write(w.settings, before);

    // B's own folder broken, in a file no command names once settings are
    // back on A: the way back still stands, its writer A's.
    const bFile = path.join(w.hooks, vOf(b), 'statusline.py');
    const bBytes = fs.readFileSync(bFile);
    fs.appendFileSync(bFile, '# tampered\n');
    const down = run(w, ['rollback', '--to', 'v-0123456789ab']).json.fallback;
    assert.deepEqual([down.lands, down.writerFrom, down.writer], [vOf(a), vOf(a), path.join(w.hooks, vOf(a), 'tools', 'settings-write.mjs')]);
    write(bFile, bBytes);

    // A, tampered: a bare rollback refuses on A's check, and offers no way
    // back, since B's inverse would point every hook at A.
    const victim = path.join(w.hooks, vOf(a), 'enforce-brief-before-work.sh');
    fs.appendFileSync(victim, '# tampered\n');
    const bare = run(w, ['rollback']);
    assert.equal(bare.status, EXIT.REFUSED, bare.stdout);
    assert.match(bare.json.error, /can't be rolled back to: enforce-brief-before-work\.sh does not match its sha256/);
    assert.equal(bare.json.fallback, undefined);
    assert.ok(!bare.json.error.includes('--apply-inverse'), bare.json.error);
    assert.equal(bare.json.undoes, undefined, 'a refusal names no undo');
    // Nor does a refused --to.
    const to = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(to.status, EXIT.REFUSED, to.stdout);
    assert.equal(to.json.fallback, undefined);

    // A that passes its check but no longer holds a file a command would
    // name (gone, and dropped from its DEPLOYED.json): still none.
    fs.rmSync(victim);
    const deployedJson = path.join(w.hooks, vOf(a), 'DEPLOYED.json');
    const d = readJson(deployedJson);
    delete d.files['enforce-brief-before-work.sh'];
    write(deployedJson, `${JSON.stringify(d, null, 2)}\n`);
    const lacks = run(w, ['rollback']);
    assert.equal(lacks.status, EXIT.REFUSED, lacks.stdout);
    assert.match(lacks.json.error, /enforce-brief-before-work\.sh is not a file v-[0-9a-f]{12} holds/);
    assert.equal(lacks.json.fallback, undefined);
    assert.equal(run(w, ['rollback', '--to', 'v-0123456789ab']).json.fallback, undefined);

    assert.ok(fs.readFileSync(w.settings).equals(before), 'settings unchanged');
    assert.ok(fs.readFileSync(w.log).equals(logBefore), 'the log unchanged');
  });

  test('rollback --to a folder settings already point at, while the log\'s newest switch names another, logs a resync; one that matches the log logs nothing', async (t) => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    // Settings put back on A outside deploy, with another change besides:
    // not byte for byte what B's switch found (that would be its undo).
    write(w.settings, canonical({ ...switchedFixture(vOf(a)), model: 'hand-edited' }));
    const atA = fs.readFileSync(w.settings);
    assert.match(run(w, ['rollback']).json.error, /settings changed outside deploy.*when they already point at it, that logs a resync/);

    const dry = run(w, ['rollback', '--to', vOf(a), '--dry-run']);
    assert.equal(dry.status, EXIT.OK, dry.stdout);
    assert.equal(dry.json.noop, true);
    assert.ok(dry.json.warnings.includes('dry run: the no-op would be logged'), dry.json.warnings.join('\n'));
    assert.equal(logLines(w).length, 2, 'a dry run logs nothing');

    // No write binds a resync's line to the read it describes, so settings
    // are read again first: a change in between logs nothing (exit 3).
    const realRead = fs.readFileSync;
    let reads = 0;
    t.mock.method(fs, 'readFileSync', (p, ...rest) => {
      if (path.resolve(String(p)) === path.resolve(w.settings) && ++reads === 2) return Buffer.from(canonical({ ...switchedFixture(vOf(a)), model: 'changed-meanwhile' }));
      return realRead(p, ...rest);
    });
    const changed = await rollback(inProcess(w, { to: vOf(a) }));
    t.mock.restoreAll();
    assert.equal(reads, 2, 'the plan\'s read, then the re-read');
    assert.equal(changed.exit, EXIT.CONCURRENT, changed.error);
    assert.match(changed.error, /settings changed after rollback read them \(another writer\); nothing was logged/);
    assert.equal(changed.resync, undefined);
    assert.equal(logLines(w).length, 2);

    const resync = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(resync.status, EXIT.OK, resync.stdout);
    assert.deepEqual([resync.json.noop, resync.json.resync], [true, true]);
    assert.equal(resync.json.writer, undefined, 'nothing to write, so no writer call');
    assert.ok(fs.readFileSync(w.settings).equals(atA), 'settings untouched');
    const line = logLines(w).pop();
    assert.equal(resync.json.logId, line.id);
    assert.deepEqual(
      [line.action, line.version, line.previous, line.resync, line.noop, line.inverse, line.settingsBefore, line.settingsAfter, line.undoes],
      ['rollback', vOf(a), vOf(a), true, true, null, sha256(atA), sha256(atA), undefined],
    );

    // The log now agrees with settings: the same --to logs nothing more.
    const again = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(again.status, EXIT.OK, again.stdout);
    assert.equal(again.json.resync, undefined);
    assert.equal(logLines(w).length, 3);
    // A bare rollback names the resync, which wrote nothing to undo.
    const bare = run(w, ['rollback']);
    assert.equal(bare.status, EXIT.REFUSED, bare.stdout);
    assert.match(bare.json.error, /is a resync: rollback --to found settings already pointing at "v-[0-9a-f]{12}" and wrote nothing/);
    // The next deploy starts from A, and its undo lands back on A.
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v3') }, 'three');
    const c = run(w, ['deploy']);
    assert.equal(c.status, EXIT.OK, c.stdout);
    assert.equal(c.json.previous, vOf(a));
    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.ok(fs.readFileSync(w.settings).equals(atA));
    assertClean(w);
  });

  test('a hand-applied manual way back, then rollback --to the folder it left, is logged as that switch\'s undo, so a bare rollback then undoes the switch below', () => {
    // The real writer is committed, so the deployed copy the printed
    // command prefers can run. The settings path holds a space and a quote,
    // so the quoting carries weight, and the line is for a POSIX shell only.
    const w = world({ files: realWriter() });
    const odd = path.join(w.claude, "it's settings", 'settings.json');
    write(odd, fs.readFileSync(w.settings));
    fs.rmSync(w.settings);
    w.settings = odd;
    // A snapshot of the flat files, so A's deploy can be undone too.
    flatFolder(w, { from: head(w) });
    const snap = run(w, ['snapshot-flat']).json.version;
    const a = commit(w, { 'statusline.py': body('statusline.py', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depA = logLines(w).pop();
    const atA = fs.readFileSync(w.settings);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v3') }, 'three');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depB = logLines(w).pop();

    const refused = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(refused.status, EXIT.REFUSED, refused.stdout);
    const fb = refused.json.fallback;
    assert.deepEqual([fb.undoes, fb.lands, fb.writerFrom], [depB.id, vOf(a), vOf(a)]);
    assert.ok(fb.commandLine.includes(`'${odd.replaceAll("'", "'\\''")}'`), fb.commandLine);
    assert.ok(refused.json.error.includes(`The manual way back, for a POSIX shell (Git Bash) only, since an argument holds a single quote: ${fb.commandLine} restores`), refused.json.error);
    assert.ok(refused.json.error.includes(`(afterwards, rollback --to ${vOf(a)} records it as the undo of ${depB.id} when settings are then byte for byte what that switch found, otherwise as a resync)`), refused.json.error);
    const ran = runFallback(fb);
    assert.equal(ran.status, 0, `${ran.stdout}\n${ran.stderr}`);
    assert.ok(fs.readFileSync(w.settings).equals(atA), 'settings exactly as B found them');
    assert.equal(logLines(w).length, 3, 'the hand path wrote no log line');

    // As the words said: --to A, the folder B left, finding settings byte for
    // byte what B found, is logged as B's undo (nothing written), not a
    // resync, which no bare rollback could get past.
    const told = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(told.status, EXIT.OK, told.stdout);
    assert.deepEqual([told.json.undoes, told.json.resync, told.json.noop, told.json.writer], [depB.id, undefined, true, undefined]);
    assert.ok(fs.readFileSync(w.settings).equals(atA));
    const line = logLines(w).pop();
    assert.equal(told.json.logId, line.id);
    assert.deepEqual([line.action, line.version, line.undoes, line.noop, line.resync, line.inverse], ['rollback', vOf(a), depB.id, true, undefined, null]);

    // The switch below, A's deploy, is in reach: a bare rollback undoes it,
    // onto the snapshot standing in for the flat files.
    const below = run(w, ['rollback']);
    assert.equal(below.status, EXIT.OK, below.stdout);
    assert.deepEqual([below.json.version, below.json.undoes], [snap, depA.id]);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(snap)));
  });

  test('settings put back byte for byte as the newest switch found them: a bare rollback logs its undo with nothing written, a flat previous included, and the switch below is next', () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depA = logLines(w).pop();
    const atA = fs.readFileSync(w.settings);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depB = logLines(w).pop();

    // B's switch put back by hand, byte for byte.
    write(w.settings, atA);
    const undoB = run(w, ['rollback']);
    assert.equal(undoB.status, EXIT.OK, undoB.stdout);
    assert.deepEqual([undoB.json.undoes, undoB.json.noop, undoB.json.writer, undoB.json.undone], [depB.id, true, undefined, []]);
    assert.ok(undoB.json.warnings.some((x) => x.startsWith(`settings are byte for byte what ${depB.id} found`)), undoB.json.warnings.join('\n'));
    assert.ok(fs.readFileSync(w.settings).equals(atA), 'nothing written');
    const line = logLines(w).pop();
    assert.deepEqual(
      [line.action, line.version, line.undoes, line.noop, line.inverse, line.settingsBefore, line.settingsAfter],
      ['rollback', vOf(a), depB.id, true, null, sha256(atA), sha256(atA)],
    );

    // A's switch replaced the flat files, which --to can't name: put back by
    // hand, byte for byte, a bare rollback records its undo all the same.
    write(w.settings, canonical(settingsFixture()));
    const undoA = run(w, ['rollback']);
    assert.equal(undoA.status, EXIT.OK, undoA.stdout);
    assert.deepEqual([undoA.json.undoes, undoA.json.version], [depA.id, 'flat']);
    // Nothing is left in force.
    const none = run(w, ['rollback']);
    assert.equal(none.status, EXIT.REFUSED, none.stdout);
    assert.match(none.json.error, /holds no switch still in force/);
    assertClean(w);
  });

  test('a manual way back that lands on the flat files, which --to can\'t name, says a bare rollback records it; run by hand, a bare rollback pops it and the switch below is next', () => {
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a });
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depA = logLines(w).pop();
    // Settings put back on the flat files outside deploy, with a change
    // besides (so not byte for byte what A's deploy found): the log still
    // names A's deploy in force. B's deploy then starts from the flat files.
    write(w.settings, canonical({ ...settingsFixture(), model: 'by-hand' }));
    const atFlat = fs.readFileSync(w.settings);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depB = logLines(w).pop();
    assert.equal(depB.previous, 'flat');

    const refused = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(refused.status, EXIT.REFUSED, refused.stdout);
    const fb = refused.json.fallback;
    assert.deepEqual([fb.undoes, fb.lands, fb.writerFrom], [depB.id, 'flat', 'working tree']);
    assert.ok(refused.json.error.includes(`and the deploy log (afterwards, while ${depB.id} is the newest switch in force, a bare rollback records it as its undo when settings are then byte for byte what that switch found; otherwise the deploy log goes on naming ${depB.id} as in force)`), refused.json.error);
    const ran = runFallback(fb);
    assert.equal(ran.status, 0, `${ran.stdout}\n${ran.stderr}`);
    assert.ok(fs.readFileSync(w.settings).equals(atFlat), 'settings exactly as B found them');
    assert.equal(logLines(w).length, 2, 'the hand path wrote no log line');

    // As the words said: a bare rollback records B's undo, writing nothing.
    const undo = run(w, ['rollback']);
    assert.equal(undo.status, EXIT.OK, undo.stdout);
    assert.deepEqual([undo.json.undoes, undo.json.noop, undo.json.writer], [depB.id, true, undefined]);
    assert.ok(fs.readFileSync(w.settings).equals(atFlat));
    assert.equal(logLines(w).pop().undoes, depB.id);
    // Popped: A's deploy is the newest switch in force, and the next bare
    // rollback is about it (settings changed outside deploy since it).
    const next = run(w, ['rollback']);
    assert.equal(next.status, EXIT.REFUSED, next.stdout);
    assert.ok(next.json.error.includes(`settings point at "flat", but the newest switch in the deploy log (${depA.id}) went to "${vOf(a)}"`), next.json.error);
    assert.ok(fs.readFileSync(w.settings).equals(atFlat));
    assertClean(w);
  });

  test('rollback --to on settings that name no hooks folder refuses by name, and logs no resync claiming they name it', () => {
    const w = world();
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const d = readJson(w.settings);
    delete d.hooks;
    delete d.statusLine;
    write(w.settings, canonical(d));
    const before = fs.readFileSync(w.settings);
    const count = logLines(w).length;
    const r = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(r.status, EXIT.REFUSED, r.stdout);
    assert.match(r.json.error, /settings hold no command that names the hooks folder, so rollback --to v-[0-9a-f]{12} has nothing to point at it; nothing was written or logged/);
    assert.equal(r.json.resync, undefined);
    assert.ok(fs.readFileSync(w.settings).equals(before));
    assert.equal(logLines(w).length, count);
  });

  test('the manual way back for a switch that kept its version (a --patch alone) says --to logs its undo only on exact bytes, and that --to then pops it', () => {
    const w = world({ files: realWriter() });
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depA = logLines(w).pop();
    const atA = fs.readFileSync(w.settings);
    assert.equal(run(w, ['deploy', '--patch', patchFile(w, [{ op: 'set', path: ['env', 'DEPLOY_MARK'], value: 'on' }])]).status, EXIT.OK);
    const patched = logLines(w).pop();
    assert.deepEqual([patched.version, patched.previous], [vOf(a), vOf(a)]);

    const refused = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(refused.status, EXIT.REFUSED, refused.stdout);
    const fb = refused.json.fallback;
    assert.deepEqual([fb.undoes, fb.lands, fb.version, fb.previous, fb.writerFrom], [patched.id, vOf(a), vOf(a), vOf(a), vOf(a)]);
    // Never "a resync": settings already point where the log has them.
    assert.ok(refused.json.error.includes(`(afterwards, rollback --to ${vOf(a)} records it as the undo of ${patched.id} when settings are then byte for byte what that switch found; otherwise it logs nothing, and the deploy log goes on naming ${patched.id} as in force)`), refused.json.error);
    assert.ok(!refused.json.error.includes('resync'), refused.json.error);
    const ran = runFallback(fb);
    assert.equal(ran.status, 0, `${ran.stdout}\n${ran.stderr}`);
    assert.ok(fs.readFileSync(w.settings).equals(atA));

    const told = run(w, ['rollback', '--to', vOf(a)]);
    assert.equal(told.status, EXIT.OK, told.stdout);
    assert.deepEqual([told.json.undoes, told.json.resync], [patched.id, undefined]);
    // Popped: A's deploy is next.
    const next = run(w, ['rollback']);
    assert.equal(next.status, EXIT.REFUSED, next.stdout);
    assert.ok(next.json.error.includes(`${depA.version} replaced the flat files`), next.json.error);
  });

  test('an undo that needs no write is still logged, so the stack pops and the next bare rollback reaches the switch below', () => {
    const w = world();
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const depA = logLines(w)[0];
    // The same commit again, with a --patch: a switch from A to A.
    assert.equal(run(w, ['deploy', '--patch', patchFile(w, [{ op: 'set', path: ['env', 'DEPLOY_MARK'], value: 'on' }])]).status, EXIT.OK);
    const patched = logLines(w).pop();
    assert.equal(patched.previous, patched.version);
    // Its inverse cut to its test ops alone (a hand-edited file: no writer
    // makes one), so undoing it changes nothing.
    const inv = readJson(patched.inverse);
    inv.ops = inv.ops.filter((op) => op.op === 'test');
    write(patched.inverse, `${JSON.stringify(inv, null, 2)}\n`);
    const at = fs.readFileSync(w.settings);

    const undo = run(w, ['rollback']);
    assert.equal(undo.status, EXIT.OK, undo.stdout);
    assert.equal(undo.json.noop, true);
    assert.equal(undo.json.writer.noop, true);
    assert.equal(undo.json.undoes, patched.id);
    assert.ok(undo.json.warnings.some((x) => x.includes(`the undo needed no write, and is logged`) && x.includes(`so ${patched.id} no longer counts as in force`)), undo.json.warnings.join('\n'));
    assert.ok(fs.readFileSync(w.settings).equals(at));
    const line = logLines(w).pop();
    assert.equal(undo.json.logId, line.id);
    assert.deepEqual([line.undoes, line.noop, line.inverse, line.settingsBefore, line.settingsAfter], [patched.id, true, null, sha256(at), sha256(at)]);

    // The stack popped: the next bare rollback is about A's deploy, which
    // replaced the flat files.
    const next = run(w, ['rollback']);
    assert.equal(next.status, EXIT.REFUSED, next.stdout);
    assert.match(next.json.error, /replaced the flat files, and the log has no snapshot-flat folder/);
    assert.ok(next.json.error.includes(depA.version));
    assert.equal(logLines(w).length, 3);
  });
});

describe('deploy.mjs the printed manual way back, pasted into a real shell', () => {
  // A world whose settings sit under `dir`, with the real writer committed,
  // deployed twice (A, then B); a refused --to then offers B's inverse,
  // which lands on A and runs A's deployed writer.
  function offered(dir) {
    const w = world({ files: realWriter() });
    const moved = path.join(w.claude, dir, 'settings.json');
    write(moved, fs.readFileSync(w.settings));
    fs.rmSync(w.settings);
    w.settings = moved;
    const a = head(w);
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const atA = fs.readFileSync(w.settings);
    commit(w, { 'stop-distill-gate.sh': body('stop-distill-gate.sh', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const atB = fs.readFileSync(w.settings);
    const refused = run(w, ['rollback', '--to', 'v-0123456789ab']);
    assert.equal(refused.status, EXIT.REFUSED, refused.stdout);
    const fb = refused.json.fallback;
    assert.ok(fb, refused.stdout);
    assert.deepEqual([fb.lands, fb.writerFrom], [vOf(a), vOf(a)]);
    // node bare: a line that opens with a quoted word is an expression to
    // PowerShell, which then stops at the next word.
    assert.ok(fb.commandLine.startsWith(`node '`), fb.commandLine);
    assert.deepEqual(shWords(fb.commandLine), fb.command);
    return { w, fb, error: refused.json.error, atA, atB };
  }

  test('with no quote in any argument, the line is for Git Bash, sh and PowerShell 7, and runs as printed in sh -c and in pwsh -Command', async (t) => {
    const { w, fb, error, atA, atB } = offered('my settings');
    assert.ok(error.includes(`The manual way back, for Git Bash, sh or PowerShell 7: ${fb.commandLine} restores`), error);
    for (const name of ['sh', 'pwsh']) {
      await t.test(`through ${SHELLS[name].cmd}`, (st) => {
        const why = noShell(name);
        if (why) {
          st.skip(why);
          return;
        }
        write(w.settings, atB);
        const r = inShell(name, fb.commandLine);
        assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
        assert.ok(fs.readFileSync(w.settings).equals(atA), 'settings exactly as B found them');
      });
    }
  });

  test('an argument holding a quote, straight or curly, makes the line for a POSIX shell (Git Bash) only; sh -c runs it as printed', (t) => {
    const curly = offered('it\u2019s settings');
    assert.ok(curly.error.includes('The manual way back, for a POSIX shell (Git Bash) only, since an argument holds a single quote: '), curly.error);
    const { w, fb, error, atA } = offered("it's settings");
    assert.ok(error.includes(`The manual way back, for a POSIX shell (Git Bash) only, since an argument holds a single quote: ${fb.commandLine} restores`), error);
    const why = noShell('sh');
    if (why) {
      t.skip(why);
      return;
    }
    const r = inShell('sh', fb.commandLine);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.ok(fs.readFileSync(w.settings).equals(atA), 'settings exactly as B found them');
  });
});

describe('deploy.mjs snapshot-flat', () => {
  test('names the folder by the newest commit whose six blobs equal the flat files, copies the legacy status line, and leaves settings alone', () => {
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a });
    // A later commit changes a hook: the flat files no longer match HEAD,
    // so the walk must go back to A.
    const b = commit(w, { 'block-webfetch.sh': body('block-webfetch.sh', 'v2') }, 'two');
    assert.notEqual(a, b);
    const before = fs.readFileSync(w.settings);

    const r = run(w, ['snapshot-flat']);
    assert.equal(r.status, EXIT.OK, r.stdout);
    assert.equal(r.json.version, vOf(a));
    assert.equal(r.json.namedBy, 'commit');
    const folder = path.join(w.hooks, vOf(a));
    assert.deepEqual(listFiles(folder), [...FLAT_HOOKS, 'statusline.py', 'DEPLOYED.json'].sort());
    for (const n of FLAT_HOOKS) assert.ok(fs.readFileSync(path.join(folder, n)).equals(fs.readFileSync(path.join(w.hooks, n))));
    assert.ok(fs.readFileSync(path.join(folder, 'statusline.py')).equals(fs.readFileSync(path.join(w.claude, 'statusline.py'))));
    const d = readJson(path.join(folder, 'DEPLOYED.json'));
    assert.equal(d.source, 'flat');
    assert.equal(d.commit, a);
    assert.deepEqual(d.extras, { 'statusline.py': '../statusline.py' });
    assert.ok(fs.readFileSync(w.settings).equals(before), 'snapshot-flat never switches settings');
    assert.deepEqual(logLines(w).map((e) => [e.action, e.version, e.settingsBefore]), [['snapshot-flat', vOf(a), null]]);
    for (const n of FLAT_HOOKS) assert.ok(fs.existsSync(path.join(w.hooks, n)), 'the flat files stay');

    const again = run(w, ['snapshot-flat']);
    assert.equal(again.status, EXIT.OK);
    assert.equal(again.json.reused, true);
    assert.equal(logLines(w).length, 1);
    assertClean(w);
  });

  test('names the folder by content when no commit matches; it then serves as the first deploy\'s rollback target', () => {
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a, bodies: { 'remind-distill-after-work.sh': '# a hand edit no commit holds\n' } });
    // The documented name, computed here: sha256 over every copied file in
    // sorted name order, each as name NUL byte-length NUL bytes.
    const copied = [...FLAT_HOOKS, 'statusline.py'].sort().map((n) => [n, fs.readFileSync(n === 'statusline.py' ? path.join(w.claude, n) : path.join(w.hooks, n))]);
    const h = createHash('sha256');
    for (const [n, bytes] of copied) {
      h.update(`${n}\0${bytes.length}\0`);
      h.update(bytes);
    }
    const flatV = `v-flat-${h.digest('hex').slice(0, 12)}`;

    const r = run(w, ['snapshot-flat']);
    assert.equal(r.status, EXIT.OK, r.stdout);
    assert.equal(r.json.version, flatV);
    assert.equal(r.json.namedBy, 'content');
    assert.equal(r.json.commit, null);
    assert.ok(r.json.warnings.some((x) => x.includes('named by content')));
    assert.equal(readJson(path.join(w.hooks, flatV, 'DEPLOYED.json')).commit, null);

    // deploy, then a rollback with no --to: the version before was the flat
    // files, which the snapshot stands in for.
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.equal(back.json.version, flatV);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(flatV)), 'statusLine included: the snapshot holds the legacy status line');
    // And forward again, from the v-flat- spelling.
    const fwd = run(w, ['deploy']);
    assert.equal(fwd.status, EXIT.OK, fwd.stdout);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(vOf(a))));
    assertClean(w);
  });

  test('a deploy of the very commit a snapshot is named by refuses, says why, and leaves the snapshot as it is', () => {
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a });
    assert.equal(run(w, ['snapshot-flat']).json.version, vOf(a));
    const snapBytes = fs.readFileSync(path.join(w.hooks, vOf(a), 'DEPLOYED.json'));
    const before = fs.readFileSync(w.settings);
    const r = run(w, ['deploy', '--commit', a]);
    assert.equal(r.status, EXIT.REFUSED, r.stdout);
    assert.match(r.json.error, /It is the flat snapshot snapshot-flat named by this commit: deploy a later commit/);
    assert.ok(fs.readFileSync(path.join(w.hooks, vOf(a), 'DEPLOYED.json')).equals(snapBytes));
    assert.ok(fs.readFileSync(w.settings).equals(before));
    // Any later commit deploys.
    git(w.repo, 'commit', '-q', '--allow-empty', '-m', 'empty');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
  });

  test('refuses when a flat hook is missing', () => {
    const w = world();
    flatFolder(w, { from: head(w) });
    fs.rmSync(path.join(w.hooks, 'stop-distill-gate.sh'));
    const r = run(w, ['snapshot-flat']);
    assert.equal(r.status, EXIT.REFUSED);
    assert.match(r.json.error, /lacks stop-distill-gate\.sh/);
    assert.deepEqual(versions(w), []);
  });
});

describe('deploy.mjs status and the never-delete rule', () => {
  test('no version folder is ever deleted, across snapshot, deploys, rollbacks and refusals; there is no prune', () => {
    const w = world();
    const seen = new Set();
    const step = (args, expect = EXIT.OK) => {
      const r = run(w, args);
      assert.equal(r.status, expect, `${args.join(' ')}: ${r.stdout}`);
      const now = new Set(versions(w));
      for (const v of seen) assert.ok(now.has(v), `${v} survived ${args.join(' ')}`);
      for (const v of now) seen.add(v);
    };
    const a = head(w);
    flatFolder(w, { from: a });
    step(['snapshot-flat']);
    const b = commit(w, { 'statusline.py': body('statusline.py', 'v2') }, 'two');
    step(['deploy']);
    const c = commit(w, { 'lib/encoding.mjs': body('lib/encoding.mjs', 'v3') }, 'three');
    step(['deploy']);
    step(['rollback']);
    step(['deploy']);
    step(['rollback', '--to', vOf(a)]);
    step(['deploy', '--commit', b]);
    // A refused rollback (its target tampered) deletes nothing either.
    fs.appendFileSync(path.join(w.hooks, vOf(c), 'statusline.py'), '# tampered\n');
    step(['rollback', '--to', vOf(c)], EXIT.REFUSED);
    step(['deploy', '--commit', c], EXIT.REFUSED);
    assert.deepEqual([...seen].sort(), [vOf(a), vOf(b), vOf(c)].sort());
    assert.deepEqual(versions(w), [...seen].sort());

    const prune = spawnSync(process.execPath, [DEPLOY, 'prune', '--hooks-dir', w.hooks], { env: gitEnv(), encoding: 'utf8', windowsHide: true });
    assert.equal(prune.status, EXIT.REFUSED);
    assert.match(prune.stdout, /there is no prune/);
  });

  test('status reports the active version, kept folders, flat files and the log; a mix reads "mixed"; a tampered folder reads not ok', () => {
    const w = world();
    const a = head(w);
    flatFolder(w, { from: a });
    assert.equal(run(w, ['snapshot-flat']).status, EXIT.OK);
    const b = commit(w, { 'statusline.py': body('statusline.py', 'v2') }, 'two');
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    // A crashed deploy's temp folder.
    fs.mkdirSync(path.join(w.hooks, `${vOf(b)}.tmp-00ff`));

    const s = run(w, ['status']);
    assert.equal(s.status, EXIT.OK, s.stdout);
    assert.equal(s.json.active, vOf(b));
    assert.deepEqual(s.json.kept.map((k) => [k.version, k.source, k.ok, k.files]), [[vOf(a), 'flat', true, 7], [vOf(b), 'git', true, MANIFEST.length]].sort());
    assert.deepEqual(s.json.leftoverTemps, [`${vOf(b)}.tmp-00ff`]);
    assert.ok(s.json.warnings.some((x) => x.includes('left by a crashed deploy')));
    assert.deepEqual(s.json.flat.present, [...FLAT_HOOKS]);
    assert.equal(s.json.flat.statusline, true);
    assert.deepEqual(s.json.lastLog.map((e) => e.action), ['snapshot-flat', 'deploy']);
    fs.rmSync(path.join(w.hooks, `${vOf(b)}.tmp-00ff`), { recursive: true });

    const doc = readJson(w.settings);
    doc.hooks.Stop[0].hooks[0].command = 'bash ~/.claude/hooks/stop-distill-gate.sh';
    write(w.settings, canonical(doc));
    assert.equal(run(w, ['status']).json.active, 'mixed');

    fs.appendFileSync(path.join(w.hooks, vOf(b), 'lib', 'encoding.mjs'), '// tampered\n');
    const bad = run(w, ['status']).json.kept.find((k) => k.version === vOf(b));
    assert.equal(bad.ok, false);
    assert.ok(bad.problems.some((p) => p.includes('lib/encoding.mjs')));
  });

  test('settings that start with a BOM are read (status names their version); a deploy leaves the refusal to the writer, which names the BOM', () => {
    const w = world();
    write(w.settings, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(canonical(settingsFixture()))]));
    const before = fs.readFileSync(w.settings);
    const s = run(w, ['status']);
    assert.equal(s.status, EXIT.OK, s.stdout);
    assert.equal(s.json.active, 'flat');
    assert.equal(s.json.settingsError, undefined);
    const r = run(w, ['deploy']);
    assert.equal(r.status, EXIT.REFUSED, r.stdout);
    assert.equal(r.json.writer.exit, 2);
    assert.match(r.json.error, /BOM/);
    assert.ok(fs.readFileSync(w.settings).equals(before));
  });
});

describe('deploy.mjs reference scanning', () => {
  test('scanCommand reads each spelling as its form', () => {
    const forms = (cmd) => scanCommand(cmd).map((r) => [r.form, r.version, r.file]);
    assert.deepEqual(forms('bash ~/.claude/hooks/block-webfetch.sh'), [['flat', null, 'block-webfetch.sh']]);
    assert.deepEqual(forms('node ~/.claude/hooks/v-0123456789ab/tools/settings-write.mjs --x'), [['versioned', 'v-0123456789ab', 'tools/settings-write.mjs']]);
    assert.deepEqual(forms('bash ~/.claude/hooks/v-flat-0123456789ab/a.sh;echo'), [['versioned', 'v-flat-0123456789ab', 'a.sh']]);
    assert.deepEqual(forms('python ~/.claude/statusline.py'), [['legacy', null, 'statusline.py']]);
    assert.deepEqual(forms('bash ~/.claude/hooks/a.sh && bash ~/.claude/hooks/b.sh'), [['flat', null, 'a.sh'], ['flat', null, 'b.sh']]);
    assert.deepEqual(forms('bash ~/.claude/hooks-old/a.sh'), [], 'another folder');
    assert.deepEqual(forms('powershell.exe -Command "Show()"'), []);
    for (const cmd of ['bash $HOME/.claude/hooks/a.sh', 'bash x~/.claude/hooks/a.sh', 'bash ~/.claude//hooks/a.sh', "bash '~/.claude/hooks/a.sh'", 'python ~/.claude/statusline.py/x']) {
      assert.deepEqual(scanCommand(cmd).map((r) => r.form), ['unknown'], cmd);
    }
  });

  test('activeOf: one version, flat (with the legacy status line), mixed, or none', () => {
    const fx = settingsFixture();
    assert.equal(activeOf(fx).active, 'flat');
    assert.equal(activeOf(switchedFixture('v-0123456789ab')).active, 'v-0123456789ab');
    const mixed = switchedFixture('v-0123456789ab');
    mixed.statusLine.command = 'python ~/.claude/statusline.py';
    assert.equal(activeOf(mixed).active, 'mixed');
    assert.equal(activeOf({ model: 'x' }).active, null);
  });
});

describe('deploy.mjs manifest and CLI', () => {
  test('every relative import reachable from a MANIFEST .mjs is itself in MANIFEST, or the deployed copy could not load it', () => {
    const { edges } = importClosure(MANIFEST.filter((rel) => rel.endsWith('.mjs')), (dep) => MANIFEST.includes(dep));
    const strays = edges.filter((e) => !MANIFEST.includes(e.dep)).map((e) => `${e.from} imports ${e.spec} (${e.dep}), which MANIFEST does not list`);
    assert.deepEqual(strays, []);
    assert.ok(edges.some((e) => e.from === 'tools/settings-write.mjs' && e.dep === 'lib/encoding.mjs'), 'the walk reads real imports: the writer imports lib/encoding.mjs');
  });

  test('the CLI runs on a node without import.meta.main and through a junction; imported, it runs nothing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-cli-'));
    made.push(tmp);
    const usage = /^usage: node deploy\.mjs deploy/;
    const start = (args) => spawnSync(process.execPath, args, { env: gitEnv(), encoding: 'utf8', shell: false, windowsHide: true });

    // A node before 24.2 has no import.meta.main: a load hook takes it out
    // of deploy.mjs's source, so a guard that relied on it would skip main.
    const noMetaMain = path.join(tmp, 'no-meta-main.mjs');
    write(noMetaMain, [
      "import { registerHooks } from 'node:module';",
      'registerHooks({',
      '  load(url, context, nextLoad) {',
      '    const r = nextLoad(url, context);',
      "    if (!url.endsWith('/deploy.mjs')) return r;",
      "    return { ...r, source: Buffer.from(r.source).toString('utf8').replaceAll('import.meta.main', 'undefined') };",
      '  },',
      '});',
      '',
    ].join('\n'));
    const old = start(['--import', pathToFileURL(noMetaMain).href, DEPLOY, '--help']);
    assert.equal(old.status, 0, old.stderr);
    assert.match(old.stdout, usage, 'without import.meta.main the CLI still runs');

    // Through a junction (a symlink on POSIX) to a copy of deploy.mjs and
    // all it imports: argv[1] is the link's path, the module's URL the
    // real one, so only a realpath comparison sees they are one file.
    const real = path.join(tmp, 'real');
    for (const rel of importClosure(['deploy.mjs']).files) write(path.join(real, ...rel.split('/')), fs.readFileSync(path.join(HOOKS_DIR, ...rel.split('/'))));
    const link = path.join(tmp, 'link');
    fs.symlinkSync(real, link, process.platform === 'win32' ? 'junction' : 'dir');
    const viaLink = start([path.join(link, 'deploy.mjs'), '--help']);
    assert.equal(viaLink.status, 0, viaLink.stderr);
    assert.match(viaLink.stdout, usage, 'started through a junction, the CLI runs');

    // Imported by another module, main never runs.
    const importer = path.join(tmp, 'importer.mjs');
    write(importer, `await import(${JSON.stringify(pathToFileURL(DEPLOY).href)});\nprocess.stdout.write('imported\\n');\n`);
    const imported = start([importer]);
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(imported.stdout, 'imported\n');
  });
});

describe('deploy.mjs --patch from tools/permission-patch.mjs (U4: the user settings patch rides the switch)', () => {
  // The landing's user step (U4 design steps 6 and 7.4): the real generator
  // makes the patch from this file's settings fixture plus a push allow and
  // a playwright glob, with the real catalog; deploy lands it with the switch
  // in one write, and one bare rollback undoes both. A direct writer call on
  // a path the patch changed, made in between, leaves the switch's inverse
  // stale: the bare rollback must refuse by that path, with nothing written,
  // until that write is undone by its own inverse (insight 004: the sequence,
  // asserted after each step). As at the landing, settings already point at a
  // kept version (live, v-84b0dfbb922a) when the U4 commit is deployed, so the
  // undo has a folder to land on.
  const TOOL = path.join(HOOKS_DIR, 'tools', 'permission-patch.mjs');
  const WRITER = path.join(HOOKS_DIR, 'tools', 'settings-write.mjs');
  const CATALOG_FILE = path.join(HOOKS_DIR, 'lib', 'permission-rules.json');
  const node = (args) => spawnSync(process.execPath, args, { env: gitEnv(), shell: false, windowsHide: true, encoding: 'utf8' });

  // A world whose settings hold a push allow and a playwright glob and point
  // at version A, a commit B to land, and the patch the generator makes from
  // those settings, in the world's root. The glob stays (the catalog denies
  // its run-code since the U4 cut); the push allow goes.
  function permWorld() {
    const w = world();
    const doc = settingsFixture();
    doc.permissions.allow.push('Bash(git push:*)', 'mcp__playwright__*');
    write(w.settings, canonical(doc));
    assert.equal(run(w, ['deploy']).status, EXIT.OK);
    const b = commit(w, { 'check-config-liveness.mjs': body('check-config-liveness.mjs', 'u4') }, 'u4');
    const rules = readJson(CATALOG_FILE);
    const marketplaces = path.join(w.root, 'known_marketplaces.json');
    write(marketplaces, canonical({ [rules.marketplace.name]: { source: { source: 'github', repo: 'example/every-plugin' }, lastUpdated: '2026-01-01T00:00:00.000Z' } }));
    const expected = path.join(w.root, 'expected-user.json');
    write(expected, JSON.stringify(['Bash(git push:*)']));
    const out = path.join(w.root, 'user-patch.json');
    const r = node([TOOL, '--rules', CATALOG_FILE, '--target', 'user', '--file', w.settings, '--marketplaces', marketplaces, '--expected', expected, '--out', out]);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    return { w, rules, out, version: vOf(b), original: fs.readFileSync(w.settings) };
  }

  test('deploy --patch <generated> lands the permission ops with the switch in one write, exactly those ops; a bare rollback restores the bytes', async () => {
    const { applyOps } = await import('../tools/settings-write.mjs');
    const { skipsSafetyCheck } = await import('../lib/permissions.mjs');
    const { w, rules, out, version, original } = permWorld();
    const dep = run(w, ['deploy', '--patch', out]);
    assert.equal(dep.status, EXIT.OK, dep.stdout);
    const want = JSON.parse(original.toString('utf8'));
    applyOps(want, readJson(out).ops);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(switchedFixture(version, want)), 'the switch plus the patch, nothing else');
    const doc = readJson(w.settings);
    assert.equal(activeOf(doc).active, version);
    assert.deepEqual(doc.permissions.allow.filter((r) => skipsSafetyCheck(r, { denies: doc.permissions.deny })), [], 'no allow lets a push skip the check or reaches run-code past its deny');
    assert.ok(doc.permissions.allow.includes('mcp__playwright__*'), 'the playwright glob stays');
    assert.deepEqual([doc.permissions.ask, doc.permissions.deny.slice(1)], [[], rules.deny.map((r) => r.rule)], 'an empty ask list: nothing asks');
    assert.equal(logLines(w).length, 2, 'one write, one log line (after A\'s)');

    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.equal(back.json.undoes, logLines(w)[1].id);
    assert.ok(fs.readFileSync(w.settings).equals(original), 'the switch and every permission op undone, byte for byte');
    assertClean(w);
  });

  test('an allow written by a direct writer call between the deploy and the rollback makes the bare rollback refuse by path, with nothing written or logged; once that write is undone by its own inverse, the bare rollback goes through', () => {
    const { w, out, original } = permWorld();
    assert.equal(run(w, ['deploy', '--patch', out]).status, EXIT.OK);
    const dep = logLines(w)[1];

    const extra = path.join(w.root, 'extra-allow.json');
    write(extra, JSON.stringify({ ops: [{ op: 'push', path: ['permissions', 'allow'], value: 'Bash(npm test)' }] }));
    const extraInverse = path.join(w.root, 'extra-allow-inverse.json');
    const direct = node([WRITER, '--target', 'settings', '--file', w.settings, '--patch', extra, '--inverse-out', extraInverse]);
    assert.equal(direct.status, 0, `${direct.stdout}\n${direct.stderr}`);
    const between = fs.readFileSync(w.settings);

    const refused = run(w, ['rollback']);
    assert.equal(refused.status, EXIT.REFUSED, refused.stdout);
    assert.ok(refused.json.error.startsWith(`the logged inverse of ${dep.id}, ${dep.inverse}, no longer applies: op `), refused.json.error);
    assert.match(refused.json.error, /, no longer applies: op \d+ \(test \["permissions","allow"\]\): test failed: the value differs \(it holds \{"type":"array","length":\d+,"sha8":"[0-9a-f]{8}"\}\)\. Settings changed since that switch; /,'refused by the path the direct write changed, its value never printed');
    assert.ok(refused.json.error.includes('; nothing was written.'), refused.json.error);
    assert.equal(refused.json.inverse, dep.inverse);
    assert.equal(refused.json.fallback, undefined, 'no hand-applied inverse is offered: it would not apply either');
    assert.ok(fs.readFileSync(w.settings).equals(between), 'nothing written');
    assert.equal(logLines(w).length, 2, 'nothing logged');

    // The way on: the direct write's own inverse, then the bare rollback.
    const undo = node([WRITER, '--target', 'settings', '--file', w.settings, '--apply-inverse', extraInverse, '--inverse-out', path.join(w.root, 'undo-inverse.json')]);
    assert.equal(undo.status, 0, `${undo.stdout}\n${undo.stderr}`);
    const back = run(w, ['rollback']);
    assert.equal(back.status, EXIT.OK, back.stdout);
    assert.equal(back.json.undoes, dep.id);
    assert.ok(fs.readFileSync(w.settings).equals(original), 'back to the bytes before the U4 deploy');
    assert.equal(logLines(w).length, 3);
    assertClean(w);
  });

  test('a patch gone stale (a push allow added to settings after it was made) refuses the deploy at its plan, exit 2: nothing built, written or logged', () => {
    const { w, out } = permWorld();
    const doc = readJson(w.settings);
    doc.permissions.allow.push('Bash(git push origin main)');
    write(w.settings, canonical(doc));
    const before = fs.readFileSync(w.settings);
    const builtBefore = versions(w);
    const dep = run(w, ['deploy', '--patch', out]);
    assert.equal(dep.status, EXIT.REFUSED, dep.stdout);
    assert.match(dep.json.error, /^the switch would not apply: op \d+ \(test \["permissions","allow"\]\): test failed: the value differs \(it holds \{"type":"array",.*\); nothing was written$/);
    assert.ok(fs.readFileSync(w.settings).equals(before), 'nothing written');
    assert.deepEqual(versions(w), builtBefore, 'nothing built');
    assert.equal(logLines(w).length, 1, 'nothing logged');
    assertClean(w);
  });

  test('rollback --to the version before is the liveness-only undo: the hooks go back, every permission op stays (S1 stays closed)', async () => {
    const { applyOps } = await import('../tools/settings-write.mjs');
    const { w, out, original } = permWorld();
    const a = activeOf(JSON.parse(original.toString('utf8'))).active;
    assert.equal(run(w, ['deploy', '--patch', out]).status, EXIT.OK);
    const to = run(w, ['rollback', '--to', a]);
    assert.equal(to.status, EXIT.OK, to.stdout);
    const want = JSON.parse(original.toString('utf8'));
    applyOps(want, readJson(out).ops);
    assert.equal(fs.readFileSync(w.settings, 'utf8'), canonical(want), 'pointing at A, with the patch\'s permission ops in place');
    assert.equal(logLines(w).length, 3);
    assertClean(w);
  });
});
