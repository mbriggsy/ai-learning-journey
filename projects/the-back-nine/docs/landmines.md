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
  (a node child read its own affinity as 4095 = 0xFFF).
- **(b9-1, 11-08) Never run a heavy job on the E-cores beside a pinned P-core run.** The identity sweep on `/affinity FF000` slowed
  the pinned suite from 534 s to 863 s (the cores share one power budget). Serialize: the sweep, then `verify:fit`, then the suite.
- **(b9-1, 11-08) The laptop ran about 2.5x slower than on 11-05 under sustained load**, with no other process busy: the whole suite
  pinned took 802 s (b9-6: 290 s), seven heavy engine tests timed out, and `verify:fit` timed out 12 final-tier waits. Every one
  passed alone (`playwright test --last-failed`, then `--workers=1`; each vitest file on its own). Under load the P-cores read
  about 100-120 % of base clock against 179 % idle. Before calling a red real, rerun the timed-out tests alone; an assertion is
  a finding, a timeout on this machine is not yet one.
- **(b9-1, 11-08) Another session's work shares the CPU:** the Feud session's `te_replay.py` searches each held a core through
  b9-1's first suite, and an orphaned `python.exe -` from a dead 10-30 session had held one for 9 days (killed with his OK, by
  `taskkill /PID`). Check `Get-CimInstance Win32_Process` for busy python before a heavy local gate.
- **(b9-6) Run every heavy local check pinned to the P-cores, launched from PowerShell:** `cmd /c "start `"`" /b /wait /affinity FFF
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
- **(2026-09-26, b9-8)** several test files are CRLF (`ConfidenceStatement.test.tsx`, `magiLandscape.test.ts`, `magiLandscape.pbt.test.ts`, `partBTrend.test.ts`, `healthSheetChrome.test.ts`) — edit through an EOL-preserving script or the Edit tool, and check `git diff --stat` deltas
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

## The unit test suite

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
  constant and type only the derived dollars.
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

## The fit gate and e2e

- **(b9-4, 11-13) A new cause that takes another cause's slot reds THAT cause's arms, which a run of the new arm alone never
  reaches.** R1 (`3000a04c`) let the typed-below line take the Result's standing slot wherever a fresh typed W sits below the
  quote; the coordinate-tap arm (`?seed=date`, $72,000 typed under $84,000 of spending) still expected the moved line, and CI's
  whole `verify:fit` redded it at both sizes (run 43375528470) while the eight unlock arms had run green locally. Before
  committing a change to what a slot shows, grep `e2e/` for every arm that reads that slot (`.cs-paycheck-note`,
  `.reentry-notes`), and run each one whose draft reaches the new predicate, or the whole `verify:fit`.
- **(b9-3, 11-09) The whole `e2e/` folder does not typecheck under a scratch tsconfig that adds it:** eight pre-existing
  `Node.remove` errors in `chart-text.spec.ts` and `held/assumptions-row-look.spec.ts` (the DOM lib); filter them before
  reading an edited spec's result (Playwright compiles with esbuild and never sees them). The scratch tsconfig must name its
  `types` by absolute path (`<project>/node_modules/@types/node`, `<project>/node_modules/vite/client`) when it lives in the
  scratchpad (b9-4).
- **(b9-5, 11-05) Never run an e2e harness while anyone edits `src`.** An HMR reload mid-wait reds arms falsely (the fit and caddie
  lanes saw final-tier timeouts and a vanished `[data-caddie-scroller]`); run the whole gates on a quiet tree, or a no-HMR server
  (the fit verifier wrapped `vite.config.ts` with its own `cacheDir` in the scratchpad, so the shared `node_modules/.vite` was never
  rewritten). Every Playwright run under a config cleans the shared `test-results/`.

