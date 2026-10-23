#!/usr/bin/env node
// q14-recorder.mjs: Q14's live instrument, a UserPromptSubmit hook for real
// sessions (playbook/.claude/settings.local.json, installed through the
// settings writer under C29 once Briggsy says so).
//
// Q14 asks whether a hook can tell Briggsy's own prompts (typed, or sent over
// Remote Control) from a peer's message, a task notification and a /loop tick.
// Its headless probe (defs/q14-prompt-origin.mjs) can't make a typed or a
// Remote Control prompt: only a person in a live session can. So this hook
// records, for each prompt a live session submits, what a hook can know at
// that moment: its input's key names, how the prompt opens (head, below), and
// whether the transcript already holds the prompt's own record (the user
// record carrying its prompt id) and what that record says about where the
// prompt came from.
//
// It looks once and returns at once. The CLI waits for a UserPromptSubmit hook
// before the prompt goes on, so a hook that waited for the record would hold
// up every prompt, and a record the CLI writes only after its hooks return
// could never be seen from inside one. The headless runs found the record
// missing at hook time in every firing. So:
// - The hook looks once and writes an `atHook` line saying what it saw.
// - When the record was not there, the hook starts a poller and exits. The
//   poller is this script run again with --after-return: detached, unref'd,
//   with no console window and its stdio ignored, so the CLI's pipes close
//   when the hook exits. It looks again every 150 ms until the record turns
//   up or Q14_LIVE_BUDGET_MS after the hook started (10 s by default), then
//   writes an `afterReturn` line, which joins the atHook line on promptTag.
//   The hook hands it the transcript path and the prompt id in its
//   environment, never on its command line, which any process listing shows
//   (and the raw session id not at all: only its tag).
// atHook.polling says whether a poller was started. A polling atHook line with
// no afterReturn line means the poller died before it could write: on Windows
// the CLI may kill a hook's whole process tree when the hook exits (a job
// object would). Whether it does is measured at the install step; the atHook
// line holds either way.
//
// The hook's look reads only the transcript's last 4 MB (HOOK_TAIL_BYTES),
// moved back to the start of the line that cut falls in, so a big record (a
// pasted image's, say) is still read whole, up to 64 MB from the end. When the
// hook read the last 64 MB, it took 63 ms on a 63.7 MB transcript against 9 ms
// on a one-line one (medians of 15 runs, stdin closed to exit, 2026-10-22,
// this Windows machine), on every prompt, for a record that was not there
// anyway; the 4 MB look takes 13 ms on the same file. The one record the hook
// can miss is one that ends more than 4 MB before the transcript's end (4 MB
// written after it before the hook looked); the poller's first look reads the
// last 64 MB and finds it on its first try. The atHook line's record.window
// (below) says what the hook's look read, so that miss can be told from a
// record that landed after the hook looked.
//
// Lines go to captures.jsonl in ~/.claude/flow/probes/q14-live/
// (Q14_LIVE_OUT names another folder):
//   {at, phase: 'atHook', cli, recorder, hookEvent, inputKeys, sessionTag,
//    promptIdPresent, promptTag,
//    head: {taskNotification, slash, length, peerPreamble, wrapper},
//    polling,
//    record: {found, ms, window: {from, bytes, whole} | null, readError?,
//             origin, promptSource, entrypoint, turnOrigin, sessionKind,
//             version, keys}}
//   {at, phase: 'afterReturn', cli, recorder, sessionTag, promptTag,
//    record: {found, ms, tries, readError?, origin, promptSource, entrypoint,
//             turnOrigin, sessionKind, version, keys}}
// `at` is when the hook process started, on both lines, and `ms` counts from
// then to the look that settled the line. record's fields after `readError`
// come only when the record was found. readError names why a look failed (a
// transcript not written yet reads ENOENT), or why the hook had nothing to
// look for: no-transcript-path, no-prompt-id.
//
// `head` is how the prompt opens. Q14 asks whether a hook can tell a peer's
// message from Briggsy's own prompt at UserPromptSubmit time, and the
// prompt's own wrapper is the one signal a hook has then: the headless runs
// found no origin key in the hook's input and the prompt's record not yet in
// the transcript. taskNotification and slash say whether the prompt opens
// `<task-notification>` or `/`, and length is its length. peerPreamble says
// whether it opens with one of the fixed lines the CLI puts before a peer's
// message (PEER_PREAMBLES, below). wrapper is the tag that opens it, after
// that line and one newline when it has them: a name from the fixed list
// WRAPPERS when `<` and the name come first and whitespace or `>` follows,
// else null. A prompt that isn't a string gives false and null (and a length
// of null). Every peer record on disk on 2026-10-22 (64, in 4071 transcript
// files) opened "Another Claude session sent a message:" and a newline, then
// `<agent-message ` (52) or `<cross-session-message ` (12). Whether a hook's
// `prompt` carries that line, or opens at the tag, is unmeasured, so both
// are read.
//
// `recorder`, on every line (error lines too), is the first 12 hex of the
// sha256 of this file's own bytes, read once as the process starts. The
// poller reads the file again when it starts, so its stamp names the bytes
// it ran: its hook's, unless the file changed in between (measured
// 2026-10-22 on a copy: an edit 1 ms after the hook exited gave the
// afterReturn line a different stamp from its atHook line; one 39 ms or
// more after did not). A verdict holds only for the bytes that produced it
// (insight 003), so a later verdict reads only the lines stamped with the
// bytes it names, and a pair joined on promptTag whose two stamps differ
// straddles an edit: it counts under neither stamp, and its atHook line is
// never read as one whose poller died. It is null when the read fails, and
// nothing else changes.
//
// `window`, on the atHook line only, is what the hook's look read: the byte
// offset it started at (`from`, after moving back to a line's start), the
// bytes it read from there to the file's end (`bytes`), and whether that was
// the whole file (`whole`, from 0) or began mid-file. It is null when the hook
// read nothing: no transcript path or prompt id, or a read that failed. It
// tells a record the hook's look missed from one that landed after it: when
// `whole` is true, a record the poller finds landed later; when it is false,
// the record's offset in the transcript decides (offsets hold while the
// transcript is only appended to): before `from`, the window missed it; at or
// after from + bytes, it landed later; in between, it was still being written
// when the hook looked.
//
// What it never writes:
// - What was typed. No prompt text at all, not even the 24-character head the
//   headless probe's reader keeps: only whether the prompt opens a task
//   notification, a slash command or a peer's preamble, which tag from a
//   fixed list opens it, and its length. A wrapper's attributes (a peer's
//   `from=` address or name) and its body stay out.
// - A raw session id, prompt id or transcript path. sessionTag and promptTag
//   are the first 8 hex of the sha256 of the session id and the prompt id:
//   enough to group a session's lines and to join a line to its transcript
//   record later (hash each record's prompt id), never to read either back.
// - Any value from the record that isn't a short token. promptSource,
//   entrypoint, turnOrigin, sessionKind and version are kept only as a token
//   (letters, digits and . _ : - up to 64 characters, and no id); anything else
//   shows as its type. The origin keeps its kind, subkind and producer the same
//   way, plus its key names: its runId, and any field a later CLI adds, which
//   could carry a peer's session id, stay out. turnOrigin and sessionKind go
//   beyond the build design's list: both sit on human prompt records (Q14's
//   census counted them) and either may be what tells a Remote Control prompt
//   from a typed one.
//
// It prints nothing, since a UserPromptSubmit hook's stdout becomes context
// for the model, and always exits 0, the poller too: an instrument must never
// block or alter a prompt. A failure writes an error line instead, {at, cli,
// recorder, phase, promptTag?, error: {stage, code, name}}, never the error's
// message, which can quote the input or a path. The poller never creates the
// captures folder: the hook's line made it, so if it is gone someone removed
// it, and the poller's line is dropped.
//
// `cli` is the CLI version read from AI_AGENT (claude-code_<x>-<y>-<z>_...,
// which the 2.1.307 binary writes into its own environment, in ksr(), and
// which probe Q8 read in a Bash tool's environment), or null. Whether a hook
// process gets it too is unmeasured: capture.mjs keeps only CLAUDE* names.
// The poller inherits the hook's environment. record.version, when the record
// turns up, names the CLI that wrote it.
//
// Test seams: Q14_LIVE_OUT (the folder), and Q14_LIVE_BUDGET_MS (how long after
// the hook started the poller keeps looking: 10000 by default, at most 10000;
// 0 starts no poller).

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
// The first 12 hex of the sha256 of this file's bytes, every line's
// `recorder`: read once, here, so it names the bytes this process loaded as
// nearly as a read can. null when the read fails.
const RECORDER = (() => {
  try {
    return createHash('sha256').update(fs.readFileSync(SELF)).digest('hex').slice(0, 12);
  } catch {
    return null;
  }
})();
// The poller is this script run with this one argument. What it looks for
// comes in these environment variables, set only by the hook that starts it.
const POLLER_ARG = '--after-return';
const HANDOFF = {
  transcript: 'Q14_LIVE_POLL_TRANSCRIPT',
  promptId: 'Q14_LIVE_POLL_PROMPT_ID',
  sessionTag: 'Q14_LIVE_POLL_SESSION_TAG',
  t0: 'Q14_LIVE_POLL_T0',
};
const IS_POLLER = process.argv[2] === POLLER_ARG;

