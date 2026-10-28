// permissions.mjs: Claude Code permission rules, read the way the CLI reads
// them, for U4 (the push boundary). A small library over the catalog beside
// it (permission-rules.json): the liveness check warns with it, the patch
// generator (tools/permission-patch.mjs) finds the allows to remove with it,
// and its tests pin the catalog's own expectations. Everything is pure but
// the settings walk at the end, which the liveness check uses.
//
//   parseRule(str) -> {tool, content, kind, prefix} | null
//   ruleMatches(rule, command, {shell}) -> boolean
//   matchesPush(rule, catalog?) -> boolean    (an allow whose match set reaches some push spelling)
//   allowsRunCode(rule, catalog?) -> boolean  (an allow that covers playwright's run-code tool)
//   autoModeDrops(rule) -> boolean            (a tool-wide shell allow auto mode drops)
//   skipsSafetyCheck(rule, {catalog, denies}) -> boolean  (what the watcher and the patch flag)
//   allowWarnings(input), configWarnings(input) -> [warning line]
//   checkPermissions(input) -> [warning line]  (both, allowWarnings' first)
//   settingsFilesUnder(root, {depth}) -> [path]   (the project settings files)
//   worktreeRoots(root, {timeoutMs}) -> [path]    (git's worktree list; throws)
//   CATALOG                                       (the parsed permission-rules.json)
//
// How CLI 2.1.309 reads a shell rule (its own code, read from the binary on
// 2026-10-23: lFe, aFe, f5o, Goe, w2e and the PowerShell matcher):
//   - Bare `Bash` matches every command.
//   - Content ending `:*` is a PREFIX rule: the prefix is everything before
//     the `:*`, a star in it included, as literal text, and a command matches
//     when it equals the prefix or starts with the prefix plus a space.
//   - Otherwise an unescaped `*` (one with an even run of backslashes before
//     it) makes a WILDCARD rule: the pattern is trimmed, runs of spaces and
//     tabs fold to one space in it and in the command, `\*` and `\\` are the
//     literal characters, regex specials are escaped, `/**/` matches any run
//     of folders, each other `*` becomes `.*` (dotall), and when the pattern
//     has exactly one star and ends ` *` that tail also matches nothing at
//     all (`git push -f *` matches `git push -f`).
//   - Anything else is EXACT: the command equals the content.
//   - Bash compares case-sensitively. PowerShell compares case-insensitively
//     and drops .exe/.cmd/.bat/.com from a command name holding no path.
//   - `:*` after a space is unsettled: the code keeps the space (`git push :*`
//     matches nothing, since a command never ends in a space), the docs read
//     it as a trailing ` *` (every push). Q17 measures both. Here the prefix
//     loses its trailing whitespace, the WIDER reading, because this module
//     looks for allows that might grant a push: a wider reading can only
//     over-warn. The catalog never ends a rule in `:*`.
//
// The stated limit: ruleMatches reads PLAIN spellings only. For deny and ask
// the CLI also strips wrappers (timeout, env, nice, ...), leading NAME=value
// assignments, an executable's path and .exe, splits compound commands and,
// for PowerShell, matches the AST's name plus unquoted arguments (`& git
// ...`, `git 'push' ...`). Those spellings live in the catalog's matcherTable
// as `plain: false` rows, which only Q17 judges, against the CLI itself.
// matchesPush covers them from the allow side, two ways: it tests an allow
// against wrapper, env, `-C`, `-c` and interpreter spellings of a push (the
// catalog's pushSamples), and it reads the allow's own text structurally
// (pushesByStructure, review round 1), so `Bash(timeout *)`,
// `Bash(git -C <dir> push *)` and `Bash(python*)` all read as push-matching.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import CATALOG from './permission-rules.json' with { type: 'json' };

export { CATALOG };

const SHELLS = new Set(['Bash', 'PowerShell']);
const PS_EXT = /\.(exe|cmd|bat|com)$/i;
const ESC_STAR = '\x00ESCAPED_STAR\x00';
const ESC_BACKSLASH = '\x00ESCAPED_BACKSLASH\x00';
const GLOBSTAR = '\x00GLOBSTAR\x00';
// Playwright server names a wildcard server part is tested against: the
// user's, burned's seats and the plugin form.
const PLAYWRIGHT_SERVERS = ['playwright', 'playwright-seat-1', 'plugin_playwright_playwright'];

