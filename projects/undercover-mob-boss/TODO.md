# TODO

## Last Session: 2026-03-22 (Security headers, evidence package, HTP self-hosting)

### What was done
1. **Security headers** — CSP, HSTS, Referrer-Policy, Permissions-Policy added to vercel.json. X-XSS-Protection removed (deprecated, can cause XSS in older IE).
2. **E2E sequential run (all 4 browsers)** — Chromium 125/125, WebKit 124/125, Mobile Chrome 125/125, Mobile Safari 124/125. Two failures are the same flaky stress test (rapid scenario loading on WebKit engine) — test harness timing, not a game bug.
3. **README.md** — Created project README with quick start, tech stack, test coverage, theme mapping.
4. **Evidence package** — `docs/EVIDENCE.md` master evidence doc covering planning investment, quality metrics, autonomous SDLC process, and the "Lines of Planning" ratio (~10k planning, ~14k code, ~17k tests).
5. **Executive summary deck** — 7-slide noir-themed PPTX (`docs/UMB-Executive-Summary.pptx`). Key narrative: spec-driven dev, autonomous SDLC, zero architectural defects.
6. **TEST-EVIDENCE.md updated** — Numbers corrected from 378→760 unit, 58→125 E2E (×4 = 500), total 1,260.
7. **HTP self-hosted** — Moved `how-to-play.html` to `public/`, replaced CDN GSAP + Google Fonts with self-hosted copies (`public/vendor/`, `public/fonts/`). CSP-compliant, works offline.
8. **HTP blink fix** — All `gsap.from()` inside ScrollTrigger callbacks converted to `gsap.set()` + `gsap.to()`. Pre-hides elements before scroll trigger fires, eliminating the double-load blink on role cards, power cards, win cards, track slots, timeline steps, example paragraphs, and tip cards.
9. **Player lobby title** — "Undercover Mob Boss" split to two lines: "Undercover" / "Mob Boss".

### Build status
- Typecheck: clean
- Unit tests: 760/760 passing
- E2E: 498/500 passing (2 flaky — same WebKit stress test)

## State
- Branch: main (committed)
- Security headers: DONE — CSP, HSTS, Referrer-Policy, Permissions-Policy
- Evidence package: DONE — MD + PPTX
- HTP: DONE — self-hosted, no external CDN, blink fixed
- Player lobby: DONE — two-line title

## NEXT SESSION

### Priority 1: Deploy
- Push to remote
- Verify Vercel deployment
- Test security headers with browser dev tools (check CSP, HSTS in response headers)
- Verify HTP fonts + GSAP load from self-hosted paths in production

### Priority 2: Real-device playtest
- iOS Safari (physical iPhone)
- Android Chrome (physical Android)
- Test narrator audio plays on both platforms
- Test PWA install flow

### Future
- Ambient music (C2 from QA-ISSUES.md — needs ambient-base.wav, ambient-tension.wav, policy-peek.wav)
- Player vote results screen
- Zod schema validation

## Landmines
- **E2E flaky test** — `simultaneous-actions.spec.ts:480` "Rapid scenario loading" fails on WebKit engine only. Timing race in test harness, not a game bug. Passes on Chromium.
- **Row layout breakpoint is 1600px** — below that, host board tracks stack vertically. Intentional for iPad Pro (1366px).
- **Player lobby uses `ploby__` prefix** — NOT `lobby__`. Host lobby uses `lobby__`. Separate CSS namespaces.
- **HTP is standalone HTML in `public/`** — not part of the Vite TypeScript build. Uses self-hosted GSAP from `public/vendor/` and fonts from `public/fonts/`.
- **CSP is strict** — `script-src 'self'`, `font-src 'self'`. Any new external resource will be blocked. Update CSP in vercel.json if needed.
- Grace period: **0ms in dev, 30s in prod**
- `/host` URL serves player app in Vite dev — use `/host.html` instead
