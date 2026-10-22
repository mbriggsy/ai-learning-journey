// harness.mjs: run a hook the way Claude Code does, then read its result the
// way Claude Code reads it.
//
//   const r = runHook(['node', script], fixture('PreToolUse', 'bash'));
//   assertBlocks(outcome('PreToolUse', r));
//
// runHook spawns from an argv array (no shell, KTD 11), writes the fixture to
// stdin, and returns {status, stdout, stderr, timedOut, error, elapsedMs,
// timeoutMs}. outcome() turns that into the decision Claude Code would act on,
// following the hooks reference (code.claude.com/docs/en/hooks, fetched
// 2026-10-21, "Exit code output", "JSON output", "Decision control", "Exit
// code 2 behavior per event"; a :NNN below is a line of that fetch). Those
// rules are a map, not Earth. probes/ measured three of them on the real CLI
// (2.1.306), and ~/.claude/flow/probes/passes.json keeps each version's
// verdicts:
// - Q1: a Stop hook's additionalContext reached the model and extended the
//   turn (the Stop hook fired again on the same prompt_id with
//   stop_hook_active true). SubagentStop's place in KEEPS_GOING rests on the
//   reference alone: Q1 measures Stop only.
// - Q2: a PreToolUse permissionDecision deny, the deprecated top-level block
//   and exit 2 each stopped the call and handed the model their reason. Its
//   two mixed arms (a deny in one form, an allow in the other) blocked both
//   ways. They don't make Q2 VERIFIED, but one whose read ran (the allow won)
//   lowers it to PARTIAL, so a later version's VERIFIED rules out an observed
//   flip. It doesn't prove deny-wins: a mixed arm the model skipped, or whose
//   run failed, leaves VERIFIED standing.
// - Q11: the hook env's CLAUDE_CODE_SESSION_ID matched the input's session_id
//   on every firing.
// Every other rule here rests on the reference alone: exit 1 with valid JSON,
// JSON after a profile echo, exit 2 over an allow, the output schema, the
// missing-file exception, the fields an event discards, the CLI's timeouts,
// the output a background process holds open.
//
// A naive reading gets these wrong, and every one would make a broken gate
// look like a working one:
// - Exit 1 is not a block. It is a non-blocking error, and the action goes ahead.
// - JSON with anything else on stdout (a shell profile's echo) is plain text,
//   so its decision is never read.
// - Exit 2 blocks even when the JSON says allow.
// - JSON that fails the output schema (a hookEventName that isn't the event,
//   a permissionDecision outside its values) decides nothing.
// - A Stop context is not a clean stop: it keeps Claude going, like a block.
// - The harness's timeout is not the CLI's. A hook the harness killed sooner
//   than Claude Code would decides nothing; one that ran past the CLI's limit
//   timed out there, even if the harness let it finish. Nor is the harness's
//   1 MB output buffer a limit of the CLI's: a hook cut off there decides
//   nothing, and is never a hook that failed.
// - A PreToolUse ask or defer is no pass: the session decides whether the
//   call goes ahead, not the hook.
// - A hook's output is what Claude Code read by shortly after the hook
//   exited, not what its pipes carried until they closed. A background
//   process that keeps them open prints a deny the CLI ignores, or turns an
//   allow into a block (:867-869), so such a run decides nothing here.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GIT_LOCATION_VARS } from '../probes/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.join(HERE, 'fixtures');
const RUNNER = path.join(HERE, 'hook-runner.mjs');

// Every event in the reference ("Exit code 2 behavior per event") but these,
// which answer in a shape of their own: a permission object or a retry flag,
// a model-switch verdict whose timeout blocks, an elicitation action read on
// exit 0 only, a worktree path on stdout (any non-zero exit fails it),
// replaced display text. The generic rules would score a deny from one of
// them as a pass, so outcome() refuses them.
const UNMODELED = new Set([
  'PermissionRequest', 'PermissionDenied', 'PreModelSwitch', 'Elicitation', 'ElicitationResult',
  'WorktreeCreate', 'WorktreeRemove', 'MessageDisplay',
]);
const MODELED = new Set([
  'PreToolUse', 'UserPromptSubmit', 'UserPromptExpansion', 'Stop', 'SubagentStop', 'TeammateIdle',
  'TaskCreated', 'TaskCompleted', 'ConfigChange', 'StopFailure', 'PostToolUse', 'PostToolUseFailure',
  'PostToolBatch', 'Notification', 'SubagentStart', 'SessionStart', 'Setup', 'SessionEnd', 'CwdChanged',
  'DirectoryAdded', 'FileChanged', 'PreCompact', 'PostCompact', 'PostModelSwitch', 'InstructionsLoaded',
]);

