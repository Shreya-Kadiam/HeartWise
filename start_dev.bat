@echo off
echo Starting HeartWise Backend (port 5000) and React Dev Server (port 5173)...
start "HeartWise Backend" cmd /k "cd /d %~dp0backend && python app.py"
start "HeartWise Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both servers launched. Open http://localhost:5173 in your browser.
