// A model executes SKILL.md, so its rules are a contract like the scripts'.
// Each rule is pinned to the step where it acts, and every flag SKILL.md
// passes to a script must be one the script accepts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { SCRIPTS, rm, runScript, scratch } from './_helpers.mjs';

const SKILL = fs.readFileSync(path.join(SCRIPTS, '..', 'SKILL.md'), 'utf8');
const source = (name) => fs.readFileSync(path.join(SCRIPTS, name), 'utf8');
const header = (name) => source(name).split('\nimport ')[0];
const flat = (s) => s.replace(/\n(?:\/\/ ?)?/g, ' ').replace(/ {2,}/g, ' ');

// The text of one "### N." step, up to the next step or section.
function step(n) {
  const m = new RegExp(`^### ${n}\\. [^\\n]*\\n([\\s\\S]*?)(?=^### |^## )`, 'm').exec(SKILL);
  assert.ok(m, `SKILL.md has no step ${n}`);
  return m[1];
}

const STOP = /Don't push; steps 8 and 9 still run; the final report leads with the stop\./;

let cwd;
before(() => { cwd = scratch('squeaky-docs-'); });
after(() => rm(cwd));

describe('SKILL.md carries each rule in the step where it acts', () => {
  test('step 0: peers and ownership are known before anything edits; a twin edits nothing; an unknown twin waits for Briggsy', () => {
    const s = step(0);
    assert.match(s, /Before anything edits a file, run both from the project root/);
    assert.match(s, /\*\*`twin: true`:\*\*.*Steps 1 and 2 edit nothing: the TODO close block and any failing check go into the final report\. Steps 4 and 6 are skipped\./);
    assert.match(s, /\*\*`twin: null`, unknown:\*\* with `ok: false` \(peers\.mjs couldn't check\) or with `ok: true` \(a live registry entry it couldn't read, or no session id\)\. Rerun peers\.mjs once\. Still `null`: ask Briggsy whether this session is open in another terminal\. Edits in steps 1 and 2, and steps 4 and 6, wait for his no\. Steps 4 and 6 apply this same rule/);
    assert.match(s, /Never edit a `foreign`, `peerStaged` or `contested` path/);
    assert.match(s, /\*\*`vanished` not empty:\*\* report it before anything else: name each path with its reason, and run `git stash list`\. A `vanished` path is not clean: steps 1 and 2 never edit it\. Steps 4 and 6 still run\./);
    assert.match(s, /or a clean file \(not dirty at all, and not in `vanished`\)/);
    assert.match(s, /--out "<scratchpad>\/squeaky-step0-\$\{CLAUDE_SESSION_ID\}\.json"/);
    assert.match(s, /With `--out`, mine-paths writes its whole output to that file and prints one line, `wrote <file>: mine N, mineNew N, \.\.\.`, then a `warning:` line per warning, so the Bash tool's 30000-character cut never hides anything\. Read the file for the lists, here and in steps 3, 6 and 9/);
    assert.match(s, /\*\*`transcripts: 0`:\*\* the session id matched nothing, so no path can be this session's\. Steps 1 and 2 make no edits/);
    assert.match(s, /A detached HEAD \(`branch: null`\) never commits through squeaky: step 6 stops with exit 5/);
    assert.match(s, /A `branch` other than `defaultBranch` commits only on his yes, asked again in step 3/);
    assert.doesNotMatch(s, /detached HEAD[^.]*only on his yes/);
  });

  test('step 1: TODO.md is edited only when clean or mine, and why a clean one may be edited with others live', () => {
    const s = step(1);
    assert.match(s, /Edit it only when step 0 shows it clean or in `mine`/);
    assert.match(s, /A clean TODO\.md may be edited even with other sessions live: it holds nobody's pending work, and a peer's edit to it, before yours or after, leaves lines your recorded edits don't account for, which step 3 shows as `foreign-hunks`, so it is never committed unasked/);
    assert.match(s, /\(`foreign`, `peerStaged` or `contested`\), or step 0 says edit nothing, leave it/);
  });

  test('step 2: a clean file is fixed only with nobody else live, and says why', () => {
    const s = step(2);
    assert.match(s, /Fix one in a clean file only when step 0's peers\.mjs shows `anyOtherLive: false`: with another session live, a check can fail in a clean file because of that session's change somewhere else/);
    assert.match(s, /leave it, name the file and the error, and go on/);
  });

  test('step 3: the saved list, the per-file limit, every contested reason, staged flags, warnings, malformed lines and the transcripts stop', () => {
    const s = step(3);
    assert.match(s, /--out "<scratchpad>\/squeaky-step3-\$\{CLAUDE_SESSION_ID\}\.json"/);
    assert.match(s, /a `mine` file is committed whole, as it is on disk\. mine-paths replays this session's own recorded edits \(the values each tool applied\) on the committed file, in order, and a file goes to `contested` \(`foreign-hunks`\) unless that replay reproduces the disk exactly, each edit finding what it found when it ran/);
    assert.match(s, /What can still ride along unseen is a change the transcripts can't show that leaves the file byte for byte as this session's edits would, and line endings where they go unchecked: when HEAD's copy mixes styles, when the file is new, or when a Write touched it/);
    assert.match(s, /A later `git restore --staged`, `git reset`, `git stash` \(push, save or bare\) or `git checkout <tree-ish> -- <paths>` takes back this session's `git add` \/ `mv` \/ `rm` evidence for the paths it names, or all of it when it names none, with a warning naming its git subcommand; a path it took back that is still dirty is contested `revoked`/);
    assert.match(s, /A deletion is mine only when this session's last call on the path was its own `git rm`, or a `git mv` away from it, and the file is gone from disk; a `git add` never proves one, and a rename's source side is a deletion like any other/);
    assert.match(s, /`rm-cached`: out of the index but still on disk \(a `git rm --cached` of an ignored file too\)/);
    assert.match(s, /Neither side goes in alone: `--include` one side only together with its `pair`/);
    assert.match(s, /`deleted`: the `mine` paths step 6 commits as deletions\. Show them to Briggsy as deletions/);
    assert.match(s, /`pairs`: each rename among `mine` and `mineNew`, as `\[from, to\]`\. Step 6 commits or excludes both sides together/);
    assert.match(s, /`vanished`: this session's work that is gone from a path git status shows clean, each with a `reason`: `edits gone` .*, `new file gone` .*, or `git rm or git mv undone` .*\. Step 9 never reads clean while this isn't empty/);
    assert.match(s, /0 and 0 with no `detail` means the replay matched, so every line is this session's; any `detail` means the disk differs from the replay, whatever the counts/);
    assert.doesNotMatch(s, /0 and 0: every line is this session's/);
    assert.match(s, /`twin` can be `null` with `ok: true` too \(a live entry it couldn't read, or no session id\)\. Either way step 0's rule applies/);
    assert.doesNotMatch(s, /`checkout`, `reset`, `stash` or `clean` revokes it/);
    assert.match(s, /A notebook this session changed with NotebookEdit always lands in `contested`: its edits can't be replayed/);
    assert.match(s, /`sha`: the sha1 of each `mine` and `mineNew` file's bytes \(`null`: a deletion\); each `contested` entry carries its own `sha`/);
    assert.match(s, /`branch` and `defaultBranch`: a detached HEAD \(`branch: null`\) never commits through squeaky: step 6 stops with exit 5; report it\. On a `branch` other than `defaultBranch`, ask Briggsy before step 6 whether to commit there\. On his no, skip steps 6 and 7 \(no push\); steps 8 and 9 still run/);
    for (const r of ['staged-elsewhere', 'staged-by-failed-command', 'revoked', 'rename-split', 'deleted-outside-git', 'unconfirmed', 'committed-since', 'case-mismatch', 'rm-cached', 'foreign-hunks']) {
      assert.match(s, new RegExp(`^- \`${r}\`: `, 'm'), r);
    }
    assert.match(s, /`staged-elsewhere`: staged with no per-file `git add`, `git mv` or `git rm` of ours that we can prove\. A peer staged it, or this session did through a folder, glob, `-u` or variable add, or a commit-mine run couldn't unstage it/);
    assert.doesNotMatch(s, /someone else staged it\./);
    assert.match(s, /`deleted-outside-git`: deleted, and this session's last call on it was not its own `git rm` or a `git mv` away from it: a shell `mv` or `rm`, a peer's `git rm`, or a `git add` that staged someone's deletion/);
    assert.match(s, /`rename-split`: one side of a rename \(git status's R, or a `git mv` of ours\) is this session's, the other \(`pair`\) isn't, or isn't provably\. Neither side goes in alone/);
    assert.match(s, /`foreign-hunks`: it would be `mine`, but it holds lines this session's recorded edits don't account for — a peer's, or this session's own unrecorded change \(a shell command, a formatter, a killed call\)/);
    assert.match(s, /`foreign-hunks`:.*Committing it would commit those lines under this session's message\./);
    assert.match(s, /for one with `staged: true`, say the index holds it staged, possibly by a peer/);
    assert.match(s, /both scripts' `warnings` verbatim/);
    assert.match(s, /`malformed transcript line` warning:.*Before step 6, show `mine`, `mineNew` and `contested`/);
    assert.match(s, /\*\*`transcripts: 0`:\*\*.*Stop: skip steps 4 to 7\./);
    assert.match(s.split('\n').find((l) => l.includes('`transcripts: 0`')), STOP);
    assert.match(s, /`twin` is `null`, unknown/);
  });

  test('step 4: peers rerun with its twin check, then temp/ through --delete-temp, never by hand', () => {
    const s = step(4);
    assert.match(s, /Rerun peers\.mjs right before: `twin: true` skips this step, and `twin: null` follows step 0's rule \(rerun once; still `null`, go on only on Briggsy's no\)/);
    assert.match(s, /Exit 2 \(.*the session registry can't name this session's own folder or names another one.*\) deleted nothing: report its stderr/);
    assert.match(s, /and its `warnings`: show them verbatim/);
    assert.match(s, /The `squeaky-\*-\$\{CLAUDE_SESSION_ID\}` files stay until after step 9 \(step 6 reads them\)\. Under `twin: true` or `twin: null` the scratchpad is left alone/);
    assert.match(s, /mine-paths\.mjs" --session "\$\{CLAUDE_SESSION_ID\}" --temp-dir temp --delete-temp/);
    assert.match(s, /what it `kept` \(not proven this session's, or changed since this session last touched it\)/);
    assert.match(s, /Never delete anything in `temp\/` by hand/);
    assert.match(s, /Delete only when it shows `ok: true` and `anyOtherLive: false`/);
    assert.match(s, /\*\*Never delete a path git status lists:\*\* one in `mine`, `mineNew`, `contested` or `foreign` .* stays, and step 6 commits it or `--exclude`s it\./);
    assert.doesNotMatch(s, /a peer's, or a drop/);
  });

  test('step 5: doc drift reads this session\'s own lists, never a plain git diff', () => {
    const s = step(5);
    assert.match(s, /Read the `\.md` paths in step 3's `mine` and `mineNew` lists/);
    assert.doesNotMatch(s, /Run `git diff/);
  });

  test('step 6: peers rerun, session-bound files, --expect, file: lines, secrets, every exit code and every stop', () => {
    const s = step(6);
    assert.match(s, /Rerun peers\.mjs first: `twin: true` skips this step, and `twin: null` follows step 0's rule \(rerun once; still `null`, go on only on Briggsy's no\)/);
    assert.match(s, /A detached HEAD never commits \(commit-mine stops with exit 5\)\. A branch other than `defaultBranch` goes on only on his yes from step 3; on his no, skip this step and step 7/);
    assert.match(s, /prints only its one summary line, so commit-mine's lines below are never cut/);
    assert.match(s, /If the command is killed \(the 10-minute timeout, ESC\), rerun from step 3: the new files may be left staged, and they show there as contested `staged-elsewhere`; they are ours/);
    assert.match(s, /a rename in `pairs` takes both sides or neither \(one side alone is refused\)\. An excluded `mine` path this session staged is unstaged before the commit, so on every exit from there \(`unstaged \(excluded\): <path>`\)/);
    assert.match(s, /left staged and named \(`left staged \(excluded\):`\), and an unstage that fails is exit 1/);
    assert.match(s, /On any exit, stderr says what of ours the index still holds; read it before the exit code's own rule\. "Nothing was staged" or "Nothing of ours is staged" means none\. "They are still staged: <paths>" names this session's own new files/);
    assert.match(s, /A step-3 path that is clean now was taken by a commit made since \(reported\), became git-ignored \(reported\), or lost this session's work \(exit 6\)/);
    assert.match(s, /with a 10-minute Bash timeout \(`timeout: 600000`/);
    assert.match(s, /`--expect` is required: it is the file step 3 showed Briggsy, and his yes covers exactly the bytes in it/);
    assert.match(s, /It hashes every path again before every `git add` and `git commit` attempt, lock retries included, and refuses any change\. What remains is the moment between that last hash and git reading the file/);
    assert.match(s, /Peers may have changed the shared tree since step 3/);
    assert.match(s, /mine-paths\.mjs" [^\n]*--out "<scratchpad>\/squeaky-paths-\$\{CLAUDE_SESSION_ID\}\.json" && node "[^\n]*commit-mine\.mjs" --session "\$\{CLAUDE_SESSION_ID\}" --message-file "<scratchpad>\/squeaky-msg-\$\{CLAUDE_SESSION_ID\}\.txt" --paths-json "<scratchpad>\/squeaky-paths-\$\{CLAUDE_SESSION_ID\}\.json" --expect "<scratchpad>\/squeaky-step3-\$\{CLAUDE_SESSION_ID\}\.json"/);
    assert.match(s, /Read the `file:` lines \(the diffstat cuts long names\)/);
    assert.match(s, /`--allow-secret-name <path>` on his yes/);
    for (const code of [0, 1, 2, 3, 4, 5, 6]) {
      assert.match(s, new RegExp(`^- \\*\\*${code}:\\*\\* `, 'm'), `exit ${code}`);
      assert.match(header('commit-mine.mjs'), new RegExp(`^//   ${code} `, 'm'), `commit-mine.mjs header, exit ${code}`);
    }
    const exit = (code) => s.split('\n').find((l) => l.startsWith(`- **${code}:**`));
    for (const code of [1, 3, 5, 6]) assert.match(exit(code), STOP, `exit ${code} stops without skipping steps 8 and 9`);
    assert.match(exit(1), /if it fails again, stop and report it\. Don't push/);
    assert.match(exit(1), /On "they are still staged: <paths>", which takes precedence over "index\.lock is held" when stderr says both, follow the rule above\. On "could not unstage the excluded paths", nothing was committed/);
    assert.match(s, /rerun from step 3, where they show as contested `staged-elsewhere`; tell Briggsy they're ours; `--include` them on his yes\. If one has left the dirty list, another commit took it: find which with `git log -1 --format='%h %s' -- <path>`/);
    assert.match(exit(2), /A missing `--expect` file means the same: rerun from step 3 and show Briggsy again\. Never regenerate it on its own, and never point `--expect` at the step-6 file/);
    assert.match(exit(3), /When stderr says the index still holds pre-commit content for some paths \(a staged revert of the sha\), name those paths and the `index\.lock` path and age/);
    assert.match(exit(4), /report its `not in this commit:` lines/);
    assert.match(exit(5), /a detached HEAD, or a branch other than step 3's \(checked before anything else, so a peer's rebase holding our edits in its autostash reads here, not as exit 6\)\. What of ours is staged is as stderr says/);
    assert.doesNotMatch(exit(5), /nothing was staged/);
    assert.match(exit(6), /this session's uncommitted work on a step-3 path vanished: it is neither on disk nor in a commit made since step 3 that holds step 3's bytes \(a stash, a checkout or a discard, or a peer's commit of other bytes\); nothing was staged\. Stop: run `git stash list`/);
    assert.match(exit(3), /never `git restore --staged :\/` or any other repo-wide unstage/);
    assert.match(exit(2), /"Changed since step 3" or "changed on disk" means the tree moved under you: show Briggsy what changed and rerun from step 3/);
    assert.match(s, /`not in this commit: <path>/);
  });

  test('step 7: the commits a push will send are shown first; a stop before the push still runs steps 8 and 9', () => {
    const s = step(7);
    assert.match(s, /git log --oneline '@\{u\}\.\.HEAD'/);
    assert.match(s, /Behind > 0: don't push\./);
    assert.match(s, /Either way, steps 8 and 9 still run\./);
    assert.match(s, /If Briggsy declined the branch in step 3, or HEAD is detached, skip this step: no push\. Steps 8 and 9 still run\./);
  });

  test('step 8a: machine-wide kills only when no other session is live; the pilot runs any kill itself', () => {
    const s = flat(step(8));
    assert.match(s, /\*\*Run 8a only when it shows `ok: true` and `anyOtherLive: false`\.\*\*/);
    assert.match(s, /under `ok: false`, "Skipped dev-process cleanup: peers\.mjs couldn't check \(<error>\)\."/);
    assert.match(s, /run the workerd kill yourself — Briggsy never runs commands: `taskkill \/F \/IM workerd\.exe` from PowerShell, `taskkill \/\/F \/\/IM workerd\.exe` from Git Bash/);
    assert.doesNotMatch(s, /suggest the user run/);
  });

  test('step 9: warnings again, a vacuous run never reads clean, and a re-dirtied committed path is never committed again', () => {
    const s = step(9);
    assert.match(s, /both scripts' `warnings` verbatim/);
    assert.match(s, /On `transcripts: 0`, nothing could be attributed, so nothing reads clean: say so, and never report "Squeaky clean\."/);
    assert.match(s, /report it, and never commit it again/);
    assert.match(s, /--out "<scratchpad>\/squeaky-step9-\$\{CLAUDE_SESSION_ID\}\.json"/);
    assert.match(s, /When step 6 was skipped \(`twin: true`, `twin: null` with no no from Briggsy, a branch he declined, a detached HEAD, or `transcripts: 0`\), the report leads with that skip, which is the reason the `mine` paths are still dirty, and never says "Squeaky clean\."/);
    assert.match(s, /While `vanished` isn't empty, never report "Squeaky clean\." either/);
    assert.match(s, /Once the report is written, delete this session's own squeaky files from the scratchpad, by their exact names \(no glob\)/);
  });

  test('the commit-mine header lists every secret-like name SKILL.md step 6 names', () => {
    const names = /A secret-like name \(([^)]*)\) is refused/.exec(step(6))[1].match(/`[^`]+`/g).map((n) => n.slice(1, -1));
    assert.equal(names.length, 23);
    const text = flat(header('commit-mine.mjs'));
    for (const n of names) assert.ok(text.includes(n), n);
  });

  test('no claim that a peer\'s staged work always stays out; both script headers state the narrowed per-file limit', () => {
    assert.doesNotMatch(SKILL, /Whatever a peer staged stays staged/);
    for (const name of ['mine-paths.mjs', 'commit-mine.mjs']) {
      const text = flat(header(name));
      assert.match(text, /until U7 adds a ledger/, name);
      assert.match(text, /whole, as it is on disk/, name);
      assert.match(text, /foreign-hunks/, name);
      assert.match(text, /exactly as (this session's own edits would|ours)/, name);
    }
  });
});

describe('every flag SKILL.md passes to a script is one it accepts', () => {
  // Flags on each script's command lines, plus the ones step 6 describes in prose.
  const flags = { 'peers.mjs': new Set(), 'mine-paths.mjs': new Set(), 'commit-mine.mjs': new Set(['--include', '--exclude', '--allow-secret-name']) };
  for (const line of SKILL.split('\n')) {
    for (const part of line.split('&&')) {
      const m = /(peers|mine-paths|commit-mine)\.mjs"((?: [^\s]+)*)/.exec(part);
      if (m) for (const f of m[2].match(/--[a-z-]+/g) || []) flags[`${m[1]}.mjs`].add(f);
    }
  }

  test('SKILL.md names the flags this test expects to check', () => {
    assert.deepEqual([...flags['mine-paths.mjs']].sort(), ['--delete-temp', '--out', '--session', '--temp-dir']);
    assert.deepEqual([...flags['commit-mine.mjs']].sort(), ['--allow-secret-name', '--exclude', '--expect', '--include', '--message-file', '--paths-json', '--session']);
    assert.deepEqual([...flags['peers.mjs']], ['--self-session']);
  });

  for (const [script, set] of Object.entries(flags)) {
    for (const flag of set) {
      test(`${script} accepts ${flag}`, () => {
        const args = flag === '--delete-temp' ? [flag] : [flag, 'x'];
        const r = runScript(script, args, { cwd, env: { GIT_CEILING_DIRECTORIES: cwd } });
        assert.doesNotMatch(r.stdout + r.stderr, /unknown option/);
      });
    }
  }
});