// Events whose action exit 2 stops ("Exit code 2 behavior per event").
// PostToolUse and PostToolUseFailure only show stderr to Claude: the tool
// already ran.
const EXIT2_BLOCKS = new Set([
  'PreToolUse', 'UserPromptSubmit', 'UserPromptExpansion', 'Stop', 'SubagentStop',
  'TeammateIdle', 'TaskCreated', 'TaskCompleted', 'ConfigChange', 'PostToolBatch', 'PreCompact',
]);

// Where exit 2's stderr goes to Claude. UserPromptSubmit and
// UserPromptExpansion show it to the user, PreCompact to the user on a manual
// /compact, and ConfigChange to no one (each event's section).
const STDERR_TO_CLAUDE = new Set([
  'PreToolUse', 'Stop', 'SubagentStop', 'TeammateIdle', 'TaskCreated', 'TaskCompleted',
  'PostToolBatch', 'PostToolUse', 'PostToolUseFailure',
]);

// Events that honor a top-level {"decision": "block"} ("Decision control").
const TOP_LEVEL_DECISION = new Set([
  'UserPromptSubmit', 'UserPromptExpansion', 'PostToolUse', 'PostToolUseFailure',
  'PostToolBatch', 'Stop', 'SubagentStop', 'ConfigChange', 'PreCompact', 'TaskCreated',
]);

// Events where a block means "keep going", so a context does too (Q1) and
// continue: false contradicts both.
const KEEPS_GOING = new Set(['Stop', 'SubagentStop']);

// onFailure: "block" has no effect here ("Block the action when a hook fails").
const ONFAILURE_IGNORED = new Set(['Stop', 'SubagentStop', 'TaskCompleted', 'TeammateIdle']);

// Exit 2 with nothing on stdout and a stderr saying a file is missing is a
// non-blocking error on these events, and on a plugin's UserPromptSubmit hook
// ("Exit code output"). The reference gives "No such file or directory" as an
// example; ENOENT (node's form) is matched too, since matching too much only
// fails a gate's assertBlocks, where matching too little lets it fail open.
const MISSING_FILE_EVENTS = new Set(['Stop', 'SubagentStop', 'TaskCompleted']);
const MISSING_FILE = /no such file or directory|ENOENT/i;

// Output an event throws away. StopFailure ignores the JSON on any exit
// ("Exit code output"); Setup (:1399), InstructionsLoaded (:1438) and
// SessionEnd (:3537) discard "their JSON output fields". ConfigChange,
// PreCompact, PostCompact and Notification drop systemMessage and continue,
// TaskCreated continue alone. CwdChanged, FileChanged and DirectoryAdded drop
// continue but read systemMessage: the first two show it, and DirectoryAdded
// delivers it per source (:2974, :3097, :3017).
const DISCARDS_ALL = new Set(['StopFailure', 'SessionEnd', 'Setup', 'InstructionsLoaded']);
const DISCARDS = {
  ConfigChange: new Set(['systemMessage', 'continue']),
  PreCompact: new Set(['systemMessage', 'continue']),
  PostCompact: new Set(['systemMessage', 'continue']),
  Notification: new Set(['systemMessage', 'continue']),
  TaskCreated: new Set(['continue']),
  CwdChanged: new Set(['continue']),
  FileChanged: new Set(['continue']),
  DirectoryAdded: new Set(['continue']),
};

// How long Claude Code gives a command hook before canceling it ("Common
// fields", timeout, :414, which an entry sets in seconds): 600 s, lowered to
// 30 s on UserPromptSubmit (:1452), PreModelSwitch and PostModelSwitch, and
// to 10 s on MessageDisplay.
// A canceled hook's output is discarded and the run counts as a failure
// (:861, :930), so onFailure: "block" makes it do what exit 2 does on the
// event (:933): a timed-out UserPromptSubmit hook lets the prompt through
// without its context, or blocks it under onFailure (:1454).
const CLI_TIMEOUT_MS = 600_000;
const CLI_TIMEOUT_MS_BY_EVENT = { UserPromptSubmit: 30_000, PreModelSwitch: 30_000, PostModelSwitch: 30_000, MessageDisplay: 10_000 };
// SessionEnd hooks share a 1.5 s budget. A hook's own timeout raises it to
// match, up to 60 s, but a plugin hook's doesn't (:414, :3539-3541). A session
// that sets CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS (:3542) is not modeled.
const SESSIONEND_BUDGET_MS = 1_500;
const SESSIONEND_MAX_MS = 60_000;

// Claude Code "finishes reading the hook's output shortly after the hook's
// own process exits" (:867), a span the reference doesn't give. Output open
// longer than this past the exit was held by a background process the hook
// started without redirecting, and the CLI reads that run its own way: a deny
// printed later is ignored, an allow is blocked ("refusing to honor the
// suspect capture", :869). Wide enough that the pipes of a hook that simply
// exited close inside it on a loaded CI runner.
export const PIPE_HELD_MS = 250;

