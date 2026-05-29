# Undercover Mob Boss — Build Instructions

## Project Type
TypeScript browser game (PWA) with PartyKit multiplayer.
1940s noir social deduction game — digital adaptation of Secret Hitler (CC BY-NC-SA 4.0).

## Tech Stack
- **Build:** Vite 8 + TypeScript 5.9
- **Testing:** Vitest 4
- **Multiplayer:** PartyKit (added in Phase 2)
- **Assets:** Gemini Imagen 4 (pre-generated)
- **Audio:** Gemini 2.5 Flash TTS (pre-generated)
- **Hosting:** Vercel (client) + Cloudflare Workers via PartyKit (server)

## Commands
```bash
pnpm install              # install dependencies
pnpm run dev              # start vite dev server (Phase 1+)
pnpm run build            # production build (Phase 1+)
pnpm run test             # run vitest (Phase 1+)
pnpm run typecheck        # tsc --noEmit
pnpm run generate-assets  # generate visual assets via Imagen 4
pnpm run generate-narrator # generate narrator audio via Gemini TTS
```

## Deployment
- **Client (Vercel):** Auto-deploys on every push to main. No config needed.
- **Server (PartyKit):** Auto-deploys via GH Actions when `src/server/`, `src/shared/`, or `partykit.json` changes on main.
  - Workflow: `.github/workflows/deploy-partykit.yml` (monorepo root, NOT project root)
  - Secrets: `PARTYKIT_TOKEN`, `PARTYKIT_LOGIN` (configured in GitHub repo settings)
  - Manual fallback (only if GH Actions is broken): `pnpm run partykit:deploy`
- **Both are fully automatic. No manual deploy step needed.**

## Key Directories
- `src/client/` — browser-side code (views, audio, state)
- `src/server/` — PartyKit server (room logic, game engine)
- `src/shared/` — types shared between client + server
- `public/assets/` — AI-generated images (committed to git)
- `public/audio/` — pre-generated narrator OGGs (committed to git)
- `scripts/` — asset generation pipelines (Imagen 4, Gemini TTS)
- `assets/raw/` — raw Imagen outputs before processing (gitignored)
- `videos/trailer/` — Remotion video project (cinematic trailer, separate pnpm workspace)

## Environment Variables
Shared secrets live in the **repo-root** `.env` (see `../../.env.example`), loaded
via `tsx --env-file=../../.env --env-file-if-exists=.env` in the gen scripts:
- `GEMINI_API_KEY` — Gemini API with billing enabled (both Imagen 4 assets and TTS narrator)

Project-local `.env` (see `.env.example`) holds only `VITE_PARTYKIT_HOST` and `STITCH_API_KEY`.

## Architectural Decisions
- See `docs/v1/spec/SPEC.md` for V1 spec (LOCKED)
- See `docs/v2/spec/SPEC.md` for V2 spec (LOCKED)
- See `docs/shared/user/HOW-TO-PLAY.md` for player-facing rules (source)
- See `public/how-to-play.html` for the rendered player-facing page (GSAP-animated)
- Host device is authoritative (ADR-04)
- Pre-generated audio via Gemini TTS, not runtime TTS (ADR-02)
- All assets AI-generated via Imagen 4 (ADR-05)
- Narrator uses Gemini 2.5 Flash TTS with Charon voice + noir style prompting

## Conventions
- All prompts versioned in `scripts/` (never regenerate without prompt changes)
- Chroma-key BEFORE resize (prevents color bleeding)

## Landmines
- **Asset cache version** — `ART_VERSION = 4` in `role-reveal.ts` and `role-peek.ts`. Bump when role art changes.
- **Asset SW cache** — now `NetworkFirst` (asset-cache-v3). Always fetches fresh, cache is offline fallback only.
- **CSP allows `'unsafe-inline'`** for HTP GSAP animations
- **E2E flaky tests** — 2 failures in WebKit/Mobile Safari. Test harness timing, not game defects.
- **`/host` URL serves player app in Vite dev** — use `/host.html` instead
- **Grace period:** 0ms dev, 30s prod
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`
- **Imagen 4 daily quota:** 70 requests/day on paid tier 1. Plan card generation across sessions.
- **TTS daily quota:** 100 requests/day for gemini-2.5-flash-tts. 117 narrator lines total — fits in one session if no retries.
