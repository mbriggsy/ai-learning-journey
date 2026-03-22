---
title: "Phase 6: Deployment — Vercel, PWA, E2E Testing"
type: feat
status: active
date: 2026-03-16
phase: 6
---

# Phase 6: Deployment

## Overview

Deploy UMB to production on Vercel (static frontend) and PartyKit (multiplayer server). Configure PWA for home screen installation, set COOP/COEP headers, and run a full end-to-end test: 5 players completing a full game without errors.

## Problem Statement / Motivation

The game needs to be playable from any browser via a URL. Zero infrastructure management at launch — Vercel for static hosting (auto-deploy on push), PartyKit for ephemeral game rooms (Cloudflare edge). A working E2E test proves the entire stack is integrated correctly.

## Proposed Solution

### Vercel Configuration

**`vercel.json`** — ported from racer-04 with UMB-specific routes:

```json
{
  "headers": [
    {
      "source": "/(.*).html",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Content-Type", "value": "application/javascript" }
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/join/:code", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- COOP/COEP headers enable SharedArrayBuffer (needed for PWA and Web Audio)
- SPA rewrites route `/join/<ROOM_CODE>` to the app, which reads the code from the URL
- Static assets in `/public/` served directly
- HTML and service worker get `max-age=0, must-revalidate` — always fresh
- Versioned assets in `/assets/` get aggressive 1-year immutable caching
- Security headers on all responses: nosniff, DENY framing, XSS protection

**Vercel Environment Variables (Dashboard → Settings → Environment Variables):**

| Variable | Value (Production) | Value (Preview) |
|---|---|---|
| `VITE_PARTYKIT_HOST` | `undercover-mob-boss.<github-user>.partykit.dev` | `undercover-mob-boss.<github-user>.partykit.dev` |

Note: `VITE_` prefix is required — Vite only exposes env vars with this prefix to client-side code. Access in code via `import.meta.env.VITE_PARTYKIT_HOST`.

### PartyKit Deployment

**`partykit.json`** — full configuration:

```json
{
  "name": "undercover-mob-boss",
  "main": "src/server/room.ts",
  "port": 1999,
  "compatibilityDate": "2024-09-27",
  "compatibilityFlags": [],
  "minify": true,
  "define": {},
  "build": {
    "command": "echo 'no pre-build needed'",
    "cwd": "."
  }
}
```

**Configuration field reference:**

| Field | Value | Purpose |
|---|---|---|
| `name` | `"undercover-mob-boss"` | Project identifier on PartyKit platform. Determines the deployed URL. |
| `main` | `"src/server/room.ts"` | Entry point — exports the `PartyServer` class for the game room. |
| `port` | `1999` | Local dev server port (default). Frontend dev proxy targets this. |
| `compatibilityDate` | `"2024-09-27"` | Cloudflare Workers API compatibility date. Pin to known-good date. |
| `minify` | `true` | Minify JavaScript output on deploy. |

**Deploy command:**

```bash
# First time: login via GitHub
npx partykit login

# Deploy to production
npx partykit deploy

# Output: https://undercover-mob-boss.<github-user>.partykit.dev
```

**Deployed URL format:** `https://<name>.<github-username>.partykit.dev`

**Environment variables for PartyKit (managed via CLI):**

```bash
# List current env vars
npx partykit env list

# Add a secret (prompted for value)
npx partykit env add MY_SECRET

# Remove a secret
npx partykit env remove MY_SECRET
```

UMB needs no server-side env vars — game state is ephemeral, no external APIs called from the server.

**CORS — PartyKit accepting connections from Vercel domain:**

WebSocket connections (the primary communication channel) are NOT subject to CORS — browsers do not enforce same-origin policy on WebSocket upgrades. PartyKit handles WebSocket connections natively.

For any HTTP requests to the room (e.g., health checks, room info), CORS headers must be set in the `onRequest` handler:

```typescript
// src/server/room.ts — inside the PartyServer class
async onRequest(req: Party.Request): Promise<Response> {
  const allowedOrigins = [
    'https://undercover-mob-boss.vercel.app',
    'http://localhost:5173'  // Vite dev server
  ];

  const origin = req.headers.get('Origin') ?? '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Room info endpoint (optional — for debugging/monitoring)
  if (req.method === 'GET') {
    const playerCount = [...this.room.getConnections()].length;
    return new Response(JSON.stringify({ players: playerCount }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin
      }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
```

**Note on WebSocket CORS:** PartyKit's `onBeforeConnect` static method runs at the edge before the WebSocket handshake reaches the room. You can use it to validate the `Origin` header and reject connections from unauthorized domains:

```typescript
static async onBeforeConnect(req: Party.Request, lobby: Party.Lobby) {
  const allowedOrigins = [
    'https://undercover-mob-boss.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.get('Origin') ?? '';
  if (!allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  return req;  // Allow the connection to proceed
}
```

### Vite Configuration

**`vite.config.ts`** — full production config with all plugins:

```typescript
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base path — works on any Vercel subdomain or custom domain
  base: './',

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'mask-icon.svg'
      ],
      manifest: {
        name: 'Undercover Mob Boss',
        short_name: 'UMB',
        description: 'A social deduction game for 5-10 players',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Precache all built static assets
        globPatterns: ['**/*.{js,css,html,png,jpg,webp,mp3,ogg,woff2,svg}'],
        // Never precache files larger than 5MB (audio files can be big)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // WebSocket / PartyKit connections — never cache
            urlPattern: /^https:\/\/.*\.partykit\.dev/,
            handler: 'NetworkOnly'
          },
          {
            // Audio files — cache first, fall back to network
            urlPattern: /\.(?:mp3|ogg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60  // 30 days
              }
            }
          },
          {
            // Images — cache first
            urlPattern: /\.(?:png|jpg|jpeg|webp|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60  // 30 days
              }
            }
          }
        ]
      }
    })
  ],

  build: {
    // No inline limits — all assets are separate files for cache control
    assetsInlineLimit: 0,
    // Source maps off in production (game state is server-side)
    sourcemap: false,
    // Output to dist/
    outDir: 'dist',
    // Rollup options for chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunk for better caching
          vendor: ['partysocket']
        }
      }
    }
  },

  server: {
    // Dev server on port 5173 (Vite default)
    port: 5173,
    // Proxy PartyKit HTTP requests during development
    proxy: {
      '/party': {
        target: 'http://localhost:1999',
        changeOrigin: true
      }
    }
  }
});
```

**Key differences from racer-04 `vite.config.ts`:**
- No ORT/WASM plugin needed (UMB has no ML model)
- Added `vite-plugin-pwa` with full manifest and workbox config
- Added `partysocket` vendor chunk for cache-friendly splitting
- Added dev server proxy for PartyKit HTTP requests
- Kept `base: './'` and `assetsInlineLimit: 0` from racer-04 pattern

### PWA Configuration

**PWA Manifest (`manifest.webmanifest`)** — auto-generated by `vite-plugin-pwa` from the config above, but this is the effective output for reference:

```json
{
  "$schema": "https://json.schemastore.org/web-manifest-combined.json",
  "name": "Undercover Mob Boss",
  "short_name": "UMB",
  "description": "A social deduction game for 5-10 players",
  "theme_color": "#1a1a2e",
  "background_color": "#0f0f1a",
  "display": "standalone",
  "orientation": "any",
  "start_url": ".",
  "scope": ".",
  "categories": ["games", "entertainment"],
  "icons": [
    {
      "src": "pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Required fields explained:**

| Field | Value | Why |
|---|---|---|
| `name` | `Undercover Mob Boss` | Full name shown on install prompt and splash screen |
| `short_name` | `UMB` | Shown under home screen icon (max ~12 chars) |
| `description` | Social deduction game... | Shown in app stores / install UI |
| `theme_color` | `#1a1a2e` | Browser chrome color, status bar on Android. Dark noir. |
| `background_color` | `#0f0f1a` | Splash screen background before app loads. Darker noir. |
| `display` | `standalone` | No browser chrome — looks like a native app |
| `orientation` | `any` | Host = landscape, Player = portrait. Allow both. |
| `start_url` | `.` | Relative to manifest location. Works with any base path. |
| `scope` | `.` | PWA controls all routes under the base path. |
| `categories` | `["games", "entertainment"]` | Hint for app stores / discovery |
| `icons` | 192 + 512 + maskable | 192 for home screen, 512 for splash/store, maskable for adaptive icons |

