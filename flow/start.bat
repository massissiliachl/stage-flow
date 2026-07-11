@echo off
cd /d "%~dp0"
echo.
echo  StageFlow — Front (https://stage-flow-6rl5.onrender.com)
echo  Ne pas double-cliquer sur les fichiers .html
echo.
start "" "https://stage-flow-6rl5.onrender.com/entreprise.html"
npm run dev
