// Q9: in a running session, does an edit take effect without a restart for a
// skill reached through a Windows junction, for the hooks block of a project
// settings file, and for a hook's script file; and does ConfigChange fire for
// the settings edit?
//
// Two two-turn stream-json sessions. Between their turns this node process
// (never the session's own tools) edits files, waits for the watcher, then
// sends the next turn:
//   skills  --tools Skill. Two project skills, each a SKILL.md whose body holds
//           a random token: q9-real, a real folder (the control), and
//           q9-junction, a junction (mklink /J) to a folder outside
//           .claude/skills. Turn 1 invokes both. Then the real one is edited,
//           then the junction's TARGET file (the "edit the repo file behind
//           the junction" case), each followed by a wait for a new
//           ConfigChange (source skills) naming that skill's own file, capped
//           at 45 s, past the watcher's 30 s idle poll; turn 2 invokes both
//           again.
//   hooks   --tools Read. The project .claude/settings.json holds a
//           PostToolUse(Read) capture H1. The --settings file holds a constant
//           PostToolUse(Read) capture F (the control: a read ran and hooks
//           still fire), a PostToolUse(Read) hook running a script in the
//           workspace that captures under S1, and a ConfigChange capture.
//           Between turns the project file is rewritten to H2 and the script
//           to S2, then the probe waits for ConfigChange (30 s cap) plus 4 s.
//
// Instruments. A re-invoked skill whose content changed gets its full content
// appended again (skills.md, "Skill content lifecycle"), so the edited token
// inside an api-request-blob record of the transcript (a request body sent to
// the model) means the reloaded body reached the model; the model's reply is
// corroboration only. For hooks, the labels that fire on turn 2's read say
// which settings and which script were in force. --debug-file records the
// watchers' own lines, for diagnosis only; they decide nothing.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CAPTURE, arm, byLabel, canary, hook, readCaptures, readJsonl, runStream, scrubber, sleep, track, transcriptFrom, write } from '../lib.mjs';

const fwd = (p) => p.replace(/\\/g, '/');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Evidence must carry no machine paths or session ids. Workspace paths become
// their <name> first, so evidence still says which workspace a path is in;
// the probe's one lib scrubber then takes the home dir, other profiles and ids.
// Every naming runs before that scrubber: once it has turned a path into ~/...,
// no root matches it any more.
function naming(roots, scrub) {
  const res = roots.map(([p, name]) => [new RegExp(p.split(/[\\/]+/).map(escapeRe).join('[\\\\/]+'), 'gi'), name]);
  return (s) => {
    let t = String(s);
    for (const [re, name] of res) t = t.replace(re, () => name);
    return scrub(t);
  };
}

async function waitFor(pred, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred()) return Date.now() - t0;
    await sleep(500);
  }
  return null;
}

const skillMd = (name, token) => `---\nname: ${name}\ndescription: Probe skill for a hot-reload test. Invoke it when asked for the ${name} token.\n---\nThe ${name} token is ${token}. Reply with that token exactly.\n`;

// cmd's argv for the junction. /d ahead of /c: cmd then skips the Command
// Processor AutoRun commands the registry may hold, which would otherwise run
// in this process's env before mklink (cmd /?).
export const mklinkArgv = (link, target) => ['/d', '/c', 'mklink', '/J', link, target];

// How long each skills edit waits for its ConfigChange: past the watcher's
// 30 s idle poll.
const CC_WAIT_MS = 45_000;
// The path segments that tie a ConfigChange(skills) to one skill: the real
// folder's name; the junction's link name, or its target folder's in case the
// watcher reports the resolved path.
const JUNCTION_TARGET = 'junction-target';
const CC_DIRS = { real: ['q9-real'], junction: ['q9-junction', JUNCTION_TARGET] };

