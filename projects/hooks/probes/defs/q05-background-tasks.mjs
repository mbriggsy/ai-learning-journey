// Q5: what does Stop's background_tasks hold while background work runs, and
// when nothing does?
//
// Three headless runs, each with a Stop capture, a UserPromptSubmit capture
// (a finished background task can start a new turn, and that turn's origin is
// Q14's business) and a PostToolUse capture on the run's one tool:
//   idle        "reply ok": nothing in flight
//   shell       node wait.js (45 s of waiting) started with run_in_background;
//               a pattern rule allows exactly that command, not all of Bash
//   workflow    a Workflow launched in the background, its one agent slow
// The first Stop of each run is the one that matters: it fires as the turn
// that started the work ends.
//
// Control, from outside background_tasks: the work really was in flight at
// that Stop. The launch call's own response names a background task (Bash's
// backgroundTaskId, the Workflow tool's async_launched taskId, on 2.1.306),
// read from the PostToolUse capture or the transcript's record of that
// response, and that task's task-notification, the transcript's record that
// it ended, was queued after the Stop or never. A model that ran the command in the
// foreground, or a task that ended first, leaves that arm unsettled, never a
// contradiction.
import path from 'node:path';
import { arm, byLabel, hook, readCaptures, readJsonl, runClaude, scrubber, sleep, track, transcriptFrom, write } from '../lib.mjs';

// The shell arm's background command, a file in its workspace. The prompt
// sets the command off from its sentence with a space: an exact rule denies
// a command that keeps a trailing period, which would leave the arm unsettled.
const WAIT = 'setTimeout(() => {}, 45000);\n';
const SHELL_PROMPT = 'Run this exact command with the Bash tool, with run_in_background set to true: node wait.js . Do not wait for it, check it, or stop it. Then reply with the single word started.';
const WORKFLOW_SCRIPT = [
  "export const meta = { name: 'probe-q5-background', description: 'Q5 probe: one slow agent' }",
  "return await agent('Write the numbers from one to one hundred and fifty in English words, separated by commas. Use no tools.')",
].join('\n');
const WORKFLOW_PROMPT = `Run a workflow now with the Workflow tool, passing exactly this script as the script parameter (I am explicitly asking for a workflow):\n\n${WORKFLOW_SCRIPT}\n\nOnce it has launched, do not wait for it or check on it: reply with the single word launched.`;

// Each arm's one tool (also its PostToolUse matcher), the rule that allows
// it, and the task type its launch should list.
const ARMS = [
  { name: 'idle', prompt: 'Reply with the single word ok.', tools: 'Read', allow: 'Read', kind: null },
  { name: 'shell', prompt: SHELL_PROMPT, tools: 'Bash', allow: 'Bash(node wait.js)', kind: 'shell' },
  { name: 'workflow', prompt: WORKFLOW_PROMPT, tools: 'Workflow', allow: 'Workflow', kind: 'workflow' },
];

// The background task a launch call's response names, or null.
const launchedId = (r) => r?.backgroundTaskId ?? (r?.status === 'async_launched' ? r.taskId : null) ?? null;

// When the task ended: the earliest record of its task-notification (queued
// in the transcript, or the turn it started), or null if none came.
function endedAt(records, caps, id) {
  const tag = `<task-id>${id}</task-id>`;
  const times = [
    ...records.filter((r) => (r.type === 'queue-operation' || r.type === 'user') && JSON.stringify(r.content ?? r.message?.content ?? '').includes(tag)).map((r) => Date.parse(r.timestamp)),
    ...byLabel(caps, 'ups').filter((c) => String(c.input?.prompt ?? '').includes(tag)).map((c) => Date.parse(c.at)),
  ].filter(Number.isFinite);
  return times.length ? Math.min(...times) : null;
}

