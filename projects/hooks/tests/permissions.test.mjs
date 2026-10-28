// lib/permissions.mjs and its catalog, lib/permission-rules.json (U4).
// The matcher is held to the CLI's own reading of a rule (CLI 2.1.309, read
// from the binary; the module's header has the details) on plain spellings;
// the catalog is linted as data (every rule parses, each shell rule has its
// twin, none ends `:*`, the probe pins hold its bytes); and the force class
// is checked against a grid of spellings, so a form no rule blocks fails here
// rather than at a push. Since 2026-10-27 the catalog asks nothing: the force
// class is denied (the U4 cut).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { isAscii } from '../lib/encoding.mjs';
import { CATALOG, allowWarnings, allowsRunCode, autoModeDrops, checkPermissions, configWarnings, matchesPush, parseRule, ruleMatches, settingsFilesUnder, skipsSafetyCheck, worktreeRoots } from '../lib/permissions.mjs';
import { gitEnv } from '../probes/lib.mjs';

const HOOKS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_FILE = path.join(HOOKS, 'lib', 'permission-rules.json');
const SHELLS = ['Bash', 'PowerShell'];

// What the catalog decides for a plain spelling: deny, then ask, then nothing.
const decide = (command, shell) => {
  if (CATALOG.deny.some((r) => ruleMatches(r.rule, command, { shell }))) return 'deny';
  if (CATALOG.ask.some((r) => ruleMatches(r.rule, command, { shell }))) return 'ask';
  return 'none';
};

describe('parseRule: the CLI\'s three kinds, plus bare', () => {
  test('bare, prefix, wildcard and exact', () => {
    assert.equal(parseRule('Bash').kind, 'all');
    assert.equal(parseRule('Bash()').kind, 'all', 'empty content reads as bare: it can only over-warn');
    assert.deepEqual(parseRule('Bash(git push:*)'), { tool: 'Bash', content: 'git push:*', kind: 'prefix', prefix: 'git push' });
    assert.equal(parseRule('Bash(git push :*)').prefix, 'git push ', 'the prefix keeps its space, as the CLI does');
    assert.equal(parseRule('Bash(git * push:*)').kind, 'prefix', 'a rule ending :* is a prefix rule whatever comes before');
    assert.equal(parseRule('Bash(git push *)').kind, 'wildcard');
    assert.equal(parseRule('Bash(*)').kind, 'wildcard');
    assert.equal(parseRule('Bash(git push * :**)').kind, 'wildcard', ':** does not end in :*');
    assert.equal(parseRule('Bash(git status)').kind, 'exact');
    assert.equal(parseRule('Bash(echo \\*)').kind, 'exact', 'an escaped star is literal');
    assert.equal(parseRule('Bash(echo \\\\*)').kind, 'wildcard', 'an escaped backslash leaves the star unescaped');
  });

  test('tools without content, escaped parens, and what is not a rule', () => {
    assert.deepEqual(parseRule('mcp__playwright__*'), { tool: 'mcp__playwright__*', content: null, kind: 'all', prefix: null });
    assert.equal(parseRule('Skill(skill:commit-commands:commit-push-pr)').content, 'skill:commit-commands:commit-push-pr');
    assert.equal(parseRule('PowerShell(Get-Date \\(x\\))').content, 'Get-Date (x)');
    for (const bad of ['', 'Bash(git push', 'Bash (x)', 'Bash(x) y', null, 42]) assert.equal(parseRule(bad), null, String(bad));
  });
});

