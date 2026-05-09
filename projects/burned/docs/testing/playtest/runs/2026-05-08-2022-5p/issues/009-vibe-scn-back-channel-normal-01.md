# 009-vibe-scn-back-channel-normal-01 — Back Channel observer intercept-window lacks assessed dramatic weight (agent-polling artifact)

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Resolution:** Triage Option C accepted 2026-05-09. The `unsure` vibe-check was traced to a seat-agent-polling artifact (the agent sampled the intercept window mid-countdown and missed the full 10s arc) rather than a presentation gap. The Cluster B narration fix (commit closing #012, #008, #013, #014, #025, #028) incidentally adds the dramatic build-up the original `unsure` was probing for — if a real human playtest returns the same `unsure` on this specific moment, re-open with that signal.
**Seed kind:** vibe-check
**Source seats:** seat-2, seat-3
**Linked scenarios:** SCN-BACK-CHANNEL-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T00:39:52Z:*
> "The toast notification 'Seat1 played Back Channel' appeared alongside the Intercept button. The window closed before I acted. From the OTHER player perspective there was no drama build — just a brief opportunity that vanished. Can't judge fully since the window expired before I experienced the resolution beat."

> *Quoted from seat-2's suspicion log at 2026-05-09T00:40:05Z:*
> "The alert 'Seat1 played Back Channel' and the 'Intercept · 1s' button appeared simultaneously during a snapshot poll — by the time I read it and tried to act the window had elapsed. One second is genuinely tight for a human observer with phone latency. The beat appeared mechanically (toast + button) but the 1-second window gives it urgency. Can't fully assess cinematic quality because the window was too brief for observation."

Both seats rated `feltLikeArcher: unsure` on the SCN-BACK-CHANNEL-NORMAL-01 observer experience. Both reports share the same structural complaint: the intercept button appeared simultaneously with the toast (no anticipatory build-up), and the window had nearly expired by the time each seat's polling cycle caught it. Neither seat experienced what the full 10-second countdown feels like as a sustained dramatic beat. Notably, seat-2's own Back Channel play later in the session (as ACTOR) returned `feltLikeArcher: yes`, indicating the card's vocabulary and mechanic are sound — the `unsure` is specific to the observer intercept-window experience.

## God-mode reality

From `server/events.jsonl` lines 6–8:

- nowMs=1778287190267, stateVersion 6 — `card-played` (playerId: Seat1 / `e9a5ccd7`, cardType: `back-channel`). Nope window opened: remainingMs=10000, deadlineMs=1778287200267, chainDepth=0, generation=2.
- nowMs=1778287200274, stateVersion 7 — `nope-window-expired` (windowGeneration=2). No interceptors fired. Window ran the full 10,007ms (7ms clock drift, normal).
- nowMs=1778287200579, stateVersion 8 — `nope-grace-expired`. Back Channel resolved cleanly: `nope-window-resolved` (cancelled:false, chainDepth:0), `card-drawn` (Seat1 drew `go-dark` from bottom of pile, safe:true), `turn-started` for Seat2.

The server issued a full production-default 10-second nope window. Seat-2 reported "Intercept · 1s" when its polling cycle caught the window (~9 seconds elapsed); seat-3 reported "Intercept · 6s" (~4 seconds elapsed). The window expiration and Back Channel resolution are mechanically correct. The drama question is unanswered because both observers caught the window in its final seconds rather than its opening.

## Diagnosis

The `unsure` findings are partially an agent-polling artifact: both seat agents caught the Back Channel nope window late in its lifetime (seat-2 at ~1s remaining, seat-3 at ~6s remaining) rather than at opening. Because neither seat observed the full 10-second countdown, neither could assess whether the sustained intercept decision creates the Archer-tone dramatic tension the spec demands. This makes the vibe-check inconclusive rather than negative.

However, both seats independently surface the same structural product observation: the toast notification and intercept button appear simultaneously the instant the card is played, with no anticipatory beat before the window opens. For real human players, the dramatic arc of the observer intercept window depends on: (1) phone alerting them immediately at window open, and (2) experiencing the countdown as a sustained tension beat. The UI currently provides no "heads-up" signal before the window; the drama is entirely in the countdown itself. Whether 10 seconds of countdown — seen from the start — reads as Archer-tone spy standoff or functional popup cannot be determined from these observations.

The severity rubric places two-seat `unsure` clusters at the P2/P1 boundary ("≥2 other seats" for P1, which strictly means 3+ total). With 2 seats total, this is P2. The bias-up rule is noted but not applied here because the agent-polling artifact is a plausible alternative explanation — a targeted re-fire with early window observation is the cheaper resolution.

## Proposed fix paths

**Option A — Targeted re-fire with early window catch (effort: tiny / risk: low):** Instrument the next harness session to have a seat observer poll the intercept button at high frequency during Seat1's Back Channel play, catching the window at ≥7s remaining and experiencing the full countdown. If that re-fire returns `yes`, this closes as agent-artifact only. If it returns `unsure` or `no`, that is clean signal that the simultaneous toast+button display lacks Archer-tone build-up and Option B becomes the fix path. This costs one targeted scenario run.

**Option B — Pre-window anticipation beat (effort: medium / risk: low):** Add a 1–2 second "telegraphing" status-bar transition between card staging and nope window open — e.g., a brief status message like "Seat1 is going off-book..." before the intercept button appears. This creates the "beat before the beat" that separates dramatic anticipation from a notification popup. Tradeoff: applies to ALL nope-window cards (not just Back Channel), adds ~1–2s of perceived latency per play, and requires careful timing so it doesn't feel sluggish on fast-tempo turns. Medium effort because the status-bar key transition pattern is already built; the staging is the new territory.

**Option C — Accept as agent-artifact, document as LOW-SIGNAL (effort: tiny / risk: low):** The 10-second window is generous for a couch-play context; real human players watch their phones and catch the window at opening. Close this finding at P2 / LOW-SIGNAL and revisit only if an organic human playtest returns the same `unsure` on this specific moment. This suppresses a potentially real product signal but avoids premature UI work on an inconclusive observation.

## Recommended next step

Run Option A — a targeted re-fire catching the Back Channel nope window at ≥7s remaining — before investing in any pre-window UI changes; the agent-polling artifact must be ruled out before the `unsure` can be treated as a genuine product finding.

---

**Triage seed kind:** vibe-check
**Triage agent session:** 009-vibe-scn-back-channel-normal-01
