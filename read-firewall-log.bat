@echo off
:: This script scans the Windows Defender Firewall log file for any DROPPED packets
:: matching the microservices ports: 3001, 3002, 3003, 3004, 8000, 8001.

set LOG_FILE=C:\Windows\System32\LogFiles\Firewall\pfirewall.log
if not exist "%LOG_FILE%" (
    set LOG_FILE=C:\Temp\pfirewall.log
)

echo ==========================================================
echo   OTMBangla Windows Firewall Packet Audit Scanner
echo ==========================================================
echo Target Log: %LOG_FILE%
echo.

if not exist "%LOG_FILE%" (
    echo [ERROR] Log file does not exist yet. 
    echo Please make sure you:
    echo 1. Created C:\Temp folder and enabled logging there in PowerShell.
    echo 2. Tried logging in from your mobile device to generate traffic.
    echo.
    pause
    exit /b
)

echo Scanning for BLOCKED packets on ports 3001-3004, 8000-8001...
echo ----------------------------------------------------------
echo Action  Source-IP        Dest-IP          Dest-Port Protocol
echo ----------------------------------------------------------

:: Copy to bypass exclusive write-lock by the Windows Firewall service
set SCAN_TEMP_FILE=%TEMP%\pfirewall_scan.log
copy /Y "%LOG_FILE%" "%SCAN_TEMP_FILE%" >nul 2>&1

:: Scan for drops on port 3001
findstr /R "DROP.*3001" "%SCAN_TEMP_FILE%"

:: Scan for drops on port 3002
findstr /R "DROP.*3002" "%SCAN_TEMP_FILE%"

:: Scan for drops on port 3003
findstr /R "DROP.*3003" "%SCAN_TEMP_FILE%"

:: Scan for drops on port 3004
findstr /R "DROP.*3004" "%SCAN_TEMP_FILE%"

:: Scan for drops on port 8000
findstr /R "DROP.*8000" "%SCAN_TEMP_FILE%"

:: Scan for drops on port 8001
findstr /R "DROP.*8001" "%SCAN_TEMP_FILE%"

:: Clean up
del "%SCAN_TEMP_FILE%" >nul 2>&1

echo ----------------------------------------------------------
echo Scan complete! If you see lines above starting with 'DROP',
echo it confirms that Windows Firewall is actively dropping the packets.
echo.
pause
