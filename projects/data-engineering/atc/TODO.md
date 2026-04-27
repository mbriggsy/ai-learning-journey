# ATC — TODO

## Status

Doc series complete: `01-prd.md` → `05-evidence.md`, `README.md`, `skills.md`.

Visualization shipped: `viz/index.html`. Single-page web doc demonstrating the methodology — flight-pattern chart with `/brief`/`/distill` anchored above Execute (04) and Review (05) per chapter docs, six-card phase grid with Evidence-card differentiation, pull-quote moment, three doctrine cards. Click phase nodes or press 1–6 to jump to detail. Continuous loop pulse + orchestrated entrance animation. Mobile-responsive, print-mode CSS, accessibility passes.

`README.md` reading order leads with `viz/index.html` as the at-a-glance entry; chapter docs frame as "the depth."

## Next up

- **Hosting.** Cloudflare Pages, free tier — agreed direction. Not yet deployed.
- **Remotion video.** Second deliverable — 30–60s trailer to embed at top of `viz/index.html` and export as MP4/GIF. Static page now locks the aesthetic, motion language, color, and typography for Remotion to inherit.
- **`concept.html` cleanup.** Single-phase deep-dive with stale numbering (Execute as Phase 03, but methodology has Deepen as 03, Execute as 04). Three options: (a) renumber to Phase 04 / Execute, (b) rebuild for Phase 03 / Deepen, (c) retire — full coverage in `index.html` makes per-phase template likely unneeded. Lean: (c).
- **PRD template vs contract.** Captured in `01-prd.md` Open Questions. Briggsy wants team input before resolving.

## Local server

If `localhost:8765` isn't responding:

```bash
cd projects/data-engineering/atc/viz
python -m http.server 8765
```

Then `http://localhost:8765/index.html`. For phone-eyeball over LAN, serve with the host's network IP.

## Landmines for next session

- `ideation/prompt.txt` is gitignored. Don't try to commit it.
- Burned/ files in working tree are out of scope for ATC. Leave them alone.
- Don't suggest manual seeding of `/brief` library. Empty is fine; the loop fills via `/distill`.
- Don't reintroduce "paint-by-numbers" / "actual code" / "commit points" into plans.
- The visual's `/brief` and `/distill` anchors live above phases 04 (Execute) and 05 (Review) — not symmetric far-edges. If you're tempted to "balance" them out to PRD and Evidence, don't — that was the wrong-where-they're-used framing we already fixed.
- "Many pilots, one tower" is the role framing. Don't revert to "one pilot."
