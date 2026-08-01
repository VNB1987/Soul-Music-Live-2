$ErrorActionPreference = "Stop"

$port = 8766
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".txt" = "text/plain; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif" = "image/gif"
  ".svg" = "image/svg+xml"
  ".webp" = "image/webp"
  ".ico" = "image/x-icon"
}

function Write-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [byte[]]$Body,
    [string]$ContentType,
    [string]$CacheControl = "no-cache"
  )

  $headers = @(
    "HTTP/1.1 $StatusCode $StatusText"
    "Content-Type: $ContentType"
    "Content-Length: $($Body.Length)"
    "Cache-Control: $CacheControl"
    "Access-Control-Allow-Origin: *"
    "Connection: close"
    ""
    ""
  ) -join "`r`n"

  $headerBytes =
    [System.Text.Encoding]::ASCII.GetBytes(
      $headers
    )

  $Stream.Write(
    $headerBytes,
    0,
    $headerBytes.Length
  )

  if ($Body.Length -gt 0) {
    $Stream.Write(
      $Body,
      0,
      $Body.Length
    )
  }

  $Stream.Flush()
}

$listener =
  [System.Net.Sockets.TcpListener]::new(
    [System.Net.IPAddress]::Loopback,
    $port
  )

try {
  $listener.Start()

  Write-Host ""
  Write-Host "===============================================" -ForegroundColor Cyan
  Write-Host " SOUL MUSIC LIVE SERVER" -ForegroundColor Yellow
  Write-Host "===============================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "URL: http://127.0.0.1:$port" -ForegroundColor Green
  Write-Host "Root: $root"
  Write-Host ""
  Write-Host "Server activ. Inchide aceasta fereastra pentru oprire." -ForegroundColor White
  Write-Host ""

  while ($true) {
    $client = $listener.AcceptTcpClient()
    $reader = $null
    $stream = $null

    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 1500
      $stream.WriteTimeout = 5000

      $reader =
        [System.IO.StreamReader]::new(
          $stream,
          [System.Text.Encoding]::ASCII,
          $false,
          1024,
          $true
        )

      $requestLine = $reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace(
        $requestLine
      )) {
        continue
      }

      while ($true) {
        $headerLine = $reader.ReadLine()

        if (
          $null -eq $headerLine -or
          $headerLine.Length -eq 0
        ) {
          break
        }
      }

      $parts = $requestLine.Split(" ")

      if ($parts.Length -lt 2) {
        throw "Cerere HTTP invalida"
      }

      $method = $parts[0].ToUpperInvariant()
      $rawPath = $parts[1].Split("?")[0]
      $decodedPath =
        [System.Uri]::UnescapeDataString(
          $rawPath
        )

      if ($decodedPath -eq "/") {
        $decodedPath = "/index.html"
      }

      $relativePath =
        $decodedPath.TrimStart("/").Replace(
          "/",
          [System.IO.Path]::DirectorySeparatorChar
        )

      $fullPath =
        [System.IO.Path]::GetFullPath(
          (Join-Path $root $relativePath)
        )

      $insideRoot =
        $fullPath.StartsWith(
          $rootPrefix,
          [System.StringComparison]::OrdinalIgnoreCase
        )

      if (-not $insideRoot) {
        $body =
          [System.Text.Encoding]::UTF8.GetBytes(
            "403 Forbidden"
          )

        $response = @{
          Stream = $stream
          StatusCode = 403
          StatusText = "Forbidden"
          Body = $body
          ContentType = "text/plain; charset=utf-8"
        }
        Write-Response @response

        continue
      }

      if (-not [System.IO.File]::Exists(
        $fullPath
      )) {
        $body =
          [System.Text.Encoding]::UTF8.GetBytes(
            "404 Not Found"
          )

        $response = @{
          Stream = $stream
          StatusCode = 404
          StatusText = "Not Found"
          Body = $body
          ContentType = "text/plain; charset=utf-8"
        }
        Write-Response @response

        continue
      }

      $extension =
        [System.IO.Path]::GetExtension(
          $fullPath
        ).ToLowerInvariant()

      $contentType =
        if ($mimeTypes.ContainsKey(
          $extension
        )) {
          $mimeTypes[$extension]
        } else {
          "application/octet-stream"
        }

      $body =
        if ($method -eq "HEAD") {
          [byte[]]::new(0)
        } else {
          [System.IO.File]::ReadAllBytes(
            $fullPath
          )
        }

      $cacheControl =
        if (
          $extension -eq ".txt" -or
          $extension -eq ".html"
        ) {
          "no-store, no-cache, must-revalidate"
        } else {
          "no-cache"
        }

      $response = @{
        Stream = $stream
        StatusCode = 200
        StatusText = "OK"
        Body = $body
        ContentType = $contentType
        CacheControl = $cacheControl
      }
      Write-Response @response
    } catch {
      try {
        $body =
          [System.Text.Encoding]::UTF8.GetBytes(
            "500 Internal Server Error"
          )

        $response = @{
          Stream = $stream
          StatusCode = 500
          StatusText = "Internal Server Error"
          Body = $body
          ContentType = "text/plain; charset=utf-8"
        }
        Write-Response @response
      } catch {
        # Conexiunea poate fi deja inchisa.
      }
    } finally {
      if ($null -ne $reader) {
        $reader.Dispose()
      }

      if ($null -ne $stream) {
        $stream.Dispose()
      }

      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
