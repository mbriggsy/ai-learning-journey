# The Back Nine — landmines

The mechanical traps that keep costing hours: tool quirks, harness traps, process traps. They are grouped by the area
they bite, so a session about to touch an area reads that one section first. Engineering lessons live in
[`insights/`](insights/) (one file per lesson, surfaced by `/brief`); a landmine that teaches a general lesson also goes
on `TODO.md`'s `## Distill candidates` list, so `/distill` can write it up.

**How entries come and go.** A session that hits a new trap files it here, under the area it bites, never under the
session that found it, except a trap that bites the next step, which the newest close block names until the next close
moves it here (squeaky's TODO step). Each entry keeps its origin tag, such as `(b9-6, 11-09)`, so its age shows. A
landmine whose cause is fixed is deleted, not kept as history: git has it. These entries moved here out of `TODO.md` on
2026-11-09; the ones an adversarially checked review found dead, already in an insight, or better kept as a distill lesson
were dropped then, and the contradictions the move met were reconciled in place (each marked *Reconciled 2026-11-09*).

## Git and the shared tree

- **(moved from TODO's distill list, b9-2, 11-23) Count from the run's own record before typing a number into a commit
  message**: `31e018d5` said "29 refuters over 37 candidate moves" from memory when the run had 38 over 42, and a pushed
  message never changes, so the fix took a follow-up commit.
- **(b9-4, 11-13) `git add -- <a path already staged as deleted>` fails the whole add** ("pathspec did not match"):
  stage the paths that exist, then `git commit -- <every path>`, the deleted one included.
- **(b9-4, 11-08) Other sessions commit to the monorepo during a long run.** A tool that stamps `git HEAD` in its record
  differs between its two runs; byte-compare with the label and git lines aside (moves11 does), never a raw `cmp`.
- **(b9-4, 11-08) A `git revert a9cacf22` now stops on a conflict in `scenarioCodec.test.ts`** (U10's corrected note sits in a
  go-live hunk); resolving toward the old file reaches the tree U10's proof ran, where the floor test is the one red.
- **(b9-7) `git archive HEAD:projects/the-back-nine src …` fails from the project dir** ("pathspec 'src' did not match");
  run it from the repo root.
- **From the b9-1 to b9-5 closes (2026-10-30, Phase B carried uncommitted across four sessions, landed as `c07e5758`):** when
  a multi-session build must sit UNCOMMITTED in the shared tree, back it up on a side ref cut through a TEMPORARY index —
  `GIT_INDEX_FILE=<scratch>/x.index`, `git read-tree HEAD`, `git add -A -- projects/the-back-nine`, `git write-tree`,
  `git commit-tree`, `git update-ref` with the old value — so the real index never moves; recover a lost file with
  `git show <ref>:projects/the-back-nine/<path>`, never a reset, and never `git checkout`/`restore`/`stash` the held paths.
  Deleting the spent ref (`git push origin :<ref>`) is refused to the pilot by the permission classifier: it is Briggsy's
  one command (`refs/wip/b9-phaseb` was his to delete, gone local and on origin since 2026-10-30).

- **(b9-10, 10-22) Another Claude session works in the same monorepo** (`projects/hooks/` files showed modified under `git status ..`
  mid-session, and MEMORY.md changed on disk). Commit by explicit paths only (`git commit -- <paths>`); check that
  `git diff --cached --name-only` holds nothing outside `projects/the-back-nine/` before every commit.
- **From the b9-5 close (2026-10-20, (B) built, uncommitted):** the HEAD engine is measurable without touching the tree:
  `git worktree add --no-checkout <scratch>/head HEAD` → `git sparse-checkout set --no-cone projects/the-back-nine/src …tsconfig.json
  …package.json …vite.config.ts` → `git checkout` → a JUNCTION to the real `node_modules` (`New-Item -ItemType Junction`), then run the
  probe from the worktree's project dir · REMOVE THE JUNCTION FIRST (`cmd /c rmdir <junction>`) and only then `git worktree remove
  --force` — a recursive delete must never walk into the real `node_modules` · a fan-out of parallel builders on ONE tree leaves a
  cross-file fallout (an existing arm another builder's change reds) flagged by both and fixed by neither — name an owner for every
  fallout in the brief · a 3-builder + docs + 3-reviewer workflow ran ~75 min and 2.7M subagent tokens, and the build itself took the
  pilot to ~50 % before it — plan the walk + the commit for a FRESH session · `node -e` ate a comment's backticks AGAIN (this
  session) — the rule stands: any script text with backticks goes in a FILE · `C:/wt/b9` (branch `b9-squeaky`) is ANOTHER
  session's worktree — never remove it.
- **(b9-2, 10-19)** `git show <sha>:src/…` resolves from the MONOREPO root and fails; from the project dir use `git show <sha>:./src/…`.
- **From the b9-2 close (2026-10-04/06, the pay-less-tax all-in build):** NEVER `git commit -a` in this monorepo — the root spans every project and it swept six uncommitted family-feud files into `1dd80ecc` (backed out by `7571d1a5`, working copies restored); add each new file of yours by name and commit `-- <your paths>` (squeaky step 6), then read `git show --stat <your commit's sha>` before pushing (*Reconciled 2026-11-09: this said `git add -A .` from the project dir, which stages every session's files there, and `git show --stat HEAD`, which can be a peer's commit; squeaky step 6 forbids both*) · `pnpm doc:reanchor HEAD` is NOT idempotent on an uncommitted diff — a second run re-shifts citations the first already moved; for a later edit on an already-re-anchored tree, make a temporary LOCAL commit of the tree minus the new edit, re-anchor against it, then `git reset --soft HEAD~1` · in Git Bash `grep -c $'\r'` counts EVERY line (the pattern collapses to empty) — check line endings with node · uscode.house.gov serves a house.gov "Under Maintenance" fallback to EVERY client (curl, real Chromium, an external proxy) — the URL is right, the site is down (⚑ 2026-10-16 doc audit: true through 2026-10-09 only — `f2093b1b`: the site relaunched by 2026-10-10 at new static URLs, and from then the old `view.xhtml` path's maintenance body meant a DEAD URL, not an outage; the b9-2 (2026-10-11/12) bullet under *Claude Code, workflows and sessions* governs); a web-search summary said it was live and was stale crawl data — trust only a fetch · two workflow reviewers each running the full suite in parallel produced an artificial 123 s timeout on a 21 s solve test — never bump a time budget on contention a workflow created; re-run the suite alone · a workflow agent can return a non-report ("Waiting for the full-suite notification") — verify the tree yourself, never trust the chain · a GitHub "runner has received a shutdown signal" red (run 37374864752 on `b3284566`) is infrastructure, not a test failure — confirm by the log, then by the next run · the pay-less-tax Tier-2 statistic is ALL-IN since v10 (`lifetimeAllInCostPerPath`, one home); `lifetimeTaxMeanReal` still means income tax and a source-bind test keeps it out of the five read sites — never re-point one site alone.
- **From the b9-7/b9-8 close (2026-10-04, the v10 roster-recall + the ACA re-verify):** `EnterWorktree` FAILS on this monorepo — four insight filenames overflow MAX_PATH under `.claude/worktrees/<name>/`, and the failed attempt leaves an orphan `worktree-<name>` branch (delete it): use `git -c core.longpaths=true worktree add -b <branch> C:/wt/<x> HEAD`, then `git -C C:/wt/<x> config core.longpaths true` and `pnpm install --frozen-lockfile` in the project (6 s) · a cost cap and a coverage goal can be STRUCTURALLY incompatible on ~linear cost — count the roster at the candidate spacing BEFORE a ruling (the roster dump: `buildSolveRequest` over `DEV_SEEDS`, distinct grid amounts per seed); the v10 ruling's +33 % cap admitted ~7 amounts beside `retired`'s 22, knowable before the council sat · a solve-cost model fit on two measured roster sizes (F + slope × roster) predicted the third within 1–4 % — validate on the held-out point, then compute any closed form from it · ranking stability scores the WHOLE roster on BOTH seeds and the crown search adopts that pass (`rankingStability.ts`), so a "cheaper seed A" scheme cuts per-candidate cost to 0.625 at best · a council can read shipped copy as unscoped — open `copy.ts` before relaying a disclosure brief (`recComposeAlready` already said "we tested") · uscode.house.gov can serve an HTTP-200 "Under Maintenance" page on EVERY path with no redirect — check `<title>` before trusting a read (⚑ 2026-10-16 doc audit — SUPERSEDED 2026-10-12, `f2093b1b`: `<title>` alone is not enough — after the relaunch (by 2026-10-10) the old paths served that maintenance body for two days, then a "Page Not Found" body, each a DEAD URL on a live site; fetch the ROOT and check the BODY, per the b9-2 (2026-10-11/12) bullet under *Claude Code, workflows and sessions* and the ACA record's `howToClear` step (1)) · ACA retrieval mechanics (control-proven): congress.gov bill pages Cloudflare-403 → govinfo BILLSTATUS bulkdata, parsing the bill's OWN `<actions>` (the first `<latestAction>` can be a related bill's); the Senate calendar package is `CCAL-119scal-YYYY-MM-DD`; the Federal Register API needs `curl -g`; eCFR's versioner needs `--compressed` · two branches touching ADJACENT TODO lines conflict on rebase — take one side (`git checkout --ours`), re-apply the other through its own script, grep both markers · the Playwright MCP writes `.playwright-mcp/` into the project root — delete it after any browser check · a scratch `*.test.ts` anywhere under the project is counted by `verify:doc-stats` (3864 / 203) — rename it `.off` or keep it outside before any gate.
- **(2026-09-24)** a background scheduler dirties `../family-feud/newsletter/…` mid-session; never `-A` from the root —
  add your own new files by name and commit `-- <your paths>`. *Reconciled 2026-11-09: this and a 2026-09-24 evening twin
  said `git add -- .` from the project dir, which stages every b9 session's files there (squeaky step 6); the twin is
  dropped.*
- **(2026-09-10)** the Dell's crash
corrupted the monorepo's `.git/index` (all-zero header): back it up, delete it, `git reset` rebuilds it from HEAD with the
working tree untouched; `fsck` proves nothing else was hit.
- **(2026-09-08)** `git diff` elides binary assets — the icons patch needed
`--binary`, or the manifest ships pointing at files that do not exist

## Windows and the shell

- **(b9-16, 11-27) `TaskStop` on a background `pnpm dev` stops pnpm and leaves its vite child holding the port.** Twice
  on 4199 the `node …vite.js --port 4199` process kept listening after the stop. After stopping, read
  `Get-NetTCPConnection -LocalPort <port> -State Listen`, confirm the owning process's command line is your own vite
  (`Get-CimInstance Win32_Process -Filter "ProcessId=<pid>"`), then `Stop-Process -Id <pid> -Confirm:$false`.
- **(b9-15, 11-27) The Edit tool writes a `\u00a0` typed in its replacement as the literal no-break character, not the
  six-letter escape.** `trayLineEvery`'s "every\u00a05\u00a0years" landed as U+00A0 bytes in `src/ui/copy.ts` and its test,
  so ESLint's `no-irregular-whitespace` redded CI's quick job on `653aee4e` (fixed in `004df90f`); a Python heredoc
  carrying the same escape was refused by Claude Code's removal check. Write such an escape through a script FILE (a
  `.py` in the scratchpad, `'\\u00a0'` in its source), then `grep -c $'\xc2\xa0' <file>` must read 0.
- **(b9-7, 11-24; re-read b9-9, 11-25) `src/ui/shell/__tests__/Shell.test.tsx` and `copyGuard.test.ts` are CRLF
  throughout** (`Shell.test.tsx` was mixed, CRLF with a 59-line LF tail, until a later commit made it whole: 565 of 565
  lines at `48dbb7c1`, counted as CR bytes). An edit tool or script can flip a whole file's endings, so keep added lines
  CRLF and check that `git diff --stat` shows only the lines you added. `src/ui/devSeeds.ts` and
  `src/ui/__tests__/devSeeds.test.ts` are CRLF too (b9-14, 11-27): a script's exact-string replace with `\n` inside the
  needle finds nothing there, so edit these files with the Edit tool.
- **(b9-5, 11-24) A builder's scripted rewrite turns LF files into CRLF:** RC4a's builder edited through Python scripts
  (text mode on Windows writes `\n` as `\r\n`), and 42 changed files plus 7 new ones came back CRLF, so each diffed
  whole; the 7 new ones were committed that way (`7f56682e`, put back to LF in `10da60f2`). Before every commit:
  `git ls-files --eol -m . | awk '$1=="i/lf" && $2=="w/crlf"'` must print nothing, and each untracked file is read as
  BYTES (node: `readFileSync(p).includes(13)`), never `grep $'\r'` (it misreads here, below). Normalize with a node
  script that replaces `\r\n`; a builder's brief names this section.
- **(b9-4, 11-24) Stopping a background `pnpm exec tsx scripts/serve-dist-with-headers.ts` stops pnpm, not the server:**
  its `node` child keeps ports 4180 and 4181, and the next `pnpm verify:csp` silently REUSES it (`reuseExistingServer`
  off CI), serving whatever `dist/` it was started on. After stopping one, check `netstat -ano` for the ports and
  `Stop-Process` the listed PID; rebuild before a gate run only with the ports free.
- **(b9-10, 11-23) A gate piped to `grep` in a `&&` chain never stops the chain:** the pipe's status is `grep`'s, so
  `pnpm verify:doc-stats 2>&1 | grep … ; git commit … && git push` pushed `4a5bfd4d` over the TODO's cap. Capture the
  gate's own exit (`cmd > out 2>&1; rc=$?`) and commit only on 0. The same blindness: a background command ending in
  `echo` reports exit 0 whatever ran before it; read the log's own exit line.
- **(b9-7, 11-20) `src/ui/devSeeds.ts` and `src/ui/__tests__/devSeeds.test.ts` are CRLF** (`git ls-files --eol`: `i/crlf w/crlf`),
  while the e2e specs and the docs are LF: an edit script's anchors must match each file's own line ends, or
  find nothing (the composites plan's U2 line said LF until `aa22ac78`). Read `git ls-files --eol <path>` before a scripted edit.
- **(b9-5, 11-20) `TaskStop` on a background `pnpm dev` kills the `pnpm` wrapper and leaves Vite's `node` child serving the
  port** (seen on 4197: still 200 after the stop). Before reading a port as free, probe it (`curl --max-time 5`), find the
  listener (`Get-NetTCPConnection -LocalPort <port> -State Listen`), confirm its command line is your Vite
  (`Get-CimInstance Win32_Process -Filter 'ProcessId=<pid>'`), then `Stop-Process` it. A second Vite on the same project
  shares `node_modules/.vite` with a fit run's server: stop probe servers before a gate run.

- **(b9-1, 11-20) A gate that times out in page setup or teardown with no assertion line can be the laptop asleep, not a
  regression.** The re-point's U2 builder saw `verify:fit` go 188/192: four arms timed out at 180 s, none on an assertion.
  The Windows System log showed Kernel-Power 506 ("entering Modern Standby, Reason: Idle Timeout") and 507 (the power
  button) 208 s apart. A unit-suite run froze the same way, with one engine test at 231 s. The cause was the battery: the
  laptop had been unplugged by accident, so the battery's idle timeout applied (Briggsy, 11-20). Plugged in, it stays up,
  so no keep-awake step is owed on ordinary runs. Before calling such a timeout a regression, read events 506/507 and check
  the power source. If a long run must go on battery, hold a per-process keep-awake for its length and never change a power
  setting: a background PowerShell job calls `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED |
  ES_DISPLAY_REQUIRED)` (0x80000003) through `Add-Type`'s `kernel32.dll` import, polls for a stop file, then calls
  `SetThreadExecutionState(ES_CONTINUOUS)` and exits.
- **(b9-3, 11-16) PowerShell variable names are case-blind:** a gate chain's `foreach ($s in $steps)` overwrote the
  scratchpad path held in `$S`, every log path became `…\System.Collections.Hashtable\…`, nothing ran, and the background
  task still exited 0. Name a loop variable apart from every other variable in the script (`$step`), and read the
  chain's own summary file before believing a gate ran.

- **(b9-1, 11-15) A gate piped through `grep … | head` loses its exit code:** `pnpm verify:doc-stats 2>&1 | grep … | head -4 && git commit …` committed and pushed a red (`1a12e706`, START HERE over its cap), since the `&&` read `head`'s 0. Write the gate's output to a file, read `$?` (or `PINNED_EXIT`), and only then commit.
- **(b9-5, 11-13) PowerShell's `"EXIT $LASTEXITCODE" | Out-File -Append <log>` writes UTF-16** into a UTF-8 log, so a
  later `grep "^EXIT"` never matches and a Monitor waiting on that line expires silent. Append with
  `Add-Content -Encoding utf8`, and read a run's verdict from its own count line too.
- **(b9-1, pay check Phase C) The pay-check review's folders hold `node_modules` JUNCTIONS.** In `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-paycheck-whole-review\`,
  `pre\`, `pre-a4\`, `head\` and several lens folders each link the project's `node_modules`: remove each link ALONE
  (`(Get-Item <folder>\node_modules).Delete()`) before deleting any folder there, or the delete walks into the live tree.
- **(b9-6, 11-09) `src/ui/__tests__/copyGuard.test.ts` is CRLF; most of `src` is LF.** A `sed -i` on it rewrote every
  line to LF (3,626 lines in the diff); `node` restored it. Edit it with the Edit tool or an EOL-aware script, and run
  `git diff --stat` before staging. Git Bash's `grep -c $'\r$'` also miscounts CRLF here: count with `node`.
- **(b9-1, 11-09) A heredoc piped into `python -` in Git Bash hung to the 120 s timeout.** Write files with the Write tool.
- **(b9-5, 11-09) `cd` inside a compound Bash command moved the session's primary working directory** (twice, into the
  walk bundle), and later relative commands ran there; use absolute paths, never a leading `cd` into a subfolder.
- **(b9-4, 11-09) A pinned suite piped through `Select-Object -Last 15` hides the failing test's name** (the summary says "1 failed"
  only); pipe it through `Select-String -Pattern "FAIL|×|Test Files|Tests "` instead.
- **(b9-4, 11-08) The E-core rule bit again:** typecheck, lint and the build on `/affinity FF000` beside a pinned suite run
  turned 3 heavy tests into timeouts (525 s against 419 s clean); all green alone. Nothing heavy beside a pinned VITEST run.
  Measurement runs (tsx, no timeouts) can run several at once pinned to the P-cores: four did, each byte-equal to its re-run.
- **(b9-4, 11-08) `node -e` with a Windows path in a string dies on `\u11…`** ("Invalid Unicode escape sequence"): edit
  record files with the Edit tool, or write a script file.
- **(b9-4, 11-08) Probe copies with `node_modules` JUNCTIONS now live in `b9-build2-surplus\`:** `stream11-tree\` and
  `u11-residual\` (and `head\`, `v4-parent\`). Remove each link alone before deleting a folder.
- **(b9-1, 11-08) `cmd /c "start "" /b /wait /affinity FFF <cmd>"` reports exit 0 even when the command failed** (a failing vitest
  run came back 0). Launch through a wrapper `.cmd` that runs `call %*` then `echo PINNED_EXIT=%errorlevel%`, and read that line:
  the copy is `<b9-build2-surplus>\tools\run-pinned.cmd` (three lines; from PowerShell, `cmd /c "start `"`" /b /wait /affinity FFF <that path> pnpm test"`; proven with `node -e process.exit(3)` → `PINNED_EXIT=3`). The child really is pinned
  (a node child read its own affinity as 4095 = 0xFFF). **2026-11-19: the wrapper lived in `<B>`, which did not survive the Dell; rebuilt the same day at the same path from this entry. `FFF` is the Dell's mask; on the Lenovo, run unpinned (this section's "THE LENOVO" entry, b9-1, 11-19).**
- **(b9-1, 11-08) Never run a heavy job on the E-cores beside a pinned P-core run.** The identity sweep on `/affinity FF000` slowed
  the pinned suite from 534 s to 863 s (the cores share one power budget). Serialize: the sweep, then `verify:fit`, then the suite.
- **(b9-1, 11-08) The laptop ran about 2.5x slower than on 11-05 under sustained load**, with no other process busy: the whole suite
  pinned took 802 s (b9-6: 290 s), seven heavy engine tests timed out, and `verify:fit` timed out 12 final-tier waits. Every one
  passed alone (`playwright test --last-failed`, then `--workers=1`; each vitest file on its own). Under load the P-cores read
  about 100-120 % of base clock against 179 % idle. Before calling a red real, rerun the timed-out tests alone; an assertion is
  a finding, a timeout on this machine is not yet one. Never raise a timeout for it: "same tree, slower machine" is the
  machine until the timed-out tests pass alone.
- **(b9-1, 11-08) Another session's work shares the CPU:** the Feud session's `te_replay.py` searches each held a core through
  b9-1's first suite, and an orphaned `python.exe -` from a dead 10-30 session had held one for 9 days (killed with his OK, by
  `taskkill /PID`). Check `Get-CimInstance Win32_Process` for busy python before a heavy local gate.
- **(b9-1, 11-19) THE LENOVO: run heavy checks UNPINNED.** The whole vitest suite at `d9e5b637`, serial, the machine
  otherwise idle: unpinned 197 s, `/affinity F` (its 4 P-cores) 287 s, 5285/5285 green both ways. Four cores starve
  vitest's pool, so every "pinned to the P-cores" step below and in `TODO.md` is the DELL's and is dead here: launch the
  gate plainly, still one heavy run at a time. 197 s is this machine's whole-suite baseline; a run far past it is
  something else sharing the CPU (check `Win32_Process`). The `PINNED_EXIT` wrapper below still gives an honest exit code
  without `start /affinity` (rebuilt 11-19 at `<b9-build2-surplus>\tools\run-pinned.cmd`).
