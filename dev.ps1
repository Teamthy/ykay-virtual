# YK-Virtual — Windows PowerShell dev helper.
# Same workflows as the Makefile, for machines without make.
#
# Usage:
#   .\dev.ps1 infra       # start Postgres + Redis (Docker)
#   .\dev.ps1 migrate     # apply migrations
#   .\dev.ps1 api         # run the API (http://localhost:8080)
#   .\dev.ps1 worker      # run the background worker (queue + crons)
#   .\dev.ps1 web         # install deps (first run) + start Next.js (:3000)
#   .\dev.ps1 test        # go test + vitest
#   .\dev.ps1 build       # go build + next build
#
# Prerequisites: Docker Desktop, Go 1.22+, Node 20 LTS.
param(
  [Parameter(Position = 0)][string]$Task = "help"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Infra   { docker compose up -d postgres redis }
function Migrate { go run ./cmd/migrate --cmd=up }
function Api     { go run ./cmd/api }
function Worker  { go run ./cmd/worker }
function Web     {
  if (-not (Test-Path "client\node_modules")) {
    Write-Host "First run: installing client dependencies…" -ForegroundColor Cyan
    Push-Location client; npm install; Pop-Location
  }
  Push-Location client; npm run dev; Pop-Location
}
function TestAll {
  go test ./...
  Push-Location client; npm test; Pop-Location
}
function Build {
  go build ./...
  Push-Location client; npm run build; Pop-Location
}

switch ($Task) {
  "infra"   { Infra }
  "migrate" { Migrate }
  "api"     { Api }
  "worker"  { Worker }
  "web"     { Web }
  "test"    { TestAll }
  "build"   { Build }
  default {
    Write-Host @"
YK-Virtual dev helper — usage:
  .\dev.ps1 infra       start Postgres + Redis (Docker)
  .\dev.ps1 migrate     apply migrations
  .\dev.ps1 api         run the API (http://localhost:8080)
  .\dev.ps1 worker      run the background worker
  .\dev.ps1 web         start the Next.js app (http://localhost:3000)
  .\dev.ps1 test        go test + vitest
  .\dev.ps1 build       go build + next build

Tip: run api / worker / web each in its own PowerShell window.
"@
  }
}
