# Briefing-room visual environment — Unit 1.10 (LOCKED)

> Status: storyboard composition LOCKED for S01 (cold open), S02
> (briefing setup), S03 (mission background), S06 (closing directive).
> Anti-AI-slop guard ("≤2 elements at full visual weight" rule from
> Unit 1.5 cascade rewrite) extended to S02/S03/S06. CASE BANNER
> per-scene content table locked. Citation verification grep passed
> against `src/client/board/GameTable.tsx:67-88` (caseBanner inline
> aside, NOT a separate component) + `src/client/board/DossierFeed.tsx:20-25`
> (IDLE_LINES). emil-design-eng polish lens applied to motion-shape
> micro-decisions.

## Anti-pattern: "AI-slop layered-simultaneous" guard (extends Unit 1.5)

The same composition discipline the cascade rewrite enforced — *"no
frame except the 1950 payoff has more than two elements at full
visual weight"* — extends to S01/S02/S03/S06. Previous draft S02
listed 8 elements competing for 12s (mahogany + venetian blinds +
depth-plane foreground + open dossier + Pendleton crest + comms-ticker
+ CASE BANNER + R15 stamp), which fails §2.2 the same way the
cascade's layered-simultaneous draft did.

**Sequencing rule (LOAD-BEARING for every briefing-room scene):** at
any given frame, ≤2 elements at full visual weight; others at 30–40%
chrome opacity or dim background. Phase 4 enforces during studio
walkthrough; Phase 6 QA re-checks.

## Step 1 — Visual environment per scene

### S01 — Cold Open (frames 0–210 / 7.0s)

Cold-open speaker VO (Janet) drops at frame 60 — the visual builds
through the first 2 seconds, the line lands, the visual settles into
S02 hand-off.