// The ConfigChange(skills) captures for one skill ('real' or 'junction'):
// those whose file_path runs through a folder CC_DIRS names for it. Each wait
// counts only its own skill's firings, so a second firing for the real skill
// can't end the junction's wait.
export function skillCCs(caps, skill) {
  const dirs = CC_DIRS[skill];
  if (!dirs) throw new Error(`skillCCs: no skill ${JSON.stringify(skill)}`);
  return byLabel(caps, 'CC').filter((c) => c.input?.source === 'skills' && String(c.input?.file_path ?? '').split(/[\\/]+/).some((seg) => dirs.includes(seg)));
}

// The junction's sub-verdict from what skillsArm returned: [verdict, why].
// Judged against the real-folder control, whose reload is what makes a
// junction miss a reading rather than a watcher that never reloads. The waits
// decide nothing; a CONTRADICTED carries them as the bound it was read under.
export function junctionVerdict(k) {
  if (!k.ok) return ['INCONCLUSIVE', k.why];
  if (k.s.results.length < 2) return ['INCONCLUSIVE', `the skills session ended after ${k.s.results.length} turn(s) (${k.s.why})`];
  if (!k.inv.real1 || !k.inv.junc1) return ['INCONCLUSIVE', 'the model did not invoke both skills on turn 1'];
  if (!k.reached.realA) return ['INCONCLUSIVE', "the real skill's turn-1 token never reached a request, so the instrument cannot see skill bodies"];
  if (!k.reached.juncA) return ['CONTRADICTED', 'the junctioned skill did not load at startup (its turn-1 token never reached the model)'];
  if (!k.inv.real2 || !k.inv.junc2) return ['INCONCLUSIVE', 'the model did not invoke both skills again on turn 2'];
  if (!k.reached.realB) return ['INCONCLUSIVE', 'the real-folder control did not hot-reload either, so a junction miss cannot be told from a watcher that never reloads'];
  if (k.reached.juncB) return ['VERIFIED', 'an edit to the junction target reached the model on re-invoke, as did the real-folder control'];
  const ms = (w) => (typeof w === 'number' ? `${w} ms` : `none within ${CC_WAIT_MS / 1000} s`);
  const control = `control ${ms(k.waits.real)}`;
  if (typeof k.waits.junction === 'number') return ['CONTRADICTED', `a ConfigChange behind the junction came ${k.waits.junction} ms after its edit (${control}), but its edit never reached the model`];
  return ['CONTRADICTED', `no ConfigChange behind the junction within ${CC_WAIT_MS / 1000} s (${control}), and its edit never reached the model`];
}

// Split a stream's messages at its first result: [turn 1, turn 2].
function turnsOf(messages) {
  const i = messages.findIndex((m) => m.type === 'result');
  return i < 0 ? [messages, []] : [messages.slice(0, i + 1), messages.slice(i + 1)];
}
const toolUses = (msgs, name) => msgs.filter((m) => m.type === 'assistant').flatMap((m) => (m.message?.content ?? []).filter((b) => b.type === 'tool_use' && b.name === name));
const toolResults = (msgs) => new Map(msgs.filter((m) => m.type === 'user').flatMap((m) => (Array.isArray(m.message?.content) ? m.message.content : []).filter((b) => b.type === 'tool_result').map((b) => [b.tool_use_id, typeof b.content === 'string' ? b.content : JSON.stringify(b.content)])));

const DEBUG_RE = /Watching for changes in skill\/command directories|Detected skill change|ConfigChange hook blocked|skillChangeDetector|\[skills\]|Settings changed from|Settings file .* is a symlink/;
function debugLines(out) {
  const f = path.join(out, 'debug.log');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter((l) => DEBUG_RE.test(l)).map((l) => l.replace(/^\S+\s+\[[A-Z]+\]\s*/, '').trim());
}

