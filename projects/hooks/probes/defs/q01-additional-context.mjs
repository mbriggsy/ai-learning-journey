// Q1: does a hook's additionalContext reach the model on PostToolUse and Stop,
// and does a Stop context extend the turn?
//
// One two-turn session. Three hooks each hand the model a different random
// word as additionalContext: SessionStart (the control; the README records
// that it delivers), PostToolUse on Read, and Stop. Turn 1 makes the model
// read a file and finish; turn 2 asks it to repeat every word it was given.
//
// Three instruments. The transcript's request records are the requests sent
// to the model (an api-request-blob holds one message of one, an
// api-request-shape its system prompt and tools), so a word inside one
// reached it; that decides delivery. The model repeating a word, in any reply,
// is corroboration, and a guard: the words are random, so one it repeated
// that no request record holds reached it some way the records don't show (Q2
// saw a delivered tool_result in none), and a no from them is then a blind
// instrument, not an answer. The guard needs a model that repeats what it
// got, so a no stands only beside a repeated session-start word. The Stop
// hook's own firings decide the extension, the rule tests/harness.mjs cites
// Q1 for: the hook answers on its first firing alone, so a context that
// extends turn 1 shows as a later firing on turn 1's prompt_id that reads
// stop_hook_active true. Only the prompt_id ties it to turn 1: the plan
// records an async Stop hook setting stop_hook_active for the whole session,
// so a true on its own proves nothing. A context delivered with no such firing
// is a measured deviation (PARTIAL), and so is one whose turn extended while
// its word first reached a request on turn 2 (delivery()'s stopEarly: the
// hooks reference has async hook output delivered on the next turn). Answering
// once also keeps a Stop context on turn 2 from replacing turn 2's answer with
// the extension's reply.
//
// An API error ends a turn in StopFailure, not Stop (hooks reference, Stop),
// so a continuation request that failed leaves no re-firing to see. A
// StopFailure capture, an is_error result or a stream that didn't end 'done'
// makes every no INCONCLUSIVE; a re-firing on turn 1's prompt still proves
// the extension.
import path from 'node:path';
import { arm, byLabel, canary, hook, readCaptures, readJsonl, runStream, track, transcriptFrom, write } from '../lib.mjs';

// What the Stop hook's inputs, in capture order, say about the turn extending.
// `firings` shows each as stop_hook_active@prompt, prompts aliased in order of
// first sight (false@p1,true@p1,false@p2), never as their ids; `first` is the
// first firing's value as shown there. `firstFalse`: it reads false, so a true
// can mark a continuation. `extended`: a later firing on the first firing's
// prompt_id reads true. `untied`: none is tied that way, but one reads true
// whose prompt can't be compared (it, or the first firing, has no prompt_id).
export function extension(stops) {
  const alias = new Map();
  const tag = (id) => {
    if (!id) return 'none';
    if (!alias.has(id)) alias.set(id, `p${alias.size + 1}`);
    return alias.get(id);
  };
  const shown = (v) => (v === undefined ? 'missing' : JSON.stringify(v));
  const firings = stops.map((i) => `${shown(i?.stop_hook_active)}@${tag(i?.prompt_id)}`).join(',');
  const p = stops[0]?.prompt_id;
  const later = stops.slice(1).filter((i) => i?.stop_hook_active === true);
  const extended = !!p && later.some((i) => i.prompt_id === p);
  return {
    firings, first: shown(stops[0]?.stop_hook_active), firstFalse: stops[0]?.stop_hook_active === false,
    extended, untied: !extended && later.length > 0 && (!p || later.some((i) => !i.prompt_id)),
  };
}

const NAMES = { post: 'post-tool', stop: 'stop' };

// The transcript record types that hold part of a request sent to the model.
export const REQUEST_TYPES = ['api-request-blob', 'api-request-shape'];

// Where each of `words` sits in the transcript `records`. `carriers`: the
// records holding it, as type (type:attachment type for an attachment), in
// order. `sent`: one of them is a request record. `stopEarly`: the stop word
// reached the model inside turn 1, read from record order. A request record is
// written once, just before the first request that carries it, so the first
// one holding the word dates its delivery; turn 2 begins at the first `user`
// record whose promptId is turn 2's, the first Stop prompt_id other than the
// first firing's (a hook's prompt_id is its turn's records' promptId). true:
// that request record comes first; false: after; null: the first firing names
// no prompt, no firing names another, or no record matches, so the delivery
// can't be tied to a turn.
export function delivery(records, words, stops) {
  const holds = (w) => (r) => JSON.stringify(r).includes(w);
  const kind = (r) => `${r?.type}${r?.attachment?.type ? `:${r.attachment.type}` : ''}`;
  const carriers = Object.fromEntries(Object.entries(words).map(([k, w]) => [k, records.filter(holds(w)).map(kind)]));
  const sent = Object.fromEntries(Object.entries(carriers).map(([k, list]) => [k, list.some((t) => REQUEST_TYPES.includes(t))]));
  const p1 = stops[0]?.prompt_id;
  const p2 = p1 ? stops.find((i) => i?.prompt_id && i.prompt_id !== p1)?.prompt_id : null;
  const sentAt = records.findIndex((r) => REQUEST_TYPES.includes(r?.type) && holds(words.stop)(r));
  const turn2At = p2 ? records.findIndex((r) => r?.type === 'user' && r.promptId === p2) : -1;
  return { carriers, sent, stopEarly: sentAt < 0 || turn2At < 0 ? null : sentAt < turn2At };
}

