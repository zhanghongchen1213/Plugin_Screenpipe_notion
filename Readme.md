---

## title: 基于 Screenpipe + Ollama + Notion 打造 AI 全自动日报、周报生成、总结、追溯管理
slug: daily-report
summary: 在数字化办公时代，如何高效记录工作内容并生成高质量的日报/周报是很多开发者的痛点。本文将分享如何利用 Screenpipe（开源屏幕记录工具）、Ollama（本地大模型推理引擎）与 Notion（可视化数据库），构建一套完全运行在本地（隐私安全）且高度自动化的工作流。
category: AI自动化
categorySlug: ai-automation
type: blog
status: published
publishedAt: 2026-01-04T00:00:00.000Z

# 基于 Screenpipe + Ollama + Notion 打造 AI 全自动日报、周报生成、总结、追溯管理

> **摘要**：在数字化办公时代，如何高效记录工作内容并生成高质量的日报/周报是很多开发者的痛点。本文将分享如何利用 **Screenpipe**（开源屏幕记录工具）、**Ollama**（本地大模型推理引擎）与 **Notion**（可视化数据库），构建一套完全运行在本地（隐私安全）且高度自动化的工作流。
>
> **关键词**：Screenpipe, Ollama, Notion API, RAG, Local LLM, 自动化办公

---

## 1. 架构概览

本方案的核心逻辑是通过 Screenpipe 全天候后台录制屏幕与音频（数据存储在本地），利用本地部署的 LLM (Qwen2.5) 定期分析录制内容，提取关键工作项，最后通过 API 自动推送到 Notion 数据库中形成日报。通过 Notion AI 自动生成每日日报、周报并自动存储到数据库，用户可以方便地查看、管理和追溯所有工作记录。

- **数据层**：Screenpipe (本地 SQLite + 媒体文件)
- **推理层**：Ollama + Qwen2.5 (本地显卡推理)
- **表现层**：Notion Database (云端可视化与管理)

---

## 2. 环境构建 (Environment Setup)

### 2.1 Screenpipe 部署

Screenpipe 是整个系统的“眼睛”，负责底层的屏幕捕获与 OCR 处理。

