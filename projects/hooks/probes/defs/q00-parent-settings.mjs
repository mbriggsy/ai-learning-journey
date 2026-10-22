// Q0: does a session started in projects/the-back-nine load
// projects/.claude/settings.json or projects/.claude/settings.local.json?
//
// Two instruments. First a REPLICA of the monorepo's shape in a scratch
// workspace: a fresh git repo (no commit, so every file is untracked) with a
// SessionStart capture hook in each settings file a back-nine session could
// plausibly read:
//   repo/.claude/settings.json                               root-shared
//   repo/.claude/settings.local.json                         root-local (the git-root rule the docs skip on Windows)
//   repo/projects/.claude/settings.json                      parent-shared
//   repo/projects/.claude/settings.local.json                parent-local
//   repo/projects/the-back-nine/.claude/settings.json        child-shared (control: the project source loads)
//   repo/projects/the-back-nine/.claude/settings.local.json  child-local (control: the local source loads)
// One run starts in the-back-nine (the question). A second starts in
// projects/, the control for the parent files themselves: a file that loads
// nowhere proves nothing by not loading. A hook firing is the evidence.
//
// Then the REAL tree: one run at the monorepo's projects/the-back-nine with
// nothing written to the monorepo and every hook off: its --settings carries
// disableAllHooks, which outranks project and local settings (hooks.md,
// "Disable or remove hooks"), so no hook the real chain declares fires, today
// or once U3 adds the plan's probe hook there. Its --debug-file is the only
// observable. The replica's logs calibrate it. A "load kind" is a debug line's
// shape (timestamps, paths and numbers stripped) that names both child files
// in the back-nine replica run, names no replica file that didn't fire, and
// also names parent-local in the projects/ replica run, where it fired.
// A third replica run at the-back-nine carries the real run's disableAllHooks:
// no hook may fire in it (the flag would not protect the real tree), and its
// load kind must name exactly the files whose hooks fired with hooks on (else
// the real run's line, read with hooks off, says nothing about loading). The
// real run starts only when that run passed both, the replica logs gave a
// load kind, and the replica alone gave no verdict (realSkip): a session in
// the real tree whose reading can't be used is never started. The real
// back-nine settings.local.json exists, so it must show a load kind (the real
// arm's control); projects/.claude/settings*.json must not. Every run uses
// the real arm's flags, so the logs are comparable.
// Each real settings file ({exists, size, sha256}) and the names in
// the-back-nine/.claude are taken just before and just after the real run; a
// change reads INCONCLUSIVE and is left as found. Restoring it would be a
// second write to the live tree, over whatever a live session there saved
// meanwhile (approving a prompt writes settings.local.json), which can also
// be what changed it.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HERE, arm, failure, gitEnv, hook, readCaptures, runClaude, scrubber, sleep, track, write } from '../lib.mjs';

const PROMPT = 'Reply with the single word ok.';
const PROJECTS = path.resolve(HERE, '..', '..');
const MONOREPO = path.resolve(PROJECTS, '..');
const REAL_CWD = path.join(PROJECTS, 'the-back-nine');

// The real run's --settings, and the hooks-off replica run's that vouches for it.
const HOOKS_OFF = { disableAllHooks: true };

const fwd = (p) => p.replace(/\\/g, '/');
const norm = (s) => fwd(s).toLowerCase();
const flags = (debugFile) => ['--permission-mode', 'plan', '--disallowedTools', 'Edit,Write,Bash,PowerShell,NotebookEdit', '--no-session-persistence', '--tools', '', '--debug-file', fwd(debugFile)];

// Every git call runs with gitEnv: an outer GIT_DIR outranks -C, so
// rev-parse would name that repo and init would re-init it. Bounded, as
// run.mjs's own git calls are: the runner's ceiling is a timer, which can't
// fire while spawnSync holds the event loop. A timed-out call has status
// null, which reads as no repo.
const git = (args) => spawnSync('git', args, { env: gitEnv(), encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });

function gitTop(dir) {
  const r = git(['-C', dir, 'rev-parse', '--show-toplevel']);
  return r.status === 0 ? r.stdout.trim() : null;
}

const logLines = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean) : []);

