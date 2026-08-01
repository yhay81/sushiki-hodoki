[CmdletBinding()]
param()
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Read-ProjectFile([string]$RelativePath) {
    $Path = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $Path)) { throw "Missing required file: $RelativePath" }
    return Get-Content -LiteralPath $Path -Raw
}

$Package = Read-ProjectFile "package.json"
$Wrangler = Read-ProjectFile "wrangler.jsonc"
$Worker = Read-ProjectFile "src\worker.tsx"
$Styles = Read-ProjectFile "public\styles.css"
$Common = Read-ProjectFile "public\common.js"
$Analyzer = Read-ProjectFile "public\analyzer.js"
$Core = Read-ProjectFile "public\analyzer-core.js"
$Privacy = Read-ProjectFile "docs\privacy-boundary.md"

foreach ($Required in @(
    "public\og.png",
    "public\favicon.svg",
    "public\manifest.webmanifest",
    "public\robots.txt",
    "public\sw.js",
    "public\16a103f18dc448aeb04dc8c01f241e62.txt",
    "migrations\0001_product.sql",
    ".github\workflows\ci.yml"
)) {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot $Required))) { throw "Missing required file: $Required" }
}

if ($Package -notmatch '"hono"' -or $Package -notmatch 'vite-plus' -or $Package -match 'better-auth') { throw "Stack boundary is incorrect" }
if ($Wrangler -notmatch 'sushiki-hodoki\.yhay81\.com' -or $Wrangler -notmatch 'workers_dev"\s*:\s*false' -or $Wrangler -notmatch '24c792f0-0bb2-4abf-b826-81f82ac15ac5') { throw "Cloudflare boundary is incorrect" }
if ($Worker -notmatch "script-src 'self'" -or $Worker -match 'unsafe-inline' -or $Worker -notmatch 'geolocation=\(\)' -or $Worker -notmatch 'no-referrer') { throw "Security header contract failed" }
if ($Worker -match '成功条件|市場スコア|公開実験|収益性|仮説') { throw "Meta experiment language leaked into the product" }
if ($Styles -match '(?i)gradient' -or $Styles -notmatch 'clamp\(1\.75rem, 3\.8vw, 2\.35rem\)') { throw "Visual type or no-gradient contract failed" }
if ($Common -match 'formula-input|input\.value' -or $Core -match 'fetch\(|XMLHttpRequest|sendBeacon') { throw "Formula network boundary failed" }
if ($Analyzer -match 'innerHTML' -or $Analyzer -notmatch 'textContent') { throw "Safe DOM rendering contract failed" }
if ($Privacy -notmatch '数式、シート名、セル参照、文字列リテラル' -or $Privacy -notmatch '45日') { throw "Privacy documentation is incomplete" }
if ((Get-Item -LiteralPath (Join-Path $RepoRoot "public\og.png")).Length -lt 100000) { throw "OG image is unexpectedly small" }

$FunctionRoutes = [regex]::Matches($Worker, 'slug: "(if|xlookup|vlookup|sumifs|countifs|filter|let|iferror|text|date)"')
$ErrorRoutes = [regex]::Matches($Worker, 'slug: "(div0|na|name|ref|value|spill|calc)"')
if ($FunctionRoutes.Count -ne 10 -or $ErrorRoutes.Count -ne 7) { throw "Guide route baseline failed" }
if ([regex]::Matches($Worker, 'https://support\.microsoft\.com/ja-jp/excel/').Count -ne 17) { throw "Official source baseline failed" }

Write-Output "Product release contract is satisfied"