async function skillsArm(ctx, scrubIds) {
  const { ws, out } = arm(ctx, 'skills');
  const roots = [[ws, '<skills-ws>']];
  const scrub = naming(roots, scrubIds);
  const tok = { realA: canary('BODY-REAL-A'), realB: canary('BODY-REAL-B'), juncA: canary('BODY-JUNC-A'), juncB: canary('BODY-JUNC-B') };
  const realFile = write(path.join(ws, '.claude', 'skills', 'q9-real', 'SKILL.md'), skillMd('q9-real', tok.realA));
  const target = path.join(ws, 'targets', JUNCTION_TARGET);
  const targetFile = write(path.join(target, 'SKILL.md'), skillMd('q9-junction', tok.juncA));
  const link = path.join(ws, '.claude', 'skills', 'q9-junction');
  const mk = spawnSync('cmd', mklinkArgv(link, target), { encoding: 'utf8', shell: false, windowsHide: true });
  let junction;
  try {
    junction = { isLink: fs.lstatSync(link).isSymbolicLink(), target: fs.readlinkSync(link), readsThrough: fs.readFileSync(path.join(link, 'SKILL.md'), 'utf8').includes(tok.juncA) };
  } catch (e) {
    junction = { error: String(e.message || e) };
  }
  const made = { mklinkExit: mk.status, mklinkOut: scrub((mk.stdout || mk.stderr || '').trim()), ...junction, target: junction.target ? scrub(junction.target) : undefined };
  if (!junction.isLink || !junction.readsThrough) return { ok: false, why: `the junction could not be made: ${JSON.stringify(made)}`, made, roots };

  const settings = {
    hooks: {
      SessionStart: [{ hooks: [hook(out, 'ss')] }],
      PostToolUse: [{ matcher: 'Skill', hooks: [hook(out, 'post-skill')] }],
      ConfigChange: [{ hooks: [hook(out, 'CC')] }],
    },
  };
  const waits = {};
  let n1 = 0;
  const since = (skill) => skillCCs(readCaptures(out).slice(n1), skill).length;
  const s = await runStream({
    cwd: ws, out, settings, args: ['--tools', 'Skill', '--allowedTools', 'Skill', '--debug-file', fwd(path.join(out, 'debug.log'))],
    turns: [
      'Use the Skill tool to invoke the skill q9-real, then use the Skill tool to invoke the skill q9-junction. Each skill gives you a token. Reply with exactly two lines, `q9-real: <token>` and `q9-junction: <token>`.',
      async () => {
        n1 = readCaptures(out).length;
        fs.writeFileSync(realFile, skillMd('q9-real', tok.realB));
        waits.real = await waitFor(() => since('real') > 0, CC_WAIT_MS);
        const before = since('junction');
        fs.writeFileSync(targetFile, skillMd('q9-junction', tok.juncB));
        waits.junction = await waitFor(() => since('junction') > before, CC_WAIT_MS);
        await sleep(4000);
        return 'Both skills may have changed on disk since you ran them. Use the Skill tool again now to invoke q9-real, then use it again to invoke q9-junction: invoke both again even though you ran them before, and do not answer from memory. Reply with exactly two lines, `q9-real: <token>` and `q9-junction: <token>`, giving the token each skill gives you now, or `unchanged` for one the tool said was already loaded.';
      },
    ],
  });
  const caps = readCaptures(out);
  track(ctx, caps);
  const [t1, t2] = turnsOf(s.messages);
  const invoked = (msgs, name) => toolUses(msgs, 'Skill').filter((b) => JSON.stringify(b.input ?? {}).includes(name));
  const results2 = toolResults(t2);
  const transcript = readJsonl(transcriptFrom(caps));
  const blobs = transcript.filter((r) => r.type === 'api-request-blob');
  const pool = blobs.length ? blobs : transcript;
  const reached = Object.fromEntries(Object.entries(tok).map(([k, w]) => [k, pool.some((r) => JSON.stringify(r).includes(w))]));
  const carriers = Object.fromEntries(Object.entries(tok).map(([k, w]) => [k, [...new Set(transcript.filter((r) => JSON.stringify(r).includes(w)).map((r) => `${r.type}${r.attachment?.type ? `:${r.attachment.type}` : ''}`))]]));
  const reply2 = s.results[1]?.result ?? '';
  const ccs = byLabel(caps, 'CC').map((c) => ({ source: c.input?.source, file_path: c.input?.file_path ? scrub(c.input.file_path) : null }));
  return {
    ok: true, s, roots, made, waits, tok, blobs: blobs.length, transcriptRecords: transcript.length, reached, carriers, ccs,
    inv: {
      real1: invoked(t1, 'q9-real').length, junc1: invoked(t1, 'q9-junction').length,
      real2: invoked(t2, 'q9-real').length, junc2: invoked(t2, 'q9-junction').length,
    },
    turn2Results: {
      real: invoked(t2, 'q9-real').map((b) => scrub((results2.get(b.id) ?? '').slice(0, 160))),
      junc: invoked(t2, 'q9-junction').map((b) => scrub((results2.get(b.id) ?? '').slice(0, 160))),
    },
    replied: { realB: reply2.includes(tok.realB), juncB: reply2.includes(tok.juncB) },
    reply1: scrub((s.results[0]?.result ?? '').slice(0, 200)),
    reply2: scrub(reply2.slice(0, 200)),
    postSkill: byLabel(caps, 'post-skill').length,
    debug: debugLines(out).map(scrub),
  };
}

