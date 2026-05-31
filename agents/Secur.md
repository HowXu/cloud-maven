# 安全审计 Agent 工作手册

> **状态**：初步开发已完成，所有审计发现均已修复并归档。

## 角色定位

你是 Cloud-Maven 的安全审计 Agent，负责审查代码安全性，包括鉴权体系、路径安全、密钥管理、权限模型、输入校验和依赖风险。**只审计不修改业务代码**。

## 审计范围

| 模块 | 路径 | 关注点 |
|------|------|--------|
| 鉴权 | `maven-worker/src/auth/index.ts` | xBasic/Bearer/Cookie 解析、会话安全 |
| Token 管理 | `maven-worker/src/tokens/index.ts` | secret 哈希强度、salt 随机性、session TTL、bootstrap 安全 |
| 权限模型 | `maven-worker/src/tokens/index.ts` | 路径前缀匹配、manager 特权、匿名读取控制 |
| 路径安全 | `maven-worker/src/shared/path.ts` | 目录遍历、控制字符、API 路径保护 |
| Maven 路由 | `maven-worker/src/maven/index.ts` | 读写删权限校验、覆盖策略、输入校验 |
| Admin API | `maven-worker/src/admin/index.ts` | manager 权限保护、输入校验 |
| Config | `maven-worker/src/config/index.ts` | 仓库可见性控制 |
| 前端存储 | `maven-client/src/composables/useSession.ts` | localStorage 存储 token、XSS 风险 |
| 前端 API | `maven-client/src/api/client.ts` | xBasic header 构造、axios 拦截器 |
| 部署配置 | `maven-worker/wrangler.toml` | secret 管理、环境变量 |
| 依赖 | 各 `package.json` | 已知漏洞 |

## 安全架构摘要

### 鉴权体系

- **xBasic**: `Authorization: xBasic base64(name:secret)` — Reposilite 兼容
- **Bearer Session**: `Authorization: Bearer <session-id>` — Admin 页面使用
- **Cookie Session**: `cloud_maven_session` — HttpOnly, SameSite=Lax, Path=/, Secure on HTTPS
- **Secret 存储**: PBKDF2-SHA256, 100,000 次迭代, 256-bit 输出, 16-byte 随机 salt

### 权限模型

- **Action**: `read` / `write` / `delete` / `manage`
- **匹配**: 最长路径前缀匹配（已修复：`hasPermission` 对根路径 `/` 做了特殊处理）
- **Manager**: 全局特权，跳过路径匹配
- **匿名读取**: `PUBLIC` 可见性时允许，否则需要 token

### 路径安全

- 禁止字符: `\u0000-\u001F`, `\u007F`, `<>"'`
- 禁止模式: `\`, `//`, `.`, `..`
- 保留前缀: `/api/*`

### Bootstrap 安全

- 首个管理员 token 由 `ADMIN_BOOTSTRAP_TOKEN` 环境变量创建
- 建议创建后轮换或禁用
- bootstrap secret 不应写入 `wrangler.toml`（应通过 Cloudflare Dashboard Secrets 设置）

## 审计记录

### 上次审计遗留项状态

#### ✅ 已修复 — hasPermission 根路径匹配缺陷
- **原问题**: 路径 `/` 归一化为空字符串，导致根权限 token 无法匹配子路径
- **修复位置**: `maven-worker/src/tokens/index.ts:281-295`
- **修复方式**: 对 `permPath === '' || permPath === '/'` 做特殊处理，匹配所有以 `/` 开头的路径

#### ✅ 已修复 — 前端 token 明文存储在 localStorage
- **原问题**: token name/secret 以明文写入 localStorage
- **当前状态**: `maven-client/src/composables/useSession.ts` 已移除 localStorage.setItem 调用，登录仅将凭证保留在模块级 ref（内存）中，logout 时清理残留的 localStorage key
- **剩余风险**: 凭证仍在内存中，页面刷新后丢失，依赖 HttpOnly Cookie Session 恢复（可接受的设计）

#### ℹ️ 已移除 — Vitest pool 版本不兼容
- 测试工具链问题，非安全范畴，移出审计范围

---

## 本次审计新发现

> 所有发现均已修复并归档

### 🔴 高危

#### 1. CORS 默认全放行 + 携带凭证（CSRF 风险）
- **状态**: ✅ 已修复 — `index.ts` 仅在 `allowedOrigins.includes(origin)` 时放行 credentialed CORS

### 🟡 中危

#### 2. Token 名称创建时无校验
- **状态**: ✅ 已修复 — `admin/index.ts` 和 `tokens/index.ts` 均添加 `[A-Za-z0-9_.-]+` + 长度 1-128 校验

#### 3. 登录接口无频率限制
- **状态**: ✅ 已修复 — 5 次失败后锁定 15 分钟（429），成功后重置计数器

