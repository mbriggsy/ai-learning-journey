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
reviewed: pending
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
  6 (5 named + Agent X wild); Phase 1 trailer narration says "six in
  the deck, one in the basement." → stat-verification gate **new
  ADR #26**.
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
- Thumbnail default Phase 7 said frame 1950; Phase 6 line 2253 lock
  is **default 2790 / fallback 180 / 1950 last-resort** → Phase 7
  inherits Phase 6 lock.

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
- `videos/trailer/out/thumbnail.png` — Phase 6 thumbnail at frame
  2790 default per Phase 6 line 2253 selection rule.
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

### Entry gate enforcement

`pnpm verify:phase-7-entry` (light script wrapping existing
`pnpm verify:briggsy-sentinels` + presence checks for the 5 artifacts
above + parse of PHASE-6-EXIT.md verdict-summary fields). Phase 7
Unit 7.0 does not start until this returns GREEN.

If any artifact is missing or any verdict is FAIL: STOP. Re-open
Phase 6 for the responsible Unit; do not proceed.

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
2. (Conditional) 9:16 cutdown rendered if Phase 6 verdict GO; OR
   documented skip if NO-GO.
3. Verified-stats.json captures the canonical numbers used in all
   distribution copy.
4. All distribution-surface copy written, drag-drop README embed
   procedure documented with the live user-attachments URL captured.
5. Pre-post `pnpm verify:cutdown-ready` returns GREEN within 60min
   of D+0 T+0.
6. Briggsy posts according to the 3-beat burst calendar OR schedules
   via X scheduling.