// The verdict from the rows run() builds, one per arm: pure, so a test can
// plant them. Any wrong reading returns CONTRADICTED before a PARTIAL can, so
// a PARTIAL's only open arms are unsettled ones: it says unsettledOnly.
export function decide(rows) {
  const first = (k) => rows[k].stops[0];
  if (!first('idle')) return { verdict: 'INCONCLUSIVE', summary: 'the idle run fired no Stop hook' };
  const idleOk = first('idle').present && Array.isArray(first('idle').tasks) && first('idle').tasks.length === 0;

  // Each launch arm: settled when its task was in flight at the first Stop,
  // then listed with its type or not; unsettled otherwise.
  const wrong = idleOk ? [] : [`idle: ${JSON.stringify(first('idle'))}`];
  const unsettled = [];
  const parts = [`idle: ${idleOk ? 'present and empty' : JSON.stringify(first('idle'))}`];
  for (const k of ['shell', 'workflow']) {
    const r = rows[k];
    const tasks = Array.isArray(first(k)?.tasks) ? first(k).tasks : [];
    const t = tasks.find((x) => x.id === r.taskId) ?? tasks.find((x) => x.type === r.kind) ?? null;
    const why = !first(k) ? 'the run fired no Stop hook'
      : !r.taskId ? 'the launch never went to the background (its tool response named no background task)'
        : !r.inFlight ? `the task had ended ${-r.endedAfterStopMs} ms before the first Stop, so nothing was in flight`
          : null;
    if (why) unsettled.push(`${k}: ${why}`);
    else if (t?.type !== r.kind) wrong.push(`${k}: in flight at the first Stop but ${t ? `listed with type ${JSON.stringify(t.type)}` : 'not listed'}`);
    const named = k === 'shell' ? `command ${JSON.stringify((t?.command ?? '').slice(0, 60))}` : `name ${JSON.stringify(t?.name)}`;
    parts.push(`${k}: ${why ? 'unsettled' : t ? `listed (${t.status}, ${named}, the launch's task id ${t.id === r.taskId})` : 'not listed'}`);
  }
  const summary = parts.join('; ');
  if (wrong.length) return { verdict: 'CONTRADICTED', summary: `${wrong.join('; ')}; ${summary}` };
  if (unsettled.length === 2) return { verdict: 'INCONCLUSIVE', summary: `${unsettled.join('; ')}; ${summary}` };
  if (unsettled.length) return { verdict: 'PARTIAL', summary: `${summary}; unsettled: ${unsettled.join('; ')}`, unsettledOnly: true };
  return { verdict: 'VERIFIED', summary };
}

export default {
  id: 'Q5',
  question: 'What does the Stop input\'s background_tasks contain while a background run is going, and when nothing is running?',
  assumption: 'At Stop, background_tasks is present and empty when nothing runs, and lists each in-flight shell or workflow task (with its type) while one runs.',
  loadBearing: true,
  async run(ctx) {
    const scrub = scrubber();
    const rows = {};
    for (const { name, prompt, tools, allow, kind } of ARMS) {
      const { ws, out } = arm(ctx, name);
      if (kind === 'shell') write(path.join(ws, 'wait.js'), WAIT);
      const settings = { hooks: { Stop: [{ hooks: [hook(out, 'stop')] }], UserPromptSubmit: [{ hooks: [hook(out, 'ups')] }], PostToolUse: [{ matcher: tools, hooks: [hook(out, 'post')] }] } };
      const res = runClaude({ cwd: ws, out, prompt, settings, args: ['--tools', tools, '--allowedTools', allow] });
      const caps = readCaptures(out);
      track(ctx, caps);
      const stopCaps = byLabel(caps, 'stop');
      const stops = stopCaps.map((c) => ({ present: 'background_tasks' in c.input, tasks: c.input.background_tasks ?? null, crons: c.input.session_crons ?? null }));
      const records = readJsonl(transcriptFrom(caps));
      const responses = [...byLabel(caps, 'post').map((c) => c.input?.tool_response), ...records.filter((r) => r.type === 'user').map((r) => r.toolUseResult)];
      const taskId = kind ? responses.map(launchedId).find(Boolean) ?? null : null;
      const ended = taskId ? endedAt(records, caps, taskId) : null;
      const stopAt = stopCaps[0] ? Date.parse(stopCaps[0].at) : null;
      rows[name] = {
        kind, stops, taskId, inFlight: !!taskId && stopAt !== null && (ended === null || ended > stopAt),
        endedAfterStopMs: ended !== null && stopAt !== null ? ended - stopAt : null,
        prompts: byLabel(caps, 'ups').length, reply: scrub((res.json?.result ?? '').slice(0, 120)), ms: res.ms, exit: res.status,
      };
      await sleep(1500);
    }
    const evidence = Object.entries(rows).map(([k, r]) => scrub(`${k}: exit ${r.exit} in ${r.ms} ms, ${r.prompts} prompt(s), reply ${JSON.stringify(r.reply)}${r.kind ? `, launch response named background task ${JSON.stringify(r.taskId)}, its task-notification ${r.endedAfterStopMs === null ? 'never came' : `came ${r.endedAfterStopMs} ms after the first Stop`}` : ''}, Stop firings ${JSON.stringify(r.stops)}`));
    const d = decide(rows);
    return { ...d, summary: scrub(d.summary), evidence, observed: rows };
  },
};
