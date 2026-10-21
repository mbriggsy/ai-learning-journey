import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { parseGitAdds, parseGitEvidence, parsePorcelainZ } from '../scripts/mine-paths.mjs';

const WIN = process.platform === 'win32';
const CWD = path.join(os.tmpdir(), 'squeaky-parse-fixture', 'repo');
const at = (...p) => path.resolve(CWD, ...p);
const ABS = CWD.replace(/\\/g, '/'); // CWD spelled for an absolute cd in a bash command
const bash = (cmd, cwd = CWD) => parseGitAdds(cmd, 'bash', cwd);
const pwsh = (cmd, cwd = CWD) => parseGitAdds(cmd, 'pwsh', cwd);

describe('parseGitAdds: what counts', () => {
  test('plain, quoted and chained adds', () => {
    assert.deepEqual(bash('git add a.txt'), [at('a.txt')]);
    assert.deepEqual(bash(`git add "a b.txt" && git add 'c d.txt'`), [at('a b.txt'), at('c d.txt')]);
    assert.deepEqual(bash('git add one.txt; git add two.txt || echo no | cat'), [at('one.txt'), at('two.txt')]);
    assert.deepEqual(bash('git status\ngit add n1.txt\ngit add n2.txt'), [at('n1.txt'), at('n2.txt')]);
    assert.deepEqual(bash('git stage s.txt'), [at('s.txt')]);
  });

  test('git -C <dir>, relative and absolute, and repeated -C', () => {
    assert.deepEqual(bash('git -C sub add x.txt'), [at('sub', 'x.txt')]);
    assert.deepEqual(bash('git -C sub -C deeper add x.txt'), [at('sub', 'deeper', 'x.txt')]);
    const abs = path.join(os.tmpdir(), 'squeaky-parse-fixture', 'other');
    assert.deepEqual(bash(`git -C "${abs.replace(/\\/g, '/')}" add y.txt`), [path.resolve(abs, 'y.txt')]);
    assert.deepEqual(bash('git -c core.autocrlf=false --no-pager add z.txt'), [at('z.txt')]);
  });

  test('a record\'s cwd is stamped after the call: with a cd anywhere in it, only absolute paths and paths after an absolute cd resolve', () => {
    assert.deepEqual(bash('cd sub && git add z.txt'), [], 'the record cwd may already be sub: never guessed');
    assert.deepEqual(bash('git add TODO.md && cd ../the-back-nine && pnpm typecheck'), [],
      'the add ran before the cd, from a start the record does not show');
    assert.deepEqual(bash(`cd ${ABS} && git add z.txt`), [at('z.txt')]);
    assert.deepEqual(bash(`(cd ${ABS}/sub && git add in.txt) && git add out.txt`), [at('sub', 'in.txt')], 'out.txt has no known base');
    assert.deepEqual(bash(`cd ${ABS} && (cd sub && git add in.txt) && git add out.txt`), [at('sub', 'in.txt'), at('out.txt')],
      'a subshell cd does not leak');
    assert.deepEqual(bash(`git add "${ABS}/abs.txt" && cd elsewhere`), [at('abs.txt')]);
    assert.deepEqual(bash('echo "cd later" && git add q.txt'), [], 'even a quoted cd makes the start unknown');
    assert.deepEqual(bash(`cd ${ABS} && cd && git add lost.txt`), [], 'cd with no argument goes somewhere unknown');
    assert.deepEqual(bash(`cd ${ABS} && cd "$SOMEWHERE" && git add lost.txt`), []);
    assert.deepEqual(bash('env --chdir=sub git add f.txt'), [], 'env --chdir moves the command somewhere the record does not show');
    assert.deepEqual(bash('env -C sub git add f.txt'), []);
    assert.deepEqual(bash(`env -C ${ABS}/sub git add f.txt`), [at('sub', 'f.txt')], 'an absolute env -C names where the add ran');
    assert.deepEqual(bash(`env --chdir=${ABS}/sub git add f.txt`), [at('sub', 'f.txt')]);
  });

  test('after --, a dash-leading name is a path', () => {
    assert.deepEqual(bash('git add -- -weird.txt'), [at('-weird.txt')]);
    assert.deepEqual(bash('git add -f -- kept.txt'), [at('kept.txt')]);
  });

  test('env assignments, wrappers and redirections are stepped over', () => {
    assert.deepEqual(bash('GIT_OPTIONAL_LOCKS=0 git add a.txt'), [at('a.txt')]);
    assert.deepEqual(bash('env FOO=1 git add a.txt'), [at('a.txt')]);
    assert.deepEqual(bash('env -u FOO git add a.txt'), [at('a.txt')], 'an env option that takes a value');
    assert.deepEqual(bash('git add a.txt 2>&1 | tail -1'), [at('a.txt')]);
    assert.deepEqual(bash('git add a.txt >/dev/null 2>/dev/null'), [at('a.txt')]);
    assert.deepEqual(bash('git add a.txt > out.log'), [at('a.txt')]);
    assert.deepEqual(bash('if git add a.txt; then echo ok; fi'), [at('a.txt')]);
  });

  test('a full path to the git binary still counts', () => {
    assert.deepEqual(pwsh(`& 'git.exe' add p.txt`), [at('p.txt')]);
  });

  test('bash: unquoted backslashes are escapes, exactly as bash would pass them', () => {
    assert.deepEqual(bash('git add my\\ file.txt'), [at('my file.txt')]);
  });

  test('bash on Windows: /c/... paths are drive paths', { skip: !WIN && 'Windows-only' }, () => {
    const drive = CWD[0].toLowerCase();
    const msys = `/${drive}/${CWD.slice(3).replace(/\\/g, '/')}/m.txt`;
    assert.deepEqual(bash(`git add ${msys}`), [at('m.txt')]);
    assert.deepEqual(bash('git add /tmp/x.txt'), [], 'a POSIX-rooted path maps somewhere unknown');
  });

  test('PowerShell quoting, separators and call operator', () => {
    assert.deepEqual(pwsh(`git add -- 'a b.txt'; git add "c.txt"`), [at('a b.txt'), at('c.txt')]);
    assert.deepEqual(pwsh(`git add 'it''s.txt'`), [at("it's.txt")]);
    assert.deepEqual(pwsh('git add a.txt && git add b.txt'), [at('a.txt'), at('b.txt')]);
    assert.deepEqual(pwsh('& git add c.txt'), [at('c.txt')]);
    assert.deepEqual(pwsh('Set-Location sub; git add d.txt'), [], 'a relative Set-Location from an unknown start');
    assert.deepEqual(pwsh(`Set-Location '${CWD}'; Set-Location sub; git add d.txt`), [at('sub', 'd.txt')]);
  });
});

