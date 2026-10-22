// Q6: is a `once` hook removed after an exit-0 JSON block, compared with
// exit 2?
//
// The reference says `once` is honored only in skill frontmatter (ignored in
// settings files and agent frontmatter), and that a run which "blocks with
// exit code 2" stays registered while a successful run is removed. One
// session per arm, each asking for three reads of a file. In the skill arms
// the prompt first invokes a project skill whose frontmatter registers a
// PreToolUse hook on Read with once: true; the capture count says how many
// times that hook ran:
//   exit0-block   prints {"decision":"block"} JSON and exits 0
//   exit2         prints its reason on stderr and exits 2
//   pass          prints nothing, exits 0 (the control: a plain success)
//   settings      the pass hook's once: true, declared in the settings file
//                 instead, and no skill
// Every arm's settings file also holds a plain PreToolUse capture on Read
// (every: one per Read attempt, the count each once count is read against),
// a PostToolUse one (reads that ran) and a PreToolUse capture on Skill. The
// typed /skill fires no PreToolUse (README Finding 3), so a Skill capture is
// the model invoking the skill again through the tool, which registers its
// once hook afresh: that arm's count no longer says whether a run removed it.
// A Skill call the run lists in permission_denials never ran, so it
// registered nothing and leaves the count readable (2.1.307: both arms whose
// model made the call listed it there, and their once hooks still ran from
// the typed /skill).
import path from 'node:path';
import { arm, byLabel, canary, hook, readCaptures, runClaude, scrubber, sleep, track, write } from '../lib.mjs';

const READS = 'note.txt in the current directory with the Read tool three separate times, one call after another, even if a read is refused. Then reply with the single word finished.';
const PROMPT = (skill) => (skill ? `/${skill}\n\nAfter that, read ${READS}` : `Read ${READS}`);

function skillFile(name, hookEntry) {
  const yamlHook = [
    `name: ${name}`,
    'description: Probe Q6. Registers one PreToolUse hook. Invoke it when asked to.',
    'hooks:',
    '  PreToolUse:',
    '    - matcher: "Read"',
    '      hooks:',
    '        - type: command',
    `          command: ${JSON.stringify(hookEntry.command)}`,
    `          args: ${JSON.stringify(hookEntry.args)}`,
    '          once: true',
  ].join('\n');
  return `---\n${yamlHook}\n---\n\nThis skill only registers a hook. Reply with the single word armed.\n`;
}

// An arm's Skill-tool calls from its captures and the run's result JSON:
// {skillCalls, skillDenied}. A call is denied only when its tool_use_id is
// on the run's permission_denials list; with no list (a failed run) every
// call counts as one that ran.
export function skillUse(caps, json) {
  const denied = new Set((json?.permission_denials ?? [])
    .filter((d) => d?.tool_name === 'Skill' && typeof d.tool_use_id === 'string')
    .map((d) => d.tool_use_id));
  const calls = byLabel(caps, 'skill');
  return { skillCalls: calls.length, skillDenied: calls.filter((c) => denied.has(c.input?.tool_use_id)).length };
}