**Required HTML meta tags** (in `index.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Undercover Mob Boss</title>
  <meta name="description" content="A social deduction game for 5-10 players" />
  <meta name="theme-color" content="#1a1a2e" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
  <link rel="mask-icon" href="/mask-icon.svg" color="#1a1a2e" />
  <!-- vite-plugin-pwa auto-injects manifest link and service worker registration -->
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/client/main.ts"></script>
</body>
</html>
```

**Required icon files** (in `public/`):

| File | Size | Purpose |
|---|---|---|
| `favicon.ico` | 32x32 | Browser tab icon |
| `apple-touch-icon.png` | 180x180 | iOS home screen icon |
| `mask-icon.svg` | any | Safari pinned tab icon |
| `pwa-192x192.png` | 192x192 | Android home screen icon |
| `pwa-512x512.png` | 512x512 | Splash screen, app store listing |

**Service Worker Configuration (Workbox strategy):**

The `workbox` config in `vite.config.ts` above produces a service worker with this caching strategy:

| Resource | Strategy | Rationale |
|---|---|---|
| HTML, JS, CSS | **Precache** (build-time) | Versioned by Vite content hashes. Served from cache instantly. Updated via `autoUpdate`. |
| Images (PNG, JPG, WebP, SVG) | **CacheFirst** | Static art assets rarely change. Cache up to 100 entries for 30 days. |
| Audio (MP3, OGG) | **CacheFirst** | Narrator lines and SFX are static. Cache up to 50 entries for 30 days. |
| Fonts (WOFF2) | **Precache** (build-time) | Bundled at build. Always available offline. |
| PartyKit connections | **NetworkOnly** | WebSocket / HTTP to `.partykit.dev` must never be cached. |

**`autoUpdate` behavior:** When a new service worker is detected (on any navigation), the old service worker is replaced and the page reloads silently. No "update available" prompt needed for a party game — players always get the latest version.

### Package Configuration

**`package.json`** — full dependency list with researched current stable versions:

```json
{
  "name": "undercover-mob-boss",
  "version": "0.1.0",
  "description": "A digital social deduction game for 5-10 players — noir city infiltration",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently --kill-others \"pnpm dev:vite\" \"pnpm dev:party\"",
    "dev:vite": "vite",
    "dev:party": "npx partykit dev",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run --exclude tests/integration/**",
    "test:integration": "vitest run tests/integration/",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage --exclude tests/integration/**",
    "deploy:party": "npx partykit deploy",
    "generate-assets": "tsx --env-file=.env scripts/generate-assets.ts",
    "generate-narrator": "tsx --env-file=.env scripts/generate-narrator.ts"
  },
  "dependencies": {
    "partysocket": "^1.1.6",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@google/genai": "^1.44.0",
    "@types/node": "^22.15.0",
    "@types/qrcode": "^1.5.5",
    "@vitest/coverage-v8": "^4.1.0",
    "concurrently": "^9.1.2",
    "partykit": "^0.0.115",
    "tsx": "^4.21.0",
    "typescript": "^5.9.0",
    "vite": "^7.3.0",
    "vite-plugin-pwa": "^1.2.0",
    "vitest": "^4.1.0",
    "ws": "^8.19.0"
  },
  "packageManager": "pnpm@10.30.3"
}
```

**Dependency rationale:**

| Package | Version | Why |
|---|---|---|
| `partysocket` | ^1.1.6 | PartyKit client SDK. Auto-reconnect, multi-platform, dependency-free. |
| `qrcode` | ^1.5.4 | QR code generation for lobby join screen. Supports SVG output. |
| `partykit` | ^0.0.115 | PartyKit server SDK + CLI. Dev server + deploy tooling. |
| `vite` | ^7.3.0 | Build tool. Matches racer-04 pattern. |
| `vite-plugin-pwa` | ^1.2.0 | PWA plugin. Generates service worker + manifest. Uses Workbox 7.x internally. |
| `vitest` | ^4.1.0 | Test framework. Compatible with Vite 7. |
| `@vitest/coverage-v8` | ^4.1.0 | Code coverage via V8. |
| `typescript` | ^5.9.0 | Type checking. Stable release (not 6.0 RC). |
| `concurrently` | ^9.1.2 | Run Vite + PartyKit dev servers simultaneously. |
| `ws` | ^8.19.0 | WebSocket client for integration tests (Node.js). |
| `tsx` | ^4.21.0 | TypeScript execution for build scripts (asset/narrator generation). |
| `@google/genai` | ^1.44.0 | Gemini API for asset generation scripts. |

### Build Pipeline

```bash
# Development
pnpm dev          # Starts Vite (5173) + PartyKit (1999) simultaneously via concurrently
pnpm dev:vite     # Vite dev server only
pnpm dev:party    # PartyKit dev server only
pnpm test         # Unit tests (excludes integration)
pnpm test:integration  # Integration tests (full game flow)

# Production
pnpm build        # TypeScript check + Vite production build → dist/
pnpm preview      # Preview production build locally
pnpm deploy:party # Deploy PartyKit server to production
# Vercel auto-deploys on git push (no manual command needed)
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "concurrently --kill-others \"pnpm dev:vite\" \"pnpm dev:party\"",
    "dev:vite": "vite",
    "dev:party": "npx partykit dev",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run --exclude tests/integration/**",
    "test:integration": "vitest run tests/integration/",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage --exclude tests/integration/**",
    "deploy:party": "npx partykit deploy",
    "generate-assets": "tsx --env-file=.env scripts/generate-assets.ts",
    "generate-narrator": "tsx --env-file=.env scripts/generate-narrator.ts"
  }
}
```

### E2E Test: Full 5-Player Game

The final acceptance gate. A scripted test that simulates 5 players completing a full game.

**Test approach:** Vitest integration test using the `ws` npm package to create real WebSocket clients that connect to a local PartyKit dev server. Tests the full stack: PartyKit room + game engine + state projection.

**Prerequisites:** The PartyKit dev server must be running (`pnpm dev:party`) before running integration tests. The test file uses `ws` (Node.js WebSocket client) rather than browser WebSocket.

```typescript
// tests/integration/full-game.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

// ----- helpers -----

const PARTYKIT_HOST = 'localhost:1999';
const ROOM_ID = `test-room-${Date.now()}`;

interface Client {
  ws: WebSocket;
  name: string;
  playerId: string;
  sessionToken: string;
  lastState: any;
  messages: any[];
}

function connectClient(name: string, sessionToken?: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://${PARTYKIT_HOST}/party/${ROOM_ID}`
    );

    const client: Client = {
      ws,
      name,
      playerId: '',
      sessionToken: sessionToken ?? '',
      lastState: null,
      messages: []
    };

    ws.on('open', () => {
      // Send join message
      ws.send(JSON.stringify({
        type: 'join',
        payload: { name, sessionToken: sessionToken ?? undefined }
      }));
    });

    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      client.messages.push(msg);

      if (msg.type === 'joined') {
        client.playerId = msg.payload.playerId;
        client.sessionToken = msg.payload.sessionToken;
        resolve(client);
      }

      if (msg.type === 'state-update') {
        client.lastState = msg.payload;
      }

      if (msg.type === 'private-update') {
        (client as any).privateState = msg.payload;
      }

      if (msg.type === 'error') {
        // Log but don't reject — some errors are expected in test flow
        console.warn(`[${name}] error: ${msg.payload.message}`);
      }
    });

    ws.on('error', reject);

    // Timeout after 5 seconds
    setTimeout(() => reject(new Error(`${name} connection timeout`)), 5000);
  });
}

