---
title: "Phase 6: Hardening & Deploy"
type: feat
phase: 6
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened:
executed:
reviewed:
---

# Phase 6: Hardening & Deploy

**Goal:** Bulletproof game night experience. No crashes, no weirdness, deploys cleanly.

## Tasks

### Reconnection Edge Cases
- Disconnect during Nope window: reconnect shows current state + correct `remainingMs`
- Disconnect during Defuse: server waits (timeout), reconnect shows button row
- Disconnect during Favor: server waits, reconnect restores. If Noped, `prompt-cancelled` on reconnect.
- Tab close + reopen: session token full state restore
- Multiple tabs: latest-wins, SESSION_REPLACED error

### Mobile Browser Hardening
- Wake Lock API (re-acquire on `visibilitychange`, HTTPS via PartyKit)
- `100dvh` viewport height
- `touch-action: manipulation` (kill 300ms tap delay)
- `user-scalable=no`
- Test Mobile Safari + Chrome Android

### Performance
- Memo card components, stable selector hooks
- Canvas particle cleanup (no GPU memory leak)

### Security
- Room code: host-creates-first or rate limiting
- Verify no drawPile contents in any projection
- Reject Nope when `nopeWindow.active === false`

### Deployment
- PartyKit deploy (adapt UMB GitHub Actions)
- Vercel or Cloudflare Pages for client
- Environment config (PartyKit host URL)

### E2E Test Suite
- Playwright multi-context: board + 3-4 phones
- Full game flow: join → play → explode → win
- Reconnection scenario
- Nope chain scenario
- Favor-cancelled-by-Nope
- Stale stateVersion rejection

### Inactivity
- 15min no-action → game ends
- 30min empty room → cleanup (same as UMB)

## Tests

E2E suite covers all critical paths. Manual multi-device on real phones.

## Done When

Full game night — multiple games, phones locking/unlocking, WiFi drops — nothing breaks. Deploy is one push to main.