// The ms Claude Code lets an `event` hook run: `entryS` (the hook entry's
// timeout, in seconds as the entry sets it, fractions allowed) where the
// event honors it, else the event's default.
function cliTimeout(event, entryS, plugin) {
  if (entryS != null && !(Number.isFinite(entryS) && entryS > 0)) {
    throw new Error(`hookTimeoutS should be the hook entry's timeout in seconds (hooks reference :414), got ${String(entryS)}`);
  }
  const configuredMs = entryS == null ? null : entryS * 1000;
  if (event === 'SessionEnd') return Math.min(configuredMs ?? SESSIONEND_BUDGET_MS, plugin ? SESSIONEND_BUDGET_MS : SESSIONEND_MAX_MS);
  return configuredMs ?? CLI_TIMEOUT_MS_BY_EVENT[event] ?? CLI_TIMEOUT_MS;
}

// The output schema, as far as the reference states one ("JSON output",
// "Decision control", each event's section). An unknown key is not a miss:
// Claude Code ignores a field at the wrong level without an error (hooks
// guide, "Fields at the wrong level").
const TOP_TYPES = { continue: 'boolean', suppressOutput: 'boolean', stopReason: 'string', systemMessage: 'string', terminalSequence: 'string', reason: 'string' };
const HSO_TYPES = { additionalContext: 'string', permissionDecisionReason: 'string' };
// The top-level decision's two values. "approve" is documented on PreToolUse
// only, where it maps to allow; elsewhere it decides nothing.
const DECISIONS = ['approve', 'block'];
// The entries for events outcome() refuses serve validateOutput's direct callers.
const HSO_ENUMS = {
  PreToolUse: { permissionDecision: ['allow', 'deny', 'ask', 'defer'] },
  PreModelSwitch: { permissionDecision: ['allow', 'deny', 'ask'] },
  PermissionRequest: { 'decision.behavior': ['allow', 'deny'] },
  Elicitation: { action: ['accept', 'decline', 'cancel'] },
  ElicitationResult: { action: ['accept', 'decline', 'cancel'] },
};

const GIT_LOCATION = new Set(GIT_LOCATION_VARS);

// How far past timeoutMs runHook lets hook-runner.mjs run before killing it:
// taskkill's own 15 s limit plus the runner's 2 s kill grace, with room to
// start node. It only backs up the runner's own timeout.
const RUNNER_SLACK_MS = 30_000;

// The runner runHook spawns, as an argv, and its slack. Only harness.test.mjs
// changes it (to a stand-in that gives no result, with a short slack), through
// this setter and never through the environment, so no gate's test can be
// pointed elsewhere.
let runner = { argv: [process.execPath, RUNNER], slackMs: RUNNER_SLACK_MS };
export function setRunner(next) {
  const prev = runner;
  runner = next;
  return prev;
}

