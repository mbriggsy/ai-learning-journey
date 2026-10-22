// tools/settings-write.mjs: the one settings writer (KTD 14). Every case runs
// on a temp copy: the real ~/.claude/settings.json and ~/.claude.json are
// never read or written. HOME and USERPROFILE point at a temp home for the
// whole file (and for every child run of the CLI), so a default path that
// slipped through would land there, not in the real home.
//
// The secret-shaped values are assembled at run time from pieces, so this
// file holds none of them.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isAscii, scanEncoding } from '../lib/encoding.mjs';
import { EXIT, hashValue, secretShaped, settingsWrite } from '../tools/settings-write.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WRITER = path.join(HERE, '..', 'tools', 'settings-write.mjs');

const made = [];
let home;
const saved = {};
before(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-home-'));
  made.push(home);
  for (const k of ['HOME', 'USERPROFILE', 'CLAUDE_CONFIG_DIR', 'CLAUDE_CODE_CUSTOM_OAUTH_URL']) saved[k] = process.env[k];
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  delete process.env.CLAUDE_CONFIG_DIR;
  delete process.env.CLAUDE_CODE_CUSTOM_OAUTH_URL;
});
after(() => {
  for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

function fresh() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-'));
  made.push(d);
  return d;
}

const canonical = (doc, newline = true) => `${JSON.stringify(doc, null, 2)}${newline ? '\n' : ''}`;
const put = (file, doc, newline = true) => fs.writeFileSync(file, canonical(doc, newline));
const ls = (dir) => fs.readdirSync(dir).sort();

// A secret-shaped string nobody could mistake for a real one.
const planted = (prefix) => `${prefix}${['planted', randomBytes(12).toString('hex')].join('-')}`;

// The em dash written as an escape, so this file stays ASCII too.
const DASH = '\u2014';

// A settings file shaped like the real one: nested hooks, autoMode arrays
// holding 15 em dashes across 14 strings, env, a key with dots and brackets.
function settingsFixture() {
  const environment = Array.from({ length: 12 }, (_, i) => `Rule ${i + 1} ${DASH} the detail of rule ${i + 1}`);
  environment[4] = `Rule 5 ${DASH} two parts ${DASH} and a third`;
  return {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    env: { DISABLE_TELEMETRY: '1', EXAMPLE_FLAG: 'on' },
    permissions: { allow: ['Bash(git status:*)', 'Read(//tmp/**)'], deny: ['WebFetch'], defaultMode: 'default' },
    hooks: {
      PreToolUse: [{ matcher: 'WebFetch', hooks: [{ type: 'command', command: '~/.claude/hooks/block-webfetch.sh', onFailure: 'block' }] }],
      SessionStart: [{ hooks: [{ type: 'command', command: 'bash ~/.claude/hooks/elite-engineer-session-start.sh' }] }],
      Stop: [{ hooks: [{ type: 'command', command: '~/.claude/hooks/stop-distill-gate.sh', timeout: 10 }] }],
    },
    statusLine: { type: 'command', command: 'python ~/.claude/statusline.py' },
    model: 'opus[1m]',
    modelSettings: { 'claude-opus-5-5[1m]': { effortLevel: 'high' } },
    autoMode: {
      allow: [`Local scratch work ${DASH} temp folders`, 'Read-only git'],
      soft_deny: [`Force push ${DASH} never`, 'Deleting branches'],
      environment,
    },
    enabledPlugins: { 'compound-engineering@every-marketplace': true },
  };
}

// The same file with its em dashes already folded: the ASCII baseline most
// cases start from.
function asciiFixture() {
  return JSON.parse(JSON.stringify(settingsFixture()).split(DASH).join('--'));
}

// A ~/.claude.json shaped like the real one: canonical, no trailing newline,
// non-ASCII the CLI wrote, project keys that are paths, secret-shaped values.
function claudeJsonFixture() {
  return {
    numStartups: 412,
    installMethod: 'native',
    autoUpdates: false,
    tipsHistory: { 'new-user-warmup': 7, 'plan-mode': 3 },
    primaryApiKey: planted('sk-'),
    oauthAccount: { accountId: 'acct-1', emailAddress: 'someone@example.com', organizationRole: 'admin' },
    customApiKeyResponses: { approved: [], rejected: [] },
    projects: {
      '/home/someone/repo': { allowedTools: ['Read'], hasTrustDialogAccepted: true, lastCost: 1.25 },
      'D:/work/other repo': { allowedTools: [], hasTrustDialogAccepted: false, note: `Status ${DASH} fine` },
    },
    cachedGrowthBookFeatures: { bar: '\u2588\u2591 \u00b7 ok' },
  };
}

// Lines removed and added between two texts (a small LCS), in order.
function lineDiff(a, b) {
  const A = a.split('\n');
  const B = b.split('\n');
  const dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const removed = [];
  const added = [];
  let i = 0;
  let j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) { i++; j++; } else if (i < A.length && (j === B.length || dp[i + 1][j] >= dp[i][j + 1])) removed.push(A[i++]);
    else added.push(B[j++]);
  }
  return { removed, added };
}

// One library call, its inverse always written inside `dir` and the lock
// wait and persist delay short.
let n = 0;
const write = (dir, opts) => settingsWrite({ lockWaitMs: 2_000, persistDelayMs: 0, inverseOut: path.join(dir, `inverse-${++n}.json`), ...opts });

// The CLI as a child process, with the temp home.
function cli(args, env = {}) {
  const r = spawnSync(process.execPath, [WRITER, ...args], {
    encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000,
    env: { ...process.env, HOME: home, USERPROFILE: home, ...env },
  });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* checked by the caller */ }
  return { ...r, json };
}

describe('the patch touches only its paths', () => {
  test('bytes outside the patch are unchanged: only the patched lines differ, and the file is exactly the intended document', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const old = fs.readFileSync(file, 'utf8');
    const r = await write(dir, {
      target: 'settings', file, ops: [
        { op: 'set', path: ['statusLine', 'command'], value: 'python ~/.claude/hooks/v-0123456789ab/statusline.py' },
        { op: 'push', path: ['permissions', 'allow'], value: 'Bash(node --test:*)' },
        { op: 'set', path: ['modelSettings', 'claude-opus-5-5[1m]', 'effortLevel'], value: 'xhigh' },
        { op: 'set', path: ['hooks', 'Stop', 0, 'hooks', 0, 'timeout'], value: 20 },
      ],
    });
    assert.equal(r.exit, EXIT.OK, r.error);
    const now = fs.readFileSync(file, 'utf8');
    // The intended document, made independently of the writer.
    const want = asciiFixture();
    want.statusLine.command = 'python ~/.claude/hooks/v-0123456789ab/statusline.py';
    want.permissions.allow.push('Bash(node --test:*)');
    want.modelSettings['claude-opus-5-5[1m]'].effortLevel = 'xhigh';
    want.hooks.Stop[0].hooks[0].timeout = 20;
    assert.equal(now, canonical(want));
    assert.deepEqual(lineDiff(old, now), {
      removed: [
        '      "Read(//tmp/**)"',
        '            "timeout": 10',
        '    "command": "python ~/.claude/statusline.py"',
        '      "effortLevel": "high"',
      ],
      added: [
        '      "Read(//tmp/**)",',
        '      "Bash(node --test:*)"',
        '            "timeout": 20',
        '    "command": "python ~/.claude/hooks/v-0123456789ab/statusline.py"',
        '      "effortLevel": "xhigh"',
      ],
    });
    assert.equal(r.before.length, 64);
    assert.notEqual(r.after, r.before);
    // The file and its inverse: no temp file, no lock.
    assert.deepEqual(ls(dir), [path.basename(r.inverse), 'settings.json'].sort());
  });

  test('a test-only patch is "no change": nothing is written, no inverse, no temp or lock file', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const mtime = fs.statSync(file).mtimeMs;
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'test', path: ['model'], value: 'opus[1m]' }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(r.noop, true);
    assert.equal(r.written, false);
    assert.equal(r.after, r.before);
    assert.equal(fs.statSync(file).mtimeMs, mtime);
    assert.deepEqual(ls(dir), ['settings.json']);
  });
});

describe('the em-dash fold and the ASCII rule (KTD 14)', () => {
  test('replaceInStrings folds the 15 em dashes under autoMode to "--": the output is ASCII and only those 14 lines changed', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, settingsFixture());
    const old = fs.readFileSync(file, 'utf8');
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'replaceInStrings', path: ['autoMode'], from: DASH, to: '--', expectCount: 15 }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(r.changes[0].count, 15);
    assert.equal(r.changes[0].strings.length, 14);
    const now = fs.readFileSync(file);
    assert.equal(isAscii(now.toString('utf8')), true);
    const enc = scanEncoding(now);
    assert.deepEqual([enc.bom, enc.counts.nonAscii, enc.counts.mojibake, enc.counts.invalidUtf8], [false, 0, 0, 0]);
    const d = lineDiff(old, now.toString('utf8'));
    assert.equal(d.removed.length, 14);
    assert.deepEqual(d.added, d.removed.map((l) => l.split(DASH).join('--')));
    assert.equal(now.toString('utf8'), canonical(asciiFixture()));
  });

  test('a wrong expectCount refuses the whole write: the file is untouched and nothing is left behind', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, settingsFixture());
    const old = fs.readFileSync(file);
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'replaceInStrings', path: ['autoMode'], from: DASH, to: '--', expectCount: 14 }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /expectCount is 14, but 15 occurrence\(s\) were found in 14 string\(s\)/);
    assert.ok(fs.readFileSync(file).equals(old));
    assert.deepEqual(ls(dir), ['settings.json']);
  });

  test('non-ASCII settings output is refused, naming each path and pointing at replaceInStrings', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const old = fs.readFileSync(file);
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['note'], value: `caf\u00e9 ${DASH} open` }, { op: 'set', path: ['k\u00e9y'], value: 1 }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /pure ASCII/);
    assert.match(r.error, /replaceInStrings/);
    assert.deepEqual(r.locations, [{ path: ['note'], in: 'value' }, { path: ['k\u00e9y'], in: 'key' }]);
    assert.ok(fs.readFileSync(file).equals(old));
  });

  test('a settings file that already holds non-ASCII refuses an unrelated patch until the text is folded', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, settingsFixture());
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.equal(r.locations.length, 14);
  });

  test('claude-json is exempt: non-ASCII the CLI writes there is kept and may be written', async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    const r = await write(dir, { target: 'claude-json', file, ops: [{ op: 'set', path: ['projects', '/home/someone/repo', 'note'], value: `ok ${DASH} done` }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    const want = claudeJsonFixture();
    const now = JSON.parse(fs.readFileSync(file, 'utf8'));
    want.primaryApiKey = now.primaryApiKey;
    want.projects['/home/someone/repo'].note = `ok ${DASH} done`;
    assert.equal(fs.readFileSync(file, 'utf8'), canonical(want, false));
  });
});