describe('ruleMatches: plain spellings, read as the CLI reads them', () => {
  test('a lone trailing " *" also matches the bare command; a second star turns that off', () => {
    assert.ok(ruleMatches('Bash(git push -f *)', 'git push -f'));
    assert.ok(ruleMatches('Bash(git push -f *)', 'git push -f origin main'));
    assert.ok(!ruleMatches('Bash(git push -f *)', 'git push -fu origin main'));
    assert.ok(!ruleMatches('Bash(git * push -f *)', 'git -C . push -f'), 'two stars: the bare form needs its own rule');
    assert.ok(ruleMatches('Bash(git * push -f)', 'git -C . push -f'));
  });

  test('the measured :** form deletes match and plain pushes do not (the U4 pilot)', () => {
    assert.ok(ruleMatches('Bash(git push * :**)', 'git push origin :feature'));
    assert.ok(!ruleMatches('Bash(git push * :**)', 'git push origin main'));
    assert.ok(!ruleMatches('Bash(git push * :**)', 'git push origin HEAD:refs/heads/x'));
  });

  test(':* takes the wider reading: with or without a space, every push', () => {
    for (const rule of ['Bash(git push:*)', 'Bash(git push :*)']) {
      assert.ok(ruleMatches(rule, 'git push'), rule);
      assert.ok(ruleMatches(rule, 'git push origin main'), rule);
      assert.ok(!ruleMatches(rule, 'git pushx'), rule);
    }
    assert.ok(!ruleMatches('Bash(git * push:*)', 'git -C . push origin main'), 'a star inside a prefix is literal');
  });

  test('exact rules, folded blanks, case and the shell', () => {
    assert.ok(ruleMatches('Bash(git status)', 'git status'));
    assert.ok(!ruleMatches('Bash(git status)', 'git status -s'));
    assert.ok(ruleMatches('Bash(git push *--force *)', 'git  push\t--force   origin main'), 'runs of spaces and tabs fold');
    assert.ok(!ruleMatches('Bash(git push *--force *)', 'GIT PUSH --FORCE origin main'), 'Bash is case-sensitive');
    assert.ok(!ruleMatches('Bash(git push *)', 'git push', { shell: 'PowerShell' }), 'a Bash rule never matches a PowerShell command');
    assert.ok(!ruleMatches('Bash(git push *)', 'git push', { shell: 'cmd' }));
    assert.ok(ruleMatches('Bash', 'anything at all'));
    assert.ok(ruleMatches('Bash(*)', 'anything at all'));
    // An exact rule is compared as written (w2e: n === e.command), so its
    // backslash stays; in a wildcard rule `\*` is the literal star.
    assert.ok(ruleMatches('Bash(echo \\*)', 'echo \\*'));
    assert.ok(!ruleMatches('Bash(echo \\*)', 'echo *'));
    assert.ok(ruleMatches('Bash(echo \\* *)', 'echo *'));
    assert.ok(ruleMatches('Bash(echo \\* *)', 'echo * x'));
    assert.ok(!ruleMatches('Bash(echo \\* *)', 'echo hi'));
  });

  test('PowerShell folds case and drops .exe, .cmd, .bat and .com from a bare name, never from a path', () => {
    const ps = { shell: 'PowerShell' };
    assert.ok(ruleMatches('PowerShell(git push *--force *)', 'Git Push --Force origin main', ps));
    for (const ext of ['exe', 'cmd', 'bat', 'com', 'EXE']) assert.ok(ruleMatches('PowerShell(git push *--force *)', `git.${ext} push --force origin main`, ps), ext);
    assert.ok(!ruleMatches('PowerShell(git push *--force *)', 'C:\\Git\\git.exe push --force origin main', ps));
    // A name with a path keeps its .exe: only the bare form loses it.
    assert.ok(ruleMatches('PowerShell(C:\\Git\\git push *)', 'C:\\Git\\git push origin main', ps));
    assert.ok(!ruleMatches('PowerShell(C:\\Git\\git push *)', 'C:\\Git\\git.exe push origin main', ps));
    assert.ok(!ruleMatches('Bash(git push *--force *)', 'git.exe push --force origin main'), 'Bash keeps .exe on a plain spelling (the CLI strips it on deny and ask: a plain: false row)');
    assert.ok(ruleMatches('PowerShell(git status)', 'GIT.EXE STATUS', ps));
  });

  test('the matcher agrees with every plain matcherTable row', () => {
    const plain = CATALOG.matcherTable.filter((r) => r.plain);
    assert.ok(plain.length >= 100, `${plain.length} plain rows`);
    const wrong = plain.map((r) => ({ ...r, got: decide(r.command, r.shell) })).filter((r) => r.got !== r.expect);
    assert.deepEqual(wrong.map((r) => `${r.shell} ${r.command}: expected ${r.expect}, got ${r.got}`), []);
  });
});

describe('the force class against a grid of spellings', () => {
  const PREFIXES = ['git', 'git -C .', 'git -C ../other-repo', 'git -c push.default=current'];
  const spellings = [];
  for (const p of PREFIXES) {
    // git takes any unambiguous abbreviation of a long option (measured
    // 2026-10-24: --de and --delet delete, --mirr mirrors, --pru prunes; --for
    // is ambiguous and refused), so the shortest forms are spellings too.
    for (const flag of ['--force', '-f', '--delete', '--delet', '--de', '-d', '--mirror', '--mirr', '--mi', '--prune', '--pru']) {
      // A bare -d is a git error (no refs), so it is not a spelling to cover.
      if (!(flag === '-d')) spellings.push(`${p} push ${flag}`);
      spellings.push(`${p} push ${flag} origin`, `${p} push ${flag} origin main`, `${p} push origin ${flag} main`, `${p} push origin main ${flag}`);
    }
    spellings.push(`${p} push origin +main`, `${p} push origin +main:main`, `${p} push +main`, `${p} push origin :feature`, `${p} push origin main :feature`);
  }

  for (const shell of SHELLS) {
    test(`${shell}: every one of ${spellings.length} destructive spellings is denied (blocked, never asked)`, () => {
      const missed = spellings.filter((c) => decide(c, shell) !== 'deny');
      assert.deepEqual(missed, []);
    });
  }

  test('ordinary pushes and the lease forms are not blocked', () => {
    for (const p of PREFIXES) {
      for (const c of [`${p} push`, `${p} push origin main`, `${p} push -u origin feature`, `${p} push --force-with-lease origin feature`, `${p} push --tags origin`, `${p} push origin HEAD:refs/heads/x`]) {
        for (const shell of SHELLS) assert.equal(decide(c, shell), 'none', `${shell}: ${c}`);
      }
    }
  });
});

