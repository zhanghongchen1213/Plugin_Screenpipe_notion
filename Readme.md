<p align="center">
  <img src="https://image-osb.obs.cn-east-3.myhuaweicloud.com/blog/2026-01-06/daily-report/r04/cover/cover-video-c1574f7a966e.webp" alt="标题为让电脑替你记工作，副标题为 Screenpipe + Ollama + Notion 工作日志系统，下方是采集、整理、归档三步" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18-111111?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 18">
  <img src="https://img.shields.io/badge/TypeScript-5-111111?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Next.js-15-111111?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-111111?style=flat-square&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/License-MIT-111111?style=flat-square" alt="MIT License">
</p>

<p align="center">
  <b>把屏幕活动写进 Notion 的 Screenpipe 插件。</b><br>
  换成自己的 Notion 数据库和本机模型地址，就能按间隔生成活动日志。
</p>

<p align="center">
  <a href="#功能">功能</a> ·
  <a href="#跑起来">跑起来</a> ·
  <a href="#改成你的">改成你的</a> ·
  <a href="#构建与部署">构建与部署</a> ·
  <a href="#遇到问题时">遇到问题时</a> ·
  <a href="#交流与贡献">交流与贡献</a> ·
  <a href="#许可">许可</a>
</p>

## 这是什么

这是给已经在用 Screenpipe 的人准备的 Next.js 插件，当前版本 `0.1.16`。它定时读取本机屏幕文字和音频转写，通过 OpenAI 兼容接口整理成标题、描述和标签，写入 Notion 的 Activity Logs。另一条定时任务读取这些日志，把联系人、跟进和机会写入 Relationship Intelligence。

插件按 Screenpipe 的 `pipe.json` Pipes 方式运行：`is_nextjs` 为 `true`，页面端口是 `44719`。模型调用走你填的兼容接口，仓库里的示例是本机 Ollama。它不扫描 Git 仓库，也不在定时任务里生成日报、周报或月报。根目录的 `daily-report-cn.json` 只是一份提示词示例，程序不会读取它。

Windows 上的安装、Notion 模板，以及用 Notion AI 做日报和周报汇总，写在配套文章里。那些汇总不由本仓库的 cron 触发。

## 预览

下列界面来自 2026 年 1 月的部署，对应本仓库 `package.json` 的 `0.1.16`。

<p align="center">
  <img src="https://image-osb.obs.cn-east-3.myhuaweicloud.com/blog/2026-01-06/daily-report/r03/007.webp" alt="Ollama 预设的本机兼容接口与 qwen2.5 模型配置" width="100%">
</p>

<p align="center">
  <img src="https://image-osb.obs.cn-east-3.myhuaweicloud.com/blog/2026-01-06/daily-report/r03/008.webp" alt="Notion 插件的执行间隔、Page Size 与内容去重设置" width="100%">
</p>

<p align="center">
  <img src="https://image-osb.obs.cn-east-3.myhuaweicloud.com/blog/2026-01-06/daily-report/r03/010.webp" alt="Activity Logs 中已保存的工作记录与时间字段" width="100%">
</p>

## 功能

| 能力 | 得到的结果 |
| --- | --- |
| **活动日志** | 查询近期屏幕数据，生成 `title`、`description`、`tags`，写入 Activity Logs，并带上起止时间 |
| **关系分析** | 读取已写入的活动日志，生成联系人、跟进和机会，写入 Relationship Intelligence |
| **模型预设** | 页面上可以为日志和关系分析各选一个预设。`/api/log` 与 `/api/intelligence` 当前都读取日志预设 `aiLogPresetId` |
| **自定义提示词** | 页面中的 Custom Prompt 会进入活动日志的生成提示。模型仍要返回上述三个 JSON 字段 |
| **当次去重** | 打开后用本机 `nomic-embed-text` 去掉这一次查询里相似度超过 `0.95` 的内容。向量失败时保留原数据继续处理 |
| **试跑** | Notion 连接成功后，可以用 Test Log、Test Intelligence 各触发一次写入 |

连接校验会改写两个数据库。它把标题设为 `Activity Logs` 和 `Relationship Intelligence`，并写入下面这些字段。活动日志的标题字段是 `Name`。

| 数据库 | 字段 |
| --- | --- |
| Activity Logs | `Name`、`Description`、`Tags`、`Date`、`StartTime`、`EndTime`、`Summary` |
| Relationship Intelligence | `Name`、`Date`、`Summary`，页面正文另有联系人和洞察 |

## 跑起来

运行门槛来自 `package-lock.json` 里 `next@15.1.0` 的 `engines`：Node.js `^18.18.0 || ^19.8.0 || >=20.0.0`。另外需要仍能加载 `pipe.json` Next.js 插件的 Screenpipe、一个 Notion 内部集成，以及一个 OpenAI 兼容接口。