describe('damaged input is refused, naming each location', () => {
  // The live 10-16 damage (an em dash read as cp1252) and a 2-byte form.
  const MOJI3 = '\u00e2\u20ac\u201d';
  const MOJI2 = '\u00c3\u00a9';
  const damaged = () => {
    const d = asciiFixture();
    d.autoMode.environment[2] = `Rule 3 ${MOJI3} damaged`;
    d.permissions.allow.push(`Read(caf${MOJI2})`);
    return d;
  };

  test('a cp1252-damaged settings file is refused with each path, run and repair', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, damaged());
    const old = fs.readFileSync(file);
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /mojibake/);
    assert.match(r.error, /Repair is explicit/);
    assert.deepEqual(r.locations, [
      { path: ['permissions', 'allow', 2], in: 'value', index: 8, text: MOJI2, repaired: '\u00e9' },
      { path: ['autoMode', 'environment', 2], in: 'value', index: 7, text: MOJI3, repaired: DASH },
    ]);
    assert.ok(fs.readFileSync(file).equals(old));
    assert.deepEqual(ls(dir), ['settings.json']);
  });

  test('explicit replaceInStrings ops that repair every run are the one way such a file is written', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, damaged());
    const r = await write(dir, { target: 'settings', file, ops: [
      { op: 'replaceInStrings', path: [], from: MOJI3, to: '--', expectCount: 1 },
      { op: 'replaceInStrings', path: [], from: MOJI2, to: 'e', expectCount: 1 },
    ] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.ok(r.warnings.some((w) => /repaired 2 mojibake run/.test(w)), r.warnings.join('\n'));
    assert.equal(scanEncoding(fs.readFileSync(file)).counts.mojibake, 0);
  });

  test('claude-json mojibake is refused too, with paths but never the run itself (it is part of a value)', async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    const d = claudeJsonFixture();
    d.projects['D:/work/other repo'].note = `Status ${MOJI3} fine`;
    put(file, d, false);
    const r = await write(dir, { target: 'claude-json', file, ops: [{ op: 'set', path: ['numStartups'], value: 413 }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.deepEqual(r.locations, [{ path: ['projects', 'D:/work/other repo', 'note'], in: 'value', index: 7 }]);
  });

  // The PowerShell 5.1 round trip (read as cp1252, written back as UTF-8
  // with a BOM) leaves both a BOM and mojibake; a hand edit can leave a
  // 4-space layout and mojibake. A patch needs canonical input with no BOM,
  // so --reformat must go first and keep the runs for the patch to repair.
  test('a BOM or non-canonical file holding mojibake: --reformat keeps the run with a warning, then a replaceInStrings patch repairs it', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    const doc = asciiFixture();
    doc.autoMode.environment[2] = `Rule 3 ${MOJI3} damaged`;
    const fixed = asciiFixture();
    fixed.autoMode.environment[2] = 'Rule 3 -- damaged';
    const repair = [{ op: 'replaceInStrings', path: [], from: MOJI3, to: '--', expectCount: 1 }];
    for (const [shape, bytes] of [
      ['BOM', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(canonical(doc))])],
      ['4-space indent', Buffer.from(`${JSON.stringify(doc, null, 4)}\n`)],
    ]) {
      fs.writeFileSync(file, bytes);
      const early = await write(dir, { target: 'settings', file, ops: repair });
      assert.equal(early.exit, EXIT.REFUSED, `${shape}: the patch needs canonical input first`);
      const f = await write(dir, { target: 'settings', file, reformat: true });
      assert.equal(f.exit, EXIT.OK, `${shape}: ${f.error}`);
      assert.ok(f.warnings.some((w) => /^kept 1 mojibake run\(s\) at \["autoMode","environment",2\]; repair them with replaceInStrings next/.test(w)), f.warnings.join('\n'));
      assert.ok(!f.warnings.some((w) => /repaired/.test(w)), `${shape}: a reformat repairs nothing, so it must not say so`);
      assert.equal(fs.readFileSync(file, 'utf8'), canonical(doc), `${shape}: canonical, no BOM, the run kept`);
      assert.equal(scanEncoding(fs.readFileSync(file)).counts.mojibake, 1);
      const r = await write(dir, { target: 'settings', file, ops: repair });
      assert.equal(r.exit, EXIT.OK, `${shape}: ${r.error}`);
      assert.ok(r.warnings.some((w) => /^the patch repaired 1 mojibake run/.test(w)), r.warnings.join('\n'));
      assert.equal(fs.readFileSync(file, 'utf8'), canonical(fixed));
      const enc = scanEncoding(fs.readFileSync(file));
      assert.deepEqual([enc.bom, enc.counts.nonAscii, enc.counts.mojibake, enc.counts.invalidUtf8], [false, 0, 0, 0]);
    }
    assert.deepEqual(ls(dir).filter((f) => !f.startsWith('inverse-')), ['settings.json']);
  });

  test('a BOM is refused, naming offset 0; --reformat alone removes it', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    fs.writeFileSync(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(canonical(asciiFixture()))]));
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.deepEqual(r.locations, [{ offset: 0, problem: 'BOM' }]);
    const f = await write(dir, { target: 'settings', file, reformat: true });
    assert.equal(f.exit, EXIT.OK, f.error);
    assert.equal(fs.readFileSync(file, 'utf8'), canonical(asciiFixture()));
    assert.ok(f.warnings.some((w) => /no inverse/.test(w)));
  });

  test('invalid UTF-8 is refused with its byte offset, even for --reformat', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    const text = Buffer.from(canonical({ a: 'xy' }));
    text[9] = 0xff;
    fs.writeFileSync(file, text);
    for (const opts of [{ ops: [{ op: 'set', path: ['b'], value: 1 }] }, { reformat: true }]) {
      const r = await write(dir, { target: 'settings', file, ...opts });
      assert.equal(r.exit, EXIT.REFUSED);
      assert.deepEqual(r.locations, [{ offset: 9, problem: 'invalid UTF-8' }]);
    }
    assert.deepEqual(ls(dir), ['settings.json']);
  });

  test('a file that is not JSON, or not an object, is refused', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    fs.writeFileSync(file, '{"a": 1,,}\n');
    let r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['b'], value: 1 }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /not valid JSON/);
    fs.writeFileSync(file, '[]\n');
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['b'], value: 1 }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /not hold a JSON object/);
  });
});

describe('canonical input and --reformat', () => {
  test('non-canonical input (4-space indent, CRLF, a missing or extra newline form) is refused and left alone', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    const doc = asciiFixture();
    for (const text of [`${JSON.stringify(doc, null, 4)}\n`, canonical(doc).replace(/\n/g, '\r\n'), `${JSON.stringify(doc)}\n`, `${canonical(doc)}\n`]) {
      fs.writeFileSync(file, text);
      const r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
      assert.equal(r.exit, EXIT.REFUSED, JSON.stringify(text.slice(0, 20)));
      assert.match(r.error, /not in canonical form/);
      assert.equal(fs.readFileSync(file, 'utf8'), text);
    }
    assert.deepEqual(ls(dir), ['settings.json']);
  });

  test('--reformat canonicalizes alone, keeping the trailing-newline choice; with a patch it is refused', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    fs.writeFileSync(file, `${JSON.stringify(asciiFixture(), null, 4)}\n`);
    let r = await write(dir, { target: 'settings', file, reformat: true, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
    assert.equal(r.exit, EXIT.REFUSED);
    r = await write(dir, { target: 'settings', file, reformat: true });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(fs.readFileSync(file, 'utf8'), canonical(asciiFixture()));
    const cj = path.join(dir, '.claude.json');
    fs.writeFileSync(cj, JSON.stringify({ b: [1, 2], a: { c: true } }));
    r = await write(dir, { target: 'claude-json', file: cj, reformat: true });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(fs.readFileSync(cj, 'utf8'), canonical({ b: [1, 2], a: { c: true } }, false));
    // A canonical file reformats to itself: no change.
    r = await write(dir, { target: 'settings', file, reformat: true });
    assert.equal(r.noop, true);
  });
});

