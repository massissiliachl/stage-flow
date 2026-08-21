# StageFlow — configure DATABASE_URL localement et applique le schéma Supabase.
# Usage:
#   .\scripts\setup-production-db.ps1 -DatabaseUrl "postgresql://postgres.xxxx:..."
#   .\scripts\setup-production-db.ps1   # lit DATABASE_URL depuis .env

param(
  [string]$DatabaseUrl = ""
)

$ErrorActionPreference = "Stop"
$backendRoot = Split-Path $PSScriptRoot -Parent
Set-Location $backendRoot

if ($DatabaseUrl) {
  $envFile = Join-Path $backendRoot ".env"
  $content = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
  if ($content -match '(?m)^DATABASE_URL=.*$') {
    $content = $content -replace '(?m)^DATABASE_URL=.*$', "DATABASE_URL=$DatabaseUrl"
  } else {
    $content = "DATABASE_URL=$DatabaseUrl`n$content"
  }
  Set-Content -Path $envFile -Value $content -NoNewline
  Write-Host "DATABASE_URL enregistrée dans .env"
}

Write-Host "`n→ Migration schema + patches..."
npm run db:migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n→ Test connexion..."
node -e "require('dotenv').config(); const {getPool}=require('./lib/db'); (async()=>{ const p=getPool(); const r=await p.query('SELECT NOW() AS now'); console.log('Connexion OK', r.rows[0]); process.exit(0);})().catch(e=>{ console.error('Echec:', e.message); process.exit(1); });"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host @"

=== Prochaine étape Render ===
1. dashboard.render.com → service API stage-flow-6rl5
2. Environment → DATABASE_URL = (même URL que ci-dessus)
3. Manual Deploy
4. Vérifier: https://stage-flow-6rl5.onrender.com/api/health → postgres.connected: true

"@