// What went wrong in the session, or null: StopFailure firings (by error
// type), results that read is_error (by subtype and API status), a stream
// that ended other than 'done'.
function trouble({ results, why, stopFailures }) {
  const types = [...new Set(stopFailures.map((i) => (typeof i?.error === 'string' ? i.error.slice(0, 40) : 'no error type')))];
  const errored = results.filter((r) => r?.is_error === true).map((r) => `${String(r.subtype ?? 'no subtype').slice(0, 40)}${r.api_error_status == null ? '' : ` ${String(r.api_error_status).slice(0, 12)}`}`);
  const parts = [
    stopFailures.length > 0 && `StopFailure fired ${stopFailures.length} time(s) (${types.join(', ')})`,
    errored.length > 0 && `${errored.length} of ${results.length} result(s) read is_error (${errored.join(', ')})`,
    why !== 'done' && `the stream ended ${why}, not done`,
  ].filter(Boolean);
  return parts.length ? parts.join('; ') : null;
}

// The verdict from what the session left: `results` (the stream's result
// messages, one per turn) and why the stream ended; per word, sent (in a
// request record) and seen (repeated in a reply); stopEarly (delivery()'s);
// postFired (PostToolUse firings); stops and stopFailures (the Stop and
// StopFailure hooks' inputs).
export function decide({ results, why, sent, seen, postFired, stops, stopEarly, stopFailures }) {
  const ext = extension(stops);
  const turns = results.length;
  if (turns < 2) return { verdict: 'INCONCLUSIVE', summary: `the session ended after ${turns} turn(s) (${why})` };
  if (!sent.ss) return { verdict: 'INCONCLUSIVE', summary: 'the control word (SessionStart) never reached a request, so the instrument cannot see' };
  if (!postFired) return { verdict: 'INCONCLUSIVE', summary: 'the model never read the file, so PostToolUse never fired' };
  if (!stops.length) return { verdict: 'INCONCLUSIVE', summary: 'the Stop hook never fired, so its context had nothing to deliver' };
  if (!ext.firstFalse) return { verdict: 'INCONCLUSIVE', summary: `the first Stop firing read stop_hook_active ${ext.first}, not false, so the field can't mark a continuation (firings ${ext.firings})` };
  if (ext.untied) return { verdict: 'INCONCLUSIVE', summary: `a later Stop firing read stop_hook_active true, but a missing prompt_id leaves it untied to turn 1 (firings ${ext.firings})` };
  const echoed = seen.post && seen.stop ? 'the model repeated both' : `the model repeated ${[seen.post && 'post-tool', seen.stop && 'stop'].filter(Boolean).join(' and ') || 'neither'}`;
  const refired = `${ext.extended ? 'the Stop hook re-fired' : 'no Stop firing'} with stop_hook_active true on turn 1's prompt (firings ${ext.firings})`;
  if (sent.post && sent.stop && ext.extended && stopEarly === true) return { verdict: 'VERIFIED', summary: `both contexts reached a request to the model (${echoed}), and the Stop context extended the turn: ${refired}, its word in a request before turn 2's prompt` };
  // Every branch below reads an absence (no re-firing, no early request, no
  // request at all), and an API error leaves each of those on its own.
  const failed = trouble({ results, why, stopFailures });
  if (failed) return { verdict: 'INCONCLUSIVE', summary: `${failed}: an API error ends a turn in StopFailure, not Stop, so a turn that did not extend, or a word no request holds, may be the error's doing, not the hooks' (${refired})` };
  if (sent.post && sent.stop && ext.extended) {
    if (stopEarly === false) return { verdict: 'PARTIAL', summary: `the Stop context extended the turn, but the context reached the model only on turn 2: the first request record holding its word comes after turn 2's prompt record, so the extension ran without it (${refired}; both words reached a request, ${echoed})` };
    return { verdict: 'INCONCLUSIVE', summary: `the Stop context extended the turn and its word reached a request, but no turn-2 prompt record places that request (no Stop firing on another prompt, or no user record on it), so whether the context reached the model inside turn 1 is unmeasured (${refired})` };
  }
  if (sent.post && sent.stop) return { verdict: 'PARTIAL', summary: `both contexts reached a request to the model (${echoed}), but the Stop context did not extend the turn: ${refired}, so tests/harness.mjs's KEEPS_GOING rule (assertBlocks accepts o.continues) does not hold on this version` };
  const blind = ['post', 'stop'].filter((k) => seen[k] && !sent[k]);
  if (blind.length) {
    const one = blind.length === 1;
    return { verdict: 'INCONCLUSIVE', summary: `the model repeated the ${blind.map((k) => NAMES[k]).join(' and ')} word${one ? '' : 's'}, so ${one ? 'it' : 'they'} reached it, but no request record holds ${one ? 'it' : 'them'}: the request records are blind to that delivery` };
  }
  const missed = ['post', 'stop'].filter((k) => !sent[k]);
  const events = missed.map((k) => (k === 'post' ? 'PostToolUse' : 'Stop')).join(' and ');
  if (!seen.ss) return { verdict: 'INCONCLUSIVE', summary: `${events} additionalContext reached no request record, but the model never repeated even the session-start word a request did carry, so its silence can't rule out a delivery the records missed; ${refired}` };
  return { verdict: 'CONTRADICTED', summary: `${events} additionalContext never reached a request to the model, and the model never repeated ${missed.length === 1 ? 'its word' : 'their words'}; ${refired}` };
}

