---
title: Node process.env is case-insensitive on Windows but case-sensitive on POSIX — silently masks mixed-case .env drift
date: 2026-05-18
modules: [videos/trailer/scripts/generate-tone-clip.ts, videos/trailer/scripts/generate-scream-variant.ts, videos/trailer/scripts/generate-tts-eval.ts]
tags: [env-vars, dotenv, nodejs, windows-posix-divergence, ci-fragility, trailer-tts]
severity: P3
discovered_while: Phase 0 Unit 0.4 tone clip render — initial render misdiagnosed as "key missing" after a narrow grep over .env
status: OPEN
---

## Problem

Trailer TTS renderers (`generate-tone-clip.ts`, `generate-scream-variant.ts`, `generate-tts-eval.ts`) read `process.env.ELEVENLABS_API_KEY` (all uppercase) and successfully fetch the key on Windows — multiple production renders shipped this session, including the canonical Unit 0.6 scream + the Unit 0.4 tone clip. But BURNED's `.env` actually stores the key as `ElevenLabs_API_KEY` (mixed case). Same pattern for `OpenAI_KEY` (mixed case in the file, uppercase in any future reader).

Empirically on Node 22 / Windows 11 / dotenv 17:

```js
require('dotenv').config({ path: '.env' });   // .env: ElevenLabs_API_KEY=<key>
process.env.ELEVENLABS_API_KEY  // → key (51 chars)
process.env.ElevenLabs_API_KEY  // → key (51 chars)
process.env.elevenlabs_api_key  // → key (51 chars)
```

All three case variants resolve to the same value on Windows.

## Root Cause

Node's `process.env` delegates to the OS environment block. Windows is case-INSENSITIVE for env vars by OS design (`%PATH%` ≡ `%path%`); POSIX (Linux/macOS) is case-SENSITIVE. dotenv writes each key under the EXACT name in `.env`. The split:

```
.env line:  ElevenLabs_API_KEY=...
Windows:    process.env.ELEVENLABS_API_KEY → works
POSIX:      process.env.ELEVENLABS_API_KEY → undefined
```

A working Windows render proves nothing about whether the same script works on Linux. CI in a container, a Linux contributor, or WSL is the first surface where the divergence bites.

## Fix

Not shipped this session — flagged for decision. Two viable directions:

**(A) Normalize `.env` to UPPER_SNAKE_CASE.** One-line rename per affected key. Cheapest, idiomatic, matches the convention of the other three keys already in the file (`GEMINI_API_KEY`, `PLAYTEST_MODE`, `PLAYTEST_TOKEN`).

**(B) Multi-case fallback in readers.** Defensive but adds drift surface:

```ts
const key = process.env.ELEVENLABS_API_KEY ?? process.env.ElevenLabs_API_KEY;
```

Pragmatic recommendation: (A) — fix the source of the divergence, don't paper over it in every reader.

## Key Insight

**Windows `process.env` is case-insensitive — that single property silently masks mixed-case `.env` naming drift that will break on POSIX the first time CI or Linux touches the code.** A green Windows run is not evidence of cross-platform correctness for env-loaded credentials.

Corollary at the diagnostic level: never conclude "key missing" from a narrow regex over an unknown `.env` (e.g. `grep -oE '^[A-Z_]+=' .env`). The file's own naming convention is one of the things being audited, not a precondition. Probe by **service-name substring first** (`grep -in 'eleven' .env | sed 's/=.*$/=<HIDDEN>/'`), then confirm reader case-sensitivity in context. A "missing" diagnosis requires falsifying ALL plausible name variants, not just one.

## Also Applies To

- Any cross-platform Node project that loads credentials/config via dotenv with uppercase-conventional readers — Windows dev success ≠ Linux/CI success.
- Shell-level env reads (`$ELEVENLABS_API_KEY`) have the same divergence: works in Git Bash / cmd / PowerShell on Windows, breaks under bash on Linux when `.env` keys are mixed case.
- The companion mixed-case key `OpenAI_KEY` in the same `.env` — pattern, not one-off. Fix both together.
- Codebase audits comparing `.env` to reader code: case-fold both sides before declaring "missing," or you'll produce false negatives.
- Linked diagnostic-process insight: this is a sibling to [[053-seat-agent-bug-suspicions-are-hypotheses-not-findings]] — "suspicion" / "missing" / "broken" claims need falsification of plausible alternatives before they ship as conclusions.
