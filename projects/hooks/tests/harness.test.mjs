// The harness has to be able to fail. Each planted script below is a hook a
// careless reading would score wrong; the assertions must score it the way
// Claude Code does.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { assertBlocks, assertPasses, outcome, parseStdout, PIPE_HELD_MS, runHook, setRunner, unmeasuredProblems, validateOutput } from './harness.mjs';
import { atOrAfter, bufferStep } from './hook-runner.mjs';

const WIN = process.platform === 'win32';

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-harness-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

// A node hook whose body is `src`, run with the given stdin.
function plant(name, src, input = { hook_event_name: 'PreToolUse' }, opts) {
  const file = path.join(dir, `${name}.mjs`);
  fs.writeFileSync(file, src);
  return runHook([process.execPath, file], input, opts);
}

const print = (obj) => `process.stdout.write(${JSON.stringify(JSON.stringify(obj))});`;

describe('planted hooks the assertions must catch', () => {
  test('an always-pass hook fails an assertion that expects a block', () => {
    const o = outcome('PreToolUse', plant('always-pass', 'process.exit(0);'));
    assert.throws(() => assertBlocks(o), /expected the hook to block/);
    assertPasses(o);
  });

  test('exit 1 is not a block: the action goes ahead, as a hook failure', () => {
    const o = outcome('PreToolUse', plant('exit-1', 'console.error("nope"); process.exit(1);'));
    assert.equal(o.blocks, false);
    assert.equal(o.failure, true);
    assert.throws(() => assertBlocks(o));
    assert.throws(() => assertPasses(o), /only because the hook failed/);
  });

  test('a block printed after a profile echo is plain text, so nothing blocks', () => {
    const o = outcome('Stop', plant('echo-then-json', `process.stdout.write("profile loaded\\n"); ${print({ decision: 'block', reason: 'x' })}`));
    assert.equal(o.stdoutKind, 'text');
    assert.equal(o.blocks, false);
  });

  test('exit 2 blocks even when the JSON says allow, and the reason is stderr', () => {
    const o = outcome('PreToolUse', plant('exit-2-allow', `${print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } })} process.stderr.write("held"); process.exit(2);`));
    assertBlocks(o, { reason: /^held$/ });
    assert.equal(o.decision, 'allow');
  });

  test('an exit-1 hook printing a valid deny still denies: with valid JSON the fields decide', () => {
    const o = outcome('PreToolUse', plant('exit-1-deny', `${print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'r' } })} process.exit(1);`));
    assertBlocks(o, { reason: /^r$/ });
    assert.equal(o.failure, true, 'an exit other than 0 or 2 counts as a failure under onFailure');
  });

  test('two JSON lines where one sets a field are a parse failure, not a decision', () => {
    const o = outcome('Stop', plant('two-lines', `process.stdout.write('{}\\n{"decision":"block","reason":"x"}\\n');`));
    assert.equal(o.stdoutKind, 'invalid');
    assert.equal(o.blocks, false);
    assert.equal(o.failure, true);
  });
});