- **(b9-2, 11-08) The fit gate's result helpers assumed a DATED reading.** `assertResolvedDate`, `assertOneVisibleDisclaimer`'s tier read
  and `DOORS_WALK_FLOOR` all wait on a band, a ladder and `[data-twopane]`, which the no-date reading never draws; the risen
  family crowns no date, so (ae) added `assertNoDateReading`, `assertOneVisibleDisclaimerNoDate` and
  `NO_DATE_DOORS_WALK_FLOOR` (10; measured 14 at REAL, 12 on the phone). A new no-date arm uses those, never the dated ones.
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
  `stalenessExposure.test.ts` and `reentry.test.tsx`, the methodology pair in `assumptionPanel.test.tsx`, `datemixed`'s W-absent
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
- **`verify:fit` does NOT measure the recommendation surface** (`e2e/vertical-fit.spec.ts:762-772`
  excludes the committed + held renders — the exclusion dates from 2026-07-22, before the worker pool, when a dev-server solve ran 80–200 s+ against the then-120 s per-test budget (now 180 s, `playwright.fit.config.ts:61`); on the pool a dev-server `solve:nc` / `solve:surplus` takes ~30 s at the laptop (`e2e/caddie-walk.spec.ts:977-979`), and on CI's 4-vCPU runner (pool P = 2) the RV gate's `?seed=surplus` pending-to-lockup wait — measured on the v9 build, its per-arm figures in `COMMITTED_LOCKUP_MS`'s docblock (`e2e/chart-text-rv.spec.ts:49-52`, `12e40395`) — has run with its worst arm close to this harness's 180 s per-test budget, but the fit arms still inject the committed lockup and never wait for a committed solve). So *"seat it and re-measure
  under `verify:fit`"* is **unexecutable** for anything in `.rec-committed__rest`; it needs a MANUAL
  1536×791 measure. And the *"~89px headroom"* number is the SPINE idle frame (`vertical-fit.spec.ts:2801-2803`), a once-measured
  prose figure the spec never asserts — **never budget a different surface against it.** The DATE route's
  arms assert ORDER + REACHABILITY only (spec header `vertical-fit.spec.ts:22-23`) — no date frame has ever been fit-measured either.
- **(2026-09-27, b9-11)** the ONE width seam: a new `@media (min-width: …rem)` fails `breakpoint-mirrors.test.ts` unless it mirrors `--bp-laptop` (68rem) — a new tier is a product decision
- **(2026-09-26)** the spend lane lands a beat AFTER `data-answer-tier="final"`: a capture must wait out `.cs-magnitude[data-spend="pending"]` (the Caddie walk does since `2f43761f`), while a fit arm measuring right after `final` is measuring the RESERVED pending box — both states are laws
- **(2026-09-23 evening)** a held look spec's style-tag lift must be REMOVED before the next dialog opens (a leaked `max-height:none` made the Roth frame an uncapped sheet no reader sees)
- **(2026-09-14)** a SECOND config under `e2e/held/` is a second OWNER of every held spec (the shots config collects `**/*.spec.ts` there by design — it is THE held harness); a new instrument is a `.spec.ts` under it, run filtered by file name, never its own config, and never a `.look.ts` (the partition walk only sees `*.spec.ts`).
- **(2026-09-11, evening)** `verify:fit` under self-inflicted LOAD reds arms that are green — running `verify:doc-stats` (its
`vitest list` collects the whole suite) twice DURING the fit run redded the two raised-root chart-text arms ("no figure matches
figure.band-figure": the band had not mounted when the audit ran); both pass in isolation and the full 139 passed on an idle rerun
(4.9 m locally). Never run vitest / doc-stats / a build beside a browser gate; a red under your own load is not a finding, and the
idle rerun is the proof
- **(2026-09-08)** `settleLayout` ENDS in `scrollTo(0,0)` — a gate whose subject is the scroll position must not call it before
measuring (the first mutant went green for exactly that)
- **(2026-09-08)** a Playwright `.click()` scrolls its target into view — use an
in-page `button.click()` when the offset is the subject
- **(2026-09-08)** Playwright's 390×844 mobile emulation
reports `innerHeight` 862 (870 on the first step) against a 844 `visualViewport` — pick one deliberately
- **(2026-09-08)** WebKit has no
`navigator.storage.persist()` — record, never assert
- **(2026-09-08)** `<ChartReadoutRow>` renders in BOTH seats and marks `data-active` either way — seat-aware locators, never
an OR
- **(2026-09-08)** taps and hovers land in VIEWPORT coordinates — on a 390-tall viewport scroll the target into view first
- **(2026-09-07/08)** `e2e/` is outside `tsconfig.json`'s include — nothing typechecks the specs,
so every new audit field needs a non-vacuity pin (the `data-ct-priority` pin is the pattern). Ink px differ
by rasterizer — 45.0 Windows / 42.0 Linux for the same glyphs (insight 118): pin structure by TEXT, floor ink
with a cross-platform margin, never a Windows number. A synthetic tap at an element's EXACT edge dispatches
nothing on 390@3 (insight 119) — inset 1 px. `test.fail` + a timeout = a real failure (insight 120) —
instrument tests measure first, assert last, and load ONCE (`setRootFont20` BEFORE `gotoSeedFinal`). Local
fit workers are capped at 30% (insight 121); `FINAL_TIER_MS` (150 s, `e2e/reviewSurface.ts`) is the one anchor
wait — `vertical-fit.spec.ts` still re-types `90_000` in eight places (harmless at 6 workers; hoist when
touched). `atceiling` is a DATE seed (~45 s/arm) and rides EVERY arm in the loop (six since PHONE_LS). `temp/` is
gitignored, and squeaky's step 4 deletes each closing session's own files there (and the files it only read, unless
another session is live), so nothing irreplaceable may live there: the 24 px instrument + measurements moved to `e2e/held/`
and the icon generator + sheets to `scripts/icons/` on 2026-09-08; screenshots are regenerable. *Reconciled 2026-11-09: this
said squeaky clears `temp/` UNCONDITIONALLY; its step 4 now deletes only the closing session's own files.*

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

## Citations and the doc gates

- **(b9-6, 11-09) `pnpm doc:reanchor <base> --apply` edits `src` comments too** (370 edits in walk 4's round,
  `devSeeds.ts` and `stalenessExposure.ts` among them): run it once, last, after the sweep and the mutants, never while a
  plant is live.
- **(b9-3, 11-09) `pnpm doc:reanchor HEAD --apply` again left two bare continuations on TODO.md's Card 13 line** (`:2217`
  and `:2330` after `vertical-fit.spec.ts`, the aged `datestale` / `datearrived` describes, moved +4), with "0 for hand
  review"; fixed by hand. After any re-anchor that moves `vertical-fit.spec.ts`, grep that line's bare `:N` against the
  describes.
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
  differs only in them; it snapshots first), then one fresh run, then the three checkers.

