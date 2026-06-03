@echo off
:: This script requests Administrator privileges to register all required ports and engine executables.
:: It ensures that both physical ports and modern WSL2 virtual machine paths are allowed.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/3] Administrator privileges confirmed.
    echo [2/3] Adding port-level inbound rules...
    
    :: Add general port rules
    netsh advfirewall firewall add rule name="OTMBangla Microservices" dir=in action=allow protocol=TCP localport=3001,3002,3003,3004,8000,8001 profile=any edge=yes
    
    echo [3/3] Adding WSL2 and Docker engine-level rules...
    
    :: Allow WSL2 Virtual Machine Host (Standard Path)
    netsh advfirewall firewall add rule name="OTMBangla WSL2 System Host" dir=in action=allow program="%SystemRoot%\System32\wslhost.exe" profile=any edge=yes
    
    :: Allow WSL2 Virtual Machine Host (Store App Path - Modern Windows 11)
    netsh advfirewall firewall add rule name="OTMBangla WSL2 Store Host" dir=in action=allow program="C:\Program Files\WSL\wslhost.exe" profile=any edge=yes
    
    :: Allow Docker Desktop Network Agent
    netsh advfirewall firewall add rule name="OTMBangla Docker VPNKit" dir=in action=allow program="C:\Program Files\Docker\Docker\resources\vpnkit.exe" profile=any edge=yes
    
    :: Allow Docker Desktop Backend
    netsh advfirewall firewall add rule name="OTMBangla Docker Backend" dir=in action=allow program="C:\Program Files\Docker\Docker\resources\com.docker.backend.exe" profile=any edge=yes

    echo.
    echo ==========================================================
    echo   SUCCESS: All firewall exceptions applied!
    echo ==========================================================
    echo.
    pause
    exit /b
) else (
    echo ==========================================================
    echo   OTMBangla Ultimate Mobile Connection Firewall Helper
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
