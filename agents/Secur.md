# 安全审计 Agent 工作手册

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

### 🔴 高危

#### 1. CORS 默认全放行 + 携带凭证（CSRF 风险）
- **位置**: `maven-worker/src/index.ts:42-53`
- **问题**: 当 `allowedCorsOrigins` 为空数组（默认值）时，所有 origin 的 CORS 请求均被放行，且同时设置 `Access-Control-Allow-Credentials: true`
- **代码**:
  ```ts
  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Credentials', 'true')
  }
  ```
- **影响**: 任意第三方网站可向 Worker 发起带凭证的跨域请求。Cookie Session (`SameSite=Lax`) 对 top-level GET 导航仍会携带 cookie。若用户被诱导访问恶意页面，可能触发非预期的 API 操作
- **建议**: 
  - 默认拒绝所有 CORS（`allowedOrigins.length === 0` 时不设置 `Access-Control-Allow-Origin`）
  - 或至少默认仅允许同源，管理员需显式添加允许的 origin
  - 考虑将 `Access-Control-Allow-Credentials` 设为 `false`

### 🟡 中危

#### 2. Token 名称创建时无校验
- **位置**: `maven-worker/src/admin/index.ts:87-91`
- **问题**: `POST /api/admin/tokens` 接受任意字符串作为 token name，未校验：
  - 空字符串（`""` → KV key 变成 `token-name:`，污染索引）
  - 包含 `/` 或 `\u0000` 等特殊字符（KV key 异常）
- **影响**: 恶意或误操作可创建畸形 token，污染 KV 命名空间
- **建议**: 添加 name 校验：非空、仅允许 `[A-Za-z0-9_.-]+`、长度限制（如 1-128）

#### 3. 登录接口无频率限制
- **位置**: `maven-worker/src/auth/index.ts:168-199`
- **问题**: `/api/auth/login` 无限速、无账户锁定、无失败计数
- **影响**: 攻击者可对已知 token name 进行暴力破解。虽 PBKDF2-SHA256 100k 迭代有一定抗性，但无 IP/账户级限速仍是风险敞口
- **建议**: 实现基于 KV 的失败计数 + 递增延迟（如连续 5 次失败后锁定 15 分钟）

#### 4. Dev 模式鉴权后门
- **位置**: `maven-worker/src/auth/index.ts:172-179`
- **问题**: 当 `MAVEN_KV` 未绑定时，直接用明文 `ADMIN_BOOTSTRAP_TOKEN` 比对即授予完整 manager 权限
  ```ts
  if (!c.env.MAVEN_KV) {
    if (body.name === 'admin' && body.secret === c.env.ADMIN_BOOTSTRAP_TOKEN) {
      return jsonData(c, { ...permissions: [{ path: '/', actions: ['read', 'write', 'delete', 'manage'] }] })
    }
  }
  ```
- **影响**: 若生产环境误部署未绑定 KV，`ADMIN_BOOTSTRAP_TOKEN` 即为万能后门
- **建议**: 
  - Dev 模式应仅在 `wrangler dev` 本地环境启用，可通过检查 `c.env` 中的特定标志区分
  - 或在生产部署检查清单中明确强调必须绑定 KV

### 🟢 低危

#### 5. 缺少 Content-Security-Policy 头
- **位置**: `maven-worker/src/index.ts:37-82`（全局中间件）
- **问题**: Worker 响应未设置 `Content-Security-Policy` 头
- **影响**: 若前端存在 XSS 漏洞，缺少 CSP 将增加利用成功率
- **建议**: 添加 CSP 头（如 `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`）

#### 6. allowedCorsOrigins 未校验 URL 格式
- **位置**: `maven-worker/src/config/index.ts:100-104`
- **问题**: 仅检查 `typeof o === 'string'`，未校验是否为合法 origin（如 `http://example.com`）
- **影响**: 管理员可误配置无效字符串，导致 CORS 全部拒绝（静默失效）或匹配异常
- **建议**: 添加 origin 格式校验（regex: `/^https?:\/\/[^\/]+$/` 或类似）

