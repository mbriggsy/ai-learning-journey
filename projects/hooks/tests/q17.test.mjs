// Q17's logic without claude: the catalog pin, the shape rule (layerOf) on
// the permission records measured on CLI 2.1.309, the matcher's row judging,
// the layering judging and its controls, the landmine and :* readings, the
// batch order, the join of stream calls to transcript decisions, and
// decide()'s precedence. Then the fence proof, run with git on a scratch
// repo under this test's own temp root, its fence and paths built here (never
// by the code under test: insight 006) and its URL prefix an .invalid host,
// so no push can reach a network whatever the code does. Records carry bare
// keys and no profile path, so this file stays clean for the leak test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { cleanEnv, gitEnv } from '../probes/lib.mjs';
import { LOAD_BEARING, PROBE_CEILING_MS, UNSETTLED_OK, measured } from '../probes/run.mjs';
import q17, * as m from '../probes/defs/q17-push-boundary.mjs';

const HOOKS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_FILE = path.join(HOOKS, 'lib', 'permission-rules.json');
const DEF_FILE = path.join(HOOKS, 'probes', 'defs', 'q17-push-boundary.mjs');
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
const table = catalog.matcherTable.map((r, i) => ({ i, shell: r.shell, command: r.command, expect: r.expect, note: r.note ?? null }));
const fwd = (p) => p.replace(/\\/g, '/');

// The records, as the transcript's permissionDecision holds them on 2.1.309
// (design 2a's pilot, this def's runs, and lane 6's count of the user's
// transcripts for builtinAccept: reasonType rule with no ruleSource).
const PD = {
  builtinAccept: { decision: 'accept', source: 'config', reasonType: 'rule' },
  ask: { decision: 'reject', source: 'config', reasonType: 'asyncAgent', ruleSource: 'flagSettings', reasonCode: 'rule:flagSettings' },
  deny: { decision: 'reject', source: 'config', reasonType: 'subcommandResults', ruleSource: 'flagSettings', reasonCode: 'rule:flagSettings' },
  psDeny: { decision: 'reject', source: 'config', reasonType: 'rule', ruleSource: 'flagSettings', reasonCode: 'rule:flagSettings' },
  classifierReject: { decision: 'reject', source: 'config', reasonType: 'classifier', reasonCode: 'classifier:auto-mode', classifierCategory: 'git_destructive' },
  miss: { decision: 'reject', source: 'config', reasonType: 'asyncAgent', reasonCode: 'bashMiss:no-rule-match' },
  psMiss: { decision: 'reject', source: 'config', reasonType: 'asyncAgent', reasonCode: 'other' },
  modeMiss: { decision: 'reject', source: 'config', reasonType: 'mode', reasonCode: 'mode:dontAsk' },
  classifierAccept: { decision: 'accept', source: 'config', reasonType: 'classifier' },
  localAccept: { decision: 'accept', source: 'user_permanent', reasonType: 'rule', ruleSource: 'localSettings' },
  commandAccept: { decision: 'accept', source: 'config', reasonType: 'rule', ruleSource: 'command' },
  flagAccept: { decision: 'accept', source: 'config', reasonType: 'rule', ruleSource: 'flagSettings' },
  subAccept: { decision: 'accept', source: 'config', reasonType: 'subcommandResults' },
};
const L = Object.fromEntries(Object.entries(PD).map(([k, v]) => [k, m.layerOf(v)]));

describe('Q17: the catalog pin', () => {
  test('the def reads the catalog this test finds on its own, and the pin is its sha256', () => {
    assert.equal(path.resolve(m.CATALOG_FILE), path.resolve(CATALOG_FILE));
    const sha = createHash('sha256').update(fs.readFileSync(CATALOG_FILE)).digest('hex');
    assert.equal(m.CATALOG_SHA256, sha, 'update the pin in the def, then rerun the probe');
    assert.deepEqual(m.pinCheck(fs.readFileSync(CATALOG_FILE)), { ok: true, sha, why: null });
  });

  test('other bytes, or none, fail the pin and name why; decide then runs nothing', () => {
    const other = m.pinCheck(Buffer.from('{}'));
    assert.equal(other.ok, false);
    assert.match(other.why, new RegExp(`not the pinned ${m.CATALOG_SHA256}`));
    assert.match(other.why, new RegExp(other.sha));
    assert.equal(m.pinCheck(null).ok, false);
    assert.match(m.pinCheck(null).why, /could not be read/);
    assert.equal(m.pinCheck(Buffer.from('x'), 'a'.repeat(64)).ok, false);
    const d = m.decide({ pin: other });
    assert.equal(d.verdict, 'INCONCLUSIVE');
    assert.match(d.summary, /no session ran$/);
    assert.equal(m.decide({}).verdict, 'INCONCLUSIVE', 'no pin checked is no pass');
  });

  test('the pin line has the one form tests/permissions.test.mjs parses, once', () => {
    const src = fs.readFileSync(DEF_FILE, 'utf8');
    const hits = [...src.matchAll(/^export const CATALOG_SHA256 = '([0-9a-f]{64})';$/gm)];
    assert.equal(hits.length, 1);
    assert.equal(hits[0][1], m.CATALOG_SHA256);
  });
});

describe('Q17: layerOf reads the shape rule off the 2.1.309 records', () => {
  test('rejections: an ask and a deny by rule, the classifier, and three kinds of miss', () => {
    assert.deepEqual([L.ask.layer, L.ask.source, L.ask.kind], ['rule', 'flagSettings', 'ask']);
    assert.deepEqual([L.deny.layer, L.deny.source, L.deny.kind], ['rule', 'flagSettings', 'deny']);
    assert.deepEqual([L.psDeny.layer, L.psDeny.kind], ['rule', 'deny'], "PowerShell's deny reads reasonType rule");
    assert.deepEqual([L.classifierReject.layer, L.classifierReject.category], ['classifier', 'git_destructive']);
    for (const k of ['miss', 'psMiss', 'modeMiss']) assert.deepEqual([L[k].decision, L[k].layer, L[k].source, L[k].kind], ['reject', 'norule', null, null], k);
  });

  test('accepts, read by reasonType and ruleSource: a settings rule names its source; no source is a built-in allow; a glob or read-only one is the subcommand check', () => {
    assert.deepEqual([L.localAccept.layer, L.localAccept.source, L.localAccept.ruleSource, L.localAccept.kind], ['rule', 'localSettings', 'localSettings', null]);
    assert.deepEqual([L.commandAccept.layer, L.commandAccept.source], ['rule', 'command']);
    assert.deepEqual([L.builtinAccept.layer, L.builtinAccept.source, L.builtinAccept.ruleSource], ['builtin', null, null]);
    for (const ruleSource of ['', 42, {}, true]) {
      const o = m.layerOf({ ...PD.builtinAccept, ruleSource });
      assert.deepEqual([o.layer, o.source, o.ruleSource], ['builtin', null, null], `ruleSource ${JSON.stringify(ruleSource)} names no scope`);
    }
    assert.deepEqual([L.subAccept.layer, L.subAccept.source], ['subcommands', null]);
    assert.equal(L.classifierAccept.layer, 'classifier');
    assert.equal(m.layerOf({ decision: 'accept', source: 'config', reasonType: 'mode' }).layer, 'norule');
    assert.equal(m.layerOf({ decision: 'accept', source: 'config' }).layer, 'norule');
  });

  test('an accept never carries a reasonCode: one that does is an unmeasured shape, read as no decision', () => {
    for (const code of ['rule:localSettings', 'classifier:auto-mode', 'x:y']) {
      assert.equal(m.layerOf({ decision: 'accept', reasonType: 'rule', ruleSource: 'localSettings', reasonCode: code }), null, code);
    }
    assert.equal(m.layerOf({ decision: 'accept', reasonType: 'subcommandResults', reasonCode: 'x:y' }), null);
  });

  test('rejections keep 2a\'s reading: a reasonCode decides over the reasonType; subcommands is accept-only', () => {
    assert.equal(m.layerOf({ decision: 'reject', reasonType: 'rule', reasonCode: 'bashMiss:no-rule-match' }).layer, 'norule');
    assert.equal(m.layerOf({ decision: 'reject', reasonType: 'subcommandResults' }).layer, 'norule');
    assert.equal(L.ask.ruleSource, 'flagSettings');
    assert.equal(m.layerOf({ decision: 'reject', reasonType: 'rule', ruleSource: 'flagSettings' }).source, 'flagSettings', 'no code: the ruleSource names it');
    assert.equal(m.layerOf({ decision: 'reject', reasonType: 'hook', reasonCode: 'rule:flagSettings' }).kind, 'other (hook)');
    assert.equal(m.layerOf({ decision: 'reject', reasonType: 'x', reasonCode: 'rule:localSettings' }).source, 'localSettings');
  });

  test('anything that is no decision reads as none', () => {
    for (const x of [null, undefined, 'reject', {}, { decision: 'ask' }, { decision: 'deny', reasonCode: 'rule:x' }]) assert.equal(m.layerOf(x), null, JSON.stringify(x));
  });
});

