// probes/live/q14-recorder.mjs, Q14's live UserPromptSubmit instrument, run
// the way Claude Code runs a hook: synthetic hook input on stdin, a synthetic
// transcript in a temp folder, Q14_LIVE_OUT pointing its captures there. What
// matters most: the hook looks once and returns at once, with its pipes
// closed, leaving a detached poller to find a record that lands later; no line
// holds what was typed, a raw session id, prompt id or transcript path, and no
// command line holds an id or the path; and it prints nothing and exits 0
// whatever happens. Every id and sample record is built at run time, so this
// file stays clean for the leak test.
//
// A case that starts a poller waits for the poller's line (or, where the line
// is meant to be dropped, for the poller to exit) before it ends, so no poller
// outlives its case.
//
// The look-size cases write transcripts of 5 to 65 MB: the hook reads the last
// 4 MB (moved back to the start of the line that cut falls in, at most 64 MB),
// and the poller's first look reads the last 64 MB. The atHook line's window
// says what the hook's look read: the whole of a short transcript, or a span
// that starts mid-file. That is how a reader tells a record the hook's look
// missed from one that landed after it.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const RECORDER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'probes', 'live', 'q14-recorder.mjs');

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-q14-live-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
const fresh = (name) => fs.mkdtempSync(path.join(dir, `${name}-`));

// A phrase no field of the recorder's could produce by chance.
const PHRASE = 'QUOKKA-ZEBRA-7741-wrap-it-up';
const tag = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The longest the hook may take from the moment its input is complete to the
// moment it has exited with its pipes closed. It measured 17 ms on this
// Windows machine (2026-10-22); a hook that waited for its poller, or a poller
// holding the hook's stdout, takes over a second here.
const HOOK_DONE_MS = 500;

// The environment a hook would get, minus anything that would point the
// recorder elsewhere, plus the folder its captures go to and `extra`.
function envFor(out, extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^(Q14_LIVE_|AI_AGENT$|CLAUDE)/i.test(k)) env[k] = v;
  return { ...env, Q14_LIVE_OUT: out, ...extra };
}

// A UserPromptSubmit input as Q14's headless arms saw its keys.
function inputFor(transcript, overrides = {}) {
  return {
    session_id: randomUUID(),
    transcript_path: transcript,
    cwd: path.dirname(transcript),
    permission_mode: 'default',
    hook_event_name: 'UserPromptSubmit',
    prompt: `please ${PHRASE} now`,
    prompt_id: randomUUID(),
    ...overrides,
  };
}

// The user record a transcript holds for a prompt, with the fields Q14's
// census found on human records, and the prompt's text in its message.
function userRecord(input, extra = {}) {
  return {
    type: 'user',
    promptId: input.prompt_id,
    sessionId: input.session_id,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    cwd: input.cwd,
    entrypoint: 'cli',
    promptSource: 'typed',
    turnOrigin: 'user',
    version: '9.8.7',
    origin: { kind: 'human' },
    message: { role: 'user', content: input.prompt },
    ...extra,
  };
}
const line = (o) => `${JSON.stringify(o)}\n`;

// Run the recorder to its end on `input` (an object, or raw text). spawnSync
// returns once the hook has exited and its pipes are closed.
function record(input, env, args = []) {
  return spawnSync(process.execPath, [RECORDER, ...args], { input: typeof input === 'string' ? input : JSON.stringify(input), env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });
}