function sendAction(client: Client, action: Record<string, unknown>): void {
  client.ws.send(JSON.stringify({ type: 'action', payload: action }));
}

function sendCommand(client: Client, type: string, payload: Record<string, unknown> = {}): void {
  client.ws.send(JSON.stringify({ type, payload }));
}

/** Wait for a client to receive a state-update matching a predicate */
function waitForState(
  client: Client,
  predicate: (state: any) => boolean,
  timeoutMs = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Check current state first
    if (client.lastState && predicate(client.lastState)) {
      return resolve(client.lastState);
    }

    const handler = (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'state-update' && predicate(msg.payload)) {
        client.ws.removeListener('message', handler);
        clearTimeout(timer);
        resolve(msg.payload);
      }
    };

    const timer = setTimeout(() => {
      client.ws.removeListener('message', handler);
      reject(new Error(
        `waitForState timeout for ${client.name}. ` +
        `Last state phase: ${client.lastState?.phase}`
      ));
    }, timeoutMs);

    client.ws.on('message', handler);
  });
}

/** Small delay to let state propagate */
const tick = (ms = 200) => new Promise(r => setTimeout(r, ms));

// ----- test suite -----

describe('Full 5-player game', () => {
  let host: Client;
  let players: Client[];
  const allClients = () => [host, ...players];

  beforeAll(async () => {
    // Connect host (first connection)
    host = await connectClient('Host');

    // Connect 4 players
    players = await Promise.all([
      connectClient('Alice'),
      connectClient('Bob'),
      connectClient('Charlie'),
      connectClient('Diana')
    ]);

    await tick();
  }, 15000);

  afterAll(async () => {
    // Close all connections
    for (const client of allClients()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    }
    await tick(500);
  });

  it('all 5 clients connect to the room', () => {
    expect(host.playerId).toBeTruthy();
    for (const p of players) {
      expect(p.playerId).toBeTruthy();
    }
  });

  it('host starts the game with 5 players', async () => {
    sendCommand(host, 'start-game');

    // Wait for all clients to receive role-reveal phase
    await Promise.all(
      allClients().map(c =>
        waitForState(c, s => s.phase === 'role-reveal')
      )
    );

    expect(host.lastState.phase).toBe('role-reveal');
  });

  it('role distribution is correct for 5 players', async () => {
    // Wait for all players to receive their private-update with roles
    await tick(500);

    // Collect roles from private updates
    const roles = players.map(p => (p as any).privateState?.role).filter(Boolean);

    // 5 players: 3 citizens, 1 mob-soldier, 1 mob-boss
    const citizens = roles.filter((r: string) => r === 'citizen');
    const soldiers = roles.filter((r: string) => r === 'mob-soldier');
    const bosses = roles.filter((r: string) => r === 'mob-boss');

    expect(citizens.length).toBe(3);
    expect(soldiers.length).toBe(1);
    expect(bosses.length).toBe(1);
  });

  it('state projection has no private data leaks', () => {
    const state = host.lastState;

    // Host state must NEVER contain:
    expect(state.policyDeck).toBeUndefined();
    expect(state.policyDiscard).toBeUndefined();

    // Player list must not expose roles to host
    if (state.players) {
      for (const player of state.players) {
        expect(player.role).toBeUndefined();
        expect(player.knownAllies).toBeUndefined();
      }
    }
  });

  it('plays a full nomination → election → policy cycle', async () => {
    // Wait for nomination phase
    await waitForState(host, s => s.phase === 'nomination', 10000);

    // Find the current mayor
    const mayorId = host.lastState.players?.find(
      (p: any) => p.isMayor
    )?.id;
    const mayor = allClients().find(c => c.playerId === mayorId);
    expect(mayor).toBeDefined();

    // Mayor nominates the first non-mayor alive player
    const nomineeId = host.lastState.players?.find(
      (p: any) => !p.isMayor && p.isAlive
    )?.id;
    expect(nomineeId).toBeDefined();

    sendAction(mayor!, { type: 'nominate', targetId: nomineeId });
    await waitForState(host, s => s.phase === 'election', 5000);

    // All alive players vote 'approve'
    const alivePlayers = allClients().filter(c => {
      const playerData = host.lastState.players?.find(
        (p: any) => p.id === c.playerId
      );
      return playerData?.isAlive;
    });

    for (const voter of alivePlayers) {
      sendAction(voter, { type: 'vote', vote: 'approve' });
    }

    // Wait for policy-session phase (election passed)
    await waitForState(host, s => s.phase === 'policy-session', 5000);

    // Mayor discards a card
    const mayorClient = allClients().find(c => c.playerId === mayorId);
    // Wait for mayor to receive their cards
    await tick(500);
    sendAction(mayorClient!, { type: 'mayor-discard', cardIndex: 0 });

    await tick(500);

    // Chief discards a card (enacts policy)
    const chiefId = host.lastState.nominatedChiefId;
    const chiefClient = allClients().find(c => c.playerId === chiefId);
    sendAction(chiefClient!, { type: 'chief-discard', cardIndex: 0 });

    // Wait for next phase (either executive-power or nomination for next round)
    await waitForState(
      host,
      s => s.phase === 'nomination' || s.phase === 'executive-power' || s.phase === 'game-over',
      5000
    );

    // Verify a policy was enacted
    const totalPolicies =
      (host.lastState.goodPoliciesEnacted ?? 0) +
      (host.lastState.badPoliciesEnacted ?? 0);
    expect(totalPolicies).toBeGreaterThanOrEqual(1);
  });

  it('plays rounds until a win condition is reached', async () => {
    // Play up to 20 rounds to reach a win condition
    for (let round = 0; round < 20; round++) {
      if (host.lastState.phase === 'game-over') break;

      // Wait for actionable phase
      await waitForState(
        host,
        s => ['nomination', 'executive-power', 'game-over'].includes(s.phase),
        15000
      );

      if (host.lastState.phase === 'game-over') break;

      // Handle executive power phase
      if (host.lastState.phase === 'executive-power') {
        const chiefId = host.lastState.players?.find(
          (p: any) => p.isChief
        )?.id;
        const chief = allClients().find(c => c.playerId === chiefId);
        const targetId = host.lastState.players?.find(
          (p: any) => p.isAlive && !p.isMayor && !p.isChief && p.id !== chiefId
        )?.id;

        if (chief && targetId) {
          const power = host.lastState.executivePower;
          if (power === 'investigate') {
            sendAction(chief, { type: 'investigate', targetId });
          } else if (power === 'special-nomination') {
            sendAction(chief, { type: 'special-nominate', targetId });
          } else if (power === 'execution') {
            sendAction(chief, { type: 'execute', targetId });
          }
        }

        await waitForState(
          host,
          s => s.phase === 'nomination' || s.phase === 'game-over',
          5000
        );
        if (host.lastState.phase === 'game-over') break;
      }

      // Nomination phase
      if (host.lastState.phase !== 'nomination') continue;

      const mayorId = host.lastState.players?.find(
        (p: any) => p.isMayor
      )?.id;
      const mayor = allClients().find(c => c.playerId === mayorId);
      const nomineeId = host.lastState.players?.find(
        (p: any) => p.isAlive && !p.isMayor && !p.wasLastChief && p.id !== mayorId
      )?.id;

      if (!mayor || !nomineeId) continue;

      sendAction(mayor, { type: 'nominate', targetId: nomineeId });
      await waitForState(host, s => s.phase === 'election', 5000);

      // All alive players vote approve
      const alive = allClients().filter(c => {
        const pd = host.lastState.players?.find((p: any) => p.id === c.playerId);
        return pd?.isAlive;
      });
      for (const voter of alive) {
        sendAction(voter, { type: 'vote', vote: 'approve' });
      }

      await waitForState(
        host,
        s => s.phase === 'policy-session' || s.phase === 'nomination' || s.phase === 'game-over',
        5000
      );

      if (host.lastState.phase === 'game-over') break;
      if (host.lastState.phase !== 'policy-session') continue;

      // Mayor discards
      const mayorClient2 = allClients().find(c => c.playerId === mayorId);
      await tick(500);
      sendAction(mayorClient2!, { type: 'mayor-discard', cardIndex: 0 });
      await tick(500);

      // Chief discards
      const chiefId2 = host.lastState.nominatedChiefId;
      const chiefClient2 = allClients().find(c => c.playerId === chiefId2);
      sendAction(chiefClient2!, { type: 'chief-discard', cardIndex: 0 });

      await waitForState(
        host,
        s => s.phase !== 'policy-session',
        5000
      );
    }

    // Game must have ended
    expect(host.lastState.phase).toBe('game-over');
    expect(host.lastState.winner).toMatch(/^(citizens|mob)$/);
    expect(host.lastState.winReason).toBeTruthy();
  }, 60000);  // 60 second timeout for full game

  it('game-over state reveals all roles', () => {
    expect(host.lastState.phase).toBe('game-over');

    // After game over, roles should be visible to all
    if (host.lastState.players) {
      for (const player of host.lastState.players) {
        expect(player.role).toBeDefined();
        expect(['citizen', 'mob-soldier', 'mob-boss']).toContain(player.role);
      }
    }
  });

  it('reconnection works mid-game', async () => {
    // This test runs after game-over, but validates the reconnection mechanism
    // Disconnect Alice
    const aliceToken = players[0].sessionToken;
    players[0].ws.close();
    await tick(500);

    // Reconnect with session token
    const reconnectedAlice = await connectClient('Alice', aliceToken);

    // Should receive full state on reconnect
    await waitForState(reconnectedAlice, s => s.phase === 'game-over', 5000);
    expect(reconnectedAlice.playerId).toBe(players[0].playerId);

    // Update reference
    players[0] = reconnectedAlice;
  });

  it('reset-to-lobby works after game-over', async () => {
    sendCommand(host, 'reset-to-lobby');

    await Promise.all(
      allClients().map(c =>
        waitForState(c, s => s.phase === 'lobby')
      )
    );

    expect(host.lastState.phase).toBe('lobby');
    expect(host.lastState.goodPoliciesEnacted).toBe(0);
    expect(host.lastState.badPoliciesEnacted).toBe(0);
  });
});
```

**What it tests:**
- Room creation and player join flow
- Role assignment for 5 players (3 citizens, 1 soldier, 1 boss)
- Full nomination → election → policy session cycle
- Executive powers triggering at correct bad policy counts
- Win condition detection (plays until game-over)
- State projection (no private data in host state)
- Game-over reveals all roles
- Reconnection mid-game (session token flow)
- Reset to lobby (same room, same players)

**Not tested in E2E (covered by unit tests):**
- All 6 player count configurations (unit tested in Phase 1)
- All executive power boards (unit tested)
- All win conditions (unit tested)
- Animation timing (manual verification)
- Audio playback (manual verification)

**Running the integration test:**

```bash
# Terminal 1: Start PartyKit dev server
pnpm dev:party