describe('Q17: the matcher judges each row', () => {
  test('one row per session: ask, deny and none against each record', () => {
    const j = (expect, o) => m.judgeRow(expect, o);
    assert.equal(j('ask', L.ask).result, 'agree');
    assert.equal(j('deny', L.deny).result, 'agree');
    assert.equal(j('deny', L.psDeny).result, 'agree');
    assert.equal(j('none', L.miss).result, 'agree');
    assert.equal(j('none', L.psMiss).result, 'agree');
    assert.deepEqual(j('ask', L.deny), { result: 'disagree', said: 'deny', want: 'ask' });
    assert.deepEqual(j('deny', L.ask), { result: 'disagree', said: 'ask', want: 'deny' });
    assert.deepEqual(j('ask', L.miss), { result: 'disagree', said: 'none', want: 'ask' });
    assert.deepEqual(j('none', L.ask), { result: 'disagree', said: 'ask', want: 'none' });
    assert.equal(j('none', L.classifierReject).result, 'agree', 'a rejection by no rule is none, whichever layer');
  });

  test('batched (asDeny): any match is "rule", a miss is none', () => {
    const j = (expect, o) => m.judgeRow(expect, o, { asDeny: true });
    assert.deepEqual(j('ask', L.deny), { result: 'agree', said: 'rule', want: 'rule' });
    assert.deepEqual(j('deny', L.psDeny), { result: 'agree', said: 'rule', want: 'rule' });
    assert.equal(j('none', L.modeMiss).result, 'agree');
    assert.deepEqual(j('none', L.deny), { result: 'disagree', said: 'rule', want: 'none' });
    assert.deepEqual(j('ask', L.modeMiss), { result: 'disagree', said: 'none', want: 'rule' });
  });

  test('an accept, or a rule from another scope, can only disagree; no decision is unreached', () => {
    for (const o of [L.subAccept, L.classifierAccept, L.localAccept, L.builtinAccept]) {
      for (const e of ['ask', 'deny', 'none']) assert.equal(m.judgeRow(e, o).result, 'disagree', `${e} ${o.type}`);
    }
    assert.match(m.matcherSays(L.subAccept), /^ran \(accepted by the subcommand check\)$/);
    assert.equal(m.matcherSays(L.builtinAccept), 'ran (accepted by a built-in allow)');
    assert.match(m.matcherSays(L.localAccept), /localSettings/);
    const local = m.layerOf({ ...PD.ask, ruleSource: 'localSettings', reasonCode: 'rule:localSettings' });
    assert.deepEqual(m.judgeRow('ask', local), { result: 'disagree', said: 'rejected by a rule from localSettings', want: 'ask' });
    assert.deepEqual(m.judgeRow('ask', local, { asDeny: true }).result, 'disagree');
    assert.equal(m.judgeRow('ask', null).result, 'unreached');
  });

  const call = (tool, command, pd, extra = {}) => ({ id: `t${Math.random()}`, tool, input: { command }, command, pd, outcome: m.layerOf(pd), ...extra });
  const facts = (calls, over = {}) => ({ name: 's', init: true, initMode: 'default', initTools: ['Bash', 'PowerShell'], calls, skipped: null, ...over });
  const row = { i: 3, shell: 'Bash', command: 'git -C . push --force origin main', expect: 'ask', note: null };

  test('rowFrom: a byte-equal call of the row\'s shell is judged; any near miss is unreached', () => {
    const ok = m.rowFrom(row, facts([call('Bash', row.command, PD.ask)]), { mode: 'default', via: 'single' });
    assert.deepEqual([ok.result, ok.said, ok.via, ok.session], ['agree', 'ask', 'single', 's']);
    for (const calls of [
      [call('Bash', `${row.command} `, PD.ask)],
      [call('Bash', row.command.replace('-C .', '-C  .'), PD.ask)],
      [call('PowerShell', row.command, PD.ask)],
      [],
    ]) assert.equal(m.rowFrom(row, facts(calls), { mode: 'default', via: 'single' }).result, 'unreached', JSON.stringify(calls.map((c) => c.command)));
    const unread = m.rowFrom(row, facts([{ ...call('Bash', row.command, PD.ask), outcome: null, why: 'the stream says x' }]), { mode: 'default', via: 'single' });
    assert.deepEqual([unread.result, unread.why], ['unreached', 'the stream says x']);
    const first = m.rowFrom(row, facts([call('Bash', row.command, PD.ask), call('Bash', row.command, PD.deny)]), { mode: 'default', via: 'single' });
    assert.equal(first.said, 'ask', 'the first byte-equal call is the one judged');
  });

  test('rowFrom: a session that started in another mode, without the shell, never started or gave no init reads unreached', () => {
    const calls = [call('Bash', row.command, PD.ask)];
    const why = (over, mode = 'default') => m.rowFrom(row, facts(calls, over), { mode, via: 'single' });
    assert.match(why({ initMode: 'auto' }).why, /started in mode "auto", not default/);
    assert.match(why({}, 'dontAsk').why, /not dontAsk/);
    assert.match(why({ initTools: ['PowerShell'] }).why, /lack Bash/);
    assert.match(why({ initTools: null }).why, /lack Bash/);
    assert.match(why({ init: false, why: 'timeout', code: null }).why, /gave no init message \(it ended timeout\)/);
    assert.equal(why({ skipped: 'the fence proof failed' }).why, 'the fence proof failed');
    for (const over of [{ initMode: 'auto' }, { initTools: [] }, { init: false }, { skipped: 'x' }]) assert.equal(why(over).result, 'unreached');
  });
});

