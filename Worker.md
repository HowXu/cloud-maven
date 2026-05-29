# Cloud-Maven Worker Backend Plan

## 项目定位

基于 Cloudflare Workers、R2、KV 构建一个可一键部署的轻量 Maven 仓库系统。后端参考 Reposilite 的 Maven 仓库、权限和管理思路，但不实现 Plugin、LDAP、复杂统计、控制台等非核心能力，优先保证 Maven 客户端兼容性、低成本和高性能。

后端代码目录为 `maven-worker`，根目录 `API.md` 用于沉淀前端 Admin 页面需要调用的接口契约。

## 技术栈

- Runtime：Cloudflare Workers
- 语言：TypeScript
- 路由框架：Hono
- 部署工具：Wrangler
- 对象存储：Cloudflare R2，用于保存 Maven 制品和元数据文件
- 键值存储：Cloudflare KV，用于保存根仓库策略、Token、Session 和轻量索引
- 测试：Vitest + Miniflare/Workers 测试环境
- 加密：Web Crypto API，Token secret 使用 PBKDF2-SHA256 哈希

## 整体架构

后端分为以下模块：

- `http`：Worker 入口、路由注册、错误响应、CORS、缓存头处理
- `maven`：Maven 路由、路径解析、下载、上传、删除、metadata/版本读取
- `storage`：R2 存储适配层，封装 `get`、`head`、`put`、`delete`、`list`
- `config`：根仓库策略读写，配置保存在 KV
- `auth`：Basic Auth、Admin Session、权限校验
- `tokens`：访问令牌的创建、查询、更新、删除
- `admin`：前端 Admin 页面所需 API
- `shared`：通用响应、校验、路径安全、MIME、时间工具

## Maven 存储模型

Maven 仓库不创建默认的 `releases`、`snapshots` 子仓库，直接使用根目录作为 Maven 仓库。Maven 路径直接映射到 R2 Key。

```text
R2 Key = {gavPath}
```

示例：

```text
com/example/demo/1.0.0/demo-1.0.0.jar
com/example/demo/1.0.0/demo-1.0.0.pom
com/example/demo/maven-metadata.xml
com/example/demo/1.0.0-SNAPSHOT/demo-1.0.0-20260529.101010-1.jar
```

Maven 客户端上传的 `.jar`、`.pom`、`.module`、`.xml`、`.sha1`、`.md5`、`.sha256`、`.sha512`、`.asc` 等文件默认原样存储。服务端不主动重写 `maven-metadata.xml`，避免 Worker 并发写入带来的竞态，也减少 R2 写入和 CPU 成本。

## Maven HTTP 路由

核心路由：

```text
GET    /:gav*
HEAD   /:gav*
PUT    /:gav*
POST   /:gav*
DELETE /:gav*
```

行为设计：

- `GET`：从 R2 读取文件并 stream 返回。
- `HEAD`：只读取 R2 对象元信息，返回状态、长度、类型、ETag。
- `PUT/POST`：部署 Maven 文件，写入 R2。
- `DELETE`：删除指定 Maven 文件。
- 如果请求目录路径，Admin/API 可通过 R2 list 返回目录信息；普通 Maven 客户端解析不依赖目录索引。
- 所有路径都要做规范化，禁止 `..`、反斜杠、重复斜杠、控制字符和空路径。
- `/api/*` 保留给前端和管理 API，不作为 Maven 制品路径处理。

## 根仓库策略

根仓库策略保存在 KV，例如 key 为：

```text
config:repository
```

策略字段：

```ts
type RepositoryPolicy = {
  visibility: 'PUBLIC' | 'PRIVATE' | 'HIDDEN'
  allowReleaseRedeploy: boolean
  allowSnapshotRedeploy: boolean
  createdAt: string
  updatedAt: string
}
```

首版默认策略：

- 不创建 `releases` 和 `snapshots` 默认仓库。
- 根目录作为唯一 Maven 仓库。
- `visibility: PUBLIC`，允许匿名读取。
- `allowReleaseRedeploy: false`，Release 制品默认禁止重复上传，可在配置中开启。
- `allowSnapshotRedeploy: true`，Snapshot 制品默认允许重复上传。

