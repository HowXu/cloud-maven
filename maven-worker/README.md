# Cloud-Maven Worker 部署说明

本文档覆盖单 Worker 部署。当前项目使用 Cloudflare Workers Static Assets，部署 `maven-worker` 时会同时构建并上传 `maven-client` 前端。

## Cloudflare 资源

需要准备：

- R2 bucket：`cloud-maven`
- KV namespace：绑定名 `MAVEN_KV`
- Worker name：`cloud-maven-worker`
- Worker Assets：`maven-worker/dist`

`wrangler.toml` 中的构建和静态资源配置：

```toml
[build]
command = "npm --prefix ../maven-client install && npm --prefix ../maven-client run build -- --outDir ../maven-worker/dist && npm run build:worker"

[assets]
binding = "ASSETS"
directory = "./dist"
run_worker_first = true
```

Cloudflare Dashboard 导入 Git 仓库时，项目目录选择 `maven-worker` 即可。Wrangler 会先构建前端，再一次部署 Worker 和静态资源。

`wrangler.toml` 中的 KV `id` 仍是占位值：

```toml
[[kv_namespaces]]
binding = "MAVEN_KV"
id = "replace-with-kv-namespace-id"
```

部署前需要把 `id` 替换为实际 KV namespace id。

## 必需绑定

```toml
[[r2_buckets]]
binding = "MAVEN_BUCKET"
bucket_name = "cloud-maven"

[[kv_namespaces]]
binding = "MAVEN_KV"
id = "<kv-namespace-id>"
```

## 环境变量

```toml
[vars]
SESSION_TTL_SECONDS = "86400"
DEFAULT_REPOSITORY_POLICY = '{"visibility":"PUBLIC","allowReleaseRedeploy":false,"allowSnapshotRedeploy":true}'
```

`DEFAULT_REPOSITORY_POLICY` 当前作为配置说明保留，实际运行时会在 KV 的 `config:repository` 缺失时写入默认策略。

## 首个管理员 Token

首次部署前设置 secret：

```text
wrangler secret put ADMIN_BOOTSTRAP_TOKEN
```

Worker 启动后，如果 KV 中没有任何 token，会自动创建：

```json
{
  "name": "admin",
  "permissions": [
    {
      "path": "/",
      "actions": ["read", "write", "delete", "manage"]
    }
  ]
}
```

登录方式：

```http
Authorization: xBasic base64(admin:ADMIN_BOOTSTRAP_TOKEN)
```

创建正式管理员 token 后，建议轮换或移除 `ADMIN_BOOTSTRAP_TOKEN`。

## 关键 KV Keys

- `config:repository`：根仓库可见性与重复上传策略。
- `config:settings`：前端 Settings 页面配置。
- `token:{id}`：Token 主记录。
- `token-name:{name}`：Token name 到 id 的索引。
- `session:{id}`：登录 Session，按 `SESSION_TTL_SECONDS` 自动过期。
- `stats:daily:{yyyyMMdd}:requests`：当天请求计数。
- `stats:daily:{yyyyMMdd}:errors`：当天错误计数。

## 当前实现边界

- Maven 文件直接映射到 R2 key，不创建默认 `releases` 或 `snapshots` 子仓库。
- PUBLIC 策略允许匿名读取，写入和删除必须认证。
- Release 默认禁止重复上传，Snapshot 默认允许重复上传。
- `X-Generate-Checksums: true` 会读取完整请求体并生成 `.sha1` 与 `.md5`，大文件建议由 Maven 客户端自行上传 checksum 文件。
- `maintainMetadata` 已持久化，但服务端默认不主动重写 `maven-metadata.xml`。
- Admin 统计使用有限页 R2 list 近似统计，避免每次管理页访问都全桶扫描。
