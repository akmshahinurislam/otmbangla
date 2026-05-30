@echo off
echo ===================================================
echo   SLT Analysis Microservice Setup & Startup
echo ===================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.9+ and try again.
    pause
    exit /b 1
)

echo [1/2] Installing requirements...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Some dependencies failed to install. Retrying with --user option...
    pip install -r requirements.txt --user
)

echo.
echo [2/2] Launching FastAPI analysis-service on http://localhost:8000...
echo.
python main.py

pause
