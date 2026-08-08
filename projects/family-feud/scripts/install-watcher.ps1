<#
  Registers (or re-registers) the "Family Feud Draft Watcher" hourly scheduled task.

  RUN THIS AFTER ANY MOVE OF THE PROJECT FOLDER:
      powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-watcher.ps1

  Mirrors install-mule.ps1 deliberately -- same derive-from-$PSScriptRoot discipline, same
  prove-it-by-forcing-a-run finish. Both known breakages of this project were a hardcoded
  absolute path in a scheduled task, so no path is ever typed here; re-running this script IS
  the entire repair after a move.

  Runs at :35 past the hour, six minutes behind the mule's :29, so it always reads cargo that
  was just refreshed rather than racing it.

  ON EXIT CODES -- this differs from the mule and the difference matters:
      0 = ran, nothing to report
      1 = ALERTS WERE WRITTEN. This is the watcher doing its job, not a failure.
      2 = could not read the cargo at all. This is a real failure.
  A verifier that throws on non-zero would treat "the draft date just appeared" as a crash.
#>
$ErrorActionPreference = "Stop"
$TaskName = "Family Feud Draft Watcher"

$here    = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$project = Split-Path -Parent $here
$watcher = Join-Path $project "scripts\watch_draft_state.py"

if (-not (Test-Path $watcher)) { throw "Cannot find the watcher at '$watcher'. Is this script still in <project>\scripts\?" }
$watcher = (Resolve-Path $watcher).Path
Write-Host "Watcher    : $watcher"

# Resolve python the same way a human would, but fail loudly rather than registering a task that
# points at nothing -- that is precisely how the mule died silently in August.
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command py -ErrorAction SilentlyContinue).Source }
if (-not $python) { throw "No python on PATH. The task would register fine and then do nothing forever." }
Write-Host "Python     : $python"

$action = New-ScheduledTaskAction -Execute $python -Argument "`"$watcher`"" -WorkingDirectory $project

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(35) `
            -RepetitionInterval (New-TimeSpan -Hours 1)

# StartWhenAvailable so a run missed while the laptop slept fires on wake. The mule dropped its
# 11:29 and 12:29 runs during the Aug 7 folder rename; a watcher that silently skips the window
# where the draft date appears is worse than no watcher.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Description "Watches mule cargo for the draft becoming real; appends to newsletter\data\state\DRAFT_ALERTS.md." `
    -Force | Out-Null
Write-Host "Registered : $TaskName"

$snapshot = Join-Path $project "newsletter\data\state\last_seen.json"
$before = if (Test-Path $snapshot) { (Get-Item $snapshot).LastWriteTime } else { [datetime]::MinValue }

Start-ScheduledTask -TaskName $TaskName
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 750
    if ((Get-ScheduledTask -TaskName $TaskName).State -ne "Running") { break }
}
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "Last run   : $($info.LastRunTime)"
Write-Host "Last result: $($info.LastTaskResult)  (0 = quiet, 1 = alerts written, 2 = cargo unreadable)"
Write-Host "Next run   : $($info.NextRunTime)"

# --- Prove it by OUTPUT FRESHNESS, never by the exit code. ---------------------------------
# docs/insights/002 and 007: `Last Result` is the code of the most recent run that PRODUCED one
# and persists indefinitely, and NumberOfMissedRuns resets on -Force re-registration. Both read
# green on a job that has stopped doing anything. The snapshot's mtime is the only thing here
# that cannot be faked by a task that never ran.
if (-not (Test-Path $snapshot)) {
    throw "Task ran but wrote no snapshot at $snapshot. The watcher is not working -- do not trust the exit code."
}
$after = (Get-Item $snapshot).LastWriteTime
if ($after -le $before) {
    throw "Snapshot at $snapshot was not refreshed (still $after). The task fired but the watcher did nothing."
}
Write-Host "Snapshot   : refreshed $after"

$alerts = Join-Path $project "newsletter\data\state\DRAFT_ALERTS.md"
if (Test-Path $alerts) {
    Write-Host "Alerts     : $alerts  <-- THERE ARE ALERTS TO READ"
} else {
    Write-Host "Alerts     : none yet (file is created only when something actually happens)"
}

if ($info.LastTaskResult -eq 2) { throw "Watcher ran but could not read the cargo (exit 2). Check the mule." }
Write-Host "`nWatcher is green."
