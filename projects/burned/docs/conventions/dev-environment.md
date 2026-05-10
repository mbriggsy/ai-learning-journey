---
title: Dev environment
type: conventions
date: 2026-05-09
---

# Dev environment

Rules for the local dev loop, debugging, dev hooks, and tooling. Read when setting up dev, debugging a stuck server, or wiring up new dev infrastructure.

## Dev launcher

- **`pnpm dev:launch`** uses Chrome's positional-URL multi-tab mode. `chrome.exe [flags] url1 url2 url3`. Popup blocker irrelevant. If you re-introduce browser-side spawning, the isolated `.chrome-dev-profile/` re-blocks popups.
- **Lobby debug toolbar was removed.** Don't restore Whiskrs/Mittens/Tuna/Pickles quick-join `<a>` strip. `pnpm dev:launch` owns dev-time spawning.
- **Dev launcher popup throttling.** User gesture must remain active; don't `setTimeout` `window.open` calls.

## Detector tooling

- **Layout-sweep detector only flags `overflow: hidden|clip`.** Elements with `overflow: visible` don't clip — pseudo-elements with negative `inset`, focus rings, tooltips extend by design. Flagging `visible` re-surfaces ~57 false positives.

## Dev hooks (DEV-only, tree-shaken from prod)

- **`window.__gameStore` dev hook.** Guarded by `import.meta.env.DEV`. Tree-shaken from prod — `E-03` regression test greps `dist/**/*.js` for the string.
- **`window.__testInjectEvent(event)` dev hook.** Same guard, same tree-shake. Pushes a synthetic `GameEvent` into `accumulatedEvents` + notifies — DramaOverlay/PlayerAlert/StealReport fire their real motion pipeline without needing a multi-player game flow to reach a specific moment. Used by `drama-beat-timing.spec.ts`. Verified by `verify-prod-bundle.ts` sentinel.

## MCP & instrumentation

- **`chrome-devtools-mcp` wired in `.mcp.json`.** Sits alongside the 11 Playwright seats; loads on Claude Code session start. CDP-level access (perf traces, heap snapshots, real-device remote attach, network/CPU throttling) — fills the gap Playwright wraps but doesn't expose. Use it for *quantitative motion / memory / perf* work that DOM-state polling can't see. Eye-in-loop motion calibration was the original driver.

## Git topology

- **`projects/burned/` is NOT a standalone repo.** It's a subdirectory of the `ai-learning-journey/` monorepo. The git index is shared with every other project (`undercover-mob-boss/`, `briggsy-playbook/`, etc.) plus root-level config (`.mcp.json`, `.gitignore`, vault files). Running `git status` from `burned/` shows parent-tree files with `../../` path prefixes — easy to skim past as "not my concern" but the index treats them as ordinary staged entries.
- **Pre-staged blast radius.** A prior session can leave the index dirty with staged changes that have nothing to do with the current work. `git commit` will sweep ALL of them — yours plus the leftovers — into one commit. Caught 2026-05-09: a 6-file drift fix shipped as a 67-file commit because parent-tree Obsidian + playbook deletions were already staged. Reset-soft + selective re-stage cleans it up *if* you catch it before pushing.
- **Pre-commit checklist.** Before `git commit`: run `git diff --cached --name-only | wc -l` and confirm the count matches what you staged. If the number's surprising, run `git diff --cached --name-only` and look. Don't commit blind.

## Recovery

- **`.chrome-dev-profile/` is gitignored.** Delete to reset dev Chrome profile.
- **Wrangler local SQLite corruption recovery.** `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`.
- **Over-staged commit (not yet pushed).** `git reset --soft HEAD~1` to undo the commit while keeping every file's stage state intact. Then `git reset` (no args) to unstage everything, `git add` your intended files by name, re-commit. File contents preserved throughout; only staging state moves.