async function hooksArm(ctx, scrubIds) {
  const { ws, out } = arm(ctx, 'hooks');
  const roots = [[ws, '<hooks-ws>']];
  const scrub = naming(roots, scrubIds);
  write(path.join(ws, 'note1.txt'), 'first note\n');
  write(path.join(ws, 'note2.txt'), 'second note\n');
  const projectFile = path.join(ws, '.claude', 'settings.json');
  const projectSettings = (label) => JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'Read', hooks: [hook(out, label)] }] } }, null, 2);
  write(projectFile, projectSettings('H1'));
  const script = path.join(ws, 'hookscript.mjs');
  const scriptBody = (label) => `// Q9 probe hook script: runs capture.mjs under the label ${label}.\nprocess.argv.splice(2, 0, ${JSON.stringify(label)});\nawait import(${JSON.stringify(pathToFileURL(CAPTURE).href)});\n`;
  write(script, scriptBody('S1'));
  const settings = {
    hooks: {
      PostToolUse: [{ matcher: 'Read', hooks: [hook(out, 'F'), { type: 'command', command: 'node', args: [fwd(script)] }] }],
      ConfigChange: [{ hooks: [hook(out, 'CC')] }],
    },
  };
  let n1 = 0;
  let editAt = 0;
  const waits = {};
  const s = await runStream({
    cwd: ws, out, settings, args: ['--tools', 'Read', '--allowedTools', 'Read', '--debug-file', fwd(path.join(out, 'debug.log'))],
    turns: [
      'Use the Read tool to read note1.txt in the current directory, then reply with exactly the word DONE.',
      async () => {
        n1 = readCaptures(out).length;
        editAt = Date.now();
        fs.writeFileSync(projectFile, projectSettings('H2'));
        fs.writeFileSync(script, scriptBody('S2'));
        waits.configChange = await waitFor(() => byLabel(readCaptures(out).slice(n1), 'CC').some((c) => c.input?.source === 'project_settings'), 30_000);
        await sleep(4000);
        return 'Use the Read tool to read note2.txt in the current directory, then reply with exactly the word DONE.';
      },
    ],
  });
  const caps = readCaptures(out);
  track(ctx, caps);
  const [t1, t2] = turnsOf(s.messages);
  const pre = caps.slice(0, n1);
  const post = caps.slice(n1);
  const labels = (list) => list.filter((c) => c.input?.hook_event_name === 'PostToolUse').map((c) => c.label);
  const ccs = byLabel(post, 'CC').map((c) => ({ source: c.input?.source, file_path: c.input?.file_path ? scrub(c.input.file_path) : null, afterEditMs: Date.parse(c.at) - editAt }));
  return {
    s, roots, waits, pre: labels(pre), post: labels(post), ccs, preCC: byLabel(pre, 'CC').length,
    reads: [toolUses(t1, 'Read').length, toolUses(t2, 'Read').length],
    debug: debugLines(out).map(scrub),
  };
}

