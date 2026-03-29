---
status: completed
phase: 5
title: Polish & Deploy
description: Video capture (30fps/3Mbps), fullscreen, mobile responsive (500x500 default), PWA, Vercel deployment
depends_on: [phase-4]
deepened: 2026-03-28
---

# Phase 5 — Polish & Deploy

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** 6 (video capture researcher, architecture strategist, performance oracle, code simplicity reviewer, security sentinel, Vercel researcher)

### Critical Fixes Discovered

1. **preserveDrawingBuffer required for captureStream** — WebGL2 clears the drawing buffer after compositing. Without `preserveDrawingBuffer: true`, captureStream gets black frames. Phase 2 amendment required. Cost is negligible on modern GPUs.
2. **VideoCapture.start() signature leaks AudioContext** — Plan said `start(canvas, audioContext?)`. Fix: `start(canvas: HTMLCanvasElement, audioStream?: MediaStream)`. AudioSystem exposes `getCaptureStream()`/`releaseCaptureStream()`.
3. **Audio capture branch point bypasses safety limiter** — Phase 4 note said branch at master gain. Fix: branch AFTER DynamicsCompressorNode. Both speakers and recording get identical, loudness-limited audio.
4. **captureStream(60) wastes GPU for zero visual gain** — Cellular automata at 30fps vs 60fps are indistinguishable in recordings. Fix: `captureStream(30)`. Halves GPU overhead.
5. **Codec priority backwards** — VP9 is the heaviest encoder (1-3 CPU cores). Fix: VP8 first (lightest), H.264 for Safari, VP9 last.
6. **5 Mbps bitrate produces 37.5 MB files** — Conway's content (mostly black) compresses extremely well. Fix: 3 Mbps. 60s recording = ~11 MB, no visible quality difference.
7. **vercel.json missing 3 PWA header blocks** — sw.js no-cache, HTML no-cache, manifest MIME type. Required by vite-plugin-pwa.

### Key Improvements

1. Fullscreen.ts eliminated — ~10 lines inlined in UIManager (Phase 3 already has all hooks)
2. Mobile mode toggle cut from v1 — 1-finger=draw, 2-finger=pan is universal convention
3. Recording timer killed — red pulsing dot + "REC" only (no elapsed time tracking)
4. SVG icon instead of PNG pair — single file, 1-2KB, scales to any size
5. Mobile default grid 500x500 — budget mobile CPUs can't maintain 60fps at 1000x1000
6. MediaRecorder dual safety: independent setTimeout + 50MB chunk-size guard
7. CSP meta tag defense-in-depth in index.html
8. Permissions-Policy hardened with display-capture, document-domain, fullscreen
9. Codec-aware file extension (.webm vs .mp4)
10. Fullscreen disabled during recording (prevents encoder issues)

---

## Goal

Production-ready PWA. Video capture at 30fps/3Mbps with codec-aware download. Fullscreen mode. Mobile responsive with 500x500 default grid and 44px touch targets. Deployed to Vercel with hardened security headers and PWA caching. Final acceptance sweep across all phases.

## Spec Acceptance Criteria

- [x] PWA installable
- [x] Fullscreen mode
- [x] Video capture (MediaRecorder)
- [x] Vercel deployment
- [x] Mobile responsive

## Pre-Phase 5: Cross-Phase Amendments

### Phase 0 Amendments

- [x] Add 3 PWA header blocks to `vercel.json`:
  - `/(.*).html` → `Cache-Control: public, max-age=0, must-revalidate`
  - `/sw.js` → `Cache-Control: public, max-age=0, must-revalidate`
  - `/manifest.webmanifest` → `Content-Type: application/manifest+json`
- [x] Add CSP `<meta>` tag to `index.html` `<head>` (defense-in-depth — protects when cached by service worker)
- [x] Harden `Permissions-Policy` in `vercel.json`:
  ```
  camera=(), microphone=(), geolocation=(), payment=(), display-capture=(), document-domain=(), fullscreen=(self)
  ```

### Phase 2 Amendments

- [x] Set `preserveDrawingBuffer: true` on WebGL2 context creation
  - Required for `captureStream()` — without it, WebGL clears the buffer after compositing and capture gets black frames
  - Performance cost: negligible on modern GPUs (prevents buffer recycling optimization)
  - This is a set-once context attribute — cannot be toggled dynamically

### Phase 4 Amendments

- [x] Add `getCaptureStream(): MediaStream | null` to AudioSystem:
  - Lazily creates `MediaStreamDestinationNode`
  - Connects **after DynamicsCompressorNode** (not master gain — recording must include safety limiting)
  - Returns `.stream`. Returns `null` if `!isAvailable()`. Idempotent.
