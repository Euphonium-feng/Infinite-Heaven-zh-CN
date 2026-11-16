param(
  [Parameter(Mandatory = $true)]
  [string]$Metadata,
  [Parameter(Mandatory = $true)]
  [string]$GameDir
)

$ErrorActionPreference = "Stop"
$metadataPath = (Resolve-Path -LiteralPath $Metadata).Path
$root = (Resolve-Path -LiteralPath $GameDir).Path
[xml]$xml = Get-Content -LiteralPath $metadataPath -Raw

$fileEntriesNode = $xml.ModEntry.SelectSingleNode("FileEntries")
if ($null -eq $fileEntriesNode) {
  $entries = $xml.CreateElement("FileEntries")
  [void]$xml.ModEntry.AppendChild($entries)
  $fileEntriesNode = $entries
}

foreach ($entry in $fileEntriesNode.SelectNodes("FileEntry")) {
  $relative = $entry.FilePath.TrimStart("/").Replace("/", "\")
  $file = Join-Path $root $relative
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Missing FileEntry: $relative"
  }
  $entry.ContentHash = (Get-FileHash -LiteralPath $file -Algorithm MD5).Hash
}

$known = @{}
foreach ($entry in $fileEntriesNode.SelectNodes("FileEntry")) {
  $known[$entry.FilePath] = $true
}
foreach ($file in Get-ChildItem -LiteralPath $root -Recurse -File) {
  $relative = "/" + $file.FullName.Substring($root.Length).Replace("\", "/").TrimStart("/")
  if ($relative -eq "/metadata.xml") { continue }
  if ($known.ContainsKey($relative)) { continue }
  $entry = $xml.CreateElement("FileEntry")
  $entry.SetAttribute("FilePath", $relative)
  $entry.SetAttribute("ContentHash", (Get-FileHash -LiteralPath $file.FullName -Algorithm MD5).Hash)
  [void]$fileEntriesNode.AppendChild($entry)
  $known[$relative] = $true
}

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$settings.OmitXmlDeclaration = $false
$writer = [System.Xml.XmlWriter]::Create($metadataPath, $settings)
try {
  $xml.Save($writer)
} finally {
  $writer.Dispose()
}