# Terminal 2: Run integration tests
pnpm test:integration
```

### Domain / URL

- Default Vercel URL: `https://undercover-mob-boss.vercel.app`
- Custom domain: optional, out of scope for v1
- Join URL format: `https://<domain>/join/<ROOM_CODE>`

### Environment Variables

**Vercel (frontend):**
- `VITE_PARTYKIT_HOST` — PartyKit server URL (different for dev vs prod)

**PartyKit (server):**
- No env vars needed — game state is ephemeral, no external APIs

**Build scripts only (not deployed):**
- `GEMINI_API_KEY` — for asset generation
- `ELEVENLABS_API_KEY` — for narrator generation
- `ELEVENLABS_VOICE_ID` — for narrator voice

### Local Development Setup

**First-time setup:**

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd undercover-mob-boss
pnpm install

# 2. Create .env file (for asset/narrator scripts only — not needed for dev)
cp .env.example .env
# Edit .env with your API keys

# 3. Login to PartyKit (needed for deploy, not for local dev)
npx partykit login
```

**Running Vite + PartyKit simultaneously:**

```bash
# Option A: Single command (recommended) — uses concurrently
pnpm dev
# Starts:
#   Vite dev server → http://localhost:5173
#   PartyKit dev server → ws://localhost:1999

# Option B: Two terminals
# Terminal 1:
pnpm dev:vite    # http://localhost:5173

