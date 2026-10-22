# 🦞 OpenClaw Session 2 — Harry Gets a Brain

**Session Date:** February 21, 2026  
**Machine:** Windows (Native — no WSL2)  
**OpenClaw Version:** 2026.2.21-2

---

## Overview

Two outstanding issues from Session 1 were resolved: the Windows Scheduled Task auto-start failure and the missing memory/semantic search configuration. Harry now boots himself on login and has persistent cross-channel memory powered by OpenAI embeddings.

---

## Fix 1: Windows Scheduled Task Auto-Start

### Root Cause

The Scheduled Task created by the OpenClaw installer was missing a `WorkingDirectory` value in its action. The gateway.cmd script uses relative paths and couldn't find its dependencies when launched without a working directory context.

**Diagnosed with:**
```powershell
$task = Get-ScheduledTask | Where-Object {$_.TaskName -like "*openclaw*"}
$task.Actions | Format-List *
# WorkingDirectory was blank — confirmed root cause
```

### Fix

Nuked the broken task and recreated it properly in PowerShell **(must run as Administrator)**:

```powershell
Unregister-ScheduledTask -TaskName "OpenClaw Gateway" -Confirm:$false

$action = New-ScheduledTaskAction `
    -Execute "C:\Users\brigg\.openclaw\gateway.cmd" `
    -WorkingDirectory "C:\Users\brigg\.openclaw"

$trigger = New-ScheduledTaskTrigger -AtLogon -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit 0

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName "OpenClaw Gateway" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force
```

### Verification

Rebooted machine — Harry was online in Discord with zero manual intervention. ✅

---

## Fix 2: Memory / Semantic Search (OpenAI Embeddings)

### Overview

Harry's memory system allows him to recall information across conversations and across channels. Without an embedding provider, every conversation started from scratch — goldfish mode. With it configured, Harry retains and semantically searches everything you tell him.

### Step 1: Get an OpenAI API Key

1. Go to **https://platform.openai.com/api-keys**
2. Create a new key — name it something like "Harry"
3. Copy it immediately — only shown once
4. Add $10 credit at **Settings → Billing** (lasts essentially forever at personal use scale)

> ⚠️ **Security Note:** Never paste your API key into a chat window, Claude or otherwise. Revoke and regenerate immediately if exposed.

### Step 2: Configure the Embedding Provider

```powershell
openclaw config set agents.defaults.memorySearch.provider openai
```

### Step 3: Set the API Key as a Machine-Level Environment Variable

Must be run in **PowerShell as Administrator**:

```powershell
[System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-your-key-here", "Machine")
```

Machine-level is required so the Scheduled Task process picks it up on boot.

### Step 4: Reboot

A full reboot is required for Machine-level environment variables to propagate to the Task Scheduler service.

### Step 5: Wire Up OpenAI Skills (Optional but Recommended)

During `openclaw config --section skills`, say Yes to the `OPENAI_API_KEY` prompts for `openai-image-gen` and `openai-whisper-api`. This unlocks additional eligible skills.

### Verification

```powershell
openclaw memory status --deep
```

Expected healthy output:
```
Provider: openai (requested: openai)
Model: text-embedding-3-small
Embeddings: ready
Vector: ready
FTS: ready
```

Also confirmed via `openclaw doctor` — Memory search warning completely gone. ✅

### Real-World Test

Told Harry about a bourbon preference via the browser UI at http://127.0.0.1:18789. Then switched to Discord and asked him about it cold. Harry recalled it instantly, cross-channel. Memory is working exactly as intended.

---

## Updated Key Commands Reference

| Command | Purpose |
|---|---|
| `openclaw gateway start/status` | Start and check gateway |
| `openclaw doctor` | Full health check |
| `openclaw doctor --fix` | Health check with auto-fix |
| `openclaw configure` | Interactive setup wizard |
| `openclaw config --section skills` | Configure skills and API keys |
| `openclaw config set <key> <value>` | Update config by dot path |
| `openclaw memory status --deep` | Check memory/embedding health |
| `openclaw channels status --probe` | Check channel health |
| `openclaw dashboard` | Open browser UI at http://127.0.0.1:18789/ |
| `Stop/Start-ScheduledTask -TaskName "OpenClaw Gateway"` | Restart gateway via task |

---

## Current Status

- ✅ OpenClaw v2026.2.21-2 installed on Windows native
- ✅ Gateway auto-starts on boot via Windows Scheduled Task (FIXED)
- ✅ Browser dashboard working at http://127.0.0.1:18789/
- ✅ Harry the wizard online in Discord (Harry's Lair server)
- ✅ Agent model: anthropic/claude-sonnet-4-6
- ✅ Memory/semantic search fully operational (FIXED)
- ✅ OpenAI embeddings configured (model: text-embedding-3-small)
- ✅ Cross-channel memory verified — browser → Discord recall working

---

## Next Steps / Future Work

1. Explore Harry's skills — web browsing, email, calendar, file management
2. Teach Harry useful persistent context (preferences, routines, people)
3. Consider adding Telegram as a second messaging channel
4. Investigate the 44 skills with missing requirements — see what's worth unlocking

---

*Generated by Claude (claude.ai) • Session summary for AI learning journey*