// Spawn `argv` with `input` (an object, written as JSON, or a string) on stdin.
//
// The hook gets this process's environment minus every CLAUDE* variable and
// the git location variables (GIT_DIR, GIT_INDEX_FILE and the rest, matched
// case-blind): an outer git hook exports those, Claude Code never hands them
// to a hook, and a hook's own git would follow them to the live index. On top
// go 4 of the 11 CLAUDE* variables probe Q8 measured on hook envs: CLAUDECODE,
// CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_SESSION_ID (the input's session_id,
// as Q11 measured) and CLAUDE_PROJECT_DIR. Run from inside a live session, the
// hook would otherwise get that session's id, messaging socket and
// ATTENDED/ENTRYPOINT values, and score differently than in CI. The rest
// depend on how the session was launched, so no default is right: a test of a
// hook that reads ENTRYPOINT, ATTENDED, PID, EFFORT or ENV_FILE must pass
// them in `env`, which wins over everything here.
//
// CLAUDE_PROJECT_DIR is the `cwd` option, else input.cwd. Claude Code keeps it
// at the root the session started in while input.cwd follows a cd or a
// worktree ("Reference scripts by path"), so a test of that case passes the
// launch root as `cwd` (or env.CLAUDE_PROJECT_DIR) and sets input.cwd to the
// subfolder.
//
// timeoutMs is the harness's own limit, short so a hung hook can't stall node
// --test. It is not the CLI's: outcome() holds elapsedMs against the CLI's
// timeout to tell a hook Claude Code would cancel from one only the harness
// cut short. At the limit the hook dies with everything it started (taskkill
// /T on Windows, its process group on POSIX).
//
// The hook runs under hook-runner.mjs, which times its exit apart from the
// close of its stdout and stderr; spawnSync alone waits for the close and
// can't tell them apart. elapsedMs is the hook's own run time (to its exit,
// or to the harness's kill), heldMs how long its output stayed open after it
// exited (null when it never exited on its own), and outcome() reads a run
// held past PIPE_HELD_MS as undecided. A background job still holding the
// output when the run ends dies with the hook's process group on POSIX; on
// Windows it runs on (hook-runner.mjs says why). status is null when the
// hook was killed, and error is set only when it couldn't start. A hook
// that wrote more than the runner's 1 MB buffer (spawnSync's maxBuffer) on a
// stream is killed there, and overflowed names the stream: the cut is the
// harness's, so outcome() reads that run undecided, never as a failure.
export function runHook(argv, input, { env = {}, cwd, timeoutMs = 15_000 } = {}) {
  const [cmd, ...args] = argv;
  let fields = input;
  if (typeof input === 'string') {
    try { fields = JSON.parse(input); } catch { fields = null; }
  }
  const base = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^CLAUDE/i.test(k) && !GIT_LOCATION.has(k.toUpperCase())) base[k] = v;
  base.CLAUDECODE = '1';
  base.CLAUDE_CODE_CHILD_SESSION = '1';
  if (typeof fields?.session_id === 'string') base.CLAUDE_CODE_SESSION_ID = fields.session_id;
  const projectDir = cwd ?? fields?.cwd;
  if (typeof projectDir === 'string') base.CLAUDE_PROJECT_DIR = projectDir;
  const job = {
    argv, input: typeof input === 'string' ? input : JSON.stringify(input), env: { ...base, ...env }, cwd, timeoutMs,
    // A run that ends with the output still open must report a heldMs past the margin.
    minDrainMs: 2 * PIPE_HELD_MS,
  };
  const [bin, ...pre] = runner.argv;
  const r = spawnSync(bin, pre, {
    input: JSON.stringify(job), encoding: 'utf8', shell: false, windowsHide: true,
    timeout: timeoutMs + runner.slackMs, maxBuffer: 64 * 1024 * 1024,
  });
  let res;
  try {
    res = JSON.parse(r.stdout);
  } catch {
    // Never scored as a hook that couldn't start: onFailure 'block' would pass
    // assertBlocks on a broken harness.
    throw new Error(`hook-runner.mjs gave no result (exit ${r.status}${r.error ? `, ${r.error.code}` : ''}): ${(r.stderr || '').slice(0, 500)}`);
  }
  return {
    status: res.status,
    stdout: res.stdout,
    stderr: res.stderr,
    timedOut: res.timedOut,
    overflowed: res.overflowed,
    error: res.error ? Object.assign(new Error(res.error.message), res.error) : null,
    elapsedMs: res.elapsedMs,
    timeoutMs,
    heldMs: res.heldMs,
    signal: res.signal,
  };
}

// How Claude Code reads a non-async hook's stdout ("Exit code 0"): one JSON
// object with nothing around it but whitespace, else plain text or a parse
// failure. Returns {kind: 'json'|'text'|'invalid'|'empty', json}.
export function parseStdout(stdout) {
  const s = stdout.trim();
  if (!s) return { kind: 'empty', json: null };
  if (!s.startsWith('{') || !s.endsWith('}')) return { kind: 'text', json: null };
  try {
    const json = JSON.parse(s);
    return json && typeof json === 'object' && !Array.isArray(json) ? { kind: 'json', json } : { kind: 'text', json: null };
  } catch {
    // Several lines that each parse alone are plain text unless one of them
    // sets a field; then the whole output is a parse failure.
    const lines = s.split('\n').map((l) => l.trim()).filter(Boolean);
    const each = lines.map((l) => { try { return JSON.parse(l); } catch { return undefined; } });
    if (lines.length > 1 && each.every((x) => x !== undefined)) {
      const setsField = each.some((x) => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length > 0);
      return setsField ? { kind: 'invalid', json: null } : { kind: 'text', json: null };
    }
    return { kind: 'invalid', json: null };
  }
}

// The problems with `json` as an `event` hook's output; [] when it validates.
// Any one makes the run a schema failure ("Exit code output").
export function validateOutput(event, json) {
  const problems = [];
  const typed = (obj, types, where) => {
    for (const [k, t] of Object.entries(types)) {
      if (k in obj && typeof obj[k] !== t) problems.push(`${where}${k} should be ${t}, got ${JSON.stringify(obj[k])}`);
    }
  };
  typed(json, TOP_TYPES, '');
  if ('decision' in json && !DECISIONS.includes(json.decision)) problems.push(`decision should be one of ${DECISIONS.join('|')}, got ${JSON.stringify(json.decision)}`);
  if (!('hookSpecificOutput' in json)) return problems;
  const hso = json.hookSpecificOutput;
  if (!hso || typeof hso !== 'object' || Array.isArray(hso)) return [...problems, `hookSpecificOutput should be an object, got ${JSON.stringify(hso)}`];
  // "It requires a hookEventName field set to the event name" ("JSON output").
  if (hso.hookEventName !== event) problems.push(`hookSpecificOutput.hookEventName should be ${event}, got ${JSON.stringify(hso.hookEventName)}`);
  typed(hso, HSO_TYPES, 'hookSpecificOutput.');
  for (const [k, allowed] of Object.entries(HSO_ENUMS[event] ?? {})) {
    const v = k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), hso);
    if (v !== undefined && !allowed.includes(v)) problems.push(`hookSpecificOutput.${k} should be one of ${allowed.join('|')}, got ${JSON.stringify(v)}`);
  }
  return problems;
}