## 权限模型

参考 Reposilite，但保持简化。

根仓库可见性：

- `PUBLIC`：允许匿名读取。
- `PRIVATE`：读取、浏览、写入都需要 Token 权限。
- `HIDDEN`：匿名请求无法在目录/API 中看到，首版按私有仓库处理。

Token 权限：

- `READ`：允许读取指定路径。
- `WRITE`：允许上传和删除指定路径。
- `MANAGER`：允许访问 Admin API，管理根仓库策略和 Token。

权限范围使用路径前缀匹配：

```text
/
/com/example
/com/example/demo
```

Maven 客户端认证使用 HTTP Basic Auth：

```text
username = token name
password = token secret
```

Admin 页面登录后使用 Session Token。Session 保存在 KV，设置 TTL，前端通过 Cookie 或 Bearer Token 携带。

## KV 数据设计

建议 KV key：

```text
config:repository
token:{id}
token-name:{name}
session:{sessionId}
stats:daily:{yyyyMMdd}
```

Token 数据结构：

```ts
type AccessToken = {
  id: string
  name: string
  secretHash: string
  salt: string
  description?: string
  permissions: Array<'READ' | 'WRITE' | 'MANAGER'>
  routes: Array<{
    path: string
    permission: 'READ' | 'WRITE'
  }>
  createdAt: string
  expiresAt?: string
  disabled?: boolean
}
```

## 前端 Admin API

完整接口契约后续写入根目录 `API.md`。首版计划包含：

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session

GET    /api/admin/repository
PATCH  /api/admin/repository

GET    /api/admin/tokens
POST   /api/admin/tokens
GET    /api/admin/tokens/:id
PATCH  /api/admin/tokens/:id
DELETE /api/admin/tokens/:id

GET    /api/maven/details
GET    /api/maven/details/:gav*
GET    /api/maven/versions/:gav*
DELETE /api/maven/artifacts/:gav*
```

API 响应统一使用 JSON：

```ts
type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
```

## 性能和成本控制

- 文件下载直接返回 R2 stream，不将大文件完整读入 Worker 内存。
- `HEAD` 请求只调用 R2 `head`，不读取对象内容。
- Release 制品使用长缓存：

```text
Cache-Control: public, max-age=31536000, immutable
```

- Snapshot、`maven-metadata.xml` 使用短缓存或 no-cache：

```text
Cache-Control: no-cache
```

- PUBLIC 根仓库读请求尽量不访问 KV，仅在 Worker 实例内做短期策略缓存。
- Token 校验结果可做请求内缓存，不跨用户持久缓存敏感信息。
- 统计写入放到 `ctx.waitUntil()`，且首版只保留轻量统计。
- 默认不服务端生成 checksum，优先保存 Maven 客户端上传的 checksum 文件。
- 目录浏览仅用于 Admin/API，不参与普通 Maven 解析链路。

## 部署方案

`wrangler.toml` 绑定：

```toml
name = "cloud-maven-worker"
main = "src/index.ts"
compatibility_date = "2026-05-29"

[build]
command = "npm --prefix ../maven-client install && npm --prefix ../maven-client run build -- --outDir ../maven-worker/dist && npm run build:worker"

[assets]
binding = "ASSETS"
directory = "./dist"
run_worker_first = true

[[r2_buckets]]
binding = "MAVEN_BUCKET"
bucket_name = "cloud-maven"

