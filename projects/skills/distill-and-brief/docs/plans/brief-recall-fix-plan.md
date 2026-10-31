---
title: Brief Recall Fix - Plan
type: feat
date: 2026-10-31
deepened: 2026-10-31
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Brief Recall Fix - Plan

## Goal Capsule

- **Objective:** before a job starts, the session sees the past lessons that bear on it. On the Back Nine, where brief now finds about 2 in 5 of them, it finds clearly more, without burying them in noise, as measured against the old brief on the same 17 jobs.
- **Means:** a one-line `applies_when` header in each lesson that brief reads by meaning, plus a recipe that scores every match and reads more for big jobs (KTD1-KTD4), proven on frozen copies before anything lands (KTD7).
- **Authority:** the Product Contract's R-IDs win on behavior; KTDs win on mechanism within them; units carry only local detail. Briggsy owns what and why; the pilot owns how.
- **Stop conditions:** stop and report, landing nothing, when the re-score misses the bar in Success Criteria; when the line writers cannot be kept blind to the benchmark (R10); or when a Back Nine gate fails on the landing and the cause is not a one-line fix.
- **Execution profile:** direct commits on `main` in the one shared checkout, each staged by path (`git commit -- <paths>`, never `-a`); no pull request. The work spans sessions; each close names the next unit in the playbook TODO's START HERE.
- **Who finishes:** the pilot, across the next sessions; Briggsy gets the measured numbers and the verdict in plain words.

---

## Product Contract

### Summary

Every lesson gets a one-line "applies when" header that /distill writes and /brief reads by meaning. Brief scores every lesson its search finds, reads up to 10 for a big job, and matches words only at their start. The Back Nine's 148 lessons get their lines, and 19 unlabeled lessons get headers. Both changes are tested against the old brief on the saved 17-job benchmark, on frozen copies, before any of it goes live. Burned and Feud get their lines only after the Back Nine result passes.

### Problem Frame

Brief exists so a session doesn't walk into a trap a past session already paid for. On 2026-10-31 a blind benchmark (`projects/skills/distill-and-brief/brief/results/recall-benchmark-2026-10-31.json`) scored the 17 briefs run from 10-19 to 10-31. On the small how-we-work folders brief found all 19 lessons that mattered. On the Back Nine's 148 lessons it found 87 of 222, and 11 of those 87 counted only because the job's plan already cited them. Across all projects, 73 of the 140 misses show the work then ran into that exact trap, mostly caught later by a review, at the cost of rework.

