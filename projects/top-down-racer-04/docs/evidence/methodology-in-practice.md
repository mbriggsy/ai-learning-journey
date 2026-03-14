# Compound Engineering in Practice

A case study of the Top-Down Racer v04 build, executed March 11-13, 2026.

---

## What is Compound Engineering?

Compound Engineering (CE) is an autonomous SDLC methodology built around one core idea: every phase of a software build should make the next phase smarter. Where traditional development treats each task as independent work, CE treats every task as both a deliverable and a lesson. Knowledge compounds across the build, not just code.

The CE loop runs five steps in sequence:

1. **Plan** -- Define the phase goal, deliverables, and acceptance criteria. A brainstorm precedes the first plan to resolve ambiguity.
2. **Deepen** -- A strike team of 10+ specialized research agents stress-tests the plan. They probe for API bugs, architectural conflicts, performance risks, and logic errors -- all before a single line of code is written.
3. **Work** -- Execute the plan with live framework documentation (Context7), semantic code navigation (Serena), and structured reasoning (Sequential Thinking). Atomic commits per task.
4. **Review** -- Verify deliverables against the plan. Run tests. Check for boundary violations.
5. **Compound** -- Capture lessons back into the project knowledge base (CLAUDE.md, docs/solutions/). The next phase reads these lessons and starts informed.

The critical differentiator is step 2: **deepen plan**. In v02, this step was running covertly behind the GSD methodology -- GSD produced plans, and CE's deepen-plan secretly refined them. In v04, deepen-plan runs natively on every phase, no exceptions. It is the single move most responsible for catching implementation bugs before code exists.

### How v04 Deviated from the Designed Loop

The CE Playbook prescribed a per-phase cycle: plan Phase 0 → deepen → execute → review → compound → plan Phase 1 → ... In practice, v04 used a **serial planning** approach: all eight plans were created and deepened upfront, then all phases were executed sequentially.

**What this changed:**
- The compound step (step 5) was never executed. No `docs/solutions/` directory was created during the build. The `learnings-researcher` agent had nothing to search.
- Phase plans could not incorporate lessons from prior phases' *execution*, only from their *design*. Cross-phase knowledge came from architectural foresight in the plans, not from runtime experience.

**Why this was a reasonable trade-off for v04:**
- The spec + 14 ADRs locked the "what" before planning began, making each phase's inputs/outputs predictable.
- The frozen engine (366 tests, zero modifications) anchored all phases to a stable foundation.
- Serial planning prevented rework -- no phase needed replanning after a prior phase's execution revealed surprises.
- The deepen step caught 9 critical bugs independently, without needing compound artifacts from prior phases.

**What was lost:**
- The compound flywheel (knowledge compounding across phases within the same build) did not operate.
- Runtime integration surprises (filterArea clipping, ScreenManager DOM rewrite) could not feed back into later plans.

This deviation is documented honestly throughout this evidence package. Where the designed CE loop would have produced different results, it is noted.

---

## The Build: Phase by Phase

### Phase -1: Foundation (March 12, 12:14 - 13:04 EDT)

**Goal:** Copy the frozen simulation engine, AI bridge, and track geometry from v02 into v04's repository. Confirm all 366+ tests pass in the new environment.

The foundation phase was deliberately mechanical. The CE Playbook called out that pre-flight work -- copying files, setting up API keys, verifying tooling -- should not consume planning tokens. The engine (`src/engine/`), AI bridge, and Track 01 geometry were copied verbatim from v02. All 366+ engine tests passed on first run. The phase merged to main at commit `9a23840c` within 50 minutes.

**Outcome:** Clean foundation. Zero engine modifications. Every subsequent phase built on a verified base.

### Phase 0: Asset Generation (March 12, 13:23 - 13:42 EDT)

**Goal:** Build an autonomous asset generation pipeline using the Gemini Imagen 4 API. Generate all 11 game assets (4 car sprites, 3 track backgrounds, 3 tileable textures, 1 menu background) with zero human art involvement.

The deepen-plan step caught five critical issues before code was written. The most consequential: `negativePrompt` is silently ignored by Imagen 4 (the plan had relied on it for style control), `enhancePrompt` defaults to true and rewrites prompts via an LLM (breaking style consistency), and the processing pipeline had resize before background removal (which would permanently contaminate car sprite edges with chroma-key artifacts). All five were corrected in the plan, not in the debugger.

