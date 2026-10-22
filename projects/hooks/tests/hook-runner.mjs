// hook-runner.mjs: run one hook for harness.mjs's runHook and time its exit
// apart from the close of its output.
//
//   node hook-runner.mjs < {"argv", "input", "env", "cwd", "timeoutMs", "minDrainMs"}
//
// prints one JSON object: {status, signal, stdout, stderr, timedOut,
// overflowed, error, elapsedMs, heldMs}.
//
// spawnSync returns only once every holder of the hook's stdout and stderr has
// closed them, so a background process the hook started without redirecting
// its output stretches the run, and its late output reads as the hook's.
// Claude Code finishes reading shortly after the hook's own process exits
// (hooks reference, "Hooks that start a background process"). This runner
// records both moments, so outcome() can tell the two runs apart: elapsedMs
// is the hook's own run time (exit minus start, what the CLI's timeout
// counts), heldMs how long its output stayed open after that.
//
// runHook stays synchronous: it spawnSyncs this runner, which is async inside.
// Built-ins only. Everything the hook gets (argv, stdin, env, cwd) comes in on
// this runner's stdin, so runHook alone decides it.

import { spawn, spawnSync } from 'node:child_process';

const WIN = process.platform === 'win32';

// The most of each stream the runner keeps: spawnSync's default maxBuffer,
// which runHook used before this runner. A hook that writes more is killed
// there, as it was then (unless the deadline killed it first, see
// bufferStep), and the run names the stream in overflowed, never
// in error: the reference gives the CLI no output size at which a hook fails
// (it caps the strings it hands Claude and saves the rest to a file, :1022),
// so the cut is the harness's, and outcome() reads the run undecided.
const MAX_BUFFER = 1024 * 1024;

// After the runner's kill (at the timeout or the buffer), how long to wait for
// the exit and the pipes. A process that escaped the tree can hold the pipes
// for good, so the run ends anyway.
const KILL_GRACE_MS = 2_000;

// Kill the hook and everything it started. On Windows child.kill() is
// TerminateProcess on the hook alone, so taskkill takes the tree (as
// probes/lib.mjs killTree does); on POSIX the hook leads its own process group
// (detached), so a negative pid takes the group. Only while node hasn't reaped
// the exit: until then the pid can't belong to anything else, after it a
// Windows pid can be reused.
function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  if (WIN) {
    const r = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 15_000 });
    if (r.status === 0) return;
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); return; } catch { /* no group: fall through */ }
  }
  try { child.kill('SIGKILL'); } catch { /* gone */ }
}

// Calls fn once performance.now() reaches `when`. setTimeout truncates a
// fractional delay and counts it from a whole-ms loop clock, so one timer can
// fire up to ~2 ms early; re-arming until the clock gets there means no
// deadline lands before its time, and a hook killed at timeoutMs reports an
// elapsedMs of at least that. A delay past 2^31-1 ms fires at once, so each
// wait is capped there and the re-arm covers the rest. `now` and `schedule`
// are swapped only by harness.test.mjs.
export function atOrAfter(when, fn, { now = () => performance.now(), schedule = setTimeout } = {}) {
  const arm = () => schedule(() => (now() < when ? arm() : fn()), Math.min(2 ** 31 - 1, Math.max(1, Math.ceil(when - now()))));
  arm();
}

// What the runner does with a chunk of n bytes on a stream that already holds
// `size`: keep it while the stream stays within the buffer, and treat the
// first chunk past it as the overflow (name the stream, kill the hook) only
// on a run nothing has killed yet. Bytes still in the pipe after the
// deadline's kill belong to a run already ended as a timeout, so they neither
// name a stream nor move the run's end with a second kill.
export function bufferStep({ size, overflowed, killedAt }, n, max = MAX_BUFFER) {
  const over = size + n > max;
  return { keep: !over, overflow: over && !overflowed && killedAt === null };
}

