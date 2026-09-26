# Relance un projet Supabase en pause via l'API Management.
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\restore-supabase.ps1
#
# Token : https://supabase.com/dashboard/account/tokens

param(
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN,
  [string]$ProjectRef = "oyhuelfsmtcicbnwjkha",
  [string]$ApiHealth = "https://stage-flow-6rl5.onrender.com/api/health"
)

$ErrorActionPreference = "Stop"

if (-not $AccessToken) {
  Write-Host @"
Token Supabase manquant.

1. Allez sur https://supabase.com/dashboard/account/tokens
2. Create token (scope: projects write)
3. PowerShell :
   `$env:SUPABASE_ACCESS_TOKEN = "sbp_votre_token"
   .\scripts\restore-supabase.ps1
"@ -ForegroundColor Yellow
  exit 1
}

Write-Host "→ Vérification API..."
$health = curl.exe -s --max-time 30 $ApiHealth | ConvertFrom-Json
if ($health.postgres.connected -eq $true) {
  Write-Host "OK — base déjà connectée." -ForegroundColor Green
  exit 0
}

Write-Host "→ Projet en pause. Restauration Supabase ($ProjectRef)..."
curl.exe -sf --max-time 120 -X POST `
  "https://api.supabase.com/v1/projects/$ProjectRef/restore" `
  -H "Authorization: Bearer $AccessToken" `
  -H "Content-Type: application/json"

Write-Host "→ Attente 90 secondes..."
Start-Sleep -Seconds 90

Write-Host "→ Revérification..."
$health2 = curl.exe -s --max-time 30 $ApiHealth | ConvertFrom-Json
if ($health2.postgres.connected -eq $true) {
  Write-Host "OK — base reconnectée. Inscription entreprise disponible." -ForegroundColor Green
  exit 0
}

Write-Host "Échec — ouvrez https://supabase.com/dashboard/project/$ProjectRef et cliquez Resume project." -ForegroundColor Red
exit 1