- [x] Add `releaseCaptureStream(): void` to AudioSystem:
  - Disconnects MediaStreamDestinationNode from compressor
  - Nulls reference for GC
  - Called when recording stops
- [x] Fix integration note in task 4.4: "branch after compressor, not after master gain"

---

## Tasks

### 5.1 — Video capture

- [x] Create `src/ui/VideoCapture.ts`
- [x] Implements `Disposable`
- [x] **Static check:** `static isSupported(): boolean` — `typeof MediaRecorder !== 'undefined'`. Hide "Capture" button entirely if unsupported.
- [x] **`start(canvas: HTMLCanvasElement, audioStream?: MediaStream)`:**
  - `canvas.captureStream(30)` — **30fps, not 60** (cellular automata indistinguishable, halves GPU overhead)
  - If audioStream provided: merge via `new MediaStream([...videoTracks, ...audioTracks])`
  - Detect codec:
    ```
    1. video/webm;codecs=vp8,opus    — lightest CPU, universal WebM
    2. video/mp4;codecs=avc1.42E01E  — H.264 for Safari (often HW-accelerated)
    3. video/webm;codecs=vp9,opus    — best compression, heaviest CPU
    4. video/webm                     — bare fallback
    ```
  - `new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 })` — **3 Mbps** (Conway's mostly-black content compresses well; 60s = ~11 MB)
  - `recorder.start()` — NO timeslice (prevents seekable file issues)
- [x] **Blob assembly:**
  - `chunks: Blob[]` accumulates via `ondataavailable`
  - Guard: `if (e.data.size > 0) chunks.push(e.data)`
- [x] **Dual safety mechanisms:**
  - `setTimeout(stop, 60_000)` — independent of UI state, fires unconditionally
  - Cumulative chunk-size counter: force `stop()` if total bytes exceed 50 MB
- [x] **`stop()` → download:**
  - `recorder.stop()` triggers `onstop`
  - Assemble: `new Blob(chunks, { type: recorder.mimeType })`
  - Codec-aware filename: `conway-{ISO-timestamp}.{webm|mp4}`
  - Download:
    ```typescript
    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    chunks.length = 0  // release blob references
    ```
- [x] **Recording indicator:**
  - Red pulsing dot (CSS `animation: pulse 1s infinite`) + "REC" text
  - Show/hide in ControlsBar area — replaces "Capture" button text while recording
  - NO elapsed timer (YAGNI — auto-stop handles timeout, user sees the dot)
- [x] **Disable fullscreen toggle during recording** (canvas resize mid-capture causes encoder issues cross-browser)
- [x] **Error handling:**
  - `MediaRecorder.onerror` → stop recording, show brief error message
  - Graceful "not supported" for browsers without MediaRecorder
- [x] `isRecording(): boolean` state query
- [x] `dispose()` — stop if recording, clear chunks, revoke URLs

#### Research Insights

**Why 30fps not 60fps:** Each captured frame triggers a GPU texture copy. At 60fps on integrated GPUs, this adds 0.5-1.0ms per frame. Conway's patterns — cells on a grid with soft bloom — are visually identical at 30fps in recorded video. The simulation still runs at 60fps live; we just sample the visual output less frequently.

**Why VP8 before VP9:** VP9 consumes 1-3 CPU cores for encoding. On a dual-core ultrabook, this steals resources from the simulation step (3-5ms → 4-7ms). VP8 is ~1 core and produces adequate quality for 2D canvas content. VP9 is only worth it for complex photographic content.

**Why 3 Mbps:** Conway's visual content is overwhelmingly black background with small colored cells. This compresses extremely well. At 3 Mbps/30fps, 60s = ~11 MB. At 5 Mbps/60fps, 60s = 37.5 MB. No visible quality difference.

**Blob URL memory:** Each `createObjectURL()` pins the Blob in memory. A user recording 5-10 clips without refreshing would accumulate 50-100 MB without `revokeObjectURL()`. The 1s delay ensures the browser initiates the download before revocation.

### 5.2 — Fullscreen wiring (NO new file — inline in UIManager)

- [x] Add fullscreen wiring to UIManager (Phase 3 integration section):
  - `controlsBar.onToggleFullscreen()` → toggle fullscreen
  - Check `document.fullscreenElement` to determine current state
  - `document.documentElement.requestFullscreen()` (includes UI overlays, not just canvas)
  - `document.exitFullscreen()` to leave
  - Safari fallback: `document.documentElement.webkitRequestFullscreen?.()`
  - `fullscreenchange` event listener → sync ControlsBar button visual state
- [x] **Hide fullscreen button on iPhone** — Fullscreen API only works on iPad
  - Detect: `navigator.userAgent` check for iPhone (or `navigator.standalone` + screen size heuristic)
- [x] Canvas resize handled automatically by Phase 0's `ResizeObserver`
- [x] Keyboard shortcut `F` already wired in Phase 3's InputHandler (placeholder activated here)

#### Research Insight

**Why no Fullscreen.ts file:** The Fullscreen API is ~10 lines of wiring: check state, call requestFullscreen/exitFullscreen, listen for change event. Phase 3 already provides every hook (ControlsBar button, InputHandler keyboard shortcut, ResizeObserver). Creating a class+file for 10 lines of glue violates the project's pattern where UIManager IS the wiring layer.

### 5.3 — Mobile responsive

- [x] Update `src/ui/styles.ts` with responsive additions:
  - Mobile layout (<768px): `min-height: 44px` on all interactive elements (touch target standard)
  - Controls bar: stacks vertically on mobile, condensed single-line stats
  - Pattern selector overlay already works on all sizes (Phase 3 decision)
- [x] **Default grid size by device:**
  - Desktop: 1000x1000
  - Mobile (`isMobile()` from styles.ts): 500x500
  - Set in `main.ts` at initialization based on `isMobile()`
- [x] **Viewport meta tag** in `index.html`:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  ```
  - `user-scalable=no` + `maximum-scale=1` prevents browser zoom (canvas handles zoom internally)
- [x] **NO mobile mode toggle button in v1:**
  - 1-finger = draw, 2-finger = pan/zoom is the universal convention (Procreate, Figma, Google Maps)
  - The `InputMode` type and plumbing from Phase 3 exists if needed later
  - Add toggle only if real user testing reveals confusion
- [x] Test on simulated mobile viewports (Chrome DevTools device mode)

#### Research Insight

**Why 500x500 on mobile:** A 1000x1000 grid step takes 3-5ms on desktop CPU but 8-15ms on a budget mobile CPU (Snapdragon 695). That's dangerously close to or exceeding the 16.67ms frame budget before rendering. At a mobile viewport (390x844), the user sees far fewer cells anyway — 500x500 is visually identical at mobile zoom levels while cutting simulation time by 75%.

### 5.4 — PWA configuration

- [x] `pnpm add -D vite-plugin-pwa`
- [x] **Immediately run `pnpm audit`** — verify no known vulnerabilities in dependency tree
- [x] Update `vite.config.ts`:
  ```typescript
  import { VitePWA } from 'vite-plugin-pwa'

  export default defineConfig({
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: "Conway's Game of Life",
          short_name: 'Conway',
          description: 'Cinematic cellular automata',
          theme_color: '#050508',
          background_color: '#050508',
          display: 'standalone',
          icons: [{
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          }],
        },
      }),
    ],
  })
  ```
- [x] Create `public/icon.svg` — simple cell glow graphic on void black background (~1-2KB)
- [x] Verify: service worker registers (`navigator.serviceWorker.controller !== null`)
- [x] Verify: app loads after going offline (Vite's static output is self-contained)
- [x] Verify: Chrome install prompt appears
- [x] Do NOT add custom service worker logic, update prompts, or cache strategies beyond plugin defaults

#### Research Insights

**Why `registerType: 'autoUpdate'`:** Auto-updating the service worker (skipWaiting + clientsClaim) means security patches propagate on next app open without waiting for user to close all tabs. For an app with no critical user data, this is the right tradeoff. The `'prompt'` alternative adds friction that delays updates.

**Why single SVG icon:** A single SVG scales to any size (192, 512, or whatever the OS needs). It's 1-2KB vs 10-20KB for a PNG pair. Modern browsers and Android/iOS all support SVG PWA icons. `purpose: "any maskable"` means it works as both a regular and maskable icon.

**vite-plugin-pwa + COEP:** The generated service worker precaches local assets only. Since all resources are same-origin, `Cross-Origin-Embedder-Policy: require-corp` does not interfere. The Workbox runtime lives entirely within the service worker scope (~5-10KB), never loaded on the main thread.

### 5.5 — Vercel deployment

- [x] Update `vercel.json` with consolidated configuration:
  - 3 new PWA header blocks (from vite-plugin-pwa docs):
    - `/(.*).html` → no-cache
    - `/sw.js` → no-cache
    - `/manifest.webmanifest` → correct Content-Type
  - Hardened Permissions-Policy (add `display-capture=()`, `document-domain=()`, `fullscreen=(self)`)
  - CSP updated to include `blob:` in `media-src` (for video capture download)
  - All existing security headers from Phase 0 unchanged
- [x] `pnpm build` produces clean `dist/`
- [x] Test with `pnpm preview` locally
- [x] Deploy to Vercel (git push or `vercel --prod`)
- [x] Verify deployed URL works:
  - Canvas renders at 60fps
  - All 9 patterns load with title cards
  - Audio works after first click
  - Video capture records + downloads
  - PWA install prompt appears
  - All security headers present (check via browser DevTools Network tab)

#### Research Insights

**Vercel auto-detects Vite.** Build command, output directory, and install command are auto-configured. Override with `"buildCommand": "pnpm build"` in vercel.json to ensure typecheck runs before build.

**Vercel compresses automatically.** Gzip and Brotli (14% smaller JS than Gzip) are negotiated automatically. No config needed.

**Vercel applies vercel.json headers to ALL deployments** — production AND preview. No special handling needed.

**Vercel Analytics and COEP:** If enabling Vercel Analytics, its script is proxied through `/_vercel/insights/script.js` (same origin), satisfying COEP. However, CSP `script-src 'self'` would need `https://va.vercel-scripts.com` added. Since this project doesn't use Vercel Analytics, no action needed.

