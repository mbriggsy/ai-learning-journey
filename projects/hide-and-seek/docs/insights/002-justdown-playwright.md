---
title: JustDown doesn't work with Playwright keyboard events
date: 2026-03-30
phase: 3
modules: [renderer/scenes, renderer/systems/InputManager]
tags: [phaser, playwright, input, testing]
---

# JustDown Doesn't Work with Playwright Keyboard Events

## Problem

Playwright E2E tests couldn't trigger ESC key handling. `Phaser.Input.Keyboard.JustDown(key)` returned `false` even though Playwright sent keydown+keyup events.

## Root Cause

`JustDown` requires the key state to persist until the next `update()` call polls it. Playwright sends keydown immediately followed by keyup between frames. By the time `update()` runs, the key is already released, so `JustDown` sees no transition.

## Fix

Replaced `JustDown` polling with `key.on('down', ...)` event listeners for keys that must work with automated testing or fast external input. The event fires synchronously on keydown, before the next frame.

## Key Insight

Phaser's `JustDown`/`JustUp` are designed for human input at 60fps, where a key press naturally spans multiple frames. Any programmatic input source (Playwright, bots, accessibility tools) that sends keydown+keyup in the same frame will be invisible to polling-based input checks.

## Also Applies To

Any Phaser game that needs automated testing. All keyboard-driven interactions should use event listeners, not `JustDown` polling, if Playwright tests are planned.
