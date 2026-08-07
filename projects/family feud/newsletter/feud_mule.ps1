# ============================================================
#  FEUD MULE v1.0  —  Family Feud data fetcher (Aug 2026)
#  Runs hourly via Windows Task Scheduler. Fetches Sleeper league
#  data + fantasy news feeds into data\inbox for The Nightly Feud.
#  Every source fails independently; status lands in mule_status.json.
# ============================================================
$ErrorActionPreference = "Continue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$base  = "C:\Users\brigg\Family Feud"
$inbox = Join-Path $base "Newsletter\data\inbox"
$logf  = Join-Path $base "Newsletter\data\mule_log.txt"
New-Item -ItemType Directory -Force -Path $inbox | Out-Null

$stamp   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$results = New-Object System.Collections.Specialized.OrderedDictionary
$headers = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FeudMule/1.0" }

function Fetch-Source {
    param([string]$Name, [string]$Url, [string]$OutFile)
    $dest = Join-Path $inbox $OutFile
    try {
        Invoke-WebRequest -Uri $Url -Headers $headers -TimeoutSec 30 -UseBasicParsing -OutFile $dest
        $size = (Get-Item $dest).Length
        if ($size -lt 50) { throw "response too small ($size bytes)" }
        $script:results[$Name] = "ok ($size bytes)"
    } catch {
        $script:results[$Name] = "FAIL: $($_.Exception.Message)"
        if (Test-Path $dest) { if ((Get-Item $dest).Length -lt 50) { Remove-Item $dest -Force } }
    }
}

# ---- Sleeper (public JSON, no auth) ----
Fetch-Source "sleeper_league"   "https://api.sleeper.app/v1/league/1390509993844809728"       "sleeper_league.json"
Fetch-Source "sleeper_users"    "https://api.sleeper.app/v1/league/1390509993844809728/users" "sleeper_users.json"
Fetch-Source "sleeper_draft"    "https://api.sleeper.app/v1/draft/1390509994847240192"        "sleeper_draft.json"
Fetch-Source "trending_add"     "https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=25"  "sleeper_trending_add.json"
Fetch-Source "trending_drop"    "https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=25" "sleeper_trending_drop.json"

# ---- News feeds (candidates; whichever work, work) ----
Fetch-Source "rss_yahoo_nfl"    "https://sports.yahoo.com/nfl/rss.xml"                 "rss_yahoo_nfl.xml"
Fetch-Source "rss_rotowire"     "https://www.rotowire.com/rss/news.php?sport=NFL"      "rss_rotowire.xml"
Fetch-Source "rss_espn_nfl"     "https://www.espn.com/espn/rss/nfl/news"               "rss_espn_nfl.xml"
Fetch-Source "rss_cbs_nfl"      "https://www.cbssports.com/rss/headlines/nfl/"         "rss_cbs_nfl.xml"
Fetch-Source "rss_nbc_edge"     "https://www.nbcsports.com/fantasy/football/player-news?rss=1" "rss_nbc_edge.xml"

# ---- Status + log ----
$status = [ordered]@{ run_at = $stamp; machine = $env:COMPUTERNAME; sources = $results }
$status | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $inbox "mule_status.json") -Encoding UTF8

$parts = @()
foreach ($k in $results.Keys) { $parts += "$k=$($results[$k])" }
Add-Content $logf ("$stamp :: " + ($parts -join " | "))
$log = Get-Content $logf -ErrorAction SilentlyContinue
if ($log -and $log.Count -gt 500) { $log[-500..-1] | Set-Content $logf }
