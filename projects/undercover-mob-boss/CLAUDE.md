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
- **Hosting:** Vercel (client) + Cloudflare Workers via PartyKit (server)

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

## Deployment
- **Client (Vercel):** Auto-deploys on every push to main. No config needed.
- **Server (PartyKit):** Auto-deploys via GH Actions when `src/server/`, `src/shared/`, or `partykit.json` changes on main.
  - Workflow: `.github/workflows/deploy-partykit.yml` (monorepo root, NOT project root)
  - Secrets: `PARTYKIT_TOKEN`, `PARTYKIT_LOGIN` (configured in GitHub repo settings)
  - Manual fallback (only if GH Actions is broken): `pnpm run partykit:deploy`
- **Both are fully automatic. No manual deploy step needed.**

## Key Directories
- `src/client/` — browser-side code (views, audio, state)
- `src/server/` — PartyKit server (room logic, game engine)
- `src/shared/` — types shared between client + server
- `public/assets/` — AI-generated images (committed to git)
- `public/audio/` — pre-generated narrator OGGs (committed to git)
- `scripts/` — asset generation pipelines (Imagen 4, Gemini TTS)
- `assets/raw/` — raw Imagen outputs before processing (gitignored)
- `videos/trailer/` — Remotion video project (cinematic trailer, separate pnpm workspace)

## Environment Variables
See `.env.example`. Requires:
- `GEMINI_API_KEY` — Gemini API with billing enabled (used for both Imagen 4 assets and TTS narrator)

## Architectural Decisions
- See `docs/v1/spec/SPEC.md` for V1 spec (LOCKED)
- See `docs/v2/spec/SPEC.md` for V2 spec (LOCKED)
- See `docs/shared/user/HOW-TO-PLAY.md` for player-facing rules (source)
- See `public/how-to-play.html` for the rendered player-facing page (GSAP-animated)
- Host device is authoritative (ADR-04)
- Pre-generated audio via Gemini TTS, not runtime TTS (ADR-02)
- All assets AI-generated via Imagen 4 (ADR-05)
- Narrator uses Gemini 2.5 Flash TTS with Charon voice + noir style prompting

## Screenshots (MANDATORY)
Briggsy shares screenshots by saving them to the **project's `temp/` folder** (`C:\Users\brigg\ai-learning-journey\projects\undercover-mob-boss\temp\`). When he mentions a screenshot, image, or says "look at this" — immediately read the most recent image file from `temp/`. **Never ask him to paste or share a path.** Pasting images into the CLI is not supported. Just check `temp/`.

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
- **Example:** A tool list says "not available" but another source says "connected" — don't pick the convenient answer. Stop. Figure out why they disagree.
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
- **Start of session:** Read `TODO.md`, then **verify every claim against reality before presenting the plan:**
  - Every "remaining work" item: grep/read the code to confirm it's actually undone
  - Every landmine: check if the condition still exists
  - Every branch reference: `git branch -a` to confirm it exists and isn't already merged
  - Cross off or update anything that's stale IN the TODO before presenting
  - Only then: present the verified plan. Wait for approval before working.
- **End of session:** When Briggsy says "write the TODO" or "update the TODO", update `TODO.md` with: what we did, current state, unfinished fixes, next steps in priority order, and landmines.
- **Unfinished Fixes must be prescriptions, not diagnoses.** Write the exact file, line, and change needed — not "race condition suspected." If you can't write the exact fix, fix it before the session ends.
- **"Squeaky clean"** — Briggsy's signal for full end-of-session cleanup. Execute all of:
  1. Update `TODO.md` (if not already done)
  2. Run typechecks (game + trailer)
  3. Verify git status — only expected files changed
  4. Delete contents of `temp/` (keep the folder)
  5. Delete any other temporary files/folders created during the session
  6. Commit all changes with a descriptive message
  7. Push to origin

## Tool Preferences (MCP Servers)
- **Code navigation:** prefer Serena (`find_symbol`, `get_symbols_overview`, `find_referencing_symbols`) over Grep for exploring code structure, tracing call chains, and understanding symbol relationships
- **Library APIs:** verify with Context7 before guessing behavior — especially Playwright, GSAP, PartyKit, and Vite APIs
- **Multi-step debugging:** use Sequential Thinking for chains with more than 2 layers of causation (e.g. element detach → timeout → page closed)

## Git
- CRLF warnings suppressed (`core.safecrlf=false`) — autocrlf still converts correctly, just no noise

## Conventions
- Use Mermaid for technical diagrams
- All prompts versioned in `scripts/` (never regenerate without prompt changes)
- Sequential API calls with delays (rate limit safety)
- Chroma-key BEFORE resize (prevents color bleeding)