The pipeline shipped as four TypeScript modules: typed prompt definitions, a CLI entrypoint, an image processing layer (Sharp), and shared types. First run produced 11/11 assets at commit `f1f82b12`.

**Outcome:** Fully autonomous art pipeline. The spec originally referenced Imagen 3 (shut down November 2025) -- the deepen step caught this and redirected to Imagen 4.

### Phase 1: Asset Pipeline + Track Redesign (March 12, 13:55 - 16:02 EDT)

**Goal:** Build the asset processor tooling (optimize PNGs, build texture atlas, generate typed manifest) and redesign Track 02 (speedway) and Track 03 (gauntlet) with genuinely different geometry.

Phase 1 combined two distinct workstreams: infrastructure tooling and creative track design. The asset processor ingested raw PNGs from Phase 0, optimized them, packed a 520x520 texture atlas, and generated a typed TypeScript manifest (`src/assets/manifest.ts`) -- eliminating magic strings from all game code. Track 02 was redesigned as a longer high-speed circuit with genuine braking zones. Track 03 became a mixed-radius gauntlet where no two corners are the same, including a decreasing-radius corner specifically designed to defeat memorization-based AI.

The phase included a full test suite for both the asset processor and track geometry validation (closed polygons, checkpoint ordering, boundary integrity). Merged to main at commit `2368747d` after approximately two hours of execution.

**Outcome:** Typed asset pipeline, two redesigned tracks, and the foundation for Phase 2's visual upgrade.

### Phase 2: Core Visual Upgrade (March 12, 17:00 - 21:25 EDT)

**Goal:** Replace all geometric placeholders with high-res sprites and textured tracks. Rebuild the renderer container hierarchy for post-processing support.

This was the heaviest execution phase. The entire renderer layer was rebuilt: sprite-based car rendering replaced geometric shapes, textured track surfaces replaced flat color fills, and the container hierarchy was restructured into the PostProcessContainer/HUDContainer split that Phase 3 required. A texture-fill spike preceded the main implementation to validate the tiling approach.

A car rendering crash surfaced during integration (`792cca25`) -- the sprite loading path did not account for the new asset manifest structure. This was a runtime bug, not a plan-level issue, and was fixed within the same session.

**Outcome:** The game went from "rectangles on a track" to "sprites on textured surfaces." The container hierarchy was Phase 3-ready. Merged at `304c649e`.

### Phase 3: Post-Processing & Effects (March 12, 21:33 - 22:26 EDT)

**Goal:** Add bloom, shadows, motion blur, and upgraded particle effects. Refactor the effects pipeline from per-frame Graphics allocation to pooled sprites and RenderTexture-based skid marks.

Phase 3 had the most valuable deepen-plan output of the entire build. The strike team caught six critical issues: DropShadowFilter offset needs Y-flip compensation (the plan had it wrong), the custom ShimmerFilter GLSL used legacy WebGL1 syntax incompatible with PixiJS v8's `#version 300 es` default, `DEFAULT_VERTEX` does not exist in PixiJS v8 (correct import is `defaultFilterVert`), and the skid mark fade technique would produce full-screen darkening. All six were corrected in the plan.

During execution, two additional issues surfaced: `filterArea` combined with multiply blend mode caused render clipping (`63b0d6bf`), and the drop shadow needed to be disabled after visual testing showed it did not improve depth perception as expected (`caa48d4d`). The Phase 3 post-mortem (`docs/Phase-3-Post-Processing-Learnings.md`) became the most detailed compound output of the build.

**Outcome:** Bloom, motion blur, AI glow halo, and pooled particle effects. Merged at `d3f80862` in under an hour of execution time.

### Phase 4: Commercial UI & Audio (March 12, 22:50 - March 13, 09:38 EDT)

**Goal:** Build DOM-based menus (main menu, track select, settings), a commercial-grade PixiJS HUD (analog speedometer, mini-map with AI dot, position indicator), and a layered Web Audio engine sound system.

Phase 4 had the most diverse deliverables: DOM overlay infrastructure, three screen classes, a Settings module with per-field validation, a three-layer engine audio system (idle/mid/high RPM crossfade), an analog gauge HUD component, and a ScreenManager rewrite that bridged DOM and Canvas rendering. The Settings module shipped with its own test suite. The HUD added 21 new tests covering the analog gauge, AI minimap dot, and position indicator.

