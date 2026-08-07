<#
  Registers (or re-registers) the "Family Feud Mule" hourly scheduled task.

  RUN THIS AFTER ANY MOVE OF THE PROJECT FOLDER:
      powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-mule.ps1

  Why it exists: a scheduled task stores an ABSOLUTE -File path, so moving the project
  breaks it silently. The Aug 7 2026 move out of C:\Users\brigg\Family Feud left the task
  pointing at a deleted script, and nothing raised a flag -- "Last Result: 0" simply froze
  at the final pre-move run and looked healthy for hours. The old install doc handled this
  by printing a schtasks command with the path typed into it, which meant a human had to
  notice and retype it. This script derives the path from its own location instead, so
  re-running it IS the entire fix, forever.

  It also improves on the original /SC HOURLY registration: StartWhenAvailable makes a run
  missed while the laptop slept fire on wake, instead of being skipped outright.
#>
$ErrorActionPreference = "Stop"
$TaskName = "Family Feud Mule"

$here    = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$project = Split-Path -Parent $here
$mule    = Join-Path $project "newsletter\feud_mule.ps1"

if (-not (Test-Path $mule)) { throw "Cannot find the mule at '$mule'. Is this script still in <project>\scripts\?" }
$mule = (Resolve-Path $mule).Path
Write-Host "Mule       : $mule"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
            -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$mule`""

# -Once + a 1-hour repetition running indefinitely is the modern equivalent of /SC HOURLY.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(29) `
            -RepetitionInterval (New-TimeSpan -Hours 1)

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Description "Hauls Sleeper league data + fantasy RSS into newsletter/data/inbox hourly." `
    -Force | Out-Null
Write-Host "Registered : $TaskName"

# Prove it: force a run now and wait for a real exit code rather than trusting registration.
Start-ScheduledTask -TaskName $TaskName
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 750
    if ((Get-ScheduledTask -TaskName $TaskName).State -ne "Running") { break }
}
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "Last run   : $($info.LastRunTime)"
Write-Host "Last result: $($info.LastTaskResult)  (0 = success)"
Write-Host "Next run   : $($info.NextRunTime)"

$status = Join-Path $project "newsletter\data\inbox\mule_status.json"
if (Test-Path $status) {
    $s = Get-Content $status -Raw | ConvertFrom-Json
    # @() is load-bearing on both lines: PowerShell member-enumerates .Count over a property
    # COLLECTION, so the unwrapped form prints "1 1 1 1 ..." (one per source) instead of a total.
    $all   = @($s.sources.PSObject.Properties)
    $fails = @($all | Where-Object { $_.Value -like "FAIL*" })
    Write-Host "Cargo      : fetched $($s.run_at) on $($s.machine) -- $($all.Count) sources, $($fails.Count) failed"
    foreach ($f in $fails) { Write-Host "  FAIL $($f.Name): $($f.Value)" }
} else {
    Write-Host "Cargo      : NO mule_status.json at $status -- the mule ran but wrote nothing. Investigate."
}

if ($info.LastTaskResult -ne 0) { throw "Task registered but its run returned $($info.LastTaskResult). Not green." }
Write-Host "`nMule is green."
