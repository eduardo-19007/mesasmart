param(
  [Parameter(Mandatory = $true)][string]$OutputPath
)
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL no está configurada en esta sesión." }
$target = [System.IO.Path]::GetFullPath($OutputPath)
$parent = Split-Path -Parent $target
if (-not $parent) { throw "Indique una ruta de salida con directorio." }
New-Item -ItemType Directory -Force -Path $parent | Out-Null
$databaseUri = [Uri]$env:DATABASE_URL
$credentials = $databaseUri.UserInfo.Split(':', 2)
if ($credentials.Count -ne 2) { throw "DATABASE_URL debe incluir usuario y contraseña." }
$env:PGPASSWORD = [Uri]::UnescapeDataString($credentials[1])
try {
  & pg_dump --format=custom --no-owner --no-privileges --host $databaseUri.Host --port $databaseUri.Port --username ([Uri]::UnescapeDataString($credentials[0])) --file $target $databaseUri.AbsolutePath.TrimStart('/')
  if ($LASTEXITCODE -ne 0) { throw "pg_dump terminó con código $LASTEXITCODE." }
  Write-Output "Respaldo creado: $target"
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
