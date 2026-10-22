// Q7: when does SessionEnd fire in a headless session, with which reason, and
// can a SessionEnd hook block the session from ending?
//
// Four headless arms, each in its own workspace, each with capture hooks on
// SessionStart, UserPromptSubmit, Stop and SessionEnd. The SessionEnd capture
// has timeout 10, which raises the 1.5 s SessionEnd budget to 10 s.
//   normal       a -p turn that ends on its own
//   block        the same, plus two SessionEnd hooks that try to block: one
//                exits 2 with a stderr marker, the other prints
//                {continue:false, decision:"block", systemMessage:<word>}.
//                The run must still end. Where the word and marker show up
//                is recorded: the docs disagree on whether SessionEnd's
//                systemMessage goes anywhere.
//   stdin-close  a stream-json session: one turn, then its stdin is closed.
//                runStream's close-to-exit time and killedByLib tell a
//                self-exit from lib's 20 s kill.
//   kill         a -p turn killed mid-reply with child.kill(). On Windows
//                that is TerminateProcess, which nothing can catch. Each
//                capture's ppid ties it to the killed process.
// SessionStart (and Stop, in the normal arm) are the controls: a session
// whose start the hooks never saw says nothing by not showing an end. Nor
// does a normal run lib's timeout killed: that kill came from outside (on
// Windows TerminateProcess on claude.exe alone), so the run never got to end
// on its own. A non-zero exit that came on its own still counts. The block arm's own timeout is its block signal, read
// against the normal arm's: when that one hung too, the hang is no block.
// /clear's SessionEnd is Q11's arm. Interactive exits need a human: they are
// named in the summary, not run, and the PARTIAL that names them says
// unsettledOnly, since every arm that settled agrees.
import path from 'node:path';
import { arm, byLabel, canary, hook, readCaptures, runClaude, runClaudeAsync, runStream, scrubber, sleep, track, write } from '../lib.mjs';

const PROMPT = 'Reply with the single word ok.';
const LONG_PROMPT = 'Write the whole numbers from one to four hundred in English words, one per line, with nothing else. Use no tools.';
const DOCUMENTED = ['clear', 'resume', 'logout', 'prompt_input_exit', 'other'];
const HUMAN_ARMS = 'an interactive /exit (prompt_input_exit), an interactive /resume switch (resume), closing the terminal window, and a Remote Control drop need a human; logout is not run, since /logout signs out every live session';

// One scrubber for this probe, so its aliases number from 1.
const scrub = scrubber();

const base = (out) => ({
  SessionStart: [{ hooks: [hook(out, 'ss')] }],
  UserPromptSubmit: [{ hooks: [hook(out, 'ups')] }],
  Stop: [{ hooks: [hook(out, 'stop')] }],
  SessionEnd: [{ hooks: [hook(out, 'se', { timeout: 10 })] }],
});

// readCaptures already skips a torn last line; a corrupt one throws, which
// inside a timer would take the runner down. The poll reads that as nothing
// yet, and the arm's own readCaptures afterwards throws it where run.mjs
// files the probe as ERROR.
function safeCaptures(out) {
  try {
    return readCaptures(out);
  } catch {
    return [];
  }
}

// A -p run killed once `waitFor` has fired and `afterMs` more have passed.
// The kill is child.kill() on purpose, not lib's killTree: the arm measures
// what TerminateProcess on claude.exe alone leaves behind. lib's own timeout
// sits past the deadline, a backstop for a kill that never landed.
async function runKilled({ cwd, out, prompt, settings, args, waitFor, afterMs, deadlineMs = 120_000 }) {
  const t0 = Date.now();
  const { child, done } = runClaudeAsync({ cwd, out, prompt, settings, args, timeoutMs: deadlineMs + 60_000 });
  let bytes = 0;
  let exited = false;
  let killedAtMs = null;
  let bytesAtKill = null;
  let labelsAtKill = null;
  let after = null;
  child.stdout.on('data', (d) => { bytes += d.length; });
  child.on('exit', () => { exited = true; });
  const kill = (why) => {
    if (exited || killedAtMs !== null) return;
    killedAtMs = Date.now() - t0;
    bytesAtKill = bytes;
    labelsAtKill = safeCaptures(out).map((c) => c.label);
    try { child.kill(); } catch { /* gone */ }
    write(path.join(out, 'kill.txt'), `${why} at ${killedAtMs} ms\n`);
  };
  const deadline = setTimeout(() => kill('deadline'), deadlineMs);
  const poll = setInterval(() => {
    if (exited || !safeCaptures(out).some((c) => c.label === waitFor)) return;
    clearInterval(poll);
    after = setTimeout(() => kill(`after ${waitFor}`), afterMs);
  }, 200);
  const res = await done;
  clearInterval(poll);
  clearTimeout(deadline);
  clearTimeout(after);
  // No pid: the CLI never started, and runClaudeAsync put the spawn error in stderr.
  const error = res.pid === undefined ? scrub(res.stderr.trim().slice(0, 200)) : null;
  return { pid: res.pid, code: res.status, signal: res.signal, error, killedAtMs, bytesAtKill, labelsAtKill, ms: res.ms, stdout: res.stdout };
}

