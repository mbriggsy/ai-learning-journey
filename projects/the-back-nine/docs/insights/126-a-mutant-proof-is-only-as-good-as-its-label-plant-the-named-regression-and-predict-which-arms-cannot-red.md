---
title: A mutant proof is only as good as its LABEL — the recorded "tier-keyed swap restored → 14 red" had planted a different, larger regression; plant exactly the regression you name and predict which arms CANNOT red before you run it
date: 2026-09-10
phase: Post-Act-4 (the gap to a friend betting real money) — the council build's adversarial review
modules: [e2e/vertical-fit.spec.ts, src/ui/styles/app.css, docs/council-log.md, TODO.md]
tags: [mutant-proof, mutation-testing, planted-fail, arm-topology, oracle-lens, record-truth, adversarial-review, gate-by-exit-code]
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

- Any "N tests red" claim in a commit message or register entry — refute it from the arm topology
  (which arms can see the change?) before trusting it.
- Vitest mutants planted in `copy.ts` vs a fixture (the copyGuard canary lesson): the plant's LOCATION
  decides which oracles can see it.
- CI summaries piped through `grep`/`tail` in a `&&` chain — `pipefail` or a captured `$?` on the
  gate itself, or the chain lies.
