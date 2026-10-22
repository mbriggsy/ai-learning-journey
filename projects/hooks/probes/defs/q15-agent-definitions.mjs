// Q15: three questions about custom agents and the Skill tool, one file.
//
// (a) Can Claude invoke /skill-doctor and /auto-mode-setup through the Skill
//     tool? One headless run with only the Skill tool asks the model to call
//     it with a project canary skill (the control: it must load), then
//     skill-doctor, auto-mode-setup and init (a built-in prompt command, the
//     docs' own example of one the Skill tool can run). Each tool_result is
//     read from the transcript, since a validation refusal fires no hook. A
//     typed `-p "/skill-doctor"` run shows the command exists here at all.
//     Observed only; it does not decide the verdict.
// (b) Does an agent with omitClaudeMd: true lose CLAUDE.md, and MEMORY.md
//     too? The workspace's CLAUDE.md holds one random word and its auto-memory
//     MEMORY.md another (a calibration run's transcript_path names the
//     project folder; the file goes in its memory/ folder and is deleted with
//     the probe's transcripts). Agents q15-keep (omitClaudeMd false) and
//     q15-omit (true), defined by --agents JSON, are each spawned by the
//     Agent tool and by a Workflow agent({agentType}) call, omit twice per
//     path (the runtime's managed-file lookup can fail open). Instrument: the
//     request bodies each agent sent (api-request-blob records, resolved by
//     hash across the whole session so a deduplicated blob still counts,
//     plus the request shape's system text). A word in them reached that
//     agent's model; the agent's own SEEN: line is corroboration. Controls:
//     the main session's requests carry both words (the files loaded), and a
//     keep agent's carry the CLAUDE.md word (a subagent's requests can show
//     it). Every Read/Glob/Grep is denied, so no word can arrive by a file
//     read.
// (c) Is an agent's tools allowlist enforced on Workflow agent({agentType}),
//     MCP tools included? The same workflow runs q15-ro (tools: Read), q15-rb
//     (Read, Bash) and a default agent, in a session whose tool pool holds
//     Read, Bash, Write, Edit and one MCP tool. That tool comes from a
//     probe-local stub server (STUB_MCP: its source is in this file, so the
//     verdict hash covers it) that run() writes into the workspace and passes
//     by --mcp-config beside lib's --strict-mcp-config, so no configured
//     server starts. ENABLE_TOOL_SEARCH=false loads every tool upfront: a
//     deferred MCP tool sits behind ToolSearch, where no request shape names
//     it. Each agent lists its tools and calls Bash once (echo) if it has
//     Bash. A PreToolUse hook on Bash|PowerShell|Write|Edit|Read|Glob|Grep
//     records and denies every attempt, one counting for an agent only by
//     its agent_id (the main thread has Bash, and its prompt holds every
//     echo); each agent's transcript Bash calls are a second record, counted
//     only when the CLI took the call (its result is the probe's deny reason
//     or a run's output): an unknown-tool refusal fires no hook and is the
//     model's non-compliance, logged only, and a call with no readable result
//     leaves (c) unread. Its request shape lists the tools it was offered. A
//     tool offered to ro or rb outside its allowlist is a leak unless
//     HARNESS_EXTRAS, a reviewed list, names it. An Agent
//     tool spawn of q15-ro (the documented path) is the reference: the stub's
//     tool offered to it is a leak too, any other tool offered only to it a
//     failed control. Controls: rb and the default agent reach Bash; each
//     offered list (ro, rb, the reference) names its allowlisted tool, so an
//     empty or missing record can't pass as no leak; and the default agent
//     and the Agent-path session are offered the stub's tool, so the server
//     ran in both sessions and the instrument can see an MCP name.
//
// Verdict, from (c) then (b) (decide, over decideC and decideB):
// CONTRADICTED if (c) fails; PARTIAL if an omit spawn keeps either word, even
// with the other path blind or (c) unmeasured (a measured deviation, so it
// never says unsettledOnly); VERIFIED if (c) holds and every omit spawn on
// both paths carries neither word; INCONCLUSIVE if a control of (c) or (b)
// fails.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { arm, byLabel, canary, hook, readCaptures, readJsonl, runClaude, scrubber, sleep, track, transcriptFrom, write } from '../lib.mjs';

const fwd = (p) => p.replace(/\\/g, '/');
const hex = () => canary('X').split('-')[1].toLowerCase();
const USER_SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const hashFile = (f) => (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : 'absent');

// The two sessions' --tools pools, and the allowlists (c) checks, as the
// --agents file defines them.
const AG_POOL = ['Agent', 'Read', 'Bash'];
const WF_POOL = ['Workflow', 'Read', 'Bash', 'Write', 'Edit'];
const RO_TOOLS = ['Read'];
const RB_TOOLS = ['Read', 'Bash'];

// Tools the CLI offers an agent from outside every pool and allowlist,
// reviewed by hand: advisor, offered to every agent on both paths on
// 2.1.306. A fixed list, never one computed from what the reference was
// offered: a tool leaking on both paths would excuse itself. A pool tool is
// never an extra (cutting it is the allowlist's job), nor is an MCP tool,
// ToolSearch or DeferredToolPlaceholder, each a way to tools outside the
// allowlist. A new name offered to ro or rb is a leak until it is reviewed
// and listed here, which re-hashes this def.
export const HARNESS_EXTRAS = ['advisor'];

// The stub MCP server (c) runs and the one tool it offers, by the name the
// CLI gives it.
export const MCP_SERVER = 'q15stub';
export const MCP_TOOL = `mcp__${MCP_SERVER}__stub_echo`;
const isMcp = (t) => String(t).startsWith('mcp__');
const TOOL_SEARCH = ['ToolSearch', 'DeferredToolPlaceholder'];

