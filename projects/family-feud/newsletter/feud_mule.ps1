# ============================================================
#  FEUD MULE v2.1  —  Family Feud data fetcher (Aug 2026)
#  Runs hourly via Windows Task Scheduler. Fetches Sleeper league
#  data + fantasy news feeds into data\inbox for The Nightly Feud,
#  and runs the two draft-kit market fetchers (v2.1) so the expert
#  consensus and the ADP pool are never older than the last hour.
#  Every source fails independently; status lands in mule_status.json.
#
#  v2 (U10): VALIDATE BEFORE WRITING, AND VALIDATE CONTENT, NOT SIZE.
#
#  v1's only test was `size > 50 bytes`. A 793 KB HTML error page passes that comfortably, which
#  is exactly what `rss_nbc_edge` had been doing for days -- recorded "ok (793402 bytes)" in
#  mule_status.json while being a web page with zero <item> elements in it. Presence is not
#  health; this is the fourth appearance of that shape in this project (docs/insights/007).
#
#  Two changes, and the second matters more than the first:
#
#   1. Each payload is now checked for HTTP status, content-type, that it PARSES, and that a feed
#      actually carries items. The judgment lives in scripts\validate_cargo.py because that is the
#      part with edge cases, and this repo tests Python, not PowerShell. Contract: exit 0 or 1,
#      one line on stdout.
#
#   2. NOTHING IS OVERWRITTEN UNTIL IT PASSES. v1 downloaded straight onto the live file, so a bad
#      response destroyed good cargo and only deleted it again if it came in under 50 bytes --
#      leaving the wire with neither yesterday's data nor today's. Now every fetch lands on
#      `<name>.incoming` and is promoted only on a pass. A failure keeps the previous cargo and
#      records HOW OLD what remains is, because "this source failed" and "you are now reading
#      day-old data" are different facts and a consumer needs both.
# ============================================================
$ErrorActionPreference = "Continue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

# Locate ourselves instead of hardcoding. The Aug 7 move out of C:\Users\brigg\Family Feud
# silently killed this script -- $base pointed at a folder that no longer existed, so the
# hourly task kept "succeeding" into a path Windows recreated from nothing. Deriving from
# $PSScriptRoot means the mule survives any future move with zero edits.
# (The fallback covers being dot-sourced or run via -Command, where $PSScriptRoot is empty.)
$here  = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$root  = Split-Path -Parent $here
$inbox = Join-Path $here "data\inbox"
$logf  = Join-Path $here "data\mule_log.txt"
New-Item -ItemType Directory -Force -Path $inbox | Out-Null

# Derived, never hardcoded -- both known breakages of this project were a hardcoded folder path.
$validator = Join-Path $root "scripts\validate_cargo.py"
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command py -ErrorAction SilentlyContinue).Source }

$stamp   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$results = New-Object System.Collections.Specialized.OrderedDictionary
$headers = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FeudMule/1.0" }

function Get-KeptNote {
    # What is still on disk after a failure, and how stale it is. A failure notice that does not
    # say this leaves the reader unable to tell "no data" from "yesterday's data".
    param([string]$Path)
    if (Test-Path $Path) {
        $age = [int]((Get-Date) - (Get-Item $Path).LastWriteTime).TotalMinutes
        return " [kept previous cargo, $age min old]"
    }
    return " [no previous cargo on disk -- this source has nothing]"
}