describe('the ops', () => {
  test('a failing test op refuses everything, even the ops before it', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const old = fs.readFileSync(file);
    const r = await write(dir, { target: 'settings', file, ops: [
      { op: 'set', path: ['model'], value: 'opus' },
      { op: 'test', path: ['permissions', 'defaultMode'], value: 'plan' },
      { op: 'set', path: ['x'], value: 1 },
    ] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /^op 2 \(test \["permissions","defaultMode"\]\): test failed: the value differs/);
    assert.ok(fs.readFileSync(file).equals(old));
    assert.deepEqual(ls(dir), ['settings.json']);
  });

  test('test absent and test sha256', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    let r = await write(dir, { target: 'settings', file, ops: [{ op: 'test', path: ['nope'], absent: true }, { op: 'test', path: ['model'], sha256: hashValue('opus[1m]') }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'test', path: ['model'], absent: true }] });
    assert.equal(r.exit, EXIT.REFUSED);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'test', path: ['model'], sha256: hashValue('opus') }] });
    assert.equal(r.exit, EXIT.REFUSED);
  });

  test('push unique skips a deep-equal duplicate as a no-op and appends a new value', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    let r = await write(dir, { target: 'settings', file, ops: [{ op: 'push', path: ['permissions', 'allow'], value: 'Read(//tmp/**)', unique: true }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(r.noop, true);
    assert.match(r.changes[0].note, /already present/);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'push', path: ['hooks', 'Stop'], value: { hooks: [{ type: 'command', command: 'x' }] }, unique: true }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).hooks.Stop.length, 2);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'push', path: ['model'], value: 'x' }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /not an array/);
  });

  test('set needs its parent unless create is true, which makes the missing objects', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    let r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['a', 'b', 'c'], value: 1 }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /the parent \["a"\] does not exist/);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['a', 'b', 'c'], value: 1, create: true }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.match(r.changes[0].note, /created \(with 2 new parent objects\)/);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).a, { b: { c: 1 } });
    // create never makes an array slot, and a scalar in the way refuses.
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model', 'x'], value: 1, create: true }] });
    assert.equal(r.exit, EXIT.REFUSED);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['permissions', 'allow', 9], value: 'x' }] });
    assert.equal(r.exit, EXIT.REFUSED);
    assert.match(r.error, /past the end/);
  });

  test('delete refuses a missing path unless ifExists, which makes it a no-op', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    let r = await write(dir, { target: 'settings', file, ops: [{ op: 'delete', path: ['nope'] }] });
    assert.equal(r.exit, EXIT.REFUSED);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'delete', path: ['nope'], ifExists: true }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(r.noop, true);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'delete', path: ['permissions', 'allow', 0] }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).permissions.allow, ['Read(//tmp/**)']);
  });

  test('replaceInStrings touches values, never keys, and needs its path', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, { 'k-x': 'v-x', list: ['a-x', 3, { 'n-x': 'm-x' }] });
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'replaceInStrings', path: [], from: '-x', to: '-y' }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { 'k-x': 'v-y', list: ['a-y', 3, { 'n-x': 'm-y' }] });
    // A replacement holding $& stays literal (split/join, never String.replace).
    const s = await write(dir, { target: 'settings', file, ops: [{ op: 'replaceInStrings', path: ['k-x'], from: 'v', to: '$&$1' }] });
    assert.equal(s.exit, EXIT.OK, s.error);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8'))['k-x'], '$&$1-y');
    const t = await write(dir, { target: 'settings', file, ops: [{ op: 'replaceInStrings', path: ['nope'], from: 'a', to: 'b' }] });
    assert.equal(t.exit, EXIT.REFUSED);
  });

  test('a "__proto__" key is an ordinary key: written as one, never the prototype', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, { a: 1 });
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['__proto__', 'polluted'], value: true, create: true }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal({}.polluted, undefined);
    assert.equal(fs.readFileSync(file, 'utf8'), '{\n  "a": 1,\n  "__proto__": {\n    "polluted": true\n  }\n}\n');
  });

  test('an op named like an Object built-in ("__proto__", "constructor", ...) or not a string is an unknown op: exit 2, never an internal error', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const old = fs.readFileSync(file);
    for (const name of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', ['set']]) {
      // Through JSON, as a patch file arrives.
      const ops = JSON.parse(JSON.stringify([{ op: name, path: ['model'], value: 'x' }]));
      const r = await write(dir, { target: 'settings', file, ops });
      assert.equal(r.exit, EXIT.REFUSED, `${JSON.stringify(name)}: ${r.error}`);
      assert.match(r.error, /^op 1: unknown op /);
    }
    assert.ok(fs.readFileSync(file).equals(old));
    assert.deepEqual(ls(dir), ['settings.json']);
  });

  test('an unknown op, an unknown field, a dotted-string path or an empty patch is refused before anything is read', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const bad = [
      [[{ op: 'move', path: ['a'] }], /unknown op "move"/],
      [[{ op: 'set', path: ['a'], value: 1, crate: true }], /unknown field "crate"/],
      [[{ op: 'set', path: 'statusLine.command', value: 1 }], /must be an array/],
      [[{ op: 'set', path: ['a', -1], value: 1 }], /non-negative integer/],
      [[{ op: 'test', path: ['a'], value: 1, absent: true }], /exactly one of/],
      [[{ op: 'replaceInStrings', path: [], from: '', to: 'x' }], /non-empty string/],
      [[{ op: 'set', path: [], value: [] }], /root must stay a JSON object/],
      [[], /no ops/],
    ];
    for (const [ops, re] of bad) {
      const r = await write(dir, { target: 'settings', file, ops });
      assert.equal(r.exit, EXIT.REFUSED, JSON.stringify(ops));
      assert.match(r.error, re);
    }
    const p = await write(dir, { target: 'settings', file, patch: { ops: [{ op: 'set', path: ['a'], value: 1 }], extra: 1 } });
    assert.equal(p.exit, EXIT.REFUSED);
    assert.match(p.error, /unknown field "extra"/);
  });
});

describe('preconditions', () => {
  // Exit 3, as the concurrent-change check is: the caller planned from
  // another version of the file, so it reads again and re-plans (deploy.mjs
  // and U4/U5/U7 read that from the exit code alone).
  test('--expect-sha differing is exit 3 (not the version the caller read: re-plan) and writes nothing, through the library and the CLI; a match writes', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const old = fs.readFileSync(file);
    const ops = [{ op: 'set', path: ['model'], value: 'opus' }];
    let r = await write(dir, { target: 'settings', file, ops, expectSha: '0'.repeat(64) });
    assert.equal(r.exit, EXIT.CONCURRENT, r.error);
    assert.match(r.error, /^--expect-sha does not match: the file is [0-9a-f]{64}, not the version the caller read; nothing was written\. Read it again and re-plan\.$/);
    assert.deepEqual([r.ok, r.written, r.after, r.inverse], [false, false, null, null]);
    assert.equal(r.before.length, 64, 'the sha it found, for the re-plan');
    const seen = r.before;
    assert.ok(fs.readFileSync(file).equals(old));
    assert.deepEqual(ls(dir), ['settings.json']);
    const patch = path.join(fresh(), 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops }));
    const c = cli(['--target', 'settings', '--file', file, '--patch', patch, '--expect-sha', 'F'.repeat(64), '--inverse-out', path.join(dir, 'inv.json')]);
    assert.equal(c.status, EXIT.CONCURRENT, c.stderr);
    assert.match(c.stderr, /^settings-write: exit 3: --expect-sha does not match/);
    assert.deepEqual(ls(dir), ['settings.json']);
    // A file that does not exist yet (--create) is not the version read either.
    const local = path.join(dir, 'settings.local.json');
    r = await write(dir, { target: 'settings', file: local, create: true, ops, expectSha: '0'.repeat(64) });
    assert.equal(r.exit, EXIT.CONCURRENT, r.error);
    assert.match(r.error, /the file is missing, not the version the caller read/);
    assert.ok(!fs.existsSync(local));
    // A match writes; the sha after one write binds the next.
    r = await write(dir, { target: 'settings', file, ops, expectSha: seen });
    assert.equal(r.exit, EXIT.OK, r.error);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'sonnet' }], expectSha: r.after });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).model, 'sonnet');
  });

  test('a missing settings file needs --create (it starts as {}); ~/.claude.json is never created', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.local.json');
    let r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
    assert.equal(r.exit, EXIT.REFUSED);
    r = await write(dir, { target: 'settings', file, create: true, ops: [{ op: 'set', path: ['permissions'], value: { allow: ['Read'] } }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(r.before, null);
    assert.equal(fs.readFileSync(file, 'utf8'), canonical({ permissions: { allow: ['Read'] } }));
    assert.ok(r.warnings.some((w) => /restores \{\}/.test(w)));
    const cj = await write(dir, { target: 'claude-json', file: path.join(dir, '.claude.json'), create: true, ops: [{ op: 'set', path: ['a'], value: 1 }] });
    assert.equal(cj.exit, EXIT.REFUSED);
    assert.ok(!fs.existsSync(path.join(dir, '.claude.json')));
  });

  // A settings write would skip the CLI's lock and print the file's values.
  // Each file here is ASCII and canonical, so without the refusal the write
  // would go through and print the old userID.
  test("--target settings refuses the CLI's own config: ~/.claude.json and the legacy .config.json (also missing, with --create, or through a linked home), a hard link, any .claude*.json", async (t) => {
    const dir = fresh();
    const cliConfig = path.join(home, '.claude.json');
    const legacy = path.join(home, '.claude', '.config.json');
    // Only this test's own files: the temp home may hold others' by now.
    t.after(() => {
      fs.rmSync(cliConfig, { force: true });
      fs.rmSync(legacy, { force: true });
    });
    const ops = [{ op: 'set', path: ['userID'], value: planted('u-') }];
    const refused = (r, file) => {
      assert.equal(r.exit, EXIT.REFUSED, `${file}: ${r.error}`);
      assert.match(r.error, /is the Claude Code CLI's own config file, not a settings file: --target claude-json writes it/);
      assert.equal(r.written, false);
    };
    // Missing: the path alone is enough, and nothing is created. (The legacy
    // .config.json is the case no name rule covers.)
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    for (const file of [cliConfig, legacy]) {
      refused(await write(dir, { target: 'settings', file, create: true, ops }), file);
      assert.ok(!fs.existsSync(file));
    }
    // Missing, and the CLI's home reached through a link (a junction on
    // Windows): compared by its folder's real path, it is the same file.
    const homeLink = path.join(dir, 'home-link');
    fs.symlinkSync(home, homeLink, 'junction');
    t.after(() => fs.unlinkSync(homeLink));
    const patch = path.join(dir, 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops }));
    const linked = cli(['--target', 'settings', '--create', '--file', legacy, '--patch', patch, '--inverse-out', path.join(dir, 'inv.json')], { HOME: homeLink, USERPROFILE: homeLink });
    assert.equal(linked.status, EXIT.REFUSED, linked.stderr);
    assert.match(linked.stderr, /CLI's own config file/);
    assert.ok(!fs.existsSync(legacy));
    const secret = planted('u-');
    const body = { numStartups: 1, userID: secret };
    put(cliConfig, body, false);
    const link = path.join(dir, 'settings.json');
    fs.linkSync(cliConfig, link);
    const named = path.join(dir, '.claude.json');
    const oauth = path.join(dir, '.claude-custom-oauth.json');
    for (const f of [legacy, named, oauth]) put(f, body, false);
    for (const file of [cliConfig, link, legacy, named, oauth]) {
      const held = fs.readFileSync(file);
      const r = await write(dir, { target: 'settings', file, ops });
      refused(r, file);
      assert.ok(!JSON.stringify(r).includes(secret), `${file}: a value reached the result`);
      assert.ok(fs.readFileSync(file).equals(held));
    }
    // Through the CLI, with the CLI's config moved by CLAUDE_CONFIG_DIR.
    const moved = fresh();
    const movedLegacy = path.join(moved, '.config.json');
    put(movedLegacy, body, false);
    const c = cli(['--target', 'settings', '--file', movedLegacy, '--patch', patch, '--inverse-out', path.join(dir, 'inv.json')], { CLAUDE_CONFIG_DIR: moved });
    assert.equal(c.status, EXIT.REFUSED, c.stderr);
    assert.match(c.stderr, /CLI's own config file/);
    assert.ok(!c.stdout.includes(secret) && !c.stderr.includes(secret));
    assert.equal(fs.readFileSync(movedLegacy, 'utf8'), canonical(body, false));
    assert.ok(!fs.existsSync(path.join(dir, 'inv.json')));
  });

  // The mirror. A claude-json write would skip the ASCII rule and the
  // settings encoding check, and take <file>.lock, not the .sw.lock every
  // settings writer takes. Each file here is canonical with no trailing
  // newline (the claude-json shape), so without the refusal the write would
  // go through, and its new value is non-ASCII, which the settings rule
  // refuses.
  test('--target claude-json refuses a settings file: any settings*.json, and ~/.claude/settings.json by identity (a hard link under another name); nothing is changed or locked', async (t) => {
    const dir = fresh();
    const homeSettings = path.join(home, '.claude', 'settings.json');
    fs.mkdirSync(path.dirname(homeSettings), { recursive: true });
    // Only this test's own file: the temp home may hold others' by now.
    t.after(() => fs.rmSync(homeSettings, { force: true }));
    const body = { model: 'opus' };
    put(homeSettings, body, false);
    const link = path.join(dir, 'cli-config.json');
    fs.linkSync(homeSettings, link);
    // Names distinct even on a case-blind file system.
    const named = ['settings.json', 'settings.local.json', 'Settings.Project.JSON', 'settings-backup.json'].map((n) => path.join(dir, n));
    for (const f of named) put(f, body, false);
    const ops = [{ op: 'set', path: ['model'], value: `opus ${DASH} the CLI's way` }];
    for (const file of [...named, link, homeSettings]) {
      const held = fs.readFileSync(file);
      const r = await write(dir, { target: 'claude-json', file, ops });
      assert.equal(r.exit, EXIT.REFUSED, `${file}: ${r.error}`);
      assert.match(r.error, /is a settings file, not the CLI's config: --target settings writes it, under its own lock and the ASCII rule$/);
      assert.equal(r.written, false);
      assert.ok(fs.readFileSync(file).equals(held), `${file} was changed`);
      assert.ok(!fs.existsSync(`${file}.lock`), `a lock dir was made beside ${file}`);
    }
    assert.deepEqual(ls(dir), [...named, link].map((f) => path.basename(f)).sort());
    // Through the CLI too.
    const patch = path.join(fresh(), 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops }));
    const c = cli(['--target', 'claude-json', '--file', named[1], '--patch', patch, '--inverse-out', path.join(dir, 'inv.json'), '--persist-delay-ms', '0']);
    assert.equal(c.status, EXIT.REFUSED, c.stderr);
    assert.match(c.stderr, /is a settings file, not the CLI's config/);
    assert.ok(!fs.existsSync(path.join(dir, 'inv.json')));
    // Neither the name nor the identity: written, non-ASCII and all.
    const other = path.join(fresh(), 'cli-config.json');
    put(other, body, false);
    const ok = await write(dir, { target: 'claude-json', file: other, ops });
    assert.equal(ok.exit, EXIT.OK, ok.error);
    assert.equal(JSON.parse(fs.readFileSync(other, 'utf8')).model, ops[0].value);
  });

  test('a dry run reports the change and its sha but writes nothing, no inverse', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const old = fs.readFileSync(file);
    const r = await write(dir, { target: 'settings', file, dryRun: true, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.deepEqual([r.dryRun, r.written, r.inverse], [true, false, null]);
    assert.equal(r.after.length, 64);
    assert.ok(fs.readFileSync(file).equals(old));
    assert.deepEqual(ls(dir), ['settings.json']);
  });
});

describe('concurrent writers', () => {
  test('a change between the read and the rename aborts the write (exit 3): theirs stands, no temp file, no inverse', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const theirs = canonical({ ...asciiFixture(), model: 'theirs' });
    const r = await write(dir, {
      target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'mine' }],
      seams: { beforeRename: (f) => fs.writeFileSync(f, theirs) },
    });
    assert.equal(r.exit, EXIT.CONCURRENT);
    assert.match(r.error, /changed while this write was being prepared/);
    assert.deepEqual([r.written, r.after, r.inverse], [false, null, null]);
    assert.equal(fs.readFileSync(file, 'utf8'), theirs);
    assert.deepEqual(ls(dir), ['settings.json']);
  });

  test('a file created by someone else while --create prepared is never clobbered (exit 3)', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.local.json');
    const r = await write(dir, {
      target: 'settings', file, create: true, ops: [{ op: 'set', path: ['a'], value: 1 }],
      seams: { beforeRename: (f) => fs.writeFileSync(f, '{}\n') },
    });
    assert.equal(r.exit, EXIT.CONCURRENT);
    assert.equal(fs.readFileSync(file, 'utf8'), '{}\n');
    assert.deepEqual(ls(dir), ['settings.local.json']);
  });

  test('even after the check, a new file is made by a hard link that fails on one created meanwhile (exit 3), never a clobbering rename', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.local.json');
    const r = await write(dir, {
      target: 'settings', file, create: true, ops: [{ op: 'set', path: ['a'], value: 1 }],
      seams: { afterCheck: (f) => fs.writeFileSync(f, '{"theirs": true}\n') },
    });
    assert.equal(r.exit, EXIT.CONCURRENT);
    assert.match(r.error, /created by another writer meanwhile/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{"theirs": true}\n');
    assert.deepEqual(ls(dir), ['settings.local.json']);
  });

  test('a writer that races in right after the rename fails the re-read (exit 4: written, then changed)', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const r = await write(dir, {
      target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'mine' }],
      seams: { afterRename: (f) => fs.writeFileSync(f, canonical({ model: 'raced' })) },
    });
    assert.equal(r.exit, EXIT.POSTCHECK);
    assert.equal(r.written, true);
    assert.ok(r.inverse && fs.existsSync(r.inverse), 'a written change keeps its inverse');
  });

  test('claude-json: a writer that drops our key 1.5 s later is reported as a clobber (exit 4); a clean one passes', async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    const stale = fs.readFileSync(file);
    const r = await write(dir, {
      target: 'claude-json', file, persistDelayMs: 20, ops: [{ op: 'set', path: ['projects', '/home/someone/repo', 'hasTrustDialogAccepted'], value: false }],
      // The CLI saving a config it read before our write: our change is gone.
      seams: { beforePersistCheck: (f) => fs.writeFileSync(f, stale) },
    });
    assert.equal(r.exit, EXIT.POSTCHECK);
    assert.match(r.error, /clobbered by another writer/);
    assert.deepEqual(r.clobbered, [['projects', '/home/someone/repo', 'hasTrustDialogAccepted']]);
    const ok = await write(dir, { target: 'claude-json', file, persistDelayMs: 20, ops: [{ op: 'set', path: ['numStartups'], value: 500 }] });
    assert.equal(ok.exit, EXIT.OK, ok.error);
    assert.equal(ok.persisted, true);
  });
});

