# 后端 Agent 工作手册

## 角色定位

你是 Cloud-Maven 的后端开发 Agent，负责 `maven-worker/` 目录下的所有工作。

## 关键文件

- `../Worker.md` — 后端完整设计方案（架构、存储模型、权限、性能策略）
- `../API.md` — 前后端 API 契约（必须严格按此实现）
- `../STRUCT.md` — 需求交接记录（前端提需求的地方，在此回复完成状态）
- `../USAGE.md` — 部署指南

## 技术栈

- Runtime: Cloudflare Workers
- 语言: TypeScript
- 路由框架: Hono
- 部署工具: Wrangler
- 对象存储: Cloudflare R2 (MAVEN_BUCKET)
- 键值存储: Cloudflare KV (MAVEN_KV)
- 加密: Web Crypto API (PBKDF2-SHA256)
- 测试: Vitest + @cloudflare/vitest-pool-workers

## 当前进度 (2026-05-29)

核心链路已有首版代码，大部分接口已实现：

### 已完成
- 工程基础: Wrangler + Hono + TypeScript + Vitest 配置
- Worker 入口: 路由注册、健康检查、CORS、X-Request-Id
- shared 模块: JSON 响应、错误映射、路径安全校验、MIME 类型、缓存策略、checksum 工具
- storage 模块: R2 get/head/put/delete/list、批量删除、有限页统计
- config 模块: KV 存储仓库策略与 Settings、匿名读取与覆盖上传策略
- tokens 模块: PBKDF2-SHA256 hashing、token CRUD、Session 管理、bootstrap、权限匹配
- auth 模块: xBasic/Bearer/Cookie 鉴权、login/logout/me/session 路由
- admin 模块: 有限页统计、token 管理、settings 读写、权限输入校验
- maven 模块: GET/HEAD/PUT/POST/DELETE 文件操作、目录详情、版本摘要、目录级删除、POM 生成
- README.md: R2/KV 说明、环境变量、bootstrap token、实现边界

### 待补齐
- metadata 自动维护策略（当前读取时计算，不主动写 R2）
- 生产级统计成本控制（当前最多 5 页 R2 list 近似统计）
- `hasPermission` 根路径 `/` 匹配 bug（归一化为空字符串导致不匹配子路径）
- vitest 版本兼容（@cloudflare/vitest-pool-workers 需 vitest 2.0.x - 3.2.x，当前实际安装可能为 4.x）
- KV namespace id 需要部署者替换为实际值

## 目录结构

```
maven-worker/src/
├── index.ts         # Hono app 入口，路由注册，CORS
├── env.ts           # TypeScript 类型定义 (Bindings, Variables)
├── auth/index.ts    # 鉴权中间件、xBasic/Bearer/Cookie 解析、Auth API
├── tokens/index.ts  # Token CRUD、Session 管理、权限匹配、bootstrap
├── admin/index.ts   # Admin API: stats, tokens CRUD, settings
├── maven/index.ts   # Maven 文件路由、目录详情、版本、POM
├── config/index.ts  # KV 仓库策略与 Settings 读写
├── storage/index.ts # R2 适配层
└── shared/          # errors, path, mime, checksum, responses
```

```
maven-worker/test/
├── auth/            # 鉴权单测
├── config/          # 配置单测
├── maven/           # metadata 单测
├── shared/          # checksum, mime, path 单测
├── tokens/          # 权限匹配单测
└── integration/     # maven-routes, auth-admin-routes 集成测试
```

## 核心约定

### API 实现
- 严格按照 `API.md` 的路径、请求/响应格式、状态码实现
- 如需修改 API 响应结构，必须同步更新 `API.md`
- 所有 JSON 响应使用统一格式

### Maven 路径
- Maven 路径直接映射到 R2 Key，格式：`{groupIdPath}/{artifactId}/{version}/{file}`
- 路径安全校验：禁止 `..`、`//`、反斜杠、控制字符、空路径
- `/api/*` 保留给管理 API，不作为 Maven 路径

### 鉴权
- 优先兼容 Reposilite `xBasic base64(name:secret)` 风格
- 同时支持 Bearer token 和 Cookie Session
- PUBLIC 仓库允许匿名读取

### 性能
- 文件下载直接流式返回 R2 object body
- Release 制品：`Cache-Control: public, max-age=31536000, immutable`
- Snapshot/metadata：`Cache-Control: no-cache`
- 统计写入 `ctx.waitUntil()`，不阻塞响应
- 不主动生成 checksum（保存客户端上传的）

## 注意事项

- 不执行 npm 命令
- 需要前端配合时写入 `STRUCT.md` 交接记录，不直接改前端代码
- 后端只能操作 `maven-worker/` 目录
- 不创建 `releases`/`snapshots` 默认仓库
