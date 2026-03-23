# TODO

## Last Session: 2026-03-22 (Production Deployment — Vercel + PartyKit)

### The Story

We took the fully-built game (6-phase CE build, 760 unit tests, 498 E2E tests) and deployed it to production for the first time. What followed was a crash course in the gap between "works locally" and "works on the internet." Every fix below was discovered by actually using the deployed game on real devices.

### What was done

**1. Vercel Build Fix — `how-to-play.html` not found**
- `vite.config.ts` listed `how-to-play.html` as a Rollup entry point, but the file lives in `public/` (Vite copies those as-is — they're not build inputs)
- Removed it from `rollupOptions.input`. Build passes. (`b75a93e0`)

**2. Vercel Project Setup**
- Created Vercel project `undercover-mob-boss` connected to `ai-learning-journey` GitHub repo
- **Root Directory:** `projects/undercover-mob-boss` (this is a monorepo)
- **Framework Preset:** Vite (auto-detected)
- First attempt used wrong project name (`ai-learning-journey`) — deleted and recreated with correct name
- URL: `https://undercover-mob-boss.vercel.app`

**3. PartyKit Deployment**
- Deployed game server to Cloudflare Workers: `pnpm run partykit:deploy`
- Production URL: `https://undercover-mob-boss.mbriggsy.partykit.dev`
- Client code (`src/client/connection.ts`) reads `VITE_PARTYKIT_HOST` env var at build time
- Falls back to `localhost:1999` for local dev — this was causing "Lost connection" in production
- Set `VITE_PARTYKIT_HOST` in Vercel via CLI: `npx vercel env add VITE_PARTYKIT_HOST production --value "undercover-mob-boss.mbriggsy.partykit.dev" --yes`

**4. Content Security Policy (CSP) — 4 rounds of fixes**
The original CSP was locked down tight from the pre-deployment security hardening session. Too tight for production:

| What broke | CSP directive | Fix |
|---|---|---|
| Google Fonts stylesheet | `style-src 'self' 'unsafe-inline'` | Added `https://fonts.googleapis.com` |
| Google Fonts files | `font-src 'self'` | Added `https://fonts.gstatic.com` |
| WebSocket to PartyKit | `connect-src 'self' wss:` | Added `ws:` for dev compatibility |
| Service worker fetching fonts | `connect-src` | Added `https://fonts.googleapis.com https://fonts.gstatic.com` |
| HTP inline GSAP `<script>` | `script-src 'self'` | Added `'unsafe-inline'` |
| Cross-origin Google Fonts | `Cross-Origin-Embedder-Policy: require-corp` | Removed COEP entirely (not needed without SharedArrayBuffer) |

Final CSP in `vercel.json`:
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data:;
media-src 'self';
connect-src 'self' ws: wss: https://fonts.googleapis.com https://fonts.gstatic.com;
font-src 'self' https://fonts.gstatic.com;
object-src 'none';
base-uri 'self';
form-action 'self'
```

**5. Service Worker Stale Cache — The Big One**
The service worker was **precaching HTML pages**. Every deployment left users stuck on the old version. For a multiplayer game that requires internet, this was all pain and no gain.

**The fix (3 parts):**
- Removed `html` from `globPatterns` in `vite.config.ts` — HTML pages no longer precached
- Added `NetworkFirst` strategy for navigation requests — always fetches fresh HTML from network
- Set `navigateFallback: null` — no SPA fallback from the SW
- Added `controllerchange` listener to `index.html` and `host.html` — auto-reloads when new SW activates

**What still caches (correctly):**
- JS/CSS (hashed filenames — safe to cache forever)
- Images and audio (CacheFirst — big files, rarely change)
- Google Fonts (StaleWhileRevalidate)

**One-time user action required:** Anyone who visited during the broken SW period needs to clear site data once (DevTools → Application → Storage → Clear site data). After that, the NetworkFirst strategy ensures fresh pages on every visit.

**6. Mobile Scroll Lock**
Player view on phones was bouncing/scrolling. Added `overflow:hidden; position:fixed; overscroll-behavior:none; touch-action:none` to `<body>` and `#app` in `index.html`.

**7. Narrator Line Fixes**
Three audio lines had wrong text:

| Line | Was | Now |
|---|---|---|
| `vote-open` | "Approve... or **block**" | "Approve... or **deny**" (matches UI button) |
| `nomination` | "The Mayor has nominated the Police Chief" | "The gavel passes. A new Mayor takes the seat. Choose wisely..." (fires BEFORE nomination, not after) |
| `approved` | "The nomination passes" | "The vote carries. A new government takes power. For better... or for worse." |

Regenerated via: `npx tsx scripts/generate-narrator.ts --only <id> --force`

**8. Policy Card Art**
The `.policy-reveal__art` CSS class was missing entirely. The policy card overlay showed a bare gold/red rectangle instead of the `policy-good.png` / `policy-bad.png` artwork. Added CSS to make the image fill the card.

**9. Documentation**
- Updated `docs/env-setup/ENVIRONMENT-SETUP.md` with Vercel setup, PartyKit deploy, deployment architecture diagram, and checklist items

### Commits (this session)
```
d6fb19aa fix: add missing CSS for policy card art — image now fills the card
3c7cbb99 fix: switch HTML pages to NetworkFirst — no more stale deploys
b68c1da0 fix: update nomination and approved narrator lines to match game flow
d3b55551 fix: narrator says "deny" instead of "block" to match UI buttons
4b48edc8 fix: auto-reload page when service worker updates
9379af96 fix: add Google Fonts domains to connect-src in CSP
a3cf95a6 fix: allow inline scripts in CSP for how-to-play GSAP animations
92c44459 fix: prevent mobile page scroll/bounce on player view
199b9c3b docs: add Vercel + PartyKit deployment steps to environment setup
d82a9bf9 chore: trigger Vercel redeploy to pick up VITE_PARTYKIT_HOST env var
9253d20f fix: relax CSP and remove COEP to allow Google Fonts and WebSocket connections
b75a93e0 fix: remove how-to-play.html from Vite rollup inputs — file lives in public/
```

### Build status
- Typecheck: clean
- Unit tests: 760/760 passing
- Vite build: passing
- Production: LIVE at undercover-mob-boss.vercel.app

## State
- Branch: main (committed, pushed)
- Vercel: DEPLOYED and working
- PartyKit: DEPLOYED at undercover-mob-boss.mbriggsy.partykit.dev
- CSP: FIXED — Google Fonts, WebSocket, inline scripts all allowed
- Service Worker: FIXED — NetworkFirst for HTML, no more stale deploys
- Narrator: FIXED — 3 lines regenerated with corrected scripts
- Policy card art: FIXED — CSS added
- Mobile scroll: FIXED — body locked

## NEXT SESSION

### Priority 1: Real-device playtest (continued)
- Full game on iPad (host) + phones (players) with the production URL
- Verify all narrator lines sound right in context
- Verify policy card flip animation shows artwork (not gold rectangle)
- Test PWA install flow on iOS and Android

### Priority 2: Remaining QA issues
- **C2: Missing audio assets** — `ambient-base.wav`, `ambient-tension.wav` need generation (see QA-ISSUES.md)
- Player vote results screen polish

### Future Features
- **Narrator variant pool** — multiple lines per trigger, randomly selected at playback for replayability (Briggsy requested)
- Ambient music layer
- Zod schema validation

## Landmines
- **CSP is permissive now** — `script-src` allows `'unsafe-inline'` for the HTP GSAP animations. If we move HTP to the Vite build pipeline, we can remove this.
- **Service worker caches audio/assets with CacheFirst** — if you regenerate a narrator line, the old audio may persist in users' browsers for up to 30 days. The filename doesn't change (e.g. `nomination.wav`). For now this is fine since the game just launched. Future: consider content-hashed audio filenames.
- **Vercel CLI doubles the path** — running `npx vercel --prod` from within the project dir fails because Vercel appends the Root Directory config to the cwd. Workaround: push to git and let the GitHub integration build, or use `npx vercel env` commands which work fine.
- **PartyKit deploy uses `.env`** — it auto-loads `.env` from the project root. No manual env setup needed.
- **E2E flaky test** — `simultaneous-actions.spec.ts:480` "Rapid scenario loading" fails on WebKit engine only. Timing race in test harness, not a game bug.
- **Row layout breakpoint is 1600px** — below that, host board tracks stack vertically. Intentional for iPad Pro (1366px).
- **Player lobby uses `ploby__` prefix** — NOT `lobby__`. Host lobby uses `lobby__`. Separate CSS namespaces.
- **HTP is standalone HTML in `public/`** — not part of the Vite TypeScript build. Uses self-hosted GSAP from `public/vendor/` and fonts from `public/fonts/`.
- Grace period: **0ms in dev, 30s in prod**
- `/host` URL serves player app in Vite dev — use `/host.html` instead

## Deployment Cheat Sheet

### First-time setup (new machine / new contributor)
```bash
# 1. Clone and install
git clone https://github.com/mbriggsy/ai-learning-journey.git
cd ai-learning-journey/projects/undercover-mob-boss
pnpm install

# 2. Environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# 3. Local dev
pnpm run dev              # Vite dev server (frontend)
pnpm run partykit:dev     # PartyKit dev server (multiplayer) — separate terminal

# 4. Open in browser
# Host view:   http://localhost:5173/host.html  (use .html in dev!)
# Player view: http://localhost:5173
```

### Deploy to production
```bash
# Frontend (automatic — just push to main)
git push origin main      # Vercel builds automatically

# Game server (manual)
pnpm run partykit:deploy  # Deploys to Cloudflare Workers
```

### Regenerate a narrator line
```bash
# Fix the script in scripts/narrator-prompts.ts, then:
set -a && source .env && set +a
npx tsx scripts/generate-narrator.ts --only <line-id> --force

# Example:
npx tsx scripts/generate-narrator.ts --only nomination --force
```

### Regenerate visual assets
```bash
set -a && source .env && set +a
npx tsx scripts/generate-assets.ts --only <asset-id> --force
```

### If a user sees stale content
They need to clear their browser's cached data for the site ONE TIME.
After that, the NetworkFirst service worker strategy ensures fresh pages on every visit.
- **Chrome desktop:** DevTools → Application → Storage → Clear site data
- **Chrome mobile:** Settings → Privacy → Clear browsing data → Cached images and files + Cookies
- **iPad Safari:** Settings → Safari → Advanced → Website Data → find vercel.app → Delete