describe('locks', () => {
  test("claude-json: a held <file>.lock directory (the CLI's own lock) makes the writer wait, then exit 5; the lock is never removed", async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    const old = fs.readFileSync(file);
    fs.mkdirSync(`${file}.lock`);
    const t0 = Date.now();
    const r = await write(dir, { target: 'claude-json', file, lockWaitMs: 400, ops: [{ op: 'set', path: ['numStartups'], value: 1 }] });
    assert.equal(r.exit, EXIT.LOCK);
    assert.match(r.error, /is held \(waited/);
    assert.ok(Date.now() - t0 >= 380, `gave up after ${Date.now() - t0} ms`);
    assert.ok(fs.statSync(`${file}.lock`).isDirectory(), 'a lock this writer did not make was removed');
    assert.ok(fs.readFileSync(file).equals(old));
    fs.rmdirSync(`${file}.lock`);
    assert.deepEqual(ls(dir), ['.claude.json']);
  });

  test('claude-json: a lock older than 30 s is reported as stale (exit 5) and left for the CLI to break', async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    fs.mkdirSync(`${file}.lock`);
    const old = new Date(Date.now() - 40_000);
    fs.utimesSync(`${file}.lock`, old, old);
    const t0 = Date.now();
    const r = await write(dir, { target: 'claude-json', file, lockWaitMs: 5_000, ops: [{ op: 'set', path: ['numStartups'], value: 1 }] });
    assert.equal(r.exit, EXIT.LOCK);
    assert.match(r.error, /is stale/);
    assert.ok(Date.now() - t0 < 2_000, 'a stale lock is reported at once, not waited out');
    assert.ok(fs.existsSync(`${file}.lock`));
  });

  test('claude-json: a lock released during the wait is taken, and ours is gone afterwards', async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    fs.mkdirSync(`${file}.lock`);
    setTimeout(() => fs.rmdirSync(`${file}.lock`), 150);
    const r = await write(dir, { target: 'claude-json', file, lockWaitMs: 5_000, ops: [{ op: 'set', path: ['numStartups'], value: 2 }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.deepEqual(ls(dir).filter((f) => !f.startsWith('inverse-')), ['.claude.json']);
  });

  // The CLI breaks a lock it sees untouched for 10 s and takes its own; if
  // that ever happened to ours mid-write, the dir at <file>.lock is theirs.
  test('claude-json: a lock dir replaced while we held it is not ours any more, and is left in place', async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    const lock = `${file}.lock`;
    // Empty, as proper-lockfile's dirs are, so a writer that skipped the
    // identity check would remove it.
    const r = await write(dir, {
      target: 'claude-json', file, ops: [{ op: 'set', path: ['numStartups'], value: 4 }],
      seams: { beforeRename: async () => { fs.rmdirSync(lock); await new Promise((res) => setTimeout(res, 20)); fs.mkdirSync(lock); } },
    });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.ok(fs.existsSync(lock) && fs.statSync(lock).isDirectory(), "another process's lock was removed");
    assert.ok(r.warnings.some((w) => /no longer the one this writer made/.test(w)), r.warnings.join('\n'));
    fs.rmdirSync(lock);
  });

  test("settings: our own <file>.sw.lock held by a live writer makes us wait, then exit 5, leaving theirs", async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    fs.writeFileSync(`${file}.sw.lock`, 'another-writer');
    const r = await write(dir, { target: 'settings', file, lockWaitMs: 300, ops: [{ op: 'set', path: ['model'], value: 'x' }] });
    assert.equal(r.exit, EXIT.LOCK);
    assert.equal(fs.readFileSync(`${file}.sw.lock`, 'utf8'), 'another-writer');
  });

  test("settings: a crashed writer's lock older than 60 s is broken and the write goes ahead, leaving no lock", async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    fs.writeFileSync(`${file}.sw.lock`, 'dead-writer');
    const old = new Date(Date.now() - 120_000);
    fs.utimesSync(`${file}.sw.lock`, old, old);
    const r = await write(dir, { target: 'settings', file, lockWaitMs: 3_000, ops: [{ op: 'set', path: ['model'], value: 'x' }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.deepEqual(ls(dir).filter((f) => !f.startsWith('inverse-')), ['settings.json']);
  });
});

describe('claude-json never shows a value; inverses roll back', () => {
  // A ~/.claude.json holding two planted secrets, and a patch that touches
  // the secret paths, run through the CLI so stdout and stderr are what a
  // terminal would show.
  function secretSetup() {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    const doc = claudeJsonFixture();
    const token = planted('ghp_');
    doc.oauthAccount.accessToken = token;
    put(file, doc, false);
    return { dir, file, doc, secrets: [doc.primaryApiKey, token] };
  }

  test('no value reaches stdout or stderr: not on success, not on a refusal, not in a failed test op', () => {
    const { dir, file, doc, secrets } = secretSetup();
    const patch = path.join(dir, 'patch.json');
    fs.writeFileSync(patch, JSON.stringify({ ops: [
      { op: 'delete', path: ['primaryApiKey'] },
      { op: 'set', path: ['oauthAccount', 'accessToken'], value: planted('xox') },
      { op: 'set', path: ['numStartups'], value: 999 },
    ] }));
    const r = cli(['--target', 'claude-json', '--file', file, '--patch', patch, '--inverse-out', path.join(dir, 'inv.json'), '--persist-delay-ms', '0']);
    assert.equal(r.status, 0, r.stderr);
    const newToken = JSON.parse(fs.readFileSync(file, 'utf8')).oauthAccount.accessToken;
    // Long random values only: a short one ('999') could turn up inside a
    // printed sha by chance.
    for (const s of [...secrets, newToken, 'someone@example.com']) {
      assert.ok(!r.stdout.includes(s) && !r.stderr.includes(s), `a value reached the output: ${s.slice(0, 6)}...`);
    }
    assert.deepEqual(r.json.changes.map((c) => c.old ?? c.new).map((d) => Object.keys(d).sort()), [['length', 'sha8', 'type'], ['length', 'sha8', 'type'], ['length', 'sha8', 'type']]);
    // A refusal that names the secret path: still no value.
    fs.writeFileSync(patch, JSON.stringify({ ops: [{ op: 'test', path: ['oauthAccount', 'accessToken'], value: 'wrong' }, { op: 'set', path: ['x'], value: 1 }] }));
    const held = fs.readFileSync(file);
    const f = cli(['--target', 'claude-json', '--file', file, '--patch', patch, '--inverse-out', path.join(dir, 'inv2.json')]);
    assert.equal(f.status, EXIT.REFUSED);
    assert.match(f.stderr, /test failed: the value differs/);
    assert.ok(!f.stdout.includes(newToken) && !f.stderr.includes(newToken));
    assert.ok(fs.readFileSync(file).equals(held));
    assert.equal(doc.oauthAccount.emailAddress, 'someone@example.com');
  });

  test('the inverse file never stores a secret: it is redacted, marked irreversible, and --apply-inverse refuses it whole', () => {
    const { dir, file, secrets } = secretSetup();
    const patch = path.join(dir, 'patch.json');
    fs.writeFileSync(patch, JSON.stringify({ ops: [{ op: 'delete', path: ['primaryApiKey'] }, { op: 'set', path: ['numStartups'], value: 7 }] }));
    const inv = path.join(dir, 'inv.json');
    const r = cli(['--target', 'claude-json', '--file', file, '--patch', patch, '--inverse-out', inv, '--persist-delay-ms', '0']);
    assert.equal(r.status, 0, r.stderr);
    const text = fs.readFileSync(inv, 'utf8');
    for (const s of secrets) assert.ok(!text.includes(s), 'a secret was stored in the inverse file');
    const restore = JSON.parse(text).ops.find((op) => op.op === 'set' && op.path[0] === 'primaryApiKey');
    assert.equal(restore.irreversible, true);
    assert.deepEqual(Object.keys(restore.value).sort(), ['redacted', 'sha256']);
    assert.equal(restore.value.sha256, hashValue(secrets[0]));
    const now = fs.readFileSync(file);
    const a = cli(['--target', 'claude-json', '--file', file, '--apply-inverse', inv, '--inverse-out', path.join(dir, 'inv2.json'), '--persist-delay-ms', '0']);
    assert.equal(a.status, EXIT.REFUSED);
    assert.match(a.stderr, /irreversible/);
    assert.match(a.stderr, /\["primaryApiKey"\]/);
    assert.ok(fs.readFileSync(file).equals(now), 'part of an irreversible inverse was applied');
  });

  test('a normal inverse round-trips ~/.claude.json back to its original bytes (key order, no trailing newline, non-ASCII)', async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    const orig = fs.readFileSync(file);
    const r = await write(dir, { target: 'claude-json', file, ops: [
      { op: 'set', path: ['projects', '/home/someone/repo', 'allowedTools'], value: ['Read', 'Edit'] },
      { op: 'delete', path: ['tipsHistory'] },
      { op: 'delete', path: ['installMethod'] },
      { op: 'set', path: ['newKey'], value: { nested: [1, 2] } },
      { op: 'push', path: ['projects', 'D:/work/other repo', 'allowedTools'], value: 'Bash' },
      { op: 'replaceInStrings', path: ['projects'], from: 'fine', to: 'good' },
    ] });
    assert.equal(r.exit, EXIT.OK, r.error);
    const back = await write(dir, { target: 'claude-json', file, applyInverse: r.inverse });
    assert.equal(back.exit, EXIT.OK, back.error);
    assert.ok(fs.readFileSync(file).equals(orig), 'the inverse did not restore the original bytes');
  });

  test('a settings inverse round-trips too, and refuses if a restored path changed since', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const orig = fs.readFileSync(file);
    const r = await write(dir, { target: 'settings', file, ops: [
      { op: 'delete', path: ['hooks', 'SessionStart'] },
      { op: 'set', path: ['env', 'DISABLE_AUTOUPDATER'], value: '1' },
      { op: 'set', path: ['model'], value: 'opus' },
    ] });
    assert.equal(r.exit, EXIT.OK, r.error);
    const inv = JSON.parse(fs.readFileSync(r.inverse, 'utf8'));
    // The new env value is tested by hash, never stored.
    assert.deepEqual(inv.ops.find((op) => op.path[1] === 'DISABLE_AUTOUPDATER' && op.op === 'test'), { op: 'test', path: ['env', 'DISABLE_AUTOUPDATER'], sha256: hashValue('1') });
    // Someone changes model after: the rollback refuses, all or nothing.
    const changed = JSON.parse(fs.readFileSync(file, 'utf8'));
    changed.model = 'someone-else';
    put(file, changed);
    const before = fs.readFileSync(file);
    const no = await write(dir, { target: 'settings', file, applyInverse: r.inverse });
    assert.equal(no.exit, EXIT.REFUSED);
    assert.match(no.error, /test failed/);
    assert.ok(fs.readFileSync(file).equals(before));
    changed.model = 'opus';
    put(file, changed);
    const yes = await write(dir, { target: 'settings', file, applyInverse: r.inverse });
    assert.equal(yes.exit, EXIT.OK, yes.error);
    assert.ok(fs.readFileSync(file).equals(orig));
  });

  test('an inverse file only applies to its own target and file, and only through --apply-inverse', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    const other = path.join(dir, 'settings.local.json');
    put(file, asciiFixture());
    put(other, asciiFixture());
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'set', path: ['model'], value: 'opus' }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    let x = await write(dir, { target: 'settings', file: other, applyInverse: r.inverse });
    assert.equal(x.exit, EXIT.REFUSED);
    assert.match(x.error, /undoes a write to/);
    // A file a claude-json target may name, so the inverse's own target
    // check refuses, not the settings-file rule.
    x = await write(dir, { target: 'claude-json', file: path.join(dir, '.claude.json'), applyInverse: r.inverse });
    assert.equal(x.exit, EXIT.REFUSED);
    assert.match(x.error, /undoes a settings write, not claude-json/);
    x = await write(dir, { target: 'settings', file, patch: JSON.parse(fs.readFileSync(r.inverse, 'utf8')) });
    assert.equal(x.exit, EXIT.REFUSED);
    assert.match(x.error, /use --apply-inverse/);
  });

  test('a secret-shaped object deleted whole (an env holding a token) is redacted as a whole', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.local.json');
    const token = planted('github_pat_');
    put(file, { env: { GH_TOKEN: token, PLAIN: 'x' }, model: 'opus' });
    const r = await write(dir, { target: 'settings', file, ops: [{ op: 'delete', path: ['env'] }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    const text = fs.readFileSync(r.inverse, 'utf8');
    assert.ok(!text.includes(token));
    assert.equal(JSON.parse(text).ops.find((op) => op.op === 'set').irreversible, true);
    assert.ok(!JSON.stringify(r).includes(token), 'the token reached the result');
  });
});