// The hook's T0 as handed over: a whole number of ms since the epoch, not in
// the future, else null.
function handedT0(v) {
  const n = Number(v);
  return typeof v === 'string' && /^\d{1,16}$/.test(v) && Number.isSafeInteger(n) && n <= Date.now() ? n : null;
}

// When the hook process started (node's own start-up included), the nearest
// mark to the hook firing a process can read: `at` on both lines, and what
// `ms` counts from. The poller takes the hook's; null when the handoff lacks it.
const T0 = IS_POLLER ? handedT0(process.env[HANDOFF.t0]) : Math.round(performance.timeOrigin);
const AT = new Date(T0 ?? Math.round(performance.timeOrigin)).toISOString();
const OUT = process.env.Q14_LIVE_OUT || path.join(os.homedir(), '.claude', 'flow', 'probes', 'q14-live');
const BUDGET_MS = budget(process.env.Q14_LIVE_BUDGET_MS);
const STEP_MS = 150;
// The most of a transcript one look reads, from its end: the prompt's own
// record is the newest one or close to it, and a long session's transcript
// runs to tens of MB. The poller's first look reads this much; its later looks
// read only what was appended.
const TAIL_BYTES = 64 * 1024 * 1024;
// What the hook's one look reads, before widening back to the start of the
// line it cuts (at most to TAIL_BYTES): the hook runs on every prompt, before
// the prompt goes on, so it reads no more than it must. The header has the
// measurement.
const HOOK_TAIL_BYTES = 4 * 1024 * 1024;
// How far back each step of that widening reads.
const BACK_STEP = 256 * 1024;