const reasons = (caps) => byLabel(caps, 'se').map((c) => c.input?.reason);
const order = (caps) => caps.map((c) => (c.label === 'se' ? `se(${c.input?.reason})` : c.label === 'ss' ? `ss(${c.input?.source})` : c.label));

// The verdict from the four arms' rows: {verdict, summary}, plus
// unsettledOnly on the PARTIAL. Q7 is never VERIFIED: the human arms stay
// open, so its best reading is that PARTIAL.
export function decide({ normal, block, stdinClose, kill }) {
  if (byLabel(normal.caps, 'ss').length === 0 || byLabel(normal.caps, 'stop').length === 0) return { verdict: 'INCONCLUSIVE', summary: 'the normal -p run fired no SessionStart or no Stop hook, so a missing SessionEnd would prove nothing' };
  const bad = [];
  if (!normal.timedOut && reasons(normal.caps).length === 0) bad.push('a normal -p run ended (Stop fired) with no SessionEnd');
  if (byLabel(stdinClose.caps, 'ss').length > 0 && stdinClose.selfExit && reasons(stdinClose.caps).length === 0) bad.push('a stream-json session that exited on its own after stdin closed fired no SessionEnd');
  const allReasons = [normal, block, stdinClose, kill].flatMap((r) => reasons(r.caps));
  const undocumented = [...new Set(allReasons.filter((r) => !DOCUMENTED.includes(r)))];
  if (undocumented.length) bad.push(`undocumented SessionEnd reason(s) ${JSON.stringify(undocumented)}`);
  if (block.blockHooksFired && block.timedOut && !normal.timedOut) bad.push('the blocking SessionEnd hooks kept the session from ending');
  if (bad.length) return { verdict: 'CONTRADICTED', summary: bad.join('; ') };
  if (normal.timedOut) return { verdict: 'INCONCLUSIVE', summary: `the normal -p run was killed by lib's timeout before it could end (after ${normal.ms} ms), so its SessionEnd can't be read${block.timedOut ? ', and the block arm\'s timeout has no clean run to be read against' : ''}` };

  const r1 = (caps) => JSON.stringify(reasons(caps));
  const parts = [
    `normal -p end: SessionEnd reason ${r1(normal.caps)}`,
    `stdin closed: ${byLabel(stdinClose.caps, 'ss').length === 0 ? 'void (no SessionStart)' : stdinClose.selfExit ? `exited on its own in ${stdinClose.lagMs} ms, SessionEnd reason ${r1(stdinClose.caps)}` : stdinClose.killedByLib ? `did not exit within 20 s of stdin closing (lib killed it), SessionEnd ${r1(stdinClose.caps)}` : `void (the session ended, ${stdinClose.why}, before its stdin closed; SessionEnd ${r1(stdinClose.caps)})`}`,
    `killed mid-turn (TerminateProcess): ${kill.midTurn ? `exit code ${kill.code}, SessionEnd ${reasons(kill.caps).length ? `FIRED ${r1(kill.caps)}` : 'never fired'}` : 'void (the kill did not land mid-turn)'}`,
    `block attempt (exit 2 + continue:false/decision:block): ${block.blockHooksFired ? `the run still ended, exit ${block.exit} in ${block.ms} ms (normal ${normal.exit} in ${normal.ms} ms); systemMessage ${block.wordIn.stdout || block.wordIn.stderr ? 'surfaced' : 'went nowhere'}, exit-2 stderr ${block.markerIn.stdout || block.markerIn.stderr ? 'surfaced' : 'went nowhere'}` : 'void (the blocking hooks never fired)'}`,
  ];
  return { verdict: 'PARTIAL', summary: `${parts.join('; ')}. /clear is Q11's arm; ${HUMAN_ARMS}`, unsettledOnly: true };
}