// That server: MCP over stdio, newline-delimited JSON-RPC 2.0. initialize
// echoes the client's protocolVersion; a notification (no id) gets no reply;
// tools/list offers one harmless tool, tools/call answers with a fixed word,
// ping an empty result, and any other request a method-not-found error. A
// line that isn't JSON is skipped. Globals only, no require or import, so it
// runs the same as CommonJS or ESM; it exits once its stdin ends.
export const STUB_MCP = `'use strict';
const TOOL = { name: 'stub_echo', description: 'Q15 probe stub: answers with a fixed word.', inputSchema: { type: 'object', properties: {} } };
const send = (msg) => process.stdout.write(JSON.stringify(Object.assign({ jsonrpc: '2.0' }, msg)) + '\\n');
const handle = (m) => {
  if (!m || typeof m !== 'object' || typeof m.method !== 'string' || m.id === undefined || m.id === null) return;
  const id = m.id;
  const p = m.params || {};
  if (m.method === 'initialize') send({ id, result: { protocolVersion: p.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: '${MCP_SERVER}', version: '1.0.0' } } });
  else if (m.method === 'tools/list') send({ id, result: { tools: [TOOL] } });
  else if (m.method === 'tools/call') send(p.name === TOOL.name ? { id, result: { content: [{ type: 'text', text: 'Q15_STUB_OK' }] } } : { id, error: { code: -32602, message: 'Unknown tool: ' + String(p.name) } });
  else if (m.method === 'ping') send({ id, result: {} });
  else send({ id, error: { code: -32601, message: 'Method not found: ' + m.method } });
};
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    handle(m);
  }
});
`;

// What an agent ({ tools, shapes } or null) was offered, or null with no
// request shape to say.
const offered = (a) => (a && a.shapes > 0 ? a.tools : null);

// The reference's MCP leak: the MCP tools offered to the Agent tool's q15-ro,
// read only from a record that lists its allowlisted Read (else none). It
// needs nothing from the workflow path, so it is read ahead of every
// workflow-path INCONCLUSIVE, here and in decideC.
const refMcpLeak = (ref) => (ref?.includes('Read') ? ref.filter(isMcp) : []);
const refMcpWhy = (names) => `the Agent tool ignores the tools allowlist for MCP tools: q15-ro, allowed only Read, was offered ${JSON.stringify(names)}`;
// What HARNESS_EXTRAS may never hold: a pool tool, an MCP tool, ToolSearch,
// DeferredToolPlaceholder.
const neverExtra = (t) => AG_POOL.includes(t) || WF_POOL.includes(t) || isMcp(t) || TOOL_SEARCH.includes(t);

// What (c)'s offered-tools records decide, before (b) is read. Each argument
// is an offered-tools list, or null when no request shape was found: ro, rb
// and def are the workflow's agents, ref the Agent tool's q15-ro, agMain the
// Agent-path session itself. In order: an MCP tool offered to ref is a leak
// (CONTRADICTED), first, since it needs neither ro's nor rb's record; a list
// missing its allowlisted tool is a record that can't be read
// (INCONCLUSIVE); a tool offered to ro or rb outside its allowlist and
// HARNESS_EXTRAS is a leak (CONTRADICTED); a control never offered the
// stub's tool means the server didn't run or the instrument can't see MCP
// names (INCONCLUSIVE); any other tool offered only to ref is a failed
// reference (INCONCLUSIVE). verdict null: the allowlists held.
export function toolVerdict({ ro, rb, ref, def, agMain }) {
  const outside = (list, allowed) => (list ?? []).filter((t) => !allowed.includes(t) && !HARNESS_EXTRAS.includes(t));
  const leaks = { ro: outside(ro, RO_TOOLS), rb: outside(rb, RB_TOOLS), ref: outside(ref, RO_TOOLS) };
  const out = (verdict, why) => ({ verdict, why, leaks });
  const refMcp = refMcpLeak(ref);
  if (refMcp.length) return out('CONTRADICTED', refMcpWhy(refMcp));
  const unlisted = [['ro', ro, 'Read'], ['rb', rb, 'Bash'], ['the Agent-tool reference q15-ro', ref, 'Read']]
    .filter(([, list, t]) => !list?.includes(t)).map(([l, , t]) => `${l} (${t})`);
  if (unlisted.length) return out('INCONCLUSIVE', `no request shape listed the allowlisted tool for ${unlisted.join(', ')}, so a tool offered outside an allowlist could not be seen`);
  if (leaks.ro.length || leaks.rb.length) {
    // A name ref was offered too is still a leak (the reference never
    // excuses one), but the text says neither path cut it, for the review
    // that decides whether it may join HARNESS_EXTRAS.
    const both = [...new Set([...leaks.ro, ...leaks.rb])].filter((t) => ref.includes(t));
    const never = both.filter(neverExtra);
    const shared = both.length ? `; the Agent-tool reference q15-ro was offered ${JSON.stringify(both)} too, so neither path cuts it: review it, into HARNESS_EXTRAS only if harmless${never.length ? ` (never ${JSON.stringify(never)}: a pool tool, or a way to tools outside the allowlist)` : ''}` : '';
    return out('CONTRADICTED', `the workflow path ignores the tools allowlist, offering ro ${JSON.stringify(leaks.ro)} and rb ${JSON.stringify(leaks.rb)} outside it${shared}`);
  }
  const blind = [['the workflow\'s default agent', def], ['the Agent-path session', agMain]].filter(([, list]) => !list?.includes(MCP_TOOL)).map(([l]) => l);
  if (blind.length) return out('INCONCLUSIVE', `${blind.join(' and ')} ${blind.length > 1 ? 'were' : 'was'} never offered the stub server's ${MCP_TOOL}, so the server did not run or the instrument can't see MCP tools, and an allowlisted agent without it says nothing`);
  if (leaks.ref.length) return out('INCONCLUSIVE', `only the Agent-tool reference q15-ro was offered ${JSON.stringify(leaks.ref)} outside its allowlist and the harness extras, so the reference failed`);
  return out(null, '');
}

// The reason the probe's PreToolUse hook gives when it refuses a call: Claude
// reads it in that call's tool_result (hooks.md, permissionDecisionReason).
export const DENY_REASON = 'Q15 probe: this tool call is recorded and refused.';

