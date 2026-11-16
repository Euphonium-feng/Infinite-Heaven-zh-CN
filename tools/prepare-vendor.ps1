param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$vendor = Join-Path $repo "vendor"
$ih = Join-Path $vendor "infinite-heaven"
$hook = Join-Path $vendor "ihhook"

if (-not (Test-Path -LiteralPath (Join-Path $ih "GameDir\mod\modules\InfLang.lua"))) {
  $zip = Join-Path $env:TEMP "Infinite.Heaven.r267.zip"
  $url = "https://github.com/kapuragu/InfiniteHeaven/releases/download/r267/Infinite.Heaven.r267.zip"
  if (-not (Test-Path -LiteralPath $zip) -or (Get-Item $zip).Length -lt 50000000) {
    Invoke-WebRequest -Uri $url -OutFile $zip
  }
  $extract = Join-Path $env:TEMP "InfiniteHeaven-r267-extract"
  Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction SilentlyContinue
  Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
  New-Item -ItemType Directory -Path $ih -Force | Out-Null
  if (Test-Path -LiteralPath (Join-Path $extract "metadata.xml")) {
    Copy-Item -LiteralPath (Join-Path $extract "*") -Destination $ih -Recurse -Force
  } else {
    $inner = Get-ChildItem -LiteralPath $extract -Directory | Select-Object -First 1
    if (-not $inner) { throw "r267 archive has neither metadata.xml nor a root folder" }
    Copy-Item -LiteralPath (Join-Path $inner.FullName "*") -Destination $ih -Recurse -Force
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $hook "IHHook\IHHook.vcxproj"))) {
  git clone --branch r25 --depth 1 https://github.com/kapuragu/IHHook.git $hook
}

Copy-Item -LiteralPath (Join-Path $repo "assets\SarasaGothicSC-Regular.ttf") `
  -Destination (Join-Path $hook "include\GameDir\mod\fonts\SarasaGothicSC-Regular.ttf") -Force
Copy-Item -LiteralPath (Join-Path $repo "assets\SarasaGothicSC-Regular.ttf") `
  -Destination (Join-Path $hook "makebite\GameDir\mod\fonts\SarasaGothicSC-Regular.ttf") -Force

Copy-Item -LiteralPath (Join-Path $repo "patches\infinite-heaven\InfChinese.lua") `
  -Destination (Join-Path $ih "GameDir\mod\modules\InfChinese.lua") -Force
Copy-Item -LiteralPath (Join-Path $repo "patches\infinite-heaven\InfLangProc.lua") `
  -Destination (Join-Path $ih "GameDir\mod\modules\InfLangProc.lua") -Force
Copy-Item -LiteralPath (Join-Path $repo "patches\infinite-heaven\Ivars.lua") `
  -Destination (Join-Path $ih "GameDir\mod\modules\Ivars.lua") -Force
Copy-Item -LiteralPath (Join-Path $repo "patches\ihhook\StyleEditor.cpp") `
  -Destination (Join-Path $hook "IHHook\StyleEditor.cpp") -Force
Copy-Item -LiteralPath (Join-Path $repo "patches\ihhook\IHHook.vcxproj") `
  -Destination (Join-Path $hook "IHHook\IHHook.vcxproj") -Force
Copy-Item -LiteralPath (Join-Path $repo "patches\ihhook\ChineseGlyphRanges.h") `
  -Destination (Join-Path $hook "IHHook\ChineseGlyphRanges.h") -Force
