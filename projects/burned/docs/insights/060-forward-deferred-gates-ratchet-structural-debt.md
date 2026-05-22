---
title: Forward-deferred gates across phases ratchet structural debt — each phase's "escalate to a later phase" branch sounds responsible while the later phase has no real path to satisfy it
date: 2026-05-22
phase: 2
modules: [docs/plans/origin-trailer/phase-0-gate-resolution.md, docs/plans/origin-trailer/phase-2-voice-pipeline.md, docs/plans/origin-trailer/phase-5-gameplay-capture.md, docs/plans/origin-trailer/phase-6-final-render-qa.md, docs/plans/origin-trailer/roadmap.md]
tags: [planning, multi-phase-debt, doc-review, hallucinated-references, premise-audit, kicking-the-can]
---

## Problem

Phase 2 Unit 2.7 closeout surfaced a doc-review amendment (R2) that locked an "N=2 minimum listener panel: Briggsy + Harry as outside reviewer." Briggsy clarified: Harry is AI (OpenClaw / Claude Code instance via Discord). The team is just Briggsy + Claude(s) forever — no multi-person human ear panel is structurally available.

Tracing the broken premise across all 8 origin-trailer plans revealed it was load-bearing in **five** places: Phase 0 R4 (N=6 MUSHRA panel), Phase 2 R2 (N=2 Briggsy + Harry), Phase 5 CALL F (Harry as R13 outside-eye), Phase 6 ADR #21 (N=6 decode panel + UMB v3 control + priors-elicitation + Discord recruitment), roadmap §5.2 (MUSHRA 6-8 listener protocol). 193 grep hits across the plans.

## Root Cause

Each phase plan, at deepening time, hit a quality gate it couldn't actually run, and added a "fallback to a later phase's gate" branch. The cascade:

- **Phase 0 EXIT** explicitly: *"MUSHRA listener count: 1 / 6 minimum — single-reader fallback; deferred to Phase 6 N=6 panel per ADR #21."*
- **Phase 2 R2** added its own N=2 panel + "escalate to N=6 if any Likert <5" — escalation target = Phase 6 N=6.
- **Phase 5 CALL F** added Harry as outside-eye + "if uncertain, defer to Phase 6 decode test" — escalation target = Phase 6 N=6.
- **Phase 6 ADR #21** locked N=6 + UMB control + priors elicitation + Discord recruitment — escalation target = "re-recruit Wave 2 from Briggsy's Discord network."

Phase 6 was the structural floor. Phase 6 had no actual recruitment path. The whole cascade was kicking the can six phases down the road to an unfilled bag.

Doc-review agents ratified the cascade because each phase's amendment in isolation looked architecturally responsible — it cited a downstream gate. None of them traced the cascade to its terminus and asked *"does Phase 6 actually have a recruitment path?"* Adjacent gap: Phase 2 R2 cited `user_harry.md` whose pre-2026-05-22 wording described Harry in human-collaborator terms ("communicates via Discord"). Doc-review took the memory at face value rather than reading the underlying load-bearing claim ("Briggsy can recruit Harry as a human listener"). Memory files are sources too — and sources can be wrong.

## Fix

- Memory `user_harry.md` rewritten to mark Harry as AI unambiguously + list the roles he cannot fill (human ear / eye / panelist / playtester).
- New memory `feedback-listener-panels-default-to-n1.md` codifying the architectural fact and the Claude-side escalation ladder (instrumentation → adversarial agent panels → eval suites — never reach for humans).
- All five plan sites amended with REPEALED / SUPERSEDED markers preserving the audit trail. ADR #21 → ADR #21r supersession with N=1 Briggsy cold-watch. ADR #13 (R4) → ADR #13r same shape. CALL F repealed. R2 reverted to N=1.
- Briggsy contamination as sole judge accepted as residual risk, mitigated by surviving defenses (24h cool-off, rubric floor, random-order watch, fluency gate, §2 Archer gate).

## Key Insight

**When a plan amendment introduces a fallback branch that points at a later phase's gate, the doc-review pass must trace the cascade to its terminus and ask whether the terminal phase actually has a path to satisfy the gate.** Architectural elegance ("we have a fallback") doesn't survive contact with an unfilled terminus.

Premise-audit discipline for multi-phase plans: list every "if X fails, escalate to Phase N" branch, then enumerate Phase N's escalation paths and check that at least one is operationally available given the actual team / budget / timeline. If the terminus is theoretical, every upstream gate that points at it is theatrical too.

Adjacent rule: **memory files are sources that can be wrong.** Insight 029 covers "downstream plans reference structured data that upstream only captured as prose." This is the meta-version: doc-review cited a memory file whose framing was the load-bearing falsehood. Generalizes `feedback-hallucinated-references` to memory citations.

## Also Applies To

- Any planning workflow where multiple phases share a quality-gate vocabulary and each phase adds its own variant. Tracing the cascade is harder than authoring it.
- Cross-phase contract changes after a Phase 0 EXIT that ships a "defer to Phase N" disposition — the disposition is sticky and ratchets through every subsequent deepening pass unless something forces a re-read.
- Any plan that proposes recruitment / sourcing / external dependencies the team has never actually executed before. The first plan to assume the resource is fine in isolation; the fourth plan to assume the same resource is now a structural premise that nobody is questioning.
- Doc-review agent prompts that cite memory or external research files — the citation is only as good as the source. When the source describes a person/team/process in shorthand, the shorthand can be load-bearing without the reviewer noticing.
