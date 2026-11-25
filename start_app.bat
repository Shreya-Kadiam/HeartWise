@echo off
title HeartWise Server
cd /d "%~dp0backend"
echo Starting HeartWise on http://127.0.0.1:5000 ...
echo Model Comparison Page: http://127.0.0.1:5000/model-comparison
start "" "http://127.0.0.1:5000"
python app.py
pause