仓库同时有 `package-lock.json` 和 `bun.lock`。下面的命令使用 npm。

```bash
git clone https://github.com/zhanghongchen1213/Plugin_Screenpipe_notion.git
```

克隆下来的目录名是 `Plugin_Screenpipe_notion`。放进 Screenpipe 时要改成 `notion`，因为保存间隔时写入的路径是 `pipes/notion/pipe.json`。

```bash
# macOS / Linux
mkdir -p ~/.screenpipe/pipes
mv Plugin_Screenpipe_notion ~/.screenpipe/pipes/notion
cd ~/.screenpipe/pipes/notion
npm install
npm run build
```

Windows 上的对应目录是 `%USERPROFILE%\.screenpipe\pipes\notion`。`pipe.json` 里 `enabled` 已是 `true`，端口是 `44719`。由兼容的 Screenpipe 加载后，打开 `http://localhost:44719`。

在仓库目录里改界面时，用开发服务器。它走 Next.js 默认端口，不是 `44719`。

```bash
npm install
npm run dev
```

| 脚本 | 作用 |
| --- | --- |
| `npm run dev` | `next dev --turbopack` |
| `npm run build` | `next build --no-lint` |
| `npm start` | `next start` |
| `npm run lint` | `next lint` |

页面分三步填完才能试跑。