async function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  const cfg = JSON.parse(raw);
  const [cmd, ...args] = cfg.argv;

  const chunks = { stdout: [], stderr: [] };
  const sizes = { stdout: 0, stderr: 0 };
  const closedAt = { stdout: null, stderr: null };
  let exitAt = null;
  // When this runner killed the hook: its run ends there, not at the exit the
  // kill brings (taskkill alone can take a few hundred ms).
  let killedAt = null;
  let status = null;
  let signal = null;
  let error = null;
  let timedOut = false;
  // The stream that passed MAX_BUFFER first, or null.
  let overflowed = null;
  let finished = false;
  const timers = [];
  const schedule = (fn, ms) => timers.push(setTimeout(fn, ms));
  const at = (when, fn) => atOrAfter(when, fn, { schedule });

  const started = performance.now();
  let child;
  try {
    child = spawn(cmd, args, { cwd: cfg.cwd, env: cfg.env, shell: false, windowsHide: true, detached: !WIN, stdio: 'pipe' });
  } catch (e) {
    error = e;
  }

  const finish = () => {
    if (finished) return;
    finished = true;
    for (const t of timers) clearTimeout(t);
    const now = performance.now();
    const closed = closedAt.stdout !== null && closedAt.stderr !== null ? Math.max(closedAt.stdout, closedAt.stderr) : null;
    // A hook that exited while a background job it started still holds its
    // output open: end the job with the hook's process group, so it can't
    // outlive the test. The kernel keeps a group's id from reuse while any
    // member lives, so the kill reaches that group or nothing; a job that left
    // the group (setsid) escapes it. On Windows nothing built in reaches the
    // job once the hook is gone (taskkill /T starts from the live parent, and
    // the dead hook's pid can name another process), so it runs to its own end.
    if (!WIN && child?.pid && exitAt !== null && killedAt === null && closed === null) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* the group is gone */ }
    }
    if (child) for (const s of [child.stdin, child.stdout, child.stderr]) s?.destroy();
    const result = {
      status,
      signal,
      stdout: Buffer.concat(chunks.stdout).toString('utf8'),
      stderr: Buffer.concat(chunks.stderr).toString('utf8'),
      timedOut,
      overflowed,
      error: error && { message: error.message, code: error.code, errno: error.errno, syscall: error.syscall, path: error.path },
      elapsedMs: Math.round((killedAt ?? exitAt ?? now) - started),
      // Null when the hook never exited on its own; still open when the run
      // ended, at least that long.
      heldMs: exitAt === null || killedAt !== null ? null : Math.max(0, Math.round((closed ?? now) - exitAt)),
    };
    process.stdout.write(JSON.stringify(result), () => process.exit(0));
  };
  if (!child) return finish();

  const settled = () => exitAt !== null && closedAt.stdout !== null && closedAt.stderr !== null;
  child.on('error', (e) => {
    // A failed kill also lands here; only a hook that never started ends the run.
    if (child.pid === undefined) {
      error = e;
      finish();
    }
  });
  child.on('exit', (code, sig) => {
    exitAt = performance.now();
    // A killed hook never exited on its own: no status, as spawnSync reported.
    status = killedAt === null ? code : null;
    signal = sig;
    if (settled()) finish();
  });
  for (const name of ['stdout', 'stderr']) {
    child[name].on('data', (d) => {
      const step = bufferStep({ size: sizes[name], overflowed, killedAt }, d.length);
      sizes[name] += d.length;
      if (step.keep) chunks[name].push(d);
      else if (step.overflow) {
        overflowed = name;
        if (exitAt === null) {
          killedAt = performance.now();
          killTree(child);
        }
        schedule(finish, KILL_GRACE_MS);
      }
    });
    child[name].on('close', () => {
      closedAt[name] = performance.now();
      if (settled()) finish();
    });
  }
  // The hook may exit without reading its stdin.
  child.stdin.on('error', () => {});
  child.stdin.end(cfg.input);

  // The harness timeout, counted from the spawn. A hook still running is
  // killed with its tree. One that exited while something holds its output
  // open is read for at least minDrainMs past its exit, so a run that ends
  // with the output still open reports a heldMs past the harness's margin.
  // A hook the buffer's kill already ended is left to that kill's grace, so
  // the deadline never relabels it a timeout.
  at(started + cfg.timeoutMs, () => {
    if (killedAt !== null) return;
    if (exitAt === null) {
      timedOut = true;
      killedAt = performance.now();
      killTree(child);
      schedule(finish, KILL_GRACE_MS);
    } else {
      at(exitAt + cfg.minDrainMs, finish);
    }
  });
}

// import.meta.main is false when harness.test.mjs imports this file for
// atOrAfter, so the import reads no stdin and runs no hook.
if (import.meta.main) {
  main().catch((e) => {
    process.stderr.write(`hook-runner: ${e?.stack ?? e}\n`);
    process.exit(1);
  });
}
