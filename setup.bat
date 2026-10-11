@echo off
setlocal EnableDelayedExpansion
title CREATOR CORE - Autonomous Canvas Automation Suite

:: Royal Velvet / Purple Terminal Palette
color 05
cls

echo =========================================================================================
echo.
echo     [+]====================================================================[+]
echo      ^|                     C R E A T O R   C O R E                          ^|
echo      ^|                  Canvas Automation Injector                          ^|
echo      ^|                                                                      ^|
echo      ^|                 [ Developed by Mubashir Mamoon ]                     ^|
echo     [+]====================================================================[+]
echo.
echo =========================================================================================
echo.

:: 1. Self-Elevation to Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Administrator privileges required for environment setup. Elevating...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: 2. Automated Prerequisites Engine (Git & Python Auto-Installer)
echo [*] System Diagnostics: Checking Runtime Dependencies...
echo.

:: Check Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git not detected. Initiating automated silent install...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $installer = Join-Path $env:TEMP 'Git-Setup.exe'; Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe' -OutFile $installer -UseBasicParsing; Start-Process -FilePath $installer -ArgumentList '/VERYSILENT /NORESTART /NOCANCEL /SP-' -Wait; Remove-Item -Force $installer"
    set "PATH=C:\Program Files\Git\cmd;!PATH!"
    echo [OK] Git successfully installed and registered.
) else (
    echo [OK] Git runtime active.
)

:: Check Python
set "PY_EXEC="
for %%P in (pythonw.exe python.exe) do (
    if not defined PY_EXEC set "PY_EXEC=%%~$PATH:P"
)

if not defined PY_EXEC (
    if exist "C:\Program Files\Python311\python.exe" set "PY_EXEC=C:\Program Files\Python311\python.exe"
)

if not defined PY_EXEC (
    echo [!] Python runtime not detected. Initiating automated silent install...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $installer = Join-Path $env:TEMP 'Python-Setup.exe'; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe' -OutFile $installer -UseBasicParsing; Start-Process -FilePath $installer -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1 Include_test=0' -Wait; Remove-Item -Force $installer"
    set "PY_EXEC=C:\Program Files\Python311\python.exe"
    set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;!PATH!"
    echo [OK] Python 3.11 installed and PATH variables registered.
) else (
    echo [OK] Python runtime active: "!PY_EXEC!"
)

echo.
echo =========================================================================================
echo.

:: 3. Target Installation Directory Configuration
set "DEFAULT_DIR=%USERPROFILE%\CREATOR-CORE-Canvas-Injector"
echo Select installation directory:
echo [1] Default Directory: %DEFAULT_DIR%
echo [2] Custom Directory Path
echo.
set /p "LOC_CHOICE=Enter selection (1 or 2): "

if "%LOC_CHOICE%"=="2" (
    echo.
    set /p "USER_GIVEN_PATH=Enter destination folder path: "
    set "USER_GIVEN_PATH=!USER_GIVEN_PATH:"=!"
    set "TARGET_DIR=!USER_GIVEN_PATH!\CREATOR-CORE-Canvas-Injector"
) else (
    set "TARGET_DIR=%DEFAULT_DIR%"
)

echo.
echo [*] Installation target: "%TARGET_DIR%"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
cd /d "%TARGET_DIR%"

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

:: 4. Repository Synchronization
echo.
if exist "%TARGET_DIR%\.git" (
    echo [*] Synchronizing latest repository updates...
    git pull origin main
) else (
    echo [*] Cloning repository source files...
    git clone https://github.com/mubashirmamoonumt/CREATOR-CORE-Canvas-Injector.git "%TARGET_DIR%"
    if !errorlevel! neq 0 (
        echo [*] Initializing fallback repository binding...
        git init
        git remote remove origin >nul 2>&1
        git remote add origin https://github.com/mubashirmamoonumt/CREATOR-CORE-Canvas-Injector.git
        git fetch origin main
        git reset --hard origin/main
    )
)

:: 5. Python Dependency Packages Installation
echo.
echo [*] Installing required Python libraries (aiohttp, websockets, requests)...
"!PY_EXEC!" -m pip install --upgrade pip >nul 2>&1
"!PY_EXEC!" -m pip install aiohttp websockets requests >nul 2>&1
echo [OK] Python packages configured.

:: 6. Ngrok Binary Configuration
if not exist "%TARGET_DIR%\ngrok.exe" (
    echo.
    echo [*] Fetching Ngrok network tunnel client...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile '%TARGET_DIR%\ngrok.zip'"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%TARGET_DIR%\ngrok.zip' -DestinationPath '%TARGET_DIR%' -Force"
    if exist "%TARGET_DIR%\ngrok.zip" del /f /q "%TARGET_DIR%\ngrok.zip"
)

:: 7. Tunnel Deployment Architecture Selection
cls
echo =========================================================================================
echo.
echo     [+]====================================================================[+]
echo      ^|                     C R E A T O R   C O R E                          ^|
echo      ^|                  Canvas Automation Injector                          ^|
echo      ^|                                                                      ^|
echo      ^|                 [ Developed by Mubashir Mamoon ]                     ^|
echo     [+]====================================================================[+]
echo.
echo =========================================================================================
echo                            NETWORK TUNNEL ROUTING SELECTION
echo =========================================================================================
echo [1] Dedicated Static Domain (Production Architecture)
echo [2] Dynamic Ephemeral Endpoint (Standard Free Tier)
echo.
set /p "CHOICE=Select routing mode (1 or 2): "

