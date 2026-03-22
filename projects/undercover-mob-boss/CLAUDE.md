# Undercover Mob Boss — Build Instructions

## Project Type
TypeScript browser game (PWA) with PartyKit multiplayer.
1940s noir social deduction game — digital adaptation of Secret Hitler (CC BY-NC-SA 4.0).

## Tech Stack
- **Build:** Vite 8 + TypeScript 5.9
- **Testing:** Vitest 4
- **Multiplayer:** PartyKit (added in Phase 2)
- **Assets:** Gemini Imagen 4 (pre-generated)
- **Audio:** Gemini 2.5 Flash TTS (pre-generated)
- **Hosting:** Vercel

## Commands
```bash
pnpm install              # install dependencies
pnpm run dev              # start vite dev server (Phase 1+)
pnpm run build            # production build (Phase 1+)
pnpm run test             # run vitest (Phase 1+)
pnpm run typecheck        # tsc --noEmit
pnpm run generate-assets  # generate visual assets via Imagen 4
pnpm run generate-narrator # generate narrator audio via Gemini TTS
```

## Key Directories
- `src/client/` — browser-side code (views, audio, state)
- `src/server/` — PartyKit server (room logic, game engine)
- `src/shared/` — types shared between client + server
- `public/assets/` — AI-generated images (committed to git)
- `public/audio/` — pre-generated narrator WAVs (committed to git)
- `scripts/` — asset generation pipelines (Imagen 4, Gemini TTS)
- `assets/raw/` — raw Imagen outputs before processing (gitignored)

## Environment Variables
See `.env.example`. Requires:
- `GEMINI_API_KEY` — Gemini API with billing enabled (used for both Imagen 4 assets and TTS narrator)

## Architectural Decisions
- See `docs/spec/SPEC.md` for full spec (LOCKED)
- See `docs/user/HOW-TO-PLAY.md` for player-facing rules
- Host device is authoritative (ADR-04)
- Pre-generated audio via Gemini TTS, not runtime TTS (ADR-02)
- All assets AI-generated via Imagen 4 (ADR-05)
- Narrator uses Gemini 2.5 Flash TTS with Charon voice + noir style prompting

## Stitch (Design Tool) — READY (restart required)
- **MCP server:** `stitch-mcp` v1.3.2 via npx — configured in `.mcp.json`
- **Auth:** Google Cloud ADC (briggsy007@gmail.com), project `gen-lang-client-0231949914`
- **gcloud path:** `C:\Users\brigg\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin` (not on system PATH — `.mcp.json` injects it)
- **Config:** `.mcp.json` in project root (gitignored)
- **Tools:** `extract_design_context`, `fetch_screen_code`, `generate_screen_from_text`, `edit_screens`
- **Prompt format:** 3-layer structure — Anatomy (layout) + Vibe (aesthetic) + Content (data)
- **If auth expires:** Run `gcloud auth application-default login` from the gcloud path above

## Design Workflow (MANDATORY)
When Stitch is available for a UI task:
1. Generate in Stitch
2. Show Briggsy the screenshot (save to `temp/` or use Playwright)
3. Iterate in Stitch until Briggsy approves the composition
4. ONLY THEN write code — translate the Stitch output into our design tokens and imperative DOM
- **Never hand-code a UI layout without an approved Stitch design.**
- **Never dismiss a Stitch output as "mediocre" and go rogue.** Iterate the prompt instead.
- **Stitch is for composition, not production code.** It outputs Tailwind CDN — we translate to our system.

## Screenshots (MANDATORY)
Briggsy shares screenshots by saving them to the **project's `temp/` folder** (`C:\Users\brigg\ai-learning-journey-private\projects\undercover-mob-boss\temp\`). When he mentions a screenshot, image, or says "look at this" — immediately read the most recent image file from `temp/`. **Never ask him to paste or share a path.** Pasting images into the CLI is not supported. Just check `temp/`.

## Autonomy (CARDINAL RULE)
Briggsy is ATC. Claude is the pilot. Briggsy directs and reviews — Claude executes EVERYTHING. Never ask Briggsy to run a command, copy a file, or do any manual step.
- **Scripts needing API keys:** Always `set -a && source .env && set +a` before running. The `.env` file exists. Don't ask — just load it.
- **If something fails:** Fix it yourself. Don't punt to the user.
- **If something can't be automated:** Flag it as a blocker, don't make it a manual step.

## NO COMPROMISES (NASA STANDARD)
The goal is a PERFECT game. Not "good enough," not "we'll fix it later." PERFECT.
Treat every decision as if screw-ups have grave consequences. Quality is the job, not completion.
- **If a tool needs a restart to work — restart.** Write the TODO and restart. Don't work around it.
- **If the design isn't stunning — redesign it.** Don't bolt polish onto bad bones.
- **If the quality isn't there — stop and fix it.** Never ship something that isn't the best it can be.
- **Never cut corners to reach a finish line.** The job is the quality, not the completion.
- **Never race to the next task.** Finishing fast with defects is worse than finishing slow with integrity.

## Contradictions Mean STOP (MANDATORY)
When two sources give conflicting information — that IS the problem. Resolve it before moving on.
- **Example:** Deferred tools list says "no Stitch tools" but CLI says "Connected" — don't pick the convenient answer. Stop. Figure out why they disagree.
- **If a prerequisite check fails:** Do NOT proceed to the next priority. Fix the prerequisite.
- **If a prerequisite check gives ambiguous results:** Do NOT assume success. Confirm with certainty.
- **The finish line is irrelevant if the foundation is broken.** A session spent fixing tooling is a session well spent. A session spent building on a broken foundation is a session wasted.

## Change Verification (MANDATORY)
Before saving any code change and before telling Briggsy to test:
1. **Trace the execution path** — follow the change through the call chain. What calls what? What are the preconditions? What silently fails?
2. **Ask "why did the old code do it this way?"** — if you're removing something, understand its purpose first. A setTimeout, a flag, a check — it's there for a reason.
3. **Run typecheck** — `pnpm run typecheck` must pass before Briggsy touches the browser.
4. **Never use Briggsy as QA.** If you're not confident the change works, say so. Don't tell him to test and hope.

## Session Protocol
- **Start of session:** Read `TODO.md`, verify state against reality (git status, check files exist), and present the plan. Wait for approval before working.
- **End of session:** When Briggsy says "write the TODO" or "update the TODO", update `TODO.md` with: what we did, current state, unfinished fixes, next steps in priority order, and landmines.
- **Unfinished Fixes must be prescriptions, not diagnoses.** Write the exact file, line, and change needed — not "race condition suspected." If you can't write the exact fix, fix it before the session ends.

## Tool Preferences (MCP Servers)
- **Code navigation:** prefer Serena (`find_symbol`, `get_symbols_overview`, `find_referencing_symbols`) over Grep for exploring code structure, tracing call chains, and understanding symbol relationships
- **Library APIs:** verify with Context7 before guessing behavior — especially Playwright, GSAP, PartyKit, and Vite APIs
- **Multi-step debugging:** use Sequential Thinking for chains with more than 2 layers of causation (e.g. element detach → timeout → page closed)

## Conventions
- Use Mermaid for technical diagrams
- All prompts versioned in `scripts/` (never regenerate without prompt changes)
- Sequential API calls with delays (rate limit safety)
- Chroma-key BEFORE resize (prevents color bleeding)
