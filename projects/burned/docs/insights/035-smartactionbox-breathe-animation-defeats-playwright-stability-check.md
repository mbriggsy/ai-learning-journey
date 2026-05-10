---
title: SmartActionBox breathe animation defeats Playwright element-stability check — agents cannot click action buttons
date: 2026-04-25
modules: [src/client/player/SmartActionBox.module.css, scripts/playtest/agents/seat-scripted.md, .claude/agents/playtest-seat-N.md]
tags: [playtest-harness, calibration, animation, playwright, click-stability, real-vs-smoke]
---

## Problem

Phase 6 Unit 3 calibration retry attempt #3b. All four prior harness gaps
closed (031, 032, 033, 034). God-subscriber stayed connected for the entire
session (`god=1` on every broadcast, 0 silent-close warnings, 3 god events
in events.jsonl over the live wallclock).

Then the game stalled. seat-1 (ACTOR) drew a card successfully ("End turn
draw" worked), but tried to fire SCN-FAVOR-NORMAL-01 / SCN-SKIP-NORMAL-01 /
SCN-GO-DARK-NORMAL-01 / SCN-COMBO-TRIPLE-NAMED-STEAL-NORMAL-01 — every
attempt to click a SmartActionBox action button (Take a card, End turn skip,
etc.) **timed out with Playwright's stability error**:

> "Playwright click waits indefinitely for the element to stop moving — it
> never does."

seat-1 captured a screenshot (`seat-2-action-btn-unstable.png` — actually
written by seat-2 hitting the same wall) and exited cleanly with a precise
diagnosis. seat-2 + seat-3 were OTHER (alive); they observed the stall but
couldn't act. Coverage: 0/50 fires, all from "couldn't reach the button."

## Root Cause

`src/client/player/SmartActionBox.module.css:103-109`:

```css
/* Gameplay-essential CTA pulse — survives prefers-reduced-motion. */
.action {
  animation: breathe var(--motion-duration-essential-pulse) var(--motion-ease-base) infinite alternate;
}
```

The action button has a continuous infinite breathe animation. Per the
file's own header (lines 6-8), this is **deliberately preserved across
`prefers-reduced-motion: reduce`** — it's "GAMEPLAY-ESSENTIAL" because it
signals "tap me to act." `breatheIntense` (low-deck warning, line 90) and
`interceptPulse` (final-2-seconds-of-nope-window, line 141) carry the same
"essential" classification.

Playwright's `locator.click()` runs an actionability check before clicking:
visible, stable, enabled, receives events. **Stability requires the element
to not move between two animation frames.** A `transform: scale()` breathe
animation that runs forever fails this check forever. Playwright's MCP
wrapper (`mcp__playwright-seat-N__browser_click`) inherits this default and
provides no `force: true` escape hatch on the agent whitelist.

So:
- Plain "End turn draw" button — different CSS class, no animation, stable,
  agents CAN click. (seat-1 successfully drew Direct Order this way.)
- SmartActionBox action buttons (Take a card, End turn skip, Play combo,
  etc.) — `.action` class with breathe animation, agents CANNOT click.

This is the difference between attempt #2 (game played for 12 minutes
silently because god died) and attempt #3b (god stayed alive for 15 minutes
but the game couldn't progress past turn 1 because action buttons were
unreachable).

## Why the smokes didn't catch this

`phase4-smoke` and `phase5-smoke` use mocked seat agents (file emit + marker
write). `phase6-launcher-smoke` mocks the seat-driver entirely.
`phase6-board-launcher-smoke` uses real Playwright seats but only drives
`End turn draw` (the one button without breathe). None exercise the
SmartActionBox action buttons via real Playwright clicks.

A targeted regression test (real Playwright Page calls Playwright's own
`locator('.action').click()` on a live game state) would have caught this in
isolation. Worth adding as a Phase 6 follow-up.

## Fix Path Options

### Option 1 — Animation on a `::before` pseudo-element (product-side, recommended)

Move the breathe pulse from the button itself to a `::before` wrapper that
scales OUTWARD without changing the button's layout box. Visually identical
to the user (something pulses behind/around the button); the button DOM
stays still; Playwright stability check passes.

