@echo off
cd /d "%~dp0"
echo.
echo  StageFlow — Front (http://localhost:3456)
echo  Ne pas double-cliquer sur les fichiers .html
echo.
start "" "http://localhost:3456/entreprise.html"
npm run dev