describe('parseGitAdds: what never counts', () => {
  test('wildcard adds: ., -A, --all, -u, globs, pathspec magic', () => {
    for (const cmd of ['git add .', 'git add -A', 'git add --all', 'git add -u', 'git add --update',
      'git add src/*.ts', 'git add "*.md"', 'git add file?.txt', 'git add ":(glob)**"', 'git add :/', 'git add ./']) {
      assert.deepEqual(bash(cmd), [], cmd);
    }
    assert.deepEqual(bash('git add -A named.txt'), [at('named.txt')], 'an explicitly named file still counts');
  });

  test('dry runs add nothing', () => {
    assert.deepEqual(bash('git add -n x.txt'), []);
    assert.deepEqual(bash('git add --dry-run x.txt'), []);
    assert.deepEqual(bash('git add -nv x.txt'), []);
  });

  test('unresolvable expansions are dropped, not guessed', () => {
    assert.deepEqual(bash('git add "$FILE"'), []);
    assert.deepEqual(bash('git add $(cat list.txt)'), []);
    assert.deepEqual(bash('git add `ls`'), []);
    assert.deepEqual(pwsh('git add $f'), []);
    assert.deepEqual(pwsh('git add "$env:X/y.txt"'), []);
  });

  test('git add text inside quotes, comments, heredocs and here-strings is not a command', () => {
    assert.deepEqual(bash('git commit -m "fix; git add evil.txt"'), []);
    assert.deepEqual(bash('echo \'git add evil.txt\''), []);
    assert.deepEqual(bash('# git add evil.txt\ngit add good.txt'), [at('good.txt')]);
    assert.deepEqual(bash("git commit -F - <<'EOF'\ngit add evil.txt\nEOF\ngit add good.txt"), [at('good.txt')]);
    assert.deepEqual(bash('cat <<-END | git commit -F -\n\tgit add evil.txt\n\tEND\ngit add good.txt'), [at('good.txt')]);
    assert.deepEqual(pwsh("git commit -m @'\ngit add evil.txt\n'@\ngit add good.txt"), [at('good.txt')]);
    assert.deepEqual(pwsh("$m=@'\nit's here: git add evil.txt\n'@\ngit add good.txt"), [at('good.txt')], 'a here-string right after an assignment');
    assert.deepEqual(pwsh('$m=@"\ngit add evil.txt\n"@\ngit add good.txt'), [at('good.txt')]);
  });

  test('other git commands and other programs add nothing', () => {
    assert.deepEqual(bash('git commit -a -m x'), []);
    assert.deepEqual(bash('git rm old.txt; git mv a.txt b.txt'), []);
    assert.deepEqual(bash('echo git add x.txt'), []);
    assert.deepEqual(bash('xargs git add < list.txt'), []);
  });

  test('a relative path with no known base is dropped', () => {
    assert.deepEqual(parseGitAdds('git add a.txt', 'bash', undefined), []);
    assert.deepEqual(parseGitAdds('git add a.txt', 'bash', 'relative/base'), [], 'a relative cwd is no base');
  });
});

