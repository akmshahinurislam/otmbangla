@echo off
:: This script requests Administrator privileges to clear all existing rules (especially BLOCK rules) for WSL2 and Docker,
:: and then re-applies fresh, pristine ALLOW rules.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/4] Administrator privileges confirmed.
    
    echo [2/4] Deleting any existing rules (including hidden BLOCK rules) for WSL and Docker...
    netsh advfirewall firewall delete rule name=all program="C:\Program Files\WSL\wslhost.exe"
    netsh advfirewall firewall delete rule name=all program="%SystemRoot%\System32\wslhost.exe"
    netsh advfirewall firewall delete rule name=all program="C:\Program Files\Docker\Docker\resources\vpnkit.exe"
    netsh advfirewall firewall delete rule name=all program="C:\Program Files\Docker\Docker\resources\com.docker.backend.exe"
    netsh advfirewall firewall delete rule name="OTMBangla Microservices"
    netsh advfirewall firewall delete rule name="WSL2 VM Inbound"
    netsh advfirewall firewall delete rule name="Docker Desktop Inbound Helper"
    netsh advfirewall firewall delete rule name="OTMBangla WSL2 System Host"
    netsh advfirewall firewall delete rule name="OTMBangla WSL2 Store Host"
    netsh advfirewall firewall delete rule name="OTMBangla Docker VPNKit"
    netsh advfirewall firewall delete rule name="OTMBangla Docker Backend"

    echo [3/4] Re-registering fresh, clean ALLOW rules...
    
    :: Add port rule
    netsh advfirewall firewall add rule name="OTMBangla Microservices" dir=in action=allow protocol=TCP localport=3001,3002,3003,3004,8000,8001 profile=any edge=yes
    
    :: Add program rules
    netsh advfirewall firewall add rule name="OTMBangla WSL2 Store Host" dir=in action=allow program="C:\Program Files\WSL\wslhost.exe" profile=any edge=yes
    netsh advfirewall firewall add rule name="OTMBangla WSL2 System Host" dir=in action=allow program="%SystemRoot%\System32\wslhost.exe" profile=any edge=yes
    netsh advfirewall firewall add rule name="OTMBangla Docker VPNKit" dir=in action=allow program="C:\Program Files\Docker\Docker\resources\vpnkit.exe" profile=any edge=yes
    netsh advfirewall firewall add rule name="OTMBangla Docker Backend" dir=in action=allow program="C:\Program Files\Docker\Docker\resources\com.docker.backend.exe" profile=any edge=yes

    echo [4/4] Ensuring virtual network interfaces are exempted...
    powershell -Command "Set-NetFirewallProfile -Profile Domain,Private,Public -DisabledInterfaceAliases @('vEthernet (WSL)', 'vEthernet (Default Switch)')"

    echo.
    echo ==========================================================
    echo   SUCCESS: All block rules deleted & Allow rules re-applied!
    echo ==========================================================
    echo.
    pause
    exit /b
) else (
    echo ==========================================================
    echo   OTMBangla Firewall Block Remover and Rule Re-builder
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