### 5.6 — Pre-deploy verification checklist

Not a code task — this is the gate before deployment.

- [x] **All spec acceptance criteria passed:**
  - Phase 0 (Scaffolding): project builds, dev server runs, WebGL2 canvas renders
  - Phase 1 (Engine): rules correct, double-buffer, 1000x1000 @ 60fps, wraparound
  - Phase 2 (Renderer): WebGL renders cells, age colors, death particles, ghost trails, bloom
  - Phase 3 (Patterns & UI): 9 patterns load, selector UI, controls, draw mode, zoom/pan
  - Phase 4 (Audio): drone, birth chimes, extinction sound, audio toggle, stability pulse
  - Phase 5 (Polish & Deploy): PWA, fullscreen, video capture, Vercel, mobile responsive
- [x] `pnpm typecheck` passes
- [x] `pnpm test` all tests pass
- [x] No console errors/warnings in browser
- [x] Performance: 1000x1000 @ 60fps desktop Chrome, 500x500 @ 60fps mobile Chrome
- [x] Security headers verified via DevTools Network tab on deployed URL

## Commits

- `feat: video capture with MediaRecorder (VP8/H.264, 30fps, 3Mbps)`
- `feat: fullscreen + mobile responsive (500x500 default) + PWA`
- `chore: vercel deployment + security hardening`

