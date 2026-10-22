// The fixtures are what the hook tests replay, so they must look like what
// Claude Code sends. Each one validates against the documented field table
// (fields.mjs), and the validator is shown to reject what it should.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EVENTS, validateInput } from './fields.mjs';
import { allFixtures, fixture, oracleDir } from './harness.mjs';

const FIXTURES = allFixtures();

describe('every fixture validates against the documented fields', () => {
  for (const f of FIXTURES) {
    test(`${f.event}/${f.name}`, () => assert.deepEqual(validateInput(f.event, f.input), []));
  }
});

test('every event in the field table has a fixture, and every fixture folder is an event in it', () => {
  const have = new Set(FIXTURES.map((f) => f.event));
  assert.deepEqual(Object.keys(EVENTS).filter((e) => !have.has(e)), []);
  assert.deepEqual([...have].filter((e) => !(e in EVENTS)), []);
});

describe('the validator rejects what it should', () => {
  const ok = () => fixture('PreToolUse', 'bash');

  test('a missing required common field', () => {
    const x = ok();
    delete x.session_id;
    assert.deepEqual(validateInput('PreToolUse', x), ['PreToolUse: missing session_id']);
  });

  test('a field the reference does not document', () => {
    assert.deepEqual(validateInput('PreToolUse', { ...ok(), sessionId: 'x' }), ['PreToolUse: sessionId is not a documented field']);
  });

  test('a wrong type and a value outside an enum', () => {
    assert.deepEqual(validateInput('PreToolUse', { ...ok(), tool_input: 'npm test' }), ['PreToolUse: tool_input should be object, got "npm test"']);
    assert.match(validateInput('SessionEnd', fixture('SessionEnd', 'other', { reason: 'crash' }))[0], /reason should be one of clear\|resume/);
  });

  test('a command_source outside the values probe Q3 measured', () => {
    assert.deepEqual(validateInput('UserPromptExpansion', fixture('UserPromptExpansion', 'user-skill', { command_source: 'user' })), ['UserPromptExpansion: command_source should be one of projectSettings|userSettings|plugin|builtin, got "user"']);
  });

  test('an event name that disagrees with the event', () => {
    assert.deepEqual(validateInput('Stop', fixture('Stop', 'idle', { hook_event_name: 'SubagentStop' })), ['Stop: hook_event_name is SubagentStop']);
  });

  test('a bad entry inside PostToolBatch tool_calls and inside Stop background_tasks', () => {
    const batch = fixture('PostToolBatch', 'two-reads');
    delete batch.tool_calls[1].tool_use_id;
    assert.deepEqual(validateInput('PostToolBatch', batch), ['PostToolBatch.tool_calls[1]: missing tool_use_id']);
    const stop = fixture('Stop', 'background-shell');
    stop.background_tasks[0].pid = 1;
    assert.deepEqual(validateInput('Stop', stop), ['Stop.background_tasks[0]: pid is not a documented field']);
  });

  test('an event with no field table', () => {
    assert.deepEqual(validateInput('Notification', {}), ['Notification: no field table for this event']);
  });
});

test('fixture() merges overrides one level into tool_input', () => {
  const x = fixture('PreToolUse', 'bash', { tool_input: { command: 'ls' } });
  assert.equal(x.tool_input.command, 'ls');
  assert.equal(x.tool_input.description, 'Run test suite');
  assert.equal(fixture('PreToolUse', 'bash').tool_input.command, 'npm test', 'an override leaked into the file');
});

