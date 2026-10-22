#!/usr/bin/env node
// install-git-hooks.mjs: put the leak gate (tools/pre-push-leak.mjs, D8 of
// U3) in a repo's pre-push hook, or take it out again.
//
//   node install-git-hooks.mjs [--repo <dir>]                    say what it would do
//   node install-git-hooks.mjs [--repo <dir>] --go               install it (or upgrade
//                                                                an earlier version's hook)
//   node install-git-hooks.mjs [--repo <dir>] --uninstall [--go] remove it
//
// Without --go it changes nothing: it prints what it would do and exits with
// the code that action would have. --repo defaults to the repo this file sits
// in (the monorepo). Installing into the real monorepo waits for Briggsy's
// word (U3, "Live application", step 8); tests install into temp repos only.
//
// What the hook runs: the gate as HEAD commits it, never the work tree's
// copy. Every session shares one work tree, so a gate run from it would run
// whatever a session is halfway through editing: a syntax error there would
// refuse every clean push, and a rule weakened there would pass a leak. At
// each push the hook extracts the whole GATE_ROOT folder (projects/hooks)
// from HEAD (`git archive` to a file, then `tar -xf`: two steps) into a fresh
// `mktemp -d` folder, runs that copy of the gate (GATE_ENTRY) with git's
// arguments and stdin from the work tree's top (where git runs a hook, and
// where the gate finds the repo), and removes the folder on every way out
// (an EXIT trap; HUP, INT and TERM exit through it). HEAD, not the remote's
// main: a committed fix to a false positive applies to the very push that
// carries it.
//
// Why the whole folder and not a list of the gate's files: a list baked into
// the hook goes stale the day the gate gains an import. The installed hook
// would then extract too few files, and every push would fail closed until
// someone reinstalled it. The folder holds any file the gate will ever
// import, so the hook never needs changing for one; a test checks that every
// file the gate imports, transitively, sits inside GATE_ROOT, and that it
// imports nothing else but node's own modules. The folder is cheap: measured
// 2026-10-22 at the monorepo's HEAD, `git archive` of it took 0.26 s and
// wrote 942 KB. The hook runs on every push, so it follows the committed
// gate, rules and scope with no reinstall.
//
// The temp folder goes in TMPDIR, as mktemp's own default does, and falls
// back to /tmp when mktemp can't make it there: TMPDIR names a folder that
// no longer exists, or a plain file, or one it can't write. Without the
// fallback, a stale TMPDIR would refuse every push, Back Nine's included.
// The first try's complaint is dropped, since the fallback answers it; if
// /tmp fails too, mktemp's own message and the hook's are both shown.
//
// It fails closed by name, the same way the gate does, when no temp folder
// can be made, git archive fails (HEAD has no projects/hooks), tar fails,
// or the unpacked folder has no GATE_ENTRY (a repo where the gate isn't
// committed). One way tar fails: a symlink committed under GATE_ROOT. Git
// Bash's tar, without the right to make symlinks, can't unpack one (measured
// below), so every push from Windows would be refused; a test keeps symlinks
// out of the folder. One way the gate goes missing: git archive obeys the
// export-ignore and export-subst attributes (from HEAD's .gitattributes
// files, .git/info/attributes and the global attributes file), so an
// export-ignore on GATE_ROOT, on any folder above or inside it, or on a gate
// file would drop files from the copy, and export-subst would rewrite a
// file's text (measured 2026-10-22: a folder's export-ignore drops all of
// it, though check-attr on a file inside reads unspecified). A test keeps
// both attributes off every path under GATE_ROOT, and off the folders above.
//
// Measured 2026-10-22 on Windows (git 2.53.0.windows.1 started as
// cmd\git.exe, the git on PATH; node 24.13.1), in a hook git ran for a push:
// sh is Git's /usr/bin/sh (bash 5.2.37); tar is GNU tar 1.35 from /usr/bin,
// not Windows' own tar.exe; mktemp is /usr/bin/mktemp; TMPDIR set by the
// parent as a Windows path arrives converted (/tmp/...), and mktemp honors
// it; a TMPDIR naming a missing folder or a plain file fails mktemp there,
// and the fallback makes the folder in /tmp, which Git Bash mounts at the
// user's %TEMP%; a stub mktemp first on PATH is the one the hook runs (git
// puts only its own libexec folder ahead of it); `git archive --format=tar
// HEAD -- <path>` exits 0, for a file or a folder, and a path HEAD lacks
// exits 128 ("pathspec ... did not match any files") having written 0
// bytes; tar unpacks git's pax header without leaving a file for it, and
// refuses a symlink entry ("Cannot create symlink", exit 2) but makes a
// submodule's empty folder; node is handed the temp copy's path converted to
// C:\..., and the hook's stdin reaches it whole; rm -rf leaves nothing. The
// mktemp lines, run alone, behave the same under Git Bash's dash. Linux (the
// CI runner) has dash as sh and GNU tar and mktemp. git archive applies the
// checkout conversions (eol, filters) the repo's attributes name; none
// touches how node reads JS.
//
// Which hook is this tool's own: a file whose bytes are exactly HOOK_TEXT
// (this version's hook) or exactly one of PRIOR_HOOK_TEXTS (an earlier
// version's). --go replaces an earlier version's hook with this one, by the
// same atomic write as an install, and --uninstall removes either. Anything
// else at the hook path is refused by name and left as it was, by --go and
// by --uninstall: a hook someone else wrote (no marker line), and one that
// carries the marker but other text (this tool's hook with someone's own
// lines added or changed, or a version PRIOR_HOOK_TEXTS doesn't list), since
// replacing or removing that could drop what someone added. Installing the
// same text again writes nothing.
//
// Where the hook goes: the hooks folder of the repo's common git dir, which
// is where git looks (a linked worktree shares it; measured on git 2.53:
// `rev-parse --git-path hooks` in a worktree names the main .git/hooks). When
// core.hooksPath sends git to a different folder, git would never run a hook
// in .git/hooks, so install refuses rather than report a gate that never
// fires; that folder can be shared by every repo on the machine, so this tool
// doesn't write into it. A core.hooksPath that names .git/hooks itself (the
// monorepo's local config does) changes nothing and is accepted.
//
// The hook runs `node` from PATH; a missing node makes the hook fail, and a
// failing pre-push hook refuses the push (closed, not open). The file is
// written with LF line endings and mode 755: sh reads "#!/bin/sh\r" as no
// shell at all, and Linux runs only an executable hook. The write is a temp
// file in the hooks folder renamed over the target.
//
// Exit codes: 0 done, would do, or nothing to do; 1 internal error; 2 refused
// (a hook that isn't exactly one this tool writes or wrote, core.hooksPath
// naming another folder, not a work tree, bad arguments).

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitEnv } from '../tests/leak.mjs';