[[kv_namespaces]]
binding = "MAVEN_KV"
id = "..."
```

环境变量：

```text
ADMIN_BOOTSTRAP_TOKEN
SESSION_TTL_SECONDS
DEFAULT_REPOSITORY_POLICY
```

首次部署时，可通过 `ADMIN_BOOTSTRAP_TOKEN` 创建第一个管理员 Token，创建后建议禁用或轮换。

## 实现顺序

1. 初始化 `maven-worker` 工程：Wrangler、TypeScript、Hono、Vitest。
2. 定义 Env 绑定、通用响应、错误处理和路径安全工具。
3. 实现 R2 存储适配层。
4. 实现根仓库策略读取、默认策略初始化和 KV 缓存策略。
5. 实现 Maven `GET/HEAD/PUT/POST/DELETE` 路由。
6. 实现 Token、Basic Auth、Admin Session 和权限校验。
7. 实现 Admin API，并将接口细节写入 `API.md`。
8. 增加 Miniflare 单测，覆盖路径安全、权限、上传、下载、删除。
9. 编写部署说明和初始化说明。

## 当前实现进度（2026-05-29）

状态：核心链路已有首版代码，当前继续补齐 Worker 后端功能和部署说明。

已完成：
- `maven-worker` 工程已建立，包含 Wrangler、TypeScript、Hono、Vitest 配置和 `cloud-maven-worker` 部署名。
- Worker 入口已注册 `X-Request-Id`、健康检查、Auth、Admin、Maven API 路由和 Maven 文件直连 `GET/HEAD/PUT/POST/DELETE` 路由。
- `shared` 已实现 JSON 响应、错误映射、Maven 路径安全校验、MIME 类型、缓存策略和 SHA-1/MD5 checksum 工具。
- `storage` 已封装 R2 `get/head/put/delete/list`、按前缀批量删除和有限页对象统计。
- `config` 已实现根仓库策略与 Settings 的 KV 读写，匿名读取和覆盖上传会同步到仓库策略。
- `tokens` 已实现 PBKDF2-SHA256 secret 哈希、Token 创建/查询/列表/更新/删除、Session KV 存取、管理员 Token bootstrap 和路径前缀权限匹配。
- `auth` 已实现 Reposilite 风格 `Authorization: xBasic base64(name:secret)`、Bearer/Cookie Session，并提供 `POST /api/auth/login`、`GET /api/auth/me`、`GET /api/auth/session`、`POST /api/auth/logout`。
- `admin` 已实现有限页 R2 统计、Token 列表/创建/更新/删除、Settings 获取/更新接口，并对 Token 权限输入做路径和 action 校验。
- `maven` 已实现 `GET/HEAD/PUT/POST/DELETE /*` 文件读写删、目录级删除、Release/Snapshot 重复上传策略、checksum 生成、缓存头、ETag、Content-Type、`GET /api/maven/details/:path*` 目录详情、`GET /api/maven/versions/:path*` 版本摘要、`DELETE /api/maven/artifacts/:path*` 和 `POST /api/maven/generate/pom/:path*`。
- `maven-worker/README.md` 已补充 Cloudflare R2/KV、Worker Assets、环境变量、首个管理员 Token 和当前实现边界说明。

部分完成或待补齐：
- Admin 统计当前使用最多 5 页 R2 list 做低成本近似统计，不做全桶强扫描。
- `X-Generate-Checksums` 当前会读取完整请求体后写入 R2，适合前端小中型上传；大文件发布建议由 Maven 客户端自带 checksum 文件。
- `maintainMetadata` 设置已持久化，metadata 采用读取时计算策略：服务端原样存储 Maven 客户端上传的 `maven-metadata.xml`，`latest`/`release` 字段在读取时从 `versions` 数组推导，不产生额外 R2 写入，无竞态风险。
- KV namespace id 仍需部署者在 `wrangler.toml` 中替换为实际值。
- 当前后端交接只要求 Worker 开发，不要求执行 npm 构建、测试、部署验证或补充 Miniflare/Vitest 单测。

## 已确认决策

- 不创建 `releases` 和 `snapshots` 默认仓库，Maven 仓库直接使用根目录。
- PUBLIC 根仓库允许匿名读取，写入必须认证。
- Release 制品默认禁止重复上传，但保留配置开关。
- Checksum 默认只保存 Maven 客户端上传内容，不主动生成。
- Snapshot 制品默认允许重复上传。
- `HIDDEN` 首版按 `PRIVATE` 处理。
- metadata 维护采用读取时计算策略，服务端不主动重写 `maven-metadata.xml`。
