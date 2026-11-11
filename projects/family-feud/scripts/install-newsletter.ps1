<#
  Registers (or re-registers) the "Family Feud Newsletter" daily scheduled task -- U12.

  RUN THIS AFTER ANY MOVE OF THE PROJECT FOLDER:
      powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-newsletter.ps1

  Mirrors install-watcher.ps1 deliberately -- same derive-from-$PSScriptRoot discipline, same
  resolve-python-or-refuse, same prove-it-by-output-freshness finish. Both known breakages of
  this project were a hardcoded absolute path in a scheduled task, so no path is ever typed
  here; re-running this script IS the entire repair after a move.

  WHY IT EXISTS: Edition #1 was published on 2026-08-08 only because a human typed the command.
  A daily paper that needs a human is not a daily paper.

  Runs DAILY at 04:45 -- sixteen minutes behind the mule's :29 haul, so the cargo it reads was
  just refreshed, and ten minutes behind the watcher's :35, so the two never race for the same
  state files. Change the time on the $At line below; nothing else depends on it.

  WHY BEFORE DAWN (Briggsy, 2026-11-11): the paper is read in the morning, and until then it
  printed at 21:45 the night before. The league's waivers clear Wednesday at 03:15 ET (measured
  2026-09-16 at 03:15:40 and again 2026-11-11 at 03:15:53), so every Wednesday-morning reader
  held a paper that knew nothing of that night's claims, ours or anyone's. 04:45 is ninety
  minutes behind the clear. The laptop is awake for it: the hourly mule ran at 03:29, 04:29,
  05:29 and 06:29 on every one of the eleven mornings 2026-11-01 through 11-11.

  ON EXIT CODES -- this differs from the watcher and the difference matters:
      0 = the edition was written AND Google Drive for desktop took its back issue
          (in season a failed pull of rosters and projections is NOT a failure here: the paper
          prints from the kept snapshot and says so in its own colophon)
          (the upload to Google is Drive's own background job; nothing here checks it)
      3 = the edition was written but a Drive copy failed (Drive not running, signed out,
          or not mounted as G:)
      anything else = a crash
  The watcher deliberately exits 1 to mean "alerts were written", so its verifier cannot throw
  on non-zero. build_newsletter.py has no such channel: 0 is success, 3 is a missed Drive copy,
  anything else is a crash. So here, every non-zero IS a failure and this script throws on it --
  with its own message for 3, because that one means the paper is fine and Drive is not.

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

$At = "04:45"
$trigger = New-ScheduledTaskTrigger -Daily -At $At
# LOCAL clock time, never a fixed UTC instant: -At writes StartBoundary in UTC ("...T01:45:00Z"), and
# Task Scheduler keeps a zoned boundary pinned to that instant, so after the DST fall-back the build
# would run an hour early. Written here with no zone; install-gameday.ps1 has the measurement (2026-10-30).
$trigger.StartBoundary = "{0:yyyy-MM-dd}T{1}:00" -f (Get-Date), $At

# StartWhenAvailable so a run missed while the laptop slept fires on wake. A daily job is far
# more exposed to this than an hourly one: an hourly task that sleeps through 04:45 has another
# window an hour later, and this one does not get a second chance until tomorrow.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Description "Builds The Nightly Feud into newsletter\family-feud-newsletter.html, daily at 04:45 (in season: pulls rosters and three sites' projections first), and copies the dated back issue to Google Drive (G:\My Drive\Nightly Feud). Last Result 3 = edition written, Drive copy missed." `
    -Force | Out-Null
Write-Host "Registered : $TaskName"

# Read the trigger back from the task itself: the intended clock time, no zone.
$bound = ([xml](Export-ScheduledTask -TaskName $TaskName)).Task.Triggers.CalendarTrigger.StartBoundary
if ($bound -notmatch "^\d{4}-\d{2}-\d{2}T$($At):00$") { throw "Trigger registered as '$bound', not daily $At local time (no zone)." }
Write-Host "Trigger    : daily $At local time"

$edition = Join-Path $project "newsletter\family-feud-newsletter.html"
$before = if (Test-Path $edition) { (Get-Item $edition).LastWriteTime } else { [datetime]::MinValue }

# Wait for the run to FINISH, however long it takes, up to the task's own 10-minute limit plus a
# minute. In season the build pulls rosters and three sites' projections first (46 s measured
# 2026-11-09); the old 45-second wait would have read a half-finished run as "the builder did nothing".
Start-ScheduledTask -TaskName $TaskName
$started  = Get-Date
$deadline = $started.AddMinutes(11)
do {
    Start-Sleep -Milliseconds 750
    $running = (Get-ScheduledTask -TaskName $TaskName).State -eq "Running"
} while ($running -and (Get-Date) -lt $deadline)
if ($running) { throw "The task was still running 11 minutes after it started. It should have been stopped at 10. Not green." }
Write-Host ("Run took   : {0:N0} seconds" -f ((Get-Date) - $started).TotalSeconds)
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "Last run   : $($info.LastRunTime)"
Write-Host "Last result: $($info.LastTaskResult)  (0 = success; 3 = edition written, Drive copy missed; anything else is a crash)"
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

if ($info.LastTaskResult -eq 3) { throw "The edition was written, but the Google Drive copy failed (exit 3). Is Google Drive for desktop running and signed in, with G:\My Drive present? Not green." }
if ($info.LastTaskResult -ne 0) { throw "Task registered but its run returned $($info.LastTaskResult). Not green." }
Write-Host "`nNewsletter is green. Next edition: $($info.NextRunTime)"
