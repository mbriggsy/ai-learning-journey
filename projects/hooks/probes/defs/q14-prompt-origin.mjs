// Q14: what do the UserPromptSubmit input and the transcript's origin record
// say for typed, Remote Control, peer-message, task-notification and /loop
// prompts?
//
// The gate may honor close intent and a waiver only from Briggsy's own
// prompts (KTD 7, U15), so a hook has to tell those from a peer's message, a
// background task's report and a /loop tick. Three instruments:
//   census     a read-only tally of the user records in transcripts on disk
//              since 2.1.300 shipped: origin.kind / subkind / producer,
//              promptSource and entrypoint, as counts and key names only. It
//              never reads prompt text. Real sessions hold the human, peer and
//              notification samples a headless run can't make.
//   hook view  headless arms whose UserPromptSubmit hook records its own
//              input keys and, at that moment, reads the transcript for the
//              record carrying its prompt_id: is the origin already there for
//              a hook to read, or does the asynchronous write lag behind?
//   arms       typed-equivalent (-p), a background shell's completion, a
//              background subagent's report.
// Each firing is filed by its prompt's head: a <task-notification> turn, or
// the arm's own -p prompt. Every arm must show each firing it expects (its
// -p prompt, and a notification where one is due) in both hooks, or the
// probe is INCONCLUSIVE: an arm that never fired says nothing about input
// keys or timing. The input keys are reported as observed, the union over
// every firing of each kind.
// Typed and Remote Control prompts reach a hook only in a live session; the
// plan's probe hook in projects/.claude/settings.local.json measures those
// once U3's settings writer exists, so those arms are BLOCKED here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { arm, byLabel, hook, readCaptures, readJsonl, runClaude, scrubber, sleep, track, write } from '../lib.mjs';

const SINCE = Date.parse('2026-10-14T00:00:00Z');

// At UserPromptSubmit time: this hook's input keys, and the transcript record
// with the same promptId if it is already on disk. Without PROBE_OUT it
// writes nothing, as capture.mjs does: a stray copy of this probe's settings
// must never touch a real session.
export const READER = `
const fs = require('fs');
const path = require('path');
let d = '';
process.stdin.on('data', (c) => (d += c)).on('end', () => {
  if (!process.env.PROBE_OUT) return;
  const input = JSON.parse(d);
  let rec = null;
  let tries = 0;
  try {
    const lines = fs.readFileSync(input.transcript_path, 'utf8').split('\\n').filter(Boolean);
    for (const l of lines) { let r; try { r = JSON.parse(l); } catch { continue; } if (r.type === 'user' && r.promptId === input.prompt_id) rec = r; }
  } catch (e) { tries = -1; }
  const out = { label: 'ups-view', at: new Date().toISOString(), input: { keys: Object.keys(input), prompt_id: input.prompt_id, transcript_path: input.transcript_path, promptHead: String(input.prompt || '').slice(0, 24) },
    record: rec ? { found: true, origin: rec.origin ?? null, promptSource: rec.promptSource ?? null, keys: Object.keys(rec) } : { found: false, readError: tries === -1 } };
  fs.appendFileSync(path.join(process.env.PROBE_OUT, 'captures.jsonl'), JSON.stringify(out) + '\\n');
});
`;

// What the shell arm runs in the background: a pattern rule allows exactly
// it, not all of Bash.
const WAIT = 'setTimeout(() => {}, 8000);\n';

// notes: the notification turns the arm is due (its -p prompt is always one).
const ARMS = [
  { name: 'typed-equivalent', prompt: 'Reply with the single word ok.', tools: 'Read', allow: 'Read', notes: 0 },
  { name: 'shell-notification', prompt: 'Run this exact command with the Bash tool, with run_in_background set to true: node wait.js . Do not wait for it or check it. Reply with the single word started. When you are told it finished, reply with the single word seen.', tools: 'Bash', allow: 'Bash(node wait.js)', notes: 1 },
  { name: 'agent-notification', prompt: 'Use the Agent tool once, with run_in_background set to true, subagent_type general-purpose, and this prompt: "Reply with the single word ok. Use no tools." Do not wait for it. Reply with the single word started. When its report arrives, reply with the single word seen.', tools: 'Agent', allow: 'Agent', notes: 1 },
];
const KINDS = ['p', 'notification'];
const kindOf = (prompt) => (String(prompt ?? '').startsWith('<task-notification>') ? 'notification' : 'p');
const count = (list, kind) => list.filter((x) => x.kind === kind).length;
const keysOf = (firings, kind) => [...new Set(firings.filter((f) => f.kind === kind).flatMap((f) => f.keys))].sort();

