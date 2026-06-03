@echo off
:: This script requests Administrator privileges to list all firewall rules matching port 3001.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/2] Administrator privileges confirmed.
    echo [2/2] Scanning firewall rules for port 3001...
    
    powershell -Command "Get-NetFirewallRule | Where-Object { $_.Enabled -eq 'True' } | Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -match '3001' } | ForEach-Object { $rule = Get-NetFirewallRule -Name $_.InstanceId; [PSCustomObject]@{ DisplayName = $rule.DisplayName; Action = $rule.Action; Direction = $rule.Direction; LocalPort = $_.LocalPort } } | Format-Table -AutoSize | Out-String | Set-Content 'C:\Temp\port_rules.txt'"
    
    echo.
    echo ==========================================================
    echo   SUCCESS: Rules exported to C:\Temp\port_rules.txt!
    echo ==========================================================
    echo.
    pause
    exit /b
) else (
    echo ==========================================================
    echo   OTMBangla Port 3001 Rule Scanner
    echo ==========================================================
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~dpnx0' -Verb RunAs"
    exit /b
)
