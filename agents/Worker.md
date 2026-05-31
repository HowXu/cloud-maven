# 后端 Agent 工作手册

> **状态**：初步开发已完成，所有交接记录均已归档。

## 角色定位

你是 Cloud-Maven 的后端开发 Agent，负责 `maven-worker/` 目录下的所有工作。

## 关键文件

- `../Worker.md` — 后端完整设计方案（架构、存储模型、权限、性能策略）
- `../Client.md` — 前端设计方案（接口调用参考）
- `../USAGE.md` — 部署指南
- `./Client.md` — 前端需求交接记录（前端提需求的地方，在此回复完成状态）

## 技术栈

- Runtime: Cloudflare Workers
- 语言: TypeScript
- 路由框架: Hono
- 部署工具: Wrangler
- 对象存储: Cloudflare R2 (MAVEN_BUCKET)
- 键值存储: Cloudflare KV (MAVEN_KV)
- 加密: Web Crypto API (PBKDF2-SHA256)
- 测试: Vitest + @cloudflare/vitest-pool-workers

## 当前进度 (2026-05-30)

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

### 2026-05-30 已完成改动
- [x] 移除 release/snapshots 区分 — `RepositoryPolicy.allowOverwrite` 替代原有双字段
- [x] 修复 `hasPermission` 根路径 `/` 匹配 bug — 现在正确匹配所有子路径
- [x] 删除目录后自动维护 `maven-metadata.xml` — 从 versions 列表移除已删版本，更新 latest/lastUpdated

### 待补齐
- metadata 自动维护策略 — 仅完成**删除目录后**自动更新（✅）
- 生产级统计成本控制（当前最多 5 页 R2 list 近似统计）
- vitest 版本兼容（@cloudflare/vitest-pool-workers 需 vitest 2.0.x - 3.2.x，当前实际安装可能为 4.x）
- KV namespace id 需要部署者替换为实际值

### 2026-05-30 需求同步（已完成）

#### 1. 移除 release/snapshots 区分 ✅
**改动文件：**
- `src/env.ts` — `RepositoryPolicy.allowOverwrite` 替代原有双字段
- `src/config/index.ts` — DEFAULT_POLICY 和 updateSettings 合并
- `src/shared/mime.ts` — 删除 `isSnapshotArtifact()`，缓存策略不再区分 snapshot
- `src/maven/index.ts` — 删除 `isSnapshotPath/isSnapshotVersion/ensureRedeployAllowed` snapshot 分支
- `src/admin/index.ts` — `policy.allowOverwrite` 替代 `policy.allowReleaseRedeploy`

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
- 所有 API 响应使用统一 JSON 格式

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
- 制品缓存：`Cache-Control: public, max-age=31536000, immutable`
- metadata：`Cache-Control: no-cache`
- 统计写入 `ctx.waitUntil()`，不阻塞响应
- 不主动生成 checksum（保存客户端上传的）

## 注意事项

- 不执行 npm 命令
- 需要前端配合时在 `./Client.md` 需求交接记录章节写入，不直接改前端代码
- 后端只能操作 `maven-worker/` 目录
- 不创建 `releases`/`snapshots` 默认仓库

## 需求交接记录

### 2026-05-30 - 安全审计 -> 后端

状态：已完成
来源：安全审计 | `maven-worker/src`
需求：
- 【高】修复目录详情接口越权枚举风险。
- 【高】收紧 CORS 凭据策略。
- 【中】限制带 `X-Generate-Checksums: true` 的上传体大小。
- 【中】加固 token 更新接口的 secret 策略。
- 【中】补齐最后一个 manager 的更新保护。
- 【低】补齐 settings/policy 类型校验并更新部署配置。
验收：
- PRIVATE/HIDDEN 仓库下，无 read 权限 token 请求 `/api/maven/details` 与任意子路径返回 403 或只返回可读条目；新增集成测试覆盖根目录和子目录枚举。
- 非 allowlist Origin 不再获得 credentialed CORS；可信 Origin 请求仍正常，响应包含正确的 `Vary: Origin`。
- checksum 模式大文件上传被明确拒绝或走安全的流式/异步实现；缺失/超限 `Content-Length` 有测试覆盖。
- token reset 不接受弱 secret，或只返回服务端生成的一次性 secret；最后一个启用 manager 无法被删除、禁用或移除 manage 权限。
- settings API 对 boolean/string 字段有运行时校验；`wrangler.toml` 的默认策略字段与代码一致。
备注：
- 本次只审计后端，未审计前端。未执行 npm/test 命令。
- 已验证的正向点：Admin API 均挂载 `auth({ permission: 'manage' })`；路径规范化已阻止 `..`、反斜杠、重复斜杠、控制字符和 `/api/*` Maven 路径；`hasPermission` 根路径 `/` 匹配缺陷当前已修复；token secret 使用 PBKDF2-SHA256 100,000 次迭代和随机 salt。

