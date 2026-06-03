@echo off
:: This script requests Administrator privileges to enable Windows Firewall logging for blocked/dropped packets.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/2] Administrator privileges confirmed.
    echo [2/2] Enabling Windows Firewall logging for blocked (dropped) inbound packets...
    
    :: Enable logging for Domain, Private, and Public profiles
    powershell -Command "Set-NetFirewallProfile -Profile Domain,Private,Public -LogBlocked True -LogFilePath 'C:\Windows\System32\LogFiles\Firewall\pfirewall.log' -LogMaxSizeKilobytes 4096"
    
    echo.
    echo ==========================================================
    echo   SUCCESS: Firewall logging enabled!
    echo   Logs will be written to C:\Windows\System32\LogFiles\Firewall\pfirewall.log
    echo ==========================================================
    echo.
    pause
    exit /b
) else (
    echo ==========================================================
    echo   OTMBangla Firewall Logging Activator
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