describe('secrets outside env: anywhere in a string, and by key name', () => {
  test('secretShaped finds a token mid-string at a token boundary, a Bearer token, a Basic credential, NAME=value and a URL password, and *_PASS, *_PWD and *HEADERS key names; not prose, variables or short values', () => {
    const bearer = `Bash(curl -H "Authorization: Bearer ${planted('t')}" https://example.com)`;
    // HTTP Basic auth: user:password in base64. planted() is always 35
    // characters, so "someone:" and it make 43 bytes ("==" padding), and two
    // more make 45 (none).
    const basic = (pass) => Buffer.from(`someone:${pass}`).toString('base64');
    // Each case is caught by one rule alone.
    const yes = [
      planted('sk-'), // a prefix starting the string, as before
      `node gate.mjs ${planted('ghp_')}`, // a prefix after a space
      `--auth=${planted('xox')}`, // a prefix after "=" ("auth" is no NAME= word)
      bearer, // a Bearer token with no known prefix
      `Bash(curl -H "Authorization: Basic ${basic(`${planted('pw-')}xy`)}" https://example.com)`, // a Basic credential, unpadded
      `curl -H 'authorization: basic ${basic(planted('pw-'))}' https://example.com`, // lower case, "==" padded
      `DEPLOY_TOKEN=${planted('v')} node gate.mjs`, // NAME=value, no known prefix
      `curl "https://api.example.com/v1?api_key=${planted('v')}"`, // lower case, in a query
      `psql postgres://someone:${planted('pw-')}@db.example.com/app`, // URL credentials
    ];
    const no = [
      'Bash(npm run task-runner-for-all-packages)', // "sk-" inside a word is no prefix
      'Never print sk- or ghp_ keys', // prose naming a prefix: no token follows
      'Bash(curl -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" https://example.com)', // a variable
      'GITHUB_TOKEN=$GITHUB_TOKEN_FROM_THE_VAULT node gate.mjs', // a reference, not a value
      'MAX_TOKENS=4096 node gate.mjs', // too short to be a secret
      'Authorization: Bearer short',
      'https://example.com/a:b@c', // a colon and an @ in a path, not before the host
      'Basic usage: run the gate before every push', // prose: no token after "Basic"
      'Use HTTP Basic authentication only over TLS', // prose: a 14-letter word is no token
      'Bash(curl -H "Authorization: Basic $BASIC_CREDENTIALS" https://example.com)', // a variable
      `Authorization: Basic ${Buffer.from('a:b').toString('base64')}`, // too short to be a secret
      'node build.mjs --profile=noBasic productionBuildSettings', // "Basic" ends a word, not starts one
    ];
    for (const s of yes) assert.equal(secretShaped(['x'], s), true, s.slice(0, 24));
    for (const s of no) assert.equal(secretShaped(['x'], s), false, s);
    // Deep: an allow list holding one such rule is secret as a whole.
    assert.equal(secretShaped(['permissions', 'allow'], ['Bash(npm test)', bearer]), true);
    assert.equal(secretShaped(['permissions', 'allow'], ['Bash(npm test)', no[0]]), false);
    for (const k of ['DB_PASS', 'SMTP_PWD', 'OTEL_EXPORTER_OTLP_HEADERS', 'headers']) assert.equal(secretShaped(['env', k], 'x'), true, k);
    // PWD is the working directory; BYPASS holds no secret word.
    for (const k of ['PWD', 'BYPASS', 'HEADER_STYLE']) assert.equal(secretShaped(['env', k], 'x'), false, k);
    assert.equal(secretShaped(['mcpServers', 'x'], { url: 'https://example.com', headers: { a: 'b' } }), true);
  });

  test('a token inside a permission rule or a hook command is never printed (changes, --diff) nor stored (the inverse)', () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.local.json');
    const bearer = planted('t');
    const assigned = planted('v');
    const mid = planted('ghp_');
    const doc = asciiFixture();
    doc.permissions.allow.push(`Bash(curl -H "Authorization: Bearer ${bearer}" https://example.com/api)`);
    doc.hooks.Stop[0].hooks.push({ type: 'command', command: `DEPLOY_TOKEN=${assigned} node gate.mjs` }, { type: 'command', command: `node gate.mjs --with ${mid}` });
    put(file, doc);
    const patch = path.join(dir, 'p.json');
    // Each op changes the line next to a secret one, so that line is in the
    // diff as a removed and an added line (its trailing comma moves).
    fs.writeFileSync(patch, JSON.stringify({ ops: [
      { op: 'push', path: ['permissions', 'allow'], value: 'Bash(npm test)' },
      { op: 'set', path: ['hooks', 'Stop', 0, 'hooks', 1, 'timeout'], value: 5 },
      { op: 'set', path: ['hooks', 'Stop', 0, 'hooks', 2, 'timeout'], value: 5 },
    ] }));
    const inv = path.join(dir, 'inv.json');
    const r = cli(['--target', 'settings', '--file', file, '--patch', patch, '--diff', '--inverse-out', inv]);
    assert.equal(r.status, 0, r.stderr);
    const stored = fs.readFileSync(inv, 'utf8');
    for (const s of [bearer, assigned, mid]) {
      assert.ok(!r.stdout.includes(s) && !r.stderr.includes(s), `a token reached the output: ${s.slice(0, 6)}...`);
      assert.ok(!stored.includes(s), `a token was stored in the inverse: ${s.slice(0, 6)}...`);
    }
    const d = r.json.diff;
    assert.match(d, /^~ \["permissions","allow",2\] unchanged$/m);
    assert.match(d, /^~ \["hooks","Stop",0,"hooks",1,"command"\] unchanged$/m);
    assert.match(d, /^~ \["hooks","Stop",0,"hooks",2,"command"\] unchanged$/m);
    assert.match(d, /^\+ {6}"Bash\(npm test\)"$/m);
    assert.match(d, /^\+ {12}"timeout": 5$/m);
    // An array is one value: each list's restore is redacted, irreversible.
    const ops = JSON.parse(stored).ops;
    for (const p of [['permissions', 'allow'], ['hooks', 'Stop']]) {
      const op = ops.find((o) => o.op === 'set' && JSON.stringify(o.path) === JSON.stringify(p));
      assert.equal(op?.irreversible, true, JSON.stringify(p));
      assert.deepEqual(Object.keys(op.value).sort(), ['redacted', 'sha256']);
    }
    assert.ok(r.json.warnings.some((w) => /^2 inverse op\(s\) are irreversible/.test(w)), r.json.warnings.join('\n'));
  });

  test('env keys named *_PASS, *_PWD or *HEADERS hold secrets: a delete stores none of their values, each restore irreversible', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.local.json');
    const secret = { DB_PASS: planted('v'), SMTP_PWD: planted('v'), OTEL_EXPORTER_OTLP_HEADERS: planted('v') };
    put(file, { env: { ...secret, PLAIN_FLAG: 'on' }, model: 'opus' });
    const r = await write(dir, { target: 'settings', file, ops: [...Object.keys(secret), 'PLAIN_FLAG'].map((k) => ({ op: 'delete', path: ['env', k] })) });
    assert.equal(r.exit, EXIT.OK, r.error);
    const text = fs.readFileSync(r.inverse, 'utf8');
    const ops = JSON.parse(text).ops;
    for (const [k, v] of Object.entries(secret)) {
      assert.ok(!text.includes(v), `${k}'s value was stored in the inverse`);
      assert.equal(ops.find((o) => o.op === 'set' && o.path[1] === k)?.irreversible, true, k);
      assert.ok(!JSON.stringify(r).includes(v), `${k}'s value reached the result`);
    }
    // A plain env value is still stored, or a rollback could not restore it.
    const plain = ops.find((o) => o.op === 'set' && o.path[1] === 'PLAIN_FLAG');
    assert.deepEqual([plain.value, plain.irreversible], ['on', undefined]);
  });

  // F21: secretShaped decides these, not the env rule or the claude-json
  // target. A set of a new key reads "added", a delete "removed", an
  // overwrite "changed"; the label is the path as JSON.
  test('--diff and the changes hide secret-shaped settings values outside env: an apiKeyHelper overwritten, a hook command starting sk-, a URL with a password added then removed', () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    const oldKey = planted('sk-');
    const doc = asciiFixture();
    doc.apiKeyHelper = oldKey;
    put(file, doc);
    const newKey = planted('sk-');
    const hookKey = planted('sk-');
    const url = `https://someone:${planted('pw-')}@proxy.example.com:8080`;
    const patch = path.join(dir, 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops: [
      { op: 'set', path: ['apiKeyHelper'], value: newKey },
      { op: 'set', path: ['hooks', 'Stop', 0, 'hooks', 0, 'command'], value: hookKey },
      { op: 'set', path: ['proxyUrl'], value: url },
    ] }));
    const r = cli(['--target', 'settings', '--file', file, '--patch', patch, '--diff', '--inverse-out', path.join(dir, 'inv1.json')]);
    assert.equal(r.status, 0, r.stderr);
    for (const s of [oldKey, newKey, hookKey, url]) assert.ok(!r.stdout.includes(s) && !r.stderr.includes(s), `a value reached the output: ${s.slice(0, 8)}...`);
    const masked = (v) => ({ type: 'string', length: v.length, sha8: hashValue(v).slice(0, 8) });
    const [key, hook, proxy] = r.json.changes;
    assert.deepEqual([key.old, key.new], [masked(oldKey), masked(newKey)]);
    // The old command was not secret, so it shows; the new one does not.
    assert.deepEqual([hook.old, hook.new], ['~/.claude/hooks/stop-distill-gate.sh', masked(hookKey)]);
    assert.deepEqual(proxy.new, masked(url));
    const d = r.json.diff;
    assert.match(d, /^~ \["apiKeyHelper"\] changed$/m);
    assert.match(d, /^- {12}"command": "~\/\.claude\/hooks\/stop-distill-gate\.sh",$/m);
    assert.match(d, /^~ \["hooks","Stop",0,"hooks",0,"command"\] changed$/m);
    assert.match(d, /^~ \["proxyUrl"\] added$/m);
    fs.writeFileSync(patch, JSON.stringify({ ops: [{ op: 'delete', path: ['proxyUrl'] }] }));
    const del = cli(['--target', 'settings', '--file', file, '--patch', patch, '--diff', '--inverse-out', path.join(dir, 'inv2.json')]);
    assert.equal(del.status, 0, del.stderr);
    for (const s of [newKey, hookKey, url]) assert.ok(!del.stdout.includes(s) && !del.stderr.includes(s), `a value reached the output: ${s.slice(0, 8)}...`);
    assert.deepEqual(del.json.changes[0].old, masked(url));
    assert.match(del.json.diff, /^~ \["proxyUrl"\] removed$/m);
    assert.match(del.json.diff, /^~ \["apiKeyHelper"\] unchanged$/m);
  });

  // Round 2: short passwords and flag-form secrets. Every rule is narrow on
  // purpose: a false match makes each later undo of that list irreversible,
  // so the no-cases matter as much as the yes-cases. Values are random hex,
  // which no other rule reads as a secret (no known prefix, no "Bearer"),
  // so each yes-case is caught by the one rule named beside it.
  test('secretShaped finds short password assignments, --password values, key and token flags, X-Api-Key style headers, an args item after a secret flag, and a key whose own text is a secret; not BYPASS=, PWD=, --author=, paths, variables or prose', () => {
    const hex = (n) => randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
    const yes = [
      `Bash(PGPASSWORD=${hex(10)} psql -U app)`, // a name holding PASSW, a 10-character value
      `DB_PASS=${hex(8)} node migrate.mjs`, // a name ending in _PASS
      `MYSQL_PWD=${hex(8)} mysql -u app`, // a name ending in _PWD
      `mysqldump --pass ${hex(5)} app`, // --pass and a space, 5 characters
      `psql --password ${hex(6)} -h db`, // --password and a space
      `smbclient --passwd=${hex(5)} //server/share`, // --passwd and =, under the name rule's 6
      `Bash(az storage blob list --account-key ${hex(88)})`, // a key flag and a space, ending at )
      `node admin.mjs --admin-password ${hex(20)}`, // a password flag the --password rule doesn't name
      `node mcp.mjs --client-secret-value=${hex(40)}`, // a secret flag and =, where NAME= needs the word right before =
      `curl -H "X-Api-Key: ${hex(32)}" https://api.example.com`, // a key header
      `curl -H 'X-Auth-Token:${hex(40)}' https://api.example.com`, // a token header, no space
    ];
    const no = [
      'Bash(BYPASS=true npm test)', // BYPASS holds PASS but is no password
      'CACHE_BYPASS=enabled node gate.mjs', // whatever its value
      'BYPASS_PERMISSIONS=always node gate.mjs',
      'PWD=/c/x node gate.mjs', // the working directory
      'PWD=/c/work/projects OLDPWD=/c/work/other node gate.mjs', // long enough to be one, but no _PWD
      'DB_PASS_FILE=/run/secrets/db_password node gate.mjs', // _PASS must end the name
      'GIT_AUTHOR_DATE=2026-10-22T10:00:00Z git commit --amend',
      'git commit --author="Some One <someone@example.com>"',
      'git log --author=someone-with-a-long-name', // "auth" is no flag word in a string
      'Bash(rg "token" projects/hooks/statusline.py)', // a word, not a flag or a header
      'Bash(rg "token" projects/hooks/tests)', // a word and a dotless path: a header needs its colon
      'Bash(monkeytype-cli generate-x)', // "key" inside a word that is no dash flag
      'Bash(git-secret-tool reveal-all-the-files)', // "-secret-" inside a word: a flag starts after a space, quote or (
      'node gate.mjs --cache-key build-cache-v2', // a key flag's value under 16 characters
      'X-Cache-Key: build-cache-v2', // a header's value under 16 characters
      'psql --password $PGPASSWORD_FROM_THE_VAULT', // a variable
      'psql --password --host db.example.com', // the next flag, not a value
      'psql --password-file ~/.pgpass-app', // another flag, then a path
      'mysqldump --pass abcd app', // under the 5-character floor
      'DB_PASS=short node gate.mjs', // under the 6-character floor
      'node mcp.mjs --api-key $CONTEXT7_API_KEY', // a variable
      'node mcp.mjs --api-key --verbose-logging-enabled-x', // the next flag, not a value
      'gpg --key-file keys/release-signing-2026.pem', // a path: it holds a dot
      'az login --tenant-key D:/keys/tenant-main-2026', // a path: it holds a colon
      'curl -H "X-Api-Key: $API_KEY" https://api.example.com', // a variable
      'Never paste a key, token or password into a rule: pass it as --api-key $VAR', // prose of the autoMode kind
      'Prefer short-lived tokens; rotate deploy keys weekly',
      'token: see the vault entry for the deploy account',
      'Bash(npm run build -- --max-old-space-size=4096)',
    ];
    for (const s of yes) assert.equal(secretShaped(['x'], s), true, s.replace(/[0-9a-f]{5,}/g, '<hex>'));
    for (const s of no) assert.equal(secretShaped(['x'], s), false, s);
    // An argument list: the item after a flag naming a key, token, secret,
    // password or auth is that flag's value. Not a variable the CLI fills
    // in, not the next flag, not an empty item, not after another flag.
    const key = hex(32);
    for (const flag of ['--api-key', '--token', '-client-secret', '--db-password', '--auth']) {
      assert.equal(secretShaped(['mcpServers', 'x'], { command: 'npx', args: ['-y', 'some-mcp', flag, key] }), true, flag);
    }
    // The flag is the whole item: a rule of prose that names a flag is not
    // one, so the rule after it stays plain (an autoMode list).
    for (const args of [['--api-key', '${CONTEXT7_API_KEY}'], ['--api-key', '--verbose'], ['--api-key', ''], ['--verbose', key], ['some-mcp', key], ['Never pass --api-key inline', 'Rotate deploy keys weekly']]) {
      assert.equal(secretShaped(['mcpServers', 'x', 'args'], args), false, JSON.stringify(args.map((a) => (a === key ? '<hex>' : a))));
    }
    // A key whose own text is a secret: on the path, or nested in the value.
    const urlKey = `https://someone:${planted('pw-')}@git.example.com/market.git`;
    assert.equal(secretShaped(['extraKnownMarketplaces', urlKey], true), true);
    assert.equal(secretShaped(['aliases'], { [planted('sk-')]: 'on' }), true);
    assert.equal(secretShaped(['extraKnownMarketplaces', 'https://git.example.com/market.git'], true), false);
  });

  // Round 3: a JWT, an Azure SAS signature and a value right before an
  // allow rule's :* suffix all passed round 2's rules, and "always allow"
  // writes the exact command, token and all, into permissions.allow. The
  // JWT is built here from a made-up header and payload and a random hex
  // signature: no real token. Hex holds no known prefix, so each yes-case
  // is caught by the one rule named beside it.
  test("secretShaped finds a JWT after --token or in an apikey: header, an Azure SAS signature, and a flag or header value right before an allow rule's :* suffix; not a one-dot eyJ file name, prose, a $variable sig, a short value or a drive path before :*", () => {
    const hex = (n) => randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
    const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const jwt = [b64url({ alg: 'HS256', typ: 'JWT' }), b64url({ sub: 'someone', iat: 1767225600 }), hex(43)].join('.');
    const yes = [
      `cli --token ${jwt}`, // the JWT rule: the flag rule stops at its first dot
      `Bash(curl -H "apikey: ${jwt}" https://db.example.com/rest/v1/items)`, // the JWT rule: so does the header rule
      `azcopy copy "https://acct.blob.core.windows.net/c/f?sv=2022-11-02&se=2026-12-31T00%3A00%3A00Z&sr=b&sp=r&sig=${hex(20)}%2B${hex(20)}%3D" ./f`, // the SAS rule
      `Bash(cli --token ${hex(20)}:*)`, // the flag rule, its value ending at the :* suffix
      `Bash(curl -H X-Api-Key:${hex(32)}:*)`, // the header rule, its value ending at the :* suffix
    ];
    const no = [
      'Bash(cat eyJ-header-only.json-backup-copy)', // one dot: a JWT has two
      'Bash(node decode.mjs eyJ-header-only.v2.json)', // two dots, but 2 characters between them
      'Bash(node build.mjs eyJa.translations-de.json)', // two dots, but 1 character before the first
      'Decode the eyJ... part with base64url first', // prose
      'curl "https://acct.blob.core.windows.net/c/f?sv=2022-11-02&sig=$SAS_SIG"', // a variable
      'curl "https://cdn.example.com/logo.png?w=64&sig=v2"', // a short value: no signature
      'node verify.mjs --expected-sig=ab12cd34ef56ab12cd34', // a signature to compare, not in a URL query
      'Bash(node cache.mjs --cache-key build-v2:*)', // a key flag's value under 16 characters, then :*
      'Bash(az login --tenant-key D:/keys/tenant-main-2026:*)', // a drive path: one letter before its colon
    ];
    for (const s of yes) assert.equal(secretShaped(['x'], s), true, s.replace(/[0-9a-f]{5,}/g, '<hex>'));
    for (const s of no) assert.equal(secretShaped(['x'], s), false, s);
  });

  // A name part is bounded so a scan stays linear: round 2 left KEY's
  // unbounded (\w*), and bounded PASSW's at 40, which missed a long name
  // round 1's \w* caught. Both reach 64 characters now; 65 is past the
  // bound. The timing half: secretShaped runs every rule over 200 KB
  // strings shaped against each one, none holding a secret. Each took 1 to
  // 10 ms when measured; round 2's KEY rule took 3.9 s on the KEY run, and
  // a JWT rule starting at a plain word boundary 2.4 s at half the size.
  test('a NAME= rule reads up to 64 name characters after PASSW or KEY (65 is past the bound), and no 200 KB string makes any rule backtrack for long', () => {
    const hex = (n) => randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
    const FILL = '_OF_THE_STANDBY_REPLICA_IN_THE_SECOND_REGION_FOR_NIGHTLY_BACKUPS_AND_RESTORE_DRILLS';
    // A name with exactly n characters between its PASSW or KEY and the =.
    const password = (n) => `PGPASSWORD${FILL.slice(0, n - 3)}`;
    const key = (n) => `DEPLOY_KEY${FILL.slice(0, n)}`;
    for (const n of [41, 64, 65]) {
      assert.deepEqual([password(n).split('PASSW')[1].length, key(n).split('KEY')[1].length], [n, n]);
      assert.equal(secretShaped(['x'], `Bash(${password(n)}=${hex(10)} psql -U app)`), n <= 64, `PASSW and ${n} more`);
      assert.equal(secretShaped(['x'], `${key(n)}=${hex(16)} node gate.mjs`), n <= 64, `KEY and ${n} more`);
    }
    const N = 200_000;
    const fill = (unit) => unit.repeat(Math.ceil(N / unit.length)).slice(0, N);
    for (const s of [fill('eyJ-'), `eyJ${'a'.repeat(10)}.${fill('eyJ-')}`, fill('KEY'), fill('PASSW'), fill(' --key-'), fill('key: '), `key: ${fill('a')}.`, fill('Bearer '), `://${fill('a:')}`, fill('?sig=')]) {
      const t0 = performance.now();
      assert.equal(secretShaped(['x'], s), false, s.slice(0, 12));
      const ms = performance.now() - t0;
      assert.ok(ms < 1_500, `${JSON.stringify(s.slice(0, 12))}...: ${Math.round(ms)} ms`);
    }
  });

  // Round 1 judged a --diff line by its value alone, so a line whose KEY
  // held the secret printed whole (before that, a line-text test hid it but
  // its label printed the key). None of these keys is named like a secret
  // (key, token, ...), so only the key's own text can hide them.
  test('--diff never prints a key whose own text holds a secret: not on a context line, an opening line or in a label', () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    const urlKey = `https://someone:${planted('pw-')}@git.example.com/market.git`;
    const skKey = planted('sk-');
    const serverKey = `https://someone:${planted('pw-')}@mcp.example.com`;
    const envKey = planted('sk-');
    const doc = asciiFixture();
    // An env line's label names its key (env.<KEY>): not this one.
    doc.env[envKey] = '1';
    doc.extraKnownMarketplaces = { [urlKey]: true, plain: 'x' };
    doc.aliases = { [skKey]: 'on', other: 1 };
    // After the change, so its opening line and its value line are context.
    doc.servers = { local: { enabled: false }, [serverKey]: { enabled: true } };
    put(file, doc);
    const patch = path.join(dir, 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops: [
      { op: 'set', path: ['env', 'EXAMPLE_FLAG'], value: 'off' },
      { op: 'set', path: ['extraKnownMarketplaces', 'plain'], value: 'y' },
      { op: 'set', path: ['aliases', 'other'], value: 2 },
      { op: 'set', path: ['servers', 'local', 'enabled'], value: true },
    ] }));
    const r = cli(['--target', 'settings', '--file', file, '--patch', patch, '--diff', '--inverse-out', path.join(dir, 'inv.json')]);
    assert.equal(r.status, 0, r.stderr);
    const stored = fs.readFileSync(path.join(dir, 'inv.json'), 'utf8');
    for (const k of [urlKey, skKey, serverKey, envKey]) {
      const secret = k.match(/(?:pw-|sk-)planted-[0-9a-f]+/)[0];
      assert.ok(!r.stdout.includes(secret) && !r.stderr.includes(secret), `a key's secret reached the output: ${secret.slice(0, 10)}...`);
      assert.ok(!stored.includes(secret), 'a key the patch never named was stored in the inverse');
    }
    const label = (k) => `<secret-shaped key ${hashValue(k).slice(0, 8)}>`;
    const d = r.json.diff;
    const lines = d.split('\n');
    for (const want of [
      '~ env.EXAMPLE_FLAG changed',
      `~ env.${label(envKey)}`, // an env context line
      `~ ["extraKnownMarketplaces",${label(urlKey)}]`, // a context value line
      `~ ["aliases",${label(skKey)}]`,
      `~ ["servers",${label(serverKey)}]`, // a context opening line
      `~ ["servers",${label(serverKey)},"enabled"]`, // a value line under that key
    ]) assert.ok(lines.includes(want), `missing ${want} in\n${d}`);
    assert.match(d, /^\+ {4}"plain": "y"$/m);
    assert.match(d, /^\+ {6}"enabled": true$/m);
  });

  // The pair rule, wired into every output: the item alone is not
  // secret-shaped, so the changes list and --diff must see its neighbor.
  test('an args item right after a secret flag (["--api-key", v]) is masked in the changes and --diff and never stored in the inverse, whichever op touches it', async () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.local.json');
    const hex = () => randomBytes(16).toString('hex');
    const [k1, k2, k3] = [hex(), hex(), hex()];
    const masked = (v) => ({ type: 'string', length: v.length, sha8: hashValue(v).slice(0, 8) });
    const args = ['tools', 'local', 'args'];
    put(file, { tools: { local: { command: 'node', args: ['server.mjs', '--api-key', k1] } }, model: 'opus' });
    const quiet = (res, ...keys) => {
      assert.equal(res.exit, EXIT.OK, res.error);
      const stored = res.inverse ? fs.readFileSync(res.inverse, 'utf8') : '';
      for (const k of keys) {
        assert.ok(!JSON.stringify(res).includes(k), 'a key reached the result');
        assert.ok(!stored.includes(k), 'a key was stored in the inverse');
      }
    };
    // A push after the key gives its line a comma: a -/+ pair in the diff.
    let r = await write(dir, { target: 'settings', file, diff: true, ops: [{ op: 'push', path: args, value: '--verbose' }] });
    quiet(r, k1);
    assert.match(r.diff, /^~ \["tools","local","args",2\] unchanged$/m);
    assert.match(r.diff, /^\+ {8}"--verbose"$/m);
    assert.equal(r.changes[0].new, '--verbose', 'an item after the key, not after a flag, shows');
    const restore = JSON.parse(fs.readFileSync(r.inverse, 'utf8')).ops.find((op) => op.op === 'set' && JSON.stringify(op.path) === JSON.stringify(args));
    assert.equal(restore?.irreversible, true);
    // set and delete of the key itself.
    r = await write(dir, { target: 'settings', file, diff: true, ops: [{ op: 'set', path: [...args, 2], value: k2 }] });
    quiet(r, k1, k2);
    assert.deepEqual([r.changes[0].old, r.changes[0].new], [masked(k1), masked(k2)]);
    assert.match(r.diff, /^~ \["tools","local","args",2\] changed$/m);
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'delete', path: [...args, 2] }] });
    quiet(r, k2);
    assert.deepEqual(r.changes[0].old, masked(k2));
    // A flag after the flag is no value: it shows. Then a key pushed right
    // after the flag is masked.
    r = await write(dir, { target: 'settings', file, ops: [{ op: 'delete', path: [...args, 2] }] });
    quiet(r);
    assert.equal(r.changes[0].old, '--verbose');
    r = await write(dir, { target: 'settings', file, diff: true, ops: [{ op: 'push', path: args, value: k3 }] });
    quiet(r, k3);
    assert.deepEqual(r.changes[0].new, masked(k3));
    assert.match(r.diff, /^~ \["tools","local","args",2\] added$/m);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).tools.local.args, ['server.mjs', '--api-key', k3]);
  });
});