async function census() {
  const root = path.join(os.homedir(), '.claude', 'projects');
  const tally = {};
  const originKeys = new Set();
  const humanKeys = {};
  let files = 0;
  let records = 0;
  for (const proj of fs.readdirSync(root)) {
    // Probe sessions are no sample, and a concurrent --cleanup may be
    // deleting them: skipped before anything in them is touched.
    if (/claude-probe-/.test(proj)) continue;
    const dir = path.join(root, proj);
    let entries;
    try { entries = fs.readdirSync(dir); } catch { continue; }
    for (const f of entries.filter((x) => x.endsWith('.jsonl'))) {
      const file = path.join(dir, f);
      let mtime;
      try { mtime = fs.statSync(file).mtimeMs; } catch { continue; } // gone since the listing
      if (mtime < SINCE) continue;
      const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
      try {
        for await (const line of rl) {
          if (!line.includes('"type":"user"')) continue;
          let r;
          try { r = JSON.parse(line); } catch { continue; }
          if (r.type !== 'user' || r.isMeta) continue;
          const c = r.message?.content;
          // a tool result is a user record too; only prompts count
          if (Array.isArray(c) && c.some((b) => b.type === 'tool_result')) continue;
          records++;
          const o = r.origin;
          if (o && typeof o === 'object') Object.keys(o).forEach((k) => originKeys.add(k));
          const key = [o?.kind ?? '(none)', o?.subkind ?? '', o?.producer ?? '', `src=${r.promptSource ?? '(none)'}`, `entry=${r.entrypoint ?? '(none)'}`].join('|');
          tally[key] = (tally[key] || 0) + 1;
          if (o?.kind === 'human' || !o) for (const k of Object.keys(r)) humanKeys[k] = (humanKeys[k] || 0) + 1;
        }
      } catch (e) {
        if (e.code === 'ENOENT') continue; // deleted between the stat and the open
        throw e;
      }
      files++;
    }
  }
  return { files, records, tally, originKeys: [...originKeys].sort(), humanOrNoOriginKeys: humanKeys };
}

// The verdict from what run() observed ({census, rows}): pure, so a test can
// plant it. Q14 has no CONTRADICTED path: once every arm fired as due, what
// stays open is the typed and Remote Control arms, BLOCKED until U3, so its
// PARTIAL says unsettledOnly.
export function decide({ census: c, rows }) {
  const short = Object.entries(rows).filter(([, r]) => r.missing.length).map(([k, r]) => `${k} (${r.missing.join(', ')})`);
  if (short.length) return { verdict: 'INCONCLUSIVE', summary: `an expected UserPromptSubmit firing never reached a hook in: ${short.join('; ')}, so the input keys and the hook-time reads miss a prompt kind` };

  const all = Object.values(rows);
  const views = all.flatMap((r) => r.views);
  const keys = Object.fromEntries(KINDS.map((k) => [k, keysOf(all.flatMap((r) => r.firings), k)]));
  const originLike = [...new Set(Object.values(keys).flat().filter((k) => /origin|source/i.test(k)))];
  const onlyNote = keys.notification.filter((k) => !keys.p.includes(k));
  const notes = views.filter((v) => v.kind === 'notification');
  // No firing of a kind is no reading of it, never "readable in every one".
  const readable = (kind) => {
    const vs = views.filter((v) => v.kind === kind);
    const lag = vs.filter((v) => !v.atHookTime?.found).length;
    return !vs.length ? 'not measured (no firing) in' : lag === 0 ? `already readable in all ${vs.length}` : `missing in ${lag} of ${vs.length}`;
  };
  const summary = [
    `the UserPromptSubmit input carries ${originLike.length ? `origin-like key(s) ${JSON.stringify(originLike)}` : 'no origin or source key'}: keys over every -p firing ${JSON.stringify(keys.p)}, over every <task-notification> firing ${JSON.stringify(keys.notification)}${onlyNote.length ? ` (only on notifications: ${JSON.stringify(onlyNote)})` : ''}`,
    `notification turns fired the hook ${notes.length} time(s), transcript origin.kind ${JSON.stringify(notes.map((v) => v.afterRun?.origin?.kind ?? null))}`,
    `at hook time the prompt's own record was ${readable('p')} -p firings and ${readable('notification')} notification firings${views.some((v) => !v.atHookTime?.found) ? ' (the write lags the hook)' : ''}`,
    `census kinds: ${JSON.stringify([...new Set(Object.keys(c.tally).map((k) => k.split('|')[0]))])}`,
    'typed and Remote Control prompts: BLOCKED until the probe hook in projects/.claude/settings.local.json records them (after U3)',
  ].join('; ');
  return { verdict: 'PARTIAL', summary, unsettledOnly: true };
}