describe('decisions per event', () => {
  test('PreToolUse permissionDecision deny blocks, with its reason', () => {
    const o = outcome('PreToolUse', plant('deny', print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'no' } })));
    assertBlocks(o, { reason: /^no$/ });
    assert.equal(o.deprecated, false);
  });

  test('PreToolUse ask and allow do not block', () => {
    for (const d of ['ask', 'allow']) {
      const o = outcome('PreToolUse', plant(`pd-${d}`, print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: d } })));
      assert.equal(o.blocks, false, d);
      assert.equal(o.decision, d);
    }
  });

  test('a PreToolUse ask or defer passes neither assert: the session decides whether the call goes ahead, not the hook', () => {
    for (const [d, why] of [['ask', /asks .*a -p run, where nobody can answer, denies the call/], ['defer', /defers .*a -p run ends the turn with the call unrun/]]) {
      const o = outcome('PreToolUse', plant(`pd-session-${d}`, print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: d } })));
      assert.equal(o.blocks, false, d);
      assert.equal(o.failure, false, d);
      assert.throws(() => assertPasses(o), why, d);
      assert.throws(() => assertBlocks(o), why, d);
    }
    // A deny in the other form still outranks an ask, and the run blocks.
    // Unmeasured: Q2 mixes the forms only with an allow; this order is the
    // reference's multi-hook precedence (deny > defer > ask > allow), with
    // block mapped to deny, applied inside one output by analogy.
    assertBlocks(outcome('PreToolUse', plant('ask-vs-old-block', print({ decision: 'block', reason: 'old', hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask' } }))), { reason: /^old$/ });
  });

  test('the deprecated top-level PreToolUse block maps to deny', () => {
    const o = outcome('PreToolUse', plant('deprecated-block', print({ decision: 'block', reason: 'old' })));
    assertBlocks(o, { reason: /^old$/ });
    assert.equal(o.decision, 'deny');
    assert.equal(o.deprecated, true);
  });

  test('when the two PreToolUse forms disagree, the deny wins either way (Q2\'s mixed arms on 2.1.306; a later flip lowers Q2 to PARTIAL, but a skipped mixed arm leaves it VERIFIED, so a pass does not prove this)', () => {
    const a = outcome('PreToolUse', plant('allow-vs-old-block', print({ decision: 'block', reason: 'old', hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } })));
    assertBlocks(a, { reason: /^old$/ });
    assert.equal(a.deprecated, true);
    const b = outcome('PreToolUse', plant('deny-vs-old-approve', print({ decision: 'approve', hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'new' } })));
    assertBlocks(b, { reason: /^new$/ });
    assert.equal(b.deprecated, false);
  });

  test('PostToolUse exit 2 cannot block (the tool already ran) but its stderr reaches Claude', () => {
    const o = outcome('PostToolUse', plant('post-exit-2', 'process.stderr.write("late"); process.exit(2);'));
    assert.equal(o.blocks, false);
    assert.equal(o.stderrToClaude, true);
  });

  test('exit 2 on UserPromptSubmit or ConfigChange blocks, but its stderr never reaches Claude', () => {
    for (const event of ['UserPromptSubmit', 'ConfigChange']) {
      const o = outcome(event, plant(`exit-2-${event}`, 'process.stderr.write("no"); process.exit(2);'));
      assertBlocks(o);
      assert.equal(o.stderrToClaude, false, event);
    }
  });

  test('PostToolUse decision block is honored', () => {
    assertBlocks(outcome('PostToolUse', plant('post-block', print({ decision: 'block', reason: 'look' }))), { reason: /^look$/ });
  });

  test('Stop blocks by exit 2 and by decision block', () => {
    assertBlocks(outcome('Stop', plant('stop-exit-2', 'process.stderr.write("keep going"); process.exit(2);')), { reason: /keep going/ });
    assertBlocks(outcome('Stop', plant('stop-block', print({ decision: 'block', reason: 'not yet' }))), { reason: /^not yet$/ });
  });

  test('a Stop or SubagentStop block by decision with no reason fails assertBlocks: the reference requires one, and the CLI\'s answer is unmeasured', () => {
    for (const event of ['Stop', 'SubagentStop']) {
      for (const [name, out] of [['none', { decision: 'block' }], ['blank', { decision: 'block', reason: ' ' }]]) {
        const o = outcome(event, plant(`no-reason-${event}-${name}`, print(out)));
        assert.equal(o.blocks, true, `${event} ${name}: outcome() still reads the block`);
        assert.throws(() => assertBlocks(o), /blocked by decision with no reason/, `${event} ${name}`);
      }
    }
    assertBlocks(outcome('PostToolUse', plant('post-block-bare', print({ decision: 'block' }))));
  });

  test('a Stop or SubagentStop context keeps Claude from stopping, so it never passes (probe Q1, 2.1.306)', () => {
    for (const event of ['Stop', 'SubagentStop']) {
      const o = outcome(event, plant(`ctx-${event}`, print({ hookSpecificOutput: { hookEventName: event, additionalContext: 'run the tests first' } })));
      assert.equal(o.continues, true, event);
      assert.equal(o.blocks, false, `${event}: hook feedback, not the error path`);
      assert.equal(o.additionalContext, 'run the tests first');
      assert.throws(() => assertPasses(o), /keeps Claude from stopping/, event);
      assertBlocks(o, { reason: /^run the tests first$/ });
    }
    assertPasses(outcome('Stop', plant('ctx-empty', print({ hookSpecificOutput: { hookEventName: 'Stop', additionalContext: '' } }))));
    assertPasses(outcome('PostToolUse', plant('ctx-post', print({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'note' } }))));
  });

  test('on Stop, continue: false takes precedence over a block and over a context', () => {
    const b = outcome('Stop', plant('stop-block-halt', print({ decision: 'block', reason: 'more', continue: false, stopReason: 'halt' })));
    assert.equal(b.stops, true);
    assert.equal(b.blocks, false);
    assert.throws(() => assertBlocks(b), /expected the hook to block/);
    const c = outcome('Stop', plant('stop-ctx-halt', print({ continue: false, hookSpecificOutput: { hookEventName: 'Stop', additionalContext: 'ctx' } })));
    assert.equal(c.stops, true);
    assert.equal(c.continues, false);
  });

  test('a top-level block on an event without decision control decides nothing', () => {
    assert.equal(outcome('SessionStart', plant('ss-block', print({ decision: 'block', reason: 'x' }))).blocks, false);
  });

  test('continue: false stops Claude', () => {
    const o = outcome('PostToolUse', plant('continue-false', print({ continue: false, stopReason: 'halt' })));
    assert.equal(o.stops, true);
    assert.throws(() => assertPasses(o), /stops Claude/);
  });
});