// The problems with `json` as an `event` hook's output under rules the
// reference implies but gives no type for; [] when none applies. PreToolUse's
// updatedInput "replaces the entire input object" (:1928), so anything but an
// object looks wrong, yet no probe has measured what Claude Code does with
// one: a schema failure (which onFailure: "block" turns into a block), or a
// decision read as printed. Either reading could pass a broken gate, so
// outcome() scores such a run undecided and both asserts refuse it.
export function unmeasuredProblems(event, json) {
  const hso = json?.hookSpecificOutput;
  if (event !== 'PreToolUse' || !hso || typeof hso !== 'object' || !('updatedInput' in hso)) return [];
  const u = hso.updatedInput;
  return u && typeof u === 'object' && !Array.isArray(u) ? [] : [`hookSpecificOutput.updatedInput should be an object, got ${JSON.stringify(u)}`];
}

// The decision Claude Code acts on.
//   blocks       the action is stopped (a tool call refused, a prompt rejected,
//                a stop prevented, a batch's loop halted). On PostToolUse and
//                PostToolUseFailure the tool already ran, so a block there is
//                the reason handed to Claude, not an undo.
//   continues    Stop and SubagentStop: a context keeps Claude going, as hook
//                feedback rather than an error (Q1). assertPasses rejects it;
//                assertBlocks accepts it, and its reason is the context.
//   decision     'block' | 'deny' | 'ask' | 'allow' | 'defer' | null
//   stops        continue: false (Claude stops processing entirely)
//   failure      the run counts as a hook failure (can't start, a CLI
//                timeout, an exit other than 0 or 2, unparseable or
//                schema-invalid output, exit 2 with a missing-file stderr
//                where that rule applies). This is onFailure's sense of a
//                failure ("Each of these counts as a failure"); only
//                onFailure: 'block' acts on it. Without it, an exit 1 whose
//                JSON passes the schema still decides through its fields
//                (the exit-code table: "the fields alone decide").
//   cliTimedOut  the run reached cliTimeoutMs, the limit Claude Code gives
//                this hook, so the CLI canceled it and dropped its output
//   cliTimeoutMs that limit, in ms
//   heldOutput   the hook exited before that limit, but its stdout or stderr
//                stayed open more than PIPE_HELD_MS longer: a background
//                process held them, and Claude Code reads that run otherwise
//   undecided    nobody knows what Claude Code decides: the harness killed
//                the hook before that limit (only the part of the run that
//                never happened could decide it), heldOutput, the runner's
//                1 MB buffer cut the output short before that limit
//                (run.overflowed), or the JSON breaks a rule no probe has
//                measured (unmeasuredProblems). blocks, continues, stops and
//                failure then have no value: reading one throws, so
//                assert.ok(!o.blocks) can't pass the run, and JSON and
//                deepEqual leave them out. failureBlocks is false, and both
//                asserts refuse the run
//   reason, additionalContext, systemMessage, stdout kind, the schema
//   problems that made it 'invalid', the unmeasured ones, the parsed json
// `plugin`: the hook comes from a plugin, which the missing-file rule and
// SessionEnd's budget read. `hookTimeoutS`: the hook entry's own timeout, in
// seconds as the entry sets it (fractions allowed); without it, the event's
// default. Any other option throws, so a misspelled or ms-sized one can't
// fall back to that default unseen.
const OUTCOME_OPTIONS = ['onFailure', 'plugin', 'hookTimeoutS'];
export function outcome(event, run, opts = {}) {
  for (const k of Object.keys(opts)) {
    if (OUTCOME_OPTIONS.includes(k)) continue;
    const timeout = /timeout/i.test(k) ? ": the hook entry's timeout goes in as hookTimeoutS, in seconds as the entry sets it (hooks reference :414)" : '';
    throw new Error(`outcome() takes ${OUTCOME_OPTIONS.join(', ')}, not ${k}${timeout}`);
  }
  const { onFailure, plugin = false, hookTimeoutS } = opts;
  if (UNMODELED.has(event)) throw new Error(`outcome() does not read a ${event} hook's decision; model its rules before scoring a hook on it`);
  if (!MODELED.has(event)) throw new Error(`${event} is not a hook event in the reference`);
  // A run built anywhere else can miss a field this reading leans on, and a
  // missing error key would read as a hook that couldn't start.
  if (typeof run?.stdout !== 'string' || typeof run.stderr !== 'string' || !('status' in run)) {
    throw new Error(`outcome() reads a run as runHook() returns it ({status, stdout, stderr, ...}, stdout and stderr strings); got ${JSON.stringify(run)?.slice(0, 200)}`);
  }
  const limit = cliTimeout(event, hookTimeoutS, plugin);
  // A run that lasted as long as Claude Code gives the hook was canceled
  // there, whether or not the harness killed it first; a harness kill at or
  // past that limit stands for one.
  const cliTimedOut = run.elapsedMs >= limit || (run.timedOut === true && run.timeoutMs >= limit);
  const harnessCut = run.timedOut === true && !cliTimedOut;
  // The runner's buffer, not the CLI, cut the hook short, unless the CLI had
  // canceled it first. A hand-built run with no overflowed key had no cut.
  const bufferCut = run.overflowed != null && !cliTimedOut;
  // A run with no heldMs (built by hand) reads as one whose output closed with it.
  const heldOutput = !cliTimedOut && run.timedOut !== true && typeof run.heldMs === 'number' && run.heldMs > PIPE_HELD_MS;
  const parsed = parseStdout(run.stdout);
  // JSON that fails the schema reads like a parse failure: a non-blocking
  // error whose fields all drop, top-level ones included.
  const schemaProblems = parsed.kind === 'json' ? validateOutput(event, parsed.json) : [];
  const stdoutKind = schemaProblems.length ? 'invalid' : parsed.kind;
  const unmeasured = stdoutKind === 'json' ? unmeasuredProblems(event, parsed.json) : [];
  // A canceled hook never exits as far as Claude Code knows.
  const exit2 = run.status === 2 && !cliTimedOut;
  // A hook the runner killed (at its timeout or its buffer) has no status
  // either, but it started.
  const cantStart = run.error != null || (run.status === null && !run.timedOut && run.overflowed == null);
  const missingFile = exit2 && stdoutKind === 'empty' && MISSING_FILE.test(run.stderr)
    && (MISSING_FILE_EVENTS.has(event) || (plugin && event === 'UserPromptSubmit'));
  const exit2Blocks = exit2 && !missingFile && EXIT2_BLOCKS.has(event);
  // An unmeasured rule decides the run only where the JSON would: not past
  // exit 2's block, a start failure or a CLI timeout.
  const undecided = harnessCut || heldOutput || bufferCut || (unmeasured.length > 0 && !exit2Blocks && !cantStart && !cliTimedOut);
  const json = stdoutKind === 'json' ? parsed.json : null;
  const hso = json?.hookSpecificOutput ?? null;
  const failure = cantStart || cliTimedOut || (run.status !== 0 && !exit2) || missingFile || stdoutKind === 'invalid';
  // Exit 0 or another code with schema-valid JSON: the fields decide, less
  // the ones the event throws away.
  const fieldsApply = json !== null && !cliTimedOut && !undecided && !cantStart && !DISCARDS_ALL.has(event);
  const reads = (field) => fieldsApply && !DISCARDS[event]?.has(field);
  const stops = reads('continue') && json.continue === false;

  let decision = null;
  let reason = null;
  let deprecated = false;
  if (fieldsApply && event === 'PreToolUse') {
    // Both forms count, and the stricter wins (deny > defer > ask > allow).
    // The top-level form is deprecated here: "block" maps to deny, "approve"
    // to allow ("PreToolUse decision control"); block-webfetch.sh and
    // enforce-brief-before-work.sh still speak it. Q2's mixed arms saw a deny
    // from either form win over an allow from the other on 2.1.306. A flip on
    // a later version lowers Q2 to PARTIAL, but a skipped or failed mixed arm
    // leaves it VERIFIED, so a pass doesn't prove this rule. An ask or defer
    // against the other form is unmeasured: the order there comes from the
    // reference's multi-hook precedence, applied by analogy inside one output.
    const picks = [];
    if (typeof hso?.permissionDecision === 'string') picks.push([hso.permissionDecision, hso.permissionDecisionReason ?? null, false]);
    if (json.decision === 'block' || json.decision === 'approve') picks.push([json.decision === 'block' ? 'deny' : 'allow', json.reason ?? null, true]);
    const rank = { deny: 0, defer: 1, ask: 2, allow: 3 };
    picks.sort((x, y) => rank[x[0]] - rank[y[0]]);
    if (picks.length) [decision, reason, deprecated] = picks[0];
  } else if (fieldsApply && TOP_LEVEL_DECISION.has(event) && json.decision === 'block') {
    decision = 'block';
    reason = json.reason ?? null;
  }
  // continue: false "takes precedence over any event-specific decision
  // fields" ("JSON output"). On Stop and SubagentStop, where a block or a
  // context means keep going, the stop wins and neither counts. Exit 2's
  // block stands: the fields "can't override the block" ("Exit code 2").
  const yields = stops && KEEPS_GOING.has(event);
  const jsonBlocks = !yields && (decision === 'block' || (event === 'PreToolUse' && decision === 'deny'));
  const additionalContext = fieldsApply ? hso?.additionalContext ?? null : null;
  const continues = KEEPS_GOING.has(event) && !yields && typeof additionalContext === 'string' && additionalContext.length > 0;
  let blocks = exit2Blocks || jsonBlocks;
  if (exit2Blocks && !jsonBlocks) reason = run.stderr.trim() || reason;
  if (continues && !blocks) reason = additionalContext;
  // A failure on a hook set to onFailure: "block" does what exit 2 does.
  const failureBlocks = !undecided && failure && !exit2Blocks && onFailure === 'block' && !ONFAILURE_IGNORED.has(event) && EXIT2_BLOCKS.has(event);
  if (failureBlocks) blocks = true;

  const o = {
    event,
    blocks,
    continues,
    decision,
    deprecated,
    stderrToClaude: exit2 && !missingFile && STDERR_TO_CLAUDE.has(event),
    stops,
    failure,
    failureBlocks,
    cliTimedOut,
    cliTimeoutMs: limit,
    heldOutput,
    undecided,
    reason,
    additionalContext,
    systemMessage: reads('systemMessage') ? json.systemMessage ?? null : null,
    stdoutKind,
    schemaProblems,
    unmeasuredProblems: unmeasured,
    json,
    run,
  };
  // A null here would read as a hook that let the action through, so on an
  // undecided run each of these is a getter that throws, non-enumerable so a
  // copy, a log line or a deepEqual of the outcome still works.
  if (undecided) {
    for (const k of ['blocks', 'continues', 'stops', 'failure']) {
      Object.defineProperty(o, k, { enumerable: false, get() { throw new Error(`outcome().${k} has no value on an undecided run: ${whyUndecided(o)}`); } });
    }
  }
  return o;
}