describe('parseGitAdds: command substitutions and block comments stop the count', () => {
  // Claude's own commit form. The body holds a quote pair and the text `git add`.
  const COMMIT = 'git commit -m "$(cat <<\'EOF\'\nfix: old step ran "git status && git add TODO.md notes.md" then commit\nEOF\n)"';

  test('bash: Claude\'s git commit -m "$(cat <<\'EOF\' ...)" form yields no adds from its body', () => {
    assert.deepEqual(bash(COMMIT), []);
  });

  test('bash: adds before the substitution keep their evidence; nothing after it counts', () => {
    assert.deepEqual(bash(`git add a.txt && ${COMMIT}`), [at('a.txt')]);
    assert.deepEqual(bash('git add a.txt && git commit -m "$(cat <<\'EOF\'\nbody\nEOF\n)"'), [at('a.txt')]);
    assert.deepEqual(bash('git add a.txt; echo "built at `date`"; git add b.txt'), [at('a.txt')]);
    assert.deepEqual(bash('git add a.txt; echo "\\$(not a substitution)"; git add b.txt'), [at('a.txt'), at('b.txt')]);
  });

  test('bash: an unquoted $( ), backtick or $\'...\' stops the count too', () => {
    assert.deepEqual(bash('git add a.txt; echo $(date); git add b.txt'), [at('a.txt')]);
    assert.deepEqual(bash('git add `grep -l x f`'), [], 'the substitution\'s words are not paths');
    assert.deepEqual(bash('git add a.txt `ls` b.txt'), [at('a.txt')]);
    assert.deepEqual(bash("git add $'a\\tb.txt' c.txt"), []);
    assert.deepEqual(bash("git add c.txt $'x'; git add d.txt"), [at('c.txt')]);
  });

  test('PowerShell: an unquoted $( ) subexpression stops the count too', () => {
    assert.deepEqual(pwsh('git add a.txt; $x = $(Get-Date); git add b.txt'), [at('a.txt')]);
  });

  test('PowerShell: a "$( )" subexpression stops the count the same way', () => {
    assert.deepEqual(pwsh('git add a.txt; git commit -m "at $(Get-Date)"; git add b.txt'), [at('a.txt')]);
    assert.deepEqual(pwsh('git commit -m "$(\'x" ; git add evil.txt ; "y\')"'), []);
  });

  test('PowerShell: a <# ... #> block comment, on one line or many, holds no commands', () => {
    assert.deepEqual(pwsh('<# git add x.txt #> git add good.txt'), [at('good.txt')]);
    assert.deepEqual(pwsh('<#\ngit add x.txt\n#>\ngit add good.txt'), [at('good.txt')]);
    assert.deepEqual(pwsh('<# never closed\ngit add x.txt'), []);
  });
});

describe('parseGitAdds: a cd that runs in a subshell or a job moves nothing', () => {
  // Each starts from an absolute cd, so the base is known before the cd under test.
  test('bash: a cd in a pipeline (| or |&) or in the background', () => {
    assert.deepEqual(bash(`cd ${ABS} && cd sub | cat; git add a.txt`), [at('a.txt')]);
    assert.deepEqual(bash(`cd ${ABS} && echo x | cd sub; git add a.txt`), [at('a.txt')]);
    assert.deepEqual(bash(`cd ${ABS} && echo x |& cd sub; git add a.txt`), [at('a.txt')]);
    assert.deepEqual(bash(`cd ${ABS} && cd sub & git add a.txt`), [at('a.txt')]);
    assert.deepEqual(bash(`cd ${ABS} && cd sub &\ngit add a.txt`), [at('a.txt')]);
    assert.deepEqual(bash(`cd ${ABS} && cd sub && git add a.txt | cat`), [at('sub', 'a.txt')], 'a git add in a pipeline still counts');
  });

  test('PowerShell: a pipeline\'s first command moves the base; a piped-into cd makes it unknown; & backgrounds', () => {
    const from = `Set-Location '${CWD}'; `;
    assert.deepEqual(pwsh(`${from}Set-Location sub | Out-Null; git add d.txt`), [at('sub', 'd.txt')]);
    assert.deepEqual(pwsh(`${from}"x" | Set-Location sub; git add d.txt`), []);
    assert.deepEqual(pwsh(`${from}Set-Location sub & git add d.txt`), [at('d.txt')]);
  });
});