The misses have five causes: 37 lessons were found and then dropped before scoring (the recipe's "more than 25, tighten" step), 41 shared no word with how the job was described, 25 had no tags or no header, 21 were cut by the read-5 limit, and 5 were crowded out by a word matching inside another word ("fica" inside "verification"). The search works by shared words, while a job is described by its feature and a lesson by how something broke.

### Requirements

**The lesson header**
- R1. A lesson can carry one `applies_when` line naming the situations it applies to, in terms of what the work touches or does, so a job described by its feature can match a lesson described by its failure.
- R2. /distill writes the line for every new lesson and revises it when it extends an existing lesson.

**What brief does**
- R3. Brief scores every lesson its header search matches; none is dropped before scoring.
- R4. Brief also judges every lesson's `applies_when` line, or its title where the lesson has none, by meaning against the job, so a lesson sharing no word with the job can still be found.
- R5. Brief reads up to 10 lessons in full for a big job and 5 otherwise, and names the next ones by title.
- R6. A search word matches only at the start of a word: "seed" still finds "dev-seeds", and "fica" no longer finds "verification".
- R7. Brief's output stays compact: at most 10 landmines for a big job and 5 otherwise, and at most 10 also-relevant lines.
- R8. Brief never loses lessons silently to a tool's output limit; when it cannot see the whole list, it says so.

**The backfill**
- R9. The Back Nine's 148 lessons get `applies_when` lines; its 10 lessons with empty tags (008 062 063 064 065 069 072 091 097 098) get tags; Feud's 9 headerless lessons (017 025 026 027 028 031 032 033 034) get a header.
- R10. Whoever writes a line sees only that lesson's text: never the benchmark, its topics or its judged lessons.

**Proof**
- R11. The old and new recipes run on the benchmark's 17 jobs against frozen as-of copies of each job's lessons, scored against the judged lessons, with lessons named outside the judged sets judged blind, and each result stamped with a hash of the recipe bytes that produced it.
- R12. The bar for landing is set in this plan before any run (Success Criteria); a miss lands nothing and is reported.
- R13. No doc claims better recall until the re-score lands; then the docs state the measured numbers and that they are in-sample.

**Rollout**
- R14. Burned's 72 and Feud's 38 lessons get `applies_when` lines only after the Back Nine re-score passes.

### Key Decisions

- **The index lives inside each lesson, as one header line.** A separate index file is a second copy of every lesson and drifts (the Back Nine's insight 122). (session-settled: user-approved — chosen over a separate index file of lessons: "another asset to be out of sync") Governs R1, R2.
- **Prove it on the Back Nine and the saved benchmark before backfilling everything.** (session-settled: user-approved — chosen over backfilling all 275 lessons first: if the number doesn't move, the idea is dropped at the cost of an afternoon) Governs R11, R12, R14.
- **Brief's search changes: score every match, read more for big jobs, match words properly, label the unlabeled lessons.** (session-settled: user-approved — chosen over leaving brief as it is: it finds about 2 in 5 of the Back Nine lessons that matter) Governs R3, R5, R6, R9.

### Success Criteria

Measured on the Back Nine's judged pairs (the 222 judged relevant, minus any the re-score's blind judge refutes), recall is the share of judged lessons a brief names, as a landmine or an also-relevant line. Plan credit counts for no arm. Precision is the share of all named lessons that a judge (original or blind) holds relevant. Arms are defined in KTD6; each runs twice.
- **Land the new recipe** when its titles-only arm's worse run beats the old recipe's better run by at least 10 points of recall, its precision is no more than 10 points below the old arm's, and no small-corpus brief loses a lesson the old arm found.
- **Land `applies_when` and the backfill** when, on top of that, the full arm's worse run beats the titles-only arm's better run by at least 5 points, under the same precision condition.
- **Land nothing** when the titles-only arm misses its bar. Report the numbers.
- Reported alongside, not gating: recall at an equal budget (each arm's first 5 names only), strong-lesson recall, and how often a Grep result fell back to a file preview.

### Scope Boundaries

- Not a separate index file (Key Decisions).
- Not a tag-vocabulary cleanup: the Back Nine has 880 distinct tags, 740 used once; the meaning pass covers what they miss.
- Not a search across projects' lessons: no measured case of it costing us.
- No hook or gate: brief runs because START HERE names it (playbook insight 009).
- Brief's code-check and correction step (its step 5) is unchanged.
- The Back Nine's 140 KB `docs/insights/README.md` index is untouched; its gate (`verify:doc-stats`) checks only links and section headings.
- Considered and not built: a run-to-run variance study beyond two runs per arm. Two runs and margins of 10 and 5 points are the guard; more runs would be warranted if the two runs of one arm differ by more than the margin.

#### Deferred to Follow-Up Work

- `applies_when` for Burned and Feud (R14), after the Back Nine passes, with an `applies_when` row in Burned's `docs/insights/README.md` frontmatter conventions table.
- A forward check: blind-judge the next five real briefs after landing, the same way, so a number measured on the misses that shaped the fix is checked on jobs it never saw.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **`applies_when` is a one-line YAML flow list, under CE's field name.** Shape: `applies_when: [changing what feeds the gross-up solver, adding a tax rule's input]`. CE 3.34.0 uses the same name for its packs as a block list, which brief's one-line header grep cannot see; a flow list keeps CE's meaning (a list of conditions) and our one-line field convention (`modules: [...]`, `tags: [...]`), and `corpus.mjs` already parses any `key: value` line. Each line holds 2 to 4 situations, at most 160 characters, phrased as what the work touches or does; never the lesson's conclusion, a lesson number, a session name or a date.
- KTD2. **Brief reads every line through a paged listing from `corpus.mjs`, not through Grep.** A Grep of all 148 Back Nine titles is about 49 KB with paths, Grep stops at 250 lines unless told otherwise, and Claude Code shows a 2 KB preview of any output past about 30,000 characters. A titles-only listing without paths is already 25,492 characters. So `corpus.mjs --list` prints one line per lesson (number, then `applies_when` or the title where there is none), cuts each line to 200 characters, and pages at 20,000 characters, naming the page count on every page. The card gains one coverage line: how many lessons carry `applies_when`, and the numbers of those that don't (`idList`, `MAX_IDS`). The default card stays under its 3,800-byte `CAP`.
- KTD3. **The new recipe's flow.** Keywords; header greps with start-of-word patterns and `head_limit: 0`; a meaning pass over every listing page; the union of both is the candidate set; one batched header print scores every candidate (an `applies_when` match by meaning scores like a tag hit, +3 per concept); then the existing read, code check and output steps with R5 and R7's limits. The meaning pass is what reaches the 41 no-shared-word misses; scoring every candidate reaches the 37 dropped ones.
- KTD4. **"Big job" is decided from the topic by a rule, not by feel.** Big when the topic names two or more modules, files or areas, or a job that spans sessions; small otherwise; big when unsure. The harness records which label each run took, so recall bought by reading more is visible.
- KTD5. **Line writers see one lesson version at a time, by git blob.** Of the 222 judged pairs, 70 involve a lesson changed after its brief, 63 by a later `## Extended` section, and 22 of those describe the very work that missed them (017, extended 10-31). A line written from today's text would carry the answer into the as-of copies. So a line is written once per distinct blob that any as-of copy or `HEAD` holds; each writer gets only that blob's text inline in its prompt and is told not to search the repo, where the benchmark file is greppable. The landing uses the lines written for `HEAD`'s blobs, by the same prompt.
- KTD6. **Three arms, two runs each, on the same frozen copies.** A1: the old recipe (`git show` of `brief/SKILL.md` and `brief/corpus.mjs` at this plan's commit). A2: the new recipe on copies where every lesson shows its title. A3: the new recipe on copies carrying the KTD5 lines. The 19 header fills (R9) go into every arm's copies, so the arms differ only in recipe and lines. A1 against A2 measures the recipe; A2 against A3 measures `applies_when`. Every run is one Opus helper per brief that never invokes the Skill tool, runs the arm's `corpus.mjs` on its copy by absolute path, follows the arm's recipe to the point where it has chosen what to read, and returns its picks through a schema. That is 102 brief runs plus the blind judges, far over the session's 10-agent guideline, because Briggsy asked for the 17-job test re-run and variance needs two runs.
- KTD7. **Nothing goes live until the verdict; then the measured bytes land unchanged.** `~/.claude/skills/brief` and `distill` are junctions into this folder, so a saved edit is live in every session at once. The candidates are built as `brief/SKILL.next.md` and `brief/corpus.next.mjs`, which nothing loads, and the as-of copies live in the session scratchpad. On a pass, the candidates replace the live files byte for byte (the Back Nine's insight 148: measure on a frozen copy, land what was measured). On a miss, the candidates are deleted, and the results stay as evidence.
- KTD8. **The as-of copies are built from git at each brief's commit.** Seven of the 17 topics searched folders since moved, renamed or deleted (hooks lessons moved to the playbook on 10-22; playbook 001, 004, 006 and 007 deleted on 10-29; Feud 034 renamed), and 30 Back Nine lessons changed since 10-19. Each copy is `<scratch>/<briefId>/docs/insights/` holding the lessons under their original filenames at the commit before the brief, plus the README index where one existed. A topic whose judged lessons sit in a folder outside its copy is scored on the copy's lessons only, and the builder logs what it left out. B01, which searched four folders, is scored on its Back Nine copy.
- KTD9. **Names outside the judged sets are judged blind.** The original briefs named 85 lessons outside the judged sets, so reading up to 10 could win by naming more. Each such name gets one blind Opus judge, with the original judges' rules, that is never told which arm named it; a lesson held relevant joins that brief's judged set for every arm.

### High-Level Technical Design

```mermaid
flowchart TB
  G[git: each brief's commit] --> C[as-of copies, scratchpad]
  F[19 header fills] --> C
  B[distinct lesson blobs] --> W[blind line writers]
  W --> L[applies_when lines by blob]
  C --> A1[A1 old recipe]
  C --> A2[A2 new recipe, titles]
  L --> A3[A3 new recipe, lines]
  C --> A3
  A1 --> S[score vs judged sets + blind judges]
  A2 --> S
  A3 --> S
  S --> V{Success Criteria}
  V -->|recipe and lines pass| LAND[land candidates, lines, fills, distill]
  V -->|recipe only| LANDR[land candidates and fills; drop applies_when]
  V -->|miss| STOP[land nothing; report]
```

### System-Wide Impact

- **Every session at once.** The swap in U7 changes brief and distill for every session on the laptop the moment the files are saved (KTD7), including a session mid-job. Brief's output enters each session's context, which is why R7 caps it.
- **The Back Nine's gates.** Every push touching `projects/the-back-nine/**` runs `verify-the-back-nine.yml`. `scripts/verify-doc-stats.ts` checks the insights index links and the four required headings, never frontmatter, and its tests run on the real folder, so a frontmatter-only change passes. `.claude/workflows/council.js` greps `^(tags|title):.*calm-but-wrong`, anchored, so it is unaffected.
- **Other readers of lesson files.** `projects/hooks/check-config-liveness.mjs` reads a skill's `name:` (keep `name: brief` and `name: distill`). `tools/project-metrics/src/classifier.ts` counts lines under `docs/insights/`, so the backfill moves the stats site's numbers at its next local refresh; there is no gate. No YAML library parses lessons anywhere. CE's own lesson finder, if ever pointed at these folders, reads a flow list as a list (KTD1).

### Assumptions

Inferred during planning, not confirmed by Briggsy:
- The bar's margins (10 points for the recipe, 5 for the lines) and two runs per arm.
- The `applies_when` shape and its 160-character cap (KTD1), and the listing's 200-character lines and 20,000-character pages (KTD2).
- The big-job rule (KTD4).
- Feud's 9 headers land with the Back Nine work; Feud's `applies_when` lines wait (R14).
- The run's token use, roughly 10 million helper tokens, fits his usage limits; the build checks the status bar's 5-hour and weekly meters before launching and runs one round per arm first when they are high.

### Risks

| Risk | Mitigation |
|---|---|
| The fix was designed from the same 140 misses it is scored on, so the gain is in-sample. | Recipe and bar are fixed before any run; R13's in-sample label; the forward check in Deferred. |
| Opus judges and Opus briefs share blind spots. | Disclosed with the numbers; precision is checked, not only recall. |
| A copy given by absolute path makes Grep print longer lines than a real run, so the harness hits the preview limit sooner. | KTD2's listing avoids Grep for the full list; each run logs any Grep result that fell back to a file. |
| A Back Nine session is live in the same checkout, and every Back Nine push runs its full CI. | The landing is one commit staged by path, after a message to the live Back Nine session; CI read by full sha. |
| Line quality varies by writer. | KTD1's bar in the writer prompt; a second blind helper spot-checks 15 lines against it before the run. |

---

## Implementation Units

### U1. The line writer's prompt and /distill's template

- **Goal:** one wording of KTD1's bar, used by /distill and by the backfill writers.
- **Requirements:** R1, R2, R10.
- **Dependencies:** none.
- **Files:** `projects/skills/distill-and-brief/distill/SKILL.next.md` (the candidate template), `projects/skills/distill-and-brief/distill/applies-when.md` (the bar, read by both).
- **Approach:**
  1. Write the bar per KTD1, with three good and three bad examples drawn from lessons outside the benchmark's judged sets.
  2. The candidate template adds `applies_when` to the frontmatter block and to the extend rule: an `## Extended` section revises the line when the new case adds a situation.
- **Patterns to follow:** the current `distill/SKILL.md` frontmatter block and its dollar-digit comment.
- **Test scenarios:**
  - The bar's examples contain no lesson number, session name or date.
  - `grep -n '\$[0-9]'` finds nothing in `SKILL.next.md`.
- **Verification:** a fresh reader can apply the bar to one lesson without asking anything.

### U2. corpus.next.mjs: the listing and the coverage line

- **Goal:** brief can see every lesson's situations within the tool-output limits.
- **Requirements:** R4, R8.
- **Dependencies:** none.
- **Files:** `projects/skills/distill-and-brief/brief/corpus.next.mjs`, `projects/skills/distill-and-brief/brief/corpus.test.mjs`.
- **Approach:** KTD2. The default card keeps every current line and gains the coverage line; `--list [dir] [--page N]` prints the listing; an unknown or empty folder keeps today's fallback lines.
- **Patterns to follow:** `corpus.mjs`'s `idList`, `MAX_IDS`, `CAP` budgeting and its BOM and CRLF handling.
- **Test scenarios:**
  - A folder with 3 lessons, one carrying `applies_when`: the card says 1 of 3 and lists the 2 without it.
  - `--list` prints the line for a lesson with `applies_when` and the title for one without.
  - A 300-character `applies_when` is cut to 200 characters with a marker.
  - A folder whose listing passes 20,000 characters splits into pages, each naming "page N of M", and `--page` past the last page says so.
  - A CRLF lesson and a lesson with a BOM list the same as LF ones.
  - The Back Nine's real folder: the default card stays under 3,800 bytes.
- **Verification:** `node --test` passes on the new tests.

### U3. SKILL.next.md: the new recipe

- **Goal:** the recipe KTD3 and KTD4 describe, as a file nothing loads yet.
- **Requirements:** R3, R4, R5, R6, R7, R8.
- **Dependencies:** U2.
- **Files:** `projects/skills/distill-and-brief/brief/SKILL.next.md`.
- **Approach:** start from today's `SKILL.md`. Keep the frontmatter `name: brief` (`projects/hooks/check-config-liveness.mjs` reads it), the topic and output sections, and step 5's code check and correction rules. Replace steps 1 to 4 per KTD3; the `!` line calls `corpus.mjs` (the file it will become); every Grep sets `head_limit: 0`.
- **Test scenarios:**
  - `grep -n '\$[0-9]'` finds nothing.
  - Read cold against a 5-lesson folder, the recipe has no step that needs the listing to page.
- **Verification:** the U6 dry run (one brief, one arm) finishes and returns a schema-valid pick list.

### U4. The header fills

- **Goal:** the 19 unlabeled lessons get headers, as data both arms and the landing use.
- **Requirements:** R9.
- **Dependencies:** none.
- **Files:** `projects/skills/distill-and-brief/brief/results/header-fills-2026-10-31.json`.
- **Approach:** tags for the Back Nine's 10, and title, date, modules and tags for Feud's 9 (Feud 025's bare `date:`, `modules:` and `status:` body lines move into its header). Written from each lesson's text, blind per R10.
- **Test scenarios:**
  - Every fill parses as frontmatter that `corpus.mjs` reads.
  - No fill changes a `## Problem`, `## Root Cause`, `## Fix` or `## Key Insight` heading.
- **Verification:** applying the fills to a scratch copy and running `corpus.mjs` reports no empty tags and no missing frontmatter for these 19.

### U5. The applies_when lines, by blob

- **Goal:** a line for every distinct lesson version the copies and `HEAD` hold, written blind.
- **Requirements:** R1, R9, R10.
- **Dependencies:** U1.
- **Files:** `projects/skills/distill-and-brief/brief/results/applies-when-lines-2026-10-31.json`.
- **Approach:** KTD5. List the blobs with `git ls-tree` at each brief's commit and at `HEAD`; batch about 15 blobs per Opus writer, text inline; a second blind helper spot-checks 15 lines against U1's bar and the batch is redone when more than 2 fail.
- **Test scenarios:**
  - Every blob in any copy and in `HEAD` has exactly one line.
  - Every line meets KTD1 (length, 2-4 situations, no number, session name or date).
  - No writer prompt contains a benchmark topic, a judged lesson list or the benchmark's path.
- **Verification:** the coverage check passes and the spot-check record is saved with the lines.

### U6. The re-score harness

- **Goal:** the verdict, per KTD6, KTD8 and KTD9.
- **Requirements:** R11, R12.
- **Dependencies:** U2, U3, U4, U5.
- **Files:** `projects/skills/distill-and-brief/brief/bench/build-copies.mjs`, `projects/skills/distill-and-brief/brief/bench/score.mjs`, `projects/skills/distill-and-brief/brief/bench/rescore.workflow.js`, `projects/skills/distill-and-brief/brief/bench/bench.test.mjs`, `projects/skills/distill-and-brief/brief/results/recall-rescore-2026-10-31.json`.
- **Approach:**
  1. Build the copies (KTD8), then splice the fills and, for A3, the lines.
  2. A dry run: one brief, one arm, one run, checked by hand.
  3. The full run, then the blind judges, then the score against Success Criteria.
  4. The results file records each arm's recipe hash (`SKILL` plus `corpus` bytes), per-brief picks, the big-job label, every metric and any preview fallback.
- **Patterns to follow:** the benchmark's own method (its `what` field) and its judge rules; the Back Nine's insight 148.
- **Test scenarios:**
  - The copy builder reproduces a lesson's bytes as git held them at the brief's commit, including a lesson deleted since.
  - A lesson added after a brief is absent from that brief's copy.
  - The scorer gives no arm credit for a plan citation, counts a blind-judged relevant name for every arm, and drops refuted pairs from the denominator.
  - Scoring a recorded run twice gives the same numbers and hash.
  - No brief-run helper's transcript holds a Skill tool call or a path into the live `projects/*/docs/insights/` folders.
  - The old arm's bytes are `git show` of the commit that lands this plan, and the results file records that sha.
- **Verification:** the results file exists, its hashes match the candidates' bytes, and its verdict line names one Success Criteria outcome.

### U7. The verdict lands

- **Goal:** the winning bytes go live, or nothing does.
- **Requirements:** R12, R13, R14.
- **Dependencies:** U6.
- **Files:** `projects/skills/distill-and-brief/brief/SKILL.md`, `projects/skills/distill-and-brief/brief/corpus.mjs`, `projects/skills/distill-and-brief/distill/SKILL.md`, the Back Nine's and Feud's `docs/insights/NNN-*.md`, `projects/skills/distill-and-brief/README.md`, `projects/skills/distill-and-brief/brief/README.md`, `projects/skills/distill-and-brief/distill/README.md`, `playbook/README.md`, `playbook/TODO.md`.
- **Approach:**
  1. On a recipe pass: the candidates replace the live files byte for byte (KTD7), and the fills land.
  2. On a lines pass too: /distill's candidate replaces its live file and the `HEAD` lines land in the Back Nine's lessons, inserted after `tags:`, each file keeping its own line ending, in one commit staged by path, after a message to the live Back Nine session.
  3. The docs state the measured numbers and that they are in-sample (R13).
  4. On a miss: the candidates are deleted, and the TODO records the numbers.
- **Test scenarios:**
  - The landed `SKILL.md` and `corpus.mjs` hash to the A2 or A3 hash in the results file.
  - The fills apply before the lines, so a Feud lesson that had no header gets one before its `applies_when` line has a `tags:` line to follow.
  - Applying the lines twice changes nothing the second time: a lesson whose header already has `applies_when` is skipped.
  - Each touched lesson's diff is confined to its frontmatter block: one added `applies_when` line, plus the fill where U4 has one.
  - Every touched lesson keeps its line ending (checked with node, not Git Bash's `grep $'\r'`).
  - The Back Nine's `verify:doc-stats` and its insights tests pass on the landed tree.
- **Verification:** the Back Nine's CI is green on the landing commit, read by full sha; one real brief in a fresh session shows the coverage line and the listing.

---

## Verification Contract

| Gate | Command or check | Applies to |
|---|---|---|
| corpus tests | `node --test projects/skills/distill-and-brief/brief/` | U2, U6 |
| no dollar-digit | `grep -n '\$[0-9]'` on every `SKILL*.md` touched | U1, U3, U7 |
| Back Nine lessons | `pnpm --dir projects/the-back-nine verify:doc-stats` and `pnpm --dir projects/the-back-nine test` | U7 |
| Back Nine CI | `verify-the-back-nine.yml` green on the landing commit, `gh run list --commit <full sha>` | U7 |
| line endings | node byte check per touched lesson | U7 |
| recipe hash | the landed bytes hash to the measured arm | U7 |
| the flow | the whole-file review (ultramode) of this folder's changes, then `/distill` | after U7 |

## Definition of Done

- The results file is committed with its verdict and recipe hashes.
- The verdict's outcome is applied: the measured bytes are live, or nothing is and the candidates are gone.
- No `SKILL.next.md`, `corpus.next.mjs` or abandoned harness code remains in the folder after U7.
- The docs say only what the results file shows.
- The playbook TODO's START HERE names what follows: the whole-file review and `/distill`, then, on a pass, the forward check and the Burned and Feud backfill.

## Sources

- Benchmark: `projects/skills/distill-and-brief/brief/results/recall-benchmark-2026-10-31.json` (workflow `wf_eb9c6c39-cab`).
- `projects/skills/distill-and-brief/brief/corpus.mjs` (frontmatter parse, `CAP`, `idList`); `projects/skills/distill-and-brief/brief/SKILL.md` steps 2-4.
- `projects/the-back-nine/scripts/verify-doc-stats.ts` (checks index links and four headings, never frontmatter); `.github/workflows/verify-the-back-nine.yml`.
- CE 3.34.0's `applies_when` (its packs guide and `learnings-researcher.md`).
- The Back Nine's insights 122 (a second copy rots) and 148 (measure on a frozen copy, land what was measured); the playbook's insights 003 (a verdict holds for the bytes that produced it), 008 (write "expected" until the evidence lands) and 009 (a step runs when START HERE names it).
