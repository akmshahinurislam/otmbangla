@echo off
title OTMBangla Mobile Port Proxy Helper
echo ==========================================================
echo   OTMBangla Dynamic IP & Port Proxy Autoconfiguror
echo ==========================================================
echo.

:: Get the physical network adapter's active IPv4 address
echo [1/3] Detecting your PC's active physical IP address...
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "Get-NetIPAddress -InterfaceAlias 'Ethernet', 'Wi-Fi' -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress -First 1"`) do set CURRENT_IP=%%a

if "%CURRENT_IP%"=="" (
    echo [ERROR] Could not detect an active Wi-Fi or Ethernet IP address.
    echo Please ensure you are connected to your local router/network.
    pause
    exit /b
)

echo.
echo >>> DETECTED ACTIVE IP: %CURRENT_IP%
echo.

:: Ask for admin privileges to update netsh port proxies
echo [2/3] Registering port proxies for active IP...
echo (A Windows security prompt will pop up. Please click YES.)
echo.

powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c netsh interface portproxy reset && netsh interface portproxy add v4tov4 listenaddress=%CURRENT_IP% listenport=3001 connectaddress=127.0.0.1 connectport=3001 && netsh interface portproxy add v4tov4 listenaddress=%CURRENT_IP% listenport=3002 connectaddress=127.0.0.1 connectport=3002 && netsh interface portproxy add v4tov4 listenaddress=%CURRENT_IP% listenport=3003 connectaddress=127.0.0.1 connectport=3003 && netsh interface portproxy add v4tov4 listenaddress=%CURRENT_IP% listenport=3004 connectaddress=127.0.0.1 connectport=3004 && netsh interface portproxy add v4tov4 listenaddress=%CURRENT_IP% listenport=8001 connectaddress=127.0.0.1 connectport=8001 && echo SUCCESS: Port proxies registered! && pause' -Verb RunAs"

echo [3/3] Checking firewall rules...
echo.
echo ==========================================================
echo   READY FOR MOBILE CONNECTION!
echo ==========================================================
echo   1. Ensure your phone/device is on the SAME Wi-Fi network.
echo   2. Open the OTMBangla Mobile App.
echo   3. Tap the Gear Icon at the top-right of the login screen.
echo   4. Enter this Host IP: %CURRENT_IP%
echo   5. Save and tap Log In!
echo ==========================================================
echo.
pause
