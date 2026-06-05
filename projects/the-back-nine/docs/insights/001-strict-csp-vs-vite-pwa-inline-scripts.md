---
title: A strict `script-src 'self'` CSP is silently broken by Vite + vite-plugin-pwa inline scripts and an unresolved workbox-window peer
date: 2026-06-05
phase: P1·U0
modules: [vite.config.ts, vercel.json, index.html]
tags: [csp, vite, pwa, vite-plugin-pwa, modulepreload, workbox, security]
---

## Problem
Shipping a strict CSP (`script-src 'self'`, no `'unsafe-inline'`/`'unsafe-eval'`) with a Vite 8 + vite-plugin-pwa PWA: the prod build emits inline scripts the CSP blocks, AND the build fails to resolve `workbox-window`.

## Root Cause
- Vite injects an **inline** modulepreload-polyfill `<script>` by default — blocked by `script-src 'self'`. This breaks the app on Vercel, not just locally.
- vite-plugin-pwa's default `injectRegister:'auto'` injects an **inline** SW-registration `<script>` — also blocked.
- `workbox-window` is a peer the `virtual:pwa-register/react` module imports, but it resolves from the **project root**; pnpm's nested peer install isn't reachable there → Rolldown "failed to resolve workbox-window".

## Fix
- `build.modulePreload: { polyfill: false }` (native modulepreload is universal on modern targets).
- `injectRegister: false` + register via the `useRegisterSW` hook (no inline script).
- Add `workbox-window` as a direct devDependency.
- Pin `vite-plugin-pwa@^1.3.0` — 1.2.0's peer range topped at Vite 7; 1.3.0 added `^8.0.0`.

## Key Insight
A strict CSP is a **build-output** contract, not just a header. Before trusting `script-src 'self'`, grep the BUILT `dist/index.html` for any inline `<script>` — toolchains inject them silently, and the failure only shows when the header is actually applied. `vite preview` does NOT apply `vercel.json` headers, so serve `dist/` through a header-applying harness to test enforcement.

## Also Applies To
Any bundler PWA with a strict CSP (Next.js, SvelteKit); any `virtual:`-module plugin whose runtime import resolves from the project root.