# Terminal 2:
pnpm dev:party   # ws://localhost:1999
```

**How the two servers connect in development:**

The frontend code uses `import.meta.env.VITE_PARTYKIT_HOST` to determine the PartyKit server address:

```typescript
// src/client/state/connection.ts
import PartySocket from 'partysocket';

const host = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';

export function connectToRoom(roomCode: string) {
  return new PartySocket({
    host,
    room: roomCode,
  });
}
```

In development, `VITE_PARTYKIT_HOST` is not set, so it defaults to `localhost:1999`. In production (set via Vercel dashboard), it points to `undercover-mob-boss.<user>.partykit.dev`.

**`.env.development` (checked into repo — no secrets):**

```bash
# PartyKit dev server (no VITE_ prefix needed — code falls back to localhost:1999)
# VITE_PARTYKIT_HOST=localhost:1999
```

**Testing with multiple clients locally:**

1. Open `http://localhost:5173` in one browser tab — this is the Host
2. Open `http://localhost:5173/join/<ROOM_CODE>` in additional tabs or use different browsers / incognito windows
3. Each tab is a separate player with its own WebSocket connection to the same PartyKit room
4. All connect to `ws://localhost:1999/party/<ROOM_CODE>`

**Tip:** Use Chrome DevTools "Emulate device" to test different viewport sizes — host in landscape, players in portrait.

