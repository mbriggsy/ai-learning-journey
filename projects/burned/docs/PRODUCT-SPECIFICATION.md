# BURNED — Product Specification

*Version 1.0 — April 10, 2026*
*Status: **LOCKED** — authoring complete. Implementation against §8 Acceptance Criteria in progress. Spec itself is frozen; only §8 checkboxes get updated as work lands.*

---

> **This document is the contract.** Scattered vibes in memory files are suggestions. Lines in this document are requirements. When something in a memory file, brainstorm doc, or ideation archive contradicts this file, **this file wins.**
>
> **Primary audience: Claude.** Humans read the README. Every future Claude session loads this file into context as the contract. That changes how it's written — no fluff, acceptance tests instead of aspirations, direct imperatives instead of suggestions. Humans can still read it; good technical writing is good regardless of audience, but we optimize for the primary reader.
>
> **Authoring history:** written in the session `burned-product-specification-convo` on 2026-04-10, one section at a time, after a visual-layer autopsy revealed BURNED never had a product specification and three visual failures in a row traced back to that missing artifact. See `docs/ideation/2026-04-11-visual-layer-autopsy.md` for the post-mortem.

---

## §1 — Executive Summary

**BURNED is a digital party card game for 2–10 players, designed for same-room play.** Nothing in the system prevents remote play — and the rules doc will explain how — but every design decision is optimized for the faces, groans, and table talk of people sitting together. One shared screen (TV, laptop, iPad in a stand) displays the game table — draw pile, discard, player ring, all the drama. Each player's phone is their private controller — showing their hand, letting them play cards, and keeping their moves secret from everyone else. Players join by scanning a QR code or entering a short room code. No accounts, no installs, no logins — open a browser and you're in.

The mechanics are a faithful, unchanged port of **Exploding Kittens: Party Pack** — same 120-card deck, same card types, same rules. The **world** is completely original: **The Pendleton Agency**, a mid-century spy outfit staffed by brilliant disasters. Five original operative characters (Dash, Vera, Sable, Janet, Neal) replace the cat cards, plus Agent X as the rival wild card; Otto (Krieger archetype) appears in the roster but not the deck. The Exploding Kitten becomes **BURNED** — spy jargon for a blown cover, which is the lose condition. Every card type is rethemed — for example, Defuse → Extraction, Nope → Intercepted, See the Future → Intel Briefing. Full mapping in `docs/RULES-REFERENCE.md` (source of truth: `src/shared/card-defs.ts`).

**Roster (1:1 Archer archetype mapping):**

| BURNED name | Archer counterpart | Category |
|---|---|---|
| Dash Barlowe | Sterling Archer | Operative |
| Vera Khan | Lana Kane | Operative |
| Sable Ashworth | Cheryl Tunt | Operative |
| Janet Broadside | Malory Archer | Operative |
| Neal Proctor | Cyril Figgis | Operative |
| Otto | Krieger | Roster only (not in card deck) |
| Agent X | — | Wild |

**Visual-DNA rule:** when a character appears in a new card or arena surface, preserve their established design. The Archer "visually archetype / named differently" contract is load-bearing for tone — breaking it changes what BURNED feels like.

The tone is **Archer**. Dry spy comedy, brilliant disasters, production polish that shouldn't exist on basic cable. The visual language is **literally Archer** — bold line illustration, flat color fills, warm teal/orange/cream palette, mid-century glamour. See §2 (Quality Bar) and §3 (Visual Reference) for the contract.

**BURNED is not a commercial product and has no revenue target. It is an engineering proving ground.** The deliverable is the quality itself. Every decision is judged against §2 (Quality Bar), not against a release date, a scope count, or a shipping deadline. **Quality is the job. Completion without quality is failure.**

---

## §2 — Quality Bar

### §2.1 Mission line

> **BURNED is indistinguishable from a commercial party game released by a real studio — Jackbox-easy to pick up, Archer in tone and look, stunning on every screen.**

This line is load-bearing. Every decision — a card corner radius, a button's shadow, an animation's timing, a color token's value, a font's weight — traces back to this sentence. If a decision can't justify itself against this sentence, it's the wrong decision.

### §2.2 Acceptance test (the yes/no that every screen must pass)

> **"Could this look like a frame from an Archer episode?"**

- Applied to every screen, every card, every button, every modal, every transition state.
- **Yes** = ship it.
- **No** = it's wrong. Fix it or cut it.
- This is not a judgment call. It's a binary test. The test's job is to remove wiggle room from Claude's decision-making when context resets and the vibes fade.

### §2.3 What a first-time player should say

A friend who's never seen BURNED before, playing it on their phone for the first time, should say some version of:

> *"Wait — did Archer and company release this? This feels like a commercial app, not a side project."*

If the first-time player reaction is *"cool, you built this?"* instead of *"wait, is this official?"* — we missed. The reaction we're after is **mistaken-for-commercial**, not *"nice job for a hobbyist."*

---

## §3 — Visual Reference (the touchstone)

### §3.1 The reference is Archer. Literally.

The visual language of BURNED is the visual language of **Archer the TV show** (FX/FXX, 2009–present, produced by Floyd County Productions). Not "mid-century modern in general." Not "Saul Bass." Not "spy title sequences." **Archer, specifically.**

This is a **LOOK** reference, not a vibe reference:

- ✅ Every screen should *actually look like* it could be a frame from the show.
- ❌ Not "inspired by" Archer. Not "in the spirit of" Archer. **Literally Archer.**

### §3.2 What this means concretely

Lifted from Archer's actual visual vocabulary:

- **Illustration style:** bold outlines, flat color fills, minimal shading, angular geometry. Vector-illustrated characters with strong silhouettes. Pendleton-era spy-agency portraiture. The show's signature character-rendering technique is **ink on flat color** — flat-color vector figures with deliberately thick black outlines (Kirby + Ditko reference, verified — see §3.6).
- **Palette:** warm teals, burnt oranges, rich creams, saturated amber accents. Cocktail-lounge temperature. Deep charcoals for UI chrome. NOT noir black. Reference season is **Season 8 Dreamland** (see §3.7 for derivation and palette-scoping rules).
- **Typography:** bold sans serif for display (title cards, card names, headings). Clean geometric sans for body. ISIS-logo-energy for the heaviest hits.
- **Composition:** confident negative space, dramatic centered compositions, strong horizontals, mid-century geometric framing.
- **Mood:** dry comedy meets spy glamour. **Comedy wins when the two conflict** (ratified 2026-04-10).
- **Deliberate anachronism.** Per creator Adam Reed (A.V. Club, 2011), Archer "cherry-picks from several decades" — the show is not a period piece, it's a collage. BURNED inherits this license: '60s Bond + '60s Bass + '50s mid-century + '70s muscle can co-exist as long as the collage reads coherent.

### §3.3 What Briggsy confirmed (2026-04-10)

- **Literal LOOK**, not vibe. When they conflict, LOOK wins.
- **Comedy wins** over glamour when the two conflict.
- **Card art is good and on-brand.** May tweak/replace 1–2 cards. The rest stay.
- **Proof is ambient polish, not a hero moment.** "Stunning to look at, crisp around the edges but not in your way, very playable — quickly." Every surface polished, no single set-piece required to carry the quality bar.

