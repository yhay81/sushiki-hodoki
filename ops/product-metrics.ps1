[CmdletBinding()]
param([switch]$Local)
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content (Join-Path $PSScriptRoot "product-metrics.sql")) -join " "
$Output = & $Wrangler d1 execute sushiki-hodoki $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) { throw "D1 metrics query failed" }
$Row = ((($Output -join [Environment]::NewLine) | ConvertFrom-Json)[0]).results[0]
$Visitors = [int]$Row.visitors
function Get-Percent([int]$Numerator, [int]$Denominator) {
    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}
[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "sushiki-hodoki"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        visitors = $Visitors
        analyzers = [int]$Row.analyzers
        example_users = [int]$Row.example_users
        diagnosis_users = [int]$Row.diagnosis_users
        structure_users = [int]$Row.structure_users
        question_copiers = [int]$Row.question_copiers
        source_users = [int]$Row.source_users
        returned = [int]$Row.returned
        visitors_7d = [int]$Row.visitors_7d
    }
    rates = [ordered]@{
        analyze_percent = Get-Percent ([int]$Row.analyzers) $Visitors
        question_percent = Get-Percent ([int]$Row.question_copiers) $Visitors
        source_percent = Get-Percent ([int]$Row.source_users) $Visitors
    }
} | ConvertTo-Json -Depth 4