// The CLI's timeout decides, never the harness's. A slow CI runner only adds
// time, so each hook sleeps past the limit it must cross and stays seconds
// under the one it must not.
describe('timeouts', () => {
  // Prints a deny, then hangs until something kills it.
  const HANG = `${print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'late' } })} setTimeout(() => {}, 120000);`;
  // A run shaped as runHook returns one, for the limits alone.
  const ran = (extra) => ({ status: 0, stdout: '', stderr: '', timedOut: false, error: null, elapsedMs: 5, timeoutMs: 15_000, ...extra });

  test('a hook the CLI cancels renders no decision unless onFailure is block', () => {
    // The harness kills it at 2 s, past the 0.5 s its entry configures, so the CLI canceled it first.
    const r = plant('hang-cli', HANG, undefined, { timeoutMs: 2000 });
    assert.equal(r.timedOut, true);
    const o = outcome('PreToolUse', r, { hookTimeoutS: 0.5 });
    assert.equal(o.cliTimedOut, true);
    assert.equal(o.undecided, false);
    assert.equal(o.failure, true);
    assert.equal(o.decision, null, 'a canceled hook\'s output is discarded');
    assert.equal(o.blocks, false);
    const b = outcome('PreToolUse', r, { hookTimeoutS: 0.5, onFailure: 'block' });
    assert.equal(b.failureBlocks, true);
    assertBlocks(b);
  });

  test('a hook the harness killed before its CLI timeout is undecided, and both asserts refuse it', () => {
    const r = plant('hang-harness', HANG, undefined, { timeoutMs: 1500 });
    for (const opts of [{}, { onFailure: 'block' }]) {
      const o = outcome('PreToolUse', r, opts);
      assert.equal(o.undecided, true);
      assert.equal(o.cliTimeoutMs, 600_000);
      assert.equal(o.failureBlocks, false, 'the harness\'s kill is no failure of the CLI\'s');
      // The deny it printed decides only if the hook exits in time, which nobody saw.
      for (const k of ['blocks', 'failure']) assert.throws(() => o[k], /has no value on an undecided run.*harness timeout is not the CLI's/, k);
      for (const check of [assertBlocks, assertPasses]) assert.throws(() => check(o), /harness timeout is not the CLI's.*hookTimeoutS, in seconds/, check.name);
    }
  });

  test('a hook that runs past its CLI timeout timed out there, though the harness let it finish', () => {
    const r = plant('slow-allow', `setTimeout(() => { ${print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } })} }, 1200);`);
    assert.equal(r.timedOut, false);
    assertPasses(outcome('PreToolUse', r));
    const o = outcome('PreToolUse', r, { hookTimeoutS: 0.3 });
    assert.equal(o.cliTimedOut, true);
    assert.equal(o.decision, null);
    assert.throws(() => assertPasses(o), /only because the hook failed/);
    assertBlocks(outcome('PreToolUse', r, { hookTimeoutS: 0.3, onFailure: 'block' }));
  });

  test('the hook entry\'s timeout is read in its own unit, seconds: an entry\'s 10 is 10 s, never 10 ms', () => {
    const quick = ran({ elapsedMs: 50 });
    const o = outcome('PreToolUse', quick, { hookTimeoutS: 10, onFailure: 'block' });
    assert.equal(o.cliTimeoutMs, 10_000);
    assert.equal(o.cliTimedOut, false);
    assertPasses(o);
    assert.throws(() => assertBlocks(o), /expected the hook to block/);
    assert.equal(outcome('PreToolUse', quick, { hookTimeoutS: 0.04 }).cliTimedOut, true, 'a fraction of a second counts');
    // An ms-sized or misspelled option would fall back to the event's default unseen.
    assert.throws(() => outcome('PreToolUse', quick, { cliTimeoutMs: 10, onFailure: 'block' }), /not cliTimeoutMs: the hook entry's timeout goes in as hookTimeoutS, in seconds/);
    assert.throws(() => outcome('PreToolUse', quick, { onfailure: 'block' }), /takes onFailure, plugin, hookTimeoutS, not onfailure$/);
  });

  test('UserPromptSubmit gets 30 s: past it the context drops, and onFailure block blocks the prompt', () => {
    const late = ran({ stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: 'ctx' } }), elapsedMs: 31_000, timeoutMs: 60_000 });
    const o = outcome('UserPromptSubmit', late);
    assert.equal(o.cliTimedOut, true);
    assert.equal(o.additionalContext, null);
    assert.equal(o.blocks, false);
    assert.equal(outcome('UserPromptSubmit', late, { onFailure: 'block' }).blocks, true);
    assert.equal(outcome('UserPromptSubmit', late, { hookTimeoutS: 45 }).additionalContext, 'ctx', 'a configured timeout replaces the default');
    assert.equal(outcome('PreToolUse', ran({ elapsedMs: 31_000, timeoutMs: 60_000 })).cliTimedOut, false, 'PreToolUse keeps 600 s');
    for (const bad of ['30', 0, -1, Infinity]) assert.throws(() => outcome('PreToolUse', ran(), { hookTimeoutS: bad }), /timeout in seconds/, String(bad));
  });

  test('a SessionEnd hook gets a 1.5 s budget, which its own timeout raises up to 60 s and a plugin hook\'s does not', () => {
    const r = plant('sessionend-2s', 'setTimeout(() => {}, 2000);', { hook_event_name: 'SessionEnd' });
    const o = outcome('SessionEnd', r);
    assert.equal(o.cliTimedOut, true);
    assert.throws(() => assertPasses(o), /only because the hook failed/);
    assertPasses(outcome('SessionEnd', r, { hookTimeoutS: 10 }));
    assert.equal(outcome('SessionEnd', r, { hookTimeoutS: 10, plugin: true }).cliTimedOut, true);
    assert.equal(outcome('SessionEnd', ran(), { hookTimeoutS: 120 }).cliTimeoutMs, 60_000);
  });
});