function budget(v) {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000) : 10_000;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const API_ID = /_01[A-Za-z0-9]{20,}/;
const TOKEN = /^[A-Za-z0-9_.:-]{1,64}$/;
const isToken = (s) => typeof s === 'string' && TOKEN.test(s) && !UUID.test(s) && !API_ID.test(s);

// A value safe to keep: null, a boolean, a finite number or a token as it is;
// anything else as {type}. Absent is null.
function token(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) return v;
  if (isToken(v)) return v;
  return { type: Array.isArray(v) ? 'array' : typeof v };
}

// An object's key names, each one a token or '?'.
const keysOf = (o) => Object.keys(o).map((k) => (isToken(k) ? k : '?')).sort();

// First 8 hex of the sha256 of a non-empty string, else null.
const tag = (s) => (typeof s === 'string' && s !== '' ? createHash('sha256').update(s).digest('hex').slice(0, 8) : null);

function cliOf(aiAgent) {
  const m = /^claude-code_(\d+)-(\d+)-(\d+)/.exec(aiAgent ?? '');
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}
const CLI = cliOf(process.env.AI_AGENT);

// The lines the CLI puts before a peer's message, each followed there by a
// newline: the 2.1.309 binary's own list (Eye, which it strips to read the
// tag after one), measured with grep -a.
const PEER_PREAMBLES = [
  'Another Claude session sent a message while you were working:',
  'Another Claude session sent a message:',
  'A peer session sent a message while you were working:',
];
// The wrapper tags the head names. Each appears as a tag in the 2.1.309
// binary; agent-message and cross-session-message open the peer records on
// disk. Any other tag reads as null: a name off this list could be text.
const WRAPPERS = ['task-notification', 'cross-session-message', 'agent-message', 'teammate-message', 'command-name', 'command-message'];