describe('Q17: the layering cases', () => {
  const byName = Object.fromEntries(m.LAYERING.map((c) => [c.name, c]));
  const E = (name) => byName[name].expect;

  test('a deny expectation (an ask until the 2026-10-27 cut): the deny holds, in either shape; the classifier, a miss or an ask is the wrong layer; an accept is wrong', () => {
    assert.equal(m.judgeCase(E('a-force'), L.deny), 'ok');
    assert.equal(m.judgeCase(E('p-force'), L.psDeny), 'ok', "PowerShell's deny shape (reasonType rule)");
    assert.equal(m.judgeCase(E('a-force'), L.classifierReject), 'wrong-layer');
    assert.equal(m.judgeCase(E('a-force'), L.miss), 'wrong-layer');
    assert.equal(m.judgeCase(E('a-force'), L.ask), 'wrong-layer', 'an ask shape is not the deny');
    assert.equal(m.judgeCase(E('a-force'), m.layerOf({ ...PD.deny, reasonCode: 'rule:localSettings' })), 'wrong-layer');
    for (const o of [L.classifierAccept, L.subAccept, L.localAccept]) assert.equal(m.judgeCase(E('a-force'), o), 'wrong');
    assert.equal(m.judgeCase(E('a-force'), null), 'unreached');
  });

  test('no rule (D-plain): any rejection but a rule\'s holds; a rule is the wrong layer; an accept is wrong', () => {
    assert.equal(m.judgeCase(E('d-plain'), L.miss), 'ok');
    assert.equal(m.judgeCase(E('d-plain'), L.classifierReject), 'ok');
    assert.equal(m.judgeCase(E('d-plain'), L.ask), 'wrong-layer');
    assert.equal(m.judgeCase(E('d-plain'), L.subAccept), 'wrong');
  });

  test('B-plain: the subcommand check (no source recorded) or the local rule; another scope or the classifier is wrong', () => {
    assert.equal(m.judgeCase(E('b-plain'), L.subAccept), 'ok');
    assert.equal(m.judgeCase(E('b-plain'), L.localAccept), 'ok');
    assert.equal(m.judgeCase(E('b-plain'), L.flagAccept), 'wrong');
    assert.equal(m.judgeCase(E('b-plain'), L.commandAccept), 'wrong');
    assert.equal(m.judgeCase(E('b-plain'), L.classifierAccept), 'wrong');
    assert.equal(m.judgeCase(E('b-plain'), L.builtinAccept), 'wrong', 'a built-in allow is no settings rule');
    assert.equal(m.judgeCase(E('b-plain'), L.ask), 'wrong');
  });

  test('F-plain: any rule with a named source or the subcommand check; F-bare: a rejection or the classifier\'s accept', () => {
    for (const o of [L.subAccept, L.commandAccept, L.localAccept]) assert.equal(m.judgeCase(E('f-plain'), o), 'ok');
    assert.equal(m.judgeCase(E('f-plain'), L.classifierAccept), 'wrong');
    assert.equal(m.judgeCase(E('f-plain'), L.builtinAccept), 'wrong', 'reasonType rule with no ruleSource is a built-in allow, not the grant');
    assert.equal(m.judgeCase(E('f-plain'), L.miss), 'wrong');
    for (const o of [L.classifierAccept, L.ask, L.classifierReject, L.miss]) assert.equal(m.judgeCase(E('f-bare'), o), 'ok');
    for (const o of [L.subAccept, L.commandAccept, L.localAccept]) assert.equal(m.judgeCase(E('f-bare'), o), 'wrong');
    assert.equal(m.judgeCase(E('f-bare'), null), 'unreached');
  });

  test('F-bare (review R1-6): an accept whose shape names no layer is unread, never a pass', () => {
    const odd = [
      L.builtinAccept,
      m.layerOf({ decision: 'accept', source: 'config' }),
      m.layerOf({ decision: 'accept', source: 'config', reasonType: 'mode' }),
      m.layerOf({ decision: 'accept', source: 'config', reasonType: 'hook' }),
      m.layerOf({ decision: 'accept', source: 'config', reasonType: 'somethingNew' }),
    ];
    for (const o of odd) {
      assert.equal(o.decision, 'accept', 'layerOf still reads it as an accept');
      assert.equal(m.judgeCase(E('f-bare'), o), 'unreached', JSON.stringify(o));
    }
    for (const o of [m.layerOf({ decision: 'reject', source: 'config' }), m.layerOf({ decision: 'reject', source: 'config', reasonType: 'somethingNew' })]) {
      assert.equal(m.judgeCase(E('f-bare'), o), 'ok', 'any rejection: the push never ran');
    }
    assert.equal(m.wantOf(E('f-bare')), 'a rejection, or an accept by the classifier');
    assert.equal(m.saidOf(odd[1]), 'accept by an unnamed layer (reasonType missing)');
    assert.match(m.saidOf(odd[4]), /reasonType somethingNew/);
  });

  let n = 0;
  const call = (tool, command, pd, extra = {}) => ({ id: `c${n++}`, tool, input: tool === 'Skill' ? { skill: command } : { command }, command: tool === 'Skill' ? null : command, pd, outcome: m.layerOf(pd), ...extra });
  const facts = (calls, over = {}) => ({ name: 'x', init: true, initMode: 'auto', initTools: ['Bash', 'Skill', 'PowerShell'], calls, skipped: null, landed: null, ...over });
  const skillCall = () => call('Skill', m.SKILL, PD.flagAccept);
  const control = (pd) => call('Bash', m.CONTROL.command, pd);

  test('caseFrom, the F arms: the skill call comes first and must be accepted; the control must be a rule accept, before the push', () => {
    const c = byName['f-force'];
    const push = () => call('Bash', c.command, PD.deny);
    assert.equal(m.caseFrom(c, facts([skillCall(), control(PD.commandAccept), push()])).result, 'ok');
    assert.match(m.caseFrom(c, facts([control(PD.commandAccept), push()])).why, /never invoked the q17-push skill/);
    assert.match(m.caseFrom(c, facts([call('Skill', m.SKILL, PD.miss), control(PD.commandAccept), push()])).why, /skill call was not accepted/);
    assert.match(m.caseFrom(c, facts([call('Skill', m.SKILL, PD.flagAccept, { isError: true }), control(PD.commandAccept), push()])).why, /an error result/);
    assert.match(m.caseFrom(c, facts([push(), skillCall(), control(PD.commandAccept)])).why, /push came before the q17-push skill call/);
    assert.match(m.caseFrom(c, facts([skillCall(), push(), control(PD.commandAccept)])).why, /push came before the control/);
    assert.match(m.caseFrom(c, facts([skillCall(), control(PD.classifierAccept), push()])).why, /not shown live/);
    assert.match(m.caseFrom(c, facts([skillCall(), control(PD.subAccept), push()])).why, /not shown live/, 'the control is an exact rule, so it must name its source');
    assert.match(m.caseFrom(c, facts([skillCall(), control(PD.builtinAccept), push()])).why, /not accepted by a rule with a named ruleSource/);
    const rec = m.caseFrom(c, facts([skillCall(), control(PD.commandAccept), push()]));
    assert.deepEqual([rec.reasonType, rec.ruleSource, rec.control.reasonType, rec.control.ruleSource], ['subcommandResults', 'flagSettings', 'rule', 'command'], 'each arm records the push\'s and the control\'s reasonType and ruleSource');
    assert.equal(m.caseFrom(byName['a-force'], facts([push()])).control, null, 'no control, none recorded');
    assert.match(m.caseFrom(c, facts([skillCall(), push()])).why, /never run byte for byte/);
    assert.match(m.caseFrom(c, facts([skillCall(), control(PD.commandAccept), push()], { initTools: ['Bash'] })).why, /lack Skill/);
  });

  test('caseFrom, the B arms: the control must come from localSettings; F-bare needs its skill but no control', () => {
    const b = byName['b-force'];
    assert.equal(m.caseFrom(b, facts([control(PD.localAccept), call('Bash', b.command, PD.deny)])).result, 'ok');
    assert.match(m.caseFrom(b, facts([control(PD.commandAccept), call('Bash', b.command, PD.deny)])).why, /not accepted by a rule from localSettings/);
    assert.equal(m.caseFrom(b, facts([control(PD.localAccept), call('Bash', b.command, PD.deny)], { initTools: ['Bash'] })).result, 'ok', 'no skill, so no Skill tool needed');
    const f = byName['f-bare'];
    assert.equal(m.caseFrom(f, facts([skillCall(), call('Bash', f.command, PD.classifierAccept)])).result, 'ok');
    assert.equal(m.caseFrom(f, facts([skillCall(), call('Bash', f.command, PD.subAccept)])).result, 'wrong');
    assert.equal(m.caseFrom(f, facts([call('Bash', f.command, PD.classifierAccept)])).result, 'unreached');
    const odd = m.caseFrom(f, facts([skillCall(), call('Bash', f.command, { decision: 'accept', source: 'config' })]));
    assert.deepEqual([odd.result, odd.reasonType], ['unreached', null]);
    assert.match(odd.why, /names neither a rule nor the classifier/);
    assert.equal(m.decide({ pin: { ok: true }, matcher: { rows: [{ shell: 'Bash', command: 'x', result: 'agree' }] }, layering: [odd], landmine: [] }).verdict, 'INCONCLUSIVE');
  });

  test('caseFrom, the in-session fence: an accepted push must land in the fence', () => {
    const b = byName['b-plain'];
    const calls = [control(PD.localAccept), call('Bash', b.command, PD.subAccept)];
    assert.equal(m.caseFrom(b, facts(calls, { landed: true })).result, 'ok');
    const lost = m.caseFrom(b, facts(calls, { landed: false }));
    assert.equal(lost.result, 'unreached');
    assert.match(lost.why, /did not land in the fence/);
    const wrongAndLost = m.caseFrom(b, facts([control(PD.localAccept), call('Bash', b.command, PD.classifierAccept)], { landed: false }));
    assert.deepEqual([wrongAndLost.result, /did not land/.test(wrongAndLost.why)], ['wrong', true], 'a wrong decision stays wrong, and says the fence too');
    assert.equal(m.caseFrom(byName['b-force'], facts([control(PD.localAccept), call('Bash', FORCE_OF(byName), PD.subAccept)], { landed: false })).result, 'wrong', 'no fence origin: an accept is just wrong');
    assert.equal(m.caseFrom(b, facts(calls, { skipped: 'the fence proof failed, so the session never ran: x' })).result, 'unreached');
  });

  test('the cases the design names, each with its expectation', () => {
    assert.deepEqual(m.LAYERING.map((c) => c.name), ['d-plain', 'd-force', 'a-force', 'a-force-compound', 'p-force', 'p-amp', 'b-plain', 'b-force', 'f-force', 'f-plain', 'f-bare']);
    for (const c of m.LAYERING) {
      assert.ok(['default', 'auto'].includes(c.mode), c.name);
      assert.ok(m.SHELLS.includes(c.shell), c.name);
      assert.equal(c.origin === 'fence', c.expect.decision === 'accept', `${c.name}: only an expected accept points origin at the fence`);
      if (c.control) assert.ok(c.local || c.skill, `${c.name}: a control needs a grant`);
    }
    assert.ok(!m.LAYERING.some((x) => x.expect.kind === 'ask'), 'no case expects an ask: nothing asks Briggsy');
    const denies = m.LAYERING.filter((x) => x.expect.kind === 'deny');
    assert.deepEqual(denies.map((c) => c.name), ['d-force', 'a-force', 'a-force-compound', 'p-force', 'p-amp', 'b-force', 'f-force']);
    for (const c of denies) {
      const r = table.find((x) => x.shell === c.shell && x.command === c.command);
      assert.equal(r?.expect, 'deny', `${c.name}: ${c.command} is a deny row of the table`);
    }
    assert.equal(table.find((x) => x.shell === 'Bash' && x.command === byName['d-plain'].command)?.expect, 'none');
    assert.deepEqual(m.LOCAL_ALLOW.permissions.allow, ['Bash(git push *)', `Bash(${m.CONTROL.command})`]);
    assert.deepEqual(m.FENCE_DENY, ['Bash(gh *)', 'PowerShell(gh *)']);
  });
});
const FORCE_OF = (byName) => byName['b-force'].command;