describe('the CLI', () => {
  test('--diff shows changed settings lines and hides every env value', () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const value = planted('val-');
    const patch = path.join(dir, 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops: [{ op: 'set', path: ['env', 'NEW_FLAG'], value }, { op: 'set', path: ['env', 'EXAMPLE_FLAG'], value: 'off' }, { op: 'set', path: ['model'], value: 'opus' }] }));
    const r = cli(['--target', 'settings', '--file', file, '--patch', patch, '--diff', '--dry-run']);
    assert.equal(r.status, 0, r.stderr);
    const d = r.json.diff;
    assert.match(d, /^--- a\/settings\.json\n\+\+\+ b\/settings\.json\n@@ /);
    assert.match(d, /^~ env\.EXAMPLE_FLAG changed$/m);
    assert.match(d, /^~ env\.NEW_FLAG added$/m);
    assert.match(d, /^~ env\.DISABLE_TELEMETRY$/m);
    assert.match(d, /^- {2}"model": "opus\[1m\]",$/m);
    assert.match(d, /^\+ {2}"model": "opus",$/m);
    assert.ok(!r.stdout.includes(value) && !r.stdout.includes('"off"') && !r.stdout.includes('"on"'), 'an env value reached stdout');
    assert.deepEqual(r.json.changes[0].new, { type: 'string', length: value.length, sha8: hashValue(value).slice(0, 8) });
  });

  test('bad arguments exit 2 with the reason on stderr; --help exits 0', () => {
    const dir = fresh();
    const file = path.join(dir, 'settings.json');
    put(file, asciiFixture());
    const patch = path.join(dir, 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops: [{ op: 'set', path: ['a'], value: 1 }] }));
    for (const [args, re] of [
      [['--bogus'], /unknown argument --bogus/],
      // Own keys only: these must not find Object's machinery.
      [['constructor', '--target', 'settings', '--file', file, '--patch', patch], /unknown argument constructor/],
      [['__proto__', '--target', 'settings', '--file', file, '--patch', patch], /unknown argument __proto__/],
      [['--target', 'settings', '--file', file], /exactly one of/],
      [['--target', 'nope', '--file', file, '--patch', patch], /--target must be one of/],
      [['--target', 'settings', '--file', file, '--patch', patch, '--reformat'], /exactly one of/],
      [['--target', 'claude-json', '--file', file, '--patch', patch, '--diff'], /would print its values/],
      [['--target', 'settings', '--file', file, '--patch', path.join(dir, 'missing.json')], /cannot read the patch file/],
      [['--target', 'settings', '--file', file, '--patch', patch, '--expect-sha', 'abc'], /64 hex/],
    ]) {
      const r = cli(args);
      assert.equal(r.status, EXIT.REFUSED, `${args.join(' ')}: ${r.stderr}`);
      assert.match(r.stderr, re);
      assert.equal(r.json?.exit, EXIT.REFUSED);
    }
    const h = cli(['--help']);
    assert.equal(h.status, 0);
    assert.match(h.stdout, /^usage: node settings-write\.mjs/);
  });

  test('without --file, a CLAUDE_CONFIG_DIR in the environment refuses the default path rather than guess', () => {
    const dir = fresh();
    const patch = path.join(dir, 'p.json');
    fs.writeFileSync(patch, JSON.stringify({ ops: [{ op: 'set', path: ['a'], value: 1 }] }));
    const r = cli(['--target', 'settings', '--patch', patch], { CLAUDE_CONFIG_DIR: dir });
    assert.equal(r.status, EXIT.REFUSED);
    assert.match(r.stderr, /CLAUDE_CONFIG_DIR is set/);
  });

  // The CLI must not depend on import.meta.main, which Node before 24.2
  // leaves undefined (the writer then exited 0 having done nothing). A
  // loader hook blanks it in the writer's source, as such a Node would.
  test('run as a script, the CLI runs on a Node without import.meta.main, and from a relative path, another letter case or a link', () => {
    const dir = fresh();
    const hooks = path.join(dir, 'no-main-hooks.mjs');
    fs.writeFileSync(hooks, [
      'export async function load(url, context, next) {',
      '  const r = await next(url, context);',
      "  if (!url.endsWith('/tools/settings-write.mjs')) return r;",
      "  const text = typeof r.source === 'string' ? r.source : new TextDecoder().decode(r.source);",
      "  return { ...r, source: text.replaceAll('import.meta.main', 'undefined') };",
      '}',
      '',
    ].join('\n'));
    const register = path.join(dir, 'register.mjs');
    fs.writeFileSync(register, `import { register } from 'node:module';\nregister(${JSON.stringify(pathToFileURL(hooks).href)});\n`);
    const run = (args, cwd) => spawnSync(process.execPath, args, {
      cwd, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000,
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    const old = run(['--import', pathToFileURL(register).href, WRITER, '--help']);
    assert.equal(old.status, 0, old.stderr);
    assert.match(old.stdout, /^usage: node settings-write\.mjs/);
    const rel = run([path.basename(WRITER), '--help'], path.dirname(WRITER));
    assert.equal(rel.status, 0, rel.stderr);
    assert.match(rel.stdout, /^usage: node settings-write\.mjs/);
    // Windows paths are case-blind: another spelling still names the writer.
    if (process.platform === 'win32') {
      const lower = run([WRITER.toLowerCase(), '--help']);
      assert.equal(lower.status, 0, lower.stderr);
      assert.match(lower.stdout, /^usage: node settings-write\.mjs/);
    }
    // Through a link (a junction on Windows, which needs no admin; a symlink
    // elsewhere): node gives argv[1] as the link and import.meta.url as the
    // real file. The link points at a temp copy, so nothing that removes the
    // temp folder can ever reach the real hooks folder.
    const real = path.join(dir, 'real');
    for (const rel of ['tools/settings-write.mjs', 'lib/encoding.mjs']) {
      fs.mkdirSync(path.join(real, path.dirname(rel)), { recursive: true });
      fs.copyFileSync(path.join(HERE, '..', rel), path.join(real, rel));
    }
    const link = path.join(dir, 'link');
    fs.symlinkSync(real, link, 'junction');
    const linked = run([path.join(link, 'tools', 'settings-write.mjs'), '--help']);
    assert.equal(linked.status, 0, linked.stderr);
    assert.match(linked.stdout, /^usage: node settings-write\.mjs/);
  });

  test('imported, the CLI does not run', () => {
    const code = `const m = await import(${JSON.stringify(new URL('../tools/settings-write.mjs', import.meta.url).href)}); console.log(typeof m.settingsWrite, typeof m.main);`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code, '--', '--bogus'], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'function function');
  });

  test('a write keeps the file mode (the CLI writes ~/.claude.json 0600)', { skip: process.platform === 'win32' ? 'Windows has no POSIX file mode; CI on Linux runs this case' : false }, async () => {
    const dir = fresh();
    const file = path.join(dir, '.claude.json');
    put(file, claudeJsonFixture(), false);
    fs.chmodSync(file, 0o600);
    const r = await write(dir, { target: 'claude-json', file, ops: [{ op: 'set', path: ['numStartups'], value: 3 }] });
    assert.equal(r.exit, EXIT.OK, r.error);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  });
});
