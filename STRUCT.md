# Cloud-Maven 结构控制说明

## 根目录职责

根目录只负责项目结构、跨端契约和常用任务编排，不直接承载业务实现。

- `PROJECT.md`：项目目标、总体约束和共同要求。
- `STRUCT.md`：结构控制、AGENT 协作边界和需求交接记录。
- `API.md`：前端和 Worker 共用的后端 API 契约。
- `Client.md`：前端设计方案。
- `Worker.md`：Worker 后端设计方案。
- `workspace.config.json`：机器可读的项目清单、文档清单和任务编排。
- `scripts/workspace.mjs`：根目录任务执行器。

## 子项目边界

### maven-client

前端 AGENT 的实现范围是 `maven-client/`。

允许：
- 修改前端源码、样式、路由、组件和前端配置。
- 将前端需要的 Worker 接口补充到 `API.md`。
- 将需要 Worker 配合的事项记录到本文档的“需求交接记录”。

不应：
- 直接修改 `maven-worker/` 的业务实现。
- 绕过 `API.md` 约定临时接口。

### maven-worker

后端 AGENT 的实现范围是 `maven-worker/`。

允许：
- 修改 Worker 源码、Cloudflare 绑定配置、测试和后端配置。
- 按 `API.md` 实现接口。
- 将需要前端配合的事项记录到本文档的“需求交接记录”。

不应：
- 直接修改 `maven-client/` 的业务实现。
- 改变已约定 API 的响应结构而不更新 `API.md`。

## 根目录配置原则

- 根目录配置负责把两端组织起来，保持入口少而清晰。
- 子项目仍保留自己的 `package.json`、`tsconfig.json` 和运行配置。
- 跨端任务写入 `workspace.config.json`，由 `scripts/workspace.mjs` 执行。
- 本机环境声明 npm 命令受限，执行安装、构建、测试或部署前需要先告知。
- 不在根目录引入和单端实现强绑定的业务代码。

## 需求交接格式

单端 AGENT 需要另一端配合时，在下方新增条目。

```text
### YYYY-MM-DD - <client|worker> -> <worker|client>

状态：待处理 | 处理中 | 已完成 | 已取消
来源：Client.md | Worker.md | API.md | 具体文件路径
需求：
- 需要对方完成的事情。
验收：
- 如何判断这项配合已经完成。
备注：
- 兼容性、性能、安全或部署注意事项。
```

## 需求交接记录

### 2026-05-29 - client -> worker

状态：处理中
来源：Client.md、API.md、maven-client/src/api/*
需求：
- 按 `API.md` 实现前端第一阶段需要的 Auth、Maven Repository、Admin、Settings 接口。
- `GET /api/maven/details/:path*` 需要一次返回目录渲染所需字段，包括路径、父路径、文件/目录类型、大小、更新时间和当前 token 对该路径的读写删除权限。
- Maven 文件读取、上传、删除接口需要兼容标准 Maven 客户端访问路径，即 `GET|PUT|DELETE /:repository/:path*`。
- `GET /:repository/:path*` 需要能直接返回 `maven-metadata.xml`，前端会用它解析 groupId、artifactId、latest/release/version 列表并生成依赖片段。
- Auth 优先兼容 Reposilite 风格的 `Authorization: xBasic base64(name:secret)`，除非后续共同决定改为 Bearer token。
- Admin 统计接口需要以低成本方式返回对象数、存储占用、24 小时请求数和错误数；如果 Worker 端暂时无法精确统计，应返回可解释的近似值或 `0`，保持响应结构稳定。
- Settings 接口需要返回前端配置表单字段：仓库标题、baseUrl、默认仓库、匿名读取、覆盖上传、checksum 生成、metadata 维护。
验收：
- 前端 `maven-client/src/api/*` 中声明的调用均能收到 `API.md` 中定义的响应结构。
- 匿名读取开启时，未登录用户可以浏览公开仓库并下载文件。
- 管理员 token 登录后可以访问 Admin 和 Settings 页面所需数据。
- 权限不足时返回 `401` 或 `403`，不存在路径返回 `404`，响应体包含 `message` 字段。
备注：
- 目录详情接口是前端减少 R2/KV 请求次数的关键，应避免前端逐文件探测。
- 文件下载应直接返回原始文件流，并设置 `ETag`、`Cache-Control` 和合适的 `Content-Type`。
- 当前环境禁止 npm 相关命令，执行安装、构建、测试或部署前需要先告知。

当前进展（2026-05-29）：
- 已实现 `POST /api/auth/login`、`GET /api/auth/me`、`GET /api/auth/session`、`POST /api/auth/logout`，兼容 `xBasic`、Bearer Session 和 Cookie Session。
- 已实现 `GET /api/maven/details/:path*`，目录项包含路径、类型、大小、更新时间、内容类型和读写删除权限。
- 已实现 Maven 文件 `GET/HEAD/PUT/POST/DELETE /*`，支持 R2 文件流返回、上传、单文件/目录删除、checksum 生成、缓存头、ETag 和内容类型。
- 已实现 Admin 低成本近似统计、Token 管理和 Settings 读写接口。
- 已实现 `POST /api/maven/generate/pom/:path*`、`GET /api/maven/versions/:path*` 和 `DELETE /api/maven/artifacts/:path*`。
- 已补充 `maven-worker/README.md`，说明 Cloudflare R2/KV、环境变量、首个管理员 Token 和当前实现边界。
- 待补齐：metadata 自动维护策略和生产级统计成本控制细节。
- 当前后端交接只要求 Worker 开发，不要求执行 npm 构建、测试、开发服务或部署验证。