const NAMES = { junction: 'junctioned skill', settingsHooks: 'settings hooks block', hookScript: 'hook script', configChange: 'ConfigChange' };

// The verdict from the sub-verdicts ({key: [verdict, why]}): {verdict,
// summary}, unscrubbed. Any CONTRADICTED sub decides it; the PARTIAL left
// over says unsettledOnly when each open sub only couldn't see, never when
// one measured something else.
export function decide(sub) {
  const line = Object.entries(sub).map(([key, [v, why]]) => `${NAMES[key]} ${v} (${why})`).join('; ');
  const verdicts = Object.values(sub).map(([v]) => v);
  if (verdicts.includes('CONTRADICTED')) return { verdict: 'CONTRADICTED', summary: line };
  if (verdicts.every((v) => v === 'VERIFIED')) return { verdict: 'VERIFIED', summary: line };
  if (!verdicts.includes('VERIFIED')) return { verdict: 'INCONCLUSIVE', summary: line };
  const settled = Object.entries(sub).filter(([, [v]]) => v === 'VERIFIED').map(([key]) => NAMES[key]).join(', ');
  const open = verdicts.every((v) => ['VERIFIED', 'INCONCLUSIVE', 'BLOCKED'].includes(v));
  return { verdict: 'PARTIAL', summary: `settled: ${settled}; unsettled: ${line}`, ...(open ? { unsettledOnly: true } : {}) };
}

