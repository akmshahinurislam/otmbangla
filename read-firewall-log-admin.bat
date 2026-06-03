@echo off
:: This script requests Administrator privileges to safely open and read the locked Windows Defender Firewall log file.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/2] Administrator privileges confirmed.
    echo [2/2] Scanning C:\Temp\pfirewall.log for blocked connections...
    echo ----------------------------------------------------------------------
    
    :: Run elevated PowerShell with sharing-bypass C# FileStream reader
    powershell -Command "$log = 'C:\Temp\pfirewall.log'; if (Test-Path $log) { $fs = New-Object System.IO.FileStream($log, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite); $r = New-Object System.IO.StreamReader($fs); $text = $r.ReadToEnd(); $r.Close(); $fs.Close(); $lines = $text -split \"`n\"; foreach ($l in $lines) { if ($l -match 'DROP' -and ($l -match '3001' -or $l -match '3002' -or $l -match '3003' -or $l -match '3004' -or $l -match '8000' -or $l -match '8001')) { Write-Host $l } } } else { Write-Host 'Log file does not exist yet!' }"
    
    echo ----------------------------------------------------------------------
    echo Scan complete! If any rows are displayed above, those connections were blocked.
    echo.
    pause
    exit /b
) else (
    echo ==========================================================
    echo   OTMBangla Elevated Firewall Log Reader
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
