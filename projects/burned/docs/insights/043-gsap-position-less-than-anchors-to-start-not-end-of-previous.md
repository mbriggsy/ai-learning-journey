# GSAP `'<'` position parameter anchors to START of previous tween, not end

**Date:** 2026-05-01
**Surface:** `src/client/shared/DramaOverlay.tsx`
**Severity:** P0 — silently invalidated all drama-beat pacing tuning across the entire game from 2026-04-22 → 2026-05-01.

## What broke

Every dramatic moment in BURNED — BURNED draw, EXTRACTED, ELIMINATED, INTERCEPTED, GAME OVER, GONE DARK, FILES BURNED — was firing for ~700-800ms regardless of its `holdMs` config (which ranges 1200-2400ms). The clipped duration manifested as "camera flash" beats that calibration playtest agents reported as "no discrete drama beat observed" or vibe-checks marking the moments as imperceptible.

Briggsy surfaced it on phone (Chrome DevTools Pixel 7 emulation): "burn screen for like a camera flash and then extracted for maybe a half sec more than a camera flash."

## Root cause

The GSAP timeline construction in `processQueue` used position parameter `'<'` on both exit tweens:

```ts
tl.to({}, { duration: config.holdMs / 1000 })          // [1] dummy hold
tl.to(target, { filter: 'blur(4px)', ... }, '<')        // [2] '<' = start at START of [1]
tl.to(overlay, { opacity: 0, ... }, '<')                // [3] '<' = start at START of [2]
```

The position parameter `'<'` means **"at the start of the previous tween,"** not "at the end." GSAP convention is opposite of intuition for many engineers — `'>'` is end-of-previous, `'<'` is start-of-previous.

The original author intended the two exit tweens to fire in parallel WITH EACH OTHER. They achieved that — but they also unintentionally anchored both exits to the START of the hold tween. Result: blur + opacity-fade ran from t=hold_start to t=hold_start+0.4s while the hold dummy continued its 2.4s tween in parallel. The visible portion of every beat = enter (~400ms) + fade (~400ms) = ~800ms. The remaining 1.6-2.0s of "hold" was a 0-opacity overlay holding nothing visible.

## How instrumentation found it

Polling DOM state every 50ms during a triggered burned-drawn → extraction-played sequence:

```
t=98ms     card slot, opacity 1   ← entry done
t=554ms    card slot, opacity 0.561 ← already fading (BUG: should still be holding)
t=861ms    card slot, opacity 0   ← gone (BUG: holdMs is 2400)
t=2905ms   text:EXTRACTED, opacity 1 ← next beat finally fires
```

Compared to fixed timing:

```
t=98ms     card opacity 1
t=2902ms   card at 0.79, fade-out starting (matches design: 400 entry + 2400 hold)
t=3410ms   EXTRACTED appears
t=5155ms   EXTRACTED at 0.78, fade-out starting (matches: 250 entry + 1600 hold)
```

## Fix

Remove the `'<'` from the BLUR exit tween (so it runs sequentially after the hold). Keep `'<'` on the OPACITY exit (so it runs in parallel with the blur).

Extracted into `appendHoldAndExit` helper for testability. `DramaOverlay.test.ts` pins the contract via `tl.totalDuration()` assertion: total must equal `holdSec + exitDurationSec`. If anyone re-introduces `'<'` on the blur, total collapses to `max(holdSec, exitDurationSec)` and the test fails noisily.

## The meta-lesson

**Calibration agents read state, not motion.** Playtest seat agents reported issue 008 ("ACTOR drama beat absent or imperceptible before DefusePlacement") — they were correct that the beat wasn't perceptible, but their hypothesis was lazy-load race or visual conflation. The actual cause was a quantitative timing bug invisible to discrete state polls.

**Eye-in-loop > calibration for motion-quality bugs.** Briggsy's "camera flash" report named the symptom concretely. Instrumentation confirmed it. Years of holdMs tuning had been calibrated against a clipped reality, with the 800ms visible time treated as the design — comments like "1000 → 1600: couch-to-TV recognition latency is ~1200ms" describe a visible hold that never happened at the configured value.

**GSAP position parameter direction is counterintuitive.** `'<'` = "at the start of the previous tween." `'>'` = "at the end of the previous tween." Read every `'<'` in any GSAP timeline as "starts SIMULTANEOUSLY WITH the previous tween" and verify that's the intent. Most "after the previous" intents should be NO position param (default behavior is sequential append), not `'<'` or `'>'`.

**Per-beat visible-duration assertions in tests are cheap and catch this class of bug.** The fix added 3 unit tests (~5ms total runtime) that pin `tl.totalDuration() === enter + hold + exit`. That's the entire regression net.