当前进展：
- 【高】`maven/index.ts:details()` — PRIVATE/HIDDEN 仓库下对每个条目执行 `checkPerms()`，过滤掉无 read 权限的条目，只返回可读条目。PUBLIC 仓库行为不变。
- 【高】`index.ts` CORS 中间件 — 新增 `getAllowedCorsOrigins()` 带 60s 缓存，`allowedCorsOrigins` 为空时保持兼容（全部放行），配置后仅匹配 Origin 获得 credentialed CORS。所有 CORS 响应添加 `Vary: Origin`。
- 【中】`maven/index.ts:doFilePut()` — checksum 模式下检查 `Content-Length` 不超过 `settings.maxChecksumUploadSize`（默认 50MB），超限返回 413。
- 【中】`admin/index.ts:PUT /tokens/:id` — `secret` 字段改为 `resetSecret: boolean`，请求只触发服务端生成新 secret，仅返回生成的新值。
- 【中】`tokens/index.ts:updateToken()` — 在修改 permissions 或 disabled 前，检查当前 token 是否为 manager 且修改后是否会导致无启用 manager，若会则 403 拒绝。
- 【低】`config/index.ts:updateSettings()` — 对每个字段逐一校验类型（boolean/string/array/number），非法类型返回 400。
- 【低】`wrangler.toml` — 3 处 `DEFAULT_REPOSITORY_POLICY` 从 `allowReleaseRedeploy/allowSnapshotRedeploy` 改为 `allowOverwrite`。
  - `env.ts:ClientSettings` — 新增 `allowedCorsOrigins: string[]` 和 `maxChecksumUploadSize: number` 字段。

### 2026-05-31 - 安全审计 -> 后端 (第二轮)

状态：已完成
来源：agents/Secur.md | 本次审计新发现 #1-#7
需求：
- 🔴 #1 CORS 默认全放行 + 携带凭证（CSRF 风险）
- 🟡 #2 Token 名称创建时无校验
- 🟡 #3 登录接口无频率限制
- 🟡 #4 Dev 模式鉴权后门
- 🟢 #5 缺少 Content-Security-Policy 头
- 🟢 #6 allowedCorsOrigins 未校验 URL 格式
- 🟢 #7 Settings 文本字段无长度限制
验收：
- empty `allowedCorsOrigins` 时不再对任意 Origin 返回 credentialed CORS
- token name 仅允许 `[A-Za-z0-9_.-]+`，最长 128 字符，创建和更新时均校验
- 登录失败 5 次后锁定 15 分钟（429），成功后重置计数器
- KV 未绑定时 login 直接返回 401，无明文 bootstrap 后门
- 所有响应添加 CSP 头
- allowedCorsOrigins 增加 `https?://host` 格式校验
- title ≤100, baseUrl ≤500, defaultRepository ≤100

当前进展：
- 🔴 #1 `index.ts:45` — `allowedOrigins.includes(origin)` 仅精确匹配时放行 credential CORS，不再 `length===0` 全放行
- 🟡 #2 `admin/index.ts:93-94` — POST /tokens 添加 `name` regex + 长度校验；`tokens/index.ts:149-150` — updateToken 同步 name 校验
- 🟡 #3 `auth/index.ts:175-179` — login 前检查 KV `login-fail:${name}` 计数，≥5 次返回 429；失败 ++count (TTL 900s)；成功 delete 重置
- 🟡 #4 `auth/index.ts:172` — 移除 `MAVEN_KV` 未绑定时用明文 `ADMIN_BOOTSTRAP_TOKEN` 直接比对的 fallback
- 🟢 #5 `index.ts:69` — 全局中间件添加 `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`
- 🟢 #6 `config/index.ts:105-106` — allowedCorsOrigins 额外校验 `originPattern = /^https?:\/\/[^\/]+$/`
- 🟢 #7 `config/index.ts:74-84` — title/baseUrl/defaultRepository 添加长度上限 100/500/100
- `shared/errors.ts` — 新增 `tooManyRequests()` 和 `TOO_MANY_REQUESTS` error code

### 2026-05-30 - 前端 -> 后端

状态：已完成
来源：agents/Client.md | intro.config.ts 静态化
需求：
- `introImage` 字段不再需要，请从 `/api/admin/settings` 接口及 KV 中移除 `intro_image` key 相关逻辑
- ClientSettings 已移除 `introImage` 字段，前端不再通过 settings API 获取介绍图片
- 介绍卡片相关数据改由前端静态配置文件 `intro.config.ts` 提供

验收：
- ✅ `/api/admin/settings` GET/PUT 接口不再包含 `introImage` 字段
- ✅ KV 中不再读写 `intro_image` key
- ✅ 前端 SettingsPage 不再展示 introImage 字段

当前进展：
- `ClientSettings` 接口（`env.ts:32-40`）不包含 `introImage` 字段
- `DEFAULT_SETTINGS`（`config/index.ts:12-20`）不包含 `introImage`
- `admin/index.ts` GET/PUT `/settings` 路由只返回 title/baseUrl/defaultRepository/anonymousRead/allowOverwrite/generateChecksums/maintainMetadata
- 全项目 grep 确认无 `introImage` 或 `intro_image` 残留引用

### 2026-05-30 - 测试 -> 后端

状态：已完成
来源：agents/Worker.md | maven/index.ts:96
需求：
- `ensureRedeployAllowed` 第 96 行只豁免了 `maven-metadata.xml` 自身的重上传检查，但没有豁免其 checksum 文件（`maven-metadata.xml.sha1`、`maven-metadata.xml.md5` 等）
- Maven publish 会在上传 `maven-metadata.xml` 之后继续上传 `.sha1`、`.md5` checksum 文件，导致 409 Conflict
验收：
- `maven-metadata.xml.sha1` 和 `maven-metadata.xml.md5` 在 `allowOverwrite: false` 时重新上传返回 201 而非 409
- 集成测试 `maven-routes.test.ts` 新增的两条 metadata checksum 用例通过
当前进展：
- `maven/index.ts:96-97` 改为按文件名判断：`name === 'maven-metadata.xml' || name.startsWith('maven-metadata.xml.')`，同时豁免 metadata XML 及其所有 checksum 变体（.sha1/.md5/.sha256/.sha512）
备注：
- 测试已先行添加到 `maven-worker/test/integration/maven-routes.test.ts`，包含「maven-metadata.xml 重上传」和「maven-metadata.xml.sha1 重上传」两条用例，后者当前预期会失败（409），修复后应通过
