@echo off
setlocal EnableDelayedExpansion
set "User_name=Administrator"

echo ==========================================
echo       Screenpipe Launcher
echo ==========================================
echo.

:: 1. Clean up old video files
echo [1/4] Cleaning up old video files (keeping today and yesterday)...
set "DATA_DIR=C:\Users\%User_name%\.screenpipe\data"

:: Get today and yesterday dates using PowerShell
for /f "usebackq tokens=*" %%a in (`powershell -command "(Get-Date).ToString('yyyy-MM-dd')"`) do set "TODAY=%%a"
for /f "usebackq tokens=*" %%a in (`powershell -command "(Get-Date).AddDays(-1).ToString('yyyy-MM-dd')"`) do set "YESTERDAY=%%a"

echo [CHECK] Keep dates: %TODAY% (Today) and %YESTERDAY% (Yesterday)

if exist "%DATA_DIR%" (
    pushd "%DATA_DIR%"
    :: Iterate over mp4 files
    for %%F in (*.mp4) do (
        echo "%%F" | findstr "%TODAY%" >nul
        if errorlevel 1 (
            echo "%%F" | findstr "%YESTERDAY%" >nul
            if errorlevel 1 (
                echo [DELETE] Deleting expired file: %%F
                del "%%F"
            )
        )
    )
    popd
    echo [INFO] Cleanup complete.
) else (
    echo [WARNING] Data directory not found: %DATA_DIR%
)
echo.

:: 2. Check Ollama status
echo [2/4] Checking AI Service (Ollama)...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Ollama is already running.
) else (
    echo [INFO] Ollama is not running, starting...
    start "Ollama Server" /MIN ollama serve
    timeout /t 5 >nul
)

:: 3. Start Screenpipe
echo [3/4] Starting Screenpipe...
if exist "C:\Users\%User_name%\screenpipe\bin\screenpipe.exe" (
    start "Screenpipe Backend" "C:\Users\%User_name%\screenpipe\bin\screenpipe.exe"
    echo [INFO] Screenpipe started.
) else (
    echo [ERROR] Screenpipe executable not found.
    pause
    exit /b 1
)

:: 4. Verify Notion plugin status
echo [4/4] Waiting for Notion plugin (port 44719)...
set "RETRIES=0"
:CHECK_PORT
netstat -an | find "44719" | find "LISTENING" >nul
if "%ERRORLEVEL%"=="0" (
    echo.
    echo [SUCCESS] Notion plugin started successfully on port 44719!
    echo [SUCCESS] Daily logging is ready.
) else (
    set /a RETRIES+=1
    if !RETRIES! LSS 20 (
        timeout /t 2 >nul
        goto CHECK_PORT
    ) else (
        echo.
        echo [WARNING] Notion plugin startup timed out.
        echo Please check Screenpipe window for errors.
        echo Screenpipe backend is running, plugin might start later.
    )
)

echo.
echo Script finished. Closing in 10 seconds.
timeout /t 10
exit