export const MARKER = '# installed by projects/hooks/tools/install-git-hooks.mjs (U3 D8)';

// The folder the hook extracts from HEAD, as a path from the repo's top, and
// the gate inside it, which the hook runs. The hook quotes both; a test
// checks neither holds a space, a quote or a glob character all the same.
export const GATE_ROOT = 'projects/hooks';
export const GATE_ENTRY = `${GATE_ROOT}/tools/pre-push-leak.mjs`;

// A template literal: \${ and \` keep the shell's own, and \\ writes one
// backslash. The fail() text matches the gate's own internal-error message.
export const HOOK_TEXT = `#!/bin/sh
${MARKER}
# Runs the leak gate as HEAD commits it, from a temp copy of HEAD's
# ${GATE_ROOT}: never the work tree's files, which a session may be halfway
# through editing.
fail() {
  printf 'pre-push leak gate: internal error: %s\\n' "$1" >&2
  printf '%s\\n' 'The push is refused: this gate guards a public repo, so an error fails closed.' \\
    '\`git push --no-verify\` skips the gate. Use it only knowingly, after checking the pushed commits yourself.' >&2
  exit 1
}
# In TMPDIR, or in /tmp when TMPDIR is unset or can't take a folder: a stale
# TMPDIR must not refuse every push.
tmp=$(mktemp -d "\${TMPDIR:-/tmp}/pre-push-leak.XXXXXX" 2>/dev/null) ||
  tmp=$(mktemp -d /tmp/pre-push-leak.XXXXXX) ||
  fail 'could not make a temp folder for the gate (mktemp, in $TMPDIR and in /tmp)'
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' HUP INT TERM
git archive --format=tar HEAD -- '${GATE_ROOT}' </dev/null >"$tmp/gate.tar" || fail "could not read the gate's folder from HEAD (git archive HEAD -- ${GATE_ROOT})"
(cd "$tmp" && tar -xf gate.tar) </dev/null || fail "could not unpack the gate's folder from HEAD (tar)"
[ -f "$tmp/${GATE_ENTRY}" ] || fail "HEAD has no ${GATE_ENTRY}: the gate is not committed"
node "$tmp/${GATE_ENTRY}" "$@"
status=$?
exit "$status"
`;