// Claude Code stops reading shortly after the hook's own process exits, so a
// background process that holds the hook's output open makes a run spawnSync
// reads one way and the CLI another (hooks reference, "Hooks that start a
// background process").
describe('a background process the hook starts', () => {
  const DENY = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'late' } };
  const ALLOW = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } };
  const refused = /held its stdout or stderr open .*suspect capture.*redirect that process's stdout and stderr/s;
  // Starts `src` in a node process the hook doesn't wait for, as a shell's `&`
  // does, on the hook's own stdout and stderr ('inherit') or with them
  // redirected ('ignore'); `err` sets stderr apart. Node kills a child it
  // didn't detach when it exits on Windows (a job object), so the child is
  // detached there; on POSIX it stays in the hook's process group, as a
  // shell's background job does.
  const background = (src, out, err = out) => `(await import('node:child_process')).spawn(process.execPath, ['-e', ${JSON.stringify(src)}], { stdio: ['ignore', '${out}', '${err}'], detached: process.platform === 'win32' }).unref();`;
  const bash = (name, script) => {
    const file = path.join(dir, `${name}.sh`);
    fs.writeFileSync(file, script);
    return runHook(['bash', file], { hook_event_name: 'PreToolUse' });
  };

  test('a deny a background process prints after the hook exits is undecided, though spawnSync would read it', () => {
    const node = plant('bg-late-deny', `${background(`setTimeout(() => process.stdout.write(${JSON.stringify(JSON.stringify(DENY))}), 700)`, 'inherit')} process.exit(0);`);
    const sh = bash('bg-late-deny', `(sleep 0.7; echo '${JSON.stringify(DENY)}') &\nexit 0\n`);
    for (const r of [node, sh]) {
      assert.match(r.stdout, /"late"/, 'the late deny reached the pipe');
      const o = outcome('PreToolUse', r, { onFailure: 'block' });
      for (const check of [assertBlocks, assertPasses]) assert.throws(() => check(o), refused, check.name);
      assert.equal(o.heldOutput, true);
      assert.equal(o.undecided, true);
      assert.throws(() => o.blocks, refused);
      assert.equal(o.failureBlocks, false);
      assert.ok(r.heldMs > PIPE_HELD_MS, `held ${r.heldMs} ms`);
      assert.ok(r.elapsedMs < 700, `elapsedMs is the hook's own run time, not the background job's: ${r.elapsedMs}`);
    }
  });

  test('an allow followed by a background process on the hook\'s output is undecided (the CLI blocks that call)', () => {
    const node = plant('bg-allow-unredirected', `${print(ALLOW)} ${background('setTimeout(() => {}, 700)', 'inherit')} process.exit(0);`);
    const sh = bash('bg-allow-unredirected', `echo '${JSON.stringify(ALLOW)}'\nsleep 0.7 &\n`);
    for (const r of [node, sh]) {
      const o = outcome('PreToolUse', r);
      assert.throws(() => assertPasses(o), refused);
      assert.throws(() => assertBlocks(o), refused);
      assert.equal(o.heldOutput, true, `held ${r.heldMs} ms`);
      assert.equal(o.decision, null, 'no decision is read from a held run');
    }
  });

  test('a background process that holds only stderr open reads held too (the common >/dev/null &)', () => {
    const node = plant('bg-stderr-only', `${print(ALLOW)} ${background('setTimeout(() => {}, 700)', 'ignore', 'inherit')} process.exit(0);`);
    const sh = bash('bg-stderr-only', `echo '${JSON.stringify(ALLOW)}'\nsleep 0.7 >/dev/null &\n`);
    for (const r of [node, sh]) {
      const o = outcome('PreToolUse', r);
      assert.equal(o.heldOutput, true, `held ${r.heldMs} ms: the run must time the close of stderr as well as stdout`);
      for (const check of [assertBlocks, assertPasses]) assert.throws(() => check(o), refused, check.name);
    }
  });

  // On Windows nothing built in reaches the job once the hook has exited
  // (hook-runner.mjs says why), so it runs to its own end there.
  test('a background job still holding the output when the run ends dies with the hook\'s process group', { skip: WIN && 'POSIX only: no built-in reaches a Windows job once the hook has exited' }, async () => {
    // The hook prints its job's pid and exits; the job holds both pipes for
    // 20 s, well past the 1 s timeout, so the run ends with them open.
    const job = `const c = (await import('node:child_process')).spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], { stdio: ['ignore', 'inherit', 'inherit'] }); process.stdout.write(String(c.pid)); process.exit(0);`;
    const r = plant('bg-outlives-run', job, undefined, { timeoutMs: 1000 });
    const pid = Number(r.stdout);
    assert.ok(pid > 0, `the hook printed its job's pid: ${JSON.stringify(r.stdout)}`);
    const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
    try {
      assert.equal(r.timedOut, false, 'the hook exited on its own');
      assert.ok(r.heldMs > PIPE_HELD_MS, `held ${r.heldMs} ms`);
      // A POSIX zombie answers signal 0 until init reaps it.
      for (let i = 0; i < 30 && alive(); i++) await new Promise((res) => setTimeout(res, 100));
      assert.equal(alive(), false, `the job ${pid} outlived the run`);
    } finally {
      if (alive()) process.kill(pid, 'SIGKILL');
    }
  });

  test('output still held when the harness timeout comes, just after the exit, reads as held, not as closed with the exit', (t) => {
    // The hook exits 150 ms before the runner's deadline, timed from its own
    // start (just after the runner's), while its background process holds
    // the output for 3 s.
    const timeoutMs = 1500;
    const r = plant('bg-held-at-deadline', `${print(ALLOW)} ${background('setTimeout(() => {}, 3000)', 'inherit')} setTimeout(() => process.exit(0), ${timeoutMs - 150} - performance.now());`, undefined, { timeoutMs });
    // Killed before any exit of its own (heldMs null): the case never arose.
    if (r.timedOut && r.heldMs === null) return t.skip(`the hook started too late to exit before the ${timeoutMs} ms timeout (elapsedMs ${r.elapsedMs})`);
    assert.equal(r.timedOut, false, 'the hook exited on its own before the timeout');
    const o = outcome('PreToolUse', r);
    assert.throws(() => assertPasses(o), refused);
    assert.ok(r.heldMs > PIPE_HELD_MS, `held ${r.heldMs} ms: the runner stopped reading at its deadline instead of reading on past the exit`);
  });

  test('a hook that prints its decision and exits reads as usual, its output closed with it', () => {
    const r = plant('print-exit', `${print(DENY)} process.exit(0);`);
    assert.equal(typeof r.heldMs, 'number');
    assert.ok(r.heldMs <= PIPE_HELD_MS, `held ${r.heldMs} ms`);
    const o = outcome('PreToolUse', r);
    assert.equal(o.heldOutput, false);
    assertBlocks(o, { reason: /^late$/ });
  });

  test('the documented pattern reads as usual: print the decision, then a background job with its output redirected', () => {
    const node = plant('bg-redirected', `${print(DENY)} ${background('setTimeout(() => {}, 2000)', 'ignore')} process.exit(0);`);
    const sh = bash('bg-redirected', `echo '${JSON.stringify(DENY)}'\nsleep 2 >/dev/null 2>&1 &\n`);
    for (const r of [node, sh]) {
      assert.equal(typeof r.heldMs, 'number');
      assert.ok(r.heldMs <= PIPE_HELD_MS, `held ${r.heldMs} ms`);
      assert.ok(r.elapsedMs < 2000, `the run ended with the hook, not the job: ${r.elapsedMs} ms`);
      assertBlocks(outcome('PreToolUse', r), { reason: /^late$/ });
    }
  });

  test('outcome() holds heldMs against PIPE_HELD_MS, and a CLI timeout or a harness kill comes first', () => {
    const ran = (extra) => ({ status: 0, stdout: JSON.stringify(DENY), stderr: '', timedOut: false, error: null, elapsedMs: 20, timeoutMs: 15_000, ...extra });
    assertBlocks(outcome('PreToolUse', ran({ heldMs: PIPE_HELD_MS })));
    // A hand-built run with no heldMs reads as one whose output closed with the exit.
    assertBlocks(outcome('PreToolUse', ran()));
    const held = outcome('PreToolUse', ran({ heldMs: PIPE_HELD_MS + 1 }), { onFailure: 'block' });
    assert.equal(held.undecided, true);
    assert.throws(() => assertBlocks(held), refused);
    const canceled = outcome('PreToolUse', ran({ elapsedMs: 700, heldMs: 5_000 }), { hookTimeoutS: 0.5 });
    assert.equal(canceled.cliTimedOut, true);
    assert.equal(canceled.heldOutput, false, 'the CLI canceled the hook before it exited');
    assert.equal(canceled.failure, true);
    const killed = outcome('PreToolUse', ran({ status: null, timedOut: true, elapsedMs: 1_500, timeoutMs: 1_500, heldMs: 5_000 }));
    assert.equal(killed.heldOutput, false);
    assert.throws(() => assertBlocks(killed), /harness timeout is not the CLI's/);
  });
});

