---
title: Framer Motion VisualElement chunk is initial (modulepreloaded), not lazy
date: 2026-04-05
phase: 1
modules: [src/client/shared/MotionProvider.tsx, src/client/shared/motion-features.ts]
tags: [framer-motion, bundle-size, vite8, LazyMotion, modulepreload, budget]
---

## Problem

CLAUDE.md reported phone initial JS as ~59KB gzipped. The bundle table marked the VisualElement chunk (12.65KB gzip) as "Lazy" alongside motion-features (domMax). Budget decisions were being made against a baseline that was 12.65KB too low.

## Root Cause

Vite 8's Rolldown bundler splits framer-motion into three chunks:
1. **MotionProvider** (58.60KB gzip) — React + ReactDOM + LazyMotion context. Initial.
2. **motion-features** (29.01KB gzip) — domMax feature bundle. Truly lazy (dynamic import).
3. **VisualElement** (12.65KB gzip) — Core animation runtime. **Modulepreloaded**.

The VisualElement chunk is a static dependency of the entry modules (board/player main.tsx import MotionProvider which statically imports LazyMotion internals). Vite emits it as `<link rel="modulepreload">` in the production HTML, meaning it downloads and parses on every page load — it is NOT deferred by the LazyMotion dynamic import.

Only `motion-features` (the `domMax` export) is truly lazy-loaded via the async `import('./motion-features')` in MotionProvider.

## Fix

Corrected CLAUDE.md: VisualElement marked "Initial (shared)", baseline updated from ~59KB to ~71KB gzipped. Budget headroom is 28.5KB, not 41KB.

## Key Insight

**"Lazy" in LazyMotion refers to the feature bundle only, not the entire animation runtime.** Vite's `modulepreload` tags in dist HTML are the source of truth for what's initial vs lazy — not chunk names or the LazyMotion API. After any dependency change, check `dist/*.html` for `<link rel="modulepreload">` to know the real initial load.

## Also Applies To

- Any library using dynamic `import()` for code splitting — the statically-imported pieces of that library still ship as initial chunks
- Future phases adding new dependencies — always verify initial load from the HTML modulepreload tags, not from the Vite build log alone