- **(b9-14, 10-29) The re-anchor tool still misses bare tokens on a line that names another file first** (four this time, plus four
  bare `taxOverlay.ts` tokens in `objectiveHeadline.ts`'s docblock that only `crossline-sweep.mjs` sees — the same four
  as b9-13), and still rewrites the two HISTORICAL lines (`docs/backlog.md`'s quoted re-anchor incident, insight 136's
  wrong-citation example): after the one `--apply`, run `pair-check.mjs` + `crossline-sweep.mjs` + `content-check.mjs`
  and put every recorded number back to HEAD.

- **(b9-11, 10-27) `pnpm doc:reanchor` runs ONCE, LAST — and docs edited after it ran need hand moves.** A re-run against HEAD
  double-shifts every token it already moved (its dry run proposed `solverCodeVersion.ts:154 → :171` for a citation
  already at the right line). Move the later ones by hand from content, then run `content-check.mjs` (the re-anchor
  tools folder) — every DIFF it prints must be a construct this change edited on purpose. It also rewrote a HISTORICAL
  example inside a landmine below (the "two new register entries shifted `docs/backlog.md:1966`…" line) as if it were
  live: reverted by hand; read its WOULD list for examples before `--apply`.

- **(b9-10, 10-22) `pnpm doc:reanchor` skips `index.ts` too** (two are tracked: `src/engine/constants/index.ts` and
  `src/engine/reference/solver-cases/index.ts`), the ambiguous-basename class. Run `git grep -n "index\.ts:[0-9]"` and fix
  by content. Its missed-bare-token class recurred: backlog's `:401-407` sat ~90 characters after `simulate.ts:441-444`,
  and pair-check's DOCHUNK section caught it. It also never moves a doc's citations INTO ITSELF, and neither tool flagged
  it: two new register entries shifted `docs/backlog.md:1966`, `:2252`, `:2325` (cited from inside the register) by +36.
  After any edit that adds lines to a doc, run `git grep -n "<doc>:[0-9]"` across the repo, the doc itself included, and
  compare HEAD vs tree content at each shifted number.

