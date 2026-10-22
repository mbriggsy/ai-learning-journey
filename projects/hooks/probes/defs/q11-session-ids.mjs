// Q11: does the session id change on /clear and on --resume ... --fork-session,
// and stay the same on --resume <id> and --continue? Do the hook input's
// session_id and the hook env's CLAUDE_CODE_SESSION_ID agree every time?
//
// Every run carries capture hooks on SessionStart, UserPromptSubmit, Stop and
// SessionEnd. Each capture holds both the input's session_id and the env's
// CLAUDE_CODE_SESSION_ID, so the env check runs on every hook firing.
//
// Chain, all in one workspace so --continue can find only these sessions.
// Transcripts persist, since resuming needs them.
//   start     -p --session-id U, U a fresh UUID: the positive control. U must
//             show in the hook input, the hook env and the output's session_id
//   resume    -p --resume U
//   continue  -p --continue
//   fork      -p --resume U --fork-session
// Clear, in its own workspace: a stream-json session started with
// --session-id V, turns "alpha", "/clear", "bravo". If no clear event fires
// and the post-clear turn keeps V, the headless /clear wasn't honored, and that
// arm is BLOCKED (it needs a typed /clear).
// Ids in the evidence are aliases (U, V, new-1, ...); the captures keep the
// real ones.
//
// A run that failed or timed out, or a capture that never came, decides
// nothing: the arm is unsettled (INCONCLUSIVE), and its evidence still says
// what SessionStart reported. Only the env/input agreement, read off every
// firing that did happen, stays decisive whatever the run did after.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { arm, byLabel, failure, hook, readCaptures, runClaude, runStream, sleep, track } from '../lib.mjs';

const settingsFor = (out) => ({
  hooks: {
    SessionStart: [{ hooks: [hook(out, 'ss')] }],
    UserPromptSubmit: [{ hooks: [hook(out, 'ups')] }],
    Stop: [{ hooks: [hook(out, 'stop')] }],
    SessionEnd: [{ hooks: [hook(out, 'se', { timeout: 10 })] }],
  },
});

const envDiffers = (c) => c.env?.CLAUDE_CODE_SESSION_ID !== c.input?.session_id;

