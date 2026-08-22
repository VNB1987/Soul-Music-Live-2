$ErrorActionPreference = "Stop"

$configPath = Join-Path $PSScriptRoot "dj-soul.local.json"
$defaultPlaylistId = "PLedJ9SZ73vniuUjEsj5oPpog0bMWxUbQG"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " DJ SOUL - CONECTARE YOUTUBE" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cheia ramane numai pe acest PC." -ForegroundColor Green
Write-Host "Nu va fi trimisa sau salvata pe GitHub." -ForegroundColor Green
Write-Host ""

$secureApiKey = Read-Host "Lipeste cheia YouTube API (textul ramane ascuns)" -AsSecureString

$apiKeyPointer = [IntPtr]::Zero

try {
  $apiKeyPointer =
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
      $secureApiKey
    )

  $apiKey =
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
      $apiKeyPointer
    )
} finally {
  if ($apiKeyPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR(
      $apiKeyPointer
    )
  }
}

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "Cheia YouTube API nu poate fi goala."
}

$playlistId = Read-Host "Playlist ID [$defaultPlaylistId]"

if ([string]::IsNullOrWhiteSpace($playlistId)) {
  $playlistId = $defaultPlaylistId
}

$config = [ordered]@{
  apiKey = $apiKey.Trim()
  playlistId = $playlistId.Trim()
}

$json = $config | ConvertTo-Json
$utf8 = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
  $configPath,
  $json,
  $utf8
)

try {
  $item = Get-Item $configPath
  $item.Attributes = $item.Attributes -bor [System.IO.FileAttributes]::Hidden
} catch {
  # Fisierul ramane protejat prin .gitignore chiar daca nu poate fi ascuns.
}

Write-Host ""
Write-Host "DJ Soul a fost configurat pentru YouTube." -ForegroundColor Green
Write-Host "Playlist: $playlistId" -ForegroundColor White
Write-Host ""
Write-Host "Poti porni acum Engine X cu start-live.bat." -ForegroundColor Yellow
Write-Host ""
