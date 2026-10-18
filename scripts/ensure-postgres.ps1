$ErrorActionPreference = "Stop"

function Get-PostgresServices {
  Get-Service -ErrorAction Stop |
    Where-Object { $_.Name -match "^postgresql-x64-" }
}

function Test-PostgresPort {
  return [bool](Get-NetTCPConnection -State Listen -LocalPort 5432 -ErrorAction SilentlyContinue)
}

$services = @(Get-PostgresServices)

if ($services.Count -eq 0 -and -not (Test-PostgresPort)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "PostgreSQL is not installed and winget is unavailable. Install PostgreSQL 16, then run npm run dev again."
  }

  Write-Host "PostgreSQL is not installed. Installing PostgreSQL 16; Windows may ask for administrator approval..."
  & winget install --id PostgreSQL.PostgreSQL.16 --exact --source winget `
    --silent --accept-package-agreements --accept-source-agreements `
    --disable-interactivity `
    --override "--mode unattended --unattendedmodeui none --superpassword postgres --serverport 5432"

  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL installation failed (winget exit code $LASTEXITCODE). Resolve the installer error, then run npm run dev again."
  }

  $services = @(Get-PostgresServices)
}

$stoppedServices = @($services | Where-Object { $_.Status -ne "Running" })
foreach ($service in $stoppedServices) {
  Write-Host "Starting PostgreSQL service $($service.Name)..."
  Start-Service -Name $service.Name -ErrorAction Stop
}

$deadline = (Get-Date).AddSeconds(60)
while (-not (Test-PostgresPort) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 1
}

if (-not (Test-PostgresPort)) {
  throw "PostgreSQL did not start listening on port 5432. Check the Windows PostgreSQL service and server/.env DATABASE_URL."
}

Write-Host "PostgreSQL is accepting connections on port 5432."