// The exact texts of the hooks earlier versions of this tool wrote, byte for
// byte: --go upgrades such a hook to HOOK_TEXT and --uninstall removes it,
// where any other text with the marker is refused. Whenever HOOK_TEXT
// changes, append the old HOOK_TEXT here: it is what a repo already has
// installed, and without it the new version refuses to touch the old hook,
// leaving a delete by hand as the only way forward. Then run --go on the
// monorepo before pushing, and keep the old GATE_ROOT and GATE_ENTRY paths
// in HEAD until it has: the old hook archives and runs them, so moving
// either first refuses every push. tests/pre-push-leak.test.mjs pins
// HOOK_TEXT's sha256, so a change to it (or to MARKER, GATE_ROOT or
// GATE_ENTRY, which it bakes in) fails there, naming these steps, until the
// pin is updated; its other checks accept any entry here that has the
// marker and isn't HOOK_TEXT. Empty today, although
// HOOK_TEXT changed in U3's review rounds (round 1 made it run HEAD's copy
// of the gate, round 2 added the mktemp fallback): no version of this hook
// was ever installed on a real repo (the first install waits for U3's live
// step 8), so no repo holds an older text to upgrade, and listing those
// drafts would only let --go claim hooks nobody installed. Not frozen,
// because tests/pre-push-leak.test.mjs plants an older text in it, in its
// own process, to show the upgrade and the removal, and takes it out again;
// nothing else writes to it.
export const PRIOR_HOOK_TEXTS = [];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE = 'usage: node install-git-hooks.mjs [--repo <dir>] [--uninstall] [--go]';

class Refused extends Error {}

// git in `dir`, from an argv array, with git's location variables dropped
// and no optional lock taken (leak.mjs gitEnv). Returns {status, out, err}.
function git(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env: gitEnv(), shell: false, windowsHide: true });
  if (r.error) throw new Error(`git ${args[0]}: ${r.error.message}`);
  if (r.status === null) throw new Error(`git ${args[0]} was killed (${r.signal})`);
  return { status: r.status, out: r.stdout.trim(), err: r.stderr.trim() };
}

function parseArgs(argv) {
  const opts = { repo: null, uninstall: false, go: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--go') opts.go = true;
    else if (a === '--uninstall') opts.uninstall = true;
    else if (a === '--repo' && i + 1 < argv.length) opts.repo = argv[++i];
    else throw new Refused(`unknown or incomplete argument "${a}"\n${USAGE}`);
  }
  return opts;
}

// One file or folder, however it is spelled: git prints forward slashes on
// Windows, a config value may hold backslashes, and Windows paths are
// case-blind.
function samePath(a, b) {
  const norm = (p) => {
    let full = path.resolve(p);
    try { full = fs.realpathSync.native(full); } catch { /* not created yet */ }
    return process.platform === 'win32' ? full.toLowerCase() : full;
  };
  return norm(a) === norm(b);
}

// {hookFile, elsewhere}: the hook file this tool manages (in the common git
// dir's hooks folder) and, when core.hooksPath sends git to a different
// folder, that folder (else null). `rev-parse --git-path hooks` names the
// folder git really runs hooks from (measured on git 2.53: it follows
// core.hooksPath). A core.hooksPath naming the default folder itself is no
// detour: the monorepo's own .git/config sets exactly that (measured
// 2026-10-21, local scope), and git then runs the hook this tool writes.
function locate(repo) {
  // A bare repo has no work tree to run the hook from: git 2.53 refuses
  // --show-toplevel there, and an older git printed an empty line.
  const top = git(repo, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0 || top.out === '') throw new Refused(`${repo} is not inside a git work tree (${top.err || 'no top level'})`);
  const r = git(top.out, ['rev-parse', '--path-format=absolute', '--git-common-dir', '--git-path', 'hooks']);
  const [common, gitLooks] = r.out.split('\n').map((s) => s.trim());
  if (r.status !== 0 || !common || !gitLooks) throw new Error(`git rev-parse --git-common-dir --git-path hooks failed: ${r.err}`);
  const ours = path.join(common, 'hooks');
  return { hookFile: path.join(ours, 'pre-push'), elsewhere: samePath(ours, gitLooks) ? null : gitLooks };
}

