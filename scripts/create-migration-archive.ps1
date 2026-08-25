param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $Parent = Split-Path -Parent $RepositoryRoot
  $OutputPath = Join-Path $Parent "codex-ppt-full-$Timestamp.zip"
}

$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $OutputPath) {
  throw "Refusing to overwrite existing archive: $OutputPath"
}

Push-Location $RepositoryRoot
try {
  & tar.exe -a -c -f $OutputPath --exclude=.git --exclude=node_modules .
  if ($LASTEXITCODE -ne 0) {
    throw "tar.exe failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$Archive = Get-Item -LiteralPath $OutputPath
[pscustomobject]@{
  Path = $Archive.FullName
  SizeMB = [math]::Round($Archive.Length / 1MB, 2)
  CreatedAt = $Archive.CreationTime
}
