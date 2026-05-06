# Cleanup for BURNED dev workflow — kills orphan dev processes.
#
# Two modes:
#   - DEFAULT (mid-session use, `pnpm dev:cleanup`): kills orphan
#     workerd.exe; REPORTS but does not kill vite/wrangler port binders
#     because the user may be running `pnpm dev` in parallel.
#   - --force-ports (squeaky-clean / end-of-session use): also kills
#     whatever process owns ports 5173 and 8787. By definition the user
#     is done with the session, so killing the dev servers is safe.
#
# Wrangler's local runtime (workerd.exe) is fragile — prior sessions
# that crashed or were force-closed often leave it bound to port 8787,
# blocking the next `pnpm dev:server` boot. Stale node on 5173 (vite)
# also recurs across sessions when terminals are killed without clean
# shutdown.
#
# Output convention: one line per action, plus a summary line on the
# no-op path. Should be invisible when nothing is wrong.
#
# Exit 0 always — cleanup failure must NOT block whatever invoked us.

$ErrorActionPreference = 'Continue'
$forcePorts = $args -contains '--force-ports'
$killed = 0
$reported = 0

function Kill-Process-Safely {
    param([int]$Id, [string]$Tag)
    try {
        $p = Get-Process -Id $Id -ErrorAction Stop
        $startTime = $p.StartTime
        $name = $p.ProcessName
        Stop-Process -Id $Id -Force -ErrorAction Stop
        Write-Host "[burned-cleanup] killed $Tag PID $Id ($name, started $startTime)"
        return $true
    } catch {
        Write-Host "[burned-cleanup] could not kill $Tag PID $Id : $_"
        return $false
    }
}

# --- Kill orphaned workerd (both modes) ---------------------------------------
$workerd = Get-Process -Name workerd -ErrorAction SilentlyContinue
foreach ($p in $workerd) {
    if (Kill-Process-Safely -Id $p.Id -Tag 'stale workerd') { $killed++ }
}

# --- Port binders: report (default) or kill (--force-ports) -------------------
foreach ($port in @(5173, 8787)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $owner = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        $name = if ($owner) { $owner.ProcessName } else { 'unknown' }
        if ($forcePorts) {
            if (Kill-Process-Safely -Id $c.OwningProcess -Tag "port-$port binder") { $killed++ }
        } else {
            Write-Host "[burned-cleanup] port $port still bound by PID $($c.OwningProcess) ($name) - kill with 'Stop-Process -Id $($c.OwningProcess) -Force' if stale, or run 'pnpm dev:cleanup --force-ports' to kill all"
            $reported++
        }
    }
}

if ($killed -eq 0 -and $reported -eq 0) {
    Write-Host "[burned-cleanup] no stale dev processes"
}

exit 0
