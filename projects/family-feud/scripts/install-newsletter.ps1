<#
  Registers (or re-registers) the "Family Feud Newsletter" nightly scheduled task -- U12.

  RUN THIS AFTER ANY MOVE OF THE PROJECT FOLDER:
      powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-newsletter.ps1

  Mirrors install-watcher.ps1 deliberately -- same derive-from-$PSScriptRoot discipline, same
  resolve-python-or-refuse, same prove-it-by-output-freshness finish. Both known breakages of
  this project were a hardcoded absolute path in a scheduled task, so no path is ever typed
  here; re-running this script IS the entire repair after a move.

  WHY IT EXISTS: Edition #1 was published on 2026-08-08 only because a human typed the command.
  A nightly paper that needs a human is not a nightly paper.

  Runs DAILY at 21:45 -- sixteen minutes behind the mule's :29 haul, so the cargo it reads was
  just refreshed, and ten minutes behind the watcher's :35, so the two never race for the same
  state files. Change the minute on the $trigger line below; nothing else depends on it.

  ON EXIT CODES -- this differs from the watcher and the difference matters:
      0 = the edition was written
      anything else = a real failure
  The watcher deliberately exits 1 to mean "alerts were written", so its verifier cannot throw
  on non-zero. build_newsletter.py has no such channel: it returns 0 or it raises. So here,
  non-zero IS a failure and this script throws on it.

  ON THE FORCE-RUN BELOW: it builds a second edition on a day that may already have one, which
  is exactly the case that used to mint a phantom "-edition-2" dated the same day and add a
  permanent +1 to every edition after it. build_newsletter.edition_number is idempotent per day
  as of 2026-08-08, so the force-run republishes today's number instead. If you are reading this
  because the installer produced a duplicate back issue, that regression is what came back.
#>
$ErrorActionPreference = "Stop"
$TaskName = "Family Feud Newsletter"

$here    = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$project = Split-Path -Parent $here
$builder = Join-Path $project "scripts\build_newsletter.py"

if (-not (Test-Path $builder)) { throw "Cannot find the builder at '$builder'. Is this script still in <project>\scripts\?" }
$builder = (Resolve-Path $builder).Path
Write-Host "Builder    : $builder"

# Resolve python the same way a human would, but fail loudly rather than registering a task that
# points at nothing -- that is precisely how the mule died silently in August.
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command py -ErrorAction SilentlyContinue).Source }
if (-not $python) { throw "No python on PATH. The task would register fine and then do nothing forever." }
Write-Host "Python     : $python"

$action = New-ScheduledTaskAction -Execute $python -Argument "`"$builder`"" -WorkingDirectory $project

$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.AddHours(21).AddMinutes(45))

# StartWhenAvailable so a run missed while the laptop slept fires on wake. A nightly job is far
# more exposed to this than an hourly one: an hourly task that sleeps through 21:45 has another
# window an hour later, and this one does not get a second chance until tomorrow.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Description "Builds The Nightly Feud from mule cargo + the board into newsletter\family-feud-newsletter.html, nightly at 21:45." `
    -Force | Out-Null
Write-Host "Registered : $TaskName"

$edition = Join-Path $project "newsletter\family-feud-newsletter.html"
$before = if (Test-Path $edition) { (Get-Item $edition).LastWriteTime } else { [datetime]::MinValue }

Start-ScheduledTask -TaskName $TaskName
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 750
    if ((Get-ScheduledTask -TaskName $TaskName).State -ne "Running") { break }
}
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "Last run   : $($info.LastRunTime)"
Write-Host "Last result: $($info.LastTaskResult)  (0 = success; anything else is a failure)"
Write-Host "Next run   : $($info.NextRunTime)"

# --- Prove it by OUTPUT FRESHNESS, never by the exit code. ---------------------------------
# docs/insights/002 and 007: `Last Result` is the code of the most recent run that PRODUCED one
# and persists indefinitely, and NumberOfMissedRuns resets on -Force re-registration. Both read
# green on a job that has stopped doing anything -- the mule sat at "Last Result: 0" for hours
# while pointing at a deleted script. The edition's mtime is the only thing here that cannot be
# faked by a task that never ran.
if (-not (Test-Path $edition)) {
    throw "Task ran but wrote no edition at $edition. The newsletter is not working -- do not trust the exit code."
}
$after = (Get-Item $edition).LastWriteTime
if ($after -le $before) {
    throw "Edition at $edition was not rewritten (still $after). The task fired but the builder did nothing."
}
Write-Host "Edition    : rewritten $after"

# The number is rendered INTO the page, so reading it back proves the file on disk is the one the
# run just produced -- not merely that something touched a file with the right name.
$no = (Select-String -Path $edition -Pattern 'Edition #(\d+)' | Select-Object -First 1).Matches.Groups[1].Value
if (-not $no) { throw "No edition number in $edition. The file was written but it is not an edition." }
Write-Host "Number     : #$no"

$status = Join-Path $project "newsletter\data\inbox\mule_status.json"
if (Test-Path $status) {
    # utf-8-sig: PowerShell 5.1 wrote this one file with a BOM and it is the ONLY file in the
    # project that carries one. Get-Content -Raw handles it; a naive reader elsewhere would not.
    $s = Get-Content $status -Raw | ConvertFrom-Json
    $age = [int]((Get-Date) - [datetime]::ParseExact($s.run_at, "yyyy-MM-dd HH:mm:ss", $null)).TotalMinutes
    Write-Host "Cargo      : stamped $($s.run_at) -- $age min old at press time"
    if ($age -gt 120) { Write-Host "  WARNING: the paper was built from cargo over two hours old. Check the mule." }
} else {
    Write-Host "Cargo      : NO mule_status.json -- the edition was built without knowing the cargo's age."
}

if ($info.LastTaskResult -ne 0) { throw "Task registered but its run returned $($info.LastTaskResult). Not green." }
Write-Host "`nNewsletter is green. Next edition: $($info.NextRunTime)"
