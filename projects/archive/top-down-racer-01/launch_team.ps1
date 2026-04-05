# launch_team.ps1 — Launch Claude Code with Agent Teams
# Run from: C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01\
#
# Usage:
#   .\.venv\Scripts\Activate.ps1
#   .\launch_team.ps1

$env:CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"

claude -p @"
Read CLAUDE.md and README.md carefully. Build Phase 1 using an agent team.

TEAM STRUCTURE (from CLAUDE.md):
- You are the Team Lead. Use DELEGATE MODE — coordinate and review only, do NOT write code.
- Spawn 4 teammates: Foundation Agent, Track Agent, Car & Physics Agent, Integration Agent
- Each agent role and its files are defined in the Agent Team Configuration section of CLAUDE.md

EXECUTION ORDER:
1. Foundation Agent goes first (configs/default.yaml, game/__init__.py, creates BUILD_LOG.md)
2. Track Agent + Car & Physics Agent work IN PARALLEL after config exists
3. Integration Agent starts LAST after Track + Car & Physics deliver their files
4. After all agents finish, run python main.py to verify everything works

RULES:
- Every agent MUST write to BUILD_LOG.md per the Build Journal section in CLAUDE.md
- Require each agent to submit a plan before implementing
- Review plans before approving
- If python main.py fails, assign bug fixes to the appropriate agent

The end result: a playable game with WASD + spacebar drift, wall damage, camera follow, HUD, and completable laps.
"@

Write-Host ""
Write-Host "Agent team session complete." -ForegroundColor Green