// A fixture the loop above never sees is one nothing validates, so the
// loaders refuse every way to reach one.
describe('fixture() and allFixtures() refuse a file the validation loop would miss', () => {
  let root;
  before(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-fixtures-')); });
  after(() => fs.rmSync(root, { recursive: true, force: true }));

  // A fixtures root of its own under the temp folder, never tests/fixtures.
  const plantRoot = (name, files) => {
    const r = path.join(root, name);
    for (const [rel, body] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(r, rel)), { recursive: true });
      fs.writeFileSync(path.join(r, rel), body);
    }
    return r;
  };

  test('fixture() loads only an exact name from an exact event folder', () => {
    for (const [event, name] of [['PreToolUse', '../Stop/idle'], ['PreToolUse', 'BASH'], ['pretooluse', 'bash'], ['PreToolUse', 'no-such']]) {
      assert.throws(() => fixture(event, name), /no fixture .* exactly/, `${event}/${name}`);
    }
  });

  test('allFixtures() throws on a folder, or a .json in another case, inside an event folder', () => {
    const ok = '{"hook_event_name":"Stop"}';
    assert.deepEqual(allFixtures(plantRoot('clean', { 'Stop/idle.json': ok, 'Stop/notes.txt': 'not a fixture' })).map((f) => `${f.event}/${f.name}`), ['Stop/idle']);
    assert.throws(() => allFixtures(plantRoot('nested', { 'Stop/idle.json': ok, 'Stop/sub/x.json': ok })), /Stop\/sub is a folder/);
    assert.throws(() => allFixtures(plantRoot('upper', { 'Stop/X.JSON': ok })), /Stop\/X\.JSON: a fixture's extension is \.json in lower case/);
  });
});

// One session spells every path for one OS: on Windows the transcript is a
// drive path like the cwd (the probes' 2.1.306 captures hold
// <config>\projects\<slug>\<session id>.jsonl). A fixture that mixes the two
// is a shape no session sends, and a hook that parses either path would be
// tested on it.
test('every fixture spells its transcript paths for the same OS as its cwd', () => {
  const osOf = (p) => (/^[A-Za-z]:\\/.test(p) && !p.includes('/') ? 'windows' : p.startsWith('/') && !p.includes('\\') ? 'posix' : 'mixed');
  const bad = [];
  for (const f of FIXTURES) {
    const cwd = osOf(f.input.cwd);
    if (cwd === 'mixed') bad.push(`${f.event}/${f.name}: cwd mixes separators`);
    for (const k of ['transcript_path', 'agent_transcript_path']) {
      if (typeof f.input[k] === 'string' && osOf(f.input[k]) !== cwd) bad.push(`${f.event}/${f.name}: ${k} is ${osOf(f.input[k])}, cwd is ${cwd}`);
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(FIXTURES.some((f) => osOf(f.input.cwd) === 'windows'), 'the Windows fixtures are still here');
});

test('the Windows Read pair spells one path two ways across three fields, and tool_use_id joins them', () => {
  const post = fixture('PostToolUse', 'read-windows');
  const call = fixture('PostToolBatch', 'reads-windows').tool_calls.find((c) => c.tool_use_id === post.tool_use_id);
  assert.ok(call, 'the batch carries the PostToolUse call');
  assert.match(post.tool_input.file_path, /^C:\\project\\/);
  assert.match(post.tool_response.file.filePath, /^C:\/project\//);
  assert.match(call.tool_input.file_path, /^C:\/project\//);
  assert.equal(typeof call.tool_response, 'string');
  assert.notEqual(call.tool_input.file_path, post.tool_input.file_path, 'the spellings must differ, or the pair no longer shows why a join on the raw path misses');
  const norm = (p) => p.replace(/\\/g, '/');
  assert.equal(norm(call.tool_input.file_path), norm(post.tool_input.file_path));
});

describe('the private oracle is reachable only through FLOW_ORACLE_DIR', () => {
  test('unset, or naming no folder, it is null', () => {
    const saved = process.env.FLOW_ORACLE_DIR;
    try {
      delete process.env.FLOW_ORACLE_DIR;
      assert.equal(oracleDir(), null);
      process.env.FLOW_ORACLE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'no-such-oracle');
      assert.equal(oracleDir(), null);
    } finally {
      if (saved === undefined) delete process.env.FLOW_ORACLE_DIR;
      else process.env.FLOW_ORACLE_DIR = saved;
    }
  });

  test('set, it holds the labeled sessions U8 replays', { skip: !oracleDir() && 'FLOW_ORACLE_DIR is unset (the oracle is private; CI never has it)' }, () => {
    const dir = oracleDir();
    for (const f of ['sessions.json', 'eval-rows.json']) {
      const rows = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      assert.ok(Array.isArray(rows) && rows.length > 0, `${f} holds no rows`);
    }
  });
});