// What one Bash call in an agent's transcript ({ answered, isError, text }, as
// toolPairs pairs it) says about whether the CLI held Bash for that agent.
// 'ran': the result carries the probe's deny reason (the hook saw the call)
// or is a run's own output, so the CLI took the call. 'refused': an error
// naming no such tool, the CLI's unknown-tool refusal, returned as a
// tool_use_error before any hook (hooks.md; errors.md, "No such tool
// available"): the model called a tool it was never offered, its own
// non-compliance and never a leak. 'unread': no result, or an error that is
// neither (a failed run, a refusal worded otherwise), which can't say.
export function bashResult(p) {
  if (!p?.answered) return 'unread';
  const text = String(p.text ?? '');
  if (text.includes(DENY_REASON) || !p.isError) return 'ran';
  return /No such tool available/.test(text) ? 'refused' : 'unread';
}

// Bash attempts by one workflow agent a ({ id, bash } or null), whose echo
// carries Q15C_<tag>: hook, the PreToolUse denies carrying its agent id;
// transcript, the calls in its own transcript the CLI took (bashResult
// 'ran'); refused and unread, the rest by bashResult, never counted. A deny
// from the main thread (agent id null) or another agent never counts, even
// when its command carries the tag: the workflow session's main thread has
// Bash and its prompt holds every agent's echo, so a tag alone would let it
// stand in for ro (a false CONTRADICTED) or for a control. Such denies come
// back in stray, by name, for the evidence.
export function bashAttempts(denies, a, tag) {
  const tagged = new RegExp(`Q15C_${tag}\\b`);
  const bash = (denies ?? []).filter((d) => d.tool === 'Bash');
  const own = (d) => !!a && d.agentId != null && d.agentId === a.id;
  const who = (d) => (d.agentId == null ? 'the main thread' : `agent ${d.agentId} [${d.agentType}]`);
  const calls = (a?.bash ?? []).map(bashResult);
  const n = (k) => calls.filter((c) => c === k).length;
  return {
    hook: bash.filter(own).length,
    transcript: n('ran'),
    refused: n('refused'),
    unread: n('unread'),
    stray: bash.filter((d) => !own(d) && tagged.test(d.command)).map((d) => `${who(d)}: ${String(d.command).slice(0, 80)}`),
  };
}

// (b) on one spawn path, as facts for decideB. Spawns are { text }, the
// corpus of their requests; P is the CLAUDE.md word, M the MEMORY.md word;
// projDir the project folder calibration found, or null; leak, a delegation
// prompt that carried a canary (on the workflow path, a script not run as
// sent). Each omit row says which words its requests carried and whether
// they were read: an omit spawn whose own requests were never read would
// also carry neither word, so each must show its own task text. blind lists
// every control that failed.
export function bPath({ name, P, M, projDir, mainText, keeps, omits, leak }) {
  const main = { P: mainText.includes(P), M: mainText.includes(M) };
  const keepP = keeps.length > 0 && keeps.every((a) => a.text.includes(P));
  const keepM = keeps.length > 0 && keeps.every((a) => a.text.includes(M));
  const omitRows = omits.map((a) => ({ P: a.text.includes(P), M: a.text.includes(M), read: a.text.includes('Context probe omit') }));
  const unread = omitRows.filter((o) => !o.read).length;
  const blind = [!projDir && 'no project folder from calibration', !main.P && 'main session lacks the CLAUDE.md word', !main.M && 'main session lacks the MEMORY.md word', !keepP && 'a keep agent lacks the CLAUDE.md word', omits.length < 2 && `${omits.length} omit spawn(s) found`, unread && `${unread} omit spawn(s) whose own requests were not found`, leak && 'a delegation prompt carried a canary'].filter(Boolean);
  return { name, main, keepP, keepM, omitRows, leak: !!leak, blind };
}

// (b)'s verdict from both paths' bPath rows. A word in an omit spawn whose
// own requests were read, on a path with no delegation leak and whose main
// session carries that word, is a measured deviation: PARTIAL, ahead of
// every blind control, since a seen word needs no keep control and the other
// path's blindness can't unsee it (the managed-file lookup can fail open
// once, and a later clean run must not pass it). So it never says
// unsettledOnly: a re-roll to VERIFIED on this hash must read as a conflict
// (and run.mjs never honors the flag for Q15). Then INCONCLUSIVE while
// either path is blind; VERIFIED once every omit spawn on both paths was
// read and carried neither word.
export function decideB({ bAg, bWf }) {
  const bDetail = `(b) Agent tool: keep M ${bAg.keepM}, omit ${JSON.stringify(bAg.omitRows)}; Workflow: keep M ${bWf.keepM}, omit ${JSON.stringify(bWf.omitRows)}`;
  const kept = [bAg, bWf].flatMap((b) => (b.leak ? [] : b.omitRows.filter((o) => o.read)
    .flatMap((o) => [o.P && b.main.P && `${b.name} CLAUDE.md`, o.M && b.main.M && `${b.name} MEMORY.md`].filter(Boolean))));
  const blind = [...bAg.blind.map((x) => `Agent tool: ${x}`), ...bWf.blind.map((x) => `Workflow: ${x}`)];
  if (kept.length) return { verdict: 'PARTIAL', why: `(b) an omitClaudeMd spawn kept a word (${[...new Set(kept)].join(', ')}): ${bDetail}${blind.length ? `; the instrument could not see, beside it: ${blind.join('; ')}` : ''}` };
  if (blind.length) return { verdict: 'INCONCLUSIVE', why: `(b)'s instrument could not see: ${blind.join('; ')}` };
  const drops = (b) => b.omitRows.length > 0 && b.omitRows.every((o) => o.read && !o.P && !o.M);
  if (drops(bAg) && drops(bWf)) return { verdict: 'VERIFIED', why: `(b) every omitClaudeMd spawn on both paths carried neither the CLAUDE.md nor the MEMORY.md word while keep spawns carried CLAUDE.md (${bDetail})` };
  // Only rows bPath never builds (no blind control, yet a spawn unread or a
  // word main lacks) get here: never a verdict that measured something.
  return { verdict: 'INCONCLUSIVE', why: `(b) no omit spawn kept a word its session carried, yet not every one was read clean: ${bDetail}` };
}