1. 在 [Notion 集成](https://www.notion.so/my-integrations) 创建内部集成，把 Activity Logs 和 Relationship Intelligence 都加入可访问范围。
2. 在 Connection 填入集成密钥，选中这两个数据库，点击 Connect Notion，再保存设置。请使用专门复制出来的库。
3. 在 AI Models 里为日志选择预设。示例地址是 `http://localhost:11434/v1`，模型名与本机 `ollama list` 一致，例如 `qwen2.5:latest`。地址要带 `/v1`。

保存后点击 Test Log。Activity Logs 里出现新的标题、描述、标签和起止时间，这条链路才算接上。页面能打开只说明 `44719` 在监听；采集服务另看 `http://localhost:3030/health`。

`Start-Screenpipe.bat` 是可选的 Windows 开机脚本。使用前先改用户名，见下一节。它会删除数据目录里文件名不含今天或昨天日期的 `.mp4`。

## 目录

```text
.
├── Start-Screenpipe.bat      Windows 启动脚本，含 mp4 清理
├── daily-report-cn.json      提示词示例，程序不读取
├── package.json
├── pipe.json                 端口 44719 与两条 cron
├── public/
└── src/
    ├── app/
    │   ├── page.tsx          配置页
    │   └── api/
    │       ├── log/          活动日志
    │       ├── intelligence/ 关系分析
    │       ├── setup/        用本机 Chrome 自动创建集成和数据库
    │       └── notion/pages/ 按密钥搜索 Notion 页面
    ├── components/           连接、预设、同步设置
    └── lib/                  Notion 写入、模型调用、pipe.json 更新
```

| 路径 | 作用 |
| --- | --- |
| `/` | 配置页：连接、模型预设、同步间隔 |
| `/api/log` | 查屏幕数据并写一条活动日志。`pipe.json` 默认 `0 */5 * * * *`，每 5 分钟 |
| `/api/intelligence` | 读已有日志并写关系分析。`pipe.json` 默认 `0 0 */1 * * *`，每 1 小时 |
| `/api/setup` | 打开本机 Chrome，登录 Notion 后创建名为 `Screenpipe Logger` 的集成和两张表 |
| `/api/notion/pages` | 用查询参数里的 `accessToken` 搜索页面，给定时任务的提示词补全内容 |

## 改成你的

| 要改的内容 | 位置 | 当前值 |
| --- | --- | --- |
| 插件目录名 | Screenpipe 的 `pipes/` 下 | 必须叫 `notion` |
| 短期间隔 | 页面 Sync Settings，或 `pipe.json` 的 `/api/log` | 每 5 分钟 |
| 长期间隔 | 同上，对应 `/api/intelligence` | `pipe.json` 为每 1 小时。页面未保存过设置时，输入框默认显示 `5`，单位按代码是小时 |
| 查询窗口 | `src/app/api/log/route.ts` | `minute(1)`，每次只查最近 1 分钟 |
| 单次条数 | 页面 Page Size | 默认 `50`，输入范围 10–100 |
| 自定义数据目录 | 环境变量 `SCREENPIPE_DIR` | 未设置时用 `$HOME/.screenpipe`，再没有则用当前工作目录 |
| 活动日志提示词 | 页面 Custom Prompt | 代码里的默认提示在 `src/lib/store/settings-store.ts` |
| 模型地址和名称 | 页面 AI Presets | 示例见 `daily-report-cn.json`：`http://localhost:11434/v1`、`qwen2.5:latest` |
| 集成显示名 | `src/lib/utils.ts` 的 `INTEGRATION_NAME` | `Screenpipe Logger`。只影响 `/api/setup` 自动创建 |
| Windows 开机脚本 | `Start-Screenpipe.bat` 的 `User_name` | `Administrator`。数据目录是 `C:\Users\%User_name%\.screenpipe\data`，程序路径是 `C:\Users\%User_name%\screenpipe\bin\screenpipe.exe` |

改完后重新构建，用 Screenpipe 加载插件，打开配置页保存一次，再点 Test Log。到 Activity Logs 确认新页面的 `Name`、`Description`、`Tags` 和起止时间。

用开机脚本时，把 `User_name` 改成自己的 Windows 用户名，并确认上面两个路径在本机存在。清理规则按文件名里的 `yyyy-MM-dd` 匹配，只处理该目录一层里的 `.mp4`。录屏文件名对不上时，先不要运行脚本里的清理段。

## 构建与部署

Notion 密钥和同步间隔写在 Screenpipe 的插件设置里，不进这个仓库。`.gitignore` 已忽略 `.env*`。只有数据目录不在默认位置时，才需要设置 `SCREENPIPE_DIR`，把它指到 `.screenpipe` 根目录。

```bash
npm run build
```

构建产物在 `.next/`。`next.config.ts` 没有静态导出。`npm start` 可以单独把构建结果跑起来，页面端口仍要自己指定；Screenpipe 加载时使用 `pipe.json` 的 `44719`。

这条插件要留在本机 Screenpipe 进程里。`/api/log` 会读取屏幕内容，配置页会保存 Notion 密钥，去重还会请求 `http://localhost:11434`。不要把它部署到公网。

## 遇到问题时

| 现象 | 先检查 |
| --- | --- |
| 插件页面打得开，但没有屏幕数据 | `http://localhost:3030/health` 是否正常。`/api/log` 只查询最近 1 分钟，而 cron 默认每 5 分钟执行一次 |
| 返回 `ai preset not selected` | 是否保存了日志预设。两个接口都读 `aiLogPresetId`，关系分析不读页面上的 Intelligence 预设 `aiPresetId` |
| 模型接口报错 | 预设 `url` 是否为 `http://localhost:11434/v1` 这种带 `/v1` 的地址，`model` 是否与本机列表一致 |
| 返回 `notion not configured`，或数据库无权访问 | 集成密钥，以及 Activity Logs、Relationship Intelligence 是否都在该集成的可访问范围里 |
| 写入提示字段不匹配 | 活动日志标题字段是 `Name`。连接成功时，校验会重写两个库的标题和字段 |
| 关系分析几乎没有标题 | `src/app/api/intelligence/route.ts` 的 `readRecentLogs` 读取属性 `Title`，写入代码使用的是 `Name` |
| 改了间隔却没按新节奏跑 | 被改写的是 `SCREENPIPE_DIR` 或 `$HOME/.screenpipe` 下的 `pipes/notion/pipe.json`，不是仓库里这份副本 |
| 去重开关一直在下载模型 | 开关固定请求 `http://localhost:11434/api/tags` 和 `/api/pull`，不跟随日志预设里的地址 |
| 开机后录屏文件变少 | `Start-Screenpipe.bat` 会删除数据目录中文件名不含今天或昨天日期的 `.mp4` |

## 交流与贡献

部署和使用时遇到问题，可以到 [Issues](https://github.com/zhanghongchen1213/Plugin_Screenpipe_notion/issues) 提问。用这套源码做出自己的成果后，也欢迎在 Issue 里留下地址。

发现 Bug 或有明确的改动建议，请 [提交 Issue](https://github.com/zhanghongchen1213/Plugin_Screenpipe_notion/issues/new)。本仓库没有单独的贡献说明和安全政策，改代码前先用 Issue 说明改动范围。不要在公开 Issue 里贴密钥、令牌或环境变量文件。

**本文资料 · 接着动手**

**鸿尘客公众号**  
扫码关注鸿尘客公众号，回复 **“查看原文”**，获取本文开源资料与配套内容。

![鸿尘客公众号二维码](https://image-osb.obs.cn-east-3.myhuaweicloud.com/wemedia/wxlogo.webp)

**鸿尘客独立站**

点击下方获取本文**开源资料**与**配套内容**  
[开源资料：https://zhcmqtt.top/article/daily-report](https://zhcmqtt.top/article/daily-report)

![官网](https://image-osb.obs.cn-east-3.myhuaweicloud.com/wemedia/honchic_logo.webp)

## 许可

本仓库采用 [MIT License](LICENSE)。

插件主体来自 Screenpipe 的 Notion pipe。转换时该上游仓库仍为 MIT，版权归 louis030195（2024–2025）。本仓库中的修改与文档版权归鸿尘客 ZhangHongChen（2026）。两份版权声明都写在根目录 `LICENSE` 中。
