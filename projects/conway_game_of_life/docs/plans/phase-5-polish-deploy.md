---
status: pending
phase: 5
title: Polish & Deploy
description: PWA, fullscreen, video capture, mobile responsive, Vercel deployment
depends_on: [phase-2, phase-3, phase-4]
---

# Phase 5 — Polish & Deploy

## Goal
Production-ready PWA. Fullscreen mode. Video capture with audio. Mobile responsive with touch-friendly UI. Deployed to Vercel.

## Spec Acceptance Criteria
- [ ] PWA installable
- [ ] Fullscreen mode
- [ ] Video capture (MediaRecorder)
- [ ] Vercel deployment
- [ ] Mobile responsive

## Tasks

### 5.1 — Fullscreen mode
- [ ] Create `src/ui/Fullscreen.ts`
- [ ] `toggle()` — uses `document.documentElement.requestFullscreen()` / `exitFullscreen()`
- [ ] Listen for `fullscreenchange` event to update button state
- [ ] Wire to ViewToggles fullscreen button and keyboard shortcut (F)
- [ ] Handle canvas resize on fullscreen enter/exit

### 5.2 — Video capture
- [ ] Create `src/ui/VideoCapture.ts`
- [ ] "Capture This" button in controls bar
- [ ] `start(canvas, audioContext?)`:
  - `canvas.captureStream(60)` for 60fps video
  - If audio enabled: `audioContext.createMediaStreamDestination()` to capture audio
  - Merge streams via `new MediaStream([...videoTracks, ...audioTracks])`
  - `new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 })`
- [ ] Codec detection: `MediaRecorder.isTypeSupported('video/webm;codecs=vp9')`, fallback chain
- [ ] Auto-stop after 60 seconds
- [ ] Recording indicator (red dot + timer) in UI
- [ ] `stop()` — assembles chunks → Blob → download as `.webm`
- [ ] Error handling: show "not supported" message on incompatible browsers

### 5.3 — Mobile responsive
- [ ] Update `src/ui/styles.ts` with responsive rules
- [ ] Mobile layout (<768px):
  - Controls bar: stacks vertically, larger touch targets (min 44px)
  - Pattern selector: fullscreen overlay instead of side panel
  - Brush size buttons: larger
  - Stats: condensed single-line
- [ ] Touch interaction refinement:
  - Verify single-finger draw works smoothly
  - Verify two-finger pan/zoom works without conflicts
  - Add mode toggle button (Draw / Navigate) for clarity on mobile
- [ ] Viewport meta tag prevents unwanted zoom on double-tap
- [ ] Test on simulated mobile viewports

### 5.4 — PWA configuration
- [ ] Install `vite-plugin-pwa` as devDependency
- [ ] Update `vite.config.ts`:
  - Add VitePWA plugin
  - registerType: 'autoUpdate'
  - manifest: name, short_name, description, theme_color (#050508), background_color (#050508), display: standalone
  - icons: generate simple programmatic icons (colored squares at required sizes)
- [ ] Create PWA icons in `public/`:
  - `icon-192.png` (192x192)
  - `icon-512.png` (512x512)
  - Or use SVG icon with `purpose: "any maskable"`
- [ ] Verify service worker registration
- [ ] Verify offline functionality (app loads without network)
- [ ] Verify install prompt appears in Chrome

### 5.5 — Vercel deployment
- [ ] Verify `vercel.json` has SPA rewrite rules (created in Phase 0)
- [ ] `pnpm build` produces clean dist/
- [ ] Test with `pnpm preview` locally
- [ ] Deploy to Vercel (CLI or git push)
- [ ] Verify deployed URL works:
  - Canvas renders
  - Patterns load
  - Audio works (after click)
  - Video capture works
  - PWA install works

### 5.6 — Final acceptance sweep
- [ ] Run through ALL spec acceptance criteria:
  - Phase 0: rules correct, double-buffer, 1000x1000@60fps, wraparound
  - Phase 1: WebGL renders, age colors, death particles, ghost trails, bloom
  - Phase 2: 9 patterns, selector UI, controls, draw mode, zoom/pan
  - Phase 3: drone, birth/death audio, audio toggle
  - Phase 4: PWA, fullscreen, video capture, Vercel, mobile
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` all tests pass
- [ ] No console errors/warnings in browser
- [ ] Performance: 1000x1000 grid holds 60fps in Chrome

## Commits
- `feat: fullscreen mode + video capture`
- `feat: mobile responsive layout + touch refinement`
- `feat: PWA installable with service worker`
- `chore: vercel deployment`