// The whole verdict from (c)'s and (b)'s answers. A (c) CONTRADICTED wins. A
// (b) PARTIAL comes next, ahead of a (c) INCONCLUSIVE: a word an omit spawn
// kept was measured whatever (c)'s controls did (decideB already keeps an
// unproven workflow path's words out through its leak flag), so filing it as
// unmeasured would let a VERIFIED re-roll on this hash pass. Then (c)'s
// INCONCLUSIVE; then (b)'s verdict once (c) holds.
export function decide({ c, b }) {
  if (c.verdict === 'CONTRADICTED') return { verdict: 'CONTRADICTED', summary: c.why };
  if (b.verdict === 'PARTIAL') return { verdict: 'PARTIAL', summary: c.verdict ? `${b.why}; (c) went unmeasured: ${c.why}` : `${c.why}; ${b.why}` };
  if (c.verdict) return { verdict: c.verdict, summary: c.why };
  return { verdict: b.verdict, summary: `${c.why}; ${b.why}` };
}

// (c)'s verdict once both sessions are read: verdict null when it holds,
// with why the text that says so. wf: { found, intact }, the workflow's run
// record and whether it ran the probe's script as sent; ro, rb, def: the
// workflow's agents, and ref the Agent tool's q15-ro, each { tools, shapes,
// type } (type: its SubagentStart agent_type, else its meta's, else null)
// or null when no transcript was found; agMain: the Agent-path session's
// offered list, or null; att: bashAttempts for ro, rb and def. In order: the
// reference's MCP leak, read from the Agent-path session alone; then
// INCONCLUSIVE when the workflow did not run the script as sent (the proof
// the 'ro' label asked for q15-ro, so ro's and rb's records wait for it), an
// agent's transcript is missing, ro or rb ran as another type than its call
// named (a default agent says nothing about an agent file's allowlist), or a
// control never reached Bash; ro
// reaching Bash is CONTRADICTED, ahead of toolVerdict, since a deny under
// ro's own agent id or a transcript call the CLI took means the CLI ran Bash
// for ro whatever its offered list says; then toolVerdict; then INCONCLUSIVE
// while a ro call has no readable result. A ro call the CLI refused as no
// such tool is logged as the model's non-compliance and decides nothing.
export function decideC({ wf, ro, rb, def, ref, agMain, att }) {
  const refMcp = refMcpLeak(offered(ref));
  if (refMcp.length) return { verdict: 'CONTRADICTED', why: `${refMcpWhy(refMcp)} (all it was offered: ${JSON.stringify(ref.tools)}), read from the Agent-path session alone, ahead of the workflow path` };
  if (!wf.found || !wf.intact) return { verdict: 'INCONCLUSIVE', why: `the workflow path did not run the probe's script (record ${wf.found ? 'found, script changed' : 'not found'})` };
  if (!ro || !rb || !def) return { verdict: 'INCONCLUSIVE', why: `a workflow agent's transcript was not found (ro ${!!ro}, rb ${!!rb}, def ${!!def})` };
  const misTyped = [['ro', ro, 'q15-ro'], ['rb', rb, 'q15-rb']].filter(([, a, t]) => a.type !== t).map(([k, a, t]) => `${k} ran as ${JSON.stringify(a.type ?? null)}, not ${t}`);
  if (misTyped.length) return { verdict: 'INCONCLUSIVE', why: `a workflow agent did not run as the type its call named (${misTyped.join('; ')}), so its tools say nothing about that agent file's allowlist` };
  const reached = (x) => x.hook + x.transcript > 0;
  if (!reached(att.rb) || !reached(att.def)) return { verdict: 'INCONCLUSIVE', why: `the controls never reached Bash (rb ${JSON.stringify(att.rb)}, def ${JSON.stringify(att.def)}), so a missing ro attempt would look the same as no tool` };
  const hookBlind = att.rb.hook === 0 || att.def.hook === 0 ? ' (PreToolUse missed a control attempt the transcript shows)' : '';
  const refusedNote = att.ro.refused ? `; q15-ro called Bash ${att.ro.refused} time(s) and the CLI refused it as no such tool: the model's non-compliance, never a leak` : '';
  const cDetail = `(c) ro offered ${JSON.stringify(ro.tools)}, Bash attempts ${JSON.stringify(att.ro)}; rb offered ${JSON.stringify(rb.tools)}; def offered ${JSON.stringify(def.tools)}; the Agent-tool reference offered ${JSON.stringify(ref?.tools ?? null)}; harness extras ${JSON.stringify(HARNESS_EXTRAS)}${hookBlind}${refusedNote}`;
  if (reached(att.ro)) return { verdict: 'CONTRADICTED', why: `the workflow path ignores the tools allowlist: q15-ro, allowed only Read, reached Bash (the probe's hook denied its call under ro's own agent id, or its transcript shows a call the CLI took); ${cDetail}` };
  const tv = toolVerdict({ ro: offered(ro), rb: offered(rb), ref: offered(ref), def: offered(def), agMain });
  if (tv.verdict) return { verdict: tv.verdict, why: `${tv.why}; ${cDetail}` };
  if (att.ro.unread) return { verdict: 'INCONCLUSIVE', why: `q15-ro made ${att.ro.unread} Bash call(s) the hook never saw and whose result can't say whether the CLI took it (no result, or an error that is neither the probe's deny nor an unknown-tool refusal); ${cDetail}` };
  return { verdict: null, why: `${cDetail}; the stub's ${MCP_TOOL} reached the default agent and the Agent-path session, none of ro, rb or the reference` };
}