describe('matchesPush: an allow whose match set reaches some push spelling', () => {
  test('push-matching allows', () => {
    for (const r of ['Bash', 'Bash(*)', 'Bash(git *)', 'Bash(git push)', 'Bash(git push *)', 'Bash(git push:*)', 'Bash(git -C *)', 'Bash(timeout *)', 'Bash(env *)', 'Bash(GIT_TRACE=1 *)', 'Bash(bash *)', 'PowerShell', 'PowerShell(*)', 'PowerShell(git push *)', 'PowerShell(git *)']) {
      assert.ok(matchesPush(r), r);
    }
  });

  test('allows that grant no push', () => {
    for (const r of ['Bash(npm test)', 'Bash(git status)', 'Bash(git pull *)', 'Bash(git push --dry-run)', 'Read(*)', 'Agent(*)', 'mcp__playwright__*', 'PowerShell(Get-Process *)', 'Skill(commit-commands:commit)', 'not a rule (', 42]) {
      assert.ok(!matchesPush(r), String(r));
    }
  });

  test('read structurally: narrow git push allows, git with a star before its subcommand, open-ended interpreters and runners (review round 1)', () => {
    for (const r of [
      'Bash(git push -u *)', 'Bash(git push -u origin:*)', 'Bash(git push upstream *)', 'Bash(git push origin feat*)', 'Bash(git push -q origin main)',
      'Bash(git push --force-with-lease origin main)', 'Bash(git -C /c/repo push *)', 'Bash(git -C C:/x push:*)', 'Bash(git -c core.x=1 push *)', 'Bash(git --no-pager *)',
      'Bash(git -C * status)', 'Bash(git pu*)', 'Bash(g*)', 'Bash(GIT_TRACE=1 git push *)', 'Bash(timeout 30 git push *)', 'Bash(env FOO=1 git push *)',
      'Bash(cd x && git push origin main)', 'Bash("C:/Program Files/Git/cmd/git.exe" push *)', 'Bash(/usr/bin/git push:*)',
      'Bash(python*)', 'Bash(.venv/Scripts/python:*)', 'Bash("C:/py/python.exe" -c:*)', 'Bash(node -e *)', 'Bash(npx *)', 'Bash(npm exec *)', 'Bash(xargs *)',
      'Bash(bash -c "git push --force origin main")', 'Bash(python3.11 *)', 'Bash(py*)', 'Bash(npm*)', 'Bash(uv run *)',
      'PowerShell(git push --set-upstream *)', 'PowerShell(& git push *)', 'PowerShell($r = "x"; git -C $r push origin main)', 'PowerShell(Git.exe push *)',
      'PowerShell(git.exe:*)', 'PowerShell(cmd /c *)', 'PowerShell(Start-Process *)', '  Bash(git push *)  ', 'Bash(/usr/bin/*)', 'Bash(/mingw64/bin/*)', 'PowerShell(C:/Git/cmd/*)',
    ]) {
      assert.ok(matchesPush(r), r);
    }
  });

  test('read structurally, where no push sample reaches: each part of the reading carries its own weight', () => {
    // Each rule here matches none of the catalog's pushSamples, so only the
    // structural reading can flag it.
    for (const [r, why] of [
      ['Bash(git --no-pager:*)', 'a prefix rule runs on past its prefix'],
      ['Bash(FOO=1 git push origin main)', 'a leading NAME=value is skipped'],
      ['Bash(timeout -s* git status)', 'a star in a wrapper option can hold a whole push'],
      ['Bash(git -c* status)', "a star in one of git's options can hold the subcommand"],
      ['Bash(npm e*)', "a star in a runner's subcommand can be exec"],
      ['Bash(git push --dry-run *)', 'an open rule runs on past its dry run (--no-dry-run undoes it)'],
      ['Bash(git push -n *)', 'the same, short'],
      ['Bash(git push --dry-run --no-dry-run origin main)', 'measured on git 2.53: this pushes'],
      ['Bash(git push -n --no-dr origin main)', 'git takes the negation abbreviated'],
      ['Bash(git PUSH origin main)', 'the subcommand is read case-folded: wider than git, which refuses it'],
    ]) {
      assert.ok(!CATALOG.pushSamples.some((s) => ruleMatches(r, s.command, { shell: s.shell })), `${r}: a sample reaches it, so it proves nothing here`);
      assert.ok(matchesPush(r), `${r}: ${why}`);
    }
    assert.ok(!matchesPush('Bash(git push --dry-run --no-verify origin main)'), 'an exact dry run with another --no- option stays a dry run');
  });

  test('read structurally: what only looks like a push is not one', () => {
    for (const r of [
      'Bash(git stash push *)', 'Bash(git pull *)', 'Bash(git status *)', 'Bash(git log *)', 'Bash(git push --dry-run origin main)', 'Bash(git push -n)',
      'Bash(docker push *)', 'Bash(npm run *)', 'Bash(npm test)', 'Bash(pnpm install)', 'Bash(./scripts/*)', 'Bash(mkdir -p temp)', 'Bash(npx prettier --write .)',
      'PowerShell(python -c "import ast; print(1)")', 'PowerShell(Get-ChildItem *)', 'Bash(timeout 30 npm test)',
      'Bash(pip*)', 'Bash(shellcheck*)', 'Bash(gitk*)', 'Bash(npm run test:*)',
    ]) {
      assert.ok(!matchesPush(r), r);
    }
  });

  test('PowerShell: a rule naming git.exe matches the command as written and as the matcher strips it', () => {
    assert.ok(ruleMatches('PowerShell(git.exe push *)', 'git.exe push origin main', { shell: 'PowerShell' }));
    assert.ok(ruleMatches('PowerShell(git push *)', 'git.exe push origin main', { shell: 'PowerShell' }));
    assert.ok(ruleMatches('PowerShell(git.exe:*)', 'git.exe push origin main', { shell: 'PowerShell' }));
    assert.ok(ruleMatches('PowerShell(git.exe push)', 'git.exe push', { shell: 'PowerShell' }));
    // The matcher drops one extension: a doubled one leaves the command's
    // stripped form equal only to the rule as written, so that pairing counts.
    assert.ok(ruleMatches('PowerShell(git.exe push)', 'git.exe.exe push', { shell: 'PowerShell' }));
    assert.ok(!ruleMatches('Bash(git.exe push *)', 'git push origin main'), 'Bash keeps a name as written');
  });

  test('every push sample is a push, in a shell the matcher reads', () => {
    for (const s of CATALOG.pushSamples) {
      assert.ok(SHELLS.includes(s.shell), s.shell);
      assert.match(s.command, /\bpush\b/);
    }
  });
});

