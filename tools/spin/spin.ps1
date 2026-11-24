<#
.SYNOPSIS
  Opens a run of numbered Claude Code sessions as tabs in one Windows Terminal window.

.DESCRIPTION
  spin <prefix> <start> <count>

  Each tab opens Windows PowerShell in the folder you ran spin from and runs
  `claude --name <prefix>-<n>`. That's the same as opening a tab, cd-ing there and typing it.
  All the tabs go into one Terminal window named after the prefix, so a later
  `spin b9 ...` adds its tabs to that same window.

  Each tab gets a fresh environment, like a tab opened by hand. Without that, a spin run
  from inside a Claude session would hand every new session that session's markers.
  Seen 2026-11-24: the new sessions saw CLAUDE_CODE_CHILD_SESSION and turned transcript
  saving off, and they inherited its messaging socket and session id too.

  Tabs open about 2 seconds apart. That keeps them in order and keeps
  the Claude sessions from all starting at the same moment.

  The prefix is lowercased (B9 -> b9). Session chains match names exactly, and our
  sessions are lowercase.

.EXAMPLE
  cd ~\ai-learning-journey\projects\the-back-nine
  spin b9 10 9
  Opens 9 tabs, b9-10 through b9-18.

.NOTES
  Typed as `spin` from any shell through %USERPROFILE%\.local\bin\spin.cmd, which is a
  copy of tools\spin\spin.cmd. Windows PowerShell's script policy here is the default
  (Restricted), so the .cmd runs this file with -ExecutionPolicy Bypass instead of
  changing the machine policy.
#>
param(
    [Parameter(Mandatory, Position = 0)] [string] $Prefix,
    [Parameter(Mandatory, Position = 1)] [ValidateRange(0, 9999)] [int] $Start,
    [Parameter(Mandatory, Position = 2)] [ValidateRange(1, 20)] [int] $Count
)

$ErrorActionPreference = 'Stop'

$name0 = $Prefix.Trim().TrimEnd('-').ToLower()
if ($name0 -notmatch '^[a-z][a-z0-9-]*$') {
    throw "Prefix '$Prefix' won't work as a session name. Use a letter first, then letters, digits or dashes, like b9 or playbook."
}

# A fresh Terminal tab starts in the home folder. A session started there gets the wrong project memory.
$dir = (Get-Location).ProviderPath.TrimEnd('\')
if ($dir -eq $HOME.TrimEnd('\')) {
    throw "You're in your home folder. cd into the project first (The Back Nine: cd ~\ai-learning-journey\projects\the-back-nine), then run spin again."
}

$last = $Start + $Count - 1
Write-Host "Opening $Count Claude session(s), $name0-$Start to $name0-$last, in the '$name0' Terminal window"
Write-Host "Folder: $dir"

for ($n = $Start; $n -le $last; $n++) {
    $session = "$name0-$n"
    # -w <name> opens the tab in the window with that name, creating the window on first use.
    # --reloadEnvironment gives the tab a fresh environment instead of this process's (see above).
    # The tab runs Windows PowerShell (your usual shell) with -NoExit,
    # so quitting Claude drops you back to a prompt in that tab.
    $wtArgs = "-w $name0 new-tab --title $session --reloadEnvironment -d `"$dir`" -- powershell.exe -NoExit -Command claude --name $session"
    Start-Process -FilePath 'wt.exe' -ArgumentList $wtArgs
    Write-Host "  $session"
    if ($n -lt $last) { Start-Sleep -Seconds 2 }
}
