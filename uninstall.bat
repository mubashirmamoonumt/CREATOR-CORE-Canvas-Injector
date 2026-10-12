@echo off
setlocal EnableDelayedExpansion
title CREATOR CORE - Complete Cleanup & Uninstaller

color 05
cls

echo =========================================================================================
echo.
echo     [+]====================================================================[+]
echo      ^|                     C R E A T O R   C O R E                          ^|
echo      ^|                 Full System Cleanup & Uninstaller                    ^|
echo      ^|                                                                      ^|
echo      ^|                 [ Developed by Mubashir Mamoon ]                     ^|
echo     [+]====================================================================[+]
echo.
echo =========================================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Administrator privileges required for full cleanup. Elevating...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo [*] Starting CREATOR CORE Removal Process...
echo.

:: 2. Kill Active Background Daemons & Clear Ports (5000 & 8765)
echo [*] Terminating background relay processes and clearing active ports...
taskkill /F /IM ngrok.exe >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5000, 8765 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name python, pythonw -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*relay_server.py*' } | Stop-Process -Force" >nul 2>&1
echo [OK] All running processes terminated.

:: 3. Remove Windows Startup Persistence
echo [*] Removing automatic startup hook...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_DIR%\CreatorCoreRelay.lnk" (
    del /f /q "%STARTUP_DIR%\CreatorCoreRelay.lnk" >nul 2>&1
    echo [OK] Startup shortcut removed.
) else (
    echo [*] No startup shortcut detected.
)

:: 4. Remove Target Installation Directory
set "TARGET_DIR=%USERPROFILE%\CREATOR-CORE-Canvas-Injector"
echo.
echo [*] Removing installation folder: "%TARGET_DIR%"...
if exist "%TARGET_DIR%" (
    cd /d "%USERPROFILE%"
    rmdir /s /q "%TARGET_DIR%"
    echo [OK] Installation folder deleted successfully.
) else (
    echo [*] Installation folder already removed or not found.
)

echo.
echo =========================================================================================
echo                     SYSTEM CLEANUP COMPLETED SUCCESSFULLY!
echo =========================================================================================
echo.
echo  1. All background daemons and ports have been stopped.
echo  2. Windows Startup auto-run shortcut has been deleted.
echo  3. The project folder has been deleted.
echo.
echo  Note: To remove the Chrome extension, go to chrome://extensions and click 'Remove'.
echo =========================================================================================
pause