export default {
  id: 'Q9',
  question: 'In a running session, do edits to a junctioned skill, to a project settings hooks block and to a hook script take effect without a restart, and does ConfigChange fire for the settings edit?',
  assumption: 'In a running session, an edit to a skill reached through a Windows junction, an edit to the hooks block of a project settings file, and an edit to a hook script all take effect without a restart, and ConfigChange fires for the settings edit.',
  loadBearing: false,
  async run(ctx) {
    const sub = {};
    const evidence = [];
    const scrubIds = scrubber();

    // Skills: the junction, judged against the real-folder control.
    const k = await skillsArm(ctx, scrubIds);
    sub.junction = junctionVerdict(k);
    if (!k.ok) {
      evidence.push(`skills: ${k.why}`);
    } else {
      evidence.push(
        `skills junction: mklink exit ${k.made.mklinkExit}, lstat isSymbolicLink ${k.made.isLink}, readlink ${JSON.stringify(k.made.target)}, SKILL.md readable through the link ${k.made.readsThrough}`,
        `skills Skill calls: turn 1 q9-real ${k.inv.real1} q9-junction ${k.inv.junc1}; turn 2 q9-real ${k.inv.real2} q9-junction ${k.inv.junc2}; PostToolUse(Skill) firings ${k.postSkill}`,
        `skills tokens in ${k.blobs ? `an api-request-blob (${k.blobs} of ${k.transcriptRecords} records)` : `any transcript record (no api-request-blob among ${k.transcriptRecords})`}: real A ${k.reached.realA}, real B ${k.reached.realB}, junction A ${k.reached.juncA}, junction B ${k.reached.juncB}`,
        `skills transcript records carrying each token: ${JSON.stringify(k.carriers)}`,
        `skills waits after each edit for a new ConfigChange(skills) naming that skill's file, ms or null at the ${CC_WAIT_MS / 1000} s cap: real ${k.waits.real}, junction ${k.waits.junction}`,
        `skills ConfigChange firings (whole session): ${JSON.stringify(k.ccs)}`,
        `skills turn-2 Skill results: q9-real ${JSON.stringify(k.turn2Results.real)}; q9-junction ${JSON.stringify(k.turn2Results.junc)}`,
        `skills replies: turn 1 ${JSON.stringify(k.reply1)}; turn 2 ${JSON.stringify(k.reply2)} (repeats real B ${k.replied.realB}, junction B ${k.replied.juncB})`,
        `skills debug lines (${k.debug.length}): ${JSON.stringify(k.debug.slice(0, 12).map((l) => l.slice(0, 220)))}`,
        `skills stream: ${k.s.why}, ${k.s.results.length} results`,
      );
    }

    // Hooks: the project settings hooks block, the hook script, ConfigChange.
    const h = await hooksArm(ctx, scrubIds);
    evidence.push(
      `hooks Read calls: turn 1 ${h.reads[0]}, turn 2 ${h.reads[1]}`,
      `hooks PostToolUse labels before the edit ${JSON.stringify(h.pre)}, after it ${JSON.stringify(h.post)}`,
      `hooks wait for ConfigChange(project_settings) after the edit: ${h.waits.configChange === null || h.waits.configChange === undefined ? 'none within 30 s' : `${h.waits.configChange} ms`}, then 4 s`,
      `hooks ConfigChange firings after the edit: ${JSON.stringify(h.ccs)} (before it: ${h.preCC})`,
      `hooks debug lines (${h.debug.length}): ${JSON.stringify(h.debug.slice(0, 12).map((l) => l.slice(0, 220)))}`,
      `hooks stream: ${h.s.why}, ${h.s.results.length} results`,
    );
    const has = (list, l) => list.includes(l);
    if (h.s.results.length < 2) {
      const why = `the hooks session ended after ${h.s.results.length} turn(s) (${h.s.why})`;
      sub.settingsHooks = ['INCONCLUSIVE', why];
      sub.hookScript = ['INCONCLUSIVE', why];
      sub.configChange = ['INCONCLUSIVE', why];
    } else {
      const t1ok = has(h.pre, 'F');
      const t2ok = has(h.post, 'F');
      if (!t1ok || !has(h.pre, 'H1')) sub.settingsHooks = ['INCONCLUSIVE', 'the turn-1 read fired no H1 or no F capture'];
      else if (!t2ok) sub.settingsHooks = ['INCONCLUSIVE', 'turn 2 fired no F capture (no read ran, or hooks stopped)'];
      else if (has(h.post, 'H2') && !has(h.post, 'H1')) sub.settingsHooks = ['VERIFIED', 'turn 2 fired H2 and not H1'];
      else sub.settingsHooks = ['CONTRADICTED', `turn 2 fired ${['H1', 'H2'].filter((l) => has(h.post, l)).join(' and ') || 'neither H1 nor H2'}`];
      if (!t1ok || !has(h.pre, 'S1')) sub.hookScript = ['INCONCLUSIVE', 'the turn-1 read fired no S1 or no F capture'];
      else if (!t2ok) sub.hookScript = ['INCONCLUSIVE', 'turn 2 fired no F capture (no read ran, or hooks stopped)'];
      else if (has(h.post, 'S2') && !has(h.post, 'S1')) sub.hookScript = ['VERIFIED', 'turn 2 ran the edited script (S2), not the old one'];
      else sub.hookScript = ['CONTRADICTED', `turn 2 fired ${['S1', 'S2'].filter((l) => has(h.post, l)).join(' and ') || 'neither S1 nor S2'}`];
      const cc = h.ccs.find((c) => c.source === 'project_settings');
      if (cc) sub.configChange = ['VERIFIED', `ConfigChange fired with source project_settings, file_path ${JSON.stringify(cc.file_path)}, ${cc.afterEditMs} ms after the edit`];
      else sub.configChange = ['CONTRADICTED', `no ConfigChange with source project_settings after the edit (${h.ccs.length ? `saw ${JSON.stringify(h.ccs.map((c) => c.source))}` : 'none at all'}); the hooks edit ${has(h.post, 'H2') ? 'did' : 'did not'} take effect`];
    }

    const scrubAll = naming([...k.roots, ...h.roots], scrubIds);
    const observed = JSON.parse(scrubAll(JSON.stringify({ sub, skills: k.ok ? { made: k.made, inv: k.inv, reached: k.reached, waits: k.waits, ccs: k.ccs } : { made: k.made }, hooks: { pre: h.pre, post: h.post, ccs: h.ccs, waits: h.waits } })));
    const d = decide(sub);
    return { ...d, summary: scrubAll(d.summary), evidence: evidence.map(scrubAll), observed };
  },
};