The ScreenManager required a full DOM hybrid rewrite (`52b034a1`) to handle the transition between DOM menu screens and PixiJS game rendering -- a complexity the plan anticipated but that required careful execution. Audio integration (`e730023e`) was the final step, wiring the SoundManager into game state transitions.

**Outcome:** The game looked and sounded commercial. Merged at `35b95287`.

### Phase 5: AI Retraining & Validation (March 13, 09:52 - 11:42 EDT)

**Goal:** Retrain the PPO AI on v04's redesigned tracks. Validate generalization: the AI must learn to drive, not memorize track polygons.

The training pipeline was copied verbatim from v02 -- proven infrastructure pointed at new track geometry. Phase 5 followed the three-step validation strategy from the spec: sanity run on Track 01 (oval, geometry frozen from v02), primary training on Track 03 (gauntlet), and cross-track validation on Track 02 (speedway). The AI trained from scratch -- no transfer learning from the v02 model.

The generalization audit was the headline result. The v02 ONNX model failed on v04's redesigned tracks (proving the redesign worked). The v04 model succeeded on Track 03 (proving training worked). Cross-track validation on Track 02 showed the AI could navigate a track it had never trained on -- genuine generalization, not memorization. The ONNX model exported at 24KB, well under the 50KB target. Par times were computed and embedded for the race UI.

**Outcome:** AI generalization proven. ONNX model exported. Merged at `17caab31`.

### Phase 6: Integration & Polish (March 13, 12:07 - 12:48 EDT)

**Goal:** Wire all phases together. Cross-phase integration, error handling, resilience testing, performance validation, and deployment configuration.

The final phase was the fastest -- 41 minutes from first commit to merge. Every previous phase had been integrated cleanly thanks to thorough upfront planning and deepen-plan corrections, so Phase 6 was connector code and validation rather than substantial new functionality. Cross-phase wiring (`d77dab6c`), resilience and performance testing (`2b66a65b`), and build verification passed on the first attempt. The build verification suite confirmed 487 tests passing plus 13 build checks green.

Post-merge, three production fixes addressed deployment concerns: crisp high-DPI graphics and ONNX path resolution in production builds (`85cff2ac`), COOP/COEP headers for WASM threading (`6ecbc087`), and favicon addition (`c02efb3d`).

**Outcome:** All phases integrated. 487/487 tests + 13/13 build verification. Deployed to Vercel. Merged at `5ad5aa2b`.

---

## Planning Depth: 375KB of Plans

The v04 build produced eight detailed phase plans totaling 375KB of structured documentation across the `docs/plans/` directory:

| Plan File | Phase | Size |
|-----------|-------|------|
| `phase-neg1-foundation-plan.md` | -1 | 11KB |
| `phase-0-asset-generation-plan.md` | 0 | 42KB |
| `phase-1-asset-pipeline-track-redesign-plan.md` | 1 | 50KB |
| `phase-2-core-visual-upgrade-plan.md` | 2 | 63KB |
| `phase-3-post-processing-effects-plan.md` | 3 | 45KB |
| `phase-4-commercial-ui-audio-plan.md` | 4 | 67KB |
| `phase-5-ai-retraining-validation-plan.md` | 5 | 38KB |
| `phase-6-integration-polish-plan.md` | 6 | 54KB |

These are not outlines. Each plan contains an enhancement summary from the deepen step, critical corrections discovered, proposed architecture, step-by-step implementation instructions, acceptance criteria, and risk analysis. Phase 0's plan, for example, documents the exact Imagen 4 SDK API signatures, enums, and response formats -- along with five critical corrections the deepen step caught (see "What Deepen Caught" below).

### What a Deepened Plan Looks Like

Every plan begins with a deepen enhancement summary listing the research agents used and the critical corrections they discovered. Phase 0's summary:

> **Research agents used:** architecture-strategist, security-sentinel, performance-oracle, kieran-typescript-reviewer, code-simplicity-reviewer, pattern-recognition-specialist, gemini-imagegen-skill, sharp-best-practices-researcher, framework-docs-researcher, repo-research-analyst

