@echo off
:: This script requests Administrator privileges to allow the modern WSL2 Network Relay process through the Windows Firewall.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/2] Administrator privileges confirmed.
    echo [2/2] Registering Windows Firewall allow rule for wslrelay.exe...
    
    :: Add the wslrelay.exe allow rule
    netsh advfirewall firewall add rule name="OTMBangla WSL Network Relay" dir=in action=allow program="C:\Program Files\WSL\wslrelay.exe" profile=any edge=yes
    
    echo.
    echo ==========================================================
    echo   SUCCESS: WSL Network Relay (wslrelay.exe) Allowed!
    echo ==========================================================
    echo.
    pause
    exit /b
) else (
    echo ==========================================================
    echo   OTMBangla WSL Relay Firewall Helper
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