describe('Q17: the landmine arms and the :* reading', () => {
  const arm = (name, present, blocker = null) => ({ name, want: name !== 'k-off', present, blocker });
  const results = (arms) => Object.fromEntries(m.judgeLandmine(arms).map((r) => [r.name, r.result]));

  test('K-base on, K-on on, K-off off holds; each the other way is wrong', () => {
    assert.deepEqual(results([arm('k-base', true), arm('k-on', true), arm('k-off', false)]), { 'k-base': 'ok', 'k-on': 'ok', 'k-off': 'ok' });
    assert.equal(results([arm('k-base', true), arm('k-on', false), arm('k-off', false)])['k-on'], 'wrong');
    assert.equal(results([arm('k-base', true), arm('k-on', true), arm('k-off', true)])['k-off'], 'wrong');
  });

  test('a control without PowerShell leaves K-off proving nothing; a blocker or no tool list is unreached', () => {
    const r = results([arm('k-base', false), arm('k-on', true), arm('k-off', false)]);
    assert.deepEqual(r, { 'k-base': 'unreached', 'k-on': 'ok', 'k-off': 'unreached' });
    assert.equal(results([arm('k-base', true, 'it started in mode "auto", not default'), arm('k-on', true), arm('k-off', false)])['k-off'], 'unreached');
    assert.equal(results([arm('k-base', true), arm('k-on', null), arm('k-off', false)])['k-on'], 'unreached');
    assert.equal(results([arm('k-base', true), arm('k-on', true, 'x'), arm('k-off', false)])['k-on'], 'unreached');
    assert.equal(results([arm('k-on', true), arm('k-off', false)])['k-off'], 'unreached', 'no control at all');
  });

  test('the arms the design names: the full catalog, one Bash deny with no PowerShell rule, and no rules', () => {
    assert.deepEqual(m.LANDMINE.map((k) => [k.name, k.want]), [['k-base', true], ['k-on', true], ['k-off', false]]);
    const off = m.LANDMINE.find((k) => k.name === 'k-off').permissions;
    assert.deepEqual(Object.keys(off), ['deny']);
    assert.ok(off.deny.length === 1 && off.deny[0].startsWith('Bash('));
  });

  test(':* reads the binary\'s way, the docs\' way, neither, or unsettled', () => {
    assert.match(m.colonReading({ 'colon-space': 'none', 'colon-nospace': 'deny' }), /^the binary's reading/);
    assert.match(m.colonReading({ 'colon-space': 'deny', 'colon-nospace': 'deny' }), /^the docs' reading/);
    assert.match(m.colonReading({ 'colon-space': 'none', 'colon-nospace': 'none' }), /^neither reading/);
    assert.match(m.colonReading({ 'colon-space': 'deny', 'colon-nospace': 'none' }), /^neither reading/);
    assert.match(m.colonReading({ 'colon-space': null, 'colon-nospace': 'deny' }), /^unsettled/);
    assert.match(m.colonReading({ 'colon-space': 'none', 'colon-nospace': 'ran (accepted by the classifier)' }), /^unsettled/);
    assert.deepEqual(m.COLON.map((c) => c.rule), ['Bash(git push :*)', 'Bash(git push:*)']);
  });
});

describe('Q17: batches', () => {
  test('every row lands in exactly one batch of one shell, at most 20, Bash first', () => {
    const b = m.batchesOf(table);
    const seen = b.flatMap((x) => x.rows.map((r) => r.i));
    assert.deepEqual([...seen].sort((p, q) => p - q), table.map((r) => r.i));
    for (const x of b) {
      assert.ok(x.rows.length > 0 && x.rows.length <= m.BATCH);
      assert.ok(x.rows.every((r) => r.shell === x.shell));
    }
    assert.equal(b[0].shell, 'Bash');
    assert.ok(b.findIndex((x) => x.shell === 'PowerShell') > b.findLastIndex((x) => x.shell === 'Bash'));
    assert.deepEqual(new Set(b[0].rows.map((r) => r.expect)), new Set(['deny', 'none']), 'the calibration batch mixes matches and misses (the table holds no ask row since the cut)');
  });

  test('batchOrder takes ask, deny and none in turn, each lane in table order, Bash then PowerShell', () => {
    const rows = [
      { i: 0, shell: 'PowerShell', expect: 'ask' }, { i: 1, shell: 'Bash', expect: 'ask' }, { i: 2, shell: 'Bash', expect: 'ask' },
      { i: 3, shell: 'Bash', expect: 'none' }, { i: 4, shell: 'Bash', expect: 'deny' }, { i: 5, shell: 'Bash', expect: 'ask' },
    ];
    assert.deepEqual(m.batchOrder(rows).map((r) => r.i), [1, 4, 3, 2, 5, 0]);
    assert.deepEqual(m.batchesOf(rows, 2).map((x) => [x.shell, x.rows.map((r) => r.i)]), [['Bash', [1, 4]], ['Bash', [3, 2]], ['Bash', [5]], ['PowerShell', [0]]]);
    assert.deepEqual(m.batchesOf([]), []);
  });

  test('ranInOrder: exactly the listed commands of that shell, in order, each read', () => {
    const c = (tool, command, outcome = L.deny) => ({ tool, command, outcome });
    const cmds = ['a', 'b', 'c'];
    assert.equal(m.ranInOrder([c('Bash', 'a'), c('Bash', 'b'), c('Bash', 'c')], 'Bash', cmds), true);
    assert.equal(m.ranInOrder([c('Bash', 'a'), c('Skill', 'x'), c('Bash', 'b'), c('Bash', 'c')], 'Bash', cmds), true, 'another tool between is no break');
    assert.equal(m.ranInOrder([c('Bash', 'a'), c('Bash', 'c'), c('Bash', 'b')], 'Bash', cmds), false);
    assert.equal(m.ranInOrder([c('Bash', 'a'), c('Bash', 'b')], 'Bash', cmds), false);
    assert.equal(m.ranInOrder([c('Bash', 'a'), c('Bash', 'b'), c('Bash', 'c'), c('Bash', 'c')], 'Bash', cmds), false, 'a retry breaks it');
    assert.equal(m.ranInOrder([c('Bash', 'a'), c('Bash', 'b', null), c('Bash', 'c')], 'Bash', cmds), false, 'an unread call breaks it');
    assert.equal(m.ranInOrder([c('PowerShell', 'a'), c('PowerShell', 'b'), c('PowerShell', 'c')], 'Bash', cmds), false);
  });

  test('every table row has a shell and an expectation Q17 runs; the ask-as-deny arm is gone with the asks', () => {
    for (const r of table) assert.ok(m.SHELLS.includes(r.shell) && m.EXPECTS.includes(r.expect), JSON.stringify(r));
    assert.equal(m.EQUIV, undefined);
  });
});

describe('Q17: the join of stream calls to transcript decisions', () => {
  const use = (id, name, input) => ({ type: 'tool_use', id, name, input });
  const assistant = (blocks, parent = null) => ({ type: 'assistant', parent_tool_use_id: parent, message: { content: blocks } });
  const meta = (id, decision, reasonType) => ({ type: 'user', tool_result_meta: [{ id, permission_decision: { decision, source: 'config', ...(reasonType ? { reason_type: reasonType } : {}) } }] });
  const record = (ids, pd, content = 'refused') => ({ type: 'user', message: { content: ids.map((id) => ({ type: 'tool_result', tool_use_id: id, content, is_error: true })) }, permissionDecision: pd });

  test('streamCalls: main-thread tool uses in order, each once, with the command when there is one', () => {
    const msgs = [
      { type: 'system', subtype: 'init' },
      assistant([{ type: 'text', text: 'x' }, use('a', 'Bash', { command: 'git push' })]),
      assistant([use('a', 'Bash', { command: 'git push' }), use('b', 'Skill', { skill: 'q17-push' })]),
      assistant([use('c', 'Bash', { command: 'echo sub' })], 'a'),
      assistant([use('d', 'PowerShell', { command: 42 })]),
    ];
    assert.deepEqual(m.streamCalls(msgs).map((c) => [c.id, c.tool, c.command]), [['a', 'Bash', 'git push'], ['b', 'Skill', null], ['d', 'PowerShell', null]]);
    assert.deepEqual(m.streamCalls(undefined), []);
  });

  test('recordDecisions: one tool_result per record; text from a string or blocks', () => {
    const recs = [
      record(['a'], PD.ask),
      record(['b', 'c'], PD.deny),
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'd', content: [{ type: 'text', text: 'one ' }, { type: 'text', text: 'two' }] }] }, permissionDecision: PD.subAccept },
      record(['e'], null),
      { type: 'assistant', permissionDecision: PD.ask, message: { content: [{ type: 'tool_result', tool_use_id: 'f' }] } },
    ];
    const got = m.recordDecisions(recs);
    assert.deepEqual([...got.keys()], ['a', 'd']);
    assert.equal(got.get('a').isError, true);
    assert.equal(got.get('d').text, 'one two');
    assert.equal(got.get('d').isError, false);
  });

  test('decidedCalls: the transcript decides, the stream cross-checks, a gap or a clash leaves the call unread', () => {
    const msgs = [
      assistant([use('a', 'Bash', { command: 'p' }), use('b', 'Bash', { command: 'q' }), use('c', 'Bash', { command: 'r' }), use('d', 'Bash', { command: 's' }), use('e', 'Bash', { command: 't' })]),
      meta('a', 'reject', 'asyncAgent'), meta('b', 'reject', 'subcommandResults'), meta('c', 'accept', 'subcommandResults'), meta('e', 'accept'),
    ];
    const recs = [record(['a'], PD.ask), record(['b'], PD.ask), record(['d'], PD.miss), record(['e'], { decision: 'accept', source: 'config' })];
    const got = Object.fromEntries(m.decidedCalls(msgs, recs).map((c) => [c.id, c]));
    assert.deepEqual([got.a.outcome.layer, got.a.outcome.kind], ['rule', 'ask']);
    assert.equal(got.b.outcome, null);
    assert.match(got.b.why, /stream says reject\/subcommandResults, the transcript reject\/asyncAgent/);
    assert.equal(got.c.outcome, null);
    assert.match(got.c.why, /no transcript record/);
    assert.equal(got.d.outcome.layer, 'norule', 'no stream copy: the transcript stands');
    assert.equal(got.e.outcome.layer, 'norule', 'both copies with no reason type agree');
    const bad = m.decidedCalls([assistant([use('z', 'Bash', { command: 'x' })])], [record(['z'], { decision: 'maybe' })]);
    assert.equal(bad[0].outcome, null);
    assert.match(bad[0].why, /unreadable/);
  });

  test('callFor finds the first call of a tool with that exact command', () => {
    const calls = [{ tool: 'PowerShell', command: 'x', n: 1 }, { tool: 'Bash', command: 'x', n: 2 }, { tool: 'Bash', command: 'x', n: 3 }];
    assert.equal(m.callFor(calls, 'Bash', 'x').n, 2);
    assert.equal(m.callFor(calls, 'Bash', 'x '), null);
    assert.equal(m.callFor(undefined, 'Bash', 'x'), null);
  });
});