7. Pin lifecycle sentinel committed at D+0 (replace trigger documented).

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
- **Wrong-frame thumbnail**: Phase 6 line 2253 locked frame 2790
  default; Phase 7 inherits, does not override.
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
at frame 2790 per Phase 6 lock) is only served in the paused state.
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
phase amendment to Phase 6).

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
- Preset flag: **`-x264-preset slow`** (ADR #19; pre-deepening Phase
  7 said `-preset slow` which silently no-ops in Remotion/FFmpeg
  contexts and is a regression ADR #19 explicitly guards against)
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

### Thumbnail lock (Phase 6 inheritance)

Per Phase 6 line 2253 selection rule (lock 2026-05-17 during Phase 6
deepening):

- **Default**: frame **2790** (visual closure; BURNED logo + R15 #4
  subhead). Phase 7 inherits this.
- **Fallback**: frame 180 (BURNED logo land in S01).
- **Last-resort**: frame 1950 (stacked-payoff stamp + HTP) —
  reserved for last-resort because the stamp slap is mid-motion at
  frame 1950 (composed-not-mid-motion rule). Pre-deepening Phase 7
  defaulted to 1950 — wrong per Phase 6 lock.

Phase 6 produces `out/thumbnail.png` (1920×1080 master) at the
selected default frame. **Phase 6 cross-phase amendment**: also
produce `docs/trailer/thumbnail.jpg` (1200×675 q85 <100KB derivative
for README; see frontend-design spec in Cross-Phase Amendments below).

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
- Trailer narration (Phase 1 line 49): *"Seven on the roster, six in
  the deck, one in the basement. Don't ask."* The trailer ITSELF
  resolves this — six in the deck, one in the basement (Otto).
- Caption should match trailer narration, not invent a 7th: **"six
  operatives in the deck, one in the basement"** is the correct
  framing.
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

CRF 18 / `--x264-preset slow` / yuv420p / 30fps explicit / AAC 128k
mono 48kHz / +faststart / no `-tune` / no `-r` (source-verified
30fps). Inherits ADR #19 / ADR #14 (mono).

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
- `briggsy-review-7.3.signoff` — Post copy locked (Unit 7.3).
- `briggsy-review-7.4.signoff` — Calendar approved (Unit 7.4).
- `briggsy-review-7.6.signoff` — Pre-post verify GREEN within 60min
  of T+0 (Unit 7.6).
- `.unpin-burned.signoff` — Pin replacement triggered (Unit 7.7,
  D+180 or new-project ship; deferred).

`pnpm verify:briggsy-sentinels` enforces git-author check at each
gate.

### D-7J — 3-beat burst post sequence (ADR #27)

T+0 / T+90min / T+2-3h via self-reply thread. NOT 24h quote-tweet.
Pinned tweet at D+7 separate from the burst.

### D-7K — README inline embed via drag-drop user-attachments (ADR #29)

GitHub README does NOT render HTML `<video>` tags (sanitizer strips).
Markdown image-link to Release MP4 does NOT inline-play (renders as
clickable thumbnail download). The ONLY mechanism producing inline
`<video>` in README is the drag-drop user-attachments URL injected
by GitHub's web editor. Phase 7 Unit 7.2 documents this procedure.

### D-7L — Thumbnail default frame 2790 (Phase 6 lock inheritance)

Phase 6 line 2253 selection rule. Phase 7 does not override.

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

- Create: `scripts/verify-caption-stats.ts`.
- Create: `videos/trailer/distribution/verified-stats.json` (output).
- Create: `videos/trailer/distribution/briggsy-review-7.0.signoff`
  (sentinel).

**Approach:**

**Step 1 — Stat enumeration.**

The canonical claims that appear in Phase 7 distribution copy are:

| Claim | Source-of-truth | Method |
|-------|-----------------|--------|
| `illustrations` | `public/assets/cards/*.webp` (excluding `_archive/`) | `glob().length` |
| `operations` (deck total) | `src/shared/card-defs.ts` `CARD_DEFS` | `sum(pawCount + nonPawCount)` across all entries |
| `operatives_in_deck` | `src/shared/card-defs.ts` `CARD_DEFS` filtered to `category in ['operative','wild']` | `.length` |
| `operatives_in_basement` | Trailer narration constant per Phase 1 line 49 (Otto) | hardcoded `1` (narrative-locked) |
| `operatives_on_roster_total` | `operatives_in_deck + operatives_in_basement` | computed |
| `phases_in_plan` | `docs/plans/origin-trailer/roadmap.md` `phases:` frontmatter | parse YAML, `.length` |
| `phase_files_drafted` | filesystem count | matches above |
| `trailer_seconds` | `videos/trailer/src/lib/timing.ts` TOTAL_FRAMES / 30 | computed |
| `act_count_in_htp` | `src/client/howtoplay/` act files | filesystem count |
| `card_types` | `CARD_DEFS.length` | `.length` |

**Step 2 — Verifier script.**

```ts
// scripts/verify-caption-stats.ts (DIRECTIONAL — final names per repo conventions)
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { CARD_DEFS } from '../src/shared/card-defs.js';
import { TOTAL_FRAMES, FPS } from '../videos/trailer/src/lib/timing.js';
// ... (verify imports against repo state at execution time)

const cards = CARD_DEFS;
const illustrations = globSync('public/assets/cards/*.webp', {
  ignore: ['public/assets/cards/_archive/**']
}).length;

const operations = cards.reduce((s, c) => s + c.pawCount + c.nonPawCount, 0);
const operatives_in_deck = cards.filter(c =>
  c.category === 'operative' || c.category === 'wild'
).length;
const operatives_in_basement = 1; // Otto, per Phase 1 line 49

const verified = {
  generated_at: new Date().toISOString(),
  source_git_sha: /* git rev-parse HEAD */ '',
  card_types: cards.length,
  illustrations,
  operations,
  operatives_in_deck,
  operatives_in_basement,
  operatives_on_roster_total: operatives_in_deck + operatives_in_basement,
  trailer_seconds: TOTAL_FRAMES / FPS,
};

// Cross-check: trailer narration (Phase 1 line 49) says "six in the deck, one in the basement"
// Hard-assert operatives_in_deck === 6 AND operatives_in_basement === 1
if (verified.operatives_in_deck !== 6) {
  throw new Error(
    `Stat drift: operatives_in_deck = ${verified.operatives_in_deck}, ` +
    `trailer narration says 6. Either trailer is wrong or codebase is wrong; ` +
    `reconcile before posting.`
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
amendment**: roadmap §1 should either (a) note Otto-in-basement is
narrative-only-not-shipped (cheap fix; aligns with Phase 1 line 49),
or (b) ship Otto card + art (expensive; out of Phase 7 scope). Phase
7 picks (a); roadmap §1 amendment in this same commit. (See Cross-
Phase Amendments section.)

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

**Step 2 — Render via single-pass FFmpeg multi-segment trim.**

Two implementation approaches:

**Approach 2a — Multi-input concat (preferred per FFmpeg trac wiki):**

```ts
// scripts/render-cutdown.ts (DIRECTIONAL)
import { execFileSync } from 'node:child_process';
import { renameSync, readFileSync } from 'node:fs';

// SAFE: argv array, no shell-string interpolation
const SOURCE = 'videos/trailer/out/trailer.mp4';
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

// Build filter_complex for multi-segment trim + concat
// Each segment: [0:v]trim=start_frame=N:end_frame=M,setpts=PTS-STARTPTS[vN]
//               [0:a]atrim=start=N/FPS:end=M/FPS,asetpts=PTS-STARTPTS[aN]
// Final concat: [v0][a0][v1][a1]...concat=n=N:v=1:a=1[outv][outa]
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
const filterComplex = filterParts.join(';');

// NO -vf fade=t=out / NO -af afade=t=out (ADR #24 hard-cut closure)
execFileSync('ffmpeg', [
  '-y',
  '-i', SOURCE,
  '-filter_complex', filterComplex,
  '-map', '[outv]',
  '-map', '[outa]',
  '-c:v', 'libx264',
  '-crf', '18',                     // ADR #19
  '-x264-preset', 'slow',           // ADR #19 (NOT -preset slow)
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '128k',
  '-ar', '48000',                   // framework-docs T2-B
  '-ac', '1',                       // ADR #14 mono
  '-movflags', '+faststart',
  STAGING,
]);
```

**Approach 2b — Per-segment files + concat demuxer** (fallback if
filter_complex hits edge cases on this footage):

For each segment, run `ffmpeg -i SRC -ss <startSec> -frames:v <N>
-c:v libx264 -crf 18 -x264-preset slow ... seg-<i>.mp4` then
concat-demuxer-join. Slower (per-segment re-encode) but simpler.
Phase 5 deepening line 1660-1665 documents the per-segment frame-
accurate single-pass pattern Phase 7 inherits.

**Approach decision**: Default to 2a (single FFmpeg invocation,
filter_complex). Fall back to 2b if 2a hits an edge case (e.g., A/V
stream-ordering mismatch in source). Document the chosen approach
in `cutdown-eval.md`.

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
#23, (iii) reads cold (cold-viewer reports scroll-stop intent).

If any audit FAIL: shift START_FRAME of the first segment forward
by 15–30 frames; re-render; re-audit. If 3 iterations fail: route
to a different Option (Phase 6 cutdown-frame-list.md A or B); if
all 3 Options fail: 16:9 cutdown does NOT ship (flagship-only
distribution); document the skip.

**Step 5 — AV-sync verification on cutdown.**

Mirror Phase 6 Unit 6.5 manifest-driven approach scoped to the
cutdown. If Option C, the R3 stacked-payoff at cutdown frame ~40
(segment 2 start + ~10 frames into R3) gets the ADR #20 zero-
tolerance check: audio MUST NOT lead visual. ffprobe + manifest
parse + tolerance assertion.

If audio-lead detected at R3: investigate. Likely causes per
feasibility F1: (a) filter_complex `atrim` and `trim` produce
different start-PTS due to keyframe alignment; (b) source has
keyframe gaps that misalign on segment boundary. Fix: regenerate
trim with `setpts=PTS-STARTPTS+0.001` adjustment OR re-route to
Approach 2b per-segment files.

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
  '-x264-preset', 'slow',
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
- Codec: H.264 High / CRF 18 / `--x264-preset slow` / yuv420p
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
- Create: `videos/trailer/distribution/release-urls.json` (output).
- Create: GitHub Release `burned-origin-trailer-v1` (remote).

**Approach:**

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

// Create release with assets
execFileSync('gh', [
  'release', 'create', tag,
  '--title', title,
  '--notes-file', notesFile,
  'videos/trailer/out/trailer.mp4',
  'videos/trailer/out/trailer-x-cutdown.mp4',
  'docs/trailer/thumbnail.jpg',
  // conditionally include 9:16 if rendered:
  // 'videos/trailer/out/trailer-x-cutdown-9-16.mp4',
]);

// Capture asset URLs
const releaseJson = execFileSync('gh', [
  'release', 'view', tag, '--json', 'assets'
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
- **Edge case:** `gh` CLI not authenticated → operator runs `gh
  auth login` (Briggsy execution, not Claude).

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

**Step 1 — README design system audit.**

Per frontend-design audit: the BURNED README is already restrained
Archer-coded (no badges, no emoji, no hero image, no marketing
voice). Plain `##` headings, table for tech stack, code-block for
project structure. **The README passes the bar.** No README rewrite
needed; the trailer embed slots into the existing typographic
system.

**Lock**: `## Trailer` section sits **before `## Status`**, between
the opening paragraph (line 8 area) and the Project Map block. This
is hero-second placement: opening paragraph → trailer → link
architecture. Engineering-Twitter visitors arriving from Post 1
land on a welcome mat; existing contributors retain the Project
Map.

**Step 2 — Drag-drop user-attachments procedure (ADR #29).**

GitHub Markdown sanitizer strips HTML `<video>` and `<iframe>`.
Markdown image-link to Release MP4 renders as clickable thumbnail-
to-download, NOT inline player. The ONLY mechanism producing an
inline `<video>` player in README is the drag-drop user-attachments
URL pattern.

Procedure (Briggsy execution; Claude documents):

1. On github.com, navigate to `projects/burned/README.md` and click
   the pencil ✎ edit button.
2. Position cursor immediately after the opening paragraph (before
   `## Project Map`).
3. Type `## Trailer` and a blank line.
4. Drag `videos/trailer/out/trailer.mp4` from local filesystem
   directly into the markdown editor buffer.
5. GitHub auto-uploads the MP4 and injects an HTML5 `<video>`
   element wrapping a `https://github.com/user-attachments/assets/<UUID>`
   URL. This URL renders as an inline video player on README.
6. Below the inline video, paste the canonical context paragraph
   (Step 3 below).
7. Below the context paragraph, paste the inline-text fallback links
   to Release assets (Step 3 below).
8. Commit the change with message `docs(burned): add origin trailer
   to README — Phase 7 Unit 7.2`.

**Critical caveat per ADR #29**: the GitHub user-attachments
mechanism has a **10 MB free / 100 MB paid attachment cap**. BURNED
flagship at 95s / CRF 18 / `--x264-preset slow` is approximately
150–250 MB — **exceeds the user-attachments cap**.

**Phase 7 implication**: We CANNOT inline-embed the full flagship
trailer via user-attachments. Options:

(a) **Briggsy upgrades to GitHub Pro/Paid** → 100 MB attachment cap
still doesn't fit a 200 MB flagship.

(b) **Use the cutdown for inline embed**, link to flagship via
Release asset.
- Cutdown at ~25–40 MB clears 100 MB paid cap; might clear 10 MB
  free cap with adjusted CRF. **Default Phase 7 procedure: drag-drop
  the CUTDOWN as the inline-played embed; link to flagship via
  Release URL below it.**

(c) **Re-encode flagship at higher CRF** (CRF 24-26) for an
"attachment-friendly" version that fits 10 MB free cap. Quality
trade-off; defeats the bar-raise. NOT default.

(d) **Skip inline embed; use Phase 7's prior clickable-thumbnail-
to-Release approach.** Less native-feeling but reliable.

**Lock**: option (b) — drag-drop cutdown as inline-played embed (it
shows the load-bearing R3 + closer beats); flagship link below as
"full 95s trailer" CTA. Trade-off acknowledged: the README's hero
visual is the 12s cutdown, not the 95s flagship. Engineering-Twitter
visitors clicking through to GitHub from Post 1 land on the cutdown
which they may have just watched on X — but the inline player
removes a click-through friction layer to a Release asset that may
404 if Release isn't published, doesn't auto-play, etc.

**Step 3 — Canonical Markdown.**

After drag-drop in Step 2.5, the README section reads (final
Markdown, with `<UUID>` substituted at execution time by the drag-
drop operation):

```md
## Trailer

https://github.com/user-attachments/assets/<UUID-cutdown>

A 12-second highlight of the 95-second origin trailer for BURNED —
an Archer-tone autonomous-SDLC party game built end-to-end by Claude
under ATC direction. Second proof point that the method ships
repeatably; first was [Undercover Mob Boss](../undercover-mob-boss/),
2026-03.

[Full trailer (95s)](https://github.com/mbriggsy/burned/releases/download/burned-origin-trailer-v1/trailer.mp4) · [X-native cutdown (12s)](https://github.com/mbriggsy/burned/releases/download/burned-origin-trailer-v1/trailer-x-cutdown.mp4)
```

Notes on the canonical markdown:
- The bare `https://github.com/user-attachments/...` URL is what
  GitHub renders as inline `<video>` (NOT `[![thumb](png)](url)`
  wrapping).
- Two-line context paragraph matches the opening paragraph's cadence.
- Interpunct (·) CTA separator matches Project Map convention.
- No badges, no emoji, no marketing voice (respects README design
  system per frontend-design audit).
- Cross-link to UMB v3 with relative path (works on github.com
  navigation).
- Asset URLs in the CTAs are GitHub Release URLs from `release-urls.json`
  (Unit 7.1b output). Pasted at write time; never committed as
  placeholders.

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
- IF Briggsy has a portfolio site, embed via HTML5 `<video>` tag
  with poster attribute pointing at `docs/trailer/thumbnail.jpg`.
- Design tokens / page structure: per frontend-design
  recommendation (Archer palette: teal #1a4d5e / cream #f5e6d3 /
  orange #d97032 / ink #0d2027; serif + sans pairing; centered
  16:9 frame, max-width 1200px, 80px top padding, 64ch reading
  width, single CTA via inline orange link). Specified for the
  hypothetical; defer to Briggsy at execution.
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

**Step 1 — Variation A (locked default, non-Premium-safe).**

Per stat-verification gate (Unit 7.0): caption uses canonical numbers
matching trailer narration. "Six in the deck, one in the basement"
matches Phase 1 line 49 narration.

Per design-lens "technically" hedge note: remove the hedge for the
Sterling-CODED cadence.

**Locked Variation A** (~210 chars, fits 280 free-tier cap):

> *"BURNED. An Archer-tone party game.*
>
> *17 illustrations, 120 operations, six operatives in the deck,
> one in the basement.*
>
> *Don't ask about Agent X.*
>
> *...Phrasing."*
>
> *[attached: trailer.mp4]*

Stats source: `verified-stats.json` from Unit 7.0. Stats land in
trailer narration order; reader can fact-check against the trailer
itself.

**Step 2 — Variation B/C/D sidecar.**

Per scope-guardian + repo-research: variants B and C retained as
sidecar at `caption-variants-considered.md` for retrospective only,
NOT in Phase 7 plan body. Decision theater eliminated.

Variation D (Premium-only, extended) — drafted IF Briggsy account
state = Premium / Premium Plus per entry gate. Otherwise omitted.

**Variation D draft** (~600 chars, Premium-only):

> *"BURNED. An Archer-tone party game.*
>
> *17 illustrations. 120 operations. Six operatives in the deck,
> one in the basement.*
>
> *Built end-to-end by Claude under ATC direction. Second proof
> point that the autonomous-SDLC method ships repeatably — first
> was [Undercover Mob Boss](https://...) 2026-03.*
>
> *Don't ask about Agent X.*
>
> *...Phrasing."*

Note: includes a link → triggers link-demotion penalty per
non-Premium critical constraint. Variation D is ONLY safe on a
Premium account where algorithmic boost partially offsets link
penalty. Even on Premium, links are higher-risk than no-links;
**Variation A remains the safer default**; D is an unlock not a
recommendation.

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

**Step 5 — Post 3 (pinned, D+7).**

Pinned tweet stays at top of profile. Ever-green, self-contained,
worth repeated impressions.

> *"BURNED.*
>
> *An Archer-tone party game. Built by Claude under ATC direction.*
>
> *Operation Pendleton — second proof.*
>
> *[attached: trailer.mp4]"*

Reads cold; references UMB v3 implicitly via "second proof"; sells
the engineering claim without explaining it. References Pendleton
agency in-universe term.

**Step 6 — X composer rendering verification (emil's check).**

Before posting, paste each locked variant into the X composer (DO
NOT post). Screenshot the composer preview. Verify:

- `...` renders as three ASCII dots, NOT autoformatted to `…` (U+2026
  ellipsis-glyph). If autoformatted: switch to explicit `U+2026`
  in the source OR restructure to avoid the dots.
- Em-dash (`—`) renders correctly, NOT collapsed to hyphen on
  clipboard round-trip.
- Period after `...Phrasing` lands as a period, not absorbed into
  ellipsis.
- Line breaks render as intended (X composer's preview vs published).

Save screenshots as `caption-rendering-verification-{variant}.png`
in `videos/trailer/distribution/`. Briggsy reviews; on approval,
sign off.

**Step 7 — Documentation.**

`x-post.md`:

```md
# X Post Copy — Phase 7 Unit 7.3

## Account state (from entry gate)
- Briggsy X: <Premium / Premium Plus / free>
- Variation lock: <A if free; A or D if Premium per Briggsy choice>

## Post 1 (flagship launch, T+0)
- Caption: Variation A locked (Variation D unlocked if Premium)
- [draft per Step 1/Step 2]
- Character count: ~210 (Variation A) / ~600 (Variation D)
- Attached media: out/trailer.mp4
- Posting time: D+0 (Tue/Wed) 10am ET
- Rendering verified: caption-rendering-verification-A.png

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
| D+0 evening | Informal impression check (no public action) | local |
| D+1 morning | D+1 metrics log entry (impressions, watch-through) | local |
| D+7 | **Pin Post 1** | X |
| D+30 | Full retrospective; memory-promote per insight 052 IF surprising | local |
| D+180 OR new-project ship | Unit 7.7 pin replacement | X |

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

### D+1 (24 hours after launch)
- X impressions Post 1: <N>
- X engagement rate Post 1: <N%>
- X full-trailer watch-through (if data available): <%>
- Post 2 cutdown impressions: <N>
- Post 2b stack-thread impressions: <N>
- Discord shares: <N>
- Notable replies / DMs: <list>

### D+7 (1 week — pin action triggered)
- Cumulative X impressions: <N>
- Watch-through trend: <stable / declining / growing>
- Pin: <Post 1 / pinned candidate / no pin>

### D+30 — Retrospective + memory promotion
- Cumulative impressions: <N>
- Did the agentic-SDLC decode work in the wild? (replies/DMs
  mentioning AI/agent/autonomous unprompted) <count + qualitative>
- Did the §2 Archer test resonate? (replies mentioning Archer) <count>
- Did cutdown outperform flagship? (compare watch-through rates) <verdict>
- Did UMB v3 viewers cross over? (replies referencing UMB) <count>
- **MEMORY-PROMOTION**: surprising signals → `~/.claude/projects/.../memory/` per `feedback-make-a-note.md`. UNSURPRISING signals stay logged here.
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

// 4. Release URLs captured
const urls = existsSync('videos/trailer/distribution/release-urls.json')
  ? JSON.parse(readFileSync('videos/trailer/distribution/release-urls.json', 'utf8'))
  : null;
checks.push({
  name: 'release-urls.json populated',
  pass: urls !== null && Object.keys(urls.urls).length > 0,
  detail: urls ? `tag=${urls.tag}, ${Object.keys(urls.urls).length} URLs` : 'MISSING',
});

// 5. Verified stats present
checks.push({
  name: 'verified-stats.json present',
  pass: existsSync('videos/trailer/distribution/verified-stats.json'),
  detail: '',
});

// 6. Sentinels present (git-author-checked separately by verify:briggsy-sentinels)
const sentinels = [
  'briggsy-review-7.0.signoff',
  'briggsy-review-7.1.signoff',
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

**Step 1 — Pin replacement triggers as OR-of-explicit-events.**

```md
# Pin Lifecycle — Phase 7 Unit 7.7

## Replace triggers (OR — any one fires)

Pin is replaced when ANY of:

1. **Time trigger**: 180 days have passed since D+7 pin action.
   - Calendar entry in `TODO.md` Phase 7 section: "D+180: revisit
     BURNED pinned tweet" (computed from D+0 + 180 days; absolute
     date written at execution).
2. **New-project trigger**: `videos/<next-project>/distribution/x-post.md`
   exists (next agentic-SDLC project has its own distribution doc).
3. **Manual override**: Briggsy commits `.unpin-burned.signoff`
   sentinel at `videos/trailer/distribution/.unpin-burned.signoff`
   under briggsy007@gmail.com git author identity.

## Replacement action

When any trigger fires:
1. Briggsy unpins BURNED trailer from X profile.
2. Pins replacement (next project's pinned candidate, OR a fresh
   profile-card tweet).
3. Commits `.unpin-burned.signoff` if not already committed.

## No-replacement criteria

If at D+180:
- No new agentic-SDLC project has shipped yet, AND
- BURNED trailer pin still receives meaningful new impressions
  (>50/month), AND
- No structural change to BURNED has reversed the trailer's
  "static showcase" claim,

THEN: extend pin by additional 90 days. Add a new TODO.md entry at
D+270.

If at D+360 still no replacement criterion met:
- Reconsider whether pinning is still valuable (vs. profile-card
  tweet, vs. no pin).
- Memory-promote per `feedback-make-a-note.md` if the answer is
  "pinning a 1-year-old trailer is signal-of-stagnation."
```

**Step 2 — TODO.md cross-session calendar entry.**

Add to `TODO.md` Phase 7 section (or §Pin Review):

```md
### Pin Review (auto-added by Phase 7 Unit 7.7)
- **D+180 (compute date)**: revisit BURNED pinned tweet per
  pin-lifecycle.md replacement criteria
- Triggers: time / new-project / manual `.unpin-burned.signoff`
```

This is the cross-session persistence step per `feedback-write-it-down.md`.
Conversation evaporates; this TODO row survives.

**Patterns to follow:**

- `feedback-write-it-down.md` cross-session persistence.
- ADR #22 sentinel ceremony for the `.unpin-burned.signoff`.
- `feedback-make-a-note.md` for memory-promotion at D+360 if pin
  outlives its usefulness.

**Test scenarios:**

- **Happy path:** D+180 fires → Briggsy reviews; replaces pin OR
  extends to D+270.
- **Edge case:** Next project ships D+90 → new-project trigger fires
  early; pin rotates.
- **Edge case:** Briggsy decides D+30 to unpin (e.g., decides pin is
  drawing wrong attention) → commits `.unpin-burned.signoff`; pin
  removed; future projects' entries to TODO.md still inherit the
  pattern.

**Verification:**

- `pin-lifecycle.md` documents replacement triggers + action.
- `TODO.md` Phase 7 section has D+180 calendar entry with computed
  absolute date.

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
| Cutdown >10MB user-attachments free cap | Medium | Medium | Document trade-off; Briggsy on paid (100MB cap) handles ~25-40MB cutdown trivially |
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
- **Cutdown encoding**: CRF 18 / `--x264-preset slow` / mono AAC
  128k 48kHz per ADR #14 + #19.
- **Thumbnail default**: frame 2790 per Phase 6 line 2253 lock.
- **Thumbnail README derivative**: 1200×675 q85 JPEG at `docs/trailer/thumbnail.jpg`
  (Phase 6 cross-phase amendment).
- **README embed mechanism**: drag-drop user-attachments URL per ADR
  #29; cutdown as inline (not flagship — exceeds attachment cap);
  flagship via Release CTAs below.
- **README placement**: hero-second (`## Trailer` before `## Status`).
- **Caption stats**: derived from Unit 7.0 verified-stats.json; "six
  operatives in the deck, one in the basement" matches Phase 1
  narration.
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

### Roadmap §1 — roster contradiction resolution (note Otto-in-basement is narrative-only)

Current roadmap §1 line 50 says: *"seven named operatives in the
roster (Dash, Vera, Sable, Janet, Neal, Otto, Agent X)"*. Codebase
ships 6 (5 named + Agent X wild); Otto has no card or art.

Add a clarifying note inline:

> *"seven named operatives in the roster (Dash, Vera, Sable, Janet,
> Neal, Otto, Agent X) — **six in the deck, one (Otto) in the
> basement: narrative-only-not-shipped per Phase 1 line 49 + Phase
> 7 stat-verification gate.** Captioned distribution copy must
> match: 'six operatives in the deck, one in the basement.'"*

### Roadmap §6 — brainstorm corrections add a new row C7

Add to §6 table:

| # | Brainstorm/Phase 7 pre-deepening claim | Research finding | Disposition |
|---|---|---|---|
| C7 | Phase 7 caption "7 operatives" | `src/shared/card-defs.ts` ships 5 operatives + Agent X (wild) = 6 entries; trailer narration (Phase 1 line 49) says "six in the deck, one in the basement." | **Caption corrected to "six operatives in the deck, one in the basement"** per ADR #26 stat-verification gate. |

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
- User-attachment cap: 10 MB free / 100 MB paid (per Context7
  `/github/docs` attaching-files)
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
