# QA Issues — Undercover Mob Boss

3-round audit conducted 2026-03-20. 29 agents deployed across 3 rounds.

Legend: [x] = fixed, [ ] = open (known, accepted for v1)

---

## TIER 1: CRITICAL — 5 of 6 fixed

- [x] **C1: Phantom SubPhases** — fixed c8591d9. Display states + timer-based auto-advance.
- [x] **C3: PWA icons missing** — fixed 450d41c. Placeholder icons created.
- [x] **C4: Player errors invisible** — fixed c75547f. Error toast + name entry resilience.
- [x] **C5: Zero `:focus` styles** — fixed 0d79bdc. `:focus-visible` with gold outline.
- [x] **C6: Host dead end** — fixed ebbe9d2. Auto-generates room code.
- [ ] **C2: Missing audio assets** — `ambient-base.wav`, `ambient-tension.wav`, `policy-peek.wav` need Gemini TTS generation. Console noise demoted to `debug`. Not a code issue.

---

## TIER 2: HIGH — 13 of 13 fixed

- [x] **H1:** Stale session token — fixed c75547f
- [x] **H2:** Spam-click Start Game — fixed 849e685
- [x] **H3:** Dev features in production — fixed 849e685 + aefa4cb (env var)
- [x] **H4:** Investigation results leaked — fixed 849e685
- [x] **H5:** Name-collision takeover — fixed 26edf12 (30s grace period)
- [x] **H6:** `executed` narrator — fixed 62e753d
- [x] **H7:** Player audio unlock — fixed 62e753d
- [x] **H8:** Investigation flicker — fixed 1218e74
- [x] **H9:** Connection banner — fixed c75547f
- [x] **H10:** LobbyState type gap — fixed 7248af0
- [x] **H11:** Player CSS responsive — fixed 0d79bdc
- [x] **H12:** Google Fonts cached — fixed af00af0
- [x] **H13:** iOS background — fixed 0d79bdc

---

## TIER 3: MEDIUM — 19 of 19 fixed

- [x] M1: Ghost players — fixed 26edf12
- [x] M2: Kicked reconnect — fixed 26edf12 + 52d07a0 (client disconnect)
- [x] M3: Kick button — fixed 72e4882
- [x] M4: Vote validation — fixed 849e685
- [x] M5: Safari private — fixed c75547f
- [x] M6: Crossfade timeout — fixed af00af0
- [x] M7: Winner null — fixed 1218e74
- [x] M8: Role-reveal overlay — fixed 1218e74
- [x] M9: Narrator wiring — fixed 62e753d
- [x] M10: Deprecated meta — fixed 450d41c
- [x] M11: Vibrate guard — fixed af00af0
- [x] M12: CSS safe center — fixed 0d79bdc
- [x] M13: noir-silver — fixed 0d79bdc
- [x] M14: Duplicate action-btn — fixed 0d79bdc
- [x] M15: Hardcoded hex — fixed 0d79bdc + 72e4882
- [x] M16: Tab reconnect loop — fixed 26edf12 + 52d07a0
- [x] M17: handleGameAction any — fixed 7248af0
- [x] M18: sendAction any — fixed 7248af0
- [x] M19: Broadcast try/catch — fixed 26edf12 + aefa4cb

---

## ROUND 2 FINDINGS — all fixed

- [x] Narrator game-over winReason mismatch — fixed 52d07a0
- [x] Kicked player auto-rejoins — fixed 52d07a0 (client disconnect on KICKED)
- [x] SESSION_REPLACED doesn't stop reconnection — fixed 52d07a0
- [x] Narrator intro never starts (prevPhase null) — fixed 52d07a0
- [x] advance-display sendable by client — fixed 52d07a0
- [x] Display timer not cleared on reset — fixed 52d07a0
- [x] Veto rejection narrator wrong check — fixed 52d07a0
- [x] broadcastPrivateData missing try/catch — fixed aefa4cb
- [x] Connection banner overlaps top-bar — fixed 52d07a0

---

## ROUND 3 FINDINGS — all code-fixable items fixed

- [x] Round 1 round-start narrator — fixed 13b6762
- [x] Approved narrator on first-attempt pass — fixed 13b6762
- [x] Policy-peek narrator cue unreachable — fixed 13b6762
- [x] Veto button shows after rejection — fixed 13b6762
- [x] "Joining..." forever when offline — fixed 13b6762 (10s timeout)
- [ ] Blank screen on tab reopen within 30s grace period — edge case, PartySocket eventually reconnects
- [ ] `/host` URL serves player app in Vite dev — use `/host.html` instead
- [ ] How to Play: "social deduction" undefined, role/position distinction unstated, term-limited oversimplified, auto-enact unclear, 3-failure paragraph dense
- [ ] blocked/tracker-advance silent on auto-enact — narrator design limitation (single-dispatch state transition)

---

## DEAD CODE — all fixed in c88b7ca + 1e58c66

- [x] board-view.ts, transition-queue.ts deleted
- [x] createLobby removed, flipVoteCard removed, prevWinner removed
- [x] nudge.ts getElementById fixed, eliminated view unregistered
- [x] 15 unused exports de-exported, 7 unused CSS classes removed
- [x] Dependencies moved to devDeps
- [x] Dead AppState fields removed (boardViewActive, audioUnlocked)
- [x] pong handler added, privateData cleared on lobby reset

---

## VERIFIED SOLID (confirmed across 3 QA rounds)

- All 32 game rules correctly implemented
- Complete game loop traced: host→join→start→role reveal→nominations→elections with vote reveal→policy sessions→executive powers→veto→game-over
- Zero XSS vectors (all textContent)
- Player IDs can't be spoofed (server injects from connection state)
- advance-display blocked from client actions
- Session tokens crypto-random (UUID v4)
- Card indices validated, roles never leaked, deck never exposed
- Dev features gated by env var + origin check
- Investigation results stripped from broadcast events
- Kicked player session+name purged, client disconnects
- 30s grace period prevents name-collision hijacking
- SanitizedGameEvent type — honest types for stripped fields
- Single `as any` remaining (Vite import.meta — standard pattern)
- 760 tests passing, 0 typecheck errors