// How the prompt opens, as the header describes: flags, its length, and a
// name from WRAPPERS or null, never its text.
function headOf(p) {
  if (typeof p !== 'string') return { taskNotification: false, slash: false, length: null, peerPreamble: false, wrapper: null };
  const preamble = PEER_PREAMBLES.find((s) => p.startsWith(s));
  let rest = preamble === undefined ? p : p.slice(preamble.length);
  if (preamble !== undefined && rest.startsWith('\n')) rest = rest.slice(1);
  const wrapper = WRAPPERS.find((w) => rest.startsWith(`<${w}`) && /^[\s>]/.test(rest.slice(w.length + 1))) ?? null;
  return { taskNotification: p.startsWith('<task-notification>'), slash: p.startsWith('/'), length: p.length, peerPreamble: preamble !== undefined, wrapper };
}

function originOf(o) {
  if (o === undefined || o === null) return null;
  if (typeof o !== 'object' || Array.isArray(o)) return token(o);
  return { kind: token(o.kind), subkind: token(o.subkind), producer: token(o.producer), keys: keysOf(o) };
}

// What the record says about the prompt's origin, as the header describes.
function reduce(r) {
  return {
    origin: originOf(r.origin),
    promptSource: token(r.promptSource),
    entrypoint: token(r.entrypoint),
    turnOrigin: token(r.turnOrigin),
    sessionKind: token(r.sessionKind),
    version: token(r.version),
    keys: keysOf(r),
  };
}

// `len` bytes of the file from `pos`, or fewer at its end. allocUnsafe skips
// zero-filling a buffer the read overwrites; only the bytes read are returned.
function readAt(fd, pos, len) {
  const buf = Buffer.allocUnsafe(len);
  let got = 0;
  while (got < len) {
    const n = fs.readSync(fd, buf, got, len - got, pos + got);
    if (n === 0) break;
    got += n;
  }
  return buf.subarray(0, got);
}

// Where a fresh look at a file of `size` bytes starts reading: `window` bytes
// before its end, moved back to the start of the line that point falls in, so
// every line ending inside the window is read whole. It never moves back past
// TAIL_BYTES before the end: a line longer than that is left torn there.
function lookStart(fd, size, window) {
  const floor = Math.max(0, size - TAIL_BYTES);
  let start = Math.max(floor, size - window);
  while (start > floor) {
    const from = Math.max(floor, start - BACK_STEP);
    const nl = readAt(fd, from, start - from).lastIndexOf(10);
    if (nl !== -1) return from + nl + 1;
    start = from;
  }
  return start;
}

