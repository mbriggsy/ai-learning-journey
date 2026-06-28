---
title: A tiered (provisional→final) consumer re-fires identity-keyed contracts the static consumer never stressed
date: 2026-06-28
phase: P2 (D2 — the date band, slice 2)
modules: [src/ui/answerView.ts, src/ui/FuckOffDate.tsx, src/ui/ConfidenceStatement.tsx, src/viz/ConfidenceBandPanel.tsx, src/viz/BandEnlargeModal.tsx]
tags: [tiering, provisional-final, react-key, remount, focus-management, magic-moment, morph-vs-redraw, holistic-review]
---

## Problem

The date band reused two pieces of shipped, green machinery the spine route already used: the
once-per-landing focus announce (`focusHeading` on a `focusSignal` change) and the band's
draw-once-then-morph. Both passed every test on the spine. On the date route the ultramode review
surfaced two latent bugs: (1) when the final 16k-path tier crowned a *different* offset than the
provisional 2k tier, `focusSignal` flipped and focus was yanked back to the heading (+ scroll-jump),
stealing it from a user who'd tabbed into the range; (2) the re-draw-not-morph React `key`, placed on
`ConfidenceBandPanel`, remounted the whole panel on a provisional→final scale change — destroying an
*open* "Study the range" modal and dropping focus to `<body>`.

## Root Cause

The spine route's two recomputes (provisional then final) are **byte-identical** — `run()` ignores the
tier — so its `focusSignal` and band scale never change across the pair. Every identity-keyed contract
written for it was implicitly written **assuming stability**. The date route is the first **genuinely
tiered** consumer: the same surface re-renders with a sharper, *different* answer seconds later. That
turned "fires on change" (focus) and "key on scale" (remount) from inert into active — and the remount
key sat on the node that *also* owned the modal/focus state, so the re-draw nuked the interaction.

## Fix

- Focus: announce only on the **undefined→defined edge** (a `useRef` latch), not on every
  `focusSignal` change — a tier sharpen updates the number without re-stealing focus; the surface
  unmounts on Review, so a fresh landing still re-announces. Applied to both surfaces (shared contract).
- Re-draw: moved the scale `key` **off the panel and onto its inner `<ConfidenceBand>`(s)** (and
  threaded `redrawKey` into `BandEnlargeModal`), so a scale change re-draws the band without remounting
  the modal-owning node.

## Key Insight

When a new consumer is **tiered / evolves-over-time** where the original was **static**, re-audit every
contract that keys on *identity-or-change* — focus keys, React remount keys, morph-vs-redraw triggers,
memo deps. They were silently correct only because the first consumer never changed. And: scope a
remount key to the thing that must **re-draw**, never to a node that also owns **interaction state**
(modal open-ness, focus, scroll) — a coarse key throws the baby out with the bathwater. A diff-scoped
review sees only the new lines; these bugs live in the *interaction* between the new tiered caller and
the old stability-assuming contract — exactly the cross-product a whole-file review exists to catch.

## Also Applies To

- The U9 two-track (floor/lifestyle) split — another move from one-value to many-values.
- Any future on-demand re-grade / re-solve that re-commits to an already-mounted hero surface.
- `[[020-a-guard-gated-on-its-first-consumer-does-not-protect-the-second-consumer-of-the-same-invariant]]`
  (same shape: a contract correct for consumer #1, silently wrong for consumer #2).
- `[[035-a-live-updating-region-above-interactive-content-shifts-tap-targets-mid-gesture]]` (a
  changes-over-time surface breaking an interaction the static case never exposed).
