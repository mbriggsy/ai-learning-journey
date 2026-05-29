# Origin Trailer v2 — rebuild workspace

The v1 origin trailer was torn down: it was a feature-list briefing in
spy vocabulary with no human, no bet, and no earned payoff. This folder
holds the **clean-slate rebuild** so it never gets cross-wired with the
old work.

## What's here

- [`2026-05-24-origin-trailer-principles.md`](2026-05-24-origin-trailer-principles.md)
  — the bar. Decodes *why UMB's V3 origin trailer hit* and converts it
  into a 6-point acceptance test the new trailer must clear. **Read this
  first.** Everything downstream is judged against it.
- [`2026-05-24-trailer-structure.md`](2026-05-24-trailer-structure.md)
  — the spine. Story Circle compressed to 6 trailer beats.
- [`2026-05-24-origin-event-brainstorm.md`](2026-05-24-origin-event-brainstorm.md)
  — 6 origin-event engines + the **LOCKED engine decision (2026-05-28)**:
  a fusion (#4 open · #2 spine · #3 gut-punch tag). See its §DECISION.

## Current state

- **Direction locked:** origin story, not feature briefing. Reuse the
  *principle* of UMB's hit (true human-bet story, concrete images,
  escalation to an earned punchline, honest showcase, human cost as the
  heart). Do NOT remake UMB's surface.
- **Voice RESOLVED (2026-05-24):** Malory-CODED dry matriarch narrating
  from outside the fiction (fused — keeps spy DNA, drops the
  briefing-at-you frame). Reuses the tuned Eleanor "matriarch" voice
  asset. Narrator = named "Janet" (in-world matriarch, outside-observer). See
  principles doc §RESOLVED.
- **ENGINE LOCKED (2026-05-28):** fusion — **#4 Game Night** open (warm
  true cold-open, the laugh) · **#2 Two Weeks** spine (disbelief→awe, owns
  the middle) · **#3 Origin of Janet** gut-punch tag (*"…not a word came
  from his hand. Including mine."*). Full decision + the four tag
  non-negotiables in the brainstorm doc's §DECISION.
- **BEAT SHEET LOCKED (2026-05-28):** full VO script, 7 beats, ~119s —
  [`2026-05-28-beat-sheet-draft.md`](2026-05-28-beat-sheet-draft.md) (DRAFT
  v4). Numbers are canonical from the stats site (43K app LOC / 29K tests /
  62K planning / 1,326 tests), not ad-hoc git counts. Script reviewed +
  approved by Briggsy.
- **NEXT ACTION — visual direction.** Two forks to decide first (in the
  beat sheet's "Open questions"): (1) **medium** — hybrid (Archer-style
  build + real gameplay at the payoff) vs all-motion-graphics vs
  gameplay-forward [Claude leans hybrid]; (2) **is the human on screen** —
  silhouette / hands / a chair vs zero humans, Janet's VO carries it. Then
  the rest of the open questions (game-night footage, scale cascade reuse,
  title-card timing). v1 production infra is in the `origin-trailer-v1` tag.

## Superseded v1 work (reference only — do not extend)

- `../origin-trailer/` — v1 phase plans (phase-0 … phase-7).
- `../../ideation/2026-05-15-origin-trailer-brainstorm.md` — v1 brainstorm.
- v1 locked beat sheet + production *infrastructure* (Remotion composite,
  voice pipeline, font/color/transition libs) — `videos/trailer/` was DELETED
  2026-05-29; recover from the `origin-trailer-v1` tag (`git checkout
  origin-trailer-v1 -- videos/trailer/<path>`). The infra is reusable; the v1
  *story and briefing-room concept* are not.