describe('the harness timeout', () => {
  test('kills the hook with everything it started, so no background process outlives the run', async () => {
    // The child is detached on Windows only, for the reason background() gives.
    const src = `const c = (await import('node:child_process')).spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore', detached: process.platform === 'win32' }); process.stdout.write(String(c.pid)); setTimeout(() => {}, 120000);`;
    const r = plant('hang-with-child', src, undefined, { timeoutMs: 1500 });
    const pid = Number(r.stdout);
    assert.ok(pid > 0, `the hook printed its child's pid: ${JSON.stringify(r.stdout)}`);
    const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
    try {
      assert.equal(r.timedOut, true);
      assert.equal(r.status, null, 'a killed hook has no exit status');
      // A POSIX zombie answers signal 0 until init reaps it.
      for (let i = 0; i < 30 && alive(); i++) await new Promise((res) => setTimeout(res, 100));
      assert.equal(alive(), false, `the hook's child ${pid} outlived the harness's kill`);
      assert.equal(r.heldMs, null, 'nor an exit of its own to hold output past');
      assert.ok(r.elapsedMs >= 1500 && r.elapsedMs < 1500 + 1000, `elapsedMs ends at the kill, not at the exit it brought: ${r.elapsedMs}`);
    } finally {
      if (alive()) process.kill(pid);
    }
  });

  test('the runner\'s deadline never fires before its time, though one setTimeout can', () => {
    // A timer as Node runs one: the delay truncated and counted from a clock
    // floored to the ms, so it can fire up to ~2 ms before the time asked for.
    let t = 100.9;
    const queue = [];
    const schedule = (fn, ms) => queue.push({ fn, due: Math.floor(t) + Math.max(1, Math.trunc(ms)) });
    const fired = [];
    atOrAfter(1600.6, () => fired.push(t), { now: () => t, schedule });
    while (queue.length) {
      const { fn, due } = queue.shift();
      t = Math.max(t, due);
      fn();
    }
    assert.equal(fired.length, 1);
    assert.ok(fired[0] >= 1600.6, `fired at ${fired[0]}, before the deadline`);
    // Node fires a delay past 2^31-1 ms at once, so no wait asks for more.
    const delays = [];
    atOrAfter(2 ** 32, () => {}, { now: () => 0, schedule: (fn, ms) => delays.push(ms) });
    assert.deepEqual(delays, [2 ** 31 - 1]);
  });

  test("bytes past the buffer after the deadline's kill name no overflow and kill nothing again", () => {
    const fresh = { overflowed: null, killedAt: null };
    assert.deepEqual(bufferStep({ ...fresh, size: 4 }, 6, 10), { keep: true, overflow: false }, 'a stream exactly at the buffer keeps the chunk');
    assert.deepEqual(bufferStep({ ...fresh, size: 4 }, 7, 10), { keep: false, overflow: true }, 'the first chunk past it is the overflow');
    assert.deepEqual(bufferStep({ size: 4, overflowed: 'stdout', killedAt: 50 }, 7, 10), { keep: false, overflow: false }, 'only the first stream past the buffer is named');
    // The deadline killed the hook (killedAt set, no overflow yet); what was
    // still in the pipe then passes the buffer. That run ended as a timeout.
    assert.deepEqual(bufferStep({ size: 4, overflowed: null, killedAt: 900 }, 7, 10), { keep: false, overflow: false });
    // The default is spawnSync's 1 MB, the size runHook read before the runner.
    assert.deepEqual(bufferStep({ ...fresh, size: 1024 * 1024 }, 0), { keep: true, overflow: false });
    assert.deepEqual(bufferStep({ ...fresh, size: 1024 * 1024 }, 1), { keep: false, overflow: true });
  });
});

// runHook never scores a broken harness: a run onFailure 'block' read as a
// hook that couldn't start would pass assertBlocks.
describe('a runner that gives no result', () => {
  for (const [name, src, why] of [
    ['exits with no JSON', 'process.stderr.write("runner broke"); process.exit(1);', /gave no result \(exit 1\): runner broke/],
    ['hangs past the slack', 'setTimeout(() => {}, 60000);', /gave no result \(exit null, ETIMEDOUT\)/],
  ]) {
    test(`makes runHook throw: one that ${name}`, () => {
      const file = path.join(dir, `runner-${name.replace(/\W+/g, '-')}.mjs`);
      fs.writeFileSync(file, src);
      const prev = setRunner({ argv: [process.execPath, file], slackMs: 500 });
      try {
        const t0 = performance.now();
        assert.throws(() => runHook([process.execPath, '-e', ''], { hook_event_name: 'PreToolUse' }, { timeoutMs: 200 }), why);
        // The hang ends at 200 ms plus the 500 ms slack set here; the default
        // slack would take ~30 s and still throw the same error.
        const took = performance.now() - t0;
        assert.ok(took < 10_000, `runHook took ${Math.round(took)} ms: it waited out the default slack, not setRunner's 500 ms`);
      } finally {
        setRunner(prev);
      }
    });
  }
});

describe('failures and onFailure', () => {
  test('a hook that cannot start fails; onFailure block blocks it on PreToolUse but not on Stop', () => {
    const r = runHook([path.join(dir, 'no-such-hook.exe')], {});
    assert.ok(r.error, 'spawning a missing executable must report an error');
    const o = outcome('PreToolUse', r);
    assert.equal(o.failure, true);
    assert.equal(o.blocks, false);
    assert.equal(outcome('PreToolUse', r, { onFailure: 'block' }).blocks, true);
    assert.equal(outcome('Stop', r, { onFailure: 'block' }).blocks, false);
  });

  test('output past the runner\'s 1 MB buffer is the harness\'s cut, not a failure: undecided, so onFailure block can\'t pass assertBlocks', () => {
    const allow = print({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } });
    // About 1.08 MB of trace on stderr, as set -x writes it.
    const flood = 'process.stderr.write("+ set -x\\n".repeat(120_000));';
    for (const [name, src] of [['flood-then-allow', `${flood} ${allow}`], ['allow-then-flood', `${allow} ${flood} setTimeout(() => {}, 60000);`]]) {
      const r = plant(name, src);
      assert.equal(r.overflowed, 'stderr', name);
      assert.equal(r.error, null, `${name}: the buffer's cut is no start failure`);
      const o = outcome('PreToolUse', r, { onFailure: 'block' });
      assert.equal(o.undecided, true, name);
      assert.equal(o.failureBlocks, false, name);
      for (const check of [assertBlocks, assertPasses]) assert.throws(() => check(o), /runner's 1 MB buffer holds on its stderr, so the harness's buffer, not the CLI, cut the hook short/, `${name} ${check.name}`);
    }
  });

  test('a buffer cut just before the harness timeout stays the buffer\'s, never relabeled a timeout the CLI would share', (t) => {
    // The hook floods stderr 60 ms before the runner's deadline, timed from
    // its own start (just after the runner's). The kill can outlast the
    // deadline (taskkill takes a while), and the deadline must leave the run
    // to it: a timeout at the entry's own limit would read as the CLI's.
    const timeoutMs = 1000;
    const r = plant('flood-at-deadline', `setTimeout(() => process.stderr.write("+ set -x\\n".repeat(120_000)), ${timeoutMs - 60} - performance.now()); setTimeout(() => {}, 60000);`, undefined, { timeoutMs });
    // A deadline that kills first ends the run as a timeout; bytes past the
    // buffer after that name no overflow (bufferStep).
    if (r.overflowed === null) return t.skip(`the deadline came before the flood passed the buffer (elapsedMs ${r.elapsedMs})`);
    assert.equal(r.timedOut, false, 'the buffer cut the hook, not the timeout');
    // elapsedMs is rounded, so a kill under 0.5 ms before the deadline reads as at it.
    if (r.elapsedMs >= timeoutMs) return t.skip(`the buffer's kill landed at the deadline itself (elapsedMs ${r.elapsedMs})`);
    const o = outcome('PreToolUse', r, { hookTimeoutS: timeoutMs / 1000, onFailure: 'block' });
    assert.equal(o.cliTimedOut, false);
    assert.throws(() => assertBlocks(o), /1 MB buffer holds on its stderr/);
  });

  test('the fixture reaches the hook on stdin, byte for byte', () => {
    const input = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: "echo 'a & b'" } };
    const r = plant('echo-stdin', 'process.stdin.pipe(process.stdout);', input);
    assert.deepEqual(JSON.parse(r.stdout), input);
  });
});