// The verdict from the chain arms ({start, resume, continue, fork}, each
// {caps, failed, outId}), the clear stream's captures `cc` and its outcome
// `clear` ({why, code, results: [{sid}]}): {verdict, summary}, plus
// unsettledOnly on the PARTIAL whose one open arm is a headless /clear the CLI
// didn't honor. `alias` names an id for the summary, U and V among them.
export function decide({ chain, cc, clear, U, V, alias }) {
  const all = [...Object.values(chain).flatMap((r) => r.caps), ...cc];
  const mismatched = all.filter(envDiffers).length;

  // Positive control: the forced id shows up everywhere it should.
  const st = byLabel(chain.start.caps, 'ss')[0];
  if (!st || st.input?.source !== 'startup' || st.input?.session_id !== U || st.env?.CLAUDE_CODE_SESSION_ID !== U || chain.start.outId !== U) {
    return { verdict: 'INCONCLUSIVE', summary: `the control failed: a --session-id start should show U as a startup session in the hook input, hook env and output (got ${st ? `source ${st.input?.source}, input ${alias(st.input?.session_id)}, env ${alias(st.env?.CLAUDE_CODE_SESSION_ID)}` : 'no SessionStart'}, output ${alias(chain.start.outId)}${chain.start.failed ? `; the run ${chain.start.failed}` : ''})` };
  }

  const bad = [];
  const voids = [];
  if (mismatched) bad.push(`env CLAUDE_CODE_SESSION_ID differed from the input session_id on ${mismatched} hook firing(s)`);
  const found = {};
  // One chain arm: its SessionStart and output id checked against `expect`,
  // or a void when the run failed or SessionStart never fired.
  const judgeChain = (name, expect, what) => {
    const r = chain[name];
    const ss = byLabel(r.caps, 'ss')[0];
    if (!ss) { voids.push(`${name} fired no SessionStart${r.failed ? ` (the run ${r.failed})` : ''}`); return; }
    found[name] = `source ${ss.input.source}, id ${alias(ss.input.session_id)}`;
    const got = `SessionStart source ${ss.input.source}, id ${alias(ss.input.session_id)}, output ${alias(r.outId)}`;
    if (r.failed) { voids.push(`${name}: the run ${r.failed}, so its output session_id can't be read (${got})`); return; }
    if (!expect(ss.input)) bad.push(`${name}: ${got} (expected ${what})`);
  };
  for (const name of ['resume', 'continue']) judgeChain(name, (i) => i.source === 'resume' && i.session_id === U && chain[name].outId === U, 'source resume and id U throughout');
  judgeChain('fork', (i) => i.source === 'fork' && i.session_id !== U && chain.fork.outId === i.session_id, 'source fork and one new id throughout');

  const ups = (re) => byLabel(cc, 'ups').find((x) => re.test(String(x.input?.prompt ?? '')));
  const alpha = ups(/alpha/i);
  const bravo = ups(/bravo/i);
  const seClear = byLabel(cc, 'se').filter((x) => x.input?.reason === 'clear');
  const ssClear = byLabel(cc, 'ss').filter((x) => x.input?.source === 'clear');
  const clearPrompt = byLabel(cc, 'ups').some((x) => String(x.input?.prompt ?? '').trim() === '/clear');
  let clearBlocked = false;
  let clearPart = '';
  // The post-clear turn running is what makes a missing clear event a
  // reading: a stream that ended before it decides nothing about /clear.
  const ended = `the clear stream ended (${clear.why}, exit ${clear.code}) before the post-clear turn ran`;
  if (!alpha || alpha.input?.session_id !== V) voids.push(`the clear stream's first turn ${alpha ? `ran under ${alias(alpha.input?.session_id)}, not V` : 'never ran'}`);
  else {
    const honored = seClear.length > 0 || ssClear.length > 0 || (bravo && bravo.input?.session_id !== V);
    if (!honored && !bravo) voids.push(`${ended}, and no clear event fired`);
    else if (!honored) {
      clearBlocked = true;
      clearPart = `headless /clear was not honored (no clear event; /clear ${clearPrompt ? 'reached UserPromptSubmit as a prompt' : 'never reached UserPromptSubmit'}; post-clear turn kept ${alias(bravo.input?.session_id)}): BLOCKED, needs a typed /clear`;
    } else if (ssClear.length === 0) {
      if (bravo) bad.push(`/clear took effect (${seClear.length ? 'SessionEnd reason clear fired' : 'the post-clear turn changed id'}) but no SessionStart with source clear fired`);
      else voids.push(`/clear took effect (SessionEnd reason clear fired), but ${ended}, so a SessionStart with source clear may not have come due`);
    } else {
      const X = ssClear[0].input.session_id;
      if (X === V) bad.push('/clear fired SessionStart source clear under the same id V');
      if (bravo && bravo.input?.session_id !== X) bad.push(`the post-clear turn ran under ${alias(bravo.input?.session_id)}, not the SessionStart(clear) id ${alias(X)}`);
      clearPart = `/clear: SessionEnd reason clear ${seClear.length ? `carried ${alias(seClear[0].input.session_id)}` : 'did not fire'}, SessionStart source clear carried ${alias(X)} (env ${alias(ssClear[0].env?.CLAUDE_CODE_SESSION_ID)}), post-clear turn ${bravo ? `ran under ${alias(bravo.input?.session_id)} (env ${alias(bravo.env?.CLAUDE_CODE_SESSION_ID)})` : 'never ran'}, clear-turn result reported ${clear.results[1] ? clear.results[1].sid : 'nothing'}`;
    }
  }

  if (bad.length) return { verdict: 'CONTRADICTED', summary: bad.join('; ') };
  if (voids.length) return { verdict: 'INCONCLUSIVE', summary: `arm(s) that could not see: ${voids.join('; ')}` };
  const chainPart = `--resume U: ${found.resume}; --continue: ${found.continue}; --resume U --fork-session: ${found.fork}; env matched the input on all ${all.length} hook firings`;
  if (clearBlocked) return { verdict: 'PARTIAL', summary: `${chainPart}; ${clearPart}`, unsettledOnly: true };
  return { verdict: 'VERIFIED', summary: `${chainPart}; ${clearPart}` };
}