const foldBlanks = (s) => s.replace(/[ \t]+/g, ' ');

// True when `s` holds a `*` with an even run of backslashes before it.
function hasUnescapedStar(s) {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '*') continue;
    let n = 0;
    for (let j = i - 1; j >= 0 && s[j] === '\\'; j--) n++;
    if (n % 2 === 0) return true;
  }
  return false;
}

// `Tool` or `Tool(content)`; `\(` and `\)` in content are the literal paren.
// Returns null for anything else: a non-string, an empty string, a tool name
// holding a paren or a blank, a `(` whose `)` does not end the string.
export function parseRule(str) {
  if (typeof str !== 'string') return null;
  // Blanks around the whole rule are dropped: the wider reading.
  const m = /^([^()\s]+)(?:\(([\s\S]*)\))?$/.exec(str.trim());
  if (!m) return null;
  const tool = m[1];
  if (m[2] === undefined) return { tool, content: null, kind: 'all', prefix: null };
  const content = m[2].replace(/\\([()])/g, '$1');
  // `Tool()` is read as bare `Tool`: a reading that can only over-warn.
  if (content.trim() === '') return { tool, content, kind: 'all', prefix: null };
  const pm = /^(.+):\*$/.exec(content);
  if (pm) return { tool, content, kind: 'prefix', prefix: pm[1] };
  return { tool, content, kind: hasUnescapedStar(content) ? 'wildcard' : 'exact', prefix: null };
}

