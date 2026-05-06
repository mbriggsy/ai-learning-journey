---
title: "Phase 5 §2.7 — first-time player protocol"
type: protocol
phase: 5
parent: docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md
date: 2026-05-06
status: ready (awaiting tester recruitment)
---

# First-time player protocol — the final quality gate

This is the Phase 5 §2.7 protocol packaged for use. It corresponds to
spec §8.7 — the binary yes/no acceptance test for the entire CSS
Foundation Rebuild.

The pass condition is a subjective reaction to visual quality. **It
cannot be automated.** It blocks on Briggsy recruiting a qualifying
first-time player.

## Pass condition (one sentence)

> *Did a tester who has never seen BURNED, but has seen Archer, react
> spontaneously as if BURNED were a commercial Archer product?*

Examples of passing reactions (one is enough, BEFORE the post-game
prompt):
- "Wait — did Archer and company release this?"
- "Is this a real Archer game?"
- "Where can I download this?"
- "This feels like a commercial app."
- "This looks like Archer." *(spontaneous, unprompted)*
- "Is this official?"
- "Holy shit, this is slick." *(unambiguously about the look)*

Failing reactions (all polite-hobbyist):
- "Cool, you built this?"
- "Haha nice."
- "It works!"
- No unprompted Archer / quality reference at all.

Ambiguous (retry with second tester): one passing reaction mixed with
several hedging ones. Run a second session before deciding.

---

## §1 — Recruitment criteria

**Qualifying tester:**
- Never seen BURNED play through (not even over Briggsy's shoulder).
- Never read BURNED code or docs.
- Has seen at least one episode of Archer.
- Willing to play 15–30 min with minimal coaching.
- NOT a senior UX designer or motion engineer (they over-analyze).

**Disqualifying:**
- Has played the physical Exploding Kittens game (frames reactions as
  "EK reskinned", missing the Archer signal).
- Has been pulled into BURNED development discussions before (family
  members who saw screenshots count, unless only on a pre-rebuild build).

**Source pool:** Briggsy's friends / family / gaming acquaintances.
Casual gamer or non-gamer is ideal — the test is presentation, not
mechanics.

---

## §2 — Pre-session checklist

Before the tester arrives, confirm the build has cleared all earlier
Phase 5 gates. If any are open, this session does not count for §8.7
even if the tester reacts positively (Phase 5 says §2.7 fails on a
build that hasn't cleared prior gates).

- [ ] §2.1 iOS 26 device protocol — passed (or fallback in place)
- [ ] §2.2 Playwright visual regression — baselines committed
- [ ] §2.3 200% browser zoom — passed (canonical human-run pass)
- [ ] §2.4 CVD palette — passing (acknowledging
      `phase-5-cvd-followup.md` ratchets if still open)
- [ ] §2.5 contrast — passing (same followup applies)
- [ ] §2.6 full game loop — protocol run, no surfaced bugs
- [ ] Build deployed to a stable URL (Cloudflare Pages staging is fine —
      doesn't need prod)

---

## §3 — Setup

1. **TV / shared screen** — board view at 1920×1080 minimum. Briggsy's
   home setup.
2. **4 phones on the coffee table** — one for the tester + 3 for
   Briggsy / additional players (3v1 minimum game; 4v1 better).
3. **Briggsy's role** — play as one of the players. Answer mechanical
   questions (*"how does Favor work?"*) but **NEVER** prompt reactions
   (*"don't you think this looks great?"*). The test is about
   unprompted reactions.
4. **Recording** (with tester's verbal consent only) — phone camera
   pointing at TV + tester's phone. Save to
   `test/first-player/evidence/<YYYY-MM-DD>.mov`. Video is gitignored
   (privacy + size); only the notes below are committed.

---

## §4 — Observation template

Briggsy (or a designated note-taker) records VERBATIM quotes at each
of these eight moments. Verbatim is critical — the test is about the
exact words the tester chose, not Briggsy's interpretation. Use
blockquote (`> `) format to preserve the raw data; interpretation
notes go after the quote in plain text.

For each session, copy this template into a `## Session <YYYY-MM-DD>`
heading at the bottom of this file and fill in.

```markdown
## Session YYYY-MM-DD

**Tester pseudonym:** (e.g., T1, or first-name initial only)
**Archer familiarity:** (light / regular / superfan)
**Game format:** (4-player / 5-player / etc.)
**Total duration:** (minutes)

### 1. First-screen reaction (board view on TV)
> "..."

(Briggsy's interpretation note here, plain text.)

### 2. First phone interaction (player URL on phone)
> "..."

### 3. First card draw
> "..."

### 4. First DramaOverlay they trigger
> "..."

### 5. Eliminated reaction (only if they get burned)
> "..."

### 6. Mid-game mechanical questions
- "..."
- "..."

### 7. End-of-game reaction (GameOver renders)
> "..."

### 8. Post-game prompt: "What did you think?"
> "..."

### Verdict
- [ ] PASS — passing reaction reached BEFORE the post-game prompt
- [ ] FAIL — only polite-hobbyist register, no Archer signal
- [ ] AMBIGUOUS — mixed signals, retry with different tester

### Specific quote that drove the verdict
> "..."

### Recording (if any)
`test/first-player/evidence/YYYY-MM-DD.mov`
```

---

## §5 — On FAIL

Per spec §8.7: *"If we fail this test, we fix the visuals and retest.
No exceptions."*

1. Re-read the session notes. Identify what specifically failed:
   palette? motion? typography? layout? copy?
2. If the failure points at a specific subsystem (e.g., *"the
   DramaOverlay didn't feel cinematic"*), re-open the owning phase
   file (Phase 3 for board, Phase 4 for motion) and amend.
3. If the failure is diffuse (*"it just feels flat"*) the issue is
   probably the palette or the typography — the two highest-signal
   visual layers. Re-open Phase 1.
4. Land the fix as a Phase 5 amendment commit. Re-run §2.2 Playwright
   matrix to re-baseline. Re-run §2.7 with a **different** first-time
   player (the same tester has contaminated signal after seeing the
   failed version).
5. No retry limit, BUT: if retries exceed 3 attempts, Phase 5 stops
   and Briggsy + Claude do a root-cause session to find the systematic
   issue. Root causes at that scale are usually palette / motion /
   copy-voice mismatch — not surface fixes.

---

## §6 — Acceptance thresholds

- [ ] Briggsy recruits at least one qualifying first-time player.
- [ ] Session runs end-to-end.
- [ ] Session notes appended to this file under `## Session <date>`.
- [ ] At least one session reaches PASS per §4 verdict.
- [ ] If FAIL, retries documented in successive `## Session` blocks.

**Phase 5 §2.8 documentation pass depends on §2.7 PASS.** The spec §8
checkboxes only flip after the first-time player session passes.

---

## Sessions

*(append `## Session <YYYY-MM-DD>` blocks below as sessions run)*
