// elite-engineer-session-start.sh from a version folder, the way deploy.mjs
// (KTD 12) runs it: settings name
// `bash ~/.claude/hooks/v-<sha12>/elite-engineer-session-start.sh`, and the
// script must run the check-config-liveness.mjs beside itself, in that same
// folder, never the flat ~/.claude/hooks copy. A path that misses leaves the
// liveness block empty, which reads exactly like all green, so here a stub in
// the version folder prints one marker and a flat stub prints another: only
// the first may reach the payload.
//
// Hermetic: the real script is copied into a temp home's
// .claude/hooks/v-0123456789ab/, the home holds a test manifesto, and HOME and
// USERPROFILE point there (bash reads HOME; Python's expanduser reads
// USERPROFILE on Windows). The command runs through `bash -c`, as the CLI
// runs a hook command, so the tilde expands the way it does live.
//
// The script needs bash, GNU timeout (it refuses Windows' timeout.exe), node
// and python3 on bash's PATH. A probe checks each the way the script does,
// and the suite skips, naming what is missing, without one. The ubuntu CI
// runner has all four.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, '..', 'elite-engineer-session-start.sh');
const VERSION = 'v-0123456789ab';
const COMMAND = `bash ~/.claude/hooks/${VERSION}/elite-engineer-session-start.sh`;
const MANIFESTO = '# Elite engineer manifesto (test copy)\n\nTrace it, verify it, ship it.\n';
const V_MARKER = 'LIVENESS-FROM-THE-VERSION-FOLDER';
const FLAT_MARKER = 'LIVENESS-FROM-THE-FLAT-FOLDER';

// The home is the test's; the session variables of a Claude Code process
// running this suite, and a liveness result it exported, stay out.
function envFor(home) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    const K = k.toUpperCase();
    if (!['HOME', 'USERPROFILE', 'CONFIG_LIVENESS_WARNINGS'].includes(K) && !K.startsWith('CLAUDE')) env[k] = v;
  }
  return { ...env, HOME: home, USERPROFILE: home };
}

// What the script needs, checked as it checks: GNU timeout at
// /usr/bin/timeout or a PATH timeout that says it is GNU coreutils.
const PROBE = [
  'missing=""',
  'if ! { [ -x /usr/bin/timeout ] || [[ $(timeout --version 2>/dev/null </dev/null) == *"GNU coreutils"* ]]; }; then missing="$missing GNU-timeout"; fi',
  'command -v node >/dev/null 2>&1 || missing="$missing node"',
  "python3 -c 'import json' >/dev/null 2>&1 || missing=\"$missing python3\"",
  'echo "missing:$missing"',
].join('\n');

function lacks() {
  const r = spawnSync('bash', ['-c', PROBE], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000, env: envFor(os.tmpdir()) });
  if (r.error) return `no bash to run the script (${r.error.code || r.error.message})`;
  const m = /missing:(.*)/.exec(r.stdout ?? '');
  if (r.status !== 0 || !m) return `bash did not run the probe (exit ${r.status}): not the bash the script needs`;
  const missing = m[1].trim();
  return missing ? `the script needs ${missing.split(/\s+/).join(', ')} on bash's PATH` : null;
}

const LACKS = lacks();
const SUITE = LACKS ? { skip: LACKS } : {};

const made = [];
after(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

const stub = (marker) => `process.stdout.write(${JSON.stringify(`${marker}\n`)});\n`;

// A temp home: the manifesto, the real script in the version folder, a stub
// liveness check beside it (unless versionStub is false) and another in the
// flat hooks folder.
function makeHome({ versionStub = true } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'session-start-'));
  made.push(home);
  const put = (rel, data) => {
    const file = path.join(home, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  };
  put('.claude/manifesto/elite-engineer.md', MANIFESTO);
  put(`.claude/hooks/${VERSION}/elite-engineer-session-start.sh`, fs.readFileSync(SCRIPT));
  if (versionStub) put(`.claude/hooks/${VERSION}/check-config-liveness.mjs`, stub(V_MARKER));
  put('.claude/hooks/check-config-liveness.mjs', stub(FLAT_MARKER));
  return home;
}

// The command as settings hold it, through bash -c; the additionalContext
// it hands the session.
function contextFrom(home) {
  const r = spawnSync('bash', ['-c', COMMAND], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000, env: envFor(home) });
  assert.equal(r.error, undefined, String(r.error));
  assert.equal(r.status, 0, r.stderr);
  let payload;
  try {
    payload = JSON.parse(r.stdout);
  } catch {
    assert.fail(`the script printed no JSON: ${r.stdout}\n${r.stderr}`);
  }
  assert.equal(payload.hookSpecificOutput?.hookEventName, 'SessionStart');
  return payload.hookSpecificOutput.additionalContext;
}

describe('elite-engineer-session-start.sh from a version folder', SUITE, () => {
  test('runs the liveness check that ships beside it, and never the flat copy', () => {
    const context = contextFrom(makeHome());
    assert.equal(context, `${MANIFESTO.trimEnd()}\n\n---\n\n${V_MARKER}\n`, 'the manifesto, then the version folder\'s liveness output');
    assert.ok(!context.includes(FLAT_MARKER), 'the flat liveness check never runs');
  });

  test('a version folder without its liveness check runs none: the flat copy is no fallback', () => {
    const context = contextFrom(makeHome({ versionStub: false }));
    assert.equal(context, MANIFESTO, 'the manifesto alone');
  });
});