function show(o) {
  const problems = [...o.schemaProblems, ...o.unmeasuredProblems];
  const timing = o.cliTimedOut ? ` (ran ${o.run.elapsedMs} ms, past its ${o.cliTimeoutMs} ms CLI timeout)`
    : o.run.timedOut === true ? ` (killed at the harness's ${o.run.timeoutMs} ms timeout)`
      : o.heldOutput ? ` (after ${o.run.elapsedMs} ms; its output stayed open ${o.run.heldMs} ms longer)`
        : o.run.overflowed != null ? ` (the runner's 1 MB buffer cut its ${o.run.overflowed} after ${o.run.elapsedMs} ms)` : '';
  return `exit ${o.run.status}${timing}, stdout ${o.stdoutKind}${problems.length ? ` (${problems.join('; ')})` : ''}: ${JSON.stringify(o.run.stdout.slice(0, 300))}, stderr: ${JSON.stringify(o.run.stderr.slice(0, 300))}`;
}

// Why nobody knows what Claude Code decides on an undecided run, and the way
// out.
function whyUndecided(o) {
  if (o.run.timedOut === true) {
    return `the harness killed the hook at its own ${o.run.timeoutMs} ms timeout, before the ${o.cliTimeoutMs} ms Claude Code gives it, so the run decides nothing (the harness timeout is not the CLI's): raise runHook's timeoutMs, or pass the hook entry's own timeout as hookTimeoutS, in seconds (${show(o)})`;
  }
  if (o.heldOutput) {
    return `the hook exited, but a background process it started held its stdout or stderr open ${o.run.heldMs} ms longer (past the harness's ${PIPE_HELD_MS} ms margin). Claude Code stops reading shortly after the hook's own process exits: a decision printed later is ignored, and an allow followed by an unredirected background process is blocked ('refusing to honor the suspect capture', hooks reference "Hooks that start a background process"). So the run decides nothing: print the decision before starting the background process, and redirect that process's stdout and stderr (cmd >/dev/null 2>&1 &) (${show(o)})`;
  }
  if (o.run.overflowed != null) {
    return `the hook wrote more than the runner's 1 MB buffer holds on its ${o.run.overflowed}, so the harness's buffer, not the CLI, cut the hook short (the reference gives Claude Code no output size at which a hook fails), and the run decides nothing: send the bulk of it (a set -x trace, debug output) to a file, or write less (${show(o)})`;
  }
  return `the hook's JSON breaks a rule the reference gives no type for and no probe has measured (${o.unmeasuredProblems.join('; ')}), so nobody knows whether Claude Code reads it as a schema failure or acts on its decision, and the run decides nothing: send an object, or measure the rule first (${show(o)})`;
}

