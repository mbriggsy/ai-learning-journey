# Session-start cleanup for BURNED dev workflow.
#
# Wrangler's local runtime (workerd.exe) is fragile — prior sessions that
# crashed or were force-closed often leave it bound to port 8787, which
# blocks the next `pnpm dev:server` boot AND was implicated in the
# 2026-05-01 phone-test friction that triggered the vanity-room-code work.
#
# This hook runs on every Claude Code SessionStart. It:
#   - Kills any orphaned workerd.exe processes (always safe — wrangler
#     respawns workerd on demand, and a workerd outliving its parent
#     wrangler is by definition stale).
#   - Reports (does NOT kill) port-5173 / port-8787 binders. Vite is owned
#     by an interactive `pnpm dev` terminal that the user may legitimately
#     have running in parallel; killing it would disrupt active work. The
#     report gives the user enough info to clean up manually if needed.
#
# Output convention: one summary line on the no-op path, one line per
# action otherwise. The hook should be invisible when nothing is wrong.
#
# Exit 0 always — a hook failure here must NOT block session start.

$ErrorActionPreference = 'Continue'
$killed = 0
$reported = 0

# --- Kill orphaned workerd ----------------------------------------------------
$workerd = Get-Process -Name workerd -ErrorAction SilentlyContinue
foreach ($p in $workerd) {
    try {
        $startTime = $p.StartTime
        Stop-Process -Id $p.Id -Force -ErrorAction Stop
        Write-Host "[burned-cleanup] killed stale workerd PID $($p.Id) (started $startTime)"
        $killed++
    } catch {
        Write-Host "[burned-cleanup] could not kill workerd PID $($p.Id): $_"
    }
}

# --- Report port binders ------------------------------------------------------
foreach ($port in @(5173, 8787)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $owner = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        $name = if ($owner) { $owner.ProcessName } else { 'unknown' }
        Write-Host "[burned-cleanup] port $port still bound by PID $($c.OwningProcess) ($name) — kill with 'Stop-Process -Id $($c.OwningProcess) -Force' if stale"
        $reported++
    }
}

if ($killed -eq 0 -and $reported -eq 0) {
    Write-Host "[burned-cleanup] no stale dev processes"
}

exit 0
