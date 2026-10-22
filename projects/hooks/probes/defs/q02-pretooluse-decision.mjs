// Q2: PreToolUse hookSpecificOutput.permissionDecision vs the top-level
// decision field.
//
// One headless run per arm, each in its own workspace, with only the Read
// tool. The model is asked to read probe.txt (whose first line is a random
// word) and to say REFUSED plus the reason if the read is refused. A
// PostToolUse capture on Read fires only when the read really ran, so it
// tells "blocked" from "the model didn't try"; a read that ran is decisive
// however the run ended.
//
// Whether the reason reached the model. A yes is the random reason word in
// the reply, in a request blob, or in the denied call's tool_result with an
// api-request recorded after it (2.1.306 rebuilds that tool_result from its
// transcript record and stores no blob for it). A no is decisive only when
// that tool_result went out without the word, the run ended on a clean
// result, and the same reading found the control's file word in its read's
// tool_result; anything less is unknown, never a no, so a run that failed or
// timed out before the reason could be read is INCONCLUSIVE.
//
// The arms where the two fields disagree have no documented answer.
// tests/harness.mjs reads them as deny wins, so they are measured, but they
// stay out of the verdict except that one whose read ran (the allow won)
// lowers it to PARTIAL.
import path from 'node:path';
import { arm, byLabel, canary, failure, hook, readCaptures, readJsonl, runClaude, scrubber, sleep, track, transcriptFrom, write } from '../lib.mjs';

const PROMPT = 'Use the Read tool to read probe.txt in the current directory. If the read succeeds, reply with exactly its first line and nothing else. If the read is refused or fails, reply with REFUSED: followed by the exact reason text you were given. Do not retry.';

const hso = (permissionDecision, permissionDecisionReason) => ({ hookEventName: 'PreToolUse', permissionDecision, ...(permissionDecisionReason ? { permissionDecisionReason } : {}) });

// The transcript's answer to a call PreToolUse saw: the first tool_result for
// one of `ids`, and whether an api-request was recorded after it (requests are
// built from the transcript, so that result went out in it).
function delivery(records, ids) {
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const b = r.type === 'user' && Array.isArray(r.message?.content) ? r.message.content.find((x) => x.type === 'tool_result' && ids.includes(x.tool_use_id)) : null;
    if (b) return { text: typeof b.content === 'string' ? b.content : JSON.stringify(b.content ?? ''), isError: b.is_error === true, sent: records.slice(i + 1).some((x) => x.type === 'api-request') };
  }
  return { text: null, isError: false, sent: false };
}

// The verdict from the arms' rows: {verdict, summary}. Its PARTIAL is a
// measured deviation (a mixed arm's allow won), so it never says
// unsettledOnly, and a re-roll to VERIFIED on one hash reads as a conflict.
export function decide(rows) {
  const control = rows.find((r) => r.arm === 'control');
  if (!control.tried || !control.ran) return { verdict: 'INCONCLUSIVE', summary: 'the control read never ran, so a blocked read would look the same as no read' };

  // A decided arm holds when its call was tried, never ran, and the reason
  // provably reached the model. A ran read is decisive; a missing reason is
  // decisive only on the terms in the header.
  const sees = control.contentSent;
  const reasonGone = (r) => r.tried && !r.reasonSeen && !r.failed && r.resultSent && sees;
  const decided = rows.filter((r) => r.expect === 'blocked');
  const wrong = decided.filter((r) => r.ran || reasonGone(r));
  const unknown = decided.filter((r) => !wrong.includes(r) && !(r.tried && r.reasonSeen));
  const why = (r) => (!r.tried ? `the model never attempted the read${r.failed ? ` (the run ${r.failed})` : ''}`
    : r.failed ? `the run ${r.failed} before the reason's delivery could be read`
      : !r.resultSent ? 'no request was recorded after the denied call\'s tool_result, so its delivery is unknown'
        : 'the control\'s read result was not readable in its transcript, so a missing reason cannot be told from a blind reading');

  // The mixed arms: what happened, for the summary and the PARTIAL rule.
  const mixedOutcome = (r) => (r.ran ? 'ran' : !r.tried ? 'not attempted' : r.failed && !r.denied ? `unknown (the run ${r.failed} before the call was answered)` : 'blocked');
  const mixA = rows.find((r) => r.arm === 'hso-allow-vs-old-block');
  const mixB = rows.find((r) => r.arm === 'hso-deny-vs-old-approve');
  const mixed = `when they disagree: allow + old block -> ${mixedOutcome(mixA)}; deny + old approve -> ${mixedOutcome(mixB)}`;
  const flips = [mixA, mixB].filter((r) => r.ran);

  if (wrong.length) return { verdict: 'CONTRADICTED', summary: `${wrong.map((r) => `${r.arm}: ${r.ran ? 'the read ran' : 'the denied call\'s tool_result went out without the reason'}`).join('; ')}; ${mixed}` };
  if (unknown.length) return { verdict: 'INCONCLUSIVE', summary: `${unknown.map((r) => `${r.arm}: ${why(r)}`).join('; ')}; ${mixed}` };
  const held = 'deny, the deprecated top-level block and exit 2 each stopped the read and handed the model their reason';
  if (flips.length) return { verdict: 'PARTIAL', summary: `${held}, but the allow won in ${flips.map((r) => r.arm).join(' and ')}, so tests/harness.mjs's deny-wins rule for mixed forms does not hold on this version; ${mixed}` };
  return { verdict: 'VERIFIED', summary: `${held}; ${mixed}` };
}