// Neither assert reads a run whose decision nobody knows, and each refusal
// names the way out.
function decided(o) {
  if (o.undecided) assert.fail(whyUndecided(o));
}

// What a PreToolUse ask or defer leaves to the session, or null: the hook's
// word doesn't settle whether the call goes ahead. An ask prompts the user,
// and a -p run, where nobody can answer, denies the call (:1926-1927); a
// defer ends a -p turn with the call unrun, and an interactive session
// ignores it with a warning ("Defer a tool call for later").
function leftToSession(o) {
  if (o.event !== 'PreToolUse') return null;
  if (o.decision === 'ask') return 'asks (permissionDecision "ask"): an interactive session prompts the user, and a -p run, where nobody can answer, denies the call (hooks reference :1926-1927)';
  if (o.decision === 'defer') return 'defers (permissionDecision "defer"): a -p run ends the turn with the call unrun, and an interactive session ignores it with a warning (hooks reference :1926, "Defer a tool call for later")';
  return null;
}

// On Stop and SubagentStop a context keeps Claude going as surely as a block,
// so it counts here; o.blocks alone says the hook took the error path. A
// block by decision there must carry a reason: the reference calls it
// required (:2771), and no probe has measured what the CLI does without one,
// so a gate test fails closed until one does.
export function assertBlocks(o, { reason } = {}) {
  decided(o);
  const session = leftToSession(o);
  assert.ok(o.blocks || o.continues, session
    ? `expected the hook to block, but it ${session}, so the session decides, not the hook: a call the gate must stop takes a deny (${show(o)})`
    : `expected the hook to block, but it lets the action through (${show(o)})`);
  if (KEEPS_GOING.has(o.event) && o.decision === 'block' && o.run.status !== 2) {
    assert.ok(typeof o.reason === 'string' && o.reason.trim() !== '', `a ${o.event} hook blocked by decision with no reason, which the reference requires (${show(o)})`);
  }
  if (reason) assert.match(o.reason ?? '', reason, `blocked, but the reason doesn't match (${show(o)})`);
}

