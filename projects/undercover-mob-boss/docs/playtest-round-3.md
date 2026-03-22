# Playtest Round 3 — 2026-03-17

5 players: Alice, Bob, Charlie, Diana, Eddie

## Issues

### PT3-01: Role reveal needs envelope interaction -- FIXED
Player role was auto-displayed after 300ms. Now requires tap on the card to reveal — simulates opening a sealed envelope. Allies and "Got it" button hidden until card is flipped.

### PT3-02: Player name on role card -- FIXED
Player's name now shown on the front face of the role card above the role title.

### PT3-03: Government Formation covers the game board -- FIXED
"Government Formation" and all transient host screens (nomination, election results, policy enacted, executive power) converted from full-screen replacements to overlays on top of the game board. Board is always visible underneath.

### PT3-04: ~~Previous Mayor selectable as Chief in 5-player game~~ NOT A BUG
This is correct per SH rules: in games with only 5 alive players, the previous Mayor IS eligible — only the previous Chief is term-limited. The rule restricting the previous Mayor only applies at 6+ alive players. See RULES.md lines 83-84. Code verified correct in both server (`phases.ts:322`) and client (`mayor-nomination.ts:42`).

### PT3-05: Host board scrolls -- FIXED
Added `overflow: hidden` to screen container and `min-height: 0` to board tracks to ensure content compresses to fit viewport.

### PT3-06: Win screen covers the board -- FIXED
Game over screen converted to an overlay with 75% opacity background. Board (policy tracks, player strip) visible underneath. Role reveal, stats, and Play Again button shown in overlay.

### PT3-07: Mob track needs "Mob Boss as COP = game over" warning -- FIXED
After 3+ mob policies enacted, a pulsing red warning banner appears below the mob track: "Mob Boss elected as Chief = Game Over". Warning toggles dynamically when policy count changes.

### PT3-08: Player role card needs Mayor/COP indicator -- FIXED
Waiting screen header now shows government role badge: "Alice — Mayor" or "Bob — Chief" when applicable. Active screens (nomination, policy hand, etc.) already imply the role through their actions.

### PT3-09: Executive power waiting screen says "Police Chief" instead of Mayor's name -- FIXED
Waiting screen now dynamically shows the Mayor's actual name: "Diana has a decision to make. The room holds its breath." instead of the incorrect hardcoded "Police Chief" text.

---

## Outstanding — Design Polish -- FIXED

- **Host board still scrolls slightly** — Root cause: host view missing `box-sizing: border-box` reset and `body { overflow: hidden }` (host.html uses separate entry, doesn't import base.css). Added global resets to host-base.css. Also tightened grid gaps, added `min-height: 0` to policy tracks, and added proper padding-bottom on slots container for power labels.
- **Overall UI polish pass** — Board header: subtle background + refined typography. Policy slots: glow on filled slots, tighter height. Player strip: gold border on waiting players, softer dividers. Track labels: wider letter-spacing for readability. Warning banner: removed extra margin-top.
- **Overlay message bars** — Added responsive breakpoints (600px mobile, 1024px tablet). Reduced gap/padding on small screens, increased on large. Added backdrop-filter blur for depth. Nomination bar wraps gracefully. Max-width constraint prevents stretching on ultrawide. Session status bar also gets blur treatment.

---

## Outstanding — Next Session

- **Audio not working in-game** — narrator WAV files exist in `public/audio/` but are not triggering during gameplay. Audio engine needs investigation.
- **Regenerate narrator audio** — all 38 lines need regeneration. Voice direction was being spoken aloud. Script fixed (voice direction removed from text content). Blocked by Gemini TTS quota reset.
- **Host board mute button** — add mute/unmute toggle to the host board header for controlling narrator audio during play.
- **Mob soldier role reveal should label allies** — mob soldiers should see "Alice (Mob Boss)" vs "Charlie (Soldier)" — protocol `mobBossId` added, client updated, needs playtest verification.
- **Continued UI polish** — playtest the redesign (GSAP animations, glassmorphism, art assets, role peek envelope) and capture new feedback.
