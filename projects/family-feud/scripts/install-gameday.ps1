<#
  Registers (or re-registers) the "Family Feud Game Day" scheduled task.

  RUN THIS AFTER ANY MOVE OF THE PROJECT FOLDER:
      powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-gameday.ps1

  Mirrors install-watcher.ps1 -- every path derived from $PSScriptRoot, proven by output
  freshness rather than by the task's exit code (docs/insights/002 and 007).

  WHEN IT RUNS. Two Sunday triggers, local time:
      08:00  the morning read -- overnight news, Saturday's practice-report tags
      11:30  the inactives read -- 1 p.m. ET inactives post ~11:30, and this is the last moment a
             swap for the early window is worth anything
  Plus Saturday 20:00, so a Friday designation is in the file a night early. Thursday and Monday
  starters are covered by the Sunday runs only if their game has not yet been played; a Thursday
  scratch is an on-demand `python scripts\gameday_check.py --stdout` from a session.

  ON EXIT CODES -- same contract as the watcher:
      0 = ran, lineup is fine
      1 = SOMETHING WORTH READING WAS WRITTEN (a tagged starter, an empty slot, a bench body that
          out-projects a starter). This is the check doing its job, not a failure.
      2 = could not reach Sleeper. This is a real failure.
#>
$ErrorActionPreference = "Stop"
$TaskName = "Family Feud Game Day"

$here    = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$project = Split-Path -Parent $here
$script  = Join-Path $project "scripts\gameday_check.py"

if (-not (Test-Path $script)) { throw "Cannot find the check at '$script'. Is this script still in <project>\scripts\?" }
$script = (Resolve-Path $script).Path
Write-Host "Check      : $script"

$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command py -ErrorAction SilentlyContinue).Source }
if (-not $python) { throw "No python on PATH. The task would register fine and then do nothing forever." }
Write-Host "Python     : $python"

$action = New-ScheduledTaskAction -Execute $python -Argument "`"$script`"" -WorkingDirectory $project

$triggers = @(
    (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 20:00),
    (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday   -At 08:00),
    (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday   -At 11:30)
)

# StartWhenAvailable: a laptop asleep at 08:00 fires the run on wake. The players dump is ~14 MB,
# so the limit is generous; a run that hangs on the CDN must still die before the next trigger.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
            -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers `
    -Settings $settings -Description "Sunday-morning lineup check: tagged starters, empty slots, bench bodies out-projecting starters. Appends to newsletter\data\state\GAMEDAY.md." `
    -Force | Out-Null
Write-Host "Registered : $TaskName"

$out = Join-Path $project "newsletter\data\state\GAMEDAY.md"
$before = if (Test-Path $out) { (Get-Item $out).LastWriteTime } else { [datetime]::MinValue }

Start-ScheduledTask -TaskName $TaskName
for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Milliseconds 750
    if ((Get-ScheduledTask -TaskName $TaskName).State -ne "Running") { break }
}
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "Last run   : $($info.LastRunTime)"
Write-Host "Last result: $($info.LastTaskResult)  (0 = lineup fine, 1 = something to read, 2 = Sleeper unreachable)"
Write-Host "Next run   : $($info.NextRunTime)"

# --- Prove it by OUTPUT FRESHNESS, never by the exit code. ---------------------------------
if (-not (Test-Path $out)) {
    throw "Task ran but wrote nothing at $out. The check is not working -- do not trust the exit code."
}
$after = (Get-Item $out).LastWriteTime
if ($after -le $before) {
    throw "$out was not refreshed (still $after). The task fired but the check did nothing."
}
Write-Host "Report     : refreshed $after  <-- $out"

if ($info.LastTaskResult -eq 2) { throw "Check ran but could not reach Sleeper (exit 2)." }
Write-Host "`nGame Day is green."