export default {
  id: 'Q1',
  question: 'Does additionalContext reach the model on PostToolUse and on Stop?',
  assumption: 'A PostToolUse or Stop hook can put text in front of the model with hookSpecificOutput.additionalContext, without blocking, and a Stop hook\'s context extends the turn (the hook fires again on the same prompt with stop_hook_active true).',
  loadBearing: true,
  async run(ctx) {
    const { ws, out } = arm(ctx, 'main');
    write(path.join(ws, 'note.txt'), 'nothing to see here\n');
    const words = { ss: canary('ALPHA'), post: canary('BRAVO'), stop: canary('CHARLIE') };
    const ctxOut = (event, word, which) => ({ hookSpecificOutput: { hookEventName: event, additionalContext: `The ${which} note word is ${word}.` } });
    const settings = {
      hooks: {
        SessionStart: [{ hooks: [hook(out, 'ss', { respond: ctxOut('SessionStart', words.ss, 'session-start') })] }],
        PostToolUse: [{ matcher: 'Read', hooks: [hook(out, 'post', { respond: ctxOut('PostToolUse', words.post, 'post-tool') })] }],
        Stop: [{ hooks: [hook(out, 'stop', { respond: ctxOut('Stop', words.stop, 'stop'), firstOnly: true })] }],
        StopFailure: [{ hooks: [hook(out, 'stop-failure')] }],
      },
    };
    const s = await runStream({
      cwd: ws, out, settings, args: ['--tools', 'Read'],
      turns: [
        'Use the Read tool to read note.txt in the current directory, then reply with exactly the word DONE.',
        'Notes in this conversation each gave a "note word": a session-start note, a post-tool note and a stop note. Reply with exactly three lines, `session-start: <word>`, `post-tool: <word>` and `stop: <word>`, copying each word exactly, or `none` for a note you never received.',
      ],
    });
    const caps = readCaptures(out);
    track(ctx, caps);
    const last = s.results.at(-1)?.result ?? '';
    const replies = s.results.map((r) => String(r.result ?? '')).join('\n');
    const seen = Object.fromEntries(Object.entries(words).map(([k, w]) => [k, replies.includes(w)]));
    const transcript = readJsonl(transcriptFrom(caps));
    const stops = byLabel(caps, 'stop').map((c) => c.input);
    const stopFailures = byLabel(caps, 'stop-failure').map((c) => c.input);
    const { carriers, sent, stopEarly } = delivery(transcript, words, stops);
    const postFired = byLabel(caps, 'post').length;
    const evidence = [
      `in a request sent to the model (an api-request-blob or api-request-shape record): session-start ${sent.ss}, post-tool ${sent.post}, stop ${sent.stop}`,
      `the first request record holding the stop word, against turn 2's prompt record: ${stopEarly === null ? 'unplaced' : stopEarly ? 'before it' : 'after it'}`,
      `repeated by the model in a reply: session-start ${seen.ss}, post-tool ${seen.post}, stop ${seen.stop}`,
      `turn-2 reply: ${JSON.stringify(last)}`,
      `transcript records carrying each word: ${JSON.stringify(carriers)}`,
      `Stop hook firings in order, stop_hook_active@prompt: ${extension(stops).firings || 'none'}`,
      `StopFailure firings: ${stopFailures.length}${stopFailures.length ? ` (error ${JSON.stringify(stopFailures.map((i) => i?.error ?? null))})` : ''}`,
      `PostToolUse firings: ${postFired}`,
      `stream: ${s.why}, ${s.results.length} results, ${s.results.filter((r) => r.is_error === true).length} of them is_error`,
    ];
    return { ...decide({ results: s.results, why: s.why, sent, seen, postFired, stops, stopEarly, stopFailures }), evidence };
  },
};