describe('Q17: decide()', () => {
  const agreeRow = (i) => ({ i, shell: 'Bash', command: `c${i}`, expect: 'deny', result: 'agree', said: 'deny', want: 'deny' });
  const okCase = (name) => ({ name, result: 'ok', said: 's', want: 'w', why: null });
  const okMine = () => [{ name: 'k-base', result: 'ok' }, { name: 'k-on', result: 'ok' }, { name: 'k-off', result: 'ok' }];
  const base = () => ({
    pin: { ok: true }, matcher: { mode: 'batched', rows: [agreeRow(0), agreeRow(1)] },
    layering: [okCase('a-force'), okCase('b-plain')], landmine: okMine(), colon: { reading: "the binary's reading: x" },
  });

  test('everything as expected is VERIFIED, and says how the matcher ran and what :* read', () => {
    const d = m.decide(base());
    assert.equal(d.verdict, 'VERIFIED');
    assert.match(d.summary, /all 2 cases as expected/);
    assert.match(d.summary, /all 2 rows as the catalog expects \(batched in dontAsk\)/);
    assert.match(d.summary, /:\* reads the binary's reading/);
    assert.equal(d.unsettledOnly, undefined);
    assert.match(m.decide({ ...base(), matcher: { mode: 'single', rows: [agreeRow(0)] } }).summary, /one session per row in default mode\)/);
  });

  test('CONTRADICTED over INCONCLUSIVE over PARTIAL over VERIFIED', () => {
    const wrongLayer = { ...base(), layering: [okCase('x'), { name: 'a-force', result: 'wrong-layer', said: 'reject by the classifier', want: 'deny' }] };
    assert.equal(m.decide(wrongLayer).verdict, 'PARTIAL');
    assert.match(m.decide(wrongLayer).summary, /^a denial by the wrong layer: a-force/);
    const blind = { ...wrongLayer, matcher: { mode: 'batched', rows: [agreeRow(0), { ...agreeRow(1), result: 'unreached', why: 'never ran' }] } };
    assert.equal(m.decide(blind).verdict, 'INCONCLUSIVE');
    assert.match(m.decide(blind).summary, /matcher: Bash "c1" unreached \(never ran\)/);
    const bad = { ...blind, matcher: { mode: 'batched', rows: [{ ...agreeRow(9), result: 'disagree', said: 'none' }, { ...agreeRow(1), result: 'unreached', why: 'never ran' }] } };
    assert.equal(m.decide(bad).verdict, 'CONTRADICTED');
    assert.match(m.decide(bad).summary, /^matcher: Bash "c9" expected deny, the CLI said none; also unsettled: matcher: Bash "c1"/);
  });

  test('each kind of finding lands where the precedence puts it', () => {
    const v = (over) => m.decide({ ...base(), ...over }).verdict;
    assert.equal(v({ matcher: { rows: [{ ...agreeRow(0), result: 'disagree', said: 'none', want: 'deny' }] } }), 'CONTRADICTED');
    assert.equal(v({ layering: [{ name: 'b-force', result: 'wrong', said: 'accept', want: 'deny', why: null }] }), 'CONTRADICTED');
    assert.equal(v({ layering: [{ name: 'b-plain', result: 'unreached', why: 'the fence proof failed' }] }), 'INCONCLUSIVE');
    assert.equal(v({ landmine: [{ name: 'k-off', result: 'wrong', present: true, want: false }] }), 'CONTRADICTED');
    assert.equal(v({ landmine: [{ name: 'k-off', result: 'unreached', why: 'x' }] }), 'INCONCLUSIVE');
    assert.equal(v({ matcher: { mode: 'batched', rows: [] } }), 'INCONCLUSIVE', 'no row judged is no pass');
    assert.equal(v({ colon: { reading: 'unsettled (x)' } }), 'VERIFIED', ':* is recorded, never judged');
    assert.equal(v({ equiv: [{ ...agreeRow(9), result: 'disagree', said: 'none' }] }), 'VERIFIED', 'an equiv list is no longer read');
  });

  test('a long list is cut and counted', () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ ...agreeRow(i), result: 'disagree', said: 'none', want: 'deny' }));
    assert.match(m.decide({ ...base(), matcher: { rows } }).summary, /; and 3 more;/);
  });

  test('Q17 is not load-bearing and not in UNSETTLED_OK, so its PARTIAL counts as measured', () => {
    assert.ok(!LOAD_BEARING.includes('Q17'));
    assert.ok(!UNSETTLED_OK.includes('Q17'));
    assert.equal(measured({ id: 'Q17', verdict: 'PARTIAL' }), true);
  });
});

