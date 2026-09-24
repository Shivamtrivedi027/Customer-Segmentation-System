@echo off
echo ========================================================
echo Starting Customer Segmentation System
echo ========================================================
echo.

REM Detect Python installation (Python 3.14, Python 3.13, or system PATH)
set PYTHON_BIN=python
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
    set PYTHON_BIN="%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
)
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set PYTHON_BIN="%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
)


echo Starting Flask backend on http://127.0.0.1:5000 ...
start "Customer Segmentation Backend" cmd /k "cd /d %~dp0backend && %PYTHON_BIN% app.py"

echo Waiting 2 seconds for server to initialize...
timeout /t 2 /nobreak > nul

echo Opening frontend in default browser...
start "" "%~dp0frontend\index.html"

echo.
echo ========================================================
echo Application launched!
echo Backend:  http://127.0.0.1:5000
echo Frontend: %~dp0frontend\index.html
echo ========================================================
pause