export function assertPasses(o) {
  decided(o);
  const held = o.stops ? 'stops Claude' : o.blocks ? 'blocks it' : o.continues ? 'keeps Claude from stopping (a Stop context, probe Q1)' : null;
  assert.ok(!held, `expected the action to go ahead, but the hook ${held} (${show(o)})`);
  const session = leftToSession(o);
  assert.ok(!session, `expected the action to go ahead, but the hook ${session}, so the session decides, not the hook: a call the gate lets through takes an allow, or no decision (${show(o)})`);
  assert.ok(!o.failure, `the action goes ahead, but only because the hook failed (${show(o)})`);
}

// The names in a folder; none when it doesn't exist.
const listing = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };

// A fixture: tests/fixtures/<Event>/<name>.json, with `overrides` merged on top
// (one level deep for tool_input and tool_response). Event and name are
// matched against the folder listings, never opened as a path: a name with a
// separator would load a file from another folder, a case mismatch loads on
// NTFS but not on CI's ubuntu, and allFixtures() validates neither.
export function fixture(event, name, overrides = {}) {
  if (!listing(FIXTURES).includes(event) || !listing(path.join(FIXTURES, event)).includes(`${name}.json`)) {
    throw new Error(`no fixture ${event}/${name}.json: the event and the name must match a folder and a file exactly (same case, no separators)`);
  }
  const base = JSON.parse(fs.readFileSync(path.join(FIXTURES, event, `${name}.json`), 'utf8'));
  const out = { ...base, ...overrides };
  for (const k of ['tool_input', 'tool_response']) {
    if (base[k] && overrides[k] && typeof overrides[k] === 'object') out[k] = { ...base[k], ...overrides[k] };
  }
  return out;
}

// Every fixture under `root`: [{event, name, file, input}]. A folder, or a
// .json spelled in another case, inside an event folder throws: neither is
// validated, and fixture() can't load either on every OS.
export function allFixtures(root = FIXTURES) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const event of fs.readdirSync(root)) {
    const dir = path.join(root, event);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, f);
      if (fs.statSync(file).isDirectory()) throw new Error(`${event}/${f} is a folder: a fixture sits directly in its event folder, where allFixtures() validates it`);
      if (!/\.json$/i.test(f)) continue;
      if (!f.endsWith('.json')) throw new Error(`${event}/${f}: a fixture's extension is .json in lower case`);
      out.push({ event, name: f.slice(0, -5), file, input: JSON.parse(fs.readFileSync(file, 'utf8')) });
    }
  }
  return out;
}

// The private sizable-work oracle, reachable only through FLOW_ORACLE_DIR (it
// holds real session data, so it never enters this public folder). Null when
// the variable is unset or names no folder: oracle tests skip, in CI always.
export function oracleDir() {
  const d = process.env.FLOW_ORACLE_DIR;
  return d && fs.existsSync(d) && fs.statSync(d).isDirectory() ? d : null;
}