describe('allowsRunCode: an allow that covers playwright\'s run-code tool', () => {
  test('every form that reaches it', () => {
    for (const r of ['mcp__*', 'mcp__playwright', 'mcp__playwright__*', 'mcp__playwright__browser_run_code_unsafe', 'mcp__playwright__browser_*', 'mcp__playwright-seat-3__*', 'mcp__plugin_playwright_playwright__*', 'mcp__play*__*', 'mcp__Playwright__*']) {
      assert.ok(allowsRunCode(r), r);
    }
  });

  test('forms that do not', () => {
    for (const r of ['mcp__playwright__browser_click', 'mcp__playwright__browser_evaluate', 'mcp__context7__*', 'mcp__gemini-grounding__*', 'mcp__seq*__*', 'Bash(*)', 'mcp_playwright__*', null]) {
      assert.ok(!allowsRunCode(r), String(r));
    }
  });
});

describe('the catalog, linted as data', () => {
  const shellRules = (list) => list.filter((r) => SHELLS.includes(parseRule(r.rule)?.tool));

  test('every rule parses, has a reason, is unique, and none ends in :*', () => {
    for (const r of [...CATALOG.ask, ...CATALOG.deny]) {
      const p = parseRule(r.rule);
      assert.ok(p, `parses: ${r.rule}`);
      const runCodeDeny = p.tool.startsWith('mcp__') && p.content === null && p.tool.endsWith(`__${CATALOG.playwright.runCode}`);
      assert.ok(['Bash', 'PowerShell', 'Skill'].includes(p.tool) || runCodeDeny, r.rule);
      assert.ok(typeof r.why === 'string' && r.why.length > 10, `a reason: ${r.rule}`);
      assert.ok(!r.rule.endsWith(':*)'), `no :* ending (the CLI's reading of it is unsettled): ${r.rule}`);
    }
    const all = [...CATALOG.ask, ...CATALOG.deny].map((r) => r.rule);
    assert.equal(new Set(all).size, all.length, 'no rule twice, and none both ask and deny');
  });

  test('each Bash rule has its PowerShell twin with the same reason, and back', () => {
    for (const list of [CATALOG.ask, CATALOG.deny]) {
      const by = new Map(shellRules(list).map((r) => [r.rule, r.why]));
      for (const [rule, why] of by) {
        const p = parseRule(rule);
        const other = `${p.tool === 'Bash' ? 'PowerShell' : 'Bash'}(${p.content})`;
        assert.equal(by.get(other), why, `${rule} has ${other}`);
      }
    }
  });

  test('the counts the cut names: no ask rule or ask row; per shell 29 D3 denials (blocked on every branch) and 27 others; no rule blocks a plugin update (nothing is frozen); 5 Skill denials; run-code denied on 12 playwright servers', () => {
    assert.deepEqual(CATALOG.ask, [], 'nothing asks Briggsy');
    assert.ok(!CATALOG.matcherTable.some((r) => r.expect === 'ask'), 'no row expects an ask');
    for (const shell of SHELLS) {
      const deny = CATALOG.deny.filter((r) => parseRule(r.rule).tool === shell);
      assert.equal(deny.filter((r) => r.why.includes('blocked on every branch')).length, 29, `${shell} D3`);
      assert.equal(deny.length, 56, `${shell} deny`);
      for (const command of ['claude plugin update compound-engineering@every-marketplace', 'claude plugin marketplace update every-marketplace', 'claude plugin install compound-engineering@every-marketplace']) {
        assert.ok(!deny.some((r) => ruleMatches(r.rule, command, { shell })), `${shell}: nothing blocks ${command}`);
      }
    }
    const skills = CATALOG.deny.filter((r) => parseRule(r.rule).tool === 'Skill');
    assert.equal(skills.length, 5);
    for (const r of skills) assert.match(r.rule, /^Skill\(skill:[a-z-]+:[a-z-]+\)$/, `parameter form, qualified: ${r.rule}`);
    const servers = ['playwright', ...Array.from({ length: 10 }, (_, i) => `playwright-seat-${i + 1}`), 'plugin_playwright_playwright'];
    assert.deepEqual(CATALOG.deny.filter((r) => r.rule.startsWith('mcp__')).map((r) => r.rule), servers.map((s) => `mcp__${s}__${CATALOG.playwright.runCode}`));
    assert.equal(CATALOG.deny.length, 2 * 56 + 5 + 12);
  });

  test('every matcherTable row is well formed, and the rows cover every D3 rule in both shells and every other Bash denial', () => {
    for (const r of CATALOG.matcherTable) {
      assert.ok(SHELLS.includes(r.shell), JSON.stringify(r));
      assert.ok(['ask', 'deny', 'none'].includes(r.expect), JSON.stringify(r));
      assert.equal(typeof r.plain, 'boolean', JSON.stringify(r));
      assert.ok(r.command && r.command === r.command.trim(), JSON.stringify(r));
    }
    const keys = CATALOG.matcherTable.map((r) => `${r.shell}\u0000${r.command}`);
    assert.equal(new Set(keys).size, keys.length, 'no row twice');
    const plain = CATALOG.matcherTable.filter((r) => r.plain);
    // The D3 rules, once asks, keep the both-shells coverage they had; the
    // other denials' PowerShell rows are sparse, so those are held in Bash.
    for (const d of shellRules(CATALOG.deny).filter((r) => r.why.includes('blocked on every branch'))) {
      const { tool } = parseRule(d.rule);
      assert.ok(plain.some((r) => r.shell === tool && r.expect === 'deny' && ruleMatches(d.rule, r.command, { shell: tool })), `a row exercises ${d.rule}`);
    }
    for (const d of shellRules(CATALOG.deny)) {
      const { tool } = parseRule(d.rule);
      if (tool !== 'Bash') continue;
      assert.ok(plain.some((r) => r.shell === 'Bash' && r.expect === 'deny' && ruleMatches(d.rule, r.command, { shell: 'Bash' })), `a row exercises ${d.rule}`);
    }
  });

  test('playwright: the measured tool list without run-code, the softDeny text, the marketplace, the projects', () => {
    const pw = CATALOG.playwright;
    assert.equal(pw.runCode, 'browser_run_code_unsafe');
    assert.ok(!pw.tools.includes(pw.runCode));
    assert.deepEqual(pw.tools, [...new Set(pw.tools)].sort());
    assert.ok(pw.tools.length >= 20 && pw.tools.every((t) => /^browser_[a-z_]+$/.test(t)));
    assert.match(pw.version, /^\d+\.\d+\.\d+$/);
    assert.ok(isAscii(CATALOG.softDeny) && CATALOG.softDeny.includes('--force-with-lease'));
    assert.deepEqual(CATALOG.marketplace, { name: 'every-marketplace', autoUpdate: true }, 'nothing is frozen: CE updates on its own');
    for (const [file, p] of Object.entries(CATALOG.projects)) {
      assert.match(file, /^projects\/[a-z0-9/-]+\/\.claude\/settings(\.local)?\.json$/);
      assert.ok(Array.isArray(p.remove) && p.remove.length > 0 && Array.isArray(p.playwright), file);
      for (const r of p.remove) assert.ok(skipsSafetyCheck(r, { denies: CATALOG.deny.map((d) => d.rule) }), `${file} removes only S1 allows: ${r}`);
    }
  });

  test('the file is ASCII and holds no user folder', () => {
    const bytes = fs.readFileSync(CATALOG_FILE);
    assert.ok(isAscii(bytes.toString('latin1')));
    assert.doesNotMatch(bytes.toString('utf8'), /users[\\/]/i);
  });

  test('Q17 and Q18 pin the catalog\'s bytes', () => {
    const want = createHash('sha256').update(fs.readFileSync(CATALOG_FILE)).digest('hex');
    const defs = fs.readdirSync(path.join(HOOKS, 'probes', 'defs'));
    for (const q of ['q17-', 'q18-']) {
      const file = defs.find((f) => f.startsWith(q) && f.endsWith('.mjs'));
      assert.ok(file, `${q}*.mjs exists`);
      const m = /^export const CATALOG_SHA256 = '([0-9a-f]{64})';$/m.exec(fs.readFileSync(path.join(HOOKS, 'probes', 'defs', file), 'utf8'));
      assert.ok(m, `${file} holds the pin line`);
      assert.equal(m[1], want, `${file}'s pin is the catalog's sha256 (update the pin, then rerun the probe)`);
    }
  });
});

