# 🚀 Quick Start — Top-Down Racer 01

## Step 1: Prep the Project Folder

Copy these files into `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01\`:

```
CLAUDE.md           ← The master blueprint (agents read this automatically)
README.md           ← Project overview
requirements.txt    ← Dependencies
.claude/
  settings.json     ← Enables Agent Teams automatically
```

Then ask Harry to handle the housekeeping:
```
- pip install numpy pyyaml
- Create empty directories: game/, ai/, assets/, configs/
- Create game/__init__.py and ai/__init__.py (empty files)
```

## Step 2: Launch in VS Code

1. Open VS Code in `top-down-racer-01/`
2. Make sure your `.venv` is the active Python interpreter
3. Open Claude Code (sidebar or Ctrl+Shift+P → "Claude Code")
4. Paste this prompt:

---

**THE PROMPT — copy/paste this into Claude Code:**

```
Read CLAUDE.md and README.md. Build Phase 1 using an agent team.

You are the Team Lead — use delegate mode (coordinate only, do NOT write code).

Spawn 4 teammates as defined in CLAUDE.md's Agent Team Configuration:
1. Foundation Agent → configs/default.yaml, game/__init__.py, BUILD_LOG.md
2. Track Agent → game/track.py
3. Car & Physics Agent → game/car.py, game/physics.py
4. Integration Agent → game/renderer.py, game/camera.py, game/hud.py, main.py

Execution: Foundation first, then Track + Car & Physics in parallel, then Integration last.

Every agent MUST log their work to BUILD_LOG.md per the journal format in CLAUDE.md.
Require plans before implementation. After all agents finish, run python main.py to verify.
```

---

## Step 3: Watch the Magic

You'll see 4 agents spawn and start building in parallel. The Team Lead coordinates.

## Step 4: Play

```powershell
python main.py
```

WASD to drive. SPACE to drift. Try not to die. 🏎️

## Step 5: Read the Build Journal

Open `BUILD_LOG.md` — this is the "holy fuck look what the minions did" file.
Every agent logs what they built, why they made the decisions they did, and any problems they hit.

## Alternative: Terminal Launch

If you prefer terminal over VS Code:
```powershell
cd C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01
.\.venv\Scripts\Activate.ps1
.\launch_team.ps1
```
