# Undercover Mob Boss — Tooling Ideas
*Not locked in. Just thinking out loud.*

---

## Build & Methodology

**CE deepen-plan** (strike team gate)
- Runs between GSD-2's Plan and Execute phases
- 10+ specialist agents stress-test the plan pre-code
- Proven across racer-02 and racer-04 — battle-tested
- `/deepen-plan` in Claude Code after plan is ready

---

## Art & Visuals

**Gemini Imagen 4** ✅
- Already have the key from racer-04
- Card art, character portraits, city backgrounds, policy tiles
- Noir aesthetic is perfect for AI image gen
- ~$0.06/image, proven pipeline from racer-04

**Pencil.dev** (maybe, still early)
- IDE-native design canvas for UI screens
- Worth revisiting when more mature — design mobile screens before building

---

## Audio & Voice

**ElevenLabs**
- The narrator voice — Wil Wheaton energy, noir gravitas
- Pre-generate all ~17 lines from SPEC.md narrator script
- One-time cost, static files served at runtime — no latency during play

**Web Audio API** (no external dep)
- Ambient noir jazz, tension music, voting countdown ticks
- Same layered synthesis approach as racer-04
- Free, no license issues, fully custom

---

## Real-time Multiplayer

**PartyKit** ✅ (decided)
- Built specifically for multi-device party game use cases
- WebSocket room management, ephemeral state, Cloudflare edge
- `pnpm add partykit` — added as project dep during build

---

## PWA / Mobile Polish

**Vite PWA plugin**
- Installable on home screen
- Works offline for static assets
- Party-ready: no app store, no install friction

**Haptic feedback** (free, no dep)
- `navigator.vibrate()` on role reveal
- Small touch, huge moment

**QR code generation**
- `qrcode` npm package — tiny, zero dependencies
- Players scan to join room — no typing room codes on mobile
- `pnpm add qrcode`

---

## Diagramming (no install)

**Mermaid** — in-repo technical diagrams
- Claude generates natively, renders in GitHub
- Enforced in CLAUDE.md

**draw.io XML** — stakeholder artifacts, evidence package
- Claude generates XML, open at app.diagrams.net, export PNG/SVG

---

## The Features That Beat the Board Game

These aren't tooling — they're reasons to build this digitally:

- **Animated role card reveal** — dramatic flip, sound, haptic
- **Voting suspense** — "Waiting for 3 more votes..." → simultaneous reveal
- **Post-game breakdown** — "Here's every lie Dave told" replay mode
- **Narrator voice on every phase** — something the cardboard version will never have
- **Private role reveal** — no "close your eyes" theater, phones handle it all

---

*Add to this as we learn more. Nothing here is final.*