// The CLI's wildcard regex for `pattern` (Goe).
function wildcardRegex(pattern, insensitive) {
  const c = foldBlanks(pattern.trim());
  let g = '';
  for (let i = 0; i < c.length; i++) {
    if (c[i] === '\\' && (c[i + 1] === '*' || c[i + 1] === '\\')) { g += c[i + 1] === '*' ? ESC_STAR : ESC_BACKSLASH; i++; continue; }
    g += c[i];
  }
  let e = g.replace(/[.+?^${}()|[\]\\'"]/g, '\\$&')
    .replace(/\/(?:\*\*\/)+/g, GLOBSTAR)
    .replaceAll('*', '.*')
    .replaceAll(GLOBSTAR, '/(?:.*/)?')
    .replaceAll(ESC_STAR, '\\*')
    .replaceAll(ESC_BACKSLASH, '\\\\');
  const stars = (g.match(/\*/g) || []).length;
  if (e.endsWith(' .*') && stars === 1) e = `${e.slice(0, -3)}( .*)?`;
  return new RegExp(`^${e}$`, `s${insensitive ? 'i' : ''}`);
}

// A plain spelling as the shell's matcher sees it.
function normalize(command, shell) {
  const c = foldBlanks(command.trim());
  if (shell !== 'PowerShell') return c;
  const sp = c.indexOf(' ');
  const name = sp === -1 ? c : c.slice(0, sp);
  return /[\\/]/.test(name) ? c : name.replace(PS_EXT, '') + (sp === -1 ? '' : c.slice(sp));
}

// True when `rule` (a string or parseRule's result) matches the plain
// spelling `command` in `shell` ('Bash' or 'PowerShell'). PowerShell's
// matcher tests a command's own text and its name plus arguments with .exe
// and kin dropped (design 2b), so either form matching counts there.
export function ruleMatches(rule, command, { shell = 'Bash' } = {}) {
  const r = typeof rule === 'string' ? parseRule(rule) : rule;
  if (!r || !SHELLS.has(shell) || r.tool !== shell || typeof command !== 'string') return false;
  if (r.kind === 'all') return true;
  const ci = shell === 'PowerShell';
  const fold = (s) => (ci ? s.toLowerCase() : s);
  const formsOf = (s) => [...new Set([fold(normalize(s, shell)), fold(foldBlanks(s.trim()))])];
  const forms = formsOf(command);
  if (r.kind === 'exact') {
    const want = formsOf(r.content);
    return forms.some((c) => want.includes(c));
  }
  if (r.kind === 'prefix') {
    const p = fold(foldBlanks(r.prefix).trimEnd());
    return forms.some((c) => c === p || c.startsWith(`${p} `));
  }
  const re = wildcardRegex(r.content, ci);
  return forms.some((c) => re.test(c));
}

// ---- the structural reading of a shell allow (review round 1, R1-1, R1-2)

// Wrappers run the command after them (their own options skipped).
// Interpreters, shells and runners run code or any binary from their
// arguments, so an open-ended allow on one of them can run a push. Names are
// compared case-folded with .exe and kin dropped: on Windows `Git` runs git.
const WRAPPERS = new Set(['timeout', 'time', 'nice', 'nohup', 'stdbuf', 'command', 'builtin', 'noglob', 'env', 'sudo', 'doas', 'exec', 'xargs', 'ionice', 'chrt', 'taskset']);
const INTERPRETERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'cmd', 'wsl', 'python', 'python3', 'py', 'node', 'deno', 'bun', 'ruby', 'perl', 'php', 'npx', 'bunx', 'pnpx', 'uvx', 'start-process', 'saps', 'start', 'invoke-expression', 'iex', 'invoke-command', 'icm']);
// A runner's subcommands that start any binary or a command string.
const RUNNER_SUBS = { npm: ['exec', 'x'], pnpm: ['exec', 'dlx'], yarn: ['exec', 'dlx'], uv: ['run', 'tool'] };
const COMMAND_NAMES = ['git', ...WRAPPERS, ...INTERPRETERS, ...Object.keys(RUNNER_SUBS)];
// git's global options that take the next word as their value.
const GIT_VALUED = new Set(['-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--super-prefix', '--config-env', '--list-cmds', '--attr-source']);
const GIT_PUSH = /\bgit(?:\.exe)?["']?\s+(?:[^;&|\n]*?\s)?push\b/i;

const hasStar = (t) => hasUnescapedStar(t);
// A command word as a name: the last path part, .exe and kin dropped, folded,
// and a version tail dropped (python3.11 and node18 read as python and node).
const nameOf = (t) => t.replace(/^.*[\\/]/, '').replace(PS_EXT, '').toLowerCase().replace(/(?<=[a-z])[\d.]+$/, '');

// Words of one command segment, quotes removed ('a b' and "a b" stay one word).
function words(segment) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(segment))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// True when one command segment, read the way the shell and git read it,
// can be a push. `open`: the rule's text runs on past what is written.
function segmentPushes(segment, open, exact) {
  const t = words(segment);
  let i = 0;
  while (i < t.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[i])) i++;
  if (t[i] === '&' || t[i] === '.') i++;
  for (;;) {
    if (i >= t.length) return false;
    const head = t[i];
    if (hasStar(head)) {
      // A star in the command word: the word is the literal before it plus
      // whatever the star fills, so it can be git or a named command only
      // when that name begins with the literal (`py*` can be python;
      // `shellcheck*` can never be sh). After a folder path, an empty literal
      // names that folder's files: a project's own scripts, unless the folder
      // is a bin-style one a git could live in.
      const before = head.slice(0, head.indexOf('*'));
      const lit = nameOf(before);
      if (lit === '' && /[\\/]/.test(before)) return /(^|[\\/])(bin|cmd)[\\/]$/i.test(before);
      return COMMAND_NAMES.some((n) => n.startsWith(lit));
    }
    const name = nameOf(head);
    if (WRAPPERS.has(name)) {
      i++;
      while (i < t.length && (/^-/.test(t[i]) || /^\d+[a-z]?$/i.test(t[i]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[i]))) {
        if (hasStar(t[i])) return true;
        i++;
      }
      continue;
    }
    if (name === 'git') {
      let j = i + 1;
      for (; j < t.length; j++) {
        const w = t[j];
        if (hasStar(w)) return true;
        if (w === '-C' || GIT_VALUED.has(w)) {
          if (j + 1 < t.length && hasStar(t[j + 1])) return true;
          j++;
          continue;
        }
        if (w.startsWith('-')) continue;
        break;
      }
      // The loop returned on any starred word, so the subcommand holds none.
      // It is compared case-folded, wider than git, which refuses `git PUSH`
      // (measured 2026-10-24): that only over-warns.
      if (j >= t.length) return false;
      if (t[j].toLowerCase() !== 'push') return false;
      // Only an exact rule's dry run is no push, and only when nothing undoes
      // it: `--dry-run --no-dry-run` pushes (git 2.53, measured 2026-10-24),
      // and git takes the negation abbreviated, so any `--no-d...` word counts
      // as undoing it (a few, such as `--no-delete`, only over-warn). An open
      // rule runs on past what is written, so its dry run can always be undone.
      const rest = t.slice(j + 1);
      return !(exact && rest.some((w) => w === '--dry-run' || w === '-n') && !rest.some((w) => /^--no-d/.test(w)));
    }
    if (INTERPRETERS.has(name) || (RUNNER_SUBS[name] && t[i + 1] !== undefined && (RUNNER_SUBS[name].includes(t[i + 1].toLowerCase()) || hasStar(t[i + 1])))) {
      return open || GIT_PUSH.test(t.slice(i + 1).join(' '));
    }
    return false;
  }
}