describe('output that fails the schema decides nothing', () => {
  const pre = (extra) => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', ...extra } });

  test('a permissionDecision outside allow|deny|ask|defer is a non-blocking error, not a block', () => {
    const o = outcome('PreToolUse', plant('pd-block', print(pre({ permissionDecision: 'block', permissionDecisionReason: 'r' }))));
    assert.equal(o.stdoutKind, 'invalid');
    assert.equal(o.failure, true);
    assert.equal(o.decision, null);
    assert.throws(() => assertBlocks(o), /expected the hook to block/);
    assert.match(o.schemaProblems.join('; '), /permissionDecision should be one of allow\|deny\|ask\|defer/);
  });

  test('a hookSpecificOutput whose hookEventName is missing or another event voids the whole output', () => {
    for (const [name, hso] of [['missing', { permissionDecision: 'deny' }], ['other-event', { hookEventName: 'PostToolUse', permissionDecision: 'deny' }]]) {
      const o = outcome('PreToolUse', plant(`hen-${name}`, print({ continue: false, hookSpecificOutput: hso })));
      assert.equal(o.stdoutKind, 'invalid', name);
      assert.equal(o.blocks, false, name);
      assert.equal(o.stops, false, `${name}: the top-level continue drops with it`);
    }
    const s = outcome('Stop', plant('ctx-wrong-event', print({ hookSpecificOutput: { hookEventName: 'SubagentStop', additionalContext: 'ctx' } })));
    assert.equal(s.additionalContext, null);
    assert.equal(s.continues, false);
  });

  test('a top-level decision outside approve|block, or a field of the wrong type, is a schema failure', () => {
    for (const [name, out] of [['decision-deny', { decision: 'deny', reason: 'r' }], ['continue-string', { continue: 'false' }], ['reason-number', { decision: 'block', reason: 7 }]]) {
      const o = outcome('Stop', plant(`schema-${name}`, print(out)));
      assert.equal(o.stdoutKind, 'invalid', name);
      assert.equal(o.failure, true, name);
      assert.equal(o.blocks || o.stops, false, name);
    }
  });

  test('exit 2 with schema-invalid JSON still blocks, with stderr as the reason', () => {
    const o = outcome('PreToolUse', plant('exit-2-invalid', `${print({ decision: 'block', reason: 'json reason', hookSpecificOutput: { permissionDecision: 'deny' } })} process.stderr.write("held"); process.exit(2);`));
    assert.equal(o.stdoutKind, 'invalid');
    assertBlocks(o, { reason: /^held$/ });
    assert.equal(o.stderrToClaude, true);
  });

  test('what the reference allows still validates: approve on any event, defer on PreToolUse, unknown keys', () => {
    const a = outcome('Stop', plant('stop-approve', print({ decision: 'approve', note: 'ignored' })));
    assert.equal(a.stdoutKind, 'json');
    assertPasses(a);
    const d = outcome('PreToolUse', plant('pd-defer', print(pre({ permissionDecision: 'defer' }))));
    assert.equal(d.decision, 'defer');
    assert.equal(d.blocks, false);
    assert.equal(d.failure, false);
    assert.equal(d.stdoutKind, 'json', 'defer validates on PreToolUse');
  });

  test('a PreToolUse updatedInput that is not an object breaks a rule nobody measured, so neither assert reads the run', () => {
    for (const bad of ['npm test', ['ls'], null]) {
      const out = pre({ permissionDecision: 'allow', updatedInput: bad });
      assert.deepEqual(validateOutput('PreToolUse', out), [], 'the reference gives updatedInput no type, so no schema failure');
      assert.deepEqual(unmeasuredProblems('PreToolUse', out), [`hookSpecificOutput.updatedInput should be an object, got ${JSON.stringify(bad)}`]);
    }
    assert.deepEqual(unmeasuredProblems('PreToolUse', pre({ permissionDecision: 'allow', updatedInput: { command: 'ls' } })), []);
    assert.deepEqual(unmeasuredProblems('PermissionRequest', { hookSpecificOutput: { hookEventName: 'PermissionRequest', updatedInput: null } }), []);
    const o = outcome('PreToolUse', plant('updated-input-string', print(pre({ permissionDecision: 'deny', permissionDecisionReason: 'r', updatedInput: 'x' }))));
    assert.equal(o.stdoutKind, 'json');
    assert.equal(o.undecided, true);
    // A CLI that acts on the deny blocks; one that type-checks updatedInput fails the hook instead.
    assert.throws(() => o.blocks, /has no value on an undecided run.*no probe has measured/);
    for (const check of [assertBlocks, assertPasses]) assert.throws(() => check(o), /no probe has measured \(hookSpecificOutput\.updatedInput should be an object, got "x"\)/, check.name);
  });

  test('an allow with a null updatedInput never passes assertBlocks under onFailure block (an unmeasured rule is no failure to block on), while exit 2 over it still blocks', () => {
    const allow = print(pre({ permissionDecision: 'allow', updatedInput: null }));
    const o = outcome('PreToolUse', plant('allow-null-updated-input', allow), { onFailure: 'block' });
    assert.equal(o.failureBlocks, false);
    assert.equal(o.undecided, true);
    assert.throws(() => assertBlocks(o), /no probe has measured/);
    // The rule decides only where the JSON would: the fields can't override exit 2's block.
    const x = outcome('PreToolUse', plant('exit-2-null-updated-input', `${allow} process.stderr.write("held"); process.exit(2);`));
    assert.equal(x.undecided, false);
    assertBlocks(x, { reason: /^held$/ });
  });

  test('validateOutput names each problem, and checks the enums the reference gives per event', () => {
    assert.deepEqual(validateOutput('PreToolUse', pre({ permissionDecision: 'allow', permissionDecisionReason: 'ok' })), []);
    assert.deepEqual(validateOutput('Stop', { hookSpecificOutput: 'ctx' }), ['hookSpecificOutput should be an object, got "ctx"']);
    assert.deepEqual(validateOutput('PreModelSwitch', { hookSpecificOutput: { hookEventName: 'PreModelSwitch', permissionDecision: 'defer' } }), ['hookSpecificOutput.permissionDecision should be one of allow|deny|ask, got "defer"']);
    assert.deepEqual(validateOutput('PermissionRequest', { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'block' } } }), ['hookSpecificOutput.decision.behavior should be one of allow|deny, got "block"']);
  });
});

