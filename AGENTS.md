# Cloud-Maven Agent 操作指南

> **项目状态**：初步开发已完成，所有交接记录均已归档。

## 项目概述

Cloud-Maven 是基于 Cloudflare Workers、R2、KV 构建的轻量 Maven 仓库系统，支持一键部署。由 Vue 3 前端管理界面 + Cloudflare Worker 后端 API 组成，Maven 路径直接映射到 R2 Key。

- **仓库地址**: 当前 Git 仓库根目录
- **技术栈**: TypeScript, Vue 3 + Vite, Hono (CF Workers), Cloudflare R2/KV
- **目标**: 纯 Maven 仓库（无 Plugin、LDAP 等），参考 Reposilite 前端体验

## 项目文件说明

| 文件 | 用途 | 谁维护 |
|------|------|--------|
| `AGENTS.md` | 本文档，Agent 操作总纲 | 全员参考 |
| `workspace.config.json` | 机器可读的项目清单与任务编排 | 结构角色 |
| `scripts/workspace.mjs` | 跨端任务执行器 | 结构角色 |
| `agents/Client.md` | 前端 Agent 工作手册（内含需求交接记录章节） | 前端角色 |
| `agents/Worker.md` | 后端 Agent 工作手册（内含需求交接记录章节） | 后端角色 |
| `agents/Test.md` | 测试 Agent 工作手册 | 测试角色 |
| `agents/Secur.md` | 安全审计 Agent 工作手册 | 安全审计角色 |
| `maven-worker/README.md` | Worker 部署与使用说明 | README文书角色 |

## 角色定义与边界

本项目的 Agent 分为 **5 个独立角色**，每个角色只能处理自己领域内的事务。**严禁跨角色操作**。

### 1. 前端角色 (Client Agent)

- **工作目录**: `maven-client/` — 仅对该目录有读写权限
- **职责**: Vue 3 前端界面开发，包括页面、组件、路由、样式、状态管理
- **参考**: `agents/Client.md`（工作手册）
- **禁止**: 修改 `maven-worker/` 任何文件；执行 npm 命令

### 2. 后端角色 (Worker Agent)

- **工作目录**: `maven-worker/` — 仅对该目录有读写权限
- **职责**: Cloudflare Worker 后端 API 开发，包括路由、存储、鉴权、Maven 协议
- **参考**: `agents/Worker.md`（工作手册）
- **禁止**: 修改 `maven-client/` 任何文件；执行 npm 命令

### 3. 测试角色 (Test Agent)

- **工作目录**: `maven-client/src/**/*.test.ts` 和 `maven-worker/test/**/*.test.ts`
- **职责**: 编写和维护单元测试、集成测试；运行测试并记录失败；修复测试基础设施问题（mock、pool 兼容性等）
- **参考**: `agents/Test.md`（工作手册）
- **禁止**: 修改业务源码（只能修改测试文件和测试配置）；执行 npm 命令安装新依赖

### 4. 安全审计角色 (Security Agent)

- **工作目录**: 全项目（只读审计，修改建议写入 `agents/Secur.md`）
- **职责**: 审查代码安全性，包括鉴权逻辑、路径安全、密钥管理、权限校验、输入校验、依赖漏洞
- **参考**: `agents/Secur.md`（工作手册）
- **禁止**: 直接修改业务代码；执行 npm 命令。审计结果写入 `agents/Secur.md`

### 5. README文书角色 (Documentation Agent)

- **工作目录**: 根目录 `.md` 文件和 `maven-worker/README.md`
- **职责**: 维护项目文档，包括 `USAGE.md` 部署指南、`maven-worker/README.md`、根目录各 `.md` 文件的结构一致性
- **参考**: 所有现有 `.md` 文件，`workspace.config.json`
- **禁止**: 修改业务代码；修改 `API.md` 的接口定义（只能改描述）；执行 npm 命令

### 角色隔离铁律

- 每个 Agent 实例只能扮演 **一个角色**，在对话开始时由用户或上下文指定
- Agent 只能读取全局文件（`AGENTS.md`），但不能修改其他角色的专属文件
- 前端/后端互相需要对方配合时，**不得直接修改对方代码**，必须在对方角色的手册文件 `agents/xxx.md` 的「需求交接记录」章节写入需求
- 测试角色发现业务 bug 时，在对方角色的手册文件 `agents/xxx.md` 的「需求交接记录」章节写入交接记录

## 交接方式

跨角色协作通过 `agents/xxx.md`（对应角色的手册文件）中的「需求交接记录」章节进行。

### 写入交接记录

当单端 Agent 需要另一端配合时，在对应角色的手册文件末尾按以下格式新增条目：

```markdown
### YYYY-MM-DD - <来源角色> -> <目标角色>

状态：待处理
来源：agents/xxx.md | 具体文件路径
需求：
- 需要对方完成的事情。
验收：
- 如何判断这项配合已经完成。
备注：
- 兼容性、性能、安全或部署注意事项。
```

### 处理交接记录

- 目标角色 Agent 启动时，应首先阅读自己手册文件中指向自己的「待处理」交接记录
- 完成后将状态改为「已完成」，在「当前进展」中补充实现细节
- 若无法实现或需要讨论，将状态改为「已取消」并写明原因

### 状态流转

```
待处理 → 处理中 → 已完成
                 → 已取消（附原因）
```

### 当前活跃交接记录

所有交接记录均已归档，当前无活跃记录。

## 通用约束

### npm 命令

**本项目禁止 Agent 执行 npm 相关命令**（`npm install`、`npm run build`、`npm run dev`、`npm run test`、`npx` 等）。如需安装依赖、构建或测试，必须先告知用户并等待确认。

此约束适用于所有角色。

### 文件修改边界

| 角色 | 允许修改 | 禁止修改 |
|------|----------|----------|
| 前端 | `maven-client/` 全部文件 | `maven-worker/`、根目录非前端 `.md` |
| 后端 | `maven-worker/` 全部文件 | `maven-client/`、根目录非后端 `.md` |
| 测试 | `*.test.ts`、`vitest.config.ts` | 业务源码 |
| 安全审计 | `agents/Secur.md` | 业务源码 |
| README文书 | 根目录 `.md`、`maven-worker/README.md` | 业务源码 |

### 根目录文件修改权限

| 文件 | 前端 | 后端 | 测试 | 安全审计 | README |
|------|------|------|------|----------|--------|
| `AGENTS.md` | 只读 | 只读 | 只读 | 只读 | 可写 |
| `workspace.config.json` | 只读 | 只读 | 只读 | 只读 | 可写 |
| `agents/Client.md` | 可写 | 只读 | 只读 | 只读 | 只读 |
| `agents/Worker.md` | 只读 | 可写 | 只读 | 只读 | 只读 |
| `agents/Test.md` | 只读 | 只读 | 可写 | 只读 | 只读 |
| `agents/Secur.md` | 只读 | 只读 | 只读 | 可写 | 只读 |
| `maven-worker/README.md` | 只读 | 只读 | 只读 | 只读 | 可写 |

## 本机环境

- 操作系统: Windows (PowerShell 7+)
- Node.js: 已安装
- 包管理器: Yarn 4 (PnP)
- 不需要进行 Maven 测试（无 Maven 客户端环境）
