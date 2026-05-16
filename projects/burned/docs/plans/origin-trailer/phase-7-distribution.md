---
title: "Origin Trailer — Phase 7: Distribution"
type: feat
phase: 7
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
---

# Phase 7 — Distribution

## Overview

Phase 7 takes the Phase 6 final deliverables (`out/trailer.mp4` +
`out/thumbnail.png`) and ships them: an X-native cutdown for in-feed
distribution, portfolio embed copy, post text, pinned-tweet
candidate, and a documented distribution plan. The trailer's
audience is engineering peers (same lane as UMB v3); Phase 7 routes
the trailer to where engineering peers will see it.

Phase 7 produces:

- `videos/trailer/out/trailer-x-cutdown.mp4` — 7–15-second X-native
  cutdown for in-feed consumption (per roadmap §5.4)
- `videos/trailer/distribution/x-post.md` — primary X post text
  + attached media (full trailer + cutdown)
- `videos/trailer/distribution/portfolio-embed.md` — embed copy +
  thumbnail spec for portfolio surface (Briggsy's portfolio site or
  GitHub README)
- `videos/trailer/distribution/post-calendar.md` — distribution
  sequence: when to post X, when to update portfolio, when to share
  in Discord / other surfaces
- `videos/trailer/distribution/metrics-tracking.md` — what to track
  (impressions, watch-through, engagement) and where to record
  retrospective data