- **(b9-9, 10-21) The re-anchor after an engine edit.** `pnpm doc:reanchor HEAD` (dry run) then `--apply` made 148 edits, including
  dated logs and insights (the precedent `b4bbbd3e` accepted the same). Then: hand-fix each REVIEW token by content
  (a reworded cited line); run `pair-check.mjs` + `crossline-sweep.mjs` + `content-check.mjs` from the tools folder.
  `pair-check` flags a HISTORICAL token as MISMATCH (TODO's "`model.ts`'s `:668` … had been stale") — a recorded
  number stays. `crossline-sweep` found two bare `:151-152` docstring tokens the tool cannot see (fixed by hand).

- **(b9-9, 10-21) A plan doc under `docs/` must carry no line-numbered code citation and no count:** `verify:doc-stats` scans every
  doc there for both.

- **(b9-6, 10-21) A doc edit AFTER the apply that adds a line** shifts every citation INTO that doc below it. Grep `<doc>:N` and its bare continuations before adding (this run's one register line was checked clean).
- **From the b9-1 close (2026-10-16 evening, his three rulings + two in-session):** `pnpm doc:reanchor` LEAVES its REVIEW citations (inside a modified hunk) at their OLD numbers even under `--apply` — hand-fix each by CONTENT (HEAD line vs tree line); it moves only the FIRST number of a comma list (`ConfidenceStatement.test.tsx:691,704` → `:721,704`, fixed by hand), it rewrites citations inside `.ts` comments too (check `git status` for test files you never touched), and it misses a bare continuation more than ~60 characters from its file name (four this session) · the honest post-run check runs from HEAD's side: take each HEAD doc token, map it through the code diff, and confirm the tree doc carries the new number — a tree-side scan ("does tree(N) still equal head(N)?") flags every correctly moved token in a uniformly shifted region (190 false positives this session) · a ruled word change can be FALSE on a route its ruling never saw — trace every render site through a workflow before the first edit (this session's trace found the aged-plan "starting now" and the wide-gap "add none" before a line was written) · `copyGuard`'s `require-hedge` is PREFIX-scoped: a figure-free mechanism pointer belongs in the `medicareExtras*` family with a figure-free pin, never an exemption list · the Healthcare sheet portals to `document.body` — an RTL `container.textContent` reads empty there · `node -e` ate a regex's backslashes again (`\S+` → `S+`) — any script with backslashes or backticks goes in a FILE · a capture-only `devSeeds.ts` plant runs AFTER the walk (the walk's dev server would hot-reload mid-capture), restored by copy + cmp
- **(2026-10-03 late, b9-5)** `pnpm doc:reanchor <BASE>` a SECOND time after `--apply` re-proposes the applied shifts (it diffs against BASE) — never apply twice; and it shifted a bare `:725` following `taxOverlay.ts:673` (then UNCHANGED — both are 2026-10-03's numbering; the register's *`tax.rmdStartAge` vs 26 CFR 1.401(a)(9)-2(b)(2)* entry carries the live pair, and `ee62a839`'s run moved only the named one here, to 677) by `solveAnchor.ts`'s diff ("bare, after solveAnchor.ts") — read every bare continuation's governing file before trusting the shift (a fourth blind class beside the register's Tier 4 two) (filed in the register 2026-10-03)
- **(2026-09-27, b9-sotd)** `pnpm doc:reanchor` skips self-citations and ambiguous basenames (the Tier 4 entry) — in a parallel fix pass a number into ANOTHER file is its HEAD number, a self-citation the post-edit one, then the tool ONCE, LAST
- **(2026-09-27, b9-sotd)** a code-driven DELTA doc audit found 105 stale claims 21 h after a full audit and hours after a 100-agent review that restored five — after an engine-meaning commit batch, run one (`4c6b3e4f`'s message is the recipe).
- **(2026-09-26, b9-8)** the citation re-anchor is `pnpm doc:reanchor <BASE>` — this session re-invented it in scratchpad scripts (verified byte-identical, but the tool owns bare continuations and freezes); a bare `:NNN` on the line AFTER its governing `file.ts:` is invisible to a line-scoped remap (`model.ts`'s `:658` into `fingerprintOf` had been stale since before this session) [2026-09-26 delta doc audit: one more class the tool never re-anchors — a file's citations of ITSELF (`base === selfBase`, `scripts/reanchor-citations.mjs:82` / `:102`; `intakeMap.ts`'s four self-citations rotted +26 in `e04823a4`) — grep that class by hand after `--apply`]
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

## Copy and copyGuard

- **(b9-6, 11-13) A refuter's fix words can bring back a wording a council struck.** Walk 7's R1 refuter wrote "Your
  answer takes none of those shortfalls from your savings", which council `wf_7fa86902-35c` struck in walk 4; only
  `copyGuard.test.ts`'s retired sweep (`RETIRED_EVERYWHERE`) caught it, after the build. Before building a refuter's or
  a card's words, grep `RETIRED_EVERYWHERE` and `RETIRED_BELOW_QUOTE` for each phrase, and word the fact in the
  council's own ruled clause where one exists.
- **(2026-09-26, b9-8)** a UI number moved by an engine fix (the step card's $218,000 → $224,000) is a visible change inside an unchanged sentence — say so to him the same turn, the words-are-his law covers meaning
- **(2026-09-24)** the `irmaaStep*` copy family lives in `slots` for its templated members — a PLAIN string with that prefix belongs in the `copy` catalog beside `irmaaStepBothBase` (a string dropped into `slots` made `copy.<key>` undefined and the new pins compared undefined to undefined — the render-sample census caught it, typecheck would have)

## Caddie walks and fleets

- **(b9-1, 11-12) A walk failure that does not reproduce on a fresh server is the server's first.** Before reading a
  walk failure as product, confirm nothing served the harness's port before the run: every Playwright config reuses an
  existing server locally (`reuseExistingServer: !process.env.CI`), and a `TaskStop`ped `vite` keeps serving. The
  11-09 `intake:kept` REAL failure passed three runs on fresh servers, with zero DOM mutations after the settle
  (`b9-build2-surplus\u11-walk6\panel\CHAIR-NOTES.md`, its foot).
- **(b9-8, 11-09) A seat's arithmetic can borrow the wrong quote.** `stillWorking` answers
  `employerPlanCoversRetiredMember: true` (`src/ui/devSeeds.ts`), so the pay-side premium is entered nowhere; walk 5's
  hunter priced it from the $1,100 after-work reference quote. Check the seed's own fields before a refuter carries a figure.
- **(b9-5, 11-09) Seats that write their reports to files never truncate** (walk 4: 16 seats, none lost; walk 5: 17, none
  lost): each brief names its output file, asks for a reply of 80 words or fewer, and the chair reads the files.
- **(b9-4, 11-09) Two refuters' fixes can contradict each other:** R4 offered "settling on $105,000" for "checking your figure at" while
  R3 had just ruled "settle on" a bargaining word; walk 4's N3 offered "Check your figure" as the button where walk 3 had
  burned "check" as "look". Cross-read every refuter's fix, and the ruling it lands under, before adopting any one.
- **(b9-3, 11-09) The blocked W step's capture is scrolled to the top** (the settle recipe's `scrollTo(0,0)`), so its
  alert, about 1,300 px down, is never in `viewport.png` and no CVD arm covers it; no capture shows whether a real press
  scrolls to it.
- **(b9-5, 11-08) A Caddie panel capture shows the OLD answer behind the sheet.** Each `intake:kept` panel state is captured
  ~5 s after its edit, while the Result behind is still re-running (the walk measured a first commit up to ~18 s later), so the
  dimmed hero still reads the pre-edit date. Four seats read it as "the answer doesn't follow the edits"; the refuter traced it
  to timing (and found (ag) under it). Tell the seats, or settle the re-run before a panel capture, in walk 2.
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

- **(2026-09-26)** a council's draft copy is a floor, not the words — his read cut its duration phrase; offer the lean form, then take his ruling and record the evidence honestly (the "how long?" was the pilot's question, not his).
- **(2026-09-13 late)** a dead session's Workflow verdict lives in `~/.claude/projects/<proj>/<session>/tasks/<task>.output` (the `result` field) and its script under `workflows/scripts/` — recover from there, never re-run the council
- **(2026-09-13 evening)** the council-log's table header repeats per section — anchor an insert on the FIRST DATA ROW, never the header

## Claude Code, workflows and sessions


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

## Probes and measurement


- **(b9-11, 10-27) A dev seed carries no `chosenGoal`**, so `buildSolveRequest` returns `spine-unready` for it — a node-side solve
  probe passes `{ ...seed, chosenGoal }` (`b9-seed-probe\solve.mts`'s `seed:goal`). Single-threaded, `healthss` takes
  ~15–18 min per goal.
- **(2026-10-03 late, b9-5)** the worker script exposes `{ ...engineApi, ...poolApi }` and `EngineHandle` is SPINE-only (`Promisified<EngineApi>`) — a new pool method goes on `poolApi`, never forwarded by the resettable handle; a new `EngineApi` method still breaks every hand-rolled fake by design
- **(2026-10-03 late, b9-5)** the roster measurement recipe: a tsx script OUTSIDE `src/` (doc-stats counts `*.test.ts` under it) over `DEV_SEEDS` + `buildSolveRequest`, run on the tree, then run on a frozen HEAD copy (insight 148: a `git archive` of HEAD's `src` + tsconfig + package.json with a `node_modules` junction, the archive run from the repo root per the Git section) — never `git stash` `src`, which moves every session's uncommitted work there. *Reconciled 2026-11-09: this said `git stash push -q -- src`, run, `git stash pop`, against the Git section's "never `stash` the held paths".*
- **From the b9-4 close (2026-10-03, the solve-time levers + the pool's generator foundation):** his LAPTOP STATE swings a solve's wall clock ~2× on the same code (`retired` 639 s on 10-01, 338.5 s on 10-03, both on AC / High performance, cause not recoverable) — compare timings only WITHIN one session, take a same-session baseline before every re-time, and never mix days in one table · node runs the engine ~2.5× slower than Chrome (the identity gate's 256-path `retired` solve ~11 s in vitest) — vitest runs one FILE's tests serially, so a heavy fixture goes in its own file to run in parallel (`solvePayloadIdentity.health.test.ts`) · `verify:doc-stats` counts any `*.test.ts` under `src/` — a scratch runner (the digest anchor, the call-sequence recorder) lives OUTSIDE the tree and is copied in only for its run, then deleted (the session's two were `zzAnchor.test.ts` = `bitDigest` of `solveWithMint` payload + `packSolveWire` on F1–F4 / F6 via `identityRequest`, and `zzCalls.test.ts` = `vi.mock('@engine/simulate')` recording `bitDigest([params, seed, options])` per call, shipped AND legacy — re-create them from that description; the scratchpad is per-session) · a HEAD-vs-tree differential by `git stash push -- src` leaves UNTRACKED files in place — sound only while HEAD's code imports none of them · `node -e "…"` in Git Bash interpolates backticks (it ate a docblock's identifier) — any edit carrying backticks goes through a script FILE or the Edit tool · an FNV lane with an EVEN multiplier flushes to a constant over a long walk (`bitDigest`'s first cut — a 64-bit digest with 32 live bits); both halves are now pinned to vary · one added import line in `intakeMap.ts` moves ~90 citations — `pnpm doc:reanchor HEAD` handles them, never by hand · a mutant plant must be grep-verified as LANDED and the file `cmp`-restored after (`scratchpad/plant.mjs` refused a missing anchor with exit 2 — re-create it: replace one exact string or exit 2).

## Engine and tax math

- **(b9-8) The HSA leaves-out row's TRAP 3 (Tier 0 of `TODO.md`'s 2026-08 tiered list) calls its three cited branches "zeroing" ones, but
  the third (`taxOverlay.ts`'s knife-edge buckets) is not a depletion branch** — since C2 it holds the year's deposits and
  since U4 the left-over credit. Whoever builds that row re-reads it before writing the HSA sentence.
- **(2026-09-27, b9-11)** the witness digests see the exported PRICERS only — a change to how they compose (the gross-up, the IRMAA lag, RMDs, the draft → params map beyond `escalateQuote`) moves no digest: append the row by the discipline, not by the red
- **(2026-09-26, b9-8)** the IRMAA tier readers REQUIRE the compared schedule at the RIGHT MAGI year — the four clocks are in architecture §7.2; a new reader picks its clock there, never `irmaa.value` (the brand makes that a compile error)
- **(2026-09-25 late)** ANY change to a scored overlay's pricing bumps `SOLVER_CODE_VERSION` (the rule is in `solverCodeVersion.ts`; the §86 fix missed it)

## Persistence and schema

- **(2026-09-27, b9-11)** a fixture or dev plant saved at the WALL CLOCK's today sits on the ledger's ambiguous ship day whenever a row lands — it reds CI on exactly that day and greens the next; stamp "saved by this build" at `FIRST_UNAMBIGUOUS_SAVE_DAY` (every existing fixture and plant already does); a date-derived pin (`?vault=stale`'s note count) is DERIVED from the ledger in both its unit arm and its fit arm, never hand-typed

## Driving the app

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

## Research and re-verification


- **(b9-7, 10-21) ssa.gov answers curl with 403.** Read the IRS Topic pages instead (751 payroll, 560 Additional Medicare: primary,
  and they curl fine), or LII for the statute. A grounded search alone is secondary.
- **From the b9-3 close (2026-10-20, the ACA re-verify + (1b)'s measurement):** every ACA instrument change this pass met lives in the record's `forwardClock` ⚑ 2026-10-20 head — uscode's `versions.json` lists only the newest id and an unknown id answers HTTP 500 with a 75 B body; the GovTrack JSON API is retired (enumerate new measures from govinfo BILLSTATUS bulk listings); the govinfo PLAW not-published shell is now 44,172 B (detect it by content); archives.gov needs a cache-busting query; the Senate vote menu moved to `roll_call_lists/` — read that head before the next pass, never this line · a presented bill past its tenth day can already be law with no list showing it (S. 195 was signed 10-09 and read "unsigned" on 10-12) — read the bill's own BILLSTATUS actions · a GPO HTML bill print can render a table as "TABLE TOOL ERROR" (S. 5496) — read the XML · research agents that browse drive Playwright from the repo and leave `.playwright-mcp/` in it — sweep it after any such agent · a probe script outside the project runs under `pnpm exec tsx` from the project dir (its relative imports reach `src/`, whose `@engine/*` aliases then resolve), but only as `.mts` — a `.ts` with top-level await dies "not supported with the cjs output format" · a commit message's summed counts come from the run outputs (582 + 98 + 29 = 709 across 21 files), never a recalled figure — the ACA commit first said 680 and was corrected before the push.

## Other

- **(b9-6) `docs/plans/features/README.md`'s index is stale.** It has no rows for the pay-check, schema-v4 or build-2 specs,
  and its prose still calls the working-year tax floor "the next build". Fix it in build 2's U12 docs pass: add the three
  rows, and rewrite the "All of them are shipped except…" sentence from the roadmap.
- **A filed prescription in this repo is ~25-40% executable as written** — thrice-measured (5-of-11,
  2-of-5, 1-of-5 clean). Drifted anchors, mechanisms the code does not have, edits that would write NEW
  false claims. **Open every cited line before executing; budget as if it were unwritten.** A prescription
  never inherits the trust of the correct diagnosis above it.
- **(2026-10-30, b9-3)** a prop added to a
component's TYPE but not to its destructure silently resolves to any same-named module binding (`describedBy` in `fields.tsx`);
a `(s): s is string` filter guard then hides it from tsc — destructure first, and name a new prop so it cannot collide.
- **(2026-09-12)** a "recorded limit" arm that enumerates a set by RUNNING the code is a DND 012 brush — acceptable only when a lens independently
re-derives the same set and the comment says so (the pbt's `[1,2] ∪ [9,12] ∪ [1001,1250]` arm)
- **(2026-09-12)** a `;` where `&&` belonged let the close chain
push past a red doc-stats (`118e9822`, fixed by `40b14952`) — gate every chain with `&&`
