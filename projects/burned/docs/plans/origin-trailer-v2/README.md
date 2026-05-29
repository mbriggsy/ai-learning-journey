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
- **HUMAN-ON-SCREEN FORK RESOLVED (2026-05-29):** yes, the human is on
  screen — *our Briggsy*, the everyman data engineer, seen **from behind**
  (face never shows; recognized by the spiky blonde silhouette). Not Dash.
- **ANCHOR LOCKED (2026-05-29):** the character/style anchor is
  `videos/origin-trailer/src/assets/briggsy-anchor.png` — wide three-quarter
  rear establishing shot, warm lamp pool over a folding table (bourbon glass
  + scattered cards as lit foreground props), deep-teal midnight with bold
  Saul Bass background shards, Archer cel style. This frame's palette +
  light language is the template every beat visual is judged against.
  Pipeline: Imagen-4 generate (`scripts/trailer-briggsy-test.ts`) for the
  base, then **Nano Banana Pro surgical edits** (`scripts/trailer-briggsy-edit.ts`,
  takes a base filename arg) for targeted fixes. Versioned takes + a
  contact-sheet viewer land in the gitignored `temp/trailer/`.
- **NEXT ACTION — batch beat visuals.** Generate each beat's scene against
  the locked anchor + beat sheet, one beat at a time, replacing the
  `BeatPlaceholder` scenes. Remaining open forks: (1) **medium** — hybrid
  (Archer build + real gameplay at the payoff) vs all-motion-graphics
  [Claude leans hybrid]; (2) game-night footage, scale-cascade reuse,
  title-card timing. v1 production infra is in the `origin-trailer-v1` tag.

## Superseded v1 work (reference only — do not extend)

- `../origin-trailer/` — v1 phase plans (phase-0 … phase-7).
- `../../ideation/2026-05-15-origin-trailer-brainstorm.md` — v1 brainstorm.
- v1 locked beat sheet + production *infrastructure* (Remotion composite,
  voice pipeline, font/color/transition libs) — `videos/trailer/` was DELETED
  2026-05-29; recover from the `origin-trailer-v1` tag (`git checkout
  origin-trailer-v1 -- videos/trailer/<path>`). The infra is reusable; the v1
  *story and briefing-room concept* are not.
