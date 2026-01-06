@echo off
chcp 65001 > nul
echo ==========================================
echo       Screenpipe 一键启动脚本
echo ==========================================
echo.

:: 1. 清理旧视频文件
echo [1/4] 正在清理旧视频文件 (仅保留今天和昨天的)...
set "DATA_DIR=C:\Users\thinkpad\.screenpipe\data"

:: 使用 PowerShell 获取准确的今天和昨天日期 (格式: yyyy-MM-dd)
:: 这种方式比 batch 的 date 变量更可靠，且能保证与文件名中的格式一致
for /f "usebackq tokens=*" %%a in (`powershell -command "(Get-Date).ToString('yyyy-MM-dd')"`) do set "TODAY=%%a"
for /f "usebackq tokens=*" %%a in (`powershell -command "(Get-Date).AddDays(-1).ToString('yyyy-MM-dd')"`) do set "YESTERDAY=%%a"

echo [CHECK] 保留日期: %TODAY% (今天) 和 %YESTERDAY% (昨天)

if exist "%DATA_DIR%" (
    pushd "%DATA_DIR%"
    :: 遍历所有 mp4 文件
    for %%F in (*.mp4) do (
        :: 检查文件名是否包含今天或昨天的日期
        echo "%%F" | findstr "%TODAY%" >nul
        if errorlevel 1 (
            echo "%%F" | findstr "%YESTERDAY%" >nul
            if errorlevel 1 (
                echo [DELETE] 删除过期文件: %%F
                del "%%F"
            )
        )
    )
    popd
    echo [INFO] 清理完成。
) else (
    echo [WARNING] 数据目录不存在: %DATA_DIR%
)
echo.

:: 2. 检查 Ollama 状态
echo [2/4] 正在检查 AI 服务 (Ollama)...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Ollama 已经在运行中。
) else (
    echo [INFO] Ollama 未运行，正在启动...
    start "Ollama Server" /MIN ollama serve
    timeout /t 5 >nul
)

:: 3. 启动 Screenpipe
echo [3/4] 正在启动 Screenpipe...
if exist "C:\Users\thinkpad\screenpipe\bin\screenpipe.exe" (
    :: 使用 start 启动新窗口运行 screenpipe
    start "Screenpipe Backend" "C:\Users\thinkpad\screenpipe\bin\screenpipe.exe"
    echo [INFO] Screenpipe 主程序已启动。
) else (
    echo [ERROR] 找不到 Screenpipe 可执行文件。
    pause
    exit /b 1
)

:: 4. 验证 Notion 插件状态
echo [4/4] 正在等待 Notion 插件启动 (端口 44719)...
set "RETRIES=0"
:CHECK_PORT
netstat -an | find "44719" | find "LISTENING" >nul
if "%ERRORLEVEL%"=="0" (
    echo.
    echo [SUCCESS] Notion 插件已成功启动并正在监听端口 44719！
    echo [SUCCESS] 日报记录功能已就绪。
) else (
    set /a RETRIES+=1
    if %RETRIES% LSS 20 (
        timeout /t 2 >nul
        goto CHECK_PORT
    ) else (
        echo.
        echo [WARNING] Notion 插件似乎启动超时。
        echo 请检查 Screenpipe 窗口是否有错误日志。
        echo 但 Screenpipe 主程序仍在运行，可能会稍后启动插件。
    )
)

echo.
echo 脚本执行完成。本窗口将在 10 秒后关闭。
timeout /t 10
exit