Concrete change: instead of

```css
.action { animation: breathe ... infinite alternate; }
```

it becomes

```css
.action { position: relative; }
.action::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: <pulse-color>;
  z-index: -1;
  animation: breathe ... infinite alternate;
}
```

Pros: zero functional change, no harness adaptation, no test-mode bifurcation.
Cons: requires re-tuning the pulse to look right in the new geometry.

### Option 2 — Harness-mode URL param (harness-side)

Add `?harness=1` to the player URL; player view honors it by setting
`animation-duration: 0s` on the breathe animations. Agent prompts already
include the player URL — single-line change.

Pros: pure additive, no CSS rework.
Cons: harness is no longer testing the literal real product. Insight 020
("agents play the REAL product") tension. The CSS difference is small
(animation off vs on) but it IS a difference.

### Option 3 — Coordinate-based clicks via a different MCP tool

Agents use `browser_evaluate` to read the button's bounding box, then click
center coordinates. But `browser_evaluate` is on the BLOCKED list (insight
020 — agents shouldn't have arbitrary JS execution). This option requires
re-opening the tool whitelist, which is exactly what insight 020 closed.
Rejected.

### Option 4 — `force: true` exposed by MCP

Modify `.mcp.json` server args to enable a `force` option, OR write a custom
MCP wrapper that always passes `force: true`. Risk: force-click bypasses ALL
actionability checks (including "element receives events" — could click
through overlays). Rejected unless other options fail.

### Option 5 — Defer scenarios that need SmartActionBox

Calibration runs that test only draw-phase scenarios. Loses 4 of 6 mini-
catalog scenarios. Stop-gap, not a fix.

## Recommendation

**Option 1.** Smallest blast radius, preserves UX, no harness/product split.
Estimate: 30-60 min including visual re-tuning. Ships with a follow-up
phase6-smartactionbox-clickability-smoke that asserts Playwright can click
`.action` against a live page.

If Option 1 turns out to look bad after re-tuning, fall back to Option 2.

## Key Insight

**Animation as gameplay-signal vs animation as DOM motion.** The breathe
pulse is correct UX — the player NEEDS the button to look "alive." But
animation that mutates the layout box also mutates the element's
clickability per Playwright's actionability model. Two different layers of
concern (visual signal vs DOM stability) collided silently because the
animation was applied to the same DOM node as the click target.

The general pattern: **for any interactive element with a continuous
animation, the animation must live on a different DOM node than the click
target.** Apply animations to wrappers, pseudo-elements, or sibling glows —
not to the click target itself. This is good frontend hygiene
independent of the harness — it also helps screen readers, accessibility
focus rings, and any other tool that observes the element's geometry.

## Insight Trail (Phase 6 Unit 3 calibration cycle)

- **031** — Per-seat MCP isolation deferred → integration gap (closed by Unit 2.5).
- **032** — No game-start mechanism under Option A (closed by Unit 2.6).
- **033** — Board launcher 60s default too tight for real agent dispatch
  (closed by `boardViewWaitForStartTimeoutMs`).
- **034** — God subscriber heartbeat-killed at 40s; silent telemetry loss
  (closed by pong handler).
- **035 (this one)** — SmartActionBox breathe animation defeats Playwright
  stability check; agents can join + observe but can't drive the game.

Five calibration attempts, five distinct gaps. Each undetectable without
running real Claude agents at real session lengths against the real product.
Insights 031-034 were harness bugs; insight 035 is a product testability
concern. Calibration is now finding things its mid-stack tests can't —
exactly the calibration mandate.

## Follow-up

Decide Option 1 vs Option 2. If Option 1: implement, add regression smoke,
retry calibration. If Option 2: add `?harness=1` honoring + a 1-line agent
prompt update + retry. Either path produces clean coverage data on the
next attempt.

The session-timeout-pre-empts-agents observation (15 min cap fires before
the agents finish playing) is still open as a follow-up — but it's
gated on this insight resolving, since right now the game stalls long
before 15 min anyway.