// True when a shell allow, read structurally, can let a push run: some
// segment of its text runs git push (or leaves the subcommand to a star), or
// hands an open-ended argument to an interpreter or runner. A prefix rule
// reads as its prefix plus ` *`.
function pushesByStructure(r) {
  if (r.kind === 'all') return true;
  const text = r.kind === 'prefix' ? `${r.prefix} *` : r.content;
  const open = r.kind !== 'exact';
  return text.split(/&&|\|\||[;|\r\n]|\s&\s/).some((s) => segmentPushes(s.trim(), open, !open));
}

// True when an allow rule's match set reaches some spelling of a push: it
// matches one of the catalog's pushSamples, or its own text, read
// structurally, can run one (pushesByStructure). Over-warning is the
// accepted direction. Whether auto mode keeps the rule, so that the push
// really skips the classifier, is skipsSafetyCheck's question.
export function matchesPush(rule, catalog = CATALOG) {
  const r = typeof rule === 'string' ? parseRule(rule) : rule;
  if (!r || !SHELLS.has(r.tool)) return false;
  return catalog.pushSamples.some((s) => ruleMatches(r, s.command, { shell: s.shell })) || pushesByStructure(r);
}

const globTest = (glob, name) => new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(name);

// True when an allow rule covers playwright's run-code tool (arbitrary code in
// the server's Node process): `mcp__*`, a playwright server's bare name, its
// `__*` glob, the tool itself, or any tool glob that reaches it. A server part
// is a playwright server when it names one or a wildcard reaches one.
export function allowsRunCode(rule, catalog = CATALOG) {
  if (typeof rule !== 'string' || !rule.startsWith('mcp__')) return false;
  const rest = rule.slice(5);
  const cut = rest.indexOf('__');
  const server = cut === -1 ? rest : rest.slice(0, cut);
  const tool = cut === -1 ? null : rest.slice(cut + 2);
  const isPlaywright = /playwright/i.test(server) || (server.includes('*') && PLAYWRIGHT_SERVERS.some((s) => globTest(server, s)));
  if (!isPlaywright) return false;
  return tool === null || globTest(tool, catalog.playwright.runCode);
}

// True for a Bash or PowerShell allow auto mode drops as tool-wide: no
// content, empty content, or only stars and blanks (`Bash`, `Bash(*)`,
// `Bash(**)`). It is the first clause of the CLI's own strip
// (isDangerousBashPermission and isDangerousPowerShellPermission, read from
// the 2.1.312 binary on 2026-10-27 and again in review round 3; both open
// `if(r===void 0||r==="")return!0;if(/^[\s*]+$/.test(r))return!0;`), and the
// only one ported: its other clauses name programs from lists that change by
// version (python, npx, eval, ...), and leaving them out can only over-warn,
// since such an allow keeps being flagged.
export function autoModeDrops(rule) {
  const r = parseRule(rule);
  if (!r || !SHELLS.has(r.tool)) return false;
  return r.content === null || /^[\s*]*$/.test(r.content);
}

// An allow the watcher and the patch flag: one that lets a push skip the
// auto-mode classifier (a tool-wide shell allow auto mode drops does not:
// auto mode is his normal setting, and outside it nothing may ask him), or
// one that covers playwright's run-code tool on a server `denies` does not
// deny that tool on. A deny beats a matching allow, so a literal server's
// `mcp__<server>__<runCode>` deny clears its glob; a wildcard server part is
// never cleared.
export function skipsSafetyCheck(rule, { catalog = CATALOG, denies = [] } = {}) {
  if (matchesPush(rule, catalog) && !autoModeDrops(rule)) return true;
  if (!allowsRunCode(rule, catalog)) return false;
  const server = rule.slice(5).split('__')[0];
  return server.includes('*') || !denies.includes(`mcp__${server}__${catalog.playwright.runCode}`);
}

