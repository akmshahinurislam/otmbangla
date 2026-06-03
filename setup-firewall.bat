@echo off
:: This script requests Administrator privileges to add the Windows Firewall inbound rules.
:: It allows your physical mobile device to connect to the Docker microservices running on your PC.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed. Adding firewall rules...
    netsh advfirewall firewall add rule name="OTMBangla Microservices" dir=in action=allow protocol=TCP localport=3001,3002,3003,3004,8000,8001
    echo.
    echo Rule registration successful!
    pause
    exit /b
) else (
    echo ==========================================================
    echo   OTMBangla Mobile Connection Firewall Helper
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)