// A debug line's shape: no timestamp, each absolute path one <P> (a list of
// them one <P...>), each number #.
function kind(line) {
  return fwd(line)
    .replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, '')
    .replace(/[a-z]:\/[^\s,'"`)\]}]*/gi, '<P>')
    .replace(/<P>(?:\s*,\s*<P>)+/g, '<P...>')
    .replace(/\d+/g, '#')
    .trim();
}
const mentions = (lines, file) => lines.filter((l) => norm(l).includes(norm(file)));
const kindsOf = (lines, file) => new Set(mentions(lines, file).map(kind));
const inter = (a, b) => new Set([...a].filter((x) => b.has(x)));

// Paths in evidence become tags, the longest first; lib's scrubber then takes
// the home dir, any other profile and the session ids.
function tagger(pairs) {
  const ids = scrubber();
  const list = pairs.map(([p, tag]) => [norm(p).replace(/\/+$/, ''), tag]).sort((x, y) => y[0].length - x[0].length);
  return (s) => {
    let o = fwd(String(s));
    for (const [p, tag] of list) o = o.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), () => tag);
    return ids(o);
  };
}

// Whether the real run goes, from the hooks-off replica run ({failed:
// failure() of it, fired: the hooks that fired, listed: the replica files its
// load line names}), which carries the real run's disableAllHooks, and from
// `calibrated` (the hooks-on replica logs gave a load kind). It goes only when
// its reading can stand: the hooks-off run finished cleanly and fired nothing
// (so the flag holds), a load kind exists (the real log is the real run's
// only observable), and the hooks-off line names exactly the files whose
// hooks fired with hooks on (`firedOn`), since a flag that changes what the
// line lists leaves the real line, read with hooks off, saying nothing about
// loading. {runReal, why}: why is null exactly when runReal is true.
export function hooksOff({ failed, fired, listed }, firedOn, calibrated) {
  if (failed) return { runReal: false, why: `the replica run with hooks off ${failed}, so nothing showed that disableAllHooks holds, and the real run was skipped` };
  if (fired.length) return { runReal: false, why: `a replica session with disableAllHooks in --settings still fired ${JSON.stringify(fired)}, so the real run was skipped (it would fire whatever hooks the real tree's settings declare)` };
  if (!calibrated) return { runReal: false, why: 'the replica logs gave no debug-line shape that tracks a loaded settings file, so the real run, whose log is its only observable, was skipped' };
  const want = JSON.stringify([...firedOn].sort());
  const got = JSON.stringify([...listed].sort());
  if (want !== got) return { runReal: false, why: `with hooks off, the replica's settings watcher line names ${got}, not the files whose hooks fired with hooks on (${want}), so the real run's line, also read with hooks off, would say nothing about what loads, and the real run was skipped` };
  return { runReal: true, why: null };
}

