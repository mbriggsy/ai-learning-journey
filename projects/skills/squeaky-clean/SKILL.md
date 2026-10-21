---
name: squeaky-clean
description: End-of-session cleanup automation. Trigger when the user says "squeaky", "squeaky clean", "let's get squeaky", or any other end-of-session shutdown signal. Runs the full checklist — TODO update, typechecks, git verification, temp cleanup, commit, push, orphan dev-process cleanup.
user-invocable: true
---

End-of-session cleanup. Every step runs in order — don't skip, don't reorder. If a step fails, stop and fix it before continuing, within that step's rules: a fix never edits a path this session doesn't own (step 0). A step that says "stop" says what still runs. Never declare "clean" until every step is verified.

`<scratchpad>` below is this session's scratchpad directory (system temp if it has none). Every file squeaky writes there carries the session id, because system temp is shared by every session.

## The Checklist

### 0. Check Who Else Is Here

Other Claude sessions and scheduled tasks share this working tree and its index. Before anything edits a file, run both from the project root:

```bash
node "$HOME/.claude/skills/squeaky-clean/scripts/peers.mjs" --self-session "${CLAUDE_SESSION_ID}"
node "$HOME/.claude/skills/squeaky-clean/scripts/mine-paths.mjs" --session "${CLAUDE_SESSION_ID}" --temp-dir temp --out "<scratchpad>/squeaky-step0-${CLAUDE_SESSION_ID}.json"
```

With `--out`, mine-paths writes its whole output to that file and prints one line, `wrote <file>: mine N, mineNew N, ...`, then a `warning:` line per warning, so the Bash tool's 30000-character cut never hides anything. Read the file for the lists, here and in steps 3, 6 and 9: the small fields come first, and the long lists, `foreign`, `peerStaged` and `tempKeep`, come last.

