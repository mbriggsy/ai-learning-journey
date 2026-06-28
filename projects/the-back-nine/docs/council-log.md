# Council Log — the digest

Every Council of Elders verdict lands here, newest first. This is Briggsy's **after-the-fact review surface** under maximum-autonomy: scan it to see what the council decided and acted on without stopping you.

- **⚑** = executed at `yours-to-close` (a taste / direction call acted on at high confidence) — the ones you're most likely to want to eyeball or reverse.
- **action**: `executed` (council resolved it, pilot acted) · `surfaced` (brought to Briggsy — low confidence, veto, or hard-stop).
- Reverse anything: it's all reversible by design (hard-stops never auto-execute).

How it's run: `/council <issue>`, or the pilot auto-convenes whenever it would otherwise park a non-trivial judgment call. Mechanism: `.claude/skills/council/` (playbook + 9 elder charters) → `.claude/workflows/council.js` (debate engine).

| Date | Issue | Tier | Recommendation | Conf. | Action |
|---|---|---|---|---|---|
| 2026-06-28 | $20M band-scale squash — cap the date-route fan axis? | council-decided + ⚑ yours-to-close | **Don't build the cap** — leave the axis honest-as-is; serve comprehension via the non-axis scrub readout, not the scale lever | 8/10 | executed (stand-down) · surfaced (tone + reproducibility) |

### ⚑ Awaiting your eye
- **$20M band-scale squash (2026-06-28):** cap lever resolved (don't build — see TODO). **(a)** STILL YOURS: tone cold-read on the real render — is the honest-as-is squash tolerable, or add a *non-axis* comprehension aid? **(b)** RESOLVED by independent verification (2026-06-28): the ~26% swing is the **expected** provisional-tier (2k paths) → final-tier (16k paths) change — a finer p90 tail estimate, and the UI re-draws (doesn't morph, `FuckOffDate.tsx:152`); the `88.88M→65.42M` figures appear **nowhere in code** (an ungrounded elder anchor — verified, not believed). One latent note for **U8**: `seed` is persisted but `tier` is NOT, so a completed date-route scenario could reload at the coarser provisional axis — handle at Save/reload. The council reversed a unanimous open-to-cap *after measuring against real code* — dissent + "what would flip it" preserved in that run's task output.

> **How the council reached this:** opening 6/6 to cap (0.72–0.8) → rebuttal round caught the unmeasured claim → 5/6 flipped, Honesty Hawk veto turned *against* the cap. Genuine reversal, grounded in `src/viz/bandData.ts`, `answerView.ts`, `bandData.test.ts`. Cost: ~1.12M tokens, ~24 min wall-clock (full council). Lever for cheaper runs: `weight: "light"`.