---

## Module Dependency Graph (Phase 5 additions)

```
src/ui/VideoCapture.ts    ← imports Disposable from types/common (NEW)
       ↓
src/ui/UIManager.ts       ← creates VideoCapture, wires to ControlsBar + AudioSystem + Renderer
       ↓
src/main.ts               ← passes canvas + audioSystem to UIManager for video capture wiring
```

VideoCapture receives dependencies via injection:
- `HTMLCanvasElement` from Renderer.getCanvas()
- `MediaStream` from AudioSystem.getCaptureStream()
- Never imports from `src/renderer/` or `src/audio/` directly

---

## File Count

| Category | Files | Notes |
|----------|-------|-------|
| New source | 1 | VideoCapture.ts |
| New tests | 1 | VideoCapture.test.ts |
| New assets | 1 | public/icon.svg |
| Modified source | 3 | UIManager.ts, ControlsBar.ts, styles.ts |
| Modified config | 4 | vite.config.ts, vercel.json, index.html, package.json |
| **Total new** | **3** | Leanest phase in the project |

---

## Recording File Size Estimates

| Duration | 3 Mbps / 30fps | Notes |
|----------|----------------|-------|
| 10 seconds | ~1.9 MB | Quick capture |
| 30 seconds | ~5.6 MB | Good for sharing |
| 60 seconds (max) | ~11.3 MB | Auto-stop limit |

---

## Landmines

- `preserveDrawingBuffer: true` prevents GPU buffer recycling — negligible cost on modern GPUs but measurable on older integrated GPUs
- MediaRecorder codec output varies: VP8/VP9 → .webm, H.264 → .mp4. Filename extension MUST match.
- `captureStream()` is NOT available on `OffscreenCanvas` — if future optimization moves rendering to OffscreenCanvas, video capture breaks
- iOS Safari `captureStream` video tracks may contain invalid data on some versions — show error gracefully
- Safari pre-18.4 only supports MP4/H.264 in MediaRecorder, not WebM
- If Vercel Analytics is ever enabled, CSP needs `https://va.vercel-scripts.com` added to `script-src`
- Service worker can mask real build errors with misleading vite-plugin-pwa messages — check full build log
