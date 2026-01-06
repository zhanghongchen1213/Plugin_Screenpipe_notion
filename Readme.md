# Screenpipe Notion Plugin 更新与安装指南

本文档记录了 Screenpipe Notion 插件的修改历史、安装步骤及配置指南。

## 1. 项目概述

本插件用于将 Screenpipe 捕获的屏幕活动日志（Activity Logs）和关系智能分析（Relationship Intelligence）同步到 Notion 数据库中。

### 主要功能
- **Activity Logs**: 记录每日工作活动，并通过 AI 生成摘要。
- **Relationship Intelligence**: 分析沟通记录，提取人脉关系和情感分析。
- **Daily Report**: 基于 AI 预设生成结构化的中文日报。

---

## 2. 修改记录 (Changelog)

以下记录了为了使插件正常运行而进行的具体代码和配置修改。

### 2.1 依赖管理 (`package.json`)
**问题**: 由于 `cmdk` 和 `react-day-picker` 等库与 React 19 存在版本冲突，导致 `npm install` 失败。
**修改**:
- 在 `package.json` 中添加了 `overrides` 字段，强制所有依赖使用项目指定的 React 版本。

```json
"overrides": {
  "cmdk": {
    "react": "$react",
    "react-dom": "$react-dom"
  },
  "react-day-picker": {
    "react": "$react",
    "react-dom": "$react-dom"
  }
}
```

### 2.2 设置组件 (`src/components/notion-settings.tsx`)
**问题**: 在保存 Notion 配置时，验证函数 (`handleValidate`) 可能会读取旧的 `settings` 状态而不是用户当前输入的 `localSettings`，导致验证失败。
**修改**:
- 更新 `handleValidate` 函数，优先使用 `localSettings` 中的值进行验证。

### 2.3 智能分析 API (`src/app/api/intelligence/route.ts`)
**问题**: 当未选择 AI Preset 时，代码尝试访问 `aiPreset.model` 会导致 `undefined` 错误，造成 500 异常。
**修改**:
- 添加了空值检查：
  ```typescript
  if (!aiPreset) {
      throw new Error("ai preset not found");
  }
  ```

### 2.4 日报预设 (`daily-report-cn.json`)
**问题**: 默认预设不存在或配置不适用于中文环境，且引用的模型可能未下载。
**修改**:
- 创建/更新了 `daily-report-cn.json`。
- **Model**: 修改为 `qwen2.5:latest` (本地已存在的模型)。
- **Prompt**: 编写了专门的中文结构化日报 Prompt，包含“核心成就”、“主要工作内容”、“时间分配”等板块。

---

## 3. 安装与部署指南

### 3.1 环境要求
- **Node.js**: v18+
- **Bun** (推荐) 或 **npm**
- **Screenpipe**: 已安装并运行
- **Ollama**: 已安装并运行 `qwen2.5:latest` 模型

### 3.2 安装步骤

1.  **进入插件目录**:
    ```bash
    cd c:\Users\thinkpad\.screenpipe\pipes\notion
    ```

2.  **安装依赖**:
    由于 React 版本兼容性问题，建议使用 `npm install` (已配置 overrides) 或 `bun install`。
    ```bash
    npm install
    # 或者
    bun install
    ```
    > **注意**: 如果遇到 `swc` 相关错误，请尝试重新运行安装命令。

3.  **构建插件**:
    ```bash
    npm run build
    ```
    构建成功后，Next.js 会在 `.next` 目录生成产物。

4.  **重启 Screenpipe**:
    在 Screenpipe 界面中重新加载 Pipe 或重启应用以应用更改。

---