describe('Q17: the def and its prompts', () => {
  test('the default export: id, not load-bearing, a ceiling from the table, and run() returns through decide()', () => {
    assert.equal(q17.id, 'Q17');
    assert.equal(q17.loadBearing, false);
    const others = 1 + m.COLON.length + m.LAYERING.length + m.LANDMINE.length;
    assert.equal(q17.timeoutMs, (table.length + others) * 60_000 + 10 * 60_000);
    assert.ok(Number.isFinite(q17.timeoutMs) && q17.timeoutMs > PROBE_CEILING_MS && q17.timeoutMs < 2 ** 31);
    assert.match(q17.run.toString(), /\bdecide\(facts\)/);
    assert.match(q17.run.toString(), /\bpinCheck\(bytes\)/);
  });

  test('every prompt carries each command whole, on a line of its own', () => {
    const cmds = ['git push -o "x -d y" origin main', "git 'push' --force origin main", '& git push --force origin main'];
    const lines = (s) => s.split('\n');
    const b = m.batchPrompt('PowerShell', cmds);
    const at = lines(b).indexOf('BEGIN');
    assert.deepEqual(lines(b).slice(at + 1, at + 1 + cmds.length), cmds);
    assert.equal(lines(b)[at + 1 + cmds.length], 'END');
    assert.match(b, /Use the PowerShell tool/);
    for (const c of cmds) assert.ok(lines(m.stepsPrompt('Bash', [c])).includes(c), c);
    assert.match(m.stepsPrompt('Bash', ['a']), /exactly once/);
    const two = lines(m.stepsPrompt('Bash', ['a', 'b']));
    assert.equal(two.indexOf('b'), two.indexOf('a') + 1);
    const skill = m.skillText('Bash(git push:*), Bash(node q17-control.js)', ['node q17-control.js', 'git push origin main']);
    assert.deepEqual(lines(skill).slice(0, 5), ['---', 'name: q17-push', 'description: Q17 probe fixture. Runs the listed shell commands once each.', 'allowed-tools: Bash(git push:*), Bash(node q17-control.js)', '---']);
    assert.ok(lines(skill).includes('git push origin main'));
    assert.match(m.skillPrompt(), /invoke the skill named q17-push/);
  });
});