export default {
  id: 'Q2',
  question: 'PreToolUse: does hookSpecificOutput.permissionDecision deny the call, does the deprecated top-level decision still map, and which wins when they disagree?',
  assumption: 'A PreToolUse hook denies a tool call with permissionDecision "deny" (or exit 2) and its reason reaches the model; the deprecated top-level "block" still denies.',
  loadBearing: true,
  async run(ctx) {
    const scrub = scrubber();
    const R = (tag) => canary(`REASON-${tag}`);
    const arms = [
      { name: 'control', expect: 'ran', respond: undefined },
      { name: 'deny', expect: 'blocked', reason: R('DENY'), make: (r) => ({ respond: { hookSpecificOutput: hso('deny', r) } }) },
      { name: 'deprecated-block', expect: 'blocked', reason: R('OLD'), make: (r) => ({ respond: { decision: 'block', reason: r } }) },
      { name: 'exit-2', expect: 'blocked', reason: R('EXIT'), make: (r) => ({ stderr: r, exit: 2 }) },
      { name: 'hso-allow-vs-old-block', expect: 'deny-wins', reason: R('MIXA'), make: (r) => ({ respond: { decision: 'block', reason: r, hookSpecificOutput: hso('allow') } }) },
      { name: 'hso-deny-vs-old-approve', expect: 'deny-wins', reason: R('MIXB'), make: (r) => ({ respond: { decision: 'approve', hookSpecificOutput: hso('deny', r) } }) },
    ];
    const rows = [];
    for (const a of arms) {
      const { ws, out } = arm(ctx, a.name);
      const content = canary('CONTENT');
      write(path.join(ws, 'probe.txt'), `${content}\n`);
      const opts = a.make ? a.make(a.reason) : {};
      const settings = {
        hooks: {
          PreToolUse: [{ matcher: 'Read', hooks: [hook(out, 'pre', opts)] }],
          PostToolUse: [{ matcher: 'Read', hooks: [hook(out, 'post')] }],
        },
      };
      const res = runClaude({ cwd: ws, out, prompt: PROMPT, settings, args: ['--tools', 'Read'] });
      const caps = readCaptures(out);
      track(ctx, caps);
      const reply = res.json?.result ?? '';
      const records = readJsonl(transcriptFrom(caps));
      const d = delivery(records, byLabel(caps, 'pre').map((c) => c.input?.tool_use_id).filter(Boolean));
      const blobs = records.filter((r) => r.type === 'api-request-blob').map((r) => JSON.stringify(r.message ?? ''));
      const reasonIn = a.reason ? { result: d.sent && !!d.text?.includes(a.reason), blob: blobs.some((b) => b.includes(a.reason)), reply: reply.includes(a.reason) } : null;
      rows.push({
        arm: a.name, expect: a.expect, tried: byLabel(caps, 'pre').length > 0, ran: byLabel(caps, 'post').length > 0 || reply.includes(content),
        failed: failure(res), resultSent: d.sent, denied: d.isError, contentSent: d.sent && !!d.text?.includes(content),
        reasonIn, reasonSeen: reasonIn ? reasonIn.result || reasonIn.blob || reasonIn.reply : null,
        reply: scrub(reply.slice(0, 300)), exit: res.status,
      });
      await sleep(1500);
    }
    const evidence = rows.map((r) => scrub(`${r.arm}: tried ${r.tried}, ran ${r.ran}, run ${r.failed ?? 'ended on a result'}, its tool_result went out in a request ${r.resultSent}, ${r.reasonIn ? `reason in that tool_result ${r.reasonIn.result}, in a request blob ${r.reasonIn.blob}, in the reply ${r.reasonIn.reply}` : `file word in that tool_result ${r.contentSent}`}, exit ${r.exit}, reply ${JSON.stringify(r.reply)}`));
    return { ...decide(rows), evidence, observed: rows };
  },
};