// The verdict from the arms' rows: {verdict, summary}. Q6 never returns
// PARTIAL. A skill arm whose once hook never ran on two or more Reads never
// registered it (registration comes before any run, and the arms differ only
// in what the hook prints), so its 0 says nothing about removal. A settings
// once hook that never ran is a measured deviation, so that arm stays out.
export function decide(rows) {
  const tooFew = Object.entries(rows).filter(([, r]) => r.every < 2).map(([k]) => k);
  if (tooFew.length) return { verdict: 'INCONCLUSIVE', summary: `fewer than two Read attempts in: ${tooFew.join(', ')}, so removal can't be seen` };
  const ranCalls = (r) => r.skillCalls - (r.skillDenied ?? 0);
  const again = Object.entries(rows).filter(([, r]) => r.where === 'skill' && ranCalls(r) > 0);
  if (again.length) return { verdict: 'INCONCLUSIVE', summary: `the model invoked the skill again through the Skill tool in ${again.map(([k, r]) => `${k} (${ranCalls(r)} call(s) that ran, ${r.turns ?? '?'} turns)`).join(', ')}, which registers its once hook afresh, so a once count there can't say whether a run removed it` };
  const unreg = Object.entries(rows).filter(([, r]) => r.where === 'skill' && r.once === 0).map(([k]) => k);
  if (unreg.length) return { verdict: 'INCONCLUSIVE', summary: `the skill's once hook never ran in ${unreg.join(', ')}, so it was never registered (was the skill invoked?)` };
  const removedAfterJsonBlock = rows['exit0-block'].once === 1;
  const keptAfterExit2 = rows.exit2.once === rows.exit2.every;
  const removedAfterPass = rows.pass.once === 1;
  const ignoredInSettings = rows.settings.once === rows.settings.every;
  const summary = `exit-0 JSON block: ${removedAfterJsonBlock ? 'removed after one run' : `ran ${rows['exit0-block'].once} times`}; exit 2: ${keptAfterExit2 ? 'kept, ran on every Read' : `ran ${rows.exit2.once} of ${rows.exit2.every}`}; plain success: ${removedAfterPass ? 'removed' : `ran ${rows.pass.once} times`}; in a settings file: ${ignoredInSettings ? 'once ignored, ran every time' : `ran ${rows.settings.once} of ${rows.settings.every}`}`;
  const ok = removedAfterJsonBlock && keptAfterExit2 && removedAfterPass && ignoredInSettings;
  return { verdict: ok ? 'VERIFIED' : 'CONTRADICTED', summary };
}

export default {
  id: 'Q6',
  question: 'Is a `once` hook removed after an exit-0 JSON block, compared with exit 2?',
  assumption: 'A skill-frontmatter hook with once: true is removed after a run that exits 0 (a JSON block included) and stays after an exit-2 block; once is ignored in a settings file.',
  loadBearing: false,
  async run(ctx) {
    // A reply can quote an exit-2 hook error, which names the capture command
    // line and its paths.
    const scrub = scrubber();
    const rows = {};
    const arms = [
      ['exit0-block', 'skill', { respond: { decision: 'block', reason: canary('ONCE-JSON') } }],
      ['exit2', 'skill', { stderr: canary('ONCE-EXIT2'), exit: 2 }],
      ['pass', 'skill', {}],
      ['settings', 'settings', {}],
    ];
    for (const [name, where, opts] of arms) {
      const { ws, out } = arm(ctx, name);
      write(path.join(ws, 'note.txt'), 'note\n');
      const once = hook(out, 'once', opts);
      const skill = where === 'skill' ? `probe-q6-${name}` : null;
      if (skill) write(path.join(ws, '.claude', 'skills', skill, 'SKILL.md'), skillFile(skill, once));
      const settings = {
        hooks: {
          PreToolUse: [{ matcher: 'Read', hooks: [hook(out, 'every')] }, { matcher: 'Skill', hooks: [hook(out, 'skill')] }, ...(skill ? [] : [{ matcher: 'Read', hooks: [{ ...once, once: true }] }])],
          PostToolUse: [{ matcher: 'Read', hooks: [hook(out, 'post')] }],
        },
      };
      const res = runClaude({ cwd: ws, out, prompt: PROMPT(skill), settings, args: ['--tools', skill ? 'Read,Skill' : 'Read'] });
      const caps = readCaptures(out);
      track(ctx, caps);
      rows[name] = {
        where, once: byLabel(caps, 'once').length, every: byLabel(caps, 'every').length, ran: byLabel(caps, 'post').length,
        ...skillUse(caps, res.json), turns: res.json?.num_turns ?? null, models: Object.keys(res.json?.modelUsage ?? {}),
        exit: res.status, reply: scrub((res.json?.result ?? '').slice(0, 100)),
      };
      await sleep(1500);
    }
    const evidence = Object.entries(rows).map(([k, r]) => `${k}: once-hook runs ${r.once}, Read attempts (the every hook) ${r.every}, reads that ran ${r.ran}, Skill-tool calls ${r.skillCalls} (denied, never ran: ${r.skillDenied}), turns ${r.turns}, models ${JSON.stringify(r.models)}, exit ${r.exit}, reply ${JSON.stringify(r.reply)}`);
    return { ...decide(rows), evidence, observed: rows };
  },
};
