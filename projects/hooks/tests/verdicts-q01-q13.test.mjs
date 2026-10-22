// Q1's and Q13's verdict logic, offline: each def exports its decisions as
// pure functions that run(ctx) calls, so planted observations can drive every
// branch a live session rarely reaches (a turn the Stop context never
// extended, an API error on the continuation, request records blind to a
// delivery, a child agent that died, an agent() that hands back no text).
// The prompt ids, agent ids and words are built at run time, so this file
// stays clean for the leak test.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';
import q01, { REQUEST_TYPES, decide, delivery, extension } from '../probes/defs/q01-additional-context.mjs';
import q13, { agentFile, byPathVerdict, callArms, childEntries, childFacts, finalVerdict, nestNote, outsideShape } from '../probes/defs/q13-nested-workflow.mjs';
import { canary } from '../probes/lib.mjs';
import { UNSETTLED_OK, measured, recordOf } from '../probes/run.mjs';

// What run.mjs files a def's returned object as, for measured().
const filedAs = (id, returned) => recordOf({ id, question: '', assumption: '', loadBearing: true, version: '0.0.0', ms: 0, made: [], hash: 'h' }, returned);

describe('Q1: additionalContext on PostToolUse and Stop, and the Stop extension', () => {
  const p1 = randomUUID();
  const p2 = randomUUID();
  const fire = (active, promptId) => ({ hook_event_name: 'Stop', stop_hook_active: active, ...(promptId ? { prompt_id: promptId } : {}) });
  // 2.1.306's shape: the answered firing, its extension on the same prompt,
  // then turn 2's firing.
  const extendedRun = () => [fire(false, p1), fire(true, p1), fire(false, p2)];
  const all = (v) => ({ ss: v, post: v, stop: v });
  // A stream result as runStream collects it, and one an API error ended.
  const ok = () => ({ type: 'result', subtype: 'success', is_error: false, api_error_status: null });
  const err = (status = 429) => ({ type: 'result', subtype: 'success', is_error: true, api_error_status: status });
  const failure = (error, promptId) => ({ hook_event_name: 'StopFailure', error, ...(promptId ? { prompt_id: promptId } : {}) });
  const obs = (over = {}) => ({ results: [ok(), ok()], why: 'done', sent: all(true), seen: all(true), postFired: 1, stops: extendedRun(), stopEarly: true, stopFailures: [], ...over });
  const pick = (e) => ({ extended: e.extended, untied: e.untied });

  test('the def keeps its id, and run() decides through the exported delivery() and decide(), with a StopFailure capture', () => {
    assert.equal(q01.id, 'Q1');
    assert.equal(typeof q01.run, 'function');
    const src = q01.run.toString();
    assert.match(src, /\bdecide\(\{ results: s\.results, why: s\.why, sent, seen, postFired, stops, stopEarly, stopFailures \}\)/);
    assert.match(src, /const \{ carriers, sent, stopEarly \} = delivery\(transcript, words, stops\)/);
    assert.match(src, /StopFailure: \[\{ hooks: \[hook\(out, 'stop-failure'\)\] \}\]/);
    assert.match(src, /byLabel\(caps, 'stop-failure'\)/);
    assert.match(q01.assumption, /extends the turn/);
  });

  test('extension() shows firings as prompt aliases, never as prompt ids', () => {
    const e = extension(extendedRun());
    assert.equal(e.firings, 'false@p1,true@p1,false@p2');
    assert.deepEqual({ firstFalse: e.firstFalse, extended: e.extended, untied: e.untied }, { firstFalse: true, extended: true, untied: false });
    for (const id of [p1, p2]) assert.ok(!e.firings.includes(id));
    assert.equal(extension([fire(undefined, p1), fire(true)]).firings, 'missing@p1,true@none');
    assert.equal(extension([]).firings, '');
  });

  test('extension(): only a true on turn 1\'s prompt extends; a true on another prompt is the session-wide flag', () => {
    assert.equal(extension([fire(false, p1), fire(true, p2)]).extended, false);
    assert.equal(extension([fire(false, p1), fire(true, p2)]).untied, false);
    assert.equal(extension([fire(false, p1), fire(false, p2)]).extended, false);
    assert.equal(extension([fire(false, p1)]).extended, false);
  });

  test('extension(): a true that a missing prompt_id leaves uncomparable is untied, unless another true is tied', () => {
    assert.deepEqual(pick(extension([fire(false, p1), fire(true)])), { extended: false, untied: true });
    assert.deepEqual(pick(extension([fire(false), fire(true, p1)])), { extended: false, untied: true });
    assert.deepEqual(pick(extension([fire(false, p1), fire(true), fire(true, p1)])), { extended: true, untied: false });
    // No true at all: nothing needs tying, so a missing prompt_id is no gap.
    assert.deepEqual(pick(extension([fire(false), fire(false)])), { extended: false, untied: false });
  });

  // Transcript records in 2.1.306's shapes, cut to what delivery() reads: a
  // request's blobs and shape come just before the api-request that lists them.
  const rec = {
    user: (promptId, content) => ({ type: 'user', promptId, message: { role: 'user', content } }),
    blob: (text) => ({ type: 'api-request-blob', hash: randomBytes(8).toString('hex'), message: { role: 'user', content: [{ type: 'text', text }] } }),
    shape: (text) => ({ type: 'api-request-shape', shape: { system: [{ type: 'text', text }], tools: [] } }),
    request: () => ({ type: 'api-request', tail: [] }),
    context: (text) => ({ type: 'attachment', attachment: { type: 'hook_additional_context', content: [text] } }),
    summary: (text) => ({ type: 'system', subtype: 'stop_hook_summary', hookAdditionalContext: [text] }),
    reply: (text) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } }),
  };
  const words = () => ({ ss: canary('ALPHA'), post: canary('BRAVO'), stop: canary('CHARLIE') });
  const note = (w) => `The note word is ${w}.`;
  // Turn 1 reads a file and the Stop context extends it; turn 2 asks for the
  // words. `late` moves the stop word's request after turn 2's prompt record.
  function session(w, { late = false } = {}) {
    const stopRequest = [rec.blob(note(w.stop)), rec.request(), rec.reply('DONE')];
    return [
      rec.context(note(w.ss)), rec.user(p1, 'read note.txt'), rec.blob(note(w.ss)), rec.request(), rec.reply('reading'),
      rec.user(p1, [{ type: 'tool_result', content: 'nothing to see here' }]), rec.context(note(w.post)), rec.blob(note(w.post)), rec.request(), rec.reply('DONE'),
      rec.summary(note(w.stop)), rec.context(note(w.stop)), ...(late ? [] : stopRequest),
      rec.user(p2, 'repeat the note words'), ...(late ? stopRequest : []), rec.blob('repeat the note words'), rec.request(), rec.reply(`session-start: ${w.ss}`),
    ];
  }

  test('delivery(): a word is sent when a request record (blob or shape) holds it, and carriers list every record that does', () => {
    assert.deepEqual(REQUEST_TYPES, ['api-request-blob', 'api-request-shape']);
    const w = words();
    const d = delivery(session(w), w, extendedRun());
    assert.deepEqual(d.sent, all(true));
    assert.deepEqual(d.carriers, {
      ss: ['attachment:hook_additional_context', 'api-request-blob', 'assistant'],
      post: ['attachment:hook_additional_context', 'api-request-blob'],
      stop: ['system', 'attachment:hook_additional_context', 'api-request-blob'],
    });
    // A context, a hook summary or a reply holding a word is no request.
    const unsent = session(w).filter((r) => r.type !== 'api-request-blob');
    assert.deepEqual(delivery(unsent, w, extendedRun()).sent, all(false));
    // A word in a request's system prompt (its shape record) reached the model too.
    const inShape = [rec.shape(note(w.ss)), rec.shape(note(w.stop)), ...unsent];
    assert.deepEqual(delivery(inShape, w, extendedRun()).sent, { ss: true, post: false, stop: true });
  });

  test('delivery(): stopEarly reads whether the stop word\'s first request record comes before turn 2\'s prompt record, or null', () => {
    const w = words();
    assert.equal(delivery(session(w), w, extendedRun()).stopEarly, true);
    const late = delivery(session(w, { late: true }), w, extendedRun());
    assert.deepEqual({ sent: late.sent.stop, stopEarly: late.stopEarly }, { sent: true, stopEarly: false });
    // A shape that carries the word dates its delivery like a blob does.
    const shaped = session(w, { late: true });
    shaped.splice(shaped.findIndex((r) => r.type === 'user' && r.promptId === p2), 0, rec.shape(note(w.stop)), rec.request());
    assert.equal(delivery(shaped, w, extendedRun()).stopEarly, true);
    // Turn 2 is the first Stop prompt_id other than the first firing's,
    // however many turn-1 firings come before it.
    assert.equal(delivery(session(w), w, [fire(false, p1), fire(true, p1), fire(true, p1), fire(false, p2)]).stopEarly, true);
    // Unplaced: no Stop firing names turn 2, the first firing names no prompt,
    // no user record carries turn 2's prompt, or no request holds the word.
    const cases = {
      'no turn-2 firing': [session(w), [fire(false, p1), fire(true, p1)]],
      'first firing unnamed': [session(w), [fire(false), fire(true, p1), fire(false, p2)]],
      'no turn-2 record': [session(w).filter((r) => !(r.type === 'user' && r.promptId === p2)), extendedRun()],
      'no request holds it': [session(w).filter((r) => !(r.type === 'api-request-blob' && JSON.stringify(r).includes(w.stop))), extendedRun()],
      'no records': [[], extendedRun()],
    };
    for (const [name, [records, stops]] of Object.entries(cases)) assert.equal(delivery(records, w, stops).stopEarly, null, name);
  });

  test('VERIFIED needs both words in a request and a re-fire on turn 1\'s prompt, built from the check', () => {
    const d = decide(obs());
    assert.equal(d.verdict, 'VERIFIED');
    assert.match(d.summary, /the Stop hook re-fired with stop_hook_active true on turn 1's prompt \(firings false@p1,true@p1,false@p2\), its word in a request before turn 2's prompt$/);
    assert.match(d.summary, /the model repeated both/);
    // The echo corroborates; it never decides.
    const quiet = decide(obs({ seen: all(false) }));
    assert.equal(quiet.verdict, 'VERIFIED');
    assert.match(quiet.summary, /the model repeated neither/);
  });

  test('VERIFIED needs the Stop word in a request before turn 2\'s prompt: after it is a measured PARTIAL, unplaced is INCONCLUSIVE', () => {
    const late = decide(obs({ stopEarly: false }));
    assert.equal(late.verdict, 'PARTIAL');
    assert.equal(late.summary, 'the Stop context extended the turn, but the context reached the model only on turn 2: the first request record holding its word comes after turn 2\'s prompt record, so the extension ran without it (the Stop hook re-fired with stop_hook_active true on turn 1\'s prompt (firings false@p1,true@p1,false@p2); both words reached a request, the model repeated both)');
    assert.ok(!('unsettledOnly' in late));
    assert.equal(measured(filedAs('Q1', late)), true);
    const unplaced = decide(obs({ stopEarly: null }));
    assert.equal(unplaced.verdict, 'INCONCLUSIVE');
    assert.match(unplaced.summary, /^the Stop context extended the turn and its word reached a request, but no turn-2 prompt record places that request .*, so whether the context reached the model inside turn 1 is unmeasured/);
    // Only a strict true counts: a truthy stand-in is no record order.
    for (const v of [undefined, 1, 'true']) assert.notEqual(decide(obs({ stopEarly: v })).verdict, 'VERIFIED', String(v));
  });

  test('delivered but not extended is a measured PARTIAL that names the broken harness rule and never opts out', () => {
    for (const stops of [[fire(false, p1), fire(false, p2)], [fire(false, p1), fire(true, p2)], [fire(false, p1)]]) {
      const d = decide(obs({ stops }));
      const firings = extension(stops).firings;
      assert.equal(d.verdict, 'PARTIAL', firings);
      assert.equal(d.summary, `both contexts reached a request to the model (the model repeated both), but the Stop context did not extend the turn: no Stop firing with stop_hook_active true on turn 1's prompt (firings ${firings}), so tests/harness.mjs's KEEPS_GOING rule (assertBlocks accepts o.continues) does not hold on this version`);
      assert.ok(!('unsettledOnly' in d), firings);
      assert.equal(measured(filedAs('Q1', d)), true, firings);
    }
    assert.ok(!UNSETTLED_OK.includes('Q1'));
  });

  test('a first Stop firing that does not read false, or an untied true, is INCONCLUSIVE', () => {
    for (const [first, shown] of [[true, 'true'], [undefined, 'missing'], ['false', '"false"']]) {
      const d = decide(obs({ stops: [fire(first, p1), fire(true, p1)] }));
      assert.equal(d.verdict, 'INCONCLUSIVE', shown);
      assert.match(d.summary, new RegExp(`read stop_hook_active ${shown}, not false, so the field can't mark a continuation`));
    }
    for (const stops of [[fire(false, p1), fire(true)], [fire(false), fire(true, p1)]]) {
      const d = decide(obs({ stops }));
      assert.equal(d.verdict, 'INCONCLUSIVE');
      assert.match(d.summary, /missing prompt_id leaves it untied to turn 1/);
    }
  });

  test('the controls: a short session, a blind SessionStart word, no PostToolUse, no Stop firing', () => {
    assert.deepEqual(decide(obs({ results: [ok()], why: 'timeout' })), { verdict: 'INCONCLUSIVE', summary: 'the session ended after 1 turn(s) (timeout)' });
    assert.match(decide(obs({ sent: { ...all(true), ss: false } })).summary, /control word \(SessionStart\) never reached a request/);
    assert.match(decide(obs({ postFired: 0 })).summary, /PostToolUse never fired/);
    assert.match(decide(obs({ stops: [] })).summary, /the Stop hook never fired/);
    for (const over of [{ results: [] }, { sent: { ...all(true), ss: false } }, { postFired: 0 }, { stops: [] }]) assert.equal(decide(obs(over)).verdict, 'INCONCLUSIVE');
  });

  test('an API error (a StopFailure, an is_error result, a stream that did not end done) makes every no INCONCLUSIVE, while a turn-1 re-fire still VERIFIES', () => {
    // The continuation request failed: no true@p1, but its word is in the request it sent.
    const noRefire = [fire(false, p1), fire(false, p2)];
    const cases = [
      [{ stops: noRefire, stopFailures: [failure('rate_limit', p1)] }, /^StopFailure fired 1 time\(s\) \(rate_limit\): /],
      [{ stops: noRefire, results: [err(), ok()] }, /^1 of 2 result\(s\) read is_error \(success 429\): /],
      [{ stops: noRefire, why: 'exited' }, /^the stream ended exited, not done: /],
      [{ stopEarly: false, stopFailures: [failure('server_error', p1)] }, /^StopFailure fired 1 time\(s\) \(server_error\): /],
      [{ stopEarly: null, results: [ok(), err(529)] }, /^1 of 2 result\(s\) read is_error \(success 529\): /],
      [{ sent: { ...all(true), stop: false }, seen: { ...all(true), stop: false }, stops: noRefire, stopFailures: [failure('overloaded', p1), failure('overloaded', p2)] }, /^StopFailure fired 2 time\(s\) \(overloaded\): /],
    ];
    for (const [over, head] of cases) {
      const d = decide(obs(over));
      assert.equal(d.verdict, 'INCONCLUSIVE', head.source);
      assert.match(d.summary, head);
      assert.match(d.summary, /an API error ends a turn in StopFailure, not Stop, so a turn that did not extend, or a word no request holds, may be the error's doing, not the hooks'/);
      assert.equal(measured(filedAs('Q1', d)), false, head.source);
    }
    const every = decide(obs({ stops: noRefire, results: [err(), ok()], why: 'timeout', stopFailures: [failure(undefined, p1)] }));
    assert.match(every.summary, /^StopFailure fired 1 time\(s\) \(no error type\); 1 of 2 result\(s\) read is_error \(success 429\); the stream ended timeout, not done: /);
    // A re-fire on turn 1's prompt with the word sent before turn 2 proves the extension on its own.
    for (const over of [{ results: [ok(), err()] }, { stopFailures: [failure('rate_limit', p2)] }, { why: 'exited' }]) assert.equal(decide(obs(over)).verdict, 'VERIFIED', JSON.stringify(over));
  });

  test('a word the model repeated that no request record holds means the records are blind: INCONCLUSIVE, never CONTRADICTED', () => {
    const one = decide(obs({ sent: { ...all(true), stop: false } }));
    assert.deepEqual(one, { verdict: 'INCONCLUSIVE', summary: 'the model repeated the stop word, so it reached it, but no request record holds it: the request records are blind to that delivery' });
    const both = decide(obs({ sent: { ...all(true), post: false, stop: false } }));
    assert.equal(both.verdict, 'INCONCLUSIVE');
    assert.match(both.summary, /repeated the post-tool and stop words, so they reached it, but no request record holds them/);
    // A blind word sinks a clean no beside it: the run showed the blobs miss deliveries.
    assert.equal(decide(obs({ sent: { ...all(true), post: false, stop: false }, seen: { ...all(true), post: false } })).verdict, 'INCONCLUSIVE');
  });

  test('a no stands only beside a repeated session-start word: a model that repeats nothing guards nothing', () => {
    const silent = { ...all(false) };
    for (const sent of [{ ...all(true), stop: false }, { ...all(true), post: false }, { ...all(true), post: false, stop: false }]) {
      const d = decide(obs({ sent, seen: silent, stops: [fire(false, p1), fire(false, p2)] }));
      assert.equal(d.verdict, 'INCONCLUSIVE', JSON.stringify(sent));
      assert.match(d.summary, /additionalContext reached no request record, but the model never repeated even the session-start word a request did carry, so its silence can't rule out a delivery the records missed; no Stop firing/);
    }
    // An extended turn whose word is in no request reads the same way.
    assert.equal(decide(obs({ sent: { ...all(true), stop: false }, seen: silent })).verdict, 'INCONCLUSIVE');
  });

  test('CONTRADICTED only for a word in no request and no reply, naming what the Stop hook did', () => {
    const post = decide(obs({ sent: { ...all(true), post: false }, seen: { ...all(true), post: false } }));
    assert.equal(post.verdict, 'CONTRADICTED');
    assert.equal(post.summary, 'PostToolUse additionalContext never reached a request to the model, and the model never repeated its word; the Stop hook re-fired with stop_hook_active true on turn 1\'s prompt (firings false@p1,true@p1,false@p2)');
    const stop = decide(obs({ sent: { ...all(true), stop: false }, seen: { ...all(true), stop: false }, stops: [fire(false, p1), fire(false, p2)] }));
    assert.equal(stop.verdict, 'CONTRADICTED');
    assert.match(stop.summary, /^Stop additionalContext never reached a request to the model, and the model never repeated its word; no Stop firing with stop_hook_active true/);
    const both = decide(obs({ sent: { ...all(true), post: false, stop: false }, seen: { ...all(true), post: false, stop: false } }));
    assert.match(both.summary, /^PostToolUse and Stop additionalContext never reached a request to the model, and the model never repeated their words;/);
  });
});

