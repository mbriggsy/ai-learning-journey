// Q15's verdict pieces that need no claude: toolVerdict, the (c) decision
// over the offered-tools lists (allowlist leaks, the reviewed harness extras,
// the stub MCP server's controls); bashResult, bashAttempts and decideC, (c)
// as run() decides it once both sessions are read; bPath and decideB, (b)'s
// omitClaudeMd tail; and the stub server itself, run on its own over stdio.
// Every list, id and word is planted; no real id or path appears here.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import q15, { DENY_REASON, HARNESS_EXTRAS, MCP_SERVER, MCP_TOOL, STUB_MCP, bPath, bashAttempts, bashResult, decide, decideB, decideC, toolVerdict } from '../probes/defs/q15-agent-definitions.mjs';
import { measured } from '../probes/run.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A run that holds, in 2.1.306's shapes plus the stub: each allowlisted agent
// offered its tools and advisor, both controls offered the stub's tool.
const clean = () => ({
  ro: ['Read', 'advisor'],
  rb: ['Read', 'Bash', 'advisor'],
  ref: ['Read', 'advisor'],
  def: ['Bash', 'Edit', 'Read', 'Write', 'advisor', MCP_TOOL],
  agMain: ['Agent', 'Read', 'Bash', 'advisor', MCP_TOOL],
});
const verdictOf = (patch) => toolVerdict({ ...clean(), ...patch });
const plus = (who, ...tools) => ({ [who]: [...clean()[who], ...tools] });
const minusStub = (who) => ({ [who]: clean()[who].filter((t) => t !== MCP_TOOL) });