#### 4. Dev 模式鉴权后门
- **状态**: ✅ 已修复 — 已移除 `MAVEN_KV` 未绑定时的明文 bootstrap fallback

### 🟢 低危

#### 5. 缺少 Content-Security-Policy 头
- **状态**: ✅ 已修复 — 所有响应添加 `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`

#### 6. allowedCorsOrigins 未校验 URL 格式
- **状态**: ✅ 已修复 — 新增 `originPattern = /^https?:\/\/[^\/]+$/` 校验

#### 7. Settings 文本字段无长度限制
- **状态**: ✅ 已修复 — title ≤100, baseUrl ≤500, defaultRepository ≤100

#### 8. 前端 xBasic 凭证驻留内存
- **状态**: ℹ️ 可接受 — 审计标记为可接受的设计权衡（Reposilite xBasic 兼容需要）

---

## 本次审计 — 安全检查清单

- [x] xBasic 解析是否正确处理畸形 header — 通过：空值、无冒号、非 Base64 均有处理
- [x] PBKDF2 参数是否满足最低安全要求 — 通过：SHA-256, 100k 迭代, 256-bit 输出, 16-byte salt
- [x] Session 是否设置合理的 TTL — 通过：默认 86400s (24h)，可配置
- [x] Cookie 是否设置 HttpOnly、SameSite、Secure 属性 — 通过：HttpOnly, SameSite=Lax, Secure on HTTPS
- [x] 路径校验是否阻止所有目录遍历向量 — 通过：`..`、`.`、`\`、`//`、控制字符、API 前缀均被拦截
- [x] Manager 权限是否正确保护所有 Admin API — 通过：所有 `/api/admin/*` 路由使用 `auth({ permission: 'manage' })`
- [x] 匿名读取是否尊重仓库可见性设置 — 通过：PRIVATE/HIDDEN 时拒绝匿名读取
- [x] Token 创建/更新是否校验输入合法性 — 通过：name 字段有 regex + 长度校验
- [x] Bootstrap token 是否在使用后妥善处理 — 通过：仅首次无 token 时使用，建议创建后轮换
- [x] 前端是否有 XSS 防护（输入转义、CSP 等）— 通过：所有响应添加 CSP 头，`v-html` 场景均有 HTML 转义
- [x] 依赖是否存在已知 CVE — 通过：生产依赖仅有 hono ^4.7.0，无已知 CVE
- [x] CORS 配置是否安全 — 通过：默认不放行 credentialed CORS，可配置 allowedOrigins
- [x] 登录接口是否存在暴力破解防护 — 通过：5 次失败后锁定 15 分钟
- [x] Dev 模式是否存在鉴权绕过风险 — 通过：已移除明文 bootstrap fallback

## 审计工作流程

1. **阅读代码**: 重点关注上述审计范围的模块
2. **记录发现**: 将安全问题写入 `agents/Secur.md` 本文档
3. **通知角色**: 在对应角色手册的交接记录章节写入通知（前端写 `./Worker.md`，后端写 `./Client.md`）
4. **验证修复**: 确认修复后更新本文档状态

## 安全检查清单

> 所有项目已通过（初步开发阶段完成）

- [x] xBasic 解析是否正确处理畸形 header — 通过
- [x] PBKDF2 参数是否满足最低安全要求（≥100,000 迭代）— 通过
- [x] Session 是否设置合理的 TTL — 通过：默认 86400s (24h)
- [x] Cookie 是否设置 HttpOnly、SameSite、Secure 属性 — 通过
- [x] 路径校验是否阻止所有目录遍历向量 — 通过：`..`、`.`、`\`、`//`、控制字符、API 前缀均被拦截
- [x] Manager 权限是否正确保护所有 Admin API — 通过：所有 `/api/admin/*` 路由使用 `auth({ permission: 'manage' })`
- [x] 匿名读取是否尊重仓库可见性设置 — 通过：PRIVATE/HIDDEN 时拒绝匿名读取
- [x] Token 创建/更新是否校验输入合法性 — 通过：name 字段有 regex + 长度校验
- [x] Bootstrap token 是否在使用后妥善处理 — 通过：仅首次无 token 时使用，建议创建后轮换
- [x] 前端是否有 XSS 防护（输入转义、CSP 等）— 通过：所有响应添加 CSP 头，`v-html` 场景均有 HTML 转义
- [x] 依赖是否存在已知 CVE — 通过：生产依赖无已知 CVE
- [x] CORS 配置是否安全 — 通过：默认不放行 credentialed CORS，可配置 allowedOrigins
- [x] 登录接口是否存在暴力破解防护 — 通过：5 次失败后锁定 15 分钟
- [x] Dev 模式是否存在鉴权绕过风险 — 通过：已移除明文 bootstrap fallback

## 注意事项

- 不修改业务代码，只记录和报告
- 安全修复建议写入对应角色手册的交接记录章节
- 审计结果记录在本文档中
- 不执行 npm 命令
