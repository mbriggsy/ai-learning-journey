---
title: "Origin Trailer — Phase 7: Distribution"
type: feat
phase: 7
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
deepening_pass:
  agents: 10 CE personas (best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens / emil-design-eng / frontend-design) + /brief
  synthesis: sequential-thinking (10 thoughts; 5 high-stakes claims verified against source)
  amendments_absorbed: ~50 (12 multi-agent TIER 1 + 22 single-source TIER 2 + 8 structural cuts + 8 cross-phase)
  growth: 1052 → ~target lines (~1.85x)
  new_adrs: 6 (roadmap §4 #24/#25/#26/#27/#28/#29)
  new_units: 4 (7.0 stat-verify + 7.1b release-provisioning + 7.6 pre-post-verify + 7.7 pin-lifecycle)
  consolidated_units: 1 (7.5 metrics folds into 7.4)
reviewed: 2026-05-17
review_pass:
  agents: 7 CE personas (coherence / feasibility / product-lens / design-lens / security-lens / scope-guardian / adversarial-document-reviewer)
  synthesis: sequential-thinking (3 thoughts; 5 load-bearing source claims re-verified — Phase 1 line 1086 narration / Phase 6 lines 1232-1240 thumbnail rule / Phase 6 line 2126-2127 cutdown contract / Phase 6 Unit 6.2 thumbnail derivative / ffmpeg flag against installed binary)
  raw_findings: ~48 (coherence 5 / feasibility 5 / product-lens 10 / design-lens 5 / security-lens 6 / scope-guardian 7 / adversarial 10)
  unique_absorbed: ~38 after dedup (3 P0 / 8 P1 / 20 P2 / 7 P3)
  strategic_calls: 8 (CALL-1 caption audience-fit + Variation A-alt / CALL-2 pin lifecycle collapse / CALL-3 cutdown frame-0 audience-aware option ranking / CALL-4 README hero trade-off explicit / CALL-5 cut "...Phrasing." per Sterling-CODED / CALL-6 decouple character-cap from audience-fit / CALL-7 D+30 metrics method-signals-first + falsification test / CALL-8 minimum-viable-distribution section)
  growth: 2539 → ~target lines
status: active
---

# Phase 7 — Distribution

## TL;DR

Phase 7 takes the Phase 6 final deliverables (`out/trailer.mp4` +
`out/thumbnail.png`) and the Phase 6 Unit 6.8 handoff artifacts
(`PHASE-6-EXIT.md` + `cutdown-frame-list.md` + Briggsy sign-off
sentinels) and ships the trailer: an X-native cutdown selected from
Phase 6's recommended options, a portfolio embed using GitHub's
user-attachments inline-video mechanism, a 3-beat burst post sequence
within the first 24h algo window, and a pin-lifecycle sentinel that
prevents stale-pin failure modes.

Phase 7 does NOT invent cutdown frame ranges; that contract belongs
to Phase 6 Unit 6.8. Phase 7 does NOT hand-type stat claims in
captions; a Unit 7.0 verifier script derives every number from the
codebase. Phase 7 is the **first documented distribution pass** for
any agentic-SDLC project under Briggsy's portfolio (UMB v3 has no
post-mortem); the patterns Phase 7 produces propagate forward to the
next project, not inherit backward.

**Key pre-deepening contradictions resolved** (multi-agent
convergence):

- `CRF 17 / -preset slow` → `CRF 18 / --x264-preset slow` per ADR #19.
- `aac 128k` stereo → `aac 128k mono` (`-ac 1`) per ADR #14.
- "Cross-dissolve (R3 bridge)" — feature does not exist in the locked
  composition (ADR #4-rev hard cuts; Phase 1 Unit 1.4 explicit lock).
- Hardcoded START_FRAME=1860 / DURATION_FRAMES=360 ignoring Phase 6
  Unit 6.8 cutdown-frame-list.md contract.
- 500ms fade-out at cutdown end violates Phase 1 Archer transition
  vocabulary lock → hard cut closure per **new ADR #24**.
- Frame 0 of cutdown lands on a transition-completion frame (ticker
  brightening ease completes at 1860 per Phase 1 line 1325) → shift
  to composed-not-mid-motion frame per **new ADR #25**.
- Variation A caption "7 operatives" hallucination — codebase ships
  6 (5 named + Agent X wild); Phase 1 trailer narration (line 1086
  locked) says "six in the deck, one on the research budget." (The
  pre-doc-review "in the basement" phrasing was Phase 1 fiction —
  see Phase 1 lines 1100-1113 source-fix; ActRoster.tsx:153-158 is
  canonical: Otto is "busy with the research budget".) →
  stat-verification gate **new ADR #26**.
- "Approximately 14,000 pages of forensic dossiers" fabricated stat
  (Phase 1 line 1584 explicitly flags as unverified) → cut.
- 24h quote-tweet for Post 2 breaks algorithmic momentum window → 3-
  beat burst at T+0 / T+90min / T+2-3h via self-reply thread per **new
  ADR #27**.
- Roadmap §5.4 bitrate "5–8 Mbps" understates 2026 X reality; target
  8–12 Mbps per **new ADR #28**.
- GitHub README `[![thumb](png)](release.mp4)` markdown-image-link
  does NOT produce inline video player (GitHub sanitizer strips
  `<video>` HTML; image-link wrap of MP4 URL renders as clickable
  thumbnail to download, not inline player). Drag-drop user-
  attachments URL is the only inline mechanism per **new ADR #29**.
- Cloudflare Pages "Option II" fallback hosting has a **25 MiB asset
  cap** — 95s trailer at production encoding is 60–95 MB; option
  structurally broken → cut.
- Thumbnail default — pre-doc-review Phase 7 cited "Phase 6 line
  2253" lock as `default 2790 / fallback 180 / 1950 last-resort`,
  but line 2253 is a mobile-crop-audit table row, not the selection
  rule. Phase 6 Unit 6.2 Step 3 **lines 1232-1240** are the canonical
  rule: **1950 PRIMARY (R3 stacked-payoff stamp) / 1860 second
  (cascade peak pre-stamp) / 1425 third (S04 stat 2 + halo) / 2790
  last-resort (logo closure — kept as fallback because it extracts
  cleanly)**. Mid-process feed-stoppers preferred over logo-closure
  per Phase 6 Adversarial Attack 14 + Product-lens F3 (logo-on-desk
  is what engineering Twitter scrolls past). Phase 7 inherits Phase
  6's actual lock; pre-doc-review citation corrected throughout.

---

## Phase 7 Entry Gate

Phase 7 does NOT begin until all of the following are present and
green. Locked per ADR #22 sign-off ceremony (formalized 2026-05-17
during Phase 6 deepening).

### Required artifacts

- `videos/trailer/sample-eval/final-render-qa/PHASE-6-EXIT.md` —
  Phase 6 hand-off document with GO verdict.
- `videos/trailer/sample-eval/final-render-qa/cutdown-frame-list.md`
  — Phase 7 source-of-truth for cutdown frame ranges (Phase 6 Unit
  6.8 contract). Phase 7 picks from the documented Options A/B/C;
  Phase 7 does NOT invent a 4th option.
- `videos/trailer/out/trailer.mp4` — Phase 6 final at H.264 / CRF 18
  / `--x264-preset slow` / yuv420p / 30fps 1920×1080 / AAC 128k mono
  / -16 LUFS / +faststart.
- `videos/trailer/out/thumbnail.png` — Phase 6 thumbnail at
  **frame 1950 PRIMARY** (R3 stacked-payoff stamp + Dash reveal) per
  Phase 6 Unit 6.2 Step 3 lines 1232-1240 selection rule; fallbacks
  1860 / 1425 / 2790 last-resort. Phase 7 does NOT override; if the
  PRIMARY candidate fails composed-not-mid-motion, Phase 6 walks the
  precedence ladder.
- `docs/trailer/thumbnail.jpg` — Phase 6 README derivative
  (1200×675 JPEG q85, <100 KB; **cross-phase amendment to Phase 6**
  — see §Cross-Phase Amendments below).

### Required sign-off sentinels (git-author-checked per ADR #22)

- `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.4.signoff`
  — Phase 6 bar-raise acceptance.
- `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.7.signoff`
  — Phase 6 final QA + hand-off.

### Required Phase 6 QA verdicts (per PHASE-6-EXIT.md)

- §2 frame-pass rate ≥8/10 (PASS).
- Bar-raise: axis 3 cleared AND ≥1 of axes 1/2 cleared per ADR #21
  raised threshold (PASS).
- A/V sync per ADR #20 asymmetric tolerance (PASS).
- Mobile crop 1:1 + 9:16 per ADR #23 (PASS / NEEDS-RECOMPOSE per
  scene; 9:16 verdict consumed by Phase 7 Unit 7.1 Step 6 conditional
  branch).
- Decode test N=6 per ADR #21 (PASS, ≥3/6 surfaced autonomy hook).
- R13 gameplay PASS.

### Required Phase 7 entry conditions (not in Phase 6 scope)

- **Briggsy X account state** recorded: Premium / Premium Plus / free.
  This is a Phase 7-local entry condition (NOT a Phase 0 amendment);
  account state affects 4 Phase 7 decisions (caption character cap,
  link-demotion severity, post-character-extended variant unlock,
  algorithmic boost). Record in `videos/trailer/distribution/account-state.md`
  before Unit 7.3 caption drafting.
- **Briggsy GitHub plan state** recorded in the same file: Free /
  Pro / Team / Enterprise. Plan state gates the Unit 7.2 README
  inline-embed mechanism — Free has a 10 MiB user-attachments cap;
  Pro/paid lifts the cap to 100 MiB. ADR #29 attachment caps drive
  whether the cutdown can drag-drop inline (Pro/paid) or must use
  the option (c) re-encode / option (d) clickable-thumbnail fallback
  (Free). Per adversarial-document-reviewer A8 (Phase 7 doc-review
  2026-05-17): pre-doc-review plan implicitly assumed paid GitHub.
- **Repo-publicity check** recorded inline: `mbriggsy/burned` is
  public/private/internal. Phase 7 commits `.signoff` sentinels +
  `account-state.md` to git history; if the repo is public, those
  files surface `briggsy007@gmail.com` git-author identity + X-tier
  + GitHub-plan-tier together (per security-lens S5). Public repo →
  add `account-state.md` to `.gitignore` and reference the decision
  inline in `x-post.md` without exposing tiers. Private repo →
  commit as-is.

### Entry gate enforcement

`pnpm verify:phase-7-entry` — **light script Phase 7 Unit 7.0 Step 0
creates** (per scope-guardian SG1 — pre-doc-review plan invoked the
script but never assigned its creation to any unit). Wraps the
existing `pnpm verify:briggsy-sentinels` script (also Phase 7-era;
see Unit 7.0 Step 0 for creation contract) + presence checks for the
artifacts above + parse of PHASE-6-EXIT.md verdict-summary fields.
Phase 7 Unit 7.0 does not start until this returns GREEN.

If any artifact is missing or any verdict is FAIL: STOP. Re-open
Phase 6 for the responsible Unit; do not proceed.

**Note on script-existence at execution time** (per adversarial A4
residual risk + scope-guardian SG1): Phase 7 assumes
`pnpm verify:briggsy-sentinels` is also Phase 7-era. Pre-doc-review
plan body cited it as "existing" but `package.json` shipped only
`verify:bundle` at Phase 7 drafting time. Unit 7.0 Step 0 creates
BOTH scripts + wires the `package.json` `scripts` entries; the entry
gate runs after Step 0 completes, not before.

---

## Overview

Phase 7 produces:

- `videos/trailer/out/trailer-x-cutdown.mp4` — X-native cutdown
  selected from Phase 6 Unit 6.8 Options (12–15s per roadmap §5.4;
  source-frame ranges per Phase 6, NOT invented in Phase 7).
- `videos/trailer/out/trailer-x-cutdown-9-16.mp4` — **CONDITIONAL** on
  Phase 6 Unit 6.8 9:16 verdict GO; vertical-feed cutdown at
  607×1080 center-extracted then scaled to 1080×1920. Skip if Phase 6
  verdict is NO-GO for the selected Option.
- `videos/trailer/distribution/account-state.md` — Briggsy X account
  status (Premium / Premium Plus / free) recorded at entry gate.
- `videos/trailer/distribution/verified-stats.json` — Unit 7.0
  output; canonical numeric/roster claims derived from codebase.
- `videos/trailer/distribution/release-urls.json` — Unit 7.1b output;
  GitHub Release asset CDN URLs captured before any README write.
- `videos/trailer/distribution/x-post.md` — Post 1 (flagship) + Post
  2 (cutdown self-reply at T+90min) + Post 2b (tooling-stack self-
  reply at T+2-3h) + Post 3 (pinned) copy with verified stats.