describe('Q13: workflow({scriptPath}) and the byPath child\'s agent', () => {
  const word = () => canary('CHILD');
  const agentId = () => `a${randomBytes(8).toString('hex')}`;
  const entry = (w, id, over = {}) => ({ type: 'workflow_agent', label: 'child-agent', agentId: id, state: 'done', promptPreview: `Reply with exactly ${w} and nothing else. Use no tools.`, ...over });
  const assistant = (text, over = {}) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] }, ...over });
  const prompt = (w) => ({ type: 'user', message: { role: 'user', content: `Reply with exactly ${w} and nothing else. Use no tools.` } });
  const ran = (w) => ({ threw: false, v: { r: w, args: { via: 'path' } } });

  // A child agent's facts the way run() builds them, from planted records.
  function facts(w, { state = 'done', resultPreview, reply, apiError, failed } = {}) {
    const id = agentId();
    const entries = [entry(w, id, { state, ...(resultPreview === undefined ? {} : { resultPreview }) })];
    const records = [prompt(w), ...(reply === undefined ? [] : [assistant(reply)]), ...(apiError ? [assistant(apiError, { isApiErrorMessage: true })] : [])];
    const journal = [{ type: 'started', agentId: id, label: 'child-agent' }, ...(failed ? [{ type: 'failed', agentId: id, label: 'child-agent' }] : [])];
    return childFacts({ entries, journal, records, word: w });
  }
  const live = (w) => facts(w, { resultPreview: w, reply: w });
  const dead = (w) => facts(w, { state: 'error', apiError: 'API Error: 404 model not found', failed: true });
  const pickFacts = (c) => ({ found: c.found, said: c.said, died: c.died, failed: c.failed, apiErrors: c.apiErrors });

  test('the def keeps its id, and run() decides through the exported helpers', () => {
    assert.equal(q13.id, 'Q13');
    assert.equal(typeof q13.run, 'function');
    const src = q13.run.toString();
    for (const f of ['childEntries(', 'childFacts(', 'callArms(', 'outsideShape(', 'nestNote(', 'finalVerdict(']) assert.ok(src.includes(f), f);
    assert.doesNotMatch(src, /callArms\(\{[^)]*\bnest\b/, 'the nest arm never reaches callArms');
    assert.match(src, /const reach = outsideShape\(arms\.outsideCwd, arms\.outsideAdded, W\.outside, W\.added\);\s+if \(reach\.verdict\) return done\(reach\.verdict, /);
    assert.doesNotMatch(q13.assumption, /nest(ing|ed) (is )?(limited|one level)/i);
  });

  test('childEntries() takes the agents whose prompt preview holds the word, nothing else', () => {
    const w = word();
    const id = agentId();
    const progress = [
      { type: 'workflow_phase', index: 1, title: `phase ${w}` },
      entry(w, id),
      entry(word(), agentId()),
      { ...entry(w, agentId()), type: 'workflow_note' },
    ];
    assert.deepEqual(childEntries(progress, w).map((e) => e.agentId), [id]);
    assert.deepEqual(childEntries(undefined, w), []);
    assert.deepEqual(childEntries({ not: 'a list' }, w), []);
  });

  test('agentFile() names agent-<id>.jsonl only for a plain id', () => {
    const id = agentId();
    assert.equal(agentFile(id), `agent-${id}.jsonl`);
    for (const bad of ['../x', 'a/b', '', null, 7]) assert.equal(agentFile(bad), null, String(bad));
  });

  test('childFacts(): said comes from resultPreview or the agent\'s own text, never the prompt every file carries', () => {
    const w = word();
    assert.deepEqual(pickFacts(live(w)), { found: 1, said: true, died: false, failed: 0, apiErrors: 0 });
    assert.equal(facts(w, { reply: `sure: ${w}` }).said, true);
    assert.equal(facts(w, { resultPreview: w }).said, true);
    // The prompt record and the started journal line both hold the word.
    assert.deepEqual(pickFacts(facts(w)), { found: 1, said: false, died: false, failed: 0, apiErrors: 0 });
    assert.equal(facts(w).reply, null);
    const off = facts(w, { reply: 'something else' });
    assert.equal(off.said, false);
    assert.equal(off.reply, 'something else');
    // String content, as some records carry it.
    const id = agentId();
    assert.equal(childFacts({ entries: [entry(w, id)], journal: [], records: [{ type: 'assistant', message: { content: w } }], word: w }).said, true);
  });

  test('childFacts(): died from an error state, a failed journal line or an API error reply, whose text is never a word', () => {
    const w = word();
    assert.deepEqual(pickFacts(dead(w)), { found: 1, said: false, died: true, failed: 1, apiErrors: 1 });
    assert.equal(facts(w, { state: 'error' }).died, true);
    assert.equal(facts(w, { failed: true }).died, true);
    const echoed = facts(w, { apiError: `the request for ${w} failed` });
    assert.deepEqual({ said: echoed.said, died: echoed.died }, { said: false, died: true });
    // A failed line for some other agent is not this child's.
    const id = agentId();
    const other = childFacts({ entries: [entry(w, id)], journal: [{ type: 'failed', agentId: agentId() }], records: [], word: w });
    assert.deepEqual({ died: other.died, failed: other.failed }, { died: false, failed: 0 });
    assert.deepEqual(pickFacts(childFacts({ entries: [], journal: [], records: [], word: w })), { found: 0, said: false, died: false, failed: 0, apiErrors: 0 });
  });

  test('byPathVerdict(): a call that handed back its args and the word ran', () => {
    const w = word();
    assert.equal(byPathVerdict(ran(w), live(w), w), null);
    assert.equal(byPathVerdict({ threw: false, v: { r: `here: ${w}`, args: { via: 'path' } } }, live(w), w), null);
  });

  test('byPathVerdict(): no entry, a wrong or missing args, or a throw from a live agent is CONTRADICTED', () => {
    const w = word();
    const none = byPathVerdict(null, live(w), w);
    assert.equal(none.verdict, 'CONTRADICTED');
    assert.match(none.summary, /no byPath entry/);
    for (const v of [{ r: w, args: null }, { r: w, args: { via: 'name' } }, undefined, null, w]) {
      const got = byPathVerdict({ threw: false, v }, live(w), w);
      assert.equal(got.verdict, 'CONTRADICTED', JSON.stringify(v));
      assert.match(got.summary, /without the \{via: 'path'\} args it was given/);
    }
    const threw = byPathVerdict({ threw: true, msg: 'no such script' }, live(w), w);
    assert.equal(threw.verdict, 'CONTRADICTED');
    assert.match(threw.summary, /^workflow\(\{scriptPath\}\) threw \(no such script\); the child's agent did not die/);
    // A throw with no record of the agent, or from one that said its word, is the call's own.
    assert.equal(byPathVerdict({ threw: true, msg: 'x' }, childFacts({ entries: [], journal: [], records: [], word: w }), w).verdict, 'CONTRADICTED');
    assert.equal(byPathVerdict({ threw: true, msg: 'x' }, facts(w, { state: 'error', reply: w }), w).verdict, 'CONTRADICTED');
  });

  test('byPathVerdict(): a throw while the agent died silent is INCONCLUSIVE (a later agent() that throws must not fake a no)', () => {
    const w = word();
    const got = byPathVerdict({ threw: true, msg: 'agent failed' }, dead(w), w);
    assert.equal(got.verdict, 'INCONCLUSIVE');
    assert.match(got.summary, /threw \(agent failed\), but the child's agent died .* and left no reply of its own, so the throw may be the dead agent's, not the call's/);
  });

  test('byPathVerdict(): r without the word is CONTRADICTED only when the agent said it', () => {
    const w = word();
    const dropped = byPathVerdict({ threw: false, v: { r: null, args: { via: 'path' } } }, live(w), w);
    assert.equal(dropped.verdict, 'CONTRADICTED');
    assert.match(dropped.summary, /said its word, but workflow\(\{scriptPath\}\) handed back r null without it: the hand-back dropped the agent's result$/);
    const died = byPathVerdict({ threw: false, v: { r: null, args: { via: 'path' } } }, dead(w), w);
    assert.equal(died.verdict, 'INCONCLUSIVE');
    assert.match(died.summary, /r null lacks its word and the child's agent died/);
    const balked = byPathVerdict({ threw: false, v: { r: 'no', args: { via: 'path' } } }, facts(w, { reply: 'no' }), w);
    assert.equal(balked.verdict, 'INCONCLUSIVE');
    assert.match(balked.summary, /did not die .* and replied "no", without its word, so the hand-back of an agent's result measured nothing/);
  });

  test('byPathVerdict(): an r that is not text is INCONCLUSIVE, never read as a dropped word or as a run', () => {
    const w = word();
    // An object holding the prompt (and so the word), a list whose text is the
    // word, a number, a boolean: none of them is the agent's text.
    for (const [r, kind] of [[{ prompt: `Reply with exactly ${w}`, text: w }, 'an object'], [[w], 'an array'], [{}, 'an object'], [404, 'a number'], [false, 'a boolean']]) {
      for (const c of [live(w), dead(w)]) {
        const got = byPathVerdict({ threw: false, v: { r, args: { via: 'path' } } }, c, w);
        assert.ok(got, `${kind} read as a run`);
        assert.equal(got.verdict, 'INCONCLUSIVE', kind);
        assert.match(got.summary, new RegExp(`^agent\\(\\) handed back ${kind}, not text, so the byPath hand-back check cannot read it; the child's agent`));
      }
    }
    // An absent r is no type change: the dropped-word rule still reads it.
    for (const r of [null, undefined]) assert.equal(byPathVerdict({ threw: false, v: { r, args: { via: 'path' } } }, live(w), w).verdict, 'CONTRADICTED', String(r));
  });

  test('callArms(): every CONTRADICTED comes before any INCONCLUSIVE, so a dead byPath child hides no measured no', () => {
    const w = word();
    const unknownThrew = { threw: true, msg: 'no workflow with that name' };
    const deadPath = { threw: false, v: { r: null, args: { via: 'path' } } };
    const arms = (over) => ({ byPath: ran(w), child: live(w), unknownName: unknownThrew, word: w, ...over });
    assert.equal(callArms(arms()), null);
    assert.equal(callArms(arms({ byPath: deadPath, child: dead(w) })).verdict, 'INCONCLUSIVE');
    const unknown = callArms(arms({ byPath: deadPath, child: dead(w), unknownName: { threw: false, v: null } }));
    assert.equal(unknown.verdict, 'CONTRADICTED');
    assert.match(unknown.summary, /unknown name did not throw/);
    assert.equal(callArms(arms({ unknownName: null })).verdict, 'CONTRADICTED');
    // byPath's own CONTRADICTED wins over the unknown-name arm's.
    const first = callArms(arms({ byPath: { threw: true, msg: 'bad path' }, unknownName: { threw: false, v: null } }));
    assert.match(first.summary, /threw \(bad path\)/);
  });

  test('the nest arm is an observation only: a second nesting level that runs, throws or leaves nothing decides nothing', () => {
    const w = word();
    const nests = {
      ran: { threw: false, v: { r: canary('INNER'), args: { via: 'nest' } } },
      limit: { threw: true, msg: 'workflow() cannot be called from within a child workflow: nesting is limited to one level' },
      other: { threw: true, msg: 'unrelated' },
      none: null,
    };
    // Planted the way run() would see them: callArms takes no nest, so an
    // arms object carrying one changes nothing.
    for (const [name, nest] of Object.entries(nests)) {
      assert.equal(callArms({ byPath: ran(w), child: live(w), nest, unknownName: { threw: true, msg: 'x' }, word: w }), null, name);
    }
    assert.equal(nestNote(nests.ran), 'a second nesting level ran');
    assert.equal(nestNote(nests.limit), 'a second nesting level throws (workflow() cannot be called from within a child workflow: nesting is limited to one level)');
    assert.equal(nestNote(nests.other), 'a second nesting level throws (unrelated)');
    assert.equal(nestNote(null), 'the nest arm left no result');
    assert.equal(nestNote({ threw: true, msg: 'x'.repeat(300) }).length, 'a second nesting level throws ()'.length + 120);
  });

  test('outsideShape(): the call ran as is, or threw the read-scope rule beside a running --add-dir control; anything else is INCONCLUSIVE', () => {
    const wO = canary('AWAY');
    const wA = canary('ADDED');
    const went = (r, via) => ({ threw: false, v: { r, args: { via } } });
    const scope = { threw: true, msg: 'workflow({scriptPath}): scriptPath must be a file you can already read, or in a directory you have added' };
    assert.deepEqual(outsideShape(went(wO, 'outside'), null, wO, wA), { outside: 'a scriptPath outside the cwd ran as is' });
    const rule = outsideShape(scope, went(`here: ${wA}`, 'added'), wO, wA);
    assert.match(rule.outside, /^constraint: a scriptPath must be readable by the session, .* one outside both threw \(workflow\(\{scriptPath\}\): scriptPath must be a file you can already read/);
    assert.equal(rule.verdict, undefined);
    const failedToo = outsideShape(scope, { threw: true, msg: 'boom' }, wO, wA);
    assert.deepEqual(failedToo, { verdict: 'INCONCLUSIVE', summary: 'the --add-dir control failed as well (threw (boom)), so the outside-cwd call shape is unsettled' });
    const other = outsideShape({ threw: true, msg: 'boom' }, went(wA, 'added'), wO, wA);
    assert.deepEqual(other, { verdict: 'INCONCLUSIVE', summary: 'the outside-cwd arm threw (boom), which is neither a run nor the read-scope rule, so the outside-cwd call shape is unsettled' });
    assert.match(outsideShape(null, null, wO, wA).summary, /^the outside-cwd arm left no result, which is neither/);
    assert.match(outsideShape(went('nope', 'outside'), null, wO, wA).summary, /^the outside-cwd arm returned \{"r":"nope","args":\{"via":"outside"\}\}, which is neither a run nor the read-scope rule/);
    // The word with the wrong args is no run either.
    assert.equal(outsideShape(went(wO, 'elsewhere'), null, wO, wA).verdict, 'INCONCLUSIVE');
  });

  test('outsideShape(): an arm whose agent() handed back no text never runs, and is named as such', () => {
    const wO = canary('AWAY');
    const wA = canary('ADDED');
    const went = (r, via) => ({ threw: false, v: { r, args: { via } } });
    const scope = { threw: true, msg: 'scriptPath must be a file you can already read' };
    // A list whose text is the word, an object that carries it: neither is text.
    for (const [r, kind] of [[[wO], 'an array'], [{ text: wO }, 'an object'], [7, 'a number']]) {
      const got = outsideShape(went(r, 'outside'), went(wA, 'added'), wO, wA);
      assert.deepEqual(got, { verdict: 'INCONCLUSIVE', summary: `the outside-cwd arm's agent() handed back ${kind}, not text, which its word check cannot read, so the outside-cwd call shape is unsettled` }, kind);
    }
    const control = outsideShape(scope, went([wA], 'added'), wO, wA);
    assert.deepEqual(control, { verdict: 'INCONCLUSIVE', summary: 'the --add-dir control arm\'s agent() handed back an array, not text, which its word check cannot read, so the outside-cwd call shape is unsettled' });
  });

  test('finalVerdict(): the blocked-arm PARTIAL says unsettledOnly, and run.mjs does not count it as measured', () => {
    const p = finalVerdict('settled', ['the user-scope arm']);
    assert.deepEqual(p, { verdict: 'PARTIAL', summary: 'settled. Not run: the user-scope arm', unsettledOnly: true });
    assert.ok(UNSETTLED_OK.includes('Q13'));
    assert.equal(measured(filedAs('Q13', p)), false);
    const v = finalVerdict('settled', []);
    assert.deepEqual(v, { verdict: 'VERIFIED', summary: 'settled' });
    assert.equal(measured(filedAs('Q13', v)), true);
    // The flag never rescues a measured no.
    assert.equal(measured(filedAs('Q13', { verdict: 'CONTRADICTED', summary: '', unsettledOnly: true })), true);
  });
});
