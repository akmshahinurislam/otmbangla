@echo off
:: This script requests Administrator privileges to exempt the internal WSL2 and Docker virtual switches from Windows Firewall inspection.
:: This is the industry-standard fix for WSL2/Docker port forwarding deadlocks on Windows 10/11.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/2] Administrator privileges confirmed.
    echo [2/2] Exempting internal virtual adapters from firewall inspection...
    
    :: Tell Windows Firewall to ignore virtual interfaces for all three profiles
    powershell -Command "Set-NetFirewallProfile -Profile Domain,Private,Public -DisabledInterfaceAliases @('vEthernet (WSL)', 'vEthernet (Default Switch)')"
    
    echo.
    echo ==========================================================
    echo   SUCCESS: WSL virtual switches exempted from filtering!
    echo   (Your physical Ethernet remains fully protected)
    echo ==========================================================
    echo.
    pause
    exit /b
) else (
    echo ==========================================================
    echo   WSL2/Docker Virtual Adapter Firewall Helper
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