### §3.4 Form factors and constraining axes

BURNED has two distinct form factors. Each has its own scaling constraints. These are the structural inputs to the forthcoming **CSS Foundation Rebuild Plan** (a separate phase plan generated from this spec; see §Pending).

#### Phone controller (player view) — `src/client/player/`

- **Orientation:** portrait only. Landscape is explicitly unsupported.
- **Target device range:** 5.5" phone → 13" iPad Pro in portrait (per §4 Goal #4).
- **Constraining axis: HEIGHT.** Vertical space is the scarce resource — staging, hand, title bar, status bar, and intercept button all compete for vertical space and must fit without scroll.
- **Primary scaling unit:** **`svh`** (small viewport height — accounts for mobile browser chrome dynamically). **NOT `vh`** (breaks on iOS Safari during URL bar auto-hide) and **NOT `vw`** (tracks the wrong axis for portrait).
- **Width behavior:** content is centered with reasonable max-width; excess horizontal space becomes margin, not content growth.

#### Shared screen (board view) — `src/client/board/`

- **Orientation:** landscape only. Portrait is explicitly unsupported.
- **Target device range:** 13" laptop → 65" television. Also iPad in a landscape stand.
- **Constraining axis: WIDTH.** Horizontal space is the scarce resource for the player ring, draw pile, discard pile, and announcement feed arranged around the central arena.
- **Primary scaling unit:** `vw` or container-query width (`cqw`).
- **Height behavior:** uses full available height with rings and piles placed against the horizontal axis.

#### Why this matters for the CSS Foundation Rebuild Plan

Every `clamp()` formula, token scale, spacing step, and typography size derives from the constraining axis. UMB's Phase 4 (host/table view) plan used formulas like `clamp(0.5rem, 0.3rem + 0.5vw, 1rem)` because the host is landscape and scales with width. **BURNED's player view must use `svh` instead**: `clamp(0.5rem, 0.3rem + 0.5svh, 1rem)` — same structure, correct axis.

This is the #1 lesson from `docs/ideation/2026-04-11-visual-layer-autopsy.md`: the current player view uses `42vw` for card sizing, which tracks the wrong axis and is the root cause of the visual fragility. The CSS Foundation Rebuild Plan fixes this by deriving everything from `svh`.

**Do not mix axes.** Player view tokens scale against height. Board view tokens scale against width. Any cross-view shared token (colors, card aspect ratio, font family) must be axis-independent.

### §3.5 Recurring tone motif: "Phrasing!"

*"Phrasing!"* is Archer's signature running joke — a character delivers an unintentional double entendre and someone (usually Archer himself) calls out *"Phrasing!"* to spotlight the innuendo. It's been in the show since Season 1; Malory tried to ban it in Season 3's *"El Contador"* and the joke got funnier for the attempted ban. It is the show's best-known catchphrase and is **core BURNED tone DNA**.

**Cadence: abundance, not restraint.** Phrasing! beats should be seeded generously across the game. Players should encounter Phrasing! often enough that it reads as Archer DNA — a recurring rhythm — not a one-time easter egg. The bar isn't "spread thin to keep the joke fresh"; it's "land it everywhere it lands naturally." Over-saturation is unlikely as long as the constraints below hold.

**Where Phrasing! lands** (✅ surfaces):

- **Random flavor pools** — variety naturally surprises; players see different beats over time. Examples: EliminatedView, GameOver, BURNED-draw flavor lines.
- **Announcement feed copy** (board view) — fast-scrolling text where a phrasing beat is there-and-gone. Card-played descriptions, transition narration, observer toasts.
- **Drama overlay moments** — high-drama interrupts where a phrasing beat cuts tension. Use sparingly per beat but recurring across the catalog.
- **Lobby copy / waiting text** — implicit phrasing (e.g. *"Waiting for players to come..."* with trailing ellipsis) does the work without an explicit *Phrasing!* callout.
- **Loading / connection messages** — anywhere the player is briefly idle.

**Where Phrasing! does NOT land** (❌ surfaces):

- **Error messages.** Errors are functional, not comedic. Phrasing in a server-rejection text is noise when a player is trying to fix something.
- **Repeat-view text.** Anything a player sees every turn (SmartActionBox prompts, status strip). Phrasing jokes stale fast on repetition.
- **Rule text / card descriptions.** Players consult these to learn the game, not to laugh.

**Shipped beats:**

- EliminatedView flavor pool — *"Penetrated by enemy assets. ...Phrasing."* (`src/client/player/EliminatedView.tsx:17`)
- DossierFeed `favor-given` board narration — *"X put out for Y. ...Phrasing."* (`src/client/board/events.ts`)
- DossierFeed `combo-steal` board narration — *"X drilled Y for it. ...Phrasing."* (`src/client/board/events.ts`)
- DossierFeed `future-peeked` board narration — *"X went deep on the deck. ...Phrasing."* (`src/client/board/events.ts`)
- PlayerAlert `favor-given` observer toast — *"X put out for Y. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- PlayerAlert `card-played` observer toast, Direct Order pool — *"X got Y to do it for them. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- PlayerAlert `card-played` observer toast, Reassign pool — *"X made someone else take it. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- PlayerAlert `card-played` observer toast, Call in a Favor pool — *"X needs someone to come through. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- PlayerAlert `card-played` observer toast, Back Channel pool — *"X slipped in through the back. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- PlayerAlert `card-played` observer toast, Intel Briefing pool — *"X is checking what's coming. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- PlayerAlert `card-played` observer toast, Go Dark pool — *"X turned off the lights. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- GameOver winner-subtitle pool (board view) — *"X came out on top. ...Phrasing."* (`src/client/shared/GameOver.tsx`)

**Planned beats** are tracked in `TODO.md`. As beats land, append them to the "Shipped beats" list above.

**Attribution.** *Phrasing!* as a running joke: Archer seasons 1-14, FX/FXX, Adam Reed and writers' room. The joke needs no footnote citation in-game — it's the show's best-known catchphrase.

### §3.6 Verified influences on Archer (primary-source sourced)

The touchstones below are not Claude's invention and not fan analysis. Each has a named production-team member citing it on the record at an authoritative venue.

| Influence | Who cited it | Where | Role |
|---|---|---|---|
| **Saul Bass** | Neal Holman (production designer) | Art of the Title, May 2016[^1] | "Almost every work by Saul Bass was a heavy influence on Archer." |
| **Catch Me If You Can / Kiss Kiss Bang Bang / The Incredibles end titles** | Neal Holman | Art of the Title, May 2016[^1] | Title-sequence influences, cited in the same interview |
| **Jack Kirby, Steve Ditko** | Neal Holman | Salon, 2016[^2] | Character rendering references — flat color, bold outlines |
| **Mad Men** | Neal Holman | Salon, 2016[^2] | Mid-century production design influence |
| **1960 James Bond** | Adam Reed (creator) | A.V. Club, 2011[^3] | Spy-genre visual vocabulary |
| **OSS 117** | Adam Reed | A.V. Club, 2011[^3] | Comedy spy aesthetic |
| **Pink Panther** | Adam Reed | A.V. Club, 2011[^3] | Mid-century comedy spy aesthetic |
| **Mid-century furniture, 1960s clothing, 1970s muscle cars** | Adam Reed | A.V. Club, 2011[^3] | Era markers |
| **Deliberate anachronism** | Adam Reed | A.V. Club, 2011[^3] | "Cherry-picking from several decades" — the show is not a period piece, it's a collage |

[^1]: Neal Holman, interview at Art of the Title, May 2016. https://www.artofthetitle.com/title/archer/
[^2]: Neal Holman, Salon, 2016 (accessed via Wayback Machine). Jack Kirby + Steve Ditko + Mad Men cited as influences on character rendering and production design.
[^3]: Adam Reed, A.V. Club, 2011 (accessed via Wayback Machine). Reed's own list of intentional influences: 1960 Bond, OSS 117, Pink Panther, mid-century furniture, '60s clothing, '70s muscle cars, "deliberate anachronism."

**Synthesis:**

- **Strong silhouettes + flat color fills + bold black outlines** (Kirby + Ditko reference, verified).
- **Mid-century geometric framing** (Bass + Mad Men + mid-century furniture references, all verified).
- **Title-sequence DNA** with Bass-style kinetic typography, bold color blocks, silhouette figures, strong horizontals (Bass, Catch Me If You Can, Kiss Kiss Bang Bang, The Incredibles — all verified).

These citations are load-bearing: any future visual-rebuild plan inheriting from this spec gets the Archer-fidelity contract grounded in production-team statements, not fan analysis.

### §3.7 Palette reference season

**Season 8 Dreamland is BURNED's palette reference.**

Reasoning:
- Archer's palette varies intentionally by season — there is no single "Archer palette." Mark Paterson (art director, later seasons) is on record about this. No public hex values exist for Archer's production palette in any source.
- Season 8 Dreamland (1947 noir-inflected setting) is the most mid-century-coherent palette across the show.
- Holman-endorsed as "the prettiest season."
- Maps cleanly to the cocktail-lounge temperature §3.2 already describes (warm teals, burnt oranges, rich creams, amber accents, charcoals).
- Avoids Season 5's pastel-Miami direction (wrong temperature) and Season 7's letterpress-LA direction (too muted for a party game).
- **Not** a period-piece lock — per §3.6's "deliberate anachronism" finding, color intensities and accents from other seasons' title cards are usable where they serve.

**Honest scoping rule.** Every hex value in BURNED is **"inspired by, not licensed from."** No frame-extracted palette becomes "Archer's official palette" in any BURNED doc. Implementation plans frame-extract from Season 8 stills, label them as `observed from S8E01 @ 12:34` or similar, and run them through CVD (color-vision-deficiency) verification.

**"Teal and orange" is fan vocabulary, not production-team vocabulary.** §3.2's direction ("warm teals, burnt oranges, rich creams, amber accents, deep charcoals") is fine as a *direction*, but it is NOT how Archer's production team describes the show. Implementation palettes must justify themselves against Dreamland stills, not against fan-observed labels.

---

## §4 — Goals

Goal #1 dominates all others. When any goal conflicts with another, the higher-numbered goal yields.

1. **Quality bar achievement (§2).** Every decision evaluates against *"could this look like a frame from an Archer episode?"* before being committed. This is goal #1, always. When it conflicts with any other goal, this one wins.

2. **Full Party Pack, no compromises.** All 120 cards. All 17 card types. 2–10 players. No "we'll add this later," no feature subsetting. The complete Exploding Kittens Party Pack mechanic set, rethemed to The Pendleton Agency.

3. **Sub-2-minute setup.** A group that's never played before should go from "let's try this" to "first card played" in under two minutes. QR scan → room code → name entry → start. No tutorials to read, no explanations to hear.

4. **Works on any modern mobile browser, phone *or tablet*.** iOS Safari 15+, Android Chrome last-2-versions, desktop Chrome/Firefox/Safari for the board view. **The controller UI scales gracefully from a 5.5" phone up to a 13" iPad Pro in portrait** — a tablet in portrait is a huge phone, and any design that breaks on a tablet has a hidden phone-dimension assumption. No app install required. PWA installable is a bonus, not a requirement.

5. **Zero infrastructure cost at launch.** **Cloudflare Pages** (static client) + **Cloudflare Workers with Durable Objects** (stateful per-room game server), deployed via `wrangler`. Ephemeral game state only, no database — each game room is a Durable Object that lives only while the game is in progress. Handles friends-and-family traffic without ever paying a cent.

   **Note on platform choice** (ratified 2026-04-10): This is the *same underlying infrastructure* UMB used. UMB's server ran on PartyKit, which is a developer-experience wrapper around Cloudflare Workers + Durable Objects. BURNED uses `partyserver` directly (the library PartyKit became after the post-acquisition rebrand), eliminating the PartyKit middleman. **Durable Objects are non-negotiable** for the server layer: they are the native primitive for stateful per-room WebSocket servers with sub-second failover, and no free-tier alternative exists. Vercel is great for static clients and serverless functions but has no equivalent stateful-WebSocket primitive. A full ADR with alternatives-considered will be written in §ADRs.

6. **CVD-safe palette.** Briggsy is color-blind. Every color choice must be legible and meaningful *without relying on hue alone.* Color is a **reinforcement layer** on top of shape, icon, position, and text — **never the sole carrier of meaning.** **Hard requirement.** No exceptions for "but it looks prettier that way."

7. **Archer-quality documentation.** The HOW-TO-PLAY doc and any user-facing writing matches the polish of UMB's how-to-play doc. Writing is part of the product. Briggsy on UMB's how-to-play: *"That doc alone could win an award."* That's the bar. Formal acceptance criteria in §Acceptance.

---

## §5 — Non-Goals / Out of Scope

Explicit exclusions. If a future Claude session (or Briggsy in a weak moment) proposes building any of these, point at this section and say no.

1. **User accounts, persistent history, stats, leaderboards, ELO, tournaments, achievements.** Zero auth. Rooms are ephemeral. Games end, state disappears.

2. **AI players / bot fill.** If you don't have enough humans, you don't play.

3. **Custom rules, house rules, rule toggles, difficulty settings.** Canonical Exploding Kittens Party Pack rules, audited against the official PDF. No variants.

4. **Native iOS / Android apps.** Browser only. PWA installable is fine but not required.

5. **In-app chat (text or voice).** Players are in the same room. They can use their mouths.

6. **Spectator mode for eliminated players.** When a player is BURNED (eliminated), their phone shows *"You got burned. Wait for next round."* and nothing more. **No read-only board view on the eliminated phone.** Eliminated players participate vocally by watching the shared screen with the group. This is intentional — it pushes social behavior (look up from your phone, talk to the table) and reduces UI surface area. Ratified 2026-04-10 (*"My gut is local vocal participation."*).

7. **Localization.** English only for v1. The Archer-tone comedy does not translate cleanly, and translating the UI chrome without translating the voice would be worse than not translating at all.

8. **Remote-play optimization.** Remote play *works* — nothing in the system prevents it and the rules doc explains how — but every design decision is optimized for same-room play. No lobbies, no matchmaking, no video chat, no remote-player conveniences, no "waiting for players" screens tuned for lag. Ratified 2026-04-10 (*"Nothing prevent players from NOT being in the same room, it's just better."*).

9. **Monetization in any form.** Zero revenue target. Ads, paywalls, premium features, microtransactions — explicitly forbidden. This is an engineering proving ground, not a business.

10. **Third-party telemetry, analytics, or tracking of any kind.** No Google Analytics, no PostHog, no Mixpanel, no Amplitude, no Sentry, no Datadog, no phone-home to any third-party service. The game server is Cloudflare Workers, the game client talks only to that server, full stop.

11. **Full accessibility compliance (WCAG 2.1 AA).** Aspirational but not a v1 blocker. CVD-safe palette (Goal #6) is a hard requirement because Briggsy is color-blind. Other accessibility (screen readers, ARIA landmarks, keyboard-only navigation) is "build toward it when it's cheap, don't block on it when it's expensive."

### §5.1 — Deferred decisions (revisit post-v1)

Things we explicitly decided *not* to decide now. Do not build these until revisited.

- **Self-hosted error reporting.** Shelved 2026-04-10 per Briggsy: *"I think we're over-complicating it a bit. Let's shelve it for now."* The problem this would solve is *visibility into crashes from friends-and-family play when Briggsy isn't in the room.* Options explored in session `burned-product-specification-convo`: (A) Sentry third-party SDK (blew the bundle budget), (B) split phone/board error tracking (asymmetric, confusing), (C) client errors → existing WebSocket → Cloudflare Workers logs + Workers Analytics Engine (zero third-party, zero new bundle cost — the leading candidate before shelving). **Revisit if friends-and-family play surfaces enough bugs to justify the complexity.** If revisited, default to Option C.

---

## §6 — Screens

*This section was audited from source code on 2026-04-10 — it reflects the current implementation, not an aspirational list. New screens added after this date should be appended with their ratification date. **When this section disagrees with the code, fix the code — this section is the contract.***

### §6.1 — Phone (player controller)

**Top-level routing** (`src/client/player/Player.tsx`):

| Route | Trigger | Shows |
|---|---|---|
| No Room Code | URL has no `?room=` param | *"No room code. Scan the QR code on the TV screen."* |
| Protocol Mismatch | Server protocol ≠ client protocol | Full-screen overlay: *"Game updated — please refresh"* |
| JoinScreen | `phase = lobby` or state not yet loaded | See JoinScreen sub-states below |
| PlayingView | `phase = playing` AND player is alive | Persistent chrome + workbench (staging + hand) |
| EliminatedView | `phase = playing` AND player is eliminated | Full-screen "you're out" state |
| GameOver | `phase = game_over` | Shared winner-reveal component |

**JoinScreen sub-states** (`JoinScreen.tsx`):

| State | Trigger | Shows |
|---|---|---|
| Connecting | WebSocket status ≠ `connected` | Spinner + *"Connecting..."* |
| Enter Name | Connected, not yet joined | BURNED title, room code badge, name input (12-char max), Join button |
| Joined / Waiting | Assigned a color | Player icon in assigned color, *"Waiting for host"*, live lobby player list |

**PlayingView persistent chrome** (`PlayingView` in `Player.tsx`, styled by `PlayingView.module.css`):

| Element | Owned by | Purpose |
|---|---|---|
| TitleBar (top) | `TitleBar.tsx` | Connection dot, player name, room code |
| StatusBar (below title) | `StatusBar.tsx` | Turn state message: *"YOUR TURN"* / *"Waiting for X — N in pile"* |
| Workbench (middle) | `PlayingView.module.css` | Two-zone composition area: staging section (top) + hand section (bottom) |
| Staging section | `StagingArea.tsx` + `SmartActionBox.tsx` | Compose your play; contains the selected cards + the contextual smart action button |
| Hand section | `Hand.tsx` | Scrollable hand of cards — double-tap to stage, long-press for detail |
| InterceptButton (floating) | `InterceptButton.tsx` | Persistent; activates during intercept window |
| DramaOverlay (lazy) | `@client/shared/DramaOverlay` | Full-screen drama moments (dynamically imported to protect phone bundle budget) |

**PlayingView workbench states** — the **SmartActionBox** is the single indicator of current state, and its text/interactivity changes based on what's staged and whose turn it is:

| State | Trigger | SmartActionBox text |
|---|---|---|
| Not my turn | `!isMyTurn` | *"Stand by, operative"* (non-interactive) |
| My turn, nothing staged | `isMyTurn`, no cards selected | *"End turn — draw (N)"* — button, with `drawIntense` styling when N ≤ 5 |
| My turn, cards staged, invalid | Validation fails (mismatched types, invalid count, contains Extraction, contains Burned, wild-with-non-operative, single-operative, single-intercepted) | Specific error text (e.g. *"Cards must match"*, *"Wild only pairs with operatives"*) — non-interactive |
| My turn, valid pair | 2 same-type operatives selected | *"Steal a random card →"* — opens Combo Steal flow |
| My turn, valid triple | 3 same-type operatives selected | *"Name & steal a specific card →"* — opens Name Card flow |
| My turn, valid single (no target) | Single playable card selected | Card-specific text (*"End turn — skip drawing"*, *"Peek at the top 3 cards"*, etc.) — confirm plays immediately |
| My turn, valid single (targeted) | Single playable card that needs a target (Direct Order, Call In A Favor) | Card-specific text with `→` suffix — confirm opens local TargetSelect sheet |

**Bottom sheets** (one at a time, derived by `useActiveBottomSheet.ts`). A bottom sheet is a mobile UI pattern where a panel slides up from the bottom of the screen to present a contextual action without navigating away from the current screen.

| Sheet | Trigger | Purpose |
|---|---|---|
| TargetSelect (local) | Pre-send for Direct Order / Call In A Favor | Pick target player before card goes to server |
| TargetSelect (prompted) | `pendingPrompt.type = 'steal-target'` | Pick target for 2-card Combo Steal |
| DefusePlacement | `pendingPrompt.type = 'defuse'` | Secretly pick insertion position for Extracted BURNED card |
| FavorResponse | `pendingPrompt.type = 'favor-response'` | Pick which card to give to the requester |
| FuturePeek (read-only) | Private data has `futureCards` (See the Future played) | View top 3 cards of the draw pile |
| FuturePeek (rearrange) | `pendingPrompt.type = 'future-rearrange'` (Alter the Future played) | View AND rearrange top 3 cards |
| NameCard | `pendingPrompt.type = 'name-card'` (3-card combo played) | Pick which card type to demand from the target |
| CardDetailSheet | Long-press on any hand card | Full card art + rules text |

**Phone overlays** (non-sheet, non-blocking):

| Overlay | Trigger | Purpose |
|---|---|---|
| ConnectionOverlay | Status = disconnected / reconnecting | Full-screen connection state with spinner |
| ErrorToast | Action rejected by server | Brief error message with auto-dismiss |

**EliminatedView** (`EliminatedView.tsx`) — full-screen, replaces PlayingView when the player is no longer alive:

- Animated skull icon (spring entry, scale 0 → 1, rotate -15° → 0°)
- Title line (*"You're Burned."*)
- Random flavor line from a 9-option pool (rethemed 2026-04-23 per §6.4 Tier 1 closure; see §8.1)
- "Still alive" player list (chips with color icon + name)
- Prompt: *"Watch the TV for the action"*
- **No interaction beyond dismissing** — this is the §5.6 "vocal participation" experience by design

### §6.2 — Board (shared screen)

**Top-level routing** (`src/client/board/Board.tsx`):

| Route | Trigger | Shows |
|---|---|---|
| Protocol Mismatch | Server protocol ≠ client | Full-screen: *"Game updated — please refresh"* |
| Lobby | `phase = lobby` or state not loaded | `Lobby.tsx` — QR code, room code, live player list, Start Game button |
| GameTable | `phase = playing` | `GameTable.tsx` — full game board, see components below |
| GameOver | `phase = game_over` | `GameOver.tsx` — winner reveal + Play Again button |

**GameTable components** (`GameTable.tsx`):

| Component | Position | Purpose |
|---|---|---|
| PlayerRing (`PlayerRing.tsx`) | Circle around center | All players shown; current turn highlighted with pulse; card counts; alive/eliminated state |
| Center — DrawPile | Middle-left of center | Face-down draw pile with count remaining |
| Center — DiscardFan | Middle-right of center | Fanned-out recently-played cards showing top card art |
| Arena (`Arena.tsx`) | Overlaid on center | Cards "land" here during play animations (GSAP-driven) |
| ~~feltBranding~~ | *(retired)* | Retired during Desk Redesign — the blotter/felt concept was replaced with mahogany desk + venetian blinds + brass nameplate. See §8.4 (checked) and `docs/plans/desk-redesign/PLAN.md`. |
| NopeCountdownBar (`NopeCountdownBar.tsx`) | Overlay | Globally-visible intercept window countdown |
| AnnouncementFeed (`AnnouncementFeed.tsx`) | Edge of screen | Event stream (*"Vera played Intercept"*) |
| PendingPromptBanner (`PendingPromptBanner.tsx`) | Overlay | Shows who the game is waiting on (*"Waiting for Dash to place the Extraction"*) |
| StatusBar (`StatusBar.tsx`) | Bottom strip | Board-level comms bar — turn state, phase info |
| DramaOverlay (eager) | Full-screen modal | Drama moments: BURNED, EXTRACTED, ELIMINATED, WINNER |

### §6.3 — Cross-view components

Shared between phone and board, in `src/client/shared/`:

| Component | Used on | Purpose |
|---|---|---|
| DramaOverlay | Phone (lazy) + Board (eager) | Full-screen drama moments keyed on game events. Lazy on phone to protect bundle budget; eager on board where bundle is less constrained. |
| GameOver | Phone + Board | Shared winner-reveal component with phase-specific props |

### §6.4 — Retheme gaps (must fix before visual implementation)

*Inventory compiled from a full-codebase audit on 2026-04-10 via `Explore` subagent. Grouped by priority tier. These are places where Exploding Kittens leftover language/assets still exist in code, comments, or UI text. **Tier 1 items must be fixed before beginning Visual Architecture implementation.** Tier 2 and 3 are cleanup that should not block visual work but should be completed before the spec exits draft.*

#### Tier 1 — User-visible violations (MUST fix before visual lock) — ✅ ALL CLOSED 2026-04-23 (see §8.4)

These directly violate §2 (Quality Bar) and §3 (Archer Visual Reference) because they're text a player sees during gameplay. **Status:** all three Tier 1 items closed in the 2026-04-23 retheme pass; original audit prose preserved below for historical context.

1. **EliminatedView title** (`src/client/player/EliminatedView.tsx:45`) — currently says *"You Exploded!"* That's a direct EK phrase. Replace with a spy-tone equivalent — candidates: *"Cover Blown"*, *"You're Burned"*, *"Mission Failed"*. Final copy decided at acceptance pass.
2. **EliminatedView flavor lines** (`src/client/player/EliminatedView.tsx:8-17`) — 8-option pool, mixed tone. Retheme audit:
   - ✅ *"Your cover's blown."* — keep (perfect spy)
   - ✅ *"Game over, hotshot."* — keep (works as dry spy)
   - ✅ *"Catastrophic failure."* — keep (works as spy)
   - ✅ *"BOOM. You're cooked."* — marginal; "cooked" works, "BOOM" is shouty-EK; reword
   - ❌ *"Blown to smithereens."* — cut (EK explosion pun)
   - ❌ *"Rest in pieces."* — cut (EK explosion pun)
   - ❌ *"You had a blast."* — cut (EK explosion pun)
   - ❌ *"Ka-boom, baby."* — cut (EK explosion pun)
   - **Replace the 4 cut lines with new Archer-tone dry-comedy lines.** Final copy decided at acceptance pass.
3. **GameTable feltBranding** (`src/client/board/GameTable.tsx:24`) — code comment says *"EK identity baked into the table"*. Audit what this actually renders visually; replace with Archer/Pendleton-era decorative element.

*(Note: `CardDetailSheet.tsx:27` contains the phrase "your cover is blown and you're out — unless you have an Extraction" as hint text for the Burned card. The subagent flagged this during the audit, but on review, this is correctly spy-rethemed language using the new card name. **Not a gap.** Documented here to prevent future audits from re-flagging it.)*

#### Tier 2 — Internal code references (SHOULD fix for code clarity; not user-visible)

These are code-level leftovers that don't appear in the UI but create cognitive drift for anyone reading the codebase. Future Claude sessions reading code with "EK" references will confuse the mental model.

1. **Engine comments using "EK" shorthand** (`src/server/game/engine.ts` lines 153, 216, 260, 478, 581, 654, 703, 708, 711, 1035, 1040) — 11 comments referencing "EK" as shorthand for the Burned card type. Global find-and-replace: `EK` → `Burned` in comments. Careful not to touch variable names that might collide with legitimate uses.
2. **Timing constants named `EK_*`** (`src/shared/constants.ts:21-23`) — three constants: `EK_REVEAL_MS`, `EK_RELIEF_MS`, `EK_ELIMINATION_MS`. Rename to `BURNED_REVEAL_MS`, `BURNED_RELIEF_MS`, `BURNED_ELIMINATION_MS`. These are imported by the animation timing code — grep for all usages and update together.
3. **Error message exposing "EK"** (`src/server/game/engine.ts:1040`) — throws error *"No EK in hand"*. This can leak into error logs and debugging sessions. Change to *"No Burned card in hand"*.
4. **Arena comment** (`src/client/board/Arena.tsx:7`) — references "EK reveal fills this zone full-screen." Change to "Burned reveal fills this zone full-screen."

#### Tier 3 — Domain language (judgment call — may intentionally stay)

1. **Internal state machine uses `defuse` terminology.** The sub-phase `defuse-pending`, the action `defuse-place`, the prompt `{ type: 'defuse' }` — all still use "defuse" internally. The UI layer correctly translates to player-facing "Extraction" language. Two schools of thought:
   - **Rename for consistency** — full internal alignment with the retheme, no cognitive friction for devs reading state machine code.
   - **Leave as domain language** — "defuse" is the mechanical action (removing a Burned card from the draw path), which is a domain concept independent of the flavor name. The external UI translation is working.
   - **Recommendation: leave as domain language.** Renaming state machine keys has blast radius across server, client selectors, Zod schemas, tests, and the Durable Object's hibernated state (version-migration problem). Not worth it for zero user-visible benefit. **Document this decision in the ADR section** so future Claude doesn't re-open it.
2. **Test comments use "EK" as shorthand** (14+ instances across `engine.test.ts`, `engine-phase3.test.ts`, `engine.pbt.test.ts`). Tests are internal-only, never touched during gameplay. Leave alone unless a Tier 2 rename sweep picks them up for free.

#### Summary counts

| Tier | Category | Count |
|---|---|---|
| 1 | UI copy (user-visible) | 3 locations, ~5 strings |
| 2 | Code comments | 12 instances across `engine.ts` and `Arena.tsx` |
| 2 | Timing constants | 3 constants + all call sites |
| 2 | Error message | 1 string |
| 3 | State machine domain language | Cross-cutting — leave intentionally |
| 3 | Test comments | 14+ — leave as internal |

**Tier 1 blocks visual lock. Tier 2 is cleanup. Tier 3 stays.**

---

## §7 — Architectural Decision Records (ADRs)

> *Each ADR leads with the **user-facing decision**. Implementation details are labeled explicitly and, where appropriate, kicked to forthcoming phase plans (not pre-committed in this spec). Decisions with no user-facing outcome live in `CLAUDE.md` as project conventions, not here.*

### ADR-01 — Zero-friction, zero-cost game rooms that survive reconnects

**Decision (user-facing):** A game room spins up the moment the first player joins and disappears when the last player leaves. No accounts, no setup, no database, no cost. Players who drop their WebSocket (screen lock, bad WiFi, browser refresh, phone reboot) rejoin the *same* game in their *same* seat with their *same* hand — the game does not restart, does not lose state, and does not penalize the dropped player.

**Why this is a product decision:** "No install, no login, just play" is goal §4.3. "Zero infrastructure cost" is goal §4.5. Supporting both simultaneously requires a server architecture that (a) holds stateful per-room game data without a database, (b) survives client disconnects transparently, and (c) costs nothing at friends-and-family scale. These three requirements together eliminate almost every backend option.

**Implementation (owned by this spec, not a plan):** Both client and server run on **Cloudflare**. Client is a static SPA on **Cloudflare Pages** (git-push deploy, preview URLs per commit). Server is a **Cloudflare Worker with Durable Objects**, accessed via `partyserver`, deployed with `wrangler`. Each game room is a Durable Object — a stateful JavaScript class that lives on Cloudflare's edge with automatic failover. **UMB ran on the same underlying infrastructure via PartyKit's wrapper** — BURNED uses `partyserver` directly without the middleman layer.

**Alternatives rejected:** Self-hosted Node.js WebSocket server (breaks zero-cost goal); Vercel Functions (stateless, incompatible with per-room state); Supabase Realtime (broadcast-oriented, not per-room stateful); Ably/Pusher (paid); Vercel for client + Cloudflare for server hybrid (adds CORS complexity and a second dashboard for no gain).

**Ratified:** April 5, 2026 (roadmap phase); re-ratified April 10, 2026 during product specification authoring after full alternatives review.

---

### ADR-02 — Server is the single source of truth (cheat-proof gameplay)

**Decision (user-facing):** No client can manipulate game state, claim cards they don't have, forge random draws, spoof their opponent's hand, or unilaterally advance turn order. Every game-state change originates from the server's validated dispatch of a typed intent. If a player's phone claims *"I played three Operatives,"* the server independently verifies the player actually held three Operatives before accepting the action.

**Why this is a product decision:** Friends playing a card game will trust each other, but the *system* must not depend on that trust. If one friend figures out how to cheat via browser devtools, they can privately laugh at the group all night without anyone being the wiser. That's a "game is broken and nobody knows" failure that silently destroys fun.

**Implementation:** Game state lives exclusively in the Cloudflare Durable Object (ADR-01). Clients send typed `ClientAction` intents over WebSocket; server validates with Zod (ADR-06) and dispatches via pure synchronous reducers (ADR-08). Clients render server-pushed state, with optimistic UI that rolls back cleanly on server rejection.

**Alternatives rejected:** Peer-to-peer state (trust boundary violated); host-phone-authoritative (host refresh = game over).

**Ratified:** April 5, 2026.

---

### ADR-03 — React 19 + TypeScript 5.9 for UI (deliberate departure from UMB)

**Decision (engineering, with user-facing consequence):** Both player and board views use React 19 + TypeScript 5.9. This is a deliberate departure from UMB's vanilla DOM + GSAP stack, not an oversight.

**Why this is in the spec and not just `CLAUDE.md`:** The framework choice has downstream consequences for the phone bundle budget (§4 Goal #4, §8.1 Technical) and the animation library (ADR-04). Locking it here prevents future sessions from proposing a framework swap without considering the cascade.

**User-facing consequence:** React's component model + `useSyncExternalStore` selector pattern enables optimistic updates (no visible lag between tap and hand change), granular re-renders (smooth performance on cheap phones), and a consistent interaction model across BURNED's 30+ stateful components.

**Alternatives rejected:** Vanilla DOM (unmanageable at BURNED's component count — worked for UMB's ~8 simple screens but doesn't scale); Vue/Svelte (team familiarity with React from UMB and earlier).

**Ratified:** April 5, 2026.

---

### ADR-04 — Smooth animation within the phone bundle budget

**Decision (user-facing):** Every state change in BURNED — card play, turn transitions, intercept window countdowns, card flip reveals, drama overlays — is animated smoothly at 60fps on mid-tier phones. But the animation code cannot push the phone bundle over 100KB gzipped. These two requirements are in tension and the spec resolves the tension explicitly.

**Why this is a product decision:** Smooth animation is part of the Archer-production-polish quality bar (§2). Fast load on cheap phones over party WiFi is goal §4.3 (sub-2-minute setup). Both must be true simultaneously — so we cannot pick an animation library that is either laggy OR large.

**Implementation:** Framer Motion via `motion/react`, with `LazyMotion` + `domMax` lazy-loaded. All components use the tree-shakable `m` component, never the full `motion` component. Enforced by ESLint. Motion features load in a separate chunk after initial paint.

**Alternatives rejected:** GSAP (larger bundle, imperative API doesn't compose with React; retained as scoped dependency for DramaOverlay's cinematic timeline orchestration only — see insight 043); Motion One (feature-incomplete for BURNED's needs); React Spring (idiom mismatch); CSS-only animations (insufficient for complex card-play sequencing).

**Ratified:** Phase 4/5 of BURNED build.

---

### ADR-05 — Visual consistency via a shared token system

**Decision (user-facing):** Every dimension, color, spacing step, typography choice, and animation timing in BURNED traces to a shared, documented token. A card in the hand view and a card in a bottom sheet are the same size *because they consume the same token value,* not because two CSS files happened to independently arrive at the same pixel number. A button's corner radius is the same across every surface. A heading's font size is the same wherever that heading role appears.

**Why this is a product decision:** Visual inconsistency is the #1 tell that a product was built by one person in spare time rather than by a team with a design system. A user can't tell you *why* a hobbyist app looks "off" — they just feel it. It's the rogue 14px next to the 16px, the extra 2px of padding on one button, the slightly-different card corner radius on one screen. **This inconsistency is what the §2.2 Archer test fails against.** An Archer episode has production-level discipline — every frame's typography, color, and spacing is coordinated. BURNED's current state (per `docs/ideation/2026-04-11-visual-layer-autopsy.md`) is "organized chaos" — each CSS Module makes independent sizing decisions, and the cumulative effect reads as amateur.

**User-facing acceptance condition:** When the first-time player test (§8.7) is run, consistency must be *invisible* — the player should never notice a visual discontinuity between screens, cards, or buttons. If they can't articulate what's wrong but the experience feels "off," consistency has failed.

**Alternatives rejected (at the product level):** "Let each component make its own styling decisions" — guaranteed visual drift, cannot pass the Archer test, produces the exact "hobbyist" feel we explicitly ruled out in §2.3.

**Implementation notes (NOT owned by this spec — owned by the CSS Foundation Rebuild Plan):** The specific technology stack (CSS Modules + `theme.css` with custom properties), the specific token shape, the specific `clamp()` formulas, the specific naming conventions, and the migration strategy all live in the forthcoming CSS Foundation Rebuild Plan. This ADR does not pre-commit any of those decisions — it only commits that whatever the plan produces must achieve the user-facing consistency described above. See §3.4 for the structural inputs (form factors, constraining axes) the plan must honor.

**Ratified:** April 10, 2026.

---

### ADR-06 — Server rejects malformed input before it can corrupt game state

**Decision (user-facing):** A player sending a malformed, malicious, or spec-violating WebSocket message to the server cannot corrupt game state, crash the room, leak data from other players, or escalate their own privileges. Every incoming message is typed, schema-validated, and rejected with a specific error code if it fails validation. Oversized messages are rejected before parsing.

**Why this is a product decision:** Untrusted client input is a security boundary. Friends won't deliberately exploit this, but the system must not trust anyone. A party game where one person can accidentally (or deliberately) crash everyone else's phone is a broken party game.

**Implementation:** Zod schemas in `src/server/validation.ts` parse every incoming `ClientMessage` into typed safe data before reaching the dispatcher. Server-only — clients trust server state and do not re-validate. Messages exceeding 4KB are rejected before `JSON.parse` per CLAUDE.md security convention.

**Alternatives rejected:** io-ts (smaller ecosystem); manual validation (error-prone and drift-prone).

**Ratified:** Phase 3 of BURNED build.

---

### ADR-07 — Private game data never leaks to other players' screens

**Decision (user-facing):** A player's hand, the draw deck's order, the deck's card identities, any private prompts (like See the Future), and any other "not-yours-to-see" game data is invisible to every other player's phone and to the board view. If a developer (or a future AI session) later adds a new private field to the game state, that field is invisible by default — it must be *explicitly allowlisted* into a projection function before any client can see it.

**Why this is a product decision:** Jackbox-style games depend on privacy. If your hand is visible to opponents via devtools, the game is ruined. This has to be bulletproof against accidental regression when new features are added in future sessions — a category of bug that is easy to introduce and invisible until exploited.

**Implementation:** State projection functions in `src/server/projection.ts` use an **allowlist pattern**. Every field sent to clients is *explicitly picked*, never spread from `GameState`. Object spread from `GameState` to any client view is **banned by ESLint rule**. Board view receives card COUNTS, not card identities. Player view receives only its own hand.

**Alternatives rejected:** Denylist projection (unsafe by default — new fields leak silently); client-side filtering (trust boundary violated).

**Ratified:** Phase 1 of BURNED build. **Non-negotiable — do not reconsider.**

---

### ADR-08 — Deterministic gameplay — no ghost turns, no race conditions, no mysterious desyncs

**Decision (user-facing):** When a player plays a card, the exact outcome is 100% predictable from the game state at that moment — same state + same action = same result, always. Multiple players acting at similar times cannot produce inconsistent results, lost turns, cards appearing in two places, or states where *"half the players think it's player X's turn and half think it's player Y's."*

**Why this is a product decision:** Ghost turns and desyncs are the most frustrating possible failure mode in a real-time party game. They're also nearly invisible in normal testing because they only happen under specific concurrent conditions. The only reliable defense is an architecturally-impossible-to-desync dispatch pattern.

**Implementation:** `dispatch(state, action) → newState` is a pure synchronous function with no timers, no I/O, no async, no side effects, no randomness. A serial action queue in `room.ts` ensures actions are processed one at a time in strict order. Side effects (deck shuffle RNG via CSPRNG, intercept window timers) happen OUTSIDE dispatch, in `room.ts`, between dispatches. Tested with `fast-check` property-based tests.

**Alternatives rejected:** Async reducers (ordering nightmares); observer patterns (hidden side effects); message bus (indirection without benefit).

**Ratified:** Phase 2 of BURNED build.

---

### ADR-09 — Protocol version mismatch halts the client with a clear refresh prompt

**Decision (user-facing):** When the server deploys a new version with a different protocol, any still-connected client running the old protocol immediately sees a full-screen *"Game updated — please refresh"* message instead of silently showing stale or broken state. No games are played against a mismatched protocol.

**Why this is a product decision:** During a party, Briggsy might push a bug fix mid-game. Without version checks, half the players would run the new protocol and half the old, producing visible but unexplained bugs. The refresh prompt makes the cause obvious and the fix one-tap for every player.

**Implementation:** Every `state-update` and `player-update` message includes `protocolVersion` from `PROTOCOL_VERSION` in `src/shared/protocol.ts`. Client compares on receipt; mismatch sets a `protocolMismatch` flag that triggers a full-screen halt overlay in both player and board views. Increment `PROTOCOL_VERSION` any time the message shape changes.

**Alternatives rejected:** Silent degradation (hides the cause); client-side hot-reload (unreliable); forced reconnect (infinite loops on persistent mismatch).

**Ratified:** Phase 3 of BURNED build.

---

## §8 — Acceptance Criteria

> *These define "done" for BURNED. When every item passes, BURNED is considered shipped against this spec. Check each box when the work lands. The §7.X ADRs are the non-negotiables; this section is how we prove we met them.*

### §8.1 — Phone controller (player view)

**Visual — the quality bar test:**
- [ ] Every screen passes the *"could this look like a frame from an Archer episode?"* test (§2.2). Screenshots taken via Playwright at 375×667 (iPhone SE), 390×844 (iPhone 14), 820×1180 (iPad 10.9), 1024×1366 (iPad Pro). Manually compared against Archer reference frames. **Fail = not shipped.**
- [ ] No layout breaks across the full target device range (5.5" phone → 13" iPad Pro portrait). Cards sized via `svh`, not `vw`. No `max-width` hacks, no `min(100svh, 900px)` clamps, no rigid flex ratios.
- [ ] Token system from the CSS Foundation Rebuild Plan is live. Every dimension traces to a token. Zero hardcoded pixel values in component `.module.css` files.

**Functional:**
- [ ] All 17 card types playable end-to-end.
- [ ] All 7 bottom sheets render and dismiss correctly: DefusePlacement, FavorResponse, FuturePeek (read-only + rearrange), TargetSelect (local + prompted), NameCard, CardDetailSheet.
- [ ] Optimistic updates for card play: no visible lag between tap and hand update.
- [ ] Reconnection preserves player identity (session token) — dropped player rejoins same slot with same hand.
- [x] EliminatedView shows corrected spy-tone copy from §6.4 retheme gaps. *(Verified 2026-04-23: title "You're Burned."; 9 rethemed flavor lines in `EliminatedView.tsx`.)*

**Technical:**
- [x] Phone bundle ≤ 100KB gzipped on initial load. *(Verified 2026-05-06 §2.8.3 audit: 97.5 KB gzipped, 2.5 KB under budget. Canonical table in `CLAUDE.md` §Bundle Sizes.)*
- [ ] No `motion` imports (only `m`). Enforced by ESLint.
- [x] No `console.log` in production build. *(Verified 2026-05-06 §2.8.4 retheme grep sweep: one violation in `room.ts` found and fixed; production bundle clean of dev-hook sentinels via `verify-prod-bundle.ts`.)*

### §8.2 — Board view (shared screen)

**Visual:**
- [ ] Every screen passes the Archer test. Screenshots at 1280×720 (small laptop), 1920×1080 (desktop), 3840×2160 (4K TV). Manually compared.
- [ ] No dead void space — player ring, draw/discard piles, and arena fill the screen at every supported size.
- [x] `feltBranding` replaced with Archer/Pendleton branding (from §6.4). *(Verified 2026-04-23: the felt/blotter concept was retired entirely during the Desk Redesign. Zero `feltBranding` matches in `src/`; the arena now uses mahogany desk + venetian blinds + brass nameplate. See `docs/plans/desk-redesign/PLAN.md`.)*
- [ ] Card animations land in the arena with dramatic presentation.

**Functional:**
- [ ] Lobby shows QR code + room code legibly from 6 feet away.
- [ ] Player ring updates live as players join, ready up, and act.
- [ ] Intercept countdown bar globally visible during every intercept window.
- [ ] AnnouncementFeed shows events without obscuring the arena.
- [ ] DramaOverlay triggers on BURNED, EXTRACTED, ELIMINATED, WINNER game events.

### §8.3 — Documentation

- [ ] **HOW-TO-PLAY doc** matches the production polish of UMB's HOW-TO-PLAY. Per Briggsy 2026-04-10: *"that doc alone could win an award."* That's the bar.
- [ ] HOW-TO-PLAY covers all 17 card types with clear rules, examples, and edge cases (Intercept chains, 3-card and 5-card combos, targeted attacks, self-Intercept disallowed, Draw From Bottom auto-triggers).
- [ ] HOW-TO-PLAY includes remote-play instructions (per §1: same-room is intent, remote works).
- [ ] HOW-TO-PLAY rendered as a polished HTML page with the same visual language as the game itself.
- [x] `README.md` reflects current state of the project. *(Rewritten 2026-04-23.)*
- [x] `CLAUDE.md` references `docs/PRODUCT-SPECIFICATION.md` as the canonical contract. *(See `CLAUDE.md` §The Contract.)*
- [x] `docs/ideation/*.md` each carry a *"SUPERSEDED — see `docs/PRODUCT-SPECIFICATION.md`"* banner at the top.

### §8.4 — Retheme completeness

- [x] All §6.4 Tier 1 gaps fixed: EliminatedView title, EliminatedView flavor lines (4 cut + 4 replaced), GameTable feltBranding. *(Verified 2026-04-23. Title "You're Burned."; flavor pool fully rethemed; `feltBranding` retired during Desk Redesign.)*
- [x] All §6.4 Tier 2 gaps fixed: `engine.ts` EK comments renamed, `EK_*_MS` timing constants renamed to `BURNED_*_MS`, `engine.ts:1040` error message updated, `Arena.tsx:7` comment updated. *(Verified 2026-04-23: zero `EK_` matches in `src/`.)*
- [ ] §6.4 Tier 3 state machine "defuse" language documented as intentional (not a gap).
- [x] Fresh retheme grep returns zero Tier 1 hits on a full source scan. *(Verified 2026-05-06: see `test/retheme/grep-sweep.md` — 8 checks complete, zero user-facing references to "Exploding Kittens"/"EK"/"You Exploded"; all `EK` mentions are code comments documenting rule provenance.)*

### §8.5 — Deploy

- [ ] Cloudflare Pages live at a production URL (e.g., `burned.pages.dev` or custom domain).
- [ ] Cloudflare Worker deployed via `wrangler`.
- [ ] A friend not in the room can scan a QR code on Briggsy's TV, open the URL on their phone, and join a game without any setup steps.
- [ ] CORS / WebSocket upgrade works in production (not just dev server).
- [ ] Rollback procedure documented: `wrangler versions list` → `wrangler versions deploy <version-id>`.

### §8.6 — Full game loop

**The ultimate test: a full game, start to finish, without developer intervention.**

- [ ] 5-player game from lobby to game-over completes without errors.
- [ ] Every card type gets played at least once during the game (via stacked test deck or natural play).
- [ ] Elimination happens at least once; EliminatedView displays; eliminated player cannot act.
- [ ] Full Party Pack mechanics tested: Burned, Extraction, Intercepted chains (multi-level), Reassign / Direct Order stacks, Call in a Favor, Intel Briefing / Falsify Intel, Burn the Files, Go Dark, Back Channel, all combos (pair steal, triple Name Card, 5-card Name Card).
- [ ] Reconnect test: a player force-closes their browser mid-game, reopens, rejoins same slot with same hand, same turn state.
- [ ] Zero ghost turns, frozen states, or desyncs between phone and board.

### §8.7 — The first-time player test (the quality bar, cashed in)

**This is §2's quality bar made operational.** A first-time player — a friend who has never seen BURNED before — plays a full game.

**Pass condition:** At some point during play, *without prompting from Briggsy*, they say something like:

- *"Wait — did Archer and company release this?"*
- *"Is this an official thing?"*
- *"Where can I download this?"*
- *"This feels like a commercial app."*

**Fail condition:** They say *"cool, you built this?"* with polite "hobbyist project" energy.

**If we fail this test, we fix the visuals and retest. No exceptions. This is the final quality gate.**
