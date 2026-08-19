---
title: The naive queue, replayed without a human, drafted five quarterbacks
date: 2026-08-19
phase: draft-prep
modules: [draft-kit/lineup_value.py, draft-kit/draft_engine.py, scripts/precompute_ladder.py, scripts/replay_mock.py]
tags: [queue, marginal-value, replay, insight-024, endgame, mock]
---

## Problem

The 2026-08-19 executor mock fired queue-top for eleven straight picks, exactly as doctrine
prescribed, and needed a human override for the last five to avoid a roster with empty starting
slots. Briggsy's ask afterward: *"how do we get the engine to recommend picks I wouldn't
override?"* The queue was board order — "how good is he" — when the question a pick answers is
"what does MY roster gain."

## What happened

**The correct math already existed in this repo, with its failure modes pinned.** Insight 024's
backtest had paid for marginal-lineup-value four times: greedy VORP-max drafted six straight
running backs; marginal value over an *empty* lineup degenerates to raw points and takes a QB
first overall. The surviving formulation — value over a lineup pre-filled at *replacement* —
was extracted from `backtest_board.py` into `draft-kit/lineup_value.py`, and the live engine and
ladder now share it with the backtest. The pinned-defect tests passing through the delegating
wrappers were the proof the extraction was faithful.

**The gate was a deterministic replay of the recorded mock**, other seats playing history, our
seat re-drafting per strategy — and it earned its keep three times before proving anything:

1. **Fidelity first**: the naive arm reproduced the real mock's first ten picks exactly. A
   counterfactual from a replay that cannot reproduce the factual is a broken simulator
   (insight 024's shape).
2. **The naive arm, unattended, finished with nine receivers and FIVE quarterbacks** — zero RB,
   zero K, zero DEF, 695.4 startable VORP with 345 stranded on the bench. The live mock's human
   overrides had been worth +73.5; doctrine alone was worse than anyone knew.
3. **The delta arm crashed on its first run** — the top-40 candidate window structurally excludes
   K/DEF (board rank 151+), so the endgame filter emptied the set. The same latent bug was in the
   engine. Found by running, not by reading (insight 028, again).
4. **Then it drafted DEF at pick #69** — mathematically indifferent (bench scores zero, DEF's
   flat +27 beats it) and humanly absurd. Fix: K/DEF are *deferred* until must-fill forces them,
   because their vorp is flat within a tier and cannot decay while bench upside does. Measured
   cost of deferral on this fixture: 13.0 VORP of DEF tier. Accepted — a DEF at #69 is an
   instant override, and overrides are the failure being engineered away.

Final replay: lineup-delta drafted a human-shaped roster — RB at 12, elite TE at 21, QB at 60,
bench receivers, K/DEF last — every mandated slot filled, **1087.2 startable VORP, +391.8 over
board order**.

## Lesson

**A ranking is an answer to one question, and a queue silently reuses it for a different one.**
The board ranks players in a vacuum; the queue spends picks against a roster. The two agree at
pick one and diverge the moment a slot saturates — and the divergence is computable, so paying a
human to bridge it every window was the bug, not the design.

**Look at what it drafted, every time the objective changes.** Both replay defects (the crash and
DEF-at-69) were invisible in the score and obvious in the pick log. Insight 024 said this; it was
re-proven within the hour of being re-read.

**The claim shipped is structural, not predictive.** One room with fixed opponents proves the
queue stops stranding VORP on benches and stops needing overrides. It does not prove wins —
twelve held-out seasons couldn't resolve that (insight 024), and one mock certainly cannot.
