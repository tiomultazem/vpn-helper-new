@echo off
setlocal
cls

if "%~1"=="--child" goto :main
start "VPN Helper" cmd /c "%~f0" --child
exit /b

:main
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator permission...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '--child' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
cls

echo Stopping existing VPN Helper processes...
taskkill /F /IM openconnect.exe /T >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root = (Resolve-Path '%~dp0').Path.TrimEnd('\'); $envFile = Join-Path $root '.env'; $ports = @(8765, 8020); if (Test-Path $envFile) { Get-Content $envFile | ForEach-Object { if ($_ -match '^\s*(app_port|callback_port)\s*=\s*(\d+)') { $ports += [int]$matches[2] } } }; $pids = New-Object System.Collections.Generic.HashSet[int]; foreach ($port in ($ports | Select-Object -Unique)) { Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 -and $_.OwningProcess -ne $PID } | ForEach-Object { [void]$pids.Add([int]$_.OwningProcess) } }; foreach ($id in $pids) { try { $proc = Get-Process -Id $id -ErrorAction Stop; Write-Host ('Stopping PID ' + $id + ': ' + $proc.ProcessName); Stop-Process -Id $id -Force -ErrorAction Stop } catch { } }"

python -m src.app
pause