> **Critical Corrections Discovered:**
> 1. `negativePrompt` is NOT supported on Imagen 4 -- silently ignored by the API
> 2. Processing order bug -- plan had resize before chroma-key removal
> 3. `enhancePrompt` defaults to `true` -- will rewrite prompts via LLM
> 4. `numberOfImages` may default to 4 -- wastes 3x API quota per call
> 5. Imagen 3 was shut down November 2025 -- must target Imagen 4

Phase 3's summary identified six critical fixes, including GLSL syntax incompatibilities, incorrect PixiJS v8 imports, and a skid mark rendering technique that would have produced full-screen darkening. None of these would have surfaced in a linter or type checker. They required domain-specific knowledge of the PixiJS v8 filter API, WebGL shader language versions, and RenderTexture compositing behavior.

### What Deepen Caught

The deepen step's value is measured in bugs that never reached code. Across eight phases, the strike teams identified issues that would have required debugging time ranging from minutes to hours:

- **Imagen 4 API silent failures** (Phase 0) -- `negativePrompt` accepted but ignored; `enhancePrompt` rewrites prompts without warning
- **Image processing order** (Phase 0) -- resize before background removal contaminates edges permanently
- **GLSL version mismatch** (Phase 3) -- `varying`/`gl_FragColor`/`texture2D()` are WebGL1; PixiJS v8 defaults to `#version 300 es`
- **Missing PixiJS v8 export** (Phase 3) -- `DEFAULT_VERTEX` does not exist; correct import is `defaultFilterVert`
- **DropShadowFilter Y-flip** (Phase 3) -- offset is in filter local space, not screen space; Y-flip compensation required
- **Skid mark full-screen darkening** (Phase 3) -- semi-transparent black rect fills entire texture with opaque black over time
- **Unbounded sprite pool** (Phase 3) -- contradicted "bounded child count" acceptance criteria
- **Spectator mode rendering** (Phase 3) -- inherited gap where AI car sprite never updates

---

## Bug Detection Evidence

Bugs that reached code during the v04 build (post-March 11), with discovery method and resolution:

| Bug | Phase | How Found | How Fixed | Commit |
|-----|-------|-----------|-----------|--------|
| Asset generation pipeline failures | 0 | Runtime testing | Fix API call parameters, retry logic | `f1f82b12` |
| Car rendering crash on startup | 2 | Runtime testing | Fix sprite loading path for new manifest | `792cca25` |
| filterArea + multiply blend render clipping | 3 | Visual verification | Remove filterArea, change blend mode | `63b0d6bf` |
| Drop shadow not improving depth perception | 3 | Visual verification | Disable drop shadow, tune car size | `caa48d4d` |
| ScreenManager DOM/Canvas transition failures | 4 | Integration testing | Full DOM hybrid rewrite | `52b034a1` |
| Stale test references after audio wiring | 4 | Test suite | Update test fixtures | `e730023e` |
| Spectator/escape key handling | 4 | Manual testing | ScreenManager rewrite | `52b034a1` |
| ONNX path wrong in production builds | 6+ | Deployment testing | Fix asset path resolution | `85cff2ac` |
| Blurry graphics on high-DPI displays | 6+ | Visual verification | Set crisp rendering mode | `85cff2ac` |

Of the nine runtime bugs, zero were in categories the deepen step targets (API contract violations, architectural mismatches, algorithm errors). They were integration bugs -- the kind that only surface when components connect. The deepen step caught the design-level bugs; testing caught the wiring-level bugs. Both are necessary; neither is sufficient alone.

---

## CE vs GSD: Same Game, Different Methodology

v02 and v04 are the same game concept -- a top-down racing game with AI opponents, lap timing, and three tracks. v02 was built with GSD (Get Stuff Done) methodology. v04 was built with Compound Engineering. The frozen engine means the game logic is identical; only the build process, visual layer, and AI training differ.