// A look at the transcript for the user record carrying `id`, as a function
// to call once per try: the record, or null. The first call reads the file's
// last `window` bytes (all of it when it is shorter), from the start of the
// line that cut falls in (lookStart); each later one reads only what was
// appended since, so a record that lands after the hook fired is found without
// reading the file again. The hook passes HOOK_TAIL_BYTES; the poller keeps
// TAIL_BYTES, so its first look covers what the hook's could not. A line is
// parsed only when it holds the id as a JSON string, and counts only as a
// whole user record with that prompt id, so the torn head of a line longer
// than TAIL_BYTES, or a torn last line, never matches: a torn last line waits
// for the rest of it. A file that shrank (rewritten) is read afresh. Throws
// the file's error (ENOENT until the session writes its transcript). The
// function's `span` is what its latest fresh start read, {from, bytes, whole}
// (the atHook line's `window`): unset until such a read succeeds.
function finder(file, id, window = TAIL_BYTES) {
  const needle = Buffer.from(JSON.stringify(id));
  let next = null; // the file offset the next read starts at
  let carry = Buffer.alloc(0); // bytes after the last newline read so far
  const match = (bytes) => {
    if (!bytes.includes(needle)) return null;
    let r;
    try { r = JSON.parse(bytes.toString('utf8')); } catch { return null; }
    return r?.type === 'user' && r.promptId === id ? r : null;
  };
  const look = () => {
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.fstatSync(fd).size;
      const anew = next === null || size < next;
      if (anew) {
        next = lookStart(fd, size, window);
        carry = Buffer.alloc(0);
      }
      const fresh = readAt(fd, next, size - next);
      if (anew) look.span = { from: next, bytes: fresh.length, whole: next === 0 };
      next += fresh.length;
      const buf = carry.length ? Buffer.concat([carry, fresh]) : fresh;
      const end = buf.lastIndexOf(10);
      carry = Buffer.from(buf.subarray(end + 1));
      const whole = buf.subarray(0, end + 1);
      for (let hit = whole.indexOf(needle); hit !== -1;) {
        const start = whole.lastIndexOf(10, hit) + 1;
        const stop = whole.indexOf(10, hit);
        const r = match(whole.subarray(start, stop));
        if (r) return r;
        hit = whole.indexOf(needle, stop + 1);
      }
      // A last line the session wrote without its newline yet: a whole record
      // parses, a torn one doesn't.
      return match(carry);
    } finally {
      fs.closeSync(fd);
    }
  };
  return look;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lookable = (file, id) => typeof file === 'string' && file !== '' && typeof id === 'string' && id !== '';

// One try of a finder: {rec} when found, {} when not, {readError} when the
// read failed.
function tryLook(look) {
  try {
    const rec = look();
    return rec ? { rec } : {};
  } catch (e) {
    return { readError: isToken(e?.code) ? e.code : 'error' };
  }
}

// The hook's one look, at the last HOOK_TAIL_BYTES: {found, ms, window,
// readError?, rec?}, window being what the look read, or null when it read
// nothing (the header says how to read it).
function lookAtHook(file, id) {
  if (typeof file !== 'string' || file === '') return { found: false, ms: Date.now() - T0, window: null, readError: 'no-transcript-path' };
  if (typeof id !== 'string' || id === '') return { found: false, ms: Date.now() - T0, window: null, readError: 'no-prompt-id' };
  const look = finder(file, id, HOOK_TAIL_BYTES);
  const r = tryLook(look);
  return { found: Boolean(r.rec), ms: Date.now() - T0, window: look.span ?? null, ...r };
}

// The poller's looks: every STEP_MS until BUDGET_MS after the hook started,
// and at least one however late the poller starts. {found, ms, tries,
// readError?, rec?}, readError being the last look's.
async function poll(file, id) {
  const look = finder(file, id);
  for (let tries = 1; ; tries++) {
    const r = tryLook(look);
    if (r.rec) return { found: true, ms: Date.now() - T0, tries, rec: r.rec };
    const left = T0 + BUDGET_MS - Date.now();
    if (left <= 0) return { found: false, ms: Date.now() - T0, tries, ...(r.readError ? { readError: r.readError } : {}) };
    await sleep(Math.min(STEP_MS, left));
  }
}

