@echo off
REM Script pour committer les modifications Frontend
REM Exécutez ce fichier dans le dossier du projet (double‑clic ou PowerShell)

ngit --version >nul 2>&1
if ERRORLEVEL 1 (
  echo Git n'est pas installe ou introuvable.
  echo Installez Git depuis https://git-scm.com/downloads puis relancez ce script.
  pause
  exit /b 1
)

necho Ajout des fichiers modifiés et commit...
git add -A
ngit commit -m "Frontend: Single 100_000 DA plan + CCP instructions; add Baridi handlers; placeholder CCP"
if ERRORLEVEL 1 (
  echo Commit a échoue. Veuillez verifier 'git status' pour plus de details.
) else (
  echo Commit reussi.
)
pause