- `videos/trailer/distribution/pinned-tweet.md` — pinned tweet
  candidate copy (optional, depends on Briggsy's account strategy)

Phase 7 exits when:
1. X-native cutdown rendered + verified at X spec (7–15s, 1.91:1
   or 16:9 acceptable, AAC 128k, ≤512 MB).
2. All distribution-surface copy written.
3. Briggsy approves the distribution plan + posts according to the
   calendar (or schedules via X scheduling).

---

## Problem Frame

Per brainstorm Dependencies / Assumptions:
> *"Distribution surface: Primary surface is presumed to be Briggsy's
> Twitter/X timeline + portfolio embed, both desktop-landscape-dominant
> in the engineering-peer audience watch context."*

Per roadmap §5.4:
> *"Runtime sweet spot for portfolio trailers: 60–90s. BURNED's
> 90–100s envelope is at the top end. Acceptable. For X-native
> in-feed cutdown: 7–15s. Phase 7 ships a flagship 95s + a 12s
> X-native cutdown."*

The flagship 95s lives at portfolio + as the primary X post upload.
The 7–15s cutdown lives in subsequent X posts (boosting reach via
multiple impressions across the timeline) and as a fast-scroll hook
in any teaser context.

The audience is engineering peers. Engineering-Twitter watch
behavior:
- Scroll-stops if first 3 seconds visually surprise (per roadmap §5.4)
- Watches 7–15s clips through (cutdown sweet spot)
- Clicks through to longer if 15s hooks them
- Reads attached text / quoted-tweet thread

Phase 7's distribution sequence:
1. Initial post: flagship 95s + caption + thumbnail
2. Quoted-tweet thread (immediately or 24h later): X-native cutdown +
   "engineering details" thread
3. Pinned tweet: locked to the flagship post for ongoing visibility
4. Portfolio update: embed flagship + brief context

The risks Phase 7 manages:

- **Cutdown loses the R3 stacked-payoff moment**: the cutdown is
  shorter than the trailer's cascade-to-payoff arc; Phase 7 must
  choose what 7–15-second window carries the trailer's load-bearing
  beat.
- **Wrong-frame thumbnail**: thumbnail is what scroll-stops people
  on X. Phase 6 produced one default thumbnail; Phase 7 may iterate.
- **Caption that fights the trailer**: post copy that over-explains
  defeats the water-beads rule. The post should sell BURNED first,
  agentic-SDLC second.
- **Sub-optimal post timing**: engineering Twitter has temporal
  patterns. Posting at 3am on a Saturday minimizes engagement
  regardless of content quality.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5.4, brainstorm Dependencies.

### X / Twitter video specs (2026) — recap

Per roadmap §5.4:
- MP4 / MOV
- H.264 High profile
- AAC-LC 128 kbps audio
- 30 fps recommended (60 supported)
- 5–8 Mbps VBR for 1080p (don't overshoot — X re-encodes)
- Non-premium cap: 2:20 length / 512 MB

Flagship 95s × ~150–250 MB clears both caps. Cutdown 7–15s × ~25–40 MB
trivially clears.

### Engineering-Twitter watch behavior

Per roadmap §5.4 "Alive" patterns:
- Working product in motion in second 1
- UI speaks
- Text overlays carry narrative (autoplay muted)

Reference points:
- Replit Agent 3 + 4 launch reels (real-time screen recording, no
  narration, captions only)
- Cursor 0.50 + 3 launches (screen-recorded multi-file refactor,
  ambient sound, visible code touching files)
- Pattern: **show artifact working in second 1, never explain in VO,
  let chyron carry the joke**

BURNED partially diverges from this pattern (it has sustained Dash VO
+ less screen-recording-of-code). The divergence is intentional —
BURNED's trailer is about the *result* (BURNED is a finished, playable,
Archer-tone party game), not the *process* (Claude writing code). The
divergence is the bar-raise.

But the *cutdown* MAY lean closer to the engineering-Twitter pattern:
heavier emphasis on showing BURNED gameplay + R15 chrome stamps; less
emphasis on the Dash narration arc. Cutdown selection in Unit 7.1
considers this.

### Cutdown candidate sequences

Three 12-second cutdown candidates from the 95-second trailer:

| Candidate | Source frames | Carries | Pros | Cons |
|-----------|---------------|---------|------|------|
| **A. Cold-open → BURNED logo** | 0–210 (S01, 7s) + 2580–2790 (S06, 7s) | Cold-open hook + closing logo | Captures bookends; agentic-SDLC R14 hook lands | Misses cascade + gameplay |
| **B. Cascade peak → payoff stamp** | 1860–2040 (S04 last 6s) + S05 first ~6s gameplay | Stacked-payoff R3 + real-game | Lands the trailer's load-bearing beat | Cold viewer doesn't get context |
| **C. R15 + gameplay highlight reel** | Custom-edited compilation: cold-open R15 stamp + cascade peak stamp + gameplay BURNED draw + closing R15 #4 | R15 chrome thread + payoff + game | Engineering-Twitter coded; high information density | Heavily edited — diverges from trailer narrative |

**Lock: Candidate B (cascade peak → gameplay highlight)** with R15 #3
stamp landing prominently. Reasoning:
- Carries R3 stacked-payoff — the trailer's load-bearing beat
- Shows BURNED gameplay (real-game proof)
- Lands within engineering-Twitter watch window (7–15s)
- "Show artifact working in second 1" = the cascade peak visuals
- Chyron (R15 #3 stamp "AUTONOMOUS FIELD UNIT — ASSET DELIVERED")
  carries the agentic-SDLC signal explicitly

Phase 7 Unit 7.1 produces this.

### Thumbnail selection

Phase 6 produced `out/thumbnail.png` from frame 1950 (stacked-payoff
stamp). Phase 7 may iterate:

| Frame | What it shows | Scroll-stop weight |
|-------|---------------|---------------------|
| 30 | Cold-open card flash (cold-open speaker portrait) | Medium |
| 180 | BURNED logo land in S01 | High (logo is the brand) |
| 1860 | Cascade peak (HTP + halo + ticker) | High (visually rich) |
| **1950** | Stacked-payoff stamp + HTP | **Default — highest scroll-stop weight** |
| 2790 | Closing BURNED logo + R15 #4 | High (logo + subhead together) |

Lock: frame 1950 as primary thumbnail. Frame 2790 as A/B candidate
if frame 1950 doesn't perform on initial X impression count.

### Engineering-Twitter post-timing data

Per general industry data (verify with current 2026 X analytics
patterns at execution time):
- Tuesday–Thursday best engagement
- 9am–11am Eastern + 5pm–7pm Eastern best windows
- Avoid weekends (engineering audience offline)
- Avoid major industry-event-busy days (re:Invent, KubeCon, X release
  announcement days when timeline saturates)

Phase 7 default post-timing: Tuesday or Wednesday at 10am Eastern.
Briggsy may override per current X analytics.

### Account context: Briggsy's X handle

Briggsy posts from his personal handle. Audience: engineering peers,
fellow autonomous-SDLC builders, the broader Claude / agentic-AI
community. The trailer is **second proof point** (UMB v3 was first);
the post copy should reference UMB v3 implicitly OR explicitly per
Briggsy's preference.

---

## Requirements Trace

- **R8** (16:9 landscape): inherited; cutdown also 16:9.
- **R14** (cold-open) — pulled out for cutdown candidate A; not the
  lock.
- **R15** (text signal layer) — R15 #3 stamp prominently featured in
  cutdown B.
- All other R-requirements inherited from Phase 6 deliverable.

---

## Key Technical Decisions

- **Cutdown lock**: Candidate B (cascade peak → gameplay), 12 seconds.
- **Encoding for cutdown**: same as flagship (H.264 High / CRF 17 /
  preset slow / yuv420p / AAC 128k / faststart). Smaller file size
  trivially.
- **Thumbnail**: frame 1950 default; frame 2790 A/B candidate.
- **Distribution surfaces**: X (primary), portfolio (secondary),
  Discord (tertiary).
- **Post sequence**: 3 separate X posts spaced 24h apart for
  multi-impression reach.
- **Caption philosophy**: water-beads rule applies — sell BURNED
  first, agentic-SDLC second. Brief, punchy, deferred-to-reader.
- **No tracking pixels or analytics scripts embedded** — distribution
  metrics tracked via X-native analytics, not custom instrumentation.
- **All shell-outs use `execFileSync` argv arrays**.

---

## Implementation Units

### Unit 7.1 — X-Native Cutdown Production

- [ ] **Unit 7.1: X-Native Cutdown Production**

**Goal:** Produce 12-second cutdown MP4 from the cascade-peak-to-
gameplay window of the flagship trailer. Output:
`out/trailer-x-cutdown.mp4`.

**Requirements:** R8, R13 (gameplay closer feature), R15 (R15 #3
prominent).

**Dependencies:** Phase 6 deliverable (`out/trailer.mp4` final).

**Files:**

- Create: `videos/trailer/scripts/render-cutdown.ts` — FFmpeg-based
  trim + concat script.
- Create: `videos/trailer/out/trailer-x-cutdown.mp4` — final cutdown.
- Create: `videos/trailer/sample-eval/distribution/cutdown-eval.md`

**Approach:**

**Step 1 — Cutdown plan.**

Cutdown structure (12 seconds, 360 frames @ 30fps):

| Cutdown frame | Source frame | Duration | Description |
|---------------|--------------|----------|-------------|
| 0–60 | 1860–1920 | 2.0s | Cascade peak (HTP + halo + ticker; pre-stamp) |
| 60–135 | 1920–1995 | 2.5s | Stacked-payoff stamp slap + Dash "They WERE the operation." |
| 135–180 | 1995–2040 | 1.5s | Cross-dissolve (the R3 bridge — preserves the moment) |
| 180–330 | 2040–2190 | 5.0s | Gameplay clip start — real BURNED multiplayer |
| 330–360 | 2190–2220 | 1.0s | Mid-gameplay; cut to black at end |

Total: 12.0 seconds.

**Step 2 — FFmpeg trim script.**

```ts
// videos/trailer/scripts/render-cutdown.ts
import { execFileSync } from 'node:child_process';

const SRC = 'videos/trailer/out/trailer.mp4';
const DST = 'videos/trailer/out/trailer-x-cutdown.mp4';

// Cutdown source frames 1860–2220 = 12 seconds @ 30fps
const FPS = 30;
const START_FRAME = 1860;
const DURATION_FRAMES = 360;
const startSec = START_FRAME / FPS;
const durationSec = DURATION_FRAMES / FPS;

// SAFE: argv array. Trim with re-encode (need fade-out at end)
execFileSync('ffmpeg', [
  '-y',
  '-ss', String(startSec),
  '-i', SRC,
  '-t', String(durationSec),
  '-c:v', 'libx264',
  '-crf', '17',
  '-preset', 'slow',
  '-pix_fmt', 'yuv420p',
  '-r', '30',
  '-vf', `fade=t=out:st=${durationSec - 0.5}:d=0.5`,    // 500ms fade-out
  '-c:a', 'aac',
  '-b:a', '128k',
  '-af', `afade=t=out:st=${durationSec - 0.5}:d=0.5`,
  '-movflags', '+faststart',
  DST,
]);

console.log(`OK cutdown rendered: ${DST}`);
```

**Step 3 — Cutdown verification.**

```bash
ffprobe -v error -show_format -show_streams out/trailer-x-cutdown.mp4 -of json
```

Expected:
- Duration ≈ 12.000s ±0.1s
- Resolution 1920×1080
- Codec h264 / High / yuv420p
- File size ~25–40 MB (well under X 512 MB cap)

**Step 4 — Playback verification.**

- Plays end-to-end
- Stacked-payoff stamp visible at cutdown frame ~80
- Gameplay clip readable from cutdown frame ~180
- Fade-out audible + visible at end

**Step 5 — Engineering-Twitter watch test.**

A subjective check: does the cutdown work cold? 12 seconds, scroll-
through pattern. Briggsy watches without context; reports whether:
- First 3 seconds visually compelling (cascade peak)
- R3 stamp moment lands within window
- Gameplay reveal completes the "real game" sell
- Fade-out reads as intentional close, not abrupt

If "first 3 seconds underwhelming": shift START_FRAME forward by
30–60 frames (move into cascade peak more visually rich).

**Step 6 — Cutdown documentation.**

```md
# X-Native Cutdown — Phase 7 Unit 7.1

## Cutdown plan
- Source frames: 1860–2220 (12 seconds)
- Carries: cascade peak → stacked payoff → gameplay reveal
- R3 stacked-payoff visible: YES
- R15 #3 stamp prominent: YES
- Real gameplay reveal: YES

## Render verification
- File: out/trailer-x-cutdown.mp4
- Duration: <measured>s (target 12.0s)
- Dimensions: 1920×1080
- Codec: H.264 High / CRF 17 / preset slow
- File size: <N> MB

## Engineering-Twitter watch test
- First 3 seconds compelling: YES / NO
- R3 stamp lands within window: YES
- Gameplay reveals real game: YES
- Fade-out reads intentional: YES

## Verdict: SHIP / iterate
```

**Patterns to follow:**

- Phase 6 Unit 6.1 encoding settings.
- FFmpeg trim + re-encode pattern.
- Project security rule: `execFileSync` argv.

**Test scenarios:**

- **Happy path:** Cutdown renders cleanly; watch test passes.
- **Edge case:** First 3 seconds underwhelming → shift START_FRAME;
  re-render.
- **Edge case:** R3 stamp doesn't land within window → reconsider
  cutdown plan (Candidate A or C may be better fit).
- **Security:** No shell-string interpolation in FFmpeg call.

**Verification:**

- `out/trailer-x-cutdown.mp4` exists at spec.
- `cutdown-eval.md` documents render + watch test.
- Cutdown reviewed + signed off by Briggsy.

---

### Unit 7.2 — Portfolio Embed Page

- [ ] **Unit 7.2: Portfolio Embed Page**

**Goal:** Define how the trailer embeds on Briggsy's portfolio
surface (portfolio site OR GitHub README OR equivalent). Provide
HTML / Markdown embed snippets + context paragraph.

**Requirements:** Distribution surface coverage.

**Dependencies:** Unit 7.1 (cutdown for portfolio teaser; flagship
for full embed).

**Files:**

- Create: `videos/trailer/distribution/portfolio-embed.md`

**Approach:**

**Step 1 — Identify portfolio surface.**

Three candidate surfaces:

| Surface | Embed type | Notes |
|---------|-----------|-------|
| GitHub README at `projects/burned/README.md` | Markdown image link or video link | GitHub renders MP4 inline for repos |
| Briggsy's personal portfolio site (if exists) | HTML `<video>` tag | Full control |
| YouTube unlisted upload | Embed `<iframe>` | Browseable + chapters |

**Lock**: GitHub README at `projects/burned/README.md` as primary;
optional YouTube unlisted as secondary.

**Step 2 — GitHub README embed snippet.**

GitHub renders MP4 attachments inline if uploaded via the web
interface (drag-and-drop into a Markdown comment). The MP4 needs
to be hosted somewhere accessible.

Two hosting options:
- **Option I — Upload to GitHub Issue or Release**: drag MP4 into
  a GitHub issue/release; GitHub assigns a CDN URL like
  `https://user-images.githubusercontent.com/...`. Use that URL in
  README.
- **Option II — Host on Cloudflare Pages** alongside BURNED's deploy:
  upload to `burned-cxa.pages.dev/trailer.mp4`. URL stable across
  edits.

Lock: Option I (GitHub-hosted via Release attachment). Self-contained
in the repo's release artifacts.

**Step 3 — README section addition.**

```md
## Origin Trailer

[![BURNED Origin Trailer](docs/trailer/thumbnail.png)](https://github.com/<user>/<repo>/releases/download/<tag>/trailer.mp4)

A 95-second origin trailer for BURNED, the autonomous-SDLC party game.
Built end-to-end by Claude under ATC direction. The autonomous field
assets, the forensic dossiers, the mission rehearsal artifacts —
they weren't preparing for the operation. They WERE the operation.

[Full trailer (95s)](release/url) · [X-native cutdown (12s)](release/url-cutdown)
```

(Substitute actual release tag + URLs at Phase 7 execution.)

**Step 4 — YouTube unlisted optional.**

If Briggsy wants browseable / shareable / chapter-supported version:
upload to YouTube as unlisted. Provides:
- Stable URL (no GitHub Release coupling)
- Chapters via timestamps
- Analytics (impressions, watch-through)

Trade-off: YouTube has its own re-encoding pipeline; visual quality
may degrade slightly. Not embed-equivalent to the Cloudflare-hosted
self-served MP4.

Defer to Briggsy preference. Phase 7 documents both options.

**Step 5 — Embed copy.**

`portfolio-embed.md`:

```md
# Portfolio Embed — Phase 7 Unit 7.2

## Primary surface: GitHub README (projects/burned/README.md)

### Snippet
```md
## Origin Trailer

[trailer thumbnail + link]

A 95-second origin trailer for BURNED — built end-to-end by Claude
under ATC direction. Second proof point that the autonomous-SDLC
method works repeatably. (First was UMB v3 — Undercover Mob Boss,
shipped 2026-03.)

The cascade earns its place by feeling like Archer set-dressing,
not a credits roll.

[Full trailer (95s) — GitHub release](https://github.com/.../trailer.mp4)
[X-native cutdown (12s)](https://github.com/.../trailer-x-cutdown.mp4)
```

## Secondary surface (optional): YouTube unlisted

If browseable shareable URL needed:
- Upload to youtube.com/<channel> as Unlisted
- Title: "BURNED — Origin Trailer (Agent-Built, Archer-Grade)"
- Description: same as README copy
- Chapters: 0:00 Cold Open / 0:07 Briefing / 0:19 Mission / 0:35 Cascade / 1:08 Gameplay / 1:26 Closing

## Tertiary surface (optional): personal portfolio site

If Briggsy has a portfolio site, embed via HTML `<video>` with
poster attribute pointing at thumbnail.png:
```html
<video controls poster="thumbnail.png" preload="metadata">
  <source src="trailer.mp4" type="video/mp4">
</video>
```
```

**Patterns to follow:**

- GitHub README video embed conventions.
- UMB v3 portfolio surface (if any documented).

**Test scenarios:**

- **Happy path:** GitHub README updated; link works; thumbnail
  renders.
- **Edge case:** GitHub Release upload fails for >100 MB file →
  switch to Cloudflare Pages hosting.

**Verification:**

- `portfolio-embed.md` documents embed snippets + surfaces.
- README ready for Phase 7 execution to apply.

---

### Unit 7.3 — X Post Copy

- [ ] **Unit 7.3: X Post Copy**

**Goal:** Draft the X post copy for the trailer + cutdown launch.
Three post drafts (initial flagship, quoted-tweet thread with
cutdown, pinned-tweet candidate).

**Requirements:** Distribution voice + water-beads rule.

**Dependencies:** None — runs in parallel with Unit 7.1.

**Files:**

- Create: `videos/trailer/distribution/x-post.md`
- Create: `videos/trailer/distribution/pinned-tweet.md`

**Approach:**

**Step 1 — Post 1 (flagship, primary launch).**

X has a ~280 character limit per tweet (free tier; X Premium allows
longer). Posts with attached video can be brief.

Draft candidate:

> *"BURNED — an Archer-tone autonomous-SDLC party game.*
>
> *95 seconds of forensic dossiers, autonomous field assets, and a
> burned cover. Built end-to-end by Claude.*
>
> *...Phrasing."*
>
> *[attached: trailer.mp4]*

Character count: ~210. Fits free-tier cap.

Variations:

- **Variation A (water-beads heavy):**
  > *"BURNED. An Archer-tone party game. 17 illustrations, 120
  > operations, 7 operatives, one of whom is technically all of them.*
  >
  > *Don't ask about Agent X.*
  >
  > *[trailer.mp4]"*

- **Variation B (agentic-SDLC explicit):**
  > *"Second autonomous-SDLC proof point: BURNED, an Archer-tone
  > party game built end-to-end by Claude.*
  >
  > *95-second origin trailer:*
  >
  > *[trailer.mp4]"*

- **Variation C (engineering-mystique):**
  > *"BURNED.*
  >
  > *Agent-built, Archer-grade.*
  >
  > *...Phrasing.*
  >
  > *[trailer.mp4]"*

Variation A leans hardest into water-beads ("sell BURNED first").
Variation B foregrounds the engineering claim. Variation C minimalist
intrigue.

**Lock**: Variation A by default per water-beads rule. Briggsy may
override per voice preference.

**Step 2 — Post 2 (quoted-tweet thread with cutdown).**

24 hours after Post 1. Quotes Post 1 + attaches cutdown + adds 1–2
extra context tweets.

> *"For those who want the highlight reel — 12 seconds of the
> stacked-payoff beat.*
>
> *Briefing-room cascade → autonomous field assets → real-game
> dissolve.*
>
> *[cutdown.mp4]"*

Quoted to: Post 1.

Optional follow-up tweet (same thread):
> *"Stack:*
> *Cloudflare Workers Durable Objects + React 19 + Framer Motion.*
> *Remotion 4.0 for the trailer.*
> *17 Imagen-generated illustrations.*
> *Approximately 14,000 pages of forensic dossiers.*"

(That last beat is an in-character agentic-SDLC R15 reference.)

**Step 3 — Post 3 (pinned tweet candidate).**

Pinned tweets on X stay at top of profile. Should be ever-green +
self-contained + worth repeated impressions.

Candidate:

> *"BURNED.*
>
> *An Archer-tone autonomous-SDLC party game.*
> *Built by Claude under ATC direction.*
>
> *Operation Pendleton — second proof.*
>
> *[trailer.mp4]"*

Reads cold; references UMB v3 implicitly via "second proof"; sells
the engineering claim clearly while keeping water-beads tone.

**Step 4 — Documentation.**

`x-post.md`:

```md
# X Post Copy — Phase 7 Unit 7.3

## Post 1 (flagship launch)
[Variation A by default; Briggsy may override]

[draft per Step 1]

- Character count: ~210 (free-tier cap 280)
- Attached media: out/trailer.mp4
- Posting time: Tuesday or Wednesday 10am Eastern (see post-calendar)

## Post 2 (24h follow-up, quoted-tweet)
- Quotes: Post 1
- Attached: out/trailer-x-cutdown.mp4
- [draft per Step 2]

## Post 3 (pinned)
- Pinned to profile
- [draft per Step 3]
```

`pinned-tweet.md`:

```md
# Pinned Tweet — Phase 7 Unit 7.3 (optional)

## Candidate

[draft per Step 3]

## Pin protocol
1. Post the pinned candidate as a fresh tweet
2. From own profile → click ⋯ on the tweet → "Pin to your profile"
3. Confirm pin in profile view

## Replace condition
Replace when:
- Trailer becomes >6 months old
- New BURNED feature or update reverses the "static showcase" claim
- UMB v4 or next agentic-SDLC project ships
```

**Patterns to follow:**

- Engineering-Twitter post idioms (concise, brief, attached media,
  no overexplaining).
- Brainstorm Tone: deadpan + Archer-coded.
- `feedback-wow-over-simplicity.md` adapted: post copy should make
  reader want to click + watch, not over-explain.

**Test scenarios:**

- **Happy path:** Each post draft within X character cap.
- **Edge case:** Variation chosen doesn't read well to Briggsy →
  iterate; document chosen variant + why.
- **Tone check:** Brief, deadpan, in-character; no marketing-voice
  apology phrases.

**Verification:**

- `x-post.md` documents all 3 post drafts.
- `pinned-tweet.md` documents pinned candidate.
- Briggsy reviews + selects variations.

---

### Unit 7.4 — Distribution Plan + Post Calendar

- [ ] **Unit 7.4: Distribution Plan + Post Calendar**

**Goal:** Schedule the post sequence. Document the calendar +
fallback plan + Discord / portfolio update timing.

**Requirements:** Distribution coverage.

**Dependencies:** Units 7.1, 7.2, 7.3.

**Files:**

- Create: `videos/trailer/distribution/post-calendar.md`

**Approach:**

**Step 1 — Calendar schedule.**

Default sequence (subject to Briggsy override per current X state):

| Day | Time (ET) | Action |
|-----|-----------|--------|
| D+0 (Tue or Wed) | 10:00am | Post 1 — flagship launch (X) |
| D+0 | 10:30am | Update GitHub README with trailer link |
| D+0 | 11:00am | Share to Discord (Harry + relevant channels) |
| D+0 | 6:00pm | Initial impression check (informal) |
| D+1 | 10:00am | Post 2 — quoted-tweet with cutdown |
| D+1 | 4:00pm | Engagement check + reply to comments |
| D+7 | (anytime) | Pin Post 1 or pinned-tweet candidate |
| D+14 | (anytime) | Optional: rate / iterate based on data |

**Step 2 — Cross-surface promotion.**

| Surface | Action | Timing |
|---------|--------|--------|
| X (primary) | 2 posts + 1 pinned (per Step 1) | D+0 + D+1 + D+7 |
| GitHub README | Trailer link addition | D+0 |
| Discord (Briggsy + Harry channels) | Plain link share | D+0 morning |
| LinkedIn (optional) | Reposted with engineering context if Briggsy uses LinkedIn | D+2 if applicable |
| Personal portfolio site (if exists) | Trailer embed | D+0 or D+1 |
| YouTube unlisted | Optional secondary host | D+0 (parallel) |

**Step 3 — Fallback / contingency plan.**

| Contingency | Response |
|-------------|----------|
| Post 1 gets <10 impressions in first hour | Recheck thumbnail + caption; consider Variation B (engineering-SDLC explicit) repost via Post 2 |
| X re-encoding degrades visual quality noticeably | Re-upload at higher bitrate; consider X Premium for longer-attention-window posts |
| Significant engagement (>1k impressions, >50 replies) | Reply thread engagement; consider follow-up trailer or behind-the-scenes thread |
| Negative tone / criticism | Address with brief acknowledgment; don't engage trolls |
| UMB v3 audience doesn't recognize the second proof | Add cross-link to UMB v3 in reply thread |

**Step 4 — Metrics setup.**

Per `metrics-tracking.md` (next unit):

- X Analytics built-in: impressions, engagement rate, watch-through,
  link clicks
- GitHub README: clone count (not viewable for public; track
  qualitatively via Discord mentions / DMs)
- YouTube unlisted (if used): views, watch time, traffic source

**Step 5 — Documentation.**

```md
# Distribution Plan + Post Calendar — Phase 7 Unit 7.4

## Default calendar
[per Step 1 table]

## Cross-surface promotion
[per Step 2 table]

## Fallback contingencies
[per Step 3 table]

## Briggsy execution log
- D+0 actual posting time: <timestamp>
- D+0 initial impression count (1 hour): <N>
- D+1 cutdown post link: <URL>
- D+7 pin action taken: yes/no
- Total impressions at D+14: <N>
- Notable engagement: <list>
```

**Patterns to follow:**

- General industry post-timing patterns (verify with current X
  analytics at execution time).
- UMB v3 launch sequence (if documented; verify against project
  history).

**Test scenarios:**

- **Happy path:** Calendar followed; initial impression target met.
- **Edge case:** Critical engineering-Twitter event same day →
  reschedule by 1 day.
- **Edge case:** Briggsy unavailable during default windows →
  schedule posts via X Scheduling (built-in feature).

**Verification:**

- `post-calendar.md` documents the schedule.
- Briggsy reviews + approves before D+0.

---

### Unit 7.5 — Metrics Tracking Setup

- [ ] **Unit 7.5: Metrics Tracking Setup**

**Goal:** Define what to track + where to record. Retrospective data
informs UMB-v4 / future-trailer iteration.

**Requirements:** Distribution learnings.

**Dependencies:** Unit 7.4 (calendar set).

**Files:**

- Create: `videos/trailer/distribution/metrics-tracking.md`

**Approach:**

**Step 1 — What to track.**

| Metric | Source | Capture frequency | Why |
|--------|--------|-------------------|-----|
| X impressions per post | X Analytics | D+1 + D+7 + D+14 | Total reach indicator |
| X engagement rate | X Analytics | Same | Quality of reach |
| X watch-through (full trailer) | X Analytics | Same | Does the full 95s hold attention? |
| X watch-through (cutdown) | X Analytics | Same | Does cutdown convert? |
| GitHub README clicks (qualitative) | Discord mentions, DMs | Ad-hoc | UMB-comparable signal |
| Replies + DMs | X / Discord | Ad-hoc | Engineering-peer feedback quality |
| Comments mentioning "agentic-SDLC" or "AI / agent / autonomous" | X / Discord | Ad-hoc | Decode test in the wild — does the trailer's signaling work outside the controlled Unit 6.7 panel? |
| Negative signals | X / Discord | Ad-hoc | Identify gaps |

**Step 2 — Recording template.**

```md
# Trailer Distribution Metrics Log

## D+1 (24 hours after launch)
- X impressions: <N>
- X engagement rate: <N%>
- X full-trailer watch-through: <%>
- X cutdown watch-through: <%>
- Discord shares: <N>
- Notable replies/DMs: <list>

## D+7 (1 week)
- X impressions: <N>
- ...

## D+30 (1 month)
- X impressions: <N>
- Total signal: <qualitative>
```

**Step 3 — Retrospective questions for D+30.**

To inform future trailer work:

1. **Did the agentic-SDLC decode work in the wild?** Count
   X replies / DMs that explicitly mention AI / agent / autonomous
   without prompting. If yes — R14 + R15 work mechanism validated.
2. **Did the §2 Archer test resonate?** Count replies mentioning
   Archer specifically. If yes — visual vocabulary lock works.
3. **Did cutdown vs flagship perform differently?** Compare watch-
   through rates. Informs cutdown-vs-flagship balance for future
   trailers.
4. **Did UMB v3 viewers cross over?** Count replies referencing
   UMB. If yes — second-proof-point claim lands.

**Step 4 — Documentation.**

`metrics-tracking.md`:

```md
# Metrics Tracking — Phase 7 Unit 7.5

[per Step 1 table]

[per Step 2 template]

[per Step 3 retrospective questions]

## Update schedule
- D+1: log
- D+7: log
- D+30: full retrospective + entry to memory if signals are surprising
```

**Patterns to follow:**

- UMB v3 retrospective (if documented; verify against project
  history).
- `feedback-stats-single-source.md` — log actual numbers, not vibes.

**Test scenarios:**

- **Happy path:** Metrics logged at D+1 / D+7 / D+30.
- **Edge case:** Briggsy doesn't log → calendar reminder via TODO.md
  Phase 7 commit note.

**Verification:**

- `metrics-tracking.md` documents the tracking plan.
- Briggsy commits to the recording schedule.

---

## System-Wide Impact

- **Interaction graph:** Phase 7 ingests Phase 6 final deliverables;
  produces distribution assets + plan. Trailer enters the world via
  Phase 7.
- **Error propagation:** Engagement-disappointment routes to
  Unit 7.4 fallback contingencies; trailer artifact unchanged.
  Reception-mismatch routes to retrospective memory + future-trailer
  iteration.
- **State lifecycle risks:** Posts are public; once-shipped is
  permanent (X edits available but cap). Pinned tweet swaps periodic.
- **API surface parity:** None — Phase 7 is a content / distribution
  phase.
- **Integration coverage:** Phase 7 closes the brainstorm-to-ship
  loop. The trailer's purpose was always distribution.
- **Unchanged invariants:** BURNED game code untouched; trailer
  remains isolated.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cutdown loses the R3 moment in selected window | Low (window centered on it) | High (defeats cutdown purpose) | Unit 7.1 watch test verifies; iterate START_FRAME if drift. |
| Post caption fights the trailer (over-explains) | Medium | Medium | Variation A by default per water-beads; review + approve before posting. |
| Engineering-Twitter saturation on launch day | Medium | Medium | Calendar avoids known industry-event days; reschedule if conflict surfaces. |
| Trailer gets <100 total impressions | Low | Low | Pinned-tweet strategy ensures ongoing visibility; not all engineering content goes viral immediately. |
| Negative criticism (technical or aesthetic) | Low | Low | Brief acknowledgment + don't engage; trailer artifact stands. |
| X video upload fails (network / format / cap) | Low | Medium | Re-encode with bitrate cap; YouTube unlisted fallback. |
| GitHub Release MP4 upload >100 MB cap | Low | Low | Cloudflare Pages hosting fallback (Option II). |
| UMB v3 audience doesn't recognize cross-reference | Medium | Low | Reply thread includes UMB v3 link if signal surfaces. |
| Pinned tweet conflicts with prior pinned content | Low | Low | Briggsy unpins prior if needed; pin BURNED post. |

---

## Open Questions

### Resolved During Planning

- **Cutdown structure**: 12 seconds, cascade peak → gameplay (Candidate B).
- **Thumbnail**: frame 1950 (stacked-payoff stamp).
- **Post sequence**: 3 posts spaced 24h+ (flagship → cutdown quote
  → pinned).
- **Primary surfaces**: X + GitHub README + Discord.
- **Optional surface**: YouTube unlisted, personal portfolio site.
- **Caption philosophy**: water-beads rule — Variation A default.

### Deferred to Implementation

- **Exact post date**: depends on Briggsy availability + X analytics
  calendar at execution time.
- **Specific Discord channels** to share in: depends on Briggsy's
  active server set.
- **Whether to use X Premium for extended-character posts**: depends
  on Briggsy account.
- **Whether to upload YouTube unlisted**: depends on Briggsy
  preference for browseable URL.
- **Pinned tweet lifespan**: revisit when trailer ages or next
  agentic-SDLC project ships.
- **Whether to publish a Twitter thread on the BUILD** (engineering
  details, tools used, time spent): possible follow-up, deferred to
  retrospective discussion.

---

## Documentation / Operational Notes

- All Phase 7 artifacts land in `videos/trailer/out/` (X cutdown) +
  `videos/trailer/distribution/` (copy + plans).
- Distribution actions are physical events (Briggsy posts at
  scheduled times); Phase 7 prepares the materials, not the postings.
- X-native cutdown render uses `execFileSync` argv pattern
  (project convention).
- Once posted, trailer artifact is permanent + public. Briggsy
  approves all copy + media before Phase 7 final posting.
- `feedback-stats-single-source.md` — metrics logged with real
  numbers from X Analytics, not estimates.

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 6 plan: [`docs/plans/origin-trailer/phase-6-final-render-qa.md`](./phase-6-final-render-qa.md)

**X / Twitter distribution:**
- X video specs: roadmap §5.4
- X Premium: https://help.twitter.com/en/using-twitter/x-premium
- X Analytics: https://analytics.twitter.com/

**GitHub README video embed:**
- Issue / Release attachment hosting (GitHub auto-CDN)
- Markdown image-link convention for video thumbnail

**Engineering-Twitter reference posts:**
- Replit Agent 3 + 4 launch reels (Sept 2025, Mar 2026)
- Cursor 0.50 + 3 launches
- Per roadmap §5.4 alive pattern

**FFmpeg:**
- Trim + re-encode: https://trac.ffmpeg.org/wiki/Seeking
- Fade filters: https://ffmpeg.org/ffmpeg-filters.html#fade-1
- `afade` audio fade: https://ffmpeg.org/ffmpeg-filters.html#afade

**Institutional learnings (memory):**
- `feedback-wow-over-simplicity.md` — visual richness over cut-layers
- `feedback-stats-single-source.md` — log real numbers
- `feedback-elite-team-standard.md` — verify before claim ship
- `user_communication_style.md` — caption voice matches Briggsy
- `feedback-phase-plan-drafting-workflow.md` — write all phase files
  in one workflow; deepen sequentially after
- `feedback-make-a-note.md` — capture surprising D+30 metrics to
  memory for compounding learnings
