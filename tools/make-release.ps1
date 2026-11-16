param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$IhhookDll
)

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "package.ps1") -RepoRoot $RepoRoot -IhhookDll $IhhookDll -OutputDir (Join-Path $RepoRoot "artifacts")