export default {
  id: 'Q14',
  question: 'What are the UserPromptSubmit input and the transcript origin.kind for typed, Remote Control, peer-message, task-notification and /loop prompts?',
  assumption: 'A UserPromptSubmit hook can tell Briggsy\'s own prompts (typed or Remote Control) from a peer message, a task notification and a /loop tick, from its input or from the transcript record it can read at that moment.',
  loadBearing: true,
  async run(ctx) {
    const c = await census();
    const rows = {};
    for (const a of ARMS) {
      const { ws, out } = arm(ctx, a.name);
      const reader = write(path.join(ws, 'ups-view.js'), READER);
      if (a.tools === 'Bash') write(path.join(ws, 'wait.js'), WAIT);
      const settings = { hooks: { UserPromptSubmit: [{ hooks: [hook(out, 'ups'), { type: 'command', command: 'node', args: [reader.replace(/\\/g, '/')] }] }] } };
      runClaude({ cwd: ws, out, prompt: a.prompt, settings, args: ['--tools', a.tools, '--allowedTools', a.allow] });
      const caps = readCaptures(out);
      track(ctx, caps);
      const tx = readJsonl(caps.find((x) => x.input?.transcript_path)?.input.transcript_path);
      const firings = byLabel(caps, 'ups').map((u) => ({ kind: kindOf(u.input?.prompt), keys: Object.keys(u.input ?? {}) }));
      const views = byLabel(caps, 'ups-view').map((v) => {
        const r = tx.find((x) => x.type === 'user' && x.promptId === v.input.prompt_id);
        return { kind: kindOf(v.input.promptHead), head: v.input.promptHead, atHookTime: v.record, afterRun: r ? { origin: r.origin ?? null, promptSource: r.promptSource ?? null } : null };
      });
      const due = { p: 1, notification: a.notes };
      // The firings this arm is due but neither hook recorded.
      const missing = KINDS.flatMap((k) => [
        count(firings, k) < due[k] && `${k} ${count(firings, k)} of ${due[k]} in the capture hook`,
        count(views, k) < due[k] && `${k} ${count(views, k)} of ${due[k]} in the reader hook`,
      ]).filter(Boolean);
      rows[a.name] = { due, fired: Object.fromEntries(KINDS.map((k) => [k, count(firings, k)])), missing, firings, views };
      await sleep(1500);
    }
    // Evidence and summary go through one scrubber for this probe: the census
    // copies CLI values verbatim and the arms copy origin records, so nothing
    // here may carry an id or a path out unaliased.
    const scrub = scrubber();
    const evidence = [
      `census: ${c.records} prompt records in ${c.files} transcripts since 2026-10-14; origin keys seen ${JSON.stringify(c.originKeys)}`,
      `census tally (kind|subkind|producer|promptSource|entrypoint): ${JSON.stringify(c.tally)}`,
      `top-level keys on human/no-origin records: ${JSON.stringify(c.humanOrNoOriginKeys)}`,
      ...Object.entries(rows).map(([k, r]) => `${k}: UserPromptSubmit firings -p ${r.fired.p} of ${r.due.p}, notification ${r.fired.notification} of ${r.due.notification}${r.missing.length ? ` (missing: ${r.missing.join(', ')})` : ''}; input keys -p ${JSON.stringify(keysOf(r.firings, 'p'))}, notification ${JSON.stringify(keysOf(r.firings, 'notification'))}; prompt heads ${JSON.stringify(r.views.map((v) => v.head))}; record readable at hook time ${JSON.stringify(r.views.map((v) => v.atHookTime))}; record after the run ${JSON.stringify(r.views.map((v) => v.afterRun))}`),
    ].map(scrub);
    const observed = { census: c, rows };
    const d = decide(observed);
    return { ...d, summary: scrub(d.summary), evidence, observed };
  },
};