export default {
  id: 'Q7',
  question: 'When does SessionEnd fire, with which reason, and can a SessionEnd hook block the session from ending?',
  assumption: 'SessionEnd fires at the end of a headless session with a documented reason and cannot block.',
  loadBearing: false,
  async run(ctx) {
    const rows = {};

    // normal
    {
      const { ws, out } = arm(ctx, 'normal');
      const res = runClaude({ cwd: ws, out, prompt: PROMPT, settings: { hooks: base(out) }, args: ['--tools', ''], timeoutMs: 120_000 });
      const caps = readCaptures(out);
      track(ctx, caps);
      rows.normal = { caps, exit: res.status, timedOut: res.timedOut, ms: res.ms, reply: (res.json?.result ?? '').slice(0, 60) };
      await sleep(1500);
    }

    // block
    const word = canary('SEMSG');
    const marker = canary('SEBLOCK');
    {
      const { ws, out } = arm(ctx, 'block');
      const hooks = base(out);
      hooks.SessionEnd[0].hooks.push(
        hook(out, 'se-exit2', { stderr: marker, exit: 2, timeout: 10 }),
        hook(out, 'se-json', { respond: { continue: false, stopReason: `stop ${word}`, decision: 'block', reason: `block ${word}`, systemMessage: `system ${word}` }, timeout: 10 }),
      );
      const res = runClaude({ cwd: ws, out, prompt: PROMPT, settings: { hooks }, args: ['--tools', ''], timeoutMs: 120_000 });
      const caps = readCaptures(out);
      track(ctx, caps);
      rows.block = {
        caps, exit: res.status, timedOut: res.timedOut, ms: res.ms, reply: (res.json?.result ?? '').slice(0, 60),
        blockHooksFired: byLabel(caps, 'se-exit2').length > 0 && byLabel(caps, 'se-json').length > 0,
        wordIn: { stdout: (res.stdout ?? '').includes(word), stderr: (res.stderr ?? '').includes(word) },
        markerIn: { stdout: (res.stdout ?? '').includes(marker), stderr: (res.stderr ?? '').includes(marker) },
        stderrTail: scrub((res.stderr ?? '').slice(-300)),
      };
      await sleep(1500);
    }

    // stdin-close
    {
      const { ws, out } = arm(ctx, 'stdin-close');
      let closedAt = null;
      const s = await runStream({
        cwd: ws, out, settings: { hooks: base(out) }, args: ['--tools', ''], timeoutMs: 120_000,
        turns: [PROMPT, () => { closedAt = Date.now(); return null; }],
      });
      const caps = readCaptures(out);
      track(ctx, caps);
      // runStream times close-to-exit itself (its pipes can drain for 10 s
      // more), and it is null when the session ended before stdin closed.
      const lagMs = closedAt === null ? null : s.stdinToExitMs;
      rows.stdinClose = { caps, why: s.why, code: s.code, signal: s.signal, results: s.results.length, lagMs, killedByLib: s.killedByLib, selfExit: lagMs !== null && !s.killedByLib };
      await sleep(1500);
    }

    // kill
    {
      const { ws, out } = arm(ctx, 'kill');
      const k = await runKilled({ cwd: ws, out, prompt: LONG_PROMPT, settings: { hooks: base(out) }, args: ['--tools', ''], waitFor: 'ups', afterMs: 3000 });
      await sleep(5000); // anything still running after the kill gets time to write
      const caps = readCaptures(out);
      track(ctx, caps);
      rows.kill = {
        caps, pid: k.pid, code: k.code, signal: k.signal, error: k.error, killedAtMs: k.killedAtMs, ms: k.ms,
        midTurn: k.killedAtMs !== null && k.bytesAtKill === 0 && !(k.labelsAtKill ?? []).includes('stop'),
        labelsAtKill: k.labelsAtKill, allFromKilledPid: caps.every((c) => c.ppid === k.pid), stdoutLen: k.stdout.length,
      };
    }

    const { normal, block, stdinClose, kill } = rows;
    const evidence = [
      `normal -p: exit ${normal.exit} in ${normal.ms} ms (timed out ${normal.timedOut}), reply ${JSON.stringify(normal.reply)}, hooks in order ${JSON.stringify(order(normal.caps))}`,
      `block attempt: exit ${block.exit} in ${block.ms} ms (timed out ${block.timedOut}), reply ${JSON.stringify(block.reply)}, both blocking hooks fired ${block.blockHooksFired}, hooks in order ${JSON.stringify(order(block.caps))}`,
      `block attempt: systemMessage word in stdout ${block.wordIn.stdout} / stderr ${block.wordIn.stderr}; exit-2 stderr marker in stdout ${block.markerIn.stdout} / stderr ${block.markerIn.stderr}; stderr tail ${JSON.stringify(block.stderrTail)}`,
      `stdin-close stream: ${stdinClose.results} result(s), ended ${stdinClose.why}, exit code ${stdinClose.code} signal ${stdinClose.signal}, ${stdinClose.lagMs} ms from closing stdin to exit (${stdinClose.selfExit ? 'exited on its own' : stdinClose.killedByLib ? "lib's 20 s kill" : 'not timed: it ended before its stdin closed'}), hooks in order ${JSON.stringify(order(stdinClose.caps))}`,
      `kill mid-turn: child.kill() at ${kill.killedAtMs} ms (mid-turn ${kill.midTurn}, hooks before the kill ${JSON.stringify(kill.labelsAtKill)}), exit code ${kill.code} signal ${kill.signal}${kill.error ? ` error ${kill.error}` : ''}, ${kill.stdoutLen} bytes of stdout, hooks after 5 s ${JSON.stringify(order(kill.caps))}, every capture's parent is the killed process ${kill.allFromKilledPid}`,
    ];
    const observed = Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { ...r, caps: undefined, order: order(r.caps), reasons: reasons(r.caps) }]));
    return { ...decide(rows), evidence, observed };
  },
};
