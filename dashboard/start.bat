@echo off
set "CLAUDECODE="
cd /d "%~dp0.."
echo Starting DevSprint Dashboard...
node "%~dp0server.cjs" --cwd "%cd%"
pause