const rulesOf = (settings, key) => {
  const list = settings?.permissions?.[key];
  return Array.isArray(list) ? list.filter((r) => typeof r === 'string') : [];
};
const allRules = (settings) => ['allow', 'ask', 'deny'].flatMap((k) => rulesOf(settings, k));
const isTool = (tool) => (rule) => parseRule(rule)?.tool === tool;

// The liveness check's permission warnings, one line each (no leading "- ").
//   user:          {label, settings}  the user settings (label as printed)
//   files:         [{label, settings, folder}]  every other settings file
//                  scanned; files with the same folder apply together
//   powershellEnv: CLAUDE_CODE_USE_POWERSHELL_TOOL's value (undefined if unset)
//   reviewLens:    {deployed, source} sha256 hex or null, or null to skip
//   catalog:       defaults to CATALOG
// A file whose settings is null (unreadable) is skipped: the caller says so.
// allowWarnings holds the lines saying an allow lets a push or run-code skip
// the safety check (the ones the liveness check never cuts), configWarnings
// the rest; checkPermissions is both, allowWarnings' first.
export function checkPermissions(input) {
  return [...allowWarnings(input), ...configWarnings(input)];
}

// One line per file and kind for the allows skipsSafetyCheck flags. A
// file's denies are the user's plus those of the files in its folder (they
// apply together).
export function allowWarnings({ user, files = [], catalog = CATALOG }) {
  const out = [];
  const us = user?.settings ?? null;
  const uLabel = user?.label ?? 'user settings';
  const userDenies = rulesOf(us, 'deny');
  const folderDenies = new Map();
  for (const f of files) if (f.settings) folderDenies.set(f.folder ?? f.label, [...(folderDenies.get(f.folder ?? f.label) ?? []), ...rulesOf(f.settings, 'deny')]);
  for (const f of [{ label: uLabel, settings: us, user: true }, ...files]) {
    if (!f.settings) continue;
    const denies = f.user ? userDenies : [...userDenies, ...(folderDenies.get(f.folder ?? f.label) ?? [])];
    const allow = rulesOf(f.settings, 'allow');
    const more = (list) => (list.length > 1 ? ` (and ${list.length - 1} more)` : '');
    const flagged = allow.filter((r) => skipsSafetyCheck(r, { catalog, denies }));
    const push = flagged.filter((r) => !allowsRunCode(r, catalog));
    if (push.length) out.push(`permissions: ${f.label} allows ${push[0]}${more(push)}, so a push can skip the auto-mode safety check`);
    const run = flagged.filter((r) => allowsRunCode(r, catalog));
    if (run.length) out.push(`permissions: ${f.label} allows ${run[0]}${more(run)}, which covers playwright's ${catalog.playwright.runCode} (arbitrary code) before the safety check`);
  }
  return out;
}

// Every other warning: catalog rules, D4 and the marketplace missing from
// user settings, the PowerShell-off landmine, and review-lens.
export function configWarnings({ user, files = [], powershellEnv, reviewLens = null, catalog = CATALOG }) {
  const out = [];
  const us = user?.settings ?? null;
  const uLabel = user?.label ?? 'user settings';

  if (us) {
    const have = { ask: new Set(rulesOf(us, 'ask')), deny: new Set(rulesOf(us, 'deny')) };
    const want = [...catalog.ask.map((r) => ['ask', r.rule]), ...catalog.deny.map((r) => ['deny', r.rule])];
    const missing = want.filter(([k, r]) => !have[k].has(r));
    if (missing.length) out.push(`permissions: ${missing.length} of ${want.length} U4 catalog rules are missing from ${uLabel} (first: ${missing[0][0]} ${missing[0][1]})`);
    const soft = us.autoMode?.soft_deny;
    if (!Array.isArray(soft) || !soft.includes(catalog.softDeny)) out.push(`permissions: the U4 autoMode.soft_deny entry (destructive pushes to a default branch) is missing from ${uLabel}`);
    const mk = us.extraKnownMarketplaces?.[catalog.marketplace.name];
    if (mk?.autoUpdate !== catalog.marketplace.autoUpdate) out.push(`permissions: extraKnownMarketplaces["${catalog.marketplace.name}"].autoUpdate is not ${catalog.marketplace.autoUpdate} in ${uLabel}, so its plugins ${catalog.marketplace.autoUpdate ? 'do not update on their own' : 'can update on their own'}`);
  }

  // A Bash deny turns the PowerShell tool off without a word, unless a
  // PowerShell rule applies too or the env var is set (any non-empty value,
  // "0" included, counts as set).
  if (!powershellEnv) {
    const userPs = allRules(us).some(isTool('PowerShell'));
    const groups = new Map();
    for (const f of files) {
      if (!f.settings) continue;
      const key = f.folder ?? f.label;
      groups.set(key, [...(groups.get(key) ?? []), f]);
    }
    const scopes = [{ label: uLabel, sources: us ? [us] : [] }, ...[...groups.values()].map((g) => ({ label: g.map((f) => f.label).join(' + '), sources: g.map((f) => f.settings) }))];
    for (const s of scopes) {
      const bashDeny = s.sources.some((x) => rulesOf(x, 'deny').some(isTool('Bash')));
      const ps = userPs || s.sources.some((x) => allRules(x).some(isTool('PowerShell')));
      if (bashDeny && !ps) out.push(`permissions: ${s.label} denies a Bash command and no PowerShell rule applies, so Claude Code turns the PowerShell tool off without a word`);
    }
  }

  if (reviewLens) {
    if (!reviewLens.deployed) out.push('review-lens: ~/.claude/agents/review-lens.md is missing, so a workflow naming agentType review-lens gets no read-only lens');
    else if (reviewLens.source && reviewLens.deployed !== reviewLens.source) out.push('review-lens: ~/.claude/agents/review-lens.md differs from its tracked source (projects/skills/ultramode-code-review/agents/review-lens.md)');
  }
  return out;
}