export default {
  id: 'Q11',
  question: 'Do session ids change after /clear and --fork-session, and stay put on --resume <id> and --continue; do the hook input session_id and env CLAUDE_CODE_SESSION_ID agree?',
  assumption: "A session's id changes on /clear and on --resume ... --fork-session (SessionStart source clear / fork) and stays the same on --resume <id> and --continue; the hook input session_id and the hook env CLAUDE_CODE_SESSION_ID agree in every case.",
  loadBearing: true,
  async run(ctx) {
    const U = randomUUID();
    const V = randomUUID();
    const names = new Map([[U, 'U'], [V, 'V']]);
    let fresh = 0;
    const alias = (id) => {
      if (id === undefined || id === null) return String(id);
      if (!names.has(id)) names.set(id, /^[0-9a-f-]{36}$/i.test(id) ? `new-${++fresh}` : 'not-a-uuid');
      return names.get(id);
    };
    const row = (c) => ({
      hook: c.label,
      ...(c.input?.source ? { source: c.input.source } : {}),
      ...(c.input?.reason ? { reason: c.input.reason } : {}),
      ...(c.label === 'ups' ? { prompt: String(c.input?.prompt ?? '').slice(0, 40) } : {}),
      sid: alias(c.input?.session_id),
      env: alias(c.env?.CLAUDE_CODE_SESSION_ID),
      transcript: c.input?.transcript_path ? alias(path.basename(c.input.transcript_path, '.jsonl')) : 'none',
    });

    // Chain
    const { ws, out } = arm(ctx, 'chain');
    const chain = {};
    for (const [name, prompt, extra] of [
      ['start', 'Reply with the single word one.', ['--session-id', U]],
      ['resume', 'Reply with the single word two.', ['--resume', U]],
      ['continue', 'Reply with the single word three.', ['--continue']],
      ['fork', 'Reply with the single word four.', ['--resume', U, '--fork-session']],
    ]) {
      const o = path.join(out, name);
      fs.mkdirSync(o, { recursive: true });
      const res = runClaude({ cwd: ws, out: o, prompt, settings: settingsFor(o), args: ['--tools', '', ...extra], timeoutMs: 120_000 });
      const caps = readCaptures(o);
      track(ctx, caps);
      chain[name] = { caps, exit: res.status, failed: failure(res), outId: res.json?.session_id, reply: (res.json?.result ?? '').slice(0, 40) };
      await sleep(1500);
    }
    for (const r of Object.values(chain)) { r.caps.forEach(row); alias(r.outId); } // aliases follow the order the hooks saw ids
    const tdir = Object.values(chain).flatMap((r) => r.caps).map((x) => x.input?.transcript_path).filter(Boolean).map((t) => path.dirname(t))[0];
    const transcripts = tdir && fs.existsSync(tdir) ? fs.readdirSync(tdir).filter((f) => f.endsWith('.jsonl')).map((f) => alias(path.basename(f, '.jsonl'))) : [];

    // Clear
    const c = arm(ctx, 'clear');
    const s = await runStream({
      cwd: c.ws, out: c.out, settings: settingsFor(c.out), args: ['--tools', '', '--session-id', V], timeoutMs: 180_000,
      turns: ['Reply with the single word alpha.', '/clear', 'Reply with the single word bravo.'],
    });
    const cc = readCaptures(c.out);
    track(ctx, cc);
    const clear = {
      caps: cc, why: s.why, code: s.code,
      results: s.results.map((r) => ({ sid: alias(r.session_id), text: String(r.result ?? '').slice(0, 40), subtype: r.subtype })),
      inits: s.messages.filter((m) => m.type === 'system' && m.subtype === 'init').map((m) => alias(m.session_id)),
    };

    const all = [...Object.values(chain).flatMap((r) => r.caps), ...cc];
    const mismatches = all.filter(envDiffers).map(row);
    const evidence = [
      ...Object.entries(chain).map(([k, r]) => `${k}: exit ${r.exit}, run ${r.failed ?? 'ended on a result'}, output session_id ${alias(r.outId)}, reply ${JSON.stringify(r.reply)}, hooks ${JSON.stringify(r.caps.map(row))}`),
      `chain workspace transcripts on disk: ${JSON.stringify(transcripts)}`,
      `clear stream: ended ${clear.why} (exit ${clear.code}), init session ids ${JSON.stringify(clear.inits)}, results ${JSON.stringify(clear.results)}`,
      `clear stream hooks: ${JSON.stringify(cc.map(row))}`,
      `hook firings where env CLAUDE_CODE_SESSION_ID differs from the input session_id: ${mismatches.length} of ${all.length}${mismatches.length ? ` ${JSON.stringify(mismatches)}` : ''}`,
    ];
    const observed = { chain: Object.fromEntries(Object.entries(chain).map(([k, r]) => [k, { exit: r.exit, failed: r.failed, outId: alias(r.outId), hooks: r.caps.map(row) }])), transcripts, clear: { ...clear, caps: undefined, hooks: cc.map(row) }, mismatches };
    return { ...decide({ chain, cc, clear, U, V, alias }), evidence, observed };
  },
};
