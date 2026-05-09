---
aliases: [tic-tac-toe, ttt]
tags: [project, complete]
---

# Tic-Tac-Toe

**Status: COMPLETE** — our very first project. Built in a single session on Feb 21, 2026.

A retro arcade-cabinet tic-tac-toe with CRT scanlines, vignette effects, and three AI difficulty tiers powered by minimax with alpha-beta pruning. No dependencies — just open `index.html` and play.

## Fully Autonomous SDLC

This project is an exercise in **fully autonomous software development**. Every line of code, every style, every test — produced entirely by AI agents (Claude Code). Briggsy is ATC (Air Traffic Control) — he directs, reviews, and approves. He doesn't write code, draw art, or run commands. The agents fly the plane. 33 tests covering all game logic.

## Features

- **3 AI difficulty tiers** — Easy (random), Medium (blocks + takes wins), Hard (unbeatable minimax)
- **CRT arcade cabinet aesthetic** — scanlines, vignette, retro font
- **Winning line animation** — highlights the winning combo
- **Zero dependencies** — vanilla JS, HTML5, CSS. Opens from `file://`

## Controls

| Input | Action |
|-------|--------|
| Click a cell | Place your X |
| Difficulty selector | Switch AI level |

## Tech

- **Minimax with alpha-beta pruning** — Hard mode is mathematically unbeatable
- **87 lines of game logic** — clean separation from UI (game-logic.js / game.js)
- **33 Jest tests** — win detection, minimax scoring, AI move selection across all difficulties

## Files

```
tic-tac-toe/
  index.html      — Open this to play
  css/style.css   — CRT arcade cabinet styling
  js/game-logic.js — Pure game logic (87 lines, testable)
  js/game.js      — UI + DOM wiring (354 lines)
  tests/game.test.js — 33 Jest tests
```
