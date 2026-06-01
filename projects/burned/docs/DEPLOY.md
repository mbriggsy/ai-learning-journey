---
title: BURNED — Deployment guide
type: reference
date: 2026-06-01
status: deployed (live)
---

# BURNED — Deployment guide

> **Status: LIVE.** BURNED is deployed to Cloudflare and auto-deploys on every push to `main` that touches `projects/burned/**`, via the GitHub Actions workflow `.github/workflows/deploy-burned.yml` (at the monorepo root, not inside this project).

## Live URLs

| Surface | URL |
|---|---|
| Client (board + player + howtoplay) | `https://burnedgame.pages.dev` (Pages project **`burnedgame`**) |
| Game server (Worker + Durable Object) | `https://burned.briggsy007.workers.dev` (Worker **`burned`**) |

The client connects to the Worker via `VITE_PARTYKIT_HOST`, baked in at build time from `.env.production` (`burned.briggsy007.workers.dev`). The Worker name and the Pages project name are independent — renaming one does not touch the other.

> **Pages project name vs. `.pages.dev` subdomain.** The `*.pages.dev` subdomain is the project name *if globally available*. `burned.pages.dev` was already taken by an unrelated Cloudflare account, so the old project (named `burned`) was assigned the collision subdomain `burned-cxa.pages.dev`. The current project `burnedgame` got the clean `burnedgame.pages.dev` because that name was free. Subdomains are fixed at project creation — to change it you create a **new** project (which is exactly what the `burned → burnedgame` migration did, 2026-06-01).

## Architecture

| Component | Service | Notes |
|---|---|---|
| Client (board + player) | Cloudflare Pages | Static Vite build of `dist/`, **direct-upload** via wrangler in CI. No CF Git integration (deliberately — see below). |
| Server (game room) | Cloudflare Workers + Durable Objects | One DO per active room code. `wrangler deploy` in CI. |
| Cost | $0 | Cloudflare free tier. |

WebSocket connections are upgraded by the Worker. Cloudflare handles WSS termination automatically — production clients connect over WSS without code changes.

> **Heads-up — the old `burned` project still has a broken CF Git integration.** The original `burned` Pages project was *also* connected to the repo via Cloudflare's native Git integration, which fails on every push (`pages-build-deployment` red ✗ — monorepo, no root-dir config). The GitHub Actions wrangler deploy is the real one. `burnedgame` is created via direct-upload only, so it has **no** Git integration and no red ✗. Delete the old `burned` project (dashboard or an API token with Pages:Edit) to clear the lingering failing check.

## Pre-deploy checklist

When the first deploy is ready to ship, run through the public-flip prep first:

- [ ] `test/public-repo-prep.md` checklist completed.
- [ ] `LICENSE` chosen and committed at repo root.
- [ ] `CONTRIBUTING.md` reflects current norms.
- [ ] All `[[wikilink]]` references in `README.md` converted to standard markdown (already done 2026-05-09 — verify with `grep '\[\[' *.md docs/**/*.md`).
- [ ] Spec §8.5 acceptance criteria reviewed; confirm any item that should land before flip.
- [ ] Dreamland reference images confirmed gitignored (`docs/plans/css-foundation-rebuild/dreamland-reference/images/` — fair-use only, not for public distribution).

## Workflow shape

One GitHub Actions workflow — `.github/workflows/deploy-burned.yml` (monorepo root) — runs on push to `main` touching `projects/burned/**`, with three sequential jobs:

1. **`verify`**: `pnpm install` → `generate:palette` → `typecheck` → `test` → `build` → `verify:bundle`.
2. **`deploy-worker`** (`needs: verify`): `wrangler deploy` (Worker + DO). Server lands first so clients always talk to a compatible Worker.
3. **`deploy-pages`** (`needs: deploy-worker`): `pnpm build`, ensure the `burnedgame` Pages project exists (idempotent `wrangler pages project create`), then `wrangler pages deploy dist --project-name=burnedgame --branch=main`.

Auth: both deploy jobs use the `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` GitHub secrets (a wrangler **OAuth** login from a dev machine is *not* authorized for the Pages REST API — it 403s; only the CI API token works).

The **server-first ordering matters**: a client deploy that ships before its server counterpart can hit a Worker running an older protocol version, which surfaces as a `PROTOCOL_MISMATCH` "please refresh" prompt. The `needs:` chain eliminates the window.

## Environment

The Worker reads no secrets in current code. If that changes (e.g., adding telemetry, observability hooks, or auth), capture them via `wrangler secret put <NAME>` — never check secrets into the repo.

For the dev loop, secrets live in `.env` at the project root (gitignored). The playtest harness uses `PLAYTEST_TOKEN` to gate god-observer connections — see `scripts/playtest/README.md`.

## Rollback

**Server:**
```bash
wrangler versions list
wrangler versions deploy <version-id>
```

Cloudflare keeps prior Worker versions; rolling back is a one-line redeploy of a named version. Useful when a bad protocol bump ships and you need to restore the previous version while clients refresh.

**Client:**

Cloudflare Pages keeps every deploy. Roll back via the dashboard ("Deployments" → "..." → "Rollback to this deployment") or by force-pushing the previous main SHA.

## Production WebSocket origin allowlist

`src/server/room.ts` accepts WebSocket upgrades from:
- `localhost` and LAN IPs (dev)
- `https://burnedgame.pages.dev` (canonical prod hostname)
- `https://burned-cxa.pages.dev` (transitional — old project subdomain; remove after the old `burned` project is deleted)

Any new dev origin or alternate prod hostname must be allowlisted in code before connections succeed. See `docs/conventions/server.md` for the relevant rule.

## Protocol version coordination

When the wire format changes:

1. Bump `PROTOCOL_VERSION` in `src/shared/protocol.ts`.
2. Update `gameStore.test.ts` to match.
3. Deploy server first (always — see workflow ordering above).
4. Old clients that reconnect after the bump get a "Game updated — please refresh" message and reconnect on the new version.

## Open items

- **Delete the old `burned` Pages project** to clear the lingering failing `pages-build-deployment` check and free the `burned-cxa.pages.dev` subdomain. Needs the dashboard or an API token with Pages:Edit (the local wrangler OAuth token 403s on Pages management). Once done, drop `https://burned-cxa.pages.dev` from the `room.ts` allowlist.
- A scoped `CLOUDFLARE_API_TOKEN` (Account → Pages:Edit) in the root `.env` would let Claude manage Pages projects locally (list/create/delete) instead of only through CI.