| Dimension | v02 (GSD) | v04 (CE) |
|-----------|-----------|----------|
| **Build period** | Feb 27 - Mar 3, 2026 (5 days) | Mar 11 - Mar 13, 2026 (3 days) |
| **Commits** | 181 (active build period) | 56 (v04-specific) |
| **Planning artifacts** | `.planning/` folder, 1.4MB | `docs/plans/`, 375KB + playbook + brainstorm |
| **Planning structure** | GSD-generated specs, contexts, roadmap | CE brainstorm, 8 deepened plans, playbook |
| **Deepen step** | Covert (CE ran behind GSD without GSD knowing) | Native (runs on every plan, no exceptions) |
| **Test count** | 366+ engine tests | 487 tests + 13 build checks |
| **Evidence package** | 7 post-hoc documents (docx, xlsx, html) | Integrated into build process |
| **Commit discipline** | Feature commits + many fix commits | Atomic commits per plan task |
| **Docs written during build** | Issues log, build day summary | Plans, playbook, brainstorm, learnings, spec |

### Key Observations

**Planning depth is comparable but structured differently.** GSD produced 1.4MB of planning artifacts in its `.planning/` directory -- more raw volume than CE's 375KB of plans. But GSD's artifacts are structured around its own interview-driven workflow (contexts, requirements, roadmap, phase plans). CE's artifacts are structured around execution: each plan is a self-contained implementation guide with deepen corrections already incorporated. The difference is not volume but density -- CE plans are pre-debugged.

**The covert deepen step matters.** In v02, CE's deepen-plan was secretly refining GSD's plans. GSD produced the initial plan; CE's strike team stress-tested it. GSD never knew this was happening. In v04, CE plans and deepens its own work natively. The planning quality is at least as high, and arguably higher, because the deepen step was designed to refine CE-structured plans, not GSD's format.

**Commit discipline reflects methodology differences.** v02's 181 commits include many incremental fixes during active development -- the GSD approach of "build, test, fix, iterate" leaves a trail of correction commits. v04's 56 commits are more atomic: plan tasks map to commits, and the deepen step eliminated many of the bugs that would have produced fix commits.

**Serial planning with deepen-plan produced clean integration.** Phase 6 (integration) took 41 minutes in v04. Every previous phase integrated cleanly because all eight plans were created and deepened upfront before code execution began, giving architectural consistency across the full build. The deepen step caught 9 critical bugs pre-code. However, this serial approach meant the CE compound step (capturing lessons into `docs/solutions/` after each phase) was never executed -- the per-phase feedback loop described in the Playbook did not run as designed. Knowledge transfer happened organically through the plans themselves, not through formal compound artifacts.

---

## Tools and Infrastructure

### Context7: Live Framework Documentation

Context7 provides real-time access to framework documentation during code generation. For a PixiJS v8 build, this is critical -- filter APIs, container methods, and shader interfaces change between minor versions. Stale documentation (training data, cached docs) produces code that compiles but fails at runtime. Context7 pulls the current API surface, so filter chain code uses actual v8 signatures, not v7 patterns that happen to type-check.

Context7 earned its keep in Phase 3 (post-processing), where PixiJS filter APIs are the most version-sensitive.

### Serena: Semantic Code Understanding

Serena provides symbol-level code navigation -- find references, trace call chains, understand container hierarchies. For a project where the engine is frozen and the renderer must read (but never mutate) engine state, Serena enforces the architectural boundary by making cross-layer references immediately visible.

Serena earned its keep in Phase 2 (visual upgrade), where the renderer rebuild needed to trace every engine state access point.

### Sequential Thinking: Structured Reasoning

Sequential Thinking provides a scratchpad for multi-step reasoning problems. Filter chain ordering (bloom before or after motion blur?), displacement map UV animation timing, and training pipeline validation strategy all benefit from structured step-by-step analysis rather than single-pass generation.

Sequential Thinking earned its keep in Phase 3 (filter chain ordering) and Phase 5 (AI training validation strategy).

### Gemini Imagen 4: Autonomous Art Generation

The Gemini Imagen 4 API generated all 11 visual assets from text prompts. No human art tools, no browser-based generators, no manual intervention. The prompts are versioned in code (`scripts/asset-prompts.ts`), making asset generation reproducible and auditable. Re-running the script regenerates everything from the same prompts.

This is the visual autonomy claim: not just autonomous code, but autonomous art.

### Stable Baselines3 + ONNX: AI Training Pipeline

PPO training via Stable Baselines3 with ONNX export for browser inference. The training pipeline was proven in v02 and reused verbatim in v04 -- only the track geometry changed. The 24KB ONNX model runs inference in the browser via onnxruntime-web with WASM threading.

