@echo off
cd /d "%~dp0"
echo.
echo  StageFlow — Front (https://stageflow-9775.onrender.com)
echo  Ne pas double-cliquer sur les fichiers .html
echo.
start "" "https://stageflow-9775.onrender.com/entreprise.html"
npm run dev
