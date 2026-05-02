---
title: Debug overlays can mask the very fix they were added to verify
date: 2026-05-02
phase: ACTOR nope-window awareness eye-in-loop verification
modules: [src/client/player/PlayingView.module.css, player.html]
tags: [debugging, verification-bias, layout, observer-effect, eye-in-loop, false-negative]
---

## Problem

Briggsy reported phone-only right-edge clipping (TitleBar `#1234` truncating to `#12`, staging/hand container right rounded corners off-screen). I made a defensive `min-width: 0` CSS fix on `.workbench / .staging / .handSection` (commit `b7824600`). Briggsy reported "same issue" after reload. I spent ~30 more minutes adding diagnostic widgets, exploring zoom hypotheses, considering safe-area edge cases, looking up Pixel 8 Pro hardware specs, and writing a give-up TODO entry pointing toward USB remote-debug as the only path forward.

When I finally added unambiguous corner markers (24×24 fixed-position squares at all four viewport corners), Briggsy's screenshot showed all four corners visible, the ruler reaching x=440. The page WAS rendering at the full 448 px viewport. The fix had landed on the first try. The cyan top-right corner marker (24×24 at `position: fixed; top: 0; right: 0`) had been sitting **directly on top of the title bar's `#1234` text the whole time**, hiding the "34" portion under the marker and making it visually look like the truncation persisted.

So the original fix worked. The follow-up debug overlay broke the verification of the fix.

## Root Cause

A debug overlay added at `position: fixed; right: 0` will paint over whatever page content is at that screen position. If the bug being verified is "is content rendering up to the right edge?", a right-anchored debug overlay covers the very pixels you need to inspect. The overlay is designed to occupy the same coordinate space as the suspected overflow.

Three layers of debugging cascaded into the false negative:

1. **First overlay** — the red `position: fixed; right: 0` text widget. Its own content was being cut on the right ("`L/R:0px/0p`"), reinforcing the "clipping is real" story. Reading: text inside a right-anchored fixed element with `text-align: right` and content wider than viewport renders text starting at left and extending right past the right anchor — but the anchor IS the right edge of the visible area, so overflow goes off-screen-right, masquerading as page-content clipping.

2. **Second overlay** — corner markers + ruler at `top: 0; right: 0`. The cyan TR marker (24×24) was directly over the title bar's room-code area. The TitleBar IS in the page's normal flow at y=0 of document content, and `position: fixed; top: 0` overlays ARE at y=0 of viewport. Same coordinate space. The marker hid the "34" of "#1234".

3. **Confirmation bias** — every screenshot I read kept showing "#12" at the title bar's right edge. I'd already written a story ("the page is wider than viewport"), so each new screenshot confirmed it. I never asked: "is something I added covering the text I'm trying to see?"

## Fix

Two complementary disciplines:

1. **Before declaring a fix didn't work, remove your own debug overlays and re-check.** A "still broken" report on a screenshot that includes diagnostic UI is a measurement contaminated by the measurement device. The fix may have landed cleanly; you may be looking at the overlay, not the page.

2. **Place debug overlays away from the area you're inspecting.** If the suspected bug is right-edge clipping, put diagnostics on the left side. If it's top-bar truncation, put them at the bottom. The diagnostic must not occupy the same coordinate space as the symptom.

For the specific case of `position: fixed; right: 0` widgets diagnosing right-edge clipping: this is structurally backwards. The widget IS at the right edge — by definition it's at the same place as the bug — and any text inside that's wider than its container will visually mimic the very symptom under investigation.

## Lesson

When the symptom is "content at coordinate X looks wrong," diagnostic UI MUST NOT be at coordinate X. The diagnostic and the symptom can become indistinguishable, and the diagnostic's failure modes (overlay clipping its own text, right-anchored content shifting weird) compound the misreading.

Also: the `min-width: 0` on flex column children is a generally-correct defensive add. The original instinct ("flex items default to `min-width: auto` which can be wider than parent") was correct. Trust the fix; verify with overlays placed somewhere they don't overlap.