if "%CHOICE%"=="1" goto setup_static
goto setup_random

:setup_static
cls
echo =========================================================================================
echo                         STATIC PRODUCTION CONFIGURATION
echo =========================================================================================
echo.
set /p "USER_TOKEN=Enter Ngrok Authtoken: "
set /p "USER_DOMAIN=Enter Static Domain Name: "

"%TARGET_DIR%\ngrok.exe" config add-authtoken %USER_TOKEN% >nul 2>&1

:: Background daemon configuration for static domain
echo Set WshShell = CreateObject("WScript.Shell") > "%TARGET_DIR%\start_services.vbs"
echo WshShell.Run """!PY_EXEC!"" ""%TARGET_DIR%\relay_server.py""", 0, False >> "%TARGET_DIR%\start_services.vbs"
echo WshShell.Run """%TARGET_DIR%\ngrok.exe"" http 5000 --domain=%USER_DOMAIN%", 0, False >> "%TARGET_DIR%\start_services.vbs"
goto finish_setup

:setup_random
(
echo @echo off
echo title CREATOR CORE - Tunnel Monitor
echo color 05
echo Initializing public network route...
echo timeout /t 4 /nobreak ^>nul
echo :check_url
echo powershell -NoProfile -ExecutionPolicy Bypass -Command "$res = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -ErrorAction SilentlyContinue; if ($res) { Write-Output $res.tunnels[0].public_url } else { exit 1 }" ^> "%TARGET_DIR%\current_url.txt"
echo if %%errorlevel%% neq 0 ^(
echo     timeout /t 2 /nobreak ^>nul
echo     goto check_url
echo ^)
echo cls
echo =========================================================================================
echo                           CREATOR CORE - TUNNEL ACTIVE
echo =========================================================================================
echo.
echo Active Public Webhook Endpoint:
echo.
echo      ^>^>  
echo  type "%TARGET_DIR%\current_url.txt"
echo.
echo =========================================================================================
echo pause
) > "%TARGET_DIR%\show_url.bat"

:: Background daemon configuration for dynamic domain
echo Set WshShell = CreateObject("WScript.Shell") > "%TARGET_DIR%\start_services.vbs"
echo WshShell.Run """!PY_EXEC!"" ""%TARGET_DIR%\relay_server.py""", 0, False >> "%TARGET_DIR%\start_services.vbs"
echo WshShell.Run """%TARGET_DIR%\ngrok.exe"" http 5000", 0, False >> "%TARGET_DIR%\start_services.vbs"
echo WScript.Sleep 3000 >> "%TARGET_DIR%\start_services.vbs"
echo WshShell.Run "cmd /c ""%TARGET_DIR%\show_url.bat""", 1, False >> "%TARGET_DIR%\start_services.vbs"

:finish_setup
:: 8. Windows System Startup Hook
echo.
echo [*] Installing automatic persistence trigger...
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\createshortcut.vbs"
echo sLinkFile = "%STARTUP_DIR%\CreatorCoreRelay.lnk" >> "%TEMP%\createshortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\createshortcut.vbs"
echo oLink.TargetPath = "%TARGET_DIR%\start_services.vbs" >> "%TEMP%\createshortcut.vbs"
echo oLink.WorkingDirectory = "%TARGET_DIR%" >> "%TEMP%\createshortcut.vbs"
echo oLink.Save >> "%TEMP%\createshortcut.vbs"
cscript //nologo "%TEMP%\createshortcut.vbs" >nul 2>&1
if exist "%TEMP%\createshortcut.vbs" del /f /q "%TEMP%\createshortcut.vbs"

:: 9. Port Cleansing & Daemon Service Execution
echo.
echo [*] Resetting active port bindings...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5000, 8765 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }" >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1

echo [*] Initializing background automation daemons...
wscript "%TARGET_DIR%\start_services.vbs"

timeout /t 3 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue) { Write-Output '[SUCCESS] Relay Server successfully listening on port 8765.' } else { Write-Output '[WARNING] Port 8765 listener initializing in background.' }"

:: 10. Copy Directory Path to User Clipboard
echo|set /p="%TARGET_DIR%"| clip

:: 11. Final Success & Chrome Loading Instructions
cls
echo =========================================================================================
echo.
echo     [+]====================================================================[+]
echo      ^|                     C R E A T O R   C O R E                          ^|
echo      ^|                  Canvas Automation Injector                          ^|
echo      ^|                                                                      ^|
echo      ^|                 [ Developed by Mubashir Mamoon ]                     ^|
echo     [+]====================================================================[+]
echo.
echo =========================================================================================
echo                       ALL INSTALLATIONS COMPLETED SUCCESSFULLY!
echo =========================================================================================
echo.
echo  [!] YOUR EXTENSION DIRECTORY PATH HAS BEEN COPIED TO CLIPBOARD!
echo.
echo  ---------------------------------------------------------------------------------------
echo   FOLDER PATH:  %TARGET_DIR%
echo  ---------------------------------------------------------------------------------------
echo.
echo  STEPS TO LOAD IN GOOGLE CHROME:
echo.
echo   1. Google Chrome Extensions page is now opening automatically (chrome://extensions)
echo   2. Turn ON the "Developer mode" toggle switch in the top-right corner.
echo   3. Click the "Load unpacked" button in the top-left corner.
echo   4. In the folder picker bar, press (Ctrl + V) and hit Enter to select this folder:
echo      "%TARGET_DIR%"
echo.
echo =========================================================================================
start chrome "chrome://extensions"
pause
