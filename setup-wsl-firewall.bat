@echo off
:: This script requests Administrator privileges to allow the WSL2 and Docker engines through the Windows Firewall.
:: This is a common requirement to allow local Wi-Fi devices to connect to WSL2/Docker containers.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed. Adding engine-level firewall rules...
    
    :: Allow WSL2 Virtual Machine Host
    netsh advfirewall firewall add rule name="WSL2 VM Inbound" dir=in action=allow program="%SystemRoot%\System32\wslhost.exe" profile=any
    
    :: Allow Docker Desktop Network Helper
    netsh advfirewall firewall add rule name="Docker Desktop Inbound Helper" dir=in action=allow program="C:\Program Files\Docker\Docker\resources\vpnkit.exe" profile=any
    
    echo.
    echo WSL2 and Docker Firewall Rules registered successfully!
    pause
    exit /b
) else (
    echo ==========================================================
    echo   WSL2/Docker Mobile Connection Firewall Helper
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