// ---- the settings walk ---------------------------------------------------------

const SETTINGS_FILES = ['settings.json', 'settings.local.json'];
const SKIP_DIRS = new Set(['node_modules', '.git']);
// Out of git's environment: the location variables, which would point
// `git -C <root>` at another repository, and the two worktreeRoots sets itself.
const GIT_DROP = new Set(['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_COMMON_DIR', 'GIT_NAMESPACE', 'GIT_PREFIX', 'GIT_OPTIONAL_LOCKS', 'GIT_CEILING_DIRECTORIES']);

const oneLine = (e) => String(e && e.message !== undefined ? e.message : e).replace(/\s+/g, ' ').trim().slice(0, 300);
// A folder's entries in name order (code units), so a walk lists the same
// files in the same order on every file system; [] when it can't be read.
const listDir = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch {
    return [];
  }
};

// The project settings files under `root`: .claude/settings.json and
// .claude/settings.local.json of every folder 0 to `depth` levels below it
// (the root is level 0, so projects/archive/<x> is level 3). node_modules and
// .git are skipped, and links are not followed: a Dirent of a junction or a
// symlink is no directory. A name in .claude counts whatever it is, so a
// folder named settings.json reaches the reader, which reports it unreadable,
// instead of passing unseen.
export function settingsFilesUnder(root, { depth = 3 } = {}) {
  const out = [];
  const walk = (dir, level) => {
    const entries = listDir(dir);
    if (entries.some((e) => e.name === '.claude')) {
      const names = new Set(listDir(path.join(dir, '.claude')).map((e) => e.name));
      for (const n of SETTINGS_FILES) if (names.has(n)) out.push(path.join(dir, '.claude', n));
    }
    if (level >= depth) return;
    for (const e of entries) if (e.isDirectory() && !SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), level + 1);
  };
  walk(root, 0);
  return out;
}

// Every worktree git lists for the repository whose top is `root`, the main
// one included. Throws when git cannot list them: no git, a hang past
// `timeoutMs`, or `root` not the top of a repository (the ceiling stops git
// climbing to a repository above it, whose worktrees are other trees).
export function worktreeRoots(root, { timeoutMs = 1000 } = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!GIT_DROP.has(k.toUpperCase())) env[k] = v;
  env.GIT_OPTIONAL_LOCKS = '0';
  env.GIT_CEILING_DIRECTORIES = path.dirname(root);
  const r = spawnSync('git', ['-C', root, 'worktree', 'list', '--porcelain', '-z'], { env, encoding: 'utf8', shell: false, windowsHide: true, timeout: timeoutMs });
  if (r.error) throw new Error(r.error.code || oneLine(r.error));
  if (r.status !== 0) throw new Error(oneLine((r.stderr || '').trim().split(/\r?\n/)[0] || `git exited ${r.status}`));
  return r.stdout.split('\0').filter((f) => f.startsWith('worktree ')).map((f) => f.slice('worktree '.length));
}