describe('checkPermissions: the liveness warnings', () => {
  // A synthetic user settings file holding all of U4's state as the cut
  // lands it: Bash(*) and the playwright glob stay, run-code is denied.
  const landed = () => ({
    permissions: {
      allow: ['Read(*)', 'Bash(*)', 'mcp__context7__*', 'mcp__playwright__*'],
      ask: CATALOG.ask.map((r) => r.rule),
      deny: CATALOG.deny.map((r) => r.rule),
    },
    autoMode: { soft_deny: ['an earlier entry', CATALOG.softDeny] },
    extraKnownMarketplaces: { 'every-marketplace': { source: { source: 'github', repo: 'example/x' }, autoUpdate: true } },
  });
  const lens = { deployed: 'a'.repeat(64), source: 'a'.repeat(64) };
  const run = (over = {}) => checkPermissions({ user: { label: 'user settings', settings: landed() }, files: [], powershellEnv: undefined, reviewLens: lens, ...over });

  test('landed state: no warning', () => {
    assert.deepEqual(run(), []);
  });

  test('missing catalog rules: one line, the count and the first', () => {
    const s = landed();
    s.permissions.deny = s.permissions.deny.slice(2).filter((r) => !r.startsWith('Skill('));
    const w = run({ user: { label: 'U', settings: s } });
    assert.deepEqual(w, [`permissions: 7 of ${CATALOG.ask.length + CATALOG.deny.length} U4 catalog rules are missing from U (first: deny ${CATALOG.deny[0].rule})`]);
  });

  test('a rule in the wrong list counts as missing', () => {
    const s = landed();
    s.permissions.ask.push(s.permissions.deny.shift());
    assert.match(run({ user: { label: 'U', settings: s } })[0], /^permissions: 1 of \d+ U4 catalog rules are missing from U \(first: deny /);
  });

  test('D4 missing, and the marketplace not set to auto-update', () => {
    const s = landed();
    s.autoMode.soft_deny = ['an earlier entry'];
    delete s.extraKnownMarketplaces['every-marketplace'].autoUpdate;
    const w = run({ user: { label: 'U', settings: s } });
    assert.equal(w.length, 2);
    assert.match(w[0], /autoMode\.soft_deny entry .* is missing from U$/);
    assert.equal(w[1], 'permissions: extraKnownMarketplaces["every-marketplace"].autoUpdate is not true in U, so its plugins do not update on their own');
  });

  test('push and run-code allows, in user settings and in a project file, each named; a tool-wide shell allow and a glob whose run-code the user denies are not; a deny clears only where it applies', () => {
    const s = landed();
    s.permissions.allow.push('Bash(git push *)', 'PowerShell(*)', 'mcp__*');
    const p = { permissions: { allow: ['Bash', 'Bash(git push)', 'mcp__playwright-seat-1__*', 'mcp__playwright-seat-11__*'] } };
    const w = run({ user: { label: 'U', settings: s }, files: [{ label: 'P/settings.local.json', folder: 'P', settings: p }] });
    assert.deepEqual(w, [
      'permissions: U allows Bash(git push *), so a push can skip the auto-mode safety check',
      "permissions: U allows mcp__*, which covers playwright's browser_run_code_unsafe (arbitrary code) before the safety check",
      'permissions: P/settings.local.json allows Bash(git push), so a push can skip the auto-mode safety check',
      "permissions: P/settings.local.json allows mcp__playwright-seat-11__*, which covers playwright's browser_run_code_unsafe (arbitrary code) before the safety check",
    ]);
    // Without the user's run-code denies, every playwright glob is named.
    const bare = { permissions: { allow: ['mcp__playwright__*'] } };
    assert.deepEqual(run({ user: { label: 'U', settings: bare }, reviewLens: null }).filter((l) => l.includes('allows')), ["permissions: U allows mcp__playwright__*, which covers playwright's browser_run_code_unsafe (arbitrary code) before the safety check"]);
    // A project file's own run-code deny clears the globs of its folder.
    const own = { permissions: { allow: ['mcp__playwright-seat-11__*'], deny: ['mcp__playwright-seat-11__browser_run_code_unsafe'] } };
    assert.deepEqual(run({ files: [{ label: 'Q/a', folder: 'Q', settings: own }] }), []);
    // So does a sibling file's in the same folder, wherever it sits in the
    // list; another folder's never does, nor does a project's clear the
    // user's own allow.
    const seat11 = 'mcp__playwright-seat-11__*';
    const allows = { permissions: { allow: [seat11] } };
    const denies = { permissions: { deny: ['mcp__playwright-seat-11__browser_run_code_unsafe'] } };
    const runLine = (lbl) => `permissions: ${lbl} allows ${seat11}, which covers playwright's browser_run_code_unsafe (arbitrary code) before the safety check`;
    assert.deepEqual(run({ files: [{ label: 'P/settings.local.json', folder: 'P', settings: allows }, { label: 'P/settings.json', folder: 'P', settings: denies }] }), []);
    assert.deepEqual(run({ files: [{ label: 'P/a', folder: 'P', settings: allows }, { label: 'Q/a', folder: 'Q', settings: denies }] }), [runLine('P/a')]);
    const u = landed();
    u.permissions.allow.push(seat11);
    assert.deepEqual(run({ user: { label: 'U', settings: u }, files: [{ label: 'P/a', folder: 'P', settings: denies }] }), [runLine('U')]);
  });

  test('checkPermissions is allowWarnings, then configWarnings', () => {
    const s = landed();
    s.permissions.allow.push('Bash(git push *)');
    s.autoMode.soft_deny = [];
    const input = { user: { label: 'U', settings: s }, files: [], powershellEnv: undefined, reviewLens: lens };
    const a = allowWarnings(input);
    const c = configWarnings(input);
    assert.equal(a.length, 1);
    assert.equal(c.length, 1);
    assert.deepEqual(checkPermissions(input), [...a, ...c]);
  });

  test('a Bash deny with no PowerShell rule turns PowerShell off; a sibling rule, a user rule or the env var keeps it on', () => {
    const bare = { permissions: { deny: ['Bash(rm -rf *)'] } };
    // The project folder alone: the user settings hold PowerShell rules, so it stays on.
    assert.deepEqual(run({ files: [{ label: 'P/a', folder: 'P', settings: bare }] }), []);
    // A user file with no PowerShell rule: off, in the user scope and in the project.
    const noPs = { permissions: { deny: ['Bash(codex *)'] } };
    const w = run({ user: { label: 'U', settings: noPs }, files: [{ label: 'P/a', folder: 'P', settings: bare }], reviewLens: null });
    assert.deepEqual(w.filter((l) => l.includes('PowerShell tool off')), [
      'permissions: U denies a Bash command and no PowerShell rule applies, so Claude Code turns the PowerShell tool off without a word',
      'permissions: P/a denies a Bash command and no PowerShell rule applies, so Claude Code turns the PowerShell tool off without a word',
    ]);
    // A sibling file in the same folder with any PowerShell rule keeps it on there.
    const sib = run({ user: { label: 'U', settings: { permissions: {} } }, files: [{ label: 'P/a', folder: 'P', settings: bare }, { label: 'P/b', folder: 'P', settings: { permissions: { allow: ['PowerShell(Get-Date)'] } } }], reviewLens: null });
    assert.deepEqual(sib.filter((l) => l.includes('PowerShell tool off')), []);
    // The env var set to anything non-empty, "0" included, keeps it on.
    for (const v of ['1', '0', 'true']) assert.deepEqual(run({ user: { label: 'U', settings: noPs }, powershellEnv: v, reviewLens: null }).filter((l) => l.includes('PowerShell tool off')), [], v);
    // A Bash ASK does not turn it off.
    assert.deepEqual(run({ user: { label: 'U', settings: { permissions: { ask: ['Bash(git push *--force)'] } } }, reviewLens: null }).filter((l) => l.includes('PowerShell tool off')), []);
  });

  test('review-lens missing, or different from its source', () => {
    assert.deepEqual(run({ reviewLens: { deployed: null, source: 'a'.repeat(64) } }), ['review-lens: ~/.claude/agents/review-lens.md is missing, so a workflow naming agentType review-lens gets no read-only lens']);
    assert.deepEqual(run({ reviewLens: { deployed: 'b'.repeat(64), source: 'a'.repeat(64) } }), ['review-lens: ~/.claude/agents/review-lens.md differs from its tracked source (projects/skills/ultramode-code-review/agents/review-lens.md)']);
    assert.deepEqual(run({ reviewLens: null }), [], 'null skips the check');
  });

  test('unreadable files are skipped, never guessed', () => {
    assert.deepEqual(run({ files: [{ label: 'P/a', folder: 'P', settings: null }] }), []);
    assert.deepEqual(checkPermissions({ user: { label: 'U', settings: null }, reviewLens: null }), []);
  });
});

describe('autoModeDrops and skipsSafetyCheck: what the watcher and the patch flag', () => {
  test('autoModeDrops: a tool-wide Bash or PowerShell allow (no content, empty, or only stars and blanks), nothing narrower, no other tool', () => {
    for (const r of ['Bash', 'Bash()', 'Bash(*)', 'Bash( * )', 'Bash(**)', 'PowerShell', 'PowerShell(*)', ' Bash(*) ']) assert.ok(autoModeDrops(r), r);
    for (const r of ['Bash(git push *)', 'Bash(* push *)', 'Bash(python*)', 'Bash(*git)', 'Read', 'Read(*)', 'Agent', 'mcp__playwright__*', 'Skill(*)', '', null, 7]) assert.ok(!autoModeDrops(r), String(r));
  });

  test('skipsSafetyCheck: a push allow auto mode keeps; never one it drops', () => {
    assert.ok(skipsSafetyCheck('Bash(git push *)'));
    assert.ok(skipsSafetyCheck('PowerShell(git push)'));
    assert.ok(skipsSafetyCheck('Bash(python*)'), 'the program-list clauses are not ported: an over-warning');
    for (const r of ['Bash', 'Bash(*)', 'PowerShell(*)']) assert.ok(matchesPush(r) && !skipsSafetyCheck(r), r);
    assert.ok(!skipsSafetyCheck('Bash(npm test)'));
  });

  test("skipsSafetyCheck: a run-code allow, unless `denies` holds its literal server's run-code tool; a wildcard server is never cleared", () => {
    const denies = ['mcp__playwright__browser_run_code_unsafe', 'mcp__playwright-seat-2__browser_run_code_unsafe'];
    for (const r of ['mcp__playwright__*', 'mcp__playwright', 'mcp__playwright__browser_run_code_unsafe', 'mcp__playwright__browser_*']) {
      assert.ok(skipsSafetyCheck(r), `${r} with no denies`);
      assert.ok(!skipsSafetyCheck(r, { denies }), `${r} with its server's deny`);
    }
    assert.ok(!skipsSafetyCheck('mcp__playwright-seat-2__*', { denies }));
    assert.ok(skipsSafetyCheck('mcp__playwright-seat-3__*', { denies }), 'another server: its own deny is missing');
    assert.ok(skipsSafetyCheck('mcp__*', { denies }) && skipsSafetyCheck('mcp__playwright*__*', { denies }), 'a wildcard server');
    assert.ok(skipsSafetyCheck('mcp__play*__*', { denies: ['mcp__play*__browser_run_code_unsafe'] }), 'a wildcard server, even beside a deny spelled with the same wildcard');
    assert.ok(!skipsSafetyCheck('mcp__playwright__browser_click', { denies: [] }), 'a tool that is not run-code');
    const evaluate = { ...CATALOG, playwright: { ...CATALOG.playwright, runCode: 'browser_evaluate' } };
    assert.ok(skipsSafetyCheck('mcp__playwright__*', { catalog: evaluate, denies }), 'the deny is read for the catalog\'s run-code tool');
    assert.ok(!skipsSafetyCheck('mcp__playwright__*', { catalog: evaluate, denies: ['mcp__playwright__browser_evaluate'] }));
  });
});

describe('the catalog parameter: matchesPush and allowsRunCode read the catalog they are given', () => {
  // A push the structural reading cannot see (a wrapper script it does not
  // know), so only a sample naming it can flag its allow.
  const viaScript = { ...CATALOG, pushSamples: [{ shell: 'Bash', command: 'ship-it --to origin' }] };
  const psScript = { ...CATALOG, pushSamples: [{ shell: 'PowerShell', command: 'ship-it --to origin' }] };
  const evaluate = { ...CATALOG, playwright: { ...CATALOG.playwright, runCode: 'browser_evaluate' } };

  test('other push samples change what matchesPush flags', () => {
    assert.ok(!matchesPush('Bash(ship-it *)'), 'the module catalog by default: no sample, no structure');
    assert.ok(matchesPush('Bash(ship-it *)', viaScript));
    // The structural reading covers every real sample, so only a sample it
    // cannot see shows that each sample is tried, not only the first.
    assert.ok(matchesPush('Bash(ship-it *)', { ...CATALOG, pushSamples: [...CATALOG.pushSamples, ...viaScript.pushSamples] }), 'the last sample is tried too');
    assert.ok(!matchesPush('Bash(ship-it *)', psScript), 'a sample is read in its own shell');
    assert.ok(matchesPush('PowerShell(ship-it *)', psScript));
  });

  test('another run-code tool changes what allowsRunCode flags; a server glob reaches any tool', () => {
    assert.ok(allowsRunCode('mcp__playwright__browser_run_code_unsafe'), 'the module catalog by default');
    assert.ok(!allowsRunCode('mcp__playwright__browser_run_code_unsafe', evaluate));
    assert.ok(allowsRunCode('mcp__playwright__browser_evaluate', evaluate));
    assert.ok(allowsRunCode('mcp__playwright__*', evaluate));
  });

  test('checkPermissions passes its catalog on to both', () => {
    const user = { label: 'U', settings: { permissions: { allow: ['Bash(ship-it *)', 'mcp__playwright__browser_run_code_unsafe'] } } };
    const allows = (catalog) => checkPermissions({ user, catalog, powershellEnv: '1' }).filter((l) => l.startsWith('permissions: U allows '));
    assert.deepEqual(allows(CATALOG), ["permissions: U allows mcp__playwright__browser_run_code_unsafe, which covers playwright's browser_run_code_unsafe (arbitrary code) before the safety check"]);
    assert.deepEqual(allows({ ...viaScript, playwright: evaluate.playwright }), ['permissions: U allows Bash(ship-it *), so a push can skip the auto-mode safety check']);
  });
});

describe('the settings walk: settingsFilesUnder and worktreeRoots', () => {
  // A fresh temp root per test (insight 006): every path below comes from it.
  const inTemp = (fn) => {
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'u4-walk-')));
    try {
      return fn(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
  const put = (file, text = '{}') => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  const rel = (root, list) => list.map((f) => path.relative(root, f).split(path.sep).join('/'));
  // git for the fixture's own calls: never this suite's repository, never the
  // machine's git config.
  const fixtureGit = (root, dir, ...args) => {
    const env = Object.fromEntries(Object.entries(gitEnv()).filter(([k]) => !/^GIT_CONFIG/i.test(k)));
    Object.assign(env, { GIT_CONFIG_GLOBAL: path.join(root, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Walk Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Walk Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' });
    const r = spawnSync('git', ['-C', dir, ...args], { env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000 });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.error ?? r.stderr}`);
  };
  const same = (a, b) => fs.realpathSync.native(a) === fs.realpathSync.native(b);

  test('levels 0 to 3, both names, in name order; level 4, node_modules, .git and other names are not read', () => {
    inTemp((root) => {
      for (const d of ['', 'a', 'a/b', 'a/b/c', 'a/b/c/d', 'node_modules/x', '.git/x', 'B']) put(path.join(root, d, '.claude', 'settings.json'));
      put(path.join(root, 'a', '.claude', 'settings.local.json'));
      put(path.join(root, 'a', '.claude', 'settings.backup.json'));
      put(path.join(root, 'a', 'settings.json'), '{}');
      put(path.join(root, 'node_modules', '.claude', 'settings.json'));
      const levels3 = ['.claude/settings.json', 'B/.claude/settings.json', 'a/.claude/settings.json', 'a/.claude/settings.local.json', 'a/b/.claude/settings.json', 'a/b/c/.claude/settings.json'];
      assert.deepEqual(rel(root, settingsFilesUnder(root)), levels3);
      assert.deepEqual(rel(root, settingsFilesUnder(root, { depth: 1 })), levels3.slice(0, 4));
      assert.deepEqual(rel(root, settingsFilesUnder(root, { depth: 0 })), ['.claude/settings.json']);
    });
  });

  test('a link to a folder is not followed; a folder named settings.json is listed, for the reader to report', () => {
    inTemp((root) => {
      const outside = path.join(root, 'outside');
      put(path.join(outside, '.claude', 'settings.json'));
      const tree = path.join(root, 'tree');
      fs.mkdirSync(tree);
      fs.symlinkSync(outside, path.join(tree, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
      fs.mkdirSync(path.join(tree, 'odd', '.claude', 'settings.json'), { recursive: true });
      assert.deepEqual(rel(tree, settingsFilesUnder(tree)), ['odd/.claude/settings.json']);
      assert.deepEqual(settingsFilesUnder(path.join(root, 'no-such-folder')), []);
    });
  });

  test("worktreeRoots: git's list, the main worktree first; a folder that is not a repository's top throws", () => {
    inTemp((root) => {
      put(path.join(root, 'gitconfig'), '');
      const mono = path.join(root, 'mono');
      const wt = path.join(root, 'wt');
      put(path.join(mono, 'README.md'), 'fixture\n');
      fixtureGit(root, mono, 'init', '-q', '-b', 'main');
      fixtureGit(root, mono, 'add', 'README.md');
      fixtureGit(root, mono, 'commit', '-qm', 'fixture');
      fixtureGit(root, mono, 'worktree', 'add', '-q', wt, '-b', 'side');
      const list = worktreeRoots(mono, { timeoutMs: 30_000 });
      assert.equal(list.length, 2, JSON.stringify(list));
      assert.ok(same(list[0], mono) && same(list[1], wt), JSON.stringify(list));
      // Inside the repository but not its top: the ceiling stops git climbing.
      fs.mkdirSync(path.join(mono, 'sub'));
      assert.throws(() => worktreeRoots(path.join(mono, 'sub'), { timeoutMs: 30_000 }));
      fs.mkdirSync(path.join(root, 'plain'));
      assert.throws(() => worktreeRoots(path.join(root, 'plain'), { timeoutMs: 30_000 }));
    });
  });
});