describe('Q15 (c): toolVerdict', () => {
  test('the def loads as Q15, and run() decides (c) then (b) through decideC and decideB, with the stub and tool search off', () => {
    assert.equal(q15.id, 'Q15');
    assert.equal(typeof q15.run, 'function');
    assert.deepEqual(HARNESS_EXTRAS, ['advisor']);
    assert.equal(MCP_TOOL, `mcp__${MCP_SERVER}__stub_echo`);
    const src = q15.run.toString();
    for (const re of [/toolVerdict\(/, /bashAttempts\(/, /bPath\(/, /decideC\(/, /decideB\(/, /STUB_MCP/, /--mcp-config/, /ENABLE_TOOL_SEARCH: 'false'/]) assert.match(src, re);
    // Both halves are always asked, and decide() orders them (a kept word
    // outranks an unmeasured (c)).
    assert.match(src, /const c = decideC\([^;]*\);\s*const d = decide\(\{ c, b: decideB\(\{ bAg, bWf \}\) \}\);\s*return done\(d\.verdict, d\.summary\);/);
    // Its PARTIAL is a measured deviation: no result of Q15 opts out of conflict counting.
    for (const f of [src, decideB.toString(), decideC.toString()]) assert.doesNotMatch(f, /unsettledOnly\s*[:,}]/);
  });

  test('a run that holds: verdict null, no leak on any agent, with or without advisor', () => {
    assert.deepEqual(verdictOf({}), { verdict: null, why: '', leaks: { ro: [], rb: [], ref: [] } });
    const bare = verdictOf({ ro: ['Read'], rb: ['Read', 'Bash'], ref: ['Read'] });
    assert.equal(bare.verdict, null);
  });

  test('a missing or empty record, or one without its allowlisted tool, is INCONCLUSIVE, before a leak on ro or rb is read', () => {
    for (const [patch, who] of [
      [{ ro: null }, /\bro \(Read\)/],
      [{ rb: ['Read', 'advisor'] }, /\brb \(Bash\)/],
      [{ ref: [] }, /reference q15-ro \(Read\)/],
      [{ ro: ['Write'] }, /\bro \(Read\)/],
    ]) {
      const v = verdictOf(patch);
      assert.equal(v.verdict, 'INCONCLUSIVE', JSON.stringify(patch));
      assert.match(v.why, who);
    }
  });

  test('a tool offered to ro or rb outside its allowlist is a leak: a pool tool, an MCP tool, ToolSearch, DeferredToolPlaceholder', () => {
    for (const [patch, leak] of [
      [plus('ro', 'Bash'), { ro: ['Bash'], rb: [] }],
      [plus('rb', 'Write'), { ro: [], rb: ['Write'] }],
      [plus('ro', MCP_TOOL), { ro: [MCP_TOOL], rb: [] }],
      [plus('rb', 'mcp__other__thing'), { ro: [], rb: ['mcp__other__thing'] }],
      [plus('ro', 'ToolSearch'), { ro: ['ToolSearch'], rb: [] }],
      [plus('rb', 'DeferredToolPlaceholder'), { ro: [], rb: ['DeferredToolPlaceholder'] }],
    ]) {
      const v = verdictOf(patch);
      assert.equal(v.verdict, 'CONTRADICTED', JSON.stringify(patch));
      assert.deepEqual({ ro: v.leaks.ro, rb: v.leaks.rb }, leak);
      assert.match(v.why, /workflow path ignores the tools allowlist/);
    }
  });

  test('a tool offered on both paths is still a leak: extras are a fixed list, never computed from the reference', () => {
    const v = verdictOf({ ...plus('ro', 'NewHarnessTool'), ...plus('ref', 'NewHarnessTool') });
    assert.equal(v.verdict, 'CONTRADICTED');
    assert.deepEqual(v.leaks.ro, ['NewHarnessTool']);
    const mcp = verdictOf({ ...plus('ro', MCP_TOOL), ...plus('ref', MCP_TOOL) });
    assert.equal(mcp.verdict, 'CONTRADICTED');
    assert.deepEqual(mcp.leaks.ro, [MCP_TOOL]);
  });

  test('a leak the reference was offered too says neither path cuts it, and never invites a name HARNESS_EXTRAS may not hold', () => {
    const v = verdictOf({ ...plus('ro', 'NewHarnessTool'), ...plus('ref', 'NewHarnessTool') });
    assert.match(v.why, /^the workflow path ignores the tools allowlist, offering ro \["NewHarnessTool"\] and rb \[\] outside it; /);
    assert.match(v.why, /the Agent-tool reference q15-ro was offered \["NewHarnessTool"\] too, so neither path cuts it: review it, into HARNESS_EXTRAS only if harmless$/);
    // Only the shared names: rb's own leak is not the reference's.
    const mixed = verdictOf({ ...plus('ro', 'NewHarnessTool'), ...plus('rb', 'Edit'), ...plus('ref', 'NewHarnessTool') });
    assert.match(mixed.why, /reference q15-ro was offered \["NewHarnessTool"\] too/);
    // A pool tool, ToolSearch or DeferredToolPlaceholder on both paths is
    // named as one that can never be an extra.
    for (const t of ['Write', 'Bash', 'ToolSearch', 'DeferredToolPlaceholder']) {
      const who = t === 'Bash' ? 'ro' : 'rb';
      const w = verdictOf({ ...plus(who, t), ...plus('ref', t) });
      assert.equal(w.verdict, 'CONTRADICTED', t);
      assert.match(w.why, new RegExp(`offered \\["${t}"\\] too, so neither path cuts it: review it, into HARNESS_EXTRAS only if harmless \\(never \\["${t}"\\]: `), t);
    }
    // A leak the reference was not offered names no reference.
    for (const patch of [plus('ro', 'NewHarnessTool'), { ...plus('rb', 'Edit'), ...plus('ref', 'Write') }]) assert.doesNotMatch(verdictOf(patch).why, /neither path|HARNESS_EXTRAS/);
  });

  test('a leak on ro or rb is CONTRADICTED even when a control is blind or the reference failed', () => {
    assert.equal(verdictOf({ ...plus('ro', 'Write'), ...minusStub('def'), agMain: null }).verdict, 'CONTRADICTED');
    assert.equal(verdictOf({ ...plus('rb', 'Edit'), ...plus('ref', 'Write') }).verdict, 'CONTRADICTED');
  });

  test('an MCP tool offered to the Agent-tool reference is CONTRADICTED, even with a control blind', () => {
    for (const patch of [plus('ref', MCP_TOOL), { ...plus('ref', MCP_TOOL), ...minusStub('def'), ...minusStub('agMain') }, plus('ref', 'mcp__other__thing')]) {
      const v = verdictOf(patch);
      assert.equal(v.verdict, 'CONTRADICTED', JSON.stringify(patch));
      assert.match(v.why, /Agent tool ignores the tools allowlist for MCP tools/);
    }
  });

  test("the reference's MCP leak is read first, needing neither ro's nor rb's record, but only from a record that lists Read", () => {
    for (const patch of [{ ro: null }, { rb: null, ro: [] }, { rb: ['Read', 'advisor'] }, { ...plus('ro', 'Write') }]) {
      const v = verdictOf({ ...plus('ref', MCP_TOOL), ...patch });
      assert.equal(v.verdict, 'CONTRADICTED', JSON.stringify(patch));
      assert.equal(v.why, `the Agent tool ignores the tools allowlist for MCP tools: q15-ro, allowed only Read, was offered ${JSON.stringify([MCP_TOOL])}`);
    }
    // A reference record without its Read can't be read: no leak from it.
    const v = verdictOf({ ref: ['advisor', MCP_TOOL] });
    assert.equal(v.verdict, 'INCONCLUSIVE');
    assert.match(v.why, /reference q15-ro \(Read\)/);
  });

  test('a control never offered the stub\'s tool, or without a record, is INCONCLUSIVE', () => {
    for (const [patch, who] of [
      [minusStub('def'), /default agent/],
      [{ def: null }, /default agent/],
      [minusStub('agMain'), /Agent-path session/],
      [{ agMain: null }, /Agent-path session/],
      [{ ...minusStub('def'), ...minusStub('agMain') }, /default agent and the Agent-path session/],
      // The same tool name from any other server is not the stub's.
      [{ def: ['Bash', 'Read', 'mcp__other__stub_echo'] }, /default agent/],
    ]) {
      const v = verdictOf(patch);
      assert.equal(v.verdict, 'INCONCLUSIVE', JSON.stringify(patch));
      assert.match(v.why, who);
      assert.match(v.why, /never offered the stub server's/);
    }
  });

  test('any other tool only the reference was offered is a failed reference: INCONCLUSIVE', () => {
    for (const t of ['Write', 'Bash', 'ToolSearch', 'DeferredToolPlaceholder', 'NewHarnessTool']) {
      const v = verdictOf(plus('ref', t));
      assert.equal(v.verdict, 'INCONCLUSIVE', t);
      assert.deepEqual(v.leaks.ref, [t]);
      assert.match(v.why, /only the Agent-tool reference/);
    }
  });

  test('the default agent may be offered anything: it has no allowlist', () => {
    assert.equal(verdictOf(plus('def', 'ToolSearch', 'mcp__other__thing', 'Agent')).verdict, null);
  });
});

// The workflow session's deny captures, as run() maps them: agentId null is
// the main thread.
const deny = (agentId, agentType, command, tool = 'Bash') => ({ tool, agentId, agentType, command });
// Bash calls as toolPairs pairs them, by what their result said: the probe's
// deny reason (the CLI's wording around it is not pinned, so only the reason
// is matched), a run's output, the CLI's unknown-tool refusal (errors.md's
// text in the tool_use_error wrapper a validation refusal comes back in), no
// result, and an error that is none of those.
const CALL = {
  deny: { answered: true, isError: true, text: `hook said: ${DENY_REASON}` },
  ran: { answered: true, isError: false, text: 'Q15C_RO' },
  refused: { answered: true, isError: true, text: '<tool_use_error>Error: No such tool available: Bash</tool_use_error>' },
  unanswered: { answered: false, isError: false, text: null },
  failed: { answered: true, isError: true, text: 'Exit code 1' },
};
// Workflow agents as run() builds them: an id, the type SubagentStart gave,
// and the Bash calls in its own transcript, by CALL kind.
const ag = (id, type, ...calls) => ({ id, type, bash: calls.map((k) => ({ name: 'Bash', ...CALL[k] })) });
const AG = { ro: ag('ro1', 'q15-ro'), rb: ag('rb1', 'q15-rb'), def: ag('df1', 'workflow-subagent') };
const DENIES = [deny('rb1', 'q15-rb', 'echo Q15C_RB'), deny('df1', 'workflow-subagent', 'echo Q15C_DEF')];
const attOf = (denies = DENIES, agents = AG) => ({ ro: bashAttempts(denies, agents.ro, 'RO'), rb: bashAttempts(denies, agents.rb, 'RB'), def: bashAttempts(denies, agents.def, 'DEF') });
// bashAttempts' answer, the uncounted transcript calls 0 unless given.
const tally = (hook, transcript, stray = [], { refused = 0, unread = 0 } = {}) => ({ hook, transcript, refused, unread, stray });

describe('Q15 (c): bashResult and bashAttempts, an attempt only from that agent, and only a call the CLI took', () => {
  test('bashResult: the deny reason or a run is a call the CLI took; an unknown-tool refusal is refused; no result, or another error, is unread', () => {
    for (const [k, want] of [['deny', 'ran'], ['ran', 'ran'], ['refused', 'refused'], ['unanswered', 'unread'], ['failed', 'unread']]) assert.equal(bashResult(CALL[k]), want, k);
    // The reason counts error or not; the refusal reads by errors.md's words,
    // with or without the wrapper, and only as an error.
    assert.equal(bashResult({ answered: true, isError: false, text: DENY_REASON }), 'ran');
    assert.equal(bashResult({ answered: true, isError: true, text: 'Error: No such tool available: Bash. Tool names are case-sensitive: call Bash instead.' }), 'refused');
    assert.equal(bashResult({ answered: true, isError: false, text: 'No such tool available' }), 'ran');
    // A tool_use_error naming no missing tool (a schema refusal of a tool the
    // CLI holds, say) is no proof the tool was never offered.
    assert.equal(bashResult({ answered: true, isError: true, text: '<tool_use_error>InputValidationError: a required parameter is missing</tool_use_error>' }), 'unread');
    for (const p of [null, undefined, {}, { answered: true, isError: true }]) assert.equal(bashResult(p), 'unread', JSON.stringify(p));
  });

  test("an agent's own deny and the transcript calls the CLI took count; nothing is stray", () => {
    assert.deepEqual(bashAttempts(DENIES, AG.rb, 'RB'), tally(1, 0));
    assert.deepEqual(bashAttempts([], ag('rb1', 'q15-rb', 'deny', 'ran'), 'RB'), tally(0, 2));
    // Its own id counts whatever the command says.
    assert.equal(bashAttempts([deny('rb1', 'q15-rb', 'echo something else')], AG.rb, 'RB').hook, 1);
  });

  test('a transcript call the CLI refused as no such tool, or one with no readable result, is tallied apart and never counted', () => {
    assert.deepEqual(bashAttempts([], ag('ro1', 'q15-ro', 'refused', 'unanswered', 'failed', 'refused'), 'RO'), tally(0, 0, [], { refused: 2, unread: 2 }));
    assert.deepEqual(bashAttempts([], ag('ro1', 'q15-ro', 'refused', 'ran'), 'RO'), tally(0, 1, [], { refused: 1 }));
  });

  test("a main-thread or another agent's deny carrying ro's tag never marks ro as reaching Bash, and is named as stray", () => {
    const x = bashAttempts([...DENIES, deny(null, null, 'echo Q15C_RO'), deny('rb1', 'q15-rb', 'echo Q15C_RO')], AG.ro, 'RO');
    assert.equal(x.hook, 0);
    assert.equal(x.transcript, 0);
    assert.deepEqual(x.stray, ['the main thread: echo Q15C_RO', 'agent rb1 [q15-rb]: echo Q15C_RO']);
    // So (c) still holds, where counting the tag read ro as having tried Bash.
    const c = decideC(cIn({ att: { ...attOf(), ro: x } }));
    assert.equal(c.verdict, null);
    assert.match(c.why, /Bash attempts \{"hook":0,"transcript":0,"refused":0,"unread":0,"stray":\["the main thread: echo Q15C_RO"/);
  });

  test('nor does one satisfy the rb or def controls: INCONCLUSIVE, naming the stray denies', () => {
    const c = decideC(cIn({ att: attOf([deny(null, null, 'echo Q15C_RB'), deny(null, null, 'echo Q15C_DEF')]) }));
    assert.equal(c.verdict, 'INCONCLUSIVE');
    assert.match(c.why, /the controls never reached Bash/);
    assert.match(c.why, /rb \{"hook":0,"transcript":0,"refused":0,"unread":0,"stray":\["the main thread: echo Q15C_RB"\]\}/);
    assert.match(c.why, /def \{"hook":0,"transcript":0,"refused":0,"unread":0,"stray":\["the main thread: echo Q15C_DEF"\]\}/);
    // Another agent's deny is no stand-in either, even one of rb's own type.
    const other = attOf([deny('df1', 'workflow-subagent', 'echo Q15C_RB'), deny('df1', 'workflow-subagent', 'echo Q15C_DEF')]);
    assert.deepEqual(other.rb, tally(0, 0, ['agent df1 [workflow-subagent]: echo Q15C_RB']));
    assert.deepEqual(other.def, tally(2, 0));
    assert.equal(decideC(cIn({ att: other })).verdict, 'INCONCLUSIVE');
    assert.deepEqual(attOf([deny('zz9', 'q15-rb', 'echo Q15C_RB')]).rb, tally(0, 0, ['agent zz9 [q15-rb]: echo Q15C_RB']));
  });

  test('no agent counts nothing from the hook; another tag, another tool and the Agent path\'s ROAG are not ro\'s', () => {
    assert.deepEqual(bashAttempts(DENIES, null, 'RB'), tally(0, 0, ['agent rb1 [q15-rb]: echo Q15C_RB']));
    assert.deepEqual(bashAttempts([deny(null, null, 'echo Q15C_ROAG'), deny(null, null, 'echo Q15C_RO', 'Write')], AG.ro, 'RO'), tally(0, 0));
  });
});

// decideC's inputs for a run that holds: the planted lists above, each with
// one shape record, and both controls' own denies.
const view = (tools, shapes = 1) => ({ tools, shapes });
function cIn(patch = {}) {
  const k = clean();
  const c = { wf: { found: true, intact: true }, ro: view(k.ro), rb: view(k.rb), def: view(k.def), ref: view(k.ref), agMain: k.agMain, att: attOf(), ...patch };
  // ro and rb ran as the types their calls named, unless a test plants one.
  for (const [role, type] of [['ro', 'q15-ro'], ['rb', 'q15-rb']]) if (c[role] && c[role].type === undefined) c[role] = { ...c[role], type };
  return c;
}

describe('Q15 (c): decideC, the order run() reads (c) in', () => {
  test('a run that holds: verdict null, the text saying the stub reached both controls and no allowlisted agent', () => {
    const c = decideC(cIn());
    assert.equal(c.verdict, null);
    assert.match(c.why, /^\(c\) ro offered \["Read","advisor"\]/);
    assert.match(c.why, /reached the default agent and the Agent-path session, none of ro, rb or the reference$/);
  });

  test("ro or rb run as another type than its call named is INCONCLUSIVE, even where ro's own deny would read CONTRADICTED", () => {
    // A default agent (its file unloaded) has Bash; its deny under the 'ro'
    // label's agent id proves nothing about q15-ro's allowlist.
    const fellBack = decideC(cIn({ ro: { ...view(['Bash', 'Read']), type: 'workflow-subagent' }, att: attOf([...DENIES, deny('ro1', 'workflow-subagent', 'echo Q15C_RO')]) }));
    assert.equal(fellBack.verdict, 'INCONCLUSIVE', fellBack.why);
    assert.match(fellBack.why, /^a workflow agent did not run as the type its call named \(ro ran as "workflow-subagent", not q15-ro\)/);
    const untyped = decideC(cIn({ ro: { ...view(clean().ro), type: null }, rb: { ...view(clean().rb), type: null } }));
    assert.equal(untyped.verdict, 'INCONCLUSIVE', untyped.why);
    assert.match(untyped.why, /\(ro ran as null, not q15-ro; rb ran as null, not q15-rb\)/);
    // The reference's MCP leak, read from the Agent path alone, still comes first.
    assert.equal(decideC(cIn({ ref: view([...clean().ref, MCP_TOOL]), ro: { ...view(clean().ro), type: null } })).verdict, 'CONTRADICTED');
  });

  test("the reference's MCP leak is CONTRADICTED ahead of every workflow-path INCONCLUSIVE", () => {
    const ref = view([...clean().ref, MCP_TOOL]);
    for (const patch of [
      { wf: { found: false, intact: false } },
      { wf: { found: true, intact: false } },
      { ro: null, rb: null, def: null },
      { att: attOf([]) },
      { ro: view(clean().ro, 0), rb: view([]), def: view(['Bash', 'Read']) },
      { agMain: null },
    ]) {
      const c = decideC(cIn({ ref, ...patch }));
      assert.equal(c.verdict, 'CONTRADICTED', JSON.stringify(patch));
      assert.match(c.why, /^the Agent tool ignores the tools allowlist for MCP tools: q15-ro, allowed only Read, was offered \["mcp__/);
      assert.match(c.why, /read from the Agent-path session alone/);
    }
  });

  test("but not from a reference with no shape record, or none listing Read: the workflow gates come first then", () => {
    for (const ref of [view([...clean().ref, MCP_TOOL], 0), view(['advisor', MCP_TOOL]), null]) {
      const c = decideC(cIn({ ref, wf: { found: false, intact: false } }));
      assert.equal(c.verdict, 'INCONCLUSIVE', JSON.stringify(ref));
      assert.match(c.why, /did not run the probe's script \(record not found\)/);
    }
  });

  test("ro's and rb's leaks wait for the workflow gates: until the script ran as sent, a 'ro' label proves nothing", () => {
    const leaky = { ro: view(['Read', 'Bash']), rb: view(['Read', 'Bash', 'Write']) };
    for (const [patch, why] of [
      [{ wf: { found: true, intact: false } }, /record found, script changed/],
      [{ wf: { found: false, intact: false } }, /record not found/],
      [{ def: null }, /transcript was not found \(ro true, rb true, def false\)/],
      [{ att: attOf([]) }, /the controls never reached Bash/],
    ]) {
      const c = decideC(cIn({ ...leaky, ...patch }));
      assert.equal(c.verdict, 'INCONCLUSIVE', JSON.stringify(patch));
      assert.match(c.why, why);
    }
    assert.equal(decideC(cIn(leaky)).verdict, 'CONTRADICTED');
  });

  test('ro reaching Bash is CONTRADICTED: its own deny, or a transcript call whose result is the deny reason or a run, ahead of a blind offered list', () => {
    for (const att of [
      attOf([...DENIES, deny('ro1', 'q15-ro', 'echo Q15C_RO')]),
      attOf(DENIES, { ...AG, ro: ag('ro1', 'q15-ro', 'deny') }),
      attOf(DENIES, { ...AG, ro: ag('ro1', 'q15-ro', 'ran') }),
      attOf(DENIES, { ...AG, ro: ag('ro1', 'q15-ro', 'refused', 'ran') }),
    ]) {
      const c = decideC(cIn({ att }));
      assert.equal(c.verdict, 'CONTRADICTED', JSON.stringify(att.ro));
      assert.match(c.why, /^the workflow path ignores the tools allowlist: q15-ro, allowed only Read, reached Bash \(/);
    }
    // A deny under ro's own id means the CLI ran Bash for ro, whatever its
    // offered list says: it outranks the INCONCLUSIVE a ro with no shape
    // record reads alone.
    const blindRo = { ro: view(clean().ro, 0) };
    assert.equal(decideC(cIn(blindRo)).verdict, 'INCONCLUSIVE');
    assert.equal(decideC(cIn({ ...blindRo, att: attOf([...DENIES, deny('ro1', 'q15-ro', 'echo Q15C_RO')]) })).verdict, 'CONTRADICTED');
  });

  test("ro offered [Read] whose Bash call the CLI refused as no such tool is the model's non-compliance: logged, never CONTRADICTED", () => {
    for (const ro of [view(['Read']), view(clean().ro)]) {
      const c = decideC(cIn({ ro, att: attOf(DENIES, { ...AG, ro: ag('ro1', 'q15-ro', 'refused') }) }));
      assert.equal(c.verdict, null, c.why);
      assert.match(c.why, /Bash attempts \{"hook":0,"transcript":0,"refused":1,"unread":0,"stray":\[\]\}/);
      assert.match(c.why, /q15-ro called Bash 1 time\(s\) and the CLI refused it as no such tool: the model's non-compliance, never a leak/);
    }
    // Bash in ro's offered list is still read as the leak it is.
    const offered = decideC(cIn({ ro: view(['Read', 'Bash']), att: attOf(DENIES, { ...AG, ro: ag('ro1', 'q15-ro', 'refused') }) }));
    assert.equal(offered.verdict, 'CONTRADICTED');
    assert.match(offered.why, /offering ro \["Bash"\]/);
    assert.doesNotMatch(decideC(cIn()).why, /non-compliance/);
  });

  test('a ro call the hook never saw, with no readable result, is INCONCLUSIVE, after a leak in the offered lists', () => {
    for (const k of ['unanswered', 'failed']) {
      const c = decideC(cIn({ att: attOf(DENIES, { ...AG, ro: ag('ro1', 'q15-ro', k) }) }));
      assert.equal(c.verdict, 'INCONCLUSIVE', k);
      assert.match(c.why, /^q15-ro made 1 Bash call\(s\) the hook never saw and whose result can't say whether the CLI took it /, k);
    }
    const leak = decideC(cIn({ ro: view(['Read', 'Bash']), att: attOf(DENIES, { ...AG, ro: ag('ro1', 'q15-ro', 'unanswered') }) }));
    assert.equal(leak.verdict, 'CONTRADICTED');
    assert.match(leak.why, /offering ro \["Bash"\]/);
  });

  test('a control seen only by a transcript call the CLI took is flagged; one only refused or unread never reached Bash', () => {
    const c = decideC(cIn({ att: attOf([DENIES[1]], { ...AG, rb: ag('rb1', 'q15-rb', 'deny') }) }));
    assert.equal(c.verdict, null);
    assert.match(c.why, /PreToolUse missed a control attempt the transcript shows/);
    for (const k of ['refused', 'unanswered', 'failed']) {
      const x = decideC(cIn({ att: attOf([DENIES[1]], { ...AG, rb: ag('rb1', 'q15-rb', k) }) }));
      assert.equal(x.verdict, 'INCONCLUSIVE', k);
      assert.match(x.why, /^the controls never reached Bash/, k);
    }
  });

  test("toolVerdict decides the rest, on what each agent was offered (null with no shape record)", () => {
    const c = decideC(cIn({ def: view(clean().def, 0) }));
    assert.equal(c.verdict, 'INCONCLUSIVE');
    assert.match(c.why, /default agent was never offered the stub server's/);
    assert.equal(decideC(cIn({ rb: view([...clean().rb, 'Edit']) })).verdict, 'CONTRADICTED');
  });
});

// (b)'s planted words and spawns: a spawn is the corpus of its requests.
const P = ['PCANARY', 'aa11bb'].join('-');
const M = ['MCANARY', 'cc22dd'].join('-');
const spawnOf = (tag, ...words) => ({ text: [`Context probe ${tag}. Reply SEEN:`, ...words].join('\n') });
// One path's bPath row for a run where every control holds and both omit
// spawns drop both words; `over` replaces any input.
const pathOf = (name, over = {}) => bPath({
  name, P, M, projDir: 'project', mainText: `${P}\n${M}`, keeps: [spawnOf('keep', P, M)], omits: [spawnOf('omit1'), spawnOf('omit2')], leak: false, ...over,
});
const bOf = (ag = {}, wf = {}) => decideB({ bAg: pathOf('Agent tool', ag), bWf: pathOf('Workflow', wf) });

describe('Q15 (b): bPath and decideB, the omitClaudeMd tail', () => {
  test('both paths drop both words: VERIFIED, with no opt-out flag', () => {
    const d = bOf();
    assert.equal(d.verdict, 'VERIFIED');
    assert.equal('unsettledOnly' in d, false);
    assert.match(d.why, /every omitClaudeMd spawn on both paths carried neither/);
    assert.deepEqual(pathOf('Agent tool').omitRows, [{ P: false, M: false, read: true }, { P: false, M: false, read: true }]);
  });

  test('a read, leak-free omit spawn that kept a word its main session carried is a measured PARTIAL', () => {
    for (const [ag, wf, word] of [
      [{ omits: [spawnOf('omit1', P), spawnOf('omit2')] }, {}, /\(Agent tool CLAUDE\.md\)/],
      [{}, { omits: [spawnOf('omit1'), spawnOf('omit2', M)] }, /\(Workflow MEMORY\.md\)/],
      [{ omits: [spawnOf('omit1', P, M), spawnOf('omit2', P)] }, {}, /\(Agent tool CLAUDE\.md, Agent tool MEMORY\.md\)/],
    ]) {
      const d = bOf(ag, wf);
      assert.equal(d.verdict, 'PARTIAL', JSON.stringify(d));
      assert.equal(d.unsettledOnly, undefined);
      assert.equal(measured({ id: 'Q15', ...d }), true, 'a VERIFIED re-roll on this hash must read as a conflict');
      assert.match(d.why, /^\(b\) an omitClaudeMd spawn kept a word /);
      assert.match(d.why, word);
    }
  });

  test('a blind control, on either path, with no kept word is INCONCLUSIVE', () => {
    for (const [ag, wf, why] of [
      [{ projDir: null }, {}, /Agent tool: no project folder from calibration/],
      [{}, { mainText: P }, /Workflow: main session lacks the MEMORY\.md word/],
      [{ mainText: M }, {}, /Agent tool: main session lacks the CLAUDE\.md word/],
      [{ keeps: [] }, {}, /Agent tool: a keep agent lacks the CLAUDE\.md word/],
      [{}, { keeps: [spawnOf('keep', M)] }, /Workflow: a keep agent lacks the CLAUDE\.md word/],
      [{ omits: [spawnOf('omit1')] }, {}, /Agent tool: 1 omit spawn\(s\) found/],
      [{}, { omits: [] }, /Workflow: 0 omit spawn\(s\) found/],
      [{ omits: [spawnOf('omit1'), { text: '' }] }, {}, /Agent tool: 1 omit spawn\(s\) whose own requests were not found/],
      [{}, { leak: true }, /Workflow: a delegation prompt carried a canary/],
    ]) {
      const d = bOf(ag, wf);
      assert.equal(d.verdict, 'INCONCLUSIVE', JSON.stringify({ ag, wf }));
      assert.match(d.why, /^\(b\)'s instrument could not see: /);
      assert.match(d.why, why);
    }
  });

  test('a kept word beside the other path blind, or beside its own keep control failing, is still the measured PARTIAL', () => {
    const kept = { omits: [spawnOf('omit1', P), spawnOf('omit2')] };
    for (const [ag, wf] of [
      [kept, { omits: [spawnOf('omit1')] }],
      [kept, { leak: true, omits: [] }],
      [{ ...kept, keeps: [] }, {}],
      [{ ...kept, projDir: null, mainText: P }, {}],
      [{}, { omits: [spawnOf('omit1', M), { text: '' }] }],
    ]) {
      const d = bOf(ag, wf);
      assert.equal(d.verdict, 'PARTIAL', JSON.stringify({ ag, wf }));
      assert.equal(d.unsettledOnly, undefined);
      // The blind control is still named, so the unmeasured part shows.
      assert.match(d.why, /; the instrument could not see, beside it: (Agent tool|Workflow): /);
    }
    assert.doesNotMatch(bOf(kept).why, /could not see/);
  });

  test('a word counts only from a read omit spawn, on a path with no delegation leak, whose main session carries it', () => {
    for (const [ag, why] of [
      [{ omits: [spawnOf('omit1'), { text: P }] }, /whose own requests were not found/],
      [{ omits: [spawnOf('omit1', P), spawnOf('omit2')], leak: true }, /a delegation prompt carried a canary/],
      [{ omits: [spawnOf('omit1', M), spawnOf('omit2')], mainText: P }, /main session lacks the MEMORY\.md word/],
    ]) {
      const d = bOf(ag);
      assert.equal(d.verdict, 'INCONCLUSIVE', JSON.stringify(ag));
      assert.match(d.why, why);
    }
  });

  test('rows bPath never builds (no blind control, yet an unread spawn) never verify', () => {
    const bAg = { ...pathOf('Agent tool'), omitRows: [{ P: false, M: false, read: false }] };
    assert.equal(decideB({ bAg, bWf: pathOf('Workflow') }).verdict, 'INCONCLUSIVE');
  });
});

describe('Q15: decide, (c) and (b) together', () => {
  const kept = { omits: [spawnOf('omit1', P), spawnOf('omit2')] };
  const cOpen = { verdict: 'INCONCLUSIVE', why: 'the controls never reached Bash' };
  const cHolds = { verdict: null, why: '(c) ro offered ["Read"]' };
  const cLeak = { verdict: 'CONTRADICTED', why: 'the workflow path ignores the tools allowlist' };

  test("a kept word is the measured PARTIAL even while (c) went unmeasured, and run() reads decide", () => {
    const d = decide({ c: cOpen, b: bOf(kept) });
    assert.equal(d.verdict, 'PARTIAL');
    assert.equal(d.unsettledOnly, undefined);
    assert.equal(measured({ id: 'Q15', ...d }), true, 'a VERIFIED re-roll on this hash must read as a conflict');
    assert.match(d.summary, /^\(b\) an omitClaudeMd spawn kept a word .*; \(c\) went unmeasured: the controls never reached Bash$/);
    assert.match(q15.run.toString(), /decide\(\{ c, b: decideB\(/);
  });

  test("(c)'s CONTRADICTED beats (b); (c)'s INCONCLUSIVE beats (b)'s VERIFIED and INCONCLUSIVE", () => {
    assert.deepEqual(decide({ c: cLeak, b: bOf(kept) }), { verdict: 'CONTRADICTED', summary: cLeak.why });
    assert.deepEqual(decide({ c: cOpen, b: bOf() }), { verdict: 'INCONCLUSIVE', summary: cOpen.why });
    assert.deepEqual(decide({ c: cOpen, b: bOf({ projDir: null }) }), { verdict: 'INCONCLUSIVE', summary: cOpen.why });
  });

  test('once (c) holds, (b) decides and both halves are named', () => {
    for (const [b, verdict] of [[bOf(), 'VERIFIED'], [bOf(kept), 'PARTIAL'], [bOf({ projDir: null }), 'INCONCLUSIVE']]) {
      const d = decide({ c: cHolds, b });
      assert.equal(d.verdict, verdict);
      assert.ok(d.summary.startsWith(`${cHolds.why}; (b)`), d.summary);
    }
  });
});

describe('Q15 (c): the stub MCP server', () => {
  let dir;
  let file;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'q15-stub-'));
    file = path.join(dir, 'stub-mcp.cjs');
    fs.writeFileSync(file, STUB_MCP);
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const msg = (o) => `${JSON.stringify({ jsonrpc: '2.0', ...o })}\n`;

  // Runs the stub, writes `chunks` as they are (a short pause between them, so
  // a message can arrive in pieces), closes its stdin and resolves with its
  // exit code, its stderr and every stdout line parsed, once it exits.
  function talk(chunks) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [file], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      child.stdout.setEncoding('utf8').on('data', (d) => { out += d; });
      child.stderr.setEncoding('utf8').on('data', (d) => { err += d; });
      child.on('error', reject);
      child.on('close', (code) => {
        try {
          resolve({ code, err, raw: out, replies: out.split('\n').filter(Boolean).map((l) => JSON.parse(l)) });
        } catch (e) {
          reject(e);
        }
      });
      (async () => {
        for (const c of chunks) {
          child.stdin.write(c);
          await sleep(20);
        }
        child.stdin.end();
      })();
    });
  }

  test('initialize echoes the version; notifications and junk get no reply; tools/list, tools/call and ping answer; other requests get errors', { timeout: 10_000 }, async () => {
    const r = await talk([
      msg({ id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'q15-test', version: '0' } } }),
      msg({ method: 'notifications/initialized' }),
      msg({ id: 2, method: 'tools/list', params: {} }),
      msg({ id: 3, method: 'tools/call', params: { name: 'stub_echo', arguments: {} } }),
      msg({ id: 4, method: 'ping' }),
      msg({ id: 5, method: 'resources/list' }),
      msg({ method: 'notifications/cancelled', params: { requestId: 9 } }),
      'not json\n',
      msg({ id: 's6', method: 'tools/call', params: { name: 'nope' } }),
    ]);
    assert.equal(r.code, 0, r.err);
    assert.equal(r.err, '');
    assert.deepEqual(r.replies.map((x) => x.id), [1, 2, 3, 4, 5, 's6']);
    for (const x of r.replies) assert.equal(x.jsonrpc, '2.0');
    const [init, list, call, ping, unknown, badTool] = r.replies;
    assert.equal(init.result.protocolVersion, '2025-03-26');
    assert.deepEqual(init.result.capabilities, { tools: {} });
    assert.equal(init.result.serverInfo.name, MCP_SERVER);
    assert.equal(list.result.tools.length, 1);
    const [tool] = list.result.tools;
    assert.equal(`mcp__${MCP_SERVER}__${tool.name}`, MCP_TOOL);
    assert.equal(tool.inputSchema.type, 'object');
    assert.deepEqual(call.result, { content: [{ type: 'text', text: 'Q15_STUB_OK' }] });
    assert.deepEqual(ping.result, {});
    assert.equal(unknown.error.code, -32601);
    assert.equal(badTool.error.code, -32602);
    assert.equal(unknown.result, undefined);
  });

  test('a message split across writes and a CRLF-ended one both parse; an initialize with no version gets a default', { timeout: 10_000 }, async () => {
    const whole = msg({ id: 7, method: 'initialize', params: {} });
    const r = await talk([whole.slice(0, 15), whole.slice(15), msg({ id: 8, method: 'ping' }).replace(/\n$/, '\r\n')]);
    assert.equal(r.code, 0, r.err);
    assert.deepEqual(r.replies.map((x) => x.id), [7, 8]);
    assert.match(r.replies[0].result.protocolVersion, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('with no input it writes nothing and exits once stdin ends', { timeout: 10_000 }, async () => {
    const r = await talk([]);
    assert.equal(r.code, 0, r.err);
    assert.equal(r.raw, '');
  });
});