// What is at the hook path now: 'absent'; 'same' (its bytes are exactly
// HOOK_TEXT); 'prior' (its bytes are exactly one of PRIOR_HOOK_TEXTS, an
// earlier version of this tool's hook); 'marked' (a file with the marker
// line but other text: lines added or changed, or a version not listed); or
// 'foreign' (anything else, a folder or a link included). Only 'absent',
// 'same' and 'prior' are ever written over or removed. PRIOR_HOOK_TEXTS is
// read at each call, so a text a test plants counts.
function inspect(file) {
  let st;
  try {
    st = fs.lstatSync(file);
  } catch (e) {
    if (e.code === 'ENOENT') return 'absent';
    throw e;
  }
  if (!st.isFile()) return 'foreign';
  const bytes = fs.readFileSync(file);
  if (bytes.equals(Buffer.from(HOOK_TEXT, 'utf8'))) return 'same';
  if (PRIOR_HOOK_TEXTS.some((t) => bytes.equals(Buffer.from(t, 'utf8')))) return 'prior';
  return bytes.toString('utf8').split(/\r?\n/).includes(MARKER) ? 'marked' : 'foreign';
}

// What may be written over: nothing at all, or a hook this tool wrote.
const OURS = new Set(['absent', 'same', 'prior']);
const NOT_EXACT = "carries this tool's marker but is not exactly a hook this tool writes or wrote (lines were added or changed, or it comes from a version PRIOR_HOOK_TEXTS doesn't list)";
const EARLIER = "an earlier version of this tool's hook";

function writeHook(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.pre-push.install-${process.pid}-${randomBytes(4).toString('hex')}.tmp`);
  try {
    fs.writeFileSync(tmp, HOOK_TEXT, { flag: 'wx', mode: 0o755 });
    // The umask can strip the mode the create asked for.
    fs.chmodSync(tmp, 0o755);
    // Checked again just before the rename: a hook someone wrote since the
    // first look is still never replaced.
    if (!OURS.has(inspect(file))) throw new Refused(`${file} appeared while installing and is not exactly a hook this tool writes or wrote; left as it is`);
    fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

export function run(argv) {
  const opts = parseArgs(argv);
  const repo = path.resolve(opts.repo ?? HERE);
  const { hookFile, elsewhere } = locate(repo);
  const state = inspect(hookFile);
  const lines = [];
  const say = (s) => lines.push(s);

  if (opts.uninstall) {
    const was = state === 'prior' ? ` (${EARLIER})` : '';
    if (state === 'absent') say(`no pre-push hook at ${hookFile}; nothing to remove`);
    else if (state === 'foreign') throw new Refused(`${hookFile} is not this tool's hook (no marker line); not removing it`);
    else if (state === 'marked') throw new Refused(`${hookFile} ${NOT_EXACT}; not removing it: read it, and remove it yourself if nothing in it is anyone's own`);
    else if (!opts.go) say(`would remove ${hookFile}${was} (run again with --go to remove it)`);
    else {
      fs.rmSync(hookFile);
      say(`removed ${hookFile}${was}`);
    }
    return lines;
  }

  if (elsewhere !== null) {
    throw new Refused(`core.hooksPath sends git to ${elsewhere}: git runs hooks from there, so a hook in ${path.dirname(hookFile)} would never fire. Not installing.`);
  }
  if (state === 'foreign') {
    throw new Refused(`${hookFile} already exists and is not this tool's hook (no marker line). Not overwriting it: move it aside, or run the leak gate from it yourself.`);
  }
  if (state === 'marked') {
    throw new Refused(`${hookFile} ${NOT_EXACT}. Not overwriting it: read it, move it aside if nothing in it is anyone's own, then run with --go again.`);
  }
  if (state === 'same') {
    say(`already installed: ${hookFile}`);
    return lines;
  }
  const upgrade = state === 'prior';
  if (!opts.go) {
    say(upgrade
      ? `would upgrade ${hookFile}, ${EARLIER}, to this version's (run again with --go to upgrade it)`
      : `would install ${hookFile} (run again with --go to install it)`);
    return lines;
  }
  writeHook(hookFile);
  say(upgrade ? `upgraded ${hookFile} from ${EARLIER}` : `installed ${hookFile}`);
  return lines;
}

// Run as a command only when node was started on this file, compared as
// paths. The import.meta.main flag reads undefined on a node before 24.2,
// and the installer would then exit 0 having done and said nothing.
if (process.argv[1] && samePath(process.argv[1], fileURLToPath(import.meta.url))) {
  try {
    for (const line of run(process.argv.slice(2))) console.log(line);
  } catch (e) {
    console.error(`install-git-hooks: ${e instanceof Refused ? 'refused' : 'error'}: ${e.message}`);
    process.exitCode = e instanceof Refused ? 2 : 1;
  }
}