describe('fields an event throws away', () => {
  test('StopFailure and SessionEnd read none of the JSON', () => {
    const f = outcome('StopFailure', plant('stopfailure-json', print({ continue: false, systemMessage: 'm', hookSpecificOutput: { hookEventName: 'StopFailure', additionalContext: 'ctx' } })));
    assert.equal(f.stops, false);
    assert.equal(f.systemMessage, null);
    assert.equal(f.additionalContext, null);
    const e = outcome('SessionEnd', plant('sessionend-json', print({ continue: false, systemMessage: 'm' })));
    assert.equal(e.stops, false);
    assert.equal(e.systemMessage, null);
  });

  test('ConfigChange acts on its block but discards systemMessage and continue', () => {
    const o = outcome('ConfigChange', plant('configchange-block', print({ decision: 'block', reason: 'r', continue: false, systemMessage: 'm' })));
    assertBlocks(o);
    assert.equal(o.stops, false);
    assert.equal(o.systemMessage, null);
  });

  for (const event of ['Setup', 'InstructionsLoaded']) {
    test(`${event} reads none of the JSON`, () => {
      const o = outcome(event, plant(`${event}-json`, print({ continue: false, systemMessage: 'm', hookSpecificOutput: { hookEventName: event, additionalContext: 'ctx' } })));
      assert.equal(o.stops, false);
      assert.equal(o.systemMessage, null);
      assert.equal(o.additionalContext, null);
    });
  }

  for (const event of ['CwdChanged', 'FileChanged', 'DirectoryAdded']) {
    test(`${event} discards continue but reads systemMessage`, () => {
      const o = outcome(event, plant(`${event}-json`, print({ continue: false, stopReason: 'halt', systemMessage: 'm' })));
      assert.equal(o.stops, false);
      assert.equal(o.systemMessage, 'm');
    });
  }
});

describe('exit 2 with a missing-file stderr and nothing on stdout', () => {
  const ENOENT = "Error: ENOENT: no such file or directory, open 'ledger.json'";
  const gate = (name, err, out = '  \n') => plant(name, `process.stdout.write(${JSON.stringify(out)}); process.stderr.write(${JSON.stringify(err)}); process.exit(2);`);

  test('is a non-blocking error on Stop, SubagentStop and TaskCompleted', () => {
    for (const [i, err] of [ENOENT, 'bash: /x/gate.sh: No such file or directory'].entries()) {
      const r = gate(`missing-${i}`, err);
      for (const event of ['Stop', 'SubagentStop', 'TaskCompleted']) {
        const o = outcome(event, r);
        assert.equal(o.blocks, false, `${event}: ${err}`);
        assert.equal(o.failure, true, event);
        assert.equal(o.stderrToClaude, false, event);
        assert.equal(o.reason, null, event);
        assert.throws(() => assertBlocks(o), /expected the hook to block/);
      }
    }
  });

  test("and on a plugin's UserPromptSubmit hook, but not on a settings one", () => {
    const r = gate('missing-ups', ENOENT);
    const p = outcome('UserPromptSubmit', r, { plugin: true });
    assert.equal(p.blocks, false);
    assert.equal(p.failure, true);
    assertBlocks(outcome('UserPromptSubmit', r), { reason: /ENOENT/ });
  });

  test('anything on stdout, or another event, and exit 2 blocks as usual', () => {
    assertBlocks(outcome('Stop', gate('missing-with-stdout', ENOENT, 'gate error\n')), { reason: /ENOENT/ });
    assertBlocks(outcome('PreToolUse', gate('missing-pre', ENOENT)), { reason: /ENOENT/ });
  });
});