describe('Q17: the fence', () => {
  // A fence built here, from this test's root, never by fenceBox. Its three
  // forms name an .invalid host, which no resolver answers, and the transport
  // check aims at a closed local port, so even a fence that failed (or a
  // mutant of the code) can reach nothing off this machine.
  const PREFIXES = ['https://fence.invalid/', 'git@fence.invalid:', 'ssh://git@fence.invalid/'];
  const AWAY = 'https://127.0.0.1:1/q17-fence-check.git';
  const URL0 = 'https://fence.invalid/owner/probe-u4-test.git';
  const baseOf = (dir) => {
    const p = fwd(dir);
    return /^[A-Za-z]:\//.test(p) ? `file:///${p}/` : `file://${p}/`;
  };
  const handBox = (root, prefixes = PREFIXES) => {
    const dir = path.join(root, 'fence');
    const base = baseOf(dir);
    const urls = prefixes.map((p) => `${p}owner/probe-u4-test.git`);
    return { dir, gh: path.join(root, 'gh-config'), prefixes, urls, url: urls[0], pushUrl: `${base}owner/probe-u4-test.git`, base, target: path.join(dir, 'owner', 'probe-u4-test.git') };
  };
  const git = (cwd, ...args) => spawnSync('git', args, { cwd, env: gitEnv({ GIT_TERMINAL_PROMPT: '0' }), encoding: 'utf8', shell: false, windowsHide: true });
  const repoIn = (root) => {
    const repo = path.join(root, 'repo');
    fs.mkdirSync(repo, { recursive: true });
    for (const a of [['init', '-q', '-b', 'main'], ['config', 'user.email', 'probe@example.invalid'], ['config', 'user.name', 'probe'], ['commit', '-q', '--allow-empty', '-m', 'one']]) assert.equal(git(repo, ...a).status, 0, a.join(' '));
    return repo;
  };
  const prove = (box, repo, env) => m.proveFence(box, repo, env, { away: AWAY });
  const inRoot = (fn) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-q17-'));
    try {
      fn(root, repoIn(root), handBox(root));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
  const noRemotes = (repo) => assert.equal(git(repo, 'remote').stdout.trim(), '', 'every proof remote was removed');

  test('fenceBox keeps every path inside the workspace; fileBase and fenceEnv spell all three rewrites and the gate', () => {
    const ws = path.join(os.tmpdir(), 'q17-not-made');
    const box = m.fenceBox(ws, { prefixes: PREFIXES, owner: 'owner', name: 'probe-u4-test' });
    assert.deepEqual(box, handBox(ws));
    assert.ok(!fs.existsSync(ws), 'fenceBox makes nothing');
    assert.deepEqual(m.FENCE_PREFIXES, ['https://github.com/', 'git@github.com:', 'ssh://git@github.com/']);
    const real = m.fenceBox(ws);
    const rand = /^https:\/\/github\.com\/mbriggsy\/(probe-u4-[0-9a-f]{8})\.git$/.exec(real.url)?.[1];
    assert.ok(rand, real.url);
    assert.deepEqual(real.urls, [`https://github.com/mbriggsy/${rand}.git`, `git@github.com:mbriggsy/${rand}.git`, `ssh://git@github.com/mbriggsy/${rand}.git`]);
    assert.match(m.FENCE_AWAY, /^https:\/\/[a-z.-]+\.invalid\//, 'the production check aims at a host that never resolves');
    assert.equal(m.fileBase(path.join(ws, 'fence')), baseOf(path.join(ws, 'fence')));
    assert.ok(m.fileBase(ws).endsWith('/') && !m.fileBase(ws).endsWith('//'));
    const key = `url.${box.base}.pushInsteadOf`;
    assert.deepEqual(m.fenceEnv(box), {
      GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: 'file', GIT_SSH_COMMAND: 'ssh -o BatchMode=yes', GH_CONFIG_DIR: box.gh, GIT_CONFIG_COUNT: '4',
      GIT_CONFIG_KEY_0: 'credential.helper', GIT_CONFIG_VALUE_0: '',
      GIT_CONFIG_KEY_1: key, GIT_CONFIG_VALUE_1: PREFIXES[0],
      GIT_CONFIG_KEY_2: key, GIT_CONFIG_VALUE_2: PREFIXES[1],
      GIT_CONFIG_KEY_3: key, GIT_CONFIG_VALUE_3: PREFIXES[2],
    });
  });

  test('with the fence env, a push of each form lands in the fence, an off-GitHub push is refused, and the remotes are gone after', () => inRoot((root, repo, box) => {
    const r = prove(box, repo, cleanEnv(m.fenceEnv(box)));
    assert.equal(r.ok, true, r.why);
    assert.equal(r.why, null);
    assert.deepEqual(r.facts, [
      `git's config maps ${PREFIXES.join(', ')} into the fence`,
      `a push to ${AWAY} was refused as a transport`,
      ...box.urls.map((u) => `a push to ${u} landed in the fence`),
    ]);
    const head = git(repo, 'rev-parse', 'HEAD').stdout.trim();
    for (const i of [0, 1, 2]) assert.equal(git(root, '--git-dir', box.target, 'rev-parse', `refs/heads/fence-proof-${i}`).stdout.trim(), head, `form ${i}`);
    noRemotes(repo);
    assert.deepEqual(fs.readdirSync(box.gh), []);
  }));

  test('no mapping, a mapping elsewhere, or a form left unmapped: the config check stops it before any push', () => inRoot((root, repo, box) => {
    const none = prove(box, repo, cleanEnv({ GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: 'file' }));
    assert.equal(none.ok, false);
    assert.match(none.why, /missing https:\/\/fence\.invalid\/, git@fence\.invalid:, ssh:\/\/git@fence\.invalid\/, so no push was tried$/);
    const off = prove(box, repo, cleanEnv(m.fenceEnv({ ...box, base: baseOf(path.join(root, 'other')) })));
    assert.match(off.why, /no push was tried$/);
    const httpsOnly = prove(box, repo, cleanEnv(m.fenceEnv(handBox(root, [PREFIXES[0]]))));
    assert.equal(httpsOnly.ok, false);
    assert.match(httpsOnly.why, /missing git@fence\.invalid:, ssh:\/\/git@fence\.invalid\/, so no push was tried$/);
    assert.ok(!fs.existsSync(box.target) && !fs.existsSync(path.join(root, 'other')), 'no fence repo was made, so nothing was pushed');
    noRemotes(repo);
  }));

  test('a credential helper left in place, or a gh folder that is not empty, stops it before any push', () => inRoot((root, repo, box) => {
    const helper = prove(box, repo, cleanEnv({ ...m.fenceEnv(box), GIT_CONFIG_VALUE_0: 'store' }));
    assert.equal(helper.ok, false);
    assert.match(helper.why, /^credential\.helper's last value reads "store", not empty, so no push was tried$/);
    fs.mkdirSync(box.gh, { recursive: true });
    fs.writeFileSync(path.join(box.gh, 'hosts.yml'), 'x\n');
    const gh = prove(box, repo, cleanEnv(m.fenceEnv(box)));
    assert.equal(gh.why, 'GH_CONFIG_DIR is not an empty folder, so no push was tried');
    assert.ok(!fs.existsSync(box.target));
  }));

  test('without GIT_ALLOW_PROTOCOL the off-GitHub push is not refused as a transport, and the proof fails before any GitHub-form push', () => inRoot((root, repo, box) => {
    const env = cleanEnv(m.fenceEnv(box));
    delete env.GIT_ALLOW_PROTOCOL;
    const r = prove(box, repo, env);
    assert.equal(r.ok, false);
    assert.match(r.why, new RegExp(`^a push to ${AWAY.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} was not refused as a transport \\(.+\\), so no push was tried$`));
    assert.ok(!fs.existsSync(box.target), 'no GitHub-form push was tried');
    noRemotes(repo);
  }));

  test('one form whose push URL a longer mapping sends elsewhere stops it before any push, though all three are mapped', () => inRoot((root, repo, box) => {
    // git takes the longest matching prefix: a more specific mapping (one a
    // user's own gitconfig could hold) beats the fence's for the scp form.
    const other = path.join(root, 'other');
    const env = cleanEnv({ ...m.fenceEnv(box), GIT_CONFIG_COUNT: '5', GIT_CONFIG_KEY_4: `url.${baseOf(other)}.pushInsteadOf`, GIT_CONFIG_VALUE_4: 'git@fence.invalid:owner/' });
    const r = prove(box, repo, env);
    assert.equal(r.ok, false);
    assert.match(r.why, /^with the session's env git resolves git@fence\.invalid:owner\/probe-u4-test\.git's push URL to .+, so no push was tried$/);
    assert.ok(!fs.existsSync(box.target) && !fs.existsSync(other), 'no form was pushed, the good ones included');
    noRemotes(repo);
  }));

  test('a push URL that resolves anywhere but the fence stops it before any push', () => inRoot((root, repo, box) => {
    const r = prove({ ...box, pushUrl: box.pushUrl.replace('probe-u4-test', 'probe-u4-other') }, repo, cleanEnv(m.fenceEnv(box)));
    assert.equal(r.ok, false);
    assert.match(r.why, new RegExp(`^with the session's env git resolves ${URL0.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}'s push URL to .+, so no push was tried$`));
    assert.ok(!fs.existsSync(box.target));
    noRemotes(repo);
  }));

  test('a push that fails is no proof; neither is a folder git cannot read, nor one that cannot take the remotes', () => inRoot((root, repo, box) => {
    fs.mkdirSync(box.target, { recursive: true });
    fs.writeFileSync(path.join(box.target, 'HEAD'), 'not a repo\n');
    const r = prove(box, repo, cleanEnv(m.fenceEnv(box)));
    assert.equal(r.ok, false, JSON.stringify(r));
    assert.match(r.why, new RegExp(`^the proof push to ${URL0.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} failed: `));
    noRemotes(repo);
    const gone = prove(box, path.join(root, 'no-repo'), cleanEnv(m.fenceEnv(box)));
    assert.equal(gone.ok, false);
    assert.match(gone.why, /maps \[\] into the fence, missing .+, so no push was tried$/, 'git cannot even read its config there');
    const plain = path.join(root, 'plain');
    fs.mkdirSync(plain);
    const noRepo = prove(box, plain, { ...cleanEnv(m.fenceEnv(box)), GIT_CEILING_DIRECTORIES: root });
    assert.equal(noRepo.ok, false);
    assert.match(noRepo.why, /was not refused as a transport \(fatal: not a git repository.*\), so no push was tried$/, 'outside a repo the off-GitHub push fails, but not as a transport');
    assert.equal(git(repo, 'remote', 'add', 'q17-fence-proof-1', 'https://fence.invalid/taken.git').status, 0);
    const taken = prove(box, repo, cleanEnv(m.fenceEnv(box)));
    assert.equal(taken.ok, false);
    assert.match(taken.why, /^the proof could not be set up: git remote add: /);
    noRemotes(repo);
    assert.ok(!fs.existsSync(path.join(box.target, 'refs')) || git(root, '--git-dir', box.target, 'for-each-ref').stdout.trim() === '', 'nothing was pushed');
  }));

  test('a push that lands somewhere other than the fence repo it checks is no proof', () => inRoot((root, repo, box) => {
    assert.equal(git(root, 'init', '-q', '--bare', box.target).status, 0);
    const r = prove({ ...box, target: path.join(root, 'fence', 'owner', 'elsewhere.git') }, repo, cleanEnv(m.fenceEnv(box)));
    assert.equal(r.ok, false);
    assert.equal(r.why, `the proof push to ${URL0} reported success, but the fence holds no fence-proof-0 ref at HEAD`);
    assert.equal(git(root, '--git-dir', box.target, 'rev-parse', 'refs/heads/fence-proof-0').status, 0, 'the push itself landed where the URL sent it');
  }));
});

test('Q17: scrubDeep scrubs every string and keeps the shape', () => {
  const s = m.scrubDeep({ a: 'x1', b: ['x2', 3, null, { c: 'x3' }], d: true }, (t) => t.replace('x', 'y'));
  assert.deepEqual(s, { a: 'y1', b: ['y2', 3, null, { c: 'y3' }], d: true });
});
