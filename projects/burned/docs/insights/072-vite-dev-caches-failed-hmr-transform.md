---
title: Vite 8 dev server serves a stale 500 for a module after a transient bad-parse HMR, surviving browser reloads
date: 2026-06-01
modules: [src/client/board/GameTable.tsx, src/client/board/Lobby.tsx]
tags: [vite, hmr, dev-server, stale-cache, 500, false-error, oxc, dev-environment]
discovered_while: GameTable → BriefingRoom migration (lobby rebuild follow-up)
---

## Problem

Mid-way through a multi-edit refactor of `GameTable.tsx`, the browser console showed:

```
Failed to load resource: 500 (Internal Server Error)
  @ http://localhost:5173/src/client/board/GameTable.tsx?t=1780322796080
[vite] Failed to reload /src/client/board/GameTable.tsx. ... syntax errors ...
```

But by the time the error was investigated: `pnpm typecheck` passed, `pnpm build`
(rolldown) succeeded, and the board **rendered the GameTable correctly**. The 500
persisted across full `browser_navigate` reloads — always with the *same frozen*
`?t=1780322796080` token. Map (console) said broken; Earth (build + render) said fine.

## Root Cause

Vite's dev HMR transform (`vite:oxc` plugin) failed on an **intermediate** edit state
(one Edit had added a `<BriefingRoom>` open tag before a later Edit added its close —
a momentary unbalanced JSX). Vite cached that failed transform keyed to the HMR
cache-bust token (`?t=<ms>`). The cache is **dev-only and independent of tsc and the
rolldown prod build**, and it is **not invalidated by a browser reload** — the client
keeps re-requesting the frozen token and keeps getting the cached 500. The page itself
renders from the last *good* in-memory module, so the app looks fine while the console
lies. The Vite server log confirmed the truth: a `[PARSE_ERROR]` at the broken moment,
followed later by a clean `hmr update` with no error — the final file was valid.

## Fix

Restart the Vite dev server (`kill` the process on port 5173, re-run `pnpm dev`). A
fresh dev session starts a new HMR token space and the phantom 500 is gone (verified:
0 console errors after restart). No code change — the file was already correct.

## Key Insight

**A dev-server console 500 that survives reloads with a frozen `?t=<fixed-number>`
token, while `pnpm build` succeeds and the page renders, is a stale HMR transform
cache — not a code defect.** Trust the prod bundler (rolldown) and the rendered output
over the dev HMR console. The authoritative parse check is `pnpm build`, not the dev
overlay. Fix is a Vite restart, never a code edit hunting a bug that isn't there.

## Also Applies To

- Any Vite-HMR'd file edited across multiple sequential tool Edits (each Edit can fire
  an HMR cycle on a transiently-unbalanced file) — common when an agent makes serial
  edits rather than one atomic rewrite.
- Reading the dev server's own stdout (`[vite] Internal server error ... ╰─`) is the
  fastest disambiguator: a *later* clean `hmr update` line means the live file is valid.
- Generalizes the "Briggsy's failure report is Earth, green tests are a map" rule to
  dev tooling: here the console was the misleading map and the prod build was Earth.