// Run the hook as the CLI would and time it from the moment its input is
// complete (stdin closed) to the moment it is done: exited, with its stdout and
// stderr closed (a poller holding either open would keep the CLI waiting).
// Stdin stays open until node is surely up, so its start-up is not timed.
async function hookTimed(input, env) {
  const child = spawn(process.execPath, [RECORDER], { env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  const closed = new Promise((resolve) => child.on('close', (code) => resolve(code)));
  await wait(500);
  const start = performance.now();
  child.stdin.end(JSON.stringify(input));
  const code = await closed;
  return { code, stdout, stderr, pid: child.pid, doneMs: performance.now() - start, doneAt: performance.now() };
}

// The captures' whole lines (a line still being appended is left out).
function captures(out) {
  const f = path.join(out, 'captures.jsonl');
  const text = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  return { text, lines: text.split('\n').slice(0, -1).filter(Boolean).map((l) => JSON.parse(l)) };
}

const isAfter = (l) => l.phase === 'afterReturn';

// The captures once a line `pred` accepts is in them, waiting up to `ms`.
async function captureOf(out, pred, ms = 15_000) {
  const until = Date.now() + ms;
  for (;;) {
    const c = captures(out);
    if (c.lines.some(pred)) return c;
    if (Date.now() > until) assert.fail(`no such line within ${ms} ms; captures: ${c.text}`);
    await wait(50);
  }
}

// None of what the recorder must never write appears in `text`, in any
// spelling JSON could give it.
function assertNothingRaw(text, input) {
  const forms = (s) => [s, JSON.stringify(s).slice(1, -1), s.toUpperCase()];
  for (const [what, value] of [['the prompt text', PHRASE], ['the session id', input.session_id], ['the prompt id', input.prompt_id], ['the transcript path', input.transcript_path], ['the transcript folder', path.basename(path.dirname(input.transcript_path))]]) {
    for (const f of forms(value)) assert.ok(!text.includes(f), `the captures hold ${what}: ${text}`);
  }
}

// Every running process's command line, as {pid, ppid, cmd}: a CIM query
// through PowerShell on Windows, ps elsewhere.
function processList() {
  let r;
  if (process.platform === 'win32') {
    const script = "[Console]::OutputEncoding = [Text.Encoding]::UTF8; Get-CimInstance Win32_Process | ForEach-Object { '{0}|{1}|{2}' -f $_.ProcessId, $_.ParentProcessId, $_.CommandLine }";
    r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000 });
  } else {
    r = spawnSync('ps', ['-e', '-ww', '-o', 'pid=,ppid=,args='], { encoding: 'utf8', shell: false, timeout: 60_000 });
  }
  assert.ok(!r.error && r.status === 0, `cannot list processes: ${r.error?.code ?? `exit ${r.status}`} ${r.stderr ?? ''}`);
  const rows = [];
  for (const row of r.stdout.split(/\r?\n/)) {
    const m = process.platform === 'win32' ? /^(\d+)\|(\d+)\|(.*)$/.exec(row) : /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(row);
    if (m) rows.push({ pid: Number(m[1]), ppid: Number(m[2]), cmd: m[3] });
  }
  assert.ok(rows.length > 0, `no processes parsed from: ${r.stdout.slice(0, 200)}`);
  return rows;
}

// A process-list row that is a poller: the recorder run with --after-return.
const isPoller = (p) => p.cmd.includes('q14-recorder.mjs') && p.cmd.includes('--after-return');

// Whether process `pid` has exited. Signal 0 reaches no such process (Windows
// answers the same way: libuv reads the process's exit code). On Linux an
// exited process whose parent is gone stays a zombie until its new parent
// reaps it, and a zombie still takes signal 0, so its state in /proc decides.
function gone(pid) {
  try {
    process.kill(pid, 0);
  } catch (e) {
    return e.code === 'ESRCH';
  }
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat[stat.lastIndexOf(')') + 2] === 'Z';
  } catch {
    return false;
  }
}

// Waits until every process in `pids` has exited, up to `ms`.
async function exited(pids, ms = 15_000) {
  const until = Date.now() + ms;
  for (;;) {
    const alive = pids.filter((pid) => !gone(pid));
    if (alive.length === 0) return;
    if (Date.now() > until) assert.fail(`still running after ${ms} ms: ${alive.join(', ')}`);
    await wait(50);
  }
}

const MB = 1024 * 1024;
const HOOK_LOOK = 4 * MB; // the hook's look: the recorder's HOOK_TAIL_BYTES
const POLL_LOOK = 64 * MB; // the poller's first look, and the farthest back any look reads: TAIL_BYTES

// Writes ASCII `parts` as the transcript `file`, and returns each part's byte
// offset and the file's size.
function writeParts(file, parts) {
  const at = [];
  let size = 0;
  const fd = fs.openSync(file, 'w');
  try {
    for (const p of parts) {
      at.push(size);
      fs.writeSync(fd, p);
      size += p.length;
    }
  } finally {
    fs.closeSync(fd);
  }
  return { at, size };
}