test('outcome() refuses an event whose decision it does not read, and a name that is no event', () => {
  const r = plant('unmodeled', print({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', message: 'no' } } }));
  for (const event of ['PermissionRequest', 'PreModelSwitch', 'WorktreeCreate', 'Elicitation']) assert.throws(() => outcome(event, r), /does not read/, event);
  assert.throws(() => outcome('PreTooluse', r), /not a hook event/);
});

test('outcome() refuses a run runHook did not shape, and reads a hand-built one with no error key as started', () => {
  for (const bad of [undefined, {}, { status: 0, stdout: '' }, { stdout: '', stderr: '' }]) assert.throws(() => outcome('PreToolUse', bad), /runHook/, JSON.stringify(bad));
  const o = outcome('PreToolUse', { status: 0, stdout: '', stderr: '' }, { onFailure: 'block' });
  assert.equal(o.failure, false);
  assert.equal(o.blocks, false);
});

test('an undecided run has no blocks, continues, stops or failure to read, so assert.ok(!o.blocks) can\'t pass it', () => {
  const ALLOW = JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } });
  const ran = (extra) => ({ status: 0, stdout: ALLOW, stderr: '', timedOut: false, error: null, elapsedMs: 20, timeoutMs: 15_000, ...extra });
  for (const [name, run, why] of [
    ['harness kill', ran({ status: null, timedOut: true, elapsedMs: 1_500, timeoutMs: 1_500 }), /harness timeout is not the CLI's/],
    ['held output', ran({ heldMs: PIPE_HELD_MS + 1 }), /held its stdout or stderr open/],
    ['buffer cut', ran({ status: null, overflowed: 'stdout' }), /1 MB buffer holds on its stdout/],
    ['unmeasured rule', ran({ stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput: 'x' } }) }), /no probe has measured/],
  ]) {
    const o = outcome('PreToolUse', run, { onFailure: 'block' });
    assert.equal(o.undecided, true, name);
    for (const k of ['blocks', 'continues', 'stops', 'failure']) assert.throws(() => o[k], new RegExp(`outcome\\(\\)\\.${k} has no value on an undecided run: .*${why.source}`), `${name}: ${k}`);
    assert.throws(() => assert.ok(!o.blocks), /has no value/, `${name}: a gate test's raw read`);
    // A copy, a log line or a deepEqual still works: they leave the four out.
    const copy = JSON.parse(JSON.stringify({ ...o, run: undefined }));
    assert.deepEqual(['blocks', 'continues', 'stops', 'failure'].filter((k) => k in copy), [], name);
    assert.equal(copy.undecided, true, name);
    assert.deepEqual(outcome('PreToolUse', run, { onFailure: 'block' }), o, name);
  }
  // A decided run keeps them as plain fields, in JSON too.
  const d = JSON.parse(JSON.stringify(outcome('PreToolUse', ran({ heldMs: 0 }))));
  assert.deepEqual([d.blocks, d.continues, d.stops, d.failure], [false, false, false, false]);
});

describe('the environment the hook gets', () => {
  const PARENT = 'CLAUDE_HARNESS_TEST_PARENT';
  const dump = 'process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([k]) => /^CLAUDE/i.test(k)))));';

  test("no CLAUDE* variable of this process's, only what Claude Code sets, from the input", () => {
    process.env[PARENT] = 'parent';
    try {
      const input = { hook_event_name: 'Stop', session_id: 'sess-harness-env', cwd: path.join(dir, 'proj') };
      const env = JSON.parse(plant('env-dump', dump, input).stdout);
      assert.deepEqual(Object.keys(env).sort(), ['CLAUDECODE', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_PROJECT_DIR']);
      assert.equal(env.CLAUDECODE, '1');
      assert.equal(env.CLAUDE_CODE_CHILD_SESSION, '1');
      assert.equal(env.CLAUDE_CODE_SESSION_ID, 'sess-harness-env');
      assert.equal(env.CLAUDE_PROJECT_DIR, input.cwd);
    } finally {
      delete process.env[PARENT];
    }
  });

  test('the cwd option names the project dir, env passes through, and a string input is read for its session id', () => {
    const projectDir = fs.mkdtempSync(path.join(dir, 'proj-'));
    const a = JSON.parse(plant('env-cwd', dump, JSON.stringify({ session_id: 'sess-harness-str', cwd: '/elsewhere' }), { cwd: projectDir, env: { CLAUDE_CODE_ENTRYPOINT: 'cli' } }).stdout);
    assert.equal(a.CLAUDE_PROJECT_DIR, projectDir);
    assert.equal(a.CLAUDE_CODE_SESSION_ID, 'sess-harness-str');
    assert.equal(a.CLAUDE_CODE_ENTRYPOINT, 'cli');
    const b = JSON.parse(plant('env-text', dump, 'not json').stdout);
    assert.equal('CLAUDE_CODE_SESSION_ID' in b, false);
    assert.equal('CLAUDE_PROJECT_DIR' in b, false);
  });

  test('after a cd, CLAUDE_PROJECT_DIR stays the launch root (the cwd option, or env) while input.cwd names the subfolder', () => {
    const root = fs.mkdtempSync(path.join(dir, 'launch-'));
    const sub = path.join(root, 'pkg');
    fs.mkdirSync(sub);
    const src = 'let s = ""; process.stdin.on("data", (d) => { s += d; }).on("end", () => process.stdout.write(JSON.stringify({ projectDir: process.env.CLAUDE_PROJECT_DIR, inputCwd: JSON.parse(s).cwd })));';
    const input = { hook_event_name: 'Stop', session_id: 'sess-harness-cd', cwd: sub };
    for (const opts of [{ cwd: root }, { env: { CLAUDE_PROJECT_DIR: root } }]) {
      assert.deepEqual(JSON.parse(plant('cd-root', src, input, opts).stdout), { projectDir: root, inputCwd: sub }, Object.keys(opts)[0]);
    }
  });

  test('no git location variable reaches the hook, whatever its case; other git variables do', () => {
    const planted = { GIT_DIR: path.join(dir, 'outer.git'), GIT_INDEX_FILE: path.join(dir, 'outer-index'), Git_Work_Tree: dir, GIT_HARNESS_TEST_KEEP: '1' };
    const saved = Object.fromEntries(Object.keys(planted).map((k) => [k, process.env[k]]));
    Object.assign(process.env, planted);
    try {
      const seen = JSON.parse(plant('git-env', 'process.stdout.write(JSON.stringify(Object.keys(process.env).filter((k) => /^GIT_/i.test(k)).map((k) => k.toUpperCase())));').stdout);
      assert.deepEqual(['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE'].filter((k) => seen.includes(k)), []);
      assert.ok(seen.includes('GIT_HARNESS_TEST_KEEP'), `only the location variables drop: ${seen}`);
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

test('parseStdout follows the reference: arrays and quoted strings are plain text', () => {
  assert.equal(parseStdout('[1]').kind, 'text');
  assert.equal(parseStdout('"x"').kind, 'text');
  assert.equal(parseStdout('{"a":1').kind, 'text');
  assert.equal(parseStdout('{oops}').kind, 'invalid');
  assert.equal(parseStdout('  {"a":1}\n').kind, 'json');
  assert.equal(parseStdout('{}\n{}').kind, 'text');
});