function walk(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// The probe's own folders become labels, in each spelling (either slash,
// JSON-doubled backslashes); `roots` is read at call time, so a folder added
// later is covered from then on.
function relabel(s, roots) {
  let t = String(s);
  for (const [abs, label] of roots) {
    for (const v of new Set([abs, fwd(abs), abs.replace(/\\/g, '\\\\'), fwd(abs).replace(/\//g, '\\\\')])) t = t.split(v).join(label);
  }
  return t;
}

const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((b) => (typeof b === 'string' ? b : b.text ?? '')).join('\n'));

// Every tool call in a transcript, paired with its result.
function toolPairs(records) {
  const results = new Map();
  for (const r of records) for (const b of (Array.isArray(r.message?.content) ? r.message.content : [])) if (b.type === 'tool_result') results.set(b.tool_use_id, b);
  const out = [];
  for (const r of records) {
    if (r.type !== 'assistant') continue;
    for (const b of (Array.isArray(r.message?.content) ? r.message.content : [])) {
      if (b.type !== 'tool_use') continue;
      const res = results.get(b.id);
      out.push({ name: b.name, input: b.input, answered: !!res, isError: !!res?.is_error, text: res ? textOf(res.content) : null });
    }
  }
  return out;
}

const lastText = (records) => records.filter((r) => r.type === 'assistant').flatMap((r) => (Array.isArray(r.message?.content) ? r.message.content : [])).filter((b) => b.type === 'text').map((b) => b.text).at(-1) ?? '';

// What each agent's model was sent. Blobs are content-addressed, so each
// request's `tail` hashes are resolved against every blob in the session.
function sessionAgents(sessionDir, mainTranscript) {
  const files = walk(sessionDir).filter((f) => /agent-[0-9a-z]+\.jsonl$/.test(f));
  const all = [mainTranscript, ...files].filter(Boolean).map((f) => ({ f, recs: readJsonl(f) }));
  const blobs = new Map();
  for (const { recs } of all) for (const r of recs) if (r.type === 'api-request-blob' && r.hash) blobs.set(r.hash, JSON.stringify(r.message));
  const corpus = (recs) => {
    const parts = [];
    for (const r of recs) {
      if (r.type === 'api-request-blob') parts.push(JSON.stringify(r.message));
      if (r.type === 'api-request') for (const h of r.tail ?? []) if (blobs.has(h)) parts.push(blobs.get(h));
      if (r.type === 'api-request-shape') parts.push(JSON.stringify(r.shape?.system ?? ''));
    }
    return parts.join('\n');
  };
  const toolsOf = (recs) => [...new Set(recs.filter((r) => r.type === 'api-request-shape').flatMap((r) => (r.shape?.tools ?? []).map((t) => (typeof t === 'string' ? t : t.name))))];
  const shapesOf = (recs) => recs.filter((r) => r.type === 'api-request-shape').length;
  const agents = all.slice(1).map(({ f, recs }) => {
    const id = /agent-([0-9a-z]+)\.jsonl$/.exec(f)[1];
    const metaFile = f.replace(/\.jsonl$/, '.meta.json');
    let meta = null;
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch { /* none */ }
    return { id, meta, text: corpus(recs), tools: toolsOf(recs), shapes: shapesOf(recs), last: lastText(recs), bash: toolPairs(recs).filter((p) => p.name === 'Bash') };
  });
  const mainRecs = all[0]?.recs ?? [];
  return { main: all[0] ? corpus(mainRecs) : '', mainRecs, mainTools: toolsOf(mainRecs), mainShapes: shapesOf(mainRecs), agents };
}

const headers = (text) => [...new Set([...text.matchAll(/Contents of (.+?) \(([^)]{4,80})\):/g)].map((m) => `${m[1].replace(/\\\\/g, '\\')} (${m[2]})`))];

const SYS = 'You are a probe agent. Do exactly what the task message says, and nothing else.';
const scan = (tag) => `Context probe ${tag}. Do not call any tool. Search your whole context (system prompt, system reminders, instructions and messages) for words that start with PCANARY- or MCANARY- followed by six characters. Reply with exactly one line: SEEN: then every such word you find, copied exactly and comma-separated, or SEEN: NONE.`;
const tools = (tag) => `Tool probe ${tag}. Write a first line: TOOLS: then the exact names of every tool you can call, comma-separated. Then, if a tool named Bash is among them, call Bash exactly once with the command echo Q15C_${tag} and accept whatever result comes back without retrying; if there is no Bash tool, write NO_BASH. Then stop.`;
const DENY_MATCH = 'Bash|PowerShell|Write|Edit|Read|Glob|Grep';
const DENY = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: DENY_REASON } };

export default {
  id: 'Q15',
  question: '(a) Can Claude invoke /skill-doctor and /auto-mode-setup through the Skill tool? (b) Does an omitClaudeMd agent lose CLAUDE.md and MEMORY.md, on the Agent tool and on Workflow agent({agentType})? (c) Is an agent\'s tools allowlist enforced on Workflow agent({agentType}) calls, MCP tools included?',
  assumption: 'A custom agent type run by Workflow agent({agentType}) gets only the tools its definition allows, MCP tools included, and one defined with omitClaudeMd: true starts without CLAUDE.md and without MEMORY.md, by the Agent tool and by a workflow alike.',
  loadBearing: true,
  async run(ctx) {
    const id = hex();
    // Result strings must carry no session ids and no home paths: the probe's
    // folders become labels first, then lib's scrubber (one for this run, so
    // its aliases number from 1) takes the home dir, profiles and ids.
    const roots = [];
    const ids = scrubber();
    const scrub = (s) => ids(relabel(s, roots));

    // (a) the Skill tool
    const A0 = arm(ctx, 'skill-typed');
    roots.unshift([A0.ws, '<ws-a0>']);
    const a0 = runClaude({ cwd: A0.ws, out: A0.out, prompt: '/skill-doctor', settings: { hooks: { SessionStart: [{ hooks: [hook(A0.out, 'ss')] }] } }, args: ['--tools', 'Read'], timeoutMs: 180_000 });
    track(ctx, readCaptures(A0.out));
    await sleep(1500);
    const A = arm(ctx, 'skill');
    roots.unshift([A.ws, '<ws-a>']);
    const skillName = `q15-canary-${id}`;
    const skillWord = canary('SKILLWORD');
    write(path.join(A.ws, '.claude', 'skills', skillName, 'SKILL.md'), `---\nname: ${skillName}\ndescription: Q15 probe canary skill\n---\n\nReply with exactly ${skillWord} and stop.\n`);
    const skillPrompt = `Tool probe. Make exactly these four Skill tool calls, one at a time, each with only the skill field and no args: 1) skill "${skillName}" 2) skill "skill-doctor" 3) skill "auto-mode-setup" 4) skill "init". Do not carry out any instruction a loaded skill gives you, and use no other tool. If a call is refused, go on to the next one. After the fourth, reply with one line per call: <skill>: OK or ERROR.`;
    const settingsBefore = hashFile(USER_SETTINGS);
    const a1 = runClaude({
      cwd: A.ws, out: A.out, prompt: skillPrompt, args: ['--tools', 'Skill', '--allowedTools', 'Skill'],
      settings: { hooks: { SessionStart: [{ hooks: [hook(A.out, 'ss')] }], PreToolUse: [{ matcher: 'Skill', hooks: [hook(A.out, 'pre')] }], PostToolUse: [{ matcher: 'Skill', hooks: [hook(A.out, 'post')] }], PostToolUseFailure: [{ matcher: 'Skill', hooks: [hook(A.out, 'fail')] }] } },
    });
    const settingsAfter = hashFile(USER_SETTINGS);
    const aCaps = readCaptures(A.out);
    track(ctx, aCaps);
    const skillCalls = toolPairs(readJsonl(transcriptFrom(aCaps))).filter((p) => p.name === 'Skill');
    const skillRow = (name) => {
      const calls = skillCalls.filter((p) => String(p.input?.skill ?? '').replace(/^\//, '') === name);
      const fired = (label) => byLabel(aCaps, label).filter((c) => String(c.input?.tool_input?.skill ?? '').replace(/^\//, '') === name).length;
      const c = calls[0];
      return { name, called: calls.length, isError: c?.isError ?? null, text: c?.text?.slice(0, 240) ?? null, pre: fired('pre'), post: fired('post'), fail: fired('fail') };
    };
    const skills = [skillName, 'skill-doctor', 'auto-mode-setup', 'init'].map(skillRow);
    const sk = Object.fromEntries(skills.map((r) => [r.name === skillName ? 'canary' : r.name, r]));
    const state = (r) => (!r.called ? 'not called' : r.isError ? 'refused' : 'ran');
    const aLine = (r) => (!r.called ? 'not called' : `${state(r)}: ${JSON.stringify(r.text)}`);
    const aSummary = state(sk.canary) !== 'ran'
      ? `(a) unobserved: the canary skill did not load through the Skill tool (${aLine(sk.canary)})`
      : `(a) through the Skill tool, skill-doctor ${aLine(sk['skill-doctor']).slice(0, 200)}; auto-mode-setup ${aLine(sk['auto-mode-setup']).slice(0, 200)} (controls: canary skill ${state(sk.canary)}, init ${state(sk.init)})`;
    await sleep(1500);

    // (b) and (c): one workspace, a calibration run, then the two spawn paths
    const B = arm(ctx, 'agents');
    roots.unshift([B.ws, '<ws-b>']);
    const P = canary('PCANARY');
    const M = canary('MCANARY');
    write(path.join(B.ws, 'CLAUDE.md'), `# Probe workspace\n\nProbe canary (project CLAUDE.md): ${P}\n`);
    const calOut = path.join(B.out, 'calibrate');
    runClaude({ cwd: B.ws, out: calOut, prompt: 'Reply with the single word ok.', settings: { hooks: { SessionStart: [{ hooks: [hook(calOut, 'ss')] }] } }, args: ['--tools', 'Read'], timeoutMs: 120_000 });
    const calCaps = readCaptures(calOut);
    track(ctx, calCaps);
    const calTranscript = transcriptFrom(calCaps);
    const projDir = calTranscript ? path.dirname(calTranscript) : null;
    if (projDir) {
      roots.unshift([projDir, '<project>']);
      write(path.join(projDir, 'memory', 'MEMORY.md'), `- Probe canary (auto memory): ${M}\n`);
    }
    const agentsFile = write(path.join(B.out, 'agents.json'), JSON.stringify({
      'q15-keep': { description: 'Q15 probe: context scan, CLAUDE.md kept', prompt: SYS, tools: ['Read'], omitClaudeMd: false },
      'q15-omit': { description: 'Q15 probe: context scan, CLAUDE.md omitted', prompt: SYS, tools: ['Read'], omitClaudeMd: true },
      'q15-ro': { description: 'Q15 probe: Read only', prompt: SYS, tools: RO_TOOLS },
      'q15-rb': { description: 'Q15 probe: Read and Bash', prompt: SYS, tools: RB_TOOLS },
    }, null, 2));
    const denySettings = (out) => ({
      hooks: {
        SessionStart: [{ hooks: [hook(out, 'ss')] }],
        PreToolUse: [{ matcher: DENY_MATCH, hooks: [hook(out, 'deny', { respond: DENY })] }],
        SubagentStart: [{ hooks: [hook(out, 'sub-start')] }],
        SubagentStop: [{ hooks: [hook(out, 'sub-stop')] }],
      },
    });
    // (c)'s stub MCP server, for both spawn paths' sessions: the script in the
    // workspace, its config in the probe's private folder, and tool search
    // off so its tool is offered by name.
    const stub = write(path.join(B.ws, 'q15-stub-mcp.cjs'), STUB_MCP);
    const mcpConfig = write(path.join(B.out, 'mcp.json'), JSON.stringify({ mcpServers: { [MCP_SERVER]: { type: 'stdio', command: process.execPath, args: [fwd(stub)] } } }, null, 2));
    const MCP_ARGS = ['--mcp-config', fwd(mcpConfig)];
    const MCP_ENV = { ENABLE_TOOL_SEARCH: 'false' };
    await sleep(1500);

    // the Agent tool path
    const agOut = path.join(B.out, 'agent-path');
    const agPrompt = [
      'Make exactly four Agent tool calls, one at a time, waiting for each to finish before making the next. Pass each prompt word for word as quoted, adding nothing to it:',
      `1. subagent_type "q15-keep", description "keep scan", prompt "${scan('keep')}"`,
      `2. subagent_type "q15-omit", description "omit scan one", prompt "${scan('omit1')}"`,
      `3. subagent_type "q15-omit", description "omit scan two", prompt "${scan('omit2')}"`,
      `4. subagent_type "q15-ro", description "ro tools", prompt "${tools('ROAG')}"`,
      'Use no other tool. After the fourth, reply with each agent\'s reply verbatim, one per line.',
    ].join('\n');
    const ag = runClaude({ cwd: B.ws, out: agOut, prompt: agPrompt, settings: denySettings(agOut), args: ['--agents', fwd(agentsFile), ...MCP_ARGS, '--tools', AG_POOL.join(','), '--allowedTools', 'Agent'], env: MCP_ENV, timeoutMs: 480_000 });
    const agCaps = readCaptures(agOut);
    track(ctx, agCaps);
    await sleep(1500);

    // the Workflow path
    const wfName = `zzprobe-q15-agents-${id}`;
    const script = [
      `export const meta = { name: '${wfName}', description: 'Q15 probe: custom agent types in a workflow' }`,
      'const out = {}',
      "const cap = async (k, f) => { try { out[k] = await f() } catch (e) { out[k] = 'THREW: ' + String((e && e.message) || e).slice(0, 400) } }",
      `await cap('keep', () => agent('${scan('keep')}', { label: 'keep', agentType: 'q15-keep' }))`,
      `await cap('omit1', () => agent('${scan('omit1')}', { label: 'omit1', agentType: 'q15-omit' }))`,
      `await cap('omit2', () => agent('${scan('omit2')}', { label: 'omit2', agentType: 'q15-omit' }))`,
      `await cap('ro', () => agent('${tools('RO')}', { label: 'ro', agentType: 'q15-ro' }))`,
      `await cap('rb', () => agent('${tools('RB')}', { label: 'rb', agentType: 'q15-rb' }))`,
      `await cap('def', () => agent('${tools('DEF')}', { label: 'def' }))`,
      'return out',
    ].join('\n');
    const wfOut = path.join(B.out, 'workflow-path');
    const wfPrompt = `Run a workflow now with the Workflow tool, passing exactly this script as the script parameter (I am explicitly asking for a workflow):\n\n${script}\n\nOnce it has launched, do not wait for it or check on it: reply with the single word launched.`;
    const wf = runClaude({ cwd: B.ws, out: wfOut, prompt: wfPrompt, settings: denySettings(wfOut), args: ['--agents', fwd(agentsFile), ...MCP_ARGS, '--tools', WF_POOL.join(','), '--allowedTools', 'Workflow'], env: MCP_ENV, timeoutMs: 480_000 });
    const wfCaps = readCaptures(wfOut);
    track(ctx, wfCaps);

    // read both sessions
    const session = (caps) => {
      const t = transcriptFrom(caps);
      const dir = t ? t.replace(/\.jsonl$/, '') : null;
      if (dir) roots.unshift([dir, '<session>']);
      return { t, dir, ...sessionAgents(dir, t) };
    };
    const agS = session(agCaps);
    const wfS = session(wfCaps);
    const denies = (caps) => byLabel(caps, 'deny').map((c) => ({ tool: c.input?.tool_name, agentId: c.input?.agent_id ?? null, agentType: c.input?.agent_type ?? null, command: String(c.input?.tool_input?.command ?? '') }));
    const agDeny = denies(agCaps);
    const wfDeny = denies(wfCaps);
    const subTypes = (caps) => Object.fromEntries(byLabel(caps, 'sub-start').map((c) => [c.input?.agent_id, c.input?.agent_type]));

    // Agent-tool spawns, by the agent_type their SubagentStart carried
    const agTypes = subTypes(agCaps);
    const agSpawns = agS.agents.map((a) => ({ ...a, type: agTypes[a.id] ?? a.meta?.agentType ?? null }));
    const agentToolInputs = toolPairs(agS.mainRecs).filter((p) => p.name === 'Agent');
    const agLeak = agentToolInputs.some((p) => JSON.stringify(p.input).includes(P) || JSON.stringify(p.input).includes(M));

    // Workflow spawns, by the label in the run record's progress list
    const recs = walk(wfS.dir && path.join(wfS.dir, 'workflows')).filter((f) => f.endsWith('.json')).map((f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }).filter(Boolean);
    const wfRec = recs.find((r) => r.workflowName === wfName) ?? null;
    const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
    const scriptIntact = !!wfRec && norm(wfRec.script) === norm(script);
    const labelToId = Object.fromEntries((wfRec?.workflowProgress ?? []).filter((x) => x.type === 'workflow_agent').map((x) => [x.label, x.agentId]));
    const wfTypes = subTypes(wfCaps);
    const wfAgent = (label) => { const a = wfS.agents.find((x) => x.id === labelToId[label]); return a ? { ...a, type: wfTypes[a.id] ?? a.meta?.agentType ?? null } : null; };

    const spawnRow = (a, label) => (a ? `${label} [${a.type}]: P ${a.text.includes(P)}, M ${a.text.includes(M)}, says ${JSON.stringify(a.last.slice(0, 120))}` : `${label}: not found`);

    // (b) per path
    const bAg = bPath({ name: 'Agent tool', P, M, projDir, mainText: agS.main, keeps: agSpawns.filter((a) => a.type === 'q15-keep'), omits: agSpawns.filter((a) => a.type === 'q15-omit'), leak: agLeak });
    const wfKeep = wfAgent('keep');
    const wfOmits = ['omit1', 'omit2'].map(wfAgent).filter(Boolean);
    const bWf = bPath({ name: 'Workflow', P, M, projDir, mainText: wfS.main, keeps: wfKeep ? [wfKeep] : [], omits: wfOmits, leak: !scriptIntact });
    const bLine = (b) => `${b.name}: main P ${b.main.P} M ${b.main.M}; keep P ${b.keepP} M ${b.keepM}; omit spawns ${JSON.stringify(b.omitRows)}${b.blind.length ? `; blind: ${b.blind.join(', ')}` : ''}`;

    // (c) on the workflow path
    const ro = wfAgent('ro');
    const rb = wfAgent('rb');
    const def = wfAgent('def');
    const att = { ro: bashAttempts(wfDeny, ro, 'RO'), rb: bashAttempts(wfDeny, rb, 'RB'), def: bashAttempts(wfDeny, def, 'DEF') };
    const agRo = agSpawns.find((a) => a.type === 'q15-ro') ?? null;
    const agMain = agS.mainShapes > 0 ? agS.mainTools : null;
    const tv = toolVerdict({ ro: offered(ro), rb: offered(rb), ref: offered(agRo), def: offered(def), agMain });
    const hasStub = (list) => (list ? list.includes(MCP_TOOL) : 'no shape');
    const stubRow = [['def', offered(def)], ['ro', offered(ro)], ['rb', offered(rb)], ['the reference', offered(agRo)], ['the Agent-path session', agMain], ['the workflow session', wfS.mainShapes > 0 ? wfS.mainTools : null]]
      .map(([l, list]) => `${l} ${hasStub(list)}`).join(', ');
    const searchSeen = [...new Set([agS.mainTools, wfS.mainTools, ...agS.agents.map((a) => a.tools), ...wfS.agents.map((a) => a.tools)].flat().filter((t) => TOOL_SEARCH.includes(t)))];
    const strays = (x) => (x.stray.length ? `; tagged Bash denies from elsewhere, never counted: ${JSON.stringify(x.stray)}` : '');
    // The transcript calls bashAttempts never counts, each with what its
    // result said. A refusal is the model's non-compliance for an agent not
    // allowed Bash (decideC says so for ro), a failed control for rb or def.
    const uncounted = (a) => (a?.bash ?? []).filter((p) => bashResult(p) !== 'ran').map((p) => `${bashResult(p)}: ${p.answered ? JSON.stringify(String(p.text ?? '').slice(0, 120)) : 'no result'}`);
    const transcriptRow = (a, x) => `in its transcript, taken by the CLI ${x.transcript}, refused as no such tool ${x.refused}, with no readable result ${x.unread}${uncounted(a).length ? ` ${JSON.stringify(uncounted(a))}` : ''}`;
    const cLine = (label, a, x) => `${a ? `${label} [${a.type}]: offered ${JSON.stringify(a.tools)} (${a.shapes} shape record(s)); Bash calls the hook saw ${x.hook}; ${transcriptRow(a, x)}; says ${JSON.stringify(a.last.slice(0, 140))}` : `${label}: not found`}${strays(x)}`;
    const refAtt = bashAttempts(agDeny, agRo, 'ROAG');

    const evidence = [
      `(a) typed -p /skill-doctor: exit ${a0.status}, prints ${JSON.stringify(String(a0.json?.result ?? a0.stdout ?? '').slice(0, 140))}`,
      ...skills.map((r) => `(a) Skill ${r.name === skillName ? '<canary skill>' : r.name}: called ${r.called}, ${aLine(r)}; hooks pre ${r.pre} post ${r.post} failure ${r.fail}`),
      `(a) ~/.claude/settings.json unchanged across the Skill run: ${settingsBefore === settingsAfter}; session exit ${a1.status}, reply ${JSON.stringify(String(a1.json?.result ?? '').slice(0, 160))}`,
      `(b) ${bLine(bAg)}`,
      `(b) ${bLine(bWf)}`,
      `(b) Agent-tool spawns: ${agSpawns.map((a) => spawnRow(a, a.id.slice(0, 6))).join(' | ')}; delegation prompts carried a canary: ${agLeak}`,
      `(b) workflow spawns: ${[['keep', wfKeep], ['omit1', wfAgent('omit1')], ['omit2', wfAgent('omit2')], ['def', def]].map(([l, a]) => spawnRow(a, l)).join(' | ')}`,
      `(b) instruction files named in each workflow spawn's requests: ${JSON.stringify(Object.fromEntries(['keep', 'omit1', 'omit2', 'ro', 'def'].map((l) => [l, headers(wfAgent(l)?.text ?? '')])))}`,
      `(b) instruction files named in the workflow session's main requests: ${JSON.stringify(headers(wfS.main))}`,
      `(c) ${cLine('ro', ro, att.ro)}`,
      `(c) ${cLine('rb', rb, att.rb)}`,
      `(c) ${cLine('def', def, att.def)}`,
      `(c) Agent-tool reference: ${agRo ? `q15-ro offered ${JSON.stringify(agRo.tools)} (${agRo.shapes} shape record(s)), Bash calls the hook saw ${refAtt.hook}; ${transcriptRow(agRo, refAtt)}; says ${JSON.stringify(agRo.last.slice(0, 120))}` : 'not found'}${strays(refAtt)}`,
      `(c) harness extras (reviewed, fixed) ${JSON.stringify(HARNESS_EXTRAS)}; offered outside the allowlist net of them: ro ${JSON.stringify(tv.leaks.ro)}, rb ${JSON.stringify(tv.leaks.rb)}, the reference ${JSON.stringify(tv.leaks.ref)}`,
      `(c) stub MCP tool ${MCP_TOOL} offered to: ${stubRow}; tool-search tools offered anywhere (ENABLE_TOOL_SEARCH=false should leave none): ${JSON.stringify(searchSeen)}`,
      `(c) deny captures: workflow ${JSON.stringify(wfDeny)}; agent path ${JSON.stringify(agDeny)}`,
      `(c) SubagentStart agent_type values: workflow ${JSON.stringify(Object.values(wfTypes))}; agent path ${JSON.stringify(Object.values(agTypes))}`,
      `sessions: agent path exit ${ag.status} in ${ag.ms} ms, ${agS.agents.length} agent transcript(s), ${agentToolInputs.length} Agent call(s); workflow exit ${wf.status} in ${wf.ms} ms, run record ${wfRec ? `${wfRec.runId} ${wfRec.status}` : 'not found'}, script as sent ${scriptIntact}, result ${JSON.stringify(wfRec?.result ?? null).slice(0, 400)}`,
    ].map(scrub);
    const observed = JSON.parse(scrub(JSON.stringify({ skills, bAg, bWf, att, tools: { ro: ro?.tools, rb: rb?.tools, def: def?.tools, agRo: agRo?.tools, agMain: agS.mainTools, wfMain: wfS.mainTools }, harnessExtras: HARNESS_EXTRAS, leaked: tv.leaks, toolVerdict: tv.verdict, searchSeen, wfTypes, agTypes, settingsUnchanged: settingsBefore === settingsAfter })));
    const done = (verdict, summary) => ({ verdict, summary: scrub(`${summary}. ${aSummary}`), evidence, observed });

    const c = decideC({ wf: { found: !!wfRec, intact: scriptIntact }, ro, rb, def, ref: agRo, agMain, att });
    const d = decide({ c, b: decideB({ bAg, bWf }) });
    return done(d.verdict, d.summary);
  },
};