describe('parseGitEvidence: git mv and git rm', () => {
  const ev = (cmd, dialect = 'bash') => parseGitEvidence(cmd, dialect, CWD).map((f) => [f.kind, f.path]);

  test('git mv names its source as removed and its destination as moved', () => {
    assert.deepEqual(ev('git mv old.txt new.txt'), [['removed', at('old.txt')], ['moved', at('new.txt')]]);
    assert.deepEqual(ev('git mv -f a.txt b.txt c-dir', 'pwsh'),
      [['removed', at('a.txt')], ['moved', at('c-dir')], ['removed', at('b.txt')], ['moved', at('c-dir')]]);
    assert.equal(parseGitEvidence('git mv a.txt b.txt c-dir', 'bash', CWD)[1].into, true, 'several sources land inside the folder');
  });

  test('git rm, --cached or not, names each path as removed', () => {
    assert.deepEqual(ev('git rm old.txt'), [['removed', at('old.txt')]]);
    assert.deepEqual(ev('git rm --cached -q -- kept.txt other.txt'), [['removed', at('kept.txt')], ['removed', at('other.txt')]]);
  });

  test('dry runs, mv -k, globs and unresolvable mv arguments count for nothing', () => {
    for (const cmd of ['git mv -n a.txt b.txt', 'git mv -k a.txt b.txt', 'git mv a.txt "$DEST"', 'git mv "*.txt" dir',
      'git rm -n a.txt', 'git rm --dry-run a.txt', 'git rm "*.log"', 'git rm -r .', 'git mv a.txt']) {
      assert.deepEqual(ev(cmd), [], cmd);
    }
  });

  test('git mv and git rm are never git add', () => {
    assert.deepEqual(bash('git rm old.txt; git mv a.txt b.txt'), []);
  });
});