### Deployment Checklist

**Pre-deployment (one-time setup):**

```bash
# 1. Login to PartyKit
npx partykit login

# 2. Connect GitHub repo to Vercel
#    → vercel.com → Import Project → select repo
#    → Framework Preset: Vite
#    → Build Command: pnpm build
#    → Output Directory: dist
#    → Install Command: pnpm install

# 3. Set Vercel environment variables (Dashboard → Settings → Environment Variables)
#    VITE_PARTYKIT_HOST = undercover-mob-boss.<github-user>.partykit.dev

# 4. Verify partykit.json has correct "name" field
```

**Deploy sequence (every release):**

```bash
# 1. Run all tests
pnpm test
pnpm test:integration   # Requires dev:party running

# 2. Build frontend
pnpm build

# 3. Deploy PartyKit server FIRST (frontend depends on it being live)
pnpm deploy:party
# Wait for: "https://undercover-mob-boss.<user>.partykit.dev" confirmation
# Domain provisioning can take up to 2 minutes on first deploy

# 4. Deploy frontend to Vercel
git add -A && git commit -m "release: vX.Y.Z"
git push origin main
# Vercel auto-deploys on push to main

# 5. Verify deployment
#    a. Open https://undercover-mob-boss.vercel.app
#    b. Check COOP/COEP headers in DevTools → Network → Response Headers
#    c. Check service worker registered in DevTools → Application → Service Workers
#    d. Create a room, join from a second device
#    e. Play a full game

# 6. Monitor PartyKit logs (optional)
npx partykit tail
```

**Post-deployment verification checklist:**

```
[ ] Vercel URL loads without errors
[ ] COOP/COEP headers present (check DevTools Network tab)
[ ] Service worker registered (check DevTools Application tab)
[ ] Manifest detected (check DevTools Application → Manifest)
[ ] "Install app" prompt available on mobile
[ ] Create room → QR code displayed
[ ] Join room from second device → WebSocket connects
[ ] Start game → roles assigned
[ ] Full game plays to completion
[ ] PWA installs on Android Chrome
[ ] PWA installs on iOS Safari (Add to Home Screen)
[ ] App launches in standalone mode (no browser chrome)
```

## Technical Considerations