- **Background (full-bleed, frames 0–60):** **NOT a black slate.**
  Mahogany desk surface (`PALETTE.ochre7` / `--color-ochre-7` =
  `#805032`) but dim — the briefing room is pre-establishing in
  shadow, as if the lights haven't come up yet. **Venetian-blind
  shadow bands at 1.5–2 px/frame motion** establish across the desk
  (same shadow grammar as S02/S03 — visual continuity primer).
  Pendleton crest watermark at **15% opacity** (much dimmer than
  S02's 25%) top-left.
- **Foreground card flash (frames 0–60):** Six BURNED card backs
  flash in rapid succession over the dimmed-desk background.
  **Per-card cadence: 6 frames each (200 ms), no easing — hard cuts.**
  Cards: `burned.webp` LAST (frame 50, 10-frame hold), preceded in
  randomized but locked sequence by `intercepted`, `burn-the-files`,
  `extraction`, `back-channel`, `falsify-intel`. Each card occupies
  60% of safe-square center, hard-edged drop shadow at
  `--color-ochre-7` 40% opacity. **NOT a slow reveal — a rapid-fire
  deck-shuffle establishing the trailer's primary asset (operations)
  in cinematic compressed time.**

  Locked card-flash sequence (frames 0–60):
  | Frame | Card |
  |-------|------|
  | 0–6 | `intercepted.webp` |
  | 6–12 | `burn-the-files.webp` |
  | 12–18 | `extraction.webp` |
  | 18–24 | `back-channel.webp` |
  | 24–30 | `falsify-intel.webp` |
  | 30–36 | `intercepted.webp` (re-flash for cadence) |
  | 36–42 | `burn-the-files.webp` (re-flash) |
  | 42–50 | (held card transition gap; 8-frame ease to BURNED card) |
  | 50–60 | **`burned.webp`** (lands and holds; 10-frame hold) |

- **Cold-open VO drops (frame 60):** dimmed-desk + held `burned.webp`
  card frame under the line. Janet's 13-word line completes within
  the 5.0s expectedFrames window; her budget ends at ~frame 210 +
  modest overrun (the 0.5s of overrun into S02 head is intentional —
  the line bridges the cut).
- **R15 #1 stamp (frame 150):** classification stamp slap onto the
  held `burned.webp` card. Lower-left position, 8-frame standard
  slap. JetBrains Mono 700 28px (+80 tracking), `--color-ochre-9`
  ink on `--color-cream-12` stamp paper. The stamp peels into S02 as
  the venetian-blind lights "come up" — same shadow grammar continues,
  but mahogany desk goes from dim (S01) to fully lit (S02). This is
  the visual transition into the briefing.
- **BURNED logo treatment (frame 60–210):** *NOT* the full closing-card
  BURNED logo. S01 shows the BURNED CARD ART (the game asset) as the
  focal element during the cold-open VO, NOT the wordmark logo. The
  wordmark only appears in S06 closing card at frame 2780 (where it
  lands as the trailer's capstone). **Differential:** S01 establishes
  BURNED as a card inside the deck (in-world); S06 establishes BURNED
  as the game's title (out-of-world bookend). The two BURNED
  treatments do different jobs.
- **Brass hook (audio, frame 0):** the music bed's intro brass hook
  hits at frame 0 — full-volume open. The hook completes at frame 60
  ramping down to 40% as the cold-open VO drops (matches Music bed
  cue-map ramp(30) starting frame 30).

**Anti-pattern guard:** S01 does **NOT** default to generic action-
trailer aesthetics (cards slamming in with motion blur / glow,
dramatic single-color background, title appears). The Archer-coded
opener is *compressed restraint* — six hard-cut flashes against a dim
establishing shot, then a single line over the held last frame.

**ASCII sketch (frame ~50 — locked `burned.webp` hold under Janet VO):**

```
┌─────────────────────────────────────────────────────────────┐
│ [crest 15%]                                                  │
│                                                              │
│      venetian-blind shadow bands ─────── 1.5-2 px/frame      │
│  ═════════════════════════════════════════════════════════   │
│        │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│        │
│        │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│        │
│        │░░░░░░░░░ burned.webp card art ░░░░░░░░░░░░│        │
│        │░░░░░░░░░ (60% of safe-square) ░░░░░░░░░░░░│        │
│        │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│         │
│        │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│         │
│        └ shadow ──────────────────────────────────┘          │
│                                                              │
│                                                              │
│ ═══════════════════════════════════════════════════════════  │
│ mahogany desk surface — DIM (ochre-7)                        │
└─────────────────────────────────────────────────────────────┘
            ↑ Janet VO drops at frame 60: "He's a machine,
              this kid. Honestly at this point I'm just impressed."
            ↑ R15 #1 stamp slaps at frame 150 (lower-left of card)
```

### S02 — Briefing Setup (frames 210–570 / 12.0s)

Sequencing per anti-pattern guard:
- Frames 210–240: venetian-blind shadow establishes (single focal),
  dossier closed in midground (dim).
- Frames 240–300: dossier opens (60-frame ease, single focal action;
  shadow continues at chrome level).
- Frames 300–500: Dash VO carries the scene; dossier interior text +
  CASE BANNER are the two simultaneous focal elements; comms-ticker
  stays at chrome level (rotates idle text quietly).
- Frames 500–570: case-sheet header settles; depth-plane foreground
  element + Pendleton crest never reach full weight (they're texture).

**Background (full-bleed):** mahogany desk surface
(`PALETTE.ochre7`/`PALETTE.ochre9` blend; primitives.css source).
**Venetian-blind shadow bands animating across the desk at 1.5–2 px
per frame motion** — survives H.264 compression; reads as "living
shadow" rather than ambient noise. The first-draft 0.5 px/frame motion
got eaten by compression; design-lens flagged this and bumped it.

**Foreground depth-plane element (Phase 4 picks one):** the desk
composition is **not** flat in the z-axis.

| Option | Description | Best for |
|--------|-------------|----------|
| **A (default)** | Brass nameplate on near foreground desk edge (out-of-focus, ~5% of frame width, lower-left), reading **"M. PENDLETON, BUREAU CHIEF"** | "We're seated at the briefer's desk, looking up the room." Most Pendleton-canonical. |
| B | Stack of manila folders in near foreground (out-of-focus, lower-right) | "This is one case file among many" texture. |
| C | Doorframe vignette implying viewer is just inside the briefing-room doorway | Most Archer-coded but heavier composition lift. |

Phase 4 picks based on Imagen asset availability + composition test.
The depth-plane element is a Phase 3 visual-asset-prep item (add to
Phase 3 unit 3.3 briefing-room-assets shot list).

**Midground center — open dossier:** Pendleton crest on cover before
it opens. Folder opens via 60-frame ease over frames 240–300 with
`EASE_DRAWER` curve (iOS-drawer-like — fits the "object opens" motion
better than ease-out).

**Inside the dossier (DOC-REVIEW DESIGN-LENS CONTENT SPEC):**
- **Header** (Clash Display 700 36px, `PALETTE.cream2`/`--color-cream-1`):
  "OPERATION PENDLETON / CASE FILE 02"
- **Operative line** (General Sans 600 22px): "ASSIGNED ASSET: D.
  BARLOWE"
- **Clearance line** (JetBrains Mono 700 18px): "CLEARANCE: ALPHA-SEVEN"
- **Case-file date** (JetBrains Mono 500 16px): "FILED: [REDACTED] /
  CASE OPENED: [REDACTED]"
- **Classification chevron** (JetBrains Mono 700 14px, top-right of
  case-sheet): "EYES-ONLY · NOT FOR REDISTRIBUTION"
- **Redaction bars** (3 horizontal black bars, charcoal/dark-cream
  high-contrast, covering "sensitive" fields the viewer doesn't need
  to read)

Phase 3 owns rendering this as a layered SVG/PNG asset OR Phase 4 owns
it as JSX text overlay (Phase 4 decides based on chrome-motion needs —
if the case-sheet text needs to animate independently of the
dossier-open, JSX wins; if it's static-on-paper, asset wins).

**Background chrome corners:**
- **Top-left:** Pendleton crest watermark, ~120 px wide, ~25% opacity.
- **Top-right:** comms-ticker idle text (rotating through BURNED's
  4-item IDLE_LINES set: "CHANNEL OPEN", "STANDING BY", "AWAITING
  TRANSMISSION", "INTERCEPT CLEAR" — sourced from
  `src/client/board/DossierFeed.tsx:20-25` verified 2026-05-18).

**CASE BANNER chrome:** rendered as a top-center strap with the case
label, structurally the same shape as BURNED's in-game
`GameTable.tsx:67-88` `.caseBanner` aside (verified 2026-05-18 —
there is NO standalone `CaseBanner.tsx` component; the trailer's
Phase 4 scene file ports the JSX + classNames directly from
`GameTable.tsx` lines 67-88 + matching `GameTable.module.css`
styles). Verify the CASE BANNER reads clearly at 64 px Clash Display
700 against the mahogany background; Phase 4 may need a parchment-tone
backplate if compression eats the contrast.

**Dash character art:** NOT visible in S02. Dash is the briefer
*delivering* the briefing — his presence is the VO, not a portrait.
The briefing-room frame IS the proof of R1, not a Dash silhouette.

### S03 — Mission Background (frames 570–1050 / 16.0s)

Briefing-room frame STAYS; deck mosaic appears INSIDE the dossier.

- **Background (full-bleed):** mahogany desk continues (visual
  continuity with S02; the dossier IS the desk's content). Venetian-
  blind shadow motion + depth-plane foreground element from S02
  persist.
- **Midground center:** open dossier deepens. Around frame 700, the
  **dossier-page wipe** (16 frames per Unit 1.4 lock; `clip-path:
  inset(0 0 0 0)` → `inset(0 0 0 100%)` left-to-right) reveals **a
  readable 4×6 grid of the top 24 card backs** inside the dossier
  viewport (NOT the full 12×10 grid). A small "120 OPERATIONS"
  chrome counter sits in the upper-right of the dossier viewport to
  communicate the full deck size. **The briefing-room frame stays —
  the dossier-page wipe reveals content INSIDE the existing dossier
  viewport, NOT a frame change to a full-bleed mosaic. R1 in-world
  briefing spine is preserved visually for the full 16s of S03.**
- **Operative roster overlay:** at frame 750, **6 operative portrait
  cards** slide in along the right edge. The 6 portraits are the 6
  deck operatives — `dash-barlowe`, `vera-khan`, `sable-ashworth`,
  `janet-broadside`, `neal-proctor`, `agent-x` (Agent X with
  REDACTED-bar over face). Otto is NOT in the portrait cluster (he's
  not in the deck — matches the Stat 4 line "Six in the deck. One on
  the research budget."). The deck-of-6 visual primes Stat 4's
  verbal "Six in the deck" payoff.
- **S03→S04 transition resolution:** the 6 operative portraits EXIT
  at the S03→S04 dossier-page wipe (frame 1034–1050, 16-frame wipe —
  per Unit 1.4). They do NOT persist into S04's halo. **S04's
  right-edge halo is 6 ACTION cards from the 11-card action set**,
  locked to:
  - `burned.webp` (the game's namesake — must appear in cascade)
  - `intercepted.webp` (R5 scream cue context — Dash interrupts when
    an intercept card draws)
  - `burn-the-files.webp` (literal R6 "burn" verbal callback)
  - `extraction.webp` (Pendleton mission-vocabulary primer)
  - `intel-briefing.webp` (matches S02 dossier-open setup)
  - `direct-order.webp` (high-stakes operation primer for S05
    gameplay)

  The remaining 5 action cards (`back-channel`, `call-in-a-favor`,
  `falsify-intel`, `go-dark`, `reassign`) DO NOT enter the trailer
  cascade — they remain in the S03 dossier mosaic context only (the
  4×6 grid revealed inside the dossier viewport).
- **Comms-ticker continues** (idle text at frame head, switches to
  "ACTIVE BRIEFING" or similar at frame ~870 to match the second VO
  line).

### S06 — Closing Directive (frames 2580–2850 / 9.0s)

Logo + R15 cadence retimed for breathing room.

- **Background:** briefing-room reestablishes via iris-wipe from S05.
  Venetian-blind shadow returns. Mahogany desk surface. Depth-plane
  foreground element from S02 returns (visual bookend).
- **Midground:** dossier closes (reverse of S02 opening — 30-frame
  `EASE_DRAWER`). Dossier cover shows full Pendleton crest +
  classification stamp.
- **Frame 2780:** BURNED logo lands center, sized ~720 px wide,
  Clash Display 700 with chrome treatment. 8-frame stamp-slap entry
  per `STAMP_SLAP_FRAMES`.
- **Frame 2780–2820:** Logo holds static. **40-frame breathing room
  (1.3 s)** — gives the logo time to settle before being stamped, per
  emil "match motion to mood — closing should breathe." First-draft
  10-frame gap (333 ms) was rapid-fire and stepped on the logo's
  presence.
- **Frame 2820:** R15 #4 stamp ("OPERATION STATUS: FIELD-READY") slaps
  onto the closing card (16-frame heavy slap — same envelope as the
  payoff stamp, treating the closing as the trailer's second "weight"
  moment).
- **Frame 2835:** R15 #5 stamp slaps below R15 #4 (main line
  "DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS." + 30%-opacity
  subhead "Honestly at this point we're just impressed." — LOCKED at
  Unit 1.9). 8-frame standard slap (lighter envelope than R15 #4 to
  maintain hierarchy). The subhead echoes Janet's S01 kicker via
  `"I'm"` → `"we're"` plural fold.
- **Frame 2843:** Final brass sting on the music bed (volume 60→100%
  ramp lands here); logo + R15 #4 + R15 #5 all hold static.
- **Frame 2850:** Hard cut to black. End.

## Step 2 — Briefing-room grammar inventory

BURNED's existing briefing-room vocabulary (per CLAUDE.md +
`project-burned-arena-direction` memory):
- Mahogany frame
- Venetian blinds (shadow bands)
- Cream blotter / parchment surfaces
- Operative dossiers (case sheets, stamped folders)
- CASE BANNER (top-center chrome strap)
- COMMS ticker (bottom-edge running text)
- Pendleton crest watermark

Trailer scenes apply this vocabulary literally. Phase 4 builds the
scene compositions from these elements. **No new visual element
invented in the trailer that isn't already in the BURNED arena
vocabulary** (anti-pattern guard — drift here = the trailer reads as
"different world from the game").

## Step 3 — CASE BANNER per-scene content (LOCKED — citation: GameTable.tsx:67-88 5-field shape)

The `.caseBanner` aside renders 5 text fields: **label / operation /
sub / divider / footer**. Locked content per scene:

| Scene | label | operation | sub | divider | footer |
|-------|-------|-----------|-----|---------|--------|
| S02 | "CASE FILE" | "OPERATION PENDLETON" | "BRIEFING ROOM · BUREAU CHIEF M. PENDLETON" | "—" | "02 / EYES-ONLY" |
| S03 | "CASE FILE" | "OPERATION PENDLETON" | "MISSION DOSSIER · ASSET ROSTER" | "—" | "02 / EYES-ONLY" |
| S06 | "CASE FILE" | "OPERATION PENDLETON" | "DEBRIEF · STATUS UPDATE" | "—" | "02 / FIELD-READY" |

The label / operation / divider / footer hold steady across all three
briefing-room scenes (S02 establishes them, S03 carries them as
continuity, S06 footer mutates "EYES-ONLY" → "FIELD-READY" mirroring
the R15 #4 status arc). The `sub` field refreshes per scene to
indicate the current briefing phase.

## Step 4 — Ticker animation policy

The comms-ticker animates continuously through S02 + S03 + S06 (idle
text rotating through `IDLE_LINES` 4-item set per
`DossierFeed.tsx:20-25`), brightens + intensifies through S04 (R15 #2
surfaces at frame 1680), fades during S05 (gameplay-frame replacement),
returns at S06 iris wipe. Per-frame ticker text rotation matches
existing BURNED idle text patterns — Phase 4 ports the
`ChannelTicker` rotation cadence (2500 ms per item per
`DossierFeed.tsx:30`) directly.

## Step 5 — Mobile safe-square placement audit

The 1080×1080 central square within 1920×1080 must contain:

- **S01:** held `burned.webp` card art (60% of safe-square center) +
  R15 #1 stamp (lower-left of card, inside safe-square). ✓
- **S02:** open dossier + R15 #1 stamp (settles from S01) + case-sheet
  text. ✓ Pendleton-crest watermark + comms-ticker live in side bands
  (acceptable — they're chrome, not focal content).
- **S03:** dossier deck reveal + operative portraits (some in side
  bands, but at least 4 portraits land inside the safe-square edges).
  Acceptable.
- **S06:** BURNED logo + R15 #4 stamp + R15 #5 closing card. ✓ All
  centered.

## Emil-design-eng polish lens (motion-shape micro-decisions)

- **Stamp slap envelope (per `transitions.ts`):** scale(0.95) →
  scale(1.04) overshoot → scale(1.0) settle. **NEVER scale(0) → 1.0**
  (rubber-stamp pop-in reads as cheap motion-graphics; the 0.95 start
  preserves the heft of "the stamp was always there, the photo just
  caught it landing").
- **Card-art halo stagger (S04 frames 1560–1860):** 2 frames between
  cards entering (emil's 30–80 ms range). 6-card halo completes over
  12 frames = 400 ms, slow enough to read as a *building texture*,
  fast enough not to drag.
- **Venetian-blind shadow motion:** 1.5–2 px/frame — empirically
  survives H.264 compression. Below 1 px/frame, compression eats the
  motion as noise; above 3 px/frame reads as twitchy.
- **Dossier-open ease (`EASE_DRAWER`):** iOS-drawer curve. Slower
  start, faster middle, slow settle — matches the physical "object
  opens" mental model better than `EASE_OUT_EMIL` (which is the snap
  curve for stamp slaps).
- **S06 logo breathing room (40-frame hold):** the closing card needs
  *air* before the stamp lands. emil "match motion to mood — closing
  should breathe." First-draft 10-frame gap was rapid-fire and stepped
  on the logo's presence. 40 frames (1.3 s) is the floor; Phase 4 may
  surface that 45-50 frames lands cleaner.
- **R15 #5 stamp envelope is LIGHTER than R15 #4:** 8-frame standard
  slap vs 16-frame heavy. Maintains hierarchy: R15 #4 is the in-world
  closing diegetic; R15 #5 is the out-of-world author-stamp. Lighter
  envelope reads as "this is the credit, not the climax."

## Citation verification (DOC-REVIEW addition)

| Reference in plan | Source | Verified 2026-05-18 |
|--------------------|--------|---------------------|
| `GameTable.tsx:67-88` caseBanner aside (5 text fields) | `src/client/board/GameTable.tsx` lines 67-88 — `<aside className={styles.caseBanner}>` with label / operation / sub / divider / footer spans | ✓ |
| `DossierFeed.tsx:20-25` IDLE_LINES | `src/client/board/DossierFeed.tsx` lines 20-25 — `IDLE_LINES = ['CHANNEL OPEN', 'STANDING BY', 'AWAITING TRANSMISSION', 'INTERCEPT CLEAR']` | ✓ |
| `ActRoster.tsx:18-75` OPERATIVES array (6 deck entries) | `src/client/howtoplay/acts/ActRoster.tsx` — 6 operatives in the OPERATIVES const | ✓ |
| `ActRoster.tsx:153-158` Otto research-budget aside | Same file, the "footnote" aside in the `<aside className={styles.aside}>` block | ✓ |
| `CaseBanner.tsx` (PHANTOM) | Glob for `src/client/**/CaseBanner.tsx` returns NO MATCHES | ✓ confirmed phantom; plan re-anchored to `GameTable.tsx:67-88` |
| `transitions.ts` `STAMP_SLAP_FRAMES` + `STAMP_SLAP_HEAVY_FRAMES` + `EASE_DRAWER` + `DOSSIER_WIPE_FRAMES` + `IRIS_WIPE_FRAMES` | `videos/trailer/src/lib/transitions.ts` (Unit 1.4 shipped at `a18da1f1`) | ✓ |
| `colors.ts` PALETTE snapshot | `videos/trailer/src/lib/colors.ts` (Phase 0 Unit 0.5 shipped) | ✓ |

All citations verified against current source state. No phantom
references.

## Patterns to follow

- BURNED arena direction: `project-burned-arena-direction` memory +
  CLAUDE.md.
- Existing CASE BANNER chrome: `src/client/board/GameTable.tsx:67-88`
  (inline `.caseBanner` aside; NOT `CaseBanner.tsx` — phantom).
- Existing comms-ticker: `src/client/board/DossierFeed.tsx:20-25`
  (IDLE_LINES const + ChannelTicker rotation cadence at line 30).
- Phase 0 Unit 0.5 spike validated venetian-blind shadow motion + stamp
  slap envelope + iris-wipe + composite mechanics.

## Test scenarios

- **Happy path:** S01/S02/S03/S06 visual blocks filled in BEAT-SHEET.md
  with element layout + frame-accurate animation cues. ✓ (this commit)
- **Happy path:** Briefing-room grammar inventory documented; every
  element trace-able to an existing BURNED component (Step 2). ✓
- **Happy path:** CASE BANNER per-scene content table locked (Step 3). ✓
- **Anti-pattern guard:** No element invented for the trailer that
  isn't in the existing BURNED arena vocabulary. Phase 4 enforces.
- **Anti-pattern guard:** "≤2 elements at full visual weight per
  frame" rule applies across S01/S02/S03/S06 (extends Unit 1.5 cascade
  guard). Phase 4 in-studio walkthrough flags violations before MP4
  export; Phase 6 final QA re-checks.
- **Edge case:** Mobile safe-square audit passes for all 4 briefing-
  room scenes (Step 5). ✓

## Verification

- [x] BEAT-SHEET.md visual blocks complete for S01, S02, S03, S06.
- [x] `briefing-room-comp.md` exists with storyboard composition +
      anti-pattern guard + emil polish lens.
- [x] Citation verification grep passed — all `src/client/...` refs
      resolve to real lines; phantom `CaseBanner.tsx` confirmed
      non-existent; plan re-anchored to inline aside in
      `GameTable.tsx:67-88`.
- [x] CASE BANNER per-scene content locked (S02/S03/S06).
- [x] S01 card-flash sequence locked (6 cards, 6-frame cadence,
      `burned.webp` landing at frame 50).
- [ ] **Phase 3 owns:** depth-plane foreground asset (A/B/C decision +
      Imagen generation) for S02 desk composition.
- [ ] **Phase 4 owns:** in-studio walkthrough enforcing "≤2 elements
      at full weight" rule across all briefing-room frames; closing-card
      breathing-room micro-tune (Phase 4 may surface 45-50 frame gap
      reads cleaner than the floor 40).