// One snapshot of the real tree's settings: each file's {exists, size,
// sha256} (sha256 null when it can't be read) and the sorted names in `dir`
// (the back-nine .claude folder), [] when there is none.
export function snapshot(files, dir) {
  const one = (f) => {
    let st;
    try { st = fs.statSync(f); } catch { return { exists: false, size: null, sha256: null }; }
    let sha256 = null;
    try { sha256 = createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch { /* locked, or a folder: size alone */ }
    return { exists: true, size: st.size, sha256 };
  };
  let names = [];
  try { names = fs.readdirSync(dir).sort(); } catch { /* no such folder */ }
  return { files: Object.fromEntries(Object.entries(files).map(([tag, f]) => [tag, one(f)])), names };
}

// What changed between two snapshots: each file tag that was created,
// deleted or rewritten, then each name added to or gone from the back-nine
// .claude folder. [] when nothing did.
export function changed(before, after) {
  const out = [];
  for (const [tag, b] of Object.entries(before.files)) {
    const a = after.files[tag] ?? { exists: false, size: null, sha256: null };
    if (b.exists !== a.exists) out.push(`${tag} ${a.exists ? 'created' : 'deleted'}`);
    else if (b.exists && (b.size !== a.size || b.sha256 !== a.sha256)) out.push(`${tag} rewritten`);
  }
  const was = new Set(before.names);
  const now = new Set(after.names);
  for (const n of after.names) if (!was.has(n)) out.push(`the-back-nine/.claude/${n} added`);
  for (const n of before.names) if (!now.has(n)) out.push(`the-back-nine/.claude/${n} removed`);
  return out;
}

// What the replica alone says, from gitOk (the replica is a repo rooted at
// repo/; a timed-out git reads as no repo) and firedB, firedP (the hooks that
// fired in the hooks-on replica runs at the-back-nine and at projects/):
// {verdict, summary}. The controls first (the instrument has to see a hook
// fire, and the parent files have to load somewhere), INCONCLUSIVE when one
// failed; CONTRADICTED when the replica itself deviates. verdict null: the
// replica holds, and summary is its reading, which a real-tree verdict
// builds on. A verdict here never reads the real tree.
export function replica({ gitOk, firedB: b, firedP: p }) {
  const firedB = new Set(b);
  const firedP = new Set(p);
  if (!gitOk) return { verdict: 'INCONCLUSIVE', summary: 'the replica is not a git repo rooted at repo/, so it does not reproduce the monorepo shape' };
  if (!firedB.has('child-local') || !firedB.has('child-shared')) return { verdict: 'INCONCLUSIVE', summary: `a back-nine control hook never fired in the replica (fired ${JSON.stringify(b)}), so a parent file not firing proves nothing` };
  if (!firedP.has('parent-local') && firedP.has('root-local')) return { verdict: 'CONTRADICTED', summary: 'in the replica, a session at projects/ read the git-root settings.local.json instead of projects/.claude/settings.local.json: the local file canonicalizes to the git root on Windows, so a hook there reaches no projects/ session' };
  if (!firedP.has('parent-local') || !firedP.has('parent-shared')) return { verdict: 'INCONCLUSIVE', summary: `a parent file did not load even in a session at projects/ (fired ${JSON.stringify(p)}), so its absence from a back-nine session proves nothing` };
  if (firedB.has('parent-local') || firedB.has('parent-shared')) return { verdict: 'CONTRADICTED', summary: `in the replica, a back-nine session loaded ${['parent-local', 'parent-shared'].filter((l) => firedB.has(l)).join(' and ')}: settings files are read from an ancestor of the cwd` };
  const rootNote = `git-root local file ${firedB.has('root-local') ? 'LOADED' : 'not loaded'} at the-back-nine, ${firedP.has('root-local') ? 'LOADED' : 'not loaded'} at projects/; git-root shared file ${firedB.has('root-shared') || firedP.has('root-shared') ? 'LOADED' : 'not loaded'}`;
  return { verdict: null, summary: `replica: a back-nine session loaded only ${JSON.stringify(b)}, a projects/ session loaded ${JSON.stringify(p)} (${rootNote})` };
}

// Why run() skips the real run, or null when it goes, from hooksOff()'s
// answer and replica()'s. It goes only when both clear it: a replica verdict
// is decide()'s answer whatever the real tree shows, so that session's
// reading would go unused. The replica's reason comes first, as decide()
// reads it first; a hooksOff() refusal with no reason still skips.
export function realSkip(off, rep) {
  const why = [
    rep.verdict && `the replica alone decides the verdict (${rep.verdict}: ${rep.summary}), so the real tree's reading would go unused`,
    !off.runReal && (off.why || 'the hooks-off check did not clear it'),
  ].filter(Boolean);
  return why.length ? why.join('; ') : null;
}

// The verdict from what run() measured: pure, so a test can plant it.
// gitOk, firedB, firedP: replica()'s inputs. hooksOff: hooksOff()'s answer.
// real: null when the real run was skipped, else {exit, ok, control,
// parentSeen (the projects/ files its load line names), canonNamesRoot,
// touched (changed()'s answer across it)}. Every deviation returns
// CONTRADICTED first, so the PARTIAL left (the real tree unread) says
// unsettledOnly.
export function decide({ gitOk, firedB, firedP, hooksOff: off, real }) {
  // A real tree that changed across the real run comes first: the run touched
  // the live tree, or read it while a live session wrote it, and nothing it
  // files may count as measured until a clean run.
  if (real?.touched?.length) return { verdict: 'INCONCLUSIVE', summary: `the real run changed ${real.touched.join('; ')}: either the CLI wrote the real tree from a -p session with no tools, or a live session there saved it meanwhile, so this run's reading of it is not trusted. It was left as found: restoring it would be a second write to the live tree, over whatever a live session saved there` };
  // The replica next, with no real tree needed (run() never starts the real
  // run when it decides).
  const rep = replica({ gitOk, firedB, firedP });
  if (rep.verdict) return { verdict: rep.verdict, summary: rep.summary };
  const replicaPart = rep.summary;

  // The real tree is read only once the flag is shown to hold, the logs give a
  // load kind the hooks-off run still shows (hooksOff() skipped the real run
  // otherwise), and the real run is clean with its own control seen.
  const why = off.why ? off.why
    : !real?.ok ? `the real run did not finish cleanly (exit ${real?.exit ?? null})`
      : !real.control ? 'the real back-nine settings.local.json, which exists, is absent from the calibrated line in the real log'
        : null;
  if (why) return { verdict: 'PARTIAL', summary: `${replicaPart}; the real tree is unconfirmed: ${why}`, unsettledOnly: true };
  if (real.parentSeen.length) return { verdict: 'CONTRADICTED', summary: `${replicaPart}; but on the real tree the settings watcher (the debug line that tracked loading in both replica runs) lists ${real.parentSeen.join(' and ')} (the replica and the real tree disagree)` };
  const canonNote = real.canonNamesRoot ? '; its "not canonicalizing" warning names the monorepo root, so the local file stays at the cwd' : '';
  return { verdict: 'VERIFIED', summary: `${replicaPart}; on the real tree, with every hook off (a replica run under the same flag fired none, and its watcher listed the same files), a back-nine session's settings watcher (the debug line that tracked loading in both replica runs) lists only the back-nine folder's own .claude/settings.json and settings.local.json, not projects/.claude/settings*.json${canonNote}` };
}

export default {
  id: 'Q0',
  question: 'Does a session whose cwd is projects/the-back-nine load projects/.claude/settings.json or projects/.claude/settings.local.json?',
  assumption: 'A session whose cwd is projects/the-back-nine loads neither projects/.claude/settings.json nor projects/.claude/settings.local.json, so a probe hook placed in projects/.claude/settings.local.json reaches only sessions whose cwd is projects/.',
  loadBearing: false,
  async run(ctx) {
    const { ws, out } = arm(ctx, 'replica');
    const scrub = tagger([[ws, '<replica-ws>'], [MONOREPO, '<monorepo>'], [os.tmpdir(), '<tmp>']]);
    const repo = path.join(ws, 'repo');
    const init = git(['init', '-q', repo]);
    const files = {
      'root-shared': path.join(repo, '.claude', 'settings.json'),
      'root-local': path.join(repo, '.claude', 'settings.local.json'),
      'parent-shared': path.join(repo, 'projects', '.claude', 'settings.json'),
      'parent-local': path.join(repo, 'projects', '.claude', 'settings.local.json'),
      'child-shared': path.join(repo, 'projects', 'the-back-nine', '.claude', 'settings.json'),
      'child-local': path.join(repo, 'projects', 'the-back-nine', '.claude', 'settings.local.json'),
    };
    for (const [label, f] of Object.entries(files)) write(f, JSON.stringify({ hooks: { SessionStart: [{ hooks: [hook(out, label)] }] } }, null, 2));
    const childCwd = path.join(repo, 'projects', 'the-back-nine');
    const parentCwd = path.join(repo, 'projects');
    const top = gitTop(childCwd);
    const gitOk = init.status === 0 && !!top && norm(top) === norm(fs.realpathSync.native(repo));

    // Two hooks-on runs, the replica's instrument, then one with the real
    // run's hooks-off settings, the check on the flag.
    const runs = {};
    const logs = {};
    for (const [name, cwd, settings] of [['at-back-nine', childCwd], ['at-projects', parentCwd], ['hooks-off', childCwd, HOOKS_OFF]]) {
      const o = path.join(out, name);
      fs.mkdirSync(o, { recursive: true });
      const dbg = path.join(o, 'debug.log');
      const res = runClaude({ cwd, out: o, prompt: PROMPT, settings, args: flags(dbg), timeoutMs: 180_000 });
      const caps = readCaptures(o);
      track(ctx, caps);
      logs[name] = logLines(dbg);
      runs[name] = { fired: [...new Set(caps.map((c) => c.label))].sort(), sources: [...new Set(caps.map((c) => c.input?.source))], exit: res.status, timedOut: res.timedOut, failed: failure(res), ms: res.ms, reply: (res.json?.result ?? '').slice(0, 60), logLines: logs[name].length };
      await sleep(1500);
    }

    // Calibration on the hooks-on replica logs.
    const rb = logs['at-back-nine'];
    const rp = logs['at-projects'];
    const ro = logs['hooks-off'];
    const firedB = new Set(runs['at-back-nine'].fired);
    const notFired = Object.keys(files).filter((l) => !firedB.has(l));
    let loadKinds = inter(kindsOf(rb, files['child-local']), kindsOf(rb, files['child-shared']));
    for (const l of notFired) for (const k of kindsOf(rb, files[l])) loadKinds.delete(k);
    loadKinds = inter(loadKinds, kindsOf(rp, files['parent-local']));
    const calibrated = loadKinds.size > 0;
    const replicaMentions = Object.fromEntries(Object.entries(files).map(([l, f]) => [l, { atBackNine: mentions(rb, f).length, atProjects: mentions(rp, f).length, hooksOff: mentions(ro, f).length }]));
    const offListed = Object.keys(files).filter((l) => inter(kindsOf(ro, files[l]), loadKinds).size > 0);
    const off = hooksOff({ ...runs['hooks-off'], listed: offListed }, runs['at-back-nine'].fired, calibrated);
    // The real run goes only when hooksOff() and the replica both clear it.
    const rep = replica({ gitOk, firedB: runs['at-back-nine'].fired, firedP: runs['at-projects'].fired });
    const skip = realSkip(off, rep);

    const realFiles = {
      'back-nine-local (control)': path.join(REAL_CWD, '.claude', 'settings.local.json'),
      'back-nine-shared': path.join(REAL_CWD, '.claude', 'settings.json'),
      'projects-local': path.join(PROJECTS, '.claude', 'settings.local.json'),
      'projects-shared': path.join(PROJECTS, '.claude', 'settings.json'),
      'root-local': path.join(MONOREPO, '.claude', 'settings.local.json'),
    };
    const realOut = path.join(ctx.out, 'real');
    const realDbg = path.join(realOut, 'debug.log');
    let realRes = null;
    let touched = null;
    if (!skip) {
      fs.mkdirSync(realOut, { recursive: true });
      // The tripwire, taken tight around the run. A change is reported and
      // never restored (see the header).
      const before = snapshot(realFiles, path.join(REAL_CWD, '.claude'));
      realRes = runClaude({ cwd: REAL_CWD, out: realOut, prompt: PROMPT, settings: HOOKS_OFF, args: flags(realDbg), timeoutMs: 180_000 });
      touched = changed(before, snapshot(realFiles, path.join(REAL_CWD, '.claude'))).map(scrub);
    }
    const realLog = logLines(realDbg);
    const realTop = gitTop(REAL_CWD);

    const realRows = Object.fromEntries(Object.entries(realFiles).map(([l, f]) => [l, { exists: fs.existsSync(f), linesNamingIt: mentions(realLog, f).length, loadKindSeen: inter(kindsOf(realLog, f), loadKinds).size > 0 }]));
    const realOk = !!realRes && realRes.status === 0 && typeof realRes.json?.result === 'string';

    // Context lines, deduplicated with their timestamps gone: the warning
    // repeats on every settings read, and the loader logs each MISSING
    // candidate file it tries (corroboration only; the verdict rests on the
    // hooks and the calibrated line).
    const uniq = (lines, test) => [...new Set(lines.filter(test).map((l) => scrub(l.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z?\s*/, '')).slice(0, 400)))];
    const canon = (lines) => uniq(lines, (l) => l.includes('not canonicalizing the consent store to')).map((l) => l.replace(/^.*?localSettings:/, 'localSettings:').slice(0, 200));
    const watch = (lines) => uniq(lines, (l) => l.includes('Watching for changes in setting files'));
    const missing = (lines) => uniq(lines, (l) => /missing file encountered for settings/i.test(l));
    const realCanon = canon(realLog);
    const observed = {
      replicaGit: { initExit: init.status, topIsRepo: gitOk },
      runs,
      replicaMentions,
      loadKinds: [...loadKinds].map((k) => scrub(k).slice(0, 240)),
      hooksOff: { listed: offListed, ...off },
      real: { ran: !!realRes, skipped: skip, exit: realRes?.status ?? null, timedOut: realRes?.timedOut ?? null, ms: realRes?.ms ?? null, reply: (realRes?.json?.result ?? '').slice(0, 60), gitRootIsMonorepo: !!realTop && norm(realTop) === norm(MONOREPO), logLines: realLog.length, files: realRows, touched },
      canonicalizing: { replicaAtBackNine: canon(rb), real: realCanon, countReal: realLog.filter((l) => l.includes('not canonicalizing the consent store to')).length },
      watcherLines: { replicaAtBackNine: watch(rb), replicaAtProjects: watch(rp), replicaHooksOff: watch(ro), real: watch(realLog) },
      realMissingCandidates: missing(realLog),
    };
    const rbRun = runs['at-back-nine'];
    const rpRun = runs['at-projects'];
    const roRun = runs['hooks-off'];
    const evidence = [
      `replica: git init exit ${init.status}; the back-nine folder's git top-level is repo/: ${gitOk}`,
      `replica run at the-back-nine: exit ${rbRun.exit} in ${rbRun.ms} ms, reply ${JSON.stringify(rbRun.reply)}, SessionStart sources ${JSON.stringify(rbRun.sources)}, hooks fired ${JSON.stringify(rbRun.fired)}`,
      `replica run at projects/: exit ${rpRun.exit} in ${rpRun.ms} ms, reply ${JSON.stringify(rpRun.reply)}, hooks fired ${JSON.stringify(rpRun.fired)}`,
      `replica run at the-back-nine with disableAllHooks in --settings (the real run's settings): exit ${roRun.exit} in ${roRun.ms} ms${roRun.failed ? ` (${roRun.failed})` : ''}, reply ${JSON.stringify(roRun.reply)}, hooks fired ${JSON.stringify(roRun.fired)}, files its calibrated line names ${JSON.stringify(offListed)}`,
      `replica debug-log lines naming each file (at-back-nine / at-projects / hooks off): ${Object.entries(replicaMentions).map(([l, m]) => `${l} ${m.atBackNine}/${m.atProjects}/${m.hooksOff}`).join(', ')}`,
      `calibrated load line (names exactly the files whose hooks fired, in both hooks-on replica runs): ${JSON.stringify(observed.loadKinds)}`,
      `settings watcher lines: replica at the-back-nine ${JSON.stringify(observed.watcherLines.replicaAtBackNine)}; replica at projects/ ${JSON.stringify(observed.watcherLines.replicaAtProjects)}; replica with hooks off ${JSON.stringify(observed.watcherLines.replicaHooksOff)}; real ${JSON.stringify(observed.watcherLines.real)}`,
      realRes
        ? `real run at the monorepo's projects/the-back-nine (disableAllHooks, nothing injected): exit ${realRes.status} in ${realRes.ms} ms, reply ${JSON.stringify(observed.real.reply)}, git root is the monorepo: ${observed.real.gitRootIsMonorepo}, ${realLog.length} debug lines`
        : `real run at the monorepo's projects/the-back-nine: skipped (${skip})`,
      ...(touched ? [`real tree across the real run (each real settings file's existence, size and sha256, and the names in the-back-nine/.claude): ${touched.length ? `CHANGED: ${touched.join('; ')}; left as found, never restored` : 'unchanged'}`] : []),
      `real files:${Object.entries(realRows).map(([l, r]) => `${l}: exists ${r.exists}, debug lines naming it ${r.linesNamingIt}, in the calibrated line ${r.loadKindSeen}`).join('; ')}`,
      `"not canonicalizing" warning (${observed.canonicalizing.countReal} times in the real log), unique forms: replica ${JSON.stringify(observed.canonicalizing.replicaAtBackNine)}; real ${JSON.stringify(realCanon)}`,
      `real log, missing settings candidates the loader tried: ${JSON.stringify(observed.realMissingCandidates)}`,
    ];

    const real = realRes && {
      exit: realRes.status,
      ok: realOk,
      control: realRows['back-nine-local (control)'].loadKindSeen,
      parentSeen: ['projects-local', 'projects-shared'].filter((l) => realRows[l].loadKindSeen),
      canonNamesRoot: realCanon.some((l) => l.includes('consent store to <monorepo> ')),
      touched,
    };
    return { ...decide({ gitOk, firedB: rbRun.fired, firedP: rpRun.fired, hooksOff: off, real }), evidence, observed };
  },
};