function Fetch-Source {
    param([string]$Name, [string]$Url, [string]$OutFile, [string]$Kind)
    $dest = Join-Path $inbox $OutFile
    $tmp  = "$dest.incoming"

    # BUST THE CDN, per source, per call. Sleeper serves its API through Cloudflare and the draft
    # object carries exactly the policy insight 020 measured on /picks:
    #     cache-control: public, s-maxage=30, stale-while-revalidate=300, stale-if-error=600
    # Measured live 2026-08-09 on mock 1392338436949561355: seconds after START DRAFT the un-busted
    # URL returned `status: pre_draft, draft_order: null` with `Age: 60, cf-cache-status: UPDATING`,
    # while the busted URL returned `status: drafting, draft_order: {...: 5}`. Same request, same
    # second, opposite answers -- and the stale one is the one that reads like a finished check.
    #
    # WHY IT MATTERS HERE AND NOT JUST IN merge_picks.py. This cargo is what read_shape() and
    # run_engine.py read for teams, rounds, roster and the SEAT. `draft_order` is null today and
    # flips to populated near go time; a stale copy keeps reporting null exactly when the seat
    # oracle finally has something to say. stale-while-revalidate means the request that triggers
    # the refresh is handed the OLD body, so "fetch twice" is not a fix -- the nonce is.
    #
    # Scoped to sleeper.app: the RSS feeds are not Cloudflare-cached this way and a stray query
    # string on someone else's endpoint is a change we have not measured.
    if ($Url -match 'api\.sleeper\.app') {
        $nonce = [guid]::NewGuid().ToString('N')
        $sep = if ($Url -match '\?') { '&' } else { '?' }
        $Url = "$Url$sep" + "cb=$nonce"
    }

    try {
        $resp  = Invoke-WebRequest -Uri $Url -Headers $headers -TimeoutSec 30 -UseBasicParsing
        $code  = [int]$resp.StatusCode
        $ctype = [string]$resp.Headers["Content-Type"]
        [System.IO.File]::WriteAllBytes($tmp, $resp.RawContentStream.ToArray())
    } catch {
        $script:results[$Name] = "FAIL: fetch failed -- $($_.Exception.Message)" + (Get-KeptNote $dest)
        if (Test-Path $tmp) { Remove-Item $tmp -Force }
        return
    }

    if (-not $python) {
        # Fail SAFE, not open. Accepting the payload because the validator could not run would
        # reinstate the exact bug this version exists to remove -- and it would do it silently.
        $script:results[$Name] = "FAIL: no python on PATH, so the payload could not be validated" + (Get-KeptNote $dest)
        Remove-Item $tmp -Force
        return
    }

    $out  = & $python $validator $tmp $Kind --content-type $ctype --status $code 2>&1
    $good = ($LASTEXITCODE -eq 0)
    # The LAST non-empty line: the validator prints exactly one, and anything on stderr ahead of
    # it must not be allowed to displace the "ok" prefix that watch_draft_state.py keys on.
    $summary = ($out | Where-Object { "$_".Trim() } | Select-Object -Last 1)
    if ($summary) { $summary = "$summary".Trim() }
    if (-not $summary) {
        $summary = if ($good) { "ok (validated)" } else { "FAIL: the validator produced no output" }
    }

    if ($good) {
        Move-Item $tmp $dest -Force
        $script:results[$Name] = $summary
    } else {
        Remove-Item $tmp -Force
        $script:results[$Name] = $summary + (Get-KeptNote $dest)
    }
}

function Run-Fetcher {
    # Run a Python fetcher that owns its own download-validate-promote cycle, and record its one
    # line under the same contract Fetch-Source uses: `ok ...` on success, anything else a failure.
    param([string]$Name, [string]$RelPath)

    if (-not $python) {
        # Fail SAFE, exactly as Fetch-Source does. "Could not check" is not "fine".
        $script:results[$Name] = "FAIL: no python on PATH, so the fetcher could not run"
        return
    }
    $script = Join-Path $root $RelPath
    if (-not (Test-Path $script)) {
        $script:results[$Name] = "FAIL: $RelPath is missing"
        return
    }
    try {
        $out = & $python $script --fetch-only 2>&1
        $code = $LASTEXITCODE
    } catch {
        $script:results[$Name] = "FAIL: fetcher threw -- $($_.Exception.Message)"
        return
    }
    # Last non-empty line, same rule as Fetch-Source: a warning on stderr must not be allowed to
    # displace the `ok` prefix a consumer keys on.
    $summary = ($out | Where-Object { "$_".Trim() } | Select-Object -Last 1)
    if ($summary) { $summary = "$summary".Trim() }
    if (-not $summary) {
        $summary = if ($code -eq 0) { "ok (fetched)" } else { "FAIL: the fetcher produced no output" }
    }
    # A zero exit with a non-ok line, or an ok line with a non-zero exit, is a broken contract --
    # and silently trusting either half is how "Last Result: 0" fooled this project for hours.
    if ($code -ne 0 -and "$summary".StartsWith("ok")) {
        $summary = "FAIL: fetcher exited $code while reporting '$summary'"
    }
    $script:results[$Name] = $summary
}

