---
title: A mutant proof is only as good as its LABEL — the recorded "tier-keyed swap restored → 14 red" had planted a different, larger regression; plant exactly the regression you name and predict which arms CANNOT red before you run it
date: 2026-09-10
phase: Post-Act-4 (the gap to a friend betting real money) — the council build's adversarial review
modules: [e2e/vertical-fit.spec.ts, src/ui/styles/app.css, docs/council-log.md, TODO.md]
tags: [mutant-proof, mutation-testing, planted-fail, arm-topology, oracle-lens, record-truth, adversarial-review, gate-by-exit-code, equivalent-mutant, aimed-fuzz, kill-line, spy-leak, restoreAllMocks, afterEach, input-device, hit-testing, prediction-correction]
---

## Problem

The council build recorded four mutant proofs in its commit message. M1 read "the tier-keyed swap
restored → 14 red". The adversarial review's oracle lens refuted the NUMBER from the arm topology
alone: the four 20 px arms render the two-pane tier, and a regression that only darkens the in-frame
caveat BELOW 68rem cannot change anything those arms see — at most 10 of the 14 arms could red.
Three refuters confirmed. The same review found a sibling: a doc-stats run had been chained through
`| grep OK`, so a red gate returned exit 0 and a commit shipped red.

## Root Cause

What M1 actually planted was `.disclaimer--in-frame { display: none }` at EVERY width with the
trailing-hide removed — a bigger regression than the pre-council shape it claimed to restore (which
was `display:none` at base, `display:block` + the trailing hide inside the 68rem query). The bigger
plant reds more arms, so the count "proved" more than the label described. Nobody predicted the
kill set before running, so a count that exceeded the possible kill set raised no eyebrow. The
grep sibling is the same failure in miniature: the OUTPUT looked like the verdict, so the verdict
(the exit code) was never read.

## Fix

The true tier-keyed mutant was planted from `8f66dcfe^`'s exact rules and re-run: 13 red — the
phone arms, the 24 px arms, the reduced-motion arm — with the four 20 px two-pane arms and the two
computing arms green, exactly the predicted set. TODO's (c) block and the council-log row now
record both plants by what they were. Every gate in the pilot's shell chains is run by exit code
(`cmd > /dev/null; rc=$?`), never by grepping its output.

## Key Insight

A mutant is an experiment with a hypothesis: "this named regression reds exactly these arms and
none of the others." Write the predicted kill set down BEFORE running — the arms that CANNOT red
are the half of the prediction that catches a mislabeled plant, because a plant broader than its
label over-kills. A red count with no prediction proves only that something broke. The same
discipline for gates: a verdict is the exit code; anything that reads the output instead has
replaced the oracle with a grep of it.

## Also Applies To

- **A plan's WITNESS label (2026-10-21, the working-year tax floor's As-built decision 4).** The plan named `dip`'s
  I = $10,000 the "ordinary-wins" witness; its own hand derivation prices the PREFERENTIAL reading at $5,880 against the
  ordinary $5,380 (the conversion lifts the gain block past the $98,900 0 % edge). U1's and U3's expectations were false
  as written. A witness's name is a claim about which arm wins: derive the winning arm before naming it, and pin the
  name with the figure (the true ordinary-wins witness is B 150,000, I 80,000, X 34,000 → $7,888).
- Any "N tests red" claim in a commit message or register entry — refute it from the arm topology
  (which arms can see the change?) before trusting it.
- Vitest mutants planted in `copy.ts` vs a fixture (the copyGuard canary lesson): the plant's LOCATION
  decides which oracles can see it.
- CI summaries piped through `grep`/`tail` in a `&&` chain — `pipefail` or a captured `$?` on the
  gate itself, or the chain lies.

## Extended (2026-10-31) — "equivalent" is a verdict the DOMAIN gives, proven by an aimed fuzz

A surviving mutant labelled "equivalent" is the same kind of hypothesis. In A5 (b9-13) the producer's both-alive
`auxStart` survived planting (`spousalStart` → `ownStart`): in the FRA year a piece that began in an earlier year was
always claimed before FRA, so it is already priced early and its start never decides. The argument was right, and it
was still proven, not believed — 20,000 aimed households (2,735 paying a spousal excess in a working FRA year)
digested identically. The whole-file review (b9-9) ran the same test on its survivors: E22 and R14 proved equivalent
by aimed fuzz, and E31's claimed equivalence was REFUTED at the API — no money moved, but an output did, so its
contract was pinned. Aim the fuzz at the branch the argument says can never decide, and judge equivalence at every
output, not only the money.

## Extended (2026-10-31, the h2 gesture hold) — read the LINE each kill reds on against what the plant changed, and count the input device in the arm topology

The h2 cure's mutant pass (b9-1: 13 unit mutants, 5 of them also run against the e2e arms; `b9-h2-cure\PREDICTIONS.md`, `mutants-*-results.json`) wrote each kill set down before the run. Its runner keeps each failure's own first line, so a timeout can never pass as a kill. That came from the tests lens's find: a runner that keeps only the failing titles cannot tell a timeout from a kill. Reading those lines paid off twice.

- **A kill for the wrong reason is a finding.** Under M3 (the click release moved to the capture phase), H9 ("unmounting mid-hold leaves nothing listening") went red as predicted. But its line named the `pointerup` listener ("pointerup (capture true) is still listened"), and M3 changes only the `click` listener. A bisect found the cause. H2d, the phase test, goes red first under M3. Its failing `expect` threw before its own `add.mockRestore()`, so its spy was still wrapping `window.addEventListener` when H9 ran. A spy restored at the end of a test body leaks whenever that test fails, which is exactly when a mutant runs. Fix: `vi.restoreAllMocks()` in `afterEach`. On the re-run, H9 goes red on "click (capture true) is still listened". A count-only check (2 red) passes with the leak still in the file. (The results file on disk keeps the first run's `pointerup` line; the re-run is recorded in PREDICTIONS.md's Observed section.)
- **For an input-event mutant, which arms can go red depends on the device, and on whether the target MOVES or is DELETED.** v1 predicted that M2 (release at pointerup) would turn all six arms red. Before the run, the tests lens flagged the two mouse tall arms (confidence 50). Chromium hit-tests a mouse release once, so pointerup, mouseup and the click share a target. A label that only MOVED after pointerup still gets its click, so those arms likely stay green. Touch taps can go red, because their blur comes after the finger lifts. So can the Keep door on either device: it is DELETED, and React drops a click on a node it has let go of. Observed: exactly the two touch tall arms and both Keep arms. The same pre-run pass added K-panel to M6's predicted set, and that was observed too.

All 13 unit kill sets matched their predictions exactly, every kill on the test's own assertion. Predict the set, then read each kill's line against what the plant changed. A kill in the right test for the wrong reason means the harness, not the code, decided it.