Step 3 explains their output. Here they decide what steps 1 and 2 may edit:
- **`twin: true`:** another live process runs under this session id (a resumed copy), and the transcripts can't tell its work from yours. Steps 1 and 2 edit nothing: the TODO close block and any failing check go into the final report. Steps 4 and 6 are skipped. Report it.
- **`twin: null`, unknown:** with `ok: false` (peers.mjs couldn't check) or with `ok: true` (a live registry entry it couldn't read, or no session id). Rerun peers.mjs once. Still `null`: ask Briggsy whether this session is open in another terminal. Edits in steps 1 and 2, and steps 4 and 6, wait for his no. Steps 4 and 6 apply this same rule to their own peers.mjs rerun.
- **`transcripts: 0`:** the session id matched nothing, so no path can be this session's. Steps 1 and 2 make no edits: the close block and any failing check go into the final report. Step 3 stops the rest.
- **`vanished` not empty:** report it before anything else: name each path with its reason, and run `git stash list`. A `vanished` path is not clean: steps 1 and 2 never edit it. Steps 4 and 6 still run.
- Otherwise edit only a `mine` or `mineNew` path, or a clean file (not dirty at all, and not in `vanished`) where steps 1 and 2 allow it. Never edit a `foreign`, `peerStaged` or `contested` path: the edit would make the file this session's, and step 6 would commit someone else's unfinished work.
- Show Briggsy `branch` and `defaultBranch`. A detached HEAD (`branch: null`) never commits through squeaky: step 6 stops with exit 5 (it may be a peer's rebase); report it. A `branch` other than `defaultBranch` commits only on his yes, asked again in step 3.

### 1. Update TODO.md

TODO.md is the file sessions share most. Edit it only when step 0 shows it clean or in `mine` (a TODO.md in `vanished` is not clean: leave it). A clean TODO.md may be edited even with other sessions live: it holds nobody's pending work, and a peer's edit to it, before yours or after, leaves lines your recorded edits don't account for, which step 3 shows as `foreign-hunks`, so it is never committed unasked. When it's dirty with someone else's work (`foreign`, `peerStaged` or `contested`), or step 0 says edit nothing, leave it: put the close block you would have written into the final report, and say TODO.md was left for its owner.

If TODO.md exists in the project root, update it to reflect reality:
- Current state (build and gate status by exit code, bundle sizes; a test or open count only where the project gives it no single gated home — a TODO that says its counts live elsewhere, e.g. under a doc-stats gate, gets the gate's NAME, never its numbers — run the actual commands, don't copy from memory)
- Next steps in priority order
- Landmines (known issues, gotchas, things that'll bite the next session)

Rules:
- TODO is for actionable items ONLY. No session history, no "What We Did" logs. Git log has the history.
- PRUNE before you write the new close block: cut every earlier session block whose NEXT list the new one supersedes — AFTER migrating its landmines and still-live items (an OWED, an unfinished fix, a "read run X first", a ⚑ negative) into the standing sections (the landmines section, the ranked list, or the project's register). Keep only the newest close block. Nothing in this checklist ever deleted anything before 2026-09-25, so TODO grew a 390-line chronicle that the rule above forbade — the doc audit that day found it and cut it once; this step keeps it cut.
- Unfinished fixes must be prescriptions, not diagnoses. Write the exact file, line, and change needed.
- Run real commands to get real numbers. Never copy stats from another doc.

If TODO.md doesn't exist, skip this step.

### 2. Run Typechecks

Detect the project's typecheck command:

1. Check `package.json` for a `typecheck` script → run `pnpm typecheck` (or npm/yarn equivalent)
2. If no typecheck script, check for `tsconfig.json` → run `tsc --noEmit`
3. If no TypeScript, check for `pyproject.toml` or `setup.py` → run `mypy .` or `pyright`
4. If none of the above, skip with a note: "No typecheck configured."

Typechecks must pass in this session's code. Fix a failure in a `mine` or `mineNew` path. Fix one in a clean file only when step 0's peers.mjs shows `anyOtherLive: false`: with another session live, a check can fail in a clean file because of that session's change somewhere else, and the fix is its to make. Anywhere else, leave it, name the file and the error, and go on; the final report says the check failed in code this session doesn't own.

### 3. Verify Git Status

Steps 1 and 2 changed the tree, so run both again from the project root. Step 6 holds the commit to this mine-paths output, so it is saved:

```bash
node "$HOME/.claude/skills/squeaky-clean/scripts/peers.mjs" --self-session "${CLAUDE_SESSION_ID}"
node "$HOME/.claude/skills/squeaky-clean/scripts/mine-paths.mjs" --session "${CLAUDE_SESSION_ID}" --temp-dir temp --out "<scratchpad>/squeaky-step3-${CLAUDE_SESSION_ID}.json"
```

- **peers.mjs** lists the other live sessions. `peers` are the ones in this git toplevel (pid, session, name, status, idle minutes); `busyPeer` is true when one isn't idle. `others` is every other live session on the machine, any folder; `anyOtherLive` is true when it isn't empty, idle sessions included. A session whose folder can't be resolved shows as `unresolved` and counts as a busy peer. `ok: false` means it couldn't check: `busyPeer`, `anyOtherLive` and `busyAnywhere` read as the worst case, and `twin` is `null`, unknown. `twin` can be `null` with `ok: true` too (a live entry it couldn't read, or no session id). Either way step 0's rule applies.
- **mine-paths.mjs** reads this session's transcripts (main, subagents, workflow agents) and sorts `git status`:
  - `mine`: tracked files this session changed with Edit / Write / MultiEdit, or named in `git add`, `git mv` or `git rm`, holding only lines its own recorded edits account for. Committed in step 6. A notebook this session changed with NotebookEdit always lands in `contested`: its edits can't be replayed. A deletion is mine only when this session's last call on the path was its own `git rm`, or a `git mv` away from it, and the file is gone from disk; a `git add` never proves one, and a rename's source side is a deletion like any other.
  - `deleted`: the `mine` paths step 6 commits as deletions. Show them to Briggsy as deletions, not edits.
  - `pairs`: each rename among `mine` and `mineNew`, as `[from, to]`. Step 6 commits or excludes both sides together.
  - `mineNew`: untracked files this session created the same way. Added and committed in step 6.
  - `vanished`: this session's work that is gone from a path git status shows clean, each with a `reason`: `edits gone` (a stash, a checkout or a discard took its edits), `new file gone` (a file it created or added is gone from disk and the index: a peer's `stash -u` or `clean`), or `git rm or git mv undone` (the file is back at HEAD's bytes). Name each, run `git stash list`, and tell Briggsy. Step 9 never reads clean while this isn't empty.
  - `contested`: paths this session has evidence for but can't prove are its own, each with a `reason` (below), and `staged: true` when the index holds it staged with no fresh `git add`/`mv`/`rm` of ours. Never committed unless Briggsy says yes.
  - `foreign`: every other dirty path — a peer's, a scheduled task's, anything only a shell command wrote. Never committed.
  - `peerStaged`: the foreign paths staged in the index. Never commit, unstage or touch them.
  - `tempMine` / `tempKeep`: the files in `tempDir` this session created or read and nobody changed since, and the rest (step 4).
  - `sha`: the sha1 of each `mine` and `mineNew` file's bytes (`null`: a deletion); each `contested` entry carries its own `sha`, and one this session edited carries the replay's `addedForeign` / `removedForeign`. 0 and 0 with no `detail` means the replay matched, so every line is this session's; any `detail` means the disk differs from the replay, whatever the counts (lines reordered, line endings or the final newline changed). Step 6 commits only these bytes.
  - `branch` and `defaultBranch`: a detached HEAD (`branch: null`) never commits through squeaky: step 6 stops with exit 5; report it. On a `branch` other than `defaultBranch`, ask Briggsy before step 6 whether to commit there. On his no, skip steps 6 and 7 (no push); steps 8 and 9 still run.

**The per-file limit (until U7 adds a ledger):** ownership is decided per file, and a `mine` file is committed whole, as it is on disk. mine-paths replays this session's own recorded edits (the values each tool applied) on the committed file, in order, and a file goes to `contested` (`foreign-hunks`) unless that replay reproduces the disk exactly, each edit finding what it found when it ran. What can still ride along unseen is a change the transcripts can't show that leaves the file byte for byte as this session's edits would, and line endings where they go unchecked: when HEAD's copy mixes styles, when the file is new, or when a Write touched it. Evidence expires: it counts only until the path's next commit. A later `git restore --staged`, `git reset`, `git stash` (push, save or bare) or `git checkout <tree-ish> -- <paths>` takes back this session's `git add` / `mv` / `rm` evidence for the paths it names, or all of it when it names none, with a warning naming its git subcommand; a path it took back that is still dirty is contested `revoked`. Edits are never taken back, since the replay already checks them.

Contested reasons:
- `staged-elsewhere`: staged with no per-file `git add`, `git mv` or `git rm` of ours that we can prove. A peer staged it, or this session did through a folder, glob, `-u` or variable add, or a commit-mine run couldn't unstage it (step 6, exit 1). Say which, when you can tell.
- `staged-by-failed-command`: staged, and named only by a `git add`, `git mv` or `git rm` in a call that errored (a hook failing after the add, say).
- `revoked`: a blind revoke (`revokedBy` names its git subcommand, e.g. `git stash`) took back this session's `git add`, `git mv` or `git rm` of it, so whose staging it holds is unknown.
- `rename-split`: one side of a rename (git status's R, or a `git mv` of ours) is this session's, the other (`pair`) isn't, or isn't provably. Neither side goes in alone: `--include` one side only together with its `pair`.
- `deleted-outside-git`: deleted, and this session's last call on it was not its own `git rm` or a `git mv` away from it: a shell `mv` or `rm`, a peer's `git rm`, or a `git add` that staged someone's deletion. Committing it would record only the deletion.
- `unconfirmed`: the only evidence is a tool call with no recorded result (killed mid-call, or still running).
- `committed-since`: all of this session's evidence predates the path's last commit, so what is dirty now came after it: someone else's change, or this session's through a shell command.
- `case-mismatch`: this session's evidence names the file in different letter case.
- `rm-cached`: out of the index but still on disk (a `git rm --cached` of an ignored file too). `git commit --only` would add it back, so it can't be committed by path.
- `foreign-hunks`: it would be `mine`, but it holds lines this session's recorded edits don't account for — a peer's, or this session's own unrecorded change (a shell command, a formatter, a killed call): `addedForeign` lines on disk and `removedForeign` lines gone (or a `detail`: lines moved or reordered, line endings or the final newline changed, a Write over lines this session's edits don't account for, unreadable, not UTF-8 text, or it can't be compared). Committing it would commit those lines under this session's message. Tell Briggsy exactly that. A file this session only `git add`ed lands here too: none of its lines came from this session's own edits.

Show Briggsy the peers, `branch` and `defaultBranch`, every path list (read from the `--out` file), and both scripts' `warnings` verbatim. Then:
- **A `malformed transcript line` warning:** attribution may be wrong. Before step 6, show `mine`, `mineNew` and `contested` and wait for Briggsy to confirm them.
- **`transcripts: 0`:** the session id matched nothing, so nothing can be attributed. Stop: skip steps 4 to 7. Don't push; steps 8 and 9 still run; the final report leads with the stop.
- Ask about any `mine` / `mineNew` path you didn't expect, and flag anything that must not be committed (`.env`, credentials, large binaries, temp or generated files) — step 6 excludes those.
- Ask about each `contested` path, with its reason; for one with `staged: true`, say the index holds it staged, possibly by a peer. One Briggsy says yes to goes into step 6 with `--include`; the rest are left alone. An `rm-cached` path can't be included: report it.
- Foreign and peer-staged paths are listed and left alone: never commit, stage, unstage, revert, stash or delete them, and don't ask about them.
- A file this session wrote only through a shell command (a generator, a formatter, `mv`) shows as foreign. Leave it, and name it in the final report. If this session ran `/clear`, its edits from before it may show as foreign too: a `/clear` can start a new session id, which the transcripts then file separately.

### 4. Clean Temp Files

- **`temp/`: delete `tempMine`, keep `tempKeep` — never ask (Briggsy's clearance C16).** Rerun peers.mjs right before: `twin: true` skips this step, and `twin: null` follows step 0's rule (rerun once; still `null`, go on only on Briggsy's no). Then run, from the project root:

  ```bash
  node "$HOME/.claude/skills/squeaky-clean/scripts/mine-paths.mjs" --session "${CLAUDE_SESSION_ID}" --temp-dir temp --delete-temp
  ```

  It sorts `temp/` again at that moment and deletes only the files this session created or read, screenshots Briggsy dropped for this session included — and only regular, git-ignored files whose real path stays inside `temp/` and that nobody changed since this session last touched them: never a folder, a link or a `*.lock`. It prints what it `deleted`, what it `kept` (not proven this session's, or changed since this session last touched it) and what it `skipped`, each with its reason, and its `warnings`: show them verbatim. Exit 2 (the folder isn't `temp/` right under the project root, the session registry can't name this session's own folder or names another one, or `temp/` is a link) deleted nothing: report its stderr. Never delete anything in `temp/` by hand: no `rm`, no `Remove-Item` (PowerShell reads `[ ]` in a path as a wildcard even when quoted), no glob.
- **Never delete a lock or another session's marker:** `.git/index.lock`, `/tmp/.distill-needed`, `/tmp/.brief-gate`, or any marker this session didn't create. If `.git/index.lock` exists, report its path and age. One that looks stale gets reported, not removed — a peer's commit may be holding it.
- **Never delete a path git status lists:** one in `mine`, `mineNew`, `contested` or `foreign` (a report this session wrote with Write, say) stays, and step 6 commits it or `--exclude`s it.
- **`.playwright-mcp/` directories, generated HTML reports and system-temp files** (`$TEMP` or `/tmp/`): rerun peers.mjs right before deleting any. Delete only when it shows `ok: true` and `anyOtherLive: false`, and only what this session created (your own tool calls made it). Otherwise list them and leave them: an idle session may still use its files, and a `.playwright-mcp/` folder belongs to every session working in that folder, not to the one that created it. The exception is this session's own scratchpad folder: what this session created there may go whatever peers.mjs says, with two limits. The `squeaky-*-${CLAUDE_SESSION_ID}` files stay until after step 9 (step 6 reads them). Under `twin: true` or `twin: null` the scratchpad is left alone: a twin would share it.

Ask first only about a stray artifact you can't attribute while `anyOtherLive` is false. Otherwise an artifact you can't attribute isn't yours: list it and leave it. `temp/` never needs a question.

### 5. Check for Doc Drift

Quick scan (not a full audit):
- Were any markdown docs modified this session? Read the `.md` paths in step 3's `mine` and `mineNew` lists. A plain `git diff` would count a peer's docs as yours.
- If yes, do a 30-second sanity check: does the change in one doc create a contradiction or stale reference in another?
- If drift is likely, suggest: "Docs were modified this session. Consider running /doc-audit before the next major session."

This is a nudge, not a gate. Don't block the cleanup for a full doc audit.

### 6. Commit

Commit only this session's paths, through the script. Rerun peers.mjs first: `twin: true` skips this step, and `twin: null` follows step 0's rule (rerun once; still `null`, go on only on Briggsy's no). A detached HEAD never commits (commit-mine stops with exit 5). A branch other than `defaultBranch` goes on only on his yes from step 3; on his no, skip this step and step 7. Peers may have changed the shared tree since step 3, so mine-paths runs again, and `--expect` refuses anything Briggsy didn't see in step 3. (Step 4 removed only git-ignored files, which git status never shows.) Write the message to `<scratchpad>/squeaky-msg-${CLAUDE_SESSION_ID}.txt` first, following the repo's commit conventions (check recent git log for style). Run it as one line, with a 10-minute Bash timeout (`timeout: 600000`: hooks and the lock retries can outlast the 2-minute default): `&&` keeps commit-mine from running when mine-paths fails, in Bash and PowerShell 7 alike.

```bash
node "$HOME/.claude/skills/squeaky-clean/scripts/mine-paths.mjs" --session "${CLAUDE_SESSION_ID}" --out "<scratchpad>/squeaky-paths-${CLAUDE_SESSION_ID}.json" && node "$HOME/.claude/skills/squeaky-clean/scripts/commit-mine.mjs" --session "${CLAUDE_SESSION_ID}" --message-file "<scratchpad>/squeaky-msg-${CLAUDE_SESSION_ID}.txt" --paths-json "<scratchpad>/squeaky-paths-${CLAUDE_SESSION_ID}.json" --expect "<scratchpad>/squeaky-step3-${CLAUDE_SESSION_ID}.json"
```

mine-paths writes the `--out` file only when it succeeds, and prints only its one summary line, so commit-mine's lines below are never cut; commit-mine refuses a paths file made for another session or repo. If the command is killed (the 10-minute timeout, ESC), rerun from step 3: the new files may be left staged, and they show there as contested `staged-elsewhere`; they are ours.

- `--expect` is required: it is the file step 3 showed Briggsy, and his yes covers exactly the bytes in it. commit-mine refuses a `mine` or `mineNew` path step 3 didn't list the same way with the same `sha`, an included path whose `contested` entry has changed, and a step-3 `mine` or `mineNew` path that is now contested or foreign. A step-3 path that is clean now was taken by a commit made since (reported), became git-ignored (reported), or lost this session's work (exit 6). It hashes every path again before every `git add` and `git commit` attempt, lock retries included, and refuses any change. What remains is the moment between that last hash and git reading the file.
- The script runs `git add` on `mineNew`, then immediately a path-limited commit (`git commit --only`) of `mine` + `mineNew`. Staged work in every other path stays staged and out of the commit; a `mine` file goes in whole (step 3's per-file limit).
- `--include <path>` (repeat per path) adds a `contested` path Briggsy said yes to. `--exclude <path>` (repeat per path; a trailing `/` covers a folder) keeps a path out; a rename in `pairs` takes both sides or neither (one side alone is refused). An excluded `mine` path this session staged is unstaged before the commit, so on every exit from there (`unstaged (excluded): <path>`), and no peer's whole-index commit sweeps it up; one whose index entry no longer holds the bytes mine-paths recorded is left staged and named (`left staged (excluded):`), and an unstage that fails is exit 1. Copy each path exactly as mine-paths printed it: one that matches nothing is refused. Do NOT commit:
  - `.env` files or credentials
  - Large binary files
  - Temp/generated files that should be gitignored
- A secret-like name (`.env`, `.env.*`, `*.env`, `.envrc`, `.dev.vars`, `.npmrc`, `.netrc`, `.pypirc`, `.git-credentials`, `credentials`, `local.settings.json`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.keystore`, `*.jks`, `id_rsa*`, `id_ed25519*`, `id_ecdsa*`, `*credentials*.json`, `client_secret*.json`, `token.json`) is refused until you `--exclude` it, or ask Briggsy and pass `--allow-secret-name <path>` on his yes.
- Never `git commit -a`, `git add .`, `git add -A`, a plain `git commit`, or `git stash` / `git reset` / `git checkout --` on any path. Nothing else commits at squeaky time.
- It prints `included:` and `excluded:` lines, `committed <sha>`, a diffstat and a `file: <path>` line per committed path. Read the `file:` lines (the diffstat cuts long names): only `mine`, `mineNew` and included paths. Report every `not in this commit: <path> (...)` line: `last changed in <sha> <subject>` or `taken by <sha> <subject>` means that path was already committed, maybe by a peer's commit that swept it up; `now ignored` means a step-3 path became git-ignored. Report each `unstaged (excluded):` line too.

On any exit, stderr says what of ours the index still holds; read it before the exit code's own rule. "Nothing was staged" or "Nothing of ours is staged" means none. "They are still staged: <paths>" names this session's own new files, which commit-mine staged and couldn't unstage: rerun from step 3, where they show as contested `staged-elsewhere`; tell Briggsy they're ours; `--include` them on his yes. If one has left the dirty list, another commit took it: find which with `git log -1 --format='%h %s' -- <path>` and report it. "Left staged" names staging that may be a peer's now: report it, and leave it.

Exit codes:
- **0:** committed. Go to step 7.
- **1:** git failed. On "they are still staged: <paths>", which takes precedence over "index.lock is held" when stderr says both, follow the rule above. On "could not unstage the excluded paths", nothing was committed: report the paths it names. Otherwise, on "index.lock is held", another git process holds the lock: the script already retried for 14 s and never deletes it, and neither do you. Rerun this step once a minute later; if it fails again, stop and report it. Don't push; steps 8 and 9 still run; the final report leads with the stop. Any other git failure (a hook, a path that moved): fix it, touching only this session's paths (step 0's rule), and rerun this step.
- **2:** refused, bad input (a missing or empty file, an `--exclude`, `--include` or `--allow-secret-name` that matches nothing, a secret-like name, a paths file made for another session or repo). Read stderr, fix, rerun. "Changed since step 3" or "changed on disk" means the tree moved under you: show Briggsy what changed and rerun from step 3. A missing `--expect` file means the same: rerun from step 3 and show Briggsy again. Never regenerate it on its own, and never point `--expect` at the step-6 file.
- **3:** committed, but the commit holds a path that wasn't in the list (a hook added it), can't be identified, or landed while git then failed. Stop and report the sha, the path and git's error. When stderr says the index still holds pre-commit content for some paths (a staged revert of the sha), name those paths and the `index.lock` path and age: until the index is resynced, a whole-index commit by anyone would undo them. No amend, no reset without Briggsy, and never `git restore --staged :/` or any other repo-wide unstage. Don't push; steps 8 and 9 still run; the final report leads with the stop.
- **4:** nothing of this session's to commit; report its `not in this commit:` lines. Go to step 7.
- **5:** the shared tree isn't safe to commit into: a merge, rebase, cherry-pick or revert, a conflict's unmerged entries, a detached HEAD, or a branch other than step 3's (checked before anything else, so a peer's rebase holding our edits in its autostash reads here, not as exit 6). What of ours is staged is as stderr says. Stop and report it. Never abort, continue or conclude another session's operation. Don't push; steps 8 and 9 still run; the final report leads with the stop.
- **6:** this session's uncommitted work on a step-3 path vanished: it is neither on disk nor in a commit made since step 3 that holds step 3's bytes (a stash, a checkout or a discard, or a peer's commit of other bytes); nothing was staged. Stop: run `git stash list` and report the paths with what it shows. Don't push; steps 8 and 9 still run; the final report leads with the stop.

### 7. Push

Fetch first. Never pull or merge into a tree other sessions share. If Briggsy declined the branch in step 3, or HEAD is detached, skip this step: no push. Steps 8 and 9 still run.

```bash
git fetch
git rev-list --left-right --count '@{u}...HEAD'
git log --oneline '@{u}..HEAD'
```

The count is `<behind> <ahead>`. The log lists every commit the push will send: name in the report any this session didn't make (a peer's, a scheduled task's). They're on the shared branch already, so the push still goes ahead.
- **Behind > 0: don't push.** Report "N behind origin; committed locally as <sha>, not pushed." A pull would merge into a dirty tree peers are working in.
- Fetch fails, or the branch has no upstream: don't push; report it.
- Either way, steps 8 and 9 still run.
- Ahead 0: nothing to push; say so.
- Otherwise `git push` — never `--force`, `--force-with-lease`, `-f` or a `+` refspec. Verify the push succeeded.

### 8. Cleanup Orphan Dev Processes

Long-running dev servers (vite, wrangler/workerd, webpack, etc.) often
survive past their parent terminal — a single stale process can hold a
port for days, blocking the next session's dev boot. Catch it now while
you're already cleaning up.

By the time we hit step 8, the user has explicitly invoked squeaky-clean
to wrap up the session. Killing dev servers is **safe at squeaky time
specifically** — the user is by definition done with *this* session.
Another live session isn't done, even an idle one: its dev server, test
run or build may be the process you'd kill. (Mid-session use of the same
cleanup script should stay conservative because the user might be running
the dev server in parallel; that mid-session contract is the project's to
define, not ours.)

This step has TWO halves. Half (b) **always runs**. Half (a) runs only
while no other session is live — and half (a) without half (b) leaves
orphan bash shells in the agent harness even after the OS-level processes
are dead.

#### 8a. Kill OS-level dev server processes

Rerun peers first — step 3's answer is minutes old:

```bash
node "$HOME/.claude/skills/squeaky-clean/scripts/peers.mjs" --self-session "${CLAUDE_SESSION_ID}"
```

**Run 8a only when it shows `ok: true` and `anyOtherLive: false`.**
Otherwise skip 8a entirely and say so: "Skipped dev-process cleanup:
session <name> (pid <pid>) is live (<status>)." or, under `ok: false`,
"Skipped dev-process cleanup: peers.mjs couldn't check (<error>)." No
`dev:cleanup` in any mode, no `--force-ports`, no workerd kill. These
kills reach the whole machine, any repo: a project's default
`dev:cleanup` kills processes too (BURNED's kills every `workerd.exe`), a
port binder may be another session's dev server, and an idle session
keeps its background dev server running (B9's bare `vite` on 5173).

When 8a runs, detection (in order):
1. Check `package.json` for a `dev:cleanup` script. Try the **force
   variant first**: run `pnpm dev:cleanup --force-ports` (or npm/yarn
   equivalent). Projects that support the flag will kill port binders;
   projects that don't will silently treat it as an unknown arg and
   fall through to their default behavior. Either outcome is fine.
2. If no `dev:cleanup` script and the project uses Cloudflare Workers
   (look for `wrangler.toml` / `wrangler.jsonc`), run the workerd kill
   yourself — Briggsy never runs commands: `taskkill /F /IM workerd.exe`
   from PowerShell, `taskkill //F //IM workerd.exe` from Git Bash (MSYS
   rewrites a bare `/F` into a path), `pkill workerd` on POSIX. Then offer
   to add a `dev:cleanup` script for next time.
3. Otherwise skip silently. Most projects don't need this.

If a project's `dev:cleanup` script reports active port binders
WITHOUT killing them despite the `--force-ports` flag, surface the
report verbatim — the project author made that call deliberately.

#### 8b. Stop background bash shells you launched

When you start a long-running command via Bash with
`run_in_background: true`, the harness gives you a task ID and the
shell stays alive until either (1) the wrapped command exits naturally
or (2) you call `TaskStop` on it. Step 8a kills the OS-level child
process (workerd, vite, etc.) but the **bash parent in the harness
keeps the shell registered as "running"** because nothing told it to
exit. The user sees a hanging shell count even though the server
binary is dead.

This step is required even if step 8a reported "killed" successfully
— their cleanup scripts cannot reach into the agent harness. It also
runs when 8a was skipped for a live session: these shells are this
session's own, never a peer's.

Procedure:

1. **Audit the session for `run_in_background: true` Bash calls.**
   Walk back through the conversation and list every task ID you
   launched that way. Common offenders:
   - `pnpm dev`, `pnpm dev:server`, `pnpm dev:launch` (long-running)
   - `until <check>; do sleep N; done` poll-loops
   - `tail -f <log>` (rare in tests, common in debug)
   - Long-running test suites that you switched to background
2. **Filter to the still-running.** Any task ID for which you received
   a `<status>completed</status>` system notification has already
   exited — skip it. Anything else is potentially still alive.
3. **TaskStop each candidate.** A successful stop returns a JSON
   `{message: "Successfully stopped task: ...", task_id, command}`. If
   the task was already dead, the call is still safe (idempotent).

If you cannot remember which IDs you launched, that's a signal you
should have been tracking them — at minimum, scan the conversation
for `run_in_background: true` and grab the IDs from the bash response
blocks.

**Better: prefer harness-managed lifecycle for dev servers.** When a
test framework can spawn + auto-kill the server itself (Playwright's
`webServer` config, Vitest's `globalSetup`, etc.), use that instead of
launching dev servers in background bash. The dev server lives only
for the duration of the test run; no manual cleanup needed.

### 9. Final Verification

Rerun the peers check, the classifier and the upstream check:

```bash
node "$HOME/.claude/skills/squeaky-clean/scripts/peers.mjs" --self-session "${CLAUDE_SESSION_ID}"
node "$HOME/.claude/skills/squeaky-clean/scripts/mine-paths.mjs" --session "${CLAUDE_SESSION_ID}" --out "<scratchpad>/squeaky-step9-${CLAUDE_SESSION_ID}.json"
git rev-list --left-right --count '@{u}...HEAD'
```

Show both scripts' `warnings` verbatim, and read the `--out` file. On `transcripts: 0`, nothing could be attributed, so nothing reads clean: say so, and never report "Squeaky clean." While `vanished` isn't empty, never report "Squeaky clean." either: name each path, say this session's uncommitted edits to it are gone, and show what `git stash list` shows. When step 6 was skipped (`twin: true`, `twin: null` with no no from Briggsy, a branch he declined, a detached HEAD, or `transcripts: 0`), the report leads with that skip, which is the reason the `mine` paths are still dirty, and never says "Squeaky clean." Otherwise confirm:
- No `mine` or `mineNew` path is dirty, except paths you excluded on purpose (name each one and why). A path step 6 committed that is dirty again was changed since, maybe by a peer: report it, and never commit it again.
- The branch is not behind its upstream, and nothing is left unpushed — unless step 7 stopped, which you report as such.
- Every live session, and every contested, foreign and peer-staged dirty path, is in your report.

Only after this step, report: "Squeaky clean." with a brief summary of what was committed (the sha and its files, each committed whole), then what was left for others: the contested paths with their reasons, the foreign paths, the peer-staged paths, and the live sessions with their status. A stop in any step leads the report instead. Never say "working tree is clean" while any foreign path is dirty — say "my paths are clean; N foreign paths left alone".

Once the report is written, delete this session's own squeaky files from the scratchpad, by their exact names (no glob): `squeaky-step0-`, `squeaky-step3-`, `squeaky-paths-` and `squeaky-step9-${CLAUDE_SESSION_ID}.json`, and `squeaky-msg-${CLAUDE_SESSION_ID}.txt`. Under `twin: true` or `twin: null`, leave them.

## What "Clean" Means

Clean means VERIFIED, not BELIEVED. Every claim must be backed by a command you actually ran this checklist:
- "Tests pass" → you ran the tests
- "Typecheck clean" → you ran the typecheck and it passed. One that failed only in code this session doesn't own is reported that way, file by file, never as clean
- "No unexpected files" → you read the peers.mjs and mine-paths.mjs output, warnings included, and asked about every surprise in `mine` / `mineNew` and every `contested` path
- "Committed" → commit-mine printed the sha and `file:` lines holding only `mine`, `mineNew` and included paths
- "Pushed" → `git fetch` showed the branch not behind, and you saw the push output
- "Clean" → the final mine-paths run read transcripts, shows no `mine` or `mineNew` path dirty and an empty `vanished`, and step 6 wasn't skipped. Contested, foreign and peer-staged dirt is listed by path, never called clean. "Clean" never means the whole working tree while another session or a scheduled task has dirt in it.
- "Dev processes cleaned" → step 8a's cleanup script ran (or 8a was skipped for a live session you named) AND step 8b TaskStop'd every still-alive background bash shell from this session (or confirmed none were launched). One without the other is a false-clean — see the 2026-05-06 session where `dev:cleanup` killed `workerd` + `vite` correctly but two background bash shells (`pnpm dev:server`, an `until` poll-loop) stayed alive in the harness, surfaced only because the user noticed his shell count.

If you can't verify it, don't claim it.