# ---- Sleeper (public JSON, no auth) ----
Fetch-Source "sleeper_league"   "https://api.sleeper.app/v1/league/1390509993844809728"       "sleeper_league.json"        "json"
Fetch-Source "sleeper_users"    "https://api.sleeper.app/v1/league/1390509993844809728/users" "sleeper_users.json"         "json"
Fetch-Source "sleeper_draft"    "https://api.sleeper.app/v1/draft/1390509994847240192"        "sleeper_draft.json"         "json"
Fetch-Source "trending_add"     "https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=25"  "sleeper_trending_add.json"  "json"
Fetch-Source "trending_drop"    "https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=25" "sleeper_trending_drop.json" "json"

# ---- News feeds ----
# rss_nbc_edge was REMOVED 2026-08-08. Its URL returns HTTP 200 with Content-Type text/html and a
# ~793 KB SectionPage carrying zero <item> elements -- it has never once been a feed, and it
# passed v1's size check every hour. ProFootballTalk replaces it: 30 items, application/xml,
# measured 2026-08-08. Do not restore the old URL; it is not broken, it was never right.
Fetch-Source "rss_yahoo_nfl"    "https://sports.yahoo.com/nfl/rss.xml"                 "rss_yahoo_nfl.xml"  "rss"
Fetch-Source "rss_rotowire"     "https://www.rotowire.com/rss/news.php?sport=NFL"      "rss_rotowire.xml"   "rss"
Fetch-Source "rss_espn_nfl"     "https://www.espn.com/espn/rss/nfl/news"               "rss_espn_nfl.xml"   "rss"
Fetch-Source "rss_cbs_nfl"      "https://www.cbssports.com/rss/headlines/nfl/"         "rss_cbs_nfl.xml"    "rss"
Fetch-Source "rss_pft"          "https://profootballtalk.nbcsports.com/feed/"          "rss_pft.xml"        "rss"

# ---- Draft-kit market data ----
# These two do NOT land in inbox/ and are NOT fetched here. They are gzipped caches under
# draft-kit/cache/, and their validation is domain-specific in ways PowerShell has no business
# expressing: the consensus must still be the Full PPR slice, the ADP pool must still report PPR,
# and both must still carry the columns every join below them depends on. Re-implementing that
# here would put the judgment in the one language this repo does not test -- the same reasoning
# that put validate_cargo.py in Python. So the mule RUNS the fetchers, which already download to
# `.incoming`, validate, and promote only on a pass, and records what they said.
#
# They matter on a schedule because both caches are gitignored on purpose (their value is being
# newer than the board), so a clean clone has neither -- and draft morning is the worst possible
# moment to find that out.
Run-Fetcher "consensus"  "scripts\consensus.py"
Run-Fetcher "market_adp" "scripts\market.py"

# ---- Status + log ----
# `validation` tells a consumer these results mean something. A v1 status file records "ok" for a
# payload nobody looked at, and the two are indistinguishable without this field.
$status = [ordered]@{
    run_at     = $stamp
    machine    = $env:COMPUTERNAME
    validation = "status+content-type+parse+items; fetchers self-validate their own schema"
    sources    = $results
}
$status | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $inbox "mule_status.json") -Encoding UTF8

$parts = @()
foreach ($k in $results.Keys) { $parts += "$k=$($results[$k])" }
Add-Content $logf ("$stamp :: " + ($parts -join " | "))
$log = Get-Content $logf -ErrorAction SilentlyContinue
if ($log -and $log.Count -gt 500) { $log[-500..-1] | Set-Content $logf }