---

## Lessons Learned

### What Worked Well

**Deepen plan on every phase, no exceptions.** The CE Playbook mandated this as a non-negotiable rule for v04: "In future projects we may be more selective based on what we learn here, but v04 is the test build -- full blast, measure everything, then trim." The result: every phase plan was pre-debugged. The bugs that reached code were integration issues (components connecting wrong), not design issues (wrong approach entirely). The deepen step does not eliminate all bugs -- it eliminates the expensive ones.

**Frozen engine as architectural anchor.** The simulation engine was copied from v02 with zero modifications and 366+ passing tests. Every phase built on this foundation without risk of regression. The engine/renderer boundary -- renderer reads state, never mutates it -- was enforced by convention and verified by review. This architectural constraint simplified every decision: if a change required touching the engine, the answer was "find another way."

**Serial planning created architectural coherence.** All eight phase plans were written and deepened before code execution began. This was a deliberate deviation from CE's designed per-phase cycle (plan → execute → compound → plan next). The trade-off: the compound flywheel never spun (no `docs/solutions/` artifacts were created, and the learnings-researcher had nothing to search), but the upfront planning gave each phase full visibility into what every other phase needed. Phase 0's Gemini API corrections (from deepen-plan, not compound) were already baked into Phase 1's plan. Phase 3's deepen-plan corrections were written with knowledge of Phase 2's container hierarchy design. By Phase 6, the accumulated planning coherence meant integration took 41 minutes.

### What Was Harder Than Expected

**Post-processing filter attachment.** Phase 3 was the most technically challenging phase despite being one of the shortest in execution time. The interaction between PixiJS v8 filters, the container hierarchy, camera Y-flip, and RenderTexture compositing created a combinatorial space where small changes produced surprising visual results. The deepen step caught the design-level issues (GLSL syntax, missing exports), but the visual tuning (filterArea clipping, drop shadow ineffectiveness) required runtime iteration.

The Phase 3 learnings document (`docs/Phase-3-Post-Processing-Learnings.md`) documents these issues in detail. Note: this was written as pre-execution research before Phase 3 began, not as a post-execution compound artifact -- the compound step was never run during the v04 build. Key lesson from that document: "each filter adds a render pass" is theoretically true but practically misleading -- PixiJS uses ping-pong textures (2 temp RTs max for N filters on the same container), so the actual VRAM cost is lower than naive analysis suggests.

**ONNX browser paths in production.** The ONNX runtime requires WASM files served with specific headers (COOP/COEP for SharedArrayBuffer). Development mode worked fine; production builds broke because Vite's asset pipeline moved the WASM files and the path resolution failed. This required a custom Vite plugin for development and explicit Vercel header configuration for production. Three post-merge commits (`85cff2ac`, `6ecbc087`) addressed this -- a reminder that deployment configuration is its own engineering domain.

**DOM/Canvas hybrid UI.** Phase 4's menus are DOM overlays (HTML/CSS over the PixiJS canvas) while the HUD is PixiJS-native. The ScreenManager rewrite (`52b034a1`) was necessary because the transition between DOM screens and Canvas rendering had edge cases the plan did not fully anticipate: z-index management, focus handling, and escape key routing between the two layers.

### What We Would Do Differently

**Performance gate after each filter, not after P1.** The plan called for a performance gate after P0+P1 filters were combined. In practice, each individual filter should be profiled independently before combining. The filterArea clipping bug (`63b0d6bf`) would have been caught earlier with per-filter visual verification.

**Deployment configuration as an explicit phase task.** The three post-merge production fixes (ONNX paths, COOP/COEP headers, high-DPI rendering) were all deployment concerns that could have been addressed in Phase 6's plan. Future builds should include "production deployment verification" as a first-class plan step, not a post-merge cleanup.

**DOM/Canvas bridging complexity was underestimated.** The ScreenManager rewrite was the most significant unplanned work in the build. In a per-phase CE cycle, a compound step after Phase 2 could have captured the DOM/Canvas transition complexity for Phase 4's plan. In our serial planning approach, this gap existed because Phase 4 was planned before Phase 2's execution revealed the real complexity.

---

*Cross-reference: [evidence-package.md](evidence-package.md) for metrics, [technical-architecture.md](technical-architecture.md) for architecture details.*
