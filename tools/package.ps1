param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$OutputDir = (Join-Path (Split-Path -Parent $PSScriptRoot) "artifacts"),
  [string]$IhhookDll = ""
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$out = [System.IO.Path]::GetFullPath($OutputDir)
$vendor = Join-Path $repo "vendor"
$ih = Join-Path $vendor "infinite-heaven"
$ihhook = Join-Path $vendor "ihhook"

if (-not (Test-Path -LiteralPath $IhhookDll)) {
  throw "IHHook DLL not found: $IhhookDll"
}

New-Item -ItemType Directory -Path $out -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out "staging-ih") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out "staging-ihhook") -Force | Out-Null

$ihStage = Join-Path $out "staging-ih"
$hookStage = Join-Path $out "staging-ihhook"

Copy-Item -LiteralPath (Join-Path $ih "*") -Destination $ihStage -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $ihStage "GameDir\mod\fonts") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repo "assets\SarasaGothicSC-Regular.ttf") `
  -Destination (Join-Path $ihStage "GameDir\mod\fonts\SarasaGothicSC-Regular.ttf") -Force
Copy-Item -LiteralPath (Join-Path $repo "assets\Sarasa-LICENSE.txt") `
  -Destination (Join-Path $ihStage "GameDir\mod\fonts\Sarasa-LICENSE.txt") -Force
& (Join-Path $repo "tools\hash-metadata.ps1") `
  -Metadata (Join-Path $ihStage "metadata.xml") `
  -GameDir (Join-Path $ihStage "GameDir")

Copy-Item -LiteralPath (Join-Path $ihhook "makebite\*") -Destination $hookStage -Recurse -Force
Copy-Item -LiteralPath $IhhookDll -Destination (Join-Path $hookStage "GameDir\dinput8.dll") -Force
New-Item -ItemType Directory -Path (Join-Path $hookStage "GameDir\mod\fonts") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repo "assets\SarasaGothicSC-Regular.ttf") `
  -Destination (Join-Path $hookStage "GameDir\mod\fonts\SarasaGothicSC-Regular.ttf") -Force
Copy-Item -LiteralPath (Join-Path $repo "assets\Sarasa-LICENSE.txt") `
  -Destination (Join-Path $hookStage "GameDir\mod\fonts\Sarasa-LICENSE.txt") -Force
& (Join-Path $repo "tools\hash-metadata.ps1") `
  -Metadata (Join-Path $hookStage "metadata.xml") `
  -GameDir (Join-Path $hookStage "GameDir")

function New-Package([string]$stage, [string]$name) {
  $target = Join-Path $out $name
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $target -CompressionLevel Optimal
  Get-FileHash -LiteralPath $target -Algorithm SHA256
}

$ihHash = New-Package $ihStage "Infinite-Heaven-r267-zh-CN.mgsv"
$hookHash = New-Package $hookStage "IHHook-r25-zh-CN.mgsv"

Remove-Item -LiteralPath $ihStage -Recurse -Force
Remove-Item -LiteralPath $hookStage -Recurse -Force

[pscustomobject]@{
  InfiniteHeaven = $ihHash.Path
  InfiniteHeavenSha256 = $ihHash.Hash
  IHHook = $hookHash.Path
  IHHookSha256 = $hookHash.Hash
} | ConvertTo-Json
