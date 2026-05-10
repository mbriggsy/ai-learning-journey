---
title: BURNED — Deployment guide (planned)
type: reference
date: 2026-05-09
status: planned (no deploy yet)
---

# BURNED — Deployment guide (planned)

> **Status: not yet deployed.** Nothing has shipped to Cloudflare. Spec §8.5 acceptance criteria are unchecked. This document captures the intended shape; treat it as a target, not a description of current reality. When the first deploy lands, update this doc with the live URL, real workflow names, and verified rollback steps.

## Intended architecture

| Component | Service | Notes |
|---|---|---|
| Client (board + player) | Cloudflare Pages | Static Vite build of `dist/`. Auto-deploy on push to `main`. |
| Server (game room) | Cloudflare Workers + Durable Objects | One DO per active room code. Wrangler-deployed. |
| Cost target | $0 | Cloudflare free tier covers expected traffic for a party game with no commercial users. |

WebSocket connections are upgraded by the Worker. Cloudflare handles WSS termination automatically — production clients connect over WSS without code changes.

## Pre-deploy checklist

When the first deploy is ready to ship, run through the public-flip prep first:

- [ ] `test/public-repo-prep.md` checklist completed.
- [ ] `LICENSE` chosen and committed at repo root.
- [ ] `CONTRIBUTING.md` reflects current norms.
- [ ] All `[[wikilink]]` references in `README.md` converted to standard markdown (already done 2026-05-09 — verify with `grep '\[\[' *.md docs/**/*.md`).
- [ ] Spec §8.5 acceptance criteria reviewed; confirm any item that should land before flip.
- [ ] Dreamland reference images confirmed gitignored (`docs/plans/css-foundation-rebuild/dreamland-reference/images/` — fair-use only, not for public distribution).

## Workflow shape (planned)

Two GitHub Actions workflows, sequenced server-then-client:

1. **Server deploy** (`deploy-worker.yml` or similar): runs `wrangler deploy` on push to `main`. Server lands first so clients always talk to a compatible Worker.
2. **Client deploy** (Cloudflare Pages Git integration): auto-deploys `dist/` after `pnpm build`. Cloudflare Pages handles the build via its own Vite detection.

The **server-first ordering matters**: a client deploy that ships before its server counterpart can hit a Worker running an older protocol version, which surfaces as a `PROTOCOL_MISMATCH` "please refresh" prompt. Order eliminates the window.

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
- `https://burned.pages.dev` (intended prod hostname)

Any new dev origin or alternate prod hostname must be allowlisted in code before connections succeed. See `docs/conventions/server.md` for the relevant rule.

## Protocol version coordination

When the wire format changes:

1. Bump `PROTOCOL_VERSION` in `src/shared/protocol.ts`.
2. Update `gameStore.test.ts` to match.
3. Deploy server first (always — see workflow ordering above).
4. Old clients that reconnect after the bump get a "Game updated — please refresh" message and reconnect on the new version.

## Open items

- The intended prod hostname `burned.pages.dev` may change at flip time depending on what's available.
- GitHub Actions workflows referenced above don't yet exist as `.yml` files in this repo. The workspace-level `.github/workflows/deploy-ek.yml` predates the repo's current state and is not currently the source of truth.
- Briggsy decides the deploy timing — currently gated behind the visual rebuild and playtest harness landing (see `TODO.md` §4 carryover).
