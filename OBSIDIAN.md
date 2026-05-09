# Obsidian Vault Setup

This repo doubles as an Obsidian vault. Code stays code; markdown becomes a knowledge graph.

## How to open it

1. Open Obsidian.
2. Click **Open folder as vault** (or, on the welcome screen, "Open folder as vault").
3. Pick `C:\Users\brigg\ai-learning-journey`.
4. Trust the vault when prompted.
5. Open `_HOME.md` — that's your map of content (MOC).

## What's been configured

- `.obsidian/app.json` — ignore filters for `node_modules/`, `.git/`, `dist/`, build artifacts, lockfiles, etc. so Obsidian's search and graph stay clean.
- `.obsidian/core-plugins.json` — sensible defaults: file explorer, search, quick switcher, graph, backlinks, daily notes, templates, command palette, bookmarks.
- `.obsidian/appearance.json` — basic appearance.
- `_HOME.md` — your home / Map of Content.
- `OBSIDIAN.md` — this file.

The repo is unchanged otherwise. No code was touched.

## Conventions

- **Wikilinks over Markdown links.** Use `[[note-name]]` instead of `[text](path)`. Obsidian will resolve them and update them when you rename files.
- **MOCs > deep folders.** Don't agonize over folder structure. Build "Maps of Content" — pages like `_HOME.md` that link to the things you care about. Folders are for storage; MOCs are for navigation.
- **Daily notes live in `daily/YYYY-MM-DD.md`.** Use `Ctrl+P` → "Open today's daily note".
- **Tags work.** Use `#tag` inline or in YAML frontmatter. Try `#moc`, `#decision`, `#lesson`, `#research`.
- **Filenames matter.** Obsidian uses filenames as link targets. Renaming a note auto-updates inbound links because `alwaysUpdateLinks` is on.
- **Aliases for navigation.** Project READMEs and playbook docs have `aliases: [...]` in frontmatter. `Ctrl+O → "UMB"` lands on the UMB README; `"10 commandments"` finds `principles.md`. Add aliases to any new doc you'll want to jump to by short name.

## Navigation cheat sheet

- **`Ctrl+O`** — Quick Switcher. Type a filename or alias, hit Enter to open. **Watch out:** if there's no match, Enter creates a new empty note with whatever you typed. Hit Escape if you mistyped.
- **`Ctrl+P`** — Command Palette. Run any command (open daily note, toggle sidebar, etc.).
- **File explorer (left sidebar)** — for browsing folders. Use this when you want to *traverse* the vault, not jump to a specific file.
- **Backlinks pane (left sidebar)** — open any note and see every other note linking to it.
- **Graph view (left sidebar, connected-dots icon)** — visualize the whole vault as a node graph. Useful for spotting orphan notes and over-connected hubs.

## File explorer clutter

`.obsidian/app.json` has `userIgnoreFilters` listing `node_modules/`, `dist/`, `.venv/`, etc. **What that filter actually does:**

- Excludes those paths from **search** results.
- Excludes them from the **graph view**.
- **Greys them out** in the file explorer — but they're still visible.

To **fully hide** them from the explorer, install the **File Hider** community plugin:

1. `Ctrl+,` (Settings) → Community plugins → **Browse**.
2. Search "File Hider" → Install → Enable.
3. In its settings, paste the same patterns from `userIgnoreFilters`.

Until the plugin is installed, the file explorer will look noisy. That's cosmetic only — search and graph are still clean.

## Working with Claude / Cowork

You can ask Claude to maintain this vault directly. Examples that work:

- "Add a new note in `briggsy-playbook/` summarizing the lessons from today's session."
- "Find all CLAU