describe('parseGitEvidence: commands that take back git add/mv/rm evidence', () => {
  const rv = (cmd, dialect = 'bash') => parseGitEvidence(cmd, dialect, CWD)
    .filter((f) => f.kind === 'revoke').map((f) => [f.path, f.orAll === true]);

  test('unstaging: git restore --staged, and git reset in any mode, --hard included', () => {
    assert.deepEqual(rv('git restore --staged a.txt'), [[at('a.txt'), false]]);
    assert.deepEqual(rv('git restore -S a.txt b.txt'), [[at('a.txt'), false], [at('b.txt'), false]]);
    assert.deepEqual(rv('git restore -SW a.txt'), [[at('a.txt'), false]]);
    assert.deepEqual(rv('git restore --staged --pathspec-from-file=list.txt'), [[null, false]]);
    assert.deepEqual(rv('git reset'), [[null, false]], 'no paths: every path');
    assert.deepEqual(rv('git reset -- a.txt'), [[at('a.txt'), false]]);
    assert.deepEqual(rv('git reset HEAD a.txt'), [[at('HEAD'), false], [at('a.txt'), false]]);
    assert.deepEqual(rv('git reset --soft HEAD~1'), [[at('HEAD~1'), true]], 'one word: a commit or a path, decided on disk');
    assert.deepEqual(rv('git reset --hard'), [[null, false]]);
    assert.deepEqual(rv('git reset --hard HEAD~2'), [[at('HEAD~2'), true]]);
    assert.deepEqual(rv('git reset "$X"'), [[null, true]]);
    assert.deepEqual(rv('git reset --pathspec-from-file=list.txt'), [[null, false]]);
  });

  test('git stash push, save or bare: the paths it names, or every path', () => {
    assert.deepEqual(rv('git stash'), [[null, false]]);
    assert.deepEqual(rv('git stash -m wip'), [[null, false]]);
    assert.deepEqual(rv('git stash push -m wip'), [[null, false]]);
    assert.deepEqual(rv('git stash push -- a.txt'), [[at('a.txt'), false]]);
    assert.deepEqual(rv('git stash push a.txt'), [[at('a.txt'), false]]);
    assert.deepEqual(rv('git stash save wip'), [[null, false]]);
    assert.deepEqual(rv('git stash push --pathspec-from-file=list.txt'), [[null, false]]);
  });

  test('git stash list, show, drop, clear, create, store, branch, pop and apply take back nothing', () => {
    for (const sub of ['list', 'show -p', 'drop', 'clear', 'create', 'store abc1234', 'branch b', 'pop', 'apply --index']) {
      assert.deepEqual(rv(`git stash ${sub}`), [], sub);
    }
  });

  test('a worktree discard takes back nothing: the replay already contests a file it changed', () => {
    for (const cmd of ['git restore a.txt', 'git restore -W a.txt', 'git checkout -- a.txt', 'git checkout .',
      'git clean -fd', 'git clean -f build']) assert.deepEqual(rv(cmd), [], cmd);
    assert.deepEqual(rv('git restore "src/*.ts"', 'pwsh'), []);
  });

  test('git checkout from a tree-ish rewrites index entries: it takes back the paths it names; -f and a pathspec file take back all', () => {
    assert.deepEqual(rv('git checkout main -- a.txt'), [[at('a.txt'), false]]);
    assert.deepEqual(rv('git checkout HEAD~1 -- a.txt b.txt'), [[at('a.txt'), false], [at('b.txt'), false]]);
    assert.deepEqual(rv('git checkout HEAD a.txt'), [[at('HEAD'), false], [at('a.txt'), false]], 'no --: every word may be a path');
    assert.deepEqual(rv('git checkout HEAD .'), [[null, false]]);
    assert.deepEqual(rv('git checkout -f main'), [[null, false]]);
    assert.deepEqual(rv('git checkout --pathspec-from-file=list.txt HEAD'), [[null, false]]);
    for (const cmd of ['git checkout main', 'git checkout -- a.txt', 'git checkout .', 'git checkout -b feature main']) assert.deepEqual(rv(cmd), [], cmd);
  });

  test('each revocation names its git subcommand', () => {
    assert.deepEqual(parseGitEvidence('git stash && git reset -- a.txt && git checkout HEAD -- b.txt', 'bash', CWD)
      .filter((e) => e.kind === 'revoke').map((e) => e.sub), ['stash', 'reset', 'checkout']);
  });

  test('a dry run, a branch switch or a new branch revokes nothing', () => {
    for (const cmd of ['git clean -n', 'git clean --dry-run -d', 'git checkout -b feature', 'git checkout -b feature main', 'git checkout']) {
      assert.deepEqual(rv(cmd), [], cmd);
    }
  });

  test('a revoking git command in text past a substitution still takes back everything', () => {
    assert.deepEqual(rv('git commit -m "$(cat <<\'EOF\'\nmsg\nEOF\n)" && git restore --staged x.txt'), [[null, false]]);
    assert.deepEqual(rv('git commit -m "$(cat <<\'EOF\'\nfix: reset handling and the checkout page\nEOF\n)"'), [],
      'the words alone, in prose, are not a git command');
    assert.deepEqual(rv('git commit -m "$(date)" && git checkout main -- x.txt'), [[null, false]]);
  });

  test('past a substitution, only what the same rules call a staging revoker revokes', () => {
    for (const tail of ['git stash list', 'git stash show -p', 'git restore x.txt', 'git checkout -- x.txt', 'git checkout main']) {
      assert.deepEqual(rv(`git commit -m "$(date)" && ${tail}`), [], tail);
    }
    for (const tail of ['git stash', 'git reset --hard', 'git restore -S x.txt']) {
      assert.deepEqual(rv(`git commit -m "$(date)" && ${tail}`), [[null, false]], tail);
    }
  });
});

describe('parseGitAdds: a Git Bash cwd', () => {
  test('a /c/... cwd resolves like its C:\\... spelling', { skip: !WIN && 'Windows-only' }, () => {
    const msys = `/${CWD[0].toLowerCase()}/${CWD.slice(3).replace(/\\/g, '/')}`;
    assert.deepEqual(bash('git add a.txt', msys), [at('a.txt')]);
    assert.deepEqual(pwsh('git add a.txt', msys), [at('a.txt')]);
    assert.deepEqual(bash('git add a.txt', '/tmp/somewhere'), [], 'a POSIX root Git Bash maps elsewhere is unknown');
  });
});

describe('parsePorcelainZ', () => {
  test('renames and copies carry the original path as an extra field', () => {
    const z = 'RM new.txt\0old.txt\0 M plain.txt\0?? fresh.txt\0 R itanew.txt\0itaold.txt\0';
    assert.deepEqual(parsePorcelainZ(z), [
      { x: 'R', y: 'M', path: 'new.txt', orig: 'old.txt' },
      { x: ' ', y: 'M', path: 'plain.txt', orig: null },
      { x: '?', y: '?', path: 'fresh.txt', orig: null },
      { x: ' ', y: 'R', path: 'itanew.txt', orig: 'itaold.txt' },
    ]);
  });
});