// The prompt's record holding `bytes` of pasted text, as a big image's record
// would. Its prompt id sits near its head, before the text.
const bigRecord = (input, bytes) => line(userRecord(input, { message: { role: 'user', content: 'p'.repeat(bytes) } }));
const idIn = (rec, input) => rec.indexOf(JSON.stringify(input.prompt_id));

describe('q14-recorder.mjs', () => {
  test('the hook looks once and is done at once; its poller, started with no id on its command line, writes an afterReturn line when the record lands later', { timeout: 60_000 }, async (t) => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    // The transcript exists, but the prompt's record is not in it yet. The
    // poller keeps its default budget, 10 s after the hook started.
    fs.writeFileSync(transcript, line({ type: 'system', note: 'earlier' }));
    const sizeAtHook = fs.statSync(transcript).size;
    const hook = await hookTimed(input, envFor(out, { AI_AGENT: 'claude-code_9-8-7_harness' }));
    t.diagnostic(`the hook was done ${hook.doneMs.toFixed(0)} ms after its input closed`);
    assert.equal(hook.code, 0, hook.stderr);
    assert.equal(hook.stdout, '', 'a UserPromptSubmit hook\'s stdout would become context');
    assert.equal(hook.stderr, '');
    assert.ok(hook.doneMs < HOOK_DONE_MS, `the hook took ${hook.doneMs.toFixed(0)} ms to exit and close its pipes`);

    // The hook's own line is down by the time it is done.
    const { lines: atFirst } = captures(out);
    assert.equal(atFirst.length, 1);
    const [atHook] = atFirst;
    assert.equal(atHook.phase, 'atHook');
    assert.equal(atHook.polling, true);
    // The look read the whole transcript, so the record the poller finds
    // below can only have landed after it.
    assert.deepEqual({ ...atHook.record, ms: 0 }, { found: false, ms: 0, window: { from: 0, bytes: sizeAtHook, whole: true } }, 'the whole transcript was read, and the record was not in it');

    // The poller is running now, a process of its own, and no command line on
    // the machine holds the prompt id, the session id or the transcript path.
    const procs = processList();
    const pollers = procs.filter(isPoller);
    // Windows keeps a process's parent pid after the parent exits, so there
    // the poller can be told apart as this hook's.
    const ours = process.platform === 'win32' ? pollers.filter((p) => p.ppid === hook.pid) : pollers;
    assert.ok(ours.length >= 1, `no poller running after the hook returned; pollers seen: ${JSON.stringify(pollers)}`);
    for (const p of procs) {
      for (const [what, value] of [['prompt id', input.prompt_id], ['session id', input.session_id], ['transcript path', transcript]]) {
        assert.ok(!p.cmd.includes(value), `process ${p.pid}'s command line holds the ${what}`);
      }
    }

    // The record lands a second after the hook returned, in two pieces, as a
    // session's append can: a look between them sees a torn line, which must
    // wait for the rest.
    await wait(Math.max(0, 1000 - (performance.now() - hook.doneAt)));
    const rec = line(userRecord(input));
    fs.appendFileSync(transcript, rec.slice(0, 40));
    await wait(300);
    fs.appendFileSync(transcript, rec.slice(40));

    const { text, lines } = await captureOf(out, isAfter);
    assertNothingRaw(text, input);
    assert.equal(lines.length, 2);
    const later = lines.find(isAfter);
    assert.deepEqual([later.at, later.cli, later.sessionTag, later.promptTag], [atHook.at, '9.8.7', tag(input.session_id), tag(input.prompt_id)], 'the afterReturn line joins the atHook line');
    assert.deepEqual([atHook.cli, atHook.sessionTag, atHook.promptTag], ['9.8.7', tag(input.session_id), tag(input.prompt_id)]);
    const c = later.record;
    assert.equal(c.found, true, JSON.stringify(c));
    assert.ok(c.tries > 1, `found on try ${c.tries}: the poller's first look should have missed`);
    assert.ok(c.ms - atHook.record.ms >= 1000, `found ${c.ms - atHook.record.ms} ms after the hook's look, before the record landed`);
    assert.ok(c.ms < 10_000, `found after ${c.ms} ms`);
    assert.deepEqual([c.promptSource, c.entrypoint, c.turnOrigin, c.version], ['typed', 'cli', 'user', '9.8.7']);
  });

  test('a record already on disk is found at hook time and no poller starts; the line holds tags, flags and tokens, never the prompt, an id or a path', { timeout: 30_000 }, async () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    fs.writeFileSync(transcript, line({ type: 'system', note: 'earlier' }) + line(userRecord(input, { origin: { kind: 'human', producer: 'repl', runId: randomUUID() } })));
    const r = record(input, envFor(out, { AI_AGENT: 'claude-code_9-8-7_harness' }));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '', 'a UserPromptSubmit hook\'s stdout would become context');
    assert.equal(r.stderr, '');
    const { text, lines } = captures(out);
    assert.equal(lines.length, 1);
    assertNothingRaw(text, input);
    const [c] = lines;
    assert.equal(c.phase, 'atHook');
    assert.equal(c.cli, '9.8.7');
    assert.equal(c.hookEvent, 'UserPromptSubmit');
    assert.deepEqual(c.inputKeys, Object.keys(input).sort());
    assert.equal(c.sessionTag, tag(input.session_id));
    assert.equal(c.promptTag, tag(input.prompt_id));
    assert.equal(c.promptIdPresent, true);
    assert.deepEqual(c.head, { taskNotification: false, slash: false, length: input.prompt.length });
    assert.equal(c.polling, false);
    assert.ok(Date.parse(c.at) <= Date.now());
    const { ms, ...rec } = c.record;
    assert.ok(Number.isInteger(ms) && ms >= 0, `ms ${ms}`);
    assert.deepEqual(rec, {
      found: true,
      // A transcript under 4 MB is read whole.
      window: { from: 0, bytes: fs.statSync(transcript).size, whole: true },
      // The origin's runId (an id) stays out: only its key name is kept.
      origin: { kind: 'human', subkind: null, producer: 'repl', keys: ['kind', 'producer', 'runId'] },
      promptSource: 'typed',
      entrypoint: 'cli',
      turnOrigin: 'user',
      sessionKind: null,
      version: '9.8.7',
      keys: Object.keys(userRecord(input)).sort(),
    });
    // A poller, had one started, would find the record at its first look and
    // write within a few hundred ms.
    await wait(1000);
    assert.equal(captures(out).lines.length, 1, 'a poller wrote although the hook found the record');
  });

  test('a transcript that never appears: the hook\'s look reads ENOENT, and the poller gives up near its budget with found: false; both exit 0 in silence', { timeout: 30_000 }, async () => {
    const out = fresh('out');
    const input = inputFor(path.join(fresh('tx'), 'never-written.jsonl'));
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '1500' }));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
    const { text, lines } = await captureOf(out, isAfter);
    assertNothingRaw(text, input);
    assert.deepEqual(lines.map((l) => l.phase), ['atHook', 'afterReturn']);
    const [atHook, later] = lines;
    assert.deepEqual([atHook.polling, atHook.record.found, atHook.record.readError, atHook.record.window], [true, false, 'ENOENT', null], 'nothing was read, so no window');
    const c = later.record;
    assert.deepEqual({ found: c.found, readError: c.readError }, { found: false, readError: 'ENOENT' });
    assert.ok(c.ms >= 1400 && c.ms < 10_000, `gave up after ${c.ms} ms`);
    assert.ok(c.tries >= 3, `${c.tries} tries`);
    assert.ok(!('origin' in c));
  });

  // Two hooks fire on the same prompt, each with its own captures folder, and
  // one folder is removed. The other folder's poller is the control: it shows
  // that a poller in the same state reaches its write. The removed folder's
  // poller is seen running after the removal and then seen to exit, so its
  // write came and went while the folder was gone.
  test('a poller never re-creates a captures folder removed after the hook wrote: it runs on, finds the record, exits, and its line is dropped', { timeout: 90_000 }, async () => {
    const kept = fresh('out');
    const removed = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    // The record is not there yet, so each hook starts a poller, and each
    // poller keeps looking (its default budget, 10 s after its hook started)
    // until the record lands, which this case decides.
    fs.writeFileSync(transcript, line({ type: 'system', note: 'earlier' }));
    // Telling these pollers from any other: Windows keeps a process's parent
    // pid after the parent exits, so there they are these hooks' children;
    // elsewhere they are the pollers that were not running before.
    const before = process.platform === 'win32' ? null : new Set(processList().filter(isPoller).map((p) => p.pid));
    const hooks = [kept, removed].map((out) => {
      const r = record(input, envFor(out));
      assert.equal(r.status, 0, r.stderr);
      assert.equal(captures(out).lines[0].polling, true);
      return r.pid;
    });
    fs.rmSync(removed, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

    const ours = processList().filter((p) => isPoller(p) && (before ? !before.has(p.pid) : hooks.includes(p.ppid)));
    assert.equal(ours.length, 2, `two pollers should be running after the removal; seen: ${JSON.stringify(ours)}`);

    // The record lands. Each poller finds it at its next look and writes its
    // line: the kept folder gets one, and the removed folder's is dropped.
    fs.appendFileSync(transcript, line(userRecord(input)));
    const { lines } = await captureOf(kept, isAfter);
    assert.equal(lines.find(isAfter).record.found, true, 'the control poller found the record');
    await exited(ours.map((p) => p.pid));
    assert.equal(fs.existsSync(removed), false, 'the poller made the folder again');
  });

  test('a poller started without its handoff writes an error line and exits 0 in silence', () => {
    const out = fresh('out');
    const r = record('', envFor(out), ['--after-return']);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
    const { lines } = captures(out);
    assert.equal(lines.length, 1);
    assert.deepEqual([lines[0].phase, lines[0].error.stage, lines[0].error.name, lines[0].promptTag], ['afterReturn', 'handoff', 'BadHandoff', null]);
  });

  test('only the user record carrying this prompt id counts: not another prompt\'s, not another type, not a torn one', () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    const other = { ...input, prompt_id: randomUUID() };
    fs.writeFileSync(transcript, [
      line(userRecord(other)),
      // Another prompt's user record that quotes this prompt's id.
      line(userRecord(other, { message: { role: 'user', content: input.prompt_id } })),
      // An assistant record quoting the id, and an attachment naming it.
      line({ type: 'assistant', promptId: input.prompt_id, message: { content: input.prompt_id } }),
      line({ type: 'attachment', note: input.prompt_id }),
      // This prompt's record, torn: the session died mid-write.
      line(userRecord(input)).slice(0, 60),
    ].join(''));
    // A budget of 0 starts no poller: the hook's one look is the whole run.
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '0' }));
    assert.equal(r.status, 0, r.stderr);
    const c = captures(out).lines[0];
    assert.equal(c.polling, false);
    assert.equal(c.record.found, false, JSON.stringify(c.record));
    assert.ok(!('readError' in c.record), 'the transcript was read');
  });

  test('a newest record bigger than the hook\'s 4 MB look is read whole: its prompt id, further back than 4 MB, is found at hook time', { timeout: 60_000 }, () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    const rec = bigRecord(input, 5 * MB);
    const { at, size } = writeParts(transcript, [line({ type: 'system', note: 'earlier' }), rec]);
    assert.ok(at[1] + idIn(rec, input) < size - HOOK_LOOK, 'the prompt id should sit before the 4 MB look begins');
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '0' }));
    assert.equal(r.status, 0, r.stderr);
    const c = captures(out).lines[0];
    assert.deepEqual([c.record.found, c.polling], [true, false], JSON.stringify(c.record));
  });

  test('a big record with later lines after it is read whole too: the look moves back to the start of whatever line its cut falls in', { timeout: 60_000 }, () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    const rec = bigRecord(input, 5 * MB);
    const later = line({ type: 'attachment', note: 'z'.repeat(1000) }).repeat(100);
    const { at, size } = writeParts(transcript, [line({ type: 'system', note: 'earlier' }), rec, later]);
    assert.ok(at[1] + idIn(rec, input) < size - HOOK_LOOK, 'the prompt id should sit before the 4 MB look begins');
    assert.ok(at[2] > size - HOOK_LOOK, 'the newest line should start inside the 4 MB look: the cut falls in the record, not in the newest line');
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '0' }));
    assert.equal(r.status, 0, r.stderr);
    const c = captures(out).lines[0];
    assert.deepEqual([c.record.found, c.polling], [true, false], JSON.stringify(c.record));
    // The window the line records starts where the look really began, the
    // record's line, not at the 4 MB cut; that is mid-file, after the first line.
    assert.deepEqual(c.record.window, { from: at[1], bytes: size - at[1], whole: false });
  });

  test('a record that ends more than 4 MB before the end is past the hook\'s look, as its line\'s window shows, and the poller\'s first look, 64 MB, finds it at once', { timeout: 60_000 }, async () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    const later = line({ type: 'attachment', note: 'z'.repeat(1000) });
    const { at, size } = writeParts(transcript, [line({ type: 'system', note: 'earlier' }), line(userRecord(input)), later.repeat(Math.ceil((5 * MB) / later.length))]);
    assert.ok(at[2] < size - HOOK_LOOK - later.length, 'the record should end before the line the 4 MB cut falls in');
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '3000' }));
    assert.equal(r.status, 0, r.stderr);
    const [atHook] = captures(out).lines;
    assert.deepEqual([atHook.phase, atHook.record.found, 'readError' in atHook.record, atHook.polling], ['atHook', false, false, true], `the hook read the transcript and did not see the record: ${JSON.stringify(atHook)}`);
    // The window began mid-file, at the start of the line the 4 MB cut falls
    // in. The record ends before it, so a reader of these lines sees that the
    // record was on disk and the hook's window missed it: it did not land late.
    const from = at[2] + Math.floor((size - HOOK_LOOK - at[2]) / later.length) * later.length;
    assert.deepEqual(atHook.record.window, { from, bytes: size - from, whole: false });
    assert.ok(at[2] <= atHook.record.window.from, 'the record ends before the window starts');
    const afterReturn = (await captureOf(out, isAfter)).lines.find(isAfter);
    assert.deepEqual([afterReturn.record.found, afterReturn.record.tries], [true, 1], JSON.stringify(afterReturn));
  });

  test('a look never moves back more than 64 MB: a longer line\'s head stays unread, its torn rest is passed over, and the record after it is found', { timeout: 120_000 }, () => {
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const huge = inputFor(transcript);
    const newest = inputFor(transcript, { session_id: huge.session_id });
    const big = bigRecord(huge, 65 * MB);
    const { at, size } = writeParts(transcript, [big, line(userRecord(newest))]);
    assert.ok(at[0] + idIn(big, huge) < size - POLL_LOOK && at[1] > size - HOOK_LOOK, 'both cuts should fall inside the big record, after its prompt id');
    // The newest record: found behind a torn line that runs back past 64 MB.
    const outNewest = fresh('out');
    assert.equal(record(newest, envFor(outNewest, { Q14_LIVE_BUDGET_MS: '0' })).status, 0);
    const newestLook = captures(outNewest).lines[0].record;
    assert.equal(newestLook.found, true, 'the newest record');
    // Its window stopped 64 MB back, inside the longer line.
    assert.deepEqual(newestLook.window, { from: size - POLL_LOOK, bytes: POLL_LOOK, whole: false });
    // The big record's prompt id is more than 64 MB back: no look reaches it.
    const outHuge = fresh('out');
    assert.equal(record(huge, envFor(outHuge, { Q14_LIVE_BUDGET_MS: '0' })).status, 0);
    const c = captures(outHuge).lines[0].record;
    assert.deepEqual([c.found, 'readError' in c], [false, false], JSON.stringify(c));
  });

  test('a task notification and a slash command are flagged by their head alone', () => {
    for (const [prompt, head] of [
      ['<task-notification>\n<task-id>x</task-id>', { taskNotification: true, slash: false }],
      ['/squeaky', { taskNotification: false, slash: true }],
      [` /not-a-command ${PHRASE}`, { taskNotification: false, slash: false }],
    ]) {
      const out = fresh('out');
      const input = inputFor(path.join(fresh('tx'), 'none.jsonl'), { prompt });
      assert.equal(record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '0' })).status, 0);
      const { text, lines } = captures(out);
      assert.deepEqual(lines[0].head, { ...head, length: prompt.length });
      assert.ok(!text.includes('task-id') && !text.includes('squeaky') && !text.includes(PHRASE), text);
    }
  });

  test('values that are no short token show as their type, and odd key names as ?', () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    const peer = randomUUID();
    fs.writeFileSync(transcript, line(userRecord(input, {
      promptSource: `from ${PHRASE}`,
      entrypoint: peer,
      turnOrigin: { session: peer },
      sessionKind: ['bg'],
      origin: { kind: `peer:${peer}`, producer: 'session-message', [peer]: true },
      [`k-${peer}`]: 1,
    })));
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '0' }));
    assert.equal(r.status, 0, r.stderr);
    const { text, lines } = captures(out);
    assert.ok(!text.includes(peer) && !text.includes(PHRASE), text);
    const c = lines[0].record;
    assert.deepEqual([c.promptSource, c.entrypoint, c.turnOrigin, c.sessionKind], [{ type: 'string' }, { type: 'string' }, { type: 'object' }, { type: 'array' }]);
    assert.deepEqual(c.origin, { kind: { type: 'string' }, subkind: null, producer: 'session-message', keys: ['?', 'kind', 'producer'] });
    assert.ok(c.keys.includes('?'));
  });

  test('input it cannot read writes an error line naming the stage, never the input, and still exits 0 in silence', () => {
    // V8 quotes the input in some parse errors ("Unexpected token ..., "<text>"
    // is not valid JSON"), which is why an error line keeps no message.
    for (const [label, raw, stage] of [['not JSON', `${PHRASE} is not JSON`, 'parse'], ['cut short', `{"prompt": "${PHRASE}`, 'parse'], ['not an object', JSON.stringify([PHRASE]), 'parse'], ['empty', '', 'parse']]) {
      const out = fresh('out');
      const r = record(raw, envFor(out));
      assert.equal(r.status, 0, `${label}: ${r.stderr}`);
      assert.equal(r.stdout, '', label);
      const { text, lines } = captures(out);
      assert.equal(lines.length, 1, label);
      assert.deepEqual([lines[0].phase, lines[0].error.stage], ['atHook', stage], label);
      assert.ok(!text.includes(PHRASE.slice(0, 6)), `${label}: ${text}`);
      assert.equal(lines[0].cli, null, 'no AI_AGENT, no version');
    }
  });

  test('input without a transcript path or a prompt id says so instead of looking, and starts no poller', () => {
    for (const [overrides, readError] of [[{ transcript_path: undefined }, 'no-transcript-path'], [{ prompt_id: undefined }, 'no-prompt-id']]) {
      const out = fresh('out');
      const input = inputFor(path.join(fresh('tx'), 'session.jsonl'), overrides);
      assert.equal(record(input, envFor(out)).status, 0);
      const c = captures(out).lines[0];
      assert.deepEqual({ found: c.record.found, readError: c.record.readError, window: c.record.window, polling: c.polling }, { found: false, readError, window: null, polling: false });
      if (overrides.prompt_id === undefined && 'prompt_id' in overrides) assert.deepEqual([c.promptIdPresent, c.promptTag], [false, null]);
    }
  });

  test('a captures folder it cannot write leaves the prompt alone: exit 0, nothing printed', () => {
    const blocked = path.join(fresh('out'), 'a-file');
    fs.writeFileSync(blocked, 'not a folder');
    const input = inputFor(path.join(fresh('tx'), 'none.jsonl'));
    const r = record(input, envFor(blocked, { Q14_LIVE_BUDGET_MS: '0' }));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
  });

  test('a record with later ones after it is found, not only the newest line', () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    const later = line({ type: 'attachment', note: 'z'.repeat(1000) }).repeat(100);
    fs.writeFileSync(transcript, line(userRecord(input)) + later);
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '0' }));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(captures(out).lines[0].record.found, true);
  });

  test('a whole record the session has not ended with a newline yet is found', () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const input = inputFor(transcript);
    fs.writeFileSync(transcript, line({ type: 'system', note: 'earlier' }) + JSON.stringify(userRecord(input)));
    const r = record(input, envFor(out, { Q14_LIVE_BUDGET_MS: '0' }));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(captures(out).lines[0].record.found, true);
  });

  test('each firing appends its own line', () => {
    const out = fresh('out');
    const transcript = path.join(fresh('tx'), 'session.jsonl');
    const first = inputFor(transcript);
    const second = inputFor(transcript, { session_id: first.session_id });
    fs.writeFileSync(transcript, line(userRecord(first)) + line(userRecord(second)));
    for (const input of [first, second]) assert.equal(record(input, envFor(out)).status, 0);
    const { lines } = captures(out);
    assert.deepEqual(lines.map((l) => [l.phase, l.sessionTag, l.promptTag, l.record.found]), [['atHook', tag(first.session_id), tag(first.prompt_id), true], ['atHook', tag(first.session_id), tag(second.prompt_id), true]]);
  });
});