1. **获取安装包**：访问 Screenpipe 的 [GitHub Release 官方网站](https://github.com/mediar-ai/screenpipe)。
2. **快速安装**：也可以直接在 PowerShell 中运行以下命令进行一键安装：

```powershell
 # 快速安装
 irm https://raw.githubusercontent.com/mediar-ai/screenpipe/main/install.ps1 | iex

 # 首次运行
 screenpipe
```

3. **初始化**：首次运行 Screenpipe 时，它会自动初始化 `%LOCALAPPDATA%\.screenpipe` 目录，同时安装 ffmpeg 等一系列插件。请确保授予其屏幕录制与麦克风权限。

### 2.2 本地大模型部署 (Ollama)

为了确保工作数据的隐私安全，我们拒绝将截图上传至云端 API，而是使用 Ollama 进行本地推理。

1. **安装 Ollama**：前往 [Ollama 官网](https://ollama.com/) 下载 Windows 版本。
2. **拉取模型**：推荐使用 `qwen2.5`，它在中文语境下的指令遵循能力极强，且 7B 版本在主流显卡上推理速度极快。

```bash
 ollama pull qwen2.5
```

3. **验证服务**：在终端输入 `ollama list` 确认模型已就绪。

---

## 3. 插件编译与集成 (Plugin Integration)

Screenpipe 支持插件机制（Pipes），我们需要配置 Notion 插件来实现数据打通。

### 3.1 插件部署

1. 下载修改移植的 Screenpipe-Notion-Plugin 插件：[Screenpipe-Notion-Plugin](https://github.com/zhanghongchen1213/Screenpipe-Notion-Plugin)
2. 将下载好的文件解压重命名为 `notion` ，之后插件文件夹放置于 Screenpipe 的插件目录：
   `C:\Users\[你的用户名]\.screenpipe\pipes`
3. **编译构建**：由于插件包含 TypeScript 代码，需要进行本地构建。

```bash
 # 进入插件目录
 cd C:\Users\[你的用户名]\.screenpipe\pipes\notion

 # 安装依赖 (推荐 npm)
 npm install

 # 构建产物
 npm run build
```

### 3.2 激活插件

1. 重启 Screenpipe 服务。
2. 使用 CLI 命令检查插件状态：

```bash
 screenpipe pipe list
```

3. 如果插件未启用，执行：

```bash
 screenpipe pipe enable notion
```

配置插件成功如下图所示
![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10001.png)

## 4. Notion API 对接与鉴权

### 4.1 获取模版

为了配合插件的数据结构，建议下载 Notion 模版到工作空间内：

- [Activity Log (活动日志)](https://foregoing-domain-39f.notion.site/2e0be665a1c78011afd5c9dcf345b1a5?v=2e0be665a1c781b98d75000cea4cb6e8)
- [Relationship Intelligence (关系分析)](https://foregoing-domain-39f.notion.site/2e0be665a1c7801a9898cd4fc726de9b?v=2e0be665a1c7817ca33e000c80134f6b)
- [Work Log Center (工作日志中心)](https://foregoing-domain-39f.notion.site/2e0be665a1c780549ee5dd4b8dff559d)

### 4.2 创建 Integration

1. 进入 [Notion 集成](https://www.notion.so/profile/integrations/) 创建一个新的 Integration。
2. 获取 **Internal Integration Secret** (密钥)。
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10002.png)
3. 在集成的访问权限中，授予读写权限。
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10003.png)

### 4.3 配置 Screenpipe

1. 运行 Screenpipe 服务。
2. 访问 Notion 插件本地配置后台：`http://localhost:44719` 。
3. 填入 Notion Secret 并选择 Database ID。
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10004.png)
4. 配置本地 Ollama 模型
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10005.png)
   可参数输入模型分析 Custom Prompt
5. 配置分析频率等参数，点击保存：
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10006.png)
6. 连通性测试
   如果看到同步成功的日志，说明链路已打通。
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10007.png)

---

## 5. 自动化编排 (Workflow Automation)

为了实现“开机即用，用完即走”，我们需要一个自动化脚本来管理 Screenpipe 和 Ollama 的生命周期，并自动清理过期的视频文件以节省磁盘空间。
**注意**：需要根据实际情况修改 `set "User_name=Administrator"` 为你的用户名。

以下是 `Start-Screenpipe.bat` 的完整实现代码：

```batch
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
```

**使用建议**：将此脚本放置在桌面或添加到 Windows 启动项中，每天开机自动运行。

## 6. 实战演示 (Demo)

### 6.1 配置 Notion 工作日志中心

配置完成后，系统将自动在后台工作。启用 Notion AI 后，更可以实现对日志的深度分析、管理和追溯。

1. **个性化配置**：选择**工作日志中心**的**日报总结助手**或者**周报总结助手**作为 AI 说明。
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10008.png)
2. **一键生成日报**：输入关键词"帮我完成今日日报" 或 "生成今天的日报"，系统将根据时间线自动汇总今日工作，并添加至**日数据库**中方便管理和回溯。
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10009.png)
3. **周报自动汇总**：输入关键词 "帮我完成本周周报" 或 "生成这周的周报"，系统将根据本周的日报数据，自动生成周维度总结，并添加至**周数据库**中方便管理和回溯。
   ![](/Users/hongchenke/Documents/Github/Plugin/Screenpipe-Notion-Plugin/基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10010.png)

---

### 6.2 Notion AI 生成效果演示

五张截图默认收起，点标题再展开，避免竖图和横图连成一长条。

成稿 · 2026-01-06 每日工作日报![2026-01-06 每日工作日报](./基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10011.jpeg)

成稿 · 2026 年第 1 周工作周报![2026 年第 1 周工作周报](./基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/10012.jpeg)

库内对照 · 日报列表与 2026-04-08 成稿![日报列表与 2026-04-08 成稿并排](./基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/微信图片_20261012074724_263_3.png)

库内对照 · 周报列表与 2026-05-25 至 05-30 成稿![周报列表与 2026-05-25 至 05-30 成稿并排](./基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/微信图片_20261012074724_265_3.png)

库内对照 · 2026 年 4 月工作月报![2026 年 4 月工作月报](./基于_Screenpipe_+_Ollama_+_Notion_打造_AI_全自动日报、周报生成、总结、追溯管理_screenpipe_自动日报-CSDN博客/微信图片_20261012074724_264_3.png)

> **总结**：通过 Screenpipe + Ollama + Notion 的组合，可以成功构建了一个既保护隐私又极具生产力的本地化 AI 工作流。这不仅是一个工具的堆叠，更是对个人数据主权的一种实践。