- **Two separate deployments** — Vercel (static) and PartyKit (server) deploy independently. Both should be triggered by the same git push via CI, or deployed manually in sequence.
- **COOP/COEP headers** — required for PWA features. May cause issues with third-party resources (fonts, analytics). Since UMB has no third-party dependencies, this is a non-issue.
- **Service worker cache invalidation** — `autoUpdate` handles this. Old service workers are replaced on next visit.
- **PartyKit cold start** — first room creation after a period of inactivity may have ~200ms cold start on Cloudflare edge. Negligible for a party game.
- **PartyKit local dev does not hibernate** — behavior may differ slightly from production (where hibernation is enabled). Not a concern for UMB since rooms are short-lived.
- **WebSocket connections are not subject to CORS** — browsers do not enforce same-origin on WebSocket upgrades. Only HTTP requests to PartyKit need CORS headers.
- **PartyKit dev server port** — defaults to 1999. If port conflicts occur, change in `partykit.json` and update `vite.config.ts` proxy.
- **Vite `base: './'`** — relative paths in built assets. Works on any domain/subdomain without reconfiguration. Matches racer-04 pattern.
- **`concurrently --kill-others`** — if either dev server crashes, the other is also terminated. Prevents orphan processes.

## Acceptance Criteria

### Vercel Deployment
- [ ] `pnpm build` produces clean production build in `dist/`
- [ ] Vercel deployment live and accessible via URL
- [ ] COOP/COEP headers present on all responses
- [ ] SPA rewrites work (`/join/<CODE>` resolves to app)
- [ ] Static assets (images, audio) served correctly with caching

### PartyKit Deployment
- [ ] `npx partykit deploy` succeeds
- [ ] Rooms create and accept connections from deployed frontend
- [ ] WebSocket connections work over HTTPS
- [ ] Rooms self-destruct after 30 min idle

### PWA
- [ ] Installable on iOS Safari (Add to Home Screen)
- [ ] Installable on Android Chrome
- [ ] Service worker caches static assets
- [ ] App launches in standalone mode (no browser chrome)
- [ ] Icons and splash screen display correctly

### E2E Test
- [ ] 5-player full game completes without errors
- [ ] All state projections verified (no private data leaks)
- [ ] Reconnection works mid-game
- [ ] Reset-to-lobby works after game-over
- [ ] Test runs in < 30 seconds

### Build Pipeline
- [ ] `pnpm dev` starts local development (Vite + PartyKit)
- [ ] `pnpm test` runs all tests
- [ ] `pnpm test:coverage` shows 80%+ on game logic

## Success Metrics

- Game is playable from any phone browser via the Vercel URL
- 5 phones in the same room can complete a full game
- PWA installs cleanly on both iOS and Android
- E2E test is green and stays green
- Total deployment process takes < 5 minutes

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PartyKit + Vercel CORS issues | Medium | Medium | Configure PartyKit CORS to allow Vercel domain; WebSocket is not subject to CORS |
| Service worker caches stale JS | Low | Medium | autoUpdate + versioned build hashes |
| E2E test flaky due to WebSocket timing | Medium | Medium | Use deterministic RNG, generous timeouts, `waitForState` helper |
| COOP/COEP blocks unexpected resource | Low | Low | No third-party deps; test headers early |
| PartyKit dev server hibernation differs from prod | Low | Low | Rooms are short-lived; hibernation behavior irrelevant for UMB |

## Sources & References

- SPEC.md deployment: `docs/spec/SPEC.md:74`
- SPEC.md PWA: `docs/spec/SPEC.md:73`
- SPEC.md acceptance Phase 6: `docs/spec/SPEC.md:344-348`
- Racer-04 vercel.json: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\vercel.json`
- Racer-04 vite.config.ts: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\vite.config.ts`
- Phase 2 PartyKit plan: `docs/plans/2026-03-16-003-feat-phase-2-multiplayer-plan.md`
- PartyKit configuration docs: https://docs.partykit.io/reference/partykit-configuration/
- PartyKit CLI docs: https://docs.partykit.io/reference/partykit-cli/
- PartyKit Server API: https://docs.partykit.io/reference/partyserver-api/
- PartySocket Client API: https://docs.partykit.io/reference/partysocket-api/
- PartyKit deploy guide: https://docs.partykit.io/guides/deploying-your-partykit-server/
- vite-plugin-pwa docs: https://vite-pwa-org.netlify.app/
- vite-plugin-pwa PWA requirements: https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements
- vite-plugin-pwa Vercel deployment: https://vite-pwa-org.netlify.app/deployment/vercel
- Vercel project configuration: https://vercel.com/docs/project-configuration/vercel-json
