---
title: Redundant timeout layers mask each other when an inner mechanism resets the outer
date: 2026-04-06
modules: [src/server/room.ts]
tags: [timers, heartbeat, idle, redundancy, server]
---

## Problem

The server had two per-connection timeout systems: a heartbeat (30s ping, 10s pong timeout = 40s dead detection) and an idle timer (2 minutes, reset on any message). The idle timer was supposed to catch "connected but inactive" connections. It never fired.

## Root Cause

The heartbeat sends a `ping` every 30 seconds. The client responds with `pong`. The `pong` arrives in `onMessage`, which resets the idle timer. So every connected client — even one doing absolutely nothing — resets the idle timer every 30 seconds, well within the 2-minute window.

The heartbeat mechanism's normal operation (sending pings and receiving pongs) constitutes "activity" from the idle timer's perspective. The idle timer can only fire if the heartbeat has already failed — at which point the heartbeat closes the connection first (at 40s, vs. idle's 120s).

Five new Maps and four new methods were managing a system that could never trigger independently.

## Fix

Removed the entire idle timer system (`idleTimers` Map, `IDLE_CONNECTION_MS`, `resetIdleTimer`, `clearIdleTimer`). The heartbeat alone detects dead connections. The room-level inactivity alarm (15 minutes) handles "game abandoned" scenarios.

## Key Insight

**When two timeout mechanisms share a reset signal, the faster one makes the slower one unreachable.** Before adding a second timeout layer, trace the reset paths. If mechanism A's normal heartbeat resets mechanism B's timer, B can never fire while A is healthy — and if A fails, A fires first anyway. The second layer adds code, Maps, and cleanup obligations for zero behavioral difference.

## Also Applies To

- Client-side reconnection timeout + server-side idle timeout sharing the same WebSocket activity signal
- Rate limiters at multiple layers (middleware + application) where the stricter one always triggers first
- Any "belt and suspenders" design where one mechanism's normal operation constitutes success for the other