- **(b9-6) [THE DELL's — dead on the Lenovo, entry above] Run every heavy local check pinned to the P-cores, launched from PowerShell:** `cmd /c "start `"`" /b /wait /affinity FFF
  <command>"` (the children inherit the mask; vitest and Playwright size their pools to 12 CPUs). Unpinned, the work lands on
  the E-cores and the solve tests time out. The same `start` line through Git Bash's `cmd //c` hung with no child process.
  *Reconciled 2026-11-09: this entry's last line (b9-6, 11-05) said a light suite on the E-cores (`/affinity FF000`) beside
  a pinned long run does not slow it. Both 11-08 measurements in this section show heavy E-core work slowing a pinned run
  (beside the identity sweep the pinned suite went 534 s → 863 s; beside typecheck + lint + build, 419 s → 525 s with three
  timeouts). No light-suite
  case was re-measured, so the line is dropped as unsafe under b9-1's finding that the cores share one power budget.*
- **(b9-6) In a `.cmd` file, `echo EXIT=%errorlevel%>> log` loses the code:** `0>>` parses as a handle redirect. Write
  `>> log echo EXIT=%errorlevel%`.
- **(b9-4, 11-05) The archive `b9-build2-surplus\v4-parent\` is `88a5d125`'s project; its `node_modules` is a JUNCTION:** remove the link
  alone before deleting the folder. So are `b9-golive-review\verify\f1-seatmove\node_modules` and
  `b9-golive-review\verify\m4-clausehost\node_modules` (two review verifiers' scratch copies, b9-5).
- **(b9-7) TaskStop on a backgrounded `pnpm exec tsx` kills only the shell.** The node tree keeps running and keeps
  writing. List with `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` and kill with `taskkill /PID <pnpm pid> /T /F`.
- **(b9-7) `pnpm exec tsx -e` with a top-level `await` hung with no output** (killed after minutes). Write a script file.
- **(b9-6) Windows says a wrong-case path exists.** `[ -f src/intake/__tests__/AssumptionPanel.test.tsx ]` passed, but the
  file is `assumptionPanel.test.tsx`, and CI is Linux. Check a path's case with `git ls-files --error-unmatch <path>`.
- **(b9-3) A heredoc-fed JSON spec ate its backslashes again** (the Windows paths in a TODO edit: "Bad escaped character"); nothing
  was written. Edit path-bearing text with the Edit tool.
- **A Windows path written through a shell-inlined script loses its backslashes** (`\b9` became a backspace and `9`; `\U`,
  `\b` vanished): `594e4ae9` committed a mangled path, fixed by `a64c942f`. Write any path-bearing script with the Write tool
  and `String.raw`, and never end a `String.raw` with a backslash before its closing backtick (it escapes the backtick) —
  it bit again in b9-4: build a trailing backslash as `String.fromCharCode(92)`.

- **(b9-2, 11-08) `start "" /b /wait /affinity FFF` returns exit 0 on a failing vitest run** (again): read the output's "Tests" line.

- **(b9-10, 10-31) `TaskStop` on a background shell ends the harness's shell, but on Windows the child tree can outlive it.** The probe's
  pnpm → tsx → node → chrome-headless-shell tree exited within seconds; the `pnpm dev --port 5199` server's `vite.js` (under a
  `cmd.exe`) kept the port for ~25 minutes until stopped by pid. After every `TaskStop`, check the port
  (`Get-NetTCPConnection -LocalPort <port> -State Listen`), `Get-Process chrome-headless-shell` and the node command lines, and
  stop this session's survivors by pid.
- **From the b9 A7-review close (2026-10-29):** `b9-a7-review\fixes\head\` and `b9-a7-review\pre-a7\` (in the session
  folder `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\`) hold a `node_modules`
  JUNCTION into the project's own `node_modules` (as `b9-a6-head\` does). Before deleting either folder, remove the link alone
  (`cmd /c rmdir <folder>\node_modules`), never a recursive delete through it.
- **(2026-10-30, b9-3)** the Phase B review left a `node_modules` JUNCTION in `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-phaseb-review\head\`
  — remove the link alone (`cmd //c rmdir <folder>\node_modules`, or `cmd /c rmdir` from PowerShell) before deleting the
  folder or `b9-phaseb-review\` (its `verify-correctness\node_modules` is a plain folder now, checked 2026-11-09).
- **From the b9-2 close (2026-10-30), migrated at b9-3:** a Python `open(p).read()` in TEXT mode turns CRLF into LF silently,
  so an "is it CRLF?" check inside the same script is blind — read and write BYTES (or compare against `git show HEAD:<path>`) on
  any file you rewrite; `devSeeds.ts` and `devSeeds.test.ts` are CRLF. `sed -i` strips CRLF too. A seed figure equal to a sourced
  constant's value (`72000` is the §415(c) cap) reds the single-source gate — pick a figure no constant holds. Editing ANY `src`
  file while a fit run is going hot-reloads its dev server mid-test.

- **(b9-11, 10-27) Inline `node -e` scripts are shell-interpolated** — a regex with `$&` broke at parse (it failed before writing, so
  nothing moved). Write the script to a file in the scratchpad (the memory rule, met again).

- **(b9-7, 10-21) `node -e` mangles Windows paths.** The shell ate the backslashes in a TODO edit (`C:\Users\brigg\.claude…` came out
  `C:Users\brigg.claude…`). It was caught only by a snapshot + `cmp` at squeaky. Edit docs with the Edit tool, or with a
  script FILE, never `node -e`.

- **(b9-7, 10-21) `docs/insights/README.md` is CRLF, and the insight files are LF.** A `cat >>` append put LF lines into the CRLF index.
  The Edit tool keeps a file's own line ending. Count `\r\n` with a node script before trusting Git Bash.
- **Line-ending churn — and "use node instead" is NOT the fix by itself.** `sed -i` in Git Bash rewrites
  the whole file CRLF → LF; this repo is `core.autocrlf=false`, so the churn lands in the commit (an
  884-line diff on a 20-line edit). **But a node script that hardcodes `lines.join('\r\n')` does exactly
  the same thing in reverse** — hit 2026-08-02, turning a 196-line TODO edit into a 648-line diff.
  Rewriting a file? **Detect the existing ending** (`raw.includes('\r\n') ? '\r\n' : '\n'`) instead of
  assuming either. The real rule is the last one: **always `git diff --stat` before staging, and if the
  changed-line count is near the file's line count, it is churn — stop and fix the endings.**
- **(2026-10-30, b9-3)** `$'\r$'` inside a `$(…)` substitution in a Bash `for` loop matched EVERY line, so a CRLF count
read "all CRLF" on pure-LF files — count line endings with a byte loop (`node -e` over `readFileSync`), never grep in a
substitution
- **(2026-09-28, b9-1)** `devSeeds.test.ts` is CRLF: script edits need per-file EOL detection + a match-count guard (the first try matched 0)
- **(2026-09-28, b9-1)** a long heredoc AND a `node -e` with backslash escapes both mangled again — write patch scripts with the Write tool, then `node <file>`
- **(2026-09-27, b9-11)** the Bash tool truncated a long heredoc AND interpolated backticks inside a double-quoted `node -e` again — write the script with the Write tool
- **(2026-09-27, b9-11)** Git Bash's `sed`/`cat -A` hide CR: count `\r\n` with node before trusting a line-ending read.
- **(2026-09-27, b9-10)** Git Bash's `grep -q $'\r'` and `sed` HIDE a file's CR — a CRLF file (`healthSheetChrome.test.ts`, `copyGuard.test.ts`) read as LF and a string rewrite silently matched nothing; count EOLs with node before any scripted edit, and give every scripted rewrite a match-COUNT guard (it caught both misses before they wrote)
- **(2026-09-27, b9-10)** a stray `cat > file` with no heredoc waits on stdin and hangs the whole Bash call to its timeout — nothing after it runs
- **(2026-09-27, b9-sotd)** Windows `execSync` runs cmd.exe, which eats the `^` in `X^{commit}` — use `execFileSync('git', [...])`
- **(2026-09-27, b9-sotd)** `git diff --check` flags a CRLF file's `\r` as trailing whitespace — confirm real spaces before touching anything
- **(2026-09-26, b9-8)** several test files are CRLF (`magiLandscape.test.ts`, `magiLandscape.pbt.test.ts`, `partBTrend.test.ts`, `healthSheetChrome.test.ts`) — edit through an EOL-preserving script or the Edit tool, and check `git diff --stat` deltas
- **(2026-09-25 late)** the insights' long filenames exceed the MSYS path limit: `git show HEAD:<path>` fails with "Filename too long" and a shell EOL check silently reads garbage — count with node (`git -c core.longpaths=true show`)
- **(2026-09-23 evening)** an inline `node -e` whose script string carries backslashes is shell-mangled — a `.mjs` file, every time, even for a one-line patch
- **(2026-09-17)** a long `node -e` followed by a heredoc in ONE Bash command truncated silently (the shell reported an unmatched quote at a line the command never had) — scripts go through the Write tool, then `node <file>`
- **(2026-09-14)** an inline `node -e` with template literals in a replacement STRING is shell-interpolated (bit again: the digest's refuter lines printed blank) — edit scripts with the Edit tool
- **(2026-09-13 late)** `String.prototype.replace` with a replacement STRING treats `$$` as one `$` — an edit script that rewrites copy templates (`~$${x}`) MUST use a function replacer or every dollar in the slot silently vanishes (it did: 21 restored, caught by the one-year on-ramp arm)
- **(2026-09-12)** a process COUNT is not a running gate — `ps -W | grep -i chrome` counts his own Chrome windows; ask
`Get-CimInstance Win32_Process` for the COMMAND LINE (`playwright test --config …`, `vite --port …`) and read the gate's own log / `.last-run.json`
before saying "running" (his "I don't see anything running" was Earth)
- **(2026-09-12)** a Playwright run stopped by TaskStop on Windows leaves its worker AND its
Vite alive as orphans (the `gracefulShutdown` signal is ignored here); a second run on the same port then REUSES that Vite and races the orphan
for cores — kill by PID (`Stop-Process`) before relaunching, and treat a "timeout while setting up page" artefact in `test-results/` as the orphan's,
never the passing run's (`.last-run.json` carries the truth)
- **(2026-09-12)** a `tsx` probe outside the repo: CJS needs bare `C:/…` import paths; an `.mts` (top-level
await) needs `file:///C:/…` URLs, and `--tsconfig tsconfig.json` from the repo dir for the path aliases inside src
- **(2026-09-12)** an inline `node -e "…"` with a
template literal is shell-interpolated — the backtick block became empty command substitutions and wrote a mangled brief; scripts in FILES, always
- **(2026-09-11)** the Bash tool TRUNCATES a long quoted heredoc (≳100 lines: "unexpected EOF while looking for matching
`''`" mid-file) — write big files with the Write tool, never a heredoc
- **(2026-09-11)** an inline `node -e "…"` is shell-interpolated (a backtick runs a
command, `\n` collapses) — put scripts in files
- **(2026-09-08)** a detached
`pwsh -Command "cmd *> log; Add-Content …"` never appended its exit line — read Playwright's own summary
- **(2026-09-06)** `grep -ni "a|b"` without `-E` treats `|` literally and returns NOTHING — that
false negative produced the u13 spec's "no e2e walks" sentence in `85fb5dc1`; alternation needs `-E`
- **(2026-09-06)** an
inline `node -e` given a `/c/...` path fails — write scripts to files
- **(2026-09-06)** a Bash heredoc holding a long JSON with apostrophes truncated mid-string here, and another ate a
backslash inside a regex — write big edit payloads and scripts with the Write tool, then run the file
- **Landmines the 2026-09-05 session added (the chart text layer; the instrument half is insight 116):** a
`node -e "…"` string carrying `$2.25M` lost its dollar to SHELL interpolation and broke the quote — write
every script to a file with the Write tool and run it, never inline · the Bash tool persists any output
over ~30 KB to a file and shows 2 KB — read the file with the Read tool, don't re-run · `document.fonts.check`
returns true for a face that does not exist · `getBBox()` on svg text is the em box, not the ink · a
first-match regex over a stylesheet matched the retirement COMMENT and went green (match `selector {`,
comment-strip first) · a Playwright `:not(:checked)` locator re-resolves after the click — pin by
`[value=…]` · a `<span>` host for absolute children collapses their percentage positions onto one point —
`display:block` it · a unitless `0` in a custom property that feeds `calc()` invalidates the WHOLE
declaration (`transform` fell to `none`) — `0px` · `?seed=datemixed` renders no ladder; `?seed=failing` is a
RESOLVED band, not the placeholder; `solve:nc` renders no `svg.rv` — only `solve:surplus` does (~40 s a walk per viewport on the worker pool, 2026-10-03; ~5 min single-worker) ·
the dev server for measurement lives on **4197** (4190 fit · 4195 caddie · 4180/4181 CSP).
- **Landmines the 2026-09-04 session added:** a mutant REVERT anchored on a line that also appears elsewhere
fails the exactly-once check and leaves the mutant PLANTED while the chain reads green (the unwitnessable
arm's mutant line — `{ kind: 'unavailable', …, detail: payload.detail }` — is the aborted arm's line too);
verify the revert with the same grep count as the plant, on a UNIQUE anchor · `grep -c` returning 0 exits
1 and breaks an `&&` chain — the step after it silently never ran (cost one re-run) · `grep -c $'\r'` lied
about line endings in this Bash tool (2,689 CR lines counted in an LF file) — trust `git diff --stat` and
node's `raw.includes('\r\n')` · `String.prototype.replace` with a replacement carrying `$$` eats a dollar
sign (the window sentence lost its `$`; the existing pins caught it) — split/join, never replace · the
`failing` seed's live solve is sub-second even at full precision (the household dies in year one), so a
`?seed=failing` browser witness costs seconds, not the 11-minute budget — the goal-pick → held card was ~4 s · the MECHANISM I inferred for the bin ("the pool cannot absorb the perturbation") was refuted by the review fleet on the seed itself (the pool absorbs it with $8,732 to spare; every path depletes in year 0 so the surface is all-zero) — a 5-lens review with 2 refuters per finding confirmed 14 of 31, and the P1s were all this one false mechanism laundered into eight docstrings; probe a mechanism before writing it into the docstring a sentence will be authored from.
- **Landmines the 2026-09-03 session added:** the Bash tool mangles heredocs carrying nested quotes — write the
script to a file with the Write tool and `node` it · `.playwright-mcp/` and `temp/` are BOTH gitignored
(`.gitignore:24`, `:4`) — the `mv`-before-`git add` half was stale; what matters is DESTINATION: pass a
relative `filename:` on `browser_take_screenshot` (`scale` is a REQUIRED arg) and copy into `temp/<walk>/` · Playwright `fill` + an immediate Continue click can
land without a blur and not advance (seen once on the OOP step; a real tap blurs first) — click the
step heading to blur, then Continue · a power/network blip drops Vite's websocket and full-reloads the
page to ColdStart mid-walk · `:nth-match(label:has-text("…"), N)` is the selector for the sr-only
radios (the label intercepts the click) · CLAUDE_CODE_SUBAGENT_MODEL=opus is set in settings.json
since today — a fresh terminal picks it up; STILL pass `model: 'opus'` on every spawn and check
`/tasks` shows Opus · **(second session)** a temp script must be `.cjs` — the package is
`"type": "module"`, so `require` throws in a `.js` · the Playwright MCP's `browser_navigate` STALLS
the full 60s on a `beforeunload` dialog (the stall IS the witness; `browser_handle_dialog(accept:false)`
clears it and the page survives) · Playwright `fill` on a formatted currency field APPENDS ("6,500" +
"6600" → "65,006,600"); click → Ctrl+A → `pressSequentially` replaces · "Edit in the walk-through"
lands on step 1, never the section's step (no start-at-step API) · a `?seed=` route bypasses the vault
even when one exists; the plain `/` route is the Unlock check.
- **(b9-9/b9-10, 11-13) A scripted multi-line replace fails on the CRLF files** (`devSeeds.ts`, `devSeeds.test.ts`, `copyGuard.test.ts`):
  use the Edit tool; count line endings with `node`.

- **`src/ui/__tests__/copyGuard.test.ts` is a CRLF file in an LF tree, and `sed -i` rewrites it to LF:** a one-line `sed` turned
  a 35-line change into a 4,863-line diff (b9-10, 2026-11-23). Edit it with the Edit tool, or `unix2dos -q` it after; check
  `git diff --stat` before staging.
- **Two names one letter-case apart collide on Windows:** `yearTable.ts` beside `YearTable.tsx` made `./YearTable` resolve to the
  wrong file (TS1261). The table's composer is `yearTableChrome.ts` (the `*Chrome.ts` pattern) for that reason.
- **Vite's watcher can miss a second write to a file landing milliseconds after the first:** a `sed` then a heredoc append to
  `workbench.css` served the first write only, reload after reload. `touch` the file and it serves the whole thing (b9-10).

## The unit test suite

- **(b9-6, 11-28) `pnpm vitest run $(grep -l … )` with a grep that matches nothing runs the WHOLE suite** (no file
  argument means every file: 291 files, 200 s, beside whatever else is running). Check the list is non-empty first, or
  name the files by hand.
- **(b9-3, 11-28) A passing test's `console.log` never reached the terminal here** (`pnpm vitest run <file>`, a 64-point
  measurement grid printed nothing, `tail -30` of the run showed only the summary). Write a measurement's output with
  `appendFileSync` to a file in the session's scratchpad and read the file; never trust a printed count you did not see.
- **(b9-18, 11-27) `ActionItemsTray.test.tsx`'s tray reads the ANSWERED draft, fixed when `openTray` renders** (its `answer`,
  `spine(draft)` or `dated(...)`): an `appModel.update` made after it never reaches a row (a plan line's repeat moved from
  5 to 4 years still printed "every 5 years" and Refresh ran). A test of a refusal that a later plan edit causes must
  re-render the room with a new answer built from the edited draft, or load a kept what-if against a plan that already
  carries the edit.