#### 7. Settings 文本字段无长度限制
- **位置**: `maven-worker/src/config/index.ts:72-82`
- **问题**: `title`、`baseUrl`、`defaultRepository` 未限制长度
- **影响**: 可设置超长字符串（如 1MB），占用 KV 存储空间（CF KV 单 value 上限 25MB）
- **建议**: 限制各字段最大长度（如 title 100 字符、baseUrl 500 字符）

#### 8. 前端 xBasic 凭证驻留内存
- **位置**: `maven-client/src/composables/useSession.ts:14-18`
- **问题**: `persistToken` 将 name 和 secret 明文保存在模块级 `ref` 中
- **影响**: 凭证在页面生命周期内驻留内存，可被浏览器扩展或 DevTools 读取；页面刷新后凭证丢失，需依赖 cookie session
- **状态**: 可接受的设计权衡（Reposilite xBasic 兼容需要），但需注意内存中凭证的生命周期

---

## 本次审计 — 安全检查清单

- [x] xBasic 解析是否正确处理畸形 header — 通过：空值、无冒号、非 Base64 均有处理
- [x] PBKDF2 参数是否满足最低安全要求 — 通过：SHA-256, 100k 迭代, 256-bit 输出, 16-byte salt
- [x] Session 是否设置合理的 TTL — 通过：默认 86400s (24h)，可配置
- [x] Cookie 是否设置 HttpOnly、SameSite、Secure 属性 — 通过：HttpOnly, SameSite=Lax, Secure on HTTPS
- [x] 路径校验是否阻止所有目录遍历向量 — 通过：`..`、`.`、`\`、`//`、控制字符、API 前缀均被拦截
- [x] Manager 权限是否正确保护所有 Admin API — 通过：所有 `/api/admin/*` 路由使用 `auth({ permission: 'manage' })`
- [x] 匿名读取是否尊重仓库可见性设置 — 通过：PRIVATE/HIDDEN 时拒绝匿名读取
- [x] Token 创建/更新是否校验输入合法性 — **不通过**：name 字段无校验（见 #2）
- [x] Bootstrap token 是否在使用后妥善处理 — 通过：仅首次无 token 时使用，建议创建后轮换
- [x] 前端是否有 XSS 防护（输入转义、CSP 等） — **不通过**：缺少 CSP 头（见 #5）
- [x] 依赖是否存在已知 CVE — 通过：生产依赖仅有 hono ^4.7.0，无已知 CVE
- [x] CORS 配置是否安全 — **不通过**：默认全放行 + 带凭证（见 #1）
- [x] 登录接口是否存在暴力破解防护 — **不通过**：无速率限制（见 #3）
- [x] Dev 模式是否存在鉴权绕过风险 — **不通过**：KV 未绑定时的 fallback 逻辑（见 #4）

## 审计工作流程

1. **阅读代码**: 重点关注上述审计范围的模块
2. **记录发现**: 将安全问题写入 `agents/Secur.md` 本文档
3. **通知角色**: 在对应角色手册的交接记录章节写入通知（前端写 `./Worker.md`，后端写 `./Client.md`）
4. **验证修复**: 确认修复后更新本文档状态

## 安全检查清单

- [ ] xBasic 解析是否正确处理畸形 header
- [ ] PBKDF2 参数是否满足最低安全要求（≥100,000 迭代）
- [ ] Session 是否设置合理的 TTL
- [ ] Cookie 是否设置 HttpOnly、SameSite、Secure 属性
- [ ] 路径校验是否阻止所有目录遍历向量
- [ ] Manager 权限是否正确保护所有 Admin API
- [ ] 匿名读取是否尊重仓库可见性设置
- [ ] Token 创建/更新是否校验输入合法性
- [ ] Bootstrap token 是否在使用后妥善处理
- [ ] 前端是否有 XSS 防护（输入转义、CSP 等）
- [ ] 依赖是否存在已知 CVE

## 注意事项

- 不修改业务代码，只记录和报告
- 安全修复建议写入对应角色手册的交接记录章节
- 审计结果记录在本文档中
- 不执行 npm 命令