// One line onto captures.jsonl. The hook creates the folder; the poller never
// does (create: false), as the header says.
function append(line, { create = true } = {}) {
  if (create) fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(path.join(OUT, 'captures.jsonl'), `${JSON.stringify(line)}\n`);
}

const errorLine = (phase, stage, e, extra = {}) => ({ at: AT, cli: CLI, recorder: RECORDER, phase, ...extra, error: { stage, code: token(e?.code), name: token(e?.name) } });

// Starts the poller and lets go of it: the hook's exit then waits on nothing
// the poller holds. A start that fails says so in an error line.
function startPoller(file, id, sessionTag, promptTag) {
  const failed = (e) => {
    try { append(errorLine('atHook', 'poller-start', e, { promptTag })); } catch { /* nowhere left to say it */ }
  };
  let child;
  try {
    child = spawn(process.execPath, [SELF, POLLER_ARG], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      shell: false,
      env: {
        ...process.env,
        [HANDOFF.transcript]: file,
        [HANDOFF.promptId]: id,
        [HANDOFF.sessionTag]: sessionTag ?? '',
        [HANDOFF.t0]: String(T0),
      },
    });
  } catch (e) {
    return failed(e); // e.g. a NUL byte in the path or the id
  }
  child.on('error', failed);
  child.unref();
}

function hookMain() {
  let raw;
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch (e) {
    return append(errorLine('atHook', 'stdin', e));
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    return append(errorLine('atHook', 'parse', e));
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return append(errorLine('atHook', 'parse', { name: 'NotAnObject' }));
  const file = input.transcript_path;
  const id = input.prompt_id;
  const { rec, ...look } = lookAtHook(file, id);
  const sessionTag = tag(input.session_id);
  const promptTag = tag(id);
  // Look again after returning only when there was something to look for, it
  // was not there yet, and the budget allows a later look.
  const polling = !rec && lookable(file, id) && BUDGET_MS > 0;
  append({
    at: AT,
    phase: 'atHook',
    cli: CLI,
    recorder: RECORDER,
    hookEvent: token(input.hook_event_name),
    inputKeys: keysOf(input),
    sessionTag,
    promptIdPresent: typeof id === 'string' && id !== '',
    promptTag,
    head: headOf(input.prompt),
    polling,
    record: { ...look, ...(rec ? reduce(rec) : {}) },
  });
  // Only once the atHook line is down: a poller with nowhere to write would
  // run for nothing.
  if (polling) startPoller(file, id, sessionTag, promptTag);
}

async function pollerMain() {
  const file = process.env[HANDOFF.transcript];
  const id = process.env[HANDOFF.promptId];
  const sessionTag = process.env[HANDOFF.sessionTag] ?? '';
  const promptTag = tag(id);
  if (T0 === null || !lookable(file, id)) {
    return append(errorLine('afterReturn', 'handoff', { name: 'BadHandoff' }, { promptTag }), { create: false });
  }
  const { rec, ...look } = await poll(file, id);
  return append({
    at: AT,
    phase: 'afterReturn',
    cli: CLI,
    recorder: RECORDER,
    sessionTag: /^[0-9a-f]{8}$/.test(sessionTag) ? sessionTag : null,
    promptTag,
    record: { ...look, ...(rec ? reduce(rec) : {}) },
  }, { create: false });
}

try {
  await (IS_POLLER ? pollerMain() : hookMain());
} catch (e) {
  try {
    append(errorLine(IS_POLLER ? 'afterReturn' : 'atHook', 'record', e), { create: !IS_POLLER });
  } catch { /* nowhere left to say it */ }
}
process.exitCode = 0;
