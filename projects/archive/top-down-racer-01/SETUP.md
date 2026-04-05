# 🏎️ Top-Down Racer 01 — Setup Summary

**Date:** 2026-02-22  
**Prepared by:** Harry 🧙 (your OpenClaw wizard)

---

## 🎯 Project Goal

Build a top-down racing car game with a panning camera using:
- **Python + Arcade** for the game engine
- **CrewAI** for multi-agent orchestration (agents building the game!)
- **Anthropic Claude API** as the brain behind the agents

The philosophy: **over-engineer on purpose.** This is a learning lab, not a shipping product. We want to try every approach and build an arsenal of knowledge.

---

## 🧱 What We Built

### Project Location
```
C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01\
```

Sits alongside your existing projects (`pacman`, `tic-tac-toe`).

### Virtual Environment
```
top-down-racer-01\.venv\   ← Python 3.12 isolated environment
```

All dependencies are sandboxed here — nothing pollutes your global Python.

---

## ⚙️ The Journey (and the Pain)

### Step 1: Checked existing Python
You had **Python 3.14.3** installed — bleeding edge. Too new for the ecosystem.

### Step 2: Tried installing CrewAI on Python 3.14
**Failed.** Two packages (`tiktoken`, `regex`) needed Rust to compile from source and used `pyo3` bindings that only support up to Python 3.12.

### Step 3: Installed Rust
```
winget install Rustlang.Rustup
```
Installed **Rust 1.93.1** via rustup. Required to compile Rust-based Python packages.

Even with Rust, `tiktoken` succeeded but `regex` still failed — the C code in that version was incompatible with Python 3.14 headers.

### Step 4: Installed Python 3.12 alongside 3.14
```
winget install Python.Python.3.12
```
Installed **Python 3.12.10**. Your Python 3.14 is untouched — they coexist peacefully.

### Step 5: Created a Python 3.12 virtual environment
```powershell
cd C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01
py -3.12 -m venv .venv
```

### Step 6: Installed all dependencies into the venv
```powershell
.\.venv\Scripts\pip install crewai anthropic python-dotenv arcade
```

This time it worked — Python 3.12 has full prebuilt wheel support for everything. Got **crewai 1.9.3** (vs the ancient 0.11.2 on 3.14).

---

## ✅ Final Stack

| Package | Version | Purpose |
|---|---|---|
| Python | 3.12.10 | Runtime (in venv) |
| arcade | 3.3.3 | Game engine + camera |
| pymunk | 6.9.0 | Physics (auto-installed with arcade) |
| crewai | 1.9.3 | Multi-agent orchestration |
| anthropic | 0.83.0 | Claude API SDK |
| python-dotenv | 1.1.1 | API key management via .env |
| Rust | 1.93.1 | System-level (needed for some compiled packages) |

---

## 🚀 How to Activate the Environment

Every time you open a new terminal to work on this project:

```powershell
cd C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01
.\.venv\Scripts\Activate.ps1
```

Your prompt will change to show `(.venv)` — that means you're in.

To deactivate:
```powershell
deactivate
```

---

## 🔑 Next Steps

1. **Add your Anthropic API key** — create a `.env` file:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Set up the CrewAI agent team** — define roles:
   - 🏗️ Architect Agent — designs the game structure
   - 💻 Coder Agent — writes the Python/Arcade code
   - 🧪 Tester Agent — validates and debugs
   - 🎨 Designer Agent — handles assets and layout

3. **Build `top-down-racer-01`** — let the agents loose

4. **Learn, iterate, spin up `top-down-racer-02`** with a different approach

---

## 💡 Lessons Learned

- Python 3.14 is too bleeding-edge for most of the AI/ML ecosystem (2026-02-22)
- Always use a **virtual environment** per project — avoids version hell
- CrewAI 1.9.3 (on Python 3.12) is significantly better than 0.11.2
- Rust is now a prerequisite for many Python packages — worth having installed
- `py -3.12` lets you target specific Python versions on Windows when multiple are installed

---

*Harry 🧙 — wizard in training, getting better at this every session*