- **(moved from TODO's distill list, b9-2, 11-23) A prop added to a component's TYPE but not to its destructure silently
  resolves to any same-named module binding** (`describedBy` in the walk's `src/intake/fields.tsx`, deleted at RC14, was a module function), and a
  `(s): s is string` filter guard then hides it from tsc. Destructure first, and name new props so they cannot collide
  (the prop became `describedByIds`).
- **(moved from TODO's distill list, b9-2, 11-23) A fake transport lane must `structuredClone` its REPLY like the real
  wire**, or the candidate re-attach path is never exercised; a pooled differential must tally lanes (at least 2 used), or
  a silent one-lane fallback passes as a pool.
- **A `// @ts-expect-error` arm in a vitest file still RUNS:** the directive silences tsc, not execution (a
  three-argument call threw at runtime once the methodology selector indexed the act's Record). Put compile-only arms
  inside a function that is never called: `const _compileOnly = () => {...}; void _compileOnly`
  (`workingYearTaxDisclosure.test.ts`).
- **(moved from TODO's distill list, b9-3, 11-23) A fixture guarded by a RANGE keyed to the old ceiling (`< 350_000`)
  keeps passing after the band narrows.** Guard the band's PROPERTY instead (each spouse's senior bonus still live),
  never a hand-typed bound.
- **(moved from TODO's distill list, b9-3, 11-23) Pin the element under test by its own class, never by a container's
  absence**: a test asserting "no `.subordinates` wrapper" as a proxy for "no relief line" false-failed the moment the
  wrapper hosted a second child (2026-09-11).
- **(b9-6, 11-15) A gate-off witness derived from `stillWorking` must lower the retired Sam's `retirementAge` to at or below his `currentAge`**: left at 58, a Sam of 55 to 57 reads as still working, and Alex's possible death opens the survivor gate (`SURVIVOR_GATE_WITNESSES`, `src/intake/__tests__/typedBelowWitnesses.ts`).
- **(b9-6, 11-15) The typed-below window read's `unknown` arm is unreachable by any draft** (its docblock in `src/intake/workingYearLeftOver.ts`; a horizon at the window top reads `null`): never write a test that demands it.
- **(b9-5, 11-15) Claude Code reaps a heavy BACKGROUND shell when the machine runs low on memory while the session
  idles** (a different killer from the OS reaper below): the pinned full suite launched with `run_in_background` died at
  its start line (7.4 GB of 32 GB free just after, ten Claude sessions holding their MCP servers and up to ~1.2 GB of tsserver each). The
  notice says never to re-launch it unasked. Run the files the change reaches in the FOREGROUND with `--maxWorkers=2`
  (11 files, 639 tests, 220 s, fine), and let CI's `pnpm test` be the full run; say so in the commit and the close.
- **(b9-6, 11-26) The laptop runs about 15 idle Claude sessions at once, and a background gate run was killed with
  2.7 GB free.** Run heavy gates (the full vitest suite, `verify:fit`, `verify:csp`, a build) one at a time, in the
  foreground, and never beside each other.
- **(b9-8, 11-09) A `// @ts-expect-error` arm in a test still RUNS.** The directive silences tsc, not execution: put
  compile-only arms inside a function that is never called (`workingYearTaxDisclosure.test.ts`, `_compileOnly`).
- **(b9-4, 11-09) `WorkingYearCostStaleSentence` carries `held` on its unrisen arm too** (`src/intake/workingYearQuote.ts`): any `toEqual`
  on a `rose: false` value needs it.
- **(b9-5, 11-08) A new dev seed moves more than its own arm's count:** `datesavedrisen` added 3 tests (parametrized seed arms),
  and two devSeeds sweeps pin the W-seed count by hand (`toBe(15)`). Read the live count from `verify:doc-stats`.
- **(b9-4, 11-05) The gesture hold now lets go ONE TASK after the click** (`src/intake/gestureHold.ts`). A test that asserts the
  released face right after `fireEvent.click` must first await a zero-delay task (`letGo()` / the async `release()` in
  `gestureHold.test.tsx`); with fake timers, `act(() => vi.advanceTimersByTime(0))`. The six W coordinate-tap arms in
  `verify:fit` were re-run against it green at both sizes (b9-5's fit lane, with the whole pay-check block).
- **The full suite times out the same heavy files under load** (`budgetTwoTrack`, `solvePayloadIdentity` ×2, and beside the R10 sweep `healthSheetSeedGate` too, plus a
  `SaveFlow` wait): twice this session, beside nothing heavier than idle review agents. Re-run the red files alone before
  diagnosing; never call it a regression on the full run's word.
- **From the b9-4 close (2026-10-30), migrated by b9-5:** a test "retype" that fires `change` with the value focus already put
  in the box (`CurrencyField` fills it with the figure on focus) fires NO React change event — the arm read a real product bug
  that was not there; a retype passes through other text (`'700'` then `'7000'`). A tap on an UNCHECKED segmented control
  reaches `onChange` twice (its click and its change), so an arm counting commits sees two — pin what each commit lands, never
  the count (filed Tier 4). A full-suite failure list needs the names: `vitest run --reporter=json --outputFile=<file>` and
  print `testResults[].assertionResults` with node — `| tail` keeps neither the names nor the exit code. A test written in a fix
  pass and never run sat red for two sessions: after any fix pass, run the WHOLE suite (and every gate whose surface it
  touched) before the next step.

- **(b9-14, 10-29) `copyFence.test.ts` (30 s default) timed out once in the full suite under load** — ESLint's cold start; alone it ran
  in 0.9 s, and the next full run passed. Re-run a lint-in-test timeout alone before believing it.

- **(b9-11, 10-27) `solvePayloadIdentity.health.test.ts` (180 s budget) timed out in the full suite under background-probe load**;
  alone it ran in ~53 s. Re-run a solve-test timeout alone before believing it; keep heavy probes off the suite.

- **(b9-10, 10-22) The single-source gate in `constants.shape.test.ts` scans EVERY `src` file, tests included**; only `engine/constants/`
  is exempt. A test elsewhere that types a DISTINCTIVE figure (now including `184500`) reds. Read the figure from the
  constant and type only the derived dollars. (b9-4, 11-15) A DERIVED figure can collide too: C at 80 %'s survivor X,
  11,250, redded it in two test files; write such a figure as its subtraction (`99_750 - 88_500`).
- **From the b9-toronto1 close (2026-10-14/15, the survivor basis + trim cut, the ACA itemized probe, three health-sheet Tier 0s):** the OS MEMORY REAPER kills a background full suite on this laptop — vitest's workers die, the log stalls with no summary, and the parent tree lives on as a zombie (kill it with `taskkill /T /F /PID <root>` after reading its command line); results are VOID, so never count a stalled log, never restart it unasked — run the files the change reaches in the foreground and let CI be the full run · `pnpm doc:reanchor` missed 27 bare continuations on PARTLY-moved multi-citation lines in one run (`ee62a839`) and `verify:doc-stats` arm 4 passed them green (it checks only that the line exists and is not blank — insight 136); after every re-anchor run a POSITIONAL pair-check — pair each bare token with the named citation it continues, re-read both lines at HEAD and on the tree, fix by content (754 pairs that day) · a stray `cat > file` with no heredoc blocks forever on stdin and leaves an EMPTY file behind — write scripts with the Write tool · `node -e` given a Git Bash path (`/c/Users/…`) inside a JS string resolves it as `C:\c\Users\…` (ENOENT) — put the script in a `.cjs` file and use `__dirname` or `C:/…` paths · a vite dev server launched in a background shell can survive `TaskStop` and keep its port — find the PID by port, read its command line, then `Stop-Process`.
- **`console.log` in a vitest run is SWALLOWED here** — a measurement probe that prints its answer
  produces a green run and no output, which reads as a silent failure. Write results to a file
  (`writeFileSync` to the scratchpad) and `cat` it. Cost one full 78-second run to discover.
- **Never measure the tree while an agent fleet works in it** — their scratch files produce bogus doc-stat
  reds and bogus test counts. Never run the Caddie walk concurrently with the full suite (CPU contention
  times out the final-tier waits). **A PARALLEL SESSION on another project is the same hazard from
  outside the tree:** 2026-08-20, three RecoveryFlow tests (the ~1s KDF waits) red inside a full run
  whose imports took 260s, then green isolated AND green on a full re-run — re-run the failing file
  alone before believing any timing-shaped red.
- **(2026-10-03 late, b9-5)** a fake pool lane must `structuredClone` its REPLY (the wire) or the candidate re-attach is never exercised — and a pooled differential must tally lanes (≥ 2 used) or a silent one-lane fallback passes as a pool
- **(2026-09-28, b9-1)** the constants gate flags a pinned figure typed in a test (`109000`) — READ the pinned figure, type only the algebra
- **(2026-09-26)** a new `EngineApi` method breaks ~21 hand-rolled test fakes (the `EngineHandle` mapped type makes each a compile error, by design) and the `memoryModel.test.ts` fake defaults `runningInWorker: true` — a lane gated on the worker DOES dispatch there; stub it inert
- **(2026-09-25 late)** `vitest` swallows `console.log` AND a temporary instrument under `src/ui/__tests__/` runs inside the full suite — name it `zz*`, pass its output path by env var, and DELETE it before staging (it fails the suite without the var)
- **(2026-09-24 evening)** the vitest config swallows `console.log` — an instrument must write to a FILE, or it "passes" in 341 ms having said nothing
- **(2026-09-24 evening)** a hand-typed engine number in a test (the trim gate's −7,500) is a pin that moves with the seed — read the new number off the failure and re-pin, never hand-edit toward agreement
- **(2026-09-24)** a `describe`-scoped fixture means a new arm goes INSIDE that describe — the file's last `})` was a different describe's
- **(2026-09-24)** a helper that loses its last caller reds lint, not typecheck — run both
- **(2026-09-08)** jsdom 29 has NO
`document.scrollingElement` (the TS lib types it non-optional) — the guard must be nullish, a `!== null` check threw in 60
tests
- **(b9-2, 11-14) The crown test runs two date searches** (~40 s in `workingYearCredit.test.ts`, timeout 240 s): run the suite pinned and alone, never raise the timeout. The crowned seed's provisional crown sits on the bar (margin 0): if walk 8 shows another offset, the test reds first; read its log before the line.

- **(b9-9, 11-23) jsdom delivers `popstate` a few tasks after `history.back()` / `forward()`**: an `await setTimeout(0)` after
  the call reads the phase BEFORE the event lands, and the late event then lands inside the next step (it left the room a
  test meant to stay in). Await the event itself (`backAndSettle` / `pressForward` in `src/ui/__tests__/workbenchRoom.test.tsx`).
  A `beforeEach` that resets `history.state` hides a stale-entry bug, so the leftover-entry arm there sets one on purpose.

## The fit gate and e2e

- **(b9-6, 11-28) Insight 186's held group name works only where the group is wider than its name.** `GROUP_NAME_HELD`
  (`src/ui/kit/DataTable.tsx`) keeps a name sticky inside its own header cell, so a one-column group (Cash Flows' Other
  inflows) has no room to move: scrolled half under Year and Age, the name slides under them as far as its column does.
  That is no defect (the name moves with its figures), but U13's half-under check (`left ≥ leadsRight`) reds on it.
  For a one-column group check the name never starts left of its own cell (`groupLeft`, `groupNamesHalfUnder` in
  `e2e/rc-screens.spec.ts`) and that the group spans exactly its column.
- **(b9-6, 11-28) A Playwright click on a header past the phone's first screen scrolls the table frame first**, so
  whatever the click opens inherits that scroll unless it is a new frame (a Cash Flows drill did, until the table was
  keyed by where the reader is, `CashFlows.tsx`). A capture that clicks into a drill and shoots shows that scroll: read
  the frame's `scrollLeft` before blaming the layout.
- **(b9-16, 11-27) An audit of "every box inside the row" catches the kit's hidden inputs first.** The ChoiceGroup's radios
  are screen-reader-only (`sr-only`) and a Base UI Select carries a hidden form input; each is a 1 px box off the flow,
  measured at x 0–1 outside the row. Measure what a person sees: `[data-choice]` labels and `input[type="text"]` (the U8
  arm in `e2e/rc-screens.spec.ts`). And a Range word-split check over prose reads `/[^\s-]+/` parts, not `/\S+/`: a
  hyphenated compound may break after its hyphen ("extra-coverage" in Probability's Medicare note).
- **(b9-4, 11-26; moved from TODO by b9-5) The look instrument's Settings block fails on a seed with no date** (its locator
  waits for the fan chart; the page itself is right). Look at Settings on `retired` or `datecoststale`.

- **(b9-2, 11-25) A second Vite server on this project breaks the fit harness's:** a `pnpm dev --port 5199` left from
  a real-app check shared `node_modules/.vite/deps` with the harness's server on 4190, and a 30-arm run failed 27 with
  `ERR_CONNECTION_REFUSED` at 4190 and "Execution context was destroyed" (the two optimizing deps over each other);
  with it killed the same 30 passed. TaskStop on the background `pnpm dev` does NOT end its child `node … vite.js` on
  Windows: `netstat -ano | grep :<port>`, check the PID's command line, `Stop-Process -Id <pid>`, before any fit run.
  **Seen again (b9-5, 11-26):** TaskStop on a look's `pnpm dev --port 5181` left `vite.js` answering 200 under its
  `cmd.exe`; `Get-NetTCPConnection -LocalPort 5181 -State Listen` named the PID and `taskkill /PID <it> /T /F` closed it.
- **(b9-2, 11-25) `rc-look.spec.ts` stamps `${UNIT}` into every describe title,** so `-g "RC18"` with `RC_UNIT=RC18`
  matches all 52 look tests, not the unit's block: filter by the block's own words (`-g "Settings and the Display"`).
  And a capture that toggles shell-level state (the tray handle; its open state lives on the shell, so it survives a
  page change) must act only from a known state: RC12's Investment capture clicked an already-open tray shut and
  waited 270 s for a row (fixed in `6fef3010`, it now opens only when shut).
- **(b9-5, 11-24) When a surface moves, specs you did not open still drive it:** RC4a deleted the answer page and ran the
  arms it knew; CI then redded `e2e/intake-fold.spec.ts` (its re-walk pressed the old page's `copy.assumptionDoorCta`)
  and `e2e/chart-text-rv.spec.ts` (it waited for the recommend invite there). `pnpm typecheck` never sees `e2e/`, and a
  spec naming a copy key that still exists compiles anyway. Grep `e2e/` (held instruments too) for every copy key and
  selector of each moved or deleted surface, and run every spec that matches.
- **(b9-5, 11-24) A builder trimming a big spec retires honesty arms it owes a port:** RC4a's first cut took
  `vertical-fit.spec.ts` from 7,000 lines to 1,150 and dropped the vault-return gates, the date order contract, the
  spend lane and more, all on plan 5.2's port list, and the ports then caught four real defects. Diff HEAD's
  `test.describe` titles against the new arms and the plan's list before accepting any retirement.
- **(b9-5, 11-24) Playwright's `click()` waits for "enabled", and `aria-disabled="true"` reads as disabled**: a withheld
  Apply (`aria-disabled`, kept pressable so a blur-then-press never loses the figure, insight 149) times the click out.
  Press it with `{ force: true }` when the arm means to prove a withheld press writes nothing. And Probability's tray,
  left open on a wide window, becomes the phone's full-height modal sheet when the viewport narrows (`useWide`): an arm
  that shrinks the window shuts the tray first, or every control behind the sheet is unreachable.
- **(b9-4, 11-24) The first fit run after the shell's new imports redded every arm the same way:** after the door press
  the address carried the shell's hash but the answer page was back on screen. A rerun on the same tree passed, and so
  did a run on a dev server with an empty dependency cache; the likely cause is Vite discovering a dependency the main
  graph had never reached (Base UI's dialog and menu, first reached through the shell) and reloading the page. CI starts
  cold and scans first. Read a same-shaped red locally as that before hunting a bug: rerun once on the now-warm server.
  CI's first fit run on the shell (`65021841`, run 45378402113) passed cold, so it has not reproduced there.
- **(b9-1, 11-23) The fit harness's Chromium has no classic scrollbar** (`clientWidth` reads the whole 1280), while a
  headed Chrome here shows a 15 px one, so a sideways margin read under the harness overstates a real window's by 15 px.
  Read a table's real margin as its narrowest width (the phone arm's `tableWidth`, or the frame squeezed in-page) against
  the frame less 15. The widest household's table: 1,143 px narrowest on Windows and 1,133 on CI's ubuntu (run
  45274348572: ubuntu reads this table NARROWER), against 1,224 under the harness (1,209 headed).
- **(b9-1, 11-23) The table's arms (`?seed=tablewidest`) assert its columns first** (since RC6, `TABLE_WIDEST_COLUMNS`
  in `e2e/rc-screens.spec.ts`): a seed whose crown drifts to today, or loses an account, would drop columns and make
  every width law vacuous. The seed was planted for the old table's boxes, so five Summary columns it never fills are
  read by `cashFlowsView.test.ts` alone; a width question about those five needs a wider plant first.
- **(moved from TODO's distill list, b9-3, 11-23) Measure a non-vacuity control in the app's own stylesheet, never
  assume the browser default**: the fit gate's "a bare `ol` has a margin" control (the re-point's U2) redded on all
  four arms because the old `src/ui/styles/base.css`'s `* { margin: 0 }` zeroed every element's margin (Tailwind's preflight, global since RC21, does the same); the marker and indent
  controls held. Read the control once in place before pinning its premise.
- **The re-entry gate is two columns at his 1440×731 window too** (68rem), and nothing pins its story column's fold, so its
  coda below the fold is a walk read, never a gate red; any fix is static (KD2's Fit). U2 pinned the story column's 20 px
  gap, not its bottom. (Moved from TODO.md's landmines block, b9-5.)
- **(b9-3, 11-21) A second tab opened read-only** (another tab holds the writer) shows the re-entry gate's "Continue to your
  answer", never "still about right", so `gotoVaultFinal` cannot drive the read-only member; nor can two pages of one
  browser context measure a writer frame each (the second is read-only): give each load its own context, as U6's
  injected arms do.
- **(b9-3, 11-21) A scratch vitest probe's `console.log` printed nothing** in `pnpm vitest run <file>`'s output here; write a
  probe's readings to a file in the scratchpad (`appendFileSync`).

- **(b9-9, 11-21) A re-sized paragraph's number is Windows-only until a CI run that carries the change reads it:** the
  plants read Windows = ubuntu to 0.1 px at body size, yet rung 3's borrowed size put `?vault=yearpafailing` at 722.5 on
  Windows and 743 on ubuntu (run 44872977380, red): Linux's slightly wider glyph advances pushed the step-down's last two
  words onto a third line. A frame inside by less than one wrap line (20.8 px at `--text-sm`) can flip. Read the fit log of
  the run that carries a size, leading or wrap change before restoring an assertion or writing "Linux" in a doc (the
  register said "Linux: rung 3's CI logs" before that run finished). The ubuntu wraps are readable without Linux: `gh run
  download <id> -n playwright-report-fit` (`playwright-report` before the 2026-11-22 split), unzip `data/*.zip` (the retry's trace), and read `screencast/`'s last frame.
- **(b9-6, 11-20) A yearly return rides `doctorYearlyReturn` (or `doctorYearlyReturnRecord`), never `doctorStaleVault`**
  (`src/ui/devSeeds.ts`): the stale doctor throws on a priced base and strips the extras answer and its vintage (a
  pre-extras save, which adds a re-confirm line); the yearly one keeps the start year and every answer and floors the save
  at `FIRST_UNAMBIGUOUS_SAVE_DAY`, and a plant using it declares `viewDay: RETURN_DAY`. Only `retired` enters extras
  (`pa`, `nc`, `fl`, `elsewhere`, `rec`, `recold` and `failingentered` spread it; `patypical`, `failingtypical`,
  `surplustypical`, `offtracktypical` and `pafailingtypical` answer "not sure"; `failing` answers nothing, which funds and
  shows the typical residual too): a new plant names its extras form in its key or docblock.
- **(b9-5, 11-20) The gate has a calendar: every spec the fit, fit-rv or Caddie harness collects takes `test` from
  `e2e/reviewSurface.ts`, never from `@playwright/test`** (the partition test's guard reds otherwise). That `test` pins each
  page's clock to `GATE_DAY` at UTC noon and reads the page's own day back when the arm ends; a date a spec computes in Node
  reads `pinnedDay(page)` or `pinnedYear(page)`, never `new Date()`. A plant viewed later (a yearly return) declares
  `viewDay` on its `AGED_PLANTS` entry and must be driven through `gotoVaultFinal`, or after `pinPlantDay(page, key)`: an
  arm's own `page.goto('/?vault=<key>')` without it views that plant on `GATE_DAY`. A yearly return is a plant viewed at
  its declared `RETURN_DAY`, never a doctor that moves the start year (a priced base refuses one). Only `Date` is fixed:
  `performance.now`, timers and animation frames run, so every settle wait still works.

- **(b9-5, 11-20) A window one run long can't be screenshotted reliably** (the spine's re-figuring window is ~3 s; 1440's hero shot missed it while 1536's and 1280's caught it). Read live geometry with an in-page `requestAnimationFrame` recorder armed BEFORE the edit that records the rects on the first frame the element exists; a dev preview with the state forced on is the measurement of record. For the re-figuring window that preview is `?preview=refiguring&seed=<key>` (`src/ui/preview/RefiguringPreview.tsx`, U5): the real app with every run after the seed's first final held, so one edit holds the window open. Its one blind spot: two notifies in one task paint as one frame, so a store-order fault that never crosses a task is the store suite's to catch, never the page's (`e95c17db`).
- **(b9-7, 11-26, RC21) The short laptop tier has ONE home: `--bp-laptop-short` (840px) in `src/ui/styles/theme.css`'s
  `@theme` block and its `compact:` variant** (`tokens.css` held it until RC21). Every short-tier rule is written as
  `compact:`; `scripts/__tests__/breakpoint-mirrors.test.ts` refuses a second height and binds every rem width in the tree
  to a declared tier, and `--laptop-fit-height` to `REAL.height`. A new tier is a product decision, never a literal.
- **(b9-4, 11-13) A new cause that takes another cause's slot reds THAT cause's arms, which a run of the new arm alone never
  reaches.** R1 (`3000a04c`) let the typed-below line take the Result's standing slot wherever a fresh typed W sits below the
  quote; the coordinate-tap arm (`?seed=date`, $72,000 typed under $84,000 of spending) still expected the moved line, and CI's
  whole `verify:fit` redded it at both sizes (run 43375528470) while the eight unlock arms had run green locally. Before
  committing a change to what a slot shows, grep `e2e/` for every arm that reads that slot (`.cs-paycheck-note`,
  `.reentry-notes`), and run each one whose draft reaches the new predicate, or the whole `verify:fit`.
- **(b9-3, 11-09) To typecheck `e2e/` (Playwright compiles with esbuild and never typechecks), use a scratch tsconfig that adds
  it**, and when it lives in the scratchpad it must name its `types` by absolute path (`<project>/node_modules/@types/node`,
  `<project>/node_modules/vite/client`) (b9-4).
- **(b9-5, 11-05) Never run an e2e harness while anyone edits `src`.** An HMR reload mid-wait reds arms falsely (the fit and caddie
  lanes saw final-tier timeouts and a vanished `[data-caddie-scroller]`); run the whole gates on a quiet tree, or a no-HMR server
  (the fit verifier wrapped `vite.config.ts` with its own `cacheDir` in the scratchpad, so the shared `node_modules/.vite` was never
  rewritten). Every Playwright run under a config cleans the shared `test-results/`.

- **From the b9-7 close (2026-10-30), migrated by b9-8:** `e2e/` is outside `tsconfig.json`'s `include`, so `pnpm typecheck` never reads a spec — check
  one with a scratch config that extends the project's, sets `typeRoots` to the project's `node_modules/@types` and
  `node_modules`, and includes the spec by absolute path. `verify:doc-stats`'s citation arm freezes only "not `" and
  "-at-filing`" tokens, while `doc:reanchor` also freezes "(then" — so a historical "`x.ts:N` (then)" is frozen by the tool and
  still CHECKED by the gate, and reds the day an edit lands a blank line under N; write a historical number as prose ("line N
  of `x.ts`"). A sentence that says "can look worse/better" reads as "is": say a direction only where it is measured, or only
  on the side whose over-read errs safe (the card's withdrawn mirror). (b9-6's, kept:) `git status --porcelain` prints REPO-ROOT paths, so a `git commit -- <paths>` built from it
  must run from the repo root — from the project dir every pathspec misses and NOTHING commits (no harm, but read the sha before
  believing a commit happened). A fixture that used a date seed as "the W-free draft" carries W since U10: strip
  `workingYearCost` where an arm measures the W-free case (seven arms needed it — the floor-reach pairs in
  `stalenessExposure.test.ts` and `reentry.test.tsx`, the methodology pair in the old `assumptionPanel.test.tsx`, `datemixed`'s W-absent
  twin, `dip`'s floor premise — W brings `employerHsaByPerson` with it — and the stale-W witness).
- **From the b9-5 close (2026-10-30, migrated at b9-6's):** `verify:fit`'s four-worker run can time out final-tier waits on
  this laptop under load (the `?vault=datestale` / `?vault=datearrived` returns at 90 s, reduced-motion chart text at 180 s;
  60–90 s alone) — re-run them with `--workers=1 -g` before calling one a regression (b9-6's run, alone on the CPU, went 152/152
  in 6.4 min). The full suite's parallel run can time out heavy tests the same way (`budgetTwoTrack`'s compute profile,
  `solvePayloadIdentity` F1 / F4, `.health` F2 — 126–325 s against 120 s limits; pass alone). A background Bash command ending
  `; echo "EXIT $?" >> log` reports exit 0 in its task notification whatever the gate returned: read the log's own EXIT line
  (bit b9-6 too). After a fix pass that touches a gated surface, run that surface's gate, not only the unit tests.
  `pnpm doc:reanchor <BASE>` moves a citation written FRESH in the tree a second time: classify every proposed edit first
  (`b9-phaseb-review\b9-5-mutants\classify-reanchor.mjs <dry-run output>` — SAFE / CARRIED / FRESH), hand-check each FRESH one
  and each REVIEW line (a citation inside a modified hunk is never moved), and move the second number of a comma pair by hand
  (the tool moves only the first).
- **(2026-09-27, b9-11)** the ONE width seam: a new `@media (min-width: …rem)` fails `breakpoint-mirrors.test.ts` unless it mirrors `--bp-laptop` (68rem) — a new tier is a product decision
- **(2026-09-26)** the spend lane lands a beat AFTER `data-answer-tier="final"`: a capture must wait out Probability's `[data-metrics] [data-spend="pending"]` (`spendRead` in `e2e/rc-screens.spec.ts`; the old page's `.cs-magnitude` is gone), while an arm measuring right after `final` is measuring the RESERVED pending box — both states are laws
- **(2026-09-23 evening)** a held look spec's style-tag lift must be REMOVED before the next dialog opens (a leaked `max-height:none` made the Roth frame an uncapped sheet no reader sees)
- **(2026-09-14)** a SECOND config under `e2e/held/` is a second OWNER of every held spec (the shots config collects `**/*.spec.ts` there by design — it is THE held harness); a new instrument is a `.spec.ts` under it, run filtered by file name, never its own config, and never a `.look.ts` (the partition walk only sees `*.spec.ts`).
- **(2026-09-11, evening)** `verify:fit` under self-inflicted LOAD reds arms that are green — running `verify:doc-stats` (its
`vitest list` collects the whole suite) twice DURING the fit run redded the two raised-root chart-text arms ("no figure matches
figure.band-figure": the band had not mounted when the audit ran); both pass in isolation and the full 139 passed on an idle rerun
(4.9 m locally). Never run vitest / doc-stats / a build beside a browser gate; a red under your own load is not a finding, and the
idle rerun is the proof
- **(2026-09-08)** `settleLayout` ENDS in `scrollTo(0,0)` — a gate whose subject is the scroll position must not call it before
measuring (the first mutant went green for exactly that). A planning probe whose settle ends there measures a page position,
not what an arm sees after a gesture (b9-1, the re-point: the steer note read 755.25 px in the probe and 593.25 in the arm's
viewport, which the goal pick had scrolled 162 px): replicate the arm's own measurement point, and check a "new red" against a
real gate run before planning a fix for it
- **(2026-09-08)** a Playwright `.click()` scrolls its target into view — use an
in-page `button.click()` when the offset is the subject
- **(2026-09-08)** Playwright's 390×844 mobile emulation
reports `innerHeight` 862 (870 on the first step) against a 844 `visualViewport` — pick one deliberately
- **(2026-09-08)** WebKit has no
`navigator.storage.persist()` — record, never assert
- **(2026-09-08)** taps and hovers land in VIEWPORT coordinates — on a 390-tall viewport scroll the target into view first
- **(2026-09-07/08)** `e2e/` is outside `tsconfig.json`'s include — nothing typechecks the specs,
so every new audit field needs a non-vacuity pin. Ink px differ
by rasterizer — 45.0 Windows / 42.0 Linux for the same glyphs (insight 118): pin structure by TEXT, floor ink
with a cross-platform margin, never a Windows number. A synthetic tap at an element's EXACT edge dispatches
nothing on 390@3 (insight 119) — inset 1 px. `test.fail` + a timeout = a real failure (insight 120) —
instrument tests measure first, assert last, and load ONCE (`setRootFont20` BEFORE `gotoSeedFinal`). Local
fit workers are capped at 30% (insight 121); `FINAL_TIER_MS` (150 s, `e2e/reviewSurface.ts`) is the one anchor
wait. `temp/` is
gitignored, and squeaky's step 4 deletes each closing session's own files there (and the files it only read, unless
another session is live), so nothing irreplaceable may live there: the 24 px instrument + measurements moved to `e2e/held/`
and the icon generator + sheets to `scripts/icons/` on 2026-09-08; screenshots are regenerable. *Reconciled 2026-11-09: this
said squeaky clears `temp/` UNCONDITIONALLY; its step 4 now deletes only the closing session's own files.*
- **(b9-9/b9-10, 11-13) `netstat` lists 127.0.0.1:4190 as LISTENING under PID 0 after a fit run.** Ghosts: probe with `curl --max-time 5`
  before reading a fit failure as a stale server's.
- **(b9-9/b9-10, 11-13) The e2e specs are outside `pnpm typecheck`.** Typecheck an edited spec through a scratch tsconfig in the scratchpad
  that extends the project's, names `types` by absolute path (`<project>/node_modules/@types/node`,
  `<project>/node_modules/vite/client`) and includes the spec by absolute path; confirm with `--listFilesOnly`.
- **(b9-9/b9-10, 11-13) A Playwright `-g` filter run through `cmd /c "start /affinity FFF …"` loses a quoted space**: a space-free regex,
  and read the count line, never the exit code.
- **(b9-9/b9-10, 11-13) W's block has no spaces between its parts in `textContent`**: an e2e compare reads `innerText`; a unit test
  compares `notePartsText(parts)`.
- **(b9-6, 2026-11-24, RC7) The harnesses' pinned page clock (`setFixedTime`) freezes Highcharts' redraw animation at its
  first frame.** A legend toggle then measures a stale plot edge and half-drawn ticks in e2e while it works in a live
  browser. Any arm or look capture that reads a chart after a redraw (a toggle, a resize, new data) runs under reduced
  motion (`page.emulateMedia({ reducedMotion: 'reduce' })`), which the shared chart default turns into no animation.
  The same pin holds a DEFERRED data label at opacity 0 for good (b9-10, 2026-11-25): Health Care's cliff counts read
  missing in every motion-on capture while a real clock faded them in within 1.5 s. A probe that finds a chart word
  missing runs once on a plain `@playwright/test` page (no pin) before calling it a product bug; and a chart's printed
  values are never deferred (`defer: false` on the SERIES' `dataLabels`: a point-level `defer` is ignored).
- **(b9-12, 11-25) `assertOneVisibleCaveat` in `e2e/rc-screens.spec.ts` asserts the R13 tie too** (since `a883c5e4`): at
  least one element in `main.result` must carry an `aria-describedby` naming the caveat (`IN_FRAME_DISCLAIMER_ID`). A new
  figured page whose figures lack `verdictDescribedBy()` reds; a state with no figure (Tax Strategies before a Winner card,
  Cash Flows' table until its `DataTable` takes a description prop) passes `false`, each with a comment saying why.
- **(b9-12, 11-25; widened b9-1) Stress Test, Social Security, Tax Strategies and Health Care render the StaleBanner**
  (every page printing figures run from the saved balances; `Shell.tsx`'s `figured`; the last two since round 3,
  `ff4e1c0d`). A stale or aged seed adds the banner's height above their one-frame arms; measure the frame on such a
  seed before adding one to those pages' arms. RC8's `?vault=rec` and `?vault=recold` arms passed with it on Windows.
- **(b9-12, 11-25) Run heavy fit arms in small groups on Windows.** Running RC4b, RC8, RC9, RC10 and RC11 together left
  four `?seed=dip` arms on "Working out your answer…" past the 150 s final-tier wait; alone they passed in a minute. A
  red that reads as a hung answer under a big `-g` is load first: rerun the failing arms alone before tracing a bug.
- **(b9-12, 11-25) The held look instrument looks up screens by id** (`screenById` in `e2e/held/rc-look.spec.ts`). Its
  index lookups into the `RC_ONLY`-filtered list once shot Social Security under the name "health-care", with a clean
  audit; a new capture block takes its screen by id, never by position.
- **(b9-6, 2026-11-26) A collector installed by `page.addInitScript` resets on every navigation, a `page.reload()`
  included.** RC19 put a reload before the CSP shell arm's only `violations()` check, so every violation from the walk
  went unheard under a green arm (fixed `6aa20fa6`). Read the collector before each navigation that resets it.
- **(b9-8, 11-27) The RC17 spending comparison is the tightest frame:** on `dip` with its stop-year what-if its caveat
  sits at 720.9 of 731 on Windows with the notes column at 2fr_3fr (`AnalysisRunsFrame`'s `split: 'notes'`), and its
  ACTION ITEMS handle below the frame by section 4.0's landed-what-if rule (`assertRc17Frame`'s `handleMayFollow`; the
  arm proves the handle reachable). A new line in that chart's notes column breaks the caveat; its six figures print
  at two decimals because three ("~$1.184mm") met their neighbour at that width.
- **(b9-7, 11-27) Read a sticky-held table's offsets at rest.** A held (sticky) cell's `offsetLeft` includes its stuck
  offset once the frame has scrolled, so a scroll target worked out after an earlier scroll lands short: the U13
  group-name arm's first version measured the second group still wholly off the frame's right. Set `scrollLeft = 0`
  and wait two frames before reading (`groupNamesHalfUnder` in `e2e/rc-screens.spec.ts`).
- **(b9-7, 11-27) A flex item's own client rects are ONE box however many lines it wraps to.** The top bar's name spans
  sit in a `flex-col` paragraph, so `span.getClientRects().length` read 1 under the bar that broke each name into five
  lines. Count lines on a Range over the text (distinct tops), as RC2's phone names arm does.
- **(b9-7, 11-27) Cash Flows → Accounts' table switcher stands outside `[data-cash-flows-controls]`** (only the market
  and plan selects are inside): reach it by role and name, `copy.cashFlowsAccountsLabel`, on the page.
- **(b9-7, 11-27) The Highcharts text audit fails a legend item paged past the chart's edge but reads no SVG clip:** a
  paged legend ("1/2") cuts its last visible row in half and that row passes. Assert the pager hidden
  (`.highcharts-legend-navigation`; Highcharts hides it once a legend stops overflowing, never removes it).
- **(b9-7, 11-27) A source edit during a live look or fit run reloads the page under test.** A mid-edit syntax slip in
  `cashFlowsView.ts` (Vite's transform error) reloaded the page six minutes into a Tax Strategies solve. Hold edits until
  the run ends, or stop it, kill its `vite` on 4190 and run it again clean.
- **(b9-7, 11-27) `?seed=inherited` holds Tax Strategies on both goals** (a converting winner over a non-converting
  runner-up: the shape guard), so the withdrawal stacks never draw on it. A look at those stacks: `?seed=surplus`, then
  Net Worth → Add account → Inherited IRA through the drawer (b9-10: $400,000, owner born 1945, died 2024, own IRA, no
  custodian figure, December 31 balance $420,000, left to Sam), then Tax → "Leave more behind": a winner in ~30 s, the
  stacks under Comparison → Withdrawals. Click the drawer's labels, not the hidden radios, and type each money box with
  a real keystroke and blur (a script's `fill` without a blur never commits it).

## The mutation harness

- **(b9-6, 11-09) The mutant runner, the suite, the sweep and `verify:fit` must run in sequence**, never side by side: a
  live plant is imported by any of the others (`chain.ps1` in `u11-walk4\` runs the first three in order, pinned).
- **(b9-6) Every copy shares the live tree's vitest results cache through its `node_modules` junction** (keys are
  `:src/…`-relative, the folder hash is of the empty project name). An A/B restores one snapshot of
  `node_modules/.vite/vitest/<hash>/results.json` before each run, or the second run inherits the first's order.
- **(b9-1) A mutant pass on this repo runs in a scratch COPY, never the live tree.** The pattern that worked:
  `fs.cpSync` the project's `src` plus `tsconfig.json`, `package.json`, `vite.config.ts` and `vite-env.d.ts` into the
  scratchpad, `fs.symlinkSync(<project>\node_modules, <copy>\node_modules, 'junction')`, plant by exact-string replace
  (anchor count 1), run `pnpm exec vitest run <files> --reporter=json` from the copy, restore and compare. Delete the junction
  ALONE (`(Get-Item <copy>\node_modules).Delete()`) before removing the copy.
  *Reconciled 2026-11-09: "never the live tree" is no longer the practice. Since walk 4's round (`3157a6da`, 2026-11-09) the
  walk chains plant in the LIVE tree, strictly in sequence with the suite, the sweep and `verify:fit` (the entry on the
  mutant runner running in sequence, in this section), because a live plant is visible to anything that reads the tree while it
  stands. When that cannot be guaranteed (another session working in the tree), this copy pattern keeps the tree clean;
  insight 148 records its copy-plus-junction half.*

- **(b9-6, 10-21) A copy mutant whose text also sits in another key plants twice.** The row ends exactly like `recDiscNiit`, so anchor the plant on row-only context.
- **From the b9-1 close (2026-10-08/11, Playwright 1.63 + the `ubuntu-26.04` pin; the essentials-floor measurement; the survivor-medical lean):** NEVER revert a planted mutant with `git checkout -- <file>` on an uncommitted tree — it restores HEAD and wiped a delegated build's whole `copy.ts` (recovered only from a verifier's scratch `.orig` + the agent transcripts' Edit inputs); snapshot with `cp`, revert with `cp`, prove with `cmp` · `playwright install` GARBAGE-COLLECTS every browser revision no linked Playwright still uses (`%LOCALAPPDATA%/ms-playwright/.links`) — a version rollback must re-run the install · `pnpm doc:reanchor` rewrote the FROZEN `e2e/held/fit-24px-measurements.md` (its header: numbers NOT maintained) — `git checkout` that one file after any reanchor (it carries no other uncommitted work) · the doc-stats citation arm checks a workflow-file line EXISTS, not that it says what the doc claims — four `.github/workflows/verify-the-back-nine.yml:<N>` citations were 1–4 lines stale before any edit; re-point by content after any workflow edit · the council's `uiCouncil` regex auto-seats the three UI specialists on words like "band" / "render" in the CONTEXT — name the six core `openers` explicitly for an engine question · ENGINE_PRICING_LEDGER row `shippedOn` must equal the commit's LOCAL date and no test binds it — re-stamp it in the commit if the land slips a day · a 16k measurement workflow over many off-roster variants ran 6.8 h (ship gate 1, `wf_d98e02fb-08c`) — budget the wall clock, keep the session's other CPU work off it · the window script once reported 3.6 % mid-session (it read another transcript) — distrust a sudden drop, re-run it.
- **Verify a planted mutant landed, and hit the right occurrence.** A no-op edit goes green and reads as a
  surviving mutant; a replace on the wrong line produces a real-looking red for the wrong reason. Match on
  a unique anchor, then `grep` the file back. **And run the baseline before diagnosing your own change** —
  when the task is "extend the harness to capture X," run the harness *first*.
- **Never `git checkout -- <file>`** to revert a planted mutant on a dirty tree; it nukes uncommitted work.
  Revert with Edit.
- **(2026-09-24 evening)** a mutant script MUTATES source on disk — never run it while any other vitest or measurement job is reading the engine
- **(2026-09-10, late)** never `git checkout -- <file>` to revert a mutant while the tree carries uncommitted work —
`cp` a backup and restore it.
- **(b9-9/b9-10, 11-13) A copy plant inside a slot is killed only by a test with the words typed by hand** (the review's L3 F4 proved it).
  Keep a by-hand pin for every new sentence form.
- **(b9-9/b9-10, 11-13) Never edit a plant file while the mutant runner runs**: it restores each file from its snapshot, so an edit there
  is overwritten; docs are safe.

## Citations and the doc gates

- **(b9-3, 11-28) `doc:reanchor` misses a bare `:N` more than 60 characters past its file name, and `check-citation-pairs.mjs`
  never sees an en-dash range end.** At `b66b3f4a` the pair-check listed 27 UNMOVED continuations (taxOverlay 25, simulate
  2) after one apply, and `:2917–2926` in `docs/backlog.md` came out half-moved (`:2940–2926`) with no line naming it. Move
  each UNMOVED token through `git diff -U0 HEAD -- <code file>`'s line map (a line inside a changed hunk maps to nothing:
  judge it by content), then `git grep -n -E '<file>[^|]{0,200}:[0-9]+–[0-9]+'` and check each en-dash end by hand.
- **(b9-4, 11-28) Moving the pair-check's UNMOVED bare tokens through the line map by find-and-replace breaks where the
  apply already moved a named token onto a number an old bare token still holds.** The pay-less spec's line 103 held
  `:829-835` (moved to `:851-857`) beside an unmoved bare `:851-857`, so a text match could not tell the two apart (2
  then 3 matches). Map each token with the re-anchor tool's own `mappingFor` (inside a changed hunk: judge by content),
  and move a line like that by position: read its bare tokens in order, check them against what HEAD's line held, and
  write the mapped list back.
- **(b9-2, 11-28) `node scripts/check-citation-pairs.mjs HEAD <file>` throws `Command failed: git grep -l -E <file>:[0-9]`** when no doc cites the file (git grep exits 1 on no match): that means nothing to pair, never a failure.
- **(b9-15, 11-27) `pnpm doc:reanchor <BASE> --apply` a second time against the same base shifts every citation twice.**
  It maps each cited line through the diff BASE → tree, so after one apply the docs already hold the new numbers and a
  second pass moves them again (its dry run printed the first apply's count, 72, unchanged). An edit made after the
  apply that adds or removes a line in a cited file needs `--only-missed`, or keep that file's line count (b9-15 folded a
  two-line comment back to one); check one moved citation by its text against `git show <BASE>:<file>`.
- **(b9-12, 11-27) `scripts/check-citation-pairs.mjs` reads ONE code file per run, and crashes on a file no doc cites.**
  It takes `<BASE> <code file>` and ignores any further argument, so b9-12's first run over two moved files checked only
  the first. And where no tracked doc cites the file by line, its `git grep` exits 1 and the script throws (a Node stack,
  `Command failed: git grep -l -E …`) instead of saying "none". Run it once per moved file; read a throw on `git grep` as
  "nothing cites this file" only after `git grep -l -E '<file>:[0-9]'` itself finds nothing.

- **(b9-9, 11-25) A builder's re-anchor is verified by rebuilding it, and the orchestrator's own doc edits ride a second
  commit.** RC9's builder applied `pnpm doc:reanchor HEAD --apply` twice and hand-restored; `verify:doc-stats` cannot see a
  double shift. To check: snapshot every changed file, `git checkout HEAD --` the citation-only docs, apply once, put every
  other file back from the snapshot, and `cmp` each doc against the builder's (b9-9: nine docs identical). A citation in a
  file with real edits too (a `copy.ts` comment) reads "touched" whether it was shifted once or never: check it by content,
  `git show HEAD:<cited file>` at the old line against the new. And never re-anchor the orchestrator's later doc edits
  over the builder's already-shifted diff: commit the builder's verified state first, then re-anchor yours against that
  new HEAD (`7072fecd`, then `11349a9d`).
- **(b9-7, 11-24) Re-anchor and run `verify:doc-stats` on EVERY commit that moves cited lines, never once per batch.** Milestone 1's
  fix part 3 (`84b2611f`) skipped both: CI redded on its stale test count, and its shifted `copy.ts` / `IntakeApp.tsx` /
  `Shell.tsx` citations stayed wrong while doc-stats passed (a cited line only has to exist). The next re-anchor from HEAD
  carried them forward. The repair: restore the docs the HEAD pass touched to HEAD, then re-anchor once from the skipped
  commit's parent (34 citations came right that way).
- **(b9-2, 11-23) After `pnpm doc:reanchor <base> --apply`, never run it against the same base again**: it reads the
  already-moved numbers as the base's and shifts each a second time (U8: 514 bogus moves and 38 bogus review items in the dry
  run that followed). For the real review list after an apply, run the tool's logic over the base's own text of each citing
  file, or re-anchor from a fresh base. The apply also moved insight 136's frozen historical citation, put back by hand.
- **(moved from TODO's distill list, b9-3, 11-23) A unit ID in prose collides across plans**: build 2's plan's own U13
  and build 1's "U13 working-years clock" sat in one sentence. Cite a foreign unit with its home ("build 1's U13").
- **(moved from TODO's distill list, b9-2, 11-23) `pnpm doc:reanchor` gives a bare `:N` to a file name only when that name
  ends within 60 characters before it on the same line** (`LAST_FILE`, `[^\n]{0,60}$`, `scripts/reanchor-citations.mjs`).
  Farther tokens are skipped silently and reported as "0 for hand review". On a long multi-citation line, re-check every
  far bare token by content after each run.
- **(b9-1, 11-22; moved from TODO.md's review's gates, step 3) The re-anchor procedure for a commit that moves cited lines:** `pnpm doc:reanchor <base>` dry into a file, every move checked by CONTENT with `node scripts/check-reanchor-moves.mjs <dry file> <base>` from the project dir, BEFORE the apply (b9-2's, replacing the Dell's classifier: HEAD's line at the old number must equal the tree's at the new; a range spanning edited code and every SKIPPED line are checked by hand, and the REVIEW lines read one by one), then `--apply` once; restore `e2e/held/fit-24px-measurements.md` from HEAD and refuse the moves of the quoted examples in `docs/landmines.md` (the "two new register entries shifted `docs/backlog.md:1980`…" lines) and in this bullet, and restore `docs/council-log.md` and insight 136 from HEAD (a commit that adds a council-log row saves its edited file before the apply and puts it back after: the old rows' citations are frozen); then the positional pair-check, `node scripts/check-citation-pairs.mjs <base> <each moved code file>`, every line it prints judged (a frozen record stays; a missed bare token is fixed by content). The tool reads only files inside the project: a cited file outside it (`.github/workflows/verify-the-back-nine.yml`) is re-pointed by hand, by content (b9-1 met five).

- **(b9-6, 11-21) TODO.md's start-of-file section runs at its 60,000-character cap** (59,993 at b9-5's close): a line added
  above the first `## ` heading reds `verify:doc-stats`'s TODO arm AND its unit twin (`verify-doc-stats.test.ts`, "the REAL
  TODO.md holds the shape"), so the full suite reds too. Pay for an addition in the same edit by moving a finished record
  out (git holds it), never by cutting a live prescription; measure with the arm before the CI list, not after.
- **(b9-6, 11-20) `pnpm doc:reanchor` moves frozen records unless they are restored or marked**: in four runs of the
  composites build it moved the held quote `e2e/held/fit-24px-measurements.md` and walked insight 136's two named
  historical citations (across sessions, `devSeeds.ts` 1079 → 1115 and `vertical-fit.spec.ts` 396-406 → 424-434) while
  their bare partners stayed put. TODO's review-gates step 3 (content-check each move, restore the held record and the
  frozen rows from HEAD) binds EVERY commit that runs the tool, not only the review's. A dated number marked "(then)"
  right after its backticks is frozen by the tool's own rule; insight 136's two are now (`8e204deb`). After the apply, the
  positional pair-check below still runs: that day's found six bare citations in
  `docs/plans/features/state-seed-increment-brief.md` already wrong at base.
- **(b9-6, 11-09) `pnpm doc:reanchor <base> --apply` edits `src` comments too** (370 edits in walk 4's round,
  `devSeeds.ts` and `stalenessExposure.ts` among them): run it once, last, after the sweep and the mutants, never while a
  plant is live.
- **(b9-3, 11-04) An edit after the one `pnpm doc:reanchor HEAD --apply` is not re-anchored.** A second run double-shifts
  every citation it already moved. Grep `<file>:<N>` citations past the edit's first line by hand (the fit spec had none past
  3170), or commit the late file on its own and re-anchor against the new HEAD.
- **(b9-8) Every `src` commit that shifts lines reds the full suite's citation arm until `pnpm doc:reanchor HEAD --apply`
  runs** (U4: 326 edits, U15: 21). Run the dry `pnpm doc:reanchor HEAD` before the suite, apply it once, then the suite.
- **(b9-5) After any register move, run the stale-tier scan** (`b9-tier-sweep\tierrefs.mjs`) and fix the live hits; leave the
  historical logs (`docs/caddie/cold-read-log.md`, `docs/plans/features/`) as written.
- **`pnpm doc:reanchor HEAD --apply` rewrote the FROZEN `e2e/held/fit-24px-measurements.md` again** (the Tier 4 entry's known
  shape): restored with `git show HEAD:projects/the-back-nine/e2e/held/fit-24px-measurements.md > …`. Its one REVIEW line (a
  citation inside a modified hunk) needs a hand fix — read the cited line at HEAD, then point at where that code is now.

- (b9-8, 10-30) `verify:doc-stats`'s citation arm checks only CODE targets: its `CITATION` regex has no `.md`, so a doc-to-doc citation such
  as `docs/architecture.md:119` is never checked. One inserted line in a cited doc silently shifts every one of them.
  `pnpm doc:reanchor HEAD` does move them, because its target filter includes `.md`. So:
  - run it last on any commit that edits a cited doc;
  - read its REVIEW list, where a citation inside a modified hunk is a hand call;
  - it also rewrites the dated logs (`docs/council-log.md`), whose citations are frozen as they were. Restore that file
    afterwards. `git restore --source=HEAD` is safe only while the log has no other edit.

- **(b9-14, 10-29) The once-only re-anchor rule below was broken anyway** — `pnpm doc:reanchor HEAD --apply` was invoked twice in one
  shell line (once piped to a count, once to a tail), so 276 citations moved twice (983 → 1109 → 1235). Capture ONE
  run's output to a file and read the file. The recovery that touches no other edit is
  `b9-a6-tools\unreanchor.mjs` (an LCS over lines with citation numbers masked puts HEAD's text back on every line that
  differs only in them; it snapshots first), then one fresh run, then the three checkers. `--only-missed` is no way
  round it (b9-11, 11-27): run after an `--apply` it re-proposed 50 applied shifts and moved them again. And the LCS
  revert puts back EVERY digit-only line, real edits included (the register header's count, README's and the roadmap's
  test counts): re-stamp those after it.

- **(b9-14, 10-29) The re-anchor tool still misses bare tokens on a line that names another file first** (four this time, plus four
  bare `taxOverlay.ts` tokens in `objectiveHeadline.ts`'s docblock that only `crossline-sweep.mjs` sees — the same four
  as b9-13), and still rewrites the two HISTORICAL lines (`docs/backlog.md`'s quoted re-anchor incident, insight 136's
  wrong-citation example): after the one `--apply`, run `pair-check.mjs` + `crossline-sweep.mjs` + `content-check.mjs`
  and put every recorded number back to HEAD.

- **(b9-11, 10-27) `pnpm doc:reanchor` runs ONCE, LAST — and docs edited after it ran need hand moves.** A re-run against HEAD
  double-shifts every token it already moved (its dry run proposed `solverCodeVersion.ts:154 → :171` for a citation
  already at the right line). Move the later ones by hand from content, then run `content-check.mjs` (the re-anchor
  tools folder) — every DIFF it prints must be a construct this change edited on purpose. It also rewrote a HISTORICAL
  example inside a landmine below (the "two new register entries shifted `docs/backlog.md:1980`…" line) as if it were
  live: reverted by hand; read its WOULD list for examples before `--apply`.

- **(b9-10, 10-22) `pnpm doc:reanchor` skips `index.ts` too** (two are tracked: `src/engine/constants/index.ts` and
  `src/engine/reference/solver-cases/index.ts`), the ambiguous-basename class. Run `git grep -n "index\.ts:[0-9]"` and fix
  by content. Its missed-bare-token class recurred: backlog's `:401-407` sat ~90 characters after `simulate.ts:488-491`,
  and pair-check's DOCHUNK section caught it. It also never moves a doc's citations INTO ITSELF, and neither tool flagged
  it: two new register entries shifted `docs/backlog.md:1980`, `:2269`, `:2344` (cited from inside the register) by +36.
  After any edit that adds lines to a doc, run `git grep -n "<doc>:[0-9]"` across the repo, the doc itself included, and
  compare HEAD vs tree content at each shifted number.

- **(b9-9, 10-21) The re-anchor after an engine edit.** `pnpm doc:reanchor HEAD` (dry run) then `--apply` made 148 edits, including
  dated logs and insights (the precedent `b4bbbd3e` accepted the same). Then: hand-fix each REVIEW token by content
  (a reworded cited line); run `pair-check.mjs` + `crossline-sweep.mjs` + `content-check.mjs` from the tools folder.
  `pair-check` flags a HISTORICAL token as MISMATCH (TODO's "`model.ts`'s `:889` … had been stale") — a recorded
  number stays. `crossline-sweep` found two bare `:151-152` docstring tokens the tool cannot see (fixed by hand).

- **(b9-9, 10-21) A plan doc under `docs/` must carry no line-numbered code citation and no count:** `verify:doc-stats` scans every
  doc there for both.

- **(b9-6, 10-21) A doc edit AFTER the apply that adds a line** shifts every citation INTO that doc below it. Grep `<doc>:N` and its bare continuations before adding (this run's one register line was checked clean).
- **From the b9-1 close (2026-10-16 evening, his three rulings + two in-session):** `pnpm doc:reanchor` LEAVES its REVIEW citations (inside a modified hunk) at their OLD numbers even under `--apply` — hand-fix each by CONTENT (HEAD line vs tree line); it moves only the FIRST number of a comma list (`ConfidenceStatement.test.tsx line 711 at 95c715e19,704` → `:741,704`, fixed by hand), it rewrites citations inside `.ts` comments too (check `git status` for test files you never touched), and it misses a bare continuation more than ~60 characters from its file name (four this session) · the honest post-run check runs from HEAD's side: take each HEAD doc token, map it through the code diff, and confirm the tree doc carries the new number — a tree-side scan ("does tree(N) still equal head(N)?") flags every correctly moved token in a uniformly shifted region (190 false positives this session) · a ruled word change can be FALSE on a route its ruling never saw — trace every render site through a workflow before the first edit (this session's trace found the aged-plan "starting now" and the wide-gap "add none" before a line was written) · `copyGuard`'s `require-hedge` is PREFIX-scoped: a figure-free mechanism pointer belongs in the `medicareExtras*` family with a figure-free pin, never an exemption list · the Healthcare sheet portals to `document.body` — an RTL `container.textContent` reads empty there · `node -e` ate a regex's backslashes again (`\S+` → `S+`) — any script with backslashes or backticks goes in a FILE · a capture-only `devSeeds.ts` plant runs AFTER the walk (the walk's dev server would hot-reload mid-capture), restored by copy + cmp
- **(2026-10-03 late, b9-5)** `pnpm doc:reanchor <BASE>` a SECOND time after `--apply` re-proposes the applied shifts (it diffs against BASE) — never apply twice; and it shifted a bare line token (725) that followed a named `taxOverlay.ts` citation of line 673 (then UNCHANGED — both are 2026-10-03's numbering, written here as words so the citation gate never reads this frozen record as live; the register's *`tax.rmdStartAge` vs 26 CFR 1.401(a)(9)-2(b)(2)* entry carries the live pair, and `ee62a839`'s run moved only the named one here, to 677) by `solveAnchor.ts`'s diff ("bare, after solveAnchor.ts") — read every bare continuation's governing file before trusting the shift (a fourth blind class beside the register's Tier 4 two) (filed in the register 2026-10-03)
- **(2026-09-27, b9-sotd)** `pnpm doc:reanchor` skips self-citations and ambiguous basenames (the Tier 4 entry) — in a parallel fix pass a number into ANOTHER file is its HEAD number, a self-citation the post-edit one, then the tool ONCE, LAST
- **(2026-09-27, b9-sotd)** a code-driven DELTA doc audit found 105 stale claims 21 h after a full audit and hours after a 100-agent review that restored five — after an engine-meaning commit batch, run one (`4c6b3e4f`'s message is the recipe).
- **(2026-09-26, b9-8)** the citation re-anchor is `pnpm doc:reanchor <BASE>` — this session re-invented it in scratchpad scripts (verified byte-identical, but the tool owns bare continuations and freezes); a bare `:NNN` on the line AFTER its governing `file.ts:` is invisible to a line-scoped remap (`model.ts`'s `:658` into `fingerprintOf` had been stale since before this session) [2026-09-26 delta doc audit: one more class the tool never re-anchors — a file's citations of ITSELF (`base === selfBase`, `scripts/reanchor-citations.mjs:84` / `:104`; `intakeMap.ts`'s four self-citations rotted +26 in `e04823a4`) — grep that class by hand after `--apply`]
- **(2026-09-25 late)** `pnpm doc:reanchor` SKIPS an ambiguous basename (`stateTax.ts` exists in `src/engine/` AND `src/engine/constants/`) — list every `stateTax.ts:N` citation, read the HEAD line it names, locate that content on the tree, and hand-fix AFTER the tool's `--apply`
- **(2026-09-25)** a finder lane briefed "Location A = the correct version; otherFile = the wrong one" files `file` = the CORRECT side — group fixes by `otherFile` for that lane or the wrong owner gets the finding
- **(2026-09-25)** a link scanner that walks `[text](target)` with a simple regex mis-calls insights 046 / 050 / 095 orphans (nested parentheses in the link TEXT) — they are indexed; check the README before believing an orphan list
- **(2026-09-25)** an audit's finder that quotes a hard-wrapped doc line gets refuted for "not verbatim" unless the refuter is told the docs wrap with a 4-space indent — say so in the brief.
- **(2026-09-17)** the reanchor tool maps from `git diff -U0 <BASE>` over EVERY changed file including `.md`, so it runs after ALL doc edits, once; the cites it lists under REVIEW (a cited line INSIDE a modified hunk) are hand-fixed AFTER it, never before
- **(2026-09-14)** the register's Tier 2 section does NOT open with "the family's other two primaries" — anchor an insert on the `## Tier` header line, never on a remembered first entry
- **(2026-09-13 evening)** the Edit tool needs a register bullet's exact bytes — Read the lines before Edit, never quote from memory (one bullet lacked the "(two seats, survived)" tail I remembered)
- **(2026-09-13)** a build brief's "re-point these three citations by hand" and a delta re-anchor tool are MUTUALLY EXCLUSIVE on the same citation — the tool maps from the base commit's numbers, so a hand-fixed citation gets mapped AGAIN (revert hand fixes to the old numbers, then run the tool once, last)
- **(2026-09-12)** a re-anchor maps from the BASE commit's numbers (`pnpm doc:reanchor <BASE>` diffs against BASE), so its
dry run before a fixer's edits and its apply after them legitimately differ (+1 became +8 on one file): never spot-check an
apply against a dry run's numbers
- **(2026-09-12)** arm 4 attributes a bare `:NNN` after a `.md` citation
to the nearest SOURCE citation on its line — name the file beside every bare continuation.
- **(2026-09-11)** a glob spelled `**/held/**` inside a `/** … */` block comment
CLOSES the comment ("held is not defined") — describe it in words
- **(2026-09-10)** the citation regex captures only the FIRST number of a comma list (a file name, a colon, then
72,95,120) and nothing of a bare `:232` — both forms are citations and both drift; inventory them separately
- **(2026-09-10)** a bare token's
nearest preceding named citation is the WRONG file 70 times in 287 (the sentence names another file in prose) — attribution
is a guess a verifier must check, never a fact
- **(b9-9, 11-22) A comment that grows by a few lines moves dozens of citations in unrelated docs:** six extra lines
  across three comments in `e2e/vertical-fit.spec.ts` and `src/ui/devSeeds.ts` queued 54 re-anchors across about 20
  plans. Reflow an edited comment to its old line count when the fix is wording only; a real new line (a register
  sub-bullet, a new arm) re-anchors with `pnpm doc:reanchor HEAD --apply`, then each move spot-checked to the same
  content. Never re-run `--apply` after it ran: the dry run then re-diffs against HEAD and lists the same moves again.
- **(b9-3, 2026-11-24, RC0) `pnpm doc:reanchor` cannot follow a citation into another file, and it binds a bare `:N` to the FIRST file named within 60 characters before it, not the nearest.** After an extraction moves code across files, rebuild the review list from each file's HEAD text (a scratch copy of the tool did it for RC0) and resolve each citation by hand; never re-run `--apply` on an applied base. doc-stats catches only a citation that lands out of range or on a blank line.
- **(b9-6, 2026-11-24, RC5 and RC7) An edit after the one re-anchor run shifts every citation past it, and doc-stats sees
  only the few that land on a blank line.** RC7's fix round moved 220 citations that way while doc-stats showed 3. The exact
  repair: rebuild each edited file's text as it stood at the re-anchor run, put it in a throwaway base commit made through a
  temporary index (`GIT_INDEX_FILE=<scratch>/tmpindex`: `git read-tree HEAD`, `git add -- .`, then `git update-index
  --cacheinfo` for each rebuilt file, `git write-tree`, `git commit-tree`), dry-run `node scripts/reanchor-citations.mjs
  <base>` (only those files' citations may move, by the edit's delta), then `--apply`. Undo any hand fix first so nothing
  moves twice. The real index and HEAD are never touched.

- **(b9-6, 11-28; U6's helper) Doc-to-doc line citations are never checked.** `verify:doc-stats` arm 4 resolves only citations into code; `backlog.md:NNNN`, `architecture.md:NNN` and `glossary.md:159`-style citations were already stale before gap 5's U6 and shift with every doc edit. Read a doc-to-doc line citation by its content, never its number (insight 136's class; a doc audit's to sweep).

## Copy and copyGuard

- (migrated from TODO's standing block by b9-5, 11-20) **One composer feeds every host** (the Result's slot, the gate, the seat in the sheet AND on the money-picture step): a change reds the fit gate's `PAY_CHECK_UNLOCKS` (TM's and the pension's doorless blocks and their seat blocks in the open sheet), the coordinate-tap arm, `reentry.test.tsx`, `resultPayCheckLine.test.tsx`, `IntakeApp.test.tsx`, `src/engine/__tests__/typedBelowTaxRider.test.ts` (it reads the near-line household's spans; U2's full suite caught it, no lane's own files did) and the caddie `intake:typedbelow` arm; since U2 also `src/intake/__tests__/typedBelowAmount.pbt.test.ts` (the amount rule through the real slots), `assumptionPanel.test.tsx`, `workingCostStep.test.tsx`, `devSeeds.test.ts` and `notePartsBlock.test.tsx`. The unit suite never runs Playwright: grep `e2e/` for every slot a round renames.
- **(the typed-below line's standing rules, migrated from TODO's close block 2026-11-20, b9-2):**
  - **The rider is ONE constant, `COMPARISON_RIDER` (`src/ui/copy.ts`), through `withRider(clause, glossYears)`**, the gloss on
    each line's first rider only (its look-back the engine's `irmaa` constant): a word change moves every pin on every host,
    each retyped by hand (no test imports it). The laws in `src/intake/__tests__/workingYearLeftOver.test.ts` and copyGuard's
    retired sweeps read the words by hand too.
  - **`NotePartsBlock` draws two lists, never both:** W's stale line (the out-of-date line) as the segments' `<dl>` with its
    door; the typed-below runs as `ol.note-parts__runs` with the survivor part's `p.note-parts__closing`. The stale line has
    its own `closing` (the segments arm's), drawn after the segments' `<dl>` and before the door, which then takes a `<dl>` of
    its own; never route the stale line through `runs`. A test reading the block's children sees `P DL P DL` there.
  - **x_t is refuted** (the rebuild plan's KD1; the register entry's NEGATIVE): a reviewer or reader who re-proposes x_t,
    "at least" or a "still working" condition on a credit re-derives a refuted finding. The survivor council's scope is
    "you're both alive", on a COMPARISON's head noun; credit sentences stay unconditioned ("while you’re still working"
    lives on the run LABEL only, the walk-9 spec's call (3)).
  - **A still-short span's difference is each cash on the cent, subtracted, rounded up** (`stillShortDifferenceDollars`);
    every other kind reads the printed figures. The register's V9 NEGATIVE forbids the printed subtraction and the
    raw-difference snap. The survivor part's X is not that rule: it rounds the raw survivor-charge difference up (the
    survivor plan's KTD4).
  - **Every span figure is the ALL-ALIVE picture's**; the comparisons say "you're both alive" and the death path's bound is
    the survivor part's X alone. A reviewer who calls a span "true on every path", or asks a span to carry a survivor figure,
    re-derives a ruled shape (council `wf_dfb7949b-4a7`).
  - **(migrated by b9-3) "Plus" is retired** (the walk-8 form spec's KD1): with the gap stated from the spending side it claims a direction the engine refutes. The rider IS ", except for any difference between the two answers in…" (walk 9's flip (i), built in `2f03a6ca`); never re-propose "plus", "not including", a typed-side "gain" close, "three-quarters", "all housing" or a "the tool works out your tax" line (the Hawk's vetoes).
  - **(migrated by b9-3) The moved fact's host is decided ONCE, in `composeReentry`** (exhaustive Record: `rulesLine | typedBelowLine | ownNote`), from what was actually drawn: the typed-below line reports `carriedMoved`, and a line offered the clause that did not carry it (or was never drawn) falls back to the own note. `IntakeApp` hands over both line forms and both doors and decides nothing; the Result reads `!leftOverClauseHost`. Never re-derive the host in a caller (insight 081); `reentry.test.tsx` pins all four arms.
  - **(migrated by b9-3) The stale survivor part keys on the draft, not the answer's host:** `staleSurvivor` (`src/intake/workingYearLeftOver.ts`) reads the held figure against the draft re-confirmed at the quote, under any answer; the LINE draws it only for a "saved" answer waiting on W, the waiting seat wherever it speaks a run. A's gap comparison is scoped on the line only (`staleNoteOf(d, true)`): the W surfaces' note stays unscoped, so the guard "the opening begins with the note" compares the scoped note there.
  - **(migrated by b9-3) Every existing witness and dev seed opens the survivor gate** (all descend from `stillWorking`: Alex 58 working, Sam 60 retired; Sam can die from 2032): only `SURVIVOR_GATE_WITNESSES.sam56` and `.youngerNonWorker` print the gate-off words. A fix to a span slot moves every pin on every host; retype the vitest pins by hand, never composed from the slots.
  - **(migrated by b9-3) The restatement predicates read what the line already printed** (`quoteNamed`, `typedNamed`, `savingsNamed` on `TypedBelowSpanFrame`; the walk-9 spec's call (1b)), never a kind or a host: a new sentence that names the quote or the typed figure must update them, or a figure drops where it was never printed (the restatement law and the lean law in the composer's test catch it).
  - **(migrated by b9-3) The money picture's ledger keeps "If you’re still working in …"** (the walk-9 spec, call (3)): its year 0 is its own row, so it marks no false stop. Never "fix" the ledger to match the line's ", while you’re still working" labels, or the reverse.
- **(b9-2, 11-16) The typed-below rider's completeness leans on two engine gates outside the copy** (the tax rider build's
  council, its architect). The rider (since walk 9's flip (i), the walk-9 form spec's U2: ", except for any difference between the two
  answers in income tax and Medicare’s income surcharge.", glossed by a comma clause on each line's first rider) covers the
  whole gap beyond the printed figure only because every working year prices no ACA premium and no HSA-qualified
  out-of-pocket spend (explicit 0s, `src/engine/healthcareStreams.ts`'s gated working years), and the intake refuses the
  date where the employer plan does not cover a retired pre-65 member (`health.employerPlanCoversRetiredMember`). Lifting
  either gate, or any change that makes the two answers' draw schedules differ (CRN), reopens the rider's words: re-run
  `src/engine/__tests__/typedBelowTaxRider.test.ts`'s identity first, then a council. The rider is one constant
  (`COMPARISON_RIDER`) that no word test imports: every pin types it by hand.
- **(b9-6, 11-15) The typed-below line's and seat's words read `workingYearTypedBelowWindow`'s spans, never a listed row, a retyped `min` or cap, or `checkAtQuote`**; `null` means no spans, not no line (the counts sentence still prints), and `unknown` keeps the fail-safe `workingCostTypedBelowAdds`.
- **(b9-6, 11-15) W's stale line shares `checkAtQuote` / `laterShortOf` / `shortRunFrom`** (the rebuild's KTD5): touching that core changes W-stale words on four seeds; its holes are the widened V3 register entry's, never a fix inside a typed-below round.
- **(b9-7, 11-13) A refuter's chosen HOST for new words can break R6 even when the words are right.** Walk 7's R2 put
  the at-quote sentences at the end of the W row's typed-below note; they read the answer, and that note sits directly
  above the left-over seat's radios in the panel, so a tap on "Spent" would have taken four sentences out from above the
  radio it pressed. Before placing answer-keyed words, find the host's position relative to the seat's radios: above
  them, only the methodology line and W's stale note may read the answer (the plan's R6 / KTD11 amendments); below the
  radios is R6's home for a line chosen by the answer.
- **(b9-6, 11-13) A refuter's fix words can bring back a wording a council struck.** Walk 7's R1 refuter wrote "Your
  answer takes none of those shortfalls from your savings", which council `wf_7fa86902-35c` struck in walk 4; only
  `copyGuard.test.ts`'s retired sweep (`RETIRED_EVERYWHERE`) caught it, after the build. Before building a refuter's or
  a card's words, grep `RETIRED_EVERYWHERE` and `RETIRED_BELOW_QUOTE` for each phrase, and word the fact in the
  council's own ruled clause where one exists.
- **(2026-09-26, b9-8)** a UI number moved by an engine fix (the step card's $218,000 → $224,000) is a visible change inside an unchanged sentence — say so to him the same turn, the words-are-his law covers meaning
- **(2026-09-24)** the `irmaaStep*` copy family lives in `slots` for its templated members — a PLAIN string with that prefix belongs in the `copy` catalog beside `irmaaStepBothBase` (a string dropped into `slots` made `copy.<key>` undefined and the new pins compared undefined to undefined — the render-sample census caught it, typecheck would have)
- **(b9-9/b9-10, 11-13) A first-load module reads `entryCopy`, never `copy.ts`** (`scripts/entryChunkGuard.ts`): a new gate word is
  checked with `pnpm build`.
- **(b9-9/b9-10, 11-13) A fix that names its hosts can miss one.** Grep every caller of a composer before a fix round changes what it says;
  carry the decision in the core (`WorkingYearLeftOverMoved.typedBelow`), never a conditional per host.
- **(b9-2, 11-20; migrated from TODO’s close block by b9-3) The methodology row is R14's** (`docs/plans/features/working-year-surplus-build-spec.md`): one static line by shown state, no dollars and no direction word (it reads the live draft far above the seat). A walk finding that asks it for dollars or a lean goes on the seat instead.
- **(b9-2, 11-20; migrated from TODO’s close block by b9-3) The levels caption's figures round** (`formatAbsoluteDollar`): ST's $105,000 budget prints "about $110,000" beside the line's exact figure, pre-existing and filed on the W8-R7 register entry; never change the rounding inside a copy round.

## Caddie walks and fleets

- **(b9-1, 11-12) A walk failure that does not reproduce on a fresh server is the server's first.** Before reading a
  walk failure as product, confirm nothing served the harness's port before the run: every Playwright config reuses an
  existing server locally (`reuseExistingServer: !process.env.CI`), and a `TaskStop`ped `vite` keeps serving. The
  11-09 `intake:kept` REAL failure passed three runs on fresh servers, with zero DOM mutations after the settle
  (`b9-build2-surplus\u11-walk6\panel\CHAIR-NOTES.md`, its foot).
- **(b9-1, 11-16; b9-2 the same day) Under a 40-target walk, a commit can land after the settled frame and replace a
  captured element.** On walk 8, `intake:kept` REAL failed at `result-kept-stale-both` in the CVD chart crop ("Element
  is not attached to the DOM") and passed alone. Since b9-2, `captureState` (`e2e/caddie-walk.spec.ts`) removes the
  files that capture wrote, waits the Result back to its settled final frame and captures the whole state ONCE more,
  so a bundle never mixes two frames; it writes `recaptured.txt` in that state's folder and logs a line. Read a
  `recaptured.txt` as a late commit on that state: its words may differ from what the walk asserted before the capture,
  so check them against the walk's own assertions. A second detach still fails the walk. What commits late is
  unmeasured; a fix to the product starts by recording which run commits after the settled frame.
- **(b9-8, 11-09) A seat's arithmetic can borrow the wrong quote.** `stillWorking` answers
  `employerPlanCoversRetiredMember: true` (`src/ui/devSeeds.ts`), so the pay-side premium is entered nowhere; walk 5's
  hunter priced it from the $1,100 after-work reference quote. Check the seed's own fields before a refuter carries a figure.
- **(b9-5, 11-09) Seats that write their reports to files never truncate** (walk 4: 16 seats, none lost; walk 5: 17, none
  lost): each brief names its output file, asks for a reply of 80 words or fewer, and the chair reads the files.
- **(moved from TODO's distill list, b9-3, 11-23) Probe cold seats only after their first answers lock**: walk 3 sent its
  four questions to the first looks and the spouse by follow-up message, after each had written an unprimed read
  (`docs/caddie/cold-read-log.md`, walk 3's card), so what they noticed alone stayed apart from what the questions
  showed them (no seat read a paycheck in either pass; the "which way?" gap showed in both).
- **(b9-4, 11-09) Two refuters' fixes can contradict each other:** R4 offered "settling on $105,000" for "checking your figure at" while
  R3 had just ruled "settle on" a bargaining word; walk 4's N3 offered "Check your figure" as the button where walk 3 had
  burned "check" as "look". Cross-read every refuter's fix, and the ruling it lands under, before adopting any one.
- **(b9-3, 11-09) The blocked W step's capture is scrolled to the top** (the settle recipe's `scrollTo(0,0)`), so its
  alert, about 1,300 px down, is never in `viewport.png` and no CVD arm covers it; no capture shows whether a real press
  scrolls to it.
- **(b9-5, 11-08; rewritten by W9-R7's U6, 11-20) A Caddie panel capture shows the OLD answer behind the sheet, and since W9-R7
  that is the honest frame.** A panel state is captured seconds after its edit, while the run on it is still in flight (walk 1
  measured a first commit up to ~18 s later), so the dimmed hero reads the answer from before the edit — walk 1's four seats read
  "the answer doesn't follow the edits". Since `c644ec2f` the window is marked: the hero's eyebrow line and the panel echo say the
  answer is being figured again, and `main.result` carries `data-answer-refiguring` until the first answer at the new inputs
  commits. So tell the seats the line is the signal, never retime the capture; a RESULT capture after an edit arms
  `armRefiguringWatch` before the edit, `expectRefiguringSeen` after it, then waits `SETTLED_RESULT` (all in
  `e2e/reviewSurface.ts`; the kept and typed-below walks do).
- **(b9-5, 11-05) Read a workflow's result through a summarizer script into a scratch file**, never printed raw: the `.output` file is
  JSON (`result` holds the script's return value) and the journal has one `result` line per agent. Printing them, and the go-live's
  whole diffs, is what spent b9-5's window.

- **(b9-8, 10-21) Fan-out outputs that must outlive the session go OUTSIDE the session scratchpad.** Use
  `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-<name>\`. Have the
  agents write files there and return only a count, which is how the doc review ran past the 50 % fan-out line.

- **(b9-8, 10-21) The 5-hour session limit kills workflow agents mid-run.** Resume with `resumeFromRunId`: finished agents replay
  from cache. A "failed" agent may already have written its file (design-lens did); the re-run overwrites it, so read
  the file's own totals line before trusting it.

- **(b9-6, 10-21) The Caddie walk now captures `door-N-<slug>-methodology`** (the assumptions sheet scrolled to the end of its methodology rows) and `crop-method-last-row`. These are the first frames ever to paint those rows; any methodology-row change reads them.
- **(2026-10-03 late, b9-5)** the Caddie walk's solve budgets (300 s lockup / 480 s test, `e2e/caddie-walk.spec.ts` `SOLVE_LOCKUP_MS`) are SHORT of a single-thread solve on purpose — a `solve:` red there is a pool regression until proven otherwise
- **(2026-09-27, b9-10)** a Caddie walk of a never-walked seed can hang on a product defect (the no-pretax Roth sheet had no Close) — read the dialog snapshot in `test-results/*/error-context.md`, and fix the product, never the harness.
- **(2026-09-26, b9-8)** a review fan-out's result is too big to read whole (270 KB for 100 agents) — parse the `.output` JSON's `result` field with node and print a table; never cat it
- **(2026-09-17)** the `caddie-ab` result envelope is JSON with `.result.targets[0].{panels,hunter,refuted}` and only a SUBSET of findings reach refuters (the highs + the hunter's) — read every seat's unrefuted mediums at source before the card says "clean" (the echo-ink entry came from one)
- **(2026-09-17)** the retired seed's worsened landing is NOT a fit-gated state: measure the base tree (stash → walk → pop, 25 s) before calling a fold overrun a regression.
- **(2026-09-14)** the `caddie-ab` seat schema caps observations at 200 chars and a seat that writes 201 dies after five retries — cap the prompt's budget line UNDER the schema (the fix belongs in `caddie.js` + `caddie-ab.js` together; still open — filed 2026-09-25 in the register as *Unscored Caddie tape rows + the increment-4 residuals*' PANEL-SCHEMA RESIDUAL)
- **(2026-09-14)** a Caddie door crop cuts at a scrolling sheet's fold, so a panel over a tall sheet reads WORDS only and the LOOK is unjudged unless a seat is told to check coverage — make the scroll-and-clip frames BEFORE the panel next time
- **(2026-09-13 evening)** a door crop cuts above a tall sheet's actions row — the blocked-Apply look needs the scroll-and-clip harness (this session's scratchpad `look/`; port 4197)
- **(2026-09-13)** a Caddie door crop cuts above a scrolling sheet's actions row — the look of a blocked Apply needs its own scroll-and-clip capture
- **(2026-09-13)** a review fleet of 114 agents is ~11 M subagent tokens and a 460 KB result — digest from the pretty-printed JSON envelope's `.result`, never the raw file
- **(2026-09-12)** the review fleet's raw result was 657 KB — chair from `digest-review.mjs` (synthesis first, then survivors with votes), never
the raw file
- **(2026-09-11)** the CVD per-chart crops select the bare `svg` — a crown row seated ABOVE the svg is outside them (the plain
`crop-ladder` / `crop-twofutures` / `crop-recviz` crops select the HOST and include it)
- **(2026-09-11)** a 182-agent panel costs ~19 M subagent tokens and ~250 KB of digest to
chair; chair from a digest script, never the raw result, and expect the window to jump ~25 % — start the walk EARLY in a session.

## Council

- **(moved from TODO's distill list, b9-2, 11-23) A council's draft of LOCKED text needs a seat that refutes the
  TEXT, not only the decision**: the D1 amendment draft (council 2026-10-12, `docs/council-log.md` row 19) stated the
  lower-bound relation backwards, and five of six elders first drafted the false "floor ≥ full" lemma; only the red team
  and the refuter caught either.
- **(moved from TODO's distill list, b9-2, 11-23) Count the roster before a council rules on a cost cap**: where cost is
  roughly linear in roster size, a cap and a coverage goal can be incompatible by arithmetic. The v10 ruling's +33% cap
  admitted only ~7 grid amounts beside `retired`'s 22, knowable before the council sat (`buildSolveRequest` over
  `DEV_SEEDS`, distinct grid amounts per seed).
- **(moved from TODO's distill list, b9-3, 11-23) A flip condition copied into a digest loses its conjuncts**: the
  rider council's chair wrote its flip as two conditions ("not including" read as "ignores", WHILE "plus" after "less"
  reads as widening the lean); the plan, the council-log row and the register each kept only the first, so walk 8
  "met" a flip whose second half no walk had tested, and the next council re-derived it from the machine-local journal.
  Record a flip in the chair's own words, every conjunct, and cite where those words live in the repo.
- **(b9-1, 11-19) Ask a council seat for words in its reply or a file, never "in your deliberation text":** five of nine
  opening seats died on a `reasoning_extraction` safeguard flag. A resume kept the clerk (same prompt, cached) and
  rewrote only the brief's tail for every later seat; the chair's file became the spec's verbatim source.
- **(b9-1, 11-19) Never ask a council seat to put its words "in your deliberation text" or "in your reasoning".** The walk-9
  form council's brief asked the chair and every seat for exact words there; five of nine opening seats (architect,
  minimalist, craftsman, advocate, design-engineer) died at once on an API `invalid_request`, "Opus 5.5's safeguards
  flagged this message", details `reasoning_extraction`, recorded by the workflow as abstentions. Fixed by a resume
  that kept the clerk's prompt byte-identical (so its 45-minute dossier replayed from cache) and rewrote the brief's tail
  after it: the chair WRITES the exact words to a file, the seats give theirs in their recommendation. A long ruling's
  words belong in a file the chair writes, which is also the durable record (b9-2's lesson: words that live only in a
  journal live on one disk).
- **(2026-09-26)** a council's draft copy is a floor, not the words — his read cut its duration phrase; offer the lean form, then take his ruling and record the evidence honestly (the "how long?" was the pilot's question, not his).
- **(2026-09-13 late)** a dead session's Workflow verdict lives in `~/.claude/projects/<proj>/<session>/tasks/<task>.output` (the `result` field) and its script under `workflows/scripts/` — recover from there, never re-run the council
- **(2026-09-13 evening)** the council-log's table header repeats per section — anchor an insert on the FIRST DATA ROW, never the header

## Claude Code, workflows and sessions

- **(b9-2, 11-28) `ce-doc-review` at full depth with six reviewers cost about 20% of the session's own window** (10% to 30%: its references, six JSON returns, the code checks behind each finding and the plan's rewrite) and about 1.45M helper tokens. Start it before 20%.
- **(b9-3, 11-25) A lead's message that lands while a teammate's shell call is still waiting on auto mode's safety
  check cancels that call, and the teammate is told "User rejected tool use … STOP and wait for the user"** (the
  result's `toolUseResult` reads "User rejected tool use" and carries no `permissionDecision`; all 291 shell calls that
  ran in that builder carry `accept`, from the classifier or an allow rule). RC14's builder's look run waited 17.6 s on
  the check (01:03:07 to 01:03:25.131); the lead's next ruling landed at 01:03:25.178; the builder rightly stopped and
  reported the run "declined", its idle notice read `"idleReason":"interrupted"`, and the lead read both as a
  permission problem. The same run had passed twice earlier in that builder, and RC15's builder ran it too. So: send a
  builder ONE batched message, never while a long command may be pending; on "User rejected tool use" with no prompt
  shown, or an "interrupted" notice, read the transcript (`<session>/subagents/agent-<name>-*.jsonl`: the result's
  `toolUseResult`, the call's `permissionDecision`) before calling it a refusal; the orchestrator runs the look itself
  either way (plan 7.1).
- **(b9-2, 11-25) A builder's report past about 1,500 words arrives cut off** in its idle notice ("result truncated"),
  twice in three Act 6 builds; asking for the rest costs a round trip. Brief each builder to send its report in at
  most two messages of about 1,200 words. A builder's own helper subagent can also report to the orchestrator instead
  of the builder: read it as the builder's input and wait for the builder's report. (b9-4, 11-26: the cut falls on the idle notice, not the message: of milestone 3's fourteen review seats and refuters, every report sent by SendMessage arrived whole, while four left as the agent's final turn arrived cut off at about 700 to 1,000 words. Brief a seat to SendMessage its report to the lead and end its turn with one line.)
- **(b9-7, 11-24) Workflow's `scriptPath` must be a path the tool returned or a file in a folder the session can Read:** a
  copy placed beside a returned script under `~/.claude/projects/<folder>/<session>/workflows/scripts/` was refused, and so
  was the returned path itself after an overwrite; the same file in the session scratchpad ran. Iterate a review script
  from the scratchpad.
- **(moved from TODO's distill list, b9-2, 11-23) What a session's activities cost of the 1M window:** a plan cycle
  (/brief, a research fan-out, the plan, a 9-agent deepen, a 5-agent doc review) ~55% with no code; plan, deepen, a
  4-persona review and a 21-agent council ~50%; one walked copy build (pre-trace, build, whole-file review, two Caddie
  walks, 103 panel agents) ~48%; a 9-agent verify fan-out to ~47%. U8 (b9-2: /brief, a delegated build and fix round,
  three review lenses and three adversaries, the docs and four distill commits) reached ~49%. Plan and build in
  separate sessions; budget one walked or reviewed build per session plus its records.

- **(moved from TODO's distill list, b9-2, 11-23) A Workflow run's `.output` file is one JSON object** (`summary`,
  `agentCount`, `logs`, `result`; `result` holds the script's return value), and the journal has one `result` line per
  agent. Parse it and read `.result` through a node summarizer that writes a scratch file and prints only what you need
  (the refuter survivors); slicing the text from the first `[` grabs `logs: []` instead. Printed raw (400 KB for 103
  agents), with the go-live's whole diffs, it spent b9-5's window.

- **(b9-4, 11-21) Claude Code's background-shell memory reaper can stop a long gate chain mid-run, and it leaves the
  chain's children running.** A backgrounded run of CI's list was stopped during `pnpm test` with "critically low on
  memory" while RAM was not short (measured afterwards: 11.6 GB available, the page file 118 MB used; the commit charge
  stood at 38.3 of 43.6 GB with ten sessions open). The vitest pool (`vitest run` and its 14 workers, about 3.5 GB) kept
  running: find such a tree by `Win32_Process` parent and `taskkill /PID <cmd parent> /T /F` it. Read memory as Available
  MBytes and the commit charge, never `FreePhysicalMemory` alone (it leaves out the standby cache). The harness says
  not to restart a reaped command unasked; Briggsy restarts it. The reaper stays off when Claude Code starts with
  `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1` in its environment.
  **Seen again (b9-8, 11-21):** the orphaned `pnpm test` ran on beside the resumed chain's own, both wrote one log
  (it showed 461 tests) and the orphan exited 1 into the summary. Before resuming, find and kill the orphan tree as
  above, give each rerun its own log file, and rerun the suite alone for its count.
  **Seen again (b9-9, 11-22):** a serial gate chain left running in the background while the session sat idle was
  reaped at its last gate, `pnpm test`, nine gates green before it; its vitest tree (one parent, ten workers) ran on.
  `taskkill /T /F /PID <the vitest.mjs node>` cleared it (free memory 3.9 → 6.0 GB). The notice says not to restart
  the reaped command unasked: name the gates it finished, and lean on an earlier green run of the same code if one
  exists, said so in the commit.
- **(b9-2, 11-20) A teammate's final report arrives TRUNCATED past a few thousand characters** ("[result truncated — ask
  the agent for the rest via SendMessage]", twice in one session): ask it to resend the rest in numbered parts, and never
  act on the half that arrived. A helper a teammate spawns hands back to the ORCHESTRATOR when its spawner sits idle
  ("the agent that spawned me had already stopped"): relay its report to the teammate that owns the work.
- **(b9-5, 11-15) The Workflow tool needs Briggsy's opt-in IN THE SESSION** ("use a workflow", ultracode confirmed by a
  system message, or a skill he invoked): a squeaky handoff or a TODO line is not it. The council and the three blind
  plan readers are Workflows, so a session without it cannot run them; ask at the session's start. A review round can
  still run as Agent seats (`BRIEF.md` + `VERIFY.md` in `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-build2-surplus\u11-wholewindow\review-r3\` are the shape: briefs as files,
  replies as JSON under a cap, three refuters each judging every finding). That round (b9-5: five finders, one
  failure-mode angle each, and three refuters) cost about 2.8M helper tokens and about 40% of the window with its fix
  commit. A refuter severity split over one fact is a claim question (what the sentence asserts): settle it by the
  plan's own rule for that sentence, never by the vote.
- **(moved from TODO's distill list, b9-3, 11-23) A file:line another agent hands over is a claim about a tree that
  keeps moving**, whether a scout's, a council's "verified in source", a skeptic's or a digest's: re-open each line
  before it enters the register or a build, and builders re-derive anchors. Two of a chair's anchors were a different
  comment (2026-09-24); a council cited a file its API had since replaced (2026-09-13); a three-day-old digest's
  anchors were stale on every item (2026-09-08). A verifier that trusts a skeptic's line number is as wrong as one
  that trusts the verifier's.
- **(moved from TODO's distill list, b9-3, 11-23) Read the tree, not the editor, after a helper's edits**: the TypeScript
  diagnostics delivered after a builder subagent's run named seven calls to a renamed helper and an unused new one,
  while the file held neither; they were mid-edit snapshots. A typecheck of the file as it stands and a grep settle
  each in one call. Never act on a diagnostic about a file another agent was editing until the tree confirms it.
- **(b9-4, 11-15) A helper can go idle on a progress line and never send its result.** The U4 pins helper's last word
  was "waiting on the final combined run"; no run existed, and the main loop reported it as live for about 16 hours.
  An idle row with no result is no running job: read `Get-CimInstance Win32_Process` for the command line, then run the
  helper's gate yourself before reporting its state. **Seen again (b9-1, 11-25, milestone 2's review):** two refuter seats
  backgrounded their own probes and sat idle about 50 minutes until nudged; brief a seat to probe in the foreground and
  write its readings to a scratchpad file, and check those files at a deadline (insight 177).
- **(b9-7, 11-13) A subagent cannot write a `.md` report file: the harness refuses it ("subagents should return
  findings as text").** All four round-review seats briefed to write `REPORT.md` sent the whole report back as their
  reply instead, 3–5K tokens each into the main window (`.mts` probes in their folders still wrote). Brief a seat to
  REPLY with its findings under a word cap (a table first), and write the record yourself from the replies.
- **(b9-5, 11-13) A whole fleet of Agents can die at once on an auth error while the main loop keeps working.** Walk
  7's eight refuters, launched together, all ended before reading a file on "Please run /login · API Error: 403
  Attention Required! | Cloudflare" (authentication_failed); the eleven seats launched minutes earlier had finished
  clean. Read every notification's status before chairing: a "failed" row is no report. Relaunch once; the same 403 a
  second time is a `/login` for Briggsy, never a retry loop.
- **(b9-10, 10-31) Every stage of a Monitor pipe must flush per line:** `grep --line-buffered … | cut -c1-600` held every event in `cut`'s
  buffer, so the first probe monitor never fired. Drop the trailing filter or line-buffer it.

- (b9-9, 10-31) A subagent cannot write a file named like a report (`REPORT.md`): the harness's guard refused it in all three fix lanes. Ask
  for the depth in the return value or a differently named file.

- (b9-8, 10-30) A Workflow's task output file wraps the script's return value as `.result`:
  `JSON.parse(text.slice(text.indexOf('{'))).result`.

- **(b9-6, 10-21) Workflow args.** A JSON-encoded placeholder crashes at parse, with 0 agents spent. Pass real values, and send big inputs as files the agents read (`batch-N.json`), never inline.
- **From the b9-4 close (2026-10-20, (B) planned):** the plan + its deepening + a four-persona doc review + a full council cost ~50 % of the window (10 opus agents + a 21-agent council, `wf_ef6cf7c5-a2b`, 2.27M subagent tokens, ~31 min) — BUILD (B) in a FRESH session, never on the planning session's tail · the build is ONE commit (U1–U7): the `dip` re-tune (the register's same-commit law), the ledger row (a row-less engine push recomputes saved vaults silently — the witness cannot see the gross-up), and the test counts (`verify:doc-stats` arm 1 is a CI step) are all CI- or honesty-coupled · the register's reach measurement for (B) covered only the channels its title names — the year's OTHER portfolio draw (a retired spouse's Medicare/extras, `fundingNet`) was found only by the deepening's flow analysis: a reach measurement enumerates EVERY portfolio-funded dollar in the year, not the named ones · a binding NEGATIVE can be falsified by its own entry's Prescription formula (tax(W+X) − tax(W) charged $0 where Social Security alone is taxable) — check the formula against the NEGATIVE before building it · `bridgeYearMask` is built only under `healthcareEnabled` (`simulate.ts`), so any guard keyed on it is silent on a healthcare-off run (the plan's KTD5 builds it under the construct) · a session can be FORKED into a background job mid-conversation (this one became `b9 (2)`, a new session id, its scratchpad gone) — `/window` takes `$CLAUDE_CODE_SESSION_ID`, never a remembered id · background sessions: `claude agents --json` lists them, `claude stop <id>` stops one and keeps its conversation; an INTERACTIVE terminal session is not a daemon job (`claude stop` answers "No job matching") and killing its `claude.exe` is classifier-blocked ("Interfere With Workloads") — it needs `/exit` in its own window; never `claude daemon stop`, which ends EVERY background session, the caller included · uscode.house.gov answered "Under Maintenance" 2026-10-20 — LII (`law.cornell.edu/uscode/text/26/<section>`) carried §402 / §86; IRS PDFs read clean through `pdftotext -layout`.
- **From the b9-2 close (2026-10-19, his four b9-1 walk rulings + his Medicare re-ruling):** the harness now COMPACTS an idle session (summarizes it; it does not clear it) ~55 min after a turn ends — twice this session (212,652 → 43,451 and 485,045 → 45,821 tokens), and the status bar read ~0 after. Write the squeaky close while the session's detail is live, before he walks away; the full log stays on disk (`~/.claude/projects/<slug>/<session>.jsonl`) for anything the summary dropped. `/window`'s first read after a compaction was the stale pre-compaction 48.3% — fixed in the monorepo (`7faa5c5d`); it now prints "compacted … no live read since" · one walked copy build (pre-trace + build + whole-file review + TWO Caddie walks, 103 panel agents) cost ~48 % of the window — keep ONE walked build per session · a healthcare-sheet fixture account added without `manualBlend` left the draft with no priced run, so the per-person extras block never rendered — fix the fixture, never the assertion · the Caddie panel's output file wraps the verdicts as `{ summary, …, result }` — parse `.result` · a seat arm whose every fixture shared an incidental property (a step card) let a step-keyed seat mutant survive, and a sibling assertion that implied its parent hid a second — vary the incidental property and assert each parent directly (insight 140's *Also Applies To*).
- **From the b9-toronto3 close (2026-10-16, the one-figure Medicare card's first-year frame):** a RESUMED Claude Code process carries the git snapshot of its START — this session's process had run since 2026-10-12, so its context reported nine "uncommitted" files that b9-toronto1/2 had long since committed; run `git status` live before reporting the tree · the Caddie walk captures no pixel of a scrolling sheet's below-fold card: `LOOK_OUT=temp/look/<run> LOOK_SEEDS=<seed> pnpm exec playwright test --config e2e/held/shots.config.ts medicare-cards-look`, then copy `2-premium-card.png` / `4-sheet-full.png` / `3-step-card.png` / `dialog.txt` into the bundle as a `door-5-see-your-health-cost-picture-scrolled-premium` state (viewport / fullpage / crop / copy) BEFORE the panel runs — never beside vitest · a pilot lean is a claim too: the no-trend-line build (the no-era precedent) was refuted by the first walk ("start at" alone read as WHEN) — run the walk before calling a frame fixed · `pnpm doc:reanchor` moved insight 136's historical copy citation (then 1186) AGAIN (its second time) — corrected 2026-10-16: 1186 was already a moved value (the insight was written at `f74f6ee6` as copy 1178, `verdictMedicarePriced` that day, and `c1ada867`'s run moved it unnoticed), and five of its line-11 citations have moved since it was written — restore all five by hand to the `f74f6ee6` text (taxOverlay 1796/1853 and its bare 1853, devSeeds 1079, vertical-fit 396-406, copy 1178) after every run until the register's Tier 4 entry excludes historical records; the positional pair-check can be scripted from the dry-run log (HEAD line vs tree line per endpoint — 245 endpoints, 0 mismatches this session) · a full-bodied session (a 66-item verify, two six-lens walks, a 13-agent review) reaches the 50 % context line by the second walk — budget ONE walked build per session plus its records
- **From the b9-2 close (2026-10-11/12, D1's Tier-1 key; the ACA step-1 link; the survivor + trim measurements):** background Workflows STALL when the laptop sleeps or its battery dies (23:15 → 15:07 the first night, again at the battery death) and resume on wake — never promise overnight work without an awake machine · uscode.house.gov relaunched as a static "temporary format" by 2026-10-10: the old `view.xhtml` / `currency.shtml` forms answer HTTP 200 with a 5,792 B "Page Not Found - US Code" body (and for two days a stale 14.6 KB house.gov maintenance body — the pilot called a dead URL an outage on 10-11; Briggsy called it) — fetch the ROOT and follow its links, check the BODY, never the status or `<title>`; the ACA record's `forwardClock` carries the URL forms · `node -e "…"` in Bash runs backticks as commands — it inserted a holed bullet into `backlog.md` this session (caught in the diff, rewritten from a script file); any script text with backticks goes in a FILE · `pnpm doc:reanchor` met three more shapes (the register entry's ⚑ 2026-10-12 bullet) — run it ONCE per base, read every "(bare, after" line AND every line citing a moved file for a second bare token, restore historical citations (insight 136's copy citation — written here as 1186, and the tool moved this mention too, to 1199 then 1214; corrected 2026-10-16: the as-written value is 1178, see the b9-toronto3 bullet) by hand · Git Bash `grep -c $'\r$'` cannot count CRs (it read 0 on a CRLF file) — count line endings with node · a LOCKED-text amendment needs a text refuter: the council's own D1 draft stated the lower-bound relation backwards and five of six elders first drafted the false floor ≥ full lemma — both caught only by the red team / refuter · a commit landing mid-measurement moves the agents' line citations (the trim chair re-pinned `copy.ts` after `b29a550d`) — re-pin at the chair.
- **Claude Code substitutes `$N` / `$ARGUMENTS` ANYWHERE in a SKILL.md body** (not only in `!` commands) — a literal `$0` or `$2,800` in a project skill silently becomes the user's argument text. Write literal dollar-digits as `\$0`; never put `$<digit>` in an awk/shell snippet inside a skill (use `$NF` or a script file). Found and fixed 2026-09-30 in caddie, back-nine-design, web-design-guidelines and /distill.
- **(2026-09-25 late)** a Workflow survived a power outage and completed on its own; the per-agent results were readable in `journal.jsonl` before the completion notice — but refuters that ran AFTER a revert judged the NEW tree, so a "refuted: moot on the current tree" verdict confirms the fix, it does not clear the finding
- **(2026-09-25 late)** 57.9 % context after one build + one 25-agent review: stop at the build boundary, never start the next Tier 0 in the same window.
- **(2026-09-25)** a Workflow `resumeFromRunId` after a session-limit death REPLAYS the finders but RE-RUNS every nested verifier — not just the dead ones (journal: 384 started / 299 results for a 206-agent run; two verdicts changed) — budget a resume as a full second pass of everything after the first nondeterministically-ordered call
- **(2026-09-13)** the classifier that gates auto-mode Bash can rate-limit mid-session; read-only tools keep working, so route the wait into Read/Grep work
- **(b9-8, 11-27) A helper agent's report arrives cut at about 3,000 to 4,000 characters** in its idle notice ("[result
  truncated — ask the agent for the rest via SendMessage]"): send it one SendMessage asking for the rest verbatim from
  the cut before acting on a list that may be missing its worst item. Nearly every one of milestone 4's 22 seats and
  refuters was cut this way.
- **(b9-8, 11-27) Low memory reaps background shells.** With about a dozen idle Claude sessions open the laptop sat at
  ~4 GB free of 31.5, and Claude Code stopped a background full `pnpm vitest run` ("the system is running low on
  memory"; it must not be restarted unasked). Run the changed test files and the sweeping guards in the foreground,
  let CI run the full suite, and tell probing helpers "one vitest probe at a time". A long inline `node -e` script in
  the Bash tool hung the same night: write the script to the scratchpad and run the file.

## Probes and measurement

- **(moved from TODO's distill list, b9-2, 11-23) Compute the closed form before searching for a plant**: `room`
  implies joint survival ≥ 0.90 with the survivor subset ≈ every path, so `survivor-short` was unreachable, and 612
  engine runs only confirmed one line of arithmetic (the user memory `feedback-compute-the-closed-form-before-simulating`;
  this line is its home in the repo).
- **(moved from TODO's distill list, b9-2, 11-23) Trust a two-point cost model (fixed + slope × roster) only after it
  predicts a held-out third point** (the solve-cost fit landed within 1–4%), then compute any closed form from it.
- **(moved from TODO's distill list, b9-2, 11-23) Playwright's default headless browser is the chromium headless SHELL,
  not Chrome**: a timing instrument meant to match his browser sets `channel: 'chrome'` (new headless on the installed
  Chrome, `e2e/held/solve-timing.config.ts`); a figure measured on the shell is another browser's.
- **(moved from TODO's distill list, b9-2, 11-23) A Vite library-mode (IIFE) harness bundle leaves
  `process.env.NODE_ENV` for its consumer** and throws "process is not defined" in the page unless `define` sets it to
  'production'. `page.addScriptTag({ content })` RESOLVES even when the script throws, so assert the global
  (`typeof window.X`) with the `pageerror` text (`e2e/held/solve-phase-profile.spec.ts`).
- **(moved from TODO's distill list, b9-3, 11-23) A UI cost timed in node is not the app's cost**: the spend solve read
  27 s / 13 s under node, 5.1 s / 2.4 s in laptop Chromium and 4.7 s / 2.8 s on his phone, the same figures to the
  dollar, and a council row nearly ruled on node's number (the engine runs about 2.5× slower in vitest/node than in
  Chrome). Time any UI claim in a browser.
- **(moved from TODO's distill list, b9-3, 11-23) An instrument that writes into the DOM its own MutationObserver watches
  re-fires itself forever** and freezes the main thread it is measuring (the first phone-profile cut). Poll instead, and
  prove any instrument on laptop Chromium before running it on the phone.
- **(moved from TODO's distill list, b9-3, 11-23) Give every measuring tool one shared household builder**: U11's four
  parallel lanes all imported one module (`u11drafts.mts`, then, in the session folder the Dell took): the W keys as the
  old tool selects them, "saved" minted through the shipped write, the stale pairs behind a fail-loud state check. No two
  tools could disagree about which household they ran, so the reviewers attacked the tools, not the households. Keep
  the builder in the repo (insight 156).
- **(moved from TODO's distill list, b9-3, 11-23) Probe only what no log already measures**: the re-point's 18-arm
  pre-flip ubuntu probe shrank to the four spine frames ubuntu had never logged, because the record card and the gates
  are top-aligned and the layout is width-invariant from about 1031 px up, so their existing `[U17 record return]` /
  `[route fit]` lines at the old window already were the new window's readings. The four-frame read matched Windows and
  the flip went green first time. Grep the logs for a reading before building a probe for it.
- **The per-seed identity tool** (`pnpm engine:identity`, `scripts/engine-sweep/`, rebuilt 2026-11-27 by b9-1 in place of the Dell's sweep and idcheck). (1) It records the tree's LIVE `src` at the moment each recorder process starts, so an edit to `src` while it runs can land in the tree side: b9-1's first full run recorded its tree after U11's engine edits had landed, which made it U11's proof rather than the tool's. Finish edits before the tree side starts, or re-record. (2) A plant's `savedAt` is pinned to its view day (`scenarioFromDraft` reads the wall clock); a new plant doctor that reads the clock elsewhere must be pinned the same way, or two days' records differ. (3) It runs one key at a time in one process (about 16 min a side for 82 keys, the date keys about a minute each); never beside the suite, a fit run or a mutant run (low memory reaps background shells). (4) `--keys` records a partial set and caches under its own name: never a commit's proof. (5) The frozen copy and the records live outside the repo (`--dir`, default `<os temp>/b9-engine-sweep`); `--clean` removes each junction before its folder.
- (migrated from TODO's standing block by b9-5, 11-20) **The Dell's session-folder tools are gone** (2026-11-19; the sweep and the idcheck are rebuilt in the repo as `pnpm engine:identity`, the bullet above): every walk panel's `CHAIR-NOTES.md`, the line probe, the sweep, the idcheck, the re-anchor classifier (replaced 2026-11-20 by `scripts/check-reanchor-moves.mjs`, in the repo, gate step 3), the tier-sweep and plan-reader folders. Each card in `docs/caddie/cold-read-log.md`, the register and the specs are what remain. A line probe is quick to rebuild from the composer over `DEV_SEEDS` (`file:///` imports, `pnpm exec tsx`); KD10's test is the count of record, and the witnesses' figures are pinned in `workingYearLeftOver.test.ts`. A walk's lost record can be rebuilt from a frozen `git archive` of the walked commit with `node_modules` junctioned in (b9-3 did it for walk 9's lows).

- **(b9-2, 11-16) A year's portfolio income tax is `grossWithdrawal − fundingNet` only in a clamped working year**, which
  prices no ACA premium (the tax rider build's KTD2): outside the working window that difference also carries the ACA
  net premium. And `simulate`'s `healthReadout` observes the FULL track only, so a budget run's floor pass has no
  Medicare readout to read; the rider proof rests its floor pass on the same clamp instead (said in its comment).
- **(b9-1, 11-15) A type-and-comment-only reformat of an engine file after its sweep needs no second sweep:** prove it instead by esbuild's emitted JS, `node_modules/.bin/esbuild <old copy> --format=esm --legal-comments=none` against the same for the new file, then `cmp` (U1b's `taxOverlay.ts`: byte-identical). Folding a new field onto existing lines also keeps every `taxOverlay.ts:N` citation still (0 re-anchor edits, against 128 for the multi-line form).
- **(b9-11, 10-27) A dev seed carries no `chosenGoal`**, so `buildSolveRequest` returns `spine-unready` for it — a node-side solve
  probe passes `{ ...seed, chosenGoal }` (`b9-seed-probe\solve.mts`'s `seed:goal`). Single-threaded, `healthss` takes
  ~15–18 min per goal.
- **(2026-10-03 late, b9-5)** the worker script exposes `{ ...engineApi, ...poolApi }` and `EngineHandle` is SPINE-only (`Promisified<EngineApi>`) — a new pool method goes on `poolApi`, never forwarded by the resettable handle; a new `EngineApi` method still breaks every hand-rolled fake by design
- **(2026-10-03 late, b9-5)** the roster measurement recipe: a tsx script OUTSIDE `src/` (doc-stats counts `*.test.ts` under it) over `DEV_SEEDS` + `buildSolveRequest`, run on the tree, then run on a frozen HEAD copy (insight 148: a `git archive` of HEAD's `src` + tsconfig + package.json with a `node_modules` junction, the archive run from the repo root per the Git section) — never `git stash` `src`, which moves every session's uncommitted work there. *Reconciled 2026-11-09: this said `git stash push -q -- src`, run, `git stash pop`, against the Git section's "never `stash` the held paths".*
- **From the b9-4 close (2026-10-03, the solve-time levers + the pool's generator foundation):** his LAPTOP STATE swings a solve's wall clock ~2× on the same code (`retired` 639 s on 10-01, 338.5 s on 10-03, both on AC / High performance, cause not recoverable) — compare timings only WITHIN one session, take a same-session baseline before every re-time, and never mix days in one table · node runs the engine ~2.5× slower than Chrome (the identity gate's 256-path `retired` solve ~11 s in vitest) — vitest runs one FILE's tests serially, so a heavy fixture goes in its own file to run in parallel (`solvePayloadIdentity.health.test.ts`) · `verify:doc-stats` counts any `*.test.ts` under `src/` — a scratch runner (the digest anchor, the call-sequence recorder) lives OUTSIDE the tree and is copied in only for its run, then deleted (the session's two were `zzAnchor.test.ts` = `bitDigest` of `solveWithMint` payload + `packSolveWire` on F1–F4 / F6 via `identityRequest`, and `zzCalls.test.ts` = `vi.mock('@engine/simulate')` recording `bitDigest([params, seed, options])` per call, shipped AND legacy — re-create them from that description; the scratchpad is per-session) · a HEAD-vs-tree differential by `git stash push -- src` leaves UNTRACKED files in place — sound only while HEAD's code imports none of them · `node -e "…"` in Git Bash interpolates backticks (it ate a docblock's identifier) — any edit carrying backticks goes through a script FILE or the Edit tool · an FNV lane with an EVEN multiplier flushes to a constant over a long walk (`bitDigest`'s first cut — a 64-bit digest with 32 live bits); both halves are now pinned to vary · one added import line in `intakeMap.ts` moves ~90 citations — `pnpm doc:reanchor HEAD` handles them, never by hand · a mutant plant must be grep-verified as LANDED and the file `cmp`-restored after (`scratchpad/plant.mjs` refused a missing anchor with exit 2 — re-create it: replace one exact string or exit 2).
- **(b9-3's U14, 11-23) The what-if run timing** (the workbench plan's U14 measurement; it picked the final tier, the
  plan's U14 "As built" note): production build of `0c2e8fe3`, installed Chrome 158 new headless, his Lenovo unpinned,
  one session, other sessions running beside it; `e2e/held/whatif-timing.spec.ts` on `solve-timing.config.ts`. A
  candidate run at the base offset, `runEngine` in a Blob worker, cold then five warm (median): `dip` (offset 5, full
  track) 2,000 paths 402 / 258 ms, 16,000 paths 2,165 / 2,056 ms, the store's final sweep 28.1 s, a run posted behind it
  1.2–1.9 s (2,000) and 2.5–3.6 s (16,000); `datemixed` (offset 7, floor) 290 / 161 ms, 1,408 / 1,275 ms, sweep 19.0 s,
  behind it 0.3–1.7 s and 1.5–2.3 s. Re-time only within one session (the laptop-state swing above), and re-run it when
  the engine's per-run cost moves: `dip`'s 16,000-path median sits 3% over the plan's 2 s line.
  **Re-timed 2026-11-27 (b9-5), after U12:** alternated in one quiet session (HEAD `ea7a85a`, the base `0b64fd4d` in a
  `git archive` copy with a `node_modules` junction, HEAD again). `dip` 16,000-path medians 2,119 / 2,074 / 2,046 ms,
  `datemixed` 1,329 / 1,328 / 1,338 ms: HEAD brackets the base, so the per-run cost did not move, and the final tier
  holds (the plan's U12 "After the slice" bullet). One HEAD run alone read 3% slower than 11-23 on every figure, the
  sweeps included: a single re-time cannot tell a code cost from the laptop's state, so alternate HEAD and a base.
  In the copy, the spec's `git rev-parse` throws outside a repository: pin its `head` field before the run.
- **(b9-9/b9-10, 11-13) A probe runs from the project dir** (`pnpm exec tsx --tsconfig ./tsconfig.json <probe>.mts`, absolute `file:///`
  imports of the modules) so the `@intake` / `@ui` aliases resolve; print a composer on every witness BEFORE typing a
  by-hand pin (U3's probe, `u3-probe.mts`, is the one to extend).
- **(b9-9, 11-22) A record folder's prints extract is not every print:** `b9-7-u4/u4-*-prints.txt` left out the
  `[U17 record return] … 1440x731` lines U4's tree printed, and round 1 of the frames-outside review wrote "U4 printed
  no REAL reading of an asserting arm" from it. Grep the CI run's own log (`gh run view <id> --log`) before claiming
  what a run did or did not print; save a new extract with every tag the spec prints.

## Engine and tax math

- **(b9-8, 11-28) Any change to `taxConstants`' VALUES reds `vintageStamps.test.ts`'s content digest** ("the table CONTENT is bound to the stamp pair"), a new entry included (`homeSaleExclusion`, gap 5's U8). Read the red as the question it asks: a priced figure that moved bumps `TAX_YEAR` or the `legalBasis` sentence; a figure nothing saved can reach yet re-pins the digest with its reason written beside the earlier re-pins. The state table has its own clock: a new state profile key moves `stateTaxVintageStamp` (gap 5's KTD7).
- **(b9-8, 11-27) An inherited IRA's required beginning date is April 1 of the year AFTER the applicable age** (`requiredBeginningYear`, `src/engine/rmd.ts`): a 1952 owner (73) has April 1, 2026, so a 2025 death is before it (no yearly minimum, no death-year amount). A fixture's inherited facts are checked by `inheritedFactsProblems`, never by hand; the fact registry's test guards FULL's.
- **(b9-1, 11-15) `checkDrawn`'s `fundingNet` leaves out what an HSA pays:** the HSA's qualified spend (an owner-65+ Medicare premium, its surcharge included) is paid outside the gross-up, so two answers whose Medicare differs can show equal `fundingNet` past their shortfalls. What savings funds is `grossWithdrawal + hsaSpend` (the probe field since U1b): an identity on `fundingNet` alone holds on HSA-free households and fails on one with an HSA (`TM_NEAR_IRMAA_LINE_HSA`).
- **(b9-4, 11-14) The typed-below survivor part's bound (once "the coda") rests on a death crediting NOTHING** (council `wf_dfb7949b-4a7`'s "U12
  landmine"). Build 2's KTD5 credits 0 in any year not everyone is alive (`workingYearCredit`'s `allAlive`,
  `src/engine/moneyGrain.ts`), so in a survivor working year the two answers differ by their two survivor charges alone,
  and the coda's X (`TypedBelowSurvivor.most`, `src/intake/workingYearLeftOver.ts`) bounds exactly that. The day anything
  credits a survivor year, the credit-0 tripwire and the SURVIVOR (KTD5) arms in
  `src/engine/__tests__/workingYearCredit.test.ts` red: the coda's words and X change with the credit, never the test
  alone. Build 2's D7 item "the left over after a death" (`docs/plans/features/working-year-surplus-build-spec.md`,
  Scope Boundaries) is the work that would do it.
- **(b9-8) The HSA leaves-out row's TRAP 3 (Tier 0 of `TODO.md`'s 2026-08 tiered list) calls its three cited branches "zeroing" ones, but
  the third (`taxOverlay.ts`'s knife-edge buckets) is not a depletion branch** — since C2 it holds the year's deposits and
  since U4 the left-over credit. Whoever builds that row re-reads it before writing the HSA sentence.
- **(2026-09-27, b9-11)** the witness digests see the exported PRICERS only — a change to how they compose (the gross-up, the IRMAA lag, RMDs, the draft → params map beyond `escalateQuote`) moves no digest: append the row by the discipline, not by the red
- **(2026-09-26, b9-8)** the IRMAA tier readers REQUIRE the compared schedule at the RIGHT MAGI year — the four clocks are in architecture §7.2; a new reader picks its clock there, never `irmaa.value` (the brand makes that a compile error)
- **(2026-09-25 late)** ANY change to a scored overlay's pricing bumps `SOLVER_CODE_VERSION` (the rule is in `solverCodeVersion.ts`; the §86 fix missed it)

## Persistence and schema

- **(b9-5, 11-28) The draft's `savedAt` is the stamp it was loaded with; a save never re-stamps the draft.**
  `scenarioFromDraft` stamps a fresh `savedAt` per encode and the disk gets it, so after an in-session re-save the draft
  still holds the previous save's day. "The year the balances on screen were entered" is `balancesYearFor` in
  `src/ui/resultSave.ts` (the last commit's year while `enteredAccounts` are unchanged since, today's once they changed),
  computed once in `IntakeApp.tsx` and handed as `balancesYear` to the Shell AND the Stepper, then to Profile, Blueprint
  and every drawer (`DrawerBodyProps.balancesYear`). The stepper renders the same Income composer and drawer host as the
  shell, so a prop handed to one must reach both (b9-7's review, round 1); the draft's own reading is right only before
  any save.
- **(b9-2, 11-28) Since gap 5's U1 (`4b59f034`) the codec refuses a one-time item's `heirIndex` / `leftTo` on a one-person plan**, as it refuses an inherited IRA's `leftTo` there: a writer that carries them onto a plan with one person fails the save's codec round trip. Write them only while `people.length > 1` (gap 3's spread in `src/intake/inheritedIra.ts`).
- **(2026-09-27, b9-11)** a fixture or dev plant saved at the WALL CLOCK's today sits on the ledger's ambiguous ship day whenever a row lands — it reds CI on exactly that day and greens the next; stamp "saved by this build" at `FIRST_UNAMBIGUOUS_SAVE_DAY` (every existing fixture and plant already does); a date-derived pin (`?vault=stale`'s note count) is DERIVED from the ledger in both its unit arm and its fit arm, never hand-typed

## Driving the app

- **(b9-16, 11-27) The Playwright MCP browser saves only under the project or its `.playwright-mcp/` folder** (it refuses
  the session scratchpad), and a drawer left dirty arms the leave guard: the next `goto` raises a `beforeunload` dialog
  that blocks every call until `browser_handle_dialog` accepts it. Its files land in the gitignored `.playwright-mcp/`:
  delete your own by exact name before the close. A `?seed=` reload also drops any edit made through a drawer, so an
  edit to measure is made after the last navigation.
- **(b9-2, 11-23) Playwright `fill()` on a `CurrencyField` that is not focused lands after its `onFocus` swaps in the raw
  figure**: "7000" plus the shown "7,600" reads "70007,600", parses to nothing and clears the value. Click the field first.
- **(b9-2) The Playwright MCP writes only under the project** (its allowed roots: the project and `.playwright-mcp\`, which is
  gitignored); save shots there, then copy them to a durable folder and delete this session's files. A reload over unsaved edits
  opens a `beforeunload` dialog that blocks every tool until `browser_handle_dialog` accepts it.

- **(b9-10, 10-31) tsx (esbuild keepNames) wraps a NAMED function declared inside a Playwright page callback in `__name(…)`**, which the page does
  not have: "ReferenceError: __name is not defined" killed the first h2 run. Keep `evaluate` callbacks free of named inner
  functions (inline arrows passed to `map` / `find` are fine).
- **From the b9-3 close (2026-10-01/03, the production-build timing instrument):** the production build DCEs `?seed=` / `?vault=` — a dist drive PLANTS the household with the dev `plantDevVault` from a harness injected on the control origin :4181 (CSP blocks injected script on :4180), then unlocks it as a returning user (`e2e/held/solveTimingPlant.ts`) · vite's library mode (the IIFE harness bundles) leaves `process.env.NODE_ENV` for its consumer, so the bundle threw `process is not defined` at load — `define` it "production" — and `page.addScriptTag({ content })` RESOLVES even when the script throws: assert the global (`typeof window.X`) with the `pageerror` text in the message · Playwright's default headless is the chromium HEADLESS SHELL, not Chrome; `channel: 'chrome'` drives the installed Chrome in new headless (Context7-checked) — the instrument's browser · a solve timing needs an idle machine: the batch ran ~58 min serially with nothing beside it (no vitest, no doc-stats, no second solve) · the FIRST full suite after the machine sat idle two days red `copyFence.test.ts`'s cold-ESLint arm at its 30 s timeout (import 226 s vs 142 s, environment 248 s vs 105 s on the warm rerun, which was green 3787 / 190) — read the run's phase times before diagnosing, and never bump that timeout on one cold run · tsx runs a `.ts` outside the project as CJS (top-level await fails — use `.mts`) and cannot resolve `vite` from the scratchpad — import it by its `file:///…/node_modules/vite/dist/node/index.js` URL · a held instrument with its OWN config needs `e2e/held/shots.config.ts`'s `testIgnore` beside it, or the partition gate reds the double claim (mutation-checked: it does) · the dev-era "~90 s nc HOLD" figure was stale in four places — FIXED `3c9411f9` (the walk re-budgeted on the pool).
- **A live solve is tens of seconds to minutes — budget for it.** On the PRODUCTION build at the laptop with the worker pool
  (2026-10-03, `e2e/held/solve-timing.spec.ts`, P = 12, `SOLVER_CODE_VERSION` 9's rosters): `retired` **36.5 s**, `nc`
  **39.8 s**, `healthnc` **150.9 s** — a healthcare household pays a second full search (the named-driver probe), and the
  ~2× slow laptop state doubles every figure (`healthnc` ~5 min). `buckets` has not been re-timed on the pool. A device
  with ≤ 3 logical cores gets no pool (`poolSizeFor` ⇒ 0) and runs the single worker (`healthnc` ~9 min at v8 — `225d8da4`'s
  554 s single-worker baseline — unmeasured at v9). The single-thread v8 figures (2026-10-01: `buckets` 8.9 min, `retired`
  10.7, `nc` 12.1, `healthnc` 26.0) predate the share-the-pass + probe-skip levers (`10bcba05` / `55cd7382`), the pool and
  v9, and do not carry; quote the figure for the household AND the pool size you are actually driving.
  Prod DCEs the dev seeds — a dist drive that needs a committed recommendation PLANTS the household (`e2e/held/solveTimingPlant.ts`). Before calling one frozen, measure CPU on the Playwright renderer
  (`Get-CimInstance Win32_Process | ? CommandLine -match 'ms-playwright'`, then sample `.CPU` twice) —
  a pinned core means it is computing, and Briggsy's own Chrome PIDs will read 0% and mislead you.
- **`?vault=` / unlock / save need a secure context** (`crypto.subtle`) — localhost or https, never a bare
  LAN IP over http — serve the phone with `pnpm dev:phone`.
- **(2026-10-03 late, b9-5)** `solve-timing.spec.ts`'s `lockupText` stops before the plan card — the crowned AMOUNT is not in the capture; read the hero delta, or extend the capture before claiming what was crowned
- **(2026-09-27, b9-sotd)** the phone rig: the laptop was 192.168.1.151, Windows labels the home Wi-Fi *Public*, and node already holds inbound Allow on Public + Private — `pnpm dev:phone` reaches his phone with no firewall change
- **(2026-09-23 evening)** the Roth door's label depends on a committed conversion (`leverRothDoorCta` / `leverRothDoorEditCta`) — a selector on one label silently skipped the other seed; match both and assert the count.
- **(2026-09-13 late)** `retired` has NO health door (post-65-only households render the verdict-level priced note), so its byte-identity is a composer fact, not a walkable surface — the Caddie walks `healthnc` + `healthgap`. [2026-10-16 doc audit: `retired` still has no door (its seed gate says so), but the rest is superseded. Its card is no longer byte-identical: `690bcae0` gave the one-figure arm the singular drug-and-supplement carve-out ("`retired`'s gate gains the line"), and `e17c40e4` made the two-person form dated and "start at" under the both-on-it eyebrow, with Briggsy's trend clause. And the arm IS walkable: `healthss` (62/62) is "the one door-bearing seed on the one-figure arm" (`healthSheetSeedGate.test.ts`; its row in `TODO.md`'s *Scenario seeds*, under its *Driving the app*), so a Medicare-card change walks all three — `LOOK_SEEDS=healthnc,healthgap,healthss` on the scrolled-card recipe in the b9-toronto3 bullet under *Claude Code, workflows and sessions*.]
- **(2026-09-08)** `?seed=datesolo` NEVER stamps `data-answer-tier="final"` (the
refusal witness), so `gotoSeedFinal` times out on it — anchor on `main.result`

## CI

- **(b9-8, 11-28) Two commits pushed together run CI once, on the head:** `gh run list --commit <the first one's full sha>` prints nothing (U7's `878bb291` under the floor's `4a852e79`). Read the head's runs for both, and name it in the close's check line so the next session doesn't read an empty list as a missing run.
- **(b9-12, 11-27) A failed job's log through a pipe: `gh` refuses it unless told to allow escape sequences.**
  `gh run view <run> --log-failed` printed nothing while the run's other jobs were still going, and
  `gh api repos/{owner}/{repo}/actions/jobs/<job id>/logs > file` wrote one line, "the response contains terminal escape
  sequences; pass --allow-escape-sequences to output it anyway". `gh api --allow-escape-sequences …/jobs/<id>/logs` writes
  the whole log; strip the colour codes (`sed 's/\x1b\[[0-9;]*m//g'`) before grepping for `FAIL` or `AssertionError`.
  Once the whole run has finished, `gh run view <run> --log-failed 2>&1 | grep -a FAIL` does work through a pipe (b9-13,
  run 46052695767).

- **(b9-11, 11-25) `jq` is not installed in this Git Bash: filter with `gh`'s own `--jq`.** b9-11's CI wait piped
  `gh run list` into `jq`; every probe printed "jq: command not found", the loop's test read an empty count, and it spun
  silently for its whole hour while RC11's fit job had already gone red. A deadline alone is not fail-loud: a wait loop
  must also stop on its first probe that errors, and its filter must use a tool the shell has
  (`gh run list --commit <full sha> --json status --jq '…'`).
- **(b9-9, 11-25) Commits pushed together get CI on the push's head only.** RC9's code commit `7072fecd` and its docs
  follow-up `11349a9d` went up in one push: GitHub ran both workflows on `11349a9d` alone (green, RC9's code included),
  and a wait keyed on `7072fecd` found no runs and timed out. Read a pushed batch's CI by its last commit's full sha, or push
  a unit alone when its own sha must carry the run.
- **(b9-3, 11-20) Test stdout reaches the `verify-fit` job's log (the `verify` job's until the 2026-11-22 split) through a reporter nobody configured.**
  `playwright.fit.config.ts` lists `[['github'], ['html']]` on CI. The github reporter prints no test output
  (`printsToStdio()` is false), so Playwright prepends a `DotReporter` on CI, and that is what writes each arm's
  `console.log` lines (`[route fit]`, `[U17 record return]`, `[20px-root fit]`) into the log. Each line is glued after the
  progress dots with no test name: parse by its tag, and keep only an arm's final attempt (a retried arm prints twice).
  Never add `list` to that config: it changes the line format any log reader parses. (`playwright.fit-rv.config.ts`
  already lists `list`; leave it.)

- **(b9-1, 11-22; replaces b9-8's "a measuring commit measures only if every CI step before `verify:fit` is green")
  The fit gate runs in its own CI job, `verify-fit`, beside `verify` (the quick checks), `verify-unit` and
  `verify-rv-chart-text`.** Until the split a red lint, unit test, doc number or stale ACA record stopped the one chain
  before `verify:fit` and the run measured nothing, which is why sessions ran CI's whole list locally before every push.
  Now a cheap red leaves the fit readings intact: read them from the `verify-fit` job's log by tag, final attempt only,
  whatever the other jobs say. A red arm inside `verify-fit` stops nothing either: Playwright runs every arm, then fails
  the step, so the other arms' prints survive it. The local cadence is the project
  CLAUDE.md's *Test cadence* (Briggsy, 2026-11-22).

- **(b9-3, 11-04) Two commits pushed at once run CI only on the head.** A prerequisite fix committed first keeps each tree
  honest, but only the head's run is read; say so in the report.

- (b9-9, 10-31) `gh run list --commit` needs the FULL 40-character sha (the b9-toronto2 bullet below): it bit again, and b9-9's CI wait spun
  about six hours after green. Pass `git rev-parse <sha>`, and give every wait loop a deadline that fails loud.

- **(b9-6, 10-21) CI:** `gh run watch <id> --exit-status` in the background notifies on completion, so never poll.
- **From the b9-toronto2 close (2026-10-15, the same-age Medicare card):** `gh run list --commit <sha>` matches only the FULL 40-character SHA — a short one returns NOTHING (re-proven at the close: `690bcae0` → empty, the full SHA → run 38806260414), so a poller fed a short SHA reported "no run registered" for ten minutes while the run was live; resolve with `git rev-parse HEAD` first, then poll that run by explicit id · `pnpm doc:reanchor` PRESERVES pre-existing rot — a citation already on the wrong content moves with its line and stays wrong, and arm 4 passes it green; the catch is a PROVENANCE check (open the line each citation named in the commit that wrote it, then find that content in today's tree) — it found all six register citations in `docs/plans/features/pay-less-tax-all-in-build-spec.md` already wrong; the same session met three more blind classes (a `:N+` suffix, citations inside a code block, `~N` tilde forms — the register's Tier 4 entry's ⚑ 2026-10-15 bullet), and the second run again rewrote the frozen `e2e/held/fit-24px-measurements.md` (restore it) · a scratch measurement test's `console.log` never reached the captured run output (cause NOT traced — `vite.config.ts`'s `test` block sets no `silent`) — have it write its figures to a file in system temp, and delete it from the tree after its run (the doc-stats count landmine) · `git show HEAD:<path>` run from the project dir resolves the path from the MONOREPO root — write `HEAD:./<path>` · Git Bash has no `rev` — use `grep -o`.
- **CI verdicts by explicit id only:** poll `gh run view <id> --json status,conclusion` to `completed`,
  then read `conclusion`. A watch exit code lies in **both** directions.
- **(2026-09-28, b9-1)** an enumerator change moves every real-solve witness's wall time ∝ roster: after one, tabulate per-test CI times across runs (strip ANSI with node; an older run's log labels the step `UNKNOWN STEP`, not `Run pnpm test`) and re-budget any 60 s solve witness past ~50 % — `health` read 21 → 43 → 60 s (v7 / v8 / a slow runner)
- **(2026-09-28, b9-1)** the CI runner varied ~1.4× across the board within an hour (`datesplit` 141 → 203 s) — a docs-only commit CAN red; read the table before calling it a flake
- **(2026-09-27, b9-sotd)** `gh run list --commit <short sha>` returns nothing (it wants the full sha) — a watcher on an empty id "completes" having watched nothing; select by `headSha | startswith`

## UI and product

- **(b9-5, 11-24) Two Highcharts charts that must compare need one scale, and a live chart drops a new scale on update:**
  Probability's two balance bars each scaled to their own top, so ~$1.1mm and ~$675k drew the same height (calm-but-wrong);
  then passing one shared lattice still failed, because Highcharts ignored the new `yAxis` max and ticks applied as an update.
  `BalanceBar` keys its chart on the lattice so a new scale builds a fresh chart; `balanceBarOptions.test.ts` and the
  drawn-height ratio check in `e2e/rc-screens.spec.ts` pin it. Any later side-by-side charts (RC6 onward) take the same seam.
  ⚑ The CAUSE is unconfirmed (b9-8's distill, insight 169): the only evidence was a look instrument's frame, and RC7's
  later landmine (the pinned page clock freezes Highcharts' redraw at its first frame, *The fit gate and e2e*) draws the
  same picture. The rebuild-on-new-scale seam holds either way; settle the cause in a live browser (no pinned clock, an
  update with a new max) before writing it into another chart's design.
- **(b9-4, 11-24) Two `main.result` on one page make `SETTLED_RESULT` a strict-mode error in every gate.** The shell owns
  `main.result` (`Shell.tsx`). A new screen never renders its own `main.result` (`e2e/rc-screens.spec.ts` counts one on every page).
- **(b9-4, 11-24) Highcharts' accessibility module must be imported AFTER `@highcharts/react`** (or after `highcharts`
  itself). Imported first, it reads the namespace's `Chart`, `Series` and `Legend` before the master fills them, and the
  built page dies with "Cannot read properties of undefined (reading 'prototype')". And under `pnpm dev`, Vite's
  dependency pre-bundler split the module and the master into chunks that import each other ("Class extends value
  undefined") while `pnpm build` ran clean: `vite.config.ts` excludes both packages from `optimizeDeps`. A green build is
  not a green dev server for Highcharts; load a chart page under `pnpm dev` before trusting it (RC1, the deleted `src/kit-probe.tsx`).
  **And the build's chunking can break the order too (RC19, 11-26):** deleting the kit probe (a second entry) let
  Rolldown split the master and its modules (with @highcharts/react's lazy series modules) into chunks that import each
  other, and the BUILT home's fan died with "Class extends value undefined" while every unit test and the dev server
  stayed green; pinning Highcharts into one `codeSplitting` group only moved the fault ("reading 'prototype'", and with
  a broad group the entry imported the whole Highcharts chunk through Vite's preload helper). `vite.config.ts` turns on
  `output.strictExecutionOrder`; after any change to the build's entries or chunking, load a chart page on the BUILT app
  (`verify:csp`'s shell arm draws the home's fan first).
  And the editor's language server (the global TypeScript 6) flagged `installChartDefaults(Highcharts, …)` in
  `src/kit-probe.tsx` (deleted at RC19; `src/viz/charts/Chart.tsx` makes the same call) as a type mismatch between two copies of Highcharts' types (`highcharts.src` against `highcharts`);
  the project's pinned TypeScript 5.9 does not, and `pnpm typecheck` is the gate. Expect it to turn real on the day the
  project moves to TypeScript 6.
- **(b9-4, 11-24; re-read at RC21) Tailwind generates utilities only from the folders `theme.css` names.** It imports
  the utilities with `source(none)` and lists each kit and screen folder with `@source`, so a new folder's classes ship
  nothing until its `@source` line lands with its first file (a page then renders unstyled with no error). A class word
  in any file inside a listed folder ships, comments included. Keep automatic detection off: it would scan docs and
  tests too.
- **(b9-1, 11-23) `overflow-wrap: anywhere` in a table cell lowers the cell's narrowest width to one letter**, so an
  auto-layout table squeezed toward its narrowest breaks headers mid-word ("Christop / her", "Spendin / g"); every
  width check passes it. Cash Flows' headers (the kit's `DataTable`) break between words only, and no header carries
  the people's names (`Age shows A / B.` rides the lines under the table). Look at a squeezed table, never only its widths.
- **(b9-1, 11-23) A `<caption>` is as wide as its table:** where the table scrolls inside a frame (the phone), the
  caption scrolls with it and is cut at the frame's edge. The year-by-year table names itself with a paragraph above
  its frame and `aria-labelledby`.
- **(moved from TODO's distill list, b9-3, 11-23) A `<br>` inside a paragraph needs a space before it**: `textContent`
  joins "…you.<br>This answer now:" with no space, so a React key, a screen reader and every `toContainText` read a
  different string from the one the composer joined. Walk 5's `NotePartsBody` (then; the notes now draw
  `NotePartsBlock`'s list) drew `' '` then `<br>`, the space never painted. The kit's `Caveat` draws `' '` before each `<br />` for the same reason.
- **(b9-9, 11-23) A module shared by the entry chunk and a lazy chunk must not import a stylesheet the entry already
  loads**: Rolldown moves the sheet into a new shared chunk, which can move its place in the cascade (the old
  `SaveSlot.tsx`'s import of `result.css` did, caught by reading `dist/assets`). Leave each import with its first owner
  (today `theme.css` from `src/main.tsx`, `chartTheme.css` from the lazy chart chunk) and check `dist/assets/*.css` after
  adding a lazy chunk.
- **(b9-5, 11-19; moved from TODO by b9-6) Never compare drafts to find "different inputs".** Every blur commits and mints a new
  draft even when nothing changed, the first run's seed mint swaps the draft object, and `draftIdentityKey` carries fields the
  engine never reads. Key the BUILT engine input (`memoryModel.ts`'s `runKey`, W9-R7's KTD2). And an e2e wait reads
  `SETTLED_RESULT` (`e2e/reviewSurface.ts`), never a bare `data-answer-tier="final"`, which passes inside the re-figuring window.
- **(b9-6, 11-15; b9-3, 11-16) `NotePartsBlock` draws two lists, never both**: W's stale line as the segments' `<dl>` with the door inside it, and the typed-below line's runs as an `<ol role="list">` (`role` because WebKit drops list semantics under `list-style: none`) with the survivor part as the `<p class="note-parts__closing">` after it, before the doorless button (the walk-8 form council's KD7, KD8). jsdom loads no stylesheet: the runs' spacing (`theme.css`'s kit layer since RC21; `noteParts.css` before) is seen only in a real browser.
- **(b9-4, 11-05) Never call `buildDateInput` from inside the money picture's path.** On a "saved" draft `buildDateInput` now reads
  `workingYearLedgerForRun`; the picture composes from `buildDateInputBeforeLeftOver`. Any new reader inside
  `composeWorkingYearLedger` that calls `buildDateInput` recurses forever on a saved draft.

- **(b9-9, 10-21) Nobody uses the product yet, and it is built for Briggsy alone.** His words: "There is no one who has used this
  product yet, not even me" and "This tool is for me, if one of my friends uses it, it'll be a crazy outside chance."
  The reviewers, the council and the b9-8 plan all assumed saved plans and friend users; a whole unit (U12) existed for
  plans that cannot exist. Before designing any migration, legacy-vault or "returning household" path, read the memory
  `project-back-nine-no-users-yet`. A saved shape is not a one-way door until HIS first real save.
- **(2026-09-13)** `--on-brand` and `--paper` are one hex, so a primary whose fill eases from transparent blanks its label for the fade — never transition the fill of a state flip
- **(2026-09-12)** the band the app DRAWS is the engine fan CUT at the thin-cohort year (`answerView.ts` → `bandGeometry.truncateFanAtThinCohort`, 24–36 y) — a probe that takes the max over the RAW fan (54–61 y) overstates every growing household's ceiling (health: 15M predicted, 6M rendered; the brief, the review and the `c77bcf24` commit message all carry the raw table — the register is corrected); a seed-level prediction must run the SURFACE's pipeline (`lattice-probe-rendered.mts` in this session's scratchpad: buildSpineParams → runEngine with the app's options → the cut → resolveBandData), and a frame is the only proof
- **(2026-09-08)** a `--` inside an SVG XML comment breaks the
rasterizer SILENTLY
- **(b9-6, 2026-11-24, RC4b's CI red) Re-hosting a component changes its width, and a width-tuned chart breaks there.**
  The recommendation chart's label column is tuned on a 358 px phone box (`RecommendationViz.tsx`); inside the interim
  Tax Strategies tab the shell's interim column and the old answer frame each added a gutter, the box became 326 px, and
  the 24-character bar label (104.8 px in a 104.8 px column) broke to three lines over the delta figure on CI's ubuntu
  metrics only (run 45477118575; Windows fit it on two). Measure a re-hosted component's box at PHONE on the real
  surface, and run its spec's PHONE arm, not only REAL.
- **(b9-6, 2026-11-26) A Highcharts plot band at a year with no point sits past the axis** (the axis ends at the last
  point plus the 1% default `maxPadding`): it draws as a sliver and an `inside` label wraps one word per line. Set
  `xAxis.max` to the band's year, and give the label a NUMBER `style.width` (Highcharts appends `px` itself; a string
  "300px" becomes "300pxpx"). RC17's money-ran-out band (`incomeSourcesOptions.ts`, fixed `5bae2f61`).
- **(b9-9, 2026-11-27) A tray control's fixed width is its column's floor.** Since `09f3954d` the kit Tray's control cell
  is `min-width: auto` from `wide`, so a fixed `w-*` on a control sets the control column's minimum and squeezes the
  compared column (U17's pace picker at a fixed `w-52` left it 98 px at 1088). Size a tray control `w-full max-w-*` so its
  floor stays the kit's own (`Select`'s `min-w-40`), and measure a new row at 1088, where the two column groups first sit
  side by side (the seam arm, `e2e/rc-screens.spec.ts`), not only at 1440 and the phone.

## Research and re-verification

- **(b9-7, 10-21) ssa.gov answers curl with 403.** Read the IRS Topic pages instead (751 payroll, 560 Additional Medicare: primary,
  and they curl fine), or LII for the statute. A grounded search alone is secondary.
- **(Act 6, 11-24) The RightCapital research screenshots and lane reports are machine-local, never in the repo** (it is
  public): `docs/research/rightcapital-ui-reference.md` names the folder; read them by path, and never copy a screenshot
  or a report into the project.
- **From the b9-3 close (2026-10-20, the ACA re-verify + (1b)'s measurement):** every ACA instrument change this pass met lives in the record's `forwardClock` ⚑ 2026-10-20 head — uscode's `versions.json` lists only the newest id and an unknown id answers HTTP 500 with a 75 B body; the GovTrack JSON API is retired (enumerate new measures from govinfo BILLSTATUS bulk listings); the govinfo PLAW not-published shell is now 44,172 B (detect it by content); archives.gov needs a cache-busting query; the Senate vote menu moved to `roll_call_lists/` — read that head before the next pass, never this line · a presented bill past its tenth day can already be law with no list showing it (S. 195 was signed 10-09 and read "unsigned" on 10-12) — read the bill's own BILLSTATUS actions · a GPO HTML bill print can render a table as "TABLE TOOL ERROR" (S. 5496) — read the XML · research agents that browse drive Playwright from the repo and leave `.playwright-mcp/` in it — sweep it after any such agent · a probe script outside the project runs under `pnpm exec tsx` from the project dir (its relative imports reach `src/`, whose `@engine/*` aliases then resolve), but only as `.mts` — a `.ts` with top-level await dies "not supported with the cjs output format" · a commit message's summed counts come from the run outputs (582 + 98 + 29 = 709 across 21 files), never a recalled figure — the ACA commit first said 680 and was corrected before the push.

## Other

- **(b9-6) `docs/plans/features/README.md`'s index is stale.** It has no rows for the pay-check, schema-v4 or build-2 specs,
  and its prose still calls the working-year tax floor "the next build". Fix it in build 2's U12 docs pass: add the three
  rows, and rewrite the "All of them are shipped except…" sentence from the roadmap.
- **A filed prescription in this repo is ~25-40% executable as written** — thrice-measured (5-of-11,
  2-of-5, 1-of-5 clean). Drifted anchors, mechanisms the code does not have, edits that would write NEW
  false claims. **Open every cited line before executing; budget as if it were unwritten.** A prescription
  never inherits the trust of the correct diagnosis above it.
- **(moved from TODO's distill list, b9-3, 11-23) An absence claim needs a whole-tree search, never one directory
  listing**: the 2026-09-06 truth pass marked `BudgetBuilder.tsx`, `BudgetLineItem.tsx`, `SequencingControl.tsx` and
  `HealthcareSheet.tsx` "AS BUILT: never created" after an `ls src/ui`, but all four lived in `src/intake/` (Act 6 has since deleted them). Run
  `git ls-files | grep <Name>` before writing "never built".
- **(2026-09-12)** a "recorded limit" arm that enumerates a set by RUNNING the code is a DND 012 brush — acceptable only when a lens independently
re-derives the same set and the comment says so (the pbt's `[1,2] ∪ [9,12] ∪ [1001,1250]` arm)
- **(2026-09-12)** a `;` where `&&` belonged let the close chain
push past a red doc-stats (`118e9822`, fixed by `40b14952`) — gate every chain with `&&`