- `videos/trailer/distribution/portfolio-embed.md` — README embed
  procedure via GitHub user-attachments drag-drop mechanism (NOT
  markdown image-link to Release asset; NOT HTML `<video>` tag —
  both fail per ADR #29).
- `videos/trailer/distribution/post-calendar.md` — 3-beat burst
  calendar (D+0 T+0 / T+90min / T+2-3h) + D+7 pin + D+30 retrospective.
  Folds the pre-deepening Unit 7.5 metrics tracking into a single
  calendar+log file per scope-guardian.
- `videos/trailer/distribution/caption-rendering-verification.png` —
  screenshot of locked caption pasted into X composer per emil's
  rendering-trap check (autoformat of `...` → `…` and em-dash → hyphen
  on clipboard round-trip).
- `videos/trailer/distribution/pin-lifecycle.md` — Unit 7.7 sentinel
  protocol; OR-of-explicit-events replace trigger.
- `videos/trailer/sample-eval/distribution/cutdown-eval.md` —
  cutdown standalone §2 audit + AV-sync verification + watch-test
  verdict.

Phase 7 exits when:
1. X-native cutdown rendered + atomic-swap verified at Unit 7.6 spec.
2. (Conditional) 9:16 cutdown rendered if Phase 6 verdict GO **AND
   recorded as YES in cutdown-eval.md**; OR `cutdown-eval.md` block
   documents `9:16 render produced: NO` with explicit skip reason
   (NEEDS-RECOMPOSE / NOGO / not-attempted). Unit 7.6 verifies the
   block is populated either way (per coherence C3 — pre-doc-review
   verify gate could green-light without checking the 9:16 decision).
3. Verified-stats.json captures the canonical numbers used in all
   distribution copy.
4. All distribution-surface copy written; the github.com web-editor
   drag-drop step (Briggsy execution) has run AND the live
   user-attachments URL has been captured back into `release-urls.json`
   as `user_attachments_cutdown_url` (per adversarial A3 — without
   the capture step, regenerating the README from any source-of-truth
   template loses the UUID). Local `portfolio-embed.md` updated to
   show the captured URL (no `<UUID-cutdown>` placeholders survive
   into committed artifacts).
5. Pre-post `pnpm verify:cutdown-ready` returns GREEN within 60min
   of D+0 T+0. The terminal gate ALSO invokes
   `pnpm verify:briggsy-sentinels` as a subprocess (per security-lens
   S6 — pre-doc-review separation allowed a green verify with the
   git-author check skipped).
6. Briggsy posts according to the 3-beat burst calendar OR schedules
   via X scheduling.
7. `pin-lifecycle.md` sentinel **document committed at D+0** documenting
   the OR-of-explicit-events replacement triggers per Unit 7.7. (Pin
   *action* itself happens at D+0 evening per CALL-2 — see Unit 7.4
   calendar; this exit condition is about the document, not the
   action.) Per coherence C2 — pre-doc-review wording conflated
   document commit with pin action.

---

## Problem Frame

Per brainstorm Dependencies / Assumptions:
> *"Distribution surface: Primary surface is presumed to be Briggsy's
> Twitter/X timeline + portfolio embed, both desktop-landscape-dominant
> in the engineering-peer audience watch context."*

Per roadmap §5.4 (corrected during Phase 7 deepening — see ADR #28):
> *"Runtime sweet spot for portfolio trailers: 60–90s. BURNED's
> 90–100s envelope is at the top end. Acceptable. For X-native
> in-feed cutdown: 7–15s. Phase 7 ships a flagship 95s + a 12s
> X-native cutdown. Bitrate target 8–12 Mbps for 1080p (NOT 5–8
> Mbps — that figure under-shoots 2026 X re-encode survival
> targets)."*

The flagship 95s lives at the portfolio (GitHub README via user-
attachments inline player) + as the primary X post (Post 1
attachment). The cutdown lives in Post 2 (self-reply at T+90min)
and any future teaser context.

The audience is engineering peers. Engineering-Twitter watch
behavior (per best-practices 2026 research; cross-validated against
Replit Agent 3/4, Cursor 0.50/3, Anthropic Code-with-Claude launch
patterns):

- Scroll-stops if the autoplay-entry frame (cutdown frame 0; Post 1
  thumbnail) visually surprises in the first 1–3 seconds.
- Watches 7–15s clips through (cutdown sweet spot).
- Clicks through to longer if the cutdown hooks.
- Reads attached text / quoted-tweet thread.
- **The first 30–60 minutes are the algorithmic momentum window;**
  50–70% of total impressions land in this window. Self-reply
  threading INHERITS this window. Quote-tweet RESTARTS distribution.
  Spaced posts (24h+ gap) lose the window entirely.

Phase 7's 3-beat burst sequence (locked per ADR #27):
1. **T+0 (Tue/Wed 10am ET)**: Post 1 flagship — 95s trailer via
   user-attachments inline player + verified-stats caption.
2. **T+90min**: Post 2 self-reply — 12s cutdown + brief "highlight
   reel" framing.
3. **T+2-3h**: Post 2b self-reply — tooling-stack thread (Cloudflare
   Workers Durable Objects, React 19, Framer Motion, Remotion 4.0,
   Imagen 4, Claude Code) WITHOUT R15 signal repeats (R15 chrome
   already carries that inside the trailer per chyron-is-the-joke
   rule).
4. **D+7**: Pin Post 1.
5. **D+0 mid-day**: Update GitHub README via drag-drop user-
   attachments inline player + brief context paragraph; share to
   Discord (Briggsy's call which channels).
6. **D+180 OR new-project ship**: Replace pinned per Unit 7.7
   sentinel.

The risks Phase 7 manages (revised per agent reviews):

- **Cutdown source-of-truth contract violation**: Phase 7 must
  consume Phase 6 Unit 6.8 cutdown-frame-list.md Options A/B/C; not
  invent frame ranges. (Pre-deepening Phase 7 invented its own
  Candidate B at frames 1860–2220 which doesn't match any Phase 6
  Option.)
- **Cutdown frame-0 lands on a mid-motion transition state**:
  START_FRAME=1860 sits on the ticker-brightening-ease completion
  frame per Phase 1 line 1325. Shift forward per ADR #25 composed-
  not-mid-motion rule.
- **Stat hallucination in captions**: "7 operatives" / "14,000 pages"
  fail fact-check; trailer becomes the LinkedIn-coded over-claim
  the spec explicitly forbids. Unit 7.0 stat-verification gate
  closes this.
- **Algorithmic post-sequence anti-pattern**: 24h quote-tweet
  defeats the algo window. ADR #27 corrects to 3-beat burst self-
  reply.
- **GitHub README embed mechanism wrong**: markdown image-link to
  Release MP4 does NOT inline-play. ADR #29 locks drag-drop user-
  attachments.
- **Cloudflare Pages 25 MiB cap** would silently break the Option II
  fallback if anyone trusted it. Cut from plan.
- **Placeholder URL window**: README committed with `<user>/<repo>/<tag>`
  placeholders 404s until Release published. Unit 7.1b automates
  Release-then-write ordering.
- **Stale pin after future project ships**: Unit 7.7 sentinel.
- **AV-sync at cutdown seek-in point**: Phase 5 canonical `-ss
  AFTER -i` pattern eliminates the audio-packet boundary drift that
  threatens ADR #20 R3 audio-must-not-lead rule.
- **Wrong-frame thumbnail**: Phase 6 Unit 6.2 Step 3 lines 1232-1240
  lock frame **1950 PRIMARY** (R3 stamp + Dash reveal — mid-process
  feed-stopper) with 1860 / 1425 / 2790 fallback ladder; Phase 7
  inherits the ladder, does not override. Mid-process moments stop
  scrolls; logo-closure scrolls past (per Phase 6 Adversarial Attack
  14 + Product-lens F3).
- **Network failure at post time**: Unit 7.6 pre-post verify gate.
- **No UMB v3 distribution baseline**: brief confirmed `projects/
  undercover-mob-boss/docs/` has no `insights/`, no launch
  post-mortem, no metrics log. Phase 7's "second proof point"
  framing leans on undocumented audience memory — captured as a risk
  row, with Variation C (engineering-mystique, no UMB reference) as
  the soft fallback.

---

## Critical Constraints (research-surfaced; deepening-corrected)

### X / Twitter 2026 video specs

Per roadmap §5.4 (cross-validated 2026 by best-practices via
aggregator sources — wavespeed.ai, sproutsocial 2026, postful.ai,
contentgrip, mashable 2026 — primary X help docs Cloudflare-gated):

- Container: MP4 / MOV
- Codec: H.264 High profile
- Audio: AAC-LC 128 kbps **mono** (`-ac 1` per ADR #14)
- Frame rate: 30 fps recommended (60 supported; we lock 30 per
  composition)
- **Bitrate VBR average: 8–12 Mbps for 1080p** (ADR #28 lock;
  supersedes pre-deepening 5–8 Mbps figure; X re-encodes regardless;
  goal is survival of re-encode with minimal degradation, not
  artificial cap-under-shoot)
- Hard cap on bitrate at upload: 25 Mbps platform ceiling
- Non-premium length cap: 2:20 (flagship 95s clears trivially)
- Non-premium file size cap: 512 MB (flagship ~150–250 MB at CRF 18;
  cutdown ~25–40 MB; both clear trivially)
- Premium Plus length cap: 4 hours
- Premium character cap on captions: ~25,000 (free tier: 280)

### X 2026 surface map (relevant to Phase 7)

- **In-feed timeline** (primary): 16:9 landscape autoplay-muted.
  Cutdown's first frame is the scroll-stop image.
- **9:16 Immersive Media Viewer** (secondary; activated 2026 per
  mashable / contentgrip 2026): dedicated vertical-feed tab; engineering-
  portfolio video that fails 9:16 loses this surface. Cutdown can
  ship a separate 9:16 render IF Phase 6 Unit 6.8 9:16 verdict GO.
- **Mobile in-feed preview crop**: 1.91:1 → 1920×1005 at 1920 wide
  (NOT 1920×1006 per ADR #23 math fix); central 1:1 safe square at
  1080×1080 is the conservative crop rule (locked roadmap §5.3 + ADR
  #23). Cutdown frame 0 must clear 1:1 safe-square.

### Link-demotion regime (X 2026)

Confirmed across multiple 2026 aggregator sources (best-practices
research): X heavily penalizes posts containing external links,
especially for non-Premium accounts. Since March 2025, link posts
from regular accounts have seen near-zero engagement.

**Phase 7 implication**: GitHub README link, portfolio link, UMB v3
link must NOT appear in Post 1 (or even Post 2). If links are
shared, they go in Post 3 of the thread (the tooling-stack reply)
OR as a bio link. Post 1 carries the video natively (user-attachment
inline player on README; Post 1 attaches the MP4 directly to X).

### AI-content disclosure (X 2026)

X's "Made with AI" toggle is in test phase as of May 2026; mandatory
disclosure applies to AI-generated adult content + AI armed-conflict
videos. Trailer for a benign party game does NOT require disclosure
under current policy. Briggsy's call whether to flag honestly (low
downside; possible transparency-seeker upside). NOT a Phase 7 entry
gate.

### Account-state implications (Briggsy)

Premium status affects 4 load-bearing decisions:

- **Caption character cap** (280 vs ~25k): unlocks Variation D
  (extended) if Premium.
- **Link-demotion severity**: non-Premium near-zero on link posts.
- **Algorithmic boost**: Premium accounts get modest algorithmic
  preference 2026.
- **Length cap**: 2:20 vs 4 hours (flagship 95s clears either way;
  hypothetical extended trailer concerns moot).

Phase 7 entry gate records Briggsy's state. Phase 7 caption lock
adapts: non-Premium → Variation A or C (cold-read self-contained);
Premium → Variation A or D unlocked.

### Engineering-Twitter watch behavior

Per roadmap §5.4 "Alive" patterns:
- Working product in motion in second 1.
- UI speaks.
- Text overlays carry narrative (autoplay muted).

Reference posts (best-practices verified 2026):
- Replit Agent 3 + 4 launch reels — real-time screen recording,
  no narration, captions only.
- Cursor 0.50 + 3 launches — screen-recorded multi-file refactor,
  ambient sound, visible code touching files.
- Anthropic Code-with-Claude launch — multi-stage launch with deep-
  dive thread beats.
- **Pattern: concentrated burst within first 24h algo window**
  (NOT 24h-spaced posts); multi-beat self-reply thread.

BURNED partially diverges from screen-recording-of-code (sustained
Dash VO; finished-game-not-build emphasis). Divergence intentional —
the trailer sells the *result*. The cutdown leans closer to the
engineering-Twitter pattern: real BURNED gameplay + R15 chrome stamps
prominent.

### Cutdown source range — Phase 6 Unit 6.8 contract

Phase 7 reads `videos/trailer/sample-eval/final-render-qa/cutdown-
frame-list.md` and picks one of the documented Options:

- **Option A** — Pure hook (12s): frames 0–150 (cold-open + R14) +
  frames 1880–2000 (stacked payoff) + frames 2790–2850 (closer).
  Preserves R14 + R3 + closer chrome. NO gameplay R13.
- **Option B** — Hook + game (15s): frames 0–150 (cold-open + R14) +
  frames 2235–2520 (gameplay representative segment) + frames
  2790–2850 (closer). Preserves R14 + R13 + closer chrome. NO R3
  stacked payoff.
- **Option C** — Maximum density (15s): frames 60–100 (R14 spike) +
  frames 1880–2000 (stacked payoff) + frames 2235–2400 (gameplay
  tight) + frames 2790–2850 (closer). Preserves all 4 signals.
  Risk: dense cuts may break decode for cold viewers.

Phase 6 Unit 6.8 marks one as **Primary recommendation**. Phase 7
defaults to that recommendation. If Phase 7 has a documented reason
to override (e.g., decode-test panel surfaces a specific Option
fails standalone Archer test per Unit 7.1 Step 4), Briggsy approves
via `.signoff` sentinel.

**Phase 7 does NOT invent a 4th cutdown option.** The pre-deepening
"Candidate B (cascade peak → gameplay)" at frames 1860–2220 was a
Phase 7-invented option; deepening removes it.

### Cutdown frame-0 anchor rule (new ADR #25)

The cutdown's first frame is the X autoplay-entry image for the
majority of feed impressions. The "static thumbnail" (`out/thumbnail.png`
at frame 1950 PRIMARY per Phase 6 Unit 6.2 Step 3 lock, with
1860/1425/2790 fallback ladder) is only served in the paused state.
For 80%+ of impressions, **cutdown frame 0 is the scroll-stop image**.

Per ADR #25 (Phase 6 Unit 6.2 Step 3 selection rule extension to
cutdowns): cutdown START_FRAME must land on a composed-not-mid-motion
frame — NOT inside an active `interpolate()` window in
`videos/trailer/src/lib/transitions.ts`. Any candidate frame inside
an active ease window is disqualified; shift forward to ease-
completion + 0.5s buffer minimum.

**Per Phase 1 disambiguation amendment** (see Cross-Phase Amendments
below): Phase 1 line 1325 brightening ease completes AT frame 1860;
line 1326 holds bright through 1860–1950. The ease-completion + 0.5s
buffer rule places safe START_FRAMEs at 1875 or later for Option A/C
which include 1880-2000.

**Phase 6 Unit 6.8 cutdown-frame-list.md must annotate each
Option's START_FRAME with composed-not-mid-motion verdict** (cross-
phase amendment to Phase 6 — confirmed landed at Phase 6 Unit 6.8
Step 2 lines 2869-2886 during Phase 7 doc-review verification).

**CALL-3 — Audience-aware Option-selection rule** (per product-lens
P7 + adversarial A frame-0-decode concern, Phase 7 doc-review
2026-05-17). The cutdown autoplay-entry frame is the highest-leverage
single image in Phase 7 distribution. For the engineering-peer
audience (locked per project context — `project-burned-creative-direction.md`
+ §Problem Frame), Phase 7's Option-selection rule prefers Options
whose START_FRAME shows **product or gameplay**, not character. The
ranked criteria, applied in order:

  1. START_FRAME passes ADR #25 composed-not-mid-motion check.
  2. START_FRAME shows product/gameplay/text-overlay (R3 stamp, R13
     gameplay, R15 chyron) over character beat (cold-open Dash).
  3. START_FRAME passes greyscale color-blind-safe legibility check
     per design-lens D5 (desaturate frame 0; focal element must
     remain highest-contrast region without hue).
  4. Phase 6 Primary recommendation (if no audience-aware Option
     dominates).

  Phase 7 Unit 7.1 Step 4 applies this ranking explicitly. Option C
  (frame 60 cold-open spike) starts on a character beat; Option B
  (frame 60-150) same; Option A (frame 0-150) same. NONE of the
  pre-doc-review Options have a product/gameplay START_FRAME. CALL-3
  resolution: ship the cutdown Option whose START_FRAME is *as
  composed-and-product-leaning as the documented set allows*, AND
  acknowledge in `cutdown-eval.md` that the trailer's identity bet
  is "character-first cold-open even at the autoplay-entry cost"
  (Briggsy-deliberate, not Phase-7-default-by-omission). If a future
  re-cut emerges that opens on gameplay then back-fills the hook,
  it ranks above the existing Options.

### Cutdown closure rule (new ADR #24)

The cutdown ends with a **hard cut** to the last gameplay/closer
frame. NO `fade=t=out` filter on visual. NO `afade=t=out` filter on
audio.

Rationale (multi-agent convergence: emil + adversarial + feasibility):

- Phase 1 Unit 1.4 explicitly locked HARD CUT for the trailer's only
  R3 cross-dissolve candidate ("more Archer; dissolves 3 internal
  contradictions"). Phase 7 cutdown inherits Phase 1's transition
  vocabulary. Adding a fade-out at the cutdown end re-introduces a
  vocabulary the deepening pass already eliminated.
- A soft fade on mid-gameplay reads as "we ran out of footage." A
  hard cut reads as "we're done; scroll." X autoplay loop provides
  the closure punctuation that a fade would have provided in a
  non-looping context.
- X re-encodes everything on upload. Fade-out to black on a high-
  detail gameplay frame produces a gradient of low-luma frames which
  H.264 quantizes aggressively (banding risk; feasibility flag).
  Hard cut sidesteps this.

### Encoding lock (cutdown)

Inherits Phase 6 production encoding (ADR #19) **except** runtime is
12–15s and source is the Phase 6 final trailer.mp4 (not Remotion):

- Container: MP4 / +faststart
- Codec: H.264 High profile / libx264
- CRF: **18** (ADR #19; pre-deepening Phase 7 said 17 — wrong)
- Preset flag (raw FFmpeg argv): **`-preset slow`** — single dash,
  no `x264-` prefix. This is the canonical libx264 encoder option.
  (Pre-doc-review Phase 7 had `-x264-preset slow`, which is invalid
  in raw FFmpeg — `ffmpeg ... -c:v libx264 -x264-preset slow` returns
  `Unrecognized option 'x264-preset'` and exits non-zero. Verified
  2026-05-17 against installed FFmpeg 8.1 during Phase 7 doc-review.
  Per feasibility F1 + adversarial A1.)
- **ADR #19 cross-tool note** — ADR #19's `--x264-preset slow` flag
  applies to **Remotion CLI invocations only** (Phase 6 Unit 6.1
  production render). Remotion's CLI translates `--x264-preset` to
  the libx264 internal preset. When Phase 7 calls raw FFmpeg directly
  (cutdown render, 9:16 render, post-process scripts), use the raw
  libx264 encoder option name `-preset slow`. The two flags map to
  the same underlying encoder option through different tooling
  surfaces; do NOT use `-x264-preset` against raw `ffmpeg` argv.
- Pixel format: yuv420p
- Frame rate: 30 fps explicit
- Audio codec: AAC-LC 128k **mono** (`-ac 1`) at 48000 Hz (`-ar 48000`
  per framework-docs T2-B — browser interop)
- No `-tune` (mixed content; default psy-RD calibration correct)
- No `-r 30` redundancy (source is 30fps verified by Phase 6 Unit 6.0
  verify-trailer-final per feasibility F4)

### Seek pattern lock (cutdown FFmpeg invocation)

Phase 7 uses `-ss AFTER -i` per Phase 5 canonical pattern (Phase 5
line 1663, established during Phase 5 deepening). Single-pass frame-
accurate re-encode with `-frames:v <N>` for per-segment length.

**Note the framework-docs vs feasibility disagreement** (synthesis
position):

- framework-docs (Context7 `/websites/ffmpeg_ffmpeg-all`): `-ss
  BEFORE -i` with full re-encode IS frame-accurate since FFmpeg 2.1
  due to default `-accurate_seek=true`. The pre-deepening Phase 7
  invocation as written is technically valid post-FFmpeg-2.1.
- feasibility (Phase 5 line 1663 cite + audio-packet-boundary
  analysis): even with `-accurate_seek` the audio decoder may resync
  at the nearest audio packet boundary, producing ~20–40ms drift at
  the seek-in point. Phase 5 deepening already adopted `-ss AFTER -i`
  as project canonical.

**Synthesis decision**: use Phase 5 canonical pattern. Three reasons:
project consistency > technical sufficiency at one site; avoids
audio-packet-boundary drift; preserves ADR #20 R3-must-not-lead-
visual guarantee (audio-lead at the seek-in point is exactly what
ADR #20 forbids).

### Thumbnail lock (Phase 6 inheritance — corrected per design-lens D2)

Per Phase 6 **Unit 6.2 Step 3 lines 1232-1240** selection rule (lock
2026-05-17 during Phase 6 deepening). Pre-doc-review Phase 7 cited
"Phase 6 line 2253" — that line is a mobile-crop-audit table row,
NOT the thumbnail rule; and pre-doc-review claimed frame 2790 was
default. Phase 6's actual rule INVERTED that ordering: 1950 is
PRIMARY, 2790 is last-resort (the rationale: mid-process moments
stop scrolls, logo-closure scrolls past). Phase 7 doc-review
restoration:

- **PRIMARY**: frame **1950** (R3 stacked-payoff stamp + Dash audio
  reveal — most likely feed-stopper). IF the extracted still reads
  composed-not-mid-motion (stamp fully opaque + halo readable).
- **Fallback 2**: frame 1860 (cascade peak pre-stamp; high-density
  chrome, R15 visible, no motion blur).
- **Fallback 3**: frame 1425 (S04 stat 2 + halo; operative-density
  flourish if 1950 + 1860 both fail composed-state check).
- **Last-resort**: frame 2790 (S06 closure — kept as fallback for
  the same reason it was the prior default: extracts cleanly with
  no motion-blur risk).

Phase 6 produces `out/thumbnail.png` (1920×1080 master) at the
PRIMARY frame that clears composed-not-mid-motion; Phase 6 walks
the precedence ladder if PRIMARY fails. Phase 7 inherits whichever
frame Phase 6 ships and does NOT override.

**Phase 6 cross-phase amendment** (confirmed landed at Phase 6 Unit
6.2 Step 3 lines 1244-1254 during Phase 7 doc-review verification):
Phase 6 also produces `docs/trailer/thumbnail.jpg` (1200×675 q85
<100KB derivative for README; see frontend-design spec in
Cross-Phase Amendments below).

### Stat-verification gate (new ADR #26)

Any numeric or roster claim in trailer captions, README copy, pinned-
tweet copy, or thread copy MUST derive from a verifier script that
parses the codebase at write time. Hand-typed numbers banned.

**Multi-agent finding** (adversarial + repo-research + brief
institutional gap):

- Variation A caption "7 operatives" hallucination. `src/shared/
  card-defs.ts` lines 12–30 ship 17 cards total: 11 action/utility
  + 1 burned + 1 extraction + 1 wild (Agent X) + 5 named operatives
  (Dash, Vera, Sable, Janet, Neal). NO Otto. Operative-category
  count = 5; operative-or-wild = 6.
- Trailer narration (Phase 1 line **1086** — the LOCKED cue table
  row at frame 1680 Stat 4): *"Seven on the roster. Six in the deck.
  **One on the research budget. Don't ask.**"* (Pre-doc-review Phase
  7 cited Phase 1 "line 49" with "one in the basement" — that text
  was Phase 1 fiction explicitly retracted at Phase 1 lines 1100-1113
  during Phase 1 doc-review: ActRoster.tsx:153-158 is canonical;
  Otto is *"busy with the (unsanctioned, off-books, almost certainly
  illegal) research budget"*. No basement appears in source. Per
  design-lens D2 Phase 7 doc-review.)
- Caption should match the LOCKED trailer narration: **"six
  operatives in the deck, one on the research budget"** is the
  correct framing — viewers can freeze-frame the dossier line and
  fact-check.
- "Approximately 14,000 pages of forensic dossiers" — Phase 1 line
  1584 explicitly says: *"NOTE: previous draft's '14,000 pages' was
  unverified; Step 5 must run actual `wc -w` if a pages-stat is
  wanted."* The narration uses it as fictional in-character cadence;
  using it as a tweet stat passes it off as real. → CUT.
- "120 operations" — VERIFIED. Sum of `pawCount + nonPawCount` across
  CARD_DEFS = 120 exact.
- "17 illustrations" — VERIFIED. `ls public/assets/cards/*.webp` →
  17 files.

Unit 7.0 verifier script formalizes this discipline.

### Bar-raise inheritance to cutdown

Phase 6 bar-raise threshold (ADR #21 raised): axis 3 cleared AND ≥1
of axes 1/2 cleared.

**Bar-raise does NOT extend automatically to cutdown.** The cutdown
is a separate distribution artifact with separate viewers (cold X
feed; no buildup priming). Per adversarial Attack 4 finding: §2
acceptance is verified standalone on the cutdown via Unit 7.1 Step 4
(6 representative frames + cold-viewer check). The flagship's bar-
raise PASS does not transit to the cutdown automatically.

### 9:16 cutdown branch (conditional)

Phase 6 Unit 6.8 cutdown-frame-list.md includes a 9:16 feasibility
verdict per Option (GO / NEEDS-RECOMPOSE / NOGO per scene). Phase 7
Unit 7.1 Step 6 reads this verdict and acts:

- **9:16 verdict GO**: render second cutdown via `vf
  "crop=607:1080:656:0,scale=1080:1920"` (center-extract the 607-
  pixel-wide vertical strip from the 1920-pixel-wide source, then
  scale to 1080×1920 for X Immersive Media Viewer surface).
- **9:16 verdict NEEDS-RECOMPOSE**: do NOT render. Phase 7 does not
  own Phase 4 work. Document the skip and move on.
- **9:16 verdict NOGO**: do NOT render. Skip vertical surface for
  this trailer.

---

## Requirements Trace

- **R1** (Pendleton vocabulary): inherited from Phase 6 deliverable;
  cutdown preserves whatever vocabulary is in the selected source-
  frame range.
- **R3** (stacked payoff): preserved in cutdown if Option A or C
  selected. NOT preserved in Option B.
- **R8** (16:9 landscape): inherited; cutdown also 16:9. 9:16
  cutdown is a SEPARATE asset, not a recomposition.
- **R13** (gameplay closer): preserved in cutdown if Option B or C
  selected.
- **R14** (cold-open hook): preserved in cutdown for all 3 Options
  (each includes the 0–150 or 60–100 cold-open band).
- **R15** (text signal layer): preserved in cutdown via R15 #3 / #4
  stamps in the selected ranges. **Caption thread (Post 2b) does
  NOT repeat R15 signaling** — chyron-is-the-joke rule applies; the
  thread carries genuine tooling-stack content, NOT a verbal echo
  of the R15 stamps.
- **All other R-requirements** inherited from Phase 6 final
  deliverable. Phase 7 ships the trailer + cutdown; it does not
  re-verify R-requirements that Phase 6 Unit 6.7 already QA'd.

---

## Key Technical Decisions

### D-7A — Cutdown source = Phase 6 Unit 6.8 recommendation

Locked above (Cutdown source range section). Phase 7 picks from
Options A/B/C documented in Phase 6 cutdown-frame-list.md; defaults
to Phase 6's Primary recommendation; does not invent.

### D-7B — Cutdown encoding lock

Raw FFmpeg argv (Phase 7 uses raw `ffmpeg`, not Remotion CLI):
CRF 18 / **`-preset slow`** / yuv420p / 30fps explicit / AAC 128k
mono 48kHz / +faststart / no `-tune` / no `-r` (source-verified
30fps). Inherits ADR #19 production target + ADR #14 mono. NOTE:
ADR #19's `--x264-preset slow` is the **Remotion CLI** spelling;
raw FFmpeg uses the libx264 encoder option name `-preset slow`. See
Critical Constraints / Encoding lock for the cross-tool note. Per
feasibility F1 + adversarial A1 Phase 7 doc-review.

### D-7C — Seek pattern `-ss AFTER -i`

Phase 5 canonical. Single-pass frame-accurate re-encode with
`-frames:v <N>`. (See framework-docs vs feasibility disagreement
notes in Critical Constraints; synthesis picks Phase 5 canonical for
consistency + audio-packet-boundary safety.)

### D-7D — Hard-cut closure, no fade-out (ADR #24)

NO `-vf fade=t=out` filter. NO `-af afade=t=out` filter. X autoplay
loop provides closure punctuation. Locked.

### D-7E — START_FRAME composed-not-mid-motion (ADR #25)

Cutdown START_FRAME must land on a settled compositional state per
Phase 6 Unit 6.2 Step 3 selection rule. Cutdown frame 0 IS the X
autoplay-entry image. For Option A/C (which include frames 1880-2000
for R3): START_FRAME ≥1880 lands at the held-bright cascade-peak
state per Phase 1 disambig (brightening completes at 1860; held
through 1860–1950).

### D-7F — Atomic-swap `.new → verify → mv`

Mirror Phase 5 + Phase 6 pattern. Cutdown renders to `out/trailer-
x-cutdown.mp4.new`; Unit 7.6 runs `pnpm verify:cutdown-ready`; on
GREEN, `mv .new` → final.

### D-7G — Cutdown standalone §2 audit

Bar-raise PASS does not transit. Unit 7.1 Step 4 runs a §2 audit on
6 representative cutdown frames + cold-viewer check (≥1 cold viewer,
not Briggsy not Claude). PASS gate before atomic-swap mv.

### D-7H — 9:16 cutdown is conditional

Phase 6 Unit 6.8 9:16 verdict gates this. GO → render. NEEDS-
RECOMPOSE or NOGO → skip with documented reason.

### D-7I — `.signoff` sentinels (ADR #22 inheritance)

Phase 7 gates with sign-off sentinels at:
- `briggsy-review-7.0.signoff` — Stat verification approved (Unit
  7.0).
- `briggsy-review-7.1.signoff` — Cutdown render + standalone audit
  approved (Unit 7.1).
- `briggsy-review-7.1b.signoff` — Release assets published + URLs
  verified (Unit 7.1b). Added per coherence C1/C5 + scope-guardian
  SG2/SG3 + adversarial A2 Phase 7 doc-review (pre-doc-review D-7I
  omitted this sentinel despite Unit 7.1b creating it).
- `briggsy-review-7.2.signoff` — Portfolio embed committed (Unit
  7.2). Added per scope-guardian SG4 Phase 7 doc-review.
- `briggsy-review-7.3.signoff` — Post copy locked (Unit 7.3).
- `briggsy-review-7.4.signoff` — Calendar approved (Unit 7.4).
- `briggsy-review-7.6.signoff` — Pre-post verify GREEN within 60min
  of T+0 (Unit 7.6).
- `.unpin-burned.signoff` — Pin replacement triggered (Unit 7.7,
  new-project ship primary; D+360 time-fallback per CALL-2).

`pnpm verify:briggsy-sentinels` enforces git-author check at each
gate (script creation contracted in Unit 7.0 Step 0 per
SG1/feasibility — pre-doc-review plan body cited it as "existing"
but `package.json` shipped only `verify:bundle` at Phase 7 drafting
time).

### D-7J — 3-beat burst post sequence (ADR #27)

T+0 / T+90min / T+2-3h via self-reply thread. NOT 24h quote-tweet.
Pinned tweet at D+7 separate from the burst.

### D-7K — README inline embed via drag-drop user-attachments (ADR #29)

GitHub README does NOT render HTML `<video>` tags (sanitizer strips).
Markdown image-link to Release MP4 does NOT inline-play (renders as
clickable thumbnail download). The ONLY mechanism producing inline
`<video>` in README is the drag-drop user-attachments URL injected
by GitHub's web editor. Phase 7 Unit 7.2 documents this procedure.

### D-7L — Thumbnail PRIMARY frame 1950 (Phase 6 lock inheritance)

Phase 6 Unit 6.2 Step 3 lines 1232-1240 selection rule: 1950 PRIMARY
(R3 stamp + Dash reveal) / 1860 second / 1425 third / 2790 last-resort
(logo closure). Phase 7 does not override. (Pre-doc-review D-7L cited
wrong line + wrong default frame; per design-lens D2 Phase 7 doc-review.)

### D-7M — Bitrate target 8–12 Mbps (ADR #28)

Roadmap §5.4 corrected during Phase 7 deepening from 5–8 Mbps. CRF
18 / preset slow naturally lands in 12–18 Mbps VBR average for
action content; within the 25 Mbps platform ceiling.

### D-7N — All shell-outs use `execFileSync` argv arrays

Project security convention. No shell-string interpolation. Applies
to Unit 7.0 verify script, Unit 7.1 cutdown render, Unit 7.1b
release publish, Unit 7.6 pre-post verify.

---

## Implementation Units

### Unit 7.0 — Stat-Verification Gate

- [ ] **Unit 7.0: Stat-Verification Gate**

**Goal:** Derive every numeric and roster claim used in distribution
copy from a verifier script parsing the codebase. Prevent caption
hallucinations like "7 operatives" or "14,000 pages."

**Requirements:** ADR #26 (stat-verification gate); blocks Unit 7.3
caption drafting.

**Dependencies:** Phase 7 Entry Gate green.

**Files:**

- Create: `scripts/verify-phase-7-entry.ts` (Step 0a — entry-gate
  enforcer; per scope-guardian SG1 Phase 7 doc-review).
- Create: `scripts/verify-briggsy-sentinels.ts` (Step 0b — git-author
  check; per scope-guardian SG1 + feasibility — pre-doc-review plan
  body cited it as existing but `package.json` shipped only
  `verify:bundle`).
- Create: `src/shared/narrative-stats.ts` (Step 1 — single source-of-
  truth for narration-locked counts; per adversarial A7 — the
  verifier should import the constant, not hardcode it inline).
- Create: `scripts/verify-caption-stats.ts`.
- Create: `videos/trailer/distribution/verified-stats.json` (output).
- Create: `videos/trailer/distribution/briggsy-review-7.0.signoff`
  (sentinel).

**Approach:**

**Step 0a — Create `scripts/verify-phase-7-entry.ts` + wire
`package.json` script entry `verify:phase-7-entry`** (per
scope-guardian SG1). The script:
1. Reads PHASE-6-EXIT.md and asserts the GO verdict + §2 frame-pass
   ≥8/10 + bar-raise threshold cleared + A/V sync PASS + 9:16 verdict
   present (GO/NEEDS-RECOMPOSE/NOGO).
2. Asserts presence of `videos/trailer/sample-eval/final-render-qa/
   briggsy-review-6.4.signoff` + `briggsy-review-6.7.signoff` +
   `cutdown-frame-list.md` + `videos/trailer/out/trailer.mp4` +
   `videos/trailer/out/thumbnail.png` + `docs/trailer/thumbnail.jpg`
   + `videos/trailer/distribution/account-state.md` (X-tier + GitHub
   plan-tier + repo publicity per Entry Gate).
3. Calls `scripts/verify-briggsy-sentinels.ts` as a subprocess for
   git-author identity check on the two Phase 6 sentinels.
4. Exits 0 GREEN / non-zero RED.

**Step 0b — Create `scripts/verify-briggsy-sentinels.ts` + wire
`verify:briggsy-sentinels`**. Takes one or more sentinel paths as
argv; uses `execFileSync('git', ['log', '-1', '--format=%ae', path])`
to read the committing email and asserts it equals
`briggsy007@gmail.com`. Phase 7 Unit 7.6 also invokes this script
as part of the terminal pre-post gate (per security-lens S6 —
pre-doc-review separation allowed a green Unit 7.6 with the
git-author check skipped).

**Step 1 — Stat enumeration.**

The canonical claims that appear in Phase 7 distribution copy are:

| Claim | Source-of-truth | Method |
|-------|-----------------|--------|
| `illustrations` | `public/assets/cards/*.webp` (excluding `_archive/`) | `glob().length` |
| `operations` (deck total) | `src/shared/card-defs.ts` `CARD_DEFS` | `sum(pawCount + nonPawCount)` across all entries |
| `operatives_in_deck` | `src/shared/card-defs.ts` `CARD_DEFS` filtered to `category in ['operative','wild']` | `.length` |
| `operatives_off_books` | `src/shared/narrative-stats.ts` `OPERATIVES_OFF_BOOKS` constant (Otto, per Phase 1 line 1086 "one on the research budget") | import |
| `operatives_on_roster_total` | `operatives_in_deck + operatives_off_books` | computed |
| `trailer_seconds` | `videos/trailer/src/lib/timing.ts` TOTAL_FRAMES / 30 | computed |

(Pre-doc-review stat table enumerated four additional rows —
`phases_in_plan` / `phase_files_drafted` / `act_count_in_htp` /
`card_types` — that do NOT appear in any caption draft and are not
emitted by the verifier. Removed per scope-guardian SG5/SG6
Phase 7 doc-review: framework-ahead-of-need; the verifier should
enumerate only stats that ship in copy. Caption stats source:
`verified-stats.json` Unit 7.0 output; landed in narration order
matching the trailer's freeze-frameable dossier.)

**Step 2 — Verifier script.**

Per feasibility F4/F5 Phase 7 doc-review: tsx + bundler-resolution
convention (no `.js` extensions on TS imports — matches existing
`scripts/check-bundle-size.ts` + `scripts/playtest/*.ts`). Per
feasibility F4: `node:fs.globSync` option is `exclude`, not `ignore`
(silently dropped). Per security-lens S2 + adversarial A7: real
`git rev-parse HEAD` capture (was placeholder comment); narrative
constant imported from `src/shared/narrative-stats.ts` (was hardcoded
inline — defeats the verifier's stated purpose if Otto ever ships).

```ts
// src/shared/narrative-stats.ts — Phase 7 doc-review per adversarial A7
//
// Narration-locked counts that distribute into Phase 7 caption copy.
// Source: Phase 1 line 1086 cue table — Stat 4 at frame 1680.
// Update this file ONLY when the trailer narration itself is re-locked.
export const OPERATIVES_OFF_BOOKS = 1 as const; // Otto, "one on the research budget"
```

```ts
// scripts/verify-caption-stats.ts (DIRECTIONAL — final names per repo conventions)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { globSync } from 'node:fs';
import { CARD_DEFS } from '../src/shared/card-defs';
import { OPERATIVES_OFF_BOOKS } from '../src/shared/narrative-stats';
import { TOTAL_FRAMES, FPS } from '../videos/trailer/src/lib/timing';

const cards = CARD_DEFS;
const illustrations = globSync('public/assets/cards/*.webp', {
  exclude: ['public/assets/cards/_archive/**'],   // node:fs uses `exclude`, NOT `ignore`
}).length;

const operations = cards.reduce((s, c) => s + c.pawCount + c.nonPawCount, 0);
const operatives_in_deck = cards.filter(c =>
  c.category === 'operative' || c.category === 'wild'
).length;
const operatives_off_books = OPERATIVES_OFF_BOOKS;

// SAFE: argv array
const source_git_sha = execFileSync('git', ['rev-parse', 'HEAD'])
  .toString().trim();

const verified = {
  generated_at: new Date().toISOString(),
  source_git_sha,
  illustrations,
  operations,
  operatives_in_deck,
  operatives_off_books,
  operatives_on_roster_total: operatives_in_deck + operatives_off_books,
  trailer_seconds: TOTAL_FRAMES / FPS,
};

// Cross-check: trailer narration (Phase 1 line 1086) says
// "Six in the deck. One on the research budget. Don't ask."
// Hard-assert operatives_in_deck === 6.
if (verified.operatives_in_deck !== 6) {
  throw new Error(
    `Stat drift: operatives_in_deck = ${verified.operatives_in_deck}, ` +
    `trailer narration says 6. Either trailer is wrong or codebase is wrong; ` +
    `reconcile before posting.`
  );
}
// Otto-doesn't-ship invariant — if Otto becomes a real card, narrative
// stat must update via narrative-stats.ts AND re-verify here:
const ottoShipped = cards.some(c => c.id === 'otto');
if (ottoShipped) {
  throw new Error(
    `Otto now ships as a real card; OPERATIVES_OFF_BOOKS in ` +
    `src/shared/narrative-stats.ts must be updated AND trailer narration ` +
    `re-evaluated. Otto-in-basement framing no longer matches ground truth.`
  );
}

writeFileSync(
  'videos/trailer/distribution/verified-stats.json',
  JSON.stringify(verified, null, 2)
);
console.log(`OK verified-stats.json written. Stats:`, verified);
```

**Step 3 — Roster contradiction resolution (cross-phase amendment).**

The verifier surfaces a known roadmap §1 contradiction: roadmap §1
line 50 currently says *"seven named operatives in the roster (Dash,
Vera, Sable, Janet, Neal, Otto, Agent X)"* — Otto is a roadmap ghost
not in `card-defs.ts` and has no `.webp` art. **Phase 7 cross-phase
amendment**: roadmap §1 should either (a) note Otto-off-books-on-the-
research-budget is narrative-only-not-shipped (cheap fix; aligns with
Phase 1 line 1086 locked narration), or (b) ship Otto card + art
(expensive; out of Phase 7 scope). Phase 7 picks (a); roadmap §1
amendment landed during Phase 7 deepening — per design-lens D2
Phase 7 doc-review, replace the prior "in the basement" wording with
"on the research budget" to match locked narration. (See Cross-
Phase Amendments section for the corrected text.)

**Step 4 — Briggsy review + sentinel.**

Output `verified-stats.json` reviewed by Briggsy; numbers match
trailer narration. On approval, commit `briggsy-review-7.0.signoff`
under briggsy007@gmail.com git author identity.

**Patterns to follow:**

- `feedback-stats-single-source.md` discipline.
- `feedback-elite-team-standard.md` — verified before claimed.
- ADR #22 sentinel ceremony.

**Test scenarios:**

- **Happy path:** Script runs; output matches trailer narration;
  Briggsy signs off.
- **Edge case:** `operatives_in_deck !== 6` — hard-assert fails.
  Investigate: did someone add a new operative card? Or remove one?
  Reconcile with trailer narration before proceeding.
- **Edge case:** New card type added to `CARD_DEFS` between Phase 6
  exit and Phase 7 entry → re-run Unit 7.0; check whether Phase 6
  needs reopen for re-render or whether caption can absorb the new
  number.

**Verification:**

- `verified-stats.json` exists and is valid JSON.
- All hard-asserts pass.
- `briggsy-review-7.0.signoff` committed under Briggsy git identity.
- Verified stats match trailer narration assertions.

---

### Unit 7.1 — X-Native Cutdown Production

- [ ] **Unit 7.1: X-Native Cutdown Production**

**Goal:** Render the X-native cutdown by consuming Phase 6 Unit 6.8
cutdown-frame-list.md Option selection and applying the Phase 5
canonical FFmpeg seek pattern. Atomic-swap result to
`out/trailer-x-cutdown.mp4`.

**Requirements:** R8 (16:9), R-requirement preservation per Option
selection (Option C preserves all 4 R-signals; Option A/B preserve
3 each). ADR #4-rev / #14 / #19 / #20 / #22 / #23 / #24 / #25.

**Dependencies:** Phase 7 Entry Gate green; Unit 7.0 sentinel
present (not strictly required for cutdown render but expected to
land first per workflow).

**Files:**

- Read: `videos/trailer/sample-eval/final-render-qa/cutdown-frame-list.md`.
- Read: `videos/trailer/out/trailer.mp4`.
- Create: `scripts/render-cutdown.ts`.
- Create: `videos/trailer/out/trailer-x-cutdown.mp4.new` (staging) →
  atomic-swap to `videos/trailer/out/trailer-x-cutdown.mp4`.
- (Conditional) Create: `videos/trailer/out/trailer-x-cutdown-9-16.mp4`
  (vertical-feed render if Phase 6 9:16 verdict GO).
- Create: `videos/trailer/sample-eval/distribution/cutdown-eval.md`.
- Create: `videos/trailer/distribution/briggsy-review-7.1.signoff`.

**Approach:**

**Step 1 — Read Phase 6 cutdown-frame-list.md selection.**

Parse the Primary recommendation row + the listed source-frame
ranges per Option. Default to Phase 6's Primary; if Phase 6 left
Primary unlocked, default to **Option C** (preserves all 4 signals;
strongest single cutdown per multi-agent design-lens analysis).

For Option C the source-frame ranges are:
- frames 60–100 (R14 spike, 1.3s)
- frames 1880–2000 (stacked payoff, 4.0s)
- frames 2235–2400 (gameplay tight, 5.5s)
- frames 2790–2850 (closer R15 #4, 2.0s)

Total: 12.8s. Cuts: hard (no transitions; ADR #4-rev).

**Composed-not-mid-motion validation** (per ADR #25 + Phase 1
disambig): START_FRAME of each segment must land on a settled
compositional state.
- Segment 1 START = 60: in cold-open's first major beat; settled.
  ✓
- Segment 2 START = 1880: 20 frames past brightening-ease completion
  (1860); held bright (per Phase 1 line 1326 amended). ✓ Pass per
  the +0.5s buffer rule.
- Segment 3 START = 2235: gameplay representative; verify against
  `gameplay.mp4` segment markers per Phase 5 Unit 5.4.
- Segment 4 START = 2790: closer logo land; settled. ✓

**Step 2 — Render via FFmpeg multi-segment trim.**

Two implementation approaches. **Phase 7 doc-review CALL — flipped
default from 2a to 2b** per adversarial A4: filter_complex
`atrim=start=N/FPS` is sample-accurate to 1/30s (33ms) on the audio
stream, but the AAC packet boundary is 21.33ms — accumulated drift
across multi-segment concat can produce audio-lead at any segment
seam, exactly the failure mode ADR #20 R3 forbids. Per-segment +
concat-demuxer (Approach 2b) preserves the Phase 5 canonical
`-ss AFTER -i` invariant per segment and lets each segment's audio
resync at a clean boundary before concat. 2a stays documented as
an option for the trivial single-segment case.

**Approach 2b — Per-segment files + concat demuxer (DEFAULT):**

For each segment, run a single-pass frame-accurate re-encode (Phase 5
canonical pattern, Phase 5 deepening line 1660-1665):

```ts
// scripts/render-cutdown.ts (DIRECTIONAL — Approach 2b default)
import { execFileSync } from 'node:child_process';
import { renameSync, writeFileSync } from 'node:fs';

// SAFE: argv array, no shell-string interpolation
const SOURCE = 'videos/trailer/out/trailer.mp4';
const STAGING_DIR = 'videos/trailer/out/.cutdown-staging';
const STAGING = 'videos/trailer/out/trailer-x-cutdown.mp4.new';
const FINAL = 'videos/trailer/out/trailer-x-cutdown.mp4';

// Option C source ranges (read from Phase 6 cutdown-frame-list.md
// at execution time; not hardcoded; here for illustration)
const SEGMENTS = [
  { startFrame: 60,   endFrame: 100  },  // R14 spike
  { startFrame: 1880, endFrame: 2000 },  // R3 stacked payoff
  { startFrame: 2235, endFrame: 2400 },  // gameplay tight
  { startFrame: 2790, endFrame: 2850 },  // closer
];
const FPS = 30;

// Per security-lens S1 Phase 7 doc-review: validate every frame
// integer before it enters any FFmpeg arg value, since values flow
// into filter syntax (filter-graph injection surface even though
// argv prevents shell injection).
for (const seg of SEGMENTS) {
  for (const f of [seg.startFrame, seg.endFrame] as const) {
    if (!Number.isInteger(f) || f < 0 || f > 100_000) {
      throw new Error(`Invalid frame value from cutdown-frame-list.md: ${f}`);
    }
  }
  if (seg.startFrame >= seg.endFrame) {
    throw new Error(`startFrame ${seg.startFrame} >= endFrame ${seg.endFrame}`);
  }
}

// Per-segment re-encode (NO -vf fade=t=out / NO -af afade=t=out per ADR #24)
const segFiles: string[] = [];
SEGMENTS.forEach((seg, i) => {
  const segPath = `${STAGING_DIR}/seg-${String(i).padStart(2,'0')}.mp4`;
  segFiles.push(segPath);
  const startSec = (seg.startFrame / FPS).toFixed(3);
  const nFrames  = String(seg.endFrame - seg.startFrame);
  execFileSync('ffmpeg', [
    '-y',
    '-i', SOURCE,                   // -ss AFTER -i per Phase 5 canonical
    '-ss', startSec,
    '-frames:v', nFrames,
    '-c:v', 'libx264',
    '-crf', '18',                   // ADR #19 production target
    '-preset', 'slow',              // raw libx264 option (ADR #19 cross-tool note)
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',                 // framework-docs T2-B
    '-ac', '1',                     // ADR #14 mono
    '-movflags', '+faststart',
    segPath,
  ]);
});

// Concat demuxer — single concat list, no re-encode
const listPath = `${STAGING_DIR}/concat-list.txt`;
writeFileSync(
  listPath,
  segFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n'
);
execFileSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', listPath,
  '-c', 'copy',
  '-movflags', '+faststart',
  STAGING,
]);
```

**Approach 2a — Multi-input filter_complex (documented fallback):**

A single-FFmpeg-invocation filter_complex trim-and-concat pattern
exists. Use ONLY if Step 5 per-seam AV-sync verification on 2b
fails (e.g., concat-demuxer codec-mismatch surfaces despite per-
segment identical encoding), in which case the docs/forum-canonical
filter_complex pattern is the fallback:

```ts
// Per-segment trim then concat all streams in one FFmpeg invocation.
// Documented because the filter_complex pattern is otherwise canonical;
// 2b is preferred per adversarial A4 audio-seam drift concern.
const filterParts: string[] = [];
SEGMENTS.forEach((seg, i) => {
  filterParts.push(
    `[0:v]trim=start_frame=${seg.startFrame}:end_frame=${seg.endFrame},setpts=PTS-STARTPTS[v${i}]`
  );
  filterParts.push(
    `[0:a]atrim=start=${seg.startFrame/FPS}:end=${seg.endFrame/FPS},asetpts=PTS-STARTPTS[a${i}]`
  );
});
const concatInputs = SEGMENTS.map((_, i) => `[v${i}][a${i}]`).join('');
filterParts.push(
  `${concatInputs}concat=n=${SEGMENTS.length}:v=1:a=1[outv][outa]`
);
execFileSync('ffmpeg', [
  '-y',
  '-i', SOURCE,
  '-filter_complex', filterParts.join(';'),
  '-map', '[outv]',
  '-map', '[outa]',
  '-c:v', 'libx264',
  '-crf', '18',
  '-preset', 'slow',                // raw libx264 option (NOT -x264-preset)
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '128k',
  '-ar', '48000',
  '-ac', '1',                       // ADR #14 mono
  '-movflags', '+faststart',
  STAGING,
]);
```

**Approach decision**: Default to **2b** (per-segment + concat-
demuxer). Fall back to 2a only if Step 5 per-seam AV-sync check
surfaces an unfixable boundary issue with 2b. Document the chosen
approach + reason in `cutdown-eval.md`.

**Step 3 — Render verification (ffprobe).**

```bash
ffprobe -v error -show_format -show_streams \
  out/trailer-x-cutdown.mp4.new -of json
```

Expected:
- Duration: matches sum of segment durations ±0.04s (1 frame at
  30fps tolerance).
- Resolution: 1920×1080.
- Codec: h264 / High profile / yuv420p.
- Audio: aac, 128 kbps, **48000 Hz, 1 channel (mono)**.
- File size: 25–60 MB (well under X 512 MB cap; if >50 MB, note in
  cutdown-eval.md but does not fail — X 512 MB cap is hard ceiling).
- Bitrate VBR average: 8–18 Mbps (ADR #28 lock; survives X re-encode
  with minimal degradation).
- `+faststart` flag present.

**Step 4 — Cutdown standalone §2 audit + cold-viewer check.**

Per ADR #25 + adversarial Attack 4:

(a) Extract 6 representative frames from the cutdown (every ~60
frames). Run Phase 6 Unit 6.3 §2 rubric (composition: focal-region
count + center anchor; palette: 5-pixel grid sample with RGB-
distance threshold; typography: control-render overlay comparison).

(b) Cold-viewer check: ≥1 person who has NOT seen the flagship
watches the cutdown standalone, reports "does this look like a frame
from an Archer trailer, or a generic sizzle-reel?" PASS requires
"Archer trailer" reading without flagship priming.

(c) Frame 0 specific audit (ADR #25): cutdown frame 0 is the X
autoplay-entry image. Verify (i) settled compositional state (not
inside an active interpolation window per `transitions.ts`), (ii)
focal element within 1:1 safe square + 9:16 vertical strip per ADR
#23, (iii) reads cold (cold-viewer reports scroll-stop intent),
(iv) **greyscale color-blind-safe check** per design-lens D5
Phase 7 doc-review: desaturate frame 0 to luma-only (`ffmpeg -i
frame0.png -vf format=gray frame0-gray.png`); confirm the focal
element remains the highest-contrast region and any text overlays
remain legible. Briggsy is color-blind (per user context); if frame
0 reads only via hue, it fails the autoplay-entry test. This is a
one-image check, not a blocking gate — log result in cutdown-eval.md.

(d) Audience-fit ranking per CALL-3 + product-lens P7 Phase 7
doc-review: cross-check that the selected Option's START_FRAME
shows product/gameplay/text-overlay over character-only. If the
ranked Option choice differs from Phase 6's Primary recommendation,
document the override reason in cutdown-eval.md and obtain
`briggsy-review-7.1.signoff` per D-7A.

If any audit FAIL: shift START_FRAME of the first segment forward
by 15–30 frames; re-render; re-audit. If 3 iterations fail: route
to a different Option (Phase 6 cutdown-frame-list.md A or B); if
all 3 Options fail: 16:9 cutdown does NOT ship (flagship-only
distribution); document the skip.

**Step 5 — AV-sync verification on cutdown (per-seam, not just
per-cue).**

Mirror Phase 6 Unit 6.5 manifest-driven approach scoped to the
cutdown. ADR #20 zero-tolerance check at every cue inside the
cutdown: audio MUST NOT lead visual. For Option C, R3 stacked-
payoff at cutdown frame ~40 (segment 2 start + ~10 frames into R3)
is the critical assertion.

**Per-seam verification** (per adversarial A4 Phase 7 doc-review —
green Step 5 verdict was historically a per-cue check; the new risk
is per-seam drift produced by the multi-segment concat):

```ts
// For each segment boundary in the cutdown (3 seams for Option C):
// - ffprobe-frame the visual frame closest to the seam PTS
// - ffprobe-packet the audio packet closest to the seam PTS
// - Assert audio-packet PTS <= visual-frame PTS within ADR #20 R3
//   tolerance ([-1 frame, 0 frames] = -33ms to 0ms on R3, ±5%
//   elsewhere)
```

If audio-lead detected at any seam: investigate. Likely causes per
feasibility F1 + adversarial A4: (a) per-segment encoder rounding
shifts audio packet start by up to one packet (21.33ms); (b)
filter_complex `atrim` is sample-accurate not packet-accurate; (c)
source has keyframe gaps that misalign on segment boundary. Fix:
shift the affected segment's `-ss` value by ±21ms (one audio packet)
and re-render that segment only; if persistent, fall back to
Approach 2a filter_complex and re-run per-seam Step 5.

**Step 6 — (Conditional) 9:16 cutdown render.**

Read Phase 6 Unit 6.8 9:16 feasibility verdict for the selected
Option:

- **GO**: render second cutdown via:

```ts
execFileSync('ffmpeg', [
  '-y',
  '-i', FINAL,  // i.e., the 16:9 cutdown after Step 8 swap
  '-vf', 'crop=607:1080:656:0,scale=1080:1920:flags=lanczos',
  '-c:v', 'libx264',
  '-crf', '18',
  '-preset', 'slow',                // raw libx264 option (NOT -x264-preset)
  '-pix_fmt', 'yuv420p',
  '-c:a', 'copy',                   // audio unchanged from 16:9
  '-movflags', '+faststart',
  'videos/trailer/out/trailer-x-cutdown-9-16.mp4.new',
]);
```

Then ffprobe-verify and atomic-swap. Document the 1080×1920 vertical
crop math: source 1920 wide → crop 607-pixel-wide vertical strip
centered at x=656 (per ADR #23 math 1080×9/16=607.5→607) → scale to
1080×1920 (X Immersive Media Viewer's preferred dimensions).

- **NEEDS-RECOMPOSE / NOGO**: skip; document the skip in
  cutdown-eval.md; do NOT ship a re-composed vertical from Phase 7
  (Phase 4's job).

**Step 7 — Atomic-swap.**

Run `pnpm verify:cutdown-ready` (Unit 7.6). On GREEN:

```ts
import { renameSync } from 'node:fs';
renameSync(STAGING, FINAL);
// If 9:16 rendered:
renameSync('out/trailer-x-cutdown-9-16.mp4.new', 'out/trailer-x-cutdown-9-16.mp4');
```

Atomic; preserves any prior render under `.bak` if the project
convention does (verify against Phase 5/6 atomic-swap pattern at
execution).

**Step 8 — Cutdown evaluation doc.**

`cutdown-eval.md`:

```md
# X-Native Cutdown — Phase 7 Unit 7.1

## Phase 6 source selection
- Selected Option: <A|B|C>
- Phase 6 Primary recommendation: <A|B|C>
- Override reason (if any): <text + briggsy-review-7.1.signoff>
- Source-frame ranges: <list per segment>
- R-signals preserved: <R14, R3, R13, R15 closer subset>

## Render verification
- File: out/trailer-x-cutdown.mp4
- Duration: <measured>s (target 12-15s per Option)
- Dimensions: 1920×1080
- Codec: H.264 High / CRF 18 / raw FFmpeg `-preset slow` (libx264 encoder option; ADR #19 `--x264-preset slow` is the Remotion CLI spelling, not raw ffmpeg) / yuv420p
- Audio: AAC 128k mono 48kHz
- File size: <N> MB (X cap 512 MB; trivially clears)
- Bitrate VBR avg: <N> Mbps (ADR #28 target 8-12; CRF 18 typically 12-18)
- `+faststart`: YES

## Cutdown standalone §2 audit (6 representative frames)
- Frame 0: <PASS/FAIL + composed-not-mid-motion verdict>
- Frame ~60: <PASS/FAIL>
- ... (×6 total)
- Cold-viewer report: <"Archer trailer" / "sizzle reel" / mixed>
- Verdict: PASS / FAIL → iterate

## AV-sync (cutdown-scoped)
- R3 stacked-payoff (if Option A or C): <PASS — audio does not lead visual; manifest-driven check>
- Other cues: <list>
- Verdict: PASS / FAIL → investigate

## 9:16 cutdown
- Phase 6 verdict for selected Option: <GO/NEEDS-RECOMPOSE/NOGO>
- 9:16 render produced: <YES/NO>
- If NO: <reason: NEEDS-RECOMPOSE → Phase 4 / NOGO → skip vertical surface>
- If YES: <verification: 1080×1920, codec, dimensions, file size>

## Hard-cut closure verification (ADR #24)
- Last frame: hard-cut to closer / gameplay (no fade)
- Trailing 30 frames: no `fade=t=out` filter applied; visible state holds to end
- X autoplay loop seam: cut from last frame back to frame 0 (composed-state)

## Verdict
SHIP / iterate
```

**Patterns to follow:**

- Phase 5 Unit 5.4 single-pass frame-accurate re-encode pattern.
- Phase 6 Unit 6.1 production encoding (ADR #19).
- Phase 6 Unit 6.5 manifest-driven AV-sync verification.
- ADR #14 mono audio.
- ADR #22 sentinel ceremony.
- ADR #25 composed-not-mid-motion rule.
- Project security: `execFileSync` argv arrays.

**Test scenarios:**

- **Happy path:** Option C renders cleanly; §2 audit PASS; AV-sync
  PASS; 9:16 verdict GO → second render PASS.
- **Edge case:** Frame 0 audit FAIL → shift START_FRAME of segment 1
  forward; re-render; re-audit. Iterate up to 3 times before routing
  to different Option.
- **Edge case:** R3 audio-lead detected → investigate filter_complex
  PTS; fall back to Approach 2b per-segment.
- **Edge case:** 9:16 verdict NEEDS-RECOMPOSE → skip; document; do
  NOT recompose from Phase 7.
- **Security:** No shell-string interpolation; all argv arrays.

**Verification:**

- `out/trailer-x-cutdown.mp4` (and conditionally `.9-16.mp4`) exist
  at spec.
- `cutdown-eval.md` documents render + audits + verdicts.
- `briggsy-review-7.1.signoff` committed.

---

### Unit 7.1b — Release Asset Provisioning

- [ ] **Unit 7.1b: Release Asset Provisioning**

**Goal:** Publish trailer + cutdown + thumbnail derivative as
GitHub Release assets BEFORE any README is committed referencing
them. Eliminate the placeholder-URL window adversarial Attack 3
identified.

**Requirements:** Adversarial Attack 3 mitigation; ADR #29 README
embed mechanism inheritance (Release URL is the fallback if drag-
drop user-attachments fails or for second-impression linkbacks).

**Dependencies:** Unit 7.1 atomic-swap complete (final cutdown
exists on disk). Phase 6 `docs/trailer/thumbnail.jpg` derivative
present (cross-phase amendment — see below).

**Files:**

- Create: `scripts/publish-trailer-release.ts`.
- Create: `videos/trailer/distribution/release-notes.md` (per
  feasibility F2 + scope-guardian SG2 Phase 7 doc-review —
  pre-doc-review plan invoked `--notes-file` without specifying who
  created the file; `gh release create` would fail on first run).
- Create: `videos/trailer/distribution/release-urls.json` (output).
- Create: GitHub Release `burned-origin-trailer-v1` (remote).

**Approach:**

**Step 0 — Pre-flight authentication + release-notes authoring.**

Per security-lens S3 + feasibility F2 + scope-guardian SG2 Phase 7
doc-review. Two preconditions blow up `gh release create` at mid-
workflow if not staged:

```ts
// 0a. Confirm gh auth + target repo access
execFileSync('gh', ['auth', 'status']);                 // exits non-zero if unauthenticated
execFileSync('gh', ['repo', 'view', 'mbriggsy/burned']); // confirms target repo access

// 0b. Author release-notes.md
import { writeFileSync, existsSync } from 'node:fs';
const notesPath = 'videos/trailer/distribution/release-notes.md';
if (!existsSync(notesPath)) {
  writeFileSync(notesPath, [
    '# BURNED Origin Trailer v1',
    '',
    'A ~95-second Archer-tone origin trailer for BURNED — autonomous-SDLC',
    'party game built end-to-end by Claude under ATC direction.',
    '',
    'Assets:',
    '- `trailer.mp4` — 95s flagship (1920×1080, H.264 CRF 18, AAC 128k mono).',
    '- `trailer-x-cutdown.mp4` — 12s X-native cutdown.',
    '- `thumbnail.jpg` — 1200×675 README/portfolio derivative.',
    '',
    'See [BURNED README](https://github.com/mbriggsy/burned#trailer) for context.',
    '',
  ].join('\n'));
}
```

**Step 1 — Pre-flight size assertion.**

```ts
import { statSync } from 'node:fs';
const sizes = {
  flagship: statSync('videos/trailer/out/trailer.mp4').size,
  cutdown: statSync('videos/trailer/out/trailer-x-cutdown.mp4').size,
  cutdown_9_16: tryStat('videos/trailer/out/trailer-x-cutdown-9-16.mp4'),
  thumbnail_jpg: statSync('docs/trailer/thumbnail.jpg').size,
};
const GITHUB_RELEASE_CAP_BYTES = 2 * 1024 * 1024 * 1024; // 2 GiB per asset
for (const [name, size] of Object.entries(sizes)) {
  if (size > GITHUB_RELEASE_CAP_BYTES) {
    throw new Error(`${name} exceeds 2 GiB Release asset cap; fall back to R2-via-Pages-Function`);
  }
}
```

Trailer at ~200 MB clears 2 GiB cap by 10×; this is a safety net,
not an expected failure path.

**Step 2 — Publish Release via `gh` CLI.**

```ts
import { execFileSync } from 'node:child_process';

// SAFE: argv array
const tag = 'burned-origin-trailer-v1';
const title = 'BURNED Origin Trailer';
const notesFile = 'videos/trailer/distribution/release-notes.md';

// Create release with assets — explicit --repo per security-lens S3
// (CWD-implicit target was risky if script runs outside repo root)
execFileSync('gh', [
  'release', 'create', tag,
  '--repo', 'mbriggsy/burned',
  '--title', title,
  '--notes-file', notesFile,
  'videos/trailer/out/trailer.mp4',
  'videos/trailer/out/trailer-x-cutdown.mp4',
  'docs/trailer/thumbnail.jpg',
  // conditionally include 9:16 if rendered:
  // 'videos/trailer/out/trailer-x-cutdown-9-16.mp4',
]);

// Capture asset URLs — explicit --repo
const releaseJson = execFileSync('gh', [
  'release', 'view', tag, '--repo', 'mbriggsy/burned', '--json', 'assets'
]).toString();
const assets = JSON.parse(releaseJson).assets;
const urls = Object.fromEntries(
  assets.map((a: any) => [a.name, a.url])
);

writeFileSync(
  'videos/trailer/distribution/release-urls.json',
  JSON.stringify({ tag, urls, published_at: new Date().toISOString() }, null, 2)
);
```

**Step 3 — Briggsy review + sentinel.**

Output `release-urls.json` reviewed by Briggsy; URLs work; Release
visible on github.com. On approval, commit `briggsy-review-7.1b.signoff`.

**Patterns to follow:**

- GitHub CLI `gh release create` (Context7-verified, 2 GiB asset cap).
- ADR #22 sentinel ceremony.
- Project security: `execFileSync` argv.

**Test scenarios:**

- **Happy path:** Release published; URLs captured; visible on
  github.com.
- **Edge case:** Asset >2 GiB → fall back to R2-via-Pages-Function
  (rare for trailer at 200 MB; documented in Cross-Phase Amendments
  if Phase 7 ever hits it).
- **Edge case:** `gh` CLI not authenticated → Step 0a's `gh auth
  status` exits non-zero before any work; operator runs `gh auth
  login` (Briggsy execution, not Claude); re-run from Step 0.
- **Edge case:** tag `burned-origin-trailer-v1` already exists (prior
  failed attempt) → `gh release create` exits with "already exists";
  operator deletes the prior release via `gh release delete
  burned-origin-trailer-v1 --repo mbriggsy/burned --yes` (Briggsy
  execution) AND deletes the git tag (`git push origin :refs/tags/
  burned-origin-trailer-v1`); re-run Step 0 (per adversarial residual
  risk Phase 7 doc-review — pre-doc-review had no recovery path).

**Verification:**

- `release-urls.json` exists and contains valid CDN URLs.
- Release `burned-origin-trailer-v1` visible at github.com/mbriggsy/burned/releases.
- All 3-4 assets attached and downloadable.
- `briggsy-review-7.1b.signoff` committed.

---

### Unit 7.2 — Portfolio Embed (GitHub README)

- [ ] **Unit 7.2: Portfolio Embed (GitHub README)**

**Goal:** Embed the trailer on `projects/burned/README.md` using the
GitHub user-attachments drag-drop mechanism (ADR #29) — the ONLY
mechanism that produces an inline `<video>` player in README. Land
the embed as `## Trailer` section BEFORE `## Status`, in hero-
second position per frontend-design + design-lens convergence.

**Requirements:** ADR #29 (drag-drop user-attachments URL); README
hero-second placement per frontend-design.

**Dependencies:** Unit 7.0 sentinel (verified-stats.json for embed
copy); Unit 7.1 cutdown exists; Unit 7.1b Release published (fallback
URLs); Phase 6 `docs/trailer/thumbnail.jpg` derivative present.

**Files:**

- Edit: `projects/burned/README.md` (add `## Trailer` section before
  `## Status`).
- Create: `videos/trailer/distribution/portfolio-embed.md` (procedure
  + canonical Markdown).
- Create: `videos/trailer/distribution/briggsy-review-7.2.signoff`.

**Approach:**

**Step 1 — README design system audit (re-anchored per feasibility F3
Phase 7 doc-review).**

Per frontend-design audit: the BURNED README is already restrained
Archer-coded (no badges, no emoji, no hero image, no marketing
voice). Plain `##` headings, table for tech stack, code-block for
project structure. **The README passes the bar.** No README rewrite
needed; the trailer embed slots into the existing typographic
system.

Current README structural anchors (verified 2026-05-17):
- Line 8 area — opening paragraph.
- `## Play` (line ~10) — live URL + Board/Phone/Operations table.
  Hero-FIRST slot, already occupied.
- `## Project Map` (line ~20) — directory map.
- `## Status` (line ~39) — phase + bundle stats.

**Lock** (corrected per feasibility F3 — pre-doc-review missed
`## Play` and the placement was structurally ambiguous): `## Trailer`
section sits **AFTER `## Play`** (preserving live game URL as
hero-FIRST) and **BEFORE `## Project Map`** (hero-SECOND). The
opening paragraph → live game CTA → trailer hero → Project Map flow
keeps the playable-game one click from the top while making the
trailer the second thing a visitor sees. Engineering-Twitter
visitors arriving from Post 1 land on the welcome mat AND find a
working playable build immediately above the trailer; existing
contributors retain the Project Map below.

**Step 2 — Drag-drop user-attachments procedure (ADR #29).**

GitHub Markdown sanitizer strips HTML `<video>` and `<iframe>`.
Markdown image-link to Release MP4 renders as clickable thumbnail-
to-download, NOT inline player. The ONLY mechanism producing an
inline `<video>` player in README is the drag-drop user-attachments
URL pattern.

Procedure (Briggsy execution; Claude documents):

1. On github.com, navigate to `projects/burned/README.md` and click
   the pencil ✎ edit button.
2. Position cursor immediately AFTER the `## Play` table and BEFORE
   `## Project Map` (per Step 1 lock).
3. Type `## Trailer` and a blank line.
4. Drag `videos/trailer/out/trailer-x-cutdown.mp4` from local
   filesystem directly into the markdown editor buffer.
5. GitHub auto-uploads the MP4 and injects an HTML5 `<video>`
   element wrapping a `https://github.com/user-attachments/assets/<UUID>`
   URL. This URL renders as an inline video player on README.
6. Below the inline video, paste the canonical context paragraph
   (Step 3 below).
7. Below the context paragraph, paste the inline-text fallback links
   to Release assets (Step 3 below).
8. Commit the change via the web editor with message
   `docs(burned): add origin trailer to README — Phase 7 Unit 7.2`.
9. **Capture the live URL back** (per adversarial A3 + Phase 7
   exit condition #4 Phase 7 doc-review — `<UUID-cutdown>` is
   otherwise an unreproducible placeholder in committed artifacts):

   ```ts
   // scripts/capture-readme-attachment-url.ts
   import { execFileSync } from 'node:child_process';
   import { readFileSync, writeFileSync } from 'node:fs';
   execFileSync('git', ['pull', '--ff-only', 'origin', 'main']);
   const readme = readFileSync('projects/burned/README.md', 'utf8');
   const m = readme.match(
     /https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]+/i
   );
   if (!m) throw new Error('No user-attachments URL found in README post-drag-drop');
   const urlsPath = 'videos/trailer/distribution/release-urls.json';
   const urls = JSON.parse(readFileSync(urlsPath, 'utf8'));
   urls.user_attachments_cutdown_url = m[0];
   writeFileSync(urlsPath, JSON.stringify(urls, null, 2));
   // Also update portfolio-embed.md to substitute the real UUID
   // (so the local-tracked artifact matches the live README).
   ```

   Briggsy runs this script after the web-editor commit lands on
   `origin/main`. `release-urls.json` then carries the live URL for
   future README regenerations + audit; `portfolio-embed.md`'s
   canonical-markdown block is updated to show the live URL instead
   of `<UUID-cutdown>`.

**Critical caveat per ADR #29**: the GitHub user-attachments
mechanism has a **10 MiB free / 100 MiB paid attachment cap** (MiB
not MB — binary, ~4.86% smaller than decimal MB at the boundary;
per adversarial A9 Phase 7 doc-review). Verify against current
`https://docs.github.com/en/get-started/writing-on-github/working-
with-advanced-formatting/attaching-files` at Phase 7 execution time
(GitHub may revise caps; date-pin the verification in
`portfolio-embed.md`). BURNED flagship at 95s / CRF 18 / `-preset
slow` is approximately 150–250 MB — **exceeds the user-attachments
cap on any plan**.

**Phase 7 implication**: We CANNOT inline-embed the full flagship
trailer via user-attachments. Options (re-evaluated against
GitHub plan state from Entry Gate per adversarial A8 Phase 7
doc-review):

(a) ~~**Briggsy upgrades to GitHub Pro/Paid**~~ → cardinal-rule
violation (Briggsy is ATC; account upgrades aren't automatable).
Even if upgraded, 100 MiB cap still doesn't fit a 150–250 MB
flagship. NOT option-space; cut.

(b) **Use the cutdown for inline embed**, link to flagship via
Release asset.
- Cutdown at ~25–40 MB clears 100 MiB paid cap ONLY (Pro+).
- Cutdown at ~25–40 MB **exceeds** 10 MiB free cap; this branch
  requires Briggsy on Pro+ per Entry Gate `account-state.md`.
- On Pro+: **drag-drop the CUTDOWN as the inline-played embed; link
  to flagship via Release URL below it.**

(c) **Re-encode cutdown at higher CRF** (e.g., CRF 24-26) for an
"attachment-friendly" cutdown that fits 10 MiB free cap. Quality
trade-off; defeats the bar-raise. Reserved for GitHub Free fallback.

(d) **Skip inline embed; use clickable-thumbnail-to-Release on the
FLAGSHIP.** `docs/trailer/thumbnail.jpg` (Phase 6 derivative) wraps
a markdown image-link to `trailer.mp4` Release URL. Less native-
feeling but reliable across all plans; preserves flagship-as-hero
shape (the 95s trailer is the headline asset).

**Lock — branched by Entry Gate `account-state.md` GitHub plan**:
- **GitHub Pro / Team / Enterprise (Briggsy on paid)**: option (b)
  — drag-drop cutdown inline. **Trade-off explicit per
  product-lens P4 Phase 7 doc-review**: the README's hero-second
  visual is the 12s cutdown, not the 95s flagship. Engineering-
  Twitter visitors clicking through from Post 1 may have just
  watched the cutdown on X. We accept the re-watch cost in exchange
  for (i) inline player removes a click-through to a Release URL
  that may 404 during the placeholder window if Release publish
  drifts, (ii) inline player auto-loops which keeps a visitor on
  the page longer than a download-thumbnail click, (iii) the
  Release CTAs below the embed still surface the flagship for
  direct-visit traffic that didn't come from X.
- **GitHub Free**: option (d) — clickable-thumbnail-to-Release on
  flagship. State explicitly in `portfolio-embed.md` that this
  branch was chosen for plan-state, not preference.

**Step 3 — Canonical Markdown.**

After drag-drop in Step 2 + URL-capture in Step 2 substep 9, the
README section reads (final Markdown — both the inline-video URL
and the Release CTA URLs are LIVE, not `<UUID>` placeholders):

```md
## Trailer

https://github.com/user-attachments/assets/<live UUID from Step 2 substep 9>

A 12-second highlight of the 95-second origin trailer for BURNED —
an Archer-tone party game built end-to-end by Claude under ATC
direction.

[Full trailer (95s)](https://github.com/mbriggsy/burned/releases/download/burned-origin-trailer-v1/trailer.mp4) · [X-native cutdown (12s)](https://github.com/mbriggsy/burned/releases/download/burned-origin-trailer-v1/trailer-x-cutdown.mp4)
```

**UMB cross-reference handling per design-lens D4 Phase 7
doc-review**: pre-doc-review draft included a cross-link to UMB v3
with "second proof point" framing. The risk row + Variation C
sidecar already acknowledge UMB v3 has no distribution baseline /
no documented reception. Putting "second proof" into the long-lived
README artifact bakes an unverified claim — drop from README copy;
keep the engineering-mystique framing ("built end-to-end by Claude
under ATC direction") which is self-supporting. If the D+30
retrospective confirms the "second proof" framing resonated on X,
amend the README copy in a future commit. Until then the README
copy reads cold without depending on audience memory of UMB v3.

Notes on the canonical markdown:
- The bare `https://github.com/user-attachments/...` URL is what
  GitHub renders as inline `<video>` (NOT `[![thumb](png)](url)`
  wrapping).
- Two-line context paragraph matches the opening paragraph's cadence.
- Interpunct (·) CTA separator matches Project Map convention.
- No badges, no emoji, no marketing voice (respects README design
  system per frontend-design audit).
- Asset URLs in the CTAs are GitHub Release URLs from
  `release-urls.json` (Unit 7.1b output). Pasted at write time;
  never committed as placeholders. The user-attachments URL is also
  captured back into `release-urls.json` (Step 2 substep 9) so the
  source-of-truth lives in version control.

**Step 4 — Caveats document.**

`portfolio-embed.md` documents the procedure + caveats:

```md
# Portfolio Embed — Phase 7 Unit 7.2

## Primary surface: GitHub README

### Mechanism (ADR #29)
- DO use: drag-drop into github.com web editor → user-attachments URL
- DO NOT use: Markdown image-link to Release MP4 (renders as
  download link, not inline player)
- DO NOT use: HTML `<video>` tag in README (GitHub sanitizer strips)

### Attachment cap caveats
- User-attachments cap: 10 MB free / 100 MB paid
- Flagship (~200 MB) does NOT fit; cutdown (~25-40 MB) does
- LOCK: drag-drop CUTDOWN as inline embed; link flagship via Release URL

### Procedure
[per Step 2 above]

### Canonical Markdown
[per Step 3 above]

## Deferred surfaces (Briggsy execution, NOT Phase 7 scope)

### YouTube unlisted
- Optional secondary hosting; Briggsy preference.
- Trade-off: YouTube re-encoding pipeline may degrade quality
  compared to GitHub-Release-hosted MP4.
- Defer to Briggsy at execution time.

### Personal portfolio site
- Defer to Briggsy at execution. Design tokens / page structure
  live on whichever portfolio-site plan exists, not here. (Per
  scope-guardian SG7 Phase 7 doc-review — pre-doc-review specced
  full design tokens for a surface that conditionally exists,
  framework-ahead-of-need.)
```

**Patterns to follow:**

- ADR #29 user-attachments mechanism.
- frontend-design README hero-second placement (Tier 1.1).
- frontend-design portfolio-site design tokens (Tier 2.1).
- Phase 7 Unit 7.0 verified-stats for context paragraph numbers.

**Test scenarios:**

- **Happy path:** Cutdown drag-drop succeeds; user-attachments URL
  injected; inline player works on github.com README view; Release
  URLs in CTAs resolve.
- **Edge case:** Drag-drop fails (network glitch) → retry; if
  persistent, fall back to clickable-thumbnail-to-Release pattern
  (less native but works).
- **Edge case:** Cutdown >10 MB on Briggsy's free account → Briggsy
  upgrades to paid OR re-encode cutdown at higher CRF.
- **Edge case:** Release URLs from Unit 7.1b not yet captured at
  README write time → block Unit 7.2 until Unit 7.1b sentinel
  commits.

**Verification:**

- `projects/burned/README.md` updated; `## Trailer` section sits
  before `## Status`.
- Inline player renders on github.com (verify via browser).
- CTAs resolve to Release assets.
- `portfolio-embed.md` documents the procedure.
- `briggsy-review-7.2.signoff` committed.

---

### Unit 7.3 — X Post Copy

- [ ] **Unit 7.3: X Post Copy**

**Goal:** Draft the X post copy for the 3-beat burst sequence (ADR
#27) using verified stats from Unit 7.0 (ADR #26). Output: post
drafts ready for X composer paste at D+0 T+0.

**Requirements:** ADR #26 stat verification; ADR #27 3-beat burst
sequence; emil's caption X-rendering verification.

**Dependencies:** Unit 7.0 sentinel (`verified-stats.json` present);
Unit 7.1 atomic-swap complete (cutdown exists, attachment-ready);
Unit 7.1b Release published; Briggsy X account state recorded.

**Files:**

- Create: `videos/trailer/distribution/x-post.md` (all 4 post
  drafts: Post 1, Post 2, Post 2b, Post 3 pinned).
- Create: `videos/trailer/distribution/caption-rendering-verification.png`
  (composer screenshot per locked caption).
- Create: `videos/trailer/distribution/briggsy-review-7.3.signoff`.
- Move (NOT delete): `videos/trailer/distribution/caption-variants-
  considered.md` (B/C alternates retained as sidecar; scope-guardian).

**Approach:**

**Step 1 — Caption variant matrix (per CALL-1 + CALL-5 + CALL-6
Phase 7 doc-review).**

Per stat-verification gate (Unit 7.0): caption uses canonical numbers
matching the LOCKED trailer narration at Phase 1 line 1086 — "Six
in the deck. One on the research budget. Don't ask." (Per design-
lens D2: pre-doc-review captions said "in the basement," which was
Phase 1 fiction retracted during Phase 1 doc-review.)

**CALL-5 — Drop `...Phrasing.` caption tag** (project-burned-
sterling-coded-voice.md: voice rule is Sterling-CODED cadence
mimicry, NEVER Benjamin-cloned identity). The catchphrase verbatim
on a launch tweet is costume, not cadence — exactly the identity-
replication move the rule forbids. PRODUCT-SPECIFICATION §3.5 ✅
surfaces for "Phrasing!" are random flavor pools, AnnouncementFeed,
DramaOverlay, Lobby/idle text — distribution copy is not on that
list. A deadpan period-broken stinger ("Don't ask about Agent X.")
delivers the cadence without naming the catchphrase. Removed from
all caption variants.

**CALL-1 + CALL-6 — Decouple character-cap from audience-fit
message** (per product-lens P1 + P10). Pre-doc-review variant matrix
was structured (account-state)-as-content-gate: Variation A leads
"party game," Variation D adds the engineering claim only if
Premium unlocks the longer cap. But the engineering-peer audience
(locked per project context) doesn't need 25k chars — a 280-char
engineering-peer-lead variant fits the free tier and the link-
demotion-free rule. The decision matrix is (account-state) ×
(audience-fit), not account-state-as-content-gate.

Three variants drafted; Briggsy locks one per audience-fit choice:

**Variation A (party-game-lead — in-universe, non-Premium-safe)**
(~190 chars):

> *"BURNED. An Archer-tone party game.*
>
> *17 illustrations. 120 operations. Six operatives in the deck,
> one on the research budget.*
>
> *Don't ask about Agent X."*
>
> *[attached: trailer.mp4]*

**Variation A-alt (engineering-peer-lead — agentic-SDLC hook,
non-Premium-safe, no links)** (~265 chars; new per CALL-1):

> *"BURNED — Archer-tone party game built end-to-end by Claude under
> ATC direction. Second proof the autonomous-SDLC method ships
> repeatably (UMB v3 was the first).*
>
> *17 illustrations. 120 operations. Six in the deck, one on the
> research budget. Don't ask about Agent X."*
>
> *[attached: trailer.mp4]*

(No link → no link-demotion penalty; engineering claim is in the
first sentence so it lands at scroll-stop. UMB v3 framed as audience
context, not as load-bearing cross-link — works even if reader has
no UMB recognition.)

**Lock-choice rationale required** (per product-lens P1 — pre-doc-
review default to A was structural mismatch with the engineering-
peer audience). Briggsy explicitly picks Variation A vs A-alt at
sign-off; the chosen variant is documented in `x-post.md` with a
one-line rationale ("party-game-first because [reason]" or
"engineering-peer-lead because [reason]"). Auto-default no longer
exists; the audience-fit choice must be deliberate, not silently
inherited from caption-ordering.

**Step 2 — Variation D sidecar (Premium-only extended).**

Per scope-guardian + repo-research: B/C variants retained as
sidecar at `caption-variants-considered.md` for retrospective only,
NOT in Phase 7 plan body. Decision theater eliminated.

Variation D — drafted IF Briggsy account state = Premium / Premium
Plus per entry gate AND Briggsy picks long-form over short. Even
on Premium, links are higher-risk than no-links; Variation A or
A-alt remain the safer defaults; D is an unlock not a recommendation.
Pre-doc-review Variation D included a placeholder `https://...` UMB
link; per design-lens deferred question + product-lens P2 Phase 7
doc-review, omit the UMB cross-link entirely from Variation D too
(UMB v3 reception is undocumented; the cross-reference is
unverified-claim-territory).

**Variation D draft** (~340 chars, Premium-only):

> *"BURNED — Archer-tone party game built end-to-end by Claude under
> ATC direction.*
>
> *17 illustrations. 120 operations. Six in the deck, one on the
> research budget.*
>
> *Second proof the autonomous-SDLC method ships repeatably. The
> first time wasn't a lucky shot.*
>
> *Don't ask about Agent X."*

**Step 3 — Post 2 (cutdown self-reply at T+90min).**

Self-reply to Post 1 (NOT quote-tweet — preserves algo momentum
window per ADR #27).

> *"Highlight reel — 12 seconds of the load-bearing beat.*
>
> *[attached: trailer-x-cutdown.mp4]"*

Brief. The cutdown carries the load. Caption is a thumbnail-of-the-
thumbnail; doesn't compete with the video.

Quoted to: none (self-reply, not quote-tweet).

**Step 4 — Post 2b (tooling-stack self-reply at T+2-3h).**

Self-reply to Post 2. Engineering-Twitter "how it was built" thread
beat per best-practices T2.5.

**Critical edit**: tooling-stack content is GENUINE technical
disclosure, NOT a verbal repeat of R15 chrome signaling. Per
chyron-is-the-joke rule + scope-guardian: R15 #1-#4 stamps already
carry the agentic-SDLC signal inside the trailer. Repeating it in a
caption violates the "never visual-and-overlay punchline
simultaneously" rule.

> *"Stack —*
>
> *Cloudflare Workers Durable Objects (server/multiplayer state).*
> *React 19 + Framer Motion (phone controller + TV view).*
> *Remotion 4.0 (trailer composition + render).*
> *Imagen 4 (17 card illustrations).*
> *Claude Code (the rest)."*

(~250 chars. No links — link-demotion regime. Verifiable claims:
each line corresponds to a real dependency in `package.json` /
`videos/trailer/package.json`. No "14,000 pages" fabrication. No
R15 echo.)

**Step 5 — Post 3 (pinned, D+0 evening per CALL-2 + product-lens P6
revised pin timing — see Unit 7.4).**

Pinned tweet stays at top of profile. Ever-green, self-contained,
worth repeated impressions.

> *"BURNED.*
>
> *An Archer-tone party game. Built by Claude under ATC direction.*
>
> *Operation Pendleton — second proof."*
>
> *[attached: trailer.mp4]*

Reads cold; sells the engineering claim without explaining it.
References Pendleton agency in-universe term.

**Step 6 — X composer rendering verification (emil's check — all 4
posts per design-lens D3 Phase 7 doc-review).**

Pre-doc-review Step 6 ran the rendering check on the "locked
variant" only (Post 1). Post 2 / Post 2b / Post 3 also contain
em-dash glyphs and (Post 3 especially) are long-lived; an autoformat
collapse on the pin bakes the artifact for the life of the pin.
Extend Step 6 to ALL FOUR posts:

Before posting, paste each post's caption into the X composer (DO
NOT post). Screenshot the composer preview for each:
- `caption-rendering-verification-post1-{A|A-alt|D}.png`
- `caption-rendering-verification-post2-cutdown.png`
- `caption-rendering-verification-post2b-stack.png`
- `caption-rendering-verification-post3-pinned.png`

Verify on each:

- Em-dash (`—`) renders correctly, NOT collapsed to hyphen on
  clipboard round-trip.
- Periods land as periods, not absorbed into auto-ellipses.
- Line breaks render as intended (X composer's preview vs published).
- (Post 2b only) the stack list items each survive on their own line.

Briggsy reviews; on approval, sign off.

**Step 7 — Documentation.**

`x-post.md`:

```md
# X Post Copy — Phase 7 Unit 7.3

## Account state (from entry gate)
- Briggsy X: <Premium / Premium Plus / free>
- Briggsy GitHub: <Free / Pro / Team / Enterprise>
- Variation lock: <A | A-alt (engineering-peer-lead) | D (Premium only)>
- Lock rationale: <one-line audience-fit justification per CALL-1>

## Post 1 (flagship launch, T+0)
- Caption: <variant locked per audience-fit choice>
- [draft per Step 1/Step 2]
- Character count: ~190 (A) / ~265 (A-alt) / ~340 (D)
- Attached media: out/trailer.mp4
- Posting time: D+0 (Tue/Wed) 10am ET
- Rendering verified: caption-rendering-verification-post1-{variant}.png

## Post 2 (cutdown self-reply, T+90min)
- Self-reply (NOT quote-tweet) to Post 1 — ADR #27
- [draft per Step 3]
- Attached: out/trailer-x-cutdown.mp4

## Post 2b (tooling-stack self-reply, T+2-3h)
- Self-reply to Post 2
- [draft per Step 4]
- No links (link-demotion regime)

## Post 3 (pinned, D+7)
- Pinned to profile
- [draft per Step 5]
- Pin replace condition: Unit 7.7 sentinel
```

**Patterns to follow:**

- ADR #26 stat-verification gate (verified-stats.json).
- ADR #27 3-beat burst self-reply pattern.
- emil's X composer rendering verification.
- `feedback-stats-single-source.md` discipline.
- `feedback-wow-over-simplicity.md` — caption should make reader
  want to click + watch, not over-explain.

**Test scenarios:**

- **Happy path:** All 4 post drafts within X character caps; rendering
  verification PASS; Briggsy signs off.
- **Edge case:** Variation A renders weird in X composer (ellipsis
  autoformat) → switch to explicit Unicode or restructure.
- **Edge case:** Briggsy account state = Premium → unlock Variation
  D; document the choice.
- **Edge case:** A stat from verified-stats.json doesn't match
  trailer narration → reconcile (re-verify codebase OR re-run Phase
  6 Unit 6.7 if narration is wrong).

**Verification:**

- `x-post.md` documents all 4 post drafts.
- `caption-rendering-verification-{variant}.png` screenshots saved.
- Stats in copy match `verified-stats.json` exactly.
- `briggsy-review-7.3.signoff` committed.

---

### Unit 7.4 — Distribution Plan + Post Calendar (absorbs prior Unit 7.5 metrics)

- [ ] **Unit 7.4: Distribution Plan + Post Calendar**

**Goal:** Schedule the 3-beat burst sequence + cross-surface
promotion + metrics-logging template, all in one calendar file. Per
scope-guardian: pre-deepening Unit 7.5 metrics-tracking.md folds in
as a `## Metrics Log` section in this file.

**Requirements:** ADR #27 3-beat burst; insight 052 "promotion not
production" framing; scope-guardian cuts to LinkedIn / portfolio-
site / repost contingencies.

**Dependencies:** Units 7.0, 7.1, 7.1b, 7.2, 7.3.

**Files:**

- Create: `videos/trailer/distribution/post-calendar.md` (one file;
  includes the metrics log template per scope-guardian).
- Create: `videos/trailer/distribution/briggsy-review-7.4.signoff`.

**Approach:**

**Step 1 — 3-beat burst calendar (D+0 same-day).**

| Time (ET) | Action | Surface |
|-----------|--------|---------|
| D+0 (Tue or Wed) 09:30am | Run `pnpm verify:cutdown-ready` (Unit 7.6) | local |
| D+0 09:45am | Briggsy `.signoff` Unit 7.6 sentinel | local |
| D+0 10:00am (T+0) | **Post 1 — flagship launch** with verified-stats caption | X |
| D+0 10:30am | Update GitHub README via drag-drop user-attachments (Unit 7.2 procedure) | GitHub |
| D+0 11:30am (T+90min) | **Post 2 — cutdown self-reply** | X |
| D+0 noon | Share to Discord (Briggsy's call which channels per `user_harry.md`) | Discord |
| D+0 12:00–13:00 (T+2-3h) | **Post 2b — tooling-stack self-reply** | X |
| D+0 evening (after Post 2b lands) | **Pin Post 1** + post the pinned Post 3 separately if Variation D-style pin is chosen | X |
| D+0 evening | Informal impression check (no public action) | local |
| D+1 morning | D+1 metrics log entry (impressions, watch-through, method-signal count) | local |
| D+30 | Full retrospective; memory-promote per insight 052 IF surprising; ADR #27 falsification check | local |
| new-project ship (Unit 7.7 trigger #2) OR D+360 reconsideration | Unit 7.7 pin replacement OR keep-pin verdict | X |

(**Pin-at-D+0-evening per CALL-2 + product-lens P6 Phase 7
doc-review**. Pre-doc-review locked "D+7 pin" with no rationale —
which leaves the flagship unpinned through the 50-70% impression
window the rest of the plan optimizes for. Profile visitors driven
to the profile by the 3-beat burst at D+0-T+0/+90/+180 should land
on the trailer pinned at the top, not on the prior pin. D+0 evening
— AFTER the burst completes — pins immediately after the high-
impression window stabilizes. The D+7 row in the pre-doc-review
calendar is collapsed into D+0 evening.)

**Step 2 — Cross-surface promotion (scope-cut: 3 rows only).**

| Surface | Action | Timing |
|---------|--------|--------|
| X (primary) | 3 posts in burst + 1 pinned | D+0 T+0/T+90min/T+2-3h + D+7 |
| GitHub README | Drag-drop inline embed + Release CTAs | D+0 ~10:30am |
| Discord | Plain link share (Briggsy's channels) | D+0 noon |

(LinkedIn + personal portfolio site rows cut per scope-guardian
T2.1. YouTube unlisted deferred to Briggsy execution; not in
calendar.)

**Step 3 — Fallback / contingency plan.**

| Contingency | Response |
|-------------|----------|
| `pnpm verify:cutdown-ready` returns RED at 09:30am | Investigate; postpone post to next slot (Wed if Tue, next Tue if Wed); do not skip the verify |
| Post 1 upload fails mid-upload | Retry from same network; if 2× fails, switch network (mobile hotspot fallback); do NOT skip to lower-bitrate re-encode (X re-encodes regardless) |
| Post 2 self-reply lands on wrong thread (UI mistake) | Delete + repost as self-reply; one delete is acceptable |
| Engineering-Twitter saturation on launch day (major event) | Calendar avoids known industry-event days; reschedule by 1 week if conflict surfaces D-1 |
| X video upload fails (format / cap / network) | Re-upload after verify; ultimate fallback is Release asset link in Post 1 (link-demotion accepted as last resort) |
| GitHub README drag-drop fails | Fall back to clickable-thumbnail-to-Release; document the fallback in `portfolio-embed.md` |
| Negative criticism (technical or aesthetic) | Brief acknowledgment if substantive; ignore trolls; trailer artifact stands |
| Significant engagement (>1k impressions, >50 replies) | Engage thread reply for ~4 hours D+0 + D+1; document interesting feedback in retrospective |

(Scope-cut: removed pre-deepening "<10 impressions repost" row per
best-practices algo concern — reposting same content within 24h
triggers engagement-bait detection.)

**Step 4 — Metrics log (absorbed from prior Unit 7.5).**

Per insight 052 "instrumentation is promotion not production": X
Analytics is the pre-existing instrumentation. Phase 7 work at D+30
is moving signals to memory, NOT building a dashboard.

```md
## Metrics Log

**Success criterion** (per CALL-7 + product-lens P8 Phase 7
doc-review): for an engineering-proving-ground artifact, the
load-bearing signal is "did engineering-peer audiences register
the autonomous-SDLC method claim?" — NOT raw impressions or
engagement rate. Impressions are context, not goal. 100 impressions
with 5 method-mentions is a win; 50,000 impressions with 0
method-mentions is a wrong-audience failure. The metrics below
LEAD with method-signal counts.

### D+1 (24 hours after launch) — method-signal-first
- Method-signal mentions Post 1 (replies/QTs/DMs referencing AI /
  agent / autonomous / Claude / "built by" unprompted): <N>
- "How did you build this" / "what stack" DMs or replies: <N>
- UMB v3 cross-reference recognition (replies mentioning UMB
  unprompted): <N>
- X impressions Post 1 (context): <N>
- X engagement rate Post 1 (context): <N%>
- X full-trailer watch-through (if data available): <%>
- Post 2 cutdown impressions: <N>
- Post 2b stack-thread impressions: <N>
- Discord shares + DM signal: <N>
- Notable replies / DMs verbatim: <list>

### D+7 (1 week)
- Cumulative method-signal mentions: <N>
- Cumulative X impressions: <N>
- Watch-through trend: <stable / declining / growing>
- Pin still on Post 1: <yes/no>

### D+30 — Retrospective + memory promotion + ADR #27 falsification
- Cumulative method-signal mentions: <N>
- Cumulative impressions (context): <N>
- Did the §2 Archer test resonate? (replies mentioning Archer): <N>
- Did cutdown outperform flagship? (compare watch-through rates): <verdict>
- **ADR #27 (3-beat burst) falsification check** per adversarial A5
  Phase 7 doc-review:
  - If Post 1 cumulative impressions account for >85% of thread
    impressions: 3-beat burst hypothesis WEAKLY DISCONFIRMED;
    next-project default reverts to single-post + delayed pin.
  - If Post 2/2b each crossed >10% of Post 1 impressions: 3-beat
    burst hypothesis CONFIRMED; pattern propagates forward.
  - Anything between: AMBIGUOUS; collect a second project's data
    before locking either direction.
- **MEMORY-PROMOTION**: surprising signals → `~/.claude/projects/.../memory/`
  per `feedback-make-a-note.md`. UNSURPRISING signals stay logged here.
```

Per scope-guardian: D+30 retrospective is NOT a recurring process for
one trailer; it's a one-shot memory-promotion gate. Future trailers
inherit the pattern, NOT a dashboard.

**Step 5 — Briggsy sign-off.**

`briggsy-review-7.4.signoff` after Briggsy approves the calendar.

**Patterns to follow:**

- ADR #27 3-beat burst.
- Insight 052 promotion-not-production framing.
- `feedback-stats-single-source.md` discipline (log real numbers
  from X Analytics).
- `feedback-make-a-note.md` for memory-promotion at D+30.

**Test scenarios:**

- **Happy path:** Calendar followed; D+1 metrics logged; pin at
  D+7; D+30 retrospective.
- **Edge case:** Briggsy unavailable during default slot → use X
  Scheduling built-in feature OR reschedule D+0 by 1 day.
- **Edge case:** Critical engineering-Twitter event same day →
  reschedule by 1 week.

**Verification:**

- `post-calendar.md` documents the schedule + cross-surface table +
  contingencies + metrics log template.
- `briggsy-review-7.4.signoff` committed before D+0.

---

### Unit 7.6 — Pre-Post Verify Gate

- [ ] **Unit 7.6: Pre-Post Verify Gate**

**Goal:** Deterministic GO/NOGO check within 60min of Post 1 time.
Catches drift between Phase 7 unit completion and posting moment
(e.g., file corruption, missing assets, encoding drift).

**Requirements:** Feasibility F3 fix — Phase 7 needs a pre-flight
gate equivalent to Phase 6 Unit 6.0 `verify:trailer-final`.

**Dependencies:** Units 7.0 / 7.1 / 7.1b / 7.2 / 7.3 / 7.4 all
complete.

**Files:**

- Create: `scripts/verify-cutdown-ready.ts`.
- Create: `videos/trailer/distribution/briggsy-review-7.6.signoff`
  (committed at D+0 09:45am, ≤60min before T+0).

**Approach:**

**Step 1 — Verify script.**

```ts
// scripts/verify-cutdown-ready.ts (DIRECTIONAL)
import { execFileSync } from 'node:child_process';
import { statSync, readFileSync, existsSync } from 'node:fs';

// SAFE: argv array
const ffprobe = (file: string) => JSON.parse(
  execFileSync('ffprobe', [
    '-v', 'error', '-show_format', '-show_streams',
    '-of', 'json', file
  ]).toString()
);

const checks: { name: string; pass: boolean; detail: string }[] = [];

// 1. Trailer exists, codec / dimensions / audio mono
const trailer = ffprobe('videos/trailer/out/trailer.mp4');
checks.push({
  name: 'trailer.mp4 codec h264',
  pass: trailer.streams.find((s: any) => s.codec_type === 'video')?.codec_name === 'h264',
  detail: trailer.streams[0]?.codec_name,
});
checks.push({
  name: 'trailer.mp4 audio mono',
  pass: trailer.streams.find((s: any) => s.codec_type === 'audio')?.channels === 1,
  detail: `channels=${trailer.streams.find((s: any) => s.codec_type === 'audio')?.channels}`,
});

// 2. Cutdown exists, codec / dimensions / audio mono / duration / size
const cutdown = ffprobe('videos/trailer/out/trailer-x-cutdown.mp4');
const cutdownDur = parseFloat(cutdown.format.duration);
checks.push({
  name: 'cutdown duration 12-15s',
  pass: cutdownDur >= 11.9 && cutdownDur <= 15.1,
  detail: `${cutdownDur}s`,
});
const cutdownSize = statSync('videos/trailer/out/trailer-x-cutdown.mp4').size / (1024 * 1024);
checks.push({
  name: 'cutdown file size <50MB',
  pass: cutdownSize < 50,
  detail: `${cutdownSize.toFixed(1)}MB`,
});
checks.push({
  name: 'cutdown audio mono 48kHz',
  pass: cutdown.streams.find((s: any) => s.codec_type === 'audio')?.channels === 1
    && cutdown.streams.find((s: any) => s.codec_type === 'audio')?.sample_rate === '48000',
  detail: 'see ffprobe',
});

// 3. Thumbnail derivative exists
checks.push({
  name: 'docs/trailer/thumbnail.jpg exists',
  pass: existsSync('docs/trailer/thumbnail.jpg'),
  detail: existsSync('docs/trailer/thumbnail.jpg')
    ? `${statSync('docs/trailer/thumbnail.jpg').size / 1024}KB`
    : 'MISSING',
});

// 4. Release URLs captured — schema-validated null-check per security-lens S4
let urls: { tag: string; urls: Record<string,string>; user_attachments_cutdown_url?: string } | null = null;
try {
  if (existsSync('videos/trailer/distribution/release-urls.json')) {
    const parsed = JSON.parse(
      readFileSync('videos/trailer/distribution/release-urls.json', 'utf8')
    );
    if (parsed && typeof parsed.urls === 'object' && parsed.urls !== null) {
      urls = parsed;
    }
  }
} catch (e) {
  urls = null;  // malformed → RED below, not unhandled exception
}
checks.push({
  name: 'release-urls.json populated + schema-valid',
  pass: urls !== null && Object.keys(urls.urls).length > 0,
  detail: urls ? `tag=${urls.tag}, ${Object.keys(urls.urls).length} URLs` : 'MISSING/INVALID',
});

// 4b. user-attachments URL captured back (Phase 7 exit condition #4)
checks.push({
  name: 'user_attachments_cutdown_url captured',
  pass: urls !== null && typeof urls.user_attachments_cutdown_url === 'string'
    && /^https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]+$/i.test(urls.user_attachments_cutdown_url),
  detail: urls?.user_attachments_cutdown_url ?? 'MISSING',
});

// 5. Verified stats present
checks.push({
  name: 'verified-stats.json present',
  pass: existsSync('videos/trailer/distribution/verified-stats.json'),
  detail: '',
});

// 6. 9:16 conditional handling — verify cutdown-eval.md documents the
// decision per coherence C3 + Phase 7 exit condition #2
const cutdownEval = existsSync('videos/trailer/sample-eval/distribution/cutdown-eval.md')
  ? readFileSync('videos/trailer/sample-eval/distribution/cutdown-eval.md', 'utf8')
  : '';
const decl9x16 = cutdownEval.match(/9:16 render produced:\s*(YES|NO)/i);
let nineSixteenPass = false;
if (decl9x16) {
  if (decl9x16[1].toUpperCase() === 'YES') {
    nineSixteenPass = existsSync('videos/trailer/out/trailer-x-cutdown-9-16.mp4');
  } else {
    nineSixteenPass = /skip reason:/i.test(cutdownEval) || /NEEDS-RECOMPOSE|NOGO|not-attempted/.test(cutdownEval);
  }
}
checks.push({
  name: '9:16 decision documented + matched',
  pass: nineSixteenPass,
  detail: decl9x16 ? `decl=${decl9x16[1]}` : 'no `9:16 render produced:` line in cutdown-eval.md',
});

// 7. Sentinels present + 7. git-author identity (per security-lens S6 —
// invoke verify:briggsy-sentinels inline, not separately)
const sentinels = [
  'briggsy-review-7.0.signoff',
  'briggsy-review-7.1.signoff',
  'briggsy-review-7.1b.signoff',   // ADDED per coherence C1/C5 + adversarial A2 + scope-guardian SG3
  'briggsy-review-7.2.signoff',
  'briggsy-review-7.3.signoff',
  'briggsy-review-7.4.signoff',
];
for (const s of sentinels) {
  checks.push({
    name: `${s} committed`,
    pass: existsSync(`videos/trailer/distribution/${s}`),
    detail: '',
  });
}
// Subprocess git-author check — composition with verify:briggsy-sentinels
// per security-lens S6 (separate-script gap closed)
try {
  execFileSync('pnpm', ['verify:briggsy-sentinels',
    ...sentinels.map(s => `videos/trailer/distribution/${s}`)
  ]);
  checks.push({ name: 'sentinels git-author = briggsy007@gmail.com', pass: true, detail: '' });
} catch (e) {
  checks.push({ name: 'sentinels git-author = briggsy007@gmail.com', pass: false, detail: 'FAILED' });
}

// Verdict
const allGreen = checks.every(c => c.pass);
console.log(checks.map(c => `${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`).join('\n'));
console.log(allGreen ? '\nVERDICT: GREEN — go for launch' : '\nVERDICT: RED — block launch');
if (!allGreen) process.exit(1);
```

**Step 2 — Run within 60min of T+0.**

D+0 09:30am ET. Briggsy runs `pnpm verify:cutdown-ready`. Inspects
output. On GREEN, commits `briggsy-review-7.6.signoff` at 09:45am.

If RED: do NOT post at 10:00am. Investigate failure. Postpone post
to next slot (Wed if Tue; next Tue if Wed; don't post over a known
event-saturated day).

**Patterns to follow:**

- Phase 6 Unit 6.0 `verify:trailer-final` pattern.
- ADR #22 sentinel ceremony.
- Project security: `execFileSync` argv.

**Test scenarios:**

- **Happy path:** All checks GREEN at 09:30am; Briggsy signs off
  09:45am; posts at 10:00am.
- **Edge case:** One sentinel missing (e.g., Unit 7.2 not committed
  yet) → RED; Briggsy completes 7.2; re-verify; commit.
- **Edge case:** Cutdown duration drifted (e.g., re-encoded
  accidentally with different segments) → RED; investigate; re-run
  Unit 7.1.

**Verification:**

- `verify:cutdown-ready` script exists and runs GREEN.
- `briggsy-review-7.6.signoff` committed at D+0 09:45am ±15min.

---

### Unit 7.7 — Pin Lifecycle Sentinel

- [ ] **Unit 7.7: Pin Lifecycle Sentinel**

**Goal:** Prevent stale-pin failure mode. When a new agentic-SDLC
project ships, the BURNED trailer pin must rotate; the lifecycle
must trigger explicitly, not via Briggsy's memory.

**Requirements:** Adversarial Attack 5 fix; `feedback-write-it-down.md`
discipline (cross-session promises must persist).

**Dependencies:** Unit 7.4 (Pin Post 1 at D+7); all other Phase 7
units complete.

**Files:**

- Create: `videos/trailer/distribution/pin-lifecycle.md`.
- Edit (cross-session): `TODO.md` Phase 7 section to add D+180
  calendar entry.

**Approach:**

**Step 1 — Pin replacement triggers (collapsed per CALL-2 + product-
lens P3 + adversarial A6 Phase 7 doc-review).**

Pre-doc-review Unit 7.7 installed a D+180 → D+270 → D+360 time-
trigger ladder + cross-session TODO.md row. For a no-customer /
no-deadline / engineering-proving-ground project, that ladder is
ceremony around a question (is the pin stale?) that doesn't need
ceremony. CALL-2 collapse: the only meaningful invalidation of
"second proof of method" is the third proof shipping. Time-based
ladder demoted to a single far-out reconsideration check, not an
auto-renewing maintenance row.

```md
# Pin Lifecycle — Phase 7 Unit 7.7

## Replace triggers (OR — any one fires; PRIMARY is #1)

Pin is replaced when ANY of:

1. **New-project trigger (PRIMARY)**: a successor agentic-SDLC
   project has shipped its own distribution surface. Detect via
   `git ls-files 'videos/*/distribution/x-post.md'` discovering an
   entry other than `videos/trailer/distribution/x-post.md` (per
   adversarial A6 — globbed-discovery instead of single-path
   coupling). This is the ONLY event that actually invalidates the
   "second proof" framing the pin carries.

2. **Manual override**: Briggsy commits `.unpin-burned.signoff`
   sentinel at `videos/trailer/distribution/.unpin-burned.signoff`
   under briggsy007@gmail.com git author identity.

3. **D+360 reconsideration (FALLBACK)**: 360 days after pin action,
   evaluate "is pinning a 1-year-old trailer still signal-or-
   stagnation." No auto-extension; no D+180/D+270 ladder. If the
   answer is "still signal," pin stays AND no further calendar
   entry is added. If "stagnation," replace per #2 manual override.
   The 360-day check is a single one-shot review, not a recurring
   commitment.

## Replacement action

When any trigger fires:
1. Briggsy unpins BURNED trailer from X profile.
2. Pins replacement (next project's pinned candidate, OR a fresh
   profile-card tweet, OR no pin).
3. Commits `.unpin-burned.signoff` if not already committed.

## No time-based maintenance row

Per CALL-2: NO cross-session TODO.md auto-renewing row. For a
project with no deadline and no customers, the new-project trigger
is the load-bearing signal; everything else is ceremony.
`feedback-write-it-down.md` is satisfied by THIS document existing
in `videos/trailer/distribution/pin-lifecycle.md` (version-
controlled, discoverable on grep). The D+360 reconsideration is a
single calendar event captured in TODO.md (see Step 2), not a
recurring loop.
```

**Step 2 — TODO.md single cross-session calendar entry.**

Add to `TODO.md` ONE row (not a section, not a recurring loop):

```md
- **D+360 (absolute date written at execution)**: one-shot
  reconsideration of BURNED pinned tweet per
  `videos/trailer/distribution/pin-lifecycle.md` #3 (delete this
  row after the reconsideration runs, regardless of verdict).
```

This satisfies `feedback-write-it-down.md` (cross-session promise
persists) without installing the indefinite-maintenance loop the
pre-doc-review Unit 7.7 created.

**Patterns to follow:**

- `feedback-write-it-down.md` cross-session persistence.
- ADR #22 sentinel ceremony for the `.unpin-burned.signoff`.
- `feedback-make-a-note.md` for memory-promotion at D+360 if pin
  outlives its usefulness.

**Test scenarios:**

- **Happy path:** Next project ships D+N → new-project trigger fires;
  pin rotates.
- **Edge case:** Briggsy decides D+30 to unpin (e.g., decides pin is
  drawing wrong attention) → commits `.unpin-burned.signoff`; pin
  removed.
- **Edge case:** No new project shipped at D+360 → one-shot
  reconsideration runs; verdict landed; TODO.md row deleted (no
  recurring loop installed).

**Verification:**

- `pin-lifecycle.md` documents replacement triggers + action +
  CALL-2 rationale.
- `TODO.md` has a single D+360 reconsideration row with computed
  absolute date and explicit deletion-after-runs instruction.

---

## Minimum-Viable Distribution vs Pattern Investment (CALL-8)

Per product-lens P9 Phase 7 doc-review. The plan ships 7 units + 6
ADRs + 6 sentinels + 50+ amendments + 5 cross-phase amendments
against a project with no commercial intent, no deadline, no
customers. The inversion-check question is: "What's the minimum
that ships this for engineering peers if Phase 7 weren't building
tooling for a 4th BURNED-class project that may never exist?"

**LOAD-BEARING for the engineering-proving-ground goal** (would
have to exist no matter what):
- Unit 7.0 stat-verification gate (caption hallucination is the
  one failure mode that breaks the §2 "Archer frame" claim on a
  visible word level).
- Unit 7.1 cutdown render (engineering-Twitter watch shape requires
  the 12s cutdown; flagship-only is mis-fit for in-feed scroll).
- Unit 7.3 caption copy (audience-fit lock is the single highest-
  leverage decision in the plan per CALL-1).
- Unit 7.4 calendar (the 3-beat burst itself is the distribution
  shape; without it the trailer ships at random times to no algo
  window).

**PATTERN INVESTMENT for future projects** (justified if and only
if a future project actually reuses):
- Unit 7.1b release-asset provisioning (Release-then-write ordering
  is correct, but a single project could equally well drag-drop
  inline + Release-CTA without the formal Release-publish gate).
- Unit 7.6 pre-post verify gate (atomic green-light is good
  hygiene, but a single-shot launch on one project is forgiving
  if the gate is light).
- Unit 7.7 pin lifecycle (per CALL-2 already collapsed to new-
  project trigger primary; far smaller surface than pre-doc-review).
- Full sentinel chain + git-author enforcement (correct discipline,
  but explicit cross-project reuse is what justifies the chain
  thickness).

**Honesty section**: If a third agentic-SDLC project never ships,
Phase 7's pattern-investment cost amortizes against ONE project
(BURNED itself). That changes the elite-team-standard math from
"discipline propagates" to "discipline is performed." The plan
keeps the full machinery because the marginal cost of the gates is
small and the pattern-propagation claim is plausible (UMB v4 or
some other agentic-SDLC project is more likely to exist than not).
But CALL-8 names the bet explicitly: future-project-reuse is the
load-bearing rationale for everything outside Units 7.0/7.1/7.3/7.4.
If at D+30 + first-future-project-trigger the patterns DON'T
propagate, this is the audit row to revisit.

---

## System-Wide Impact

- **Interaction graph:** Phase 7 ingests Phase 6 final deliverables
  + Phase 6 Unit 6.8 hand-off artifacts; produces cutdown + Release
  + README embed + post copy + calendar + pin sentinel + verify
  gate. Trailer enters the world via Phase 7. No code changes to
  BURNED game; trailer remains isolated package.
- **Error propagation:** Engagement-disappointment routes to Unit
  7.4 fallback contingencies (no artifact change). Reception-mismatch
  routes to retrospective at D+30 + memory-promotion. Cutdown
  failure routes back to Unit 7.1 iteration (different Option per
  Phase 6 cutdown-frame-list.md) or skip-cutdown (flagship-only).
- **State lifecycle risks:** Posts are public; once-shipped is
  permanent (X edits allowed within ~30 min). Pinned tweet swaps
  periodic via Unit 7.7. Release tagged immutably.
- **API surface parity:** None — Phase 7 is content + distribution
  + verification gates. No new public API.
- **Integration coverage:** Phase 7 closes the brainstorm-to-ship
  loop. The trailer's purpose was always distribution.
- **Unchanged invariants:** BURNED game code untouched. Trailer
  remains in `videos/trailer/` package. Distribution artifacts in
  `videos/trailer/distribution/` + `docs/trailer/` + GitHub Release.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cutdown loses signals if wrong Option selected | Low | High | Phase 6 Unit 6.8 source-of-truth contract; Phase 7 picks from A/B/C; default Primary |
| Cutdown frame 0 lands on mid-motion transition | Low (deepening fixed; Phase 6 amendment) | Medium-High | ADR #25 composed-not-mid-motion rule; Unit 7.1 Step 4 audit |
| Caption stat hallucination | Low (Unit 7.0 gate) | High (LinkedIn-coded over-claim) | ADR #26 stat-verification gate; verified-stats.json hard-asserts |
| Placeholder URL window on README | Low (Unit 7.1b automation) | Medium | Unit 7.1b Release-first ordering; Unit 7.2 reads release-urls.json |
| 24h gap kills algo momentum | Eliminated by ADR #27 | n/a | ADR #27 3-beat burst self-reply pattern |
| External-link demotion on Post 1 | Low (locked: no links in Post 1) | Medium | Variation A has zero links; D unlocks only for Premium |
| Stale pin after future project ships | Low (Unit 7.7 sentinel) | Medium | Unit 7.7 OR-of-explicit-events; TODO.md D+180 entry |
| AV-sync at cutdown seek-in (R3 audio-lead) | Low (Phase 5 canonical pattern) | High | ADR #20 inheritance; `-ss AFTER -i` per Phase 5; Unit 7.1 Step 5 verification |
| GitHub README drag-drop fails | Low | Medium | Fallback: clickable-thumbnail-to-Release pattern documented |
| Cutdown >10 MiB user-attachments free cap | High on GitHub Free | High | Entry Gate `account-state.md` records GitHub plan. Free → option (d) clickable-thumbnail-flagship; Pro+ → option (b) inline cutdown (per ADR #29 + adversarial A8 Phase 7 doc-review). |
| **Raw FFmpeg `-x264-preset` flag regression** (silently invalid in raw ffmpeg; pre-doc-review Phase 7 used it across all FFmpeg argv) | Eliminated by doc-review pass | High (every cutdown render fails) | Critical Constraints + D-7B + all FFmpeg argv updated to `-preset slow`; ADR #19 cross-tool note added (Remotion CLI: `--x264-preset`; raw FFmpeg: `-preset`) |
| **GitHub plan state unknown at Entry Gate** | Eliminated by Entry Gate amendment | High (Unit 7.2 mechanism choice undefined) | Entry Gate amendment requires `account-state.md` records GitHub plan alongside X tier (per adversarial A8) |
| **Sentinel-list / verify-script drift** (7.1b + 7.2 sentinels absent from D-7I + verify-cutdown-ready.ts) | Eliminated by doc-review pass | Medium-High | D-7I list + Unit 7.6 sentinel array updated; verify-cutdown-ready.ts also invokes verify:briggsy-sentinels inline |
| **filter_complex audio drift at segment seams (R3 audio-lead via packet-vs-sample boundary mismatch)** | Mitigated by 2b-default flip | High on R3 | Approach 2b (per-segment + concat-demuxer) is now default; Step 5 verification adds per-seam check; Approach 2a documented as fallback only (per adversarial A4) |
| Cloudflare Pages 25 MiB cap "Option II" surprise | Eliminated (option cut) | n/a | Option II removed; GitHub Release 2 GiB primary |
| Network failure at posting moment | Medium | Medium | Unit 7.6 verify-cutdown-ready 60min before; mobile-hotspot fallback |
| X video upload fails (format/cap/network) | Low | Medium | Re-encode if needed; X 512 MB cap clears trivially at our sizes |
| Negative criticism (technical or aesthetic) | Low | Low | Brief acknowledgment if substantive; ignore trolls; artifact stands |
| **No UMB v3 distribution baseline** — "second proof point" framing leans on undocumented audience memory | Medium | Low-Medium | Variation C (engineering-mystique) as soft fallback if UMB cross-reference doesn't land; capture D+30 retro signal whether "second proof" registered |
| Cutdown standalone §2 audit FAIL | Low | High | Unit 7.1 Step 4 catches before atomic-swap; iterate START_FRAME or change Option |
| 9:16 cutdown NEEDS-RECOMPOSE | Medium (Phase 6 audit determines) | Low | Skip vertical surface; flagship-only landscape distribution; no Phase 4 work from Phase 7 |
| Caption X-rendering autoformat trap (`...` → `…`) | Medium | Low (visible to Briggsy in composer) | Step 6 paste-into-composer-screenshot verification |

---

## Open Questions

### Resolved during deepening

- **Cutdown source/structure**: Phase 6 Unit 6.8 cutdown-frame-list.md
  Primary recommendation (default Option C if no Primary marked).
- **Cutdown frame-0 anchor**: composed-not-mid-motion per ADR #25.
- **Cutdown closure**: hard cut, no fade-out per ADR #24.
- **Cutdown FFmpeg seek**: `-ss AFTER -i` per Phase 5 canonical.
- **Cutdown encoding**: CRF 18 / raw FFmpeg `-preset slow` (NOT
  `-x264-preset`, which is Remotion CLI only — per feasibility F1 +
  adversarial A1 Phase 7 doc-review; ADR #19 cross-tool note added)
  / mono AAC 128k 48kHz per ADR #14 + #19.
- **Thumbnail PRIMARY**: frame **1950** per Phase 6 Unit 6.2 Step 3
  lines 1232-1240 lock (corrected per design-lens D2 Phase 7
  doc-review — pre-doc-review cited "line 2253" + frame 2790
  default, both wrong). Fallback ladder: 1860 / 1425 / 2790
  last-resort.
- **Thumbnail README derivative**: 1200×675 q85 JPEG at `docs/trailer/thumbnail.jpg`
  (Phase 6 cross-phase amendment).
- **README embed mechanism**: drag-drop user-attachments URL per ADR
  #29; cutdown as inline (not flagship — exceeds attachment cap);
  flagship via Release CTAs below.
- **README placement**: hero-second (`## Trailer` before `## Status`).
- **Caption stats**: derived from Unit 7.0 verified-stats.json; "six
  operatives in the deck, one on the research budget" matches Phase
  1 line 1086 LOCKED narration (corrected per design-lens D2 Phase
  7 doc-review — pre-doc-review caption text "in the basement" was
  Phase 1 fiction explicitly retracted at Phase 1 lines 1100-1113).
- **Variation B/C/D**: B/C cut to sidecar; D conditional on Premium
  status from entry gate.
- **Post sequence shape**: 3-beat burst T+0 / T+90min / T+2-3h via
  self-reply per ADR #27.
- **D+30 retrospective scope**: memory-promotion (insight 052), NOT
  dashboard build.
- **Pin lifecycle**: Unit 7.7 OR-of-explicit-events.
- **Bitrate target**: 8–12 Mbps per ADR #28.

### Deferred to implementation

- **Exact post date** (Tue or Wed of D+0 week): depends on Briggsy
  availability + X analytics calendar at execution time.
- **Specific Discord channels**: Briggsy's call (per `user_harry.md`
  Harry-IT-department + Briggsy's active server set).
- **Variation D vs A choice (if Premium)**: depends on Briggsy
  voice preference; A is safer default; D unlocked if Briggsy wants
  extended.
- **YouTube unlisted optional surface**: Briggsy execution decision
  (NOT in Phase 7 plan body).

### Promoted out of "deferred" by deepening

- **Briggsy X account state** — promoted from deferred-to-execution
  to **Phase 7 entry gate condition** (record before Unit 7.3).
- **Twitter thread on the BUILD** — promoted to **Post 2b** per ADR
  #27 (was "possible follow-up").
- **Pinned tweet lifespan** — promoted to **Unit 7.7 sentinel
  protocol** (was hand-wavy "revisit when trailer ages").

---

## Cross-Phase Amendments

These amendments surfaced during Phase 7 deepening and need to land
in upstream phases / the roadmap. They are applied in the same
commit as Phase 7 deepening per Phase 6 deepening pattern.

### Phase 1 Unit 1.5 line 1326 — disambiguate frame 1860 boundary

**Current state** (Phase 1 line 1325-1326): line 1325 says
brightening "ease[s] to 'bright' state by 1860"; line 1326 says
"Cascade peak intensification — comms-ticker brightens to full state"
during 1860–1950. Two readings: (a) brightening completes AT 1860,
held bright through 1860-1950; (b) brightening continues through
1860-1950.

**Amendment** (per emil + Phase 7 ADR #25 dependency): Phase 1 line
1326 row label changes to:

> *"1860–1950 | **Cascade peak HELD — comms-ticker at full state**
> (brightening completed at 1860; ticker now holds bright for 90
> frames). HTP hero still 70%. 4 stat captions at 30% side-band-right.
> Halo at 40% right-edge. Music intensifies, no VO. **Three layers
> with clear hierarchy: bright ticker = active signal; HTP + halo +
> stats = texture.**"*

This locks reading (a). Frame 1860 is the FIRST frame of the held-
bright state, NOT a continuation of ease. ADR #25 composed-not-mid-
motion rule applies cleanly: cutdown START_FRAME ≥1880 (which
includes Option A/C's 1880 boundary) lands safely 20 frames past
ease completion.

### Phase 6 Unit 6.8 — tighten cutdown-frame-list.md contract + add composed-not-mid-motion check + add expected-cutdown-file-size + add thumbnail derivative

**Amendment 1: Tighten "Phase 7 may choose differently" hedge.**
Phase 6 line 2126-2127 currently says:

> *"(Phase 7 may choose differently based on distribution-context
> decisions; this is recommendation, not lock.)"*

Replace with:

> *"Phase 7 picks one of the documented Options A/B/C; Phase 7 does
> NOT invent a 4th option. If Phase 6 marks a Primary recommendation,
> Phase 7 defaults to it. Phase 7 may override the Primary only with
> a Briggsy `briggsy-review-7.1.signoff` documenting the reason
> (e.g., cutdown standalone §2 audit FAIL on Primary; an alternate
> Option clears the audit)."*

**Amendment 2: Add composed-not-mid-motion check.** Phase 6 Unit
6.8 cutdown-frame-list.md template adds for each Option:

```md
- Composed-not-mid-motion verdict on START_FRAME of each segment:
  - Segment N (frame X): <PASS — settled state / FAIL — inside ease window per `transitions.ts` line Y>
  - (Cross-reference Unit 6.2 Step 3 selection rule + Phase 7 ADR #25)
```

**Amendment 3: Add expected cutdown file size.** Phase 6 Unit 6.8
adds for each Option:

```md
- Expected cutdown file size at production encoding (CRF 18 /
  `--x264-preset slow` / mono AAC 128k):
  - Estimated: <N> MB (based on per-segment bitrate analysis from
    Phase 6 trailer.mp4)
  - Phase 7 hard cap: 50 MB (well under X 512 MB cap; >50 MB
    triggers note-but-not-fail in cutdown-eval.md)
```

**Amendment 4: Add 9:16 feasibility verdict propagation.** Phase 6
Unit 6.8 line 2116-2119 currently has 9:16 verdict per Option but
doesn't state Phase 7 consumes it. Add to Phase 6 Unit 6.8
template:

```md
## 9:16 cutdown feasibility — Phase 7 contract
- Per Option A/B/C: <GO / NEEDS-RECOMPOSE / NOGO>
- Phase 7 Unit 7.1 Step 6 reads this verdict and:
  - GO → renders second cutdown at 1080×1920
  - NEEDS-RECOMPOSE → skips with documented reason (NOT Phase 4 work)
  - NOGO → skips vertical surface
```

**Amendment 5: Add thumbnail README derivative output (per
frontend-design).** Phase 6 Unit 6.2 (thumbnail selection) currently
outputs only `out/thumbnail.png` (1920×1080 master). Add:

> *"Additionally produce `docs/trailer/thumbnail.jpg` — 1200×675
> JPEG q85, target <100 KB. Phase 6 generates via:*
>
> ```bash
> ffmpeg -y -i out/thumbnail.png -vf scale=1200:675:flags=lanczos \
>   -q:v 2 docs/trailer/thumbnail.jpg
> ```
>
> *Phase 7 Unit 7.1b references this derivative as a Release asset;
> portfolio-embed.md may reference it as a poster image for the
> tertiary portfolio-site surface."*

### Roadmap §4 — add 6 new ADRs (#24/#25/#26/#27/#28/#29)

Per Phase 7 deepening synthesis (10-agent fleet + sequential
thinking):

- **ADR #24 — Cutdown closure: hard cut + X autoplay loop, no
  fade-out** (multi-agent emil + adversarial + feasibility)
- **ADR #25 — Cutdown frame-0 anchor: composed-not-mid-motion rule
  + IS the X autoplay-entry image** (emil + design-lens)
- **ADR #26 — Distribution stat-verification gate** (adversarial +
  repo-research + brief institutional gap)
- **ADR #27 — Distribution post sequence: 3-beat burst within first
  2-3 hours via self-reply thread, NOT 24h-spaced quote-tweets**
  (best-practices + design-lens)
- **ADR #28 — Bitrate target 8-12 Mbps for 1080p X uploads** —
  supersedes roadmap §5.4 "5-8 Mbps" (best-practices)
- **ADR #29 — GitHub README inline-video embed mechanism: drag-drop
  user-attachments URL only; NO markdown-image-link to Release MP4;
  NO HTML `<video>` tag** (framework-docs + feasibility + best-
  practices)

Each ADR's full text is written into roadmap §4 in the same commit.

### Roadmap §5.4 — bitrate correction

Current text (line 264): *"5–8 Mbps VBR for 1080p (don't overshoot
— X re-encodes)."*

Replace: *"8–12 Mbps VBR for 1080p (X re-encodes regardless; goal is
survival of re-encode with minimal degradation). Hard cap at upload:
25 Mbps platform ceiling. Phase 6 CRF 18 + `--x264-preset slow`
naturally lands in 12–18 Mbps VBR average for action content — within
tolerance. (Locked per ADR #28 during Phase 7 deepening 2026-05-17;
supersedes the pre-deepening 5–8 Mbps figure which under-shoots 2026
X re-encode survival targets.)"*

### Roadmap §1 — roster contradiction resolution (Otto on the research budget, narrative-only)

Current roadmap §1 line 50 says: *"seven named operatives in the
roster (Dash, Vera, Sable, Janet, Neal, Otto, Agent X)"*. Codebase
ships 6 (5 named + Agent X wild); Otto has no card or art.

Phase 7 doc-review correction (per design-lens D2): the prior Phase
7 deepening pass landed the roadmap §1 amendment with "in the
basement" framing, which matched Phase 1 PRE-doc-review draft text.
Phase 1 doc-review at lines 1100-1113 retracted that as "Phase 1
fiction" and locked "on the research budget" matching
ActRoster.tsx:153-158. The roadmap §1 amendment is corrected to
match the LOCKED narration:

> *"seven named operatives in the roster (Dash, Vera, Sable, Janet,
> Neal, Otto, Agent X) — **six in the deck, one (Otto) on the
> research budget: narrative-only-not-shipped per Phase 1 line 1086
> locked narration + Phase 7 stat-verification gate.** Captioned
> distribution copy must match: 'six operatives in the deck, one
> on the research budget.'"*

### Roadmap §4 ADR #19 — add cross-tool note (Remotion CLI vs raw FFmpeg)

Per feasibility F1 + adversarial A1 Phase 7 doc-review. Append a
note to ADR #19's rationale clarifying that the `--x264-preset slow`
flag applies to **Remotion CLI invocations only** (Phase 6 Unit 6.1
production render); when calling raw FFmpeg argv directly (Phase 7
Unit 7.1 cutdown render, Phase 7 Step 6 9:16 render, any future
ffmpeg-direct path), the libx264 encoder option is `-preset slow`
(single dash, no `x264-` prefix). The two map to the same underlying
encoder option through different tooling surfaces; do NOT use
`-x264-preset` against raw `ffmpeg`. Verified against installed
FFmpeg 8.1 during Phase 7 doc-review: `ffmpeg ... -c:v libx264
-x264-preset slow` returns `Unrecognized option 'x264-preset'` and
exits non-zero.

### Phase 6 amendment-status verification (Phase 7 doc-review)

Per adversarial A10 Phase 7 doc-review: verified during the doc-
review pass that Phase 6 plan body actually carries the cross-phase
amendments Phase 7 deepening declared:

- ✅ Phase 6 Unit 6.2 Step 3 thumbnail selection rule (lines
  1232-1240) — landed: 1950 PRIMARY / 1860 / 1425 / 2790 last-resort.
- ✅ Phase 6 Unit 6.2 Step 3 thumbnail JPEG derivative (lines
  1244-1254) — landed: `docs/trailer/thumbnail.jpg` ffmpeg generation.
- ✅ Phase 6 Unit 6.8 cutdown-frame-list.md contract tightening
  (lines 2861-2867 — "Phase 7 picks one of the documented Options
  A/B/C; Phase 7 does NOT invent a 4th option") — landed.
- ✅ Phase 6 Unit 6.8 composed-not-mid-motion timing-window
  metadata template (lines 2869-2886) — landed.
- ✅ Phase 6 Unit 6.8 file-size metadata template (line 2888) —
  landed (header present; template body follows).

(A10's risk that "Phase 7's amendments-applied note may have been
theater" — refuted by direct verification. The Phase 6 plan body
carries all five amendments Phase 7 deepening declared.)

### Roadmap §6 — brainstorm corrections add a new row C7

Add to §6 table:

| # | Brainstorm/Phase 7 pre-deepening claim | Research finding | Disposition |
|---|---|---|---|
| C7 | Phase 7 caption "7 operatives" | `src/shared/card-defs.ts` ships 5 operatives + Agent X (wild) = 6 entries; trailer narration (Phase 1 line **1086** locked) says "Six in the deck. One on the research budget. Don't ask." (Phase 1 line 49 was a pre-doc-review summary bullet using the now-retracted "in the basement" framing — see Phase 1 lines 1100-1113.) | **Caption corrected to "six operatives in the deck, one on the research budget"** per ADR #26 stat-verification gate + design-lens D2 Phase 7 doc-review. |

### Roadmap §11 — mark Phase 7 deepened

Status line updates:

- ✅ **Phase 7 DEEPENED 2026-05-17 (`[commit SHA placeholder]`)** —
  ~50 amendments absorbed across 10 CE personas + emil + frontend-
  design + /brief, sequential-thinking synthesis. 1052 → ~[target]
  lines. +4 NEW units (7.0 stat-verify + 7.1b release-provisioning
  + 7.6 pre-post-verify + 7.7 pin-lifecycle), 1 consolidated unit
  (7.5 metrics folds into 7.4). +6 NEW roadmap ADRs (#24 hard-cut
  cutdown closure + #25 composed-not-mid-motion frame-0 anchor +
  #26 stat-verification gate + #27 3-beat burst post sequence +
  #28 bitrate 8-12 Mbps + #29 README drag-drop user-attachments).
  Cross-phase amendments: Phase 1 line 1326 disambiguation + Phase
  6 Unit 6.8 contract tightening + Phase 6 Unit 6.2 thumbnail
  derivative output + roadmap §1/§5.4/§6 corrections.

- ✅ **All 8 phases now deepened.**

- Next: Briggsy reviews deepened plan set; Phase 0 execution begins
  after sign-off.

---

## Documentation / Operational Notes

- All Phase 7 artifacts land in `videos/trailer/out/` (cutdowns +
  Release assets) + `videos/trailer/distribution/` (copy + plans +
  sentinels) + `docs/trailer/` (README derivatives).
- Distribution actions are physical events (Briggsy posts at
  scheduled times); Phase 7 prepares the materials, runs the gates,
  produces the artifacts. Posting itself is Briggsy execution.
- All shell-outs use `execFileSync` argv pattern (project security
  convention).
- All Briggsy review gates produce `.signoff` sentinels under
  briggsy007@gmail.com git author identity per ADR #22.
- `pnpm verify:briggsy-sentinels` enforces git-author check at all
  Phase 7 gates.
- Once posted, trailer artifact is permanent + public. Briggsy
  approves all copy + media via sentinels before Phase 7 final
  posting.
- `feedback-stats-single-source.md` — metrics logged with real
  numbers from X Analytics, not estimates.
- **Phase 7 is the FIRST documented distribution pass for any
  Briggsy agentic-SDLC project.** The patterns Phase 7 produces
  (cutdown selection contract, stat-verification gate, 3-beat burst,
  pin lifecycle, sentinel ceremony) propagate forward to the next
  project (UMB v4 or otherwise); they do not inherit backward from
  UMB v3 (which has no distribution post-mortem).
- Memory-promote at D+30 (per insight 052) any signals that surprise.

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 1 plan (line 1325-1326 disambig consumed): [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 5 plan (line 1663 canonical `-ss AFTER -i`): [`docs/plans/origin-trailer/phase-5-gameplay-capture.md`](./phase-5-gameplay-capture.md)
- Phase 6 plan (Unit 6.8 cutdown-frame-list.md contract consumed): [`docs/plans/origin-trailer/phase-6-final-render-qa.md`](./phase-6-final-render-qa.md)

**X / Twitter distribution specs (2026):**
- X video specs aggregators: wavespeed.ai 2026, sproutsocial 2026,
  postful.ai, contentgrip 2026, mashable 2026, kapwing 2026 (cross-
  validated; primary X help docs Cloudflare-gated and could not be
  directly fetched — limitation noted per best-practices research)
- X 2026 Immersive Media Viewer (9:16 vertical-feed surface)
- X "Made with AI" toggle: test-phase, opt-in for adult/armed-
  conflict content only as of May 2026
- Link-demotion regime: confirmed March 2025+ across multiple 2026
  aggregator sources

**Engineering-Twitter launch pattern references (2026):**
- Replit Agent 3 + 4 launch reels (Sept 2025, March 2026)
- Cursor 0.50 + 3 launches
- Anthropic Code with Claude 2026 keynote clips
- (Tweet-level timestamps inferred from product-launch articles
  describing the pattern, not direct tweet scraping — limitation
  noted per best-practices research)

**FFmpeg:**
- Trim + re-encode: trac.ffmpeg.org/wiki/Seeking
- `-accurate_seek` default behavior post-2.1: Context7 `/websites/
  ffmpeg_ffmpeg-all`
- Fade filters: ffmpeg.org/ffmpeg-filters.html#fade-1
- `afade` audio fade: ffmpeg.org/ffmpeg-filters.html#afade
- filter_complex trim + concat: ffmpeg.org docs

**GitHub:**
- Release asset cap (2 GiB/asset, no total cap): docs.github.com /
  Context7 `/github/docs`
- README sanitizer (strips `<video>`, `<iframe>`): GitHub community
  discussion #173635
- user-attachments URL mechanism: GitHub community discussion
  #173635 (modern `github.com/user-attachments/assets/<UUID>`
  format)
- User-attachment cap: **10 MiB free / 100 MiB paid** (binary, not
  decimal MB; per Context7 `/github/docs` attaching-files —
  date-pin verification required at Phase 7 execution time against
  `https://docs.github.com/en/get-started/writing-on-github/working-
  with-advanced-formatting/attaching-files` since GitHub may revise
  caps; per adversarial A9 Phase 7 doc-review)
- `gh release create` CLI: cli.github.com docs

**Cloudflare:**
- Pages 25 MiB asset cap: Context7 `/websites/developers_cloudflare_pages`
  (Limits > File size)
- R2 hosting via Pages Function: only viable fallback if Release
  asset cap exceeded (not Phase 7's case at 200 MB flagship)

**Institutional learnings (memory):**
- `feedback-wow-over-simplicity.md` — visual richness over cut-layers
- `feedback-stats-single-source.md` — log real numbers from
  authoritative source; cited at ADR #26 lock
- `feedback-elite-team-standard.md` — verify before claim ship
- `user_communication_style.md` — caption voice matches Briggsy
- `feedback-phase-plan-drafting-workflow.md` — write all phase files
  in one workflow; deepen sequentially after
- `feedback-make-a-note.md` — capture surprising D+30 metrics to
  memory for compounding learnings
- `feedback-wait-for-all-agents.md` — synthesis discipline
- `feedback-write-it-down.md` — cross-session promises (D+180 pin
  trigger) MUST persist to TODO.md
- `feedback-vibes-are-not-specs.md` — "Phase 7 should generate a
  pattern" must be in the plan; ratified here.
- `feedback-debate-pushback.md` — framework-docs vs feasibility on
  FFmpeg `-ss` placement: engaged the disagreement; synthesis picked
  Phase 5 canonical for consistency + audio-packet safety.
- `user_harry.md` — Discord (Harry channel) is one of the cross-
  surface sharing destinations.

**Institutional insights (docs/insights/):**
- 050-agent-verification-misses-perceptual-continuities — applies to
  Unit 7.1 Step 4 cold-viewer §2 audit (can't be agent-checklist
  cleared)
- 052-instrumentation-bottleneck-is-promotion-not-production —
  applies to Unit 7.4 D+30 metrics-log framing
- 018-imagen-priors-engineer-around-dont-fight — tangentially
  relevant to thumbnail iteration (Phase 6 lock takes precedence)
- 009-product-specification-authoring — Phase 7 inherits §3 Archer
  bar transitively via Phase 6 bar-raise

**Cross-project (NEGATIVE finding — load-bearing absence):**
- `projects/undercover-mob-boss/docs/` — **no distribution
  post-mortem, no `insights/` directory, no launch metrics log, no
  x-post drafts.** Phase 7's "second proof point" framing leans on
  audience memory of UMB v3 reception that is not documented.
  Captured as a risk row + Variation C as soft fallback. The
  inheritance arrow inverts: BURNED Phase 7 generates the
  distribution pattern; next project inherits.

---

*Phase 7 deepened 2026-05-17. ~50 amendments absorbed across 10 CE
personas + emil-design-eng + frontend-design + /brief. Sequential-
thinking synthesis. Verified high-stakes claims (Phase 6 thumbnail
lock, card-defs.ts operative count, Phase 5 `-ss AFTER -i` canonical,
Phase 1 line 1325-1326 ease boundary, `public/assets/cards/*.webp`
count) against source before incorporating amendments. 6 new roadmap
ADRs locked (#24-#29). Cross-phase amendments applied to Phase 1
line 1326 + Phase 6 Unit 6.8 contract + Phase 6 Unit 6.2 thumbnail
derivative + roadmap §1/§5.4/§6. Phase 7 is the FIRST documented
distribution pass for the BURNED-or-Briggsy agentic-SDLC project
series; patterns propagate forward.*

*Phase 7 document-review absorbed 2026-05-17. 7 CE personas
(coherence / feasibility / product-lens / design-lens / security-lens
/ scope-guardian / adversarial-document-reviewer); ~48 raw findings
deduped to ~38 unique absorbed (3 P0 / 8 P1 / 20 P2 / 7 P3); 8
strategic CALLs locked (CALL-1 caption audience-fit + Variation
A-alt / CALL-2 pin lifecycle collapse / CALL-3 cutdown frame-0
audience-aware Option ranking / CALL-4 README cutdown-hero trade-off
explicit / CALL-5 cut "...Phrasing." per Sterling-CODED / CALL-6
decouple character-cap from audience-fit / CALL-7 D+30 metrics
method-signals-first + ADR #27 falsification test / CALL-8
minimum-viable-distribution-vs-pattern-investment honesty section).
P0 mechanical fixes: raw FFmpeg `-x264-preset` → `-preset` across
every argv invocation (Remotion CLI vs raw FFmpeg cross-tool note
added; ADR #19 amended) — verified non-zero exit on FFmpeg 8.1;
caption "one in the basement" → "one on the research budget"
matching Phase 1 line 1086 LOCKED narration across captions /
verifier / stat enumeration / roadmap §1 / §6 (the prior Phase 1
"fiction" was retracted at Phase 1 doc-review lines 1100-1113 —
Phase 7 pre-doc-review inherited the retracted text); thumbnail
default frame 2790 → frame 1950 PRIMARY (with 1860/1425/2790
fallback ladder) per Phase 6 Unit 6.2 Step 3 lines 1232-1240 — the
pre-doc-review citation of "Phase 6 line 2253" was a mobile-crop-
audit table row, not the selection rule. P1 wiring gaps closed:
verify-phase-7-entry.ts + verify-briggsy-sentinels.ts script
creation contracted in Unit 7.0 Step 0 (pre-doc-review invoked them
without assigning creation); release-notes.md authoring contracted
in Unit 7.1b Step 0 (pre-doc-review's `--notes-file` would have
failed on first run); briggsy-review-7.1b.signoff + briggsy-review-
7.2.signoff added to D-7I + Unit 7.6 sentinel array (sentinel-list
drift between creation site and verify site); user-attachments URL
post-drag-drop capture (`<UUID-cutdown>` placeholder otherwise
unreproducible in committed artifacts); Approach 2b promoted to
Phase 7 cutdown default per adversarial audio-seam drift concern
(2a kept as fallback). Cross-phase ADR #19 amendment (Remotion CLI
vs raw FFmpeg) + Phase 6 amendment verification (all 5 cross-phase
amendments from Phase 7 deepening confirmed landed in Phase 6 body)
+ corrected roadmap §1 + §6 row C7 "research budget" framing.
Phase 7 frontmatter `reviewed: 2026-05-17`. Doc-review sweep
complete: all 8 phase plans (0/1/2/3/4/5/6/7) reviewed.*
